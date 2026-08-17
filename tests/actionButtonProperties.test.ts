import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_BUTTON_PROPERTIES, propertyThemePath, resolveActionButtonStyle } from "../app/lib/actionButtonProperties";
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
    actionButton: {
      "*": {
        icon: [{ shapeType: "back" }],
      },
    },
  },
};

test("resolveActionButtonStyle falls back to sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const style = resolveActionButtonStyle(STARTER_THEME, base);

  assert.equal(style.fill.show, true);
  assert.equal(style.icon.show, true);
  assert.equal(style.icon.shapeType, "blank");
});

test("resolveActionButtonStyle prefers a visualStyles.actionButton override over defaults", () => {
  const base = resolveTheme(THEME_WITH_OVERRIDE);
  const style = resolveActionButtonStyle(THEME_WITH_OVERRIDE, base);

  assert.equal(style.icon.shapeType, "back");
});

test("propertyThemePath writes an action button icon-colour round-trip through updateThemeValue and resolveActionButtonStyle", () => {
  const path = propertyThemePath(ACTION_BUTTON_PROPERTIES.icon.lineColor);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const style = resolveActionButtonStyle(updated, base);

  assert.equal(style.icon.lineColor, "#00FF00");
});

test("icon.$id (interaction-state discriminator) and icon.image (complex nested object) are intentionally excluded", () => {
  assert.equal("$id" in ACTION_BUTTON_PROPERTIES.icon, false);
  assert.equal("image" in ACTION_BUTTON_PROPERTIES.icon, false);
});

test("every resolved ACTION_BUTTON_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(ACTION_BUTTON_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 68, `expected 68 resolved properties, got ${seen.size}`);
});
