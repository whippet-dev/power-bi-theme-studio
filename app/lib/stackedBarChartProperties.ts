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
 * Stacked bar chart ("barChart" in the schema — Power BI's internal name
 * for the "Stacked bar chart" visual, distinct from "clusteredBarChart")
 * property registry, pinned to Microsoft's published schema
 * reportThemeSchema-2.156.json (microsoft/powerbi-desktop-samples).
 *
 * Shares most of Clustered bar chart's groups/fields (verified directly
 * against the schema, group-by-group), but is not a copy of that registry:
 * three groups only exist on the stacked variant —
 * - `ribbonBands`: styling for the connecting bands drawn between a
 *   category's stacked segments and the next category's.
 * - `totals`: the total label shown at the end of each stacked bar.
 * - `layout`: gap size, series order, and ribbon-gap controls — a genuine
 *   visual-specific group (not the generic visual-container kind), missed
 *   in Clustered bar/column chart's original builds and retrofitted there
 *   once found here.
 * — and Clustered bar chart's `referenceLine` ("Constant line") group does
 * not exist at all on this visual (confirmed against the schema; only the
 * axis-specific xAxisReferenceLine/y1AxisReferenceLine remain).
 *
 * Excluded: `dataPoint.fillRule`, `plotArea.image` (complex nested
 * objects), `labels.dynamicLabelDetail/Title/Value` (polymorphic type) —
 * same rationale as every other Cartesian chart's equivalent exclusions.
 * `annotationTemplate`/`filters`/`general` are generic/state groups, out
 * of scope here too. Shared "visual chrome" is out of scope, as always.
 */

export const STACKED_BAR_CHART_PROPERTIES = {

  dataPoint: {
    borderColor: colorProp("barChart", "sbar.dataPoint.borderColor", "Border color", "The colour of the border.", ["dataPoint", 0, "borderColor"], undefined, "Border"),
    borderColorMatchFill: boolProp("barChart", "sbar.dataPoint.borderColorMatchFill", "Match fill color", "Match the border color to the main shape color.", ["dataPoint", 0, "borderColorMatchFill"], undefined, "Border"),
    borderOutlineOnly: boolProp("barChart", "sbar.dataPoint.borderOutlineOnly", "Hide inner borders", "Whether the border outline only is turned on.", ["dataPoint", 0, "borderOutlineOnly"], undefined, "Border"),
    borderShow: boolProp("barChart", "sbar.dataPoint.borderShow", "Border", "Whether the border is shown.", ["dataPoint", 0, "borderShow"], undefined, "Border"),
    borderSize: numberProp("barChart", "sbar.dataPoint.borderSize", "Width", "The thickness, in pixels, of the border.", ["dataPoint", 0, "borderSize"], 0, 10, undefined, "Border"),
    borderTransparency: numberProp("barChart", "sbar.dataPoint.borderTransparency", "Transparency", "How see-through the border appears — 0 is solid, 100 is invisible.", ["dataPoint", 0, "borderTransparency"], 0, 100, undefined, "Border"),
    defaultColor: colorProp("barChart", "sbar.dataPoint.defaultColor", "Default color", "The main colour used for the bars.", ["dataPoint", 0, "defaultColor"], undefined, "Fill"),
    fill: colorProp("barChart", "sbar.dataPoint.fill", "Fill color", "The main colour used for the bars.", ["dataPoint", 0, "fill"], undefined, "Fill"),
    fillTransparency: numberProp("barChart", "sbar.dataPoint.fillTransparency", "Transparency", "How see-through the fill appears — 0 is solid, 100 is invisible.", ["dataPoint", 0, "fillTransparency"], 0, 100, undefined, "Fill"),
  },

  categoryAxis: {
    show: boolProp("barChart", "sbar.categoryAxis.show", "Show", "Whether the category axis is shown.", ["categoryAxis", 0, "show"], undefined),
    axisStyle: enumProp("barChart", "sbar.categoryAxis.axisStyle", "Style", "Sets the axis's style.", ["categoryAxis", 0, "axisStyle"], [{"value":"showTitleOnly","label":"Show title only"},{"value":"showUnitOnly","label":"Show unit only"},{"value":"showBoth","label":"Show both"}] as const, undefined),
    axisType: enumProp("barChart", "sbar.categoryAxis.axisType", "Type", "Sets the axis type.", ["categoryAxis", 0, "axisType"], [{"value":"Scalar","label":"Continuous"},{"value":"Categorical","label":"Categorical"}] as const, undefined),
    bold: boolProp("barChart", "sbar.categoryAxis.bold", "Bold", "Whether the category axis's text is bold.", ["categoryAxis", 0, "bold"], undefined),
    concatenateLabels: boolProp("barChart", "sbar.categoryAxis.concatenateLabels", "Concatenate labels", "Always concatenate levels of the hierarchy instead of drawing the hierarchy", ["categoryAxis", 0, "concatenateLabels"], undefined),
    end: textProp("barChart", "sbar.categoryAxis.end", "End", "Enter an ending value (optional)", ["categoryAxis", 0, "end"], undefined),
    fontFamily: textProp("barChart", "sbar.categoryAxis.fontFamily", "Font family", "The typeface used for the category axis.", ["categoryAxis", 0, "fontFamily"], undefined),
    fontSize: numberProp("barChart", "sbar.categoryAxis.fontSize", "Text size", "Sets the category axis's text size.", ["categoryAxis", 0, "fontSize"], 8, 60, undefined),
    innerPadding: numberProp("barChart", "sbar.categoryAxis.innerPadding", "Space between categories", "Space between categories (inner padding) as a percentage of the total category width/height.", ["categoryAxis", 0, "innerPadding"], 0, 50, undefined),
    invertAxis: boolProp("barChart", "sbar.categoryAxis.invertAxis", "Invert axis", "Whether the invert axis is turned on.", ["categoryAxis", 0, "invertAxis"], undefined),
    italic: boolProp("barChart", "sbar.categoryAxis.italic", "Italic", "Whether the category axis's text is italic.", ["categoryAxis", 0, "italic"], undefined),
    labelColor: colorProp("barChart", "sbar.categoryAxis.labelColor", "Label color", "The colour of the label.", ["categoryAxis", 0, "labelColor"], undefined),
    labelDisplayUnits: enumProp("barChart", "sbar.categoryAxis.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["categoryAxis", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    labelPrecision: numberProp("barChart", "sbar.categoryAxis.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["categoryAxis", 0, "labelPrecision"], 0, 10, undefined),
    logAxisScale: boolProp("barChart", "sbar.categoryAxis.logAxisScale", "Logarithmic scale", "Whether the log axis scale is turned on.", ["categoryAxis", 0, "logAxisScale"], undefined),
    maxMarginFactor: numberProp("barChart", "sbar.categoryAxis.maxMarginFactor", "Maximum size", "The maximum percent of the visual allowed for the axis", ["categoryAxis", 0, "maxMarginFactor"], 1, 60, undefined),
    preferredCategoryWidth: numberProp("barChart", "sbar.categoryAxis.preferredCategoryWidth", "Minimum category width", "Sets the preferred category width.", ["categoryAxis", 0, "preferredCategoryWidth"], -1000, 1000, undefined),
    roundRange: boolProp("barChart", "sbar.categoryAxis.roundRange", "Round range", "Round range limits to the nearest multiple.", ["categoryAxis", 0, "roundRange"], undefined),
    showAxisTitle: boolProp("barChart", "sbar.categoryAxis.showAxisTitle", "Title", "Title for the Y-axis", ["categoryAxis", 0, "showAxisTitle"], undefined),
    start: textProp("barChart", "sbar.categoryAxis.start", "Start", "Enter a starting value (optional)", ["categoryAxis", 0, "start"], undefined),
    switchAxisPosition: boolProp("barChart", "sbar.categoryAxis.switchAxisPosition", "Switch axis position", "Whether the switch axis position is turned on.", ["categoryAxis", 0, "switchAxisPosition"], undefined),
    underline: boolProp("barChart", "sbar.categoryAxis.underline", "Underline", "Whether the category axis's text is underlined.", ["categoryAxis", 0, "underline"], undefined),
    gridlineAutoScale: boolProp("barChart", "sbar.categoryAxis.gridlineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["categoryAxis", 0, "gridlineAutoScale"], undefined, "Gridline"),
    gridlineColor: colorProp("barChart", "sbar.categoryAxis.gridlineColor", "Color", "The colour of the gridline.", ["categoryAxis", 0, "gridlineColor"], undefined, "Gridline"),
    gridlineDashArray: textProp("barChart", "sbar.categoryAxis.gridlineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["categoryAxis", 0, "gridlineDashArray"], undefined, "Gridline"),
    gridlineDashCap: enumProp("barChart", "sbar.categoryAxis.gridlineDashCap", "Dash cap", "Sets the gridline dash cap.", ["categoryAxis", 0, "gridlineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Gridline"),
    gridlineShow: boolProp("barChart", "sbar.categoryAxis.gridlineShow", "Show", "Whether the gridline is shown.", ["categoryAxis", 0, "gridlineShow"], undefined, "Gridline"),
    gridlineStyle: enumProp("barChart", "sbar.categoryAxis.gridlineStyle", "Line style", "Sets the gridline's line style.", ["categoryAxis", 0, "gridlineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Gridline"),
    gridlineThickness: numberProp("barChart", "sbar.categoryAxis.gridlineThickness", "Width", "The thickness, in pixels, of the gridline.", ["categoryAxis", 0, "gridlineThickness"], 0, 10, undefined, "Gridline"),
    gridlineTransparency: numberProp("barChart", "sbar.categoryAxis.gridlineTransparency", "Transparency", "How see-through the gridline appears — 0 is solid, 100 is invisible.", ["categoryAxis", 0, "gridlineTransparency"], 0, 100, undefined, "Gridline"),
    titleBold: boolProp("barChart", "sbar.categoryAxis.titleBold", "Bold", "Whether the title is bold.", ["categoryAxis", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("barChart", "sbar.categoryAxis.titleColor", "Color", "The colour of the title.", ["categoryAxis", 0, "titleColor"], undefined, "Title"),
    titleFontFamily: textProp("barChart", "sbar.categoryAxis.titleFontFamily", "Font family", "The typeface used for the title.", ["categoryAxis", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("barChart", "sbar.categoryAxis.titleFontSize", "Title text size", "Sets the title's title text size.", ["categoryAxis", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleItalic: boolProp("barChart", "sbar.categoryAxis.titleItalic", "Italic", "Whether the title is italic.", ["categoryAxis", 0, "titleItalic"], undefined, "Title"),
    titleText: textProp("barChart", "sbar.categoryAxis.titleText", "Axis title", "The custom text used for the title.", ["categoryAxis", 0, "titleText"], undefined, "Title"),
    titleUnderline: boolProp("barChart", "sbar.categoryAxis.titleUnderline", "Underline", "Whether the title is underlined.", ["categoryAxis", 0, "titleUnderline"], undefined, "Title"),
  },

  valueAxis: {
    show: boolProp("barChart", "sbar.valueAxis.show", "Show", "Whether the value axis is shown.", ["valueAxis", 0, "show"], undefined),
    axisStyle: enumProp("barChart", "sbar.valueAxis.axisStyle", "Style", "Sets the axis's style.", ["valueAxis", 0, "axisStyle"], [{"value":"showTitleOnly","label":"Show title only"},{"value":"showUnitOnly","label":"Show unit only"},{"value":"showBoth","label":"Show both"}] as const, undefined),
    bold: boolProp("barChart", "sbar.valueAxis.bold", "Bold", "Whether the value axis's text is bold.", ["valueAxis", 0, "bold"], undefined),
    end: textProp("barChart", "sbar.valueAxis.end", "End", "Enter an ending value (optional)", ["valueAxis", 0, "end"], undefined),
    fontFamily: textProp("barChart", "sbar.valueAxis.fontFamily", "Font family", "The typeface used for the value axis.", ["valueAxis", 0, "fontFamily"], undefined),
    fontSize: numberProp("barChart", "sbar.valueAxis.fontSize", "Text size", "Sets the value axis's text size.", ["valueAxis", 0, "fontSize"], 8, 60, undefined),
    invertAxis: boolProp("barChart", "sbar.valueAxis.invertAxis", "Invert axis", "Whether the invert axis is turned on.", ["valueAxis", 0, "invertAxis"], undefined),
    italic: boolProp("barChart", "sbar.valueAxis.italic", "Italic", "Whether the value axis's text is italic.", ["valueAxis", 0, "italic"], undefined),
    labelColor: colorProp("barChart", "sbar.valueAxis.labelColor", "Label color", "The colour of the label.", ["valueAxis", 0, "labelColor"], undefined),
    labelDisplayUnits: enumProp("barChart", "sbar.valueAxis.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["valueAxis", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    labelPrecision: numberProp("barChart", "sbar.valueAxis.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["valueAxis", 0, "labelPrecision"], 0, 10, undefined),
    logAxisScale: boolProp("barChart", "sbar.valueAxis.logAxisScale", "Logarithmic scale", "Whether the log axis scale is turned on.", ["valueAxis", 0, "logAxisScale"], undefined),
    roundRange: boolProp("barChart", "sbar.valueAxis.roundRange", "Round range", "Round range limits to the nearest multiple.", ["valueAxis", 0, "roundRange"], undefined),
    scaleToFit: boolProp("barChart", "sbar.valueAxis.scaleToFit", "Scale to fit", "Whether the scale to fit is turned on.", ["valueAxis", 0, "scaleToFit"], undefined),
    sharedAxis: boolProp("barChart", "sbar.valueAxis.sharedAxis", "Shared y-axis", "Whether the shared axis is turned on.", ["valueAxis", 0, "sharedAxis"], undefined),
    showAxisTitle: boolProp("barChart", "sbar.valueAxis.showAxisTitle", "Title", "Title for the X-axis", ["valueAxis", 0, "showAxisTitle"], undefined),
    start: textProp("barChart", "sbar.valueAxis.start", "Start", "Enter a starting value (optional)", ["valueAxis", 0, "start"], undefined),
    switchAxisPosition: boolProp("barChart", "sbar.valueAxis.switchAxisPosition", "Switch axis position", "Whether the switch axis position is turned on.", ["valueAxis", 0, "switchAxisPosition"], undefined),
    underline: boolProp("barChart", "sbar.valueAxis.underline", "Underline", "Whether the value axis's text is underlined.", ["valueAxis", 0, "underline"], undefined),
    gridlineAutoScale: boolProp("barChart", "sbar.valueAxis.gridlineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["valueAxis", 0, "gridlineAutoScale"], undefined, "Gridline"),
    gridlineColor: colorProp("barChart", "sbar.valueAxis.gridlineColor", "Color", "The colour of the gridline.", ["valueAxis", 0, "gridlineColor"], undefined, "Gridline"),
    gridlineDashArray: textProp("barChart", "sbar.valueAxis.gridlineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["valueAxis", 0, "gridlineDashArray"], undefined, "Gridline"),
    gridlineDashCap: enumProp("barChart", "sbar.valueAxis.gridlineDashCap", "Dash cap", "Sets the gridline dash cap.", ["valueAxis", 0, "gridlineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Gridline"),
    gridlineShow: boolProp("barChart", "sbar.valueAxis.gridlineShow", "Show", "Whether the gridline is shown.", ["valueAxis", 0, "gridlineShow"], undefined, "Gridline"),
    gridlineStyle: enumProp("barChart", "sbar.valueAxis.gridlineStyle", "Line style", "Sets the gridline's line style.", ["valueAxis", 0, "gridlineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Gridline"),
    gridlineThickness: numberProp("barChart", "sbar.valueAxis.gridlineThickness", "Width", "The thickness, in pixels, of the gridline.", ["valueAxis", 0, "gridlineThickness"], 0, 10, undefined, "Gridline"),
    gridlineTransparency: numberProp("barChart", "sbar.valueAxis.gridlineTransparency", "Transparency", "How see-through the gridline appears — 0 is solid, 100 is invisible.", ["valueAxis", 0, "gridlineTransparency"], 0, 100, undefined, "Gridline"),
    titleBold: boolProp("barChart", "sbar.valueAxis.titleBold", "Bold", "Whether the title is bold.", ["valueAxis", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("barChart", "sbar.valueAxis.titleColor", "Color", "The colour of the title.", ["valueAxis", 0, "titleColor"], undefined, "Title"),
    titleFontFamily: textProp("barChart", "sbar.valueAxis.titleFontFamily", "Font family", "The typeface used for the title.", ["valueAxis", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("barChart", "sbar.valueAxis.titleFontSize", "Title text size", "Sets the title's title text size.", ["valueAxis", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleItalic: boolProp("barChart", "sbar.valueAxis.titleItalic", "Italic", "Whether the title is italic.", ["valueAxis", 0, "titleItalic"], undefined, "Title"),
    titleText: textProp("barChart", "sbar.valueAxis.titleText", "Axis title", "The custom text used for the title.", ["valueAxis", 0, "titleText"], undefined, "Title"),
    titleUnderline: boolProp("barChart", "sbar.valueAxis.titleUnderline", "Underline", "Whether the title is underlined.", ["valueAxis", 0, "titleUnderline"], undefined, "Title"),
  },

  legend: {
    show: boolProp("barChart", "sbar.legend.show", "Show", "Whether the legend is shown.", ["legend", 0, "show"], undefined),
    bold: boolProp("barChart", "sbar.legend.bold", "Bold", "Whether the legend's text is bold.", ["legend", 0, "bold"], undefined),
    fontFamily: textProp("barChart", "sbar.legend.fontFamily", "Font family", "The typeface used for the legend.", ["legend", 0, "fontFamily"], undefined),
    fontSize: numberProp("barChart", "sbar.legend.fontSize", "Text size", "Sets the legend's text size.", ["legend", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("barChart", "sbar.legend.italic", "Italic", "Whether the legend's text is italic.", ["legend", 0, "italic"], undefined),
    labelColor: colorProp("barChart", "sbar.legend.labelColor", "Text color", "The colour of the label.", ["legend", 0, "labelColor"], undefined),
    position: enumProp("barChart", "sbar.legend.position", "Position", "Select the location for the legend", ["legend", 0, "position"], [{"value":"Top","label":"Top left"},{"value":"TopCenter","label":"Top center"},{"value":"TopRight","label":"Top right"},{"value":"Left","label":"Top left stacked"},{"value":"Right","label":"Top right stacked"},{"value":"LeftCenter","label":"Center left"},{"value":"RightCenter","label":"Center right"},{"value":"Bottom","label":"Bottom left"},{"value":"BottomCenter","label":"Bottom center"},{"value":"BottomRight","label":"Bottom right"}] as const, undefined),
    showGradientLegend: boolProp("barChart", "sbar.legend.showGradientLegend", "Show gradient legend", "Whether the show gradient legend is turned on.", ["legend", 0, "showGradientLegend"], undefined),
    underline: boolProp("barChart", "sbar.legend.underline", "Underline", "Whether the legend's text is underlined.", ["legend", 0, "underline"], undefined),
    showTitle: boolProp("barChart", "sbar.legend.showTitle", "Title", "Display a title for legend symbols", ["legend", 0, "showTitle"], undefined, "Title"),
    titleText: textProp("barChart", "sbar.legend.titleText", "Legend Name", "Title text", ["legend", 0, "titleText"], undefined, "Title"),
  },

  labels: {
    show: boolProp("barChart", "sbar.labels.show", "Show", "Whether the data labels are shown.", ["labels", 0, "show"], undefined),
    backgroundColor: colorProp("barChart", "sbar.labels.backgroundColor", "Color", "Background color", ["labels", 0, "backgroundColor"], undefined, "Background"),
    backgroundTransparency: numberProp("barChart", "sbar.labels.backgroundTransparency", "Transparency", "Background color transparency", ["labels", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
    enableBackground: boolProp("barChart", "sbar.labels.enableBackground", "Show background", "Whether the enable background is turned on.", ["labels", 0, "enableBackground"], undefined, "Background"),
    bold: boolProp("barChart", "sbar.labels.bold", "Bold", "Whether the data labels's text is bold.", ["labels", 0, "bold"], undefined, "Value"),
    color: colorProp("barChart", "sbar.labels.color", "Value color", "Select color for data labels", ["labels", 0, "color"], undefined, "Value"),
    enableDetailDataLabel: boolProp("barChart", "sbar.labels.enableDetailDataLabel", "Enable detail label", "Whether the enable detail data label is turned on.", ["labels", 0, "enableDetailDataLabel"], undefined, "Value"),
    enableTitleDataLabel: boolProp("barChart", "sbar.labels.enableTitleDataLabel", "Enable title label", "Whether the enable title data label is turned on.", ["labels", 0, "enableTitleDataLabel"], undefined, "Value"),
    enableValueDataLabel: boolProp("barChart", "sbar.labels.enableValueDataLabel", "Enable value label", "Whether the enable value data label is turned on.", ["labels", 0, "enableValueDataLabel"], undefined, "Value"),
    fontFamily: textProp("barChart", "sbar.labels.fontFamily", "Font family", "The typeface used for the data labels.", ["labels", 0, "fontFamily"], undefined, "Value"),
    fontSize: numberProp("barChart", "sbar.labels.fontSize", "Text size", "Sets the data labels's text size.", ["labels", 0, "fontSize"], 8, 60, undefined, "Value"),
    horizontalAlignment: enumProp("barChart", "sbar.labels.horizontalAlignment", "Horizontal alignment", "Sets the horizontal alignment.", ["labels", 0, "horizontalAlignment"], [{"value":"left","label":"left"},{"value":"center","label":"center"},{"value":"right","label":"right"}] as const, undefined, "Value"),
    italic: boolProp("barChart", "sbar.labels.italic", "Italic", "Whether the data labels's text is italic.", ["labels", 0, "italic"], undefined, "Value"),
    labelContainerMaxWidth: numberProp("barChart", "sbar.labels.labelContainerMaxWidth", "Maximum width", "Sets the label container max width.", ["labels", 0, "labelContainerMaxWidth"], -1000, 1000, undefined, "Value"),
    labelContentLayout: enumProp("barChart", "sbar.labels.labelContentLayout", "Layout", "Sets the label content layout.", ["labels", 0, "labelContentLayout"], [{"value":"MultiLine","label":"Multi-line"},{"value":"SingleLine","label":"Single line"}] as const, undefined, "Value"),
    labelDensity: numberProp("barChart", "sbar.labels.labelDensity", "Label density", "Sets the label density.", ["labels", 0, "labelDensity"], -1000, 1000, undefined, "Value"),
    labelDisplayUnits: enumProp("barChart", "sbar.labels.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Value"),
    labelOrientation: enumProp("barChart", "sbar.labels.labelOrientation", "Orientation", "Sets the label orientation.", ["labels", 0, "labelOrientation"], [{"value":0,"label":"Vertical"},{"value":1,"label":"Horizontal"}] as const, undefined, "Value"),
    labelOverflow: boolProp("barChart", "sbar.labels.labelOverflow", "Overflow text", "Allow the labels to overflow outside of the shape's boundaries", ["labels", 0, "labelOverflow"], undefined, "Value"),
    labelPosition: enumProp("barChart", "sbar.labels.labelPosition", "Position", "Sets the label position.", ["labels", 0, "labelPosition"], [{"value":"Auto","label":"Auto"},{"value":"InsideEnd","label":"Inside end"},{"value":"OutsideEnd","label":"Outside end"},{"value":"InsideCenter","label":"Inside center"},{"value":"InsideBase","label":"Inside base"},{"value":"Above","label":"Above"},{"value":"Under","label":"Under"}] as const, undefined, "Value"),
    labelPrecision: numberProp("barChart", "sbar.labels.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "labelPrecision"], 0, 10, undefined, "Value"),
    optimizeLabelDisplay: boolProp("barChart", "sbar.labels.optimizeLabelDisplay", "Optimize label display", "Whether the optimize label display is turned on.", ["labels", 0, "optimizeLabelDisplay"], undefined, "Value"),
    showAll: boolProp("barChart", "sbar.labels.showAll", "Customize series", "Whether the show all is turned on.", ["labels", 0, "showAll"], undefined, "Value"),
    showBlankAs: textProp("barChart", "sbar.labels.showBlankAs", "Show blank as (value)", "The custom text used for the show blank as.", ["labels", 0, "showBlankAs"], undefined, "Value"),
    showByDefault: boolProp("barChart", "sbar.labels.showByDefault", "Show by default", "Whether the show by default is turned on.", ["labels", 0, "showByDefault"], undefined, "Value"),
    showDynamicLabels: boolProp("barChart", "sbar.labels.showDynamicLabels", "Custom label", "Whether the show dynamic labels is turned on.", ["labels", 0, "showDynamicLabels"], undefined, "Value"),
    showSeries: boolProp("barChart", "sbar.labels.showSeries", "Customize per series", "Whether the show series is turned on.", ["labels", 0, "showSeries"], undefined, "Value"),
    transparency: numberProp("barChart", "sbar.labels.transparency", "Transparency", "How see-through the data labels appears — 0 is solid, 100 is invisible.", ["labels", 0, "transparency"], 0, 100, undefined, "Value"),
    underline: boolProp("barChart", "sbar.labels.underline", "Underline", "Whether the data labels's text is underlined.", ["labels", 0, "underline"], undefined, "Value"),
    valueCustomFormatString: textProp("barChart", "sbar.labels.valueCustomFormatString", "Format code", "Enter a custom number format for your callout.", ["labels", 0, "valueCustomFormatString"], undefined, "Value"),
    valueFormatString: textProp("barChart", "sbar.labels.valueFormatString", "Format string", "The custom text used for the value format string.", ["labels", 0, "valueFormatString"], undefined, "Value"),
    wordWrap: boolProp("barChart", "sbar.labels.wordWrap", "Word wrap", "Whether the word wrap is turned on.", ["labels", 0, "wordWrap"], undefined, "Value"),
    detailBold: boolProp("barChart", "sbar.labels.detailBold", "Bold", "Whether the detail is bold.", ["labels", 0, "detailBold"], undefined, "Detail"),
    detailColor: colorProp("barChart", "sbar.labels.detailColor", "Color", "Select color for data labels", ["labels", 0, "detailColor"], undefined, "Detail"),
    detailContentType: enumProp("barChart", "sbar.labels.detailContentType", "Content", "Sets the detail content type.", ["labels", 0, "detailContentType"], [{"value":"Percent of total","label":"Percent of total"},{"value":"Custom","label":"Custom"}] as const, undefined, "Detail"),
    detailCustomFormatString: textProp("barChart", "sbar.labels.detailCustomFormatString", "Custom format code", "Enter a custom number format for your callout.", ["labels", 0, "detailCustomFormatString"], undefined, "Detail"),
    detailFontFamily: textProp("barChart", "sbar.labels.detailFontFamily", "Font family", "The typeface used for the detail.", ["labels", 0, "detailFontFamily"], undefined, "Detail"),
    detailFontSize: numberProp("barChart", "sbar.labels.detailFontSize", "Text size", "Sets the detail's text size.", ["labels", 0, "detailFontSize"], 8, 60, undefined, "Detail"),
    detailFormatString: textProp("barChart", "sbar.labels.detailFormatString", "Format string", "The custom text used for the detail format string.", ["labels", 0, "detailFormatString"], undefined, "Detail"),
    detailItalic: boolProp("barChart", "sbar.labels.detailItalic", "Italic", "Whether the detail is italic.", ["labels", 0, "detailItalic"], undefined, "Detail"),
    detailLabelDisplayUnits: enumProp("barChart", "sbar.labels.detailLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "detailLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Detail"),
    detailLabelPrecision: numberProp("barChart", "sbar.labels.detailLabelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "detailLabelPrecision"], 0, 10, undefined, "Detail"),
    detailShowBlankAs: textProp("barChart", "sbar.labels.detailShowBlankAs", "Show blank as (detail)", "The custom text used for the detail show blank as.", ["labels", 0, "detailShowBlankAs"], undefined, "Detail"),
    detailTransparency: numberProp("barChart", "sbar.labels.detailTransparency", "Transparency", "How see-through the detail appears — 0 is solid, 100 is invisible.", ["labels", 0, "detailTransparency"], 0, 100, undefined, "Detail"),
    detailUnderline: boolProp("barChart", "sbar.labels.detailUnderline", "Underline", "Whether the detail is underlined.", ["labels", 0, "detailUnderline"], undefined, "Detail"),
    titleBold: boolProp("barChart", "sbar.labels.titleBold", "Bold", "Whether the title is bold.", ["labels", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("barChart", "sbar.labels.titleColor", "Color", "Select color for data labels", ["labels", 0, "titleColor"], undefined, "Title"),
    titleContentType: enumProp("barChart", "sbar.labels.titleContentType", "Content", "Sets the title content type.", ["labels", 0, "titleContentType"], [{"value":"Series name","label":"Series name"},{"value":"Custom","label":"Custom"}] as const, undefined, "Title"),
    titleCustomFormatString: textProp("barChart", "sbar.labels.titleCustomFormatString", "Custom format code", "Enter a custom number format for your callout.", ["labels", 0, "titleCustomFormatString"], undefined, "Title"),
    titleFontFamily: textProp("barChart", "sbar.labels.titleFontFamily", "Font family", "The typeface used for the title.", ["labels", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("barChart", "sbar.labels.titleFontSize", "Text size", "Sets the title's text size.", ["labels", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleFormatString: textProp("barChart", "sbar.labels.titleFormatString", "Format string", "The custom text used for the title format string.", ["labels", 0, "titleFormatString"], undefined, "Title"),
    titleItalic: boolProp("barChart", "sbar.labels.titleItalic", "Italic", "Whether the title is italic.", ["labels", 0, "titleItalic"], undefined, "Title"),
    titleLabelDisplayUnits: enumProp("barChart", "sbar.labels.titleLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "titleLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Title"),
    titleLabelPrecision: numberProp("barChart", "sbar.labels.titleLabelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "titleLabelPrecision"], 0, 10, undefined, "Title"),
    titleShowBlankAs: textProp("barChart", "sbar.labels.titleShowBlankAs", "Show blank as (title)", "The custom text used for the title show blank as.", ["labels", 0, "titleShowBlankAs"], undefined, "Title"),
    titleTransparency: numberProp("barChart", "sbar.labels.titleTransparency", "Transparency", "How see-through the title appears — 0 is solid, 100 is invisible.", ["labels", 0, "titleTransparency"], 0, 100, undefined, "Title"),
    titleUnderline: boolProp("barChart", "sbar.labels.titleUnderline", "Underline", "Whether the title is underlined.", ["labels", 0, "titleUnderline"], undefined, "Title"),
  },

  plotArea: {
    transparency: numberProp("barChart", "sbar.plotArea.transparency", "Transparency", "Background color transparency", ["plotArea", 0, "transparency"], 0, 100, undefined),
  },

  error: {
    enabled: boolProp("barChart", "sbar.error.enabled", "Enabled", "Whether the enabled is turned on.", ["error", 0, "enabled"], undefined),
    barBorderColor: colorProp("barChart", "sbar.error.barBorderColor", "Border color", "The colour of the bar border.", ["error", 0, "barBorderColor"], undefined, "Bar"),
    barBorderSize: numberProp("barChart", "sbar.error.barBorderSize", "Border size", "Sets the bar border's border size.", ["error", 0, "barBorderSize"], 0, 10, undefined, "Bar"),
    barColor: colorProp("barChart", "sbar.error.barColor", "Color", "The colour of the bar.", ["error", 0, "barColor"], undefined, "Bar"),
    barMatchSeriesColor: boolProp("barChart", "sbar.error.barMatchSeriesColor", "Match series color", "Whether the bar match series is turned on.", ["error", 0, "barMatchSeriesColor"], undefined, "Bar"),
    barShow: boolProp("barChart", "sbar.error.barShow", "Show", "Whether the bar is shown.", ["error", 0, "barShow"], undefined, "Bar"),
    barWidth: numberProp("barChart", "sbar.error.barWidth", "Width", "The thickness, in pixels, of the bar width.", ["error", 0, "barWidth"], 0, 10, undefined, "Bar"),
    labelBackground: boolProp("barChart", "sbar.error.labelBackground", "Show background", "Whether the label background is turned on.", ["error", 0, "labelBackground"], undefined, "Label"),
    labelBackgroundColor: colorProp("barChart", "sbar.error.labelBackgroundColor", "Background color", "The colour of the label background.", ["error", 0, "labelBackgroundColor"], undefined, "Label"),
    labelBackgroundTransparency: numberProp("barChart", "sbar.error.labelBackgroundTransparency", "Transparency", "Background color transparency", ["error", 0, "labelBackgroundTransparency"], 0, 100, undefined, "Label"),
    labelBold: boolProp("barChart", "sbar.error.labelBold", "Bold", "Whether the label is bold.", ["error", 0, "labelBold"], undefined, "Label"),
    labelColor: colorProp("barChart", "sbar.error.labelColor", "Color", "The colour of the label.", ["error", 0, "labelColor"], undefined, "Label"),
    labelFontFamily: textProp("barChart", "sbar.error.labelFontFamily", "Font family", "The typeface used for the label.", ["error", 0, "labelFontFamily"], undefined, "Label"),
    labelFontSize: numberProp("barChart", "sbar.error.labelFontSize", "Text size", "Sets the label's text size.", ["error", 0, "labelFontSize"], 8, 60, undefined, "Label"),
    labelFormat: enumProp("barChart", "sbar.error.labelFormat", "Format", "Sets the label format.", ["error", 0, "labelFormat"], [{"value":"absolute","label":"Absolute"},{"value":"relativeNumeric","label":"Relative (numeric)"},{"value":"relativePercentage","label":"Relative (percentage)"},{"value":"range","label":"Range"}] as const, undefined, "Label"),
    labelItalic: boolProp("barChart", "sbar.error.labelItalic", "Italic", "Whether the label is italic.", ["error", 0, "labelItalic"], undefined, "Label"),
    labelMatchSeriesColor: boolProp("barChart", "sbar.error.labelMatchSeriesColor", "Match series color", "Whether the label match series is turned on.", ["error", 0, "labelMatchSeriesColor"], undefined, "Label"),
    labelShow: boolProp("barChart", "sbar.error.labelShow", "Show", "Whether the label is shown.", ["error", 0, "labelShow"], undefined, "Label"),
    labelUnderline: boolProp("barChart", "sbar.error.labelUnderline", "Underline", "Whether the label is underlined.", ["error", 0, "labelUnderline"], undefined, "Label"),
    markerShape: enumProp("barChart", "sbar.error.markerShape", "Marker shape", "Sets the marker shape.", ["error", 0, "markerShape"], [{"value":"circle","label":"●"},{"value":"square","label":"■"},{"value":"diamond","label":"◆"},{"value":"triangle","label":"▲"},{"value":"x","label":"☓"},{"value":"shortDash","label":" -"},{"value":"longDash","label":"—"},{"value":"plus","label":"+"},{"value":"none","label":"None"}] as const, undefined, "Marker"),
    markerShow: boolProp("barChart", "sbar.error.markerShow", "Show", "Whether the marker is shown.", ["error", 0, "markerShow"], undefined, "Marker"),
    markerSize: numberProp("barChart", "sbar.error.markerSize", "Size", "Sets the marker's size.", ["error", 0, "markerSize"], 1, 60, undefined, "Marker"),
    tooltipFormat: enumProp("barChart", "sbar.error.tooltipFormat", "Format", "Sets the tooltip format.", ["error", 0, "tooltipFormat"], [{"value":"absolute","label":"Absolute"},{"value":"relativeNumeric","label":"Relative (numeric)"},{"value":"relativePercentage","label":"Relative (percentage)"},{"value":"range","label":"Range"}] as const, undefined, "Tooltip"),
    tooltipShow: boolProp("barChart", "sbar.error.tooltipShow", "Show in tooltip", "Whether the tooltip is shown.", ["error", 0, "tooltipShow"], undefined, "Tooltip"),
  },

  trend: {
    show: boolProp("barChart", "sbar.trend.show", "Show", "Whether the trend line is shown.", ["trend", 0, "show"], undefined),
    autoScale: boolProp("barChart", "sbar.trend.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["trend", 0, "autoScale"], undefined),
    combineSeries: boolProp("barChart", "sbar.trend.combineSeries", "Combine series", "Show one trend line per series or combine", ["trend", 0, "combineSeries"], undefined),
    dashArray: textProp("barChart", "sbar.trend.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["trend", 0, "dashArray"], undefined),
    dashCap: enumProp("barChart", "sbar.trend.dashCap", "Dash cap", "Sets the dash cap.", ["trend", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined),
    displayName: textProp("barChart", "sbar.trend.displayName", "Name", "Set trend line name", ["trend", 0, "displayName"], undefined),
    lineColor: colorProp("barChart", "sbar.trend.lineColor", "Color", "The colour of the line.", ["trend", 0, "lineColor"], undefined),
    style: enumProp("barChart", "sbar.trend.style", "Line style", "Sets the trend line's line style.", ["trend", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    transparency: numberProp("barChart", "sbar.trend.transparency", "Transparency", "How see-through the trend line appears — 0 is solid, 100 is invisible.", ["trend", 0, "transparency"], 0, 100, undefined),
    useHighlightValues: boolProp("barChart", "sbar.trend.useHighlightValues", "Use highlight values", "Use highlight values to calculate trend line", ["trend", 0, "useHighlightValues"], undefined),
    width: numberProp("barChart", "sbar.trend.width", "Width", "The thickness, in pixels, of the width.", ["trend", 0, "width"], 0, 10, undefined),
  },

  ribbonBands: {
    show: boolProp("barChart", "sbar.ribbonBands.show", "Show", "Whether the ribbons are shown.", ["ribbonBands", 0, "show"], undefined),
    fillColor: colorProp("barChart", "sbar.ribbonBands.fillColor", "Fill color", "The colour of the fill.", ["ribbonBands", 0, "fillColor"], undefined),
    fillMatchColor: boolProp("barChart", "sbar.ribbonBands.fillMatchColor", "Match series color", "Change the color of ribbons to match the color of the series.", ["ribbonBands", 0, "fillMatchColor"], undefined),
    fillTransparency: numberProp("barChart", "sbar.ribbonBands.fillTransparency", "Transparency", "How see-through the fill appears — 0 is solid, 100 is invisible.", ["ribbonBands", 0, "fillTransparency"], 0, 100, undefined),
    borderColor: colorProp("barChart", "sbar.ribbonBands.borderColor", "Border color", "The colour of the border.", ["ribbonBands", 0, "borderColor"], undefined, "Border"),
    borderColorMatchFill: boolProp("barChart", "sbar.ribbonBands.borderColorMatchFill", "Match fill color", "Match the border color to the main shape color.", ["ribbonBands", 0, "borderColorMatchFill"], undefined, "Border"),
    borderShow: boolProp("barChart", "sbar.ribbonBands.borderShow", "Border", "Whether the border is shown.", ["ribbonBands", 0, "borderShow"], undefined, "Border"),
    borderSize: numberProp("barChart", "sbar.ribbonBands.borderSize", "Width", "The thickness, in pixels, of the border.", ["ribbonBands", 0, "borderSize"], 0, 10, undefined, "Border"),
    borderTransparency: numberProp("barChart", "sbar.ribbonBands.borderTransparency", "Transparency", "How see-through the border appears — 0 is solid, 100 is invisible.", ["ribbonBands", 0, "borderTransparency"], 0, 100, undefined, "Border"),
  },

  totals: {
    show: boolProp("barChart", "sbar.totals.show", "Show", "Whether the total labels is shown.", ["totals", 0, "show"], undefined),
    bold: boolProp("barChart", "sbar.totals.bold", "Bold", "Whether the total labels's text is bold.", ["totals", 0, "bold"], undefined),
    color: colorProp("barChart", "sbar.totals.color", "Font color", "Select color for data labels", ["totals", 0, "color"], undefined),
    fontFamily: textProp("barChart", "sbar.totals.fontFamily", "Font family", "The typeface used for the total labels.", ["totals", 0, "fontFamily"], undefined),
    fontSize: numberProp("barChart", "sbar.totals.fontSize", "Text size", "Sets the total labels's text size.", ["totals", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("barChart", "sbar.totals.italic", "Italic", "Whether the total labels's text is italic.", ["totals", 0, "italic"], undefined),
    labelDisplayUnits: enumProp("barChart", "sbar.totals.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["totals", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    labelPrecision: numberProp("barChart", "sbar.totals.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["totals", 0, "labelPrecision"], 0, 10, undefined),
    showPositiveAndNegative: boolProp("barChart", "sbar.totals.showPositiveAndNegative", "Split positive and negative", "Show separate labels for the total of the positive values and the total of the negative values", ["totals", 0, "showPositiveAndNegative"], undefined),
    underline: boolProp("barChart", "sbar.totals.underline", "Underline", "Whether the total labels's text is underlined.", ["totals", 0, "underline"], undefined),
    backgroundColor: colorProp("barChart", "sbar.totals.backgroundColor", "Color", "Background color", ["totals", 0, "backgroundColor"], undefined, "Background"),
    backgroundTransparency: numberProp("barChart", "sbar.totals.backgroundTransparency", "Transparency", "Background color transparency", ["totals", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
    enableBackground: boolProp("barChart", "sbar.totals.enableBackground", "Show background", "Whether the enable background is turned on.", ["totals", 0, "enableBackground"], undefined, "Background"),
  },

  xAxisReferenceLine: {
    show: boolProp("barChart", "sbar.xAxisReferenceLine.show", "Show", "Whether the X-axis constant line is shown.", ["xAxisReferenceLine", 0, "show"], undefined),
    autoScale: boolProp("barChart", "sbar.xAxisReferenceLine.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["xAxisReferenceLine", 0, "autoScale"], undefined),
    dashArray: textProp("barChart", "sbar.xAxisReferenceLine.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["xAxisReferenceLine", 0, "dashArray"], undefined),
    dashCap: enumProp("barChart", "sbar.xAxisReferenceLine.dashCap", "Dash cap", "Sets the dash cap.", ["xAxisReferenceLine", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined),
    displayName: textProp("barChart", "sbar.xAxisReferenceLine.displayName", "Name", "Set reference line name", ["xAxisReferenceLine", 0, "displayName"], undefined),
    lineColor: colorProp("barChart", "sbar.xAxisReferenceLine.lineColor", "Color", "The colour of the line.", ["xAxisReferenceLine", 0, "lineColor"], undefined),
    position: enumProp("barChart", "sbar.xAxisReferenceLine.position", "Position", "Arrange relative to chart data points", ["xAxisReferenceLine", 0, "position"], [{"value":"back","label":"Behind"},{"value":"front","label":"In front"}] as const, undefined),
    style: enumProp("barChart", "sbar.xAxisReferenceLine.style", "Line style", "Sets the X-axis constant line's line style.", ["xAxisReferenceLine", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    transparency: numberProp("barChart", "sbar.xAxisReferenceLine.transparency", "Transparency", "How see-through the X-axis constant line appears — 0 is solid, 100 is invisible.", ["xAxisReferenceLine", 0, "transparency"], 0, 100, undefined),
    value: textProp("barChart", "sbar.xAxisReferenceLine.value", "Value", "Set reference line numeric or date time value according to x-axis type", ["xAxisReferenceLine", 0, "value"], undefined),
    width: numberProp("barChart", "sbar.xAxisReferenceLine.width", "Width", "The thickness, in pixels, of the width.", ["xAxisReferenceLine", 0, "width"], 0, 10, undefined),
    dataLabelColor: colorProp("barChart", "sbar.xAxisReferenceLine.dataLabelColor", "Color", "Set the reference line data label color", ["xAxisReferenceLine", 0, "dataLabelColor"], undefined, "Data label"),
    dataLabelDecimalPoints: numberProp("barChart", "sbar.xAxisReferenceLine.dataLabelDecimalPoints", "Value decimal places", "Sets the data label decimal points's value decimal places.", ["xAxisReferenceLine", 0, "dataLabelDecimalPoints"], 0, 10, undefined, "Data label"),
    dataLabelDisplayUnits: enumProp("barChart", "sbar.xAxisReferenceLine.dataLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["xAxisReferenceLine", 0, "dataLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined, "Data label"),
    dataLabelHorizontalPosition: enumProp("barChart", "sbar.xAxisReferenceLine.dataLabelHorizontalPosition", "Horizontal position", "Set the horizontal position for the reference line data label", ["xAxisReferenceLine", 0, "dataLabelHorizontalPosition"], [{"value":"left","label":"Left"},{"value":"right","label":"Right"}] as const, undefined, "Data label"),
    dataLabelShow: boolProp("barChart", "sbar.xAxisReferenceLine.dataLabelShow", "Data label", "Display a data label for the reference line", ["xAxisReferenceLine", 0, "dataLabelShow"], undefined, "Data label"),
    dataLabelText: enumProp("barChart", "sbar.xAxisReferenceLine.dataLabelText", "Text", "Text shown in the label", ["xAxisReferenceLine", 0, "dataLabelText"], [{"value":"Value","label":"Data value"},{"value":"Name","label":"Name"},{"value":"ValueAndName","label":"Both"}] as const, undefined, "Data label"),
    dataLabelVerticalPosition: enumProp("barChart", "sbar.xAxisReferenceLine.dataLabelVerticalPosition", "Vertical position", "Set the vertical position for the reference line data label", ["xAxisReferenceLine", 0, "dataLabelVerticalPosition"], [{"value":"above","label":"Above"},{"value":"under","label":"Under"}] as const, undefined, "Data label"),
    shadeColor: colorProp("barChart", "sbar.xAxisReferenceLine.shadeColor", "Shade color", "The colour of the shade.", ["xAxisReferenceLine", 0, "shadeColor"], undefined, "Shade"),
    shadeColorMatchStroke: boolProp("barChart", "sbar.xAxisReferenceLine.shadeColorMatchStroke", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["xAxisReferenceLine", 0, "shadeColorMatchStroke"], undefined, "Shade"),
    shadeRegion: enumProp("barChart", "sbar.xAxisReferenceLine.shadeRegion", "Shade region", "Sets the shade region.", ["xAxisReferenceLine", 0, "shadeRegion"], [{"value":"before","label":"Before"},{"value":"after","label":"After"},{"value":"none","label":"None"}] as const, undefined, "Shade"),
    shadeShow: boolProp("barChart", "sbar.xAxisReferenceLine.shadeShow", "Show", "Whether the shade is shown.", ["xAxisReferenceLine", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("barChart", "sbar.xAxisReferenceLine.shadeTransparency", "Shade transparency", "How see-through the shade appears — 0 is solid, 100 is invisible.", ["xAxisReferenceLine", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
  },

  y1AxisReferenceLine: {
    show: boolProp("barChart", "sbar.y1AxisReferenceLine.show", "Show", "Whether the Y-axis constant line is shown.", ["y1AxisReferenceLine", 0, "show"], undefined),
    autoScale: boolProp("barChart", "sbar.y1AxisReferenceLine.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["y1AxisReferenceLine", 0, "autoScale"], undefined),
    dashArray: textProp("barChart", "sbar.y1AxisReferenceLine.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["y1AxisReferenceLine", 0, "dashArray"], undefined),
    dashCap: enumProp("barChart", "sbar.y1AxisReferenceLine.dashCap", "Dash cap", "Sets the dash cap.", ["y1AxisReferenceLine", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined),
    displayName: textProp("barChart", "sbar.y1AxisReferenceLine.displayName", "Name", "Set reference line name", ["y1AxisReferenceLine", 0, "displayName"], undefined),
    lineColor: colorProp("barChart", "sbar.y1AxisReferenceLine.lineColor", "Color", "The colour of the line.", ["y1AxisReferenceLine", 0, "lineColor"], undefined),
    position: enumProp("barChart", "sbar.y1AxisReferenceLine.position", "Position", "Arrange relative to chart data points", ["y1AxisReferenceLine", 0, "position"], [{"value":"back","label":"Behind"},{"value":"front","label":"In front"}] as const, undefined),
    style: enumProp("barChart", "sbar.y1AxisReferenceLine.style", "Line style", "Sets the Y-axis constant line's line style.", ["y1AxisReferenceLine", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    transparency: numberProp("barChart", "sbar.y1AxisReferenceLine.transparency", "Transparency", "How see-through the Y-axis constant line appears — 0 is solid, 100 is invisible.", ["y1AxisReferenceLine", 0, "transparency"], 0, 100, undefined),
    value: numberProp("barChart", "sbar.y1AxisReferenceLine.value", "Value", "Set reference line numeric value", ["y1AxisReferenceLine", 0, "value"], -1000, 1000, undefined),
    width: numberProp("barChart", "sbar.y1AxisReferenceLine.width", "Width", "The thickness, in pixels, of the width.", ["y1AxisReferenceLine", 0, "width"], 0, 10, undefined),
    dataLabelColor: colorProp("barChart", "sbar.y1AxisReferenceLine.dataLabelColor", "Color", "Set the reference line data label color", ["y1AxisReferenceLine", 0, "dataLabelColor"], undefined, "Data label"),
    dataLabelDecimalPoints: numberProp("barChart", "sbar.y1AxisReferenceLine.dataLabelDecimalPoints", "Value decimal places", "Sets the data label decimal points's value decimal places.", ["y1AxisReferenceLine", 0, "dataLabelDecimalPoints"], 0, 10, undefined, "Data label"),
    dataLabelDisplayUnits: enumProp("barChart", "sbar.y1AxisReferenceLine.dataLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["y1AxisReferenceLine", 0, "dataLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined, "Data label"),
    dataLabelHorizontalPosition: enumProp("barChart", "sbar.y1AxisReferenceLine.dataLabelHorizontalPosition", "Horizontal position", "Set the horizontal position for the reference line data label", ["y1AxisReferenceLine", 0, "dataLabelHorizontalPosition"], [{"value":"left","label":"Left"},{"value":"right","label":"Right"}] as const, undefined, "Data label"),
    dataLabelShow: boolProp("barChart", "sbar.y1AxisReferenceLine.dataLabelShow", "Data label", "Display a data label for the reference line", ["y1AxisReferenceLine", 0, "dataLabelShow"], undefined, "Data label"),
    dataLabelText: enumProp("barChart", "sbar.y1AxisReferenceLine.dataLabelText", "Text", "Text shown in the label", ["y1AxisReferenceLine", 0, "dataLabelText"], [{"value":"Value","label":"Data value"},{"value":"Name","label":"Name"},{"value":"ValueAndName","label":"Both"}] as const, undefined, "Data label"),
    dataLabelVerticalPosition: enumProp("barChart", "sbar.y1AxisReferenceLine.dataLabelVerticalPosition", "Vertical position", "Set the vertical position for the reference line data label", ["y1AxisReferenceLine", 0, "dataLabelVerticalPosition"], [{"value":"above","label":"Above"},{"value":"under","label":"Under"}] as const, undefined, "Data label"),
    shadeColor: colorProp("barChart", "sbar.y1AxisReferenceLine.shadeColor", "Shade color", "The colour of the shade.", ["y1AxisReferenceLine", 0, "shadeColor"], undefined, "Shade"),
    shadeColorMatchStroke: boolProp("barChart", "sbar.y1AxisReferenceLine.shadeColorMatchStroke", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["y1AxisReferenceLine", 0, "shadeColorMatchStroke"], undefined, "Shade"),
    shadeRegion: enumProp("barChart", "sbar.y1AxisReferenceLine.shadeRegion", "Shade region", "Sets the shade region.", ["y1AxisReferenceLine", 0, "shadeRegion"], [{"value":"before","label":"Before"},{"value":"after","label":"After"},{"value":"none","label":"None"}] as const, undefined, "Shade"),
    shadeShow: boolProp("barChart", "sbar.y1AxisReferenceLine.shadeShow", "Show", "Whether the shade is shown.", ["y1AxisReferenceLine", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("barChart", "sbar.y1AxisReferenceLine.shadeTransparency", "Shade transparency", "How see-through the shade appears — 0 is solid, 100 is invisible.", ["y1AxisReferenceLine", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
  },

  zoom: {
    show: boolProp("barChart", "sbar.zoom.show", "Show", "Whether the zoom slider is shown.", ["zoom", 0, "show"], undefined),
    showLabels: boolProp("barChart", "sbar.zoom.showLabels", "Slider labels", "Whether the show labels is turned on.", ["zoom", 0, "showLabels"], undefined),
    showOnCategoryAxis: boolProp("barChart", "sbar.zoom.showOnCategoryAxis", "Show zoom on Y axis", "Whether the show on category axis is turned on.", ["zoom", 0, "showOnCategoryAxis"], undefined),
    showOnValueAxis: boolProp("barChart", "sbar.zoom.showOnValueAxis", "Show zoom on X axis", "Whether the show on value axis is turned on.", ["zoom", 0, "showOnValueAxis"], undefined),
    showTooltip: boolProp("barChart", "sbar.zoom.showTooltip", "Slider tooltips", "Whether the show tooltip is turned on.", ["zoom", 0, "showTooltip"], undefined),
    categoryMax: numberProp("barChart", "sbar.zoom.categoryMax", "Category Max", "Sets the category max.", ["zoom", 0, "categoryMax"], -1000, 1000, undefined, "Category axis"),
    categoryMin: numberProp("barChart", "sbar.zoom.categoryMin", "Category Min", "Sets the category min.", ["zoom", 0, "categoryMin"], -1000, 1000, undefined, "Category axis"),
    categorySize: numberProp("barChart", "sbar.zoom.categorySize", "Category Size", "Sets the category's category size.", ["zoom", 0, "categorySize"], 1, 60, undefined, "Category axis"),
    valueMax: numberProp("barChart", "sbar.zoom.valueMax", "Value Max", "Sets the value max.", ["zoom", 0, "valueMax"], -1000, 1000, undefined, "Value axis"),
    valueMin: numberProp("barChart", "sbar.zoom.valueMin", "Value Min", "Sets the value min.", ["zoom", 0, "valueMin"], -1000, 1000, undefined, "Value axis"),
    valueSize: numberProp("barChart", "sbar.zoom.valueSize", "Value Size", "Sets the value's value size.", ["zoom", 0, "valueSize"], 1, 60, undefined, "Value axis"),
  },

  smallMultiplesLayout: {
    advancedPaddingOptions: boolProp("barChart", "sbar.smallMultiplesLayout.advancedPaddingOptions", "Advanced padding options", "Whether the advanced padding options is turned on.", ["smallMultiplesLayout", 0, "advancedPaddingOptions"], undefined, "Layout"),
    columnCount: numberProp("barChart", "sbar.smallMultiplesLayout.columnCount", "Columns", "Sets the column count's columns.", ["smallMultiplesLayout", 0, "columnCount"], 1, 12, undefined, "Layout"),
    columnPaddingInner: numberProp("barChart", "sbar.smallMultiplesLayout.columnPaddingInner", "Inner column padding", "Sets the column padding inner's inner column padding.", ["smallMultiplesLayout", 0, "columnPaddingInner"], 0, 50, undefined, "Layout"),
    columnPaddingOuter: numberProp("barChart", "sbar.smallMultiplesLayout.columnPaddingOuter", "Outer column padding", "Sets the column padding outer's outer column padding.", ["smallMultiplesLayout", 0, "columnPaddingOuter"], 0, 50, undefined, "Layout"),
    layoutType: enumProp("barChart", "sbar.smallMultiplesLayout.layoutType", "Grid layout", "Sets the layout type.", ["smallMultiplesLayout", 0, "layoutType"], [{"value":"auto","label":"Auto"},{"value":"custom","label":"Custom"}] as const, undefined, "Layout"),
    rowCount: numberProp("barChart", "sbar.smallMultiplesLayout.rowCount", "Rows", "Sets the row count's rows.", ["smallMultiplesLayout", 0, "rowCount"], 1, 12, undefined, "Layout"),
    rowPaddingInner: numberProp("barChart", "sbar.smallMultiplesLayout.rowPaddingInner", "Inner row padding", "Sets the row padding inner's inner row padding.", ["smallMultiplesLayout", 0, "rowPaddingInner"], 0, 50, undefined, "Layout"),
    rowPaddingOuter: numberProp("barChart", "sbar.smallMultiplesLayout.rowPaddingOuter", "Outer row padding", "Sets the row padding outer's outer row padding.", ["smallMultiplesLayout", 0, "rowPaddingOuter"], 0, 50, undefined, "Layout"),
    backgroundColor: colorProp("barChart", "sbar.smallMultiplesLayout.backgroundColor", "Color", "Background color for each small multiple", ["smallMultiplesLayout", 0, "backgroundColor"], undefined, "Background"),
    backgroundTransparency: numberProp("barChart", "sbar.smallMultiplesLayout.backgroundTransparency", "Transparency", "Background color transparency", ["smallMultiplesLayout", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
    gridLineColor: colorProp("barChart", "sbar.smallMultiplesLayout.gridLineColor", "Line color", "The colour of the grid line.", ["smallMultiplesLayout", 0, "gridLineColor"], undefined, "Grid"),
    gridLineShow: boolProp("barChart", "sbar.smallMultiplesLayout.gridLineShow", "Show", "Whether the grid line is shown.", ["smallMultiplesLayout", 0, "gridLineShow"], undefined, "Grid"),
    gridLineStyle: enumProp("barChart", "sbar.smallMultiplesLayout.gridLineStyle", "Line style", "Sets the grid line's line style.", ["smallMultiplesLayout", 0, "gridLineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"}] as const, undefined, "Grid"),
    gridLineTransparency: numberProp("barChart", "sbar.smallMultiplesLayout.gridLineTransparency", "Transparency", "How see-through the grid line appears — 0 is solid, 100 is invisible.", ["smallMultiplesLayout", 0, "gridLineTransparency"], 0, 100, undefined, "Grid"),
    gridLineType: enumProp("barChart", "sbar.smallMultiplesLayout.gridLineType", "Gridlines", "Gridlines to delineate the small multiple visuals", ["smallMultiplesLayout", 0, "gridLineType"], [{"value":"all","label":"All"},{"value":"inner","label":"Horizontal and vertical"},{"value":"innerHorizontal","label":"Horizontal only"},{"value":"innerVertical","label":"Vertical only"}] as const, undefined, "Grid"),
    gridLineWidth: numberProp("barChart", "sbar.smallMultiplesLayout.gridLineWidth", "Width", "The thickness, in pixels, of the grid line width.", ["smallMultiplesLayout", 0, "gridLineWidth"], 0, 10, undefined, "Grid"),
    gridPadding: numberProp("barChart", "sbar.smallMultiplesLayout.gridPadding", "Grid padding", "Sets the grid padding.", ["smallMultiplesLayout", 0, "gridPadding"], 0, 50, undefined, "Grid"),
  },

  subheader: {
    show: boolProp("barChart", "sbar.subheader.show", "Show", "Whether the small multiple titles is shown.", ["subheader", 0, "show"], undefined),
    alignment: enumProp("barChart", "sbar.subheader.alignment", "Alignment", "Alignment position for the title", ["subheader", 0, "alignment"], [{"value":"left","label":"left"},{"value":"center","label":"center"},{"value":"right","label":"right"}] as const, undefined),
    bold: boolProp("barChart", "sbar.subheader.bold", "Bold", "Whether the small multiple titles's text is bold.", ["subheader", 0, "bold"], undefined),
    fontColor: colorProp("barChart", "sbar.subheader.fontColor", "Font color", "The colour of the font.", ["subheader", 0, "fontColor"], undefined),
    fontFamily: textProp("barChart", "sbar.subheader.fontFamily", "Font family", "The typeface used for the small multiple titles.", ["subheader", 0, "fontFamily"], undefined),
    fontSize: numberProp("barChart", "sbar.subheader.fontSize", "Text size", "Sets the small multiple titles's text size.", ["subheader", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("barChart", "sbar.subheader.italic", "Italic", "Whether the small multiple titles's text is italic.", ["subheader", 0, "italic"], undefined),
    position: enumProp("barChart", "sbar.subheader.position", "Position", "Sets the small multiple titles's position.", ["subheader", 0, "position"], [{"value":"top","label":"Top"},{"value":"bottom","label":"Bottom"}] as const, undefined),
    titleWrap: boolProp("barChart", "sbar.subheader.titleWrap", "Word wrap", "Whether the title wrap is turned on.", ["subheader", 0, "titleWrap"], undefined),
    underline: boolProp("barChart", "sbar.subheader.underline", "Underline", "Whether the small multiple titles's text is underlined.", ["subheader", 0, "underline"], undefined),
  },

  layout: {
    ribbonGapSize: numberProp("barChart", "sbar.layout.ribbonGapSize", "Space between ribbons and columns", "Sets the ribbon gap's space between ribbons and columns.", ["layout", 0, "ribbonGapSize"], 0, 50, undefined),
    seriesOrderReversed: boolProp("barChart", "sbar.layout.seriesOrderReversed", "Reverse order", "Reverse the series order of your bars or columns.", ["layout", 0, "seriesOrderReversed"], undefined),
    seriesOrderSorted: boolProp("barChart", "sbar.layout.seriesOrderSorted", "Sort by value", "Within each category, dynamically sort series by their data value.", ["layout", 0, "seriesOrderSorted"], undefined),
    stackedGapExplodes: boolProp("barChart", "sbar.layout.stackedGapExplodes", "Series explosion", "Whether the stacked gap explodes is turned on.", ["layout", 0, "stackedGapExplodes"], undefined),
    stackedGapSize: numberProp("barChart", "sbar.layout.stackedGapSize", "Space between series", "Sets the stacked gap's space between series.", ["layout", 0, "stackedGapSize"], 0, 50, undefined),
  },
} as const;

export type ResolvedStackedBarChartStyle = {
  dataPoint: {
    borderColor: string;
    borderColorMatchFill: boolean;
    borderOutlineOnly: boolean;
    borderShow: boolean;
    borderSize: number;
    borderTransparency: number;
    defaultColor: string;
    fill: string;
    fillTransparency: number;
  };
  categoryAxis: {
    show: boolean;
    axisStyle: string | number;
    axisType: string | number;
    bold: boolean;
    concatenateLabels: boolean;
    end: string;
    fontFamily: string;
    fontSize: number;
    innerPadding: number;
    invertAxis: boolean;
    italic: boolean;
    labelColor: string;
    labelDisplayUnits: string | number;
    labelPrecision: number;
    logAxisScale: boolean;
    maxMarginFactor: number;
    preferredCategoryWidth: number;
    roundRange: boolean;
    showAxisTitle: boolean;
    start: string;
    switchAxisPosition: boolean;
    underline: boolean;
    gridlineAutoScale: boolean;
    gridlineColor: string;
    gridlineDashArray: string;
    gridlineDashCap: string | number;
    gridlineShow: boolean;
    gridlineStyle: string | number;
    gridlineThickness: number;
    gridlineTransparency: number;
    titleBold: boolean;
    titleColor: string;
    titleFontFamily: string;
    titleFontSize: number;
    titleItalic: boolean;
    titleText: string;
    titleUnderline: boolean;
  };
  valueAxis: {
    show: boolean;
    axisStyle: string | number;
    bold: boolean;
    end: string;
    fontFamily: string;
    fontSize: number;
    invertAxis: boolean;
    italic: boolean;
    labelColor: string;
    labelDisplayUnits: string | number;
    labelPrecision: number;
    logAxisScale: boolean;
    roundRange: boolean;
    scaleToFit: boolean;
    sharedAxis: boolean;
    showAxisTitle: boolean;
    start: string;
    switchAxisPosition: boolean;
    underline: boolean;
    gridlineAutoScale: boolean;
    gridlineColor: string;
    gridlineDashArray: string;
    gridlineDashCap: string | number;
    gridlineShow: boolean;
    gridlineStyle: string | number;
    gridlineThickness: number;
    gridlineTransparency: number;
    titleBold: boolean;
    titleColor: string;
    titleFontFamily: string;
    titleFontSize: number;
    titleItalic: boolean;
    titleText: string;
    titleUnderline: boolean;
  };
  legend: {
    show: boolean;
    bold: boolean;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    labelColor: string;
    position: string | number;
    showGradientLegend: boolean;
    underline: boolean;
    showTitle: boolean;
    titleText: string;
  };
  labels: {
    show: boolean;
    backgroundColor: string;
    backgroundTransparency: number;
    enableBackground: boolean;
    bold: boolean;
    color: string;
    enableDetailDataLabel: boolean;
    enableTitleDataLabel: boolean;
    enableValueDataLabel: boolean;
    fontFamily: string;
    fontSize: number;
    horizontalAlignment: string | number;
    italic: boolean;
    labelContainerMaxWidth: number;
    labelContentLayout: string | number;
    labelDensity: number;
    labelDisplayUnits: string | number;
    labelOrientation: string | number;
    labelOverflow: boolean;
    labelPosition: string | number;
    labelPrecision: number;
    optimizeLabelDisplay: boolean;
    showAll: boolean;
    showBlankAs: string;
    showByDefault: boolean;
    showDynamicLabels: boolean;
    showSeries: boolean;
    transparency: number;
    underline: boolean;
    valueCustomFormatString: string;
    valueFormatString: string;
    wordWrap: boolean;
    detailBold: boolean;
    detailColor: string;
    detailContentType: string | number;
    detailCustomFormatString: string;
    detailFontFamily: string;
    detailFontSize: number;
    detailFormatString: string;
    detailItalic: boolean;
    detailLabelDisplayUnits: string | number;
    detailLabelPrecision: number;
    detailShowBlankAs: string;
    detailTransparency: number;
    detailUnderline: boolean;
    titleBold: boolean;
    titleColor: string;
    titleContentType: string | number;
    titleCustomFormatString: string;
    titleFontFamily: string;
    titleFontSize: number;
    titleFormatString: string;
    titleItalic: boolean;
    titleLabelDisplayUnits: string | number;
    titleLabelPrecision: number;
    titleShowBlankAs: string;
    titleTransparency: number;
    titleUnderline: boolean;
  };
  plotArea: {
    transparency: number;
  };
  error: {
    enabled: boolean;
    barBorderColor: string;
    barBorderSize: number;
    barColor: string;
    barMatchSeriesColor: boolean;
    barShow: boolean;
    barWidth: number;
    labelBackground: boolean;
    labelBackgroundColor: string;
    labelBackgroundTransparency: number;
    labelBold: boolean;
    labelColor: string;
    labelFontFamily: string;
    labelFontSize: number;
    labelFormat: string | number;
    labelItalic: boolean;
    labelMatchSeriesColor: boolean;
    labelShow: boolean;
    labelUnderline: boolean;
    markerShape: string | number;
    markerShow: boolean;
    markerSize: number;
    tooltipFormat: string | number;
    tooltipShow: boolean;
  };
  trend: {
    show: boolean;
    autoScale: boolean;
    combineSeries: boolean;
    dashArray: string;
    dashCap: string | number;
    displayName: string;
    lineColor: string;
    style: string | number;
    transparency: number;
    useHighlightValues: boolean;
    width: number;
  };
  ribbonBands: {
    show: boolean;
    fillColor: string;
    fillMatchColor: boolean;
    fillTransparency: number;
    borderColor: string;
    borderColorMatchFill: boolean;
    borderShow: boolean;
    borderSize: number;
    borderTransparency: number;
  };
  totals: {
    show: boolean;
    bold: boolean;
    color: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    labelDisplayUnits: string | number;
    labelPrecision: number;
    showPositiveAndNegative: boolean;
    underline: boolean;
    backgroundColor: string;
    backgroundTransparency: number;
    enableBackground: boolean;
  };
  xAxisReferenceLine: {
    show: boolean;
    autoScale: boolean;
    dashArray: string;
    dashCap: string | number;
    displayName: string;
    lineColor: string;
    position: string | number;
    style: string | number;
    transparency: number;
    value: string;
    width: number;
    dataLabelColor: string;
    dataLabelDecimalPoints: number;
    dataLabelDisplayUnits: string | number;
    dataLabelHorizontalPosition: string | number;
    dataLabelShow: boolean;
    dataLabelText: string | number;
    dataLabelVerticalPosition: string | number;
    shadeColor: string;
    shadeColorMatchStroke: boolean;
    shadeRegion: string | number;
    shadeShow: boolean;
    shadeTransparency: number;
  };
  y1AxisReferenceLine: {
    show: boolean;
    autoScale: boolean;
    dashArray: string;
    dashCap: string | number;
    displayName: string;
    lineColor: string;
    position: string | number;
    style: string | number;
    transparency: number;
    value: number;
    width: number;
    dataLabelColor: string;
    dataLabelDecimalPoints: number;
    dataLabelDisplayUnits: string | number;
    dataLabelHorizontalPosition: string | number;
    dataLabelShow: boolean;
    dataLabelText: string | number;
    dataLabelVerticalPosition: string | number;
    shadeColor: string;
    shadeColorMatchStroke: boolean;
    shadeRegion: string | number;
    shadeShow: boolean;
    shadeTransparency: number;
  };
  zoom: {
    show: boolean;
    showLabels: boolean;
    showOnCategoryAxis: boolean;
    showOnValueAxis: boolean;
    showTooltip: boolean;
    categoryMax: number;
    categoryMin: number;
    categorySize: number;
    valueMax: number;
    valueMin: number;
    valueSize: number;
  };
  smallMultiplesLayout: {
    advancedPaddingOptions: boolean;
    columnCount: number;
    columnPaddingInner: number;
    columnPaddingOuter: number;
    layoutType: string | number;
    rowCount: number;
    rowPaddingInner: number;
    rowPaddingOuter: number;
    backgroundColor: string;
    backgroundTransparency: number;
    gridLineColor: string;
    gridLineShow: boolean;
    gridLineStyle: string | number;
    gridLineTransparency: number;
    gridLineType: string | number;
    gridLineWidth: number;
    gridPadding: number;
  };
  subheader: {
    show: boolean;
    alignment: string | number;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    position: string | number;
    titleWrap: boolean;
    underline: boolean;
  };
  layout: {
    ribbonGapSize: number;
    seriesOrderReversed: boolean;
    seriesOrderSorted: boolean;
    stackedGapExplodes: boolean;
    stackedGapSize: number;
  };
};

/**
 * Resolves every StackedBarChart property to its theme override, falling
 * back to the shared theme tokens (palette/background/foreground) for
 * colour-like fields and a plain Power BI-typical default otherwise.
 */
export function resolveStackedBarChartStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedStackedBarChartStyle {
  const p = STACKED_BAR_CHART_PROPERTIES;
  return {
    dataPoint: {
      borderColor: resolvePropertyValue(theme, p.dataPoint.borderColor, "#E3E3E3"),
      borderColorMatchFill: resolvePropertyValue(theme, p.dataPoint.borderColorMatchFill, false),
      borderOutlineOnly: resolvePropertyValue(theme, p.dataPoint.borderOutlineOnly, false),
      borderShow: resolvePropertyValue(theme, p.dataPoint.borderShow, false),
      borderSize: resolvePropertyValue(theme, p.dataPoint.borderSize, 1),
      borderTransparency: resolvePropertyValue(theme, p.dataPoint.borderTransparency, 0),
      defaultColor: resolvePropertyValue(theme, p.dataPoint.defaultColor, base.palette[0] ?? base.foreground),
      fill: resolvePropertyValue(theme, p.dataPoint.fill, base.palette[0] ?? base.foreground),
      fillTransparency: resolvePropertyValue(theme, p.dataPoint.fillTransparency, 0),
    },
    categoryAxis: {
      show: resolvePropertyValue(theme, p.categoryAxis.show, true),
      axisStyle: resolvePropertyValue(theme, p.categoryAxis.axisStyle, "showTitleOnly"),
      axisType: resolvePropertyValue(theme, p.categoryAxis.axisType, "Scalar"),
      bold: resolvePropertyValue(theme, p.categoryAxis.bold, false),
      concatenateLabels: resolvePropertyValue(theme, p.categoryAxis.concatenateLabels, false),
      end: resolvePropertyValue(theme, p.categoryAxis.end, ""),
      fontFamily: resolvePropertyValue(theme, p.categoryAxis.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.categoryAxis.fontSize, 6),
      innerPadding: resolvePropertyValue(theme, p.categoryAxis.innerPadding, 10),
      invertAxis: resolvePropertyValue(theme, p.categoryAxis.invertAxis, false),
      italic: resolvePropertyValue(theme, p.categoryAxis.italic, false),
      labelColor: resolvePropertyValue(theme, p.categoryAxis.labelColor, base.foreground),
      labelDisplayUnits: resolvePropertyValue(theme, p.categoryAxis.labelDisplayUnits, 0),
      labelPrecision: resolvePropertyValue(theme, p.categoryAxis.labelPrecision, 0),
      logAxisScale: resolvePropertyValue(theme, p.categoryAxis.logAxisScale, false),
      maxMarginFactor: resolvePropertyValue(theme, p.categoryAxis.maxMarginFactor, 10),
      preferredCategoryWidth: resolvePropertyValue(theme, p.categoryAxis.preferredCategoryWidth, 1),
      roundRange: resolvePropertyValue(theme, p.categoryAxis.roundRange, false),
      showAxisTitle: resolvePropertyValue(theme, p.categoryAxis.showAxisTitle, false),
      start: resolvePropertyValue(theme, p.categoryAxis.start, ""),
      switchAxisPosition: resolvePropertyValue(theme, p.categoryAxis.switchAxisPosition, false),
      underline: resolvePropertyValue(theme, p.categoryAxis.underline, false),
      gridlineAutoScale: resolvePropertyValue(theme, p.categoryAxis.gridlineAutoScale, false),
      gridlineColor: resolvePropertyValue(theme, p.categoryAxis.gridlineColor, "#E3E3E3"),
      gridlineDashArray: resolvePropertyValue(theme, p.categoryAxis.gridlineDashArray, ""),
      gridlineDashCap: resolvePropertyValue(theme, p.categoryAxis.gridlineDashCap, "none"),
      gridlineShow: resolvePropertyValue(theme, p.categoryAxis.gridlineShow, false),
      gridlineStyle: resolvePropertyValue(theme, p.categoryAxis.gridlineStyle, "solid"),
      gridlineThickness: resolvePropertyValue(theme, p.categoryAxis.gridlineThickness, 1),
      gridlineTransparency: resolvePropertyValue(theme, p.categoryAxis.gridlineTransparency, 0),
      titleBold: resolvePropertyValue(theme, p.categoryAxis.titleBold, false),
      titleColor: resolvePropertyValue(theme, p.categoryAxis.titleColor, base.foreground),
      titleFontFamily: resolvePropertyValue(theme, p.categoryAxis.titleFontFamily, ""),
      titleFontSize: resolvePropertyValue(theme, p.categoryAxis.titleFontSize, 6),
      titleItalic: resolvePropertyValue(theme, p.categoryAxis.titleItalic, false),
      titleText: resolvePropertyValue(theme, p.categoryAxis.titleText, ""),
      titleUnderline: resolvePropertyValue(theme, p.categoryAxis.titleUnderline, false),
    },
    valueAxis: {
      show: resolvePropertyValue(theme, p.valueAxis.show, true),
      axisStyle: resolvePropertyValue(theme, p.valueAxis.axisStyle, "showTitleOnly"),
      bold: resolvePropertyValue(theme, p.valueAxis.bold, false),
      end: resolvePropertyValue(theme, p.valueAxis.end, ""),
      fontFamily: resolvePropertyValue(theme, p.valueAxis.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.valueAxis.fontSize, 6),
      invertAxis: resolvePropertyValue(theme, p.valueAxis.invertAxis, false),
      italic: resolvePropertyValue(theme, p.valueAxis.italic, false),
      labelColor: resolvePropertyValue(theme, p.valueAxis.labelColor, base.foreground),
      labelDisplayUnits: resolvePropertyValue(theme, p.valueAxis.labelDisplayUnits, 0),
      labelPrecision: resolvePropertyValue(theme, p.valueAxis.labelPrecision, 0),
      logAxisScale: resolvePropertyValue(theme, p.valueAxis.logAxisScale, false),
      roundRange: resolvePropertyValue(theme, p.valueAxis.roundRange, false),
      scaleToFit: resolvePropertyValue(theme, p.valueAxis.scaleToFit, false),
      sharedAxis: resolvePropertyValue(theme, p.valueAxis.sharedAxis, false),
      showAxisTitle: resolvePropertyValue(theme, p.valueAxis.showAxisTitle, false),
      start: resolvePropertyValue(theme, p.valueAxis.start, ""),
      switchAxisPosition: resolvePropertyValue(theme, p.valueAxis.switchAxisPosition, false),
      underline: resolvePropertyValue(theme, p.valueAxis.underline, false),
      gridlineAutoScale: resolvePropertyValue(theme, p.valueAxis.gridlineAutoScale, false),
      gridlineColor: resolvePropertyValue(theme, p.valueAxis.gridlineColor, "#E3E3E3"),
      gridlineDashArray: resolvePropertyValue(theme, p.valueAxis.gridlineDashArray, ""),
      gridlineDashCap: resolvePropertyValue(theme, p.valueAxis.gridlineDashCap, "none"),
      // Power BI draws value-axis gridlines on a new visual by default,
      // so a preview that hides them does not match an unstyled chart.
      gridlineShow: resolvePropertyValue(theme, p.valueAxis.gridlineShow, true),
      gridlineStyle: resolvePropertyValue(theme, p.valueAxis.gridlineStyle, "solid"),
      gridlineThickness: resolvePropertyValue(theme, p.valueAxis.gridlineThickness, 1),
      gridlineTransparency: resolvePropertyValue(theme, p.valueAxis.gridlineTransparency, 0),
      titleBold: resolvePropertyValue(theme, p.valueAxis.titleBold, false),
      titleColor: resolvePropertyValue(theme, p.valueAxis.titleColor, base.foreground),
      titleFontFamily: resolvePropertyValue(theme, p.valueAxis.titleFontFamily, ""),
      titleFontSize: resolvePropertyValue(theme, p.valueAxis.titleFontSize, 6),
      titleItalic: resolvePropertyValue(theme, p.valueAxis.titleItalic, false),
      titleText: resolvePropertyValue(theme, p.valueAxis.titleText, ""),
      titleUnderline: resolvePropertyValue(theme, p.valueAxis.titleUnderline, false),
    },
    legend: {
      show: resolvePropertyValue(theme, p.legend.show, true),
      bold: resolvePropertyValue(theme, p.legend.bold, false),
      fontFamily: resolvePropertyValue(theme, p.legend.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.legend.fontSize, 6),
      italic: resolvePropertyValue(theme, p.legend.italic, false),
      labelColor: resolvePropertyValue(theme, p.legend.labelColor, base.foreground),
      position: resolvePropertyValue(theme, p.legend.position, "Top"),
      showGradientLegend: resolvePropertyValue(theme, p.legend.showGradientLegend, false),
      underline: resolvePropertyValue(theme, p.legend.underline, false),
      showTitle: resolvePropertyValue(theme, p.legend.showTitle, false),
      titleText: resolvePropertyValue(theme, p.legend.titleText, ""),
    },
    labels: {
      show: resolvePropertyValue(theme, p.labels.show, false),
      backgroundColor: resolvePropertyValue(theme, p.labels.backgroundColor, base.background),
      backgroundTransparency: resolvePropertyValue(theme, p.labels.backgroundTransparency, 0),
      enableBackground: resolvePropertyValue(theme, p.labels.enableBackground, false),
      bold: resolvePropertyValue(theme, p.labels.bold, false),
      color: resolvePropertyValue(theme, p.labels.color, base.palette[0] ?? base.foreground),
      enableDetailDataLabel: resolvePropertyValue(theme, p.labels.enableDetailDataLabel, false),
      enableTitleDataLabel: resolvePropertyValue(theme, p.labels.enableTitleDataLabel, false),
      enableValueDataLabel: resolvePropertyValue(theme, p.labels.enableValueDataLabel, false),
      fontFamily: resolvePropertyValue(theme, p.labels.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.labels.fontSize, 6),
      horizontalAlignment: resolvePropertyValue(theme, p.labels.horizontalAlignment, "left"),
      italic: resolvePropertyValue(theme, p.labels.italic, false),
      labelContainerMaxWidth: resolvePropertyValue(theme, p.labels.labelContainerMaxWidth, 1),
      labelContentLayout: resolvePropertyValue(theme, p.labels.labelContentLayout, "MultiLine"),
      labelDensity: resolvePropertyValue(theme, p.labels.labelDensity, 0),
      labelDisplayUnits: resolvePropertyValue(theme, p.labels.labelDisplayUnits, 0),
      labelOrientation: resolvePropertyValue(theme, p.labels.labelOrientation, 0),
      labelOverflow: resolvePropertyValue(theme, p.labels.labelOverflow, false),
      labelPosition: resolvePropertyValue(theme, p.labels.labelPosition, "Auto"),
      labelPrecision: resolvePropertyValue(theme, p.labels.labelPrecision, 0),
      optimizeLabelDisplay: resolvePropertyValue(theme, p.labels.optimizeLabelDisplay, false),
      showAll: resolvePropertyValue(theme, p.labels.showAll, false),
      showBlankAs: resolvePropertyValue(theme, p.labels.showBlankAs, ""),
      showByDefault: resolvePropertyValue(theme, p.labels.showByDefault, false),
      showDynamicLabels: resolvePropertyValue(theme, p.labels.showDynamicLabels, false),
      showSeries: resolvePropertyValue(theme, p.labels.showSeries, false),
      transparency: resolvePropertyValue(theme, p.labels.transparency, 0),
      underline: resolvePropertyValue(theme, p.labels.underline, false),
      valueCustomFormatString: resolvePropertyValue(theme, p.labels.valueCustomFormatString, ""),
      valueFormatString: resolvePropertyValue(theme, p.labels.valueFormatString, ""),
      wordWrap: resolvePropertyValue(theme, p.labels.wordWrap, false),
      detailBold: resolvePropertyValue(theme, p.labels.detailBold, false),
      detailColor: resolvePropertyValue(theme, p.labels.detailColor, base.palette[0] ?? base.foreground),
      detailContentType: resolvePropertyValue(theme, p.labels.detailContentType, "Percent of total"),
      detailCustomFormatString: resolvePropertyValue(theme, p.labels.detailCustomFormatString, ""),
      detailFontFamily: resolvePropertyValue(theme, p.labels.detailFontFamily, ""),
      detailFontSize: resolvePropertyValue(theme, p.labels.detailFontSize, 6),
      detailFormatString: resolvePropertyValue(theme, p.labels.detailFormatString, ""),
      detailItalic: resolvePropertyValue(theme, p.labels.detailItalic, false),
      detailLabelDisplayUnits: resolvePropertyValue(theme, p.labels.detailLabelDisplayUnits, 0),
      detailLabelPrecision: resolvePropertyValue(theme, p.labels.detailLabelPrecision, 0),
      detailShowBlankAs: resolvePropertyValue(theme, p.labels.detailShowBlankAs, ""),
      detailTransparency: resolvePropertyValue(theme, p.labels.detailTransparency, 0),
      detailUnderline: resolvePropertyValue(theme, p.labels.detailUnderline, false),
      titleBold: resolvePropertyValue(theme, p.labels.titleBold, false),
      titleColor: resolvePropertyValue(theme, p.labels.titleColor, base.foreground),
      titleContentType: resolvePropertyValue(theme, p.labels.titleContentType, "Series name"),
      titleCustomFormatString: resolvePropertyValue(theme, p.labels.titleCustomFormatString, ""),
      titleFontFamily: resolvePropertyValue(theme, p.labels.titleFontFamily, ""),
      titleFontSize: resolvePropertyValue(theme, p.labels.titleFontSize, 6),
      titleFormatString: resolvePropertyValue(theme, p.labels.titleFormatString, ""),
      titleItalic: resolvePropertyValue(theme, p.labels.titleItalic, false),
      titleLabelDisplayUnits: resolvePropertyValue(theme, p.labels.titleLabelDisplayUnits, 0),
      titleLabelPrecision: resolvePropertyValue(theme, p.labels.titleLabelPrecision, 0),
      titleShowBlankAs: resolvePropertyValue(theme, p.labels.titleShowBlankAs, ""),
      titleTransparency: resolvePropertyValue(theme, p.labels.titleTransparency, 0),
      titleUnderline: resolvePropertyValue(theme, p.labels.titleUnderline, false),
    },
    plotArea: {
      transparency: resolvePropertyValue(theme, p.plotArea.transparency, 0),
    },
    error: {
      enabled: resolvePropertyValue(theme, p.error.enabled, false),
      barBorderColor: resolvePropertyValue(theme, p.error.barBorderColor, "#E3E3E3"),
      barBorderSize: resolvePropertyValue(theme, p.error.barBorderSize, 1),
      barColor: resolvePropertyValue(theme, p.error.barColor, base.palette[0] ?? base.foreground),
      barMatchSeriesColor: resolvePropertyValue(theme, p.error.barMatchSeriesColor, false),
      barShow: resolvePropertyValue(theme, p.error.barShow, false),
      barWidth: resolvePropertyValue(theme, p.error.barWidth, 1),
      labelBackground: resolvePropertyValue(theme, p.error.labelBackground, false),
      labelBackgroundColor: resolvePropertyValue(theme, p.error.labelBackgroundColor, base.background),
      labelBackgroundTransparency: resolvePropertyValue(theme, p.error.labelBackgroundTransparency, 0),
      labelBold: resolvePropertyValue(theme, p.error.labelBold, false),
      labelColor: resolvePropertyValue(theme, p.error.labelColor, base.foreground),
      labelFontFamily: resolvePropertyValue(theme, p.error.labelFontFamily, ""),
      labelFontSize: resolvePropertyValue(theme, p.error.labelFontSize, 6),
      labelFormat: resolvePropertyValue(theme, p.error.labelFormat, "absolute"),
      labelItalic: resolvePropertyValue(theme, p.error.labelItalic, false),
      labelMatchSeriesColor: resolvePropertyValue(theme, p.error.labelMatchSeriesColor, false),
      labelShow: resolvePropertyValue(theme, p.error.labelShow, false),
      labelUnderline: resolvePropertyValue(theme, p.error.labelUnderline, false),
      markerShape: resolvePropertyValue(theme, p.error.markerShape, "circle"),
      markerShow: resolvePropertyValue(theme, p.error.markerShow, false),
      markerSize: resolvePropertyValue(theme, p.error.markerSize, 6),
      tooltipFormat: resolvePropertyValue(theme, p.error.tooltipFormat, "absolute"),
      tooltipShow: resolvePropertyValue(theme, p.error.tooltipShow, false),
    },
    trend: {
      show: resolvePropertyValue(theme, p.trend.show, false),
      autoScale: resolvePropertyValue(theme, p.trend.autoScale, false),
      combineSeries: resolvePropertyValue(theme, p.trend.combineSeries, false),
      dashArray: resolvePropertyValue(theme, p.trend.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.trend.dashCap, "none"),
      displayName: resolvePropertyValue(theme, p.trend.displayName, ""),
      lineColor: resolvePropertyValue(theme, p.trend.lineColor, base.palette[0] ?? base.foreground),
      style: resolvePropertyValue(theme, p.trend.style, "solid"),
      transparency: resolvePropertyValue(theme, p.trend.transparency, 0),
      useHighlightValues: resolvePropertyValue(theme, p.trend.useHighlightValues, false),
      width: resolvePropertyValue(theme, p.trend.width, 1),
    },
    ribbonBands: {
      show: resolvePropertyValue(theme, p.ribbonBands.show, false),
      fillColor: resolvePropertyValue(theme, p.ribbonBands.fillColor, base.palette[0] ?? base.foreground),
      fillMatchColor: resolvePropertyValue(theme, p.ribbonBands.fillMatchColor, false),
      fillTransparency: resolvePropertyValue(theme, p.ribbonBands.fillTransparency, 0),
      borderColor: resolvePropertyValue(theme, p.ribbonBands.borderColor, "#E3E3E3"),
      borderColorMatchFill: resolvePropertyValue(theme, p.ribbonBands.borderColorMatchFill, false),
      borderShow: resolvePropertyValue(theme, p.ribbonBands.borderShow, false),
      borderSize: resolvePropertyValue(theme, p.ribbonBands.borderSize, 1),
      borderTransparency: resolvePropertyValue(theme, p.ribbonBands.borderTransparency, 0),
    },
    totals: {
      show: resolvePropertyValue(theme, p.totals.show, false),
      bold: resolvePropertyValue(theme, p.totals.bold, false),
      color: resolvePropertyValue(theme, p.totals.color, base.palette[0] ?? base.foreground),
      fontFamily: resolvePropertyValue(theme, p.totals.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.totals.fontSize, 6),
      italic: resolvePropertyValue(theme, p.totals.italic, false),
      labelDisplayUnits: resolvePropertyValue(theme, p.totals.labelDisplayUnits, 0),
      labelPrecision: resolvePropertyValue(theme, p.totals.labelPrecision, 0),
      showPositiveAndNegative: resolvePropertyValue(theme, p.totals.showPositiveAndNegative, false),
      underline: resolvePropertyValue(theme, p.totals.underline, false),
      backgroundColor: resolvePropertyValue(theme, p.totals.backgroundColor, base.background),
      backgroundTransparency: resolvePropertyValue(theme, p.totals.backgroundTransparency, 0),
      enableBackground: resolvePropertyValue(theme, p.totals.enableBackground, false),
    },
    xAxisReferenceLine: {
      show: resolvePropertyValue(theme, p.xAxisReferenceLine.show, false),
      autoScale: resolvePropertyValue(theme, p.xAxisReferenceLine.autoScale, false),
      dashArray: resolvePropertyValue(theme, p.xAxisReferenceLine.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.xAxisReferenceLine.dashCap, "none"),
      displayName: resolvePropertyValue(theme, p.xAxisReferenceLine.displayName, ""),
      lineColor: resolvePropertyValue(theme, p.xAxisReferenceLine.lineColor, base.palette[0] ?? base.foreground),
      position: resolvePropertyValue(theme, p.xAxisReferenceLine.position, "back"),
      style: resolvePropertyValue(theme, p.xAxisReferenceLine.style, "solid"),
      transparency: resolvePropertyValue(theme, p.xAxisReferenceLine.transparency, 0),
      value: resolvePropertyValue(theme, p.xAxisReferenceLine.value, ""),
      width: resolvePropertyValue(theme, p.xAxisReferenceLine.width, 1),
      dataLabelColor: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelColor, base.foreground),
      dataLabelDecimalPoints: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelDecimalPoints, 0),
      dataLabelDisplayUnits: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelDisplayUnits, 0),
      dataLabelHorizontalPosition: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelHorizontalPosition, "left"),
      dataLabelShow: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelShow, false),
      dataLabelText: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelText, "Value"),
      dataLabelVerticalPosition: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelVerticalPosition, "above"),
      shadeColor: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeColor, "#E3E3E3"),
      shadeColorMatchStroke: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeColorMatchStroke, false),
      shadeRegion: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeRegion, "before"),
      shadeShow: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeShow, false),
      shadeTransparency: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeTransparency, 0),
    },
    y1AxisReferenceLine: {
      show: resolvePropertyValue(theme, p.y1AxisReferenceLine.show, false),
      autoScale: resolvePropertyValue(theme, p.y1AxisReferenceLine.autoScale, false),
      dashArray: resolvePropertyValue(theme, p.y1AxisReferenceLine.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.y1AxisReferenceLine.dashCap, "none"),
      displayName: resolvePropertyValue(theme, p.y1AxisReferenceLine.displayName, ""),
      lineColor: resolvePropertyValue(theme, p.y1AxisReferenceLine.lineColor, base.palette[0] ?? base.foreground),
      position: resolvePropertyValue(theme, p.y1AxisReferenceLine.position, "back"),
      style: resolvePropertyValue(theme, p.y1AxisReferenceLine.style, "solid"),
      transparency: resolvePropertyValue(theme, p.y1AxisReferenceLine.transparency, 0),
      value: resolvePropertyValue(theme, p.y1AxisReferenceLine.value, 0),
      width: resolvePropertyValue(theme, p.y1AxisReferenceLine.width, 1),
      dataLabelColor: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelColor, base.foreground),
      dataLabelDecimalPoints: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelDecimalPoints, 0),
      dataLabelDisplayUnits: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelDisplayUnits, 0),
      dataLabelHorizontalPosition: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelHorizontalPosition, "left"),
      dataLabelShow: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelShow, false),
      dataLabelText: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelText, "Value"),
      dataLabelVerticalPosition: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelVerticalPosition, "above"),
      shadeColor: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeColor, "#E3E3E3"),
      shadeColorMatchStroke: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeColorMatchStroke, false),
      shadeRegion: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeRegion, "before"),
      shadeShow: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeShow, false),
      shadeTransparency: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeTransparency, 0),
    },
    zoom: {
      show: resolvePropertyValue(theme, p.zoom.show, false),
      showLabels: resolvePropertyValue(theme, p.zoom.showLabels, false),
      showOnCategoryAxis: resolvePropertyValue(theme, p.zoom.showOnCategoryAxis, false),
      showOnValueAxis: resolvePropertyValue(theme, p.zoom.showOnValueAxis, false),
      showTooltip: resolvePropertyValue(theme, p.zoom.showTooltip, false),
      categoryMax: resolvePropertyValue(theme, p.zoom.categoryMax, 0),
      categoryMin: resolvePropertyValue(theme, p.zoom.categoryMin, 0),
      categorySize: resolvePropertyValue(theme, p.zoom.categorySize, 6),
      valueMax: resolvePropertyValue(theme, p.zoom.valueMax, 0),
      valueMin: resolvePropertyValue(theme, p.zoom.valueMin, 0),
      valueSize: resolvePropertyValue(theme, p.zoom.valueSize, 6),
    },
    smallMultiplesLayout: {
      advancedPaddingOptions: resolvePropertyValue(theme, p.smallMultiplesLayout.advancedPaddingOptions, false),
      columnCount: resolvePropertyValue(theme, p.smallMultiplesLayout.columnCount, 2),
      columnPaddingInner: resolvePropertyValue(theme, p.smallMultiplesLayout.columnPaddingInner, 10),
      columnPaddingOuter: resolvePropertyValue(theme, p.smallMultiplesLayout.columnPaddingOuter, 10),
      layoutType: resolvePropertyValue(theme, p.smallMultiplesLayout.layoutType, "auto"),
      rowCount: resolvePropertyValue(theme, p.smallMultiplesLayout.rowCount, 2),
      rowPaddingInner: resolvePropertyValue(theme, p.smallMultiplesLayout.rowPaddingInner, 10),
      rowPaddingOuter: resolvePropertyValue(theme, p.smallMultiplesLayout.rowPaddingOuter, 10),
      backgroundColor: resolvePropertyValue(theme, p.smallMultiplesLayout.backgroundColor, base.background),
      backgroundTransparency: resolvePropertyValue(theme, p.smallMultiplesLayout.backgroundTransparency, 0),
      gridLineColor: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineColor, "#E3E3E3"),
      gridLineShow: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineShow, false),
      gridLineStyle: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineStyle, "solid"),
      gridLineTransparency: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineTransparency, 0),
      gridLineType: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineType, "all"),
      gridLineWidth: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineWidth, 1),
      gridPadding: resolvePropertyValue(theme, p.smallMultiplesLayout.gridPadding, 10),
    },
    subheader: {
      show: resolvePropertyValue(theme, p.subheader.show, false),
      alignment: resolvePropertyValue(theme, p.subheader.alignment, "left"),
      bold: resolvePropertyValue(theme, p.subheader.bold, false),
      fontColor: resolvePropertyValue(theme, p.subheader.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.subheader.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.subheader.fontSize, 6),
      italic: resolvePropertyValue(theme, p.subheader.italic, false),
      position: resolvePropertyValue(theme, p.subheader.position, "top"),
      titleWrap: resolvePropertyValue(theme, p.subheader.titleWrap, false),
      underline: resolvePropertyValue(theme, p.subheader.underline, false),
    },
    layout: {
      ribbonGapSize: resolvePropertyValue(theme, p.layout.ribbonGapSize, 6),
      seriesOrderReversed: resolvePropertyValue(theme, p.layout.seriesOrderReversed, false),
      seriesOrderSorted: resolvePropertyValue(theme, p.layout.seriesOrderSorted, false),
      stackedGapExplodes: resolvePropertyValue(theme, p.layout.stackedGapExplodes, false),
      stackedGapSize: resolvePropertyValue(theme, p.layout.stackedGapSize, 6),
    },
  };
}

export { propertyThemePath };
