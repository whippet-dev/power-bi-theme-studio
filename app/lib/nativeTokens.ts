/**
 * The root colour tokens Power BI actually reads, and what it falls back to.
 *
 * Every entry here was proven by measurement rather than inferred from a
 * name. A diagnostic theme gave each root token, each palette entry and each
 * text class a unique, hue-separated colour — verified collision-free under
 * tint and shade — and each value below was then read back from Power BI
 * Desktop's own Format pane and matched to the fingerprint that produced it.
 *
 * Two of the results are counter-intuitive enough to be worth stating
 * outright, because both were previously modelled the obvious way and both
 * were wrong:
 *
 * - **`background` does not paint the visual container.** It paints the
 *   *tooltip* background. The visual container's background is a capability
 *   constant (`#FFFFFF`) that no theme token reaches.
 * - **Mark borders, gridlines and light text are three different tokens** —
 *   `foregroundNeutralSecondary`, `secondaryBackground` and
 *   `foregroundNeutralSecondary` respectively — not one shared neutral, and
 *   none of them is the `#E3E3E3` this app used to assume.
 *
 * The built-in values are Power BI's own, used only when a theme declares
 * no such token. They are not colours this app chose.
 */

import { themeRoots, type ThemeSource } from "./properties";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Power BI's values for the tokens below when a theme omits them.
 *
 * `foregroundNeutralSecondary` matches Classic 2026 exactly, which is what
 * made the old hard-coded `#605E5C` look right for that one base theme
 * while being wrong for every other.
 */
const BUILT_IN = {
  foreground: "#252423",
  foregroundNeutralSecondary: "#605E5C",
  background: "#FFFFFF",
  backgroundDark: "#605E5C",
  secondaryBackground: "#C8C6C4",
} as const;

export type NativeTokenName = keyof typeof BUILT_IN;

/** One root token, custom over base, over Power BI's own value. */
export function nativeToken(source: ThemeSource, name: NativeTokenName): string {
  const raw = themeRoots(source)[name];
  return typeof raw === "string" && HEX_COLOR.test(raw) ? raw : BUILT_IN[name];
}

/**
 * A palette entry, falling back to `foreground` as Power BI does when a
 * theme ships fewer data colours than a visual asks for.
 */
export function nativeDataColor(source: ThemeSource, index: number): string {
  const palette = themeRoots(source).dataColors;
  const entry = Array.isArray(palette) ? palette[index] : undefined;
  return typeof entry === "string" && HEX_COLOR.test(entry) ? entry : nativeToken(source, "foreground");
}

/**
 * A capability constant: a value Power BI hard-codes in the visual itself,
 * which no theme token reaches.
 *
 * These are distinguishable from token-resolved values in the Format pane by
 * their three-digit hex form (`#FFF`, `#000`, `#333`), which is how they
 * were separated from theme-derived colours during the sweep. Named rather
 * than inlined so that a reader can tell "Power BI hard-codes this" from
 * "we could not establish where this comes from".
 */
export const CAPABILITY_COLOR = {
  /** The visual container background. NOT the `background` token. */
  visualBackground: "#FFFFFF",
  /** The visual container border. */
  visualBorder: "#000000",
  /** Header icon glyph. */
  headerIcon: "#333333",
  /** Header icon background and border. */
  headerIconBackground: "#FFFFFF",
} as const;

/**
 * Properties measured as having **no default value at all** — the Format
 * pane shows them empty, not as a colour.
 *
 * Kept as a named export rather than a comment because the distinction is
 * load-bearing: substituting black, white or a token for one of these
 * asserts a default Power BI does not have, and the resulting theme would
 * export a value the user never chose. Callers resolve these to `undefined`
 * and let the renderer decide what to draw.
 */
export const NO_NATIVE_DEFAULT = [
  "lines.strokeColor",
  "shadeArea.shadeAreaColor",
  "labels.background.backgroundColor",
  "totals.background.backgroundColor",
  "title.text.backgroundColor",
] as const;
