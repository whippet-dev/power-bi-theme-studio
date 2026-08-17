import {
  boolProp,
  colorProp,
  enumProp,
  numberProp,
  propertyThemePath,
  resolvePropertyValue,
  textProp,
} from "./properties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * Matrix ("pivotTable") property registry, pinned to Microsoft's published
 * schema reportThemeSchema-2.156.json (microsoft/powerbi-desktop-samples).
 * Matrix's schema is Table's close relative — columnHeaders/values/grid/
 * columnFormatting/sparklines all appear in both with near-identical
 * fields — extended with the row/column grouping structure a flat table
 * doesn't have: separate rowHeaders, three distinct grand-total groups
 * (the generic `total`, plus axis-specific `columnTotal`/`rowTotal`),
 * per-level subtotal controls, and blank-row styling.
 *
 * Excluded fields:
 * - `annotationTemplate` (whole group), `values.icon`,
 *   `columnFormatting.dataBars` — complex nested objects, same rationale
 *   as every other visual's equivalent exclusions.
 * - `columnWidth` (whole group) — per-column, not a single visual-wide
 *   default, same rationale as Table's identical exclusion.
 * - `subTotals.$id` — an instance discriminator ("Row"/"Column"/custom)
 *   selecting which of the schema's multiple `subTotals` array entries a
 *   block configures, not a stylable value itself. This app's model edits
 *   a single default style per group (index 0), same as every other
 *   registry — so it can't represent "different style for row subtotals
 *   vs column subtotals" even though the raw schema technically allows it.
 *   Real themes observed in the wild (see themes/local) only ever set one
 *   unkeyed subTotals entry, matching this model.
 *
 * Shared "visual chrome" groups common to every visual (title, background,
 * border, ...) are out of scope here, matching every other visual's
 * registry — this covers only what's specific to the Matrix visual.
 */

export const MATRIX_PROPERTIES = {

  columnHeaders: {
    alignment: enumProp("pivotTable", "matrix.columnHeaders.alignment", "Alignment", "Sets the alignment.", ["columnHeaders", 0, "alignment"], [{"value":"Auto","label":"Auto"},{"value":"Left","label":"Left"},{"value":"Center","label":"Center"},{"value":"Right","label":"Right"}] as const, undefined),
    autoExpand: boolProp("pivotTable", "matrix.columnHeaders.autoExpand", "Auto expand", "While editing, automatically expands the matrix to show a new level when you add a field to Columns", ["columnHeaders", 0, "autoExpand"], undefined),
    backColor: colorProp("pivotTable", "matrix.columnHeaders.backColor", "Background color", "Background color of the cells", ["columnHeaders", 0, "backColor"], undefined),
    bold: boolProp("pivotTable", "matrix.columnHeaders.bold", "Bold", "Whether the column headers's text is bold.", ["columnHeaders", 0, "bold"], undefined),
    fontColor: colorProp("pivotTable", "matrix.columnHeaders.fontColor", "Font color", "Font color of the cells", ["columnHeaders", 0, "fontColor"], undefined),
    fontFamily: textProp("pivotTable", "matrix.columnHeaders.fontFamily", "Font family", "The typeface used for the column headers.", ["columnHeaders", 0, "fontFamily"], undefined),
    fontSize: numberProp("pivotTable", "matrix.columnHeaders.fontSize", "Text size", "Sets the column headers's text size.", ["columnHeaders", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pivotTable", "matrix.columnHeaders.italic", "Italic", "Whether the column headers's text is italic.", ["columnHeaders", 0, "italic"], undefined),
    showExpandCollapseButtons: boolProp("pivotTable", "matrix.columnHeaders.showExpandCollapseButtons", "+/- icons", "Whether the show expand collapse buttons is turned on.", ["columnHeaders", 0, "showExpandCollapseButtons"], undefined),
    titleAlignment: enumProp("pivotTable", "matrix.columnHeaders.titleAlignment", "Title alignment", "Sets the title alignment.", ["columnHeaders", 0, "titleAlignment"], [{"value":"Auto","label":"Auto"},{"value":"Left","label":"Left"},{"value":"Center","label":"Center"},{"value":"Right","label":"Right"}] as const, undefined),
    underline: boolProp("pivotTable", "matrix.columnHeaders.underline", "Underline", "Whether the column headers's text is underlined.", ["columnHeaders", 0, "underline"], undefined),
    urlIcon: boolProp("pivotTable", "matrix.columnHeaders.urlIcon", "URL icon", "Show an icon instead of the full URL", ["columnHeaders", 0, "urlIcon"], undefined),
    wordWrap: boolProp("pivotTable", "matrix.columnHeaders.wordWrap", "Word wrap", "Whether the word wrap is turned on.", ["columnHeaders", 0, "wordWrap"], undefined),
    autoSizeColumnWidth: boolProp("pivotTable", "matrix.columnHeaders.autoSizeColumnWidth", "Auto-size column width", "Whether the auto size column width is turned on.", ["columnHeaders", 0, "autoSizeColumnWidth"], undefined, "Width"),
    columnAdjustment: enumProp("pivotTable", "matrix.columnHeaders.columnAdjustment", "Auto-size behavior", "Sets the column adjustment's auto-size behavior.", ["columnHeaders", 0, "columnAdjustment"], [{"value":"fitToContent","label":"Fit to content"},{"value":"growToFit","label":"Grow to fit"},{"value":"fixedWidth","label":"Fixed width"}] as const, undefined, "Width"),
    customColumnWidth: boolProp("pivotTable", "matrix.columnHeaders.customColumnWidth", "Custom widths", "Customize individual column widths. Turning off clears all custom widths.", ["columnHeaders", 0, "customColumnWidth"], undefined, "Width"),
    customColumnWidthGranularView: boolProp("pivotTable", "matrix.columnHeaders.customColumnWidthGranularView", "More granular", "Whether the custom column width granular view is turned on.", ["columnHeaders", 0, "customColumnWidthGranularView"], undefined, "Width"),
    defaultColumnWidth: numberProp("pivotTable", "matrix.columnHeaders.defaultColumnWidth", "Default width", "Sets the default column width.", ["columnHeaders", 0, "defaultColumnWidth"], 0, 10, undefined, "Width"),
    expandCollapseButtonsColor: colorProp("pivotTable", "matrix.columnHeaders.expandCollapseButtonsColor", "Icon color", "The colour of the expand collapse buttons.", ["columnHeaders", 0, "expandCollapseButtonsColor"], undefined, "Expand/collapse"),
    expandCollapseButtonsSize: numberProp("pivotTable", "matrix.columnHeaders.expandCollapseButtonsSize", "Icon size", "Sets the expand collapse buttons's icon size.", ["columnHeaders", 0, "expandCollapseButtonsSize"], 8, 60, undefined, "Expand/collapse"),
    outlineColor: colorProp("pivotTable", "matrix.columnHeaders.outlineColor", "Outline color", "Color of the outline", ["columnHeaders", 0, "outlineColor"], undefined, "Outline"),
    outlineStyle: numberProp("pivotTable", "matrix.columnHeaders.outlineStyle", "Outline", "Which sides of the border are visible, encoded as a bitmask (0 = none, 15 = all sides).", ["columnHeaders", 0, "outlineStyle"], 0, 15, undefined, "Outline"),
    outlineWeight: numberProp("pivotTable", "matrix.columnHeaders.outlineWeight", "Outline weight", "Thickness of the outline in pixels", ["columnHeaders", 0, "outlineWeight"], 0, 10, undefined, "Outline"),
  },

  rowHeaders: {
    alignment: enumProp("pivotTable", "matrix.rowHeaders.alignment", "Alignment", "Sets the alignment.", ["rowHeaders", 0, "alignment"], [{"value":"Auto","label":"Auto"},{"value":"Left","label":"Left"},{"value":"Center","label":"Center"},{"value":"Right","label":"Right"}] as const, undefined),
    autoExpand: boolProp("pivotTable", "matrix.rowHeaders.autoExpand", "Auto expand", "While editing, automatically expands the matrix to show a new level when you add a field to Rows", ["rowHeaders", 0, "autoExpand"], undefined),
    backColor: colorProp("pivotTable", "matrix.rowHeaders.backColor", "Background color", "Background color of the cells", ["rowHeaders", 0, "backColor"], undefined),
    bold: boolProp("pivotTable", "matrix.rowHeaders.bold", "Bold", "Whether the row headers's text is bold.", ["rowHeaders", 0, "bold"], undefined),
    fontColor: colorProp("pivotTable", "matrix.rowHeaders.fontColor", "Font color", "Font color of the cells", ["rowHeaders", 0, "fontColor"], undefined),
    fontFamily: textProp("pivotTable", "matrix.rowHeaders.fontFamily", "Font family", "The typeface used for the row headers.", ["rowHeaders", 0, "fontFamily"], undefined),
    fontSize: numberProp("pivotTable", "matrix.rowHeaders.fontSize", "Text size", "Sets the row headers's text size.", ["rowHeaders", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pivotTable", "matrix.rowHeaders.italic", "Italic", "Whether the row headers's text is italic.", ["rowHeaders", 0, "italic"], undefined),
    legacyStyleDisabled: boolProp("pivotTable", "matrix.rowHeaders.legacyStyleDisabled", "Disable legacy style", "Whether the legacy style disabled is turned on.", ["rowHeaders", 0, "legacyStyleDisabled"], undefined),
    repeatRowHeaders: boolProp("pivotTable", "matrix.rowHeaders.repeatRowHeaders", "Repeat row headers", "Whether the repeat row headers is turned on.", ["rowHeaders", 0, "repeatRowHeaders"], undefined),
    showExpandCollapseButtons: boolProp("pivotTable", "matrix.rowHeaders.showExpandCollapseButtons", "+/- icons", "Whether the show expand collapse buttons is turned on.", ["rowHeaders", 0, "showExpandCollapseButtons"], undefined),
    underline: boolProp("pivotTable", "matrix.rowHeaders.underline", "Underline", "Whether the row headers's text is underlined.", ["rowHeaders", 0, "underline"], undefined),
    unfrozen: boolProp("pivotTable", "matrix.rowHeaders.unfrozen", "Unfrozen", "Whether the unfrozen is turned on.", ["rowHeaders", 0, "unfrozen"], undefined),
    urlIcon: boolProp("pivotTable", "matrix.rowHeaders.urlIcon", "URL icon", "Show an icon instead of the full URL", ["rowHeaders", 0, "urlIcon"], undefined),
    wordWrap: boolProp("pivotTable", "matrix.rowHeaders.wordWrap", "Word wrap", "Whether the word wrap is turned on.", ["rowHeaders", 0, "wordWrap"], undefined),
    expandCollapseButtonsColor: colorProp("pivotTable", "matrix.rowHeaders.expandCollapseButtonsColor", "Icon color", "The colour of the expand collapse buttons.", ["rowHeaders", 0, "expandCollapseButtonsColor"], undefined, "Expand/collapse"),
    expandCollapseButtonsSize: numberProp("pivotTable", "matrix.rowHeaders.expandCollapseButtonsSize", "Icon size", "Sets the expand collapse buttons's icon size.", ["rowHeaders", 0, "expandCollapseButtonsSize"], 8, 60, undefined, "Expand/collapse"),
    expandCompositeHierarchy: boolProp("pivotTable", "matrix.rowHeaders.expandCompositeHierarchy", "Expand composite hierarchy", "Whether the expand composite hierarchy is turned on.", ["rowHeaders", 0, "expandCompositeHierarchy"], undefined, "Expand/collapse"),
    outlineColor: colorProp("pivotTable", "matrix.rowHeaders.outlineColor", "Outline color", "Color of the outline", ["rowHeaders", 0, "outlineColor"], undefined, "Outline"),
    outlineStyle: numberProp("pivotTable", "matrix.rowHeaders.outlineStyle", "Outline", "Which sides of the border are visible, encoded as a bitmask (0 = none, 15 = all sides).", ["rowHeaders", 0, "outlineStyle"], 0, 15, undefined, "Outline"),
    outlineWeight: numberProp("pivotTable", "matrix.rowHeaders.outlineWeight", "Outline weight", "Thickness of the outline in pixels", ["rowHeaders", 0, "outlineWeight"], 0, 10, undefined, "Outline"),
    stepped: boolProp("pivotTable", "matrix.rowHeaders.stepped", "Stepped layout", "Render row headers with stepped layout", ["rowHeaders", 0, "stepped"], undefined, "Stepped layout"),
    steppedLayoutIndentation: numberProp("pivotTable", "matrix.rowHeaders.steppedLayoutIndentation", "Indentation", "Set the indentation, in pixels, applied to row headers", ["rowHeaders", 0, "steppedLayoutIndentation"], 0, 50, undefined, "Stepped layout"),
  },

  values: {
    backColor: colorProp("pivotTable", "matrix.values.backColor", "Background color", "Format cells with color based on a value.", ["values", 0, "backColor"], undefined),
    backColorPrimary: colorProp("pivotTable", "matrix.values.backColorPrimary", "Primary background color", "Background color of the odd rows", ["values", 0, "backColorPrimary"], undefined),
    backColorSecondary: colorProp("pivotTable", "matrix.values.backColorSecondary", "Alternate background color", "Background color of the even rows", ["values", 0, "backColorSecondary"], undefined),
    bandedRowHeaders: boolProp("pivotTable", "matrix.values.bandedRowHeaders", "Banded row color", "Apply banded row style to the last level of the row group headers, using the colors of the values.", ["values", 0, "bandedRowHeaders"], undefined),
    bold: boolProp("pivotTable", "matrix.values.bold", "Bold", "Whether the values's text is bold.", ["values", 0, "bold"], undefined),
    fontColor: colorProp("pivotTable", "matrix.values.fontColor", "Font color", "Format the font color based on a value.", ["values", 0, "fontColor"], undefined),
    fontColorPrimary: colorProp("pivotTable", "matrix.values.fontColorPrimary", "Primary font color", "Font color of the odd rows", ["values", 0, "fontColorPrimary"], undefined),
    fontColorSecondary: colorProp("pivotTable", "matrix.values.fontColorSecondary", "Alternate font color", "Font color of the even rows", ["values", 0, "fontColorSecondary"], undefined),
    fontFamily: textProp("pivotTable", "matrix.values.fontFamily", "Font family", "The typeface used for the values.", ["values", 0, "fontFamily"], undefined),
    fontSize: numberProp("pivotTable", "matrix.values.fontSize", "Text size", "Sets the values's text size.", ["values", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pivotTable", "matrix.values.italic", "Italic", "Whether the values's text is italic.", ["values", 0, "italic"], undefined),
    underline: boolProp("pivotTable", "matrix.values.underline", "Underline", "Whether the values's text is underlined.", ["values", 0, "underline"], undefined),
    urlIcon: boolProp("pivotTable", "matrix.values.urlIcon", "URL icon", "Show an icon instead of the full URL", ["values", 0, "urlIcon"], undefined),
    valuesOnRow: boolProp("pivotTable", "matrix.values.valuesOnRow", "Show on rows", "Show values in row groups rather than columns", ["values", 0, "valuesOnRow"], undefined),
    webURL: textProp("pivotTable", "matrix.values.webURL", "Web URL", "The custom text used for the web url.", ["values", 0, "webURL"], undefined),
    wordWrap: boolProp("pivotTable", "matrix.values.wordWrap", "Word wrap", "Whether the word wrap is turned on.", ["values", 0, "wordWrap"], undefined),
    outlineColor: colorProp("pivotTable", "matrix.values.outlineColor", "Outline color", "Color of the outline", ["values", 0, "outlineColor"], undefined, "Outline"),
    outlineStyle: numberProp("pivotTable", "matrix.values.outlineStyle", "Outline", "Which sides of the border are visible, encoded as a bitmask (0 = none, 15 = all sides).", ["values", 0, "outlineStyle"], 0, 15, undefined, "Outline"),
    outlineWeight: numberProp("pivotTable", "matrix.values.outlineWeight", "Outline weight", "Thickness of the outline in pixels", ["values", 0, "outlineWeight"], 0, 10, undefined, "Outline"),
  },

  columnTotal: {
    applyToHeaders: boolProp("pivotTable", "matrix.columnTotal.applyToHeaders", "Apply to labels", "Whether the apply to headers is turned on.", ["columnTotal", 0, "applyToHeaders"], undefined),
    backColor: colorProp("pivotTable", "matrix.columnTotal.backColor", "Background color", "Background color of the cells", ["columnTotal", 0, "backColor"], undefined),
    bold: boolProp("pivotTable", "matrix.columnTotal.bold", "Bold", "Whether the column grand total's text is bold.", ["columnTotal", 0, "bold"], undefined),
    fontColor: colorProp("pivotTable", "matrix.columnTotal.fontColor", "Font color", "Font color of the cells", ["columnTotal", 0, "fontColor"], undefined),
    fontFamily: textProp("pivotTable", "matrix.columnTotal.fontFamily", "Font family", "The typeface used for the column grand total.", ["columnTotal", 0, "fontFamily"], undefined),
    fontSize: numberProp("pivotTable", "matrix.columnTotal.fontSize", "Text size", "Sets the column grand total's text size.", ["columnTotal", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pivotTable", "matrix.columnTotal.italic", "Italic", "Whether the column grand total's text is italic.", ["columnTotal", 0, "italic"], undefined),
    underline: boolProp("pivotTable", "matrix.columnTotal.underline", "Underline", "Whether the column grand total's text is underlined.", ["columnTotal", 0, "underline"], undefined),
  },

  rowTotal: {
    applyToHeaders: boolProp("pivotTable", "matrix.rowTotal.applyToHeaders", "Apply to labels", "Whether the apply to headers is turned on.", ["rowTotal", 0, "applyToHeaders"], undefined),
    backColor: colorProp("pivotTable", "matrix.rowTotal.backColor", "Background color", "Background color of the cells", ["rowTotal", 0, "backColor"], undefined),
    bold: boolProp("pivotTable", "matrix.rowTotal.bold", "Bold", "Whether the row grand total's text is bold.", ["rowTotal", 0, "bold"], undefined),
    fontColor: colorProp("pivotTable", "matrix.rowTotal.fontColor", "Font color", "Font color of the cells", ["rowTotal", 0, "fontColor"], undefined),
    fontFamily: textProp("pivotTable", "matrix.rowTotal.fontFamily", "Font family", "The typeface used for the row grand total.", ["rowTotal", 0, "fontFamily"], undefined),
    fontSize: numberProp("pivotTable", "matrix.rowTotal.fontSize", "Text size", "Sets the row grand total's text size.", ["rowTotal", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pivotTable", "matrix.rowTotal.italic", "Italic", "Whether the row grand total's text is italic.", ["rowTotal", 0, "italic"], undefined),
    underline: boolProp("pivotTable", "matrix.rowTotal.underline", "Underline", "Whether the row grand total's text is underlined.", ["rowTotal", 0, "underline"], undefined),
  },

  total: {
    applyToHeaders: boolProp("pivotTable", "matrix.total.applyToHeaders", "Apply to labels", "Whether the apply to headers is turned on.", ["total", 0, "applyToHeaders"], undefined),
    backColor: colorProp("pivotTable", "matrix.total.backColor", "Background color", "Background color of the cells", ["total", 0, "backColor"], undefined),
    bold: boolProp("pivotTable", "matrix.total.bold", "Bold", "Whether the grand total's text is bold.", ["total", 0, "bold"], undefined),
    fontColor: colorProp("pivotTable", "matrix.total.fontColor", "Font color", "Font color of the cells", ["total", 0, "fontColor"], undefined),
    fontFamily: textProp("pivotTable", "matrix.total.fontFamily", "Font family", "The typeface used for the grand total.", ["total", 0, "fontFamily"], undefined),
    fontSize: numberProp("pivotTable", "matrix.total.fontSize", "Text size", "Sets the grand total's text size.", ["total", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pivotTable", "matrix.total.italic", "Italic", "Whether the grand total's text is italic.", ["total", 0, "italic"], undefined),
    underline: boolProp("pivotTable", "matrix.total.underline", "Underline", "Whether the grand total's text is underlined.", ["total", 0, "underline"], undefined),
  },

  subTotals: {
    applyToHeaders: boolProp("pivotTable", "matrix.subTotals.applyToHeaders", "Apply to labels", "Whether the apply to headers is turned on.", ["subTotals", 0, "applyToHeaders"], undefined),
    backColor: colorProp("pivotTable", "matrix.subTotals.backColor", "Background color", "Background color of the cells", ["subTotals", 0, "backColor"], undefined),
    bold: boolProp("pivotTable", "matrix.subTotals.bold", "Bold", "Whether the subtotals's text is bold.", ["subTotals", 0, "bold"], undefined),
    fontColor: colorProp("pivotTable", "matrix.subTotals.fontColor", "Font color", "Font color of the cells", ["subTotals", 0, "fontColor"], undefined),
    fontFamily: textProp("pivotTable", "matrix.subTotals.fontFamily", "Font family", "The typeface used for the subtotals.", ["subTotals", 0, "fontFamily"], undefined),
    fontSize: numberProp("pivotTable", "matrix.subTotals.fontSize", "Text size", "Sets the subtotals's text size.", ["subTotals", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pivotTable", "matrix.subTotals.italic", "Italic", "Whether the subtotals's text is italic.", ["subTotals", 0, "italic"], undefined),
    levelSubtotalEnabled: boolProp("pivotTable", "matrix.subTotals.levelSubtotalEnabled", "Level subtotal enabled", "Whether the level subtotal enabled is turned on.", ["subTotals", 0, "levelSubtotalEnabled"], undefined),
    levelSubtotalLabel: textProp("pivotTable", "matrix.subTotals.levelSubtotalLabel", "Level subtotal label", "The custom text used for the level subtotal.", ["subTotals", 0, "levelSubtotalLabel"], undefined),
    underline: boolProp("pivotTable", "matrix.subTotals.underline", "Underline", "Whether the subtotals's text is underlined.", ["subTotals", 0, "underline"], undefined),
    columnSubtotals: boolProp("pivotTable", "matrix.subTotals.columnSubtotals", "Column subtotals", "Show subtotals for all column groups", ["subTotals", 0, "columnSubtotals"], undefined, "Column subtotals"),
    columnSubtotalsLabel: textProp("pivotTable", "matrix.subTotals.columnSubtotalsLabel", "Column subtotals label", "The custom text used for the column subtotals.", ["subTotals", 0, "columnSubtotalsLabel"], undefined, "Column subtotals"),
    perColumnLevel: boolProp("pivotTable", "matrix.subTotals.perColumnLevel", "Per column level", "Whether the per column level is turned on.", ["subTotals", 0, "perColumnLevel"], undefined, "Column subtotals"),
    perRowLevel: boolProp("pivotTable", "matrix.subTotals.perRowLevel", "Per row level", "Whether the per row level is turned on.", ["subTotals", 0, "perRowLevel"], undefined, "Row subtotals"),
    rowSubtotals: boolProp("pivotTable", "matrix.subTotals.rowSubtotals", "Row subtotals", "Show subtotals for all row groups", ["subTotals", 0, "rowSubtotals"], undefined, "Row subtotals"),
    rowSubtotalsLabel: textProp("pivotTable", "matrix.subTotals.rowSubtotalsLabel", "Row subtotals label", "The custom text used for the row subtotals.", ["subTotals", 0, "rowSubtotalsLabel"], undefined, "Row subtotals"),
    rowSubtotalsPosition: enumProp("pivotTable", "matrix.subTotals.rowSubtotalsPosition", "Row subtotal position", "Sets the row subtotals position.", ["subTotals", 0, "rowSubtotalsPosition"], [{"value":"Top","label":"Top"},{"value":"Bottom","label":"Bottom"}] as const, undefined, "Row subtotals"),
  },

  blankRows: {
    showBlankRows: boolProp("pivotTable", "matrix.blankRows.showBlankRows", "Show", "Whether the show blank rows is turned on.", ["blankRows", 0, "showBlankRows"], undefined),
    blankRowColor: colorProp("pivotTable", "matrix.blankRows.blankRowColor", "Row color", "The colour of the blank row.", ["blankRows", 0, "blankRowColor"], undefined),
    blankRowTransparency: numberProp("pivotTable", "matrix.blankRows.blankRowTransparency", "Transparency", "How see-through the blank row appears — 0 is solid, 100 is invisible.", ["blankRows", 0, "blankRowTransparency"], 0, 100, undefined),
    borderColor: colorProp("pivotTable", "matrix.blankRows.borderColor", "Color", "The colour of the border.", ["blankRows", 0, "borderColor"], undefined, "Border"),
    borderPosition: enumProp("pivotTable", "matrix.blankRows.borderPosition", "Position", "Sets the border position.", ["blankRows", 0, "borderPosition"], [{"value":"Top","label":"Top"},{"value":"Bottom","label":"Bottom"},{"value":"TopAndBottom","label":"Top and bottom"}] as const, undefined, "Border"),
    borderTransparency: numberProp("pivotTable", "matrix.blankRows.borderTransparency", "Transparency", "How see-through the border appears — 0 is solid, 100 is invisible.", ["blankRows", 0, "borderTransparency"], 0, 100, undefined, "Border"),
    borderWidth: numberProp("pivotTable", "matrix.blankRows.borderWidth", "Width", "The thickness, in pixels, of the border width.", ["blankRows", 0, "borderWidth"], 0, 10, undefined, "Border"),
    showBorder: boolProp("pivotTable", "matrix.blankRows.showBorder", "Show", "Whether the show border is turned on.", ["blankRows", 0, "showBorder"], undefined, "Border"),
  },

  grid: {
    imageHeight: numberProp("pivotTable", "matrix.grid.imageHeight", "Height", "The height of images in pixels", ["grid", 0, "imageHeight"], -1000, 1000, undefined),
    imageWidth: numberProp("pivotTable", "matrix.grid.imageWidth", "Width", "The width of images in pixels", ["grid", 0, "imageWidth"], 0, 10, undefined),
    rowPadding: numberProp("pivotTable", "matrix.grid.rowPadding", "Row padding", "Padding in pixels applied to top and bottom of every row", ["grid", 0, "rowPadding"], 0, 50, undefined),
    textSize: numberProp("pivotTable", "matrix.grid.textSize", "Text size", "Sets the text's text size.", ["grid", 0, "textSize"], 1, 60, undefined),
    gridHorizontal: boolProp("pivotTable", "matrix.grid.gridHorizontal", "Horizontal grid", "Show/Hide the horizontal gridlines", ["grid", 0, "gridHorizontal"], undefined, "Horizontal gridline"),
    gridHorizontalColor: colorProp("pivotTable", "matrix.grid.gridHorizontalColor", "Horizontal grid color", "Color for the horizontal gridlines", ["grid", 0, "gridHorizontalColor"], undefined, "Horizontal gridline"),
    gridHorizontalWeight: numberProp("pivotTable", "matrix.grid.gridHorizontalWeight", "Horizontal grid thickness", "Thickness of the horizontal gridlines in pixels", ["grid", 0, "gridHorizontalWeight"], 0, 10, undefined, "Horizontal gridline"),
    gridVertical: boolProp("pivotTable", "matrix.grid.gridVertical", "Vertical grid", "Show/Hide the vertical gridlines", ["grid", 0, "gridVertical"], undefined, "Vertical gridline"),
    gridVerticalColor: colorProp("pivotTable", "matrix.grid.gridVerticalColor", "Vertical grid color", "Color for the vertical gridlines", ["grid", 0, "gridVerticalColor"], undefined, "Vertical gridline"),
    gridVerticalWeight: numberProp("pivotTable", "matrix.grid.gridVerticalWeight", "Vertical grid thickness", "Thickness of the vertical gridlines in pixels", ["grid", 0, "gridVerticalWeight"], 0, 10, undefined, "Vertical gridline"),
    outlineColor: colorProp("pivotTable", "matrix.grid.outlineColor", "Outline color", "Color of the outline", ["grid", 0, "outlineColor"], undefined, "Outline"),
    outlineStyle: numberProp("pivotTable", "matrix.grid.outlineStyle", "Outline", "Which sides of the border are visible, encoded as a bitmask (0 = none, 15 = all sides).", ["grid", 0, "outlineStyle"], 0, 15, undefined, "Outline"),
    outlineWeight: numberProp("pivotTable", "matrix.grid.outlineWeight", "Outline weight", "Thickness of the outline in pixels", ["grid", 0, "outlineWeight"], 0, 10, undefined, "Outline"),
  },

  columnFormatting: {
    alignment: enumProp("pivotTable", "matrix.columnFormatting.alignment", "Alignment", "Sets the alignment.", ["columnFormatting", 0, "alignment"], [{"value":"Auto","label":"Auto"},{"value":"Left","label":"Left"},{"value":"Center","label":"Center"},{"value":"Right","label":"Right"}] as const, undefined),
    backColor: colorProp("pivotTable", "matrix.columnFormatting.backColor", "Background color", "Background color of the cells", ["columnFormatting", 0, "backColor"], undefined),
    fontColor: colorProp("pivotTable", "matrix.columnFormatting.fontColor", "Font color", "Font color of the cells", ["columnFormatting", 0, "fontColor"], undefined),
    labelDisplayUnits: enumProp("pivotTable", "matrix.columnFormatting.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["columnFormatting", 0, "labelDisplayUnits"], [{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    labelPrecision: numberProp("pivotTable", "matrix.columnFormatting.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["columnFormatting", 0, "labelPrecision"], 0, 10, undefined),
    styleHeader: boolProp("pivotTable", "matrix.columnFormatting.styleHeader", "Apply to header", "Whether the style header is turned on.", ["columnFormatting", 0, "styleHeader"], undefined),
    styleSubtotals: boolProp("pivotTable", "matrix.columnFormatting.styleSubtotals", "Apply to subtotals", "Whether the style subtotals is turned on.", ["columnFormatting", 0, "styleSubtotals"], undefined),
    styleTotal: boolProp("pivotTable", "matrix.columnFormatting.styleTotal", "Apply to total", "Whether the style total is turned on.", ["columnFormatting", 0, "styleTotal"], undefined),
    styleValues: boolProp("pivotTable", "matrix.columnFormatting.styleValues", "Apply to values", "Whether the style values is turned on.", ["columnFormatting", 0, "styleValues"], undefined),
  },

  sparklines: {
    chartType: enumProp("pivotTable", "matrix.sparklines.chartType", "Chart type", "Sets the chart's chart type.", ["sparklines", 0, "chartType"], [{"value":"line","label":"Line"},{"value":"column","label":"Column"}] as const, undefined),
    dataColor: colorProp("pivotTable", "matrix.sparklines.dataColor", "Data color", "The colour of the data.", ["sparklines", 0, "dataColor"], undefined),
    markerColor: colorProp("pivotTable", "matrix.sparklines.markerColor", "Color", "The colour of the marker.", ["sparklines", 0, "markerColor"], undefined),
    markerShape: enumProp("pivotTable", "matrix.sparklines.markerShape", "Type", "Sets the marker shape's type.", ["sparklines", 0, "markerShape"], [{"value":"circle","label":"●"},{"value":"square","label":"■"},{"value":"diamond","label":"◆"},{"value":"triangle","label":"▲"},{"value":"x","label":"☓"},{"value":"shortDash","label":" -"},{"value":"longDash","label":"—"},{"value":"plus","label":"+"}] as const, undefined),
    markerSize: numberProp("pivotTable", "matrix.sparklines.markerSize", "Size", "Sets the marker's size.", ["sparklines", 0, "markerSize"], 1, 60, undefined),
    markers: numberProp("pivotTable", "matrix.sparklines.markers", "Show these markers", "Sets the markers.", ["sparklines", 0, "markers"], -1000, 1000, undefined),
    strokeWidth: numberProp("pivotTable", "matrix.sparklines.strokeWidth", "Width", "The thickness, in pixels, of the stroke width.", ["sparklines", 0, "strokeWidth"], 0, 10, undefined),
  },

  accessibility: {
    altTextColumns: textProp("pivotTable", "matrix.accessibility.altTextColumns", "Column with alt text", "The custom text used for the alt text columns.", ["accessibility", 0, "altTextColumns"], undefined),
  },

  general: {
    formatString: textProp("pivotTable", "matrix.general.formatString", "Format string", "The custom text used for the format string.", ["general", 0, "formatString"], undefined),
    layout: enumProp("pivotTable", "matrix.general.layout", "Layout", "Sets the layout.", ["general", 0, "layout"], [{"value":"Compact","label":"Compact"},{"value":"Outline","label":"Outline"},{"value":"Tabular","label":"Tabular"}] as const, undefined),
  },
} as const;

export type ResolvedMatrixStyle = {
  columnHeaders: {
    alignment: string | number;
    autoExpand: boolean;
    backColor: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    showExpandCollapseButtons: boolean;
    titleAlignment: string | number;
    underline: boolean;
    urlIcon: boolean;
    wordWrap: boolean;
    autoSizeColumnWidth: boolean;
    columnAdjustment: string | number;
    customColumnWidth: boolean;
    customColumnWidthGranularView: boolean;
    defaultColumnWidth: number;
    expandCollapseButtonsColor: string;
    expandCollapseButtonsSize: number;
    outlineColor: string;
    outlineStyle: number;
    outlineWeight: number;
  };
  rowHeaders: {
    alignment: string | number;
    autoExpand: boolean;
    backColor: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    legacyStyleDisabled: boolean;
    repeatRowHeaders: boolean;
    showExpandCollapseButtons: boolean;
    underline: boolean;
    unfrozen: boolean;
    urlIcon: boolean;
    wordWrap: boolean;
    expandCollapseButtonsColor: string;
    expandCollapseButtonsSize: number;
    expandCompositeHierarchy: boolean;
    outlineColor: string;
    outlineStyle: number;
    outlineWeight: number;
    stepped: boolean;
    steppedLayoutIndentation: number;
  };
  values: {
    backColor: string;
    backColorPrimary: string;
    backColorSecondary: string;
    bandedRowHeaders: boolean;
    bold: boolean;
    fontColor: string;
    fontColorPrimary: string;
    fontColorSecondary: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    underline: boolean;
    urlIcon: boolean;
    valuesOnRow: boolean;
    webURL: string;
    wordWrap: boolean;
    outlineColor: string;
    outlineStyle: number;
    outlineWeight: number;
  };
  columnTotal: {
    applyToHeaders: boolean;
    backColor: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    underline: boolean;
  };
  rowTotal: {
    applyToHeaders: boolean;
    backColor: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    underline: boolean;
  };
  total: {
    applyToHeaders: boolean;
    backColor: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    underline: boolean;
  };
  subTotals: {
    applyToHeaders: boolean;
    backColor: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    levelSubtotalEnabled: boolean;
    levelSubtotalLabel: string;
    underline: boolean;
    columnSubtotals: boolean;
    columnSubtotalsLabel: string;
    perColumnLevel: boolean;
    perRowLevel: boolean;
    rowSubtotals: boolean;
    rowSubtotalsLabel: string;
    rowSubtotalsPosition: string | number;
  };
  blankRows: {
    showBlankRows: boolean;
    blankRowColor: string;
    blankRowTransparency: number;
    borderColor: string;
    borderPosition: string | number;
    borderTransparency: number;
    borderWidth: number;
    showBorder: boolean;
  };
  grid: {
    imageHeight: number;
    imageWidth: number;
    rowPadding: number;
    textSize: number;
    gridHorizontal: boolean;
    gridHorizontalColor: string;
    gridHorizontalWeight: number;
    gridVertical: boolean;
    gridVerticalColor: string;
    gridVerticalWeight: number;
    outlineColor: string;
    outlineStyle: number;
    outlineWeight: number;
  };
  columnFormatting: {
    alignment: string | number;
    backColor: string;
    fontColor: string;
    labelDisplayUnits: string | number;
    labelPrecision: number;
    styleHeader: boolean;
    styleSubtotals: boolean;
    styleTotal: boolean;
    styleValues: boolean;
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
  accessibility: {
    altTextColumns: string;
  };
  general: {
    formatString: string;
    layout: string | number;
  };
};

/**
 * Resolves every Matrix property to its theme override, falling back to
 * the shared theme tokens (palette/background/foreground) for
 * colour-like fields and a plain Power BI-typical default otherwise.
 */
export function resolveMatrixStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedMatrixStyle {
  const p = MATRIX_PROPERTIES;
  return {
    columnHeaders: {
      alignment: resolvePropertyValue(theme, p.columnHeaders.alignment, "Auto"),
      autoExpand: resolvePropertyValue(theme, p.columnHeaders.autoExpand, false),
      backColor: resolvePropertyValue(theme, p.columnHeaders.backColor, base.background),
      bold: resolvePropertyValue(theme, p.columnHeaders.bold, false),
      fontColor: resolvePropertyValue(theme, p.columnHeaders.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.columnHeaders.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.columnHeaders.fontSize, 6),
      italic: resolvePropertyValue(theme, p.columnHeaders.italic, false),
      showExpandCollapseButtons: resolvePropertyValue(theme, p.columnHeaders.showExpandCollapseButtons, false),
      titleAlignment: resolvePropertyValue(theme, p.columnHeaders.titleAlignment, "Auto"),
      underline: resolvePropertyValue(theme, p.columnHeaders.underline, false),
      urlIcon: resolvePropertyValue(theme, p.columnHeaders.urlIcon, false),
      wordWrap: resolvePropertyValue(theme, p.columnHeaders.wordWrap, false),
      autoSizeColumnWidth: resolvePropertyValue(theme, p.columnHeaders.autoSizeColumnWidth, false),
      columnAdjustment: resolvePropertyValue(theme, p.columnHeaders.columnAdjustment, "fitToContent"),
      customColumnWidth: resolvePropertyValue(theme, p.columnHeaders.customColumnWidth, false),
      customColumnWidthGranularView: resolvePropertyValue(theme, p.columnHeaders.customColumnWidthGranularView, false),
      defaultColumnWidth: resolvePropertyValue(theme, p.columnHeaders.defaultColumnWidth, 1),
      expandCollapseButtonsColor: resolvePropertyValue(theme, p.columnHeaders.expandCollapseButtonsColor, base.palette[0] ?? base.foreground),
      expandCollapseButtonsSize: resolvePropertyValue(theme, p.columnHeaders.expandCollapseButtonsSize, 6),
      outlineColor: resolvePropertyValue(theme, p.columnHeaders.outlineColor, "#E3E3E3"),
      outlineStyle: resolvePropertyValue(theme, p.columnHeaders.outlineStyle, 0),
      outlineWeight: resolvePropertyValue(theme, p.columnHeaders.outlineWeight, 1),
    },
    rowHeaders: {
      alignment: resolvePropertyValue(theme, p.rowHeaders.alignment, "Auto"),
      autoExpand: resolvePropertyValue(theme, p.rowHeaders.autoExpand, false),
      backColor: resolvePropertyValue(theme, p.rowHeaders.backColor, base.background),
      bold: resolvePropertyValue(theme, p.rowHeaders.bold, false),
      fontColor: resolvePropertyValue(theme, p.rowHeaders.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.rowHeaders.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.rowHeaders.fontSize, 6),
      italic: resolvePropertyValue(theme, p.rowHeaders.italic, false),
      legacyStyleDisabled: resolvePropertyValue(theme, p.rowHeaders.legacyStyleDisabled, false),
      repeatRowHeaders: resolvePropertyValue(theme, p.rowHeaders.repeatRowHeaders, false),
      showExpandCollapseButtons: resolvePropertyValue(theme, p.rowHeaders.showExpandCollapseButtons, false),
      underline: resolvePropertyValue(theme, p.rowHeaders.underline, false),
      unfrozen: resolvePropertyValue(theme, p.rowHeaders.unfrozen, false),
      urlIcon: resolvePropertyValue(theme, p.rowHeaders.urlIcon, false),
      wordWrap: resolvePropertyValue(theme, p.rowHeaders.wordWrap, false),
      expandCollapseButtonsColor: resolvePropertyValue(theme, p.rowHeaders.expandCollapseButtonsColor, base.palette[0] ?? base.foreground),
      expandCollapseButtonsSize: resolvePropertyValue(theme, p.rowHeaders.expandCollapseButtonsSize, 6),
      expandCompositeHierarchy: resolvePropertyValue(theme, p.rowHeaders.expandCompositeHierarchy, false),
      outlineColor: resolvePropertyValue(theme, p.rowHeaders.outlineColor, "#E3E3E3"),
      outlineStyle: resolvePropertyValue(theme, p.rowHeaders.outlineStyle, 0),
      outlineWeight: resolvePropertyValue(theme, p.rowHeaders.outlineWeight, 1),
      stepped: resolvePropertyValue(theme, p.rowHeaders.stepped, false),
      steppedLayoutIndentation: resolvePropertyValue(theme, p.rowHeaders.steppedLayoutIndentation, 10),
    },
    values: {
      backColor: resolvePropertyValue(theme, p.values.backColor, base.background),
      backColorPrimary: resolvePropertyValue(theme, p.values.backColorPrimary, base.background),
      backColorSecondary: resolvePropertyValue(theme, p.values.backColorSecondary, base.background),
      bandedRowHeaders: resolvePropertyValue(theme, p.values.bandedRowHeaders, false),
      bold: resolvePropertyValue(theme, p.values.bold, false),
      fontColor: resolvePropertyValue(theme, p.values.fontColor, base.foreground),
      fontColorPrimary: resolvePropertyValue(theme, p.values.fontColorPrimary, base.foreground),
      fontColorSecondary: resolvePropertyValue(theme, p.values.fontColorSecondary, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.values.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.values.fontSize, 6),
      italic: resolvePropertyValue(theme, p.values.italic, false),
      underline: resolvePropertyValue(theme, p.values.underline, false),
      urlIcon: resolvePropertyValue(theme, p.values.urlIcon, false),
      valuesOnRow: resolvePropertyValue(theme, p.values.valuesOnRow, false),
      webURL: resolvePropertyValue(theme, p.values.webURL, ""),
      wordWrap: resolvePropertyValue(theme, p.values.wordWrap, false),
      outlineColor: resolvePropertyValue(theme, p.values.outlineColor, "#E3E3E3"),
      outlineStyle: resolvePropertyValue(theme, p.values.outlineStyle, 0),
      outlineWeight: resolvePropertyValue(theme, p.values.outlineWeight, 1),
    },
    columnTotal: {
      applyToHeaders: resolvePropertyValue(theme, p.columnTotal.applyToHeaders, false),
      backColor: resolvePropertyValue(theme, p.columnTotal.backColor, base.background),
      bold: resolvePropertyValue(theme, p.columnTotal.bold, false),
      fontColor: resolvePropertyValue(theme, p.columnTotal.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.columnTotal.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.columnTotal.fontSize, 6),
      italic: resolvePropertyValue(theme, p.columnTotal.italic, false),
      underline: resolvePropertyValue(theme, p.columnTotal.underline, false),
    },
    rowTotal: {
      applyToHeaders: resolvePropertyValue(theme, p.rowTotal.applyToHeaders, false),
      backColor: resolvePropertyValue(theme, p.rowTotal.backColor, base.background),
      bold: resolvePropertyValue(theme, p.rowTotal.bold, false),
      fontColor: resolvePropertyValue(theme, p.rowTotal.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.rowTotal.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.rowTotal.fontSize, 6),
      italic: resolvePropertyValue(theme, p.rowTotal.italic, false),
      underline: resolvePropertyValue(theme, p.rowTotal.underline, false),
    },
    total: {
      applyToHeaders: resolvePropertyValue(theme, p.total.applyToHeaders, false),
      backColor: resolvePropertyValue(theme, p.total.backColor, base.background),
      bold: resolvePropertyValue(theme, p.total.bold, false),
      fontColor: resolvePropertyValue(theme, p.total.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.total.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.total.fontSize, 6),
      italic: resolvePropertyValue(theme, p.total.italic, false),
      underline: resolvePropertyValue(theme, p.total.underline, false),
    },
    subTotals: {
      applyToHeaders: resolvePropertyValue(theme, p.subTotals.applyToHeaders, false),
      backColor: resolvePropertyValue(theme, p.subTotals.backColor, base.background),
      bold: resolvePropertyValue(theme, p.subTotals.bold, false),
      fontColor: resolvePropertyValue(theme, p.subTotals.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.subTotals.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.subTotals.fontSize, 6),
      italic: resolvePropertyValue(theme, p.subTotals.italic, false),
      levelSubtotalEnabled: resolvePropertyValue(theme, p.subTotals.levelSubtotalEnabled, false),
      levelSubtotalLabel: resolvePropertyValue(theme, p.subTotals.levelSubtotalLabel, ""),
      underline: resolvePropertyValue(theme, p.subTotals.underline, false),
      columnSubtotals: resolvePropertyValue(theme, p.subTotals.columnSubtotals, false),
      columnSubtotalsLabel: resolvePropertyValue(theme, p.subTotals.columnSubtotalsLabel, ""),
      perColumnLevel: resolvePropertyValue(theme, p.subTotals.perColumnLevel, false),
      perRowLevel: resolvePropertyValue(theme, p.subTotals.perRowLevel, false),
      rowSubtotals: resolvePropertyValue(theme, p.subTotals.rowSubtotals, false),
      rowSubtotalsLabel: resolvePropertyValue(theme, p.subTotals.rowSubtotalsLabel, ""),
      rowSubtotalsPosition: resolvePropertyValue(theme, p.subTotals.rowSubtotalsPosition, "Top"),
    },
    blankRows: {
      showBlankRows: resolvePropertyValue(theme, p.blankRows.showBlankRows, false),
      blankRowColor: resolvePropertyValue(theme, p.blankRows.blankRowColor, base.palette[0] ?? base.foreground),
      blankRowTransparency: resolvePropertyValue(theme, p.blankRows.blankRowTransparency, 0),
      borderColor: resolvePropertyValue(theme, p.blankRows.borderColor, "#E3E3E3"),
      borderPosition: resolvePropertyValue(theme, p.blankRows.borderPosition, "Top"),
      borderTransparency: resolvePropertyValue(theme, p.blankRows.borderTransparency, 0),
      borderWidth: resolvePropertyValue(theme, p.blankRows.borderWidth, 1),
      showBorder: resolvePropertyValue(theme, p.blankRows.showBorder, false),
    },
    grid: {
      imageHeight: resolvePropertyValue(theme, p.grid.imageHeight, 0),
      imageWidth: resolvePropertyValue(theme, p.grid.imageWidth, 1),
      rowPadding: resolvePropertyValue(theme, p.grid.rowPadding, 10),
      textSize: resolvePropertyValue(theme, p.grid.textSize, 6),
      gridHorizontal: resolvePropertyValue(theme, p.grid.gridHorizontal, false),
      gridHorizontalColor: resolvePropertyValue(theme, p.grid.gridHorizontalColor, "#E3E3E3"),
      gridHorizontalWeight: resolvePropertyValue(theme, p.grid.gridHorizontalWeight, 1),
      gridVertical: resolvePropertyValue(theme, p.grid.gridVertical, false),
      gridVerticalColor: resolvePropertyValue(theme, p.grid.gridVerticalColor, "#E3E3E3"),
      gridVerticalWeight: resolvePropertyValue(theme, p.grid.gridVerticalWeight, 1),
      outlineColor: resolvePropertyValue(theme, p.grid.outlineColor, "#E3E3E3"),
      outlineStyle: resolvePropertyValue(theme, p.grid.outlineStyle, 0),
      outlineWeight: resolvePropertyValue(theme, p.grid.outlineWeight, 1),
    },
    columnFormatting: {
      alignment: resolvePropertyValue(theme, p.columnFormatting.alignment, "Auto"),
      backColor: resolvePropertyValue(theme, p.columnFormatting.backColor, base.background),
      fontColor: resolvePropertyValue(theme, p.columnFormatting.fontColor, base.foreground),
      labelDisplayUnits: resolvePropertyValue(theme, p.columnFormatting.labelDisplayUnits, 1),
      labelPrecision: resolvePropertyValue(theme, p.columnFormatting.labelPrecision, 0),
      styleHeader: resolvePropertyValue(theme, p.columnFormatting.styleHeader, false),
      styleSubtotals: resolvePropertyValue(theme, p.columnFormatting.styleSubtotals, false),
      styleTotal: resolvePropertyValue(theme, p.columnFormatting.styleTotal, false),
      styleValues: resolvePropertyValue(theme, p.columnFormatting.styleValues, false),
    },
    sparklines: {
      chartType: resolvePropertyValue(theme, p.sparklines.chartType, "line"),
      dataColor: resolvePropertyValue(theme, p.sparklines.dataColor, base.palette[0] ?? base.foreground),
      markerColor: resolvePropertyValue(theme, p.sparklines.markerColor, base.palette[0] ?? base.foreground),
      markerShape: resolvePropertyValue(theme, p.sparklines.markerShape, "circle"),
      markerSize: resolvePropertyValue(theme, p.sparklines.markerSize, 6),
      markers: resolvePropertyValue(theme, p.sparklines.markers, 0),
      strokeWidth: resolvePropertyValue(theme, p.sparklines.strokeWidth, 1),
    },
    accessibility: {
      altTextColumns: resolvePropertyValue(theme, p.accessibility.altTextColumns, ""),
    },
    general: {
      formatString: resolvePropertyValue(theme, p.general.formatString, ""),
      layout: resolvePropertyValue(theme, p.general.layout, "Compact"),
    },
  };
}

export { propertyThemePath };
