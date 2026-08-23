import { Fragment, type CSSProperties } from "react";
import { hexWithAlpha } from "../../lib/colorUtils";
import {
  CategoryAxisGutter,
  CategoryGridlines,
  ChartLegend,
  DataLabel,
  formatValue,
  labelVisibleAt,
  legendIsAfterPlot,
  legendIsVertical,
  mapLineStyle,
  ScaledGridlines,
  ValueAxisGutter,
  ZoomSliders,
} from "../ChartParts";
import { areaPath, linePath, markerShape } from "../../lib/lineGeometry";
import {
  categoryCentre,
  categoryPercent,
  clampedValueCoordinate,
  computePreviewCartesianLayout,
  LINE_CHART_BOX,
  valueFraction,
} from "./cartesianLayout";
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
  // One layout, and one set of point coordinates derived from it. Every
  // other position on this chart — path, markers, labels, bands, constant
  // lines — is computed from these, so nothing can end up on a second
  // scale. Before T10 a point's y was `100 - value`, which put a value of
  // 68 at 68% of the plot while its own axis said 68000/70000 = 97%.
  const layout = computePreviewCartesianLayout({
    box: LINE_CHART_BOX,
    orientation: "vertical",
    categoryAxis: lineChartStyle.categoryAxis,
    valueAxis: lineChartStyle.valueAxis,
    categories: lineCategoryLabels,
    dataMax: LINE_DATA_MAX,
    innerPadding: 0,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Month",
  });
  const plot = layout.plot;
  const pointCount = linePointValues.length;
  const categoryGutter = layout.categoryAxis?.height ?? 0;
  const valueGutter = layout.valueAxis?.width ?? 0;

  /**
   * Points in the SVG's coordinate system, which IS the plot's own natural
   * box translated to its origin — not an abstract normalised space. The
   * viewBox below is the plot's width and height, so these numbers are the
   * engine's numbers.
   */
  const linePointCoords = linePointValues.map((value, index) => ({
    x: categoryCentre(layout, index, pointCount) - plot.x,
    y: layout.scale.value(value * 1000) - plot.y,
  }));
  /** The same points as percentages, for the HTML overlays. One conversion. */
  const pointPercent = (index: number) => {
    const slot = categoryPercent(layout, index, pointCount);
    return {
      left: slot.offset + slot.size / 2,
      top: (1 - valueFraction(layout, linePointValues[index] * 1000)) * 100,
    };
  };

  /**
   * The same point, as the {x,y} percentages chartMarker positions with.
   * Markers are HTML overlays on the plot, not SVG children, so they take
   * percentages of the plot — not the plot-pixel coordinates the path uses.
   * The old 0..100 SVG space made those two identical by accident; they are
   * not identical any more, so the conversion is explicit here.
   */
  const pointMarkerPoint = (index: number) => {
    const { left, top } = pointPercent(index);
    return { x: left, y: top };
  };
  /**
   * Where an area fill closes to. Zero when zero is on the plot; the
   * nearest visible edge when a pinned range puts it off. The SVG is
   * `overflow: visible` so the markers' HTML siblings can sit proud of it,
   * which means an unclamped baseline would spill the fill into the axis
   * gutters rather than simply drawing off-screen.
   */
  const areaBaseline = clampedValueCoordinate(layout, 0);

  /** A fraction of the plot, in SVG (plot-space) units. */
  const fx = (fraction: number) => fraction * plot.width;
  const fy = (fraction: number) => fraction * plot.height;
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
  /**
   * `seriesPosition` names which end of the SERIES the label belongs to,
   * not which side of the plot it sits on — so it selects a data point,
   * and the engine decides where that point is. Inverting the category
   * axis therefore carries the label across with its own endpoint instead
   * of stranding it against an edge, and no array is reversed here (T8).
   *
   * Before T10 the first and last points sat exactly on the plot's edges,
   * so `right: 0` / `left: 0` happened to be the endpoints. Slot centres
   * put them at 10%/90% instead and the label stayed on the edge.
   */
  const seriesLabelAtStart = String(sl.seriesPosition).toLowerCase() === "left";
  const seriesLabelPoint = pointPercent(seriesLabelAtStart ? 0 : pointCount - 1);
  /** Natural units, like every other pre-transform number here. */
  const seriesLabelOffset = Number(sl.maximumOffset) || 0;
  const seriesLabelNode = sl.show && (
    <span
      className="line-preview__series-label"
      style={{
        left: `${seriesLabelPoint.left}%`,
        top: `${seriesLabelPoint.top}%`,
        // The box hangs off the anchor on the side away from the series,
        // which puts its inner edge — and so the leader line, the flex
        // item nearest it — on the endpoint itself. `maximumOffset` (the
        // gap between series and label) rides in the same transform rather
        // than as a margin: a margin on the side facing the series is inert
        // at the start end, where the box is positioned by `left` and its
        // `right` is auto, so the two ends would displace differently.
        transform: seriesLabelAtStart
          ? `translate(calc(-100% - ${seriesLabelOffset}px), -50%)`
          : `translate(${seriesLabelOffset}px, -50%)`,
        // row-reverse keeps the leader between the text and the point when
        // the label is on the point's left, rather than trailing away.
        flexDirection: seriesLabelAtStart ? "row-reverse" : "row",
        color: hexWithAlpha(sl.seriesMatchColor ? lineChartStyle.dataPoint.fill : sl.seriesColor, sl.seriesTransparency),
        fontFamily: sl.seriesFontFamily || undefined,
        fontSize: sl.textSize,
        fontWeight: sl.bold ? 700 : 400,
        fontStyle: sl.italic ? "italic" : "normal",
        textDecoration: sl.underline ? "underline" : "none",
        maxWidth: sl.seriesMaximumWidth || undefined,
        whiteSpace: sl.seriesWordWrap ? "normal" : "nowrap",
        backgroundColor: sl.enableBackground
          ? hexWithAlpha(sl.backgroundMatchColor ? lineChartStyle.dataPoint.fill : sl.backgroundColor, sl.backgroundTransparency)
          : undefined,
        padding: sl.enableBackground ? "1px 4px" : undefined,
        borderRadius: sl.enableBackground ? 3 : undefined,
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
      points={`${linePointCoords.map((p) => `${p.x},${p.y - fy(0.07)}`).join(" ")} ${[...linePointCoords].reverse().map((p) => `${p.x},${p.y + fy(0.07)}`).join(" ")}`}
      fill={hexWithAlpha(err.shadeMatchSeriesColor ? lineChartStyle.dataPoint.fill : err.shadeColor, err.shadeTransparency)}
      stroke="none"
    />
  );
  const errorLabel = err.enabled && err.labelShow && (
    <span
      className="line-preview__error-label"
      style={{
        left: `${pointPercent(3).left}%`,
        top: `${pointPercent(3).top}%`,
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
      {/* The two value-axis constant lines now sit where their own value
          puts them, through the same scale as the series and the
          gridlines. Both are horizontal because the value axis is
          vertical — the reference line used to be drawn vertically at a
          hardcoded 70%, which was on no scale and on the wrong axis.

          xAxisReferenceLine stays at a fixed position: it belongs to the
          CATEGORY axis, which has no numeric value model here, and giving
          it one is Phase 2 constant-line work rather than T10 geometry. */}
      {constantLine(lineChartStyle.referenceLine, "horizontal", valueFraction(layout, lineChartStyle.referenceLine.value) * 100, "ref")}
      {constantLine(lineChartStyle.y1AxisReferenceLine, "horizontal", valueFraction(layout, lineChartStyle.y1AxisReferenceLine.value) * 100, "y1")}
      {constantLine(lineChartStyle.xAxisReferenceLine, "vertical", 45, "x")}
    </>
  );

  // Forecast continues the series past the last point, with an optional
  // confidence band around it.
  const forecast = lineChartStyle.forecast;
  const forecastNode = forecast.show && (
    <>
      {forecast.bandAreaShow && (
        <polygon
          points={`${fx(0.72)},${fy(0.28)} ${fx(1)},${fy(0.08)} ${fx(1)},${fy(0.52)} ${fx(0.72)},${fy(0.4)}`}
          fill={hexWithAlpha(forecast.bandAreaMatchColor ? forecast.lineColor : forecast.bandAreaColor, forecast.bandAreaTransparency)}
          stroke={forecast.bandLineShow ? hexWithAlpha(forecast.bandLineMatchColor ? forecast.lineColor : forecast.bandLineColor, forecast.bandLineTransparency) : "none"}
          strokeWidth={forecast.bandLineWidth}
          strokeDasharray={String(forecast.bandLineDashArray) || svgDashArray(mapLineStyle(forecast.bandLinePattern))}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={`M ${fx(0.72)} ${fy(0.34)} L ${fx(1)} ${fy(0.3)}`}
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
      points={`0,${linePointCoords[0].y - fy(0.09)} ${linePointCoords.map((p) => `${p.x},${p.y - fy(0.09)}`).join(" ")} ${plot.width},${
        linePointCoords[pointCount - 1].y + fy(0.09)
      } ${[...linePointCoords].reverse().map((p) => `${p.x},${p.y + fy(0.09)}`).join(" ")}`}
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
      pointMarkerPoint(2),
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
        <span className="chart-preview__body-main">
          {y2TitleNode}
          <span className="line-preview__plot" style={{ height: LINE_CHART_BOX.height }}>
            <ValueAxisGutter
              axis={lineChartStyle.valueAxis}
              layout={layout}
              offset={categoryGutter}
              titleFallback="Applications"
            />
            <span className="chart-plot" style={{ left: valueGutter, bottom: categoryGutter }}>
              <CategoryGridlines axis={lineChartStyle.categoryAxis} layout={layout} count={pointCount} />
              <ScaledGridlines axis={lineChartStyle.valueAxis} layout={layout} />
              {y2Node}
              {seriesLabelNode}
              {zoomNodes}
              {errorLabel}
              {lineConstantLines}
              {/* The viewBox IS the engine's plot box, so every number inside is
                  a ChartLayout coordinate rather than a normalised 0..100 one.
                  preserveAspectRatio stays "none" because the rendered plot is
                  fluid and must fill it; what changed is that the space is no
                  longer separate from the axes' — see the T10 report. */}
              <svg
                className="line-preview__svg"
                viewBox={`0 0 ${plot.width} ${plot.height}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {anomalyBandNode}
                {errorShade}
                {lineIsArea && (
                  <path
                    d={areaPath(linePointCoords, linePathD, areaBaseline)}
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
                    y1={linePointCoords[3].y - fy(0.12)}
                    y2={linePointCoords[3].y + fy(0.12)}
                    stroke={lineChartStyle.error.barColor}
                    strokeWidth={lineChartStyle.error.barWidth}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {forecastNode}
              </svg>
              {anomalyMarkerNode}
              {lineShowMarkers &&
                linePointValues.map((_, index) => {
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
                    pointMarkerPoint(index),
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
              {/* One label per point, thinned by label density like Power BI.
                  Anchored to the same point geometry as the path and markers. */}
              {linePointValues.map((_, index) =>
                labelVisibleAt(index, pointCount, lineChartStyle.labels.labelDensity) ? (
                  <span
                    key={index}
                    className="line-preview__label"
                    style={{ left: `${pointPercent(index).left}%`, top: `${pointPercent(index).top}%` }}
                  >
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
            {/* Labels sit on the same category slots the points are centred in,
                so inverting the category axis moves both together. */}
            <CategoryAxisGutter
              axis={lineChartStyle.categoryAxis}
              layout={layout}
              categories={lineCategoryLabels}
              offset={valueGutter}
              titleFallback="Month"
            />
          </span>
        </span>
      </span>
      {lineLegendAtBottom && lineLegendNode}
    </span>
  );
}
