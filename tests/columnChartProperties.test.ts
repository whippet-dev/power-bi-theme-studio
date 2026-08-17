import assert from "node:assert/strict";
import test from "node:test";
import { COLUMN_CHART_PROPERTIES, propertyThemePath, resolveColumnChartStyle } from "../app/lib/columnChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

const THEME_WITH_COLUMN_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    clusteredColumnChart: {
      "*": {
        dataPoint: [{ fill: { solid: { color: "#912B88" } } }],
        categoryAxis: [{ show: false, gridlineColor: { solid: { color: "#123456" } } }],
        legend: [{ position: "BottomCenter" }],
      },
    },
  },
};

test("resolveColumnChartStyle falls back to shared theme tokens and sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const column = resolveColumnChartStyle(STARTER_THEME, base);

  assert.equal(column.dataPoint.fill, base.palette[0]);
  assert.equal(column.categoryAxis.show, true);
  assert.equal(column.valueAxis.show, true);
  assert.equal(column.legend.show, true);
  assert.equal(column.error.enabled, false);
  assert.equal(column.trend.show, false);
  assert.equal(column.referenceLine.show, false);
});

test("resolveColumnChartStyle prefers a visualStyles.clusteredColumnChart override over shared tokens and defaults", () => {
  const base = resolveTheme(THEME_WITH_COLUMN_OVERRIDE);
  const column = resolveColumnChartStyle(THEME_WITH_COLUMN_OVERRIDE, base);

  assert.equal(column.dataPoint.fill, "#912B88");
  assert.equal(column.categoryAxis.show, false);
  assert.equal(column.categoryAxis.gridlineColor, "#123456");
  assert.equal(column.legend.position, "BottomCenter");
  assert.equal(column.valueAxis.show, true);
});

test("propertyThemePath writes a column chart colour round-trip through updateThemeValue and resolveColumnChartStyle", () => {
  const path = propertyThemePath(COLUMN_CHART_PROPERTIES.dataPoint.fill);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const column = resolveColumnChartStyle(updated, base);

  assert.equal(column.dataPoint.fill, "#00FF00");
});

test("Column chart's axis title wording reflects its vertical orientation (opposite of Bar chart's horizontal one)", () => {
  // Column chart is vertical: category = X axis, value = Y axis — the
  // reverse of Bar chart's horizontal layout. Microsoft's own schema
  // description text differs accordingly, so this checks it was pulled
  // from Column chart's own schema entry rather than copied from Bar chart.
  assert.equal(COLUMN_CHART_PROPERTIES.categoryAxis.showAxisTitle.description, "Title for the X-axis");
  assert.equal(COLUMN_CHART_PROPERTIES.valueAxis.showAxisTitle.description, "Title for the Y-axis");
});

test("every resolved COLUMN_CHART_PROPERTIES path is unique across groups (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(COLUMN_CHART_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 291, `expected 291 resolved properties, got ${seen.size}`);
});
