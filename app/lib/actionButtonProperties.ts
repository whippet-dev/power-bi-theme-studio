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
import { nativeToken, type NativeTokenName } from "./nativeTokens";
import type { ResolvedTheme } from "./theme";

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

/**
 * `state` previews how the button looks in each interaction state — see
 * resolveShapeFamilyCore's doc comment. Icon is also a stateful group here
 * (STATEFUL_GROUPS.actionButton includes it), unlike the other shape-family
 * visuals.
 */

/**
 * Measured natively on an Action Button under the current default base theme,
 * across Default / On hover / On press: fill OFF, border ON at 3px and full
 * opacity, text off with Segoe UI 10 latent, no shadow, no glow.
 *
 * Disabled differs only in colour treatment, which is not encoded here.
 */
/**
 * Measured on a Blank button, all four states.
 *
 * `default`, `hover` and `press` are byte-identical; only `disabled` differs,
 * and it differs entirely in colour: text and icon drop to
 * `foregroundNeutralTertiary`, fill and outline become a `backgroundNeutral`
 * plate, and the fill goes opaque so that plate actually shows.
 *
 * It does NOT use `disabledText`. That token exists and Fluent 2 uses it for
 * a navigator's press state, so it was the obvious guess and it is wrong.
 */
const ACTION_BUTTON_CAPABILITY_DEFAULTS: ShapeFamilyDefaults = {
  fill: { show: false, color: { token: "background" }, transparency: 50 },
  outline: { show: true, weight: 3, transparency: 0, color: { token: "foregroundNeutralSecondary" } },
  shadow: { show: false, color: { token: "foreground" }, transparency: 70, blur: 20 },
  glow: { show: false, color: { dataColor: 0 }, transparency: 0, blur: 40 },
  text: {
    show: false,
    fontSize: { fromTextClass: "label" },
    color: { token: "foregroundNeutralSecondary" },
    topMargin: 4,
    bottomMargin: 4,
    leftMargin: 4,
    rightMargin: 4,
  },
  shapeParams: { roundEdge: 0, rectangleRoundedCurve: 0 },
  perState: {
    disabled: {
      fill: { color: { token: "backgroundNeutral" }, transparency: 0 },
      outline: { color: { token: "backgroundNeutral" } },
      text: { color: { token: "foregroundNeutralTertiary" } },
    },
  },
};

/**
 * The button's icon colour follows its text: `foregroundNeutralSecondary`
 * normally, `foregroundNeutralTertiary` when disabled. Kept here rather than
 * in the shared core because `icon` is the button's own group.
 */
const ICON_LINE_COLOR: Partial<Record<InteractionState, NativeTokenName>> = {
  disabled: "foregroundNeutralTertiary",
};

export function resolveActionButtonStyle(
  theme: ThemeSource,
  base: ResolvedTheme,
  state: InteractionState = "default",
): ResolvedActionButtonStyle {
  const p = ACTION_BUTTON_PROPERTIES;
  const iconStateful = groupSupportsStates("actionButton", "icon");
  const at = <T extends PropertyValueType>(definition: PropertyDefinition<T>): PropertyLookup<T> =>
    iconStateful ? forStateId(definition, state) : definition;
  return {
    ...resolveShapeFamilyCore(theme, p, base.foreground, base.fontFamily, state, ACTION_BUTTON_CAPABILITY_DEFAULTS),
    icon: {
      show: resolvePropertyValue(theme, at(p.icon.show), true),
      shapeType: resolvePropertyValue(theme, at(p.icon.shapeType), "blank"),
      // Measured: Custom placement, 3px line weight, 4px padding all round.
      placement: resolvePropertyValue(theme, at(p.icon.placement), "custom"),
      iconSize: resolvePropertyValue(theme, at(p.icon.iconSize), 20),
      lineColor: resolvePropertyValue(
        theme,
        at(p.icon.lineColor),
        nativeToken(theme, ICON_LINE_COLOR[state] ?? "foregroundNeutralSecondary"),
      ),
      lineWeight: resolvePropertyValue(theme, at(p.icon.lineWeight), 3),
      lineTransparency: resolvePropertyValue(theme, at(p.icon.lineTransparency), 0),
      horizontalAlignment: resolvePropertyValue(theme, at(p.icon.horizontalAlignment), "center"),
      verticalAlignment: resolvePropertyValue(theme, at(p.icon.verticalAlignment), "middle"),
      topMargin: resolvePropertyValue(theme, at(p.icon.topMargin), 4),
      bottomMargin: resolvePropertyValue(theme, at(p.icon.bottomMargin), 4),
      leftMargin: resolvePropertyValue(theme, at(p.icon.leftMargin), 4),
      rightMargin: resolvePropertyValue(theme, at(p.icon.rightMargin), 4),
    },
  };
}

export { propertyThemePath };
