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
    calloutSize: readSize(callout.fontSize, 28),
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
