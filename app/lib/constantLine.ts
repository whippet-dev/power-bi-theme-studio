/**
 * Constant ("reference") lines: the pure half.
 *
 * Power BI gives a cartesian visual several constant-line groups —
 * `referenceLine`, `xAxisReferenceLine`, `y1AxisReferenceLine` — each a
 * line at a fixed position on one axis, optionally with a shaded region on
 * one side of it and a data label. A property-coverage trace of the whole
 * 297-property clusteredBarChart registry found these to be the single
 * largest gap in the app: 57 of the 111 bar-chart properties that should
 * render and did not.
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
/**
 * Whether a value's fraction lands on the plot at all.
 *
 * The rule for "this line has somewhere to be drawn", shared so every
 * caller agrees. A small tolerance keeps a line sitting exactly on an edge
 * on the plot — a reference line at 0 against a 0-based axis is ordinary,
 * not a boundary case.
 *
 * `valueFraction` stays unclamped on purpose: furniture needs to know where
 * a value WOULD be. This is the separate question of whether it is visible,
 * and it is the one a renderer must ask before painting a line, because an
 * out-of-range reference line otherwise paints over the axis below or the
 * title above. Measured at Start=30000 with the line below it: bottom
 * -145%, 302.8px below the plot.
 */
export function fractionIsOnPlot(fraction: number): boolean {
  return Number.isFinite(fraction) && fraction >= -1e-9 && fraction <= 1 + 1e-9;
}

export function constantLineGeometry(
  line: ConstantLineStyle,
  layout: ChartLayout,
  valueAxis: AxisLayoutStyle,
  dataMax: number,
): ConstantLineGeometry {
  const value = Number(line.value);
  const finite = Number.isFinite(value);
  const fraction = finite ? valueFraction(layout, value) : 0;
  const onPlot = finite && fractionIsOnPlot(fraction);

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
 * The built-in patterns for the named line styles, in pixels.
 *
 * Representative rather than measured: Power BI documents Solid, Dashed,
 * Dotted and Custom as four distinct styles but does not publish the exact
 * pattern behind the named three. These read correctly as dashed and dotted
 * at preview scale, which is what a formatting preview needs; the
 * relationship to Power BI's own pattern is approximate.
 */
const NAMED_DASH_PATTERNS: Readonly<Record<string, readonly number[]>> = {
  dashed: [6, 4],
  dotted: [1.5, 3],
};

/**
 * A user-supplied dash array, or null when it is not a pattern we can draw.
 *
 * Rejects the whole list if any entry is negative or unparseable, rather than
 * dropping the bad entries and emitting the rest. That follows SVG's own rule
 * — a dash array containing a negative value is in error and the stroke is
 * rendered as if none had been specified — and it is the safer reading of a
 * half-typed value: showing a pattern the author did not write would be worse
 * than showing none.
 *
 * Zeros are kept. SVG allows them and they are load-bearing: `0 6` with round
 * caps is how a dotted run is built, and dash-dot patterns use them too. An
 * all-zero list is the one exception, since SVG renders that as a solid line.
 *
 * Whitespace and commas both separate, matching what the editor's text field
 * accepts.
 */
function parseDashArray(raw: string | number | undefined): number[] | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const parts = text.split(/[\s,]+/).map(Number);
  if (parts.some((length) => !Number.isFinite(length) || length < 0)) return null;
  return parts;
}

/**
 * The SVG dash pattern for a line, in pixels, or undefined for a solid one.
 *
 * **`style` is the controlling property.** Solid, Dashed, Dotted and Custom are
 * four distinct styles, and `dashArray` is the pattern belonging to Custom —
 * not an override that applies to all four. A theme legitimately keeps values
 * for properties that are not currently active, so a `dashArray` left behind
 * from an earlier Custom setting must not turn a Solid line dashed. The
 * preview obeys the style the user selected and reads the sibling properties
 * only when that style is the one they belong to.
 *
 * A Custom style with no usable dash array has no pattern to draw, so it
 * renders solid. It deliberately does not fall back to the named Dashed
 * pattern: inventing a pattern the author never wrote would misrepresent the
 * theme, and an empty custom pattern is genuinely empty.
 *
 * `autoScale` — "automatically adjust the spacing between dashes and dots
 * based on line width" — multiplies every length by the line width, so a thick
 * patterned line gets proportionally longer dashes instead of a dense
 * scribble. It applies to whichever pattern is active, named or custom, and
 * has nothing to scale on a solid line.
 */
export function constantLineDashArray(line: ConstantLineStyle): string | undefined {
  const style = String(line.style).toLowerCase();
  if (style === "solid") return undefined;

  const pattern = style === "custom" ? parseDashArray(line.dashArray) : NAMED_DASH_PATTERNS[style];
  // An unrecognised style has no pattern either, so it draws solid rather
  // than falling through to whatever a sibling property happens to hold.
  if (!pattern || pattern.length === 0) return undefined;
  if (pattern.every((length) => length === 0)) return undefined;

  if (!line.autoScale) return pattern.join(" ");
  const scale = Math.max(1, Number(line.width) || 1);
  return pattern.map((length) => Number((length * scale).toFixed(3))).join(" ");
}

/**
 * The visible line cap.
 *
 * `dashCap` is a Custom-pattern option, so it is read only when Custom is the
 * selected style — the same stale-sibling rule as `dashArray`. Letting a
 * leftover "Round" reshape a named Dashed line would be the same defect in a
 * different property.
 *
 * The named styles use a flat cap. That is a stable representative default
 * rather than an observed one: Power BI does not document a cap for Solid,
 * Dashed or Dotted, and this preview has no way to measure it, so recording it
 * as approximate is more honest than pretending the Custom setting carries
 * over.
 */
export function constantLineCap(line: ConstantLineStyle): "butt" | "round" | "square" {
  if (String(line.style).toLowerCase() !== "custom") return "butt";
  const cap = String(line.dashCap).toLowerCase();
  if (cap === "round") return "round";
  if (cap === "square") return "square";
  return "butt";
}
