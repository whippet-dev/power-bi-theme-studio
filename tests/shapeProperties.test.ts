import assert from "node:assert/strict";
import test from "node:test";
import { propertyThemePath, resolveShapeStyle, SHAPE_PROPERTIES } from "../app/lib/shapeProperties";
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
    shape: {
      "*": {
        fill: [{ fillColor: { solid: { color: "#912B88" } } }],
        shape: [{ tileShape: "oval" }],
      },
    },
  },
};

test("resolveShapeStyle falls back to sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const style = resolveShapeStyle(STARTER_THEME, base);

  // Native capability defaults for a Rectangle: fill on AND border on.
  assert.equal(style.fill.show, true);
  assert.equal(style.outline.show, true);
  assert.equal(style.outline.weight, 1);
  // Text is off, with its latent typography still resolved behind it.
  // Measured: a capability-constant Segoe UI 10 on `background`, not the
  // foreground the shared core used to hand every family member.
  assert.equal(style.text.show, false);
  assert.equal(style.text.fontSize, 10);
  assert.equal(style.text.fontFamily, "Segoe UI");
  assert.equal(style.text.fontColor, base.background);
  assert.notEqual(style.text.fontColor, base.foreground);
  assert.equal(style.shape.tileShape, "rectangle");
});

test("resolveShapeStyle prefers a visualStyles.shape override over defaults", () => {
  const base = resolveTheme(THEME_WITH_OVERRIDE);
  const style = resolveShapeStyle(THEME_WITH_OVERRIDE, base);

  assert.equal(style.fill.fillColor, "#912B88");
  assert.equal(style.shape.tileShape, "oval");
});

test("propertyThemePath writes a shape fill colour round-trip through updateThemeValue and resolveShapeStyle", () => {
  const path = propertyThemePath(SHAPE_PROPERTIES.fill.fillColor);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const style = resolveShapeStyle(updated, base);

  assert.equal(style.fill.fillColor, "#00FF00");
});

test("Shape is the only shape-family visual with shape.linecapType", () => {
  assert.equal("linecapType" in SHAPE_PROPERTIES.shape, true);
});

test("every resolved SHAPE_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(SHAPE_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 56, `expected 56 resolved properties, got ${seen.size}`);
});
