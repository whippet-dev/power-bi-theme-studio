import { boolProp, colorProp, enumProp, numberProp, propertyThemePath, resolveChromeValue, textProp } from "./properties";
import type { PropertyDefinition, PropertyValueType } from "./properties";
import type { PowerBITheme, ResolvedTheme } from "./theme";

/**
 * Report- and page-level settings — genuinely global, not tied to any
 * visual type. Two distinct schema buckets, each a fixed literal key rather
 * than a visual type: `visualStyles.report["*"]` (report-wide defaults,
 * e.g. whether the filter pane starts open) and `visualStyles.page["*"]`
 * (per-page-type defaults, e.g. filter pane/filter card styling, page
 * background, canvas size). Some concepts exist at both levels — page
 * alignment and the filter pane both have a report-wide default AND a
 * page-level styling group — kept as separate registry groups since their
 * field sets don't overlap even where the *concept* does.
 *
 * **Both buckets have a shared fallback.** Real themes commonly put filter
 * pane, filter card, and wallpaper styling in `visualStyles["*"]["*"]`
 * rather than under `page` — Power BI honours either, and Microsoft's own
 * theme generator emits the shared form. Reading only the `page` bucket
 * meant a theme that styled its filter pane the common way appeared to do
 * nothing at all. Resolution therefore checks `visualStyles.page["*"]`
 * first, then falls back to `visualStyles["*"]["*"]`, exactly like chrome.
 * Writes still target the specific bucket, which correctly wins over a
 * shared value.
 */

const VERTICAL_ALIGNMENT_OPTIONS = [
  { value: "Top", label: "Top" },
  { value: "Middle", label: "Middle" },
] as const;

const PAGE_REFRESH_TYPE_OPTIONS = [
  { value: "APR", label: "Auto page refresh" },
  { value: "CDM", label: "Change detection" },
] as const;

const PAGE_SIZE_TYPE_OPTIONS = [
  { value: "Widescreen", label: "16:9" },
  { value: "Standard", label: "4:3" },
  { value: "Letter", label: "Letter" },
  { value: "Tooltip", label: "Tooltip" },
  { value: "Custom", label: "Custom" },
] as const;

export const GLOBAL_OPTIONS_PROPERTIES = {
  reportFilterPaneState: {
    expanded: boolProp(
      "report",
      "global.reportFilterPaneState.expanded",
      "Start expanded",
      "Whether the filter pane starts expanded when a reader opens the report.",
      ["outspacePane", 0, "expanded"],
    ),
    visible: boolProp(
      "report",
      "global.reportFilterPaneState.visible",
      "Visible",
      "Whether the filter pane is shown at all.",
      ["outspacePane", 0, "visible"],
    ),
  },

  reportPageAlignment: {
    verticalAlignment: enumProp(
      "report",
      "global.reportPageAlignment.verticalAlignment",
      "Vertical alignment",
      "How visuals on a page line up vertically when the canvas is taller than its content, unless a page overrides it.",
      ["section", 0, "verticalAlignment"],
      VERTICAL_ALIGNMENT_OPTIONS,
    ),
  },

  pageBackground: {
    color: colorProp(
      "page",
      "global.pageBackground.color",
      "Color",
      "The fill colour behind the page, underneath any visuals.",
      ["background", 0, "color"],
    ),
    transparency: numberProp(
      "page",
      "global.pageBackground.transparency",
      "Transparency",
      "How see-through the page background appears — 0 is solid, 100 is invisible.",
      ["background", 0, "transparency"],
      0,
      100,
    ),
  },

  pageAlignment: {
    verticalAlignment: enumProp(
      "page",
      "global.pageAlignment.verticalAlignment",
      "Vertical alignment",
      "How visuals on the page line up vertically when the canvas is taller than its content.",
      ["displayArea", 0, "verticalAlignment"],
      VERTICAL_ALIGNMENT_OPTIONS,
    ),
  },

  pageFilterCards: {
    backgroundColor: colorProp(
      "page",
      "global.pageFilterCards.backgroundColor",
      "Background color",
      "Sets the color for the background of the filter cards on the filter pane in the published report.",
      ["filterCard", 0, "backgroundColor"],
    ),
    border: boolProp(
      "page",
      "global.pageFilterCards.border",
      "Border",
      "Adds a one-pixel line around your filter cards.",
      ["filterCard", 0, "border"],
    ),
    borderColor: colorProp(
      "page",
      "global.pageFilterCards.borderColor",
      "Border color",
      "Sets the color of the border around your filter cards.",
      ["filterCard", 0, "borderColor"],
    ),
    fontFamily: textProp(
      "page",
      "global.pageFilterCards.fontFamily",
      "Font family",
      "Sets the font family for the filter cards.",
      ["filterCard", 0, "fontFamily"],
    ),
    foregroundColor: colorProp(
      "page",
      "global.pageFilterCards.foregroundColor",
      "Font and icon color",
      "Sets the color for most text, buttons, and icons in the filter cards.",
      ["filterCard", 0, "foregroundColor"],
    ),
    inputBoxColor: colorProp(
      "page",
      "global.pageFilterCards.inputBoxColor",
      "Input box color",
      "Sets the background color for input fields, search boxes, sliders, text boxes, and drop-down lists.",
      ["filterCard", 0, "inputBoxColor"],
    ),
    textSize: numberProp(
      "page",
      "global.pageFilterCards.textSize",
      "Text size",
      "Sets the font size for text in the filter cards.",
      ["filterCard", 0, "textSize"],
      8,
      60,
    ),
    transparency: numberProp(
      "page",
      "global.pageFilterCards.transparency",
      "Transparency",
      "Controls how see-through your filter cards' background color is.",
      ["filterCard", 0, "transparency"],
      0,
      100,
    ),
    // $id (Available/Applied) excluded: an instance discriminator for which
    // filter card this styling applies to, not a stylable value itself —
    // same "per-instance, not per-visual-type" test as Matrix's subTotals.$id.
  },

  pageWallpaper: {
    color: colorProp(
      "page",
      "global.pageWallpaper.color",
      "Color",
      "The colour shown outside the page canvas — the area surrounding the report.",
      ["outspace", 0, "color"],
    ),
    transparency: numberProp(
      "page",
      "global.pageWallpaper.transparency",
      "Transparency",
      "How see-through the wallpaper colour appears — 0 is solid, 100 is invisible.",
      ["outspace", 0, "transparency"],
      0,
      100,
    ),
  },

  pageFilterPane: {
    backgroundColor: colorProp(
      "page",
      "global.pageFilterPane.backgroundColor",
      "Background color",
      "Sets the color for the background of the filter pane in the published report.",
      ["outspacePane", 0, "backgroundColor"],
    ),
    border: boolProp(
      "page",
      "global.pageFilterPane.border",
      "Border",
      "Vertical line separating the report from the filter pane.",
      ["outspacePane", 0, "border"],
    ),
    borderColor: colorProp(
      "page",
      "global.pageFilterPane.borderColor",
      "Border color",
      "The color of the vertical line separating the report from the filter pane.",
      ["outspacePane", 0, "borderColor"],
    ),
    checkboxAndApplyColor: colorProp(
      "page",
      "global.pageFilterPane.checkboxAndApplyColor",
      "Checkbox and Apply color",
      "Select a color to be used for the Apply button and some checkboxes in the filter pane.",
      ["outspacePane", 0, "checkboxAndApplyColor"],
    ),
    fontFamily: textProp(
      "page",
      "global.pageFilterPane.fontFamily",
      "Font family",
      "Sets the font family for the title and headers in the filter pane.",
      ["outspacePane", 0, "fontFamily"],
    ),
    foregroundColor: colorProp(
      "page",
      "global.pageFilterPane.foregroundColor",
      "Font and icon color",
      "Sets the color for most text, buttons, and icons in the filter pane.",
      ["outspacePane", 0, "foregroundColor"],
    ),
    headerSize: numberProp(
      "page",
      "global.pageFilterPane.headerSize",
      "Header text size",
      "Sets the text size for the headers in the filter pane.",
      ["outspacePane", 0, "headerSize"],
      8,
      60,
    ),
    inputBoxColor: colorProp(
      "page",
      "global.pageFilterPane.inputBoxColor",
      "Input box color",
      "Sets the background color for input fields of the filter pane.",
      ["outspacePane", 0, "inputBoxColor"],
    ),
    searchTextSize: numberProp(
      "page",
      "global.pageFilterPane.searchTextSize",
      "Search text size",
      "Sets the text size for the search box of the filter pane.",
      ["outspacePane", 0, "searchTextSize"],
      8,
      60,
    ),
    titleSize: numberProp(
      "page",
      "global.pageFilterPane.titleSize",
      "Title text size",
      "Sets the text size for the title of the filter pane.",
      ["outspacePane", 0, "titleSize"],
      8,
      60,
    ),
    transparency: numberProp(
      "page",
      "global.pageFilterPane.transparency",
      "Transparency",
      "Controls how see-through your filter pane's background color is.",
      ["outspacePane", 0, "transparency"],
      0,
      100,
    ),
    width: numberProp(
      "page",
      "global.pageFilterPane.width",
      "Width",
      "The width, in pixels, of the filter pane.",
      ["outspacePane", 0, "width"],
      0,
      600,
    ),
  },

  pageInformation: {
    pageInformationQnaPodEnabled: boolProp(
      "page",
      "global.pageInformation.pageInformationQnaPodEnabled",
      "Q&A",
      "Whether new pages allow Q&A by default.",
      ["pageInformation", 0, "pageInformationQnaPodEnabled"],
    ),
    pageInformationType: boolProp(
      "page",
      "global.pageInformation.pageInformationType",
      "Allow use as tooltip",
      "Whether new pages can be used as a tooltip by default.",
      ["pageInformation", 0, "pageInformationType"],
    ),
    // pageInformationName/pageInformationAltName excluded: a theme-wide "*"
    // default would give every page the same name, which isn't meaningful —
    // per-page identity, not a stylable default (same test as chrome's
    // general.x/y/width/height exclusion).
  },

  pageRefresh: {
    show: boolProp(
      "page",
      "global.pageRefresh.show",
      "Show",
      "Whether automatic page refresh is turned on.",
      ["pageRefresh", 0, "show"],
    ),
    refreshType: enumProp(
      "page",
      "global.pageRefresh.refreshType",
      "Refresh type",
      "Whether the page refreshes on a fixed timer or only when the underlying data actually changes.",
      ["pageRefresh", 0, "refreshType"],
      PAGE_REFRESH_TYPE_OPTIONS,
    ),
    duration: textProp(
      "page",
      "global.pageRefresh.duration",
      "Refresh this page every",
      "How often the page refreshes itself, written in Power BI's own duration format.",
      ["pageRefresh", 0, "duration"],
    ),
  },

  pageSize: {
    pageSizeTypes: enumProp(
      "page",
      "global.pageSize.pageSizeTypes",
      "Type",
      "The page's aspect ratio, or a custom size.",
      ["pageSize", 0, "pageSizeTypes"],
      PAGE_SIZE_TYPE_OPTIONS,
    ),
    pageSizeWidth: numberProp(
      "page",
      "global.pageSize.pageSizeWidth",
      "Width",
      "The canvas width, in pixels, for a custom page size.",
      ["pageSize", 0, "pageSizeWidth"],
      100,
      2000,
    ),
    pageSizeHeight: numberProp(
      "page",
      "global.pageSize.pageSizeHeight",
      "Height",
      "The canvas height, in pixels, for a custom page size.",
      ["pageSize", 0, "pageSizeHeight"],
      100,
      2000,
    ),
  },

  personalizeVisual: {
    show: boolProp(
      "page",
      "global.personalizeVisual.show",
      "Show",
      "Whether report readers can personalize visuals to suit their needs.",
      ["personalizeVisual", 0, "show"],
    ),
    perspectiveRef: textProp(
      "page",
      "global.personalizeVisual.perspectiveRef",
      "Report-reader perspective",
      "The name of the model perspective report readers see by default when personalizing a visual.",
      ["personalizeVisual", 0, "perspectiveRef"],
    ),
  },
} as const;

export type ResolvedGlobalOptionsStyle = {
  reportFilterPaneState: { expanded: boolean; visible: boolean };
  reportPageAlignment: { verticalAlignment: string | number };
  pageBackground: { color: string; transparency: number };
  pageAlignment: { verticalAlignment: string | number };
  pageFilterCards: {
    backgroundColor: string;
    border: boolean;
    borderColor: string;
    fontFamily: string;
    foregroundColor: string;
    inputBoxColor: string;
    textSize: number;
    transparency: number;
  };
  pageWallpaper: { color: string; transparency: number };
  pageFilterPane: {
    backgroundColor: string;
    border: boolean;
    borderColor: string;
    checkboxAndApplyColor: string;
    fontFamily: string;
    foregroundColor: string;
    headerSize: number;
    inputBoxColor: string;
    searchTextSize: number;
    titleSize: number;
    transparency: number;
    width: number;
  };
  pageInformation: { pageInformationQnaPodEnabled: boolean; pageInformationType: boolean };
  pageRefresh: { show: boolean; refreshType: string | number; duration: string };
  pageSize: { pageSizeTypes: string | number; pageSizeWidth: number; pageSizeHeight: number };
  personalizeVisual: { show: boolean; perspectiveRef: string };
};

/**
 * Reads a page/report-level property, falling back to the shared
 * `visualStyles["*"]["*"]` bucket where many real themes actually put it.
 */
function resolveGlobalValue<T extends PropertyValueType>(
  theme: PowerBITheme,
  definition: PropertyDefinition<T>,
  // Borrow the fallback's type from resolveChromeValue rather than
  // restating its per-value-type mapping and drifting from it.
  fallback: Parameters<typeof resolveChromeValue<T>>[3],
) {
  return resolveChromeValue<T>(theme, definition.visual, definition, fallback);
}

/** Resolves report/page-level global options, checking the specific bucket then the shared one. */
export function resolveGlobalOptionsStyle(theme: PowerBITheme, base: ResolvedTheme): ResolvedGlobalOptionsStyle {
  const p = GLOBAL_OPTIONS_PROPERTIES;
  return {
    reportFilterPaneState: {
      expanded: resolveGlobalValue(theme, p.reportFilterPaneState.expanded, true),
      visible: resolveGlobalValue(theme, p.reportFilterPaneState.visible, true),
    },
    reportPageAlignment: {
      verticalAlignment: resolveGlobalValue(theme, p.reportPageAlignment.verticalAlignment, "Top"),
    },
    pageBackground: {
      color: resolveGlobalValue(theme, p.pageBackground.color, base.background),
      transparency: resolveGlobalValue(theme, p.pageBackground.transparency, 0),
    },
    pageAlignment: {
      verticalAlignment: resolveGlobalValue(theme, p.pageAlignment.verticalAlignment, "Top"),
    },
    pageFilterCards: {
      backgroundColor: resolveGlobalValue(theme, p.pageFilterCards.backgroundColor, base.background),
      border: resolveGlobalValue(theme, p.pageFilterCards.border, false),
      borderColor: resolveGlobalValue(theme, p.pageFilterCards.borderColor, "#E3E3E3"),
      fontFamily: resolveGlobalValue(theme, p.pageFilterCards.fontFamily, base.fontFamily),
      foregroundColor: resolveGlobalValue(theme, p.pageFilterCards.foregroundColor, base.foreground),
      inputBoxColor: resolveGlobalValue(theme, p.pageFilterCards.inputBoxColor, base.background),
      textSize: resolveGlobalValue(theme, p.pageFilterCards.textSize, 10),
      transparency: resolveGlobalValue(theme, p.pageFilterCards.transparency, 0),
    },
    pageWallpaper: {
      color: resolveGlobalValue(theme, p.pageWallpaper.color, "#FFFFFF"),
      transparency: resolveGlobalValue(theme, p.pageWallpaper.transparency, 100),
    },
    pageFilterPane: {
      backgroundColor: resolveGlobalValue(theme, p.pageFilterPane.backgroundColor, base.background),
      border: resolveGlobalValue(theme, p.pageFilterPane.border, false),
      borderColor: resolveGlobalValue(theme, p.pageFilterPane.borderColor, "#E3E3E3"),
      checkboxAndApplyColor: resolveGlobalValue(theme, p.pageFilterPane.checkboxAndApplyColor, base.tableAccent),
      fontFamily: resolveGlobalValue(theme, p.pageFilterPane.fontFamily, base.fontFamily),
      foregroundColor: resolveGlobalValue(theme, p.pageFilterPane.foregroundColor, base.foreground),
      headerSize: resolveGlobalValue(theme, p.pageFilterPane.headerSize, 12),
      inputBoxColor: resolveGlobalValue(theme, p.pageFilterPane.inputBoxColor, base.background),
      searchTextSize: resolveGlobalValue(theme, p.pageFilterPane.searchTextSize, 10),
      titleSize: resolveGlobalValue(theme, p.pageFilterPane.titleSize, 12),
      transparency: resolveGlobalValue(theme, p.pageFilterPane.transparency, 0),
      width: resolveGlobalValue(theme, p.pageFilterPane.width, 320),
    },
    pageInformation: {
      pageInformationQnaPodEnabled: resolveGlobalValue(theme, p.pageInformation.pageInformationQnaPodEnabled, false),
      pageInformationType: resolveGlobalValue(theme, p.pageInformation.pageInformationType, false),
    },
    pageRefresh: {
      show: resolveGlobalValue(theme, p.pageRefresh.show, false),
      refreshType: resolveGlobalValue(theme, p.pageRefresh.refreshType, "APR"),
      duration: resolveGlobalValue(theme, p.pageRefresh.duration, ""),
    },
    pageSize: {
      pageSizeTypes: resolveGlobalValue(theme, p.pageSize.pageSizeTypes, "Widescreen"),
      pageSizeWidth: resolveGlobalValue(theme, p.pageSize.pageSizeWidth, 1280),
      pageSizeHeight: resolveGlobalValue(theme, p.pageSize.pageSizeHeight, 720),
    },
    personalizeVisual: {
      show: resolveGlobalValue(theme, p.personalizeVisual.show, false),
      perspectiveRef: resolveGlobalValue(theme, p.personalizeVisual.perspectiveRef, ""),
    },
  };
}

export { propertyThemePath };
