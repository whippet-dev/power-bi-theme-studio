import assert from "node:assert/strict";
import test from "node:test";
import { propertyThemePath, resolveTextboxStyle, TEXTBOX_PROPERTIES } from "../app/lib/textboxProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

test("resolveTextboxStyle falls back to sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const style = resolveTextboxStyle(STARTER_THEME, base);

  assert.equal(style.text.color, base.foreground);
  assert.equal(style.text.fontFamily, base.fontFamily);
  assert.equal(style.text.fontSize, 12);
});

test("propertyThemePath writes a textbox font-size round-trip through updateThemeValue and resolveTextboxStyle", () => {
  const path = propertyThemePath(TEXTBOX_PROPERTIES.text.fontSize);
  const updated = updateThemeValue(STARTER_THEME, path, 18);
  const base = resolveTheme(updated);
  const style = resolveTextboxStyle(updated, base);

  assert.equal(style.text.fontSize, 18);
});

test("general.paragraphs (rich-text run structure) and values.expr/formatString (dynamic data-bound value) are intentionally excluded", () => {
  assert.equal("general" in TEXTBOX_PROPERTIES, false);
  assert.equal("values" in TEXTBOX_PROPERTIES, false);
});

test("every resolved TEXTBOX_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(TEXTBOX_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 3, `expected 3 resolved properties, got ${seen.size}`);
});
