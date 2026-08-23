/**
 * Constant ("reference") lines: the pure half.
 *
 * Power BI gives a cartesian visual several constant-line groups —
 * `referenceLine`, `xAxisReferenceLine`, `y1AxisReferenceLine` — each a
 * line at a fixed position on one axis, optionally with a shaded region on
 * one side of it and a data label. `BAR_CHART_PREVIEW_COVERAGE_PILOT.md`
 * §3.5 found them to be the single largest coverage gap in the app: 57 of
 * 111 bar-chart gap properties.
 *
 * Everything here is a pure function of already-resolved style values and
 * an already-computed `ChartLayout`. No React, no DOM, no theme JSON, no
 * property resolution, no knowledge of any sample-data maximum. The
 * renderer decides *which* axis a group belongs to and hands the resolved
 * group over; this module works out the geometry and the text; and
 * `ConstantLine` in ChartParts draws the result.
 *
 * That split is deliberate: geometry and text composition are exactly the
 * parts worth testing under `node --test`, and they are the parts that
 * would otherwise be retyped once per chart family.
 */

import { axisRange, valueFraction, type AxisLayoutStyle, type ChartLayout } from "./chartLayout";

/**
 * The fields every constant-line group shares.
 *
 * Declared structurally rather than imported from a chart's resolved-style
 * type, because the three groups are *not* the same type: `value` is a
 * number in `referenceLine` and `y1AxisReferenceLine` but a string in
 * `xAxisReferenceLine`, whose schema description is "numeric or date time
 * value according to x-axis type". Accepting both here lets one primitive
 * serve all three without a cast that would not be sound.
 */
export type ConstantLineStyle = {
  show: boolean;
  lineColor: string;
  style: string | number;
  width: number;
  transparency: number;
  value: string | number;
  displayName: string | number;
  position: string | number;
  autoScale: boolean;
  dashArray: string;
  dashCap: string | number;
  shadeShow: boolean;
  shadeColor: string;
  shadeColorMatchStroke: boolean;
  shadeRegion: string | number;
  shadeTransparency: number;
  dataLabelShow: boolean;
  dataLabelColor: string;
  dataLabelText: string | number;
  dataLabelDisplayUnits: string | number;
  dataLabelDecimalPoints: number;
  dataLabelHorizontalPosition: string | number;
  dataLabelVerticalPosition: string | number;
};

/** Where a constant line and its shade sit, as fractions of the plot. */
export type ConstantLineGeometry = {
  /**
   * The line's position, 0..1 from the plot's origin edge — the same
   * fraction gridlines and marks use, so they cannot disagree.
   */
  fraction: number;
  /**
   * False when the value falls outside the displayed axis range. The line
   * and its label are not drawn then; see `constantLineGeometry`.
   */
  onPlot: boolean;
  /**
   * The shaded region as an ordered, plot-clamped fraction pair, or null
   * when nothing should be shaded. `from` is always <= `to`.
   */
  shade: { from: number; to: number } | null;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * Turns a resolved constant-line group into plot fractions.
 *
 * **Out-of-range values.** A constant line's value can sit outside the
 * displayed range — trivially so once an axis is pinned with Start/End.
 * Power BI's own behaviour depends on its data engine: with an auto axis
 * it widens the range to include the line, and with a pinned axis it
 * cannot, so the line is simply not in view. A *formatting* preview must
 * not reproduce the first half of that: letting a reference line widen the
 * axis would make `ChartLayout`'s range depend on a decoration, and the
 * bars, gridlines and ticks would all move when the line moved. So the
 * preview reproduces the pinned-axis behaviour in both cases — the range
 * is whatever the axis says, and a line outside it is not drawn.
 *
 * The *shade* is different, and is not suppressed. "After the line" is a
 * well-defined region even when the line itself is off-plot: if the value
 * sits below the whole range then everything visible is after it, and
 * shading the entire plot is the truthful answer. So the shade's boundary
 * is clamped to the plot rather than hidden, which also means the shade
 * degrades continuously as the value is dragged off-scale instead of
 * vanishing at the edge.
 */
export function constantLineGeometry(
  line: ConstantLineStyle,
  layout: ChartLayout,
  valueAxis: AxisLayoutStyle,
  dataMax: number,
): ConstantLineGeometry {
  const value = Number(line.value);
  const finite = Number.isFinite(value);
  const fraction = finite ? valueFraction(layout, value) : 0;
  // A small tolerance so a line sitting exactly on an edge still counts as
  // on the plot — a reference line at 0 against a 0-based axis is ordinary.
  const onPlot = finite && fraction >= -1e-9 && fraction <= 1 + 1e-9;

  return { fraction, onPlot, shade: constantLineShade(line, layout, valueAxis, dataMax) };
}

/**
 * The shaded region, in the same fractions as the line.
 *
 * **Before/after under `invertAxis`.** "Before" is the side of the line
 * towards the axis's *start* and "after" the side towards its *end* —
 * a statement about the axis's own direction, not about left and right.
 * Inverting the axis puts the start on the opposite physical side, and
 * "before" must follow it there.
 *
 * That falls out of the scale rather than being coded twice: both bounds
 * are converted with the same `valueFraction`, which already honours
 * `invertAxis`, and the pair is then ordered by `Math.min`/`Math.max`. No
 * branch anywhere swaps left for right, so the two axes' behaviour cannot
 * drift apart.
 */
function constantLineShade(
  line: ConstantLineStyle,
  layout: ChartLayout,
  valueAxis: AxisLayoutStyle,
  dataMax: number,
): { from: number; to: number } | null {
  const region = String(line.shadeRegion).toLowerCase();
  if (!line.shadeShow || region === "none") return null;

  const value = Number(line.value);
  if (!Number.isFinite(value)) return null;

  const { start, end } = axisRange(valueAxis, dataMax);
  const lineAt = valueFraction(layout, value);
  const boundary = valueFraction(layout, region === "before" ? start : end);

  const from = clamp01(Math.min(lineAt, boundary));
  const to = clamp01(Math.max(lineAt, boundary));
  // A zero-width band is nothing to paint, and painting it would put a
  // stray 0%-wide element in the DOM for every unshaded line.
  return to - from > 1e-9 ? { from, to } : null;
}

/** True when `position` asks for the line to paint over the data marks. */
export function constantLineIsFront(line: ConstantLineStyle): boolean {
  return String(line.position).toLowerCase() === "front";
}

/**
 * The label's text.
 *
 * `dataLabelText` picks between the value, the line's name, and both. The
 * name is free text and is routinely left blank, so a "Name"-only label
 * would otherwise render as an empty box that looks like a bug; falling
 * back to the formatted value keeps the label meaningful, which is also
 * what makes the three modes visibly distinct rather than two-and-a-blank.
 *
 * `formatValue` is the same formatter the axis ticks and data labels use,
 * so a display-unit or precision choice reads consistently across the
 * whole chart.
 */
export function constantLineLabelText(
  line: ConstantLineStyle,
  formatValue: (value: number, displayUnits?: string | number, precision?: number) => string,
): string {
  const mode = String(line.dataLabelText).toLowerCase();
  const name = String(line.displayName ?? "").trim();
  const numeric = Number(line.value);
  const formatted = Number.isFinite(numeric)
    ? formatValue(numeric, line.dataLabelDisplayUnits, line.dataLabelDecimalPoints)
    : String(line.value ?? "");

  if (mode === "name") return name || formatted;
  if (mode === "valueandname") return name ? `${name} ${formatted}` : formatted;
  return formatted;
}

/**
 * The SVG dash pattern for a line, in pixels.
 *
 * Returns undefined for a solid line, which is what `stroke-dasharray`
 * wants for "no dashes" — an empty string would also work but undefined
 * keeps the attribute off the element entirely.
 *
 * A custom `dashArray` is honoured verbatim rather than being collapsed
 * back to a generic dashed line: the schema documents it as
 * "space-separated values for dash and gap lengths in pixels", and a theme
 * author who wrote one wants to see that pattern, not an approximation of
 * it. It also wins over `style` when both are set, matching how the same
 * pair is treated elsewhere in the app.
 *
 * `autoScale` — "automatically adjust the spacing between dashes and dots
 * based on line width" — multiplies every length by the line width, so a
 * thick dashed line gets proportionally longer dashes instead of a dense
 * scribble. Without it the pattern is in absolute pixels.
 */
export function constantLineDashArray(line: ConstantLineStyle): string | undefined {
  const custom = String(line.dashArray ?? "").trim();
  const style = String(line.style).toLowerCase();

  const pattern = custom
    ? custom.split(/[\s,]+/).map(Number).filter(Number.isFinite)
    : style === "dashed"
      ? [6, 4]
      : style === "dotted"
        ? [1.5, 3]
        : [];

  if (pattern.length === 0) return undefined;
  if (!line.autoScale) return pattern.join(" ");

  const scale = Math.max(1, Number(line.width) || 1);
  return pattern.map((length) => Number((length * scale).toFixed(3))).join(" ");
}

/** `dashCap` in SVG's vocabulary. "none" is a flat cap, i.e. butt. */
export function constantLineCap(line: ConstantLineStyle): "butt" | "round" | "square" {
  const cap = String(line.dashCap).toLowerCase();
  if (cap === "round") return "round";
  if (cap === "square") return "square";
  return "butt";
}
