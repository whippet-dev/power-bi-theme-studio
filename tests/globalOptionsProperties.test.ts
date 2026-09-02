import assert from "node:assert/strict";
import test from "node:test";
import { GLOBAL_OPTIONS_PROPERTIES, propertyThemePath, resolveGlobalOptionsStyle } from "../app/lib/globalOptionsProperties";
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
    report: {
      "*": {
        outspacePane: [{ expanded: false }],
      },
    },
    page: {
      "*": {
        background: [{ color: { solid: { color: "#101820" } } }],
        pageSize: [{ pageSizeTypes: "Standard" }],
      },
    },
  },
};

test("resolveGlobalOptionsStyle falls back to sensible defaults when there is no override", () => {
  const base = resolveTheme(STARTER_THEME);
  const global = resolveGlobalOptionsStyle(STARTER_THEME, base);

  assert.equal(global.reportFilterPaneState.visible, true);
  assert.equal(global.pageBackground.color, base.background);
  assert.equal(global.pageSize.pageSizeTypes, "Widescreen");
  // 200, not the old 320: measured natively on all three shipped bases and
  // unmoved by a fingerprint theme -- see pageFilterNativeDefaults.test.ts.
  assert.equal(global.pageFilterPane.width, 200);
});

test("resolveGlobalOptionsStyle picks up report- and page-level overrides independently", () => {
  const base = resolveTheme(THEME_WITH_OVERRIDE);
  const global = resolveGlobalOptionsStyle(THEME_WITH_OVERRIDE, base);

  assert.equal(global.reportFilterPaneState.expanded, false);
  assert.equal(global.pageBackground.color, "#101820");
  assert.equal(global.pageSize.pageSizeTypes, "Standard");
});

test("filter pane styling is read from the shared visualStyles['*']['*'] bucket, where real themes actually put it", () => {
  // Regression: only the `page` bucket was read, so a theme styling its
  // filter pane the common way (the shared bucket — which is what Power
  // BI's own theme generator emits) appeared to do nothing at all.
  const sharedBucketTheme: PowerBITheme = {
    ...STARTER_THEME,
    visualStyles: {
      "*": {
        "*": {
          outspacePane: [{ backgroundColor: { solid: { color: "#12436D" } }, foregroundColor: { solid: { color: "#FFFFFF" } } }],
          filterCard: [{ backgroundColor: { solid: { color: "#FFFFFF" } } }],
          outspace: [{ color: { solid: { color: "#F3F2F1" } } }],
        },
      },
    },
  };

  const global = resolveGlobalOptionsStyle(sharedBucketTheme, resolveTheme(sharedBucketTheme));
  assert.equal(global.pageFilterPane.backgroundColor, "#12436D");
  assert.equal(global.pageFilterPane.foregroundColor, "#FFFFFF");
  assert.equal(global.pageFilterCards.backgroundColor, "#FFFFFF");
  assert.equal(global.pageWallpaper.color, "#F3F2F1");
});

test("a page-specific value still beats the shared bucket, so both can be set at once", () => {
  const bothBuckets: PowerBITheme = {
    ...STARTER_THEME,
    visualStyles: {
      "*": { "*": { outspacePane: [{ backgroundColor: { solid: { color: "#12436D" } }, fontFamily: "Segoe UI" }] } },
      page: { "*": { outspacePane: [{ fontFamily: "Arial" }] } },
    },
  };

  const global = resolveGlobalOptionsStyle(bothBuckets, resolveTheme(bothBuckets));
  assert.equal(global.pageFilterPane.fontFamily, "Arial", "the page bucket must win where it sets a value");
  assert.equal(global.pageFilterPane.backgroundColor, "#12436D", "and fall through to shared where it doesn't");
});

test("propertyThemePath writes a page background colour round-trip through updateThemeValue and resolveGlobalOptionsStyle", () => {
  const path = propertyThemePath(GLOBAL_OPTIONS_PROPERTIES.pageBackground.color);
  assert.deepEqual(path, ["visualStyles", "page", "*", "background", 0, "color", "solid", "color"]);

  const updated = updateThemeValue(STARTER_THEME, path, "#00FF00");
  const base = resolveTheme(updated);
  const global = resolveGlobalOptionsStyle(updated, base);

  assert.equal(global.pageBackground.color, "#00FF00");
});

test("instance/identity fields are intentionally excluded as *editable* properties: filterCard.$id, pageInformationName/pageInformationAltName (per-page identity, not a theme-wide default), and every group's 'image' field (complex nested object)", () => {
  // $id itself still isn't a stylable value a user picks — but unlike the
  // others here, what it discriminates (filterCard's Applied/Available
  // states) *is* now read distinctly by resolveGlobalOptionsStyle, via
  // filterCardEntryIndex — see the tests below. An earlier version of
  // this comment treated $id as "just excluded" the same as the others,
  // which undersold that the two states it tags render differently in
  // real Power BI (confirmed against a screenshot) and needed their own
  // resolution path, not just a skipped property definition.
  assert.equal("$id" in GLOBAL_OPTIONS_PROPERTIES.pageFilterCards, false);
  assert.equal("pageInformationName" in GLOBAL_OPTIONS_PROPERTIES.pageInformation, false);
  assert.equal("pageInformationAltName" in GLOBAL_OPTIONS_PROPERTIES.pageInformation, false);
  assert.equal("image" in GLOBAL_OPTIONS_PROPERTIES.pageBackground, false);
  assert.equal("image" in GLOBAL_OPTIONS_PROPERTIES.pageWallpaper, false);
});

test("pageFilterCards resolves the 'Available' $id entry and pageFilterCardsApplied resolves 'Applied', independently", () => {
  const themeWithBothStates: PowerBITheme = {
    ...STARTER_THEME,
    visualStyles: {
      page: {
        "*": {
          filterCard: [
            { $id: "Applied", backgroundColor: { solid: { color: "#F3F2F1" } } },
            { $id: "Available", backgroundColor: { solid: { color: "#FFFFFF" } } },
          ],
        },
      },
    },
  };

  const global = resolveGlobalOptionsStyle(themeWithBothStates, resolveTheme(themeWithBothStates));
  assert.equal(global.pageFilterCards.backgroundColor, "#FFFFFF", "pageFilterCards reads the Available entry, regardless of array order");
  assert.equal(global.pageFilterCardsApplied.backgroundColor, "#F3F2F1", "pageFilterCardsApplied reads the Applied entry");
});

test("a theme with only one untagged filterCard entry applies it to both Available and Applied, rather than losing the override", () => {
  // Themes written before Applied/Available existed (or that just don't
  // bother splitting them) still need to work -- same "untagged = default"
  // reasoning as the button/navigator interaction states.
  const legacyTheme: PowerBITheme = {
    ...STARTER_THEME,
    visualStyles: { page: { "*": { filterCard: [{ backgroundColor: { solid: { color: "#EEEEEE" } } }] } } },
  };

  const global = resolveGlobalOptionsStyle(legacyTheme, resolveTheme(legacyTheme));
  assert.equal(global.pageFilterCards.backgroundColor, "#EEEEEE");
  assert.equal(global.pageFilterCardsApplied.backgroundColor, "#EEEEEE");
});

test("every resolved GLOBAL_OPTIONS_PROPERTIES path is unique (no accidental JSON collisions)", () => {
  const seen = new Set<string>();
  for (const group of Object.values(GLOBAL_OPTIONS_PROPERTIES)) {
    for (const definition of Object.values(group)) {
      const key = propertyThemePath(definition).join(".");
      assert.equal(seen.has(key), false, `duplicate theme path: ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 38, `expected 38 resolved properties, got ${seen.size}`);
});
