import {
  boolProp,
  chromeThemePath,
  colorProp,
  enumProp,
  numberProp,
  resolveChromeValue,
  textProp,
  type VisualSchemaKey,
} from "./properties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * "Chrome" properties — title, subtitle, background, border — are defined
 * identically for every Power BI visual type (verified byte-for-byte equal
 * across visual-clusteredBarChart / visual-tableEx / visual-card in
 * reportThemeSchema-2.156.json), unlike the visual-specific registries in
 * tableProperties.ts and barChartProperties.ts.
 *
 * Because they're shared, they resolve differently: a specific visual's own
 * override (`visualStyles[type]["*"]`) wins if present, otherwise the theme
 * default that applies to every visual (`visualStyles["*"]["*"]`) is used —
 * see resolveChromeValue in properties.ts. The `visual: "*"` on each
 * definition below is just a placeholder; every read/write goes through
 * resolveChromeValue/chromeThemePath with an explicit visual context
 * instead of using this field directly.
 */

const ALIGNMENT_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const HEADING_OPTIONS = [
  { value: "Normal", label: "Normal" },
  { value: "Heading2", label: "Heading 2" },
  { value: "Heading3", label: "Heading 3" },
  { value: "Heading4", label: "Heading 4" },
  { value: "Heading5", label: "Heading 5" },
  { value: "Heading6", label: "Heading 6" },
] as const;

export const CHROME_PROPERTIES = {
  title: {
    show: boolProp("*", "chrome.title.show", "Show", "Whether the visual's title is shown.", ["title", 0, "show"]),
    text: textProp(
      "*",
      "chrome.title.text",
      "Title text",
      "The visual's title. Leave blank to use its default name.",
      ["title", 0, "text"],
    ),
    alignment: enumProp(
      "*",
      "chrome.title.alignment",
      "Alignment",
      "How the title text lines up within the visual's header.",
      ["title", 0, "alignment"],
      ALIGNMENT_OPTIONS,
    ),
    heading: enumProp(
      "*",
      "chrome.title.heading",
      "Title heading",
      "The heading level assistive technology announces for this title.",
      ["title", 0, "heading"],
      HEADING_OPTIONS,
      "Doesn't change how the title looks — only how screen readers describe it.",
    ),
    background: colorProp(
      "*",
      "chrome.title.background",
      "Background color",
      "The fill colour behind the title text.",
      ["title", 0, "background"],
    ),
    fontColor: colorProp(
      "*",
      "chrome.title.fontColor",
      "Font color",
      "The colour of the title text.",
      ["title", 0, "fontColor"],
    ),
    fontFamily: textProp(
      "*",
      "chrome.title.fontFamily",
      "Font family",
      "The typeface used for the title.",
      ["title", 0, "fontFamily"],
    ),
    fontSize: numberProp(
      "*",
      "chrome.title.fontSize",
      "Text size",
      "The text size used for the title.",
      ["title", 0, "fontSize"],
      8,
      60,
    ),
    bold: boolProp("*", "chrome.title.bold", "Bold", "Whether the title is bold.", ["title", 0, "bold"]),
    italic: boolProp("*", "chrome.title.italic", "Italic", "Whether the title is italic.", ["title", 0, "italic"]),
    underline: boolProp(
      "*",
      "chrome.title.underline",
      "Underline",
      "Whether the title is underlined.",
      ["title", 0, "underline"],
    ),
    titleWrap: boolProp(
      "*",
      "chrome.title.titleWrap",
      "Word wrap",
      "Whether a long title wraps onto a second line instead of being cut off.",
      ["title", 0, "titleWrap"],
    ),
  },

  subTitle: {
    show: boolProp("*", "chrome.subTitle.show", "Show", "Whether a subtitle is shown beneath the title.", ["subTitle", 0, "show"]),
    text: textProp("*", "chrome.subTitle.text", "Subtitle text", "The subtitle's text.", ["subTitle", 0, "text"]),
    alignment: enumProp(
      "*",
      "chrome.subTitle.alignment",
      "Alignment",
      "How the subtitle text lines up.",
      ["subTitle", 0, "alignment"],
      ALIGNMENT_OPTIONS,
    ),
    heading: enumProp(
      "*",
      "chrome.subTitle.heading",
      "Title heading",
      "The heading level assistive technology announces for this subtitle.",
      ["subTitle", 0, "heading"],
      HEADING_OPTIONS,
      "Doesn't change how the subtitle looks — only how screen readers describe it.",
    ),
    fontColor: colorProp(
      "*",
      "chrome.subTitle.fontColor",
      "Font color",
      "The colour of the subtitle text.",
      ["subTitle", 0, "fontColor"],
    ),
    fontFamily: textProp(
      "*",
      "chrome.subTitle.fontFamily",
      "Font family",
      "The typeface used for the subtitle.",
      ["subTitle", 0, "fontFamily"],
    ),
    fontSize: numberProp(
      "*",
      "chrome.subTitle.fontSize",
      "Text size",
      "The text size used for the subtitle.",
      ["subTitle", 0, "fontSize"],
      8,
      60,
    ),
    bold: boolProp("*", "chrome.subTitle.bold", "Bold", "Whether the subtitle is bold.", ["subTitle", 0, "bold"]),
    italic: boolProp("*", "chrome.subTitle.italic", "Italic", "Whether the subtitle is italic.", ["subTitle", 0, "italic"]),
    underline: boolProp(
      "*",
      "chrome.subTitle.underline",
      "Underline",
      "Whether the subtitle is underlined.",
      ["subTitle", 0, "underline"],
    ),
    titleWrap: boolProp(
      "*",
      "chrome.subTitle.titleWrap",
      "Word wrap",
      "Whether a long subtitle wraps onto a second line instead of being cut off.",
      ["subTitle", 0, "titleWrap"],
    ),
  },

  background: {
    show: boolProp(
      "*",
      "chrome.background.show",
      "Show",
      "Whether the visual has its own fill colour, instead of showing the canvas through it.",
      ["background", 0, "show"],
    ),
    color: colorProp(
      "*",
      "chrome.background.color",
      "Color",
      "The visual's background fill colour.",
      ["background", 0, "color"],
    ),
    transparency: numberProp(
      "*",
      "chrome.background.transparency",
      "Transparency",
      "How see-through the background fill appears — 0 is solid, 100 is invisible.",
      ["background", 0, "transparency"],
      0,
      100,
    ),
  },

  border: {
    show: boolProp("*", "chrome.border.show", "Show", "Whether a border is drawn around the visual.", ["border", 0, "show"]),
    color: colorProp("*", "chrome.border.color", "Color", "The colour of the border.", ["border", 0, "color"]),
    width: numberProp(
      "*",
      "chrome.border.width",
      "Width",
      "The thickness, in pixels, of the border.",
      ["border", 0, "width"],
      0,
      10,
    ),
    radius: numberProp(
      "*",
      "chrome.border.radius",
      "Radius",
      "How rounded the visual's corners are, in pixels.",
      ["border", 0, "radius"],
      0,
      24,
    ),
  },
} as const;

export type ResolvedChromeStyle = {
  title: {
    show: boolean;
    text: string;
    alignment: string | number;
    heading: string | number;
    background: string;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    titleWrap: boolean;
  };
  subTitle: {
    show: boolean;
    text: string;
    alignment: string | number;
    heading: string | number;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    titleWrap: boolean;
  };
  background: {
    show: boolean;
    color: string;
    transparency: number;
  };
  border: {
    show: boolean;
    color: string;
    width: number;
    radius: number;
  };
};

/**
 * Resolves chrome properties for one visual type, checking that visual's
 * own override first, then the theme-wide shared default, then a plain
 * fallback — see resolveChromeValue in properties.ts.
 */
export function resolveChromeStyle(
  theme: PowerBITheme,
  activeVisual: VisualSchemaKey,
  base: ResolvedTheme,
): ResolvedChromeStyle {
  const p = CHROME_PROPERTIES;
  return {
    title: {
      show: resolveChromeValue(theme, activeVisual, p.title.show, true),
      text: resolveChromeValue(theme, activeVisual, p.title.text, ""),
      alignment: resolveChromeValue(theme, activeVisual, p.title.alignment, "left"),
      heading: resolveChromeValue(theme, activeVisual, p.title.heading, "Normal"),
      background: resolveChromeValue(theme, activeVisual, p.title.background, base.background),
      fontColor: resolveChromeValue(theme, activeVisual, p.title.fontColor, base.foreground),
      fontFamily: resolveChromeValue(theme, activeVisual, p.title.fontFamily, base.fontFamily),
      fontSize: resolveChromeValue(theme, activeVisual, p.title.fontSize, base.titleSize),
      bold: resolveChromeValue(theme, activeVisual, p.title.bold, true),
      italic: resolveChromeValue(theme, activeVisual, p.title.italic, false),
      underline: resolveChromeValue(theme, activeVisual, p.title.underline, false),
      titleWrap: resolveChromeValue(theme, activeVisual, p.title.titleWrap, false),
    },
    subTitle: {
      show: resolveChromeValue(theme, activeVisual, p.subTitle.show, false),
      text: resolveChromeValue(theme, activeVisual, p.subTitle.text, ""),
      alignment: resolveChromeValue(theme, activeVisual, p.subTitle.alignment, "left"),
      heading: resolveChromeValue(theme, activeVisual, p.subTitle.heading, "Normal"),
      fontColor: resolveChromeValue(theme, activeVisual, p.subTitle.fontColor, base.muted),
      fontFamily: resolveChromeValue(theme, activeVisual, p.subTitle.fontFamily, base.fontFamily),
      fontSize: resolveChromeValue(theme, activeVisual, p.subTitle.fontSize, 10),
      bold: resolveChromeValue(theme, activeVisual, p.subTitle.bold, false),
      italic: resolveChromeValue(theme, activeVisual, p.subTitle.italic, false),
      underline: resolveChromeValue(theme, activeVisual, p.subTitle.underline, false),
      titleWrap: resolveChromeValue(theme, activeVisual, p.subTitle.titleWrap, false),
    },
    background: {
      show: resolveChromeValue(theme, activeVisual, p.background.show, false),
      color: resolveChromeValue(theme, activeVisual, p.background.color, base.background),
      transparency: resolveChromeValue(theme, activeVisual, p.background.transparency, 0),
    },
    border: {
      show: resolveChromeValue(theme, activeVisual, p.border.show, false),
      color: resolveChromeValue(theme, activeVisual, p.border.color, "#E3E3E3"),
      width: resolveChromeValue(theme, activeVisual, p.border.width, 1),
      radius: resolveChromeValue(theme, activeVisual, p.border.radius, 0),
    },
  };
}

export { chromeThemePath };
