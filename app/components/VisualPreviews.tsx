import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import type { ResolvedActionButtonStyle } from "../lib/actionButtonProperties";
import type { ResolvedBarChartStyle } from "../lib/barChartProperties";
import type { ResolvedBookmarkNavigatorStyle } from "../lib/bookmarkNavigatorProperties";
import type { ResolvedCardStyle } from "../lib/cardProperties";
import { hexWithAlpha } from "../lib/colorUtils";
import type { ResolvedChromeStyle } from "../lib/chromeProperties";
import type { ResolvedColumnChartStyle } from "../lib/columnChartProperties";
import type { ResolvedImageStyle } from "../lib/imageProperties";
import type { ResolvedLineChartStyle } from "../lib/lineChartProperties";
import type { ResolvedMatrixStyle } from "../lib/matrixProperties";
import type { ResolvedPageNavigatorStyle } from "../lib/pageNavigatorProperties";
import type { ResolvedPieChartStyle } from "../lib/pieChartProperties";
import { shapeGeometry } from "../lib/shapeGeometry";
import type { ResolvedShapeFamilyCore } from "../lib/shapeFamilyProperties";
import type { ResolvedShapeStyle } from "../lib/shapeProperties";
import type { ResolvedSlicerStyle } from "../lib/slicerProperties";
import type { ResolvedStackedBarChartStyle } from "../lib/stackedBarChartProperties";
import type { ResolvedStackedColumnChartStyle } from "../lib/stackedColumnChartProperties";
import type { ResolvedTableStyle } from "../lib/tableProperties";
import type { ResolvedTextboxStyle } from "../lib/textboxProperties";
import type { ResolvedTheme } from "../lib/theme";

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

type VisualGalleryProps = {
  theme: ResolvedTheme;
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

function mapTextAlign(value: string | number): CSSProperties["textAlign"] | undefined {
  const normalized = String(value).toLowerCase();
  if (normalized === "left" || normalized === "center" || normalized === "right") {
    return normalized as CSSProperties["textAlign"];
  }
  return undefined; // "Auto" — leave the per-column default alignment alone.
}


/**
 * Shared tile renderer for the "shape family" visuals (Shape, Action
 * button, Bookmark navigator, Page navigator) — they all share the same
 * fill/outline/shadow/text core, so one function renders the common tile
 * body; each caller adds its own extras (an icon, an accent bar, ...).
 */
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

  const tile = (
    <button
      type="button"
      className={`visual-tile visual-tile--${variant}${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(id)}
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
        {tooltipNode}
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
            // rather than a Card one, but the Card is where it applies.
            marginBottom: chromeStyles.card.spacing.customizeSpacing
              ? chromeStyles.card.spacing.verticalSpacing
              : undefined,
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
          whiteSpace: cardStyle.labels.preserveWhitespace ? "pre-wrap" : undefined,
        }}
      >
        {formatCardValue(8_400_000, cardStyle.labels.labelDisplayUnits, cardStyle.labels.labelPrecision, cardStyle.general.formatString)}
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

  const stackedBarLegendNode = stackedBarChartStyle.legend.show && (
    <span className="chart-preview__legend">
      <span className="chart-preview__legend-swatch" style={{ backgroundColor: stackedBarChartStyle.dataPoint.fill }} />
      <span
        style={{
          color: stackedBarChartStyle.legend.labelColor,
          fontFamily: stackedBarChartStyle.legend.fontFamily,
          fontSize: stackedBarChartStyle.legend.fontSize,
          fontWeight: stackedBarChartStyle.legend.bold ? 700 : 400,
          fontStyle: stackedBarChartStyle.legend.italic ? "italic" : "normal",
          textDecoration: stackedBarChartStyle.legend.underline ? "underline" : "none",
        }}
      >
        Applications
      </span>
    </span>
  );
  const stackedBarLegendAtBottom = String(stackedBarChartStyle.legend.position).startsWith("Bottom");
  const stackedSegmentColor = palette[1] ?? palette[0];
  const stackedSegmentShare = 62; // fixed split — this app models one series' color, not per-series stacking

  const stackedBarContent = (
    <span className="chart-preview" style={{ opacity: 1 - stackedBarChartStyle.plotArea.transparency / 100 }}>
      {!stackedBarLegendAtBottom && stackedBarLegendNode}
      {stackedBarChartStyle.categoryAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title"
          style={{
            color: stackedBarChartStyle.categoryAxis.titleColor,
            fontFamily: stackedBarChartStyle.categoryAxis.titleFontFamily,
            fontSize: stackedBarChartStyle.categoryAxis.titleFontSize,
            fontWeight: stackedBarChartStyle.categoryAxis.titleBold ? 700 : 400,
            fontStyle: stackedBarChartStyle.categoryAxis.titleItalic ? "italic" : "normal",
            textDecoration: stackedBarChartStyle.categoryAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(stackedBarChartStyle.categoryAxis.titleText) || "Region"}
        </span>
      )}
      <span
        className="chart-preview__plot"
        style={{
          position: "relative",
          ...(stackedBarChartStyle.valueAxis.gridlineShow
            ? {
                backgroundImage: `repeating-linear-gradient(to right, ${stackedBarChartStyle.valueAxis.gridlineColor} 0, ${stackedBarChartStyle.valueAxis.gridlineColor} ${stackedBarChartStyle.valueAxis.gridlineThickness}px, transparent ${stackedBarChartStyle.valueAxis.gridlineThickness}px, transparent 25%)`,
              }
            : {}),
        }}
      >
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
        {[
          ["London", 82],
          ["North West", 66],
          ["Scotland", 51],
          ["Wales", 38],
        ].map(([label, value], index) => (
          <span className="bar-row" key={label}>
            {stackedBarChartStyle.categoryAxis.show && (
              <span
                className="bar-row__label"
                style={{
                  color: stackedBarChartStyle.categoryAxis.labelColor,
                  fontFamily: stackedBarChartStyle.categoryAxis.fontFamily,
                  fontSize: stackedBarChartStyle.categoryAxis.fontSize,
                  fontWeight: stackedBarChartStyle.categoryAxis.bold ? 700 : 400,
                  fontStyle: stackedBarChartStyle.categoryAxis.italic ? "italic" : "normal",
                  textDecoration: stackedBarChartStyle.categoryAxis.underline ? "underline" : "none",
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
                  style={{ left: `${value}%` }}
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
              <span
                className="bar-row__value"
                style={{
                  color: stackedBarChartStyle.totals.color,
                  fontFamily: stackedBarChartStyle.totals.fontFamily,
                  fontSize: stackedBarChartStyle.totals.fontSize,
                  fontWeight: stackedBarChartStyle.totals.bold ? 700 : 400,
                  fontStyle: stackedBarChartStyle.totals.italic ? "italic" : "normal",
                  textDecoration: stackedBarChartStyle.totals.underline ? "underline" : "none",
                  backgroundColor: stackedBarChartStyle.totals.enableBackground
                    ? hexWithAlpha(stackedBarChartStyle.totals.backgroundColor, stackedBarChartStyle.totals.backgroundTransparency)
                    : undefined,
                  padding: stackedBarChartStyle.totals.enableBackground ? "1px 4px" : undefined,
                  borderRadius: stackedBarChartStyle.totals.enableBackground ? 3 : undefined,
                }}
              >
                {value}k
              </span>
            )}
          </span>
        ))}
      </span>
      {stackedBarChartStyle.valueAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title chart-preview__axis-title--value"
          style={{
            color: stackedBarChartStyle.valueAxis.titleColor,
            fontFamily: stackedBarChartStyle.valueAxis.titleFontFamily,
            fontSize: stackedBarChartStyle.valueAxis.titleFontSize,
            fontWeight: stackedBarChartStyle.valueAxis.titleBold ? 700 : 400,
            fontStyle: stackedBarChartStyle.valueAxis.titleItalic ? "italic" : "normal",
            textDecoration: stackedBarChartStyle.valueAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(stackedBarChartStyle.valueAxis.titleText) || "Applications (k)"}
        </span>
      )}
      {stackedBarLegendAtBottom && stackedBarLegendNode}
    </span>
  );

  const columnLegendNode = columnChartStyle.legend.show && (
    <span className="chart-preview__legend">
      <span className="chart-preview__legend-swatch" style={{ backgroundColor: columnChartStyle.dataPoint.fill }} />
      <span
        style={{
          color: columnChartStyle.legend.labelColor,
          fontFamily: columnChartStyle.legend.fontFamily,
          fontSize: columnChartStyle.legend.fontSize,
          fontWeight: columnChartStyle.legend.bold ? 700 : 400,
          fontStyle: columnChartStyle.legend.italic ? "italic" : "normal",
          textDecoration: columnChartStyle.legend.underline ? "underline" : "none",
        }}
      >
        Applications
      </span>
    </span>
  );
  const columnLegendAtBottom = String(columnChartStyle.legend.position).startsWith("Bottom");

  const columnContent = (
    <span className="chart-preview" style={{ opacity: 1 - columnChartStyle.plotArea.transparency / 100 }}>
      {!columnLegendAtBottom && columnLegendNode}
      {columnChartStyle.valueAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title chart-preview__axis-title--value"
          style={{
            color: columnChartStyle.valueAxis.titleColor,
            fontFamily: columnChartStyle.valueAxis.titleFontFamily,
            fontSize: columnChartStyle.valueAxis.titleFontSize,
            fontWeight: columnChartStyle.valueAxis.titleBold ? 700 : 400,
            fontStyle: columnChartStyle.valueAxis.titleItalic ? "italic" : "normal",
            textDecoration: columnChartStyle.valueAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(columnChartStyle.valueAxis.titleText) || "Applications (k)"}
        </span>
      )}
      <span
        className="column-preview__plot"
        style={{
          ...(columnChartStyle.valueAxis.gridlineShow
            ? {
                backgroundImage: `repeating-linear-gradient(to top, ${columnChartStyle.valueAxis.gridlineColor} 0, ${columnChartStyle.valueAxis.gridlineColor} ${columnChartStyle.valueAxis.gridlineThickness}px, transparent ${columnChartStyle.valueAxis.gridlineThickness}px, transparent 25%)`,
              }
            : {}),
        }}
      >
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
          {[
            ["London", 82],
            ["North West", 66],
            ["Scotland", 51],
            ["Wales", 38],
          ].map(([label, value], index) => (
            <span className="column-item" key={label}>
              {columnChartStyle.labels.show && (
                <span
                  className="column-item__value"
                  style={{
                    color: columnChartStyle.labels.color,
                    fontFamily: columnChartStyle.labels.fontFamily,
                    fontSize: columnChartStyle.labels.fontSize,
                    fontWeight: columnChartStyle.labels.bold ? 700 : 400,
                    fontStyle: columnChartStyle.labels.italic ? "italic" : "normal",
                    textDecoration: columnChartStyle.labels.underline ? "underline" : "none",
                    backgroundColor: columnChartStyle.labels.enableBackground
                      ? hexWithAlpha(columnChartStyle.labels.backgroundColor, columnChartStyle.labels.backgroundTransparency)
                      : undefined,
                    padding: columnChartStyle.labels.enableBackground ? "1px 4px" : undefined,
                    borderRadius: columnChartStyle.labels.enableBackground ? 3 : undefined,
                  }}
                >
                  {value}k
                </span>
              )}
              <span className="column-item__track-wrap">
                <span className="column-item__track">
                  <span
                    className="column-item__fill"
                    style={{
                      height: `${value}%`,
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
                    style={{ bottom: `${value}%` }}
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
                <span
                  className="column-item__label"
                  style={{
                    color: columnChartStyle.categoryAxis.labelColor,
                    fontFamily: columnChartStyle.categoryAxis.fontFamily,
                    fontSize: columnChartStyle.categoryAxis.fontSize,
                    fontWeight: columnChartStyle.categoryAxis.bold ? 700 : 400,
                    fontStyle: columnChartStyle.categoryAxis.italic ? "italic" : "normal",
                    textDecoration: columnChartStyle.categoryAxis.underline ? "underline" : "none",
                  }}
                >
                  {label}
                </span>
              )}
            </span>
          ))}
        </span>
      </span>
      {columnChartStyle.categoryAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title"
          style={{
            color: columnChartStyle.categoryAxis.titleColor,
            fontFamily: columnChartStyle.categoryAxis.titleFontFamily,
            fontSize: columnChartStyle.categoryAxis.titleFontSize,
            fontWeight: columnChartStyle.categoryAxis.titleBold ? 700 : 400,
            fontStyle: columnChartStyle.categoryAxis.titleItalic ? "italic" : "normal",
            textDecoration: columnChartStyle.categoryAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(columnChartStyle.categoryAxis.titleText) || "Region"}
        </span>
      )}
      {columnLegendAtBottom && columnLegendNode}
    </span>
  );

  const stackedColumnLegendNode = stackedColumnChartStyle.legend.show && (
    <span className="chart-preview__legend">
      <span className="chart-preview__legend-swatch" style={{ backgroundColor: stackedColumnChartStyle.dataPoint.fill }} />
      <span
        style={{
          color: stackedColumnChartStyle.legend.labelColor,
          fontFamily: stackedColumnChartStyle.legend.fontFamily,
          fontSize: stackedColumnChartStyle.legend.fontSize,
          fontWeight: stackedColumnChartStyle.legend.bold ? 700 : 400,
          fontStyle: stackedColumnChartStyle.legend.italic ? "italic" : "normal",
          textDecoration: stackedColumnChartStyle.legend.underline ? "underline" : "none",
        }}
      >
        Applications
      </span>
    </span>
  );
  const stackedColumnLegendAtBottom = String(stackedColumnChartStyle.legend.position).startsWith("Bottom");

  const stackedColumnContent = (
    <span className="chart-preview" style={{ opacity: 1 - stackedColumnChartStyle.plotArea.transparency / 100 }}>
      {!stackedColumnLegendAtBottom && stackedColumnLegendNode}
      {stackedColumnChartStyle.valueAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title chart-preview__axis-title--value"
          style={{
            color: stackedColumnChartStyle.valueAxis.titleColor,
            fontFamily: stackedColumnChartStyle.valueAxis.titleFontFamily,
            fontSize: stackedColumnChartStyle.valueAxis.titleFontSize,
            fontWeight: stackedColumnChartStyle.valueAxis.titleBold ? 700 : 400,
            fontStyle: stackedColumnChartStyle.valueAxis.titleItalic ? "italic" : "normal",
            textDecoration: stackedColumnChartStyle.valueAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(stackedColumnChartStyle.valueAxis.titleText) || "Applications (k)"}
        </span>
      )}
      <span
        className="column-preview__plot"
        style={{
          ...(stackedColumnChartStyle.valueAxis.gridlineShow
            ? {
                backgroundImage: `repeating-linear-gradient(to top, ${stackedColumnChartStyle.valueAxis.gridlineColor} 0, ${stackedColumnChartStyle.valueAxis.gridlineColor} ${stackedColumnChartStyle.valueAxis.gridlineThickness}px, transparent ${stackedColumnChartStyle.valueAxis.gridlineThickness}px, transparent 25%)`,
              }
            : {}),
        }}
      >
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
          {[
            ["London", 82],
            ["North West", 66],
            ["Scotland", 51],
            ["Wales", 38],
          ].map(([label, value], index) => (
            <span className="column-item" key={label}>
              {stackedColumnChartStyle.totals.show && (
                <span
                  className="column-item__value"
                  style={{
                    color: stackedColumnChartStyle.totals.color,
                    fontFamily: stackedColumnChartStyle.totals.fontFamily,
                    fontSize: stackedColumnChartStyle.totals.fontSize,
                    fontWeight: stackedColumnChartStyle.totals.bold ? 700 : 400,
                    fontStyle: stackedColumnChartStyle.totals.italic ? "italic" : "normal",
                    textDecoration: stackedColumnChartStyle.totals.underline ? "underline" : "none",
                    backgroundColor: stackedColumnChartStyle.totals.enableBackground
                      ? hexWithAlpha(stackedColumnChartStyle.totals.backgroundColor, stackedColumnChartStyle.totals.backgroundTransparency)
                      : undefined,
                    padding: stackedColumnChartStyle.totals.enableBackground ? "1px 4px" : undefined,
                    borderRadius: stackedColumnChartStyle.totals.enableBackground ? 3 : undefined,
                  }}
                >
                  {value}k
                </span>
              )}
              <span className="column-item__track-wrap">
                <span className="column-item__track">
                  <span
                    className="column-item__fill"
                    style={{
                      height: `${value}%`,
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
                    style={{ bottom: `${value}%` }}
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
                <span
                  className="column-item__label"
                  style={{
                    color: stackedColumnChartStyle.categoryAxis.labelColor,
                    fontFamily: stackedColumnChartStyle.categoryAxis.fontFamily,
                    fontSize: stackedColumnChartStyle.categoryAxis.fontSize,
                    fontWeight: stackedColumnChartStyle.categoryAxis.bold ? 700 : 400,
                    fontStyle: stackedColumnChartStyle.categoryAxis.italic ? "italic" : "normal",
                    textDecoration: stackedColumnChartStyle.categoryAxis.underline ? "underline" : "none",
                  }}
                >
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

  const lineLegendNode = lineChartStyle.legend.show && (
    <span className="chart-preview__legend">
      <span className="chart-preview__legend-swatch" style={{ backgroundColor: lineChartStyle.dataPoint.fill }} />
      <span
        style={{
          color: lineChartStyle.legend.labelColor,
          fontFamily: lineChartStyle.legend.fontFamily,
          fontSize: lineChartStyle.legend.fontSize,
          fontWeight: lineChartStyle.legend.bold ? 700 : 400,
          fontStyle: lineChartStyle.legend.italic ? "italic" : "normal",
          textDecoration: lineChartStyle.legend.underline ? "underline" : "none",
        }}
      >
        Applications
      </span>
    </span>
  );
  const lineLegendAtBottom = String(lineChartStyle.legend.position).startsWith("Bottom");
  const linePointValues = [42, 58, 30, 68, 48];
  const linePointCoords = linePointValues.map((value, index) => ({
    x: (index / (linePointValues.length - 1)) * 100,
    y: 100 - value,
  }));
  const linePathD = linePointCoords.map((point) => `${point.x},${point.y}`).join(" ");
  const lineDashStyle = mapLineStyle(lineChartStyle.lineStyles.lineStyle);
  const lineAreaColor = lineChartStyle.lineStyles.areaMatchStrokeColor
    ? lineChartStyle.dataPoint.fill
    : lineChartStyle.lineStyles.areaColor;

  const lineContent = (
    <span className="chart-preview" style={{ opacity: 1 - lineChartStyle.plotArea.transparency / 100 }}>
      {!lineLegendAtBottom && lineLegendNode}
      {lineChartStyle.valueAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title"
          style={{
            color: lineChartStyle.valueAxis.titleColor,
            fontFamily: lineChartStyle.valueAxis.titleFontFamily,
            fontSize: lineChartStyle.valueAxis.titleFontSize,
            fontWeight: lineChartStyle.valueAxis.titleBold ? 700 : 400,
            fontStyle: lineChartStyle.valueAxis.titleItalic ? "italic" : "normal",
            textDecoration: lineChartStyle.valueAxis.titleUnderline ? "underline" : "none",
          }}
        >
          {String(lineChartStyle.valueAxis.titleText) || "Applications (k)"}
        </span>
      )}
      <span
        className="line-preview__plot"
        style={{
          position: "relative",
          ...(lineChartStyle.categoryAxis.gridlineShow
            ? {
                backgroundImage: `repeating-linear-gradient(to right, ${lineChartStyle.categoryAxis.gridlineColor} 0, ${lineChartStyle.categoryAxis.gridlineColor} ${lineChartStyle.categoryAxis.gridlineThickness}px, transparent ${lineChartStyle.categoryAxis.gridlineThickness}px, transparent 25%)`,
              }
            : {}),
        }}
      >
        {lineChartStyle.referenceLine.show && (
          <span
            className="chart-preview__reference-line"
            aria-hidden="true"
            style={{
              left: "70%",
              borderLeftWidth: lineChartStyle.referenceLine.width,
              borderLeftColor: lineChartStyle.referenceLine.lineColor,
              borderLeftStyle: mapLineStyle(lineChartStyle.referenceLine.style),
              opacity: 1 - lineChartStyle.referenceLine.transparency / 100,
            }}
          />
        )}
        <svg className="line-preview__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {lineChartStyle.lineStyles.areaShow && (
            <polygon
              points={`0,100 ${linePathD} 100,100`}
              fill={hexWithAlpha(lineAreaColor, 78)}
              stroke="none"
            />
          )}
          <polyline
            points={linePathD}
            fill="none"
            stroke={lineChartStyle.dataPoint.fill}
            strokeWidth={lineChartStyle.lineStyles.strokeWidth}
            strokeDasharray={svgDashArray(lineDashStyle)}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {lineChartStyle.lineStyles.showMarker &&
            linePointCoords.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={2.6}
                fill={lineChartStyle.dataPoint.fill}
                stroke={lineChartStyle.markers.borderShow ? lineChartStyle.markers.borderColor : "none"}
                strokeWidth={lineChartStyle.markers.borderWidth}
                vectorEffect="non-scaling-stroke"
              />
            ))}
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
        {lineChartStyle.labels.show && (
          <span
            className="line-preview__label"
            style={{
              left: `${linePointCoords[3].x}%`,
              top: `${linePointCoords[3].y}%`,
              color: lineChartStyle.labels.color,
              fontFamily: lineChartStyle.labels.fontFamily,
              fontSize: lineChartStyle.labels.fontSize,
              fontWeight: lineChartStyle.labels.bold ? 700 : 400,
              fontStyle: lineChartStyle.labels.italic ? "italic" : "normal",
              textDecoration: lineChartStyle.labels.underline ? "underline" : "none",
              backgroundColor: lineChartStyle.labels.enableBackground
                ? hexWithAlpha(lineChartStyle.labels.backgroundColor, lineChartStyle.labels.backgroundTransparency)
                : undefined,
            }}
          >
            68k
          </span>
        )}
      </span>
      {lineChartStyle.categoryAxis.show && (
        <span className="line-preview__axis-labels">
          {["Jan", "Feb", "Mar", "Apr", "May"].map((label) => (
            <span
              key={label}
              style={{
                color: lineChartStyle.categoryAxis.labelColor,
                fontFamily: lineChartStyle.categoryAxis.fontFamily,
                fontSize: lineChartStyle.categoryAxis.fontSize,
                fontWeight: lineChartStyle.categoryAxis.bold ? 700 : 400,
                fontStyle: lineChartStyle.categoryAxis.italic ? "italic" : "normal",
                textDecoration: lineChartStyle.categoryAxis.underline ? "underline" : "none",
              }}
            >
              {label}
            </span>
          ))}
        </span>
      )}
      {lineChartStyle.categoryAxis.showAxisTitle && (
        <span
          className="chart-preview__axis-title"
          style={{
            color: lineChartStyle.categoryAxis.titleColor,
            fontFamily: lineChartStyle.categoryAxis.titleFontFamily,
            fontSize: lineChartStyle.categoryAxis.titleFontSize,
            fontWeight: lineChartStyle.categoryAxis.titleBold ? 700 : 400,
            fontStyle: lineChartStyle.categoryAxis.titleItalic ? "italic" : "normal",
            textDecoration: lineChartStyle.categoryAxis.titleUnderline ? "underline" : "none",
          }}
        >
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

  const matrixContent = (
    <span
      className="matrix-preview"
      style={{
        border: `${matrixStyle.grid.outlineWeight}px solid ${matrixStyle.grid.outlineColor}`,
        fontSize: matrixStyle.grid.textSize,
      }}
    >
      <span className="matrix-preview__cell matrix-preview__cell--corner" style={matrixHeaderCellStyle} />
      {["Q1", "Q2"].map((label) => (
        <span
          key={label}
          className="matrix-preview__cell"
          style={{
            ...matrixHeaderCellStyle,
            textAlign: mapTextAlign(matrixStyle.columnHeaders.titleAlignment),
            borderBottom: matrixGridBorder(matrixStyle.grid.gridHorizontal, matrixStyle.grid.gridHorizontalColor, matrixStyle.grid.gridHorizontalWeight),
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

      {[
        ["London", 82, 91],
        ["Manchester", 66, 74],
      ].map(([label, q1, q2]) => (
        // Fragment, not a wrapping span — every cell must be a direct child
        // of .matrix-preview for CSS grid column alignment to work.
        <Fragment key={label as string}>
          <span
            className="matrix-preview__cell"
            style={{
              ...matrixRowHeaderCellStyle,
              paddingLeft: matrixStyle.rowHeaders.stepped ? matrixStyle.rowHeaders.steppedLayoutIndentation : undefined,
              borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight),
            }}
          >
            {label}
          </span>
          {[q1, q2].map((value, i) => (
            <span
              key={i}
              className="matrix-preview__cell matrix-preview__cell--value"
              style={{
                ...matrixValueCellStyle,
                borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight),
              }}
            >
              {value}
            </span>
          ))}
          <span className="matrix-preview__cell matrix-preview__cell--value" style={matrixRowTotalCellStyle}>
            {(q1 as number) + (q2 as number)}
          </span>
        </Fragment>
      ))}

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
        style={{ ...matrixColumnTotalCellStyle, borderRight: matrixGridBorder(matrixStyle.grid.gridVertical, matrixStyle.grid.gridVerticalColor, matrixStyle.grid.gridVerticalWeight) }}
      >
        165
      </span>
      <span className="matrix-preview__cell matrix-preview__cell--value" style={matrixGrandTotalCellStyle}>
        313
      </span>
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

  const navigatorButtons = (
    style: ResolvedShapeFamilyCore,
    accentBar: { show: boolean; color: string },
    orientation: string | number,
    labels: string[],
  ) => (
    <span className="navigator-preview" style={{ flexDirection: orientation === 1 ? "column" : "row" }}>
      {labels.map((label, index) => (
        <span className="navigator-preview__item" key={label}>
          {shapeTile({ ...style, text: { ...style.text, text: label } }, label)}
          {accentBar.show && index === 0 && <span className="navigator-preview__accent" style={{ backgroundColor: accentBar.color }} />}
        </span>
      ))}
    </span>
  );

  const bookmarkNavigatorContent = navigatorButtons(
    bookmarkNavigatorStyle,
    bookmarkNavigatorStyle.accentBar,
    bookmarkNavigatorStyle.layout.orientation,
    ["Overview", "Detail", "Trends"],
  );

  const pageNavigatorContent = navigatorButtons(pageNavigatorStyle, pageNavigatorStyle.accentBar, pageNavigatorStyle.layout.orientation, [
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
      style={{
        backgroundColor: imageStyle.image.backgroundEnabled
          ? hexWithAlpha(imageStyle.image.backgroundColor, imageStyle.image.backgroundTransparency)
          : "transparent",
        border: imageStyle.image.strokeShow
          ? `${imageStyle.image.strokeWidth}px ${imageStyle.image.strokePattern} ${hexWithAlpha(imageStyle.image.strokeColor, imageStyle.image.strokeTransparency)}`
          : "1px dashed #C8C6C4",
        borderRadius: imageStyle.image.cornerRadius,
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

  const descriptors: Array<{
    id: VisualKind;
    label: string;
    defaultTitle: string;
    chrome: ResolvedChromeStyle;
    content: ReactNode;
  }> = [
    { id: "card", label: "Card", defaultTitle: "Total support awarded", chrome: chromeStyles.card, content: cardContent },
    { id: "bar", label: "Clustered bar chart", defaultTitle: "Applications by region", chrome: chromeStyles.bar, content: barContent },
    { id: "column", label: "Clustered column chart", defaultTitle: "Applications by region", chrome: chromeStyles.column, content: columnContent },
    { id: "stackedBar", label: "Stacked bar chart", defaultTitle: "Applications by region", chrome: chromeStyles.stackedBar, content: stackedBarContent },
    { id: "stackedColumn", label: "Stacked column chart", defaultTitle: "Applications by region", chrome: chromeStyles.stackedColumn, content: stackedColumnContent },
    { id: "line", label: "Line chart", defaultTitle: "Applications over time", chrome: chromeStyles.line, content: lineContent },
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
