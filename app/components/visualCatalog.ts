export type VisualKind =
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

export type VisualCatalogEntry = {
  id: VisualKind;
  label: string;
};

/**
 * The canonical user-facing names and display order for Theme Studio's
 * supported visuals. Internal VisualKind IDs deliberately remain stable.
 */
export const VISUAL_CATALOG: readonly VisualCatalogEntry[] = [
  { id: "card", label: "Card" },
  { id: "bar", label: "Clustered bar chart" },
  { id: "column", label: "Clustered column chart" },
  { id: "stackedBar", label: "Stacked bar chart" },
  { id: "stackedColumn", label: "Stacked column chart" },
  { id: "line", label: "Line chart" },
  { id: "table", label: "Table" },
  { id: "matrix", label: "Matrix" },
  { id: "pie", label: "Pie chart" },
  { id: "slicer", label: "Slicer" },
  { id: "shape", label: "Shape" },
  { id: "actionButton", label: "Button" },
  { id: "bookmarkNavigator", label: "Bookmark navigator" },
  { id: "pageNavigator", label: "Page navigator" },
  { id: "textbox", label: "Text box" },
  { id: "image", label: "Image" },
];

export const ALL_VISUALS: readonly VisualKind[] = VISUAL_CATALOG.map(({ id }) => id);

export const VISUAL_LABEL = Object.fromEntries(
  VISUAL_CATALOG.map(({ id, label }) => [id, label]),
) as Record<VisualKind, string>;

export const DEFAULT_HERO_VISUAL: VisualKind = "column";

/** Keeps every visual available while promoting exactly one to Hero. */
export function splitHeroVisuals<T extends { id: VisualKind }>(items: readonly T[], selected: VisualKind) {
  const hero = items.find(({ id }) => id === selected) ?? items[0];
  return {
    hero,
    thumbnails: hero ? items.filter(({ id }) => id !== hero.id) : [],
  };
}
