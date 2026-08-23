/**
 * Power BI's text-class system.
 *
 * A Power BI theme declares four *primary* text classes — `callout`,
 * `header`, `label`, `title` — and Power BI derives ten *secondary* classes
 * from them. Visuals then take their default typography from a named class:
 * an axis title from `title`, a category axis label from `lightLabel`, and
 * so on. A theme that declares only the four primaries is complete, because
 * everything else is derived.
 *
 * `BASE_THEME_DIFFERENTIAL_AUDIT.md` found that Studio implemented none of
 * this: a typography property absent from `visualStyles` fell straight to a
 * literal `6` (66 properties across 9 registries) or `""` (72 properties).
 * Classic 2026 — a verbatim Power BI file — declares *no* font size anywhere
 * in `visualStyles` precisely because it expects this layer to supply them.
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

import { resolveColorValue, themeRoots, type ThemeSource } from "./properties";
import type { PowerBITheme } from "./theme";

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
  fontFamily: string;
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
 * The semantic roles a visual can ask for, and the class each maps to.
 *
 * Kept here rather than in a chart registry because the mapping is Power
 * BI's, not any one visual's — a value axis label comes from
 * `smallLightLabel` on every cartesian visual that has one. Renderers name a
 * *role*; this module owns which class serves it.
 */
export const TEXT_ROLE_CLASS = {
  categoryAxisLabel: "lightLabel",
  categoryAxisTitle: "title",
  valueAxisLabel: "smallLightLabel",
  valueAxisTitle: "title",
  legendText: "lightLabel",
  dataLabel: "smallLightLabel",
  referenceLineLabel: "smallLabel",
} as const satisfies Record<string, TextClassName>;

export type TextRole = keyof typeof TEXT_ROLE_CLASS;

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
 * Corroborated independently by the private theme, which was authored against
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
  boldLabel: { from: "label", weight: "bold" },
  largeLabel: { from: "label", scale: 1.2 },
  largeLightLabel: { from: "label", scale: 1.2, lightColor: true },
  lightLabel: { from: "label", lightColor: true },
  semiboldLabel: { from: "label", weight: "semibold" },
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
  customTheme: PowerBITheme,
  baseTheme: PowerBITheme | undefined,
): { value: T; fromCustom: boolean } | undefined {
  const fromCustom = custom === undefined ? undefined : read(custom[field], customTheme);
  if (fromCustom !== undefined) return { value: fromCustom, fromCustom: true };
  const fromBase = base === undefined || baseTheme === undefined ? undefined : read(base[field], baseTheme);
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

/** A text-class colour is a bare hex string or a root-token reference. */
const readColor = (raw: unknown, theme: PowerBITheme): string | undefined => {
  if (typeof raw === "string") {
    if (HEX_COLOR.test(raw)) return raw;
    const token = theme[raw];
    return typeof token === "string" && HEX_COLOR.test(token) ? token : undefined;
  }
  return resolveColorValue(raw as never, theme);
};

/** `foregroundNeutralSecondary`, custom over base, over Power BI's own. */
function neutralSecondary(source: ThemeSource): { value: string; fromCustom: boolean } {
  const { custom, base } = layersOf(source);
  const read = (t: PowerBITheme | undefined) => {
    const raw = t?.foregroundNeutralSecondary;
    return typeof raw === "string" && HEX_COLOR.test(raw) ? raw : undefined;
  };
  const c = read(custom);
  if (c) return { value: c, fromCustom: true };
  const b = read(base);
  if (b) return { value: b, fromCustom: false };
  return { value: BUILT_IN_NEUTRAL_SECONDARY, fromCustom: false };
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
  const rule = SECONDARY_CLASSES[name as Exclude<TextClassName, PrimaryTextClassName>];
  const primaryName: PrimaryTextClassName = rule ? rule.from : (name as PrimaryTextClassName);

  const ownCustom = rule ? classIn(custom, name) : undefined;
  const ownBase = rule ? classIn(base, name) : undefined;
  const primaryCustom = classIn(custom, primaryName);
  const primaryBase = classIn(base, primaryName);
  const builtIn = BUILT_IN_PRIMARIES[primaryName];

  // --- font family -------------------------------------------------------
  const ownFace = layered(ownCustom, ownBase, "fontFace", readFace, custom, base);
  const primaryFace = layered(primaryCustom, primaryBase, "fontFace", readFace, custom, base);
  const fontFamily = ownFace?.value ?? primaryFace?.value ?? builtIn.fontFace;
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
  const ownSize = layered(ownCustom, ownBase, "fontSize", readSize, custom, base);
  const primarySize = layered(primaryCustom, primaryBase, "fontSize", readSize, custom, base);
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
  // Only the bold/semibold classes get one by derivation; every other class
  // leaves it unset unless the theme declares it.
  const ownWeight = layered(ownCustom, ownBase, "fontWeight", readWeight, custom, base);
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
  const ownColor = layered(ownCustom, ownBase, "color", readColor, custom, base);
  const primaryColor = layered(primaryCustom, primaryBase, "color", readColor, custom, base);
  let color: string;
  let colorSource: TextClassSource;
  if (ownColor) {
    color = ownColor.value;
    colorSource = ownColor.fromCustom ? "custom-class" : "base-class";
  } else if (rule?.lightColor) {
    const neutral = neutralSecondary(source);
    color = neutral.value;
    colorSource = "derived-default";
  } else if (rule?.dataColor) {
    const roots = themeRoots(source);
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

/** The style for a semantic role, via `TEXT_ROLE_CLASS`. */
export function resolveTextRole(source: ThemeSource, role: TextRole): ResolvedTextClass {
  return resolveTextClass(source, TEXT_ROLE_CLASS[role]);
}
