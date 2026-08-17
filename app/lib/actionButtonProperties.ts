import { boolProp, colorProp, enumProp, numberProp, propertyThemePath, resolvePropertyValue } from "./properties";
import { buildShapeFamilyCore, resolveShapeFamilyCore, type ResolvedShapeFamilyCore } from "./shapeFamilyProperties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * Action button — a clickable shape that triggers a report action
 * (bookmark, navigation, drillthrough, etc.), `visual-actionButton` in the
 * schema. Uses the shared shape-family core plus its own `icon` group (the
 * icon shown alongside the button's text).
 */

const ICON_SHAPE_OPTIONS = [
  { value: "blank", label: "Blank" },
  { value: "leftArrow", label: "Left arrow" },
  { value: "rightArrow", label: "Right arrow" },
  { value: "back", label: "Back" },
  { value: "reset", label: "Reset" },
  { value: "help", label: "Help" },
  { value: "information", label: "Information" },
  { value: "qna", label: "Q&A" },
  { value: "bookmarks", label: "Bookmark" },
  { value: "applyAllSlicers", label: "Apply all slicers" },
  { value: "clearAllSlicers", label: "Clear all slicers" },
  { value: "custom", label: "Custom" },
  { value: "spinner", label: "Spinner" },
] as const;

const ICON_PLACEMENT_OPTIONS = [
  { value: "custom", label: "Custom" },
  { value: "left", label: "Left of text" },
  { value: "right", label: "Right of text" },
  { value: "above", label: "Above text" },
  { value: "below", label: "Below text" },
] as const;

const ALIGNMENT_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const VERTICAL_ALIGNMENT_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Bottom" },
] as const;

export const ACTION_BUTTON_PROPERTIES = {
  ...buildShapeFamilyCore("actionButton"),
  icon: {
    show: boolProp("actionButton", "actionButton.icon.show", "Show", "Whether an icon is shown on the button.", ["icon", 0, "show"]),
    shapeType: enumProp(
      "actionButton",
      "actionButton.icon.shapeType",
      "Icon",
      "Which built-in icon is shown.",
      ["icon", 0, "shapeType"],
      ICON_SHAPE_OPTIONS,
    ),
    placement: enumProp(
      "actionButton",
      "actionButton.icon.placement",
      "Icon placement",
      "Where the icon sits relative to the button's text.",
      ["icon", 0, "placement"],
      ICON_PLACEMENT_OPTIONS,
    ),
    iconSize: numberProp(
      "actionButton",
      "actionButton.icon.iconSize",
      "Icon size",
      "The size of the icon, in pixels.",
      ["icon", 0, "iconSize"],
      0,
      100,
    ),
    lineColor: colorProp(
      "actionButton",
      "actionButton.icon.lineColor",
      "Line color",
      "The colour of the icon's line art.",
      ["icon", 0, "lineColor"],
    ),
    lineWeight: numberProp(
      "actionButton",
      "actionButton.icon.lineWeight",
      "Weight",
      "The thickness of the icon's line art, in pixels.",
      ["icon", 0, "lineWeight"],
      0,
      20,
    ),
    lineTransparency: numberProp(
      "actionButton",
      "actionButton.icon.lineTransparency",
      "Transparency",
      "How see-through the icon's line colour appears — 0 is solid, 100 is invisible.",
      ["icon", 0, "lineTransparency"],
      0,
      100,
    ),
    horizontalAlignment: enumProp(
      "actionButton",
      "actionButton.icon.horizontalAlignment",
      "Horizontal alignment",
      "How the icon lines up horizontally within the button.",
      ["icon", 0, "horizontalAlignment"],
      ALIGNMENT_OPTIONS,
    ),
    verticalAlignment: enumProp(
      "actionButton",
      "actionButton.icon.verticalAlignment",
      "Vertical alignment",
      "How the icon lines up vertically within the button.",
      ["icon", 0, "verticalAlignment"],
      VERTICAL_ALIGNMENT_OPTIONS,
    ),
    topMargin: numberProp(
      "actionButton",
      "actionButton.icon.topMargin",
      "Top margin",
      "The space, in pixels, above the icon.",
      ["icon", 0, "topMargin"],
      0,
      100,
      undefined,
      "Margins",
    ),
    bottomMargin: numberProp(
      "actionButton",
      "actionButton.icon.bottomMargin",
      "Bottom margin",
      "The space, in pixels, below the icon.",
      ["icon", 0, "bottomMargin"],
      0,
      100,
      undefined,
      "Margins",
    ),
    leftMargin: numberProp(
      "actionButton",
      "actionButton.icon.leftMargin",
      "Left margin",
      "The space, in pixels, to the left of the icon.",
      ["icon", 0, "leftMargin"],
      0,
      100,
      undefined,
      "Margins",
    ),
    rightMargin: numberProp(
      "actionButton",
      "actionButton.icon.rightMargin",
      "Right margin",
      "The space, in pixels, to the right of the icon.",
      ["icon", 0, "rightMargin"],
      0,
      100,
      undefined,
      "Margins",
    ),
    // $id (default/hover/selected/disabled) excluded: an interaction-state discriminator,
    // not a stylable value itself — same "per-instance, not per-visual-type" test as
    // Matrix's subTotals.$id. `image` ($ref image) excluded: complex nested object.
  },
} as const;

export type ResolvedActionButtonStyle = ResolvedShapeFamilyCore & {
  icon: {
    show: boolean;
    shapeType: string | number;
    placement: string | number;
    iconSize: number;
    lineColor: string;
    lineWeight: number;
    lineTransparency: number;
    horizontalAlignment: string | number;
    verticalAlignment: string | number;
    topMargin: number;
    bottomMargin: number;
    leftMargin: number;
    rightMargin: number;
  };
};

export function resolveActionButtonStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedActionButtonStyle {
  const p = ACTION_BUTTON_PROPERTIES;
  return {
    ...resolveShapeFamilyCore(theme, p, base.foreground, base.fontFamily),
    icon: {
      show: resolvePropertyValue(theme, p.icon.show, true),
      shapeType: resolvePropertyValue(theme, p.icon.shapeType, "blank"),
      placement: resolvePropertyValue(theme, p.icon.placement, "left"),
      iconSize: resolvePropertyValue(theme, p.icon.iconSize, 20),
      lineColor: resolvePropertyValue(theme, p.icon.lineColor, base.foreground),
      lineWeight: resolvePropertyValue(theme, p.icon.lineWeight, 2),
      lineTransparency: resolvePropertyValue(theme, p.icon.lineTransparency, 0),
      horizontalAlignment: resolvePropertyValue(theme, p.icon.horizontalAlignment, "center"),
      verticalAlignment: resolvePropertyValue(theme, p.icon.verticalAlignment, "middle"),
      topMargin: resolvePropertyValue(theme, p.icon.topMargin, 0),
      bottomMargin: resolvePropertyValue(theme, p.icon.bottomMargin, 0),
      leftMargin: resolvePropertyValue(theme, p.icon.leftMargin, 0),
      rightMargin: resolvePropertyValue(theme, p.icon.rightMargin, 0),
    },
  };
}

export { propertyThemePath };
