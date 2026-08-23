import assert from "node:assert/strict";
import test from "node:test";
import { formatValue } from "../app/components/ChartParts";
import {
  computeChartLayout,
  type AxisLayoutStyle,
  type CartesianOrientation,
  type ChartLayout,
  type Rect,
  type TextMeasure,
} from "../app/lib/chartLayout";
import {
  constantLineCap,
  constantLineDashArray,
  constantLineGeometry,
  constantLineIsFront,
  constantLineLabelText,
  type ConstantLineStyle,
} from "../app/lib/constantLine";

/**
 * Tests for the constant-line foundation (Phase 2 task 1). Everything here
 * is pure: geometry as fractions, label text, dash patterns. The drawing
 * component in ChartParts takes these results and is verified in the
 * browser instead, because what matters about it is rendered geometry that
 * jsdom cannot report.
 */

const OUTER: Rect = { x: 0, y: 0, width: 400, height: 300 };
const CATEGORIES = ["London", "North West", "Scotland", "Wales"];
const DATA_MAX = 82_000;

const fixed =
  (perChar: number, lineHeight: number): TextMeasure =>
  (text, fontSize) => ({ width: text.length * perChar, height: lineHeight * (fontSize / 10) });

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

const layoutFor = (orientation: CartesianOrientation, valueAxis = axis()): ChartLayout =>
  computeChartLayout({
    outer: OUTER,
    orientation,
    categoryAxis: axis(),
    valueAxis,
    categories: CATEGORIES,
    dataMax: DATA_MAX,
    measureText: fixed(6, 12),
  });

/** Every field resolved, so a test only states what it is actually about. */
const line = (over: Partial<ConstantLineStyle> = {}): ConstantLineStyle => ({
  show: true,
  lineColor: "#118DFF",
  style: "solid",
  width: 1,
  transparency: 0,
  value: 41_000,
  displayName: "",
  position: "back",
  autoScale: false,
  dashArray: "",
  dashCap: "none",
  shadeShow: false,
  shadeColor: "#E3E3E3",
  shadeColorMatchStroke: false,
  shadeRegion: "before",
  shadeTransparency: 0,
  dataLabelShow: false,
  dataLabelColor: "#252423",
  dataLabelText: "Value",
  dataLabelDisplayUnits: 0,
  dataLabelDecimalPoints: 0,
  dataLabelHorizontalPosition: "left",
  dataLabelVerticalPosition: "above",
  ...over,
});

const near = (a: number, b: number, tolerance = 1e-9): boolean => Math.abs(a - b) <= tolerance;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

test("the line's fraction comes from the value scale, on both orientations", () => {
  // The whole point of doing this in phase 2: the coordinate is the scale's,
  // not a percentage of a sample maximum. Half of 0..82000 is half the plot.
  for (const orientation of ["vertical", "horizontal"] as CartesianOrientation[]) {
    const layout = layoutFor(orientation);
    for (const [value, expected] of [
      [0, 0],
      [20_500, 0.25],
      [41_000, 0.5],
      [82_000, 1],
    ] as Array<[number, number]>) {
      const geometry = constantLineGeometry(line({ value }), layout, axis(), DATA_MAX);
      assert.ok(near(geometry.fraction, expected), `${orientation}: ${value} -> ${geometry.fraction}`);
      assert.equal(geometry.onPlot, true, `${orientation}: ${value} should be on the plot`);
    }
  }
});

test("a pinned axis range moves the line, and both edges still count as on the plot", () => {
  const pinned = axis({ start: "0", end: "100000" });
  const layout = layoutFor("horizontal", pinned);
  assert.ok(near(constantLineGeometry(line({ value: 82_000 }), layout, pinned, DATA_MAX).fraction, 0.82));
  assert.ok(near(constantLineGeometry(line({ value: 25_000 }), layout, pinned, DATA_MAX).fraction, 0.25));
  for (const value of [0, 100_000]) {
    assert.equal(constantLineGeometry(line({ value }), layout, pinned, DATA_MAX).onPlot, true);
  }
});

test("inverting the value axis mirrors the line without any manual swap", () => {
  const normal = axis();
  const inverted = axis({ invertAxis: true });
  for (const orientation of ["vertical", "horizontal"] as CartesianOrientation[]) {
    for (const value of [0, 20_500, 41_000, 82_000]) {
      const a = constantLineGeometry(line({ value }), layoutFor(orientation, normal), normal, DATA_MAX);
      const b = constantLineGeometry(line({ value }), layoutFor(orientation, inverted), inverted, DATA_MAX);
      assert.ok(near(a.fraction, 1 - b.fraction), `${orientation}: ${value} did not mirror`);
    }
  }
});

test("a value outside the displayed range is not drawn, but its shade still is", () => {
  // Power BI's auto axis would widen to include the line. A preview must not:
  // letting a decoration change the range would move the bars and gridlines
  // too. So the range stands and the line goes out of view — while "after the
  // line" stays a real region and gets shaded to the plot edge.
  const pinned = axis({ start: "20000", end: "60000" });
  const layout = layoutFor("horizontal", pinned);

  const below = constantLineGeometry(
    line({ value: 0, shadeShow: true, shadeRegion: "after" }),
    layout,
    pinned,
    DATA_MAX,
  );
  assert.equal(below.onPlot, false, "a value under the range must not be drawn");
  assert.deepEqual(below.shade, { from: 0, to: 1 }, "everything visible is after it");

  const above = constantLineGeometry(
    line({ value: 90_000, shadeShow: true, shadeRegion: "before" }),
    layout,
    pinned,
    DATA_MAX,
  );
  assert.equal(above.onPlot, false, "a value over the range must not be drawn");
  assert.deepEqual(above.shade, { from: 0, to: 1 }, "everything visible is before it");

  // And the opposite region is empty rather than a zero-width element.
  assert.equal(
    constantLineGeometry(line({ value: 0, shadeShow: true, shadeRegion: "before" }), layout, pinned, DATA_MAX).shade,
    null,
  );
});

// ---------------------------------------------------------------------------
// Shading
// ---------------------------------------------------------------------------

test("before shades towards the axis start and after towards its end", () => {
  const layout = layoutFor("horizontal");
  const before = constantLineGeometry(
    line({ value: 41_000, shadeShow: true, shadeRegion: "before" }),
    layout,
    axis(),
    DATA_MAX,
  );
  const after = constantLineGeometry(
    line({ value: 41_000, shadeShow: true, shadeRegion: "after" }),
    layout,
    axis(),
    DATA_MAX,
  );
  assert.deepEqual(before.shade, { from: 0, to: 0.5 });
  assert.deepEqual(after.shade, { from: 0.5, to: 1 });
  // The two must partition the plot at the line, not overlap or leave a gap.
  assert.equal(before.shade?.to, after.shade?.from);
});

test("BEFORE/AFTER follow the axis direction, not left and right", () => {
  // The trap this guards: "before" is the side towards the axis's START.
  // Inverting puts the start on the other side of the plot, so the shaded
  // region must cross over with it. It falls out of the scale — both bounds
  // go through valueFraction — so there is no branch to get backwards.
  const inverted = axis({ invertAxis: true });
  const layout = layoutFor("horizontal", inverted);
  const before = constantLineGeometry(
    line({ value: 41_000, shadeShow: true, shadeRegion: "before" }),
    layout,
    inverted,
    DATA_MAX,
  );
  const after = constantLineGeometry(
    line({ value: 41_000, shadeShow: true, shadeRegion: "after" }),
    layout,
    inverted,
    DATA_MAX,
  );
  assert.deepEqual(before.shade, { from: 0.5, to: 1 }, "inverted, before must shade the far side");
  assert.deepEqual(after.shade, { from: 0, to: 0.5 }, "inverted, after must shade the near side");

  // An asymmetric value proves it is mirroring rather than coincidentally
  // symmetric about the midpoint.
  const low = constantLineGeometry(
    line({ value: 20_500, shadeShow: true, shadeRegion: "before" }),
    layout,
    inverted,
    DATA_MAX,
  );
  assert.deepEqual(low.shade, { from: 0.75, to: 1 });
});

test("shading is off unless asked for, and region none means none", () => {
  const layout = layoutFor("horizontal");
  assert.equal(constantLineGeometry(line({ shadeShow: false }), layout, axis(), DATA_MAX).shade, null);
  assert.equal(
    constantLineGeometry(line({ shadeShow: true, shadeRegion: "none" }), layout, axis(), DATA_MAX).shade,
    null,
  );
  // A line sitting on the start edge has nothing before it.
  assert.equal(
    constantLineGeometry(line({ value: 0, shadeShow: true, shadeRegion: "before" }), layout, axis(), DATA_MAX).shade,
    null,
  );
});

// ---------------------------------------------------------------------------
// Z-order
// ---------------------------------------------------------------------------

test("position selects a paint slot, defaulting to behind the data", () => {
  assert.equal(constantLineIsFront(line({ position: "front" })), true);
  assert.equal(constantLineIsFront(line({ position: "back" })), false);
  // Unknown or absent values must not float the line over the bars.
  assert.equal(constantLineIsFront(line({ position: "" })), false);
  assert.equal(constantLineIsFront(line({ position: "Behind" })), false);
});

// ---------------------------------------------------------------------------
// Label text
// ---------------------------------------------------------------------------

test("the three text modes are each visibly different", () => {
  const named = { displayName: "Target", value: 41_000, dataLabelDisplayUnits: "1000" as const };
  assert.equal(constantLineLabelText(line({ ...named, dataLabelText: "Value" }), formatValue), "41K");
  assert.equal(constantLineLabelText(line({ ...named, dataLabelText: "Name" }), formatValue), "Target");
  assert.equal(constantLineLabelText(line({ ...named, dataLabelText: "ValueAndName" }), formatValue), "Target 41K");
});

test("a blank name falls back to the value rather than to an empty label", () => {
  const blank = { displayName: "", value: 41_000, dataLabelDisplayUnits: "1000" as const };
  assert.equal(constantLineLabelText(line({ ...blank, dataLabelText: "Name" }), formatValue), "41K");
  assert.equal(constantLineLabelText(line({ ...blank, dataLabelText: "ValueAndName" }), formatValue), "41K");
  // Whitespace is not a name either.
  assert.equal(constantLineLabelText(line({ ...blank, displayName: "   ", dataLabelText: "Name" }), formatValue), "41K");
});

test("the label uses the chart's own formatter, so units and precision agree", () => {
  assert.equal(
    constantLineLabelText(line({ value: 41_000, dataLabelDisplayUnits: "1000", dataLabelDecimalPoints: 2 }), formatValue),
    "41.00K",
  );
  // "None" must not abbreviate, exactly as it does not on the axis.
  assert.equal(
    constantLineLabelText(line({ value: 41_000, dataLabelDisplayUnits: "1", dataLabelDecimalPoints: 0 }), formatValue),
    "41,000",
  );
});

// ---------------------------------------------------------------------------
// Dash pattern
// ---------------------------------------------------------------------------

test("named line styles produce their built-in patterns, and solid produces none", () => {
  assert.equal(constantLineDashArray(line({ style: "solid" })), undefined);
  assert.equal(constantLineDashArray(line({ style: "dashed" })), "6 4");
  assert.equal(constantLineDashArray(line({ style: "dotted" })), "1.5 3");
  // An unrecognised style draws solid rather than falling through to a sibling.
  assert.equal(constantLineDashArray(line({ style: "" })), undefined);
});

test("style is the controlling property: SOLID ignores stale custom state", () => {
  // The defect this guards: a theme keeps values for properties that are not
  // currently active. A dashArray left behind from an earlier Custom setting
  // must not turn the selected Solid style into a dashed line.
  const stale = line({ style: "solid", dashArray: "4 2", autoScale: true, dashCap: "round", width: 4 });
  assert.equal(constantLineDashArray(stale), undefined, "solid must stay solid");
  assert.equal(constantLineCap(stale), "butt", "a stale custom cap must not apply to solid");
});

test("style is the controlling property: DASHED ignores a stale dashArray", () => {
  const stale = line({ style: "dashed", dashArray: "10 1", dashCap: "round" });
  assert.equal(constantLineDashArray(stale), "6 4", "the built-in dashed pattern wins");
  assert.equal(constantLineCap(stale), "butt", "a stale custom cap must not reshape named dashed");
});

test("style is the controlling property: DOTTED ignores a stale dashArray", () => {
  const stale = line({ style: "dotted", dashArray: "10 1", dashCap: "square" });
  assert.equal(constantLineDashArray(stale), "1.5 3", "the built-in dotted pattern wins");
  assert.equal(constantLineCap(stale), "butt", "a stale custom cap must not reshape named dotted");
});

test("CUSTOM is the only style that reads dashArray and dashCap", () => {
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "4 2 1 2" })), "4 2 1 2");
  assert.equal(constantLineCap(line({ style: "custom", dashCap: "round" })), "round");
  assert.equal(constantLineCap(line({ style: "custom", dashCap: "square" })), "square");
  assert.equal(constantLineCap(line({ style: "custom", dashCap: "none" })), "butt");
  // Commas and loose spacing are separators, as in the editor's text field.
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: " 4,2 , 1 " })), "4 2 1");
});

test("a custom style with no usable pattern renders solid, not generic dashed", () => {
  // Substituting the named Dashed pattern would show the author a pattern they
  // never wrote. An empty custom pattern is genuinely empty.
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "" })), undefined);
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "   " })), undefined);
});

test("an invalid dash array is rejected whole, never emitted as invalid SVG", () => {
  // SVG's own rule: a list containing a negative value is in error and the
  // stroke renders as if none were specified. Emitting the survivors would
  // draw a pattern the author did not write.
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "4 -2" })), undefined);
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "-4" })), undefined);
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "4 2 -1 2" })), undefined);
  // Unparseable entries are rejected the same way, whole rather than filtered.
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "abc" })), undefined);
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "4 abc 2" })), undefined);
});

test("zeros survive the parser, because SVG patterns use them", () => {
  // `0 6` with round caps is how a dotted run is built, and dash-dot patterns
  // rely on zero-length dashes too, so dropping them would break real input.
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "0 6" })), "0 6");
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "6 3 0 3" })), "6 3 0 3");
  // All-zero is the exception: SVG renders that as a solid line.
  assert.equal(constantLineDashArray(line({ style: "custom", dashArray: "0 0" })), undefined);
});

test("autoScale scales whichever pattern is active, and solid has none to scale", () => {
  assert.equal(constantLineDashArray(line({ style: "dashed", width: 3, autoScale: true })), "18 12");
  assert.equal(constantLineDashArray(line({ style: "dotted", width: 2, autoScale: true })), "3 6");
  assert.equal(
    constantLineDashArray(line({ style: "custom", dashArray: "4 2 1 2", width: 4, autoScale: true })),
    "16 8 4 8",
  );
  // Off, the pattern is the absolute pixel lengths the schema describes.
  assert.equal(constantLineDashArray(line({ style: "dashed", width: 3, autoScale: false })), "6 4");
  // A hairline must not shrink the pattern to nothing.
  assert.equal(constantLineDashArray(line({ style: "dashed", width: 0, autoScale: true })), "6 4");
  // And there is nothing to scale on a solid line, stale autoScale or not.
  assert.equal(constantLineDashArray(line({ style: "solid", width: 4, autoScale: true })), undefined);
});

// ---------------------------------------------------------------------------
// The registry's Value bound
// ---------------------------------------------------------------------------

test("a value beyond the editor's slider range still positions correctly", () => {
  // The slider's min/max are a UI affordance, not a constraint on the data:
  // an imported theme may carry any number, and nothing on the read path
  // clamps it. The geometry must handle that rather than assume the bound.
  const pinned = axis({ start: "0", end: "1000000" });
  const layout = layoutFor("horizontal", pinned);
  const geometry = constantLineGeometry(line({ value: 750_000 }), layout, pinned, DATA_MAX);
  assert.ok(near(geometry.fraction, 0.75));
  assert.equal(geometry.onPlot, true);
});

test("a non-numeric value is inert rather than NaN", () => {
  // xAxisReferenceLine.value is typed as a string and may hold a date. This
  // module must not emit NaN geometry when handed one before that group is
  // properly supported.
  const layout = layoutFor("horizontal");
  const geometry = constantLineGeometry(
    line({ value: "2024-01-01", shadeShow: true }),
    layout,
    axis(),
    DATA_MAX,
  );
  assert.equal(geometry.onPlot, false);
  assert.equal(geometry.shade, null);
  assert.ok(Number.isFinite(geometry.fraction));
});
