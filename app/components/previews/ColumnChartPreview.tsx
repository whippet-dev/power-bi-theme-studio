import { hexWithAlpha } from "../../lib/colorUtils";
import { AxisTickLabels, axisTitleStyle, ChartLegend, DataLabel, Gridlines, labelVisibleAt, legendIsAfterPlot, legendIsVertical, mapLineStyle, textStyle, ZoomSliders } from "../ChartParts";
import { BAR_DATA_MAX, barCategories, barPercent } from "../../lib/previewSampleData";
import { barThickness } from "./chartPrimitives";
import type { ResolvedColumnChartStyle } from "../../lib/columnChartProperties";

type Props = { columnChartStyle: ResolvedColumnChartStyle };

export function ColumnChartPreview({ columnChartStyle }: Props) {
  const columnLegendNode = (
    <ChartLegend legend={columnChartStyle.legend} items={[{ label: "Applications", color: columnChartStyle.dataPoint.fill }]} />
  );
  const columnLegendAtBottom = legendIsAfterPlot(columnChartStyle.legend.position);
  const columnLegendVertical = legendIsVertical(columnChartStyle.legend.position);

  return (
    <span
      className={`chart-preview${columnLegendVertical ? " chart-preview--legend-side" : ""}${columnLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - columnChartStyle.plotArea.transparency / 100 }}
    >
      {!columnLegendAtBottom && columnLegendNode}
      <span className="chart-preview__body">
        {columnChartStyle.valueAxis.showAxisTitle && (
          <span className="chart-preview__axis-title chart-preview__axis-title--rotated" style={axisTitleStyle(columnChartStyle.valueAxis)}>
            {String(columnChartStyle.valueAxis.titleText) || "Applications"}
          </span>
        )}
        <span className="chart-preview__body-main">
      <span className="column-preview__plot" style={{ position: "relative" }}>
        <Gridlines axis={columnChartStyle.valueAxis} orientation="horizontal" />
        <AxisTickLabels axis={columnChartStyle.valueAxis} dataMax={BAR_DATA_MAX} orientation="vertical" />
        <ZoomSliders zoom={columnChartStyle.zoom} categoryOrientation="horizontal" valueOrientation="vertical" />
        {columnChartStyle.referenceLine.show && (
          <span
            className="column-preview__reference-line"
            aria-hidden="true"
            style={{
              top: "22%",
              borderTopWidth: columnChartStyle.referenceLine.width,
              borderTopColor: columnChartStyle.referenceLine.lineColor,
              borderTopStyle: mapLineStyle(columnChartStyle.referenceLine.style),
              opacity: 1 - columnChartStyle.referenceLine.transparency / 100,
            }}
          />
        )}
        {columnChartStyle.trend.show && (
          <span
            className="chart-preview__trend-line"
            aria-hidden="true"
            style={{
              borderTopWidth: columnChartStyle.trend.width,
              borderTopColor: columnChartStyle.trend.lineColor,
              borderTopStyle: mapLineStyle(columnChartStyle.trend.style),
              opacity: 1 - columnChartStyle.trend.transparency / 100,
            }}
          />
        )}
        <span className="column-preview__columns" style={{ gap: `${columnChartStyle.categoryAxis.innerPadding}%` }}>
          {barCategories.map(([label, value], index) => (
            <span className="column-item" key={label}>
              {labelVisibleAt(index, barCategories.length, columnChartStyle.labels.labelDensity) && (
                <span className="column-item__value">
                  <DataLabel labels={columnChartStyle.labels} category={label} value={value * 1000} detail={value * 12} />
                </span>
              )}
              <span className="column-item__track-wrap">
                <span className="column-item__track">
                  <span
                    className="column-item__fill"
                    style={{
                      height: `${barPercent(value)}%`,
                      width: barThickness(columnChartStyle.layout.clusteredGapSize),
                      backgroundColor: hexWithAlpha(columnChartStyle.dataPoint.fill, columnChartStyle.dataPoint.fillTransparency),
                      border: columnChartStyle.dataPoint.borderShow
                        ? `${columnChartStyle.dataPoint.borderSize}px solid ${columnChartStyle.dataPoint.borderColor}`
                        : undefined,
                    }}
                  />
                </span>
                {index === 0 && columnChartStyle.error.enabled && columnChartStyle.error.barShow && (
                  <span
                    className="column-item__error"
                    aria-hidden="true"
                    title="Error bars are enabled — representative indicator, not a data-fit range"
                    style={{ bottom: `${barPercent(value)}%` }}
                  >
                    <span
                      style={{
                        width: `${columnChartStyle.error.barWidth}px`,
                        backgroundColor: columnChartStyle.error.barColor,
                        border: `${columnChartStyle.error.barBorderSize}px solid ${columnChartStyle.error.barBorderColor}`,
                      }}
                    />
                  </span>
                )}
              </span>
              {columnChartStyle.categoryAxis.show && (
                <span className="column-item__label" style={textStyle(columnChartStyle.categoryAxis)}>
                  {label}
                </span>
              )}
            </span>
          ))}
        </span>
      </span>
      {columnChartStyle.categoryAxis.showAxisTitle && (
        <span className="chart-preview__axis-title" style={axisTitleStyle(columnChartStyle.categoryAxis)}>
          {String(columnChartStyle.categoryAxis.titleText) || "Region"}
        </span>
      )}
        </span>
      </span>
      {columnLegendAtBottom && columnLegendNode}
    </span>
  );
}
