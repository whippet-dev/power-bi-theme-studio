import assert from "node:assert/strict";
import test from "node:test";
import { BAR_CHART_PROPERTIES, propertyThemePath, resolveBarChartStyle } from "../app/lib/barChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  textClasses: {
    title: { fontFace: "Segoe UI", fontSize: 12, color: "#0B0C0C" },
  },
  visualStyles: {},
};

const THEME_WITH_BAR_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    clusteredBarChart: {
      "*": {
        dataPoint: [{ fill: { solid: { color: "#912B88" } } }],
        categoryAxis: [{ show: false, gridlineColor: { solid: { color: "#123456" } } }],
        legend: [{ position: "BottomCenter" }],
      },
    },
  },
};

test("resolveBarChartStyle falls back to shared theme tokens and sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const bar = resolveBarChartStyle(STARTER_THEME, base);

  assert.equal(bar.dataPoint.fill, base.palette[0]);
  assert.equal(bar.categoryAxis.show, true);
  assert.equal(bar.valueAxis.show, true);
  assert.equal(bar.legend.show, true);
  // Advanced/overlay features are off by default, matching real Power BI.
  assert.equal(bar.error.enabled, false);
  assert.equal(bar.trend.show, false);
  assert.equal(bar.referenceLine.show, false);
});

test("resolveBarChartStyle prefers a visualStyles.clusteredBarChart override over shared tokens and defaults", () => {
  const base = resolveTheme(THEME_WITH_BAR_OVERRIDE);
  const bar = resolveBarChartStyle(THEME_WITH_BAR_OVERRIDE, base);

  assert.equal(bar.dataPoint.fill, "#912B88");
  assert.equal(bar.categoryAxis.show, false);
  assert.equal(bar.categoryAxis.gridlineColor, "#123456");
  assert.equal(bar.legend.position, "BottomCenter");
  // Properties left unset in the override still fall back sensibly.
  assert.equal(bar.valueAxis.show, true);
});

test("propertyThemePath writes a bar chart colour round-trip through updateThemeValue and resolveBarChartStyle", () => {
  const path = propertyThemePath(BAR_CHART_PROPERTIES.dataPoint.fill);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const bar = resolveBarChartStyle(updated, base);

  assert.equal(bar.dataPoint.fill, "#00FF00");
  assert.equal(updated.name, "Sample theme");
});

test("propertyThemePath writes a bar chart enum property using its raw string value", () => {
  const path = propertyThemePath(BAR_CHART_PROPERTIES.legend.position);
  const updated = updateThemeValue(STARTER_THEME, path, "TopRight");
  const base = resolveTheme(updated);
  const bar = resolveBarChartStyle(updated, base);

  assert.equal(bar.legend.position, "TopRight");
});

test("every resolved BAR_CHART_PROPERTIES path is unique across groups (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(BAR_CHART_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size > 280, true, `expected close to 291 resolved properties, got ${seen.size}`);
});
