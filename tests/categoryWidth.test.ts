import assert from "node:assert/strict";
import test from "node:test";
import {
  CATEGORY_OUTER_PADDING,
  categoryPercent,
  categoryWidthPercent,
  computeChartLayout,
  type AxisLayoutStyle,
  type ChartLayout,
  type ChartLayoutInput,
  type TextMeasure,
} from "../app/lib/chartLayout";
import { clusteredSeriesBands } from "../app/lib/seriesBands";

/**
 * Category STEP, category THICKNESS and category WIDTH are three different
 * numbers, and Power BI uses all three.
 *
 *   step      = plot / (count − pInner + 2 × pOuter)   ← where a category sits
 *   thickness = plot / (count + 2 × pOuter)            ← no inner padding at all
 *   width     = thickness × (1 − pInner)               ← how much a mark fills
 *
 * The middle one is the abstraction Theme Studio was missing. Treating the
 * positioning band as the mark extent made every bar too thick by exactly the
 * padding the band scale gives back — 0.799 of a step against native's 0.767
 * at 20% spacing.
 *
 * Nine native states (category spacing 0/20/50 × series gap 0/10/40, Classic
 * 2026, Clustered bar, 450×250) confirm all four quantities to capture
 * precision, with the series step and bar thickness following from the
 * existing `clusteredSeriesBands` model fed the predicted width. See
 * POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.18.
 */

const near = (a: number, b: number, tolerance = 1e-9): boolean => Math.abs(a - b) <= tolerance;
/** The native captures round to three decimals. */
const NATIVE = 1e-3;

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

const extentOf = (layout: ChartLayout): number =>
  layout.orientation === "vertical" ? layout.plot.width : layout.plot.height;

const stepOf = (layout: ChartLayout, count: number): number =>
  layout.scale.category(1, count).start - layout.scale.category(0, count).start;

// ---------------------------------------------------------------------------
// The three quantities
// ---------------------------------------------------------------------------

test("step, thickness and width are three different numbers", () => {
  const layout = layoutOf({ innerPadding: 20 });
  const extent = extentOf(layout);
  const step = stepOf(layout, 4);
  const width = layout.scale.categoryWidth(4);
  const thickness = width / 0.8;

  assert.ok(near(step, extent / 4.6), "step carries the inner padding");
  assert.ok(near(thickness, extent / 4.8), "thickness does not");
  assert.ok(!near(step, thickness), "and they are not the same number");
  assert.ok(step > thickness, "the band scale gives the inner padding back to the step");
  assert.ok(width < layout.scale.category(0, 4).size, "the mark is smaller than the band it starts in");
});

test("NATIVE: the measured category widths, from the measured plot", () => {
  // Native 450×250: plot 141, four categories, thickness 141/4.8 = 29.375 at
  // every spacing. These are Power BI's own measured cluster extents.
  const PLOT = 141;
  const measured: Array<[number, number, number]> = [
    // spacing, native category step, native cluster extent
    [0, 29.375, 29.375],
    [10, 30.0, 26.4375],
    [20, 30.6522, 23.5],
    [30, 31.3333, 20.5625],
    [50, 32.7907, 14.6875],
    [75, 34.8148, 7.34375],
  ];
  for (const [spacing, nativeStep, nativeWidth] of measured) {
    const layout = layoutOf({ innerPadding: spacing });
    const extent = extentOf(layout);
    // Scale-free, so the test's own plot size does not have to be 141.
    const step = (stepOf(layout, 4) / extent) * PLOT;
    const width = (layout.scale.categoryWidth(4) / extent) * PLOT;
    assert.ok(near(step, nativeStep, NATIVE), `spacing ${spacing}: step ${step} != ${nativeStep}`);
    assert.ok(near(width, nativeWidth, NATIVE), `spacing ${spacing}: width ${width} != ${nativeWidth}`);
    // The thickness behind it never moves.
    assert.ok(near((width / (1 - spacing / 100)), 29.375, NATIVE), `spacing ${spacing}: thickness`);
  }
});

test("thickness is the same at every spacing; step is not", () => {
  const thicknesses = new Set<number>();
  const steps = new Set<number>();
  for (const innerPadding of [0, 10, 20, 30, 50, 75]) {
    const layout = layoutOf({ innerPadding });
    const width = layout.scale.categoryWidth(4);
    thicknesses.add(+(width / (1 - innerPadding / 100)).toFixed(9));
    steps.add(+stepOf(layout, 4).toFixed(9));
  }
  assert.equal(thicknesses.size, 1, "one thickness across every spacing");
  assert.equal(steps.size, 6, "six different steps");
});

// ---------------------------------------------------------------------------
// The whole chain, against the nine native states
// ---------------------------------------------------------------------------

test("NATIVE: plot -> step -> thickness -> width -> series step -> bar", () => {
  const PLOT = 141;
  // Straight from the nine-state orthogonal run: Power BI produced every
  // number on the right.
  const states: Array<{ spacing: number; gap: number; step: number; width: number; seriesStep: number; bar: number }> = [
    { spacing: 0, gap: 0, step: 29.375, width: 29.375, seriesStep: 9.792, bar: 9.792 },
    { spacing: 0, gap: 10, step: 29.375, width: 29.375, seriesStep: 10.129, bar: 9.116 },
    { spacing: 0, gap: 40, step: 29.375, width: 29.375, seriesStep: 11.298, bar: 6.779 },
    { spacing: 20, gap: 0, step: 30.6522, width: 23.5, seriesStep: 7.833, bar: 7.833 },
    { spacing: 20, gap: 10, step: 30.6522, width: 23.5, seriesStep: 8.103, bar: 7.293 },
    { spacing: 20, gap: 40, step: 30.6522, width: 23.5, seriesStep: 9.038, bar: 5.423 },
    { spacing: 50, gap: 0, step: 32.7907, width: 14.6875, seriesStep: 4.896, bar: 4.896 },
    { spacing: 50, gap: 10, step: 32.7907, width: 14.6875, seriesStep: 5.065, bar: 4.558 },
    { spacing: 50, gap: 40, step: 32.7907, width: 14.6875, seriesStep: 5.649, bar: 3.389 },
  ];

  for (const state of states) {
    const layout = layoutOf({ innerPadding: state.spacing });
    const extent = extentOf(layout);
    const step = (stepOf(layout, 4) / extent) * PLOT;
    const width = (layout.scale.categoryWidth(4) / extent) * PLOT;
    assert.ok(near(step, state.step, NATIVE), `spacing ${state.spacing}: step`);
    assert.ok(near(width, state.width, NATIVE), `spacing ${state.spacing}: width`);

    // The series model is not new and is not refitted: it just needed the
    // right extent handed to it.
    const bands = clusteredSeriesBands({ extent: width, seriesCount: 3, gapSize: state.gap });
    const seriesStep = bands[1].offset - bands[0].offset;
    assert.ok(near(seriesStep, state.seriesStep, NATIVE), `spacing ${state.spacing} gap ${state.gap}: series step`);
    assert.ok(near(bands[0].size, state.bar, NATIVE), `spacing ${state.spacing} gap ${state.gap}: bar`);
  }
});

// ---------------------------------------------------------------------------
// Independence
// ---------------------------------------------------------------------------

test("the series gap cannot move the category width", () => {
  // Measured: at each spacing the native cluster extent was one number across
  // gaps 0, 10 and 40. The category scale does not know the gap exists.
  const layout = layoutOf({ innerPadding: 20 });
  const width = layout.scale.categoryWidth(4);
  for (const gapSize of [0, 10, 40, 75]) {
    const bands = clusteredSeriesBands({ extent: width, seriesCount: 3, gapSize });
    const drawn = bands[bands.length - 1].offset + bands[bands.length - 1].size - bands[0].offset;
    assert.ok(near(drawn, width), `gap ${gapSize}: the series fill the width they were given`);
  }
  assert.ok(near(layout.scale.categoryWidth(4), width), "and the width itself is unchanged");
});

test("category spacing moves step and width by different formulas", () => {
  const a = layoutOf({ innerPadding: 0 });
  const b = layoutOf({ innerPadding: 50 });
  const extent = extentOf(a);
  // step: 4 - 0 + 0.8 -> 4 - 0.5 + 0.8, so it GROWS.
  assert.ok(near(stepOf(a, 4), extent / 4.8));
  assert.ok(near(stepOf(b, 4), extent / 4.3));
  assert.ok(stepOf(b, 4) > stepOf(a, 4), "the step grows with the spacing");
  // width: same thickness, half of it. So it SHRINKS.
  assert.ok(near(a.scale.categoryWidth(4), extent / 4.8));
  assert.ok(near(b.scale.categoryWidth(4), (extent / 4.8) * 0.5));
  assert.ok(b.scale.categoryWidth(4) < a.scale.categoryWidth(4), "the width shrinks");
});

test("the series padding is exactly the requested gap ratio", () => {
  for (const gapSize of [0, 10, 40]) {
    const bands = clusteredSeriesBands({ extent: 100, seriesCount: 3, gapSize });
    const step = bands[1].offset - bands[0].offset;
    assert.ok(near(1 - bands[0].size / step, gapSize / 100), `gap ${gapSize}`);
  }
});

// ---------------------------------------------------------------------------
// What must not have moved
// ---------------------------------------------------------------------------

test("positioning is untouched by the new mark extent", () => {
  const layout = layoutOf({ innerPadding: 20 });
  const extent = extentOf(layout);
  const step = stepOf(layout, 4);
  assert.ok(near(extent / step, 4.6), "plot / step still 4.6");
  assert.ok(near(layout.scale.category(0, 4).start - layout.plot.y, CATEGORY_OUTER_PADDING * step), "leading edge still 0.4");
  assert.ok(near(layout.scale.category(0, 4).size, step * 0.8), "the band is still the step less the inner padding");
});

test("the mark starts where the band starts", () => {
  // Measured: native's leading edge is exactly 0.4 x step at every state, so
  // the cluster is flush with its band rather than centred in it.
  const layout = layoutOf({ innerPadding: 20 });
  const band = categoryPercent(layout, 0, 4);
  const markSize = categoryWidthPercent(layout, 4);
  assert.ok(markSize < band.size, "narrower than the band");
  assert.ok(near(band.offset, ((layout.scale.category(0, 4).start - layout.plot.y) / extentOf(layout)) * 100));
});

test("the value scale is untouched", () => {
  for (const orientation of ["horizontal", "vertical"] as const) {
    const layout = layoutOf({ orientation, innerPadding: 20 });
    const span = Math.abs(layout.scale.value(100) - layout.scale.value(0));
    const extent = orientation === "vertical" ? layout.plot.height : layout.plot.width;
    assert.ok(near(span, extent), `${orientation}`);
  }
});

// ---------------------------------------------------------------------------
// Shape of the input
// ---------------------------------------------------------------------------

for (const orientation of ["horizontal", "vertical"] as const) {
  test(`${orientation}: the width is taken along the category axis`, () => {
    const layout = layoutOf({ orientation, innerPadding: 20 });
    assert.ok(near(layout.scale.categoryWidth(4), (extentOf(layout) / 4.8) * 0.8));
  });
}

test("one and two categories", () => {
  const layout = layoutOf({ innerPadding: 20 });
  const extent = extentOf(layout);
  assert.ok(near(layout.scale.categoryWidth(1), (extent / 1.8) * 0.8), "one");
  assert.ok(near(layout.scale.categoryWidth(2), (extent / 2.8) * 0.8), "two");
});

test("zero or negative counts have no width", () => {
  const layout = layoutOf();
  for (const count of [0, -1]) {
    assert.equal(layout.scale.categoryWidth(count), 0);
    assert.equal(categoryWidthPercent(layout, count), 0);
  }
});

test("inversion does not change how wide a mark is", () => {
  const plain = layoutOf({ innerPadding: 20 });
  const inverted = layoutOf({ categoryAxis: axis({ invertAxis: true }), innerPadding: 20 });
  assert.ok(near(plain.scale.categoryWidth(4), inverted.scale.categoryWidth(4)));
});

test("a hidden category axis drops the outer padding from both quantities", () => {
  const layout = layoutOf({ categoryAxis: axis({ show: false }), innerPadding: 20 });
  const extent = extentOf(layout);
  assert.ok(near(stepOf(layout, 4), extent / 3.8), "step");
  assert.ok(near(layout.scale.categoryWidth(4), (extent / 4) * 0.8), "thickness has no padding to drop");
});

test("out-of-range spacing clamps", () => {
  for (const innerPadding of [-50, 0, 100, 500]) {
    const width = layoutOf({ innerPadding }).scale.categoryWidth(4);
    assert.ok(Number.isFinite(width) && width >= 0, `spacing ${innerPadding}`);
  }
});
