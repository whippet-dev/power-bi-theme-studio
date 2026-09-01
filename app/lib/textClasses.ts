/**
 * Power BI's text-class system.
 *
 * A Power BI theme declares four *primary* text classes — `callout`,
 * `header`, `label`, `title` — and Power BI derives ten *secondary* classes
 * from them. Visuals then take their default typography from a named class:
 * an axis title from `title`, a visual title from `largeTitle`, and so on.
 * A theme that declares only the four primaries contains enough information
 * to derive every text class. It does not, by itself, describe which class
 * every visual property uses or replace Power BI's visual-capability defaults.
 *
 * `BASE_THEME_DIFFERENTIAL_AUDIT.md` found that Studio implemented none of
 * this: a typography property absent from `visualStyles` fell straight to a
 * literal `6` (66 properties across 9 registries) or `""` (72 properties).
 * Classic 2026 — a verbatim Power BI resource — omits many font sizes from
 * `visualStyles`; the effective defaults require this layer plus the semantic
 * role mapping below (and, for roles not yet modelled, visual defaults).
 *
 * The derivation below is not inferred from documentation. It is transcribed
 * from Power BI Desktop's own implementation: the function its assertion
 * string names `visualStyle > applyTextClassDefaults`, in
 * `bin/WebView2Resources/minerva/scripts/desktop.min.js` of the installed
 * app — the same source the base themes in `themes/base/` came from. See
 * `SECONDARY_CLASSES` for the rules and the audit for the evidence.
 *
 * Pure: no React, no DOM, no CSS, no renderer geometry, no per-visual
 * knowledge. It answers "what does this text class say?", never "what should
 * this chart draw?".
 */

import { themeFontFamilyToCss } from "./fontFamilies";
import { resolveColorValue, themeRoots, type ThemeSource } from "./properties";
import type { PowerBITheme } from "./theme";

/**
 * The size Power BI holds the chart chrome at, whatever the text classes say.
 *
 * Axis values, axis titles and legend text all read 9 in Desktop's own
 * font-size control under a theme setting `label` 13 / `title` 19, and read
 * 9 again under `label` 20 / `title` 30. Two points, no movement.
 */
export const NATIVE_CHROME_FONT_SIZE = 9;

/** Power BI's `foreground` when a theme declares none. */
const BUILT_IN_FOREGROUND = "#252423";

/** Every class Power BI's own table produces. */
export type TextClassName =
  | "callout"
  | "header"
  | "label"
  | "title"
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

/** The four a theme must declare; the rest are derived from these. */
export const PRIMARY_TEXT_CLASSES = ["callout", "header", "label", "title"] as const;
export type PrimaryTextClassName = (typeof PRIMARY_TEXT_CLASSES)[number];

/**
 * Where an effective field came from. Deliberately a separate type from
 * `PropertySource`: a text class is not a `visualStyles` lookup, and reusing
 * that vocabulary would report provenance that never happened.
 */
export type TextClassSource =
  /** The custom theme declared this field on this class. */
  | "custom-class"
  /** The base theme declared this field on this class. */
  | "base-class"
  /** Derived from the primary class, whose value the custom theme supplied. */
  | "custom-primary"
  /** Derived from the primary class, whose value the base theme supplied. */
  | "base-primary"
  /** A class-specific default: a light colour, or Power BI's built-in value. */
  | "derived-default";

export type ResolvedTextClass = {
  /** Exactly what the theme says. The editor and the exporter read this. */
  fontFamily: string;
  /**
   * The family Power BI would actually render, i.e. `fontFamily` after the
   * alias table where — and only where — Power BI applies it.
   *
   * `applyTextClassDefaults` aliases the four PRIMARY classes' `fontFace`
   * and nothing else. A secondary that inherits its primary therefore
   * inherits the already-expanded string, while a secondary that declares
   * its own face keeps it literal. Those two cases produce different CSS
   * from the same raw value, which is why the effective family has to be
   * carried rather than recomputed from the string later.
   */
  cssFontFamily: string;
  fontSize: number;
  /** Only the bold/semibold classes carry one; undefined means unspecified. */
  fontWeight: string | undefined;
  color: string;
  /** Per-field provenance, for tests and diagnostics. */
  source: {
    fontFamily: TextClassSource;
    fontSize: TextClassSource;
    fontWeight: TextClassSource;
    color: TextClassSource;
  };
};

/**
 * A text surface's three independently-resolvable typography channels.
 *
 * Power BI does not give a surface one text class. It gives it a family
 * from a class, a size from one of four rules, and a colour from either a
 * class or a root token — and those three choices do not have to agree.
 * The proof is the axis title: it renders in the `title` class's family and
 * colour at a size of exactly 9 that no class produces. A role modelled as
 * a single class name cannot express that, which is why this is a spec
 * rather than a lookup.
 *
 * Measured in Power BI Desktop against a diagnostic theme in which every
 * token and text class carries a unique colour, at two theme points
 * (`label` 13 / `title` 19 and `label` 20 / `title` 30) so that an
 * inherited size is distinguishable from a constant that merely matched:
 *
 * | surface | family | size | colour |
 * |---|---|---|---|
 * | visual title | title | title x 7/6 | title |
 * | small-multiple title | title | title x 1 | title |
 * | axis title | title | **fixed 9** | title |
 * | subtitle | label | label x 1 | foregroundNeutralSecondary |
 * | tooltip | label | label x 1 | **foreground** |
 * | data / total / series label | label | label x 0.9 | foregroundNeutralSecondary |
 * | axis values, legend | label | **fixed 9** | foregroundNeutralSecondary |
 *
 * The two overrides do NOT behave the same way, and the difference is
 * evidential rather than stylistic:
 *
 * - `fixedFontSize` wins over the class outright, including over a class a
 *   theme declared explicitly. The axis title renders at 9 under themes
 *   declaring `title` at 19 and at 30, so Power BI is not reading the class
 *   for this size at all.
 * - `color` yields to an explicitly declared class. Nothing measured shows
 *   a declared class colour being ignored, so the role only supplies one
 *   where the class was left to derive.
 *
 * Neither weakens theme precedence where it applies: an explicit
 * `visualStyles` value is resolved by the registries before either of these
 * is reached. See `resolveTextRole`.
 */
export type TextRoleSpec = {
  /** Supplies the family and weight, and — for colour — the declaration that can override. */
  class: TextClassName;
  /**
   * A size Power BI holds constant regardless of the text class.
   *
   * Only the chart chrome does this. It held at 9 across both theme points
   * while `label` moved 13 -> 20 and `title` moved 19 -> 30, so it ignores
   * both classes rather than deriving from either.
   */
  fixedFontSize?: number;
  /**
   * A root token that supplies the colour instead of the class's own.
   * `builtIn` is Power BI's value when the theme declares no such token.
   */
  color?: { token: string; builtIn: string };
};

/**
 * The semantic roles a visual can ask for.
 *
 * Kept here rather than in a chart registry because the mapping is Power
 * BI's, not any one visual's — a value axis label resolves identically on
 * every cartesian visual that has one. Renderers name a *role*; this module
 * owns how that role's three channels resolve.
 *
 * ## A recorded contradiction, deliberately not smoothed over
 *
 * The fixed 9 on `categoryAxisLabel` and `valueAxisLabel` contradicts the
 * earlier finding recorded in POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.15,
 * which reported the category axis moving 9pt -> 18pt when the theme's
 * primary text size went 10 -> 20, i.e. deriving as `label` x 0.9.
 *
 * Both were read from Power BI's own font-size control. The most likely
 * reconciliation is that the two experiments changed different things:
 * §5.15 describes raising "the report theme's primary text size", which in
 * Desktop's theme customiser is a global scale applied on top of the class
 * system, whereas the measurement encoded here set `textClasses.label`
 * directly in an imported theme JSON and moved nothing else. That would
 * make both observations true of different inputs.
 *
 * That reconciliation is a hypothesis, not evidence. What is evidence is
 * that under an imported theme setting `textClasses.label.fontSize`, the
 * axis does not move — measured twice — and an imported theme is what this
 * app produces. The §5.15 note is left in place rather than deleted.
 */
export const TEXT_ROLE_SPEC = {
  /** title x 7/6 — `largeTitle` already derives exactly this. */
  visualTitle: { class: "largeTitle" },
  /** title x 1, title colour. */
  smallMultipleTitle: { class: "title" },
  /** label x 1, foregroundNeutralSecondary — `lightLabel` derives both. */
  subtitle: { class: "lightLabel" },
  /** label x 1 family and size, but `foreground` rather than the light role. */
  tooltipText: { class: "lightLabel", color: { token: "foreground", builtIn: BUILT_IN_FOREGROUND } },
  /** label family and colour, size held at 9. */
  categoryAxisLabel: { class: "smallLightLabel", fixedFontSize: NATIVE_CHROME_FONT_SIZE },
  valueAxisLabel: { class: "smallLightLabel", fixedFontSize: NATIVE_CHROME_FONT_SIZE },
  legendText: { class: "lightLabel", fixedFontSize: NATIVE_CHROME_FONT_SIZE },
  /** title family and colour, size held at 9. */
  categoryAxisTitle: { class: "title", fixedFontSize: NATIVE_CHROME_FONT_SIZE },
  valueAxisTitle: { class: "title", fixedFontSize: NATIVE_CHROME_FONT_SIZE },
  /** label x 0.9, foregroundNeutralSecondary. */
  dataLabel: { class: "smallLightLabel" },
  totalLabel: { class: "smallLightLabel" },
  seriesLabel: { class: "smallLightLabel" },
  /**
   * The pie legend, which is NOT the cartesian legend.
   *
   * A separate role rather than a change to `legendText`, because both
   * measurements stand: a cartesian legend holds at 9 across themes setting
   * `label` to 13 and to 20, and a pie legend reads 13 and 20 under the
   * same two. The fixed 9 is real and specific to the cartesian chrome, so
   * widening `legendText` would break the visuals it was measured on.
   *
   * Deliberately the narrowest possible model: one extra role, no
   * family-scoped lookup and no conditional mechanism. Two visuals
   * disagreeing does not yet say which abstraction generalises, and a
   * second role costs nothing to replace later if a third case arrives.
   */
  pieLegendText: { class: "lightLabel" },
  /**
   * Table values, column headers and the grid's own text size.
   *
   * `lightLabel` supplies the `label` family at the class's own size; the
   * colour is then `foreground`, which is what the Format pane reports for
   * both the values and the header text.
   *
   * All four table text surfaces share this size rule — confirmed at
   * `label` 13 and 20, where every one of them read 13 and 20 in turn.
   */
  tableText: { class: "lightLabel", color: { token: "foreground", builtIn: BUILT_IN_FOREGROUND } },
  /**
   * Table totals, which take the `label` class's own colour rather than a
   * root token.
   *
   * The only surface measured anywhere that does so, which is why it is a
   * distinct role rather than sharing `tableText`. Using the primary class
   * directly is what gives it that colour: `label` carries its own, where
   * the light variants substitute a neutral.
   */
  tableTotalsText: { class: "label" },
  /** Not measured in the fingerprint sweep; left as it was. */
  referenceLineLabel: { class: "smallLabel" },
} as const satisfies Record<string, TextRoleSpec>;

export type TextRole = keyof typeof TEXT_ROLE_SPEC;

/**
 * Power BI's built-in text classes, used when a theme omits a primary.
 *
 * Transcribed from the same bundle's own defaults function. Note `callout`
 * at 45: that is the generic built-in, which Classic 2026 overrides to 24
 * and Fluent 2 to 21 — so this is a floor, not the value either base uses.
 */
const BUILT_IN_PRIMARIES: Record<PrimaryTextClassName, { fontFace: string; fontSize: number; color: string }> = {
  callout: { fontFace: "DIN", fontSize: 45, color: "#252423" },
  title: { fontFace: "DIN", fontSize: 12, color: "#252423" },
  header: { fontFace: "Segoe UI Semibold", fontSize: 12, color: "#252423" },
  label: { fontFace: "Segoe UI", fontSize: 10, color: "#252423" },
};

/**
 * The weights the two weight-bearing classes derive.
 *
 * CSS numerics, not the words: the enum beside `applyTextClassDefaults` in
 * the same bundle module reads `e.Bold="700", e.Semibold="600"`. A theme
 * that declares `"fontWeight": "bold"` itself keeps that string verbatim —
 * only the derived value is normalised.
 */
const BOLD = "700";
const SEMIBOLD = "600";

/** Power BI's fallback when a theme declares no `foregroundNeutralSecondary`. */
const BUILT_IN_NEUTRAL_SECONDARY = "#605E5C";

/**
 * How each secondary class derives from its primary.
 *
 * Straight from `applyTextClassDefaults`, whose table reads
 * `d(t.<secondary>, t.<primary>, <colorDefault>, <sizeScale>, <weight>)`:
 *
 * - `from` — the primary it derives from.
 * - `scale` — multiplies the primary's font size. Power BI rounds to one
 *   decimal (`Math.round(size * scale * 10) / 10`), and the factor is
 *   applied to whatever the primary actually is, so a custom `label` of 14
 *   makes `smallLabel` 12.6 rather than any fixed number.
 * - `lightColor` — when true the colour comes from the theme's
 *   `foregroundNeutralSecondary`, *not* from the primary's colour. This is
 *   the "light" in `lightLabel`, and it wins over the primary because Power
 *   BI passes it as the `i` argument, which is checked first.
 * - `weight` — the classes that exist to be bold or semibold.
 *
 * Corroborated independently by a private real-world theme, authored against
 * Classic 2026 and hard-codes the values this table produces:
 * `largeLabel` 12 = label 10 × 1.2, `largeTitle` 14 = title 12 × 7/6, and
 * `lightLabel.color` `#605E5C` = Classic 2026's `foregroundNeutralSecondary`
 * exactly.
 */
const SECONDARY_CLASSES: Record<
  Exclude<TextClassName, PrimaryTextClassName>,
  { from: PrimaryTextClassName; scale?: number; lightColor?: true; dataColor?: true; weight?: string }
> = {
  largeTitle: { from: "title", scale: 7 / 6 },
  dataTitle: { from: "title", dataColor: true },
  boldLabel: { from: "label", weight: BOLD },
  largeLabel: { from: "label", scale: 1.2 },
  largeLightLabel: { from: "label", scale: 1.2, lightColor: true },
  lightLabel: { from: "label", lightColor: true },
  semiboldLabel: { from: "label", weight: SEMIBOLD },
  smallLabel: { from: "label", scale: 0.9 },
  smallLightLabel: { from: "label", scale: 0.9, lightColor: true },
  smallDataLabel: { from: "label", scale: 0.9, dataColor: true },
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** One layer's declaration of one class, or undefined if it has none. */
function classIn(theme: PowerBITheme | undefined, name: string): Record<string, unknown> | undefined {
  const value = theme?.textClasses?.[name];
  return isRecord(value) ? value : undefined;
}

/**
 * A field read across the two layers, custom first.
 *
 * Per *field*, not per class: Power BI merges the theme over the base and
 * only then fills the gaps, so a base class declaring one field and a custom
 * class declaring another must combine rather than one replacing the other
 * wholesale.
 */
function layered<T>(
  custom: Record<string, unknown> | undefined,
  base: Record<string, unknown> | undefined,
  field: string,
  read: (raw: unknown, theme: PowerBITheme) => T | undefined,
  /** The MERGED roots, used to interpret whichever layer the field came from. */
  roots: PowerBITheme,
): { value: T; fromCustom: boolean } | undefined {
  const fromCustom = custom === undefined ? undefined : read(custom[field], roots);
  if (fromCustom !== undefined) return { value: fromCustom, fromCustom: true };
  const fromBase = base === undefined ? undefined : read(base[field], roots);
  if (fromBase !== undefined) return { value: fromBase, fromCustom: false };
  return undefined;
}

const readFace = (raw: unknown): string | undefined =>
  typeof raw === "string" && raw.trim() ? raw : undefined;

const readSize = (raw: unknown): number | undefined => {
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const readWeight = (raw: unknown): string | undefined =>
  typeof raw === "string" && raw.trim() ? raw : undefined;

/**
 * A text-class colour: a bare hex string, or the name of one of the theme's
 * root colours.
 *
 * `theme` here is always the MERGED root view, never the layer the field was
 * found in. Where a declaration lives and what its tokens mean are separate
 * axes: a base class saying `"color": "foregroundNeutralSecondary"` must
 * pick up a custom theme's override of that token, and a custom class may
 * name a token only the base defines. `readVisualStyleValue` already
 * resolves `visualStyles` colours this way; text classes now match.
 */
const readColor = (raw: unknown, theme: PowerBITheme): string | undefined => {
  if (typeof raw === "string") {
    if (HEX_COLOR.test(raw)) return raw;
    const token = theme[raw];
    return typeof token === "string" && HEX_COLOR.test(token) ? token : undefined;
  }
  return resolveColorValue(raw as never, theme);
};

/**
 * One of the theme's root colour tokens, custom over base, over Power BI's
 * own value.
 *
 * `roots` is already the custom-over-base merge, so there is no second
 * precedence rule to get wrong here.
 */
function rootToken(source: ThemeSource, token: string, builtIn: string): string {
  const raw = themeRoots(source)[token];
  return typeof raw === "string" && HEX_COLOR.test(raw) ? raw : builtIn;
}

/** `foregroundNeutralSecondary`, custom over base, over Power BI's own. */
function neutralSecondary(source: ThemeSource): string {
  return rootToken(source, "foregroundNeutralSecondary", BUILT_IN_NEUTRAL_SECONDARY);
}

function layersOf(source: ThemeSource): { custom: PowerBITheme; base: PowerBITheme | undefined } {
  const layers = source as { kind?: string; custom?: PowerBITheme; base?: PowerBITheme };
  return layers.kind === "layers"
    ? { custom: layers.custom as PowerBITheme, base: layers.base }
    : { custom: source as PowerBITheme, base: undefined };
}

/**
 * Resolves one text class to a concrete style, with per-field provenance.
 *
 * A primary resolves from the theme layers directly. A secondary resolves
 * field by field: its own declaration first (custom layer, then base), and
 * only where it is silent does the derivation from its primary run. That
 * ordering is what makes Power BI's promise work — changing `label` moves
 * every label-derived class that has not overridden the field — while still
 * letting a theme pin an individual secondary.
 */
export function resolveTextClass(source: ThemeSource, name: TextClassName): ResolvedTextClass {
  const { custom, base } = layersOf(source);
  // Layers decide WHERE a field is declared; roots decide what its tokens
  // mean. Keeping them separate is the whole point — see readColor.
  const roots = themeRoots(source);
  const rule = SECONDARY_CLASSES[name as Exclude<TextClassName, PrimaryTextClassName>];
  const primaryName: PrimaryTextClassName = rule ? rule.from : (name as PrimaryTextClassName);

  // Read the class's own declaration whether or not it is a secondary: a
  // primary declaring `fontWeight` must resolve too, and for a primary these
  // are simply the same object as the primary lookup below.
  const ownCustom = classIn(custom, name);
  const ownBase = classIn(base, name);
  const primaryCustom = classIn(custom, primaryName);
  const primaryBase = classIn(base, primaryName);
  const builtIn = BUILT_IN_PRIMARIES[primaryName];

  // --- font family -------------------------------------------------------
  const ownFace = layered(ownCustom, ownBase, "fontFace", readFace, roots);
  const primaryFace = layered(primaryCustom, primaryBase, "fontFace", readFace, roots);
  const fontFamily = ownFace?.value ?? primaryFace?.value ?? builtIn.fontFace;
  // Aliased only when the family is the primary's — either because this IS
  // a primary class, or because a secondary inherited it. A face the
  // secondary declared itself never reaches Power BI's lookup.
  const aliasApplies = rule === undefined || ownFace === undefined;
  const cssFontFamily = aliasApplies ? themeFontFamilyToCss(fontFamily) : fontFamily;
  const fontFamilySource: TextClassSource = ownFace
    ? ownFace.fromCustom
      ? "custom-class"
      : "base-class"
    : primaryFace
      ? primaryFace.fromCustom
        ? "custom-primary"
        : "base-primary"
      : "derived-default";

  // --- font size ---------------------------------------------------------
  const ownSize = layered(ownCustom, ownBase, "fontSize", readSize, roots);
  const primarySize = layered(primaryCustom, primaryBase, "fontSize", readSize, roots);
  const basisSize = primarySize?.value ?? builtIn.fontSize;
  // Power BI rounds the scaled size to one decimal place.
  const scaled = rule?.scale === undefined ? basisSize : Math.round(basisSize * rule.scale * 10) / 10;
  const fontSize = ownSize?.value ?? scaled;
  const fontSizeSource: TextClassSource = ownSize
    ? ownSize.fromCustom
      ? "custom-class"
      : "base-class"
    : primarySize
      ? primarySize.fromCustom
        ? "custom-primary"
        : "base-primary"
      : "derived-default";

  // --- font weight -------------------------------------------------------
  // Power BI's rule, from the guard `if (e.fontWeight == null && r != null)`
  // in applyTextClassDefaults: an explicitly declared weight always wins,
  // and otherwise a weight is only supplied for the two classes that exist
  // to carry one. An ordinary secondary — lightLabel, smallLabel,
  // largeLabel — does NOT inherit its primary's weight, because `r` is
  // undefined for those and the whole block is skipped. A primary carries
  // whatever it declares, since primaries bypass the helper entirely.
  const ownWeight = layered(ownCustom, ownBase, "fontWeight", readWeight, roots);
  const fontWeight = ownWeight?.value ?? rule?.weight;
  const fontWeightSource: TextClassSource = ownWeight
    ? ownWeight.fromCustom
      ? "custom-class"
      : "base-class"
    : "derived-default";

  // --- colour ------------------------------------------------------------
  // The class-specific default wins over the primary's colour, not the other
  // way round: Power BI checks it first, which is what makes a light class
  // light even when `label` is near-black.
  const ownColor = layered(ownCustom, ownBase, "color", readColor, roots);
  const primaryColor = layered(primaryCustom, primaryBase, "color", readColor, roots);
  let color: string;
  let colorSource: TextClassSource;
  if (ownColor) {
    color = ownColor.value;
    colorSource = ownColor.fromCustom ? "custom-class" : "base-class";
  } else if (rule?.lightColor) {
    color = neutralSecondary(source);
    colorSource = "derived-default";
  } else if (rule?.dataColor) {
    const palette = Array.isArray(roots.dataColors) ? roots.dataColors : [];
    const first = typeof palette[0] === "string" && HEX_COLOR.test(palette[0]) ? (palette[0] as string) : undefined;
    color = first ?? primaryColor?.value ?? builtIn.color;
    colorSource = first ? "derived-default" : primaryColor ? (primaryColor.fromCustom ? "custom-primary" : "base-primary") : "derived-default";
  } else if (primaryColor) {
    color = primaryColor.value;
    colorSource = primaryColor.fromCustom ? "custom-primary" : "base-primary";
  } else {
    color = builtIn.color;
    colorSource = "derived-default";
  }

  return {
    fontFamily,
    cssFontFamily,
    fontSize,
    fontWeight,
    color,
    source: {
      fontFamily: fontFamilySource,
      fontSize: fontSizeSource,
      fontWeight: fontWeightSource,
      color: colorSource,
    },
  };
}

/**
 * Whether a field came from a text class someone actually declared, as
 * opposed to being derived from a primary or filled in by Power BI.
 */
const isDeclared = (source: TextClassSource): boolean =>
  source === "custom-class" || source === "base-class";

/**
 * The style for a semantic role, resolving family, size and colour
 * independently.
 *
 * The class supplies all three to begin with, and the role's spec then
 * replaces the size and colour where Power BI does not take them from the
 * class. The two replacements differ in how far they go — the fixed size
 * wins outright, the token colour yields to a declared class — for the
 * reasons given on `TextRoleSpec` and restated at each branch below.
 *
 * Either way an explicit `visualStyles` value still wins: the registries
 * resolve that first and only fall through to this when no theme layer
 * spoke. This narrows what the text-class system is claimed to control
 * without weakening theme precedence.
 */
export function resolveTextRole(source: ThemeSource, role: TextRole): ResolvedTextClass {
  const spec: TextRoleSpec = TEXT_ROLE_SPEC[role];
  const resolved = resolveTextClass(source, spec.class);

  /**
   * The fixed size wins over the text class outright, including over a
   * class the theme declared explicitly.
   *
   * That asymmetry with colour below is not an oversight. It is what was
   * measured: the axis title renders at 9 under themes declaring `title` at
   * 19 and at 30, so Power BI is not consulting the class for this size at
   * all — honouring a declaration would reproduce a resolution the product
   * does not perform. Theme precedence is untouched where it does apply:
   * an explicit `visualStyles` font size is resolved by the registries
   * before this value is ever reached, and still wins.
   */
  const useFixedSize = spec.fixedFontSize !== undefined;
  /**
   * Colour is the conservative case. Nothing measured shows Power BI
   * ignoring a declared class colour — the role simply names a different
   * source when the class was left to derive — so an explicit declaration
   * is still honoured here.
   */
  const useTokenColor = spec.color !== undefined && !isDeclared(resolved.source.color);
  if (!useFixedSize && !useTokenColor) return resolved;

  return {
    ...resolved,
    fontSize: useFixedSize ? (spec.fixedFontSize as number) : resolved.fontSize,
    color: useTokenColor ? rootToken(source, spec.color!.token, spec.color!.builtIn) : resolved.color,
    source: {
      ...resolved.source,
      fontSize: useFixedSize ? "derived-default" : resolved.source.fontSize,
      color: useTokenColor ? "derived-default" : resolved.source.color,
    },
  };
}
