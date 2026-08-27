import assert from "node:assert/strict";
import test from "node:test";
import { BASE_THEMES, DEFAULT_BASE_THEME_ID, getBaseTheme } from "../app/lib/baseThemes";
import { resolveChromeStyle } from "../app/lib/chromeProperties";
import { themeLayers } from "../app/lib/properties";
import {
  cloneNewTheme,
  deleteThemeValue,
  hasThemeValueAtPath,
  NEW_THEME,
  readThemeValueAtPath,
  resolveTheme,
  updateThemeValue,
} from "../app/lib/theme";

const TITLE_FONT_PATH = ["visualStyles", "lineChart", "*", "title", 0, "fontFamily"] as Array<string | number>;

function lineTitle(custom = cloneNewTheme(), baseId = DEFAULT_BASE_THEME_ID) {
  const source = themeLayers(custom, getBaseTheme(baseId));
  return resolveChromeStyle(source, "lineChart", resolveTheme(source.roots)).title;
}

test("a fresh working theme is minimal and contains no formatting overrides", () => {
  const theme = cloneNewTheme();

  assert.deepEqual(NEW_THEME, { name: "New theme" });
  assert.deepEqual(theme, { name: "New theme" });
  assert.equal("dataColors" in theme, false);
  assert.equal("background" in theme, false);
  assert.equal("foreground" in theme, false);
  assert.equal("tableAccent" in theme, false);
  assert.equal("textClasses" in theme, false);
  assert.equal("visualStyles" in theme, false);

  theme.name = "Changed locally";
  assert.equal(NEW_THEME.name, "New theme", "each new-theme reset receives an independent working object");
});

test("Classic 2026 is the initial base and fresh Line title values inherit from it", () => {
  assert.equal(DEFAULT_BASE_THEME_ID, "classic2026");
  const title = lineTitle();

  assert.equal(title.fontFamily, "DIN");
  assert.equal(title.fontSize, 14);
  assert.equal(title.bold, false);
  assert.equal(hasThemeValueAtPath(cloneNewTheme(), TITLE_FONT_PATH), false);
});

test("an explicit title font survives base switching and Reset exposes the current base again", () => {
  const override = updateThemeValue(cloneNewTheme(), TITLE_FONT_PATH, "Arial");

  for (const { id } of BASE_THEMES) {
    assert.equal(lineTitle(override, id).fontFamily, "Arial");
    assert.equal(readThemeValueAtPath(override, TITLE_FONT_PATH), "Arial");
  }

  const reset = deleteThemeValue(override, TITLE_FONT_PATH);
  assert.equal(hasThemeValueAtPath(reset, TITLE_FONT_PATH), false);
  assert.equal(lineTitle(reset, "classic2026").fontFamily, "DIN");
  assert.deepEqual(
    resolveTheme(themeLayers(reset, getBaseTheme("classic2026")).roots).palette,
    resolveTheme(getBaseTheme("classic2026")).palette,
    "the clean working layer cannot mask Classic 2026's palette",
  );
  assert.deepEqual(
    resolveTheme(themeLayers(reset, getBaseTheme("fluent2")).roots).palette,
    resolveTheme(getBaseTheme("fluent2")).palette,
    "the same clean layer inherits Fluent 2 independently",
  );
});

test("a whole-theme reset and immediate export contain only user-authored content", () => {
  const overridden = updateThemeValue(cloneNewTheme(), TITLE_FONT_PATH, "Arial");
  const reset = cloneNewTheme();

  assert.equal(readThemeValueAtPath(overridden, TITLE_FONT_PATH), "Arial");
  assert.deepEqual(reset, { name: "New theme" });
  assert.deepEqual(JSON.parse(`${JSON.stringify(reset)}\n`), { name: "New theme" });
});
