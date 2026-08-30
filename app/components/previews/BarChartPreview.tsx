import { hexWithAlpha } from "../../lib/colorUtils";
import {
  CategoryAxisGutter,
  CartesianDataLabel,
  ChartLegend,
  ConstantLine,
  labelVisibleAt,
  legendIsAfterPlot,
  legendIsCentered,
  legendIsVertical,
  mapLineStyle,
  ScaledGridlines,
  ValueAxisGutter,
  formatValue,
  ZoomSliders,
} from "../ChartParts";
import { constantLineGeometry } from "../../lib/constantLine";
import {
  CLUSTERED_DATA_MAX,
  VALUE_SCALE,
  barCategories,
  cartesianFixture,
  seriesColor,
} from "../../lib/previewSampleData";
import { clusteredSeriesBands } from "../../lib/seriesBands";
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
import type { ResolvedBarChartStyle } from "../../lib/barChartProperties";

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
  barChartStyle: ResolvedBarChartStyle; palette: string[] };

export function BarChartPreview({ barChartStyle, palette, titleChrome, subtitleChrome, titleFallback = "", spaceBelowTitle = 0, spaceAboveSubtitle = 0, spaceBelowSubtitle = 0 }: Props) {
  // The legend describes the series the chart actually draws. It used to
  // carry one synthetic "Applications" entry while the chart drew one bar,
  // which made the legend properties unreviewable against a real cluster.
  const legendItems = cartesianFixture.series.map((series, index) => ({
    label: series.label,
    color: seriesColor(palette, index, barChartStyle.dataPoint.fill),
  }));

  const legendNode = <ChartLegend legend={barChartStyle.legend} items={legendItems} />;
  const legendAtBottom = legendIsAfterPlot(barChartStyle.legend.position);
  const legendVertical = legendIsVertical(barChartStyle.legend.position);

  // The transpose of the column chart: values run left-to-right, categories
  // top-to-bottom. One layout owns the plot and both gutters, which is what
  // makes RENDERER_AUDIT §2.2 structurally impossible — there is no longer
  // a CSS grid deciding where the bars go, and nothing to disagree with.
  // The authored size describes the WHOLE visual, as Power BI's 450 x 250
  // does. The legend is drawn here rather than by ChartLayout, so its band
  // comes out of that budget first and the chart is laid out in what is
  // left - otherwise the finished visual is taller than the size it claims.
  const legendBand = legendBandExtent(barChartStyle.legend, legendItems.map((item) => item.label));
  const titleBand = visualTitleBandExtent(titleChrome, titleFallback, spaceBelowTitle);
  const subtitleBand = visualSubtitleBandExtent(subtitleChrome, spaceAboveSubtitle, spaceBelowSubtitle);
  const topChromeBand = authoredChromeExtent([titleBand, subtitleBand]);
  const authoredInner = authoredInnerBox(BAR_CHART_BOX, authoredChromeExtent([titleBand, subtitleBand, legendBand]));

  const layout = computePreviewCartesianLayout({
    box: authoredInner,
    orientation: "horizontal",
    categoryAxis: barChartStyle.categoryAxis,
    valueAxis: barChartStyle.valueAxis,
    categories: barCategories,
    // Clustered: each series is drawn from the baseline, so the axis has to
    // reach the largest single value, not the category total a stacked
    // chart would accumulate.
    dataMax: CLUSTERED_DATA_MAX,
    innerPadding: barChartStyle.categoryAxis.innerPadding,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  // One band per series, as percentages of a category slot. `innerPadding`
  // has already been taken off by ChartLayout, which is the same order Power
  // BI applies: `categoryWidth = categoryThickness * (1 - innerPaddingRatio)`,
  // then the series band scale runs across that.
  const seriesBands = clusteredSeriesBands({
    extent: 100,
    seriesCount: cartesianFixture.series.length,
    gapSize: barChartStyle.layout.clusteredGapSize,
    overlaps: barChartStyle.layout.clusteredGapOverlaps,
  });

  const categoryGutter = layout.categoryAxis?.width ?? 0;
  const valueGutter = layout.valueAxis?.height ?? 0;
  // Zero's distance from the plot's left edge, as a percentage. Bars measure
  // from here rather than from the sample maximum, so a pinned axis range
  // moves the bars and not just the tick labels (audit finding 4).
  const zeroPct = valueFraction(layout, 0) * 100;

  /**
   * The `referenceLine` group sits on this chart's VALUE axis, which for
   * a bar chart is the horizontal one — so the line stands up the plot.
   * Deciding that here is the renderer's job; ConstantLine only draws.
   *
   * Geometry is derived once and handed to both paint slots below, so the
   * two mounts cannot disagree about where the line is.
   */
  const referenceLine = barChartStyle.referenceLine;
  const referenceGeometry = constantLineGeometry(referenceLine, layout, barChartStyle.valueAxis, CLUSTERED_DATA_MAX);
  const referenceLineAt = (layer: "back" | "front") => (
    <ConstantLine
      line={referenceLine}
      geometry={referenceGeometry}
      layer={layer}
      orientation="horizontal"
      plot={layout.plot}
      formatValue={formatValue}
    />
  );

  return (
    <PresentationScale width={BAR_CHART_BOX.width}>
    <span
      className={`chart-preview chart-preview--authored${legendVertical ? " chart-preview--legend-side" : ""}${legendAtBottom ? " chart-preview--legend-after" : ""}${legendIsCentered(barChartStyle.legend.position) ? " chart-preview--legend-center" : ""}`}
      style={authoredRootStyle({
        opacity: 1 - barChartStyle.plotArea.transparency / 100,
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
      {!legendAtBottom && (
        <span className="chart-preview__legend-band" style={legendBandStyle(legendBand)}>
          {legendNode}
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
              axis={barChartStyle.valueAxis}
              layout={layout}
              offset={categoryGutter}
              titleFallback="Applications"
            />

            {/* THE plot rectangle. */}
            <span className="chart-plot" style={{ left: categoryGutter, bottom: valueGutter }}>
              <ScaledGridlines axis={barChartStyle.valueAxis} layout={layout} />

              <ZoomSliders zoom={barChartStyle.zoom} categoryOrientation="vertical" valueOrientation="horizontal" />

              {referenceLineAt("back")}
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

              {barCategories.map((label, index) => {
                // The mark's thickness is the category WIDTH, which is not the
                // positioning band: Power BI derives it from a category
                // thickness that carries no inner padding at all. clustered: this is the extent clusteredSeriesBands subdivides.
                const { offset: top } = categoryPercent(layout, index, barCategories.length);
                const height = categoryWidthPercent(layout, barCategories.length);
                return (
                  <span className="bar-item" key={label} style={{ top: `${top}%`, height: `${height}%` }}>
                    {cartesianFixture.series.map((series, seriesIndex) => {
                      // Bands are percentages of this category slot, so the
                      // slot's own geometry stays with ChartLayout and only
                      // the subdivision lives here.
                      const band = seriesBands[seriesIndex];
                      const value = series.values[index] ?? 0;
                      const endPct = valueFraction(layout, value * VALUE_SCALE) * 100;
                      // Clamped: see ColumnChartPreview -- an out-of-range value
                      // is cut at the axis rather than painted over the furniture.
                      const { offset: left, size: width } = valueSpanPercent(layout, value * VALUE_SCALE, 0);
                      const fill = seriesColor(palette, seriesIndex, barChartStyle.dataPoint.fill);
                      return (
                        <span key={series.key}>
                          <span
                            className="bar-item__fill"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              top: `${band.offset}%`,
                              height: `${band.size}%`,
                              backgroundColor: hexWithAlpha(fill, barChartStyle.dataPoint.fillTransparency),
                              border: barChartStyle.dataPoint.borderShow
                                ? `${barChartStyle.dataPoint.borderSize}px solid ${hexWithAlpha(
                                    barChartStyle.dataPoint.borderColorMatchFill ? fill : barChartStyle.dataPoint.borderColor,
                                    barChartStyle.dataPoint.borderTransparency,
                                  )}`
                                : undefined,
                              // "Outline only" draws the border and drops the fill.
                              ...(barChartStyle.dataPoint.borderOutlineOnly ? { backgroundColor: "transparent" } : {}),
                            }}
                          />
                          {index === 0 && seriesIndex === 0 && barChartStyle.error.enabled && barChartStyle.error.barShow && (
                            <span
                              className="bar-item__error"
                              aria-hidden="true"
                              title="Error bars are enabled — representative indicator, not a data-fit range"
                              style={{ left: `${endPct}%`, top: `${band.offset + band.size / 2}%` }}
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
                      );
                    })}
                  </span>
                );
              })}
              <span className="chart-data-label-layer">
                {barCategories.flatMap((label, index) => {
                  if (!labelVisibleAt(index, barCategories.length, barChartStyle.labels.labelDensity)) return [];
                  const { offset: categoryOffset } = categoryPercent(layout, index, barCategories.length);
                  const categoryWidth = categoryWidthPercent(layout, barCategories.length);
                  return cartesianFixture.series.map((series, seriesIndex) => {
                    const band = seriesBands[seriesIndex];
                    const value = series.values[index] ?? 0;
                    return (
                      <CartesianDataLabel
                        key={`${label}-${series.key}`}
                        labels={barChartStyle.labels}
                        category={series.label}
                        value={value * VALUE_SCALE}
                        detail={value * 12}
                        orientation="horizontal"
                        startPercent={zeroPct}
                        endPercent={valueFraction(layout, value * VALUE_SCALE) * 100}
                        crossPercent={categoryOffset + categoryWidth * (band.offset + band.size / 2) / 100}
                        series={series.label}
                      />
                    );
                  });
                })}
              </span>

              {referenceLineAt("front")}
            </span>

            <CategoryAxisGutter
              axis={barChartStyle.categoryAxis}
              layout={layout}
              categories={barCategories}
              offset={valueGutter}
              titleFallback="Region"
            />
          </span>
        </span>
      </span>
      {legendAtBottom && (
        <span className="chart-preview__legend-band" style={legendBandStyle(legendBand)}>
          {legendNode}
        </span>
      )}
    </span>
    </PresentationScale>
  );
}
