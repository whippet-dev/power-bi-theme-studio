import assert from "node:assert/strict";
import test from "node:test";
import { CHROME_PROPERTIES, chromeThemePath, resolveChromeStyle } from "../app/lib/chromeProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  textClasses: {
    title: { fontFace: "Segoe UI", fontSize: 12, color: "#0B0C0C" },
  },
  visualStyles: {},
};

// A theme-wide default (visualStyles["*"]["*"]) plus a Table-specific
// override for the same property (visualStyles.tableEx["*"]) — the
// override must win only when resolving Table; every other visual should
// still see the shared default.
const THEME_WITH_SHARED_AND_OVERRIDE: PowerBITheme = {
  ...STARTER_THEME,
  visualStyles: {
    "*": {
      "*": {
        title: [{ show: true, fontColor: { solid: { color: "#222222" } }, bold: false }],
      },
    },
    tableEx: {
      "*": {
        title: [{ fontColor: { solid: { color: "#0F3D6E" } } }],
      },
    },
  },
};

test("resolveChromeStyle falls back to plain defaults when nothing is set anywhere", () => {
  const base = resolveTheme(STARTER_THEME);
  const chrome = resolveChromeStyle(STARTER_THEME, "clusteredBarChart", base);

  assert.equal(chrome.title.show, true);
  assert.equal(chrome.title.fontColor, base.foreground);
  assert.equal(chrome.background.show, false);
  assert.equal(chrome.border.show, false);
});

test("resolveChromeStyle applies the shared visualStyles['*']['*'] default to a visual with no specific override", () => {
  const base = resolveTheme(THEME_WITH_SHARED_AND_OVERRIDE);
  const chrome = resolveChromeStyle(THEME_WITH_SHARED_AND_OVERRIDE, "clusteredBarChart", base);

  assert.equal(chrome.title.fontColor, "#222222");
  assert.equal(chrome.title.bold, false);
});

test("resolveChromeStyle prefers a visual-specific override over the shared default", () => {
  const base = resolveTheme(THEME_WITH_SHARED_AND_OVERRIDE);
  const tableChrome = resolveChromeStyle(THEME_WITH_SHARED_AND_OVERRIDE, "tableEx", base);
  const barChrome = resolveChromeStyle(THEME_WITH_SHARED_AND_OVERRIDE, "clusteredBarChart", base);

  // Table has its own fontColor override — it wins over the shared default.
  assert.equal(tableChrome.title.fontColor, "#0F3D6E");
  // Table didn't override `show`/`bold`, so those still inherit from shared.
  assert.equal(tableChrome.title.show, true);
  assert.equal(tableChrome.title.bold, false);
  // Bar chart has no override at all — it sees only the shared default.
  assert.equal(barChrome.title.fontColor, "#222222");
});

test("resolveChromeStyle covers the 11 previously-excluded shared groups (divider/dropShadow/general/lockAspect/padding/spacing/stylePreset/visualHeader/visualHeaderTooltip/visualLink/visualTooltip)", () => {
  const base = resolveTheme(STARTER_THEME);
  const chrome = resolveChromeStyle(STARTER_THEME, "clusteredBarChart", base);

  assert.equal(chrome.divider.show, false);
  assert.equal(chrome.dropShadow.preset, "BottomRight");
  assert.equal(chrome.general.altText, "");
  assert.equal(chrome.lockAspect.show, false);
  assert.equal(chrome.padding.top, 0);
  assert.equal(chrome.spacing.customizeSpacing, false);
  assert.equal(chrome.stylePreset.name, "");
  assert.equal(chrome.visualHeader.show, true);
  assert.equal(chrome.visualHeaderTooltip.type, "Default");
  assert.equal(chrome.visualLink.show, false);
  assert.equal(chrome.visualTooltip.show, true);
});

test("resolveChromeStyle picks up overrides in the newly-added groups, inheriting shared-vs-specific like every other chrome property", () => {
  const themeWithOverride: PowerBITheme = {
    ...STARTER_THEME,
    visualStyles: {
      "*": { "*": { dropShadow: [{ show: true }] } },
      clusteredBarChart: { "*": { visualHeader: [{ show: false }] } },
    },
  };
  const base = resolveTheme(themeWithOverride);
  const barChrome = resolveChromeStyle(themeWithOverride, "clusteredBarChart", base);
  const tableChrome = resolveChromeStyle(themeWithOverride, "tableEx", base);

  assert.equal(barChrome.visualHeader.show, false); // visual-specific override wins
  assert.equal(barChrome.dropShadow.show, true); // shared default still applies
  assert.equal(tableChrome.dropShadow.show, true); // shared default applies to a visual with no override at all
  assert.equal(tableChrome.visualHeader.show, true); // Table never overrode this, so it keeps the plain default
});

test("visualLink.dataFunction ($ref itemLocation, a complex workspace/item reference) and general.x/y/width/height (instance placement, not a stylable default) are excluded", () => {
  assert.equal("dataFunction" in CHROME_PROPERTIES.visualLink, false);
  assert.equal("x" in CHROME_PROPERTIES.general, false);
  assert.equal("y" in CHROME_PROPERTIES.general, false);
  assert.equal("width" in CHROME_PROPERTIES.general, false);
  assert.equal("height" in CHROME_PROPERTIES.general, false);
});

test("every resolved CHROME_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(CHROME_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = chromeThemePath("*", definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 135, `expected 135 resolved properties, got ${seen.size}`);
});

test("chromeThemePath('*', ...) writes to the shared bucket; a specific visual key writes to that visual's override", () => {
  const sharedPath = chromeThemePath("*", CHROME_PROPERTIES.title.fontColor);
  const tablePath = chromeThemePath("tableEx", CHROME_PROPERTIES.title.fontColor);

  assert.deepEqual(sharedPath, ["visualStyles", "*", "*", "title", 0, "fontColor", "solid", "color"]);
  assert.deepEqual(tablePath, ["visualStyles", "tableEx", "*", "title", 0, "fontColor", "solid", "color"]);

  const updated = updateThemeValue(STARTER_THEME, sharedPath, "#ABCDEF");
  const base = resolveTheme(updated);
  const slicerChrome = resolveChromeStyle(updated, "slicer", base);

  // Writing the shared bucket affects a visual that never had its own override.
  assert.equal(slicerChrome.title.fontColor, "#ABCDEF");
});
