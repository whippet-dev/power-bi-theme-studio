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
| Clustered Bar pilot | **Done.** 13 typography properties now fall back to a text class instead of `6` / `""` |
| Remaining registries | **Open.** Stacked Bar, Clustered Column, Stacked Column, Line, Table, Matrix, Slicer, Pie, Card still use literals — 53 of the 66 `fontSize → 6` fallbacks. Migrate once the pilot is accepted |
| Font-face alias expansion | **Open.** Power BI expands a primary's `fontFace` through an alias table; the table was not extracted, so the pilot passes the name through verbatim |
| pt → px conversion | **Open, still separate.** Theme font sizes are points; the renderer uses the number as CSS px. Deliberately untouched so this task isolated inheritance from units |
| Natural-box sizing | **Open, now unblocked.** Fixing typography cost the Bar plot 20.25px of height. `BAR_CHART_BOX` needs revisiting *after* inheritance, not before |
| Rasterisation remediation | **Open, unresolved.** Diagnosed in task 2, no solution selected. Untouched by the pilot |
