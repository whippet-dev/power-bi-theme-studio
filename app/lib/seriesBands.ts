/**
 * How a category slot is shared between the series inside it.
 *
 * `ChartLayout` deliberately knows nothing about series: it divides the plot
 * into category slots and stops. This is the layer above, and it is pure
 * geometry in the same natural units — no React, no DOM, no orientation. A
 * bar chart subdivides a slot's height and a column chart the same slot's
 * width, so both call this with one number and get the same answer.
 *
 * ## Where the model comes from
 *
 * Power BI Desktop 2.157.879.0, `desktop.CartesianVisuals.min.js`. Clustered
 * series are a d3 band scale laid across the category's usable width:
 *
 * ```js
 * get categoryWidth() {
 *   return this.categoryAxis.categoryThickness * (1 - this.categoryAxis.innerPaddingRatio);
 * }
 *
 * updateCategoryBandScale() {
 *   this.categoryBandScale = d3.scaleBand().range([0, this.categoryWidth]);
 *   if (this.isClusteredOptimized) {
 *     if (this.activeData.layout.clusteredGapSize) {
 *       if (this.activeData.layout.clusteredGapOverlaps) {
 *         this.categoryBandScale.range([0, this.categoryWidth * (1 - clusteredGapSize / 100)]);
 *       } else {
 *         this.categoryBandScale.paddingInner(clusteredGapSize / 100);
 *       }
 *     }
 *     this.categoryBandScale.domain(series.map((s) => s.index.toString()));
 *   } else {
 *     this.categoryBandScale.domain(["0"]);
 *   }
 * }
 * ```
 *
 * Three things follow, and all three contradict what this app used to draw:
 *
 * 1. `categoryWidth` is the slot **after** `innerPadding` — which is exactly
 *    `ChartLayout.scale.category(...).size`. The two spacings are genuinely
 *    different levels: `innerPadding` separates categories, `clusteredGapSize`
 *    separates series within one.
 * 2. `clusteredGapSize` is the band scale's `paddingInner`, so it sets the gap
 *    between series *and* the resulting thickness through one rule. It is not
 *    a thickness percentage.
 * 3. With fewer than two series it does nothing at all. The converter is
 *    explicit: `if (D.length < 2) { this.layout.clusteredGapSize = 0; }`.
 *    Thinning a lone bar by the "space between series" was a fiction.
 *
 * The overlap variant is a second, separate rule: the *positions* come from a
 * narrowed range while the *thickness* comes from `columnWidth`, which is
 * wider than the step, so neighbouring series deliberately overlap.
 *
 * ```js
 * get columnWidth() {
 *   const e = this.activeData.series.length;
 *   return e >= 2 && layout.clusteredGapSize > 0 && layout.clusteredGapOverlaps
 *     ? this.categoryWidth * (1 + (e - 1) * layout.clusteredGapSize / 100) / e
 *     : this.categoryBandScale.bandwidth();
 * }
 * ```
 *
 * Both variants tile the slot exactly: the last band always ends on the slot's
 * far edge, which is what keeps a cluster centred without an `align` term.
 */

/** The clamps Power BI applies before the scale ever sees the value. */
const MAX_GAP = 75;
const MAX_GAP_OVERLAPPING = 100;

/** One series' share of a category slot, in the slot's own coordinates. */
/**
 * Power BI's default for "Space between categories", as a percentage.
 *
 * Read from the Format pane's own control in Power BI Desktop rather than
 * inferred from pixels: the slider reports **20** (range 0..75) for a
 * default Clustered bar under Classic 2026.
 *
 * That is deliberately not the ~23.33% the native geometry measures. The
 * measured figure is the *effective* ratio of cluster to category step, and
 * Power BI reaches it by also insetting the cluster inside its band and
 * carrying an outer padding of roughly 0.4 × step at each end of the plot —
 * neither of which this layout engine models. Copying 23.33 into a property
 * that means "space between categories" would encode a layout artefact as a
 * user-facing setting, and the editor would then show a number Power BI
 * never shows. The remaining gap belongs to the outer-padding work, not
 * here. See POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.11 and §5.14.
 *
 * Not to be confused with [[clusteredSeriesBands]]'s `paddingInner`, which
 * subdivides one category between series and is a proven 0.1 at gap 10.
 */
export const CATEGORY_INNER_PADDING_DEFAULT = 20;

export type SeriesBand = {
  /** Distance from the slot's origin edge. */
  offset: number;
  /** Extent along the category axis. May exceed the step when overlapping. */
  size: number;
};

export type SeriesBandInput = {
  /** The slot to divide: `ChartLayout.scale.category(...).size`. */
  extent: number;
  seriesCount: number;
  /** `layout.clusteredGapSize`, a percentage. */
  gapSize: number;
  /** `layout.clusteredGapOverlaps`. */
  overlaps?: boolean;
};

/**
 * Divides one category slot between `seriesCount` series, in slot-relative
 * coordinates: add the slot's own start to place them.
 *
 * Returns one band per series in series order. Reversing the drawing order is
 * a renderer's business — these are indexed by series, so a chart that paints
 * them backwards is painting the wrong data, not a different layout.
 */
export function clusteredSeriesBands(input: SeriesBandInput): SeriesBand[] {
  const { extent, seriesCount, gapSize, overlaps = false } = input;
  if (!Number.isFinite(extent) || extent <= 0 || seriesCount <= 0) return [];

  // A single series has no *inner* gap to size, so the property is inert.
  // Power BI zeroes it in the converter rather than relying on the scale to
  // work out that one band cannot have a gap before the next one.
  const usable = seriesCount < 2 ? 0 : Math.max(0, Math.min(overlaps ? MAX_GAP_OVERLAPPING : MAX_GAP, gapSize));
  const gap = usable / 100;

  if (overlaps && gap > 0) {
    // Positions from a narrowed range, thickness from the wider `columnWidth`.
    // The two disagree on purpose: that difference is the overlap.
    const step = (extent * (1 - gap)) / seriesCount;
    const size = (extent * (1 + (seriesCount - 1) * gap)) / seriesCount;
    return Array.from({ length: seriesCount }, (_, index) => ({ offset: index * step, size }));
  }

  // d3's band scale with `paddingInner` and no outer padding: `n - gap` steps
  // span the range, and each band gives up `gap` of its own step to the space
  // that follows it. The last band therefore ends exactly on `extent`.
  const step = extent / (seriesCount - gap);
  const size = step * (1 - gap);
  return Array.from({ length: seriesCount }, (_, index) => ({ offset: index * step, size }));
}

/** One stacked segment, along the VALUE axis rather than the category axis. */
export type StackSegment = {
  /** Cumulative total of the series before this one. */
  start: number;
  /** `start` plus this series' own value. */
  end: number;
  value: number;
};

/**
 * Turns one category's series values into cumulative segments.
 *
 * Stacking is a value-axis concern, so unlike `clusteredSeriesBands` this
 * returns data-space numbers and leaves scaling to the caller. Segments abut
 * exactly: Power BI only separates them when `stackedGapExplodes` is on, and
 * even then by displacing them along the value axis rather than by shrinking
 * them. Nothing here invents a gap.
 */
export function stackSegments(values: readonly number[]): StackSegment[] {
  const segments: StackSegment[] = [];
  let cumulative = 0;
  for (const value of values) {
    const safe = Number.isFinite(value) ? value : 0;
    segments.push({ start: cumulative, end: cumulative + safe, value: safe });
    cumulative += safe;
  }
  return segments;
}
