import {
  computeChartLayout,
  type AxisLayoutStyle,
  type CartesianOrientation,
  type ChartLayout,
  type Rect,
} from "../../lib/chartLayout";
import { formatValue } from "../ChartParts";

/**
 * The bridge between a preview component and the pure layout engine.
 *
 * Two jobs, both deliberately thin:
 *
 * 1. Supply the engine's injected functions from the renderer's own
 *    helpers, so the value-axis gutter is sized by the label that is
 *    actually drawn rather than a second copy of the formatting rules.
 * 2. Convert engine coordinates into the percentages the DOM needs.
 *
 * On (2): the engine works in a natural, pre-transform coordinate space —
 * it must not know the hero's CSS scale, the viewport, or whether it is
 * drawing a hero or a thumbnail. But the preview's *width* is fluid (a
 * hero tile is 420px wide, a thumbnail 200px), so absolute x coordinates
 * would be wrong at one of them. Gutters, which are text-sized and must not
 * scale, are emitted as pixels; positions inside the plot are emitted as
 * percentages of the plot. Both derive from the same layout, so this is a
 * single normalisation and not a second scale.
 */

/**
 * The column chart's natural chart box. Replaces `.column-preview__plot`'s
 * `height: 128px`, which CSS owned and the geometry could not see. Same
 * total footprint as before; the difference is that the engine now carves
 * the axis gutters *out* of it, where the old CSS let the category labels
 * eat into the plot the value axis was measured against.
 *
 * Width is nominal: only in-plot fractions are taken from it, so the chart
 * stays fluid. Height is real and is applied to the rendered box.
 */
export const COLUMN_CHART_BOX: Rect = { x: 0, y: 0, width: 372, height: 128 };

export type CartesianLayoutInput = {
  box: Rect;
  orientation: CartesianOrientation;
  categoryAxis: AxisLayoutStyle & { labelDisplayUnits?: string | number; labelPrecision?: number };
  valueAxis: AxisLayoutStyle & { labelDisplayUnits?: string | number; labelPrecision?: number };
  categories: readonly string[];
  dataMax: number;
  innerPadding?: number;
  /** Used when the axis declares no title text, matching the renderer's own fallbacks. */
  valueAxisTitleFallback?: string;
  categoryAxisTitleFallback?: string;
};

/**
 * Computes one layout for one visual instance. Not a React hook despite
 * reading like one at the call site — it holds no state and may be called
 * freely during render.
 */
export function useCartesianLayout(input: CartesianLayoutInput): ChartLayout {
  const {
    box,
    orientation,
    categoryAxis,
    valueAxis,
    categories,
    dataMax,
    innerPadding = 0,
    valueAxisTitleFallback = "",
    categoryAxisTitleFallback = "",
  } = input;

  return computeChartLayout({
    outer: box,
    orientation,
    // The engine measures whatever title text will actually render, which
    // is the resolved text or the renderer's fallback.
    categoryAxis: { ...categoryAxis, titleText: String(categoryAxis.titleText) || categoryAxisTitleFallback },
    valueAxis: { ...valueAxis, titleText: String(valueAxis.titleText) || valueAxisTitleFallback },
    categories,
    dataMax,
    innerPadding,
    // The gutter must be as wide as the label the renderer draws, so the
    // engine is handed the renderer's own formatter.
    formatTick: (value) => formatValue(value, valueAxis.labelDisplayUnits, valueAxis.labelPrecision),
  });
}

/**
 * A value's position as a 0..1 fraction of the plot, measured from the
 * plot's origin edge — the bottom for a vertical chart, the left for a
 * horizontal one. This is the single conversion from engine coordinates to
 * the CSS percentages gridlines, marks and labels all use, so they cannot
 * drift from one another.
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

/** A category slot as left/width percentages of the plot, for the DOM. */
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
