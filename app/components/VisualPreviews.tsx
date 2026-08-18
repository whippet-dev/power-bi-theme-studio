import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import type { ResolvedActionButtonStyle } from "../lib/actionButtonProperties";
import type { ResolvedBarChartStyle } from "../lib/barChartProperties";
import type { ResolvedBookmarkNavigatorStyle } from "../lib/bookmarkNavigatorProperties";
import type { ResolvedCardStyle } from "../lib/cardProperties";
import { hexWithAlpha } from "../lib/colorUtils";
import {
  AxisTickLabels,
  axisTitleStyle,
  ChartLegend,
  DataLabel,
  dataLabelStyle,
  formatValue,
  Gridlines,
  labelIsInside,
  labelVisibleAt,
  legendIsAfterPlot,
  legendIsVertical,
  mapTextAlign,
  SmallMultiplesGrid,
  textStyle,
  ZoomSliders,
} from "./ChartParts";
import type { ResolvedChromeStyle } from "../lib/chromeProperties";
import type { ResolvedColumnChartStyle } from "../lib/columnChartProperties";
import type { ResolvedImageStyle } from "../lib/imageProperties";
import type { ResolvedLineChartStyle } from "../lib/lineChartProperties";
import type { ResolvedMatrixStyle } from "../lib/matrixProperties";
import type { ResolvedPageNavigatorStyle } from "../lib/pageNavigatorProperties";
import type { ResolvedPieChartStyle } from "../lib/pieChartProperties";
import { areaPath, linePath, markerShape } from "../lib/lineGeometry";
import { shapeGeometry } from "../lib/shapeGeometry";
import type { ResolvedShapeFamilyCore } from "../lib/shapeFamilyProperties";
import type { ResolvedShapeStyle } from "../lib/shapeProperties";
import type { ResolvedSlicerStyle } from "../lib/slicerProperties";
import type { ResolvedStackedBarChartStyle } from "../lib/stackedBarChartProperties";
import type { ResolvedStackedColumnChartStyle } from "../lib/stackedColumnChartProperties";
import type { ResolvedTableStyle } from "../lib/tableProperties";
import type { ResolvedTextboxStyle } from "../lib/textboxProperties";
import { readThemeValueAtPath, type PowerBITheme, type ResolvedTheme } from "../lib/theme";

export type VisualKind =
  | "card"
  | "bar"
  | "column"
  | "stackedBar"
  | "stackedColumn"
  | "line"
  | "table"
  | "matrix"
  | "pie"
  | "slicer"
  | "shape"
  | "actionButton"
  | "bookmarkNavigator"
  | "pageNavigator"
  | "textbox"
  | "image";

/**
 * Whether the user has actually opened a chart's small-multiples grid and
 * changed something. Power BI only turns small multiples on by binding a
 * field to that data role — a concept the theme JSON has no signal for —
 * so `smallMultiplesLayout.columnCount` always resolves to a sensible
 * default (2) whether or not the feature is in use. Gating the preview on
 * that resolved value alone would make every chart open as a small
 * multiples grid; checking for a real override is the closest proxy this
 * theme-only tool has for "the user is looking at this setting".
 */
function hasSmallMultiplesOverride(theme: PowerBITheme, visual: string): boolean {
  const group = readThemeValueAtPath(theme, ["visualStyles", visual, "*", "smallMultiplesLayout"]);
  return Array.isArray(group) && group.length > 0;
}

type VisualGalleryProps = {
  theme: ResolvedTheme;
  rawTheme: PowerBITheme;
  tableStyle: ResolvedTableStyle;
  barChartStyle: ResolvedBarChartStyle;
  columnChartStyle: ResolvedColumnChartStyle;
  stackedBarChartStyle: ResolvedStackedBarChartStyle;
  stackedColumnChartStyle: ResolvedStackedColumnChartStyle;
  lineChartStyle: ResolvedLineChartStyle;
  cardStyle: ResolvedCardStyle;
  slicerStyle: ResolvedSlicerStyle;
  matrixStyle: ResolvedMatrixStyle;
  pieChartStyle: ResolvedPieChartStyle;
  shapeStyle: ResolvedShapeStyle;
  actionButtonStyle: ResolvedActionButtonStyle;
  bookmarkNavigatorStyle: ResolvedBookmarkNavigatorStyle;
  pageNavigatorStyle: ResolvedPageNavigatorStyle;
  textboxStyle: ResolvedTextboxStyle;
  imageStyle: ResolvedImageStyle;
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

function svgDashArray(style: "solid" | "dashed" | "dotted"): string | undefined {
  if (style === "dashed") return "6 4";
  if (style === "dotted") return "1.5 3";
  return undefined;
}


/**
 * Shared tile renderer for the "shape family" visuals (Shape, Action
 * button, Bookmark navigator, Page navigator) — they all share the same
 * fill/outline/shadow/text core, so one function renders the common tile
 * body; each caller adds its own extras (an icon, an accent bar, ...).
 */
/**
 * Power BI's slicer type (list, dropdown, between, date range, relative
 * date) is a per-instance display setting the theme JSON can't drive, but
 * each type has its own styling group in the schema. The preview offers
 * them as a local view toggle so those groups have something to render
 * against — without pretending the tool can write a setting Power BI
 * won't honour from a theme file.
 */
type SlicerLayout = "list" | "dropdown" | "between" | "dateRange" | "relative";

/**
 * The shape shared by every constant-line group (referenceLine,
 * xAxisReferenceLine, y1AxisReferenceLine). They differ only in whether
 * `value` is typed as a string or a number, so the preview accepts both.
 */
type ConstantLineStyle = {
  show: boolean;
  lineColor: string;
  style: string | number;
  width: number;
  transparency: number;
  value: string | number;
  displayName: string | number;
  shadeShow: boolean;
  shadeColor: string;
  shadeColorMatchStroke: boolean;
  shadeRegion: string | number;
  shadeTransparency: number;
  dataLabelShow: boolean;
  dataLabelColor: string;
  dataLabelText: string | number;
  dataLabelDisplayUnits: string | number;
  dataLabelDecimalPoints: number;
  dataLabelHorizontalPosition: string | number;
  dataLabelVerticalPosition: string | number;
};

const SLICER_LAYOUTS: Array<[SlicerLayout, string]> = [
  ["list", "List"],
  ["dropdown", "Dropdown"],
  ["between", "Between"],
  ["dateRange", "Date range"],
  ["relative", "Relative"],
];

/** Power BI's outlineStyle is a bitmask of which edges draw a border. */
function outlineFromBitmask(mask: number, color: string, weight: number): CSSProperties {
  if (!mask || !weight) return {};
  const line = `${weight}px solid ${color}`;
  return {
    borderTop: mask & 1 ? line : undefined,
    borderBottom: mask & 2 ? line : undefined,
    borderLeft: mask & 4 ? line : undefined,
    borderRight: mask & 8 ? line : undefined,
  };
}

/**
 * Bar/column thickness from the chart's gap-size setting. Power BI's gap
 * is the share of each category slot left empty, so a larger gap means a
 * thinner bar. 0 keeps the built-in default rather than a full-width bar.
 */
function barThickness(gapSize: number): string {
  const gap = Math.max(0, Math.min(90, gapSize || 20));
  return `${100 - gap}%`;
}

// A horizontal bar chart's value axis (0%-100%) only spans .bar-row's
// middle track column, not the whole row — the category-label and
// value-label columns sit either side of it. Must match .bar-row's
// `grid-template-columns: 68px minmax(80px, 1fr) 28px; gap: 8px;` in
// globals.css, or gridlines/ticks drift onto the label gutters instead of
// lining up with the bars they measure.
const BAR_VALUE_AXIS_INSET = { start: 68 + 8, end: 8 + 28 };

/** The glyph Power BI shows for each built-in action button icon. */
function actionButtonGlyph(shapeType: string): string {
  const glyphs: Record<string, string> = {
    blank: "",
    leftArrow: "←",
    rightArrow: "→",
    back: "↩",
    reset: "↺",
    help: "?",
    information: "ℹ",
    qna: "Q",
    bookmarks: "🔖",
    applyAllSlicers: "✓",
    clearAllSlicers: "✕",
    custom: "◆",
    spinner: "◐",
  };
  return glyphs[shapeType] ?? "";
}

function shapeTile(
  style: ResolvedShapeFamilyCore,
  key: string,
  extra?: ReactNode,
  /** Where `extra` (an action button's icon) sits relative to the text. */
  extraPlacement?: string,
): ReactNode {
  const tileShape = String(style.shape.tileShape);
  const geometry = shapeGeometry(tileShape, style.shape);
  const clipped = "clipPath" in geometry;

  const fill = style.fill.show ? hexWithAlpha(style.fill.fillColor, style.fill.transparency) : "transparent";
  const outlineColor = hexWithAlpha(style.outline.lineColor, style.outline.transparency);

  const shadow = style.shadow.show
    ? `${shapeShadowOffset(style.shadow)} ${style.shadow.shadowBlur}px ${hexWithAlpha(style.shadow.color, style.shadow.transparency)}`
    : undefined;
  const glow = style.glow.show ? `0 0 ${style.glow.shadowBlur}px ${hexWithAlpha(style.glow.color, style.glow.transparency)}` : undefined;
  const shadows = [shadow, glow].filter(Boolean).join(", ") || undefined;

  return (
    <span
      className="shape-tile"
      key={key}
      style={{
        // clip-path cuts off any CSS border, so a clipped shape draws its
        // outline as an inset ring instead — otherwise turning the outline
        // on would do nothing for most shapes.
        backgroundColor: fill,
        ...(style.outline.show
          ? clipped
            ? { boxShadow: `inset 0 0 0 ${style.outline.weight}px ${outlineColor}` }
            : { border: `${style.outline.weight}px solid ${outlineColor}` }
          : {}),
        ...geometry,
        // A clipped shape can't also cast a CSS shadow (the shadow is
        // clipped too), so it goes on the wrapper via filter instead.
        ...(shadows && !clipped ? { boxShadow: shadows } : {}),
        ...(shadows && clipped
          ? {
              filter: `drop-shadow(${shapeShadowOffset(style.shadow)} ${hexWithAlpha(style.shadow.color, style.shadow.transparency)})`,
            }
          : {}),
        transform: [
          style.rotation.angle ? `rotate(${style.rotation.angle}deg)` : "",
          style.rotation.shapeAngle ? `rotate(${style.rotation.shapeAngle}deg)` : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
        flexDirection: extraPlacement === "above" ? "column" : extraPlacement === "below" ? "column-reverse" : "row",
        ...(extraPlacement === "right" ? { flexDirection: "row-reverse" } : {}),
      }}
    >
      {extra}
      {style.text.show && (
        <span
          className="shape-tile__text"
          style={{
            color: style.text.fontColor,
            fontFamily: style.text.fontFamily || undefined,
            fontSize: style.text.fontSize,
            fontWeight: style.text.bold ? 700 : 400,
            fontStyle: style.text.italic ? "italic" : "normal",
            textDecoration: style.text.underline ? "underline" : "none",
            textAlign: mapTextAlign(style.text.horizontalAlignment) ?? "center",
            justifyContent:
              style.text.verticalAlignment === "top" ? "flex-start" : style.text.verticalAlignment === "bottom" ? "flex-end" : "center",
            padding: `${style.text.topMargin}px ${style.text.rightMargin}px ${style.text.bottomMargin}px ${style.text.leftMargin}px`,
            // Text rotates independently of the shape in Power BI.
            transform: style.rotation.textAngle ? `rotate(${style.rotation.textAngle}deg)` : undefined,
          }}
        >
          {String(style.text.text) || key}
        </span>
      )}
    </span>
  );
}

/** Offset for a shape-family shadow, from its named preset or its angle. */
function shapeShadowOffset(shadow: ResolvedShapeFamilyCore["shadow"]): string {
  const presets: Record<string, [number, number]> = {
    top: [0, -1],
    topLeft: [-1, -1],
    topRight: [1, -1],
    center: [0, 0],
    centerLeft: [-1, 0],
    centerRight: [1, 0],
    bottom: [0, 1],
    bottomLeft: [-1, 1],
    bottomRight: [1, 1],
  };
  const preset = presets[String(shadow.shadowPositionPreset)];
  const distance = shadow.shadowDistance;
  if (preset) return `${(preset[0] * distance).toFixed(1)}px ${(preset[1] * distance).toFixed(1)}px`;
  const radians = (shadow.angle * Math.PI) / 180;
  return `${(Math.cos(radians) * distance).toFixed(1)}px ${(Math.sin(radians) * distance).toFixed(1)}px`;
}

/**
 * Power BI's display-units enum picks the scale a number is abbreviated to
 * (0 = auto), and label precision fixes the decimal places. Both are
 * meaningless unless the preview actually reformats its sample value, so
 * the Card renders a real formatted number rather than a fixed string.
 */
function formatCardValue(
  value: number,
  displayUnits: string | number,
  precision: number,
  formatString: string,
): string {
  const units: Record<string, [number, string]> = {
    "0": [1, ""], // Auto — the sample value sits in the millions
    "1": [1, ""], // None
    "1000": [1e3, "K"],
    "1000000": [1e6, "M"],
    "1000000000": [1e9, "bn"],
    "1000000000000": [1e12, "T"],
  };
  const [divisor, suffix] = units[String(displayUnits)] ?? (value >= 1e6 ? [1e6, "M"] : [1, ""]);
  const auto = String(displayUnits) === "0" && value >= 1e6 ? ([1e6, "M"] as const) : null;
  const [d, s] = auto ?? [divisor, suffix];

  const scaled = value / d;
  // Precision 0 with an abbreviated unit still reads better with one
  // decimal (Power BI's own auto behaviour), so only force 0 when the
  // user explicitly picked it on an unabbreviated number.
  const decimals = precision > 0 ? precision : s ? 1 : 0;
  const body = scaled.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  // formatString is a full .NET/Power BI format code; the preview only
  // honours a leading currency symbol, which is the common case.
  const currency = /^[£$€]/.exec(String(formatString))?.[0] ?? "£";
  return `${currency}${body}${s}`;
}

/**
 * `title.heading` / `subTitle.heading` deliberately change nothing visually
 * — they set the heading level assistive technology announces. Rendering
 * them as real ARIA heading semantics is the only faithful way to reflect
 * them, so the preview matches what the property actually does.
 */
function headingAria(heading: string | number): { role?: string; "aria-level"?: number } {
  const match = /^Heading([2-6])$/.exec(String(heading));
  if (!match) return {};
  return { role: "heading", "aria-level": Number(match[1]) };
}

/**
 * Describes a visual's configured action, naming the destination where the
 * action type has one — so switching between Bookmark/Page navigation/Web
 * URL and setting its target both show up.
 */
function visualLinkLabel(link: ResolvedChromeStyle["visualLink"]): string {
  const type = String(link.type);
  const named: Record<string, string> = {
    Back: "Back",
    Bookmark: "Bookmark",
    Drillthrough: "Drill through",
    PageNavigation: "Page navigation",
    Qna: "Q&A",
    WebUrl: "Web URL",
    ApplyAllSlicers: "Apply all slicers",
    ClearAllSlicers: "Clear all slicers",
    DataFunction: "Data function",
  };
  const destination =
    type === "Bookmark"
      ? String(link.bookmark)
      : type === "Drillthrough"
        ? String(link.drillthroughSection)
        : type === "PageNavigation"
          ? String(link.navigationSection)
          : type === "WebUrl"
            ? String(link.webUrl)
            : "";
  const base = named[type] ?? type;
  return destination ? `${base} → ${destination}` : base;
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
  // Power BI offsets a drop shadow by an angle + distance unless a named
  // preset overrides both; "Inner" draws it inside the visual's edge.
  const shadowOffset = (): { x: number; y: number } => {
    const presetOffsets: Record<string, [number, number]> = {
      top: [0, -1],
      topLeft: [-1, -1],
      topRight: [1, -1],
      center: [0, 0],
      centerLeft: [-1, 0],
      centerRight: [1, 0],
      bottom: [0, 1],
      bottomLeft: [-1, 1],
      bottomRight: [1, 1],
      // Power BI's chrome dropShadow group uses PascalCase preset values,
      // unlike the shape family's lowercase ones — both spellings appear
      // in the schema, so accept either rather than silently falling
      // through to the angle branch for one of them.
      Top: [0, -1],
      TopLeft: [-1, -1],
      TopRight: [1, -1],
      Center: [0, 0],
      CenterLeft: [-1, 0],
      CenterRight: [1, 0],
      Bottom: [0, 1],
      BottomLeft: [-1, 1],
      BottomRight: [1, 1],
    };
    const preset = presetOffsets[String(chrome.dropShadow.preset)];
    const distance = chrome.dropShadow.shadowDistance;
    if (preset) return { x: preset[0] * distance, y: preset[1] * distance };
    const radians = (chrome.dropShadow.angle * Math.PI) / 180;
    return { x: Math.cos(radians) * distance, y: Math.sin(radians) * distance };
  };

  const boxShadow = (() => {
    if (!chrome.dropShadow.show) return undefined;
    const { x, y } = shadowOffset();
    const inset = String(chrome.dropShadow.position) === "Inner" ? "inset " : "";
    const color = hexWithAlpha(chrome.dropShadow.color, chrome.dropShadow.transparency);
    return `${inset}${x.toFixed(1)}px ${y.toFixed(1)}px ${chrome.dropShadow.shadowBlur}px ${chrome.dropShadow.shadowSpread}px ${color}`;
  })();

  const frameStyle = {
    "--preview-bg": theme.background,
    "--preview-fg": theme.foreground,
    "--preview-muted": theme.muted,
    "--preview-font": theme.fontFamily,
    paddingTop: chrome.padding.top || undefined,
    paddingRight: chrome.padding.right || undefined,
    paddingBottom: chrome.padding.bottom || undefined,
    paddingLeft: chrome.padding.left || undefined,
    boxShadow,
    ...(chrome.background.show
      ? { backgroundColor: hexWithAlpha(chrome.background.color, chrome.background.transparency) }
      : {}),
    ...(chrome.border.show
      ? { border: `${chrome.border.width}px solid ${chrome.border.color}`, borderRadius: chrome.border.radius }
      : {}),
    ...(chrome.lockAspect.show ? { aspectRatio: "16 / 10" } : {}),
  } as CSSProperties;

  const titleText = chrome.title.text || defaultTitle;
  // Only the spacing values apply when "Customize spacing" is on, matching
  // Power BI — otherwise the visual keeps its own built-in spacing.
  const spacing = chrome.spacing.customizeSpacing ? chrome.spacing : null;

  // Every icon Power BI's visual header can show, in roughly its own
  // left-to-right order, so toggling any one of them is visible here.
  const headerIcons: Array<[boolean, string, string]> = [
    [chrome.visualHeader.showVisualWarningButton, "⚠", "Warning"],
    [chrome.visualHeader.showVisualErrorButton, "⊗", "Error"],
    [chrome.visualHeader.showVisualInformationButton, "ℹ", "Information"],
    [chrome.visualHeader.showFilterRestatementButton, "▽", "Filter"],
    [chrome.visualHeader.showDrillRoleSelector, "▾", "Drill on"],
    [chrome.visualHeader.showDrillUpButton, "↑", "Drill up"],
    [chrome.visualHeader.showDrillDownExpandButton, "↓", "Expand to next level"],
    [chrome.visualHeader.showDrillDownLevelButton, "⇊", "Show next level"],
    [chrome.visualHeader.showDrillToggleButton, "⤓", "Drill down"],
    [chrome.visualHeader.showPersonalizeVisualButton, "✎", "Personalize"],
    [chrome.visualHeader.showSeeDataLayoutToggleButton, "▦", "See data"],
    [chrome.visualHeader.showSmartNarrativeButton, "✦", "Smart narrative"],
    [chrome.visualHeader.showCopilotSummaryButton, "✨", "Copilot summary"],
    [chrome.visualHeader.showSetAlertButton, "◔", "Set alert"],
    [chrome.visualHeader.showFollowVisualButton, "★", "Follow"],
    [chrome.visualHeader.showPinButton, "⊙", "Pin"],
    [chrome.visualHeader.showFocusModeButton, "⤢", "Focus mode"],
    [chrome.visualHeader.showCopyVisualImageButton, "⧉", "Copy"],
    [chrome.visualHeader.showCommentButton, "☰", "Comment"],
    [chrome.visualHeader.showTooltipButton, "ⓘ", "Tooltip"],
    [chrome.visualHeader.showOptionsMenu, "⋯", "More options"],
  ];

  // A sample tooltip, drawn only on the hero tile — 35 tooltip properties
  // are otherwise unobservable, but repeating this on every thumbnail
  // would bury the visuals themselves.
  const tooltip = chrome.visualTooltip;
  const tooltipIsReportPage = String(tooltip.type) === "Canvas";
  const tooltipNode = variant === "hero" && tooltip.show && (
    <span
      className="preview-tooltip"
      style={{
        backgroundColor: hexWithAlpha(tooltip.themedBackground || tooltip.background, tooltip.transparency),
        fontFamily: tooltip.fontFamily || undefined,
        fontSize: tooltip.fontSize,
        fontWeight: tooltip.bold ? 700 : 400,
        fontStyle: tooltip.italic ? "italic" : "normal",
        textDecoration: tooltip.underline ? "underline" : "none",
      }}
    >
      {tooltipIsReportPage ? (
        <span className="preview-tooltip__page" style={{ color: tooltip.themedTitleFontColor || tooltip.titleFontColor }}>
          Report page tooltip{tooltip.section ? `: ${tooltip.section}` : ""}
        </span>
      ) : tooltip.showSentenceFormat && tooltip.sentenceTemplate ? (
        <span style={{ color: tooltip.themedValueFontColor || tooltip.valueFontColor }}>{tooltip.sentenceTemplate}</span>
      ) : (
        <>
          <span className="preview-tooltip__row">
            <span style={{ color: tooltip.themedTitleFontColor || tooltip.titleFontColor }}>London</span>
            <span
              style={{
                color: tooltip.themedValueFontColor || tooltip.valueFontColor,
                fontWeight: tooltip.showValuesInBold ? 700 : undefined,
              }}
            >
              2,480
            </span>
          </span>
          {!tooltip.showTooltipFieldsOnly && tooltip.showChartSpecificTooltips && (
            <span className="preview-tooltip__row">
              <span style={{ color: tooltip.themedTitleFontColor || tooltip.titleFontColor }}>Share</span>
              <span
                style={{
                  color: tooltip.themedValueFontColor || tooltip.valueFontColor,
                  fontWeight: tooltip.showValuesInBold ? 700 : undefined,
                }}
              >
                34%
              </span>
            </span>
          )}
          {tooltip.showActionsInTooltips && (
            <span className="preview-tooltip__action" style={{ color: tooltip.actionFontColor }}>
              ⤓ Drill through
            </span>
          )}
        </>
      )}
    </span>
  );

  // The visual header's own tooltip — shown next to the header when its
  // icon is enabled, so visualHeaderTooltip's 13 properties are visible.
  const headerTooltip = chrome.visualHeaderTooltip;
  const headerTooltipNode = variant === "hero" && chrome.visualHeader.show && chrome.visualHeader.showTooltipButton && (
    <span
      className="preview-header-tooltip"
      style={{
        backgroundColor: hexWithAlpha(headerTooltip.themedBackground || headerTooltip.background, headerTooltip.transparency),
        color: headerTooltip.themedTitleFontColor || headerTooltip.titleFontColor,
        fontFamily: headerTooltip.fontFamily || undefined,
        fontSize: headerTooltip.fontSize,
        fontWeight: headerTooltip.bold ? 700 : 400,
        fontStyle: headerTooltip.italic ? "italic" : "normal",
        textDecoration: headerTooltip.underline ? "underline" : "none",
      }}
    >
      {String(headerTooltip.type) === "Canvas"
        ? `Report page tooltip${headerTooltip.section ? `: ${headerTooltip.section}` : ""}`
        : String(headerTooltip.text) || "Header tooltip text"}
    </span>
  );

  // Not a <button>: several previews put their own controls inside the
  // tile (the slicer's mode toggle and expandable dropdown), and nesting
  // interactive elements inside a button is invalid HTML — React warns
  // about it and screen readers handle it badly. A div with button
  // semantics keeps the whole tile clickable while letting those controls
  // work properly.
  const tile = (
    <div
      role="button"
      tabIndex={0}
      className={`visual-tile visual-tile--${variant}${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(id);
      }}
      aria-pressed={selected}
      aria-label={chrome.general.altText || `Edit ${label} properties`}
    >
      <span className="visual-tile__label">
        <span>{label}</span>
        <span className="visual-tile__action">{selected ? "Editing" : "Select"}</span>
      </span>
      <span className="visual-frame" style={frameStyle}>
        {chrome.visualHeader.show && (
          <span
            className="visual-header"
            style={{
              backgroundColor: hexWithAlpha(chrome.visualHeader.background, chrome.visualHeader.transparency),
              borderBottom: `1px solid ${chrome.visualHeader.border}`,
              color: chrome.visualHeader.foreground,
            }}
          >
            {headerIcons
              .filter(([visible]) => visible)
              .map(([, glyph, name]) => (
                <span className="visual-header__icon" key={name} title={name} aria-hidden="true">
                  {glyph}
                </span>
              ))}
            {headerTooltipNode}
          </span>
        )}
        {chrome.title.show && (
          <span
            className="preview-title"
            {...headingAria(chrome.title.heading)}
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
              marginBottom: spacing?.spaceBelowTitle || undefined,
            }}
          >
            {titleText}
          </span>
        )}
        {chrome.subTitle.show && chrome.subTitle.text && (
          <span
            className="preview-subtitle"
            {...headingAria(chrome.subTitle.heading)}
            style={{
              textAlign: chrome.subTitle.alignment as CSSProperties["textAlign"],
              color: chrome.subTitle.fontColor,
              fontFamily: chrome.subTitle.fontFamily,
              fontSize: chrome.subTitle.fontSize,
              fontWeight: chrome.subTitle.bold ? 700 : 400,
              fontStyle: chrome.subTitle.italic ? "italic" : "normal",
              textDecoration: chrome.subTitle.underline ? "underline" : "none",
              whiteSpace: chrome.subTitle.titleWrap ? "normal" : "nowrap",
              overflow: "hidden",
              textOverflow: chrome.subTitle.titleWrap ? "clip" : "ellipsis",
              marginTop: spacing?.spaceAboveSubtitle || undefined,
              marginBottom: spacing?.spaceBelowSubTitle || undefined,
            }}
          >
            {chrome.subTitle.text}
          </span>
        )}
        {chrome.divider.show && (
          <span
            className="preview-divider"
            style={{
              marginTop: spacing?.spaceAboveDivider || undefined,
              borderTopColor: chrome.divider.color,
              borderTopWidth: chrome.divider.width,
              borderTopStyle: mapLineStyle(chrome.divider.style),
              // "Ignore padding" lets the divider run the full width of the
              // visual instead of stopping inside its padding.
              marginLeft: chrome.divider.ignorePadding ? -(chrome.padding.left || 0) : undefined,
              marginRight: chrome.divider.ignorePadding ? -(chrome.padding.right || 0) : undefined,
            }}
          />
        )}
        <span
          className="preview-body"
          style={{
            marginTop: spacing?.spaceBelowTitleArea || spacing?.spaceAbovePlotArea || undefined,
          }}
        >
          {children}
        </span>
        {/* An action turns the whole visual into a button, so show what it
            does and the tooltip that explains it. */}
        {chrome.visualLink.show && (
          <span className="preview-link" title={String(chrome.visualLink.tooltip) || undefined}>
            <span className="preview-link__type">{visualLinkLabel(chrome.visualLink)}</span>
            {(String(chrome.visualLink.tooltip) ||
              (chrome.visualLink.showDefaultTooltip && !chrome.visualLink.suppressDefaultTooltip
                ? String(chrome.visualLink.tooltipPlaceholderText) || String(chrome.visualLink.enabledTooltip)
                : "")) && (
              <span className="preview-link__tooltip">
                {String(chrome.visualLink.tooltip) ||
                  String(chrome.visualLink.tooltipPlaceholderText) ||
                  String(chrome.visualLink.enabledTooltip)}
              </span>
            )}
          </span>
        )}
      </span>
    </div>
  );

  if (variant !== "hero") return tile;

  // Real Power BI draws a hover tooltip floating over/beside the visual,
  // not squeezed into its own box — and here it can't be squeezed in
  // anyway: the hero tile is rendered at a fixed pre-scale size, so
  // appending the tooltip inside it (as this used to do) pushed the
  // content past the reserved height and got clipped by the scale
  // wrap's overflow:hidden, right at the tile's rounded corner. Rendering
  // it as a sibling below the (still-clipped) scaled tile avoids both
  // problems at once.
  return (
    <span className="visual-hero-wrap">
      <span className="visual-hero-scale-wrap">
        <span className="visual-hero-scale">{tile}</span>
      </span>
      {tooltipNode}
    </span>
  );
}

export function VisualGallery({
  theme,
  rawTheme,
  tableStyle,
  barChartStyle,
  columnChartStyle,
  stackedBarChartStyle,
  stackedColumnChartStyle,
  lineChartStyle,
  cardStyle,
  slicerStyle,
  matrixStyle,
  pieChartStyle,
  shapeStyle,
  actionButtonStyle,
  bookmarkNavigatorStyle,
  pageNavigatorStyle,
  textboxStyle,
  imageStyle,
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
  const [slicerLayout, setSlicerLayout] = useState<SlicerLayout>("list");
  // The dropdown's item styling is only visible while it's open, so the
  // preview lets you expand it rather than showing a permanently
  // collapsed control whose colours you can't judge.
  const [slicerDropdownOpen, setSlicerDropdownOpen] = useState(false);

  // Shared sample data, so every cartesian chart plots the same figures
  // and axis ticks line up with the bars they describe.
  const barCategories: Array<[string, number]> = [
    ["London", 82],
    ["North West", 66],
    ["Scotland", 51],
    ["Wales", 38],
  ];
  // London (82) is the dataset's max and matches every value-axis's
  // dataMax={82_000} — so its bar/column must reach exactly 100%, not
  // 82%. Every fill/error-bar position below scales against this rather
  // than treating the raw value as a literal percentage.
  const barCategoriesMax = Math.max(...barCategories.map(([, value]) => value));
  const barPercent = (value: number): number => (value / barCategoriesMax) * 100;

  // Series shown in every cartesian chart's legend. Clustered charts show
  // one series; the stacked variants show the two they actually draw.
  const singleSeries = [{ label: "Applications", color: barChartStyle.dataPoint.fill }];

  const legendNode = <ChartLegend legend={barChartStyle.legend} items={singleSeries} />;
  const legendAtBottom = legendIsAfterPlot(barChartStyle.legend.position);
  const legendVertical = legendIsVertical(barChartStyle.legend.position);

  const cardContent = (
    <span className="card-preview">
      <span
        className="card-preview__value"
        style={{
          fontSize: cardStyle.labels.fontSize,
          color: cardStyle.labels.color,
          fontFamily: cardStyle.labels.fontFamily || undefined,
          fontWeight: cardStyle.labels.bold ? 700 : 400,
          fontStyle: cardStyle.labels.italic ? "italic" : "normal",
          textDecoration: cardStyle.labels.underline ? "underline" : "none",
          whiteSpace: cardStyle.labels.preserveWhitespace ? "pre-wrap" : undefined,
        }}
      >
        {formatCardValue(8_400_000, cardStyle.labels.labelDisplayUnits, cardStyle.labels.labelPrecision, cardStyle.general.formatString)}
      </span>
      {cardStyle.categoryLabels.show && (
        <span
          className="card-preview__category"
          style={{
            fontSize: cardStyle.categoryLabels.fontSize,
            color: cardStyle.categoryLabels.color,
            fontFamily: cardStyle.categoryLabels.fontFamily || undefined,
            fontWeight: cardStyle.categoryLabels.bold ? 700 : 400,
            fontStyle: cardStyle.categoryLabels.italic ? "italic" : "normal",
            textDecoration: cardStyle.categoryLabels.underline ? "underline" : "none",
            whiteSpace: cardStyle.categoryLabels.preserveWhitespace
              ? "pre-wrap"
              : cardStyle.wordWrap.show
                ? "normal"
                : "nowrap",
            // "Space between label and value" is a shared chrome property
            // rather than a Card one, but the Card is where it applies —
            // the category label sits below the value, so the gap is
            // this label's top margin.
            marginTop: chromeStyles.card.spacing.customizeSpacing
              ? chromeStyles.card.spacing.verticalSpacing
              : undefined,
          }}
        >
          Applications approved
        </span>
      )}
    </span>
  );

  const barContent = (
    <span
      className={`chart-preview${legendVertical ? " chart-preview--legend-side" : ""}${legendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - barChartStyle.plotArea.transparency / 100 }}
    >
      {!legendAtBottom && legendNode}
      <span className="chart-preview__body">
        {/* Power BI draws a horizontal bar chart's category axis title
            rotated along the left edge, beside the category labels — not
            as a horizontal banner above the plot. */}
        {barChartStyle.categoryAxis.showAxisTitle && (
          <span className="chart-preview__axis-title chart-preview__axis-title--rotated" style={axisTitleStyle(barChartStyle.categoryAxis)}>
            {String(barChartStyle.categoryAxis.titleText) || "Region"}
          </span>
        )}
        <span className="chart-preview__body-main">
          <span className="chart-preview__plot" style={{ position: "relative" }}>
            <Gridlines axis={barChartStyle.valueAxis} orientation="vertical" inset={BAR_VALUE_AXIS_INSET} />
            <ZoomSliders zoom={barChartStyle.zoom} categoryOrientation="vertical" valueOrientation="horizontal" />
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
            {barCategories.map(([label, value], index) => (
              <span className="bar-row" key={label}>
                {barChartStyle.categoryAxis.show && (
                  <span className="bar-row__label" style={textStyle(barChartStyle.categoryAxis)}>
                    {label}
                  </span>
                )}
                <span className="bar-row__track-wrap">
                  <span className="bar-row__track">
                    <span
                      className="bar-row__fill"
                      style={{
                        width: `${barPercent(value)}%`,
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
                  </span>
                  {index === 0 && barChartStyle.error.enabled && barChartStyle.error.barShow && (
                    <span
                      className="bar-row__error"
                      aria-hidden="true"
                      title="Error bars are enabled — representative indicator, not a data-fit range"
                      style={{ left: `${barPercent(value)}%` }}
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
                {labelVisibleAt(index, barCategories.length, barChartStyle.labels.labelDensity) && (
                  <span className={`bar-row__value${labelIsInside(barChartStyle.labels.labelPosition) ? " bar-row__value--inside" : ""}`}>
                    <DataLabel labels={barChartStyle.labels} category={label} value={value * 1000} detail={value * 12} />
                  </span>
                )}
              </span>
            ))}
          </span>
          <AxisTickLabels axis={barChartStyle.valueAxis} dataMax={82_000} orientation="horizontal" inset={BAR_VALUE_AXIS_INSET} />
          {barChartStyle.valueAxis.showAxisTitle && (
            <span className="chart-preview__axis-title chart-preview__axis-title--value" style={axisTitleStyle(barChartStyle.valueAxis)}>
              {String(barChartStyle.valueAxis.titleText) || "Applications"}
            </span>
          )}
        </span>
      </span>
      {legendAtBottom && legendNode}
    </span>
  );

  const stackedSegmentColor = palette[1] ?? palette[0];
  const stackedSegmentShare = 62; // fixed split — this app models one series' color, not per-series stacking

  // Stacked charts genuinely draw two series, so their legend lists both.
  const stackedBarSeries = [
    { label: "Approved", color: stackedBarChartStyle.dataPoint.fill },
    { label: "In review", color: stackedSegmentColor },
  ];
  const stackedBarLegendNode = <ChartLegend legend={stackedBarChartStyle.legend} items={stackedBarSeries} />;
  const stackedBarLegendAtBottom = legendIsAfterPlot(stackedBarChartStyle.legend.position);
  const stackedBarLegendVertical = legendIsVertical(stackedBarChartStyle.legend.position);

  const stackedBarContent = (
    <span
      className={`chart-preview${stackedBarLegendVertical ? " chart-preview--legend-side" : ""}${stackedBarLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - stackedBarChartStyle.plotArea.transparency / 100 }}
    >
      {!stackedBarLegendAtBottom && stackedBarLegendNode}
      <span className="chart-preview__body">
        {stackedBarChartStyle.categoryAxis.showAxisTitle && (
          <span className="chart-preview__axis-title chart-preview__axis-title--rotated" style={axisTitleStyle(stackedBarChartStyle.categoryAxis)}>
            {String(stackedBarChartStyle.categoryAxis.titleText) || "Region"}
          </span>
        )}
        <span className="chart-preview__body-main">
          <span className="chart-preview__plot" style={{ position: "relative" }}>
            <Gridlines axis={stackedBarChartStyle.valueAxis} orientation="vertical" inset={BAR_VALUE_AXIS_INSET} />
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
            {barCategories.map(([label, value], index) => (
              <span className="bar-row" key={label}>
                {stackedBarChartStyle.categoryAxis.show && (
                  <span className="bar-row__label" style={textStyle(stackedBarChartStyle.categoryAxis)}>
                    {label}
                  </span>
                )}
                <span className="bar-row__track-wrap">
                  <span className="bar-row__track">
                    <span
                      className="bar-row__fill"
                      style={{
                        width: `${barPercent(value)}%`,
                        height: barThickness(stackedBarChartStyle.layout.stackedGapSize),
                        opacity: 1 - stackedBarChartStyle.dataPoint.fillTransparency / 100,
                        background: `linear-gradient(to right, ${stackedBarChartStyle.dataPoint.fill} 0%, ${stackedBarChartStyle.dataPoint.fill} ${stackedSegmentShare}%, ${stackedSegmentColor} ${stackedSegmentShare}%, ${stackedSegmentColor} 100%)`,
                        border: stackedBarChartStyle.dataPoint.borderShow
                          ? `${stackedBarChartStyle.dataPoint.borderSize}px solid ${stackedBarChartStyle.dataPoint.borderColor}`
                          : undefined,
                      }}
                    />
                  </span>
                  {index === 0 && stackedBarChartStyle.error.enabled && stackedBarChartStyle.error.barShow && (
                    <span
                      className="bar-row__error"
                      aria-hidden="true"
                      title="Error bars are enabled — representative indicator, not a data-fit range"
                      style={{ left: `${barPercent(value)}%` }}
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
                </span>
                {stackedBarChartStyle.totals.show && (
                  <span className="bar-row__value" style={dataLabelStyle(stackedBarChartStyle.totals)}>
                    {formatValue(value * 1000, stackedBarChartStyle.totals.labelDisplayUnits, stackedBarChartStyle.totals.labelPrecision)}
                  </span>
                )}
              </span>
            ))}
          </span>
          <AxisTickLabels axis={stackedBarChartStyle.valueAxis} dataMax={82_000} orientation="horizontal" inset={BAR_VALUE_AXIS_INSET} />
          {stackedBarChartStyle.valueAxis.showAxisTitle && (
            <span className="chart-preview__axis-title chart-preview__axis-title--value" style={axisTitleStyle(stackedBarChartStyle.valueAxis)}>
              {String(stackedBarChartStyle.valueAxis.titleText) || "Applications"}
            </span>
          )}
        </span>
      </span>
      {stackedBarLegendAtBottom && stackedBarLegendNode}
    </span>
  );

  const columnLegendNode = (
    <ChartLegend legend={columnChartStyle.legend} items={[{ label: "Applications", color: columnChartStyle.dataPoint.fill }]} />
  );
  const columnLegendAtBottom = legendIsAfterPlot(columnChartStyle.legend.position);
  const columnLegendVertical = legendIsVertical(columnChartStyle.legend.position);

  const columnContent = (
    <span
      className={`chart-preview${columnLegendVertical ? " chart-preview--legend-side" : ""}${columnLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - columnChartStyle.plotArea.transparency / 100 }}
    >
      {!columnLegendAtBottom && columnLegendNode}
      {columnChartStyle.valueAxis.showAxisTitle && (
        <span className="chart-preview__axis-title chart-preview__axis-title--value" style={axisTitleStyle(columnChartStyle.valueAxis)}>
          {String(columnChartStyle.valueAxis.titleText) || "Applications"}
        </span>
      )}
      <span className="column-preview__plot" style={{ position: "relative" }}>
        <Gridlines axis={columnChartStyle.valueAxis} orientation="horizontal" />
        <AxisTickLabels axis={columnChartStyle.valueAxis} dataMax={82_000} orientation="vertical" />
        <ZoomSliders zoom={columnChartStyle.zoom} categoryOrientation="horizontal" valueOrientation="vertical" />
        {columnChartStyle.referenceLine.show && (
          <span
            className="column-preview__reference-line"
            aria-hidden="true"
            style={{
              top: "22%",
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
        <span className="column-preview__columns">
          {barCategories.map(([label, value], index) => (
            <span className="column-item" key={label}>
              {labelVisibleAt(index, barCategories.length, columnChartStyle.labels.labelDensity) && (
                <span className="column-item__value">
                  <DataLabel labels={columnChartStyle.labels} category={label} value={value * 1000} detail={value * 12} />
                </span>
              )}
              <span className="column-item__track-wrap">
                <span className="column-item__track">
                  <span
                    className="column-item__fill"
                    style={{
                      height: `${barPercent(value)}%`,
                      width: barThickness(columnChartStyle.layout.clusteredGapSize),
                      backgroundColor: hexWithAlpha(columnChartStyle.dataPoint.fill, columnChartStyle.dataPoint.fillTransparency),
                      border: columnChartStyle.dataPoint.borderShow
                        ? `${columnChartStyle.dataPoint.borderSize}px solid ${columnChartStyle.dataPoint.borderColor}`
                        : undefined,
                    }}
                  />
                </span>
                {index === 0 && columnChartStyle.error.enabled && columnChartStyle.error.barShow && (
                  <span
                    className="column-item__error"
                    aria-hidden="true"
                    title="Error bars are enabled — representative indicator, not a data-fit range"
                    style={{ bottom: `${barPercent(value)}%` }}
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
              {columnChartStyle.categoryAxis.show && (
                <span className="column-item__label" style={textStyle(columnChartStyle.categoryAxis)}>
                  {label}
                </span>
              )}
            </span>
          ))}
        </span>
      </span>
      {columnChartStyle.categoryAxis.showAxisTitle && (
        <span className="chart-preview__axis-title" style={axisTitleStyle(columnChartStyle.categoryAxis)}>
          {String(columnChartStyle.categoryAxis.titleText) || "Region"}
        </span>
      )}
      {columnLegendAtBottom && columnLegendNode}
    </span>
  );

  const stackedColumnLegendNode = (
    <ChartLegend
      legend={stackedColumnChartStyle.legend}
      items={[
        { label: "Approved", color: stackedColumnChartStyle.dataPoint.fill },
        { label: "In review", color: stackedSegmentColor },
      ]}
    />
  );
  const stackedColumnLegendAtBottom = legendIsAfterPlot(stackedColumnChartStyle.legend.position);
  const stackedColumnLegendVertical = legendIsVertical(stackedColumnChartStyle.legend.position);

  const stackedColumnContent = (
    <span
      className={`chart-preview${stackedColumnLegendVertical ? " chart-preview--legend-side" : ""}${stackedColumnLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - stackedColumnChartStyle.plotArea.transparency / 100 }}
    >
      {!stackedColumnLegendAtBottom && stackedColumnLegendNode}
      {stackedColumnChartStyle.valueAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title chart-preview__axis-title--value"
          style={axisTitleStyle(stackedColumnChartStyle.valueAxis)}
        >
          {String(stackedColumnChartStyle.valueAxis.titleText) || "Applications"}
        </span>
      )}
      <span className="column-preview__plot" style={{ position: "relative" }}>
        <Gridlines axis={stackedColumnChartStyle.valueAxis} orientation="horizontal" />
        <AxisTickLabels axis={stackedColumnChartStyle.valueAxis} dataMax={82_000} orientation="vertical" />
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
        <span className="column-preview__columns">
          {barCategories.map(([label, value], index) => (
            <span className="column-item" key={label}>
              {stackedColumnChartStyle.totals.show && (
                <span
                  className="column-item__value"
                  style={{
                    ...dataLabelStyle(stackedColumnChartStyle.totals),
                    backgroundColor: stackedColumnChartStyle.totals.enableBackground
                      ? hexWithAlpha(stackedColumnChartStyle.totals.backgroundColor, stackedColumnChartStyle.totals.backgroundTransparency)
                      : undefined,
                    padding: stackedColumnChartStyle.totals.enableBackground ? "1px 4px" : undefined,
                    borderRadius: stackedColumnChartStyle.totals.enableBackground ? 3 : undefined,
                  }}
                >
                  {formatValue(
                    value * 1000,
                    stackedColumnChartStyle.totals.labelDisplayUnits,
                    stackedColumnChartStyle.totals.labelPrecision,
                  )}
                </span>
              )}
              <span className="column-item__track-wrap">
                <span className="column-item__track">
                  <span
                    className="column-item__fill"
                    style={{
                      height: `${barPercent(value)}%`,
                      width: barThickness(stackedColumnChartStyle.layout.stackedGapSize),
                      opacity: 1 - stackedColumnChartStyle.dataPoint.fillTransparency / 100,
                      background: `linear-gradient(to top, ${stackedColumnChartStyle.dataPoint.fill} 0%, ${stackedColumnChartStyle.dataPoint.fill} ${stackedSegmentShare}%, ${stackedSegmentColor} ${stackedSegmentShare}%, ${stackedSegmentColor} 100%)`,
                      border: stackedColumnChartStyle.dataPoint.borderShow
                        ? `${stackedColumnChartStyle.dataPoint.borderSize}px solid ${stackedColumnChartStyle.dataPoint.borderColor}`
                        : undefined,
                    }}
                  />
                </span>
                {index === 0 && stackedColumnChartStyle.error.enabled && stackedColumnChartStyle.error.barShow && (
                  <span
                    className="column-item__error"
                    aria-hidden="true"
                    title="Error bars are enabled — representative indicator, not a data-fit range"
                    style={{ bottom: `${barPercent(value)}%` }}
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
              {stackedColumnChartStyle.categoryAxis.show && (
                <span className="column-item__label" style={textStyle(stackedColumnChartStyle.categoryAxis)}>
                  {label}
                </span>
              )}
            </span>
          ))}
        </span>
      </span>
      {stackedColumnChartStyle.categoryAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title"
          style={{
            color: stackedColumnChartStyle.categoryAxis.titleColor,
            fontFamily: stackedColumnChartStyle.categoryAxis.titleFontFamily,
            fontSize: stackedColumnChartStyle.categoryAxis.titleFontSize,
            fontWeight: stackedColumnChartStyle.categoryAxis.titleBold ? 700 : 400,
            fontStyle: stackedColumnChartStyle.categoryAxis.titleItalic ? "italic" : "normal",
            textDecoration: stackedColumnChartStyle.categoryAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(stackedColumnChartStyle.categoryAxis.titleText) || "Region"}
        </span>
      )}
      {stackedColumnLegendAtBottom && stackedColumnLegendNode}
    </span>
  );

  const lineLegendNode = (
    <ChartLegend legend={lineChartStyle.legend} items={[{ label: "Applications", color: lineChartStyle.dataPoint.fill }]} />
  );
  const lineLegendAtBottom = legendIsAfterPlot(lineChartStyle.legend.position);
  const lineLegendVertical = legendIsVertical(lineChartStyle.legend.position);
  const linePointValues = [42, 58, 30, 68, 48];
  const linePointCoords = linePointValues.map((value, index) => ({
    x: (index / (linePointValues.length - 1)) * 100,
    y: 100 - value,
  }));
  const lineStyles = lineChartStyle.lineStyles;
  // `lineChartType` is the interpolation mode (linear/smooth/step);
  // `interpolationSmooth`/`interpolationStep` name *which* algorithm to
  // use within a mode ("monotoneX", "before"), so they are not on/off
  // switches and must not be read as such.
  const lineInterpolation = String(lineStyles.lineChartType).toLowerCase();
  const linePathD = linePath(linePointCoords, {
    smooth: lineInterpolation === "smooth",
    step: lineInterpolation === "step",
    // For a stepped line, the step's alignment comes from the step
    // algorithm ("before"/"after"/"center") rather than segmentAlignment,
    // which positions segment labels.
    stepAlignment: lineStyles.interpolationStep,
  });
  const lineDashStyle = mapLineStyle(lineStyles.lineStyle);
  const lineAreaColor = lineStyles.areaMatchStrokeColor ? lineChartStyle.dataPoint.fill : lineStyles.areaColor;
  // lineChartType decides whether the series is drawn as a plain line or
  // filled down to the baseline as an area/stacked area.
  // lineChartType only selects interpolation, so the area fill is driven
  // by its own areaShow toggle.
  const lineIsArea = lineStyles.areaShow;
  const lineStrokeColor = lineStyles.strokeColor || lineChartStyle.dataPoint.fill;
  const lineMarkerColor = lineStyles.markerColor || lineChartStyle.dataPoint.fill;
  const lineShowMarkers = lineStyles.showMarker || lineStyles.showMarkerByDefault;
  const lineMarker = markerShape(String(lineStyles.markerShape), lineStyles.markerSize || 5);

  /**
   * Constant lines: the schema gives a line chart three of them
   * (referenceLine, xAxisReferenceLine, y1AxisReferenceLine) with the
   * same shape — a line, an optional shaded region on one side of it, and
   * an optional data label. Rendering them from one helper keeps all
   * three consistent instead of only the first being drawn.
   */
  const constantLine = (
    // Structural, not one group's type: the three constant-line groups
    // are identical except that `value` is a string in some and a number
    // in others, so a cast between them isn't valid.
    line: ConstantLineStyle,
    orientation: "vertical" | "horizontal",
    offsetPercent: number,
    key: string,
  ) => {
    if (!line.show) return null;
    const stroke = mapLineStyle(line.style);
    const shade = line.shadeShow && (
      <span
        className="chart-preview__constant-shade"
        key={`${key}-shade`}
        aria-hidden="true"
        style={{
          backgroundColor: hexWithAlpha(line.shadeColorMatchStroke ? line.lineColor : line.shadeColor, line.shadeTransparency),
          // shadeRegion picks which side of the line is filled.
          ...(orientation === "vertical"
            ? String(line.shadeRegion).toLowerCase() === "before"
              ? { left: 0, width: `${offsetPercent}%`, top: 0, bottom: 0 }
              : { left: `${offsetPercent}%`, right: 0, top: 0, bottom: 0 }
            : String(line.shadeRegion).toLowerCase() === "before"
              ? { bottom: 0, height: `${offsetPercent}%`, left: 0, right: 0 }
              : { bottom: `${offsetPercent}%`, top: 0, left: 0, right: 0 }),
        }}
      />
    );

    return (
      <Fragment key={key}>
        {shade}
        <span
          className={`chart-preview__constant chart-preview__constant--${orientation}`}
          aria-hidden="true"
          style={{
            ...(orientation === "vertical"
              ? {
                  left: `${offsetPercent}%`,
                  borderLeftWidth: line.width,
                  borderLeftColor: line.lineColor,
                  borderLeftStyle: stroke,
                }
              : {
                  bottom: `${offsetPercent}%`,
                  borderTopWidth: line.width,
                  borderTopColor: line.lineColor,
                  borderTopStyle: stroke,
                }),
            opacity: 1 - line.transparency / 100,
          }}
        />
        {line.dataLabelShow && (
          <span
            className="chart-preview__constant-label"
            style={{
              color: line.dataLabelColor,
              ...(orientation === "vertical"
                ? { left: `${offsetPercent}%`, top: String(line.dataLabelVerticalPosition).toLowerCase() === "under" ? "auto" : 2, bottom: String(line.dataLabelVerticalPosition).toLowerCase() === "under" ? 2 : "auto" }
                : { bottom: `${offsetPercent}%`, left: String(line.dataLabelHorizontalPosition).toLowerCase() === "left" ? 2 : "auto", right: String(line.dataLabelHorizontalPosition).toLowerCase() === "left" ? "auto" : 2 }),
            }}
          >
            {String(line.dataLabelText) ||
              String(line.displayName) ||
              formatValue(Number(line.value) || 50, line.dataLabelDisplayUnits, line.dataLabelDecimalPoints)}
          </span>
        )}
      </Fragment>
    );
  };

  // Secondary value axis, drawn on the right. Its fields all carry a
  // `sec` prefix in the schema, so it can't reuse the AxisStyle helpers.
  const y2 = lineChartStyle.y2Axis;
  const y2TextStyle: CSSProperties = {
    color: y2.secLabelColor,
    fontFamily: y2.secFontFamily || undefined,
    fontSize: y2.secFontSize,
    fontWeight: y2.secBold ? 700 : 400,
    fontStyle: y2.secItalic ? "italic" : "normal",
    textDecoration: y2.secUnderline ? "underline" : "none",
  };
  const y2Node = y2.show && (
    <span className="chart-ticks chart-ticks--secondary">
      {Array.from({ length: 5 }, (_, i) => {
        const start = Number(y2.secStart) || 0;
        const end = Number(y2.secEnd) > start ? Number(y2.secEnd) : 40_000;
        return (
          <span key={i} style={y2TextStyle}>
            {formatValue(start + ((end - start) * i) / 4, y2.secLabelDisplayUnits, y2.secLabelPrecision)}
          </span>
        );
      })}
    </span>
  );
  const y2TitleNode = y2.show && y2.secShowAxisTitle && (
    <span
      className="chart-preview__axis-title chart-preview__axis-title--secondary"
      style={{
        color: y2.secTitleColor,
        fontFamily: y2.secTitleFontFamily || undefined,
        fontSize: y2.secTitleFontSize,
        fontWeight: y2.secTitleBold ? 700 : 400,
        fontStyle: y2.secTitleItalic ? "italic" : "normal",
        textDecoration: y2.secTitleUnderline ? "underline" : "none",
      }}
    >
      {String(y2.secTitleText) || "Secondary"}
    </span>
  );

  // A series label sits at the end of its line, optionally with a leader
  // line back to the series and its own background chip.
  const sl = lineChartStyle.seriesLabels;
  const seriesLabelNode = sl.show && (
    <span
      className="line-preview__series-label"
      style={{
        top: `${linePointCoords[linePointCoords.length - 1].y}%`,
        color: hexWithAlpha(sl.seriesMatchColor ? lineChartStyle.dataPoint.fill : sl.seriesColor, sl.seriesTransparency),
        fontFamily: sl.seriesFontFamily || undefined,
        fontSize: sl.textSize,
        fontWeight: sl.bold ? 700 : 400,
        fontStyle: sl.italic ? "italic" : "normal",
        textDecoration: sl.underline ? "underline" : "none",
        maxWidth: sl.seriesMaximumWidth || undefined,
        whiteSpace: sl.seriesWordWrap ? "normal" : "nowrap",
        marginLeft: sl.maximumOffset || undefined,
        backgroundColor: sl.enableBackground
          ? hexWithAlpha(sl.backgroundMatchColor ? lineChartStyle.dataPoint.fill : sl.backgroundColor, sl.backgroundTransparency)
          : undefined,
        padding: sl.enableBackground ? "1px 4px" : undefined,
        borderRadius: sl.enableBackground ? 3 : undefined,
        // "Left" puts the label at the start of the line instead.
        ...(String(sl.seriesPosition).toLowerCase() === "left" ? { left: 0, right: "auto" } : {}),
      }}
    >
      {sl.leaderLines && (
        <span
          className="line-preview__leader"
          aria-hidden="true"
          style={{
            borderTopWidth: sl.leaderLineWidth,
            borderTopStyle: mapLineStyle(sl.leaderLinePattern),
            borderTopColor: hexWithAlpha(sl.leaderLineColor, sl.leaderLineTransparency),
          }}
        />
      )}
      Applications
    </span>
  );

  const lineSmallMultiples = lineChartStyle.smallMultiplesLayout;
  const lineSubheader = lineChartStyle.subheader;
  const zoomNodes = <ZoomSliders zoom={lineChartStyle.zoom} categoryOrientation="horizontal" valueOrientation="vertical" />;

  // Error bars can carry their own label and a shaded band around the
  // series — 20-odd properties with nothing to render against before.
  const err = lineChartStyle.error;
  const errorShade = err.enabled && err.shadeShow && (
    <polygon
      points={`${linePointCoords.map((p) => `${p.x},${p.y - 7}`).join(" ")} ${[...linePointCoords].reverse().map((p) => `${p.x},${p.y + 7}`).join(" ")}`}
      fill={hexWithAlpha(err.shadeMatchSeriesColor ? lineChartStyle.dataPoint.fill : err.shadeColor, err.shadeTransparency)}
      stroke="none"
    />
  );
  const errorLabel = err.enabled && err.labelShow && (
    <span
      className="line-preview__error-label"
      style={{
        left: `${linePointCoords[3].x}%`,
        top: `${linePointCoords[3].y}%`,
        color: err.labelMatchSeriesColor ? lineChartStyle.dataPoint.fill : err.labelColor,
        fontFamily: err.labelFontFamily || undefined,
        fontSize: err.labelFontSize,
        fontWeight: err.labelBold ? 700 : 400,
        fontStyle: err.labelItalic ? "italic" : "normal",
        textDecoration: err.labelUnderline ? "underline" : "none",
        backgroundColor: err.labelBackground
          ? hexWithAlpha(err.labelBackgroundColor, err.labelBackgroundTransparency)
          : undefined,
        padding: err.labelBackground ? "1px 3px" : undefined,
        borderRadius: err.labelBackground ? 3 : undefined,
      }}
    >
      ±6%
    </span>
  );

  const lineConstantLines = (
    <>
      {constantLine(lineChartStyle.referenceLine, "vertical", 70, "ref")}
      {constantLine(lineChartStyle.xAxisReferenceLine, "vertical", 45, "x")}
      {constantLine(lineChartStyle.y1AxisReferenceLine, "horizontal", 55, "y1")}
    </>
  );

  // Forecast continues the series past the last point, with an optional
  // confidence band around it.
  const forecast = lineChartStyle.forecast;
  const forecastNode = forecast.show && (
    <>
      {forecast.bandAreaShow && (
        <polygon
          points="72,28 100,8 100,52 72,40"
          fill={hexWithAlpha(forecast.bandAreaMatchColor ? forecast.lineColor : forecast.bandAreaColor, forecast.bandAreaTransparency)}
          stroke={forecast.bandLineShow ? hexWithAlpha(forecast.bandLineMatchColor ? forecast.lineColor : forecast.bandLineColor, forecast.bandLineTransparency) : "none"}
          strokeWidth={forecast.bandLineWidth}
          strokeDasharray={String(forecast.bandLineDashArray) || svgDashArray(mapLineStyle(forecast.bandLinePattern))}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d="M 72 34 L 100 30"
        fill="none"
        stroke={hexWithAlpha(forecast.lineColor, forecast.strokeTransparency)}
        strokeWidth={forecast.width}
        strokeDasharray={String(forecast.dashArray) || svgDashArray(mapLineStyle(forecast.style))}
        strokeLinecap={String(forecast.dashCap).toLowerCase() === "flat" ? "butt" : "round"}
        vectorEffect="non-scaling-stroke"
      />
    </>
  );

  // Anomaly detection highlights outlying points and can shade a
  // confidence band behind the whole series.
  const anomaly = lineChartStyle.anomalyDetection;
  const anomalyMarker = markerShape(String(anomaly.markerShape), anomaly.markerShapeSize || 7);
  const anomalyNode = anomaly.show && (
    <>
      {anomaly.confidenceBandShow && (
        <polygon
          points={`0,${linePointCoords[0].y - 9} ${linePointCoords.map((p) => `${p.x},${p.y - 9}`).join(" ")} 100,${
            linePointCoords[linePointCoords.length - 1].y + 9
          } ${[...linePointCoords].reverse().map((p) => `${p.x},${p.y + 9}`).join(" ")}`}
          fill={hexWithAlpha(anomaly.confidenceBandColor, anomaly.transparency)}
          stroke="none"
        />
      )}
      {anomaly.markerShow && (
        <circle
          cx={linePointCoords[2].x}
          cy={linePointCoords[2].y}
          r={anomalyMarker.kind === "circle" ? anomalyMarker.r : (anomaly.markerShapeSize || 7) / 2}
          fill={hexWithAlpha(anomaly.markerColor, anomaly.markerTransparency)}
          stroke={
            anomaly.markerBorderShow
              ? hexWithAlpha(
                  anomaly.markerBorderColorMatchFill ? anomaly.markerColor : anomaly.markerBorderColor,
                  anomaly.markerBorderTransparency,
                )
              : "none"
          }
          strokeWidth={anomaly.markerBorderWidth}
          transform={`rotate(${anomaly.markerRotation} ${linePointCoords[2].x} ${linePointCoords[2].y})`}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </>
  );

  // A small-multiples layout replaces the single plot with a grid of
  // repeated mini-charts, one per category.
  const lineUsesSmallMultiples = hasSmallMultiplesOverride(rawTheme, "lineChart");

  const lineContent = (
    <span
      className={`chart-preview${lineLegendVertical ? " chart-preview--legend-side" : ""}${lineLegendAtBottom ? " chart-preview--legend-after" : ""}`}
      style={{ opacity: 1 - lineChartStyle.plotArea.transparency / 100 }}
    >
      {!lineLegendAtBottom && lineLegendNode}
      {lineChartStyle.valueAxis.showAxisTitle && (
        <span className="chart-preview__axis-title" style={axisTitleStyle(lineChartStyle.valueAxis)}>
          {String(lineChartStyle.valueAxis.titleText) || "Applications"}
        </span>
      )}
      {y2TitleNode}
      <span className="line-preview__plot" style={{ position: "relative" }}>
        <Gridlines axis={lineChartStyle.categoryAxis} orientation="vertical" count={linePointValues.length - 1} />
        <Gridlines axis={lineChartStyle.valueAxis} orientation="horizontal" />
        <AxisTickLabels axis={lineChartStyle.valueAxis} dataMax={70_000} orientation="vertical" />
        {y2Node}
        {seriesLabelNode}
        {zoomNodes}
        {errorLabel}
        {lineConstantLines}
        <svg className="line-preview__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {anomalyNode}
          {errorShade}
          {lineIsArea && (
            <path
              d={areaPath(linePointCoords, linePathD)}
              fill={hexWithAlpha(lineAreaColor, lineStyles.segmentGradient ? 60 : 78)}
              stroke="none"
            />
          )}
          {lineStyles.strokeShow && (
            <path
              d={linePathD}
              fill="none"
              stroke={hexWithAlpha(lineStrokeColor, lineStyles.strokeTransparency)}
              strokeWidth={lineStyles.strokeWidth}
              // An explicit dash array wins over the named line style,
              // matching how Power BI treats the advanced setting.
              strokeDasharray={String(lineStyles.strokeDashArray) || svgDashArray(lineDashStyle)}
              strokeLinejoin={
                ["round", "bevel", "miter"].includes(String(lineStyles.strokeLineJoin).toLowerCase())
                  ? (String(lineStyles.strokeLineJoin).toLowerCase() as "round" | "bevel" | "miter")
                  : "round"
              }
              strokeLinecap={String(lineStyles.strokeDashCap).toLowerCase() === "flat" ? "butt" : "round"}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {lineShowMarkers &&
            linePointCoords.map((point, index) => {
              const markerFill = hexWithAlpha(lineMarkerColor, lineChartStyle.markers.transparency);
              const markerStroke = lineChartStyle.markers.borderShow
                ? hexWithAlpha(
                    lineChartStyle.markers.borderColorMatchFill ? lineMarkerColor : lineChartStyle.markers.borderColor,
                    lineChartStyle.markers.borderTransparency,
                  )
                : "none";
              const rotation = lineChartStyle.markers.rotation;
              const common = {
                fill: markerFill,
                stroke: markerStroke,
                strokeWidth: lineChartStyle.markers.borderWidth,
                vectorEffect: "non-scaling-stroke" as const,
              };
              if (lineMarker.kind === "circle") {
                return <circle key={index} cx={point.x} cy={point.y} r={lineMarker.r} {...common} />;
              }
              if (lineMarker.kind === "rect") {
                return (
                  <rect
                    key={index}
                    x={point.x - lineMarker.size / 2}
                    y={point.y - lineMarker.size / 2}
                    width={lineMarker.size}
                    height={lineMarker.size}
                    transform={`rotate(${lineMarker.rotate + rotation} ${point.x} ${point.y})`}
                    {...common}
                  />
                );
              }
              return (
                <polygon
                  key={index}
                  points={lineMarker.points}
                  transform={`translate(${point.x} ${point.y}) rotate(${rotation})`}
                  {...common}
                />
              );
            })}
          {lineChartStyle.error.enabled && lineChartStyle.error.barShow && (
            <line
              x1={linePointCoords[3].x}
              x2={linePointCoords[3].x}
              y1={linePointCoords[3].y - 12}
              y2={linePointCoords[3].y + 12}
              stroke={lineChartStyle.error.barColor}
              strokeWidth={lineChartStyle.error.barWidth}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {forecastNode}
        </svg>
        {lineChartStyle.trend.show && (
          <span
            className="chart-preview__trend-line"
            aria-hidden="true"
            style={{
              borderTopWidth: lineChartStyle.trend.width,
              borderTopColor: lineChartStyle.trend.lineColor,
              borderTopStyle: mapLineStyle(lineChartStyle.trend.style),
              opacity: 1 - lineChartStyle.trend.transparency / 100,
            }}
          />
        )}
        {/* One label per point, thinned by label density like Power BI. */}
        {linePointCoords.map((point, index) =>
          labelVisibleAt(index, linePointCoords.length, lineChartStyle.labels.labelDensity) ? (
            <span key={index} className="line-preview__label" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
              <DataLabel
                labels={lineChartStyle.labels}
                category={["Jan", "Feb", "Mar", "Apr", "May"][index] ?? ""}
                value={linePointValues[index] * 1000}
                detail={linePointValues[index] * 8}
              />
            </span>
          ) : null,
        )}
      </span>
      {lineChartStyle.categoryAxis.show && (
        <span className="line-preview__axis-labels">
          {["Jan", "Feb", "Mar", "Apr", "May"].map((label) => (
            <span key={label} style={textStyle(lineChartStyle.categoryAxis)}>
              {label}
            </span>
          ))}
        </span>
      )}
      {lineChartStyle.categoryAxis.showAxisTitle && (
        <span className="chart-preview__axis-title" style={axisTitleStyle(lineChartStyle.categoryAxis)}>
          {String(lineChartStyle.categoryAxis.titleText) || "Month"}
        </span>
      )}
      {lineLegendAtBottom && lineLegendNode}
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

  const matrixHeaderCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.columnHeaders.backColor,
    color: matrixStyle.columnHeaders.fontColor,
    fontFamily: matrixStyle.columnHeaders.fontFamily,
    fontSize: matrixStyle.columnHeaders.fontSize,
    fontWeight: matrixStyle.columnHeaders.bold ? 700 : 400,
    fontStyle: matrixStyle.columnHeaders.italic ? "italic" : "normal",
    textDecoration: matrixStyle.columnHeaders.underline ? "underline" : "none",
  };
  const matrixRowHeaderCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.rowHeaders.backColor,
    color: matrixStyle.rowHeaders.fontColor,
    fontFamily: matrixStyle.rowHeaders.fontFamily,
    fontSize: matrixStyle.rowHeaders.fontSize,
    fontWeight: matrixStyle.rowHeaders.bold ? 700 : 400,
    fontStyle: matrixStyle.rowHeaders.italic ? "italic" : "normal",
    textDecoration: matrixStyle.rowHeaders.underline ? "underline" : "none",
  };
  const matrixValueCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.values.backColor,
    color: matrixStyle.values.fontColor,
    fontFamily: matrixStyle.values.fontFamily,
    fontSize: matrixStyle.values.fontSize,
    fontWeight: matrixStyle.values.bold ? 700 : 400,
    fontStyle: matrixStyle.values.italic ? "italic" : "normal",
    textDecoration: matrixStyle.values.underline ? "underline" : "none",
  };
  const matrixColumnTotalCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.columnTotal.backColor,
    color: matrixStyle.columnTotal.fontColor,
    fontFamily: matrixStyle.columnTotal.fontFamily,
    fontSize: matrixStyle.columnTotal.fontSize,
    fontWeight: matrixStyle.columnTotal.bold ? 700 : 400,
    fontStyle: matrixStyle.columnTotal.italic ? "italic" : "normal",
    textDecoration: matrixStyle.columnTotal.underline ? "underline" : "none",
  };
  const matrixRowTotalCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.rowTotal.backColor,
    color: matrixStyle.rowTotal.fontColor,
    fontFamily: matrixStyle.rowTotal.fontFamily,
    fontSize: matrixStyle.rowTotal.fontSize,
    fontWeight: matrixStyle.rowTotal.bold ? 700 : 400,
    fontStyle: matrixStyle.rowTotal.italic ? "italic" : "normal",
    textDecoration: matrixStyle.rowTotal.underline ? "underline" : "none",
  };
  const matrixGrandTotalCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.total.backColor,
    color: matrixStyle.total.fontColor,
    fontFamily: matrixStyle.total.fontFamily,
    fontSize: matrixStyle.total.fontSize,
    fontWeight: matrixStyle.total.bold ? 700 : 400,
    fontStyle: matrixStyle.total.italic ? "italic" : "normal",
    textDecoration: matrixStyle.total.underline ? "underline" : "none",
  };
  const matrixGridBorder = (show: boolean, color: string, weight: number) =>
    show ? `${weight}px solid ${color}` : undefined;

  const matrixSubTotalCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.subTotals.backColor,
    color: matrixStyle.subTotals.fontColor,
    fontFamily: matrixStyle.subTotals.fontFamily,
    fontSize: matrixStyle.subTotals.fontSize,
    fontWeight: matrixStyle.subTotals.bold ? 700 : 400,
    fontStyle: matrixStyle.subTotals.italic ? "italic" : "normal",
    textDecoration: matrixStyle.subTotals.underline ? "underline" : "none",
  };

  // Column-level formatting targets one column in Power BI; the preview
  // applies it to the Q2 column so its effect is visible against Q1.
  const matrixColumnFormattingStyle: CSSProperties = {
    backgroundColor: matrixStyle.columnFormatting.backColor,
    color: matrixStyle.columnFormatting.fontColor,
    textAlign: mapTextAlign(matrixStyle.columnFormatting.alignment),
  };

  const matrixExpandToggle = (expanded: boolean) =>
    matrixStyle.rowHeaders.showExpandCollapseButtons && (
      <span
        className="matrix-preview__expand"
        aria-hidden="true"
        style={{
          color: matrixStyle.rowHeaders.expandCollapseButtonsColor,
          fontSize: matrixStyle.rowHeaders.expandCollapseButtonsSize,
        }}
      >
        {expanded ? "−" : "+"}
      </span>
    );

  /** A miniature sparkline cell, drawn as bars or a line per chartType. */
  const matrixSparkline = (values: number[]) => {
    const spark = matrixStyle.sparklines;
    const max = Math.max(...values);
    if (String(spark.chartType) === "Line") {
      const points = values
        .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 100}`)
        .join(" ");
      return (
        <svg className="matrix-preview__spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={points}
            fill="none"
            stroke={spark.dataColor}
            strokeWidth={spark.strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
          {spark.markers > 0 &&
            values.map((v, i) => (
              <circle
                key={i}
                cx={(i / (values.length - 1)) * 100}
                cy={100 - (v / max) * 100}
                r={spark.markerSize / 2}
                fill={spark.markerColor}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </svg>
      );
    }
    return (
      <span className="matrix-preview__spark matrix-preview__spark--bars" aria-hidden="true">
        {values.map((v, i) => (
          <span key={i} style={{ height: `${(v / max) * 100}%`, backgroundColor: spark.dataColor }} />
        ))}
      </span>
    );
  };

  // The sparklines group has no show/enable flag of its own — a sparkline
  // exists when the report author adds one — so the preview always shows
  // the column, which is what makes its styling adjustable.
  const matrixColumnCount = 5;

  // A parent row with children, so row-header indentation, expand toggles,
  // and subtotals all have a real hierarchy to act on.
  const matrixRows: Array<{ label: string; q1: number; q2: number; child: boolean; index: number }> = [
    { label: "London", q1: 82, q2: 91, child: false, index: 0 },
    { label: "Central", q1: 44, q2: 49, child: true, index: 1 },
    { label: "Manchester", q1: 66, q2: 74, child: false, index: 2 },
  ];

  const matrixContent = (
    <span
      className="matrix-preview"
      style={{
        border: `${matrixStyle.grid.outlineWeight}px solid ${matrixStyle.grid.outlineColor}`,
        fontSize: matrixStyle.grid.textSize,
      }}
    >
      <span className="matrix-preview__cell matrix-preview__cell--corner" style={matrixHeaderCellStyle} />
      {["Q1", "Q2"].map((label, columnIndex) => (
        <span
          key={label}
          className="matrix-preview__cell"
          style={{
            ...matrixHeaderCellStyle,
            // Column-level formatting optionally reaches the header too.
            ...(columnIndex === 1 && matrixStyle.columnFormatting.styleHeader ? matrixColumnFormattingStyle : {}),
            textAlign: mapTextAlign(matrixStyle.columnHeaders.titleAlignment),
            borderBottom: matrixGridBorder(matrixStyle.grid.gridHorizontal, matrixStyle.grid.gridHorizontalColor, matrixStyle.grid.gridHorizontalWeight),
            ...outlineFromBitmask(
              matrixStyle.columnHeaders.outlineStyle,
              matrixStyle.columnHeaders.outlineColor,
              matrixStyle.columnHeaders.outlineWeight,
            ),
          }}
        >
          {label}
        </span>
      ))}
      <span
        className="matrix-preview__cell"
        style={{
          ...matrixHeaderCellStyle,
          borderBottom: matrixGridBorder(matrixStyle.grid.gridHorizontal, matrixStyle.grid.gridHorizontalColor, matrixStyle.grid.gridHorizontalWeight),
        }}
      >
        Total
      </span>
      <span
        className="matrix-preview__cell"
        style={{
          ...matrixHeaderCellStyle,
          borderBottom: matrixGridBorder(matrixStyle.grid.gridHorizontal, matrixStyle.grid.gridHorizontalColor, matrixStyle.grid.gridHorizontalWeight),
        }}
      >
        Trend
      </span>

      {matrixRows.map((row) => (
        // Fragment, not a wrapping span — every cell must be a direct child
        // of .matrix-preview for CSS grid column alignment to work.
        <Fragment key={row.label}>
          <span
            className="matrix-preview__cell"
            style={{
              ...matrixRowHeaderCellStyle,
              // Child rows indent under their parent; stepped layout is
              // what makes the hierarchy legible.
              paddingLeft: row.child && matrixStyle.rowHeaders.stepped ? matrixStyle.rowHeaders.steppedLayoutIndentation : undefined,
              textAlign: mapTextAlign(matrixStyle.rowHeaders.alignment),
              whiteSpace: matrixStyle.rowHeaders.wordWrap ? "normal" : "nowrap",
              borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight),
              ...outlineFromBitmask(
                matrixStyle.rowHeaders.outlineStyle,
                matrixStyle.rowHeaders.outlineColor,
                matrixStyle.rowHeaders.outlineWeight,
              ),
            }}
          >
            {!row.child && matrixExpandToggle(true)}
            {row.label}
          </span>
          {[row.q1, row.q2].map((value, i) => (
            <span
              key={i}
              className="matrix-preview__cell matrix-preview__cell--value"
              style={{
                ...matrixValueCellStyle,
                // Banded rows alternate the background of every other row.
                ...(matrixStyle.values.bandedRowHeaders && row.index % 2 === 1
                  ? { backgroundColor: matrixStyle.values.backColorPrimary }
                  : {}),
                ...(i === 1 && matrixStyle.columnFormatting.styleValues ? matrixColumnFormattingStyle : {}),
                borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight),
                ...outlineFromBitmask(matrixStyle.values.outlineStyle, matrixStyle.values.outlineColor, matrixStyle.values.outlineWeight),
              }}
            >
              {i === 1
                ? formatValue(value, matrixStyle.columnFormatting.labelDisplayUnits, matrixStyle.columnFormatting.labelPrecision)
                : value}
            </span>
          ))}
          <span className="matrix-preview__cell matrix-preview__cell--value" style={matrixRowTotalCellStyle}>
            {row.q1 + row.q2}
          </span>
          <span className="matrix-preview__cell matrix-preview__cell--value" style={matrixValueCellStyle}>
            {matrixSparkline([row.q1, row.q2, Math.round((row.q1 + row.q2) / 2), row.q2 + 6])}
          </span>
        </Fragment>
      ))}

      {/* Row subtotals close out each hierarchy level. */}
      {matrixStyle.subTotals.rowSubtotals && (
        <Fragment>
          <span
            className="matrix-preview__cell"
            style={{
              ...matrixSubTotalCellStyle,
              borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight),
            }}
          >
            {String(matrixStyle.subTotals.rowSubtotalsLabel) || String(matrixStyle.subTotals.levelSubtotalLabel) || "Subtotal"}
          </span>
          {[148, 165].map((value, i) => (
            <span key={i} className="matrix-preview__cell matrix-preview__cell--value" style={matrixSubTotalCellStyle}>
              {i === 1 && matrixStyle.columnFormatting.styleSubtotals
                ? formatValue(value, matrixStyle.columnFormatting.labelDisplayUnits, matrixStyle.columnFormatting.labelPrecision)
                : value}
            </span>
          ))}
          <span className="matrix-preview__cell matrix-preview__cell--value" style={matrixSubTotalCellStyle}>
            313
          </span>
          <span className="matrix-preview__cell" style={matrixSubTotalCellStyle} />
        </Fragment>
      )}

      {/* A styled blank row separates sections of the matrix. */}
      {matrixStyle.blankRows.showBlankRows && (
        <Fragment>
          {Array.from({ length: matrixColumnCount }, (_, i) => (
            <span
              key={i}
              className="matrix-preview__cell matrix-preview__cell--blank"
              style={{
                backgroundColor: hexWithAlpha(matrixStyle.blankRows.blankRowColor, matrixStyle.blankRows.blankRowTransparency),
                ...(matrixStyle.blankRows.showBorder
                  ? {
                      borderBottom: `${matrixStyle.blankRows.borderWidth}px solid ${hexWithAlpha(
                        matrixStyle.blankRows.borderColor,
                        matrixStyle.blankRows.borderTransparency,
                      )}`,
                    }
                  : {}),
              }}
            />
          ))}
        </Fragment>
      )}

      <span
        className="matrix-preview__cell"
        style={{ ...matrixColumnTotalCellStyle, borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight) }}
      >
        Total
      </span>
      <span
        className="matrix-preview__cell matrix-preview__cell--value"
        style={{ ...matrixColumnTotalCellStyle, borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight) }}
      >
        148
      </span>
      <span
        className="matrix-preview__cell matrix-preview__cell--value"
        style={{
          ...matrixColumnTotalCellStyle,
          ...(matrixStyle.columnFormatting.styleTotal ? matrixColumnFormattingStyle : {}),
          borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight),
        }}
      >
        165
      </span>
      <span className="matrix-preview__cell matrix-preview__cell--value" style={matrixGrandTotalCellStyle}>
        313
      </span>
      <span className="matrix-preview__cell" style={matrixGrandTotalCellStyle} />
    </span>
  );

  const pieSliceValues = [45, 30, 15, 10];
  const pieColors = [palette[0], palette[1] ?? palette[0], palette[2] ?? palette[0], palette[3] ?? palette[0]];
  let pieCumulative = 0;
  const pieStops = pieSliceValues
    .map((value, index) => {
      const start = pieCumulative;
      pieCumulative += value;
      return `${pieColors[index]} ${start}% ${pieCumulative}%`;
    })
    .join(", ");
  const pieLegendAtBottom = String(pieChartStyle.legend.position).startsWith("Bottom");

  const pieContent = (
    <span className="pie-preview" style={{ opacity: 1 - pieChartStyle.dataPoint.fillTransparency / 100 }}>
      <span className={`pie-preview__body${pieLegendAtBottom ? " pie-preview__body--stacked" : ""}`}>
        <span className="pie-preview__chart-wrap">
          <span
            className="pie-preview__circle"
            style={{
              background: `conic-gradient(from ${pieChartStyle.slices.startAngle}deg, ${pieStops})`,
              border: pieChartStyle.dataPoint.borderShow
                ? `${pieChartStyle.dataPoint.borderSize}px solid ${pieChartStyle.dataPoint.borderColor}`
                : undefined,
            }}
          >
            {pieChartStyle.slices.innerRadiusRatio > 0 && (
              <span
                className="pie-preview__hole"
                style={{
                  inset: `${pieChartStyle.slices.innerRadiusRatio}%`,
                  backgroundColor: theme.background,
                }}
              />
            )}
          </span>
          {pieChartStyle.labels.show && (
            <span
              className="pie-preview__label"
              style={{
                color: pieChartStyle.labels.color,
                fontFamily: pieChartStyle.labels.fontFamily,
                fontSize: pieChartStyle.labels.fontSize,
                fontWeight: pieChartStyle.labels.bold ? 700 : 400,
                fontStyle: pieChartStyle.labels.italic ? "italic" : "normal",
                textDecoration: pieChartStyle.labels.underline ? "underline" : "none",
              }}
            >
              45%
            </span>
          )}
        </span>
        {pieChartStyle.legend.show && (
          <span className="pie-preview__legend">
            {["North", "South", "East", "West"].map((label, index) => (
              <span className="pie-preview__legend-item" key={label}>
                <span className="pie-preview__legend-swatch" style={{ backgroundColor: pieColors[index] }} />
                <span
                  style={{
                    color: pieChartStyle.legend.labelColor,
                    fontFamily: pieChartStyle.legend.fontFamily,
                    fontSize: pieChartStyle.legend.fontSize,
                    fontWeight: pieChartStyle.legend.bold ? 700 : 400,
                    fontStyle: pieChartStyle.legend.italic ? "italic" : "normal",
                    textDecoration: pieChartStyle.legend.underline ? "underline" : "none",
                  }}
                >
                  {label}
                </span>
              </span>
            ))}
          </span>
        )}
      </span>
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
    padding: slicerStyle.items.padding || undefined,
    ...outlineFromBitmask(slicerStyle.items.outlineStyle, slicerStyle.general.outlineColor, slicerStyle.general.outlineWeight),
  };

  // Date/numeric inputs share one style group each in the schema.
  const slicerDateInputStyle: CSSProperties = {
    backgroundColor: slicerStyle.date.background,
    color: slicerStyle.date.fontColor,
    fontFamily: slicerStyle.date.fontFamily || undefined,
    fontSize: slicerStyle.date.textSize,
    fontWeight: slicerStyle.date.bold ? 700 : 400,
    fontStyle: slicerStyle.date.italic ? "italic" : "normal",
    textDecoration: slicerStyle.date.underline ? "underline" : "none",
  };

  const slicerNumericInputStyle: CSSProperties = {
    backgroundColor: slicerStyle.numericInputStyle.background,
    color: slicerStyle.numericInputStyle.fontColor,
    fontFamily: slicerStyle.numericInputStyle.fontFamily || undefined,
    fontSize: slicerStyle.numericInputStyle.textSize,
    fontWeight: slicerStyle.numericInputStyle.bold ? 700 : 400,
    fontStyle: slicerStyle.numericInputStyle.italic ? "italic" : "normal",
    textDecoration: slicerStyle.numericInputStyle.underline ? "underline" : "none",
  };

  const calendar = slicerStyle.calendarButton;
  const calendarButtonNode = !slicerStyle.date.hideDatePickerButton && (
    <span
      className="slicer-preview__calendar-button"
      aria-hidden="true"
      style={{
        color: hexWithAlpha(calendar.iconColor, calendar.iconTransparency),
        fontSize: calendar.iconSize,
        backgroundColor: calendar.backgroundShow
          ? hexWithAlpha(calendar.backgroundColor, calendar.backgroundTransparency)
          : "transparent",
        border: calendar.strokeShow
          ? `${calendar.strokeWidth}px ${mapLineStyle(calendar.strokePattern)} ${hexWithAlpha(calendar.strokeColor, calendar.strokeTransparency)}`
          : undefined,
        borderRadius: calendar.individualCorners
          ? `${calendar.cornerTopLeft}px ${calendar.cornerTopRight}px ${calendar.cornerBottomRight}px ${calendar.cornerBottomLeft}px`
          : calendar.cornerRadius,
      }}
    >
      📅
    </span>
  );

  const slicerOptions = ["All statuses", "Approved", "In review", "Declined"];

  // Selection settings change what the option controls even look like:
  // single-select shows radios and drops the "select all" row.
  const singleSelect = slicerStyle.selection.singleSelect || slicerStyle.selection.strictSingleSelect;
  const visibleSlicerOptions = slicerStyle.selection.selectAllCheckboxEnabled ? slicerOptions : slicerOptions.slice(1);

  const slicerOptionRows = visibleSlicerOptions.map((label, index) => (
    <span className="slicer-preview__option" key={label} style={slicerItemStyle}>
      <span
        className={`slicer-preview__check${index < (singleSelect ? 1 : 2) ? " is-checked" : ""}${singleSelect ? " slicer-preview__check--radio" : ""}`}
        style={
          index < (singleSelect ? 1 : 2)
            ? { backgroundColor: slicerStyle.selectionIcon.color, borderColor: slicerStyle.selectionIcon.color }
            : undefined
        }
        aria-hidden="true"
      >
        {index < (singleSelect ? 1 : 2) ? (singleSelect ? "" : "✓") : ""}
      </span>
      {label}
      {index === 0 && slicerStyle.selection.selectAllCheckboxEnabled && <span className="slicer-preview__count">4</span>}
    </span>
  ));

  const slicerContent = (
    <span className="slicer-preview">
      {/* Power BI's slicer "type" (list/dropdown/...) is a per-instance
          display setting the theme JSON can't actually drive — this toggle
          only changes what's rendered here, so header/item styling can be
          checked in either layout without affecting the exported theme. */}
      <span className="slicer-preview__layout-toggle" role="group" aria-label="Preview layout">
        {SLICER_LAYOUTS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={slicerLayout === value ? "is-active" : ""}
            onClick={() => setSlicerLayout(value)}
          >
            {label}
          </button>
        ))}
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

      {slicerLayout === "dropdown" && (
        <>
          <button
            type="button"
            className="slicer-preview__dropdown"
            style={slicerItemStyle}
            aria-expanded={slicerDropdownOpen}
            onClick={(event) => {
              // The tile itself is a button that selects the visual, so
              // stop this from also changing selection.
              event.stopPropagation();
              setSlicerDropdownOpen((open) => !open);
            }}
          >
            <span>Approved, In review +2</span>
            <span aria-hidden="true">{slicerDropdownOpen ? "⌃" : "⌄"}</span>
          </button>
          {slicerDropdownOpen && <span className="slicer-preview__dropdown-list">{slicerOptionRows}</span>}
        </>
      )}

      {slicerLayout === "list" && (
        <>
          {slicerStyle.general.selfFilterEnabled && (
            <span
              className="slicer-preview__search"
              style={{
                backgroundColor: slicerStyle.searchBox.background,
                borderColor: slicerStyle.searchBox.borderColor,
                ...outlineFromBitmask(
                  slicerStyle.searchBox.outlineStyle,
                  slicerStyle.searchBox.borderColor,
                  slicerStyle.general.outlineWeight || 1,
                ),
              }}
            >
              Search
            </span>
          )}
          <span className={`slicer-preview__options${slicerStyle.general.orientation === 1 ? " slicer-preview__options--horizontal" : ""}`}>
            {slicerOptionRows}
          </span>
        </>
      )}

      {slicerLayout === "between" && (
        <span className="slicer-preview__range">
          <span className="slicer-preview__range-inputs">
            <span className="slicer-preview__input" style={slicerNumericInputStyle}>
              0
            </span>
            <span className="slicer-preview__range-sep">and</span>
            <span className="slicer-preview__input" style={slicerNumericInputStyle}>
              120
            </span>
          </span>
          {slicerStyle.slider.show && (
            <span className="slicer-preview__slider" aria-hidden="true">
              <span className="slicer-preview__slider-track" style={{ backgroundColor: slicerStyle.slider.secondaryLineColor }} />
              <span className="slicer-preview__slider-fill" style={{ backgroundColor: slicerStyle.slider.color }} />
              {[0, 1].map((handle) => (
                <span
                  className="slicer-preview__slider-handle"
                  key={handle}
                  style={{
                    left: handle === 0 ? "8%" : "72%",
                    backgroundColor: slicerStyle.slider.handleFillColor,
                    borderColor: slicerStyle.slider.handleBorderColor,
                  }}
                />
              ))}
            </span>
          )}
        </span>
      )}

      {slicerLayout === "dateRange" && (
        <span className="slicer-preview__range">
          <span className="slicer-preview__range-inputs">
            <span className="slicer-preview__input" style={slicerDateInputStyle}>
              01/04/2026
              {calendarButtonNode}
            </span>
            <span className="slicer-preview__range-sep">and</span>
            <span className="slicer-preview__input" style={slicerDateInputStyle}>
              {slicerStyle.dateRange.includeToday ? "Today" : "30/06/2026"}
              {calendarButtonNode}
            </span>
          </span>
          <span
            className="slicer-preview__range-text"
            style={{
              color: hexWithAlpha(slicerStyle.dateRangeText.color, slicerStyle.dateRangeText.transparency),
              fontFamily: slicerStyle.dateRangeText.fontFamily || undefined,
              fontSize: slicerStyle.dateRangeText.fontSize,
              fontWeight: slicerStyle.dateRangeText.bold ? 700 : 400,
              fontStyle: slicerStyle.dateRangeText.italic ? "italic" : "normal",
              textDecoration: slicerStyle.dateRangeText.underline ? "underline" : "none",
            }}
          >
            {String(slicerStyle.dateRange.anchorDate) || "1 Apr 2026 – 30 Jun 2026"}
          </span>
          {slicerStyle.slider.show && (
            <span className="slicer-preview__slider" aria-hidden="true">
              <span className="slicer-preview__slider-track" style={{ backgroundColor: slicerStyle.slider.secondaryLineColor }} />
              <span className="slicer-preview__slider-fill" style={{ backgroundColor: slicerStyle.slider.color }} />
              {[0, 1].map((handle) => (
                <span
                  className="slicer-preview__slider-handle"
                  key={handle}
                  style={{
                    left: handle === 0 ? "12%" : "64%",
                    backgroundColor: slicerStyle.slider.handleFillColor,
                    borderColor: slicerStyle.slider.handleBorderColor,
                  }}
                />
              ))}
            </span>
          )}
        </span>
      )}

      {slicerLayout === "relative" && (
        <span className="slicer-preview__range">
          <span className="slicer-preview__range-inputs">
            <span className="slicer-preview__input" style={slicerDateInputStyle}>
              Last
            </span>
            <span className="slicer-preview__input" style={slicerNumericInputStyle}>
              30
            </span>
            <span className="slicer-preview__input" style={slicerDateInputStyle}>
              days
            </span>
          </span>
          {slicerStyle.relativeText.show && (
            <span
              className="slicer-preview__range-text"
              style={{
                color: hexWithAlpha(slicerStyle.relativeText.color, slicerStyle.relativeText.transparency),
                fontFamily: slicerStyle.relativeText.fontFamily || undefined,
                fontSize: slicerStyle.relativeText.fontSize,
                fontWeight: slicerStyle.relativeText.bold ? 700 : 400,
                fontStyle: slicerStyle.relativeText.italic ? "italic" : "normal",
                textDecoration: slicerStyle.relativeText.underline ? "underline" : "none",
              }}
            >
              1 Jun 2026 – 30 Jun 2026
            </span>
          )}
        </span>
      )}

      {/* Shown when the slicer defers filtering until Apply is pressed. */}
      {slicerStyle.pendingChangesIcon.show && (
        <span
          className={`slicer-preview__pending slicer-preview__pending--${String(slicerStyle.pendingChangesIcon.position).toLowerCase()}`}
          title={
            slicerStyle.pendingChangesIcon.showTooltip
              ? String(slicerStyle.pendingChangesIcon.tooltipText) || String(slicerStyle.pendingChangesIcon.tooltipLabel) || undefined
              : undefined
          }
          style={{
            color: hexWithAlpha(slicerStyle.pendingChangesIcon.color, slicerStyle.pendingChangesIcon.transparency),
            fontSize: slicerStyle.pendingChangesIcon.size,
          }}
          aria-hidden="true"
        >
          ⟳
        </span>
      )}
    </span>
  );

  const shapeContent = shapeTile(shapeStyle, "shape");

  const actionIcon = actionButtonStyle.icon;
  const actionButtonContent = shapeTile(
    actionButtonStyle,
    "actionButton",
    actionIcon.show && (
      <span
        className="shape-tile__icon"
        aria-hidden="true"
        style={{
          color: hexWithAlpha(actionIcon.lineColor, actionIcon.lineTransparency),
          fontSize: actionIcon.iconSize,
          // Power BI's stroke weight for the icon's line art; the glyphs
          // here are text, so it maps to weight rather than a border.
          fontWeight: actionIcon.lineWeight >= 3 ? 700 : 400,
          textAlign: mapTextAlign(actionIcon.horizontalAlignment) ?? "center",
          alignSelf:
            actionIcon.verticalAlignment === "top" ? "flex-start" : actionIcon.verticalAlignment === "bottom" ? "flex-end" : "center",
          margin: `${actionIcon.topMargin}px ${actionIcon.rightMargin}px ${actionIcon.bottomMargin}px ${actionIcon.leftMargin}px`,
        }}
      >
        {actionButtonGlyph(String(actionIcon.shapeType))}
      </span>
    ),
    // "Icon placement" positions the icon relative to the button's text.
    String(actionIcon.placement),
  );

  // The accent bar hugs whichever edge "position" names — Left/Top get a
  // rounded outer corner pair, Right/Bottom the mirror image.
  const accentBarStyle = (accentBar: { color: string; position: string | number; width: number; transparency: number }): CSSProperties => {
    const color = hexWithAlpha(accentBar.color, accentBar.transparency);
    const width = accentBar.width || 4;
    switch (String(accentBar.position).toLowerCase()) {
      case "right":
        return { top: 0, right: 0, width, height: "100%", backgroundColor: color, borderRadius: "0 3px 3px 0" };
      case "top":
        return { top: 0, left: 0, width: "100%", height: width, backgroundColor: color, borderRadius: "3px 3px 0 0" };
      case "bottom":
        return { bottom: 0, left: 0, width: "100%", height: width, backgroundColor: color, borderRadius: "0 0 3px 3px" };
      default:
        return { top: 0, left: 0, width, height: "100%", backgroundColor: color, borderRadius: "3px 0 0 3px" };
    }
  };

  const navigatorButtons = (
    style: ResolvedShapeFamilyCore,
    accentBar: { show: boolean; color: string; position: string | number; width: number; transparency: number },
    layout: { orientation: string | number; columnCount: number; rowCount: number; cellPadding: number },
    labels: string[],
  ) => {
    // Orientation: 2 = Horizontal, 1 = Vertical, 0 = Grid.
    const isGrid = layout.orientation === 0;
    return (
      <span
        className="navigator-preview"
        style={{
          display: isGrid ? "grid" : "flex",
          flexDirection: !isGrid && layout.orientation === 1 ? "column" : "row",
          gridTemplateColumns: isGrid ? `repeat(${Math.max(1, layout.columnCount || 2)}, 1fr)` : undefined,
          gap: layout.cellPadding || 10,
        }}
      >
        {labels.map((label, index) => (
          <span className="navigator-preview__item" key={label}>
            {shapeTile({ ...style, text: { ...style.text, text: label } }, label)}
            {accentBar.show && index === 0 && <span className="navigator-preview__accent" style={accentBarStyle(accentBar)} />}
          </span>
        ))}
      </span>
    );
  };

  const bookmarkNavigatorContent = navigatorButtons(
    bookmarkNavigatorStyle,
    bookmarkNavigatorStyle.accentBar,
    bookmarkNavigatorStyle.layout,
    ["Overview", "Detail", "Trends"],
  );

  const pageNavigatorContent = navigatorButtons(pageNavigatorStyle, pageNavigatorStyle.accentBar, pageNavigatorStyle.layout, [
    "Page 1",
    "Page 2",
    "Page 3",
  ]);

  const textboxContent = (
    <span
      className="textbox-preview"
      style={{
        color: textboxStyle.text.color,
        fontFamily: textboxStyle.text.fontFamily || undefined,
        fontSize: textboxStyle.text.fontSize,
      }}
    >
      Add a text box to annotate your report with headings, notes, or instructions.
    </span>
  );

  const imageContent = (
    <span
      className="image-preview"
      role="img"
      aria-label={imageStyle.image.altText || "Placeholder image"}
      style={{
        backgroundColor: imageStyle.image.backgroundEnabled
          ? hexWithAlpha(imageStyle.image.backgroundColor, imageStyle.image.backgroundTransparency)
          : "transparent",
        border: imageStyle.image.strokeShow
          ? `${imageStyle.image.strokeWidth}px ${imageStyle.image.strokePattern} ${hexWithAlpha(imageStyle.image.strokeColor, imageStyle.image.strokeTransparency)}`
          : "1px dashed #C8C6C4",
        borderRadius: imageStyle.image.cornerRadiusAdvanced
          ? `${imageStyle.image.cornerRadiusLeftTop}px ${imageStyle.image.cornerRadiusRightTop}px ${imageStyle.image.cornerRadiusRightBottom}px ${imageStyle.image.cornerRadiusLeftBottom}px`
          : imageStyle.image.cornerRadius,
        opacity: 1 - imageStyle.image.transparency / 100,
        filter: imageStyle.image.effects
          ? `blur(${imageStyle.image.blur * 0.05}px) contrast(${100 + imageStyle.image.contrast}%) saturate(${100 + imageStyle.image.saturation}%)`
          : undefined,
      }}
    >
      <span className="image-preview__icon" aria-hidden="true">
        🖼
      </span>
      <span className="image-preview__fit">{String(imageStyle.image.fit)}</span>
    </span>
  );

  // Small multiples replace a chart's single plot with a grid of repeated
  // mini-charts, one per category — same treatment as the line chart above.
  const barSmallMultipleTitles = ["London", "North West", "Scotland", "Wales"];
  const barFinalContent = hasSmallMultiplesOverride(rawTheme, "clusteredBarChart") ? (
    <SmallMultiplesGrid layout={barChartStyle.smallMultiplesLayout} subheader={barChartStyle.subheader} content={barContent} titles={barSmallMultipleTitles} />
  ) : (
    barContent
  );
  const columnFinalContent = hasSmallMultiplesOverride(rawTheme, "clusteredColumnChart") ? (
    <SmallMultiplesGrid layout={columnChartStyle.smallMultiplesLayout} subheader={columnChartStyle.subheader} content={columnContent} titles={barSmallMultipleTitles} />
  ) : (
    columnContent
  );
  const stackedBarFinalContent = hasSmallMultiplesOverride(rawTheme, "barChart") ? (
    <SmallMultiplesGrid layout={stackedBarChartStyle.smallMultiplesLayout} subheader={stackedBarChartStyle.subheader} content={stackedBarContent} titles={barSmallMultipleTitles} />
  ) : (
    stackedBarContent
  );
  const stackedColumnFinalContent = hasSmallMultiplesOverride(rawTheme, "columnChart") ? (
    <SmallMultiplesGrid layout={stackedColumnChartStyle.smallMultiplesLayout} subheader={stackedColumnChartStyle.subheader} content={stackedColumnContent} titles={barSmallMultipleTitles} />
  ) : (
    stackedColumnContent
  );

  const descriptors: Array<{
    id: VisualKind;
    label: string;
    defaultTitle: string;
    chrome: ResolvedChromeStyle;
    content: ReactNode;
  }> = [
    { id: "card", label: "Card", defaultTitle: "Total support awarded", chrome: chromeStyles.card, content: cardContent },
    { id: "bar", label: "Clustered bar chart", defaultTitle: "Applications by region", chrome: chromeStyles.bar, content: barFinalContent },
    { id: "column", label: "Clustered column chart", defaultTitle: "Applications by region", chrome: chromeStyles.column, content: columnFinalContent },
    { id: "stackedBar", label: "Stacked bar chart", defaultTitle: "Applications by region", chrome: chromeStyles.stackedBar, content: stackedBarFinalContent },
    { id: "stackedColumn", label: "Stacked column chart", defaultTitle: "Applications by region", chrome: chromeStyles.stackedColumn, content: stackedColumnFinalContent },
    {
      id: "line",
      label: "Line chart",
      defaultTitle: "Applications over time",
      chrome: chromeStyles.line,
      content: lineUsesSmallMultiples
        ? (
            <SmallMultiplesGrid
              layout={lineSmallMultiples}
              subheader={lineSubheader}
              content={lineContent}
              titles={["London", "North West", "Scotland", "Wales"]}
            />
          )
        : lineContent,
    },
    { id: "table", label: "Table", defaultTitle: "Regional performance", chrome: chromeStyles.table, content: tableContent },
    { id: "matrix", label: "Matrix", defaultTitle: "Regional performance by quarter", chrome: chromeStyles.matrix, content: matrixContent },
    { id: "pie", label: "Pie chart", defaultTitle: "Applications by region", chrome: chromeStyles.pie, content: pieContent },
    { id: "slicer", label: "Slicer", defaultTitle: "Application status", chrome: chromeStyles.slicer, content: slicerContent },
    { id: "shape", label: "Shape", defaultTitle: "Shape", chrome: chromeStyles.shape, content: shapeContent },
    { id: "actionButton", label: "Action button", defaultTitle: "Action button", chrome: chromeStyles.actionButton, content: actionButtonContent },
    {
      id: "bookmarkNavigator",
      label: "Bookmark navigator",
      defaultTitle: "Bookmark navigator",
      chrome: chromeStyles.bookmarkNavigator,
      content: bookmarkNavigatorContent,
    },
    {
      id: "pageNavigator",
      label: "Page navigator",
      defaultTitle: "Page navigator",
      chrome: chromeStyles.pageNavigator,
      content: pageNavigatorContent,
    },
    { id: "textbox", label: "Textbox", defaultTitle: "Textbox", chrome: chromeStyles.textbox, content: textboxContent },
    { id: "image", label: "Image", defaultTitle: "Image", chrome: chromeStyles.image, content: imageContent },
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
