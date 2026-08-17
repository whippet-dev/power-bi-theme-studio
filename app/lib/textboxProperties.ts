import { colorProp, numberProp, propertyThemePath, resolvePropertyValue, textProp } from "./properties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * Textbox — a free-form rich-text canvas object, `visual-textbox` in the
 * schema. Its actual text content lives in `general.paragraphs`, a
 * polymorphic rich-text run structure ($ref, excluded — same "complex
 * nested object" rule as every other paragraphs/annotationTemplate field
 * in this app), and `values.expr`/`values.formatString` are a dynamic
 * data-bound value expression (excluded — instance content/binding, not a
 * stylable default, no schema title either). What's left is genuinely
 * small: the default font used before any per-run override.
 */
export const TEXTBOX_PROPERTIES = {
  text: {
    color: colorProp(
      "textbox",
      "textbox.text.color",
      "Default color",
      "The default text colour, before any per-run formatting overrides it.",
      ["text", 0, "color"],
    ),
    fontFamily: textProp(
      "textbox",
      "textbox.text.fontFamily",
      "Default font family",
      "The default typeface, before any per-run formatting overrides it.",
      ["text", 0, "fontFamily"],
    ),
    fontSize: numberProp(
      "textbox",
      "textbox.text.fontSize",
      "Default font size",
      "The default text size, before any per-run formatting overrides it.",
      ["text", 0, "fontSize"],
      8,
      60,
    ),
  },
} as const;

export type ResolvedTextboxStyle = {
  text: { color: string; fontFamily: string; fontSize: number };
};

export function resolveTextboxStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedTextboxStyle {
  const p = TEXTBOX_PROPERTIES;
  return {
    text: {
      color: resolvePropertyValue(theme, p.text.color, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.text.fontFamily, base.fontFamily),
      fontSize: resolvePropertyValue(theme, p.text.fontSize, 12),
    },
  };
}

export { propertyThemePath };
