import {
  computeChartLayout,
  type AxisLayoutStyle,
  type CartesianOrientation,
  type ChartLayout,
  type Rect,
} from "../../lib/chartLayout";
import { themeFontSizeToCssPx } from "../../lib/fontUnits";
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

/**
 * The bar chart's natural chart box. Replaces a coordinate system that was
 * never really a box at all: `.bar-row`'s `grid-template-columns: 68px
 * minmax(80px,1fr) 28px`, with the value axis inset by a TypeScript
 * constant hand-copied from it (RENDERER_AUDIT §2.3).
 *
 * 84 rather than the column chart's 128 because a bar chart's four rows
 * read across, not up: the old layout gave them ~57px of plot, and this
 * keeps the visual footprint close while letting the engine own the
 * gutters. Width is nominal, as above.
 */
export const BAR_CHART_BOX: Rect = { x: 0, y: 0, width: 372, height: 84 };

/**
 * The line chart's natural chart box. Replaces `.line-preview__plot`'s
 * `height: 120px` plus an SVG that carried its own abstract 100x100
 * coordinate space — a space in which a point's y was `100 - value`, so a
 * value of 68 sat 68% up the plot while its own axis said 68000/70000 =
 * 97%. The engine now owns both axes and the SVG draws in the plot's
 * coordinates (RENDERER_AUDIT §4.5).
 *
 * 150 rather than the column chart's 128 because the line's plot used to
 * be 120 with its tick labels overlaying the space to its left; giving the
 * value axis a real gutter needs that space back.
 *
 * Width is nominal, as above: the rendered box is CSS-fluid (measured at
 * 370 natural units), and every consumer of it — slot centres, gridline
 * offsets, the SVG viewBox — takes a ratio of the plot, so the nominal
 * figure cancels out.
 */
export const LINE_CHART_BOX: Rect = { x: 0, y: 0, width: 372, height: 150 };

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
 * Computes one layout for one visual instance. Named for what it does:
 * an earlier `useCartesianLayout` read as a React hook while holding no
 * state and obeying none of the rules of hooks.
 */
/**
 * The same axis style with its font sizes in CSS pixels.
 *
 * Only the two the engine measures with are converted; everything else is
 * passed through, so this cannot quietly change an unrelated field.
 */
function inCssPixels<T extends { fontSize: number; titleFontSize: number }>(axis: T): T {
  return {
    ...axis,
    fontSize: themeFontSizeToCssPx(axis.fontSize),
    titleFontSize: themeFontSizeToCssPx(axis.titleFontSize),
  };
}

export function computePreviewCartesianLayout(input: CartesianLayoutInput): ChartLayout {
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
    // is the resolved text or the renderer's fallback — and at the size the
    // browser will actually draw it. `inCssPixels` converts the theme's
    // points here, at the single measurement boundary, because a gutter
    // sized against 10 while the label renders at 13.333 is exactly the
    // geometry drift ChartLayout exists to prevent.
    categoryAxis: inCssPixels({
      ...categoryAxis,
      titleText: String(categoryAxis.titleText) || categoryAxisTitleFallback,
    }),
    valueAxis: inCssPixels({
      ...valueAxis,
      titleText: String(valueAxis.titleText) || valueAxisTitleFallback,
    }),
    categories,
    dataMax,
    innerPadding,
    // The gutter must be as wide as the label the renderer draws, so the
    // engine is handed the renderer's own formatter.
    formatTick: (value) => formatValue(value, valueAxis.labelDisplayUnits, valueAxis.labelPrecision),
  });
}

/**
 * Coordinate conversions live with the engine (they are pure functions of a
 * ChartLayout, and ChartParts' layout-aware furniture needs them too).
 * Re-exported here so a preview has one import for its layout concerns.
 */
export { categoryCentre, categoryPercent, clampedValueCoordinate, valueFraction } from "../../lib/chartLayout";
