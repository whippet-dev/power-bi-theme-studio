import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChartPreview } from "../app/components/previews/BarChartPreview";
import { LineChartPreview } from "../app/components/previews/LineChartPreview";
import { StackedBarChartPreview } from "../app/components/previews/StackedBarChartPreview";
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolveLineChartStyle } from "../app/lib/lineChartProperties";
import { lineFixture } from "../app/lib/previewSampleData";
import { themeLayers } from "../app/lib/properties";
import { resolveStackedBarChartStyle } from "../app/lib/stackedBarChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

/**
 * What the cartesian previews actually emit.
 *
 * The pure tests next door pin the geometry; these pin the wiring, which is
 * where task 9's two production bugs lived. Both were invisible to pure
 * tests: one passed the wrong strings into a layout, the other gave every
 * marker the primary series' colour and coordinates. Neither touched a
 * function those tests call.
 *
 * `renderToStaticMarkup` needs no DOM and no new dependency, and it sees
 * exactly the props the components pass down.
 */

const EMPTY: PowerBITheme = { name: "none", visualStyles: {} };
const PALETTE = ["#005EA5", "#28A197", "#FFDD00", "#912B88", "#F46A25"];

const sourceFor = (custom: PowerBITheme = EMPTY) => themeLayers(custom, getBaseTheme("classic2026"));

const renderBar = () => {
  const src = sourceFor();
  const style = resolveBarChartStyle(src, resolveTheme(src.roots));
  return renderToStaticMarkup(<BarChartPreview barChartStyle={style} palette={PALETTE} />);
};

const renderStackedBar = () => {
  const src = sourceFor();
  const style = resolveStackedBarChartStyle(src, resolveTheme(src.roots));
  return renderToStaticMarkup(<StackedBarChartPreview stackedBarChartStyle={style} palette={PALETTE} />);
};

const renderLine = (custom: PowerBITheme = EMPTY) => {
  const src = sourceFor(custom);
  const style = resolveLineChartStyle(src, resolveTheme(src.roots));
  return renderToStaticMarkup(<LineChartPreview lineChartStyle={style} palette={PALETTE} />);
};

/** Markers are off unless the theme asks for them. */
const WITH_MARKERS = updateThemeValue(
  EMPTY,
  ["visualStyles", "lineChart", "*", "lineStyles", 0, "showMarker"],
  true,
);

// ---------------------------------------------------------------------------
// Category labels reach the layout intact
// ---------------------------------------------------------------------------

for (const [name, render] of [
  ["Clustered Bar", renderBar],
  ["Stacked Bar", renderStackedBar],
] as const) {
  test(`${name} renders whole category labels`, () => {
    const html = render();
    for (const label of ["London", "North West", "Scotland", "Wales"]) {
      assert.ok(html.includes(label), `${name} is missing the label ${JSON.stringify(label)}`);
    }
  });
}

test("clustered and stacked bar agree on their category gutter", () => {
  // The bug: `barCategories.map(([label]) => label)` destructures each STRING
  // and yields "L", "N", "S", "W", so a chart measured single letters while
  // rendering full names. Only one of the two charts had it, so the pair
  // disagreed about a gutter they must compute identically.
  const gutterOf = (html: string) => {
    const match = html.match(/class="chart-axis-gutter[^"]*"[^>]*style="[^"]*width:\s*([\d.]+)px/);
    return match ? Number(match[1]) : null;
  };
  const clustered = gutterOf(renderBar());
  const stacked = gutterOf(renderStackedBar());

  assert.ok(clustered !== null, "no category gutter found in the clustered bar chart");
  assert.equal(stacked, clustered, "the two charts measured different category axes");
});

// ---------------------------------------------------------------------------
// Line: every series is drawn, and drawn as itself
// ---------------------------------------------------------------------------

const pathAttrs = (html: string) =>
  [...html.matchAll(/<path\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => {
      const d = tag.match(/\bd="([^"]*)"/);
      return d ? d[1].length > 10 : false;
    })
    .filter((tag) => tag.includes("stroke=") && !tag.includes('fill="#'));

test("the line chart draws one path per series", () => {
  const paths = pathAttrs(renderLine());
  assert.equal(paths.length, lineFixture.series.length, "one stroked path per series");

  const ds = paths.map((tag) => (tag.match(/\bd="([^"]*)"/) ?? [])[1]);
  assert.equal(new Set(ds).size, ds.length, "two series drew the same path");
});

test("stroke join and cap apply to every series, not just the primary", () => {
  // These are visual-level properties: nothing in the theme addresses one
  // line's join or cap. The secondary paths used to hardcode a round join
  // and omit the cap entirely, so both properties moved only the first line.
  const custom = updateThemeValue(
    updateThemeValue(EMPTY, ["visualStyles", "lineChart", "*", "lineStyles", 0, "strokeLineJoin"], "bevel"),
    ["visualStyles", "lineChart", "*", "lineStyles", 0, "strokeDashCap"],
    "Flat",
  );
  const paths = pathAttrs(renderLine(custom));
  assert.equal(paths.length, 3);

  for (const [index, tag] of paths.entries()) {
    assert.ok(
      /stroke-linejoin="bevel"/.test(tag),
      `path ${index} did not take the resolved join: ${tag.slice(0, 160)}`,
    );
    assert.ok(
      /stroke-linecap="butt"/.test(tag),
      `path ${index} did not take the resolved cap: ${tag.slice(0, 160)}`,
    );
  }

  const joins = paths.map((tag) => (tag.match(/stroke-linejoin="([^"]*)"/) ?? [])[1]);
  assert.equal(new Set(joins).size, 1, "every series must share one join");
});

test("each series path takes its own colour", () => {
  const paths = pathAttrs(renderLine());
  const strokes = paths.map((tag) => (tag.match(/\bstroke="([^"]*)"/) ?? [])[1]);
  assert.equal(new Set(strokes).size, strokes.length, `series shared a colour: ${JSON.stringify(strokes)}`);
});

// ---------------------------------------------------------------------------
// Line markers
// ---------------------------------------------------------------------------

/** Absolutely-positioned marker spans carry `left`/`top` percentages. */
const markerStyles = (html: string) =>
  [...html.matchAll(/style="[^"]*left:\s*([\d.]+)%;top:\s*([\d.]+)%;background-color:\s*([^;"]+)/g)].map(
    (match) => ({ left: Number(match[1]), top: Number(match[2]), color: match[3].trim() }),
  );

test("markers are drawn for every series, at that series' own points", () => {
  const markers = markerStyles(renderLine(WITH_MARKERS));
  assert.equal(markers.length, 15, "3 series x 5 categories");

  const byColor = new Map<string, typeof markers>();
  for (const marker of markers) {
    const bucket = byColor.get(marker.color) ?? [];
    bucket.push(marker);
    byColor.set(marker.color, bucket);
  }
  assert.equal(byColor.size, 3, `expected one colour per series, got ${[...byColor.keys()].join(", ")}`);
  for (const [color, bucket] of byColor) {
    assert.equal(bucket.length, 5, `${color} should mark five categories`);
  }

  // Each colour's heights must be that series' own, in its own order. The
  // fixture has no repeated value in a category, so borrowing a neighbour's
  // values cannot coincide.
  const tops = [...byColor.values()].map((bucket) => bucket.map((marker) => marker.top).join(","));
  assert.equal(new Set(tops).size, 3, "two series' markers sit at identical heights");

  // Every series shares the category positions: five distinct lefts, each
  // used exactly three times.
  const lefts = new Map<number, number>();
  for (const marker of markers) lefts.set(marker.left, (lefts.get(marker.left) ?? 0) + 1);
  assert.equal(lefts.size, 5, "markers should sit on five category positions");
  for (const [left, count] of lefts) assert.equal(count, 3, `position ${left}% has ${count} markers`);
});

test("markers stay off when the theme does not ask for them", () => {
  assert.equal(markerStyles(renderLine()).length, 0);
});

test("an explicit marker Show false overrides an inherited show-by-default true", () => {
  const custom = updateThemeValue(
    EMPTY,
    ["visualStyles", "lineChart", "*", "lineStyles", 0, "showMarker"],
    false,
  );
  const inheritedDefault = updateThemeValue(
    EMPTY,
    ["visualStyles", "lineChart", "*", "lineStyles", 0, "showMarkerByDefault"],
    true,
  );
  const source = themeLayers(custom, inheritedDefault);
  const style = resolveLineChartStyle(source, resolveTheme(source.roots));
  assert.equal(style.lineStyles.showMarkerByDefault, true, "fixture must exercise the inherited default");
  assert.equal(style.lineStyles.showMarkerIsSet, true);
  const html = renderToStaticMarkup(<LineChartPreview lineChartStyle={style} palette={PALETTE} />);
  assert.equal(markerStyles(html).length, 0);
});

test("marker size, shape, fill and border reach every series marker", () => {
  let custom = WITH_MARKERS;
  for (const [path, value] of [
    [["visualStyles", "lineChart", "*", "lineStyles", 0, "markerShape"], "diamond"],
    [["visualStyles", "lineChart", "*", "lineStyles", 0, "markerSize"], 12],
    [["visualStyles", "lineChart", "*", "markers", 0, "borderShow"], true],
    [["visualStyles", "lineChart", "*", "markers", 0, "borderColor"], { solid: { color: "#123456" } }],
    [["visualStyles", "lineChart", "*", "markers", 0, "borderColorMatchFill"], false],
    [["visualStyles", "lineChart", "*", "markers", 0, "borderWidth"], 2],
  ] as const) custom = updateThemeValue(custom, [...path], value);
  const html = renderLine(custom);
  assert.equal(markerStyles(html).length, 15);
  assert.equal((html.match(/width:\s*10\.2px;height:\s*10\.2px/g) ?? []).length, 15);
  assert.equal((html.match(/border:\s*2px solid rgba\(18, 52, 86, 1\)/g) ?? []).length, 15);
  assert.equal((html.match(/rotate\(45deg\)/g) ?? []).length, 15);
});

test("series labels identify all three plotted series", () => {
  const custom = updateThemeValue(
    EMPTY,
    ["visualStyles", "lineChart", "*", "seriesLabels", 0, "show"],
    true,
  );
  const html = renderLine(custom);
  for (const series of lineFixture.series) {
    assert.ok(html.includes(`data-series-label="${series.label}"`), `missing ${series.label} label`);
  }
  assert.equal((html.match(/class="line-preview__series-label"/g) ?? []).length, 3);
});

test("Y2 reserves a right gutter and gives only the representative Post series a distinct scale", () => {
  const y2Off = updateThemeValue(
    EMPTY,
    ["visualStyles", "lineChart", "*", "y2Axis", 0, "show"],
    false,
  );
  const onHtml = renderLine();
  const offHtml = renderLine(y2Off);
  assert.ok(onHtml.includes('data-secondary-series="Post"'));
  assert.ok(!offHtml.includes("data-secondary-series"));

  const onPaths = pathAttrs(onHtml).map((tag) => (tag.match(/\bd="([^"]*)"/) ?? [])[1]);
  const offPaths = pathAttrs(offHtml).map((tag) => (tag.match(/\bd="([^"]*)"/) ?? [])[1]);
  assert.equal(onPaths.length, 3);
  const yCoordinates = (path: string) =>
    [...path.matchAll(/[ML]\s+[\d.]+\s+([\d.]+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(yCoordinates(onPaths[0]), yCoordinates(offPaths[0]), "Phone must stay on the primary scale");
  assert.notDeepEqual(yCoordinates(onPaths[1]), yCoordinates(offPaths[1]), "Post must move to the secondary scale");
  assert.deepEqual(yCoordinates(onPaths[2]), yCoordinates(offPaths[2]), "Online must stay on the primary scale");

  assert.match(onHtml, /class="chart-plot" style="left:[^;]+;right:(?!0px)[^;]+;bottom:/);
  assert.match(offHtml, /class="chart-plot" style="left:[^;]+;right:0;bottom:/);
});

// ---------------------------------------------------------------------------
// Legends describe what is drawn
// ---------------------------------------------------------------------------

for (const [name, render] of [
  ["Clustered Bar", renderBar],
  ["Stacked Bar", renderStackedBar],
  ["Line", () => renderLine()],
] as const) {
  test(`${name} legend lists the real series`, () => {
    const html = render();
    for (const series of ["Online", "Phone", "Post"]) {
      assert.ok(html.includes(series), `${name} legend is missing ${series}`);
    }
    assert.ok(!html.includes("Approved"), `${name} still shows a retired synthetic series`);
    assert.ok(!html.includes("In review"), `${name} still shows a retired synthetic series`);
  });
}
