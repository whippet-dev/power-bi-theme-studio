import assert from "node:assert/strict";
import test from "node:test";
import { forState, groupSupportsStates, stateEntryIndex } from "../app/lib/properties";
import { ACTION_BUTTON_PROPERTIES, propertyThemePath } from "../app/lib/actionButtonProperties";
import { resolveBookmarkNavigatorStyle } from "../app/lib/bookmarkNavigatorProperties";
import { resolvePageNavigatorStyle } from "../app/lib/pageNavigatorProperties";
import { readThemeValueAtPath, resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const BARE: PowerBITheme = { name: "Sample theme", visualStyles: {} };

test("only the visuals whose schema carries $id support per-state formatting", () => {
  assert.equal(groupSupportsStates("actionButton", "fill"), true);
  assert.equal(groupSupportsStates("bookmarkNavigator", "accentBar"), true);
  assert.equal(groupSupportsStates("pageNavigator", "text"), true);

  // A plain Shape has no interaction states, and neither does a chart —
  // this must not become a global behaviour change.
  assert.equal(groupSupportsStates("shape", "fill"), false);
  assert.equal(groupSupportsStates("clusteredBarChart", "labels"), false);
});

test("an untagged entry is the default state, so themes written before states existed still read", () => {
  const legacy: PowerBITheme = {
    ...BARE,
    visualStyles: { actionButton: { "*": { fill: [{ fillColor: { solid: { color: "#112233" } } }] } } },
  };

  assert.equal(stateEntryIndex(legacy, "actionButton", "fill", "default"), 0);
});

test("each state resolves to its own entry", () => {
  const themed: PowerBITheme = {
    ...BARE,
    visualStyles: {
      actionButton: {
        "*": {
          fill: [
            { fillColor: { solid: { color: "#111111" } } },
            { $id: "hover", fillColor: { solid: { color: "#222222" } } },
            { $id: "disabled", fillColor: { solid: { color: "#333333" } } },
          ],
        },
      },
    },
  };

  assert.equal(stateEntryIndex(themed, "actionButton", "fill", "default"), 0);
  assert.equal(stateEntryIndex(themed, "actionButton", "fill", "hover"), 1);
  assert.equal(stateEntryIndex(themed, "actionButton", "fill", "disabled"), 2);
  // A state with no entry falls back to the default for reading...
  assert.equal(stateEntryIndex(themed, "actionButton", "fill", "selected"), 0);
  // ...but gets its own slot when something is written to it.
  assert.equal(stateEntryIndex(themed, "actionButton", "fill", "selected", true), 3);
});

test("writing a non-default state appends an entry instead of overwriting the default", () => {
  // Reproduces the round trip the property panel performs.
  const defaultPath = propertyThemePath(forState(ACTION_BUTTON_PROPERTIES.fill.fillColor, 0));
  let theme = updateThemeValue(BARE, defaultPath, "#112233");

  const hoverIndex = stateEntryIndex(theme, "actionButton", "fill", "hover", true);
  assert.equal(hoverIndex, 1, "hover must not land on the default's entry");

  theme = updateThemeValue(theme, ["visualStyles", "actionButton", "*", "fill", hoverIndex, "$id"], "hover");
  theme = updateThemeValue(theme, propertyThemePath(forState(ACTION_BUTTON_PROPERTIES.fill.fillColor, hoverIndex)), "#AABBCC");

  assert.equal(readThemeValueAtPath(theme, [...defaultPath]), "#112233", "the default state must survive");
  assert.equal(readThemeValueAtPath(theme, ["visualStyles", "actionButton", "*", "fill", 1, "$id"]), "hover");
  assert.equal(
    readThemeValueAtPath(theme, propertyThemePath(forState(ACTION_BUTTON_PROPERTIES.fill.fillColor, 1))),
    "#AABBCC",
  );
});

test("bookmark and page navigator resolvers pick up accentBar's own per-state entry", () => {
  const themed: PowerBITheme = {
    ...BARE,
    visualStyles: {
      bookmarkNavigator: {
        "*": {
          accentBar: [{ color: { solid: { color: "#111111" } } }, { $id: "hover", color: { solid: { color: "#222222" } } }],
        },
      },
      pageNavigator: {
        "*": {
          accentBar: [{ color: { solid: { color: "#333333" } } }, { $id: "hover", color: { solid: { color: "#444444" } } }],
        },
      },
    },
  };
  const base = resolveTheme(themed);

  assert.equal(resolveBookmarkNavigatorStyle(themed, base).accentBar.color, "#111111");
  assert.equal(resolveBookmarkNavigatorStyle(themed, base, "hover").accentBar.color, "#222222");
  assert.equal(resolvePageNavigatorStyle(themed, base).accentBar.color, "#333333");
  assert.equal(resolvePageNavigatorStyle(themed, base, "hover").accentBar.color, "#444444");
});

test("forState retargets the array index without disturbing the rest of the path", () => {
  const base = ACTION_BUTTON_PROPERTIES.fill.fillColor;
  assert.deepEqual(base.path, ["fill", 0, "fillColor"]);
  assert.deepEqual(forState(base, 2).path, ["fill", 2, "fillColor"]);
  // The original definition must not be mutated — registries are shared.
  assert.deepEqual(base.path, ["fill", 0, "fillColor"]);
});
