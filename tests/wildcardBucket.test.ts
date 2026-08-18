import assert from "node:assert/strict";
import test from "node:test";
import fluent2 from "../themes/base/fluent2.json" with { type: "json" };
import { BAR_CHART_PROPERTIES, resolveBarChartStyle } from "../app/lib/barChartProperties";
import { CHROME_PROPERTIES, resolveChromeStyle } from "../app/lib/chromeProperties";
import { LINE_CHART_PROPERTIES, resolveLineChartStyle } from "../app/lib/lineChartProperties";
import { mergeThemeOverBase, resolveTheme, type PowerBITheme } from "../app/lib/theme";

/**
 * Regression tests for the P0 wildcard-bucket bug (see
 * ARCHITECTURE_REVIEW.md §3.1).
 *
 * Power BI resolves a property as:
 *   visualStyles[visualType]["*"]  →  visualStyles["*"]["*"]  →  built-in default
 *
 * Before the fix, only the ~135 shared "chrome" properties consulted the
 * second step; every per-visual property stopped after the first. That
 * silently discarded 41 of the 70 values in Fluent 2's own shared bucket
 * (categoryAxis, valueAxis, legend, filterCard, outspacePane, ...).
 */

const BASE_FLUENT_2 = fluent2 as unknown as PowerBITheme;
const EMPTY_USER_THEME: PowerBITheme = { name: "User theme", visualStyles: {} };

test("BUG FIX: a per-visual property set only in the wildcard bucket is honoured", () => {
  const wildcardOnly: PowerBITheme = {
    visualStyles: {
      "*": {
        "*": {
          categoryAxis: [{ labelColor: { solid: { color: "#AA0000" } }, fontSize: 17 }],
        },
      },
    },
  };

  const bar = resolveBarChartStyle(wildcardOnly, resolveTheme(wildcardOnly));
  assert.equal(bar.categoryAxis.labelColor, "#AA0000", "colour must come from the wildcard bucket");
  assert.equal(bar.categoryAxis.fontSize, 17, "non-colour values must too");
});

test("a visual-specific value still beats the wildcard bucket — precedence is preserved", () => {
  const bothBuckets: PowerBITheme = {
    visualStyles: {
      "*": { "*": { categoryAxis: [{ labelColor: { solid: { color: "#AA0000" } }, fontSize: 17 }] } },
      clusteredBarChart: { "*": { categoryAxis: [{ labelColor: { solid: { color: "#00BB00" } } }] } },
    },
  };

  const bar = resolveBarChartStyle(bothBuckets, resolveTheme(bothBuckets));
  assert.equal(bar.categoryAxis.labelColor, "#00BB00", "the visual's own override wins");
  assert.equal(bar.categoryAxis.fontSize, 17, "and unset siblings still fall through to the wildcard bucket");
});

test("the wildcard bucket does not leak across to a different visual's own override", () => {
  // A value set specifically on the line chart must not appear on the bar
  // chart just because both now consult the shared bucket.
  const lineOnly: PowerBITheme = {
    visualStyles: {
      lineChart: { "*": { categoryAxis: [{ labelColor: { solid: { color: "#123456" } } }] } },
    },
  };

  const bar = resolveBarChartStyle(lineOnly, resolveTheme(lineOnly));
  const line = resolveLineChartStyle(lineOnly, resolveTheme(lineOnly));

  assert.equal(line.categoryAxis.labelColor, "#123456");
  assert.notEqual(bar.categoryAxis.labelColor, "#123456", "bar chart must be unaffected");
});

test("chrome properties keep their existing wildcard behaviour, unchanged by the fix", () => {
  const wildcardChrome: PowerBITheme = {
    visualStyles: { "*": { "*": { title: [{ fontColor: { solid: { color: "#00AA00" } } }] } } },
  };

  const chrome = resolveChromeStyle(wildcardChrome, "clusteredBarChart", resolveTheme(wildcardChrome));
  assert.equal(chrome.title.fontColor, "#00AA00");
});

test("no chrome property shares a full path with a per-visual property, which the wildcard fallback would now conflate", () => {
  // Before the fix this was harmless: per-visual properties never consulted
  // visualStyles["*"]["*"], so a chrome group and a visual group could share
  // a name without consequence. Now that both read the same shared bucket,
  // an identical *path* (group + field) would make one silently pick up the
  // other's value. `general` already overlaps by group name between chrome
  // and the line chart — their fields happen to be disjoint, so this guards
  // that it stays that way.
  type AnyRegistry = Record<string, Record<string, { path: Array<string | number> }>>;
  const pathsOf = (registry: AnyRegistry): string[] =>
    Object.values(registry).flatMap((group) => Object.values(group).map((definition) => definition.path.join(".")));

  const chromePaths = new Set(pathsOf(CHROME_PROPERTIES as unknown as AnyRegistry));

  const collisions: string[] = [];
  for (const [name, registry] of [
    ["barChart", BAR_CHART_PROPERTIES],
    ["lineChart", LINE_CHART_PROPERTIES],
  ] as const) {
    for (const path of pathsOf(registry as unknown as AnyRegistry)) {
      if (chromePaths.has(path)) collisions.push(`${name}: ${path}`);
    }
  }

  assert.deepEqual(collisions, [], "a shared path would make chrome and per-visual resolution conflate");
});

test("BUG FIX: Fluent 2's real shared-bucket axis styling reaches the charts that inherit it", () => {
  // Fluent 2 puts categoryAxis/valueAxis defaults in visualStyles["*"]["*"]
  // and never repeats them per chart type. Before the fix every chart
  // ignored all of it.
  const effective = mergeThemeOverBase(BASE_FLUENT_2, EMPTY_USER_THEME);
  const resolved = resolveTheme(effective);

  const bar = resolveBarChartStyle(effective, resolved);
  const line = resolveLineChartStyle(effective, resolved);

  // Shared bucket sets: fontSize 10.5, gridlineStyle "solid",
  // gridlineColor #F0F0F0, labelColor token foregroundNeutralSecondary.
  assert.equal(bar.categoryAxis.fontSize, 10.5);
  assert.equal(bar.valueAxis.gridlineStyle, "solid");
  assert.equal(bar.valueAxis.gridlineColor, "#F0F0F0");
  assert.equal(bar.categoryAxis.labelColor, "#616161");

  // The line chart inherits the same shared values...
  assert.equal(line.valueAxis.gridlineColor, "#F0F0F0");
  // ...but Fluent 2 *does* override categoryAxis.gridlineShow per chart
  // type, so that must still win over the shared bucket.
  assert.equal(line.categoryAxis.gridlineShow, false, "lineChart's own override still takes precedence");
});
