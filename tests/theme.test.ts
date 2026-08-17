import assert from "node:assert/strict";
import test from "node:test";
import { deleteThemeValue, hasThemeValueAtPath, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

test("hasThemeValueAtPath is false for a path that was never set", () => {
  const path = ["visualStyles", "tableEx", "*", "columnHeaders", 0, "backColor", "solid", "color"];
  assert.equal(hasThemeValueAtPath(STARTER_THEME, path), false);
});

test("hasThemeValueAtPath is true once updateThemeValue has written the path", () => {
  const path = ["visualStyles", "tableEx", "*", "columnHeaders", 0, "backColor", "solid", "color"];
  const updated = updateThemeValue(STARTER_THEME, path, "#0F3D6E");
  assert.equal(hasThemeValueAtPath(updated, path), true);
});

test("deleteThemeValue removes a set value, so hasThemeValueAtPath goes back to false", () => {
  const path = ["visualStyles", "tableEx", "*", "columnHeaders", 0, "backColor", "solid", "color"];
  const withValue = updateThemeValue(STARTER_THEME, path, "#0F3D6E");
  const cleared = deleteThemeValue(withValue, path);

  assert.equal(hasThemeValueAtPath(cleared, path), false);
});

test("deleteThemeValue prunes empty ancestor objects/arrays left behind", () => {
  const path = ["visualStyles", "clusteredBarChart", "*", "dataPoint", 0, "fill", "solid", "color"];
  const withValue = updateThemeValue(STARTER_THEME, path, "#912B88");
  const cleared = deleteThemeValue(withValue, path);

  // Nothing else was ever set under clusteredBarChart, so the whole empty
  // shell should be gone, not just the leaf value.
  assert.equal("clusteredBarChart" in (cleared.visualStyles ?? {}), false);
});

test("deleteThemeValue only prunes what it just emptied, leaving sibling overrides intact", () => {
  const fillPath = ["visualStyles", "clusteredBarChart", "*", "dataPoint", 0, "fill", "solid", "color"];
  const transparencyPath = ["visualStyles", "clusteredBarChart", "*", "dataPoint", 0, "fillTransparency"];

  const withBoth = updateThemeValue(
    updateThemeValue(STARTER_THEME, fillPath, "#912B88"),
    transparencyPath,
    10,
  );
  const clearedFillOnly = deleteThemeValue(withBoth, fillPath);

  assert.equal(hasThemeValueAtPath(clearedFillOnly, fillPath), false);
  assert.equal(hasThemeValueAtPath(clearedFillOnly, transparencyPath), true);
});

test("deleteThemeValue on a path that was never set is a harmless no-op", () => {
  const path = ["visualStyles", "tableEx", "*", "columnHeaders", 0, "backColor", "solid", "color"];
  const cleared = deleteThemeValue(STARTER_THEME, path);

  assert.deepEqual(cleared.visualStyles, {});
  assert.equal(cleared.name, "Sample theme");
});
