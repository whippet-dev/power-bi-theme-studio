import { propertyThemePath, resolvePropertyValue, type EnumOption, type PropertyDefinition } from "./properties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * Table ("tableEx") property registry, pinned to Microsoft's published
 * schema reportThemeSchema-2.156.json (microsoft/powerbi-desktop-samples).
 * Grouped exactly as Power BI Desktop's own format pane groups them, so the
 * property panel and Microsoft's UI stay recognisable to each other.
 *
 * Two schema fields are intentionally not covered:
 * - `values.icon` and `columnFormatting.dataBars` are complex nested rule
 *   objects (conditional-formatting-style), not a single editable value.
 * - `columnWidth` is keyed per-column rather than per-visual-type, so it
 *   doesn't fit this app's current "one value per visual type" model; it
 *   needs the per-column selection UI called out as future work.
 * All three still round-trip untouched on import/export, per this app's
 * "never discard JSON it doesn't understand" rule — they're just not
 * exposed as controls yet.
 */

const ALIGNMENT_OPTIONS = [
  { value: "Auto", label: "Auto" },
  { value: "Left", label: "Left" },
  { value: "Center", label: "Center" },
  { value: "Right", label: "Right" },
] as const satisfies readonly EnumOption[];

function colorProp(
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  guidance?: string,
): PropertyDefinition<"color"> {
  return { id, visual: "tableEx", valueType: "color", label, description, guidance, path };
}

function numberProp(
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  min: number,
  max: number,
  guidance?: string,
): PropertyDefinition<"number"> {
  return { id, visual: "tableEx", valueType: "number", label, description, guidance, path, min, max };
}

function boolProp(
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  guidance?: string,
): PropertyDefinition<"boolean"> {
  return { id, visual: "tableEx", valueType: "boolean", label, description, guidance, path };
}

function textProp(
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  guidance?: string,
): PropertyDefinition<"text"> {
  return { id, visual: "tableEx", valueType: "text", label, description, guidance, path };
}

function enumProp(
  id: string,
  label: string,
  description: string,
  path: Array<string | number>,
  options: readonly EnumOption[],
  guidance?: string,
): PropertyDefinition<"enum"> {
  return { id, visual: "tableEx", valueType: "enum", label, description, guidance, path, options };
}

export const TABLE_PROPERTIES = {
  columnHeaders: {
    alignment: enumProp(
      "table.columnHeaders.alignment",
      "Alignment",
      "How column names line up within the header row.",
      ["columnHeaders", 0, "alignment"],
      ALIGNMENT_OPTIONS,
    ),
    backColor: colorProp(
      "table.columnHeaders.backColor",
      "Background color",
      "The fill colour behind the column header row.",
      ["columnHeaders", 0, "backColor"],
      "A strong colour here helps the header stand out from the data rows below it.",
    ),
    fontColor: colorProp(
      "table.columnHeaders.fontColor",
      "Font color",
      "The colour of the column names in the header row.",
      ["columnHeaders", 0, "fontColor"],
      "Keep this high-contrast against the header background so titles stay readable.",
    ),
    fontFamily: textProp(
      "table.columnHeaders.fontFamily",
      "Font family",
      "The typeface used for column names.",
      ["columnHeaders", 0, "fontFamily"],
    ),
    fontSize: numberProp(
      "table.columnHeaders.fontSize",
      "Text size",
      "The text size used for column names.",
      ["columnHeaders", 0, "fontSize"],
      8,
      18,
    ),
    bold: boolProp(
      "table.columnHeaders.bold",
      "Bold",
      "Whether column names are bold.",
      ["columnHeaders", 0, "bold"],
    ),
    italic: boolProp(
      "table.columnHeaders.italic",
      "Italic",
      "Whether column names are italic.",
      ["columnHeaders", 0, "italic"],
    ),
    underline: boolProp(
      "table.columnHeaders.underline",
      "Underline",
      "Whether column names are underlined.",
      ["columnHeaders", 0, "underline"],
    ),
    wordWrap: boolProp(
      "table.columnHeaders.wordWrap",
      "Word wrap",
      "Whether long column names wrap onto a second line instead of being cut off.",
      ["columnHeaders", 0, "wordWrap"],
    ),
    autoSizeColumnWidth: boolProp(
      "table.columnHeaders.autoSizeColumnWidth",
      "Auto-size column width",
      "Whether columns automatically resize to fit their content.",
      ["columnHeaders", 0, "autoSizeColumnWidth"],
    ),
    customColumnWidth: boolProp(
      "table.columnHeaders.customColumnWidth",
      "Custom widths",
      "Whether individual columns can be resized separately, overriding the default width.",
      ["columnHeaders", 0, "customColumnWidth"],
    ),
    defaultColumnWidth: numberProp(
      "table.columnHeaders.defaultColumnWidth",
      "Default width",
      "The default column width in pixels, used when custom widths aren't set.",
      ["columnHeaders", 0, "defaultColumnWidth"],
      20,
      400,
    ),
    columnAdjustment: enumProp(
      "table.columnHeaders.columnAdjustment",
      "Auto-size behavior",
      "How column widths adjust when the table is resized or content changes.",
      ["columnHeaders", 0, "columnAdjustment"],
      [
        { value: "fitToContent", label: "Fit to content" },
        { value: "growToFit", label: "Grow to fit" },
        { value: "fixedWidth", label: "Fixed width" },
      ] as const,
    ),
    outlineColor: colorProp(
      "table.columnHeaders.outlineColor",
      "Outline color",
      "The colour of the border drawn around the header row.",
      ["columnHeaders", 0, "outlineColor"],
    ),
    outlineWeight: numberProp(
      "table.columnHeaders.outlineWeight",
      "Outline weight",
      "The thickness, in pixels, of the header row's border.",
      ["columnHeaders", 0, "outlineWeight"],
      0,
      8,
    ),
    outlineStyle: numberProp(
      "table.columnHeaders.outlineStyle",
      "Outline",
      "Power BI's internal numeric code for which sides of the header row show a border.",
      ["columnHeaders", 0, "outlineStyle"],
      0,
      6,
      "Not individually documented in Microsoft's schema; experiment with values 0–6 to see the effect.",
    ),
  },

  values: {
    backColor: colorProp(
      "table.values.backColor",
      "Background color",
      "The row fill colour, used when alternating row colours are turned off.",
      ["values", 0, "backColor"],
    ),
    backColorPrimary: colorProp(
      "table.values.backColorPrimary",
      "Background color (banded)",
      "The base row fill colour when alternating row colours are turned on.",
      ["values", 0, "backColorPrimary"],
    ),
    backColorSecondary: colorProp(
      "table.values.backColorSecondary",
      "Alternate background color",
      "The fill colour for every other row when alternating row colours are turned on.",
      ["values", 0, "backColorSecondary"],
      "Set this different from the base row colour to add banded, easier-to-scan rows.",
    ),
    fontColor: colorProp(
      "table.values.fontColor",
      "Font color",
      "The data text colour, used when alternating row colours are turned off.",
      ["values", 0, "fontColor"],
    ),
    fontColorPrimary: colorProp(
      "table.values.fontColorPrimary",
      "Font color (banded)",
      "The base row's data text colour when alternating row colours are turned on.",
      ["values", 0, "fontColorPrimary"],
    ),
    fontColorSecondary: colorProp(
      "table.values.fontColorSecondary",
      "Alternate font color",
      "The data text colour for every other row when alternating row colours are turned on.",
      ["values", 0, "fontColorSecondary"],
    ),
    fontFamily: textProp(
      "table.values.fontFamily",
      "Font family",
      "The typeface used for the data in each row.",
      ["values", 0, "fontFamily"],
    ),
    fontSize: numberProp(
      "table.values.fontSize",
      "Text size",
      "The text size used for the data rows.",
      ["values", 0, "fontSize"],
      8,
      18,
    ),
    bold: boolProp("table.values.bold", "Bold", "Whether row data is bold.", ["values", 0, "bold"]),
    italic: boolProp("table.values.italic", "Italic", "Whether row data is italic.", ["values", 0, "italic"]),
    underline: boolProp(
      "table.values.underline",
      "Underline",
      "Whether row data is underlined.",
      ["values", 0, "underline"],
    ),
    wordWrap: boolProp(
      "table.values.wordWrap",
      "Word wrap",
      "Whether long values wrap onto a second line instead of being cut off.",
      ["values", 0, "wordWrap"],
    ),
    urlIcon: boolProp(
      "table.values.urlIcon",
      "URL icon",
      "Whether values containing a web address show as a clickable link icon instead of raw text.",
      ["values", 0, "urlIcon"],
    ),
    webURL: textProp(
      "table.values.webURL",
      "Web URL",
      "The specific column field treated as a web address, when URL icon is on.",
      ["values", 0, "webURL"],
    ),
    outlineColor: colorProp(
      "table.values.outlineColor",
      "Outline color",
      "The colour of the border drawn around the data rows.",
      ["values", 0, "outlineColor"],
    ),
    outlineWeight: numberProp(
      "table.values.outlineWeight",
      "Outline weight",
      "The thickness, in pixels, of the data rows' border.",
      ["values", 0, "outlineWeight"],
      0,
      8,
    ),
    outlineStyle: numberProp(
      "table.values.outlineStyle",
      "Outline",
      "Power BI's internal numeric code for which sides of each row show a border.",
      ["values", 0, "outlineStyle"],
      0,
      6,
      "Not individually documented in Microsoft's schema; experiment with values 0–6 to see the effect.",
    ),
  },

  total: {
    totals: boolProp(
      "table.total.totals",
      "Totals",
      "Whether a totals row is shown at the bottom of the table.",
      ["total", 0, "totals"],
    ),
    label: textProp(
      "table.total.label",
      "Total label",
      "The text shown in the leftmost cell of the totals row.",
      ["total", 0, "label"],
    ),
    backColor: colorProp(
      "table.total.backColor",
      "Background color",
      "The fill colour behind the totals row.",
      ["total", 0, "backColor"],
    ),
    fontColor: colorProp(
      "table.total.fontColor",
      "Font color",
      "The text colour used in the totals row.",
      ["total", 0, "fontColor"],
    ),
    fontFamily: textProp(
      "table.total.fontFamily",
      "Font family",
      "The typeface used for the totals row.",
      ["total", 0, "fontFamily"],
    ),
    fontSize: numberProp(
      "table.total.fontSize",
      "Text size",
      "The text size used for the totals row.",
      ["total", 0, "fontSize"],
      8,
      18,
    ),
    bold: boolProp(
      "table.total.bold",
      "Bold",
      "Whether the totals row is bold.",
      ["total", 0, "bold"],
      "Bold totals help them stand out from the data rows above.",
    ),
    italic: boolProp("table.total.italic", "Italic", "Whether the totals row is italic.", ["total", 0, "italic"]),
    underline: boolProp(
      "table.total.underline",
      "Underline",
      "Whether the totals row is underlined.",
      ["total", 0, "underline"],
    ),
    outlineColor: colorProp(
      "table.total.outlineColor",
      "Outline color",
      "The colour of the border drawn around the totals row.",
      ["total", 0, "outlineColor"],
    ),
    outlineWeight: numberProp(
      "table.total.outlineWeight",
      "Outline weight",
      "The thickness, in pixels, of the totals row's border.",
      ["total", 0, "outlineWeight"],
      0,
      8,
    ),
    outlineStyle: numberProp(
      "table.total.outlineStyle",
      "Outline",
      "Power BI's internal numeric code for which sides of the totals row show a border.",
      ["total", 0, "outlineStyle"],
      0,
      6,
      "Not individually documented in Microsoft's schema; experiment with values 0–6 to see the effect.",
    ),
  },

  grid: {
    gridHorizontal: boolProp(
      "table.grid.gridHorizontal",
      "Horizontal grid",
      "Whether a line is drawn between rows.",
      ["grid", 0, "gridHorizontal"],
    ),
    gridHorizontalColor: colorProp(
      "table.grid.gridHorizontalColor",
      "Horizontal grid color",
      "The colour of the lines separating rows.",
      ["grid", 0, "gridHorizontalColor"],
      "Increasing contrast makes rows easier to distinguish but creates a stronger grid.",
    ),
    gridHorizontalWeight: numberProp(
      "table.grid.gridHorizontalWeight",
      "Horizontal grid thickness",
      "How thick the lines separating rows appear.",
      ["grid", 0, "gridHorizontalWeight"],
      1,
      5,
    ),
    gridVertical: boolProp(
      "table.grid.gridVertical",
      "Vertical grid",
      "Whether a line is drawn between columns.",
      ["grid", 0, "gridVertical"],
    ),
    gridVerticalColor: colorProp(
      "table.grid.gridVerticalColor",
      "Vertical grid color",
      "The colour of the lines separating columns.",
      ["grid", 0, "gridVerticalColor"],
    ),
    gridVerticalWeight: numberProp(
      "table.grid.gridVerticalWeight",
      "Vertical grid thickness",
      "How thick the lines separating columns appear.",
      ["grid", 0, "gridVerticalWeight"],
      1,
      5,
    ),
    rowPadding: numberProp(
      "table.grid.rowPadding",
      "Row padding",
      "The vertical space inside each row, above and below the text.",
      ["grid", 0, "rowPadding"],
      0,
      12,
    ),
    textSize: numberProp(
      "table.grid.textSize",
      "Text size",
      "A secondary text-size control Power BI applies alongside the header/value font sizes.",
      ["grid", 0, "textSize"],
      8,
      18,
    ),
    outlineColor: colorProp(
      "table.grid.outlineColor",
      "Outline color",
      "The colour of the border drawn around the whole table.",
      ["grid", 0, "outlineColor"],
    ),
    outlineWeight: numberProp(
      "table.grid.outlineWeight",
      "Outline weight",
      "The thickness, in pixels, of the table's outer border.",
      ["grid", 0, "outlineWeight"],
      0,
      8,
    ),
    outlineStyle: numberProp(
      "table.grid.outlineStyle",
      "Outline",
      "Power BI's internal numeric code for which sides of the table show an outer border.",
      ["grid", 0, "outlineStyle"],
      0,
      6,
      "Not individually documented in Microsoft's schema; experiment with values 0–6 to see the effect.",
    ),
    imageHeight: numberProp(
      "table.grid.imageHeight",
      "Image height",
      "The height, in pixels, of images shown inside table cells.",
      ["grid", 0, "imageHeight"],
      10,
      200,
    ),
    imageWidth: numberProp(
      "table.grid.imageWidth",
      "Image width",
      "The width, in pixels, of images shown inside table cells.",
      ["grid", 0, "imageWidth"],
      10,
      200,
    ),
  },

  columnFormatting: {
    alignment: enumProp(
      "table.columnFormatting.alignment",
      "Alignment",
      "How values line up within a formatted column.",
      ["columnFormatting", 0, "alignment"],
      ALIGNMENT_OPTIONS,
    ),
    backColor: colorProp(
      "table.columnFormatting.backColor",
      "Background color",
      "The fill colour applied to a specific column's cells.",
      ["columnFormatting", 0, "backColor"],
    ),
    fontColor: colorProp(
      "table.columnFormatting.fontColor",
      "Font color",
      "The text colour applied to a specific column's cells.",
      ["columnFormatting", 0, "fontColor"],
    ),
    labelDisplayUnits: enumProp(
      "table.columnFormatting.labelDisplayUnits",
      "Display units",
      "How large numbers are abbreviated in this column, e.g. 1,200,000 shown as \"1.2M\".",
      ["columnFormatting", 0, "labelDisplayUnits"],
      [
        { value: 1, label: "None" },
        { value: 1000, label: "Thousands" },
        { value: 1000000, label: "Millions" },
        { value: 1000000000, label: "Billions" },
        { value: 1000000000000, label: "Trillions" },
      ] as const,
    ),
    labelPrecision: numberProp(
      "table.columnFormatting.labelPrecision",
      "Value decimal places",
      "How many decimal places are shown for values in this column.",
      ["columnFormatting", 0, "labelPrecision"],
      0,
      10,
    ),
    styleHeader: boolProp(
      "table.columnFormatting.styleHeader",
      "Apply to header",
      "Whether this column's formatting also applies to its header cell.",
      ["columnFormatting", 0, "styleHeader"],
    ),
    styleValues: boolProp(
      "table.columnFormatting.styleValues",
      "Apply to values",
      "Whether this column's formatting applies to its data cells.",
      ["columnFormatting", 0, "styleValues"],
    ),
    styleTotal: boolProp(
      "table.columnFormatting.styleTotal",
      "Apply to total",
      "Whether this column's formatting also applies to its total cell.",
      ["columnFormatting", 0, "styleTotal"],
    ),
  },

  sparklines: {
    chartType: enumProp(
      "table.sparklines.chartType",
      "Chart type",
      "Whether a sparkline draws as a line or as columns.",
      ["sparklines", 0, "chartType"],
      [
        { value: "line", label: "Line" },
        { value: "column", label: "Column" },
      ] as const,
    ),
    dataColor: colorProp(
      "table.sparklines.dataColor",
      "Data color",
      "The colour of the sparkline itself.",
      ["sparklines", 0, "dataColor"],
    ),
    markerColor: colorProp(
      "table.sparklines.markerColor",
      "Marker color",
      "The colour of the point markers drawn on a sparkline.",
      ["sparklines", 0, "markerColor"],
    ),
    markerShape: enumProp(
      "table.sparklines.markerShape",
      "Marker type",
      "The shape used for sparkline point markers.",
      ["sparklines", 0, "markerShape"],
      [
        { value: "circle", label: "Circle" },
        { value: "square", label: "Square" },
        { value: "diamond", label: "Diamond" },
        { value: "triangle", label: "Triangle" },
        { value: "x", label: "X" },
        { value: "shortDash", label: "Short dash" },
        { value: "longDash", label: "Long dash" },
        { value: "plus", label: "Plus" },
      ] as const,
    ),
    markerSize: numberProp(
      "table.sparklines.markerSize",
      "Marker size",
      "The size, in pixels, of sparkline point markers.",
      ["sparklines", 0, "markerSize"],
      1,
      12,
    ),
    markers: numberProp(
      "table.sparklines.markers",
      "Show these markers",
      "Power BI's internal numeric code for which sparkline points get markers (e.g. first, last, high, low).",
      ["sparklines", 0, "markers"],
      0,
      15,
      "Not individually documented in Microsoft's schema as a simple on/off list; treat as advanced.",
    ),
    strokeWidth: numberProp(
      "table.sparklines.strokeWidth",
      "Width",
      "The thickness, in pixels, of the sparkline's line.",
      ["sparklines", 0, "strokeWidth"],
      1,
      6,
    ),
  },
} as const;

export type ResolvedTableStyle = {
  columnHeaders: {
    alignment: string | number;
    backColor: string;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    wordWrap: boolean;
    autoSizeColumnWidth: boolean;
    customColumnWidth: boolean;
    defaultColumnWidth: number;
    columnAdjustment: string | number;
    outlineColor: string;
    outlineWeight: number;
    outlineStyle: number;
  };
  values: {
    backColor: string;
    backColorPrimary: string;
    backColorSecondary: string;
    fontColor: string;
    fontColorPrimary: string;
    fontColorSecondary: string;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    wordWrap: boolean;
    urlIcon: boolean;
    webURL: string;
    outlineColor: string;
    outlineWeight: number;
    outlineStyle: number;
  };
  total: {
    totals: boolean;
    label: string;
    backColor: string;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    outlineColor: string;
    outlineWeight: number;
    outlineStyle: number;
  };
  grid: {
    gridHorizontal: boolean;
    gridHorizontalColor: string;
    gridHorizontalWeight: number;
    gridVertical: boolean;
    gridVerticalColor: string;
    gridVerticalWeight: number;
    rowPadding: number;
    textSize: number;
    outlineColor: string;
    outlineWeight: number;
    outlineStyle: number;
    imageHeight: number;
    imageWidth: number;
  };
  columnFormatting: {
    alignment: string | number;
    backColor: string;
    fontColor: string;
    labelDisplayUnits: string | number;
    labelPrecision: number;
    styleHeader: boolean;
    styleValues: boolean;
    styleTotal: boolean;
  };
  sparklines: {
    chartType: string | number;
    dataColor: string;
    markerColor: string;
    markerShape: string | number;
    markerSize: number;
    markers: number;
    strokeWidth: number;
  };
};

/**
 * Resolves every Table property to its theme override, falling back to
 * shared theme tokens where one naturally applies (colours, font family) or
 * to a plain Power BI-typical default otherwise. A theme with no
 * `visualStyles.tableEx` still previews sensibly — matching how Power BI's
 * simple theming recolours a table (accent header, light header text)
 * before any per-visual override exists.
 */
export function resolveTableStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedTableStyle {
  const p = TABLE_PROPERTIES;
  return {
    columnHeaders: {
      alignment: resolvePropertyValue(theme, p.columnHeaders.alignment, "Auto"),
      backColor: resolvePropertyValue(theme, p.columnHeaders.backColor, base.tableAccent),
      fontColor: resolvePropertyValue(theme, p.columnHeaders.fontColor, base.background),
      fontFamily: resolvePropertyValue(theme, p.columnHeaders.fontFamily, base.fontFamily),
      fontSize: resolvePropertyValue(theme, p.columnHeaders.fontSize, 12),
      bold: resolvePropertyValue(theme, p.columnHeaders.bold, true),
      italic: resolvePropertyValue(theme, p.columnHeaders.italic, false),
      underline: resolvePropertyValue(theme, p.columnHeaders.underline, false),
      wordWrap: resolvePropertyValue(theme, p.columnHeaders.wordWrap, true),
      autoSizeColumnWidth: resolvePropertyValue(theme, p.columnHeaders.autoSizeColumnWidth, true),
      customColumnWidth: resolvePropertyValue(theme, p.columnHeaders.customColumnWidth, false),
      defaultColumnWidth: resolvePropertyValue(theme, p.columnHeaders.defaultColumnWidth, 100),
      columnAdjustment: resolvePropertyValue(theme, p.columnHeaders.columnAdjustment, "fitToContent"),
      outlineColor: resolvePropertyValue(theme, p.columnHeaders.outlineColor, "#E3E3E3"),
      outlineWeight: resolvePropertyValue(theme, p.columnHeaders.outlineWeight, 1),
      outlineStyle: resolvePropertyValue(theme, p.columnHeaders.outlineStyle, 0),
    },
    values: {
      backColor: resolvePropertyValue(theme, p.values.backColor, base.background),
      backColorPrimary: resolvePropertyValue(theme, p.values.backColorPrimary, base.background),
      backColorSecondary: resolvePropertyValue(theme, p.values.backColorSecondary, base.background),
      fontColor: resolvePropertyValue(theme, p.values.fontColor, base.foreground),
      fontColorPrimary: resolvePropertyValue(theme, p.values.fontColorPrimary, base.foreground),
      fontColorSecondary: resolvePropertyValue(theme, p.values.fontColorSecondary, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.values.fontFamily, base.fontFamily),
      fontSize: resolvePropertyValue(theme, p.values.fontSize, 12),
      bold: resolvePropertyValue(theme, p.values.bold, false),
      italic: resolvePropertyValue(theme, p.values.italic, false),
      underline: resolvePropertyValue(theme, p.values.underline, false),
      wordWrap: resolvePropertyValue(theme, p.values.wordWrap, false),
      urlIcon: resolvePropertyValue(theme, p.values.urlIcon, false),
      webURL: resolvePropertyValue(theme, p.values.webURL, ""),
      outlineColor: resolvePropertyValue(theme, p.values.outlineColor, "#E3E3E3"),
      outlineWeight: resolvePropertyValue(theme, p.values.outlineWeight, 1),
      outlineStyle: resolvePropertyValue(theme, p.values.outlineStyle, 0),
    },
    total: {
      totals: resolvePropertyValue(theme, p.total.totals, true),
      label: resolvePropertyValue(theme, p.total.label, "Total"),
      backColor: resolvePropertyValue(theme, p.total.backColor, base.background),
      fontColor: resolvePropertyValue(theme, p.total.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.total.fontFamily, base.fontFamily),
      fontSize: resolvePropertyValue(theme, p.total.fontSize, 12),
      bold: resolvePropertyValue(theme, p.total.bold, true),
      italic: resolvePropertyValue(theme, p.total.italic, false),
      underline: resolvePropertyValue(theme, p.total.underline, false),
      outlineColor: resolvePropertyValue(theme, p.total.outlineColor, "#E3E3E3"),
      outlineWeight: resolvePropertyValue(theme, p.total.outlineWeight, 1),
      outlineStyle: resolvePropertyValue(theme, p.total.outlineStyle, 0),
    },
    grid: {
      gridHorizontal: resolvePropertyValue(theme, p.grid.gridHorizontal, true),
      gridHorizontalColor: resolvePropertyValue(theme, p.grid.gridHorizontalColor, "#E3E3E3"),
      gridHorizontalWeight: resolvePropertyValue(theme, p.grid.gridHorizontalWeight, 1),
      gridVertical: resolvePropertyValue(theme, p.grid.gridVertical, false),
      gridVerticalColor: resolvePropertyValue(theme, p.grid.gridVerticalColor, "#E3E3E3"),
      gridVerticalWeight: resolvePropertyValue(theme, p.grid.gridVerticalWeight, 1),
      rowPadding: resolvePropertyValue(theme, p.grid.rowPadding, 3),
      textSize: resolvePropertyValue(theme, p.grid.textSize, 12),
      outlineColor: resolvePropertyValue(theme, p.grid.outlineColor, "#E3E3E3"),
      outlineWeight: resolvePropertyValue(theme, p.grid.outlineWeight, 1),
      outlineStyle: resolvePropertyValue(theme, p.grid.outlineStyle, 0),
      imageHeight: resolvePropertyValue(theme, p.grid.imageHeight, 20),
      imageWidth: resolvePropertyValue(theme, p.grid.imageWidth, 20),
    },
    columnFormatting: {
      alignment: resolvePropertyValue(theme, p.columnFormatting.alignment, "Auto"),
      backColor: resolvePropertyValue(theme, p.columnFormatting.backColor, base.background),
      fontColor: resolvePropertyValue(theme, p.columnFormatting.fontColor, base.foreground),
      labelDisplayUnits: resolvePropertyValue(theme, p.columnFormatting.labelDisplayUnits, 1),
      labelPrecision: resolvePropertyValue(theme, p.columnFormatting.labelPrecision, 0),
      styleHeader: resolvePropertyValue(theme, p.columnFormatting.styleHeader, false),
      styleValues: resolvePropertyValue(theme, p.columnFormatting.styleValues, false),
      styleTotal: resolvePropertyValue(theme, p.columnFormatting.styleTotal, false),
    },
    sparklines: {
      chartType: resolvePropertyValue(theme, p.sparklines.chartType, "line"),
      dataColor: resolvePropertyValue(theme, p.sparklines.dataColor, base.palette[0] ?? base.foreground),
      markerColor: resolvePropertyValue(theme, p.sparklines.markerColor, base.palette[0] ?? base.foreground),
      markerShape: resolvePropertyValue(theme, p.sparklines.markerShape, "circle"),
      markerSize: resolvePropertyValue(theme, p.sparklines.markerSize, 4),
      markers: resolvePropertyValue(theme, p.sparklines.markers, 0),
      strokeWidth: resolvePropertyValue(theme, p.sparklines.strokeWidth, 1),
    },
  };
}

export { propertyThemePath };
