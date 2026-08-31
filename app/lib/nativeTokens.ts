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
 * Properties the Format pane shows **empty**: Power BI has no default value
 * for them at all.
 *
 * Two different things are easy to conflate here, and conflating them is
 * how a theme ends up exporting values its author never chose:
 *
 * **A — the native default.** What Power BI's own Format pane reports as
 * the property's value when nothing has set it. For everything listed
 * below, that is *absent*. There is no colour to inherit, no token behind
 * it, and nothing for a theme to round-trip.
 *
 * **B — the effective rendering fallback.** What the preview paints when
 * the property is absent. A renderer cannot draw "nothing", so it needs a
 * colour, and Power BI itself picks one at draw time — the series palette
 * entry for a line stroke and its shade area, the visual's own background
 * behind a label. That choice is a *rendering* decision.
 *
 * The registries resolve B, because the preview has to paint something.
 * They must never be read as asserting A. The distinction is visible in
 * provenance rather than in the value: `resolvePropertyEntry` reports
 * `source: "fallback"` and `isSet: false` for every property here, which is
 * what keeps the editor showing it as unset and keeps the exporter from
 * materialising it. `PROPERTIES_WITHOUT_NATIVE_DEFAULT` records which
 * properties are in that position and what each one falls back to, so the
 * two can be checked against each other rather than assumed.
 */
export const PROPERTIES_WITHOUT_NATIVE_DEFAULT = [
  {
    property: "lineStyles.strokeColor",
    /** What the renderer paints instead, and why that is not a default. */
    renderFallback: "the series' palette entry, which Power BI also picks at draw time",
  },
  {
    property: "lineStyles.areaColor",
    renderFallback: "the series' stroke colour, per `shadeAreaMatchStrokeColor` being on",
  },
  {
    property: "labels.backgroundColor",
    renderFallback: "the visual background, so an enabled label plate is visible",
  },
  {
    property: "totals.backgroundColor",
    renderFallback: "the visual background, as for data labels",
  },
  {
    property: "title.backgroundColor",
    renderFallback: "the visual background, so the title plate is visible",
  },
] as const;
