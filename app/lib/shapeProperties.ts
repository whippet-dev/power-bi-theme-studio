import { propertyThemePath } from "./properties";
import { buildShapeFamilyCore, resolveShapeFamilyCore, type ResolvedShapeFamilyCore } from "./shapeFamilyProperties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * Shape — a plain decorative canvas shape (rectangle, oval, arrow, speech
 * bubble, etc.), `visual-shape` in the schema. Uses the shared shape-family
 * core (fill/outline/shadow/glow/rotation/shape/text) with no extra groups
 * of its own — the only shape-family visual with `shape.linecapType`.
 */
export const SHAPE_PROPERTIES = buildShapeFamilyCore("shape", { linecap: true });

export type ResolvedShapeStyle = ResolvedShapeFamilyCore;

export function resolveShapeStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedShapeStyle {
  return resolveShapeFamilyCore(theme, SHAPE_PROPERTIES, base.foreground, base.fontFamily);
}

export { propertyThemePath };
