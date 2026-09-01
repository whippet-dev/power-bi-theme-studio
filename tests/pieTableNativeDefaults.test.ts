/**
 * Pie and Table native defaults, against the fingerprint-sweep evidence.
 *
 * Same method as the cartesian tests: a theme in which every token and text
 * class carries a colour that appears nowhere else, so an assertion cannot
 * pass by coincidence — and two text-class sizes, so a derived size is
 * distinguishable from a constant that merely matched at one point.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolveColumnChartStyle } from "../app/lib/columnChartProperties";
import {
  PROPERTIES_WITHOUT_NATIVE_DEFAULT,
  TABLE_BLEND,
  blendNativeTokens,
  nativeToken,
} from "../app/lib/nativeTokens";
import { PIE_CHART_PROPERTIES, resolvePieChartStyle } from "../app/lib/pieChartProperties";
import { resolvePropertyEntry, themeLayers } from "../app/lib/properties";
import { TABLE_PROPERTIES, resolveTableStyle } from "../app/lib/tableProperties";
import { NATIVE_CHROME_FONT_SIZE } from "../app/lib/textClasses";
import { resolveTheme, type PowerBITheme } from "../app/lib/theme";

const fingerprint = (labelSize: number): PowerBITheme => ({
  name: `fingerprint-${labelSize}`,
  dataColors: ["#00E660", "#0073E6"],
  foreground: "#E60000",
  background: "#00E643",
  foregroundNeutralSecondary: "#8600E6",
  secondaryBackground: "#E600AC",
  tableAccent: "#39E600",
  textClasses: {
    callout: { fontFace: "Comic Sans MS", fontSize: 23, color: "#0B8E27" },
    header: { fontFace: "Georgia", fontSize: 17, color: "#0B3C8E" },
    title: { fontFace: "Impact", fontSize: 19, color: "#8E0B16" },
    label: { fontFace: "Courier New", fontSize: labelSize, color: "#628E0B" },
  },
  visualStyles: {},
});

/** The two theme points every size rule below is confirmed at. */
const SMALL = fingerprint(13);
const LARGE = fingerprint(20);

const src = (theme: PowerBITheme) => themeLayers(theme, getBaseTheme("classic2026"));
const pie = (theme: PowerBITheme) => {
  const s = src(theme);
  return resolvePieChartStyle(s, resolveTheme(s.roots));
};
const table = (theme: PowerBITheme) => {
  const s = src(theme);
  return resolveTableStyle(s, resolveTheme(s.roots));
};

// ---------------------------------------------------------------------------
// Pie typography
// ---------------------------------------------------------------------------

test("the pie legend follows the label class, unscaled", () => {
  // 13 -> 13 and 20 -> 20. A constant would not move; label x 0.9 would give
  // 11.7 and 18. Only x 1 produces both.
  assert.equal(pie(SMALL).legend.fontSize, 13);
  assert.equal(pie(LARGE).legend.fontSize, 20);
  assert.equal(pie(SMALL).legend.fontFamily, "Courier New");
  assert.equal(pie(SMALL).legend.labelColor, "#8600E6", "foregroundNeutralSecondary");
  // The literals it used to fall to.
  assert.notEqual(pie(SMALL).legend.fontSize, 6);
  assert.notEqual(pie(SMALL).legend.fontFamily, "");
});

test("pie detail labels follow label x 0.9", () => {
  assert.equal(pie(SMALL).labels.fontSize, 11.7);
  assert.equal(pie(LARGE).labels.fontSize, 18);
  assert.equal(pie(SMALL).labels.fontFamily, "Courier New");
  assert.equal(pie(SMALL).labels.color, "#8600E6", "foregroundNeutralSecondary");
  assert.notEqual(pie(SMALL).labels.fontSize, 6);
});

test("the legend and the detail labels take DIFFERENT rules on one visual", () => {
  // Guards against a fix that pointed both at the same role. They share a
  // family and a colour and differ only in scale, which is exactly the case
  // a single text-class reference cannot express.
  const p = pie(LARGE);
  assert.equal(p.legend.fontSize, 20);
  assert.equal(p.labels.fontSize, 18);
  assert.notEqual(p.legend.fontSize, p.labels.fontSize);
  assert.equal(p.legend.fontFamily, p.labels.fontFamily);
  assert.equal(p.legend.labelColor, p.labels.color);
});

test("the CARTESIAN legend is unaffected by the pie fix", () => {
  // The whole reason pie got its own role. Both measurements stand: a
  // cartesian legend holds at 9 across both theme points while the pie
  // legend moves with the class.
  for (const theme of [SMALL, LARGE]) {
    const s = src(theme);
    const column = resolveColumnChartStyle(s, resolveTheme(s.roots));
    assert.equal(column.legend.fontSize, NATIVE_CHROME_FONT_SIZE, "cartesian legend still fixed");
    assert.equal(column.categoryAxis.fontSize, NATIVE_CHROME_FONT_SIZE);
    assert.equal(column.categoryAxis.titleFontSize, NATIVE_CHROME_FONT_SIZE);
  }
  assert.notEqual(pie(LARGE).legend.fontSize, NATIVE_CHROME_FONT_SIZE);
});

// ---------------------------------------------------------------------------
// Pie other measured defaults
// ---------------------------------------------------------------------------

test("pie carries its measured non-typography defaults", () => {
  const p = pie(SMALL);
  assert.equal(p.legend.showTitle, true, "legend title is on natively");
  assert.equal(p.labels.overflow, true, "overflow text is on natively");
  assert.equal(p.dataPoint.borderColor, "#8600E6", "foregroundNeutralSecondary, not #E3E3E3");
  assert.notEqual(p.dataPoint.borderColor, "#E3E3E3");
  // Unchanged, and asserted so a future pass does not drift them.
  assert.equal(p.labels.show, true);
  assert.equal(p.labels.position, "outside");
  assert.equal(p.legend.position, "RightCenter");
  assert.equal(p.dataPoint.borderShow, false);
});

// ---------------------------------------------------------------------------
// Table typography
// ---------------------------------------------------------------------------

test("all four table text surfaces follow label x 1", () => {
  for (const [theme, expected] of [
    [SMALL, 13],
    [LARGE, 20],
  ] as const) {
    const t = table(theme);
    assert.equal(t.values.fontSize, expected, "values");
    assert.equal(t.columnHeaders.fontSize, expected, "column headers");
    assert.equal(t.total.fontSize, expected, "totals");
    assert.equal(t.grid.textSize, expected, "grid text size");
    for (const family of [t.values.fontFamily, t.columnHeaders.fontFamily, t.total.fontFamily]) {
      assert.equal(family, "Courier New");
    }
  }
});

test("rowPadding is a native constant, not a scaled value", () => {
  // It read 1 under both theme points, so it does not track the class the
  // text sizes beside it do.
  assert.equal(table(SMALL).grid.rowPadding, 1);
  assert.equal(table(LARGE).grid.rowPadding, 1);
});

// ---------------------------------------------------------------------------
// Table colour provenance
// ---------------------------------------------------------------------------

test("table colours resolve to the tokens the sweep proved", () => {
  const t = table(SMALL);
  assert.equal(t.columnHeaders.fontColor, "#E60000", "foreground");
  assert.equal(t.columnHeaders.backColor, "#00E643", "background");
  assert.equal(t.grid.outlineColor, "#39E600", "tableAccent");
  assert.equal(t.total.fontColor, "#628E0B", "the label class's own colour");
  assert.equal(t.values.fontColorPrimary, "#E60000", "foreground");
  assert.equal(t.values.backColorPrimary, "#00E643", "background");
});

test("the header is no longer inverted", () => {
  // The specific defect: tableAccent behind background-coloured text.
  const t = table(SMALL);
  assert.notEqual(t.columnHeaders.backColor, nativeToken(src(SMALL), "tableAccent"));
  assert.notEqual(t.columnHeaders.fontColor, t.columnHeaders.backColor, "text must not match its plate");
});

test("totals take the label class colour, which nothing else does", () => {
  // Every other light surface resolves foregroundNeutralSecondary. Totals
  // are the one measured exception, so they cannot share a role with the
  // values beside them.
  const t = table(SMALL);
  assert.equal(t.total.fontColor, "#628E0B");
  assert.notEqual(t.total.fontColor, t.values.fontColor);
  assert.notEqual(t.total.fontColor, "#8600E6", "not foregroundNeutralSecondary");
});

// ---------------------------------------------------------------------------
// The two-token blend
// ---------------------------------------------------------------------------

test("the blend reproduces the colours measured under the original theme", () => {
  const t = table(SMALL);
  assert.equal(t.grid.gridHorizontalColor, "#1CCA3B", "background -> foreground at 12%");
  assert.equal(t.grid.gridVerticalColor, "#1CCA3B");
  assert.equal(t.values.backColorSecondary, "#12D43E", "background -> foreground at 8%");
});

test("the blend predicts the unseen A/B theme byte for byte", () => {
  // The strongest evidence in the sweep, restated as a test: these two
  // values were predicted from the rule BEFORE the theme was measured, and
  // the Format pane matched both exactly.
  const ab = src({ ...SMALL, background: "#FFE100", foreground: "#0057FF" });
  assert.equal(blendNativeTokens(ab, "background", "foreground", TABLE_BLEND.gridline), "#E0D01F");
  assert.equal(blendNativeTokens(ab, "background", "foreground", TABLE_BLEND.alternatingRow), "#EBD614");
});

test("the blend is linear RGB with per-channel rounding", () => {
  // Not gamma-corrected and not HSL. The alternatives land a unit or two
  // away, which would silently fail to reproduce what Power BI draws.
  const half = src({ ...SMALL, background: "#000000", foreground: "#FFFFFF" });
  assert.equal(blendNativeTokens(half, "background", "foreground", 0.5), "#808080");
  assert.equal(blendNativeTokens(half, "background", "foreground", 0), "#000000");
  assert.equal(blendNativeTokens(half, "background", "foreground", 1), "#FFFFFF");
});

test("a blended colour follows the theme rather than being a constant", () => {
  const other = table({ ...SMALL, background: "#FFE100", foreground: "#0057FF" });
  assert.equal(other.grid.gridHorizontalColor, "#E0D01F");
  assert.notEqual(other.grid.gridHorizontalColor, table(SMALL).grid.gridHorizontalColor);
});

// ---------------------------------------------------------------------------
// Precedence and "no native default"
// ---------------------------------------------------------------------------

test("an explicit visualStyles value beats every derived fallback", () => {
  const custom: PowerBITheme = {
    ...SMALL,
    visualStyles: {
      tableEx: {
        "*": {
          grid: [{ gridHorizontalColor: { solid: { color: "#FF00FF" } }, rowPadding: 9, textSize: 31 }],
          columnHeaders: [{ fontColor: { solid: { color: "#ABCDEF" } } }],
        },
      },
      pieChart: { "*": { legend: [{ fontSize: 41 }] } },
    },
  };
  const t = table(custom);
  assert.equal(t.grid.gridHorizontalColor, "#FF00FF", "over the blend");
  assert.equal(t.grid.rowPadding, 9, "over the native constant");
  assert.equal(t.grid.textSize, 31, "over the class scale");
  assert.equal(t.columnHeaders.fontColor, "#ABCDEF", "over the token");
  assert.equal(pie(custom).legend.fontSize, 41, "over the pie legend rule");
});

test("slice fill and totals background remain distinguishable as unset", () => {
  // Both paint something, because the preview cannot draw nothing. Neither
  // is a native default, and the difference lives in provenance: no theme
  // layer supplies them, so they resolve as a fallback and isSet stays false.
  const s = src(SMALL);
  for (const [label, definition] of [
    ["pie slice fill", PIE_CHART_PROPERTIES.dataPoint.fill],
    ["table totals background", TABLE_PROPERTIES.total.backColor],
  ] as const) {
    const entry = resolvePropertyEntry(s, definition, "#000000");
    assert.equal(entry.source, "fallback", `${label}: nothing supplies it`);
    assert.equal(entry.isSet, false, `${label}: must not read as configured`);
  }

  // And what Studio paints is still a real colour, so the preview works.
  assert.match(pie(SMALL).dataPoint.fill, /^#[0-9A-Fa-f]{6}$/);
  assert.match(table(SMALL).total.backColor, /^#[0-9A-Fa-f]{6}$/);

  // Both are recorded as having no native default, with their evidence.
  const recorded = PROPERTIES_WITHOUT_NATIVE_DEFAULT.map((row) => row.property);
  assert.ok(recorded.includes("pieChart.dataPoint.fill"));
  assert.ok(recorded.includes("tableEx.total.backColor"));
});

test("setting one of them explicitly does read as configured", () => {
  // Completes the distinction; otherwise isSet would be proving nothing.
  const custom: PowerBITheme = {
    ...SMALL,
    visualStyles: { pieChart: { "*": { dataPoint: [{ fill: { solid: { color: "#123456" } } }] } } },
  };
  const entry = resolvePropertyEntry(src(custom), PIE_CHART_PROPERTIES.dataPoint.fill, "#000000");
  assert.equal(entry.isSet, true);
  assert.equal(entry.value, "#123456");
});

test("resolving pie and table does not mutate the theme", () => {
  const before = JSON.stringify(SMALL);
  pie(SMALL);
  table(SMALL);
  assert.equal(JSON.stringify(SMALL), before);
});
