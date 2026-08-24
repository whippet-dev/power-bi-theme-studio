import { resolvePropertyEntry, type PropertyLookup, type ThemeSource } from "./properties";

/**
 * Power BI's font-face alias table.
 *
 * A theme writes `"fontFace": "Segoe UI"`. Power BI does not put that string
 * in the CSS — it expands a small, finite set of names into full font stacks,
 * so the renderer degrades sensibly when the named face is unavailable.
 *
 * **Transcribed from the runtime, not guessed.** Power BI Desktop
 * 2.157.879.0 (26.08) ships the table in
 * `bin/WebView2Resources/minerva/scripts/desktop.min.js`, module 468595:
 *
 * ```js
 * class FamilyInfo {
 *   constructor(families) { this.families = families }
 *   get family() { return this.families.join(", ") }
 *   get css()    { return this.families.map(e => e.indexOf(" ") > -1 ? `'${e}'` : e).join(", ") }
 * }
 * const H1 = { "Segoe UI": regular, "Segoe UI Semibold": semibold, DIN: regularSecondary, … }
 * ```
 *
 * and looks it up in `applyTextClassDefaults` (module 797633) with:
 *
 * ```js
 * function u(e) { const t = n.H1[e]; return t ? t.family : e }
 * ```
 *
 * Note `.family`, not `.css`: the value Power BI actually renders is the
 * **unquoted** comma-joined list. That is valid CSS — an unquoted family name
 * may be a sequence of identifiers — so this reproduces it exactly rather
 * than "tidying" it into the quoted form.
 *
 * The table has exactly ten entries. Everything else — Arial, Calibri,
 * Georgia, a custom corporate face — passes through untouched, and matching
 * is an ordinary object lookup, so it is case- and whitespace-sensitive.
 *
 * **The `wf_*` members need fonts Power BI ships.** Its own CSS declares
 * `@font-face { font-family: wf_segoe-ui_normal; src: local('Segoe UI'), …
 * url(../fonts/SegoeUI-Regular-final.woff) … }`. Theme Studio does not and
 * must not vendor those files. Emitting the stack is still right: the first
 * member is the real family name, so a machine with the font resolves it
 * exactly as Power BI does, and everything else falls through to helvetica /
 * arial / sans-serif. `DIN` and `DIN Light` are the two with no real first
 * member — they map to
 * `wf_standard-font*`, which is why DIN text lands on helvetica/arial here
 * rather than on the browser's default face.
 *
 * Pure: no React, no DOM, no theme reading, no per-visual knowledge.
 */

/** The seven distinct stacks the ten table entries point at. */
const STACKS = {
  light: ["Segoe UI Light", "wf_segoe-ui_light", "helvetica", "arial", "sans-serif"],
  semilight: ["Segoe UI Semilight", "wf_segoe-ui_semilight", "helvetica", "arial", "sans-serif"],
  regular: ["Segoe UI", "wf_segoe-ui_normal", "helvetica", "arial", "sans-serif"],
  semibold: ["Segoe UI Semibold", "wf_segoe-ui_semibold", "helvetica", "arial", "sans-serif"],
  bold: ["Segoe UI Bold", "wf_segoe-ui_bold", "helvetica", "arial", "sans-serif"],
  lightSecondary: ["wf_standard-font_light", "helvetica", "arial", "sans-serif"],
  regularSecondary: ["wf_standard-font", "helvetica", "arial", "sans-serif"],
} as const;

/**
 * Power BI's `H1` map, verbatim.
 *
 * `Segoe UI Semibold` is its own entry with its own stack — a *family* alias,
 * entirely separate from `fontWeight`. Asking for semibold text is not the
 * same as asking for the semibold family, and Power BI keeps the two axes
 * apart; so does this.
 */
export const FONT_FAMILY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "Segoe UI Light": STACKS.light,
  "Segoe UI Semilight": STACKS.semilight,
  "Segoe UI": STACKS.regular,
  "Segoe UI Semibold": STACKS.semibold,
  "Segoe (Bold)": STACKS.bold,
  "Segoe UI Bold": STACKS.bold,
  DIN: STACKS.regularSecondary,
  "DIN Light": STACKS.lightSecondary,
  Heading: STACKS.light,
  Body: STACKS.regular,
};

/**
 * A theme font family as the CSS font-family Power BI would render.
 *
 * Aliased names become their stack; everything else is returned unchanged.
 * That "unchanged" is load-bearing in three ways:
 *
 * - an unknown or custom family (`My Company Sans`) is never decorated with
 *   invented fallbacks — Power BI does not add any, and inventing them would
 *   silently change which face a corporate theme renders in;
 * - a value that is **already a stack** (Fluent 2 ships
 *   `'Segoe UI', wf_segoe-ui_normal, …` directly in `visualStyles`) is not a
 *   key in the table, so it cannot be double-expanded into a malformed list;
 * - matching is exact, so `segoe ui` and ` Segoe UI ` pass through, exactly
 *   as they would in Power BI.
 *
 * A rendering-boundary conversion only. The resolved style objects, the
 * property editor and the exporter all keep the raw family: someone who
 * types `Segoe UI` still sees and exports `Segoe UI`.
 */
export function themeFontFamilyToCss(family: string): string {
  const stack = FONT_FAMILY_ALIASES[family];
  return stack ? stack.join(", ") : family;
}

/**
 * A font family in both the forms the app needs at once.
 *
 * `value` is what the theme says and what the editor and exporter must show.
 * `css` is what the preview should paint and measure with.
 */
export type EffectiveFontFamily = { value: string; css: string };

/**
 * Resolves a visual's font-family property to its raw and effective forms.
 *
 * The distinction is provenance, not spelling. Power BI runs the alias table
 * over the four primary text classes' `fontFace` and **nowhere else** — its
 * `visualStyles` reader takes the family straight from the property. So an
 * explicit `"DIN"` on a visual renders as literal `DIN`, while a `"DIN"`
 * inherited from `textClasses.title` renders as
 * `wf_standard-font, helvetica, arial, sans-serif`.
 *
 * Those are the same string with different meanings, which is exactly why
 * this reads `resolvePropertyEntry` rather than inspecting the value: only
 * the resolution chain knows whether a layer declared it or whether it fell
 * through to the text class. `source === "fallback"` is that answer.
 */
export function effectiveFontFamily(
  source: ThemeSource,
  definition: PropertyLookup<"text">,
  role: { fontFamily: string; cssFontFamily: string },
): EffectiveFontFamily {
  const entry = resolvePropertyEntry(source, definition, role.fontFamily);
  return entry.source === "fallback"
    ? { value: role.fontFamily, css: role.cssFontFamily }
    : { value: entry.value, css: entry.value };
}
