import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const previewRoot = new URL("../app/components/previews/", import.meta.url);
const visualPreviews = readFileSync(new URL("../app/components/VisualPreviews.tsx", import.meta.url), "utf8");

const CARTESIAN_PREVIEWS = [
  "BarChartPreview.tsx",
  "StackedBarChartPreview.tsx",
  "ColumnChartPreview.tsx",
  "StackedColumnChartPreview.tsx",
  "LineChartPreview.tsx",
] as const;

test("every authored cartesian preview owns subtitle chrome in Title, Subtitle, Legend order", () => {
  for (const file of CARTESIAN_PREVIEWS) {
    const source = readFileSync(new URL(file, previewRoot), "utf8");
    assert.match(source, /visualSubtitleBandExtent/);
    assert.match(source, /authoredChromeExtent\(\[titleBand, subtitleBand, legendBand\]\)/);
    const title = source.indexOf('chart-preview__visual-title');
    const subtitle = source.indexOf('chart-preview__visual-subtitle');
    const legend = source.indexOf('chart-preview__legend-band');
    assert.ok(title >= 0 && subtitle > title && legend > subtitle, `${file} chrome order`);
  }
});

test("PreviewShell does not duplicate an authored cartesian subtitle", () => {
  assert.match(visualPreviews, /chrome\.subTitle\.show && chrome\.subTitle\.text && !titleInsideVisual/);
  for (const name of ["bar", "stackedBar", "column", "stackedColumn", "line"]) {
    assert.match(visualPreviews, new RegExp(`subtitleChrome=\\{chromeStyles\\.${name}\\.subTitle\\}`));
  }
});
