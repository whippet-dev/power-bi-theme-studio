import assert from "node:assert/strict";
import test from "node:test";
import fluent2 from "../themes/base/fluent2.json" with { type: "json" };
import { BAR_CHART_PROPERTIES, resolveBarChartStyle } from "../app/lib/barChartProperties";
import { CHROME_PROPERTIES } from "../app/lib/chromeProperties";
import {
  isGroupSetBy,
  resolveChromeEntry,
  resolvePropertyEntry,
  resolvePropertyValue,
  themeLayers,
} from "../app/lib/properties";
import { resolveTheme, type PowerBITheme } from "../app/lib/theme";

/**
 * Provenance-aware resolution (ARCHITECTURE_REVIEW.md §3.6 / §5C).
 *
 * Resolution used to collapse to a bare value, which made "unset" and "set
 * to the default value" indistinguishable. That is why the renderer had to
 * reach past the resolver into raw theme JSON (hasSmallMultiplesOverride)
 * to answer "did the user actually ask for this?", and why a default of
 * 0 / false / "" repeatedly caused features to render when they shouldn't.
 */

const BASE_FLUENT_2 = fluent2 as unknown as PowerBITheme;
const LABEL_COLOR = BAR_CHART_PROPERTIES.categoryAxis.labelColor;
const FONT_SIZE = BAR_CHART_PROPERTIES.categoryAxis.fontSize;

// --- the five sources, in precedence order --------------------------------

test("a value in the custom theme's own visual bucket reports custom-visual", () => {
  const custom: PowerBITheme = {
    visualStyles: { clusteredBarChart: { "*": { categoryAxis: [{ fontSize: 22 }] } } },
  };
  const entry = resolvePropertyEntry(themeLayers(custom, BASE_FLUENT_2), FONT_SIZE, 6);

  assert.equal(entry.value, 22);
  assert.equal(entry.source, "custom-visual");
  assert.equal(entry.isSet, true);
});

test("a value in the custom theme's wildcard bucket reports custom-wildcard", () => {
  const custom: PowerBITheme = {
    visualStyles: { "*": { "*": { categoryAxis: [{ fontSize: 19 }] } } },
  };
  const entry = resolvePropertyEntry(themeLayers(custom, BASE_FLUENT_2), FONT_SIZE, 6);

  assert.equal(entry.value, 19);
  assert.equal(entry.source, "custom-wildcard");
});

test("a value only the base theme sets on the visual reports base-visual", () => {
  // Fluent 2 sets lineChart-specific categoryAxis.gridlineShow = false.
  const entry = resolvePropertyEntry(
    themeLayers({ visualStyles: {} }, BASE_FLUENT_2),
    { visual: "lineChart", path: ["categoryAxis", 0, "gridlineShow"], valueType: "boolean" },
    true,
  );

  assert.equal(entry.value, false);
  assert.equal(entry.source, "base-visual");
  assert.equal(entry.isSet, true);
});

test("a value only the base theme sets in its wildcard bucket reports base-wildcard", () => {
  // Fluent 2 sets visualStyles["*"]["*"].categoryAxis[0].fontSize = 10.5.
  const entry = resolvePropertyEntry(themeLayers({ visualStyles: {} }, BASE_FLUENT_2), FONT_SIZE, 6);

  assert.equal(entry.value, 10.5);
  assert.equal(entry.source, "base-wildcard");
});

test("a value nothing sets reports fallback, and isSet is false", () => {
  const entry = resolvePropertyEntry(themeLayers({ visualStyles: {} }, { visualStyles: {} }), FONT_SIZE, 6);

  assert.equal(entry.value, 6);
  assert.equal(entry.source, "fallback");
  assert.equal(entry.isSet, false);
});

// --- cross-layer precedence, now expressed through provenance -------------

test("custom wildcard outranks base visual-specific, and says so", () => {
  const custom: PowerBITheme = {
    visualStyles: { "*": { "*": { categoryAxis: [{ gridlineShow: true }] } } },
  };
  const entry = resolvePropertyEntry(
    themeLayers(custom, BASE_FLUENT_2),
    { visual: "lineChart", path: ["categoryAxis", 0, "gridlineShow"], valueType: "boolean" },
    false,
  );

  assert.equal(entry.value, true);
  assert.equal(entry.source, "custom-wildcard", "the layer axis dominates the specificity axis");
});

test("custom visual-specific outranks custom wildcard", () => {
  const custom: PowerBITheme = {
    visualStyles: {
      "*": { "*": { categoryAxis: [{ fontSize: 9 }] } },
      clusteredBarChart: { "*": { categoryAxis: [{ fontSize: 22 }] } },
    },
  };
  const entry = resolvePropertyEntry(themeLayers(custom, BASE_FLUENT_2), FONT_SIZE, 6);

  assert.equal(entry.value, 22);
  assert.equal(entry.source, "custom-visual");
});

// --- the whole point: explicit falsey values are not "unset" --------------

test("an explicit `false` is reported as set, not confused with an unset boolean", () => {
  const custom: PowerBITheme = {
    visualStyles: { clusteredBarChart: { "*": { categoryAxis: [{ show: false }] } } },
  };
  const definition: Parameters<typeof resolvePropertyEntry<"boolean">>[1] = { visual: "clusteredBarChart", path: ["categoryAxis", 0, "show"], valueType: "boolean" };

  const explicit = resolvePropertyEntry(themeLayers(custom, { visualStyles: {} }), definition, false);
  const unset = resolvePropertyEntry(themeLayers({ visualStyles: {} }, { visualStyles: {} }), definition, false);

  assert.equal(explicit.value, false);
  assert.equal(unset.value, false, "same value...");
  assert.equal(explicit.isSet, true, "...but only one was actually set");
  assert.equal(unset.isSet, false);
  assert.notEqual(explicit.source, unset.source);
});

test("an explicit `0` is reported as set, not confused with an unset number", () => {
  const custom: PowerBITheme = {
    visualStyles: { clusteredBarChart: { "*": { categoryAxis: [{ fontSize: 0 }] } } },
  };
  const explicit = resolvePropertyEntry(themeLayers(custom, { visualStyles: {} }), FONT_SIZE, 0);
  const unset = resolvePropertyEntry(themeLayers({ visualStyles: {} }, { visualStyles: {} }), FONT_SIZE, 0);

  assert.equal(explicit.value, 0);
  assert.equal(unset.value, 0);
  assert.equal(explicit.isSet, true);
  assert.equal(unset.isSet, false);
});

test("an explicit empty string is reported as set", () => {
  const definition: Parameters<typeof resolvePropertyEntry<"text">>[1] = { visual: "clusteredBarChart", path: ["categoryAxis", 0, "titleText"], valueType: "text" };
  const custom: PowerBITheme = {
    visualStyles: { clusteredBarChart: { "*": { categoryAxis: [{ titleText: "" }] } } },
  };

  const explicit = resolvePropertyEntry(themeLayers(custom, { visualStyles: {} }), definition, "");
  const unset = resolvePropertyEntry(themeLayers({ visualStyles: {} }, { visualStyles: {} }), definition, "");

  assert.equal(explicit.value, "");
  assert.equal(explicit.isSet, true);
  assert.equal(unset.isSet, false);
});

// --- compatibility: the bare-value API is unchanged -----------------------

test("resolvePropertyValue still returns a bare value, and agrees with the entry it wraps", () => {
  const custom: PowerBITheme = {
    visualStyles: { clusteredBarChart: { "*": { categoryAxis: [{ fontSize: 22 }] } } },
  };
  const source = themeLayers(custom, BASE_FLUENT_2);

  assert.equal(resolvePropertyValue(source, FONT_SIZE, 6), 22);
  assert.equal(resolvePropertyValue(source, FONT_SIZE, 6), resolvePropertyEntry(source, FONT_SIZE, 6).value);
});

test("a plain PowerBITheme still works as a resolution source, with no base layer", () => {
  // Every existing test and caller passes a bare theme; that must keep working.
  const plain: PowerBITheme = {
    visualStyles: { clusteredBarChart: { "*": { categoryAxis: [{ fontSize: 14 }] } } },
  };

  assert.equal(resolvePropertyValue(plain, FONT_SIZE, 6), 14);
  assert.equal(resolvePropertyEntry(plain, FONT_SIZE, 6).source, "custom-visual");
});

test("colour tokens and ThemeDataColor still resolve, and carry provenance", () => {
  const source = themeLayers({ visualStyles: {} }, BASE_FLUENT_2);
  const entry = resolvePropertyEntry(source, LABEL_COLOR, "#000000");

  assert.equal(entry.value, "#616161", "token resolved against the theme's roots");
  assert.equal(entry.source, "base-wildcard");
});

test("a custom dataColors override still feeds a base-theme ThemeDataColor expression", () => {
  // Root-level values merge custom-over-base, which colour resolution needs.
  const source = themeLayers({ dataColors: ["#AA0000"], visualStyles: {} }, BASE_FLUENT_2);
  const entry = resolvePropertyEntry(
    source,
    { visual: "pieChart", path: ["dataPoint", 0, "borderColor"], valueType: "color" },
    "#E3E3E3",
  );

  assert.equal(entry.value, "#AA0000");
  assert.equal(entry.source, "base-visual", "the expression lives in the base theme...");
});

test("chrome resolution reports provenance too, against the active visual", () => {
  const custom: PowerBITheme = {
    visualStyles: { "*": { "*": { title: [{ fontColor: { solid: { color: "#00AA00" } } }] } } },
  };
  const entry = resolveChromeEntry(
    themeLayers(custom, BASE_FLUENT_2),
    "clusteredBarChart",
    CHROME_PROPERTIES.title.fontColor,
    "#000000",
  );

  assert.equal(entry.value, "#00AA00");
  assert.equal(entry.source, "custom-wildcard");
});

// --- group-level presence, replacing the renderer's raw-JSON read ---------

test("isGroupSetBy distinguishes a group the user set from one only the base theme ships", () => {
  // Fluent 2 ships a smallMultiplesLayout for lineChart. That is *not* a
  // signal the user turned small multiples on — it's the styling to use if
  // they do. Only the custom layer expresses intent, which is exactly the
  // distinction the renderer needs and a bare boolean could not make.
  const baseOnly = themeLayers({ visualStyles: {} }, BASE_FLUENT_2);
  assert.equal(isGroupSetBy(baseOnly, "lineChart", "smallMultiplesLayout", "custom"), false);
  assert.equal(isGroupSetBy(baseOnly, "lineChart", "smallMultiplesLayout", "any"), true);

  const userAsked = themeLayers(
    { visualStyles: { lineChart: { "*": { smallMultiplesLayout: [{ columnCount: 2 }] } } } },
    BASE_FLUENT_2,
  );
  assert.equal(isGroupSetBy(userAsked, "lineChart", "smallMultiplesLayout", "custom"), true);
});

test("isGroupSetBy sees a group set through the custom wildcard bucket", () => {
  const source = themeLayers(
    { visualStyles: { "*": { "*": { smallMultiplesLayout: [{ columnCount: 3 }] } } } },
    BASE_FLUENT_2,
  );

  assert.equal(isGroupSetBy(source, "clusteredBarChart", "smallMultiplesLayout", "custom"), true);
});

test("an empty group entry does not count as set", () => {
  const source = themeLayers({ visualStyles: { lineChart: { "*": { smallMultiplesLayout: [] } } } }, undefined);
  assert.equal(isGroupSetBy(source, "lineChart", "smallMultiplesLayout", "custom"), false);
});

// --- the resolved style still behaves, end to end ------------------------

test("resolved styles are unchanged in shape and value by the provenance work", () => {
  const custom: PowerBITheme = {
    visualStyles: { clusteredBarChart: { "*": { categoryAxis: [{ fontSize: 22 }] } } },
  };
  const source = themeLayers(custom, BASE_FLUENT_2);
  const bar = resolveBarChartStyle(source, resolveTheme(source.roots));

  assert.equal(bar.categoryAxis.fontSize, 22, "custom-visual wins");
  assert.equal(bar.categoryAxis.labelColor, "#616161", "base wildcard token still resolves");
  assert.equal(bar.valueAxis.gridlineColor, "#F0F0F0", "base wildcard sibling still resolves");
});
