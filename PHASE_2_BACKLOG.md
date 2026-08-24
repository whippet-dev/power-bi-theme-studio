# Phase 2 Backlog

**Status:** live — appended to as phase 2 tasks land.

Phase 1's plan (`RENDERER_IMPLEMENTATION_PLAN.md`) is a frozen record of what
was planned at `703ba0f` and what shipped through T10. It deliberately does not
track phase 2; this does, so that neither document has to claim to be both a
sealed plan and a running list.

## Confirmed while building the constant-line foundation (task 1)

Recorded rather than solved, because each is a *sample-data* problem wearing a
renderer's clothes, and mixing them into a geometry task confounds both.

| # | Item | Why it is not a rendering fix |
|---|---|---|
| 1 | Clustered Bar/Column need representative multi-series fixtures | The clustered layout property (`clusteredGapSize`) has one series to space, so nothing it does is visible. The renderer is ready; the data is not |
| 2 | Line likely needs multi-series data too | Series-level formatting — `customizeSeries`, per-series markers, the legend's second entry — has one series to vary |
| 3 | Legend placement honours the side only, not start/centre/end | `legendIsVertical`/`legendIsAfterPlot` reduce eight positions to two booleans, so `TopCenter` and `TopRight` render identically. Alignment within the side is unrepresented |
| 4 | Sample data should satisfy the conditions under which Power BI actually exposes a feature | Power BI does not offer a legend for a single-series clustered bar at all. A fixture that cannot produce the feature makes its formatting properties unreviewable, and makes coverage numbers claim more than the preview can show |

## Also open from task 1 itself

- `xAxisReferenceLine` and `y1AxisReferenceLine` on all five cartesian charts
  (46 properties). The primitive is built for them; what is missing is a decision
  about what a categorical or date-typed constant-line value means against the
  current fixtures — see `BAR_CHART_PREVIEW_COVERAGE_PILOT.md` §3.5.
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
| Natural-box sizing | **Done** (task 7). The boxes are fixed by design: Power BI's `getVisualViewport` takes a container's authored size as an input and only ever subtracts title, padding and chrome from it, and the bundle has no auto-size-to-content path, so a preview that grew to absorb a font change would hide the very thing it exists to show. What was wrong was the bar chart's constant, not the model: 84 had been back-computed to reproduce a pre-engine plot size against undersized fallback typography, and two later corrections legitimately raised what the gutters spend — text-class inheritance fixing the source of axis typography, then the proven point-to-pixel conversion scaling it by 4/3 — until four rows shared 40.4-42.2 units. Font aliases are not part of that: task 6 measured that they move no ChartLayout value, since `estimateText` ignores `fontFamily`. Now 128, matching the column chart it is the transpose of. Column (128) and Line (150) were re-checked against the same floor and needed no change. `minimumPlotHeight` and `tests/cartesianBoxes.test.ts` hold every shipped base to the rule, so the next typography change fails a test instead of quietly compressing the plot |
| Rasterisation remediation | **Open, unresolved.** Diagnosed in task 2, no solution selected. Untouched by the pilot |
