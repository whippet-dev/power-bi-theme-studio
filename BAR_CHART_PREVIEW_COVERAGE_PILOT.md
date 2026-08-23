# Clustered Bar Chart — Preview Coverage Pilot

**Date:** 2026-08-18 · **at commit:** `b7ae532` · **READ-ONLY analysis. No code, mapping files, tests or renderer changes were produced.**

Stress-test of the architecture in `PREVIEW_TARGET_DESIGN.md` against the entire real `clusteredBarChart` registry — **297 properties across 15 groups**. Every classification below comes from tracing `VisualPreviews.tsx` `barContent` (lines 1005–1112), the internals of the shared components in `ChartParts.tsx`, and the relevant rules in `globals.css`. **No classification is based on a property name appearing in JSX.**

---

## 1. Headline numbers

Reported with explicit denominators, deliberately not collapsed into one figure.

| Measure | Count | Denominator | % |
|---|---:|---|---:|
| Properties in registry | **297** | — | — |
| — represented (≥1 target) | **153** | 297 | 51.5% |
| — declared non-previewable | **33** | 297 | 11.1% |
| — **gap** (should render, does not) | **111** | 297 | 37.4% |
| — unclassified | **0** | 297 | 0% |
| Represented / *previewable* | 153 | 264 | **58.0%** |
| **Gap / *previewable*** | 111 | 264 | **42.0%** |
| Property→target relationships | **158** | — | — |
| — exact | 149 | 158 | 94.3% |
| — approximate | 9 | 158 | 5.7% |
| — indicative | 0 | 158 | 0% |
| **Misleading relationships** | **4** | 158 | 2.5% |
| Targets carrying `modelFidelity` | **6** | 19 | 31.6% |
| **Misleading targets** | **3** | 19 | 15.8% |

> **Recount note (rev2.1).** These figures were revised after `PREVIEW_TARGET_DESIGN.md` §3.5 fixed the boundary between relationship fidelity and target model fidelity. Two verdicts moved *from* relationships *to* elements — `plotArea.transparency` and `error.barWidth` — because the defect survives with the property set correctly. Relationship-level `indicative` fell to zero as a result (see §5.3). No classification was changed to make numbers agree; the property-level totals (153/33/111) are unaffected.

> **The 93.0% "exact relationships" figure is the flattering one and must never be headlined.** It is high only because relationships exist solely where a property already renders. The honest headline is the pair: **58% of previewable properties are represented at all**, and **42% have no rendering path**.

### Per-group breakdown

| Group | Props | Repr. | Non-prev. | Gap | Rel. | Exact | Approx | Indic. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| dataPoint | 9 | 8 | 1 | 0 | 9 | 9 | 0 | 0 |
| categoryAxis | 37 | 16 | 8 | **13** | 17 | 15 | 2 | 0 |
| valueAxis | 34 | 26 | 4 | 4 | 29 | 26 | 3 | 0 |
| legend | 11 | 10 | 1 | 0 | 10 | 9 | 1 | 0 |
| labels | 58 | 40 | 8 | 10 | 40 | 37 | 3 | 0 |
| plotArea | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 |
| error | 24 | 6 | 2 | **16** | 6 | 6 | 0 | 0 |
| trend | 11 | 5 | 3 | 3 | 5 | 5 | 0 | 0 |
| referenceLine | 23 | 5 | 1 | **17** | 5 | 5 | 0 | 0 |
| xAxisReferenceLine | 23 | 0 | 0 | **23** | 0 | 0 | 0 | 0 |
| y1AxisReferenceLine | 23 | 0 | 0 | **23** | 0 | 0 | 0 | 0 |
| zoom | 11 | 10 | 1 | 0 | 10 | 10 | 0 | 0 |
| smallMultiplesLayout | 17 | 15 | 0 | 2 | 15 | 15 | 0 | 0 |
| subheader | 10 | 10 | 0 | 0 | 10 | 10 | 0 | 0 |
| layout | 5 | 1 | 4 | 0 | 1 | 1 | 0 | 0 |
| **Total** | **297** | **153** | **33** | **111** | **158** | **149** | **9** | **0** |

**41% of the entire gap is two groups**: `xAxisReferenceLine` and `y1AxisReferenceLine` (46 properties) have **zero** references anywhere in the component tree — verified by direct search, not inferred.

---

## 2. Targets used

19 targets are declared, of which six carry a **target-level** fidelity caveat not attributable to any single property; three of those are misleading. `categoryAxis.gridlines` is deliberately **not** declared — no element emits it, so its 8 properties are `gap` and declaring the target would only create an `unboundTarget`.

Model fidelity is assigned by the rule in `PREVIEW_TARGET_DESIGN.md` §3.5: **does the defect survive with every property set correctly?** If it vanishes when the user leaves a property alone, it belongs to the relationship, not the element.

| Target | Renderer element | `modelFidelity` |
|---|---|---|
| `categoryAxis.tickLabels` | `.bar-row__label` | — |
| `categoryAxis.title` | `.chart-preview__axis-title--rotated` | — |
| `categoryAxis.gutter` | `.bar-row` grid column 1 | — *(correct while `show` is true; the defect is the `show → gutter` relationship, §3.1)* |
| `valueAxis.tickLabels` | `AxisTickLabels` | — |
| `valueAxis.title` | `.chart-preview__axis-title--value` | — |
| `valueAxis.gridlines` | `Gridlines` | — *(misalignment is caused by `categoryAxis.show`, not by this element)* |
| `plot.dataMarks` | `.bar-row__fill` | — *(bars model bars; the scale defect is the `start`/`end`/`invertAxis` relationships)* |
| `plot.dataLabels` | `DataLabel` | — |
| `plot.background` | `.chart-preview` | **approximate / misleading** — the bound element is the *entire visual*, including legend and both axes. Wrong regardless of any property value. |
| `plot.referenceLine` | `.chart-preview__reference-line` | **approximate / misleading** — pinned at `left:65%`, and not on the gridline scale, so it cannot be read against the axis in any state. |
| `plot.trendLine` | `.chart-preview__trend-line` | **indicative / misleading** — a fixed `-6deg` diagonal at `top:18%`, sloping against ascending data. |
| `plot.errorBars` | `.bar-row__error` | **indicative / cosmetic** — a fixed block on the first category, not a ± range. |
| `legend.items` / `legend.title` | `ChartLegend` | — |
| `zoom.categorySlider` | `ZoomSliders` | **indicative / cosmetic** — decorative; does not zoom the plot. |
| `zoom.valueSlider` | `ZoomSliders` | **indicative / cosmetic** — as above. |
| `smallMultiples.grid` / `smallMultiples.title` | `SmallMultiplesGrid` | — |

**6 of 19 targets carry `modelFidelity`; 3 are misleading.**

---

## 3. The specifically-investigated behaviours

### 3.1 Axis show/hide and gutter — **MISLEADING, most severe**

`bar.categoryAxis.show` has **two** relationships with **different** fidelity:

| Relationship | Fidelity | Severity |
|---|---|---|
| → `categoryAxis.tickLabels` | exact | — |
| → `categoryAxis.gutter` | approximate | **misleading** |

`VisualPreviews.tsx:1051` omits `.bar-row__label` from the DOM. `.bar-row` still declares `grid-template-columns: 68px minmax(80px,1fr) 28px`, so the track auto-flows into column 1 (68px) and the value label into column 2. Meanwhile `BAR_VALUE_AXIS_INSET` (`VisualPreviews.tsx:286`) is a module constant that hand-duplicates that CSS and cannot see `show`.

Measured (`RENDERER_AUDIT.md` §2.2): the track collapses 369px → 102px and lands entirely *outside* the gridline range 354–723. **The bars and the value axis stop overlapping at all.**

Why misleading rather than cosmetic: a user hiding the category axis sees bars whose lengths no longer correspond to the axis beside them. Any judgement made about the theme in that state is invalid.

### 3.2 Axis start/end vs data-mark scaling — **MISLEADING**

`axisTicks()` (`ChartParts.tsx:124`) honours `axis.start` / `axis.end`. `barPercent()` (`VisualPreviews.tsx:949`) scales against `barCategoriesMax` — the hardcoded sample maximum — and **never consults the axis**.

| Relationship | Fidelity | Severity |
|---|---|---|
| `valueAxis.start` → `valueAxis.tickLabels` | exact | — |
| `valueAxis.start` → `plot.dataMarks` | approximate | **misleading** |
| `valueAxis.end` → `valueAxis.tickLabels` | exact | — |
| `valueAxis.end` → `plot.dataMarks` | approximate | **misleading** |

Pin the axis to 0–100K and the labels read 100K while the 82 bar still reaches 100%. **The chart displays a scale its own data does not obey.** This is the single clearest case for per-relationship fidelity: one property, two targets, opposite verdicts.

### 3.3 Invert axis — **MISLEADING (value axis) / gap (category axis)**

- `valueAxis.invertAxis` → `valueAxis.tickLabels`: **exact** — `axisTicks` reverses the array.
- `valueAxis.invertAxis` → `plot.dataMarks`: **misleading** — bars still grow left-to-right. The axis reads right-to-left while the data does not.
- `categoryAxis.invertAxis`: **gap** — never read; category order is unchanged.

### 3.4 Plot area transparency — **MISLEADING**

`VisualPreviews.tsx:1008` applies `opacity: 1 - transparency/100` to `.chart-preview` — the element that contains the legend, both axes and their titles. Power BI's plot-area transparency affects the plot background only.

A user setting this to 50 sees the legend and axis labels fade and will conclude their theme does that. It does not.

**[rev2.1] This is a target-level defect, not a relationship one.** The property faithfully drives the element it is bound to, so `plotArea.transparency → plot.background` is **exact**; the element bound to `plot.background` is simply the wrong one — `.chart-preview` is the entire visual — and that is true regardless of the value. Severity **misleading**, though less damaging than §3.1–3.3 because no data relationship is falsified.

### 3.5 Constant/reference lines — **CLOSED for `referenceLine` (phase 2 task 1)**

**Original finding (rev1, kept for the record).** `bar.referenceLine.value` was
never read; the line was pinned at `left: 65%` (`VisualPreviews.tsx:1029`). Worse,
65% was measured against `.chart-preview__plot`, which includes both label gutters,
whereas gridlines were inset by `BAR_VALUE_AXIS_INSET` — the reference line was not
even on the same scale as the gridlines, so it could not be read against the axis in
any state.

- Represented: `show`, `lineColor`, `style`, `transparency`, `width` (5, all exact)
- Non-previewable: `autoScale` (1)
- **Gap: 17** — `value`, `position`, `displayName`, `dashArray`, `dashCap`, all 7 `dataLabel*`, all 5 `shade*`

**Before-state re-audit (phase 2 task 1).** Phase 1 changed this and the old count
must not be copied forward. T7/T8 put `value` through `valueFraction(layout, value)`,
so it moved from gap to represented and the 65% lie is already gone:

- Represented: 6 — the five above plus `value`
- Non-previewable: 1 — `autoScale`
- **Gap: 16** — `position`, `displayName`, `dashArray`, `dashCap`, 7 `dataLabel*`, 5 `shade*`

**After (phase 2 task 1).**

| Classification | Count | Properties |
|---|---:|---|
| Represented | **23** | all of them |
| Non-previewable | 0 | — |
| Gap | **0** | — |

`autoScale` was reclassified from non-previewable to represented. "Automatically
adjust the spacing between dashes and dots based on line width" is a visible
difference, not an engine behaviour: the dash pattern is multiplied by the line
width, so a thick dashed line gets proportionally longer dashes instead of a dense
scribble. Verified at width 4 — `4 2 1 2` becomes `16 8 4 8`.

Geometry comes from `layout.scale.value` alone. Shading, the label and the line
share one coordinate, `position` selects a real DOM paint slot rather than an
opacity trick, and `dashArray`/`dashCap` are honoured exactly because the line is
drawn as SVG rather than a CSS border. See `app/lib/constantLine.ts` for the pure
half and `ConstantLine` in `ChartParts.tsx` for the drawing half.

**Still open.** `xAxisReferenceLine` (23) and `y1AxisReferenceLine` (23) remain at
**zero** references, so constant lines still account for **46 of the 111** gap
properties. They were deliberately not implemented in the same task: the three
groups are not interchangeable. `xAxisReferenceLine.value` is a `textProp` whose
schema description is "numeric or date time value according to x-axis type", and on
a clustered bar the X axis is the *value* axis while Y is the *category* axis (the
registry's own `zoom.showOnValueAxis` is labelled "Show zoom on X axis"). Rendering
a categorical or date-typed constant line means deciding what a date means against
this preview's four region categories — a sample-data question, not a geometry one.
### 3.6 Trend line — **MISLEADING**

`globals.css:1588` fixes it at `left:6%; right:6%; top:18%; transform: rotate(-6deg)`. It is a decorative diagonal with no relationship to the plotted values, and it slopes *downward* regardless of the data, which happens to ascend.

Colour, width, style and transparency are exact; the element is a fiction. It looks like a fitted trend line, which is precisely why it is misleading rather than indicative.

Gap: `dashArray`, `dashCap`, `displayName` (3). Non-previewable: `autoScale`, `combineSeries`, `useHighlightValues` (3).

### 3.7 Error bars — **indicative, cosmetic**

Rendered only on `index === 0`, as a fixed-height block at `left: barPercent(value)` — a marker at the bar's end, not a ± range.

- Represented: `enabled`, `barShow`, `barColor`, `barBorderSize`, `barBorderColor`, `barWidth` — **all six exact [rev2.1]**. `barWidth` genuinely drives the indicator's height; the fact that the indicator is not a ± range is a property of the *element*, recorded once as `plot.errorBars` `modelFidelity: indicative/cosmetic`, rather than smeared across six relationships.
- **Gap: 16** — `barMatchSeriesColor`, all 12 `label*`, all 3 `marker*`
- Non-previewable: `tooltipShow`, `tooltipFormat` (behavioural)

Cosmetic rather than misleading: it reads as "error bars are on", which is true. It does not assert a false magnitude, because it asserts none.

### 3.8 Zoom sliders — **indicative, cosmetic**

All 10 rendered properties are exact *for the slider widget* — size, position, min/max text. The slider does not zoom the plot. Honest as an indicator of "a slider will appear here". `showTooltip` is non-previewable.

### 3.9 Gridlines — exact, but only in the default state

The six `valueAxis.gridline*` properties `Gridlines` consumes are all exact. `gridlineAutoScale` and `gridlineDashCap` are **gaps** — `Gridlines` reads neither.

**All 8 `categoryAxis.gridline*` properties are gaps.** `barContent` makes exactly one `Gridlines` call, passing `valueAxis`. The line chart makes two (`VisualPreviews.tsx:1774–1775`), which proves the capability exists and this is an omission, not an impossibility.

Alignment itself is correct in the default state (measured: gridline 0 at 354 = track left, gridline 4 at 723 = track right) and destroyed by §3.1.

### 3.10 Data labels — exact, with three cosmetic approximations

40 of 58 represented; 37 exact. `DataLabel` genuinely models all three parts (Title/Value/Detail) with independent typography, transparency, units and precision.

| Approximate | Why | Severity |
|---|---|---|
| `labelPosition` | `labelIsInside()` collapses InsideEnd / InsideCenter / InsideBase / OutsideEnd into two | cosmetic |
| `labelContainerMaxWidth` | Applied as `max-width`, but the label sits in a fixed 28px grid column, so values above ~28 never bind | cosmetic |
| `labelDensity` | `labelVisibleAt()` thins by a modulo heuristic over 4 sample categories | cosmetic |

Two subtle gaps found only by reading `DataLabel`: **`titleLabelDisplayUnits` and `titleLabelPrecision` are never used** — the title part renders the raw `category` string, not `formatValue(...)`. A naive scan would have marked these represented because sibling `detailLabel*` equivalents are used.

Also gaps: all 8 format-string properties (`valueFormatString`, `valueCustomFormatString`, and the `title*`/`detail*` equivalents) — genuinely renderable, simply unimplemented.

### 3.11 Legend — exact bar one cosmetic approximation

9 of 10 exact. `legend.position` is approximate/cosmetic: `legendIsVertical()` and `legendIsAfterPlot()` reduce Power BI's eight placements to four behaviours, so `TopLeft` and `TopCenter` render identically. `showGradientLegend` is non-previewable (needs a gradient measure).

### 3.12 Properties constrained by hardcoded geometry or sample data

| Property | Constraint |
|---|---|
| `labels.labelContainerMaxWidth` | fixed 28px value column |
| `categoryAxis.innerPadding` | applied as a flex `gap: N%` resolving against plot height, not the category slot |
| `error.*` | drawn on `index === 0` only |
| `referenceLine.*` | pinned at `left: 65%` |
| `trend.*` | pinned at `top: 18%`, `rotate(-6deg)` |
| `layout.seriesOrder*`, `clusteredGapOverlaps*` | single-series sample (declared non-previewable) |
| `legend.showGradientLegend` | no gradient measure in the sample |
| all `valueAxis` scale properties | `dataMax = 82_000` hardcoded at three call sites |

---

## 4. Full classification index

Sufficient to audit every one of the 297. Properties are exact unless noted.

**dataPoint (9)** — `fill` → `plot.dataMarks` **and** `legend.items` (2 relationships, both exact); `fillTransparency`, `borderColor`, `borderColorMatchFill`, `borderShow`, `borderSize`, `borderTransparency`, `borderOutlineOnly` exact. *Non-previewable:* `defaultColor` (schema-duplicate of `fill`).

**categoryAxis (37)** — *Exact (15 rel):* `show`→tickLabels, `bold`, `fontFamily`, `fontSize`, `italic`, `labelColor`, `underline`, `showAxisTitle`, `titleBold`, `titleColor`, `titleFontFamily`, `titleFontSize`, `titleItalic`, `titleText`, `titleUnderline`. *Approximate:* `show`→gutter (**misleading**, §3.1); `innerPadding` (cosmetic). *Non-previewable (8):* `axisType`, `concatenateLabels`, `end`, `labelDisplayUnits`, `labelPrecision`, `start` (scalar-axis settings on a categorical axis), `logAxisScale`, `roundRange`. *Gap (13):* `axisStyle`, `invertAxis`, `maxMarginFactor`, `preferredCategoryWidth`, `switchAxisPosition`, and all 8 `gridline*`.

**valueAxis (34)** — *Exact (26 rel):* `show`, `bold`, `fontFamily`, `fontSize`, `italic`, `labelColor`, `labelDisplayUnits`, `labelPrecision`, `underline`, `showAxisTitle`, `start`/`end`/`invertAxis` → tickLabels, 6 `gridline*` (`Show`, `Color`, `Style`, `Thickness`, `Transparency`, `DashArray`), 7 `title*`. *Approximate, all **misleading** (3):* `start`, `end`, `invertAxis` → `plot.dataMarks`. *Non-previewable (4):* `logAxisScale`, `roundRange`, `scaleToFit`, `sharedAxis`. *Gap (4):* `axisStyle`, `switchAxisPosition`, `gridlineAutoScale`, `gridlineDashCap`.

**legend (11)** — *Exact (9):* `show`, `bold`, `fontFamily`, `fontSize`, `italic`, `labelColor`, `underline`, `showTitle`, `titleText`. *Approximate:* `position` (cosmetic). *Non-previewable:* `showGradientLegend`.

**labels (58)** — *Exact (37)* across Value/Title/Detail/Background. *Approximate (3, all cosmetic):* `labelPosition`, `labelContainerMaxWidth`, `labelDensity`. *Non-previewable (8):* `optimizeLabelDisplay`, `showAll`, `showByDefault`, `showSeries`, `showBlankAs`, `showDynamicLabels`, `detailShowBlankAs`, `titleShowBlankAs`. *Gap (10):* `valueFormatString`, `valueCustomFormatString`, `titleFormatString`, `titleCustomFormatString`, `titleContentType`, `detailFormatString`, `detailCustomFormatString`, `detailContentType`, **`titleLabelDisplayUnits`, `titleLabelPrecision`**.

**plotArea (1)** — `transparency` → `plot.background`, approximate, **misleading** (§3.4).

**error (24)** — *Exact (5):* `enabled`, `barShow`, `barColor`, `barBorderSize`, `barBorderColor`. *Indicative:* `barWidth`. *Non-previewable (2):* `tooltipShow`, `tooltipFormat`. *Gap (16):* `barMatchSeriesColor`, 12 `label*`, 3 `marker*`.

**trend (11)** — *Exact (5):* `show`, `lineColor`, `style`, `transparency`, `width`. *Non-previewable (3):* `autoScale`, `combineSeries`, `useHighlightValues`. *Gap (3):* `dashArray`, `dashCap`, `displayName`. Target **misleading** (§3.6).

**referenceLine (23)** — *Exact (5):* `show`, `lineColor`, `style`, `transparency`, `width`. *Non-previewable:* `autoScale`. *Gap (17):* `value`, `position`, `displayName`, `dashArray`, `dashCap`, 7 `dataLabel*`, 5 `shade*`. Target **misleading** (§3.5).

**xAxisReferenceLine (23), y1AxisReferenceLine (23)** — **all 46 gap.** Zero references in the component tree.

**zoom (11)** — *Exact (10).* *Non-previewable:* `showTooltip`. Targets indicative (§3.8).

**smallMultiplesLayout (17)** — *Exact (15).* *Gap (2):* `layoutType`, `gridLineType`.

**subheader (10)** — *Exact (10).* The only group with complete exact coverage.

**layout (5)** — *Exact (1):* `clusteredGapSize`. *Non-previewable (4):* `clusteredGapOverlaps`, `clusteredGapOverlapReverse`, `seriesOrderReversed`, `seriesOrderSorted` (single-series sample).

---

## 5. Answers to the six review questions

### 5.1 Did the architecture survive contact with the real registry?

**Yes, with one structural addition and two refinements** — all made *because* of the pilot, not in anticipation of it.

Confirmed working: property→target as the unit of record; multiple properties → one target (16 properties style `categoryAxis.tickLabels`); one property → multiple targets (5 cases); declarative non-previewable reasons (all 33 fell into the existing seven, none needed an eighth).

### 5.2 What the model could not express naturally

**(a) "Should render, doesn't" had no home.** This is the important one. The original design forced every property to be either *bound* or *non-previewable*, with `unclassified` as a test failure. **111 properties (42% of previewable) are neither.** `xAxisReferenceLine.value` is not non-previewable — it is perfectly renderable and simply is not rendered.

Adopting the design as written would have forced a choice between 111 dishonest `non-previewable` declarations or a permanently failing tier-1 test. Both destroy the tool's value. **`gap` must be a first-class category** — a tracked, acknowledged absence, distinct from an unreviewed one.

**(b) Fidelity sometimes belongs to the target, not the relationship.** `error.barColor` → `plot.errorBars` is genuinely exact: the indicator really is that colour. But the indicator is not an error bar. Recording this only per-relationship forces either a lie ("exact") or smearing the caveat across all six error relationships, which loses the information that the colour binding works. The element needs its **own** fidelity, stated once.

The same applies to `plot.trendLine`, `plot.referenceLine`, `plot.background` and both zoom sliders — six of 19 targets.

**(c) A target with bindings but no renderer.** `categoryAxis.gridlines` has 8 properties that *should* bind to it, and no renderer emits it. The design's `unboundTargets` check finds targets with no bindings — the reverse. Tier 3 (emission) catches this, which is a point in the design's favour, but the pilot shows it will fire on day one rather than being a rare regression guard.

### 5.3 Classification categories that should change

| Change | Reason |
|---|---|
| **Add `gap`** | §5.2(a). Non-negotiable. |
| **Add target-level `modelFidelity`** | §5.2(b). |
| **Add `severity: cosmetic \| misleading`** | 4 misleading vs 5 cosmetic relationships — averaging them would be useless. |
| **`indicative` may belong only at target level** | **[rev2.1]** Once the §3.5 rule is applied properly, relationship-level `indicative` falls to **zero** for this visual, while three targets need it. The hypothesis worth testing on the other pilots: *"presence shown, magnitude not modelled"* is always a statement about an element, never about one property's effect on it. If Table and Action Button agree, `Representation` should drop to `exact | approximate` and `indicative` should live only on `modelFidelity`. |
| **Do not** add reasons | All 33 non-previewable fitted the existing seven. |

### 5.4 Is target granularity right?

**Broadly yes.** 19 targets for 297 properties — roughly 8 properties per target, and the largest cluster (16 → `categoryAxis.tickLabels`) is genuinely one thing a user points at.

Two adjustments the pilot forced:

- **`categoryAxis.gutter` must exist** even though it renders no pixels of its own. It is a *layout* target — the space the axis reserves. Without it, `categoryAxis.show`'s most serious defect is inexpressible. This is the clearest evidence that targets must be able to name layout regions, and it ties directly to `ChartLayout`.
- **`plot.background` must be separate from `plot.dataMarks`**, or `plotArea.transparency`'s wrong-element defect cannot be stated.

Nothing was too fine. I considered splitting `plot.dataMarks` per series and rejected it: theme properties address series *collections*, not individual marks.

### 5.5 Does the pilot change the architectural recommendation?

**It strengthens it, and it sharpens the sequencing.**

The pilot found four misleading behaviours I would not have prioritised from the audit alone — `referenceLine.value` being ignored, the reference line not sharing the gridline scale, `plotArea.transparency` fading the wrong elements, and `titleLabelDisplayUnits`/`titleLabelPrecision` being silently dead. Each took line-level tracing. That is the argument for the mapping layer in one sentence: **these facts are expensive to discover and free to maintain once written down.**

It also changes one recommendation. `PREVIEW_TARGET_DESIGN.md` §9 proposed the mapping as step 1–4 and renderer work later. The pilot shows **57 of 111 gap properties are constant lines** — a single renderer feature would move coverage from 58% to 79%. Writing 57 `gap` declarations first is still worth it (it is how the number becomes visible), but the mapping should not be presented as blocking that work.

### 5.6 Ordered list of misleading behaviours to fix first

Ranked by whether a user could ship a wrong theme because of them.

1. **Hidden category axis detaches bars from the value axis** (§3.1). Catastrophic and silent. *Layout architecture.*
2. **`valueAxis.start`/`end` ignored by bar geometry** (§3.2). The chart displays a scale it does not obey. *Property mapping + `ChartLayout.scale`.*
3. **`referenceLine.value` ignored; line not on the gridline scale** (§3.5). A constant line that cannot be read against the axis is worse than none. *Renderer + layout.*
4. **`invertAxis` reverses labels but not bars** (§3.3). Same root cause as 2; fixed by the same `scale`. *Property mapping.*
5. **Trend line is a fixed decorative diagonal** (§3.6). Looks like a fitted line; slopes against the data. *Renderer + sample data.*
6. **`plotArea.transparency` fades legend and axes** (§3.4). Cheapest fix on the list — move the opacity to the plot element. *Renderer polish.*

Items 1, 2 and 4 share one root cause and one fix: route bar geometry through a computed `ChartLayout.scale.value`. That single change resolves half the misleading list.

---

## 6. Scope statement

This document is analysis only. No mapping files were created, no renderer changed, no tests added, no UI touched. Counts were produced by enumerating the registry programmatically and classifying each property against a manual code trace; the arithmetic is internally cross-checked (represented + non-previewable + gap = 297; exact + approximate + indicative = 158).
