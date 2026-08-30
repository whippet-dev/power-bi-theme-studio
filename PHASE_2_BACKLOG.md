# Phase 2 Backlog

**Status:** live — appended to as phase 2 tasks land.

Phase 1's renderer work was planned as a sealed, ordered sequence of tasks and
shipped in full; that plan is not kept, having served its purpose. This document
is the running list for phase 2, appended to as tasks land.

## Confirmed while building the constant-line foundation (task 1)

Recorded rather than solved, because each is a *sample-data* problem wearing a
renderer's clothes, and mixing them into a geometry task confounds both.

| # | Item | Why it is not a rendering fix |
|---|---|---|
| 1 | ~~Clustered Bar/Column need representative multi-series fixtures~~ | **Done** (task 9). Three real series over the same four categories; `clusteredGapSize` implemented as Power BI's band-scale `paddingInner` |
| 2 | ~~Line needs multi-series data too~~ | **Done** (task 9). Three series through one ChartLayout and one pair of scales. `customizeSeries` (`lineStyles.showSeries`) is still unproven and untouched — see row 6 |
| 3 | Legend placement honours the side only, not start/centre/end | `legendIsVertical`/`legendIsAfterPlot` reduce eight positions to two booleans, so `TopCenter` and `TopRight` render identically. Alignment within the side is unrepresented. **Task 9 sharpened the before-state**: every cartesian legend now carries three real entries, so the missing alignment is visible rather than hidden behind a single synthetic item |
| 4 | Sample data should satisfy the conditions under which Power BI actually exposes a feature | **Partly done** (task 9) for the cartesian family: legends, clustered spacing, per-series colour, stacked segments and stacked totals now have data that can produce them. The Desktop *field-binding* question behind this row — whether a Legend field and multiple measures are equivalent — was not settled and remains UNKNOWN |
| 5 | `stackedGapSize` has no rendered effect | Task 9 proved its real behaviour displaces stacked segments along the VALUE axis, and only when `stackedGapExplodes` is on, which this app does not model. It previously had a wrong effect (thinning the whole stack); it now has none. Modelling `stackedGapExplodes` would restore it honestly |
| 6 | `lineStyles.showSeries` ("Customize series") is unproven | Task 9 deliberately did not invent a visual effect for it. Whether it changes rendering, gates a formatting-pane selector, or persists per-series state is UNKNOWN |
| 7 | Gap-property fallback and range fidelity | Power BI's defaults are `clusteredGapSize: 0` and `stackedGapSize: 0`, clamped to 75 (100 when overlapping) and 5 (10 when exploding). This app falls back to 10 and declares a 0-50 editor range. Recorded in task 9, not changed — it is fallback fidelity, not sample data |
| 8 | Line overlays are bound to the primary series | Forecast, anomaly, error bars and the area fill draw against series 0. Which survive a multi-series binding in Desktop is UNKNOWN, so none was replicated across series |
| 8a | Line series labels and data labels are primary-only | Task 9 made every line, marker and legend entry multi-series, but `seriesLabels` still renders one label for series 0 and the point data labels read the primary series. How Power BI's `seriesLabels` behaves under a multi-series binding was not established, so no rule was guessed. **Multi-series series-label behaviour is not complete** |
| 9 | Category density / scrolling | Task 9 kept four bar categories deliberately. More categories would spend the vertical room task 7's floor protects, so scrolling or a density policy is the prerequisite, not a bigger box |

## Also open from task 1 itself

- `xAxisReferenceLine` and `y1AxisReferenceLine` on all five cartesian charts
  (46 properties). The primitive is built for them; what is missing is a decision
  about what a categorical or date-typed constant-line value means against the
  current fixtures. The property-coverage trace behind this row is why the
  primitive was built first: constant lines were the app's single largest
  coverage gap, 57 of the 111 bar-chart properties that should render and did
  not.
- Unbounded numeric properties are edited by a range slider. `NumberControl` has
  no typed-input path, so every numeric property must invent min/max even when the
  schema has none. 51 properties currently share the generator's `-1000..1000`
  fallback, several of them nonsensically.


## Text-class inheritance (task 3)

| Item | Status |
|---|---|
| Text-class resolver (`app/lib/textClasses.ts`) | **Done.** Derivation transcribed from Power BI's own `applyTextClassDefaults`; see `BASE_THEME_DIFFERENTIAL_AUDIT.md` §4.2 |
| Clustered Bar pilot | **Accepted** (task 3) |
| Cartesian rollout | **Done** (task 4). Stacked Bar, Clustered Column, Stacked Column and Line adopted the same proven roles; 84 fallbacks migrated across the five registries. All five now resolve category/value axis labels and titles, legend, main data labels and reference-line label colours from text classes |
| Non-cartesian registries | **Open.** Table, Matrix, Slicer, Pie, Card and the structural visuals still use literals — 12 of the remaining 36 `fontSize → 6`. Their semantic text roles need their own review; do not assume the cartesian mapping transfers |
| Unproven cartesian roles | **Open.** Data-label titles and details, error-bar labels, small-multiple sub-headers, stacked totals, Line series labels and Line's secondary value axis (`y2Axis.sec*`) keep their literals. Power BI's bundle binds no text class to any of them, so each needs evidence before migration |
| Font-face aliases | **Done** (task 6). The complete ten-entry table recovered from Power BI Desktop 2.157.879.0 and applied at the rendering/measurement boundary (`app/lib/fontFamilies.ts`). Raw families stay raw in the editor and the export. Audit §4.5 |
| Non-cartesian font units | **Open.** Every unambiguous theme text size in the preview now converts, but four icon sizes rendered through `font-size` do not — `matrix rowHeaders.expandCollapseButtonsSize`, the calendar and action-button `iconSize`, and `slicer pendingChangesIcon.size`. Their Power BI unit is not established and guessing it would repeat the mistake this task fixed |
| Font units (pt → px) | **Done** (task 5). Proven from Power BI's own `PixelConverter.PxPtRatio = 4/3` and applied at one boundary (`app/lib/fontUnits.ts`). Raw point values stay raw in the editor and the export |
| Natural-box sizing | **Done** (task 7). The boxes are fixed by design: Power BI's `getVisualViewport` takes a container's authored size as an input and only ever subtracts title, padding and chrome from it, and the bundle has no auto-size-to-content path, so a preview that grew to absorb a font change would hide the very thing it exists to show. What was wrong was the bar chart's constant, not the model: 84 had been back-computed to reproduce a pre-engine plot size against undersized fallback typography, and two later corrections legitimately raised what the gutters spend — text-class inheritance fixing the source of axis typography, then the proven point-to-pixel conversion scaling it by 4/3 — until four rows shared 40.4-42.2 units. Font aliases are not part of that: task 6 measured that they move no ChartLayout value, since `estimateText` ignores `fontFamily`. Now 128, matching the column chart it is the transpose of. Column (128) and Line (150) were re-checked against the same floor and needed no change. `minimumPlotHeight` and `tests/cartesianBoxes.test.ts` hold every shipped base to the rule, so the next typography change fails a test instead of quietly compressing the plot. **Superseded for the Bar family** by the authored-size work below: 450 × 250 is chosen from native evidence rather than from the floor, and the floor now checks it rather than derives it. Column (128) and Line (150) are still the boxes described here |
| Rasterisation remediation | **Open, diagnosed and scoped** (task 8). Cause found and it is not geometry: `ChartLayout` tiles the plot exactly and every mark gets an identical CSS height (spread 0.0000 at scales 1.0, 1.25, 1.5, 2.0), but the Bar/Column marks are HTML boxes whose backgrounds Blink pixel-snaps per box, so a fractional slot puts them on different sub-pixel phases and equal heights quantise one apart. Present at natural scale, so the hero transform is not the cause. Line consumes the same geometry but paints in SVG, so the mechanism does not reach it. **PROVEN-RUNTIME:** Power BI's cartesian bundle paints marks as SVG `<rect>` with unrounded `x/y/width/height` and no `shape-rendering` override, and implements no equivalent rounding step. **STRONGLY-SUPPORTED:** SVG's fractional-edge rendering should avoid this mechanism. **UNVERIFIED:** no painted pixel of either product was read, so Power BI's actual bar thickness at a given zoom/DPR is unobserved. Shared-boundary snapping cannot guarantee equal thickness while keeping the present equal fractional slots; a policy forcing equal integer marks and pushing the residual into the gaps is possible but changes the geometry policy and matches neither design. SVG marks are therefore the **best-supported, Power-BI-aligned candidate** rather than a proven fix — a renderer migration across four previews and their labels/borders/error bars, which needs a pixel-verification route this environment lacks. No rounding was added and none should be. Task 7 halved the relative error (11.5% on an 8.7px bar — 5.6% on 17.7px). Evidence pinned by `tests/cartesianRaster.test.ts`; audit §17 |

## Native cartesian fidelity (tasks 10 onward)

Measured against a live Power BI Desktop over CDP — see
`POWER_BI_CARTESIAN_DIFFERENTIAL.md` for the evidence and
`tools/pbi-render-probe/LAB.md` for the lab's safety rules. Everything
below is on main.

| Item | Status |
|---|---|
| Category axis typography | **Done.** The category axis resolves from `smallLightLabel`, proven by mechanism — a 10pt→20pt theme-label experiment moved it — rather than by a fallback that happened to fit |
| Category inner padding | **Done.** `CATEGORY_INNER_PADDING_DEFAULT = 20`, read from Power BI's own spacing control |
| Category outer padding | **Done.** `CATEGORY_OUTER_PADDING = 0.4`; bands sit flush at the step start |
| Category step vs thickness vs width | **Done.** Three distinct quantities: step positions a category, thickness is the band with no inner padding, width is what a mark fills. Treating the positioning band as the mark extent was making every bar too thick |
| Clustered series spacing | **Done.** `clusteredGapSize` as Power BI's band-scale `paddingInner`, in `seriesBands.ts` |
| Browser text measurement | **Done.** Previews measure with canvas metrics; `estimateText` is the node-side fallback only |
| Horizontal category-axis gutter | **Done, and labelled empirical.** `measuredLabelWidth + (2 + 0.375 × labelFontPx) + 9 + (titleFontPx + 5 when shown)`. Three terms are proven; the chart-edge allowance is a fitted compatibility rule (≤0.053px across six font sizes, up to ~1.4px string-dependent residual) |
| Authored size vs presentation size | **Done for the Bar family.** `BAR_CHART_BOX` is the WHOLE visual at 450 × 250; `PresentationScale` applies a uniform down-only CSS transform afterwards and never feeds back into layout. **Column, Stacked Column and Line have not migrated** |
| Renderer-owned legend budgeting | **Done.** One implementation — `legendExtent` in `chartLayout.ts`; `legendBandExtent` adds only pt→px |
| Power BI visual title | **Done.** Drawn inside the authored visual and paid for from its budget via `visualTitleExtent`, with `titleWrap`, heading semantics (`headingAria`) and `spaceBelowTitle` preserved |
| Square cartesian marks | **Done.** The decorative `border-radius` on `.bar-item__fill` and `.column-item__fill` had no resolved property behind it |
| Gridline phantom borders | **Done.** The shared rule starts every edge at zero width, so an edge no renderer sized cannot paint |
| Subtitle | **Open.** Still tile-rendered. It must move with the same authored-budget treatment as the title, preserving `spaceBelowTitleArea` / `spaceAboveSubtitle` / `spaceBelowSubTitle`, and without creating a second chrome owner |
| Native outer insets | **Open.** ~5px container side padding, ~7px far-side plot inset, ~5px bottom padding. Keep these separate from the axis gutters |
| `maxMarginFactor` | **Open.** A per-visual control whose UI/default relationship is proven; the viewport basis for the cap is not. Do not guess it |
| Multi-line title reservation | **Open.** `titleWrap` is honoured as a setting, but the band is reserved for one line and a wrapped title is clipped rather than allowed to steal plot space |
