import type { JsonValue, PowerBITheme } from "./theme";

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

function readAtPath(root: JsonValue | undefined, path: Array<string | number>): JsonValue | undefined {
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

/** Reads a property's raw value from `theme.visualStyles[visual]["*"]`, if present and well-formed. */
export function readVisualStyleValue<T extends PropertyValueType>(
  theme: PowerBITheme,
  definition: Pick<PropertyDefinition<T>, "visual" | "path" | "valueType">,
): ValueForType<T> | undefined {
  const visualStyles = theme.visualStyles;
  if (!isRecord(visualStyles)) return undefined;

  const forAllInstances = readAtPath(visualStyles[definition.visual], ["*", ...definition.path]);

  switch (definition.valueType) {
    case "color": {
      if (isRecord(forAllInstances)) {
        const solid = forAllInstances.solid;
        if (isRecord(solid) && typeof solid.color === "string" && HEX_COLOR.test(solid.color)) {
          return solid.color as ValueForType<T>;
        }
      }
      return undefined;
    }
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

/** Resolves a property to its theme override, falling back to `fallback` when unset. */
export function resolvePropertyValue<T extends PropertyValueType>(
  theme: PowerBITheme,
  definition: Pick<PropertyDefinition<T>, "visual" | "path" | "valueType">,
  fallback: ValueForType<T>,
): ValueForType<T> {
  return readVisualStyleValue(theme, definition) ?? fallback;
}

/** Absolute theme path for `updateThemeValue`, suitable for writing this property's raw value. */
export function propertyThemePath(definition: Pick<PropertyDefinition, "visual" | "path" | "valueType">): Array<string | number> {
  const base = ["visualStyles", definition.visual, "*", ...definition.path];
  return definition.valueType === "color" ? [...base, "solid", "color"] : base;
}

/**
 * Resolves a "chrome" property (shared across every visual type) for a
 * specific visual: that visual's own override wins if present, else the
 * shared `visualStyles["*"]["*"]` default, else `fallback`.
 */
export function resolveChromeValue<T extends PropertyValueType>(
  theme: PowerBITheme,
  activeVisual: VisualSchemaKey,
  definition: Pick<PropertyDefinition<T>, "path" | "valueType">,
  fallback: ValueForType<T>,
): ValueForType<T> {
  const specific = readVisualStyleValue(theme, { visual: activeVisual, path: definition.path, valueType: definition.valueType });
  if (specific !== undefined) return specific;
  const shared = readVisualStyleValue(theme, { visual: "*", path: definition.path, valueType: definition.valueType });
  return shared ?? fallback;
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
export const INTERACTION_STATES = ["default", "hover", "selected", "disabled"] as const;
export type InteractionState = (typeof INTERACTION_STATES)[number];

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
 * Which array index holds `state` for this group.
 *
 * An entry with no `$id` at all is the default state — that's how a theme
 * that never thought about states is written, and it has to keep working.
 * When `create` is set, a state with no entry yet gets the next free
 * index so it can be written to.
 */
export function stateEntryIndex(
  theme: PowerBITheme,
  visual: VisualSchemaKey,
  group: string,
  state: InteractionState,
  create = false,
): number {
  const visualStyles = theme.visualStyles;
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

  // Nothing written yet: the default state is index 0, and any other
  // state starts a second entry alongside it.
  return state === "default" ? 0 : create ? 1 : 0;
}

/** A property definition retargeted at a particular state's array entry. */
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
