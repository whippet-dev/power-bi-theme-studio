import { useState, type CSSProperties, type ReactNode } from "react";
import type { ResolvedBarChartStyle } from "../lib/barChartProperties";
import type { ResolvedCardStyle } from "../lib/cardProperties";
import type { ResolvedChromeStyle } from "../lib/chromeProperties";
import type { ResolvedSlicerStyle } from "../lib/slicerProperties";
import type { ResolvedTableStyle } from "../lib/tableProperties";
import type { ResolvedTheme } from "../lib/theme";

export type VisualKind = "card" | "bar" | "table" | "slicer";

type VisualGalleryProps = {
  theme: ResolvedTheme;
  tableStyle: ResolvedTableStyle;
  barChartStyle: ResolvedBarChartStyle;
  cardStyle: ResolvedCardStyle;
  slicerStyle: ResolvedSlicerStyle;
  chromeStyles: Record<VisualKind, ResolvedChromeStyle>;
  visibleVisuals: VisualKind[];
  selected: VisualKind;
  onSelect: (visual: VisualKind) => void;
};

type PreviewShellProps = {
  id: VisualKind;
  label: string;
  defaultTitle: string;
  variant: "hero" | "thumb";
  selected: boolean;
  theme: ResolvedTheme;
  chrome: ResolvedChromeStyle;
  onSelect: (visual: VisualKind) => void;
  children: ReactNode;
};

function mapLineStyle(value: string | number): "solid" | "dashed" | "dotted" {
  const normalized = String(value).toLowerCase();
  if (normalized === "dashed" || normalized === "custom") return "dashed";
  if (normalized === "dotted") return "dotted";
  return "solid";
}

function mapTextAlign(value: string | number): CSSProperties["textAlign"] | undefined {
  const normalized = String(value).toLowerCase();
  if (normalized === "left" || normalized === "center" || normalized === "right") {
    return normalized as CSSProperties["textAlign"];
  }
  return undefined; // "Auto" — leave the per-column default alignment alone.
}

function hexWithAlpha(hex: string, transparencyPercent: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, 1 - transparencyPercent / 100));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Every preview renders its content at the same literal pixel sizes
 * regardless of variant — resolved font sizes are often 8-12px, which
 * reads fine at thumbnail size but is hard to read at a glance. Rather
 * than threading a scale multiplier through every inline style, the
 * "hero" variant renders the identical markup at a fixed base size and
 * scales the whole thing up with a CSS transform (see .visual-tile--hero
 * in globals.css) — simplest way to make it legible without touching the
 * resolver or every font-size assignment.
 */
function PreviewShell({
  id,
  label,
  defaultTitle,
  variant,
  selected,
  theme,
  chrome,
  onSelect,
  children,
}: PreviewShellProps) {
  const frameStyle = {
    "--preview-bg": theme.background,
    "--preview-fg": theme.foreground,
    "--preview-muted": theme.muted,
    "--preview-font": theme.fontFamily,
    ...(chrome.background.show
      ? { backgroundColor: hexWithAlpha(chrome.background.color, chrome.background.transparency) }
      : {}),
    ...(chrome.border.show
      ? { border: `${chrome.border.width}px solid ${chrome.border.color}`, borderRadius: chrome.border.radius }
      : {}),
  } as CSSProperties;

  const titleText = chrome.title.text || defaultTitle;

  const tile = (
    <button
      type="button"
      className={`visual-tile visual-tile--${variant}${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      aria-label={`Edit ${label} properties`}
    >
      <span className="visual-tile__label">
        <span>{label}</span>
        <span className="visual-tile__action">{selected ? "Editing" : "Select"}</span>
      </span>
      <span className="visual-frame" style={frameStyle}>
        {chrome.title.show && (
          <span
            className="preview-title"
            style={{
              textAlign: chrome.title.alignment as CSSProperties["textAlign"],
              backgroundColor: chrome.title.background,
              color: chrome.title.fontColor,
              fontFamily: chrome.title.fontFamily,
              fontSize: chrome.title.fontSize,
              fontWeight: chrome.title.bold ? 700 : 400,
              fontStyle: chrome.title.italic ? "italic" : "normal",
              textDecoration: chrome.title.underline ? "underline" : "none",
              whiteSpace: chrome.title.titleWrap ? "normal" : "nowrap",
              overflow: "hidden",
              textOverflow: chrome.title.titleWrap ? "clip" : "ellipsis",
            }}
          >
            {titleText}
          </span>
        )}
        {chrome.subTitle.show && chrome.subTitle.text && (
          <span
            className="preview-subtitle"
            style={{
              textAlign: chrome.subTitle.alignment as CSSProperties["textAlign"],
              color: chrome.subTitle.fontColor,
              fontFamily: chrome.subTitle.fontFamily,
              fontSize: chrome.subTitle.fontSize,
              fontWeight: chrome.subTitle.bold ? 700 : 400,
              fontStyle: chrome.subTitle.italic ? "italic" : "normal",
              textDecoration: chrome.subTitle.underline ? "underline" : "none",
            }}
          >
            {chrome.subTitle.text}
          </span>
        )}
        {children}
      </span>
    </button>
  );

  if (variant !== "hero") return tile;

  return (
    <span className="visual-hero-scale-wrap">
      <span className="visual-hero-scale">{tile}</span>
    </span>
  );
}

export function VisualGallery({
  theme,
  tableStyle,
  barChartStyle,
  cardStyle,
  slicerStyle,
  chromeStyles,
  visibleVisuals,
  selected,
  onSelect,
}: VisualGalleryProps) {
  const palette = theme.palette;
  // Power BI's slicer "type" (list/dropdown/between/relative date, ...) is a
  // per-instance display setting, not something the theme JSON can actually
  // drive — so this is a preview-only view toggle, not theme state, letting
  // users check how their header/item styling looks in each layout without
  // it affecting the exported JSON.
  const [slicerLayout, setSlicerLayout] = useState<"list" | "dropdown">("list");

  const legendNode = barChartStyle.legend.show && (
    <span className="chart-preview__legend">
      <span className="chart-preview__legend-swatch" style={{ backgroundColor: barChartStyle.dataPoint.fill }} />
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
  );
  const legendAtBottom = String(barChartStyle.legend.position).startsWith("Bottom");

  const cardContent = (
    <span className="card-preview">
      {cardStyle.categoryLabels.show && (
        <span
          className="card-preview__category"
          style={{
            color: cardStyle.categoryLabels.color,
            fontFamily: cardStyle.categoryLabels.fontFamily || undefined,
            fontWeight: cardStyle.categoryLabels.bold ? 700 : 400,
            fontStyle: cardStyle.categoryLabels.italic ? "italic" : "normal",
            textDecoration: cardStyle.categoryLabels.underline ? "underline" : "none",
            whiteSpace: cardStyle.wordWrap.show ? "normal" : "nowrap",
          }}
        >
          Applications approved
        </span>
      )}
      <span
        className="card-preview__value"
        style={{
          fontSize: cardStyle.labels.fontSize,
          color: cardStyle.labels.color,
          fontFamily: cardStyle.labels.fontFamily || undefined,
          fontWeight: cardStyle.labels.bold ? 700 : 400,
          fontStyle: cardStyle.labels.italic ? "italic" : "normal",
          textDecoration: cardStyle.labels.underline ? "underline" : "none",
        }}
      >
        £8.4m
      </span>
      <span className="card-preview__trend" style={{ color: palette[1] ?? palette[0] }}>
        <span aria-hidden="true">↗</span> 7.2% vs last quarter
      </span>
      <span className="card-preview__spark" aria-hidden="true">
        {[34, 48, 41, 61, 55, 76, 84].map((height, index) => (
          <span key={height + index} style={{ height: `${height}%`, backgroundColor: palette[0] }} />
        ))}
      </span>
    </span>
  );

  const barContent = (
    <span className="chart-preview" style={{ opacity: 1 - barChartStyle.plotArea.transparency / 100 }}>
      {!legendAtBottom && legendNode}
      {barChartStyle.categoryAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title"
          style={{
            color: barChartStyle.categoryAxis.titleColor,
            fontFamily: barChartStyle.categoryAxis.titleFontFamily,
            fontSize: barChartStyle.categoryAxis.titleFontSize,
            fontWeight: barChartStyle.categoryAxis.titleBold ? 700 : 400,
            fontStyle: barChartStyle.categoryAxis.titleItalic ? "italic" : "normal",
            textDecoration: barChartStyle.categoryAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(barChartStyle.categoryAxis.titleText) || "Region"}
        </span>
      )}
      <span
        className="chart-preview__plot"
        style={{
          position: "relative",
          ...(barChartStyle.valueAxis.gridlineShow
            ? {
                backgroundImage: `repeating-linear-gradient(to right, ${barChartStyle.valueAxis.gridlineColor} 0, ${barChartStyle.valueAxis.gridlineColor} ${barChartStyle.valueAxis.gridlineThickness}px, transparent ${barChartStyle.valueAxis.gridlineThickness}px, transparent 25%)`,
              }
            : {}),
        }}
      >
        {barChartStyle.referenceLine.show && (
          <span
            className="chart-preview__reference-line"
            aria-hidden="true"
            style={{
              left: "65%",
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
        {[
          ["London", 82],
          ["North West", 66],
          ["Scotland", 51],
          ["Wales", 38],
        ].map(([label, value], index) => (
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
            <span className="bar-row__track-wrap">
              <span className="bar-row__track">
                <span
                  className="bar-row__fill"
                  style={{
                    width: `${value}%`,
                    backgroundColor: hexWithAlpha(barChartStyle.dataPoint.fill, barChartStyle.dataPoint.fillTransparency),
                    border: barChartStyle.dataPoint.borderShow
                      ? `${barChartStyle.dataPoint.borderSize}px solid ${barChartStyle.dataPoint.borderColor}`
                      : undefined,
                  }}
                />
              </span>
              {index === 0 && barChartStyle.error.enabled && barChartStyle.error.barShow && (
                <span
                  className="bar-row__error"
                  aria-hidden="true"
                  title="Error bars are enabled — representative indicator, not a data-fit range"
                  style={{ left: `${value}%` }}
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
                  backgroundColor: barChartStyle.labels.enableBackground
                    ? hexWithAlpha(barChartStyle.labels.backgroundColor, barChartStyle.labels.backgroundTransparency)
                    : undefined,
                  padding: barChartStyle.labels.enableBackground ? "1px 4px" : undefined,
                  borderRadius: barChartStyle.labels.enableBackground ? 3 : undefined,
                }}
              >
                {value}k
              </span>
            )}
          </span>
        ))}
      </span>
      {barChartStyle.valueAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title chart-preview__axis-title--value"
          style={{
            color: barChartStyle.valueAxis.titleColor,
            fontFamily: barChartStyle.valueAxis.titleFontFamily,
            fontSize: barChartStyle.valueAxis.titleFontSize,
            fontWeight: barChartStyle.valueAxis.titleBold ? 700 : 400,
            fontStyle: barChartStyle.valueAxis.titleItalic ? "italic" : "normal",
            textDecoration: barChartStyle.valueAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(barChartStyle.valueAxis.titleText) || "Applications (k)"}
        </span>
      )}
      {legendAtBottom && legendNode}
    </span>
  );

  const tableContent = (
    <span
      className="table-preview"
      style={{
        border: `${tableStyle.grid.outlineWeight}px solid ${tableStyle.grid.outlineColor}`,
      }}
    >
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
          textAlign: mapTextAlign(tableStyle.columnHeaders.alignment),
          whiteSpace: tableStyle.columnHeaders.wordWrap ? "normal" : "nowrap",
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
              whiteSpace: tableStyle.values.wordWrap ? "normal" : "nowrap",
              padding: `${tableStyle.grid.rowPadding}px 8px`,
              borderRight: tableStyle.grid.gridVertical
                ? `${tableStyle.grid.gridVerticalWeight}px solid ${tableStyle.grid.gridVerticalColor}`
                : undefined,
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
  );

  const slicerItemStyle: CSSProperties = {
    backgroundColor: slicerStyle.items.background,
    color: slicerStyle.items.fontColor,
    fontFamily: slicerStyle.items.fontFamily || undefined,
    fontSize: slicerStyle.items.textSize,
    fontWeight: slicerStyle.items.bold ? 700 : 400,
    fontStyle: slicerStyle.items.italic ? "italic" : "normal",
    textDecoration: slicerStyle.items.underline ? "underline" : "none",
  };

  const slicerContent = (
    <span className="slicer-preview">
      {/* Power BI's slicer "type" (list/dropdown/...) is a per-instance
          display setting the theme JSON can't actually drive — this toggle
          only changes what's rendered here, so header/item styling can be
          checked in either layout without affecting the exported theme. */}
      <span className="slicer-preview__layout-toggle" role="group" aria-label="Preview layout">
        <button
          type="button"
          className={slicerLayout === "list" ? "is-active" : ""}
          onClick={() => setSlicerLayout("list")}
        >
          List
        </button>
        <button
          type="button"
          className={slicerLayout === "dropdown" ? "is-active" : ""}
          onClick={() => setSlicerLayout("dropdown")}
        >
          Dropdown
        </button>
      </span>

      {slicerStyle.header.show && (
        <span
          className="slicer-preview__header"
          style={{
            backgroundColor: slicerStyle.header.background,
            color: slicerStyle.header.fontColor,
            fontFamily: slicerStyle.header.fontFamily || undefined,
            fontSize: slicerStyle.header.textSize,
            fontWeight: slicerStyle.header.bold ? 700 : 400,
            fontStyle: slicerStyle.header.italic ? "italic" : "normal",
            textDecoration: slicerStyle.header.underline ? "underline" : "none",
          }}
        >
          {(slicerStyle.header.showRestatement && "3 of 4 selected") || String(slicerStyle.header.text) || "Status"}
        </span>
      )}

      {slicerLayout === "dropdown" ? (
        <span className="slicer-preview__dropdown" style={slicerItemStyle}>
          <span>Approved, In review +2</span>
          <span aria-hidden="true">⌄</span>
        </span>
      ) : (
        <>
          <span
            className="slicer-preview__search"
            style={{ backgroundColor: slicerStyle.searchBox.background, borderColor: slicerStyle.searchBox.borderColor }}
          >
            Search
          </span>
          {["All statuses", "Approved", "In review", "Declined"].map((label, index) => (
            <span className="slicer-preview__option" key={label} style={slicerItemStyle}>
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
        </>
      )}
    </span>
  );

  const descriptors: Array<{
    id: VisualKind;
    label: string;
    defaultTitle: string;
    chrome: ResolvedChromeStyle;
    content: ReactNode;
  }> = [
    { id: "card", label: "Card", defaultTitle: "Total support awarded", chrome: chromeStyles.card, content: cardContent },
    { id: "bar", label: "Clustered bar chart", defaultTitle: "Applications by region", chrome: chromeStyles.bar, content: barContent },
    { id: "table", label: "Table", defaultTitle: "Regional performance", chrome: chromeStyles.table, content: tableContent },
    { id: "slicer", label: "Slicer", defaultTitle: "Application status", chrome: chromeStyles.slicer, content: slicerContent },
  ];

  const visible = descriptors.filter((d) => visibleVisuals.includes(d.id));
  const hero = visible.find((d) => d.id === selected) ?? visible[0];
  const thumbnails = visible.filter((d) => d.id !== hero?.id);

  return (
    <div className="visual-canvas">
      {hero && (
        <PreviewShell
          key={hero.id}
          id={hero.id}
          label={hero.label}
          defaultTitle={hero.defaultTitle}
          variant="hero"
          selected
          theme={theme}
          chrome={hero.chrome}
          onSelect={onSelect}
        >
          {hero.content}
        </PreviewShell>
      )}
      {thumbnails.length > 0 && (
        <div className="visual-thumbnails">
          {thumbnails.map((d) => (
            <PreviewShell
              key={d.id}
              id={d.id}
              label={d.label}
              defaultTitle={d.defaultTitle}
              variant="thumb"
              selected={false}
              theme={theme}
              chrome={d.chrome}
              onSelect={onSelect}
            >
              {d.content}
            </PreviewShell>
          ))}
        </div>
      )}
    </div>
  );
}
