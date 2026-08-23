import assert from "node:assert/strict";
import test from "node:test";
import {
  axisRange,
  axisTickValues,
  computeChartLayout,
  estimateText,
  type AxisLayoutStyle,
  type CartesianOrientation,
  type ChartLayout,
  type ChartLayoutInput,
  type Rect,
  type TextMeasure,
} from "../app/lib/chartLayout";
import { axisTicks } from "../app/components/ChartParts";

/**
 * Tests for the layout engine. Several of these encode defects from
 * RENDERER_AUDIT.md: they pass here because the engine is correct, while
 * the application still shows the defect, because nothing consumes the
 * engine yet (RENDERER_IMPLEMENTATION_PLAN.md T6). T7/T8/T10 are what make
 * them visible in the app.
 */

const OUTER: Rect = { x: 0, y: 0, width: 400, height: 300 };

const axis = (over: Partial<AxisLayoutStyle> = {}): AxisLayoutStyle => ({
  show: true,
  fontSize: 10,
  fontFamily: "Segoe UI",
  showAxisTitle: false,
  titleText: "",
  titleFontSize: 9,
  titleFontFamily: "Segoe UI",
  ...over,
});

const CATEGORIES = ["London", "North West", "Scotland", "Wales"];
const DATA_MAX = 82_000;

/** A fixed-width measurer, so gutter arithmetic is exact rather than approximate. */
const fixed =
  (perChar: number, lineHeight: number): TextMeasure =>
  (text, fontSize) => ({ width: text.length * perChar, height: lineHeight * (fontSize / 10) });

const layout = (over: Partial<ChartLayoutInput> = {}): ChartLayout =>
  computeChartLayout({
    outer: OUTER,
    orientation: "vertical",
    categoryAxis: axis(),
    valueAxis: axis(),
    categories: CATEGORIES,
    dataMax: DATA_MAX,
    measureText: fixed(6, 12),
    ...over,
  });

const near = (a: number, b: number, tolerance = 1e-9): boolean => Math.abs(a - b) <= tolerance;
const finiteRect = (r: Rect): boolean =>
  [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width >= 0 && r.height >= 0;
const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// ---------------------------------------------------------------------------
// 1. Conservation
// ---------------------------------------------------------------------------

test("every band and the plot are finite, non-negative, and inside outer", () => {
  for (const orientation of ["vertical", "horizontal"] as CartesianOrientation[]) {
    const l = layout({
      orientation,
      legend: { show: true, position: "Bottom", fontSize: 10, fontFamily: "Segoe UI" },
      seriesLabels: ["Applications"],
      titleText: "Applications by region",
      subtitleText: "2026",
      categoryAxis: axis({ showAxisTitle: true, titleText: "Region" }),
      valueAxis: axis({ showAxisTitle: true, titleText: "Applications" }),
    });
    const bands = [l.title, l.subtitle, l.legend, l.categoryAxis, l.valueAxis, l.plot].filter(
      (r): r is Rect => r !== null,
    );
    for (const r of bands) {
      assert.ok(finiteRect(r), `${orientation}: rect not finite/non-negative ${JSON.stringify(r)}`);
      assert.ok(r.x >= l.outer.x - 1e-9 && r.y >= l.outer.y - 1e-9, `${orientation}: rect starts outside outer`);
      assert.ok(
        r.x + r.width <= l.outer.x + l.outer.width + 1e-9 && r.y + r.height <= l.outer.y + l.outer.height + 1e-9,
        `${orientation}: rect ends outside outer`,
      );
    }
  }
});

test("no two bands overlap", () => {
  const l = layout({
    legend: { show: true, position: "Left", fontSize: 10, fontFamily: "Segoe UI" },
    seriesLabels: ["Applications"],
    titleText: "Title",
    subtitleText: "Sub",
  });
  const bands = [l.title, l.subtitle, l.legend, l.categoryAxis, l.valueAxis, l.plot].filter(
    (r): r is Rect => r !== null,
  );
  for (let i = 0; i < bands.length; i++) {
    for (let j = i + 1; j < bands.length; j++) {
      assert.ok(!overlaps(bands[i], bands[j]), `bands ${i} and ${j} overlap`);
    }
  }
});

test("band extents plus plot extent equal outer extent on both axes, with no unexplained gap", () => {
  // Vertical: title/subtitle/categoryAxis stack vertically, valueAxis takes width.
  const v = layout({ titleText: "Title", subtitleText: "Sub" });
  const vTall = (v.title?.height ?? 0) + (v.subtitle?.height ?? 0) + (v.categoryAxis?.height ?? 0) + v.plot.height;
  assert.ok(near(vTall, OUTER.height), `vertical heights ${vTall} != ${OUTER.height}`);
  assert.ok(near((v.valueAxis?.width ?? 0) + v.plot.width, OUTER.width), "vertical widths do not conserve");

  // Horizontal is the transpose: categoryAxis takes width, valueAxis height.
  const h = layout({ orientation: "horizontal" });
  assert.ok(near((h.categoryAxis?.width ?? 0) + h.plot.width, OUTER.width), "horizontal widths do not conserve");
  assert.ok(near((h.valueAxis?.height ?? 0) + h.plot.height, OUTER.height), "horizontal heights do not conserve");
});

test("a legend consumes the correct edge and conserves with the plot", () => {
  const withLegend = layout({ legend: { show: true, position: "Left", fontSize: 10, fontFamily: "Segoe UI" }, seriesLabels: ["Applications"] });
  const without = layout({ legend: { show: false, position: "Left", fontSize: 10, fontFamily: "Segoe UI" }, seriesLabels: ["Applications"] });
  assert.ok(withLegend.legend !== null);
  assert.ok(
    near(withLegend.plot.width + withLegend.legend.width, without.plot.width),
    "a left legend must take its width from the plot",
  );
});

// ---------------------------------------------------------------------------
// 2. Hidden gutters — hidden means zero layout space
// ---------------------------------------------------------------------------

test("hiding an axis nulls its slot and returns exactly that space to the plot", () => {
  for (const orientation of ["vertical", "horizontal"] as CartesianOrientation[]) {
    const shown = layout({ orientation });
    const hidden = layout({ orientation, categoryAxis: axis({ show: false }) });

    assert.equal(shown.categoryAxis !== null, true, `${orientation}: shown axis should have a gutter`);
    assert.equal(hidden.categoryAxis, null, `${orientation}: hidden axis must be null, not a zero-size rect`);

    if (orientation === "vertical") {
      assert.ok(
        near(hidden.plot.height, shown.plot.height + (shown.categoryAxis?.height ?? 0)),
        "vertical: plot must grow by exactly the former gutter height",
      );
      assert.ok(near(hidden.plot.width, shown.plot.width), "vertical: the other axis must be unaffected");
    } else {
      assert.ok(
        near(hidden.plot.width, shown.plot.width + (shown.categoryAxis?.width ?? 0)),
        "horizontal: plot must grow by exactly the former gutter width",
      );
      assert.ok(near(hidden.plot.height, shown.plot.height), "horizontal: the other axis must be unaffected");
    }
  }
});

test("hiding the legend, title and subtitle each return their exact extent", () => {
  const all = layout({
    legend: { show: true, position: "Bottom", fontSize: 10, fontFamily: "Segoe UI" },
    seriesLabels: ["Applications"],
    titleText: "Title",
    subtitleText: "Sub",
  });
  const noLegend = layout({
    legend: { show: false, position: "Bottom", fontSize: 10, fontFamily: "Segoe UI" },
    seriesLabels: ["Applications"],
    titleText: "Title",
    subtitleText: "Sub",
  });
  const noTitle = layout({
    legend: { show: true, position: "Bottom", fontSize: 10, fontFamily: "Segoe UI" },
    seriesLabels: ["Applications"],
    subtitleText: "Sub",
  });
  assert.equal(noLegend.legend, null);
  assert.equal(noTitle.title, null);
  assert.ok(near(noLegend.plot.height, all.plot.height + (all.legend?.height ?? 0)));
  assert.ok(near(noTitle.plot.height, all.plot.height + (all.title?.height ?? 0)));
});

test("AUDIT §2.2: hiding the category axis leaves the data in the axis's coordinate system", () => {
  // The defect: the bar track moved into the 68px label column while the
  // gridlines stayed put, so bars and axis stopped overlapping entirely.
  // Against the engine, gridline positions are scale.value(tick) by
  // definition, so they cannot drift from the plot in either state.
  for (const show of [true, false]) {
    const l = layout({ orientation: "horizontal", categoryAxis: axis({ show }) });
    const first = l.scale.value(l.scale.ticks[0]);
    const last = l.scale.value(l.scale.ticks[l.scale.ticks.length - 1]);
    assert.ok(near(first, l.plot.x), `show=${show}: first gridline must sit on the plot's left edge`);
    assert.ok(near(last, l.plot.x + l.plot.width), `show=${show}: last gridline must sit on the right edge`);
    // And a data mark spanning the full range spans exactly the plot.
    const { start, end } = axisRange(axis(), DATA_MAX);
    assert.ok(near(l.scale.value(end) - l.scale.value(start), l.plot.width), `show=${show}: mark span != plot width`);
  }
});

// ---------------------------------------------------------------------------
// 3/4. Gutter sizing is text-driven
// ---------------------------------------------------------------------------

test("the category gutter responds to font size, longest label and the supplied measurer", () => {
  const base = layout({ orientation: "horizontal" });
  const bigger = layout({ orientation: "horizontal", categoryAxis: axis({ fontSize: 20 }) });
  const longer = layout({
    orientation: "horizontal",
    categories: ["London", "An Extremely Long Category Name Indeed"],
  });
  const wider = layout({ orientation: "horizontal", measureText: fixed(12, 12) });

  assert.ok(longer.categoryAxis!.width > base.categoryAxis!.width, "a longer label must widen the gutter");
  assert.ok(wider.categoryAxis!.width > base.categoryAxis!.width, "a wider measurer must widen the gutter");
  // A horizontal category gutter is label-WIDTH driven and the fixed
  // measurer's width ignores font size, so the font drives the gutter only
  // where height is what matters — the vertical orientation.
  assert.ok(near(bigger.categoryAxis!.width, base.categoryAxis!.width), "fixed-width measurer: width must not move");
  const tallerV = layout({ categoryAxis: axis({ fontSize: 20 }) });
  const baseV = layout();
  assert.ok(tallerV.categoryAxis!.height > baseV.categoryAxis!.height, "a bigger font must deepen the gutter");
});

test("the category gutter is not a literal: it equals measured text plus the declared gap", () => {
  // Directly replaces BAR_VALUE_AXIS_INSET's hand-copied `68 + 8`.
  const perChar = 6;
  const gap = 4;
  const l = layout({ orientation: "horizontal", measureText: fixed(perChar, 12), labelGap: gap });
  const longest = Math.max(...CATEGORIES.map((c) => c.length));
  assert.ok(near(l.categoryAxis!.width, longest * perChar + gap), "gutter must be measured, not assumed");
});

test("AUDIT §2.6: a shown value axis reserves real positive width, and hiding it returns it", () => {
  // The defect: .chart-ticks--vertical collapsed to width 0 and the labels
  // overlaid whatever was to their left, so the plot never knew the axis
  // existed. Here the gutter has real extent and the plot pays for it.
  const shown = layout();
  const hidden = layout({ valueAxis: axis({ show: false }) });
  assert.ok(shown.valueAxis !== null && shown.valueAxis.width > 0, "value-axis gutter must have positive width");
  assert.equal(hidden.valueAxis, null);
  assert.ok(
    near(hidden.plot.width, shown.plot.width + shown.valueAxis!.width),
    "plot must reclaim exactly the value-axis gutter",
  );
});

test("wider formatted tick labels produce a wider value-axis gutter", () => {
  const terse = layout({ formatTick: () => "0" });
  const verbose = layout({ formatTick: (v) => `${v.toLocaleString("en-GB")} applications` });
  assert.ok(verbose.valueAxis!.width > terse.valueAxis!.width, "the gutter must follow the label that is drawn");
});

test("an axis title adds to its own gutter and nothing else", () => {
  const plain = layout();
  const titled = layout({ valueAxis: axis({ showAxisTitle: true, titleText: "Applications" }) });
  assert.ok(titled.valueAxis!.width > plain.valueAxis!.width, "a shown axis title must widen its gutter");
  assert.ok(near(titled.categoryAxis!.height, plain.categoryAxis!.height), "and must not touch the other axis");
});

// ---------------------------------------------------------------------------
// 5/6/7. Value range, pinned range, inversion
// ---------------------------------------------------------------------------

test("an unpinned axis spans 0..dataMax", () => {
  const r = axisRange(axis(), DATA_MAX);
  assert.deepEqual(r, { start: 0, end: DATA_MAX });
  const l = layout();
  assert.ok(near(l.scale.value(0), l.plot.y + l.plot.height), "0 sits on the baseline");
  assert.ok(near(l.scale.value(DATA_MAX), l.plot.y), "dataMax sits on the top edge");
});

test("AUDIT finding 4: a pinned start/end drives geometry, not just the labels", () => {
  // The defect: axisTicks honoured start/end while barPercent scaled
  // against the sample maximum, so pinning 0..100K still drew the 82K bar
  // at full length. Here 82K must land at 82% of the plot.
  const pinned = axis({ start: "0", end: "100000" });
  const l = layout({ orientation: "horizontal", valueAxis: pinned });
  assert.ok(near(l.scale.value(0), l.plot.x), "start lands on the left edge");
  assert.ok(near(l.scale.value(100_000), l.plot.x + l.plot.width), "end lands on the right edge");
  const at82k = l.scale.value(82_000);
  assert.ok(near(at82k, l.plot.x + 0.82 * l.plot.width), "82K must land at 82% of the plot");
  assert.ok(at82k < l.plot.x + l.plot.width - 1e-6, "82K must NOT reach the end merely because it is the sample max");
});

test("a pinned end below start is ignored, matching the existing tick fallback", () => {
  assert.deepEqual(axisRange(axis({ start: "50", end: "10" }), 90), { start: 50, end: 90 });
});

test("invertAxis inverts the value mapping itself, not only tick order", () => {
  for (const orientation of ["vertical", "horizontal"] as CartesianOrientation[]) {
    const normal = layout({ orientation, valueAxis: axis({ start: "0", end: "100" }) });
    const flipped = layout({ orientation, valueAxis: axis({ start: "0", end: "100", invertAxis: true }) });

    const originEdge = orientation === "vertical" ? normal.plot.y + normal.plot.height : normal.plot.x;
    const farEdge = orientation === "vertical" ? normal.plot.y : normal.plot.x + normal.plot.width;

    assert.ok(near(normal.scale.value(0), originEdge), `${orientation}: normal start on origin edge`);
    assert.ok(near(normal.scale.value(100), farEdge), `${orientation}: normal end on far edge`);
    // Inverted: the two swap. This is the geometry change the renderer
    // currently does not make — it reverses tick text only.
    assert.ok(near(flipped.scale.value(0), farEdge), `${orientation}: inverted start must move to the far edge`);
    assert.ok(near(flipped.scale.value(100), originEdge), `${orientation}: inverted end must move to the origin edge`);
  }
});

// ---------------------------------------------------------------------------
// 8. Tick/scale agreement — there is no second gridline scale
// ---------------------------------------------------------------------------

test("every tick maps inside the plot, evenly spaced in index order, inverted or not", () => {
  for (const orientation of ["vertical", "horizontal"] as CartesianOrientation[]) {
    for (const invertAxis of [false, true]) {
      const l = layout({ orientation, valueAxis: axis({ invertAxis }) });
      const positions = l.scale.ticks.map(l.scale.value);
      const lo = orientation === "vertical" ? l.plot.y : l.plot.x;
      const hi = orientation === "vertical" ? l.plot.y + l.plot.height : l.plot.x + l.plot.width;
      for (const p of positions) {
        assert.ok(p >= lo - 1e-9 && p <= hi + 1e-9, `${orientation} invert=${invertAxis}: tick outside plot`);
      }
      // Index order must be monotonic and evenly spaced: ticks[i] belongs
      // at the i-th gridline, so a renderer can draw them by index.
      const step = positions[1] - positions[0];
      for (let i = 1; i < positions.length; i++) {
        assert.ok(
          near(positions[i] - positions[i - 1], step, 1e-6),
          `${orientation} invert=${invertAxis}: ticks not evenly spaced`,
        );
      }
      assert.ok(near(Math.abs(step) * (positions.length - 1), hi - lo, 1e-6), "ticks must span the whole plot");
    }
  }
});

test("the engine's ticks match ChartParts.axisTicks exactly, so the two models cannot drift", () => {
  const cases: Array<Partial<AxisLayoutStyle>> = [
    {},
    { start: "20", end: "60" },
    { start: "", end: "" },
    { start: "50", end: "10" },
    { invertAxis: true },
    { start: "0", end: "100000", invertAxis: true },
  ];
  for (const over of cases) {
    for (const count of [2, 4, 5]) {
      const a = axis(over);
      const mine = axisTickValues(a, DATA_MAX, count);
      // axisTicks takes the fuller AxisStyle; the layout subset satisfies
      // the fields it actually reads.
      const theirs = axisTicks(a as unknown as Parameters<typeof axisTicks>[0], DATA_MAX, count);
      assert.deepEqual(mine, theirs, `tick mismatch for ${JSON.stringify(over)} count=${count}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 9. Zero baseline
// ---------------------------------------------------------------------------

test("AUDIT §2.4: scale.value(0) is exactly the plot baseline, in both axis states", () => {
  // The defect: the column baseline sat 18px above the zero gridline
  // whenever the category axis was shown, because the label strip ate into
  // a fixed-height plot the gridlines did not know about.
  for (const show of [true, false]) {
    const l = layout({ categoryAxis: axis({ show }) });
    assert.ok(
      near(l.scale.value(0), l.plot.y + l.plot.height),
      `show=${show}: zero must sit on the plot's bottom edge`,
    );
    // And the zero gridline is that same coordinate, by construction.
    assert.ok(near(l.scale.value(l.scale.ticks[0]), l.plot.y + l.plot.height), `show=${show}: zero tick off baseline`);
  }
});

// ---------------------------------------------------------------------------
// 10. Category slots
// ---------------------------------------------------------------------------

test("category slots stay inside the plot, are monotonic, and honour inner padding", () => {
  for (const orientation of ["vertical", "horizontal"] as CartesianOrientation[]) {
    for (const innerPadding of [0, 20, 90]) {
      const l = layout({ orientation, innerPadding });
      const origin = orientation === "vertical" ? l.plot.x : l.plot.y;
      const extent = orientation === "vertical" ? l.plot.width : l.plot.height;
      let previous = -Infinity;
      for (let i = 0; i < CATEGORIES.length; i++) {
        const slot = l.scale.category(i, CATEGORIES.length);
        assert.ok(slot.size >= 0, "slot size must be non-negative");
        assert.ok(slot.start >= origin - 1e-9, `${orientation} pad=${innerPadding}: slot ${i} starts before the plot`);
        assert.ok(
          slot.start + slot.size <= origin + extent + 1e-9,
          `${orientation} pad=${innerPadding}: slot ${i} ends past the plot`,
        );
        assert.ok(slot.start > previous, "slots must be monotonic");
        previous = slot.start;
      }
      // Padding shrinks the mark but not the slot pitch.
      const zero = layout({ orientation, innerPadding: 0 }).scale.category(0, 4);
      const padded = l.scale.category(0, 4);
      assert.ok(padded.size <= zero.size + 1e-9, "more padding cannot widen the mark");
    }
  }
});

test("a zero category count is handled without producing NaN", () => {
  const slot = layout().scale.category(0, 0);
  assert.ok(Number.isFinite(slot.start) && slot.size === 0);
});

// ---------------------------------------------------------------------------
// 11. Orientation symmetry
// ---------------------------------------------------------------------------

test("horizontal and vertical layouts are exact transposes, so bar and column cannot drift", () => {
  // Square outer, and category labels measuring the same as tick labels, so
  // the two orientations are genuinely mirror images. Anything that made
  // bar and column diverge structurally would break this.
  const square: Rect = { x: 0, y: 0, width: 300, height: 300 };
  const shared = {
    outer: square,
    categories: ["AAAA"],
    formatTick: () => "AAAA",
    dataMax: DATA_MAX,
    measureText: fixed(6, 12),
    categoryAxis: axis(),
    valueAxis: axis(),
  };
  const v = computeChartLayout({ ...shared, orientation: "vertical" });
  const h = computeChartLayout({ ...shared, orientation: "horizontal" });

  // The gutter each orientation puts on the left is the same size, and so
  // is the one each puts along the bottom.
  assert.ok(near(v.valueAxis!.width, h.categoryAxis!.width), "left gutters must transpose");
  assert.ok(near(v.categoryAxis!.height, h.valueAxis!.height), "bottom gutters must transpose");
  // Which makes the plot rectangle itself identical between them.
  assert.deepEqual(v.plot, h.plot, "a true transpose must leave the same plot rect");

  // Each value scale spans its own plot fully, in the transposed direction.
  assert.ok(near(v.scale.value(0) - v.scale.value(DATA_MAX), v.plot.height), "vertical value scale must span the plot");
  assert.ok(near(h.scale.value(DATA_MAX) - h.scale.value(0), h.plot.width), "horizontal value scale must span the plot");
  // And each category scale fills its own plot in the other direction.
  const vLast = v.scale.category(3, 4);
  const hLast = h.scale.category(3, 4);
  assert.ok(near(vLast.start + vLast.size, v.plot.x + v.plot.width), "vertical categories must fill the plot width");
  assert.ok(near(hLast.start + hLast.size, h.plot.y + h.plot.height), "horizontal categories must fill the plot height");
});

test("swapping orientation with identical inputs swaps which dimension each gutter takes", () => {
  const v = layout();
  const h = layout({ orientation: "horizontal" });
  // Vertical: value gutter takes width, category gutter takes height.
  assert.ok(v.valueAxis!.width > 0 && near(v.valueAxis!.height, v.plot.height + (v.categoryAxis?.height ?? 0)));
  assert.ok(v.categoryAxis!.height > 0);
  // Horizontal: exactly the other way round.
  assert.ok(h.categoryAxis!.width > 0);
  assert.ok(h.valueAxis!.height > 0);
});

// ---------------------------------------------------------------------------
// 12. Legend placement
// ---------------------------------------------------------------------------

test("each legend position consumes the correct edge of outer", () => {
  const base = { seriesLabels: ["Applications", "In review"] };
  const cases: Array<[string, "top" | "bottom" | "left" | "right"]> = [
    ["Top", "top"],
    ["TopCenter", "top"],
    ["Bottom", "bottom"],
    ["BottomCenter", "bottom"],
    ["Left", "left"],
    ["LeftCenter", "left"],
    ["Right", "right"],
    ["RightCenter", "right"],
  ];
  for (const [position, edge] of cases) {
    const l = layout({ ...base, legend: { show: true, position, fontSize: 10, fontFamily: "Segoe UI" } });
    const r = l.legend!;
    switch (edge) {
      case "top":
        assert.ok(near(r.y, OUTER.y), `${position} must sit at the top`);
        assert.ok(r.y + r.height <= l.plot.y + 1e-9, `${position} must be above the plot`);
        break;
      case "bottom":
        assert.ok(near(r.y + r.height, OUTER.y + OUTER.height), `${position} must sit at the bottom`);
        assert.ok(r.y >= l.plot.y + l.plot.height - 1e-9, `${position} must be below the plot`);
        break;
      case "left":
        assert.ok(near(r.x, OUTER.x), `${position} must sit at the left`);
        assert.ok(r.x + r.width <= l.plot.x + 1e-9, `${position} must be left of the plot`);
        break;
      case "right":
        assert.ok(near(r.x + r.width, OUTER.x + OUTER.width), `${position} must sit at the right`);
        assert.ok(r.x >= l.plot.x + l.plot.width - 1e-9, `${position} must be right of the plot`);
        break;
    }
  }
});

test("the legend band follows the LEGEND's typography, not the value axis's", () => {
  // T6 sized the band with the value axis's font, which is the wrong text:
  // a theme sets legend and axis fonts independently. Corrected in T7,
  // before the first consumer relied on it. A per-font measurer makes the
  // mistake detectable — the fixed measurer used elsewhere would hide it.
  const perFont: TextMeasure = (text, fontSize) => ({ width: text.length * fontSize, height: fontSize });
  const base = {
    seriesLabels: ["Applications"],
    measureText: perFont,
    legend: { show: true, position: "Right", fontSize: 10, fontFamily: "Segoe UI" },
  };
  const bigLegend = layout({ ...base, legend: { ...base.legend, fontSize: 30 } });
  const bigAxis = layout({ ...base, valueAxis: axis({ fontSize: 30 }) });
  const plain = layout(base);

  assert.ok(bigLegend.legend!.width > plain.legend!.width, "a larger legend font must widen the band");
  assert.ok(near(bigAxis.legend!.width, plain.legend!.width), "a larger AXIS font must not touch the legend band");
});

test("a shown legend title counts as an entry in the band's size", () => {
  const perFont: TextMeasure = (text, fontSize) => ({ width: text.length * fontSize, height: fontSize });
  const base = {
    seriesLabels: ["A"],
    measureText: perFont,
    legend: { show: true, position: "Right", fontSize: 10, fontFamily: "Segoe UI" },
  };
  const untitled = layout(base);
  const titled = layout({ ...base, legend: { ...base.legend, showTitle: true, titleText: "A much longer title" } });
  assert.ok(titled.legend!.width > untitled.legend!.width, "a shown title must be able to widen the band");
});

test("a side legend widens with its longest series name", () => {
  const short = layout({ legend: { show: true, position: "Right", fontSize: 10, fontFamily: "Segoe UI" }, seriesLabels: ["A"] });
  const long = layout({ legend: { show: true, position: "Right", fontSize: 10, fontFamily: "Segoe UI" }, seriesLabels: ["A very long series name"] });
  assert.ok(long.legend!.width > short.legend!.width);
});

// ---------------------------------------------------------------------------
// 13. Determinism and re-entrancy
// ---------------------------------------------------------------------------

test("the same input always produces the same output", () => {
  const input: ChartLayoutInput = {
    outer: OUTER,
    orientation: "horizontal",
    categoryAxis: axis({ showAxisTitle: true, titleText: "Region" }),
    valueAxis: axis({ start: "0", end: "90000" }),
    legend: { show: true, position: "Bottom", fontSize: 10, fontFamily: "Segoe UI" },
    seriesLabels: ["Applications"],
    categories: CATEGORIES,
    dataMax: DATA_MAX,
    innerPadding: 20,
    measureText: fixed(6, 12),
  };
  const a = computeChartLayout(input);
  const b = computeChartLayout(input);
  assert.deepEqual({ ...a, scale: undefined }, { ...b, scale: undefined });
  for (const v of [0, 1234, 82_000, 90_000]) assert.equal(a.scale.value(v), b.scale.value(v));
  assert.deepEqual(a.scale.ticks, b.scale.ticks);
});

test("computing another visual in between cannot affect an earlier or later result", () => {
  const first = layout();
  const firstZero = first.scale.value(0);
  // Interleave several unrelated layouts, including different orientations,
  // ranges and measurers — the engine holds no module state.
  computeChartLayout({
    outer: { x: 17, y: 23, width: 999, height: 111 },
    orientation: "horizontal",
    categoryAxis: axis({ fontSize: 40 }),
    valueAxis: axis({ start: "5", end: "9" , invertAxis: true }),
    categories: ["x"],
    dataMax: 7,
    innerPadding: 90,
    measureText: fixed(30, 40),
  });
  const again = layout();
  assert.deepEqual({ ...first, scale: undefined }, { ...again, scale: undefined });
  assert.equal(again.scale.value(0), firstZero);
});

test("the default estimator is pure and monotonic in text length and font size", () => {
  assert.deepEqual(estimateText("abc", 10, "Segoe UI"), estimateText("abc", 10, "Segoe UI"));
  assert.ok(estimateText("abcdef", 10, "x").width > estimateText("abc", 10, "x").width);
  assert.ok(estimateText("abc", 20, "x").height > estimateText("abc", 10, "x").height);
});

test("a non-zero outer origin offsets every band and the scales with it", () => {
  const offset = layout({ outer: { x: 50, y: 30, width: 400, height: 300 } });
  const origin = layout();
  assert.ok(near(offset.plot.x, origin.plot.x + 50), "plot must follow outer.x");
  assert.ok(near(offset.plot.y, origin.plot.y + 30), "plot must follow outer.y");
  assert.ok(near(offset.scale.value(0), origin.scale.value(0) + 30), "the scale must follow too");
});

test("the layout reports the orientation it was computed for", () => {
  // Added during T7: a consumer converting a coordinate must know which
  // axis the value scale runs along, and re-deriving that from the gutter
  // shapes was a workaround for a missing field.
  assert.equal(layout({ orientation: "vertical" }).orientation, "vertical");
  assert.equal(layout({ orientation: "horizontal" }).orientation, "horizontal");
});

test("the plot starts after the category gutter and ends before the value gutter", () => {
  // [T8] Written after a wrong assumption cost a bug. Bands are subtracted
  // from a shrinking remainder in a fixed order, so whichever gutter is
  // taken FIRST also claims the corner where the two meet: for a vertical
  // chart the value gutter runs the full height, for a horizontal one the
  // value gutter runs the full width. Renderers trim it back with their
  // `offset` prop so the corner stays empty, which is what a real chart
  // looks like.
  //
  // The invariant that actually holds either way is about the PLOT's edges,
  // and it is the one CategoryAxisGutter's horizontal branch violated by
  // offsetting with `top` instead of `bottom`.
  for (const orientation of ["vertical", "horizontal"] as CartesianOrientation[]) {
    const l = layout({ orientation });
    const cat = l.categoryAxis!;
    const val = l.valueAxis!;
    if (orientation === "vertical") {
      // Value axis down the left, category axis along the bottom.
      assert.ok(near(l.plot.x, val.x + val.width), "vertical: plot starts after the value gutter");
      assert.ok(near(l.plot.y + l.plot.height, cat.y), "vertical: plot ends where the category gutter begins");
    } else {
      // The transpose: category axis down the left, value axis along the bottom.
      assert.ok(near(l.plot.x, cat.x + cat.width), "horizontal: plot starts after the category gutter");
      assert.ok(near(l.plot.y + l.plot.height, val.y), "horizontal: plot ends where the value gutter begins");
    }
  }
});
