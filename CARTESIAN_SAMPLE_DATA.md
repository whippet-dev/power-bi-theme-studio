# Cartesian sample data and multi-series rendering

*Phase 2 task 9. Companion to `BASE_THEME_DIFFERENTIAL_AUDIT.md`, which covers
typography and geometry; this covers what the cartesian previews plot.*

---

## 1. What the old fixture claimed

Five charts shared three constants, and three of the five were describing
something they did not draw:

| Fixture | Shape | The fiction |
|---|---|---|
| `barCategories` | 4 categories × **one** value | Clustered Bar and Clustered Column are named for a cluster they did not have |
| `stackedSegmentShare` | a fixed **62%** | Stacked Bar and Stacked Column drew one rectangle with a two-stop gradient. There were no segment values, so the "total" label was the whole bar's single number |
| `linePointValues` | 5 points × **one** series | The legend carried one entry and the series label was the literal string `Applications` |

Consequences that mattered for a theme editor: `clusteredGapSize` had nothing
to space, every legend was one synthetic item, per-series colour could not be
demonstrated, and a stacked total could not be checked against its parts
because there were no parts.

---

## 2. Evidence: what Power BI's renderer actually does

Read from `desktop.CartesianVisuals.min.js`, Power BI Desktop
**2.157.879.0 (26.08)** — the bundle that implements the cartesian family.
(`desktop.min.js` does not: it has no `cartesianChart` or
`mainGraphicsContext` at all.)

### 2.1 Category width — `PROVEN-RUNTIME`

```js
get categoryWidth() {
  return this.categoryAxis.categoryThickness * (1 - this.categoryAxis.innerPaddingRatio);
}
```

The usable width of a category is its slot **after** `innerPadding`. That is
exactly `ChartLayout.scale.category(...).size`, so this app's existing model
was already right, and the two spacings are genuinely different levels:
`innerPadding` separates categories, `clusteredGapSize` separates series
inside one.

### 2.2 `clusteredGapSize` — `PROVEN-RUNTIME`

```js
updateCategoryBandScale() {
  this.categoryBandScale = d3.scaleBand().range([0, this.categoryWidth]);
  if (this.isClusteredOptimized) {
    if (this.activeData.layout.clusteredGapSize) {
      if (this.activeData.layout.clusteredGapOverlaps) {
        this.categoryBandScale.range([0, this.categoryWidth * (1 - clusteredGapSize / 100)]);
      } else {
        this.categoryBandScale.paddingInner(clusteredGapSize / 100);
      }
    }
    this.categoryBandScale.domain(series.map((s) => s.index.toString()));
  } else {
    this.categoryBandScale.domain(["0"]);
  }
}
```

So the answer to "gap, thickness, or both through one band rule?" is **both
through one band rule**: it is the band scale's `paddingInner`. No outer
padding is set, so the cluster spans the whole category width.

Three further facts, all explicit in the same bundle:

- **Defaults are 0**, not 10 or 20:
  `{ stackedGapSize: 0, clusteredGapSize: 0, clusteredGapOverlaps: false, ... }`.
  This app's resolver falls back to 10, which is a separate fallback-fidelity
  question and was left alone here.
- **Clamps**: `clusteredGapSize = Math.min(gap, clusteredGapOverlaps ? 100 : 75)`.
  This app's editor declares a 0–50 range, also left alone.
- **Below two series it is forced off**: `if (D.length < 2) { this.layout.clusteredGapSize = 0; }`.
  Thinning a lone bar by the "space between series" was never Power BI
  behaviour.

The overlap variant is a second rule, where position and thickness disagree on
purpose:

```js
get columnWidth() {
  const e = this.activeData.series.length;
  return e >= 2 && layout.clusteredGapSize > 0 && layout.clusteredGapOverlaps
    ? this.categoryWidth * (1 + (e - 1) * layout.clusteredGapSize / 100) / e
    : this.categoryBandScale.bandwidth();
}
```

Both variants tile the slot exactly, which is what centres a cluster without
an `align` term.

### 2.3 `stackedGapSize` — `PROVEN-RUNTIME`, and it is not what this app drew

A stack is a single band: `categoryBandScale.domain(["0"])`, so its thickness
is the whole `categoryWidth`. `stackedGapSize` never touches it. Its only
geometric effect displaces segments **along the value axis**, and only when
`stackedGapExplodes` is on:

```js
this.layout.stackedGapExplodeStepSize = maxAbsValue * this.layout.stackedGapSize / 100;
// then, per data point:
const a = e.indexFromZeroValue * (e.value < 0 ? -1 : 1) * t.stackedGapExplodeStepSize;
e.position += a;
```

It is clamped to `Math.min(gap, stackedGapExplodes ? 10 : 5)`.

This app previously used it as a **thickness** percentage on the whole stack,
which is wrong in both axis and meaning. The stack now fills its category
band, and `stackedGapSize` has no rendered effect here because
`stackedGapExplodes` is not modelled — recorded as a backlog item rather than
approximated.

### 2.4 Rendering primitive

Marks are SVG `<rect>` with unrounded coordinates — see audit §17. Nothing in
task 9 changes that; bar and column marks remain HTML boxes.

### 2.5 What was not established — `UNKNOWN`

Desktop was read, not driven. The following were **not** determined and no
behaviour here depends on them:

- Whether a Legend field and multiple measures are treated identically for
  clustered series, series colours or data-label binding.
- Which Line overlays (`forecast`, `anomaly`, error bars, secondary axis)
  survive a multi-series binding, and against which series they evaluate.
- What `lineStyles.showSeries` ("Customize series") does — whether it changes
  rendering, gates a formatting-pane selector, or persists per-series state.
  It was left exactly as it was.

---

## 3. The fixture

```ts
type PreviewSeries = { key: string; label: string; values: readonly number[] };
type CartesianFixture = { categories: readonly string[]; series: readonly PreviewSeries[] };
```

### 3.1 Bar and column — 4 categories × 3 series

| | London | North West | Scotland | Wales |
|---|---:|---:|---:|---:|
| Online | 46 | 38 | 29 | 22 |
| Phone | 24 | 19 | 14 | 11 |
| Post | 12 | 9 | 8 | 5 |
| **Total** | **82** | **66** | **51** | **38** |

**Four categories, unchanged.** Task 7 fixed the natural boxes on a legibility
floor; adding categories spends the vertical room a bar chart's rows need and
demonstrates nothing about series. Category density is a separate concern.

**Three series.** Two can be misread as one bar with a lighter end; the third
makes clustering unmistakable. Three still fits: at Classic the measured band
is 9.02px in a 29.09px slot.

**Why these numbers.** The totals are 82, 66, 51 and 38 — the figures this app
plotted as single values before there were series. The stacked charts
therefore still reach the same totals against the same axis. Every row
decreases across categories and every column decreases across series, with no
tie anywhere, so a renderer that reversed the series order or paired a series
with the wrong category produces visibly different numbers rather than a
coincidentally identical picture. A test asserts the no-tie property.

### 3.2 Line — 5 categories × 3 series

| | Jan | Feb | Mar | Apr | May |
|---|---:|---:|---:|---:|---:|
| Online | 42 | 58 | 30 | 68 | 48 |
| Phone | 28 | 34 | 41 | 39 | 52 |
| Post | 15 | 22 | 18 | 26 | 21 |

`Online` keeps the values this chart already drew. The others cross it rather
than shadow it (`Phone` rises through Mar while `Online` dips) and end well
apart — 48, 52, 21 — so right-anchored series labels are separable without a
collision solver.

### 3.3 Maxima — derived, not synchronised by comment

Clustered and stacked genuinely differ, so one shared `BAR_DATA_MAX` could not
survive real series:

| | Rule | Value |
|---|---|---|
| `CLUSTERED_DATA_MAX` | largest **single** value — each series is drawn from the baseline | 46,000 |
| `STACKED_DATA_MAX` | largest **category total** — series accumulate | 82,000 |

`LINE_DATA_MAX` stays 70,000: a pre-existing convention above the fixture's
68, and whether Power BI would round an automatic maximum to it is not
established, so changing it belongs with that question.

The clustered axis visibly re-labels: it now reads 0 / 11.5K / 23K / 34.5K /
46K where it previously ran to 82K.

---

## 4. What was implemented

`app/lib/seriesBands.ts` — pure, orientation-free, series-aware geometry:

- `clusteredSeriesBands({ extent, seriesCount, gapSize, overlaps })` implements
  §2.2 including both variants, the clamps and the below-two-series rule.
- `stackSegments(values)` returns cumulative `{ start, end, value }`.

`ChartLayout` was **not** taught about series, and does not need to be: bands
are computed against `extent: 100`, i.e. percentages of whatever slot the
engine produced. Bar and Column call the identical function with the identical
argument and differ only in which axis they apply it to.

Legends, colours and labels come from the fixture. `seriesColor(palette, i,
primary)` gives series 0 the visual's own resolved `dataPoint.fill` so
single-series meaning is preserved, and later series successive palette
entries — so a swatch means the same series in all five charts.

---

## 5. Verified in the browser

Chromium 148, DPR 1, Classic 2026 and Fluent 2, hero and thumbnail.

- Clustered Bar: **12 marks** (4 × 3). Bands at 0 / 10.01 / 20.04 with size
  9.02 in a 29.09 slot — **0 overlaps, 0 escaping the slot**, run ends 0.03
  from the far edge. Widths 406.62 / 212.13 / 106.05 match 46 : 24 : 12 to
  within 0.1%.
- Clustered Column: 12 marks, same model transposed.
- Stacked Bar: segments abut cumulatively — 660.11→737, 737→777.11,
  777.13→797.17 — and the last endpoint is the total label's number.
- Stacked Column: same, upward.
- Line: **3 SVG paths**; with markers enabled, **15 markers** in three
  colours, five each. The blue series' heights are 40 / 17.1429 / 57.1429 /
  2.85714 / 31.4286 %, which is `(1 - v/70) × 100` for `Online`'s
  42 / 58 / 30 / 68 / 48 exactly; all three series share the category
  positions 10 / 30 / 50 / 70 / 90 %.
- Every legend reads `Online Phone Post`.

**Category gutters, after the label fix below.** Clustered Bar and Stacked
Bar now agree exactly — gutter 98.92, plot 86.2 — as do both column charts
at 111.41 / 43.59. 98.92 is the figure the task 7 audit recorded for this
chart before task 9, so the fix restores it rather than inventing it.

**Containment, both axes.** Zero vertical overflow on every tile, both
bases, hero and thumbnail. Horizontally each thumbnail reports ten
`visual-header__icon` overflows and the Line thumbnail five more from its
secondary-axis tick labels (2.27px). Both are pre-existing: the icons
appear identically on a Card, which task 9 never touched, and the
secondary-axis overflow was reproduced on `main` at the same 2.27px by
checking out the pre-task-9 tree and putting the Line chart in a
thumbnail. Neither is a task 9 regression, and neither is claimed as zero.

---

## 6. A bug this introduced, and how it is guarded

`barCategories` changed from `[string, number][]` to `readonly string[]`.
The old call sites read

```ts
categories: barCategories.map(([label]) => label)
```

which still compiles against strings: destructuring a string yields its
first character, so `"North West"` became `"N"`. Four of the five charts
measured their category axis with single letters while the gutter rendered
the full names — Clustered Column, Stacked Bar, Stacked Column, and two
sites in the task 7 box tests.

Fixed at all five. The guard is semantic rather than a source-string
search, in `tests/lineSeries.test.ts` and `tests/cartesianRender.test.tsx`:
the labels reaching the layout must be the category names, single letters
must produce a measurably narrower gutter (so the assertion is not
vacuous), and the clustered and stacked charts must compute the same
category axis from the same categories.

`tests/cartesianRender.test.tsx` renders the components with
`renderToStaticMarkup` — no DOM, no new dependency — because both of task
9's production bugs were in the wiring rather than in any function the
pure tests call, and neither was visible to them.

## 7. Limitations recorded rather than papered over

1. **`stackedGapSize` now has no rendered effect.** Its proven behaviour needs
   `stackedGapExplodes`, which is not modelled. Previously it had a *wrong*
   effect; this is honest, not a regression, but it is a coverage loss.
2. **Line overlays stay on the primary series.** Forecast, anomaly, error bars
   and the area fill bind to series 0. Which of them survive a Legend binding
   in Desktop is `UNKNOWN` (§2.5), and drawing a forecast on every line would
   assert something unverified.
6. **Line series labels and data labels are primary-only.** `seriesLabels`
   renders one label, for series 0, and the per-point data labels likewise
   read the primary series. Task 9 did **not** establish how Power BI's
   `seriesLabels` behaves under a multi-series binding — whether every
   series is labelled, whether the property survives a Legend field at all,
   or how labels are placed when they collide. Rather than guess a rule,
   the existing single-series behaviour was kept and now uses the real
   series name instead of the literal string `Applications`. **Multi-series
   series-label behaviour is not complete**, and stroke join/cap were made
   consistent across series only because they are visual-level properties
   with no per-series theme address.
3. **`clusteredGapOverlaps` is implemented in the helper** and reachable from
   the theme, but the overlap variant has not been visually reviewed.
4. **Legend alignment is unchanged** and now more visibly wrong: three real
   entries make Start/Center/End's absence obvious where one synthetic entry
   hid it. That is the intended before-state for the next task.
5. **Resolver fallback and range fidelity for the gap properties** — default 0
   vs this app's 10, and the 0–75/0–100 clamps vs the declared 0–50 — are
   recorded here but deliberately untouched.
