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

  // Descriptions below quote Microsoft's own "What it formats" table for
  // the theme's structural colours (Create custom report themes docs) —
  // these are the only 4 of the 32 tokens on this page with real,
  // published documentation rather than an inferred guess.
  firstLevelElements: colorRoot(
    "globals.color.firstLevelElements",
    "First-level elements",
    'Also called "foreground". Label background (outside data points), trend line colour, textbox default colour, table/matrix values and totals font colour, data bars axis colour, card data labels, gauge callout value, KPI goal and text colour, slicer item/header/dropdown/numeric-input colour, scatter chart ratio line, line chart forecast line, map leader line, filter pane and card text, modern tooltip text and icons.',
    ["firstLevelElements"],
    undefined,
    "Text hierarchy",
  ),
  secondLevelElements: colorRoot(
    "globals.color.secondLevelElements",
    "Second-level elements",
    'Also called "foregroundNeutralSecondary". Light secondary text classes, legend/axis label colour, table/matrix header font colour, gauge target and its leader line, KPI trend axis, slicer slider/item font/outline colour, line chart hover colour, multi-row card title, ribbon chart stroke, shape map border, button text/icon/outline colour.',
    ["secondLevelElements"],
    undefined,
    "Text hierarchy",
  ),
  thirdLevelElements: colorRoot(
    "globals.color.thirdLevelElements",
    "Third-level elements",
    'Also called "backgroundLight". Axis gridline colour, table/matrix grid colour, slicer header background in focus mode, multi-row card outline, shape fill colour, gauge arc background, applied filter card background, disabled button fill/outline when the button\'s own background is white.',
    ["thirdLevelElements"],
    undefined,
    "Text hierarchy",
  ),
  fourthLevelElements: colorRoot(
    "globals.color.fourthLevelElements",
    "Fourth-level elements",
    'Also called "foregroundNeutralTertiary". Dimmed legend entries, Card and multi-row card category label colour, multi-row card bar colour, funnel chart conversion-rate stroke, disabled button text/icon colour.',
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
    'Also called "backgroundNeutral". Table/matrix grid outline colour, shape map default colour, ribbon chart fill when "match series" is off, disabled button fill/outline when the button\'s own background isn\'t white, modern tooltip separator line and hover colour.',
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

// Descriptions, default sizes, and default colours below are quoted or
// derived from Microsoft's own "Set formatted text defaults" table (Create
// custom report themes docs), not inferred — the only two classes without
// published documentation (dataTitle, smallDataLabel, both schema-only)
// keep this app's own best-guess text, flagged as such below. Four
// primary classes (title/header/label/callout) can be set directly; the
// rest are secondary classes that inherit the primary's colour/font/size
// except for the one property Microsoft's table lists as their own
// override — reflected here by each secondary's `color`/`fontSize` either
// matching its primary or diverging exactly where documented.
const TEXT_CLASS_META: Record<
  TextClassKey,
  { label: string; description: string; fontSize: number; bold: boolean; color: string }
> = {
  title: {
    label: "Title",
    description: "Category axis title, value axis title, multi-row card title, slicer header (the slicer header itself defaults to the first data colour, not this class's colour).",
    fontSize: 12,
    bold: false,
    color: "#252423",
  },
  header: {
    label: "Header",
    description: "Key influencers headers (Segoe UI Semibold — approximated here as bold).",
    fontSize: 12,
    bold: true,
    color: "#252423",
  },
  label: {
    label: "Label",
    description: "Table and matrix column headers, matrix row headers, table and matrix grid, table and matrix values.",
    fontSize: 10,
    bold: false,
    color: "#252423",
  },
  callout: {
    label: "Callout",
    description: "Card data labels, KPI indicators.",
    fontSize: 45,
    bold: false,
    color: "#252423",
  },
  largeTitle: {
    label: "Large title",
    description: "Secondary class of Title. Visual title.",
    fontSize: 14,
    bold: false,
    color: "#252423",
  },
  // Not in Microsoft's published text-class table — schema-only field,
  // this app's own inferred description.
  dataTitle: {
    label: "Data title",
    description: "Not documented by Microsoft — inferred as a data-driven title that changes with the data.",
    fontSize: 12,
    bold: false,
    color: "#252423",
  },
  boldLabel: {
    label: "Bold label",
    description: "Secondary class of Label (Segoe UI Bold). Matrix subtotals, matrix grand totals, table totals.",
    fontSize: 10,
    bold: true,
    color: "#252423",
  },
  largeLabel: {
    label: "Large label",
    description: "Secondary class of Label. Multi-row card data labels.",
    fontSize: 12,
    bold: false,
    color: "#252423",
  },
  largeLightLabel: {
    label: "Large light label",
    description: "Secondary class of Label. Card category labels, gauge labels, multi-row card category labels.",
    fontSize: 12,
    bold: false,
    color: "#605E5C",
  },
  lightLabel: {
    label: "Light label",
    description:
      "Secondary class of Label. Legend text, button text, category axis labels, funnel chart data/conversion-rate labels, gauge target, scatter chart category label, slicer items.",
    fontSize: 10,
    bold: false,
    color: "#605E5C",
  },
  semiboldLabel: {
    label: "Semibold label",
    description: "Secondary class of Label (Segoe UI Semibold). Key influencers profile text.",
    fontSize: 10,
    bold: true,
    color: "#252423",
  },
  smallLabel: {
    label: "Small label",
    description:
      "Secondary class of Label. Reference line labels, slicer date-range labels, slicer numeric input text, slicer search box, key influencers influencer text.",
    fontSize: 9,
    bold: false,
    color: "#252423",
  },
  smallLightLabel: {
    label: "Small light label",
    description: "Secondary class of Label. Data labels, value axis labels.",
    fontSize: 9,
    bold: false,
    color: "#605E5C",
  },
  // Not in Microsoft's published text-class table — schema-only field,
  // this app's own inferred description.
  smallDataLabel: {
    label: "Small data label",
    description: "Not documented by Microsoft — inferred as a small data label style.",
    fontSize: 9,
    bold: false,
    color: "#252423",
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
    // firstLevelElements..fourthLevelElements below are corrected against
    // Microsoft's own docs (Create custom report themes): each is paired
    // with an "also called" Fluent name that must resolve to the same
    // default, and fourthLevelElements' #605E5C is independently confirmed
    // — it's what a real Power BI report renders for Card's category label
    // when a theme (verified against the user's own) leaves it unset.
    firstLevelElements: read("firstLevelElements", "#252423"),
    secondLevelElements: read("secondLevelElements", "#605E5C"),
    thirdLevelElements: read("thirdLevelElements", "#F3F2F1"),
    fourthLevelElements: read("fourthLevelElements", "#605E5C"),
    accent: read("accent", base.tableAccent),
    foregroundLight: read("foregroundLight", "#605E5C"),
    foregroundDark: read("foregroundDark", "#201F1E"),
    foregroundNeutralLight: read("foregroundNeutralLight", "#A19F9D"),
    foregroundNeutralDark: read("foregroundNeutralDark", "#484644"),
    // "Also called" secondLevelElements per Microsoft's docs — kept equal.
    foregroundNeutralSecondary: read("foregroundNeutralSecondary", "#605E5C"),
    foregroundNeutralSecondaryAlt: read("foregroundNeutralSecondaryAlt", "#69797E"),
    foregroundNeutralSecondaryAlt2: read("foregroundNeutralSecondaryAlt2", "#69797E"),
    // "Also called" fourthLevelElements per Microsoft's docs — kept equal.
    foregroundNeutralTertiary: read("foregroundNeutralTertiary", "#605E5C"),
    foregroundNeutralTertiaryAlt: read("foregroundNeutralTertiaryAlt", "#C8C6C4"),
    foregroundSelected: read("foregroundSelected", base.tableAccent),
    foregroundButton: read("foregroundButton", "#FFFFFF"),
    // "Also called" backgroundNeutral per Microsoft's docs — kept equal.
    secondaryBackground: read("secondaryBackground", "#C8C6C4"),
    backgroundLight: read("backgroundLight", "#FAF9F8"),
    backgroundNeutral: read("backgroundNeutral", "#C8C6C4"),
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
    // Microsoft's docs state text classes' own default colour directly
    // (#252423, or #605E5C for the "light" secondary classes) rather than
    // deriving it from the theme's plain foreground token — verified
    // against the "Set formatted text defaults" table.
    result[`${key}Color`] = typeof stored.color === "string" ? stored.color : meta.color;
  }
  return result;
}

/** Reads a root-level theme path directly (no `visualStyles[...]["*"]` prefix). */
export function themeGlobalThemePath(definition: Pick<PropertyDefinition, "path">): Array<string | number> {
  return definition.path;
}
