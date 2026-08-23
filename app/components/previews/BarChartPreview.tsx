import { hexWithAlpha } from "../../lib/colorUtils";
import { AxisTickLabels, axisTitleStyle, ChartLegend, DataLabel, Gridlines, labelIsInside, labelVisibleAt, legendIsAfterPlot, legendIsVertical, mapLineStyle, textStyle, ZoomSliders } from "../ChartParts";
import { BAR_DATA_MAX, barCategories, barPercent } from "../../lib/previewSampleData";
import { BAR_VALUE_AXIS_INSET, barThickness } from "./chartPrimitives";
import type { ResolvedBarChartStyle } from "../../lib/barChartProperties";

type Props = { barChartStyle: ResolvedBarChartStyle };

export function BarChartPreview({ barChartStyle }: Props) {
  // Series shown in every cartesian chart's legend. Clustered charts show
  // one series; the stacked variants show the two they actually draw.
  const singleSeries = [{ label: "Applications", color: barChartStyle.dataPoint.fill }];

  const legendNode = <ChartLegend legend={barChartStyle.legend} items={singleSeries} />;
  const legendAtBottom = legendIsAfterPlot(barChartStyle.legend.position);
  const legendVertical = legendIsVertical(barChartStyle.legend.position);

  return (
    <span
      className={`chart-preview${legendVertical ? " chart-preview--legend-side" : ""}${legendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - barChartStyle.plotArea.transparency / 100 }}
    >
      {!legendAtBottom && legendNode}
      <span className="chart-preview__body">
        {/* Power BI draws a horizontal bar chart's category axis title
            rotated along the left edge, beside the category labels — not
            as a horizontal banner above the plot. */}
        {barChartStyle.categoryAxis.showAxisTitle && (
          <span className="chart-preview__axis-title chart-preview__axis-title--rotated" style={axisTitleStyle(barChartStyle.categoryAxis)}>
            {String(barChartStyle.categoryAxis.titleText) || "Region"}
          </span>
        )}
        <span className="chart-preview__body-main">
          <span className="chart-preview__plot" style={{ position: "relative", gap: `${barChartStyle.categoryAxis.innerPadding}%` }}>
            <Gridlines axis={barChartStyle.valueAxis} orientation="vertical" inset={BAR_VALUE_AXIS_INSET} />
            <ZoomSliders zoom={barChartStyle.zoom} categoryOrientation="vertical" valueOrientation="horizontal" />
            {barChartStyle.referenceLine.show && (
              <span
                className="chart-preview__reference-line"
                aria-hidden="true"
                style={{
                  left: "65%",
                  borderLeftWidth: barChartStyle.referenceLine.width,
                  borderLeftColor: barChartStyle.referenceLine.lineColor,
                  borderLeftStyle: mapLineStyle(barChartStyle.referenceLine.style),
                  opacity: 1 - barChartStyle.referenceLine.transparency / 100,
                }}
              />
            )}
            {barChartStyle.trend.show && (
              <span
                className="chart-preview__trend-line"
                aria-hidden="true"
                style={{
                  borderTopWidth: barChartStyle.trend.width,
                  borderTopColor: barChartStyle.trend.lineColor,
                  borderTopStyle: mapLineStyle(barChartStyle.trend.style),
                  opacity: 1 - barChartStyle.trend.transparency / 100,
                }}
              />
            )}
            {barCategories.map(([label, value], index) => (
              <span className="bar-row" key={label}>
                {barChartStyle.categoryAxis.show && (
                  <span className="bar-row__label" style={textStyle(barChartStyle.categoryAxis)}>
                    {label}
                  </span>
                )}
                <span className="bar-row__track-wrap">
                  <span className="bar-row__track">
                    <span
                      className="bar-row__fill"
                      style={{
                        width: `${barPercent(value)}%`,
                        // Gap size thins the bar within its slot; 0 keeps the
                        // Power BI default rather than collapsing the bar.
                        height: barThickness(barChartStyle.layout.clusteredGapSize),
                        backgroundColor: hexWithAlpha(barChartStyle.dataPoint.fill, barChartStyle.dataPoint.fillTransparency),
                        border: barChartStyle.dataPoint.borderShow
                          ? `${barChartStyle.dataPoint.borderSize}px solid ${hexWithAlpha(
                              barChartStyle.dataPoint.borderColorMatchFill ? barChartStyle.dataPoint.fill : barChartStyle.dataPoint.borderColor,
                              barChartStyle.dataPoint.borderTransparency,
                            )}`
                          : undefined,
                        // "Outline only" draws the border and drops the fill.
                        ...(barChartStyle.dataPoint.borderOutlineOnly ? { backgroundColor: "transparent" } : {}),
                      }}
                    />
                  </span>
                  {index === 0 && barChartStyle.error.enabled && barChartStyle.error.barShow && (
                    <span
                      className="bar-row__error"
                      aria-hidden="true"
                      title="Error bars are enabled — representative indicator, not a data-fit range"
                      style={{ left: `${barPercent(value)}%` }}
                    >
                      <span
                        style={{
                          height: `${barChartStyle.error.barWidth}px`,
                          backgroundColor: barChartStyle.error.barColor,
                          border: `${barChartStyle.error.barBorderSize}px solid ${barChartStyle.error.barBorderColor}`,
                        }}
                      />
                    </span>
                  )}
                </span>
                {labelVisibleAt(index, barCategories.length, barChartStyle.labels.labelDensity) && (
                  <span className={`bar-row__value${labelIsInside(barChartStyle.labels.labelPosition) ? " bar-row__value--inside" : ""}`}>
                    <DataLabel labels={barChartStyle.labels} category={label} value={value * 1000} detail={value * 12} />
                  </span>
                )}
              </span>
            ))}
          </span>
          <AxisTickLabels axis={barChartStyle.valueAxis} dataMax={BAR_DATA_MAX} orientation="horizontal" inset={BAR_VALUE_AXIS_INSET} />
          {barChartStyle.valueAxis.showAxisTitle && (
            <span className="chart-preview__axis-title chart-preview__axis-title--value" style={axisTitleStyle(barChartStyle.valueAxis)}>
              {String(barChartStyle.valueAxis.titleText) || "Applications"}
            </span>
          )}
        </span>
      </span>
      {legendAtBottom && legendNode}
    </span>
  );
}
