import assert from "node:assert/strict";
import test from "node:test";
import {
  CATEGORY_OUTER_PADDING,
  computeChartLayout,
  type AxisLayoutStyle,
  type ChartLayoutInput,
  type ChartLayout,
  type TextMeasure,
} from "../app/lib/chartLayout";
import { clusteredSeriesBands } from "../app/lib/seriesBands";

/**
 * Power BI's category scale does not tile the plot.
 *
 * Measured across twelve native states — Classic 2026, Clustered bar, four
 * categories, series gap 10, at 450×250 and 600×300, sweeping "Space between
 * categories" through 0, 10, 20, 30, 50 and 75 — `plotExtent / step` came out
 * as 4.80, 4.70, 4.60, 4.50, 4.30 and 4.05. Solving
 *
 *     plot / step = count − pInner + 2 × pOuter
 *
 * for the outer term gives **0.4000 at every one of the twelve**, and the
 * measured distance from the plot edge to the first band is **0.4000 × step**
 * at every one of the twelve. Two independent routes, no drift.
 *
 * These tests assert the native numbers directly, so a regression fails
 * naming the state Power BI was actually in. See
 * POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.16.
 */

const near = (a: number, b: number, tolerance = 1e-9): boolean => Math.abs(a - b) <= tolerance;

const axis = (over: Partial<AxisLayoutStyle> = {}): AxisLayoutStyle => ({
  show: true,
  fontSize: 10,
  fontFamily: "Segoe UI",
  showAxisTitle: false,
  titleText: "",
  titleFontSize: 9,
  titleFontFamily: "Segoe UI",
  ...over,
});

const fixed: TextMeasure = (text, fontSize) => ({ width: text.length * 6, height: fontSize * 1.2 });

const layoutOf = (over: Partial<ChartLayoutInput> = {}): ChartLayout =>
  computeChartLayout({
    outer: { x: 0, y: 0, width: 400, height: 300 },
    orientation: "horizontal",
    categoryAxis: axis(),
    valueAxis: axis(),
    categories: ["A", "B", "C", "D"],
    dataMax: 100,
    measureText: fixed,
    ...over,
  });

/** The extent the categories divide, and its origin. */
function categoryExtent(layout: ChartLayout): { origin: number; total: number } {
  const vertical = layout.orientation === "vertical";
  return vertical
    ? { origin: layout.plot.x, total: layout.plot.width }
    : { origin: layout.plot.y, total: layout.plot.height };
}

function scaleFacts(layout: ChartLayout, count: number) {
  const { origin, total } = categoryExtent(layout);
  const first = layout.scale.category(0, count);
  const last = layout.scale.category(count - 1, count);
  const step = count > 1 ? layout.scale.category(1, count).start - first.start : total;
  return {
    total,
    step,
    band: first.size,
    leading: first.start - origin,
    trailing: origin + total - (last.start + last.size),
    plotOverStep: total / step,
  };
}

// ---------------------------------------------------------------------------
// The measured state
// ---------------------------------------------------------------------------

test("NATIVE: four categories at 20% spacing put 4.60 steps in the plot", () => {
  const facts = scaleFacts(layoutOf({ innerPadding: 20 }), 4);
  assert.ok(near(facts.plotOverStep, 4.6), `plot/step ${facts.plotOverStep}`);
  assert.ok(near(facts.leading, 0.4 * facts.step), "first band starts 0.4 of a step in");
  assert.ok(near(facts.trailing, 0.4 * facts.step), "last band ends 0.4 of a step short");
  assert.ok(near(facts.band, 0.8 * facts.step), "band is the step less the inner padding");
});

test("NATIVE: the whole measured sweep, spacing to plot/step", () => {
  // Straight from the twelve-state native sweep. Power BI produced the left
  // column; these are the right column.
  const measured: Array<[number, number]> = [
    [0, 4.8],
    [10, 4.7],
    [20, 4.6],
    [30, 4.5],
    [50, 4.3],
    [75, 4.05],
  ];
  for (const [spacing, expected] of measured) {
    const facts = scaleFacts(layoutOf({ innerPadding: spacing }), 4);
    assert.ok(near(facts.plotOverStep, expected), `spacing ${spacing}: ${facts.plotOverStep} != ${expected}`);
    // The edges hold their 0.4 regardless of how the inner padding moves.
    assert.ok(near(facts.leading, 0.4 * facts.step), `spacing ${spacing}: leading edge`);
    assert.ok(near(facts.trailing, 0.4 * facts.step), `spacing ${spacing}: trailing edge`);
  }
});

test("every band sits one step from the last, and all of them inside the plot", () => {
  const layout = layoutOf({ innerPadding: 20 });
  const { origin, total } = categoryExtent(layout);
  const slots = [0, 1, 2, 3].map((i) => layout.scale.category(i, 4));
  for (let i = 1; i < slots.length; i++) {
    assert.ok(near(slots[i].start - slots[i - 1].start, slots[1].start - slots[0].start), `step ${i}`);
  }
  for (const slot of slots) {
    assert.ok(slot.start >= origin - 1e-9, "starts inside the plot");
    assert.ok(slot.start + slot.size <= origin + total + 1e-9, "ends inside the plot");
  }
});

// ---------------------------------------------------------------------------
// Counts and edges
// ---------------------------------------------------------------------------

test("a single category is centred, not stretched", () => {
  const layout = layoutOf({ innerPadding: 20 });
  const { origin, total } = categoryExtent(layout);
  const only = layout.scale.category(0, 1);
  const step = total / (1 - 0.2 + 0.8);
  assert.ok(near(only.start - origin, 0.4 * step), "leading");
  assert.ok(near(origin + total - (only.start + only.size), 0.4 * step), "trailing");
  assert.ok(near(only.size, 0.8 * step), "band");
});

test("two categories", () => {
  const facts = scaleFacts(layoutOf({ innerPadding: 20 }), 2);
  assert.ok(near(facts.plotOverStep, 2 - 0.2 + 0.8), `plot/step ${facts.plotOverStep}`);
  assert.ok(near(facts.leading, 0.4 * facts.step));
  assert.ok(near(facts.trailing, 0.4 * facts.step));
});

test("zero or negative counts collapse to the plot origin", () => {
  const layout = layoutOf();
  for (const count of [0, -1, -10]) {
    const slot = layout.scale.category(0, count);
    assert.equal(slot.size, 0);
    assert.equal(slot.start, categoryExtent(layout).origin);
  }
});

test("out-of-range inner padding clamps rather than inverting the scale", () => {
  for (const innerPadding of [-50, 0, 100, 500]) {
    const facts = scaleFacts(layoutOf({ innerPadding }), 4);
    assert.ok(facts.band >= 0, `spacing ${innerPadding} must not invert the band`);
    assert.ok(facts.step > 0, `spacing ${innerPadding} must keep a positive step`);
    assert.ok(facts.leading >= -1e-9, `spacing ${innerPadding} must not start outside the plot`);
  }
});

test("a hidden category axis takes no outer padding", () => {
  // Power BI's own rule: the ratio is `explicit ?? (axesVisible !== false ?
  // 0.4 : 0)`. Runtime-corroborated rather than measured - every one of the
  // twelve native states had the axis visible.
  const layout = layoutOf({ categoryAxis: axis({ show: false }), innerPadding: 20 });
  const facts = scaleFacts(layout, 4);
  assert.ok(near(facts.leading, 0), "tiles from the plot edge");
  assert.ok(near(facts.plotOverStep, 4 - 0.2), "and the step absorbs only the inner padding");
});

// ---------------------------------------------------------------------------
// Orientation and inversion
// ---------------------------------------------------------------------------

for (const orientation of ["horizontal", "vertical"] as const) {
  test(`${orientation}: the rule holds in the direction categories actually run`, () => {
    const facts = scaleFacts(layoutOf({ orientation, innerPadding: 20 }), 4);
    assert.ok(near(facts.plotOverStep, 4.6));
    assert.ok(near(facts.leading, 0.4 * facts.step));
    assert.ok(near(facts.trailing, 0.4 * facts.step));
  });
}

test("inversion reorders the slots without moving the edges", () => {
  const plain = layoutOf({ innerPadding: 20 });
  const inverted = layoutOf({ categoryAxis: axis({ invertAxis: true }), innerPadding: 20 });
  const { origin, total } = categoryExtent(plain);
  const step = plain.scale.category(1, 4).start - plain.scale.category(0, 4).start;

  // The occupied slots are identical; only which index lands in which moves,
  // so comparing them in index order would just measure the reversal.
  const starts = (l: ChartLayout) => [0, 1, 2, 3].map((i) => l.scale.category(i, 4).start).sort((x, y) => x - y);
  assert.deepEqual(starts(inverted), starts(plain), "the same four slots");
  assert.ok(near(plain.scale.category(0, 4).start, inverted.scale.category(3, 4).start));
  assert.ok(near(plain.scale.category(3, 4).start, inverted.scale.category(0, 4).start));

  // And the edges keep their 0.4 of a step at both ends.
  assert.ok(near(starts(inverted)[0] - origin, 0.4 * step), "leading");
  const lastSlot = inverted.scale.category(0, 4);
  assert.ok(near(origin + total - (lastSlot.start + lastSlot.size), 0.4 * step), "trailing");
});

// ---------------------------------------------------------------------------
// What must NOT move
// ---------------------------------------------------------------------------

test("outer padding does not leak into the value axis", () => {
  // The bundle applies it only to Category-kind axes, and a value scale that
  // stopped short of its own plot would misplace every mark.
  for (const orientation of ["horizontal", "vertical"] as const) {
    const layout = layoutOf({ orientation, innerPadding: 20, dataMax: 100 });
    const span = Math.abs(layout.scale.value(100) - layout.scale.value(0));
    const extent = orientation === "vertical" ? layout.plot.height : layout.plot.width;
    assert.ok(near(span, extent), `${orientation}: the value scale still spans its plot`);
  }
});

test("the series band scale is untouched", () => {
  // A different level of the layout: this one divides ONE category between
  // series, and its 0.1 at gap 10 is the most heavily confirmed number in the
  // whole differential.
  const bands = clusteredSeriesBands({ extent: 100, seriesCount: 3, gapSize: 10 });
  const step = bands[1].offset - bands[0].offset;
  assert.ok(near(step, 100 / (3 - 0.1)), "step = extent / (n - paddingInner)");
  assert.ok(near(bands[0].size, step * 0.9), "band = step x (1 - paddingInner)");
  // And it still starts flush inside its category: the outer padding above is
  // the CATEGORY scale's, not this one's.
  assert.equal(bands[0].offset, 0);
});

test("the plot rectangle itself is unchanged by the category rule", () => {
  // Outer padding lives inside the plot. If it had moved the gutters, every
  // axis measurement taken before this change would have to be re-taken.
  const a = layoutOf({ innerPadding: 0 });
  const b = layoutOf({ innerPadding: 75 });
  assert.deepEqual(a.plot, b.plot);
  assert.deepEqual(a.categoryAxis, b.categoryAxis);
  assert.deepEqual(a.valueAxis, b.valueAxis);
});

test("the constant is the measured one", () => {
  assert.equal(CATEGORY_OUTER_PADDING, 0.4);
});
