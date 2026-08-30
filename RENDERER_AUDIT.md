# Renderer & Layout Audit

**Date:** 2026-08-18 · **at commit:** `346035c` · **Scope:** the visual rendering system only. **No code was changed.**

Companion to `ARCHITECTURE_REVIEW.md`, which audits the *property resolution* layer. Where that review asked "does the right value reach the renderer?", this one asks "does the renderer do anything honest with it?"

## Method, and what counts as evidence

Findings marked **[measured]** were reproduced at runtime in a real browser against the running dev server, using `getBoundingClientRect` on the live DOM. Findings marked **[source]** are derived from reading the code and are labelled as such because I could not exercise them without changing state I chose not to change.

This distinction matters here more than usual. **A property being referenced somewhere in JSX is not evidence that it is accurately represented** — that is the standard applied throughout. Several properties below are read, passed into a style object, and still produce no honest visual result.

All hero measurements are in *device* pixels. The hero applies `transform: scale(1.5)`, so layout (CSS) pixels are these figures ÷ 1.5. Where it matters I give both.

---

## 1. Headline findings

| # | Finding | Severity | Class |
|---|---|---|---|
| 1 | **Hiding a bar chart's category axis detaches the bars from the value axis entirely** — bar track collapses to 27% of its width and moves outside the gridline range | **Critical** | Layout architecture |
| 2 | **Column charts are misaligned by 18px *while the axis is shown*** — and become correct only when it is hidden | **High** | Layout architecture |
| 3 | **The hero visual is silently clipped below a ~1900px viewport** — 303px of 630px hidden at 1280×720, with no scrollbar | **High** | Layout architecture |
| 4 | **Pinning a value axis range changes the tick labels but not the bars** — the chart displays a scale it does not obey | **High** | Property mapping |
| 5 | Value-axis tick labels occupy a **zero-width** container and reserve no gutter; they overlay whatever is to their left | Medium | Layout architecture |
| 6 | There is **no plot rectangle** anywhere in the codebase. Every chart family derives geometry independently from CSS flow | **Critical (root cause)** | Layout architecture |
| 7 | Stacked charts are not stacked — a fixed 62% split, ignoring data | Medium | Sample data |
| 8 | Pie chart is a `conic-gradient` with no slice geometry; labels cannot be positioned per slice | Medium | Renderer polish |
| 9 | Hero and thumbnails render the same DOM at different scales, so nothing is size-independent | Medium | Layout architecture |

Findings 1, 2, 3, 5, 6 and 9 are all the **same root cause**, described in §3.

---

## 2. The axis-removal defect — traced

Your hypothesis was right, and the reality is worse than "shifts left inconsistently".

### 2.1 Bar chart, category axis **shown** — [measured]

```
plot                      x=240  w=537
  .bar-row__label         x=240  w=102   (grid col 1: 68px × 1.5)
  .bar-row__track-wrap    x=354  w=369   (grid col 2: 246px × 1.5)
  .bar-row__value         x=735  w=42    (grid col 3: 28px × 1.5)
gridlines                 x = 354, 446, 538, 630, 723
```

Correct. Gridline 0 sits exactly on the track's left edge (354) and gridline 4 on its right edge (354+369 = 723).

### 2.2 Bar chart, category axis **hidden** — [measured]

```
plot                      x=240  w=537        (unchanged)
  .bar-row__track-wrap    x=240  w=102   ← moved into grid column 1
  .bar-row__value         x=354  w=369   ← moved into grid column 2
  (grid column 3 now empty)
gridlines                 x = 354, 446, 538, 630, 723   ← did not move at all
ticks                     x = 354, 446, 538, 630, 723   ← did not move at all
```

The bar track now spans **240–342**. The gridlines span **354–723**. They no longer overlap *at all*. The bars are not merely shifted — they have left the coordinate system the axis describes, and the track is **72% narrower** (369px → 102px).

### 2.3 Precise cause — two independent faults compounding

**Fault A — CSS Grid auto-placement.** `app/globals.css:1539`:

```css
.bar-row {
  display: grid;
  grid-template-columns: 68px minmax(80px, 1fr) 28px;
  gap: 8px;
}
```

`app/components/VisualPreviews.tsx:1051` omits the label **from the DOM** when the axis is hidden:

```tsx
{barChartStyle.categoryAxis.show && (
  <span className="bar-row__label" …>{label}</span>
)}
```

The grid still declares three columns. With the first child gone, the remaining two auto-flow into columns 1 and 2. Nothing reserves column 1 for the label — no `grid-column` assignment, no `grid-template-areas`, no placeholder. The track inherits the 68px label column.

**Fault B — the inset is a hardcoded constant duplicating the CSS.** `app/components/VisualPreviews.tsx:286`:

```ts
// Must match .bar-row's `grid-template-columns: 68px minmax(80px, 1fr) 28px;
// gap: 8px;` in globals.css, or gridlines/ticks drift onto the label gutters
const BAR_VALUE_AXIS_INSET = { start: 68 + 8, end: 8 + 28 };
```

The comment states the coupling explicitly and asks a human to maintain it. The constant cannot respond to `categoryAxis.show`, because it is evaluated once at module scope and never sees the theme.

So the same geometry is derived twice — once by the CSS grid engine, once by a hand-maintained TypeScript constant — from two sources of truth that disagree the moment a conditional changes the DOM. **This is the defect in miniature, and it recurs in every chart family.**

### 2.4 The same fault, opposite polarity — column charts [measured]

Column charts use flex, not grid, so the symptom inverts:

| State | Bar baseline vs zero gridline |
|---|---|
| Category axis **shown** | **18px above it** — wrong |
| Category axis **hidden** | **0px** — correct |

`.column-item` is `display:flex; flex-direction:column; justify-content:flex-end` with `gap:4px`. The label is a flow sibling *below* the track, so it consumes 12px + 6px gap (device px) out of the plot's fixed 128px height. But `Gridlines` positions against the **plot box**, which still includes the label strip.

The column chart therefore renders a value scale that is compressed relative to its own gridlines — and it is only accidentally correct in the state you'd consider degraded.

### 2.5 Line chart — stable, also by accident [measured]

`.line-preview__axis-labels` is a sibling **outside** `.line-preview__plot`, and the plot has a fixed `height: 120px`. Hiding the category axis removes a block below the plot without touching the plot's internals, so nothing misaligns. The whole chart just gets shorter.

Three chart families, one conceptual operation, three different behaviours: catastrophic, inverted, and stable. None of them by design.

### 2.6 Value-axis labels reserve no space [measured]

```
.line-preview__plot .chart-ticks--vertical  →  left: 234, right: 234  (width 0)
```

`globals.css:1233` positions the container at `left:-4px; transform:translateX(-100%)`, and `AxisTickLabels` positions each label absolutely *inside* it. The container therefore collapses to **zero width**, and the labels extend leftward over whatever is there. Power BI reserves a real gutter that shrinks the plot. Here the plot never knows the axis exists.

Consequence: hiding the *value* axis on column/line charts produces no layout change at all — stable, but for the wrong reason, and the labels can overlap the rotated axis title.

---

## 3. Is there a coherent shared layout model?

**No.** There is shared *furniture* but no shared *geometry*.

`ChartParts.tsx` genuinely shares components — `Gridlines`, `AxisTickLabels`, `ChartLegend`, `DataLabel`, `ZoomSliders`, `SmallMultiplesGrid`. That part is well factored and should stay. But every one of them is positioned by the **caller's** CSS context, and each caller establishes that context differently:

| Chart family | Plot bounds established by | Axis gutter | Inset mechanism |
|---|---|---|---|
| Bar / Stacked bar | CSS grid columns inside each row | Grid column 1 (68px) | Module constant `BAR_VALUE_AXIS_INSET` |
| Column / Stacked column | Fixed `height:128px` + flex column | Flex sibling in flow | None |
| Line | Fixed `height:120px`, labels outside | Sibling block outside plot | None |
| Pie | `aspect-ratio` box | n/a | n/a |

Four families, four unrelated layout strategies. `AxisInset` exists as a *type*, but only the bar family ever passes one, and it passes a constant.

The plot rectangle — the single most important quantity in a cartesian chart — **is never computed anywhere**. It is whatever CSS flow happens to leave over, and it differs per element within the same chart.

### 3.1 Proposed target architecture — *not implemented*

One layout function per chart, computed from resolved style, consumed by everything.

```ts
type Rect = { x: number; y: number; width: number; height: number };

type ChartLayout = {
  outer: Rect;        // the visual's content box
  title: Rect | null; // reserved only when title.show
  subtitle: Rect | null;
  legend: Rect | null;      // position-aware: top/bottom/left/right
  categoryAxis: Rect | null; // the gutter, null when !show
  valueAxis: Rect | null;
  plot: Rect;         // THE canonical plot rectangle — computed once
  scale: {
    // value → plot coordinate, honouring start/end/invertAxis
    value: (v: number) => number;
    // category index → plot coordinate, honouring innerPadding
    category: (i: number, count: number) => number;
  };
};

function computeChartLayout(style: CartesianStyle, outer: Rect, data: ChartData): ChartLayout;
```

**Rules the model must enforce:**

1. **Gutters are subtracted, never assumed.** `categoryAxis` contributes a gutter *only* when `show` is true. Its size is measured or estimated from the resolved font metrics, not a literal `68`.
2. **`plot` is computed once** and passed down. `Gridlines`, `AxisTickLabels`, bars, lines, markers, data labels, reference lines, trend lines and error bars all take `layout.plot` and `layout.scale` — none of them consults CSS or a constant.
3. **`scale.value` is the only path from data to pixels**, so `valueAxis.start` / `end` / `invertAxis` cannot desynchronise from the ticks (see §4, finding 4).
4. **The DOM stops carrying layout meaning.** A hidden axis means "the gutter is zero", not "delete an element and hope the grid copes". Elements can still be omitted, but the *geometry* comes from the layout object either way.
5. **One engine for both preview sizes.** Hero and thumbnail differ only by the `outer` rect passed in — no `transform: scale`, no second code path (see §5).

**Migration shape** (sequencing only — not a commitment): introduce `computeChartLayout` alongside the current rendering; convert the bar family first since it has the worst defect and an explicit inset constant to delete; then column, then line; then remove `BAR_VALUE_AXIS_INSET` and the fixed plot heights. Each conversion is independently testable by asserting gridline positions equal `layout.scale.value(tick)`.

This is deliberately *not* the "preview-target mapping layer" from `ARCHITECTURE_REVIEW.md` §3.4. That one answers *which property affects which element*; this one answers *where that element goes*. They are complementary and independent.

---

## 4. Per-visual audit

Fidelity ratings: **Good** (genuinely models Power BI) · **Sound** (correct but simplified) · **Weak** (renders something, models little) · **Token** (present, essentially decorative).

Every visual shares `PreviewShell` for chrome (title, subtitle, background, border, shadow, padding, visual header) — the one genuinely universal primitive, and a good one.

### 4.1 Clustered bar chart — **Sound → Weak under axis changes**

- **Component:** `VisualPreviews.tsx` `barContent` (~1005–1112)
- **Primitives:** `Gridlines`, `AxisTickLabels`, `ChartLegend`, `DataLabel`, `ZoomSliders`, `SmallMultiplesGrid`, `PreviewShell`
- **Bounds:** CSS grid per row, `68px minmax(80px,1fr) 28px`; value axis inset by module constant
- **Technology:** pure DOM + CSS. No SVG.
- **Visibly affected:** fill, fill transparency, border (show/size/colour/match-fill/outline-only), gap size → bar thickness, category axis show/fonts/colour/title, value axis ticks/fonts/gridlines/display units/precision, legend show/position/title/fonts, data labels (all three parts, density, position inside/outside, background), plot-area transparency, reference line, trend line, error bars, zoom sliders, small multiples, `innerPadding`
- **Resolves but not meaningfully represented:** `valueAxis.start`/`end` (labels only — see below), `invertAxis` (reverses tick text but not bar direction), `labelContainerMaxWidth` (applies `max-width` but the label column is fixed 28px so it rarely binds), `dataPoint.defaultColor` (schema duplicate of `fill`), error-bar *magnitude* fields (a fixed indicator is drawn regardless of value)
- **Hardcoded:** `barCategories` = London 82 / North West 66 / Scotland 51 / Wales 38; `dataMax = 82_000`; reference line pinned at `left: 65%`; error bar drawn only on `index === 0`
- **Defects:** §2.2 (critical). Also **finding 4**: `barPercent()` scales against `barCategoriesMax`, never against `axisTicks`'s `start`/`end`. Pin the axis to 0–100K and the labels say 100K while the bar for 82 still reaches 100%. The chart displays a scale it does not obey. [source — mechanism is unambiguous in `VisualPreviews.tsx:949` vs `ChartParts.tsx:124`]
- **Responsive:** bar rows have a `minmax(80px,1fr)` track so they compress gracefully; thumbnails render the same DOM unscaled, so the 68px label column is proportionally huge at thumbnail size.

### 4.2 Stacked bar chart — **Weak**

Same component family and same defects as 4.1 (shares `.bar-row` CSS and `BAR_VALUE_AXIS_INSET`), plus: the "stack" is a `linear-gradient` with a **fixed 62% split** (`stackedSegmentShare`, line 1115) that ignores data entirely. Both series always divide every bar identically. Series colours are real; series *proportions* are fiction. Totals labels render via `dataLabelStyle`.

### 4.3 Clustered column chart — **Sound, with a standing 18px error**

- **Component:** `columnContent` (~1220–1318); **Bounds:** fixed `height:128px` plot, flex columns, no inset
- **Technology:** DOM + CSS
- **Visibly affected:** as 4.1, oriented vertically
- **Defects:** §2.4 — 18px baseline offset whenever the category axis is shown [measured]. Value-axis labels reserve no width (§2.6). `defaultColumnWidth`-class properties unmodelled.
- **Hardcoded:** same dataset; reference line pinned at `top: 22%`

### 4.4 Stacked column chart — **Weak**

As 4.3 plus the fixed 62% split from 4.2.

### 4.5 Line chart — **Good geometry, distorted coordinate space**

- **Component:** `lineContent` (~1740–1890); `lineGeometry.ts` for paths
- **Technology:** **mixed** — SVG for line/area/forecast/error, absolutely-positioned HTML for markers and labels
- **Visibly affected:** stroke show/width/colour/transparency/dash array/dash cap/line join, area fill, step vs curve interpolation, markers (shape/size/colour/border/rotation), category & value axes, gridlines, legend, data labels, anomaly band, forecast, trend, reference lines, zoom, small multiples
- **Genuine strengths:** real Catmull-Rom and step interpolation, real area paths, `vector-effect="non-scaling-stroke"` correctly applied
- **The trap:** `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` in a box measured at **537×180 — a 2.98:1 stretch** [measured]. Any geometry drawn inside that viewBox distorts. This already forced markers out of the SVG into HTML (`chartMarker`). The constraint is load-bearing and undeclared: the next person to add an SVG shape here will reintroduce the stretched-marker bug.
- **Resolves but not represented:** `logAxisScale`, `axisType` Scalar/Categorical, `switchAxisPosition`
- **Hardcoded:** `linePointValues = [42,58,30,68,48]`; months Jan–May; error bar hardcoded to point index 3; anomaly/forecast positions fixed

### 4.6 Table — **Sound**

- **Component:** `tableContent`; **Technology:** DOM/CSS grid
- **Visibly affected:** header/body/total font, colour, background, alignment, word wrap, outline (all 8 variants), row padding, alternating row background, grid horizontal/vertical/thickness/colour, text size
- **Resolves but not represented:** `autoSizeColumnWidth`, `customColumnWidth`, `defaultColumnWidth`, `columnAdjustment` — genuine layout-engine concerns with no equivalent in a fixed mock; `urlIcon`, `webURL`, `showBlankAs` — need data shapes the sample doesn't have
- **Hardcoded:** fixed 4-column, ~5-row dataset
- **Assessment:** the honest bits are honest. Column-width properties are the main gap and are arguably not previewable at all.

### 4.7 Matrix — **Sound**

As Table, plus row hierarchy indentation, subtotals styling, and a small SVG sparkline (the second of only two SVGs in the file). Hierarchy expand/collapse, subtotal *computation*, and stepped-layout indentation values are not modelled. Sparkline data is hardcoded.

### 4.8 Pie chart — **Weak**

- **Technology:** CSS `conic-gradient` — **no slice geometry exists**
- **Visibly affected:** slice colours, inner-radius ratio (donut hole via `inset`), label font/colour/units/precision, legend, label style enum, overflow
- **Fundamental limit:** because there are no slice paths, there are no per-slice anchors. One label is drawn for `pieSliceValues[0]` and positioned by CSS. Detail labels, leader lines, per-slice label positions (inside/outside/best-fit) and slice borders cannot be represented without real geometry.
- **Hardcoded:** `pieSliceValues = [45,30,15,10]`
- **Note:** `donutChart` is a *separate Power BI visual type* and is not modelled at all — the inner-radius property here belongs to `pieChart`.

### 4.9 Slicer — **Sound**

Header/item font, colour, background, border, outline, checkbox/list styling, selection state. Slicer *mode* (list/dropdown/between/relative-date) is a data-binding concern and is not switched. Items hardcoded.

### 4.10 Card — **Sound (legacy only)**

Callout value/label font, size, colour, alignment; category label; background/border via `PreviewShell`. **The modern `cardVisual` is not modelled** — this is the legacy `card`, which is what a new report no longer uses by default.

### 4.11 Shape family (Shape, Action button, Bookmark navigator, Page navigator) — **Good**

- **Component:** `shapeGeometry.ts` (22 real `clip-path` geometries) + `shapeFamilyProperties.ts` composition
- **Visibly affected:** shape type, fill, outline (weight/colour/transparency/join), glow, shadow (offset/blur/spread/position/colour), rotation, text (all font properties, alignment, padding), icon glyph & placement, per-interaction-state variants for all of the above, navigator accent bar (position/width/transparency), navigator grid layout & cell padding
- **Genuinely good:** parameter-driven geometry, well tested, per-state rendering wired to the real `$id` model, and the only family where interaction states are visible in the preview
- **Resolves but not represented:** `imageScalingType` on Image, per-visual `height`, navigator *behavioural* fields (which bookmarks/pages appear)
- **Assessment:** the strongest renderer in the app and the model the others should follow.

### 4.12 Textbox — **Token**

3 registered properties. Renders text with resolved typography. Nothing to get wrong; nothing much modelled either.

### 4.13 Image — **Sound**

Fit/scaling, per-corner radius (`cornerRadiusAdvanced`), CSS filter chain (blur/contrast/saturate/brightness for `exposure`), alt text as `aria-label`. `imageScalingType` deliberately untouched (suspected duplicate of `fit`); `height` skipped as meaningless against a fixed tile.

### 4.14 Filter pane & colour reference (auxiliary) — **Sound**

`GlobalPreviews.tsx`. Filter card Applied/Available states, search box, header icons, section headers, per-card apply link. Genuinely improved by the recent fidelity work. Not a `visualStyles` visual — page-level styling only.

---

## 5. Responsive behaviour

### 5.1 The hero is clipped on ordinary laptops — [measured]

| Viewport | Canvas panel | Hero slot (`clientWidth`) | Hero content (`scrollWidth`) | Clipped |
|---|---|---|---|---|
| 1280×720 | 841px | 327px | 630px | **303px (48%)** |
| 1600×900 | — | 630px | 630px | 0 |
| 1920×1080 | 1481px | 630px | 630px | 0 |

`.visual-hero-scale` applies `transform: matrix(1.5,0,0,1.5,0,0)` with `transform-origin: 0 0`, inside `.visual-hero-scale-wrap` which is `overflow: hidden`. The scale is **fixed**, not fit-to-container. Below roughly a 1900px viewport the scaled content simply exceeds its slot and is cut off — with **no scrollbar** (`overflowX: hidden`, and the canvas panel does not scroll: `scrollWidth === clientWidth === 841`).

At 1280×720 the chart plot's right edge sits at x=777 while the visible wrap ends at x=511: **266px of plot is rendered but invisible.**

I confirmed this is **not** caused by the number of visuals on the canvas — clipping was identical (303px) with one tile and with three.

### 5.2 Hero and thumbnails are not the same rendering

Thumbnails have `transform: none`; the hero has `scale(1.5)`. Same DOM, two scales. Consequences:

- A theme's `fontSize: 10.5` renders at ~15.75 device px in the hero and 10.5 in a thumbnail. **Neither is Power BI's actual point size.** You cannot judge type size from either view.
- 1px borders and gridlines become 1.5px in the hero — hairlines that should stay hairlines.
- Fixed pixel constants (`68px` label column, `128px`/`120px` plot heights, `22px` plot margin) are proportionally correct at exactly one scale and wrong at the other.

This is exactly the "different preview sizes use unrelated rendering logic" concern in your brief. It is not *unrelated* logic — it is worse in one sense (identical logic, uniformly distorted) and better in another (no second code path to maintain). The fix is the same either way: pass an `outer` rect into one layout engine rather than scaling the output.

---

## 6. Auxiliary UI and active-visual bounds

**Current behaviour already matches your stated intent — no change needed.** [measured]

Toggling the Filter pane preview leaves the hero's bounds untouched: `clientWidth` 630 → 630, `scrollWidth` 630 → 630, plot width 537 unchanged. The auxiliary previews live in their own region of the canvas panel and do not participate in the hero's sizing.

I'd argue this is correct and should be preserved explicitly rather than by accident. The hero's job is to be a stable comparison surface: if it resized when you toggled the filter pane, every "did that change help?" judgement would be confounded by a layout shift. Worth an assertion in whatever layout engine replaces the current one, so it stays true by construction.

The one caveat is that the hero's stability is currently *undermined by its own scaling* (§5.1), not by auxiliary UI. Fixing the clipping is what would make it genuinely stable.

---

## 7. Problem classification

### Layout architecture (the structural work)
- The absence of a computed plot rectangle — root cause of findings 1, 2, 3, 5, 6, 9
- `BAR_VALUE_AXIS_INSET` duplicating CSS grid definitions
- Conditional DOM omission being load-bearing for grid placement
- Zero-width axis label containers reserving no gutter
- Fixed plot heights (`128px`, `120px`) and the `22px` plot margin
- Fixed `scale(1.5)` hero with `overflow:hidden` instead of fit-to-container
- The line chart's `preserveAspectRatio="none"` distorted coordinate space

### Property mapping
- `valueAxis.start` / `end` affecting labels but not geometry
- `invertAxis` reversing tick text but not data direction
- `labelContainerMaxWidth` bound to a column too narrow to exercise it
- `dataPoint.defaultColor` vs `fill` — schema duplicates, only one wired
- Error-bar magnitude fields resolving but drawing a fixed indicator

### Sample data
- Fixed 62% stacked split — the single largest fidelity lie in the app
- One hardcoded dataset shared by five charts; `dataMax = 82_000` maintained by comment
- Error bars and anomalies pinned to specific indices (`index === 0`, point 3)
- Reference/trend lines at fixed percentages rather than computed from data
- No per-visual sample-data declaration — data is scattered through JSX

### Renderer polish
- Pie chart needs real slice geometry before its label properties can mean anything
- Donut, and the modern `cardVisual`, are absent
- Matrix hierarchy/subtotal modelling
- Table column-width properties (arguably genuinely non-previewable)

---

## 8. Fidelity ratings, justified

| Visual | Rating | Justification |
|---|---|---|
| Shape family (4 visuals) | **Good** | Real geometry, real per-state rendering, well tested |
| Line chart | **Good** (geometry) / **Weak** (coordinate space) | Genuine interpolation; undermined by a 2.98:1 distorted viewBox |
| Table | **Sound** | Honest grid model; column widths unmodellable |
| Matrix | **Sound** | As Table, plus hierarchy display |
| Slicer | **Sound** | Styling honest; modes unmodelled |
| Card | **Sound** (legacy) | Correct for `card`; `cardVisual` absent |
| Image | **Sound** | Real filter chain and corner geometry |
| Clustered column | **Sound**, with a standing 18px error | Correct structure, wrong baseline |
| Clustered bar | **Sound** → **Weak** under axis changes | Correct only in the default state |
| Stacked bar / column | **Weak** | Fixed 62% split is not stacking |
| Pie | **Weak** | No slice geometry; labels cannot be honest |
| Textbox | **Token** | 3 properties |

**On the core question — do the previews genuinely represent Power BI, or satisfy implementation checks?** Mostly the former for *appearance* properties (colour, typography, borders, shadows) and mostly the latter for *geometry* properties (axis ranges, stacking, slice proportions, label positioning). That split is not a coincidence: appearance properties map to CSS declarations, which are hard to fake; geometry properties need a layout model, which doesn't exist.

---

## 9. Recommended sequencing — *proposal only*

1. **Fix the bar chart grid placement** — smallest change that removes the worst defect. Assign explicit `grid-column`, or collapse the column to `0px` rather than deleting the element.
2. **Build `computeChartLayout`** (§3.1) and convert the bar family; delete `BAR_VALUE_AXIS_INSET`.
3. **Route `barPercent` through `layout.scale.value`** — fixes findings 4 and `invertAxis` together.
4. **Convert column and line families**; remove fixed plot heights.
5. **Replace the fixed hero scale with fit-to-container** using the same `outer` rect.
6. Then, and only then, sample-data declarations and the weak renderers (stacked, pie).

Doing (6) before (2) would add more surface area to the exact problem (2) exists to solve — the same argument that was made against building the preview-target mapping layer before the renderer work beneath it had settled.

---

## 10. What should not change

- **`ChartParts.tsx`'s component factoring.** `Gridlines`, `AxisTickLabels`, `DataLabel`, `ChartLegend` are the right abstractions. They need a layout *input*, not a rewrite.
- **`shapeGeometry.ts` / `lineGeometry.ts`.** Pure, tested, correct.
- **`PreviewShell`.** The one genuinely universal primitive; chrome handling is good.
- **Hero stability against auxiliary UI** (§6) — currently correct, worth making explicit.
- **The DOM/CSS-first approach.** Rewriting the previews as full SVG would lose the CSS-native handling of typography, shadows and borders that the appearance properties depend on. The mixed model is right; it just needs a layout engine behind it.
