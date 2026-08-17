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
 * Pie chart ("pieChart") property registry, pinned to Microsoft's published
 * schema reportThemeSchema-2.156.json (microsoft/powerbi-desktop-samples).
 * Small schema surface — 5 groups (Data colors, Shapes, Legend, Detail
 * labels, General), 36 properties total.
 *
 * `slices.innerRadiusRatio` is the field that turns a pie into a donut when
 * set above 0 — it's still exposed here rather than split into a separate
 * "Donut chart" registry, since Power BI itself treats donut as a slider on
 * the same pieChart visual type, not a distinct schema.
 *
 * Excluded: `annotationTemplate` (whole group, 1 field, complex nested
 * object) — same rationale as every other visual's equivalent exclusion.
 * Shared "visual chrome" (title, background, border, ...) is out of scope
 * here too, matching every other visual's registry.
 */

export const PIE_CHART_PROPERTIES = {

  dataPoint: {
    borderColor: colorProp("pieChart", "pie.dataPoint.borderColor", "Border color", "The colour of the border.", ["dataPoint", 0, "borderColor"], undefined, "Border"),
    borderColorMatchFill: boolProp("pieChart", "pie.dataPoint.borderColorMatchFill", "Match fill color", "Match the border color to the main shape color.", ["dataPoint", 0, "borderColorMatchFill"], undefined, "Border"),
    borderOutlineOnly: boolProp("pieChart", "pie.dataPoint.borderOutlineOnly", "Hide inner borders", "Whether the border outline only is turned on.", ["dataPoint", 0, "borderOutlineOnly"], undefined, "Border"),
    borderShow: boolProp("pieChart", "pie.dataPoint.borderShow", "Border", "Whether the border is shown.", ["dataPoint", 0, "borderShow"], undefined, "Border"),
    borderSize: numberProp("pieChart", "pie.dataPoint.borderSize", "Width", "The thickness, in pixels, of the border.", ["dataPoint", 0, "borderSize"], 0, 10, undefined, "Border"),
    borderTransparency: numberProp("pieChart", "pie.dataPoint.borderTransparency", "Transparency", "How see-through the border appears — 0 is solid, 100 is invisible.", ["dataPoint", 0, "borderTransparency"], 0, 100, undefined, "Border"),
    defaultColor: colorProp("pieChart", "pie.dataPoint.defaultColor", "Default color", "The main colour used for the slices.", ["dataPoint", 0, "defaultColor"], undefined, "Fill"),
    fill: colorProp("pieChart", "pie.dataPoint.fill", "Fill color", "The main colour used for the slices.", ["dataPoint", 0, "fill"], undefined, "Fill"),
    fillTransparency: numberProp("pieChart", "pie.dataPoint.fillTransparency", "Transparency", "How see-through the fill appears — 0 is solid, 100 is invisible.", ["dataPoint", 0, "fillTransparency"], 0, 100, undefined, "Fill"),
  },

  slices: {
    innerRadiusRatio: numberProp("pieChart", "pie.slices.innerRadiusRatio", "Inner radius", "Sets the inner radius ratio's inner radius.", ["slices", 0, "innerRadiusRatio"], 0, 100, undefined),
    startAngle: numberProp("pieChart", "pie.slices.startAngle", "Start angle", "Sets the start angle.", ["slices", 0, "startAngle"], 0, 360, undefined),
  },

  legend: {
    show: boolProp("pieChart", "pie.legend.show", "Show", "Whether the legend is shown.", ["legend", 0, "show"], undefined),
    bold: boolProp("pieChart", "pie.legend.bold", "Bold", "Whether the legend's text is bold.", ["legend", 0, "bold"], undefined),
    fontFamily: textProp("pieChart", "pie.legend.fontFamily", "Font family", "The typeface used for the legend.", ["legend", 0, "fontFamily"], undefined),
    fontSize: numberProp("pieChart", "pie.legend.fontSize", "Text size", "Sets the legend's text size.", ["legend", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pieChart", "pie.legend.italic", "Italic", "Whether the legend's text is italic.", ["legend", 0, "italic"], undefined),
    labelColor: colorProp("pieChart", "pie.legend.labelColor", "Text color", "The colour of the label.", ["legend", 0, "labelColor"], undefined),
    position: enumProp("pieChart", "pie.legend.position", "Position", "Select the location for the legend", ["legend", 0, "position"], [{"value":"Top","label":"Top left"},{"value":"TopCenter","label":"Top center"},{"value":"TopRight","label":"Top right"},{"value":"Left","label":"Top left stacked"},{"value":"Right","label":"Top right stacked"},{"value":"LeftCenter","label":"Center left"},{"value":"RightCenter","label":"Center right"},{"value":"Bottom","label":"Bottom left"},{"value":"BottomCenter","label":"Bottom center"},{"value":"BottomRight","label":"Bottom right"}] as const, undefined),
    underline: boolProp("pieChart", "pie.legend.underline", "Underline", "Whether the legend's text is underlined.", ["legend", 0, "underline"], undefined),
    showTitle: boolProp("pieChart", "pie.legend.showTitle", "Title", "Display a title for legend symbols", ["legend", 0, "showTitle"], undefined, "Title"),
    titleText: textProp("pieChart", "pie.legend.titleText", "Legend Name", "Title text", ["legend", 0, "titleText"], undefined, "Title"),
  },

  labels: {
    show: boolProp("pieChart", "pie.labels.show", "Show", "Whether the detail labels is shown.", ["labels", 0, "show"], undefined),
    background: enumProp("pieChart", "pie.labels.background", "Background", "Sets the background.", ["labels", 0, "background"], [{"value":"auto","label":"Auto"},{"value":"on","label":"On"},{"value":"off","label":"Off"}] as const, undefined),
    bold: boolProp("pieChart", "pie.labels.bold", "Bold", "Whether the detail labels's text is bold.", ["labels", 0, "bold"], undefined),
    color: colorProp("pieChart", "pie.labels.color", "Color", "Select color for data labels", ["labels", 0, "color"], undefined),
    fontFamily: textProp("pieChart", "pie.labels.fontFamily", "Font family", "The typeface used for the detail labels.", ["labels", 0, "fontFamily"], undefined),
    fontSize: numberProp("pieChart", "pie.labels.fontSize", "Text size", "Sets the detail labels's text size.", ["labels", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("pieChart", "pie.labels.italic", "Italic", "Whether the detail labels's text is italic.", ["labels", 0, "italic"], undefined),
    labelDisplayUnits: enumProp("pieChart", "pie.labels.labelDisplayUnits", "Display units", "Select the units (millions, billions, etc.)", ["labels", 0, "labelDisplayUnits"], [{"value":0,"label":"Auto"},{"value":1,"label":"None"},{"value":1000,"label":"Thousands"},{"value":1000000,"label":"Millions"},{"value":1000000000,"label":"Billions"},{"value":1000000000000,"label":"Trillions"}] as const, undefined),
    labelPrecision: numberProp("pieChart", "pie.labels.labelPrecision", "Value decimal places", "Select the number of decimal places to display for the values", ["labels", 0, "labelPrecision"], 0, 10, undefined),
    labelStyle: enumProp("pieChart", "pie.labels.labelStyle", "Label style", "Sets the label's label style.", ["labels", 0, "labelStyle"], [{"value":"Category","label":"Category"},{"value":"Data","label":"Data value"},{"value":"Percent of total","label":"Percent of total"},{"value":"Both","label":"Category, data value"},{"value":"Category, percent of total","label":"Category, percent of total"},{"value":"Data value, percent of total","label":"Data value, percent of total"},{"value":"Category, data value, percent of total","label":"All detail labels"}] as const, undefined),
    overflow: boolProp("pieChart", "pie.labels.overflow", "Overflow text", "Whether the overflow is turned on.", ["labels", 0, "overflow"], undefined),
    percentageLabelPrecision: numberProp("pieChart", "pie.labels.percentageLabelPrecision", "% decimal places", "Select the number of decimal places to display for the percentages", ["labels", 0, "percentageLabelPrecision"], 0, 10, undefined),
    position: enumProp("pieChart", "pie.labels.position", "Label position", "Sets the detail labels's label position.", ["labels", 0, "position"], [{"value":"outside","label":"Outside"},{"value":"inside","label":"Inside"},{"value":"preferOutside","label":"Prefer outside"},{"value":"preferInside","label":"Prefer inside"}] as const, undefined),
    underline: boolProp("pieChart", "pie.labels.underline", "Underline", "Whether the detail labels's text is underlined.", ["labels", 0, "underline"], undefined),
  },

  general: {
    formatString: textProp("pieChart", "pie.general.formatString", "Format string", "The custom text used for the format string.", ["general", 0, "formatString"], undefined),
  },
} as const;

export type ResolvedPieChartStyle = {
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
  slices: {
    innerRadiusRatio: number;
    startAngle: number;
  };
  legend: {
    show: boolean;
    bold: boolean;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    labelColor: string;
    position: string | number;
    underline: boolean;
    showTitle: boolean;
    titleText: string;
  };
  labels: {
    show: boolean;
    background: string | number;
    bold: boolean;
    color: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    labelDisplayUnits: string | number;
    labelPrecision: number;
    labelStyle: string | number;
    overflow: boolean;
    percentageLabelPrecision: number;
    position: string | number;
    underline: boolean;
  };
  general: {
    formatString: string;
  };
};

/**
 * Resolves every Pie chart property to its theme override, falling back
 * to the shared theme tokens (palette/background/foreground) for
 * colour-like fields and a plain Power BI-typical default otherwise.
 */
export function resolvePieChartStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedPieChartStyle {
  const p = PIE_CHART_PROPERTIES;
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
    slices: {
      innerRadiusRatio: resolvePropertyValue(theme, p.slices.innerRadiusRatio, 0),
      startAngle: resolvePropertyValue(theme, p.slices.startAngle, 0),
    },
    legend: {
      show: resolvePropertyValue(theme, p.legend.show, true),
      bold: resolvePropertyValue(theme, p.legend.bold, false),
      fontFamily: resolvePropertyValue(theme, p.legend.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.legend.fontSize, 6),
      italic: resolvePropertyValue(theme, p.legend.italic, false),
      labelColor: resolvePropertyValue(theme, p.legend.labelColor, base.foreground),
      position: resolvePropertyValue(theme, p.legend.position, "Top"),
      underline: resolvePropertyValue(theme, p.legend.underline, false),
      showTitle: resolvePropertyValue(theme, p.legend.showTitle, false),
      titleText: resolvePropertyValue(theme, p.legend.titleText, ""),
    },
    labels: {
      show: resolvePropertyValue(theme, p.labels.show, true),
      background: resolvePropertyValue(theme, p.labels.background, "auto"),
      bold: resolvePropertyValue(theme, p.labels.bold, false),
      color: resolvePropertyValue(theme, p.labels.color, base.palette[0] ?? base.foreground),
      fontFamily: resolvePropertyValue(theme, p.labels.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.labels.fontSize, 6),
      italic: resolvePropertyValue(theme, p.labels.italic, false),
      labelDisplayUnits: resolvePropertyValue(theme, p.labels.labelDisplayUnits, 0),
      labelPrecision: resolvePropertyValue(theme, p.labels.labelPrecision, 0),
      labelStyle: resolvePropertyValue(theme, p.labels.labelStyle, "Category"),
      overflow: resolvePropertyValue(theme, p.labels.overflow, false),
      percentageLabelPrecision: resolvePropertyValue(theme, p.labels.percentageLabelPrecision, 0),
      position: resolvePropertyValue(theme, p.labels.position, "outside"),
      underline: resolvePropertyValue(theme, p.labels.underline, false),
    },
    general: {
      formatString: resolvePropertyValue(theme, p.general.formatString, ""),
    },
  };
}

export { propertyThemePath };
