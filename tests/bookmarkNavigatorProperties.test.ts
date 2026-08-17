import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOKMARK_NAVIGATOR_PROPERTIES,
  propertyThemePath,
  resolveBookmarkNavigatorStyle,
} from "../app/lib/bookmarkNavigatorProperties";
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
    bookmarkNavigator: {
      "*": {
        accentBar: [{ show: true }],
        layout: [{ orientation: 0 }],
      },
    },
  },
};

test("resolveBookmarkNavigatorStyle falls back to sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const style = resolveBookmarkNavigatorStyle(STARTER_THEME, base);

  assert.equal(style.accentBar.show, false);
  assert.equal(style.accentBar.color, base.tableAccent);
  assert.equal(style.layout.orientation, 2);
});

test("resolveBookmarkNavigatorStyle prefers a visualStyles.bookmarkNavigator override over defaults", () => {
  const base = resolveTheme(THEME_WITH_OVERRIDE);
  const style = resolveBookmarkNavigatorStyle(THEME_WITH_OVERRIDE, base);

  assert.equal(style.accentBar.show, true);
  assert.equal(style.layout.orientation, 0);
});

test("propertyThemePath writes an accent bar colour round-trip through updateThemeValue and resolveBookmarkNavigatorStyle", () => {
  const path = propertyThemePath(BOOKMARK_NAVIGATOR_PROPERTIES.accentBar.color);
  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const style = resolveBookmarkNavigatorStyle(updated, base);

  assert.equal(style.accentBar.color, "#00FF00");
});

test("accentBar.$id (interaction-state discriminator) and bookmarks.bookmarkGroup/selectedBookmark (report content, not style) are intentionally excluded", () => {
  assert.equal("$id" in BOOKMARK_NAVIGATOR_PROPERTIES.accentBar, false);
  assert.equal("bookmarkGroup" in BOOKMARK_NAVIGATOR_PROPERTIES.bookmarks, false);
  assert.equal("selectedBookmark" in BOOKMARK_NAVIGATOR_PROPERTIES.bookmarks, false);
});

test("every resolved BOOKMARK_NAVIGATOR_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(BOOKMARK_NAVIGATOR_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 67, `expected 67 resolved properties, got ${seen.size}`);
});
