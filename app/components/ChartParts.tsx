import type { CSSProperties, ReactNode } from "react";
import { hexWithAlpha } from "../lib/colorUtils";

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
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  showAxisTitle: boolean;
  titleText: string;
  titleColor: string;
  titleFontFamily: string;
  titleFontSize: number;
  titleBold: boolean;
  titleItalic: boolean;
  titleUnderline: boolean;
  gridlineShow: boolean;
  gridlineColor: string;
  gridlineThickness: number;
  gridlineStyle: string | number;
  gridlineTransparency?: number;
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

/** Text styling shared by axis tick labels and legend entries. */
export function textStyle(source: {
  labelColor?: string;
  color?: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}): CSSProperties {
  return {
    color: source.labelColor ?? source.color,
    fontFamily: source.fontFamily || undefined,
    fontSize: source.fontSize,
    fontWeight: source.bold ? 700 : 400,
    fontStyle: source.italic ? "italic" : "normal",
    textDecoration: source.underline ? "underline" : "none",
  };
}

export function axisTitleStyle(axis: AxisStyle): CSSProperties {
  return {
    color: axis.titleColor,
    fontFamily: axis.titleFontFamily || undefined,
    fontSize: axis.titleFontSize,
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

/** Evenly spaced tick values across the axis range. */
export function axisTicks(axis: AxisStyle, dataMax: number, count = 4): number[] {
  // Axis start/end arrive as strings from the schema, and are blank unless
  // the user pins the range — fall back to 0..dataMax when unset.
  const parse = (value: string | number | undefined): number | null => {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const start = parse(axis.start) ?? 0;
  const parsedEnd = parse(axis.end);
  const end = parsedEnd !== null && parsedEnd > start ? parsedEnd : dataMax;
  const ticks = Array.from({ length: count + 1 }, (_, i) => start + ((end - start) * i) / count);
  return axis.invertAxis ? ticks.reverse() : ticks;
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

  return (
    <span className={`chart-legend${vertical ? " chart-legend--vertical" : ""}`}>
      {legend.showTitle && (
        <span className="chart-legend__title" style={textStyle(legend)}>
          {String(legend.titleText) || "Series"}
        </span>
      )}
      {items.map((item) => (
        <span className="chart-legend__item" key={item.label}>
          <span className="chart-legend__swatch" style={{ backgroundColor: item.color }} />
          <span style={textStyle(legend)}>{item.label}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Gridlines drawn as real positioned lines, one per tick, so their colour,
 * thickness, and line style are all visible. The previous implementation
 * used a repeating gradient locked to 25% intervals, which couldn't show
 * the line style at all and ignored the axis range.
 */
export function Gridlines({ axis, orientation, count = 4 }: { axis: AxisStyle; orientation: "vertical" | "horizontal"; count?: number }) {
  if (!axis.gridlineShow) return null;
  const style = mapLineStyle(axis.gridlineStyle);

  return (
    <>
      {Array.from({ length: count + 1 }, (_, i) => {
        const offset = `${(i / count) * 100}%`;
        return (
          <span
            className="chart-gridline"
            key={i}
            aria-hidden="true"
            style={
              orientation === "vertical"
                ? {
                    left: offset,
                    top: 0,
                    bottom: 0,
                    borderLeftWidth: axis.gridlineThickness,
                    borderLeftStyle: style,
                    borderLeftColor: axis.gridlineColor,
                  }
                : {
                    bottom: offset,
                    left: 0,
                    right: 0,
                    borderTopWidth: axis.gridlineThickness,
                    borderTopStyle: style,
                    borderTopColor: axis.gridlineColor,
                  }
            }
          />
        );
      })}
    </>
  );
}

/** Tick labels along the value axis, formatted by its display units. */
export function AxisTickLabels({
  axis,
  dataMax,
  orientation,
  count = 4,
}: {
  axis: AxisStyle;
  dataMax: number;
  orientation: "vertical" | "horizontal";
  count?: number;
}) {
  if (!axis.show) return null;
  const ticks = axisTicks(axis, dataMax, count);

  return (
    <span className={`chart-ticks chart-ticks--${orientation}`}>
      {ticks.map((tick, i) => (
        <span key={i} style={textStyle(axis)}>
          {formatValue(tick, axis.labelDisplayUnits, axis.labelPrecision)}
        </span>
      ))}
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
  // Not every chart's labels group carries these — the line chart has no
  // orientation or word-wrap setting, for instance.
  labelOrientation?: string | number;
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
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  transparency: number;
}): CSSProperties {
  return {
    color: hexWithAlpha(part.color, part.transparency),
    fontFamily: part.fontFamily || undefined,
    fontSize: part.fontSize,
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
        maxWidth: labels.labelContainerMaxWidth || undefined,
        whiteSpace: labels.wordWrap ? "normal" : "nowrap",
        writingMode: vertical ? "vertical-rl" : undefined,
      }}
    >
      {showTitle && (
        <span style={labelPartStyle({ ...labels, color: labels.titleColor, fontFamily: labels.titleFontFamily, fontSize: labels.titleFontSize, bold: labels.titleBold, italic: labels.titleItalic, underline: labels.titleUnderline, transparency: labels.titleTransparency })}>
          {category}
        </span>
      )}
      {showValue && <span>{formatValue(value, labels.labelDisplayUnits, labels.labelPrecision)}</span>}
      {showDetail && (
        <span style={labelPartStyle({ ...labels, color: labels.detailColor, fontFamily: labels.detailFontFamily, fontSize: labels.detailFontSize, bold: labels.detailBold, italic: labels.detailItalic, underline: labels.detailUnderline, transparency: labels.detailTransparency })}>
          {formatValue(detail as number, labels.detailLabelDisplayUnits, labels.detailLabelPrecision)}
        </span>
      )}
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
