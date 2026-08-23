import type { CSSProperties, ReactNode } from "react";
import { hexWithAlpha } from "../lib/colorUtils";
import { categoryPercent, valueFraction, type ChartLayout } from "../lib/chartLayout";

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
  gridlineDashArray?: string;
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
 * The value axis's 0%/100% range doesn't always span a chart's full
 * width/height — a horizontal bar chart's category-label and value-label
 * columns sit either side of the actual track, so the axis needs to be
 * inset by exactly those columns' widths or its ticks and gridlines land
 * over the label gutters instead of the bars they're meant to measure.
 * Both `start` and `end` are pixels, on whichever edge is the axis's 0%
 * (left for horizontal, bottom for vertical).
 */
export type AxisInset = { start: number; end: number };
const NO_INSET: AxisInset = { start: 0, end: 0 };

export function insetOffset(i: number, count: number, inset: AxisInset): string {
  const fraction = i / count;
  if (inset.start === 0 && inset.end === 0) return `${fraction * 100}%`;
  return `calc(${inset.start}px + (100% - ${inset.start + inset.end}px) * ${fraction})`;
}

/**
 * Gridlines drawn as real positioned lines, one per tick, so their colour,
 * thickness, and line style are all visible. The previous implementation
 * used a repeating gradient locked to 25% intervals, which couldn't show
 * the line style at all and ignored the axis range.
 */
export function Gridlines({
  axis,
  orientation,
  count = 4,
  inset = NO_INSET,
}: {
  axis: AxisStyle;
  orientation: "vertical" | "horizontal";
  count?: number;
  inset?: AxisInset;
}) {
  if (!axis.gridlineShow) return null;
  const style = mapLineStyle(axis.gridlineStyle);
  // An explicit dash array wins over the named style, as elsewhere.
  const dashed = String(axis.gridlineDashArray ?? "") !== "";
  const color = hexWithAlpha(axis.gridlineColor, axis.gridlineTransparency ?? 0);

  return (
    <>
      {Array.from({ length: count + 1 }, (_, i) => {
        const offset = insetOffset(i, count, inset);
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
                    borderLeftStyle: dashed ? "dashed" : style,
                    borderLeftColor: color,
                  }
                : {
                    bottom: offset,
                    left: 0,
                    right: 0,
                    borderTopWidth: axis.gridlineThickness,
                    borderTopStyle: dashed ? "dashed" : style,
                    borderTopColor: color,
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
  inset = NO_INSET,
}: {
  axis: AxisStyle;
  dataMax: number;
  orientation: "vertical" | "horizontal";
  count?: number;
  inset?: AxisInset;
}) {
  if (!axis.show) return null;
  const ticks = axisTicks(axis, dataMax, count);

  return (
    <span className={`chart-ticks chart-ticks--${orientation}`}>
      {ticks.map((tick, i) => {
        // Positioned at the exact same i/count fraction Gridlines uses,
        // then centred on that point — `justify-content: space-between`
        // (the previous approach) aligns box *edges*, not centres, so
        // unequal-width labels like "0" and "82K" drift away from their
        // gridline the further they sit from the container's own edges.
        const offset = insetOffset(i, count, inset);
        return (
          <span
            key={i}
            style={{
              ...textStyle(axis),
              position: "absolute",
              ...(orientation === "horizontal"
                ? { left: offset, transform: "translateX(-50%)" }
                : { bottom: offset, transform: "translateY(50%)" }),
            }}
          >
            {formatValue(tick, axis.labelDisplayUnits, axis.labelPrecision)}
          </span>
        );
      })}
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
        // "Overflow text" lets a label spill past its own container
        // instead of being clipped when it doesn't fit.
        overflow: labels.labelOverflow ? "visible" : "hidden",
        textOverflow: labels.labelOverflow ? "clip" : "ellipsis",
        opacity: 1 - (labels.transparency ?? 0) / 100,
        textAlign: /left|right|center/i.test(String(labels.horizontalAlignment ?? ""))
          ? (String(labels.horizontalAlignment).toLowerCase() as CSSProperties["textAlign"])
          : undefined,
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
                fontSize: subheader.fontSize,
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
 * They live here, beside the legacy pair, for the reason ChartParts exists:
 * a fix to chart furniture should land once and reach every family. The
 * legacy pair stays until its last consumer migrates (Bar in T8, Line in
 * T10), at which point it and `insetOffset`/`AxisInset` can go.
 *
 * Written orientation-generally: the positioning branches on
 * `layout.orientation`, so the Bar pair can adopt them in T8 without a
 * column-specific API. Only the vertical branch has a consumer today, and
 * only the vertical CSS exists — T8 adds the horizontal styles.
 * ------------------------------------------------------------------------ */

/** Where a tick or gridline sits, as the CSS offset for its orientation. */
function scaledOffset(layout: ChartLayout, value: number): CSSProperties {
  const fraction = `${valueFraction(layout, value) * 100}%`;
  return layout.orientation === "vertical" ? { bottom: fraction } : { left: fraction };
}

/**
 * Value-axis gridlines drawn from a computed layout: one per tick, at the
 * coordinate `scale.value` gives that tick. Replaces the inset-and-count
 * arithmetic the legacy `Gridlines` needs.
 */
export function ScaledGridlines({ axis, layout }: { axis: AxisStyle; layout: ChartLayout }): ReactNode {
  if (!axis.gridlineShow) return null;
  // An explicit dash array wins over the named style, as elsewhere.
  const dashed = String(axis.gridlineDashArray ?? "") !== "";
  const style = dashed ? "dashed" : mapLineStyle(axis.gridlineStyle);
  const color = hexWithAlpha(axis.gridlineColor, axis.gridlineTransparency ?? 0);
  const vertical = layout.orientation === "vertical";

  return (
    <>
      {layout.scale.ticks.map((tick, index) => (
        <span
          className="chart-gridline"
          key={index}
          aria-hidden="true"
          // Declaration order is deliberate: span-the-plot first, then the
          // scaled offset, then the border. It has no rendering effect, but
          // keeping it stable makes a byte-level before/after diff of the
          // migrated charts meaningful rather than noisy.
          style={
            vertical
              ? {
                  left: 0,
                  right: 0,
                  ...scaledOffset(layout, tick),
                  borderTopWidth: axis.gridlineThickness,
                  borderTopStyle: style,
                  borderTopColor: color,
                }
              : {
                  top: 0,
                  bottom: 0,
                  ...scaledOffset(layout, tick),
                  borderLeftWidth: axis.gridlineThickness,
                  borderLeftStyle: style,
                  borderLeftColor: color,
                }
          }
        />
      ))}
    </>
  );
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

  return (
    <span
      className={`chart-axis-gutter chart-axis-gutter--value${vertical ? "" : " chart-axis-gutter--horizontal"}`}
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
  titleFallback = "",
}: {
  axis: AxisStyle;
  layout: ChartLayout;
  categories: readonly string[];
  /** The value axis's gutter, which this one starts after. */
  offset: number;
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
          ? { height: layout.categoryAxis.height, left: offset }
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
