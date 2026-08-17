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
