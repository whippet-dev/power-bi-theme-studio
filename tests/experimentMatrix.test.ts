import assert from "node:assert/strict";
import test from "node:test";
import { runMatrix } from "../tools/pbi-render-probe/experimentRunner.mjs";

/**
 * The matrix loop decides which theme a measurement may be filed under, and
 * that decision is the whole provenance of the dataset. A result labelled
 * "Classic 2018" that was actually rendered under Fluent is worse than no
 * result at all, because nothing downstream can tell the difference.
 *
 * The controller is injected, so these run without Power BI.
 */

const SPEC = {
  name: "test-matrix",
  themes: ["Classic 2026", "Classic 2018"],
  sizes: [
    { width: 600, height: 600 },
    { width: 400, height: 225 },
  ],
  baseline: { gap: 10 },
};

/** What the Base theme control reports on the nth read. */
type ThemeReader = (applied: string | null, index: number) => string | null;

function fakeLab(reads?: ThemeReader) {
  const calls: string[] = [];
  let applied: string | null = null;
  let index = 0;
  return {
    calls,
    count: (prefix: string) => calls.filter((c) => c.startsWith(prefix)).length,
    async open() {
      calls.push("open");
      return {};
    },
    async setBaseTheme(theme: string) {
      applied = theme;
      calls.push(`setBaseTheme:${theme}`);
      return { theme, changed: true, settled: true };
    },
    async setVisualSize(width: number, height: number) {
      calls.push(`setVisualSize:${width}x${height}`);
      return { width, height, settled: true };
    },
    async readBaseTheme() {
      const value = reads ? reads(applied, index) : applied;
      index += 1;
      calls.push(`readBaseTheme:${value}`);
      return value;
    },
    async measure() {
      calls.push("measure");
      return { plotWidth: 480, plotHeight: 480, barsRendered: 12, categoriesRendered: 4 };
    },
    async restore() {
      calls.push("restore");
      return { restored: true, problems: [] };
    },
    close() {
      calls.push("close");
    },
  };
}

/** The runner reports progress on stdout; a test suite does not need it. */
async function quietly<T>(run: () => Promise<T>): Promise<T> {
  const write = process.stdout.write;
  process.stdout.write = () => true;
  try {
    return await run();
  } finally {
    process.stdout.write = write;
  }
}

test("every variant verifies the theme against the control, not once per group", async () => {
  const lab = fakeLab();
  const report = await quietly(() => runMatrix(SPEC, { controller: lab }));

  assert.equal(report.results.length, 4);
  assert.equal(
    lab.count("readBaseTheme"),
    4,
    "the control must be reread for each variant, not cached across a theme's sizes",
  );
  for (const result of report.results) {
    assert.equal(result.verifiedTheme, result.theme, "filed under the theme that was read back");
    assert.ok(result.measurement, "a verified variant is measured");
  }
});

test("verified themes are not re-applied between sizes", async () => {
  const lab = fakeLab();
  await quietly(() => runMatrix(SPEC, { controller: lab }));

  // Rereading is cheap; switching re-renders the whole report from scratch.
  assert.equal(lab.count("setBaseTheme"), 2, "one switch per theme, not per variant");
});

test("the reread sits between the resize and the measurement", async () => {
  const lab = fakeLab();
  await quietly(() => runMatrix(SPEC, { controller: lab }));

  // Nothing may happen between verifying the theme and taking the reading it
  // will be filed under.
  assert.deepEqual(lab.calls.slice(0, 6), [
    "open",
    "setBaseTheme:Classic 2026",
    "setVisualSize:600x600",
    "readBaseTheme:Classic 2026",
    "measure",
    "setVisualSize:400x225",
  ]);
});

test("a variant the control disagrees with is failed, not filed", async () => {
  // The first read drifts: the theme is not what the runner believes it just
  // applied, which is the case the reread exists to catch.
  const lab = fakeLab((applied, index) => (index === 0 ? "Fluent 2" : applied));
  const report = await quietly(() => runMatrix(SPEC, { controller: lab }));

  const drifted = report.results[0];
  assert.match(drifted.error, /Classic 2026.*Fluent 2/);
  assert.equal(drifted.measurement, undefined, "no measurement is recorded");
  assert.equal(lab.count("measure"), 3, "the drifted variant is never measured");

  // The belief was wrong, so the next variant re-applies the theme instead of
  // carrying on under an assumption that has already been contradicted.
  assert.equal(lab.count("setBaseTheme"), 3, "two themes, plus one re-application");
});

test("an unreadable control fails the variant", async () => {
  const lab = fakeLab(() => null);
  const report = await quietly(() => runMatrix(SPEC, { controller: lab }));

  assert.equal(lab.count("measure"), 0, "nothing is filed when the theme cannot be read");
  for (const result of report.results) {
    assert.match(result.error, /could not be read/);
  }
});

test("restoration still runs when every variant fails", async () => {
  const lab = fakeLab(() => null);
  await quietly(() => runMatrix(SPEC, { controller: lab }));

  assert.equal(lab.count("restore"), 1);
  assert.equal(lab.count("close"), 1);
});
