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
| Theme | A private real-world theme, 44,209 bytes, unmodified. Deliberately not vendored into the repository — it belongs to someone else — so it lives outside the tree and the tests that use it skip when it is absent |
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
| axis `fontSize`, `titleFontSize` | `6` | **Definitely incorrect** | Microsoft documents that text classes supply the default typography for named visual text roles — axis titles from `title`, category axis labels from `lightLabel`, value axis labels from `smallLightLabel` (see §4.1). Classic 2026, a verbatim Power BI file, is consistent with that: it declares *zero* `fontSize` in `visualStyles` and declares `textClasses.label.fontSize = 10`. Fluent, which does declare axis typography explicitly, chose `10.5` — the same visual ballpark, and nothing near 6. The resolver never consults `textClasses` for any visual property (only `cardProperties.ts` does, for `callout`) |
| axis `fontFamily`, `titleFontFamily` | `""` | **Definitely incorrect** | Same argument. `""` means "inherit from CSS", so the preview silently uses the app's own font rather than the theme's Arial. The private theme explicitly asks for Arial and the preview does not show it |
| `legend.fontSize`, `labels.fontSize` | `6` | **Definitely incorrect** | Same root cause, and note these resolve to `6` under **both** bases — Fluent does not declare them either, so this defect is not Classic-specific |
| `legend.position` | `"Top"` | **Likely incorrect** | Power BI's documented default legend position for cartesian visuals is Bottom, and Fluent's base states `Bottom` explicitly for `*.*` and for `clusteredBarChart`. Classic 2026 declares `position` only for pie/donut (`RightCenter`), implying the cartesian default lives in Power BI's internal visual defaults, not the theme file. `Top` looks like an app choice |
| `categoryAxis.innerPadding` | `10` | **Probably correct but not proven** | Not declared anywhere in Classic 2026, so it comes from Power BI's internal visual defaults, which no artefact available here exposes. Fluent's `50` is a deliberate Fluent restyle, not evidence of the general default |
| `categoryAxis.maxMarginFactor` | `10` | **Probably correct but not proven** | Same |
| `layout.clusteredGapSize` | `10` | **Proven correct** | Fluent explicitly declares `10` for `clusteredBarChart.layout` |

### 4.1 The documented text-class associations

Microsoft documents which text class supplies each visual text role. The
mapping is **not** “everything comes from `label`”:

| Text class | Supplies |
|---|---|
| `title` | category axis title, value axis title |
| `lightLabel` | legend text, ~~category axis labels~~ |
| `smallLightLabel` | data labels, value axis labels, **category axis labels** |
| `smallLabel` | reference-line labels |

> **Corrected against the runtime, 2026-08-25.** The category-axis row is
> the one place this table and Power BI Desktop disagree. Raising the report
> theme's primary text size from 10pt to 20pt under Classic 2026 moved the
> category axis to 18pt (×0.9) and its own font-size control to 18, while
> the legend moved 1:1 to 26.667px and the axis titles did not move. The
> documented association is kept above, struck through, because knowing the
> published table says otherwise is worth more than a silently corrected
> row. See POWER_BI_CARTESIAN_DIFFERENTIAL.md §5.15.

Secondary classes (`lightLabel`, `smallLightLabel`, `smallLabel`, and the
rest) **derive automatically from their associated primary class** when a
theme does not supply them. A theme declaring only the four primary classes
is therefore complete, and a correct implementation must reproduce that
derivation rather than treating an absent secondary class as absent.

The private fixture happens to declare several secondary classes explicitly, so
it does not exercise the derivation path on its own — which is precisely why
the implementation cannot be validated against this fixture alone.

### 4.2 The derivation rules, from Power BI's own implementation

**Confirmed by phase 2 task 3**, and no longer inferred. The installed
Power BI Desktop carries the function its own assertion string names
`visualStyle > applyTextClassDefaults`, in
`bin/WebView2Resources/minerva/scripts/desktop.min.js` — the same install
the base themes in `themes/base/` came from. Its table:

| Class | Derives from | Size scale | Colour | Weight |
|---|---|---|---|---|
| `lightLabel` | `label` | — | `foregroundNeutralSecondary` | — |
| `smallLabel` | `label` | **× 0.9** | primary's | — |
| `smallLightLabel` | `label` | **× 0.9** | `foregroundNeutralSecondary` | — |
| `largeLabel` | `label` | × 1.2 | primary's | — |
| `largeLightLabel` | `label` | × 1.2 | `foregroundNeutralSecondary` | — |
| `boldLabel` | `label` | — | primary's | bold |
| `semiboldLabel` | `label` | — | primary's | semibold |
| `smallDataLabel` | `label` | × 0.9 | first data colour | — |
| `largeTitle` | `title` | **× 7/6** | primary's | — |
| `dataTitle` | `title` | — | first data colour | — |

Four details that a reasonable guess would have got wrong:

1. **The scale is a factor applied to whatever the primary is**, not a
   fixed size. A theme with `label.fontSize = 14` gets `smallLabel` 12.6,
   not 9. Power BI rounds to one decimal:
   `Math.round(size * scale * 10) / 10`.
2. **A light class's colour is `foregroundNeutralSecondary`, not a
   transformation of the primary's colour** — and it wins over the
   primary, because Power BI passes it as the argument checked first.
3. **`lightLabel` has no size scale at all.** Only the small/large classes
   scale.
4. **Derivation is per field, not per object.** A secondary declaring only
   a colour still takes its size and face from the primary.

Independently corroborated by the private theme, authored against Classic 2026
and hard-coding the values this table produces: `largeLabel` 12 = label 10
× 1.2, `largeTitle` 14 = title 12 × 7/6, and `lightLabel.color` `#605E5C`
= Classic 2026's `foregroundNeutralSecondary` exactly.

**Font weight**, from the same helper's guard
`if (e.fontWeight == null && r != null)`:

- an explicitly declared weight always wins, on any class;
- otherwise a weight is supplied **only** for the two classes that exist to
  carry one — `boldLabel` and `semiboldLabel`;
- an ordinary secondary (`lightLabel`, `smallLabel`, `smallLightLabel`,
  `largeLabel`) therefore does **not** inherit its primary's weight: `r` is
  undefined for those and the block is skipped entirely;
- a primary carries whatever it declares, because primaries are passed
  through verbatim and never reach the helper at all.

The derived weights are **CSS numerics, not words**: the enum in the same
bundle module reads `e.Bold="700", e.Semibold="600"`. A theme that writes
`"fontWeight": "bold"` itself keeps that string verbatim — only the derived
value is normalised.

**Colour tokens** are resolved against the *merged* root theme, not the
layer the class field was declared in. Where a declaration lives and what
its tokens mean are separate axes: a base class saying
`"color": "foregroundNeutralSecondary"` must pick up a custom theme's
override of that token, and a custom class may name a token only the base
defines. `readVisualStyleValue` already resolves `visualStyles` colours this
way. Provenance continues to describe where the *declaration* was found,
which is deliberately not the same as where the token's value came from.

### 4.5 Font-face aliases — **PROVEN and implemented (phase 2 task 6)**

Recorded here previously as an open detail. The table has now been
recovered whole from Power BI Desktop **2.157.879.0 (26.08)**,
`bin/WebView2Resources/minerva/scripts/desktop.min.js`, module 468595:

```js
class FamilyInfo {
  get family() { return this.families.join(", ") }              // used by the theme path
  get css()    { return …map(e => e.includes(" ") ? `'${e}'` : e).join(", ") }
}
const H1 = { "Segoe UI": regular, "Segoe UI Semibold": semibold, DIN: regularSecondary, … }
```

looked up in `applyTextClassDefaults` (module 797633) by
`function u(e) { const t = n.H1[e]; return t ? t.family : e }`.

**The complete table — exactly ten entries:**

| Theme value | Rendered CSS font-family |
|---|---|
| `Segoe UI` | `Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif` |
| `Segoe UI Light` | `Segoe UI Light, wf_segoe-ui_light, helvetica, arial, sans-serif` |
| `Segoe UI Semilight` | `Segoe UI Semilight, wf_segoe-ui_semilight, helvetica, arial, sans-serif` |
| `Segoe UI Semibold` | `Segoe UI Semibold, wf_segoe-ui_semibold, helvetica, arial, sans-serif` |
| `Segoe UI Bold` | `Segoe UI Bold, wf_segoe-ui_bold, helvetica, arial, sans-serif` |
| `Segoe (Bold)` | `Segoe UI Bold, wf_segoe-ui_bold, helvetica, arial, sans-serif` |
| `DIN` | `wf_standard-font, helvetica, arial, sans-serif` |
| `DIN Light` | `wf_standard-font_light, helvetica, arial, sans-serif` |
| `Heading` | `Segoe UI Light, wf_segoe-ui_light, helvetica, arial, sans-serif` |
| `Body` | `Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif` |

**Call path.** theme `textClasses.<primary>.fontFace` → `u()` in
`applyTextClassDefaults` → secondaries inherit the *already expanded*
string via `e.fontFace = e.fontFace || t.fontFace` → the text-class reader
(module 480549) passes it as `family` → CSS is written verbatim,
`e.family && (t["font-family"] = e.family)`.

**Scope.** Only the four primary text classes are aliased. The
`visualStyles` property reader (module 4393285) does
`family: t.family && getProp(e, t.family)` — **no lookup at all**, so a
visual font-family reaches CSS raw. Note also `.family`, not `.css`: the
value Power BI renders is the **unquoted** join.

**Behaviour of everything else**, from running the extracted table:

- unknown or custom families (`Arial`, `Calibri`, `My Company Sans`) pass
  through untouched — no fallbacks are appended;
- matching is an object lookup, so it is **case- and whitespace-sensitive**:
  `segoe ui`, `SEGOE UI` and ` Segoe UI ` all pass through;
- an already-expanded stack is not a key, so it **cannot be
  double-expanded** — which matters because Fluent 2 ships
  `'Segoe UI', wf_segoe-ui_normal, …` directly in `visualStyles`;
- `Segoe UI Semibold` is a **family** alias with its own stack, entirely
  separate from `fontWeight`. Family and weight are not collapsed.

**The `wf_*` members need fonts Power BI ships.** Its CSS declares
`@font-face { font-family: wf_segoe-ui_normal; src: local('Segoe UI'), …
url(../fonts/SegoeUI-Regular-final.woff) … }`, backed by twenty Segoe files
in `minerva/fonts/`. Theme Studio does not and must not vendor those.
Emitting the stack is still correct: every alias except `DIN`, `DIN Light`,
`Heading` and `Body` begins with the real family name, so a machine with the
font resolves identically and everything else falls through to
helvetica/arial/sans-serif.

**Theme Studio's boundary.** `app/lib/fontFamilies.ts`, applied with the
same scope Power BI applies — not blindly at the end of the pipeline.

Every font family is carried in two forms, because the same string means
different things depending on where it came from:

| | raw | effective |
|---|---|---|
| primary text class `fontFace: DIN` | `DIN` | `wf_standard-font, helvetica, arial, sans-serif` |
| secondary inheriting that primary | `DIN` | the same expanded stack |
| secondary declaring `fontFace: DIN` itself | `DIN` | **`DIN`** — never reaches the lookup |
| `visualStyles` `fontFamily: DIN` | `DIN` | **`DIN`** — the visual reader has no lookup |

`ResolvedTextClass` exposes `fontFamily` and `cssFontFamily`; the cartesian
resolved styles expose `fontFamily` / `fontFamilyCss` and
`titleFontFamily` / `titleFontFamilyCss`. The effective fields are render
semantics, not theme properties, and are never written back to JSON.

The distinction is decided by **provenance, never by the string**.
`effectiveFontFamily` reads `resolvePropertyEntry`, so
`source === "fallback"` — nothing declared it — takes the text class's
expanded family, and anything else stays literal. Two themes can resolve
the identical raw `DIN` and correctly render differently.

The renderer never re-derives this. It receives the effective family from
the style model and paints it, which keeps the invariant that renderers
consume resolved render semantics rather than inspecting raw theme JSON.
The editor and the exporter continue to read the raw field only.

### 4.6 Aliases do **not** change ChartLayout geometry

The backlog assumed alias expansion would move text metrics and therefore
block natural-box sizing. Measured, that is too strong.

`ChartLayout` passes `fontFamily` into `measureText`, but the default
`estimateText` is `(text, fontSize) => …` — it never reads the family. So
expansion changes **no** computed gutter or plot value. All five cartesian
previews measure byte-identically to task 5.

Browser metrics are a different matter. Measuring five representative
strings at 13.3333px, raw family vs expanded stack:

| Family | Δ width | Δ height |
|---|---|---|
| `Segoe UI` | **0.000px** on all five | 0 |
| `Arial` (not aliased) | **0.000px** | 0 |
| `DIN` | **+3.0 to +5.9px** | 0 |

`Segoe UI` is unchanged because the stack's first member is the same
installed face. `DIN` changes because it is not installed: previously the
browser fell back to its own default, now the stack lands it on Arial — its
expanded widths match Arial's exactly. So the estimator and the browser can
diverge, but they already did before this task; the estimator approximates
every family at 0.55em regardless.

**Natural-box sizing is therefore not blocked on aliases.**

### 4.3 Pilot result — Clustered Bar, private theme + Classic 2026

Typography, before and after wiring text classes into the Clustered Bar
resolver only:

| | Before | After |
|---|---|---|
| Category axis label | 6px, no family, `#0B0C0C` | **10px Arial `#605E5C`** |
| Value axis label | 6px, no family | **10px Arial `#605E5C`** |
| Axis titles | 6px, no family | **12px Arial `#252423`** |
| Legend | 6px, no family | **10px Arial `#605E5C`** |
| Data labels | 6px, no family, palette colour | **10px Arial `#605E5C`** |

**19 property definitions** were migrated — the counting unit is one
resolver call site, i.e. one `PropertyDefinition`, with none counted twice:
three each for category axis label, category axis title, value axis label,
value axis title, legend and data labels, plus the reference-line label
colour. (An earlier report said 13; that was miscounted.) `labels.detailColor`
and the data-label title fields are deliberately **not** migrated — their
Power BI text roles are not established, and belong to the
registry-completion task.

The geometry consequence the audit predicted, measured. Nothing was
resized to compensate:

| | Before | After | Δ |
|---|---:|---:|---:|
| Category gutter width | 67.64 | 112.78 | **+45.14** |
| Plot width | 487.36 | 442.22 | **−45.14** |
| Value gutter height | 30.28 | 50.53 | **+20.25** |
| Plot height | 95.72 | 75.47 | **−20.25** |
| Category slot | 22.5% | 22.5% | unchanged |
| Bar fill height | 19.3594 | 15.2578 | −4.10 |

Conservation is still exact in both axes. The plot shrinking is the
correct consequence of honest typography, not a regression — and it is the
input the natural-box task needs: `BAR_CHART_BOX.height = 84` was sized
against 6px axis text and now has 20.25px less to give. §16 spends that
input.

**Rasterisation baseline after the change** (§5's defect is untouched):

| Fixture | Fill CSS height | Rect height | Snapped | Spread |
|---|---|---|---|---|
| private theme + Classic | 10.1719px | 15.2578 | 15, 15, 15, 15 | **0** |
| private theme + Fluent | 5.79688px | 8.6953 | 9, 9, **8**, 9 | 1 |

Classic's thicker bars now absorb the 1px error; Fluent's are unchanged.
The defect is neither fixed nor worsened.

### 4.4 Font units — **PROVEN and fixed (phase 2 task 5)**

This was flagged here as unresolved. It is now settled from the runtime.
Power BI Desktop's bundle carries the conversion with its names intact
(`desktop.min.js`, module 290100):

```js
class PixelConverter {
  static PxPtRatio = 4 / 3;
  static fromPointToPixel(e) { return PixelConverter.PxPtRatio * e; }
  static toPoint(e)          { return e / PixelConverter.PxPtRatio; }
  static fromPoint(e)        { return PixelConverter.toString(PixelConverter.fromPointToPixel(e)); }
}
```

Two independent paths feed a theme number into it:

- **text classes** (module 480549) read
  `theme.textClasses[name].fontSize` and pass it to
  `FontSize.createFromPt(+fontSize)`, which stores `{ pt, px: pt * 4/3 }`;
- **visualStyles properties** (module 4393285) resolve a font size as
  `sizeInPixels ? createFromPx(v) : createFromPt(v)`. The pixel flag occurs
  once in the entire bundle, so points is the rule.

CSS strings are then built with `PixelConverter.fromPoint(pt)`.

Running Power BI's own extracted converter gives:

| Theme value | CSS px |
|---:|---:|
| 6 | 8 |
| 9 | 12 |
| 10 | 13.333… |
| 10.5 | **14** |
| 12 | 16 |
| 14 | 18.666… |
| 24 | 32 |

4/3 is also exactly the CSS ratio (96/72), and the base themes corroborate
it: Fluent 2 stores `label.fontSize` as **10.5** precisely because that is
14px on the nose in a system designed in pixels; Classic 2026's `callout`
24 is 32px and its `title` 12 is 16px. The bundled report-theme schema
names "pixels" explicitly where it means pixels (outline thickness, dash
lengths) but leaves font sizes unit-less with an 8..60 bound — a point
range.

Theme Studio now converts at a single rendering/measurement boundary
(`app/lib/fontUnits.ts`). Raw point values stay raw everywhere else: the
property editor shows 10 and the exporter writes 10, while the preview
draws 13.333px.

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

This is a rasterisation artefact of correct fractional geometry.

*Task 8 correction:* the geometry above was measured, but the snapped row
was computed by rounding those measured edges, not read off a screen, so
“measured, not assumed” overstates it by one step. The model is Blink's own
rule and it predicts everything since, but no painted pixel has been read
in either product. See §17.8. Task 8 also re-measured this table from
scratch after the box change — §17.3 supersedes the numbers here.

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
would be starved further at a true 14px. It was, and §16 re-derives the
constant.

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

> **Update — phase 2 tasks 3 and 4.** 30 of the 66 now resolve through a
> text class instead of the literal. The 36 that remain are 24 in the
> cartesian registries (data-label titles and details, error-bar labels,
> small-multiple sub-headers, stacked totals, Line's secondary axis) and 12
> in Matrix, Pie, Slicer and Card. None of the 36 has an established Power
> BI text role, so none was guessed — see `PHASE_2_BACKLOG.md`.

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

The single largest fidelity defect found. Microsoft documents text classes as
the source of default typography for named visual text roles, with secondary
classes deriving from their primary when absent (§4.1). Classic 2026, a
verbatim Power BI file, matches that shape: **zero** `fontSize` in
`visualStyles` alongside a populated `textClasses`. Studio applies none of it
— it falls back to a literal `6` for 66 properties across 9 registries,
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
*(moderate · cartesian family · medium)* **Resolved in task 7 — see §16.**
`BAR_CHART_BOX.height = 84` was sized against 6px axis text, and each
subsequent correction spent more of it. The boxes stay fixed, which is what
Power BI does; the bar constant was re-derived to 128.

**5 — Font sizes are points rendered as pixels.** *(moderate · whole app ·
medium)* Flagged, not proven. Needs its own investigation.

**6 — `innerPadding` / `maxMarginFactor` fallbacks are unproven.** *(low ·
cartesian family · low)*

---

## 14. Recommended fixes — not implemented

Ordered by correctness impact, with breadth and risk stated.

| # | Fix | Impact | Breadth | Risk | Notes |
|---|---|---|---|---|---|
| 1 | Apply Power BI's text-class defaults instead of falling back to a literal | Critical | 66+72 properties, 9 registries | Medium | More than picking one class — see the design constraints below. Should be one shared helper, not 138 edits |
| 2 | Give every category mark the same rasterised thickness | Critical | Cartesian family | Unknown | **Defect proven, remediation not.** One *candidate* is snapping mark edges to device pixels in the renderer, but it has not been designed or validated and must not be treated as the chosen solution. See the design constraints below |
| 3 | Correct `legend.position` fallback to `Bottom` | Moderate | Cartesian family | Low | One-line per registry; verify against Fluent's explicit value |
| 4 | Derive the natural box height from resolved typography, or grow it | Moderate | Cartesian family | Medium | Do **after** fix 1, since fix 1 changes the required budget |
| 5 | Investigate pt → px conversion | Moderate | Whole app | Medium | Diagnostic first, like this task |
| 6 | Establish real defaults for `innerPadding` / `maxMarginFactor` | Low | Cartesian family | Low | Needs a Power BI artefact this audit did not have |

### Design constraints for fix 1 — text-class inheritance

The shared helper must resolve a **semantic text role**, not read one primary
class. Concretely it needs:

1. a text-role → text-class mapping following §4.1 — an axis *title* is not a
   `label`, and a category axis label does not come from the same class as a
   value axis label;
2. support for the secondary text classes, not only the four primary ones;
3. Power BI-compatible derivation of a secondary class from its associated
   primary class when the theme does not declare it, so a theme carrying only
   the four primary classes resolves the same way it would in Power BI;
4. explicit `visualStyles` properties continuing to win over any text-class
   default — the existing resolution chain stays in front, and the text-class
   lookup becomes the step that runs *instead of* the literal fallback.

Validating (3) needs at least one theme that declares **only** primary
classes. The private fixture declares several secondary classes and so cannot
prove that path by itself.

### Design constraints for fix 2 — equal rasterised thickness

The defect is proven (§5). The remediation is not, and no solution has been
selected. Whatever is chosen must hold across every condition the preview
actually renders in:

- `devicePixelRatio` values other than 1;
- browser zoom;
- hero scales at and below 1.5;
- thumbnails at 1.0;
- responsive chart sizes, where the plot's own dimensions are fractional.

It must also leave `ChartLayout` resolution-independent: the engine is
provably correct here and rounding inside it would trade a visible artefact
for a wrong model. Designing and proving this is its own task.

Fixes 1 and 2 are independent and can land in either order. Fix 4 depends on 1.

---

## 15. Acceptance questions

1. **Why does the private theme + Fluent differ from the private theme + Classic?** 40 of 432 resolved
   properties differ; 38 are Classic falling back where Fluent declares a
   value. The visible consequences are typography (6px vs 10.5px), legend
   placement, and `innerPadding` 10 vs 50 — with all geometry changes
   conserving exactly against the gutters.
2. **Which differences are definitely base-theme values?** Two —
   `categoryAxis.gridlineStyle` and `valueAxis.gridlineStyle`. Everything else
   Fluent supplies is met by a Studio fallback on the Classic side.
3. **Which come from Studio fallbacks?** 38 of 40. Listed in §2.
4. **Is the Classic axis typography fallback of `6` faithful?** **No —
   definitely incorrect.** Microsoft documents text classes as the source of
   default typography for named visual text roles (§4.1), and Classic 2026
   matches that shape: no font size in `visualStyles` at all, alongside a
   populated `textClasses`. Nothing in Power BI's documented behaviour yields
   6.
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

**Scope statement — sections 1 to 15 only.** The audit itself was diagnosis
only. No resolver fallback, base theme,
`ChartLayout`, renderer, sample data or CSS was modified. All browser overrides
were temporary, reverted in-session, and are not in the repository. The private
theme file was not modified, and its working copy lived only in the gitignored
`themes/local/`.

---

## 16. Natural cartesian box sizing (task 7)

*Unlike sections 1-15, this one implements. It is recorded here because it
spends the measurements those sections took.*

### 16.1 The question, and why it is not a styling question

The cartesian boxes were sized against undersized fallback typography.
Two later corrections changed what the gutters legitimately spend: text-
class inheritance (§4.2, tasks 3-4) fixed where axis typography comes from,
replacing `fontSize → 6` fallbacks with resolved text-class sizes, and the
proven point-to-pixel conversion (§4.4, task 5) then scaled those sizes by
4/3. Both took their space out of the plot, and nothing was watching the
remainder.

Font-face aliases are **not** part of that story. Task 6 settled their
semantics but also measured that they move no geometry: `estimateText`
never reads `fontFamily`, so all five cartesian previews are byte-identical
to task 5 (§4.6). Aliases change what the browser paints, not what
`ChartLayout` computes.

The tempting fix — grow the box until the plot is back to what it used to
be — is the one thing that must not happen, because a theme preview whose
plot never changes size cannot show a user what their font choice costs. So
the first question was not *how big* but *fixed or dynamic*.

### 16.2 Power BI's own answer: the container is an input

From `desktop.min.js` in Power BI Desktop **2.157.879.0 (26.08)**, the same
bundle §4 and §6 read. `VisualContainer.getVisualViewport(e, t, i, a)` takes
the container's width and height as arguments and returns

```
width  = e - (border padding + container padding)
height = t - (border padding + container padding)
           - title - subtitle - divider - warning banners
```

Every formatting-derived term **subtracts**. The title's contribution is
measured from its own font properties (`getTitleFontProperties`, then
wrapped against the available width), so a bigger title font genuinely
costs the visual plot area — and nothing anywhere in that path feeds a
measurement back into `e` or `t`. The bundle contains no
`autoSizeToContent`, `resizeToContent`, `preferredSize` or `shrinkToFit`;
the five hits for `autoResize` are all one gallery-carousel component in
the authoring UI.

A visual's rectangle is authored, and formatting reflows what is inside it.
That settles the model: **Theme Studio's boxes stay fixed, and larger
typography must visibly consume plot.**

The same reasoning disposes of category count, which was the other
candidate for a dynamic input. Adding categories to a Power BI bar chart
makes the bars thinner and eventually scrolls; it does not make the visual
taller.

### 16.3 What the constants actually were

None of the three was ever derived from Power BI. Each was back-computed
from a *plot* target using the gutters of its day:

| Box | Height | Chosen to reproduce |
|---|---:|---|
| `BAR_CHART_BOX` | 84 | the pre-engine layout's ~57px of plot |
| `COLUMN_CHART_BOX` | 128 | `.column-preview__plot`'s CSS `height: 128px` |
| `LINE_CHART_BOX` | 150 | `.line-preview__plot`'s 120px, plus ~30 for the new value gutter |

The line chart's is the interesting one: growing the box to give a new
gutter its space back is exactly the compensating move §16.2 rules out,
applied once by hand before there was a model to rule it out.

### 16.4 The floor

A fixed box still owes the shipped themes enough room to stay legible. The
rule, `minimumPlotHeight(divisions, labelCssPx)`: every division of the
plot must be at least one line of the label stacked down it, measured in
the CSS pixels the browser actually draws (§4.4’s 4/3 conversion — measuring
the raw point value understates the requirement by a quarter).

Two things vary by orientation, and both follow from which way the value
scale runs:

| | divisions | labels dividing the height |
|---|---|---|
| **Bar** (horizontal) | one per category row | `categoryAxis` |
| **Column, Line** (vertical) | `DEFAULT_TICK_COUNT` intervals | `valueAxis` |

A bar chart lays its categories down the plot and runs its values along the
width; a column or line chart does the opposite, so the labels stacked down
its height are value-axis tick labels.

The sample data hides the first distinction — four categories, four tick
intervals — and the shipped bases hide the second, sizing the two axes at
10pt and 9pt on Classic 2026 and 10.5pt for both on Fluent 2. Reading the
wrong axis therefore moves a floor by under two units and passes. The tests
separate both explicitly, the axis one with a synthetic 30pt-against-6pt
theme.

### 16.5 Measured, before

Natural units, production inputs (axis titles included; they are worth ~21
units of gutter on their own). “Line” is one line of the axis that divides
the height, so it is category-axis text for Bar and value-axis text for
Column and Line — which is why Classic's vertical charts show 16.20 (9pt)
where its bars show 18.00 (10pt):

| Fixture | Chart | Box | Gutter | Plot h | Slot | Line | Verdict |
|---|---|---:|---:|---:|---:|---:|---|
| starter + Classic | Bar | 84 | 41.80 | 42.20 | 10.55 | 18.00 | **short 29.8** |
| starter + Fluent | Bar | 84 | 22.90 | 61.10 | 15.27 | 18.90 | **short 14.5** |
| private + Classic | Bar | 84 | 43.60 | 40.40 | 10.10 | 18.00 | **short 31.6** |
| private + Fluent | Bar | 84 | 41.80 | 42.20 | 10.55 | 18.90 | **short 33.4** |
| starter + Classic | Column | 128 | 43.60 | 84.40 | 21.10 | 16.20 | ok |
| starter + Fluent | Column | 128 | 22.90 | 105.10 | 26.27 | 18.90 | ok |
| starter + Classic | Line | 150 | 43.60 | 106.40 | 26.60 | 16.20 | ok |
| starter + Fluent | Line | 150 | 22.90 | 127.10 | 31.77 | 18.90 | ok |

Every bar row was shorter than the label naming it, in all four fixtures.
Column and Line cleared the floor in all four, and by more than first
recorded: the original pass measured them against category-axis text, which
on Classic 2026 is a point larger than the value-axis text that actually
divides their height. Correcting the axis loosens their floor and changes
no verdict.

**So only one constant was wrong.** The compression was real everywhere,
but only the bar chart's box had been pushed past what it could afford.

### 16.6 The new bar constant

`BAR_CHART_BOX.height = 128`, from three independent directions:

1. **The floor.** The worst measured requirement across the shipped bases
   and the private validation theme is 117.4; 128 clears it in all four
   fixtures with headroom for a theme whose label text is larger than
   either base ships.
2. **The transpose.** A clustered bar is a clustered column over the same
   four categories with the axes swapped. An equal footprint is the
   expected answer; 84 was a divergence introduced by plot preservation,
   which the model rejects.
3. **Already proven to fit.** The column charts render at 128 in both the
   hero and the thumbnail today, and `.bar-preview__plot` and
   `.column-preview__plot` are structurally identical rules.

Column and Line were re-checked against the same floor and left alone. 150
survives on its margins rather than on the reasoning that produced it, and
the line chart has the most in-plot furniture — markers, series labels,
leaders — to keep clear of.

### 16.7 Measured, after

| Fixture | Bar box | Gutter | Plot h | Slot | Line | Verdict |
|---|---:|---:|---:|---:|---:|---|
| starter + Classic | 128 | 41.80 | 86.20 | 21.55 | 18.00 | ok |
| starter + Fluent | 128 | 22.90 | 105.10 | 26.27 | 18.90 | ok |
| private + Classic | 128 | 43.60 | 84.40 | 21.10 | 18.00 | ok |
| private + Fluent | 128 | 41.80 | 86.20 | 21.55 | 18.90 | ok |

All twenty chart × fixture combinations now clear the floor. Bar slots
roughly doubled, from 10.1-10.55 to 21.1-21.55.

**Rendered, in the browser** (Classic 2026, thumbnail, scale 1.0): the bar
marks measure **18.98px** against an 18px label line — the mark, not the
slot, so `innerPadding` is already taken off. At 84 the same measurement
was ~10.5px. Every tile, hero and thumbnail, reports **zero** descendants
escaping its bounds, on both bases. The hero renders the box at 192px
(128 × 1.5) and the thumbnail at 128px, from one natural geometry.

### 16.8 What this deliberately did not fix

- **Data labels overflowing the plot on Column with the private validation
  theme.** A taller box does not help: the tallest column reaches the top
  of the plot whatever its height, so its label has nowhere to go. Power BI
  flips such a label inside the column. That is label placement, not box
  sizing.
- **Rasterisation** (§5). Untouched, as before.
- **The nominal 372 width.** Nothing measured argued for changing it.

### 16.9 Why this cannot rot again quietly

`tests/cartesianBoxes.test.ts` asserts the floor for all five charts on
both shipped bases, that the floor reads the axis that divides the height,
that a bigger font shrinks the plot without moving the box, that category
count does neither, and — as the anti-vacuity check — that the old 84 still
**fails** the floor.

Mutation-checked, 15 tests:

| Mutation | Fails |
|---|---:|
| `BAR_CHART_BOX.height` back to 84 | 6 |
| floor measured in raw points, not CSS px | 2 |
| `minimumPlotHeight` ignores `divisions` | 1 |
| `divisionsOf` collapses to the tick count | 1 |
| `verticalDivisionAxis` always `categoryAxis` (wrong for Column, Line) | 1 |
| `verticalDivisionAxis` always `valueAxis` (wrong for Bar) | 1 |

The last two are only detectable against the synthetic asymmetric theme;
the shipped bases size the two axes too similarly to expose them. An
earlier version of that test derived its own fixture from the function it
was testing, so both mutations passed it — the expected axis is now a
literal table.

One assertion was deliberately **removed**: that `BAR_CHART_BOX` and
`COLUMN_CHART_BOX` have equal width and height. That 128 currently matches
Column is good rationale for choosing it (§16.6) but it is not a durable
rule — Power BI's fixed-container behaviour requires nothing of the sort,
and two visual types are free to have different preview rectangles.

---

## 17. Cartesian rasterisation (task 8)

*Implements nothing. §5 diagnosed unequal bar thickness and deferred the
fix; task 7 then changed the bar box, so this re-measures from scratch and
settles what the correct fix would be.*

### 17.1 Environment

Chromium 148 in the Claude browser pane, viewport 1280, **`devicePixelRatio`
= 1**, Power BI Desktop 2.157.879.0 (26.08). Every number below is fresh;
none is carried over from §5.

### 17.2 Three coordinate spaces, kept apart

| | space | measured by |
|---|---|---|
| A | ChartLayout natural units | `scale.category(i, n)` |
| B | CSS layout, pre-transform | `getComputedStyle().height` |
| B′ | CSS layout, post-transform | `getBoundingClientRect()` |
| C | device pixels | `round(edge × dpr)`, **modelled** |

A and B are exact and equal for every mark. C is the only place a
difference appears, and see §17.8 on why it is modelled rather than read.

### 17.3 Fresh baseline after task 7

Four equal-valued categories. “CSS” is `getBoundingClientRect().height`,
identical across all four marks in every row — spread `0.0000` throughout.
“Snapped” is `round(bottom) - round(top)` per mark.

**Classic 2026** (`innerPadding` 10):

| Chart | Presentation | Plot | CSS mark | Snapped | Spread | Relative |
|---|---|---:|---:|---|---:|---:|
| Clustered Bar | hero 1.5 | 129.3047 | 26.1563 | 26, 27, 26, 26 | 1 | 3.8% |
| Clustered Bar | thumb 1.0 | 86.2031 | 17.4375 | 18, 17, 18, 17 | 1 | 5.7% |
| Stacked Bar | thumb 1.0 | 86.2031 | 18.2188 | 18, 19, 18, 19 | 1 | 5.5% |
| Clustered Column | thumb 1.0 | 111.4063 | 22.5469 | 23, 23, 23, 23 | **0** | — |
| Stacked Column | thumb 1.0 | 111.4063 | 23.5469 | 23, 23, 23, 24 | 1 | 4.2% |

**Fluent 2** (`innerPadding` 50):

| Chart | Presentation | Plot | CSS mark | Snapped | Spread | Relative |
|---|---|---:|---:|---|---:|---:|
| Clustered Bar | hero 1.5 | 157.6641 | 17.7188 | 17, 18, 17, 18 | 1 | 5.6% |
| Clustered Bar | thumb 1.0 | 105.1094 | 12.8594 | 12, 13, 13, 13 | 1 | 7.8% |
| Clustered Column | thumb 1.0 | 121.5000 | 13.6563 | 14, 14, 13, 14 | 1 | 7.3% |
| Stacked Column | thumb 1.0 | 121.5000 | 14.8750 | 15, 15, 15, 14 | 1 | 6.7% |

**Task 7 halved the relative error.** §5 recorded 11.5% on an 8.7px bar
(private theme + Fluent, hero). The same class of case now reads 5.6% on a
17.7px bar, because a taller box gives each row roughly twice the
thickness while the absolute error stays pinned at one pixel. The defect
is not fixed; it is diluted.

### 17.4 Presentation scale, and why it is not the cause

Sweeping the hero transform, Clustered Bar on Classic:

| Scale | CSS mark | Fractional tops | Snapped | Spread |
|---:|---:|---|---|---:|
| 1.00 | 17.4375 | .2031 .7656 .3125 .8594 | 18, 17, 18, 17 | 1 |
| 1.25 | 21.7969 | .1602 .1133 .0469 .9805 | 22, 22, 22, 22 | **0** |
| 1.50 | 26.1563 | .1172 .4609 .7813 .1016 | 26, 27, 26, 26 | 1 |
| 2.00 | 34.8750 | .0313 .1563 .2500 .3438 | 35, 35, 35, 35 | **0** |

CSS spread is `0` at every scale. The defect **is present at natural scale
1.0**, so the hero transform does not cause it, and a presentation-layer
fix cannot cure it. Which scales happen to look clean is phase luck.

### 17.5 Device pixel ratio

Only DPR 1 was available. It did not need emulating: snapping evaluates
`round(edge × scale × dpr)`, so **scale `s` at DPR 1 is arithmetically the
same experiment as scale 1 at DPR `s`**. The sweep in §17.4 therefore
covers the DPR question, and answers it: the outcome depends on the
product of scale and DPR, i.e. it is **device-pixel dependent, not
CSS-layout deterministic**. CSS layout is invariant; only C moves.

### 17.6 Phase sweep: this is not an edge case

For each configuration, how many of 64 sub-pixel plot origins paint
unevenly (64 because Blink lays out in 1/64px LayoutUnits):

| `innerPadding` | 4 cats | 5 | 6 | 7 |
|---:|---:|---:|---:|---:|
| 0 | 64/64 | 64/64 | 64/64 | 64/64 |
| 10 | 60/64 | 64/64 | 24/64 | 30/64 |
| 50 | 42/64 | 64/64 | 54/64 | 46/64 |

(plot 86.2031; the 129.3047 hero plot behaves the same way, range 19/64 to
64/64.) Spread never exceeds 1. Several configurations are uneven at
**every** phase: when the slot is not a whole number there may be no offset
at which all marks quantise alike.

### 17.7 Root cause

Not geometry. `ChartLayout` divides the plot into exactly equal slots that
tile it with no gap, no overlap and **zero** end-to-end drift at 4, 5, 6 and
7 categories, and the browser gives every mark an identical CSS height.

The cause is the **rendering primitive**. Each mark is an HTML box
(`.bar-item__fill`, `.column-item__fill`) positioned by percentage inside
`.chart-plot`, and Blink pixel-snaps a box's background at paint time, as
`PixelSnappedIntRect` does: `round(top + height) - round(top)`, each box
independently. A fractional slot puts consecutive marks on different
sub-pixel phases, so identical fractional heights quantise to integers one
apart.

The chain, for the record:

```
scale.category(i, n)  slot = plotH / n; size = slot - slot·pad/100
categoryPercent       top% = (start-origin)/plotH; height% = size/plotH
.bar-item             top: top%; height: height%
.bar-item__fill       height: (100-gapSize)%; top: 50%; translateY(-50%)
```

Three things are worth keeping apart here:

- **All five** cartesian previews share the same category geometry, via
  `categoryPercent` over `ChartLayout`.
- **The four Bar and Column previews** paint their rectangular marks as
  HTML boxes, using the markup above. That is where the snapping applies,
  so Bar and Column are **one mechanism on two axes**, not two defects.
- **Line** consumes the same geometry — it calls `categoryPercent` for its
  point positions — but paints its series, markers and error bars as SVG.
  It has no rectangular mark in the HTML box path, so the mechanism
  diagnosed here does not reach it.

### 17.8 What was not measured

This environment cannot read painted pixels — no screenshots, no pixel
readback. Space C above is therefore a **model**, not an observation. It is
Blink's documented box-decoration snapping rule rather than an invented
one, and it predicts every measurement taken, but it has not been confirmed
against actual output here.

§5 has the same limitation. Its “device pixels after snapping” row was
computed by rounding the measured CSS edges, not read off a screen, and its
claim that the defect “was measured, not assumed” overstates that by one
step: the *geometry* was measured, the *quantisation* was modelled.

### 17.9 What Power BI does

From `desktop.CartesianVisuals.min.js` (Desktop 2.157.879.0), the bundle
that actually implements the cartesian family — `desktop.min.js` does not,
and has no `cartesianChart` or `mainGraphicsContext` at all.

Power BI paints marks as **SVG `<rect>`**. The shape renderer appends
`rect` elements into `mainGraphicsContext`, itself an `<svg>`, and the
attribute setter writes coordinates straight through:

```js
e.attrs({ width: t.width, height: t.height, x: t.x, y: t.y })
```

No rounding, anywhere in that path. The bundle contains no
`shape-rendering` and no `crispEdges`, so the default `auto` applies and
fractional edges **antialias**.

#### Evidence grades

This section mixes what was recovered from a shipped binary with what
follows from it, so the two are graded separately.

**PROVEN-RUNTIME.** Power BI's cartesian marks are SVG `<rect>` elements
with unrounded `x/y/width/height`, and that path contains no
`shape-rendering` or `crispEdges` override. Power BI does **not**
implement the per-box integer snapping policy that Theme Studio's HTML box
path is subject to. Read directly from
`desktop.CartesianVisuals.min.js` in build 2.157.879.0.

**STRONGLY-SUPPORTED.** SVG's default fractional-edge rendering should
avoid the independent box-decoration snapping mechanism diagnosed in
§17.7, because that mechanism is specific to how boxes are painted and
does not apply to SVG shapes. This is an inference from the two rendering
paths, not a measurement of either.

**UNVERIFIED.** Power BI's actual painted bar thickness, at any particular
Desktop zoom or DPR, was not pixel-read or screenshot-measured in this
task. Nothing here establishes what its bars look like on screen, only
what its code asks the renderer for.

So the honest form of “does Power BI allow 1px raster variation?” is: its
code contains no step that would introduce one, and the primitive it uses
is not the one that introduces Theme Studio's. Whether its output is in
fact uniform was not observed.

### 17.10 Remediation options

| | Option | Verdict |
|---|---|---|
| A | No remediation | Weak as a *justification*: it would rest on Power BI behaving the same way, and its recovered code does not implement the policy Theme Studio is subject to |
| B | Shared-boundary snapping | Does not achieve the goal. It conserves the plot, but cannot guarantee equal painted thickness while keeping the present equal fractional slots — see below |
| C | Equal integer thickness | Rejected on policy, not on arithmetic. It is achievable (see below) but changes the geometry policy, and does not reproduce the unrounded SVG path recovered from Power BI |
| D | SVG rects | **The best-supported, Power-BI-aligned candidate.** Same primitive and same absence of a rounding step, consuming the existing ChartLayout numbers unchanged. Not yet demonstrated to change painted output, because painted output cannot be read here |
| E | Presentation-scale adjustment | Rejected on evidence: §17.4 shows the defect at scale 1.0, where there is no transform to adjust |

B deserves emphasis because it is the intuitive answer and the one §5
floated. Stated precisely:

> Shared-boundary snapping cannot guarantee equal painted mark thickness
> while also preserving the current equal fractional slot geometry. For
> fractional slots, rounded adjacent boundaries necessarily distribute
> residual device pixels somewhere; depending on phase, mark extents can
> differ by one.

That is narrower than “no quantising policy can work”, which would be
false. A different policy **could** force equal integer mark thickness by
moving the residual into the spacing between marks — option C. It is
rejected because it would change the geometry policy, making gaps unequal
to keep marks equal, and because it would not reproduce the unrounded SVG
path recovered from Power BI. Not because it is impossible.

The measured support for the B claim is narrow too: §17.12's phase test
covers the two measured plot heights at four categories with
`innerPadding` 0. The sweep in §17.6 shows other configurations that do
have uniformly snapped phases, so “no phase works” is a statement about
those two cases, not about fractional slots in general.

### 17.11 Why task 8 stops here

D is the best-supported candidate, and it is not a small change.
`.bar-item__fill` is an HTML
box carrying background, border, border-radius, error bars, value labels
and reference-line furniture; moving the mark to SVG means moving or
re-anchoring all of it across four previews. That is a renderer migration,
and this task's own instruction is not to migrate rendering technology for
a 1px cosmetic defect without strong evidence.

The evidence is strong for the *diagnosis*, but the *change* cannot be
verified here: an environment that cannot read painted pixels cannot
demonstrate that an SVG migration fixed an appearance problem, nor compare
the result against Power BI's actual output. So no rounding was added —
adding B or C would import a rounding step that Power BI's recovered code
does not contain — and D is recorded as a scoped follow-up that needs a
pixel-verification route before it can be justified or accepted.

The backlog item stays **open**.

Task 7 has meanwhile halved the relative error, which lowers the urgency
without changing the analysis.

### 17.12 What is pinned instead

`tests/cartesianRaster.test.ts` holds the evidence this conclusion rests
on, so it cannot rot into a wrong premise: equal categories get exactly
equal marks; slots tile the plot with no gap, overlap or drift;
`innerPadding` thins the mark monotonically and keeps it centred;
inversion reorders slots without resizing them; and — documenting the
arithmetic behind option B — *the two measured zero-padding cases* have no
uniformly snapped phase, while a whole-number slot snaps evenly at every
phase.

That phase test is deliberately named for its scope. It covers plot
heights 86.2031 and 129.3047 at four categories with `innerPadding` 0, and
nothing wider: §17.6 lists configurations that *do* have uniform phases, so
a test asserting otherwise in general would be false.

Mutation-checked, 6 tests: rounding each mark height, flooring every edge,
ceiling every edge, or forcing an integer slot each fail 3; dropping the
centring half-padding or ignoring `innerPadding` each fail 1.

### 17.13 Remaining uncertainty

- Painted output is unverified in both products (§17.8). The model is
  Blink's rule and fits every measurement, but confirming it needs a
  screenshot or pixel-readback route this environment lacks.
- Power BI Desktop was read from its bundle, not driven through its UI. The
  primitive and the absence of a rounding step are PROVEN-RUNTIME; that SVG
  therefore avoids the mechanism is STRONGLY-SUPPORTED; what its bars
  actually paint at a given zoom or DPR is UNVERIFIED. No claim here rests
  on having seen Power BI's output, because it was not seen.
- Only DPR 1 was available directly. §17.5 argues the scale sweep is
  equivalent, which is sound arithmetic but not the same as testing a real
  high-DPI display.
- Whether antialiased marks are *preferable* here is a judgement about
  fidelity, not a measurement. Soft edges at 12px may read as blurrier than
  the current crisp ones.
