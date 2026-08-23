import { hexWithAlpha } from "../../lib/colorUtils";
import { AxisTickLabels, axisTitleStyle, ChartLegend, dataLabelStyle, formatValue, Gridlines, legendIsAfterPlot, legendIsVertical, mapLineStyle, textStyle, ZoomSliders } from "../ChartParts";
import { BAR_DATA_MAX, barCategories, barPercent, stackedSegmentColor, stackedSegmentShare } from "../../lib/previewSampleData";
import { barThickness } from "./chartPrimitives";
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

  return (
    <span
      className={`chart-preview${stackedColumnLegendVertical ? " chart-preview--legend-side" : ""}${stackedColumnLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - stackedColumnChartStyle.plotArea.transparency / 100 }}
    >
      {!stackedColumnLegendAtBottom && stackedColumnLegendNode}
      <span className="chart-preview__body">
        {stackedColumnChartStyle.valueAxis.showAxisTitle && (
          <span
            className="chart-preview__axis-title chart-preview__axis-title--rotated"
            style={axisTitleStyle(stackedColumnChartStyle.valueAxis)}
          >
            {String(stackedColumnChartStyle.valueAxis.titleText) || "Applications"}
          </span>
        )}
        <span className="chart-preview__body-main">
      <span className="column-preview__plot" style={{ position: "relative" }}>
        <Gridlines axis={stackedColumnChartStyle.valueAxis} orientation="horizontal" />
        <AxisTickLabels axis={stackedColumnChartStyle.valueAxis} dataMax={BAR_DATA_MAX} orientation="vertical" />
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
        <span className="column-preview__columns" style={{ gap: `${stackedColumnChartStyle.categoryAxis.innerPadding}%` }}>
          {barCategories.map(([label, value], index) => (
            <span className="column-item" key={label}>
              {stackedColumnChartStyle.totals.show && (
                <span
                  className="column-item__value"
                  style={{
                    ...dataLabelStyle(stackedColumnChartStyle.totals),
                    backgroundColor: stackedColumnChartStyle.totals.enableBackground
                      ? hexWithAlpha(stackedColumnChartStyle.totals.backgroundColor, stackedColumnChartStyle.totals.backgroundTransparency)
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
              <span className="column-item__track-wrap">
                <span className="column-item__track">
                  <span
                    className="column-item__fill"
                    style={{
                      height: `${barPercent(value)}%`,
                      width: barThickness(stackedColumnChartStyle.layout.stackedGapSize),
                      opacity: 1 - stackedColumnChartStyle.dataPoint.fillTransparency / 100,
                      background: `linear-gradient(to top, ${stackedColumnChartStyle.dataPoint.fill} 0%, ${stackedColumnChartStyle.dataPoint.fill} ${stackedSegmentShare}%, ${stackedSegment} ${stackedSegmentShare}%, ${stackedSegment} 100%)`,
                      border: stackedColumnChartStyle.dataPoint.borderShow
                        ? `${stackedColumnChartStyle.dataPoint.borderSize}px solid ${stackedColumnChartStyle.dataPoint.borderColor}`
                        : undefined,
                    }}
                  />
                </span>
                {index === 0 && stackedColumnChartStyle.error.enabled && stackedColumnChartStyle.error.barShow && (
                  <span
                    className="column-item__error"
                    aria-hidden="true"
                    title="Error bars are enabled — representative indicator, not a data-fit range"
                    style={{ bottom: `${barPercent(value)}%` }}
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
              {stackedColumnChartStyle.categoryAxis.show && (
                <span className="column-item__label" style={textStyle(stackedColumnChartStyle.categoryAxis)}>
                  {label}
                </span>
              )}
            </span>
          ))}
        </span>
      </span>
      {stackedColumnChartStyle.categoryAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title"
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
      </span>
      {stackedColumnLegendAtBottom && stackedColumnLegendNode}
    </span>
  );
}
