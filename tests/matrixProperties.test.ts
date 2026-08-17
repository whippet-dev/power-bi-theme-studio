import assert from "node:assert/strict";
import test from "node:test";
import { MATRIX_PROPERTIES, propertyThemePath, resolveMatrixStyle } from "../app/lib/matrixProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

const THEME_WITH_MATRIX_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    pivotTable: {
      "*": {
        columnHeaders: [{ backColor: { solid: { color: "#912B88" } }, wordWrap: true }],
        rowHeaders: [{ stepped: true, steppedLayoutIndentation: 12 }],
        subTotals: [{ rowSubtotals: false, columnSubtotals: true }],
      },
    },
  },
};

test("resolveMatrixStyle falls back to shared theme tokens and sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const matrix = resolveMatrixStyle(STARTER_THEME, base);

  assert.equal(matrix.columnHeaders.backColor, base.background);
  assert.equal(matrix.columnHeaders.wordWrap, false);
  assert.equal(matrix.rowHeaders.stepped, false);
});

test("resolveMatrixStyle prefers a visualStyles.pivotTable override over shared tokens and defaults", () => {
  const base = resolveTheme(THEME_WITH_MATRIX_OVERRIDE);
  const matrix = resolveMatrixStyle(THEME_WITH_MATRIX_OVERRIDE, base);

  assert.equal(matrix.columnHeaders.backColor, "#912B88");
  assert.equal(matrix.columnHeaders.wordWrap, true);
  assert.equal(matrix.rowHeaders.stepped, true);
  assert.equal(matrix.rowHeaders.steppedLayoutIndentation, 12);
  assert.equal(matrix.subTotals.rowSubtotals, false);
  assert.equal(matrix.subTotals.columnSubtotals, true);
});

test("propertyThemePath writes a matrix colour round-trip through updateThemeValue and resolveMatrixStyle", () => {
  const path = propertyThemePath(MATRIX_PROPERTIES.columnHeaders.backColor);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const matrix = resolveMatrixStyle(updated, base);

  assert.equal(matrix.columnHeaders.backColor, "#00FF00");
});

test("the 'columnWidth' and 'annotationTemplate' groups and the 'subTotals.$id' instance discriminator are intentionally excluded", () => {
  assert.equal("columnWidth" in MATRIX_PROPERTIES, false);
  assert.equal("annotationTemplate" in MATRIX_PROPERTIES, false);
  assert.equal("$id" in MATRIX_PROPERTIES.subTotals, false);
});

test("every resolved MATRIX_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(MATRIX_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 146, `expected 146 resolved properties, got ${seen.size}`);
});
