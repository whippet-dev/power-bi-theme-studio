import { tintOrShade } from "./colorUtils";
import { mergeThemeOverBase, type JsonValue, type PowerBITheme } from "./theme";

/**
 * Power BI theme JSON stores per-visual overrides at
 * `visualStyles[visualKey]["*"][propertyGroup][0][propertyName]`. The `"*"`
 * selector means "all instances of this visual type" (as opposed to a
 * specific visual's GUID) and is the only instance-selector this app writes.
 *
 * `visualKey` can also itself be `"*"` — Power BI's real schema permits
 * `visualStyles["*"]["*"][group][0][prop]` as a default that applies to
 * every visual type, overridden per-type by `visualStyles[specificType]["*"]`.
 * "Chrome" properties shared across all visuals (title, subtitle,
 * background, border — see app/lib/chromeProperties.ts) use this: reads
 * check the specific visual's override first, then fall back to the shared
 * `"*"` bucket, then to a plain default.
 *
 * Property coverage is pinned to Microsoft's published schema
 * reportThemeSchema-2.156.json (microsoft/powerbi-desktop-samples), not
 * guessed from example themes.
 */
export type VisualSchemaKey =
  | "tableEx"
  | "clusteredBarChart"
  | "clusteredColumnChart"
  | "barChart"
  | "columnChart"
  | "card"
  | "slicer"
  | "lineChart"
  | "pivotTable"
  | "pieChart"
  | "*"
  | "report"
  | "page"
  | "bookmarkNavigator"
  | "pageNavigator"
  | "shape"
  | "actionButton"
  | "textbox"
  | "image";

export type PropertyValueType = "color" | "number" | "boolean" | "text" | "enum";

export type EnumOption = { value: string | number; label: string };

type ValueForType<T extends PropertyValueType> = T extends "color"
  ? string
  : T extends "number"
    ? number
    : T extends "boolean"
      ? boolean
      : T extends "text"
        ? string
        : T extends "enum"
          ? string | number
          : never;

export type PropertyDefinition<T extends PropertyValueType = PropertyValueType> = {
  /** Stable internal id, e.g. "table.columnHeaders.backColor". */
  id: string;
  visual: VisualSchemaKey;
  valueType: T;
  /** Power BI display name, matched to the visual's real format-pane wording. */
  label: string;
  /** Plain-English explanation of what the setting affects, no schema jargon. */
  description: string;
  /** Practical consequence of changing the value, shown as supporting detail. */
  guidance?: string;
  /**
   * Optional sub-heading this property is clustered under within its group
   * (e.g. "Gridline", "Title" within the Y axis group). Undefined means it
   * renders in the group's unlabelled general cluster, alongside the
   * group's master enable/show toggle.
   */
  section?: string;
  /** Path within visualStyles[visual]["*"], e.g. ["columnHeaders", 0, "backColor"]. */
  path: Array<string | number>;
  min?: T extends "number" ? number : never;
  max?: T extends "number" ? number : never;
  options?: T extends "enum" ? readonly EnumOption[] : never;
};

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Power BI writes an 8-digit #RRGGBBAA when a colour has its own alpha
// (e.g. a "transparent" background) rather than relying solely on a
// separate `transparency` field — CSS supports that hex form natively.
const HEX_COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

export function readAtPath(root: JsonValue | undefined, path: Array<string | number>): JsonValue | undefined {
  let cursor: JsonValue | undefined = root;

  for (const part of path) {
    if (Array.isArray(cursor)) {
      cursor = typeof part === "number" ? cursor[part] : undefined;
    } else if (isRecord(cursor)) {
      cursor = cursor[part];
    } else {
      return undefined;
    }
  }

  return cursor;
}

/**
 * Turns any of Power BI's colour-value forms into a plain hex string,
 * resolved against the theme it appears in. Returns undefined for a shape
 * this app doesn't understand, so callers fall through to their own
 * default rather than rendering something invented.
 *
 * Three forms occur in real themes, and before this existed only the first
 * was handled — the other two silently produced a wrong colour:
 *
 *   { solid: { color: "#RRGGBB" } }          literal (also #RRGGBBAA)
 *   { solid: { color: "foregroundNeutral…" } } a named theme token
 *   { solid: { color: { expr: { ThemeDataColor: { ColorId, Percent } } } } }
 *
 * The token form is confirmed against Power BI Desktop's own code, which
 * resolves these via getThemeColor(theme, "foregroundNeutralSecondary").
 *
 * KNOWN AMBIGUITY — ThemeDataColor's ColorId indexing. This treats ColorId
 * as a 0-based index into `dataColors`, the literal reading of the field
 * name. That is *not* certain: Microsoft's Fluent 2 documentation says
 * buttons use "your first theme data color", yet Fluent 2's own JSON gives
 * every button ColorId 2 — reconcilable only if ColorId is offset (e.g. 0
 * and 1 being background/foreground). Both readings are defensible from
 * the evidence available; this one is isolated here so it is a one-line
 * change once settled against a real Power BI render.
 * Percent likewise follows the conventional reading (negative shades
 * toward black, positive tints toward white) — see tintOrShade.
 */
export function resolveColorValue(raw: JsonValue | undefined, theme: PowerBITheme): string | undefined {
  if (!isRecord(raw)) return undefined;
  const solid = raw.solid;
  if (!isRecord(solid)) return undefined;
  const color = solid.color;

  if (typeof color === "string") {
    if (HEX_COLOR.test(color)) return color;
    // A bare name is a reference to one of the theme's own root colours.
    const token = theme[color];
    return typeof token === "string" && HEX_COLOR.test(token) ? token : undefined;
  }

  if (isRecord(color)) {
    const expr = color.expr;
    if (!isRecord(expr)) return undefined;
    const themeDataColor = expr.ThemeDataColor;
    if (!isRecord(themeDataColor)) return undefined;

    const { ColorId, Percent } = themeDataColor;
    if (typeof ColorId !== "number") return undefined;

    const palette = theme.dataColors;
    if (!Array.isArray(palette)) return undefined;
    const base = palette[ColorId];
    if (typeof base !== "string" || !HEX_COLOR.test(base)) return undefined;

    return tintOrShade(base, typeof Percent === "number" ? Percent : 0);
  }

  return undefined;
}

/**
 * Reads a property's raw value from `theme.visualStyles[visual]["*"]`, if
 * present and well-formed.
 *
 * `roots` supplies the theme whose root-level colours and `dataColors` a
 * token reference or ThemeDataColor expression resolves against — which is
 * the *merged* view, not necessarily the layer the value was found in: a
 * token written in the base theme must pick up the user's overridden
 * palette. Defaults to `theme` for callers with no separate layers.
 */
export function readVisualStyleValue<T extends PropertyValueType>(
  theme: PowerBITheme,
  definition: Pick<PropertyDefinition<T>, "visual" | "path" | "valueType">,
  roots: PowerBITheme = theme,
): ValueForType<T> | undefined {
  const visualStyles = theme.visualStyles;
  if (!isRecord(visualStyles)) return undefined;

  const forAllInstances = readAtPath(visualStyles[definition.visual], ["*", ...definition.path]);

  switch (definition.valueType) {
    case "color":
      return resolveColorValue(forAllInstances, roots) as ValueForType<T> | undefined;
    case "number":
      return typeof forAllInstances === "number" && Number.isFinite(forAllInstances)
        ? (forAllInstances as ValueForType<T>)
        : undefined;
    case "boolean":
      return typeof forAllInstances === "boolean" ? (forAllInstances as ValueForType<T>) : undefined;
    case "text":
      return typeof forAllInstances === "string" ? (forAllInstances as ValueForType<T>) : undefined;
    case "enum":
      return typeof forAllInstances === "string" || typeof forAllInstances === "number"
        ? (forAllInstances as ValueForType<T>)
        : undefined;
    default:
      return undefined;
  }
}

/**
 * Where a resolved value came from, in Power BI's own precedence order:
 * every custom-theme match is considered before any base-theme match, so
 * the layer axis dominates the specificity axis.
 *
 * Style-preset buckets are a further step Power BI supports between these
 * and which this app does not yet read — see ARCHITECTURE_REVIEW.md §3.3.
 * They still round-trip untouched.
 */
export type PropertySource =
  | "custom-visual"
  | "custom-wildcard"
  | "base-visual"
  | "base-wildcard"
  | "fallback";

/**
 * A resolved value together with where it came from.
 *
 * `isSet` exists because the value alone cannot answer "did anyone
 * actually configure this?" — `false`, `0` and `""` are all legitimate
 * explicit settings that are indistinguishable from an unset property once
 * collapsed to a bare value. That ambiguity is what forced the renderer to
 * read raw theme JSON, and what repeatedly caused features to render as if
 * enabled when nothing had enabled them.
 */
export type ResolvedProperty<T> = {
  value: T;
  source: PropertySource;
  /** True when some theme layer set this explicitly, including to a falsey value. */
  isSet: boolean;
};

/**
 * Resolution reads the user's theme and the selected base theme as
 * *separate layers*, because collapsing them first destroys the provenance
 * this module reports — and, before that was understood, produced wrong
 * answers outright (a base visual-specific value beating a custom wildcard).
 *
 * `roots` is the merged root-level view (custom over base), used for
 * theme-token and `dataColors` lookups inside colour values, where
 * custom-over-base merging *is* the correct semantics.
 */
export type ThemeLayers = {
  readonly kind: "layers";
  custom: PowerBITheme;
  base?: PowerBITheme;
  roots: PowerBITheme;
};

/** Either a plain theme (no base layer) or an explicit custom/base pair. */
export type ThemeSource = PowerBITheme | ThemeLayers;

export function themeLayers(custom: PowerBITheme, base?: PowerBITheme): ThemeLayers {
  return { kind: "layers", custom, base, roots: base ? mergeThemeOverBase(base, custom) : custom };
}

function asLayers(source: ThemeSource): ThemeLayers {
  // `kind` is not a Power BI theme root property, so this cannot collide
  // with a real imported theme.
  return (source as ThemeLayers).kind === "layers"
    ? (source as ThemeLayers)
    : { kind: "layers", custom: source as PowerBITheme, roots: source as PowerBITheme };
}

/**
 * The merged root-level view of a resolution source — theme tokens,
 * `dataColors`, `textClasses`. Exported for the few helpers that inspect
 * raw theme structure (per-state array indices) rather than resolving a
 * property, and which want the same combined view they saw before layers
 * existed.
 */
export function themeRoots(source: ThemeSource): PowerBITheme {
  return asLayers(source).roots;
}

/**
 * A property to resolve. `stateId` opts into `$id` matching: the array
 * index baked into `path` is then ignored and the entry carrying that
 * `$id` is located **within each layer separately**.
 *
 * That per-layer step is essential. Nothing in the theme format requires
 * two themes to declare the same states, in the same order, or at all —
 * Fluent 2 writes five entries for `actionButton.fill` while a custom
 * theme might write one. A single index shared across layers therefore
 * lines up different states with each other, resolving (say) "selected"
 * using another state's properties.
 */
export type PropertyLookup<T extends PropertyValueType = PropertyValueType> = Pick<
  PropertyDefinition<T>,
  "visual" | "path" | "valueType"
> & { stateId?: string };

/**
 * The index of `stateId`'s entry within one layer's array, or undefined
 * when that layer has nothing for it.
 *
 * Returning undefined rather than falling back to index 0 is the whole
 * point: index 0 belongs to whichever state happens to be listed first,
 * so using it would silently read a *different* state's values.
 *
 * An untagged entry does stand in for any state — Power BI writes those
 * for group-wide settings (Fluent 2's `actionButton.fill[0]` is a bare
 * `{ show: true }` alongside the tagged entries).
 */
function stateEntryIndexInLayer(
  theme: PowerBITheme,
  visual: VisualSchemaKey,
  group: string,
  stateId: string,
): number | undefined {
  const visualStyles = theme.visualStyles;
  if (!isRecord(visualStyles)) return undefined;

  const entries = readAtPath(visualStyles[visual], ["*", group]);
  if (!Array.isArray(entries)) return undefined;

  const tagged = entries.findIndex((entry) => isRecord(entry) && entry.$id === stateId);
  if (tagged !== -1) return tagged;

  const untagged = entries.findIndex((entry) => isRecord(entry) && entry.$id === undefined);
  return untagged !== -1 ? untagged : undefined;
}

/** The lookup chain, highest precedence first. */
const RESOLUTION_CHAIN = [
  { source: "custom-visual", layer: "custom", wildcard: false },
  { source: "custom-wildcard", layer: "custom", wildcard: true },
  { source: "base-visual", layer: "base", wildcard: false },
  { source: "base-wildcard", layer: "base", wildcard: true },
] as const;

/**
 * Resolves a property to its effective value *and* its provenance, in one
 * walk. `resolvePropertyValue` is a thin wrapper over this, so the value
 * and the provenance can never disagree.
 */
export function resolvePropertyEntry<T extends PropertyValueType>(
  source: ThemeSource,
  definition: PropertyLookup<T>,
  fallback: ValueForType<T>,
): ResolvedProperty<ValueForType<T>> {
  const layers = asLayers(source);

  for (const step of RESOLUTION_CHAIN) {
    const theme = step.layer === "custom" ? layers.custom : layers.base;
    if (!theme) continue;
    // For a definition already targeting "*", the visual and wildcard
    // steps are the same lookup; the first one wins and the second is a
    // harmless repeat.
    const visual = step.wildcard ? "*" : definition.visual;

    let path = definition.path;
    if (definition.stateId !== undefined) {
      const index = stateEntryIndexInLayer(theme, visual, String(definition.path[0]), definition.stateId);
      // No entry for this state in this layer — move on rather than
      // reading whatever else sits at the index baked into `path`.
      if (index === undefined) continue;
      path = [...definition.path];
      path[1] = index;
    }

    const value = readVisualStyleValue(theme, { ...definition, visual, path }, layers.roots);
    if (value !== undefined) {
      return { value, source: step.source, isSet: true };
    }
  }

  return { value: fallback, source: "fallback", isSet: false };
}

/**
 * Resolves a property to its effective value. Unchanged in behaviour and
 * signature — every registry calls this thousands of times — and now
 * implemented on top of resolvePropertyEntry.
 */
export function resolvePropertyValue<T extends PropertyValueType>(
  source: ThemeSource,
  definition: PropertyLookup<T>,
  fallback: ValueForType<T>,
): ValueForType<T> {
  return resolvePropertyEntry(source, definition, fallback).value;
}

/**
 * Retargets a definition at a state by `$id`, for *reading*. The index is
 * then resolved per layer — see PropertyLookup.
 */
export function forStateId<T extends PropertyValueType>(
  definition: PropertyDefinition<T>,
  stateId: string,
): PropertyLookup<T> {
  return { visual: definition.visual, path: definition.path, valueType: definition.valueType, stateId };
}

/**
 * Whether a property *group* has been configured, and by which layer.
 *
 * `"custom"` asks whether the user configured it; `"any"` includes the
 * base theme. The distinction matters: a base theme ships styling for
 * features like small multiples so they look right *if used*, which is not
 * a signal that anything turned them on. Only the custom layer expresses
 * that intent.
 */
export function isGroupSetBy(
  source: ThemeSource,
  visual: VisualSchemaKey,
  group: string,
  layerScope: "custom" | "any",
): boolean {
  const layers = asLayers(source);

  return RESOLUTION_CHAIN.some((step) => {
    if (layerScope === "custom" && step.layer !== "custom") return false;
    const theme = step.layer === "custom" ? layers.custom : layers.base;
    if (!theme) return false;

    const visualStyles = theme.visualStyles;
    if (!isRecord(visualStyles)) return false;
    const entries = readAtPath(visualStyles[step.wildcard ? "*" : visual], ["*", group]);

    return Array.isArray(entries)
      ? entries.some((entry) => isRecord(entry) && Object.keys(entry).length > 0)
      : isRecord(entries) && Object.keys(entries).length > 0;
  });
}

/** Absolute theme path for `updateThemeValue`, suitable for writing this property's raw value. */
export function propertyThemePath(definition: Pick<PropertyDefinition, "visual" | "path" | "valueType">): Array<string | number> {
  const base = ["visualStyles", definition.visual, "*", ...definition.path];
  return definition.valueType === "color" ? [...base, "solid", "color"] : base;
}

/**
 * Resolves a "chrome" property (shared across every visual type) against a
 * specific visual. Chrome definitions carry a placeholder `visual`, so the
 * active one is supplied separately; the precedence itself is identical to
 * resolvePropertyValue and deliberately shares its implementation, so the
 * two can't drift.
 */
export function resolveChromeValue<T extends PropertyValueType>(
  source: ThemeSource,
  activeVisual: VisualSchemaKey,
  definition: Pick<PropertyDefinition<T>, "path" | "valueType"> & { stateId?: string },
  fallback: ValueForType<T>,
): ValueForType<T> {
  return resolveChromeEntry(source, activeVisual, definition, fallback).value;
}

/** The provenance-carrying counterpart to resolveChromeValue. */
export function resolveChromeEntry<T extends PropertyValueType>(
  source: ThemeSource,
  activeVisual: VisualSchemaKey,
  definition: Pick<PropertyDefinition<T>, "path" | "valueType"> & { stateId?: string },
  fallback: ValueForType<T>,
): ResolvedProperty<ValueForType<T>> {
  return resolvePropertyEntry(
    source,
    // `stateId` must survive being retargeted at another visual — page-level
    // filter cards resolve through here and are $id-keyed.
    { visual: activeVisual, path: definition.path, valueType: definition.valueType, stateId: definition.stateId },
    fallback,
  );
}

/**
 * Absolute theme path for writing a chrome property against a specific
 * visual context — `"*"` to edit the shared default, or a concrete
 * `VisualSchemaKey` to create/update that visual's own override.
 */
export function chromeThemePath(
  activeVisual: VisualSchemaKey,
  definition: Pick<PropertyDefinition, "path" | "valueType">,
): Array<string | number> {
  return propertyThemePath({ visual: activeVisual, path: definition.path, valueType: definition.valueType });
}

/**
 * Power BI styles a button or navigator differently per interaction state
 * by writing *several* entries into a group's array, each tagged with an
 * `$id`:
 *
 *   visualStyles.actionButton["*"].fill = [
 *     { $id: "default",  fillColor: ... },
 *     { $id: "hover",    fillColor: ... },
 *   ]
 *
 * Everywhere else in this app a group has exactly one entry and the
 * registries hardcode index 0. That stays true — this is an opt-in path
 * used only by the visuals whose schema actually carries `$id`.
 */
/**
 * Every state name any measured visual offers. This is the TYPE's domain, not
 * any visual's state set — nothing should iterate it to build a UI.
 *
 * `press` is the internal id. Power BI labels it "Pressed" in the Format pane
 * while writing `$id: "press"`, on every visual measured. They are one state,
 * not two.
 */
export const ALL_INTERACTION_STATES = ["default", "hover", "press", "selected", "disabled"] as const;
export type InteractionState = (typeof ALL_INTERACTION_STATES)[number];

/**
 * The states each visual actually offers.
 *
 * Measured in Power BI Desktop, and no two of the shape family agree:
 * Shape has no state selector at all, Button offers `disabled` but not
 * `selected`, and the navigators offer `selected` but not `disabled`. All
 * three interactive ones offer `press`.
 *
 * This replaced a single global list of default/hover/selected/disabled,
 * which matched none of them: it omitted `press`, which three of the four
 * offer, and advertised two states no visual here has. A visual absent from
 * this table is not stateful — that is how Shape is expressed.
 */
export const VISUAL_INTERACTION_STATES: Partial<Record<VisualSchemaKey, readonly InteractionState[]>> = {
  actionButton: ["default", "hover", "press", "disabled"],
  pageNavigator: ["default", "hover", "press", "selected"],
  bookmarkNavigator: ["default", "hover", "press", "selected"],
};

/** The states this visual offers, empty when it is not stateful. */
export function interactionStatesFor(visual: VisualSchemaKey): readonly InteractionState[] {
  return VISUAL_INTERACTION_STATES[visual] ?? [];
}

/** Whether this visual offers this state at all. */
export function supportsInteractionState(visual: VisualSchemaKey, state: InteractionState): boolean {
  return interactionStatesFor(visual).includes(state);
}

/**
 * The state to resolve for a visual, given one the caller may not support.
 *
 * The editor and the preview each hold a single selected state that outlives
 * a switch between visuals, so a Button can be asked for `selected` and a
 * navigator for `disabled`. Both fall back to `default` rather than reading
 * a `$id` the visual does not have.
 */
export function nearestInteractionState(visual: VisualSchemaKey, state: InteractionState): InteractionState {
  return supportsInteractionState(visual, state) ? state : "default";
}

/** Groups that support per-state styling, by visual. */
export const STATEFUL_GROUPS: Partial<Record<VisualSchemaKey, readonly string[]>> = {
  actionButton: ["fill", "glow", "outline", "shadow", "text", "icon"],
  bookmarkNavigator: ["fill", "glow", "outline", "shadow", "text", "accentBar"],
  pageNavigator: ["fill", "glow", "outline", "shadow", "text", "accentBar"],
};

export function groupSupportsStates(visual: VisualSchemaKey, group: string): boolean {
  return STATEFUL_GROUPS[visual]?.includes(group) ?? false;
}

/**
 * Which array index holds `state` for this group — the **editor/write**
 * path only.
 *
 * The property editor needs a concrete index in the user's own theme, both
 * to show the value currently stored for a state and to write to it, so
 * that updateThemeValue patches that exact entry and the file round-trips
 * unchanged. When `create` is set, a state with no entry yet gets the next
 * free index so it can be written to.
 *
 * Resolution deliberately does **not** use this. An index is only
 * meaningful within the single theme it was computed from; base and custom
 * themes routinely order or omit states differently, so reads match by
 * `$id` per layer instead — see PropertyLookup and forStateId.
 *
 * An entry with no `$id` at all counts as the default state, which is how
 * a theme that never thought about states is written.
 */
export function stateEntryIndex(
  source: ThemeSource,
  visual: VisualSchemaKey,
  group: string,
  state: InteractionState,
  create = false,
): number {
  // Callers pass the user's own theme, so this is that single layer;
  // themeRoots is just the identity for an unlayered source.
  const visualStyles = themeRoots(source).visualStyles;
  const entries = isRecord(visualStyles) ? readAtPath(visualStyles[visual], ["*", group]) : undefined;

  if (Array.isArray(entries)) {
    const tagged = entries.findIndex((entry) => isRecord(entry) && entry.$id === state);
    if (tagged !== -1) return tagged;

    if (state === "default") {
      const untagged = entries.findIndex((entry) => isRecord(entry) && entry.$id === undefined);
      if (untagged !== -1) return untagged;
    }
    return create ? entries.length : 0;
  }

  // Nothing written yet, so the new entry is the array's first element
  // whichever state it is. A non-default state carries an explicit `$id`,
  // which is what identifies it — reserving index 0 for "default" would
  // leave a hole that serialises as `null`, and the report-theme schema
  // requires every entry to be an object.
  return 0;
}

/**
 * A property definition retargeted at a literal array index — the
 * **write** path.
 *
 * Writing needs a concrete index in the user's own theme, so that
 * updateThemeValue patches exactly that entry and the file round-trips
 * byte-for-byte. Reading must not use this: use forStateId, which matches
 * by `$id` within each layer instead (see PropertyLookup for why a shared
 * index is unsound across layers).
 */
export function forState<T extends PropertyValueType>(
  definition: PropertyDefinition<T>,
  index: number,
): PropertyDefinition<T> {
  const path = [...definition.path];
  // The index is always the second segment: ["fill", 0, "fillColor"].
  path[1] = index;
  return { ...definition, path };
}

// Shared factories for building PropertyDefinition entries, used by every
// per-visual registry (app/lib/tableProperties.ts, app/lib/barChartProperties.ts, ...).

export function colorProp(
  visual: VisualSchemaKey,
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  guidance?: string,
  section?: string,
): PropertyDefinition<"color"> {
  return { id, visual, valueType: "color", label, description, guidance, section, path };
}

export function numberProp(
  visual: VisualSchemaKey,
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  min: number,
  max: number,
  guidance?: string,
  section?: string,
): PropertyDefinition<"number"> {
  return { id, visual, valueType: "number", label, description, guidance, section, path, min, max };
}

export function boolProp(
  visual: VisualSchemaKey,
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  guidance?: string,
  section?: string,
): PropertyDefinition<"boolean"> {
  return { id, visual, valueType: "boolean", label, description, guidance, section, path };
}

export function textProp(
  visual: VisualSchemaKey,
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  guidance?: string,
  section?: string,
): PropertyDefinition<"text"> {
  return { id, visual, valueType: "text", label, description, guidance, section, path };
}

export function enumProp(
  visual: VisualSchemaKey,
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  options: readonly EnumOption[],
  guidance?: string,
  section?: string,
): PropertyDefinition<"enum"> {
  return { id, visual, valueType: "enum", label, description, guidance, section, path, options };
}
