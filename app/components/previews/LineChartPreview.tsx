import { Fragment, type CSSProperties } from "react";
import { hexWithAlpha } from "../../lib/colorUtils";
import { AxisTickLabels, axisTitleStyle, ChartLegend, DataLabel, formatValue, Gridlines, labelVisibleAt, legendIsAfterPlot, legendIsVertical, mapLineStyle, textStyle, ZoomSliders } from "../ChartParts";
import { areaPath, linePath, markerShape } from "../../lib/lineGeometry";
import { LINE_DATA_MAX, lineCategoryLabels, linePointValues } from "../../lib/previewSampleData";
import { chartMarker, svgDashArray } from "./chartPrimitives";
import type { ResolvedLineChartStyle } from "../../lib/lineChartProperties";

/**
 * The shape shared by every constant-line group (referenceLine,
 * xAxisReferenceLine, y1AxisReferenceLine). They differ only in whether
 * `value` is typed as a string or a number, so the preview accepts both.
 */
type ConstantLineStyle = {
  show: boolean;
  lineColor: string;
  style: string | number;
  width: number;
  transparency: number;
  value: string | number;
  displayName: string | number;
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

type Props = { lineChartStyle: ResolvedLineChartStyle };

export function LineChartPreview({ lineChartStyle }: Props) {
  const lineLegendNode = (
    <ChartLegend legend={lineChartStyle.legend} items={[{ label: "Applications", color: lineChartStyle.dataPoint.fill }]} />
  );
  const lineLegendAtBottom = legendIsAfterPlot(lineChartStyle.legend.position);
  const lineLegendVertical = legendIsVertical(lineChartStyle.legend.position);
  const linePointCoords = linePointValues.map((value, index) => ({
    x: (index / (linePointValues.length - 1)) * 100,
    y: 100 - value,
  }));
  const lineStyles = lineChartStyle.lineStyles;
  // `lineChartType` is the interpolation mode (linear/smooth/step);
  // `interpolationSmooth`/`interpolationStep` name *which* algorithm to
  // use within a mode ("monotoneX", "before"), so they are not on/off
  // switches and must not be read as such.
  const lineInterpolation = String(lineStyles.lineChartType).toLowerCase();
  const linePathD = linePath(linePointCoords, {
    smooth: lineInterpolation === "smooth",
    step: lineInterpolation === "step",
    // For a stepped line, the step's alignment comes from the step
    // algorithm ("before"/"after"/"center") rather than segmentAlignment,
    // which positions segment labels.
    stepAlignment: lineStyles.interpolationStep,
  });
  const lineDashStyle = mapLineStyle(lineStyles.lineStyle);
  const lineAreaColor = lineStyles.areaMatchStrokeColor ? lineChartStyle.dataPoint.fill : lineStyles.areaColor;
  // lineChartType decides whether the series is drawn as a plain line or
  // filled down to the baseline as an area/stacked area.
  // lineChartType only selects interpolation, so the area fill is driven
  // by its own areaShow toggle.
  const lineIsArea = lineStyles.areaShow;
  const lineStrokeColor = lineStyles.strokeColor || lineChartStyle.dataPoint.fill;
  const lineMarkerColor = lineStyles.markerColor || lineChartStyle.dataPoint.fill;
  const lineShowMarkers = lineStyles.showMarker || lineStyles.showMarkerByDefault;
  const lineMarker = markerShape(String(lineStyles.markerShape), lineStyles.markerSize || 5);

  /**
   * Constant lines: the schema gives a line chart three of them
   * (referenceLine, xAxisReferenceLine, y1AxisReferenceLine) with the
   * same shape — a line, an optional shaded region on one side of it, and
   * an optional data label. Rendering them from one helper keeps all
   * three consistent instead of only the first being drawn.
   */
  const constantLine = (
    // Structural, not one group's type: the three constant-line groups
    // are identical except that `value` is a string in some and a number
    // in others, so a cast between them isn't valid.
    line: ConstantLineStyle,
    orientation: "vertical" | "horizontal",
    offsetPercent: number,
    key: string,
  ) => {
    if (!line.show) return null;
    const stroke = mapLineStyle(line.style);
    const shade = line.shadeShow && (
      <span
        className="chart-preview__constant-shade"
        key={`${key}-shade`}
        aria-hidden="true"
        style={{
          backgroundColor: hexWithAlpha(line.shadeColorMatchStroke ? line.lineColor : line.shadeColor, line.shadeTransparency),
          // shadeRegion picks which side of the line is filled.
          ...(orientation === "vertical"
            ? String(line.shadeRegion).toLowerCase() === "before"
              ? { left: 0, width: `${offsetPercent}%`, top: 0, bottom: 0 }
              : { left: `${offsetPercent}%`, right: 0, top: 0, bottom: 0 }
            : String(line.shadeRegion).toLowerCase() === "before"
              ? { bottom: 0, height: `${offsetPercent}%`, left: 0, right: 0 }
              : { bottom: `${offsetPercent}%`, top: 0, left: 0, right: 0 }),
        }}
      />
    );

    return (
      <Fragment key={key}>
        {shade}
        <span
          className={`chart-preview__constant chart-preview__constant--${orientation}`}
          aria-hidden="true"
          style={{
            ...(orientation === "vertical"
              ? {
                  left: `${offsetPercent}%`,
                  borderLeftWidth: line.width,
                  borderLeftColor: line.lineColor,
                  borderLeftStyle: stroke,
                }
              : {
                  bottom: `${offsetPercent}%`,
                  borderTopWidth: line.width,
                  borderTopColor: line.lineColor,
                  borderTopStyle: stroke,
                }),
            opacity: 1 - line.transparency / 100,
          }}
        />
        {line.dataLabelShow && (
          <span
            className="chart-preview__constant-label"
            style={{
              color: line.dataLabelColor,
              ...(orientation === "vertical"
                ? { left: `${offsetPercent}%`, top: String(line.dataLabelVerticalPosition).toLowerCase() === "under" ? "auto" : 2, bottom: String(line.dataLabelVerticalPosition).toLowerCase() === "under" ? 2 : "auto" }
                : { bottom: `${offsetPercent}%`, left: String(line.dataLabelHorizontalPosition).toLowerCase() === "left" ? 2 : "auto", right: String(line.dataLabelHorizontalPosition).toLowerCase() === "left" ? "auto" : 2 }),
            }}
          >
            {String(line.dataLabelText) ||
              String(line.displayName) ||
              formatValue(Number(line.value) || 50, line.dataLabelDisplayUnits, line.dataLabelDecimalPoints)}
          </span>
        )}
      </Fragment>
    );
  };

  // Secondary value axis, drawn on the right. Its fields all carry a
  // `sec` prefix in the schema, so it can't reuse the AxisStyle helpers.
  const y2 = lineChartStyle.y2Axis;
  const y2TextStyle: CSSProperties = {
    color: y2.secLabelColor,
    fontFamily: y2.secFontFamily || undefined,
    fontSize: y2.secFontSize,
    fontWeight: y2.secBold ? 700 : 400,
    fontStyle: y2.secItalic ? "italic" : "normal",
    textDecoration: y2.secUnderline ? "underline" : "none",
  };
  const y2Node = y2.show && (
    <span className="chart-ticks chart-ticks--secondary">
      {Array.from({ length: 5 }, (_, i) => {
        const start = Number(y2.secStart) || 0;
        const end = Number(y2.secEnd) > start ? Number(y2.secEnd) : 40_000;
        return (
          <span key={i} style={y2TextStyle}>
            {formatValue(start + ((end - start) * i) / 4, y2.secLabelDisplayUnits, y2.secLabelPrecision)}
          </span>
        );
      })}
    </span>
  );
  const y2TitleNode = y2.show && y2.secShowAxisTitle && (
    <span
      className="chart-preview__axis-title chart-preview__axis-title--secondary"
      style={{
        color: y2.secTitleColor,
        fontFamily: y2.secTitleFontFamily || undefined,
        fontSize: y2.secTitleFontSize,
        fontWeight: y2.secTitleBold ? 700 : 400,
        fontStyle: y2.secTitleItalic ? "italic" : "normal",
        textDecoration: y2.secTitleUnderline ? "underline" : "none",
      }}
    >
      {String(y2.secTitleText) || "Secondary"}
    </span>
  );

  // A series label sits at the end of its line, optionally with a leader
  // line back to the series and its own background chip.
  const sl = lineChartStyle.seriesLabels;
  const seriesLabelNode = sl.show && (
    <span
      className="line-preview__series-label"
      style={{
        top: `${linePointCoords[linePointCoords.length - 1].y}%`,
        color: hexWithAlpha(sl.seriesMatchColor ? lineChartStyle.dataPoint.fill : sl.seriesColor, sl.seriesTransparency),
        fontFamily: sl.seriesFontFamily || undefined,
        fontSize: sl.textSize,
        fontWeight: sl.bold ? 700 : 400,
        fontStyle: sl.italic ? "italic" : "normal",
        textDecoration: sl.underline ? "underline" : "none",
        maxWidth: sl.seriesMaximumWidth || undefined,
        whiteSpace: sl.seriesWordWrap ? "normal" : "nowrap",
        marginLeft: sl.maximumOffset || undefined,
        backgroundColor: sl.enableBackground
          ? hexWithAlpha(sl.backgroundMatchColor ? lineChartStyle.dataPoint.fill : sl.backgroundColor, sl.backgroundTransparency)
          : undefined,
        padding: sl.enableBackground ? "1px 4px" : undefined,
        borderRadius: sl.enableBackground ? 3 : undefined,
        // "Left" puts the label at the start of the line instead.
        ...(String(sl.seriesPosition).toLowerCase() === "left" ? { left: 0, right: "auto" } : {}),
      }}
    >
      {sl.leaderLines && (
        <span
          className="line-preview__leader"
          aria-hidden="true"
          style={{
            borderTopWidth: sl.leaderLineWidth,
            borderTopStyle: mapLineStyle(sl.leaderLinePattern),
            borderTopColor: hexWithAlpha(sl.leaderLineColor, sl.leaderLineTransparency),
          }}
        />
      )}
      Applications
    </span>
  );

  const zoomNodes = <ZoomSliders zoom={lineChartStyle.zoom} categoryOrientation="horizontal" valueOrientation="vertical" />;

  // Error bars can carry their own label and a shaded band around the
  // series — 20-odd properties with nothing to render against before.
  const err = lineChartStyle.error;
  const errorShade = err.enabled && err.shadeShow && (
    <polygon
      points={`${linePointCoords.map((p) => `${p.x},${p.y - 7}`).join(" ")} ${[...linePointCoords].reverse().map((p) => `${p.x},${p.y + 7}`).join(" ")}`}
      fill={hexWithAlpha(err.shadeMatchSeriesColor ? lineChartStyle.dataPoint.fill : err.shadeColor, err.shadeTransparency)}
      stroke="none"
    />
  );
  const errorLabel = err.enabled && err.labelShow && (
    <span
      className="line-preview__error-label"
      style={{
        left: `${linePointCoords[3].x}%`,
        top: `${linePointCoords[3].y}%`,
        color: err.labelMatchSeriesColor ? lineChartStyle.dataPoint.fill : err.labelColor,
        fontFamily: err.labelFontFamily || undefined,
        fontSize: err.labelFontSize,
        fontWeight: err.labelBold ? 700 : 400,
        fontStyle: err.labelItalic ? "italic" : "normal",
        textDecoration: err.labelUnderline ? "underline" : "none",
        backgroundColor: err.labelBackground
          ? hexWithAlpha(err.labelBackgroundColor, err.labelBackgroundTransparency)
          : undefined,
        padding: err.labelBackground ? "1px 3px" : undefined,
        borderRadius: err.labelBackground ? 3 : undefined,
      }}
    >
      ±6%
    </span>
  );

  const lineConstantLines = (
    <>
      {constantLine(lineChartStyle.referenceLine, "vertical", 70, "ref")}
      {constantLine(lineChartStyle.xAxisReferenceLine, "vertical", 45, "x")}
      {constantLine(lineChartStyle.y1AxisReferenceLine, "horizontal", 55, "y1")}
    </>
  );

  // Forecast continues the series past the last point, with an optional
  // confidence band around it.
  const forecast = lineChartStyle.forecast;
  const forecastNode = forecast.show && (
    <>
      {forecast.bandAreaShow && (
        <polygon
          points="72,28 100,8 100,52 72,40"
          fill={hexWithAlpha(forecast.bandAreaMatchColor ? forecast.lineColor : forecast.bandAreaColor, forecast.bandAreaTransparency)}
          stroke={forecast.bandLineShow ? hexWithAlpha(forecast.bandLineMatchColor ? forecast.lineColor : forecast.bandLineColor, forecast.bandLineTransparency) : "none"}
          strokeWidth={forecast.bandLineWidth}
          strokeDasharray={String(forecast.bandLineDashArray) || svgDashArray(mapLineStyle(forecast.bandLinePattern))}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d="M 72 34 L 100 30"
        fill="none"
        stroke={hexWithAlpha(forecast.lineColor, forecast.strokeTransparency)}
        strokeWidth={forecast.width}
        strokeDasharray={String(forecast.dashArray) || svgDashArray(mapLineStyle(forecast.style))}
        strokeLinecap={String(forecast.dashCap).toLowerCase() === "flat" ? "butt" : "round"}
        vectorEffect="non-scaling-stroke"
      />
    </>
  );

  // Anomaly detection highlights outlying points and can shade a
  // confidence band behind the whole series. The band stays inside the
  // SVG (an area fill, not a shape that needs to look geometrically
  // correct), but the marker is rendered the same way as the series'
  // own markers — outside the SVG, via chartMarker — for the same
  // squashed-ellipse reason.
  const anomaly = lineChartStyle.anomalyDetection;
  const anomalyMarker = markerShape(String(anomaly.markerShape), anomaly.markerShapeSize || 7);
  const anomalyBandNode = anomaly.show && anomaly.confidenceBandShow && (
    <polygon
      points={`0,${linePointCoords[0].y - 9} ${linePointCoords.map((p) => `${p.x},${p.y - 9}`).join(" ")} 100,${
        linePointCoords[linePointCoords.length - 1].y + 9
      } ${[...linePointCoords].reverse().map((p) => `${p.x},${p.y + 9}`).join(" ")}`}
      fill={hexWithAlpha(anomaly.confidenceBandColor, anomaly.transparency)}
      stroke="none"
    />
  );
  const anomalyMarkerNode =
    anomaly.show &&
    anomaly.markerShow &&
    chartMarker(
      "anomaly",
      anomalyMarker,
      linePointCoords[2],
      hexWithAlpha(anomaly.markerColor, anomaly.markerTransparency),
      anomaly.markerBorderShow
        ? hexWithAlpha(
            anomaly.markerBorderColorMatchFill ? anomaly.markerColor : anomaly.markerBorderColor,
            anomaly.markerBorderTransparency,
          )
        : "none",
      anomaly.markerBorderWidth,
      anomaly.markerRotation,
    );

  // A small-multiples layout replaces the single plot with a grid of
  // repeated mini-charts, one per category.

  return (
    <span
      className={`chart-preview${lineLegendVertical ? " chart-preview--legend-side" : ""}${lineLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - lineChartStyle.plotArea.transparency / 100 }}
    >
      {!lineLegendAtBottom && lineLegendNode}
      <span className="chart-preview__body">
        {/* Power BI draws a line/column chart's value-axis title rotated
            along the left edge, beside the plot — not as a horizontal
            banner above it (that treatment belongs to a horizontal
            category axis, which this chart doesn't have). */}
        {lineChartStyle.valueAxis.showAxisTitle && (
          <span className="chart-preview__axis-title chart-preview__axis-title--rotated" style={axisTitleStyle(lineChartStyle.valueAxis)}>
            {String(lineChartStyle.valueAxis.titleText) || "Applications"}
          </span>
        )}
        <span className="chart-preview__body-main">
          {y2TitleNode}
          <span className="line-preview__plot" style={{ position: "relative" }}>
        <Gridlines axis={lineChartStyle.categoryAxis} orientation="vertical" count={linePointValues.length - 1} />
        <Gridlines axis={lineChartStyle.valueAxis} orientation="horizontal" />
        <AxisTickLabels axis={lineChartStyle.valueAxis} dataMax={LINE_DATA_MAX} orientation="vertical" />
        {y2Node}
        {seriesLabelNode}
        {zoomNodes}
        {errorLabel}
        {lineConstantLines}
        <svg className="line-preview__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {anomalyBandNode}
          {errorShade}
          {lineIsArea && (
            <path
              d={areaPath(linePointCoords, linePathD)}
              fill={hexWithAlpha(lineAreaColor, lineStyles.segmentGradient ? 60 : 78)}
              stroke="none"
            />
          )}
          {lineStyles.strokeShow && (
            <path
              d={linePathD}
              fill="none"
              stroke={hexWithAlpha(lineStrokeColor, lineStyles.strokeTransparency)}
              strokeWidth={lineStyles.strokeWidth}
              // An explicit dash array wins over the named line style,
              // matching how Power BI treats the advanced setting.
              strokeDasharray={String(lineStyles.strokeDashArray) || svgDashArray(lineDashStyle)}
              strokeLinejoin={
                ["round", "bevel", "miter"].includes(String(lineStyles.strokeLineJoin).toLowerCase())
                  ? (String(lineStyles.strokeLineJoin).toLowerCase() as "round" | "bevel" | "miter")
                  : "round"
              }
              strokeLinecap={String(lineStyles.strokeDashCap).toLowerCase() === "flat" ? "butt" : "round"}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {lineChartStyle.error.enabled && lineChartStyle.error.barShow && (
            <line
              x1={linePointCoords[3].x}
              x2={linePointCoords[3].x}
              y1={linePointCoords[3].y - 12}
              y2={linePointCoords[3].y + 12}
              stroke={lineChartStyle.error.barColor}
              strokeWidth={lineChartStyle.error.barWidth}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {forecastNode}
        </svg>
        {anomalyMarkerNode}
        {lineShowMarkers &&
          linePointCoords.map((point, index) => {
            const markerFill = hexWithAlpha(lineMarkerColor, lineChartStyle.markers.transparency);
            const markerStroke = lineChartStyle.markers.borderShow
              ? hexWithAlpha(
                  lineChartStyle.markers.borderColorMatchFill ? lineMarkerColor : lineChartStyle.markers.borderColor,
                  lineChartStyle.markers.borderTransparency,
                )
              : "none";
            return chartMarker(
              index,
              lineMarker,
              point,
              markerFill,
              markerStroke,
              lineChartStyle.markers.borderWidth,
              lineChartStyle.markers.rotation,
            );
          })}
        {lineChartStyle.trend.show && (
          <span
            className="chart-preview__trend-line"
            aria-hidden="true"
            style={{
              borderTopWidth: lineChartStyle.trend.width,
              borderTopColor: lineChartStyle.trend.lineColor,
              borderTopStyle: mapLineStyle(lineChartStyle.trend.style),
              opacity: 1 - lineChartStyle.trend.transparency / 100,
            }}
          />
        )}
        {/* One label per point, thinned by label density like Power BI. */}
        {linePointCoords.map((point, index) =>
          labelVisibleAt(index, linePointCoords.length, lineChartStyle.labels.labelDensity) ? (
            <span key={index} className="line-preview__label" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
              <DataLabel
                labels={lineChartStyle.labels}
                category={lineCategoryLabels[index] ?? ""}
                value={linePointValues[index] * 1000}
                detail={linePointValues[index] * 8}
              />
            </span>
          ) : null,
        )}
      </span>
      {lineChartStyle.categoryAxis.show && (
        <span className="line-preview__axis-labels">
          {lineCategoryLabels.map((label) => (
            <span key={label} style={textStyle(lineChartStyle.categoryAxis)}>
              {label}
            </span>
          ))}
        </span>
      )}
      {lineChartStyle.categoryAxis.showAxisTitle && (
        <span className="chart-preview__axis-title" style={axisTitleStyle(lineChartStyle.categoryAxis)}>
          {String(lineChartStyle.categoryAxis.titleText) || "Month"}
        </span>
      )}
        </span>
      </span>
      {lineLegendAtBottom && lineLegendNode}
    </span>
  );
}
