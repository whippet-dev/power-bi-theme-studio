# Power BI ↔ Theme Studio cartesian differential

*Measurement only. **No Theme Studio rendering was changed.** Every difference
below is evidence, not a licence to edit.*

Both halves were measured the same way — CDP against a live renderer — so
neither side is an estimate.

> ## ⚠ Read this before using any native figure
>
> **Every native measurement in this document was taken under Power BI's
> Fluent report theme.** Theme Studio's differential baseline is Classic
> 2026, so these are not like-for-like.
>
> That was a methodology failure on my part: the report theme was never
> recorded, and "default formatting" was treated as though it were
> theme-neutral. It is not. Manual observation has since established that
> Power BI's **responsive layout behaviour differs by theme** — under Fluent
> a shallow visual reduces to one visible category and scrolls, while under
> both Classic themes it crams all four in.
>
> So a report theme changes more than colours, fonts and default formatting
> values: it changes how the renderer responds to available space. Nothing
> size-responsive measured here may be generalised to "Power BI" until it
> has been repeated under Classic.
>
> Findings are graded accordingly in §6. The Fluent results are kept — they
> are a real and important behaviour, not an error to delete.
>
> **§5.9 now has the Classic measurement**, and it confirms the theme
> dependence with numbers: same visual, same size, same data, two themes,
> and almost every layout decision differs.

---

## 1. Environment

| | |
|---|---|
| Power BI Desktop | 2.157.879.0 (26.08), WebView2 runtime 151.0.4129.101 |
| Native measurement | CDP on `reportView.html`, port 9222 |
| Theme Studio | dev server, measured through Edge 151 on CDP port 9223 |
| `devicePixelRatio` | 1 on both |
| Report zoom | **100%** (`matrix(1,0,0,1,0,0)` on `div.vcBody`) |
| **Native report theme** | **Fluent** — for every native measurement below |
| Native palette fingerprint | `#118DFF` / `#12239E` / `#E66C37`, DIN-stack title |
| Theme Studio base | Classic 2026 — **not the same theme as the native side** |

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
the plot is 5.1× shorter.

> **Superseded by §5.8.** That comparison held the *data* constant but not
> the *aspect*, and the aspect turned out to be doing all the work. Measured
> against a native visual at Theme Studio's own aspect, the ratio reverses.
> The sentence above is true of these two states and false as a general
> claim about the two products.

Two aggravating factors, both space Power BI does not spend: Theme Studio
renders **axis titles** the native default does not, and its value-axis labels
are `11.5K`-style strings that are wider than native's `20`.

### 5.8 Same-aspect comparison — and a reversed conclusion

The native visual was re-authored at **600 × 206** (aspect 2.913) against
Theme Studio's 372 × 128 (aspect 2.906). Zoom 100%, gap restored to 10,
nothing else changed. This removes the aspect confound from §5.2 and §5.4.

| | Power BI 600×206 | Theme Studio 372×128 |
|---|---:|---:|
| visual aspect | 2.913 | 2.906 |
| plot width ÷ visual width | 79.2% | 72.8% |
| plot height ÷ visual height | **26.2%** | **67.3%** |
| plot aspect | 8.80 | 3.15 |
| axis label size | **12px** | 13.3333px |
| **label height ÷ plot height** | **29.6%** | **22.5%** |
| "London" width ÷ plot width | 8.5% | 16.5% |
| categories drawn | **1 of 4** | **4 of 4** |
| bars drawn | **3 of 12** | **12 of 12** |
| band `paddingInner` | 0.100000 | 0.100000 |

Three findings, in order of how much they change the story.

**1. The typography conclusion reverses.** At matched aspect Theme Studio's
text occupies **22.5%** of its plot height against Power BI's **29.6%**.
Theme Studio is the *more* conservative of the two, not 5× heavier. The
earlier 4.3%-vs-22.5% figure was measuring the difference between a square
visual and a 2.9:1 one, not a difference between the products.

> **Carries a Fluent caveat.** The 29.6% is a ratio to a plot whose height
> was itself set by Fluent's decision to scroll, and to a 12px label that
> may be Fluent's responsive sizing. Under Classic, with four categories
> crammed in, both numbers may differ. The *direction* of the correction to
> §5.4 stands regardless — the original figure was an aspect artefact — but
> the 29.6% itself is `FLUENT-SPECIFIC`.

**2. Power BI resizes its axis text with the visual.** 14px at 600×600,
**12px at 600×206** — same theme, same default formatting, only the height
changed. The title stayed at 20px, so this is specific to the axis and
legend roles rather than a global scale. Theme Studio's sizes are fixed by
the resolved theme and do not respond to the box at all.

> **`FLUENT-SPECIFIC` until retested.** Both sizes were measured under
> Fluent. Given that Fluent and Classic demonstrably differ in their
> response to available space, the axis-text scaling cannot be assumed to
> carry over to Classic either.

*(Two states are not a curve. Whether this is a continuous function of
size, a small set of breakpoints, or an "Auto" formatting default is
`UNKNOWN` — it needs several authored sizes to establish.)*

**3. Under Fluent, Power BI refuses to compress; it scrolls.** With 54px of
plot and four categories it has 13.50px each, below its own 16px label line
— so it draws **one** category, keeps `svgScrollable` (558 × 62) for the
rest, and leaves nine of twelve bars unrendered. Theme Studio draws all four
at 21.54px against a 19.4px label: tighter, but above its floor.

> **`FLUENT-SPECIFIC`.** Manual observation under both Classic themes shows
> the opposite: Classic crams all four categories and twelve bars into the
> same space rather than reducing to one. So this is not "what Power BI
> does" — it is what Fluent does, and Classic behaves the way Theme Studio
> already does.
>
> This matters more than the measurement it came from. A report theme is
> usually thought of as colours, fonts and default formatting values; here
> it changes the renderer's **response to available space**. Any future
> density work has to name the theme it targets.

Whether *either* behaviour is what Theme Studio should adopt is now open,
and the Classic result — matching what Theme Studio already does — is the
one that matters for its Classic 2026 baseline.

**Unchanged across both sizes:** `paddingInner` exactly 0.100000, a third
independent confirmation that the band model is invariant to visual size.

One caveat on the width comparison: the two visuals are not the same
absolute width (600 vs 372), so proportions are comparable and absolute
pixels are not. Theme Studio spends 27.2% of its width on the category
gutter against Power BI's 20.8%, which is a real difference and partly
`estimateText`'s 9% overstatement (§5.5) inflating that gutter.

### 5.9 Classic at 600 × 206 — the theme dependence, measured

Same visual, same size, same data, same 100% zoom, gap 10. Only the report
theme changed. Palette fingerprint is identical
(`#118DFF` / `#12239E` / `#E66C37`), so the *palette* is not what differs.

| | Fluent | Classic |
|---|---:|---:|
| container padding (600 − surface width) | 34 | **10** |
| `cartesianChart` | 566 × 86 | **590 × 138** |
| plot (`mainGraphicsContext`) | 475 × 54 | **490 × 97** |
| plot height ÷ visual height | 26.2% | **47.1%** |
| **categories drawn** | **1 of 4** | **4 of 4** |
| **bars drawn** | **3 of 12** | **12 of 12** |
| band width | 3.1034 | 5.0172 |
| series step | 3.4483 | 5.5747 |
| **band `paddingInner`** | **0.100000** | **0.100000** |
| category step | n/a (one shown) | 21.0870 |
| cluster span | 10.0000 | 16.1667 |
| implied category `innerPadding` | n/a | ≈23.3% |
| **legend position** | **bottom** (y 161) | **top** (y 35) |
| **axis titles** | **none** | **both rendered** |
| visual title | 20px | 18.6667px |
| axis label size | 12px | 12px |
| axis label colour | `rgb(97,97,97)` | `rgb(96,94,92)` |

**Your observation is confirmed exactly.** Classic draws all four categories
and all twelve bars in the same space where Fluent reduces to one and
scrolls. This is not a formatting default the user could see in the pane —
it is the renderer responding differently to the same available space.

And it is not only density. Under Classic the legend moves to the **top**,
**both axis titles appear**, container padding drops from 34 to 10, and the
plot ends up **80% taller** (97 vs 54). A report theme is changing layout
structure, not just styling.

#### What this makes renderer-invariant

`paddingInner` is **0.100000** here too. That is now four measurements
across **two themes and three visual sizes**, all exact. The clustered band
model is the one thing that has survived every variation, which is worth
something: it is also the part Theme Studio already implements correctly.

#### A correction this forces

§5.4 said Theme Studio *"renders axis titles the native default does not"*
and counted that against it. **Wrong, and wrong because of the theme.**
Classic renders both axis titles, exactly as Theme Studio does. That was a
Fluent artefact reported as a Theme Studio divergence.

The same applies to legend position: §5.6 recorded native as *bottom* and
Theme Studio as *top*. Under Classic the native legend is on **top** — so
Theme Studio matches its own baseline, and the "divergence" was again
Fluent.

#### Classification so far

| Behaviour | Classification |
|---|---|
| band `paddingInner` = 0.1 | **renderer-invariant** (2 themes × 3 sizes) |
| SVG `<rect>` marks, unrounded, antialiased | **renderer-invariant** (unchanged across themes) |
| linear value scale | **renderer-invariant** |
| cram all categories; no scroll | **Classic-specific** — and matches Theme Studio |
| legend on top | **Classic-specific** — and matches Theme Studio |
| axis titles rendered | **Classic-specific** — and matches Theme Studio |
| reduce to one category and scroll | **Fluent-specific** |
| legend at bottom | **Fluent-specific** |
| container padding 34 vs 10 | **theme-dependent** |
| axis text 14px → 12px with size | **UNKNOWN** — both sizes were Fluent; Classic measured at one size only |
| automatic axis maximum 50 | **UNKNOWN** — only measured under Fluent |
| category `innerPadding` (55.2% vs 23.3%) | **UNKNOWN** — theme and size both differ between the two |

The pattern worth noting: **on every point where Classic differs from
Fluent, Classic is what Theme Studio already does.** Theme Studio was not
wrong; it was being compared against the wrong theme.

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
| `clusteredGapSize` subdivides a fixed category slot, affecting nothing else | `PROVEN-EXPERIMENT` (§7.1) |
| Theme Studio's band model predicts Power BI's response to a gap change | `PROVEN-EXPERIMENT` (§7.1) |
| Power BI antialiases fractional edges (2 phases sampled) | `PROVEN-EXPERIMENT` |
| Theme Studio antialiases **under the hero transform** (1 clean sample) | `PROVEN-EXPERIMENT` |
| `estimateText` error is the 0.55 heuristic | `STRONGLY-SUPPORTED` — two independent browser measurements agree to 0.4% |
| Axis maximum is a nice-number rounding | `STRONGLY-SUPPORTED` — one data point (46→50) plus `Le = 20` px/tick |
| Tick density is width-driven | `INFERENCE` — `bestTickCount = min(domainSpan, pixelSpan / 20)` read from the bundle; the nice-interval selection was not isolated |
| Category `innerPadding` ≈ 55.2% | `INFERENCE` — outer padding unknown |
| **Fluent** axis text is 12px at 600×206 and 14px at 600×600 | `PROVEN-EXPERIMENT`, **`FLUENT-ONLY`** (§5.8) |
| **Fluent** drops categories and scrolls rather than compressing | `PROVEN-EXPERIMENT`, **`FLUENT-ONLY`** (§5.8) |
| **Classic** crams all four categories instead | `STRONGLY-SUPPORTED` — manual observation, not yet instrumented |
| Report theme changes responsive layout, not just styling | `PROVEN-EXPERIMENT` — the two behaviours differ |
| Theme Studio's text is lighter than native at matched aspect | `PROVEN-EXPERIMENT`, **`FLUENT-ONLY`** (§5.8) |
| The rule behind Fluent's responsive axis text | `UNKNOWN` — two sizes sampled |
| Whether Classic scales axis text with size at all | `UNKNOWN` — not measured |
| Whether the axis maximum rule is theme-dependent | `UNKNOWN` — only measured under Fluent |
| Whether `paddingInner` 0.1 holds under Classic | `UNKNOWN` — three Fluent measurements agree |
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

### 7.1 First experiment: "Space between series" 10 → 40

One human action, nothing else touched. The diff:

```
changed  rect.bar.setFocusRing#0      rect.h: 14.3211 -> 10.649   (-3.6721)
…                                     (all twelve bars)
changed  rect.bar.setFocusRing#4      rect.y: 140.1216 -> 141.9577 (+1.8361)
changed  rect.bar.setFocusRing#8      rect.y: 156.034  -> 159.7061 (+3.6721)

unchanged 23   added 0   removed 0   changed 12
```

**What moved:** every bar thinned by the same 3.6721, series 1 shifted down
1.8361 and series 2 by exactly twice that. **What did not:** the plot, the
category slot, the value scale, the axis, the gridlines, the legend —
23 elements untouched, nothing added or removed.

So `clusteredGapSize` subdivides a **fixed** category slot and touches
nothing outside it. That answers the question directly rather than by
inference: category slot unchanged, series step changed, band width changed,
series positions changed, plot and axis unchanged.

**And Theme Studio predicts it.** Feeding `clusteredSeriesBands` the same
slot and the new gap, without touching the code:

| | Theme Studio | Power BI measured | delta |
|---|---:|---:|---:|
| step at gap 10 | 15.912356 | 15.912356 | 0 |
| band at gap 10 | 14.321120 | 14.321100 | 2.0e-5 |
| step at gap 40 | 17.748397 | 17.748397 | 7.7e-8 |
| band at gap 40 | 10.649038 | 10.649000 | 3.8e-5 |
| series 1 shift | 1.836000 | 1.836100 | 1.0e-4 |
| series 2 shift | 3.672100 | 3.672100 | 4.4e-16 |

The residuals are the snapshot's four-decimal rounding, not model error.
This is a **predictive** confirmation rather than a descriptive one: the
model was derived from bundle archaeology, and it correctly anticipates how
Power BI responds to a setting a user changes. `PROVEN-EXPERIMENT`.

It also validates the workflow itself — a one-property change produced
twelve relevant lines and no noise.

---

## 8. Unresolved

0. **The whole native dataset needs repeating under Classic 2026.** This is
   now the top priority and blocks every size-responsive conclusion. Needed
   at 600×206 and at Theme Studio's exact 372×128: axis and legend font
   sizes, plot geometry, categories and bars rendered, `svgScrollable`
   dimensions, band geometry. Classic 2018 as well, if cheap, to see whether
   both Classic bases share one density behaviour.

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
2. ~~**Category density behaviour.**~~ **Withdrawn.** It rested on Fluent-only
   evidence. Classic — Theme Studio's actual baseline — crams all four
   categories, which is what Theme Studio already does, so there may be
   nothing to adopt here at all. Re-open only after the Classic measurement.

2b. ~~**Responsive axis typography.**~~ **Withdrawn** for the same reason:
   measured only under Fluent, and Fluent is demonstrably not representative
   of Classic for size-responsive behaviour.
3. **`estimateText` calibration.** ~0.50 em rather than 0.55, or a real
   measurement. Well evidenced, small, affects every gutter.
4. **Tick count.** Width-driven rather than a fixed 4.
5. **Axis titles off by default**, matching the native default state.
6. **Legend default position** — bottom, not top.

Nothing about mark primitives: §5.7 removed the motivation for an SVG
migration under the hero, and left the untransformed case unmeasured.
