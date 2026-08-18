import type { ThemeSource } from "./properties";
import {
  boolProp,
  colorProp,
  enumProp,
  numberProp,
  propertyThemePath,
  resolvePropertyValue,
  textProp,
} from "./properties";
import type { ResolvedTheme } from "./theme";

/**
 * Slicer property registry, pinned to Microsoft's published schema
 * reportThemeSchema-2.156.json (microsoft/powerbi-desktop-samples). Grouped
 * exactly as Power BI Desktop's own format pane groups them, so the
 * property panel and Microsoft's own UI stay recognisable to each other.
 *
 * One schema group is intentionally not covered:
 * - `data` (endDate/startDate/numericStart/numericEnd/relativePeriod/...)
 *   holds the slicer's current filter *state* — which values are selected,
 *   what date range is active — not a stylistic default. Setting these via
 *   a theme would pre-select filter values for every slicer of this type,
 *   which is out of scope for a theme/style editor. Everything else the
 *   schema exposes for this visual is covered.
 *
 * Shared "visual chrome" groups common to every visual (title, background,
 * border, ...) are out of scope here, matching Table/Bar chart precedent —
 * this registry covers only what's specific to the Slicer visual. Several
 * groups here (calendarButton, date, dateRange, dateRangeText,
 * numericInputStyle, pendingChangesIcon, relativeText, slider) only affect
 * specific slicer modes (date-range, relative-date, numeric-range slicers)
 * rather than the default list/dropdown slicer — still exposed since the
 * schema and the theme JSON support them regardless of which slicer mode a
 * report actually uses.
 */

export const SLICER_PROPERTIES = {

  header: {
    show: boolProp("slicer", "slicer.header.show", "Show", "Whether the slicer header is shown.", ["header", 0, "show"], undefined),
    background: colorProp("slicer", "slicer.header.background", "Background color", "The colour of the background.", ["header", 0, "background"], undefined),
    bold: boolProp("slicer", "slicer.header.bold", "Bold", "Whether the slicer header's text is bold.", ["header", 0, "bold"], undefined),
    fontColor: colorProp("slicer", "slicer.header.fontColor", "Font color", "The colour of the font.", ["header", 0, "fontColor"], undefined),
    fontFamily: textProp("slicer", "slicer.header.fontFamily", "Font family", "The typeface used for the slicer header.", ["header", 0, "fontFamily"], undefined),
    italic: boolProp("slicer", "slicer.header.italic", "Italic", "Whether the slicer header's text is italic.", ["header", 0, "italic"], undefined),
    outlineStyle: numberProp("slicer", "slicer.header.outlineStyle", "Outline", "Which sides of the border are visible, encoded as a bitmask (0 = none, 15 = all sides).", ["header", 0, "outlineStyle"], 0, 15, undefined),
    showRestatement: boolProp("slicer", "slicer.header.showRestatement", "Show summary", "Whether the show restatement is turned on.", ["header", 0, "showRestatement"], undefined),
    text: textProp("slicer", "slicer.header.text", "Title text", "The name of the visual", ["header", 0, "text"], undefined),
    textSize: numberProp("slicer", "slicer.header.textSize", "Text size", "Sets the text's text size.", ["header", 0, "textSize"], 8, 60, undefined),
    underline: boolProp("slicer", "slicer.header.underline", "Underline", "Whether the slicer header's text is underlined.", ["header", 0, "underline"], undefined),
  },

  items: {
    accessibilityContrastProperties: boolProp("slicer", "slicer.items.accessibilityContrastProperties", "Accessibility contrast", "Whether the accessibility contrast properties is turned on.", ["items", 0, "accessibilityContrastProperties"], undefined),
    background: colorProp("slicer", "slicer.items.background", "Background color", "The colour of the background.", ["items", 0, "background"], undefined),
    bold: boolProp("slicer", "slicer.items.bold", "Bold", "Whether the item list's text is bold.", ["items", 0, "bold"], undefined),
    expandCollapseToggleType: enumProp("slicer", "slicer.items.expandCollapseToggleType", "Expand/collapse icon", "Sets the expand collapse toggle type.", ["items", 0, "expandCollapseToggleType"], [{"value":0,"label":"Chevron"},{"value":1,"label":"Plus/minus"},{"value":2,"label":"Caret"}] as const, undefined),
    fontColor: colorProp("slicer", "slicer.items.fontColor", "Font color", "The colour of the font.", ["items", 0, "fontColor"], undefined),
    fontFamily: textProp("slicer", "slicer.items.fontFamily", "Font family", "The typeface used for the item list.", ["items", 0, "fontFamily"], undefined),
    italic: boolProp("slicer", "slicer.items.italic", "Italic", "Whether the item list's text is italic.", ["items", 0, "italic"], undefined),
    outlineStyle: numberProp("slicer", "slicer.items.outlineStyle", "Outline", "Which sides of the border are visible, encoded as a bitmask (0 = none, 15 = all sides).", ["items", 0, "outlineStyle"], 0, 15, undefined),
    padding: numberProp("slicer", "slicer.items.padding", "Padding", "Sets the padding.", ["items", 0, "padding"], 0, 50, undefined),
    steppedLayoutIndentation: numberProp("slicer", "slicer.items.steppedLayoutIndentation", "Stepped layout indentation", "Sets the stepped layout indentation.", ["items", 0, "steppedLayoutIndentation"], 0, 50, undefined),
    textSize: numberProp("slicer", "slicer.items.textSize", "Text size", "Sets the text's text size.", ["items", 0, "textSize"], 8, 60, undefined),
    underline: boolProp("slicer", "slicer.items.underline", "Underline", "Whether the item list's text is underlined.", ["items", 0, "underline"], undefined),
  },

  general: {
    count: numberProp("slicer", "slicer.general.count", "Count", "Sets the count.", ["general", 0, "count"], 1, 50, undefined),
    formatString: textProp("slicer", "slicer.general.formatString", "Format string", "The number format code applied to the value (e.g. #,0.00 or 0%).", ["general", 0, "formatString"], undefined),
    orientation: enumProp("slicer", "slicer.general.orientation", "Orientation", "Sets the orientation.", ["general", 0, "orientation"], [{"value":0,"label":"Vertical"},{"value":1,"label":"Horizontal"}] as const, undefined),
    outlineColor: colorProp("slicer", "slicer.general.outlineColor", "Outline color", "Color of the outline", ["general", 0, "outlineColor"], undefined),
    outlineWeight: numberProp("slicer", "slicer.general.outlineWeight", "Outline weight", "Thickness of the outline in pixels", ["general", 0, "outlineWeight"], 0, 10, undefined),
    responsive: boolProp("slicer", "slicer.general.responsive", "Responsive", "The visual will adapt to size changes", ["general", 0, "responsive"], undefined),
    selfFilterEnabled: boolProp("slicer", "slicer.general.selfFilterEnabled", "Self filter enabled", "Whether the self filter enabled is turned on.", ["general", 0, "selfFilterEnabled"], undefined),
  },

  selection: {
    selectAllCheckboxEnabled: boolProp("slicer", "slicer.selection.selectAllCheckboxEnabled", "Show \"Select all\" option", "Show \"Select all\" as an option in the slicer. This selects all the values in the slicer so you can unselect them one by one to create an \"is not\" type filter.", ["selection", 0, "selectAllCheckboxEnabled"], undefined),
    singleSelect: boolProp("slicer", "slicer.selection.singleSelect", "Multi-select with CTRL", "Allow multiple selections in check boxes only when CTRL or Command + click is used", ["selection", 0, "singleSelect"], undefined),
    strictSingleSelect: boolProp("slicer", "slicer.selection.strictSingleSelect", "Single select", "Force Selection ensures only one item can be chosen at a time. If no item is selected, the first available will be automatically chosen.", ["selection", 0, "strictSingleSelect"], undefined),
  },

  searchBox: {
    background: colorProp("slicer", "slicer.searchBox.background", "Background", "The colour of the background.", ["searchBox", 0, "background"], undefined),
    borderColor: colorProp("slicer", "slicer.searchBox.borderColor", "Outline color", "Color of the outline", ["searchBox", 0, "borderColor"], undefined),
    outlineStyle: numberProp("slicer", "slicer.searchBox.outlineStyle", "Outline", "Which sides of the border are visible, encoded as a bitmask (0 = none, 15 = all sides).", ["searchBox", 0, "outlineStyle"], 0, 15, undefined),
  },

  date: {
    background: colorProp("slicer", "slicer.date.background", "Background color", "The colour of the background.", ["date", 0, "background"], undefined),
    bold: boolProp("slicer", "slicer.date.bold", "Bold", "Whether the date input's text is bold.", ["date", 0, "bold"], undefined),
    fontColor: colorProp("slicer", "slicer.date.fontColor", "Font color", "The colour of the font.", ["date", 0, "fontColor"], undefined),
    fontFamily: textProp("slicer", "slicer.date.fontFamily", "Font family", "The typeface used for the date input.", ["date", 0, "fontFamily"], undefined),
    hideDatePickerButton: boolProp("slicer", "slicer.date.hideDatePickerButton", "Hide date picker button", "Whether the hide date picker button is turned on.", ["date", 0, "hideDatePickerButton"], undefined),
    italic: boolProp("slicer", "slicer.date.italic", "Italic", "Whether the date input's text is italic.", ["date", 0, "italic"], undefined),
    textSize: numberProp("slicer", "slicer.date.textSize", "Text size", "Sets the text's text size.", ["date", 0, "textSize"], 8, 60, undefined),
    underline: boolProp("slicer", "slicer.date.underline", "Underline", "Whether the date input's text is underlined.", ["date", 0, "underline"], undefined),
  },

  dateRange: {
    anchorDate: textProp("slicer", "slicer.dateRange.anchorDate", "Anchor date", "Select a date to reference when filtering visuals by a relative range of time. If an anchor date isn't specified, we'll use the current date.", ["dateRange", 0, "anchorDate"], undefined),
    includeToday: boolProp("slicer", "slicer.dateRange.includeToday", "Include today", "Whether the include today is turned on.", ["dateRange", 0, "includeToday"], undefined),
  },

  dateRangeText: {
    bold: boolProp("slicer", "slicer.dateRangeText.bold", "Bold", "Whether the date range text's text is bold.", ["dateRangeText", 0, "bold"], undefined),
    color: colorProp("slicer", "slicer.dateRangeText.color", "Color", "The colour of the date range text.", ["dateRangeText", 0, "color"], undefined),
    fontFamily: textProp("slicer", "slicer.dateRangeText.fontFamily", "Font family", "The typeface used for the date range text.", ["dateRangeText", 0, "fontFamily"], undefined),
    fontSize: numberProp("slicer", "slicer.dateRangeText.fontSize", "Text size", "Sets the date range text's text size.", ["dateRangeText", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("slicer", "slicer.dateRangeText.italic", "Italic", "Whether the date range text's text is italic.", ["dateRangeText", 0, "italic"], undefined),
    transparency: numberProp("slicer", "slicer.dateRangeText.transparency", "Transparency", "How see-through the date range text appears — 0 is solid, 100 is invisible.", ["dateRangeText", 0, "transparency"], 0, 100, undefined),
    underline: boolProp("slicer", "slicer.dateRangeText.underline", "Underline", "Whether the date range text's text is underlined.", ["dateRangeText", 0, "underline"], undefined),
  },

  calendarButton: {
    iconColor: colorProp("slicer", "slicer.calendarButton.iconColor", "Icon color", "The colour of the icon.", ["calendarButton", 0, "iconColor"], undefined),
    iconSize: numberProp("slicer", "slicer.calendarButton.iconSize", "Icon size", "Sets the icon's icon size.", ["calendarButton", 0, "iconSize"], 8, 60, undefined),
    iconTransparency: numberProp("slicer", "slicer.calendarButton.iconTransparency", "Transparency", "How see-through the icon appears — 0 is solid, 100 is invisible.", ["calendarButton", 0, "iconTransparency"], 0, 100, undefined),
    backgroundColor: colorProp("slicer", "slicer.calendarButton.backgroundColor", "Color", "Background color", ["calendarButton", 0, "backgroundColor"], undefined, "Background"),
    backgroundShow: boolProp("slicer", "slicer.calendarButton.backgroundShow", "Show", "Whether the background is shown.", ["calendarButton", 0, "backgroundShow"], undefined, "Background"),
    backgroundTransparency: numberProp("slicer", "slicer.calendarButton.backgroundTransparency", "Transparency", "Background color transparency", ["calendarButton", 0, "backgroundTransparency"], 0, 100, undefined, "Background"),
    cornerBottomLeft: numberProp("slicer", "slicer.calendarButton.cornerBottomLeft", "Bottom left corner", "Sets the corner bottom left's bottom left corner.", ["calendarButton", 0, "cornerBottomLeft"], 0, 50, undefined, "Corners"),
    cornerBottomRight: numberProp("slicer", "slicer.calendarButton.cornerBottomRight", "Bottom right corner", "Sets the corner bottom right's bottom right corner.", ["calendarButton", 0, "cornerBottomRight"], 0, 50, undefined, "Corners"),
    cornerRadius: numberProp("slicer", "slicer.calendarButton.cornerRadius", "Rounded corners", "Sets the corner radius's rounded corners.", ["calendarButton", 0, "cornerRadius"], 0, 50, undefined, "Corners"),
    cornerTopLeft: numberProp("slicer", "slicer.calendarButton.cornerTopLeft", "Top left corner", "Sets the corner top left's top left corner.", ["calendarButton", 0, "cornerTopLeft"], 0, 50, undefined, "Corners"),
    cornerTopRight: numberProp("slicer", "slicer.calendarButton.cornerTopRight", "Top right corner", "Sets the corner top right's top right corner.", ["calendarButton", 0, "cornerTopRight"], 0, 50, undefined, "Corners"),
    individualCorners: boolProp("slicer", "slicer.calendarButton.individualCorners", "Individual corners", "Whether the individual corners is turned on.", ["calendarButton", 0, "individualCorners"], undefined, "Corners"),
    strokeColor: colorProp("slicer", "slicer.calendarButton.strokeColor", "Color", "The colour of the stroke.", ["calendarButton", 0, "strokeColor"], undefined, "Stroke"),
    strokePattern: enumProp("slicer", "slicer.calendarButton.strokePattern", "Line style", "Sets the stroke pattern's line style.", ["calendarButton", 0, "strokePattern"], [{"value":"solid","label":"Solid"},{"value":"dashed","label":"Dashed"},{"value":"dotted","label":"Dotted"}] as const, undefined, "Stroke"),
    strokeShow: boolProp("slicer", "slicer.calendarButton.strokeShow", "Show", "Whether the stroke is shown.", ["calendarButton", 0, "strokeShow"], undefined, "Stroke"),
    strokeTransparency: numberProp("slicer", "slicer.calendarButton.strokeTransparency", "Transparency", "How see-through the stroke appears — 0 is solid, 100 is invisible.", ["calendarButton", 0, "strokeTransparency"], 0, 100, undefined, "Stroke"),
    strokeWidth: numberProp("slicer", "slicer.calendarButton.strokeWidth", "Outline weight", "Thickness of the outline in pixels", ["calendarButton", 0, "strokeWidth"], 0, 10, undefined, "Stroke"),
  },

  numericInputStyle: {
    background: colorProp("slicer", "slicer.numericInputStyle.background", "Background color", "The colour of the background.", ["numericInputStyle", 0, "background"], undefined),
    bold: boolProp("slicer", "slicer.numericInputStyle.bold", "Bold", "Whether the numeric input's text is bold.", ["numericInputStyle", 0, "bold"], undefined),
    fontColor: colorProp("slicer", "slicer.numericInputStyle.fontColor", "Font color", "The colour of the font.", ["numericInputStyle", 0, "fontColor"], undefined),
    fontFamily: textProp("slicer", "slicer.numericInputStyle.fontFamily", "Font family", "The typeface used for the numeric input.", ["numericInputStyle", 0, "fontFamily"], undefined),
    italic: boolProp("slicer", "slicer.numericInputStyle.italic", "Italic", "Whether the numeric input's text is italic.", ["numericInputStyle", 0, "italic"], undefined),
    textSize: numberProp("slicer", "slicer.numericInputStyle.textSize", "Text size", "Sets the text's text size.", ["numericInputStyle", 0, "textSize"], 8, 60, undefined),
    underline: boolProp("slicer", "slicer.numericInputStyle.underline", "Underline", "Whether the numeric input's text is underlined.", ["numericInputStyle", 0, "underline"], undefined),
  },

  slider: {
    show: boolProp("slicer", "slicer.slider.show", "Show", "Whether the slider is shown.", ["slider", 0, "show"], undefined),
    color: colorProp("slicer", "slicer.slider.color", "Slider color", "The colour of the slider.", ["slider", 0, "color"], undefined),
    handleBorderColor: colorProp("slicer", "slicer.slider.handleBorderColor", "Border", "The colour of the handle border.", ["slider", 0, "handleBorderColor"], undefined),
    handleFillColor: colorProp("slicer", "slicer.slider.handleFillColor", "Fill", "The colour of the handle fill.", ["slider", 0, "handleFillColor"], undefined),
    secondaryLineColor: colorProp("slicer", "slicer.slider.secondaryLineColor", "Secondary line color", "The colour of the secondary line.", ["slider", 0, "secondaryLineColor"], undefined),
  },

  relativeText: {
    show: boolProp("slicer", "slicer.relativeText.show", "Show", "Whether the summary text is shown.", ["relativeText", 0, "show"], undefined),
    bold: boolProp("slicer", "slicer.relativeText.bold", "Bold", "Whether the summary text's text is bold.", ["relativeText", 0, "bold"], undefined),
    color: colorProp("slicer", "slicer.relativeText.color", "Color", "The colour of the summary text.", ["relativeText", 0, "color"], undefined),
    fontFamily: textProp("slicer", "slicer.relativeText.fontFamily", "Font family", "The typeface used for the summary text.", ["relativeText", 0, "fontFamily"], undefined),
    fontSize: numberProp("slicer", "slicer.relativeText.fontSize", "Text size", "Sets the summary text's text size.", ["relativeText", 0, "fontSize"], 8, 60, undefined),
    italic: boolProp("slicer", "slicer.relativeText.italic", "Italic", "Whether the summary text's text is italic.", ["relativeText", 0, "italic"], undefined),
    transparency: numberProp("slicer", "slicer.relativeText.transparency", "Transparency", "How see-through the summary text appears — 0 is solid, 100 is invisible.", ["relativeText", 0, "transparency"], 0, 100, undefined),
    underline: boolProp("slicer", "slicer.relativeText.underline", "Underline", "Whether the summary text's text is underlined.", ["relativeText", 0, "underline"], undefined),
  },

  pendingChangesIcon: {
    show: boolProp("slicer", "slicer.pendingChangesIcon.show", "Show", "Whether the pending changes icon is shown.", ["pendingChangesIcon", 0, "show"], undefined),
    color: colorProp("slicer", "slicer.pendingChangesIcon.color", "Color", "The colour of the pending changes icon.", ["pendingChangesIcon", 0, "color"], undefined),
    position: enumProp("slicer", "slicer.pendingChangesIcon.position", "Position", "Sets the pending changes icon's position.", ["pendingChangesIcon", 0, "position"], [{"value":"custom","label":"Custom"},{"value":"left","label":"Left of text"},{"value":"right","label":"Right of text"},{"value":"above","label":"Above text"},{"value":"below","label":"Below text"}] as const, undefined),
    showTooltip: boolProp("slicer", "slicer.pendingChangesIcon.showTooltip", "Show tooltip", "Whether the show tooltip is turned on.", ["pendingChangesIcon", 0, "showTooltip"], undefined),
    size: numberProp("slicer", "slicer.pendingChangesIcon.size", "Size", "Sets the pending changes icon's size.", ["pendingChangesIcon", 0, "size"], 1, 60, undefined),
    tooltipLabel: textProp("slicer", "slicer.pendingChangesIcon.tooltipLabel", "Label text", "The custom text used for the tooltip label.", ["pendingChangesIcon", 0, "tooltipLabel"], undefined),
    tooltipText: textProp("slicer", "slicer.pendingChangesIcon.tooltipText", "Tooltip text", "The custom text used for the tooltip.", ["pendingChangesIcon", 0, "tooltipText"], undefined),
    transparency: numberProp("slicer", "slicer.pendingChangesIcon.transparency", "Transparency", "Background color transparency", ["pendingChangesIcon", 0, "transparency"], 0, 100, undefined),
  },

  selectionIcon: {
    color: colorProp("slicer", "slicer.selectionIcon.color", "Color", "The colour of the selection icon.", ["selectionIcon", 0, "color"], undefined),
  },
} as const;

export type ResolvedSlicerStyle = {
  header: {
    show: boolean;
    background: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    italic: boolean;
    outlineStyle: number;
    showRestatement: boolean;
    text: string;
    textSize: number;
    underline: boolean;
  };
  items: {
    accessibilityContrastProperties: boolean;
    background: string;
    bold: boolean;
    expandCollapseToggleType: string | number;
    fontColor: string;
    fontFamily: string;
    italic: boolean;
    outlineStyle: number;
    padding: number;
    steppedLayoutIndentation: number;
    textSize: number;
    underline: boolean;
  };
  general: {
    count: number;
    formatString: string;
    orientation: string | number;
    outlineColor: string;
    outlineWeight: number;
    responsive: boolean;
    selfFilterEnabled: boolean;
  };
  selection: {
    selectAllCheckboxEnabled: boolean;
    singleSelect: boolean;
    strictSingleSelect: boolean;
  };
  searchBox: {
    background: string;
    borderColor: string;
    outlineStyle: number;
  };
  date: {
    background: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    hideDatePickerButton: boolean;
    italic: boolean;
    textSize: number;
    underline: boolean;
  };
  dateRange: {
    anchorDate: string;
    includeToday: boolean;
  };
  dateRangeText: {
    bold: boolean;
    color: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    transparency: number;
    underline: boolean;
  };
  calendarButton: {
    iconColor: string;
    iconSize: number;
    iconTransparency: number;
    backgroundColor: string;
    backgroundShow: boolean;
    backgroundTransparency: number;
    cornerBottomLeft: number;
    cornerBottomRight: number;
    cornerRadius: number;
    cornerTopLeft: number;
    cornerTopRight: number;
    individualCorners: boolean;
    strokeColor: string;
    strokePattern: string | number;
    strokeShow: boolean;
    strokeTransparency: number;
    strokeWidth: number;
  };
  numericInputStyle: {
    background: string;
    bold: boolean;
    fontColor: string;
    fontFamily: string;
    italic: boolean;
    textSize: number;
    underline: boolean;
  };
  slider: {
    show: boolean;
    color: string;
    handleBorderColor: string;
    handleFillColor: string;
    secondaryLineColor: string;
  };
  relativeText: {
    show: boolean;
    bold: boolean;
    color: string;
    fontFamily: string;
    fontSize: number;
    italic: boolean;
    transparency: number;
    underline: boolean;
  };
  pendingChangesIcon: {
    show: boolean;
    color: string;
    position: string | number;
    showTooltip: boolean;
    size: number;
    tooltipLabel: string;
    tooltipText: string;
    transparency: number;
  };
  selectionIcon: {
    color: string;
  };
};

/**
 * Resolves every Slicer property to its theme override, falling back to
 * the shared theme tokens (palette/background/foreground) for colour-like
 * fields and a plain Power BI-typical default otherwise.
 */
export function resolveSlicerStyle(theme: ThemeSource, base: ResolvedTheme): ResolvedSlicerStyle {
  const p = SLICER_PROPERTIES;
  return {
    header: {
      show: resolvePropertyValue(theme, p.header.show, true),
      background: resolvePropertyValue(theme, p.header.background, base.background),
      bold: resolvePropertyValue(theme, p.header.bold, false),
      fontColor: resolvePropertyValue(theme, p.header.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.header.fontFamily, ""),
      italic: resolvePropertyValue(theme, p.header.italic, false),
      outlineStyle: resolvePropertyValue(theme, p.header.outlineStyle, 0),
      showRestatement: resolvePropertyValue(theme, p.header.showRestatement, false),
      text: resolvePropertyValue(theme, p.header.text, ""),
      textSize: resolvePropertyValue(theme, p.header.textSize, 6),
      underline: resolvePropertyValue(theme, p.header.underline, false),
    },
    items: {
      accessibilityContrastProperties: resolvePropertyValue(theme, p.items.accessibilityContrastProperties, false),
      background: resolvePropertyValue(theme, p.items.background, base.background),
      bold: resolvePropertyValue(theme, p.items.bold, false),
      expandCollapseToggleType: resolvePropertyValue(theme, p.items.expandCollapseToggleType, 0),
      fontColor: resolvePropertyValue(theme, p.items.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.items.fontFamily, ""),
      italic: resolvePropertyValue(theme, p.items.italic, false),
      outlineStyle: resolvePropertyValue(theme, p.items.outlineStyle, 0),
      // Verified against themes/base/classic2026.json's slicer override.
      padding: resolvePropertyValue(theme, p.items.padding, 4),
      steppedLayoutIndentation: resolvePropertyValue(theme, p.items.steppedLayoutIndentation, 10),
      textSize: resolvePropertyValue(theme, p.items.textSize, 6),
      underline: resolvePropertyValue(theme, p.items.underline, false),
    },
    general: {
      count: resolvePropertyValue(theme, p.general.count, 10),
      formatString: resolvePropertyValue(theme, p.general.formatString, ""),
      orientation: resolvePropertyValue(theme, p.general.orientation, 0),
      outlineColor: resolvePropertyValue(theme, p.general.outlineColor, "#E3E3E3"),
      outlineWeight: resolvePropertyValue(theme, p.general.outlineWeight, 1),
      responsive: resolvePropertyValue(theme, p.general.responsive, true),
      selfFilterEnabled: resolvePropertyValue(theme, p.general.selfFilterEnabled, false),
    },
    selection: {
      selectAllCheckboxEnabled: resolvePropertyValue(theme, p.selection.selectAllCheckboxEnabled, false),
      singleSelect: resolvePropertyValue(theme, p.selection.singleSelect, false),
      strictSingleSelect: resolvePropertyValue(theme, p.selection.strictSingleSelect, false),
    },
    searchBox: {
      background: resolvePropertyValue(theme, p.searchBox.background, base.background),
      borderColor: resolvePropertyValue(theme, p.searchBox.borderColor, "#E3E3E3"),
      outlineStyle: resolvePropertyValue(theme, p.searchBox.outlineStyle, 0),
    },
    date: {
      background: resolvePropertyValue(theme, p.date.background, base.background),
      bold: resolvePropertyValue(theme, p.date.bold, false),
      fontColor: resolvePropertyValue(theme, p.date.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.date.fontFamily, ""),
      hideDatePickerButton: resolvePropertyValue(theme, p.date.hideDatePickerButton, false),
      italic: resolvePropertyValue(theme, p.date.italic, false),
      textSize: resolvePropertyValue(theme, p.date.textSize, 6),
      underline: resolvePropertyValue(theme, p.date.underline, false),
    },
    dateRange: {
      anchorDate: resolvePropertyValue(theme, p.dateRange.anchorDate, ""),
      includeToday: resolvePropertyValue(theme, p.dateRange.includeToday, true),
    },
    dateRangeText: {
      bold: resolvePropertyValue(theme, p.dateRangeText.bold, false),
      color: resolvePropertyValue(theme, p.dateRangeText.color, base.palette[0] ?? base.foreground),
      fontFamily: resolvePropertyValue(theme, p.dateRangeText.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.dateRangeText.fontSize, 6),
      italic: resolvePropertyValue(theme, p.dateRangeText.italic, false),
      transparency: resolvePropertyValue(theme, p.dateRangeText.transparency, 0),
      underline: resolvePropertyValue(theme, p.dateRangeText.underline, false),
    },
    calendarButton: {
      iconColor: resolvePropertyValue(theme, p.calendarButton.iconColor, base.palette[0] ?? base.foreground),
      iconSize: resolvePropertyValue(theme, p.calendarButton.iconSize, 6),
      iconTransparency: resolvePropertyValue(theme, p.calendarButton.iconTransparency, 0),
      backgroundColor: resolvePropertyValue(theme, p.calendarButton.backgroundColor, base.background),
      backgroundShow: resolvePropertyValue(theme, p.calendarButton.backgroundShow, true),
      backgroundTransparency: resolvePropertyValue(theme, p.calendarButton.backgroundTransparency, 0),
      cornerBottomLeft: resolvePropertyValue(theme, p.calendarButton.cornerBottomLeft, 4),
      cornerBottomRight: resolvePropertyValue(theme, p.calendarButton.cornerBottomRight, 4),
      cornerRadius: resolvePropertyValue(theme, p.calendarButton.cornerRadius, 4),
      cornerTopLeft: resolvePropertyValue(theme, p.calendarButton.cornerTopLeft, 4),
      cornerTopRight: resolvePropertyValue(theme, p.calendarButton.cornerTopRight, 4),
      individualCorners: resolvePropertyValue(theme, p.calendarButton.individualCorners, false),
      strokeColor: resolvePropertyValue(theme, p.calendarButton.strokeColor, "#E3E3E3"),
      strokePattern: resolvePropertyValue(theme, p.calendarButton.strokePattern, "solid"),
      strokeShow: resolvePropertyValue(theme, p.calendarButton.strokeShow, true),
      strokeTransparency: resolvePropertyValue(theme, p.calendarButton.strokeTransparency, 0),
      strokeWidth: resolvePropertyValue(theme, p.calendarButton.strokeWidth, 1),
    },
    numericInputStyle: {
      background: resolvePropertyValue(theme, p.numericInputStyle.background, base.background),
      bold: resolvePropertyValue(theme, p.numericInputStyle.bold, false),
      fontColor: resolvePropertyValue(theme, p.numericInputStyle.fontColor, base.foreground),
      fontFamily: resolvePropertyValue(theme, p.numericInputStyle.fontFamily, ""),
      italic: resolvePropertyValue(theme, p.numericInputStyle.italic, false),
      textSize: resolvePropertyValue(theme, p.numericInputStyle.textSize, 6),
      underline: resolvePropertyValue(theme, p.numericInputStyle.underline, false),
    },
    slider: {
      show: resolvePropertyValue(theme, p.slider.show, true),
      color: resolvePropertyValue(theme, p.slider.color, base.palette[0] ?? base.foreground),
      handleBorderColor: resolvePropertyValue(theme, p.slider.handleBorderColor, "#E3E3E3"),
      handleFillColor: resolvePropertyValue(theme, p.slider.handleFillColor, base.palette[0] ?? base.foreground),
      secondaryLineColor: resolvePropertyValue(theme, p.slider.secondaryLineColor, base.palette[0] ?? base.foreground),
    },
    relativeText: {
      show: resolvePropertyValue(theme, p.relativeText.show, true),
      bold: resolvePropertyValue(theme, p.relativeText.bold, false),
      color: resolvePropertyValue(theme, p.relativeText.color, base.palette[0] ?? base.foreground),
      fontFamily: resolvePropertyValue(theme, p.relativeText.fontFamily, ""),
      fontSize: resolvePropertyValue(theme, p.relativeText.fontSize, 6),
      italic: resolvePropertyValue(theme, p.relativeText.italic, false),
      transparency: resolvePropertyValue(theme, p.relativeText.transparency, 0),
      underline: resolvePropertyValue(theme, p.relativeText.underline, false),
    },
    pendingChangesIcon: {
      show: resolvePropertyValue(theme, p.pendingChangesIcon.show, true),
      color: resolvePropertyValue(theme, p.pendingChangesIcon.color, base.palette[0] ?? base.foreground),
      position: resolvePropertyValue(theme, p.pendingChangesIcon.position, "custom"),
      showTooltip: resolvePropertyValue(theme, p.pendingChangesIcon.showTooltip, true),
      size: resolvePropertyValue(theme, p.pendingChangesIcon.size, 6),
      tooltipLabel: resolvePropertyValue(theme, p.pendingChangesIcon.tooltipLabel, ""),
      tooltipText: resolvePropertyValue(theme, p.pendingChangesIcon.tooltipText, ""),
      transparency: resolvePropertyValue(theme, p.pendingChangesIcon.transparency, 0),
    },
    selectionIcon: {
      color: resolvePropertyValue(theme, p.selectionIcon.color, base.palette[0] ?? base.foreground),
    },
  };
}

export { propertyThemePath };
