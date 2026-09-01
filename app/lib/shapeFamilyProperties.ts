import {
  boolProp,
  colorProp,
  enumProp,
  forStateId,
  groupSupportsStates,
  numberProp,
  resolvePropertyValue,
    textProp,
} from "./properties";
import type { InteractionState, PropertyDefinition, PropertyValueType, VisualSchemaKey, ThemeSource, PropertyLookup } from "./properties";
import { tintOrShade } from "./colorUtils";
import { nativeDataColor, nativeToken, type NativeTokenName } from "./nativeTokens";
import { resolveTextClass, type TextClassName } from "./textClasses";

/**
 * Shared base for the "shape family" of canvas-object visuals — Shape,
 * Action button, Bookmark navigator, and Page navigator. Verified directly
 * against reportThemeSchema-2.156.json: these four visuals share
 * byte-identical fill/glow/outline/rotation/shadow/shape/text group
 * definitions (Bookmark navigator and Page navigator are 100% identical to
 * each other; Shape and Action button differ only in that Shape alone has
 * an extra `shape.linecapType` field). Same rationale as the Bar/Column
 * chart reuse: structurally identical, so built from one shared function
 * rather than four independently-hand-written near-duplicates — but still
 * visual-specific (each per-visual file supplies its own `visual` key so
 * paths/resolution are correct for that visual).
 */

const ALIGNMENT_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const VERTICAL_ALIGNMENT_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Bottom" },
] as const;

const SHADOW_PRESET_OPTIONS = [
  { value: "custom", label: "Custom" },
  { value: "top", label: "Top" },
  { value: "topLeft", label: "Top left" },
  { value: "topRight", label: "Top right" },
  { value: "center", label: "Center" },
  { value: "centerLeft", label: "Left" },
  { value: "centerRight", label: "Right" },
  { value: "bottom", label: "Bottom" },
  { value: "bottomLeft", label: "Bottom left" },
  { value: "bottomRight", label: "Bottom right" },
] as const;

const TILE_SHAPE_OPTIONS = [
  { value: "arrow", label: "Arrow" },
  { value: "arrowChevron", label: "Chevron arrow" },
  { value: "arrowPentagon", label: "Pentagon arrow" },
  { value: "heart", label: "Heart" },
  { value: "hexagon", label: "Hexagon" },
  { value: "line", label: "Line" },
  { value: "octagon", label: "Octagon" },
  { value: "oval", label: "Oval" },
  { value: "parallelogram", label: "Parallelogram" },
  { value: "pentagon", label: "Pentagon" },
  { value: "pill", label: "Pill" },
  { value: "rectangle", label: "Rectangle" },
  { value: "rectangleRounded", label: "Rounded rectangle (%)" },
  { value: "rectangleRoundedByPixel", label: "Rounded rectangle (px)" },
  { value: "tabCutCorner", label: "Snipped tab, top right" },
  { value: "tabCutTopCorners", label: "Snipped tab, both top (%)" },
  { value: "tabCutTopCornersByPixel", label: "Snipped tab, both top (px)" },
  { value: "tabRoundCorner", label: "Rounded tab, top right" },
  { value: "tabRoundTopCorners", label: "Rounded tab, both top" },
  { value: "speechbubbleRectangle", label: "Speech bubble" },
  { value: "trapezoid", label: "Trapezoid" },
  { value: "triangleIsoc", label: "Isosceles triangle" },
  { value: "triangleRight", label: "Right triangle" },
] as const;

const SPEECH_BUBBLE_TAIL_OPTIONS = [
  { value: "bottomLeft", label: "Bottom left" },
  { value: "bottomRight", label: "Bottom right" },
  { value: "rightDown", label: "Right down" },
  { value: "rightUp", label: "Right up" },
  { value: "topRight", label: "Top right" },
  { value: "topLeft", label: "Top left" },
  { value: "leftUp", label: "Left up" },
  { value: "leftDown", label: "Left down" },
] as const;

const LINECAP_OPTIONS = [
  { value: "flat", label: "Flat" },
  { value: "round", label: "Round" },
] as const;

export function buildShapeFamilyCore(visual: VisualSchemaKey, options: { linecap?: boolean } = {}) {
  return {
    fill: {
      show: boolProp(visual, `${visual}.fill.show`, "Show", "Whether the shape has a fill colour.", ["fill", 0, "show"]),
      fillColor: colorProp(visual, `${visual}.fill.fillColor`, "Fill color", "The shape's fill colour.", ["fill", 0, "fillColor"]),
      transparency: numberProp(
        visual,
        `${visual}.fill.transparency`,
        "Transparency",
        "How see-through the fill colour appears — 0 is solid, 100 is invisible.",
        ["fill", 0, "transparency"],
        0,
        100,
      ),
    },

    outline: {
      show: boolProp(visual, `${visual}.outline.show`, "Show", "Whether an outline is drawn around the shape.", ["outline", 0, "show"]),
      lineColor: colorProp(
        visual,
        `${visual}.outline.lineColor`,
        "Outline color",
        "The colour of the outline.",
        ["outline", 0, "lineColor"],
      ),
      weight: numberProp(
        visual,
        `${visual}.outline.weight`,
        "Outline weight",
        "The thickness of the outline, in pixels.",
        ["outline", 0, "weight"],
        0,
        20,
      ),
      transparency: numberProp(
        visual,
        `${visual}.outline.transparency`,
        "Transparency",
        "How see-through the outline appears — 0 is solid, 100 is invisible.",
        ["outline", 0, "transparency"],
        0,
        100,
      ),
    },

    shadow: {
      show: boolProp(visual, `${visual}.shadow.show`, "Show", "Whether a drop shadow is drawn behind the shape.", ["shadow", 0, "show"]),
      shadowPositionPreset: enumProp(
        visual,
        `${visual}.shadow.shadowPositionPreset`,
        "Preset",
        "A ready-made shadow direction and offset to use instead of setting angle/distance manually.",
        ["shadow", 0, "shadowPositionPreset"],
        SHADOW_PRESET_OPTIONS,
      ),
      angle: numberProp(
        visual,
        `${visual}.shadow.angle`,
        "Angle",
        "The direction, in degrees, the shadow is cast.",
        ["shadow", 0, "angle"],
        0,
        360,
      ),
      color: colorProp(visual, `${visual}.shadow.color`, "Color", "The colour of the shadow.", ["shadow", 0, "color"]),
      transparency: numberProp(
        visual,
        `${visual}.shadow.transparency`,
        "Transparency",
        "How see-through the shadow appears — 0 is solid, 100 is invisible.",
        ["shadow", 0, "transparency"],
        0,
        100,
      ),
      shadowDistance: numberProp(
        visual,
        `${visual}.shadow.shadowDistance`,
        "Distance",
        "How far the shadow is offset from the shape, in pixels.",
        ["shadow", 0, "shadowDistance"],
        0,
        100,
      ),
      shadowBlur: numberProp(
        visual,
        `${visual}.shadow.shadowBlur`,
        "Blur",
        "How soft the shadow's edge is, in pixels.",
        ["shadow", 0, "shadowBlur"],
        0,
        100,
      ),
    },

    glow: {
      show: boolProp(visual, `${visual}.glow.show`, "Show", "Whether a glow effect is drawn around the shape.", ["glow", 0, "show"]),
      color: colorProp(visual, `${visual}.glow.color`, "Color", "The colour of the glow.", ["glow", 0, "color"]),
      transparency: numberProp(
        visual,
        `${visual}.glow.transparency`,
        "Transparency",
        "How see-through the glow appears — 0 is solid, 100 is invisible.",
        ["glow", 0, "transparency"],
        0,
        100,
      ),
      shadowBlur: numberProp(
        visual,
        `${visual}.glow.shadowBlur`,
        "Blur",
        "How soft the glow's edge is, in pixels.",
        ["glow", 0, "shadowBlur"],
        0,
        100,
      ),
    },

    rotation: {
      angle: numberProp(
        visual,
        `${visual}.rotation.angle`,
        "Rotation",
        "The overall rotation of the shape and its contents, in degrees.",
        ["rotation", 0, "angle"],
        0,
        360,
      ),
      shapeAngle: numberProp(
        visual,
        `${visual}.rotation.shapeAngle`,
        "Shape rotation",
        "The rotation of the shape outline only, in degrees.",
        ["rotation", 0, "shapeAngle"],
        0,
        360,
      ),
      textAngle: numberProp(
        visual,
        `${visual}.rotation.textAngle`,
        "Text rotation",
        "The rotation of the shape's text only, in degrees.",
        ["rotation", 0, "textAngle"],
        0,
        360,
      ),
    },

    shape: {
      tileShape: enumProp(
        visual,
        `${visual}.shape.tileShape`,
        "Shape",
        "Which outline shape is drawn.",
        ["shape", 0, "tileShape"],
        TILE_SHAPE_OPTIONS,
      ),
      ...(options.linecap
        ? {
            linecapType: enumProp(
              visual,
              `${visual}.shape.linecapType`,
              "Cap type",
              "For line shapes, whether the ends are flat or rounded.",
              ["shape", 0, "linecapType"],
              LINECAP_OPTIONS,
            ),
          }
        : {}),
      roundEdge: numberProp(
        visual,
        `${visual}.shape.roundEdge`,
        "Round edges",
        "How rounded the shape's edges are.",
        ["shape", 0, "roundEdge"],
        0,
        100,
        undefined,
        "Rectangle",
      ),
      rectangleRoundedCurve: numberProp(
        visual,
        `${visual}.shape.rectangleRoundedCurve`,
        "Rounded corners",
        "How rounded a rectangle's corners are.",
        ["shape", 0, "rectangleRoundedCurve"],
        0,
        100,
        undefined,
        "Rectangle",
      ),
      arrowStemWidth: numberProp(
        visual,
        `${visual}.shape.arrowStemWidth`,
        "Stem width",
        "The width of an arrow shape's stem.",
        ["shape", 0, "arrowStemWidth"],
        0,
        100,
        undefined,
        "Arrow",
      ),
      arrowheadSize: numberProp(
        visual,
        `${visual}.shape.arrowheadSize`,
        "Arrowhead size",
        "The size of an arrow shape's head.",
        ["shape", 0, "arrowheadSize"],
        0,
        100,
        undefined,
        "Arrow",
      ),
      chevronAngle: numberProp(
        visual,
        `${visual}.shape.chevronAngle`,
        "Angle",
        "The angle of a chevron shape's point.",
        ["shape", 0, "chevronAngle"],
        0,
        90,
        undefined,
        "Chevron",
      ),
      hexagonSlant: numberProp(
        visual,
        `${visual}.shape.hexagonSlant`,
        "Slant",
        "The slant of a hexagon shape's sides.",
        ["shape", 0, "hexagonSlant"],
        0,
        100,
        undefined,
        "Hexagon",
      ),
      octagonSnipSize: numberProp(
        visual,
        `${visual}.shape.octagonSnipSize`,
        "Size of snips",
        "The size of an octagon shape's corner snips.",
        ["shape", 0, "octagonSnipSize"],
        0,
        100,
        undefined,
        "Octagon",
      ),
      parallelogramSlant: numberProp(
        visual,
        `${visual}.shape.parallelogramSlant`,
        "Slant",
        "The slant of a parallelogram shape's sides.",
        ["shape", 0, "parallelogramSlant"],
        0,
        100,
        undefined,
        "Parallelogram",
      ),
      trapezoidSlant: numberProp(
        visual,
        `${visual}.shape.trapezoidSlant`,
        "Slant",
        "The slant of a trapezoid shape's sides.",
        ["shape", 0, "trapezoidSlant"],
        0,
        100,
        undefined,
        "Trapezoid",
      ),
      isocelesTriangleTipPosition: numberProp(
        visual,
        `${visual}.shape.isocelesTriangleTipPosition`,
        "Tip position",
        "The horizontal position of an isosceles triangle's tip.",
        ["shape", 0, "isocelesTriangleTipPosition"],
        0,
        100,
        undefined,
        "Triangle",
      ),
      speechBubbleHeight: numberProp(
        visual,
        `${visual}.shape.speechBubbleHeight`,
        "Chat bubble height",
        "The height of a speech bubble shape's tail.",
        ["shape", 0, "speechBubbleHeight"],
        0,
        100,
        undefined,
        "Speech bubble",
      ),
      speechBubbleTailAngle: numberProp(
        visual,
        `${visual}.shape.speechBubbleTailAngle`,
        "Tail angle",
        "The angle of a speech bubble shape's tail.",
        ["shape", 0, "speechBubbleTailAngle"],
        0,
        360,
        undefined,
        "Speech bubble",
      ),
      speechBubbleTailPosition: enumProp(
        visual,
        `${visual}.shape.speechBubbleTailPosition`,
        "Tail position",
        "Which side a speech bubble shape's tail points from.",
        ["shape", 0, "speechBubbleTailPosition"],
        SPEECH_BUBBLE_TAIL_OPTIONS,
        undefined,
        "Speech bubble",
      ),
      tabCutCornerSnipSizeTop: numberProp(
        visual,
        `${visual}.shape.tabCutCornerSnipSizeTop`,
        "Size of top snips",
        "The size of a snipped-tab shape's top corner snips.",
        ["shape", 0, "tabCutCornerSnipSizeTop"],
        0,
        100,
        undefined,
        "Tab",
      ),
      tabCutCornerSnipSizeTopRight: numberProp(
        visual,
        `${visual}.shape.tabCutCornerSnipSizeTopRight`,
        "Size of top right snip",
        "The size of a snipped-tab shape's top-right corner snip.",
        ["shape", 0, "tabCutCornerSnipSizeTopRight"],
        0,
        100,
        undefined,
        "Tab",
      ),
      tabCutCornerSnipSizeBottom: numberProp(
        visual,
        `${visual}.shape.tabCutCornerSnipSizeBottom`,
        "Size of bottom snips",
        "The size of a snipped-tab shape's bottom corner snips.",
        ["shape", 0, "tabCutCornerSnipSizeBottom"],
        0,
        100,
        undefined,
        "Tab",
      ),
      tabRoundCornerTop: numberProp(
        visual,
        `${visual}.shape.tabRoundCornerTop`,
        "Rounded top corners",
        "How rounded a rounded-tab shape's top corners are.",
        ["shape", 0, "tabRoundCornerTop"],
        0,
        100,
        undefined,
        "Tab",
      ),
      tabRoundCornerTopRight: numberProp(
        visual,
        `${visual}.shape.tabRoundCornerTopRight`,
        "Rounded top right corner",
        "How rounded a rounded-tab shape's top-right corner is.",
        ["shape", 0, "tabRoundCornerTopRight"],
        0,
        100,
        undefined,
        "Tab",
      ),
      tabRoundCornerBottom: numberProp(
        visual,
        `${visual}.shape.tabRoundCornerBottom`,
        "Rounded bottom corners",
        "How rounded a rounded-tab shape's bottom corners are.",
        ["shape", 0, "tabRoundCornerBottom"],
        0,
        100,
        undefined,
        "Tab",
      ),
    },

    text: {
      show: boolProp(visual, `${visual}.text.show`, "Show", "Whether text is shown on the shape.", ["text", 0, "show"]),
      text: textProp(visual, `${visual}.text.text`, "Text", "The text shown on the shape.", ["text", 0, "text"]),
      fontColor: colorProp(visual, `${visual}.text.fontColor`, "Font color", "The colour of the text.", ["text", 0, "fontColor"]),
      fontFamily: textProp(
        visual,
        `${visual}.text.fontFamily`,
        "Font family",
        "The typeface used for the text.",
        ["text", 0, "fontFamily"],
      ),
      fontSize: numberProp(
        visual,
        `${visual}.text.fontSize`,
        "Text size",
        "The text size, in points.",
        ["text", 0, "fontSize"],
        8,
        60,
      ),
      bold: boolProp(visual, `${visual}.text.bold`, "Bold", "Whether the text is bold.", ["text", 0, "bold"]),
      italic: boolProp(visual, `${visual}.text.italic`, "Italic", "Whether the text is italic.", ["text", 0, "italic"]),
      underline: boolProp(visual, `${visual}.text.underline`, "Underline", "Whether the text is underlined.", ["text", 0, "underline"]),
      horizontalAlignment: enumProp(
        visual,
        `${visual}.text.horizontalAlignment`,
        "Horizontal alignment",
        "How the text lines up horizontally within the shape.",
        ["text", 0, "horizontalAlignment"],
        ALIGNMENT_OPTIONS,
      ),
      verticalAlignment: enumProp(
        visual,
        `${visual}.text.verticalAlignment`,
        "Vertical alignment",
        "How the text lines up vertically within the shape.",
        ["text", 0, "verticalAlignment"],
        VERTICAL_ALIGNMENT_OPTIONS,
      ),
      topMargin: numberProp(
        visual,
        `${visual}.text.topMargin`,
        "Top margin",
        "The space, in pixels, above the text.",
        ["text", 0, "topMargin"],
        0,
        100,
        undefined,
        "Margins",
      ),
      bottomMargin: numberProp(
        visual,
        `${visual}.text.bottomMargin`,
        "Bottom margin",
        "The space, in pixels, below the text.",
        ["text", 0, "bottomMargin"],
        0,
        100,
        undefined,
        "Margins",
      ),
      leftMargin: numberProp(
        visual,
        `${visual}.text.leftMargin`,
        "Left margin",
        "The space, in pixels, to the left of the text.",
        ["text", 0, "leftMargin"],
        0,
        100,
        undefined,
        "Margins",
      ),
      rightMargin: numberProp(
        visual,
        `${visual}.text.rightMargin`,
        "Right margin",
        "The space, in pixels, to the right of the text.",
        ["text", 0, "rightMargin"],
        0,
        100,
        undefined,
        "Margins",
      ),
    },
  } as const;
}

export type ShapeFamilyCore = ReturnType<typeof buildShapeFamilyCore>;

export type ResolvedShapeFamilyCore = {
  fill: { show: boolean; fillColor: string; transparency: number };
  outline: { show: boolean; lineColor: string; weight: number; transparency: number };
  shadow: {
    show: boolean;
    shadowPositionPreset: string | number;
    angle: number;
    color: string;
    transparency: number;
    shadowDistance: number;
    shadowBlur: number;
  };
  glow: { show: boolean; color: string; transparency: number; shadowBlur: number };
  rotation: { angle: number; shapeAngle: number; textAngle: number };
  shape: Record<string, string | number>;
  text: {
    show: boolean;
    text: string;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    horizontalAlignment: string | number;
    verticalAlignment: string | number;
    topMargin: number;
    bottomMargin: number;
    leftMargin: number;
    rightMargin: number;
  };
};

/**
 * Defaults for the shape-tuning parameters. A generic 0 fallback is wrong
 * for nearly all of these: a hexagon with 0 slant is a rectangle, a
 * triangle with tip position 0 is a right triangle, an arrow with 0 stem
 * width has no stem. Each needs the value that actually produces the
 * shape it is named after — the same "zero default silently produces the
 * wrong thing" trap as the compound `*Width` and divider-width bugs.
 */
const SHAPE_PARAM_DEFAULTS: Record<string, string | number> = {
  tileShape: "rectangle",
  speechBubbleTailPosition: "bottomLeft",
  linecapType: "flat",
  roundEdge: 10,
  rectangleRoundedCurve: 10,
  arrowStemWidth: 40,
  arrowheadSize: 40,
  chevronAngle: 25,
  hexagonSlant: 25,
  octagonSnipSize: 25,
  parallelogramSlant: 20,
  trapezoidSlant: 20,
  isocelesTriangleTipPosition: 50,
  speechBubbleHeight: 75,
  speechBubbleTailAngle: 12,
  tabCutCornerSnipSizeTop: 20,
  tabCutCornerSnipSizeTopRight: 25,
  tabCutCornerSnipSizeBottom: 0,
  tabRoundCornerTop: 25,
  tabRoundCornerTopRight: 25,
  tabRoundCornerBottom: 0,
};

/**
 * Shared resolver for the core groups — every shape-family visual calls
 * this the same way, then resolves its own extra groups on top.
 *
 * `state` lets the preview show what a button or navigator actually looks
 * like in each interaction state (Power BI keys fill/outline/shadow/glow/
 * text by `$id` per state — see STATEFUL_GROUPS in properties.ts). Only
 * Action button, Bookmark navigator, and Page navigator support this;
 * Shape doesn't, and `groupSupportsStates` returning false for it means
 * `at()` is a no-op there — passing a non-"default" state has no effect.
 */
/**
 * A visual's CAPABILITY defaults: what Power BI itself renders when neither
 * the report theme nor the selected base theme says anything.
 *
 * These four visuals share a schema shape, and the resolver used to share one
 * set of fallback literals with it. That is structurally wrong: the schema is
 * shared, the effective defaults are not. Measured natively, a Rectangle
 * shows its fill and hides its text, while an Action Button hides its fill
 * and shows a 3px border; a navigator shows bold text where neither of the
 * others shows any.
 *
 * Only what has actually been measured belongs here. Anything omitted keeps
 * the resolver's generic literal, so a gap reads as "not established yet"
 * rather than as a claim. Colours are deliberately absent -- see the PR.
 *
 * Precedence is unchanged and comes for free: these are passed as the
 * `fallback` argument to `resolvePropertyValue`, which already tries the
 * custom theme, then the base theme, and only then the fallback. So an
 * imported value still wins, a base-theme value still wins over a capability
 * default, and Fluent 2's explicit per-state entries still resolve normally.
 */
/**
 * How a shape-family colour default is derived.
 *
 * A tagged union rather than a hex string, because the four visuals draw
 * their colours from three genuinely different places and collapsing them
 * into literals is what produced the defects this replaces — a Shape used to
 * fill with `#005EA5`, a colour from Theme Studio's own fallback palette that
 * appears in no Power BI theme at all.
 */
export type ShapeFamilyColor =
  /** One of the theme's root colour tokens. */
  | { token: NativeTokenName }
  /**
   * A palette entry, optionally tint/shaded the way a `ThemeDataColor`
   * expression would. Shape's border is `dataColors[0]` at -25%.
   */
  | { dataColor: number; shade?: number }
  /** A value Power BI hard-codes in the visual, which no token reaches. */
  | { constant: string };

/** A capability font size: a constant, or a text class's own size. */
export type ShapeFamilyFontSize = number | { fromTextClass: TextClassName };

function resolveFamilyColor(theme: ThemeSource, spec: ShapeFamilyColor): string {
  if ("constant" in spec) return spec.constant;
  if ("token" in spec) return nativeToken(theme, spec.token);
  const base = nativeDataColor(theme, spec.dataColor);
  return spec.shade === undefined ? base : tintOrShade(base, spec.shade);
}

const resolveFamilyFontSize = (theme: ThemeSource, spec: ShapeFamilyFontSize): number =>
  typeof spec === "number" ? spec : resolveTextClass(theme, spec.fromTextClass).fontSize;

export type ShapeFamilyDefaultValues = {
  fill?: { show?: boolean; transparency?: number; color?: ShapeFamilyColor };
  outline?: { show?: boolean; weight?: number; transparency?: number; color?: ShapeFamilyColor };
  shadow?: { show?: boolean; color?: ShapeFamilyColor; transparency?: number; blur?: number };
  glow?: { show?: boolean; color?: ShapeFamilyColor; transparency?: number; blur?: number };
  text?: {
    show?: boolean;
    fontSize?: ShapeFamilyFontSize;
    fontFamily?: string;
    color?: ShapeFamilyColor;
    bold?: boolean;
    horizontalAlignment?: string;
    verticalAlignment?: string;
    topMargin?: number;
    bottomMargin?: number;
    leftMargin?: number;
    rightMargin?: number;
  };
  /** Geometry parameters, by the key the shape registry uses. */
  shapeParams?: Record<string, string | number>;
};

export type ShapeFamilyDefaults = ShapeFamilyDefaultValues & {
  /**
   * Per-state capability defaults, applied over the visual-wide ones above.
   *
   * No longer empty. Every per-state difference measured is a colour, and
   * colours are now expressible: the navigators move `fill.color` through
   * background -> backgroundLight -> backgroundNeutral and invert with
   * `foreground` when selected, while a disabled Button drops its text and
   * icon to `foregroundNeutralTertiary` over a `backgroundNeutral` plate.
   */
  perState?: Partial<Record<InteractionState, ShapeFamilyDefaultValues>>;
};

export function resolveShapeFamilyCore(
  theme: ThemeSource,
  core: ShapeFamilyCore,
  baseForeground: string,
  baseFontFamily: string,
  state: InteractionState = "default",
  defaults: ShapeFamilyDefaults = {},
): ResolvedShapeFamilyCore {
  const visual = core.fill.fillColor.visual;
  const at = <T extends PropertyValueType>(group: string, definition: PropertyDefinition<T>): PropertyLookup<T> =>
    groupSupportsStates(visual, group) ? forStateId(definition, state) : definition;

  // Capability default for one property: the per-state one if this visual
  // has one for the state being resolved, else the visual-wide one, else the
  // generic literal that applied before any of this existed.
  const stateDefaults = defaults.perState?.[state];
  const cap = <T>(perState: T | undefined, perVisual: T | undefined, generic: T): T =>
    perState ?? perVisual ?? generic;
  /**
   * The same precedence for a colour, resolved through the theme. The generic
   * is a bare hex because it is the pre-measurement literal being retired —
   * a visual that supplies no colour default keeps exactly what it had.
   */
  const colorCap = (
    perState: ShapeFamilyColor | undefined,
    perVisual: ShapeFamilyColor | undefined,
    generic: string,
  ): string => {
    const spec = perState ?? perVisual;
    return spec === undefined ? generic : resolveFamilyColor(theme, spec);
  };

  const shape: Record<string, string | number> = {};
  for (const [key, definition] of Object.entries(core.shape)) {
    const fallback: string | number =
      SHAPE_PARAM_DEFAULTS[key] ?? (definition.valueType === "enum" ? (definition.options?.[0]?.value ?? "") : 0);
    // `shape` is NOT a state group — geometry doesn't change on hover — so
    // this deliberately asks for "default" rather than `state`. But Fluent 2
    // still writes `shape: [{ $id: "default", ... }]`, so the entry has to be
    // located by its `$id` (or by being untagged) rather than at index 0:
    // nothing guarantees the default entry is listed first, and reading
    // position would hand back another state's geometry. Same reasoning as
    // STATEFUL_GROUPS, minus the per-state part.
    shape[key] = resolvePropertyValue(
      theme,
      forStateId(definition, "default"),
      defaults.shapeParams?.[key] ?? fallback,
    );
  }

  return {
    fill: {
      show: resolvePropertyValue(theme, at("fill", core.fill.show), cap(stateDefaults?.fill?.show, defaults.fill?.show, true)),
      fillColor: resolvePropertyValue(theme, at("fill", core.fill.fillColor), colorCap(stateDefaults?.fill?.color, defaults.fill?.color, "#005EA5")),
      transparency: resolvePropertyValue(theme, at("fill", core.fill.transparency), cap(stateDefaults?.fill?.transparency, defaults.fill?.transparency, 0)),
    },
    outline: {
      show: resolvePropertyValue(theme, at("outline", core.outline.show), cap(stateDefaults?.outline?.show, defaults.outline?.show, false)),
      lineColor: resolvePropertyValue(theme, at("outline", core.outline.lineColor), colorCap(stateDefaults?.outline?.color, defaults.outline?.color, "#E3E3E3")),
      weight: resolvePropertyValue(theme, at("outline", core.outline.weight), cap(stateDefaults?.outline?.weight, defaults.outline?.weight, 1)),
      transparency: resolvePropertyValue(theme, at("outline", core.outline.transparency), cap(stateDefaults?.outline?.transparency, defaults.outline?.transparency, 0)),
    },
    shadow: {
      show: resolvePropertyValue(theme, at("shadow", core.shadow.show), cap(stateDefaults?.shadow?.show, defaults.shadow?.show, false)),
      shadowPositionPreset: resolvePropertyValue(theme, at("shadow", core.shadow.shadowPositionPreset), "bottomRight"),
      angle: resolvePropertyValue(theme, at("shadow", core.shadow.angle), 45),
      color: resolvePropertyValue(theme, at("shadow", core.shadow.color), colorCap(stateDefaults?.shadow?.color, defaults.shadow?.color, "#000000")),
      transparency: resolvePropertyValue(theme, at("shadow", core.shadow.transparency), cap(stateDefaults?.shadow?.transparency, defaults.shadow?.transparency, 60)),
      shadowDistance: resolvePropertyValue(theme, at("shadow", core.shadow.shadowDistance), 2),
      shadowBlur: resolvePropertyValue(theme, at("shadow", core.shadow.shadowBlur), cap(stateDefaults?.shadow?.blur, defaults.shadow?.blur, 5)),
    },
    glow: {
      show: resolvePropertyValue(theme, at("glow", core.glow.show), cap(stateDefaults?.glow?.show, defaults.glow?.show, false)),
      color: resolvePropertyValue(theme, at("glow", core.glow.color), colorCap(stateDefaults?.glow?.color, defaults.glow?.color, "#FFFFFF")),
      transparency: resolvePropertyValue(theme, at("glow", core.glow.transparency), cap(stateDefaults?.glow?.transparency, defaults.glow?.transparency, 60)),
      shadowBlur: resolvePropertyValue(theme, at("glow", core.glow.shadowBlur), cap(stateDefaults?.glow?.blur, defaults.glow?.blur, 5)),
    },
    rotation: {
      angle: resolvePropertyValue(theme, core.rotation.angle, 0),
      shapeAngle: resolvePropertyValue(theme, core.rotation.shapeAngle, 0),
      textAngle: resolvePropertyValue(theme, core.rotation.textAngle, 0),
    },
    shape,
    text: {
      show: resolvePropertyValue(theme, at("text", core.text.show), cap(stateDefaults?.text?.show, defaults.text?.show, true)),
      text: resolvePropertyValue(theme, at("text", core.text.text), ""),
      fontColor: resolvePropertyValue(theme, at("text", core.text.fontColor), colorCap(stateDefaults?.text?.color, defaults.text?.color, baseForeground)),
      fontFamily: resolvePropertyValue(theme, at("text", core.text.fontFamily), cap(stateDefaults?.text?.fontFamily, defaults.text?.fontFamily, baseFontFamily)),
      fontSize: resolvePropertyValue(theme, at("text", core.text.fontSize), resolveFamilyFontSize(theme, cap(stateDefaults?.text?.fontSize, defaults.text?.fontSize, 10))),
      bold: resolvePropertyValue(theme, at("text", core.text.bold), cap(stateDefaults?.text?.bold, defaults.text?.bold, false)),
      italic: resolvePropertyValue(theme, at("text", core.text.italic), false),
      underline: resolvePropertyValue(theme, at("text", core.text.underline), false),
      horizontalAlignment: resolvePropertyValue(theme, at("text", core.text.horizontalAlignment), cap(stateDefaults?.text?.horizontalAlignment, defaults.text?.horizontalAlignment, "center")),
      verticalAlignment: resolvePropertyValue(theme, at("text", core.text.verticalAlignment), cap(stateDefaults?.text?.verticalAlignment, defaults.text?.verticalAlignment, "middle")),
      topMargin: resolvePropertyValue(theme, at("text", core.text.topMargin), cap(stateDefaults?.text?.topMargin, defaults.text?.topMargin, 0)),
      bottomMargin: resolvePropertyValue(theme, at("text", core.text.bottomMargin), cap(stateDefaults?.text?.bottomMargin, defaults.text?.bottomMargin, 0)),
      leftMargin: resolvePropertyValue(theme, at("text", core.text.leftMargin), cap(stateDefaults?.text?.leftMargin, defaults.text?.leftMargin, 0)),
      rightMargin: resolvePropertyValue(theme, at("text", core.text.rightMargin), cap(stateDefaults?.text?.rightMargin, defaults.text?.rightMargin, 0)),
    },
  };
}
