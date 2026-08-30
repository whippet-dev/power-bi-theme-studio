import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CategoryGridlines,
  gridlineLineCap,
  parseGridlineDashArray,
  ScaledGridlines,
  type AxisStyle,
} from "../app/components/ChartParts";
import {
  computeChartLayout,
  type AxisLayoutStyle,
  type CartesianOrientation,
  type ChartLayout,
  type Rect,
  type TextMeasure,
} from "../app/lib/chartLayout";

/**
 * Gridlines as real strokes.
 *
 * A CSS border can express colour, width, transparency and a named style,
 * and nothing else, so `gridlineDashArray` collapsed to "dashed" whatever it
 * said and `gridlineDashCap` had no equivalent at all. These pin the
 * properties that became representable, and the ones that must not have
 * changed while they did.
 */

const OUTER: Rect = { x: 0, y: 0, width: 400, height: 300 };
const CATEGORIES = ["London", "North West", "Scotland", "Wales"];
const measure: TextMeasure = (text, fontSize) => ({ width: text.length * 6, height: 12 * (fontSize / 10) });

const layoutAxis = (): AxisLayoutStyle => ({
  show: true,
  fontSize: 10,
  fontFamily: "Segoe UI",
  showAxisTitle: false,
  titleText: "",
  titleFontSize: 9,
  titleFontFamily: "Segoe UI",
});

const layoutOf = (orientation: CartesianOrientation = "vertical"): ChartLayout =>
  computeChartLayout({
    outer: OUTER,
    orientation,
    categoryAxis: layoutAxis(),
    valueAxis: layoutAxis(),
    categories: CATEGORIES,
    dataMax: 82_000,
    measureText: measure,
  });

const axisOf = (over: Partial<AxisStyle> = {}): AxisStyle =>
  ({
    show: true,
    fontSize: 10,
    fontFamily: "Segoe UI",
    fontColor: "#605E5C",
    bold: false,
    italic: false,
    underline: false,
    showAxisTitle: false,
    titleText: "",
    titleColor: "#605E5C",
    titleFontFamily: "Segoe UI",
    titleFontSize: 9,
    titleBold: false,
    titleItalic: false,
    titleUnderline: false,
    gridlineShow: true,
    gridlineColor: "#E1DFDD",
    gridlineThickness: 1,
    gridlineStyle: "solid",
    gridlineTransparency: 0,
    ...over,
  }) as AxisStyle;

const scaled = (over: Partial<AxisStyle> = {}, orientation: CartesianOrientation = "vertical") =>
  renderToStaticMarkup(<ScaledGridlines axis={axisOf(over)} layout={layoutOf(orientation)} />);

// ---------------------------------------------------------------------------
// dashArray — proven semantics: SVG stroke-dasharray, in pixels
// ---------------------------------------------------------------------------

test("a dash array is parsed as the pixel lengths the schema documents", () => {
  assert.equal(parseGridlineDashArray("4 2"), "4 2");
  assert.equal(parseGridlineDashArray("6,3"), "6 3", "commas are valid SVG separators too");
  assert.equal(parseGridlineDashArray("  8   4  "), "8 4");
  assert.equal(parseGridlineDashArray("5"), "5", "a single length is a legal repeating pattern");
  assert.equal(parseGridlineDashArray("2 4 8 4"), "2 4 8 4");
});

test("an unusable dash array falls back rather than painting nothing", () => {
  assert.equal(parseGridlineDashArray(undefined), null);
  assert.equal(parseGridlineDashArray(""), null);
  assert.equal(parseGridlineDashArray("   "), null);
  assert.equal(parseGridlineDashArray("dashed"), null, "words are not lengths");
  assert.equal(parseGridlineDashArray("4 -2"), null, "a negative length is not drawable");
  assert.equal(parseGridlineDashArray("0 0"), null, "all-zero would paint nothing at all");
});

test("two different dash arrays produce two different patterns", () => {
  // The reported symptom: every value behaved the same, because any
  // non-empty string became `border-style: dashed`.
  const a = scaled({ gridlineDashArray: "4 2" });
  const b = scaled({ gridlineDashArray: "12 6" });
  assert.match(a, /stroke-dasharray="4 2"/);
  assert.match(b, /stroke-dasharray="12 6"/);
  assert.notEqual(a, b);
});

test("an explicit dash array wins over the named style, and an invalid one does not", () => {
  assert.match(scaled({ gridlineStyle: "solid", gridlineDashArray: "3 3" }), /stroke-dasharray="3 3"/);
  // Invalid: fall back to the named style's own pattern, not to nothing.
  const invalid = scaled({ gridlineStyle: "dotted", gridlineDashArray: "nonsense" });
  assert.match(invalid, /stroke-dasharray/, "the named style still applies");
  assert.doesNotMatch(invalid, /nonsense/, "the unusable value is never emitted as markup");
});

// ---------------------------------------------------------------------------
// dashCap — proven semantics: the schema's three values are stroke-linecap
// ---------------------------------------------------------------------------

test("dash cap maps only the three values the schema defines", () => {
  assert.equal(gridlineLineCap("none"), "butt", "Flat is butt");
  assert.equal(gridlineLineCap("round"), "round");
  assert.equal(gridlineLineCap("square"), "square");
  assert.equal(gridlineLineCap("Round"), "round", "case is not significant");
  // No invented aliases: anything else is SVG's own default.
  assert.equal(gridlineLineCap("flat"), "butt");
  assert.equal(gridlineLineCap(undefined), "butt");
  assert.equal(gridlineLineCap(""), "butt");
});

test("a round cap reaches the rendered stroke", () => {
  assert.match(scaled({ gridlineDashCap: "round", gridlineDashArray: "1 6" }), /stroke-linecap="round"/);
  assert.match(scaled({ gridlineDashCap: "square" }), /stroke-linecap="square"/);
});

// ---------------------------------------------------------------------------
// What must not have changed
// ---------------------------------------------------------------------------

test("show, colour, width and transparency still work", () => {
  assert.equal(scaled({ gridlineShow: false }), "", "hidden means nothing is rendered");
  assert.equal(scaled({ gridlineThickness: 0 }), "", "a zero-width gridline paints nothing");

  const markup = scaled({ gridlineColor: "#FF0000", gridlineThickness: 3, gridlineTransparency: 50 });
  assert.match(markup, /stroke-width="3"/);
  // Transparency still goes through hexWithAlpha, as it did for the border,
  // which yields an rgba() colour rather than an alpha-suffixed hex.
  assert.match(markup, /stroke="rgba\(255, 0, 0, 0\.5\)"/, "transparency is carried on the colour");
});

test("a solid gridline carries no dash pattern at all", () => {
  const markup = scaled({ gridlineStyle: "solid" });
  assert.match(markup, /<line/);
  assert.doesNotMatch(markup, /stroke-dasharray/, "solid must look exactly as it did");
});

test("named dashed and dotted styles remain distinguishable", () => {
  const dashed = scaled({ gridlineStyle: "dashed" });
  const dotted = scaled({ gridlineStyle: "dotted" });
  assert.match(dashed, /stroke-dasharray/);
  assert.match(dotted, /stroke-dasharray/);
  assert.notEqual(dashed, dotted);
});

test("the layer is inert and one line is drawn per tick", () => {
  const layout = layoutOf();
  const markup = renderToStaticMarkup(<ScaledGridlines axis={axisOf()} layout={layout} />);
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /class="chart-gridline-layer"/);
  assert.equal((markup.match(/<line/g) ?? []).length, layout.scale.ticks.length);
});

// ---------------------------------------------------------------------------
// Orientation
// ---------------------------------------------------------------------------

test("value gridlines run across the plot, square to their own axis", () => {
  // A column chart's value axis is vertical, so its gridlines are horizontal.
  assert.match(scaled({}, "vertical"), /x1="0%" x2="100%"/);
  // A bar chart's value axis is horizontal, so they rotate with it.
  assert.match(scaled({}, "horizontal"), /y1="0%" y2="100%"/);
});

test("category gridlines rotate with the category axis", () => {
  const column = renderToStaticMarkup(
    <CategoryGridlines axis={axisOf()} layout={layoutOf("vertical")} count={CATEGORIES.length} />,
  );
  const bar = renderToStaticMarkup(
    <CategoryGridlines axis={axisOf()} layout={layoutOf("horizontal")} count={CATEGORIES.length} />,
  );
  // Columns run left to right, so their category gridlines are vertical.
  assert.match(column, /y1="0%" y2="100%"/);
  // Bars run top to bottom, so theirs are horizontal.
  assert.match(bar, /x1="0%" x2="100%"/);

  // One per category, and none when there are none.
  assert.equal((column.match(/<line/g) ?? []).length, CATEGORIES.length);
  assert.equal(renderToStaticMarkup(<CategoryGridlines axis={axisOf()} layout={layoutOf()} count={0} />), "");
});

test("category gridlines honour the same stroke properties as value ones", () => {
  const markup = renderToStaticMarkup(
    <CategoryGridlines
      axis={axisOf({ gridlineDashArray: "9 3", gridlineDashCap: "round", gridlineColor: "#00FF00" })}
      layout={layoutOf("vertical")}
      count={CATEGORIES.length}
    />,
  );
  assert.match(markup, /stroke-dasharray="9 3"/);
  assert.match(markup, /stroke-linecap="round"/);
  assert.match(markup, /stroke="rgba\(0, 255, 0, 1\)"/);
});
