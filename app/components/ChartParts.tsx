import type { CSSProperties, ReactNode } from "react";
import { hexWithAlpha } from "../lib/colorUtils";
import { themeFontSizeToCssPx } from "../lib/fontUnits";
import { categoryPercent, valueFraction, type ChartLayout } from "../lib/chartLayout";
import {
  constantLineCap,
  constantLineDashArray,
  constantLineIsFront,
  constantLineLabelText,
  type ConstantLineGeometry,
  type ConstantLineStyle,
} from "../lib/constantLine";

/**
 * Shared chart furniture — legend, axis ticks, gridlines, label
 * formatting. Bar, column, stacked bar, stacked column, and line charts
 * all expose these same groups with the same field names, so rendering
 * them once here keeps the five previews consistent and means a fix
 * lands everywhere instead of in one copy.
 */

/** The subset of a legend group every chart shares. */
export type LegendStyle = {
  show: boolean;
  position: string | number;
  showTitle: boolean;
  titleText: string;
  labelColor: string;
  fontFamily: string;
  /**
   * The family the preview should paint. Supplied by the style model, which
   * is the only layer that knows whether the value came from `visualStyles`
   * (literal) or from a text class (already expanded). Absent for the text
   * that has no text-class role yet, where the raw family is correct.
   */
  fontFamilyCss?: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

/** The subset of an axis group every cartesian chart shares. */
export type AxisStyle = {
  show: boolean;
  labelColor: string;
  fontFamily: string;
  /**
   * The family the preview should paint. Supplied by the style model, which
   * is the only layer that knows whether the value came from `visualStyles`
   * (literal) or from a text class (already expanded). Absent for the text
   * that has no text-class role yet, where the raw family is correct.
   */
  fontFamilyCss?: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  showAxisTitle: boolean;
  titleText: string;
  titleColor: string;
  titleFontFamily: string;
  /**
   * The family the preview should paint. Supplied by the style model, which
   * is the only layer that knows whether the value came from `visualStyles`
   * (literal) or from a text class (already expanded). Absent for the text
   * that has no text-class role yet, where the raw family is correct.
   */
  titleFontFamilyCss?: string;
  titleFontSize: number;
  titleBold: boolean;
  titleItalic: boolean;
  titleUnderline: boolean;
  gridlineShow: boolean;
  gridlineColor: string;
  gridlineThickness: number;
  gridlineStyle: string | number;
  gridlineTransparency?: number;
  gridlineDashArray?: string;
  gridlineDashCap?: string | number;
  // The schema types axis start/end as strings, not numbers.
  start?: string | number;
  end?: string | number;
  labelDisplayUnits?: string | number;
  labelPrecision?: number;
  invertAxis?: boolean;
};

export function mapLineStyle(value: string | number): "solid" | "dashed" | "dotted" {
  const normalized = String(value).toLowerCase();
  if (normalized === "dashed" || normalized === "custom") return "dashed";
  if (normalized === "dotted") return "dotted";
  return "solid";
}

export function mapTextAlign(value: string | number): CSSProperties["textAlign"] | undefined {
  const normalized = String(value).toLowerCase();
  if (normalized === "left" || normalized === "center" || normalized === "right") {
    return normalized as CSSProperties["textAlign"];
  }
  return undefined; // "Auto" — leave the per-column default alignment alone.
}

/** Text styling shared by axis tick labels and legend entries. */
export function textStyle(source: {
  labelColor?: string;
  color?: string;
  fontFamily: string;
  fontFamilyCss?: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}): CSSProperties {
  return {
    color: source.labelColor ?? source.color,
    fontFamily: (source.fontFamilyCss ?? source.fontFamily) || undefined,
    fontSize: themeFontSizeToCssPx(source.fontSize),
    fontWeight: source.bold ? 700 : 400,
    fontStyle: source.italic ? "italic" : "normal",
    textDecoration: source.underline ? "underline" : "none",
  };
}

export function axisTitleStyle(axis: AxisStyle): CSSProperties {
  return {
    color: axis.titleColor,
    fontFamily: (axis.titleFontFamilyCss ?? axis.titleFontFamily) || undefined,
    fontSize: themeFontSizeToCssPx(axis.titleFontSize),
    fontWeight: axis.titleBold ? 700 : 400,
    fontStyle: axis.titleItalic ? "italic" : "normal",
    textDecoration: axis.titleUnderline ? "underline" : "none",
  };
}

/**
 * Power BI abbreviates axis and label values by display unit and fixes the
 * decimal places by precision. Previews that ignore both show a value that
 * contradicts the settings right next to them.
 */
export function formatValue(value: number, displayUnits?: string | number, precision?: number): string {
  const units: Record<string, [number, string]> = {
    "1": [1, ""],
    "1000": [1e3, "K"],
    "1000000": [1e6, "M"],
    "1000000000": [1e9, "bn"],
    "1000000000000": [1e12, "T"],
  };
  const explicit = units[String(displayUnits)];
  const [divisor, suffix] = explicit ?? (Math.abs(value) >= 1000 ? [1e3, "K"] : [1, ""]);
  const scaled = value / divisor;
  const decimals = typeof precision === "number" && precision > 0 ? precision : Number.isInteger(scaled) ? 0 : 1;
  return `${scaled.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

/** True when the legend sits beside the plot rather than above/below it. */
export function legendIsVertical(position: string | number): boolean {
  const p = String(position);
  return p.startsWith("Left") || p.startsWith("Right");
}

export function legendIsAfterPlot(position: string | number): boolean {
  const p = String(position);
  return p.startsWith("Bottom") || p.startsWith("Right");
}

/** Whether a legend position centres its entries along the available band. */
export function legendIsCentered(position: string | number): boolean {
  return String(position).endsWith("Center");
}

/** The inline alignment a horizontal legend uses within its full-width band. */
export function legendHorizontalAlignment(position: string | number): "flex-start" | "center" | "flex-end" {
  const p = String(position);
  if (p.endsWith("Center")) return "center";
  if (p.endsWith("Right")) return "flex-end";
  return "flex-start";
}

/**
 * The legend's Bold property belongs to its entries. A native legend title
 * is semibold by default, so it must not inherit the entries' explicit 400;
 * when Bold is on it still moves with the rest of the legend to 700.
 */
function legendTitleStyle(legend: LegendStyle): CSSProperties {
  const shared = textStyle(legend);
  return { ...shared, fontWeight: legend.bold ? 700 : undefined };
}

/**
 * A legend with one entry per series, honouring the title and all four
 * placements. Previously previews drew a single hardcoded swatch and only
 * distinguished top from bottom, so most legend settings did nothing.
 */
export function ChartLegend({
  legend,
  items,
}: {
  legend: LegendStyle;
  items: Array<{ label: string; color: string }>;
}): ReactNode {
  if (!legend.show) return null;
  const vertical = legendIsVertical(legend.position);
  const horizontalAlignment = legendHorizontalAlignment(legend.position);

  return (
    <span
      className={`chart-legend${vertical ? " chart-legend--vertical" : ""}`}
      style={vertical ? undefined : { justifyContent: horizontalAlignment }}
    >
      {legend.showTitle && (
        <span className="chart-legend__title" style={legendTitleStyle(legend)}>
          {String(legend.titleText) || "Series"}
        </span>
      )}
      <span
        className="chart-legend__entries"
      >
        {items.map((item) => (
          <span className="chart-legend__item" key={item.label}>
            <span className="chart-legend__swatch" style={{ backgroundColor: item.color }} />
            <span style={textStyle(legend)}>{item.label}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Power BI's data label is really three independently-styled parts —
 * Title (the category), Value, and Detail (a secondary measure) — each
 * with its own font, colour, transparency, display units and precision,
 * and each switchable. Previews that render a single value string leave
 * roughly 40 properties per chart with nothing to affect.
 */
export type DataLabelStyle = {
  show: boolean;
  color: string;
  fontFamily: string;
  /**
   * The family the preview should paint. Supplied by the style model, which
   * is the only layer that knows whether the value came from `visualStyles`
   * (literal) or from a text class (already expanded). Absent for the text
   * that has no text-class role yet, where the raw family is correct.
   */
  fontFamilyCss?: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  transparency: number;
  labelDisplayUnits: string | number;
  labelPrecision: number;
  labelPosition: string | number;
  labelContentLayout: string | number;
  labelContainerMaxWidth: number;
  // Not every chart's labels group carries this either (pie chart calls
  // its equivalent field just "overflow", handled separately in
  // VisualPreviews.tsx rather than through this shared component).
  labelOverflow?: boolean;
  // Not every chart's labels group carries these — the line chart has no
  // orientation or word-wrap setting, for instance.
  labelOrientation?: string | number;
  horizontalAlignment?: string | number;
  wordWrap?: boolean;
  enableBackground: boolean;
  backgroundColor: string;
  backgroundTransparency: number;
  enableTitleDataLabel: boolean;
  enableValueDataLabel: boolean;
  enableDetailDataLabel: boolean;
  titleColor: string;
  titleFontFamily: string;
  titleFontSize: number;
  titleBold: boolean;
  titleItalic: boolean;
  titleUnderline: boolean;
  titleTransparency: number;
  titleLabelDisplayUnits: string | number;
  titleLabelPrecision: number;
  detailColor: string;
  detailFontFamily: string;
  detailFontSize: number;
  detailBold: boolean;
  detailItalic: boolean;
  detailUnderline: boolean;
  detailTransparency: number;
  detailLabelDisplayUnits: string | number;
  detailLabelPrecision: number;
};

/** Text style for one part of a three-part data label. */
function labelPartStyle(part: {
  color: string;
  fontFamily: string;
  fontFamilyCss?: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  transparency: number;
}): CSSProperties {
  return {
    color: hexWithAlpha(part.color, part.transparency),
    fontFamily: (part.fontFamilyCss ?? part.fontFamily) || undefined,
    fontSize: themeFontSizeToCssPx(part.fontSize),
    fontWeight: part.bold ? 700 : 400,
    fontStyle: part.italic ? "italic" : "normal",
    textDecoration: part.underline ? "underline" : "none",
  };
}

/**
 * Renders a data label's enabled parts. `labelContentLayout` decides
 * whether they stack or sit on one line, and `labelOrientation` rotates
 * the whole label — both otherwise invisible settings.
 */
export function DataLabel({
  labels,
  category,
  value,
  detail,
}: {
  labels: DataLabelStyle;
  category: string;
  value: number;
  detail?: number;
}): ReactNode {
  if (!labels.show) return null;

  // If every part is switched off Power BI still shows the value —
  // otherwise turning labels on would display nothing at all.
  const showTitle = labels.enableTitleDataLabel;
  const showDetail = labels.enableDetailDataLabel && detail !== undefined;
  const showValue = labels.enableValueDataLabel || (!showTitle && !showDetail);

  const stacked = !/inline|horizontal/i.test(String(labels.labelContentLayout));
  const vertical = /vertical|rotate/i.test(String(labels.labelOrientation));
  const alignment = /left|right|center/i.test(String(labels.horizontalAlignment ?? ""))
    ? String(labels.horizontalAlignment).toLowerCase()
    : "left";

  return (
    <span
      className={`chart-label${stacked ? " chart-label--stacked" : ""}`}
      style={{
        ...labelPartStyle(labels),
        backgroundColor: labels.enableBackground
          ? hexWithAlpha(labels.backgroundColor, labels.backgroundTransparency)
          : undefined,
        padding: labels.enableBackground ? "1px 4px" : undefined,
        borderRadius: labels.enableBackground ? 3 : undefined,
        // The registry exposes Power BI's `labelContainerMaxWidth`, but the
        // repository contains no evidence for its unit or for what the
        // generated fallback `1` means. Passing it straight to CSS as
        // `max-width: 1px` made every enabled label a clipped sliver.
        // Preserve the resolved literal for editing/export, but leave it
        // unapplied until a native conversion is established.
        // "Overflow text" lets a label spill past its own container
        // instead of being clipped when it doesn't fit.
        overflow: labels.labelOverflow ? "visible" : "hidden",
        textOverflow: labels.labelOverflow ? "clip" : "ellipsis",
        textAlign: alignment as CSSProperties["textAlign"],
        alignItems: stacked
          ? alignment === "center"
            ? "center"
            : alignment === "right"
              ? "flex-end"
              : "flex-start"
          : undefined,
        whiteSpace: labels.wordWrap ? "normal" : "nowrap",
        writingMode: vertical ? "vertical-rl" : undefined,
      }}
    >
      {showTitle && (
        <span className="chart-label__title" style={labelPartStyle({ ...labels, color: labels.titleColor, fontFamily: labels.titleFontFamily, fontSize: labels.titleFontSize, bold: labels.titleBold, italic: labels.titleItalic, underline: labels.titleUnderline, transparency: labels.titleTransparency })}>
          {category}
        </span>
      )}
      {showValue && <span className="chart-label__value">{formatValue(value, labels.labelDisplayUnits, labels.labelPrecision)}</span>}
      {showDetail && (
        <span className="chart-label__detail" style={labelPartStyle({ ...labels, color: labels.detailColor, fontFamily: labels.detailFontFamily, fontSize: labels.detailFontSize, bold: labels.detailBold, italic: labels.detailItalic, underline: labels.detailUnderline, transparency: labels.detailTransparency })}>
          {formatValue(detail as number, labels.detailLabelDisplayUnits, labels.detailLabelPrecision)}
        </span>
      )}
    </span>
  );
}

export type CartesianDataLabelOrientation = "vertical" | "horizontal" | "point";

type CartesianDataLabelPlacement = {
  anchor: "start" | "center" | "end";
  transform: string;
  placement: "outside" | "inside-end" | "inside-center" | "inside-base" | "under";
};

/** Shared basic placement without collision or automatic fallback guesses. */
export function cartesianDataLabelPlacement(
  position: string | number,
  orientation: CartesianDataLabelOrientation,
  endPercent?: number,
): CartesianDataLabelPlacement {
  let value = String(position).toLowerCase();
  // `Auto` is a fit decision, not a fixed synonym for OutsideEnd. This is
  // intentionally a conservative preview rule rather than a claim about
  // Power BI's collision engine: flip only at the far value edge, where an
  // outside label would otherwise be clipped by the plot boundary.
  if (value === "auto" && endPercent !== undefined) {
    if (orientation === "point") value = endPercent < 15 ? "under" : "above";
    else value = endPercent > 85 ? "insideend" : "outsideend";
  }
  const insideCenter = value.includes("center");
  const insideBase = value.includes("base");
  const insideEnd = value.includes("inside") && !insideCenter && !insideBase;
  const under = value === "under" || value === "below";
  const anchor = insideBase ? "start" : insideCenter ? "center" : "end";

  if (orientation === "horizontal") {
    if (insideCenter) return { anchor, placement: "inside-center", transform: "translate(-50%, -50%)" };
    if (insideBase) return { anchor, placement: "inside-base", transform: "translate(4px, -50%)" };
    if (insideEnd) return { anchor, placement: "inside-end", transform: "translate(calc(-100% - 4px), -50%)" };
    if (under) return { anchor, placement: "under", transform: "translate(4px, 4px)" };
    return { anchor, placement: "outside", transform: "translate(4px, -50%)" };
  }

  if (orientation === "point") {
    if (insideCenter) return { anchor, placement: "inside-center", transform: "translate(-50%, -50%)" };
    if (under || insideEnd) return { anchor, placement: under ? "under" : "inside-end", transform: "translate(-50%, 4px)" };
    return { anchor, placement: insideBase ? "inside-base" : "outside", transform: "translate(-50%, calc(-100% - 2px))" };
  }

  if (insideCenter) return { anchor, placement: "inside-center", transform: "translate(-50%, 50%)" };
  if (insideBase) return { anchor, placement: "inside-base", transform: "translate(-50%, 0)" };
  if (insideEnd || under) return { anchor, placement: insideEnd ? "inside-end" : "under", transform: "translate(-50%, calc(100% + 2px))" };
  return { anchor, placement: "outside", transform: "translate(-50%, -2px)" };
}

type CartesianDataLabelProps = {
  labels: DataLabelStyle;
  category: string;
  value: number;
  detail?: number;
  orientation: CartesianDataLabelOrientation;
  /** Percentage measured from the value-axis origin (bottom/left). */
  startPercent: number;
  /** Percentage measured from the value-axis origin, or CSS top for points. */
  endPercent: number;
  /** Percentage along the category axis (left for vertical/point, top for horizontal). */
  crossPercent: number;
  series?: string;
};

/** A contained, plot-local label anchor shared by every cartesian family. */
export function CartesianDataLabel({
  labels,
  category,
  value,
  detail,
  orientation,
  startPercent,
  endPercent,
  crossPercent,
  series,
}: CartesianDataLabelProps): ReactNode {
  if (!labels.show) return null;

  // Containment, matching the marks. An explicit axis Start/End can put a
  // mark wholly outside the displayed range -- it then has zero extent and
  // is invisible, but its label was still anchored from the original
  // unclamped value and rendered far outside the plot. Measured at
  // Start=30000: ten of twelve labels outside, up to 217.7px below it.
  //
  // Two cases, one rule. A mark with no part of itself in range has no
  // label: there is nothing on screen for the label to belong to. A mark
  // that is partly in range keeps its label, anchored to the part that is
  // visible, so an end label follows the mark's visible end rather than a
  // point off the plot.
  //
  // Deliberately a containment rule and nothing more. The span is only
  // clamped, never re-ordered or re-placed, so InsideEnd/OutsideEnd
  // semantics are untouched wherever the mark is normally visible -- in
  // auto range both ends are already within 0..100 and every value here is
  // the value it was before.
  const spanLow = Math.min(startPercent, endPercent);
  const spanHigh = Math.max(startPercent, endPercent);
  if (spanHigh < -1e-9 || spanLow > 100 + 1e-9) return null;
  const clamp = (percent: number) => Math.max(0, Math.min(100, percent));
  const visibleStart = clamp(startPercent);
  const visibleEnd = clamp(endPercent);

  const placement = cartesianDataLabelPlacement(labels.labelPosition, orientation, visibleEnd);
  const anchorPercent = placement.anchor === "start"
    ? visibleStart
    : placement.anchor === "center"
      ? (visibleStart + visibleEnd) / 2
      : visibleEnd;
  const style: CSSProperties = orientation === "horizontal"
    ? { left: `${anchorPercent}%`, top: `${crossPercent}%`, transform: placement.transform }
    : orientation === "point"
      ? { left: `${crossPercent}%`, top: `${visibleEnd}%`, transform: placement.transform }
      : { left: `${crossPercent}%`, bottom: `${anchorPercent}%`, transform: placement.transform };

  return (
    <span
      className={`chart-data-label-anchor chart-data-label-anchor--${orientation}`}
      data-label-placement={placement.placement}
      data-label-series={series}
      style={style}
    >
      <DataLabel labels={labels} category={category} value={value} detail={detail} />
    </span>
  );
}

/** The subset of a zoom-slider group every cartesian chart shares. */
export type ZoomStyle = {
  show: boolean;
  showLabels: boolean;
  showOnCategoryAxis: boolean;
  showOnValueAxis: boolean;
  showOnValueSecAxis?: boolean;
  categoryMin: number;
  categoryMax: number;
  categorySize: number;
  valueMin: number;
  valueMax: number;
  valueSize: number;
  valueSecMin?: number;
  valueSecMax?: number;
  valueSecSize?: number;
};

/**
 * Zoom sliders sit against whichever axes they're enabled for. Which axis
 * is drawn horizontal vs vertical flips between chart families: a bar
 * chart's category axis runs top-to-bottom (vertical) while a column or
 * line chart's runs left-to-right (horizontal), so callers pass the
 * physical orientation for each rather than this component guessing it
 * from the field name.
 */
export function ZoomSliders({
  zoom,
  categoryOrientation,
  valueOrientation,
}: {
  zoom: ZoomStyle;
  categoryOrientation: "horizontal" | "vertical";
  valueOrientation: "horizontal" | "vertical";
}): ReactNode {
  if (!zoom.show) return null;

  const slider = (orientation: "horizontal" | "vertical", size: number, min: number, max: number, key: string) => (
    <span className={`chart-zoom chart-zoom--${orientation}`} key={key} style={{ [orientation === "horizontal" ? "height" : "width"]: size || 8 }}>
      <span className="chart-zoom__thumb" />
      {zoom.showLabels && (
        <>
          <span className="chart-zoom__label chart-zoom__label--start">{min || 0}</span>
          <span className="chart-zoom__label chart-zoom__label--end">{max || 100}</span>
        </>
      )}
    </span>
  );

  return (
    <>
      {zoom.showOnValueAxis && slider(valueOrientation, zoom.valueSize, zoom.valueMin, zoom.valueMax, "v")}
      {zoom.showOnValueSecAxis && zoom.valueSecSize !== undefined && (
        slider(valueOrientation, zoom.valueSecSize, zoom.valueSecMin ?? 0, zoom.valueSecMax ?? 0, "v2")
      )}
      {zoom.showOnCategoryAxis && slider(categoryOrientation, zoom.categorySize, zoom.categoryMin, zoom.categoryMax, "h")}
    </>
  );
}

/** The subset of a small-multiples layout group every cartesian chart shares. */
export type SmallMultiplesLayoutStyle = {
  layoutType: string | number;
  columnCount: number;
  rowCount: number;
  gridPadding: number;
  rowPaddingInner: number;
  columnPaddingInner: number;
  advancedPaddingOptions: boolean;
  rowPaddingOuter: number;
  columnPaddingOuter: number;
  backgroundColor: string;
  backgroundTransparency: number;
  gridLineShow: boolean;
  gridLineWidth: number;
  gridLineStyle: string | number;
  gridLineColor: string;
  gridLineTransparency: number;
};

/** The subset of a small-multiples subheader (per-tile title) group every cartesian chart shares. */
export type SubheaderStyle = {
  show: boolean;
  fontColor: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: string | number;
  titleWrap: boolean;
  position: string | number;
};

/**
 * True when a chart's small-multiples layout is actually switched on.
 * `layoutType` is never empty in the resolved style (it defaults to
 * "auto"), so column count is what actually gates the grid.
 */
export function usesSmallMultiples(layout: SmallMultiplesLayoutStyle): boolean {
  return layout.columnCount > 0;
}

/**
 * A small-multiples grid repeats one chart per category — it's the only
 * way its layout, padding, and gridline settings mean anything. `content`
 * is the single-chart plot to repeat into every cell; `titles` names each
 * cell, and is truncated to however many the row/column counts allow.
 */
export function SmallMultiplesGrid({
  layout,
  subheader,
  content,
  titles,
}: {
  layout: SmallMultiplesLayoutStyle;
  subheader: SubheaderStyle;
  content: ReactNode;
  titles: string[];
}): ReactNode {
  const columns = Math.max(1, layout.columnCount || 2);
  const rows = Math.max(1, layout.rowCount || 2);

  return (
    <span
      className="small-multiples"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${layout.rowPaddingInner || layout.gridPadding || 6}px ${layout.columnPaddingInner || layout.gridPadding || 6}px`,
        padding: layout.advancedPaddingOptions ? `${layout.rowPaddingOuter}px ${layout.columnPaddingOuter}px` : undefined,
        backgroundColor: hexWithAlpha(layout.backgroundColor, layout.backgroundTransparency),
      }}
    >
      {titles.slice(0, columns * rows).map((title) => (
        <span
          className="small-multiples__cell"
          key={title}
          style={
            layout.gridLineShow
              ? { border: `${layout.gridLineWidth}px ${mapLineStyle(layout.gridLineStyle)} ${hexWithAlpha(layout.gridLineColor, layout.gridLineTransparency)}` }
              : undefined
          }
        >
          {subheader.show && (
            <span
              className="small-multiples__title"
              style={{
                color: subheader.fontColor,
                fontFamily: subheader.fontFamily || undefined,
                fontSize: themeFontSizeToCssPx(subheader.fontSize),
                fontWeight: subheader.bold ? 700 : 400,
                fontStyle: subheader.italic ? "italic" : "normal",
                textDecoration: subheader.underline ? "underline" : "none",
                textAlign: mapTextAlign(subheader.alignment),
                whiteSpace: subheader.titleWrap ? "normal" : "nowrap",
                order: String(subheader.position).toLowerCase() === "bottom" ? 2 : 0,
              }}
            >
              {title}
            </span>
          )}
          {content}
        </span>
      ))}
    </span>
  );
}

/**
 * Whether a label sits inside the bar/column or outside its end. Power BI
 * names these InsideEnd / InsideCenter / InsideBase / OutsideEnd.
 */
export function labelIsInside(position: string | number): boolean {
  return /inside/i.test(String(position));
}

/**
 * Label density is a 0-100 dial for how many labels Power BI is allowed
 * to draw. 0 means "none", 100 means "all"; in between it thins them out.
 */
export function labelVisibleAt(index: number, total: number, density: number): boolean {
  if (density >= 100) return true;
  if (density <= 0) return false;
  const allowed = Math.max(1, Math.round((density / 100) * total));
  const step = total / allowed;
  return Math.floor(index % step) === 0;
}

/** A data label, with its optional background chip. */
export function dataLabelStyle(labels: {
  color: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  enableBackground?: boolean;
  backgroundColor?: string;
  backgroundTransparency?: number;
}): CSSProperties {
  return {
    ...textStyle({ ...labels, labelColor: labels.color }),
    backgroundColor:
      labels.enableBackground && labels.backgroundColor
        ? hexWithAlpha(labels.backgroundColor, labels.backgroundTransparency ?? 0)
        : undefined,
    padding: labels.enableBackground ? "1px 4px" : undefined,
    borderRadius: labels.enableBackground ? 3 : undefined,
  };
}

/* ---------------------------------------------------------------------------
 * Layout-aware furniture
 *
 * These are the ChartLayout equivalents of `Gridlines` and `AxisTickLabels`
 * above. They take a computed layout and read every position from
 * `valueFraction` / `categoryPercent`, so a chart cannot end up with one
 * scale for its axis and another for its marks.
 *
 * They live here for the reason ChartParts exists: a fix to chart furniture
 * should land once and reach every family. T10 deleted the pair they
 * replaced — Gridlines, AxisTickLabels, AxisInset, insetOffset and
 * axisTicks — once the line chart, their last consumer, migrated. There is
 * no longer a second, inset-and-count coordinate model in this file.
 *
 * Orientation-general throughout: the positioning branches on
 * `layout.orientation`, so bar and column are transposes of one another
 * rather than separate implementations.
 * ------------------------------------------------------------------------ */

/** Where a tick sits, as the CSS offset for its orientation. */
function scaledOffset(layout: ChartLayout, value: number): CSSProperties {
  const fraction = `${valueFraction(layout, value) * 100}%`;
  return layout.orientation === 'vertical' ? { bottom: fraction } : { left: fraction };
}

/**
 * A gridline dash array, parsed from the theme's literal string.
 *
 * The schema documents this as "space-separated values for dash and gap
 * lengths in pixels, repeating in sequence" -- which is SVG
 * `stroke-dasharray`, so the property can be honoured exactly rather than
 * approximated. Commas are accepted too, since SVG allows either and a theme
 * author may well write one.
 *
 * Returns null for anything unusable: an empty string, junk, a negative, or
 * a series of zeroes that would paint nothing. The caller then falls back to
 * the named line style, which is what the renderer drew before this property
 * was representable at all. The theme's own value is never rewritten -- this
 * only decides what to paint.
 */
export function parseGridlineDashArray(value: string | number | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (!parts.length) return null;
  const numbers: number[] = [];
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isFinite(n) || n < 0) return null;
    numbers.push(n);
  }
  if (!numbers.some((n) => n > 0)) return null;
  return numbers.join(" ");
}

/**
 * The SVG line cap for the theme's dash cap.
 *
 * The schema's three values map one-to-one onto `stroke-linecap`: Flat
 * (`none`) is `butt`, and Round and Square keep their names. Nothing else is
 * accepted -- an unrecognised value falls back to SVG's own default rather
 * than being guessed at.
 */
export function gridlineLineCap(value: string | number | undefined): "butt" | "round" | "square" {
  switch (String(value ?? "").toLowerCase()) {
    case "round":
      return "round";
    case "square":
      return "square";
    default:
      return "butt";
  }
}

/**
 * How a NAMED line style is drawn, in the absence of an explicit array.
 *
 * A CSS border chooses its own dash lengths and scales them with the border
 * width; an SVG stroke does neither, so the widths have to be stated. These
 * multiples reproduce roughly what the CSS renderer drew, which keeps an
 * existing dashed or dotted theme looking as it did.
 *
 * This is NOT `gridlineAutoScale`. That property governs an EXPLICIT dash
 * array, which is specified in pixels and is left literal here.
 */
function namedDashArray(style: "solid" | "dashed" | "dotted", width: number): string | undefined {
  const unit = Math.max(width, 1);
  if (style === "dashed") return `${unit * 3} ${unit * 2}`;
  if (style === "dotted") return `${unit} ${unit * 2}`;
  return undefined;
}

/** Everything a gridline stroke needs, resolved once for a whole set. */
function gridlineStroke(axis: AxisStyle) {
  const width = axis.gridlineThickness;
  const explicit = parseGridlineDashArray(axis.gridlineDashArray);
  const named = mapLineStyle(axis.gridlineStyle);
  return {
    width,
    color: hexWithAlpha(axis.gridlineColor, axis.gridlineTransparency ?? 0),
    // An explicit dash array wins over the named style, as elsewhere.
    dashArray: explicit ?? namedDashArray(named, width),
    lineCap: gridlineLineCap(axis.gridlineDashCap),
  };
}

/**
 * The shared gridline layer: real strokes, plot-local.
 *
 * Gridlines used to be spans drawn with one CSS border each, which can
 * express colour, width, transparency and a named style, and nothing else.
 * `gridlineDashArray` collapsed to "dashed" whatever it said, and
 * `gridlineDashCap` has no CSS equivalent at all.
 *
 * An SVG layer sized to the plot fixes that with no geometry change. The
 * lines sit at the same percentages the spans used, so ticks, axes and the
 * plot rectangle are untouched; percentage coordinates mean no viewBox and
 * no scaling, so a stroke width and a dash length are both plain pixels. It
 * is the plot's first child, so marks, labels and reference lines paint over
 * it exactly as before, and it takes no pointer events.
 */
function GridlineLayer({
  axis,
  offsets,
  direction,
}: {
  axis: AxisStyle;
  /** Percentage along the plot each line sits at. */
  offsets: number[];
  /** The direction each line is DRAWN in. */
  direction: "horizontal" | "vertical";
}): ReactNode {
  if (!offsets.length) return null;
  const { width, color, dashArray, lineCap } = gridlineStroke(axis);
  if (width <= 0) return null;

  return (
    <svg className="chart-gridline-layer" aria-hidden="true" focusable="false">
      {offsets.map((offset, index) => {
        const position = `${offset}%`;
        const ends =
          direction === "horizontal"
            ? { x1: "0%", x2: "100%", y1: position, y2: position }
            : { x1: position, x2: position, y1: "0%", y2: "100%" };
        return (
          <line
            key={index}
            {...ends}
            stroke={color}
            strokeWidth={width}
            strokeDasharray={dashArray}
            strokeLinecap={lineCap}
          />
        );
      })}
    </svg>
  );
}

/**
 * Value-axis gridlines: one per tick, at the coordinate `scale.value` gives
 * that tick.
 */
export function ScaledGridlines({ axis, layout }: { axis: AxisStyle; layout: ChartLayout }): ReactNode {
  if (!axis.gridlineShow) return null;
  const vertical = layout.orientation === "vertical";
  // The same fractions the CSS offsets used. A vertical chart's value axis
  // runs bottom-up and SVG's y runs top-down, so the fraction is flipped for
  // it -- the only place the two coordinate systems differ.
  const offsets = layout.scale.ticks.map((tick) => {
    const fraction = valueFraction(layout, tick) * 100;
    return vertical ? 100 - fraction : fraction;
  });
  return <GridlineLayer axis={axis} offsets={offsets} direction={vertical ? "horizontal" : "vertical"} />;
}

/**
 * The value-axis gutter: its axis title against the gutter's outer edge,
 * and one tick label per tick, positioned on the same scale as the
 * gridlines. The gutter's extent comes from the layout, so unlike the
 * legacy zero-width tick container the plot actually pays for it.
 */
export function ValueAxisGutter({
  axis,
  layout,
  offset,
  titleFallback = "",
}: {
  axis: AxisStyle;
  layout: ChartLayout;
  /** The other axis's gutter, which this one stops short of. */
  offset: number;
  titleFallback?: string;
}): ReactNode {
  if (!layout.valueAxis) return null;
  const vertical = layout.orientation === "vertical";
  // When the other gutter is absent, the lowest/first tick no longer has a
  // neighbouring band into which it can safely overhang.
  const edgeContained = offset <= 0;

  return (
    <span
      className={`chart-axis-gutter chart-axis-gutter--value${vertical ? "" : " chart-axis-gutter--horizontal"}${edgeContained ? " chart-axis-gutter--edge-contained" : ""}`}
      style={vertical ? { width: layout.valueAxis.width, bottom: offset } : { height: layout.valueAxis.height, left: offset }}
    >
      {axis.showAxisTitle && (
        <span
          className={`chart-preview__axis-title${vertical ? " chart-preview__axis-title--rotated" : ""}`}
          style={axisTitleStyle(axis)}
        >
          {String(axis.titleText) || titleFallback}
        </span>
      )}
      <span className="chart-axis-gutter__ticks">
        {layout.scale.ticks.map((tick, index) => (
          <span key={index} style={{ ...textStyle(axis), ...scaledOffset(layout, tick) }}>
            {formatValue(tick, axis.labelDisplayUnits, axis.labelPrecision)}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * The category-axis gutter: one label per category, sitting on the slot
 * `scale.category` gives it, plus the axis title. Because labels and marks
 * read the same slots, a label cannot drift from the mark it names.
 */
export function CategoryAxisGutter({
  axis,
  layout,
  categories,
  offset,
  farOffset = 0,
  titleFallback = "",
}: {
  axis: AxisStyle;
  layout: ChartLayout;
  categories: readonly string[];
  /** The value axis's gutter, which this one starts after. */
  offset: number;
  /** Optional value gutter on the far side of a vertical plot. */
  farOffset?: number;
  titleFallback?: string;
}): ReactNode {
  if (!layout.categoryAxis) return null;
  const vertical = layout.orientation === "vertical";

  return (
    <span
      className={`chart-axis-gutter chart-axis-gutter--category${vertical ? "" : " chart-axis-gutter--vertical"}`}
      // [T8] The horizontal branch used to say `top: offset`, which pushed
      // the gutter DOWN by the value axis's height instead of stopping it
      // short of it. Both gutters stop short of the other one, so both take
      // `bottom` — the vertical branch already did. Found by the Bar pair
      // becoming the horizontal branch's first consumer.
      style={
        vertical
          ? { height: layout.categoryAxis.height, left: offset, right: farOffset }
          : { width: layout.categoryAxis.width, bottom: offset }
      }
    >
      {/* Labels sit in their own box, exactly as the value gutter's ticks
          do, so the axis title can be a flow sibling that takes the outer
          edge and the labels get the rest. The two gutters are transposes
          of each other and their markup should be too. */}
      <span className="chart-axis-gutter__labels">
        {categories.map((label, index) => {
          const slot = categoryPercent(layout, index, categories.length);
          return (
            <span
              className="chart-axis-gutter__category-label"
              key={label}
              style={{
                ...textStyle(axis),
                ...(vertical
                  ? { left: `${slot.offset}%`, width: `${slot.size}%` }
                  : { top: `${slot.offset}%`, height: `${slot.size}%` }),
              }}
            >
              {label}
            </span>
          );
        })}
      </span>
      {axis.showAxisTitle && (
        <span
          className={`chart-preview__axis-title chart-axis-gutter__title${vertical ? "" : " chart-preview__axis-title--rotated"}`}
          style={axisTitleStyle(axis)}
        >
          {String(axis.titleText) || titleFallback}
        </span>
      )}
    </span>
  );
}

/**
 * Category-axis gridlines: one per category, through the centre of its slot.
 *
 * Uses `categoryPercent`, the same slot geometry the marks and the category
 * labels use, so a gridline cannot drift from the category it belongs to. A
 * column chart's categories run left to right, so its gridlines are vertical;
 * a bar chart's run top to bottom, so they rotate with the axis.
 */
export function CategoryGridlines({
  axis,
  layout,
  count,
}: {
  axis: AxisStyle;
  layout: ChartLayout;
  count: number;
}): ReactNode {
  if (!axis.gridlineShow || count <= 0) return null;
  const vertical = layout.orientation === "vertical";
  const offsets = Array.from({ length: count }, (_, index) => {
    const slot = categoryPercent(layout, index, count);
    return slot.offset + slot.size / 2;
  });
  return <GridlineLayer axis={axis} offsets={offsets} direction={vertical ? "vertical" : "horizontal"} />;
}

// ---------------------------------------------------------------------------
// Constant / reference lines
// ---------------------------------------------------------------------------

/**
 * One constant line: an optional shaded region, the line itself, and an
 * optional data label.
 *
 * Deliberately dumb. It takes resolved style values and geometry that has
 * already been worked out (`constantLineGeometry`), and it neither reads
 * theme JSON nor resolves a property nor computes a scale nor knows any
 * sample-data maximum. The renderer owns which axis a group belongs to;
 * this draws whatever it is handed. That is what lets the same component
 * serve `referenceLine` on a bar chart's value axis and, later, the other
 * groups and the other cartesian families.
 *
 * `layer` implements the group's `position` property honestly. A line set
 * to "Behind" is rendered before the data marks and one set to "In front"
 * after them, so real DOM order decides what covers what — no z-index
 * stack to reason about and, in particular, no faking depth with opacity,
 * which would misrepresent the transparency property sitting right next
 * to it. A renderer mounts this twice, once in each slot, and each mount
 * returns null unless the resolved position matches it.
 *
 * The line is SVG rather than a CSS border because `dashArray` and
 * `dashCap` have no CSS-border equivalent: a border can be `dashed`, but
 * it cannot be "4 2 1 2" with square caps. One SVG path honours every
 * combination, so there is no second code path that could disagree with
 * the first about what "dotted" means.
 */
export function ConstantLine({
  line,
  geometry,
  layer,
  orientation,
  plot,
  formatValue: format,
}: {
  line: ConstantLineStyle;
  geometry: ConstantLineGeometry;
  /** Which paint slot this mount is; compared against `line.position`. */
  layer: "back" | "front";
  /** Which way the line runs: across a vertical chart, up a horizontal one. */
  orientation: "vertical" | "horizontal";
  /** The plot's natural size, for the SVG's viewBox. */
  plot: { width: number; height: number };
  formatValue: (value: number, displayUnits?: string | number, precision?: number) => string;
}): ReactNode {
  if (!line.show) return null;
  if ((layer === "front") !== constantLineIsFront(line)) return null;
  if (!geometry.onPlot && !geometry.shade) return null;

  // A vertical chart's value axis runs up the plot, so its constant line
  // lies across it; a horizontal chart's runs across, so the line stands
  // up it. `fraction` is measured from the origin edge either way, which
  // for a vertical chart is the bottom — hence 1 - fraction for a y.
  const acrossPlot = orientation === "vertical";
  const along = acrossPlot ? (1 - geometry.fraction) * plot.height : geometry.fraction * plot.width;

  const stroke = hexWithAlpha(line.lineColor, line.transparency);
  const shadeColor = hexWithAlpha(
    line.shadeColorMatchStroke ? line.lineColor : line.shadeColor,
    line.shadeTransparency,
  );

  return (
    <span className="chart-constant-line" aria-hidden="true">
      <svg
        className="chart-constant-line__canvas"
        viewBox={`0 0 ${plot.width} ${plot.height}`}
        preserveAspectRatio="none"
      >
        {geometry.shade && (
          // Drawn before the line so the line always reads on top of its
          // own shade, whichever paint slot the pair as a whole is in.
          <rect
            x={acrossPlot ? 0 : geometry.shade.from * plot.width}
            y={acrossPlot ? (1 - geometry.shade.to) * plot.height : 0}
            width={acrossPlot ? plot.width : (geometry.shade.to - geometry.shade.from) * plot.width}
            height={acrossPlot ? (geometry.shade.to - geometry.shade.from) * plot.height : plot.height}
            fill={shadeColor}
          />
        )}
        {geometry.onPlot && (
          <line
            x1={acrossPlot ? 0 : along}
            x2={acrossPlot ? plot.width : along}
            y1={acrossPlot ? along : 0}
            y2={acrossPlot ? along : plot.height}
            stroke={stroke}
            strokeWidth={line.width}
            strokeDasharray={constantLineDashArray(line)}
            strokeLinecap={constantLineCap(line)}
            // The plot is stretched to fit its rendered box, so without
            // this the line's thickness and dash lengths would distort
            // with the aspect ratio instead of staying the pixel sizes
            // the properties name.
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {line.dataLabelShow && geometry.onPlot && (
        <ConstantLineLabel line={line} geometry={geometry} orientation={orientation} format={format} />
      )}
    </span>
  );
}

/**
 * The line's data label, positioned against the line rather than against
 * the plot.
 *
 * The two position properties are read relative to the line, which is what
 * makes them meaningful on both orientations: for a line lying across the
 * plot, "left"/"right" slide the label along it and "above"/"under" put it
 * on one side or the other; for a line standing up the plot the two swap
 * roles. Anchoring is by translate rather than by a second offset, so the
 * label's inner edge sits on the line at any fraction — including 0% and
 * 100%, where a plain percentage offset would hang the box off the plot.
 */
function ConstantLineLabel({
  line,
  geometry,
  orientation,
  format,
}: {
  line: ConstantLineStyle;
  geometry: ConstantLineGeometry;
  orientation: "vertical" | "horizontal";
  format: (value: number, displayUnits?: string | number, precision?: number) => string;
}): ReactNode {
  const acrossPlot = orientation === "vertical";
  const percent = `${geometry.fraction * 100}%`;
  const toLeft = String(line.dataLabelHorizontalPosition).toLowerCase() === "left";
  const under = String(line.dataLabelVerticalPosition).toLowerCase() === "under";

  const style: CSSProperties = acrossPlot
    ? {
        // Lying across the plot: vertical position picks the side of the
        // line, horizontal position picks the end of it.
        bottom: percent,
        left: toLeft ? 2 : "auto",
        right: toLeft ? "auto" : 2,
        transform: under ? "translateY(100%)" : "translateY(0)",
      }
    : {
        // Standing up the plot: horizontal position picks the side of the
        // line, vertical position picks the end of it.
        left: percent,
        top: under ? "auto" : 2,
        bottom: under ? 2 : "auto",
        transform: toLeft ? "translateX(-100%)" : "translateX(0)",
      };

  return (
    <span className="chart-constant-line__label" style={{ ...style, color: line.dataLabelColor }}>
      {constantLineLabelText(line, format)}
    </span>
  );
}
