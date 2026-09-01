import type { ThemeSource } from "./properties";
import { propertyThemePath } from "./properties";
import { buildShapeFamilyCore, resolveShapeFamilyCore, type ResolvedShapeFamilyCore, type ShapeFamilyDefaults } from "./shapeFamilyProperties";
import type { ResolvedTheme } from "./theme";

/**
 * Shape — a plain decorative canvas shape (rectangle, oval, arrow, speech
 * bubble, etc.), `visual-shape` in the schema. Uses the shared shape-family
 * core (fill/outline/shadow/glow/rotation/shape/text) with no extra groups
 * of its own — the only shape-family visual with `shape.linecapType`.
 */
export const SHAPE_PROPERTIES = buildShapeFamilyCore("shape", { linecap: true });

export type ResolvedShapeStyle = ResolvedShapeFamilyCore;


/**
 * Measured natively on a Rectangle under the current default base theme:
 * fill on, border on at 1px, text off with Segoe UI 10 latent behind it,
 * zero text padding, no shadow, no glow.
 *
 * Two of these differ from what the shared resolver assumed: the border was
 * defaulting to OFF and the text to ON, both backwards for a shape.
 */
const SHAPE_CAPABILITY_DEFAULTS: ShapeFamilyDefaults = {
  // Shape is the family's outlier twice over: its text is a capability
  // constant where the other three derive from the label class, and its
  // shadow is a hard black where theirs is `foreground`.
  fill: { show: true, color: { dataColor: 0 } },
  // The border is the fill shaded by a quarter — a ThemeDataColor
  // expression, not a token and not a constant.
  outline: { show: true, weight: 1, color: { dataColor: 0, shade: -0.25 } },
  shadow: { show: false, color: { constant: "#000000" }, transparency: 70, blur: 20 },
  glow: { show: false, color: { dataColor: 0 }, transparency: 0, blur: 40 },
  // Off, but styled: the latent typography is what appears the moment a user
  // switches text on, so it is a real default rather than a placeholder.
  // Segoe UI 10 held under a theme setting `label` to 20 and appears in none
  // of that theme's four classes, so both family and size are constants.
  text: {
    show: false,
    fontFamily: "Segoe UI",
    fontSize: 10,
    color: { token: "background" },
    topMargin: 0,
    bottomMargin: 0,
    leftMargin: 0,
    rightMargin: 0,
  },
  shapeParams: { roundEdge: 0, rectangleRoundedCurve: 0 },
};

export function resolveShapeStyle(theme: ThemeSource, base: ResolvedTheme): ResolvedShapeStyle {
  // Shape is NOT stateful, so the state argument stays "default"; its
  // capability defaults are its own and are not shared with the buttons.
  return resolveShapeFamilyCore(theme, SHAPE_PROPERTIES, base.foreground, base.fontFamily, "default", SHAPE_CAPABILITY_DEFAULTS);
}

export { propertyThemePath };
