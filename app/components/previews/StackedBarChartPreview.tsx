import {
  CategoryAxisGutter,
  CartesianDataLabel,
  ChartLegend,
  dataLabelStyle,
  formatValue,
  labelVisibleAt,
  legendIsAfterPlot,
  legendIsCentered,
  legendIsVertical,
  mapLineStyle,
  CategoryGridlines,
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
import {
  authoredChromeExtent,
  authoredInnerBox,
  authoredRootStyle,
  legendBandExtent,
  legendBandStyle,
  visualSubtitleBandExtent,
  visualSubtitleStyle,
  visualTitleBandExtent,
  type VisualSubtitleChrome,
  type VisualTitleChrome,
  visualTitleStyle,
} from "./cartesianLayout";
import { headingAria } from "../../lib/headingAria";
import { PresentationScale } from "./PresentationScale";
import { BAR_CHART_BOX, categoryPercent, categoryWidthPercent, computePreviewCartesianLayout, valueFraction, valueSpanPercent } from "./cartesianLayout";
import type { ResolvedStackedBarChartStyle } from "../../lib/stackedBarChartProperties";

type Props = {
  /**
   * The Power BI visual TITLE - part of the authored visual, paid for out
   * of its own 450 x 250 budget. Theme Studio's tile heading is a
   * different thing and stays outside.
   */
  titleChrome?: VisualTitleChrome;
  subtitleChrome?: VisualSubtitleChrome;
  titleFallback?: string;
  /** Only applies when the theme's "Customize spacing" is on, as in the tile. */
  spaceBelowTitle?: number;
  spaceAboveSubtitle?: number;
  spaceBelowSubtitle?: number;
  stackedBarChartStyle: ResolvedStackedBarChartStyle; palette: string[] };

export function StackedBarChartPreview({ stackedBarChartStyle, palette, titleChrome, subtitleChrome, titleFallback = "", spaceBelowTitle = 0, spaceAboveSubtitle = 0, spaceBelowSubtitle = 0 }: Props) {
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
  // The authored size describes the WHOLE visual, as Power BI's 450 x 250
  // does. The legend is drawn here rather than by ChartLayout, so its band
  // comes out of that budget first and the chart is laid out in what is
  // left - otherwise the finished visual is taller than the size it claims.
  const legendBand = legendBandExtent(stackedBarChartStyle.legend, stackedBarSeries.map((item) => item.label));
  const titleBand = visualTitleBandExtent(titleChrome, titleFallback, spaceBelowTitle);
  const subtitleBand = visualSubtitleBandExtent(subtitleChrome, spaceAboveSubtitle, spaceBelowSubtitle);
  const topChromeBand = authoredChromeExtent([titleBand, subtitleBand]);
  const authoredInner = authoredInnerBox(BAR_CHART_BOX, authoredChromeExtent([titleBand, subtitleBand, legendBand]));

  const layout = computePreviewCartesianLayout({
    box: authoredInner,
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
    <PresentationScale width={BAR_CHART_BOX.width}>
    <span
      className={`chart-preview chart-preview--authored${stackedBarLegendVertical ? " chart-preview--legend-side" : ""}${stackedBarLegendAtBottom ? " chart-preview--legend-after" : ""}${legendIsCentered(stackedBarChartStyle.legend.position) ? " chart-preview--legend-center" : ""}`}
      style={authoredRootStyle({
        opacity: 1 - stackedBarChartStyle.plotArea.transparency / 100,
        width: BAR_CHART_BOX.width,
        height: BAR_CHART_BOX.height,
      }, topChromeBand, legendBand)}
    >
      {titleBand.height > 0 && (
        <span
          className="chart-preview__visual-title"
          {...headingAria(titleChrome?.heading ?? "")}
          style={visualTitleStyle(titleChrome, titleBand)}
        >
          {String(titleChrome?.text ?? "") || titleFallback}
        </span>
      )}
      {subtitleBand.height > 0 && (
        <span
          className="chart-preview__visual-subtitle"
          {...headingAria(subtitleChrome?.heading ?? "")}
          style={visualSubtitleStyle(subtitleChrome, subtitleBand, titleChrome?.background)}
        >
          {subtitleChrome?.text}
        </span>
      )}
      {!stackedBarLegendAtBottom && (
        <span className="chart-preview__legend-band" style={legendBandStyle(legendBand)}>
          {stackedBarLegendNode}
        </span>
      )}
      <span className="chart-preview__body">
        <span className="chart-preview__body-main">
          {/* The authored plot region. Width is applied as well as height so
              the visual genuinely occupies its authored size rather than
              stretching to whatever the tile happens to be — presentation
              scaling is what fits it to the UI, and it happens after this. */}
          <span
            className="bar-preview__plot"
            style={{ width: authoredInner.width, height: authoredInner.height }}
          >
            <ValueAxisGutter
              axis={stackedBarChartStyle.valueAxis}
              layout={layout}
              offset={categoryGutter}
              titleFallback="Applications"
            />

            <span className="chart-plot" style={{ left: categoryGutter, bottom: valueGutter }}>
              <ScaledGridlines axis={stackedBarChartStyle.valueAxis} layout={layout} />
              {/* Category gridlines, from the same slot geometry the marks
                  use. They existed in the shared renderer and only the line
                  chart drew them, so every category gridline property was
                  inert here. */}
              <CategoryGridlines axis={stackedBarChartStyle.categoryAxis} layout={layout} count={barCategories.length} />

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
                      // Clamped per segment -- see StackedColumnChartPreview.
                      const { offset: segLeft, size: segWidth } = valueSpanPercent(
                        layout,
                        segment.start * VALUE_SCALE,
                        segment.end * VALUE_SCALE,
                      );
                      const series = cartesianFixture.series[seriesIndex];
                      return (
                        <span
                          key={series.key}
                          className="bar-item__fill"
                          style={{
                            left: `${segLeft}%`,
                            width: `${segWidth}%`,
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
              <span className="chart-data-label-layer">
                {barCategories.flatMap((label, index) => {
                  if (!labelVisibleAt(index, barCategories.length, stackedBarChartStyle.labels.labelDensity)) return [];
                  const { offset: categoryOffset } = categoryPercent(layout, index, barCategories.length);
                  const categoryWidth = categoryWidthPercent(layout, barCategories.length);
                  return stackSegments(categoryValues(cartesianFixture, index)).map((segment, seriesIndex) => {
                    const series = cartesianFixture.series[seriesIndex];
                    return (
                      <CartesianDataLabel
                        key={`${label}-${series.key}`}
                        labels={stackedBarChartStyle.labels}
                        category={series.label}
                        value={segment.value * VALUE_SCALE}
                        detail={segment.value * 12}
                        orientation="horizontal"
                        startPercent={valueFraction(layout, segment.start * VALUE_SCALE) * 100}
                        endPercent={valueFraction(layout, segment.end * VALUE_SCALE) * 100}
                        crossPercent={categoryOffset + categoryWidth / 2}
                        series={series.label}
                      />
                    );
                  });
                })}
              </span>
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
      {stackedBarLegendAtBottom && (
        <span className="chart-preview__legend-band" style={legendBandStyle(legendBand)}>
          {stackedBarLegendNode}
        </span>
      )}
    </span>
    </PresentationScale>
  );
}
