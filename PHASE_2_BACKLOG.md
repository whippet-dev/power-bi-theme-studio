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
| Clustered Bar pilot | **Done.** 19 property definitions now fall back to a text class instead of `6` / `""` / the palette. Excludes `labels.detailColor` and the data-label title fields, whose roles are unproven |
| Clustered Bar pilot | **Accepted** (task 3) |
| Cartesian rollout | **Done** (task 4). Stacked Bar, Clustered Column, Stacked Column and Line adopted the same proven roles; 84 fallbacks migrated across the five registries. All five now resolve category/value axis labels and titles, legend, main data labels and reference-line label colours from text classes |
| Non-cartesian registries | **Open.** Table, Matrix, Slicer, Pie, Card and the structural visuals still use literals — 12 of the remaining 36 `fontSize → 6`. Their semantic text roles need their own review; do not assume the cartesian mapping transfers |
| Unproven cartesian roles | **Open.** Data-label titles and details, error-bar labels, small-multiple sub-headers, stacked totals, Line series labels and Line's secondary value axis (`y2Axis.sec*`) keep their literals. Power BI's bundle binds no text class to any of them, so each needs evidence before migration |
| Font-face alias expansion | **Open.** Power BI expands a primary's `fontFace` through an alias table; the table was not extracted, so the pilot passes the name through verbatim |
| pt → px conversion | **Open, still separate.** Theme font sizes are points; the renderer uses the number as CSS px. Deliberately untouched so this task isolated inheritance from units |
| Natural-box sizing | **Open, and now the pressing one.** Honest typography costs every cartesian plot real space: Stacked Bar lost 45.14px of width and 18.24px of height, and Column, Stacked Column and Line each lost 24.52px of width and 20.25px of height. Nothing was resized to compensate. Revisit `BAR_CHART_BOX` / `COLUMN_CHART_BOX` / `LINE_CHART_BOX` **after** font units and font aliases settle, since both change the required budget again |
| Rasterisation remediation | **Open, unresolved.** Diagnosed in task 2, no solution selected. Untouched by the pilot |
