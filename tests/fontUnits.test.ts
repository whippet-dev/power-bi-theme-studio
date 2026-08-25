import assert from "node:assert/strict";
import test from "node:test";
import { PX_PER_PT, themeFontSizeToCssPx } from "../app/lib/fontUnits";
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { themeLayers } from "../app/lib/properties";
import { BAR_CHART_BOX, computePreviewCartesianLayout } from "../app/components/previews/cartesianLayout";
import { computeChartLayout } from "../app/lib/chartLayout";
import { formatValue } from "../app/components/ChartParts";
import { resolveTheme, type PowerBITheme } from "../app/lib/theme";

/**
 * Power BI font sizes are points; CSS wants pixels.
 *
 * The ratio under test is not inferred from documentation — it is
 * `PixelConverter.PxPtRatio` from Power BI Desktop's own bundle. See
 * `app/lib/fontUnits.ts` for the transcription and the two call paths that
 * feed a theme number into it.
 */

const near = (a: number, b: number, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;

test("the ratio is Power BI's own PxPtRatio", () => {
  assert.equal(PX_PER_PT, 4 / 3);
  // Which is also the CSS ratio: 1pt = 1/72in, 1px = 1/96in.
  assert.ok(near(PX_PER_PT, 96 / 72));
});

test("theme point sizes convert to the pixel sizes Power BI renders", () => {
  // Values taken straight from running Power BI's own extracted converter.
  const cases: Array<[number, number]> = [
    [6, 8],
    [9, 12],
    [10, 13.333333333333332],
    [10.5, 14],
    [12, 16],
    [14, 18.666666666666664],
    [24, 32],
    [45, 60],
  ];
  for (const [pt, px] of cases) {
    assert.ok(near(themeFontSizeToCssPx(pt), px), `${pt}pt should be ${px}px, got ${themeFontSizeToCssPx(pt)}`);
  }
});

test("the base themes' own sizes land on the pixel values they were designed for", () => {
  // Corroboration, not coincidence. Fluent 2 is a pixel-designed system and
  // stores its body text as 10.5 precisely because that is 14px exactly.
  assert.ok(near(themeFontSizeToCssPx(10.5), 14), "Fluent 2's label");
  assert.ok(near(themeFontSizeToCssPx(12), 16), "Classic 2026's title");
  assert.ok(near(themeFontSizeToCssPx(24), 32), "Classic 2026's callout");
});

test("fractions are preserved rather than rounded", () => {
  // Rounding here would reintroduce the measurement/rendering disagreement
  // this boundary exists to prevent.
  assert.ok(near(themeFontSizeToCssPx(9.45), 12.6));
  assert.ok(near(themeFontSizeToCssPx(10.5 * 0.9), 12.6), "Fluent's smallLightLabel");
  assert.notEqual(themeFontSizeToCssPx(10), 13);
  assert.notEqual(themeFontSizeToCssPx(10), 13.33);
});

test("a size outside the schema's own bounds is passed through, not invented", () => {
  // The schema allows 8..60. Anything non-finite or non-positive comes from a
  // theme that broke that, and hiding it behind a fabricated size would be
  // worse than showing it.
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(
      Object.is(themeFontSizeToCssPx(bad), bad),
      true,
      `${String(bad)} should pass through untouched`,
    );
  }
});

test("conversion is pure: it cannot touch the theme it came from", () => {
  const theme: PowerBITheme = {
    name: "t",
    textClasses: { label: { fontFace: "Arial", fontSize: 10, color: "#000000" } },
    visualStyles: {},
  };
  const before = JSON.stringify(theme);
  const label = theme.textClasses!.label as { fontSize: number };
  themeFontSizeToCssPx(label.fontSize);
  assert.equal(JSON.stringify(theme), before);
});

// ---------------------------------------------------------------------------
// The boundary
// ---------------------------------------------------------------------------

const LOUD: PowerBITheme = {
  name: "Loud",
  textClasses: {
    callout: { fontFace: "Arial", fontSize: 40, color: "#111111" },
    header: { fontFace: "Arial", fontSize: 20, color: "#222222" },
    title: { fontFace: "Arial", fontSize: 22, color: "#333333" },
    label: { fontFace: "Arial", fontSize: 15, color: "#0000FF" },
  },
  visualStyles: {},
};

test("property resolution still returns RAW theme values", () => {
  // The editor and the exporter both read these. If resolution converted, a
  // user who typed 10 would see 13.333 and export it.
  const src = themeLayers(LOUD, getBaseTheme("classic2026"));
  const s = resolveBarChartStyle(src, resolveTheme(src.roots));
  assert.equal(s.categoryAxis.fontSize, 13.5, "smallLightLabel: 15 x 0.9, still points");
  assert.equal(s.categoryAxis.titleFontSize, 22, "title, in points");
  assert.equal(s.valueAxis.fontSize, 13.5, "smallLightLabel: 15 x 0.9, still points");
  assert.notEqual(s.categoryAxis.fontSize, 18, "not 13.5 x 4/3");
});

test("BOUNDARY: the preview layout equals the engine driven with CSS pixels", () => {
  // The invariant that matters, stated as an exact equality rather than a
  // comparison of two inputs through the same pipeline — that weaker form
  // passes even when the conversion is removed, because both sides move
  // together.
  //
  // computePreviewCartesianLayout(style-in-points) must produce byte-identical
  // geometry to computeChartLayout(style-in-CSS-pixels). If the engine sized a
  // gutter against 15 while the browser drew 20px of text, every cartesian
  // chart would drift.
  const src = themeLayers(LOUD, getBaseTheme("classic2026"));
  const style = resolveBarChartStyle(src, resolveTheme(src.roots));
  const categories = ["London", "North West", "Scotland", "Wales"];

  assert.equal(style.categoryAxis.fontSize, 13.5, "the resolved value is still points");
  assert.ok(near(themeFontSizeToCssPx(13.5), 18), "which renders as 18px");

  const viaPreview = computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: style.categoryAxis,
    valueAxis: style.valueAxis,
    categories,
    dataMax: 82_000,
  });

  const inPixels = <T extends { fontSize: number; titleFontSize: number }>(axis: T): T => ({
    ...axis,
    fontSize: themeFontSizeToCssPx(axis.fontSize),
    titleFontSize: themeFontSizeToCssPx(axis.titleFontSize),
  });

  const viaEngine = computeChartLayout({
    outer: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: inPixels({ ...style.categoryAxis, titleText: String(style.categoryAxis.titleText) }),
    valueAxis: inPixels({ ...style.valueAxis, titleText: String(style.valueAxis.titleText) }),
    categories,
    dataMax: 82_000,
    innerPadding: 0,
    formatTick: (value) => formatValue(value, style.valueAxis.labelDisplayUnits, style.valueAxis.labelPrecision),
  });

  assert.deepEqual(viaPreview.categoryAxis, viaEngine.categoryAxis, "category gutter");
  assert.deepEqual(viaPreview.valueAxis, viaEngine.valueAxis, "value gutter");
  assert.deepEqual(viaPreview.plot, viaEngine.plot, "plot rect");
});

test("BOUNDARY: the preview layout does NOT equal the engine driven with raw points", () => {
  // The other half. Without this, the equality above would still pass if the
  // conversion were deleted from both sides at once.
  const src = themeLayers(LOUD, getBaseTheme("classic2026"));
  const style = resolveBarChartStyle(src, resolveTheme(src.roots));
  const categories = ["London", "North West", "Scotland", "Wales"];

  const viaPreview = computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: style.categoryAxis,
    valueAxis: style.valueAxis,
    categories,
    dataMax: 82_000,
  });

  const unconverted = computeChartLayout({
    outer: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: { ...style.categoryAxis, titleText: String(style.categoryAxis.titleText) },
    valueAxis: { ...style.valueAxis, titleText: String(style.valueAxis.titleText) },
    categories,
    dataMax: 82_000,
    innerPadding: 0,
    formatTick: (value) => formatValue(value, style.valueAxis.labelDisplayUnits, style.valueAxis.labelPrecision),
  });

  assert.notDeepEqual(
    viaPreview.categoryAxis,
    unconverted.categoryAxis,
    "the preview must not be measuring raw point sizes",
  );
  assert.ok(
    (viaPreview.categoryAxis?.width ?? 0) > (unconverted.categoryAxis?.width ?? 0),
    "and the converted gutter must be the wider one",
  );
});
