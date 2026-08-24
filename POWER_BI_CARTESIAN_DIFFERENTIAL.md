# Power BI ↔ Theme Studio cartesian differential

*Measurement only. **No Theme Studio rendering was changed.** Every difference
below is evidence, not a licence to edit.*

Both halves were measured the same way — CDP against a live renderer — so
neither side is an estimate.

---

## 1. Environment

| | |
|---|---|
| Power BI Desktop | 2.157.879.0 (26.08), WebView2 runtime 151.0.4129.101 |
| Native measurement | CDP on `reportView.html`, port 9222 |
| Theme Studio | dev server, measured through Edge 151 on CDP port 9223 |
| `devicePixelRatio` | 1 on both |
| Report zoom | **100%** (`matrix(1,0,0,1,0,0)` on `div.vcBody`) |
| Theme Studio base | Classic 2026 |

Measuring Theme Studio through a real browser's CDP rather than the in-app
preview pane is what makes the painted-pixel half of this possible at all.

## 2. Fixture

Identical data on both sides — Task 9's cartesian fixture:

| | London | North West | Scotland | Wales |
|---|---:|---:|---:|---:|
| Online | 46 | 38 | 29 | 22 |
| Phone | 24 | 19 | 14 | 11 |
| Post | 12 | 9 | 8 | 5 |

Native visual authored at **600 × 600**, default formatting. Theme Studio's
`BAR_CHART_BOX` is **372 × 128** nominal, presented at hero scale **1.5004**.

## 3. Coordinate systems

At zoom 1 and DPR 1 the *scales* coincide; the *origins* do not. Every native
figure below is in SVG user units (= CSS px here). Every Theme Studio figure is
in **natural** units — rendered values divided by 1.5004 — with the presentation
scale kept separate throughout.

---

## 4. Native structure

```
div.visualContainer         600 x 600   authored
 └ div.vcBody               600 x 600   report-zoom transform lives here
    └ div.visual            566 x 508   viewport handed to the visual
       └ svg.cartesianChart 566 x 478   drawing surface
          └ svg.mainGraphicsContext  471 x 443   THE PLOT
```

Plot sits at **(104, 83)** inside the visual. Legend band starts at y **553**.

---

## 5. The differential

### 5.1 Scale

| Property | Power BI | Theme Studio | Delta | Evidence |
|---|---|---|---|---|
| data maximum | 46 | 46 | — | same fixture |
| **automatic axis maximum** | **50** | **46** | **+4 (8.7%)** | `471 ÷ 9.42` vs `CLUSTERED_DATA_MAX` |
| tick labels drawn | **3** — 0, 20, 40 | **5** — 0, 11.5K, 23K, 34.5K, 46K | +2 | measured |
| value scale | 9.42 units/px, exactly linear | linear | — | every one of 12 widths = value × 9.42 |

Power BI rounds the axis up to a *nice* number; Theme Studio stops at the data
maximum, so its tick labels are the awkward `11.5K` / `34.5K` that Power BI
never produces.

### 5.2 Plot and aspect — **the headline**

| Property | Power BI | Theme Studio (natural) | Ratio |
|---|---|---|---|
| authored visual | 600 × 600 | 372 × 128 | — |
| **visual aspect** | **1.00** | **2.91** | **2.9×** |
| plot | 471 × 443 | 271 × 86.2 | — |
| **plot aspect** | **1.06** | **3.14** | **3.0×** |
| plot height | 443 | 86.2 | **5.1×** |
| plot-left proportion | 104/600 = 17.3% | ~35% | 2× |

Theme Studio's cartesian box is roughly three times wider than it is tall;
the native reference is square. Everything in §5.4 follows from this.

### 5.3 Categories and series — **exact match**

| Property | Power BI | Theme Studio | Delta |
|---|---|---|---|
| series band `paddingInner` | **0.100000** | **0.100000** | **0** |
| series step ÷ slot | 34.4828% | 34.4828% | **0** |
| band width ÷ slot | 31.0345% | 31.0345% | **0** |
| effective `clusteredGapSize` | 10 | 10 | **0** |
| bars per chart | 12 | 12 | 0 |

Task 9's band model, derived purely from bundle archaeology, reproduces Power
BI's rendered proportions exactly. Feeding `clusteredSeriesBands` the native
slot and gap earlier matched its absolute geometry to 1.78e-15.

Category `innerPadding` differs: native implies ≈**55.2%** (`INFERENCE` —
cluster span ÷ category step, assuming d3 band semantics with unknown outer
padding) against Theme Studio's Classic fallback of 10.

### 5.4 Typography — why the fonts look too large

Native, every role measured separately rather than generalised:

| Role | size | weight | family | colour |
|---|---|---|---|---|
| visual title | **20px** (15pt) | 400 | `wf_standard-font, helvetica, …` (the DIN stack) | `rgb(36,36,36)` |
| legend | **14px** (10.5pt) | 400 | `"Segoe UI", wf_segoe-ui_normal, …` | `rgb(97,97,97)` |
| category axis label | **14px** | 400 | same | same |
| value axis label | **14px** | 400 | same | same |
| axis titles | **not rendered** | — | — | default state shows none |

Theme Studio:

| Role | size | note |
|---|---|---|
| category axis label | 13.3333px (10pt) | **5% smaller than native** |
| value axis label | 12px (9pt) | 14% smaller |
| legend | 13.3333px | 5% smaller |
| axis titles | 16px (12pt) | **rendered, where native shows none** |

**The font sizes are not too large — they are slightly smaller than native.**
The perception comes from the ratio to the plot:

| | label height | plot height | label ÷ plot |
|---|---|---|---|
| Power BI | 19 | 443 | **4.3%** |
| Theme Studio | 19.39 | 86.2 | **22.5%** |

**Theme Studio's text is 5.2× larger relative to its plot**, entirely because
the plot is 5.1× shorter. This is a box-aspect problem, not a font-size
problem, and Task 7 fixed those boxes against a legibility floor precisely
because the text was crowding them.

Two aggravating factors, both space Power BI does not spend: Theme Studio
renders **axis titles** the native default does not, and its value-axis labels
are `11.5K`-style strings that are wider than native's `20`.

### 5.5 Text measurement

| | width of "North West" | per px of font |
|---|---|---|
| Power BI, 14px | **70.837** | 5.0598 |
| Theme Studio browser, 13.3333px | **67.219** | 5.0414 |
| `estimateText`, 13.3333px | **73.333** | 5.5 |

The two *browser* measurements agree to **0.4%** — the font metrics are the
same, so nothing is falling back to a different face. `estimateText`
overstates by **+9.1%** at Theme Studio's size and **+8.7%** at native's.

**Cause: the 0.55 em-per-character heuristic**, not font availability, aliasing
or rounding. Segoe UI's actual mean advance for these strings is ≈0.504 em.
Other labels agree: London 47.163/14 = 3.37 em-units over 6 chars = 0.5013 em.

### 5.6 Legend

| | Power BI | Theme Studio |
|---|---|---|
| position | bottom | top (Classic fallback) |
| band top | y 553 of 600 (**92%** down) | above the plot |
| text size | 14px | 13.3333px |
| item labels | `Sum of Online` (aggregation prefix) | `Online` |

Not comparable dimensionally while the sides differ; recorded for the legend
task rather than compared.

### 5.7 Painting

| | primitive | fractional edges | measured |
|---|---|---|---|
| Power BI | SVG `<rect>`, unrounded | **antialiased** | 14.318 ink vs 14.3211 geometric |
| Theme Studio (hero, transformed) | HTML box, percentage-positioned | **antialiased** | 8.996 ink vs 9.0234 geometric |

Theme Studio, London/Online at rendered top `.664`: `0.498 + 8 full + 0.498`.
Coverage is conserved, exactly as on the native side.

**This partly contradicts Task 8's model.** §17 predicted Blink would
pixel-snap Theme Studio's HTML box backgrounds and quantise their thickness.
Inside the hero's `transform: scale(1.5)` it does not — the transformed subtree
is composited and painted with fractional coverage.

`UNKNOWN`: the **untransformed** case. Thumbnails render at scale 1 and were
not sampled here, and that is exactly where Task 8's arithmetic predicted the
1px spread. Until that is measured, "Theme Studio snaps" is neither proven nor
refuted — only shown not to hold under the hero transform.

---

## 6. Evidence grades

| Finding | Grade |
|---|---|
| Native geometry, typography, tick values, band model | `PROVEN-EXPERIMENT` |
| Power BI antialiases fractional edges (2 phases sampled) | `PROVEN-EXPERIMENT` |
| Theme Studio antialiases **under the hero transform** (1 clean sample) | `PROVEN-EXPERIMENT` |
| `estimateText` error is the 0.55 heuristic | `STRONGLY-SUPPORTED` — two independent browser measurements agree to 0.4% |
| Axis maximum is a nice-number rounding | `STRONGLY-SUPPORTED` — one data point (46→50) plus `Le = 20` px/tick |
| Tick density is width-driven | `INFERENCE` — `bestTickCount = min(domainSpan, pixelSpan / 20)` read from the bundle; the nice-interval selection was not isolated |
| Category `innerPadding` ≈ 55.2% | `INFERENCE` — outer padding unknown |
| Theme Studio snapping in the untransformed case | `UNKNOWN` |

---

## 7. Before/after probe workflow

Studying Power BI's formatting semantics without automating its UI:

```bash
node probe.mjs --target reportView --snapshot before --out ./output/my-experiment
#   … a human changes exactly one formatting property …
node probe.mjs --target reportView --snapshot after  --out ./output/my-experiment
node probe.mjs --diff ./output/my-experiment
```

The probe still never clicks, types or changes anything.

The snapshot is scoped to the cartesian visual — 35 elements, not the whole
canvas — because a diff that reports Desktop chrome answers nothing. Identity
is structural (`tag.class#ordinal`), never geometric, since the diff exists to
watch geometry move. Geometry compares with a 0.5px tolerance so capture
jitter is not a change, and report zoom/DPR are reported as *context* changes
that invalidate the geometry beneath them.

**Limit:** if a formatting change adds, removes or reorders elements, ordinals
shift and the diff reports removals plus additions rather than edits. That is
reported honestly rather than papered over with a guessed rename.

Verified end to end: two captures with nothing changed produce
`no semantic change`, `unchanged 35`.

---

## 8. Unresolved

1. **Untransformed Theme Studio painting** — the open half of §5.7.
2. **The nice-number rule.** One sample (46 → 50). Distinguishing 1/2/5×10ⁿ
   from other families needs several data maxima, each requiring a manual data
   edit in Desktop.
3. **Tick-interval selection.** `Le = 20` sets density; what picks 20 as the
   interval for a 0–50 domain was not isolated.
4. **Category `innerPadding`** — the 55.2% inference needs the outer-padding
   term to become a measurement.
5. **Native axis titles and data labels** — not measurable in the default
   state; needs a controlled formatting change.
6. **Legend dimensions** — not comparable until sides match.

---

## 9. Implementation candidates — **NOT YET IMPLEMENTED**

Ranked by evidence strength × visible effect. None is done here.

1. **Automatic axis maximum (nice numbers).** Changes every cartesian preview's
   scale and removes the `11.5K` tick labels. Needs §8.2 first.
2. **Box aspect ratio.** The single biggest visual difference, and the reason
   the fonts read as oversized. Touches Task 7's constants, so it needs its own
   justification against that floor.
3. **`estimateText` calibration.** ~0.50 em rather than 0.55, or a real
   measurement. Well evidenced, small, affects every gutter.
4. **Tick count.** Width-driven rather than a fixed 4.
5. **Axis titles off by default**, matching the native default state.
6. **Legend default position** — bottom, not top.

Nothing about mark primitives: §5.7 removed the motivation for an SVG
migration under the hero, and left the untransformed case unmeasured.
