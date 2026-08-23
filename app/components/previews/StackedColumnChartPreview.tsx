import { hexWithAlpha } from "../../lib/colorUtils";
import {
  axisTitleStyle,
  ChartLegend,
  dataLabelStyle,
  formatValue,
  legendIsAfterPlot,
  legendIsVertical,
  mapLineStyle,
  textStyle,
  ZoomSliders,
} from "../ChartParts";
import { BAR_DATA_MAX, barCategories, stackedSegmentColor, stackedSegmentShare } from "../../lib/previewSampleData";
import { categoryPercent, COLUMN_CHART_BOX, useCartesianLayout, valueFraction } from "./cartesianLayout";
import type { ResolvedStackedColumnChartStyle } from "../../lib/stackedColumnChartProperties";

type Props = { stackedColumnChartStyle: ResolvedStackedColumnChartStyle; palette: string[] };

export function StackedColumnChartPreview({ stackedColumnChartStyle, palette }: Props) {
  // Was a single `stackedSegment` shared with the stacked bar chart in the
  // old VisualGallery body. Same expression, same palette, now computed
  // per component so neither can reach into the other's locals.
  const stackedSegment = stackedSegmentColor(palette);

  const stackedColumnLegendNode = (
    <ChartLegend
      legend={stackedColumnChartStyle.legend}
      items={[
        { label: "Approved", color: stackedColumnChartStyle.dataPoint.fill },
        { label: "In review", color: stackedSegment },
      ]}
    />
  );
  const stackedColumnLegendAtBottom = legendIsAfterPlot(stackedColumnChartStyle.legend.position);
  const stackedColumnLegendVertical = legendIsVertical(stackedColumnChartStyle.legend.position);

  // Same engine, same box as the clustered column chart — the two share the
  // CSS and must share the coordinate system too, or they drift apart.
  const layout = useCartesianLayout({
    box: COLUMN_CHART_BOX,
    orientation: "vertical",
    categoryAxis: stackedColumnChartStyle.categoryAxis,
    valueAxis: stackedColumnChartStyle.valueAxis,
    categories: barCategories.map(([label]) => label),
    dataMax: BAR_DATA_MAX,
    innerPadding: stackedColumnChartStyle.categoryAxis.innerPadding,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  const valueGutter = layout.valueAxis?.width ?? 0;
  const categoryGutter = layout.categoryAxis?.height ?? 0;
  const zeroPct = valueFraction(layout, 0) * 100;

  return (
    <span
      className={`chart-preview${stackedColumnLegendVertical ? " chart-preview--legend-side" : ""}${stackedColumnLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - stackedColumnChartStyle.plotArea.transparency / 100 }}
    >
      {!stackedColumnLegendAtBottom && stackedColumnLegendNode}
      <span className="chart-preview__body">
        <span className="chart-preview__body-main">
          <span className="column-preview__plot" style={{ height: COLUMN_CHART_BOX.height }}>
            {layout.valueAxis && (
              <span className="chart-axis-gutter chart-axis-gutter--value" style={{ width: valueGutter, bottom: categoryGutter }}>
                {stackedColumnChartStyle.valueAxis.showAxisTitle && (
                  <span
                    className="chart-preview__axis-title chart-preview__axis-title--rotated"
                    style={axisTitleStyle(stackedColumnChartStyle.valueAxis)}
                  >
                    {String(stackedColumnChartStyle.valueAxis.titleText) || "Applications"}
                  </span>
                )}
                <span className="chart-axis-gutter__ticks">
                  {layout.scale.ticks.map((tick, index) => (
                    <span
                      key={index}
                      style={{
                        ...textStyle(stackedColumnChartStyle.valueAxis),
                        bottom: `${valueFraction(layout, tick) * 100}%`,
                      }}
                    >
                      {formatValue(
                        tick,
                        stackedColumnChartStyle.valueAxis.labelDisplayUnits,
                        stackedColumnChartStyle.valueAxis.labelPrecision,
                      )}
                    </span>
                  ))}
                </span>
              </span>
            )}

            <span className="chart-plot" style={{ left: valueGutter, bottom: categoryGutter }}>
              {stackedColumnChartStyle.valueAxis.gridlineShow &&
                layout.scale.ticks.map((tick, index) => (
                  <span
                    className="chart-gridline"
                    key={index}
                    aria-hidden="true"
                    style={{
                      left: 0,
                      right: 0,
                      bottom: `${valueFraction(layout, tick) * 100}%`,
                      borderTopWidth: stackedColumnChartStyle.valueAxis.gridlineThickness,
                      borderTopStyle:
                        String(stackedColumnChartStyle.valueAxis.gridlineDashArray ?? "") !== ""
                          ? "dashed"
                          : mapLineStyle(stackedColumnChartStyle.valueAxis.gridlineStyle),
                      borderTopColor: hexWithAlpha(
                        stackedColumnChartStyle.valueAxis.gridlineColor,
                        stackedColumnChartStyle.valueAxis.gridlineTransparency ?? 0,
                      ),
                    }}
                  />
                ))}

              <ZoomSliders zoom={stackedColumnChartStyle.zoom} categoryOrientation="horizontal" valueOrientation="vertical" />

              {stackedColumnChartStyle.trend.show && (
                <span
                  className="chart-preview__trend-line"
                  aria-hidden="true"
                  style={{
                    borderTopWidth: stackedColumnChartStyle.trend.width,
                    borderTopColor: stackedColumnChartStyle.trend.lineColor,
                    borderTopStyle: mapLineStyle(stackedColumnChartStyle.trend.style),
                    opacity: 1 - stackedColumnChartStyle.trend.transparency / 100,
                  }}
                />
              )}

              {barCategories.map(([label, value], index) => {
                const { offset: left, size: width } = categoryPercent(layout, index, barCategories.length);
                const topPct = valueFraction(layout, value * 1000) * 100;
                const height = Math.abs(topPct - zeroPct);
                const bottom = Math.min(topPct, zeroPct);
                return (
                  <span className="column-item" key={label} style={{ left: `${left}%`, width: `${width}%` }}>
                    {stackedColumnChartStyle.totals.show && (
                      <span
                        className="column-item__value"
                        style={{
                          ...dataLabelStyle(stackedColumnChartStyle.totals),
                          bottom: `${topPct}%`,
                          backgroundColor: stackedColumnChartStyle.totals.enableBackground
                            ? hexWithAlpha(
                                stackedColumnChartStyle.totals.backgroundColor,
                                stackedColumnChartStyle.totals.backgroundTransparency,
                              )
                            : undefined,
                          padding: stackedColumnChartStyle.totals.enableBackground ? "1px 4px" : undefined,
                          borderRadius: stackedColumnChartStyle.totals.enableBackground ? 3 : undefined,
                        }}
                      >
                        {formatValue(
                          value * 1000,
                          stackedColumnChartStyle.totals.labelDisplayUnits,
                          stackedColumnChartStyle.totals.labelPrecision,
                        )}
                      </span>
                    )}
                    <span
                      className="column-item__fill"
                      style={{
                        bottom: `${bottom}%`,
                        height: `${height}%`,
                        width: barThicknessPercent(stackedColumnChartStyle.layout.stackedGapSize),
                        opacity: 1 - stackedColumnChartStyle.dataPoint.fillTransparency / 100,
                        // The 62% split stays exactly as it was: a known
                        // fiction (RENDERER_AUDIT §4.2), and sample-data work
                        // for a later phase. T7 only fixes where the column
                        // sits, not what it claims to contain.
                        background: `linear-gradient(to top, ${stackedColumnChartStyle.dataPoint.fill} 0%, ${stackedColumnChartStyle.dataPoint.fill} ${stackedSegmentShare}%, ${stackedSegment} ${stackedSegmentShare}%, ${stackedSegment} 100%)`,
                        border: stackedColumnChartStyle.dataPoint.borderShow
                          ? `${stackedColumnChartStyle.dataPoint.borderSize}px solid ${stackedColumnChartStyle.dataPoint.borderColor}`
                          : undefined,
                      }}
                    />
                    {index === 0 && stackedColumnChartStyle.error.enabled && stackedColumnChartStyle.error.barShow && (
                      <span
                        className="column-item__error"
                        aria-hidden="true"
                        title="Error bars are enabled — representative indicator, not a data-fit range"
                        style={{ bottom: `${topPct}%` }}
                      >
                        <span
                          style={{
                            width: `${stackedColumnChartStyle.error.barWidth}px`,
                            backgroundColor: stackedColumnChartStyle.error.barColor,
                            border: `${stackedColumnChartStyle.error.barBorderSize}px solid ${stackedColumnChartStyle.error.barBorderColor}`,
                          }}
                        />
                      </span>
                    )}
                  </span>
                );
              })}
            </span>

            {layout.categoryAxis && (
              <span className="chart-axis-gutter chart-axis-gutter--category" style={{ height: categoryGutter, left: valueGutter }}>
                {barCategories.map(([label], index) => {
                  const { offset: left, size: width } = categoryPercent(layout, index, barCategories.length);
                  return (
                    <span
                      className="column-item__label"
                      key={label}
                      style={{ ...textStyle(stackedColumnChartStyle.categoryAxis), left: `${left}%`, width: `${width}%` }}
                    >
                      {label}
                    </span>
                  );
                })}
                {stackedColumnChartStyle.categoryAxis.showAxisTitle && (
                  <span
                    className="chart-preview__axis-title chart-axis-gutter__title"
                    style={{
                      color: stackedColumnChartStyle.categoryAxis.titleColor,
                      fontFamily: stackedColumnChartStyle.categoryAxis.titleFontFamily,
                      fontSize: stackedColumnChartStyle.categoryAxis.titleFontSize,
                      fontWeight: stackedColumnChartStyle.categoryAxis.titleBold ? 700 : 400,
                      fontStyle: stackedColumnChartStyle.categoryAxis.titleItalic ? "italic" : "normal",
                      textDecoration: stackedColumnChartStyle.categoryAxis.titleUnderline ? "underline" : "none",
                    }}
                  >
                    {String(stackedColumnChartStyle.categoryAxis.titleText) || "Region"}
                  </span>
                )}
              </span>
            )}
          </span>
        </span>
      </span>
      {stackedColumnLegendAtBottom && stackedColumnLegendNode}
    </span>
  );
}

/** Bar thickness as a share of its category slot, matching the old helper. */
function barThicknessPercent(gapSize: number): string {
  const gap = Math.max(0, Math.min(90, gapSize || 20));
  return `${100 - gap}%`;
}
