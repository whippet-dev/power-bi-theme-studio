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
  /** Classic 2026's own value; the table's grid outline resolves through this. */
  tableAccent: "#118DFF",
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
 * A colour Power BI computes by mixing two root tokens.
 *
 * A third derivation mechanism, alongside a plain token reference and
 * `ThemeDataColor`'s tint/shade percentage. The table's gridlines and its
 * alternating row shading are both produced this way — they follow the
 * theme, so neither can be a constant, and neither is a tint of a single
 * token either.
 *
 * The maths is a plain linear interpolation in RGB with per-channel
 * `Math.round`, deliberately not gamma-corrected and deliberately not in
 * HSL. That is not a simplification: the "nicer" implementations land a
 * unit or two away and would fail to reproduce what Power BI draws.
 *
 * Established by forward prediction rather than by fitting. The percentages
 * were derived from one theme, then used to predict the two computed
 * colours under a second theme that changed only `background` and
 * `foreground` (`#FFE100` and `#0057FF`). Both predictions — `#E0D01F` at
 * 12% and `#EBD614` at 8% — matched the Format pane byte for byte, as did
 * four other values read in the same pass.
 *
 * `percent` is the distance travelled from `from` towards `to`, so
 * `blendNativeTokens(source, "background", "foreground", 0.12)` reads as
 * "twelve percent of the way from the background to the foreground".
 */
export function blendNativeTokens(
  source: ThemeSource,
  from: NativeTokenName,
  to: NativeTokenName,
  percent: number,
): string {
  const a = channels(nativeToken(source, from));
  const b = channels(nativeToken(source, to));
  const mixed = a.map((value, index) => Math.round(value + (b[index] - value) * percent));
  return "#" + mixed.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function channels(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * The two blends the table actually uses, named so a reader can tell them
 * apart from an arbitrary percentage.
 *
 * Both are scoped to the **Default** style preset, which is what a new table
 * gets. Under the "None" preset the same properties have no value at all,
 * and other presets were not measured. That scope does not affect what
 * Theme Studio writes — a theme's own value beats any preset, proven
 * directly — but it does mean these describe what an *unset* property looks
 * like on a default table, not an invariant of the visual.
 */
export const TABLE_BLEND = {
  /** Horizontal and vertical gridlines. */
  gridline: 0.12,
  /** The alternating row background. */
  alternatingRow: 0.08,
} as const;

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
  {
    property: "pieChart.dataPoint.fill",
    studioPaints: "dataColors[0]",
    evidence:
      "the Format pane shows the slice fill empty; Power BI colours slices per " +
      "category at draw time, but what it substitutes was not read",
  },
  {
    property: "card.labels.labelPrecision",
    studioPaints: "0 decimal places",
    evidence:
      "the Format pane's \"Value decimal places\" reads Auto, not a number, on a " +
      "fully expanded legacy Card; the preview needs a precision to format with",
  },
  {
    property: "tableEx.total.backColor",
    studioPaints: "the `background` token",
    evidence:
      "the Format pane shows the totals background empty under both the Default " +
      "and None style presets",
  },
] as const;
