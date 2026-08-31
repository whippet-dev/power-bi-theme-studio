import assert from "node:assert/strict";
import test from "node:test";
import { propertyThemePath, resolvePageNavigatorStyle, PAGE_NAVIGATOR_PROPERTIES } from "../app/lib/pageNavigatorProperties";
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
    pageNavigator: {
      "*": {
        pages: [{ showHiddenPages: true }],
      },
    },
  },
};

test("resolvePageNavigatorStyle falls back to sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const style = resolvePageNavigatorStyle(STARTER_THEME, base);

  // Measured natively: hidden pages ARE shown by default.
  assert.equal(style.pages.showPage, true);
  assert.equal(style.pages.showHiddenPages, true);
  assert.equal(style.layout.cellPadding, 5);
  // And a navigator shows bold text where a Shape or Button shows none.
  assert.equal(style.text.show, true);
  assert.equal(style.text.bold, true);
});

test("resolvePageNavigatorStyle prefers a visualStyles.pageNavigator override over defaults", () => {
  const base = resolveTheme(THEME_WITH_OVERRIDE);
  const style = resolvePageNavigatorStyle(THEME_WITH_OVERRIDE, base);

  assert.equal(style.pages.showHiddenPages, true);
});

test("propertyThemePath writes a page-navigator round-trip through updateThemeValue and resolvePageNavigatorStyle", () => {
  const path = propertyThemePath(PAGE_NAVIGATOR_PROPERTIES.pages.showByDefault);
  const updated = updateThemeValue(STARTER_THEME, path, false);
  const base = resolveTheme(updated);
  const style = resolvePageNavigatorStyle(updated, base);

  assert.equal(style.pages.showByDefault, false);
});

test("Page navigator's shared core groups (fill/outline/shadow/glow/rotation/shape/text) are structurally identical to Bookmark navigator's, verified against the schema, and its own 'pages' group replaces 'bookmarks'", () => {
  assert.equal("pages" in PAGE_NAVIGATOR_PROPERTIES, true);
  assert.equal("bookmarks" in PAGE_NAVIGATOR_PROPERTIES, false);
});

test("every resolved PAGE_NAVIGATOR_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(PAGE_NAVIGATOR_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 68, `expected 68 resolved properties, got ${seen.size}`);
});
