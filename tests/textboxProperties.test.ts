import assert from "node:assert/strict";
import test from "node:test";
import { propertyThemePath, resolveTextboxStyle, TEXTBOX_PROPERTIES } from "../app/lib/textboxProperties";
import { updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

test("resolveTextboxStyle falls back to the measured label class when there is no override", () => {
  // Measured on a default Text Box: its text is the `label` primary class in
  // full -- family, size and colour -- not `foreground` at a literal 12. The
  // starter theme declares no classes, so this reads Power BI's built-in
  // `label` of Segoe UI 10 #252423; the two-point proof that it tracks a
  // declared class lives in textboxImageNativeDefaults.test.ts.
  const style = resolveTextboxStyle(STARTER_THEME);

  assert.equal(style.text.fontFamily, "Segoe UI");
  assert.equal(style.text.fontSize, 10);
  assert.equal(style.text.color, "#252423", "the label class colour, not `foreground`");
});

test("propertyThemePath writes a textbox font-size round-trip through updateThemeValue and resolveTextboxStyle", () => {
  const path = propertyThemePath(TEXTBOX_PROPERTIES.text.fontSize);
  const updated = updateThemeValue(STARTER_THEME, path, 18);
  const style = resolveTextboxStyle(updated);

  assert.equal(style.text.fontSize, 18);
});

test("general.paragraphs (rich-text run structure) and values.expr/formatString (dynamic data-bound value) are intentionally excluded", () => {
  // The text box registry stays text-only. `general.keepLayerOrder` is a real
  // theme path, but the shared chrome registry already models it at exactly
  // this JSON path and already offers it against the active visual -- adding
  // it here would put two controls on one setting.
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
