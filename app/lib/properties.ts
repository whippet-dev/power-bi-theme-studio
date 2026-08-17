import type { JsonValue, PowerBITheme } from "./theme";

/**
 * Power BI theme JSON stores per-visual overrides at
 * `visualStyles[visualKey]["*"][propertyGroup][0][propertyName]`. The `"*"`
 * selector means "all instances of this visual type" (as opposed to a
 * specific visual's GUID) and is the only selector this app writes.
 */
export type VisualSchemaKey = "tableEx";

export type PropertyValueType = "color" | "number" | "boolean";

type ValueForType<T extends PropertyValueType> = T extends "color"
  ? string
  : T extends "number"
    ? number
    : boolean;

export type PropertyDefinition<T extends PropertyValueType = PropertyValueType> = {
  /** Stable internal id, e.g. "table.headerBackground". */
  id: string;
  visual: VisualSchemaKey;
  valueType: T;
  /** Power BI display name, matched to the visual's real format-pane wording. */
  label: string;
  /** Plain-English explanation of what the setting affects, no schema jargon. */
  description: string;
  /** Practical consequence of changing the value, shown as supporting detail. */
  guidance?: string;
  /** Path within visualStyles[visual]["*"], e.g. ["columnHeaders", 0, "backColor"]. */
  path: Array<string | number>;
  min?: T extends "number" ? number : never;
  max?: T extends "number" ? number : never;
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

  if (definition.valueType === "color") {
    if (isRecord(forAllInstances)) {
      const solid = forAllInstances.solid;
      if (isRecord(solid) && typeof solid.color === "string" && HEX_COLOR.test(solid.color)) {
        return solid.color as ValueForType<T>;
      }
    }
    return undefined;
  }

  if (definition.valueType === "number") {
    return typeof forAllInstances === "number" && Number.isFinite(forAllInstances)
      ? (forAllInstances as ValueForType<T>)
      : undefined;
  }

  return typeof forAllInstances === "boolean" ? (forAllInstances as ValueForType<T>) : undefined;
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
