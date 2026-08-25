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
  seriesGapControl: () => `(() => {
    const W = window.innerWidth;
    const label = [...document.querySelectorAll('*')].find(
      (e) => !e.children.length && (e.textContent || '').trim() === 'Space between series'
        && e.getBoundingClientRect().x > W * 0.62,
    );
    if (!label) return null;
    let card = label;
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
   * Selects the lab visual, verified by the Format visual tab appearing.
   *
   * That tab only exists while a visual is selected, so its presence is a
   * more meaningful check than an undocumented class name -- and it is the
   * thing every later step actually depends on.
   */
  async selectVisual() {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (await this.session.read("tabAt", "Format visual")) return true;
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
  async scrollFormatPane(deltaY) {
    const scroller = await this.session.read("formatPaneScroller");
    if (!scroller) return false;
    await this.session.send("Input.dispatchMouseEvent", {
      type: "mouseWheel", x: scroller.x, y: scroller.y, deltaX: 0, deltaY,
    });
    await sleep(300);
    return true;
  }

  /**
   * Opens Format visual -> Visual -> Bars -> Layout and scrolls until the
   * gap control is on screen.
   *
   * Layout's contents sit below the fold once Bars is expanded, so the pane
   * has to be scrolled; the control is then located by its own label rather
   * than by where the scroll happened to land.
   */
  async openSeriesGapControl() {
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
    await step("controlAt", "Bars", (c) => c.expanded === "true");
    await step("controlAt", "Layout", (c) => c.expanded === "true");

    // Scroll until the control is both present and on screen.
    for (let attempt = 0; attempt < 12; attempt++) {
      const control = await this.session.read("seriesGapControl");
      if (control && control.visible) return control;
      if (!(await this.scrollFormatPane(200))) break;
    }
    const final = await this.session.read("seriesGapControl");
    if (!final) throw new Error('could not find the "Space between series" control');
    return final;
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
      if (action.type === "setBaseTheme") await this.setBaseTheme(action.theme);
    }
    const current = await this.session.read("labState");
    current.baseTheme = await this.readBaseTheme();
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
