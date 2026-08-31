import type { ThemeSource } from "./properties";
import {
  boolProp,
  colorProp,
  enumProp,
  numberProp,
  propertyThemePath,
  resolvePropertyValue,
  textProp,
  isGroupSetBy,
} from "./properties";
import { effectiveFontFamily } from "./fontFamilies";
import { CATEGORY_INNER_PADDING_DEFAULT } from "./seriesBands";
import { CARTESIAN_NATIVE } from "./cartesianNativeDefaults";
import { nativeToken } from "./nativeTokens";
import { resolveTextRole } from "./textClasses";
import type { ResolvedTheme } from "./theme";

/**
 * Clustered bar chart ("clusteredBarChart") property registry, pinned to
 * Microsoft's published schema reportThemeSchema-2.156.json
 * (microsoft/powerbi-desktop-samples). Grouped exactly as Power BI
 * Desktop's own format pane groups them (Data colors, Y axis, X axis,
 * Legend, Data labels, Plot area, Error bars, Trend line, Constant line x3,
 * Zoom slider, Small multiples grid/title), so the property panel and
 * Microsoft's own UI stay recognisable to each other.
 *
 * Five schema fields are intentionally not covered, all for the same
 * reason as Table's excluded fields: they're either a complex nested rule
 * object rather than a single editable value, or a genuinely polymorphic
 * type this app's simple value model can't represent safely. All still
 * round-trip untouched on import/export.
 * - dataPoint.fillRule (conditional-formatting rule object)
 * - plotArea.image (background image object)
 * - labels.dynamicLabelDetail / dynamicLabelTitle / dynamicLabelValue
 *   (each can hold a string, number, or boolean depending on binding)
 *
 * Shared "visual chrome" groups common to every visual (title, background,
 * border, general, padding, tooltip, visual header, ...) are out of scope
 * here, matching Table's precedent — this registry covers only what's
 * specific to a clustered bar chart.
 */

/**
 * How far a constant line's Value control can be dragged.
 *
 * NOT a schema constraint. Power BI's own Value field is a free numeric
 * input with no documented bound, and a constant line is compared against
 * whatever the measure happens to be. The -1000..1000 that used to sit
 * here is the registry generator's catch-all for a numeric property whose
 * bounds were never derived: 51 properties across these files share that
 * exact pair, including labelDensity, preferredCategoryWidth,
 * interpolationSmoothParam and imageHeight, none of which is genuinely
 * a -1000..1000 quantity either.
 *
 * It matters here because the bound is not just cosmetic: the preview's
 * representative data reaches 82,000, so a control stopping at 1,000 could
 * only move the line across about 1% of the plot — the property was
 * effectively unusable for the thing it exists to show. This spans the
 * preview's domain and a pinned 0..100,000 axis with room either side.
 *
 * Widening a slider cannot corrupt a theme. `NumberControl` writes only
 * what the user drags, and nothing on the read or write path clamps, so an
 * imported value of any magnitude still round-trips verbatim — see
 * `tests/constantLine.test.ts`. The real limitation is that an unbounded
 * numeric property is being edited by a range slider at all; giving those
 * properties a typed numeric input is a separate, wider change.
 */
const REFERENCE_LINE_VALUE_LIMIT = 200_000;

export const BAR_CHART_PROPERTIES = {

  dataPoint: {
    defaultColor: colorProp("clusteredBarChart", "bar.dataPoint.defaultColor", "Default color", "The main colour used for the bars.", ["dataPoint", 0, "defaultColor"], undefined, "Fill"),
    fill: colorProp("clusteredBarChart", "bar.dataPoint.fill", "Fill color", "The main colour used for the bars.", ["dataPoint", 0, "fill"], undefined, "Fill"),
    fillTransparency: numberProp("clusteredBarChart", "bar.dataPoint.fillTransparency", "Transparency", "How see-through the fill appears — 0 is solid, 100 is invisible.", ["dataPoint", 0, "fillTransparency"], 0, 100, undefined, "Fill"),
    borderColor: colorProp("clusteredBarChart", "bar.dataPoint.borderColor", "Border color", "The colour of the border.", ["dataPoint", 0, "borderColor"], undefined, "Border"),
    borderColorMatchFill: boolProp("clusteredBarChart", "bar.dataPoint.borderColorMatchFill", "Match fill color", "Match the border color to the main shape color.", ["dataPoint", 0, "borderColorMatchFill"], undefined, "Border"),
    borderShow: boolProp("clusteredBarChart", "bar.dataPoint.borderShow", "Border", "Whether the border is shown.", ["dataPoint", 0, "borderShow"], undefined, "Border"),
    borderSize: numberProp("clusteredBarChart", "bar.dataPoint.borderSize", "Width", "The thickness, in pixels, of the border.", ["dataPoint", 0, "borderSize"], 0, 10, undefined, "Border"),
    borderTransparency: numberProp("clusteredBarChart", "bar.dataPoint.borderTransparency", "Transparency", "How see-through the border appears — 0 is solid, 100 is invisible.", ["dataPoint", 0, "borderTransparency"], 0, 100, undefined, "Border"),
    borderOutlineOnly: boolProp("clusteredBarChart", "bar.dataPoint.borderOutlineOnly", "Hide inner borders", "Whether the border outline only is turned on.", ["dataPoint", 0, "borderOutlineOnly"], undefined, "Border"),
  },

  categoryAxis: {
    show: boolProp("clusteredBarChart", "bar.categoryAxis.show", "Show", "Whether the category axis is shown.", ["categoryAxis", 0, "show"]),
    axisStyle: enumProp("clusteredBarChart", "bar.categoryAxis.axisStyle", "Style", "Sets the axis's style.", ["categoryAxis", 0, "axisStyle"], [{"value":"showTitleOnly","label":"Show title only"},{"value":"showUnitOnly","label":"Show unit only"},{"value":"showBoth","label":"Show both"}] as const),
    axisType: enumProp("clusteredBarChart", "bar.categoryAxis.axisType", "Type", "Sets the axis type.", ["categoryAxis", 0, "axisType"], [{"value":"Scalar","label":"Continuous"},{"value":"Categorical","label":"Categorical"}] as const),
    bold: boolProp("clusteredBarChart", "bar.categoryAxis.bold", "Bold", "Whether the category axis's text is bold.", ["categoryAxis", 0, "bold"]),
    concatenateLabels: boolProp("clusteredBarChart", "bar.categoryAxis.concatenateLabels", "Concatenate labels", "Always concatenate levels of the hierarchy instead of drawing the hierarchy", ["categoryAxis", 0, "concatenateLabels"]),
    end: textProp("clusteredBarChart", "bar.categoryAxis.end", "End", "Enter an ending value (optional)", ["categoryAxis", 0, "end"]),
    fontFamily: textProp("clusteredBarChart", "bar.categoryAxis.fontFamily", "Font family", "The typeface used for the category axis.", ["categoryAxis", 0, "fontFamily"]),
    fontSize: numberProp("clusteredBarChart", "bar.categoryAxis.fontSize", "Text size", "Sets the category axis's text size.", ["categoryAxis", 0, "fontSize"], 8, 60),
    innerPadding: numberProp("clusteredBarChart", "bar.categoryAxis.innerPadding", "Space between categories", "Space between categories (inner padding) as a percentage of the total category width/height.", ["categoryAxis", 0, "innerPadding"], 0, 50),
    invertAxis: boolProp("clusteredBarChart", "bar.categoryAxis.invertAxis", "Invert axis", "Whether the invert axis is turned on.", ["categoryAxis", 0, "invertAxis"]),
    italic: boolProp("clusteredBarChart", "bar.categoryAxis.italic", "Italic", "Whether the category axis's text is italic.", ["categoryAxis", 0, "italic"]),
    labelColor: colorProp("clusteredBarChart", "bar.categoryAxis.labelColor", "Label color", "The colour of the label.", ["categoryAxis", 0, "labelColor"]),
    labelDisplayUnits: enumProp("clusteredBarChart", "bar.categoryAxis.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["categoryAxis", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const),
    labelPrecision: numberProp("clusteredBarChart", "bar.categoryAxis.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["categoryAxis", 0, "labelPrecision"], 0, 10),
    logAxisScale: boolProp("clusteredBarChart", "bar.categoryAxis.logAxisScale", "Logarithmic scale", "Whether the log axis scale is turned on.", ["categoryAxis", 0, "logAxisScale"]),
    maxMarginFactor: numberProp("clusteredBarChart", "bar.categoryAxis.maxMarginFactor", "Maximum size", "The maximum percent of the visual allowed for the axis", ["categoryAxis", 0, "maxMarginFactor"], 1, 60),
    preferredCategoryWidth: numberProp("clusteredBarChart", "bar.categoryAxis.preferredCategoryWidth", "Minimum category width", "Sets the preferred category width.", ["categoryAxis", 0, "preferredCategoryWidth"], -1000, 1000),
    roundRange: boolProp("clusteredBarChart", "bar.categoryAxis.roundRange", "Round range", "Round range limits to the nearest multiple.", ["categoryAxis", 0, "roundRange"]),
    showAxisTitle: boolProp("clusteredBarChart", "bar.categoryAxis.showAxisTitle", "Title", "Title for the Y-axis", ["categoryAxis", 0, "showAxisTitle"]),
    start: textProp("clusteredBarChart", "bar.categoryAxis.start", "Start", "Enter a starting value (optional)", ["categoryAxis", 0, "start"]),
    switchAxisPosition: boolProp("clusteredBarChart", "bar.categoryAxis.switchAxisPosition", "Switch axis position", "Whether the switch axis position is turned on.", ["categoryAxis", 0, "switchAxisPosition"]),
    underline: boolProp("clusteredBarChart", "bar.categoryAxis.underline", "Underline", "Whether the category axis's text is underlined.", ["categoryAxis", 0, "underline"]),
    gridlineAutoScale: boolProp("clusteredBarChart", "bar.categoryAxis.gridlineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["categoryAxis", 0, "gridlineAutoScale"], undefined, "Gridline"),
    gridlineColor: colorProp("clusteredBarChart", "bar.categoryAxis.gridlineColor", "Color", "The colour of the gridline.", ["categoryAxis", 0, "gridlineColor"], undefined, "Gridline"),
    gridlineDashArray: textProp("clusteredBarChart", "bar.categoryAxis.gridlineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["categoryAxis", 0, "gridlineDashArray"], undefined, "Gridline"),
    gridlineDashCap: enumProp("clusteredBarChart", "bar.categoryAxis.gridlineDashCap", "Dash cap", "Sets the gridline dash cap.", ["categoryAxis", 0, "gridlineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Gridline"),
    gridlineShow: boolProp("clusteredBarChart", "bar.categoryAxis.gridlineShow", "Show", "Whether the gridline is shown.", ["categoryAxis", 0, "gridlineShow"], undefined, "Gridline"),
    gridlineStyle: enumProp("clusteredBarChart", "bar.categoryAxis.gridlineStyle", "Line style", "Sets the gridline's line style.", ["categoryAxis", 0, "gridlineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Gridline"),
    gridlineThickness: numberProp("clusteredBarChart", "bar.categoryAxis.gridlineThickness", "Width", "The thickness, in pixels, of the gridline.", ["categoryAxis", 0, "gridlineThickness"], 0, 10, undefined, "Gridline"),
    gridlineTransparency: numberProp("clusteredBarChart", "bar.categoryAxis.gridlineTransparency", "Transparency", "How see-through the gridline appears — 0 is solid, 100 is invisible.", ["categoryAxis", 0, "gridlineTransparency"], 0, 100, undefined, "Gridline"),
    titleBold: boolProp("clusteredBarChart", "bar.categoryAxis.titleBold", "Bold", "Whether the title is bold.", ["categoryAxis", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("clusteredBarChart", "bar.categoryAxis.titleColor", "Color", "The colour of the title.", ["categoryAxis", 0, "titleColor"], undefined, "Title"),
    titleFontFamily: textProp("clusteredBarChart", "bar.categoryAxis.titleFontFamily", "Font family", "The typeface used for the title.", ["categoryAxis", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("clusteredBarChart", "bar.categoryAxis.titleFontSize", "Title text size", "Sets the title's title text size.", ["categoryAxis", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleItalic: boolProp("clusteredBarChart", "bar.categoryAxis.titleItalic", "Italic", "Whether the title is italic.", ["categoryAxis", 0, "titleItalic"], undefined, "Title"),
    titleText: textProp("clusteredBarChart", "bar.categoryAxis.titleText", "Axis title", "The custom text used for the title.", ["categoryAxis", 0, "titleText"], undefined, "Title"),
    titleUnderline: boolProp("clusteredBarChart", "bar.categoryAxis.titleUnderline", "Underline", "Whether the title is underlined.", ["categoryAxis", 0, "titleUnderline"], undefined, "Title"),
  },

  valueAxis: {
    show: boolProp("clusteredBarChart", "bar.valueAxis.show", "Show", "Whether the value axis is shown.", ["valueAxis", 0, "show"]),
    axisStyle: enumProp("clusteredBarChart", "bar.valueAxis.axisStyle", "Style", "Sets the axis's style.", ["valueAxis", 0, "axisStyle"], [{"value":"showTitleOnly","label":"Show title only"},{"value":"showUnitOnly","label":"Show unit only"},{"value":"showBoth","label":"Show both"}] as const),
    bold: boolProp("clusteredBarChart", "bar.valueAxis.bold", "Bold", "Whether the value axis's text is bold.", ["valueAxis", 0, "bold"]),
    end: textProp("clusteredBarChart", "bar.valueAxis.end", "End", "Enter an ending value (optional)", ["valueAxis", 0, "end"]),
    fontFamily: textProp("clusteredBarChart", "bar.valueAxis.fontFamily", "Font family", "The typeface used for the value axis.", ["valueAxis", 0, "fontFamily"]),
    fontSize: numberProp("clusteredBarChart", "bar.valueAxis.fontSize", "Text size", "Sets the value axis's text size.", ["valueAxis", 0, "fontSize"], 8, 60),
    invertAxis: boolProp("clusteredBarChart", "bar.valueAxis.invertAxis", "Invert axis", "Whether the invert axis is turned on.", ["valueAxis", 0, "invertAxis"]),
    italic: boolProp("clusteredBarChart", "bar.valueAxis.italic", "Italic", "Whether the value axis's text is italic.", ["valueAxis", 0, "italic"]),
    labelColor: colorProp("clusteredBarChart", "bar.valueAxis.labelColor", "Label color", "The colour of the label.", ["valueAxis", 0, "labelColor"]),
    labelDisplayUnits: enumProp("clusteredBarChart", "bar.valueAxis.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["valueAxis", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const),
    labelPrecision: numberProp("clusteredBarChart", "bar.valueAxis.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["valueAxis", 0, "labelPrecision"], 0, 10),
    logAxisScale: boolProp("clusteredBarChart", "bar.valueAxis.logAxisScale", "Logarithmic scale", "Whether the log axis scale is turned on.", ["valueAxis", 0, "logAxisScale"]),
    roundRange: boolProp("clusteredBarChart", "bar.valueAxis.roundRange", "Round range", "Round range limits to the nearest multiple.", ["valueAxis", 0, "roundRange"]),
    scaleToFit: boolProp("clusteredBarChart", "bar.valueAxis.scaleToFit", "Scale to fit", "Whether the scale to fit is turned on.", ["valueAxis", 0, "scaleToFit"]),
    sharedAxis: boolProp("clusteredBarChart", "bar.valueAxis.sharedAxis", "Shared y-axis", "Whether the shared axis is turned on.", ["valueAxis", 0, "sharedAxis"]),
    showAxisTitle: boolProp("clusteredBarChart", "bar.valueAxis.showAxisTitle", "Title", "Title for the X-axis", ["valueAxis", 0, "showAxisTitle"]),
    start: textProp("clusteredBarChart", "bar.valueAxis.start", "Start", "Enter a starting value (optional)", ["valueAxis", 0, "start"]),
    switchAxisPosition: boolProp("clusteredBarChart", "bar.valueAxis.switchAxisPosition", "Switch axis position", "Whether the switch axis position is turned on.", ["valueAxis", 0, "switchAxisPosition"]),
    underline: boolProp("clusteredBarChart", "bar.valueAxis.underline", "Underline", "Whether the value axis's text is underlined.", ["valueAxis", 0, "underline"]),
    gridlineAutoScale: boolProp("clusteredBarChart", "bar.valueAxis.gridlineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["valueAxis", 0, "gridlineAutoScale"], undefined, "Gridline"),
    gridlineColor: colorProp("clusteredBarChart", "bar.valueAxis.gridlineColor", "Color", "The colour of the gridline.", ["valueAxis", 0, "gridlineColor"], undefined, "Gridline"),
    gridlineDashArray: textProp("clusteredBarChart", "bar.valueAxis.gridlineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["valueAxis", 0, "gridlineDashArray"], undefined, "Gridline"),
    gridlineDashCap: enumProp("clusteredBarChart", "bar.valueAxis.gridlineDashCap", "Dash cap", "Sets the gridline dash cap.", ["valueAxis", 0, "gridlineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Gridline"),
    gridlineShow: boolProp("clusteredBarChart", "bar.valueAxis.gridlineShow", "Show", "Whether the gridline is shown.", ["valueAxis", 0, "gridlineShow"], undefined, "Gridline"),
    gridlineStyle: enumProp("clusteredBarChart", "bar.valueAxis.gridlineStyle", "Line style", "Sets the gridline's line style.", ["valueAxis", 0, "gridlineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Gridline"),
    gridlineThickness: numberProp("clusteredBarChart", "bar.valueAxis.gridlineThickness", "Width", "The thickness, in pixels, of the gridline.", ["valueAxis", 0, "gridlineThickness"], 0, 10, undefined, "Gridline"),
    gridlineTransparency: numberProp("clusteredBarChart", "bar.valueAxis.gridlineTransparency", "Transparency", "How see-through the gridline appears — 0 is solid, 100 is invisible.", ["valueAxis", 0, "gridlineTransparency"], 0, 100, undefined, "Gridline"),
    titleBold: boolProp("clusteredBarChart", "bar.valueAxis.titleBold", "Bold", "Whether the title is bold.", ["valueAxis", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("clusteredBarChart", "bar.valueAxis.titleColor", "Color", "The colour of the title.", ["valueAxis", 0, "titleColor"], undefined, "Title"),
    titleFontFamily: textProp("clusteredBarChart", "bar.valueAxis.titleFontFamily", "Font family", "The typeface used for the title.", ["valueAxis", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("clusteredBarChart", "bar.valueAxis.titleFontSize", "Title text size", "Sets the title's title text size.", ["valueAxis", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleItalic: boolProp("clusteredBarChart", "bar.valueAxis.titleItalic", "Italic", "Whether the title is italic.", ["valueAxis", 0, "titleItalic"], undefined, "Title"),
    titleText: textProp("clusteredBarChart", "bar.valueAxis.titleText", "Axis title", "The custom text used for the title.", ["valueAxis", 0, "titleText"], undefined, "Title"),
    titleUnderline: boolProp("clusteredBarChart", "bar.valueAxis.titleUnderline", "Underline", "Whether the title is underlined.", ["valueAxis", 0, "titleUnderline"], undefined, "Title"),
  },

  legend: {
    show: boolProp("clusteredBarChart", "bar.legend.show", "Show", "Whether the legend is shown.", ["legend", 0, "show"]),
    bold: boolProp("clusteredBarChart", "bar.legend.bold", "Bold", "Whether the legend's text is bold.", ["legend", 0, "bold"]),
    fontFamily: textProp("clusteredBarChart", "bar.legend.fontFamily", "Font family", "The typeface used for the legend.", ["legend", 0, "fontFamily"]),
    fontSize: numberProp("clusteredBarChart", "bar.legend.fontSize", "Text size", "Sets the legend's text size.", ["legend", 0, "fontSize"], 8, 60),
    italic: boolProp("clusteredBarChart", "bar.legend.italic", "Italic", "Whether the legend's text is italic.", ["legend", 0, "italic"]),
    labelColor: colorProp("clusteredBarChart", "bar.legend.labelColor", "Text color", "The colour of the label.", ["legend", 0, "labelColor"]),
    position: enumProp("clusteredBarChart", "bar.legend.position", "Position", "Select the location for the legend", ["legend", 0, "position"], [{"value":"Top","label":"Top left"},{"value":"TopCenter","label":"Top center"},{"value":"TopRight","label":"Top right"},{"value":"Left","label":"Top left stacked"},{"value":"Right","label":"Top right stacked"},{"value":"LeftCenter","label":"Center left"},{"value":"RightCenter","label":"Center right"},{"value":"Bottom","label":"Bottom left"},{"value":"BottomCenter","label":"Bottom center"},{"value":"BottomRight","label":"Bottom right"}] as const),
    showGradientLegend: boolProp("clusteredBarChart", "bar.legend.showGradientLegend", "Show gradient legend", "Whether the show gradient legend is turned on.", ["legend", 0, "showGradientLegend"]),
    underline: boolProp("clusteredBarChart", "bar.legend.underline", "Underline", "Whether the legend's text is underlined.", ["legend", 0, "underline"]),
    showTitle: boolProp("clusteredBarChart", "bar.legend.showTitle", "Title", "Display a title for legend symbols", ["legend", 0, "showTitle"], undefined, "Title"),
    titleText: textProp("clusteredBarChart", "bar.legend.titleText", "Legend Name", "Title text", ["legend", 0, "titleText"], undefined, "Title"),
  },

  labels: {
    show: boolProp("clusteredBarChart", "bar.labels.show", "Show", "Whether the data labels are shown.", ["labels", 0, "show"]),
    bold: boolProp("clusteredBarChart", "bar.labels.bold", "Bold", "Whether the data labels's text is bold.", ["labels", 0, "bold"], undefined, "Value"),
    color: colorProp("clusteredBarChart", "bar.labels.color", "Value color", "Select color for data labels", ["labels", 0, "color"], undefined, "Value"),
    enableDetailDataLabel: boolProp("clusteredBarChart", "bar.labels.enableDetailDataLabel", "Enable detail label", "Whether the enable detail data label is turned on.", ["labels", 0, "enableDetailDataLabel"], undefined, "Value"),
    enableTitleDataLabel: boolProp("clusteredBarChart", "bar.labels.enableTitleDataLabel", "Enable title label", "Whether the enable title data label is turned on.", ["labels", 0, "enableTitleDataLabel"], undefined, "Value"),
    enableValueDataLabel: boolProp("clusteredBarChart", "bar.labels.enableValueDataLabel", "Enable value label", "Whether the enable value data label is turned on.", ["labels", 0, "enableValueDataLabel"], undefined, "Value"),
    fontFamily: textProp("clusteredBarChart", "bar.labels.fontFamily", "Font family", "The typeface used for the data labels.", ["labels", 0, "fontFamily"], undefined, "Value"),
    fontSize: numberProp("clusteredBarChart", "bar.labels.fontSize", "Text size", "Sets the data labels's text size.", ["labels", 0, "fontSize"], 8, 60, undefined, "Value"),
    horizontalAlignment: enumProp("clusteredBarChart", "bar.labels.horizontalAlignment", "Horizontal alignment", "Sets the horizontal alignment.", ["labels", 0, "horizontalAlignment"], [{"value":"left","label":"left"},{"value":"center","label":"center"},{"value":"right","label":"right"}] as const, undefined, "Value"),
    italic: boolProp("clusteredBarChart", "bar.labels.italic", "Italic", "Whether the data labels's text is italic.", ["labels", 0, "italic"], undefined, "Value"),
    labelContainerMaxWidth: numberProp("clusteredBarChart", "bar.labels.labelContainerMaxWidth", "Maximum width", "Sets the label container max width.", ["labels", 0, "labelContainerMaxWidth"], -1000, 1000, undefined, "Value"),
    labelContentLayout: enumProp("clusteredBarChart", "bar.labels.labelContentLayout", "Layout", "Sets the label content layout.", ["labels", 0, "labelContentLayout"], [{"value":"MultiLine","label":"Multi-line"},{"value":"SingleLine","label":"Single line"}] as const, undefined, "Value"),
    labelDensity: numberProp("clusteredBarChart", "bar.labels.labelDensity", "Label density", "Sets the label density.", ["labels", 0, "labelDensity"], -1000, 1000, undefined, "Value"),
    labelDisplayUnits: enumProp("clusteredBarChart", "bar.labels.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Value"),
    labelOrientation: enumProp("clusteredBarChart", "bar.labels.labelOrientation", "Orientation", "Sets the label orientation.", ["labels", 0, "labelOrientation"], [{"value":0,"label":"Vertical"},{"value":1,"label":"Horizontal"}] as const, undefined, "Value"),
    labelOverflow: boolProp("clusteredBarChart", "bar.labels.labelOverflow", "Overflow text", "Allow the labels to overflow outside of the shape's boundaries", ["labels", 0, "labelOverflow"], undefined, "Value"),
    labelPosition: enumProp("clusteredBarChart", "bar.labels.labelPosition", "Position", "Sets the label position.", ["labels", 0, "labelPosition"], [{"value":"Auto","label":"Auto"},{"value":"InsideEnd","label":"Inside end"},{"value":"OutsideEnd","label":"Outside end"},{"value":"InsideCenter","label":"Inside center"},{"value":"InsideBase","label":"Inside base"},{"value":"Above","label":"Above"},{"value":"Under","label":"Under"}] as const, undefined, "Value"),
    labelPrecision: numberProp("clusteredBarChart", "bar.labels.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "labelPrecision"], 0, 10, undefined, "Value"),
    optimizeLabelDisplay: boolProp("clusteredBarChart", "bar.labels.optimizeLabelDisplay", "Optimize label display", "Whether the optimize label display is turned on.", ["labels", 0, "optimizeLabelDisplay"], undefined, "Value"),
    showAll: boolProp("clusteredBarChart", "bar.labels.showAll", "Customize series", "Whether the show all is turned on.", ["labels", 0, "showAll"], undefined, "Value"),
    showBlankAs: textProp("clusteredBarChart", "bar.labels.showBlankAs", "Show blank as (value)", "The custom text used for the show blank as.", ["labels", 0, "showBlankAs"], undefined, "Value"),
    showByDefault: boolProp("clusteredBarChart", "bar.labels.showByDefault", "Show by default", "Whether the show by default is turned on.", ["labels", 0, "showByDefault"], undefined, "Value"),
    showDynamicLabels: boolProp("clusteredBarChart", "bar.labels.showDynamicLabels", "Custom label", "Whether the show dynamic labels is turned on.", ["labels", 0, "showDynamicLabels"], undefined, "Value"),
    showSeries: boolProp("clusteredBarChart", "bar.labels.showSeries", "Customize per series", "Whether the show series is turned on.", ["labels", 0, "showSeries"], undefined, "Value"),
    transparency: numberProp("clusteredBarChart", "bar.labels.transparency", "Transparency", "How see-through the data labels appears — 0 is solid, 100 is invisible.", ["labels", 0, "transparency"], 0, 100, undefined, "Value"),
    underline: boolProp("clusteredBarChart", "bar.labels.underline", "Underline", "Whether the data labels's text is underlined.", ["labels", 0, "underline"], undefined, "Value"),
    valueCustomFormatString: textProp("clusteredBarChart", "bar.labels.valueCustomFormatString", "Format code", "Enter a custom number format for your callout.", ["labels", 0, "valueCustomFormatString"], undefined, "Value"),
    valueFormatString: textProp("clusteredBarChart", "bar.labels.valueFormatString", "Format string", "The custom text used for the value format string.", ["labels", 0, "valueFormatString"], undefined, "Value"),
    wordWrap: boolProp("clusteredBarChart", "bar.labels.wordWrap", "Word wrap", "Whether the word wrap is turned on.", ["labels", 0, "wordWrap"], undefined, "Value"),
    detailBold: boolProp("clusteredBarChart", "bar.labels.detailBold", "Bold", "Whether the detail is bold.", ["labels", 0, "detailBold"], undefined, "Detail"),
    detailColor: colorProp("clusteredBarChart", "bar.labels.detailColor", "Color", "Select color for data labels", ["labels", 0, "detailColor"], undefined, "Detail"),
    detailContentType: enumProp("clusteredBarChart", "bar.labels.detailContentType", "Content", "Sets the detail content type.", ["labels", 0, "detailContentType"], [{"value":"Percent of total","label":"Percent of total"},{"value":"Custom","label":"Custom"}] as const, undefined, "Detail"),
    detailCustomFormatString: textProp("clusteredBarChart", "bar.labels.detailCustomFormatString", "Custom format code", "Enter a custom number format for your callout.", ["labels", 0, "detailCustomFormatString"], undefined, "Detail"),
    detailFontFamily: textProp("clusteredBarChart", "bar.labels.detailFontFamily", "Font family", "The typeface used for the detail.", ["labels", 0, "detailFontFamily"], undefined, "Detail"),
    detailFontSize: numberProp("clusteredBarChart", "bar.labels.detailFontSize", "Text size", "Sets the detail's text size.", ["labels", 0, "detailFontSize"], 8, 60, undefined, "Detail"),
    detailFormatString: textProp("clusteredBarChart", "bar.labels.detailFormatString", "Format string", "The custom text used for the detail format string.", ["labels", 0, "detailFormatString"], undefined, "Detail"),
    detailItalic: boolProp("clusteredBarChart", "bar.labels.detailItalic", "Italic", "Whether the detail is italic.", ["labels", 0, "detailItalic"], undefined, "Detail"),
    detailLabelDisplayUnits: enumProp("clusteredBarChart", "bar.labels.detailLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "detailLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Detail"),
    detailLabelPrecision: numberProp("clusteredBarChart", "bar.labels.detailLabelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "detailLabelPrecision"], 0, 10, undefined, "Detail"),
    detailShowBlankAs: textProp("clusteredBarChart", "bar.labels.detailShowBlankAs", "Show blank as (detail)", "The custom text used for the detail show blank as.", ["labels", 0, "detailShowBlankAs"], undefined, "Detail"),
    detailTransparency: numberProp("clusteredBarChart", "bar.labels.detailTransparency", "Transparency", "How see-through the detail appears — 0 is solid, 100 is invisible.", ["labels", 0, "detailTransparency"], 0, 100, undefined, "Detail"),
    detailUnderline: boolProp("clusteredBarChart", "bar.labels.detailUnderline", "Underline", "Whether the detail is underlined.", ["labels", 0, "detailUnderline"], undefined, "Detail"),
    titleBold: boolProp("clusteredBarChart", "bar.labels.titleBold", "Bold", "Whether the title is bold.", ["labels", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("clusteredBarChart", "bar.labels.titleColor", "Color", "Select color for data labels", ["labels", 0, "titleColor"], undefined, "Title"),
    titleContentType: enumProp("clusteredBarChart", "bar.labels.titleContentType", "Content", "Sets the title content type.", ["labels", 0, "titleContentType"], [{"value":"Series name","label":"Series name"},{"value":"Custom","label":"Custom"}] as const, undefined, "Title"),
    titleCustomFormatString: textProp("clusteredBarChart", "bar.labels.titleCustomFormatString", "Custom format code", "Enter a custom number format for your callout.", ["labels", 0, "titleCustomFormatString"], undefined, "Title"),
    titleFontFamily: textProp("clusteredBarChart", "bar.labels.titleFontFamily", "Font family", "The typeface used for the title.", ["labels", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("clusteredBarChart", "bar.labels.titleFontSize", "Text size", "Sets the title's text size.", ["labels", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleFormatString: textProp("clusteredBarChart", "bar.labels.titleFormatString", "Format string", "The custom text used for the title format string.", ["labels", 0, "titleFormatString"], undefined, "Title"),
    titleItalic: boolProp("clusteredBarChart", "bar.labels.titleItalic", "Italic", "Whether the title is italic.", ["labels", 0, "titleItalic"], undefined, "Title"),
    titleLabelDisplayUnits: enumProp("clusteredBarChart", "bar.labels.titleLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "titleLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Title"),
    titleLabelPrecision: numberProp("clusteredBarChart", "bar.labels.titleLabelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "titleLabelPrecision"], 0, 10, undefined, "Title"),
    titleShowBlankAs: textProp("clusteredBarChart", "bar.labels.titleShowBlankAs", "Show blank as (title)", "The custom text used for the title show blank as.", ["labels", 0, "titleShowBlankAs"], undefined, "Title"),
    titleTransparency: numberProp("clusteredBarChart", "bar.labels.titleTransparency", "Transparency", "How see-through the title appears — 0 is solid, 100 is invisible.", ["labels", 0, "titleTransparency"], 0, 100, undefined, "Title"),
    titleUnderline: boolProp("clusteredBarChart", "bar.labels.titleUnderline", "Underline", "Whether the title is underlined.", ["labels", 0, "titleUnderline"], undefined, "Title"),
    backgroundColor: colorProp("clusteredBarChart", "bar.labels.backgroundColor", "Color", "Background color", ["labels", 0, "backgroundColor"], undefined, "Background"),
    backgroundTransparency: numberProp("clusteredBarChart", "bar.labels.backgroundTransparency", "Transparency", "Background color transparency", ["labels", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
    enableBackground: boolProp("clusteredBarChart", "bar.labels.enableBackground", "Show background", "Whether the enable background is turned on.", ["labels", 0, "enableBackground"], undefined, "Background"),
  },

  plotArea: {
    transparency: numberProp("clusteredBarChart", "bar.plotArea.transparency", "Transparency", "Background color transparency", ["plotArea", 0, "transparency"], 0, 100),
  },

  error: {
    enabled: boolProp("clusteredBarChart", "bar.error.enabled", "Enabled", "Whether the enabled is turned on.", ["error", 0, "enabled"]),
    barBorderColor: colorProp("clusteredBarChart", "bar.error.barBorderColor", "Border color", "The colour of the bar border.", ["error", 0, "barBorderColor"], undefined, "Bar"),
    barBorderSize: numberProp("clusteredBarChart", "bar.error.barBorderSize", "Border size", "Sets the bar border's border size.", ["error", 0, "barBorderSize"], 0, 10, undefined, "Bar"),
    barColor: colorProp("clusteredBarChart", "bar.error.barColor", "Color", "The colour of the bar.", ["error", 0, "barColor"], undefined, "Bar"),
    barMatchSeriesColor: boolProp("clusteredBarChart", "bar.error.barMatchSeriesColor", "Match series color", "Whether the bar match series is turned on.", ["error", 0, "barMatchSeriesColor"], undefined, "Bar"),
    barShow: boolProp("clusteredBarChart", "bar.error.barShow", "Show", "Whether the bar is shown.", ["error", 0, "barShow"], undefined, "Bar"),
    barWidth: numberProp("clusteredBarChart", "bar.error.barWidth", "Width", "The thickness, in pixels, of the bar width.", ["error", 0, "barWidth"], 0, 10, undefined, "Bar"),
    labelBackground: boolProp("clusteredBarChart", "bar.error.labelBackground", "Show background", "Whether the label background is turned on.", ["error", 0, "labelBackground"], undefined, "Label"),
    labelBackgroundColor: colorProp("clusteredBarChart", "bar.error.labelBackgroundColor", "Background color", "The colour of the label background.", ["error", 0, "labelBackgroundColor"], undefined, "Label"),
    labelBackgroundTransparency: numberProp("clusteredBarChart", "bar.error.labelBackgroundTransparency", "Transparency", "Background color transparency", ["error", 0, "labelBackgroundTransparency"], 0, 100, undefined, "Label"),
    labelBold: boolProp("clusteredBarChart", "bar.error.labelBold", "Bold", "Whether the label is bold.", ["error", 0, "labelBold"], undefined, "Label"),
    labelColor: colorProp("clusteredBarChart", "bar.error.labelColor", "Color", "The colour of the label.", ["error", 0, "labelColor"], undefined, "Label"),
    labelFontFamily: textProp("clusteredBarChart", "bar.error.labelFontFamily", "Font family", "The typeface used for the label.", ["error", 0, "labelFontFamily"], undefined, "Label"),
    labelFontSize: numberProp("clusteredBarChart", "bar.error.labelFontSize", "Text size", "Sets the label's text size.", ["error", 0, "labelFontSize"], 8, 60, undefined, "Label"),
    labelFormat: enumProp("clusteredBarChart", "bar.error.labelFormat", "Format", "Sets the label format.", ["error", 0, "labelFormat"], [{"value":"absolute","label":"Absolute"},{"value":"relativeNumeric","label":"Relative (numeric)"},{"value":"relativePercentage","label":"Relative (percentage)"},{"value":"range","label":"Range"}] as const, undefined, "Label"),
    labelItalic: boolProp("clusteredBarChart", "bar.error.labelItalic", "Italic", "Whether the label is italic.", ["error", 0, "labelItalic"], undefined, "Label"),
    labelMatchSeriesColor: boolProp("clusteredBarChart", "bar.error.labelMatchSeriesColor", "Match series color", "Whether the label match series is turned on.", ["error", 0, "labelMatchSeriesColor"], undefined, "Label"),
    labelShow: boolProp("clusteredBarChart", "bar.error.labelShow", "Show", "Whether the label is shown.", ["error", 0, "labelShow"], undefined, "Label"),
    labelUnderline: boolProp("clusteredBarChart", "bar.error.labelUnderline", "Underline", "Whether the label is underlined.", ["error", 0, "labelUnderline"], undefined, "Label"),
    markerShape: enumProp("clusteredBarChart", "bar.error.markerShape", "Marker shape", "Sets the marker shape.", ["error", 0, "markerShape"], [{"value":"circle","label":"●"},{"value":"square","label":"■"},{"value":"diamond","label":"◆"},{"value":"triangle","label":"▲"},{"value":"x","label":"☓"},{"value":"shortDash","label":" -"},{"value":"longDash","label":"—"},{"value":"plus","label":"+"},{"value":"none","label":"None"}] as const, undefined, "Marker"),
    markerShow: boolProp("clusteredBarChart", "bar.error.markerShow", "Show", "Whether the marker is shown.", ["error", 0, "markerShow"], undefined, "Marker"),
    markerSize: numberProp("clusteredBarChart", "bar.error.markerSize", "Size", "Sets the marker's size.", ["error", 0, "markerSize"], 1, 60, undefined, "Marker"),
    tooltipFormat: enumProp("clusteredBarChart", "bar.error.tooltipFormat", "Format", "Sets the tooltip format.", ["error", 0, "tooltipFormat"], [{"value":"absolute","label":"Absolute"},{"value":"relativeNumeric","label":"Relative (numeric)"},{"value":"relativePercentage","label":"Relative (percentage)"},{"value":"range","label":"Range"}] as const, undefined, "Tooltip"),
    tooltipShow: boolProp("clusteredBarChart", "bar.error.tooltipShow", "Show in tooltip", "Whether the tooltip is shown.", ["error", 0, "tooltipShow"], undefined, "Tooltip"),
  },

  trend: {
    show: boolProp("clusteredBarChart", "bar.trend.show", "Show", "Whether the trend line is shown.", ["trend", 0, "show"]),
    autoScale: boolProp("clusteredBarChart", "bar.trend.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["trend", 0, "autoScale"]),
    combineSeries: boolProp("clusteredBarChart", "bar.trend.combineSeries", "Combine series", "Show one trend line per series or combine", ["trend", 0, "combineSeries"]),
    dashArray: textProp("clusteredBarChart", "bar.trend.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["trend", 0, "dashArray"]),
    dashCap: enumProp("clusteredBarChart", "bar.trend.dashCap", "Dash cap", "Sets the dash cap.", ["trend", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const),
    displayName: textProp("clusteredBarChart", "bar.trend.displayName", "Name", "Set trend line name", ["trend", 0, "displayName"]),
    lineColor: colorProp("clusteredBarChart", "bar.trend.lineColor", "Color", "The colour of the line.", ["trend", 0, "lineColor"]),
    style: enumProp("clusteredBarChart", "bar.trend.style", "Line style", "Sets the trend line's line style.", ["trend", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const),
    transparency: numberProp("clusteredBarChart", "bar.trend.transparency", "Transparency", "How see-through the trend line appears — 0 is solid, 100 is invisible.", ["trend", 0, "transparency"], 0, 100),
    useHighlightValues: boolProp("clusteredBarChart", "bar.trend.useHighlightValues", "Use highlight values", "Use highlight values to calculate trend line", ["trend", 0, "useHighlightValues"]),
    width: numberProp("clusteredBarChart", "bar.trend.width", "Width", "The thickness, in pixels, of the width.", ["trend", 0, "width"], 0, 10),
  },

  referenceLine: {
    show: boolProp("clusteredBarChart", "bar.referenceLine.show", "Show", "Whether the constant line is shown.", ["referenceLine", 0, "show"]),
    autoScale: boolProp("clusteredBarChart", "bar.referenceLine.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["referenceLine", 0, "autoScale"]),
    dashArray: textProp("clusteredBarChart", "bar.referenceLine.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["referenceLine", 0, "dashArray"]),
    dashCap: enumProp("clusteredBarChart", "bar.referenceLine.dashCap", "Dash cap", "Sets the dash cap.", ["referenceLine", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const),
    displayName: textProp("clusteredBarChart", "bar.referenceLine.displayName", "Name", "Set reference line name", ["referenceLine", 0, "displayName"]),
    lineColor: colorProp("clusteredBarChart", "bar.referenceLine.lineColor", "Color", "The colour of the line.", ["referenceLine", 0, "lineColor"]),
    position: enumProp("clusteredBarChart", "bar.referenceLine.position", "Position", "Arrange relative to chart data points", ["referenceLine", 0, "position"], [{"value":"back","label":"Behind"},{"value":"front","label":"In front"}] as const),
    style: enumProp("clusteredBarChart", "bar.referenceLine.style", "Line style", "Sets the constant line's line style.", ["referenceLine", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const),
    transparency: numberProp("clusteredBarChart", "bar.referenceLine.transparency", "Transparency", "How see-through the constant line appears — 0 is solid, 100 is invisible.", ["referenceLine", 0, "transparency"], 0, 100),
    value: numberProp("clusteredBarChart", "bar.referenceLine.value", "Value", "Set reference line numeric value", ["referenceLine", 0, "value"], -REFERENCE_LINE_VALUE_LIMIT, REFERENCE_LINE_VALUE_LIMIT),
    width: numberProp("clusteredBarChart", "bar.referenceLine.width", "Width", "The thickness, in pixels, of the width.", ["referenceLine", 0, "width"], 0, 10),
    dataLabelColor: colorProp("clusteredBarChart", "bar.referenceLine.dataLabelColor", "Color", "Set the reference line data label color", ["referenceLine", 0, "dataLabelColor"], undefined, "Data label"),
    dataLabelDecimalPoints: numberProp("clusteredBarChart", "bar.referenceLine.dataLabelDecimalPoints", "Value decimal places", "Sets the data label decimal points's value decimal places.", ["referenceLine", 0, "dataLabelDecimalPoints"], 0, 10, undefined, "Data label"),
    dataLabelDisplayUnits: enumProp("clusteredBarChart", "bar.referenceLine.dataLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["referenceLine", 0, "dataLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined, "Data label"),
    dataLabelHorizontalPosition: enumProp("clusteredBarChart", "bar.referenceLine.dataLabelHorizontalPosition", "Horizontal position", "Set the horizontal position for the reference line data label", ["referenceLine", 0, "dataLabelHorizontalPosition"], [{"value":"left","label":"Left"},{"value":"right","label":"Right"}] as const, undefined, "Data label"),
    dataLabelShow: boolProp("clusteredBarChart", "bar.referenceLine.dataLabelShow", "Data label", "Display a data label for the reference line", ["referenceLine", 0, "dataLabelShow"], undefined, "Data label"),
    dataLabelText: enumProp("clusteredBarChart", "bar.referenceLine.dataLabelText", "Text", "Text shown in the label", ["referenceLine", 0, "dataLabelText"], [{"value":"Value","label":"Data value"},{"value":"Name","label":"Name"},{"value":"ValueAndName","label":"Both"}] as const, undefined, "Data label"),
    dataLabelVerticalPosition: enumProp("clusteredBarChart", "bar.referenceLine.dataLabelVerticalPosition", "Vertical position", "Set the vertical position for the reference line data label", ["referenceLine", 0, "dataLabelVerticalPosition"], [{"value":"above","label":"Above"},{"value":"under","label":"Under"}] as const, undefined, "Data label"),
    shadeColor: colorProp("clusteredBarChart", "bar.referenceLine.shadeColor", "Shade color", "The colour of the shade.", ["referenceLine", 0, "shadeColor"], undefined, "Shade"),
    shadeColorMatchStroke: boolProp("clusteredBarChart", "bar.referenceLine.shadeColorMatchStroke", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["referenceLine", 0, "shadeColorMatchStroke"], undefined, "Shade"),
    shadeRegion: enumProp("clusteredBarChart", "bar.referenceLine.shadeRegion", "Shade region", "Sets the shade region.", ["referenceLine", 0, "shadeRegion"], [{"value":"before","label":"Before"},{"value":"after","label":"After"},{"value":"none","label":"None"}] as const, undefined, "Shade"),
    shadeShow: boolProp("clusteredBarChart", "bar.referenceLine.shadeShow", "Show", "Whether the shade is shown.", ["referenceLine", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("clusteredBarChart", "bar.referenceLine.shadeTransparency", "Shade transparency", "How see-through the shade appears — 0 is solid, 100 is invisible.", ["referenceLine", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
  },

  xAxisReferenceLine: {
    show: boolProp("clusteredBarChart", "bar.xAxisReferenceLine.show", "Show", "Whether the X-axis constant line is shown.", ["xAxisReferenceLine", 0, "show"]),
    autoScale: boolProp("clusteredBarChart", "bar.xAxisReferenceLine.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["xAxisReferenceLine", 0, "autoScale"]),
    dashArray: textProp("clusteredBarChart", "bar.xAxisReferenceLine.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["xAxisReferenceLine", 0, "dashArray"]),
    dashCap: enumProp("clusteredBarChart", "bar.xAxisReferenceLine.dashCap", "Dash cap", "Sets the dash cap.", ["xAxisReferenceLine", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const),
    displayName: textProp("clusteredBarChart", "bar.xAxisReferenceLine.displayName", "Name", "Set reference line name", ["xAxisReferenceLine", 0, "displayName"]),
    lineColor: colorProp("clusteredBarChart", "bar.xAxisReferenceLine.lineColor", "Color", "The colour of the line.", ["xAxisReferenceLine", 0, "lineColor"]),
    position: enumProp("clusteredBarChart", "bar.xAxisReferenceLine.position", "Position", "Arrange relative to chart data points", ["xAxisReferenceLine", 0, "position"], [{"value":"back","label":"Behind"},{"value":"front","label":"In front"}] as const),
    style: enumProp("clusteredBarChart", "bar.xAxisReferenceLine.style", "Line style", "Sets the X-axis constant line's line style.", ["xAxisReferenceLine", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const),
    transparency: numberProp("clusteredBarChart", "bar.xAxisReferenceLine.transparency", "Transparency", "How see-through the X-axis constant line appears — 0 is solid, 100 is invisible.", ["xAxisReferenceLine", 0, "transparency"], 0, 100),
    value: textProp("clusteredBarChart", "bar.xAxisReferenceLine.value", "Value", "Set reference line numeric or date time value according to x-axis type", ["xAxisReferenceLine", 0, "value"]),
    width: numberProp("clusteredBarChart", "bar.xAxisReferenceLine.width", "Width", "The thickness, in pixels, of the width.", ["xAxisReferenceLine", 0, "width"], 0, 10),
    dataLabelColor: colorProp("clusteredBarChart", "bar.xAxisReferenceLine.dataLabelColor", "Color", "Set the reference line data label color", ["xAxisReferenceLine", 0, "dataLabelColor"], undefined, "Data label"),
    dataLabelDecimalPoints: numberProp("clusteredBarChart", "bar.xAxisReferenceLine.dataLabelDecimalPoints", "Value decimal places", "Sets the data label decimal points's value decimal places.", ["xAxisReferenceLine", 0, "dataLabelDecimalPoints"], 0, 10, undefined, "Data label"),
    dataLabelDisplayUnits: enumProp("clusteredBarChart", "bar.xAxisReferenceLine.dataLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["xAxisReferenceLine", 0, "dataLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined, "Data label"),
    dataLabelHorizontalPosition: enumProp("clusteredBarChart", "bar.xAxisReferenceLine.dataLabelHorizontalPosition", "Horizontal position", "Set the horizontal position for the reference line data label", ["xAxisReferenceLine", 0, "dataLabelHorizontalPosition"], [{"value":"left","label":"Left"},{"value":"right","label":"Right"}] as const, undefined, "Data label"),
    dataLabelShow: boolProp("clusteredBarChart", "bar.xAxisReferenceLine.dataLabelShow", "Data label", "Display a data label for the reference line", ["xAxisReferenceLine", 0, "dataLabelShow"], undefined, "Data label"),
    dataLabelText: enumProp("clusteredBarChart", "bar.xAxisReferenceLine.dataLabelText", "Text", "Text shown in the label", ["xAxisReferenceLine", 0, "dataLabelText"], [{"value":"Value","label":"Data value"},{"value":"Name","label":"Name"},{"value":"ValueAndName","label":"Both"}] as const, undefined, "Data label"),
    dataLabelVerticalPosition: enumProp("clusteredBarChart", "bar.xAxisReferenceLine.dataLabelVerticalPosition", "Vertical position", "Set the vertical position for the reference line data label", ["xAxisReferenceLine", 0, "dataLabelVerticalPosition"], [{"value":"above","label":"Above"},{"value":"under","label":"Under"}] as const, undefined, "Data label"),
    shadeColor: colorProp("clusteredBarChart", "bar.xAxisReferenceLine.shadeColor", "Shade color", "The colour of the shade.", ["xAxisReferenceLine", 0, "shadeColor"], undefined, "Shade"),
    shadeColorMatchStroke: boolProp("clusteredBarChart", "bar.xAxisReferenceLine.shadeColorMatchStroke", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["xAxisReferenceLine", 0, "shadeColorMatchStroke"], undefined, "Shade"),
    shadeRegion: enumProp("clusteredBarChart", "bar.xAxisReferenceLine.shadeRegion", "Shade region", "Sets the shade region.", ["xAxisReferenceLine", 0, "shadeRegion"], [{"value":"before","label":"Before"},{"value":"after","label":"After"},{"value":"none","label":"None"}] as const, undefined, "Shade"),
    shadeShow: boolProp("clusteredBarChart", "bar.xAxisReferenceLine.shadeShow", "Show", "Whether the shade is shown.", ["xAxisReferenceLine", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("clusteredBarChart", "bar.xAxisReferenceLine.shadeTransparency", "Shade transparency", "How see-through the shade appears — 0 is solid, 100 is invisible.", ["xAxisReferenceLine", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
  },

  y1AxisReferenceLine: {
    show: boolProp("clusteredBarChart", "bar.y1AxisReferenceLine.show", "Show", "Whether the Y-axis constant line is shown.", ["y1AxisReferenceLine", 0, "show"]),
    autoScale: boolProp("clusteredBarChart", "bar.y1AxisReferenceLine.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["y1AxisReferenceLine", 0, "autoScale"]),
    dashArray: textProp("clusteredBarChart", "bar.y1AxisReferenceLine.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["y1AxisReferenceLine", 0, "dashArray"]),
    dashCap: enumProp("clusteredBarChart", "bar.y1AxisReferenceLine.dashCap", "Dash cap", "Sets the dash cap.", ["y1AxisReferenceLine", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const),
    displayName: textProp("clusteredBarChart", "bar.y1AxisReferenceLine.displayName", "Name", "Set reference line name", ["y1AxisReferenceLine", 0, "displayName"]),
    lineColor: colorProp("clusteredBarChart", "bar.y1AxisReferenceLine.lineColor", "Color", "The colour of the line.", ["y1AxisReferenceLine", 0, "lineColor"]),
    position: enumProp("clusteredBarChart", "bar.y1AxisReferenceLine.position", "Position", "Arrange relative to chart data points", ["y1AxisReferenceLine", 0, "position"], [{"value":"back","label":"Behind"},{"value":"front","label":"In front"}] as const),
    style: enumProp("clusteredBarChart", "bar.y1AxisReferenceLine.style", "Line style", "Sets the Y-axis constant line's line style.", ["y1AxisReferenceLine", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const),
    transparency: numberProp("clusteredBarChart", "bar.y1AxisReferenceLine.transparency", "Transparency", "How see-through the Y-axis constant line appears — 0 is solid, 100 is invisible.", ["y1AxisReferenceLine", 0, "transparency"], 0, 100),
    value: numberProp("clusteredBarChart", "bar.y1AxisReferenceLine.value", "Value", "Set reference line numeric value", ["y1AxisReferenceLine", 0, "value"], -1000, 1000),
    width: numberProp("clusteredBarChart", "bar.y1AxisReferenceLine.width", "Width", "The thickness, in pixels, of the width.", ["y1AxisReferenceLine", 0, "width"], 0, 10),
    dataLabelColor: colorProp("clusteredBarChart", "bar.y1AxisReferenceLine.dataLabelColor", "Color", "Set the reference line data label color", ["y1AxisReferenceLine", 0, "dataLabelColor"], undefined, "Data label"),
    dataLabelDecimalPoints: numberProp("clusteredBarChart", "bar.y1AxisReferenceLine.dataLabelDecimalPoints", "Value decimal places", "Sets the data label decimal points's value decimal places.", ["y1AxisReferenceLine", 0, "dataLabelDecimalPoints"], 0, 10, undefined, "Data label"),
    dataLabelDisplayUnits: enumProp("clusteredBarChart", "bar.y1AxisReferenceLine.dataLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["y1AxisReferenceLine", 0, "dataLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined, "Data label"),
    dataLabelHorizontalPosition: enumProp("clusteredBarChart", "bar.y1AxisReferenceLine.dataLabelHorizontalPosition", "Horizontal position", "Set the horizontal position for the reference line data label", ["y1AxisReferenceLine", 0, "dataLabelHorizontalPosition"], [{"value":"left","label":"Left"},{"value":"right","label":"Right"}] as const, undefined, "Data label"),
    dataLabelShow: boolProp("clusteredBarChart", "bar.y1AxisReferenceLine.dataLabelShow", "Data label", "Display a data label for the reference line", ["y1AxisReferenceLine", 0, "dataLabelShow"], undefined, "Data label"),
    dataLabelText: enumProp("clusteredBarChart", "bar.y1AxisReferenceLine.dataLabelText", "Text", "Text shown in the label", ["y1AxisReferenceLine", 0, "dataLabelText"], [{"value":"Value","label":"Data value"},{"value":"Name","label":"Name"},{"value":"ValueAndName","label":"Both"}] as const, undefined, "Data label"),
    dataLabelVerticalPosition: enumProp("clusteredBarChart", "bar.y1AxisReferenceLine.dataLabelVerticalPosition", "Vertical position", "Set the vertical position for the reference line data label", ["y1AxisReferenceLine", 0, "dataLabelVerticalPosition"], [{"value":"above","label":"Above"},{"value":"under","label":"Under"}] as const, undefined, "Data label"),
    shadeColor: colorProp("clusteredBarChart", "bar.y1AxisReferenceLine.shadeColor", "Shade color", "The colour of the shade.", ["y1AxisReferenceLine", 0, "shadeColor"], undefined, "Shade"),
    shadeColorMatchStroke: boolProp("clusteredBarChart", "bar.y1AxisReferenceLine.shadeColorMatchStroke", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["y1AxisReferenceLine", 0, "shadeColorMatchStroke"], undefined, "Shade"),
    shadeRegion: enumProp("clusteredBarChart", "bar.y1AxisReferenceLine.shadeRegion", "Shade region", "Sets the shade region.", ["y1AxisReferenceLine", 0, "shadeRegion"], [{"value":"before","label":"Before"},{"value":"after","label":"After"},{"value":"none","label":"None"}] as const, undefined, "Shade"),
    shadeShow: boolProp("clusteredBarChart", "bar.y1AxisReferenceLine.shadeShow", "Show", "Whether the shade is shown.", ["y1AxisReferenceLine", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("clusteredBarChart", "bar.y1AxisReferenceLine.shadeTransparency", "Shade transparency", "How see-through the shade appears — 0 is solid, 100 is invisible.", ["y1AxisReferenceLine", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
  },

  zoom: {
    show: boolProp("clusteredBarChart", "bar.zoom.show", "Show", "Whether the zoom slider is shown.", ["zoom", 0, "show"]),
    showLabels: boolProp("clusteredBarChart", "bar.zoom.showLabels", "Slider labels", "Whether the show labels is turned on.", ["zoom", 0, "showLabels"]),
    showOnCategoryAxis: boolProp("clusteredBarChart", "bar.zoom.showOnCategoryAxis", "Show zoom on Y axis", "Whether the show on category axis is turned on.", ["zoom", 0, "showOnCategoryAxis"]),
    showOnValueAxis: boolProp("clusteredBarChart", "bar.zoom.showOnValueAxis", "Show zoom on X axis", "Whether the show on value axis is turned on.", ["zoom", 0, "showOnValueAxis"]),
    showTooltip: boolProp("clusteredBarChart", "bar.zoom.showTooltip", "Slider tooltips", "Whether the show tooltip is turned on.", ["zoom", 0, "showTooltip"]),
    categoryMax: numberProp("clusteredBarChart", "bar.zoom.categoryMax", "Category Max", "Sets the category max.", ["zoom", 0, "categoryMax"], -1000, 1000, undefined, "Category axis"),
    categoryMin: numberProp("clusteredBarChart", "bar.zoom.categoryMin", "Category Min", "Sets the category min.", ["zoom", 0, "categoryMin"], -1000, 1000, undefined, "Category axis"),
    categorySize: numberProp("clusteredBarChart", "bar.zoom.categorySize", "Category Size", "Sets the category's category size.", ["zoom", 0, "categorySize"], 1, 60, undefined, "Category axis"),
    valueMax: numberProp("clusteredBarChart", "bar.zoom.valueMax", "Value Max", "Sets the value max.", ["zoom", 0, "valueMax"], -1000, 1000, undefined, "Value axis"),
    valueMin: numberProp("clusteredBarChart", "bar.zoom.valueMin", "Value Min", "Sets the value min.", ["zoom", 0, "valueMin"], -1000, 1000, undefined, "Value axis"),
    valueSize: numberProp("clusteredBarChart", "bar.zoom.valueSize", "Value Size", "Sets the value's value size.", ["zoom", 0, "valueSize"], 1, 60, undefined, "Value axis"),
  },

  smallMultiplesLayout: {
    gridLineColor: colorProp("clusteredBarChart", "bar.smallMultiplesLayout.gridLineColor", "Line color", "The colour of the grid line.", ["smallMultiplesLayout", 0, "gridLineColor"], undefined, "Grid"),
    gridLineShow: boolProp("clusteredBarChart", "bar.smallMultiplesLayout.gridLineShow", "Show", "Whether the grid line is shown.", ["smallMultiplesLayout", 0, "gridLineShow"], undefined, "Grid"),
    gridLineStyle: enumProp("clusteredBarChart", "bar.smallMultiplesLayout.gridLineStyle", "Line style", "Sets the grid line's line style.", ["smallMultiplesLayout", 0, "gridLineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"}] as const, undefined, "Grid"),
    gridLineTransparency: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.gridLineTransparency", "Transparency", "How see-through the grid line appears — 0 is solid, 100 is invisible.", ["smallMultiplesLayout", 0, "gridLineTransparency"], 0, 100, undefined, "Grid"),
    gridLineType: enumProp("clusteredBarChart", "bar.smallMultiplesLayout.gridLineType", "Gridlines", "Gridlines to delineate the small multiple visuals", ["smallMultiplesLayout", 0, "gridLineType"], [{"value":"all","label":"All"},{"value":"inner","label":"Horizontal and vertical"},{"value":"innerHorizontal","label":"Horizontal only"},{"value":"innerVertical","label":"Vertical only"}] as const, undefined, "Grid"),
    gridLineWidth: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.gridLineWidth", "Width", "The thickness, in pixels, of the grid line width.", ["smallMultiplesLayout", 0, "gridLineWidth"], 0, 10, undefined, "Grid"),
    gridPadding: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.gridPadding", "Grid padding", "Sets the grid padding.", ["smallMultiplesLayout", 0, "gridPadding"], 0, 50, undefined, "Grid"),
    advancedPaddingOptions: boolProp("clusteredBarChart", "bar.smallMultiplesLayout.advancedPaddingOptions", "Advanced padding options", "Whether the advanced padding options is turned on.", ["smallMultiplesLayout", 0, "advancedPaddingOptions"], undefined, "Layout"),
    columnCount: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.columnCount", "Columns", "Sets the column count's columns.", ["smallMultiplesLayout", 0, "columnCount"], 1, 12, undefined, "Layout"),
    columnPaddingInner: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.columnPaddingInner", "Inner column padding", "Sets the column padding inner's inner column padding.", ["smallMultiplesLayout", 0, "columnPaddingInner"], 0, 50, undefined, "Layout"),
    columnPaddingOuter: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.columnPaddingOuter", "Outer column padding", "Sets the column padding outer's outer column padding.", ["smallMultiplesLayout", 0, "columnPaddingOuter"], 0, 50, undefined, "Layout"),
    layoutType: enumProp("clusteredBarChart", "bar.smallMultiplesLayout.layoutType", "Grid layout", "Sets the layout type.", ["smallMultiplesLayout", 0, "layoutType"], [{"value":"auto","label":"Auto"},{"value":"custom","label":"Custom"}] as const, undefined, "Layout"),
    rowCount: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.rowCount", "Rows", "Sets the row count's rows.", ["smallMultiplesLayout", 0, "rowCount"], 1, 12, undefined, "Layout"),
    rowPaddingInner: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.rowPaddingInner", "Inner row padding", "Sets the row padding inner's inner row padding.", ["smallMultiplesLayout", 0, "rowPaddingInner"], 0, 50, undefined, "Layout"),
    rowPaddingOuter: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.rowPaddingOuter", "Outer row padding", "Sets the row padding outer's outer row padding.", ["smallMultiplesLayout", 0, "rowPaddingOuter"], 0, 50, undefined, "Layout"),
    backgroundColor: colorProp("clusteredBarChart", "bar.smallMultiplesLayout.backgroundColor", "Color", "Background color for each small multiple", ["smallMultiplesLayout", 0, "backgroundColor"], undefined, "Background"),
    backgroundTransparency: numberProp("clusteredBarChart", "bar.smallMultiplesLayout.backgroundTransparency", "Transparency", "Background color transparency", ["smallMultiplesLayout", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
  },

  subheader: {
    show: boolProp("clusteredBarChart", "bar.subheader.show", "Show", "Whether the small multiple titles is shown.", ["subheader", 0, "show"]),
    alignment: enumProp("clusteredBarChart", "bar.subheader.alignment", "Alignment", "Alignment position for the title", ["subheader", 0, "alignment"], [{"value":"left","label":"left"},{"value":"center","label":"center"},{"value":"right","label":"right"}] as const),
    bold: boolProp("clusteredBarChart", "bar.subheader.bold", "Bold", "Whether the small multiple titles's text is bold.", ["subheader", 0, "bold"]),
    fontColor: colorProp("clusteredBarChart", "bar.subheader.fontColor", "Font color", "The colour of the font.", ["subheader", 0, "fontColor"]),
    fontFamily: textProp("clusteredBarChart", "bar.subheader.fontFamily", "Font family", "The typeface used for the small multiple titles.", ["subheader", 0, "fontFamily"]),
    fontSize: numberProp("clusteredBarChart", "bar.subheader.fontSize", "Text size", "Sets the small multiple titles's text size.", ["subheader", 0, "fontSize"], 8, 60),
    italic: boolProp("clusteredBarChart", "bar.subheader.italic", "Italic", "Whether the small multiple titles's text is italic.", ["subheader", 0, "italic"]),
    position: enumProp("clusteredBarChart", "bar.subheader.position", "Position", "Sets the small multiple titles's position.", ["subheader", 0, "position"], [{"value":"top","label":"Top"},{"value":"bottom","label":"Bottom"}] as const),
    titleWrap: boolProp("clusteredBarChart", "bar.subheader.titleWrap", "Word wrap", "Whether the title wrap is turned on.", ["subheader", 0, "titleWrap"]),
    underline: boolProp("clusteredBarChart", "bar.subheader.underline", "Underline", "Whether the small multiple titles's text is underlined.", ["subheader", 0, "underline"]),
  },

  layout: {
    clusteredGapOverlapReverse: boolProp("clusteredBarChart", "bar.layout.clusteredGapOverlapReverse", "Flip overlap", "Whether the flip overlap is turned on.", ["layout", 0, "clusteredGapOverlapReverse"]),
    clusteredGapOverlaps: boolProp("clusteredBarChart", "bar.layout.clusteredGapOverlaps", "Overlap", "Whether the overlap is turned on.", ["layout", 0, "clusteredGapOverlaps"]),
    clusteredGapSize: numberProp("clusteredBarChart", "bar.layout.clusteredGapSize", "Space between series", "Sets the space between series.", ["layout", 0, "clusteredGapSize"], 0, 50),
    seriesOrderReversed: boolProp("clusteredBarChart", "bar.layout.seriesOrderReversed", "Reverse order", "Reverse the series order of your bars or columns.", ["layout", 0, "seriesOrderReversed"]),
    seriesOrderSorted: boolProp("clusteredBarChart", "bar.layout.seriesOrderSorted", "Sort by value", "Within each category, dynamically sort series by their data value.", ["layout", 0, "seriesOrderSorted"]),
  },
} as const;

export type ResolvedBarChartStyle = {
  /**
   * Whether the *user-supplied* theme configured small multiples.
   * Base themes ship smallMultiplesLayout styling so the feature looks
   * right when it is used, which is not a signal that anything enabled
   * it — so only the custom layer counts. Replaces the renderer reading
   * raw theme JSON to answer the same question.
   */
  usesSmallMultiples: boolean;
  dataPoint: {
    borderColor: string;
    borderColorMatchFill: boolean;
    borderShow: boolean;
    borderSize: number;
    borderTransparency: number;
    defaultColor: string;
    fill: string;
    fillTransparency: number;
    borderOutlineOnly: boolean;
  };
  categoryAxis: {
    axisStyle: string | number;
    axisType: string | number;
    bold: boolean;
    concatenateLabels: boolean;
    end: string;
    fontFamily: string;
    /** Effective render family; never written back to the theme. */
    fontFamilyCss: string;
    fontSize: number;
    gridlineAutoScale: boolean;
    gridlineColor: string;
    gridlineDashArray: string;
    gridlineDashCap: string | number;
    gridlineShow: boolean;
    gridlineStyle: string | number;
    gridlineThickness: number;
    gridlineTransparency: number;
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
    show: boolean;
    showAxisTitle: boolean;
    start: string;
    switchAxisPosition: boolean;
    titleBold: boolean;
    titleColor: string;
    titleFontFamily: string;
    /** Effective render family; never written back to the theme. */
    titleFontFamilyCss: string;
    titleFontSize: number;
    titleItalic: boolean;
    titleText: string;
    titleUnderline: boolean;
    underline: boolean;
  };
  valueAxis: {
    axisStyle: string | number;
    bold: boolean;
    end: string;
    fontFamily: string;
    /** Effective render family; never written back to the theme. */
    fontFamilyCss: string;
    fontSize: number;
    gridlineAutoScale: boolean;
    gridlineColor: string;
    gridlineDashArray: string;
    gridlineDashCap: string | number;
    gridlineShow: boolean;
    gridlineStyle: string | number;
    gridlineThickness: number;
    gridlineTransparency: number;
    invertAxis: boolean;
    italic: boolean;
    labelColor: string;
    labelDisplayUnits: string | number;
    labelPrecision: number;
    logAxisScale: boolean;
    roundRange: boolean;
    scaleToFit: boolean;
    sharedAxis: boolean;
    show: boolean;
    showAxisTitle: boolean;
    start: string;
    switchAxisPosition: boolean;
    titleBold: boolean;
    titleColor: string;
    titleFontFamily: string;
    /** Effective render family; never written back to the theme. */
    titleFontFamilyCss: string;
    titleFontSize: number;
    titleItalic: boolean;
    titleText: string;
    titleUnderline: boolean;
    underline: boolean;
  };
  legend: {
    bold: boolean;
    fontFamily: string;
    /** Effective render family; never written back to the theme. */
    fontFamilyCss: string;
    fontSize: number;
    italic: boolean;
    labelColor: string;
    position: string | number;
    show: boolean;
    showGradientLegend: boolean;
    showTitle: boolean;
    titleText: string;
    underline: boolean;
  };
  labels: {
    backgroundColor: string;
    backgroundTransparency: number;
    bold: boolean;
    color: string;
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
    enableBackground: boolean;
    enableDetailDataLabel: boolean;
    enableTitleDataLabel: boolean;
    enableValueDataLabel: boolean;
    fontFamily: string;
    /** Effective render family; never written back to the theme. */
    fontFamilyCss: string;
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
    show: boolean;
    showAll: boolean;
    showBlankAs: string;
    showByDefault: boolean;
    showDynamicLabels: boolean;
    showSeries: boolean;
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
    transparency: number;
    underline: boolean;
    valueCustomFormatString: string;
    valueFormatString: string;
    wordWrap: boolean;
  };
  plotArea: {
    transparency: number;
  };
  error: {
    barBorderColor: string;
    barBorderSize: number;
    barColor: string;
    barMatchSeriesColor: boolean;
    barShow: boolean;
    barWidth: number;
    enabled: boolean;
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
    autoScale: boolean;
    combineSeries: boolean;
    dashArray: string;
    dashCap: string | number;
    displayName: string;
    lineColor: string;
    show: boolean;
    style: string | number;
    transparency: number;
    useHighlightValues: boolean;
    width: number;
  };
  referenceLine: {
    autoScale: boolean;
    dashArray: string;
    dashCap: string | number;
    dataLabelColor: string;
    dataLabelDecimalPoints: number;
    dataLabelDisplayUnits: string | number;
    dataLabelHorizontalPosition: string | number;
    dataLabelShow: boolean;
    dataLabelText: string | number;
    dataLabelVerticalPosition: string | number;
    displayName: string;
    lineColor: string;
    position: string | number;
    shadeColor: string;
    shadeColorMatchStroke: boolean;
    shadeRegion: string | number;
    shadeShow: boolean;
    shadeTransparency: number;
    show: boolean;
    style: string | number;
    transparency: number;
    value: number;
    width: number;
  };
  xAxisReferenceLine: {
    autoScale: boolean;
    dashArray: string;
    dashCap: string | number;
    dataLabelColor: string;
    dataLabelDecimalPoints: number;
    dataLabelDisplayUnits: string | number;
    dataLabelHorizontalPosition: string | number;
    dataLabelShow: boolean;
    dataLabelText: string | number;
    dataLabelVerticalPosition: string | number;
    displayName: string;
    lineColor: string;
    position: string | number;
    shadeColor: string;
    shadeColorMatchStroke: boolean;
    shadeRegion: string | number;
    shadeShow: boolean;
    shadeTransparency: number;
    show: boolean;
    style: string | number;
    transparency: number;
    value: string;
    width: number;
  };
  y1AxisReferenceLine: {
    autoScale: boolean;
    dashArray: string;
    dashCap: string | number;
    dataLabelColor: string;
    dataLabelDecimalPoints: number;
    dataLabelDisplayUnits: string | number;
    dataLabelHorizontalPosition: string | number;
    dataLabelShow: boolean;
    dataLabelText: string | number;
    dataLabelVerticalPosition: string | number;
    displayName: string;
    lineColor: string;
    position: string | number;
    shadeColor: string;
    shadeColorMatchStroke: boolean;
    shadeRegion: string | number;
    shadeShow: boolean;
    shadeTransparency: number;
    show: boolean;
    style: string | number;
    transparency: number;
    value: number;
    width: number;
  };
  zoom: {
    categoryMax: number;
    categoryMin: number;
    categorySize: number;
    show: boolean;
    showLabels: boolean;
    showOnCategoryAxis: boolean;
    showOnValueAxis: boolean;
    showTooltip: boolean;
    valueMax: number;
    valueMin: number;
    valueSize: number;
  };
  smallMultiplesLayout: {
    advancedPaddingOptions: boolean;
    backgroundColor: string;
    backgroundTransparency: number;
    columnCount: number;
    columnPaddingInner: number;
    columnPaddingOuter: number;
    gridLineColor: string;
    gridLineShow: boolean;
    gridLineStyle: string | number;
    gridLineTransparency: number;
    gridLineType: string | number;
    gridLineWidth: number;
    gridPadding: number;
    layoutType: string | number;
    rowCount: number;
    rowPaddingInner: number;
    rowPaddingOuter: number;
  };
  subheader: {
    alignment: string | number;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    position: string | number;
    show: boolean;
    titleWrap: boolean;
    underline: boolean;
  };
  layout: {
    clusteredGapOverlapReverse: boolean;
    clusteredGapOverlaps: boolean;
    clusteredGapSize: number;
    seriesOrderReversed: boolean;
    seriesOrderSorted: boolean;
  };
};

/**
 * Resolves every Bar chart property to its theme override, falling back to
 * the shared theme tokens (palette/background/foreground) for colour-like
 * fields and a plain Power BI-typical default otherwise.
 */
export function resolveBarChartStyle(theme: ThemeSource, base: ResolvedTheme): ResolvedBarChartStyle {
  const p = BAR_CHART_PROPERTIES;
  /**
   * Power BI's text-class defaults for the roles this visual has.
   *
   * These stand in for the literal fallbacks (`6`, `""`) that
   * BASE_THEME_DIFFERENTIAL_AUDIT.md found in every typography property.
   * They are the LAST resort, not an override: `resolvePropertyValue`
   * still walks custom-visual, custom-wildcard, base-visual, base-wildcard
   * first, so an explicit `visualStyles` value — Fluent 2's
   * `categoryAxis.fontSize: 10.5`, say — continues to win exactly as
   * before. Only a property no layer declares reaches a text class.
   *
   * Clustered Bar is the pilot; the other registries still use literals
   * until this is accepted (PHASE_2_BACKLOG.md).
   */
  const categoryAxisLabelText = resolveTextRole(theme, "categoryAxisLabel");
  const categoryAxisTitleText = resolveTextRole(theme, "categoryAxisTitle");
  const valueAxisLabelText = resolveTextRole(theme, "valueAxisLabel");
  const valueAxisTitleText = resolveTextRole(theme, "valueAxisTitle");
  const legendText = resolveTextRole(theme, "legendText");
  const smallMultipleTitleText = resolveTextRole(theme, "smallMultipleTitle");
  const dataLabelText = resolveTextRole(theme, "dataLabel");
  const referenceLineLabelText = resolveTextRole(theme, "referenceLineLabel");
  /**
   * Each family in both forms: the raw theme value the editor reads, and
   * the family the preview paints. They differ only by provenance — an
   * explicit `visualStyles` family stays literal, because Power BI's own
   * visual-property reader never consults the alias table, while one that
   * falls through to a text class carries that class's expanded stack.
   */
  const catLabelFamily = effectiveFontFamily(theme, p.categoryAxis.fontFamily, categoryAxisLabelText);
  const catTitleFamily = effectiveFontFamily(theme, p.categoryAxis.titleFontFamily, categoryAxisTitleText);
  const valLabelFamily = effectiveFontFamily(theme, p.valueAxis.fontFamily, valueAxisLabelText);
  const valTitleFamily = effectiveFontFamily(theme, p.valueAxis.titleFontFamily, valueAxisTitleText);
  const legendFamily = effectiveFontFamily(theme, p.legend.fontFamily, legendText);
  const dataLabelFamily = effectiveFontFamily(theme, p.labels.fontFamily, dataLabelText);
  return {
    usesSmallMultiples: isGroupSetBy(theme, "clusteredBarChart", "smallMultiplesLayout", "custom"),
    dataPoint: {
      borderColor: resolvePropertyValue(theme, p.dataPoint.borderColor, nativeToken(theme, "foregroundNeutralSecondary")),
      borderColorMatchFill: resolvePropertyValue(theme, p.dataPoint.borderColorMatchFill, false),
      borderShow: resolvePropertyValue(theme, p.dataPoint.borderShow, false),
      borderSize: resolvePropertyValue(theme, p.dataPoint.borderSize, 1),
      borderTransparency: resolvePropertyValue(theme, p.dataPoint.borderTransparency, 0),
      defaultColor: resolvePropertyValue(theme, p.dataPoint.defaultColor, base.palette[0] ?? base.foreground),
      fill: resolvePropertyValue(theme, p.dataPoint.fill, base.palette[0] ?? base.foreground),
      fillTransparency: resolvePropertyValue(theme, p.dataPoint.fillTransparency, 0),
      borderOutlineOnly: resolvePropertyValue(theme, p.dataPoint.borderOutlineOnly, false),
    },
    categoryAxis: {
      axisStyle: resolvePropertyValue(theme, p.categoryAxis.axisStyle, "showTitleOnly"),
      axisType: resolvePropertyValue(theme, p.categoryAxis.axisType, "Scalar"),
      bold: resolvePropertyValue(theme, p.categoryAxis.bold, false),
      concatenateLabels: resolvePropertyValue(theme, p.categoryAxis.concatenateLabels, false),
      end: resolvePropertyValue(theme, p.categoryAxis.end, ""),
      fontFamily: catLabelFamily.value,
      fontFamilyCss: catLabelFamily.css,
      fontSize: resolvePropertyValue(theme, p.categoryAxis.fontSize, categoryAxisLabelText.fontSize),
      gridlineAutoScale: resolvePropertyValue(theme, p.categoryAxis.gridlineAutoScale, false),
      gridlineColor: resolvePropertyValue(theme, p.categoryAxis.gridlineColor, nativeToken(theme, "secondaryBackground")),
      gridlineDashArray: resolvePropertyValue(theme, p.categoryAxis.gridlineDashArray, ""),
      gridlineDashCap: resolvePropertyValue(theme, p.categoryAxis.gridlineDashCap, "none"),
      gridlineShow: resolvePropertyValue(theme, p.categoryAxis.gridlineShow, false),
      gridlineStyle: resolvePropertyValue(theme, p.categoryAxis.gridlineStyle, "solid"),
      gridlineThickness: resolvePropertyValue(theme, p.categoryAxis.gridlineThickness, 1),
      gridlineTransparency: resolvePropertyValue(theme, p.categoryAxis.gridlineTransparency, 0),
      innerPadding: resolvePropertyValue(theme, p.categoryAxis.innerPadding, CATEGORY_INNER_PADDING_DEFAULT),
      invertAxis: resolvePropertyValue(theme, p.categoryAxis.invertAxis, false),
      italic: resolvePropertyValue(theme, p.categoryAxis.italic, false),
      labelColor: resolvePropertyValue(theme, p.categoryAxis.labelColor, categoryAxisLabelText.color),
      labelDisplayUnits: resolvePropertyValue(theme, p.categoryAxis.labelDisplayUnits, 0),
      labelPrecision: resolvePropertyValue(theme, p.categoryAxis.labelPrecision, 0),
      logAxisScale: resolvePropertyValue(theme, p.categoryAxis.logAxisScale, false),
      maxMarginFactor: resolvePropertyValue(theme, p.categoryAxis.maxMarginFactor, 10),
      preferredCategoryWidth: resolvePropertyValue(theme, p.categoryAxis.preferredCategoryWidth, 0),
      roundRange: resolvePropertyValue(theme, p.categoryAxis.roundRange, false),
      show: resolvePropertyValue(theme, p.categoryAxis.show, true),
      showAxisTitle: resolvePropertyValue(theme, p.categoryAxis.showAxisTitle, false),
      start: resolvePropertyValue(theme, p.categoryAxis.start, ""),
      switchAxisPosition: resolvePropertyValue(theme, p.categoryAxis.switchAxisPosition, false),
      titleBold: resolvePropertyValue(theme, p.categoryAxis.titleBold, false),
      titleColor: resolvePropertyValue(theme, p.categoryAxis.titleColor, categoryAxisTitleText.color),
      titleFontFamily: catTitleFamily.value,
      titleFontFamilyCss: catTitleFamily.css,
      titleFontSize: resolvePropertyValue(theme, p.categoryAxis.titleFontSize, categoryAxisTitleText.fontSize),
      titleItalic: resolvePropertyValue(theme, p.categoryAxis.titleItalic, false),
      titleText: resolvePropertyValue(theme, p.categoryAxis.titleText, ""),
      titleUnderline: resolvePropertyValue(theme, p.categoryAxis.titleUnderline, false),
      underline: resolvePropertyValue(theme, p.categoryAxis.underline, false),
    },
    valueAxis: {
      axisStyle: resolvePropertyValue(theme, p.valueAxis.axisStyle, "showTitleOnly"),
      bold: resolvePropertyValue(theme, p.valueAxis.bold, false),
      end: resolvePropertyValue(theme, p.valueAxis.end, ""),
      fontFamily: valLabelFamily.value,
      fontFamilyCss: valLabelFamily.css,
      fontSize: resolvePropertyValue(theme, p.valueAxis.fontSize, valueAxisLabelText.fontSize),
      gridlineAutoScale: resolvePropertyValue(theme, p.valueAxis.gridlineAutoScale, false),
      gridlineColor: resolvePropertyValue(theme, p.valueAxis.gridlineColor, nativeToken(theme, "secondaryBackground")),
      gridlineDashArray: resolvePropertyValue(theme, p.valueAxis.gridlineDashArray, ""),
      gridlineDashCap: resolvePropertyValue(theme, p.valueAxis.gridlineDashCap, "none"),
      // Power BI draws value-axis gridlines on a new visual by default,
      // so a preview that hides them does not match an unstyled chart.
      gridlineShow: resolvePropertyValue(theme, p.valueAxis.gridlineShow, true),
      gridlineStyle: resolvePropertyValue(theme, p.valueAxis.gridlineStyle, CARTESIAN_NATIVE.gridline.style),
      gridlineThickness: resolvePropertyValue(theme, p.valueAxis.gridlineThickness, 1),
      gridlineTransparency: resolvePropertyValue(theme, p.valueAxis.gridlineTransparency, 0),
      invertAxis: resolvePropertyValue(theme, p.valueAxis.invertAxis, false),
      italic: resolvePropertyValue(theme, p.valueAxis.italic, false),
      labelColor: resolvePropertyValue(theme, p.valueAxis.labelColor, valueAxisLabelText.color),
      labelDisplayUnits: resolvePropertyValue(theme, p.valueAxis.labelDisplayUnits, 0),
      labelPrecision: resolvePropertyValue(theme, p.valueAxis.labelPrecision, 0),
      logAxisScale: resolvePropertyValue(theme, p.valueAxis.logAxisScale, false),
      roundRange: resolvePropertyValue(theme, p.valueAxis.roundRange, false),
      scaleToFit: resolvePropertyValue(theme, p.valueAxis.scaleToFit, false),
      sharedAxis: resolvePropertyValue(theme, p.valueAxis.sharedAxis, false),
      show: resolvePropertyValue(theme, p.valueAxis.show, true),
      showAxisTitle: resolvePropertyValue(theme, p.valueAxis.showAxisTitle, false),
      start: resolvePropertyValue(theme, p.valueAxis.start, ""),
      switchAxisPosition: resolvePropertyValue(theme, p.valueAxis.switchAxisPosition, false),
      titleBold: resolvePropertyValue(theme, p.valueAxis.titleBold, false),
      titleColor: resolvePropertyValue(theme, p.valueAxis.titleColor, valueAxisTitleText.color),
      titleFontFamily: valTitleFamily.value,
      titleFontFamilyCss: valTitleFamily.css,
      titleFontSize: resolvePropertyValue(theme, p.valueAxis.titleFontSize, valueAxisTitleText.fontSize),
      titleItalic: resolvePropertyValue(theme, p.valueAxis.titleItalic, false),
      titleText: resolvePropertyValue(theme, p.valueAxis.titleText, ""),
      titleUnderline: resolvePropertyValue(theme, p.valueAxis.titleUnderline, false),
      underline: resolvePropertyValue(theme, p.valueAxis.underline, false),
    },
    legend: {
      bold: resolvePropertyValue(theme, p.legend.bold, false),
      fontFamily: legendFamily.value,
      fontFamilyCss: legendFamily.css,
      fontSize: resolvePropertyValue(theme, p.legend.fontSize, legendText.fontSize),
      italic: resolvePropertyValue(theme, p.legend.italic, false),
      labelColor: resolvePropertyValue(theme, p.legend.labelColor, legendText.color),
      position: resolvePropertyValue(theme, p.legend.position, "Top"),
      show: resolvePropertyValue(theme, p.legend.show, true),
      // Verified against themes/base/classic2026.json's clusteredBarChart override.
      showGradientLegend: resolvePropertyValue(theme, p.legend.showGradientLegend, true),
      showTitle: resolvePropertyValue(theme, p.legend.showTitle, true),
      titleText: resolvePropertyValue(theme, p.legend.titleText, ""),
      underline: resolvePropertyValue(theme, p.legend.underline, false),
    },
    labels: {
      backgroundColor: resolvePropertyValue(theme, p.labels.backgroundColor, base.background),
      backgroundTransparency: resolvePropertyValue(theme, p.labels.backgroundTransparency, 0),
      bold: resolvePropertyValue(theme, p.labels.bold, false),
      // The main data-label value, whose Power BI role is smallLightLabel.
      // `detailColor` and the title fields keep the old fallback: their roles
      // are not established, and guessing them is the registry-completion
      // task's job, not this one's.
      color: resolvePropertyValue(theme, p.labels.color, dataLabelText.color),
      detailBold: resolvePropertyValue(theme, p.labels.detailBold, false),
      detailColor: resolvePropertyValue(theme, p.labels.detailColor, dataLabelText.color),
      detailContentType: resolvePropertyValue(theme, p.labels.detailContentType, "Percent of total"),
      detailCustomFormatString: resolvePropertyValue(theme, p.labels.detailCustomFormatString, ""),
      detailFontFamily: resolvePropertyValue(theme, p.labels.detailFontFamily, dataLabelText.fontFamily),
      detailFontSize: resolvePropertyValue(theme, p.labels.detailFontSize, dataLabelText.fontSize),
      detailFormatString: resolvePropertyValue(theme, p.labels.detailFormatString, ""),
      detailItalic: resolvePropertyValue(theme, p.labels.detailItalic, false),
      detailLabelDisplayUnits: resolvePropertyValue(theme, p.labels.detailLabelDisplayUnits, 0),
      detailLabelPrecision: resolvePropertyValue(theme, p.labels.detailLabelPrecision, 0),
      detailShowBlankAs: resolvePropertyValue(theme, p.labels.detailShowBlankAs, ""),
      detailTransparency: resolvePropertyValue(theme, p.labels.detailTransparency, 0),
      detailUnderline: resolvePropertyValue(theme, p.labels.detailUnderline, false),
      enableBackground: resolvePropertyValue(theme, p.labels.enableBackground, false),
      enableDetailDataLabel: resolvePropertyValue(theme, p.labels.enableDetailDataLabel, false),
      enableTitleDataLabel: resolvePropertyValue(theme, p.labels.enableTitleDataLabel, false),
      // The value is a data label's default content; title and detail are
      // additions to it, not replacements for it.
      enableValueDataLabel: resolvePropertyValue(theme, p.labels.enableValueDataLabel, true),
      fontFamily: dataLabelFamily.value,
      fontFamilyCss: dataLabelFamily.css,
      fontSize: resolvePropertyValue(theme, p.labels.fontSize, dataLabelText.fontSize),
      horizontalAlignment: resolvePropertyValue(theme, p.labels.horizontalAlignment, "left"),
      italic: resolvePropertyValue(theme, p.labels.italic, false),
      labelContainerMaxWidth: resolvePropertyValue(theme, p.labels.labelContainerMaxWidth, 0),
      labelContentLayout: resolvePropertyValue(theme, p.labels.labelContentLayout, "MultiLine"),
      // Density is a 0-100 dial for how many labels may be drawn; 0 means
      // none, so switching data labels on would still show nothing.
      labelDensity: resolvePropertyValue(theme, p.labels.labelDensity, 100),
      labelDisplayUnits: resolvePropertyValue(theme, p.labels.labelDisplayUnits, 0),
      labelOrientation: resolvePropertyValue(theme, p.labels.labelOrientation, 0),
      labelOverflow: resolvePropertyValue(theme, p.labels.labelOverflow, false),
      labelPosition: resolvePropertyValue(theme, p.labels.labelPosition, "Auto"),
      labelPrecision: resolvePropertyValue(theme, p.labels.labelPrecision, 0),
      optimizeLabelDisplay: resolvePropertyValue(theme, p.labels.optimizeLabelDisplay, false),
      show: resolvePropertyValue(theme, p.labels.show, false),
      showAll: resolvePropertyValue(theme, p.labels.showAll, false),
      showBlankAs: resolvePropertyValue(theme, p.labels.showBlankAs, ""),
      showByDefault: resolvePropertyValue(theme, p.labels.showByDefault, false),
      showDynamicLabels: resolvePropertyValue(theme, p.labels.showDynamicLabels, false),
      showSeries: resolvePropertyValue(theme, p.labels.showSeries, false),
      titleBold: resolvePropertyValue(theme, p.labels.titleBold, false),
      titleColor: resolvePropertyValue(theme, p.labels.titleColor, dataLabelText.color),
      titleContentType: resolvePropertyValue(theme, p.labels.titleContentType, "Series name"),
      titleCustomFormatString: resolvePropertyValue(theme, p.labels.titleCustomFormatString, ""),
      titleFontFamily: resolvePropertyValue(theme, p.labels.titleFontFamily, dataLabelText.fontFamily),
      titleFontSize: resolvePropertyValue(theme, p.labels.titleFontSize, dataLabelText.fontSize),
      titleFormatString: resolvePropertyValue(theme, p.labels.titleFormatString, ""),
      titleItalic: resolvePropertyValue(theme, p.labels.titleItalic, false),
      titleLabelDisplayUnits: resolvePropertyValue(theme, p.labels.titleLabelDisplayUnits, 0),
      titleLabelPrecision: resolvePropertyValue(theme, p.labels.titleLabelPrecision, 0),
      titleShowBlankAs: resolvePropertyValue(theme, p.labels.titleShowBlankAs, ""),
      titleTransparency: resolvePropertyValue(theme, p.labels.titleTransparency, 0),
      titleUnderline: resolvePropertyValue(theme, p.labels.titleUnderline, false),
      transparency: resolvePropertyValue(theme, p.labels.transparency, 0),
      underline: resolvePropertyValue(theme, p.labels.underline, false),
      valueCustomFormatString: resolvePropertyValue(theme, p.labels.valueCustomFormatString, ""),
      valueFormatString: resolvePropertyValue(theme, p.labels.valueFormatString, ""),
      wordWrap: resolvePropertyValue(theme, p.labels.wordWrap, false),
    },
    plotArea: {
      transparency: resolvePropertyValue(theme, p.plotArea.transparency, 0),
    },
    error: {
      barBorderColor: resolvePropertyValue(theme, p.error.barBorderColor, "#E3E3E3"),
      barBorderSize: resolvePropertyValue(theme, p.error.barBorderSize, 1),
      barColor: resolvePropertyValue(theme, p.error.barColor, base.palette[0] ?? base.foreground),
      barMatchSeriesColor: resolvePropertyValue(theme, p.error.barMatchSeriesColor, false),
      barShow: resolvePropertyValue(theme, p.error.barShow, false),
      barWidth: resolvePropertyValue(theme, p.error.barWidth, 1),
      enabled: resolvePropertyValue(theme, p.error.enabled, false),
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
      autoScale: resolvePropertyValue(theme, p.trend.autoScale, false),
      combineSeries: resolvePropertyValue(theme, p.trend.combineSeries, false),
      dashArray: resolvePropertyValue(theme, p.trend.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.trend.dashCap, "none"),
      displayName: resolvePropertyValue(theme, p.trend.displayName, ""),
      lineColor: resolvePropertyValue(theme, p.trend.lineColor, base.palette[0] ?? base.foreground),
      show: resolvePropertyValue(theme, p.trend.show, false),
      style: resolvePropertyValue(theme, p.trend.style, "solid"),
      transparency: resolvePropertyValue(theme, p.trend.transparency, 0),
      useHighlightValues: resolvePropertyValue(theme, p.trend.useHighlightValues, false),
      width: resolvePropertyValue(theme, p.trend.width, 1),
    },
    referenceLine: {
      autoScale: resolvePropertyValue(theme, p.referenceLine.autoScale, false),
      dashArray: resolvePropertyValue(theme, p.referenceLine.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.referenceLine.dashCap, "none"),
      dataLabelColor: resolvePropertyValue(theme, p.referenceLine.dataLabelColor, referenceLineLabelText.color),
      dataLabelDecimalPoints: resolvePropertyValue(theme, p.referenceLine.dataLabelDecimalPoints, 0),
      dataLabelDisplayUnits: resolvePropertyValue(theme, p.referenceLine.dataLabelDisplayUnits, 0),
      dataLabelHorizontalPosition: resolvePropertyValue(theme, p.referenceLine.dataLabelHorizontalPosition, "left"),
      dataLabelShow: resolvePropertyValue(theme, p.referenceLine.dataLabelShow, false),
      dataLabelText: resolvePropertyValue(theme, p.referenceLine.dataLabelText, "Value"),
      dataLabelVerticalPosition: resolvePropertyValue(theme, p.referenceLine.dataLabelVerticalPosition, "above"),
      displayName: resolvePropertyValue(theme, p.referenceLine.displayName, ""),
      lineColor: resolvePropertyValue(theme, p.referenceLine.lineColor, base.palette[0] ?? base.foreground),
      position: resolvePropertyValue(theme, p.referenceLine.position, "back"),
      shadeColor: resolvePropertyValue(theme, p.referenceLine.shadeColor, "#E3E3E3"),
      shadeColorMatchStroke: resolvePropertyValue(theme, p.referenceLine.shadeColorMatchStroke, false),
      shadeRegion: resolvePropertyValue(theme, p.referenceLine.shadeRegion, "before"),
      shadeShow: resolvePropertyValue(theme, p.referenceLine.shadeShow, false),
      shadeTransparency: resolvePropertyValue(theme, p.referenceLine.shadeTransparency, 0),
      show: resolvePropertyValue(theme, p.referenceLine.show, false),
      style: resolvePropertyValue(theme, p.referenceLine.style, "solid"),
      transparency: resolvePropertyValue(theme, p.referenceLine.transparency, 0),
      value: resolvePropertyValue(theme, p.referenceLine.value, 0),
      width: resolvePropertyValue(theme, p.referenceLine.width, 1),
    },
    xAxisReferenceLine: {
      autoScale: resolvePropertyValue(theme, p.xAxisReferenceLine.autoScale, false),
      dashArray: resolvePropertyValue(theme, p.xAxisReferenceLine.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.xAxisReferenceLine.dashCap, "none"),
      dataLabelColor: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelColor, referenceLineLabelText.color),
      dataLabelDecimalPoints: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelDecimalPoints, 0),
      dataLabelDisplayUnits: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelDisplayUnits, 0),
      dataLabelHorizontalPosition: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelHorizontalPosition, "left"),
      dataLabelShow: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelShow, false),
      dataLabelText: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelText, "Value"),
      dataLabelVerticalPosition: resolvePropertyValue(theme, p.xAxisReferenceLine.dataLabelVerticalPosition, "above"),
      displayName: resolvePropertyValue(theme, p.xAxisReferenceLine.displayName, ""),
      lineColor: resolvePropertyValue(theme, p.xAxisReferenceLine.lineColor, base.palette[0] ?? base.foreground),
      position: resolvePropertyValue(theme, p.xAxisReferenceLine.position, "back"),
      shadeColor: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeColor, "#E3E3E3"),
      shadeColorMatchStroke: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeColorMatchStroke, false),
      shadeRegion: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeRegion, "before"),
      shadeShow: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeShow, false),
      shadeTransparency: resolvePropertyValue(theme, p.xAxisReferenceLine.shadeTransparency, 0),
      show: resolvePropertyValue(theme, p.xAxisReferenceLine.show, false),
      style: resolvePropertyValue(theme, p.xAxisReferenceLine.style, "solid"),
      transparency: resolvePropertyValue(theme, p.xAxisReferenceLine.transparency, 0),
      value: resolvePropertyValue(theme, p.xAxisReferenceLine.value, ""),
      width: resolvePropertyValue(theme, p.xAxisReferenceLine.width, 1),
    },
    y1AxisReferenceLine: {
      autoScale: resolvePropertyValue(theme, p.y1AxisReferenceLine.autoScale, false),
      dashArray: resolvePropertyValue(theme, p.y1AxisReferenceLine.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.y1AxisReferenceLine.dashCap, "none"),
      dataLabelColor: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelColor, referenceLineLabelText.color),
      dataLabelDecimalPoints: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelDecimalPoints, 0),
      dataLabelDisplayUnits: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelDisplayUnits, 0),
      dataLabelHorizontalPosition: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelHorizontalPosition, "left"),
      dataLabelShow: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelShow, false),
      dataLabelText: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelText, "Value"),
      dataLabelVerticalPosition: resolvePropertyValue(theme, p.y1AxisReferenceLine.dataLabelVerticalPosition, "above"),
      displayName: resolvePropertyValue(theme, p.y1AxisReferenceLine.displayName, ""),
      lineColor: resolvePropertyValue(theme, p.y1AxisReferenceLine.lineColor, base.palette[0] ?? base.foreground),
      position: resolvePropertyValue(theme, p.y1AxisReferenceLine.position, "back"),
      shadeColor: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeColor, "#E3E3E3"),
      shadeColorMatchStroke: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeColorMatchStroke, false),
      shadeRegion: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeRegion, "before"),
      shadeShow: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeShow, false),
      shadeTransparency: resolvePropertyValue(theme, p.y1AxisReferenceLine.shadeTransparency, 0),
      show: resolvePropertyValue(theme, p.y1AxisReferenceLine.show, false),
      style: resolvePropertyValue(theme, p.y1AxisReferenceLine.style, "solid"),
      transparency: resolvePropertyValue(theme, p.y1AxisReferenceLine.transparency, 0),
      value: resolvePropertyValue(theme, p.y1AxisReferenceLine.value, 0),
      width: resolvePropertyValue(theme, p.y1AxisReferenceLine.width, 1),
    },
    zoom: {
      categoryMax: resolvePropertyValue(theme, p.zoom.categoryMax, 0),
      categoryMin: resolvePropertyValue(theme, p.zoom.categoryMin, 0),
      categorySize: resolvePropertyValue(theme, p.zoom.categorySize, 6),
      show: resolvePropertyValue(theme, p.zoom.show, false),
      showLabels: resolvePropertyValue(theme, p.zoom.showLabels, false),
      showOnCategoryAxis: resolvePropertyValue(theme, p.zoom.showOnCategoryAxis, false),
      showOnValueAxis: resolvePropertyValue(theme, p.zoom.showOnValueAxis, false),
      showTooltip: resolvePropertyValue(theme, p.zoom.showTooltip, false),
      valueMax: resolvePropertyValue(theme, p.zoom.valueMax, 0),
      valueMin: resolvePropertyValue(theme, p.zoom.valueMin, 0),
      valueSize: resolvePropertyValue(theme, p.zoom.valueSize, 6),
    },
    smallMultiplesLayout: {
      advancedPaddingOptions: resolvePropertyValue(theme, p.smallMultiplesLayout.advancedPaddingOptions, false),
      backgroundColor: resolvePropertyValue(theme, p.smallMultiplesLayout.backgroundColor, base.background),
      backgroundTransparency: resolvePropertyValue(theme, p.smallMultiplesLayout.backgroundTransparency, 0),
      columnCount: resolvePropertyValue(theme, p.smallMultiplesLayout.columnCount, 2),
      columnPaddingInner: resolvePropertyValue(theme, p.smallMultiplesLayout.columnPaddingInner, 10),
      columnPaddingOuter: resolvePropertyValue(theme, p.smallMultiplesLayout.columnPaddingOuter, 10),
      gridLineColor: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineColor, nativeToken(theme, "foreground")),
      gridLineShow: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineShow, false),
      gridLineStyle: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineStyle, "solid"),
      gridLineTransparency: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineTransparency, 0),
      // Verified against classic2026.json's clusteredBarChart override.
      gridLineType: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineType, "inner"),
      gridLineWidth: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineWidth, 1),
      gridPadding: resolvePropertyValue(theme, p.smallMultiplesLayout.gridPadding, 10),
      layoutType: resolvePropertyValue(theme, p.smallMultiplesLayout.layoutType, "auto"),
      rowCount: resolvePropertyValue(theme, p.smallMultiplesLayout.rowCount, 2),
      rowPaddingInner: resolvePropertyValue(theme, p.smallMultiplesLayout.rowPaddingInner, 10),
      rowPaddingOuter: resolvePropertyValue(theme, p.smallMultiplesLayout.rowPaddingOuter, 10),
    },
    subheader: {
      alignment: resolvePropertyValue(theme, p.subheader.alignment, "left"),
      bold: resolvePropertyValue(theme, p.subheader.bold, false),
      fontColor: resolvePropertyValue(theme, p.subheader.fontColor, smallMultipleTitleText.color),
      fontFamily: resolvePropertyValue(theme, p.subheader.fontFamily, smallMultipleTitleText.fontFamily),
      fontSize: resolvePropertyValue(theme, p.subheader.fontSize, smallMultipleTitleText.fontSize),
      italic: resolvePropertyValue(theme, p.subheader.italic, false),
      position: resolvePropertyValue(theme, p.subheader.position, "top"),
      show: resolvePropertyValue(theme, p.subheader.show, false),
      titleWrap: resolvePropertyValue(theme, p.subheader.titleWrap, false),
      underline: resolvePropertyValue(theme, p.subheader.underline, false),
    },
    layout: {
      clusteredGapOverlapReverse: resolvePropertyValue(theme, p.layout.clusteredGapOverlapReverse, false),
      clusteredGapOverlaps: resolvePropertyValue(theme, p.layout.clusteredGapOverlaps, false),
      clusteredGapSize: resolvePropertyValue(theme, p.layout.clusteredGapSize, 10),
      seriesOrderReversed: resolvePropertyValue(theme, p.layout.seriesOrderReversed, false),
      seriesOrderSorted: resolvePropertyValue(theme, p.layout.seriesOrderSorted, false),
    },
  };
}

export { propertyThemePath };
