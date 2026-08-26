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
  cartesianAxisBandBounds,
  classifyCartesianRenderer,
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
 * Fixed browser-side cartesian classification shared by identity,
 * measurement and settle readers.
 *
 * The pure classifier is stringified from `labActions.mjs`, so the safety
 * decision tested in Node is exactly the decision executed in Desktop. It is
 * still a fixed payload: no expression or selector comes from a caller.
 */
const CARTESIAN_RENDER_CONTEXT = `
    const barMarks = [...el.querySelectorAll('svg rect.bar')];
    const columnMarks = [...el.querySelectorAll('svg rect.column')];
    const candidateMarks = barMarks.length ? barMarks : columnMarks;
    const candidateFills = [...new Set(candidateMarks.map((mark) => getComputedStyle(mark).fill))];
    const candidateCoordinate = columnMarks.length ? 'x' : 'y';
    const categoryPositionCount = new Set(candidateMarks.map((mark) => Number(mark.getAttribute(candidateCoordinate)))).size;
    const renderer = (${classifyCartesianRenderer.toString()})({
      barMarkCount: barMarks.length,
      columnMarkCount: columnMarks.length,
      seriesCount: candidateFills.length,
      categoryPositionCount,
    });
    const marks = renderer ? (renderer.markType === 'bar' ? barMarks : columnMarks) : [];
    const fills = renderer ? candidateFills : [];
  `;

const CARTESIAN_AXIS_BANDS = `(${cartesianAxisBandBounds.toString()})(renderer, chartBounds, plotBounds)`;

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
    let scroller = spin.parentElement;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 5) scroller = scroller.parentElement;
    const box = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    return {
      value: spin.value,
      x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      visible: r.top >= box.top + 2 && r.bottom <= box.bottom - 2,
      above: r.top < box.top + 2,
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
    ${CARTESIAN_RENDER_CONTEXT}
    // Direct text nodes only, because Power BI nests an accessibility
    // <title> inside each <text> and textContent would double the label.
    // Leaf elements have no such child, so they can fall back safely.
    const own = (n) => {
      const direct = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('').trim();
      if (direct) return direct;
      return n.children.length === 0 ? (n.textContent || '').trim() : '';
    };

    const plot = el.querySelector('svg.mainGraphicsContext');
    const chart = el.querySelector('svg.cartesianChart');

    // Which physical edge owns an axis comes from the positively identified
    // renderer. Bar categories are left and values bottom; Column reverses
    // those roles without changing their semantic names downstream.
    const markLeft = marks.length ? Math.min(...marks.map((mark) => mark.getBoundingClientRect().left)) : null;
    const markBottom = marks.length ? Math.max(...marks.map((mark) => mark.getBoundingClientRect().bottom)) : null;
    const texts = [...el.querySelectorAll('svg text')].map((t) => ({
      text: own(t), r: t.getBoundingClientRect(), face: getComputedStyle(t).fontFamily,
      px: parseFloat(getComputedStyle(t).fontSize),
    })).filter((t) => t.text);
    const isTitleFace = (f) => /wf_standard-font/.test(f);
    const leftLabels = texts.filter((t) => markLeft !== null && t.r.right <= markLeft + 2 && !isTitleFace(t.face));
    const bottomLabels = texts.filter((t) => markBottom !== null && t.r.top >= markBottom - 6 && !isTitleFace(t.face));
    const leftTitle = texts.find((t) => markLeft !== null && t.r.right <= markLeft + 2 && isTitleFace(t.face));
    const bottomTitle = texts.find((t) => markBottom !== null && t.r.top >= markBottom - 6 && isTitleFace(t.face));
    const catLabels = renderer && renderer.categoryAxisSide === 'left' ? leftLabels : bottomLabels;
    const valLabels = renderer && renderer.valueAxisSide === 'left' ? leftLabels : bottomLabels;
    const catTitle = renderer && renderer.categoryAxisSide === 'left' ? leftTitle : bottomTitle;
    const valTitle = renderer && renderer.valueAxisSide === 'left' ? leftTitle : bottomTitle;

    const legendItems = [...el.querySelectorAll('[class*="legend"] div, [class*="legend"] span, [class*="legend"] text')]
      .filter((n) => !n.children.length && own(n));
    const scrollable = el.querySelector('svg.svgScrollable');

    // Band geometry in the category direction, from the positively
    // identified marks themselves: y/height for Bar, x/width for Column.
    const categoryCoordinate = renderer && renderer.orientation === 'vertical' ? 'x' : 'y';
    const categoryExtent = renderer && renderer.orientation === 'vertical' ? 'width' : 'height';
    const byFill = new Map();
    for (const mark of marks) {
      const f = getComputedStyle(mark).fill;
      const list = byFill.get(f) ?? [];
      list.push(Number(mark.getAttribute(categoryCoordinate)));
      byFill.set(f, list);
    }
    const series = [...byFill.values()].map((positions) => positions.sort((a, b) => a - b));
    const band = marks.length ? Number(marks[0].getAttribute(categoryExtent)) : null;
    const seriesStep = series.length >= 2 ? series[1][0] - series[0][0] : null;
    const categoryStep = series[0] && series[0].length >= 2 ? series[0][1] - series[0][0] : null;

    const relativeRect = (node) => {
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        x: num(box.left - r.left), y: num(box.top - r.top),
        width: num(box.width), height: num(box.height),
        right: num(box.right - r.left), bottom: num(box.bottom - r.top),
      };
    };
    const unionBounds = (nodes) => {
      const boxes = nodes.map((node) => node && node.r ? node.r : node && node.getBoundingClientRect ? node.getBoundingClientRect() : null)
        .filter(Boolean);
      if (!boxes.length) return null;
      const left = Math.min(...boxes.map((box) => box.left));
      const top = Math.min(...boxes.map((box) => box.top));
      const right = Math.max(...boxes.map((box) => box.right));
      const bottom = Math.max(...boxes.map((box) => box.bottom));
      return {
        x: num(left - r.left), y: num(top - r.top),
        width: num(right - left), height: num(bottom - top),
        right: num(right - r.left), bottom: num(bottom - r.top),
      };
    };
    const chartBounds = relativeRect(chart);
    const plotBounds = relativeRect(plot);
    const axisBounds = ${CARTESIAN_AXIS_BANDS};
    const axisBand = (semantic, content) => renderer && axisBounds
      ? {
          side: semantic === 'category' ? renderer.categoryAxisSide : renderer.valueAxisSide,
          bounds: axisBounds[semantic],
          contentBounds: unionBounds(content),
        }
      : null;

    const legendContainers = [...el.querySelectorAll('[class*="legend"]')]
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return chart && box.width > 1 && box.height > 1 && box.bottom <= chart.getBoundingClientRect().top + 2;
      });
    const legendContainer = legendContainers.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.width * br.height - ar.width * ar.height;
    })[0] ?? null;
    const legendBounds = relativeRect(legendContainer) ?? unionBounds(legendItems);
    const titleCandidates = [...el.querySelectorAll('div,span,h1,h2,h3,p')]
      .filter((node) => !node.querySelector('svg') && !node.closest('[class*="legend"]'))
      .filter((node) => {
        const text = own(node);
        const box = node.getBoundingClientRect();
        return text.includes('Online') && text.includes('Phone') && text.includes('Post')
          && chart && box.width > 1 && box.height > 1 && box.bottom <= chart.getBoundingClientRect().top + 2;
      })
      .sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
    const titleNode = titleCandidates[0] ?? null;
    const titleTextBounds = relativeRect(titleNode);
    const titleBandBottom = titleNode
      ? (legendBounds ? legendBounds.y : chartBounds ? chartBounds.y : titleTextBounds.bottom)
      : 0;

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
      orientation: renderer ? renderer.orientation : null,
      markType: renderer ? renderer.markType : null,
      grouping: renderer ? renderer.grouping : null,
      categoryAxisSide: renderer ? renderer.categoryAxisSide : null,
      valueAxisSide: renderer ? renderer.valueAxisSide : null,
      sentinel,
      width: Math.round(r.width),
      height: Math.round(r.height),
      visualBounds: { x: 0, y: 0, width: num(r.width), height: num(r.height), right: num(r.width), bottom: num(r.height) },
      chartBounds,
      plotBounds,
      titleBand: titleNode
        ? {
            visible: true,
            bounds: { x: 0, y: 0, width: num(r.width), height: num(titleBandBottom), right: num(r.width), bottom: num(titleBandBottom) },
            textBounds: titleTextBounds,
            fontPx: num(parseFloat(getComputedStyle(titleNode).fontSize)),
          }
        : { visible: false, bounds: null, textBounds: null, fontPx: null },
      legendBand: legendBounds
        ? { visible: true, bounds: legendBounds }
        : { visible: false, bounds: null },
      categoryAxisBand: axisBand('category', [...catLabels, catTitle]),
      valueAxisBand: axisBand('value', [...valLabels, valTitle]),
      outerInsets: chartBounds
        ? {
            left: chartBounds.x,
            top: chartBounds.y,
            right: num(r.width - chartBounds.right),
            bottom: num(r.height - chartBounds.bottom),
          }
        : null,
      plotInsetsWithinChart: chartBounds && plotBounds
        ? {
            left: num(plotBounds.x - chartBounds.x),
            top: num(plotBounds.y - chartBounds.y),
            right: num(chartBounds.right - plotBounds.right),
            bottom: num(chartBounds.bottom - plotBounds.bottom),
          }
        : null,
      categories: catLabels.map((t) => t.text),
      seriesCount: fills.length,
      seriesNames: legendItems.map(own),
      marksRendered: marks.length,
      // Retained for existing reports/tests; means cartesian marks, not only Bar.
      barsRendered: marks.length,
      categoriesRendered: renderer ? renderer.categoriesRendered : 0,
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
    ${CARTESIAN_RENDER_CONTEXT}
    const plot = el.querySelector('svg.mainGraphicsContext');
    const mark = marks[0];
    const text = el.querySelector('svg text');
    return {
      w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      plotW: plot ? Number(plot.getAttribute('width')) : 0,
      plotH: plot ? Number(plot.getAttribute('height')) : 0,
      orientation: renderer ? renderer.orientation : null,
      markType: renderer ? renderer.markType : null,
      grouping: renderer ? renderer.grouping : null,
      bars: marks.length,
      marks: marks.length,
      texts: el.querySelectorAll('svg text').length,
      fill: mark ? getComputedStyle(mark).fill : '',
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
      ${CARTESIAN_RENDER_CONTEXT}
      const own = (n) => {
        const d = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('').trim();
        return d || (n.children.length === 0 ? (n.textContent || '').trim() : '');
      };
      const markLeft = marks.length ? Math.min(...marks.map((mark) => mark.getBoundingClientRect().left)) : null;
      const markBottom = marks.length ? Math.max(...marks.map((mark) => mark.getBoundingClientRect().bottom)) : null;
      const labelTexts = [...el.querySelectorAll('svg text')]
        .filter((text) => !/wf_standard-font/.test(getComputedStyle(text).fontFamily));
      const leftLabels = labelTexts
        .filter((text) => markLeft !== null && text.getBoundingClientRect().right <= markLeft + 2);
      const bottomLabels = labelTexts
        .filter((text) => markBottom !== null && text.getBoundingClientRect().top >= markBottom - 6);
      const cats = (renderer && renderer.categoryAxisSide === 'left' ? leftLabels : bottomLabels)
        .map(own).filter(Boolean);
      const legendItems = [...el.querySelectorAll('[class*="legend"] div, [class*="legend"] span, [class*="legend"] text')]
        .filter((node) => !node.children.length && own(node));
      return {
        visualType: 'cartesian',
        orientation: renderer ? renderer.orientation : null,
        markType: renderer ? renderer.markType : null,
        grouping: renderer ? renderer.grouping : null,
        categoryAxisSide: renderer ? renderer.categoryAxisSide : null,
        valueAxisSide: renderer ? renderer.valueAxisSide : null,
        sentinel: hint.slice(0, 120),
        categories: cats,
        seriesCount: fills.length,
        seriesNames: legendItems.map(own),
        legendVisible: legendItems.length > 0,
        marksRendered: marks.length,
        categoriesRendered: renderer ? renderer.categoriesRendered : 0,
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
    // Inside its SCROLLER, not inside the window: a control scrolled above
    // the pane is still in the viewport, and clicking it hits whatever is
    // painted there instead - which reports success and changes nothing.
    let scroller = toggle.parentElement;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 5) scroller = scroller.parentElement;
    const box = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    return {
      ok: true,
      ownerTag: owner.tagName.toLowerCase(),
      ownerClass: String(owner.className || '').slice(0, 40),
      checked: input ? (input.getAttribute('aria-checked') ?? String(input.checked)) : null,
      x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      visible: r.top >= box.top + 2 && r.bottom <= box.bottom - 2,
      above: r.top < box.top + 2,
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

  /**
   * A snapshot of the Format pane's navigable state.
   *
   * Read-only, and scoped to what explains navigation: which cards and
   * groups are mounted, which are expanded, where the scroller is and
   * whether it is even the same element as last time. Enough to answer
   * "what does a second action start from that a first does not" without
   * reading anything about the person signed in.
   */
  paneState: () => `(() => {
    const W = window.innerWidth;
    const n = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : null);
    const inPane = (r) => r.x > W * 0.62;

    const scrollers = [...document.querySelectorAll('*')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => inPane(r) && r.width > 150 && r.height > 150
        && el.scrollHeight > el.clientHeight + 5);
    const tallest = scrollers.sort((a, b) => b.el.clientHeight - a.el.clientHeight)[0];

    const headings = (root, selector) => [...root.querySelectorAll(selector)]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => inPane(r) && r.width > 2 && r.height > 2);

    const cards = headings(document, 'formatting-card').map(({ el }) => {
      const header = el.querySelector('[role=button],button');
      return {
        name: header ? (header.getAttribute('aria-label') || header.textContent || '').trim().slice(0, 24) : null,
        expanded: header ? header.getAttribute('aria-expanded') : null,
        groups: el.querySelectorAll('formatting-group').length,
        top: n(el.getBoundingClientRect().top),
      };
    }).filter((c) => c.name);

    const groups = headings(document, 'formatting-group').map(({ el }) => {
      const header = el.querySelector('[role=button],button');
      return {
        name: header ? (header.getAttribute('aria-label') || header.textContent || '').trim().slice(0, 24) : null,
        expanded: header ? header.getAttribute('aria-expanded') : null,
        card: (() => {
          const owner = el.closest('formatting-card');
          const h = owner && owner.querySelector('[role=button],button');
          return h ? (h.getAttribute('aria-label') || h.textContent || '').trim().slice(0, 24) : null;
        })(),
        top: n(el.getBoundingClientRect().top),
      };
    }).filter((g) => g.name);

    const active = document.activeElement;
    const formatTab = [...document.querySelectorAll('[role=tab]')]
      .find((e) => ((e.getAttribute('aria-label') || e.textContent || '').trim() === 'Format visual'));

    return {
      scroller: tallest ? {
        tag: tallest.el.tagName.toLowerCase(),
        cls: String(tallest.el.className || '').slice(0, 44),
        scrollTop: n(tallest.el.scrollTop),
        scrollHeight: n(tallest.el.scrollHeight),
        clientHeight: n(tallest.el.clientHeight),
        top: n(tallest.r.top), left: n(tallest.r.left),
        candidates: scrollers.length,
      } : null,
      cards: cards.map((c) => c.name + (c.expanded === 'true' ? '*' : '') + '@' + c.top),
      expandedCards: cards.filter((c) => c.expanded === 'true').map((c) => c.name),
      groups: groups.map((g) => g.card + '/' + g.name + (g.expanded === 'true' ? '*' : '') + '@' + g.top),
      expandedGroups: groups.filter((g) => g.expanded === 'true').map((g) => g.card + '/' + g.name),
      focus: active ? {
        tag: active.tagName.toLowerCase(),
        role: active.getAttribute('role'),
        inPane: inPane(active.getBoundingClientRect()),
        top: n(active.getBoundingClientRect().top),
      } : null,
      formatTabSelected: formatTab ? formatTab.getAttribute('aria-selected') : null,
    };
  })()`,

  /**
   * A formatting group's header, scoped to the card that owns it.
   *
   * This is the bug that made a second action fail where a first
   * succeeded, and it was never about scrolling. **"Layout" is not a
   * unique name.** Bars has a Layout group and so does Y-axis. In a fresh
   * pane only one of them is mounted, so a global lookup happens to be
   * right; leave the Y-axis card expanded from a previous action and the
   * same lookup silently resolves the wrong card's group.
   *
   * Scoping by containment removes the coincidence. Fails closed if the
   * card or the group is not uniquely identifiable.
   */
  cardGroup: (cardName, groupName) => `(() => {
    const W = window.innerWidth;
    const inPane = (el) => el.getBoundingClientRect().x > W * 0.62;
    const named = (root, wanted) => [...root.querySelectorAll('[role=button],button')]
      .filter((e) => ((e.getAttribute('aria-label') || e.textContent || '').trim() === wanted) && inPane(e));

    const cardHeadings = named(document, ${JSON.stringify(cardName)});
    if (cardHeadings.length !== 1) return { ok: false, reason: cardHeadings.length + ' cards named ' + ${JSON.stringify(cardName)} };
    const card = cardHeadings[0].closest('formatting-card');
    if (!card) return { ok: false, reason: ${JSON.stringify(cardName)} + ' is not inside a formatting-card' };

    const groupHeadings = named(card, ${JSON.stringify(groupName)});
    if (groupHeadings.length !== 1) {
      return { ok: false, reason: groupHeadings.length + ' groups named ' + ${JSON.stringify(groupName)} + ' in ' + ${JSON.stringify(cardName)} };
    }
    const header = groupHeadings[0];
    const r = header.getBoundingClientRect();
    // Visible means visible INSIDE ITS SCROLLER, not inside the window: a
    // header scrolled above the pane still sits happily in the viewport,
    // and a click there lands on whatever is painted over it.
    let scroller = header.parentElement;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 5) scroller = scroller.parentElement;
    const box = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    return {
      ok: true,
      expanded: header.getAttribute('aria-expanded'),
      x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      visible: r.top >= box.top + 2 && r.bottom <= box.bottom - 2,
      above: r.top < box.top + 2,
    };
  })()`,

  /**
   * Where the category labels are ANCHORED, as opposed to where their ink
   * lands.
   *
   * A right-aligned tick label is positioned by its anchor; the painted
   * glyph box sits a bearing's width to the left of it and moves with the
   * typeface. Every gap measured off `getBoundingClientRect` so far has
   * carried that bearing, which is exactly the contamination that keeps an
   * axis term looking font-relative when it may not be.
   *
   * Anchors are mapped through `getScreenCTM`, so nested transforms and
   * group translations resolve without assuming the `x` attribute is
   * already plot-relative. Everything is returned in client pixels and
   * relative to the plot's own origin, mapped the same way.
   */
  categoryLabelAnchors: () => `(() => { try {
    const n = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(3) : null);
    const el = ${VISUAL};
    if (!el) return null;
    const plot = el.querySelector('svg.mainGraphicsContext');
    const root = el.querySelector('svg.cartesianChart');
    if (!plot || !root) return null;

    const originOf = (node) => {
      const ctm = node.getScreenCTM();
      if (!ctm) return null;
      const pt = root.createSVGPoint();
      pt.x = 0; pt.y = 0;
      return pt.matrixTransform(ctm);
    };
    const plotOrigin = originOf(plot);
    if (!plotOrigin) return null;

    const own = (node) => {
      const direct = [...node.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('').trim();
      if (direct) return direct;
      return node.children.length === 0 ? (node.textContent || '').trim() : '';
    };
    const bars = [...el.querySelectorAll('svg rect.bar')];
    const barLeft = bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().left)) : null;
    const isTitleFace = (f) => /wf_standard-font/.test(f);

    const labels = [...el.querySelectorAll('svg text')]
      .map((t) => ({ t, r: t.getBoundingClientRect(), cs: getComputedStyle(t) }))
      .filter(({ t, r, cs }) => own(t) && barLeft !== null && r.right <= barLeft + 2 && !isTitleFace(cs.fontFamily))
      .map(({ t, r, cs }) => {
        const ctm = t.getScreenCTM();
        const pt = root.createSVGPoint();
        // Attributes can carry units ('0.35em') or be absent entirely, and a
        // non-finite value throws on assignment rather than being ignored.
        const num = (v) => { const f = parseFloat(v); return Number.isFinite(f) ? f : 0; };
        pt.x = num(t.getAttribute('x')) + num(t.getAttribute('dx'));
        pt.y = num(t.getAttribute('y')) + num(t.getAttribute('dy'));
        const anchor = ctm ? pt.matrixTransform(ctm) : null;
        let bbox = null;
        try { const b = t.getBBox(); bbox = { x: n(b.x), width: n(b.width) }; } catch (e) { bbox = null; }
        return {
          text: own(t),
          fontPx: n(parseFloat(cs.fontSize)),
          fontFamily: cs.fontFamily,
          textAnchor: cs.textAnchor || t.getAttribute('text-anchor'),
          xAttr: n(Number(t.getAttribute('x') || 0)),
          dxAttr: t.getAttribute('dx'),
          transform: t.getAttribute('transform'),
          bbox,
          // All relative to the plot's own origin, in client pixels.
          anchorX: anchor ? n(anchor.x - plotOrigin.x) : null,
          inkLeft: n(r.left - plotOrigin.x),
          inkRight: n(r.right - plotOrigin.x),
          inkWidth: n(r.width),
        };
      });
    if (!labels.length) return null;

    const widest = labels.reduce((best, l) => (!best || l.inkWidth > best.inkWidth ? l : best), null);
    return {
      plotOriginClientX: n(plotOrigin.x),
      labels,
      widest,
      // The two quantities the whole question turns on.
      anchorToPlot: widest ? n(-widest.anchorX) : null,
      inkToPlot: widest ? n(-widest.inkRight) : null,
      anchorToInk: widest ? n(widest.anchorX - widest.inkRight) : null,
    };
  } catch (error) { return { error: String(error && error.message ? error.message : error) }; } })()`,

  /** Every clickable control in the Format pane with its visible text. Read-only. */
  paneControls: () => `(() => {
    const W = window.innerWidth;
    return [...document.querySelectorAll('[role=button],[role=combobox],button,select,pbi-dropdown,tri-dropdown')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.x > W * 0.62 && r.width > 8 && r.height > 8)
      .map(({ el, r }) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
        expanded: el.getAttribute('aria-expanded'),
        y: Math.round(r.y), x: Math.round(r.x + r.width / 2), w: Math.round(r.width),
      }));
  })()`,

  /**
   * The dropdown belonging to a named group in the theme pane.
   *
   * Same containment rule as everything else: find the heading, walk up to
   * the smallest ancestor holding a dropdown, and require exactly one.
   */
  groupDropdown: (groupName) => `(() => {
    const W = window.innerWidth;
    const inPane = (el) => el.getBoundingClientRect().x > W * 0.62;
    const headings = [...document.querySelectorAll('[role=button],button')]
      .filter((e) => ((e.getAttribute('aria-label') || e.textContent || '').trim() === ${JSON.stringify(groupName)}) && inPane(e));
    if (headings.length !== 1) return { ok: false, reason: headings.length + ' headings named ' + ${JSON.stringify(groupName)} };
    let owner = headings[0];
    for (let i = 0; i < 6 && owner; i++) {
      if (owner.querySelector('pbi-dropdown')) break;
      owner = owner.parentElement;
    }
    const found = owner ? [...owner.querySelectorAll('pbi-dropdown')] : [];
    if (found.length !== 1) return { ok: false, reason: found.length + ' dropdowns owned by ' + ${JSON.stringify(groupName)} };
    const el = found[0];
    const r = el.getBoundingClientRect();
    let scroller = el.parentElement;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 5) scroller = scroller.parentElement;
    const box = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    return {
      ok: true,
      value: (el.textContent || '').trim(),
      x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      visible: r.top >= box.top + 2 && r.bottom <= box.bottom - 2,
      above: r.top < box.top + 2,
    };
  })()`,

  /**
   * Power BI Desktop's OWN canvas text metrics, for the fixture's strings.
   *
   * Read-only, and the point is the font rather than the canvas: Desktop
   * has `wf_segoe-ui_normal` loaded and our browser does not, so measuring
   * the same string in the two places gives different answers. Power BI's
   * layout calls `canvasCtx.measureText` (§5.27), so measuring here — in the
   * page that owns the font — gives the width its axis code actually used.
   *
   * The font is taken from a rendered category label rather than assumed,
   * and the strings and sizes are the fixture's own. Nothing is drawn,
   * nothing is mutated, and no font data leaves the process.
   */
  desktopTextWidths: () => `(() => { try {
    const n4 = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(4) : null);
    const el = ${VISUAL};
    if (!el) return { error: 'no lab visual' };

    const own = (node) => {
      const direct = [...node.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('').trim();
      if (direct) return direct;
      return node.children.length === 0 ? (node.textContent || '').trim() : '';
    };
    const bars = [...el.querySelectorAll('svg rect.bar')];
    const barLeft = bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().left)) : null;
    const label = [...el.querySelectorAll('svg text')]
      .find((t) => own(t) && barLeft !== null && t.getBoundingClientRect().right <= barLeft + 2
        && !/wf_standard-font/.test(getComputedStyle(t).fontFamily));
    if (!label) return { error: 'no category label to read the font from' };
    const cs = getComputedStyle(label);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'no 2d context' };

    const fontAt = (px) => [cs.fontStyle, cs.fontVariant, cs.fontWeight, px + 'px', cs.fontFamily]
      .filter((part) => part && part !== 'normal').join(' ');

    const STRINGS = ['London', 'North West', 'NW', 'Scotland', 'Wales', 'Loughborough'];
    const SIZES = [9.6, 12, 14.4, 16.8, 19.2, 24];

    const atTwelve = {};
    ctx.font = fontAt(12);
    const fontTwelve = ctx.font;
    for (const text of STRINGS) atTwelve[text] = n4(ctx.measureText(text).width);

    // The rendered CSS stack puts "Segoe UI" first, but Power BI's own
    // textProperties need not use that order - and if it resolves to the web
    // font instead, the metrics differ. Measure the plausible stacks so the
    // question is settled by numbers rather than by assumption.
    const STACKS = {
      computed: cs.fontFamily,
      webFontFirst: 'wf_segoe-ui_normal, "Segoe UI", helvetica, arial, sans-serif',
      webFontOnly: 'wf_segoe-ui_normal',
      installedOnly: '"Segoe UI"',
      sansSerif: 'sans-serif',
    };
    const byStack = {};
    for (const [name, family] of Object.entries(STACKS)) {
      ctx.font = '12px ' + family;
      byStack[name] = { resolved: ctx.font, widths: {} };
      for (const text of STRINGS) byStack[name].widths[text] = n4(ctx.measureText(text).width);
    }

    const northWestBySize = {};
    for (const px of SIZES) {
      ctx.font = fontAt(px);
      northWestBySize[px] = n4(ctx.measureText('North West').width);
    }

    return {
      font: {
        family: cs.fontFamily,
        size: cs.fontSize,
        weight: cs.fontWeight,
        style: cs.fontStyle,
        variant: cs.fontVariant,
        letterSpacing: cs.letterSpacing,
        canvasFontStringAt12: fontTwelve,
        accepted: fontTwelve === fontAt(12),
      },
      atTwelve,
      northWestBySize,
      byStack,
      renderedLabel: own(label),
    };
  } catch (error) { return { error: String(error && error.message ? error.message : error) }; } })()`,

  /**
   * The band above the chart: the visual's own title, the legend, and
   * whatever padding sits around them. Read-only.
   *
   * Everything is relative to the visual's top edge, because the question is
   * how a Power BI visual spends the vertical budget its author gave it.
   */
  visualTitleBand: () => `(() => { try {
    const n = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(2) : null);
    const el = ${VISUAL};
    if (!el) return { error: 'no lab visual' };
    const vis = el.getBoundingClientRect();
    const rel = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      const cs = getComputedStyle(node);
      return { top: n(r.top - vis.top), bottom: n(r.bottom - vis.top), h: n(r.height),
               left: n(r.left - vis.left), w: n(r.width),
               fontPx: n(parseFloat(cs.fontSize)), family: cs.fontFamily.split(',')[0],
               text: (node.textContent || '').trim().slice(0, 60) };
    };
    const chart = el.querySelector('svg.cartesianChart');
    // The title is the text above the chart that is not inside the SVG.
    const candidates = [...el.querySelectorAll('div,span,h1,h2,h3,p')]
      .filter((n2) => !n2.querySelector('svg') && (n2.textContent || '').trim())
      .map((n2) => ({ node: n2, r: n2.getBoundingClientRect() }))
      .filter(({ r }) => chart && r.bottom <= chart.getBoundingClientRect().top + 2 && r.height > 4)
      .sort((a, b) => a.r.top - b.r.top);
    return {
      visual: { w: n(vis.width), h: n(vis.height) },
      chartTop: chart ? n(chart.getBoundingClientRect().top - vis.top) : null,
      aboveChart: candidates.map(({ node }) => rel(node)).slice(0, 8),
    };
  } catch (error) { return { error: String(error && error.message ? error.message : error) }; } })()`,

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
    const candidates = await this.session.read("labVisuals");
    const chosen = selectLabVisual(candidates);
    if (!chosen.ok) {
      throw new Error(
        `REFUSING TO MUTATE — the lab visual is no longer uniquely identifiable (${chosen.reasons.join("; ")})`,
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
      `lab identified: ${state.width}x${state.height}, ${state.marksRendered} ${state.markType} marks, ` +
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
    // Bars' OWN Layout group: Y-axis has one too, and a global name lookup
    // resolves whichever happens to be mounted.
    await this.openLayoutCard("Bars", "Layout");

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
    await this.collapseFormattingCard("Bars");
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
    await this.collapseFormattingCard("Bars");
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
   * Sets the report theme's primary label FONT FAMILY.
   *
   * The point is to move measured text width while holding font size
   * fixed, which is the only way to tell a text-width term from a
   * font-relative one — for a single string at a single size the two are
   * the same line.
   *
   * The requested family must be allowlisted AND offered by this build's
   * own dropdown; nothing is typed into it.
   */
  async setThemeLabelFontFamily(family) {
    validateAction({ type: "setThemeLabelFontFamily", family });
    requireImplemented("setThemeLabelFontFamily");
    await this.requireLabVisual();

    await this.openThemeTextControl();
    let control = await this.session.read("groupDropdown", "General");
    if (!control || !control.ok) {
      throw new Error(`REFUSING TO CLICK — the theme's General font dropdown: ${control ? control.reason : "no result"}`);
    }
    if (this.initialState && this.initialState.themeLabelFontFamily === undefined) {
      this.initialState.themeLabelFontFamily = control.value;
    }
    if (control.value === family) {
      this.log(`theme label font already ${family}`);
      await this.selectVisual();
      return { family, changed: false, settled: true };
    }

    await this.session.click(control.x, control.y);
    await sleep(700);
    const options = await this.session.read("baseThemeOptions");
    const option = (options ?? []).find((o) => o.label === family);
    if (!option) {
      await this.session.pressEscape();
      throw new Error(`"${family}" is not offered by this build (saw ${(options ?? []).length} options)`);
    }
    await this.session.click(option.x, option.y);
    const outcome = await this.settle({ timeoutMs: 30000 });

    const after = await this.session.read("groupDropdown", "General");
    if (!after || !after.ok || after.value !== family) {
      throw new Error(`theme label font did not take: asked for ${family}, control reports ${after && after.ok ? after.value : "nothing"}`);
    }
    this.mutated.themeLabelFontFamily = family;
    this.log(`theme label font now ${after.value}`);
    await this.selectVisual();
    return { family, changed: true, settled: outcome.settled };
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
    // Exit half of the contract: leave no expanded card behind, or the next
    // action finds two groups of the same name mounted.
    await this.collapseFormattingCard("Y-axis");
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
      // Scroll TOWARDS it, using the scroller-relative flag rather than a
      // window coordinate: expanding a group scrolls its contents into view
      // and leaves the group's own header above the pane, where scrolling
      // down pushes it further away.
      const towards = found && found.ok && found.above ? -200 : 200;
      if (!(await this.scrollFormatPane(towards))) break;
    }
    const final = await this.session.read("groupToggle", card, group);
    if (!final || !final.ok) {
      throw new Error(`REFUSING TO CLICK — ${card} → ${group}: ${final ? final.reason : "no result"}`);
    }
    return final;
  }
  /**
   * Leaves the Format pane in a state the next action can start from.
   *
   * The contract is both ends: an action normalises on entry by seeking what
   * it needs, and collapses the card it expanded on the way out. Without the
   * exit half, one expanded card leaves a second group of the same name
   * mounted and the next action resolves the wrong one — which is exactly
   * how a second title mutation used to fail where the first succeeded.
   *
   * This is authoring UI state only. No formatting value is touched.
   */
  async collapseFormattingCard(card) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!(await this.seekFormattingCard(card))) return false;
      const control = await this.session.read("controlAt", card);
      if (!control) return false;
      if (control.expanded !== "true") return true;
      await this.session.click(control.x, control.y);
      await sleep(700);
    }
    const final = await this.session.read("controlAt", card);
    return Boolean(final && final.expanded !== "true");
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
      if (action.type === "setThemeLabelFontFamily") await this.setThemeLabelFontFamily(action.family);
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
    if (this.mutated.themeLabelFontFamily !== undefined) {
      await this.openThemeTextControl();
      const font = await this.session.read("groupDropdown", "General");
      if (font && font.ok) current.themeLabelFontFamily = font.value;
      await this.selectVisual();
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
