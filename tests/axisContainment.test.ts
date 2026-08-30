import assert from "node:assert/strict";
import test from "node:test";
import {
  computeChartLayout,
  valueFraction,
  valueSpanPercent,
  type AxisLayoutStyle,
  type ChartLayout,
  type ChartLayoutInput,
  type Rect,
  type TextMeasure,
} from "../app/lib/chartLayout";

/**
 * Plot containment under explicit axis bounds.
 *
 * Setting a Y axis Start or End changes the numeric domain correctly, but the
 * marks were positioned from an unclamped `valueFraction`, so a value outside
 * the displayed range produced a percentage outside 0..100 and the column was
 * painted over the category axis below or the legend and title above.
 * Measured in the browser on the Clustered Column hero, plot height 209.7px:
 * Start=20000 put all 12 columns 139.8px below the plot, Start=30000 314.5px
 * below, End=10000 put 9 of them 754.8px above it, End=5000 1719.3px above.
 *
 * The invariant these pin: changing the bounds may change what is VISIBLE,
 * but nothing may be painted outside the plot rectangle.
 */

const OUTER: Rect = { x: 0, y: 0, width: 400, height: 300 };

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

const fixed: TextMeasure = (text, fontSize) => ({ width: text.length * 6, height: 12 * (fontSize / 10) });
const CATEGORIES = ["London", "North West", "Scotland", "Wales"];
const DATA_MAX = 82_000;

const layoutOf = (over: Partial<ChartLayoutInput> = {}): ChartLayout =>
  computeChartLayout({
    outer: OUTER,
    orientation: "vertical",
    categoryAxis: axis(),
    valueAxis: axis(),
    categories: CATEGORIES,
    dataMax: DATA_MAX,
    measureText: fixed,
    ...over,
  });

/** Every span must sit within the plot, whatever the bounds say. */
function assertContained(span: { offset: number; size: number }, label: string) {
  assert.ok(span.offset >= 0, `${label}: offset ${span.offset} must not be below the plot`);
  assert.ok(span.size >= 0, `${label}: size ${span.size} must not be negative`);
  assert.ok(
    span.offset + span.size <= 100 + 1e-9,
    `${label}: span ends at ${span.offset + span.size}%, outside the plot`,
  );
}

test("auto range: a mark spans from the baseline to its value, untouched", () => {
  const layout = layoutOf();
  const span = valueSpanPercent(layout, DATA_MAX, 0);
  assertContained(span, "auto max");
  // The tallest bar still reaches the top of the plot, as it did before.
  assert.ok(span.size > 90, `the max value should still fill the plot, got ${span.size}%`);
  assert.equal(span.offset, 0, "a zero baseline still sits on the axis");
});

test("explicit Start below the data leaves every mark inside the plot", () => {
  const layout = layoutOf({ valueAxis: axis({ start: 0 }) });
  for (const value of [0, 20_000, DATA_MAX]) {
    assertContained(valueSpanPercent(layout, value, 0), `start=0 value=${value}`);
  }
});

test("explicit Start above part of the data cuts those marks at the axis", () => {
  const layout = layoutOf({ valueAxis: axis({ start: 20_000 }) });
  // The unclamped fraction is what used to be painted: below the plot.
  assert.ok(valueFraction(layout, 0) < 0, "a zero baseline is genuinely off the plot here");

  const below = valueSpanPercent(layout, 10_000, 0);
  assertContained(below, "value fully below Start");
  assert.equal(below.size, 0, "a mark entirely outside the range has no extent");

  const crossing = valueSpanPercent(layout, DATA_MAX, 0);
  assertContained(crossing, "mark crossing Start");
  assert.equal(crossing.offset, 0, "it is cut at the axis, not floated above it");
});

test("explicit End above the data leaves every mark inside the plot", () => {
  const layout = layoutOf({ valueAxis: axis({ end: 120_000 }) });
  const span = valueSpanPercent(layout, DATA_MAX, 0);
  assertContained(span, "end above data");
  assert.ok(span.size < 100, "headroom above the tallest bar is preserved");
});

test("explicit End below part of the data cuts those marks at the top", () => {
  const layout = layoutOf({ valueAxis: axis({ end: 10_000 }) });
  assert.ok(valueFraction(layout, DATA_MAX) > 1, "the max is genuinely off the plot here");

  const span = valueSpanPercent(layout, DATA_MAX, 0);
  assertContained(span, "value above End");
  assert.equal(span.offset + span.size, 100, "it is cut at the plot top, not painted over the title");
});

test("Start and End together still contain every mark", () => {
  const layout = layoutOf({ valueAxis: axis({ start: 10_000, end: 50_000 }) });
  for (const value of [0, 5_000, 30_000, DATA_MAX, 200_000]) {
    assertContained(valueSpanPercent(layout, value, 0), `bounded value=${value}`);
  }
});

test("a stacked segment is contained the same way, from an arbitrary baseline", () => {
  // Stacked segments do not start at zero, so the clamp has to apply to both
  // ends rather than assuming one of them is the axis origin.
  const layout = layoutOf({ valueAxis: axis({ start: 20_000, end: 60_000 }) });
  const segments: Array<[number, number]> = [
    [0, 15_000],
    [15_000, 40_000],
    [40_000, 90_000],
  ];
  for (const [from, to] of segments) {
    assertContained(valueSpanPercent(layout, from, to), `segment ${from}..${to}`);
  }
  // A segment wholly below the Start contributes nothing.
  assert.equal(valueSpanPercent(layout, 0, 15_000).size, 0);
  // A segment spanning the whole visible range fills it exactly.
  const spanning = valueSpanPercent(layout, 0, 90_000);
  assert.equal(spanning.offset, 0);
  assert.equal(spanning.size, 100);
});

test("containment does not move the plot rectangle itself", () => {
  // The fix is in mark geometry, not layout: an explicit range must not
  // change the plot's size, or the chart would reflow when bounds changed.
  const auto = layoutOf();
  const bounded = layoutOf({ valueAxis: axis({ start: 20_000, end: 60_000 }) });
  assert.deepEqual(bounded.plot, auto.plot, "the plot rect is identical either way");
});

test("valueFraction stays unclamped, because furniture still needs it", () => {
  // Gridlines, tick labels and reference lines legitimately ask where a value
  // WOULD be. Clamping there would have pinned them to the plot edge.
  const layout = layoutOf({ valueAxis: axis({ start: 20_000 }) });
  assert.ok(valueFraction(layout, 0) < 0, "unclamped below");
  const high = layoutOf({ valueAxis: axis({ end: 10_000 }) });
  assert.ok(valueFraction(high, DATA_MAX) > 1, "unclamped above");
});
