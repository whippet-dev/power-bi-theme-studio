import assert from "node:assert/strict";
import test from "node:test";
import { PIE_CHART_PROPERTIES, propertyThemePath, resolvePieChartStyle } from "../app/lib/pieChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

const THEME_WITH_PIE_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    pieChart: {
      "*": {
        dataPoint: [{ fill: { solid: { color: "#912B88" } } }],
        slices: [{ innerRadiusRatio: 55 }],
        legend: [{ position: "BottomCenter" }],
      },
    },
  },
};

test("resolvePieChartStyle falls back to shared theme tokens and sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const pie = resolvePieChartStyle(STARTER_THEME, base);

  assert.equal(pie.dataPoint.fill, base.palette[0]);
  assert.equal(pie.legend.show, true);
  assert.equal(pie.labels.show, true);
  assert.equal(pie.slices.innerRadiusRatio, 0);
});

test("resolvePieChartStyle prefers a visualStyles.pieChart override over shared tokens and defaults", () => {
  const base = resolveTheme(THEME_WITH_PIE_OVERRIDE);
  const pie = resolvePieChartStyle(THEME_WITH_PIE_OVERRIDE, base);

  assert.equal(pie.dataPoint.fill, "#912B88");
  assert.equal(pie.slices.innerRadiusRatio, 55);
  assert.equal(pie.legend.position, "BottomCenter");
  assert.equal(pie.legend.show, true);
});

test("propertyThemePath writes a pie chart colour round-trip through updateThemeValue and resolvePieChartStyle", () => {
  const path = propertyThemePath(PIE_CHART_PROPERTIES.dataPoint.fill);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const pie = resolvePieChartStyle(updated, base);

  assert.equal(pie.dataPoint.fill, "#00FF00");
});

test("the 'annotationTemplate' group (complex nested object) is intentionally excluded", () => {
  assert.equal("annotationTemplate" in PIE_CHART_PROPERTIES, false);
});

test("every resolved PIE_CHART_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(PIE_CHART_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 36, `expected 36 resolved properties, got ${seen.size}`);
});
