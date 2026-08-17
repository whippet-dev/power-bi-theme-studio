import assert from "node:assert/strict";
import test from "node:test";
import { propertyThemePath, resolveStackedColumnChartStyle, STACKED_COLUMN_CHART_PROPERTIES } from "../app/lib/stackedColumnChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

const THEME_WITH_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    columnChart: {
      "*": {
        dataPoint: [{ fill: { solid: { color: "#912B88" } } }],
        totals: [{ show: true }],
      },
    },
  },
};

test("resolveStackedColumnChartStyle falls back to shared theme tokens and sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const style = resolveStackedColumnChartStyle(STARTER_THEME, base);

  assert.equal(style.dataPoint.fill, base.palette[0]);
  assert.equal(style.categoryAxis.show, true);
  assert.equal(style.totals.show, false);
});

test("resolveStackedColumnChartStyle prefers a visualStyles.columnChart override over shared tokens and defaults", () => {
  const base = resolveTheme(THEME_WITH_OVERRIDE);
  const style = resolveStackedColumnChartStyle(THEME_WITH_OVERRIDE, base);

  assert.equal(style.dataPoint.fill, "#912B88");
  assert.equal(style.totals.show, true);
});

test("propertyThemePath writes a stacked column chart colour round-trip through updateThemeValue and resolveStackedColumnChartStyle", () => {
  const path = propertyThemePath(STACKED_COLUMN_CHART_PROPERTIES.dataPoint.fill);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const style = resolveStackedColumnChartStyle(updated, base);

  assert.equal(style.dataPoint.fill, "#00FF00");
});

test("the 'referenceLine' group does not exist on this visual (confirmed against the schema)", () => {
  assert.equal("referenceLine" in STACKED_COLUMN_CHART_PROPERTIES, false);
});

test("every resolved STACKED_COLUMN_CHART_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(STACKED_COLUMN_CHART_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 296, `expected 296 resolved properties, got ${seen.size}`);
});
