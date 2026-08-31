import {
  boolProp,
  colorProp,
  enumProp,
  forStateId,
  groupSupportsStates,
  numberProp,
  propertyThemePath,
  resolvePropertyValue,
  } from "./properties";
import type { InteractionState, PropertyDefinition, PropertyValueType, ThemeSource, PropertyLookup } from "./properties";
import { buildShapeFamilyCore, resolveShapeFamilyCore, type ResolvedShapeFamilyCore, type ShapeFamilyDefaults } from "./shapeFamilyProperties";
import type { ResolvedTheme } from "./theme";

/**
 * Page navigator — a row/grid of buttons that jump between report pages,
 * `visual-pageNavigator` in the schema. Verified against the schema:
 * shares byte-identical fill/glow/outline/rotation/shadow/shape/text and
 * accentBar/layout groups with Bookmark navigator — the two visuals are
 * the same UI component pointed at pages instead of bookmarks. Only the
 * `pages` group (vs. `bookmarks`) differs.
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

export const PAGE_NAVIGATOR_PROPERTIES = {
  ...buildShapeFamilyCore("pageNavigator"),
  accentBar: {
    show: boolProp(
      "pageNavigator",
      "pageNavigator.accentBar.show",
      "Show",
      "Whether a highlight bar is drawn along one edge of the selected button.",
      ["accentBar", 0, "show"],
    ),
    color: colorProp(
      "pageNavigator",
      "pageNavigator.accentBar.color",
      "Color",
      "The colour of the accent bar.",
      ["accentBar", 0, "color"],
    ),
    position: enumProp(
      "pageNavigator",
      "pageNavigator.accentBar.position",
      "Position",
      "Which edge of the button the accent bar is drawn along.",
      ["accentBar", 0, "position"],
      ACCENT_BAR_POSITION_OPTIONS,
    ),
    width: numberProp(
      "pageNavigator",
      "pageNavigator.accentBar.width",
      "Width",
      "The thickness of the accent bar, in pixels.",
      ["accentBar", 0, "width"],
      0,
      20,
    ),
    transparency: numberProp(
      "pageNavigator",
      "pageNavigator.accentBar.transparency",
      "Transparency",
      "How see-through the accent bar appears — 0 is solid, 100 is invisible.",
      ["accentBar", 0, "transparency"],
      0,
      100,
    ),
  },
  pages: {
    showPage: boolProp(
      "pageNavigator",
      "pageNavigator.pages.showPage",
      "Show",
      "Whether a button is shown for this page.",
      ["pages", 0, "showPage"],
    ),
    showByDefault: boolProp(
      "pageNavigator",
      "pageNavigator.pages.showByDefault",
      "Show all by default",
      "Whether new pages get a navigator button automatically.",
      ["pages", 0, "showByDefault"],
    ),
    showHiddenPages: boolProp(
      "pageNavigator",
      "pageNavigator.pages.showHiddenPages",
      "Show hidden pages",
      "Whether hidden pages still get a navigator button.",
      ["pages", 0, "showHiddenPages"],
    ),
    showTooltipPages: boolProp(
      "pageNavigator",
      "pageNavigator.pages.showTooltipPages",
      "Show tooltip pages",
      "Whether pages used as tooltips still get a navigator button.",
      ["pages", 0, "showTooltipPages"],
    ),
  },
  layout: {
    orientation: enumProp(
      "pageNavigator",
      "pageNavigator.layout.orientation",
      "Orientation",
      "Whether buttons are arranged in a row, a column, or a grid.",
      ["layout", 0, "orientation"],
      LAYOUT_ORIENTATION_OPTIONS,
    ),
    columnCount: numberProp(
      "pageNavigator",
      "pageNavigator.layout.columnCount",
      "Columns",
      "The number of columns, when arranged as a grid.",
      ["layout", 0, "columnCount"],
      1,
      20,
    ),
    rowCount: numberProp(
      "pageNavigator",
      "pageNavigator.layout.rowCount",
      "Rows",
      "The number of rows, when arranged as a grid.",
      ["layout", 0, "rowCount"],
      1,
      20,
    ),
    cellPadding: numberProp(
      "pageNavigator",
      "pageNavigator.layout.cellPadding",
      "Padding",
      "The space, in pixels, between buttons.",
      ["layout", 0, "cellPadding"],
      0,
      50,
    ),
  },
} as const;

export type ResolvedPageNavigatorStyle = ResolvedShapeFamilyCore & {
  accentBar: { show: boolean; color: string; position: string | number; width: number; transparency: number };
  pages: { showPage: boolean; showByDefault: boolean; showHiddenPages: boolean; showTooltipPages: boolean };
  layout: { orientation: string | number; columnCount: number; rowCount: number; cellPadding: number };
};

/** `state` previews how the navigator looks in each interaction state — see resolveShapeFamilyCore's doc comment. */

/**
 * Measured natively on a Page Navigator under the current default base theme:
 * text ON, Segoe UI 10, bold, left-aligned and vertically middle, no padding;
 * fill on; border on at 1px and full opacity; no shadow, no glow.
 *
 * The pressed and selected states differ from the default only by colour, so
 * nothing per-state is encoded -- see ShapeFamilyDefaults.perState.
 */
const PAGE_NAVIGATOR_CAPABILITY_DEFAULTS: ShapeFamilyDefaults = {
  fill: { show: true },
  outline: { show: true, weight: 1, transparency: 0 },
  shadow: { show: false },
  glow: { show: false },
  text: {
    show: true,
    fontSize: 10,
    bold: true,
    horizontalAlignment: "left",
    verticalAlignment: "middle",
    topMargin: 0,
    bottomMargin: 0,
    leftMargin: 0,
    rightMargin: 0,
  },
};

export function resolvePageNavigatorStyle(
  theme: ThemeSource,
  base: ResolvedTheme,
  state: InteractionState = "default",
): ResolvedPageNavigatorStyle {
  const p = PAGE_NAVIGATOR_PROPERTIES;
  const accentBarStateful = groupSupportsStates("pageNavigator", "accentBar");
  const at = <T extends PropertyValueType>(definition: PropertyDefinition<T>): PropertyLookup<T> =>
    accentBarStateful ? forStateId(definition, state) : definition;
  return {
    ...resolveShapeFamilyCore(theme, p, base.foreground, base.fontFamily, state, PAGE_NAVIGATOR_CAPABILITY_DEFAULTS),
    accentBar: {
      show: resolvePropertyValue(theme, at(p.accentBar.show), false),
      color: resolvePropertyValue(theme, at(p.accentBar.color), base.tableAccent),
      position: resolvePropertyValue(theme, at(p.accentBar.position), "Left"),
      width: resolvePropertyValue(theme, at(p.accentBar.width), 4),
      transparency: resolvePropertyValue(theme, at(p.accentBar.transparency), 0),
    },
    pages: {
      showPage: resolvePropertyValue(theme, p.pages.showPage, true),
      showByDefault: resolvePropertyValue(theme, p.pages.showByDefault, true),
      // Measured: hidden pages ARE shown by default; tooltip pages are not.
      showHiddenPages: resolvePropertyValue(theme, p.pages.showHiddenPages, true),
      showTooltipPages: resolvePropertyValue(theme, p.pages.showTooltipPages, false),
    },
    layout: {
      orientation: resolvePropertyValue(theme, p.layout.orientation, 2),
      columnCount: resolvePropertyValue(theme, p.layout.columnCount, 1),
      rowCount: resolvePropertyValue(theme, p.layout.rowCount, 1),
      cellPadding: resolvePropertyValue(theme, p.layout.cellPadding, 5),
    },
  };
}

export { propertyThemePath };
