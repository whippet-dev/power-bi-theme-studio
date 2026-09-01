import assert from "node:assert/strict";
import test from "node:test";
import { CARD_PROPERTIES, propertyThemePath, resolveCardStyle } from "../app/lib/cardProperties";
import { updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  textClasses: {
    callout: { fontSize: 28 },
  },
  visualStyles: {},
};

const THEME_WITH_CARD_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    card: {
      "*": {
        categoryLabels: [{ show: false, color: { solid: { color: "#912B88" } } }],
        labels: [{ fontSize: 40 }],
      },
    },
  },
};

test("resolveCardStyle falls back to sensible defaults when there is no override", () => {
  const card = resolveCardStyle(STARTER_THEME);

  assert.equal(card.categoryLabels.show, true);
  assert.equal(card.wordWrap.show, false);
  // The big value's default size matches the textClasses.callout default it
  // visually sits alongside — a per-visual override should win over that.
  assert.equal(card.labels.fontSize, 28);
});

// Regression: verified against a real Power BI report (a private real-world
// theme, Card (old), no per-visual overrides) — category label colour
// comes from textClasses.largeLightLabel.color (a text-class token, not a
// structural colour or a data colour), and the big value's colour comes
// from textClasses.callout.color, not the first data colour either.
test("category label colour falls back to textClasses.largeLightLabel.color, and the value falls back to textClasses.callout.color — not a data colour", () => {
  const theme: PowerBITheme = {
    ...STARTER_THEME,
    textClasses: { callout: { color: "#252423" } },
  };
  const card = resolveCardStyle(theme);

  assert.equal(card.categoryLabels.color, "#605E5C");
  assert.equal(card.labels.color, "#252423");
});

// Microsoft's own docs list "Card category labels" under the
// largeLightLabel text class specifically — a theme that sets
// fourthLevelElements (a structural colour token, and the field this
// originally, wrongly, read) must not affect the card, while one that sets
// textClasses.largeLightLabel.color must.
test("category label colour reads textClasses.largeLightLabel.color specifically, not fourthLevelElements", () => {
  const wrongField: PowerBITheme = { ...STARTER_THEME, fourthLevelElements: "#FF00FF" };
  const wrongCard = resolveCardStyle(wrongField);
  assert.equal(wrongCard.categoryLabels.color, "#605E5C", "fourthLevelElements must not affect the card");

  const rightField: PowerBITheme = {
    ...STARTER_THEME,
    textClasses: { ...STARTER_THEME.textClasses, largeLightLabel: { color: "#00FF00" } },
  };
  const rightCard = resolveCardStyle(rightField);
  assert.equal(rightCard.categoryLabels.color, "#00FF00");
});

test("resolveCardStyle prefers a visualStyles.card override over defaults", () => {
  const card = resolveCardStyle(THEME_WITH_CARD_OVERRIDE);

  assert.equal(card.categoryLabels.show, false);
  assert.equal(card.categoryLabels.color, "#912B88");
  assert.equal(card.labels.fontSize, 40);
});

test("propertyThemePath writes a card colour round-trip through updateThemeValue and resolveCardStyle", () => {
  const path = propertyThemePath(CARD_PROPERTIES.categoryLabels.color);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const card = resolveCardStyle(updated);

  assert.equal(card.categoryLabels.color, "#00FF00");
});

test("every resolved CARD_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(CARD_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  // 18, not 19: categoryLabels.preserveWhitespace was removed. A fully
  // expanded native Category label card offers only font, size, B/I/U and
  // colour, so Power BI has no such property to theme.
  assert.equal(seen.size, 18, `expected 18 resolved properties, got ${seen.size}`);
});
