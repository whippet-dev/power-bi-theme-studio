/**
 * The cartesian layout engine.
 *
 * `RENDERER_AUDIT.md` §3 found that no plot rectangle is computed anywhere:
 * every chart family derives its geometry independently from CSS flow, and
 * a hand-maintained TypeScript constant duplicates what a CSS grid also
 * declares. The two disagree the moment a conditional changes the DOM,
 * which is how hiding a bar chart's category axis moves the bars out of the
 * coordinate system their own axis describes.
 *
 * This module is the single answer to "where does that element go?". It
 * computes one plot rectangle, one value scale and one category scale, and
 * everything that draws is meant to consume them rather than re-deriving
 * position from CSS.
 *
 * It landed with its tests first (T6) so the geometry could be argued
 * about before any renderer depended on it. Every cartesian preview now
 * consumes it: the column pair in T7, the bar pair in T8 and the line
 * chart in T10 — see RENDERER_IMPLEMENTATION_PLAN.md.
 *
 * Deliberately pure: no React, no DOM, no CSS, no theme JSON, no module
 * state. Text measurement is injected (see `TextMeasure`) so the default
 * stays deterministic and the whole engine is testable under `node --test`
 * with no browser. That matters because jsdom does not implement layout —
 * `getBoundingClientRect` returns zeros there — so a DOM-based test of this
 * would assert nothing.
 */

/** A rectangle in the visual's own coordinate space, y increasing downward. */
export type Rect = { x: number; y: number; width: number; height: number };

/** Names a band of a computed layout. Matches PreviewTarget.layoutSlot. */
export type ChartLayoutSlot =
  | "outer"
  | "title"
  | "subtitle"
  | "legend"
  | "categoryAxis"
  | "valueAxis"
  | "plot";

/**
 * Which way the value axis runs. A bar chart's values grow horizontally; a
 * column or line chart's grow vertically. The two are transposes of each
 * other, which is why one engine serves both.
 */
export type CartesianOrientation = "horizontal" | "vertical";

/**
 * Measures a string. Injected rather than imported so the engine stays
 * pure and deterministic; a canvas-backed measurer can be substituted
 * later without changing this signature or any call site.
 */
export type TextMeasure = (text: string, fontSize: number, fontFamily: string) => { width: number; height: number };

/**
 * The default measurer. Crude but deterministic and dependency-free: 0.55em
 * average advance width is a reasonable mean for the UI faces these
 * previews use. Deliberately NOT canvas-based — see the module comment.
 */
export const estimateText: TextMeasure = (text, fontSize) => ({
  width: text.length * fontSize * 0.55,
  height: fontSize * 1.35,
});

/**
 * The subset of a resolved axis style layout needs. Declared structurally
 * rather than imported from ChartParts, which is a component module: a
 * `ResolvedBarChartStyle["categoryAxis"]` satisfies this shape already.
 */
export type AxisLayoutStyle = {
  show: boolean;
  fontSize: number;
  fontFamily: string;
  showAxisTitle: boolean;
  titleText: string | number;
  titleFontSize: number;
  titleFontFamily: string;
  /** The schema types axis start/end as strings, not numbers. */
  start?: string | number;
  end?: string | number;
  invertAxis?: boolean;
};

/**
 * The subset of a resolved legend style layout needs.
 *
 * `fontSize`/`fontFamily` are the legend's OWN typography. T6 shipped this
 * type without them and sized a legend band using the value axis's font,
 * which is simply the wrong text: a theme can set legend and axis fonts
 * independently, and the band must follow the one it actually renders.
 * Corrected here, before the first consumer relies on it.
 */
export type LegendLayoutStyle = {
  show: boolean;
  position: string | number;
  fontSize: number;
  fontFamily: string;
  /** A shown legend title occupies an entry's worth of the band. */
  showTitle?: boolean;
  titleText?: string | number;
};

/** Data value → plot pixel. The only route from a number to a coordinate. */
export type ChartScale = {
  /**
   * Maps a data value to a coordinate along the value axis — an x for a
   * horizontal chart, a y for a vertical one. Honours the axis range and
   * `invertAxis`, so geometry and tick labels cannot desynchronise.
   */
  value: (value: number) => number;
  /**
   * Where one category **sits**: its band on the category axis — a y for a
   * horizontal chart, an x for a vertical one.
   *
   * This is the positioning band of Power BI's category scale, which is a
   * d3 `scaleBand` with the inner and outer paddings applied. Use it for
   * anything that follows the scale: category labels, gridlines, a line
   * chart's points.
   *
   * **Not** the size of a rectangular mark — see `categoryWidth`, which is
   * a different and smaller quantity whenever the inner padding is
   * non-zero.
   */
  category: (index: number, count: number) => { start: number; size: number };
  /**
   * How much of a category a rectangular mark **fills**, starting at that
   * category's band start.
   *
   * Power BI derives this from a *category thickness* that has no inner
   * padding term at all — `plot / (count + 2 × pOuter)` — and only then
   * removes the inner padding. So it is not `band.size`: with four
   * categories at 20% spacing the band is 0.800 of a step and the mark is
   * 0.767 of one. Measured across nine native states in §5.18.
   *
   * Same for every category, so it takes only the count. Clustered charts
   * hand it to `clusteredSeriesBands` as the extent to subdivide; stacked
   * charts use it as the whole bar's thickness.
   */
  categoryWidth: (count: number) => number;
  /**
   * The tick values, in plot order: `ticks[i]` belongs at the i-th
   * gridline counting from the plot's origin edge. `value(ticks[i])`
   * therefore yields evenly spaced coordinates in index order, inverted
   * or not — which is what stops gridlines needing a second scale.
   */
  ticks: number[];
};

export type ChartLayout = {
  /**
   * The orientation this layout was computed for. Carried on the result
   * because a consumer converting a coordinate needs to know which axis
   * the value scale runs along, and re-deriving it from the gutters is
   * both fragile and a workaround for a missing field.
   */
  orientation: CartesianOrientation;
  outer: Rect;
  title: Rect | null;
  subtitle: Rect | null;
  legend: Rect | null;
  /** The gutter, null when the axis is hidden — hidden means zero space. */
  categoryAxis: Rect | null;
  valueAxis: Rect | null;
  /** Optional opposite-side value gutter used by dual-axis cartesian visuals. */
  secondaryValueAxis?: Rect | null;
  /** THE plot rectangle. Computed once, consumed by everything. */
  plot: Rect;
  scale: ChartScale;
  /** A distinct value scale sharing the primary category geometry. */
  secondaryScale?: ChartScale | null;
};

export type ChartLayoutInput = {
  outer: Rect;
  orientation: CartesianOrientation;
  categoryAxis: AxisLayoutStyle;
  valueAxis: AxisLayoutStyle;
  /** Optional value axis on the far side of the plot. */
  secondaryValueAxis?: AxisLayoutStyle;
  legend?: LegendLayoutStyle;
  /** Category labels, in plot order. Their extent sizes the category gutter. */
  categories: readonly string[];
  /** Series names, used only to size a legend band. */
  seriesLabels?: readonly string[];
  /** The value the axis spans to when it does not pin its own range. */
  dataMax: number;
  secondaryDataMax?: number;
  /** Power BI's "space between categories", 0-100, as a share of the slot. */
  innerPadding?: number;
  /** Gridline/tick intervals. `ticks` has this many + 1 entries. */
  tickCount?: number;
  /**
   * Formats a tick for measurement, so the value-axis gutter is as wide as
   * the label that will actually be drawn. Injected for the same reason as
   * `measureText`: the real formatter lives in a component module, and
   * duplicating its display-unit rules here would be a second source of
   * truth for what a tick says.
   */
  formatTick?: (value: number) => string;
  formatSecondaryTick?: (value: number) => string;
  measureText?: TextMeasure;
  /** Space between a gutter's text and the plot edge. */
  labelGap?: number;
  /** Reserved above the visual's title/subtitle text. */
  titleText?: string | null;
  titleFontSize?: number;
  titleFontFamily?: string;
  subtitleText?: string | null;
  subtitleFontSize?: number;
  subtitleFontFamily?: string;
};

/**
 * A value's position as a 0..1 fraction of the plot, measured from the
 * plot's origin edge — the bottom for a vertical chart, the left for a
 * horizontal one.
 *
 * Lives with the engine rather than in a renderer helper because it is a
 * pure function of a ChartLayout, and because it is the single conversion
 * from engine coordinates to the CSS percentages that gridlines, marks and
 * labels all use. One conversion, shared, is what stops them drifting.
 */
export function valueFraction(layout: ChartLayout, value: number): number {
  const coordinate = layout.scale.value(value);
  const { plot } = layout;
  if (plot.height <= 0 || plot.width <= 0) return 0;
  // A vertical chart's CSS `bottom` grows upward while its y grows downward.
  return layout.orientation === "vertical"
    ? (plot.y + plot.height - coordinate) / plot.height
    : (coordinate - plot.x) / plot.width;
}

/**
 * The centre of a category's slot, in the layout's own coordinate space.
 *
 * A line chart plots one point per category rather than filling the slot,
 * and that point belongs in the middle of it. Derived from `scale.category`
 * so a line's points, a column's bars and the shared category labels all
 * come from the same slots — and so category inversion reverses all three
 * without anyone reversing an array.
 */
export function categoryCentre(layout: ChartLayout, index: number, count: number): number {
  const slot = layout.scale.category(index, count);
  return slot.start + slot.size / 2;
}

/**
 * A data value as a coordinate along the value axis, expressed relative to
 * the plot's own origin and clamped to stay inside it.
 *
 * Anything drawing in plot-local coordinates — an SVG whose viewBox is the
 * plot, most obviously — needs the value's position measured from the
 * plot's corner rather than the visual's. And a value can legitimately sit
 * outside the displayed range: pin an axis to start at 20000 and zero is
 * off the plot entirely. A line chart's area fill closes to zero, so an
 * unclamped coordinate would let the fill escape into the axis gutters.
 * Clamping resolves that to the nearest visible edge.
 *
 * Orientation-agnostic, because `scale.value` already returns an x for a
 * horizontal chart and a y for a vertical one, and already honours
 * `invertAxis` — so an inverted axis clamps to the opposite edge on its
 * own, with no second branch here.
 */
export function clampedValueCoordinate(layout: ChartLayout, value: number): number {
  const vertical = layout.orientation === "vertical";
  const origin = vertical ? layout.plot.y : layout.plot.x;
  const extent = vertical ? layout.plot.height : layout.plot.width;
  return Math.max(0, Math.min(extent, layout.scale.value(value) - origin));
}

/**
 * The rectangular mark extent as a percentage of the category axis.
 *
 * The counterpart to `categoryPercent`'s `offset`: a bar starts where the
 * band starts and is this long. Deliberately a separate call, so a
 * renderer cannot reach for a positioning size when it wants a mark size.
 */
export function categoryWidthPercent(layout: ChartLayout, count: number): number {
  const { plot } = layout;
  const total = layout.orientation === "vertical" ? plot.width : plot.height;
  if (total <= 0) return 0;
  return (layout.scale.categoryWidth(count) / total) * 100;
}

/** A category slot as offset/size percentages along the category axis. */
export function categoryPercent(
  layout: ChartLayout,
  index: number,
  count: number,
): { offset: number; size: number } {
  const slot = layout.scale.category(index, count);
  const { plot } = layout;
  const total = layout.orientation === "vertical" ? plot.width : plot.height;
  const origin = layout.orientation === "vertical" ? plot.x : plot.y;
  if (total <= 0) return { offset: 0, size: 0 };
  return { offset: ((slot.start - origin) / total) * 100, size: (slot.size / total) * 100 };
}

/**
 * Power BI reserves this much empty plot at each end of the category axis,
 * measured in category steps.
 *
 * Categories do not tile the plot. Power BI's category scale is a band
 * scale with an outer padding, so the first band starts 0.4 of a step in
 * from the plot edge and the last ends 0.4 of a step before the far edge.
 *
 * Measured across twelve native states — two visual sizes × six values of
 * "Space between categories" (0, 10, 20, 30, 50, 75) — where
 * `plotExtent / step` came out as 4.80, 4.70, 4.60, 4.50, 4.30 and 4.05 for
 * four categories. Solving each for the outer term gives **0.4000 in every
 * one**, and the measured distance from the plot edge to the first band is
 * **0.4000 × step in every one**: two independent routes to the same
 * number, at every state. See POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.16.
 *
 * Corroborated in Power BI Desktop's own cartesian bundle, which resolves
 * the ratio as `explicit ?? (axesVisible !== false ? 0.4 : 0)` — the same
 * 0.4, and the reason a hidden category axis takes 0 below.
 *
 * Not a theme property here. Power BI does register `categoryAxis.
 * outerPadding` in its property metadata, but it is gated behind a feature
 * switch and absent from the Format pane, so it is modelled as scale
 * behaviour rather than added to the editor.
 */
export const CATEGORY_OUTER_PADDING = 0.4;

/**
 * The distance Power BI leaves between a category tick label's ANCHOR and
 * the plot's edge, on a horizontal category axis.
 *
 * Category labels are `text-anchor: end` at `x = -9` from the plot origin,
 * and that 9 does not move: six font sizes, several viewport widths and
 * three different category strings all measured exactly 9, spread 0.000.
 * Measuring the same gap from the painted glyph box instead gives 8.07 to
 * 9.00, because the ink box carries the font's side bearing — which is why
 * this is defined against the anchor. See
 * POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.25.
 */
export const CATEGORY_TICK_LABEL_ANCHOR_OFFSET = 9;

/**
 * The gap an axis title adds beyond its own font size.
 *
 * Measured by switching the category axis title off and on: a 16px title
 * costs 21px of gutter and a 12px title costs 17px, both times returning
 * exactly on the way back. See §5.21.
 */
const AXIS_TITLE_GAP = 5;

/**
 * The allowance Power BI keeps on the CHART-EDGE side of a horizontal
 * category label, beyond the label's own measured width.
 *
 * **This is an empirical compatibility rule, not Power BI's algorithm.**
 *
 * What is solid: measured against Power BI Desktop's own canvas widths —
 * measured inside its WebView, and identical to ours to four decimals — it
 * reproduces all six title-off font-size states to within **0.053px**:
 *
 * | label px | native allowance | this rule |
 * |---:|---:|---:|
 * | 9.6 | 5.6016 | 5.600 |
 * | 12 | 6.5020 | 6.500 |
 * | 14.4 | 7.4024 | 7.400 |
 * | 16.8 | 8.3532 | 8.300 |
 * | 19.2 | 9.2032 | 9.200 |
 * | 24 | 11.0039 | 11.000 |
 *
 * What is not: at a fixed 12px the native allowance varies with the label
 * itself — 5.1152 for "Scotland", 6.5020 for "North West", 6.7344 for
 * "Loughborough". So a different widest label can be out by about **1.4px**.
 * That residual is real native behaviour rather than a measurement error:
 * the font question was closed by measuring in Desktop's own runtime.
 *
 * It is deliberately left approximate. Fitting a branch to make one string
 * land exactly would hide the evidence rather than explain it. See §5.24,
 * §5.28 and §5.29.
 */
export function horizontalCategoryLabelAllowance(labelFontPx: number): number {
  return 2 + 0.375 * Math.max(0, labelFontPx);
}

/**
 * What a legend costs, and which edge it costs it on.
 *
 * The only implementation. `computeChartLayout` uses it to reserve its own
 * legend rect, and a renderer that draws the legend itself uses it to take
 * the same band out of the authored visual first — so the two are the same
 * arithmetic rather than two copies of it that happen to agree today.
 *
 * A legend costs width when it sits beside the plot and height when it
 * sits above or below, which is why the result carries both the extent and
 * the orientation: a caller placing the band needs to know which edge it
 * came off.
 */
export function legendExtent(
  legend: LegendLayoutStyle | undefined,
  seriesLabels: readonly string[],
  measureText: TextMeasure,
  labelGap: number = DEFAULT_LABEL_GAP,
): { width: number; height: number; vertical: boolean; afterPlot: boolean } {
  if (!legend?.show) return { width: 0, height: 0, vertical: false, afterPlot: false };
  // The same reading of Power BI's eight positions that ChartParts'
  // legendIsVertical/legendIsAfterPlot use.
  const position = String(legend.position);
  const vertical = position.startsWith("Left") || position.startsWith("Right");
  const afterPlot = position.startsWith("Bottom") || position.startsWith("Right");
  // A legend is sized by its entries, measured in the LEGEND's own font —
  // not the axis's — and its title counts as an entry when shown.
  // The renderer falls back to "Series" when the feature is enabled but a
  // report has no explicit legend title. Measurement must reserve for that
  // same rendered text rather than treating the heading as zero-height.
  const title = legend.showTitle ? (String(legend.titleText ?? "") || "Series") : "";
  const entries = seriesLabels;
  const entryText = widestText(entries, legend.fontSize, legend.fontFamily, measureText);
  const titleText = title
    ? measureText(title, legend.fontSize, legend.fontFamily)
    : { width: 0, height: 0 };
  const text = {
    width: Math.max(entryText.width, titleText.width),
    height: Math.max(entryText.height, titleText.height),
  };
  // Horizontal Classic 2026 chrome paints the title inline with the entry
  // row, but still reserves this title-line allowance as the measured gap
  // between the visual title and that row. Keeping the existing reservation
  // preserves the authored plot geometry; the renderer places the row at
  // the far edge of its band. Side legends remain a vertical title/entry
  // stack and use the same title width when they need it.
  const titleHeight = title ? titleText.height + labelGap : 0;
  return vertical
    ? { width: text.width + LEGEND_SWATCH_EXTENT + labelGap, height: 0, vertical, afterPlot }
    : { width: 0, height: (entries.length ? entryText.height : 0) + titleHeight + labelGap, vertical, afterPlot };
}

/** Just enough of a visual title to size its band. */
export type VisualTitleLayoutStyle = {
  show: boolean;
  text: string;
  fontSize: number;
  fontFamily: string;
};

/**
 * What Power BI's visual header costs beyond the title text itself.
 *
 * Calibrated from one native state and honest about it: Classic 2026 at
 * 450 × 250 gives its title band **35px** for a 16px title, and the same
 * canvas that measures the text reports 21px of font height for it. The
 * remainder is this. One measurement cannot tell a fixed padding from a
 * font-relative one — if a second title size is ever measured and
 * disagrees, this is the constant that should change.
 */
export const VISUAL_TITLE_PADDING = 14;

/**
 * The band a visual's own title takes out of its authored height.
 *
 * The Power BI visual title, not Theme Studio's tile heading: this one is
 * driven by the theme's title properties and is part of the authored
 * visual, so it is paid for out of the visual's own budget. The editor's
 * name-and-select chrome is not, and stays outside.
 *
 * The one implementation, like `legendExtent`: whatever reserves the band
 * and whatever renders it call this, so a rendered title cannot end up a
 * different height from the space made for it.
 */
export function visualTitleExtent(
  title: VisualTitleLayoutStyle | undefined,
  measureText: TextMeasure,
  spaceBelowTitle = 0,
): { height: number; textHeight: number; spaceBelow: number } {
  if (!title?.show) return { height: 0, textHeight: 0, spaceBelow: 0 };
  const text = String(title.text ?? "");
  if (!text) return { height: 0, textHeight: 0, spaceBelow: 0 };
  const textHeight = measureText(text, title.fontSize, title.fontFamily).height + VISUAL_TITLE_PADDING;
  // Space below the title is space the visual cannot draw in, so it comes
  // out of the same budget. Returned separately as well as in the total,
  // because the renderer needs the two halves — the band for the title
  // element and the gap for its margin — and taking them from one
  // calculation is what stops the reserved and rendered heights differing.
  const spaceBelow = Math.max(0, spaceBelowTitle);
  return { height: textHeight + spaceBelow, textHeight, spaceBelow };
}

export const DEFAULT_TICK_COUNT = 4;
/** The gap between a label and what it labels. */
export const DEFAULT_LABEL_GAP = 4;
/** Swatch plus its gap, for sizing a legend band. */
export const LEGEND_SWATCH_EXTENT = 14;

/** Axis start/end arrive as strings from the schema and are blank unless pinned. */
function parseBound(value: string | number | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The axis range: start falls back to 0, and a pinned end is only honoured
 * when it exceeds start.
 *
 * These semantics began in `axisTicks` in ChartParts, which this was
 * written to match while both models were live. T10 deleted that one with
 * its last consumer, so this is now the only definition — and
 * `chartLayout.test.ts` pins the semantics as an explicit table rather
 * than by comparison, since there is nothing left to compare against.
 */
export function axisRange(axis: AxisLayoutStyle, dataMax: number): { start: number; end: number } {
  const start = parseBound(axis.start) ?? 0;
  const parsedEnd = parseBound(axis.end);
  const end = parsedEnd !== null && parsedEnd > start ? parsedEnd : dataMax;
  return { start, end };
}

/** Evenly spaced tick values across the range, in plot order. */
export function axisTickValues(axis: AxisLayoutStyle, dataMax: number, count = DEFAULT_TICK_COUNT): number[] {
  const { start, end } = axisRange(axis, dataMax);
  const ticks = Array.from({ length: count + 1 }, (_, i) => start + ((end - start) * i) / count);
  return axis.invertAxis ? ticks.reverse() : ticks;
}

/** Widest measured extent across a set of strings, 0 for an empty set. */
function widestText(
  labels: readonly string[],
  fontSize: number,
  fontFamily: string,
  measure: TextMeasure,
): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const label of labels) {
    const m = measure(label, fontSize, fontFamily);
    if (m.width > width) width = m.width;
    if (m.height > height) height = m.height;
  }
  return { width, height };
}

/**
 * Computes one layout. Pure: same input, same output, and calling it for
 * another visual in between cannot affect either result.
 */
export function computeChartLayout(input: ChartLayoutInput): ChartLayout {
  const {
    outer,
    orientation,
    categoryAxis,
    valueAxis,
    secondaryValueAxis,
    legend,
    categories,
    seriesLabels = [],
    dataMax,
    secondaryDataMax = dataMax,
    innerPadding = 0,
    tickCount = DEFAULT_TICK_COUNT,
    formatTick = (value: number) => String(value),
    formatSecondaryTick = formatTick,
    measureText = estimateText,
    labelGap = DEFAULT_LABEL_GAP,
    titleText = null,
    titleFontSize = 12,
    titleFontFamily = "",
    subtitleText = null,
    subtitleFontSize = 10,
    subtitleFontFamily = "",
  } = input;

  const vertical = orientation === "vertical";

  // Bands are subtracted from a shrinking remainder in a fixed order, so
  // the arithmetic conserves by construction: along either axis the band
  // extents plus the plot extent equal the outer extent, and no two bands
  // can overlap.
  let left = outer.x;
  let top = outer.y;
  let width = outer.width;
  let height = outer.height;

  const takeTop = (extent: number): Rect => {
    const capped = Math.max(0, Math.min(extent, height));
    const rect = { x: left, y: top, width, height: capped };
    top += capped;
    height -= capped;
    return rect;
  };
  const takeBottom = (extent: number): Rect => {
    const capped = Math.max(0, Math.min(extent, height));
    height -= capped;
    return { x: left, y: top + height, width, height: capped };
  };
  const takeLeft = (extent: number): Rect => {
    const capped = Math.max(0, Math.min(extent, width));
    const rect = { x: left, y: top, width: capped, height };
    left += capped;
    width -= capped;
    return rect;
  };
  const takeRight = (extent: number): Rect => {
    const capped = Math.max(0, Math.min(extent, width));
    width -= capped;
    return { x: left + width, y: top, width: capped, height };
  };

  // --- Chrome bands ------------------------------------------------------
  const title = titleText ? takeTop(measureText(titleText, titleFontSize, titleFontFamily).height) : null;
  const subtitle = subtitleText
    ? takeTop(measureText(subtitleText, subtitleFontSize, subtitleFontFamily).height)
    : null;

  // --- Legend ------------------------------------------------------------
  // Sizing lives in `legendExtent`, which a renderer drawing its own legend
  // also calls. Reserving here is then only about which edge to take it
  // from.
  let legendRect: Rect | null = null;
  if (legend?.show) {
    const band = legendExtent(legend, seriesLabels, measureText, labelGap);
    legendRect = band.vertical
      ? (band.afterPlot ? takeRight(band.width) : takeLeft(band.width))
      : (band.afterPlot ? takeBottom(band.height) : takeTop(band.height));
  }

  // --- Axis gutters ------------------------------------------------------
  // Sized from the labels that will actually be drawn, via measureText —
  // never from a literal. This is what replaces BAR_VALUE_AXIS_INSET's
  // hand-copied `68 + 8`.
  const axisTitleExtent = (axis: AxisLayoutStyle): number =>
    axis.showAxisTitle && String(axis.titleText)
      ? measureText(String(axis.titleText), axis.titleFontSize, axis.titleFontFamily).height
      : 0;

  const ticks = axisTickValues(valueAxis, dataMax, tickCount);
  const tickLabels = ticks.map(formatTick);

  let valueAxisRect: Rect | null = null;
  if (valueAxis.show) {
    const text = widestText(tickLabels, valueAxis.fontSize, valueAxis.fontFamily, measureText);
    // A vertical chart's value axis runs up the left edge, so its gutter is
    // as wide as the widest tick label; a horizontal chart's runs along the
    // bottom, so its gutter is one text line tall. Transposes.
    valueAxisRect = vertical
      ? takeLeft(text.width + labelGap + axisTitleExtent(valueAxis))
      : takeBottom(text.height + labelGap + axisTitleExtent(valueAxis));
  }

  let secondaryValueAxisRect: Rect | null = null;
  const secondaryTicks = secondaryValueAxis
    ? axisTickValues(secondaryValueAxis, secondaryDataMax, tickCount)
    : [];
  if (secondaryValueAxis?.show) {
    const text = widestText(
      secondaryTicks.map(formatSecondaryTick),
      secondaryValueAxis.fontSize,
      secondaryValueAxis.fontFamily,
      measureText,
    );
    // Line is currently the only dual-axis consumer and is vertical. The
    // transpose is kept coherent for any future cartesian consumer: the
    // secondary value gutter always occupies the edge opposite the primary.
    secondaryValueAxisRect = vertical
      ? takeRight(text.width + labelGap + axisTitleExtent(secondaryValueAxis))
      : takeTop(text.height + labelGap + axisTitleExtent(secondaryValueAxis));
  }

  /**
   * A horizontal category axis, sized the way Power BI sizes it.
   *
   * Four terms, each measured separately rather than folded into one
   * constant: the label's own width, the allowance on the chart-edge side
   * of it, the fixed anchor offset to the plot, and the title when shown.
   *
   * The label width comes from the same `measureText` the renderer paints
   * with, which is correct rather than convenient — Power BI's own
   * `textWidthMeasurer` is `canvasCtx.measureText`, and its widths match
   * ours to four decimals (§5.27, §5.29).
   *
   * A future `maxMarginFactor` cap belongs around the label part of this
   * sum — Power BI computes `min(max(overflow, labelWidth), viewport ×
   * factor)` and adds the title outside that cap. The cap is NOT
   * implemented: its viewport basis is still ambiguous (§5.26), so the
   * gutter is currently uncapped.
   */
  const horizontalCategoryAxisExtent = (measuredLabelWidth: number, axis: AxisLayoutStyle): number =>
    measuredLabelWidth
    + horizontalCategoryLabelAllowance(axis.fontSize)
    + CATEGORY_TICK_LABEL_ANCHOR_OFFSET
    + (axis.showAxisTitle && String(axis.titleText) ? axis.titleFontSize + AXIS_TITLE_GAP : 0);

  let categoryAxisRect: Rect | null = null;
  if (categoryAxis.show) {
    const text = widestText(categories, categoryAxis.fontSize, categoryAxis.fontFamily, measureText);
    // And the category axis is the other way round: along the bottom for a
    // vertical chart, down the left edge for a horizontal one. Only the
    // horizontal case is measured against Power BI, so only it changed;
    // the vertical one keeps the layout this engine always had.
    categoryAxisRect = vertical
      ? takeBottom(text.height + labelGap + axisTitleExtent(categoryAxis))
      : takeLeft(horizontalCategoryAxisExtent(text.width, categoryAxis));
  }

  const plot: Rect = { x: left, y: top, width: Math.max(0, width), height: Math.max(0, height) };

  // --- Scales ------------------------------------------------------------
  const { start, end } = axisRange(valueAxis, dataMax);
  const span = end - start;
  const inverted = Boolean(valueAxis.invertAxis);

  const value = (v: number): number => {
    // A zero span would divide by zero; pin to the origin edge instead.
    const raw = span === 0 ? 0 : (v - start) / span;
    const fraction = inverted ? 1 - raw : raw;
    // Screen y grows downward, so a vertical chart measures its fraction up
    // from the bottom. That is the whole of the transpose.
    return vertical ? plot.y + plot.height - fraction * plot.height : plot.x + fraction * plot.width;
  };

  const secondaryRange = secondaryValueAxis
    ? axisRange(secondaryValueAxis, secondaryDataMax)
    : null;
  const secondaryValue = (v: number): number => {
    if (!secondaryRange) return value(v);
    const secondarySpan = secondaryRange.end - secondaryRange.start;
    const raw = secondarySpan === 0 ? 0 : (v - secondaryRange.start) / secondarySpan;
    const fraction = secondaryValueAxis?.invertAxis ? 1 - raw : raw;
    return vertical ? plot.y + plot.height - fraction * plot.height : plot.x + fraction * plot.width;
  };

  // The category axis inverts independently of the value axis: one reverses
  // which slot a category occupies, the other which end of the plot a value
  // maps to. Both belong to the scale rather than to a renderer — reversing
  // an array in a chart component would flip its marks and leave its labels
  // behind, because the two read the slots separately.
  const categoryInverted = Boolean(categoryAxis.invertAxis);

  const categoryExtent = vertical ? plot.width : plot.height;
  const categoryOrigin = vertical ? plot.x : plot.y;
  const pInner = Math.max(0, Math.min(100, innerPadding)) / 100;
  // A hidden category axis takes no outer padding, which is the rule Power
  // BI's own bundle states; the measured states all had the axis visible,
  // so that half is runtime-corroborated rather than measured here.
  const pOuter = categoryAxis.show ? CATEGORY_OUTER_PADDING : 0;

  /**
   * The mark extent, which is NOT the band size.
   *
   * Power BI computes a category *thickness* with no inner-padding term,
   * then removes the inner padding from that. The band, by contrast, is
   * the step less the inner padding — and the step is larger than the
   * thickness whenever the inner padding is non-zero, because the band
   * scale gives back the padding it took. Nine native states confirm the
   * two are distinct and that this one is what the series scale divides.
   */
  const categoryWidth = (count: number): number => {
    if (count <= 0) return 0;
    const thickness = categoryExtent / Math.max(1, count + 2 * pOuter);
    return Math.max(0, thickness * (1 - pInner));
  };

  const category = (index: number, count: number): { start: number; size: number } => {
    if (count <= 0) return { start: categoryOrigin, size: 0 };
    const total = categoryExtent;
    const origin = categoryOrigin;
    // Band-scale semantics, matching native: the step absorbs the inner
    // padding once and the outer padding twice, so the plot holds
    // `count - pInner + 2 * pOuter` steps. The guard mirrors Power BI's own
    // `Math.max(1, ...)`, which stops a single heavily padded category from
    // producing a step wider than the plot.
    const step = total / Math.max(1, count - pInner + 2 * pOuter);
    // Inversion changes which slot the index lands in, not the slot's size:
    // index 0 takes the last slot, index 1 the second-last, and so on.
    const position = categoryInverted ? count - 1 - index : index;
    // The band sits flush against the start of its step, not centred in it.
    // Native's leading edge is exactly pOuter x step at every measured
    // state, which centring could not produce.
    return {
      start: origin + pOuter * step + position * step,
      size: Math.max(0, step * (1 - pInner)),
    };
  };

  const primaryScale: ChartScale = { value, category, categoryWidth, ticks };
  const secondaryScale: ChartScale | null = secondaryValueAxis
    ? { value: secondaryValue, category, categoryWidth, ticks: secondaryTicks }
    : null;

  return {
    orientation,
    outer,
    title,
    subtitle,
    legend: legendRect,
    categoryAxis: categoryAxisRect,
    valueAxis: valueAxisRect,
    ...(secondaryValueAxis
      ? { secondaryValueAxis: secondaryValueAxisRect, secondaryScale }
      : {}),
    plot,
    scale: primaryScale,
  };
}
