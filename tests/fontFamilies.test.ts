import assert from "node:assert/strict";
import test from "node:test";
import { effectiveFontFamily, FONT_FAMILY_ALIASES, themeFontFamilyToCss } from "../app/lib/fontFamilies";
import { BAR_CHART_PROPERTIES, resolveBarChartStyle } from "../app/lib/barChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { themeLayers } from "../app/lib/properties";
import { resolveTextClass } from "../app/lib/textClasses";
import { BAR_CHART_BOX, computePreviewCartesianLayout } from "../app/components/previews/cartesianLayout";
import { computeChartLayout } from "../app/lib/chartLayout";
import { formatValue } from "../app/components/ChartParts";
import { themeFontSizeToCssPx } from "../app/lib/fontUnits";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

/**
 * Power BI's font-face alias table.
 *
 * Every expectation here was produced by running Power BI Desktop's own
 * extracted table and lookup, not by reading documentation. See
 * `app/lib/fontFamilies.ts` for the transcription and the call path.
 */

const SEGOE = "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif";

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

test("the table has exactly the ten entries Power BI ships", () => {
  assert.deepEqual(Object.keys(FONT_FAMILY_ALIASES).sort(), [
    "Body",
    "DIN",
    "DIN Light",
    "Heading",
    "Segoe (Bold)",
    "Segoe UI",
    "Segoe UI Bold",
    "Segoe UI Light",
    "Segoe UI Semibold",
    "Segoe UI Semilight",
  ]);
});

test("each alias expands to the stack Power BI's own lookup returns", () => {
  const cases: Array<[string, string]> = [
    ["Segoe UI", SEGOE],
    ["Segoe UI Light", "Segoe UI Light, wf_segoe-ui_light, helvetica, arial, sans-serif"],
    ["Segoe UI Semilight", "Segoe UI Semilight, wf_segoe-ui_semilight, helvetica, arial, sans-serif"],
    ["Segoe UI Semibold", "Segoe UI Semibold, wf_segoe-ui_semibold, helvetica, arial, sans-serif"],
    ["Segoe UI Bold", "Segoe UI Bold, wf_segoe-ui_bold, helvetica, arial, sans-serif"],
    ["Segoe (Bold)", "Segoe UI Bold, wf_segoe-ui_bold, helvetica, arial, sans-serif"],
    ["DIN", "wf_standard-font, helvetica, arial, sans-serif"],
    ["DIN Light", "wf_standard-font_light, helvetica, arial, sans-serif"],
    ["Heading", "Segoe UI Light, wf_segoe-ui_light, helvetica, arial, sans-serif"],
    ["Body", SEGOE],
  ];
  for (const [from, to] of cases) assert.equal(themeFontFamilyToCss(from), to, from);
});

test("the expansion is unquoted, because Power BI uses .family and not .css", () => {
  // FamilyInfo carries both forms. applyTextClassDefaults calls `t.family`,
  // which is a plain join — the quoted `.css` form is used elsewhere. An
  // unquoted multi-word family is valid CSS, so this reproduces rather than
  // tidies.
  assert.ok(!themeFontFamilyToCss("Segoe UI").includes("'"));
  assert.ok(themeFontFamilyToCss("Segoe UI").startsWith("Segoe UI,"));
});

test("Segoe UI Semibold is a FAMILY alias, independent of font weight", () => {
  // Two separate axes. Asking for the semibold family is not the same as
  // asking for weight 600, and Power BI keeps its own entry for each.
  assert.notEqual(themeFontFamilyToCss("Segoe UI Semibold"), themeFontFamilyToCss("Segoe UI"));
  assert.ok(themeFontFamilyToCss("Segoe UI Semibold").includes("wf_segoe-ui_semibold"));
});

// ---------------------------------------------------------------------------
// Everything the table does NOT touch
// ---------------------------------------------------------------------------

test("ordinary and custom families pass through with no invented fallbacks", () => {
  for (const family of [
    "Arial",
    "Arial Black",
    "Calibri",
    "Cambria",
    "Georgia",
    "Tahoma",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
    "Courier New",
    "Comic Sans MS",
    "My Company Sans",
  ]) {
    assert.equal(themeFontFamilyToCss(family), family, family);
  }
  // Specifically: no generic tail is appended. Doing so would silently change
  // which face a corporate theme falls back to.
  assert.ok(!themeFontFamilyToCss("My Company Sans").includes("sans-serif"));
});

test("matching is exact, so case and whitespace variants pass through", () => {
  for (const variant of ["segoe ui", "SEGOE UI", "Segoe Ui", " Segoe UI ", "Segoe  UI"]) {
    assert.equal(themeFontFamilyToCss(variant), variant, variant);
  }
});

test("an already-expanded stack is never double-expanded", () => {
  // Fluent 2 ships this exact string inside visualStyles. It is not a key in
  // the table, so it cannot be turned into a malformed or duplicated list.
  const fluent = "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif";
  assert.equal(themeFontFamilyToCss(fluent), fluent);
  assert.equal(themeFontFamilyToCss(SEGOE), SEGOE, "our own output is also a fixed point");
  // Idempotent either way round.
  assert.equal(themeFontFamilyToCss(themeFontFamilyToCss("Segoe UI")), SEGOE);
});

test("empty and whitespace values are left alone", () => {
  assert.equal(themeFontFamilyToCss(""), "");
  assert.equal(themeFontFamilyToCss("   "), "   ");
});

// ---------------------------------------------------------------------------
// The raw / CSS split
// ---------------------------------------------------------------------------

const CLASSIC = (custom: PowerBITheme) => themeLayers(custom, getBaseTheme("classic2026"));
const EMPTY: PowerBITheme = { name: "none", visualStyles: {} };

test("resolved text classes stay RAW — the editor and the export read these", () => {
  const label = resolveTextClass(CLASSIC(EMPTY), "label");
  assert.equal(label.fontFamily, "Segoe UI", "the theme's own word, not a stack");
  assert.equal(resolveTextClass(CLASSIC(EMPTY), "title").fontFamily, "DIN");
  // Secondaries inherit the raw primary, and expansion happens once later.
  assert.equal(resolveTextClass(CLASSIC(EMPTY), "lightLabel").fontFamily, "Segoe UI");
  assert.equal(resolveTextClass(CLASSIC(EMPTY), "smallLightLabel").fontFamily, "Segoe UI");
});

test("resolved visual styles stay RAW too", () => {
  const src = CLASSIC(EMPTY);
  const s = resolveBarChartStyle(src, resolveTheme(src.roots));
  assert.equal(s.categoryAxis.fontFamily, "Segoe UI");
  assert.equal(s.categoryAxis.titleFontFamily, "DIN");
  assert.ok(!s.categoryAxis.fontFamily.includes(","), "no stack in the resolved value");
});

test("Fluent's explicit visualStyles stack survives resolution untouched", () => {
  const src = themeLayers(EMPTY, getBaseTheme("fluent2"));
  const s = resolveBarChartStyle(src, resolveTheme(src.roots));
  assert.ok(s.categoryAxis.fontFamily.startsWith("'Segoe UI'"), "Fluent's own quoted stack");
  // And putting it through the boundary does not corrupt it.
  assert.equal(themeFontFamilyToCss(s.categoryAxis.fontFamily), s.categoryAxis.fontFamily);
});


test("expansion never mutates the theme it read from", () => {
  const theme: PowerBITheme = {
    name: "t",
    textClasses: { label: { fontFace: "Segoe UI", fontSize: 10, color: "#000000" } },
    visualStyles: {},
  };
  const before = JSON.stringify(theme);
  const src = CLASSIC(theme);
  resolveBarChartStyle(src, resolveTheme(src.roots));
  themeFontFamilyToCss(resolveTextClass(src, "label").fontFamily);
  assert.equal(JSON.stringify(theme), before);
});

// ---------------------------------------------------------------------------
// The boundary
// ---------------------------------------------------------------------------

test("BOUNDARY: measurement receives the same family the CSS renders", () => {
  // Mutation-sensitive by construction: computePreviewCartesianLayout must
  // equal the engine driven with BOTH conversions applied. Remove the family
  // expansion from the preview path and this side stops matching.
  const src = CLASSIC(EMPTY);
  const style = resolveBarChartStyle(src, resolveTheme(src.roots));
  const categories = ["London", "North West", "Scotland", "Wales"];

  assert.equal(style.categoryAxis.fontFamily, "Segoe UI", "raw going in");

  const viaPreview = computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: style.categoryAxis,
    valueAxis: style.valueAxis,
    categories,
    dataMax: 82_000,
  });

  const asRendered = <T extends { fontSize: number; titleFontSize: number; fontFamily: string; titleFontFamily: string }>(
    axis: T,
  ): T => ({
    ...axis,
    fontSize: themeFontSizeToCssPx(axis.fontSize),
    titleFontSize: themeFontSizeToCssPx(axis.titleFontSize),
    fontFamily: themeFontFamilyToCss(axis.fontFamily),
    titleFontFamily: themeFontFamilyToCss(axis.titleFontFamily),
  });

  const viaEngine = computeChartLayout({
    outer: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: asRendered({ ...style.categoryAxis, titleText: String(style.categoryAxis.titleText) }),
    valueAxis: asRendered({ ...style.valueAxis, titleText: String(style.valueAxis.titleText) }),
    categories,
    dataMax: 82_000,
    innerPadding: 0,
    formatTick: (value) => formatValue(value, style.valueAxis.labelDisplayUnits, style.valueAxis.labelPrecision),
  });

  assert.deepEqual(viaPreview.categoryAxis, viaEngine.categoryAxis, "category gutter");
  assert.deepEqual(viaPreview.valueAxis, viaEngine.valueAxis, "value gutter");
  assert.deepEqual(viaPreview.plot, viaEngine.plot, "plot rect");
});

test("BOUNDARY: the font-size conversion is unchanged and independent", () => {
  // The two boundaries must not have become entangled.
  assert.equal(themeFontSizeToCssPx(10.5), 14);
  assert.equal(themeFontSizeToCssPx(12), 16);
  const src = CLASSIC(EMPTY);
  const s = resolveBarChartStyle(src, resolveTheme(src.roots));
  assert.equal(s.categoryAxis.fontSize, 9, "still points in the resolved value");
});

test("an explicit visualStyles family still beats the text class", () => {
  const custom = updateThemeValue(
    EMPTY,
    ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontFamily"],
    "Comic Sans MS",
  );
  const src = CLASSIC(custom);
  const s = resolveBarChartStyle(src, resolveTheme(src.roots));
  assert.equal(s.categoryAxis.fontFamily, "Comic Sans MS", "raw");
  assert.equal(themeFontFamilyToCss(s.categoryAxis.fontFamily), "Comic Sans MS", "and unaliased at the boundary");
});

test("BOUNDARY: the expanded family is what reaches the MEASURER, not the raw name", () => {
  // The mutation-sensitive one. `estimateText` ignores the family, so no
  // assertion about gutters or plot size can detect the expansion being
  // dropped from the measurement path — a geometry comparison would pass
  // either way. So observe the argument directly.
  const src = CLASSIC(EMPTY);
  const style = resolveBarChartStyle(src, resolveTheme(src.roots));
  assert.equal(style.categoryAxis.fontFamily, "Segoe UI", "raw going in");
  assert.equal(style.categoryAxis.titleFontFamily, "DIN", "and a title face that really changes");

  const seen: string[] = [];
  computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: style.categoryAxis,
    valueAxis: style.valueAxis,
    categories: ["London", "North West"],
    dataMax: 82_000,
    categoryAxisTitleFallback: "Region",
    valueAxisTitleFallback: "Applications",
    measureText: (text, fontSize, fontFamily) => {
      seen.push(fontFamily);
      return { width: text.length * fontSize * 0.55, height: fontSize * 1.35 };
    },
  });

  assert.ok(seen.length > 0, "the engine must actually measure something");
  assert.ok(seen.includes(SEGOE), `expected the expanded Segoe stack, saw ${JSON.stringify(seen)}`);
  assert.ok(
    seen.includes("wf_standard-font, helvetica, arial, sans-serif"),
    `expected DIN expanded for the axis title, saw ${JSON.stringify(seen)}`,
  );
  assert.ok(!seen.includes("Segoe UI"), "the raw name must not reach the measurer");
  assert.ok(!seen.includes("DIN"), "nor the raw title face");
});

test("BOUNDARY: an unaliased family reaches the measurer unchanged", () => {
  // The complement — expansion must not decorate a family the table does not
  // know, at the measurement boundary any more than at the rendering one.
  const custom: PowerBITheme = {
    name: "c",
    textClasses: {
      callout: { fontFace: "Comic Sans MS", fontSize: 40, color: "#111111" },
      header: { fontFace: "Comic Sans MS", fontSize: 20, color: "#111111" },
      title: { fontFace: "Comic Sans MS", fontSize: 12, color: "#111111" },
      label: { fontFace: "Comic Sans MS", fontSize: 10, color: "#111111" },
    },
    visualStyles: {},
  };
  const src = CLASSIC(custom);
  const style = resolveBarChartStyle(src, resolveTheme(src.roots));

  const seen = new Set<string>();
  computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: style.categoryAxis,
    valueAxis: style.valueAxis,
    categories: ["London"],
    dataMax: 82_000,
    measureText: (text, fontSize, fontFamily) => {
      seen.add(fontFamily);
      return { width: text.length * fontSize * 0.55, height: fontSize * 1.35 };
    },
  });

  assert.deepEqual([...seen], ["Comic Sans MS"]);
});

// ---------------------------------------------------------------------------
// Provenance: the alias applies where Power BI applies it, and nowhere else
// ---------------------------------------------------------------------------

const DIN_STACK = "wf_standard-font, helvetica, arial, sans-serif";

test("PRIMARY text class: raw stays raw, effective is expanded", () => {
  const r = resolveTextClass(CLASSIC(EMPTY), "label");
  assert.equal(r.fontFamily, "Segoe UI");
  assert.equal(r.cssFontFamily, SEGOE);

  const t = resolveTextClass(CLASSIC(EMPTY), "title");
  assert.equal(t.fontFamily, "DIN");
  assert.equal(t.cssFontFamily, DIN_STACK);
});

test("INHERITED secondary carries its primary's expanded family", () => {
  // Power BI expands the primary first; the secondary inherits that effective
  // value through `e.fontFace = e.fontFace || t.fontFace`.
  const custom: PowerBITheme = {
    name: "c",
    textClasses: {
      callout: { fontFace: "DIN", fontSize: 40, color: "#111111" },
      header: { fontFace: "DIN", fontSize: 20, color: "#111111" },
      title: { fontFace: "DIN", fontSize: 12, color: "#111111" },
      label: { fontFace: "DIN", fontSize: 10, color: "#111111" },
    },
    visualStyles: {},
  };
  for (const name of ["smallLabel", "lightLabel", "smallLightLabel", "largeLabel"] as const) {
    const r = resolveTextClass(CLASSIC(custom), name);
    assert.equal(r.fontFamily, "DIN", `${name} raw`);
    assert.equal(r.cssFontFamily, DIN_STACK, `${name} effective`);
  }
});

test("EXPLICIT secondary face is NOT aliased", () => {
  // The runtime path aliases the four primaries only. A secondary that
  // declares its own face never reaches the lookup, so it stays literal even
  // though the identical string on a primary would expand.
  const custom: PowerBITheme = {
    name: "c",
    textClasses: {
      callout: { fontFace: "Segoe UI", fontSize: 40, color: "#111111" },
      header: { fontFace: "Segoe UI", fontSize: 20, color: "#111111" },
      title: { fontFace: "Segoe UI", fontSize: 12, color: "#111111" },
      label: { fontFace: "Segoe UI", fontSize: 10, color: "#111111" },
      smallLightLabel: { fontFace: "DIN" },
    },
    visualStyles: {},
  };
  const explicit = resolveTextClass(CLASSIC(custom), "smallLightLabel");
  assert.equal(explicit.fontFamily, "DIN", "raw");
  assert.equal(explicit.cssFontFamily, "DIN", "literal — the secondary declared it itself");
  assert.notEqual(explicit.cssFontFamily, DIN_STACK);
  assert.equal(explicit.source.fontFamily, "custom-class", "and provenance says why");

  // Its sibling, which inherits, still expands — same theme, same table.
  const inherited = resolveTextClass(CLASSIC(custom), "smallLabel");
  assert.equal(inherited.fontFamily, "Segoe UI");
  assert.equal(inherited.cssFontFamily, SEGOE);
});

test("an EXPLICIT visualStyles family is never aliased", () => {
  // The bug this fixes. Power BI's visual-property reader takes the family
  // straight from the property, so an imported theme asking for DIN on a
  // visual must render literal DIN.
  for (const family of ["DIN", "DIN Light", "Heading", "Body", "Segoe (Bold)", "Segoe UI"]) {
    const custom = updateThemeValue(
      EMPTY,
      ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontFamily"],
      family,
    );
    const src = CLASSIC(custom);
    const s = resolveBarChartStyle(src, resolveTheme(src.roots));
    assert.equal(s.categoryAxis.fontFamily, family, `${family}: raw`);
    assert.equal(s.categoryAxis.fontFamilyCss, family, `${family}: effective must stay literal`);
  }
});

test("an UNSET visual family falls through to the text class's effective family", () => {
  const src = CLASSIC(EMPTY);
  const s = resolveBarChartStyle(src, resolveTheme(src.roots));
  assert.equal(s.categoryAxis.fontFamily, "Segoe UI", "raw, from lightLabel");
  assert.equal(s.categoryAxis.fontFamilyCss, SEGOE, "effective, expanded");
  assert.equal(s.categoryAxis.titleFontFamily, "DIN", "raw, from title");
  assert.equal(s.categoryAxis.titleFontFamilyCss, DIN_STACK, "effective, expanded");
  assert.equal(s.legend.fontFamilyCss, SEGOE);
  assert.equal(s.labels.fontFamilyCss, SEGOE);
});

test("provenance decides, not the string: the same value resolves two ways", () => {
  // Two themes, identical resolved raw family, different effective family.
  // Nothing about the string "DIN" could distinguish them.
  const viaTextClass: PowerBITheme = {
    name: "a",
    textClasses: {
      callout: { fontFace: "DIN", fontSize: 40, color: "#111111" },
      header: { fontFace: "DIN", fontSize: 20, color: "#111111" },
      title: { fontFace: "DIN", fontSize: 12, color: "#111111" },
      label: { fontFace: "DIN", fontSize: 10, color: "#111111" },
    },
    visualStyles: {},
  };
  const viaVisualStyles = updateThemeValue(
    EMPTY,
    ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontFamily"],
    "DIN",
  );

  const a = resolveBarChartStyle(CLASSIC(viaTextClass), resolveTheme(CLASSIC(viaTextClass).roots));
  const b = resolveBarChartStyle(CLASSIC(viaVisualStyles), resolveTheme(CLASSIC(viaVisualStyles).roots));

  assert.equal(a.categoryAxis.fontFamily, "DIN");
  assert.equal(b.categoryAxis.fontFamily, "DIN");
  assert.equal(a.categoryAxis.fontFamilyCss, DIN_STACK, "text class expands");
  assert.equal(b.categoryAxis.fontFamilyCss, "DIN", "visualStyles stays literal");
});

test("Fluent's explicit stacks survive byte-for-byte", () => {
  const src = themeLayers(EMPTY, getBaseTheme("fluent2"));
  const s = resolveBarChartStyle(src, resolveTheme(src.roots));
  const expected = "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif";
  assert.equal(s.categoryAxis.fontFamily, expected, "raw");
  assert.equal(s.categoryAxis.fontFamilyCss, expected, "effective — declared, so literal");
  assert.equal(s.categoryAxis.fontFamilyCss.split("wf_segoe-ui_normal").length - 1, 1, "no duplication");
});

// ---------------------------------------------------------------------------
// Measurement / rendering parity, both provenances
// ---------------------------------------------------------------------------

const familiesSeenBy = (custom: PowerBITheme): string[] => {
  const src = CLASSIC(custom);
  const style = resolveBarChartStyle(src, resolveTheme(src.roots));
  const seen: string[] = [];
  computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: style.categoryAxis,
    valueAxis: style.valueAxis,
    categories: ["London"],
    dataMax: 82_000,
    measureText: (text, fontSize, fontFamily) => {
      seen.push(fontFamily);
      return { width: text.length * fontSize * 0.55, height: fontSize * 1.35 };
    },
  });
  return seen;
};

test("BOUNDARY: a text-class family reaches the measurer EXPANDED", () => {
  const custom: PowerBITheme = {
    name: "c",
    textClasses: {
      callout: { fontFace: "DIN", fontSize: 40, color: "#111111" },
      header: { fontFace: "DIN", fontSize: 20, color: "#111111" },
      title: { fontFace: "DIN", fontSize: 12, color: "#111111" },
      label: { fontFace: "DIN", fontSize: 10, color: "#111111" },
    },
    visualStyles: {},
  };
  const seen = familiesSeenBy(custom);
  assert.ok(seen.length > 0, "the engine must measure something");
  assert.ok(seen.includes(DIN_STACK), `expected the expanded DIN stack, saw ${JSON.stringify(seen)}`);
  assert.ok(!seen.includes("DIN"), "the raw name must not reach the measurer");
});

test("BOUNDARY: an explicit visualStyles family reaches the measurer LITERAL", () => {
  // The complement, and the one the old blind implementation got wrong.
  const custom = updateThemeValue(
    EMPTY,
    ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontFamily"],
    "DIN",
  );
  const seen = familiesSeenBy(custom);
  assert.ok(seen.includes("DIN"), `expected literal DIN, saw ${JSON.stringify(seen)}`);
  assert.ok(!seen.includes(DIN_STACK), "it must NOT be expanded");
});

test("effectiveFontFamily reports both forms from the resolution chain", () => {
  const role = { fontFamily: "DIN", cssFontFamily: DIN_STACK };
  const definition = BAR_CHART_PROPERTIES.categoryAxis.fontFamily;

  // Nothing declares it: the role supplies both.
  assert.deepEqual(effectiveFontFamily(CLASSIC(EMPTY), definition, role), {
    value: "DIN",
    css: DIN_STACK,
  });

  // A layer declares it: literal, whatever the role says.
  const declared = updateThemeValue(
    EMPTY,
    ["visualStyles", "clusteredBarChart", "*", "categoryAxis", 0, "fontFamily"],
    "DIN",
  );
  assert.deepEqual(effectiveFontFamily(CLASSIC(declared), definition, role), {
    value: "DIN",
    css: "DIN",
  });
});
