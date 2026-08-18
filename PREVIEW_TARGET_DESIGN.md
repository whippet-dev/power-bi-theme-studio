# Preview-Target Mapping — Design

**Date:** 2026-08-18 · **Status:** design only, **no code written** · **For:** independent review

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
  "categoryAxis.gridlines":  { label: "Category gridlines",   layoutSlot: "plot",         conditional: true },
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

### 3.2 Bindings — property → target

```ts
type Representation =
  /** Changing the property produces the visually correct result. */
  | "exact"
  /** Renders, but the model is simplified. `note` is REQUIRED. */
  | "approximate"
  /** Presence is shown; magnitude/position is not modelled. `note` REQUIRED. */
  | "indicative";

type PreviewBinding<V extends VisualSchemaKey = VisualSchemaKey> = {
  /** PropertyDefinition.id — never a JSON path. */
  property: string;
  /** One property may affect several targets. */
  targets: ReadonlyArray<PreviewTargetId<V>>;
  representation: Representation;
  /** Required unless representation is "exact". Explains the gap. */
  note?: string;
  /**
   * Which interaction states this binding applies to. Omitted means the
   * property is not state-varying. The mapping layer states *that* the
   * binding is per-state; resolution decides *how* a state is located.
   */
  states?: ReadonlyArray<InteractionState>;
};
```

### 3.3 Non-previewable declarations

Equally first-class. A property with no binding is a **gap**; a property with an explicit declaration is a **decision**.

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

type NonPreviewable = {
  property: string;
  reason: NonPreviewableReason;
  /** Required for "schema-duplicate": which property supersedes it. */
  supersededBy?: string;
  note?: string;
};
```

These seven reasons are not invented — they are the buckets already catalogued during the earlier render audit, now given a machine-readable form instead of living in prose.

### 3.4 The per-visual mapping module

```ts
type PreviewMap<V extends VisualSchemaKey> = {
  visual: V;
  targets: Record<string, PreviewTarget<V>>;
  bindings: ReadonlyArray<PreviewBinding<V>>;
  nonPreviewable: ReadonlyArray<NonPreviewable>;
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
{ property: "bar.categoryAxis.labelColor",  targets: ["categoryAxis.tickLabels"], representation: "exact" },
{ property: "bar.categoryAxis.fontFamily",  targets: ["categoryAxis.tickLabels"], representation: "exact" },
{ property: "bar.categoryAxis.fontSize",    targets: ["categoryAxis.tickLabels"], representation: "exact" },
{ property: "bar.categoryAxis.bold",        targets: ["categoryAxis.tickLabels"], representation: "exact" },
{ property: "bar.categoryAxis.italic",      targets: ["categoryAxis.tickLabels"], representation: "exact" },
{ property: "bar.categoryAxis.underline",   targets: ["categoryAxis.tickLabels"], representation: "exact" },
```

The editor can now answer "what else affects this element?" — six properties, one hover highlight.

### 4.2 One property → many targets

```ts
// `show` governs both the labels AND whether the axis reserves a gutter.
// This is exactly the coupling RENDERER_AUDIT §2 found broken: the labels
// disappeared but the gutter constant did not follow.
{
  property: "bar.categoryAxis.show",
  targets: ["categoryAxis.tickLabels", "categoryAxis.gutter"],
  representation: "exact",
},

// The bar colour is also the legend swatch colour.
{
  property: "bar.dataPoint.fill",
  targets: ["plot.dataMarks", "legend.items"],
  representation: "exact",
},
```

The second is a case grep would never surface as a single fact.

### 4.3 Encoding a known defect as data, not folklore

`RENDERER_AUDIT.md` §4.1 finding 4: pinning the axis range changes the labels but not the bars.

```ts
{
  property: "bar.valueAxis.start",
  targets: ["valueAxis.tickLabels", "plot.dataMarks"],
  representation: "approximate",
  note: "Tick labels honour the pinned range; bar lengths still scale to the "
      + "sample maximum. RENDERER_AUDIT §4.1 finding 4. Becomes exact once "
      + "bars are positioned through ChartLayout.scale.value.",
},
{
  property: "bar.categoryAxis.invertAxis",
  targets: ["categoryAxis.tickLabels", "plot.dataMarks"],
  representation: "approximate",
  note: "Reverses tick label order only; bar order is unchanged.",
},
{
  property: "bar.error.barWidth",
  targets: ["plot.errorBars"],
  representation: "indicative",
  note: "A fixed-size indicator is drawn on the first category regardless of value.",
},
```

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
{ property: "table.columnHeaders.backColor",  targets: ["table.columnHeaders"], representation: "exact" },
{ property: "table.columnHeaders.fontColor",  targets: ["table.columnHeaders"], representation: "exact" },
{ property: "table.columnHeaders.alignment",  targets: ["table.columnHeaders"], representation: "exact" },
{ property: "table.columnHeaders.outline",    targets: ["table.columnHeaders", "table.outline"], representation: "exact" },

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

{ property: "actionButton.fill.fillColor",    targets: ["button.fill"], representation: "exact", states: ALL_STATES },
{ property: "actionButton.fill.show",         targets: ["button.fill"], representation: "exact", states: ALL_STATES },
{ property: "actionButton.fill.transparency", targets: ["button.fill"], representation: "exact", states: ALL_STATES },

// One property, two targets — placement moves the icon and reflows the text.
{ property: "actionButton.icon.placement", targets: ["button.icon", "button.text"], representation: "exact", states: ALL_STATES },

{ property: "actionButton.outline.weight", targets: ["button.outline"], representation: "approximate",
  note: "Drawn as an inset ring so the button's box size does not change with weight." },
```

**The separation that matters here.** The binding says `actionButton.fill.fillColor` — a single property id. It does not say "array entry 1", does not mention `$id`, and does not know that Fluent 2 writes five entries where a custom theme writes one. All of that lives in layer 1 (`forStateId`, per-layer `$id` matching). If a future Power BI release changes how states are encoded in JSON, **this file does not change.**

Rendered instances carry both identifiers:

```html
<span data-preview-target="button.fill" data-preview-state="hover">
```

so the editor can highlight "the fill, in the state currently previewed" without the renderer knowing what a state *is* beyond a string it was handed.

---

## 7. Coverage measurement

### 7.1 The report

Pure function over data — no DOM, no rendering, no theme:

```ts
type CoverageReport = {
  visual: VisualSchemaKey;
  total: number;
  exact: number;
  approximate: number;
  indicative: number;
  nonPreviewable: Record<NonPreviewableReason, number>;
  /** THE failure list: registered but neither bound nor declared. */
  unclassified: string[];
  /** Targets in the catalogue that no property binds to — dead targets. */
  unboundTargets: string[];
};

function computeCoverage(
  registry: Record<string, PropertyDefinition>,
  map: PreviewMap<VisualSchemaKey>,
): CoverageReport;
```

Reported honestly, "preview coverage" becomes `exact / (total − nonPreviewable)` — a figure that cannot be inflated by a stray JSX reference, because a stray reference creates no binding.

### 7.2 Four tiers of test, increasing in strength

**Tier 1 — Completeness (pure, cheap, runs today's style of test).**
```
assert(report.unclassified.length === 0)
```
Every registered property is either bound or explicitly declared non-previewable. This is a set operation over data. **No grep, no JSX inspection.** Adding a property to a registry without classifying it fails the build.

**Tier 2 — Referential integrity (compile time).**
Branded `PreviewTargetId` types mean a binding referencing a non-existent target does not compile. `report.unboundTargets` catches the reverse: a target nothing binds to, which is either a missing binding or a target that should be deleted.

**Tier 3 — Emission (DOM, cheap).**
Render each visual with a theme that enables every `conditional` target; collect `document.querySelectorAll("[data-preview-target]")`; assert catalogue ⊆ emitted. **This is what proves an element exists** — the thing grep cannot do.

**Tier 4 — Behavioural binding (DOM, the real answer).**
For each binding declared `exact`: render twice with two themes differing *only* in that property; assert the target element's computed style or measured geometry differs.

```ts
// sketch
for (const b of map.bindings.filter(b => b.representation === "exact")) {
  const [a, z] = twoThemesDifferingOnlyIn(b.property);
  for (const target of b.targets) {
    assert.notDeepEqual(snapshot(render(a), target), snapshot(render(z), target),
      `${b.property} is declared exact for ${target} but changing it renders identically`);
  }
}
```

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
- **Neither design blocks the other.** Bindings can be written now against the current renderer, with the known gaps recorded as `approximate`. When `ChartLayout` lands, bindings get promoted. If `ChartLayout` never lands, the mapping is still useful.

---

## 9. Migration

Ordered so that each step is independently valuable and reviewable.

1. **Types and infrastructure only** — `targets.ts`, `bindings.ts`, `coverage.ts`. No mappings. Zero behaviour change.
2. **Three pilot visuals** — bar chart, Table, Action button (the three worked here). They cover cartesian-with-layout, structural-without-layout, and stateful. Tier 1 and 2 tests for these three only.
3. **Add `target()` stamping** to those three renderers. Tier 3 tests. Still no behaviour change — `data-*` attributes are inert.
4. **Tier 4 harness** on the pilot three; expect it to fail on a handful of bindings and correct the *declarations*, not the renderer, in this step.
5. **Roll out to the remaining 13 visuals.** Mechanical, and reviewable in batches per visual.
6. **Then** enable the editor hover highlight — deliberately last, so the data is trustworthy before it is surfaced to users.

A reasonable checkpoint at step 4: publish the first honest coverage number. My expectation is that it will be **materially lower** than any figure previously quoted, because previous counts came from grep and counted references rather than representations. That drop is the point, not a regression.

---

## 10. Open questions for review

1. **Target granularity.** `plot.dataMarks` treats all bars as one target. Should there be per-series targets once stacked charts model real series? I lean no — targets should name what a *property* can address, and theme properties are per-series-collection, not per-bar.
2. **Chrome targets.** Title/subtitle/background/border are shared across all 16 visuals. One shared catalogue (`chrome.title`) reused per visual, or a per-visual copy? I lean shared, with bindings living in a `chrome.preview.ts` that every visual's map spreads in — mirroring how `chromeProperties.ts` already works.
3. **Should `representation` carry a severity?** `approximate` covers both "cosmetically simplified" and "displays a scale it does not obey". Those are not equally serious. A `severity: "cosmetic" | "misleading"` field would let the coverage report rank what to fix. I think yes, but it adds a field to every non-exact binding.
4. **Tier 4 in CI.** It needs a DOM. Worth the dependency, or a manually-run script? Given the repo currently has no browser-test dependency at all, I lean toward a separate script until the pilot proves its value.
5. **Enforcement of "renderer cannot see the theme".** Types make it awkward but a determined import still compiles. An ESLint rule banning `PowerBITheme` imports inside `app/components/` would make it structural. Cheap, and worth doing at step 3.

---

## 11. What this design deliberately does not do

- It does **not** change how properties resolve. Layer 1 is untouched.
- It does **not** implement `ChartLayout`. It composes with it, and degrades gracefully without it.
- It does **not** add visuals, style presets, registry consolidation, or UI changes.
- It does **not** claim to measure fidelity. It measures *whether a property is represented at all*, and records *how faithfully* as a human-asserted, human-reviewable claim. Tier 4 stops that claim being silently false; only a person with Power BI open can stop it being wrong.
