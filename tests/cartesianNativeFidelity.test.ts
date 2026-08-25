import assert from "node:assert/strict";
import test from "node:test";
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { resolveColumnChartStyle } from "../app/lib/columnChartProperties";
import { resolveLineChartStyle } from "../app/lib/lineChartProperties";
import { resolveStackedBarChartStyle } from "../app/lib/stackedBarChartProperties";
import { resolveStackedColumnChartStyle } from "../app/lib/stackedColumnChartProperties";
import { getBaseTheme, type BaseThemeId } from "../app/lib/baseThemes";
import { themeLayers } from "../app/lib/properties";
import { themeFontSizeToCssPx } from "../app/lib/fontUnits";
import { CATEGORY_INNER_PADDING_DEFAULT, clusteredSeriesBands } from "../app/lib/seriesBands";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

/**
 * The two fallbacks corrected against Power BI Desktop's own output.
 *
 * Native Classic 2026, Clustered bar, synthetic fixture, twelve visual sizes
 * (POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.12 and §5.13):
 *
 * - category axis labels render at **12px** at every size, as do value axis
 *   labels, while the legend renders at 13.333px and axis titles at 16px;
 * - Power BI's own "Space between categories" control reads **20**.
 *
 * These tests state the resolved values those measurements imply, so a
 * regression shows up as a failure naming the native number.
 */

const EMPTY: PowerBITheme = { name: "empty" };

const styleOf = (theme: PowerBITheme, base: BaseThemeId) => {
  const src = themeLayers(theme, getBaseTheme(base));
  return resolveBarChartStyle(src, resolveTheme(src.roots));
};

/** Every cartesian visual, resolved the same way, keyed by its theme name. */
const CARTESIAN = [
  { name: "Clustered Bar", visual: "clusteredBarChart", resolve: resolveBarChartStyle },
  { name: "Clustered Column", visual: "clusteredColumnChart", resolve: resolveColumnChartStyle },
  { name: "Stacked Bar", visual: "barChart", resolve: resolveStackedBarChartStyle },
  { name: "Stacked Column", visual: "columnChart", resolve: resolveStackedColumnChartStyle },
  { name: "Line", visual: "lineChart", resolve: resolveLineChartStyle },
] as const;

// ---------------------------------------------------------------------------
// Category axis label: 10pt -> 9pt
// ---------------------------------------------------------------------------

test("NATIVE: Classic 2026 resolves the category axis label to the 12px Power BI draws", () => {
  const s = styleOf(EMPTY, "classic2026");
  assert.equal(s.categoryAxis.fontSize, 9, "points, as themes store them");
  assert.equal(themeFontSizeToCssPx(s.categoryAxis.fontSize), 12, "the measured native size");
});

test("NATIVE: both axis labels match, as they do natively", () => {
  // Native Classic 2026 renders category and value axis labels at the same
  // 12px. Theme Studio used to render 13.333 and 12.
  const s = styleOf(EMPTY, "classic2026");
  assert.equal(s.categoryAxis.fontSize, s.valueAxis.fontSize);
});

test("NATIVE: the legend keeps the unscaled label class", () => {
  // The same sweep measured the legend at 13.333px = 10pt. If the category
  // fix had been applied to the primary class instead of the role, this
  // would have moved with it.
  const s = styleOf(EMPTY, "classic2026");
  assert.equal(s.legend.fontSize, 10);
  assert.equal(themeFontSizeToCssPx(s.legend.fontSize), 13.333333333333332);
});

test("NATIVE: axis titles keep the title class", () => {
  // Measured at 16px = 12pt on the same visuals.
  const s = styleOf(EMPTY, "classic2026");
  assert.equal(s.categoryAxis.titleFontSize, 12);
  assert.equal(themeFontSizeToCssPx(s.categoryAxis.titleFontSize), 16);
});

for (const entry of CARTESIAN) {
  test(`${entry.name} inherits the corrected category axis fallback`, () => {
    // The role is shared, so this is one correction rather than five.
    const src = themeLayers(EMPTY, getBaseTheme("classic2026"));
    const s = entry.resolve(src, resolveTheme(src.roots));
    assert.equal(s.categoryAxis.fontSize, 9);
  });
}

test("an explicit visualStyles fontSize still beats the corrected fallback", () => {
  const custom = updateThemeValue(
    EMPTY,
    ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontSize"],
    31,
  );
  assert.equal(styleOf(custom, "classic2026").categoryAxis.fontSize, 31);
});

test("Fluent 2 is untouched: its own wildcard declares 10.5pt", () => {
  // Fluent measured 14px natively at 600x600, which is its declared 10.5pt.
  // It never reaches the text-class layer, so this correction cannot move it.
  const s = styleOf(EMPTY, "fluent2");
  assert.equal(s.categoryAxis.fontSize, 10.5);
  assert.equal(themeFontSizeToCssPx(s.categoryAxis.fontSize), 14);
});

test("Classic 2018 resolves from its own declared classes, not from Classic 2026", () => {
  // 2018 declares label 10pt like 2026 and no axis typography, so the same
  // silent path gives it 9pt. Native 2018 renders 10.667px = 8pt, which no
  // theme value we hold explains - the two Classic bases have identical
  // textClasses yet render differently (§5.13). Recorded, not guessed at:
  // this is closer than the 13.333px it produced before, and the residual
  // belongs to whatever else distinguishes 2018.
  const s = styleOf(EMPTY, "classic2018");
  assert.equal(s.categoryAxis.fontSize, 9);
  assert.notEqual(themeFontSizeToCssPx(s.categoryAxis.fontSize), 10.666666666666666);
});

test("a custom theme's own label class still drives the derivation", () => {
  const custom: PowerBITheme = {
    name: "custom",
    textClasses: { label: { fontSize: 20, fontFace: "Arial", color: "#000000" } },
  } as PowerBITheme;
  // 20 x 0.9 - and this is the case the native experiment actually tested:
  // with the report theme's primary text at 20pt, Power BI's own category
  // axis control reads 18 and it renders 24px. This assertion is the same
  // number, reached the same way.
  assert.equal(styleOf(custom, "classic2026").categoryAxis.fontSize, 18);
});

// ---------------------------------------------------------------------------
// Category innerPadding: 10% -> 20%
// ---------------------------------------------------------------------------

test("NATIVE: the category innerPadding fallback is Power BI's own default of 20", () => {
  // Read from the Format pane's control in Power BI Desktop, not inferred
  // from pixels: "Space between categories" reads 20, range 0..75.
  assert.equal(CATEGORY_INNER_PADDING_DEFAULT, 20);
  assert.equal(styleOf(EMPTY, "classic2026").categoryAxis.innerPadding, 20);
});

for (const entry of CARTESIAN.filter((e) => e.name !== "Line")) {
  test(`${entry.name} inherits the corrected category innerPadding`, () => {
    const src = themeLayers(EMPTY, getBaseTheme("classic2026"));
    const s = entry.resolve(src, resolveTheme(src.roots)) as { categoryAxis: { innerPadding: number } };
    assert.equal(s.categoryAxis.innerPadding, 20);
  });
}

test("an explicit innerPadding still wins", () => {
  const custom = updateThemeValue(
    EMPTY,
    ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "innerPadding"],
    45,
  );
  assert.equal(styleOf(custom, "classic2026").categoryAxis.innerPadding, 45);
});

test("Fluent 2 and Classic 2018 resolve innerPadding from their own state", () => {
  // Fluent declares innerPadding 50 per visual, so the fallback never reaches
  // it. That is also the best corroboration of the value chosen above: Fluent
  // DECLARES 50 and natively MEASURES 55.2%, exactly as Classic 2026 reads 20
  // on its control and measures 23.33%. The declared property and the
  // effective ratio are different quantities in both themes, so the fallback
  // belongs on the declared one.
  assert.equal(styleOf(EMPTY, "fluent2").categoryAxis.innerPadding, 50, "Fluent's own declaration");
  // 2018 declares none, so it takes the renderer default like 2026.
  assert.equal(styleOf(EMPTY, "classic2018").categoryAxis.innerPadding, 20);
});

test("the series band padding is untouched by the category correction", () => {
  // The proven one: paddingInner 0.1 at gap 10, measured across three themes
  // and six sizes. These are different levels of the same layout and are
  // easy to conflate.
  const bands = clusteredSeriesBands({ extent: 100, seriesCount: 3, gapSize: 10 });
  const step = bands[1].offset - bands[0].offset;
  assert.ok(Math.abs(step * (1 - 0.1) - bands[0].size) < 1e-9, "band = step x (1 - paddingInner)");
  assert.ok(Math.abs(100 / (3 - 0.1) - step) < 1e-9, "step = extent / (n - paddingInner)");
});
