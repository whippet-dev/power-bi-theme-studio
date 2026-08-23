import { hexWithAlpha } from "../../lib/colorUtils";
import {
  CategoryAxisGutter,
  ChartLegend,
  DataLabel,
  labelVisibleAt,
  legendIsAfterPlot,
  legendIsVertical,
  mapLineStyle,
  ScaledGridlines,
  ValueAxisGutter,
  ZoomSliders,
} from "../ChartParts";
import { BAR_DATA_MAX, barCategories } from "../../lib/previewSampleData";
import { categoryPercent, COLUMN_CHART_BOX, computePreviewCartesianLayout, valueFraction } from "./cartesianLayout";
import type { ResolvedColumnChartStyle } from "../../lib/columnChartProperties";

type Props = { columnChartStyle: ResolvedColumnChartStyle };

export function ColumnChartPreview({ columnChartStyle }: Props) {
  const columnLegendNode = (
    <ChartLegend legend={columnChartStyle.legend} items={[{ label: "Applications", color: columnChartStyle.dataPoint.fill }]} />
  );
  const columnLegendAtBottom = legendIsAfterPlot(columnChartStyle.legend.position);
  const columnLegendVertical = legendIsVertical(columnChartStyle.legend.position);

  // One layout for this visual instance. Everything geometric below reads
  // from it — gutters, gridlines, columns, labels, reference line — so the
  // chart cannot end up with two disagreeing coordinate systems the way
  // the CSS-derived version did (RENDERER_AUDIT §2.4, §3).
  const layout = computePreviewCartesianLayout({
    box: COLUMN_CHART_BOX,
    orientation: "vertical",
    categoryAxis: columnChartStyle.categoryAxis,
    valueAxis: columnChartStyle.valueAxis,
    categories: barCategories.map(([label]) => label),
    dataMax: BAR_DATA_MAX,
    innerPadding: columnChartStyle.categoryAxis.innerPadding,
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: "Region",
  });

  const valueGutter = layout.valueAxis?.width ?? 0;
  const categoryGutter = layout.categoryAxis?.height ?? 0;
  // Zero's height above the plot floor, as a percentage of the plot. Every
  // column and the error indicator measure from this, so the baseline is
  // the zero gridline by construction rather than by coincidence.
  const zeroPct = valueFraction(layout, 0) * 100;

  return (
    <span
      className={`chart-preview${columnLegendVertical ? " chart-preview--legend-side" : ""}${columnLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - columnChartStyle.plotArea.transparency / 100 }}
    >
      {!columnLegendAtBottom && columnLegendNode}
      <span className="chart-preview__body">
        <span className="chart-preview__body-main">
          <span className="column-preview__plot" style={{ height: COLUMN_CHART_BOX.height }}>
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

              {barCategories.map(([label, value], index) => {
                const { offset: left, size: width } = categoryPercent(layout, index, barCategories.length);
                const topPct = valueFraction(layout, value * 1000) * 100;
                const height = Math.abs(topPct - zeroPct);
                const bottom = Math.min(topPct, zeroPct);
                return (
                  <span className="column-item" key={label} style={{ left: `${left}%`, width: `${width}%` }}>
                    {labelVisibleAt(index, barCategories.length, columnChartStyle.labels.labelDensity) && (
                      <span className="column-item__value" style={{ bottom: `${topPct}%` }}>
                        <DataLabel labels={columnChartStyle.labels} category={label} value={value * 1000} detail={value * 12} />
                      </span>
                    )}
                    <span
                      className="column-item__fill"
                      style={{
                        bottom: `${bottom}%`,
                        height: `${height}%`,
                        width: barThicknessPercent(columnChartStyle.layout.clusteredGapSize),
                        backgroundColor: hexWithAlpha(columnChartStyle.dataPoint.fill, columnChartStyle.dataPoint.fillTransparency),
                        border: columnChartStyle.dataPoint.borderShow
                          ? `${columnChartStyle.dataPoint.borderSize}px solid ${columnChartStyle.dataPoint.borderColor}`
                          : undefined,
                      }}
                    />
                    {index === 0 && columnChartStyle.error.enabled && columnChartStyle.error.barShow && (
                      <span
                        className="column-item__error"
                        aria-hidden="true"
                        title="Error bars are enabled — representative indicator, not a data-fit range"
                        style={{ bottom: `${topPct}%` }}
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

            <CategoryAxisGutter
              axis={columnChartStyle.categoryAxis}
              layout={layout}
              categories={barCategories.map(([label]) => label)}
              offset={valueGutter}
              titleFallback="Region"
            />
          </span>
        </span>
      </span>
      {columnLegendAtBottom && columnLegendNode}
    </span>
  );
}

/** Bar thickness as a share of its category slot, matching the old helper. */
function barThicknessPercent(gapSize: number): string {
  const gap = Math.max(0, Math.min(90, gapSize || 20));
  return `${100 - gap}%`;
}
