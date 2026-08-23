/**
 * The fixed sample data every cartesian preview plots.
 *
 * These values used to be locals inside `VisualGallery`, which meant the
 * five cartesian charts could only share them by being in the same
 * 2,000-line function body. Lifting them here is what lets those charts
 * become separate components without each one growing its own private
 * copy of the dataset — the duplication that would make "do the axis and
 * the bars agree?" unanswerable per chart.
 *
 * Nothing here is theme-derived, with the single exception noted on
 * `stackedSegmentColor`. The values are deliberately unchanged from the
 * originals: the stacked split in particular is a known fiction
 * (RENDERER_AUDIT.md §4.2) and fixing it is sample-data work for a later
 * phase, not part of moving the declarations.
 */

/**
 * Shared sample data, so every cartesian chart plots the same figures and
 * axis ticks line up with the bars they describe.
 */
export const barCategories: ReadonlyArray<readonly [string, number]> = [
  ["London", 82],
  ["North West", 66],
  ["Scotland", 51],
  ["Wales", 38],
];

/**
 * London (82) is the dataset's max and matches `BAR_DATA_MAX` — so its
 * bar/column must reach exactly 100%, not 82%. Every fill/error-bar
 * position scales against this rather than treating the raw value as a
 * literal percentage.
 */
export const barCategoriesMax = Math.max(...barCategories.map(([, value]) => value));

/**
 * `barPercent` used to live here: value / sample-maximum as a percentage.
 * Every chart that used it now measures from the axis range through
 * `ChartLayout.scale.value`, which is why pinning a range moves the marks
 * instead of only the tick labels. Removed in T8 with its last consumer.
 */

/**
 * The value-axis maximum every bar and column chart labels its ticks
 * against. Paired with `barCategoriesMax` above: the two used to be kept
 * in step by a comment at four separate `dataMax={82_000}` call sites.
 */
export const BAR_DATA_MAX = 82_000;

/**
 * The stacked charts' second series colour. The one theme-derived value
 * here, because the sample's second series has no colour of its own — it
 * takes the next palette entry.
 */
export const stackedSegmentColor = (palette: readonly string[]): string => palette[1] ?? palette[0];

/** Fixed split — this app models one series' color, not per-series stacking. */
export const stackedSegmentShare = 62;

/** The line chart's five plotted points. */
export const linePointValues: readonly number[] = [42, 58, 30, 68, 48];

/** The line chart's category labels, one per point in `linePointValues`. */
export const lineCategoryLabels: readonly string[] = ["Jan", "Feb", "Mar", "Apr", "May"];

/** The line chart's value-axis maximum. Its dataset is scaled differently
 *  from the bar/column one, so it carries its own maximum. */
export const LINE_DATA_MAX = 70_000;
