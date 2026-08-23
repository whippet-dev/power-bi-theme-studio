# Renderer Implementation Plan — Phase 1

**Date:** 2026-08-22 · **Status:** plan only, **no application code modified** · **At commit:** `703ba0f`

Turns `RENDERER_AUDIT.md`, `PREVIEW_TARGET_DESIGN.md`, `PREVIEW_COMPOSITION_DESIGN.md` and the three coverage pilots into an ordered sequence of commit-sized tasks a fresh session can execute safely. **This covers the first renderer-improvement phase only** — the layout engine and the refactors it needs, not the mapping layer, not supporting surfaces, not sample data.

Every claim about current structure below was verified against the working tree at `703ba0f`; file:line references are live.

## Standing constraints — apply to every task

1. **Verbatim theme round-tripping is preserved.** No task touches import, export, merge or serialisation. The exported JSON for a given input must be byte-identical before and after every commit in this plan.
2. **Layered resolution and `$id` handling are preserved.** Nothing in `app/lib/properties.ts`, the per-visual registries, `forStateId`, `STATEFUL_GROUPS` or provenance changes. The 206 existing tests covering these must pass untouched at every commit.
3. **Renderers receive resolved style props.** No renderer reads raw theme JSON. Task 5 *strengthens* this by removing the last resolution call from the renderer tree.
4. **No UX redesign.** The rail, canvas, report-page metaphor, property panel and hero comparison surface are unchanged in role.
5. **No supporting surfaces as a shortcut.** A property that does not render is a `gap` for a later phase, never a new specimen (composition design G4).
6. **No giant rewrite.** Nine of the eleven tasks below touch three files or fewer.

---

## 1. Preparatory refactors

### 1.1 Assessing the `VisualGallery` split

`PREVIEW_COMPOSITION_DESIGN.md` §4.4 recommends splitting `VisualGallery` into per-visual components before composition multiplies rendered instances. **Verified and endorsed, with one correction to the stated motivation.**

What is actually there (`app/components/VisualPreviews.tsx`, 2,933 lines):

- `VisualGallery` spans **lines 876–2933** — one function body computing all sixteen visuals' JSX on every render, regardless of `visibleVisuals`.
- Sixteen `*Content` locals plus four `*FinalContent` small-multiples wrappers (lines 959–2836), assembled into a `descriptors` array at 2837, then filtered to one hero and N thumbnails.
- The line chart alone contributes ~315 lines of locals before its `lineContent` even begins (1448–1755).

The composition design's motivation — "multiplying that by N surfaces is not viable" — is true but is the *weaker* argument, because supporting surfaces are out of this phase. The stronger argument, which this phase does hit immediately:

> **`ChartLayout` must be called per visual, with that visual's resolved style and its own `outer` rect. Inside a single 2,000-line closure, every layout call would sit in the same scope as every other chart's locals, and the compiler cannot stop `columnContent` from reaching for `barChartStyle`.** Extraction is what makes each conversion a bounded, independently reviewable diff instead of an edit inside a shared closure.

**The split is a genuine precondition for tasks 7, 8 and 10, not a tidy-up.**

### 1.2 The smallest safe extraction

Extraction is far cheaper than the file's size suggests, because the shared surface between visuals is tiny. Verified by grep, the complete set of cross-visual dependencies inside `VisualGallery` is:

| Shared local | Line | Used by |
|---|---|---|
| `barCategories` | 938 | bar, stacked bar, column, stacked column |
| `barCategoriesMax`, `barPercent` | 948–949 | the same four |
| `stackedSegmentColor`, `stackedSegmentShare` | 1114–1115 | stacked bar, stacked column |
| `palette` | 900 | pie, stacked charts |
| `chartMarker` | 147 | **already module scope** — line, matrix |
| `legendNode`, `legendAtBottom`, `legendVertical` | 955–957 | bar only (despite the generic names) |

Everything else is per-visual. So the smallest safe sequence is:

1. **Lift the shared sample data to a module** (`app/lib/previewSampleData.ts`). Pure move: `barCategories`, `barCategoriesMax`, `barPercent`, the stacked segment constants, the line chart's `linePointValues`, the month labels. No JSX moves.
2. **Extract one component per cartesian visual** into `app/components/previews/`, each with an explicit props type naming exactly the resolved style it needs. Cut and paste, no logic edits.
3. **Leave the other eleven visuals in place** for now — they are untouched by this phase and moving them adds diff without reducing risk. Extract them opportunistically, or as an optional follow-up task.

Every extracted component keeps the same JSX, the same class names and the same order of children, so the rendered DOM is character-identical.

### 1.3 Pure structural vs behavioural — the dividing line

The plan keeps these in separate commits throughout, because a reviewer can verify a structural commit by *diffing rendered output* and must verify a behavioural one by *measuring*.

| Purely structural (no rendered-output change) | Behavioural (rendered output changes by design) |
|---|---|
| T3 lift sample data | T1 interim bar grid fix |
| T4 extract cartesian components | T2 hero containment |
| T5 hoist per-state resolution | T7 column pair → `ChartLayout` |
| T6 add `chartLayout.ts` with no consumers | T8 bar pair → `ChartLayout` |
| | T9 move supporting elements out of the page |
| | T10 line chart → `ChartLayout` |

**Rule for the executing agent: never mix the two in one commit.** If a structural task produces any visual difference, that is a bug in the extraction, not an improvement.

---

## 2. `ChartLayout` implementation

### 2.1 Modules and their contents

One new file, plus additions to one existing one. Nothing else is created in this phase.

```
app/lib/chartLayout.ts        NEW — pure, no React, no DOM, no theme JSON
app/components/ChartParts.tsx  MODIFIED — primitives take rect + scale instead of inset
```

`app/lib/chartLayout.ts` exports:

```ts
export type Rect = { x: number; y: number; width: number; height: number };

export type ChartLayoutSlot =
  | "outer" | "title" | "subtitle" | "legend"
  | "categoryAxis" | "valueAxis" | "plot";

/** Data → plot coordinates. The ONLY path from a value to a pixel. */
export type ChartScale = {
  /** Honours valueAxis.start / end / invertAxis. Returns a coordinate in `plot`. */
  value: (v: number) => number;
  /** Category slot for index i of count, honouring innerPadding. */
  category: (i: number, count: number) => { start: number; size: number };
  /** The tick values the axis will draw — so gridlines and labels agree by construction. */
  ticks: number[];
};

export type ChartLayout = {
  outer: Rect;
  title: Rect | null;
  subtitle: Rect | null;
  legend: Rect | null;
  categoryAxis: Rect | null;   // null when !show — the gutter is then ZERO
  valueAxis: Rect | null;
  plot: Rect;                  // computed once, consumed by everything
  scale: ChartScale;
};

export type CartesianOrientation = "horizontal" | "vertical"; // bar vs column/line

export type ChartLayoutInput = {
  outer: Rect;
  orientation: CartesianOrientation;
  categoryAxis: AxisStyle;
  valueAxis: AxisStyle;
  legend: LegendStyle;
  categories: ReadonlyArray<{ label: string; value: number }>;
  dataMax: number;
  innerPadding: number;
  /** Swappable text metrics. Defaults to the pure estimator below. */
  measureText?: TextMeasure;
};

export function computeChartLayout(input: ChartLayoutInput): ChartLayout;
```

**Text measurement — the one genuinely hard decision.** Audit rule 1 says a gutter's size must be "measured or estimated from the resolved font metrics, not a literal `68`". There is no DOM in the test environment (§6.1), so measurement cannot be the default:

```ts
export type TextMeasure = (text: string, fontSize: number, fontFamily: string)
  => { width: number; height: number };

/** Pure, deterministic, testable. Good enough for a preview; no DOM. */
export const estimateText: TextMeasure = (text, fontSize) => ({
  width: text.length * fontSize * 0.55,
  height: fontSize * 1.35,
});
```

`measureText` is an *injectable input* defaulting to `estimateText`. `computeChartLayout` stays pure and node-testable; a canvas-based measurer can be substituted later without changing the signature or any call site. **Do not make canvas measurement the default in this phase** — it would make the entire layout engine untestable in the existing harness.

### 2.2 Responsibility boundaries

| Concern | Owner | Must **not** |
|---|---|---|
| Rect arithmetic; which gutters exist and how wide | `chartLayout.ts` | import React, touch the DOM, know a CSS class name, or see theme JSON |
| value→pixel, category→pixel, tick values | `ChartScale`, inside the layout | be recomputed anywhere else — **there is exactly one `barPercent` equivalent in the app and it lives here** |
| Drawing gridlines, tick labels, legends, data labels, zoom sliders | `ChartParts.tsx` | compute geometry; each takes `rect` and `scale` and positions from them |
| Assembling one visual: binding sample data, choosing which parts to draw | `app/components/previews/*.tsx` | contain a pixel constant |
| Colour, border, radius, font, shadow, background — **appearance only** | `globals.css` | contain any size the layout also reasons about |

The last row is the operative one. **CSS keeps paint and loses geometry.** A number that appears both in a stylesheet and in a layout calculation is the defect class this whole exercise exists to remove.

### 2.3 Constants and CSS geometry that must disappear

Verified present at `703ba0f`. Each is retired by the task named.

| Item | Location | Why it goes | Retired by |
|---|---|---|---|
| `BAR_VALUE_AXIS_INSET = { start: 68 + 8, end: 8 + 28 }` | `VisualPreviews.tsx:286` | Hand-duplicates the CSS grid; cannot see `categoryAxis.show`. The headline defect. | T8 |
| `.bar-row { grid-template-columns: 68px minmax(80px,1fr) 28px; gap: 8px }` | `globals.css:1539` | The other half of the duplication; auto-placement is load-bearing | T8 |
| `.column-preview__plot { height: 128px }` | `globals.css:1454` | Fixed plot height; the label strip eats into it (finding 2) | T7 |
| `.line-preview__plot { height: 120px }` | `globals.css:1598` | As above | T10 |
| `.chart-preview__plot { margin-top: 22px }` and the two `margin-top: 22px` on the column/line plots | `globals.css:1447, 1454, 1598` | A magic gutter reserved by CSS that layout cannot see | T7, T8, T10 |
| `.chart-ticks--vertical { left: -4px; transform: translateX(-100%) }` | `globals.css:1233` | The zero-width gutter (finding 5) — labels overlay their neighbours | T7 |
| `.bar-row__track { height: 11px }` | `globals.css:1553` | Bar thickness must come from `clusteredGapSize` via layout, not CSS | T8 |
| `left: "65%"` (bar reference line) | `VisualPreviews.tsx:1029` | Pinned, and against a different box than the gridlines | T8 |
| `top: "22%"` (column reference line) | `VisualPreviews.tsx:1240` | As above | T7 |
| `.chart-preview__trend-line { left:6%; right:6%; top:18%; rotate(-6deg) }` | `globals.css:1588` | A decorative diagonal unrelated to data | **Not this phase** — see §9 |
| `dataMax={82_000}` ×4, `dataMax={70_000}` ×1 | `VisualPreviews.tsx:1102, 1201, 1234, 1350, 1776` | Maintained by comment against `barCategories` | T3 (centralised), T7/T8/T10 (routed through layout) |
| `insetOffset()` + `AxisInset` | `ChartParts.tsx:176–186` | Superseded by `scale`; its unit test is superseded too, not deleted silently | T8 (last consumer) |

`barThickness()` (`VisualPreviews.tsx:275`) **stays** — it is a percentage derived from a resolved property, not a duplicated constant, and it moves into layout's `scale.category` in T7/T8.

### 2.4 How a primitive changes

Illustrative only — this is the shape a reviewer should expect, not code to paste.

```
before:  <Gridlines axis={valueAxis} orientation="vertical" inset={BAR_VALUE_AXIS_INSET} />
after:   <Gridlines axis={valueAxis} rect={layout.plot} scale={layout.scale} orientation="vertical" />

before:  width: `${barPercent(value)}%`
after:   width: layout.scale.value(value) - layout.scale.value(0)
```

The second line is the whole point: it is what makes findings 4 and `invertAxis` impossible rather than merely fixed.

---

## 3. Migration order across the five cartesian visuals

### 3.1 The pairs are CSS-coupled — verified

`stackedBarContent` uses `.bar-row`, `.bar-row__label`, `.bar-row__track-wrap` and `BAR_VALUE_AXIS_INSET` (`VisualPreviews.tsx:1154–1201`). `stackedColumnContent` uses `.column-item` and `.column-preview__columns` (`:1363–1372`). **A clustered chart cannot be migrated without its stacked sibling** — the shared stylesheet would have to serve one converted and one unconverted consumer, which means either duplicated legacy classes or a broken sibling.

The stacked variants add almost nothing to the conversion: their "stack" is a `linear-gradient` inside the same track element, so the layout call, the plot rect and the scale are identical. **Migrate in pairs.** The 62% split is *not* fixed here (§9).

### 3.2 First pilot: the **column pair**, not the bar pair

`RENDERER_AUDIT.md` §9 sequences the bar family first. **Recommend deviating, for one specific reason.**

|  | Bar pair | Column pair |
|---|---|---|
| Defect | Catastrophic (finding 1) | 18px baseline (finding 2) |
| Plot bounds established by | CSS Grid, three columns, auto-placement | fixed height + flex column |
| Requires DOM restructure to fix | **Yes** — grid columns must stop being load-bearing | No |
| Explicit inset constant to delete | Yes | No |
| Confounds "does the engine work?" with "did the grid rewrite work?" | **Yes** | No |

Converting bar first means the first-ever use of `computeChartLayout` lands simultaneously with a CSS Grid restructure. If the result is wrong, there are two candidate causes. The column pair's defect is a *pure gutter-subtraction* problem — precisely what layout rule 1 exists to fix — with no DOM restructure attached, so a wrong result has exactly one candidate cause.

The bar chart's severity is addressed instead by **T1**, an interim CSS-only fix landing before any refactor, which the audit itself proposes as its step 1 ("assign explicit `grid-column`, or collapse the column to `0px` rather than deleting the element"). That removes the user harm immediately without waiting for the engine, and T8 deletes the interim fix when the engine replaces it.

### 3.3 Recommended order

1. **Column pair** (`clusteredColumnChart` + `columnChart`) — the pilot. T7.
2. **Bar pair** (`clusteredBarChart` + `barChart`) — where the engine earns its keep: deletes `BAR_VALUE_AXIS_INSET`, the grid duplication and T1's interim fix. T8.
3. **Line chart** — last, alone. T10.

Line is last because it is the only family with a **mixed SVG/HTML coordinate space**: `viewBox="0 0 100 100"` with `preserveAspectRatio="none"` inside a box measured at 537×180, a 2.98:1 stretch (audit §4.5). That constraint is load-bearing and undeclared — it already forced markers out of the SVG (`chartMarker`, `VisualPreviews.tsx:147`). Reconciling a real plot rect with a normalised stretched viewBox is a different and harder problem than reconciling one with flex or grid, and it should be attempted only once the engine has two families' worth of evidence behind it.

---

## 4. Hero containment

### 4.1 Where it goes: **before `ChartLayout`**, and split in two

The audit frames the fix as "pass an `outer` rect into one layout engine rather than scaling the output" (§5.2), which reads as *after* `ChartLayout`. **Recommend splitting it, with the first half first.**

Three reasons the containment fix must precede the layout work:

1. **It is the measurement environment.** At 1280×720 the hero clips 303 of 630px with no scrollbar (audit §5.1). Every acceptance measurement in T7–T10 concerns gridline and bar positions — and at the most common laptop width, 266px of plot is rendered but invisible. Doing layout work in an environment where you cannot see what you are measuring, or must remember to only ever measure at ≥1600px, is an unforced error.
2. **It is not a cartesian problem.** Clipping affects all sixteen visuals. Eleven of them will never have a `ChartLayout`, so gating their containment on it strands them.
3. **It is independent.** A fit-to-container scale factor needs the *container's* width and the tile's fixed pre-scale width — both available today, neither requiring a plot rect.

**Part 1 (T2, before the engine):** replace the fixed `transform: scale(1.5)` on `.visual-hero-scale` (`globals.css:775`) with a scale computed from the available width of `.visual-hero-scale-wrap` (`globals.css:766`, currently a hard `width: 630px; height: 510px; overflow: hidden`). The tile stays 420px pre-scale; the factor becomes `min(1.5, available / 420)`. Nothing is clipped at any width, on either axis, and above ~1900px nothing changes at all.

**Both dimensions, not just width.** `transform` does not affect layout sizing — that is why the two-box arrangement exists, and the existing source comment at `globals.css:762–765` says so explicitly. The wrap must therefore reserve the scaled **height** as well as the scaled width, from the same computed factor. Two failure modes follow from getting one of them wrong, and the acceptance criteria must catch both:

- **Reserved height too small** — the scaled hero overflows its wrap and either gets clipped at the bottom or paints over whatever follows it (thumbnails, the filter pane's lower edge, the inspector region).
- **Reserved height too large** — the wrap keeps a footprint computed for a scale factor the hero is no longer using, leaving a large empty band below the hero that reads as a layout bug.

Both are the *same* arithmetic mistake as the horizontal clipping, one axis over.

One asymmetry to note before implementing: `.visual-tile--hero` sets `width: 420px` but **no height** (`globals.css:800`) — the tile's height is content-driven and varies by visual. So the wrap's current `height: 510px` is a hardcoded reservation guessing at the tallest case, not a figure derived from anything. Width can be reserved arithmetically (`420 × factor`); height cannot, and must come from the tile's own measured natural height multiplied by the same factor.

**Part 2 (deferred past this phase):** remove `transform: scale` entirely in favour of passing a real `outer` rect into `computeChartLayout`, which is what finally makes `fontSize: 10.5` render at 10.5px rather than 15.75px. That needs all five charts migrated *and* an answer for the eleven structural visuals, so it belongs to phase 2. **T2 does not attempt it.**

### 4.2 Preserving the stable comparison surface

The product requirement is that the hero does not resize according to auxiliary or supporting content. Two distinctions the executing agent must not conflate:

- **Responding to viewport width is fine.** The hero already occupies a viewport-dependent slot; T2 makes it *fill* that slot instead of overflowing it.
- **Responding to sibling content is not.** Toggling the filter pane, the colour reference, the tooltip callout or (later) any supporting surface must leave the hero's box unchanged.

Audit §6 measured the filter-pane case as already correct — `clientWidth` 630→630, plot width 537 unchanged — and argued it holds by accident rather than by construction. **T2 is where it becomes explicit**: the scale factor must derive from the hero wrap's own available width, never from a measurement of the canvas panel's total content. T9's acceptance criteria then assert it against the newly relocated supporting elements.

---

## 5. Preview composition preparation

Plumbing and preconditions only. **No supporting surface is created in this phase**, per the brief and composition guardrail G4.

Three things are included, each with a sequencing reason beyond "we will want it later":

**5.1 Per-visual extraction (T4).** Already justified in §1.1 — required by T7/T8/T10 regardless of composition.

**5.2 Hoisting per-state resolution out of the renderer (T5).** `VisualGallery` currently receives `themeSource` and calls `resolveActionButtonStyle`, `resolveBookmarkNavigatorStyle` and `resolvePageNavigatorStyle` itself (`VisualPreviews.tsx:922–929`) to re-resolve the hero at the selected interaction state. That is the only resolution call inside the renderer tree. Hoisting it into `ThemeStudio` and passing down already-resolved per-state styles:

- strengthens standing constraint 3 — after T5, `VisualPreviews.tsx` imports no resolver and the `themeSource` prop disappears;
- is the exact plumbing variant surfaces will need (composition design §6.2: "called four times instead of once"), without creating any variant;
- is worth doing on its own merits and is behaviour-neutral.

**5.3 Relocating the two existing ad-hoc supporting elements (T9).** The tooltip callout and interaction-state selector currently render inside `.report-page` (`ThemeStudio.tsx:353` → `VisualPreviews.tsx:856–872`). This is *relocation, not creation* — no new surface, no new target, no `PreviewMap`. The compelling sequencing reason:

> Guardrail G2 — *the primary's bounds are invariant to supporting content* — cannot be asserted while supporting content lives inside the primary's own container. Establishing it **before** T10 means that if the line chart migration later moves the hero's box, the cause is unambiguous.

Deliberately excluded from this phase: `data-preview-target` stamping across the renderer, any `PreviewMap`/`PreviewSurface`/`PreviewComposition` type, the coverage report, the `PreviewInspector` growing any new content, and the `{ primary, supporting }` descriptor shape from composition design step 1. T9 creates the *region*; it stays empty of new things.

One small forward-compatibility allowance: where T7/T8/T10 need a stable selector for a browser-based acceptance check, use a `data-preview-target` attribute with the identifier **already defined** in `PREVIEW_TARGET_DESIGN.md` §3.1 (`plot.dataMarks`, `valueAxis.gridlines`, `valueAxis.tickLabels`, `categoryAxis.tickLabels`). Borrowing four names costs nothing and is forward-compatible; inventing test-only ids would be throwaway.

---

## 6. Regression testing strategy

### 6.1 The constraint that shapes everything: there is no DOM in the test harness

Verified: `npm test` runs `npm run build && node --import tsx --test "tests/**/*.test.ts" "tests/**/*.test.mjs"`. There is **no jsdom, no happy-dom, no Playwright** in `package.json`. All 31 test files (3,215 lines) test pure functions or resolution. `tests/chartParts.test.ts` is the model: it imports `axisTicks`, `insetOffset`, `formatValue`, `labelIsInside` directly from `ChartParts.tsx` and asserts on returned values.

Two consequences the executing agent must internalise:

1. **Do not add jsdom to test layout.** jsdom does not implement layout: `getBoundingClientRect` returns all-zero rects. It cannot answer a single question in this plan. Adding it would produce tests that pass while proving nothing — worse than no test.
2. **Therefore make `computeChartLayout` pure, and put the defects in it.** Five of the seven in-phase audit defects become ordinary node assertions on a pure function, with **zero new dependencies**. This is the strongest argument for the layout engine's design and should drive it: *if a defect cannot be expressed as an assertion about `computeChartLayout`'s output, the engine is not carrying enough responsibility.*

Only genuine on-screen containment needs a real browser. Those become a **documented manual acceptance checklist** run through the Browser pane with `getBoundingClientRect` — the same method the audit used — recorded in the commit message. Adopting Playwright is a phase-2 decision and is explicitly deferred.

### 6.2 Audit defects → regression tests

| # | Audit finding | Test kind | Assertion |
|---|---|---|---|
| 1 | Hidden category axis detaches bars | **pure** | With `categoryAxis.show:false`: `layout.categoryAxis === null`; `layout.plot.x === outer.x`; `layout.plot.width` equals the shown-case width **plus exactly the former gutter**; `scale.value(dataMax) === plot.x + plot.width` |
| 2 | Column baseline 18px above zero gridline | **pure** | `scale.value(0) === plot.y + plot.height` in both axis states; `plot.height + categoryAxis.height + valueAxisTitle.height === outer.height` |
| 3 | Hero clipped below ~1900px | **browser** | at 1280×720: `wrap.scrollWidth === wrap.clientWidth` **and** `wrap.scrollHeight === wrap.clientHeight`; no rendered pixel outside the wrap on either axis; the wrap's reserved footprint equals the scaled tile's rect |
| 4 | Pinned axis range changes labels not bars | **pure** | With `start:0,end:100000` and `dataMax:82000`: `scale.value(82000) < plot.x + plot.width`; and `scale.value(t) ` for each `t` in `scale.ticks` matches the gridline offsets exactly |
| 5 | Value-axis labels reserve zero width | **pure** | `valueAxis.width > 0` when `show`; `layout.plot.width` is smaller by exactly that amount vs `show:false` |
| 6 | No plot rectangle anywhere | **pure** | the engine's existence; plus: no test may compute a plot dimension independently |
| 9 | Hero and thumbnails differ only by scale | **browser** | hero and thumb `plot.width` ratio equals the scale factor, within 1px |
| — | `invertAxis` reverses ticks but not bars | **pure** | `scale.value(0) > scale.value(dataMax)` when inverted; `scale.ticks[0]` corresponds to `scale.value(scale.ticks[0])` at the correct end |
| — | Category-axis gutter sizing | **pure** | gutter width responds to `fontSize` and to the longest category label, and is `0` when `!show` |
| — | Primary bounds invariant to auxiliary content | **browser** | hero `getBoundingClientRect()` identical with filter pane / colour reference / tooltip on and off |

Findings 7 (stacked 62%), 8 (pie geometry) and the trend line are **out of phase** (§9) and get no tests here.

### 6.3 Existing tests that protect this work

| Test file | Protects | Interaction with this plan |
|---|---|---|
| `chartParts.test.ts` | `axisTicks`, `insetOffset`, `formatValue`, `labelIsInside`, `labelVisibleAt`, legend placement, `mapLineStyle` | `axisTicks` behaviour must be **preserved by `scale.ticks`** — port the assertions, do not delete them. `insetOffset`'s test is superseded at T8 and must be *replaced* by the equivalent `scale` assertion in the same commit, never merely removed |
| `properties.test.ts`, `provenance.test.ts`, `layerPrecedence.test.ts`, `stateIdMatching.test.ts`, `interactionStates.test.ts`, `wildcardBucket.test.ts`, `mergeThemeOverBase.test.ts` | Resolution, `$id`, layering, provenance, round-trip | **Must pass unmodified at every commit.** If a task needs one of these changed, the task is wrong |
| The 16 `*Properties.test.ts` files | Each registry's resolved output | Unmodified. T4/T5 must not change a single resolved value |
| `static-output.test.mjs` | Build produces a valid SPA entry point | Unmodified |
| `lineGeometry.test.ts`, `shapeGeometry.test.ts` | Pure path/clip-path geometry | Unmodified — audit §10 says do not touch these |

### 6.4 New unit tests required

One new file, `tests/chartLayout.test.ts`, created at T6 and extended by T7/T8/T10. Minimum coverage:

- **Conservation.** For every input: gutters + plot = outer, on both axes. No overlap, no gap. This single property catches most arithmetic errors.
- **Gutter presence.** Each of `title`, `legend`, `categoryAxis`, `valueAxis` is `null` exactly when its `show` is false, and non-null with positive extent otherwise.
- **Gutter response.** Category-gutter width scales with `fontSize` and with the longest label; value-gutter width scales with the widest formatted tick.
- **Scale identity.** `scale.value(start) ` and `scale.value(end)` land on the plot's two edges, for auto range, pinned range, and inverted.
- **Scale/tick agreement.** For every `t` in `scale.ticks`, `scale.value(t)` lies within `plot` and the set is monotonic (descending when inverted).
- **Category slots.** `scale.category(i, n)` slots tile the plot with `innerPadding` between them and none outside.
- **Orientation symmetry.** The same input with `orientation` flipped produces the transpose — bar and column cannot drift apart again.
- **Legend placement.** All four sides subtract from the correct edge; the eight Power BI placements collapse to four consistently with `legendIsVertical`/`legendIsAfterPlot`.
- **Determinism.** Same input, same output; no reliance on module state (the property that lets it be called N times per frame).

### 6.5 Browser measurements — what and where

Run through the Browser pane against `npm run dev`; record figures in the commit message.

| Viewport | Why |
|---|---|
| **1280×720** | The clipping case. The most common laptop width, and where the audit measured 303px hidden |
| **1440×900** | Common; between the two boundaries |
| **1600×900** | The audit's measured boundary where clipping stops |
| **1920×1080** | The already-correct case — must stay correct |
| **1100px content width** | `.report-surface` has `max-width: 1100px` (`globals.css:403`); the squeeze case for the page itself |

Measure with `getBoundingClientRect()`:

- `.visual-hero-scale-wrap` — `clientWidth` vs `scrollWidth` **and** `clientHeight` vs `scrollHeight` (containment on both axes)
- `.visual-hero-scale-wrap` vs the hero tile — both full rects, to confirm the wrap reserves exactly the scaled footprint and no more
- the first element following the hero wrap — `top` vs the wrap's `bottom` (no overlap, and no artificial gap)
- the hero's plot element — `x`, `width` (does it fit; does it move when it should not)
- each `.chart-gridline` — `x` or `y`, against `scale.value(tick)` computed from the same style
- the data-mark track — `x`, `width`, and whether gridline 0 and gridline N coincide with its two edges
- the value-axis tick container — `width` (finding 5: currently zero)
- the hero tile itself — full rect, before/after toggling filter pane, colour reference and tooltip

Measure with `getComputedStyle()`:

- `.visual-hero-scale` `transform` — confirm the matrix scale factor T2 computes
- `.bar-row` `grid-template-columns` — confirm T8 removed the three-column duplication
- `.column-preview__plot` / `.line-preview__plot` `height` — confirm the fixed heights are gone

**Do not judge any of this from screenshots.** The audit's method — real DOM rects at named viewports — is the standard, and it is what caught defects that looked fine.

---

## 7. Work packages

Eleven tasks. Nine touch three files or fewer. Difficulty is *implementation* difficulty; risk is *chance of silently breaking something*.

---

### T1 — Stop the bar-chart grid collapse (interim)

- **Goal.** Remove audit finding 1 immediately, without waiting for the layout engine.
- **Files.** `app/globals.css` (`.bar-row`), `app/components/VisualPreviews.tsx` (~1051).
- **Approach.** Stop conditional DOM omission being load-bearing for grid placement: keep `.bar-row__label` in the DOM always and hide it when `!categoryAxis.show`, **or** assign explicit `grid-column` to all three children. Prefer whichever leaves `BAR_VALUE_AXIS_INSET` honest in *both* states — note the inset is still wrong when the axis is hidden, so if the label column collapses to `0px`, the constant must be made a function of `show` as a stopgap and marked with a `// removed by ChartLayout` comment.
- **Changes.** With the category axis hidden: bars stay in the same coordinate system as the gridlines. Track width stops collapsing 369px→102px.
- **Must not change.** Anything with the category axis shown — the default state is currently correct and must measure identically. No other visual. No resolution.
- **Accept when.** At 1600×900, with `categoryAxis.show` toggled: gridline 0 x == track left x (±1px) and gridline 4 x == track right x (±1px), **in both states**. Track width differs between states by at most the former label gutter.
- **Depends on.** Nothing.
- **Difficulty / risk.** Low / **Medium** — it is a CSS Grid change under a shared class used by two charts; verify stacked bar too.

---

### T2 — Hero containment: fit-to-container scale

- **Goal.** Nothing rendered is invisible at any supported viewport, on either axis. Establish the measurement environment for everything after.
- **Files.** `app/globals.css` (`.visual-hero-scale`, `.visual-hero-scale-wrap`, `.visual-hero-wrap`), `app/components/VisualPreviews.tsx` (hero branch, ~856).
- **Approach.** Compute `scale = min(1.5, availableWidth / 420)` from the wrap's own width (`ResizeObserver` or a width-driven CSS custom property). Keep the two-box structure — `transform` does not affect layout sizing, so the wrap must reserve the **full scaled footprint in both dimensions**: `420 × factor` wide, and the tile's measured natural height `× factor` tall (§4.1 — the tile has no fixed height). Retire the hardcoded `height: 510px`.
- **Changes.** Below ~1900px the hero renders smaller instead of clipped, horizontally and vertically. `overflow: hidden` stops hiding content. The reserved footprint tracks the factor instead of being fixed.
- **Must not change.** Above ~1900px, nothing at all — the factor stays 1.5 and every rect is identical. The hero must not respond to the filter pane, colour reference or tooltip. Thumbnails untouched.
- **Accept when.** At all five viewports (§6.5), for the tallest hero visual available (Table or Matrix) as well as a chart:
  1. **No horizontal clipping** — `wrap.scrollWidth === wrap.clientWidth`, and the hero tile's rect right edge is at or inside the wrap's.
  2. **No vertical clipping** — `wrap.scrollHeight === wrap.clientHeight`, and the tile's rect bottom edge is at or inside the wrap's.
  3. **Footprint reserved** — `wrap.getBoundingClientRect()` height and width each equal the tile's own rect within 1px. The wrap is neither smaller than what it contains nor larger.
  4. **No overlap** — the first element after the hero has a rect `top` at or below the wrap's `bottom`. Nothing paints over the scaled hero and it paints over nothing.
  5. **No artificial gap** — the vertical distance between the wrap's `bottom` and the next element's `top` equals the intended CSS gap, not a leftover reservation. At 1280×720 this gap must be within a few px of what it is at 1920×1080.
  6. **Bounds stable against auxiliary content** — hero rect byte-identical with the filter pane on vs off, the colour reference on vs off, and the tooltip shown vs hidden, at 1280 and 1920.
  7. At 1920×1080: every measured rect identical to pre-T2.
- **Depends on.** None (T1 recommended first only so the bar chart is worth looking at).
- **Difficulty / risk.** Medium / Medium — it is the most *visible* change in the phase.

---

> ### ■ STOP POINT 1 — after T1 + T2
> The two user-visible fixes are in and nothing has been refactored. **Open the app and look at all sixteen visuals at 1280×720 and 1920×1080.** Toggle the category axis on the bar and stacked bar charts. Toggle the filter pane and colour reference. This is the last moment where the rendered output is trivially attributable, and it is the baseline every later task is compared against. Record the §6.5 measurements now — later tasks diff against them.

---

### T3 — Lift shared preview sample data into a module

- **Goal.** Give the extraction in T4 something to import, and put `dataMax` in one place.
- **Files.** NEW `app/lib/previewSampleData.ts`; `app/components/VisualPreviews.tsx`.
- **Approach.** Move `barCategories`, `barCategoriesMax`, `barPercent`, `stackedSegmentColor`/`stackedSegmentShare`, `linePointValues` and the month labels. Export `BAR_DATA_MAX = 82_000` and `LINE_DATA_MAX = 70_000`, and replace the five literal `dataMax=` props with them.
- **Changes.** Nothing rendered.
- **Must not change.** Every pixel. `stackedSegmentShare` stays 62 — **this task does not fix stacking** (§9).
- **Accept when.** `npm test` green; rendered DOM diff empty at 1920×1080 for all sixteen visuals.
- **Depends on.** T2 (so the diff is taken in a non-clipping environment).
- **Difficulty / risk.** Low / Low.

---

### T4 — Extract the five cartesian previews into components

- **Goal.** Make each chart's conversion a bounded diff.
- **Files.** NEW `app/components/previews/BarChartPreview.tsx`, `StackedBarChartPreview.tsx`, `ColumnChartPreview.tsx`, `StackedColumnChartPreview.tsx`, `LineChartPreview.tsx`; `app/components/VisualPreviews.tsx` (large deletion).
- **Approach.** Pure cut-and-paste. Each component takes exactly its own resolved style plus what §1.2 identified as shared. Move the line chart's ~315 lines of locals (`:1448–1755`) wholesale into its component. Keep every class name, every child order, every comment.
- **Changes.** Nothing rendered.
- **Must not change.** Every pixel; `VisualGallery`'s props; the `descriptors` array's shape; the small-multiples wrapping at `:2817–2836`.
- **Accept when.** `npm test` green; `npm run lint` clean; rendered DOM diff empty at 1920×1080 for the five charts; `VisualPreviews.tsx` drops by roughly 900 lines.
- **Depends on.** T3.
- **Difficulty / risk.** Medium (volume) / **Low** (nothing is rewritten). Do it in one commit — a half-extracted file is harder to review than either end state.
- **Optional follow-up (T4b).** Extract the remaining eleven visuals. Not required by this phase; slot in whenever convenient.

---

### T5 — Hoist per-state resolution out of the renderer

- **Goal.** Remove the last resolver call from the renderer tree, and lay the plumbing variants will need.
- **Files.** `app/components/ThemeStudio.tsx`, `app/components/VisualPreviews.tsx`.
- **Approach.** Move `resolveActionButtonStyle` / `resolveBookmarkNavigatorStyle` / `resolvePageNavigatorStyle` per-state calls (`VisualPreviews.tsx:922–929`) up into `ThemeStudio`, along with the `previewInteractionState` state. Pass resolved styles down. Delete the `themeSource` prop.
- **Changes.** Nothing rendered.
- **Must not change.** The state selector's behaviour; which state thumbnails show (always `default`); every resolved value.
- **Accept when.** `npm test` green (`interactionStates.test.ts` and `stateIdMatching.test.ts` especially); `VisualPreviews.tsx` imports no resolver and no `ThemeSource`; each of the four states renders identically to pre-T5.
- **Depends on.** T4.
- **Difficulty / risk.** Low / Low.

---

> ### ■ STOP POINT 2 — after T3 + T4 + T5
> **Three consecutive commits have claimed zero visual change.** Verify that claim before building on it: open the app, step through all sixteen visuals, and step the action button and both navigators through all four interaction states. If anything looks different, the extraction is wrong — find it now, not after the layout engine is on top of it.

---

### T6 — Add `chartLayout.ts` with tests and no consumers

- **Goal.** Land the engine and its whole test suite before anything depends on it.
- **Files.** NEW `app/lib/chartLayout.ts`; NEW `tests/chartLayout.test.ts`.
- **Approach.** Implement §2.1. Pure; no React, no DOM, no theme JSON; `measureText` injectable, defaulting to `estimateText`. Write the §6.4 suite in full, **including assertions for findings 1, 2, 4, 5 and `invertAxis` phrased against the engine's output** — they should pass here, because the engine is correct even though no chart uses it yet.
- **Changes.** Nothing rendered. Nothing imports the new module.
- **Must not change.** Anything.
- **Accept when.** `npm test` green with the new file's assertions; `chartLayout.ts` imports nothing from `app/components/`; deleting the module breaks only its own test.
- **Depends on.** None strictly — but sequence it here so it is written with the extracted components in view.
- **Difficulty / risk.** **High** (it is the design work) / Low (nothing consumes it).

---

### T7 — Migrate the column pair to `ChartLayout`

- **Goal.** First real conversion; fix finding 2 and finding 5.
- **Files.** `app/components/previews/ColumnChartPreview.tsx`, `StackedColumnChartPreview.tsx`, `app/components/ChartParts.tsx` (`Gridlines`, `AxisTickLabels` gain `rect`/`scale`), `app/globals.css`.
- **Approach.** Call `computeChartLayout` once per chart. Position gridlines, tick labels, columns, labels, reference line and error indicator from `layout.plot` and `layout.scale`. **Route the column heights through `scale.value`, not `barPercent`** — a half-conversion recreates the two-coordinate-system defect. Delete `.column-preview__plot { height: 128px }`, its `margin-top: 22px`, the `.chart-ticks--vertical` zero-width override for column, and `top: "22%"`.
- **Changes.** Column baseline sits exactly on the zero gridline in both axis states. The value-axis gutter has real width and the plot shrinks by it. The reference line lands where its value says.
- **Must not change.** Every appearance property — colour, fill, border, typography, legend, data-label styling. Bar, line, and the other eleven visuals. The stacked 62% split (still a lie; still not this phase).
- **Accept when.** Browser at all five viewports: column baseline y == zero-gridline y (±1px) with the category axis both shown and hidden — the 18px error is gone in the *shown* state. `.chart-ticks--vertical` width > 0. Every gridline y == `scale.value(tick)` computed independently in the console. `npm test` green.
- **Depends on.** T4, T6.
- **Difficulty / risk.** High / **High** — the first conversion; expect the engine to need corrections, and correct the *engine*, not the caller.

---

> ### ■ STOP POINT 3 — after T7
> **The pilot is the decision point for the whole approach.** Look hard at both column charts at all five viewports, with the category axis, value axis, legend, gridlines, data labels and reference line each toggled. Compare side by side against the bar chart, which is still on the old path — the two should now differ visibly in baseline accuracy. If the engine needed more than superficial correction during T7, stop and reconsider its shape before migrating two more families onto it.

---

### T8 — Migrate the bar pair; delete the duplicated inset

- **Goal.** Retire `BAR_VALUE_AXIS_INSET`, the CSS grid duplication and T1's interim fix in one commit.
- **Files.** `app/components/previews/BarChartPreview.tsx`, `StackedBarChartPreview.tsx`, `app/components/ChartParts.tsx` (delete `insetOffset`, `AxisInset`, `NO_INSET`), `app/globals.css` (`.bar-row`, `.bar-row__track`), `tests/chartParts.test.ts` (replace the `insetOffset` test).
- **Approach.** As T7. Bar widths through `scale.value`. Bar thickness from `scale.category(...).size` and `clusteredGapSize`, replacing `.bar-row__track { height: 11px }`. The three-column grid stops being load-bearing: the label column is a layout gutter, not a CSS Grid track.
- **Changes.** Findings 1 and 4 gone by construction. `invertAxis` now reverses the bars, not just the ticks. Pinning `valueAxis.start`/`end` moves the bars.
- **Must not change.** Every appearance property. Column and line. The `.bar-row` *visual* result in the default state — this must measure identically to the T1 baseline.
- **Accept when.** `BAR_VALUE_AXIS_INSET` and `insetOffset` no longer exist anywhere (`grep` clean). `.bar-row` no longer declares a three-column template with a hardcoded 68px. Browser: gridline 0 x == track left x and gridline N x == track right x, **in both axis states**, at all five viewports. With `start:0,end:100000` and the 82 bar: bar right edge is at 82% of the track, not 100%. With `invertAxis`, the longest bar is on the right. `tests/chartParts.test.ts` has an equivalent `scale`-based assertion replacing the deleted one.
- **Depends on.** T7 (do not attempt before the engine has survived one conversion).
- **Difficulty / risk.** High / High.

---

> ### ■ STOP POINT 4 — after T8
> Four of five charts are converted and the headline defect is gone by construction rather than by patch. **Compare bar against column directly** — they are transposes of each other and should now agree on gutters, tick placement and baseline. Toggle both axes on both. Re-run the full §6.5 measurement set and diff against the Stop Point 1 baseline: everything except the deliberate fixes should be unchanged.

---

### T9 — Move the two existing supporting elements out of the report page

- **Goal.** Establish the inspector region and make guardrail G2 assertable — **without creating any new surface.**
- **Files.** `app/components/ThemeStudio.tsx`, `app/components/VisualPreviews.tsx` (`PreviewShell` loses `extraControls` and its two `useState`s), `app/globals.css`.
- **Approach.** A `.preview-inspector` region rendered as a sibling of `.report-surface`, alongside where `PaletteLegend` already sits — Theme Studio's own UI, outside the simulated report entirely. Move the tooltip callout and the state selector into it. Style it as visibly *not* report content (guardrail G9). **The filter pane does not move**: it is genuine Power BI report chrome and correctly sits inside `.report-surface` beside `.report-page` already.
- **Changes.** Both elements appear below the report surface instead of inside the page. The tooltip may become persistent rather than toggled (composition design §6.3) — acceptable here since it is a relocation of existing content, **but if it adds any ambiguity, keep the toggle and defer the change**.
- **Must not change.** The hero's rect, at any viewport, with these elements shown or hidden. What the tooltip and state selector *render* — same markup, same styling, same resolved values. The filter pane's position and behaviour. No new surface, no new target, no `PreviewMap`.
- **Accept when.** Hero `getBoundingClientRect()` identical with the tooltip shown vs hidden and with each interaction state selected, at 1280 and 1920. `.report-page` contains visual tiles and nothing else. `.filter-pane` is still a child of `.report-surface` and a sibling of `.report-page`. `.preview-inspector` is a sibling of `.report-surface`, not a descendant of it. `PreviewShell` no longer holds tooltip state.
- **Depends on.** T5.
- **Difficulty / risk.** Low / Medium — it moves DOM the hero's own CSS currently contains.

---

### T10 — Migrate the line chart to `ChartLayout`

- **Goal.** Complete the cartesian set; reconcile the stretched viewBox with a real plot rect.
- **Files.** `app/components/previews/LineChartPreview.tsx`, `app/globals.css`, possibly `app/lib/lineGeometry.ts` (**only** if the coordinate space genuinely requires it — audit §10 says do not touch it otherwise).
- **Approach.** Compute the layout, then decide the viewBox question deliberately: either keep `0 0 100 100` and map through `scale` at the boundary, or give the SVG the plot's real aspect ratio and drop `preserveAspectRatio="none"`. **Whichever is chosen, write the reason down in the file** — the current constraint is load-bearing and undeclared, and that is what forced markers out of the SVG. Delete `.line-preview__plot { height: 120px }`, its `margin-top: 22px`, and the `.chart-ticks--vertical` override for line.
- **Changes.** Line points, markers and labels share one coordinate system with the gridlines and ticks. The value-axis gutter has real width.
- **Must not change.** Interpolation (Catmull-Rom, step), area paths, `vector-effect="non-scaling-stroke"`, marker shapes, forecast, anomaly band, y2 axis, series labels. `lineGeometry.test.ts` must pass unmodified.
- **Accept when.** Every gridline position == `scale.value(tick)`. Markers are not distorted at any viewport (the current 2.98:1 stretch is why they left the SVG). `npm test` green including `lineGeometry.test.ts`. Full §6.5 measurement set at all five viewports.
- **Depends on.** T7, T8.
- **Difficulty / risk.** **High / Highest in the phase.** If the viewBox question turns out to be larger than expected, stop and write it up rather than pushing through — the other four charts are already converted and the phase is still a success without this one.

---

> ### ■ STOP POINT 5 — end of phase
> All five cartesian charts on one layout engine; hero contained; no duplicated geometry constants. **Full visual pass over all sixteen visuals at all five viewports**, with every axis, legend, gridline, label and line toggle exercised. Re-run the complete §6.5 measurement set and compare against Stop Point 1. Then write the phase up — what the engine cost, what it fixed, what it did not — before opening phase 2.

---

### Dependency summary

```
T1 ──┐
T2 ──┴─▶ [STOP 1] ─▶ T3 ─▶ T4 ─▶ T5 ─▶ [STOP 2] ─▶ T6 ─▶ T7 ─▶ [STOP 3]
                                  │                          │
                                  └──────────▶ T9            └─▶ T8 ─▶ [STOP 4] ─▶ T10 ─▶ [STOP 5]
```

T9 depends only on T5 and can land any time after Stop Point 2 — slot it wherever it fits.

---

## 8. Stop points — summary

| # | After | What to inspect |
|---|---|---|
| 1 | T1 + T2 | Both user-visible fixes; **record the baseline measurements** |
| 2 | T3 + T4 + T5 | Verify three consecutive "zero visual change" claims |
| 3 | T7 | **The go/no-go on the engine's shape** — column pilot vs unconverted bar |
| 4 | T8 | Bar vs column agreement; diff the full measurement set against Stop Point 1 |
| 5 | T10 | Full pass; write the phase up |

Stop Point 3 is the one that matters. The other four confirm; that one decides.

---

## 9. Not in this phase

Each is deliberately deferred, with the reason it must wait.

| Deferred | Why |
|---|---|
| **Preview-target mapping implementation** — `PreviewMap`, bindings, coverage reports, tiers 1–4 | Its own design's §9 sequences it independently. Writing 153 bar-chart bindings against a renderer that is mid-migration means rewriting the `approximate` notes twice. Four target *names* are borrowed as test selectors (§5.3); nothing more |
| **Supporting surfaces** — variants, examples, transient surfaces | Composition design G4/G5. T9 creates an empty region; it stays empty. Action-button variants are the obvious first candidate and belong to the phase after this one |
| **Stacked charts' fixed 62% split** | The largest fidelity lie in the app (audit §7) and genuinely important — but it is a **sample-data** problem, not a layout one. Fixing it during a layout migration confounds the acceptance criteria for both. Audit §9 puts sample data after the engine for exactly this reason |
| **Pie slice geometry; the modern `cardVisual`; donut** | New renderers, not layout. Composition G5 also blocks pie's supporting surfaces behind this |
| **The fixed trend line** (`left:6%; top:18%; rotate(-6deg)`) | Needs a fitted line over real data — a sample-data and statistics concern once `scale` exists. Leave the fiction in place and visible rather than half-fixing it |
| **Constant-line rendering** (57 bar-chart gap properties) | The single largest coverage win available, and it becomes *easy* once `scale.value` exists — which is precisely why it should be the first task of phase 2, not a distraction inside phase 1 |
| **New visual types** | Out of scope |
| **Registry consolidation** | Touches the file the resolver work just stabilised. No renderer benefit |
| **Style presets** | Product feature, unrelated |
| **Theme resolution / import / export changes** | Standing constraints 1 and 2. Nothing in this plan touches `app/lib/properties.ts` or any registry |
| **Playwright or another browser-test dependency** | §6.1 — jsdom cannot answer these questions and Playwright is a large commitment. Use the documented manual checklist this phase and decide in phase 2 with evidence |
| **Removing `transform: scale` from the hero entirely** | §4.1 part 2. Needs all five charts migrated *and* an answer for the eleven structural visuals |

---

## 10. Recommended first task

Hand exactly this to the coding agent once this plan is approved.

> **T1 — Stop the bar-chart grid collapse.**
>
> In `app/globals.css` and `app/components/VisualPreviews.tsx`, remove the defect described in `RENDERER_AUDIT.md` §2.2: hiding a clustered bar chart's category axis moves the bar track into the 68px label column, collapsing it from 369px to 102px and taking it entirely outside the gridline range, because `.bar-row` (`globals.css:1539`) declares three grid columns while `VisualPreviews.tsx:~1051` deletes the first child from the DOM.
>
> Fix it by making grid placement independent of whether the label element exists — either keep `.bar-row__label` in the DOM and hide it when `categoryAxis.show` is false, or assign explicit `grid-column` values to all three children. `BAR_VALUE_AXIS_INSET` (`VisualPreviews.tsx:286`) still cannot see `categoryAxis.show`; if your fix collapses the label column to zero when the axis is hidden, make the inset a function of `show` as a stopgap and mark it `// removed by ChartLayout — see RENDERER_IMPLEMENTATION_PLAN.md T8`.
>
> **This is an interim fix.** T8 deletes it along with the constant. Do not build a layout abstraction here — the smallest change that makes both axis states correct is the right change.
>
> `.bar-row` is shared with the stacked bar chart (`VisualPreviews.tsx:~1155`), so verify both.
>
> **Accept when**, at 1600×900 in the browser, with `categoryAxis.show` toggled both ways on both charts: gridline 0's x equals the bar track's left x within 1px, and the last gridline's x equals the track's right x within 1px. Report both states' measured `x` and `width` for `.bar-row__track-wrap`, `.chart-gridline` and `.bar-row__value`. The category-axis-**shown** state must measure identically to before your change — it is currently correct.
>
> Do not change resolution, registries, the property panel, any other visual, or any appearance property. `npm test` and `npm run lint` must pass. Commit on a branch with the measurements in the commit message.

---

**Scope statement.** Planning only. No application code was modified. Every file:line reference was verified against the working tree at commit `703ba0f`.

