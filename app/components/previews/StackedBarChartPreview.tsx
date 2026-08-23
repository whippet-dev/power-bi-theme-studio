import { AxisTickLabels, axisTitleStyle, ChartLegend, dataLabelStyle, formatValue, Gridlines, legendIsAfterPlot, legendIsVertical, mapLineStyle, textStyle, ZoomSliders } from "../ChartParts";
import { BAR_DATA_MAX, barCategories, barPercent, stackedSegmentColor, stackedSegmentShare } from "../../lib/previewSampleData";
import { BAR_VALUE_AXIS_INSET, barThickness } from "./chartPrimitives";
import type { ResolvedStackedBarChartStyle } from "../../lib/stackedBarChartProperties";

type Props = { stackedBarChartStyle: ResolvedStackedBarChartStyle; palette: string[] };

export function StackedBarChartPreview({ stackedBarChartStyle, palette }: Props) {
  const stackedSegment = stackedSegmentColor(palette);

  // Stacked charts genuinely draw two series, so their legend lists both.
  const stackedBarSeries = [
    { label: "Approved", color: stackedBarChartStyle.dataPoint.fill },
    { label: "In review", color: stackedSegment },
  ];
  const stackedBarLegendNode = <ChartLegend legend={stackedBarChartStyle.legend} items={stackedBarSeries} />;
  const stackedBarLegendAtBottom = legendIsAfterPlot(stackedBarChartStyle.legend.position);
  const stackedBarLegendVertical = legendIsVertical(stackedBarChartStyle.legend.position);

  return (
    <span
      className={`chart-preview${stackedBarLegendVertical ? " chart-preview--legend-side" : ""}${stackedBarLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - stackedBarChartStyle.plotArea.transparency / 100 }}
    >
      {!stackedBarLegendAtBottom && stackedBarLegendNode}
      <span className="chart-preview__body">
        {stackedBarChartStyle.categoryAxis.showAxisTitle && (
          <span className="chart-preview__axis-title chart-preview__axis-title--rotated" style={axisTitleStyle(stackedBarChartStyle.categoryAxis)}>
            {String(stackedBarChartStyle.categoryAxis.titleText) || "Region"}
          </span>
        )}
        <span className="chart-preview__body-main">
          <span className="chart-preview__plot" style={{ position: "relative", gap: `${stackedBarChartStyle.categoryAxis.innerPadding}%` }}>
            <Gridlines axis={stackedBarChartStyle.valueAxis} orientation="vertical" inset={BAR_VALUE_AXIS_INSET} />
            <ZoomSliders zoom={stackedBarChartStyle.zoom} categoryOrientation="vertical" valueOrientation="horizontal" />
            {stackedBarChartStyle.trend.show && (
              <span
                className="chart-preview__trend-line"
                aria-hidden="true"
                style={{
                  borderTopWidth: stackedBarChartStyle.trend.width,
                  borderTopColor: stackedBarChartStyle.trend.lineColor,
                  borderTopStyle: mapLineStyle(stackedBarChartStyle.trend.style),
                  opacity: 1 - stackedBarChartStyle.trend.transparency / 100,
                }}
              />
            )}
            {barCategories.map(([label, value], index) => (
              <span className="bar-row" key={label}>
                {stackedBarChartStyle.categoryAxis.show && (
                  <span className="bar-row__label" style={textStyle(stackedBarChartStyle.categoryAxis)}>
                    {label}
                  </span>
                )}
                <span className="bar-row__track-wrap">
                  <span className="bar-row__track">
                    <span
                      className="bar-row__fill"
                      style={{
                        width: `${barPercent(value)}%`,
                        height: barThickness(stackedBarChartStyle.layout.stackedGapSize),
                        opacity: 1 - stackedBarChartStyle.dataPoint.fillTransparency / 100,
                        background: `linear-gradient(to right, ${stackedBarChartStyle.dataPoint.fill} 0%, ${stackedBarChartStyle.dataPoint.fill} ${stackedSegmentShare}%, ${stackedSegment} ${stackedSegmentShare}%, ${stackedSegment} 100%)`,
                        border: stackedBarChartStyle.dataPoint.borderShow
                          ? `${stackedBarChartStyle.dataPoint.borderSize}px solid ${stackedBarChartStyle.dataPoint.borderColor}`
                          : undefined,
                      }}
                    />
                  </span>
                  {index === 0 && stackedBarChartStyle.error.enabled && stackedBarChartStyle.error.barShow && (
                    <span
                      className="bar-row__error"
                      aria-hidden="true"
                      title="Error bars are enabled — representative indicator, not a data-fit range"
                      style={{ left: `${barPercent(value)}%` }}
                    >
                      <span
                        style={{
                          height: `${stackedBarChartStyle.error.barWidth}px`,
                          backgroundColor: stackedBarChartStyle.error.barColor,
                          border: `${stackedBarChartStyle.error.barBorderSize}px solid ${stackedBarChartStyle.error.barBorderColor}`,
                        }}
                      />
                    </span>
                  )}
                </span>
                {stackedBarChartStyle.totals.show && (
                  <span className="bar-row__value" style={dataLabelStyle(stackedBarChartStyle.totals)}>
                    {formatValue(value * 1000, stackedBarChartStyle.totals.labelDisplayUnits, stackedBarChartStyle.totals.labelPrecision)}
                  </span>
                )}
              </span>
            ))}
          </span>
          <AxisTickLabels axis={stackedBarChartStyle.valueAxis} dataMax={BAR_DATA_MAX} orientation="horizontal" inset={BAR_VALUE_AXIS_INSET} />
          {stackedBarChartStyle.valueAxis.showAxisTitle && (
            <span className="chart-preview__axis-title chart-preview__axis-title--value" style={axisTitleStyle(stackedBarChartStyle.valueAxis)}>
              {String(stackedBarChartStyle.valueAxis.titleText) || "Applications"}
            </span>
          )}
        </span>
      </span>
      {stackedBarLegendAtBottom && stackedBarLegendNode}
    </span>
  );
}
