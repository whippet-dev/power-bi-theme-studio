import assert from "node:assert/strict";
import test from "node:test";
import { IMAGE_PROPERTIES, propertyThemePath, resolveImageStyle } from "../app/lib/imageProperties";
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
    image: {
      "*": {
        image: [{ fit: "Fill", cornerRadius: 12 }],
      },
    },
  },
};

test("resolveImageStyle falls back to sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const style = resolveImageStyle(STARTER_THEME, base);

  assert.equal(style.image.fit, "Fit");
  assert.equal(style.image.cornerRadius, 0);
  assert.equal(style.imageScaling.imageScalingType, "Normal");
});

test("resolveImageStyle prefers a visualStyles.image override over defaults", () => {
  const base = resolveTheme(THEME_WITH_OVERRIDE);
  const style = resolveImageStyle(THEME_WITH_OVERRIDE, base);

  assert.equal(style.image.fit, "Fill");
  assert.equal(style.image.cornerRadius, 12);
});

test("propertyThemePath writes an image corner-radius round-trip through updateThemeValue and resolveImageStyle", () => {
  const path = propertyThemePath(IMAGE_PROPERTIES.image.cornerRadius);
  const updated = updateThemeValue(STARTER_THEME, path, 24);
  const base = resolveTheme(updated);
  const style = resolveImageStyle(updated, base);

  assert.equal(style.image.cornerRadius, 24);
});

test("general.imageUrl (untitled legacy duplicate of image.sourceUrl), image.sourceField (data binding), and image.sourceFile (complex nested object) are intentionally excluded", () => {
  assert.equal("general" in IMAGE_PROPERTIES, false);
  assert.equal("sourceField" in IMAGE_PROPERTIES.image, false);
  assert.equal("sourceFile" in IMAGE_PROPERTIES.image, false);
});

test("every resolved IMAGE_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(IMAGE_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 26, `expected 26 resolved properties, got ${seen.size}`);
});
