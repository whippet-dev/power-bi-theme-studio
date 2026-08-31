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
 * **A — the native default.** What Power BI's own Format pane reports when
 * nothing has set the property. For everything listed below that is
 * *absent*: no colour, no token behind it, nothing for a theme to
 * round-trip. This is the part the fingerprint sweep actually measured.
 *
 * **B — what Theme Studio paints anyway.** The preview cannot draw
 * "nothing", so each resolver supplies a colour. Those choices are recorded
 * below as `studioPaints`, and they are **Theme Studio's**, not measured
 * Power BI behaviour. The sweep read the Format pane; it never established
 * what the renderer substitutes at draw time for an absent colour. Where a
 * choice does have evidence behind it, `evidence` says so; where it does
 * not, it says that too.
 *
 * Keeping B out of A is the whole point. The distinction lives in
 * provenance rather than in the value: `resolvePropertyEntry` reports
 * `source: "fallback"` and `isSet: false` for every property here, which is
 * what keeps the editor showing it unset and the exporter from writing it.
 *
 * Nothing here should be "corrected" to match a guess about Power BI's
 * renderer. If the draw-time fallback is ever measured, that is the point
 * at which `studioPaints` becomes a claim rather than a description.
 */
export const PROPERTIES_WITHOUT_NATIVE_DEFAULT = [
  {
    property: "lineStyles.strokeColor",
    studioPaints: "dataColors[0]",
    evidence:
      "unmeasured: Power BI colours series from the palette generally, but the sweep " +
      "did not read what it substitutes for an absent stroke colour",
  },
  {
    property: "lineStyles.areaColor",
    studioPaints: "dataColors[0]",
    evidence:
      "partial: shadeAreaMatchStrokeColor was measured ON, so the shade area follows " +
      "the stroke — but the stroke's own draw-time colour is itself unmeasured",
  },
  {
    property: "labels.backgroundColor",
    studioPaints: "the `background` token",
    evidence:
      "unmeasured. Note this is NOT the visual container background, which is the " +
      "capability constant in CAPABILITY_COLOR — under a theme that sets `background` " +
      "the two differ",
  },
  {
    property: "totals.backgroundColor",
    studioPaints: "the `background` token",
    evidence: "unmeasured, as for data labels",
  },
  {
    property: "title.backgroundColor",
    studioPaints: "the `background` token",
    evidence: "unmeasured, as for data labels",
  },
] as const;
