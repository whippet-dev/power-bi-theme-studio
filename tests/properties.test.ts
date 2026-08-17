import assert from "node:assert/strict";
import test from "node:test";
import { propertyThemePath, resolveTableStyle, TABLE_PROPERTIES } from "../app/lib/tableProperties";
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

// Mirrors a real-world tableEx override (dark blue header, white text) that
// the resolver must prefer over the unrelated top-level tableAccent token.
const THEME_WITH_TABLE_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  tableAccent: "#252423",
  visualStyles: {
    tableEx: {
      "*": {
        columnHeaders: [
          {
            backColor: { solid: { color: "#0F3D6E" } },
            fontColor: { solid: { color: "#FFFFFF" } },
            fontSize: 11,
          },
        ],
        grid: [{ gridHorizontal: false, gridHorizontalColor: { solid: { color: "#E3E3E3" } } }],
      },
    },
  },
};

test("resolveTableStyle falls back to shared theme tokens when there is no visualStyles.tableEx override", () => {
  const base = resolveTheme(STARTER_THEME);
  const table = resolveTableStyle(STARTER_THEME, base);

  assert.equal(table.headerBackground, base.tableAccent);
  assert.equal(table.headerText, base.background);
  assert.equal(table.headerFontSize, 12);
  assert.equal(table.rowBaseBackground, base.background);
  assert.equal(table.gridlinesVisible, true);
});

test("resolveTableStyle prefers a visualStyles.tableEx override over the flat tableAccent token", () => {
  const base = resolveTheme(THEME_WITH_TABLE_OVERRIDE);
  const table = resolveTableStyle(THEME_WITH_TABLE_OVERRIDE, base);

  assert.equal(table.headerBackground, "#0F3D6E");
  assert.equal(table.headerText, "#FFFFFF");
  assert.equal(table.headerFontSize, 11);
  assert.equal(table.gridlinesVisible, false);
  assert.equal(table.gridlineColor, "#E3E3E3");
  // Properties left unset in the override still fall back sensibly.
  assert.equal(table.rowBaseBackground, base.background);
});

test("propertyThemePath writes round-trip through updateThemeValue and resolveTableStyle", () => {
  const path = propertyThemePath(TABLE_PROPERTIES.headerBackground);
  const updated = updateThemeValue(STARTER_THEME, path, "#123456");
  const base = resolveTheme(updated);
  const table = resolveTableStyle(updated, base);

  assert.equal(table.headerBackground, "#123456");
  // Writing one property must not disturb the rest of the theme.
  assert.equal(updated.name, "Sample theme");
});

test("propertyThemePath writes a boolean property directly, without a colour wrapper", () => {
  const path = propertyThemePath(TABLE_PROPERTIES.gridlinesVisible);
  const updated = updateThemeValue(STARTER_THEME, path, false);
  const base = resolveTheme(updated);
  const table = resolveTableStyle(updated, base);

  assert.equal(table.gridlinesVisible, false);
});
