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
 * **Nothing imports this yet.** It lands with its tests first, so the
 * geometry can be argued about before any renderer depends on it — see
 * RENDERER_IMPLEMENTATION_PLAN.md T6, then T7/T8/T10 for adoption.
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
   * The slot for one category, along the category axis — a y for a
   * horizontal chart, an x for a vertical one. `size` already has the
   * inner padding removed.
   */
  category: (index: number, count: number) => { start: number; size: number };
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
  /** THE plot rectangle. Computed once, consumed by everything. */
  plot: Rect;
  scale: ChartScale;
};

export type ChartLayoutInput = {
  outer: Rect;
  orientation: CartesianOrientation;
  categoryAxis: AxisLayoutStyle;
  valueAxis: AxisLayoutStyle;
  legend?: LegendLayoutStyle;
  /** Category labels, in plot order. Their extent sizes the category gutter. */
  categories: readonly string[];
  /** Series names, used only to size a legend band. */
  seriesLabels?: readonly string[];
  /** The value the axis spans to when it does not pin its own range. */
  dataMax: number;
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

const DEFAULT_TICK_COUNT = 4;
const DEFAULT_LABEL_GAP = 4;
/** Swatch plus its gap, for sizing a legend band. */
const LEGEND_SWATCH_EXTENT = 14;

/** Axis start/end arrive as strings from the schema and are blank unless pinned. */
function parseBound(value: string | number | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The axis range, matching `axisTicks` in ChartParts exactly: start falls
 * back to 0, and a pinned end is only honoured when it exceeds start.
 * Reimplemented rather than imported because ChartParts is a component
 * module and this one must not depend on React; `chartLayout.test.ts`
 * asserts the two agree so they cannot drift apart silently.
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
    legend,
    categories,
    seriesLabels = [],
    dataMax,
    innerPadding = 0,
    tickCount = DEFAULT_TICK_COUNT,
    formatTick = (value: number) => String(value),
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
  // Placement follows the same reading of Power BI's eight positions that
  // ChartParts' legendIsVertical/legendIsAfterPlot already use.
  let legendRect: Rect | null = null;
  if (legend?.show) {
    const position = String(legend.position);
    const legendVertical = position.startsWith("Left") || position.startsWith("Right");
    const afterPlot = position.startsWith("Bottom") || position.startsWith("Right");
    // A legend is sized by its entries, measured in the LEGEND's own font —
    // not the axis's — and its title counts as an entry when shown.
    const entries = legend.showTitle && String(legend.titleText ?? "")
      ? [String(legend.titleText), ...seriesLabels]
      : seriesLabels;
    const text = widestText(entries, legend.fontSize, legend.fontFamily, measureText);
    if (legendVertical) {
      const extent = text.width + LEGEND_SWATCH_EXTENT + labelGap;
      legendRect = afterPlot ? takeRight(extent) : takeLeft(extent);
    } else {
      const extent = (entries.length ? text.height : 0) + labelGap;
      legendRect = afterPlot ? takeBottom(extent) : takeTop(extent);
    }
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

  let categoryAxisRect: Rect | null = null;
  if (categoryAxis.show) {
    const text = widestText(categories, categoryAxis.fontSize, categoryAxis.fontFamily, measureText);
    // And the category axis is the other way round: along the bottom for a
    // vertical chart, down the left edge for a horizontal one.
    categoryAxisRect = vertical
      ? takeBottom(text.height + labelGap + axisTitleExtent(categoryAxis))
      : takeLeft(text.width + labelGap + axisTitleExtent(categoryAxis));
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

  const category = (index: number, count: number): { start: number; size: number } => {
    if (count <= 0) return { start: vertical ? plot.x : plot.y, size: 0 };
    const total = vertical ? plot.width : plot.height;
    const origin = vertical ? plot.x : plot.y;
    const slot = total / count;
    // innerPadding is a percentage of the slot left empty, so half of it
    // sits either side of the mark and every slot stays inside the plot.
    const padding = slot * (Math.max(0, Math.min(100, innerPadding)) / 100);
    return { start: origin + index * slot + padding / 2, size: Math.max(0, slot - padding) };
  };

  return {
    orientation,
    outer,
    title,
    subtitle,
    legend: legendRect,
    categoryAxis: categoryAxisRect,
    valueAxis: valueAxisRect,
    plot,
    scale: { value, category, ticks },
  };
}
