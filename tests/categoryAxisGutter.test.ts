import assert from "node:assert/strict";
import test from "node:test";
import {
  CATEGORY_OUTER_PADDING,
  CATEGORY_TICK_LABEL_ANCHOR_OFFSET,
  computeChartLayout,
  horizontalCategoryLabelAllowance,
  type AxisLayoutStyle,
  type ChartLayout,
  type ChartLayoutInput,
  type TextMeasure,
} from "../app/lib/chartLayout";
import { clusteredSeriesBands } from "../app/lib/seriesBands";

/**
 * The horizontal category gutter, against Power BI's own numbers.
 *
 * Every width below was measured with Power BI Desktop's own canvas, inside
 * its WebView, using the font read off a rendered label — and those widths
 * match this project's canvas measurement to four decimals, so the same
 * `measureText` can be injected here and the arithmetic still means
 * something (POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.27, §5.29).
 *
 * The model is
 *
 *     measuredLabelWidth
 *   + (2 + 0.375 × labelFontPx)   ← empirical
 *   + 9                           ← proven, anchor to plot
 *   + (titleFontPx + 5) if shown  ← proven
 *
 * Three of those four terms are proven. The chart-edge allowance is not: it
 * reproduces every font-size state to 0.053px but drifts up to ~1.4px when
 * the widest label changes. These tests assert the drift rather than hide
 * it, so nobody later "fixes" the formula into agreeing with one string.
 */

const axis = (over: Partial<AxisLayoutStyle> = {}): AxisLayoutStyle => ({
  show: true,
  fontSize: 12,
  fontFamily: "Segoe UI",
  showAxisTitle: false,
  titleText: "",
  titleFontSize: 16,
  titleFontFamily: "DIN",
  ...over,
});

/** Power BI Desktop's own canvas widths for the fixture's labels. */
const DESKTOP_WIDTH: Record<string, number> = {
  London: 40.3594,
  "North West": 60.498,
  NW: 20.1855,
  Scotland: 45.8848,
  Wales: 31.1191,
  Loughborough: 79.2656,
};

/** Widths scale linearly with font size, as Desktop's own six states show. */
const desktopMeasurer: TextMeasure = (text, fontSize) => ({
  width: (DESKTOP_WIDTH[text] ?? text.length * 5.0415) * (fontSize / 12),
  height: fontSize * 1.35,
});

const layoutOf = (over: Partial<ChartLayoutInput> = {}): ChartLayout =>
  computeChartLayout({
    outer: { x: 0, y: 0, width: 600, height: 600 },
    orientation: "horizontal",
    categoryAxis: axis(),
    valueAxis: axis({ fontSize: 12 }),
    categories: ["London", "North West", "Scotland", "Wales"],
    dataMax: 50,
    innerPadding: 20,
    measureText: desktopMeasurer,
    ...over,
  });

const gutter = (layout: ChartLayout): number => layout.categoryAxis?.width ?? 0;
const near = (a: number, b: number, tolerance = 1e-9): boolean => Math.abs(a - b) <= tolerance;

// ---------------------------------------------------------------------------
// The reference state
// ---------------------------------------------------------------------------

test("NATIVE 600x600, title shown at 16px: 96.998 against a measured 97", () => {
  const layout = layoutOf({ categoryAxis: axis({ showAxisTitle: true, titleText: "Category" }) });
  assert.ok(near(gutter(layout), 60.498 + 6.5 + 9 + 21), `gutter ${gutter(layout)}`);
  assert.ok(Math.abs(gutter(layout) - 97) < 0.01, "within 0.01px of native");
});

test("NATIVE the same state with the title hidden: 75.998 against a measured 76", () => {
  const layout = layoutOf();
  assert.ok(near(gutter(layout), 60.498 + 6.5 + 9), `gutter ${gutter(layout)}`);
  assert.ok(Math.abs(gutter(layout) - 76) < 0.01, "within 0.01px of native");
});

test("NATIVE a 12px title costs 17, not 21", () => {
  // Title allocation is titleFontPx + 5, measured by switching it off and on
  // at both sizes Power BI uses responsively.
  const layout = layoutOf({
    categoryAxis: axis({ showAxisTitle: true, titleText: "Category", titleFontSize: 12 }),
  });
  assert.ok(near(gutter(layout), 60.498 + 6.5 + 9 + 17), `gutter ${gutter(layout)}`);
  assert.ok(Math.abs(gutter(layout) - 93) < 0.01, "within 0.01px of native");
});

// ---------------------------------------------------------------------------
// The font-size axis, where the rule is at its strongest
// ---------------------------------------------------------------------------

test("NATIVE the six title-off font sizes, to 0.053px", () => {
  // Left column measured in Power BI; right column is what this model says.
  const measured: Array<[number, number]> = [
    [9.6, 63],
    [12, 76],
    [14.4, 89],
    [16.8, 102],
    [19.2, 115],
    [24, 141],
  ];
  let worst = 0;
  for (const [fontPx, nativeGutter] of measured) {
    const layout = layoutOf({ categoryAxis: axis({ fontSize: fontPx }) });
    const error = Math.abs(gutter(layout) - nativeGutter);
    worst = Math.max(worst, error);
    assert.ok(error <= 0.06, `${fontPx}px: model ${gutter(layout)} vs native ${nativeGutter}`);
  }
  // Pinned so a future change that widens this shows up as a number.
  assert.ok(worst <= 0.06, `worst error ${worst}`);
});

// ---------------------------------------------------------------------------
// The string axis, where it is not
// ---------------------------------------------------------------------------

test("NATIVE three different widest labels at 12px, INCLUDING the known error", () => {
  // The allowance is not really constant at a fixed font size: native gives
  // 5.1152 for Scotland, 6.5020 for North West and 6.7344 for Loughborough.
  // This model uses 6.5 for all three, so Scotland is out by ~1.4px. That is
  // recorded evidence, not a bug — do NOT add a branch to force it to 81.
  const cases: Array<[string[], number, number]> = [
    // categories, native gutter, expected model error
    [["London", "NW", "Scotland", "Wales"], 81, 1.385],
    [["London", "North West", "Scotland", "Wales"], 97, -0.002],
    [["London", "Loughborough", "Scotland", "Wales"], 116, -0.234],
  ];
  for (const [categories, nativeGutter, expectedError] of cases) {
    const layout = layoutOf({
      categories,
      categoryAxis: axis({ showAxisTitle: true, titleText: "Category" }),
    });
    const error = gutter(layout) - nativeGutter;
    assert.ok(
      Math.abs(error - expectedError) < 0.01,
      `${categories[1]}: model ${gutter(layout)} vs native ${nativeGutter}, error ${error}`,
    );
  }
});

test("the widest label drives the gutter, not the first or the last", () => {
  const a = layoutOf({ categories: ["Loughborough", "Wales"] });
  const b = layoutOf({ categories: ["Wales", "Loughborough"] });
  assert.ok(near(gutter(a), gutter(b)), "order must not matter");
  assert.ok(gutter(a) > gutter(layoutOf({ categories: ["Wales", "NW"] })), "the widest wins");
});

// ---------------------------------------------------------------------------
// The terms, separately
// ---------------------------------------------------------------------------

test("each term is separable and does what it says", () => {
  const base = layoutOf();
  const withTitle = layoutOf({ categoryAxis: axis({ showAxisTitle: true, titleText: "Category" }) });
  assert.ok(near(gutter(withTitle) - gutter(base), 16 + 5), "title costs its font size plus 5");

  const bigger = layoutOf({ categoryAxis: axis({ fontSize: 24 }) });
  const labelDelta = DESKTOP_WIDTH["North West"] * 2 - DESKTOP_WIDTH["North West"];
  const allowanceDelta = horizontalCategoryLabelAllowance(24) - horizontalCategoryLabelAllowance(12);
  assert.ok(near(gutter(bigger) - gutter(base), labelDelta + allowanceDelta), "font moves text AND allowance");

  assert.equal(CATEGORY_TICK_LABEL_ANCHOR_OFFSET, 9);
  assert.ok(near(horizontalCategoryLabelAllowance(12), 6.5));
  assert.ok(near(horizontalCategoryLabelAllowance(0), 2), "the fixed part survives a zero font");
  assert.ok(horizontalCategoryLabelAllowance(-5) >= 0, "a negative font must not produce a negative allowance");
});

test("a hidden category axis consumes no gutter at all", () => {
  const hidden = layoutOf({ categoryAxis: axis({ show: false }) });
  assert.equal(hidden.categoryAxis, null);
  assert.ok(hidden.plot.width > layoutOf().plot.width, "and the plot gets the space back");
});

test("the plot gains exactly what the gutter gives up", () => {
  const withTitle = layoutOf({ categoryAxis: axis({ showAxisTitle: true, titleText: "Category" }) });
  const without = layoutOf();
  assert.ok(
    near(without.plot.width - withTitle.plot.width, gutter(withTitle) - gutter(without)),
    "no pixels invented or lost between gutter and plot",
  );
});

// ---------------------------------------------------------------------------
// What must not have moved
// ---------------------------------------------------------------------------

test("the VERTICAL category axis is untouched", () => {
  // Its transpose has no native evidence, so it keeps the layout this engine
  // always had: text height plus the house label gap plus the title's height.
  const v = computeChartLayout({
    outer: { x: 0, y: 0, width: 600, height: 600 },
    orientation: "vertical",
    categoryAxis: axis(),
    valueAxis: axis(),
    categories: ["London", "North West", "Scotland", "Wales"],
    dataMax: 50,
    measureText: desktopMeasurer,
    labelGap: 4,
  });
  assert.ok(near(v.categoryAxis!.height, 12 * 1.35 + 4), "height + labelGap, unchanged");
});

test("category scale, categoryWidth, outer padding and series bands are unchanged", () => {
  const layout = layoutOf({ innerPadding: 20 });
  const total = layout.plot.height;
  const step = layout.scale.category(1, 4).start - layout.scale.category(0, 4).start;
  // The category rule from §5.16 and §5.18, still exactly as it was.
  assert.ok(near(total / step, 4 - 0.2 + 2 * CATEGORY_OUTER_PADDING), "plot / step");
  assert.ok(near(layout.scale.category(0, 4).start - layout.plot.y, 0.4 * step), "leading inset");
  assert.ok(near(layout.scale.category(0, 4).size, step * 0.8), "band");
  const thickness = total / Math.max(1, 4 + 2 * CATEGORY_OUTER_PADDING);
  assert.ok(near(layout.scale.categoryWidth(4), thickness * 0.8), "categoryWidth");

  const bands = clusteredSeriesBands({ extent: 100, seriesCount: 3, gapSize: 10 });
  assert.ok(near(bands[1].offset - bands[0].offset, 100 / (3 - 0.1)), "series paddingInner still 0.1");
});

test("the value scale still spans its own plot", () => {
  const layout = layoutOf();
  const span = Math.abs(layout.scale.value(50) - layout.scale.value(0));
  assert.ok(near(span, layout.plot.width), "the gutter change must not leak into the value scale");
});
