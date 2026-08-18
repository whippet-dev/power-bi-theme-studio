import assert from "node:assert/strict";
import test from "node:test";
import { mergeThemeOverBase, readThemeValueAtPath, type PowerBITheme } from "../app/lib/theme";

test("a value the override doesn't set falls through to the base theme", () => {
  const base: PowerBITheme = { name: "Base", foreground: "#111111", visualStyles: {} };
  const override: PowerBITheme = { name: "Mine", visualStyles: {} };

  const merged = mergeThemeOverBase(base, override);

  assert.equal(merged.foreground, "#111111");
  assert.equal(merged.name, "Mine", "the override's own values still win");
});

test("a value the override does set wins over the base theme, even nested", () => {
  const base: PowerBITheme = {
    visualStyles: { actionButton: { "*": { fill: [{ show: true, fillColor: { solid: { color: "#005EA5" } } }] } } },
  };
  const override: PowerBITheme = {
    visualStyles: { actionButton: { "*": { fill: [{ fillColor: { solid: { color: "#FF00FF" } } }] } } },
  };

  const merged = mergeThemeOverBase(base, override);

  assert.equal(
    readThemeValueAtPath(merged, ["visualStyles", "actionButton", "*", "fill", 0, "fillColor", "solid", "color"]),
    "#FF00FF",
    "override's colour wins",
  );
  assert.equal(
    readThemeValueAtPath(merged, ["visualStyles", "actionButton", "*", "fill", 0, "show"]),
    true,
    "a sibling field the override never mentioned still inherits from the base theme -- this is the whole point: layering happens leaf-by-leaf, not by replacing the whole group wholesale",
  );
});

test("array entries merge by index rather than the override's array replacing the base's wholesale", () => {
  const base: PowerBITheme = {
    visualStyles: {
      actionButton: {
        "*": {
          fill: [{ fillColor: { solid: { color: "#111111" } } }, { $id: "hover", fillColor: { solid: { color: "#222222" } } }],
        },
      },
    },
  };
  // Override only touches index 0 (default state) -- index 1 (hover) isn't
  // mentioned at all, so it must still come through from the base theme.
  const override: PowerBITheme = {
    visualStyles: { actionButton: { "*": { fill: [{ fillColor: { solid: { color: "#FF00FF" } } }] } } },
  };

  const merged = mergeThemeOverBase(base, override);

  assert.equal(readThemeValueAtPath(merged, ["visualStyles", "actionButton", "*", "fill", 0, "fillColor", "solid", "color"]), "#FF00FF");
  assert.equal(readThemeValueAtPath(merged, ["visualStyles", "actionButton", "*", "fill", 1, "fillColor", "solid", "color"]), "#222222");
  assert.equal(readThemeValueAtPath(merged, ["visualStyles", "actionButton", "*", "fill", 1, "$id"]), "hover");
});

test("neither side setting a value leaves it absent, so the resolver's own hardcoded fallback still applies", () => {
  const base: PowerBITheme = { visualStyles: {} };
  const override: PowerBITheme = { visualStyles: {} };

  const merged = mergeThemeOverBase(base, override);

  assert.equal(readThemeValueAtPath(merged, ["visualStyles", "actionButton", "*", "fill", 0, "fillColor"]), undefined);
});

test("a shorter override array merges by index rather than replacing the base array wholesale", () => {
  const base: PowerBITheme = { dataColors: ["#111111", "#222222"] };
  const override: PowerBITheme = { dataColors: ["#FF00FF"] };

  const merged = mergeThemeOverBase(base, override);

  // The override's single entry wins at index 0, but the base's second
  // colour survives at index 1 since the override never touched it. This
  // documents the chosen behaviour (index-based merge) rather than a
  // wholesale-replace, since dataColors is exactly the kind of array
  // where either interpretation is plausible without a concrete example.
  assert.equal(readThemeValueAtPath(merged, ["dataColors", 0]), "#FF00FF");
  assert.equal(readThemeValueAtPath(merged, ["dataColors", 1]), "#222222");
});

test("a primitive in the override replaces a differently-typed value in the base outright", () => {
  const base: PowerBITheme = { visualStyles: { card: { "*": { title: [{ show: true }] } } } };
  const override: PowerBITheme = { visualStyles: { card: "not-an-object-anymore" } };

  const merged = mergeThemeOverBase(base, override);

  assert.equal(merged.visualStyles?.card, "not-an-object-anymore");
});
