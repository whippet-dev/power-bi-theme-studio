import {
  computeChartLayout,
  estimateText,
  legendExtent,
  visualTitleExtent,
  type LegendLayoutStyle,
  type AxisLayoutStyle,
  type CartesianOrientation,
  type ChartLayout,
  type Rect,
  type TextMeasure,
} from "../../lib/chartLayout";
import { canvasTextMeasure } from "../../lib/canvasTextMeasure";
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
 * ## The natural chart boxes
 *
 * Each cartesian preview is drawn into a fixed rectangle and the engine
 * carves the axis gutters out of it. *Fixed* is the deliberate part, and it
 * is how Power BI's own container behaves: `getVisualViewport` in the
 * Desktop bundle (2.157.879.0, 26.08) takes the container's authored width
 * and height as INPUTS and returns `width - padding` and `height - padding
 * - title - subtitle - divider - banners`. Formatting only ever subtracts.
 * Nothing in that path measures content and grows the container back, and
 * the bundle has no auto-size-to-content route for a visual at all.
 *
 * So these boxes must not react to the theme. A larger axis font widens the
 * gutter and shrinks the plot — that is the consequence a theme preview
 * exists to show, and growing the box to cancel it out would hide the very
 * thing the user is looking at. Category count is fixed for the same
 * reason: adding categories to a Power BI bar chart makes the bars
 * thinner, it does not make the visual taller.
 *
 * What a fixed box does owe is enough room that the shipped themes stay
 * legible inside it. That floor is `minimumPlotHeight`: every division of
 * the plot — a category row on a bar chart, a tick interval on a column or
 * line chart — must be at least one line of the labels stacked down it.
 * Which axis those come from follows from the orientation: a bar chart's
 * rows are its CATEGORY labels, while a column or line chart's height is
 * divided by its VALUE axis's tick labels and its categories run along the
 * width.
 * `tests/cartesianBoxes.test.ts` holds every shipped base to it, so the
 * next typography change fails a test instead of quietly compressing the
 * plot. That is how the bar chart's 84 came to be a third too short. It was
 * sized against undersized fallback typography; text-class inheritance then
 * corrected where that typography comes from, and the proven point-to-pixel
 * conversion materially raised the text budget the gutters spend. Both were
 * right, and nothing was watching the remainder. (Font-face aliases did not
 * contribute: `estimateText` ignores the family, so alias expansion moves no
 * gutter — see the audit's §4.6.)
 */

/**
 * The floor the three boxes are chosen against: `divisions` slices of plot,
 * each at least one line of text at `axisLabelFontSizeCssPx` — which must
 * be the size of the axis whose labels divide the HEIGHT, not whichever
 * axis is nearest to hand. See the note above.
 *
 * Deliberately NOT called on the layout path. Making a box depend on the
 * measurements taken inside it is the circularity described above; this
 * exists so that the rule the comments claim and the rule the tests
 * enforce are one expression rather than two that can drift.
 */
export function minimumPlotHeight(divisions: number, axisLabelFontSizeCssPx: number): number {
  return divisions * estimateText("", axisLabelFontSizeCssPx, "").height;
}

/**
 * The column chart's natural chart box. Replaces `.column-preview__plot`'s
 * `height: 128px`, which CSS owned and the geometry could not see. Same
 * total footprint as before; the difference is that the engine now carves
 * the axis gutters *out* of it, where the old CSS let the category labels
 * eat into the plot the value axis was measured against.
 *
 * Re-checked, not merely inherited: 128 clears `minimumPlotHeight` in every
 * measured condition, leaving 84.4-86.2 units of plot and so a 21.1-21.6
 * unit tick interval against a 16.2-18.9 unit value-axis line. The
 * fixed-box model asks nothing of it, so it stands.
 *
 * Width is nominal: only in-plot fractions are taken from it, so the chart
 * stays fluid. Height is real and is applied to the rendered box.
 */
export const COLUMN_CHART_BOX: Rect = { x: 0, y: 0, width: 372, height: 128 };

/**
 * The bar chart's **authored** size — the dimensions ChartLayout and the
 * renderer believe the Power BI visual has.
 *
 * Not the same thing as how large Theme Studio displays it. The finished
 * visual is scaled uniformly into whatever space the tile has (see
 * `PreviewShell`), and that scale never feeds back into layout: gutters,
 * typography, the category scale and the marks are all computed here, at
 * this size, once.
 *
 * **450 × 250**, up from 372 × 128. The old box was measurably too small
 * for a full-furniture preview. Native Classic 2026 at 450 × 250 still
 * renders everything — twelve bars, four categories, legend, value labels,
 * both axis titles — while at 372 × 128 it shows six bars, two categories,
 * no legend and no value labels (POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.12).
 * So the previous box asked this renderer to keep furniture Power BI
 * itself sheds at that size, and the axis gutter alone was taking 26% of
 * the width. Authoring at a size Power BI would keep everything at, then
 * scaling the result, is the composition Power BI users actually see.
 *
 * Width is REAL here, not nominal: the renderer applies it, so the
 * authored geometry can be measured and compared with native directly.
 *
 * Previous rationale, still true of the height it replaced:
 *
 * Replaces a coordinate system that was never really a box at all:
 * `.bar-row`'s `grid-template-columns: 68px minmax(80px,1fr) 28px`, with
 * the value axis inset by a TypeScript constant hand-copied from it
 * (RENDERER_AUDIT §2.3).
 *
 * 128, the same as the column chart: a clustered bar is the transpose of a
 * clustered column over the same four categories, so an equal footprint is
 * the expected answer rather than a coincidence, and 128 is already proven
 * to fit both the hero and the thumbnail because the column charts render
 * at it today.
 *
 * It replaces 84, which was back-computed to preserve the pre-engine
 * layout's ~57px of plot — the one thing a fixed box must not do. By
 * time the gutters carried real text-class families at real pixel sizes,
 * 84 left the four rows 40.4-42.2 units of plot across the shipped bases:
 * a 10.1-10.6 unit slot for a label needing 18.0-18.9, so every row was
 * shorter than its own text. 128 clears `minimumPlotHeight` in each
 * measured condition with room to spare.
 *
 */
export const BAR_CHART_BOX: Rect = { x: 0, y: 0, width: 450, height: 250 };

/**
 * The line chart's natural chart box. Replaces `.line-preview__plot`'s
 * `height: 120px` plus an SVG that carried its own abstract 100x100
 * coordinate space — a space in which a point's y was `100 - value`, so a
 * value of 68 sat 68% up the plot while its own axis said 68000/70000 =
 * 97%. The engine now owns both axes and the SVG draws in the plot's
 * coordinates (RENDERER_AUDIT §4.5).
 *
 * 150 was arrived at by growing the box to give a new gutter its space
 * back — the compensating move the model above rejects, applied once by
 * hand before there was a model to reject it. The number survives on its
 * own merits rather than on that reasoning: it leaves 106.4-108.2 units of
 * plot, a 26.6-27.1 unit tick interval against a 16.2-18.9 unit value-axis
 * line, and so clears `minimumPlotHeight` by the widest margin of the three.
 * The line chart also has the most in-plot furniture to keep clear of — markers,
 * series labels and their leaders — which is the reason to keep the extra
 * height now that plot preservation is no longer one.
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
  /**
   * Overrides the measurer. Left unset, previews measure with the browser's
   * own metrics (`canvasTextMeasure`), which fall back to the engine's
   * deterministic estimator wherever there is no canvas — so a node test
   * that passes nothing still gets `estimateText`.
   *
   * Pass one to pin the measurement: to observe WHICH font the boundary is
   * handed, or to compare against the engine on equal terms.
   */
  measureText?: TextMeasure;
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
function inCssPixels<
  T extends {
    fontSize: number;
    titleFontSize: number;
    fontFamily: string;
    titleFontFamily: string;
    fontFamilyCss?: string;
    titleFontFamilyCss?: string;
  },
>(axis: T): T {
  return {
    ...axis,
    fontSize: themeFontSizeToCssPx(axis.fontSize),
    titleFontSize: themeFontSizeToCssPx(axis.titleFontSize),
    // The engine hands the family to `measureText`, so it must receive the
    // same family the browser paints — the style model's effective value,
    // never a re-derivation from the string, which cannot tell an explicit
    // `visualStyles` family from an inherited text-class one. Today's
    // `estimateText` ignores the family, so this changes no number; the
    // boundary exists so a future measurer cannot silently disagree with
    // the renderer.
    fontFamily: axis.fontFamilyCss ?? axis.fontFamily,
    titleFontFamily: axis.titleFontFamilyCss ?? axis.titleFontFamily,
  };
}

/**
 * How much of the authored visual a renderer-owned legend takes.
 *
 * The authored size describes the WHOLE visual, the way Power BI's own
 * 450 × 250 does. The legend is drawn by the preview rather than by
 * ChartLayout, so it has to come out of that budget before the chart is
 * laid out — otherwise the chart is given the whole visual, the legend is
 * added outside it, and the finished result is taller than the size it
 * claims to be. That is exactly the boundary error this replaced: an
 * authored 450 × 250 whose DOM measured 450 × 317.
 *
 * A thin adapter over `legendExtent`, which is the one implementation of
 * what a legend costs — the engine reserves its own legend rect with the
 * same call. There is no second copy to drift. All this adds is the
 * theme's point-to-pixel conversion, because the engine is given CSS
 * pixels and a style object is not.
 */
export function legendBandExtent(
  legend: LegendLayoutStyle | undefined,
  entryLabels: readonly string[],
  measure: TextMeasure = canvasTextMeasure,
): { width: number; height: number } {
  if (!legend?.show) return { width: 0, height: 0 };
  const band = legendExtent(
    { ...legend, fontSize: themeFontSizeToCssPx(legend.fontSize) },
    entryLabels,
    measure,
  );
  return { width: band.width, height: band.height };
}

/**
 * The rectangle ChartLayout is given, once renderer-owned chrome has been
 * taken out of the authored visual.
 */
export function authoredInnerBox(box: Rect, chrome: { width: number; height: number }): Rect {
  return {
    x: box.x,
    y: box.y,
    width: Math.max(0, box.width - chrome.width),
    height: Math.max(0, box.height - chrome.height),
  };
}

/**
 * The visual title's band, in the authored visual's own pixels.
 *
 * A thin adapter over `visualTitleExtent`, adding only the theme's
 * point-to-pixel conversion — the same relationship `legendBandExtent` has
 * with `legendExtent`. The caller subtracts this from the authored budget
 * AND applies it to the rendered band, so the two cannot differ.
 */
export function visualTitleBandExtent(
  title: { show: boolean; text: string; fontSize: number; fontFamily: string } | undefined,
  fallbackText: string,
  measure: TextMeasure = canvasTextMeasure,
): { width: number; height: number } {
  if (!title?.show) return { width: 0, height: 0 };
  const band = visualTitleExtent(
    {
      show: true,
      text: String(title.text ?? "") || fallbackText,
      fontSize: themeFontSizeToCssPx(title.fontSize),
      fontFamily: title.fontFamily,
    },
    measure,
  );
  return { width: 0, height: band.height };
}

/** Two renderer-owned chrome bands, summed for the authored budget. */
export function authoredChromeExtent(
  bands: ReadonlyArray<{ width: number; height: number }>,
): { width: number; height: number } {
  return bands.reduce(
    (total, band) => ({ width: total.width + band.width, height: total.height + band.height }),
    { width: 0, height: 0 },
  );
}

/**
 * The rendered visual-title band: exactly the height that was reserved, and
 * the title styling the theme resolved.
 */
export function visualTitleStyle(
  title: { fontSize: number; fontFamily: string; fontColor?: string; alignment?: string | number; bold?: boolean; italic?: boolean; underline?: boolean; background?: string } | undefined,
  band: { height: number },
): Record<string, string | number | undefined> {
  return {
    height: band.height,
    fontSize: title ? themeFontSizeToCssPx(title.fontSize) : undefined,
    fontFamily: title?.fontFamily,
    color: title?.fontColor,
    backgroundColor: title?.background,
    textAlign: title?.alignment === undefined ? undefined : String(title.alignment),
    fontWeight: title?.bold ? 700 : 400,
    fontStyle: title?.italic ? "italic" : "normal",
    textDecoration: title?.underline ? "underline" : "none",
  };
}

/** The band a renderer-owned legend occupies, as an inline style. */
export function legendBandStyle(band: { width: number; height: number }): { width?: number; height?: number } {
  if (band.width > 0) return { width: band.width };
  if (band.height > 0) return { height: band.height };
  return {};
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
    measureText,
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
    // The browser draws the text, so the browser measures it. `estimateText`
    // assumes 0.55em per glyph and is out by up to 21.5% on the strings
    // these previews draw, which lands directly in the axis gutters.
    measureText: measureText ?? canvasTextMeasure,
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
export { categoryCentre, categoryPercent, categoryWidthPercent, clampedValueCoordinate, valueFraction } from "../../lib/chartLayout";
