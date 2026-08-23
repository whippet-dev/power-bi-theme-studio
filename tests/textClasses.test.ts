import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { themeLayers } from "../app/lib/properties";
import { resolveTextClass, resolveTextRole, TEXT_ROLE_CLASS } from "../app/lib/textClasses";
import {
  deleteThemeValue,
  hasThemeValueAtPath,
  resolveTheme,
  updateThemeValue,
  type PowerBITheme,
} from "../app/lib/theme";

/**
 * Power BI's text-class system, and the Clustered Bar pilot that consumes it.
 *
 * The derivation rules under test are transcribed from Power BI Desktop's own
 * `applyTextClassDefaults` (see app/lib/textClasses.ts), so these assert a
 * documented implementation rather than a guess. The numbers that look
 * arbitrary — 12.6, 25.7 — are that function's arithmetic.
 */

/**
 * The real private theme. It lives in the user's Downloads rather than the repo
 * — it is a real customer theme, deliberately not vendored — so the tests
 * that need it skip when it is absent instead of failing on another machine.
 */
const PRIVATE_THEME_PATH = `${process.env.USERPROFILE ?? ""}/Downloads/private-theme-fixture.json`;
const hasPrivateTheme = existsSync(PRIVATE_THEME_PATH);
const privateTheme = (): PowerBITheme => JSON.parse(readFileSync(PRIVATE_THEME_PATH, "utf8")) as PowerBITheme;

const EMPTY: PowerBITheme = { name: "none", visualStyles: {} };

/**
 * Declares only the four primaries, deliberately distinctive. Exists to prove
 * secondary derivation: the private fixture cannot, because it declares its own
 * secondary classes explicitly.
 */
const PRIMARY_ONLY: PowerBITheme = {
  name: "Primary only",
  foregroundNeutralSecondary: "#AA00AA",
  dataColors: ["#123456"],
  textClasses: {
    callout: { fontFace: "Papyrus", fontSize: 40, color: "#111111" },
    header: { fontFace: "Papyrus", fontSize: 20, color: "#222222" },
    title: { fontFace: "Courier New", fontSize: 22, color: "#333333" },
    label: { fontFace: "Comic Sans MS", fontSize: 14, color: "#0000FF" },
  },
  visualStyles: {},
};

const withClassic = (custom: PowerBITheme) => themeLayers(custom, getBaseTheme("classic2026"));
const withFluent = (custom: PowerBITheme) => themeLayers(custom, getBaseTheme("fluent2"));
const barStyle = (custom: PowerBITheme, baseId: "classic2026" | "fluent2") => {
  const src = themeLayers(custom, getBaseTheme(baseId));
  return resolveBarChartStyle(src, resolveTheme(src.roots));
};

// ---------------------------------------------------------------------------
// Primary classes
// ---------------------------------------------------------------------------

test("a primary class resolves straight from the theme that declares it", () => {
  const r = resolveTextClass(withClassic(PRIMARY_ONLY), "label");
  assert.equal(r.fontFamily, "Comic Sans MS");
  assert.equal(r.fontSize, 14);
  assert.equal(r.color, "#0000FF");
  assert.equal(r.source.fontSize, "custom-primary");

  // And from the base when the custom theme is silent.
  const b = resolveTextClass(withClassic(EMPTY), "label");
  assert.equal(b.fontFamily, "Segoe UI");
  assert.equal(b.fontSize, 10);
  assert.equal(b.source.fontSize, "base-primary");
});

// ---------------------------------------------------------------------------
// Secondary derivation — the point of the primary-only fixture
// ---------------------------------------------------------------------------

test("lightLabel derives face and size unchanged, and takes the light colour", () => {
  const r = resolveTextClass(withClassic(PRIMARY_ONLY), "lightLabel");
  assert.equal(r.fontFamily, "Comic Sans MS", "face inherits from label");
  assert.equal(r.fontSize, 14, "lightLabel has NO size scale");
  // The light colour is foregroundNeutralSecondary, not label.color. That is
  // what makes it light even when label is near-black.
  assert.equal(r.color, "#AA00AA");
  assert.notEqual(r.color, "#0000FF");
  assert.equal(r.source.color, "derived-default");
  assert.equal(r.source.fontSize, "custom-primary");
});

test("smallLabel scales the primary by 0.9, dynamically", () => {
  // The rule is a factor, not a fixed size: label 14 gives 12.6, not 9.
  const r = resolveTextClass(withClassic(PRIMARY_ONLY), "smallLabel");
  assert.equal(r.fontSize, 12.6);
  assert.equal(r.fontFamily, "Comic Sans MS");
  assert.equal(r.color, "#0000FF", "smallLabel is not a light class");

  // Against Classic's label of 10 it gives 9, which is where a hardcoded 9
  // would have looked right and been wrong.
  assert.equal(resolveTextClass(withClassic(EMPTY), "smallLabel").fontSize, 9);
});

test("smallLightLabel combines both transformations", () => {
  const r = resolveTextClass(withClassic(PRIMARY_ONLY), "smallLightLabel");
  assert.equal(r.fontSize, 12.6, "scaled like smallLabel");
  assert.equal(r.color, "#AA00AA", "light like lightLabel");
  assert.equal(r.fontFamily, "Comic Sans MS");
});

test("the other derived classes follow the same table", () => {
  const l = withClassic(PRIMARY_ONLY);
  assert.equal(resolveTextClass(l, "largeLabel").fontSize, 16.8, "label 14 x 1.2");
  assert.equal(resolveTextClass(l, "largeLightLabel").fontSize, 16.8);
  assert.equal(resolveTextClass(l, "largeLightLabel").color, "#AA00AA");
  // title 22 x 7/6 = 25.666..., rounded to one decimal place as Power BI does.
  assert.equal(resolveTextClass(l, "largeTitle").fontSize, 25.7);
  assert.equal(resolveTextClass(l, "largeTitle").fontFamily, "Courier New", "derives from title");
  // Weight-bearing classes get their weight by derivation.
  assert.equal(resolveTextClass(l, "boldLabel").fontWeight, "bold");
  assert.equal(resolveTextClass(l, "semiboldLabel").fontWeight, "semibold");
  assert.equal(resolveTextClass(l, "lightLabel").fontWeight, undefined, "no weight unless the class has one");
  // The data classes take the first data colour.
  assert.equal(resolveTextClass(l, "dataTitle").color, "#123456");
  assert.equal(resolveTextClass(l, "smallDataLabel").color, "#123456");
});

// ---------------------------------------------------------------------------
// Explicit secondary, and partial overrides
// ---------------------------------------------------------------------------

test("an explicit secondary field wins over the derivation", () => {
  const custom: PowerBITheme = {
    ...PRIMARY_ONLY,
    textClasses: { ...PRIMARY_ONLY.textClasses, lightLabel: { fontFace: "Impact", fontSize: 33, color: "#00FF00" } },
  };
  const r = resolveTextClass(withClassic(custom), "lightLabel");
  assert.deepEqual([r.fontFamily, r.fontSize, r.color], ["Impact", 33, "#00FF00"]);
  assert.equal(r.source.fontSize, "custom-class");
  assert.equal(r.source.color, "custom-class");
});

test("a partial secondary override leaves the other fields deriving", () => {
  // The trap: treating an absent secondary as "copy the primary wholesale"
  // would make a colour-only override drag the primary's size across too.
  const custom: PowerBITheme = {
    ...PRIMARY_ONLY,
    textClasses: { ...PRIMARY_ONLY.textClasses, smallLightLabel: { color: "#00FF00" } },
  };
  const r = resolveTextClass(withClassic(custom), "smallLightLabel");
  assert.equal(r.color, "#00FF00", "the declared field wins");
  assert.equal(r.source.color, "custom-class");
  assert.equal(r.fontSize, 12.6, "the undeclared size still scales from the primary");
  assert.equal(r.fontFamily, "Comic Sans MS", "and the face still inherits");
  assert.equal(r.source.fontSize, "custom-primary");
});

// ---------------------------------------------------------------------------
// Layering
// ---------------------------------------------------------------------------

test("a custom primary reaches a secondary the base never declared", () => {
  // Power BI's promise: change `label` and label-derived typography follows.
  const r = resolveTextClass(withClassic(PRIMARY_ONLY), "smallLightLabel");
  assert.equal(r.fontFamily, "Comic Sans MS");
  assert.equal(r.fontSize, 12.6);
  assert.equal(r.source.fontFamily, "custom-primary");
});

test("layering is per field, so custom and base classes combine", () => {
  // A base class declaring one field and a custom class another must merge,
  // not replace: reading whole objects would lose the base's contribution.
  const base: PowerBITheme = {
    name: "base",
    textClasses: {
      callout: { fontFace: "A", fontSize: 40, color: "#111111" },
      header: { fontFace: "A", fontSize: 20, color: "#111111" },
      title: { fontFace: "A", fontSize: 12, color: "#111111" },
      label: { fontFace: "BaseFace", fontSize: 11, color: "#111111" },
      lightLabel: { fontSize: 77 },
    },
    visualStyles: {},
  };
  const custom: PowerBITheme = {
    name: "custom",
    textClasses: { lightLabel: { color: "#ABCDEF" } },
    visualStyles: {},
  };

  const r = resolveTextClass(themeLayers(custom, base), "lightLabel");
  assert.equal(r.color, "#ABCDEF", "custom class field wins");
  assert.equal(r.source.color, "custom-class");
  assert.equal(r.fontSize, 77, "base class field survives where custom is silent");
  assert.equal(r.source.fontSize, "base-class");
  assert.equal(r.fontFamily, "BaseFace", "and the face still derives from the primary");
  assert.equal(r.source.fontFamily, "base-primary");
});

test("a custom primary outranks a base primary for derivation", () => {
  const custom: PowerBITheme = {
    name: "c",
    textClasses: { label: { fontFace: "CustomFace", fontSize: 20, color: "#0000FF" } },
    visualStyles: {},
  };
  const r = resolveTextClass(withClassic(custom), "smallLabel");
  assert.equal(r.fontFamily, "CustomFace");
  assert.equal(r.fontSize, 18, "20 x 0.9");
  assert.equal(r.source.fontSize, "custom-primary");
});

test("foregroundNeutralSecondary layers custom over base for light classes", () => {
  assert.equal(resolveTextClass(withClassic(EMPTY), "lightLabel").color, "#605E5C", "Classic's value");
  assert.equal(resolveTextClass(withFluent(EMPTY), "lightLabel").color, "#616161", "Fluent's value");
  const custom: PowerBITheme = { name: "c", foregroundNeutralSecondary: "#123123", visualStyles: {} };
  assert.equal(resolveTextClass(withClassic(custom), "lightLabel").color, "#123123", "custom wins");
});

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

test("the semantic roles map to the classes Microsoft documents", () => {
  assert.equal(TEXT_ROLE_CLASS.categoryAxisTitle, "title");
  assert.equal(TEXT_ROLE_CLASS.valueAxisTitle, "title");
  assert.equal(TEXT_ROLE_CLASS.categoryAxisLabel, "lightLabel");
  assert.equal(TEXT_ROLE_CLASS.legendText, "lightLabel");
  assert.equal(TEXT_ROLE_CLASS.valueAxisLabel, "smallLightLabel");
  assert.equal(TEXT_ROLE_CLASS.dataLabel, "smallLightLabel");
  assert.equal(TEXT_ROLE_CLASS.referenceLineLabel, "smallLabel");
  // A role is just a named class lookup, so the two must agree.
  const l = withClassic(PRIMARY_ONLY);
  assert.deepEqual(resolveTextRole(l, "valueAxisLabel"), resolveTextClass(l, "smallLightLabel"));
});

// ---------------------------------------------------------------------------
// The Clustered Bar pilot
// ---------------------------------------------------------------------------

test("PILOT: Classic no longer falls to 6px in an unnamed font", () => {
  // The audit's headline defect. Classic 2026 declares no fontSize anywhere in
  // visualStyles, so every one of these used to be the literal 6.
  const s = barStyle(EMPTY, "classic2026");
  assert.equal(s.categoryAxis.fontSize, 10, "from lightLabel, i.e. label");
  assert.equal(s.categoryAxis.fontFamily, "Segoe UI");
  assert.equal(s.valueAxis.fontSize, 9, "from smallLightLabel, label x 0.9");
  assert.equal(s.categoryAxis.titleFontSize, 12, "from title");
  assert.equal(s.categoryAxis.titleFontFamily, "DIN");
  assert.equal(s.legend.fontSize, 10);
  assert.equal(s.labels.fontSize, 9);
  for (const size of [s.categoryAxis.fontSize, s.valueAxis.fontSize, s.legend.fontSize, s.labels.fontSize]) {
    assert.notEqual(size, 6);
  }
});

test("PILOT: an explicit visualStyles value still beats the text class", () => {
  // Critical for Fluent 2, which declares axis typography in its wildcard.
  // The text-class layer must fix Classic's silence without flattening the
  // two bases into each other.
  const s = barStyle(EMPTY, "fluent2");
  assert.equal(s.categoryAxis.fontSize, 10.5, "Fluent's explicit visualStyles value");
  assert.equal(s.valueAxis.fontSize, 10.5);
  assert.ok(
    String(s.categoryAxis.fontFamily).startsWith("'Segoe UI'"),
    "Fluent's explicit family stack, not the text class's bare name",
  );
  // smallLightLabel would have said 9.45 here; visualStyles wins.
  assert.notEqual(s.valueAxis.fontSize, 9.45);

  // Fluent's own label is 10.5, the same number as its explicit axis size,
  // so the assertions above would also pass if the text class were wrongly
  // winning. Layer a theme whose text classes say something else, and the
  // explicit Fluent value must still come through.
  const loud = barStyle(PRIMARY_ONLY, "fluent2");
  assert.equal(loud.categoryAxis.fontSize, 10.5, "Fluent's visualStyles, not label 14");
  assert.notEqual(loud.categoryAxis.fontSize, 14);
  assert.ok(
    String(loud.categoryAxis.fontFamily).startsWith("'Segoe UI'"),
    "Fluent's family, not Comic Sans MS",
  );
  // And where Fluent declares nothing, the custom text class does win.
  assert.equal(loud.legend.fontSize, 14, "legend has no explicit Fluent value");
  assert.equal(loud.legend.fontFamily, "Comic Sans MS");
});

test("PILOT: a custom explicit visualStyles value beats both", () => {
  const custom = updateThemeValue(PRIMARY_ONLY, ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontSize"], 31);
  const s = barStyle(custom, "fluent2");
  assert.equal(s.categoryAxis.fontSize, 31);
  // Its neighbour, which nothing declares, still comes from the text class.
  assert.equal(s.legend.fontSize, 14, "PRIMARY_ONLY's label size, via lightLabel");
});

test("PILOT: private theme + Classic uses the theme's own Arial typography", { skip: hasPrivateTheme ? false : "private fixture not present" }, () => {
  const privateThemeFixture = privateTheme();
  const s = barStyle(privateThemeFixture, "classic2026");
  for (const family of [
    s.categoryAxis.fontFamily,
    s.categoryAxis.titleFontFamily,
    s.valueAxis.fontFamily,
    s.legend.fontFamily,
    s.labels.fontFamily,
  ]) {
    assert.equal(family, "Arial");
  }
  assert.equal(s.categoryAxis.fontSize, 10);
  assert.equal(s.categoryAxis.titleFontSize, 12);
  // the private theme declares smallLightLabel explicitly at 10, so the 0.9 scale does not
  // apply — an explicit secondary outranks the derivation.
  assert.equal(s.valueAxis.fontSize, 10);
});

test("PILOT: reset returns an overridden property to its text-class value", () => {
  const path = ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontSize"] as Array<string | number>;
  const derived = barStyle(PRIMARY_ONLY, "classic2026").categoryAxis.fontSize;
  assert.equal(derived, 14);

  const overridden = updateThemeValue(PRIMARY_ONLY, path, 31);
  assert.equal(hasThemeValueAtPath(overridden, path), true, "the editor sees an explicit value");
  assert.equal(barStyle(overridden, "classic2026").categoryAxis.fontSize, 31);

  const reset = deleteThemeValue(overridden, path);
  assert.equal(hasThemeValueAtPath(reset, path), false, "and no longer sees one after reset");
  assert.equal(barStyle(reset, "classic2026").categoryAxis.fontSize, derived, "back to the derived value");
});

test("PILOT: a text-class-derived value is never an explicit override", () => {
  // The editor shows the effective value but must not treat it as set, or the
  // next export would materialise defaults the author never wrote.
  const path = ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontSize"] as Array<string | number>;
  assert.equal(hasThemeValueAtPath(PRIMARY_ONLY, path), false);
  assert.equal(barStyle(PRIMARY_ONLY, "classic2026").categoryAxis.fontSize, 14);
  assert.equal(hasThemeValueAtPath(PRIMARY_ONLY, path), false, "resolving must not have set anything");
});

test("resolution does not mutate the theme it reads", { skip: hasPrivateTheme ? false : "private fixture not present" }, () => {
  const privateThemeFixture = privateTheme();
  const before = JSON.stringify(privateThemeFixture);
  barStyle(privateThemeFixture, "classic2026");
  barStyle(privateThemeFixture, "fluent2");
  resolveTextClass(withClassic(privateThemeFixture), "smallLightLabel");
  resolveTextClass(withFluent(privateThemeFixture), "lightLabel");
  assert.equal(JSON.stringify(privateThemeFixture), before, "the imported theme must round-trip untouched");

  // Power BI's own implementation mutates the object it is handed; ours must
  // not, because the same object is what the user exports.
  const primaryOnly = JSON.parse(JSON.stringify(PRIMARY_ONLY)) as PowerBITheme;
  const snapshot = JSON.stringify(primaryOnly);
  resolveTextClass(withClassic(primaryOnly), "lightLabel");
  resolveTextClass(withClassic(primaryOnly), "smallLabel");
  assert.equal(JSON.stringify(primaryOnly), snapshot);
});

