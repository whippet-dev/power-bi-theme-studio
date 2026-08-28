import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COLUMN_CHART_BOX,
  COLUMN_PLOT_INSETS,
  authoredChromeExtent,
  authoredInnerBox,
  computePreviewCartesianLayout,
  legendBandExtent,
} from "../app/components/previews/cartesianLayout";
import { resolveColumnChartStyle } from "../app/lib/columnChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { themeFontSizeToCssPx } from "../app/lib/fontUnits";
import { barCategories, CLUSTERED_DATA_MAX } from "../app/lib/previewSampleData";
import { themeLayers } from "../app/lib/properties";
import { resolveStackedColumnChartStyle } from "../app/lib/stackedColumnChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const EMPTY: PowerBITheme = { name: "none", visualStyles: {} };
const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const measure = (text: string, fontSize: number) => ({
  width: text.length * fontSize * 0.5,
  height: fontSize * 1.35,
});

function styleOf(custom: PowerBITheme = EMPTY) {
  const source = themeLayers(custom, getBaseTheme("classic2026"));
  return resolveColumnChartStyle(source, resolveTheme(source.roots));
}

function stackedStyleOf(custom: PowerBITheme = EMPTY) {
  const source = themeLayers(custom, getBaseTheme("classic2026"));
  return resolveStackedColumnChartStyle(source, resolveTheme(source.roots));
}

test("Clustered Column keeps the native legend title enabled by default without masking an explicit false", () => {
  assert.equal(styleOf().legend.showTitle, true);
  assert.equal(stackedStyleOf().legend.showTitle, true, "the shared Column family keeps the same native default");

  const hidden = updateThemeValue(
    EMPTY,
    ["visualStyles", "clusteredColumnChart", "*", "legend", 0, "showTitle"],
    false,
  );
  assert.equal(styleOf(hidden).legend.showTitle, false);
});

test("a shown fallback legend title reserves the native title-to-legend spacing", () => {
  const untitled = legendBandExtent(
    { show: true, position: "Top", fontSize: 10, fontFamily: "Segoe UI", showTitle: false, titleText: "" },
    ["Online", "Phone", "Post"],
    measure,
  );
  const titled = legendBandExtent(
    { show: true, position: "Top", fontSize: 10, fontFamily: "Segoe UI", showTitle: true, titleText: "" },
    ["Online", "Phone", "Post"],
    measure,
  );

  assert.equal(
    titled.height,
    untitled.height + measure("Series", themeFontSizeToCssPx(10)).height + 4,
  );
});

test("Column plot insets are paid for inside the fixed 450 x 300 authored visual", () => {
  const style = styleOf();
  const legend = legendBandExtent(style.legend, ["Online", "Phone", "Post"], measure);
  const inner = authoredInnerBox(COLUMN_CHART_BOX, authoredChromeExtent([legend]));
  const layout = computePreviewCartesianLayout({
    box: {
      ...inner,
      width: inner.width - COLUMN_PLOT_INSETS.right,
      height: inner.height - COLUMN_PLOT_INSETS.bottom,
    },
    orientation: "vertical",
    categoryAxis: style.categoryAxis,
    valueAxis: style.valueAxis,
    categories: barCategories,
    dataMax: CLUSTERED_DATA_MAX,
    innerPadding: style.categoryAxis.innerPadding,
    measureText: measure,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  assert.equal(COLUMN_CHART_BOX.width, 450);
  assert.equal(COLUMN_CHART_BOX.height, 300);
  assert.equal(layout.outer.width + COLUMN_PLOT_INSETS.right, inner.width);
  assert.equal(layout.outer.height + COLUMN_PLOT_INSETS.bottom, inner.height);
  assert.ok(layout.plot.width > 0 && layout.plot.height > 0);
});

test("cartesian legend swatches are circular and the plot frame is a true positioning boundary", () => {
  assert.match(cssSource, /\.chart-legend__swatch\s*\{[\s\S]*?border-radius:\s*999px/);
  assert.match(cssSource, /\.chart-preview__plot-frame\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0/);
});
