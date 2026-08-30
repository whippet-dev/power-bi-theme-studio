import { Fragment, useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ResolvedActionButtonStyle } from "../lib/actionButtonProperties";
import { headingAria } from "../lib/headingAria";
import { themeFontSizeToCssPx } from "../lib/fontUnits";
import type { ResolvedBarChartStyle } from "../lib/barChartProperties";
import type { ResolvedBookmarkNavigatorStyle } from "../lib/bookmarkNavigatorProperties";
import type { ResolvedCardStyle } from "../lib/cardProperties";
import { hexWithAlpha } from "../lib/colorUtils";
import { formatValue, mapTextAlign, SmallMultiplesGrid } from "./ChartParts";
import { FilterPanePreview } from "./GlobalPreviews";
import type { ResolvedGlobalOptionsStyle } from "../lib/globalOptionsProperties";
import type { ResolvedChromeStyle } from "../lib/chromeProperties";
import type { ResolvedColumnChartStyle } from "../lib/columnChartProperties";
import type { ResolvedImageStyle } from "../lib/imageProperties";
import type { ResolvedLineChartStyle } from "../lib/lineChartProperties";
import type { ResolvedMatrixStyle } from "../lib/matrixProperties";
import type { ResolvedPageNavigatorStyle } from "../lib/pageNavigatorProperties";
import type { ResolvedPieChartStyle } from "../lib/pieChartProperties";
import { shapeGeometry } from "../lib/shapeGeometry";
import { BarChartPreview } from "./previews/BarChartPreview";
import { chartMarker } from "./previews/chartPrimitives";
import { ColumnChartPreview } from "./previews/ColumnChartPreview";
import { LineChartPreview } from "./previews/LineChartPreview";
import { StackedBarChartPreview } from "./previews/StackedBarChartPreview";
import { StackedColumnChartPreview } from "./previews/StackedColumnChartPreview";
import { PresentationScaleEnabledContext } from "./previews/PresentationScale";
import type { ResolvedShapeFamilyCore } from "../lib/shapeFamilyProperties";
import type { ResolvedShapeStyle } from "../lib/shapeProperties";
import type { ResolvedSlicerStyle } from "../lib/slicerProperties";
import type { ResolvedStackedBarChartStyle } from "../lib/stackedBarChartProperties";
import type { ResolvedStackedColumnChartStyle } from "../lib/stackedColumnChartProperties";
import type { ResolvedTableStyle } from "../lib/tableProperties";
import type { ResolvedTextboxStyle } from "../lib/textboxProperties";
import type { ResolvedTheme } from "../lib/theme";
import { splitHeroVisuals, VISUAL_LABEL, type VisualKind } from "./visualCatalog";

export type { VisualKind } from "./visualCatalog";

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
// Small multiples used to be detected here by reading raw theme JSON,
// because resolution collapsed to bare values and so couldn't distinguish
// "the user configured this" from "this resolved to its default". It now
// arrives pre-resolved as `usesSmallMultiples` on each chart's style,
// derived from provenance — see isGroupSetBy in app/lib/properties.ts.

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
  selected: VisualKind;
  oneToOneHero?: boolean;
  onSelect: (visual: VisualKind) => void;
  globalOptionsStyle: ResolvedGlobalOptionsStyle;
  showFilterPane: boolean;
  /**
   * Theme Studio's supporting region, rendered between the report page and
   * the thumbnails. A slot rather than a prop bundle: the gallery owns
   * *where* supporting content sits and stays ignorant of what it is.
   */
  supporting?: ReactNode;
};

type PreviewShellProps = {
  id: VisualKind;
  label: string;
  defaultTitle: string;
  variant: "hero" | "thumb";
  selected: boolean;
  theme: ResolvedTheme;
  chrome: ResolvedChromeStyle;
  /**
   * The visual draws its own Power BI title, inside its authored bounds.
   * The tile must not draw a second one above it.
   */
  titleInsideVisual?: boolean;
  oneToOneHero?: boolean;
  onSelect: (visual: VisualKind) => void;
  children: ReactNode;
};

function mapLineStyle(value: string | number): "solid" | "dashed" | "dotted" {
  const normalized = String(value).toLowerCase();
  if (normalized === "dashed" || normalized === "custom") return "dashed";
  if (normalized === "dotted") return "dotted";
  return "solid";
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

/** The hero's measured natural size and the scale chosen to fit its slot. */
type HeroFit = { scale: number; naturalWidth: number; naturalHeight: number };

/**
 * The hero's maximum scale, read from the `--hero-max-scale` custom
 * property so globals.css stays the single source of truth. CSS also uses
 * it for the pre-measurement fallback transform and for the width the
 * report page reserves, and a second copy here would be one more
 * hand-maintained duplicate of a geometry constant.
 */
function heroMaxScale(element: Element): number {
  const raw = getComputedStyle(element).getPropertyValue("--hero-max-scale");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.5;
}


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
  fallbackText: string,
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
      key={fallbackText}
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
            fontSize: themeFontSizeToCssPx(style.text.fontSize),
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
          {String(style.text.text) || fallbackText}
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
  titleInsideVisual = false,
  oneToOneHero = false,
  onSelect,
  children,
}: PreviewShellProps) {
  const heroWrapRef = useRef<HTMLSpanElement>(null);
  const heroScaleRef = useRef<HTMLSpanElement>(null);
  const [heroFit, setHeroFit] = useState<HeroFit | null>(null);

  // Fit-to-container. The hero used to be a fixed scale(1.5) inside a
  // 630x510 box with overflow:hidden, so on a narrower slot it was
  // rendered and then simply cut off — measured 303px of 630px invisible
  // at 1280x720, with no scrollbar. Scale down to fit instead, and derive
  // the reserved footprint from the tile's measured natural size rather
  // than the hardcoded 510px, which was a guess at the tallest visual and
  // already left ~17px of dead space under a bar chart.
  //
  // A layout effect (not useEffect) so the measurement lands before paint
  // and there is no first-frame flash at the fallback size.
  const measureHero = useCallback(() => {
    const wrap = heroWrapRef.current;
    const scaleBox = heroScaleRef.current;
    if (!wrap || !scaleBox) return;
    // offsetWidth/Height are layout sizes, unaffected by the transform, so
    // they stay the tile's natural pre-scale dimensions.
    const naturalWidth = scaleBox.offsetWidth;
    const naturalHeight = scaleBox.offsetHeight;
    if (!naturalWidth || !naturalHeight) return;
    const available = wrap.getBoundingClientRect().width;
    const scale = Math.min(heroMaxScale(wrap), available / naturalWidth);
    // Returning `previous` unchanged lets React bail out of the re-render,
    // which is what stops the every-render effect below from looping.
    setHeroFit((previous) =>
      previous &&
      previous.naturalWidth === naturalWidth &&
      previous.naturalHeight === naturalHeight &&
      Math.abs(previous.scale - scale) < 0.0005
        ? previous
        : { scale, naturalWidth, naturalHeight },
    );
  }, []);

  // Deliberately no dependency array: the tile's height is content-driven,
  // so it changes whenever a theme edit adds or removes a legend, an axis
  // or a label row — a re-render with no remount and no resize. Measuring
  // on every render is what keeps the reserved footprint honest, and makes
  // correctness independent of ResizeObserver firing.
  useLayoutEffect(() => {
    if (variant !== "hero") return;
    measureHero();
  });

  // Covers the resizes React never hears about: the viewport, and the
  // container width changing under it. The wrap for available width, the
  // scale box because its natural height can also change without a render.
  // Neither observation can loop -- this only writes a transform (no
  // layout size) on the scale box, and sizes the wrap's *child*.
  useLayoutEffect(() => {
    if (variant !== "hero") return;
    const wrap = heroWrapRef.current;
    const scaleBox = heroScaleRef.current;
    if (!wrap || !scaleBox) return;
    const observer = new ResizeObserver(measureHero);
    observer.observe(wrap);
    observer.observe(scaleBox);
    return () => observer.disconnect();
  }, [variant, measureHero]);
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

  // The visual header and its tooltip are not part of the authored visual:
  // in a real report they appear on hover, during consumption, and they are
  // report chrome rather than anything the visual itself draws. Both are
  // rendered as static specimens in PreviewInspector instead, so the hero
  // stays an honest picture of the authored visual and the icons stop
  // appearing in all seventeen tiles at once.

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
      className={`visual-tile visual-tile--${variant}${selected ? " is-selected" : ""}${variant === "hero" && oneToOneHero ? " visual-tile--one-to-one" : ""}`}
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
      {/* The neutral stage between Theme Studio's tile and the authored
          visual. It exists so the visual's own background, border, corner
          radius and shadow have report-page space to sit in, and are not
          read as -- or clipped by -- Studio's card edge a pixel away. */}
      <span className="visual-stage">
        <span className="visual-frame" style={frameStyle}>
        {chrome.title.show && !titleInsideVisual && (
          <span
            className="preview-title"
            {...headingAria(chrome.title.heading)}
            style={{
              textAlign: chrome.title.alignment as CSSProperties["textAlign"],
              backgroundColor: chrome.title.background,
              color: chrome.title.fontColor,
              fontFamily: chrome.title.fontFamilyCss,
              fontSize: themeFontSizeToCssPx(chrome.title.fontSize),
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
        {chrome.subTitle.show && chrome.subTitle.text && !titleInsideVisual && (
          <span
            className="preview-subtitle"
            {...headingAria(chrome.subTitle.heading)}
            style={{
              textAlign: chrome.subTitle.alignment as CSSProperties["textAlign"],
              // The schema gives subTitle no background field of its own —
              // verified against a real report — it inherits the title's.
              backgroundColor: chrome.title.background,
              color: chrome.subTitle.fontColor,
              fontFamily: chrome.subTitle.fontFamily,
              fontSize: themeFontSizeToCssPx(chrome.subTitle.fontSize),
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
      </span>
    </div>
  );

  if (variant !== "hero") return tile;
  const presentationScale = oneToOneHero ? 1 : heroFit?.scale;

  // Real Power BI draws a hover tooltip floating over/beside the visual,
  // not squeezed into its own box — and here it can't be squeezed in
  // anyway: the hero tile is rendered at a fixed pre-scale size, so
  // appending the tooltip inside it (as this used to do) pushed the
  // content past the reserved height and got clipped by the scale
  // wrap's overflow:hidden, right at the tile's rounded corner. Rendering
  // it as a sibling below the scaled tile avoids both problems at once,
  // and keeps it outside the footprint the wrap reserves, so showing or
  // hiding it cannot move the hero's own bounds.
  return (
    <span className={`visual-hero-wrap${oneToOneHero ? " visual-hero-wrap--one-to-one" : ""}`} ref={heroWrapRef}>
      <span
        className={`visual-hero-scale-wrap${oneToOneHero ? " visual-hero-scale-wrap--one-to-one" : ""}`}
        // The reserved footprint, in both dimensions, is the tile's
        // measured natural size times the chosen scale — never a guess.
        style={
          heroFit && presentationScale
            ? { width: heroFit.naturalWidth * presentationScale, height: heroFit.naturalHeight * presentationScale }
            : undefined
        }
      >
        <span
          className="visual-hero-scale"
          ref={heroScaleRef}
          // The stylesheet supplies a 1.5x pre-measurement fallback for a
          // normal Hero. Neutralise it explicitly for the fidelity view.
          style={oneToOneHero ? { transform: "none" } : presentationScale ? { transform: `scale(${presentationScale})` } : undefined}
        >
          <PresentationScaleEnabledContext.Provider value={!oneToOneHero}>
            {tile}
          </PresentationScaleEnabledContext.Provider>
        </span>
      </span>
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
  selected,
  oneToOneHero = false,
  onSelect,
  globalOptionsStyle,
  showFilterPane,
  supporting,
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

  // Action button, Bookmark navigator and Page navigator arrive already
  // resolved at the selected interaction state — ThemeStudio owns both the
  // state and the resolution, so nothing here reads theme JSON. The
  // selector that drives it lives in PreviewInspector (T9); this component
  // only renders whichever state it was handed.


  const cardContent = (
    <span className="card-preview">
      <span
        className="card-preview__value"
        style={{
          fontSize: themeFontSizeToCssPx(cardStyle.labels.fontSize),
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
            fontSize: themeFontSizeToCssPx(cardStyle.categoryLabels.fontSize),
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

  // The Power BI visual title is part of the authored visual for these two,
  // so it is handed to the preview rather than drawn by the tile.
  const barContent = (
    <BarChartPreview
      barChartStyle={barChartStyle}
      palette={palette}
      titleChrome={chromeStyles.bar.title}
      subtitleChrome={chromeStyles.bar.subTitle}
      titleFallback="Applications by region"
      spaceBelowTitle={chromeStyles.bar.spacing.customizeSpacing ? chromeStyles.bar.spacing.spaceBelowTitle : 0}
      spaceAboveSubtitle={chromeStyles.bar.spacing.customizeSpacing ? chromeStyles.bar.spacing.spaceAboveSubtitle : 0}
      spaceBelowSubtitle={chromeStyles.bar.spacing.customizeSpacing ? chromeStyles.bar.spacing.spaceBelowSubTitle : 0}
    />
  );


  const stackedBarContent = (
    <StackedBarChartPreview
      stackedBarChartStyle={stackedBarChartStyle}
      palette={palette}
      titleChrome={chromeStyles.stackedBar.title}
      subtitleChrome={chromeStyles.stackedBar.subTitle}
      titleFallback="Applications by region"
      spaceBelowTitle={chromeStyles.stackedBar.spacing.customizeSpacing ? chromeStyles.stackedBar.spacing.spaceBelowTitle : 0}
      spaceAboveSubtitle={chromeStyles.stackedBar.spacing.customizeSpacing ? chromeStyles.stackedBar.spacing.spaceAboveSubtitle : 0}
      spaceBelowSubtitle={chromeStyles.stackedBar.spacing.customizeSpacing ? chromeStyles.stackedBar.spacing.spaceBelowSubTitle : 0}
    />
  );


  const columnContent = <ColumnChartPreview columnChartStyle={columnChartStyle} palette={palette} titleChrome={chromeStyles.column.title} subtitleChrome={chromeStyles.column.subTitle} titleFallback="Applications by region" spaceBelowTitle={chromeStyles.column.spacing.customizeSpacing ? chromeStyles.column.spacing.spaceBelowTitle : 0} spaceAboveSubtitle={chromeStyles.column.spacing.customizeSpacing ? chromeStyles.column.spacing.spaceAboveSubtitle : 0} spaceBelowSubtitle={chromeStyles.column.spacing.customizeSpacing ? chromeStyles.column.spacing.spaceBelowSubTitle : 0} />;


  const stackedColumnContent = <StackedColumnChartPreview stackedColumnChartStyle={stackedColumnChartStyle} palette={palette} titleChrome={chromeStyles.stackedColumn.title} subtitleChrome={chromeStyles.stackedColumn.subTitle} titleFallback="Applications by region" spaceBelowTitle={chromeStyles.stackedColumn.spacing.customizeSpacing ? chromeStyles.stackedColumn.spacing.spaceBelowTitle : 0} spaceAboveSubtitle={chromeStyles.stackedColumn.spacing.customizeSpacing ? chromeStyles.stackedColumn.spacing.spaceAboveSubtitle : 0} spaceBelowSubtitle={chromeStyles.stackedColumn.spacing.customizeSpacing ? chromeStyles.stackedColumn.spacing.spaceBelowSubTitle : 0} />;


  const lineContent = <LineChartPreview lineChartStyle={lineChartStyle} palette={palette} titleChrome={chromeStyles.line.title} subtitleChrome={chromeStyles.line.subTitle} titleFallback="Applications over time" spaceBelowTitle={chromeStyles.line.spacing.customizeSpacing ? chromeStyles.line.spacing.spaceBelowTitle : 0} spaceAboveSubtitle={chromeStyles.line.spacing.customizeSpacing ? chromeStyles.line.spacing.spaceAboveSubtitle : 0} spaceBelowSubtitle={chromeStyles.line.spacing.customizeSpacing ? chromeStyles.line.spacing.spaceBelowSubTitle : 0} />;
  // SmallMultiplesGrid repeats its content into every cell. Keep the current
  // outer-shell title there instead of giving every mini Line its own title.
  const lineSmallMultipleContent = <LineChartPreview lineChartStyle={lineChartStyle} palette={palette} />;
  // The line chart's small-multiples wrapper lives with the other four in
  // the descriptors below, so these three stay here rather than moving
  // into the component. Same values, read straight off the resolved style.
  const lineUsesSmallMultiples = lineChartStyle.usesSmallMultiples;
  const lineSmallMultiples = lineChartStyle.smallMultiplesLayout;
  const lineSubheader = lineChartStyle.subheader;

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
          fontSize: themeFontSizeToCssPx(tableStyle.columnHeaders.fontSize),
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
              fontSize: themeFontSizeToCssPx(tableStyle.values.fontSize),
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
            fontSize: themeFontSizeToCssPx(tableStyle.total.fontSize),
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
    fontSize: themeFontSizeToCssPx(matrixStyle.columnHeaders.fontSize),
    fontWeight: matrixStyle.columnHeaders.bold ? 700 : 400,
    fontStyle: matrixStyle.columnHeaders.italic ? "italic" : "normal",
    textDecoration: matrixStyle.columnHeaders.underline ? "underline" : "none",
  };
  const matrixRowHeaderCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.rowHeaders.backColor,
    color: matrixStyle.rowHeaders.fontColor,
    fontFamily: matrixStyle.rowHeaders.fontFamily,
    fontSize: themeFontSizeToCssPx(matrixStyle.rowHeaders.fontSize),
    fontWeight: matrixStyle.rowHeaders.bold ? 700 : 400,
    fontStyle: matrixStyle.rowHeaders.italic ? "italic" : "normal",
    textDecoration: matrixStyle.rowHeaders.underline ? "underline" : "none",
  };
  const matrixValueCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.values.backColor,
    color: matrixStyle.values.fontColor,
    fontFamily: matrixStyle.values.fontFamily,
    fontSize: themeFontSizeToCssPx(matrixStyle.values.fontSize),
    fontWeight: matrixStyle.values.bold ? 700 : 400,
    fontStyle: matrixStyle.values.italic ? "italic" : "normal",
    textDecoration: matrixStyle.values.underline ? "underline" : "none",
  };
  const matrixColumnTotalCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.columnTotal.backColor,
    color: matrixStyle.columnTotal.fontColor,
    fontFamily: matrixStyle.columnTotal.fontFamily,
    fontSize: themeFontSizeToCssPx(matrixStyle.columnTotal.fontSize),
    fontWeight: matrixStyle.columnTotal.bold ? 700 : 400,
    fontStyle: matrixStyle.columnTotal.italic ? "italic" : "normal",
    textDecoration: matrixStyle.columnTotal.underline ? "underline" : "none",
  };
  const matrixRowTotalCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.rowTotal.backColor,
    color: matrixStyle.rowTotal.fontColor,
    fontFamily: matrixStyle.rowTotal.fontFamily,
    fontSize: themeFontSizeToCssPx(matrixStyle.rowTotal.fontSize),
    fontWeight: matrixStyle.rowTotal.bold ? 700 : 400,
    fontStyle: matrixStyle.rowTotal.italic ? "italic" : "normal",
    textDecoration: matrixStyle.rowTotal.underline ? "underline" : "none",
  };
  const matrixGrandTotalCellStyle: CSSProperties = {
    backgroundColor: matrixStyle.total.backColor,
    color: matrixStyle.total.fontColor,
    fontFamily: matrixStyle.total.fontFamily,
    fontSize: themeFontSizeToCssPx(matrixStyle.total.fontSize),
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
    fontSize: themeFontSizeToCssPx(matrixStyle.subTotals.fontSize),
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
        <span className="matrix-preview__spark" style={{ position: "relative" }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block" }}>
            <polyline
              points={points}
              fill="none"
              stroke={spark.dataColor}
              strokeWidth={spark.strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {spark.markers > 0 &&
            // Same squashed-ellipse reason as the line chart's own markers
            // (see chartMarker) — rendered outside the stretched SVG.
            values.map((v, i) =>
              chartMarker(
                i,
                { kind: "circle", r: spark.markerSize / 2 },
                { x: (i / (values.length - 1)) * 100, y: 100 - (v / max) * 100 },
                spark.markerColor,
                "none",
                0,
              ),
            )}
        </span>
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
        fontSize: themeFontSizeToCssPx(matrixStyle.grid.textSize),
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
  // labelStyle picks which of category/data value/percent-of-total the
  // slice's own label shows, alone or combined — previously always "45%"
  // regardless of this setting, so the property had no visible effect.
  // Matched against the enum's exact raw values (not display labels) --
  // "Both" is category+data value with no percent, so it can't be
  // inferred from substrings of the string itself.
  const pieCategoryLabel = "North";
  const pieDataLabel = formatValue(pieSliceValues[0] * 1000, pieChartStyle.labels.labelDisplayUnits, pieChartStyle.labels.labelPrecision);
  const piePercentLabel = `${pieSliceValues[0].toFixed(pieChartStyle.labels.percentageLabelPrecision)}%`;
  const pieLabelPartsByStyle: Record<string, string[]> = {
    Category: [pieCategoryLabel],
    Data: [pieDataLabel],
    "Percent of total": [piePercentLabel],
    Both: [pieCategoryLabel, pieDataLabel],
    "Category, percent of total": [pieCategoryLabel, piePercentLabel],
    "Data value, percent of total": [pieDataLabel, piePercentLabel],
    "Category, data value, percent of total": [pieCategoryLabel, pieDataLabel, piePercentLabel],
  };
  const pieLabelText = (pieLabelPartsByStyle[String(pieChartStyle.labels.labelStyle)] ?? [piePercentLabel]).join(", ");

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
                fontSize: themeFontSizeToCssPx(pieChartStyle.labels.fontSize),
                fontWeight: pieChartStyle.labels.bold ? 700 : 400,
                fontStyle: pieChartStyle.labels.italic ? "italic" : "normal",
                textDecoration: pieChartStyle.labels.underline ? "underline" : "none",
                // "Overflow text" lets a label spill past its slice's edge
                // instead of being clipped when it doesn't fit.
                overflow: pieChartStyle.labels.overflow ? "visible" : "hidden",
                textOverflow: pieChartStyle.labels.overflow ? "clip" : "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: pieChartStyle.labels.overflow ? "none" : "72px",
              }}
            >
              {pieLabelText}
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
                    fontSize: themeFontSizeToCssPx(pieChartStyle.legend.fontSize),
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
    fontSize: themeFontSizeToCssPx(slicerStyle.items.textSize),
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
    fontSize: themeFontSizeToCssPx(slicerStyle.date.textSize),
    fontWeight: slicerStyle.date.bold ? 700 : 400,
    fontStyle: slicerStyle.date.italic ? "italic" : "normal",
    textDecoration: slicerStyle.date.underline ? "underline" : "none",
  };

  const slicerNumericInputStyle: CSSProperties = {
    backgroundColor: slicerStyle.numericInputStyle.background,
    color: slicerStyle.numericInputStyle.fontColor,
    fontFamily: slicerStyle.numericInputStyle.fontFamily || undefined,
    fontSize: themeFontSizeToCssPx(slicerStyle.numericInputStyle.textSize),
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
            fontSize: themeFontSizeToCssPx(slicerStyle.header.textSize),
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
              fontSize: themeFontSizeToCssPx(slicerStyle.dateRangeText.fontSize),
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
                fontSize: themeFontSizeToCssPx(slicerStyle.relativeText.fontSize),
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

  const shapeContent = shapeTile(shapeStyle, VISUAL_LABEL.shape);

  const actionIcon = actionButtonStyle.icon;
  const actionButtonContent = shapeTile(
    actionButtonStyle,
    VISUAL_LABEL.actionButton,
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

  const pageNavigatorContent = navigatorButtons(
    pageNavigatorStyle,
    pageNavigatorStyle.accentBar,
    pageNavigatorStyle.layout,
    ["Page 1", "Page 2", "Page 3"],
  );

  const textboxContent = (
    <span
      className="textbox-preview"
      style={{
        color: textboxStyle.text.color,
        fontFamily: textboxStyle.text.fontFamily || undefined,
        fontSize: themeFontSizeToCssPx(textboxStyle.text.fontSize),
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
          ? `blur(${imageStyle.image.blur * 0.05}px) brightness(${100 + imageStyle.image.exposure}%) contrast(${100 + imageStyle.image.contrast}%) saturate(${100 + imageStyle.image.saturation}%)`
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
  const barFinalContent = barChartStyle.usesSmallMultiples ? (
    <SmallMultiplesGrid layout={barChartStyle.smallMultiplesLayout} subheader={barChartStyle.subheader} content={barContent} titles={barSmallMultipleTitles} />
  ) : (
    barContent
  );
  const columnFinalContent = columnChartStyle.usesSmallMultiples ? (
    <SmallMultiplesGrid layout={columnChartStyle.smallMultiplesLayout} subheader={columnChartStyle.subheader} content={columnContent} titles={barSmallMultipleTitles} />
  ) : (
    columnContent
  );
  const stackedBarFinalContent = stackedBarChartStyle.usesSmallMultiples ? (
    <SmallMultiplesGrid layout={stackedBarChartStyle.smallMultiplesLayout} subheader={stackedBarChartStyle.subheader} content={stackedBarContent} titles={barSmallMultipleTitles} />
  ) : (
    stackedBarContent
  );
  const stackedColumnFinalContent = stackedColumnChartStyle.usesSmallMultiples ? (
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
    /** The visual draws its own Power BI title inside its authored bounds. */
    titleInsideVisual?: boolean;
  }> = [
    { id: "card", label: VISUAL_LABEL.card, defaultTitle: "Total support awarded", chrome: chromeStyles.card, content: cardContent },
    { id: "bar", label: VISUAL_LABEL.bar, defaultTitle: "Applications by region", chrome: chromeStyles.bar, content: barFinalContent, titleInsideVisual: true },
    { id: "column", label: VISUAL_LABEL.column, defaultTitle: "Applications by region", chrome: chromeStyles.column, content: columnFinalContent, titleInsideVisual: true },
    { id: "stackedBar", label: VISUAL_LABEL.stackedBar, defaultTitle: "Applications by region", chrome: chromeStyles.stackedBar, content: stackedBarFinalContent, titleInsideVisual: true },
    { id: "stackedColumn", label: VISUAL_LABEL.stackedColumn, defaultTitle: "Applications by region", chrome: chromeStyles.stackedColumn, content: stackedColumnFinalContent, titleInsideVisual: true },
    {
      id: "line",
      label: VISUAL_LABEL.line,
      defaultTitle: "Applications over time",
      chrome: chromeStyles.line,
      titleInsideVisual: !lineUsesSmallMultiples,
      content: lineUsesSmallMultiples
        ? (
            <SmallMultiplesGrid
              layout={lineSmallMultiples}
              subheader={lineSubheader}
              content={lineSmallMultipleContent}
              titles={["London", "North West", "Scotland", "Wales"]}
            />
          )
        : lineContent,
    },
    { id: "table", label: VISUAL_LABEL.table, defaultTitle: "Regional performance", chrome: chromeStyles.table, content: tableContent },
    { id: "matrix", label: VISUAL_LABEL.matrix, defaultTitle: "Regional performance by quarter", chrome: chromeStyles.matrix, content: matrixContent },
    { id: "pie", label: VISUAL_LABEL.pie, defaultTitle: "Applications by region", chrome: chromeStyles.pie, content: pieContent },
    { id: "slicer", label: VISUAL_LABEL.slicer, defaultTitle: "Application status", chrome: chromeStyles.slicer, content: slicerContent },
    { id: "shape", label: VISUAL_LABEL.shape, defaultTitle: VISUAL_LABEL.shape, chrome: chromeStyles.shape, content: shapeContent },
    { id: "actionButton", label: VISUAL_LABEL.actionButton, defaultTitle: VISUAL_LABEL.actionButton, chrome: chromeStyles.actionButton, content: actionButtonContent },
    {
      id: "bookmarkNavigator",
      label: VISUAL_LABEL.bookmarkNavigator,
      defaultTitle: VISUAL_LABEL.bookmarkNavigator,
      chrome: chromeStyles.bookmarkNavigator,
      content: bookmarkNavigatorContent,
    },
    {
      id: "pageNavigator",
      label: VISUAL_LABEL.pageNavigator,
      defaultTitle: VISUAL_LABEL.pageNavigator,
      chrome: chromeStyles.pageNavigator,
      content: pageNavigatorContent,
    },
    { id: "textbox", label: VISUAL_LABEL.textbox, defaultTitle: VISUAL_LABEL.textbox, chrome: chromeStyles.textbox, content: textboxContent },
    { id: "image", label: VISUAL_LABEL.image, defaultTitle: VISUAL_LABEL.image, chrome: chromeStyles.image, content: imageContent },
  ];

  const { hero, thumbnails } = splitHeroVisuals(descriptors, selected);

  return (
    <div className="visual-canvas">
      {/* The simulated Power BI report page holds the authored visual and
          nothing else. Wallpaper is the area around the page and the filter
          pane docks to its right; both are genuine report chrome. The
          thumbnail gallery below is Theme Studio navigation UI and is
          deliberately outside this surface -- see
          PREVIEW_COMPOSITION_DESIGN.md 1.4. */}
      <div
        className="report-surface"
        style={{
          backgroundColor: hexWithAlpha(globalOptionsStyle.pageWallpaper.color, globalOptionsStyle.pageWallpaper.transparency),
        }}
      >
        <div
          className="report-page"
          style={{
            backgroundColor: hexWithAlpha(
              globalOptionsStyle.pageBackground.color,
              globalOptionsStyle.pageBackground.transparency,
            ),
            justifyContent: globalOptionsStyle.pageAlignment.verticalAlignment === "Middle" ? "center" : "flex-start",
          }}
        >
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
              titleInsideVisual={hero.titleInsideVisual}
              oneToOneHero={oneToOneHero}
              onSelect={onSelect}
            >
              {hero.content}
            </PreviewShell>
          )}
        </div>
        {showFilterPane && <FilterPanePreview globalOptions={globalOptionsStyle} theme={theme} />}
      </div>

      {supporting}

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
              titleInsideVisual={d.titleInsideVisual}
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
