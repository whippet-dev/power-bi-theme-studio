/**
 * Power BI's native defaults for the cartesian visuals, and the small set of
 * exceptions that are genuinely per-visual.
 *
 * Measured by reading Power BI Desktop's own Format pane across six
 * visuals — clustered column, stacked column, clustered bar, stacked bar,
 * 100% stacked bar, line — keyed on the pane's internal property paths
 * rather than on visible labels, under a diagnostic theme that fingerprints
 * every token.
 *
 * The striking result, and the reason this file is mostly one shared object:
 * **across those visuals not one shared property takes a different value**,
 * with a single exception (`labelContentLayout`). Both axis cards, the
 * legend, the gridline stroke values, the mark border, the label typography
 * and the plot background are byte-identical everywhere. Family differences
 * are almost entirely about which properties *exist*, not what they default
 * to — so the shared block is genuinely shared, and the exception table
 * below is deliberately short.
 *
 * Colours are absent here on purpose. Every native colour resolves through a
 * theme token and so cannot be a constant; see `nativeTokens.ts`.
 */

/**
 * Which mark a cartesian visual draws.
 *
 * This is the axis the one varying shared property turns on, and it is
 * **not** the same as chart orientation. The line chart is category-on-X
 * like a column chart, yet its data labels default to single-line like a
 * bar chart's — so the discriminator is the mark, not the axis layout.
 */
export type CartesianMark = "column" | "bar" | "line";

/** How a multi-series cartesian visual combines its series. */
export type CartesianStacking = "clustered" | "stacked" | "hundredPercent";

/**
 * Defaults that hold across every cartesian visual measured.
 *
 * Encoded once because the measurement says they are one thing, not because
 * sharing them is convenient.
 */
export const CARTESIAN_NATIVE = {
  axis: {
    show: true,
    /** "Show title only" — the axis title renders, the values' style does not. */
    axisStyle: "showTitleOnly",
    titleShow: true,
    /** Percentage of the plot an axis may consume before labels are trimmed. */
    maxMarginFactor: 25,
    /** Minimum category width in px. */
    preferredCategoryWidth: 20,
    concatenateLabels: false,
    /** The value axis rounds its range to friendly numbers by default. */
    roundRange: true,
    logAxisScale: false,
    invertAxis: false,
    switchAxisPosition: false,
  },
  legend: {
    show: true,
    /** Power BI's default legend position is top-left, not top-centre. */
    position: "TopLeft",
    showTitle: true,
  },
  /**
   * Gridlines. Three of these were previously wrong in this app, and the
   * dotted default is the most visible: charts rendered solid gridlines
   * where Power BI draws dotted ones.
   */
  gridline: {
    show: true,
    /** Dotted, not solid. Confirmed on all six cartesian visuals. */
    style: "dotted",
    /** "Scale by width" is off; gridline width does not track stroke width. */
    autoScale: false,
    width: 1,
    transparency: 0,
  },
  /** The border around a rectangular mark, and around a ribbon. */
  markBorder: {
    show: false,
    colorMatchFill: false,
    width: 1,
    transparency: 0,
  },
  layout: {
    /** Space between categories, as a percentage. */
    innerPadding: 20,
    seriesOrderReversed: false,
    seriesOrderSorted: false,
  },
  dataLabel: {
    show: false,
    /** Which of the three label parts is on when labels are enabled. */
    valueEnabled: true,
    titleEnabled: false,
    detailEnabled: false,
    position: "Auto",
    transparency: 0,
    backgroundShow: false,
    optimizeLabelDisplay: false,
    /** Leader lines are off for data labels and on for series labels. */
    leaderLineShow: false,
    leaderLineWidth: 1,
    leaderLineStyle: "solid",
  },
  plotArea: {
    imageFit: "Fit",
    transparency: 0,
  },
  /**
   * Stroke widths, which are emphatically not one shared value. Three
   * distinct defaults coexist; see `MARK_NATIVE` for the other two.
   */
  strokeWidth: 1,
} as const;

/**
 * The per-mark exceptions, stated explicitly rather than flattened into the
 * shared block.
 *
 * Keeping these as data rather than as branches in five registries is the
 * point: a future visual is a row here, and a wrong row is a failing test
 * rather than a subtly different code path.
 */
export const MARK_NATIVE: Record<
  CartesianMark,
  {
    /** The one shared property whose *value* varies across the family. */
    labelContentLayout: "MultiLine" | "SingleLine";
    /** Width of the mark's own stroke: the line itself, or a mark border. */
    strokeWidth: number;
    /** Whether the zoom slider's value-axis sub-option defaults on. */
    zoomValueAxis: boolean;
    /**
     * Columns offer label orientation and horizontal alignment; bars and
     * lines do not, because neither is meaningful end-on to the mark.
     */
    hasLabelOrientation: boolean;
    /** Which gridline group the visual exposes, and therefore themes. */
    gridlineAxis: "horizontal" | "vertical";
  }
> = {
  column: {
    labelContentLayout: "MultiLine",
    strokeWidth: CARTESIAN_NATIVE.strokeWidth,
    zoomValueAxis: true,
    hasLabelOrientation: true,
    gridlineAxis: "horizontal",
  },
  bar: {
    labelContentLayout: "SingleLine",
    strokeWidth: CARTESIAN_NATIVE.strokeWidth,
    zoomValueAxis: true,
    hasLabelOrientation: false,
    /** A bar chart's gridlines run vertically, and flip group name with it. */
    gridlineAxis: "vertical",
  },
  line: {
    labelContentLayout: "SingleLine",
    /** A line's own stroke is 3, not 1. */
    strokeWidth: 3,
    /** The only visual measured where the zoom slider's value axis is off. */
    zoomValueAxis: false,
    hasLabelOrientation: false,
    gridlineAxis: "horizontal",
  },
};

/** Line-specific defaults with no counterpart on the rectangular marks. */
export const LINE_NATIVE = {
  strokePattern: "solid",
  strokeLineJoin: "round",
  interpolation: "linear",
  /** Markers are off, but carry a full latent style when switched on. */
  markerShow: false,
  markerShape: "circle",
  markerSize: 5,
  /** A marker's border is 2, distinct from both the line 3 and the border 1. */
  markerBorderWidth: 2,
  markerBorderShow: false,
  shadeAreaShow: false,
  shadeAreaMatchStrokeColor: true,
  shadeAreaTransparency: 60,
  seriesLabelPosition: "Right",
  seriesLabelMatchColor: true,
  seriesLabelWordWrap: false,
  seriesLabelBackgroundShow: true,
  seriesLabelBackgroundTransparency: 90,
  seriesLabelLeaderLineShow: true,
  seriesLabelMaximumOffset: 10,
} as const;

/** Ribbon defaults, on the stacked rectangular visuals that offer ribbons. */
export const RIBBON_NATIVE = {
  show: false,
  fillMatchColor: true,
  fillTransparency: 30,
  gapSize: 0,
} as const;

/**
 * Which optional cards a visual exposes, by stacking mode.
 *
 * `borderOutlineOnly`, total labels and ribbons are all stacked-only —
 * absent from clustered visuals entirely rather than present-and-off. A
 * clustered visual that resolved them would be inventing properties.
 */
export function stackingFeatures(stacking: CartesianStacking): {
  borderOutlineOnly: boolean;
  totalLabels: boolean;
  ribbons: boolean;
} {
  const stacked = stacking !== "clustered";
  return { borderOutlineOnly: stacked, totalLabels: stacked, ribbons: stacked };
}

/**
 * 100% stacked visuals invert which data-label part is on, and add a
 * content type the other visuals do not have.
 *
 * The only case measured where the Value/Detail pairing is not
 * value-on/detail-off, which is why it cannot be a shared constant.
 */
export const HUNDRED_PERCENT_DATA_LABEL = {
  valueEnabled: false,
  detailEnabled: true,
  detailContentType: "PercentOfTotal",
} as const;

/** The data-label enable flags for a given stacking mode. */
export function dataLabelParts(stacking: CartesianStacking): {
  valueEnabled: boolean;
  detailEnabled: boolean;
} {
  return stacking === "hundredPercent"
    ? { valueEnabled: HUNDRED_PERCENT_DATA_LABEL.valueEnabled, detailEnabled: HUNDRED_PERCENT_DATA_LABEL.detailEnabled }
    : { valueEnabled: CARTESIAN_NATIVE.dataLabel.valueEnabled, detailEnabled: CARTESIAN_NATIVE.dataLabel.detailEnabled };
}
