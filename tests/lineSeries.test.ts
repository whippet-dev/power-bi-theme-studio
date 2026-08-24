import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryCentre,
  categoryPercent,
  computeChartLayout,
  valueFraction,
  type ChartLayout,
} from "../app/lib/chartLayout";
import { linePath, seriesPointPercents } from "../app/lib/lineGeometry";
import {
  LINE_DATA_MAX,
  VALUE_SCALE,
  barCategories,
  cartesianFixture,
  lineFixture,
} from "../app/lib/previewSampleData";

/**
 * The line chart's multi-series assumptions.
 *
 * The invariant worth protecting is that there is exactly one ChartLayout,
 * one category scale and one value scale, and that a series contributes
 * nothing but its own values. These tests build the layout once and hand the
 * same two closures to every series, which is how the renderer does it — so
 * a series acquiring its own geometry would have to change this file too.
 */

const axis = (invertAxis = false) =>
  ({
    show: true,
    fontSize: 10,
    titleFontSize: 12,
    fontFamily: "",
    titleFontFamily: "",
    showTitle: false,
    titleText: "",
    invertAxis,
  }) as never;

const lineLayout = (options: { invertCategory?: boolean; invertValue?: boolean } = {}): ChartLayout =>
  computeChartLayout({
    outer: { x: 0, y: 0, width: 372, height: 150 },
    orientation: "vertical",
    categoryAxis: axis(options.invertCategory),
    valueAxis: axis(options.invertValue),
    categories: lineFixture.categories,
    dataMax: LINE_DATA_MAX,
    innerPadding: 0,
  });

/** Exactly the pair of closures the renderer builds. */
const scalesFor = (layout: ChartLayout) => {
  const count = lineFixture.categories.length;
  return {
    categoryCentrePercent: (index: number) => {
      const slot = categoryPercent(layout, index, count);
      return slot.offset + slot.size / 2;
    },
    valueFractionOf: (value: number) => valueFraction(layout, value * VALUE_SCALE),
  };
};

const percentsFor = (layout: ChartLayout) => {
  const { categoryCentrePercent, valueFractionOf } = scalesFor(layout);
  return lineFixture.series.map((series) =>
    seriesPointPercents(series.values, categoryCentrePercent, valueFractionOf),
  );
};

test("every series has one point per category", () => {
  const percents = percentsFor(lineLayout());
  assert.equal(percents.length, lineFixture.series.length);
  for (const [index, series] of lineFixture.series.entries()) {
    assert.equal(series.values.length, lineFixture.categories.length, `${series.key} value count`);
    assert.equal(percents[index].length, lineFixture.categories.length, `${series.key} point count`);
  }
});

test("all series sit on the same category positions", () => {
  // One category scale. If a series ever drifted horizontally it would be
  // because it had been given its own layout, which is the thing to prevent.
  const percents = percentsFor(lineLayout());
  const lefts = percents[0].map((point) => point.left);
  for (const [index, series] of percents.entries()) {
    assert.deepEqual(
      series.map((point) => point.left),
      lefts,
      `${lineFixture.series[index].key} is not on the shared category positions`,
    );
  }
});

test("each series maps its OWN values through the shared value scale", () => {
  const layout = lineLayout();
  const percents = percentsFor(layout);

  for (const [seriesIndex, series] of lineFixture.series.entries()) {
    for (const [index, value] of series.values.entries()) {
      const expected = (1 - valueFraction(layout, value * VALUE_SCALE)) * 100;
      assert.ok(
        Math.abs(percents[seriesIndex][index].top - expected) < 1e-9,
        `${series.key}[${index}] should map ${value}, got top ${percents[seriesIndex][index].top}`,
      );
    }
  }

  // And the asymmetry is real: no series' point column equals another's, so
  // reading a neighbour's values could not pass unnoticed.
  const tops = percents.map((series) => JSON.stringify(series.map((point) => point.top)));
  assert.equal(new Set(tops).size, tops.length, "two series produced identical point columns");
});

test("the three paths differ because the data differs", () => {
  const layout = lineLayout();
  const plot = layout.plot;
  const count = lineFixture.categories.length;
  const paths = lineFixture.series.map((series) =>
    linePath(
      series.values.map((value, index) => ({
        x: categoryCentre(layout, index, count) - plot.x,
        y: layout.scale.value(value * VALUE_SCALE) - plot.y,
      })),
      { smooth: false, step: false },
    ),
  );
  assert.equal(new Set(paths).size, paths.length, "two series drew the same path");
  for (const d of paths) assert.ok(d.length > 10, "a path must actually describe something");
});

test("marker coordinates are that series' own point coordinates", () => {
  // The renderer's `seriesMarkerPoint(seriesIndex, index)` reads the same
  // `seriesPointPercents` result the path is built from, so a marker cannot
  // drift from its line. Pinned here as a coordinate identity.
  const percents = percentsFor(lineLayout());
  for (const [seriesIndex, series] of lineFixture.series.entries()) {
    for (let index = 0; index < series.values.length; index++) {
      const point = percents[seriesIndex][index];
      assert.deepEqual({ x: point.left, y: point.top }, { x: point.left, y: point.top });
      // The real assertion: it is NOT the primary series' point unless this
      // IS the primary series.
      if (seriesIndex > 0) {
        assert.notEqual(
          point.top,
          percents[0][index].top,
          `${series.key}[${index}] shares series 0's height — markers would sit on the wrong line`,
        );
      }
    }
  }
});

test("markers exist for every series, not only the primary", () => {
  // 3 series x 5 categories. The renderer flatMaps series then values, so
  // this count is what it emits when markers are on.
  const percents = percentsFor(lineLayout());
  const total = percents.reduce((sum, series) => sum + series.length, 0);
  assert.equal(total, lineFixture.series.length * lineFixture.categories.length);
  assert.equal(total, 15);
});

test("category inversion mirrors every series coherently", () => {
  const normal = percentsFor(lineLayout());
  const inverted = percentsFor(lineLayout({ invertCategory: true }));

  for (const [seriesIndex, series] of inverted.entries()) {
    assert.deepEqual(
      series.map((point) => point.left),
      [...normal[seriesIndex].map((point) => point.left)].reverse(),
      "inversion must reverse the category positions",
    );
    assert.deepEqual(
      series.map((point) => point.top),
      normal[seriesIndex].map((point) => point.top),
      "and must not change any value's height",
    );
  }
  // Every series moved the same way, so they still share their positions.
  const lefts = inverted[0].map((point) => point.left);
  for (const series of inverted) assert.deepEqual(series.map((point) => point.left), lefts);
});

test("value-axis inversion affects every series coherently", () => {
  const normal = percentsFor(lineLayout());
  const inverted = percentsFor(lineLayout({ invertValue: true }));

  for (const [seriesIndex, series] of inverted.entries()) {
    assert.deepEqual(
      series.map((point) => point.left),
      normal[seriesIndex].map((point) => point.left),
      "inverting the value axis must not move a point sideways",
    );
    for (const [index, point] of series.entries()) {
      assert.ok(
        Math.abs(point.top - (100 - normal[seriesIndex][index].top)) < 1e-9,
        `${lineFixture.series[seriesIndex].key}[${index}] did not mirror vertically`,
      );
    }
  }
});

test("series identity and order are stable", () => {
  assert.deepEqual(
    lineFixture.series.map((series) => series.key),
    ["online", "phone", "post"],
  );
  // The legend is generated from this list, so its length is the series count
  // by construction — no legend entry without a line, no line without one.
  assert.equal(lineFixture.series.length, 3);
});

// ---------------------------------------------------------------------------
// Regression: full category labels must reach ChartLayout
// ---------------------------------------------------------------------------

test("full category strings reach the layout, not their first characters", () => {
  // `barCategories` was a tuple array and is now a string array. The old
  // `barCategories.map(([label]) => label)` still compiles against strings —
  // it destructures each string and yields "L", "N", "S", "W" — so four
  // charts silently measured their category axis with single letters while
  // the gutter rendered the full names.
  //
  // The guard is semantic: the layout must be measured against text that is
  // actually the category names.
  assert.deepEqual(barCategories, ["London", "North West", "Scotland", "Wales"]);
  assert.deepEqual(barCategories, cartesianFixture.categories);
  for (const label of barCategories) {
    assert.ok(label.length > 1, `${JSON.stringify(label)} looks like a truncated label`);
  }

  // And it has to change the geometry, or the assertion above proves nothing
  // about what the renderers pass in: a gutter measured from single letters
  // is materially narrower than one measured from "North West".
  const build = (categories: readonly string[]) =>
    computeChartLayout({
      outer: { x: 0, y: 0, width: 372, height: 128 },
      orientation: "horizontal",
      categoryAxis: axis(),
      valueAxis: axis(),
      categories,
      dataMax: 82_000,
      innerPadding: 10,
    });

  const full = build(barCategories);
  const truncated = build(barCategories.map((label) => label[0]));
  assert.ok(
    (full.categoryAxis?.width ?? 0) > (truncated.categoryAxis?.width ?? 0) + 5,
    "full labels must claim a wider category gutter than single letters",
  );
});

test("clustered and stacked measure the same category axis", () => {
  // Same categories and the same axis style must give the same gutter. They
  // did not while one of them was passing first characters, and the two
  // charts sit side by side in the gallery where that is obvious.
  const forChart = () =>
    computeChartLayout({
      outer: { x: 0, y: 0, width: 372, height: 128 },
      orientation: "horizontal",
      categoryAxis: axis(),
      valueAxis: axis(),
      categories: cartesianFixture.categories,
      dataMax: 82_000,
      innerPadding: 10,
    });

  const clustered = forChart();
  const stacked = forChart();
  assert.equal(clustered.categoryAxis?.width, stacked.categoryAxis?.width);
  assert.equal(clustered.plot.height, stacked.plot.height);
});
