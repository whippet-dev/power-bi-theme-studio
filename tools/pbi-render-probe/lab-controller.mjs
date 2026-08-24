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
 * No save. No delete. No data edit. No theme switching (see README — the
 * theme gallery was not reliably verifiable). No arbitrary evaluation.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  identifyLabEnvironment,
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

  close() {
    try { this.socket?.close(); } catch { /* already gone */ }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Fixed payloads — reads and UI lookups only
// ---------------------------------------------------------------------------

const VISUAL = `[...document.querySelectorAll('[class*="visualContainer"]')]
  .filter((e) => e.querySelector('svg.cartesianChart'))
  .sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)[0]`;

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

    return {
      visualType: 'cartesian',
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

  /** Just the numbers the settle loop watches. */
  geometry: () => `(() => {
    const el = ${VISUAL};
    if (!el) return {};
    const r = el.getBoundingClientRect();
    const plot = el.querySelector('svg.mainGraphicsContext');
    return {
      w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      plotW: plot ? Number(plot.getAttribute('width')) : 0,
      plotH: plot ? Number(plot.getAttribute('height')) : 0,
      bars: el.querySelectorAll('svg rect.bar').length,
    };
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

  log(message) {
    if (this.verbose) console.log(message);
  }

  async open() {
    await this.session.open();
    const state = await this.session.read("labState");
    const check = identifyLabEnvironment(state);
    if (!check.ok) {
      this.session.close();
      throw new Error(
        `REFUSING TO MUTATE — this is not the synthetic lab visual:\n  ${check.reasons.join("\n  ")}`,
      );
    }
    this.initialState = state;
    this.log(`lab identified: ${state.width}x${state.height}, ${state.barsRendered} bars, palette ${state.palette.join(" ")}`);
    return state;
  }

  /** Selects the visual and opens General → Properties, verifying each step. */
  async openSizeControls() {
    const selection = await this.session.read("selection");
    if (!selection.selected) {
      await this.session.click(selection.x, selection.y);
      const after = await this.session.read("selection");
      if (!after.selected) throw new Error("could not select the lab visual");
    }
    for (const [label, check] of [
      ["Format visual", (c) => c.selected === "true"],
      ["General", () => true],
      ["Properties", (c) => c.expanded === "true"],
    ]) {
      const control = await this.session.read("controlAt", label);
      if (!control) throw new Error(`could not find the "${label}" control`);
      if (!check(control)) {
        await this.session.click(control.x, control.y);
        await sleep(600);
      }
    }
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

  async setVisualSize(width, height) {
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
    }
    const current = await this.session.read("labState");
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
