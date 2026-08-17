import { propertyThemePath, resolvePropertyValue, type PropertyDefinition } from "./properties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

export type ResolvedTableStyle = {
  headerBackground: string;
  headerText: string;
  headerFontSize: number;
  valuesText: string;
  valuesFontSize: number;
  rowBaseBackground: string;
  rowAltBackground: string;
  gridlinesVisible: boolean;
  gridlineColor: string;
  rowPadding: number;
};

/** Table ("tableEx") properties, in Power BI's own format-pane wording. */
export const TABLE_PROPERTIES = {
  headerBackground: {
    id: "table.headerBackground",
    visual: "tableEx",
    valueType: "color",
    label: "Header background",
    description: "The fill colour behind the column header row.",
    guidance: "A strong colour here helps the header stand out from the data rows below it.",
    path: ["columnHeaders", 0, "backColor"],
  } satisfies PropertyDefinition<"color">,

  headerText: {
    id: "table.headerText",
    visual: "tableEx",
    valueType: "color",
    label: "Header text colour",
    description: "The colour of the column names in the header row.",
    guidance: "Keep this high-contrast against the header background so titles stay readable.",
    path: ["columnHeaders", 0, "fontColor"],
  } satisfies PropertyDefinition<"color">,

  headerFontSize: {
    id: "table.headerFontSize",
    visual: "tableEx",
    valueType: "number",
    label: "Header font size",
    description: "The text size used for column names.",
    guidance: undefined,
    path: ["columnHeaders", 0, "fontSize"],
    min: 8,
    max: 18,
  } satisfies PropertyDefinition<"number">,

  valuesText: {
    id: "table.valuesText",
    visual: "tableEx",
    valueType: "color",
    label: "Values text colour",
    description: "The colour of the data shown in each row.",
    guidance: undefined,
    path: ["values", 0, "fontColorPrimary"],
  } satisfies PropertyDefinition<"color">,

  valuesFontSize: {
    id: "table.valuesFontSize",
    visual: "tableEx",
    valueType: "number",
    label: "Values font size",
    description: "The text size used for the data rows.",
    guidance: undefined,
    path: ["values", 0, "fontSize"],
    min: 8,
    max: 18,
  } satisfies PropertyDefinition<"number">,

  rowBaseBackground: {
    id: "table.rowBaseBackground",
    visual: "tableEx",
    valueType: "color",
    label: "Row background",
    description: "The fill colour for every data row.",
    guidance: undefined,
    path: ["values", 0, "backColorPrimary"],
  } satisfies PropertyDefinition<"color">,

  rowAltBackground: {
    id: "table.rowAltBackground",
    visual: "tableEx",
    valueType: "color",
    label: "Alternating row background",
    description: "The fill colour for every other data row.",
    guidance: "Set this different from the row background to add banded, easier-to-scan rows.",
    path: ["values", 0, "backColorSecondary"],
  } satisfies PropertyDefinition<"color">,

  gridlinesVisible: {
    id: "table.gridlinesVisible",
    visual: "tableEx",
    valueType: "boolean",
    label: "Horizontal gridlines",
    description: "Whether a line is drawn between rows.",
    guidance: undefined,
    path: ["grid", 0, "gridHorizontal"],
  } satisfies PropertyDefinition<"boolean">,

  gridlineColor: {
    id: "table.gridlineColor",
    visual: "tableEx",
    valueType: "color",
    label: "Gridline colour",
    description: "The colour of the lines separating rows.",
    guidance: "Increasing contrast makes rows easier to distinguish but creates a stronger grid.",
    path: ["grid", 0, "gridHorizontalColor"],
  } satisfies PropertyDefinition<"color">,

  rowPadding: {
    id: "table.rowPadding",
    visual: "tableEx",
    valueType: "number",
    label: "Row padding",
    description: "The vertical space inside each row, above and below the text.",
    guidance: undefined,
    path: ["grid", 0, "rowPadding"],
    min: 0,
    max: 12,
  } satisfies PropertyDefinition<"number">,
} as const;

/**
 * Resolves every Table property to its theme override, falling back to the
 * shared theme tokens (background/foreground/tableAccent) so a theme with no
 * `visualStyles.tableEx` still previews sensibly — matching how Power BI's
 * simple theming recolours a table (accent header, light header text) before
 * any per-visual override exists.
 */
export function resolveTableStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedTableStyle {
  const p = TABLE_PROPERTIES;
  return {
    headerBackground: resolvePropertyValue(theme, p.headerBackground, base.tableAccent),
    headerText: resolvePropertyValue(theme, p.headerText, base.background),
    headerFontSize: resolvePropertyValue(theme, p.headerFontSize, 12),
    valuesText: resolvePropertyValue(theme, p.valuesText, base.foreground),
    valuesFontSize: resolvePropertyValue(theme, p.valuesFontSize, 12),
    rowBaseBackground: resolvePropertyValue(theme, p.rowBaseBackground, base.background),
    rowAltBackground: resolvePropertyValue(theme, p.rowAltBackground, base.background),
    gridlinesVisible: resolvePropertyValue(theme, p.gridlinesVisible, true),
    gridlineColor: resolvePropertyValue(theme, p.gridlineColor, "#E3E3E3"),
    rowPadding: resolvePropertyValue(theme, p.rowPadding, 3),
  };
}

export { propertyThemePath };
