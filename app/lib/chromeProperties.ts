import {
  boolProp,
  chromeThemePath,
  colorProp,
  enumProp,
  numberProp,
  resolveChromeValue,
  textProp,
  type VisualSchemaKey,
} from "./properties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * "Chrome" properties — title, subtitle, background, border — are defined
 * identically for every Power BI visual type (verified byte-for-byte equal
 * across visual-clusteredBarChart / visual-tableEx / visual-card in
 * reportThemeSchema-2.156.json), unlike the visual-specific registries in
 * tableProperties.ts and barChartProperties.ts.
 *
 * Because they're shared, they resolve differently: a specific visual's own
 * override (`visualStyles[type]["*"]`) wins if present, otherwise the theme
 * default that applies to every visual (`visualStyles["*"]["*"]`) is used —
 * see resolveChromeValue in properties.ts. The `visual: "*"` on each
 * definition below is just a placeholder; every read/write goes through
 * resolveChromeValue/chromeThemePath with an explicit visual context
 * instead of using this field directly.
 */

const ALIGNMENT_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const HEADING_OPTIONS = [
  { value: "Normal", label: "Normal" },
  { value: "Heading2", label: "Heading 2" },
  { value: "Heading3", label: "Heading 3" },
  { value: "Heading4", label: "Heading 4" },
  { value: "Heading5", label: "Heading 5" },
  { value: "Heading6", label: "Heading 6" },
] as const;

const DIVIDER_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

const DROPSHADOW_PRESET_OPTIONS = [
  { value: "BottomRight", label: "Bottom right" },
  { value: "Bottom", label: "Bottom" },
  { value: "BottomLeft", label: "Bottom left" },
  { value: "CenterRight", label: "Right" },
  { value: "Center", label: "Center" },
  { value: "CenterLeft", label: "Left" },
  { value: "TopRight", label: "Top right" },
  { value: "Top", label: "Top" },
  { value: "TopLeft", label: "Top left" },
  { value: "Custom", label: "Custom" },
] as const;

const DROPSHADOW_POSITION_OPTIONS = [
  { value: "Outer", label: "Outside" },
  { value: "Inner", label: "Inside" },
] as const;

const VISUALHEADERTOOLTIP_TYPE_OPTIONS = [
  { value: "Default", label: "Text" },
  { value: "Canvas", label: "Report page" },
] as const;

const VISUALLINK_TYPE_OPTIONS = [
  { value: "Back", label: "Back" },
  { value: "Bookmark", label: "Bookmark" },
  { value: "Drillthrough", label: "Drill through" },
  { value: "PageNavigation", label: "Page navigation" },
  { value: "Qna", label: "Q&A (retiring Dec 2026)" },
  { value: "WebUrl", label: "Web URL" },
  { value: "ApplyAllSlicers", label: "Apply all slicers" },
  { value: "ClearAllSlicers", label: "Clear all slicers" },
  { value: "DataFunction", label: "Data function" },
] as const;

const VISUALTOOLTIP_TYPE_OPTIONS = [
  { value: "Default", label: "Default" },
  { value: "Canvas", label: "Report page" },
] as const;

export const CHROME_PROPERTIES = {
  title: {
    show: boolProp("*", "chrome.title.show", "Show", "Whether the visual's title is shown.", ["title", 0, "show"]),
    text: textProp(
      "*",
      "chrome.title.text",
      "Title text",
      "The visual's title. Leave blank to use its default name.",
      ["title", 0, "text"],
    ),
    alignment: enumProp(
      "*",
      "chrome.title.alignment",
      "Alignment",
      "How the title text lines up within the visual's header.",
      ["title", 0, "alignment"],
      ALIGNMENT_OPTIONS,
    ),
    heading: enumProp(
      "*",
      "chrome.title.heading",
      "Title heading",
      "The heading level assistive technology announces for this title.",
      ["title", 0, "heading"],
      HEADING_OPTIONS,
      "Doesn't change how the title looks — only how screen readers describe it.",
    ),
    background: colorProp(
      "*",
      "chrome.title.background",
      "Background color",
      "The fill colour behind the title text.",
      ["title", 0, "background"],
    ),
    fontColor: colorProp(
      "*",
      "chrome.title.fontColor",
      "Font color",
      "The colour of the title text.",
      ["title", 0, "fontColor"],
    ),
    fontFamily: textProp(
      "*",
      "chrome.title.fontFamily",
      "Font family",
      "The typeface used for the title.",
      ["title", 0, "fontFamily"],
    ),
    fontSize: numberProp(
      "*",
      "chrome.title.fontSize",
      "Text size",
      "The text size used for the title.",
      ["title", 0, "fontSize"],
      8,
      60,
    ),
    bold: boolProp("*", "chrome.title.bold", "Bold", "Whether the title is bold.", ["title", 0, "bold"]),
    italic: boolProp("*", "chrome.title.italic", "Italic", "Whether the title is italic.", ["title", 0, "italic"]),
    underline: boolProp(
      "*",
      "chrome.title.underline",
      "Underline",
      "Whether the title is underlined.",
      ["title", 0, "underline"],
    ),
    titleWrap: boolProp(
      "*",
      "chrome.title.titleWrap",
      "Word wrap",
      "Whether a long title wraps onto a second line instead of being cut off.",
      ["title", 0, "titleWrap"],
    ),
  },

  subTitle: {
    show: boolProp("*", "chrome.subTitle.show", "Show", "Whether a subtitle is shown beneath the title.", ["subTitle", 0, "show"]),
    text: textProp("*", "chrome.subTitle.text", "Subtitle text", "The subtitle's text.", ["subTitle", 0, "text"]),
    alignment: enumProp(
      "*",
      "chrome.subTitle.alignment",
      "Alignment",
      "How the subtitle text lines up.",
      ["subTitle", 0, "alignment"],
      ALIGNMENT_OPTIONS,
    ),
    heading: enumProp(
      "*",
      "chrome.subTitle.heading",
      "Title heading",
      "The heading level assistive technology announces for this subtitle.",
      ["subTitle", 0, "heading"],
      HEADING_OPTIONS,
      "Doesn't change how the subtitle looks — only how screen readers describe it.",
    ),
    fontColor: colorProp(
      "*",
      "chrome.subTitle.fontColor",
      "Font color",
      "The colour of the subtitle text.",
      ["subTitle", 0, "fontColor"],
    ),
    fontFamily: textProp(
      "*",
      "chrome.subTitle.fontFamily",
      "Font family",
      "The typeface used for the subtitle.",
      ["subTitle", 0, "fontFamily"],
    ),
    fontSize: numberProp(
      "*",
      "chrome.subTitle.fontSize",
      "Text size",
      "The text size used for the subtitle.",
      ["subTitle", 0, "fontSize"],
      8,
      60,
    ),
    bold: boolProp("*", "chrome.subTitle.bold", "Bold", "Whether the subtitle is bold.", ["subTitle", 0, "bold"]),
    italic: boolProp("*", "chrome.subTitle.italic", "Italic", "Whether the subtitle is italic.", ["subTitle", 0, "italic"]),
    underline: boolProp(
      "*",
      "chrome.subTitle.underline",
      "Underline",
      "Whether the subtitle is underlined.",
      ["subTitle", 0, "underline"],
    ),
    titleWrap: boolProp(
      "*",
      "chrome.subTitle.titleWrap",
      "Word wrap",
      "Whether a long subtitle wraps onto a second line instead of being cut off.",
      ["subTitle", 0, "titleWrap"],
    ),
  },

  background: {
    show: boolProp(
      "*",
      "chrome.background.show",
      "Show",
      "Whether the visual has its own fill colour, instead of showing the canvas through it.",
      ["background", 0, "show"],
    ),
    color: colorProp(
      "*",
      "chrome.background.color",
      "Color",
      "The visual's background fill colour.",
      ["background", 0, "color"],
    ),
    transparency: numberProp(
      "*",
      "chrome.background.transparency",
      "Transparency",
      "How see-through the background fill appears — 0 is solid, 100 is invisible.",
      ["background", 0, "transparency"],
      0,
      100,
    ),
  },

  border: {
    show: boolProp("*", "chrome.border.show", "Show", "Whether a border is drawn around the visual.", ["border", 0, "show"]),
    color: colorProp("*", "chrome.border.color", "Color", "The colour of the border.", ["border", 0, "color"]),
    width: numberProp(
      "*",
      "chrome.border.width",
      "Width",
      "The thickness, in pixels, of the border.",
      ["border", 0, "width"],
      0,
      10,
    ),
    radius: numberProp(
      "*",
      "chrome.border.radius",
      "Radius",
      "How rounded the visual's corners are, in pixels.",
      ["border", 0, "radius"],
      0,
      24,
    ),
  },

  divider: {
    show: boolProp(
      "*",
      "chrome.divider.show",
      "Show",
      "Whether a divider line is drawn between the visual's title area and its body.",
      ["divider", 0, "show"],
    ),
    color: colorProp(
      "*",
      "chrome.divider.color",
      "Color",
      "The colour of the divider line.",
      ["divider", 0, "color"],
    ),
    width: numberProp(
      "*",
      "chrome.divider.width",
      "Width",
      "The thickness, in pixels, of the divider line.",
      ["divider", 0, "width"],
      0,
      10,
    ),
    style: enumProp(
      "*",
      "chrome.divider.style",
      "Line style",
      "Whether the divider line is solid, dashed, or dotted.",
      ["divider", 0, "style"],
      DIVIDER_STYLE_OPTIONS,
    ),
    ignorePadding: boolProp(
      "*",
      "chrome.divider.ignorePadding",
      "Ignore padding",
      "Whether the divider extends into the visual's padding instead of stopping at its edge.",
      ["divider", 0, "ignorePadding"],
    ),
  },

  dropShadow: {
    show: boolProp(
      "*",
      "chrome.dropShadow.show",
      "Show",
      "Whether a drop shadow is drawn behind the visual.",
      ["dropShadow", 0, "show"],
    ),
    preset: enumProp(
      "*",
      "chrome.dropShadow.preset",
      "Preset",
      "A ready-made shadow direction and offset to use instead of setting angle and distance manually.",
      ["dropShadow", 0, "preset"],
      DROPSHADOW_PRESET_OPTIONS,
    ),
    position: enumProp(
      "*",
      "chrome.dropShadow.position",
      "Shadow position",
      "Whether the shadow falls outside the visual's edge or inside it.",
      ["dropShadow", 0, "position"],
      DROPSHADOW_POSITION_OPTIONS,
    ),
    angle: numberProp(
      "*",
      "chrome.dropShadow.angle",
      "Angle",
      "The direction, in degrees, the shadow is cast.",
      ["dropShadow", 0, "angle"],
      0,
      360,
    ),
    color: colorProp(
      "*",
      "chrome.dropShadow.color",
      "Color",
      "The colour of the shadow.",
      ["dropShadow", 0, "color"],
    ),
    transparency: numberProp(
      "*",
      "chrome.dropShadow.transparency",
      "Transparency",
      "How see-through the shadow appears — 0 is solid, 100 is invisible.",
      ["dropShadow", 0, "transparency"],
      0,
      100,
    ),
    shadowDistance: numberProp(
      "*",
      "chrome.dropShadow.shadowDistance",
      "Distance",
      "How far the shadow is offset from the visual, in pixels.",
      ["dropShadow", 0, "shadowDistance"],
      0,
      100,
    ),
    shadowBlur: numberProp(
      "*",
      "chrome.dropShadow.shadowBlur",
      "Blur",
      "How soft the shadow's edge is, in pixels.",
      ["dropShadow", 0, "shadowBlur"],
      0,
      100,
    ),
    shadowSpread: numberProp(
      "*",
      "chrome.dropShadow.shadowSpread",
      "Size",
      "How far the shadow extends beyond the visual's own size, in pixels.",
      ["dropShadow", 0, "shadowSpread"],
      0,
      100,
    ),
  },

  general: {
    altText: textProp(
      "*",
      "chrome.general.altText",
      "Alt text",
      "Alternative text describing the visual for screen readers.",
      ["general", 0, "altText"],
    ),
    keepLayerOrder: boolProp(
      "*",
      "chrome.general.keepLayerOrder",
      "Maintain layer order",
      "Maintain layer order in reading view, even when selected.",
      ["general", 0, "keepLayerOrder"],
    ),
    allowBinnedLineSample: boolProp(
      "*",
      "chrome.general.allowBinnedLineSample",
      "High density sampling",
      "Whether line charts with very dense data are simplified for faster rendering.",
      ["general", 0, "allowBinnedLineSample"],
    ),
    allowOverlappingPointsSample: boolProp(
      "*",
      "chrome.general.allowOverlappingPointsSample",
      "High density sampling",
      "Whether charts with many overlapping data points are simplified for faster rendering.",
      ["general", 0, "allowOverlappingPointsSample"],
    ),
  },

  lockAspect: {
    show: boolProp(
      "*",
      "chrome.lockAspect.show",
      "Show",
      "Whether resizing the visual keeps its width-to-height ratio fixed.",
      ["lockAspect", 0, "show"],
    ),
  },

  padding: {
    top: numberProp(
      "*",
      "chrome.padding.top",
      "Top padding",
      "The space, in pixels, reserved inside the visual's top edge.",
      ["padding", 0, "top"],
      0,
      200,
    ),
    right: numberProp(
      "*",
      "chrome.padding.right",
      "Right padding",
      "The space, in pixels, reserved inside the visual's right edge.",
      ["padding", 0, "right"],
      0,
      200,
    ),
    bottom: numberProp(
      "*",
      "chrome.padding.bottom",
      "Bottom padding",
      "The space, in pixels, reserved inside the visual's bottom edge.",
      ["padding", 0, "bottom"],
      0,
      200,
    ),
    left: numberProp(
      "*",
      "chrome.padding.left",
      "Left padding",
      "The space, in pixels, reserved inside the visual's left edge.",
      ["padding", 0, "left"],
      0,
      200,
    ),
  },

  spacing: {
    customizeSpacing: boolProp(
      "*",
      "chrome.spacing.customizeSpacing",
      "Customize spacing",
      "Whether the spacing values below override the visual's default internal spacing.",
      ["spacing", 0, "customizeSpacing"],
    ),
    spaceAboveDivider: numberProp(
      "*",
      "chrome.spacing.spaceAboveDivider",
      "Space above divider",
      "Space, in pixels, above the divider line.",
      ["spacing", 0, "spaceAboveDivider"],
      0,
      200,
    ),
    spaceAbovePlotArea: numberProp(
      "*",
      "chrome.spacing.spaceAbovePlotArea",
      "Space above plot area",
      "Space, in pixels, above the visual's plot area.",
      ["spacing", 0, "spaceAbovePlotArea"],
      0,
      200,
    ),
    spaceAboveSubtitle: numberProp(
      "*",
      "chrome.spacing.spaceAboveSubtitle",
      "Space above subtitle",
      "Space, in pixels, above the subtitle.",
      ["spacing", 0, "spaceAboveSubtitle"],
      0,
      200,
    ),
    spaceBelowSubTitle: numberProp(
      "*",
      "chrome.spacing.spaceBelowSubTitle",
      "Space below subtitle",
      "Space, in pixels, below the subtitle.",
      ["spacing", 0, "spaceBelowSubTitle"],
      0,
      200,
    ),
    spaceBelowTitle: numberProp(
      "*",
      "chrome.spacing.spaceBelowTitle",
      "Space below title",
      "Space, in pixels, below the title.",
      ["spacing", 0, "spaceBelowTitle"],
      0,
      200,
    ),
    spaceBelowTitleArea: numberProp(
      "*",
      "chrome.spacing.spaceBelowTitleArea",
      "Space below title area",
      "Space, in pixels, below the entire title area.",
      ["spacing", 0, "spaceBelowTitleArea"],
      0,
      200,
    ),
    verticalSpacing: numberProp(
      "*",
      "chrome.spacing.verticalSpacing",
      "Space between label and value",
      "Space, in pixels, between a label and its value.",
      ["spacing", 0, "verticalSpacing"],
      0,
      200,
    ),
  },

  stylePreset: {
    name: textProp(
      "*",
      "chrome.stylePreset.name",
      "Style",
      "The name of a built-in style preset applied to the visual before any other overrides.",
      ["stylePreset", 0, "name"],
    ),
  },

  visualHeader: {
    show: boolProp(
      "*",
      "chrome.visualHeader.show",
      "Show",
      "Whether the visual header toolbar — the icon row shown on hover — appears at all.",
      ["visualHeader", 0, "show"],
    ),
    background: colorProp(
      "*",
      "chrome.visualHeader.background",
      "Background color",
      "The background color for the visual header",
      ["visualHeader", 0, "background"], undefined, "Appearance",
    ),
    border: colorProp(
      "*",
      "chrome.visualHeader.border",
      "Border",
      "The colour of the line separating the header from the visual.",
      ["visualHeader", 0, "border"], undefined, "Appearance",
    ),
    foreground: colorProp(
      "*",
      "chrome.visualHeader.foreground",
      "Icon color",
      "The color for the visual header icons",
      ["visualHeader", 0, "foreground"], undefined, "Appearance",
    ),
    transparency: numberProp(
      "*",
      "chrome.visualHeader.transparency",
      "Transparency",
      "How see-through the visual header's background appears.",
      ["visualHeader", 0, "transparency"],
      0,
      100, undefined, "Appearance",
    ),
    showCommentButton: boolProp(
      "*",
      "chrome.visualHeader.showCommentButton",
      "Comment button",
      "Select to show comment indicator button. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showCommentButton"], undefined, "Icons",
    ),
    showCopilotSummaryButton: boolProp(
      "*",
      "chrome.visualHeader.showCopilotSummaryButton",
      "Copilot summary",
      "Select to show the Copilot summary icon",
      ["visualHeader", 0, "showCopilotSummaryButton"], undefined, "Icons",
    ),
    showCopyVisualImageButton: boolProp(
      "*",
      "chrome.visualHeader.showCopyVisualImageButton",
      "Copy icon",
      "Turn on the copy icon to allow people in reading view to copy visuals and paste them elsewhere",
      ["visualHeader", 0, "showCopyVisualImageButton"], undefined, "Icons",
    ),
    showDrillDownExpandButton: boolProp(
      "*",
      "chrome.visualHeader.showDrillDownExpandButton",
      "Expand to next level icon",
      "Select to turn on expand to next level icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showDrillDownExpandButton"], undefined, "Icons",
    ),
    showDrillDownLevelButton: boolProp(
      "*",
      "chrome.visualHeader.showDrillDownLevelButton",
      "Show next level icon",
      "Select to turn on show next level icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showDrillDownLevelButton"], undefined, "Icons",
    ),
    showDrillRoleSelector: boolProp(
      "*",
      "chrome.visualHeader.showDrillRoleSelector",
      "Drill on dropdown",
      "Select to turn on drill on dropdown. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showDrillRoleSelector"], undefined, "Icons",
    ),
    showDrillToggleButton: boolProp(
      "*",
      "chrome.visualHeader.showDrillToggleButton",
      "Drill down icon",
      "Select to turn on drill down icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showDrillToggleButton"], undefined, "Icons",
    ),
    showDrillUpButton: boolProp(
      "*",
      "chrome.visualHeader.showDrillUpButton",
      "Drill up icon",
      "Select to turn on drill up icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showDrillUpButton"], undefined, "Icons",
    ),
    showFilterRestatementButton: boolProp(
      "*",
      "chrome.visualHeader.showFilterRestatementButton",
      "Filter icon",
      "Turn on the filter icon to show users a summary of the visual-level filters applied to each visual.",
      ["visualHeader", 0, "showFilterRestatementButton"], undefined, "Icons",
    ),
    showFocusModeButton: boolProp(
      "*",
      "chrome.visualHeader.showFocusModeButton",
      "Focus mode icon",
      "Select to turn on focus mode icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showFocusModeButton"], undefined, "Icons",
    ),
    showFollowVisualButton: boolProp(
      "*",
      "chrome.visualHeader.showFollowVisualButton",
      "Follow visual button",
      "Turn on the follow visual icon to allow people to get alerts whenever a measure changes in the visual. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showFollowVisualButton"], undefined, "Icons",
    ),
    showOptionsMenu: boolProp(
      "*",
      "chrome.visualHeader.showOptionsMenu",
      "More options icon",
      "Select to turn on more options icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showOptionsMenu"], undefined, "Icons",
    ),
    showPersonalizeVisualButton: boolProp(
      "*",
      "chrome.visualHeader.showPersonalizeVisualButton",
      "Personalize visual",
      "Allow report readers to personalize this visual to suit their needs.",
      ["visualHeader", 0, "showPersonalizeVisualButton"], undefined, "Icons",
    ),
    showPinButton: boolProp(
      "*",
      "chrome.visualHeader.showPinButton",
      "Pin icon",
      "Select to turn on pin icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showPinButton"], undefined, "Icons",
    ),
    showSeeDataLayoutToggleButton: boolProp(
      "*",
      "chrome.visualHeader.showSeeDataLayoutToggleButton",
      "See data layout icon",
      "Select to turn on See Data layout icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showSeeDataLayoutToggleButton"], undefined, "Icons",
    ),
    showSetAlertButton: boolProp(
      "*",
      "chrome.visualHeader.showSetAlertButton",
      "Set alert button",
      "Turn on the set alert icon to allow people to create an alert on a measure in the visual. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showSetAlertButton"], undefined, "Icons",
    ),
    showSmartNarrativeButton: boolProp(
      "*",
      "chrome.visualHeader.showSmartNarrativeButton",
      "Smart narrative",
      "Select to turn on smart narrative icon.",
      ["visualHeader", 0, "showSmartNarrativeButton"], undefined, "Icons",
    ),
    showTooltipButton: boolProp(
      "*",
      "chrome.visualHeader.showTooltipButton",
      "Visual header tooltip icon",
      "Select to show the visual header tooltip icon",
      ["visualHeader", 0, "showTooltipButton"], undefined, "Icons",
    ),
    showVisualErrorButton: boolProp(
      "*",
      "chrome.visualHeader.showVisualErrorButton",
      "Visual error icon",
      "Select to turn on visual error icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showVisualErrorButton"], undefined, "Icons",
    ),
    showVisualInformationButton: boolProp(
      "*",
      "chrome.visualHeader.showVisualInformationButton",
      "Visual information icon",
      "Select to turn on visual information icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showVisualInformationButton"], undefined, "Icons",
    ),
    showVisualWarningButton: boolProp(
      "*",
      "chrome.visualHeader.showVisualWarningButton",
      "Visual warning icon",
      "Select to turn on visual warning icon. Changes to the visual header icon's visibility will only be applied in reading view.",
      ["visualHeader", 0, "showVisualWarningButton"], undefined, "Icons",
    ),
  },

  visualHeaderTooltip: {
    type: enumProp(
      "*",
      "chrome.visualHeaderTooltip.type",
      "Type",
      "Whether the header's tooltip icon shows plain text or an entire report page.",
      ["visualHeaderTooltip", 0, "type"],
      VISUALHEADERTOOLTIP_TYPE_OPTIONS,
    ),
    text: textProp(
      "*",
      "chrome.visualHeaderTooltip.text",
      "Tooltip text",
      "Write the custom tooltip that will show up when a report page tooltip hasn't been chosen or isn't supported",
      ["visualHeaderTooltip", 0, "text"],
    ),
    section: textProp(
      "*",
      "chrome.visualHeaderTooltip.section",
      "Page",
      "Choose the page you want to use for your tooltip",
      ["visualHeaderTooltip", 0, "section"],
    ),
    bold: boolProp(
      "*",
      "chrome.visualHeaderTooltip.bold",
      "Bold",
      "Whether the tooltip text is bold.",
      ["visualHeaderTooltip", 0, "bold"], undefined, "Font",
    ),
    italic: boolProp(
      "*",
      "chrome.visualHeaderTooltip.italic",
      "Italic",
      "Whether the tooltip text is italic.",
      ["visualHeaderTooltip", 0, "italic"], undefined, "Font",
    ),
    underline: boolProp(
      "*",
      "chrome.visualHeaderTooltip.underline",
      "Underline",
      "Whether the tooltip text is underlined.",
      ["visualHeaderTooltip", 0, "underline"], undefined, "Font",
    ),
    fontFamily: textProp(
      "*",
      "chrome.visualHeaderTooltip.fontFamily",
      "Font family",
      "Font family for the tooltip",
      ["visualHeaderTooltip", 0, "fontFamily"], undefined, "Font",
    ),
    fontSize: numberProp(
      "*",
      "chrome.visualHeaderTooltip.fontSize",
      "Text size",
      "Font size for the tooltip",
      ["visualHeaderTooltip", 0, "fontSize"],
      8,
      60, undefined, "Font",
    ),
    titleFontColor: colorProp(
      "*",
      "chrome.visualHeaderTooltip.titleFontColor",
      "Font color",
      "Font color for the tooltip",
      ["visualHeaderTooltip", 0, "titleFontColor"], undefined, "Font",
    ),
    themedTitleFontColor: colorProp(
      "*",
      "chrome.visualHeaderTooltip.themedTitleFontColor",
      "Font color (themed)",
      "Font color for the tooltip",
      ["visualHeaderTooltip", 0, "themedTitleFontColor"], undefined, "Font",
    ),
    background: colorProp(
      "*",
      "chrome.visualHeaderTooltip.background",
      "Background color",
      "Background color for the tooltip",
      ["visualHeaderTooltip", 0, "background"], undefined, "Background",
    ),
    themedBackground: colorProp(
      "*",
      "chrome.visualHeaderTooltip.themedBackground",
      "Background color (themed)",
      "Background color for the tooltip",
      ["visualHeaderTooltip", 0, "themedBackground"], undefined, "Background",
    ),
    transparency: numberProp(
      "*",
      "chrome.visualHeaderTooltip.transparency",
      "Transparency",
      "Set transparency for the tooltip background",
      ["visualHeaderTooltip", 0, "transparency"],
      0,
      100, undefined, "Background",
    ),
  },

  visualLink: {
    show: boolProp(
      "*",
      "chrome.visualLink.show",
      "Show",
      "Whether this visual acts as a clickable link or action element.",
      ["visualLink", 0, "show"],
    ),
    type: enumProp(
      "*",
      "chrome.visualLink.type",
      "Type",
      "Choose what action will occur when this element is selected.",
      ["visualLink", 0, "type"],
      VISUALLINK_TYPE_OPTIONS,
    ),
    bookmark: textProp(
      "*",
      "chrome.visualLink.bookmark",
      "Bookmark",
      "Choose which bookmark will open when this element is selected.",
      ["visualLink", 0, "bookmark"], undefined, "Destination",
    ),
    drillthroughSection: textProp(
      "*",
      "chrome.visualLink.drillthroughSection",
      "Destination",
      "Select a single destination or use conditional formatting for custom destination logic, such as multi-destination support.",
      ["visualLink", 0, "drillthroughSection"], undefined, "Destination",
    ),
    navigationSection: textProp(
      "*",
      "chrome.visualLink.navigationSection",
      "Destination",
      "Select a single destination or use conditional formatting for custom destination logic, such as multi-destination support.",
      ["visualLink", 0, "navigationSection"], undefined, "Destination",
    ),
    webUrl: textProp(
      "*",
      "chrome.visualLink.webUrl",
      "Web URL",
      "The URL opened when this element is selected.",
      ["visualLink", 0, "webUrl"], undefined, "Destination",
    ),
    tooltip: textProp(
      "*",
      "chrome.visualLink.tooltip",
      "Tooltip",
      "Write the custom tooltip that will show when users hover over this element.",
      ["visualLink", 0, "tooltip"], undefined, "Tooltip",
    ),
    tooltipPlaceholderText: textProp(
      "*",
      "chrome.visualLink.tooltipPlaceholderText",
      "Placeholder for tooltip",
      "Placeholder text shown in the tooltip before it's written.",
      ["visualLink", 0, "tooltipPlaceholderText"], undefined, "Tooltip",
    ),
    showDefaultTooltip: boolProp(
      "*",
      "chrome.visualLink.showDefaultTooltip",
      "Show tooltips",
      "Whether the default action tooltip is shown.",
      ["visualLink", 0, "showDefaultTooltip"], undefined, "Tooltip",
    ),
    suppressDefaultTooltip: boolProp(
      "*",
      "chrome.visualLink.suppressDefaultTooltip",
      "No tooltips",
      "Whether the default action tooltip is hidden even when no custom tooltip is set.",
      ["visualLink", 0, "suppressDefaultTooltip"], undefined, "Tooltip",
    ),
    enabledTooltip: textProp(
      "*",
      "chrome.visualLink.enabledTooltip",
      "Enabled tooltip",
      "The tooltip text shown when this action is enabled.",
      ["visualLink", 0, "enabledTooltip"], undefined, "Tooltip",
    ),
    disabledTooltip: textProp(
      "*",
      "chrome.visualLink.disabledTooltip",
      "Disabled tooltip",
      "The tooltip text shown when this action is disabled.",
      ["visualLink", 0, "disabledTooltip"], undefined, "Tooltip",
    ),
  },

  visualTooltip: {
    show: boolProp(
      "*",
      "chrome.visualTooltip.show",
      "Show",
      "Whether a tooltip appears when hovering over the visual.",
      ["visualTooltip", 0, "show"],
    ),
    type: enumProp(
      "*",
      "chrome.visualTooltip.type",
      "Type",
      "Allows report pages to be used as tooltips for this visual",
      ["visualTooltip", 0, "type"],
      VISUALTOOLTIP_TYPE_OPTIONS,
    ),
    bold: boolProp(
      "*",
      "chrome.visualTooltip.bold",
      "Bold",
      "Whether the tooltip text is bold.",
      ["visualTooltip", 0, "bold"], undefined, "Font",
    ),
    italic: boolProp(
      "*",
      "chrome.visualTooltip.italic",
      "Italic",
      "Whether the tooltip text is italic.",
      ["visualTooltip", 0, "italic"], undefined, "Font",
    ),
    underline: boolProp(
      "*",
      "chrome.visualTooltip.underline",
      "Underline",
      "Whether the tooltip text is underlined.",
      ["visualTooltip", 0, "underline"], undefined, "Font",
    ),
    fontFamily: textProp(
      "*",
      "chrome.visualTooltip.fontFamily",
      "Font family",
      "Font family for the tooltip",
      ["visualTooltip", 0, "fontFamily"], undefined, "Font",
    ),
    fontSize: numberProp(
      "*",
      "chrome.visualTooltip.fontSize",
      "Text size",
      "Font size for the tooltip",
      ["visualTooltip", 0, "fontSize"],
      8,
      60, undefined, "Font",
    ),
    titleFontColor: colorProp(
      "*",
      "chrome.visualTooltip.titleFontColor",
      "Label text color",
      "Text color for the tooltip label",
      ["visualTooltip", 0, "titleFontColor"], undefined, "Font",
    ),
    themedTitleFontColor: colorProp(
      "*",
      "chrome.visualTooltip.themedTitleFontColor",
      "Label text color (themed)",
      "Text color for the tooltip label",
      ["visualTooltip", 0, "themedTitleFontColor"], undefined, "Font",
    ),
    valueFontColor: colorProp(
      "*",
      "chrome.visualTooltip.valueFontColor",
      "Value text color",
      "Text color for the tooltip value",
      ["visualTooltip", 0, "valueFontColor"], undefined, "Font",
    ),
    themedValueFontColor: colorProp(
      "*",
      "chrome.visualTooltip.themedValueFontColor",
      "Value text color (themed)",
      "Text color for the tooltip value",
      ["visualTooltip", 0, "themedValueFontColor"], undefined, "Font",
    ),
    actionFontColor: colorProp(
      "*",
      "chrome.visualTooltip.actionFontColor",
      "Drill text and icon color",
      "Color for drill icon and text",
      ["visualTooltip", 0, "actionFontColor"], undefined, "Font",
    ),
    background: colorProp(
      "*",
      "chrome.visualTooltip.background",
      "Background color",
      "Background color for the tooltip",
      ["visualTooltip", 0, "background"], undefined, "Background",
    ),
    themedBackground: colorProp(
      "*",
      "chrome.visualTooltip.themedBackground",
      "Background color (themed)",
      "Background color for the tooltip",
      ["visualTooltip", 0, "themedBackground"], undefined, "Background",
    ),
    transparency: numberProp(
      "*",
      "chrome.visualTooltip.transparency",
      "Transparency",
      "Set transparency for the tooltip background",
      ["visualTooltip", 0, "transparency"],
      0,
      100, undefined, "Background",
    ),
    showActionsInTooltips: boolProp(
      "*",
      "chrome.visualTooltip.showActionsInTooltips",
      "Actions",
      "Add drill options within tooltips",
      ["visualTooltip", 0, "showActionsInTooltips"], undefined, "Behavior",
    ),
    showChartSpecificTooltips: boolProp(
      "*",
      "chrome.visualTooltip.showChartSpecificTooltips",
      "Chart-specific tooltips",
      "Show chart-specific tooltips",
      ["visualTooltip", 0, "showChartSpecificTooltips"], undefined, "Behavior",
    ),
    showSentenceFormat: boolProp(
      "*",
      "chrome.visualTooltip.showSentenceFormat",
      "Sentence format only",
      "Display tooltips using your sentence template",
      ["visualTooltip", 0, "showSentenceFormat"], undefined, "Behavior",
    ),
    showTooltipFieldsOnly: boolProp(
      "*",
      "chrome.visualTooltip.showTooltipFieldsOnly",
      "Tooltip fields only",
      "Include only the fields you've explicitly added to Tooltips in the Build visual pane",
      ["visualTooltip", 0, "showTooltipFieldsOnly"], undefined, "Behavior",
    ),
    showValuesInBold: boolProp(
      "*",
      "chrome.visualTooltip.showValuesInBold",
      "Bold values",
      "Show sentence values in bold",
      ["visualTooltip", 0, "showValuesInBold"], undefined, "Behavior",
    ),
    sentenceTemplate: textProp(
      "*",
      "chrome.visualTooltip.sentenceTemplate",
      "Sentence template",
      "A template string with {placeholder} tokens that are replaced with tooltip values",
      ["visualTooltip", 0, "sentenceTemplate"], undefined, "Behavior",
    ),
    section: textProp(
      "*",
      "chrome.visualTooltip.section",
      "Page",
      "Choose the page you want to use for your tooltip",
      ["visualTooltip", 0, "section"], undefined, "Behavior",
    ),
  },

} as const;

export type ResolvedChromeStyle = {
  title: {
    show: boolean;
    text: string;
    alignment: string | number;
    heading: string | number;
    background: string;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    titleWrap: boolean;
  };
  subTitle: {
    show: boolean;
    text: string;
    alignment: string | number;
    heading: string | number;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    titleWrap: boolean;
  };
  background: {
    show: boolean;
    color: string;
    transparency: number;
  };
  border: {
    show: boolean;
    color: string;
    width: number;
    radius: number;
  };
  divider: {
    show: boolean;
    color: string;
    width: number;
    style: string | number;
    ignorePadding: boolean;
  };
  dropShadow: {
    show: boolean;
    preset: string | number;
    position: string | number;
    angle: number;
    color: string;
    transparency: number;
    shadowDistance: number;
    shadowBlur: number;
    shadowSpread: number;
  };
  general: {
    altText: string;
    keepLayerOrder: boolean;
    allowBinnedLineSample: boolean;
    allowOverlappingPointsSample: boolean;
  };
  lockAspect: {
    show: boolean;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  spacing: {
    customizeSpacing: boolean;
    spaceAboveDivider: number;
    spaceAbovePlotArea: number;
    spaceAboveSubtitle: number;
    spaceBelowSubTitle: number;
    spaceBelowTitle: number;
    spaceBelowTitleArea: number;
    verticalSpacing: number;
  };
  stylePreset: {
    name: string;
  };
  visualHeader: {
    show: boolean;
    background: string;
    border: string;
    foreground: string;
    transparency: number;
    showCommentButton: boolean;
    showCopilotSummaryButton: boolean;
    showCopyVisualImageButton: boolean;
    showDrillDownExpandButton: boolean;
    showDrillDownLevelButton: boolean;
    showDrillRoleSelector: boolean;
    showDrillToggleButton: boolean;
    showDrillUpButton: boolean;
    showFilterRestatementButton: boolean;
    showFocusModeButton: boolean;
    showFollowVisualButton: boolean;
    showOptionsMenu: boolean;
    showPersonalizeVisualButton: boolean;
    showPinButton: boolean;
    showSeeDataLayoutToggleButton: boolean;
    showSetAlertButton: boolean;
    showSmartNarrativeButton: boolean;
    showTooltipButton: boolean;
    showVisualErrorButton: boolean;
    showVisualInformationButton: boolean;
    showVisualWarningButton: boolean;
  };
  visualHeaderTooltip: {
    type: string | number;
    text: string;
    section: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontFamily: string;
    fontSize: number;
    titleFontColor: string;
    themedTitleFontColor: string;
    background: string;
    themedBackground: string;
    transparency: number;
  };
  visualLink: {
    show: boolean;
    type: string | number;
    bookmark: string;
    drillthroughSection: string;
    navigationSection: string;
    webUrl: string;
    tooltip: string;
    tooltipPlaceholderText: string;
    showDefaultTooltip: boolean;
    suppressDefaultTooltip: boolean;
    enabledTooltip: string;
    disabledTooltip: string;
  };
  visualTooltip: {
    show: boolean;
    type: string | number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontFamily: string;
    fontSize: number;
    titleFontColor: string;
    themedTitleFontColor: string;
    valueFontColor: string;
    themedValueFontColor: string;
    actionFontColor: string;
    background: string;
    themedBackground: string;
    transparency: number;
    showActionsInTooltips: boolean;
    showChartSpecificTooltips: boolean;
    showSentenceFormat: boolean;
    showTooltipFieldsOnly: boolean;
    showValuesInBold: boolean;
    sentenceTemplate: string;
    section: string;
  };
};

/**
 * Resolves chrome properties for one visual type, checking that visual's
 * own override first, then the theme-wide shared default, then a plain
 * fallback — see resolveChromeValue in properties.ts.
 */
export function resolveChromeStyle(
  theme: PowerBITheme,
  activeVisual: VisualSchemaKey,
  base: ResolvedTheme,
): ResolvedChromeStyle {
  const p = CHROME_PROPERTIES;
  // Classic 2026 (themes/base/classic2026.json) overrides background.show
  // and visualHeader.show back to false for every "canvas object" visual
  // type (shape, image, actionButton, textbox, pageNavigator,
  // bookmarkNavigator — plus "group"/"basicShape", which this app doesn't
  // model as distinct visual types) — unlike data visuals, these don't get
  // a white background box or the options/filter/pin icon header by
  // default.
  const isCanvasObject =
    activeVisual === "shape" ||
    activeVisual === "image" ||
    activeVisual === "actionButton" ||
    activeVisual === "textbox" ||
    activeVisual === "pageNavigator" ||
    activeVisual === "bookmarkNavigator";
  return {
    title: {
      show: resolveChromeValue(theme, activeVisual, p.title.show, true),
      text: resolveChromeValue(theme, activeVisual, p.title.text, ""),
      alignment: resolveChromeValue(theme, activeVisual, p.title.alignment, "left"),
      heading: resolveChromeValue(theme, activeVisual, p.title.heading, "Normal"),
      background: resolveChromeValue(theme, activeVisual, p.title.background, base.background),
      fontColor: resolveChromeValue(theme, activeVisual, p.title.fontColor, base.foreground),
      fontFamily: resolveChromeValue(theme, activeVisual, p.title.fontFamily, base.fontFamily),
      fontSize: resolveChromeValue(theme, activeVisual, p.title.fontSize, base.titleSize),
      bold: resolveChromeValue(theme, activeVisual, p.title.bold, true),
      italic: resolveChromeValue(theme, activeVisual, p.title.italic, false),
      underline: resolveChromeValue(theme, activeVisual, p.title.underline, false),
      // Verified against themes/base/classic2026.json's shared
      // visualStyles["*"]["*"].title group.
      titleWrap: resolveChromeValue(theme, activeVisual, p.title.titleWrap, true),
    },
    subTitle: {
      show: resolveChromeValue(theme, activeVisual, p.subTitle.show, false),
      text: resolveChromeValue(theme, activeVisual, p.subTitle.text, ""),
      alignment: resolveChromeValue(theme, activeVisual, p.subTitle.alignment, "left"),
      heading: resolveChromeValue(theme, activeVisual, p.subTitle.heading, "Normal"),
      fontColor: resolveChromeValue(theme, activeVisual, p.subTitle.fontColor, base.muted),
      fontFamily: resolveChromeValue(theme, activeVisual, p.subTitle.fontFamily, base.fontFamily),
      fontSize: resolveChromeValue(theme, activeVisual, p.subTitle.fontSize, 10),
      bold: resolveChromeValue(theme, activeVisual, p.subTitle.bold, false),
      italic: resolveChromeValue(theme, activeVisual, p.subTitle.italic, false),
      underline: resolveChromeValue(theme, activeVisual, p.subTitle.underline, false),
      titleWrap: resolveChromeValue(theme, activeVisual, p.subTitle.titleWrap, false),
    },
    background: {
      // show/transparency verified against themes/base/classic2026.json's
      // shared background group ({show: true, transparency: 0}) — this
      // visual chrome background is a distinct group from the page's own
      // outspace/background (see globalOptionsProperties.ts). Canvas
      // objects (see isCanvasObject above) override this back to false.
      show: resolveChromeValue(theme, activeVisual, p.background.show, !isCanvasObject),
      color: resolveChromeValue(theme, activeVisual, p.background.color, base.background),
      transparency: resolveChromeValue(theme, activeVisual, p.background.transparency, 0),
    },
    border: {
      show: resolveChromeValue(theme, activeVisual, p.border.show, false),
      color: resolveChromeValue(theme, activeVisual, p.border.color, "#E3E3E3"),
      width: resolveChromeValue(theme, activeVisual, p.border.width, 1),
      radius: resolveChromeValue(theme, activeVisual, p.border.radius, 0),
    },
      divider: {
      show: resolveChromeValue(theme, activeVisual, p.divider.show, false),
      color: resolveChromeValue(theme, activeVisual, p.divider.color, "#E3E3E3"),
      // A divider that's switched on but 0px wide is invisible — same
      // class of bug as the compound `*Width` fallbacks that defaulted to
      // 0. Any "thickness of a thing that is otherwise on" needs a
      // non-zero default.
      width: resolveChromeValue(theme, activeVisual, p.divider.width, 1),
      style: resolveChromeValue(theme, activeVisual, p.divider.style, "solid"),
      ignorePadding: resolveChromeValue(theme, activeVisual, p.divider.ignorePadding, false),
    },
    dropShadow: {
      show: resolveChromeValue(theme, activeVisual, p.dropShadow.show, false),
      preset: resolveChromeValue(theme, activeVisual, p.dropShadow.preset, "BottomRight"),
      position: resolveChromeValue(theme, activeVisual, p.dropShadow.position, "Outer"),
      angle: resolveChromeValue(theme, activeVisual, p.dropShadow.angle, 45),
      color: resolveChromeValue(theme, activeVisual, p.dropShadow.color, "#000000"),
      transparency: resolveChromeValue(theme, activeVisual, p.dropShadow.transparency, 60),
      shadowDistance: resolveChromeValue(theme, activeVisual, p.dropShadow.shadowDistance, 2),
      shadowBlur: resolveChromeValue(theme, activeVisual, p.dropShadow.shadowBlur, 5),
      shadowSpread: resolveChromeValue(theme, activeVisual, p.dropShadow.shadowSpread, 0),
    },
    general: {
      altText: resolveChromeValue(theme, activeVisual, p.general.altText, ""),
      keepLayerOrder: resolveChromeValue(theme, activeVisual, p.general.keepLayerOrder, false),
      allowBinnedLineSample: resolveChromeValue(theme, activeVisual, p.general.allowBinnedLineSample, false),
      allowOverlappingPointsSample: resolveChromeValue(theme, activeVisual, p.general.allowOverlappingPointsSample, false),
    },
    lockAspect: {
      show: resolveChromeValue(theme, activeVisual, p.lockAspect.show, false),
    },
    padding: {
      top: resolveChromeValue(theme, activeVisual, p.padding.top, 0),
      right: resolveChromeValue(theme, activeVisual, p.padding.right, 0),
      bottom: resolveChromeValue(theme, activeVisual, p.padding.bottom, 0),
      left: resolveChromeValue(theme, activeVisual, p.padding.left, 0),
    },
    spacing: {
      customizeSpacing: resolveChromeValue(theme, activeVisual, p.spacing.customizeSpacing, false),
      // spaceAboveDivider/spaceAbovePlotArea/spaceAboveSubtitle verified
      // against themes/base/classic2026.json's shared spacing group; the
      // rest of this group isn't set there, so stay inferred/unchanged.
      spaceAboveDivider: resolveChromeValue(theme, activeVisual, p.spacing.spaceAboveDivider, 4),
      spaceAbovePlotArea: resolveChromeValue(theme, activeVisual, p.spacing.spaceAbovePlotArea, 16),
      spaceAboveSubtitle: resolveChromeValue(theme, activeVisual, p.spacing.spaceAboveSubtitle, 2),
      spaceBelowSubTitle: resolveChromeValue(theme, activeVisual, p.spacing.spaceBelowSubTitle, 0),
      spaceBelowTitle: resolveChromeValue(theme, activeVisual, p.spacing.spaceBelowTitle, 0),
      spaceBelowTitleArea: resolveChromeValue(theme, activeVisual, p.spacing.spaceBelowTitleArea, 0),
      verticalSpacing: resolveChromeValue(theme, activeVisual, p.spacing.verticalSpacing, 0),
    },
    stylePreset: {
      name: resolveChromeValue(theme, activeVisual, p.stylePreset.name, ""),
    },
    visualHeader: {
      // Verified against classic2026.json's per-visual-type overrides —
      // canvas objects (see isCanvasObject above) don't get the
      // options/filter/pin icon header by default.
      show: resolveChromeValue(theme, activeVisual, p.visualHeader.show, !isCanvasObject),
      background: resolveChromeValue(theme, activeVisual, p.visualHeader.background, base.background),
      border: resolveChromeValue(theme, activeVisual, p.visualHeader.border, "#E3E3E3"),
      foreground: resolveChromeValue(theme, activeVisual, p.visualHeader.foreground, base.foreground),
      transparency: resolveChromeValue(theme, activeVisual, p.visualHeader.transparency, 0),
      showCommentButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showCommentButton, true),
      showCopilotSummaryButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showCopilotSummaryButton, true),
      showCopyVisualImageButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showCopyVisualImageButton, true),
      showDrillDownExpandButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showDrillDownExpandButton, true),
      showDrillDownLevelButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showDrillDownLevelButton, true),
      showDrillRoleSelector: resolveChromeValue(theme, activeVisual, p.visualHeader.showDrillRoleSelector, true),
      showDrillToggleButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showDrillToggleButton, true),
      showDrillUpButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showDrillUpButton, true),
      showFilterRestatementButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showFilterRestatementButton, true),
      showFocusModeButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showFocusModeButton, true),
      showFollowVisualButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showFollowVisualButton, true),
      showOptionsMenu: resolveChromeValue(theme, activeVisual, p.visualHeader.showOptionsMenu, true),
      showPersonalizeVisualButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showPersonalizeVisualButton, true),
      showPinButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showPinButton, true),
      showSeeDataLayoutToggleButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showSeeDataLayoutToggleButton, true),
      showSetAlertButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showSetAlertButton, true),
      showSmartNarrativeButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showSmartNarrativeButton, true),
      showTooltipButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showTooltipButton, true),
      showVisualErrorButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showVisualErrorButton, true),
      showVisualInformationButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showVisualInformationButton, true),
      showVisualWarningButton: resolveChromeValue(theme, activeVisual, p.visualHeader.showVisualWarningButton, true),
    },
    visualHeaderTooltip: {
      type: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.type, "Default"),
      text: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.text, ""),
      section: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.section, ""),
      bold: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.bold, false),
      italic: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.italic, false),
      underline: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.underline, false),
      fontFamily: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.fontFamily, base.fontFamily),
      fontSize: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.fontSize, 10),
      titleFontColor: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.titleFontColor, base.foreground),
      themedTitleFontColor: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.themedTitleFontColor, base.foreground),
      background: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.background, base.background),
      themedBackground: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.themedBackground, base.background),
      transparency: resolveChromeValue(theme, activeVisual, p.visualHeaderTooltip.transparency, 0),
    },
    visualLink: {
      show: resolveChromeValue(theme, activeVisual, p.visualLink.show, false),
      type: resolveChromeValue(theme, activeVisual, p.visualLink.type, "WebUrl"),
      bookmark: resolveChromeValue(theme, activeVisual, p.visualLink.bookmark, ""),
      drillthroughSection: resolveChromeValue(theme, activeVisual, p.visualLink.drillthroughSection, ""),
      navigationSection: resolveChromeValue(theme, activeVisual, p.visualLink.navigationSection, ""),
      webUrl: resolveChromeValue(theme, activeVisual, p.visualLink.webUrl, ""),
      tooltip: resolveChromeValue(theme, activeVisual, p.visualLink.tooltip, ""),
      tooltipPlaceholderText: resolveChromeValue(theme, activeVisual, p.visualLink.tooltipPlaceholderText, ""),
      showDefaultTooltip: resolveChromeValue(theme, activeVisual, p.visualLink.showDefaultTooltip, true),
      suppressDefaultTooltip: resolveChromeValue(theme, activeVisual, p.visualLink.suppressDefaultTooltip, false),
      enabledTooltip: resolveChromeValue(theme, activeVisual, p.visualLink.enabledTooltip, ""),
      disabledTooltip: resolveChromeValue(theme, activeVisual, p.visualLink.disabledTooltip, ""),
    },
    visualTooltip: {
      show: resolveChromeValue(theme, activeVisual, p.visualTooltip.show, true),
      type: resolveChromeValue(theme, activeVisual, p.visualTooltip.type, "Default"),
      bold: resolveChromeValue(theme, activeVisual, p.visualTooltip.bold, false),
      italic: resolveChromeValue(theme, activeVisual, p.visualTooltip.italic, false),
      underline: resolveChromeValue(theme, activeVisual, p.visualTooltip.underline, false),
      fontFamily: resolveChromeValue(theme, activeVisual, p.visualTooltip.fontFamily, base.fontFamily),
      fontSize: resolveChromeValue(theme, activeVisual, p.visualTooltip.fontSize, 10),
      titleFontColor: resolveChromeValue(theme, activeVisual, p.visualTooltip.titleFontColor, base.foreground),
      themedTitleFontColor: resolveChromeValue(theme, activeVisual, p.visualTooltip.themedTitleFontColor, base.foreground),
      valueFontColor: resolveChromeValue(theme, activeVisual, p.visualTooltip.valueFontColor, base.foreground),
      themedValueFontColor: resolveChromeValue(theme, activeVisual, p.visualTooltip.themedValueFontColor, base.foreground),
      actionFontColor: resolveChromeValue(theme, activeVisual, p.visualTooltip.actionFontColor, base.foreground),
      background: resolveChromeValue(theme, activeVisual, p.visualTooltip.background, base.background),
      themedBackground: resolveChromeValue(theme, activeVisual, p.visualTooltip.themedBackground, base.background),
      transparency: resolveChromeValue(theme, activeVisual, p.visualTooltip.transparency, 0),
      showActionsInTooltips: resolveChromeValue(theme, activeVisual, p.visualTooltip.showActionsInTooltips, false),
      showChartSpecificTooltips: resolveChromeValue(theme, activeVisual, p.visualTooltip.showChartSpecificTooltips, true),
      showSentenceFormat: resolveChromeValue(theme, activeVisual, p.visualTooltip.showSentenceFormat, false),
      showTooltipFieldsOnly: resolveChromeValue(theme, activeVisual, p.visualTooltip.showTooltipFieldsOnly, false),
      showValuesInBold: resolveChromeValue(theme, activeVisual, p.visualTooltip.showValuesInBold, false),
      sentenceTemplate: resolveChromeValue(theme, activeVisual, p.visualTooltip.sentenceTemplate, ""),
      section: resolveChromeValue(theme, activeVisual, p.visualTooltip.section, ""),
    },
};
}

export { chromeThemePath };
