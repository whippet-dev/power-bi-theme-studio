# Preview-Target Mapping — Design

**Date:** 2026-08-18 · **Status:** design only, **no code written** · **For:** independent review

**Revision 2** — validated against the complete 297-property `clusteredBarChart` registry. See `BAR_CHART_PREVIEW_COVERAGE_PILOT.md` for the full trace. Four changes were made *because of* that pilot, each marked **[rev2]** below:

1. Fidelity moved from the binding to the **individual property→target relationship** (§3.2) — `valueAxis.start` is exact for tick labels and misleading for data marks.
2. A **`gap`** category added (§3.4) — the pilot found **111 properties (42% of previewable)** that should render and do not. The original design had no home for these and would have forced either 111 dishonest `non-previewable` declarations or a permanently failing test.
3. **Target-level `modelFidelity`** added (§3.5) — `error.barColor` really is exact, but the element it colours is not an error bar. Fidelity sometimes belongs to the element, not the relationship.
4. **Severity** (`cosmetic` / `misleading`) added (§3.3), and coverage reporting reworked to forbid a single headline percentage (§7).

**Revision 2.1** — consistency pass. Fidelity examples updated to the `affects` shape; `NonPreviewable.property`, `Gap.property` and `supersededBy` typed as `PropertyId<V>`; the relationship-vs-target fidelity boundary given a decidable rule (§3.5) and the bar-chart pilot recounted against it.

**Revision 2.2** — validated against two further complete registries: **Table (73 properties, structural/DOM)** and **Action Button (68 properties, stateful)**. Both survived. Two changes:

1. **`requires` added to `TargetRelationship`** (§3.2) — the one genuinely new concept either pilot demanded. Without it a tier-4 test reports false failures on the 18 mutually-exclusive shape parameters.
2. **`indicative` flagged for removal from `Representation`** (§3.2) — three pilots, zero relationship-level uses, five target-level uses.

Cross-pilot results are summarised in §12.

Addresses `ARCHITECTURE_REVIEW.md` §3.4/§5D (no declarative property → rendered-element mapping) in light of `RENDERER_AUDIT.md` (no computed plot geometry; "referenced in JSX" is not evidence of representation).

Companion to the `ChartLayout` proposal in `RENDERER_AUDIT.md` §3.1. The two are independent and composable: `ChartLayout` answers *where an element goes*; this answers *which properties affect it, and how faithfully*.

---

## 1. The problem, precisely

Today the only way to answer "does `bar.categoryAxis.labelColor` actually do anything?" is to grep `VisualPreviews.tsx` for `.labelColor` and read the JSX. That method is unsound in both directions:

- **False positives.** A value can be read, spread into a style object, and land on an element that is never visible, is overridden downstream, or is zero-sized. The audit found several: `labelContainerMaxWidth` binds to a 28px fixed column, error-bar magnitude fields draw a fixed indicator.
- **False negatives.** Values consumed through a shared component prop (`<Gridlines axis={…}>`) never appear as `.fieldName` anywhere.

There is also no vocabulary for the middle ground. `valueAxis.start` *is* wired — it changes the tick labels — but the bars ignore it, so the chart displays a scale it does not obey. "Wired" and "unwired" cannot express that. It needs to be sayable, reviewable, and testable.

---

## 2. Three layers, and what each must not know

The central constraint: **resolution, mapping and rendering are separate concerns and must not leak into one another.**

| Layer | Owns | Knows | Must **not** know |
|---|---|---|---|
| **1. Resolution** `app/lib/properties.ts` + registries | Theme JSON → values | `visualStyles` paths, layers, `$id`, provenance | Preview targets, DOM, geometry |
| **2. Target mapping** *(new)* `app/lib/preview/` | Property id → target id(s) + fidelity | `PropertyDefinition.id`, `PreviewTargetId` | JSON paths, `$id`, array indices, DOM, CSS |
| **3. Rendering** `VisualPreviews.tsx` + `ChartParts.tsx` | Target id → pixels | `Resolved*Style` values, `ChartLayout` rects, target ids | Theme JSON, property ids, `visualStyles`, `$id` |

The critical boundary properties:

- **Layer 2 is pure data.** No functions of the theme, no DOM references, no CSS. It is a table. It can be diffed, reviewed, and reasoned about without running anything.
- **Layer 2 never mentions `$id` or array indices.** Interaction states are a *resolution* concern (`forStateId`, established in commit `fe481de`). Mapping refers to `actionButton.fill.fillColor` — one property id — and separately declares *which states the binding applies to*. It never says `["fill", 1, "fillColor"]`.
- **Layer 3 never sees a property id.** The renderer receives resolved values (already-computed colours and numbers), layout rectangles, and opaque target identifiers. It cannot look up a theme path even if it wanted to. This is the property that makes finding 6 of the audit (renderers reading raw JSON) structurally impossible rather than merely discouraged.

---

## 3. Type design

### 3.1 Targets — the layer 2/3 contract

A **preview target** is a semantic element of a rendered visual. Not a DOM node, not a CSS class — a name for a thing a user can point at.

```ts
/** Branded so a target id from one visual cannot be used for another. */
type PreviewTargetId<V extends VisualSchemaKey = VisualSchemaKey> =
  string & { readonly __visual: V };

type PreviewTarget<V extends VisualSchemaKey = VisualSchemaKey> = {
  id: PreviewTargetId<V>;
  visual: V;
  /** Human-readable, for hover tooltips and the coverage report. */
  label: string;
  /**
   * Which ChartLayout slot this target occupies, when the visual has a
   * layout. Lets the highlight overlay use computed rects instead of DOM
   * measurement — which matters because the hero is transform-scaled
   * (RENDERER_AUDIT §5.2).
   */
  layoutSlot?: ChartLayoutSlot;   // "plot" | "categoryAxis" | "legend" | …
  /**
   * True when the target can legitimately be absent — a hidden axis, a
   * disabled legend. Coverage tests must supply a theme that enables it
   * before asserting it renders.
   */
  conditional?: boolean;
  /** True when the target renders once per interaction state. */
  stateful?: boolean;
};
```

Targets are declared per visual in a closed catalogue:

```ts
export const BAR_CHART_TARGETS = defineTargets("clusteredBarChart", {
  "categoryAxis.tickLabels": { label: "Category axis labels", layoutSlot: "categoryAxis", conditional: true },
  "categoryAxis.title":      { label: "Category axis title",  layoutSlot: "categoryAxis", conditional: true },
  "valueAxis.tickLabels":    { label: "Value axis labels",    layoutSlot: "valueAxis",    conditional: true },
  "valueAxis.gridlines":     { label: "Value axis gridlines", layoutSlot: "plot",         conditional: true },
  "valueAxis.title":         { label: "Value axis title",     layoutSlot: "valueAxis",    conditional: true },
  "plot.dataMarks":          { label: "Bars",                 layoutSlot: "plot" },
  "plot.dataLabels":         { label: "Data labels",          layoutSlot: "plot",         conditional: true },
  "plot.background":         { label: "Plot area",            layoutSlot: "plot" },
  "plot.referenceLine":      { label: "Constant line",        layoutSlot: "plot",         conditional: true },
  "plot.trendLine":          { label: "Trend line",           layoutSlot: "plot",         conditional: true },
  "plot.errorBars":          { label: "Error bars",           layoutSlot: "plot",         conditional: true },
  "legend.items":            { label: "Legend",               layoutSlot: "legend",       conditional: true },
  "legend.title":            { label: "Legend title",         layoutSlot: "legend",       conditional: true },
  "zoom.categorySlider":     { label: "Category zoom slider", conditional: true },
  "zoom.valueSlider":        { label: "Value zoom slider",    conditional: true },
  "smallMultiples.grid":     { label: "Small multiples grid", conditional: true },
  "smallMultiples.title":    { label: "Small multiple title", conditional: true },
} as const);
```

`defineTargets` returns a typed record, so `BAR_CHART_TARGETS["plot.dataMarks"]` is checked at compile time and a typo is a build error — **not** something a regex has to catch.

### 3.2 Bindings — fidelity lives on the *relationship* **[rev2]**

The first draft put one `representation` on the whole binding. The pilot broke that immediately:

```
bar.valueAxis.start → valueAxis.tickLabels   EXACT       (axisTicks honours it)
bar.valueAxis.start → plot.dataMarks         MISLEADING  (barPercent ignores it)
```

One `representation` would have to be `approximate`, which understates the tick-label binding and dangerously understates the data-mark one. So fidelity attaches per relationship:

```ts
type Representation =
  /** Changing the property produces the visually correct result. */
  | "exact"
  /** Renders, but the model is simplified. `note` REQUIRED. */
  | "approximate"
  /**
   * [rev2.2] CANDIDATE FOR REMOVAL. All three pilots produced **zero**
   * relationship-level `indicative`, while five targets across them need
   * it. "Presence shown, magnitude not modelled" appears to be always a
   * statement about an ELEMENT, never about one property's effect on it —
   * so this member is a tempting wrong answer for authors who have not
   * internalised the §3.5 rule. Recommendation: narrow this union to
   * `exact | approximate` and keep `indicative` only on `modelFidelity`.
   */
  | "indicative";

type TargetRelationship<V extends VisualSchemaKey = VisualSchemaKey> = {
  target: PreviewTargetId<V>;
  representation: Representation;
  severity?: Severity;          // required unless representation is "exact"
  note?: string;                // required unless representation is "exact"
  /**
   * [rev2.2] Property values that must hold for this relationship to be
   * observable at all. NOT a fidelity statement — a precondition.
   *
   * Forced by the Action Button pilot: 18 of the 20 shape parameters are
   * mutually exclusive on `tileShape`, so a tier-4 test that does not set
   * it first reports 18 false failures. The same shape recurs everywhere
   * (`labels.*` needs `labels.show`, `error.*` needs `error.enabled`).
   *
   * Also lets the coverage report separate "does nothing" from "does
   * nothing yet", and gives the property editor a basis for annotating a
   * control that cannot currently take effect.
   */
  requires?: ReadonlyArray<{
    property: PropertyId<V>;
    equals: JsonValue | ReadonlyArray<JsonValue>;
  }>;
};

type PreviewBinding<V extends VisualSchemaKey = VisualSchemaKey> = {
  /** PropertyDefinition.id — never a JSON path. Typed; see §3.6. */
  property: PropertyId<V>;
  /** One property may affect several targets, each with its own fidelity. */
  affects: ReadonlyArray<TargetRelationship<V>>;
  /**
   * Which interaction states this binding applies to. Omitted means the
   * property is not state-varying. The mapping layer states *that* the
   * binding is per-state; resolution decides *how* a state is located.
   */
  states?: ReadonlyArray<InteractionState>;
};
```

Worked, from the pilot:

```ts
{
  property: "bar.valueAxis.start",
  affects: [
    { target: "valueAxis.tickLabels", representation: "exact" },
    { target: "plot.dataMarks", representation: "approximate", severity: "misleading",
      note: "axisTicks honours the pinned range; barPercent scales against the sample "
          + "maximum. The chart displays a scale its own data does not obey. Resolved "
          + "by routing bar geometry through ChartLayout.scale.value." },
  ],
},
```

The common case stays terse — a single-target exact binding is one line — and the cost is paid only where the truth is genuinely split.

### 3.3 Severity — cosmetic vs misleading **[rev2]**

`approximate` was doing too much work. A legend that collapses eight placements into four is not comparable to an axis that displays a scale the bars ignore. The pilot found **4 misleading and 5 cosmetic** relationships, plus 3 misleading elements; averaging them would produce a number describing neither.

```ts
type Severity =
  /**
   * The preview under-models detail, but a conclusion a user draws from it
   * remains correct. Example: legend.position collapsing TopLeft and
   * TopCenter — the legend really is at the top.
   */
  | "cosmetic"
  /**
   * A user could draw a FALSE conclusion about what their theme does.
   * Example: valueAxis.start changing the labels but not the bars.
   */
  | "misleading";
```

The deciding question is deliberately about the *user's conclusion*, not about implementation effort: **"could someone ship a wrong theme because of this?"** Wrong-element attribution counts — the pilot classified `plotArea.transparency` as misleading because it fades the legend and axes, so a user concludes their theme does something it does not.

Misleading relationships are the queue for renderer work; cosmetic ones are a backlog.

### 3.4 The four classification outcomes **[rev2]**

The first draft had two: *bound* or *non-previewable*, with anything else a test failure. The pilot showed that is unworkable — **111 of 264 previewable bar-chart properties (42%) are neither**. `xAxisReferenceLine.value` is not non-previewable; it is entirely renderable and simply is not rendered. Declaring those 111 as `non-previewable` would be a lie encoded in the repository; leaving them `unclassified` would mean a permanently red test that everyone learns to ignore.

Every registered property therefore resolves to exactly one of:

| Outcome | Meaning | Test |
|---|---|---|
| **represented** | has ≥1 `TargetRelationship` | counted by fidelity |
| **non-previewable** | declared, with a reason — a *decision* | counted by reason |
| **gap** | should render, does not — an acknowledged *absence* | tracked; must trend down |
| **unclassified** | nobody has looked at it | **build failure** |

`gap` is what makes the model honest. It is the difference between "we decided this cannot be shown" and "we have not built this yet", and the pilot showed the second is the larger population by a wide margin.

```ts
type Gap<V extends VisualSchemaKey = VisualSchemaKey> = {
  property: PropertyId<V>;
  /** Optional pointer to an issue or design note. */
  ref?: string;
  /** Why it has not been done — capacity, blocked on layout, blocked on data. */
  blockedBy?: "renderer" | "layout" | "sample-data" | "unscheduled";
  note?: string;
};
```

### 3.5 Target-level model fidelity **[rev2]**

The pilot found a case relationship-fidelity cannot express. `error.barColor → plot.errorBars` is genuinely **exact** — the indicator really is the colour you chose. But the indicator is a fixed-height block on the first category, not a ± range. Recording that only per-relationship forces a choice between claiming `exact` (a lie about the element) and marking all six error relationships `approximate` (losing the fact that the colour binding works).

The element gets its own verdict, stated once:

```ts
type PreviewTarget<V> = {
  // …id, label, layoutSlot, conditional, stateful as before…
  /**
   * How faithfully this ELEMENT models Power BI's equivalent, independent
   * of any property that drives it. Omitted means it models it correctly.
   */
  modelFidelity?: {
    level: "approximate" | "indicative";
    severity: Severity;
    note: string;
  };
};
```

```ts
"plot.trendLine": {
  label: "Trend line",
  layoutSlot: "plot",
  conditional: true,
  modelFidelity: {
    level: "indicative", severity: "misleading",
    note: "A fixed -6deg diagonal at top:18% (globals.css:1588), unrelated to the "
        + "plotted values, and sloping against ascending data. Its colour, width and "
        + "style bindings are exact; the element is a fiction.",
  },
},
```

#### The deciding rule **[rev2.1]**

The first pass applied this loosely and double-counted defects at both levels. The rule is:

> **Relationship fidelity** answers: *does this PROPERTY drive this target correctly?*
> **Target model fidelity** answers: *does this ELEMENT model Power BI's equivalent element, with every property set correctly and none of them varying?*

Two tests make it decidable:

1. **Would the defect vanish if the user left this property alone?** If yes, it is a *relationship* problem. `categoryAxis.show` breaks the gutter only when toggled off; with it on, the gutter is a perfectly good model. So `categoryAxis.gutter` carries **no** `modelFidelity` — the defect belongs to the `show → gutter` relationship.
2. **Would the defect survive with every property at its correct value?** If yes, it is a *target* problem. The trend line is a fixed `-6deg` diagonal no matter what any property says.

Applying this corrected three earlier misclassifications:

| Element | Was | Now | Why |
|---|---|---|---|
| `plot.dataMarks` | target approximate | **no `modelFidelity`** | Bars model bars correctly. The scale defect belongs to the `start`/`end`/`invertAxis` relationships. |
| `categoryAxis.gutter` | target misleading | **no `modelFidelity`** | Correct whenever `show` is true — a relationship defect. |
| `plot.background` | target misleading + relationship misleading | **target misleading only** | The element bound to `plot.background` is `.chart-preview`, the whole visual. That is wrong regardless of the transparency value, so the relationship `plotArea.transparency → plot.background` is **exact** and the element carries the verdict. |
| `plot.errorBars` | relationship indicative (`barWidth`) | **target indicative only** | `barWidth` genuinely drives the indicator's size; the indicator simply is not an error range. |

The last two are the rule earning its keep: both defects moved *from* the relationship *to* the element, which is where a reader looking at "why is this wrong?" would expect to find them.

**Six of the pilot's 19 targets carry `modelFidelity`** — `plot.background` and `plot.referenceLine` (approximate/misleading), `plot.trendLine` (indicative/misleading), `plot.errorBars`, `zoom.categorySlider` and `zoom.valueSlider` (indicative/cosmetic) — **of which three are misleading**. A coverage report ignoring this level would call the trend line 100% exact.

**A target with no renderer is not a `modelFidelity` case.** `categoryAxis.gridlines` has no emitting element at all; its eight properties are `gap`, and the target should not be declared until something renders it. Declaring it early would make it an `unboundTarget`, which is a different signal.

### 3.6 Typed property ids **[rev2]**

`PreviewBinding.property` was a bare `string`, so a typo — or a rename in a registry — would compile and silently produce an orphan binding. Targets were typed; properties should be too, without duplicating metadata.

The obstacle is that `PropertyDefinition.id` is declared `string`, so `typeof BAR_CHART_PROPERTIES` widens every id. **Recommended fix: make the factories generic in their id**, a type-only change with no runtime effect and no call-site edits:

```ts
// before: id: string
// after:
export function colorProp<Id extends string>(
  visual: VisualSchemaKey, id: Id, label: string, /* … */
): PropertyDefinition<"color"> & { id: Id };
```

The literal is then preserved through the registry, and ids are derivable by a recursive walk:

```ts
type PropertyId<R> =
  R extends { id: infer I extends string } ? I
  : R extends object ? { [K in keyof R]: PropertyId<R[K]> }[keyof R]
  : never;

type BarChartPropertyId = PropertyId<typeof BAR_CHART_PROPERTIES>;
// → "bar.dataPoint.fill" | "bar.categoryAxis.show" | … (297 members)
```

A typo now fails the build, and deleting a property breaks every binding that referenced it — exactly the coupling wanted.

**Alternative considered and rejected:** deriving ids as template-literal types from the registry's *structure* (`` `bar.${G}.${F}` ``). It needs no factory change, but it trusts that the hand-written `id` string always matches its structural position. The registries were partly generated, so that is not a safe assumption. If the generic-factory route is rejected as too invasive, the fallback is a runtime test asserting `id === derivedKey` for every property — worth adding regardless, since it would catch copy-paste id errors that exist today.

### 3.7 Non-previewable declarations

A property with a declaration is a **decision**; a property with neither declaration nor binding is `gap` or `unclassified` (§3.4).

```ts
type NonPreviewableReason =
  /** "Auto" behaviour with no fixed visual difference to show. */
  | "auto-behaviour"
  /** Needs hierarchy, blanks, or bound URLs the fixed sample lacks. */
  | "data-shape"
  /** Unlocks per-series customisation; not a look. */
  | "structural-toggle"
  /** No visual output by definition. */
  | "accessibility"
  /** Navigation, refresh, responsive behaviour. */
  | "behavioural"
  /** Column auto-sizing and similar layout-engine concerns. */
  | "layout-engine"
  /** Schema duplicate of another property that is bound. */
  | "schema-duplicate";

type NonPreviewable<V extends VisualSchemaKey = VisualSchemaKey> = {
  property: PropertyId<V>;                   // [rev2] typed, see §3.6
  reason: NonPreviewableReason;
  /** Required for "schema-duplicate": which property supersedes it. */
  supersededBy?: PropertyId<V>;              // [rev2]
  note?: string;
};
```

**[rev2] All three classification outcomes take `PropertyId<V>`, not `string`.** Typing only `PreviewBinding.property` would leave the larger populations unchecked — the bar-chart pilot produced 33 non-previewable and 111 gap declarations against 153 bindings, so two-thirds of all property references would have been untyped. `supersededBy` is typed for the same reason: a `schema-duplicate` pointing at a renamed property is exactly the silent rot this is meant to prevent.

These seven reasons are not invented — they are the buckets already catalogued during the earlier render audit, now given a machine-readable form instead of living in prose.

These seven reasons survived the pilot unchanged: all 33 non-previewable bar-chart properties fitted them, and none needed an eighth.

### 3.8 The per-visual mapping module

```ts
type PreviewMap<V extends VisualSchemaKey> = {
  visual: V;
  targets: Record<string, PreviewTarget<V>>;
  bindings: ReadonlyArray<PreviewBinding<V>>;
  nonPreviewable: ReadonlyArray<NonPreviewable>;
  gaps: ReadonlyArray<Gap>;           // [rev2]
};
```

**File layout** — one module per visual, beside its registry, so a reviewer sees registry and mapping together and no single file grows to thousands of lines:

```
app/lib/preview/
  targets.ts            defineTargets, PreviewTarget, ChartLayoutSlot
  bindings.ts           PreviewBinding, NonPreviewable, Representation
  coverage.ts           computeCoverage — pure, no DOM
  index.ts              PREVIEW_MAPS: Record<VisualSchemaKey, PreviewMap>
  barChart.preview.ts
  table.preview.ts
  actionButton.preview.ts
  …
```

---

## 4. Worked example A — Clustered bar chart

### 4.1 Many properties → one target

Six registry entries all style the same semantic thing:

```ts
const at = (target: BarTargetId) => [{ target, representation: "exact" as const }];

{ property: "bar.categoryAxis.labelColor",  affects: at("categoryAxis.tickLabels") },
{ property: "bar.categoryAxis.fontFamily",  affects: at("categoryAxis.tickLabels") },
{ property: "bar.categoryAxis.fontSize",    affects: at("categoryAxis.tickLabels") },
{ property: "bar.categoryAxis.bold",        affects: at("categoryAxis.tickLabels") },
{ property: "bar.categoryAxis.italic",      affects: at("categoryAxis.tickLabels") },
{ property: "bar.categoryAxis.underline",   affects: at("categoryAxis.tickLabels") },
```

The editor can now answer "what else affects this element?" — six properties, one hover highlight.

### 4.2 One property → many targets

```ts
// `show` governs both the labels AND whether the axis reserves a gutter —
// and the two have DIFFERENT fidelity, which is why §3.2 moved
// representation onto the relationship.
{
  property: "bar.categoryAxis.show",
  affects: [
    { target: "categoryAxis.tickLabels", representation: "exact" },
    { target: "categoryAxis.gutter", representation: "approximate", severity: "misleading",
      note: "The label is omitted from the DOM but .bar-row still declares three grid "
          + "columns, so the track auto-flows into the 68px label column while "
          + "BAR_VALUE_AXIS_INSET stays fixed. Measured: bars and gridlines stop "
          + "overlapping entirely. RENDERER_AUDIT §2.2." },
  ],
},

// The bar colour is also the legend swatch colour.
{
  property: "bar.dataPoint.fill",
  affects: [
    { target: "plot.dataMarks", representation: "exact" },
    { target: "legend.items", representation: "exact" },
  ],
},
```

The second is a case grep would never surface as a single fact. The first is the case that forced **[rev2]**: a single `representation` would have had to be `approximate`, hiding that the label styling is perfectly correct while the layout coupling is broken.

### 4.3 Encoding a known defect as data, not folklore

`RENDERER_AUDIT.md` §4.1 finding 4: pinning the axis range changes the labels but not the bars.

```ts
{
  property: "bar.valueAxis.invertAxis",
  affects: [
    { target: "valueAxis.tickLabels", representation: "exact" },
    { target: "plot.dataMarks", representation: "approximate", severity: "misleading",
      note: "axisTicks reverses the tick array; bars still grow left-to-right, so the "
          + "axis reads right-to-left while the data does not." },
  ],
},
{
  property: "bar.error.barWidth",
  affects: [
    { target: "plot.errorBars", representation: "indicative", severity: "cosmetic",
      note: "Sets the indicator's height. Not a ± range." },
  ],
},
{
  property: "bar.plotArea.transparency",
  affects: [
    { target: "plot.background", representation: "approximate", severity: "misleading",
      note: "Applied as opacity to .chart-preview, which contains the legend and both "
          + "axes. Power BI fades only the plot background, so a user concludes their "
          + "theme does something it does not." },
  ],
},
```

Note that `bar.categoryAxis.invertAxis` is **not** a binding at all — the pilot found it is never read, so it is a `gap`, not an approximation. That distinction is only expressible because of §3.4.

The value here is that the gap stops being tribal knowledge. It appears in the coverage report, it is reviewable in a diff, and when `ChartLayout` lands, flipping `approximate` → `exact` is a deliberate edit that a reviewer will question if the note is not also removed.

### 4.4 Non-previewable declarations

```ts
{ property: "bar.categoryAxis.logAxisScale",          reason: "layout-engine",
  note: "Genuinely visual, but requires remapping every position calculation." },
{ property: "bar.categoryAxis.roundRange",           reason: "auto-behaviour" },
{ property: "bar.categoryAxis.concatenateLabels",    reason: "data-shape",
  note: "Needs a multi-level hierarchy the fixed sample does not have." },
{ property: "bar.dataPoint.defaultColor",            reason: "schema-duplicate",
  supersededBy: "bar.dataPoint.fill" },
{ property: "bar.labels.showAll",                    reason: "structural-toggle" },
```

---

## 5. Worked example B — Table

Targets are structural rather than geometric — the Table has no `ChartLayout`, which the design must accommodate without special-casing:

```ts
export const TABLE_TARGETS = defineTargets("tableEx", {
  "table.columnHeaders": { label: "Column headers" },
  "table.bodyCells":     { label: "Data cells" },
  "table.totalsRow":     { label: "Totals row", conditional: true },
  "table.rowBanding":    { label: "Alternating row background", conditional: true },
  "table.gridHorizontal":{ label: "Horizontal gridlines", conditional: true },
  "table.gridVertical":  { label: "Vertical gridlines",   conditional: true },
  "table.outline":       { label: "Table outline",        conditional: true },
} as const);
```

Note the absent `layoutSlot` — it is optional precisely so non-cartesian visuals need no layout engine. The highlight overlay falls back to DOM measurement for these (§8.2).

```ts
{ property: "table.columnHeaders.backColor", affects: [{ target: "table.columnHeaders", representation: "exact" }] },
{ property: "table.columnHeaders.fontColor", affects: [{ target: "table.columnHeaders", representation: "exact" }] },
{ property: "table.columnHeaders.alignment", affects: [{ target: "table.columnHeaders", representation: "exact" }] },
{
  property: "table.columnHeaders.outline",
  affects: [
    { target: "table.columnHeaders", representation: "exact" },
    { target: "table.outline",       representation: "exact" },
  ],
},

{ property: "table.columnWidth.autoSizeColumnWidth", reason: "layout-engine" },
{ property: "table.values.urlIcon",                  reason: "data-shape" },
{ property: "table.values.showBlankAs",              reason: "data-shape" },
```

`columnHeaders.outline` is a second one-property-two-targets case: Power BI's header outline setting draws part of the table's overall outline.

---

## 6. Worked example C — Action button (interaction states)

```ts
export const ACTION_BUTTON_TARGETS = defineTargets("actionButton", {
  "button.fill":    { label: "Button fill",    stateful: true },
  "button.outline": { label: "Button outline", stateful: true, conditional: true },
  "button.text":    { label: "Button text",    stateful: true },
  "button.icon":    { label: "Button icon",    stateful: true, conditional: true },
  "button.glow":    { label: "Button glow",    stateful: true, conditional: true },
  "button.shadow":  { label: "Button shadow",  stateful: true, conditional: true },
} as const);
```

```ts
const ALL_STATES = ["default", "hover", "selected", "disabled"] as const;

const fill = [{ target: "button.fill" as const, representation: "exact" as const }];

{ property: "actionButton.fill.fillColor",    affects: fill, states: ALL_STATES },
{ property: "actionButton.fill.show",         affects: fill, states: ALL_STATES },
{ property: "actionButton.fill.transparency", affects: fill, states: ALL_STATES },

// One property, two targets — placement moves the icon and reflows the text.
{
  property: "actionButton.icon.placement",
  affects: [
    { target: "button.icon", representation: "exact" },
    { target: "button.text", representation: "exact" },
  ],
  states: ALL_STATES,
},

{
  property: "actionButton.outline.weight",
  affects: [
    { target: "button.outline", representation: "approximate", severity: "cosmetic",
      note: "Drawn as an inset ring (box-shadow) so the button's box size does not "
          + "change with weight." },
  ],
  states: ALL_STATES,
},
```

**The separation that matters here.** The binding says `actionButton.fill.fillColor` — a single property id. It does not say "array entry 1", does not mention `$id`, and does not know that Fluent 2 writes five entries where a custom theme writes one. All of that lives in layer 1 (`forStateId`, per-layer `$id` matching). If a future Power BI release changes how states are encoded in JSON, **this file does not change.**

Rendered instances carry both identifiers:

```html
<span data-preview-target="button.fill" data-preview-state="hover">
```

so the editor can highlight "the fill, in the state currently previewed" without the renderer knowing what a state *is* beyond a string it was handed.

---

## 7. Coverage measurement

### 7.1 The report — no single headline figure **[rev2]**

The first draft proposed one number, `exact / (total − nonPreviewable)`. The pilot shows why that is unsafe. For the bar chart, three defensible "coverage" figures are:

| Figure | Value |
|---|---|
| exact relationships / all relationships | **93.0%** |
| represented properties / previewable properties | **58.0%** |
| exact relationships / previewable properties | **55.7%** |

The 93% is arithmetically true and deeply misleading: relationships only exist where a property already renders, so the metric silently excludes the 111 properties that render nothing. **Any design that permits one summary number will have that number quoted.** So the report exposes counts with explicit denominators and no aggregate:

```ts
type CoverageReport = {
  visual: VisualSchemaKey;

  properties: {
    total: number;
    represented: number;
    nonPreviewable: Record<NonPreviewableReason, number>;
    gap: Record<NonNullable<Gap["blockedBy"]>, number>;
    /** THE build failure: nobody has looked at these. */
    unclassified: string[];
  };

  relationships: {
    total: number;
    exact: number;
    approximate: { cosmetic: number; misleading: number };
    indicative: { cosmetic: number; misleading: number };
  };

  /** Targets whose ELEMENT is itself approximate or indicative (§3.5). */
  targetFidelity: { exact: number; approximate: number; indicative: number; misleading: string[] };

  /** Targets nothing binds to — dead catalogue entries. */
  unboundTargets: string[];
};
```

Three rules for anyone consuming it:

1. **Never publish a figure without its denominator.** `represented / previewable` and `represented / total` differ by 6.5 points on the bar chart alone.
2. **Report `misleading` separately and first.** It is the only count that maps to user harm; 4 misleading relationships and 3 misleading elements matter more than 111 gaps.
3. **`gap` is a backlog, not a failure.** It should trend down and be visible; it must not fail the build, or teams will convert gaps into false `non-previewable` declarations to get green.

### 7.2 Four tiers of test, increasing in strength

**Tier 1 — Completeness (pure, cheap, runs today's style of test).**
```
assert(report.properties.unclassified.length === 0)
```
Every registered property is bound, declared non-previewable, **or declared a gap**. This is a set operation over data. **No grep, no JSX inspection.** Adding a property to a registry without classifying it fails the build.

Note the `gap` outcome is what makes this tier adoptable at all: without it, standing up the bar chart would produce 111 immediate failures with no honest way to clear them.

**Tier 2 — Referential integrity (compile time).**
Branded `PreviewTargetId` types mean a binding referencing a non-existent target does not compile. `report.unboundTargets` catches the reverse: a target nothing binds to, which is either a missing binding or a target that should be deleted.

**Tier 3 — Emission (DOM, cheap).**
Render each visual with a theme that enables every `conditional` target; collect `document.querySelectorAll("[data-preview-target]")`; assert catalogue ⊆ emitted. **This is what proves an element exists** — the thing grep cannot do.

**Tier 4 — Behavioural binding (DOM, the real answer).**
Render twice with two themes differing *only* in one property; assert the target element changes. **[rev2]** The unit is the *relationship*, not the binding — a binding may be exact for one target and approximate for another, and only the exact ones carry the strong claim.

```ts
// sketch
for (const b of map.bindings) {
  const [a, z] = twoThemesDifferingOnlyIn(b.property);
  for (const rel of b.affects) {
    // Every fidelity level promises SOME visible response; only "exact"
    // promises it is the correct one, which this tier cannot check.
    assert.notDeepEqual(
      snapshot(render(a), rel.target, b.states?.[0]),
      snapshot(render(z), rel.target, b.states?.[0]),
      `${b.property} → ${rel.target} is declared ${rel.representation} but changing it renders identically`,
    );
  }
}
```

Running it over *every* relationship rather than just the exact ones is deliberate: an `approximate` or `indicative` relationship that produces no response at all is misfiled — it is a `gap` wearing a binding's clothes, and this is the only tier that can tell the difference.

Tier 4 is the direct, mechanised answer to *"a property being referenced somewhere in JSX is not evidence that it is accurately represented."* A binding that lies fails. It is also the most expensive tier — it needs a DOM environment and N renders — so I would gate it behind a separate script rather than the default `npm test`, at least initially. Tiers 1–3 should run always.

Tier 4 cannot prove *correctness*, only *responsiveness*: it catches "nothing happens", not "the wrong thing happens". Judging correctness still needs a human with Power BI open. That limit should be stated in the test file so nobody mistakes a green tier 4 for fidelity.

---

## 8. How the renderer exposes targets without understanding Power BI JSON

### 8.1 The renderer's three inputs

```ts
function BarChartPreview({ style, layout, target }: {
  style: ResolvedBarChartStyle;          // values — already resolved
  layout: ChartLayout;                   // geometry — already computed
  target: TargetStamper<"clusteredBarChart">; // identity — opaque strings
}) { … }
```

`TargetStamper` is a tiny typed helper:

```ts
type TargetStamper<V extends VisualSchemaKey> =
  (id: PreviewTargetId<V>, state?: InteractionState) =>
    { "data-preview-target": string; "data-preview-state"?: string };
```

Usage:

```tsx
<AxisTickLabels
  {...target("categoryAxis.tickLabels")}
  axis={style.categoryAxis}
  rect={layout.categoryAxis}
/>

<Gridlines
  {...target("valueAxis.gridlines")}
  axis={style.valueAxis}
  rect={layout.plot}
  scale={layout.scale.value}
/>
```

The renderer receives a colour string, a rectangle and a target name. It has no access to `PowerBITheme`, no path, no property id, no `$id`. That is not a convention — it is what its parameter types permit.

This also completes the direction of travel begun in `fe481de`, which deleted `hasSmallMultiplesOverride`, the last place a renderer read raw theme JSON. That removal was enforced by review; this makes it enforced by types.

### 8.2 Hover / focus highlighting

The editor holds a property id. Everything else falls out:

```
property id → PREVIEW_MAPS[visual].bindings → target ids
            → [data-preview-target="…"] (+ data-preview-state)
            → overlay rect
```

For targets with a `layoutSlot`, the overlay rect comes from `ChartLayout` directly rather than `getBoundingClientRect`. That matters: the hero is `transform: scale(1.5)` inside an `overflow:hidden` slot (`RENDERER_AUDIT` §5.1–5.2), so DOM-measured rects are in a different coordinate space from layout values and are clipped below ~1900px viewports. Layout-derived rects are immune. Non-layout visuals (Table, Slicer, canvas objects) fall back to DOM measurement, which is acceptable because their targets are simple block elements.

The reverse direction comes free and is worth noting as future affordance: clicking a preview element reads its `data-preview-target`, and the panel filters to the bindings for that target — "what controls this bar?" That is a substantially better discovery model than scrolling 297 properties, and it requires no new data beyond what this design already defines.

Representation quality should surface in the UI too: an `approximate` or `indicative` binding is exactly the case where the existing `PROPERTY_EFFECTS` before/after affordance earns its place, and `note` is the text to show.

### 8.3 Compatibility with `ChartLayout`

The two designs meet at exactly one point: `PreviewTarget.layoutSlot` names a `ChartLayout` field. That gives:

- **Highlighting** without DOM measurement (§8.2).
- **A regression test for the audit's headline defect.** With `categoryAxis.show = false`, assert (a) target `categoryAxis.tickLabels` is absent, (b) `layout.categoryAxis` is null, (c) `layout.plot.width` grew by exactly the former gutter, and (d) `valueAxis.gridlines` still spans `layout.plot`. Today all four are wrong; the mapping layer gives the test a vocabulary for stating them.
- **Neither design blocks the other.** Bindings can be written now against the current renderer. **[rev2]** A property that *should* render but has no renderer is a `gap`, never an `approximate` binding — `approximate` requires an actual, if simplified, visual response. When `ChartLayout` lands, the affected relationships get promoted from `approximate` to `exact` and the notes deleted; gaps become bindings only when something renders them. If `ChartLayout` never lands, the mapping is still useful.

---

## 9. Migration

Ordered so that each step is independently valuable and reviewable.

1. **Types and infrastructure only** — `targets.ts`, `bindings.ts`, `coverage.ts`. No mappings. Zero behaviour change.
2. **Three pilot visuals** — bar chart, Table, Action button (the three worked here). They cover cartesian-with-layout, structural-without-layout, and stateful. Tier 1 and 2 tests for these three only.
3. **Add `target()` stamping** to those three renderers. Tier 3 tests. Still no behaviour change — `data-*` attributes are inert.
4. **Tier 4 harness** on the pilot three; expect it to fail on a handful of bindings and correct the *declarations*, not the renderer, in this step.
5. **Roll out to the remaining 13 visuals.** Mechanical, and reviewable in batches per visual.
6. **Then** enable the editor hover highlight — deliberately last, so the data is trustworthy before it is surfaced to users.

**Revised expectation [rev2]:** the pilot has already produced that number for one visual — **58% of previewable properties represented, 42% gap**. Expect the other 15 visuals to land in the same range, and expect the whole-app figure to be far below any previously quoted. That drop is the measurement working, not a regression.

**One sequencing change [rev2].** This plan implied mapping should precede renderer work. The pilot undercuts that in one specific case: **57 of the bar chart's 111 gaps are constant lines** (`referenceLine` partial, plus `xAxisReferenceLine` and `y1AxisReferenceLine` entirely unrendered). One renderer feature would move that visual from 58% to ~79%. Writing those 57 gap declarations is still worth doing first — it is how the number becomes visible — but the mapping layer should not be presented as blocking constant-line work.

---

## 10. Open questions for review

1. **Target granularity.** `plot.dataMarks` treats all bars as one target. Should there be per-series targets once stacked charts model real series? I lean no — targets should name what a *property* can address, and theme properties are per-series-collection, not per-bar. **The pilot supports this**: 19 targets covered 297 properties with no case that felt too coarse, and the only additions it forced were `categoryAxis.gutter` and `plot.background` — both *coarser* structural distinctions, not finer ones.
2. **Chrome targets.** Title/subtitle/background/border are shared across all 16 visuals. One shared catalogue (`chrome.title`) reused per visual, or a per-visual copy? I lean shared, with bindings living in a `chrome.preview.ts` that every visual's map spreads in — mirroring how `chromeProperties.ts` already works.
3. ~~**Should `representation` carry a severity?**~~ **Resolved by the pilot — yes.** Adopted as §3.3. The bar chart splits 4 misleading / 5 cosmetic relationships plus 3 misleading elements; without the distinction the two would average into a number describing neither, and the "fix first" queue could not be derived.
4. **Tier 4 in CI.** It needs a DOM. Worth the dependency, or a manually-run script? Given the repo currently has no browser-test dependency at all, I lean toward a separate script until the pilot proves its value.
5. **Enforcement of "renderer cannot see the theme".** Types make it awkward but a determined import still compiles. An ESLint rule banning `PowerBITheme` imports inside `app/components/` would make it structural. Cheap, and worth doing at step 3.
6. **[rev2] Should `gap` require `blockedBy`?** Making it mandatory forces a judgement at declaration time and makes the backlog sortable; making it optional keeps bulk declaration cheap, which matters when the first commit declares 111 of them. I lean optional at first, mandatory once a visual's gaps drop below ~20.
7. **[rev2] Are generic id factories too invasive?** §3.6 needs `properties.ts` factory signatures to become generic in `Id`. It is type-only with no call-site changes, but it touches the file the resolver work just stabilised. The fallback (runtime id-matches-structure test) is weaker but zero-risk.

---

## 11. What this design deliberately does not do

- It does **not** change how properties resolve. Layer 1 is untouched.
- It does **not** implement `ChartLayout`. It composes with it, and degrades gracefully without it.
- It does **not** add visuals, style presets, registry consolidation, or UI changes.
- It does **not** claim to measure fidelity. It measures *whether a property is represented at all*, and records *how faithfully* as a human-asserted, human-reviewable claim. Tier 4 stops that claim being silently false; only a person with Power BI open can stop it being wrong.

---

## 12. Cross-pilot validation **[rev2.2]**

Three complete registries, chosen to span the families the app actually contains.

| | Clustered Bar | Table | Action Button |
|---|---:|---:|---:|
| Family | cartesian / geometric | structural / DOM | stateful |
| Properties | 297 | 73 | 68 |
| Represented | 153 | 37 | 67 |
| Non-previewable | 33 | 8 | 0 |
| **Gap** | **111** | **28** | **1** |
| Unclassified | 0 | 0 | 0 |
| Represented / previewable | **58.0%** | **56.9%** | **98.5%** |
| Relationships | 158 | 39 | 68 |
| — exact | 149 | 39 | 61 |
| — approximate | 9 | 0 | 7 |
| — indicative | **0** | **0** | **0** |
| Misleading relationships | 4 | 0 | 4 |
| Targets | 19 | 7 | 7 |
| Targets with `modelFidelity` | 6 | 3 | 0 |
| Misleading targets | 3 | 1 | 0 |
| Needs `layoutSlot` | yes | **no** | **no** |

### 12.1 The architecture survives all three

No pilot required a new classification outcome, a new severity, a new non-previewable reason, or a different notion of what a target is. The model expressed:

- one property → many targets, at **different** fidelities (bar chart `valueAxis.start`; also `grid.rowPadding` → three Table targets, `icon.placement` → two button targets)
- many properties → one target (16 → `categoryAxis.tickLabels`)
- element-level defects distinct from property-level ones (§3.5)
- ragged real-world state coverage (§12.4)
- an entire visual with no geometry at all

### 12.2 Each family stressed a different part

- **Bar chart** forced `gap` and per-relationship fidelity. Its 111 gaps proved the original bound-or-non-previewable dichotomy unworkable.
- **Table** proved the model works with **no `ChartLayout`**, and is the strongest argument for §7.1's ban on a single headline figure: it reports **100% exact relationships** while 43% of its previewable properties render nothing and its vertical gridlines draw a structurally different thing.
- **Action Button** forced `requires`, and confirmed that state handling needs nothing beyond `stateful` targets plus `states` on bindings — no per-state duplication, no mention of `$id`.

### 12.3 The Table de-risks the migration order

All seven Table targets omit `layoutSlot`, and nothing else in the model touched layout. The nine structural visuals (Table, Matrix, Slicer, Card, Textbox, Image, and the canvas objects) can therefore be mapped **before `ChartLayout` exists**, contrary to the implication in §9. Only the six cartesian charts need to wait.

### 12.4 One limit worth recording

`states` on a binding declares which states the **tool** can drive — not which states a given theme populates. Fluent 2 omits `disabled` for `outline` and `hover` for `text` and `icon`; those resolve through the untagged entry to a coded fallback. Encoding a specific theme's coverage in the mapping would be a category error, but it means **tier-4 tests must construct themes that set each state**, or they will report false failures.

### 12.5 Two residual observations, both out of scope here

- `actionButton.shape` is tagged `$id: "default"` by Fluent 2 but is absent from `STATEFUL_GROUPS`, so it resolves positionally at index 0 — correct by coincidence today. A **resolution** concern of exactly the class `fe481de` fixed elsewhere.
- Highlight overlays for structural visuals must be positioned inside the hero's scaled coordinate space; CSS-border targets (gridlines, outlines) can only highlight the element carrying the border, since a border has no box of its own.
