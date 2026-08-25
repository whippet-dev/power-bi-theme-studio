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
import {
  STACKED_DATA_MAX,
  VALUE_SCALE,
  barCategories,
  cartesianFixture,
  categoryValues,
  seriesColor,
} from "../../lib/previewSampleData";
import { stackSegments } from "../../lib/seriesBands";
import { BAR_CHART_BOX, categoryPercent, categoryWidthPercent, computePreviewCartesianLayout, valueFraction } from "./cartesianLayout";
import type { ResolvedStackedBarChartStyle } from "../../lib/stackedBarChartProperties";

type Props = { stackedBarChartStyle: ResolvedStackedBarChartStyle; palette: string[] };

export function StackedBarChartPreview({ stackedBarChartStyle, palette }: Props) {
  // Every legend entry has a segment and every segment has an entry: both
  // come from the same fixture series, in the same order, with the same
  // palette slots the clustered charts use.
  const stackedBarSeries = cartesianFixture.series.map((series, index) => ({
    label: series.label,
    color: seriesColor(palette, index, stackedBarChartStyle.dataPoint.fill),
  }));
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
    categories: barCategories,
    dataMax: STACKED_DATA_MAX,
    innerPadding: stackedBarChartStyle.categoryAxis.innerPadding,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  const categoryGutter = layout.categoryAxis?.width ?? 0;
  const valueGutter = layout.valueAxis?.height ?? 0;

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

              {barCategories.map((label, index) => {
                // The mark's thickness is the category WIDTH, which is not the
                // positioning band: Power BI derives it from a category
                // thickness that carries no inner padding at all. stacked: one band, so the whole bar takes the category width.
                const { offset: top } = categoryPercent(layout, index, barCategories.length);
                const height = categoryWidthPercent(layout, barCategories.length);
                // Real segments from real values. The stack runs from zero
                // to the category total, and each series owns the span
                // between the running total before it and after it.
                const segments = stackSegments(categoryValues(cartesianFixture, index));
                const total = segments.length ? segments[segments.length - 1].end : 0;
                const endPct = valueFraction(layout, total * VALUE_SCALE) * 100;
                return (
                  <span className="bar-item" key={label} style={{ top: `${top}%`, height: `${height}%` }}>
                    {segments.map((segment, seriesIndex) => {
                      const startPct = valueFraction(layout, segment.start * VALUE_SCALE) * 100;
                      const stopPct = valueFraction(layout, segment.end * VALUE_SCALE) * 100;
                      const series = cartesianFixture.series[seriesIndex];
                      return (
                        <span
                          key={series.key}
                          className="bar-item__fill"
                          style={{
                            left: `${Math.min(startPct, stopPct)}%`,
                            width: `${Math.abs(stopPct - startPct)}%`,
                            // The stack fills its category band. Power BI's
                            // stack thickness is `categoryBandScale.bandwidth()`
                            // over a single band, so it is the whole slot;
                            // `stackedGapSize` displaces segments along the
                            // VALUE axis and only when `stackedGapExplodes`
                            // is on, which this app does not model.
                            top: 0,
                            height: "100%",
                            opacity: 1 - stackedBarChartStyle.dataPoint.fillTransparency / 100,
                            backgroundColor: seriesColor(palette, seriesIndex, stackedBarChartStyle.dataPoint.fill),
                            border: stackedBarChartStyle.dataPoint.borderShow
                              ? `${stackedBarChartStyle.dataPoint.borderSize}px solid ${stackedBarChartStyle.dataPoint.borderColor}`
                              : undefined,
                          }}
                        />
                      );
                    })}
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
                          total * VALUE_SCALE,
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
              categories={barCategories}
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
