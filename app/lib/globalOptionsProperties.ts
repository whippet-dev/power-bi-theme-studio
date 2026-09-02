import { boolProp, colorProp, enumProp, forStateId, numberProp, propertyThemePath as rawPropertyThemePath, readAtPath, resolveChromeEntry, resolveChromeValue, textProp, themeRoots } from "./properties";
import { nativeToken } from "./nativeTokens";
import type { PropertyDefinition, PropertyLookup, PropertyValueType, ThemeSource, VisualSchemaKey } from "./properties";
import type { ResolvedTheme } from "./theme";

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
  /** The $id: "Applied" state of the same filterCard group, matched per layer — see forStateId. */
  pageFilterCardsApplied: {
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
  theme: ThemeSource,
  definition: PropertyLookup<T>,
  // Borrow the fallback's type from resolveChromeValue rather than
  // restating its per-value-type mapping and drifting from it.
  fallback: Parameters<typeof resolveChromeValue<T>>[3],
) {
  return resolveChromeValue<T>(theme, definition.visual, definition, fallback);
}

/** The provenance-carrying counterpart, for the one rule that needs it. */
function resolveGlobalEntry<T extends PropertyValueType>(
  theme: ThemeSource,
  definition: PropertyLookup<T>,
  fallback: Parameters<typeof resolveChromeEntry<T>>[3],
) {
  return resolveChromeEntry<T>(theme, definition.visual, definition, fallback);
}

/**
 * The filter pane's input boxes take their colour from the pane background —
 * but only when a theme layer actually *states* that background.
 *
 * Four Desktop runs pin this down, and no simpler rule survives all four:
 *
 *   base                background        stated?   inputBoxColor
 *   Classic 2026        #ffffff           yes       #ffffff   follows
 *   Fluent 2            token ref         yes       follows   follows
 *   Classic 2018        root `background` NO        #FFFFFF   ignores
 *   Classic 2018 + probe explicit #E600AC yes       #E600AC   follows
 *
 * Row three is the one that matters. There the pane background resolved to
 * the root `background` token through the capability layer and the input box
 * ignored it, so this is not a read of the *effective* background and not a
 * read of the root token — both were ruled out by observation. It is the
 * explicitly-stated property or nothing.
 *
 * `isSet` is exactly that distinction, so the rule needs no new machinery:
 * resolve the background once, then hand its value to the input box only
 * when some layer supplied it.
 */
const INPUT_BOX_WITHOUT_STATED_BACKGROUND = "#FFFFFF";

/**
 * A filter card renders differently depending on whether that filter
 * currently has a selection applied or not (compare "Region: is (All)" vs
 * "Status: Approved checked" in a real Power BI filter pane — confirmed
 * against a real screenshot). The schema keys this by `$id: "Applied"` /
 * `$id: "Available"` on filterCard's array entries, verified against the
 * real Classic 2026 base theme export (themes/base/classic2026.json sets
 * both explicitly). An earlier pass here excluded `$id` as "an instance
 * discriminator, not a stylable value" — true for Matrix's subTotals.$id,
 * wrong here: this is the exact same per-state pattern as actionButton's
 * hover/selected states (see STATEFUL_GROUPS in properties.ts), just
 * keyed by filter state instead of interaction state.
 *
 * Resolved via forStateId, so each layer is searched for its own
 * `$id`-tagged entry — a base theme and a custom theme are free to list
 * Applied/Available in different orders, or to declare only one of them.
 */

/** Resolves report/page-level global options, checking the specific bucket then the shared one. */
export function resolveGlobalOptionsStyle(theme: ThemeSource, base: ResolvedTheme): ResolvedGlobalOptionsStyle {
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
      // Verified against themes/base/classic2026.json's page["*"].background
      // group -- the page's own background is fully transparent by
      // default (0 would make it opaque, hiding whatever renders beneath).
      transparency: resolveGlobalValue(theme, p.pageBackground.transparency, 100),
    },
    pageAlignment: {
      verticalAlignment: resolveGlobalValue(theme, p.pageAlignment.verticalAlignment, "Top"),
    },
    // "Available" (no selection made, e.g. "is (All)") and "Applied" (a
    // selection is active) are genuinely different $id-tagged states in
    // the real schema. Matched by $id per layer -- see PropertyLookup --
    // because base and custom themes need not list them in the same order.
    pageFilterCards: (() => {
      const at = <T extends PropertyValueType>(def: PropertyDefinition<T>): PropertyLookup<T> => forStateId(def, "Available");
      return {
        // Follows the root `background` token -- the fingerprint moved it to
        // #00E643 and Available cards rendered #00E643 on all three bases.
        backgroundColor: resolveGlobalValue(theme, at(p.pageFilterCards.backgroundColor), base.background),
        border: resolveGlobalValue(theme, at(p.pageFilterCards.border), true),
        borderColor: resolveGlobalValue(theme, at(p.pageFilterCards.borderColor), "#C8C8C8"),
        fontFamily: resolveGlobalValue(theme, at(p.pageFilterCards.fontFamily), "Segoe UI"),
        foregroundColor: resolveGlobalValue(theme, at(p.pageFilterCards.foregroundColor), base.foreground),
        // Unlike the filter *pane*, a card's input box does not follow any
        // background: it stayed white on all three bases while the card
        // background itself was the fingerprint's green.
        inputBoxColor: resolveGlobalValue(theme, at(p.pageFilterCards.inputBoxColor), "#FFFFFF"),
        textSize: resolveGlobalValue(theme, at(p.pageFilterCards.textSize), 9),
        transparency: resolveGlobalValue(theme, at(p.pageFilterCards.transparency), 0),
      };
    })(),
    pageFilterCardsApplied: (() => {
      const at = <T extends PropertyValueType>(def: PropertyDefinition<T>): PropertyLookup<T> => forStateId(def, "Applied");
      return {
        // `backgroundLight`, now measured rather than reasoned. The old
        // literal #F3F2F1 was right only because that is Classic 2026's
        // own backgroundLight -- a coincidence that broke the moment a
        // theme moved the token. Under the fingerprint's #E6C900, Applied
        // cards rendered #E6C900 on all three bases.
        backgroundColor: resolveGlobalValue(theme, at(p.pageFilterCards.backgroundColor), nativeToken(theme, "backgroundLight")),
        border: resolveGlobalValue(theme, at(p.pageFilterCards.border), true),
        borderColor: resolveGlobalValue(theme, at(p.pageFilterCards.borderColor), "#C8C8C8"),
        fontFamily: resolveGlobalValue(theme, at(p.pageFilterCards.fontFamily), "Segoe UI"),
        foregroundColor: resolveGlobalValue(theme, at(p.pageFilterCards.foregroundColor), base.foreground),
        inputBoxColor: resolveGlobalValue(theme, at(p.pageFilterCards.inputBoxColor), "#FFFFFF"),
        textSize: resolveGlobalValue(theme, at(p.pageFilterCards.textSize), 9),
        transparency: resolveGlobalValue(theme, at(p.pageFilterCards.transparency), 0),
      };
    })(),
    pageWallpaper: {
      color: resolveGlobalValue(theme, p.pageWallpaper.color, "#FFFFFF"),
      transparency: resolveGlobalValue(theme, p.pageWallpaper.transparency, 100),
    },
    // Measured natively across all three shipped bases under a fingerprint
    // that moved every root token and all four text classes. Where a value
    // held against that, it is recorded as a fixed capability fallback
    // rather than derived -- the fingerprint is what rules the derivations
    // out. Where it tracked a token, the token is used.
    pageFilterPane: (() => {
      // Resolved once, because the input box needs its provenance as well
      // as its value -- see INPUT_BOX_WITHOUT_STATED_BACKGROUND.
      const background = resolveGlobalEntry(theme, p.pageFilterPane.backgroundColor, base.background);
      return {
        // Follows the root `background` token when nothing states it --
        // proven under Classic 2018, which supplies no outspacePane entry.
        backgroundColor: background.value,
        border: resolveGlobalValue(theme, p.pageFilterPane.border, true),
        borderColor: resolveGlobalValue(theme, p.pageFilterPane.borderColor, "#C8C8C8"),
        // Not `tableAccent`: the fingerprint set it to #39E600 and
        // dataColors[0] to #00E660, and Desktop stayed on this teal.
        checkboxAndApplyColor: resolveGlobalValue(theme, p.pageFilterPane.checkboxAndApplyColor, "#117865"),
        // Not a text class: Courier New / Impact / Georgia / Comic Sans MS
        // were all rejected on all three bases.
        fontFamily: resolveGlobalValue(theme, p.pageFilterPane.fontFamily, "Segoe UI"),
        foregroundColor: resolveGlobalValue(theme, p.pageFilterPane.foregroundColor, base.foreground),
        headerSize: resolveGlobalValue(theme, p.pageFilterPane.headerSize, 9),
        inputBoxColor: resolveGlobalValue(
          theme,
          p.pageFilterPane.inputBoxColor,
          background.isSet ? background.value : INPUT_BOX_WITHOUT_STATED_BACKGROUND,
        ),
        searchTextSize: resolveGlobalValue(theme, p.pageFilterPane.searchTextSize, 10),
        titleSize: resolveGlobalValue(theme, p.pageFilterPane.titleSize, 12),
        transparency: resolveGlobalValue(theme, p.pageFilterPane.transparency, 0),
        width: resolveGlobalValue(theme, p.pageFilterPane.width, 200),
      };
    })(),
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

/**
 * The two filter-card states, spelled exactly as the schema tags them.
 *
 * These are **not** interaction states. A filter card renders differently
 * according to whether that filter currently has a selection applied, which
 * has nothing to do with hover or press, and the ids are capitalised where
 * every interaction-state id is lower-case. Reusing `InteractionState` would
 * offer Power BI four `$id`s it never reads here, so this is a separate,
 * deliberately tiny domain.
 */
export const FILTER_CARD_STATES = ["Available", "Applied"] as const;
export type FilterCardState = (typeof FILTER_CARD_STATES)[number];

/**
 * Groups whose canonical home is the shared `visualStyles["*"]["*"]` bucket.
 *
 * Both modern base themes and Microsoft's own theme generator put filter
 * pane and filter card styling there, not under `page`. Theme Studio read
 * that correctly from the start but wrote to `page`, so editing an imported
 * theme left the original untouched and added a second, contradictory copy
 * that won on precedence. Reads are unchanged — `page` still beats the
 * shared bucket — but writes now land where the value already lives.
 *
 * Only these two groups move. `reportFilterPaneState` also targets
 * `outspacePane`, but from the `report` bucket with a disjoint field set,
 * and is excluded by the `visual === "page"` test in `globalWriteOwner`.
 */
const SHARED_BUCKET_GROUPS = new Set(["outspacePane", "filterCard"]);

/** The `filterCard`/`outspacePane` array a bucket holds in the user's own theme, if any. */
function bucketEntries(source: ThemeSource, bucket: VisualSchemaKey, group: string): unknown[] | undefined {
  const visualStyles = themeRoots(source).visualStyles;
  if (!isEntry(visualStyles)) return undefined;
  const entries = readAtPath(visualStyles[bucket] as never, ["*", group]);
  return Array.isArray(entries) ? entries : undefined;
}

/** Whether the user's own theme already carries this group in a given bucket. */
function ownsGroup(source: ThemeSource, bucket: VisualSchemaKey, group: string): boolean {
  const entries = bucketEntries(source, bucket, group);
  return entries !== undefined && entries.length > 0;
}

/**
 * Which bucket an edit to this property should be written to.
 *
 * Filter pane and filter card styling goes to the shared bucket — except
 * where the user's own theme already keeps that group under `page`, which is
 * exactly what every theme Theme Studio itself exported before this change
 * looks like. Writing those to the shared bucket would be shadowed by the
 * page copy on the very next read, so the edit would appear to do nothing.
 * Editing continues wherever the value already is; only new values get the
 * canonical home. Nothing is moved or deleted behind the user's back.
 */
function globalWriteOwner(
  source: ThemeSource,
  definition: Pick<PropertyDefinition, "visual" | "path" | "valueType">,
): VisualSchemaKey {
  const group = String(definition.path[0]);
  if (definition.visual !== "page" || !SHARED_BUCKET_GROUPS.has(group)) return definition.visual;
  return ownsGroup(source, "page", group) ? "page" : "*";
}

/**
 * Absolute write path for a global option, honouring the canonical owner.
 *
 * Deliberately shadows the generic `propertyThemePath` for this registry:
 * every call site here needs the owner rule, and a second exported name
 * would let one of them silently skip it.
 */
export function propertyThemePath(
  definition: Pick<PropertyDefinition, "visual" | "path" | "valueType">,
  source?: ThemeSource,
): Array<string | number> {
  const visual = source === undefined ? definition.visual : globalWriteOwner(source, definition);
  return rawPropertyThemePath({ ...definition, visual });
}

/**
 * The index of a filter-card state's entry in the user's own theme.
 *
 * Reading and writing deliberately disagree when only an untagged entry
 * exists. Reading falls back to it, because an untagged entry is what
 * actually resolves for both states and the editor must show the value the
 * user will see. Writing must not reuse it — patching the untagged entry
 * would change *both* states at once, which is the whole defect this
 * replaces — so a new tagged entry is appended instead, leaving the legacy
 * entry to go on serving the state that was not edited.
 *
 * Neither ever falls back to index 0. Index 0 belongs to whichever state
 * was listed first, so reading it would show one state's values under the
 * other's label — the same trap `stateEntryIndexInLayer` documents.
 */
export function filterCardStateEntryIndex(
  source: ThemeSource,
  state: FilterCardState,
  bucket: VisualSchemaKey,
  create = false,
): number {
  const entries = bucketEntries(source, bucket, "filterCard");
  if (entries === undefined) return 0;

  const tagged = entries.findIndex((entry) => isEntry(entry) && entry.$id === state);
  if (tagged !== -1) return tagged;
  if (create) return entries.length;

  const untagged = entries.findIndex((entry) => isEntry(entry) && entry.$id === undefined);
  // Past the end of the array, deliberately. With neither a tagged nor an
  // untagged entry to read, this state has no stored value, and the caller
  // must fall back to the resolved one. Returning 0 here would read
  // whichever state happens to be listed first and show its value under
  // the other state's label.
  return untagged !== -1 ? untagged : entries.length;
}

function isEntry(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The bucket a filter-card edit lands in — the same rule the write path uses. */
export function filterCardWriteBucket(source: ThemeSource): VisualSchemaKey {
  return globalWriteOwner(source, GLOBAL_OPTIONS_PROPERTIES.pageFilterCards.backgroundColor);
}
