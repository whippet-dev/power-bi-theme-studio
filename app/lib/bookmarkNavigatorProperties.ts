import {
  boolProp,
  colorProp,
  enumProp,
  forStateId,
  groupSupportsStates,
  numberProp,
  propertyThemePath,
  resolvePropertyValue,
    textProp,
} from "./properties";
import type { InteractionState, PropertyDefinition, PropertyValueType, ThemeSource, PropertyLookup } from "./properties";
import { buildShapeFamilyCore, resolveShapeFamilyCore, type ResolvedShapeFamilyCore } from "./shapeFamilyProperties";
import type { ResolvedTheme } from "./theme";

/**
 * Bookmark navigator — a row/grid of buttons that jump to report bookmarks,
 * `visual-bookmarkNavigator` in the schema. Uses the shared shape-family
 * core plus `accentBar` (a highlight bar along one edge) and `bookmarks`/
 * `layout` groups specific to navigating bookmarks.
 */

const ACCENT_BAR_POSITION_OPTIONS = [
  { value: "Left", label: "Left" },
  { value: "Right", label: "Right" },
  { value: "Bottom", label: "Bottom" },
  { value: "Top", label: "Top" },
] as const;

const LAYOUT_ORIENTATION_OPTIONS = [
  { value: 2, label: "Horizontal" },
  { value: 1, label: "Vertical" },
  { value: 0, label: "Grid" },
] as const;

export const BOOKMARK_NAVIGATOR_PROPERTIES = {
  ...buildShapeFamilyCore("bookmarkNavigator"),
  accentBar: {
    show: boolProp(
      "bookmarkNavigator",
      "bookmarkNavigator.accentBar.show",
      "Show",
      "Whether a highlight bar is drawn along one edge of the selected button.",
      ["accentBar", 0, "show"],
    ),
    color: colorProp(
      "bookmarkNavigator",
      "bookmarkNavigator.accentBar.color",
      "Color",
      "The colour of the accent bar.",
      ["accentBar", 0, "color"],
    ),
    position: enumProp(
      "bookmarkNavigator",
      "bookmarkNavigator.accentBar.position",
      "Position",
      "Which edge of the button the accent bar is drawn along.",
      ["accentBar", 0, "position"],
      ACCENT_BAR_POSITION_OPTIONS,
    ),
    width: numberProp(
      "bookmarkNavigator",
      "bookmarkNavigator.accentBar.width",
      "Width",
      "The thickness of the accent bar, in pixels.",
      ["accentBar", 0, "width"],
      0,
      20,
    ),
    transparency: numberProp(
      "bookmarkNavigator",
      "bookmarkNavigator.accentBar.transparency",
      "Transparency",
      "How see-through the accent bar appears — 0 is solid, 100 is invisible.",
      ["accentBar", 0, "transparency"],
      0,
      100,
    ),
    // $id (default/hover/selected/disabled) excluded: interaction-state discriminator.
  },
  bookmarks: {
    allowDeselectionBookmark: boolProp(
      "bookmarkNavigator",
      "bookmarkNavigator.bookmarks.allowDeselectionBookmark",
      "Allow deselection",
      "Allow users to deselect buttons in the bookmark navigator.",
      ["bookmarks", 0, "allowDeselectionBookmark"],
    ),
    hideDeselectedBookmark: boolProp(
      "bookmarkNavigator",
      "bookmarkNavigator.bookmarks.hideDeselectedBookmark",
      "Hide deselection bookmark",
      "Hide the deselection bookmark from the bookmark navigator.",
      ["bookmarks", 0, "hideDeselectedBookmark"],
    ),
    deselectionBookmark: textProp(
      "bookmarkNavigator",
      "bookmarkNavigator.bookmarks.deselectionBookmark",
      "Launch on deselection",
      "The name of the bookmark to launch when a user deselects a button.",
      ["bookmarks", 0, "deselectionBookmark"],
    ),
    // bookmarkGroup/selectedBookmark excluded: which specific bookmark group/selection is
    // active is report content/state, not a stylable default — same test as Slicer's `data` group.
  },
  layout: {
    orientation: enumProp(
      "bookmarkNavigator",
      "bookmarkNavigator.layout.orientation",
      "Orientation",
      "Whether buttons are arranged in a row, a column, or a grid.",
      ["layout", 0, "orientation"],
      LAYOUT_ORIENTATION_OPTIONS,
    ),
    columnCount: numberProp(
      "bookmarkNavigator",
      "bookmarkNavigator.layout.columnCount",
      "Columns",
      "The number of columns, when arranged as a grid.",
      ["layout", 0, "columnCount"],
      1,
      20,
    ),
    rowCount: numberProp(
      "bookmarkNavigator",
      "bookmarkNavigator.layout.rowCount",
      "Rows",
      "The number of rows, when arranged as a grid.",
      ["layout", 0, "rowCount"],
      1,
      20,
    ),
    cellPadding: numberProp(
      "bookmarkNavigator",
      "bookmarkNavigator.layout.cellPadding",
      "Padding",
      "The space, in pixels, between buttons.",
      ["layout", 0, "cellPadding"],
      0,
      50,
    ),
  },
} as const;

export type ResolvedBookmarkNavigatorStyle = ResolvedShapeFamilyCore & {
  accentBar: { show: boolean; color: string; position: string | number; width: number; transparency: number };
  bookmarks: { allowDeselectionBookmark: boolean; hideDeselectedBookmark: boolean; deselectionBookmark: string };
  layout: { orientation: string | number; columnCount: number; rowCount: number; cellPadding: number };
};

/** `state` previews how the navigator looks in each interaction state — see resolveShapeFamilyCore's doc comment. */
export function resolveBookmarkNavigatorStyle(
  theme: ThemeSource,
  base: ResolvedTheme,
  state: InteractionState = "default",
): ResolvedBookmarkNavigatorStyle {
  const p = BOOKMARK_NAVIGATOR_PROPERTIES;
  const accentBarStateful = groupSupportsStates("bookmarkNavigator", "accentBar");
  const at = <T extends PropertyValueType>(definition: PropertyDefinition<T>): PropertyLookup<T> =>
    accentBarStateful ? forStateId(definition, state) : definition;
  return {
    ...resolveShapeFamilyCore(theme, p, base.foreground, base.fontFamily, state),
    accentBar: {
      show: resolvePropertyValue(theme, at(p.accentBar.show), false),
      color: resolvePropertyValue(theme, at(p.accentBar.color), base.tableAccent),
      position: resolvePropertyValue(theme, at(p.accentBar.position), "Left"),
      width: resolvePropertyValue(theme, at(p.accentBar.width), 4),
      transparency: resolvePropertyValue(theme, at(p.accentBar.transparency), 0),
    },
    bookmarks: {
      allowDeselectionBookmark: resolvePropertyValue(theme, p.bookmarks.allowDeselectionBookmark, false),
      hideDeselectedBookmark: resolvePropertyValue(theme, p.bookmarks.hideDeselectedBookmark, false),
      deselectionBookmark: resolvePropertyValue(theme, p.bookmarks.deselectionBookmark, ""),
    },
    layout: {
      orientation: resolvePropertyValue(theme, p.layout.orientation, 2),
      columnCount: resolvePropertyValue(theme, p.layout.columnCount, 1),
      rowCount: resolvePropertyValue(theme, p.layout.rowCount, 1),
      cellPadding: resolvePropertyValue(theme, p.layout.cellPadding, 4),
    },
  };
}

export { propertyThemePath };
