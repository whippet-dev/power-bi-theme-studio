/**
 * Some settings genuinely can't be shown in a static mock — a format
 * string, "show blank as", label overflow behaviour, a log axis scale.
 * They're not broken or unimportant; they just don't have a visible
 * consequence in a four-bar preview with no real data behind it.
 *
 * Rather than leave those as a description and nothing else, each one can
 * declare a tiny before/after demo: the states it can take, and what the
 * affected element looks like in each. The property editor draws the
 * states side by side and highlights whichever is currently active, so
 * the effect is legible even though the main preview can't show it.
 *
 * Kept in a lookup keyed by `group.prop` rather than annotated onto the
 * property definitions themselves, for two reasons: the per-visual
 * registries are generated and would lose inline annotations on the next
 * regeneration, and one entry here covers the same property across all
 * the visuals that share it (every cartesian chart has `labels.showBlankAs`).
 */

export type PropertyEffect = {
  /** One short line framing what's being compared. */
  caption: string;
  /**
   * The states this property can take. `match` is the resolved value this
   * state corresponds to — `true`/`false` for a toggle, or the enum value.
   * Rendered in order, with the active one highlighted.
   */
  states: Array<{ match: string | number | boolean; label: string; sample: string }>;
};

/**
 * Keyed by `group.prop`. A key with no visual prefix applies to that
 * group/property on every visual that has it.
 */
export const PROPERTY_EFFECTS: Record<string, PropertyEffect> = {
  // ---- Data labels -------------------------------------------------
  "labels.showBlankAs": {
    caption: "How a blank value is written",
    states: [
      { match: "Blank", label: "Blank", sample: "" },
      { match: "Zero", label: "Zero", sample: "0" },
      { match: "Dash", label: "Dash", sample: "—" },
    ],
  },
  "labels.labelOverflow": {
    caption: "When a label is wider than its bar",
    states: [
      { match: false, label: "Off", sample: "Applic…" },
      { match: true, label: "On", sample: "Applications" },
    ],
  },
  "labels.optimizeLabelDisplay": {
    caption: "When labels would collide",
    states: [
      { match: false, label: "Off", sample: "82K 66K 51K 38K" },
      { match: true, label: "On", sample: "82K    51K" },
    ],
  },
  "labels.valueFormatString": {
    caption: "A .NET format code applied to the value",
    states: [
      { match: "", label: "Unset", sample: "82000" },
      { match: "#,0", label: "#,0", sample: "82,000" },
      { match: "0.0%", label: "0.0%", sample: "82.0%" },
      { match: "£#,0", label: "£#,0", sample: "£82,000" },
    ],
  },
  "labels.showSeries": {
    caption: "Which series get labels",
    states: [
      { match: false, label: "Off", sample: "all series share one setting" },
      { match: true, label: "On", sample: "each series set separately" },
    ],
  },

  // ---- Axes --------------------------------------------------------
  "categoryAxis.concatenateLabels": {
    caption: "Nested category labels",
    states: [
      { match: false, label: "Off", sample: "London\nNorth" },
      { match: true, label: "On", sample: "London North" },
    ],
  },
  "categoryAxis.axisStyle": {
    caption: "What the axis title shows",
    states: [
      { match: "showTitleOnly", label: "Title only", sample: "Applications" },
      { match: "showUnitOnly", label: "Unit only", sample: "(thousands)" },
      { match: "showBoth", label: "Both", sample: "Applications (thousands)" },
    ],
  },
  "valueAxis.axisStyle": {
    caption: "What the axis title shows",
    states: [
      { match: "showTitleOnly", label: "Title only", sample: "Applications" },
      { match: "showUnitOnly", label: "Unit only", sample: "(thousands)" },
      { match: "showBoth", label: "Both", sample: "Applications (thousands)" },
    ],
  },
  "valueAxis.logAxisScale": {
    caption: "Tick spacing across the range",
    states: [
      { match: false, label: "Linear", sample: "0  25  50  75  100" },
      { match: true, label: "Log", sample: "1  10  100  1K  10K" },
    ],
  },
  "valueAxis.roundRange": {
    caption: "Where the axis ends",
    states: [
      { match: false, label: "Off", sample: "0 … 82,431" },
      { match: true, label: "On", sample: "0 … 90,000" },
    ],
  },
  "valueAxis.scaleToFit": {
    caption: "Axis range against the data",
    states: [
      { match: false, label: "Off", sample: "always starts at 0" },
      { match: true, label: "On", sample: "starts near the lowest value" },
    ],
  },
  "valueAxis.sharedAxis": {
    caption: "Across small multiples",
    states: [
      { match: false, label: "Off", sample: "each panel scales itself" },
      { match: true, label: "On", sample: "every panel shares one scale" },
    ],
  },
  "categoryAxis.switchAxisPosition": {
    caption: "Which side the axis sits on",
    states: [
      { match: false, label: "Off", sample: "left / bottom" },
      { match: true, label: "On", sample: "right / top" },
    ],
  },

  // ---- Behaviour that only shows with real interaction --------------
  "general.responsive": {
    caption: "As the visual gets smaller",
    states: [
      { match: false, label: "Off", sample: "elements keep their size" },
      { match: true, label: "On", sample: "labels and axes drop away" },
    ],
  },
  "visualHeader.show": {
    caption: "The hover toolbar",
    states: [
      { match: false, label: "Off", sample: "no icons on hover" },
      { match: true, label: "On", sample: "⋯ ⤢ ⊙ appear on hover" },
    ],
  },
  "lockAspect.show": {
    caption: "When the visual is resized",
    states: [
      { match: false, label: "Off", sample: "width and height move freely" },
      { match: true, label: "On", sample: "ratio is preserved" },
    ],
  },
  "general.keepLayerOrder": {
    caption: "Selecting a visual in reading view",
    states: [
      { match: false, label: "Off", sample: "selected visual jumps to front" },
      { match: true, label: "On", sample: "layer order is kept" },
    ],
  },

  // ---- Slicer / table behaviour -------------------------------------
  "selection.singleSelect": {
    caption: "How many items can be picked",
    states: [
      { match: false, label: "Off", sample: "☑ ☑ ☐ multiple" },
      { match: true, label: "On", sample: "◉ ○ ○ one only" },
    ],
  },
  "selection.strictSingleSelect": {
    caption: "Whether the selection can be cleared",
    states: [
      { match: false, label: "Off", sample: "can deselect to show all" },
      { match: true, label: "On", sample: "one must stay selected" },
    ],
  },
  "general.selfFilterEnabled": {
    caption: "The slicer's own search box",
    states: [
      { match: false, label: "Off", sample: "no search" },
      { match: true, label: "On", sample: "🔍 search box shown" },
    ],
  },
  "values.urlIcon": {
    caption: "A column containing web URLs",
    states: [
      { match: false, label: "Off", sample: "https://gov.uk/apply" },
      { match: true, label: "On", sample: "🔗" },
    ],
  },
  "columnHeaders.autoSizeColumnWidth": {
    caption: "Column widths",
    states: [
      { match: false, label: "Off", sample: "fixed, set by hand" },
      { match: true, label: "On", sample: "sized to their content" },
    ],
  },
};

/** The demo for a property, if one is defined. */
export function propertyEffect(group: string, prop: string): PropertyEffect | undefined {
  return PROPERTY_EFFECTS[`${group}.${prop}`];
}

/**
 * Which state is currently active. Compared loosely because enum values
 * arrive as strings while toggles are booleans, and an unset text field
 * resolves to "".
 */
export function activeEffectState(effect: PropertyEffect, value: string | number | boolean): number {
  const index = effect.states.findIndex((state) => String(state.match) === String(value));
  return index;
}
