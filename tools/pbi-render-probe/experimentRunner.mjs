#!/usr/bin/env node
/**
 * Runs a declarative experiment matrix against Power BI Desktop, unattended.
 *
 * The point of the whole lab: start a sweep, walk away, come back to
 * measurements. Nothing here asks a human to resize a visual and report back.
 *
 * Usage:
 *   node experimentRunner.mjs --experiment classic-size-sweep --out ./output/sweep
 *   node experimentRunner.mjs --list
 *
 * Restoration runs on the way out, including after a failure, and is
 * verified. If it cannot restore, it says so loudly rather than leaving the
 * lab visual in an unknown state.
 */

import { pathToFileURL } from "node:url";
import { LabController, writeJson } from "./lab-controller.mjs";
import {
  checkVariantTheme,
  detectBreakpoints,
  expandExperiment,
  expandMatrix,
  summariseBreakpoints,
} from "./labActions.mjs";

/**
 * Built-in experiments. Declarative on purpose: a new sweep should be a data
 * change, not a code change, and keeping them in one place makes it obvious
 * what the lab is allowed to do.
 */
export const EXPERIMENTS = {
  "classic-size-sweep": {
    name: "classic-size-sweep",
    description:
      "How the native renderer sheds furniture as the visual shrinks. Sizes run large to small so each step is one shrink.",
    baseline: { gap: 10, zoom: 100 },
    variants: [
      { width: 600, height: 600 },
      { width: 600, height: 500 },
      { width: 600, height: 450 },
      { width: 600, height: 400 },
      { width: 600, height: 350 },
      { width: 600, height: 300 },
      { width: 600, height: 250 },
      { width: 600, height: 206 },
      { width: 500, height: 300 },
      { width: 450, height: 250 },
      { width: 400, height: 225 },
      { width: 372, height: 128 },
    ],
  },
  "quick-check": {
    name: "quick-check",
    description: "Three sizes, for verifying the controller without a full sweep.",
    baseline: { gap: 10 },
    variants: [
      { width: 600, height: 600 },
      { width: 600, height: 300 },
      { width: 372, height: 128 },
    ],
  },
};

function parseArgs(argv) {
  const args = { port: 9222, out: null, experiment: null, list: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") args.list = true;
    else if (arg === "--experiment") args.experiment = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--port") args.port = Number(argv[++i]);
    else throw new Error(`unknown argument ${arg}`);
  }
  return args;
}

/** The fields a size sweep reports, in a readable order. */
const REPORT_FIELDS = [
  "plotWidth", "plotHeight", "barsRendered", "categoriesRendered",
  "categoryLabelCount", "categoryLabelFontPx", "valueLabelCount", "valueLabelFontPx",
  "legendVisible", "legendCount", "legendFontPx",
  "categoryAxisTitleVisible", "valueAxisTitleVisible", "axisTitleFontPx",
  "band", "seriesStep", "categoryStep", "paddingInner",
  "scrollableWidth", "scrollableHeight",
];

export async function runExperiment(spec, { port = 9222, out = null } = {}) {
  const variants = expandExperiment(spec);
  const controller = new LabController({ port });
  const results = [];
  let restoration = null;

  await controller.open();
  try {
    for (const variant of variants) {
      const size = `${variant.width}x${variant.height}`;
      process.stdout.write(`\n[${variant.index + 1}/${variants.length}] ${size} … `);
      try {
        const applied = await controller.setVisualSize(variant.width, variant.height);
        const measurement = await controller.measure();
        results.push({ size, variant, settled: applied.settled, measurement });
        process.stdout.write(
          `plot ${measurement.plotWidth}x${measurement.plotHeight}  ` +
            `bars ${measurement.barsRendered}  cats ${measurement.categoriesRendered}  ` +
            `catLabel ${measurement.categoryLabelFontPx}px  ` +
            `legend ${measurement.legendVisible ? measurement.legendFontPx + "px" : "none"}  ` +
            `valLabels ${measurement.valueLabelCount}\n`,
        );
      } catch (error) {
        process.stdout.write(`FAILED: ${error.message}\n`);
        results.push({ size, variant, error: error.message });
      }
    }
  } finally {
    // Always, including after a throw: the lab must not be left resized.
    restoration = await controller.restore();
    controller.close();
  }

  const transitions = detectBreakpoints(results);
  const report = {
    experiment: spec.name,
    description: spec.description,
    baseline: spec.baseline,
    runAt: new Date().toISOString(),
    results,
    transitions,
    restoration,
  };

  console.log("\n" + "=".repeat(72));
  console.log("BREAKPOINTS");
  console.log("=".repeat(72));
  console.log(summariseBreakpoints(transitions));

  if (out) {
    const file = await writeJson(out, `${spec.name}.json`, report);
    console.log(`\nwrote ${file}`);
  }
  if (!restoration.restored) process.exitCode = 1;
  return report;
}

/**
 * The theme x size matrix.
 *
 * Themes are the outer loop because switching one re-resolves every default
 * and re-renders from scratch, where a resize only re-lays out. Every result
 * carries the theme read back from Power BI's own control immediately before
 * that result was measured, and a variant whose reread is not the requested
 * theme is failed rather than filed -- silently mislabelling a measurement is
 * what made an earlier dataset unusable.
 */
export const MATRIX = {
  name: "theme-size-matrix",
  themes: ["Classic 2026", "Classic 2018", "Fluent 2"],
  sizes: [
    { width: 600, height: 600 },
    { width: 600, height: 300 },
    { width: 600, height: 250 },
    { width: 450, height: 250 },
    { width: 400, height: 225 },
    { width: 372, height: 128 },
  ],
  baseline: { gap: 10 },
};

/**
 * `controller` is injectable so the loop's provenance rules can be tested
 * without Power BI: which theme a result may be filed under, and what happens
 * when the control disagrees, are decisions worth proving.
 *
 * @param {{ name: string, themes: string[], sizes: object[], baseline?: object }} spec
 * @param {{ port?: number, out?: string | null, controller?: any }} [options]
 */
export async function runMatrix(spec, { port = 9222, out = null, controller = null } = {}) {
  const variants = expandMatrix(spec);
  const lab = controller ?? new LabController({ port });
  const results = [];
  let restoration = null;

  await lab.open();
  try {
    // What the theme is BELIEVED to be. Used only to decide whether a switch
    // is needed -- never to label a result.
    let appliedTheme = null;
    for (const variant of variants) {
      const size = `${variant.width}x${variant.height}`;
      if (variant.theme !== appliedTheme) {
        process.stdout.write(`\n=== ${variant.theme} ===\n`);
        await lab.setBaseTheme(variant.theme);
        appliedTheme = variant.theme;
      }
      try {
        await lab.setVisualSize(variant.width, variant.height);

        // Reread the control for EVERY variant, immediately before measuring.
        // Verifying once per theme and reusing that answer across six sizes
        // would attest to the theme at the top of the group rather than to the
        // theme this measurement was taken under, which is a weaker claim than
        // it sounds. Nothing happens between this read and the measure below.
        const verifiedTheme = await lab.readBaseTheme();
        const check = checkVariantTheme(variant.theme, verifiedTheme);
        if (!check.ok) {
          // The belief is wrong, so force a fresh switch for the next variant
          // rather than compounding it.
          appliedTheme = null;
          process.stdout.write(`  ${size}  FAILED: ${check.reason}\n`);
          results.push({ theme: variant.theme, verifiedTheme, size, error: check.reason });
          continue;
        }

        const m = await lab.measure();
        results.push({ theme: variant.theme, verifiedTheme, size, measurement: m });
        process.stdout.write(
          `  ${size.padEnd(9)} plot ${String(m.plotWidth).padStart(4)}x${String(Math.round(m.plotHeight)).padEnd(4)} ` +
            `bars ${String(m.barsRendered).padStart(2)} cats ${m.categoriesRendered} ` +
            `catPx ${m.categoryLabelFontPx} legend ${m.legendVisible ? m.legendFontPx : "none"} ` +
            `valLbl ${m.valueLabelCount} axisTitle ${m.categoryAxisTitleVisible ? m.axisTitleFontPx : "none"} ` +
            `padInner ${m.paddingInner}\n`,
        );
      } catch (error) {
        process.stdout.write(`  ${size}  FAILED: ${error.message}\n`);
        results.push({ theme: variant.theme, size, error: error.message });
      }
    }
  } finally {
    restoration = await lab.restore();
    lab.close();
  }

  const report = { experiment: spec.name, runAt: new Date().toISOString(), results, restoration };
  if (out) console.log(`\nwrote ${await writeJson(out, `${spec.name}.json`, report)}`);
  if (!restoration.restored) process.exitCode = 1;
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.list || !args.experiment) {
    console.log("experiments:\n");
    for (const [key, spec] of Object.entries(EXPERIMENTS)) {
      console.log(`  ${key.padEnd(20)} ${spec.variants.length} variants  ${spec.description}`);
    }
    console.log(`  ${"theme-size-matrix".padEnd(20)} ${MATRIX.themes.length * MATRIX.sizes.length} variants  Every base theme at every size, each result verified against the theme control.`);
    console.log("\nfields captured per variant:\n  " + REPORT_FIELDS.join(", "));
    return;
  }
  if (args.experiment === "theme-size-matrix") {
    await runMatrix(MATRIX, { port: args.port, out: args.out });
    return;
  }
  const spec = EXPERIMENTS[args.experiment];
  if (!spec) throw new Error(`no experiment "${args.experiment}"`);
  await runExperiment(spec, { port: args.port, out: args.out });
}

// Windows paths make a naive file:// comparison fragile (three slashes,
// drive letters, backslashes), so compare resolved URLs instead.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`experiment failed: ${error.message}`);
    process.exitCode = 1;
  });
}
