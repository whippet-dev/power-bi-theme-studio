import assert from "node:assert/strict";
import test from "node:test";
import {
  CLUSTERED_DATA_MAX,
  STACKED_DATA_MAX,
  VALUE_SCALE,
  cartesianFixture,
  categoryTotals,
  categoryValues,
  clusteredMax,
  lineFixture,
  seriesColor,
  seriesPaletteIndex,
  stackedMax,
  type CartesianFixture,
} from "../app/lib/previewSampleData";
import { clusteredSeriesBands, stackSegments } from "../app/lib/seriesBands";

/**
 * Series geometry, and the fixture it is computed from.
 *
 * `ChartLayout` stops at the category slot; everything here is the layer
 * above it, which is why none of these tests build a layout. A clustered bar
 * chart and a clustered column chart call the same function with the same
 * number and differ only in which axis they apply it to, so proving the model
 * once proves it for both.
 */

const FIXTURES: ReadonlyArray<readonly [string, CartesianFixture]> = [
  ["cartesian", cartesianFixture],
  ["line", lineFixture],
];

// ---------------------------------------------------------------------------
// Fixture integrity — a bad fixture should fail here, not render crookedly
// ---------------------------------------------------------------------------

for (const [name, fixture] of FIXTURES) {
  test(`${name} fixture is well formed`, () => {
    assert.ok(fixture.categories.length > 0, "needs categories");
    assert.ok(fixture.series.length > 0, "needs series");

    const keys = fixture.series.map((series) => series.key);
    const labels = fixture.series.map((series) => series.label);
    assert.equal(new Set(keys).size, keys.length, `duplicate series key in ${JSON.stringify(keys)}`);
    assert.equal(new Set(labels).size, labels.length, `duplicate series label in ${JSON.stringify(labels)}`);

    for (const series of fixture.series) {
      assert.equal(
        series.values.length,
        fixture.categories.length,
        `${series.key} has ${series.values.length} values for ${fixture.categories.length} categories`,
      );
      for (const value of series.values) {
        assert.ok(Number.isFinite(value), `${series.key} has a non-finite value`);
      }
    }
  });
}

test("no two series share a value in the same category", () => {
  // Asymmetry on purpose: a renderer that pairs a series with the wrong
  // category, or reverses the series order, must produce different numbers
  // rather than an accidentally identical picture.
  for (const [name, fixture] of FIXTURES) {
    for (let index = 0; index < fixture.categories.length; index++) {
      const values = categoryValues(fixture, index);
      assert.equal(
        new Set(values).size,
        values.length,
        `${name} category ${index} has a tie: ${JSON.stringify(values)}`,
      );
    }
  }
});

test("derived totals and maxima match the fixture", () => {
  const totals = categoryTotals(cartesianFixture);
  assert.deepEqual(totals, [82, 66, 51, 38]);

  // Distinct by definition: clustered draws each series from the baseline,
  // stacked accumulates them. One shared maximum could not serve both.
  assert.equal(clusteredMax(cartesianFixture), 46);
  assert.equal(stackedMax(cartesianFixture), 82);
  assert.notEqual(CLUSTERED_DATA_MAX, STACKED_DATA_MAX);
  assert.equal(CLUSTERED_DATA_MAX, 46 * VALUE_SCALE);
  assert.equal(STACKED_DATA_MAX, 82 * VALUE_SCALE);

  for (const total of totals) {
    assert.ok(total <= stackedMax(cartesianFixture), "no total may exceed the stacked maximum");
  }
});

test("palette assignment is deterministic and stable across charts", () => {
  const palette = ["#111111", "#222222", "#333333", "#444444"];
  const assigned = cartesianFixture.series.map((_, index) => seriesColor(palette, index));
  assert.deepEqual(assigned, ["#111111", "#222222", "#333333"]);
  assert.deepEqual(
    lineFixture.series.map((_, index) => seriesColor(palette, index)),
    assigned,
    "the same series index must take the same swatch in every chart",
  );

  // Series 0 defers to the visual's own resolved colour when it has one, so
  // `dataPoint.fill` keeps meaning what it meant before there were series.
  assert.equal(seriesColor(palette, 0, "#ABCDEF"), "#ABCDEF");
  assert.equal(seriesColor(palette, 1, "#ABCDEF"), "#222222");
  assert.equal(seriesPaletteIndex(2), 2);
});

// ---------------------------------------------------------------------------
// Clustered bands
// ---------------------------------------------------------------------------

const SLOT = 90;

test("one series fills its slot and ignores the gap entirely", () => {
  // Power BI's converter is explicit: `if (D.length < 2) clusteredGapSize = 0`.
  // Thinning a lone bar by the "space between series" was the fiction this
  // replaces.
  for (const gapSize of [0, 10, 50, 75]) {
    const bands = clusteredSeriesBands({ extent: SLOT, seriesCount: 1, gapSize });
    assert.equal(bands.length, 1);
    assert.equal(bands[0].offset, 0, `gap ${gapSize}`);
    assert.equal(bands[0].size, SLOT, `gap ${gapSize}: a single series takes the whole slot`);
  }
});

for (const seriesCount of [2, 3]) {
  for (const gapSize of [0, 10, 50]) {
    test(`${seriesCount} series at gap ${gapSize}: inside the slot, in order, no overlap`, () => {
      const bands = clusteredSeriesBands({ extent: SLOT, seriesCount, gapSize });
      assert.equal(bands.length, seriesCount);

      for (const [index, band] of bands.entries()) {
        assert.ok(band.size > 0, `band ${index} collapsed`);
        assert.ok(band.offset >= -1e-9, `band ${index} starts before the slot`);
        assert.ok(band.offset + band.size <= SLOT + 1e-9, `band ${index} runs past the slot`);
      }

      for (let index = 1; index < seriesCount; index++) {
        assert.ok(
          bands[index].offset >= bands[index - 1].offset + bands[index - 1].size - 1e-9,
          `band ${index} overlaps band ${index - 1}`,
        );
        assert.ok(bands[index].offset > bands[index - 1].offset, "bands must ascend in series order");
      }

      // Every series gets the same thickness, and the run ends on the slot's
      // far edge — the cluster is centred without needing an align term.
      for (const band of bands) assert.ok(Math.abs(band.size - bands[0].size) < 1e-9);
      const end = bands[seriesCount - 1].offset + bands[seriesCount - 1].size;
      assert.ok(Math.abs(end - SLOT) < 1e-9, `cluster ends at ${end}, not ${SLOT}`);
      assert.ok(Math.abs(bands[0].offset) < 1e-9, "cluster starts at the slot origin");
    });
  }
}

test("the clustered gap changes the gap, not the slot", () => {
  const none = clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: 0 });
  const some = clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: 50 });

  // At gap 0 the bands abut exactly and tile the slot.
  assert.ok(Math.abs(none[0].size * 3 - SLOT) < 1e-9);
  assert.ok(Math.abs(none[1].offset - none[0].size) < 1e-9);

  // Raising it thins the bands and opens space between them, while the run
  // still spans exactly the same slot.
  assert.ok(some[0].size < none[0].size, "a larger gap must thin the band");
  const gapBetween = some[1].offset - (some[0].offset + some[0].size);
  assert.ok(gapBetween > 0, "a larger gap must open space");
  assert.ok(Math.abs(some[2].offset + some[2].size - SLOT) < 1e-9, "and must not change the slot");
});

test("the gap is clamped where Power BI clamps it", () => {
  // 75 without overlap, 100 with. Beyond that the band scale would invert.
  const at75 = clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: 75 });
  const beyond = clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: 300 });
  assert.deepEqual(beyond, at75);
  for (const band of beyond) assert.ok(band.size > 0, "clamping must leave a visible band");

  const negative = clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: -20 });
  assert.deepEqual(negative, clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: 0 }));
});

test("overlapping mode widens the band past its step, and still fills the slot", () => {
  const bands = clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: 50, overlaps: true });
  const step = bands[1].offset - bands[0].offset;
  assert.ok(bands[0].size > step, "overlap means the band is wider than the step");
  assert.ok(Math.abs(bands[2].offset + bands[2].size - SLOT) < 1e-9, "and the run still spans the slot");
});

test("a degenerate slot produces no bands rather than negative ones", () => {
  assert.deepEqual(clusteredSeriesBands({ extent: 0, seriesCount: 3, gapSize: 10 }), []);
  assert.deepEqual(clusteredSeriesBands({ extent: -5, seriesCount: 3, gapSize: 10 }), []);
  assert.deepEqual(clusteredSeriesBands({ extent: SLOT, seriesCount: 0, gapSize: 10 }), []);
});

test("bands are indexed by series, so inversion is the slot's business", () => {
  // Category inversion moves the whole group — ChartLayout already reverses
  // which slot an index lands in. The bands inside must NOT also reverse, or
  // the two would cancel and the series would silently swap.
  const bands = clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: 10 });
  assert.ok(bands[0].offset < bands[1].offset && bands[1].offset < bands[2].offset);
  assert.deepEqual(
    clusteredSeriesBands({ extent: SLOT, seriesCount: 3, gapSize: 10 }),
    bands,
    "the same inputs must always give the same bands",
  );
});

// ---------------------------------------------------------------------------
// Stacked segments
// ---------------------------------------------------------------------------

test("segments are cumulative, abut exactly, and end on the category total", () => {
  for (let index = 0; index < cartesianFixture.categories.length; index++) {
    const values = categoryValues(cartesianFixture, index);
    const segments = stackSegments(values);

    assert.equal(segments.length, values.length);
    assert.equal(segments[0].start, 0, "the first segment starts at the baseline");

    for (const [seriesIndex, segment] of segments.entries()) {
      assert.equal(segment.value, values[seriesIndex], "a segment must carry its own series' value");
      assert.equal(
        segment.end - segment.start,
        values[seriesIndex],
        "a segment's extent is its value, not a share of the total",
      );
      if (seriesIndex > 0) {
        assert.equal(
          segment.start,
          segments[seriesIndex - 1].end,
          `segment ${seriesIndex} must begin where ${seriesIndex - 1} ends`,
        );
      }
    }

    const total = categoryTotals(cartesianFixture)[index];
    assert.equal(segments[segments.length - 1].end, total, "the last segment must end on the total");
    assert.equal(
      values.reduce((sum, value) => sum + value, 0),
      total,
      "the painted stack and the total label must be the same number",
    );
    assert.ok(total * VALUE_SCALE <= STACKED_DATA_MAX, "no stack may exceed the axis maximum");
  }
});

test("two series stack as readily as three", () => {
  const segments = stackSegments([30, 12]);
  assert.deepEqual(segments, [
    { start: 0, end: 30, value: 30 },
    { start: 30, end: 42, value: 12 },
  ]);
});

test("a non-finite value contributes nothing rather than poisoning the stack", () => {
  const segments = stackSegments([10, Number.NaN, 5]);
  assert.equal(segments[2].end, 15);
  for (const segment of segments) {
    assert.ok(Number.isFinite(segment.start) && Number.isFinite(segment.end));
  }
});
