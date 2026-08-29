import { hexWithAlpha } from "../../lib/colorUtils";
import {
  CategoryAxisGutter,
  ChartLegend,
  DataLabel,
  labelVisibleAt,
  legendIsAfterPlot,
  legendIsCentered,
  legendIsVertical,
  mapLineStyle,
  ScaledGridlines,
  ValueAxisGutter,
  ZoomSliders,
} from "../ChartParts";
import {
  CLUSTERED_DATA_MAX,
  VALUE_SCALE,
  barCategories,
  cartesianFixture,
  seriesColor,
} from "../../lib/previewSampleData";
import { clusteredSeriesBands } from "../../lib/seriesBands";
import { authoredChromeExtent, authoredInnerBox, authoredRootStyle, categoryPercent, categoryWidthPercent, COLUMN_CHART_BOX, COLUMN_PLOT_INSETS, computePreviewCartesianLayout, legendBandExtent, legendBandStyle, valueFraction, visualSubtitleBandExtent, visualSubtitleStyle, visualTitleBandExtent, visualTitleStyle, type VisualSubtitleChrome, type VisualTitleChrome } from "./cartesianLayout";
import { PresentationScale } from "./PresentationScale";
import { headingAria } from "../../lib/headingAria";
import type { ResolvedColumnChartStyle } from "../../lib/columnChartProperties";

type Props = { columnChartStyle: ResolvedColumnChartStyle; palette: string[]; titleChrome?: VisualTitleChrome; subtitleChrome?: VisualSubtitleChrome; titleFallback?: string; spaceBelowTitle?: number; spaceAboveSubtitle?: number; spaceBelowSubtitle?: number };

export function ColumnChartPreview({ columnChartStyle, palette, titleChrome, subtitleChrome, titleFallback = "", spaceBelowTitle = 0, spaceAboveSubtitle = 0, spaceBelowSubtitle = 0 }: Props) {
  // Same series, same colours and the same band model as the clustered
  // bar chart. This chart is its transpose, so it must not compute its
  // own version of either.
  const columnLegendNode = (
    <ChartLegend
      legend={columnChartStyle.legend}
      items={cartesianFixture.series.map((series, index) => ({
        label: series.label,
        color: seriesColor(palette, index, columnChartStyle.dataPoint.fill),
      }))}
    />
  );
  const columnLegendAtBottom = legendIsAfterPlot(columnChartStyle.legend.position);
  const columnLegendVertical = legendIsVertical(columnChartStyle.legend.position);
  const legendBand = legendBandExtent(columnChartStyle.legend, cartesianFixture.series.map((s) => s.label));
  const titleBand = visualTitleBandExtent(titleChrome, titleFallback, spaceBelowTitle);
  const subtitleBand = visualSubtitleBandExtent(subtitleChrome, spaceAboveSubtitle, spaceBelowSubtitle);
  const topChromeBand = authoredChromeExtent([titleBand, subtitleBand]);
  const authoredInner = authoredInnerBox(COLUMN_CHART_BOX, authoredChromeExtent([titleBand, subtitleBand, legendBand]));

  // One layout for this visual instance. Everything geometric below reads
  // from it — gutters, gridlines, columns, labels, reference line — so the
  // chart cannot end up with two disagreeing coordinate systems the way
  // the CSS-derived version did (RENDERER_AUDIT §2.4, §3).
  const layout = computePreviewCartesianLayout({
    box: { ...authoredInner, width: authoredInner.width - COLUMN_PLOT_INSETS.right, height: authoredInner.height - COLUMN_PLOT_INSETS.bottom },
    orientation: "vertical",
    categoryAxis: columnChartStyle.categoryAxis,
    valueAxis: columnChartStyle.valueAxis,
    categories: barCategories,
    dataMax: CLUSTERED_DATA_MAX,
    innerPadding: columnChartStyle.categoryAxis.innerPadding,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  const valueGutter = layout.valueAxis?.width ?? 0;

  // One band per series across a category slot, identical to the bar
  // chart's; only the axis it is applied to differs.
  const seriesBands = clusteredSeriesBands({
    extent: 100,
    seriesCount: cartesianFixture.series.length,
    gapSize: columnChartStyle.layout.clusteredGapSize,
    overlaps: columnChartStyle.layout.clusteredGapOverlaps,
  });
  const categoryGutter = layout.categoryAxis?.height ?? 0;
  // Zero's height above the plot floor, as a percentage of the plot. Every
  // column and the error indicator measure from this, so the baseline is
  // the zero gridline by construction rather than by coincidence.
  const zeroPct = valueFraction(layout, 0) * 100;

  return (
    <PresentationScale width={COLUMN_CHART_BOX.width}><span
      className={`chart-preview chart-preview--authored${columnLegendVertical ? " chart-preview--legend-side" : ""}${columnLegendAtBottom ? " chart-preview--legend-after" : ""}${legendIsCentered(columnChartStyle.legend.position) ? " chart-preview--legend-center" : ""}`}
      style={authoredRootStyle({ opacity: 1 - columnChartStyle.plotArea.transparency / 100, width: COLUMN_CHART_BOX.width, height: COLUMN_CHART_BOX.height }, topChromeBand, legendBand)}
    >
      {titleBand.height > 0 && <span className="chart-preview__visual-title" {...headingAria(titleChrome?.heading ?? "")} style={visualTitleStyle(titleChrome, titleBand)}>{String(titleChrome?.text ?? "") || titleFallback}</span>}
      {subtitleBand.height > 0 && <span className="chart-preview__visual-subtitle" {...headingAria(subtitleChrome?.heading ?? "")} style={visualSubtitleStyle(subtitleChrome, subtitleBand, titleChrome?.background)}>{subtitleChrome?.text}</span>}
      {!columnLegendAtBottom && <span className="chart-preview__legend-band" style={legendBandStyle(legendBand)}>{columnLegendNode}</span>}
      <span className="chart-preview__body">
        <span className="chart-preview__body-main">
          <span className="column-preview__plot" style={{ width: authoredInner.width, height: authoredInner.height }}>
            <span className="chart-preview__plot-frame" style={{ right: COLUMN_PLOT_INSETS.right, bottom: COLUMN_PLOT_INSETS.bottom }}>
            <ValueAxisGutter
              axis={columnChartStyle.valueAxis}
              layout={layout}
              offset={categoryGutter}
              titleFallback="Applications"
            />

            {/* THE plot rectangle. */}
            <span className="chart-plot" style={{ left: valueGutter, bottom: categoryGutter }}>
              <ScaledGridlines axis={columnChartStyle.valueAxis} layout={layout} />

              <ZoomSliders zoom={columnChartStyle.zoom} categoryOrientation="horizontal" valueOrientation="vertical" />

              {/* Placed through the same scale as the gridlines and columns,
                  replacing a hardcoded `top: 22%` that was on no scale at
                  all. It now honours the resolved value, which by default is
                  0 and therefore sits on the baseline — see the T7 report on
                  the registry's -1000..1000 range against a dataMax of 82000. */}
              {columnChartStyle.referenceLine.show && (
                <span
                  className="column-preview__reference-line"
                  aria-hidden="true"
                  style={{
                    bottom: `${valueFraction(layout, columnChartStyle.referenceLine.value) * 100}%`,
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

              {barCategories.map((label, index) => {
                // The mark's thickness is the category WIDTH, which is not the
                // positioning band: Power BI derives it from a category
                // thickness that carries no inner padding at all. clustered: this is the extent clusteredSeriesBands subdivides.
                const { offset: left } = categoryPercent(layout, index, barCategories.length);
                const width = categoryWidthPercent(layout, barCategories.length);
                return (
                  <span className="column-item" key={label} style={{ left: `${left}%`, width: `${width}%` }}>
                    {cartesianFixture.series.map((series, seriesIndex) => {
                      const band = seriesBands[seriesIndex];
                      const value = series.values[index] ?? 0;
                      const topPct = valueFraction(layout, value * VALUE_SCALE) * 100;
                      const height = Math.abs(topPct - zeroPct);
                      const bottom = Math.min(topPct, zeroPct);
                      const fill = seriesColor(palette, seriesIndex, columnChartStyle.dataPoint.fill);
                      const centre = band.offset + band.size / 2;
                      return (
                        <span key={series.key}>
                    {labelVisibleAt(index, barCategories.length, columnChartStyle.labels.labelDensity) && (
                      <span className="column-item__value" style={{ bottom: `${topPct}%`, left: `${centre}%` }}>
                        <DataLabel labels={columnChartStyle.labels} category={series.label} value={value * VALUE_SCALE} detail={value * 12} />
                      </span>
                    )}
                    <span
                      className="column-item__fill"
                      style={{
                        bottom: `${bottom}%`,
                        height: `${height}%`,
                        left: `${band.offset}%`,
                        width: `${band.size}%`,
                        backgroundColor: hexWithAlpha(fill, columnChartStyle.dataPoint.fillTransparency),
                        border: columnChartStyle.dataPoint.borderShow
                          ? `${columnChartStyle.dataPoint.borderSize}px solid ${columnChartStyle.dataPoint.borderColor}`
                          : undefined,
                      }}
                    />
                    {index === 0 && seriesIndex === 0 && columnChartStyle.error.enabled && columnChartStyle.error.barShow && (
                      <span
                        className="column-item__error"
                        aria-hidden="true"
                        title="Error bars are enabled — representative indicator, not a data-fit range"
                        style={{ bottom: `${topPct}%`, left: `${centre}%` }}
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
                      );
                    })}
                  </span>
                );
              })}
            </span>

            <CategoryAxisGutter
              axis={columnChartStyle.categoryAxis}
              layout={layout}
              categories={barCategories}
              offset={valueGutter}
              titleFallback="Region"
            />
            </span>
          </span>
        </span>
      </span>
      {columnLegendAtBottom && <span className="chart-preview__legend-band" style={legendBandStyle(legendBand)}>{columnLegendNode}</span>}
    </span></PresentationScale>
  );
}
