import { hexWithAlpha } from "../../lib/colorUtils";
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
import { authoredChromeExtent, authoredInnerBox, categoryPercent, categoryWidthPercent, COLUMN_CHART_BOX, computePreviewCartesianLayout, legendBandExtent, legendBandStyle, valueFraction, visualTitleBandExtent, visualTitleStyle, type VisualTitleChrome } from "./cartesianLayout";
import { PresentationScale } from "./PresentationScale";
import { headingAria } from "../../lib/headingAria";
import type { ResolvedStackedColumnChartStyle } from "../../lib/stackedColumnChartProperties";

type Props = { stackedColumnChartStyle: ResolvedStackedColumnChartStyle; palette: string[]; titleChrome?: VisualTitleChrome; titleFallback?: string; spaceBelowTitle?: number };

export function StackedColumnChartPreview({ stackedColumnChartStyle, palette, titleChrome, titleFallback = "", spaceBelowTitle = 0 }: Props) {
  // The transpose of the stacked bar chart, from the same fixture series
  // and the same palette slots, so a swatch means the same thing in both.
  const stackedColumnLegendNode = (
    <ChartLegend
      legend={stackedColumnChartStyle.legend}
      items={cartesianFixture.series.map((series, index) => ({
        label: series.label,
        color: seriesColor(palette, index, stackedColumnChartStyle.dataPoint.fill),
      }))}
    />
  );
  const stackedColumnLegendAtBottom = legendIsAfterPlot(stackedColumnChartStyle.legend.position);
  const stackedColumnLegendVertical = legendIsVertical(stackedColumnChartStyle.legend.position);
  const legendBand = legendBandExtent(stackedColumnChartStyle.legend, cartesianFixture.series.map((s) => s.label));
  const titleBand = visualTitleBandExtent(titleChrome, titleFallback, spaceBelowTitle);
  const authoredInner = authoredInnerBox(COLUMN_CHART_BOX, authoredChromeExtent([titleBand, legendBand]));

  // Same engine, same box and the same shared furniture as the clustered
  // column chart — the two share the CSS and must share the coordinate
  // system too, or they drift apart.
  const layout = computePreviewCartesianLayout({
    box: authoredInner,
    orientation: "vertical",
    categoryAxis: stackedColumnChartStyle.categoryAxis,
    valueAxis: stackedColumnChartStyle.valueAxis,
    categories: barCategories,
    dataMax: STACKED_DATA_MAX,
    innerPadding: stackedColumnChartStyle.categoryAxis.innerPadding,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  const valueGutter = layout.valueAxis?.width ?? 0;
  const categoryGutter = layout.categoryAxis?.height ?? 0;

  return (
    <PresentationScale width={COLUMN_CHART_BOX.width}><span
      className={`chart-preview${stackedColumnLegendVertical ? " chart-preview--legend-side" : ""}${stackedColumnLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - stackedColumnChartStyle.plotArea.transparency / 100, width: COLUMN_CHART_BOX.width, height: COLUMN_CHART_BOX.height }}
    >
      {titleBand.height > 0 && <span className="chart-preview__visual-title" {...headingAria(titleChrome?.heading ?? "")} style={visualTitleStyle(titleChrome, titleBand)}>{String(titleChrome?.text ?? "") || titleFallback}</span>}
      {!stackedColumnLegendAtBottom && <span className="chart-preview__legend-band" style={legendBandStyle(legendBand)}>{stackedColumnLegendNode}</span>}
      <span className="chart-preview__body">
        <span className="chart-preview__body-main">
          <span className="column-preview__plot" style={{ width: authoredInner.width, height: authoredInner.height }}>
            <ValueAxisGutter
              axis={stackedColumnChartStyle.valueAxis}
              layout={layout}
              offset={categoryGutter}
              titleFallback="Applications"
            />

            <span className="chart-plot" style={{ left: valueGutter, bottom: categoryGutter }}>
              <ScaledGridlines axis={stackedColumnChartStyle.valueAxis} layout={layout} />

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

              {barCategories.map((label, index) => {
                // The mark's thickness is the category WIDTH, which is not the
                // positioning band: Power BI derives it from a category
                // thickness that carries no inner padding at all. stacked: one band, so the whole bar takes the category width.
                const { offset: left } = categoryPercent(layout, index, barCategories.length);
                const width = categoryWidthPercent(layout, barCategories.length);
                const segments = stackSegments(categoryValues(cartesianFixture, index));
                const total = segments.length ? segments[segments.length - 1].end : 0;
                const topPct = valueFraction(layout, total * VALUE_SCALE) * 100;
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
                          total * VALUE_SCALE,
                          stackedColumnChartStyle.totals.labelDisplayUnits,
                          stackedColumnChartStyle.totals.labelPrecision,
                        )}
                      </span>
                    )}
                    {segments.map((segment, seriesIndex) => {
                      const startPct = valueFraction(layout, segment.start * VALUE_SCALE) * 100;
                      const stopPct = valueFraction(layout, segment.end * VALUE_SCALE) * 100;
                      const series = cartesianFixture.series[seriesIndex];
                      return (
                    <span
                      key={series.key}
                      className="column-item__fill"
                      style={{
                        bottom: `${Math.min(startPct, stopPct)}%`,
                        height: `${Math.abs(stopPct - startPct)}%`,
                        // Full category band: Power BI's stack thickness is
                        // a single-band `categoryBandScale.bandwidth()`.
                        // `stackedGapSize` displaces segments along the
                        // VALUE axis, and only under `stackedGapExplodes`,
                        // which this app does not model.
                        left: 0,
                        width: "100%",
                        opacity: 1 - stackedColumnChartStyle.dataPoint.fillTransparency / 100,
                        backgroundColor: seriesColor(palette, seriesIndex, stackedColumnChartStyle.dataPoint.fill),
                        border: stackedColumnChartStyle.dataPoint.borderShow
                          ? `${stackedColumnChartStyle.dataPoint.borderSize}px solid ${stackedColumnChartStyle.dataPoint.borderColor}`
                          : undefined,
                      }}
                    />
                      );
                    })}
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

            <CategoryAxisGutter
              axis={stackedColumnChartStyle.categoryAxis}
              layout={layout}
              categories={barCategories}
              offset={valueGutter}
              titleFallback="Region"
            />
          </span>
        </span>
      </span>
      {stackedColumnLegendAtBottom && <span className="chart-preview__legend-band" style={legendBandStyle(legendBand)}>{stackedColumnLegendNode}</span>}
    </span></PresentationScale>
  );
}
