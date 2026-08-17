import assert from "node:assert/strict";
import test from "node:test";
import { LINE_CHART_PROPERTIES, propertyThemePath, resolveLineChartStyle } from "../app/lib/lineChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

const THEME_WITH_LINE_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    lineChart: {
      "*": {
        dataPoint: [{ fill: { solid: { color: "#912B88" } } }],
        categoryAxis: [{ show: false, gridlineColor: { solid: { color: "#123456" } } }],
        legend: [{ position: "BottomCenter" }],
      },
    },
  },
};

test("resolveLineChartStyle falls back to shared theme tokens and sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const line = resolveLineChartStyle(STARTER_THEME, base);

  assert.equal(line.dataPoint.fill, base.palette[0]);
  assert.equal(line.categoryAxis.show, true);
  assert.equal(line.valueAxis.show, true);
  assert.equal(line.legend.show, true);
  // Advanced/overlay features are off by default, matching real Power BI.
  assert.equal(line.error.enabled, false);
  assert.equal(line.trend.show, false);
  assert.equal(line.forecast.show, false);
  assert.equal(line.anomalyDetection.show, false);
  assert.equal(line.referenceLine.show, false);
});

test("the line itself is drawn by default — a line chart whose stroke is off renders an empty plot", () => {
  const base = resolveTheme(STARTER_THEME);
  const line = resolveLineChartStyle(STARTER_THEME, base);

  // Regression guard: strokeShow defaulted to false, so the preview drew
  // gridlines and axes but no line at all. Same class as the divider and
  // shape-parameter defaults, but on the one element that IS the visual.
  assert.equal(line.lineStyles.strokeShow, true);
  assert.ok(line.lineStyles.strokeWidth > 0, "a visible stroke needs a non-zero width");
});

test("resolveLineChartStyle prefers a visualStyles.lineChart override over shared tokens and defaults", () => {
  const base = resolveTheme(THEME_WITH_LINE_OVERRIDE);
  const line = resolveLineChartStyle(THEME_WITH_LINE_OVERRIDE, base);

  assert.equal(line.dataPoint.fill, "#912B88");
  assert.equal(line.categoryAxis.show, false);
  assert.equal(line.categoryAxis.gridlineColor, "#123456");
  assert.equal(line.legend.position, "BottomCenter");
  // Properties left unset in the override still fall back sensibly.
  assert.equal(line.valueAxis.show, true);
});

test("propertyThemePath writes a line chart colour round-trip through updateThemeValue and resolveLineChartStyle", () => {
  const path = propertyThemePath(LINE_CHART_PROPERTIES.dataPoint.fill);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const line = resolveLineChartStyle(updated, base);

  assert.equal(line.dataPoint.fill, "#00FF00");
});

test("anomalyDetection's computed-result/per-instance-state fields are intentionally excluded", () => {
  const keys = Object.keys(LINE_CHART_PROPERTIES.anomalyDetection);
  for (const excluded of ["BatchEnd", "BatchStart", "CategoryValue", "ExpectedHigh", "ExpectedLow", "ExpectedValue", "Value", "isAnomalyHighlighted"]) {
    assert.equal(keys.includes(excluded), false, `${excluded} should be excluded`);
  }
});

test("the 'filters', 'scalarKey', and 'annotationTemplate' groups (state/binding config, not style) are intentionally excluded", () => {
  assert.equal("filters" in LINE_CHART_PROPERTIES, false);
  assert.equal("scalarKey" in LINE_CHART_PROPERTIES, false);
  assert.equal("annotationTemplate" in LINE_CHART_PROPERTIES, false);
});

test("every resolved LINE_CHART_PROPERTIES path is unique across groups (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(LINE_CHART_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 430, `expected 430 resolved properties, got ${seen.size}`);
});
