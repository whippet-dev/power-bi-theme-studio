/**
 * The native-default architecture, tested against the properties the
 * fingerprint sweep actually established.
 *
 * The fixtures below deliberately imitate the diagnostic theme the sweep
 * used: every token and text class carries a colour that appears nowhere
 * else, so an assertion cannot pass by coincidence. If mark fill and mark
 * border both resolved to the same token, or a "light" colour happened to
 * equal the palette, these tests would not be able to tell — which is
 * exactly the failure mode the measurement itself was designed to avoid.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import {
  CARTESIAN_NATIVE,
  LINE_NATIVE,
  MARK_NATIVE,
  dataLabelParts,
  stackingFeatures,
} from "../app/lib/cartesianNativeDefaults";
import { resolveChromeStyle } from "../app/lib/chromeProperties";
import { resolveColumnChartStyle } from "../app/lib/columnChartProperties";
import { resolveLineChartStyle } from "../app/lib/lineChartProperties";
import { CAPABILITY_COLOR, nativeDataColor, nativeToken } from "../app/lib/nativeTokens";
import { themeLayers } from "../app/lib/properties";
import { resolveStackedBarChartStyle } from "../app/lib/stackedBarChartProperties";
import { resolveStackedColumnChartStyle } from "../app/lib/stackedColumnChartProperties";
import { NATIVE_CHROME_FONT_SIZE, TEXT_ROLE_SPEC, resolveTextRole } from "../app/lib/textClasses";
import { resolveTheme, type PowerBITheme } from "../app/lib/theme";

/**
 * A theme in the shape of the diagnostic one: every token a different hue,
 * and the two text classes deliberately far apart in size and family so a
 * scale rule is arithmetic rather than a coincidence.
 */
const FINGERPRINT: PowerBITheme = {
  name: "fingerprint",
  dataColors: ["#00E660", "#0073E6"],
  foreground: "#E60000",
  background: "#00E643",
  foregroundNeutralSecondary: "#8600E6",
  secondaryBackground: "#E600AC",
  backgroundDark: "#00E6DC",
  textClasses: {
    callout: { fontFace: "Comic Sans MS", fontSize: 23, color: "#0B8E27" },
    header: { fontFace: "Georgia", fontSize: 17, color: "#0B3C8E" },
    title: { fontFace: "Impact", fontSize: 19, color: "#8E0B16" },
    label: { fontFace: "Courier New", fontSize: 13, color: "#628E0B" },
  },
  visualStyles: {},
};

/** The second theme point, which is what makes a scale rule provable. */
const FINGERPRINT_LARGE: PowerBITheme = {
  ...FINGERPRINT,
  textClasses: {
    ...FINGERPRINT.textClasses,
    title: { fontFace: "Impact", fontSize: 30, color: "#8E0B16" },
    label: { fontFace: "Courier New", fontSize: 20, color: "#628E0B" },
  },
};

const src = (theme: PowerBITheme = FINGERPRINT) => themeLayers(theme, getBaseTheme("classic2026"));
const styled = <T>(resolve: (s: ReturnType<typeof src>, t: ReturnType<typeof resolveTheme>) => T, theme?: PowerBITheme): T => {
  const s = src(theme);
  return resolve(s, resolveTheme(s.roots));
};

/** The visuals drawing a rectangular mark, which is the set that has a mark border. */
const RECTANGULAR = [
  { name: "Clustered Bar", resolve: resolveBarChartStyle },
  { name: "Stacked Bar", resolve: resolveStackedBarChartStyle },
  { name: "Clustered Column", resolve: resolveColumnChartStyle },
  { name: "Stacked Column", resolve: resolveStackedColumnChartStyle },
] as const;

const CARTESIAN = [...RECTANGULAR, { name: "Line", resolve: resolveLineChartStyle }] as const;

// ---------------------------------------------------------------------------
// 1. The three typography channels resolve independently
// ---------------------------------------------------------------------------

test("family, size and colour are three separate decisions on one surface", () => {
  // The axis title is the proof: all three could have come from the `title`
  // class, and only two of them do.
  const title = resolveTextRole(src(), "categoryAxisTitle");
  assert.equal(title.fontFamily, "Impact", "family from the title class");
  assert.equal(title.color, "#8E0B16", "colour from the title class");
  assert.equal(title.fontSize, NATIVE_CHROME_FONT_SIZE, "size from neither");
  assert.notEqual(title.fontSize, 19, "and specifically not the class's own size");
});

test("a role may take its colour from a root token rather than its class", () => {
  // Tooltip text uses the label class for family and size, and `foreground`
  // for colour — a combination no single class can express.
  const tooltip = resolveTextRole(src(), "tooltipText");
  assert.equal(tooltip.fontFamily, "Courier New", "label family");
  assert.equal(tooltip.fontSize, 13, "label size, unscaled");
  assert.equal(tooltip.color, "#E60000", "but `foreground`, not the label colour");
  assert.notEqual(tooltip.color, "#628E0B", "not the label class colour");
  assert.notEqual(tooltip.color, "#8600E6", "and not the light-role colour either");
});

test("every role names the class supplying its family", () => {
  // A role without a `class` would have nowhere to get a family from.
  for (const [role, spec] of Object.entries(TEXT_ROLE_SPEC)) {
    assert.ok(spec.class, `${role} must name a class`);
  }
});

// ---------------------------------------------------------------------------
// 2. The four size behaviours, each at two theme points
// ---------------------------------------------------------------------------

test("the four size rules hold across two theme points", () => {
  const small = src(FINGERPRINT);
  const large = src(FINGERPRINT_LARGE);
  const at = (s: ReturnType<typeof src>, role: Parameters<typeof resolveTextRole>[1]) =>
    resolveTextRole(s, role).fontSize;

  // Rule 1 — the visual title scales the title class by 7/6.
  assert.equal(at(small, "visualTitle"), 22.2, "19 x 7/6, rounded as Power BI rounds");
  assert.equal(at(large, "visualTitle"), 35, "30 x 7/6");

  // Rule 2 — container text takes its class size unscaled.
  assert.equal(at(small, "smallMultipleTitle"), 19, "title x 1");
  assert.equal(at(large, "smallMultipleTitle"), 30);
  assert.equal(at(small, "subtitle"), 13, "label x 1");
  assert.equal(at(large, "subtitle"), 20);
  assert.equal(at(small, "tooltipText"), 13);
  assert.equal(at(large, "tooltipText"), 20);

  // Rule 3 — data-region text scales the label class by 0.9.
  for (const role of ["dataLabel", "totalLabel", "seriesLabel"] as const) {
    assert.equal(at(small, role), 11.7, `${role}: 13 x 0.9`);
    assert.equal(at(large, role), 18, `${role}: 20 x 0.9`);
  }

  // Rule 4 — chart chrome ignores both classes entirely.
  for (const role of ["categoryAxisLabel", "valueAxisLabel", "categoryAxisTitle", "valueAxisTitle", "legendText"] as const) {
    assert.equal(at(small, role), NATIVE_CHROME_FONT_SIZE, `${role} at the first theme point`);
    assert.equal(at(large, role), NATIVE_CHROME_FONT_SIZE, `${role} at the second`);
  }
});

test("the chrome constant does not leak into the surfaces that do scale", () => {
  // Guards against a fix that simply pinned everything to 9. Both classes
  // moved between the two points, and these three moved with them.
  const small = resolveTextRole(src(FINGERPRINT), "dataLabel").fontSize;
  const large = resolveTextRole(src(FINGERPRINT_LARGE), "dataLabel").fontSize;
  assert.notEqual(small, large);
  assert.notEqual(small, NATIVE_CHROME_FONT_SIZE);
});

// ---------------------------------------------------------------------------
// 3. Token provenance
// ---------------------------------------------------------------------------

test("each token reaches the surfaces the sweep proved, on every visual", () => {
  for (const entry of CARTESIAN) {
    const s = styled(entry.resolve) as never as {
      dataPoint: { fill: string };
      valueAxis: { gridlineColor: string; labelColor: string };
      legend: { labelColor: string };
      labels: { color: string };
    };
    assert.equal(s.dataPoint.fill, "#00E660", `${entry.name}: mark fill is dataColors[0]`);
    assert.equal(s.valueAxis.gridlineColor, "#E600AC", `${entry.name}: gridlines are secondaryBackground`);
    assert.equal(s.valueAxis.labelColor, "#8600E6", `${entry.name}: axis values are light`);
    assert.equal(s.legend.labelColor, "#8600E6", `${entry.name}: legend text is light`);
    assert.equal(s.labels.color, "#8600E6", `${entry.name}: data labels are light`);
  }
});

test("the mark border is its own token, on the visuals that have a mark border", () => {
  // A line chart has no rectangular mark and so no border group — its
  // stroke lives under `lineStyles` instead. Asserting one here would be
  // inventing a property, which is the failure this split avoids.
  for (const entry of RECTANGULAR) {
    const s = styled(entry.resolve) as never as {
      dataPoint: { fill: string; borderColor: string };
      valueAxis: { gridlineColor: string };
    };
    assert.equal(s.dataPoint.borderColor, "#8600E6", `${entry.name}: foregroundNeutralSecondary`);
    // Three genuinely different tokens, which the old shared `#E3E3E3`
    // fallback could not have distinguished from one another.
    assert.notEqual(s.dataPoint.borderColor, s.valueAxis.gridlineColor, `${entry.name}: border != gridline`);
    assert.notEqual(s.dataPoint.borderColor, s.dataPoint.fill, `${entry.name}: border != fill`);
  }
});

test("markers take the palette, and the line's own stroke width is not the border's", () => {
  const s = styled(resolveLineChartStyle);
  assert.equal(s.lineStyles.markerColor, "#00E660", "markers are dataColors[0]");
  assert.equal(s.lineStyles.strokeWidth, 3, "the line itself");
  assert.equal(MARK_NATIVE.column.strokeWidth, 1, "a mark border");
  assert.equal(LINE_NATIVE.markerBorderWidth, 2, "a marker border");
  // Three distinct values; a single shared "1" would collapse two of them.
  assert.equal(new Set([s.lineStyles.strokeWidth, MARK_NATIVE.column.strokeWidth, LINE_NATIVE.markerBorderWidth]).size, 3);
});

test("series labels sit on backgroundDark, a token nothing else uses", () => {
  const s = styled(resolveLineChartStyle);
  assert.equal(s.seriesLabels.backgroundColor, "#00E6DC");
  assert.equal(s.seriesLabels.backgroundTransparency, 90);
  assert.equal(s.seriesLabels.enableBackground, true);
});

test("the visual container background is a capability constant, not `background`", () => {
  // The single most counter-intuitive result of the sweep: the `background`
  // token paints tooltips, and never the container.
  const s = src();
  const chrome = resolveChromeStyle(s, "clusteredBarChart", resolveTheme(s.roots));
  assert.equal(chrome.background.color, CAPABILITY_COLOR.visualBackground);
  assert.notEqual(chrome.background.color, "#00E643", "not the theme's `background`");
  assert.equal(nativeToken(s, "background"), "#00E643", "which the theme does define");
});

test("the subtitle and title divider follow foregroundNeutralSecondary", () => {
  const s = src();
  const chrome = resolveChromeStyle(s, "clusteredBarChart", resolveTheme(s.roots));
  assert.equal(chrome.subTitle.fontColor, "#8600E6");
  assert.equal(chrome.subTitle.fontFamily, "Courier New", "label family");
  assert.equal(chrome.subTitle.fontSize, 13, "label size, unscaled");
  assert.equal(chrome.divider.color, "#8600E6");
});

test("token accessors fall back to Power BI's values, not to invented ones", () => {
  const bare = themeLayers({ name: "bare", visualStyles: {} }, undefined);
  assert.equal(nativeToken(bare, "foregroundNeutralSecondary"), "#605E5C", "Classic 2026's value");
  assert.equal(nativeDataColor(bare, 0), nativeToken(bare, "foreground"), "no palette entry to take");
  // And a real token is preferred over the built-in.
  assert.equal(nativeDataColor(src(), 1), "#0073E6");
});

// ---------------------------------------------------------------------------
// 4. "No default" is preserved as distinct from a colour literal
// ---------------------------------------------------------------------------

test("properties with no native default are never silently given black", () => {
  const line = styled(resolveLineChartStyle);
  const column = styled(resolveColumnChartStyle) as never as {
    labels: { backgroundColor: string };
  };
  const s = src();
  const chrome = resolveChromeStyle(s, "clusteredBarChart", resolveTheme(s.roots));

  // These four were measured as empty in the Format pane. Substituting a
  // literal would assert a default Power BI does not have; substituting
  // black in particular was the old behaviour and is what this guards.
  for (const [label, value] of [
    ["line stroke", line.lineStyles.strokeColor],
    ["shade area", line.lineStyles.areaColor],
    ["data-label background", column.labels.backgroundColor],
    ["visual title background", chrome.title.backgroundColor],
  ] as const) {
    assert.notEqual(value, "#000000", `${label} must not default to black`);
    assert.notEqual(value, "#000", `${label} must not default to black`);
  }

  // The line's stroke and shade area follow the series colour rather than
  // carrying one, which is what `matchStrokeColor` being on by default
  // encodes. Painting them from the palette is correct; claiming the
  // palette is their *theme default* is not.
  assert.equal(line.lineStyles.areaMatchStrokeColor, true);
});

// ---------------------------------------------------------------------------
// 5. Shared cartesian defaults really are shared
// ---------------------------------------------------------------------------

test("the shared cartesian block is identical on every cartesian visual", () => {
  // The sweep's strongest structural result: across the whole family, not
  // one shared property takes a different value.
  const rows = RECTANGULAR.map((entry) => {
    const s = styled(entry.resolve) as never as {
      categoryAxis: { show: boolean; axisStyle: string; fontSize: number; titleFontSize: number };
      valueAxis: { gridlineShow: boolean; gridlineStyle: string; gridlineAutoScale: boolean; gridlineThickness: number };
      legend: { showTitle: boolean };
      dataPoint: { borderShow: boolean; borderSize: number };
    };
    return JSON.stringify({
      axisShow: s.categoryAxis.show,
      axisStyle: s.categoryAxis.axisStyle,
      axisSize: s.categoryAxis.fontSize,
      axisTitleSize: s.categoryAxis.titleFontSize,
      gridShow: s.valueAxis.gridlineShow,
      gridStyle: s.valueAxis.gridlineStyle,
      gridAutoScale: s.valueAxis.gridlineAutoScale,
      gridWidth: s.valueAxis.gridlineThickness,
      legendTitle: s.legend.showTitle,
      borderShow: s.dataPoint.borderShow,
      borderWidth: s.dataPoint.borderSize,
    });
  });
  assert.equal(new Set(rows).size, 1, `expected one shared block, got:\n${[...new Set(rows)].join("\n")}`);
});

test("gridlines default to dotted, unscaled, 1px", () => {
  assert.equal(CARTESIAN_NATIVE.gridline.style, "dotted");
  assert.equal(CARTESIAN_NATIVE.gridline.autoScale, false);
  assert.equal(CARTESIAN_NATIVE.gridline.width, 1);
  for (const entry of CARTESIAN) {
    const s = styled(entry.resolve) as never as {
      valueAxis: { gridlineStyle: string; gridlineAutoScale: boolean; gridlineThickness: number };
    };
    assert.equal(s.valueAxis.gridlineStyle, "dotted", `${entry.name}`);
    assert.equal(s.valueAxis.gridlineAutoScale, false, `${entry.name}`);
    assert.equal(s.valueAxis.gridlineThickness, 1, `${entry.name}`);
  }
});

// ---------------------------------------------------------------------------
// 6. The exceptions are encoded, not flattened
// ---------------------------------------------------------------------------

test("labelContentLayout follows the mark, not the axis orientation", () => {
  // The line chart is the discriminator. It is category-on-X like a column
  // chart, so an orientation rule would make it multi-line; it is single
  // line, like the bars.
  assert.equal(MARK_NATIVE.column.labelContentLayout, "MultiLine");
  assert.equal(MARK_NATIVE.bar.labelContentLayout, "SingleLine");
  assert.equal(MARK_NATIVE.line.labelContentLayout, "SingleLine");
  assert.notEqual(MARK_NATIVE.line.labelContentLayout, MARK_NATIVE.column.labelContentLayout);
});

test("gridline group names flip with orientation, and only with orientation", () => {
  assert.equal(MARK_NATIVE.column.gridlineAxis, "horizontal");
  assert.equal(MARK_NATIVE.bar.gridlineAxis, "vertical");
  // Line is column-oriented, so it keeps the column's group despite sharing
  // the bar's label layout — the two rules are genuinely independent.
  assert.equal(MARK_NATIVE.line.gridlineAxis, "horizontal");
});

test("label orientation controls exist on columns only", () => {
  assert.equal(MARK_NATIVE.column.hasLabelOrientation, true);
  assert.equal(MARK_NATIVE.bar.hasLabelOrientation, false);
  assert.equal(MARK_NATIVE.line.hasLabelOrientation, false);
});

test("the zoom slider's value axis is off for line and on for the rest", () => {
  assert.equal(MARK_NATIVE.column.zoomValueAxis, true);
  assert.equal(MARK_NATIVE.bar.zoomValueAxis, true);
  assert.equal(MARK_NATIVE.line.zoomValueAxis, false);
});

test("stacked-only features are absent from clustered visuals", () => {
  const clustered = stackingFeatures("clustered");
  assert.deepEqual(clustered, { borderOutlineOnly: false, totalLabels: false, ribbons: false });
  for (const mode of ["stacked", "hundredPercent"] as const) {
    assert.deepEqual(stackingFeatures(mode), { borderOutlineOnly: true, totalLabels: true, ribbons: true }, mode);
  }
});

test("100% stacking inverts which data-label part is on", () => {
  assert.deepEqual(dataLabelParts("clustered"), { valueEnabled: true, detailEnabled: false });
  assert.deepEqual(dataLabelParts("stacked"), { valueEnabled: true, detailEnabled: false });
  assert.deepEqual(dataLabelParts("hundredPercent"), { valueEnabled: false, detailEnabled: true });
});

// ---------------------------------------------------------------------------
// 7. Precedence is unchanged
// ---------------------------------------------------------------------------

test("an explicit visualStyles value still beats every native default", () => {
  // The invariant the whole native layer must not break: these are
  // fallbacks, resolved only where no theme layer spoke.
  const custom: PowerBITheme = {
    ...FINGERPRINT,
    visualStyles: {
      clusteredBarChart: {
        "*": {
          categoryAxis: [{ fontSize: 31 }],
          valueAxis: [{ gridlineStyle: "solid", gridlineColor: { solid: { color: "#ABCDEF" } } }],
          dataPoint: [{ borderColor: { solid: { color: "#FEDCBA" } } }],
        },
      },
    },
  };
  const s = styled(resolveBarChartStyle, custom);
  assert.equal(s.categoryAxis.fontSize, 31, "over the native chrome size");
  assert.equal(s.valueAxis.gridlineStyle, "solid", "over the native dotted");
  assert.equal(s.valueAxis.gridlineColor, "#ABCDEF", "over secondaryBackground");
  assert.equal(s.dataPoint.borderColor, "#FEDCBA", "over foregroundNeutralSecondary");
});

test("resolving native defaults does not mutate the theme", () => {
  const before = JSON.stringify(FINGERPRINT);
  for (const entry of CARTESIAN) styled(entry.resolve);
  assert.equal(JSON.stringify(FINGERPRINT), before);
});
