# Base-theme differential and rendered-geometry audit

**Phase 2, task 2 · diagnostic only · at commit `7078395` (main through `8cb4803`)**

Why does the same imported theme render a materially different Clustered Bar
under Classic 2026 and Fluent 2 (Preview)? And why do the four Fluent bars look
unequal in thickness when the layout engine gives every category an identical
slot?

Both questions are answered below with measurements. **No production behaviour
was changed by this task.**

---

## 1. Fixture and reproduction

| | |
|---|---|
| Theme | `%USERPROFILE%\Downloads\private-theme-fixture.json` — "a private real-world theme", 44,209 bytes, unmodified |
| Working copy | Copied to `themes/local/` **only** so the dev server could serve it to the browser for a genuine file-input import. That directory is gitignored (`.gitignore:44`), so nothing entered the repository. Deleted after the audit |
| Visual | Clustered Bar, hero |
| Viewport | 1440×900, `devicePixelRatio = 1` |
| Bases | Classic 2026, Fluent 2 (Preview) |

**Steps.** Import the theme through the app's own file input (`↑ Import theme`);
select Bar chart in the rail; switch the base-theme `<select>` between
`classic2026` and `fluent2`; measure.

**One caveat that matters.** Dragging a property slider writes an *explicit*
override into the custom layer, after which that property no longer falls back
under either base. An early pass contaminated `innerPadding` this way and
briefly made Classic look identical to Fluent. Every figure below was taken
after a clean re-import.

The theme is deliberately partial: for `clusteredBarChart` it sets only
`categoryAxis.{show,showAxisTitle,gridlineShow}`, `valueAxis.{...}`,
`labels.{show,optimizeLabelDisplay}`, `visualTooltip`, `subTitle` — 11
properties. Everything else inherits from the base or falls back.

---

## 2. Classic ↔ Fluent resolved-property differential

Produced with the application's own machinery — `themeLayers`,
`resolvePropertyEntry` (which reports provenance in the same walk that produces
the value) and the real `BAR_CHART_PROPERTIES` / `CHROME_PROPERTIES`
registries. No second merge algorithm was written.

**432 property definitions scanned. 40 resolve differently.**

The headline is the provenance column, not the values:

| Provenance pattern | Count |
|---|---:|
| Classic **falls back**, Fluent supplies a base value | **38** |
| Both come from a base, values genuinely differ | **2** |

Only `categoryAxis.gridlineStyle` and `valueAxis.gridlineStyle`
(`dotted` → `solid`) are real base-vs-base disagreements. **Everything else is
Classic's silence meeting a Studio fallback.**

### The 40 differences

| Property | Classic | Fluent | Classic src | Fluent src | Class |
|---|---|---|---|---|---|
| `bar.categoryAxis.fontFamily` | *(fallback `""`)* | `'Segoe UI', …` | fallback | base-wildcard | Studio fallback |
| `bar.categoryAxis.fontSize` | *(fallback `6`)* | `10.5` | fallback | base-wildcard | Studio fallback |
| `bar.categoryAxis.titleFontFamily` | *(fallback `""`)* | `'Segoe UI Semibold', …` | fallback | base-wildcard | Studio fallback |
| `bar.categoryAxis.titleFontSize` | *(fallback `6`)* | `10.5` | fallback | base-wildcard | Studio fallback |
| `bar.categoryAxis.labelColor` | *(fallback)* | `#6C6966` | fallback | base-wildcard | Studio fallback |
| `bar.categoryAxis.gridlineColor` | *(fallback)* | `#F0F0F0` | fallback | base-wildcard | Studio fallback |
| `bar.categoryAxis.gridlineStyle` | `dotted` | `solid` | base-wildcard | base-wildcard | **Base explicit** |
| `bar.categoryAxis.innerPadding` | *(fallback `10`)* | `50` | fallback | base-visual | Studio fallback |
| `bar.categoryAxis.maxMarginFactor` | *(fallback `10`)* | `50` | fallback | base-wildcard | Studio fallback |
| `bar.valueAxis.fontFamily` | *(fallback `""`)* | `'Segoe UI', …` | fallback | base-wildcard | Studio fallback |
| `bar.valueAxis.fontSize` | *(fallback `6`)* | `10.5` | fallback | base-wildcard | Studio fallback |
| `bar.valueAxis.titleFontFamily` | *(fallback `""`)* | `'Segoe UI Semibold', …` | fallback | base-wildcard | Studio fallback |
| `bar.valueAxis.titleFontSize` | *(fallback `6`)* | `10.5` | fallback | base-wildcard | Studio fallback |
| `bar.valueAxis.labelColor` | *(fallback)* | `#6C6966` | fallback | base-wildcard | Studio fallback |
| `bar.valueAxis.gridlineColor` | *(fallback)* | `#F0F0F0` | fallback | base-wildcard | Studio fallback |
| `bar.valueAxis.gridlineStyle` | `dotted` | `solid` | base-wildcard | base-wildcard | **Base explicit** |
| `bar.legend.show` | *(fallback)* | `true` | fallback | base-visual | Studio fallback |
| `bar.legend.position` | *(fallback `Top`)* | `Bottom` | fallback | base-visual | Studio fallback |
| `bar.legend.showTitle` | *(fallback)* | `false` | fallback | base-visual | Studio fallback |
| `bar.layout.clusteredGapSize` | *(fallback `10`)* | `10` | fallback | base-visual | Studio fallback *(same value)* |
| `bar.subheader.fontFamily` / `.fontSize` | *(fallback)* | `Segoe UI Semibold` / `10.5` | fallback | base-visual | Studio fallback |
| `bar.smallMultiplesLayout.{gridLineColor,columnCount,rowCount}` | *(fallback)* | `#D1D1D1`, `4`, `1` | fallback | base-visual | Studio fallback |
| `chrome.subTitle.fontSize` | *(fallback)* | `12` | fallback | base-visual | Studio fallback |
| `chrome.border.{color,radius}` | *(fallback)* | `#E6E6E6`, `8` | fallback | base-visual | Studio fallback |
| `chrome.dropShadow.*` (7) | *(fallback)* | preset values | fallback | base-visual | Studio fallback |
| `chrome.padding.{top,bottom}` | *(fallback)* | `14`, `16` | fallback | base-visual | Studio fallback |
| `chrome.spacing.{customizeSpacing,spaceBelowSubTitle,verticalSpacing}` | *(fallback)* | `true`, `16`, `2` | fallback | base-visual | Studio fallback |

Note `clusteredGapSize`: Classic falls back to `10` and Fluent explicitly
declares `10`. Same value, different route — and Fluent's declaration is
independent corroboration that the Studio fallback is right here.

---

## 3. Provenance and source analysis

Both base files carry `_note` provenance:

| File | Provenance | Trust |
|---|---|---|
| `classic2026.json` | **Verbatim** Power BI file — `BaseThemes/CY26SU07.json` from the installed Desktop app, confirmed against `desktop.min.js` (`w="CY26SU07"`) | High. Its silences are real Power BI silences |
| `fluent2.json` | Genuine PBIP export, **truncated** at the very end (`visualStyles.page.*`) | High for everything above the truncation, which includes all axis/legend/layout material used here |
| `classic2018.json` | Reconstructed from a four-file delta chain | Not used in this audit |

That `classic2026.json` is verbatim is the key to the whole audit. When it does
not declare a property, that is evidence about Power BI, not a gap in our copy.

### What each base actually declares

```
classic2026  visualStyles.*.*.categoryAxis  = [{ showAxisTitle, gridlineStyle, concatenateLabels }]
classic2026  visualStyles.*.*.valueAxis     = [{ showAxisTitle, gridlineStyle }]
classic2026  visualStyles.clusteredBarChart = { general, legend.showGradientLegend, smallMultiplesLayout }

fluent2      visualStyles.*.*.categoryAxis  = [{ showAxisTitle, maxMarginFactor, gridlineStyle,
                                                 gridlineColor, concatenateLabels, titleFontFamily,
                                                 titleFontSize, fontFamily, fontSize, labelColor }]
fluent2      visualStyles.clusteredBarChart = { general, legend, categoryAxis.innerPadding=50,
                                                smallMultiplesLayout, subheader, layout }
```

Counted across the whole of `visualStyles`:

| Declaration | Classic 2026 | Fluent 2 |
|---|---:|---:|
| `fontSize` | **0** | 39 |
| `innerPadding` | **0** | 9 |
| `maxMarginFactor` | **0** | 2 |
| `clusteredGapSize` | **0** | 3 |
| `legend…position` | 4 (pie/donut only) | 26 |

**Classic 2026 declares no font size anywhere in `visualStyles` at all.** It
declares typography in `textClasses` instead:

```json
"textClasses": {
  "label":  { "fontSize": 10, "fontFace": "Segoe UI",          "color": "#252423" },
  "title":  { "fontSize": 12, "fontFace": "DIN",               "color": "#252423" },
  "header": { "fontSize": 12, "fontFace": "Segoe UI Semibold", "color": "#252423" },
  "callout":{ "fontSize": 24, "fontFace": "DIN",               "color": "#252423" }
}
```

The private theme overrides that layer to Arial 10 / Arial 12.

---

## 4. Suspicious Studio fallbacks

| Fallback | Value | Verdict | Evidence |
|---|---|---|---|
| axis `fontSize`, `titleFontSize` | `6` | **Definitely incorrect** | Classic 2026 is a verbatim Power BI file that declares *zero* `fontSize` in `visualStyles` while deliberately declaring `textClasses.label.fontSize = 10`. Power BI has no other source to render axis labels from, so it must inherit from `textClasses`. Fluent, which does declare axis typography, chose `10.5` — the same visual ballpark, and nothing near 6. The resolver never consults `textClasses` for any visual property (only `cardProperties.ts` does, for `callout`) |
| axis `fontFamily`, `titleFontFamily` | `""` | **Definitely incorrect** | Same argument. `""` means "inherit from CSS", so the preview silently uses the app's own font rather than the theme's Arial. The private theme explicitly asks for Arial and the preview does not show it |
| `legend.fontSize`, `labels.fontSize` | `6` | **Definitely incorrect** | Same root cause, and note these resolve to `6` under **both** bases — Fluent does not declare them either, so this defect is not Classic-specific |
| `legend.position` | `"Top"` | **Likely incorrect** | Power BI's documented default legend position for cartesian visuals is Bottom, and Fluent's base states `Bottom` explicitly for `*.*` and for `clusteredBarChart`. Classic 2026 declares `position` only for pie/donut (`RightCenter`), implying the cartesian default lives in Power BI's internal visual defaults, not the theme file. `Top` looks like an app choice |
| `categoryAxis.innerPadding` | `10` | **Probably correct but not proven** | Not declared anywhere in Classic 2026, so it comes from Power BI's internal visual defaults, which no artefact available here exposes. Fluent's `50` is a deliberate Fluent restyle, not evidence of the general default |
| `categoryAxis.maxMarginFactor` | `10` | **Probably correct but not proven** | Same |
| `layout.clusteredGapSize` | `10` | **Proven correct** | Fluent explicitly declares `10` for `clusteredBarChart.layout` |

A secondary units question, flagged not resolved: Power BI theme JSON expresses
font size in **points**, and the preview applies the number directly as CSS
`px`. Fluent's `10.5` renders as `10.5px`, where 10.5pt is 14px. That is a
separate ~33% typography discrepancy affecting *every* chart, independent of
the fallback problem.

---

## 5. Bar thickness at every geometry layer — private theme + Fluent 2

`layout.clusteredGapSize = 10`, `categoryAxis.innerPadding = 50`, hero scale
`1.5`, `devicePixelRatio = 1`, plot rect `77.4844px` tall (natural `51.656`).

| Layer | London | North West | Scotland | Wales | Equal? |
|---|---|---|---|---|---|
| `scale.category` slot size | 25% | 25% | 25% | 25% | **yes** |
| `categoryPercent().offset` | 0% | 25% | 50% | 75% | — |
| `.bar-item` inline `top` | 6.25% | 31.25% | 56.25% | 81.25% | — |
| `.bar-item` inline `height` | 12.5% | 12.5% | 12.5% | 12.5% | **yes** |
| `.bar-item` computed height | 6.45312px | 6.45312px | 6.45312px | 6.45312px | **yes** |
| `.bar-item` `offsetHeight` | 6 | 6 | 6 | 6 | yes (integer-rounded) |
| `.bar-item` rect height | 9.6797 | 9.6797 | 9.6797 | 9.6797 | **yes** |
| `.bar-item__fill` inline height | 90% | 90% | 90% | 90% | **yes** |
| `.bar-item__fill` computed height | 5.79688px | 5.79688px | 5.79688px | 5.79688px | **yes** |
| `.bar-item__fill` `offsetHeight` | 6 | 6 | 6 | 6 | yes |
| `.bar-item__fill` rect top | 567.9648 | 587.3477 | 606.7070 | 626.0898 | — |
| `.bar-item__fill` rect bottom | 576.6602 | 596.0430 | 615.4023 | 634.7852 | — |
| `.bar-item__fill` rect height | **8.6953** | **8.6953** | **8.6953** | **8.6953** | **yes — delta 0** |
| **device pixels after snapping** | **9** | **9** | **8** | **9** | **NO** |

`maxFillDelta = 0.0000`. The four bars are identical at ChartLayout, identical
as CSS percentages, and identical in browser layout.

They differ only in **sub-pixel phase**: the fractional parts of their tops are
`.9648`, `.3477`, `.7070`, `.0898`. Snapping each edge to the nearest device
pixel gives 9, 9, 8, 9 — Scotland rasterises **one pixel thinner, an 11.5%
error on an 8.7px bar**.

This is a rasterisation artefact of correct fractional geometry. It was
measured, not assumed.

### Phase sweep — direct proof

Translating the plot by sub-pixel amounts (diagnostic only). CSS height never
changes; only the snapped result does, and *which* bar is thin moves:

| `translateY` | CSS heights | Snapped | Spread |
|---|---|---|---|
| 0.0px | 8.6953 (all) | 9, 9, **8**, 9 | 1 |
| 0.1px | 8.6953 (all) | 9, 9, 9, 9 | **0** |
| 0.2px | 8.6953 (all) | 9, **8**, 9, 9 | 1 |
| 0.3px | 8.6953 (all) | 9, **8**, 9, **8** | 1 |
| 0.4px | 8.6953 (all) | **8**, 9, 9, **8** | 1 |
| 0.5px | 8.6953 (all) | **8**, 9, 9, 9 | 1 |
| 0.6px | 8.6953 (all) | 9, 9, **8**, 9 | 1 |
| 0.7px | 8.6953 (all) | 9, 9, **8**, 9 | 1 |

Only one offset in eight lands uniformly.

---

## 6. Hero scale 1.5 vs 1.0

| Case | Fill height (CSS) | Max delta | Snapped device px | Spread |
|---|---|---|---|---|
| A — hero at 1.5 (production) | 8.6953 × 4 | 0 | 9, 9, **8**, 9 | 1 |
| B — hero forced to `transform: none` | 5.7969 × 4 | 0 | 6, 6, 6, 6 | **0** |

Removing the transform *did* remove the inequality **in that position** — but
section 7 shows that is luck, not a cure. The override was reverted; the hero
still reports `matrix(1.5, 0, 0, 1.5, 0, 0)`.

---

## 7. Hero vs thumbnail — the transform is not the cause

| Case | Scale | Fill height | Max delta | Snapped | Spread |
|---|---|---|---|---|---|
| A — hero | 1.5 | 8.6953 | 0 | 9, 9, **8**, 9 | 1 |
| B — hero forced to 1.0 | 1.0 | 5.7969 | 0 | 6, 6, 6, 6 | 0 |
| C — thumbnail | **1.0** | 5.7969 | 0 | **5, 5, 6, 6** | **1** |

The thumbnail has **no transform at all** and still shows the inequality. B and
C are both at scale 1.0 with identical CSS heights and identical row spacing;
they differ only in where the plot happens to sit on the page (fractional
offsets `.1016` vs `.6016`).

**Conclusion: the hero transform is not the cause.** It changes the phase, and
it magnifies the fixed 1-device-pixel error by making bars thinner relative to
it. Removing it would not fix this.

---

## 8. `innerPadding` isolation — private theme + Fluent

| `innerPadding` | `.bar-item` height | Fill CSS height | Distinct heights | Snapped | Spread | Error |
|---|---|---|---|---|---|---|
| 50 (Fluent's value) | 12.5% | 8.6953 | **1** | 9, 9, **8**, 9 | 1px | **11.5%** |
| 10 | 22.5% | 15.6563 | **1** | 16, 16, 16, **15** | 1px | 6.4% |
| 0 | 25% | 17.4141 | **1** | 17, 17, **18**, 17 | 1px | 5.7% |

At every setting the CSS heights collapse to a **single distinct value** — the
layout is mathematically equal, exactly as `ChartLayout` promises. The absolute
error is a constant 1 device pixel.

**`innerPadding` does not cause the inequality.** It halves the bar, which
doubles the *relative* size of an unchanged 1px error. High inner padding makes
a pre-existing rasterisation problem twice as visible.

---

## 9. Classic ↔ Fluent geometry, with causes

| Measurement | Classic 2026 | Fluent 2 | Cause |
|---|---|---|---|
| Hero scale | 1.5 | 1.5 | — |
| Natural box height | 84px | 84px | `BAR_CHART_BOX.height`, fixed |
| Axis label font | **6px** | **10.5px** | Classic falls back to `6`; Fluent base-wildcard `fontSize: 10.5` |
| Category gutter width | 67.64 | 113.88 | +46.24 — wider labels + axis title at 10.5px |
| Plot width | 487.36 | 441.12 | **−46.24 — exactly the gutter's gain** |
| Value gutter height | 30.28 | 48.52 | +18.24 — taller tick text + title |
| Plot height | 95.72 | 77.48 | **−18.24 — exactly the gutter's gain** |
| Legend y | 487.66 (above plot) | 688.66 (below) | Classic falls back to `Top`; Fluent base-visual `position: Bottom` |
| Category slot | 22.5% | 12.5% | `innerPadding` fallback `10` vs Fluent's explicit `50` |
| Bar fill height | 19.3594 | 8.6953 | Compound — see below |
| Snapped spread | **0** (20,20,20,20) | **1** (9,9,8,9) | Thicker bars absorb the same 1px error |
| Frame height | 430.78 | 427.78 | −3, legend above vs below the body |

Conservation is exact in both axes: every pixel the plot loses, a gutter gains.

**The bar-thickness chain, in natural units:**

| | Classic | Fluent |
|---|---:|---:|
| Box height | 84.000 | 84.000 |
| − value gutter | 20.188 | 32.344 |
| = plot height | 63.813 | 51.656 |
| ÷ 4 = slot | 15.953 | 12.914 |
| × (1 − innerPadding) | ×0.9 | ×0.5 |
| = mark height | **12.906** | **5.797** |

0.81 × 0.556 = 0.449; 12.906 × 0.449 = 5.797. The 55% reduction is entirely
explained by two multiplied factors: bigger typography eating a **fixed** 84px
box (−19%), and `innerPadding` 50 vs 10 (−44%).

This exposes a third finding: `BAR_CHART_BOX.height = 84` was sized when axis
type was 6px. With realistic 10.5px typography the plot is starved, and it
would be starved further at a true 14px.

---

## 10. Other visible artefacts

| Artefact | Measured | Classification |
|---|---|---|
| Category labels clipping | `scrollWidth == clientWidth` on all four; no ellipsis triggered | Not occurring |
| Labels crossing the plot boundary | All right edges `329.57` < plot left `335.57` | Not occurring |
| Label ↔ bar row alignment | 0.000px on all four | Not occurring |
| Axis title overlap | "Region" spans x 221.69–242.69; nearest label starts 250.16 | Not occurring |
| Gridline ↔ tick alignment | Uniform 0.750px on all five | Known half-stroke offset (T7), not a Fluent artefact |
| Bars visibly thinner overall | 12.906 → 5.797 natural | **Expected** — typography + innerPadding, §9 |
| Individual bars unequal | 1 device px, 11.5% | **Bug** — rasterisation of fractional geometry, §5 |
| Legend moves below the plot | y 487.66 → 688.66 | **Expected** — Fluent `position: Bottom` |
| Axis text much larger | 6px → 10.5px | **Expected difference, wrong baseline** — Fluent is right, Classic's `6` is a bad fallback |

---

## 11. Cross-cartesian fallback scope

This is **not** a Clustered Bar quirk. Counting `fontSize`-family properties
whose resolver fallback is `6`:

| Registry | Count |
|---|---:|
| `lineChartProperties.ts` | 12 |
| `stackedBarChartProperties.ts` | 11 |
| `stackedColumnChartProperties.ts` | 11 |
| `barChartProperties.ts` | 10 |
| `columnChartProperties.ts` | 10 |
| `matrixProperties.ts` | 7 |
| `pieChartProperties.ts` | 2 |
| `slicerProperties.ts` | 2 |
| `cardProperties.ts` | 1 |
| **Total** | **66** |

Plus 6 more `textSize`/`titleSize`-style properties, 99 `, 6)` numeric
fallbacks overall, and **72 `fontFamily` properties falling back to `""`**.

54 of the 66 are in the five cartesian charts. **This is a general
generated-registry issue**, not one bad value.

---

## 12. Classification table

| Difference | Resolved property differs? | Proven cause | Expected? | Bug? |
|---|---|---|---|---|
| Legend moves to bottom | Yes | Fluent base `legend.position: Bottom`; Classic falls back to `Top` | Yes | Fallback `Top` likely wrong |
| Axis text 6px → 10.5px | Yes | Fluent base-wildcard `fontSize: 10.5`; Classic falls back to `6` | Difference yes | **Yes** — `6` is definitely incorrect |
| Axis font family | Yes | Fluent supplies Segoe UI; Classic falls back to `""` | Difference yes | **Yes** — theme's Arial never reaches the preview |
| Category gutter +46.24px | No (consequence) | Wider text at 10.5px | Yes | No |
| Plot width −46.24px | No (consequence) | Exact conservation with the gutter | Yes | No |
| Value gutter +18.24 / plot height −18.24 | No (consequence) | Taller text | Yes | No |
| Bars thinner overall | Yes | `innerPadding` 10→50 **and** plot height loss | Yes | No — but amplified by a bad `innerPadding` fallback and a fixed box |
| **Individual bars unequal thickness** | **No** | Sub-pixel phase → 1 device px snap; layout delta is 0 | **No** | **Yes** |
| Gridline 0.75px from tick | No | Half of the 1.5px rendered stroke | Yes | No (pre-existing, cosmetic) |
| Gridline style dotted → solid | Yes | Genuine base-vs-base value | Yes | No |
| Chrome padding/spacing/shadow | Yes | Fluent declares, Classic falls back | Difference yes | Unproven |
| `innerPadding` fallback `10` | Yes | Not declared by Classic 2026 | — | Unproven |
| `legend.fontSize` = 6 under **both** bases | No | Neither base declares it | No | **Yes** |

---

## 13. Ranked root causes

**1 — Visual properties never inherit from `textClasses`.** *(correctness:
critical · breadth: whole app · regression risk: medium)*

The single largest fidelity defect found. Classic 2026 is a verbatim Power BI
file with **zero** `fontSize` in `visualStyles` and a populated `textClasses`;
the only way Power BI can render its axis labels is by inheriting from that
layer. Studio instead falls back to `6` for 66 properties across 9 registries,
and to `""` for 72 font families. Any partial theme — which is most real
themes, including this one — renders with 6px axis text in the app's own font
instead of the 10pt Arial it asks for.

**2 — Unequal bar thickness from unrounded fractional geometry.** *(critical ·
cartesian family · low)*

Layout is provably correct — delta 0.0000 at every layer — but mark edges land
on arbitrary sub-pixel phases and snap to different device-pixel counts. 1px
absolute, 11.5% relative at Fluent's thin bars. Not caused by the hero
transform (the thumbnail shows it at scale 1.0) and not caused by
`innerPadding` (which only doubles its visibility).

**3 — `legend.position` falls back to `Top`.** *(moderate · cartesian family ·
low)* Power BI's cartesian default is Bottom and Fluent states it explicitly.

**4 — Fixed natural chart boxes starve the plot at realistic typography.**
*(moderate · cartesian family · medium)* `BAR_CHART_BOX.height = 84` was sized
against 6px axis text. Fixing cause 1 makes this worse, not better — the value
gutter would grow again.

**5 — Font sizes are points rendered as pixels.** *(moderate · whole app ·
medium)* Flagged, not proven. Needs its own investigation.

**6 — `innerPadding` / `maxMarginFactor` fallbacks are unproven.** *(low ·
cartesian family · low)*

---

## 14. Recommended fixes — not implemented

Ordered by correctness impact, with breadth and risk stated.

| # | Fix | Impact | Breadth | Risk | Notes |
|---|---|---|---|---|---|
| 1 | Make typography properties fall back through `textClasses` rather than to a literal | Critical | 66+72 properties, 9 registries | Medium | Needs a decision on which text class each property maps to (`label` for axis/legend/data labels, `title` for titles). Should be one shared helper, not 138 edits. Verify against Classic 2026 + Fluent, both of which then agree |
| 2 | Snap mark edges to device pixels in the renderer | Critical | Cartesian family | Low | The narrowest correct fix is to round the mark's **rendered** rect, not its fraction — i.e. give every category the same integer pixel height derived once, rather than rounding percentages. **Do not** round inside `ChartLayout`: the engine is correct and must stay resolution-independent. Needs care so bars still tile their slots |
| 3 | Correct `legend.position` fallback to `Bottom` | Moderate | Cartesian family | Low | One-line per registry; verify against Fluent's explicit value |
| 4 | Derive the natural box height from resolved typography, or grow it | Moderate | Cartesian family | Medium | Do **after** fix 1, since fix 1 changes the required budget |
| 5 | Investigate pt → px conversion | Moderate | Whole app | Medium | Diagnostic first, like this task |
| 6 | Establish real defaults for `innerPadding` / `maxMarginFactor` | Low | Cartesian family | Low | Needs a Power BI artefact this audit did not have |

Fixes 1 and 2 are independent and can land in either order. Fix 4 depends on 1.

---

## 15. Acceptance questions

1. **Why does private theme + Fluent differ from private theme + Classic?** 40 of 432 resolved
   properties differ; 38 are Classic falling back where Fluent declares a
   value. The visible consequences are typography (6px vs 10.5px), legend
   placement, and `innerPadding` 10 vs 50 — with all geometry changes
   conserving exactly against the gutters.
2. **Which differences are definitely base-theme values?** Two —
   `categoryAxis.gridlineStyle` and `valueAxis.gridlineStyle`. Everything else
   Fluent supplies is met by a Studio fallback on the Classic side.
3. **Which come from Studio fallbacks?** 38 of 40. Listed in §2.
4. **Is the Classic axis typography fallback of `6` faithful?** **No —
   definitely incorrect.** Classic 2026 declares no font size in `visualStyles`
   at all and declares `textClasses.label.fontSize = 10`; Power BI must inherit
   from there.
5. **Are the four Fluent bars mathematically equal in ChartLayout?** Yes —
   identical 25% slots, identical 12.5% marks.
6. **Equal in browser layout before hero scaling?** Yes — 5.79688px each,
   delta 0.
7. **Equal after hero scaling?** In layout yes (8.6953px each, delta 0). In
   rasterised device pixels **no** — 9, 9, 8, 9.
8. **Does removing the transform remove the inequality?** In the position
   tested, yes — but that is phase luck. The thumbnail has no transform and
   still shows it. The transform is not the cause.
9. **Does the thumbnail show it?** Yes — 5, 5, 6, 6 at scale 1.0.
10. **Narrowest correct fix for each defect?** §14, rows 1 and 2.

---

**Scope statement.** Diagnosis only. No resolver fallback, base theme,
`ChartLayout`, renderer, sample data or CSS was modified. All browser overrides
were temporary, reverted in-session, and are not in the repository. The private theme
theme file was not modified, and its working copy lived only in the gitignored
`themes/local/`.
