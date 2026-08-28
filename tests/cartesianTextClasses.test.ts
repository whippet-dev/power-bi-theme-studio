import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolveColumnChartStyle } from "../app/lib/columnChartProperties";
import { resolveLineChartStyle } from "../app/lib/lineChartProperties";
import { themeLayers } from "../app/lib/properties";
import { resolveStackedBarChartStyle } from "../app/lib/stackedBarChartProperties";
import { resolveStackedColumnChartStyle } from "../app/lib/stackedColumnChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

/**
 * Adoption of the text-class foundation across the cartesian family.
 *
 * The resolver itself is covered exhaustively by `textClasses.test.ts`; these
 * do not repeat that. They check the one thing adoption can get wrong — that
 * each registry actually reaches the shared roles, and that nothing about
 * `visualStyles` precedence changed on the way.
 *
 * Table-driven, because the five registries have the same shape for every
 * role in scope. Genuine per-visual differences get their own test below.
 */

/** The visual key each registry writes into `visualStyles`. */
const CARTESIAN = [
  { name: "Clustered Bar", visual: "clusteredBarChart", resolve: resolveBarChartStyle },
  { name: "Stacked Bar", visual: "barChart", resolve: resolveStackedBarChartStyle },
  { name: "Clustered Column", visual: "clusteredColumnChart", resolve: resolveColumnChartStyle },
  // "columnChart" is Power BI's internal name for the STACKED column chart,
  // exactly as "barChart" is for the stacked bar. Not a typo.
  { name: "Stacked Column", visual: "columnChart", resolve: resolveStackedColumnChartStyle },
  { name: "Line", visual: "lineChart", resolve: resolveLineChartStyle },
] as const;

type CartesianTypography = {
  categoryAxis: { fontFamily: string; fontSize: number; labelColor: string; titleFontFamily: string; titleFontSize: number };
  valueAxis: { fontFamily: string; fontSize: number; labelColor: string };
  legend: { fontFamily: string; fontSize: number; labelColor: string };
  labels: { fontFamily: string; fontSize: number; color: string };
};

const styleOf = (
  entry: (typeof CARTESIAN)[number],
  custom: PowerBITheme,
  baseId: "classic2026" | "fluent2",
): CartesianTypography => {
  const src = themeLayers(custom, getBaseTheme(baseId));
  return entry.resolve(src, resolveTheme(src.roots)) as never as CartesianTypography;
};

const EMPTY: PowerBITheme = { name: "none", visualStyles: {} };

/**
 * Deliberately unlike anything either base declares, so a migrated property
 * cannot pass by resolving to a coincidentally identical number.
 */
const LOUD: PowerBITheme = {
  name: "Loud",
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

/** Every typography field this rollout migrated, as (label, getter) pairs. */
const MIGRATED_FAMILIES = (s: CartesianTypography) => [
  ["categoryAxis.fontFamily", s.categoryAxis.fontFamily],
  ["categoryAxis.titleFontFamily", s.categoryAxis.titleFontFamily],
  ["valueAxis.fontFamily", s.valueAxis.fontFamily],
  ["legend.fontFamily", s.legend.fontFamily],
  ["labels.fontFamily", s.labels.fontFamily],
] as const;

const MIGRATED_SIZES = (s: CartesianTypography) => [
  ["categoryAxis.fontSize", s.categoryAxis.fontSize],
  ["categoryAxis.titleFontSize", s.categoryAxis.titleFontSize],
  ["valueAxis.fontSize", s.valueAxis.fontSize],
  ["legend.fontSize", s.legend.fontSize],
  ["labels.fontSize", s.labels.fontSize],
] as const;

// ---------------------------------------------------------------------------
// 1. Classic 2026 no longer falls to the emergency literals
// ---------------------------------------------------------------------------

for (const entry of CARTESIAN) {
  test(`${entry.name}: Classic 2026 resolves its proven roles from text classes, not 6 / ""`, () => {
    const s = styleOf(entry, EMPTY, "classic2026");

    for (const [label, size] of MIGRATED_SIZES(s)) {
      assert.notEqual(size, 6, `${label} still falls back to 6`);
    }
    for (const [label, family] of MIGRATED_FAMILIES(s)) {
      assert.notEqual(family, "", `${label} still falls back to an empty family`);
    }

    // And the values are the ones Classic's text classes actually specify.
    // Both axis labels are small classes: native Classic 2026 renders both at
    // 12px = 9pt at every tested size, against a declared label of 10pt.
    assert.equal(s.categoryAxis.fontSize, 9, "smallLightLabel, label x 0.9");
    assert.equal(s.categoryAxis.fontFamily, "Segoe UI");
    assert.equal(s.valueAxis.fontSize, 9, "smallLightLabel, label x 0.9");
    assert.equal(s.categoryAxis.titleFontSize, 12, "title");
    assert.equal(s.categoryAxis.titleFontFamily, "DIN");
    assert.equal(s.legend.fontSize, 10);
    assert.equal(s.labels.fontSize, 9);
    // The light classes carry the neutral colour, not the foreground.
    assert.equal(s.categoryAxis.labelColor, "#605E5C");
    assert.equal(s.valueAxis.labelColor, "#605E5C");
    assert.equal(s.legend.labelColor, "#605E5C");
    assert.equal(s.labels.color, "#605E5C");
  });
}

// ---------------------------------------------------------------------------
// 2. Fluent 2's explicit visualStyles still wins
// ---------------------------------------------------------------------------

for (const entry of CARTESIAN) {
  test(`${entry.name}: Fluent 2's explicit axis typography still beats the text class`, () => {
    // Layered under a theme whose text classes say something very different,
    // so this cannot pass because Fluent's label happens to be 10.5 too.
    const s = styleOf(entry, LOUD, "fluent2");

    assert.equal(s.categoryAxis.fontSize, 10.5, "Fluent's explicit value, not label 14");
    assert.equal(s.valueAxis.fontSize, 10.5);
    assert.notEqual(s.categoryAxis.fontSize, 14);
    assert.ok(
      String(s.categoryAxis.fontFamily).startsWith("'Segoe UI'"),
      "Fluent's family stack, not Comic Sans MS",
    );
    assert.equal(s.categoryAxis.titleFontSize, 10.5, "Fluent declares the axis title too");

    // Where Fluent declares nothing, the custom text class does supply it.
    assert.equal(s.legend.fontSize, 14, "no explicit Fluent legend font");
    assert.equal(s.legend.fontFamily, "Comic Sans MS");
    assert.equal(s.labels.fontSize, 12.6, "smallLightLabel: label 14 x 0.9");
    assert.equal(s.labels.color, "#AA00AA");
  });
}

// ---------------------------------------------------------------------------
// 3 & 4. Custom visualStyles wins; a custom text class reaches the visual
// ---------------------------------------------------------------------------

for (const entry of CARTESIAN) {
  test(`${entry.name}: an explicit custom visualStyles value beats the text class`, () => {
    const custom = updateThemeValue(
      LOUD,
      ["visualStyles", entry.visual, "*", "categoryAxis", 0, "fontSize"],
      31,
    );
    const s = styleOf(entry, custom, "classic2026");
    assert.equal(s.categoryAxis.fontSize, 31, "the explicit value");
    // Its neighbour, which nothing declares, still comes from the text class.
    assert.equal(s.legend.fontSize, 14, "LOUD's label size via lightLabel");
    assert.equal(s.categoryAxis.titleFontSize, 22, "LOUD's title class");
  });

  test(`${entry.name}: a custom text class reaches the visual where no visualStyles value exists`, () => {
    const s = styleOf(entry, LOUD, "classic2026");
    assert.equal(s.categoryAxis.fontFamily, "Comic Sans MS");
    // 14 x 0.9: the custom class still reaches the visual, through the small
    // variant both axis labels now take.
    assert.equal(s.categoryAxis.fontSize, 12.6, "smallLightLabel");
    assert.equal(s.valueAxis.fontSize, 12.6, "smallLightLabel");
    assert.equal(s.categoryAxis.titleFontFamily, "Courier New", "title class");
    assert.equal(s.categoryAxis.titleFontSize, 22);
    assert.equal(s.labels.color, "#AA00AA", "smallLightLabel is a light class");
    assert.notEqual(s.labels.color, "#123456", "not the first data colour");
  });
}

// ---------------------------------------------------------------------------
// 5. Reads must not materialise anything
// ---------------------------------------------------------------------------

test("resolving every cartesian visual leaves the theme untouched", () => {
  const theme = JSON.parse(JSON.stringify(LOUD)) as PowerBITheme;
  const before = JSON.stringify(theme);
  for (const entry of CARTESIAN) {
    styleOf(entry, theme, "classic2026");
    styleOf(entry, theme, "fluent2");
  }
  assert.equal(JSON.stringify(theme), before);
});

// ---------------------------------------------------------------------------
// Genuine per-visual differences
// ---------------------------------------------------------------------------

test("the unproven roles keep their old fallbacks in every cartesian registry", () => {
  // Discipline check. Nothing here has an established Power BI text role, so
  // migrating it would be a guess dressed as fidelity — see PHASE_2_BACKLOG.
  for (const entry of CARTESIAN) {
    const s = styleOf(entry, EMPTY, "classic2026") as never as {
      labels: { titleFontSize: number; titleFontFamily: string; detailFontSize: number };
      error: { labelFontSize: number; labelFontFamily: string };
      subheader: { fontSize: number; fontFamily: string };
    };
    assert.equal(s.labels.titleFontSize, 6, `${entry.name}: data-label title is not a proven role`);
    assert.equal(s.labels.titleFontFamily, "", `${entry.name}: same`);
    assert.equal(s.labels.detailFontSize, 6, `${entry.name}: detail labels are not a proven role`);
    assert.equal(s.error.labelFontSize, 6, `${entry.name}: error-bar labels are not a proven role`);
    assert.equal(s.subheader.fontSize, 6, `${entry.name}: small-multiple headers are not a proven role`);
  }
});

test("Line's secondary axis has proven native defaults while series labels remain alone", () => {
  // With a secondary measure bound, Desktop exposes independent Segoe UI 9pt
  // Values and DIN 12pt Title defaults. Series labels still have no proven role.
  const src = themeLayers(EMPTY, getBaseTheme("classic2026"));
  const s = resolveLineChartStyle(src, resolveTheme(src.roots));
  assert.equal(s.y2Axis.secFontSize, s.valueAxis.fontSize);
  assert.equal(s.y2Axis.secFontFamily, s.valueAxis.fontFamily);
  assert.equal(s.y2Axis.secTitleFontSize, s.valueAxis.titleFontSize);
  assert.equal(s.y2Axis.secTitleFontFamily, s.valueAxis.titleFontFamily);
  assert.equal(s.seriesLabels.textSize, 6);
  assert.equal(s.seriesLabels.seriesFontFamily, "");
});

test("the stacked charts' total labels are left alone too", () => {
  for (const entry of [CARTESIAN[1], CARTESIAN[3]]) {
    const s = styleOf(entry, EMPTY, "classic2026") as never as { totals: { fontSize: number; fontFamily: string } };
    assert.equal(s.totals.fontSize, 6, `${entry.name}: totals are not a proven role`);
    assert.equal(s.totals.fontFamily, "");
  }
});

test("reference-line data labels use smallLabel across the family", () => {
  // smallLabel is not a light class, so it carries the primary's colour —
  // which is what distinguishes it from the axis and legend roles.
  for (const entry of CARTESIAN) {
    const s = styleOf(entry, LOUD, "classic2026") as never as {
      xAxisReferenceLine: { dataLabelColor: string };
      y1AxisReferenceLine: { dataLabelColor: string };
    };
    assert.equal(s.xAxisReferenceLine.dataLabelColor, "#0000FF", `${entry.name}: smallLabel takes label's colour`);
    assert.equal(s.y1AxisReferenceLine.dataLabelColor, "#0000FF", `${entry.name}: same`);
    assert.notEqual(s.xAxisReferenceLine.dataLabelColor, "#AA00AA", "not a light class");
  }
});

// ---------------------------------------------------------------------------
// An optional private real-world theme
// ---------------------------------------------------------------------------

// Deliberately not in the repository — it belongs to someone else. Point
// PBI_PRIVATE_THEME at a theme JSON file to run these; they skip otherwise.
const PRIVATE_THEME_PATH =
  process.env.PBI_PRIVATE_THEME ??
  `${process.env.USERPROFILE ?? process.env.HOME ?? ""}/Downloads/private-theme-fixture.json`;
const hasPrivateTheme = existsSync(PRIVATE_THEME_PATH);

test("private theme + Classic: every cartesian visual uses that theme's Arial", {
  skip: hasPrivateTheme ? false : "private theme fixture not present",
}, () => {
  const theme = JSON.parse(readFileSync(PRIVATE_THEME_PATH, "utf8")) as PowerBITheme;
  for (const entry of CARTESIAN) {
    const s = styleOf(entry, theme, "classic2026");
    for (const [label, family] of MIGRATED_FAMILIES(s)) {
      assert.equal(family, "Arial", `${entry.name}: ${label}`);
    }
    assert.equal(s.categoryAxis.fontSize, 10, `${entry.name}: category axis`);
  }
});

test("private theme + Fluent: its own explicit barChart values still beat Fluent's wildcard", {
  skip: hasPrivateTheme ? false : "private theme fixture not present",
}, () => {
  // The one legitimate asymmetry in the family. The private theme declares
  // barChart.categoryAxis typography explicitly — Stacked Bar's schema name —
  // and a custom visualStyles value outranks a base wildcard one.
  const theme = JSON.parse(readFileSync(PRIVATE_THEME_PATH, "utf8")) as PowerBITheme;
  const stacked = styleOf(CARTESIAN[1], theme, "fluent2");
  assert.equal(stacked.categoryAxis.fontFamily, "Arial", "its explicit value");
  assert.equal(stacked.categoryAxis.fontSize, 10);

  // Every other cartesian visual takes Fluent's explicit wildcard instead,
  // because the private theme declares nothing for them.
  for (const entry of [CARTESIAN[0], CARTESIAN[2], CARTESIAN[3], CARTESIAN[4]]) {
    const s = styleOf(entry, theme, "fluent2");
    assert.equal(s.categoryAxis.fontSize, 10.5, `${entry.name}: Fluent's value`);
    assert.ok(String(s.categoryAxis.fontFamily).startsWith("'Segoe UI'"), `${entry.name}: Fluent's family`);
  }

  // And the legend, which neither declares in visualStyles, falls through to
  // the private theme's text classes on all five.
  for (const entry of CARTESIAN) {
    const s = styleOf(entry, theme, "fluent2");
    assert.equal(s.legend.fontFamily, "Arial", `${entry.name}: legend from the text class`);
  }
});
