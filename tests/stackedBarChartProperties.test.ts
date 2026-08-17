import assert from "node:assert/strict";
import test from "node:test";
import { propertyThemePath, resolveStackedBarChartStyle, STACKED_BAR_CHART_PROPERTIES } from "../app/lib/stackedBarChartProperties";
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
    barChart: {
      "*": {
        dataPoint: [{ fill: { solid: { color: "#912B88" } } }],
        totals: [{ show: true }],
        layout: [{ stackedGapSize: 25 }],
      },
    },
  },
};

test("resolveStackedBarChartStyle falls back to shared theme tokens and sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const style = resolveStackedBarChartStyle(STARTER_THEME, base);

  assert.equal(style.dataPoint.fill, base.palette[0]);
  assert.equal(style.categoryAxis.show, true);
  assert.equal(style.totals.show, false);
  assert.equal(style.ribbonBands.show, false);
});

test("resolveStackedBarChartStyle prefers a visualStyles.barChart override over shared tokens and defaults", () => {
  const base = resolveTheme(THEME_WITH_OVERRIDE);
  const style = resolveStackedBarChartStyle(THEME_WITH_OVERRIDE, base);

  assert.equal(style.dataPoint.fill, "#912B88");
  assert.equal(style.totals.show, true);
  assert.equal(style.layout.stackedGapSize, 25);
});

test("propertyThemePath writes a stacked bar chart colour round-trip through updateThemeValue and resolveStackedBarChartStyle", () => {
  const path = propertyThemePath(STACKED_BAR_CHART_PROPERTIES.dataPoint.fill);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const style = resolveStackedBarChartStyle(updated, base);

  assert.equal(style.dataPoint.fill, "#00FF00");
});

test("the 'referenceLine' group does not exist on this visual (confirmed against the schema)", () => {
  assert.equal("referenceLine" in STACKED_BAR_CHART_PROPERTIES, false);
});

test("every resolved STACKED_BAR_CHART_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(STACKED_BAR_CHART_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 296, `expected 296 resolved properties, got ${seen.size}`);
});
