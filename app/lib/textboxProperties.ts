import type { ThemeSource } from "./properties";
import { colorProp, numberProp, propertyThemePath, resolvePropertyValue, textProp } from "./properties";
import { resolveTextRole } from "./textClasses";

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

export function resolveTextboxStyle(theme: ThemeSource): ResolvedTextboxStyle {
  const p = TEXTBOX_PROPERTIES;
  /**
   * The `label` class in full. Measured off the canvas and the inline
   * rich-text toolbar — a Text Box has no Visual tab, so there is no
   * Format-pane reading for any of this — and confirmed at two theme points.
   *
   * `base.foreground` and a literal 12 stood here before. The family was
   * already right by accident, `base.fontFamily` being the label family.
   */
  const text = resolveTextRole(theme, "textboxText");
  return {
    text: {
      color: resolvePropertyValue(theme, p.text.color, text.color),
      fontFamily: resolvePropertyValue(theme, p.text.fontFamily, text.fontFamily),
      fontSize: resolvePropertyValue(theme, p.text.fontSize, text.fontSize),
    },
  };
}

export { propertyThemePath };
