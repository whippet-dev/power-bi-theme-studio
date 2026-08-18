import assert from "node:assert/strict";
import test from "node:test";
import fluent2 from "../themes/base/fluent2.json" with { type: "json" };
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { resolveLineChartStyle } from "../app/lib/lineChartProperties";
import { themeLayers } from "../app/lib/properties";
import { mergeThemeOverBase, resolveTheme, type PowerBITheme } from "../app/lib/theme";

/**
 * Cross-layer precedence between the uploaded custom theme and the selected
 * base theme.
 *
 * Microsoft's authoring reference orders *every* custom-theme match ahead of
 * *every* base-theme match:
 *
 *   custom exact/preset → custom exact/*  → custom wildcard/preset
 *   → custom wildcard/* → base exact/*    → base wildcard/*  → system default
 *
 * The important consequence is that a custom **wildcard** value outranks a
 * base **visual-specific** value — the layer axis dominates the
 * specificity axis. Presets are excluded here; this app doesn't read them
 * yet (ARCHITECTURE_REVIEW.md §3.3).
 */

const BASE_FLUENT_2 = fluent2 as unknown as PowerBITheme;

test("REGRESSION: a custom wildcard value outranks a base visual-specific value", () => {
  // Fluent 2 sets visualStyles.lineChart["*"].categoryAxis[0].gridlineShow
  // = false — a base *visual-specific* value.
  assert.equal(
    (BASE_FLUENT_2.visualStyles as never as Record<string, Record<string, Record<string, Array<Record<string, unknown>>>>>)
      .lineChart["*"].categoryAxis[0].gridlineShow,
    false,
    "fixture guard: Fluent 2 still sets this per visual type",
  );

  // The user's own theme turns gridlines on for everything, via the
  // wildcard bucket. Per Microsoft's ordering the custom wildcard wins,
  // because every custom match is considered before any base match.
  const custom: PowerBITheme = {
    visualStyles: { "*": { "*": { categoryAxis: [{ gridlineShow: true }] } } },
  };

  const source = themeLayers(custom, BASE_FLUENT_2);
  const line = resolveLineChartStyle(source, resolveTheme(source.roots));

  assert.equal(
    line.categoryAxis.gridlineShow,
    true,
    "the user's wildcard must beat the base theme's visual-specific value",
  );
});

test("INVERSE: a custom visual-specific value outranks a base wildcard value", () => {
  // Fluent 2 sets visualStyles["*"]["*"].categoryAxis[0].fontSize = 10.5 —
  // a base *wildcard* value.
  const custom: PowerBITheme = {
    visualStyles: { clusteredBarChart: { "*": { categoryAxis: [{ fontSize: 22 }] } } },
  };

  const source = themeLayers(custom, BASE_FLUENT_2);
  const bar = resolveBarChartStyle(source, resolveTheme(source.roots));

  assert.equal(bar.categoryAxis.fontSize, 22, "the user's visual-specific value must win");
});

test("within the custom layer, visual-specific still beats wildcard", () => {
  const custom: PowerBITheme = {
    visualStyles: {
      "*": { "*": { categoryAxis: [{ fontSize: 9 }] } },
      clusteredBarChart: { "*": { categoryAxis: [{ fontSize: 22 }] } },
    },
  };

  const source = themeLayers(custom, BASE_FLUENT_2);
  const resolved = resolveTheme(source.roots);

  assert.equal(resolveBarChartStyle(source, resolved).categoryAxis.fontSize, 22, "bar chart takes its own value");
  assert.equal(
    resolveLineChartStyle(source, resolved).categoryAxis.fontSize,
    9,
    "a visual with no custom-specific value takes the custom wildcard",
  );
});

test("within the base layer, visual-specific still beats wildcard when the custom theme is silent", () => {
  // No custom override at all: Fluent 2's own lineChart-specific
  // gridlineShow:false must still beat its wildcard categoryAxis block.
  const source = themeLayers({ visualStyles: {} }, BASE_FLUENT_2);
  const line = resolveLineChartStyle(source, resolveTheme(source.roots));

  assert.equal(line.categoryAxis.gridlineShow, false);
  // ...and the base wildcard still supplies everything it didn't override.
  assert.equal(line.categoryAxis.fontSize, 10.5);
});

test("CAVEAT: a merged theme does NOT carry cross-layer precedence — only themeLayers does", () => {
  // mergeThemeOverBase is a plain merge again, for root-level reads. It
  // cannot express "every custom match before any base match", because
  // merging discards which layer each value came from. Resolving a merged
  // theme therefore falls back to specificity order and gets this case
  // wrong. Pinned deliberately so nobody reinstates that path believing it
  // is equivalent to passing layers.
  const custom: PowerBITheme = {
    visualStyles: { "*": { "*": { categoryAxis: [{ gridlineShow: true }] } } },
  };

  const merged = mergeThemeOverBase(BASE_FLUENT_2, custom);
  const viaMerge = resolveLineChartStyle(merged, resolveTheme(merged));
  const viaLayers = resolveLineChartStyle(
    themeLayers(custom, BASE_FLUENT_2),
    resolveTheme(mergeThemeOverBase(BASE_FLUENT_2, custom)),
  );

  assert.equal(viaLayers.categoryAxis.gridlineShow, true, "layered resolution is correct");
  assert.equal(
    viaMerge.categoryAxis.gridlineShow,
    false,
    "a merged theme loses the layer distinction — this is why resolution takes layers",
  );
});

test("flattening precedence into the merged projection never leaks back into the user's own theme", () => {
  // The fix folds base-theme content into each visual's bucket *in the
  // projection*. If that ever mutated the custom theme — or if the
  // projection were mistaken for something exportable — a user's file
  // would silently acquire the whole base theme on save.
  const custom: PowerBITheme = {
    name: "Mine",
    visualStyles: {
      clusteredBarChart: { "*": { dataPoint: [{ fill: { solid: { color: "#ABCDEF" } } }] } },
      // A style-preset bucket, which this app doesn't read but must keep.
      lineChart: { "Data labels": { labels: [{ show: true }] } },
    },
  };
  const before = JSON.stringify(custom);

  const projection = mergeThemeOverBase(BASE_FLUENT_2, custom);

  assert.equal(JSON.stringify(custom), before, "merge must not mutate the custom theme");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const customBucket = (custom.visualStyles as any).clusteredBarChart["*"];
  assert.deepEqual(
    Object.keys(customBucket),
    ["dataPoint"],
    "the user's own bucket must still contain only what they set",
  );

  // The projection *should* carry the flattened base content — that's the point.
  const projectedBucket = (projection.visualStyles as any).clusteredBarChart["*"];
  assert.ok(projectedBucket.categoryAxis, "projection carries the base theme's wildcard groups");
  assert.equal((custom.visualStyles as any).lineChart["Data labels"].labels[0].show, true, "preset bucket untouched");
});

test("a custom wildcard does not clobber sibling fields the base set visual-specifically", () => {
  // Precedence is per *property*, not per group: the custom wildcard wins
  // for gridlineShow, but Fluent 2's lineChart-specific siblings and its
  // wildcard siblings must both survive underneath.
  const custom: PowerBITheme = {
    visualStyles: { "*": { "*": { categoryAxis: [{ gridlineShow: true }] } } },
  };

  const source = themeLayers(custom, BASE_FLUENT_2);
  const line = resolveLineChartStyle(source, resolveTheme(source.roots));

  assert.equal(line.categoryAxis.gridlineShow, true, "overridden property");
  assert.equal(line.categoryAxis.fontSize, 10.5, "base wildcard sibling survives");
  assert.equal(line.categoryAxis.labelColor, "#616161", "base wildcard token sibling survives");
});
