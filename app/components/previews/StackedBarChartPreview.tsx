import {
  CategoryAxisGutter,
  ChartLegend,
  dataLabelStyle,
  formatValue,
  legendIsAfterPlot,
  legendIsVertical,
  mapLineStyle,
  ScaledGridlines,
  ValueAxisGutter,
  ZoomSliders,
} from "../ChartParts";
import { BAR_DATA_MAX, barCategories, stackedSegmentColor, stackedSegmentShare } from "../../lib/previewSampleData";
import { BAR_CHART_BOX, categoryPercent, computePreviewCartesianLayout, valueFraction } from "./cartesianLayout";
import { barThickness } from "./chartPrimitives";
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

  // Same engine, same box and the same shared furniture as the clustered
  // bar chart — the two share their CSS and must share the coordinate
  // system too, or they drift apart.
  const layout = computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: stackedBarChartStyle.categoryAxis,
    valueAxis: stackedBarChartStyle.valueAxis,
    categories: barCategories.map(([label]) => label),
    dataMax: BAR_DATA_MAX,
    innerPadding: stackedBarChartStyle.categoryAxis.innerPadding,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  const categoryGutter = layout.categoryAxis?.width ?? 0;
  const valueGutter = layout.valueAxis?.height ?? 0;
  const zeroPct = valueFraction(layout, 0) * 100;

  return (
    <span
      className={`chart-preview${stackedBarLegendVertical ? " chart-preview--legend-side" : ""}${stackedBarLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - stackedBarChartStyle.plotArea.transparency / 100 }}
    >
      {!stackedBarLegendAtBottom && stackedBarLegendNode}
      <span className="chart-preview__body">
        <span className="chart-preview__body-main">
          <span className="bar-preview__plot" style={{ height: BAR_CHART_BOX.height }}>
            <ValueAxisGutter
              axis={stackedBarChartStyle.valueAxis}
              layout={layout}
              offset={categoryGutter}
              titleFallback="Applications"
            />

            <span className="chart-plot" style={{ left: categoryGutter, bottom: valueGutter }}>
              <ScaledGridlines axis={stackedBarChartStyle.valueAxis} layout={layout} />

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

              {barCategories.map(([label, value], index) => {
                const { offset: top, size: height } = categoryPercent(layout, index, barCategories.length);
                const endPct = valueFraction(layout, value * 1000) * 100;
                const width = Math.abs(endPct - zeroPct);
                const left = Math.min(endPct, zeroPct);
                return (
                  <span className="bar-item" key={label} style={{ top: `${top}%`, height: `${height}%` }}>
                    <span
                      className="bar-item__fill"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        height: barThickness(stackedBarChartStyle.layout.stackedGapSize),
                        opacity: 1 - stackedBarChartStyle.dataPoint.fillTransparency / 100,
                        // The 62% split stays exactly as it was: a known
                        // fiction (RENDERER_AUDIT §4.2), and sample-data work
                        // for a later phase. T8 fixes where the bar starts
                        // and ends, not what it claims to contain.
                        background: `linear-gradient(to right, ${stackedBarChartStyle.dataPoint.fill} 0%, ${stackedBarChartStyle.dataPoint.fill} ${stackedSegmentShare}%, ${stackedSegment} ${stackedSegmentShare}%, ${stackedSegment} 100%)`,
                        border: stackedBarChartStyle.dataPoint.borderShow
                          ? `${stackedBarChartStyle.dataPoint.borderSize}px solid ${stackedBarChartStyle.dataPoint.borderColor}`
                          : undefined,
                      }}
                    />
                    {index === 0 && stackedBarChartStyle.error.enabled && stackedBarChartStyle.error.barShow && (
                      <span
                        className="bar-item__error"
                        aria-hidden="true"
                        title="Error bars are enabled — representative indicator, not a data-fit range"
                        style={{ left: `${endPct}%` }}
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
                    {stackedBarChartStyle.totals.show && (
                      <span
                        className="bar-item__value"
                        style={{ ...dataLabelStyle(stackedBarChartStyle.totals), left: `${endPct}%` }}
                      >
                        {formatValue(
                          value * 1000,
                          stackedBarChartStyle.totals.labelDisplayUnits,
                          stackedBarChartStyle.totals.labelPrecision,
                        )}
                      </span>
                    )}
                  </span>
                );
              })}
            </span>

            <CategoryAxisGutter
              axis={stackedBarChartStyle.categoryAxis}
              layout={layout}
              categories={barCategories.map(([label]) => label)}
              offset={valueGutter}
              titleFallback="Region"
            />
          </span>
        </span>
      </span>
      {stackedBarLegendAtBottom && stackedBarLegendNode}
    </span>
  );
}
