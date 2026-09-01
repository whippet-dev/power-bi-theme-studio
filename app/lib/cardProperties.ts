import type { ThemeSource } from "./properties";
import {
  boolProp,
  colorProp,
  enumProp,
  numberProp,
  propertyThemePath,
  resolvePropertyValue,
  textProp,
} from "./properties";
import { resolveTextRole } from "./textClasses";

/**
 * Card property registry, pinned to Microsoft's published schema
 * reportThemeSchema-2.156.json (microsoft/powerbi-desktop-samples).
 * Grouped exactly as Power BI Desktop's own format pane groups them
 * (Category label, Data label, General, Word wrap), so the property panel
 * and Microsoft's own UI stay recognisable to each other. Every field the
 * schema exposes for this visual is covered — nothing was skipped.
 *
 * Shared "visual chrome" groups common to every visual (title, background,
 * border, ...) are out of scope here, matching Table/Bar chart precedent —
 * this registry covers only what's specific to the Card visual.
 */

export const CARD_PROPERTIES = {

  categoryLabels: {
    show: boolProp("card", "card.categoryLabels.show", "Show", "Whether the category label is shown.", ["categoryLabels", 0, "show"], undefined),
    bold: boolProp("card", "card.categoryLabels.bold", "Bold", "Whether the category label's text is bold.", ["categoryLabels", 0, "bold"], undefined),
    color: colorProp("card", "card.categoryLabels.color", "Color", "Select color for data labels", ["categoryLabels", 0, "color"], undefined),
    fontFamily: textProp("card", "card.categoryLabels.fontFamily", "Font family", "The typeface used for the category label.", ["categoryLabels", 0, "fontFamily"], undefined),
    fontSize: numberProp("card", "card.categoryLabels.fontSize", "Text size", "Sets the category label's text size.", ["categoryLabels", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("card", "card.categoryLabels.italic", "Italic", "Whether the category label's text is italic.", ["categoryLabels", 0, "italic"], undefined),
    underline: boolProp("card", "card.categoryLabels.underline", "Underline", "Whether the category label's text is underlined.", ["categoryLabels", 0, "underline"], undefined),
  },

  labels: {
    bold: boolProp("card", "card.labels.bold", "Bold", "Whether the data label's text is bold.", ["labels", 0, "bold"], undefined),
    color: colorProp("card", "card.labels.color", "Color", "Select color for data labels", ["labels", 0, "color"], undefined),
    fontFamily: textProp("card", "card.labels.fontFamily", "Font family", "The typeface used for the data label.", ["labels", 0, "fontFamily"], undefined),
    fontSize: numberProp("card", "card.labels.fontSize", "Text size", "Sets the data label's text size.", ["labels", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("card", "card.labels.italic", "Italic", "Whether the data label's text is italic.", ["labels", 0, "italic"], undefined),
    labelDisplayUnits: enumProp("card", "card.labels.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    labelPrecision: numberProp("card", "card.labels.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "labelPrecision"], 0, 10, undefined),
    preserveWhitespace: boolProp("card", "card.labels.preserveWhitespace", "Source spacing", "Display any extra spaces in the data label", ["labels", 0, "preserveWhitespace"], undefined),
    underline: boolProp("card", "card.labels.underline", "Underline", "Whether the data label's text is underlined.", ["labels", 0, "underline"], undefined),
  },

  general: {
    formatString: textProp("card", "card.general.formatString", "Format string", "The number format code applied to the value (e.g. #,0.00 or 0%).", ["general", 0, "formatString"], undefined),
  },

  wordWrap: {
    show: boolProp("card", "card.wordWrap.show", "Show", "Whether the category label is shown.", ["wordWrap", 0, "show"], undefined),
  },
} as const;

export type ResolvedCardStyle = {
  categoryLabels: {
    show: boolean;
    bold: boolean;
    color: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    underline: boolean;
  };
  labels: {
    bold: boolean;
    color: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    labelDisplayUnits: string | number;
    labelPrecision: number;
    preserveWhitespace: boolean;
    underline: boolean;
  };
  general: {
    formatString: string;
  };
  wordWrap: {
    show: boolean;
  };
};

/**
 * Resolves every legacy Card property to its theme override, falling back to
 * the values Power BI's own Format pane reports when nothing has set them.
 *
 * This docblock used to say the fallbacks came from the shared theme tokens —
 * palette, background, foreground. Measurement showed none of them do. Both
 * of the visual's text surfaces resolve entirely through text classes: the
 * big value is the `callout` primary class in full, and the category label is
 * `largeLightLabel` in full. Everything else is either a plain native
 * constant or an explicit `visualStyles` entry.
 *
 * That is why there is no `ResolvedTheme` parameter. The legacy Card is the
 * only registry measured that reads no root colour token directly and no
 * palette entry, so it has nothing to ask a resolved theme for.
 */
export function resolveCardStyle(theme: ThemeSource): ResolvedCardStyle {
  const p = CARD_PROPERTIES;
  /**
   * The big value is the `callout` class in full, and the category label is
   * `largeLightLabel` in full. Both proven at two theme points.
   *
   * These previously came from `ResolvedTheme.callout*` and
   * `.categoryLabelColor`, which read the raw text-class declarations. That
   * captured the colours but not the families or the x 1.2 scale, because a
   * theme declaring only the four primaries has no `largeLightLabel` entry to
   * read — the derivation has to run. Going through the role resolver runs it.
   */
  const valueText = resolveTextRole(theme, "cardValue");
  const categoryLabelText = resolveTextRole(theme, "cardCategoryLabel");
  return {
    categoryLabels: {
      show: resolvePropertyValue(theme, p.categoryLabels.show, true),
      bold: resolvePropertyValue(theme, p.categoryLabels.bold, false),
      // Card's category label isn't styled from a structural colour token —
      // it's the "largeLightLabel" text class, which Microsoft's docs list
      // as covering "Card category labels" specifically. Verified against
      // a private real-world theme: it sets largeLightLabel.color explicitly
      // to the #605E5C they report seeing on Card, while leaving the
      // structural fourthLevelElements token (this app's previous, wrong
      // source for this field) unset entirely.
      color: resolvePropertyValue(theme, p.categoryLabels.color, categoryLabelText.color),
      fontFamily: resolvePropertyValue(theme, p.categoryLabels.fontFamily, categoryLabelText.fontFamily),
      fontSize: resolvePropertyValue(theme, p.categoryLabels.fontSize, categoryLabelText.fontSize),
      italic: resolvePropertyValue(theme, p.categoryLabels.italic, false),
      underline: resolvePropertyValue(theme, p.categoryLabels.underline, false),
    },
    labels: {
      bold: resolvePropertyValue(theme, p.labels.bold, false),
      // Verified against the same real report: the big value's colour is
      // the global textClasses.callout colour, not the first data colour.
      color: resolvePropertyValue(theme, p.labels.color, valueText.color),
      fontFamily: resolvePropertyValue(theme, p.labels.fontFamily, valueText.fontFamily),
      // Card's big value is typically much larger than other visuals' text —
      // matches textClasses.callout's own verified Classic 2026 default
      // (this per-visual override wins over that global default when set).
      fontSize: resolvePropertyValue(theme, p.labels.fontSize, valueText.fontSize),
      italic: resolvePropertyValue(theme, p.labels.italic, false),
      labelDisplayUnits: resolvePropertyValue(theme, p.labels.labelDisplayUnits, 0),
      // No native default: the pane reads "Auto", not a number. The 0 below is
      // only what the preview formats with — see PROPERTIES_WITHOUT_NATIVE_DEFAULT.
      labelPrecision: resolvePropertyValue(theme, p.labels.labelPrecision, 0),
      preserveWhitespace: resolvePropertyValue(theme, p.labels.preserveWhitespace, true),
      underline: resolvePropertyValue(theme, p.labels.underline, false),
    },
    general: {
      formatString: resolvePropertyValue(theme, p.general.formatString, ""),
    },
    wordWrap: {
      show: resolvePropertyValue(theme, p.wordWrap.show, false),
    },
  };
}

export { propertyThemePath };
