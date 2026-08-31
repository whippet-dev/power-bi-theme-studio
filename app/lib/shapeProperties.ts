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
  fill: { show: true },
  outline: { show: true, weight: 1 },
  shadow: { show: false },
  glow: { show: false },
  // Off, but styled: the latent typography is what appears the moment a user
  // switches text on, so it is a real default rather than a placeholder.
  text: { show: false, fontSize: 10, topMargin: 0, bottomMargin: 0, leftMargin: 0, rightMargin: 0 },
};

export function resolveShapeStyle(theme: ThemeSource, base: ResolvedTheme): ResolvedShapeStyle {
  // Shape is NOT stateful, so the state argument stays "default"; its
  // capability defaults are its own and are not shared with the buttons.
  return resolveShapeFamilyCore(theme, SHAPE_PROPERTIES, base.foreground, base.fontFamily, "default", SHAPE_CAPABILITY_DEFAULTS);
}

export { propertyThemePath };
