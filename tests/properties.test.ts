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
            alignment: "Center",
          },
        ],
        grid: [{ gridHorizontal: false, gridHorizontalColor: { solid: { color: "#E3E3E3" } } }],
        total: [{ label: "Grand total" }],
      },
    },
  },
};

test("resolveTableStyle falls back to shared theme tokens when there is no visualStyles.tableEx override", () => {
  const base = resolveTheme(STARTER_THEME);
  const table = resolveTableStyle(STARTER_THEME, base);

  // The header used to resolve tableAccent behind background-coloured text.
  // Power BI does the opposite: `background` behind `foreground` text, with
  // tableAccent reserved for the grid outline.
  assert.equal(table.columnHeaders.backColor, base.background);
  assert.equal(table.columnHeaders.fontColor, base.foreground);
  assert.equal(table.grid.outlineColor, base.tableAccent);
  assert.equal(table.columnHeaders.alignment, "Auto");
  assert.equal(table.values.backColorPrimary, base.background);
  assert.equal(table.grid.gridHorizontal, true);
  assert.equal(table.total.label, "Total");
});

test("resolveTableStyle prefers a visualStyles.tableEx override over the flat tableAccent token", () => {
  const base = resolveTheme(THEME_WITH_TABLE_OVERRIDE);
  const table = resolveTableStyle(THEME_WITH_TABLE_OVERRIDE, base);

  assert.equal(table.columnHeaders.backColor, "#0F3D6E");
  assert.equal(table.columnHeaders.fontColor, "#FFFFFF");
  assert.equal(table.columnHeaders.fontSize, 11);
  assert.equal(table.columnHeaders.alignment, "Center");
  assert.equal(table.grid.gridHorizontal, false);
  assert.equal(table.grid.gridHorizontalColor, "#E3E3E3");
  assert.equal(table.total.label, "Grand total");
  // Properties left unset in the override still fall back sensibly.
  assert.equal(table.values.backColorPrimary, base.background);
});

test("propertyThemePath writes a colour round-trip through updateThemeValue and resolveTableStyle", () => {
  const path = propertyThemePath(TABLE_PROPERTIES.columnHeaders.backColor);
  const updated = updateThemeValue(STARTER_THEME, path, "#123456");
  const base = resolveTheme(updated);
  const table = resolveTableStyle(updated, base);

  assert.equal(table.columnHeaders.backColor, "#123456");
  // Writing one property must not disturb the rest of the theme.
  assert.equal(updated.name, "Sample theme");
});

test("propertyThemePath writes a boolean property directly, without a colour wrapper", () => {
  const path = propertyThemePath(TABLE_PROPERTIES.grid.gridHorizontal);
  const updated = updateThemeValue(STARTER_THEME, path, false);
  const base = resolveTheme(updated);
  const table = resolveTableStyle(updated, base);

  assert.equal(table.grid.gridHorizontal, false);
});

test("propertyThemePath writes a text property directly, without a colour wrapper", () => {
  const path = propertyThemePath(TABLE_PROPERTIES.total.label);
  const updated = updateThemeValue(STARTER_THEME, path, "Grand total");
  const base = resolveTheme(updated);
  const table = resolveTableStyle(updated, base);

  assert.equal(table.total.label, "Grand total");
});

test("propertyThemePath writes an enum property using its raw value type (string)", () => {
  const path = propertyThemePath(TABLE_PROPERTIES.columnHeaders.alignment);
  const updated = updateThemeValue(STARTER_THEME, path, "Right");
  const base = resolveTheme(updated);
  const table = resolveTableStyle(updated, base);

  assert.equal(table.columnHeaders.alignment, "Right");
});

test("propertyThemePath writes a numeric enum property using its raw value type (number)", () => {
  const path = propertyThemePath(TABLE_PROPERTIES.columnFormatting.labelDisplayUnits);
  const updated = updateThemeValue(STARTER_THEME, path, 1000000);
  const base = resolveTheme(updated);
  const table = resolveTableStyle(updated, base);

  assert.equal(table.columnFormatting.labelDisplayUnits, 1000000);
});
