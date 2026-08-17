import type { CSSProperties, ReactNode } from "react";
import type { ResolvedBarChartStyle } from "../lib/barChartProperties";
import type { ResolvedTableStyle } from "../lib/tableProperties";
import type { ResolvedTheme } from "../lib/theme";

export type VisualKind = "card" | "bar" | "table" | "slicer";

type VisualGalleryProps = {
  theme: ResolvedTheme;
  tableStyle: ResolvedTableStyle;
  barChartStyle: ResolvedBarChartStyle;
  selected: VisualKind;
  onSelect: (visual: VisualKind) => void;
};

type PreviewShellProps = {
  id: VisualKind;
  label: string;
  selected: boolean;
  theme: ResolvedTheme;
  onSelect: (visual: VisualKind) => void;
  children: ReactNode;
};

function PreviewShell({
  id,
  label,
  selected,
  theme,
  onSelect,
  children,
}: PreviewShellProps) {
  const style = {
    "--preview-bg": theme.background,
    "--preview-fg": theme.foreground,
    "--preview-muted": theme.muted,
    "--preview-font": theme.fontFamily,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`visual-tile${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      aria-label={`Edit ${label} properties`}
    >
      <span className="visual-tile__label">
        <span>{label}</span>
        <span className="visual-tile__action">{selected ? "Editing" : "Select"}</span>
      </span>
      <span className="visual-frame" style={style}>
        {children}
      </span>
    </button>
  );
}

export function VisualGallery({ theme, tableStyle, barChartStyle, selected, onSelect }: VisualGalleryProps) {
  const palette = theme.palette;

  return (
    <div className="visual-grid">
      <PreviewShell
        id="card"
        label="Card"
        selected={selected === "card"}
        theme={theme}
        onSelect={onSelect}
      >
        <span className="card-preview">
          <span className="preview-title" style={{ fontSize: theme.titleSize }}>
            Total support awarded
          </span>
          <span className="card-preview__value" style={{ fontSize: theme.calloutSize }}>
            £8.4m
          </span>
          <span className="card-preview__trend" style={{ color: palette[1] ?? palette[0] }}>
            <span aria-hidden="true">↗</span> 7.2% vs last quarter
          </span>
          <span className="card-preview__spark" aria-hidden="true">
            {[34, 48, 41, 61, 55, 76, 84].map((height, index) => (
              <span
                key={height + index}
                style={{ height: `${height}%`, backgroundColor: palette[0] }}
              />
            ))}
          </span>
        </span>
      </PreviewShell>

      <PreviewShell
        id="bar"
        label="Clustered bar chart"
        selected={selected === "bar"}
        theme={theme}
        onSelect={onSelect}
      >
        <span className="chart-preview" style={{ opacity: 1 - barChartStyle.plotArea.transparency / 100 }}>
          <span className="preview-title" style={{ fontSize: theme.titleSize }}>
            Applications by region
          </span>
          {barChartStyle.legend.show && (
            <span className="chart-preview__legend">
              <span
                className="chart-preview__legend-swatch"
                style={{ backgroundColor: barChartStyle.dataPoint.fill }}
              />
              <span
                style={{
                  color: barChartStyle.legend.labelColor,
                  fontFamily: barChartStyle.legend.fontFamily,
                  fontSize: barChartStyle.legend.fontSize,
                  fontWeight: barChartStyle.legend.bold ? 700 : 400,
                  fontStyle: barChartStyle.legend.italic ? "italic" : "normal",
                  textDecoration: barChartStyle.legend.underline ? "underline" : "none",
                }}
              >
                Applications
              </span>
            </span>
          )}
          <span
            className="chart-preview__plot"
            style={
              barChartStyle.valueAxis.gridlineShow
                ? {
                    backgroundImage: `repeating-linear-gradient(to right, ${barChartStyle.valueAxis.gridlineColor} 0, ${barChartStyle.valueAxis.gridlineColor} ${barChartStyle.valueAxis.gridlineThickness}px, transparent ${barChartStyle.valueAxis.gridlineThickness}px, transparent 25%)`,
                  }
                : undefined
            }
          >
            {[
              ["London", 82],
              ["North West", 66],
              ["Scotland", 51],
              ["Wales", 38],
            ].map(([label, value]) => (
              <span className="bar-row" key={label}>
                {barChartStyle.categoryAxis.show && (
                  <span
                    className="bar-row__label"
                    style={{
                      color: barChartStyle.categoryAxis.labelColor,
                      fontFamily: barChartStyle.categoryAxis.fontFamily,
                      fontSize: barChartStyle.categoryAxis.fontSize,
                      fontWeight: barChartStyle.categoryAxis.bold ? 700 : 400,
                      fontStyle: barChartStyle.categoryAxis.italic ? "italic" : "normal",
                      textDecoration: barChartStyle.categoryAxis.underline ? "underline" : "none",
                    }}
                  >
                    {label}
                  </span>
                )}
                <span className="bar-row__track">
                  <span
                    className="bar-row__fill"
                    style={{
                      width: `${value}%`,
                      backgroundColor: barChartStyle.dataPoint.fill,
                    }}
                  />
                </span>
                {barChartStyle.labels.show && (
                  <span
                    className="bar-row__value"
                    style={{
                      color: barChartStyle.labels.color,
                      fontFamily: barChartStyle.labels.fontFamily,
                      fontSize: barChartStyle.labels.fontSize,
                      fontWeight: barChartStyle.labels.bold ? 700 : 400,
                      fontStyle: barChartStyle.labels.italic ? "italic" : "normal",
                      textDecoration: barChartStyle.labels.underline ? "underline" : "none",
                    }}
                  >
                    {value}k
                  </span>
                )}
              </span>
            ))}
          </span>
        </span>
      </PreviewShell>

      <PreviewShell
        id="table"
        label="Table"
        selected={selected === "table"}
        theme={theme}
        onSelect={onSelect}
      >
        <span className="table-preview">
          <span className="preview-title" style={{ fontSize: theme.titleSize }}>
            Regional performance
          </span>
          <span
            className="table-preview__row table-preview__head"
            style={{
              backgroundColor: tableStyle.columnHeaders.backColor,
              color: tableStyle.columnHeaders.fontColor,
              fontFamily: tableStyle.columnHeaders.fontFamily,
              fontSize: tableStyle.columnHeaders.fontSize,
              fontWeight: tableStyle.columnHeaders.bold ? 700 : 400,
              fontStyle: tableStyle.columnHeaders.italic ? "italic" : "normal",
              textDecoration: tableStyle.columnHeaders.underline ? "underline" : "none",
              padding: `${tableStyle.grid.rowPadding}px 8px`,
              borderRight: tableStyle.grid.gridVertical
                ? `${tableStyle.grid.gridVerticalWeight}px solid ${tableStyle.grid.gridVerticalColor}`
                : undefined,
            }}
          >
            <span>Region</span><span>Approved</span><span>Value</span>
          </span>
          {[
            ["London", "82%", "£2.8m"],
            ["North West", "76%", "£2.1m"],
            ["Scotland", "71%", "£1.9m"],
          ].map((row, index) => {
            const banded = index % 2 === 1;
            return (
              <span
                className="table-preview__row"
                key={row[0]}
                style={{
                  backgroundColor: banded ? tableStyle.values.backColorSecondary : tableStyle.values.backColorPrimary,
                  color: banded ? tableStyle.values.fontColorSecondary : tableStyle.values.fontColorPrimary,
                  fontFamily: tableStyle.values.fontFamily,
                  fontSize: tableStyle.values.fontSize,
                  fontWeight: tableStyle.values.bold ? 700 : 400,
                  fontStyle: tableStyle.values.italic ? "italic" : "normal",
                  textDecoration: tableStyle.values.underline ? "underline" : "none",
                  padding: `${tableStyle.grid.rowPadding}px 8px`,
                  borderBottom: tableStyle.grid.gridHorizontal
                    ? `${tableStyle.grid.gridHorizontalWeight}px solid ${tableStyle.grid.gridHorizontalColor}`
                    : "none",
                }}
              >
                {row.map((cell) => <span key={cell}>{cell}</span>)}
              </span>
            );
          })}
          {tableStyle.total.totals && (
            <span
              className="table-preview__row"
              style={{
                backgroundColor: tableStyle.total.backColor,
                color: tableStyle.total.fontColor,
                fontFamily: tableStyle.total.fontFamily,
                fontSize: tableStyle.total.fontSize,
                fontWeight: tableStyle.total.bold ? 700 : 400,
                fontStyle: tableStyle.total.italic ? "italic" : "normal",
                textDecoration: tableStyle.total.underline ? "underline" : "none",
                padding: `${tableStyle.grid.rowPadding}px 8px`,
              }}
            >
              <span>{tableStyle.total.label}</span><span>76%</span><span>£6.8m</span>
            </span>
          )}
        </span>
      </PreviewShell>

      <PreviewShell
        id="slicer"
        label="Slicer"
        selected={selected === "slicer"}
        theme={theme}
        onSelect={onSelect}
      >
        <span className="slicer-preview">
          <span className="preview-title" style={{ fontSize: theme.titleSize }}>
            Application status
          </span>
          <span className="slicer-preview__search">Search</span>
          {["All statuses", "Approved", "In review", "Declined"].map((label, index) => (
            <span className="slicer-preview__option" key={label}>
              <span
                className={`slicer-preview__check${index < 2 ? " is-checked" : ""}`}
                style={index < 2 ? { backgroundColor: palette[0], borderColor: palette[0] } : undefined}
                aria-hidden="true"
              >
                {index < 2 ? "✓" : ""}
              </span>
              {label}
              {index === 0 && <span className="slicer-preview__count">4</span>}
            </span>
          ))}
        </span>
      </PreviewShell>
    </div>
  );
}
