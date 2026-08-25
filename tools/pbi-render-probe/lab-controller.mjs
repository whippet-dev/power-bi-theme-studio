#!/usr/bin/env node
/**
 * Power BI Desktop lab controller — MUTATING. Development only.
 *
 * `probe.mjs` next door is read-only and stays that way. This is the other
 * half: it drives Power BI's own authoring UI so a measurement sweep can run
 * unattended, instead of a human resizing a visual twelve times and reporting
 * back after each one.
 *
 * ## What keeps this safe
 *
 * It is attached to an application holding someone's unsaved report, so the
 * restraints are structural rather than advisory:
 *
 * - **Allowlisted semantic actions only** (`labActions.mjs`). There is no
 *   "click here", no "run this script", no selector argument. A caller cannot
 *   express an action nobody reviewed.
 * - **It refuses to mutate anything it cannot positively identify** as the
 *   synthetic lab visual — the four fixture categories and three series.
 * - **Power BI's own UI**, not internal renderer state. Everything goes
 *   through the Format pane, so Power BI applies its own validation and the
 *   result is a state a user could have produced.
 * - **Never saves**, never deletes, never touches data, never leaves
 *   localhost.
 * - **Restores** what it changed, and verifies the restoration.
 *
 * ## What it does NOT do
 *
 * No save. No delete. No data edit. No arbitrary evaluation.
 *
 * Base theme switching IS supported, through the Theme pane's own Base
 * theme control, and is verified by reading that control back.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  SUPPORTED_BASE_THEMES,
  identifyLabEnvironment,
  requireImplemented,
  selectLabVisual,
  isStable,
  planRestoration,
  settleOutcome,
  validateAction,
  verifyRestoration,
} from "./labActions.mjs";

const HOST = "127.0.0.1";

// ---------------------------------------------------------------------------
// CDP plumbing
// ---------------------------------------------------------------------------

class LabSession {
  constructor(port) {
    this.port = port;
    this.nextId = 1;
    this.pending = new Map();
  }

  async open() {
    const targets = await (await fetch(`http://${HOST}:${this.port}/json/list`)).json();
    const target = targets.find((t) => t.type === "page" && t.url.includes("reportView"));
    if (!target) throw new Error("no Power BI reportView target — is Desktop running with the debug port?");
    this.socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve);
      this.socket.addEventListener("error", () => reject(new Error("could not attach to the report view")));
    });
    this.socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    });
  }

  send(method, params = {}, timeoutMs = 20000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, timeoutMs);
    });
  }

  /**
   * Evaluates one of the fixed payloads in `PAYLOADS`.
   *
   * Same rule as the read-only probe: the expression is never supplied by a
   * caller. Every payload below is a DOM read or a UI-coordinate lookup.
   */
  async read(name, ...args) {
    const build = PAYLOADS[name];
    if (!build) throw new Error(`no such payload: ${name}`);
    const result = await this.send("Runtime.evaluate", {
      expression: build(...args),
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(`page threw in ${name}: ${result.exceptionDetails.text}`);
    return result.result?.value;
  }

  async click(x, y, clickCount = 1) {
    for (const type of ["mousePressed", "mouseReleased"]) {
      await this.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount });
    }
    await sleep(400);
  }

  async typeInto(x, y, text) {
    // Triple-click selects the field's contents; insertText then replaces it.
    // Real input events rather than setting .value, because Power BI's inputs
    // are Angular-bound and ignore a value assigned behind their back.
    await this.click(x, y, 3);
    await sleep(200);
    await this.send("Input.insertText", { text });
    await sleep(200);
    for (const type of ["keyDown", "keyUp"]) {
      await this.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    }
  }

  /** Closes a popup without choosing anything from it. */
  async pressEscape() {
    for (const type of ["keyDown", "keyUp"]) {
      await this.send("Input.dispatchKeyEvent", { type, key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    }
    await sleep(400);
  }

  close() {
    try { this.socket?.close(); } catch { /* already gone */ }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Fixed payloads — reads and UI lookups only
// ---------------------------------------------------------------------------

/**
 * Every cartesian visual on the page, so the caller can pick the lab one by
 * identity. Deliberately not 'the smallest': the lab resizes its own visual,
 * so a geometric rule would move during the experiments it exists to guard.
 */
const CARTESIAN_VISUALS = `[...document.querySelectorAll('[class*="visualContainer"]')]
  .filter((e) => e.querySelector('svg.cartesianChart'))
  .filter((e) => ![...e.querySelectorAll('[class*="visualContainer"]')]
    .some((inner) => inner.querySelector('svg.cartesianChart')))`;

/**
 * The lab visual, or nothing.
 *
 * Fails CLOSED, and that matters at runtime rather than only at open():
 * the identity boundary has to hold for the whole session, not just the
 * moment it was first checked. A sentinel that disappears, changes, or
 * starts matching two visuals mid-run means the page is no longer what the
 * controller believes, and continuing would mutate something nobody
 * identified.
 *
 * So there is deliberately no fallback: not the first match when several
 * match, not the first cartesian visual, not the smallest, not DOM order.
 * Zero or many both yield null, and every operation that needs the visual
 * aborts loudly.
 */
const VISUAL =
  "(() => { const all = " + CARTESIAN_VISUALS + ";" +
  "  const named = all.filter((e) => {" +
  "    const text = [...e.querySelectorAll('[class*=\"visualsEnterHint\"]')]" +
  "      .map((n) => (n.textContent || '')).join(' ');" +
  "    return text.includes('Online') && text.includes('Phone') && text.includes('Post');" +
  "  });" +
  "  return named.length === 1 ? named[0] : null; })()";

/**
 * A Format-pane slider card, located through the label that owns it.
 *
 * Position alone is not enough: 'Space between categories' and 'Space
 * between series' sit 28px apart with identical sliders, so each is found
 * by its own label and then by the nearest ancestor that contains inputs -
 * the card. Shared by both so neither can drift into its own rule.
 */
const SLIDER_CONTROL = (label) => `(() => {
    const W = window.innerWidth;
    const labelEl = [...document.querySelectorAll('*')].find(
      (e) => !e.children.length && (e.textContent || '').trim() === ${JSON.stringify(label)}
        && e.getBoundingClientRect().x > W * 0.62,
    );
    if (!labelEl) return null;
    let card = labelEl;
    for (let i = 0; i < 6 && card; i++) {
      if (card.querySelectorAll('input').length) break;
      card = card.parentElement;
    }
    if (!card) return null;
    const spin = [...card.querySelectorAll('input')].find((i) => i.getAttribute('role') === 'spinbutton');
    const range = [...card.querySelectorAll('input')].find((i) => i.type === 'range');
    if (!spin) return null;
    const r = spin.getBoundingClientRect();
    return {
      value: spin.value,
      x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      visible: r.top > 60 && r.bottom < window.innerHeight - 20,
      min: range ? range.getAttribute('min') : null,
      max: range ? range.getAttribute('max') : null,
    };
  })()`;

const PAYLOADS = {
  /** Enough to decide whether this is the lab, plus the geometry we sweep. */
  labState: () => `(() => {
    const num = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(3) : null);
    const el = ${VISUAL};
    if (!el) return { visualType: null };
    const r = el.getBoundingClientRect();
    // Direct text nodes only, because Power BI nests an accessibility
    // <title> inside each <text> and textContent would double the label.
    // Leaf elements have no such child, so they can fall back safely.
    const own = (n) => {
      const direct = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('').trim();
      if (direct) return direct;
      return n.children.length === 0 ? (n.textContent || '').trim() : '';
    };

    const bars = [...el.querySelectorAll('svg rect.bar')];
    const fills = [...new Set(bars.map((b) => getComputedStyle(b).fill))];
    const plot = el.querySelector('svg.mainGraphicsContext');

    // Category labels are the Segoe-faced texts left of the bars.
    const barLeft = bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().left)) : null;
    const barBottom = bars.length ? Math.max(...bars.map((b) => b.getBoundingClientRect().bottom)) : null;
    const texts = [...el.querySelectorAll('svg text')].map((t) => ({
      text: own(t), r: t.getBoundingClientRect(), face: getComputedStyle(t).fontFamily,
      px: parseFloat(getComputedStyle(t).fontSize),
    })).filter((t) => t.text);
    const isTitleFace = (f) => /wf_standard-font/.test(f);
    const catLabels = texts.filter((t) => barLeft !== null && t.r.right <= barLeft + 2 && !isTitleFace(t.face));
    const valLabels = texts.filter((t) => barBottom !== null && t.r.top >= barBottom - 6 && !isTitleFace(t.face));
    const catTitle = texts.find((t) => barLeft !== null && t.r.right <= barLeft + 2 && isTitleFace(t.face));
    const valTitle = texts.find((t) => barBottom !== null && t.r.top >= barBottom - 6 && isTitleFace(t.face));

    const legendItems = [...el.querySelectorAll('[class*="legend"] div, [class*="legend"] span, [class*="legend"] text')]
      .filter((n) => !n.children.length && own(n));
    const scrollable = el.querySelector('svg.svgScrollable');

    // Band geometry, from the bars themselves.
    const byFill = new Map();
    for (const b of bars) {
      const f = getComputedStyle(b).fill;
      const list = byFill.get(f) ?? [];
      list.push(Number(b.getAttribute('y')));
      byFill.set(f, list);
    }
    const series = [...byFill.values()].map((ys) => ys.sort((a, b) => a - b));
    const band = bars.length ? Number(bars[0].getAttribute('height')) : null;
    const seriesStep = series.length >= 2 ? series[1][0] - series[0][0] : null;
    const categoryStep = series[0] && series[0].length >= 2 ? series[0][1] - series[0][0] : null;

    // The lab sentinel: the visual's accessible description, which names
    // every measure and the category field. Present at every size, unlike
    // the legend, and unlike any class-named title element -- Power BI does
    // not expose one here.
    const hint = [...el.querySelectorAll('[class*="visualsEnterHint"]')]
      .map((n) => (n.textContent || '').trim())
      .find((txt) => txt.length > 10 && !/^Press /.test(txt)) || '';
    const sentinel = hint.slice(0, 120);

    return {
      visualType: 'cartesian',
      sentinel,
      width: Math.round(r.width),
      height: Math.round(r.height),
      categories: catLabels.map((t) => t.text),
      seriesCount: fills.length,
      barsRendered: bars.length,
      categoriesRendered: series[0] ? series[0].length : 0,
      plotWidth: plot ? Number(plot.getAttribute('width')) : null,
      plotHeight: plot ? Number(plot.getAttribute('height')) : null,
      scrollableWidth: scrollable ? Number(scrollable.getAttribute('width')) : null,
      scrollableHeight: scrollable ? Number(scrollable.getAttribute('height')) : null,
      categoryLabelCount: catLabels.length,
      categoryLabelFontPx: catLabels[0] ? num(catLabels[0].px) : null,
      valueLabelCount: valLabels.length,
      valueLabelFontPx: valLabels[0] ? num(valLabels[0].px) : null,
      valueLabels: valLabels.map((t) => t.text),
      categoryAxisTitleVisible: Boolean(catTitle),
      valueAxisTitleVisible: Boolean(valTitle),
      axisTitleFontPx: catTitle ? num(catTitle.px) : (valTitle ? num(valTitle.px) : null),
      legendVisible: legendItems.length > 0,
      legendCount: legendItems.length,
      legendFontPx: legendItems[0] ? num(parseFloat(getComputedStyle(legendItems[0]).fontSize)) : null,
      band: num(band),
      seriesStep: num(seriesStep),
      categoryStep: num(categoryStep),
      paddingInner: band && seriesStep ? num(1 - band / seriesStep) : null,
      palette: fills,
    };
  })()`,

  /**
   * What the settle loop watches.
   *
   * Geometry alone is not enough for a theme change: the visual can reach
   * its final size while the old theme's text and colours are still on
   * screen, and a geometry-only fingerprint would call that settled. So it
   * also carries mark count, a colour and a font size -- the things a theme
   * switch changes last.
   */
  geometry: () => `(() => {
    const el = ${VISUAL};
    if (!el) return {};
    const r = el.getBoundingClientRect();
    const plot = el.querySelector('svg.mainGraphicsContext');
    const bar = el.querySelector('svg rect.bar');
    const text = el.querySelector('svg text');
    return {
      w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      plotW: plot ? Number(plot.getAttribute('width')) : 0,
      plotH: plot ? Number(plot.getAttribute('height')) : 0,
      bars: el.querySelectorAll('svg rect.bar').length,
      texts: el.querySelectorAll('svg text').length,
      fill: bar ? getComputedStyle(bar).fill : '',
      fontPx: text ? getComputedStyle(text).fontSize : '',
    };
  })()`,

  /**
   * How many visuals currently satisfy the sentinel. Used to turn a null
   * locator into an explanation rather than a bare failure.
   */
  labVisualCount: () =>
    "(() => { const all = " + CARTESIAN_VISUALS + ";" +
    "  const named = all.filter((e) => {" +
    "    const text = [...e.querySelectorAll('[class*=\"visualsEnterHint\"]')]" +
    "      .map((n) => (n.textContent || '')).join(' ');" +
    "    return text.includes('Online') && text.includes('Phone') && text.includes('Post');" +
    "  });" +
    "  return { cartesian: all.length, matching: named.length }; })()",

  /** Every cartesian visual's identity fields, for picking the lab one. */
  labVisuals: () => `(() => {
    return CARTESIAN_PLACEHOLDER.map((el) => {
      const hint = [...el.querySelectorAll('[class*="visualsEnterHint"]')]
        .map((n) => (n.textContent || '').trim())
        .find((txt) => txt.length > 10 && !/^Press /.test(txt)) || '';
      const bars = [...el.querySelectorAll('svg rect.bar')];
      const own = (n) => {
        const d = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('').trim();
        return d || (n.children.length === 0 ? (n.textContent || '').trim() : '');
      };
      const barLeft = bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().left)) : null;
      const cats = [...el.querySelectorAll('svg text')]
        .filter((x) => barLeft !== null && x.getBoundingClientRect().right <= barLeft + 2
          && !/wf_standard-font/.test(getComputedStyle(x).fontFamily))
        .map(own).filter(Boolean);
      return {
        visualType: 'cartesian',
        sentinel: hint.slice(0, 120),
        categories: cats,
        seriesCount: [...new Set(bars.map((b) => getComputedStyle(b).fill))].length,
      };
    });
  })()`.replace('CARTESIAN_PLACEHOLDER', CARTESIAN_VISUALS),

  /**
   * The Base theme control's current value.
   *
   * It is a button whose own label IS the value, carrying
   * aria-haspopup="listbox". Reading the control directly is the primary
   * proof a theme changed -- a palette fingerprint is only a sanity check,
   * and two themes could in principle share a palette.
   */
  baseThemeValue: () => `(() => {
    const el = [...document.querySelectorAll('button[aria-haspopup="listbox"]')]
      .find((e) => {
        const r = e.getBoundingClientRect();
        return r.x > window.innerWidth * 0.62 && r.width > 80 && r.height > 10;
      });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { value: (el.getAttribute('aria-label') || el.textContent || '').trim(),
             expanded: el.getAttribute('aria-expanded'),
             x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`,

  /** The open dropdown's options. HTML listbox only -- the chart's are SVG. */
  baseThemeOptions: () => `(() => {
    const box = [...document.querySelectorAll('[role=listbox]')]
      .filter((b) => !(b instanceof SVGElement))
      .find((b) => b.getBoundingClientRect().x > window.innerWidth * 0.62);
    if (!box) return [];
    return [...box.querySelectorAll('[role=option]')].map((o) => {
      const r = o.getBoundingClientRect();
      return { label: (o.getAttribute('aria-label') || o.textContent || '').trim(),
               selected: o.getAttribute('aria-selected'),
               x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
  })()`,

  /**
   * The Format pane's scroll container.
   *
   * Found by behaviour -- the tall right-hand element that actually
   * overflows -- rather than by class name, and only ever scrolled through
   * a wheel event at its own centre. Scroll coordinates are never exposed
   * to a caller.
   */
  formatPaneScroller: () => `(() => {
    const W = window.innerWidth;
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.x < W * 0.62 || r.width < 150 || r.height < 150) continue;
      if (el.scrollHeight <= el.clientHeight + 5) continue;
      const cand = { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
                     scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
      if (!best || cand.clientHeight > best.clientHeight) best = cand;
    }
    return best;
  })()`,

  /**
   * The "Space between series" control, identified through the card that
   * owns its label.
   *
   * Position alone would be wrong: "Space between categories" sits about
   * 28px above with its own identical slider, and "Overlap" just below. The
   * label's nearest ancestor containing inputs is the card, and the
   * spinbutton inside it is the value.
   */
  seriesGapControl: () => SLIDER_CONTROL("Space between series"),

  /**
   * Any Format-pane slider, by its label. Read-only: nothing in the
   * controller writes through this, and it exists so a value Power BI
   * already knows can be read instead of inferred from geometry.
   */
  sliderControlAt: (label) => SLIDER_CONTROL(label),

  /**
   * Every value-bearing control in the Format pane, with the label nearest
   * above it.
   *
   * Read-only and deliberately unopinionated: the pane's font-size control
   * has no accessible name of its own, and which element type Power BI uses
   * for it has changed between releases. Reporting what is actually there
   * beats guessing a selector that will rot.
   */
  paneInputs: () => `(() => {
    const W = window.innerWidth;
    const inPane = (r) => r.x > W * 0.62 && r.width > 4 && r.height > 4;
    const texts = [...document.querySelectorAll('*')]
      .filter((e) => !e.children.length && (e.textContent || '').trim())
      .map((e) => ({ text: (e.textContent || '').trim(), r: e.getBoundingClientRect() }))
      .filter((t) => inPane(t.r));
    const nearestLabel = (r) => {
      let best = null;
      for (const t of texts) {
        if (t.r.bottom > r.top + 4) continue;
        const d = r.top - t.r.bottom + Math.abs(t.r.x - r.x) / 8;
        if (d < 0 || d > 80) continue;
        if (!best || d < best.d) best = { d, text: t.text };
      }
      return best ? best.text : null;
    };
    return [...document.querySelectorAll('input,[role=combobox],[role=spinbutton]')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => inPane(r))
      .map(({ el, r }) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type'),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        value: el.value !== undefined ? el.value : (el.textContent || '').trim(),
        label: nearestLabel(r),
        x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      }));
  })()`,

  /**
   * The report theme's primary text-size control.
   *
   * Theme pane — Text — General, which is the `label` text class every other
   * class derives from. Found through the label that owns it, like the
   * Layout sliders, because the input itself is named only "Font Size" and
   * several controls share that name.
   */
  themeTextSizeControl: () => `(() => {
    const W = window.innerWidth;
    const inPane = (r) => r.x > W * 0.62 && r.width > 4 && r.height > 4;
    const labels = [...document.querySelectorAll('*')]
      .filter((e) => !e.children.length && (e.textContent || '').trim() === 'General')
      .map((e) => e.getBoundingClientRect())
      .filter(inPane);
    if (labels.length !== 1) return null;
    const row = labels[0];
    const input = [...document.querySelectorAll('input')].find((el) => {
      const r = el.getBoundingClientRect();
      return inPane(r) && el.getAttribute('aria-label') === 'Font Size'
        && Math.abs(r.top - row.top) < 40;
    });
    if (!input) return null;
    const r = input.getBoundingClientRect();
    return {
      value: input.value,
      x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      visible: r.top > 60 && r.bottom < window.innerHeight - 20,
    };
  })()`,

  /**
   * The category scale, edge to edge.
   *
   * Power BI does not tile categories across the plot: it leaves space
   * before the first band and after the last. Measuring that needs the
   * band positions AND the plot's own extent in one read, so the two
   * cannot drift between calls.
   *
   * Bands are grouped by series fill rather than by proximity: at low
   * category spacing the gap between clusters is smaller than the gap
   * between series inside one, so any proximity rule silently regroups.
   * Reported in both the SVG attribute space the geometry is authored in
   * and the CSS pixels it paints to, so a coordinate assumption cannot
   * hide.
   */
  categoryScale: () => `(() => {
    const num = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(4) : null);
    const el = ${VISUAL};
    if (!el) return null;
    const plot = el.querySelector('svg.mainGraphicsContext');
    const bars = [...el.querySelectorAll('svg rect.bar')];
    if (!plot || !bars.length) return null;
    const pr = plot.getBoundingClientRect();

    const byFill = new Map();
    for (const b of bars) {
      const f = getComputedStyle(b).fill;
      const list = byFill.get(f) ?? [];
      list.push({
        y: Number(b.getAttribute('y')),
        h: Number(b.getAttribute('height')),
        top: b.getBoundingClientRect().top - pr.top,
        bottom: b.getBoundingClientRect().bottom - pr.top,
      });
      byFill.set(f, list);
    }
    const series = [...byFill.values()].map((list) => list.sort((a, b) => a.y - b.y));
    const count = Math.min(...series.map((s) => s.length));
    if (!count) return null;

    const clusters = [];
    for (let i = 0; i < count; i++) {
      const members = series.map((s) => s[i]);
      clusters.push({
        start: Math.min(...members.map((m) => m.y)),
        end: Math.max(...members.map((m) => m.y + m.h)),
        cssStart: Math.min(...members.map((m) => m.top)),
        cssEnd: Math.max(...members.map((m) => m.bottom)),
      });
    }

    const plotExtent = Number(plot.getAttribute('height'));
    const step = clusters.length >= 2 ? clusters[1].start - clusters[0].start : null;
    const last = clusters[clusters.length - 1];
    return {
      categoryCount: clusters.length,
      seriesCount: series.length,
      plotExtent: num(plotExtent),
      plotExtentCss: num(pr.height),
      step: num(step),
      bandExtent: num(clusters[0].end - clusters[0].start),
      firstBandStart: num(clusters[0].start),
      lastBandEnd: num(last.end),
      leadingEdge: num(clusters[0].start),
      trailingEdge: num(plotExtent - last.end),
      leadingEdgeCss: num(clusters[0].cssStart),
      trailingEdgeCss: num(pr.height - last.cssEnd),
      clusters: clusters.map((c) => ({ start: num(c.start), end: num(c.end) })),
    };
  })()`,

  /**
   * The horizontal layer chain, from the visual's own edge to the plot's.
   *
   * "Non-plot width" is not one thing. Between the visual's edge and the
   * plot rectangle sit a container padding, a chart viewport, the category
   * labels, the axis title and whatever margin the renderer keeps on the
   * far side — and calling the sum of them "axis padding" is how a layout
   * model ends up with a magic constant. This reads every layer that is
   * observable, relative to the visual's left edge, so the terms can be
   * separated rather than inferred.
   *
   * Read-only.
   */
  horizontalGeometry: () => `(() => {
    const n3 = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(3) : null);
    const el = ${VISUAL};
    if (!el) return null;
    const vis = el.getBoundingClientRect();
    const rel = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { left: n3(r.left - vis.left), right: n3(r.right - vis.left), width: n3(r.width),
               top: n3(r.top - vis.top), bottom: n3(r.bottom - vis.top), height: n3(r.height) };
    };
    const q = (sel) => rel(el.querySelector(sel));

    const own = (node) => {
      const direct = [...node.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('').trim();
      if (direct) return direct;
      return node.children.length === 0 ? (node.textContent || '').trim() : '';
    };
    const bars = [...el.querySelectorAll('svg rect.bar')];
    const barLeft = bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().left)) : null;
    const isTitleFace = (f) => /wf_standard-font/.test(f);
    const texts = [...el.querySelectorAll('svg text')]
      .map((t) => ({ text: own(t), node: t, r: t.getBoundingClientRect(), face: getComputedStyle(t).fontFamily,
                     px: parseFloat(getComputedStyle(t).fontSize) }))
      .filter((t) => t.text);
    const catLabels = texts.filter((t) => barLeft !== null && t.r.right <= barLeft + 2 && !isTitleFace(t.face));
    const catTitle = texts.find((t) => barLeft !== null && t.r.right <= barLeft + 2 && isTitleFace(t.face));

    const widest = catLabels.reduce((best, t) => (!best || t.r.width > best.r.width ? t : best), null);
    const labelsRight = catLabels.length ? Math.max(...catLabels.map((t) => t.r.right - vis.left)) : null;
    const labelsLeft = catLabels.length ? Math.min(...catLabels.map((t) => t.r.left - vis.left)) : null;

    const plot = el.querySelector('svg.mainGraphicsContext');
    const chart = el.querySelector('svg.cartesianChart');
    const plotRect = rel(plot);
    const chartRect = rel(chart);

    return {
      visual: { width: n3(vis.width), height: n3(vis.height) },
      vcBody: q('[class*="vcBody"]'),
      visualWrapper: q('[class*="visualWrapper"]'),
      innerViewport: q('[class*="customPadding"]'),
      chart: chartRect,
      chartAttrWidth: chart ? n3(Number(chart.getAttribute('width'))) : null,
      scrollable: q('svg.svgScrollable'),
      plot: plotRect,
      plotAttrWidth: plot ? n3(Number(plot.getAttribute('width'))) : null,
      categoryLabels: catLabels.map((t) => ({ text: t.text, left: n3(t.r.left - vis.left), right: n3(t.r.right - vis.left), width: n3(t.r.width), px: n3(t.px) })),
      widestLabel: widest ? { text: widest.text, width: n3(widest.r.width), left: n3(widest.r.left - vis.left), right: n3(widest.r.right - vis.left), px: n3(widest.px) } : null,
      labelsLeft: n3(labelsLeft),
      labelsRight: n3(labelsRight),
      categoryTitle: catTitle ? { text: catTitle.text, px: n3(catTitle.px), ...rel(catTitle.node) } : null,
      // The derived decomposition, all relative to the visual's left edge.
      leftOfChart: chartRect ? n3(chartRect.left) : null,
      rightOfChart: chartRect ? n3(vis.width - chartRect.right) : null,
      plotInsetFromChartLeft: chartRect && plotRect ? n3(plotRect.left - chartRect.left) : null,
      plotInsetFromChartRight: chartRect && plotRect ? n3(chartRect.right - plotRect.right) : null,
      labelToPlotGap: plotRect && labelsRight !== null ? n3(plotRect.left - labelsRight) : null,
      titleToLabelGap: catTitle && labelsLeft !== null ? n3(labelsLeft - (catTitle.r.right - vis.left)) : null,
      totalNonPlot: plotRect ? n3(vis.width - plotRect.width) : null,
    };
  })()`,

  /**
   * Every on/off control in the Format pane, with its accessible name and
   * state. Read-only; used to find a named toggle rather than guess at one.
   */
  paneToggles: () => `(() => {
    const W = window.innerWidth;
    return [...document.querySelectorAll('[role=switch],input[type=checkbox],button[aria-pressed],[aria-checked],[class*=toggle],[class*=Toggle],[class*=switch]')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.x > W * 0.62 && r.width > 2 && r.height > 2)
      .map(({ el, r }) => ({
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        ariaLabel: el.getAttribute('aria-label'),
        checked: el.getAttribute('aria-checked') ?? (el.checked === undefined ? null : String(el.checked)),
        title: el.getAttribute('title'),
        cls: String(el.className).slice(0, 40),
        text: (el.textContent || '').trim().slice(0, 24),
        x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      }));
  })()`,

  /**
   * The on/off switch belonging to one formatting group inside one
   * formatting card, both named.
   *
   * Power BI's toggles carry no accessible name, so the only honest handle
   * is ownership. The pane's structure supplies it: a `formatting-card` owns
   * a named heading, a `formatting-group` inside it owns its own heading,
   * and that group's header holds exactly one `pbi-toggle-button`. Walking
   * card — group — toggle is a chain of containment, not a chain of guesses.
   *
   * Fails closed at every link: the card heading must be unique, the group
   * heading must be unique inside that card, and the smallest ancestor of
   * that heading which contains a toggle must contain exactly one. Anything
   * else returns a reason instead of an element, because "the toggle near
   * the Title text" is how the wrong axis gets switched off.
   */
  groupToggle: (cardName, groupName) => `(() => {
    const W = window.innerWidth;
    const inPane = (el) => el.getBoundingClientRect().x > W * 0.62;
    const named = (root, wanted) => [...root.querySelectorAll('[role=button],button')]
      .filter((e) => ((e.getAttribute('aria-label') || e.textContent || '').trim() === wanted) && inPane(e));

    const cardHeadings = named(document, ${JSON.stringify(cardName)});
    if (cardHeadings.length !== 1) return { ok: false, reason: cardHeadings.length + ' headings named ' + ${JSON.stringify(cardName)} };
    const card = cardHeadings[0].closest('formatting-card');
    if (!card) return { ok: false, reason: 'the ' + ${JSON.stringify(cardName)} + ' heading is not inside a formatting-card' };

    const groupHeadings = named(card, ${JSON.stringify(groupName)});
    if (groupHeadings.length !== 1) {
      return { ok: false, reason: groupHeadings.length + ' headings named ' + ${JSON.stringify(groupName)} + ' inside ' + ${JSON.stringify(cardName)} };
    }

    // The smallest ancestor of the group heading that owns a toggle.
    let owner = groupHeadings[0];
    for (let i = 0; i < 6 && owner; i++) {
      if (owner.querySelector('pbi-toggle-button')) break;
      owner = owner.parentElement;
    }
    if (!owner || !owner.querySelector('pbi-toggle-button')) return { ok: false, reason: 'no toggle owned by the ' + ${JSON.stringify(groupName)} + ' group' };
    if (!card.contains(owner)) return { ok: false, reason: 'the owning group escaped the ' + ${JSON.stringify(cardName)} + ' card' };

    const toggles = [...owner.querySelectorAll('pbi-toggle-button')];
    if (toggles.length !== 1) return { ok: false, reason: toggles.length + ' toggles inside the ' + ${JSON.stringify(groupName)} + ' group' };
    const headingsInOwner = named(owner, ${JSON.stringify(groupName)});
    if (headingsInOwner.length !== 1) return { ok: false, reason: 'the owning group holds ' + headingsInOwner.length + ' ' + ${JSON.stringify(groupName)} + ' headings' };

    const toggle = toggles[0];
    const input = toggle.querySelector('input');
    const r = toggle.getBoundingClientRect();
    return {
      ok: true,
      ownerTag: owner.tagName.toLowerCase(),
      ownerClass: String(owner.className || '').slice(0, 40),
      checked: input ? (input.getAttribute('aria-checked') ?? String(input.checked)) : null,
      x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      visible: r.top > 60 && r.bottom < window.innerHeight - 20,
    };
  })()`,
  /**
   * Named controls along the right-hand pane strip.
   *
   * When a pane is collapsed the Format tabs do not exist at all, so the
   * controller cannot recover by selecting the visual again. This lists what
   * is actually there, by accessible name, so the reopen is a named action
   * rather than a coordinate.
   */
  paneStrip: () => `(() => {
    const W = window.innerWidth;
    return [...document.querySelectorAll('[role=button],button,[role=tab],[aria-label]')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      // Below the window chrome: the title bar carries the signed-in
      // account name, and the lab has no business reading it.
      .filter(({ r }) => r.x > W * 0.85 && r.y > 140 && r.width > 2 && r.height > 2)
      .map(({ el, r }) => ({
        name: (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim().slice(0, 40),
        tag: el.tagName.toLowerCase(),
        expanded: el.getAttribute('aria-expanded'),
        x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
        w: Math.round(r.width), h: Math.round(r.height),
      }))
      .filter((e) => e.name);
  })()`,

  /** Somewhere empty on the canvas, to deselect. */
  canvasPoint: () => `(() => {
    const c = document.querySelector('[class*="displayArea"]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x + r.width - 30), y: Math.round(r.y + r.height - 30) };
  })()`,

  /**
   * A right-pane TAB, by accessible name.
   *
   * Separate from `controlAt` because several names are used twice: 'Theme'
   * is both a tab and a section header inside that tab, and a generic
   * lookup matches whichever comes first in the DOM.
   */
  tabAt: (label) => `(() => {
    const el = [...document.querySelectorAll('[role=tab]')]
      .find((e) => ((e.getAttribute('aria-label') || e.textContent || '').trim() === ${JSON.stringify(label)}));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
             selected: el.getAttribute('aria-selected') };
  })()`,

  /** Centre of a pane control, found by its accessible name. */
  controlAt: (label) => `(() => {
    const el = [...document.querySelectorAll('[role=tab],[role=button],button')]
      .find((e) => ((e.getAttribute('aria-label') || e.textContent || '').trim() === ${JSON.stringify(label)}));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
             expanded: el.getAttribute('aria-expanded'), selected: el.getAttribute('aria-selected') };
  })()`,

  /** Is the visual selected? Selection is what makes the Format pane appear. */
  selection: () => `(() => {
    const el = ${VISUAL};
    if (!el) return { selected: false };
    const r = el.getBoundingClientRect();
    return { selected: /\\bselected\\b/.test(String(el.className)),
             x: Math.round(r.x + r.width / 2), y: Math.round(r.y + 8) };
  })()`,

  /**
   * The Size fields in General → Properties.
   *
   * Power BI gives them no accessible name, so they are found structurally:
   * the unlabelled text inputs in the right-hand pane below the section
   * header. Which one is width and which is height is NOT assumed — see
   * `resolveSizeFields`.
   */
  sizeFields: () => `(() => {
    return [...document.querySelectorAll('input')].filter((i) => {
      const r = i.getBoundingClientRect();
      return r.width > 4 && i.type === 'text' && !i.getAttribute('aria-label')
        && r.x > window.innerWidth * 0.62 && r.y > 400;
    }).map((i) => {
      const r = i.getBoundingClientRect();
      return { value: i.value, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + 8) };
    });
  })()`,
};

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class LabController {
  constructor({ port = 9222, verbose = true } = {}) {
    this.session = new LabSession(port);
    this.verbose = verbose;
    this.initialState = null;
    this.mutated = {};
    this.sizeFieldMap = null;
  }

  /**
   * Re-establishes that the lab visual is still exactly one visual.
   *
   * Called before each mutation. open() proving identity once is not
   * enough: a session outlives that check, and the whole safety argument
   * rests on never mutating something unidentified.
   */
  async requireLabVisual() {
    const counts = await this.session.read("labVisualCount");
    if (!counts || counts.matching !== 1) {
      const found = counts ? `${counts.matching} of ${counts.cartesian} cartesian visuals match` : "the page could not be read";
      throw new Error(
        `REFUSING TO MUTATE — the lab visual is no longer uniquely identifiable (${found})`,
      );
    }
  }

  log(message) {
    if (this.verbose) console.log(message);
  }

  async open() {
    await this.session.open();

    // Identity first, across every cartesian visual on the page, so a second
    // reference visual cannot be mutated by mistake and an ambiguous page is
    // an error rather than a guess.
    const candidates = await this.session.read("labVisuals");
    const chosen = selectLabVisual(candidates);
    if (!chosen.ok) {
      this.session.close();
      throw new Error(`REFUSING TO MUTATE — ${chosen.reasons.join("; ")}`);
    }

    const state = await this.session.read("labState");
    const check = identifyLabEnvironment(state);
    if (!check.ok) {
      this.session.close();
      throw new Error(
        `REFUSING TO MUTATE — this is not the synthetic lab visual:\n  ${check.reasons.join("\n  ")}`,
      );
    }

    // The base theme is part of every measurement's identity, so it is read
    // up front and restored at the end like any other mutated setting.
    state.baseTheme = await this.readBaseTheme();
    this.initialState = state;
    this.log(
      `lab identified: ${state.width}x${state.height}, ${state.barsRendered} bars, ` +
        `base theme ${state.baseTheme ?? "(unreadable)"}`,
    );
    return state;
  }

  /**
   * Opens the report-theme pane and reads the Base theme control.
   *
   * The control only exists with no visual selected, so this deselects on
   * the way in. Callers that need the visual selected afterwards re-select
   * it themselves -- `openSizeControls` already does.
   */
  async openThemeControls() {
    const existing = await this.session.read("baseThemeValue");
    if (existing && SUPPORTED_BASE_THEMES.includes(existing.value)) return existing;

    // The Base theme control only exists with no visual selected.
    const canvas = await this.session.read("canvasPoint");
    if (canvas) await this.session.click(canvas.x, canvas.y);

    const themeTab = await this.session.read("tabAt", "Theme");
    if (!themeTab) return null;
    if (themeTab.selected !== "true") await this.session.click(themeTab.x, themeTab.y);

    // The section may already be open from a previous call; only click when
    // it is not, or the click closes it again.
    for (let attempt = 0; attempt < 2; attempt++) {
      const settings = await this.session.read("controlAt", "Theme settings");
      if (!settings) break;
      if (settings.expanded === "true") break;
      await this.session.click(settings.x, settings.y);
    }

    return this.session.read("baseThemeValue");
  }

  /**
   * The current Base theme, leaving the UI as it was found.
   *
   * Reading a setting should not change what the next operation sees, and
   * getting to this control means deselecting the visual.
   */
  async readBaseTheme() {
    const control = await this.openThemeControls();
    const value = control ? control.value : null;
    await this.selectVisual();
    return value;
  }

  /**
   * Reopens the Visualizations pane if something collapsed it.
   *
   * A collapsed pane removes the Format tabs from the DOM entirely, so
   * `selectVisual` cannot recover on its own — it selects the visual
   * successfully and then waits forever for a tab that cannot exist. Found
   * by the strip control's own accessible name, and only clicked when it
   * reports itself collapsed.
   */
  async ensureVisualizationsPane() {
    const strip = await this.session.read("paneStrip");
    // A collapsed pane draws its name ROTATED, so its box is taller than it
    // is wide. aria-expanded is not the signal it looks like: the open pane's
    // header tab also reports false, and clicking that collapses the pane -
    // which is exactly the loop this method used to create.
    const pane = (strip ?? []).find((c) => c.name === "Visualizations" && c.h > c.w);
    if (!pane) return false;
    this.log("the Visualizations pane was collapsed; reopening it");
    await this.session.click(pane.x, pane.y);
    await sleep(900);
    return true;
  }

  /**
   * Selects the lab visual, verified by the Format visual tab appearing.
   *
   * That tab only exists while a visual is selected, so its presence is a
   * more meaningful check than an undocumented class name -- and it is the
   * thing every later step actually depends on.
   */
  async selectVisual() {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (await this.session.read("tabAt", "Format visual")) return true;
      // A collapsed pane is the one failure selecting again cannot fix.
      if (attempt === 1) await this.ensureVisualizationsPane();
      const selection = await this.session.read("selection");
      if (!selection) throw new Error("the lab visual is no longer on the page");
      await this.session.click(selection.x, selection.y);
      await sleep(800);
    }
    return Boolean(await this.session.read("tabAt", "Format visual"));
  }

  /**
   * Switches the report's Base theme through Power BI's own dropdown.
   *
   * Verification reads the control back, not the rendered colours: a palette
   * is a secondary sanity check at best, and filing a measurement under a
   * theme that was merely requested is exactly the mistake that made a whole
   * earlier dataset unusable.
   */
  async setBaseTheme(theme) {
    await this.requireLabVisual();
    validateAction({ type: "setBaseTheme", theme });

    // Navigate once and keep the control on screen for the write.
    const control = await this.openThemeControls();
    if (!control) throw new Error("the Base theme control could not be found");
    if (control.value === theme) {
      this.log(`base theme already ${theme}`);
      await this.selectVisual();
      return { theme, changed: false, settled: true };
    }
    if (control.expanded !== "true") await this.session.click(control.x, control.y);

    const options = await this.session.read("baseThemeOptions");
    const option = options.find((o) => o.label === theme);
    if (!option) {
      // Leave the dropdown as we found it rather than mid-interaction.
      await this.session.pressEscape();
      throw new Error(`"${theme}" is not offered by this build (saw: ${options.map((o) => o.label).join(", ")})`);
    }
    await this.session.click(option.x, option.y);

    // A theme switch re-resolves every default and re-renders from scratch,
    // so it needs a longer settle than a resize.
    const outcome = await this.settle({ timeoutMs: 30000 });

    const after = await this.session.read("baseThemeValue");
    const verified = after ? after.value : null;
    await this.selectVisual();
    if (verified !== theme) {
      throw new Error(`base theme did not change: asked for ${theme}, control reports ${verified}`);
    }
    this.mutated.baseTheme = theme;
    this.log(`base theme now ${verified}`);
    return { theme: verified, changed: true, settled: outcome.settled };
  }

  /** Selects the visual and opens General → Properties, verifying each step. */
  async openSizeControls() {
    // Selection is verified by the thing that actually depends on it -- the
    // Format visual tab only exists while a visual is selected -- rather
    // than by a class name, which is both undocumented and easy to confuse
    // with 'unselectable'.
    if (!(await this.selectVisual())) {
      throw new Error("could not select the lab visual — the Format visual tab never appeared");
    }
    // The pane is stateful and a previous operation may have left it on the
    // theme tab, so each step is verified and retried rather than assumed.
    const step = async (payload, label, done) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const control = await this.session.read(payload, label);
        if (control && done(control)) return;
        if (control) {
          await this.session.click(control.x, control.y);
          await sleep(700);
        } else {
          await sleep(500);
        }
      }
      const final = await this.session.read(payload, label);
      if (!final) throw new Error(`could not find the "${label}" control`);
      if (!done(final)) throw new Error(`"${label}" did not reach the expected state`);
    };

    await step("tabAt", "Format visual", (c) => c.selected === "true");

    // The General sub-tab has no selected state to read, so it is driven by
    // what it is for: click it until the Properties section it contains
    // appears. A predicate that always returns true would never click at
    // all, and the pane would silently stay on whichever sub-tab it was on.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.session.read("controlAt", "Properties")) break;
      const general = await this.session.read("controlAt", "General");
      if (!general) throw new Error("could not find the General sub-tab");
      await this.session.click(general.x, general.y);
      await sleep(700);
    }

    await step("controlAt", "Properties", (c) => c.expanded === "true");
    const fields = await this.session.read("sizeFields");
    if (fields.length < 2) throw new Error(`expected two size fields, found ${fields.length}`);
    return fields;
  }

  /**
   * Works out which size field is width and which is height, by changing one
   * and seeing which dimension moved.
   *
   * Power BI orders them Height then Width, which is the opposite of the
   * obvious guess — assuming the order would have transposed every
   * measurement in a sweep. Deriving it costs one extra round trip once, and
   * survives Power BI reordering the pane in a future release.
   */
  async resolveSizeFields() {
    if (this.sizeFieldMap) return this.sizeFieldMap;
    const fields = await this.openSizeControls();
    const before = await this.session.read("geometry");
    const probeValue = String(Math.round(before.w) === 480 ? 500 : 480);

    await this.session.typeInto(fields[0].x, fields[0].y, probeValue);
    await this.settle();
    const after = await this.session.read("geometry");

    const widthMoved = Math.abs(after.w - before.w) > 1;
    const heightMoved = Math.abs(after.h - before.h) > 1;
    if (widthMoved === heightMoved) {
      throw new Error("could not tell the size fields apart — neither or both dimensions moved");
    }
    this.sizeFieldMap = widthMoved ? { width: 0, height: 1 } : { height: 0, width: 1 };
    this.log(`size fields resolved: first field is ${widthMoved ? "width" : "height"}`);

    // Put back what the probe moved.
    await this.setVisualSize(before.w, before.h);
    return this.sizeFieldMap;
  }

  /** Scrolls the Format pane by one wheel notch. Internal only. */
  /**
   * Scrolls the Format pane by one wheel notch and reports where it landed.
   *
   * Returns the scroller AFTER the wheel, so a caller can tell movement
   * from a no-op. Reading `scrollTop` is fine; writing it is not, because a
   * pane that virtualises its cards has to be given real input events or it
   * never mounts what scrolled into view.
   */
  async scrollFormatPane(deltaY) {
    const scroller = await this.session.read("formatPaneScroller");
    if (!scroller) return null;
    await this.session.send("Input.dispatchMouseEvent", {
      type: "mouseWheel", x: scroller.x, y: scroller.y, deltaX: 0, deltaY,
    });
    await sleep(300);
    return this.session.read("formatPaneScroller");
  }

  /**
   * Brings a formatting card into the DOM, wherever the pane happens to be.
   *
   * The Format pane VIRTUALISES: a card scrolled far enough away is not off
   * screen, it is unmounted, and querying for it returns nothing at all.
   * Anything that scrolled down to Bars → Layout therefore leaves the axis
   * cards genuinely absent, which is how the previous sweep died.
   *
   * So: rewind to the top, then walk down in bounded steps, checking after
   * each whether the card has mounted. Movement is observed rather than
   * assumed — each step compares `scrollTop` before and after, and the walk
   * stops when the pane refuses to move. Position is only ever *read*; the
   * scrolling itself is real wheel input, because a virtualising pane needs
   * the events to mount anything.
   *
   * Order is used to navigate, never to identify: the card is always
   * matched by its own heading, and a run that reaches the end without one
   * fails rather than settling for whatever is on screen.
   */
  async seekFormattingCard(card) {
    if (await this.session.read("controlAt", card)) return true;

    // No scroller at all means the Format pane is not the one on display
    // yet - it was just brought to the front and has not rendered. Give it a
    // bounded moment rather than concluding the card does not exist.
    for (let wait = 0; wait < 6; wait++) {
      if (await this.session.read("formatPaneScroller")) break;
      await sleep(500);
      if (await this.session.read("controlAt", card)) return true;
      // Halfway through, consider that the pane is not slow but gone: a click
      // can collapse it, and no amount of waiting brings it back.
      if (wait === 2) {
        await this.ensureVisualizationsPane();
        await this.selectVisual();
        if (await this.session.read("controlAt", card)) return true;
      }
    }

    // Rewind. Bounded, and stops as soon as the pane stops moving.
    let previous = null;
    for (let step = 0; step < 25; step++) {
      const scroller = await this.scrollFormatPane(-400);
      if (!scroller) break;
      if (await this.session.read("controlAt", card)) return true;
      if (previous !== null && scroller.scrollTop >= previous) break;
      previous = scroller.scrollTop;
      if (scroller.scrollTop <= 0) break;
    }
    if (await this.session.read("controlAt", card)) return true;

    // Walk down until it mounts or the pane runs out.
    previous = null;
    for (let step = 0; step < 40; step++) {
      const scroller = await this.scrollFormatPane(300);
      if (!scroller) break;
      if (await this.session.read("controlAt", card)) return true;
      if (previous !== null && scroller.scrollTop <= previous) break;
      previous = scroller.scrollTop;
    }
    return Boolean(await this.session.read("controlAt", card));
  }

  /**
   * Opens Format visual -> Visual -> Bars -> Layout and scrolls until the
   * named slider is on screen.
   *
   * Layout's contents sit below the fold once Bars is expanded, so the pane
   * has to be scrolled; the control is then located by its own label rather
   * than by where the scroll happened to land. "Space between categories"
   * and "Space between series" are 28px apart and identical, so the label
   * is the only safe handle.
   */
  async openLayoutSlider(label) {
    await this.selectVisual();

    const step = async (payload, label, done) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const control = await this.session.read(payload, label);
        if (control && done(control)) return control;
        if (control) { await this.session.click(control.x, control.y); await sleep(700); }
        else await sleep(400);
      }
      return this.session.read(payload, label);
    };

    await step("tabAt", "Format visual", (c) => c.selected === "true");
    // The Visual sub-tab holds Bars; General holds Properties.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.session.read("controlAt", "Bars")) break;
      const visual = await this.session.read("controlAt", "Visual");
      if (!visual) break;
      await this.session.click(visual.x, visual.y);
      await sleep(700);
    }
    if (!(await this.seekFormattingCard("Bars"))) {
      throw new Error('the "Bars" card never mounted, at any scroll position');
    }
    await step("controlAt", "Bars", (c) => c.expanded === "true");
    await step("controlAt", "Layout", (c) => c.expanded === "true");

    // Scroll until the control is both present and on screen.
    for (let attempt = 0; attempt < 12; attempt++) {
      const control = await this.session.read("sliderControlAt", label);
      if (control && control.visible) return control;
      if (!(await this.scrollFormatPane(200))) break;
    }
    const final = await this.session.read("sliderControlAt", label);
    if (!final) throw new Error(`could not find the "${label}" control`);
    return final;
  }

  /** Back-compatible alias: the gap slider is one of the Layout sliders. */
  async openSeriesGapControl() {
    return this.openLayoutSlider("Space between series");
  }

  /**
   * Sets "Space between categories" — Power BI's own user-facing property,
   * not the effective ratio its geometry produces.
   *
   * A different level of the layout from `setSeriesGap`: this one moves the
   * category scale, that one subdivides a category between series. They sit
   * next to each other in the pane and look identical, which is exactly why
   * each is found through its own label.
   */
  async setCategorySpacing(spacing) {
    validateAction({ type: "setCategorySpacing", spacing });
    requireImplemented("setCategorySpacing");
    await this.requireLabVisual();

    const control = await this.openLayoutSlider("Space between categories");
    if (this.initialState && this.initialState.categorySpacing === undefined) {
      this.initialState.categorySpacing = Number(control.value);
    }
    if (Number(control.value) === Number(spacing)) {
      this.log(`category spacing already ${spacing}`);
      return { spacing, changed: false, settled: true };
    }

    const before = await this.session.read("categoryScale");
    await this.session.typeInto(control.x, control.y, String(spacing));
    const outcome = await this.settle();

    const after = await this.session.read("sliderControlAt", "Space between categories");
    if (!after || Number(after.value) !== Number(spacing)) {
      throw new Error(
        `category spacing did not take: asked for ${spacing}, control reports ${after ? after.value : "nothing"}`,
      );
    }
    // The control agreeing is not the same as the renderer moving: this
    // property changes the category band, so the band must change with it.
    const geometry = await this.session.read("categoryScale");
    if (before && geometry && Math.abs(geometry.bandExtent - before.bandExtent) < 0.01) {
      throw new Error(
        `category spacing reported ${spacing} but the category band did not move (${before.bandExtent})`,
      );
    }
    this.mutated.categorySpacing = Number(spacing);
    this.log(`category spacing now ${after.value} (range ${after.min}..${after.max})`);
    return { spacing: Number(after.value), changed: true, settled: outcome.settled };
  }

  /**
   * Sets "Space between series" through Power BI's own control.
   *
   * Verified twice: the control must report the requested value, and the
   * rendered geometry must actually move. Either alone can lie -- a spin
   * button will happily show a number Power BI rejected, and geometry can
   * settle before the value commits.
   */
  async setSeriesGap(gap) {
    validateAction({ type: "setSeriesGap", gap });
    requireImplemented("setSeriesGap");
    await this.requireLabVisual();

    const control = await this.openSeriesGapControl();

    // Record the pre-existing gap the first time we touch it, so it can be
    // restored. Reading it eagerly in open() would cost a pane navigation on
    // every session, including the many that never change it.
    if (this.initialState && this.initialState.gap === undefined) {
      this.initialState.gap = Number(control.value);
    }

    if (String(control.value) === String(gap)) {
      this.log(`series gap already ${gap}`);
      return { gap, changed: false, settled: true };
    }

    const before = await this.session.read("geometry");
    await this.session.typeInto(control.x, control.y, String(gap));
    const outcome = await this.settle();

    const after = await this.session.read("seriesGapControl");
    if (!after || String(after.value) !== String(gap)) {
      throw new Error(`series gap did not take: asked for ${gap}, control reports ${after ? after.value : "nothing"}`);
    }
    const geometry = await this.session.read("geometry");
    if (geometry.bars === before.bars && geometry.plotW === before.plotW && geometry.plotH === before.plotH
        && geometry.w === before.w && geometry.h === before.h) {
      // The gap only moves the bars inside an unchanged plot, so a completely
      // unchanged fingerprint means nothing rendered.
      this.log("  note: plot geometry unchanged, as expected for a gap change");
    }
    this.mutated.gap = gap;
    this.log(`series gap now ${after.value} (range ${after.min}..${after.max})`);
    return { gap, changed: true, settled: outcome.settled };
  }

  /**
   * Opens the report theme pane's Text section and returns its General
   * font-size control.
   */
  async openThemeTextControl() {
    await this.openThemeControls();
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await this.session.read("themeTextSizeControl");
      if (existing) return existing;
      const text = await this.session.read("controlAt", "Text");
      if (!text) break;
      if (text.expanded !== "true") await this.session.click(text.x, text.y);
      await sleep(800);
    }
    const final = await this.session.read("themeTextSizeControl");
    if (!final) throw new Error("could not find the theme's General text-size control");
    return final;
  }

  /**
   * Sets the report theme's primary text size, through Power BI's own
   * control.
   *
   * This edits the report theme rather than one visual, so it is restored
   * like any other mutation — and the original is captured on first use,
   * not eagerly, so a run that never touches it pays nothing.
   */
  async setThemeTextSize(size) {
    validateAction({ type: "setThemeTextSize", size });
    requireImplemented("setThemeTextSize");
    await this.requireLabVisual();

    const control = await this.openThemeTextControl();
    if (this.initialState && this.initialState.themeTextSize === undefined) {
      this.initialState.themeTextSize = Number(control.value);
    }
    if (Number(control.value) === Number(size)) {
      this.log(`theme text size already ${size}`);
      await this.selectVisual();
      return { size, changed: false, settled: true };
    }

    await this.session.typeInto(control.x, control.y, String(size));
    const outcome = await this.settle({ timeoutMs: 30000 });

    const after = await this.session.read("themeTextSizeControl");
    if (!after || Number(after.value) !== Number(size)) {
      throw new Error(
        `theme text size did not take: asked for ${size}, control reports ${after ? after.value : "nothing"}`,
      );
    }
    this.mutated.themeTextSize = Number(size);
    this.log(`theme text size now ${after.value}`);
    await this.selectVisual();
    return { size: Number(after.value), changed: true, settled: outcome.settled };
  }

  /**
   * Shows or hides the category axis title, through the Y-axis card's own
   * Title toggle.
   *
   * Verified twice over, because neither check alone is enough: the toggle
   * must report the requested state, AND a title must exist in the rendered
   * SVG or not. A control can report a value the renderer refused, and a
   * render can settle before a control commits.
   */
  async setCategoryAxisTitleVisible(visible) {
    validateAction({ type: "setCategoryAxisTitleVisible", visible });
    requireImplemented("setCategoryAxisTitleVisible");
    await this.requireLabVisual();

    const before = await this.session.read("horizontalGeometry");
    if (this.initialState && this.initialState.categoryAxisTitleVisible === undefined) {
      this.initialState.categoryAxisTitleVisible = Boolean(before && before.categoryTitle);
    }
    if (Boolean(before && before.categoryTitle) === visible) {
      this.log(`category axis title already ${visible ? "shown" : "hidden"}`);
      return { visible, changed: false, settled: true };
    }

    const toggle = await this.openGroupToggle("Y-axis", "Title");
    await this.session.click(toggle.x, toggle.y);
    const outcome = await this.settle({ timeoutMs: 30000 });

    const after = await this.session.read("groupToggle", "Y-axis", "Title");
    if (!after || !after.ok) {
      throw new Error(`the Title toggle could not be read back: ${after ? after.reason : "no result"}`);
    }
    if (String(after.checked) !== String(visible)) {
      throw new Error(`Title toggle reports ${after.checked}, asked for ${visible}`);
    }
    const geometry = await this.session.read("horizontalGeometry");
    const shown = Boolean(geometry && geometry.categoryTitle);
    if (shown !== visible) {
      throw new Error(`the toggle says ${visible} but the title ${shown ? "is still drawn" : "is not drawn"}`);
    }
    this.mutated.categoryAxisTitleVisible = visible;
    this.log(`category axis title now ${visible ? "shown" : "hidden"}`);
    return { visible, changed: true, settled: outcome.settled };
  }

  /**
   * Navigates to a named card and group and returns that group's toggle,
   * scrolling the pane until it is on screen.
   */
  async openGroupToggle(card, group) {
    await this.openLayoutCard(card, group);
    for (let attempt = 0; attempt < 12; attempt++) {
      const found = await this.session.read("groupToggle", card, group);
      if (found && found.ok && found.visible) return found;
      // Scroll TOWARDS it. Expanding a group scrolls its contents into view
      // and can leave the group's own header above the fold, where scrolling
      // down only pushes it further away - and a click at an off-screen
      // coordinate lands on nothing while the toggle quietly reports the old
      // value.
      const towards = found && found.ok && found.y < 60 ? -200 : 200;
      if (!(await this.scrollFormatPane(towards))) break;
    }
    const final = await this.session.read("groupToggle", card, group);
    if (!final || !final.ok) {
      throw new Error(`REFUSING TO CLICK — ${card} → ${group}: ${final ? final.reason : "no result"}`);
    }
    return final;
  }
  /**
   * Selects the visual and expands one card and one of its groups.
   *
   * Every step re-seeks before it acts, because expanding a card scrolls the
   * pane and the pane virtualises: the group you are about to click can be
   * unmounted by the click that revealed its own card.
   */
  async openLayoutCard(card, section) {
    await this.selectVisual();
    const tab = await this.session.read("tabAt", "Format visual");
    if (tab && tab.selected !== "true") { await this.session.click(tab.x, tab.y); await sleep(700); }
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.session.read("controlAt", card)) break;
      const visual = await this.session.read("controlAt", "Visual");
      if (!visual) break;
      await this.session.click(visual.x, visual.y);
      await sleep(700);
    }
    for (const label of [card, section]) {
      let expanded = false;
      for (let attempt = 0; attempt < 4 && !expanded; attempt++) {
        if (!(await this.seekFormattingCard(label))) {
          throw new Error(`the "${label}" section never mounted, at any scroll position`);
        }
        const control = await this.session.read("controlAt", label);
        if (!control) { await sleep(400); continue; }
        if (control.expanded === "true") { expanded = true; break; }
        await this.session.click(control.x, control.y);
        await sleep(900);
      }
      if (!expanded) {
        const final = await this.session.read("controlAt", label);
        if (!final || final.expanded !== "true") {
          throw new Error(`the "${label}" section would not expand`);
        }
      }
    }
  }

  async setVisualSize(width, height) {
    await this.requireLabVisual();
    validateAction({ type: "setVisualSize", width: Math.round(width), height: Math.round(height) });
    const map = await this.resolveSizeFields();
    const fields = await this.openSizeControls();

    await this.session.typeInto(fields[map.width].x, fields[map.width].y, String(Math.round(width)));
    await sleep(400);
    const fields2 = await this.session.read("sizeFields");
    await this.session.typeInto(fields2[map.height].x, fields2[map.height].y, String(Math.round(height)));
    const outcome = await this.settle();

    // State verification: the click happening is not success.
    const geometry = await this.session.read("geometry");
    const ok = Math.abs(geometry.w - width) <= 1 && Math.abs(geometry.h - height) <= 1;
    if (!ok) {
      throw new Error(`Power BI did not accept ${width}x${height} — visual is ${geometry.w}x${geometry.h}`);
    }
    this.mutated.width = Math.round(width);
    this.mutated.height = Math.round(height);
    return { ...outcome, width: geometry.w, height: geometry.h };
  }

  /**
   * Waits for the renderer to hold still.
   *
   * Polls rather than sleeping a fixed time: Power BI re-lays out
   * asynchronously and a sleep long enough for a slow machine is wasted on
   * every step of a sweep.
   */
  async settle({ required = 3, tolerance = 0.5, timeoutMs = 15000, intervalMs = 250 } = {}) {
    const observations = [];
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      observations.push(await this.session.read("geometry"));
      if (isStable(observations, { required, tolerance })) break;
      await sleep(intervalMs);
    }
    const outcome = settleOutcome(observations, { required, tolerance });
    if (!outcome.settled) this.log(`  warning: ${outcome.reason}`);
    return outcome;
  }

  async measure() {
    return this.session.read("labState");
  }

  /** Puts back everything this run changed, and checks that it worked. */
  async restore() {
    const plan = planRestoration(this.initialState, this.mutated);
    if (!plan.length) {
      this.log("nothing to restore");
      return { restored: true, problems: [] };
    }
    this.log(`restoring: ${plan.map((a) => a.type).join(", ")}`);
    for (const action of plan) {
      if (action.type === "setVisualSize") await this.setVisualSize(action.width, action.height);
      if (action.type === "setSeriesGap") await this.setSeriesGap(action.gap);
      if (action.type === "setCategorySpacing") await this.setCategorySpacing(action.spacing);
      if (action.type === "setCategoryAxisTitleVisible") await this.setCategoryAxisTitleVisible(action.visible);
      if (action.type === "setBaseTheme") await this.setBaseTheme(action.theme);
      if (action.type === "setThemeTextSize") await this.setThemeTextSize(action.size);
    }
    const current = await this.session.read("labState");
    current.baseTheme = await this.readBaseTheme();
    if (this.mutated.categoryAxisTitleVisible !== undefined) {
      const geometry = await this.session.read("horizontalGeometry");
      current.categoryAxisTitleVisible = Boolean(geometry && geometry.categoryTitle);
    }
    if (this.mutated.categorySpacing !== undefined) {
      const spacing = await this.session.read("sliderControlAt", "Space between categories");
      if (spacing) current.categorySpacing = Number(spacing.value);
    }
    if (this.mutated.themeTextSize !== undefined) {
      const text = await this.session.read("themeTextSizeControl");
      if (text) current.themeTextSize = Number(text.value);
      await this.selectVisual();
    }
    const result = verifyRestoration(this.initialState, current);
    if (!result.restored) {
      console.error("\n*** RESTORATION FAILED ***");
      for (const problem of result.problems) console.error(`  ${problem}`);
      console.error("The lab visual is NOT in its original state. Fix it before further runs.\n");
    } else {
      this.log(`restored to ${current.width}x${current.height}`);
    }
    return result;
  }

  close() {
    this.session.close();
  }
}

export async function writeJson(dir, name, value) {
  await mkdir(dir, { recursive: true });
  const file = join(dir, name);
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
  return file;
}
