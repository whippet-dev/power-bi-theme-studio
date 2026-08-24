#!/usr/bin/env node
/**
 * Power BI Desktop native render probe — READ ONLY.
 *
 * Reads geometry and computed styles out of Power BI Desktop's own renderer
 * over the Chrome DevTools Protocol, so Theme Studio's previews can be
 * compared against the thing they imitate instead of against a screenshot
 * someone squinted at.
 *
 * It only reads. There is no click, no keystroke, no formatting change, no
 * save, and no way to pass it JavaScript from the command line: the payloads
 * it evaluates are the fixed functions in `SCRIPTS` below, all of which are
 * DOM queries. That restriction is deliberate — this attaches to an
 * application holding someone's unsaved work.
 *
 * Requires Power BI Desktop started with a debugging port; see README.md.
 * Nothing here launches, configures or modifies Power BI.
 *
 * Usage:
 *   node probe.mjs --list
 *   node probe.mjs --target reportView --inventory --out ./output
 *   node probe.mjs --target reportView --screenshot --out ./output
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_PORT = 9222;
const HOST = "127.0.0.1"; // Loopback only, always. Never bind or dial elsewhere.

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { port: DEFAULT_PORT, out: null, target: null, list: false, inventory: false, screenshot: false, env: false, discover: false, clipVisual: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") args.list = true;
    else if (arg === "--inventory") args.inventory = true;
    else if (arg === "--discover") args.discover = true;
    else if (arg === "--zoom") args.zoom = true;
    else if (arg === "--clip-visual") args.clipVisual = true;
    else if (arg === "--screenshot") args.screenshot = true;
    else if (arg === "--env") args.env = true;
    else if (arg === "--port") args.port = Number(argv[++i]);
    else if (arg === "--target") args.target = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`unknown argument ${arg}`);
  }
  return args;
}

const HELP = `Power BI Desktop native render probe (read-only)

  --list                 list CDP targets
  --target <substring>   choose a target by url or title, e.g. reportView
  --env                  report devicePixelRatio, viewport and zoom
  --discover             find the visual containers without assuming markup
  --zoom                 trace report scale from the drawing surface upward
  --inventory            inventory the report's SVG visuals
  --screenshot           capture the target as PNG
  --clip-visual          with --screenshot, crop to the cartesian visual
  --port <n>             CDP port (default ${DEFAULT_PORT})
  --out <dir>            write JSON/PNG here (default: no files, stdout only)

Power BI must already be running with --remote-debugging-port; see README.md.
`;

// ---------------------------------------------------------------------------
// CDP
// ---------------------------------------------------------------------------

async function listTargets(port) {
  const response = await fetch(`http://${HOST}:${port}/json/list`);
  if (!response.ok) throw new Error(`/json/list returned ${response.status}`);
  return response.json();
}

async function browserVersion(port) {
  const response = await fetch(`http://${HOST}:${port}/json/version`);
  if (!response.ok) throw new Error(`/json/version returned ${response.status}`);
  return response.json();
}

/** A minimal CDP session over one target's websocket. */
class Session {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }

  open() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url);
      this.socket.addEventListener("open", () => resolve());
      this.socket.addEventListener("error", () => reject(new Error(`could not open ${this.url}`)));
      this.socket.addEventListener("message", (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        const entry = this.pending.get(message.id);
        if (!entry) return; // an event rather than a reply; nothing here subscribes
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(`${message.error.message} (${message.error.code})`));
        else entry.resolve(message.result);
      });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 30_000);
    });
  }

  /**
   * Runs one of the fixed read-only payloads below. `Runtime.evaluate` is the
   * whole reason this stays a short file rather than a few hundred DOM.* and
   * CSS.* round trips, but it is also the dangerous door, so the expression
   * always comes from `SCRIPTS` and never from a caller.
   */
  async evaluate(name) {
    const expression = SCRIPTS[name];
    if (!expression) throw new Error(`no such read-only script: ${name}`);
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`page threw: ${result.exceptionDetails.text ?? "unknown"}`);
    }
    return result.result?.value;
  }

  close() {
    try {
      this.socket?.close();
    } catch {
      /* already gone */
    }
  }
}

// ---------------------------------------------------------------------------
// The read-only payloads. Every one is a DOM/CSSOM query and nothing else.
// ---------------------------------------------------------------------------

const SCRIPTS = {
  /**
   * Finds the visual containers without assuming a class name.
   *
   * Power BI's markup is not documented and its class names are not the
   * ones its bundle's source strings suggest, so this works from structure
   * instead: locate every <svg> that actually draws something, then walk up
   * to the ancestor that looks like one visual. That ancestor is reported
   * with its real tag and classes so later scripts can target it directly.
   */
  discover: `(() => {
    const num = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(3) : null);
    const svgs = [...document.querySelectorAll('svg')].filter((s) => {
      const r = s.getBoundingClientRect();
      return r.width > 20 && r.height > 20 && s.querySelector('rect, path, circle, line');
    });

    // The visual is the nearest ancestor that is much bigger than the svg's
    // plot yet still far smaller than the page: walk up recording the chain.
    const seen = new Map();
    for (const svg of svgs) {
      const chain = [];
      let node = svg;
      for (let i = 0; node && i < 12; i++) {
        const r = node.getBoundingClientRect();
        chain.push({
          depth: i,
          tag: node.tagName.toLowerCase(),
          cls: String(node.getAttribute && node.getAttribute('class') || '').slice(0, 90),
          id: node.id || null,
          rect: { x: num(r.x), y: num(r.y), w: num(r.width), h: num(r.height) },
        });
        node = node.parentElement;
      }
      const key = chain.map((c) => c.tag + '.' + c.cls).join(' > ');
      if (!seen.has(key)) seen.set(key, chain);
    }

    return {
      drawingSvgCount: svgs.length,
      chains: [...seen.values()],
      // Anything that smells like a container, for cross-checking.
      candidateSelectors: ['visual-container', '.visualContainer', '[class*="visual"]', '[class*="Container"]']
        .map((sel) => ({ sel, count: document.querySelectorAll(sel).length })),
    };
  })()`,

  /**
   * Which coordinate systems are in play. Power BI's own report zoom is an
   * ancestor transform, so a bounding rect is not in the visual's own units
   * and must not be compared with one until the scale is known.
   */
  environment: `(() => {
    const el = document.querySelector('visual-container, .visualContainer, [class*="visualContainer"]');
    let zoom = null;
    if (el) {
      let node = el, chain = [];
      while (node && node !== document.documentElement) {
        const t = getComputedStyle(node).transform;
        if (t && t !== 'none') chain.push({ tag: node.tagName.toLowerCase(), cls: String(node.className).slice(0, 60), transform: t });
        node = node.parentElement;
      }
      zoom = chain;
    }
    return {
      url: location.href,
      title: document.title,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      ancestorTransforms: zoom,
    };
  })()`,

  /**
   * Where the report's scale actually comes from.
   *
   * The visual is authored at one size, laid out at another, and draws in a
   * third set of units. Walking from the drawing surface up to the page
   * root and recording every transform and every size on the way is the
   * only way to know which number belongs to which system — guessing that
   * a ratio 'is the zoom' is how the two products get compared wrongly.
   */
  zoom: `(() => {
    const num = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(4) : null);
    const svg = document.querySelector('svg.cartesianChart');
    if (!svg) return { error: 'no svg.cartesianChart found' };
    const chain = [];
    let node = svg;
    for (let i = 0; node && i < 25; i++) {
      const cs = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      const entry = {
        depth: i,
        tag: node.tagName.toLowerCase(),
        cls: String((node.getAttribute && node.getAttribute('class')) || '').slice(0, 60),
        rect: { w: num(r.width), h: num(r.height) },
        cssWidth: cs.width,
        cssHeight: cs.height,
        transform: cs.transform === 'none' ? null : cs.transform,
        zoomProp: cs.zoom && cs.zoom !== 'normal' && cs.zoom !== '1' ? cs.zoom : null,
      };
      if (node.tagName.toLowerCase() === 'svg') {
        entry.attrWidth = node.getAttribute('width');
        entry.attrHeight = node.getAttribute('height');
        entry.viewBox = node.getAttribute('viewBox');
      }
      chain.push(entry);
      node = node.parentElement;
    }
    return {
      devicePixelRatio: window.devicePixelRatio,
      chain,
    };
  })()`,

  /**
   * The chart's own rectangle in page coordinates, for a clipped capture.
   * The innermost container that is still the whole visual: clipping to
   * the drawing surface alone would cut the axes off.
   */
  visualRect: `(() => {
    const el = [...document.querySelectorAll('[class*="visualContainer"]')]
      .filter((e) => e.querySelector('svg.cartesianChart'))
      .sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)[0];
    if (!el) return { error: 'no cartesian visual container found' };
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(3), y: +r.y.toFixed(3), width: +r.width.toFixed(3), height: +r.height.toFixed(3) };
  })()`,

  /** What visual containers exist, and what each one renders with. */
  inventory: `(() => {
    const sel = 'visual-container, .visualContainer, [class*="visualContainer"]';
    const containers = [...document.querySelectorAll(sel)];
    const seen = new Set();
    const out = [];
    for (const c of containers) {
      if (seen.has(c)) continue;
      seen.add(c);
      const r = c.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const svgs = [...c.querySelectorAll('svg')];
      const canvases = [...c.querySelectorAll('canvas')];
      const title = (c.querySelector('[class*="title"]')?.textContent || '').trim().slice(0, 60);
      out.push({
        cls: String(c.className).slice(0, 90),
        title,
        rect: { x: +r.x.toFixed(3), y: +r.y.toFixed(3), w: +r.width.toFixed(3), h: +r.height.toFixed(3) },
        svgCount: svgs.length,
        canvasCount: canvases.length,
        rectCount: c.querySelectorAll('svg rect').length,
        pathCount: c.querySelectorAll('svg path').length,
        textCount: c.querySelectorAll('svg text').length,
        tech: svgs.length && canvases.length ? 'mixed' : svgs.length ? 'svg' : canvases.length ? 'canvas' : 'html',
      });
    }
    return { containerCount: out.length, containers: out };
  })()`,

  /**
   * Full geometry of every SVG shape and text node in every visual, plus the
   * computed text styles. This is the actual oracle: Power BI's own numbers,
   * in its own coordinate systems, with both getBBox (user units) and
   * getBoundingClientRect (CSS px after every ancestor transform) recorded
   * separately so they are never conflated.
   */
  visuals: `(() => {
    const sel = 'visual-container, .visualContainer, [class*="visualContainer"]';
    const num = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(3) : null);
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: num(r.x), y: num(r.y), w: num(r.width), h: num(r.height) }; };
    const bbox = (el) => { try { const b = el.getBBox(); return { x: num(b.x), y: num(b.y), w: num(b.width), h: num(b.height) }; } catch { return null; } };

    const out = [];
    for (const c of document.querySelectorAll(sel)) {
      const cr = c.getBoundingClientRect();
      if (cr.width < 2 || cr.height < 2) continue;

      const svgs = [...c.querySelectorAll('svg')].map((svg) => ({
        viewBox: svg.getAttribute('viewBox'),
        width: svg.getAttribute('width'),
        height: svg.getAttribute('height'),
        cls: String(svg.getAttribute('class') || '').slice(0, 70),
        rect: box(svg),
      }));

      const shapes = [];
      for (const el of c.querySelectorAll('svg rect, svg path, svg line, svg circle')) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 0.05 && r.height < 0.05) continue;
        const d = el.getAttribute('d');
        shapes.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.getAttribute('class') || '').slice(0, 60),
          attrs: {
            x: el.getAttribute('x'), y: el.getAttribute('y'),
            width: el.getAttribute('width'), height: el.getAttribute('height'),
            x1: el.getAttribute('x1'), y1: el.getAttribute('y1'),
            x2: el.getAttribute('x2'), y2: el.getAttribute('y2'),
            d: d ? (d.length > 220 ? d.slice(0, 220) + '…' : d) : null,
          },
          transform: el.getAttribute('transform'),
          fill: cs.fill, stroke: cs.stroke, strokeWidth: cs.strokeWidth,
          opacity: cs.opacity, fillOpacity: cs.fillOpacity,
          shapeRendering: cs.shapeRendering,
          bbox: bbox(el),
          rect: box(el),
        });
      }

      const texts = [];
      // <text> and its <tspan> children both match a naive selector, and
      // textContent then reports the label twice. Take the outermost node.
      for (const el of c.querySelectorAll('svg text')) {
        const text = (el.textContent || '').trim();
        if (!text) continue;
        const cs = getComputedStyle(el);
        texts.push({
          text: text.slice(0, 40),
          cls: String(el.getAttribute('class') || '').slice(0, 60),
          fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
          fontStyle: cs.fontStyle, fill: cs.fill,
          textAnchor: cs.textAnchor,
          dominantBaseline: cs.dominantBaseline,
          transform: el.getAttribute('transform'),
          bbox: bbox(el),
          rect: box(el),
        });
      }

      // HTML text too: axis labels are not always SVG.
      const htmlTexts = [];
      for (const el of c.querySelectorAll('div, span')) {
        if (el.children.length) continue;
        const text = (el.textContent || '').trim();
        if (!text || text.length > 40) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const cs = getComputedStyle(el);
        htmlTexts.push({
          text,
          cls: String(el.className || '').slice(0, 60),
          fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color,
          rect: { x: num(r.x), y: num(r.y), w: num(r.width), h: num(r.height) },
        });
      }

      out.push({
        cls: String(c.className).slice(0, 90),
        rect: box(c),
        svgs,
        shapeCount: shapes.length,
        shapes: shapes.slice(0, 400),
        textCount: texts.length,
        texts: texts.slice(0, 200),
        htmlTextCount: htmlTexts.length,
        htmlTexts: htmlTexts.slice(0, 200),
      });
    }
    return { visualCount: out.length, visuals: out };
  })()`,
};

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || process.argv.length <= 2) {
    process.stdout.write(HELP);
    return;
  }

  const targets = await listTargets(args.port);
  const pages = targets.filter((t) => t.type === "page");

  if (args.list) {
    const version = await browserVersion(args.port);
    process.stdout.write(`browser: ${version.Browser}   protocol: ${version["Protocol-Version"]}\n`);
    process.stdout.write(`targets: ${targets.length} (${pages.length} pages)\n\n`);
    for (const t of targets) {
      process.stdout.write(`${t.type.padEnd(8)} ${String(t.title).slice(0, 52).padEnd(54)} ${t.url.slice(0, 70)}\n`);
    }
    if (args.out) await writeJson(args.out, "targets.json", targets);
    return;
  }

  if (!args.target) throw new Error("choose a target with --target, or use --list");
  const needle = args.target.toLowerCase();
  const chosen = pages.find((t) => t.url.toLowerCase().includes(needle) || String(t.title).toLowerCase().includes(needle));
  if (!chosen) throw new Error(`no page target matching ${JSON.stringify(args.target)}`);
  process.stdout.write(`target: ${chosen.title}\n        ${chosen.url}\n\n`);

  const session = new Session(chosen.webSocketDebuggerUrl);
  await session.open();
  try {
    if (args.env) {
      const environment = await session.evaluate("environment");
      process.stdout.write(`${JSON.stringify(environment, null, 2)}\n`);
      if (args.out) await writeJson(args.out, "environment.json", environment);
    }

    if (args.zoom) {
      const z = await session.evaluate("zoom");
      if (z.error) process.stdout.write(`${z.error}\n`);
      else {
        process.stdout.write(`devicePixelRatio ${z.devicePixelRatio}\n`);
        for (const n of z.chain) {
          const extra = [
            n.attrWidth ? `attr=${n.attrWidth}x${n.attrHeight}` : null,
            n.viewBox ? `viewBox=${n.viewBox}` : null,
            n.transform ? `transform=${n.transform}` : null,
            n.zoomProp ? `zoom=${n.zoomProp}` : null,
          ].filter(Boolean).join('  ');
          process.stdout.write(
            `  ${String(n.depth).padStart(2)} ${n.tag.padEnd(14)} rect ${String(n.rect.w).padStart(9)}x${String(n.rect.h).padEnd(9)} css ${String(n.cssWidth).padStart(9)}x${String(n.cssHeight).padEnd(9)} ${n.cls.padEnd(34)} ${extra}\n`,
          );
        }
      }
      if (args.out) await writeJson(args.out, "zoom.json", z);
    }

    if (args.discover) {
      const found = await session.evaluate("discover");
      process.stdout.write(`drawing svgs: ${found.drawingSvgCount}\n`);
      for (const c of found.candidateSelectors) {
        process.stdout.write(`  selector ${c.sel.padEnd(22)} matches ${c.count}\n`);
      }
      for (const [i, chain] of found.chains.entries()) {
        process.stdout.write(`\n  chain ${i}:\n`);
        for (const node of chain) {
          process.stdout.write(
            `    ${String(node.depth).padStart(2)} ${node.tag.padEnd(16)} ${node.rect.w}x${node.rect.h} @ ${node.rect.x},${node.rect.y}  ${node.cls}\n`,
          );
        }
      }
      if (args.out) await writeJson(args.out, "discover.json", found);
    }

    if (args.inventory) {
      const inventory = await session.evaluate("inventory");
      process.stdout.write(`visual containers: ${inventory.containerCount}\n`);
      for (const c of inventory.containers) {
        process.stdout.write(
          `  ${String(c.tech).padEnd(6)} ${c.rect.w}x${c.rect.h} @ ${c.rect.x},${c.rect.y}` +
            `  svg=${c.svgCount} rect=${c.rectCount} path=${c.pathCount} text=${c.textCount}` +
            (c.title ? `  "${c.title}"` : "") + "\n",
        );
      }
      const visuals = await session.evaluate("visuals");
      if (args.out) {
        await writeJson(args.out, "inventory.json", inventory);
        await writeJson(args.out, "visuals.json", visuals);
      }
      process.stdout.write(`\ndetailed geometry captured for ${visuals.visualCount} visual(s)\n`);
    }

    if (args.screenshot) {
      // Page.enable first: without it WebView2 accepts the call and never
      // answers, which looks like a permissions problem and is not one.
      await session.send("Page.enable");
      const metrics = await session.send("Page.getLayoutMetrics");
      const view = metrics.layoutViewport;
      console.log(`layout viewport: ${view.clientWidth}x${view.clientHeight}`);
      // Clip to the visual when asked: CDP crops for us, so nothing here has
      // to decode a PNG. `scale` stays 1 so the captured pixels are the ones
      // actually painted, report zoom included.
      let clip;
      if (args.clipVisual) {
        const rect = await session.evaluate("visualRect");
        if (rect.error) throw new Error(rect.error);
        clip = { ...rect, scale: 1 };
        console.log(`clip: ${clip.width}x${clip.height} @ ${clip.x},${clip.y}`);
      }
      const shot = await session.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
        ...(clip ? { clip } : {}),
      });
      const bytes = Buffer.from(shot.data, "base64");
      process.stdout.write(`screenshot: ${bytes.length} bytes\n`);
      if (args.out) {
        await mkdir(args.out, { recursive: true });
        const file = join(args.out, args.clipVisual ? "visual.png" : "screenshot.png");
        await writeFile(file, bytes);
        process.stdout.write(`wrote ${file}\n`);
      } else {
        process.stdout.write("(pass --out to save it)\n");
      }
    }
  } finally {
    session.close();
  }
}

async function writeJson(dir, name, value) {
  await mkdir(dir, { recursive: true });
  const file = join(dir, name);
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
  process.stdout.write(`wrote ${file}\n`);
}

main().catch((error) => {
  process.stderr.write(`probe failed: ${error.message}\n`);
  process.exitCode = 1;
});
