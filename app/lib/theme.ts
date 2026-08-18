export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type PowerBITheme = {
  name?: string;
  dataColors?: JsonValue;
  background?: JsonValue;
  foreground?: JsonValue;
  tableAccent?: JsonValue;
  textClasses?: Record<string, JsonValue>;
  visualStyles?: Record<string, JsonValue>;
  [key: string]: JsonValue | undefined;
};

export type ResolvedTheme = {
  name: string;
  palette: string[];
  background: string;
  foreground: string;
  muted: string;
  tableAccent: string;
  fontFamily: string;
  titleSize: number;
  calloutSize: number;
  calloutColor: string;
  categoryLabelColor: string;
};

export const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  textClasses: {
    title: {
      fontFace: "Segoe UI",
      fontSize: 12,
      color: "#0B0C0C",
    },
    callout: {
      fontFace: "Segoe UI Semibold",
      fontSize: 28,
      color: "#0B0C0C",
    },
    label: {
      fontFace: "Segoe UI",
      fontSize: 10,
      color: "#505A5F",
    },
  },
  visualStyles: {},
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && HEX_COLOR.test(value)) return value;

  if (isRecord(value)) {
    const solid = value.solid;
    if (isRecord(solid) && typeof solid.color === "string" && HEX_COLOR.test(solid.color)) {
      return solid.color;
    }
  }

  return fallback;
}

function readTextClass(theme: PowerBITheme, key: string): Record<string, unknown> {
  const value = theme.textClasses?.[key];
  return isRecord(value) ? value : {};
}

function readSize(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parseThemeJson(source: string): PowerBITheme {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("That file is not valid JSON. Check it for a missing comma or bracket.");
  }

  if (!isRecord(parsed)) {
    throw new Error("A Power BI theme must be a JSON object at its top level.");
  }

  return parsed as PowerBITheme;
}

export function resolveTheme(theme: PowerBITheme): ResolvedTheme {
  const starterPalette = STARTER_THEME.dataColors as string[];
  const incomingPalette = Array.isArray(theme.dataColors)
    ? theme.dataColors.filter(
        (color): color is string => typeof color === "string" && HEX_COLOR.test(color),
      )
    : [];
  const title = readTextClass(theme, "title");
  const callout = readTextClass(theme, "callout");
  const label = readTextClass(theme, "label");
  const largeLightLabel = readTextClass(theme, "largeLightLabel");

  return {
    name: typeof theme.name === "string" && theme.name.trim() ? theme.name : "Untitled theme",
    palette: incomingPalette.length ? incomingPalette : starterPalette,
    background: readColor(theme.background, "#FFFFFF"),
    foreground: readColor(theme.foreground, "#0B0C0C"),
    muted: readColor(label.color, "#505A5F"),
    tableAccent: readColor(theme.tableAccent, incomingPalette[0] ?? starterPalette[0]),
    fontFamily:
      typeof label.fontFace === "string" && label.fontFace.trim()
        ? label.fontFace
        : "Segoe UI",
    titleSize: readSize(title.fontSize, 12),
    // 24pt is Classic 2026's real value (themes/base/classic2026.json,
    // sourced directly from the Power BI Desktop install) — Microsoft's
    // general docs page states 45pt, but that's Classic 2018's value
    // (confirmed stable from CY19SU06 through CY25SU10 in the app's own
    // BaseThemes history); Classic 2026 dropped it to 24pt starting
    // CY25SU11, and Classic 2026 is the actual default for new reports.
    calloutSize: readSize(callout.fontSize, 24),
    calloutColor: readColor(callout.color, "#252423"),
    // Microsoft's docs list "Card category labels" under the largeLightLabel
    // text class specifically, not a structural colour token — confirmed
    // against a private real-world theme, which sets largeLightLabel.color to
    // exactly the #605E5C they report seeing on Card, while leaving
    // fourthLevelElements (this app's previous source for this field)
    // unset entirely.
    categoryLabelColor: readColor(largeLightLabel.color, "#605E5C"),
  };
}

export function updateThemeValue(
  theme: PowerBITheme,
  path: Array<string | number>,
  value: JsonValue,
): PowerBITheme {
  const clone = JSON.parse(JSON.stringify(theme)) as Record<string | number, unknown>;
  let cursor = clone;

  path.slice(0, -1).forEach((part, index) => {
    const nextPart = path[index + 1];
    if (typeof cursor[part] !== "object" || cursor[part] === null) {
      cursor[part] = typeof nextPart === "number" ? [] : {};
    }
    cursor = cursor[part] as Record<string | number, unknown>;
  });

  cursor[path[path.length - 1]] = value;
  return clone as PowerBITheme;
}

/**
 * The raw value at `path`, or undefined. Used where a control needs the
 * value from a *specific* array entry rather than the resolved default —
 * per-interaction-state formatting, where "hover" and "default" live in
 * different entries of the same group.
 */
export function readThemeValueAtPath(theme: PowerBITheme, path: Array<string | number>): JsonValue | undefined {
  let cursor: unknown = theme;

  for (const part of path) {
    if (Array.isArray(cursor)) {
      cursor = typeof part === "number" ? cursor[part] : undefined;
    } else if (isRecord(cursor)) {
      cursor = cursor[part];
    } else {
      return undefined;
    }
  }

  return cursor as JsonValue | undefined;
}

/** Whether the theme has an explicit value at `path` — used to tell an active override apart from a resolved fallback. */
export function hasThemeValueAtPath(theme: PowerBITheme, path: Array<string | number>): boolean {
  let cursor: unknown = theme;

  for (const part of path) {
    if (Array.isArray(cursor)) {
      cursor = typeof part === "number" ? cursor[part] : undefined;
    } else if (isRecord(cursor)) {
      cursor = cursor[part];
    } else {
      return false;
    }
  }

  return cursor !== undefined;
}

/**
 * Removes the value at `path`, so resolution falls back to a shared default
 * or plain fallback again — the counterpart to updateThemeValue. Any
 * now-empty object left behind along the path is pruned too, so clearing
 * the last override in e.g. `visualStyles.tableEx` removes the whole empty
 * shell rather than leaving `{ "tableEx": { "*": { "title": [{}] } } }`
 * behind.
 */
export function deleteThemeValue(theme: PowerBITheme, path: Array<string | number>): PowerBITheme {
  const clone = JSON.parse(JSON.stringify(theme)) as Record<string | number, unknown>;
  const chain: Array<{ container: Record<string | number, unknown>; key: string | number }> = [];
  let cursor: Record<string | number, unknown> = clone;

  for (let i = 0; i < path.length - 1; i++) {
    const part = path[i];
    const next = cursor[part];
    if (typeof next !== "object" || next === null) return clone as PowerBITheme;
    chain.push({ container: cursor, key: part });
    cursor = next as Record<string | number, unknown>;
  }

  delete cursor[path[path.length - 1]];

  // Prune empty containers we just walked through, innermost first.
  let pruned: Record<string | number, unknown> | null = cursor;
  for (let i = chain.length - 1; i >= 0; i--) {
    const isEmpty = Array.isArray(pruned)
      ? pruned.every((entry) => entry === undefined || (isRecord(entry) && Object.keys(entry).length === 0))
      : Object.keys(pruned).length === 0;
    if (!isEmpty) break;
    const { container, key } = chain[i];
    delete container[key];
    pruned = container;
  }

  return clone as PowerBITheme;
}

/**
 * A straightforward recursive merge of the user's theme over a base theme:
 * object keys merge, array entries merge by index (not concatenated or
 * replaced wholesale), and a value in `override` always wins.
 *
 * Index-based array merging can in principle misalign `$id`-tagged
 * per-state entries (actionButton / bookmarkNavigator / pageNavigator) if
 * base and custom order those states differently — an accepted,
 * low-probability edge case rather than a full $id-aware merge.
 *
 * Scope note. This is used for *root-level* reads — theme tokens,
 * `dataColors`, `textClasses` — where custom-over-base merging is exactly
 * the right semantics and there is no visual/wildcard axis to respect.
 *
 * It is deliberately **not** how `visualStyles` precedence is decided.
 * Power BI considers every custom-theme match before any base-theme match,
 * which a merge cannot express: merging discards which layer each value
 * came from, so a later "visual, then wildcard" walk would let a *base*
 * visual-specific value beat a *custom* wildcard one. That ordering now
 * lives in resolvePropertyEntry (properties.ts), which walks the layers
 * separately and reports the provenance it used. An earlier version of
 * this function pre-flattened those four slots into each visual's bucket
 * to compensate; provenance makes that both unnecessary and actively
 * harmful, since flattening would make every value look custom-visual.
 *
 * The result is still never exported: the user's theme state stays exactly
 * as they wrote it.
 */
export function mergeThemeOverBase(base: PowerBITheme, override: PowerBITheme): PowerBITheme {
  return deepMergeJson(base as unknown as JsonValue, override as unknown as JsonValue) as unknown as PowerBITheme;
}

function deepMergeJson(base: JsonValue | undefined, override: JsonValue | undefined): JsonValue {
  if (override === undefined) return base as JsonValue;
  if (base === undefined) return override;

  if (Array.isArray(base) && Array.isArray(override)) {
    const length = Math.max(base.length, override.length);
    const merged: JsonValue[] = [];
    for (let i = 0; i < length; i++) {
      merged[i] = deepMergeJson(base[i], override[i]);
    }
    return merged;
  }

  if (isRecord(base) && isRecord(override)) {
    const merged: Record<string, JsonValue> = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(override)])) {
      merged[key] = deepMergeJson(base[key] as JsonValue, override[key] as JsonValue);
    }
    return merged;
  }

  // Primitive, or a type mismatch (e.g. one side is an array, the other
  // an object) -- the override wins outright rather than guessing.
  return override;
}

export function cloneStarterTheme(): PowerBITheme {
  return JSON.parse(JSON.stringify(STARTER_THEME)) as PowerBITheme;
}

export function themeFileName(name: string): string {
  const safeName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeName || "power-bi-theme"}.json`;
}
