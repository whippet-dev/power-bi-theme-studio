import assert from "node:assert/strict";
import test from "node:test";
import { propertyThemePath, resolveSlicerStyle, SLICER_PROPERTIES } from "../app/lib/slicerProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

const THEME_WITH_SLICER_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    slicer: {
      "*": {
        header: [{ show: false, background: { solid: { color: "#912B88" } } }],
        calendarButton: [{ cornerRadius: 12 }],
      },
    },
  },
};

test("resolveSlicerStyle falls back to sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const slicer = resolveSlicerStyle(STARTER_THEME, base);

  assert.equal(slicer.header.show, true);
  assert.equal(slicer.slider.show, true);
  assert.equal(slicer.calendarButton.strokeWidth, 1);
});

test("resolveSlicerStyle prefers a visualStyles.slicer override over defaults", () => {
  const base = resolveTheme(THEME_WITH_SLICER_OVERRIDE);
  const slicer = resolveSlicerStyle(THEME_WITH_SLICER_OVERRIDE, base);

  assert.equal(slicer.header.show, false);
  assert.equal(slicer.header.background, "#912B88");
  assert.equal(slicer.calendarButton.cornerRadius, 12);
  // Properties left unset in the override still fall back sensibly.
  assert.equal(slicer.items.textSize, 6);
});

test("propertyThemePath writes a slicer colour round-trip through updateThemeValue and resolveSlicerStyle", () => {
  const path = propertyThemePath(SLICER_PROPERTIES.header.background);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const slicer = resolveSlicerStyle(updated, base);

  assert.equal(slicer.header.background, "#00FF00");
});

test("the slicer 'data' group (filter/selection state, not style) is intentionally excluded", () => {
  assert.equal("data" in SLICER_PROPERTIES, false);
});

test("every resolved SLICER_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(SLICER_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 99, `expected 99 resolved properties, got ${seen.size}`);
});
