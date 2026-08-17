import { colorProp, numberProp, textProp } from "./properties";
import type { PropertyDefinition, PropertyValueType } from "./properties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * Root-level theme fields — not nested under `visualStyles` at all, so they
 * don't fit the visual-registry model (shared/override cascade, "*"
 * instance selector). These are plain values directly on the theme object:
 * `theme.good`, `theme.textClasses.title.fontSize`, etc.
 *
 * The `visual: "*"` on every definition below is an unused placeholder
 * (required by PropertyDefinition's shape) — reads/writes go through the
 * `path` alone via a custom getThemePath in PropertyEditor that returns it
 * verbatim, with no `visualStyles[...]["*"]` prefix.
 *
 * None of these 88 fields carry a `title`/`description` in Microsoft's
 * schema (root color tokens are just `{"$ref": "#/definitions/color"}`,
 * textClasses fields are just typed, no schema text at all) — every label,
 * description, and default value below is this app's own, based on how
 * Power BI's built-in themes and Fluent UI use these token names, not
 * copied from the schema (there is none to copy).
 */

function colorRoot(
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  guidance?: string,
  section?: string,
): PropertyDefinition<"color"> {
  return colorProp("*", id, label, description, path, guidance, section);
}
function numberRoot(
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  min: number,
  max: number,
  guidance?: string,
  section?: string,
): PropertyDefinition<"number"> {
  return numberProp("*", id, label, description, path, min, max, guidance, section);
}
function textRoot(
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  guidance?: string,
  section?: string,
): PropertyDefinition<"text"> {
  return textProp("*", id, label, description, path, guidance, section);
}

export const THEME_COLOR_PROPERTIES = {
  good: colorRoot(
    "globals.color.good",
    "Good",
    "The colour used for positive conditional-formatting indicators, such as a KPI trending in the right direction.",
    ["good"],
  ),
  neutral: colorRoot(
    "globals.color.neutral",
    "Neutral",
    "The colour used for neutral conditional-formatting indicators.",
    ["neutral"],
  ),
  bad: colorRoot(
    "globals.color.bad",
    "Bad",
    "The colour used for negative conditional-formatting indicators.",
    ["bad"],
  ),
  minimum: colorRoot(
    "globals.color.minimum",
    "Minimum",
    "The colour for the low end of a colour-scale conditional format.",
    ["minimum"],
  ),
  center: colorRoot(
    "globals.color.center",
    "Center",
    "The colour for the midpoint of a colour-scale conditional format.",
    ["center"],
  ),
  maximum: colorRoot(
    "globals.color.maximum",
    "Maximum",
    "The colour for the high end of a colour-scale conditional format.",
    ["maximum"],
  ),
  nullValue: colorRoot(
    "globals.color.null",
    "Null",
    "The colour used to represent a blank or null value in a colour-scale conditional format.",
    ["null"],
  ),

  firstLevelElements: colorRoot(
    "globals.color.firstLevelElements",
    "First-level elements",
    "The highest-emphasis text colour — headings and primary content.",
    ["firstLevelElements"],
    undefined,
    "Text hierarchy",
  ),
  secondLevelElements: colorRoot(
    "globals.color.secondLevelElements",
    "Second-level elements",
    "The second-highest-emphasis text colour.",
    ["secondLevelElements"],
    undefined,
    "Text hierarchy",
  ),
  thirdLevelElements: colorRoot(
    "globals.color.thirdLevelElements",
    "Third-level elements",
    "A lower-emphasis text colour, for secondary content.",
    ["thirdLevelElements"],
    undefined,
    "Text hierarchy",
  ),
  fourthLevelElements: colorRoot(
    "globals.color.fourthLevelElements",
    "Fourth-level elements",
    "The lowest-emphasis text colour, for the least prominent content.",
    ["fourthLevelElements"],
    undefined,
    "Text hierarchy",
  ),

  accent: colorRoot(
    "globals.color.accent",
    "Accent",
    "A general-purpose accent colour used across UI elements outside the data palette.",
    ["accent"],
    undefined,
    "Foreground",
  ),
  foregroundLight: colorRoot(
    "globals.color.foregroundLight",
    "Foreground (light)",
    "A lighter, lower-contrast variant of the main text colour.",
    ["foregroundLight"],
    undefined,
    "Foreground",
  ),
  foregroundDark: colorRoot(
    "globals.color.foregroundDark",
    "Foreground (dark)",
    "A darker, higher-contrast variant of the main text colour.",
    ["foregroundDark"],
    undefined,
    "Foreground",
  ),
  foregroundNeutralLight: colorRoot(
    "globals.color.foregroundNeutralLight",
    "Neutral foreground (light)",
    "A light neutral-gray text colour.",
    ["foregroundNeutralLight"],
    undefined,
    "Foreground",
  ),
  foregroundNeutralDark: colorRoot(
    "globals.color.foregroundNeutralDark",
    "Neutral foreground (dark)",
    "A dark neutral-gray text colour.",
    ["foregroundNeutralDark"],
    undefined,
    "Foreground",
  ),
  foregroundNeutralSecondary: colorRoot(
    "globals.color.foregroundNeutralSecondary",
    "Neutral foreground (secondary)",
    "A secondary-emphasis neutral text colour, for captions and subtitles.",
    ["foregroundNeutralSecondary"],
    undefined,
    "Foreground",
  ),
  foregroundNeutralSecondaryAlt: colorRoot(
    "globals.color.foregroundNeutralSecondaryAlt",
    "Neutral foreground (secondary, alt)",
    "An alternate secondary-emphasis neutral text colour.",
    ["foregroundNeutralSecondaryAlt"],
    undefined,
    "Foreground",
  ),
  foregroundNeutralSecondaryAlt2: colorRoot(
    "globals.color.foregroundNeutralSecondaryAlt2",
    "Neutral foreground (secondary, alt 2)",
    "A second alternate secondary-emphasis neutral text colour.",
    ["foregroundNeutralSecondaryAlt2"],
    undefined,
    "Foreground",
  ),
  foregroundNeutralTertiary: colorRoot(
    "globals.color.foregroundNeutralTertiary",
    "Neutral foreground (tertiary)",
    "A tertiary, lowest-emphasis neutral text colour.",
    ["foregroundNeutralTertiary"],
    undefined,
    "Foreground",
  ),
  foregroundNeutralTertiaryAlt: colorRoot(
    "globals.color.foregroundNeutralTertiaryAlt",
    "Neutral foreground (tertiary, alt)",
    "An alternate tertiary, lowest-emphasis neutral text colour.",
    ["foregroundNeutralTertiaryAlt"],
    undefined,
    "Foreground",
  ),
  foregroundSelected: colorRoot(
    "globals.color.foregroundSelected",
    "Foreground (selected)",
    "The text/icon colour for a selected element.",
    ["foregroundSelected"],
    undefined,
    "Foreground",
  ),
  foregroundButton: colorRoot(
    "globals.color.foregroundButton",
    "Button text",
    "The text colour used on buttons.",
    ["foregroundButton"],
    undefined,
    "Foreground",
  ),

  secondaryBackground: colorRoot(
    "globals.color.secondaryBackground",
    "Secondary background",
    "An alternate background colour, for panels or cards distinct from the main canvas.",
    ["secondaryBackground"],
    undefined,
    "Background",
  ),
  backgroundLight: colorRoot(
    "globals.color.backgroundLight",
    "Background (light)",
    "A light background colour variant.",
    ["backgroundLight"],
    undefined,
    "Background",
  ),
  backgroundNeutral: colorRoot(
    "globals.color.backgroundNeutral",
    "Background (neutral)",
    "A neutral-gray background colour variant.",
    ["backgroundNeutral"],
    undefined,
    "Background",
  ),
  backgroundDark: colorRoot(
    "globals.color.backgroundDark",
    "Background (dark)",
    "A dark background colour variant.",
    ["backgroundDark"],
    undefined,
    "Background",
  ),

  hyperlink: colorRoot(
    "globals.color.hyperlink",
    "Hyperlink",
    "The colour of an unvisited hyperlink.",
    ["hyperlink"],
    undefined,
    "Links & shapes",
  ),
  visitedHyperlink: colorRoot(
    "globals.color.visitedHyperlink",
    "Visited hyperlink",
    "The colour of a hyperlink that's already been visited.",
    ["visitedHyperlink"],
    undefined,
    "Links & shapes",
  ),
  shapeStroke: colorRoot(
    "globals.color.shapeStroke",
    "Shape stroke",
    "The default outline colour for shapes.",
    ["shapeStroke"],
    undefined,
    "Links & shapes",
  ),
  disabledText: colorRoot(
    "globals.color.disabledText",
    "Disabled text",
    "The colour used for disabled or inactive text.",
    ["disabledText"],
    undefined,
    "Links & shapes",
  ),
  mapPushpin: colorRoot(
    "globals.color.mapPushpin",
    "Map pushpin",
    "The default colour for map pushpin markers.",
    ["mapPushpin"],
    undefined,
    "Links & shapes",
  ),
} as const;

type TextClassKey =
  | "title"
  | "header"
  | "label"
  | "callout"
  | "largeTitle"
  | "dataTitle"
  | "boldLabel"
  | "largeLabel"
  | "largeLightLabel"
  | "lightLabel"
  | "semiboldLabel"
  | "smallLabel"
  | "smallLightLabel"
  | "smallDataLabel";

const TEXT_CLASS_META: Record<TextClassKey, { label: string; description: string; fontSize: number; bold: boolean }> = {
  title: { label: "Title", description: "The default text style for visual titles.", fontSize: 12, bold: true },
  header: {
    label: "Header",
    description: "The default text style for headers, such as table and matrix column headers.",
    fontSize: 12,
    bold: true,
  },
  label: {
    label: "Label",
    description: "The default text style for general labels — axis labels, legend text, and similar.",
    fontSize: 10,
    bold: false,
  },
  callout: {
    label: "Callout",
    description: "The default text style for callout values, such as a Card visual's big number.",
    fontSize: 28,
    bold: false,
  },
  largeTitle: {
    label: "Large title",
    description: "The default text style for large, prominent titles.",
    fontSize: 20,
    bold: true,
  },
  dataTitle: {
    label: "Data title",
    description: "The default text style for data-driven titles that change with the data.",
    fontSize: 12,
    bold: false,
  },
  boldLabel: {
    label: "Bold label",
    description: "The default text style for emphasised labels.",
    fontSize: 10,
    bold: true,
  },
  largeLabel: { label: "Large label", description: "The default text style for larger labels.", fontSize: 14, bold: false },
  largeLightLabel: {
    label: "Large light label",
    description: "The default text style for larger, lighter-weight labels.",
    fontSize: 14,
    bold: false,
  },
  lightLabel: {
    label: "Light label",
    description: "The default text style for lighter-weight labels.",
    fontSize: 10,
    bold: false,
  },
  semiboldLabel: {
    label: "Semibold label",
    description: "The default text style for semibold-weight labels.",
    fontSize: 10,
    bold: true,
  },
  smallLabel: { label: "Small label", description: "The default text style for small labels.", fontSize: 8, bold: false },
  smallLightLabel: {
    label: "Small light label",
    description: "The default text style for small, lighter-weight labels.",
    fontSize: 8,
    bold: false,
  },
  smallDataLabel: {
    label: "Small data label",
    description: "The default text style for small data labels.",
    fontSize: 8,
    bold: false,
  },
};

function buildTextClassProperties() {
  const entries: Record<string, PropertyDefinition<PropertyValueType>> = {};
  for (const [key, meta] of Object.entries(TEXT_CLASS_META) as Array<[TextClassKey, (typeof TEXT_CLASS_META)[TextClassKey]]>) {
    entries[`${key}FontFace`] = textRoot(
      `globals.textClasses.${key}.fontFace`,
      "Font family",
      `The typeface for the "${meta.label}" text style.`,
      ["textClasses", key, "fontFace"],
      undefined,
      meta.label,
    );
    entries[`${key}FontSize`] = numberRoot(
      `globals.textClasses.${key}.fontSize`,
      "Text size",
      meta.description,
      ["textClasses", key, "fontSize"],
      8,
      60,
      undefined,
      meta.label,
    );
    entries[`${key}FontWeight`] = textRoot(
      `globals.textClasses.${key}.fontWeight`,
      "Font weight",
      `The CSS font-weight for the "${meta.label}" text style (e.g. "normal", "bold").`,
      ["textClasses", key, "fontWeight"],
      undefined,
      meta.label,
    );
    entries[`${key}Color`] = colorRoot(
      `globals.textClasses.${key}.color`,
      "Color",
      `The text colour for the "${meta.label}" text style.`,
      ["textClasses", key, "color"],
      undefined,
      meta.label,
    );
  }
  return entries;
}

export const TEXT_CLASS_PROPERTIES = buildTextClassProperties();

export const TEXT_CLASS_KEYS = Object.keys(TEXT_CLASS_META) as TextClassKey[];
export const TEXT_CLASS_LABELS: Record<TextClassKey, string> = Object.fromEntries(
  (Object.entries(TEXT_CLASS_META) as Array<[TextClassKey, (typeof TEXT_CLASS_META)[TextClassKey]]>).map(([key, meta]) => [
    key,
    meta.label,
  ]),
) as Record<TextClassKey, string>;

export type ResolvedThemeColors = { [K in keyof typeof THEME_COLOR_PROPERTIES]: string };
export type ResolvedTextClasses = Record<string, string | number | boolean>;

/** Root-level theme colours: plain hex reads with app-chosen (not schema-specified) fallbacks. */
export function resolveThemeColors(theme: PowerBITheme, base: ResolvedTheme): ResolvedThemeColors {
  const read = (key: string, fallback: string): string => {
    const value = theme[key];
    return typeof value === "string" ? value : fallback;
  };
  return {
    good: read("good", "#107C10"),
    neutral: read("neutral", "#FFC83D"),
    bad: read("bad", "#D64550"),
    minimum: read("minimum", "#F8696B"),
    center: read("center", "#FFEB84"),
    maximum: read("maximum", "#63BE7B"),
    nullValue: read("null", "#A6A6A6"),
    firstLevelElements: read("firstLevelElements", "#201F1E"),
    secondLevelElements: read("secondLevelElements", "#323130"),
    thirdLevelElements: read("thirdLevelElements", "#605E5C"),
    fourthLevelElements: read("fourthLevelElements", "#A19F9D"),
    accent: read("accent", base.tableAccent),
    foregroundLight: read("foregroundLight", "#605E5C"),
    foregroundDark: read("foregroundDark", "#201F1E"),
    foregroundNeutralLight: read("foregroundNeutralLight", "#A19F9D"),
    foregroundNeutralDark: read("foregroundNeutralDark", "#484644"),
    foregroundNeutralSecondary: read("foregroundNeutralSecondary", "#605E5C"),
    foregroundNeutralSecondaryAlt: read("foregroundNeutralSecondaryAlt", "#69797E"),
    foregroundNeutralSecondaryAlt2: read("foregroundNeutralSecondaryAlt2", "#69797E"),
    foregroundNeutralTertiary: read("foregroundNeutralTertiary", "#A19F9D"),
    foregroundNeutralTertiaryAlt: read("foregroundNeutralTertiaryAlt", "#C8C6C4"),
    foregroundSelected: read("foregroundSelected", base.tableAccent),
    foregroundButton: read("foregroundButton", "#FFFFFF"),
    secondaryBackground: read("secondaryBackground", "#F3F2F1"),
    backgroundLight: read("backgroundLight", "#FAF9F8"),
    backgroundNeutral: read("backgroundNeutral", "#F3F2F1"),
    backgroundDark: read("backgroundDark", "#201F1E"),
    hyperlink: read("hyperlink", "#106EBE"),
    visitedHyperlink: read("visitedHyperlink", "#551A8B"),
    shapeStroke: read("shapeStroke", "#605E5C"),
    disabledText: read("disabledText", "#A19F9D"),
    mapPushpin: read("mapPushpin", base.palette[0] ?? "#005EA5"),
  };
}

/** Root-level text classes: reads each class's 4 fields with app-chosen fallbacks. */
export function resolveTextClasses(theme: PowerBITheme, base: ResolvedTheme): ResolvedTextClasses {
  const classes = (theme.textClasses ?? {}) as Record<string, Record<string, unknown>>;
  const result: ResolvedTextClasses = {};
  for (const [key, meta] of Object.entries(TEXT_CLASS_META) as Array<[TextClassKey, (typeof TEXT_CLASS_META)[TextClassKey]]>) {
    const stored = classes[key] ?? {};
    result[`${key}FontFace`] = typeof stored.fontFace === "string" ? stored.fontFace : base.fontFamily;
    result[`${key}FontSize`] = typeof stored.fontSize === "number" ? stored.fontSize : meta.fontSize;
    result[`${key}FontWeight`] = typeof stored.fontWeight === "string" ? stored.fontWeight : meta.bold ? "bold" : "normal";
    result[`${key}Color`] = typeof stored.color === "string" ? stored.color : base.foreground;
  }
  return result;
}

/** Reads a root-level theme path directly (no `visualStyles[...]["*"]` prefix). */
export function themeGlobalThemePath(definition: Pick<PropertyDefinition, "path">): Array<string | number> {
  return definition.path;
}
