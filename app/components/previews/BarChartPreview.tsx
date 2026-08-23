import { hexWithAlpha } from "../../lib/colorUtils";
import {
  CategoryAxisGutter,
  ChartLegend,
  DataLabel,
  labelIsInside,
  labelVisibleAt,
  legendIsAfterPlot,
  legendIsVertical,
  mapLineStyle,
  ScaledGridlines,
  ValueAxisGutter,
  ZoomSliders,
} from "../ChartParts";
import { BAR_DATA_MAX, barCategories } from "../../lib/previewSampleData";
import { BAR_CHART_BOX, categoryPercent, computePreviewCartesianLayout, valueFraction } from "./cartesianLayout";
import { barThickness } from "./chartPrimitives";
import type { ResolvedBarChartStyle } from "../../lib/barChartProperties";

type Props = { barChartStyle: ResolvedBarChartStyle };

export function BarChartPreview({ barChartStyle }: Props) {
  // Series shown in every cartesian chart's legend. Clustered charts show
  // one series; the stacked variants show the two they actually draw.
  const singleSeries = [{ label: "Applications", color: barChartStyle.dataPoint.fill }];

  const legendNode = <ChartLegend legend={barChartStyle.legend} items={singleSeries} />;
  const legendAtBottom = legendIsAfterPlot(barChartStyle.legend.position);
  const legendVertical = legendIsVertical(barChartStyle.legend.position);

  // The transpose of the column chart: values run left-to-right, categories
  // top-to-bottom. One layout owns the plot and both gutters, which is what
  // makes RENDERER_AUDIT §2.2 structurally impossible — there is no longer
  // a CSS grid deciding where the bars go, and nothing to disagree with.
  const layout = computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: barChartStyle.categoryAxis,
    valueAxis: barChartStyle.valueAxis,
    categories: barCategories.map(([label]) => label),
    dataMax: BAR_DATA_MAX,
    innerPadding: barChartStyle.categoryAxis.innerPadding,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  const categoryGutter = layout.categoryAxis?.width ?? 0;
  const valueGutter = layout.valueAxis?.height ?? 0;
  // Zero's distance from the plot's left edge, as a percentage. Bars measure
  // from here rather than from the sample maximum, so a pinned axis range
  // moves the bars and not just the tick labels (audit finding 4).
  const zeroPct = valueFraction(layout, 0) * 100;

  return (
    <span
      className={`chart-preview${legendVertical ? " chart-preview--legend-side" : ""}${legendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - barChartStyle.plotArea.transparency / 100 }}
    >
      {!legendAtBottom && legendNode}
      <span className="chart-preview__body">
        <span className="chart-preview__body-main">
          <span className="bar-preview__plot" style={{ height: BAR_CHART_BOX.height }}>
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

              {/* On the same x scale as the bars and gridlines, replacing a
                  hardcoded `left: 65%` that was measured against a different
                  box entirely. Honours the resolved value, which defaults to
                  0 — see the T7/T8 note on the registry's -1000..1000 range
                  against a dataMax of 82000. */}
              {barChartStyle.referenceLine.show && (
                <span
                  className="chart-preview__reference-line"
                  aria-hidden="true"
                  style={{
                    left: `${valueFraction(layout, barChartStyle.referenceLine.value) * 100}%`,
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
                    {index === 0 && barChartStyle.error.enabled && barChartStyle.error.barShow && (
                      <span
                        className="bar-item__error"
                        aria-hidden="true"
                        title="Error bars are enabled — representative indicator, not a data-fit range"
                        style={{ left: `${endPct}%` }}
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
                    {labelVisibleAt(index, barCategories.length, barChartStyle.labels.labelDensity) && (
                      <span
                        className={`bar-item__value${labelIsInside(barChartStyle.labels.labelPosition) ? " bar-item__value--inside" : ""}`}
                        style={{ left: `${endPct}%` }}
                      >
                        <DataLabel labels={barChartStyle.labels} category={label} value={value * 1000} detail={value * 12} />
                      </span>
                    )}
                  </span>
                );
              })}
            </span>

            <CategoryAxisGutter
              axis={barChartStyle.categoryAxis}
              layout={layout}
              categories={barCategories.map(([label]) => label)}
              offset={valueGutter}
              titleFallback="Region"
            />
          </span>
        </span>
      </span>
      {legendAtBottom && legendNode}
    </span>
  );
}
