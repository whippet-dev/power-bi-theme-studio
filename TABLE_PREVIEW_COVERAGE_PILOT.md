# Table (`tableEx`) — Preview Coverage Pilot

**Date:** 2026-08-18 · **at commit:** `a6433c0` · **READ-ONLY analysis. No code, mapping files, tests or renderer changes were produced.**

Second stress-test of `PREVIEW_TARGET_DESIGN.md` (rev2.1), chosen to exercise the **structural / DOM** family — a visual with no `ChartLayout`, no geometry, and no interaction states. Companion to `BAR_CHART_PREVIEW_COVERAGE_PILOT.md` (cartesian) and `ACTION_BUTTON_PREVIEW_COVERAGE_PILOT.md` (stateful).

Every classification comes from tracing `VisualPreviews.tsx` `tableContent` (lines 1889–1966) and the `.table-preview*` rules in `globals.css`. **No classification is based on a property name appearing in JSX.**

---

## 1. Headline numbers

| Measure | Count | Denominator | % |
|---|---:|---|---:|
| Properties in registry | **73** | — | — |
| — represented (≥1 target) | **37** | 73 | 50.7% |
| — declared non-previewable | **8** | 73 | 11.0% |
| — **gap** | **28** | 73 | 38.4% |
| — unclassified | **0** | 73 | 0% |
| Represented / *previewable* | 37 | 65 | **56.9%** |
| **Gap / *previewable*** | 28 | 65 | **43.1%** |
| Property→target relationships | **39** | — | — |
| — exact | **39** | 39 | **100%** |
| — approximate | 0 | 39 | 0% |
| — indicative | 0 | 39 | 0% |
| **Misleading relationships** | **0** | 39 | 0% |
| Targets carrying `modelFidelity` | **3** | 7 | 42.9% |
| **Misleading targets** | **1** | 7 | 14.3% |

> ### The Table is the strongest possible argument against a single coverage figure
>
> This visual reports **100% exact relationships** — a flawless-looking number — while **43% of its previewable properties render nothing at all**, and its vertical gridlines draw something structurally different from what Power BI draws. Had the design permitted one headline metric, the Table would be the visual most likely to be described as "done".

### Per-group breakdown

| Group | Props | Repr. | Non-prev. | Gap | Rel. | Exact | Approx | Indic. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| columnHeaders | 16 | 9 | 4 | 3 | 9 | 9 | 0 | 0 |
| values | 17 | 10 | 2 | 5 | 10 | 10 | 0 | 0 |
| total | 12 | 9 | 0 | 3 | 9 | 9 | 0 | 0 |
| grid | 13 | 9 | 2 | 2 | 11 | 11 | 0 | 0 |
| columnFormatting | 8 | 0 | 0 | **8** | 0 | 0 | 0 | 0 |
| sparklines | 7 | 0 | 0 | **7** | 0 | 0 | 0 | 0 |
| **Total** | **73** | **37** | **8** | **28** | **39** | **39** | **0** | **0** |

**Two entire groups render nothing** — `columnFormatting` (8) and `sparklines` (7) — accounting for 54% of the gap.

---

## 2. Targets

Seven targets. **None declares a `layoutSlot`** — see §5.1.

| Target | Renderer element | `modelFidelity` |
|---|---|---|
| `table.columnHeaders` | `.table-preview__head` | — |
| `table.bodyCells` | `.table-preview__row` | **approximate / cosmetic** — rows always alternate, so the non-banded case can never be shown (§3.4) |
| `table.rowBanding` | even-index `.table-preview__row` | — |
| `table.totalsRow` | conditional `.table-preview__row` | — |
| `table.gridHorizontal` | `borderBottom` on body rows | **approximate / cosmetic** — body rows only; the header↔first-row and last-row↔totals boundaries are never drawn (§3.6) |
| `table.gridVertical` | `borderRight` on each row | **approximate / misleading** — a single right-edge border per *row*, not separators *between columns* (§3.6) |
| `table.outline` | `.table-preview` border | — |

---

## 3. Traced behaviour by area

### 3.1 Headers — exact, but the header outline is a gap

Nine of sixteen represented, all exact: `backColor`, `fontColor`, `fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `alignment`, `wordWrap`.

`alignment` routes through `mapTextAlign()`, which returns `undefined` for `"Auto"` and so leaves the per-column default alone — the correct Power BI behaviour, not a fallback accident.

**Gap (3):** `outlineColor`, `outlineWeight`, `outlineStyle`. The header row has no border of its own; the only border it carries is `borderRight`, which comes from `grid.gridVertical`. Power BI's header outline is a distinct, renderable feature.

**Non-previewable (4):** `autoSizeColumnWidth`, `customColumnWidth`, `defaultColumnWidth`, `columnAdjustment` — layout-engine concerns with no equivalent in a fixed three-column mock.

### 3.2 Values / cells — exact, with two invisible properties

Ten represented, all exact: `backColorPrimary`, `backColorSecondary`, `fontColorPrimary`, `fontColorSecondary`, `fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `wordWrap`.

**Gap (5):** `backColor` and `fontColor` — the *non-banded* variants. The renderer unconditionally alternates (`index % 2 === 1`), so the single-colour case these two express can never appear. Also `outlineColor`, `outlineWeight`, `outlineStyle` (cell outlines are never drawn).

**Non-previewable (2):** `urlIcon`, `webURL` — need URL-bound data the fixed sample does not have.

### 3.3 Totals — exact, outline missing

Nine represented, all exact, including `totals` (gates the row) and `label` (renders the caption text). **Gap (3):** the same three outline properties.

Worth noting: the totals row receives `rowPadding` but **no gridline border at all**, which is why `table.gridHorizontal` carries a target caveat rather than the totals group carrying a relationship one.

### 3.4 Row banding — a target-level approximation

The renderer bands unconditionally. In Power BI, alternating row colour is a style-preset choice, and a table without it shows one background. Because no registered property controls the banding *toggle*, this is not a relationship defect — it survives with every property set correctly — so it belongs on `table.bodyCells` as `modelFidelity: approximate / cosmetic`.

Cosmetic rather than misleading: a user setting `backColorSecondary` sees exactly the colour they chose on exactly the rows Power BI would band. They are only prevented from previewing the *unbanded* alternative.

### 3.5 Padding and typography — exact, and a clean three-target case

`grid.rowPadding` is applied to **three** elements — the header, every body row, and the totals row. It is the Table's clearest one-property-many-targets case:

```ts
{
  property: "table.grid.rowPadding",
  affects: [
    { target: "table.columnHeaders", representation: "exact" },
    { target: "table.bodyCells",     representation: "exact" },
    { target: "table.totalsRow",     representation: "exact" },
  ],
}
```

It is applied as `${rowPadding}px 8px` — vertical from the property, horizontal fixed at 8px. That matches Power BI, where row padding is vertical only, so it is exact rather than approximate.

**Gap:** `grid.textSize`. Power BI's grid "Text size" sets a table-wide default; the renderer instead reads `columnHeaders.fontSize` and `values.fontSize` independently and never consults it.

### 3.6 Gridlines — the Table's one misleading defect

Both gridline families are driven faithfully by their properties, so all six relationships are **exact**. The defects are in *what the elements are*:

**`table.gridVertical` — misleading.** The border is applied to the **row** element:

```tsx
borderRight: tableStyle.grid.gridVertical
  ? `${...gridVerticalWeight}px solid ${...gridVerticalColor}` : undefined
```

`.table-preview__row` is the container for all three cells, so this draws **one line down the table's right edge per row** — not separators between columns. A user enabling vertical gridlines sees a line, concludes the setting works, and ships a theme whose real output looks structurally different. That is the "could someone ship a wrong theme?" test failing, so: misleading.

**`table.gridHorizontal` — cosmetic.** `borderBottom` is applied to body rows only. The header↔first-row boundary and the last-row↔totals boundary are never drawn. The lines that do appear are the right colour, weight and position; some are simply missing.

### 3.7 Outline — exact, style hardcoded

`grid.outlineColor` and `grid.outlineWeight` drive `.table-preview`'s border faithfully. **Gap:** `grid.outlineStyle` — the border is hardcoded `solid`, so dashed and dotted outlines cannot be shown.

### 3.8 Column formatting — an entire group unrendered

All 8 are `gap`. `tableStyle.columnFormatting` appears **nowhere** in `tableContent`. Per-column background, font colour, alignment, display units and precision are all renderable against a three-column mock; `styleHeader` / `styleValues` / `styleTotal` are the switches deciding which parts the formatting applies to and are blocked on the same missing feature.

### 3.9 Sparklines — an entire group unrendered

All 7 are `gap`, **not** non-previewable. The Matrix preview already renders a sparkline (one of only two SVGs in `VisualPreviews.tsx`), which demonstrates the capability exists in this codebase. Classifying these as non-previewable would be a decision the evidence contradicts.

> **Classification rule applied throughout:** if something *elsewhere in this codebase* demonstrably renders the feature, an absence here is a `gap`, not a `non-previewable`. That is why Table sparklines are a gap while bar-chart multi-series ordering is non-previewable — nothing renders real multi-series data anywhere.

### 3.10 Properties constrained by fixed sample data or DOM structure

| Property | Constraint |
|---|---|
| `values.backColor`, `values.fontColor` | banding is unconditional, so the unbanded case is unreachable |
| all `columnWidth` properties | fixed three-column layout |
| `values.urlIcon`, `values.webURL` | no URL-bound column in the sample |
| `grid.imageHeight`, `grid.imageWidth` | no image column in the sample |
| all `sparklines.*` | no per-row series in the sample |
| all `columnFormatting.*` | no per-column selection model |

---

## 4. Does the model work without `ChartLayout`?

**Yes — cleanly, and this is the pilot's most reassuring result.**

`PreviewTarget.layoutSlot` is optional, and all seven Table targets omit it. Nothing else in the model referenced layout: bindings, fidelity, severity, gaps and non-previewable declarations are all layout-agnostic. The Table needed **no new concept** to be expressible.

That matters beyond the Table. It means the mapping layer can be adopted for the nine structural visuals (Table, Matrix, Slicer, Card, Textbox, Image and the canvas objects) **without waiting for `ChartLayout` at all**, which materially de-risks the migration order in `PREVIEW_TARGET_DESIGN.md` §9.

### 4.1 Is DOM measurement sufficient for highlighting?

**Yes for the Table, with one caveat that is not the Table's fault.**

All seven targets map to a single, contiguous, non-empty block element:

| Target | Element | Measurable? |
|---|---|---|
| `table.columnHeaders` | one `.table-preview__head` | yes |
| `table.bodyCells` | three `.table-preview__row` | yes — union of rects |
| `table.rowBanding` | even-index rows | yes — union of rects |
| `table.totalsRow` | one row, conditional | yes when present |
| `table.gridHorizontal` / `table.gridVertical` | borders on row elements | **borders have no box of their own** |
| `table.outline` | `.table-preview` border | as above |

Gridlines and outlines are CSS *borders*, not elements, so a highlight can only outline the element that carries the border, not the border itself. That is adequate — highlighting the row when the user hovers "horizontal gridlines" is a reasonable affordance — but it is a genuine limit worth recording. Chart gridlines avoid this by being real positioned spans.

The caveat that is not the Table's fault: the hero is `transform: scale(1.5)` inside an `overflow:hidden` slot and is clipped below roughly a 1900px viewport (`RENDERER_AUDIT.md` §5.1). Any DOM-measured rect inherits that. Layout-derived rects avoid it — which structural visuals cannot use. **A highlight overlay must therefore be positioned inside the scaled coordinate space rather than the viewport's**, for structural visuals especially.

---

## 5. Architectural findings

### 5.1 Nothing new was required

The Table introduced **no new type, category or target concept**. Every property fell into `represented` / `non-previewable` / `gap`; every non-previewable fitted the existing seven reasons; `layoutSlot` being optional was sufficient for a layout-free visual.

### 5.2 It confirms fidelity belongs at two levels

The Table is the cleanest possible demonstration of `PREVIEW_TARGET_DESIGN.md` §3.5: **every relationship is exact and the visual still has three imperfect elements, one of them misleading.** A model with only relationship-level fidelity would report the Table as flawless. The two-level split is what makes the vertical-gridline defect sayable at all.

### 5.3 It supports dropping relationship-level `indicative`

Relationship-level `indicative` is **zero** here, as it is for the bar chart after the rev2.1 recount. Two of three pilots now suggest *"presence shown, magnitude not modelled"* is always a statement about an element. See the Action Button pilot for the third data point.

### 5.4 Suggested first renderer fixes

1. **Move vertical gridlines from the row to the cells** — the only misleading defect, and structurally small.
2. **Draw horizontal gridlines on the header and totals boundaries.**
3. **Render `columnFormatting`** — 8 gap properties for one feature.
4. **Honour `grid.outlineStyle`** and the three `outline*` triples on headers/values/totals — 10 gap properties, all trivial.
5. Sparklines (7) — larger, needs sample data.

Items 2–4 alone would move represented/previewable from 57% to about 77%.

---

## 6. Scope statement

Analysis only. No mapping files, renderer changes, tests or UI changes were produced. Counts were derived by enumerating the registry programmatically and classifying each property against a manual code trace; totals cross-check (37 + 8 + 28 = 73 properties; 39 relationships from 37 represented properties, the two extra coming from `grid.rowPadding` affecting three targets).
