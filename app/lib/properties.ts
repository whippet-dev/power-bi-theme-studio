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
export type VisualSchemaKey = "tableEx" | "clusteredBarChart" | "card" | "slicer" | "lineChart" | "*";

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

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

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
