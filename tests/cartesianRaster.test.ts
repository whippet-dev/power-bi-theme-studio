import assert from "node:assert/strict";
import test from "node:test";
import { computeChartLayout, type ChartLayout } from "../app/lib/chartLayout";

/**
 * Why there is no rounding in the mark path.
 *
 * Equal-valued cartesian marks can paint one device pixel apart. Task 8
 * measured where that comes from, and it is not here: `ChartLayout` divides
 * the plot into exactly equal slots that tile it without gap or overlap, and
 * the browser gives every mark an identical CSS height (spread 0.0000,
 * measured at presentation scales 1.0, 1.25, 1.5 and 2.0). The difference
 * appears only when Blink pixel-snaps each mark's background box at paint
 * time: `round(bottom) - round(top)` per box, independently. A slot height
 * that is not a whole number puts consecutive marks on different sub-pixel
 * phases, so identical fractional heights quantise to integers differing
 * by one.
 *
 * Power BI's code contains no such step. Its cartesian visuals paint marks
 * as SVG `<rect>` with unrounded `x/y/width/height`, and that path carries
 * no `shape-rendering` override — read from the shipped bundle, so the
 * absence of rounding is certain. That SVG therefore avoids this mechanism
 * follows from how the two paths paint, and is strongly supported rather
 * than measured: no painted pixel of either product has been read.
 *
 * Rounding here would add a step Power BI does not have. It also would not
 * simply deliver equal thickness: as the scoped phase test below shows,
 * snapping shared boundaries still leaves extents differing by one, because
 * a fractional slot has to put its residual pixel somewhere. A policy that
 * forced equal integer marks and pushed the residual into the gaps is
 * possible, but it would change the geometry policy and match neither the
 * current design nor Power BI's.
 *
 * So these tests pin the evidence rather than a policy. If someone later adds
 * rounding to the mark path, the conservation and padding assertions here are
 * what should stop it going in unnoticed.
 */

const PLOT_HERO = 129.3047; // Bar plot height, hero, measured
const PLOT_THUMB = 86.2031; // Bar plot height, thumbnail, measured

const axis = (invertAxis = false) =>
  ({
    show: false,
    fontSize: 10,
    titleFontSize: 12,
    fontFamily: "",
    titleFontFamily: "",
    showTitle: false,
    titleText: "",
    invertAxis,
  }) as never;

const layoutFor = (plotHeight: number, count: number, innerPadding: number, invert = false): ChartLayout =>
  computeChartLayout({
    outer: { x: 0, y: 0, width: 372, height: plotHeight },
    orientation: "horizontal",
    categoryAxis: axis(invert),
    valueAxis: axis(),
    categories: Array.from({ length: count }, (_, i) => `C${i}`),
    dataMax: 100,
    innerPadding,
  });

const slotsFor = (plotHeight: number, count: number, innerPadding: number, invert = false) => {
  const layout = layoutFor(plotHeight, count, innerPadding, invert);
  return Array.from({ length: count }, (_, i) => layout.scale.category(i, count));
};

/** Awkward on purpose: a whole number, and the two heights actually in use. */
const PLOTS = [83, PLOT_THUMB, PLOT_HERO];
const COUNTS = [4, 5, 6, 7];
const PADDINGS = [0, 10, 50];

test("equal categories get exactly equal marks", () => {
  // The premise of the whole investigation. If this ever fails, the uneven
  // bars are a geometry bug after all and the raster explanation is wrong.
  for (const plot of PLOTS) {
    for (const count of COUNTS) {
      for (const padding of PADDINGS) {
        const sizes = slotsFor(plot, count, padding).map((s) => s.size);
        for (const size of sizes) {
          assert.equal(
            size,
            sizes[0],
            `plot ${plot} / ${count} categories / padding ${padding}: ${JSON.stringify(sizes)}`,
          );
        }
      }
    }
  }
});

test("slots tile the plot with no gap, no overlap and no drift", () => {
  // Conservation. Any future snapping model has to keep this true, which is
  // exactly what independently rounding each top and height would break.
  for (const plot of PLOTS) {
    for (const count of COUNTS) {
      const slots = slotsFor(plot, count, 0);

      assert.equal(slots[0].start, 0, `plot ${plot} / ${count}: first slot must start at the plot origin`);

      for (let i = 1; i < count; i++) {
        const previousEnd = slots[i - 1].start + slots[i - 1].size;
        // Edges meet to float precision, not bit-for-bit: a start is
        // `origin + i * slot` rather than a running total. That is the
        // better of the two, and the reason the run below ends on the plot
        // boundary exactly instead of accumulating a rounding error.
        assert.ok(
          Math.abs(slots[i].start - previousEnd) < 1e-9,
          `plot ${plot} / ${count}: slot ${i} starts at ${slots[i].start}, but slot ` +
            `${i - 1} ends at ${previousEnd} — a gap of ${slots[i].start - previousEnd}`,
        );
      }

      const end = slots[count - 1].start + slots[count - 1].size;
      assert.ok(
        Math.abs(end - plot) < 1e-9,
        `plot ${plot} / ${count}: slots end at ${end}, drifting ${end - plot} from the plot`,
      );
    }
  }
});

test("innerPadding thins the mark and keeps it centred in its slot", () => {
  // The raster question must not be "solved" by flattening these into one
  // painted thickness, so the logical distinction is pinned here.
  for (const plot of PLOTS) {
    for (const count of COUNTS) {
      const slot = plot / count;
      const sizes = PADDINGS.map((padding) => slotsFor(plot, count, padding)[0].size);

      assert.ok(
        Math.abs(sizes[0] - slot) < 1e-9,
        `plot ${plot} / ${count}: padding 0 must leave the mark filling its slot`,
      );
      assert.ok(
        sizes[0] > sizes[1] && sizes[1] > sizes[2],
        `plot ${plot} / ${count}: mark must thin monotonically with padding, got ${JSON.stringify(sizes)}`,
      );

      // Centred: the space taken off is shared equally either side, so every
      // slot still starts inside the plot and the run still ends at the edge.
      for (const padding of PADDINGS) {
        const slots = slotsFor(plot, count, padding);
        const lead = slots[0].start;
        const trail = plot - (slots[count - 1].start + slots[count - 1].size);
        assert.ok(
          Math.abs(lead - trail) < 1e-9,
          `plot ${plot} / ${count} / padding ${padding}: mark not centred, ${lead} vs ${trail}`,
        );
      }
    }
  }
});

test("inverting the category axis reorders slots without resizing them", () => {
  // Snapping must never change what the data means. Inversion is the case
  // where an index-based rounding scheme would quietly move a mark.
  for (const plot of PLOTS) {
    for (const count of COUNTS) {
      for (const padding of PADDINGS) {
        const normal = slotsFor(plot, count, padding);
        const inverted = slotsFor(plot, count, padding, true);

        assert.deepEqual(
          inverted.map((s) => s.size),
          normal.map((s) => s.size),
          `plot ${plot} / ${count} / padding ${padding}: inversion changed a mark's size`,
        );
        assert.deepEqual(
          inverted.map((s) => s.start),
          [...normal.map((s) => s.start)].reverse(),
          `plot ${plot} / ${count} / padding ${padding}: inversion must reverse the slot order`,
        );
      }
    }
  }
});

/**
 * Blink's box-decoration snapping, as `PixelSnappedIntRect` does it: each box
 * independently, its painted extent being the difference of its rounded
 * edges. Modelled rather than observed — this environment cannot read painted
 * pixels — but it is the arithmetic that explains every measurement taken.
 */
const snappedExtent = (start: number, size: number) => Math.round(start + size) - Math.round(start);

test("the two measured zero-padding cases have no uniformly snapped phase", () => {
  // Scope is in the name on purpose. This covers the two measured plot
  // heights, at four categories with no inner padding, and claims nothing
  // wider: the phase sweep in audit 17.6 lists other configurations that DO
  // have uniformly snapped phases. What it documents is why shared-boundary
  // snapping is not the easy win it looks like for the cases in front of us
  // -- these marks sit on different sub-pixel phases by construction, so
  // there is no plot offset at which all four paint the same integer.
  // 64 phases because Blink lays out in 1/64px LayoutUnits.
  for (const plot of [PLOT_THUMB, PLOT_HERO]) {
    const slots = slotsFor(plot, 4, 0);
    assert.ok(!Number.isInteger(slots[0].size), `plot ${plot}: this case needs a fractional slot`);

    let evenPhases = 0;
    for (let k = 0; k < 64; k++) {
      const phase = k / 64;
      const painted = slots.map((s) => snappedExtent(phase + s.start, s.size));
      const spread = Math.max(...painted) - Math.min(...painted);
      assert.ok(spread <= 1, `plot ${plot}, phase ${phase}: spread ${spread} exceeds one pixel`);
      if (spread === 0) evenPhases++;
    }

    assert.equal(
      evenPhases,
      0,
      `plot ${plot}: ${evenPhases} of 64 phases paint evenly. This case is ` +
        "cited in audit 17.10; if it no longer holds, re-derive that argument " +
        "before adding any rounding",
    );
  }
});

test("an integer slot snaps evenly at every phase", () => {
  // The complement, and the proof that the test above is measuring phase
  // rather than asserting something vacuous: give the same code a whole-number
  // slot and the unevenness disappears entirely.
  const slots = slotsFor(80, 4, 0);
  assert.equal(slots[0].size, 20);

  for (let k = 0; k < 64; k++) {
    const phase = k / 64;
    const painted = slots.map((s) => snappedExtent(phase + s.start, s.size));
    assert.equal(
      Math.max(...painted) - Math.min(...painted),
      0,
      `phase ${phase}: a whole-number slot must paint evenly`,
    );
  }
});
