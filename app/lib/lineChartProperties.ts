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
import type { ResolvedTheme } from "./theme";

/**
 * Line chart property registry, pinned to Microsoft's published schema
 * reportThemeSchema-2.156.json (microsoft/powerbi-desktop-samples). Grouped
 * exactly as Power BI Desktop's own format pane groups them, so the
 * property panel and Microsoft's own UI stay recognisable to each other.
 *
 * A few schema fields are intentionally not covered, all for the same
 * reasons established for the other visuals' registries:
 * - `annotationTemplate` (complex nested template object), `plotArea.image`
 *   (background image object), `labels.dynamicLabelDetail/Title/Value`
 *   (polymorphic string/number/boolean type) — same rationale as the other
 *   visuals' excluded complex/polymorphic fields.
 * - `filters` and `scalarKey` (whole groups) — filter/data-binding
 *   configuration, not a stylistic default; same rationale as Slicer's
 *   excluded `data` group.
 * - `anomalyDetection`'s BatchEnd/BatchStart/CategoryValue/ExpectedHigh/
 *   ExpectedLow/ExpectedValue/Value/isAnomalyHighlighted — computed
 *   anomaly-detection *results* and per-instance highlight state, not a
 *   style default (same "does it affect what's selected, or only how it
 *   looks" test). The rest of that group (confidence band and marker
 *   styling) is genuine style and is covered.
 * - `layout` is an empty schema group (no properties) — nothing to cover.
 *
 * Shared "visual chrome" groups common to every visual (title, background,
 * border, ...) are out of scope here, matching every other visual's
 * registry — this covers only what's specific to a line chart.
 */

export const LINE_CHART_PROPERTIES = {

  dataPoint: {
    defaultColor: colorProp("lineChart", "line.dataPoint.defaultColor", "Default color", "The main colour used for the line.", ["dataPoint", 0, "defaultColor"], undefined),
    fill: colorProp("lineChart", "line.dataPoint.fill", "Color", "The main colour used for the line.", ["dataPoint", 0, "fill"], undefined),
    showAllDataPoints: boolProp("lineChart", "line.dataPoint.showAllDataPoints", "Show all", "Whether the show all data points is turned on.", ["dataPoint", 0, "showAllDataPoints"], undefined),
    transparency: numberProp("lineChart", "line.dataPoint.transparency", "Area transparency", "How see-through the line appears — 0 is solid, 100 is invisible.", ["dataPoint", 0, "transparency"], 0, 100, undefined),
  },

  lineStyles: {
    interpolationSmooth: enumProp("lineChart", "line.lineStyles.interpolationSmooth", "Smooth type", "Sets the interpolation smooth's smooth type.", ["lineStyles", 0, "interpolationSmooth"], [{"value":"monotoneX","label":"Monotone"},{"value":"cardinal","label":"Cardinal"}] as const, undefined),
    interpolationSmoothParam: numberProp("lineChart", "line.lineStyles.interpolationSmoothParam", "Tension", "Sets the interpolation smooth param's tension.", ["lineStyles", 0, "interpolationSmoothParam"], -1000, 1000, undefined),
    interpolationStep: enumProp("lineChart", "line.lineStyles.interpolationStep", "Step position", "Sets the interpolation step's step position.", ["lineStyles", 0, "interpolationStep"], [{"value":"before","label":"Before"},{"value":"center","label":"Center"},{"value":"after","label":"After"}] as const, undefined),
    lineChartType: enumProp("lineChart", "line.lineStyles.lineChartType", "Interpolation type", "Set interpolation type between line data points.", ["lineStyles", 0, "lineChartType"], [{"value":"linear","label":"Linear"},{"value":"smooth","label":"Smooth"},{"value":"step","label":"Step"}] as const, undefined),
    lineStyle: enumProp("lineChart", "line.lineStyles.lineStyle", "Line style", "Sets the line's line style.", ["lineStyles", 0, "lineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    segmentAlignment: enumProp("lineChart", "line.lineStyles.segmentAlignment", "Segment type", "Sets the segment alignment's segment type.", ["lineStyles", 0, "segmentAlignment"], [{"value":"left","label":"Left"},{"value":"center","label":"Center"},{"value":"right","label":"Right"}] as const, undefined),
    segmentGradient: boolProp("lineChart", "line.lineStyles.segmentGradient", "Gradient", "Whether the segment gradient is turned on.", ["lineStyles", 0, "segmentGradient"], undefined),
    showSeries: boolProp("lineChart", "line.lineStyles.showSeries", "Customize series", "Whether the show series is turned on.", ["lineStyles", 0, "showSeries"], undefined),
    areaColor: colorProp("lineChart", "line.lineStyles.areaColor", "Color", "The colour of the area.", ["lineStyles", 0, "areaColor"], undefined, "Area"),
    areaMatchStrokeColor: boolProp("lineChart", "line.lineStyles.areaMatchStrokeColor", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["lineStyles", 0, "areaMatchStrokeColor"], undefined, "Area"),
    areaShow: boolProp("lineChart", "line.lineStyles.areaShow", "Shade area", "Whether the area is shown.", ["lineStyles", 0, "areaShow"], undefined, "Area"),
    markerColor: colorProp("lineChart", "line.lineStyles.markerColor", "Color", "The colour of the marker.", ["lineStyles", 0, "markerColor"], undefined, "Marker"),
    markerShape: enumProp("lineChart", "line.lineStyles.markerShape", "Type", "Sets the marker shape's type.", ["lineStyles", 0, "markerShape"], [{"value":"circle","label":"●"},{"value":"square","label":"■"},{"value":"diamond","label":"◆"},{"value":"triangle","label":"▲"},{"value":"x","label":"☓"},{"value":"shortDash","label":" -"},{"value":"longDash","label":"—"},{"value":"plus","label":"+"}] as const, undefined, "Marker"),
    markerSize: numberProp("lineChart", "line.lineStyles.markerSize", "Size", "Sets the marker's size.", ["lineStyles", 0, "markerSize"], 1, 60, undefined, "Marker"),
    showMarker: boolProp("lineChart", "line.lineStyles.showMarker", "Show", "Whether the show marker is turned on.", ["lineStyles", 0, "showMarker"], undefined, "Marker"),
    showMarkerByDefault: boolProp("lineChart", "line.lineStyles.showMarkerByDefault", "Show marker by default", "Whether the show marker by default is turned on.", ["lineStyles", 0, "showMarkerByDefault"], undefined, "Marker"),
    strokeAutoScale: boolProp("lineChart", "line.lineStyles.strokeAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["lineStyles", 0, "strokeAutoScale"], undefined, "Stroke"),
    strokeColor: colorProp("lineChart", "line.lineStyles.strokeColor", "Color", "The colour of the stroke.", ["lineStyles", 0, "strokeColor"], undefined, "Stroke"),
    strokeDashArray: textProp("lineChart", "line.lineStyles.strokeDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["lineStyles", 0, "strokeDashArray"], undefined, "Stroke"),
    strokeDashCap: enumProp("lineChart", "line.lineStyles.strokeDashCap", "Dash cap", "Sets the stroke dash cap.", ["lineStyles", 0, "strokeDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Stroke"),
    strokeLineJoin: enumProp("lineChart", "line.lineStyles.strokeLineJoin", "Join type", "Sets the stroke line join's join type.", ["lineStyles", 0, "strokeLineJoin"], [{"value":"miter","label":"Miter"},{"value":"round","label":"Round"},{"value":"bevel","label":"Bevel"}] as const, undefined, "Stroke"),
    strokeShow: boolProp("lineChart", "line.lineStyles.strokeShow", "Show", "Whether the stroke is shown.", ["lineStyles", 0, "strokeShow"], undefined, "Stroke"),
    strokeTransparency: numberProp("lineChart", "line.lineStyles.strokeTransparency", "Transparency", "How see-through the stroke appears — 0 is solid, 100 is invisible.", ["lineStyles", 0, "strokeTransparency"], 0, 100, undefined, "Stroke"),
    strokeWidth: numberProp("lineChart", "line.lineStyles.strokeWidth", "Width", "The thickness, in pixels, of the stroke width.", ["lineStyles", 0, "strokeWidth"], 0, 10, undefined, "Stroke"),
  },

  markers: {
    borderColor: colorProp("lineChart", "line.markers.borderColor", "Color", "The colour of the border.", ["markers", 0, "borderColor"], undefined),
    borderColorMatchFill: boolProp("lineChart", "line.markers.borderColorMatchFill", "Match fill color", "Match the border color to the main shape color.", ["markers", 0, "borderColorMatchFill"], undefined),
    borderShow: boolProp("lineChart", "line.markers.borderShow", "Border", "Whether the border is shown.", ["markers", 0, "borderShow"], undefined),
    borderTransparency: numberProp("lineChart", "line.markers.borderTransparency", "Border transparency", "How see-through the border appears — 0 is solid, 100 is invisible.", ["markers", 0, "borderTransparency"], 0, 100, undefined),
    borderWidth: numberProp("lineChart", "line.markers.borderWidth", "Width", "The thickness, in pixels, of the border width.", ["markers", 0, "borderWidth"], 0, 10, undefined),
    rotation: numberProp("lineChart", "line.markers.rotation", "Rotation", "Sets the rotation.", ["markers", 0, "rotation"], 0, 360, undefined),
    transparency: numberProp("lineChart", "line.markers.transparency", "Transparency", "How see-through the markers appears — 0 is solid, 100 is invisible.", ["markers", 0, "transparency"], 0, 100, undefined),
  },

  categoryAxis: {
    show: boolProp("lineChart", "line.categoryAxis.show", "Show", "Whether the category axis is shown.", ["categoryAxis", 0, "show"], undefined),
    axisStyle: enumProp("lineChart", "line.categoryAxis.axisStyle", "Style", "Sets the axis's style.", ["categoryAxis", 0, "axisStyle"], [{"value":"showTitleOnly","label":"Show title only"},{"value":"showUnitOnly","label":"Show unit only"},{"value":"showBoth","label":"Show both"}] as const, undefined),
    axisType: enumProp("lineChart", "line.categoryAxis.axisType", "Type", "Sets the axis type.", ["categoryAxis", 0, "axisType"], [{"value":"Scalar","label":"Continuous"},{"value":"Categorical","label":"Categorical"}] as const, undefined),
    bold: boolProp("lineChart", "line.categoryAxis.bold", "Bold", "Whether the category axis's text is bold.", ["categoryAxis", 0, "bold"], undefined),
    concatenateLabels: boolProp("lineChart", "line.categoryAxis.concatenateLabels", "Concatenate labels", "Always concatenate levels of the hierarchy instead of drawing the hierarchy", ["categoryAxis", 0, "concatenateLabels"], undefined),
    end: textProp("lineChart", "line.categoryAxis.end", "End", "Enter an ending value (optional)", ["categoryAxis", 0, "end"], undefined),
    fontFamily: textProp("lineChart", "line.categoryAxis.fontFamily", "Font family", "The typeface used for the category axis.", ["categoryAxis", 0, "fontFamily"], undefined),
    fontSize: numberProp("lineChart", "line.categoryAxis.fontSize", "Text size", "Sets the category axis's text size.", ["categoryAxis", 0, "fontSize"], 8, 60, undefined),
    invertAxis: boolProp("lineChart", "line.categoryAxis.invertAxis", "Invert axis", "Whether the invert axis is turned on.", ["categoryAxis", 0, "invertAxis"], undefined),
    italic: boolProp("lineChart", "line.categoryAxis.italic", "Italic", "Whether the category axis's text is italic.", ["categoryAxis", 0, "italic"], undefined),
    labelColor: colorProp("lineChart", "line.categoryAxis.labelColor", "Color", "The colour of the label.", ["categoryAxis", 0, "labelColor"], undefined),
    labelDisplayUnits: enumProp("lineChart", "line.categoryAxis.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["categoryAxis", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    labelPrecision: numberProp("lineChart", "line.categoryAxis.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["categoryAxis", 0, "labelPrecision"], 0, 10, undefined),
    logAxisScale: boolProp("lineChart", "line.categoryAxis.logAxisScale", "Logarithmic scale", "Whether the log axis scale is turned on.", ["categoryAxis", 0, "logAxisScale"], undefined),
    maxMarginFactor: numberProp("lineChart", "line.categoryAxis.maxMarginFactor", "Maximum size", "The maximum percent of the visual allowed for the axis", ["categoryAxis", 0, "maxMarginFactor"], 1, 60, undefined),
    preferredCategoryWidth: numberProp("lineChart", "line.categoryAxis.preferredCategoryWidth", "Minimum category width", "Sets the preferred category width.", ["categoryAxis", 0, "preferredCategoryWidth"], -1000, 1000, undefined),
    roundRange: boolProp("lineChart", "line.categoryAxis.roundRange", "Round range", "Round range limits to the nearest multiple.", ["categoryAxis", 0, "roundRange"], undefined),
    showAxisTitle: boolProp("lineChart", "line.categoryAxis.showAxisTitle", "Title", "Title for the X-axis", ["categoryAxis", 0, "showAxisTitle"], undefined),
    start: textProp("lineChart", "line.categoryAxis.start", "Start", "Enter a starting value (optional)", ["categoryAxis", 0, "start"], undefined),
    underline: boolProp("lineChart", "line.categoryAxis.underline", "Underline", "Whether the category axis's text is underlined.", ["categoryAxis", 0, "underline"], undefined),
    gridlineAutoScale: boolProp("lineChart", "line.categoryAxis.gridlineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["categoryAxis", 0, "gridlineAutoScale"], undefined, "Gridline"),
    gridlineColor: colorProp("lineChart", "line.categoryAxis.gridlineColor", "Color", "The colour of the gridline.", ["categoryAxis", 0, "gridlineColor"], undefined, "Gridline"),
    gridlineDashArray: textProp("lineChart", "line.categoryAxis.gridlineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["categoryAxis", 0, "gridlineDashArray"], undefined, "Gridline"),
    gridlineDashCap: enumProp("lineChart", "line.categoryAxis.gridlineDashCap", "Dash cap", "Sets the gridline dash cap.", ["categoryAxis", 0, "gridlineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Gridline"),
    gridlineShow: boolProp("lineChart", "line.categoryAxis.gridlineShow", "Show", "Whether the gridline is shown.", ["categoryAxis", 0, "gridlineShow"], undefined, "Gridline"),
    gridlineStyle: enumProp("lineChart", "line.categoryAxis.gridlineStyle", "Line style", "Sets the gridline's line style.", ["categoryAxis", 0, "gridlineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Gridline"),
    gridlineThickness: numberProp("lineChart", "line.categoryAxis.gridlineThickness", "Width", "The thickness, in pixels, of the gridline.", ["categoryAxis", 0, "gridlineThickness"], 0, 10, undefined, "Gridline"),
    gridlineTransparency: numberProp("lineChart", "line.categoryAxis.gridlineTransparency", "Transparency", "How see-through the gridline appears — 0 is solid, 100 is invisible.", ["categoryAxis", 0, "gridlineTransparency"], 0, 100, undefined, "Gridline"),
    titleBold: boolProp("lineChart", "line.categoryAxis.titleBold", "Bold", "Whether the title is bold.", ["categoryAxis", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("lineChart", "line.categoryAxis.titleColor", "Title color", "The colour of the title.", ["categoryAxis", 0, "titleColor"], undefined, "Title"),
    titleFontFamily: textProp("lineChart", "line.categoryAxis.titleFontFamily", "Font family", "The typeface used for the title.", ["categoryAxis", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("lineChart", "line.categoryAxis.titleFontSize", "Title text size", "Sets the title's title text size.", ["categoryAxis", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleItalic: boolProp("lineChart", "line.categoryAxis.titleItalic", "Italic", "Whether the title is italic.", ["categoryAxis", 0, "titleItalic"], undefined, "Title"),
    titleText: textProp("lineChart", "line.categoryAxis.titleText", "Axis title", "The custom text used for the title.", ["categoryAxis", 0, "titleText"], undefined, "Title"),
    titleUnderline: boolProp("lineChart", "line.categoryAxis.titleUnderline", "Underline", "Whether the title is underlined.", ["categoryAxis", 0, "titleUnderline"], undefined, "Title"),
  },

  valueAxis: {
    show: boolProp("lineChart", "line.valueAxis.show", "Show", "Whether the value axis is shown.", ["valueAxis", 0, "show"], undefined),
    axisStyle: enumProp("lineChart", "line.valueAxis.axisStyle", "Style", "Sets the axis's style.", ["valueAxis", 0, "axisStyle"], [{"value":"showTitleOnly","label":"Show title only"},{"value":"showUnitOnly","label":"Show unit only"},{"value":"showBoth","label":"Show both"}] as const, undefined),
    bold: boolProp("lineChart", "line.valueAxis.bold", "Bold", "Whether the value axis's text is bold.", ["valueAxis", 0, "bold"], undefined),
    end: textProp("lineChart", "line.valueAxis.end", "End", "Enter an ending value (optional)", ["valueAxis", 0, "end"], undefined),
    fontFamily: textProp("lineChart", "line.valueAxis.fontFamily", "Font family", "The typeface used for the value axis.", ["valueAxis", 0, "fontFamily"], undefined),
    fontSize: numberProp("lineChart", "line.valueAxis.fontSize", "Text size", "Sets the value axis's text size.", ["valueAxis", 0, "fontSize"], 8, 60, undefined),
    invertAxis: boolProp("lineChart", "line.valueAxis.invertAxis", "Invert axis", "Whether the invert axis is turned on.", ["valueAxis", 0, "invertAxis"], undefined),
    italic: boolProp("lineChart", "line.valueAxis.italic", "Italic", "Whether the value axis's text is italic.", ["valueAxis", 0, "italic"], undefined),
    labelColor: colorProp("lineChart", "line.valueAxis.labelColor", "Color", "The colour of the label.", ["valueAxis", 0, "labelColor"], undefined),
    labelDisplayUnits: enumProp("lineChart", "line.valueAxis.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["valueAxis", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    labelPrecision: numberProp("lineChart", "line.valueAxis.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["valueAxis", 0, "labelPrecision"], 0, 10, undefined),
    logAxisScale: boolProp("lineChart", "line.valueAxis.logAxisScale", "Logarithmic scale", "Whether the log axis scale is turned on.", ["valueAxis", 0, "logAxisScale"], undefined),
    roundRange: boolProp("lineChart", "line.valueAxis.roundRange", "Round range", "Round range limits to the nearest multiple.", ["valueAxis", 0, "roundRange"], undefined),
    scaleToFit: boolProp("lineChart", "line.valueAxis.scaleToFit", "Scale to fit", "Whether the scale to fit is turned on.", ["valueAxis", 0, "scaleToFit"], undefined),
    sharedAxis: boolProp("lineChart", "line.valueAxis.sharedAxis", "Shared y-axis", "Whether the shared axis is turned on.", ["valueAxis", 0, "sharedAxis"], undefined),
    showAxisTitle: boolProp("lineChart", "line.valueAxis.showAxisTitle", "Title", "Title for the Y-axis", ["valueAxis", 0, "showAxisTitle"], undefined),
    start: textProp("lineChart", "line.valueAxis.start", "Start", "Enter a starting value (optional)", ["valueAxis", 0, "start"], undefined),
    switchAxisPosition: boolProp("lineChart", "line.valueAxis.switchAxisPosition", "Switch axis position", "Whether the switch axis position is turned on.", ["valueAxis", 0, "switchAxisPosition"], undefined),
    underline: boolProp("lineChart", "line.valueAxis.underline", "Underline", "Whether the value axis's text is underlined.", ["valueAxis", 0, "underline"], undefined),
    gridlineAutoScale: boolProp("lineChart", "line.valueAxis.gridlineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["valueAxis", 0, "gridlineAutoScale"], undefined, "Gridline"),
    gridlineColor: colorProp("lineChart", "line.valueAxis.gridlineColor", "Color", "The colour of the gridline.", ["valueAxis", 0, "gridlineColor"], undefined, "Gridline"),
    gridlineDashArray: textProp("lineChart", "line.valueAxis.gridlineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["valueAxis", 0, "gridlineDashArray"], undefined, "Gridline"),
    gridlineDashCap: enumProp("lineChart", "line.valueAxis.gridlineDashCap", "Dash cap", "Sets the gridline dash cap.", ["valueAxis", 0, "gridlineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Gridline"),
    gridlineShow: boolProp("lineChart", "line.valueAxis.gridlineShow", "Show", "Whether the gridline is shown.", ["valueAxis", 0, "gridlineShow"], undefined, "Gridline"),
    gridlineStyle: enumProp("lineChart", "line.valueAxis.gridlineStyle", "Line style", "Sets the gridline's line style.", ["valueAxis", 0, "gridlineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Gridline"),
    gridlineThickness: numberProp("lineChart", "line.valueAxis.gridlineThickness", "Width", "The thickness, in pixels, of the gridline.", ["valueAxis", 0, "gridlineThickness"], 0, 10, undefined, "Gridline"),
    gridlineTransparency: numberProp("lineChart", "line.valueAxis.gridlineTransparency", "Transparency", "How see-through the gridline appears — 0 is solid, 100 is invisible.", ["valueAxis", 0, "gridlineTransparency"], 0, 100, undefined, "Gridline"),
    titleBold: boolProp("lineChart", "line.valueAxis.titleBold", "Bold", "Whether the title is bold.", ["valueAxis", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("lineChart", "line.valueAxis.titleColor", "Title color", "The colour of the title.", ["valueAxis", 0, "titleColor"], undefined, "Title"),
    titleFontFamily: textProp("lineChart", "line.valueAxis.titleFontFamily", "Font family", "The typeface used for the title.", ["valueAxis", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("lineChart", "line.valueAxis.titleFontSize", "Title text size", "Sets the title's title text size.", ["valueAxis", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleItalic: boolProp("lineChart", "line.valueAxis.titleItalic", "Italic", "Whether the title is italic.", ["valueAxis", 0, "titleItalic"], undefined, "Title"),
    titleText: textProp("lineChart", "line.valueAxis.titleText", "Axis title", "The custom text used for the title.", ["valueAxis", 0, "titleText"], undefined, "Title"),
    titleUnderline: boolProp("lineChart", "line.valueAxis.titleUnderline", "Underline", "Whether the title is underlined.", ["valueAxis", 0, "titleUnderline"], undefined, "Title"),
  },

  y2Axis: {
    show: boolProp("lineChart", "line.y2Axis.show", "Show", "Whether the secondary axis is shown.", ["y2Axis", 0, "show"], undefined),
    secAxisStyle: enumProp("lineChart", "line.y2Axis.secAxisStyle", "Style", "Sets the sec axis's style.", ["y2Axis", 0, "secAxisStyle"], [{"value":"showTitleOnly","label":"Show title only"},{"value":"showUnitOnly","label":"Show unit only"},{"value":"showBoth","label":"Show both"}] as const, undefined),
    secBold: boolProp("lineChart", "line.y2Axis.secBold", "Bold", "Whether the sec is bold.", ["y2Axis", 0, "secBold"], undefined),
    secEnd: numberProp("lineChart", "line.y2Axis.secEnd", "End", "Enter an ending value (optional)", ["y2Axis", 0, "secEnd"], -1000, 1000, undefined),
    secFontFamily: textProp("lineChart", "line.y2Axis.secFontFamily", "Font family", "The typeface used for the sec.", ["y2Axis", 0, "secFontFamily"], undefined),
    secFontSize: numberProp("lineChart", "line.y2Axis.secFontSize", "Text size", "Sets the sec's text size.", ["y2Axis", 0, "secFontSize"], 8, 60, undefined),
    secItalic: boolProp("lineChart", "line.y2Axis.secItalic", "Italic", "Whether the sec is italic.", ["y2Axis", 0, "secItalic"], undefined),
    secLabelColor: colorProp("lineChart", "line.y2Axis.secLabelColor", "Color", "The colour of the sec label.", ["y2Axis", 0, "secLabelColor"], undefined),
    secLabelDisplayUnits: enumProp("lineChart", "line.y2Axis.secLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["y2Axis", 0, "secLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    secLabelPrecision: numberProp("lineChart", "line.y2Axis.secLabelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["y2Axis", 0, "secLabelPrecision"], 0, 10, undefined),
    secLogAxisScale: boolProp("lineChart", "line.y2Axis.secLogAxisScale", "Logarithmic scale", "Whether the sec log axis scale is turned on.", ["y2Axis", 0, "secLogAxisScale"], undefined),
    secRoundRange: boolProp("lineChart", "line.y2Axis.secRoundRange", "Round range", "Round range limits to the nearest multiple.", ["y2Axis", 0, "secRoundRange"], undefined),
    secShowAxisTitle: boolProp("lineChart", "line.y2Axis.secShowAxisTitle", "Title", "Title for the Y-axis", ["y2Axis", 0, "secShowAxisTitle"], undefined),
    secStart: numberProp("lineChart", "line.y2Axis.secStart", "Start", "Enter a starting value (optional)", ["y2Axis", 0, "secStart"], -1000, 1000, undefined),
    secUnderline: boolProp("lineChart", "line.y2Axis.secUnderline", "Underline", "Whether the sec is underlined.", ["y2Axis", 0, "secUnderline"], undefined),
    secTitleBold: boolProp("lineChart", "line.y2Axis.secTitleBold", "Bold", "Whether the sec title is bold.", ["y2Axis", 0, "secTitleBold"], undefined, "Title"),
    secTitleColor: colorProp("lineChart", "line.y2Axis.secTitleColor", "Title color", "The colour of the sec title.", ["y2Axis", 0, "secTitleColor"], undefined, "Title"),
    secTitleFontFamily: textProp("lineChart", "line.y2Axis.secTitleFontFamily", "Font family", "The typeface used for the sec title.", ["y2Axis", 0, "secTitleFontFamily"], undefined, "Title"),
    secTitleFontSize: numberProp("lineChart", "line.y2Axis.secTitleFontSize", "Title text size", "Sets the sec title's title text size.", ["y2Axis", 0, "secTitleFontSize"], 8, 60, undefined, "Title"),
    secTitleItalic: boolProp("lineChart", "line.y2Axis.secTitleItalic", "Italic", "Whether the sec title is italic.", ["y2Axis", 0, "secTitleItalic"], undefined, "Title"),
    secTitleText: textProp("lineChart", "line.y2Axis.secTitleText", "Axis title", "The custom text used for the sec title.", ["y2Axis", 0, "secTitleText"], undefined, "Title"),
    secTitleUnderline: boolProp("lineChart", "line.y2Axis.secTitleUnderline", "Underline", "Whether the sec title is underlined.", ["y2Axis", 0, "secTitleUnderline"], undefined, "Title"),
  },

  legend: {
    show: boolProp("lineChart", "line.legend.show", "Show", "Whether the legend is shown.", ["legend", 0, "show"], undefined),
    bold: boolProp("lineChart", "line.legend.bold", "Bold", "Whether the legend's text is bold.", ["legend", 0, "bold"], undefined),
    fontFamily: textProp("lineChart", "line.legend.fontFamily", "Font family", "The typeface used for the legend.", ["legend", 0, "fontFamily"], undefined),
    fontSize: numberProp("lineChart", "line.legend.fontSize", "Text size", "Sets the legend's text size.", ["legend", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("lineChart", "line.legend.italic", "Italic", "Whether the legend's text is italic.", ["legend", 0, "italic"], undefined),
    labelColor: colorProp("lineChart", "line.legend.labelColor", "Color", "The colour of the label.", ["legend", 0, "labelColor"], undefined),
    legendMarkerRendering: enumProp("lineChart", "line.legend.legendMarkerRendering", "Style", "Select the style for the legend", ["legend", 0, "legendMarkerRendering"], [{"value":"markerCircleDefault","label":"Marker (circle default)"},{"value":"markerOnly","label":"Marker"},{"value":"lineOnly","label":"Line"},{"value":"lineAndMarker","label":"Line and markers"}] as const, undefined),
    matchLineColor: boolProp("lineChart", "line.legend.matchLineColor", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["legend", 0, "matchLineColor"], undefined),
    position: enumProp("lineChart", "line.legend.position", "Position", "Select the location for the legend", ["legend", 0, "position"], [{"value":"Top","label":"Top left"},{"value":"TopCenter","label":"Top center"},{"value":"TopRight","label":"Top right"},{"value":"Left","label":"Top left stacked"},{"value":"Right","label":"Top right stacked"},{"value":"LeftCenter","label":"Center left"},{"value":"RightCenter","label":"Center right"},{"value":"Bottom","label":"Bottom left"},{"value":"BottomCenter","label":"Bottom center"},{"value":"BottomRight","label":"Bottom right"}] as const, undefined),
    underline: boolProp("lineChart", "line.legend.underline", "Underline", "Whether the legend's text is underlined.", ["legend", 0, "underline"], undefined),
    showTitle: boolProp("lineChart", "line.legend.showTitle", "Title", "Display a title for legend symbols", ["legend", 0, "showTitle"], undefined, "Title"),
    titleText: textProp("lineChart", "line.legend.titleText", "Legend Name", "Title text", ["legend", 0, "titleText"], undefined, "Title"),
  },

  labels: {
    show: boolProp("lineChart", "line.labels.show", "Show", "Whether the data labels are shown.", ["labels", 0, "show"], undefined),
    backgroundColor: colorProp("lineChart", "line.labels.backgroundColor", "Color", "Background color", ["labels", 0, "backgroundColor"], undefined, "Background"),
    backgroundTransparency: numberProp("lineChart", "line.labels.backgroundTransparency", "Transparency", "Background color transparency", ["labels", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
    enableBackground: boolProp("lineChart", "line.labels.enableBackground", "Show background", "Whether the enable background is turned on.", ["labels", 0, "enableBackground"], undefined, "Background"),
    bold: boolProp("lineChart", "line.labels.bold", "Bold", "Whether the data labels's text is bold.", ["labels", 0, "bold"], undefined, "Value"),
    color: colorProp("lineChart", "line.labels.color", "Color", "Select color for data labels", ["labels", 0, "color"], undefined, "Value"),
    enableDetailDataLabel: boolProp("lineChart", "line.labels.enableDetailDataLabel", "Enable detail label", "Whether the enable detail data label is turned on.", ["labels", 0, "enableDetailDataLabel"], undefined, "Value"),
    enableTitleDataLabel: boolProp("lineChart", "line.labels.enableTitleDataLabel", "Enable title label", "Whether the enable title data label is turned on.", ["labels", 0, "enableTitleDataLabel"], undefined, "Value"),
    enableValueDataLabel: boolProp("lineChart", "line.labels.enableValueDataLabel", "Enable value label", "Whether the enable value data label is turned on.", ["labels", 0, "enableValueDataLabel"], undefined, "Value"),
    fontFamily: textProp("lineChart", "line.labels.fontFamily", "Font family", "The typeface used for the data labels.", ["labels", 0, "fontFamily"], undefined, "Value"),
    fontSize: numberProp("lineChart", "line.labels.fontSize", "Text size", "Sets the data labels's text size.", ["labels", 0, "fontSize"], 8, 60, undefined, "Value"),
    horizontalAlignment: enumProp("lineChart", "line.labels.horizontalAlignment", "Horizontal alignment", "Sets the horizontal alignment.", ["labels", 0, "horizontalAlignment"], [{"value":"left","label":"left"},{"value":"center","label":"center"},{"value":"right","label":"right"}] as const, undefined, "Value"),
    italic: boolProp("lineChart", "line.labels.italic", "Italic", "Whether the data labels's text is italic.", ["labels", 0, "italic"], undefined, "Value"),
    labelContainerMaxWidth: numberProp("lineChart", "line.labels.labelContainerMaxWidth", "Maximum width", "Sets the label container max width.", ["labels", 0, "labelContainerMaxWidth"], -1000, 1000, undefined, "Value"),
    labelContentLayout: enumProp("lineChart", "line.labels.labelContentLayout", "Layout", "Sets the label content layout.", ["labels", 0, "labelContentLayout"], [{"value":"MultiLine","label":"Multi-line"},{"value":"SingleLine","label":"Single line"}] as const, undefined, "Value"),
    labelDensity: numberProp("lineChart", "line.labels.labelDensity", "Label density", "Sets the label density.", ["labels", 0, "labelDensity"], -1000, 1000, undefined, "Value"),
    labelDisplayUnits: enumProp("lineChart", "line.labels.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Value"),
    labelPosition: enumProp("lineChart", "line.labels.labelPosition", "Position", "Sets the label position.", ["labels", 0, "labelPosition"], [{"value":"Auto","label":"Auto"},{"value":"InsideEnd","label":"Inside end"},{"value":"OutsideEnd","label":"Outside end"},{"value":"InsideCenter","label":"Inside center"},{"value":"InsideBase","label":"Inside base"},{"value":"Above","label":"Above"},{"value":"Under","label":"Under"}] as const, undefined, "Value"),
    labelPrecision: numberProp("lineChart", "line.labels.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "labelPrecision"], 0, 10, undefined, "Value"),
    maximumOffset: numberProp("lineChart", "line.labels.maximumOffset", "Maximum offset", "Sets the maximum offset.", ["labels", 0, "maximumOffset"], 0, 50, undefined, "Value"),
    minimumOffset: numberProp("lineChart", "line.labels.minimumOffset", "Minimum offset", "Sets the minimum offset.", ["labels", 0, "minimumOffset"], 0, 50, undefined, "Value"),
    optimizeLabelDisplay: boolProp("lineChart", "line.labels.optimizeLabelDisplay", "Optimize label display", "Whether the optimize label display is turned on.", ["labels", 0, "optimizeLabelDisplay"], undefined, "Value"),
    showAll: boolProp("lineChart", "line.labels.showAll", "Customize series", "Whether the show all is turned on.", ["labels", 0, "showAll"], undefined, "Value"),
    showBlankAs: textProp("lineChart", "line.labels.showBlankAs", "Show blank as", "The custom text used for the show blank as.", ["labels", 0, "showBlankAs"], undefined, "Value"),
    showByDefault: boolProp("lineChart", "line.labels.showByDefault", "Show by default", "Whether the show by default is turned on.", ["labels", 0, "showByDefault"], undefined, "Value"),
    showDynamicLabels: boolProp("lineChart", "line.labels.showDynamicLabels", "Custom label", "Whether the show dynamic labels is turned on.", ["labels", 0, "showDynamicLabels"], undefined, "Value"),
    showSeries: boolProp("lineChart", "line.labels.showSeries", "Show", "Whether the show series is turned on.", ["labels", 0, "showSeries"], undefined, "Value"),
    transparency: numberProp("lineChart", "line.labels.transparency", "Transparency", "How see-through the data labels appears — 0 is solid, 100 is invisible.", ["labels", 0, "transparency"], 0, 100, undefined, "Value"),
    underline: boolProp("lineChart", "line.labels.underline", "Underline", "Whether the data labels's text is underlined.", ["labels", 0, "underline"], undefined, "Value"),
    valueCustomFormatString: textProp("lineChart", "line.labels.valueCustomFormatString", "Format code", "Enter a custom number format for your callout.", ["labels", 0, "valueCustomFormatString"], undefined, "Value"),
    valueFormatString: textProp("lineChart", "line.labels.valueFormatString", "Value format string", "The custom text used for the value format string.", ["labels", 0, "valueFormatString"], undefined, "Value"),
    detailBold: boolProp("lineChart", "line.labels.detailBold", "Bold", "Whether the detail is bold.", ["labels", 0, "detailBold"], undefined, "Detail"),
    detailColor: colorProp("lineChart", "line.labels.detailColor", "Color", "Select color for data labels", ["labels", 0, "detailColor"], undefined, "Detail"),
    detailContentType: enumProp("lineChart", "line.labels.detailContentType", "Content", "Sets the detail content type.", ["labels", 0, "detailContentType"], [{"value":"Percent of total","label":"Percent of total"},{"value":"Custom","label":"Custom"}] as const, undefined, "Detail"),
    detailCustomFormatString: textProp("lineChart", "line.labels.detailCustomFormatString", "Format code", "Enter a custom number format for your callout.", ["labels", 0, "detailCustomFormatString"], undefined, "Detail"),
    detailFontFamily: textProp("lineChart", "line.labels.detailFontFamily", "Font family", "The typeface used for the detail.", ["labels", 0, "detailFontFamily"], undefined, "Detail"),
    detailFontSize: numberProp("lineChart", "line.labels.detailFontSize", "Text size", "Sets the detail's text size.", ["labels", 0, "detailFontSize"], 8, 60, undefined, "Detail"),
    detailFormatString: textProp("lineChart", "line.labels.detailFormatString", "Detail format string", "The custom text used for the detail format string.", ["labels", 0, "detailFormatString"], undefined, "Detail"),
    detailItalic: boolProp("lineChart", "line.labels.detailItalic", "Italic", "Whether the detail is italic.", ["labels", 0, "detailItalic"], undefined, "Detail"),
    detailLabelDisplayUnits: enumProp("lineChart", "line.labels.detailLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "detailLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Detail"),
    detailLabelPrecision: numberProp("lineChart", "line.labels.detailLabelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "detailLabelPrecision"], 0, 10, undefined, "Detail"),
    detailShowBlankAs: textProp("lineChart", "line.labels.detailShowBlankAs", "Show blank as", "The custom text used for the detail show blank as.", ["labels", 0, "detailShowBlankAs"], undefined, "Detail"),
    detailTransparency: numberProp("lineChart", "line.labels.detailTransparency", "Transparency", "How see-through the detail appears — 0 is solid, 100 is invisible.", ["labels", 0, "detailTransparency"], 0, 100, undefined, "Detail"),
    detailUnderline: boolProp("lineChart", "line.labels.detailUnderline", "Underline", "Whether the detail is underlined.", ["labels", 0, "detailUnderline"], undefined, "Detail"),
    leaderLineAutoScale: boolProp("lineChart", "line.labels.leaderLineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["labels", 0, "leaderLineAutoScale"], undefined, "Leader lines"),
    leaderLineColor: colorProp("lineChart", "line.labels.leaderLineColor", "Color", "The colour of the leader line.", ["labels", 0, "leaderLineColor"], undefined, "Leader lines"),
    leaderLineDashArray: textProp("lineChart", "line.labels.leaderLineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["labels", 0, "leaderLineDashArray"], undefined, "Leader lines"),
    leaderLineDashCap: enumProp("lineChart", "line.labels.leaderLineDashCap", "Dash cap", "Sets the leader line dash cap.", ["labels", 0, "leaderLineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Leader lines"),
    leaderLinePattern: enumProp("lineChart", "line.labels.leaderLinePattern", "Line style", "Sets the leader line pattern's line style.", ["labels", 0, "leaderLinePattern"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Leader lines"),
    leaderLineTransparency: numberProp("lineChart", "line.labels.leaderLineTransparency", "Transparency", "How see-through the leader line appears — 0 is solid, 100 is invisible.", ["labels", 0, "leaderLineTransparency"], 0, 100, undefined, "Leader lines"),
    leaderLineWidth: numberProp("lineChart", "line.labels.leaderLineWidth", "Width", "The thickness, in pixels, of the leader line width.", ["labels", 0, "leaderLineWidth"], 0, 10, undefined, "Leader lines"),
    leaderLines: boolProp("lineChart", "line.labels.leaderLines", "Show", "Whether the leader lines is turned on.", ["labels", 0, "leaderLines"], undefined, "Leader lines"),
    titleBold: boolProp("lineChart", "line.labels.titleBold", "Bold", "Whether the title is bold.", ["labels", 0, "titleBold"], undefined, "Title"),
    titleColor: colorProp("lineChart", "line.labels.titleColor", "Color", "Select color for data labels", ["labels", 0, "titleColor"], undefined, "Title"),
    titleContentType: enumProp("lineChart", "line.labels.titleContentType", "Content", "Sets the title content type.", ["labels", 0, "titleContentType"], [{"value":"Series name","label":"Series name"},{"value":"Custom","label":"Custom"}] as const, undefined, "Title"),
    titleCustomFormatString: textProp("lineChart", "line.labels.titleCustomFormatString", "Format code", "Enter a custom number format for your callout.", ["labels", 0, "titleCustomFormatString"], undefined, "Title"),
    titleFontFamily: textProp("lineChart", "line.labels.titleFontFamily", "Font family", "The typeface used for the title.", ["labels", 0, "titleFontFamily"], undefined, "Title"),
    titleFontSize: numberProp("lineChart", "line.labels.titleFontSize", "Text size", "Sets the title's text size.", ["labels", 0, "titleFontSize"], 8, 60, undefined, "Title"),
    titleFormatString: textProp("lineChart", "line.labels.titleFormatString", "Title format string", "The custom text used for the title format string.", ["labels", 0, "titleFormatString"], undefined, "Title"),
    titleItalic: boolProp("lineChart", "line.labels.titleItalic", "Italic", "Whether the title is italic.", ["labels", 0, "titleItalic"], undefined, "Title"),
    titleLabelDisplayUnits: enumProp("lineChart", "line.labels.titleLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "titleLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"},{"value":-1,"label":"Custom"}] as const, undefined, "Title"),
    titleLabelPrecision: numberProp("lineChart", "line.labels.titleLabelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "titleLabelPrecision"], 0, 10, undefined, "Title"),
    titleShowBlankAs: textProp("lineChart", "line.labels.titleShowBlankAs", "Show blank as", "The custom text used for the title show blank as.", ["labels", 0, "titleShowBlankAs"], undefined, "Title"),
    titleTransparency: numberProp("lineChart", "line.labels.titleTransparency", "Transparency", "How see-through the title appears — 0 is solid, 100 is invisible.", ["labels", 0, "titleTransparency"], 0, 100, undefined, "Title"),
    titleUnderline: boolProp("lineChart", "line.labels.titleUnderline", "Underline", "Whether the title is underlined.", ["labels", 0, "titleUnderline"], undefined, "Title"),
  },

  seriesLabels: {
    show: boolProp("lineChart", "line.seriesLabels.show", "Show for this series", "Whether the series label is shown.", ["seriesLabels", 0, "show"], undefined),
    bold: boolProp("lineChart", "line.seriesLabels.bold", "Bold", "Whether the series label's text is bold.", ["seriesLabels", 0, "bold"], undefined),
    italic: boolProp("lineChart", "line.seriesLabels.italic", "Italic", "Whether the series label's text is italic.", ["seriesLabels", 0, "italic"], undefined),
    maximumOffset: numberProp("lineChart", "line.seriesLabels.maximumOffset", "Maximum offset", "Sets the maximum offset.", ["seriesLabels", 0, "maximumOffset"], 0, 50, undefined),
    seriesColor: colorProp("lineChart", "line.seriesLabels.seriesColor", "Color", "The colour of the series.", ["seriesLabels", 0, "seriesColor"], undefined),
    seriesFontFamily: textProp("lineChart", "line.seriesLabels.seriesFontFamily", "Series font family", "The typeface used for the series.", ["seriesLabels", 0, "seriesFontFamily"], undefined),
    seriesMatchColor: boolProp("lineChart", "line.seriesLabels.seriesMatchColor", "Match series color", "Whether the series match is turned on.", ["seriesLabels", 0, "seriesMatchColor"], undefined),
    seriesMaximumWidth: numberProp("lineChart", "line.seriesLabels.seriesMaximumWidth", "Width", "The thickness, in pixels, of the series maximum width.", ["seriesLabels", 0, "seriesMaximumWidth"], 0, 10, undefined),
    seriesPosition: enumProp("lineChart", "line.seriesLabels.seriesPosition", "Position", "Sets the series position.", ["seriesLabels", 0, "seriesPosition"], [{"value":"Left","label":"Left"},{"value":"Right","label":"Right"}] as const, undefined),
    seriesTransparency: numberProp("lineChart", "line.seriesLabels.seriesTransparency", "Transparency", "How see-through the series appears — 0 is solid, 100 is invisible.", ["seriesLabels", 0, "seriesTransparency"], 0, 100, undefined),
    seriesWordWrap: boolProp("lineChart", "line.seriesLabels.seriesWordWrap", "Word wrap", "Whether the series word wrap is turned on.", ["seriesLabels", 0, "seriesWordWrap"], undefined),
    showAll: boolProp("lineChart", "line.seriesLabels.showAll", "Customize series", "Whether the show all is turned on.", ["seriesLabels", 0, "showAll"], undefined),
    showByDefault: boolProp("lineChart", "line.seriesLabels.showByDefault", "Show by default", "Whether the show by default is turned on.", ["seriesLabels", 0, "showByDefault"], undefined),
    textSize: numberProp("lineChart", "line.seriesLabels.textSize", "Series font size", "Sets the text's series font size.", ["seriesLabels", 0, "textSize"], 8, 60, undefined),
    underline: boolProp("lineChart", "line.seriesLabels.underline", "Underline", "Whether the series label's text is underlined.", ["seriesLabels", 0, "underline"], undefined),
    backgroundColor: colorProp("lineChart", "line.seriesLabels.backgroundColor", "Color", "Background color", ["seriesLabels", 0, "backgroundColor"], undefined, "Background"),
    backgroundMatchColor: boolProp("lineChart", "line.seriesLabels.backgroundMatchColor", "Match series color", "Whether the background match is turned on.", ["seriesLabels", 0, "backgroundMatchColor"], undefined, "Background"),
    backgroundTransparency: numberProp("lineChart", "line.seriesLabels.backgroundTransparency", "Transparency", "Background color transparency", ["seriesLabels", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
    enableBackground: boolProp("lineChart", "line.seriesLabels.enableBackground", "Show background", "Whether the enable background is turned on.", ["seriesLabels", 0, "enableBackground"], undefined, "Background"),
    leaderLineAutoScale: boolProp("lineChart", "line.seriesLabels.leaderLineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["seriesLabels", 0, "leaderLineAutoScale"], undefined, "Leader lines"),
    leaderLineColor: colorProp("lineChart", "line.seriesLabels.leaderLineColor", "Color", "The colour of the leader line.", ["seriesLabels", 0, "leaderLineColor"], undefined, "Leader lines"),
    leaderLineDashArray: textProp("lineChart", "line.seriesLabels.leaderLineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["seriesLabels", 0, "leaderLineDashArray"], undefined, "Leader lines"),
    leaderLineDashCap: enumProp("lineChart", "line.seriesLabels.leaderLineDashCap", "Dash cap", "Sets the leader line dash cap.", ["seriesLabels", 0, "leaderLineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Leader lines"),
    leaderLinePattern: enumProp("lineChart", "line.seriesLabels.leaderLinePattern", "Line style", "Sets the leader line pattern's line style.", ["seriesLabels", 0, "leaderLinePattern"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Leader lines"),
    leaderLineTransparency: numberProp("lineChart", "line.seriesLabels.leaderLineTransparency", "Transparency", "How see-through the leader line appears — 0 is solid, 100 is invisible.", ["seriesLabels", 0, "leaderLineTransparency"], 0, 100, undefined, "Leader lines"),
    leaderLineWidth: numberProp("lineChart", "line.seriesLabels.leaderLineWidth", "Width", "The thickness, in pixels, of the leader line width.", ["seriesLabels", 0, "leaderLineWidth"], 0, 10, undefined, "Leader lines"),
    leaderLines: boolProp("lineChart", "line.seriesLabels.leaderLines", "Show", "Whether the leader lines is turned on.", ["seriesLabels", 0, "leaderLines"], undefined, "Leader lines"),
  },

  plotArea: {
    transparency: numberProp("lineChart", "line.plotArea.transparency", "Transparency", "Background color transparency", ["plotArea", 0, "transparency"], 0, 100, undefined),
  },

  error: {
    enabled: boolProp("lineChart", "line.error.enabled", "Enabled", "Whether the enabled is turned on.", ["error", 0, "enabled"], undefined),
    showMarkerByDefault: boolProp("lineChart", "line.error.showMarkerByDefault", "Show marker by default", "Whether the show marker by default is turned on.", ["error", 0, "showMarkerByDefault"], undefined),
    barBorderColor: colorProp("lineChart", "line.error.barBorderColor", "Border color", "The colour of the bar border.", ["error", 0, "barBorderColor"], undefined, "Bar"),
    barBorderSize: numberProp("lineChart", "line.error.barBorderSize", "Border size", "Sets the bar border's border size.", ["error", 0, "barBorderSize"], 0, 10, undefined, "Bar"),
    barColor: colorProp("lineChart", "line.error.barColor", "Bar color", "The colour of the bar.", ["error", 0, "barColor"], undefined, "Bar"),
    barMatchSeriesColor: boolProp("lineChart", "line.error.barMatchSeriesColor", "Match series color", "Whether the bar match series is turned on.", ["error", 0, "barMatchSeriesColor"], undefined, "Bar"),
    barShow: boolProp("lineChart", "line.error.barShow", "Show", "Whether the bar is shown.", ["error", 0, "barShow"], undefined, "Bar"),
    barWidth: numberProp("lineChart", "line.error.barWidth", "Width", "The thickness, in pixels, of the bar width.", ["error", 0, "barWidth"], 0, 10, undefined, "Bar"),
    labelBackground: boolProp("lineChart", "line.error.labelBackground", "Show background", "Whether the label background is turned on.", ["error", 0, "labelBackground"], undefined, "Label"),
    labelBackgroundColor: colorProp("lineChart", "line.error.labelBackgroundColor", "Background color", "The colour of the label background.", ["error", 0, "labelBackgroundColor"], undefined, "Label"),
    labelBackgroundTransparency: numberProp("lineChart", "line.error.labelBackgroundTransparency", "Transparency", "Background color transparency", ["error", 0, "labelBackgroundTransparency"], 0, 100, undefined, "Label"),
    labelBold: boolProp("lineChart", "line.error.labelBold", "Bold", "Whether the label is bold.", ["error", 0, "labelBold"], undefined, "Label"),
    labelColor: colorProp("lineChart", "line.error.labelColor", "Color", "The colour of the label.", ["error", 0, "labelColor"], undefined, "Label"),
    labelFontFamily: textProp("lineChart", "line.error.labelFontFamily", "Font family", "The typeface used for the label.", ["error", 0, "labelFontFamily"], undefined, "Label"),
    labelFontSize: numberProp("lineChart", "line.error.labelFontSize", "Text size", "Sets the label's text size.", ["error", 0, "labelFontSize"], 8, 60, undefined, "Label"),
    labelFormat: enumProp("lineChart", "line.error.labelFormat", "Label format", "Sets the label format.", ["error", 0, "labelFormat"], [{"value":"absolute","label":"Absolute"},{"value":"relativeNumeric","label":"Relative (numeric)"},{"value":"relativePercentage","label":"Relative (percentage)"},{"value":"range","label":"Range"}] as const, undefined, "Label"),
    labelItalic: boolProp("lineChart", "line.error.labelItalic", "Italic", "Whether the label is italic.", ["error", 0, "labelItalic"], undefined, "Label"),
    labelMatchSeriesColor: boolProp("lineChart", "line.error.labelMatchSeriesColor", "Match series color", "Whether the label match series is turned on.", ["error", 0, "labelMatchSeriesColor"], undefined, "Label"),
    labelShow: boolProp("lineChart", "line.error.labelShow", "Show", "Whether the label is shown.", ["error", 0, "labelShow"], undefined, "Label"),
    labelUnderline: boolProp("lineChart", "line.error.labelUnderline", "Underline", "Whether the label is underlined.", ["error", 0, "labelUnderline"], undefined, "Label"),
    markerShape: enumProp("lineChart", "line.error.markerShape", "Marker shape", "Sets the marker shape.", ["error", 0, "markerShape"], [{"value":"circle","label":"●"},{"value":"square","label":"■"},{"value":"diamond","label":"◆"},{"value":"triangle","label":"▲"},{"value":"x","label":"☓"},{"value":"shortDash","label":" -"},{"value":"longDash","label":"—"},{"value":"plus","label":"+"},{"value":"none","label":"None"}] as const, undefined, "Marker"),
    markerShow: boolProp("lineChart", "line.error.markerShow", "Show", "Whether the marker is shown.", ["error", 0, "markerShow"], undefined, "Marker"),
    markerSize: numberProp("lineChart", "line.error.markerSize", "Size", "Sets the marker's size.", ["error", 0, "markerSize"], 1, 60, undefined, "Marker"),
    shadeBandStyle: enumProp("lineChart", "line.error.shadeBandStyle", "Style", "Sets the shade band's style.", ["error", 0, "shadeBandStyle"], [{"value":"fill","label":"Fill"},{"value":"line","label":"Line"},{"value":"fillLine","label":"Fill and line"}] as const, undefined, "Shade"),
    shadeColor: colorProp("lineChart", "line.error.shadeColor", "Band color", "The colour of the shade.", ["error", 0, "shadeColor"], undefined, "Shade"),
    shadeMatchSeriesColor: boolProp("lineChart", "line.error.shadeMatchSeriesColor", "Match series color", "Whether the shade match series is turned on.", ["error", 0, "shadeMatchSeriesColor"], undefined, "Shade"),
    shadeShow: boolProp("lineChart", "line.error.shadeShow", "Show", "Whether the shade is shown.", ["error", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("lineChart", "line.error.shadeTransparency", "Transparency", "Background color transparency", ["error", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
    tooltipFormat: enumProp("lineChart", "line.error.tooltipFormat", "Label format", "Sets the tooltip format.", ["error", 0, "tooltipFormat"], [{"value":"absolute","label":"Absolute"},{"value":"relativeNumeric","label":"Relative (numeric)"},{"value":"relativePercentage","label":"Relative (percentage)"},{"value":"range","label":"Range"}] as const, undefined, "Tooltip"),
    tooltipShow: boolProp("lineChart", "line.error.tooltipShow", "Show in tooltip", "Whether the tooltip is shown.", ["error", 0, "tooltipShow"], undefined, "Tooltip"),
  },

  trend: {
    show: boolProp("lineChart", "line.trend.show", "Show", "Whether the trend line is shown.", ["trend", 0, "show"], undefined),
    autoScale: boolProp("lineChart", "line.trend.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["trend", 0, "autoScale"], undefined),
    combineSeries: boolProp("lineChart", "line.trend.combineSeries", "Combine series", "Show one trend line per series or combine", ["trend", 0, "combineSeries"], undefined),
    dashArray: textProp("lineChart", "line.trend.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["trend", 0, "dashArray"], undefined),
    dashCap: enumProp("lineChart", "line.trend.dashCap", "Dash cap", "Sets the dash cap.", ["trend", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined),
    displayName: textProp("lineChart", "line.trend.displayName", "Name", "Set trend line name", ["trend", 0, "displayName"], undefined),
    lineColor: colorProp("lineChart", "line.trend.lineColor", "Color", "The colour of the line.", ["trend", 0, "lineColor"], undefined),
    style: enumProp("lineChart", "line.trend.style", "Line style", "Sets the trend line's line style.", ["trend", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    transparency: numberProp("lineChart", "line.trend.transparency", "Transparency", "How see-through the trend line appears — 0 is solid, 100 is invisible.", ["trend", 0, "transparency"], 0, 100, undefined),
    useHighlightValues: boolProp("lineChart", "line.trend.useHighlightValues", "Use highlight values", "Use highlight values to calculate trend line", ["trend", 0, "useHighlightValues"], undefined),
    width: numberProp("lineChart", "line.trend.width", "Width", "The thickness, in pixels, of the width.", ["trend", 0, "width"], 0, 10, undefined),
  },

  forecast: {
    show: boolProp("lineChart", "line.forecast.show", "Show", "Whether the forecast is shown.", ["forecast", 0, "show"], undefined),
    autoScale: boolProp("lineChart", "line.forecast.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["forecast", 0, "autoScale"], undefined),
    dashArray: textProp("lineChart", "line.forecast.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["forecast", 0, "dashArray"], undefined),
    dashCap: enumProp("lineChart", "line.forecast.dashCap", "Dash cap", "Sets the dash cap.", ["forecast", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined),
    displayName: textProp("lineChart", "line.forecast.displayName", "Name", "Set forecast name", ["forecast", 0, "displayName"], undefined),
    interpolation: enumProp("lineChart", "line.forecast.interpolation", "Interpolation type", "Set interpolation type between line data points.", ["forecast", 0, "interpolation"], [{"value":"linear","label":"Linear"},{"value":"smooth","label":"Smooth"},{"value":"step","label":"Step"}] as const, undefined),
    interpolationSmooth: enumProp("lineChart", "line.forecast.interpolationSmooth", "Smooth type", "Sets the interpolation smooth's smooth type.", ["forecast", 0, "interpolationSmooth"], [{"value":"monotoneX","label":"Monotone"},{"value":"cardinal","label":"Cardinal"}] as const, undefined),
    interpolationSmoothParam: numberProp("lineChart", "line.forecast.interpolationSmoothParam", "Tension", "Sets the interpolation smooth param's tension.", ["forecast", 0, "interpolationSmoothParam"], -1000, 1000, undefined),
    interpolationStep: enumProp("lineChart", "line.forecast.interpolationStep", "Step position", "Sets the interpolation step's step position.", ["forecast", 0, "interpolationStep"], [{"value":"before","label":"Before"},{"value":"center","label":"Center"},{"value":"after","label":"After"}] as const, undefined),
    lineColor: colorProp("lineChart", "line.forecast.lineColor", "Color", "The colour of the line.", ["forecast", 0, "lineColor"], undefined),
    matchSeriesInterpolation: boolProp("lineChart", "line.forecast.matchSeriesInterpolation", "Match series interpolation", "Whether the match series interpolation is turned on.", ["forecast", 0, "matchSeriesInterpolation"], undefined),
    strokeTransparency: numberProp("lineChart", "line.forecast.strokeTransparency", "Transparency", "How see-through the stroke appears — 0 is solid, 100 is invisible.", ["forecast", 0, "strokeTransparency"], 0, 100, undefined),
    style: enumProp("lineChart", "line.forecast.style", "Line style", "Sets the forecast's line style.", ["forecast", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    width: numberProp("lineChart", "line.forecast.width", "Width", "The thickness, in pixels, of the width.", ["forecast", 0, "width"], 0, 10, undefined),
    bandAreaColor: colorProp("lineChart", "line.forecast.bandAreaColor", "Color", "The colour of the band area.", ["forecast", 0, "bandAreaColor"], undefined, "Confidence band area"),
    bandAreaMatchColor: boolProp("lineChart", "line.forecast.bandAreaMatchColor", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["forecast", 0, "bandAreaMatchColor"], undefined, "Confidence band area"),
    bandAreaShow: boolProp("lineChart", "line.forecast.bandAreaShow", "Show", "Whether the band area is shown.", ["forecast", 0, "bandAreaShow"], undefined, "Confidence band area"),
    bandAreaTransparency: numberProp("lineChart", "line.forecast.bandAreaTransparency", "Transparency", "How see-through the band area appears — 0 is solid, 100 is invisible.", ["forecast", 0, "bandAreaTransparency"], 0, 100, undefined, "Confidence band area"),
    bandLineAutoScale: boolProp("lineChart", "line.forecast.bandLineAutoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["forecast", 0, "bandLineAutoScale"], undefined, "Confidence band line"),
    bandLineColor: colorProp("lineChart", "line.forecast.bandLineColor", "Color", "The colour of the band line.", ["forecast", 0, "bandLineColor"], undefined, "Confidence band line"),
    bandLineDashArray: textProp("lineChart", "line.forecast.bandLineDashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["forecast", 0, "bandLineDashArray"], undefined, "Confidence band line"),
    bandLineDashCap: enumProp("lineChart", "line.forecast.bandLineDashCap", "Dash cap", "Sets the band line dash cap.", ["forecast", 0, "bandLineDashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined, "Confidence band line"),
    bandLineMatchColor: boolProp("lineChart", "line.forecast.bandLineMatchColor", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["forecast", 0, "bandLineMatchColor"], undefined, "Confidence band line"),
    bandLinePattern: enumProp("lineChart", "line.forecast.bandLinePattern", "Line style", "Sets the band line pattern's line style.", ["forecast", 0, "bandLinePattern"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined, "Confidence band line"),
    bandLineShow: boolProp("lineChart", "line.forecast.bandLineShow", "Show", "Whether the band line is shown.", ["forecast", 0, "bandLineShow"], undefined, "Confidence band line"),
    bandLineTransparency: numberProp("lineChart", "line.forecast.bandLineTransparency", "Transparency", "How see-through the band line appears — 0 is solid, 100 is invisible.", ["forecast", 0, "bandLineTransparency"], 0, 100, undefined, "Confidence band line"),
    bandLineWidth: numberProp("lineChart", "line.forecast.bandLineWidth", "Width", "The thickness, in pixels, of the band line width.", ["forecast", 0, "bandLineWidth"], 0, 10, undefined, "Confidence band line"),
  },

  anomalyDetection: {
    show: boolProp("lineChart", "line.anomalyDetection.show", "Show", "Whether the anomaly is shown.", ["anomalyDetection", 0, "show"], undefined),
    displayName: textProp("lineChart", "line.anomalyDetection.displayName", "Name", "Set anomaly name", ["anomalyDetection", 0, "displayName"], undefined),
    transparency: numberProp("lineChart", "line.anomalyDetection.transparency", "Transparency", "How see-through the anomaly appears — 0 is solid, 100 is invisible.", ["anomalyDetection", 0, "transparency"], 0, 100, undefined),
    confidenceBandColor: colorProp("lineChart", "line.anomalyDetection.confidenceBandColor", "Color", "The colour of the confidence band.", ["anomalyDetection", 0, "confidenceBandColor"], undefined, "Confidence band"),
    confidenceBandShow: boolProp("lineChart", "line.anomalyDetection.confidenceBandShow", "Show", "Whether the confidence band is shown.", ["anomalyDetection", 0, "confidenceBandShow"], undefined, "Confidence band"),
    confidenceBandStyle: enumProp("lineChart", "line.anomalyDetection.confidenceBandStyle", "Style", "Choose the style for the range of normal values. Any value outside of the range will be considered an anomaly.", ["anomalyDetection", 0, "confidenceBandStyle"], [{"value":"fill","label":"Fill"},{"value":"line","label":"Line"},{"value":"none","label":"None"}] as const, undefined, "Confidence band"),
    markerBorderColor: colorProp("lineChart", "line.anomalyDetection.markerBorderColor", "Border color", "The colour of the marker border.", ["anomalyDetection", 0, "markerBorderColor"], undefined, "Marker"),
    markerBorderColorMatchFill: boolProp("lineChart", "line.anomalyDetection.markerBorderColorMatchFill", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["anomalyDetection", 0, "markerBorderColorMatchFill"], undefined, "Marker"),
    markerBorderShow: boolProp("lineChart", "line.anomalyDetection.markerBorderShow", "Show border", "Whether the marker border is shown.", ["anomalyDetection", 0, "markerBorderShow"], undefined, "Marker"),
    markerBorderTransparency: numberProp("lineChart", "line.anomalyDetection.markerBorderTransparency", "Border transparency", "How see-through the marker border appears — 0 is solid, 100 is invisible.", ["anomalyDetection", 0, "markerBorderTransparency"], 0, 100, undefined, "Marker"),
    markerBorderWidth: numberProp("lineChart", "line.anomalyDetection.markerBorderWidth", "Width", "The thickness, in pixels, of the marker border width.", ["anomalyDetection", 0, "markerBorderWidth"], 0, 10, undefined, "Marker"),
    markerColor: colorProp("lineChart", "line.anomalyDetection.markerColor", "Color", "The colour of the marker.", ["anomalyDetection", 0, "markerColor"], undefined, "Marker"),
    markerRotation: numberProp("lineChart", "line.anomalyDetection.markerRotation", "Rotation", "Sets the marker rotation.", ["anomalyDetection", 0, "markerRotation"], 0, 360, undefined, "Marker"),
    markerShape: enumProp("lineChart", "line.anomalyDetection.markerShape", "Type", "Choose the shape used to point out the anomalies on the visual.", ["anomalyDetection", 0, "markerShape"], [{"value":"circle","label":"●"},{"value":"square","label":"■"},{"value":"diamond","label":"◆"},{"value":"triangle","label":"▲"},{"value":"droplet","label":"🌢"}] as const, undefined, "Marker"),
    markerShapeSize: numberProp("lineChart", "line.anomalyDetection.markerShapeSize", "Size", "Sets the marker shape's size.", ["anomalyDetection", 0, "markerShapeSize"], 1, 60, undefined, "Marker"),
    markerShow: boolProp("lineChart", "line.anomalyDetection.markerShow", "Show", "Whether the marker is shown.", ["anomalyDetection", 0, "markerShow"], undefined, "Marker"),
    markerTransparency: numberProp("lineChart", "line.anomalyDetection.markerTransparency", "Transparency", "How see-through the marker appears — 0 is solid, 100 is invisible.", ["anomalyDetection", 0, "markerTransparency"], 0, 100, undefined, "Marker"),
  },

  referenceLine: {
    show: boolProp("lineChart", "line.referenceLine.show", "Show", "Whether the constant line is shown.", ["referenceLine", 0, "show"], undefined),
    autoScale: boolProp("lineChart", "line.referenceLine.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["referenceLine", 0, "autoScale"], undefined),
    dashArray: textProp("lineChart", "line.referenceLine.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["referenceLine", 0, "dashArray"], undefined),
    dashCap: enumProp("lineChart", "line.referenceLine.dashCap", "Dash cap", "Sets the dash cap.", ["referenceLine", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined),
    displayName: textProp("lineChart", "line.referenceLine.displayName", "Name", "Set reference line name", ["referenceLine", 0, "displayName"], undefined),
    lineColor: colorProp("lineChart", "line.referenceLine.lineColor", "Color", "The colour of the line.", ["referenceLine", 0, "lineColor"], undefined),
    position: enumProp("lineChart", "line.referenceLine.position", "Position", "Arrange relative to chart data points", ["referenceLine", 0, "position"], [{"value":"back","label":"Behind"},{"value":"front","label":"In front"}] as const, undefined),
    style: enumProp("lineChart", "line.referenceLine.style", "Line style", "Sets the constant line's line style.", ["referenceLine", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    transparency: numberProp("lineChart", "line.referenceLine.transparency", "Transparency", "How see-through the constant line appears — 0 is solid, 100 is invisible.", ["referenceLine", 0, "transparency"], 0, 100, undefined),
    value: numberProp("lineChart", "line.referenceLine.value", "Value", "Set reference line numeric value", ["referenceLine", 0, "value"], -1000, 1000, undefined),
    width: numberProp("lineChart", "line.referenceLine.width", "Width", "The thickness, in pixels, of the width.", ["referenceLine", 0, "width"], 0, 10, undefined),
    dataLabelColor: colorProp("lineChart", "line.referenceLine.dataLabelColor", "Color", "Set the reference line data label color", ["referenceLine", 0, "dataLabelColor"], undefined, "Data label"),
    dataLabelDecimalPoints: numberProp("lineChart", "line.referenceLine.dataLabelDecimalPoints", "Value decimal places", "Sets the data label decimal points's value decimal places.", ["referenceLine", 0, "dataLabelDecimalPoints"], 0, 10, undefined, "Data label"),
    dataLabelDisplayUnits: enumProp("lineChart", "line.referenceLine.dataLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["referenceLine", 0, "dataLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined, "Data label"),
    dataLabelHorizontalPosition: enumProp("lineChart", "line.referenceLine.dataLabelHorizontalPosition", "Horizontal position", "Set the horizontal position for the reference line data label", ["referenceLine", 0, "dataLabelHorizontalPosition"], [{"value":"left","label":"Left"},{"value":"right","label":"Right"}] as const, undefined, "Data label"),
    dataLabelShow: boolProp("lineChart", "line.referenceLine.dataLabelShow", "Data label", "Display a data label for the reference line", ["referenceLine", 0, "dataLabelShow"], undefined, "Data label"),
    dataLabelText: enumProp("lineChart", "line.referenceLine.dataLabelText", "Text", "Text shown in the label", ["referenceLine", 0, "dataLabelText"], [{"value":"Value","label":"Data value"},{"value":"Name","label":"Name"},{"value":"ValueAndName","label":"Both"}] as const, undefined, "Data label"),
    dataLabelVerticalPosition: enumProp("lineChart", "line.referenceLine.dataLabelVerticalPosition", "Vertical position", "Set the vertical position for the reference line data label", ["referenceLine", 0, "dataLabelVerticalPosition"], [{"value":"above","label":"Above"},{"value":"under","label":"Under"}] as const, undefined, "Data label"),
    shadeColor: colorProp("lineChart", "line.referenceLine.shadeColor", "Shade color", "The colour of the shade.", ["referenceLine", 0, "shadeColor"], undefined, "Shade"),
    shadeColorMatchStroke: boolProp("lineChart", "line.referenceLine.shadeColorMatchStroke", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["referenceLine", 0, "shadeColorMatchStroke"], undefined, "Shade"),
    shadeRegion: enumProp("lineChart", "line.referenceLine.shadeRegion", "Shade region", "Sets the shade region.", ["referenceLine", 0, "shadeRegion"], [{"value":"before","label":"Before"},{"value":"after","label":"After"},{"value":"none","label":"None"}] as const, undefined, "Shade"),
    shadeShow: boolProp("lineChart", "line.referenceLine.shadeShow", "Show", "Whether the shade is shown.", ["referenceLine", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("lineChart", "line.referenceLine.shadeTransparency", "Shade transparency", "How see-through the shade appears — 0 is solid, 100 is invisible.", ["referenceLine", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
  },

  xAxisReferenceLine: {
    show: boolProp("lineChart", "line.xAxisReferenceLine.show", "Show", "Whether the X-axis constant line is shown.", ["xAxisReferenceLine", 0, "show"], undefined),
    autoScale: boolProp("lineChart", "line.xAxisReferenceLine.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["xAxisReferenceLine", 0, "autoScale"], undefined),
    dashArray: textProp("lineChart", "line.xAxisReferenceLine.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["xAxisReferenceLine", 0, "dashArray"], undefined),
    dashCap: enumProp("lineChart", "line.xAxisReferenceLine.dashCap", "Dash cap", "Sets the dash cap.", ["xAxisReferenceLine", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined),
    displayName: textProp("lineChart", "line.xAxisReferenceLine.displayName", "Name", "Set reference line name", ["xAxisReferenceLine", 0, "displayName"], undefined),
    lineColor: colorProp("lineChart", "line.xAxisReferenceLine.lineColor", "Color", "The colour of the line.", ["xAxisReferenceLine", 0, "lineColor"], undefined),
    position: enumProp("lineChart", "line.xAxisReferenceLine.position", "Position", "Arrange relative to chart data points", ["xAxisReferenceLine", 0, "position"], [{"value":"back","label":"Behind"},{"value":"front","label":"In front"}] as const, undefined),
    style: enumProp("lineChart", "line.xAxisReferenceLine.style", "Line style", "Sets the X-axis constant line's line style.", ["xAxisReferenceLine", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    transparency: numberProp("lineChart", "line.xAxisReferenceLine.transparency", "Transparency", "How see-through the X-axis constant line appears — 0 is solid, 100 is invisible.", ["xAxisReferenceLine", 0, "transparency"], 0, 100, undefined),
    value: textProp("lineChart", "line.xAxisReferenceLine.value", "Value", "Set reference line numeric or date time value according to x-axis type", ["xAxisReferenceLine", 0, "value"], undefined),
    width: numberProp("lineChart", "line.xAxisReferenceLine.width", "Width", "The thickness, in pixels, of the width.", ["xAxisReferenceLine", 0, "width"], 0, 10, undefined),
    dataLabelColor: colorProp("lineChart", "line.xAxisReferenceLine.dataLabelColor", "Color", "Set the reference line data label color", ["xAxisReferenceLine", 0, "dataLabelColor"], undefined, "Data label"),
    dataLabelDecimalPoints: numberProp("lineChart", "line.xAxisReferenceLine.dataLabelDecimalPoints", "Value decimal places", "Sets the data label decimal points's value decimal places.", ["xAxisReferenceLine", 0, "dataLabelDecimalPoints"], 0, 10, undefined, "Data label"),
    dataLabelDisplayUnits: enumProp("lineChart", "line.xAxisReferenceLine.dataLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["xAxisReferenceLine", 0, "dataLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined, "Data label"),
    dataLabelHorizontalPosition: enumProp("lineChart", "line.xAxisReferenceLine.dataLabelHorizontalPosition", "Horizontal position", "Set the horizontal position for the reference line data label", ["xAxisReferenceLine", 0, "dataLabelHorizontalPosition"], [{"value":"left","label":"Left"},{"value":"right","label":"Right"}] as const, undefined, "Data label"),
    dataLabelShow: boolProp("lineChart", "line.xAxisReferenceLine.dataLabelShow", "Data label", "Display a data label for the reference line", ["xAxisReferenceLine", 0, "dataLabelShow"], undefined, "Data label"),
    dataLabelText: enumProp("lineChart", "line.xAxisReferenceLine.dataLabelText", "Text", "Text shown in the label", ["xAxisReferenceLine", 0, "dataLabelText"], [{"value":"Value","label":"Data value"},{"value":"Name","label":"Name"},{"value":"ValueAndName","label":"Both"}] as const, undefined, "Data label"),
    dataLabelVerticalPosition: enumProp("lineChart", "line.xAxisReferenceLine.dataLabelVerticalPosition", "Vertical position", "Set the vertical position for the reference line data label", ["xAxisReferenceLine", 0, "dataLabelVerticalPosition"], [{"value":"above","label":"Above"},{"value":"under","label":"Under"}] as const, undefined, "Data label"),
    shadeColor: colorProp("lineChart", "line.xAxisReferenceLine.shadeColor", "Shade color", "The colour of the shade.", ["xAxisReferenceLine", 0, "shadeColor"], undefined, "Shade"),
    shadeColorMatchStroke: boolProp("lineChart", "line.xAxisReferenceLine.shadeColorMatchStroke", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["xAxisReferenceLine", 0, "shadeColorMatchStroke"], undefined, "Shade"),
    shadeRegion: enumProp("lineChart", "line.xAxisReferenceLine.shadeRegion", "Shade region", "Sets the shade region.", ["xAxisReferenceLine", 0, "shadeRegion"], [{"value":"before","label":"Before"},{"value":"after","label":"After"},{"value":"none","label":"None"}] as const, undefined, "Shade"),
    shadeShow: boolProp("lineChart", "line.xAxisReferenceLine.shadeShow", "Show", "Whether the shade is shown.", ["xAxisReferenceLine", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("lineChart", "line.xAxisReferenceLine.shadeTransparency", "Shade transparency", "How see-through the shade appears — 0 is solid, 100 is invisible.", ["xAxisReferenceLine", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
  },

  y1AxisReferenceLine: {
    show: boolProp("lineChart", "line.y1AxisReferenceLine.show", "Show", "Whether the Y-axis constant line is shown.", ["y1AxisReferenceLine", 0, "show"], undefined),
    autoScale: boolProp("lineChart", "line.y1AxisReferenceLine.autoScale", "Scale by width", "Automatically adjust the spacing between dashes and dots based on line width.", ["y1AxisReferenceLine", 0, "autoScale"], undefined),
    dashArray: textProp("lineChart", "line.y1AxisReferenceLine.dashArray", "Dash array", "Space-separated values for dash and gap lengths in pixels, repeating in sequence.", ["y1AxisReferenceLine", 0, "dashArray"], undefined),
    dashCap: enumProp("lineChart", "line.y1AxisReferenceLine.dashCap", "Dash cap", "Sets the dash cap.", ["y1AxisReferenceLine", 0, "dashCap"], [{"value":"none","label":"Flat"},{"value":"round","label":"Round"},{"value":"square","label":"Square"}] as const, undefined),
    displayName: textProp("lineChart", "line.y1AxisReferenceLine.displayName", "Name", "Set reference line name", ["y1AxisReferenceLine", 0, "displayName"], undefined),
    lineColor: colorProp("lineChart", "line.y1AxisReferenceLine.lineColor", "Color", "The colour of the line.", ["y1AxisReferenceLine", 0, "lineColor"], undefined),
    position: enumProp("lineChart", "line.y1AxisReferenceLine.position", "Position", "Arrange relative to chart data points", ["y1AxisReferenceLine", 0, "position"], [{"value":"back","label":"Behind"},{"value":"front","label":"In front"}] as const, undefined),
    style: enumProp("lineChart", "line.y1AxisReferenceLine.style", "Line style", "Sets the Y-axis constant line's line style.", ["y1AxisReferenceLine", 0, "style"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"},{"value":"custom","label":"Custom"}] as const, undefined),
    transparency: numberProp("lineChart", "line.y1AxisReferenceLine.transparency", "Transparency", "How see-through the Y-axis constant line appears — 0 is solid, 100 is invisible.", ["y1AxisReferenceLine", 0, "transparency"], 0, 100, undefined),
    value: numberProp("lineChart", "line.y1AxisReferenceLine.value", "Value", "Set reference line numeric value", ["y1AxisReferenceLine", 0, "value"], -1000, 1000, undefined),
    width: numberProp("lineChart", "line.y1AxisReferenceLine.width", "Width", "The thickness, in pixels, of the width.", ["y1AxisReferenceLine", 0, "width"], 0, 10, undefined),
    dataLabelColor: colorProp("lineChart", "line.y1AxisReferenceLine.dataLabelColor", "Color", "Set the reference line data label color", ["y1AxisReferenceLine", 0, "dataLabelColor"], undefined, "Data label"),
    dataLabelDecimalPoints: numberProp("lineChart", "line.y1AxisReferenceLine.dataLabelDecimalPoints", "Value decimal places", "Sets the data label decimal points's value decimal places.", ["y1AxisReferenceLine", 0, "dataLabelDecimalPoints"], 0, 10, undefined, "Data label"),
    dataLabelDisplayUnits: enumProp("lineChart", "line.y1AxisReferenceLine.dataLabelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["y1AxisReferenceLine", 0, "dataLabelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined, "Data label"),
    dataLabelHorizontalPosition: enumProp("lineChart", "line.y1AxisReferenceLine.dataLabelHorizontalPosition", "Horizontal position", "Set the horizontal position for the reference line data label", ["y1AxisReferenceLine", 0, "dataLabelHorizontalPosition"], [{"value":"left","label":"Left"},{"value":"right","label":"Right"}] as const, undefined, "Data label"),
    dataLabelShow: boolProp("lineChart", "line.y1AxisReferenceLine.dataLabelShow", "Data label", "Display a data label for the reference line", ["y1AxisReferenceLine", 0, "dataLabelShow"], undefined, "Data label"),
    dataLabelText: enumProp("lineChart", "line.y1AxisReferenceLine.dataLabelText", "Text", "Text shown in the label", ["y1AxisReferenceLine", 0, "dataLabelText"], [{"value":"Value","label":"Data value"},{"value":"Name","label":"Name"},{"value":"ValueAndName","label":"Both"}] as const, undefined, "Data label"),
    dataLabelVerticalPosition: enumProp("lineChart", "line.y1AxisReferenceLine.dataLabelVerticalPosition", "Vertical position", "Set the vertical position for the reference line data label", ["y1AxisReferenceLine", 0, "dataLabelVerticalPosition"], [{"value":"above","label":"Above"},{"value":"under","label":"Under"}] as const, undefined, "Data label"),
    shadeColor: colorProp("lineChart", "line.y1AxisReferenceLine.shadeColor", "Shade color", "The colour of the shade.", ["y1AxisReferenceLine", 0, "shadeColor"], undefined, "Shade"),
    shadeColorMatchStroke: boolProp("lineChart", "line.y1AxisReferenceLine.shadeColorMatchStroke", "Match line color", "Match the legend icon color to the color of the line, not the marker", ["y1AxisReferenceLine", 0, "shadeColorMatchStroke"], undefined, "Shade"),
    shadeRegion: enumProp("lineChart", "line.y1AxisReferenceLine.shadeRegion", "Shade region", "Sets the shade region.", ["y1AxisReferenceLine", 0, "shadeRegion"], [{"value":"before","label":"Before"},{"value":"after","label":"After"},{"value":"none","label":"None"}] as const, undefined, "Shade"),
    shadeShow: boolProp("lineChart", "line.y1AxisReferenceLine.shadeShow", "Show", "Whether the shade is shown.", ["y1AxisReferenceLine", 0, "shadeShow"], undefined, "Shade"),
    shadeTransparency: numberProp("lineChart", "line.y1AxisReferenceLine.shadeTransparency", "Shade transparency", "How see-through the shade appears — 0 is solid, 100 is invisible.", ["y1AxisReferenceLine", 0, "shadeTransparency"], 0, 100, undefined, "Shade"),
  },

  zoom: {
    show: boolProp("lineChart", "line.zoom.show", "Show", "Whether the zoom slider is shown.", ["zoom", 0, "show"], undefined),
    showLabels: boolProp("lineChart", "line.zoom.showLabels", "Slider labels", "Whether the show labels is turned on.", ["zoom", 0, "showLabels"], undefined),
    showOnCategoryAxis: boolProp("lineChart", "line.zoom.showOnCategoryAxis", "X axis", "Whether the show on category axis is turned on.", ["zoom", 0, "showOnCategoryAxis"], undefined),
    showOnValueAxis: boolProp("lineChart", "line.zoom.showOnValueAxis", "Y axis", "Whether the show on value axis is turned on.", ["zoom", 0, "showOnValueAxis"], undefined),
    showOnValueSecAxis: boolProp("lineChart", "line.zoom.showOnValueSecAxis", "Secondary Y axis", "Whether the show on value sec axis is turned on.", ["zoom", 0, "showOnValueSecAxis"], undefined),
    showTooltip: boolProp("lineChart", "line.zoom.showTooltip", "Slider tooltips", "Whether the show tooltip is turned on.", ["zoom", 0, "showTooltip"], undefined),
    categoryMax: numberProp("lineChart", "line.zoom.categoryMax", "Category Max", "Sets the category max.", ["zoom", 0, "categoryMax"], -1000, 1000, undefined, "Category axis"),
    categoryMin: numberProp("lineChart", "line.zoom.categoryMin", "Category Min", "Sets the category min.", ["zoom", 0, "categoryMin"], -1000, 1000, undefined, "Category axis"),
    categorySize: numberProp("lineChart", "line.zoom.categorySize", "Category Size", "Sets the category's category size.", ["zoom", 0, "categorySize"], 1, 60, undefined, "Category axis"),
    valueMax: numberProp("lineChart", "line.zoom.valueMax", "Value Max", "Sets the value max.", ["zoom", 0, "valueMax"], -1000, 1000, undefined, "Value axis"),
    valueMin: numberProp("lineChart", "line.zoom.valueMin", "Value Min", "Sets the value min.", ["zoom", 0, "valueMin"], -1000, 1000, undefined, "Value axis"),
    valueSize: numberProp("lineChart", "line.zoom.valueSize", "Value Size", "Sets the value's value size.", ["zoom", 0, "valueSize"], 1, 60, undefined, "Value axis"),
    valueSecMax: numberProp("lineChart", "line.zoom.valueSecMax", "Secondary value max", "Sets the value sec max.", ["zoom", 0, "valueSecMax"], -1000, 1000, undefined, "Secondary axis"),
    valueSecMin: numberProp("lineChart", "line.zoom.valueSecMin", "Secondary value min", "Sets the value sec min.", ["zoom", 0, "valueSecMin"], -1000, 1000, undefined, "Secondary axis"),
    valueSecSize: numberProp("lineChart", "line.zoom.valueSecSize", "Secondary value size", "Sets the value sec's value sec size.", ["zoom", 0, "valueSecSize"], 1, 60, undefined, "Secondary axis"),
  },

  smallMultiplesLayout: {
    advancedPaddingOptions: boolProp("lineChart", "line.smallMultiplesLayout.advancedPaddingOptions", "Advanced padding options", "Whether the advanced padding options is turned on.", ["smallMultiplesLayout", 0, "advancedPaddingOptions"], undefined, "Layout"),
    columnCount: numberProp("lineChart", "line.smallMultiplesLayout.columnCount", "Columns", "Sets the column count's columns.", ["smallMultiplesLayout", 0, "columnCount"], 1, 12, undefined, "Layout"),
    columnPaddingInner: numberProp("lineChart", "line.smallMultiplesLayout.columnPaddingInner", "Inner column padding", "Sets the column padding inner's inner column padding.", ["smallMultiplesLayout", 0, "columnPaddingInner"], 0, 50, undefined, "Layout"),
    columnPaddingOuter: numberProp("lineChart", "line.smallMultiplesLayout.columnPaddingOuter", "Outer column padding", "Sets the column padding outer's outer column padding.", ["smallMultiplesLayout", 0, "columnPaddingOuter"], 0, 50, undefined, "Layout"),
    layoutType: enumProp("lineChart", "line.smallMultiplesLayout.layoutType", "Grid layout", "Sets the layout type.", ["smallMultiplesLayout", 0, "layoutType"], [{"value":"auto","label":"Auto"},{"value":"custom","label":"Custom"}] as const, undefined, "Layout"),
    rowCount: numberProp("lineChart", "line.smallMultiplesLayout.rowCount", "Rows", "Sets the row count's rows.", ["smallMultiplesLayout", 0, "rowCount"], 1, 12, undefined, "Layout"),
    rowPaddingInner: numberProp("lineChart", "line.smallMultiplesLayout.rowPaddingInner", "Inner row padding", "Sets the row padding inner's inner row padding.", ["smallMultiplesLayout", 0, "rowPaddingInner"], 0, 50, undefined, "Layout"),
    rowPaddingOuter: numberProp("lineChart", "line.smallMultiplesLayout.rowPaddingOuter", "Outer row padding", "Sets the row padding outer's outer row padding.", ["smallMultiplesLayout", 0, "rowPaddingOuter"], 0, 50, undefined, "Layout"),
    backgroundColor: colorProp("lineChart", "line.smallMultiplesLayout.backgroundColor", "Background color", "Background color for each small multiple", ["smallMultiplesLayout", 0, "backgroundColor"], undefined, "Background"),
    backgroundTransparency: numberProp("lineChart", "line.smallMultiplesLayout.backgroundTransparency", "Background transparency", "Background color transparency", ["smallMultiplesLayout", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
    gridLineColor: colorProp("lineChart", "line.smallMultiplesLayout.gridLineColor", "Color", "The colour of the grid line.", ["smallMultiplesLayout", 0, "gridLineColor"], undefined, "Grid"),
    gridLineShow: boolProp("lineChart", "line.smallMultiplesLayout.gridLineShow", "Show", "Whether the grid line is shown.", ["smallMultiplesLayout", 0, "gridLineShow"], undefined, "Grid"),
    gridLineStyle: enumProp("lineChart", "line.smallMultiplesLayout.gridLineStyle", "Line style", "Sets the grid line's line style.", ["smallMultiplesLayout", 0, "gridLineStyle"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"}] as const, undefined, "Grid"),
    gridLineTransparency: numberProp("lineChart", "line.smallMultiplesLayout.gridLineTransparency", "Transparency", "How see-through the grid line appears — 0 is solid, 100 is invisible.", ["smallMultiplesLayout", 0, "gridLineTransparency"], 0, 100, undefined, "Grid"),
    gridLineType: enumProp("lineChart", "line.smallMultiplesLayout.gridLineType", "Gridlines", "Gridlines to delineate the small multiple visuals", ["smallMultiplesLayout", 0, "gridLineType"], [{"value":"all","label":"All"},{"value":"inner","label":"Horizontal and vertical"},{"value":"innerHorizontal","label":"Horizontal only"},{"value":"innerVertical","label":"Vertical only"}] as const, undefined, "Grid"),
    gridLineWidth: numberProp("lineChart", "line.smallMultiplesLayout.gridLineWidth", "Width", "The thickness, in pixels, of the grid line width.", ["smallMultiplesLayout", 0, "gridLineWidth"], 0, 10, undefined, "Grid"),
    gridPadding: numberProp("lineChart", "line.smallMultiplesLayout.gridPadding", "Grid padding", "Sets the grid padding.", ["smallMultiplesLayout", 0, "gridPadding"], 0, 50, undefined, "Grid"),
  },

  subheader: {
    show: boolProp("lineChart", "line.subheader.show", "Show", "Whether the small multiple titles is shown.", ["subheader", 0, "show"], undefined),
    alignment: enumProp("lineChart", "line.subheader.alignment", "Alignment", "Alignment position for the title", ["subheader", 0, "alignment"], [{"value":"left","label":"left"},{"value":"center","label":"center"},{"value":"right","label":"right"}] as const, undefined),
    bold: boolProp("lineChart", "line.subheader.bold", "Bold", "Whether the small multiple titles's text is bold.", ["subheader", 0, "bold"], undefined),
    fontColor: colorProp("lineChart", "line.subheader.fontColor", "Font color", "The colour of the font.", ["subheader", 0, "fontColor"], undefined),
    fontFamily: textProp("lineChart", "line.subheader.fontFamily", "Font family", "The typeface used for the small multiple titles.", ["subheader", 0, "fontFamily"], undefined),
    fontSize: numberProp("lineChart", "line.subheader.fontSize", "Text size", "Sets the small multiple titles's text size.", ["subheader", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("lineChart", "line.subheader.italic", "Italic", "Whether the small multiple titles's text is italic.", ["subheader", 0, "italic"], undefined),
    position: enumProp("lineChart", "line.subheader.position", "Position", "Sets the small multiple titles's position.", ["subheader", 0, "position"], [{"value":"top","label":"Top"},{"value":"bottom","label":"Bottom"}] as const, undefined),
    titleWrap: boolProp("lineChart", "line.subheader.titleWrap", "Word wrap", "Whether the title wrap is turned on.", ["subheader", 0, "titleWrap"], undefined),
    underline: boolProp("lineChart", "line.subheader.underline", "Underline", "Whether the small multiple titles's text is underlined.", ["subheader", 0, "underline"], undefined),
  },

  general: {
    formatString: textProp("lineChart", "line.general.formatString", "Format string", "The custom text used for the format string.", ["general", 0, "formatString"], undefined),
    responsive: boolProp("lineChart", "line.general.responsive", "Responsive", "The visual will adapt to size changes", ["general", 0, "responsive"], undefined),
    responsiveLegacy: boolProp("lineChart", "line.general.responsiveLegacy", "Responsive (legacy)", "Whether the responsive legacy is turned on.", ["general", 0, "responsiveLegacy"], undefined),
  },
} as const;

export type ResolvedLineChartStyle = {
  /**
   * Whether the *user-supplied* theme configured small multiples.
   * Base themes ship smallMultiplesLayout styling so the feature looks
   * right when it is used, which is not a signal that anything enabled
   * it — so only the custom layer counts. Replaces the renderer reading
   * raw theme JSON to answer the same question.
   */
  usesSmallMultiples: boolean;
  dataPoint: {
    defaultColor: string;
    fill: string;
    showAllDataPoints: boolean;
    transparency: number;
  };
  lineStyles: {
    interpolationSmooth: string | number;
    interpolationSmoothParam: number;
    interpolationStep: string | number;
    lineChartType: string | number;
    lineStyle: string | number;
    segmentAlignment: string | number;
    segmentGradient: boolean;
    showSeries: boolean;
    areaColor: string;
    areaMatchStrokeColor: boolean;
    areaShow: boolean;
    markerColor: string;
    markerShape: string | number;
    markerSize: number;
    showMarker: boolean;
    showMarkerByDefault: boolean;
    strokeAutoScale: boolean;
    strokeColor: string;
    strokeDashArray: string;
    strokeDashCap: string | number;
    strokeLineJoin: string | number;
    strokeShow: boolean;
    strokeTransparency: number;
    strokeWidth: number;
  };
  markers: {
    borderColor: string;
    borderColorMatchFill: boolean;
    borderShow: boolean;
    borderTransparency: number;
    borderWidth: number;
    rotation: number;
    transparency: number;
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
  y2Axis: {
    show: boolean;
    secAxisStyle: string | number;
    secBold: boolean;
    secEnd: number;
    secFontFamily: string;
    secFontSize: number;
    secItalic: boolean;
    secLabelColor: string;
    secLabelDisplayUnits: string | number;
    secLabelPrecision: number;
    secLogAxisScale: boolean;
    secRoundRange: boolean;
    secShowAxisTitle: boolean;
    secStart: number;
    secUnderline: boolean;
    secTitleBold: boolean;
    secTitleColor: string;
    secTitleFontFamily: string;
    secTitleFontSize: number;
    secTitleItalic: boolean;
    secTitleText: string;
    secTitleUnderline: boolean;
  };
  legend: {
    show: boolean;
    bold: boolean;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    labelColor: string;
    legendMarkerRendering: string | number;
    matchLineColor: boolean;
    position: string | number;
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
    labelPosition: string | number;
    labelPrecision: number;
    maximumOffset: number;
    minimumOffset: number;
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
    leaderLineAutoScale: boolean;
    leaderLineColor: string;
    leaderLineDashArray: string;
    leaderLineDashCap: string | number;
    leaderLinePattern: string | number;
    leaderLineTransparency: number;
    leaderLineWidth: number;
    leaderLines: boolean;
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
  seriesLabels: {
    show: boolean;
    bold: boolean;
    italic: boolean;
    maximumOffset: number;
    seriesColor: string;
    seriesFontFamily: string;
    seriesMatchColor: boolean;
    seriesMaximumWidth: number;
    seriesPosition: string | number;
    seriesTransparency: number;
    seriesWordWrap: boolean;
    showAll: boolean;
    showByDefault: boolean;
    textSize: number;
    underline: boolean;
    backgroundColor: string;
    backgroundMatchColor: boolean;
    backgroundTransparency: number;
    enableBackground: boolean;
    leaderLineAutoScale: boolean;
    leaderLineColor: string;
    leaderLineDashArray: string;
    leaderLineDashCap: string | number;
    leaderLinePattern: string | number;
    leaderLineTransparency: number;
    leaderLineWidth: number;
    leaderLines: boolean;
  };
  plotArea: {
    transparency: number;
  };
  error: {
    enabled: boolean;
    showMarkerByDefault: boolean;
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
    shadeBandStyle: string | number;
    shadeColor: string;
    shadeMatchSeriesColor: boolean;
    shadeShow: boolean;
    shadeTransparency: number;
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
  forecast: {
    show: boolean;
    autoScale: boolean;
    dashArray: string;
    dashCap: string | number;
    displayName: string;
    interpolation: string | number;
    interpolationSmooth: string | number;
    interpolationSmoothParam: number;
    interpolationStep: string | number;
    lineColor: string;
    matchSeriesInterpolation: boolean;
    strokeTransparency: number;
    style: string | number;
    width: number;
    bandAreaColor: string;
    bandAreaMatchColor: boolean;
    bandAreaShow: boolean;
    bandAreaTransparency: number;
    bandLineAutoScale: boolean;
    bandLineColor: string;
    bandLineDashArray: string;
    bandLineDashCap: string | number;
    bandLineMatchColor: boolean;
    bandLinePattern: string | number;
    bandLineShow: boolean;
    bandLineTransparency: number;
    bandLineWidth: number;
  };
  anomalyDetection: {
    show: boolean;
    displayName: string;
    transparency: number;
    confidenceBandColor: string;
    confidenceBandShow: boolean;
    confidenceBandStyle: string | number;
    markerBorderColor: string;
    markerBorderColorMatchFill: boolean;
    markerBorderShow: boolean;
    markerBorderTransparency: number;
    markerBorderWidth: number;
    markerColor: string;
    markerRotation: number;
    markerShape: string | number;
    markerShapeSize: number;
    markerShow: boolean;
    markerTransparency: number;
  };
  referenceLine: {
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
    showOnValueSecAxis: boolean;
    showTooltip: boolean;
    categoryMax: number;
    categoryMin: number;
    categorySize: number;
    valueMax: number;
    valueMin: number;
    valueSize: number;
    valueSecMax: number;
    valueSecMin: number;
    valueSecSize: number;
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
  general: {
    formatString: string;
    responsive: boolean;
    responsiveLegacy: boolean;
  };
};

/**
 * Resolves every Line chart property to its theme override, falling back
 * to the shared theme tokens (palette/background/foreground) for
 * colour-like fields and a plain Power BI-typical default otherwise.
 */
export function resolveLineChartStyle(theme: ThemeSource, base: ResolvedTheme): ResolvedLineChartStyle {
  const p = LINE_CHART_PROPERTIES;
  return {
    usesSmallMultiples: isGroupSetBy(theme, "lineChart", "smallMultiplesLayout", "custom"),
    dataPoint: {
      defaultColor: resolvePropertyValue(theme, p.dataPoint.defaultColor, base.palette[0] ?? base.foreground),
      fill: resolvePropertyValue(theme, p.dataPoint.fill, base.palette[0] ?? base.foreground),
      showAllDataPoints: resolvePropertyValue(theme, p.dataPoint.showAllDataPoints, false),
      transparency: resolvePropertyValue(theme, p.dataPoint.transparency, 0),
    },
    lineStyles: {
      interpolationSmooth: resolvePropertyValue(theme, p.lineStyles.interpolationSmooth, "monotoneX"),
      interpolationSmoothParam: resolvePropertyValue(theme, p.lineStyles.interpolationSmoothParam, 0),
      interpolationStep: resolvePropertyValue(theme, p.lineStyles.interpolationStep, "before"),
      lineChartType: resolvePropertyValue(theme, p.lineStyles.lineChartType, "linear"),
      lineStyle: resolvePropertyValue(theme, p.lineStyles.lineStyle, "solid"),
      segmentAlignment: resolvePropertyValue(theme, p.lineStyles.segmentAlignment, "left"),
      segmentGradient: resolvePropertyValue(theme, p.lineStyles.segmentGradient, false),
      showSeries: resolvePropertyValue(theme, p.lineStyles.showSeries, true),
      areaColor: resolvePropertyValue(theme, p.lineStyles.areaColor, base.palette[0] ?? base.foreground),
      areaMatchStrokeColor: resolvePropertyValue(theme, p.lineStyles.areaMatchStrokeColor, false),
      areaShow: resolvePropertyValue(theme, p.lineStyles.areaShow, false),
      markerColor: resolvePropertyValue(theme, p.lineStyles.markerColor, base.palette[0] ?? base.foreground),
      markerShape: resolvePropertyValue(theme, p.lineStyles.markerShape, "circle"),
      markerSize: resolvePropertyValue(theme, p.lineStyles.markerSize, 6),
      showMarker: resolvePropertyValue(theme, p.lineStyles.showMarker, false),
      showMarkerByDefault: resolvePropertyValue(theme, p.lineStyles.showMarkerByDefault, false),
      strokeAutoScale: resolvePropertyValue(theme, p.lineStyles.strokeAutoScale, false),
      // The stroke colour is an override; unset, a series uses its data
      // colour, so a neutral grey default made every line look unthemed.
      strokeColor: resolvePropertyValue(theme, p.lineStyles.strokeColor, base.palette[0]),
      strokeDashArray: resolvePropertyValue(theme, p.lineStyles.strokeDashArray, ""),
      strokeDashCap: resolvePropertyValue(theme, p.lineStyles.strokeDashCap, "none"),
      strokeLineJoin: resolvePropertyValue(theme, p.lineStyles.strokeLineJoin, "miter"),
      // The stroke IS the line chart — defaulting it off renders an
      // empty plot, which is the most severe form of the zero/false
      // default trap seen elsewhere in this project.
      strokeShow: resolvePropertyValue(theme, p.lineStyles.strokeShow, true),
      strokeTransparency: resolvePropertyValue(theme, p.lineStyles.strokeTransparency, 0),
      strokeWidth: resolvePropertyValue(theme, p.lineStyles.strokeWidth, 2),
    },
    markers: {
      borderColor: resolvePropertyValue(theme, p.markers.borderColor, "#E3E3E3"),
      borderColorMatchFill: resolvePropertyValue(theme, p.markers.borderColorMatchFill, false),
      borderShow: resolvePropertyValue(theme, p.markers.borderShow, false),
      borderTransparency: resolvePropertyValue(theme, p.markers.borderTransparency, 0),
      borderWidth: resolvePropertyValue(theme, p.markers.borderWidth, 1),
      rotation: resolvePropertyValue(theme, p.markers.rotation, 0),
      transparency: resolvePropertyValue(theme, p.markers.transparency, 0),
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
      invertAxis: resolvePropertyValue(theme, p.categoryAxis.invertAxis, false),
      italic: resolvePropertyValue(theme, p.categoryAxis.italic, false),
      labelColor: resolvePropertyValue(theme, p.categoryAxis.labelColor, base.foreground),
      labelDisplayUnits: resolvePropertyValue(theme, p.categoryAxis.labelDisplayUnits, 0),
      labelPrecision: resolvePropertyValue(theme, p.categoryAxis.labelPrecision, 0),
      logAxisScale: resolvePropertyValue(theme, p.categoryAxis.logAxisScale, false),
      maxMarginFactor: resolvePropertyValue(theme, p.categoryAxis.maxMarginFactor, 10),
      preferredCategoryWidth: resolvePropertyValue(theme, p.categoryAxis.preferredCategoryWidth, 0),
      roundRange: resolvePropertyValue(theme, p.categoryAxis.roundRange, false),
      showAxisTitle: resolvePropertyValue(theme, p.categoryAxis.showAxisTitle, false),
      start: resolvePropertyValue(theme, p.categoryAxis.start, ""),
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
    y2Axis: {
      show: resolvePropertyValue(theme, p.y2Axis.show, false),
      secAxisStyle: resolvePropertyValue(theme, p.y2Axis.secAxisStyle, "showTitleOnly"),
      secBold: resolvePropertyValue(theme, p.y2Axis.secBold, false),
      secEnd: resolvePropertyValue(theme, p.y2Axis.secEnd, 0),
      secFontFamily: resolvePropertyValue(theme, p.y2Axis.secFontFamily, ""),
      secFontSize: resolvePropertyValue(theme, p.y2Axis.secFontSize, 6),
      secItalic: resolvePropertyValue(theme, p.y2Axis.secItalic, false),
      secLabelColor: resolvePropertyValue(theme, p.y2Axis.secLabelColor, base.foreground),
      secLabelDisplayUnits: resolvePropertyValue(theme, p.y2Axis.secLabelDisplayUnits, 0),
      secLabelPrecision: resolvePropertyValue(theme, p.y2Axis.secLabelPrecision, 0),
      secLogAxisScale: resolvePropertyValue(theme, p.y2Axis.secLogAxisScale, false),
      secRoundRange: resolvePropertyValue(theme, p.y2Axis.secRoundRange, false),
      secShowAxisTitle: resolvePropertyValue(theme, p.y2Axis.secShowAxisTitle, false),
      secStart: resolvePropertyValue(theme, p.y2Axis.secStart, 0),
      secUnderline: resolvePropertyValue(theme, p.y2Axis.secUnderline, false),
      secTitleBold: resolvePropertyValue(theme, p.y2Axis.secTitleBold, false),
      secTitleColor: resolvePropertyValue(theme, p.y2Axis.secTitleColor, base.foreground),
      secTitleFontFamily: resolvePropertyValue(theme, p.y2Axis.secTitleFontFamily, ""),
      secTitleFontSize: resolvePropertyValue(theme, p.y2Axis.secTitleFontSize, 6),
      secTitleItalic: resolvePropertyValue(theme, p.y2Axis.secTitleItalic, false),
      secTitleText: resolvePropertyValue(theme, p.y2Axis.secTitleText, ""),
      secTitleUnderline: resolvePropertyValue(theme, p.y2Axis.secTitleUnderline, false),
    },
    legend: {
      show: resolvePropertyValue(theme, p.legend.show, true),
      bold: resolvePropertyValue(theme, p.legend.bold, false),
      fontFamily: resolvePropertyValue(theme, p.legend.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.legend.fontSize, 6),
      italic: resolvePropertyValue(theme, p.legend.italic, false),
      labelColor: resolvePropertyValue(theme, p.legend.labelColor, base.foreground),
      legendMarkerRendering: resolvePropertyValue(theme, p.legend.legendMarkerRendering, "markerCircleDefault"),
      matchLineColor: resolvePropertyValue(theme, p.legend.matchLineColor, false),
      position: resolvePropertyValue(theme, p.legend.position, "Top"),
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
      // The value is a data label's default content; title and detail are
      // additions to it, not replacements for it.
      enableValueDataLabel: resolvePropertyValue(theme, p.labels.enableValueDataLabel, true),
      fontFamily: resolvePropertyValue(theme, p.labels.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.labels.fontSize, 6),
      horizontalAlignment: resolvePropertyValue(theme, p.labels.horizontalAlignment, "left"),
      italic: resolvePropertyValue(theme, p.labels.italic, false),
      labelContainerMaxWidth: resolvePropertyValue(theme, p.labels.labelContainerMaxWidth, 0),
      labelContentLayout: resolvePropertyValue(theme, p.labels.labelContentLayout, "MultiLine"),
      // Density is a 0-100 dial for how many labels may be drawn; 0 means
      // none, so switching data labels on would still show nothing.
      labelDensity: resolvePropertyValue(theme, p.labels.labelDensity, 100),
      labelDisplayUnits: resolvePropertyValue(theme, p.labels.labelDisplayUnits, 0),
      labelPosition: resolvePropertyValue(theme, p.labels.labelPosition, "Auto"),
      labelPrecision: resolvePropertyValue(theme, p.labels.labelPrecision, 0),
      maximumOffset: resolvePropertyValue(theme, p.labels.maximumOffset, 10),
      minimumOffset: resolvePropertyValue(theme, p.labels.minimumOffset, 10),
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
      leaderLineAutoScale: resolvePropertyValue(theme, p.labels.leaderLineAutoScale, false),
      leaderLineColor: resolvePropertyValue(theme, p.labels.leaderLineColor, base.palette[0] ?? base.foreground),
      leaderLineDashArray: resolvePropertyValue(theme, p.labels.leaderLineDashArray, ""),
      leaderLineDashCap: resolvePropertyValue(theme, p.labels.leaderLineDashCap, "none"),
      leaderLinePattern: resolvePropertyValue(theme, p.labels.leaderLinePattern, "solid"),
      leaderLineTransparency: resolvePropertyValue(theme, p.labels.leaderLineTransparency, 0),
      leaderLineWidth: resolvePropertyValue(theme, p.labels.leaderLineWidth, 1),
      leaderLines: resolvePropertyValue(theme, p.labels.leaderLines, false),
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
    seriesLabels: {
      show: resolvePropertyValue(theme, p.seriesLabels.show, false),
      bold: resolvePropertyValue(theme, p.seriesLabels.bold, false),
      italic: resolvePropertyValue(theme, p.seriesLabels.italic, false),
      maximumOffset: resolvePropertyValue(theme, p.seriesLabels.maximumOffset, 10),
      seriesColor: resolvePropertyValue(theme, p.seriesLabels.seriesColor, base.palette[0] ?? base.foreground),
      seriesFontFamily: resolvePropertyValue(theme, p.seriesLabels.seriesFontFamily, ""),
      seriesMatchColor: resolvePropertyValue(theme, p.seriesLabels.seriesMatchColor, false),
      seriesMaximumWidth: resolvePropertyValue(theme, p.seriesLabels.seriesMaximumWidth, 0),
      seriesPosition: resolvePropertyValue(theme, p.seriesLabels.seriesPosition, "Left"),
      seriesTransparency: resolvePropertyValue(theme, p.seriesLabels.seriesTransparency, 0),
      seriesWordWrap: resolvePropertyValue(theme, p.seriesLabels.seriesWordWrap, false),
      showAll: resolvePropertyValue(theme, p.seriesLabels.showAll, false),
      showByDefault: resolvePropertyValue(theme, p.seriesLabels.showByDefault, false),
      textSize: resolvePropertyValue(theme, p.seriesLabels.textSize, 6),
      underline: resolvePropertyValue(theme, p.seriesLabels.underline, false),
      backgroundColor: resolvePropertyValue(theme, p.seriesLabels.backgroundColor, base.background),
      backgroundMatchColor: resolvePropertyValue(theme, p.seriesLabels.backgroundMatchColor, false),
      backgroundTransparency: resolvePropertyValue(theme, p.seriesLabels.backgroundTransparency, 0),
      enableBackground: resolvePropertyValue(theme, p.seriesLabels.enableBackground, false),
      leaderLineAutoScale: resolvePropertyValue(theme, p.seriesLabels.leaderLineAutoScale, false),
      leaderLineColor: resolvePropertyValue(theme, p.seriesLabels.leaderLineColor, base.palette[0] ?? base.foreground),
      leaderLineDashArray: resolvePropertyValue(theme, p.seriesLabels.leaderLineDashArray, ""),
      leaderLineDashCap: resolvePropertyValue(theme, p.seriesLabels.leaderLineDashCap, "none"),
      leaderLinePattern: resolvePropertyValue(theme, p.seriesLabels.leaderLinePattern, "solid"),
      leaderLineTransparency: resolvePropertyValue(theme, p.seriesLabels.leaderLineTransparency, 0),
      leaderLineWidth: resolvePropertyValue(theme, p.seriesLabels.leaderLineWidth, 1),
      leaderLines: resolvePropertyValue(theme, p.seriesLabels.leaderLines, false),
    },
    plotArea: {
      transparency: resolvePropertyValue(theme, p.plotArea.transparency, 0),
    },
    error: {
      enabled: resolvePropertyValue(theme, p.error.enabled, false),
      showMarkerByDefault: resolvePropertyValue(theme, p.error.showMarkerByDefault, false),
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
      shadeBandStyle: resolvePropertyValue(theme, p.error.shadeBandStyle, "fill"),
      shadeColor: resolvePropertyValue(theme, p.error.shadeColor, "#E3E3E3"),
      shadeMatchSeriesColor: resolvePropertyValue(theme, p.error.shadeMatchSeriesColor, false),
      shadeShow: resolvePropertyValue(theme, p.error.shadeShow, false),
      shadeTransparency: resolvePropertyValue(theme, p.error.shadeTransparency, 0),
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
    forecast: {
      show: resolvePropertyValue(theme, p.forecast.show, false),
      autoScale: resolvePropertyValue(theme, p.forecast.autoScale, false),
      dashArray: resolvePropertyValue(theme, p.forecast.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.forecast.dashCap, "none"),
      displayName: resolvePropertyValue(theme, p.forecast.displayName, ""),
      interpolation: resolvePropertyValue(theme, p.forecast.interpolation, "linear"),
      interpolationSmooth: resolvePropertyValue(theme, p.forecast.interpolationSmooth, "monotoneX"),
      interpolationSmoothParam: resolvePropertyValue(theme, p.forecast.interpolationSmoothParam, 0),
      interpolationStep: resolvePropertyValue(theme, p.forecast.interpolationStep, "before"),
      lineColor: resolvePropertyValue(theme, p.forecast.lineColor, base.palette[0] ?? base.foreground),
      matchSeriesInterpolation: resolvePropertyValue(theme, p.forecast.matchSeriesInterpolation, false),
      strokeTransparency: resolvePropertyValue(theme, p.forecast.strokeTransparency, 0),
      style: resolvePropertyValue(theme, p.forecast.style, "solid"),
      width: resolvePropertyValue(theme, p.forecast.width, 1),
      bandAreaColor: resolvePropertyValue(theme, p.forecast.bandAreaColor, base.palette[0] ?? base.foreground),
      bandAreaMatchColor: resolvePropertyValue(theme, p.forecast.bandAreaMatchColor, false),
      bandAreaShow: resolvePropertyValue(theme, p.forecast.bandAreaShow, false),
      bandAreaTransparency: resolvePropertyValue(theme, p.forecast.bandAreaTransparency, 0),
      bandLineAutoScale: resolvePropertyValue(theme, p.forecast.bandLineAutoScale, false),
      bandLineColor: resolvePropertyValue(theme, p.forecast.bandLineColor, base.palette[0] ?? base.foreground),
      bandLineDashArray: resolvePropertyValue(theme, p.forecast.bandLineDashArray, ""),
      bandLineDashCap: resolvePropertyValue(theme, p.forecast.bandLineDashCap, "none"),
      bandLineMatchColor: resolvePropertyValue(theme, p.forecast.bandLineMatchColor, false),
      bandLinePattern: resolvePropertyValue(theme, p.forecast.bandLinePattern, "solid"),
      bandLineShow: resolvePropertyValue(theme, p.forecast.bandLineShow, false),
      bandLineTransparency: resolvePropertyValue(theme, p.forecast.bandLineTransparency, 0),
      bandLineWidth: resolvePropertyValue(theme, p.forecast.bandLineWidth, 1),
    },
    anomalyDetection: {
      show: resolvePropertyValue(theme, p.anomalyDetection.show, false),
      displayName: resolvePropertyValue(theme, p.anomalyDetection.displayName, ""),
      transparency: resolvePropertyValue(theme, p.anomalyDetection.transparency, 0),
      confidenceBandColor: resolvePropertyValue(theme, p.anomalyDetection.confidenceBandColor, base.palette[0] ?? base.foreground),
      confidenceBandShow: resolvePropertyValue(theme, p.anomalyDetection.confidenceBandShow, false),
      confidenceBandStyle: resolvePropertyValue(theme, p.anomalyDetection.confidenceBandStyle, "fill"),
      markerBorderColor: resolvePropertyValue(theme, p.anomalyDetection.markerBorderColor, "#E3E3E3"),
      markerBorderColorMatchFill: resolvePropertyValue(theme, p.anomalyDetection.markerBorderColorMatchFill, false),
      markerBorderShow: resolvePropertyValue(theme, p.anomalyDetection.markerBorderShow, false),
      markerBorderTransparency: resolvePropertyValue(theme, p.anomalyDetection.markerBorderTransparency, 0),
      markerBorderWidth: resolvePropertyValue(theme, p.anomalyDetection.markerBorderWidth, 1),
      markerColor: resolvePropertyValue(theme, p.anomalyDetection.markerColor, base.palette[0] ?? base.foreground),
      markerRotation: resolvePropertyValue(theme, p.anomalyDetection.markerRotation, 0),
      markerShape: resolvePropertyValue(theme, p.anomalyDetection.markerShape, "circle"),
      markerShapeSize: resolvePropertyValue(theme, p.anomalyDetection.markerShapeSize, 6),
      markerShow: resolvePropertyValue(theme, p.anomalyDetection.markerShow, false),
      markerTransparency: resolvePropertyValue(theme, p.anomalyDetection.markerTransparency, 0),
    },
    referenceLine: {
      show: resolvePropertyValue(theme, p.referenceLine.show, false),
      autoScale: resolvePropertyValue(theme, p.referenceLine.autoScale, false),
      dashArray: resolvePropertyValue(theme, p.referenceLine.dashArray, ""),
      dashCap: resolvePropertyValue(theme, p.referenceLine.dashCap, "none"),
      displayName: resolvePropertyValue(theme, p.referenceLine.displayName, ""),
      lineColor: resolvePropertyValue(theme, p.referenceLine.lineColor, base.palette[0] ?? base.foreground),
      position: resolvePropertyValue(theme, p.referenceLine.position, "back"),
      style: resolvePropertyValue(theme, p.referenceLine.style, "solid"),
      transparency: resolvePropertyValue(theme, p.referenceLine.transparency, 0),
      value: resolvePropertyValue(theme, p.referenceLine.value, 0),
      width: resolvePropertyValue(theme, p.referenceLine.width, 1),
      dataLabelColor: resolvePropertyValue(theme, p.referenceLine.dataLabelColor, base.foreground),
      dataLabelDecimalPoints: resolvePropertyValue(theme, p.referenceLine.dataLabelDecimalPoints, 0),
      dataLabelDisplayUnits: resolvePropertyValue(theme, p.referenceLine.dataLabelDisplayUnits, 0),
      dataLabelHorizontalPosition: resolvePropertyValue(theme, p.referenceLine.dataLabelHorizontalPosition, "left"),
      dataLabelShow: resolvePropertyValue(theme, p.referenceLine.dataLabelShow, false),
      dataLabelText: resolvePropertyValue(theme, p.referenceLine.dataLabelText, "Value"),
      dataLabelVerticalPosition: resolvePropertyValue(theme, p.referenceLine.dataLabelVerticalPosition, "above"),
      shadeColor: resolvePropertyValue(theme, p.referenceLine.shadeColor, "#E3E3E3"),
      shadeColorMatchStroke: resolvePropertyValue(theme, p.referenceLine.shadeColorMatchStroke, false),
      shadeRegion: resolvePropertyValue(theme, p.referenceLine.shadeRegion, "before"),
      shadeShow: resolvePropertyValue(theme, p.referenceLine.shadeShow, false),
      shadeTransparency: resolvePropertyValue(theme, p.referenceLine.shadeTransparency, 0),
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
      showOnValueSecAxis: resolvePropertyValue(theme, p.zoom.showOnValueSecAxis, false),
      showTooltip: resolvePropertyValue(theme, p.zoom.showTooltip, false),
      categoryMax: resolvePropertyValue(theme, p.zoom.categoryMax, 0),
      categoryMin: resolvePropertyValue(theme, p.zoom.categoryMin, 0),
      categorySize: resolvePropertyValue(theme, p.zoom.categorySize, 6),
      valueMax: resolvePropertyValue(theme, p.zoom.valueMax, 0),
      valueMin: resolvePropertyValue(theme, p.zoom.valueMin, 0),
      valueSize: resolvePropertyValue(theme, p.zoom.valueSize, 6),
      valueSecMax: resolvePropertyValue(theme, p.zoom.valueSecMax, 0),
      valueSecMin: resolvePropertyValue(theme, p.zoom.valueSecMin, 0),
      valueSecSize: resolvePropertyValue(theme, p.zoom.valueSecSize, 6),
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
      // Verified against themes/base/classic2026.json's lineChart override.
      gridLineType: resolvePropertyValue(theme, p.smallMultiplesLayout.gridLineType, "inner"),
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
    general: {
      formatString: resolvePropertyValue(theme, p.general.formatString, ""),
      responsive: resolvePropertyValue(theme, p.general.responsive, true),
      responsiveLegacy: resolvePropertyValue(theme, p.general.responsiveLegacy, false),
    },
  };
}

export { propertyThemePath };
