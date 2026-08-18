import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveTextClasses,
  resolveThemeColors,
  TEXT_CLASS_PROPERTIES,
  THEME_COLOR_PROPERTIES,
  themeGlobalThemePath,
} from "../app/lib/themeGlobalsProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

test("resolveThemeColors falls back to app-chosen defaults when nothing is set, and reads plain hex strings (not fill-wrapped) when set", () => {
  const base = resolveTheme(STARTER_THEME);
  const colors = resolveThemeColors(STARTER_THEME, base);
  assert.equal(colors.good, "#1AAB40");
  assert.equal(colors.accent, base.tableAccent);

  const withOverride: PowerBITheme = { ...STARTER_THEME, good: "#00FF00" };
  const overrideColors = resolveThemeColors(withOverride, resolveTheme(withOverride));
  assert.equal(overrideColors.good, "#00FF00");
});

// Defaults below are verified against themes/base/classic2026.json (the
// real Classic 2026 base theme, sourced from the Power BI Desktop install
// — see that file's _note) — callout's 24pt is also what Card's own
// calloutSize reads by default.
test("resolveTextClasses falls back to Classic 2026's verified per-class defaults", () => {
  const base = resolveTheme(STARTER_THEME);
  const classes = resolveTextClasses(STARTER_THEME, base);
  assert.equal(classes.calloutFontSize, 24);
  assert.equal(classes.calloutColor, "#252423");
  assert.equal(base.calloutSize, 24);
  // Title (DIN, unstyled) isn't documented as bold; header (Segoe UI
  // Semibold) is approximated as bold since this app has no weight dial.
  assert.equal(classes.titleFontWeight, "normal");
  assert.equal(classes.headerFontWeight, "bold");
  // The three "light" secondary classes default to #605E5C, not the
  // theme's own plain foreground colour.
  assert.equal(classes.lightLabelColor, "#605E5C");
  assert.equal(classes.largeLightLabelColor, "#605E5C");
  assert.equal(classes.smallLightLabelColor, "#605E5C");
  assert.equal(classes.labelColor, "#252423");
});

test("themeGlobalThemePath returns the raw root path with no visualStyles prefix, and round-trips through updateThemeValue", () => {
  const path = themeGlobalThemePath(THEME_COLOR_PROPERTIES.hyperlink);
  assert.deepEqual(path, ["hyperlink"]);

  const updated = updateThemeValue(STARTER_THEME, path, "#123456");
  const colors = resolveThemeColors(updated, resolveTheme(updated));
  assert.equal(colors.hyperlink, "#123456");
});

test("text class properties write through theme.textClasses.<class>.<field>, not visualStyles", () => {
  const path = themeGlobalThemePath(TEXT_CLASS_PROPERTIES.titleFontSize);
  assert.deepEqual(path, ["textClasses", "title", "fontSize"]);

  const updated = updateThemeValue(STARTER_THEME, path, 16);
  const classes = resolveTextClasses(updated, resolveTheme(updated));
  assert.equal(classes.titleFontSize, 16);
});

test("every resolved THEME_COLOR_PROPERTIES path is unique and there are 32 of them", () => {
  const seen = new Set<string>();
  for (const definition of Object.values(THEME_COLOR_PROPERTIES)) {
    const key = themeGlobalThemePath(definition).join(".");
    assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
    seen.add(key);
  }
  assert.equal(seen.size, 32, `expected 32 resolved colours, got ${seen.size}`);
});

test("every resolved TEXT_CLASS_PROPERTIES path is unique and there are 56 of them (14 classes x 4 fields)", () => {
  const seen = new Set<string>();
  for (const definition of Object.values(TEXT_CLASS_PROPERTIES)) {
    const key = themeGlobalThemePath(definition).join(".");
    assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
    seen.add(key);
  }
  assert.equal(seen.size, 56, `expected 56 resolved text-class properties, got ${seen.size}`);
});
