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

*(§5.13 adds four more Fluent sizes: 14px at 600 × 600 and 12px at all five
smaller tested sizes. The change is now **bracketed** between 600 and 300
height rather than merely observed, but six samples still do not establish
the rule.)*

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
| axis **label** size responsiveness | **theme-dependent** — Fluent 14px→12px; no responsive change observed across the three tested Classic sizes (§5.11) |
| automatic axis maximum 50 | **renderer-invariant** — 46→50 under Classic and Fluent alike (§5.11) |
| category `innerPadding` (Classic 23.33% vs Fluent 55.2%) | **theme-dependent** — de-confounded at the same 600×600 (§5.11) |

The pattern worth noting: **on every point where Classic differs from
Fluent, Classic is what Theme Studio already does.** Theme Studio was not
wrong; it was being compared against the wrong theme.

### 5.10 Like-for-like: Classic at 372 × 128

The native visual authored at **exactly Theme Studio's box**, under the
matching theme family. Same size, same data, same theme lineage — the first
comparison in this document with no confound to normalise away.

| | Classic Power BI | Theme Studio |
|---|---:|---:|
| plot | 256 × 61 | 271 × 86.2 |
| plot w ÷ visual w | 68.8% | 72.8% |
| plot h ÷ visual h | **47.7%** | **67.3%** |
| **categories drawn** | **2 of 4** | **4 of 4** |
| **bars drawn** | **6 of 12** | **12 of 12** |
| category labels | 2 | 4 |
| value axis labels | **0** | **5** |
| legend | **dropped** | rendered |
| axis label size | **12px** | **13.3333px** (+11.1%) |
| band `paddingInner` | **0.100000** | **0.100000** |
| band width | 4.9655 | 6.0156 |
| category step | 23.4615 | 21.5445 |
| implied category `innerPadding` | 31.8% | 10.0% |

#### The finding: Theme Studio over-draws

In the same box, native Classic **sheds furniture** as space runs out. It
drops the legend entirely, drops every value-axis label, and draws two of
four categories. Theme Studio draws all of it — legend, five value labels,
four categories, twelve bars — at 11% larger text.

That is the real explanation for the crowding, and it is neither of the two
I offered earlier. Not "the fonts are too large" (§5.4, an aspect artefact)
and not "the box is the wrong aspect" (§5.8, Fluent-scoped). At identical
size against its own theme family, **Theme Studio renders roughly twice the
furniture in the same space.**

Power BI's response to a small visual is progressive decluttering. Theme
Studio has no such behaviour: everything that can be drawn is drawn, and
Task 7's legibility floor then has to defend a box carrying far more than
the native renderer would put in it.

#### `paddingInner` again

**0.100000.** Fifth measurement, two themes, four visual sizes. Nothing has
moved it.

#### The one distinction that still matters

Classic renders axis labels at **12px at both measured sizes** — 600 × 206
and 372 × 128. Fluent went 14px → 12px between 600 × 600 and 600 × 206. So
either:

- **(a)** Classic's default axis size simply *is* 9pt/12px, and Theme
  Studio's Classic 2026 fallback of 10pt/13.3333px is one point too large;
  or
- **(b)** Classic also scales with size, and both measured sizes happen to
  sit below the same breakpoint.

These call for completely different work — (a) is a fallback correction,
(b) is a new responsive behaviour — and they cannot be told apart without a
~~**large** Classic visual. `UNKNOWN` until then, and no implementation should
be chosen on the strength of a guess between them.~~

> **Superseded — it is (a).** Large Classic visuals have since been measured:
> §5.11 (600 × 600), §5.12 (twelve sizes) and §5.13 (six sizes under each of
> two Classic bases). Classic 2026's category axis label is **12px at every
> tested size**, from 600 × 600 down to 372 × 128, so it is a default rather
> than a size-responsive value, and Theme Studio's 10pt/13.3333px fallback is
> one point too large. That is §9 candidate 1, still not implemented here.
> (Legend and axis *titles* do respond to height under Classic 2026 — the
> category label is the part that does not.)

### 5.11 Classic at 600 × 600 — the Classic dataset completed

Third Classic size. Plot **486 × 485.667**, all four categories, twelve bars.

#### Typography across all three Classic sizes

| Role | 600×600 | 600×206 | 372×128 | Theme Studio (Classic 2026) |
|---|---|---|---|---|
| **axis labels** | **12px** | **12px** | **12px** | category **13.3333px**, value 12px |
| axis titles | **16px** | **12px** | 12px | 16px |
| legend | **13.3333px** | **12px** | dropped | 13.3333px |
| visual title | 18.6667px | 18.6667px | 18.6667px | n/a |

This resolves §5.10's open question, and the answer is *both* of its options
applying to different roles:

- **No responsive axis-label size change was observed across the three
  visual area — 600×600, 600×206 and 372×128. Three sizes are not the whole
  9pt/12px**, and Theme Studio's category-label fallback of 10pt/13.3333px
  is one point too large. Its *value*-label fallback of 12px already
  matches.
- **Axis titles and the legend ARE responsive.** Titles 12px → 16px and
  legend 12px → 13.3333px as the visual grows. Theme Studio matches both
  **at 600 × 600** and does not shrink them at smaller sizes.

So there is a fallback bug *and* a missing behaviour, and they are separate.

#### Geometry

| | value | note |
|---|---|---|
| category step | 105.579710 | |
| series step | 27.911877 | |
| band width | 25.120690 | |
| **band `paddingInner`** | **0.100000** | **sixth** exact measurement |
| cluster span | 80.944444 | |
| implied category `innerPadding` | **23.33%** | 23.3% at 600×206 too |
| px per data unit | 9.720000 | exactly linear |
| **automatic axis maximum** | **50.000** | data max 46 |

#### Two things this settles

**The axis-maximum rule is theme-invariant.** 46 → 50 under Classic exactly
as under Fluent. Whatever picks the nice number does not consult the theme.

**Category `innerPadding` IS theme-dependent, now de-confounded.** At the
same 600 × 600: Classic **23.33%**, Fluent **55.2%**. Theme Studio's Classic
fallback is **10%**, so it is too tight against its own baseline by a wide
margin — its categories sit closer together than native Classic's.

*(The 31.8% measured at 372 × 128 came from a state with only two of four
categories drawn, so its outer-padding term is not comparable. The two
full-category measurements agree at 23.33%.)*

### 5.12 Unattended Classic size sweep — twelve states, no human

Run by the lab controller (`tools/pbi-render-probe/LAB.md`) without any
manual step: it resized the visual twelve times through Power BI's own
Format pane, waited for each render to settle, measured, then restored
600 × 600 and verified.

| size | plot | bars | cats | cat label | legend | value labels |
|---|---|---:|---:|---|---|---:|
| 600×600 | 486 × 485.7 | 12 | 4 | 12px | 13.333px | 3 |
| 600×500 | 486 × 385.7 | 12 | 4 | 12px | 13.333px | 3 |
| 600×450 | 486 × 335.7 | 12 | 4 | 12px | 13.333px | 3 |
| 600×400 | 486 × 285.7 | 12 | 4 | 12px | 13.333px | 3 |
| 600×350 | 486 × 235.7 | 12 | 4 | 12px | 13.333px | 3 |
| 600×300 | 486 × 185.7 | 12 | 4 | 12px | 13.333px | 3 |
| 600×250 | 490 × 141 | 12 | 4 | 12px | **12px** | 3 |
| 600×206 | 490 × 97 | 12 | 4 | 12px | 12px | 3 |
| 500×300 | 386 × 185.7 | 12 | 4 | 12px | 13.333px | 3 |
| 450×250 | 340 × 141 | 12 | 4 | 12px | 12px | 3 |
| 400×225 | 290 × 97 | 12 | 4 | 12px | 12px | **2** |
| 372×128 | 256 × 61 | **6** | **2** | 12px | **none** | **0** |

#### The category axis label never moves

**12px at all twelve sizes**, across a 7.4× range of visual area. The
earlier three-sample finding is now a twelve-sample one: Classic's axis
label size is fixed, and Theme Studio's Classic 2026 fallback of
10pt/13.3333px is simply a point too large.

#### The responsive cascade, by height

Legend and axis titles shrink together at a **height** threshold between
250 and 300 — 500 × 300 keeps the large sizes while 450 × 250 does not, so
width is not what drives it:

| | legend | axis titles |
|---|---|---|
| height ≥ 300 | 13.333px | 16px |
| height ≤ 250 | 12px | 12px |

Then furniture is shed, in order:

1. **value labels thin** — 3 → 2 between 450×250 and 400×225
2. **legend disappears entirely** — between 400×225 and 372×128
3. **value labels disappear** — same step
4. **categories halve** — 4 → 2, bars 12 → 6, same step

Category count is the *last* thing Classic gives up, which is the opposite
of Fluent, where reducing to one visible category was the *first* response
(§5.9).

#### A candidate size, chosen rather than guessed

The smallest **tested** size in this sweep at which native Classic still
renders the complete furniture set — twelve bars, four categories, legend,
three value labels — is **450 × 250**. At 400 × 225 value labels begin
thinning; by 372 × 128 half the data is gone.

That makes it a strong candidate **for the Clustered Bar primary preview,
against this fixture**. It is not a universal cartesian canonical size: the
sweep tested one visual type, one dataset and one formatting state, and the
true threshold lies somewhere between 400 × 225 and 450 × 250 rather than at
either sampled point.

§5.13 adds a second caveat: the "complete furniture set" is itself
theme-resolved. Classic 2018 renders no axis titles at any size, so what
counts as complete differs by theme, and this threshold is **Classic 2026's**
against this fixture.

Theme Studio's box is **372 × 128**, where native Classic 2026 draws 6 bars,
2 categories, no legend and no value labels. Theme Studio draws all twelve
bars, four categories, a legend and five value labels in that space.

So there are two coherent directions, and this measurement is what makes
them a choice rather than a guess:

- **grow the preview box** toward the 400–450 × 225–250 region, where native
  still shows everything Theme Studio shows; or
- **adopt progressive decluttering**, and shed furniture at the same points
  **Classic 2026** does — §5.13 measured Classic 2018 shedding at different
  points, so there is no single "what Classic does" to copy.

Neither is implemented. Both now have a measured basis.

### 5.13 Unattended theme × size matrix — 18 variants, no human

Three base themes × six sizes, run by the lab controller with the theme
switched through Power BI's own Base theme control. **Every variant rereads
that control immediately before it is measured**, and a variant whose reread
is not the requested theme is failed rather than filed. Verifying once per
theme and reusing the answer across its six sizes would attest to the theme
at the top of the group rather than to the theme each measurement was taken
under — a weaker guarantee than it sounds, and mislabelled measurements are
what made an earlier dataset unusable. Gap 10, 100% zoom, same fixture
throughout. Restored and verified at the end.

The theme is still only *switched* when it changes, so the six sizes of a
theme are measured without re-rendering the report between them. Only the
reread repeats, and it is cheap next to a theme switch.

**Run twice.** The matrix was first collected with the theme verified once
per theme group, then re-collected end to end with the per-variant reread
described above. 433 scalar measurements across the 18 variants, **zero
differences**, all 18 verified against the control, restoration clean both
times. The table below is the second run.

| size | Classic 2026 | Classic 2018 | Fluent 2 |
|---|---|---|---|
| 600×600 | 486×486, 12 bars, 4 cats | 515×516, 12, 4 | 471×443, 12, 4 |
| 600×300 | 486×186, 12, 4 | 515×216, 12, 4 | 483×148, 12, 4 |
| 600×250 | 490×141, 12, 4 | 515×166, 12, 4 | 483×98, 12, 4 |
| 450×250 | 340×141, 12, 4 | 365×166, 12, 4 | 333×98, 12, 4 |
| 400×225 | 290×97, 12, 4 | 315×141, 12, 4 | 275×73, **6, 2** |
| 372×128 | 256×61, **6, 2** | 279×44, **3, 1** | 247×52, **3, 1** |

Typography, across all six sizes of each theme:

| | category label | legend | axis titles |
|---|---|---|---|
| Classic 2026 | **12px** throughout | 13.333 → 12 at height 250 | **rendered**, 16 → 12 at height 250 |
| Classic 2018 | **10.667px** throughout | **10.667px** throughout | **never rendered** |
| Fluent 2 | **14px** at 600×600, 12 below | 14 → 12 | **never rendered** |

#### The two Classic themes do NOT share density behaviour

This was the open question, and the answer is no. Classic 2018 differs from
Classic 2026 more than it resembles it:

- **no axis titles at all**, where 2026 renders both;
- category labels at **10.667px (8pt)** against 2026's 12px (9pt);
- **six** value labels where 2026 draws three;
- a **larger plot** at every size (515×516 vs 486×486 at 600×600), which
  follows from not spending space on axis titles;
- and it sheds *harder* at the smallest size — down to **3 bars and one
  category** where 2026 keeps 6 and 2.

On shedding behaviour Classic 2018 is closer to Fluent 2 than to Classic
2026. "The Classic themes behave one way and Fluent another" is not true.

#### Responsive typography is theme-specific too

Classic 2026 holds its category label fixed while shrinking legend and axis
titles at a height threshold. Classic 2018 shows **no responsive typography
at all** across the tested range. Fluent 2 shrinks its category label
between 600 and 300 height, which neither Classic does.

#### `paddingInner` = 0.1 in all eighteen variants

Three themes, six sizes, every one exactly 0.100000. Together with the gap
experiments (§7.1 by hand, §7.2 autonomously) this is the most heavily
confirmed finding in the investigation, and the one Theme Studio already
implements correctly.

#### Theme-resolved default, or different algorithm?

Worth separating, and the matrix does not fully separate them.

Axis-title visibility and font sizes are plainly **theme-resolved defaults**:
a theme sets them, and the same renderer then draws what it was told. The
*shedding thresholds* are less clear. A theme that renders axis titles and
larger text has less room left, so it may shed earlier for entirely
ordinary reasons — which would make one algorithm with different inputs,
not a theme-conditional algorithm.

But that reading does not survive contact with the numbers. Classic 2018
carries the **least** furniture (no axis titles, smallest text) and the
**largest** plot, yet sheds **hardest** at 372×128 — 3 bars where Classic
2026 keeps 6. Less to draw and more room to draw it in, and it still gives
up sooner.

So the difference **cannot be explained by the measured typography, visible
furniture and available plot area alone**. It does not follow that the cause
lies outside theme-resolved defaults generally, and this evidence cannot
show that: a minimum category thickness, a density or scroll threshold, a
padding or layout default — any value a theme resolves and hands to a common
renderer — would produce exactly this pattern, and none of them was measured
here.

Whether the remaining cause is another theme-resolved default or genuinely
theme-conditional renderer logic **remains unknown**.

`INFERENCE / UNKNOWN CAUSE`. The mechanism is deliberately deferred: it
needs a controlled experiment varying one resolved default at a time, which
is a different piece of work from this diagnostic.

#### For Theme Studio

Its baseline is Classic 2026, which renders axis titles and holds its
category label at 12px — so the earlier findings against that theme stand,
and the fallback comparisons in §5.10 and §5.11 are unaffected.

### 5.14 The first corrections, verified against the oracle

Three fidelity corrections landed on `p2-cartesian-native-fidelity`, and
this is what they moved. Theme Studio measured in the browser at its
natural preview size; native measured by the lab at gap 10, Classic 2026,
100% zoom.

#### Theme Studio, before and after

| | before | after | native Classic 2026 |
|---|---:|---:|---:|
| category label | 13.333px | **12px** | **12px** |
| value label | 12px | 12px | 12px |
| legend | 13.333px | 13.333px | 13.333px |
| axis title | 16px | 16px | 16px |
| category `innerPadding` | 0.1007 | **0.2007** | 0.2334 effective / **20 declared** |
| series `paddingInner` | 0.0984 | **0.1** | **0.1** |
| category gutter | 98.92 | **86.09** | — |
| plot width | 271.08 | **283.91** | — |
| plot share of box | 0.733 | **0.767** | 0.756 at 450×250 |

The four typography rows are now exact against native, and the three that
were already right did not move — which is the check that the category
correction went in at the role rather than at the class every other role
shares.

#### The native reference states

Two sizes, both retaining the full furniture set, measured in one
unattended run:

| | 450 × 250 | 600 × 300 |
|---|---:|---:|
| plot | 340 × 141 | 486 × 185.667 |
| category step | 30.652 | 40.362 |
| band | 7.293 | 9.603 |
| series step | 8.103 | 10.670 |
| series `paddingInner` | 0.1 | 0.1 |
| category `innerPadding` (effective) | 0.2334 | 0.2334 |
| plot height ÷ category step | 4.600 | 4.600 |
| band ÷ category step | 0.2379 | 0.2379 |
| category label | 12px | 12px |
| legend | 12px | 13.333px |
| axis title | 12px | 16px |

Every normalised ratio is identical at both sizes, which is what a scale-
free layout model should produce and is a useful check on the measurements
themselves. The typography rows differ because Classic 2026 shrinks legend
and axis titles at a height threshold between 250 and 300 (§5.12) — the
category label does not move, and neither does Theme Studio's.

#### The category padding is a property, not a ratio

Worth stating plainly, because it is the trap this correction nearly fell
into. Power BI's **"Space between categories" control reads 20**, and the
geometry it produces measures **23.34%** of the category step. Both numbers
are correct; they are different quantities. The extra comes from Power BI
insetting the cluster within its band and carrying an outer padding of
about 0.4 × step at each end of the plot, neither of which this layout
engine models.

Fluent settles it independently: it **declares** `innerPadding` 50 in its
own `visualStyles`, and its geometry **measures** 55.2%. The same gap
between the declared property and the ratio it produces, in a theme where
the declared value is not in doubt. So the fallback belongs on the declared
property, and 20 is what Theme Studio now uses.

The effective ratio is also **gap-independent**: 0.2334 at series gap 0 and
0.2334 at gap 10, which is what §7.1 and §7.2 predict — the gap subdivides
the category slot without resizing it.

#### What is still different

1. **The outer padding.** Native leaves 0.4 × step of empty plot at each end
   of the category axis; Theme Studio tiles its categories edge to edge.
   This is now a measured quantity rather than the "outer padding unknown"
   that made §5.11's `innerPadding` an inference, and it is the largest
   remaining geometric delta on the category axis.
2. **Non-plot width.** Native spends 110px at 450 wide and 114px at 600 —
   nearly constant, and far more than the 60.5px its widest label needs.
   Theme Studio now spends 86px at 370 wide. Since the text component is
   exact after the measurement fix, the residual is fixed padding around the
   axis, not measurement. (Both figures are total non-plot width, so each
   includes whatever margin its renderer leaves on the far side.)
3. **Responsive typography.** Native shrinks legend and axis titles below a
   height threshold; Theme Studio does not. Deferred deliberately (§9.2b).

### 5.15 Which text class the category axis actually takes

§5.14 changed `categoryAxisLabel` from `lightLabel` to `smallLightLabel` on
the strength of a size: native Classic 2026 renders 12px, and 12px = 9pt =
its declared `label` × 0.9. That proved the **number**. It did not prove the
**mechanism**, and the two have different consequences for anyone who edits
a theme — a 9pt visual-property default stays 9pt when a user raises their
`label` class, where a ×0.9 class does not.

Microsoft's published table associates category axis labels with
`lightLabel` (BASE_THEME_DIFFERENTIAL_AUDIT.md §4.1), so this needed
settling rather than asserting.

#### The controls, at baseline

Power BI's own Font Size control, read through the Format pane under each
base theme:

| base theme | category axis | value axis | rendered | theme's `label` | ratio |
|---|---:|---:|---:|---:|---:|
| Classic 2026 | **9pt** | 9pt | 12px | 10pt | 0.90 |
| Classic 2018 | **8pt** | 8pt | 10.667px | 10pt | **0.80** |
| Fluent 2 | **10.5pt** | 10.5pt | 14px | 10.5pt | 1.00 |

Three ratios from three themes, which on its own looks like three
visual-property defaults. Fluent's is one: it declares `fontSize` 10.5 in
its own `visualStyles`. Classic 2018's 8pt is not explained by anything in
its theme file, which declares `label` 10pt and no axis typography at all.

#### The decisive experiment

Raise the report theme's **primary text size** (Theme pane → Text → General,
which is the `label` class) from 10pt to 20pt under Classic 2026, change
nothing else, and watch which roles follow:

| role | before | after | scale |
|---|---|---|---|
| category axis | 9pt / 12px | **18pt / 24px** | **×0.9** |
| value axis | 9pt / 12px | 18pt / 24px | ×0.9 |
| legend | 10pt / 13.333px | 26.667px | ×1.0 |
| axis titles | 12pt / 16px | 16px | unmoved |

**Outcome B.** The category axis derives from the primary label class with
the 0.9 scale — it is `smallLightLabel`, and Power BI's own control says so:
it reads **18** after the change, so this is the renderer's resolution and
not an inference from pixels.

The legend is the control in the experiment. It moved **1:1** in the same
run, which rules out "the theme scaled everything" and shows the two roles
genuinely take different classes. Axis titles did not move at all, which is
`title` behaving exactly as documented.

So the published table is wrong on this one row, and Theme Studio follows
the runtime. The consequence is the point: a custom theme setting `label`
to 20pt renders its category axis at 18pt, and only the class mapping
reproduces that. Modelling 9pt as a visual-property default would have been
right for the baseline and wrong for every theme a user edits.

Restored to 10pt afterwards and verified.

#### What this does not settle

Classic 2018's **8pt**. It declares the same `label` 10pt as Classic 2026
and no axis typography, yet resolves 8pt — and its legend renders at
10.667px too, so under 2018 even the legend is not the unscaled label
class. The same experiment under Classic 2018 could not be run: after the
base-theme switch the Theme pane's General control was no longer where the
controller could find it, and chasing that was out of scope here.

This is the third finding to land on the same wall — shedding thresholds
(§5.13), category typography (here), and axis-label sizing — where Classic
2018 differs from Classic 2026 in ways nothing in either theme file
explains. `UNKNOWN`, and the most valuable single question the lab could
answer next.

### 5.16 The category scale — outer padding, solved

§5.14 left the largest category-axis delta open: native reserves empty plot
at each end of the category axis and Theme Studio tiled edge to edge. One
state suggested 0.4 of a step at each end, which is a clean fit and exactly
the kind of number that is a coincidence until it is varied.

#### Twelve states, unattended

Classic 2026, Clustered bar, four categories, series gap 10, 100% zoom, two
visual sizes × six values of Power BI's own "Space between categories"
control. `pOuter solved` inverts the band equation
`plot / step = count − pInner + 2 × pOuter`; `pOuter lead` is the measured
distance from the plot edge to the first band, divided by the step. They
are independent of each other.

| size | spacing | plot | step | band | plot / step | pOuter solved | pOuter lead |
|---|---:|---:|---:|---:|---:|---:|---:|
| 450×250 | 0 | 141 | 29.375 | 29.375 | **4.80** | **0.4000** | **0.4000** |
| 450×250 | 10 | 141 | 30.000 | 26.438 | **4.70** | **0.4000** | **0.4000** |
| 450×250 | 20 | 141 | 30.652 | 23.500 | **4.60** | **0.4000** | **0.4000** |
| 450×250 | 30 | 141 | 31.333 | 20.563 | **4.50** | **0.4000** | **0.4000** |
| 450×250 | 50 | 141 | 32.791 | 14.688 | **4.30** | **0.4000** | **0.4000** |
| 450×250 | 75 | 141 | 34.815 | 7.344 | **4.05** | **0.4000** | **0.4000** |
| 600×300 | 0 | 185.667 | 38.681 | 38.681 | **4.80** | **0.4000** | **0.4000** |
| 600×300 | 10 | 185.667 | 39.504 | 34.813 | **4.70** | **0.4000** | **0.4000** |
| 600×300 | 20 | 185.667 | 40.362 | 30.944 | **4.60** | **0.4000** | **0.4000** |
| 600×300 | 30 | 185.667 | 41.259 | 27.076 | **4.50** | **0.4000** | **0.4000** |
| 600×300 | 50 | 185.667 | 43.178 | 19.340 | **4.30** | **0.4000** | **0.4000** |
| 600×300 | 75 | 185.667 | 45.844 | 9.670 | **4.05** | **0.4000** | **0.4000** |

Spread in `pOuter solved` across all twelve: **0**. Spread in the
leading-edge figure: **0**. Two independent routes to the same constant, at
six different inner paddings and two sizes.

**Classification: A — exact and stable.**

The `plot / step` column is the point. It moves with the inner padding in
exactly the way a band scale predicts and an "outer padding is a fixed
share of the plot" model does not, and it lands on 4.80, 4.70, 4.60, 4.50,
4.30 and 4.05 rather than near them.

#### Runtime corroboration

Power BI Desktop's own cartesian bundle resolves the term as

> `outerPaddingRatio = explicit ?? (axesVisible !== false ? 0.4 : 0)`

— the same 0.4, plus a rule the sweep could not reach: a hidden category
axis takes **0**. It also converts between pixels and ratio as
`ratio = outerPadding / categoryThickness` with an assertion that the ratio
is in `[0, 4)`, and applies the pixel offset only when the axis is of
category kind — so a value axis never receives it. `PROVEN-RUNTIME` for the
shape of the rule; the constant itself is `PROVEN-EXPERIMENT` above.

Two things worth recording rather than acting on:

- `categoryAxis.outerPadding` **is** a registered Power BI property, with a
  display name and an integer type, but it is gated behind a
  `cartesianOuterPaddingControl` feature switch and does not appear in the
  Format pane of this build. It is modelled here as scale behaviour, not
  added to the theme editor.
- ~~The bundle's thickness helper is `available / max(1, count + 2 × ratio)`,
  with no inner-padding term. That is a *candidate* thickness used while
  fitting; the scale Power BI actually renders includes the inner padding,
  as the twelve states show.~~

  > **Corrected in §5.18.** That helper is not a candidate and is not
  > inconsistent with the measured step: it computes a different quantity.
  > `available / (count + 2 × pOuter)` is the category **thickness**, which
  > sizes marks; the band scale's **step**, which positions them, does
  > carry the inner padding. Both rules are true and feed different stages
  > of the renderer. Reading a formula that did not match the measurement
  > and concluding the formula was the wrong one was the error — the
  > right conclusion was that it answered a different question.

#### The rule, stated independently

```
pOuter = categoryAxisVisible ? 0.4 : 0
step   = plotExtent / max(1, count − pInner + 2 × pOuter)
start(i) = plotStart + pOuter × step + i × step
size     = step × (1 − pInner)
```

The band sits **flush against the start of its step**, not centred in it:
native's leading edge is exactly `pOuter × step` at every measured state,
which centring cannot produce — centring would put it at
`pOuter × step + (step − band) / 2`.

#### What this does not explain — answered in §5.18

The drawn cluster of bars is slightly narrower than `step × (1 − pInner)`,
and by a margin that grows with the spacing: at spacing 20 the band measures
0.7667 of a step against the 0.80 the declared property implies, and at 50
it is 0.4479 against 0.50.

> **Resolved.** Not a series-scale effect and not a declared-versus-
> effective discrepancy: the mark is sized from the category **thickness**,
> a third quantity that carries no inner padding, rather than from the
> positioning band. §5.18 predicts all twelve of these numbers exactly.

### 5.17 The category scale, verified in Theme Studio

Measured in the browser at Theme Studio's natural preview size, before and
after the change, against the native reference at "Space between
categories" 20. Everything is normalised by the category step, so the
differing box sizes do not enter into it.

| | before | after | native |
|---|---:|---:|---:|
| plot ÷ step | 3.9978 | **4.5975** | **4.6000** |
| leading edge ÷ step | 0.0993 | **0.3992** | **0.4000** |
| trailing edge ÷ step | 0.1007 | **0.4008** | 0.4000 (band) / 0.4333 (drawn) |
| band ÷ step | 0.7993 | 0.7992 | 0.7667 (drawn) |
| series step ÷ step | 0.2754 | 0.2750 | 0.2644 |
| bar ÷ step | 0.2478 | 0.2475 | 0.2379 |
| series `paddingInner` | 0.1 | 0.1 | 0.1 |
| category step, px | 21.563 | 18.750 | — |

Before, Theme Studio put **4.00** steps in the plot and inset each band by
half its inner padding — categories tiled edge to edge and the first band
began 0.099 of a step in. After, it puts **4.5975** steps in and begins
0.3992 of a step in, against native's 4.6000 and 0.4000.

The residuals in the third decimal are the measurement, not the model: the
browser lays out at fractional pixels and the hero scales by 1.5, so a
figure read back from `getBoundingClientRect` and divided by 1.5 cannot
resolve better than about 0.001 of a step. The pure scale is exact — the
unit tests assert 4.6000 and 0.4000 with a 1e-9 tolerance.

#### The residual that remained — closed in §5.19

`band ÷ step` is 0.799 against native's 0.767, and the two rows below it
follow from that one: Theme Studio's series scale divides a slightly wider
band, so its series step and bar thickness are proportionally larger.

> The reading here — that this was the series scale, and a
> declared-versus-effective discrepancy in the inner padding — was wrong.
> §5.18 shows the mark is sized from a **category thickness** that carries
> no inner padding, which is a third quantity; §5.19 measures the result
> after implementing it.

Nothing else moved: the plot rectangle, both gutters, the axis typography
and the series `paddingInner` are identical before and after.

### 5.18 Three quantities, not one — step, thickness and width

§5.16 left one residual: the drawn cluster was narrower than the
positioning band, by a margin that grew with the category spacing. It was
filed as a series-scale problem. It was not one.

#### The missing abstraction

Power BI keeps **three** numbers where Theme Studio kept one:

| | formula | what it does |
|---|---|---|
| **step** | `plot / (count − pInner + 2 × pOuter)` | where a category sits |
| **thickness** | `plot / (count + 2 × pOuter)` | — |
| **width** | `thickness × (1 − pInner)` | how much of it a mark fills |

The thickness has **no inner-padding term at all**. That is why the mark is
not the band: a band scale takes the inner padding out of the step and then
gives it back by widening the step, so `step > thickness` whenever the
spacing is non-zero. The mark never sees that widening.

#### Checked against the twelve states already measured

Before running anything new, the §5.16 sweep was re-solved with the
three-quantity model. Predicting **both** the step and the cluster extent
for all twelve states, from the plot extent alone:

| | worst error |
|---|---:|
| category step | 5.3e-5 |
| category width | 5.0e-5 |

Both are the four-decimal rounding in the capture. The thickness came out
constant at **29.375** across all six spacings at 450×250 and **38.6806**
at 600×300 — which is the whole claim in one number, since the step moved
over the same range and the thickness did not.

#### The runtime distinguishes them too

Power BI Desktop's cartesian bundle builds the positioning scale literally
as

> `d3.scaleBand().range([0, pixelSpan]).paddingInner(innerPaddingRatio).paddingOuter(outerPaddingRatio)`

which is exactly the step and leading edge measured in §5.16, and computes
the thickness in a separate helper as `available / max(1, count + 2 ×
ratio)`. The mark extent is `categoryThickness × (1 − innerPaddingRatio)`,
already transcribed in `app/lib/seriesBands.ts` from an earlier pass, and it
is what the clustered-series scale divides. `PROVEN-RUNTIME` for the
distinction; the numbers below are `PROVEN-EXPERIMENT`.

#### The orthogonal experiment — nine states, designed to falsify

Rather than another sweep along one axis, both levels were varied
independently: category spacing 0/20/50 × series gap 0/10/40, Classic 2026,
Clustered bar, 450×250, unattended. The prediction chain runs plot → step →
thickness → width → `clusteredSeriesBands` → series step and bar thickness,
**with no fitted parameter** — the series model is the one already in the
repository, handed the predicted width.

| spacing | gap | step native / predicted | thickness | width native / predicted | series step native / predicted | bar native / predicted |
|---:|---:|---|---:|---|---|---|
| 0 | 0 | 29.3750 / 29.3750 | 29.3750 | 29.3750 / 29.3750 | 9.792 / 9.7917 | 9.792 / 9.7917 |
| 0 | 10 | 29.3750 / 29.3750 | 29.3750 | 29.3750 / 29.3750 | 10.129 / 10.1293 | 9.116 / 9.1164 |
| 0 | 40 | 29.3750 / 29.3750 | 29.3750 | 29.3750 / 29.3750 | 11.298 / 11.2981 | 6.779 / 6.7788 |
| 20 | 0 | 30.6522 / 30.6522 | 29.3750 | 23.5000 / 23.5000 | 7.833 / 7.8333 | 7.833 / 7.8333 |
| 20 | 10 | 30.6522 / 30.6522 | 29.3750 | 23.5000 / 23.5000 | 8.103 / 8.1034 | 7.293 / 7.2931 |
| 20 | 40 | 30.6522 / 30.6522 | 29.3750 | 23.5000 / 23.5000 | 9.038 / 9.0385 | 5.423 / 5.4231 |
| 50 | 0 | 32.7907 / 32.7907 | 29.3750 | 14.6875 / 14.6875 | 4.896 / 4.8958 | 4.896 / 4.8958 |
| 50 | 10 | 32.7907 / 32.7907 | 29.3750 | 14.6875 / 14.6875 | 5.065 / 5.0647 | 4.558 / 4.5582 |
| 50 | 40 | 32.7907 / 32.7907 | 29.3750 | 14.6875 / 14.6875 | 5.649 / 5.6490 | 3.389 / 3.3894 |

Worst absolute errors: step **0**, width **0**, series step **5e-4**, bar
**4e-4**. The last two are the three-decimal rounding the capture applies.

**Classification: A — exact.**

#### The independence held

The falsification test was whether the series gap could move the category
scale. It cannot:

| spacing | category width across gaps 0/10/40 | step |
|---:|---|---|
| 0 | 29.375, 29.375, 29.375 | 29.3750 |
| 20 | 23.5, 23.5, 23.5 | 30.6522 |
| 50 | 14.6875, 14.6875, 14.6875 | 32.7907 |

One value per spacing, unchanged by the gap — while the series step and bar
thickness moved with it at every spacing. The two levels are genuinely
independent, and the category scale does not know the gap exists.

#### The whole category-axis chain, stated independently

```
pOuter    = categoryAxisVisible ? 0.4 : 0
step      = plot / max(1, count − pInner + 2 × pOuter)   // positions
start(i)  = plotStart + pOuter × step + i × step
thickness = plot / max(1, count + 2 × pOuter)            // sizes
width     = thickness × (1 − pInner)
series    = clusteredSeriesBands(width, seriesCount, gap)
```

The mark is anchored at the band **start**, not centred in it: native's
leading edge is `0.4 × step` at every one of the twenty-one states measured
across §5.16 and here, which centring cannot produce.

### 5.19 The category axis, closed

Theme Studio measured in the browser before and after the three-quantity
change, at its natural preview size, Classic 2026, spacing 20, gap 10.
Normalised by the category step throughout.

| | before | after | native |
|---|---:|---:|---:|
| plot ÷ step | 4.5975 | **4.5975** | 4.6000 |
| leading edge ÷ step | 0.3992 | **0.3992** | 0.4000 |
| **category width ÷ step** | 0.7992 | **0.7658** | **0.7667** |
| series step ÷ step | 0.2750 | **0.2633** | 0.2644 |
| bar thickness ÷ step | 0.2475 | **0.2375** | 0.2379 |
| trailing edge ÷ step | 0.4008 | **0.4342** | 0.4333 |
| series `paddingInner` | 0.1 | 0.098 | 0.1 |

Positioning did not move, which was the requirement: `plot ÷ step` and the
leading edge are identical before and after. Only the mark extent changed,
and the series step and bar thickness followed it through the existing
series model without being touched.

The `paddingInner` row reads 0.098 rather than 0.100 for the same reason
the other rows land in the third decimal: the bars are 4.4px at this
preview size, so a ratio read back from `getBoundingClientRect` cannot
resolve better than about 0.002. The model is exact — the unit tests assert
the gap ratio at 1e-9.

#### Native acceptance

The shipped scale is asserted against all nine native states in
`tests/categoryWidth.test.ts`: for each, the category step and category
width come from `ChartLayout`, the series step and bar thickness from
`clusteredSeriesBands` fed that width, and all four are compared with what
Power BI drew. They agree to the capture's three decimals.

**The category-axis rectangular mark geometry is recovered for this
fixture** — Clustered Bar, Classic 2026, four categories, across three
category spacings and three series gaps. That is a statement about this
fixture and this visual, not about Power BI's cartesian layout generally:
Line is untested and untouched, and no other visual type, theme or category
count has been measured.

#### What is left on the category axis

Nothing measured. The remaining cartesian deltas are elsewhere: the fixed
non-plot axis width (native spends 110–114px where the widest label needs
60.5px), responsive typography, and the shedding behaviour — all deferred,
and none of them a category-scale question.

### 5.20 The non-plot width, decomposed — and one term still unnamed

Native Classic 2026 spends 110px of a 450- or 600-wide visual on things
that are not the plot, and 114px once the axis title grows. The widest
category label is 61.4px, so "label width" explains barely half of it. This
section takes it apart.

#### Every layer, five sizes

Measured from the visual's own left edge. `plot` is the attribute width, not
the rect — `getBoundingClientRect` on `svg.mainGraphicsContext` returns the
union of its children, which is where the longest bar ends.

| size | pad L | title px | gutter | plot | far inset | pad R | sum | non-plot |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 450×250 | 5 | 12 | 93 | 340 | 7 | 5 | 450 | 110 |
| 600×250 | 5 | 12 | 93 | 490 | 7 | 5 | 600 | 110 |
| 600×300 | 5 | 16 | 97 | 486 | 7 | 5 | 600 | 114 |
| 600×600 | 5 | 16 | 97 | 486 | 7 | 5 | 600 | 114 |
| 750×300 | 5 | 16 | 97 | 636 | 7 | 5 | 750 | 114 |

The columns add to the visual width exactly at every size. So:

- **container padding: 5px each side.** Constant. Belongs to the visual, not
  the axis.
- **far-side plot inset: 7px.** Constant. Belongs to the plot, not the axis.
- **gutter: 93 or 97**, tracking the axis title's font size one for one.

That last point is the clue §5.13 hinted at: the 4px difference between the
600×250 and 600×300 states is exactly the 4px difference in title font size.

#### Inside the gutter

Sweeping the report theme's primary Label size at 600×600 moves the category
labels while the axis title stays at 16px — the title comes from the `title`
class and does not derive from `label` (§5.15), which makes it a control
inside the same experiment.

| theme label | category label | widest label (ink) | gutter |
|---:|---:|---:|---:|
| 10pt | 12px | 61.432 | 97 |
| 14pt | 16.8px | 84.957 | 123 |
| 20pt | 24px | 121.000 | 162 |
| 30pt | 36px | 129.359 **truncated** | 179 |

Canvas `measureText` reproduces the native ink boxes to within 0.93px at
12px and 0.004px at 24px, so Theme Studio's own measurer is a fair stand-in
for what Power BI measured.

Subtracting the measured text and the title's font size leaves a residual
that is **not constant**:

| category label | residual after title px and text width |
|---:|---:|
| 12px | 20.502 |
| 16.8px | 22.353 |
| 24px | 25.004 |

A straight line through the first and last gives `16 + 0.375 × labelPx`,
which predicts the middle state to 0.05px and reproduces every measured
gutter — including both title sizes — to the same precision:

```
gutter = titleFontPx + 16 + 0.375 × labelFontPx + measuredLabelWidth
```

| state | predicted | measured |
|---|---:|---:|
| title 12, label 12 | 92.998 | 93 |
| title 16, label 12 | 96.998 | 97 |
| title 16, label 16.8 | 122.947 | 123 |
| title 16, label 24 | 161.996 | 162 |

#### Why this is B and not A

The formula fits, and that is not the same as being understood. `16 +
0.375 × labelPx` is one number split between at least two gaps — title to
labels, and labels to plot — and the DOM cannot say which. Both gaps are
measured from *ink* boxes, and glyph bearing moves those by a pixel or so
in exactly the direction that would corrupt the split: the title's box
starts 1px left of the chart edge at 12px and flush at 16px.

~~The experiment that would separate them is hiding the axis title and
measuring what the plot gains. It is not available: the Y-axis Title card's
toggle carries no accessible name and does not sit inside the header's own
card element, so the lab refuses to click it rather than guessing at a
coordinate.~~

> **Run in §5.21.** The toggle is identifiable after all — not by its own
> name, which it does not have, but by the group that owns it.

**Classification: B — a small systematic residual resolved into a term that
predicts every measured state but cannot yet be named.** No production
change follows from it. Writing `gutter += 20.5` would reproduce today's
four states and be wrong for the first theme a user edits, which is exactly
the failure §5.15 was built to prevent.

#### `maxMarginFactor`, answered

The 30pt state truncated its labels, which made the cap measurable. Holding
the label size and varying the visual width:

| visual | chart | gutter | 0.25 × chart | gutter − 0.25 × chart |
|---:|---:|---:|---:|---:|
| 450 | 440 | 141 | 110.0 | 31.0 |
| 600 | 590 | 179 | 147.5 | 31.5 |
| 750 | 740 | 216 | 185.0 | 31.0 |

So the **tick-label margin is capped at `chartViewportWidth × maxMarginFactor`**,
and the title's allocation (~31px here) sits outside that cap. The runtime
agrees exactly: it computes `marginLimits.left = viewport.width ×
maxMarginFactor` with a default of **0.25**, and the Format pane surfaces it
as `Math.round(100 × maxMarginFactor)` — a percentage. Labels that exceed the
limit are truncated with an ellipsis rather than the plot shrinking further.

`maxMarginFactor` is therefore **not** a padding or a margin in pixels: it is
the maximum share of the chart viewport the axis labels may consume, per
side. `PROVEN-RUNTIME` for the rule, `PROVEN-EXPERIMENT` for the 0.25.

#### Recorded, not implemented

The label sweep also exposed a **responsive font cap**: at 600×300 the
category label stopped growing at 16px however large the theme's label class
went, while at 600×600 it reached 36px. And at 450 wide with a 30pt theme
label it dropped to 21.333px. That is responsive typography, deferred
elsewhere, and noted here only because it bounds what the label sweep could
reach.

### 5.21 The title's contribution, measured

§5.20 could predict the gutter but not explain it, because one term covered
two gaps at once. Hiding the axis title separates them, and the toggle is
reachable after all: not by its own accessible name, which it does not
have, but by the **formatting-group that owns it**. A card owns a named
heading, a group inside it owns its own heading, and that group's header
holds exactly one toggle.

#### Title on, off, on — at both title sizes

Classic 2026, Clustered bar, spacing 20, gap 10, category label 12px.

| size | title px | gutter ON | gutter OFF | **delta** | plot ON | plot OFF |
|---|---:|---:|---:|---:|---:|---:|
| 600×600 | 16 | 97 | **76** | **21** | 486 | 507 |
| 600×250 | 12 | 93 | **76** | **17** | 490 | 507 |

Both round trips reproduced the original geometry exactly.

**The title's contribution is `titleFontPx + 5`.** 16 → 21, 12 → 17: the
delta moves with the font one for one, and the five is what remains when
the font is taken out. That is outcome **B** of the three the experiment
was designed to distinguish — the title costs its own font size plus a
fixed gap, not just its font size.

And the gutter with the title hidden is **76 at both sizes**, as it must be
if the title is the only thing that differs between them.

#### Splitting the fitted term

§5.20 fitted `16 + 0.375 × labelPx` on top of the title's font size and the
measured text. With the title's own cost now known to be `titleFontPx + 5`,
the five belongs to the title side and eleven to the label side:

| state | title | label | measured text (canvas) | predicted gutter | native |
|---|---:|---:|---:|---:|---:|
| 600×250 | 12px | 12px | 60.498 | 92.998 | 93 |
| 600×600 | 16px | 12px | 60.498 | 96.998 | 97 |
| **title off** | — | 12px | 60.498 | **75.998** | **76** |
| 600×600, theme 14pt | 16px | 16.8px | 84.647 | 122.947 | 123 |
| 600×600, theme 20pt | 16px | 24px | 120.996 | 161.996 | 162 |

```
gutter = (titleShown ? titleFontPx + 5 : 0)
       + measuredLabelWidth + 11 + 0.375 × labelFontPx
```

Every state to **≤0.05px**, including the two title-off states, which the
earlier fit had no way to predict at all.

#### Why this is still not an implementation

The title term is now **measured**: two title sizes, a controlled on/off,
and a clean round trip. The label side is not. `11 + 0.375 × labelPx`
reproduces every state, but it comes from fitting two constants to three
label sizes, and 0.375 has no named mechanism — it is a coefficient that
works, which is precisely the thing §5.20 declined to ship.

The confirming experiment — sweep the label size with the title hidden, so
the label side is measured in isolation — did not run. The Format pane
virtualises its cards: once an earlier operation has scrolled down to the
Bars → Layout section, the Y-axis card is genuinely unmounted rather than
merely off screen, and the locator correctly reports that it cannot find
it.

> **Half solved in §5.22.** The pane is now navigable in that direction:
> from a pane scrolled to Bars → Layout, with Y-axis unmounted, the title
> mutation rewinds, finds the card and succeeds. The *reverse* direction,
> repeatedly, is not, so the sweep still cannot run.

**Classification: B**, and closer than it was. The title's half is settled;
the label's half is one experiment away, and that experiment needs the pane
navigation to survive a Layout scroll.

### 5.22 Navigating a virtualised Format pane

The blocker on the label side is not the measurement, it is reaching the
control. Power BI's Format pane **virtualises**: a card scrolled far enough
away is removed from the DOM, so after anything has visited Bars → Layout,
the Y-axis card does not exist to be clicked. Querying for it returns
nothing, which the locator correctly reports as absence rather than
guessing.

#### What now works

`seekFormattingCard` rewinds the pane and walks it in bounded steps,
checking after each whether the card has mounted. Movement is *observed*:
each step compares `scrollTop` before and after and stops when the pane
refuses to move. Position is only ever read — the scrolling itself is real
wheel input, because a virtualising pane needs the events to mount
anything. Order is used to navigate and never to identify: the card is
matched by its own heading, and reaching the end without one fails.

Two follow-on bugs surfaced and are fixed. Expanding a card scrolls the
pane and can unmount the group about to be clicked, so every step re-seeks
before it acts. And `openGroupToggle` scrolled only downward — while
expanding a group scrolls its *contents* into view and leaves the group's
own header **above** the fold, where scrolling down pushes it further away.
A click at an off-screen coordinate lands on nothing while the toggle
quietly reports the old value, which is exactly the "toggle reports false,
asked for true" failure. It now scrolls towards its target.

**The acceptance test passes**: from a pane genuinely scrolled to Bars →
Layout with Y-axis unmounted, `setCategoryAxisTitleVisible(false)` rewinds,
finds the card, resolves the exact Title toggle and mutates.

#### What still does not

~~The reverse direction, repeatedly.~~ **Diagnosed and fixed in §5.23** —
and it was not virtualisation at all.

### 5.23 "Layout" is not a unique name

The second semantic action failed where the first succeeded, and the cause
turned out to be embarrassingly simple once the pane was instrumented
rather than guessed at.

#### What the instrumentation ruled out

Six checkpoints through the failing sequence, capturing the scroller, the
mounted cards and groups, which are expanded, and where focus is:

| hypothesis | verdict | the observable |
|---|---|---|
| stale scroller identity | **refuted** | same element and box at every checkpoint, one candidate throughout |
| rewind never reaches the start | **refuted** | `scrollTop` 0 at checkpoint D |
| focus trapped in the expanded group | **refuted** | focus is on `body` at the moment of failure |
| Y-axis card stays expanded | **supported** — but not for the reason assumed |
| Title group stays expanded | **supported** — same |

The Bars card was **mounted and on screen** when the lookup for it
"failed". Nothing was missing.

#### The actual cause

**Bars has a `Layout` group. So does Y-axis.**

A fresh pane has Y-axis collapsed, so only Bars' Layout is mounted and a
global lookup by name is accidentally right. Leave the Y-axis card expanded
from a previous action and a second `Layout` mounts — the lookup silently
resolves the wrong card's group, expands it, and then cannot find a slider
that was never going to be inside it.

Group headings are now resolved **within the card that owns them**, which
is the containment rule the toggle lookup already used. It was applied to
toggles and not to groups, and the gap held exactly one bug.

#### The second bug behind it

Visibility was judged against the **window**. A control scrolled above the
Format pane is still inside the viewport — it is simply not inside its own
scroll container — so it counted as visible, the click went to whatever was
painted at those coordinates, and the toggle reported its old value. That
is the "reports false, asked for true" failure. Visibility is now measured
against the control's own scroller, and scrolling moves towards the target
in that same frame.

#### The contract

Actions normalise at **both** ends: they seek what they need on entry, and
collapse the card they expanded on exit, so no action inherits an expanded
card from the one before it. That is authoring UI state only — no
formatting value is touched.

**Torture test: 36 checks, two full cycles, one session, zero failures.**
Series gap → title off → category spacing → identity → title on, repeated,
with `Y-axis/Layout` and `Bars/Layout` now resolving independently and the
negative cases still refusing.

### 5.24 The label side, measured in isolation

With the pane composable, the sweep that has been blocked since §5.20 runs:
title OFF, 600 × 600, spacing 20, gap 10, six theme label sizes, all
uncapped and untruncated.

| theme | category label | widest ink | gutter | gutter − ink |
|---:|---:|---:|---:|---:|
| 8pt | 9.6px | 49.145 | **63** | 13.855 |
| 10pt | 12px | 61.432 | **76** | 14.568 |
| 12pt | 14.4px | 72.718 | **89** | 16.282 |
| 14pt | 16.8px | 84.957 | **102** | 17.043 |
| 16pt | 19.2px | 97.291 | **115** | 17.709 |
| 20pt | 24px | 121.000 | **141** | 20.000 |

The gutter column is the result. Every value is an **integer**, and the
differences are 13, 13, 13, 13, 26 against label steps of 2.4, 2.4, 2.4,
2.4, 4.8 — a slope of exactly **65/12 = 5.41667 per label pixel** at both
step sizes. So

```
gutter(title hidden) = 11 + 5.41667 × labelFontPx
```

exact at all six. Since canvas measures "North West" at 5.0415 px per font
pixel, that decomposes as `measuredWidth + 11 + 0.375 × labelPx` — the
same numbers §5.21 fitted, now measured against six sizes with the title
removed from the equation instead of three with it included.

#### And why that is still not a mechanism

One string cannot separate the two readings. For a fixed label, "measured
text plus a font-proportional gap" and "a pure multiple of the font size"
are the same line. The truncated states rule out the second — a capped
label changes the gutter while the font does not — so the allocation is
text-dependent. But the split between *text measurement* and *axis gap*
remains unresolved with this fixture's four category names.

#### What the runtime says

Power BI's tick-label margin is

> `getAxisTickLabelMargins(...)` → `maxWidth = max over labels of
> textWidthMeasurer(label, fontProperties)`

with **no padding and no allowance added**. So the extra `11 + 0.375 ×
labelPx` is not inside the label-margin calculation at all; it belongs to
the axis geometry around it, or to whatever `textWidthMeasurer` returns
over the ink. That narrows the search considerably and rules out the
"margin adds padding" reading, but it does not yet name the term.

The cap composition, by contrast, is now read directly from the same
function's caller:

> `leftMargin = min(max(overflow, maxWidth), yMarginLimit)`

which is exactly `min(natural, viewportWidth × maxMarginFactor)` from
§5.20, no longer inferred. `PROVEN-RUNTIME`.

**Classification: B.** The relationship is now measured rather than fitted,
the cap is proven, and the title term is proven — but `0.375 × labelPx`
still has no named owner, and the gate for A requires one.

### 5.25 The label anchor — where the font-relative term is not

Every gap measured so far came from `getBoundingClientRect`, which returns
the painted glyph box. A right-aligned tick label is not positioned by its
ink; it is positioned by its **anchor**, and the bearing between the two
moves with the typeface. So the ink-based gaps were carrying a term that
may never have been a gap at all.

Anchors mapped through `getScreenCTM`, relative to the plot's own origin:

```
text-anchor: end     x = -9     for every category label
```

#### The anchor does not move with the font

Title off, 600 × 600, the same six label sizes:

| label px | anchor → plot | ink → plot | gutter |
|---:|---:|---:|---:|
| 9.6 | **9** | 8.084 | 63 |
| 12 | **9** | 8.068 | 76 |
| 14.4 | **9** | 8.891 | 89 |
| 16.8 | **9** | 8.699 | 102 |
| 19.2 | **9** | 8.506 | 115 |
| 24 | **9** | 9.000 | 141 |

**Spread in the anchor distance: 0.000.** The label-to-plot gap is a fixed
**9px**, and the wandering 8.07–9.00 in the ink column is glyph bearing,
not layout. The hypothesis that the font-relative term is a label-to-plot
gap is **refuted**.

#### Which relocates the term rather than naming it

With the anchor fixed, the gutter decomposes as

```
gutter = (chart edge → text allocation) + allocatedTextWidth + 9
```

and since `gutter = 11 + 5.41667 × labelPx` (§5.24), whatever sits left of
the anchor is `2 + 5.41667 × labelPx`. Against a canvas advance width of
`5.0415 × labelPx` for this label, that leaves

```
allocation − advance = 2 + 0.375 × labelPx
```

— 6.5px at 12px, 11px at 24px. So the term lives on the **chart-edge side**
of the text, not the plot side: either Power BI's `textWidthMeasurer`
returns more than the advance width, or the axis pads the far side of the
label band. The runtime already rules out the margin calculation itself
adding anything (§5.24), which leaves those two.

#### The experiment that would separate them, and why it did not run

Vary the font family at a fixed 12px: text width then moves independently
of font size, and the two readings predict different gutters. The lab can
now navigate to the control — the theme pane's General font dropdown opens
and reports all 26 families this build exposes, including Arial, Verdana,
Georgia and Courier New — but **clicking an option does not take**. The
control returns to its previous value, with or without a preceding hover,
while the font *size* control beside it applies live. So
`setThemeLabelFontFamily` is allowlisted, coded and marked
`NOT_IMPLEMENTED` rather than reporting a change it did not make.

**Classification: B.** The term now has a *location* — left of the anchor,
in the label's allocated width — which is a real narrowing from "somewhere
in the gutter". It does not yet have an owner.

### 5.26 The cap, in the UI and in the geometry

The remaining question — whether the `2 + 0.375 × labelPx` belongs to Power
BI's text measurement or to axis geometry — needs text width varied while
font size is held fixed. Two routes were tried this round.

#### The font-family route is closed for now

The theme pane's General font dropdown opens and lists all 26 families,
but neither mouse nor keyboard selection commits: with the list open,
arrowing to a family and pressing Enter leaves the control on its previous
value, exactly as clicking does. Reaching that dropdown also depends on
the Theme pane, which was itself unreachable for most of this session. The
action stays `NOT_IMPLEMENTED`.

#### `maxMarginFactor` is a per-visual control, and it says 25

Found while looking for another route: **Y-axis → Values → "Maximum
width"** reads **25**, with a range of **15..50**. That is
`maxMarginFactor` as a percentage, exposed in the Format pane — the
runtime value read back from the UI, and the first direct confirmation
that the 0.25 default in the bundle is the same number a user sees.

#### Narrowing the visual forces the cap to bite

Title off, 12px labels, four categories, only the visual's width varying —
so the font never changes but the rendered string eventually must:

| visual | chart | widest label | gutter | 0.25 × chart |
|---:|---:|---|---:|---:|
| 600 | 590 | North West | **76** | 147.5 |
| 340 | 330 | North West | **76** | 82.5 |
| 300 | 290 | North West | **76** | 72.5 |
| 280 | 270 | North West | **76** | 67.5 |
| 260 | 250 | North **…** (truncated) | **73** | 62.5 |

The uncapped model predicts **75.998** against a measured **76** at all
four uncapped widths:

```
gutter = min(canvasWidth + 6.5, cap) + 9
```

and the label-to-plot anchor stayed at exactly **9** in every state,
including the truncated one.

#### What the capped state does not settle

At 260 the cap bites and the label truncates, but the measured gutter of 73
sits between the two candidate bases: `0.25 × chartWidth` predicts 71.5 and
`0.25 × visualWidth` predicts 74. One capped state cannot choose between
them, and further widths could not be measured — CDP input began timing
out against the WebView partway through the second sweep.

It also does not break the degeneracy. The margin is computed from the
widest **value**, not from what is painted, so truncation changes the drawn
string without changing the quantity the allocation is derived from. The
260-wide state proves the cap is real; it does not vary the measured width
of the widest value.

**Classification: B**, unchanged. The uncapped model now predicts four
independent viewport widths as well as six font sizes and both title
states, and the anchor's fixed 9px survives every one — but the ownership
of `2 + 0.375 × labelPx` is exactly where §5.25 left it.

### 5.27 `textWidthMeasurer` is canvas `measureText`, and nothing else

The open question since §5.24 has been whether the unattributed
`2 + 0.375 × labelPx` lives **inside** Power BI's text measurement or
**outside** it in axis geometry. Every rendering experiment leaves those
two indistinguishable, because they predict the same gutter for any string
at any size. Only the implementation can separate them.

#### The trace

`getAxisTickLabelMargins` receives its measurer as a parameter (§5.24).
Following the binding rather than the parameter name:

```
textWidthMeasurer: TextMeasurementService.measureSvgTextWidth
```

and that method, reduced to its behaviour:

```
measureSvgTextWidth(textProperties, text):
    require fontSize to be in px
    if no canvas context:  return text.length × parseInt(fontSize)   // fallback only
    set the canvas font from textProperties
    return canvasCtx.measureText(text).width
         + (letterSpacing != null ? letterSpacing × text.length : 0)
```

**It is the raw canvas advance width.** No padding, no safety allowance, no
bounding-box correction. The only addition is a `letterSpacing` term that
is null unless something sets it, and the character-count branch is a
fallback for when no canvas exists at all.

`PROVEN-RUNTIME`.

#### What that settles

Of the two models §5.25 left standing:

| | model | verdict |
|---|---|---|
| 1 | `nativeTextWidth = canvasWidth + 6.5`, anchor offset 9 | **refuted** |
| 2 | `nativeTextWidth = canvasWidth`, a separate chart-edge-side allocation of 6.5, anchor offset 9 | **supported** |

So the `2 + 0.375 × labelPx` is **axis or chart geometry, not text
measurement**. It is also now clear why Theme Studio's canvas measurement
agrees with native ink to 0.02% (§5.14): both sides are literally calling
the same browser API on the same string.

One caveat worth stating: the measurer sets the canvas font from Power BI's
own `textProperties`. If those ever carried a family string different from
the one the SVG paints with, the measured width would diverge from what is
drawn — so "canvas measureText" is the mechanism, and the *inputs* to it
remain worth checking if a discrepancy ever appears.

#### What is still open

Where the remaining `2 + 0.375 × labelPx` sits geometrically. It is on the
chart-edge side of the label, between the chart's left edge and the start
of the label's box — 6.5px at 12px, 11px at 24px — and it is not the
label-to-plot gap, which is a fixed 9px (§5.25).

**Classification: B**, with one of the two candidate owners now eliminated
by implementation rather than by inference.

### 5.28 Three strings, one font size — the degeneracy breaks

Power BI's own controls could not vary text width at a fixed font size, so
the synthetic fixture's text was edited by hand instead: `North West` →
`NW` (making Scotland the widest) → `Loughborough`. Everything else held:
Classic 2026, 600 × 600, 12px labels, same family, spacing 20, gap 10,
title on at 16px, no truncation, cap nowhere near.

| variant | widest | canvas | native ink | gutter | g − canvas | g − ink | anchor |
|---|---|---:|---:|---:|---:|---:|---:|
| SHORT | Scotland | 45.885 | 45.891 | **81** | 35.115 | 35.109 | 9 |
| BASELINE | North West | 60.498 | 61.432 | **97** | 36.502 | 35.568 | 9 |
| LONG | Loughborough | 79.266 | 79.475 | **116** | 36.734 | 36.525 | 9 |

The anchor stayed at **9** in all three, and the plot moved with the
gutter: 502, 486, 467.

#### Text width does contribute, but the residual is not constant

`d(gutter) / d(width)` comes out at 1.01–1.09 against canvas and 1.03–1.05
against ink — near one, which settles that this is a **text-width**
contribution and not a font-size-only term. But the residual moves:
**1.62px** of spread against canvas, **1.42px** against ink.

By the taxonomy this is **outcome B**: canvas `measureText` in our browser
is not exactly the quantity Power BI allocates.

#### Why, and it is not a missing layout term

§5.27 established that Power BI measures with `canvasCtx.measureText`. It
does so with its own `textProperties`, and Power BI Desktop has
`wf_segoe-ui_normal` loaded where our browser falls back to the installed
Segoe UI. The per-string differences between native ink and our canvas are
erratic in exactly the way font substitution produces — London +0.21,
North West +0.93, Scotland +0.01, Wales +1.01 — rather than the smooth
bearing offset a single font would give.

So the ~1.5px is the size of *our measurement error against Power BI's*,
not evidence of an unknown allocation.

#### One pattern worth recording

Every native gutter measured in this whole investigation is an integer. If
the chart-edge term is exactly **5** — the same constant as the title gap —
then the implied label margins are

| variant | implied margin |
|---|---:|
| SHORT | **46.000** |
| BASELINE | **62.000** |
| LONG | **81.000** |

Three exact integers from three unrelated strings. That is strong evidence
the margin is integer-rounded and that the chart-edge constant at 12px is 5
rather than the 6.5 the earlier algebra suggested — with the difference
absorbed by rounding. It does not survive being pushed across font sizes:
`ceil(width) + 14` fits 12px but not 14.4px, so the font-proportional part
of §5.24 is still real and still unexplained.

**Classification: B.** Text width is now independently established as a
one-for-one contributor; the measurer is known to be canvas `measureText`;
the anchor is a fixed 9px; the title is `titleFontPx + 5`. What remains
unowned is the font-proportional part of the chart-edge allocation, and the
~1.5px between our text measurement and Power BI's.

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
| Theme Studio's band model predicts Power BI's response to a gap change | `PROVEN-EXPERIMENT` (§7.1 under Fluent, §7.2 under Classic 2026 — the rule reproduces, the absolute geometry differs with the theme) |
| Power BI antialiases fractional edges (2 phases sampled) | `PROVEN-EXPERIMENT` |
| Theme Studio antialiases **under the hero transform** (1 clean sample) | `PROVEN-EXPERIMENT` |
| `estimateText` error is the 0.55 heuristic | `STRONGLY-SUPPORTED` — two independent browser measurements agree to 0.4% |
| Axis maximum is a nice-number rounding | `STRONGLY-SUPPORTED` — one data point (46→50) plus `Le = 20` px/tick |
| Tick density is width-driven | `INFERENCE` — `bestTickCount = min(domainSpan, pixelSpan / 20)` read from the bundle; the nice-interval selection was not isolated |
| Category `innerPadding` ≈ 55.2% | `INFERENCE` — outer padding unknown |
| **Fluent** axis text is 12px at 600×206 and 14px at 600×600 | `PROVEN-EXPERIMENT`, **`FLUENT-ONLY`** (§5.8) |
| **Fluent** drops categories and scrolls rather than compressing | `PROVEN-EXPERIMENT`, **`FLUENT-ONLY`** (§5.8) |
| **Classic 2026** crams all four categories at 600×206 instead | `PROVEN-EXPERIMENT` (§5.12) — instrumented; the original manual observation covered both Classic bases, but 2018 has not been measured at that exact size |
| Report theme changes responsive layout, not just styling | `PROVEN-EXPERIMENT` — the two behaviours differ |
| Theme Studio's text is lighter than native at matched aspect | `PROVEN-EXPERIMENT`, **`FLUENT-ONLY`** (§5.8) |
| The rule behind Fluent's responsive axis text | `UNKNOWN` — six sizes sampled (§5.13); the change is bracketed between 600 and 300 height, but the rule is not established |
| Classic renders 12px axis text at both 600×206 and 372×128 | `PROVEN-EXPERIMENT` |
| Classic sheds legend, value labels and categories as the box shrinks | `PROVEN-EXPERIMENT` (§5.10) |
| Theme Studio draws ~2× the furniture of native Classic at the same size | `PROVEN-EXPERIMENT` (§5.10) |
| No responsive axis-label size change observed across **twelve** tested Classic sizes (12px at each) | `PROVEN-EXPERIMENT` (§5.12) |
| Classic legend and axis titles shrink at a height threshold between 250 and 300 | `PROVEN-EXPERIMENT` (§5.12) |
| Classic sheds furniture in order: value labels, then legend, then categories | `PROVEN-EXPERIMENT` (§5.12) |
| 450×250 is the smallest **tested** size retaining the full native furniture set, for this visual and fixture | `PROVEN-EXPERIMENT` (§5.12) |
| Classic 2026 and Classic 2018 do **not** share density behaviour | `PROVEN-EXPERIMENT` (§5.13) |
| Classic 2018 renders no axis titles and uses 10.667px labels | `PROVEN-EXPERIMENT` (§5.13) |
| Classic 2018 sheds hardest despite carrying least furniture | `PROVEN-EXPERIMENT` (§5.13) |
| `paddingInner` = 0.1 across 3 themes × 6 sizes | `PROVEN-EXPERIMENT` (§5.13) |
| Power BI's "Space between categories" default is **20**, read from its own control | `PROVEN-RUNTIME` (§5.14) |
| The declared category padding and the ratio it produces differ (20 → 23.34%, Fluent 50 → 55.2%) | `PROVEN-EXPERIMENT` (§5.14) |
| Native category outer padding = **0.4 × step** at each end | `PROVEN-EXPERIMENT` (§5.16) — 12 states, two independent derivations, zero spread |
| Category **thickness** = `plot / (count + 2 × pOuter)`, with no inner-padding term | `PROVEN-EXPERIMENT` (§5.18) — constant across six spacings at two sizes |
| Visual container padding is 5px each side | `PROVEN-EXPERIMENT` (§5.20) — five sizes |
| The plot keeps a 7px inset on the far side | `PROVEN-EXPERIMENT` (§5.20) — five sizes |
| The category gutter tracks the axis title's font size one for one | `PROVEN-EXPERIMENT` (§5.20) |
| `maxMarginFactor` caps the label margin at `viewportWidth × factor`, default 0.25 | `PROVEN-RUNTIME` + `PROVEN-EXPERIMENT` (§5.20) — three widths |
| The category axis title costs `titleFontPx + 5` | `PROVEN-EXPERIMENT` (§5.21) — on/off at two title sizes, round trip reproduced |
| The gutter with the title hidden is the same at 600×250 and 600×600 | `PROVEN-EXPERIMENT` (§5.21) |
| The label side is `measuredWidth + 11 + 0.375 × labelPx` | `PROVEN-EXPERIMENT` (§5.24) — six uncapped sizes, title hidden, exact integers on a single line |
| The category label-to-plot gap is a fixed **9px**, not font-relative | `PROVEN-EXPERIMENT` (§5.25) — anchor distance, six font sizes, spread 0.000 |
| Category labels are `text-anchor: end` at `x = -9` from the plot origin | `PROVEN-EXPERIMENT` (§5.25) |
| The `2 + 0.375 × labelPx` term sits left of the anchor, in the allocated label width | `PROVEN-EXPERIMENT` (§5.25) — by subtraction from a fixed anchor |
| Power BI's `textWidthMeasurer` is `TextMeasurementService.measureSvgTextWidth` | `PROVEN-RUNTIME` (§5.27) |
| That method returns raw `canvasCtx.measureText(text).width`, with no allowance | `PROVEN-RUNTIME` (§5.27) |
| The `2 + 0.375 × labelPx` is therefore axis/chart geometry, not text measurement | `PROVEN-RUNTIME` (§5.27) — by elimination of the alternative implementation |
| Where that allocation sits geometrically | `UNKNOWN` (§5.27) |
| The gutter responds to TEXT WIDTH, not just font size | `PROVEN-EXPERIMENT` (§5.28) — three strings at one font size, slope ≈ 1 |
| Canvas `measureText` in our browser is not exactly Power BI's measured width | `PROVEN-EXPERIMENT` (§5.28) — residual spreads 1.6px across three strings |
| The discrepancy is font substitution, not a missing layout term | `STRONGLY-SUPPORTED` (§5.28) — per-string differences are erratic, and §5.27 fixes the mechanism |
| The native label margin is an integer number of pixels | `STRONGLY-SUPPORTED` (§5.28) — implied margins 46/62/81 from three strings |
| The label margin is `max` of the measured label widths, with no padding added | `PROVEN-RUNTIME` (§5.24) |
| `leftMargin = min(max(overflow, maxWidth), yMarginLimit)` | `PROVEN-RUNTIME` (§5.24) — the cap composition, read rather than inferred |
| `maxMarginFactor` is exposed per visual as "Maximum width", default 25, range 15..50 | `PROVEN-UI` (§5.26) |
| `gutter = min(canvasWidth + 6.5, cap) + 9` at 12px | `PROVEN-EXPERIMENT` (§5.26) — four viewport widths, predicted 75.998 against 76 |
| Which viewport the cap is a share of | `UNKNOWN` (§5.26) — one capped state falls between the chart-width and visual-width bases |
| The margin follows the widest VALUE, not the widest painted label | `PROVEN-EXPERIMENT` (§5.26) — truncation changes the drawn string without changing the allocation |
| Format-pane group names repeat across cards (`Layout` in Bars and Y-axis) | `PROVEN-EXPERIMENT` (§5.23) |
| Category **width** = `thickness × (1 − pInner)`, and it is what the series scale divides | `PROVEN-EXPERIMENT` (§5.18) — predicts all 12 cluster extents to 5e-5 |
| Step, thickness and width are three distinct quantities | `PROVEN-RUNTIME` + `PROVEN-EXPERIMENT` (§5.18) |
| The series gap cannot move the category scale | `PROVEN-EXPERIMENT` (§5.18) — 3 gaps × 3 spacings, width invariant |
| The positioning scale is a d3 `scaleBand` with both paddings | `PROVEN-RUNTIME` (§5.18) |
| The category scale is a band scale: `step = plot / (count − pInner + 2 × pOuter)` | `PROVEN-EXPERIMENT` (§5.16) — predicts plot/step at six inner paddings |
| Category bands sit flush at the start of their step, not centred | `PROVEN-EXPERIMENT` (§5.16) |
| A hidden category axis takes outer padding 0 | `PROVEN-RUNTIME` (§5.16) — read from the bundle, not measured |
| Outer padding never applies to a value axis | `PROVEN-RUNTIME` (§5.16) |
| `categoryAxis.outerPadding` exists as a Power BI property but is feature-switched off | `PROVEN-RUNTIME` (§5.16) |
| Category axis labels **derive from** the primary label class × 0.9 (`smallLightLabel`) | `PROVEN-EXPERIMENT` (§5.15) — theme label 10→20pt moved the axis 9→18pt and its own control to 18, while the legend moved 1:1; contradicts Microsoft's documented `lightLabel` association |
| Legend text is the unscaled label class under Classic 2026 | `PROVEN-EXPERIMENT` (§5.15) |
| Axis titles do not derive from the label class | `PROVEN-EXPERIMENT` (§5.15) — unmoved by a 2× label change |
| Why Classic 2018 resolves 8pt from a declared 10pt label | `UNKNOWN` (§5.15) |
| `estimateText`'s error is per-string, not a scale factor (0.453–0.561em) | `PROVEN-EXPERIMENT` (§5.14) |
| Shedding differs by theme beyond what measured typography, furniture and plot area explain | `INFERENCE` (§5.13) — those three are ruled out as a complete explanation |
| Whether the remaining cause is another theme-resolved default or theme-conditional renderer logic | `UNKNOWN` — unmeasured defaults (minimum category thickness, density or scroll thresholds, padding) would produce the same pattern |
| Classic axis **titles** and **legend** DO scale with visual size | `PROVEN-EXPERIMENT` |
| The automatic axis maximum rule is theme-invariant (46→50 both themes) | `PROVEN-EXPERIMENT` |
| Category `innerPadding` is theme-dependent: Classic 23.33%, Fluent 55.2% at the same size | `PROVEN-EXPERIMENT` |
| The nice-number *rule* itself | `UNKNOWN` — still one data maximum (46) |
| The axis maximum rule is theme-**invariant** | `PROVEN-EXPERIMENT` — data max 46 resolves to 50 under both Classic and Fluent |
| Band `paddingInner` = 0.1 holds under Classic too | `PROVEN-EXPERIMENT` — six measurements, two themes, five visual sizes |
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

### 7.2 The same experiment, autonomously — 10 → 40 → 10

The lab controller repeated §7.1 with **no human step**: set the gap through
Power BI's own control, wait for the render to settle, measure, set it back,
verify. This was the acceptance test for the mutation path before it was
trusted with the eighteen-variant matrix.

At **600 × 600 under Classic 2026**:

| | gap 10 | gap 40 |
|---|---:|---:|
| band | 25.121 | 18.679 |
| series step | 27.912 | 31.132 |
| `paddingInner` | 0.1 | 0.4 |
| category step, plot, bar count, value labels, legend | — | **unchanged** |

Restoring 10 returned the geometry to its baseline exactly.

**Verdict: PASS** — the same native geometry *rule* was reproduced, and
`clusteredSeriesBands` predicted both states from one measured
`categoryWidth` to within **7e-4**, which is the three-decimal rounding in
the capture rather than model error.

**This is not a replay of §7.1, and was never meant to be.** That experiment
ran under Fluent (everything before §5.9 did), where the category
`innerPadding` is 55.2% against Classic's 23.33%, so the cluster extent —
and therefore every absolute number — differs. What is reproduced is the
**semantic behaviour**: the series re-divide a fixed category slot and
nothing outside that slot moves. No claim is made of pixel-for-pixel or
byte-for-byte agreement with the earlier capture; the agreement being
claimed is that one model predicts both themes' states without being tuned
for either.

---

## 8. Unresolved

0. ~~**Repeat the native dataset under Classic.**~~ **Done** — §5.9, §5.10,
   §5.11 cover 600×600, 600×206 and 372×128. ~~Classic 2018 remains untested,
   so whether both Classic bases share one density behaviour is still open.~~
   **Superseded by §5.13:** Classic 2018 is now measured at six sizes, and the
   two Classic bases do **not** share one density behaviour.

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
7. **What makes Classic 2018 shed earliest** (§5.13). Measured typography,
   visible furniture and plot area do not explain it. Whether an unmeasured
   theme-resolved default (minimum category thickness, a density or scroll
   threshold, padding) or theme-conditional renderer logic is responsible is
   open, and deliberately deferred: it needs one resolved default varied at a
   time.

---

## 9. Implementation candidates — **NOT YET IMPLEMENTED**

Ranked by evidence strength × visible effect. None is done here.

1. **Category axis label size: 10pt → 9pt.** Classic renders 12px at every
   measured size; Theme Studio's fallback is 13.3333px. One fallback value,
   precisely evidenced across a 9.8× range of visual area, and it shrinks the
   category gutter on every cartesian preview. Compounds with candidate 3.

1b. **Category `innerPadding` fallback: 10% → 23.33%.** Measured twice at full
   category count under Classic. Currently our categories crowd together more
   than native's.

1c. **Automatic axis maximum (nice numbers).** Now known theme-invariant, which
   removes one risk — but the rule still rests on a single data maximum.
   Needs §8.2 before implementing.
2. **Progressive decluttering.** *Re-opened, and now Classic-evidenced.* At
   372 × 128 native Classic drops the legend, all value labels and half the
   categories; Theme Studio drops nothing (§5.10). This is the largest
   like-for-like divergence found, and it is a behaviour rather than a
   constant. Note this is **not** Fluent's scroll-to-one-category — Classic
   sheds furniture instead, which is the behaviour matching our baseline.
   Scope it to **Classic 2026** specifically: §5.13 shows the two Classic
   bases shed at different points, so "match Classic" is not one behaviour.

2b. ~~**Responsive axis typography.** **Withdrawn** for the same reason:
   measured only under Fluent, and Fluent is demonstrably not representative
   of Classic for size-responsive behaviour.~~ **The withdrawal reason is
   superseded by §5.12 and §5.13**, which measured responsive typography under
   all three themes: Classic 2026 holds the category label at 12px while
   shrinking legend and axis titles at a height threshold, Classic 2018 shows
   none at all, and Fluent shrinks the category label. It is no longer
   unmeasured — but it is theme-specific, so it is a per-theme behaviour rather
   than one rule. Still not implemented, and still ranked below the constants
   above it.
3. **`estimateText` calibration.** ~0.50 em rather than 0.55, or a real
   measurement. Well evidenced, small, affects every gutter.
4. **Tick count.** Width-driven rather than a fixed 4.
5. **Axis titles off by default**, matching the native default state.
6. **Legend default position** — bottom, not top.

Nothing about mark primitives: §5.7 removed the motivation for an SVG
migration under the hero, and left the untransformed case unmeasured.
