import type { PropertyDefinition, PropertyValueType } from "./properties";

export type PropertyEntry = [string, PropertyDefinition<PropertyValueType>];

export type PropertySection = {
  name?: string;
  entries: PropertyEntry[];
};

export type EditorGroupMeta = {
  id: string;
  title: string;
  count: number;
  section?: string;
};

type EditorVisualKind =
  | "card"
  | "bar"
  | "column"
  | "stackedBar"
  | "stackedColumn"
  | "line"
  | "table"
  | "matrix"
  | "pie"
  | "slicer"
  | "shape"
  | "actionButton"
  | "bookmarkNavigator"
  | "pageNavigator"
  | "textbox"
  | "image";

const MASTER_PROPERTY_NAMES = new Set(["show", "enabled", "visible"]);

/**
 * Genuine group activation fields use these exact schema names. A section
 * can also have a compound schema name (gridlineShow, shadeShow, showMarker)
 * while Power BI still labels its activation control exactly "Show"; that
 * exact label is intentionally accepted. Longer labels such as "Show
 * gradient legend" and unrelated booleans stay in their original order.
 *
 * The id sets are the narrow override point for a future schema exception;
 * keeping them explicit prevents the general rule from becoming fuzzy.
 */
const MASTER_PROPERTY_ID_OVERRIDES = new Set<string>();
const NON_MASTER_PROPERTY_ID_OVERRIDES = new Set<string>();

export function isMasterActivationProperty(definition: PropertyDefinition): boolean {
  if (NON_MASTER_PROPERTY_ID_OVERRIDES.has(definition.id)) return false;
  if (MASTER_PROPERTY_ID_OVERRIDES.has(definition.id)) return true;
  if (definition.valueType !== "boolean") return false;

  const propertyName = definition.path.at(-1);
  const label = definition.label.trim().toLowerCase();
  return (
    (typeof propertyName === "string" && MASTER_PROPERTY_NAMES.has(propertyName.toLowerCase())) ||
    MASTER_PROPERTY_NAMES.has(label)
  );
}

export function isFontFamilyProperty(definition: PropertyDefinition): boolean {
  if (definition.valueType !== "text") return false;
  const propertyName = definition.path.at(-1);
  return typeof propertyName === "string" && /(?:fontfamily|fontface)$/i.test(propertyName);
}

/**
 * Friendly, literal Power BI font choices. These are editor suggestions, not
 * renderer fallbacks: the renderer owns CSS-stack expansion separately. In
 * particular, the raw wf_/helvetica stacks found in some base-theme resources
 * must never become ordinary author-facing options.
 */
export const KNOWN_FONT_FAMILIES = [
  "Arial",
  "Calibri",
  "Cambria",
  "Courier New",
  "DIN",
  "DIN Light",
  "Georgia",
  "Segoe UI",
  "Segoe UI Bold",
  "Segoe UI Light",
  "Segoe UI Semibold",
  "Segoe UI Semilight",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
] as const;

/** Returns zero when a newly opened group's header is already fully visible. */
export function expansionScrollDelta(
  pane: { top: number; bottom: number },
  header: { top: number; bottom: number },
  inset = 12,
): number {
  return header.top >= pane.top + inset && header.bottom <= pane.bottom ? 0 : header.top - pane.top - inset;
}

/**
 * Friendly choices, plus the literal currently stored in an imported theme
 * when it is not one of those choices. The latter is deliberately local to
 * that editor instance: an imported raw stack stays visible and preservable,
 * but is never offered to another property as a normal suggestion.
 */
export function fontFamilyOptions(currentValue: string): string[] {
  return currentValue && !KNOWN_FONT_FAMILIES.includes(currentValue as (typeof KNOWN_FONT_FAMILIES)[number])
    ? [currentValue, ...KNOWN_FONT_FAMILIES]
    : [...KNOWN_FONT_FAMILIES];
}

/** Case-insensitive substring search with stable prefix-first ranking. */
export function filterFontFamilyOptions(query: string, currentValue: string): string[] {
  const needle = query.trim().toLocaleLowerCase();
  const candidates = fontFamilyOptions(currentValue);
  if (!needle) return candidates;

  return candidates
    .map((font, index) => ({ font, index, lower: font.toLocaleLowerCase() }))
    .filter(({ lower }) => lower.includes(needle))
    .sort((left, right) => Number(!left.lower.startsWith(needle)) - Number(!right.lower.startsWith(needle)) || left.index - right.index)
    .map(({ font }) => font);
}

function stableActivationFirst(entries: PropertyEntry[]): PropertyEntry[] {
  return entries
    .map((entry, index) => ({ entry, index, master: isMasterActivationProperty(entry[1]) }))
    .sort((left, right) => Number(right.master) - Number(left.master) || left.index - right.index)
    .map(({ entry }) => entry);
}

function sectionRank(name: string): number {
  if (/^(general|content|value|values|series|type|behaviou?r|options?)$/i.test(name)) return 10;
  if (/(position|layout|alignment|scale|range|size|spacing)/i.test(name)) return 20;
  if (/(title|label|text|font)/i.test(name)) return 30;
  if (/(appearance|colo(?:u)?r|fill|background|border|outline|grid|line|marker|shade|style)/i.test(name)) return 40;
  return 50;
}

/**
 * Builds a sorted presentation copy. The registry object and its definition
 * objects are never changed: ordinary properties retain their insertion
 * order, master toggles move only within their own cluster, and section ties
 * retain their original order.
 */
export function propertySections(group: Record<string, PropertyDefinition<PropertyValueType>>): PropertySection[] {
  const entries = Object.entries(group) as PropertyEntry[];
  const general = stableActivationFirst(entries.filter(([, definition]) => !definition.section));
  const sectionNames: string[] = [];

  for (const [, definition] of entries) {
    if (definition.section && !sectionNames.includes(definition.section)) sectionNames.push(definition.section);
  }

  const orderedNames = sectionNames
    .map((name, index) => ({ name, index, rank: sectionRank(name) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ name }) => name);

  return [
    ...(general.length ? [{ entries: general }] : []),
    ...orderedNames.map((name) => ({
      name,
      entries: stableActivationFirst(entries.filter(([, definition]) => definition.section === name)),
    })),
  ];
}

export function inactivePropertyGroup(
  group: Record<string, PropertyDefinition<PropertyValueType>>,
  values: Record<string, string | number | boolean>,
): boolean {
  const master = Object.entries(group).find(
    ([, definition]) => !definition.section && isMasterActivationProperty(definition),
  );
  return Boolean(master && values[master[0]] === false);
}

const CORE_GROUP_ORDER: Partial<Record<EditorVisualKind, readonly string[]>> = {
  bar: ["dataPoint", "legend", "valueAxis", "categoryAxis", "labels", "plotArea"],
  column: ["dataPoint", "legend", "categoryAxis", "valueAxis", "labels", "plotArea"],
  stackedBar: ["dataPoint", "legend", "valueAxis", "categoryAxis", "labels", "totals", "ribbonBands", "plotArea"],
  stackedColumn: ["dataPoint", "legend", "categoryAxis", "valueAxis", "labels", "totals", "ribbonBands", "plotArea"],
  line: [
    "dataPoint",
    "lineStyles",
    "markers",
    "legend",
    "categoryAxis",
    "valueAxis",
    "y2Axis",
    "labels",
    "seriesLabels",
    "plotArea",
  ],
  table: ["columnHeaders", "values", "total", "grid", "columnFormatting", "sparklines"],
  slicer: ["header", "items", "selection", "searchBox", "general"],
  card: ["typography", "labels", "categoryLabels", "wordWrap", "general"],
};

const SPECIALIST_GROUPS = new Set([
  "error",
  "trend",
  "forecast",
  "anomalyDetection",
  "referenceLine",
  "xAxisReferenceLine",
  "y1AxisReferenceLine",
  "zoom",
  "smallMultiplesLayout",
  "subheader",
  "layout",
]);

function groupKey(id: string): string {
  return id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
}

/** Applies small visual-specific priorities to a copy of the group list. */
export function orderVisualGroups(visual: EditorVisualKind, groups: EditorGroupMeta[]): EditorGroupMeta[] {
  const preferred = CORE_GROUP_ORDER[visual] ?? [];
  const coreRank = new Map(preferred.map((key, index) => [key, index]));

  return groups
    .map((group, index) => {
      const key = groupKey(group.id);
      const chrome = group.id.startsWith("chrome:");
      const coreChrome = chrome && (key === "title" || key === "subTitle");
      const specialist = SPECIALIST_GROUPS.has(key);
      const tier = specialist ? 2 : chrome && !coreChrome ? 1 : 0;
      const rank = coreChrome
        ? key === "title"
          ? 0
          : 1
        : tier === 0
          ? 2 + (coreRank.get(key) ?? preferred.length + index)
          : index;
      const section = tier === 0 ? "Core formatting" : tier === 1 ? "Visual settings" : "Analytics & advanced";
      return { group: { ...group, section }, index, tier, rank };
    })
    .sort((left, right) => left.tier - right.tier || left.rank - right.rank || left.index - right.index)
    .map(({ group }) => group);
}

type GroupPlacement = { section: string; rank: number };

function orderGroupsByPlacement(
  groups: EditorGroupMeta[],
  placementFor: (group: EditorGroupMeta) => GroupPlacement,
): EditorGroupMeta[] {
  return groups
    .map((group, index) => {
      const placement = placementFor(group);
      return { group: { ...group, section: placement.section }, index, ...placement };
    })
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ group }) => group);
}

const THEME_GROUP_PLACEMENT: Record<string, GroupPlacement> = {
  identity: { section: "Theme basics", rank: 0 },
  sharedColours: { section: "Colours", rank: 10 },
  dataPalette: { section: "Colours", rank: 11 },
  semanticColors: { section: "Colours", rank: 12 },
  textClasses: { section: "Typography", rank: 20 },
};

/** Organises the Theme tab without changing its source group array. */
export function orderThemeGroups(groups: EditorGroupMeta[]): EditorGroupMeta[] {
  return orderGroupsByPlacement(groups, (group) => {
    const explicit = THEME_GROUP_PLACEMENT[group.id];
    if (explicit) return explicit;
    if (group.id === "chrome:title") return { section: "Default visual settings", rank: 30 };
    if (group.id === "chrome:subTitle") return { section: "Default visual settings", rank: 31 };
    return group.id.startsWith("chrome:")
      ? { section: "Default visual settings", rank: 32 }
      : { section: "Theme basics", rank: 9 };
  });
}

const GLOBAL_GROUP_PLACEMENT: Record<string, GroupPlacement> = {
  "global:reportFilterPaneState": { section: "Report defaults", rank: 0 },
  "global:reportPageAlignment": { section: "Report defaults", rank: 1 },
  "global:pageSize": { section: "Page & canvas", rank: 10 },
  "global:pageBackground": { section: "Page & canvas", rank: 11 },
  "global:pageWallpaper": { section: "Page & canvas", rank: 12 },
  "global:pageAlignment": { section: "Page & canvas", rank: 13 },
  "global:pageInformation": { section: "Page & canvas", rank: 14 },
  "global:pageFilterPane": { section: "Filters", rank: 20 },
  "global:pageFilterCards": { section: "Filters", rank: 21 },
  "global:pageRefresh": { section: "Features & behaviour", rank: 30 },
  "global:personalizeVisual": { section: "Features & behaviour", rank: 31 },
};

/** Organises report/page settings by user task, again on a display copy. */
export function orderGlobalGroups(groups: EditorGroupMeta[]): EditorGroupMeta[] {
  return orderGroupsByPlacement(
    groups,
    (group) => GLOBAL_GROUP_PLACEMENT[group.id] ?? { section: "Features & behaviour", rank: 39 },
  );
}
