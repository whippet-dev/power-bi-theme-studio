import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DataLabel,
  cartesianDataLabelPlacement,
} from "../app/components/ChartParts";
import { BarChartPreview } from "../app/components/previews/BarChartPreview";
import { ColumnChartPreview } from "../app/components/previews/ColumnChartPreview";
import { LineChartPreview } from "../app/components/previews/LineChartPreview";
import { StackedBarChartPreview } from "../app/components/previews/StackedBarChartPreview";
import { StackedColumnChartPreview } from "../app/components/previews/StackedColumnChartPreview";
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolveColumnChartStyle } from "../app/lib/columnChartProperties";
import { resolveLineChartStyle } from "../app/lib/lineChartProperties";
import { lineFixture } from "../app/lib/previewSampleData";
import { themeLayers } from "../app/lib/properties";
import { resolveStackedBarChartStyle } from "../app/lib/stackedBarChartProperties";
import { resolveStackedColumnChartStyle } from "../app/lib/stackedColumnChartProperties";
import { resolveTheme, updateThemeValue, type JsonValue, type PowerBITheme } from "../app/lib/theme";

const EMPTY: PowerBITheme = { name: "none", visualStyles: {} };
const PALETTE = ["#005EA5", "#28A197", "#FFDD00", "#912B88", "#F46A25"];
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const sourceFor = (custom: PowerBITheme = EMPTY) => themeLayers(custom, getBaseTheme("classic2026"));
const withLabelShow = (visual: string, extra: Array<[string, JsonValue]> = []) => {
  let theme = updateThemeValue(EMPTY, ["visualStyles", visual, "*", "labels", 0, "show"], true);
  for (const [property, value] of extra) {
    theme = updateThemeValue(theme, ["visualStyles", visual, "*", "labels", 0, property], value);
  }
  return theme;
};

const anchorCount = (html: string) => (html.match(/class="chart-data-label-anchor/g) ?? []).length;

test("labelContainerMaxWidth no longer becomes an unsupported one-pixel CSS clip", () => {
  const source = sourceFor(withLabelShow("clusteredColumnChart"));
  const labels = resolveColumnChartStyle(source, resolveTheme(source.roots)).labels;
  assert.equal(labels.labelContainerMaxWidth, 1, "the unresolved native literal remains preserved");

  const html = renderToStaticMarkup(<DataLabel labels={labels} category="Online" value={46000} detail={552} />);
  assert.match(html, /class="chart-label/);
  assert.match(html, />46K</);
  assert.doesNotMatch(html, /max-width:\s*1px/);
});

test("value, title and detail keep independent visible structure and basic styles", () => {
  const source = sourceFor(withLabelShow("clusteredColumnChart", [
    ["enableTitleDataLabel", true],
    ["enableDetailDataLabel", true],
    ["fontFamily", "Arial"],
    ["fontSize", 12],
    ["bold", true],
    ["italic", true],
    ["underline", true],
    ["color", { solid: { color: "#112233" } }],
    ["transparency", 40],
    ["enableBackground", true],
    ["backgroundColor", { solid: { color: "#AABBCC" } }],
    ["backgroundTransparency", 25],
    ["horizontalAlignment", "right"],
  ]));
  const labels = resolveColumnChartStyle(source, resolveTheme(source.roots)).labels;
  const html = renderToStaticMarkup(<DataLabel labels={labels} category="Online" value={46000} detail={552} />);

  assert.match(html, /class="chart-label__title"/);
  assert.match(html, /class="chart-label__value"/);
  assert.match(html, /class="chart-label__detail"/);
  assert.match(html, /font-family:Arial/);
  assert.match(html, /font-weight:700/);
  assert.match(html, /font-style:italic/);
  assert.match(html, /text-decoration:underline/);
  assert.match(html, /color:rgba\(17, 34, 51, 0\.6\)/);
  assert.match(html, /background-color:rgba\(170, 187, 204, 0\.75\)/);
  assert.match(html, /align-items:flex-end/);
});

test("basic cartesian positions select a stable data anchor and visible side", () => {
  assert.deepEqual(cartesianDataLabelPlacement("OutsideEnd", "vertical"), {
    anchor: "end", placement: "outside", transform: "translate(-50%, -2px)",
  });
  assert.equal(cartesianDataLabelPlacement("InsideCenter", "vertical").anchor, "center");
  assert.equal(cartesianDataLabelPlacement("InsideBase", "horizontal").anchor, "start");
  assert.equal(cartesianDataLabelPlacement("InsideEnd", "horizontal").placement, "inside-end");
  assert.equal(cartesianDataLabelPlacement("Under", "point").placement, "under");
  assert.equal(cartesianDataLabelPlacement("Auto", "vertical", 92).placement, "inside-end");
  assert.equal(cartesianDataLabelPlacement("Auto", "vertical", 60).placement, "outside");
  assert.equal(cartesianDataLabelPlacement("Auto", "point", 5).placement, "under");
});

test("Clustered Column renders one contained label for every series and category", () => {
  const source = sourceFor(withLabelShow("clusteredColumnChart"));
  const style = resolveColumnChartStyle(source, resolveTheme(source.roots));
  const html = renderToStaticMarkup(<ColumnChartPreview columnChartStyle={style} palette={PALETTE} />);

  assert.equal(anchorCount(html), 12, "3 series x 4 categories");
  for (const series of ["Online", "Phone", "Post"]) {
    assert.equal((html.match(new RegExp(`data-label-series="${series}"`, "g")) ?? []).length, 4);
  }
  assert.match(html, /class="chart-data-label-layer"/);
  assert.match(html, /width:450px;height:300px/);
});

test("the shared foundation reaches Bar, both Stacked families and every Line series", () => {
  const barSource = sourceFor(withLabelShow("clusteredBarChart"));
  const bar = resolveBarChartStyle(barSource, resolveTheme(barSource.roots));
  assert.equal(anchorCount(renderToStaticMarkup(<BarChartPreview barChartStyle={bar} palette={PALETTE} />)), 12);

  const stackedBarSource = sourceFor(withLabelShow("barChart"));
  const stackedBar = resolveStackedBarChartStyle(stackedBarSource, resolveTheme(stackedBarSource.roots));
  assert.equal(anchorCount(renderToStaticMarkup(<StackedBarChartPreview stackedBarChartStyle={stackedBar} palette={PALETTE} />)), 12);

  const stackedColumnSource = sourceFor(withLabelShow("columnChart"));
  const stackedColumn = resolveStackedColumnChartStyle(stackedColumnSource, resolveTheme(stackedColumnSource.roots));
  assert.equal(anchorCount(renderToStaticMarkup(<StackedColumnChartPreview stackedColumnChartStyle={stackedColumn} palette={PALETTE} />)), 12);

  const lineSource = sourceFor(withLabelShow("lineChart"));
  const line = resolveLineChartStyle(lineSource, resolveTheme(lineSource.roots));
  const lineHtml = renderToStaticMarkup(<LineChartPreview lineChartStyle={line} palette={PALETTE} />);
  assert.equal(anchorCount(lineHtml), lineFixture.series.length * lineFixture.categories.length);
  for (const series of lineFixture.series) assert.match(lineHtml, new RegExp(`data-label-series="${series.label}"`));
});

test("labels off emits no anchors and the label layer is plot-contained", () => {
  const source = sourceFor();
  const style = resolveColumnChartStyle(source, resolveTheme(source.roots));
  const html = renderToStaticMarkup(<ColumnChartPreview columnChartStyle={style} palette={PALETTE} />);
  assert.equal(anchorCount(html), 0);
  assert.match(css, /\.chart-data-label-layer\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?overflow:\s*hidden;/);
});
