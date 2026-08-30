# Power BI Theme Studio — Architecture Review

**Date:** 2026-08-18
**Reviewed at commit:** `201a1a4`
**Status at review:** build clean, lint clean, 147 tests passing
**Scope:** independent assessment of the property-mapping architecture and renderer quality. No code was changed.

> **Sections 1–8 are the review exactly as written on 2026-08-18 and are deliberately left unchanged, including findings since fixed.** They record what was true at commit `201a1a4`. What has been remediated since is tracked separately in [§9](#9-remediation-status).

---

## Contents

1. [Architecture summary](#1-architecture-summary)
2. [What is well designed and should remain](#2-what-is-well-designed-and-should-remain)
3. [Architectural weaknesses and risks](#3-architectural-weaknesses-and-risks)
4. [Rendering weaknesses](#4-rendering-weaknesses)
5. [Recommended target architecture](#5-recommended-target-architecture)
6. [Prioritised remediation plan](#6-prioritised-remediation-plan)
7. [Things that should NOT be rewritten](#7-things-that-should-not-be-rewritten)
8. [Repository hygiene](#8-repository-hygiene)
9. [Remediation status](#9-remediation-status) — *added after the review*

---

## 1. Architecture summary

**Stack:** Vite + React 19 + TypeScript (strict). No state library, no CSS framework, no charting library. Static SPA deployed to Cloudflare Pages.

**Size:** ~13.5k lines in `app/lib`, ~8.5k lines in `app/components`, 2,288 property definitions, 147 tests.

### Pipeline as built

```
theme JSON ──parseThemeJson──> PowerBITheme (untyped JSON bag, held verbatim in React state)
                                      │
                    mergeThemeOverBase(selectedBaseTheme, userTheme)   ← deep merge
                                      │
                                 effectiveTheme
                                      │
           ┌──────────────────────────┼───────────────────────────┐
           │                          │                            │
    resolveTheme()          resolve<Visual>Style()          resolveChromeStyle()
   (11 global tokens)     (per-visual registries)        (shared chrome, 135 props)
           │                          │                            │
           └──────────────> Resolved*Style objects <───────────────┘
                                      │
                        VisualPreviews.tsx (2,934 lines of JSX)
                                      │
                              DOM + CSS + some SVG
```

### Layers

| Layer | Files | Role |
|---|---|---|
| Property metadata | `app/lib/*Properties.ts` | 2,288 `PropertyDefinition` records: id, label, description, path, valueType, min/max/options, section |
| Resolution engine | `app/lib/properties.ts`, `theme.ts`, `baseThemes.ts` | read / write / resolve / merge primitives |
| Editor | `app/components/PropertyEditor.tsx` | metadata → generic controls |
| Renderers | `app/components/VisualPreviews.tsx`, `ChartParts.tsx`, `GlobalPreviews.tsx` | resolved values → DOM |

In principle these are cleanly separated. Sections 3.4 and 3.6 describe where that separation does not hold.

---

## 2. What is well designed and should remain

### The `PropertyDefinition` metadata model

One declarative record drives label, description, control type, validation bounds, enum options, grouping, read path *and* write path. `PropertyEditor` is genuinely generic over it — it never knows what a bar chart is. This is the right abstraction and it scales to thousands of properties.

### Path-addressed surgical writes

`updateThemeValue` / `deleteThemeValue` clone-and-patch a single JSON path, with empty-container pruning on delete. The app never reconstructs the theme from resolved values.

### Round-trip fidelity is correct — verified

Import → edit → export was traced at runtime. All of the following survive unchanged:

- visual types with no registry (`waterfallChart`)
- style-preset buckets (`clusteredBarChart["Data labels"]`)
- unknown vendor root keys

This is the single most important correctness property of the product, and it holds. It holds *because* of the two decisions above; they should not be traded away for a normalised internal model.

### Base-theme provenance

`themes/base/*.json` were extracted from the installed Power BI Desktop binary. The dropdown-label → file mapping was confirmed from the application's own minified code (`desktop.min.js`: `S="CY18SU07"`, `w="CY26SU07"`, `T="Fluent2-CY26SU07"`). Each file carries a `_note` recording how it was obtained and what, if anything, was reconstructed. Classic 2018 is explicitly documented as a chronological deep-merge of a delta chain rather than a verbatim export.

### Test discipline

147 resolver-level tests, with regression cases named after the bug they prevent (e.g. *"category label colour reads textClasses.largeLightLabel.color specifically, not fourthLevelElements"*).

### `mergeThemeOverBase`

Deep, index-aware, override-wins. Correct semantics, isolated, tested.

---

## 3. Architectural weaknesses and risks

### 3.1 The wildcard bucket is ignored for ~94% of properties — **critical**

`resolvePropertyValue` reads **only** `visualStyles[visual]["*"]`. Only `resolveChromeValue` also consults `visualStyles["*"]["*"]`. Power BI honours the wildcard bucket for *every* property.

Runtime-verified with a theme setting both a chart property and a chrome property in the wildcard bucket only:

```
CHART  property via wildcard bucket: expected #AA0000, got #0B0C0C   ← silently dropped
CHROME property via wildcard bucket: expected #00AA00, got #00AA00   ← works
```

Against the real Fluent 2 base theme this discards **41 of 70** shared-bucket values:

| Group | Values ignored |
|---|---|
| `categoryAxis` | 10 |
| `valueAxis` | 9 |
| `filterCard` | 8 |
| `outspacePane` | 4 |
| `legend` | 3 |
| `line`, `outline`, `plotArea`, `y2Axis`, `lineStyles`, `wordWrap`, `*` | 1 each |

**Impact.** The base-theme selector — the newest feature — is substantially non-functional for the base theme it most affects. A hand-written theme using the common wildcard idiom appears to do nothing.

**Source:** `app/lib/properties.ts:116` (`readVisualStyleValue` reads a single visual key), vs `:165` (`resolveChromeValue`, which does the two-step lookup).

---

### 3.2 Theme token references are silently dropped — **critical**

Base themes legitimately write a **token name** where a hex is expected:

```json
{ "solid": { "color": "foregroundNeutralSecondary" } }
```

`readVisualStyleValue` tests the string against `HEX_COLOR`, fails, returns `undefined`, and resolution falls through to a hardcoded literal:

```
RAW:      {"solid":{"color":"foregroundNeutralSecondary"}}
resolved: #242424        ← theme.foreground        (wrong)
correct:  #616161        ← theme.foregroundNeutralSecondary
```

The same applies to `ThemeDataColor` expressions:

```
RAW:      {"solid":{"color":{"expr":{"ThemeDataColor":{"ColorId":0,"Percent":0}}}}}
resolved: #E3E3E3        ← hardcoded fallback      (wrong)
correct:  #118DFF        ← dataColors[0]
```

Fluent 2 contains **21** `ThemeDataColor` expressions and Classic 2026 contains **11** token references. `Percent` additionally encodes shade/tint and is not modelled at all.

**Failure mode is the dangerous kind:** no error, no warning, a plausible-looking wrong colour.

**Source:** `app/lib/properties.ts:90` (`HEX_COLOR`), `:119–127` (the colour branch).

---

### 3.3 Style presets are entirely unimplemented

Real themes carry named preset buckets alongside `"*"`. In Fluent 2, **19 visual types** have them:

| Visual | Presets |
|---|---|
| `tableEx`, `pivotTable` | None, None sparse, None condensed, Minimal, Sparse, Condensed |
| `lineChart`, `areaChart`, combo charts | Data labels, Straight line, Data labels - straight line |
| `actionButton` | Outline, Transparent, Icon & Text |
| `pageNavigator`, `bookmarkNavigator`, `advancedSlicerVisual` | Tab |
| bar/column families, `ribbonChart` | Data labels |

The reader hardcodes `["*", ...]` at `properties.ts:116`. `chrome.stylePreset.name` exists as an editable property but selects nothing — it is a label in `PropertyEditor` and no more.

Presets round-trip safely, so this is a **missing capability, not data loss** — but it is a headline Power BI feature.

---

### 3.4 No declarative property → rendered-element mapping — **the conceptual gap**

There are **2,288 property definitions** and **zero** machine-readable statements about where any of them render. The mapping lives entirely inside 2,934 lines of hand-written JSX.

Consequences:

- **Coverage is unmeasurable** except by grepping for `.fieldName` — the method actually used to produce the "~56 unused fields per chart" figure, which has real false positives (fields consumed via generic component props such as `<Gridlines axis={...}>`).
- A property can resolve correctly and be **read by nothing, indefinitely**, with no signal.
- Nothing can tell the user **which preview element a control affects**.
- `PROPERTY_EFFECTS` (`app/lib/propertyEffects.ts`) covers **22 of 2,288** properties. It is a good idea implemented as a lookup table, not a system.

This is the weakness most directly matching the concern that the mapping architecture "may be incomplete or conceptually wrong". It is incomplete by construction: there is no mapping artefact, only code.

---

### 3.5 Two parallel resolution models

`ResolvedTheme` (11 flattened global tokens) and the per-visual `Resolved*Style` objects coexist. Resolvers take **both**:

```ts
resolveBarChartStyle(theme: PowerBITheme, base: ResolvedTheme)
```

`ResolvedTheme` exists mainly to supply fallbacks to the second. This is why `categoryLabelColor` — a *Card* concern — has been added to the global `ResolvedTheme` type. The boundary is not principled and will keep attracting visual-specific fields.

---

### 3.6 Resolution collapses "unset" and "set to the default value"

`resolvePropertyValue` returns a value, never a provenance. Anything that needs presence-vs-value must bypass the resolver — which is exactly what the renderer does:

```ts
// app/components/VisualPreviews.tsx:72
function hasSmallMultiplesOverride(theme: PowerBITheme, visual: string): boolean {
  const group = readThemeValueAtPath(theme, ["visualStyles", visual, "*", "smallMultiplesLayout"]);
  return Array.isArray(group) && group.length > 0;
}
```

This is the **one place a renderer understands raw Power BI JSON**. It is small, but it is a symptom rather than an accident: the "zero/false-default trap" it works around (a default of `0`/`false`/`2` being indistinguishable from "not set") has recurred repeatedly in this codebase — small multiples defaulting on, divider widths of 0, compound `*Width` fallbacks.

---

### 3.7 Per-visual duplication and observable drift

The four cartesian registries total ~4,200 lines and are **~72% identical** after normalising the visual key and id prefix (298 differing lines out of ~1,060 when sorted).

Drift has already occurred:

```
labelContainerMaxWidth default: barChart 0, columnChart 1
preferredCategoryWidth default: barChart 0, columnChart 1
```

Nothing enforces that sibling charts agree.

Wiring is likewise hand-repeated:

| Location | Repetition |
|---|---|
| `ThemeStudio.tsx` | 17 resolver calls + 16 `resolveChromeStyle` calls |
| `VisualGallery` | 16 style props on one component |
| `PropertyEditor.tsx` | 73 `ID_PREFIX` dispatch branches |

Adding one visual touches five files.

---

### 3.8 `npm test` does not run all tests

Test paths are listed manually in `package.json`. **`tests/mergeThemeOverBase.test.ts` is not in the list and has never run in CI** — 6 tests covering base-theme merge semantics, silently skipped.

```
26 test files on disk
25 listed in npm test
NOT RUN: tests/mergeThemeOverBase.test.ts
```

---

### 3.9 `forState` assumes a fixed path shape

```ts
// app/lib/properties.ts:258
path[1] = index;   // assumes ["group", index, "prop"]
```

True for every current registry; silently wrong for any deeper path. Worth an assertion at minimum.

---

## 4. Rendering weaknesses

### Coverage

16 visuals modelled. **12 present in the real base themes are absent**, most notably:

| Missing | Why it matters |
|---|---|
| `cardVisual` | The **modern** Card, superseding the modelled legacy `card` |
| `donutChart` | Extremely common; has its own preset/label handling |
| `areaChart`, `ribbonChart`, `waterfallChart` | Present in all three base themes |
| `scatterChart`, `kpi`, `multiRowCard` | Present in all three base themes |
| `gauge`, `treemap`, `funnel`, `hundredPercentStacked*` | Common report visuals |

### Fidelity, honestly assessed

| Renderer | Assessment |
|---|---|
| Shape family | **Genuinely good** — 22 real `clip-path` geometries, parameter-driven, well tested |
| Line chart | **Good** — real Catmull-Rom / step interpolation, real area paths |
| Bar / column | **Sound** — axis inset logic correct, gridline alignment verified |
| Table / Matrix | **Reasonable** grid model |
| Stacked charts | **Weak** — `stackedSegmentShare = 62` is a fixed split; not genuinely stacked |
| Pie / donut | **Weak** — `conic-gradient`, no real slice geometry; donut not modelled at all |
| Card | **Legacy only** — the modern `cardVisual` is unmodelled |

### Hardcoded sample data

`dataMax={82_000}`, `linePointValues = [42,58,30,68,48]`, `pieSliceValues = [45,30,15,10]` are scattered through the JSX rather than declared per visual. Axis-vs-data consistency is maintained by comment and vigilance — there is a load-bearing comment at `VisualPreviews.tsx:946` explaining why the bar max must equal the axis max.

### The SVG/CSS boundary is ad hoc

The line chart uses `viewBox="0 0 100 100"` with `preserveAspectRatio="none"`, stretched into a non-square container (measured 555×180). Any geometry drawn inside that viewBox distorts. This caused the stretched-marker bug and forced markers out into absolutely-positioned HTML (`chartMarker`). The constraint is now load-bearing but undeclared, and will catch the next person who adds an SVG shape.

### On the core question

> *Do previews genuinely represent Power BI visuals, or merely satisfy implementation checks?*

Mostly the former — but with a systematic bias toward the latter, and the bias is architectural. Because there is no mapping layer (§3.4), "wired up" is demonstrated by *a value being read somewhere in the JSX*, not by *the correct element visibly changing*. The stacked-chart fixed split and the pie chart's formerly-hardcoded `45%` label are both cases where the check passed and the representation was thin. Adding the mapping layer converts this from a matter of diligence into a matter of test coverage.

---

## 5. Recommended target architecture

Keep the pipeline. Fix the resolver, add the missing layer.

### A. One resolution chain, correct at every step

Replace the ad-hoc cascade with a single explicit ordered lookup applied to **all** properties:

```
visualStyles[visual][activePreset]
  → visualStyles[visual]["*"]
  → visualStyles["*"][activePreset]
  → visualStyles["*"]["*"]
  → coded default
```

This fixes §3.1 and provides the hook for §3.3.

### B. A colour-value resolver

One function turning any schema colour form into a hex, given the theme:

| Input | Output |
|---|---|
| `"#RRGGBB"` / `"#RRGGBBAA"` | literal |
| `"foregroundNeutralSecondary"` | theme token lookup |
| `{expr:{ThemeDataColor:{ColorId,Percent}}}` | `dataColors[ColorId]`, shaded by `Percent` |

**Highest value-per-line change available** — fixes both silent-wrongness bugs (§3.2) at a single site.

### C. Return provenance, not bare values

```ts
{ value: string, source: "visual" | "preset" | "wildcard" | "base" | "default", isSet: boolean }
```

Removes the renderer's need to read raw JSON (§3.6), structurally kills the zero/false-default trap, and lets the editor show *where* each value came from.

### D. A declarative preview-target map

Per visual, a table binding property id → preview slot:

```ts
"bar.categoryAxis.labelColor" → { slot: "categoryAxis.tickLabels", css: "color" }
```

Renderers consume slots. Coverage becomes **computable**, gaps become **test failures**, and the editor can highlight the affected element.

### E. Registry composition

Derive the cartesian registries from one shared factory with per-visual deltas — exactly the pattern `shapeFamilyProperties.ts` already uses successfully for four canvas objects. Extend a proven in-repo pattern rather than inventing one.

---

## 6. Prioritised remediation plan

### P0 — correctness (produces silently wrong output today)

1. **Colour-value resolver** — tokens, `ThemeDataColor`, `Percent` shading. *(§3.2)*
2. **Wildcard bucket for all properties**, not just chrome. *(§3.1)*
3. **Add `mergeThemeOverBase.test.ts` to `npm test`**; switch to a glob so this cannot recur. *(§3.8)*

### P1 — architecture (unblocks everything else)

4. Unified resolution chain with provenance; retire `hasSmallMultiplesOverride`'s raw-JSON read. *(§3.1, §3.5, §3.6)*
5. Declarative preview-target map + coverage test asserting every property is bound or explicitly listed non-previewable. *(§3.4)*
6. Style-preset selection — read path plus a preset picker. *(§3.3)*

### P2 — breadth and fidelity

7. `cardVisual`, `donutChart`, `areaChart`, `kpi`, `multiRowCard`. *(§4)*
8. Real stacked-series model; per-visual sample-data declarations. *(§4)*
9. Collapse cartesian registries onto a shared factory; fix the default drift. *(§3.7)*

### P3 — ergonomics

10. Data-driven visual registration (one entry, not five files). *(§3.7)*
11. Applied/Available filter-card editing in the property panel.
12. `switchAxisPosition` — deferred previously; needs the axis layout restructure.

---

## 7. Things that should NOT be rewritten

| Keep | Why |
|---|---|
| **`PropertyDefinition` model** | Correct, generic, the reason `PropertyEditor` scales |
| **Path-addressed writes + verbatim theme state** | The guarantor of round-trip fidelity. Do **not** introduce a normalised internal model that re-serialises on export |
| **`themes/base/*.json` + provenance notes** | Hard-won evidence; treat as reference data |
| **`shapeGeometry.ts`, `lineGeometry.ts`** | Pure, well tested, genuinely good |
| **`mergeThemeOverBase`** | Correct as written; should sit *under* the new resolution chain, not be replaced |
| **`shapeFamilyProperties.ts` composition pattern** | The model to copy for §5E, not to replace |
| **Test-per-registry convention** | Working well; extend rather than restructure |

---

## 8. Repository hygiene

**Checked and clean:**

- `dist/` exists locally, correctly gitignored, **not tracked**.
- Dependencies minimal and appropriate — React + React-DOM only at runtime; no unused runtime deps.
- No meaningful dead code found; sampled exports (`chromeThemePath`, `INTERACTION_STATES`, `propertyThemePath`) are all consumed.
- `themes/local/` (private local themes) correctly gitignored.

**Needs attention:**

- **`.claude/` is untracked.** Contains `launch.json` (dev-server config — useful to a teammate, reasonable to commit) and `settings.local.json` (local tool permissions — should be gitignored). Decide deliberately rather than leaving untracked.
- **Documentation is materially stale:**
  - `README.md` states *"Five visuals — Card, Clustered bar chart, Line chart, Table, Slicer"*. There are **16**.
  - Neither `README.md` nor `PROJECT_OVERVIEW.md` mentions **base themes at all** — the largest recent feature, including the selector, the merge layer, and `themes/base/`.
  - Both require rewriting as part of handover.

**Build state at review:** `tsc` clean, `eslint` clean, 147 tests passing — with the caveat in §3.8 that 6 further tests exist on disk and do not run.

---

## 9. Remediation status

**Updated:** 2026-08-18 · **at commit:** `fe481de` · **state:** build clean, lint clean, **206 tests passing** (was 147).

Sections 1–8 above are the original review and have not been edited. This section records what has changed since, so the review stays usable as a historical baseline while remaining an accurate guide to current work.

### 9.1 Fixed

| Finding | What was done | Evidence |
|---|---|---|
| **§3.1** Wildcard bucket ignored for ~94% of properties | Resolution walks `visualStyles["*"]["*"]` for every property, not just chrome. Chrome and per-visual resolution now share one implementation (`resolvePropertyEntry`) so they cannot drift apart again. | `tests/wildcardBucket.test.ts` (6 tests), incl. Fluent 2's real shared-bucket axis styling reaching the charts that inherit it |
| **§3.2** Theme token references silently dropped | `resolveColorValue` handles all three colour forms — literal hex (6- and 8-digit), named theme tokens, and `ThemeDataColor` expressions with `Percent` shading via the new `tintOrShade`. | `tests/themeColorValues.test.ts` (10 tests) |
| **§3.6** Resolution collapses "unset" and "set to the default value" | `resolvePropertyEntry` returns `{ value, source, isSet }`. `isSet` distinguishes an explicit `false`/`0`/`""` from an unset property. `hasSmallMultiplesOverride` is **deleted**; the renderer no longer reads raw theme JSON anywhere. | `tests/provenance.test.ts` (19 tests), incl. explicit-zero and explicit-false cases |
| **§3.8** `npm test` does not run all tests | Test script switched to a glob (`tests/**/*.test.ts`, `tests/**/*.test.mjs`). `mergeThemeOverBase.test.ts` now runs; new files cannot be silently skipped. | Test count rose 147 → 206 |

### 9.2 Fixed — issues the review did not identify

Three further defects surfaced while implementing the above. All three produced silently wrong output and none was visible from reading source alone; each was proved by a failing test before being fixed.

**Cross-layer precedence was inverted.** Resolution walked visual-specific before wildcard *across the merged theme*, so a **base** visual-specific value beat a **custom** wildcard one. Microsoft's ordering is the opposite: every custom-theme match is considered before any base-theme match — the layer axis dominates the specificity axis. The effect was that a user's own theme-wide setting was silently overridden by the selected base theme. Fixed by resolving `custom` and `base` as separate layers (`themeLayers` / `ThemeSource`); see `tests/layerPrecedence.test.ts`.

**`$id`-tagged state entries were matched by array position.** An index computed from the *merged* view was applied to both layers. Nothing in the theme format requires two themes to declare the same states, in the same order, or at all — Fluent 2 writes five entries for `actionButton.fill` where a custom theme may write one. Resolution therefore read one state's properties as another's: "selected" rendered using "hover" values, or a base `show: false` from the default entry leaked into an unrelated state. Reads now match `$id` **within each layer independently** (`forStateId`), and a state absent from a layer falls through instead of defaulting to index 0. See `tests/stateIdMatching.test.ts` (11 tests). This also exposed `resolveChromeEntry` silently dropping `stateId`, which made filter-card *Applied* read *Available*'s value.

**The state write path emitted sparse arrays.** Reserving index 0 for `"default"` left a hole when a non-default state was written first, serialising as `"fill": [null, {"$id": "selected", …}]`. This is **schema-invalid**: validated with ajv against Microsoft's current report-theme schema, array items must be objects, and `null` is a distinct JSON Schema type. A fresh entry now takes index 0 whatever its state, identified by its own `$id`, producing the compact `"fill": [{"$id": "selected", …}]` — confirmed valid, and adding zero new schema errors when editing on top of the real Fluent 2 fixture.

### 9.3 Architectural consequence — `mergeThemeOverBase` (revises §2 and §7)

§2 and §7 both recommend keeping `mergeThemeOverBase` and placing it *under* the new resolution chain. That is now only half right, and the distinction matters:

- **Root-level reads** (theme tokens, `dataColors`, `textClasses`) still merge, and that is exactly correct — there is no visual/wildcard axis to respect.
- **`visualStyles` precedence must not merge.** A merge discards which layer each value came from, and cross-layer precedence is *defined* by that distinction. An intermediate implementation pre-flattened the four precedence slots into each visual's bucket to compensate; once resolution reported provenance this became actively harmful, because flattening makes every value look `custom-visual`. It was reverted, and `mergeThemeOverBase` is a plain recursive merge again.

`tests/layerPrecedence.test.ts` pins this deliberately, asserting that resolving a *merged* theme gets the precedence case **wrong** — so nobody reinstates that path believing it equivalent to passing layers.

### 9.4 Partially addressed

**§3.5 Two parallel resolution models.** The two parallel *resolution paths* are gone: `resolveChromeValue` now delegates to `resolvePropertyEntry`. The two parallel *view models* remain — resolvers still take `(source: ThemeSource, base: ResolvedTheme)`, and `ResolvedTheme` still attracts visual-specific fields. The boundary is still unprincipled.

### 9.5 Outstanding — unchanged from the original review

| Finding | Status |
|---|---|
| **§3.3** Style presets entirely unimplemented | Outstanding. Preset buckets round-trip untouched but are never read. |
| **§3.4** No declarative property → rendered-element mapping | Outstanding — still the central conceptual gap (§5D). |
| **§3.7** Per-visual duplication and observable drift | Outstanding. The `labelContainerMaxWidth` / `preferredCategoryWidth` defaults still differ between sibling charts. |
| **§3.9** `forState` assumes a fixed `["group", index, "prop"]` path shape | Outstanding. `resolvePropertyEntry` makes the same assumption when applying a `stateId`. Still worth an assertion. |
| **§4** Renderer coverage and fidelity | Outstanding. No visuals added; no renderer changes made. |
| **P2 / P3** items 7–12 | Outstanding. |

Two further questions are open and are **not** code defects:

1. **`ThemeDataColor` `ColorId` indexing.** Implemented as a 0-based index into `dataColors` — the literal reading — but Microsoft's Fluent 2 documentation says buttons use "your first theme data color" while Fluent 2's own JSON gives every button `ColorId: 2`. Both readings are defensible from available evidence. Isolated in `resolveColorValue` so it is a one-line change once settled against a real Power BI render.
2. **Untagged default entries appearing *after* tagged ones.** If a user sets `hover` before `default`, the untagged default entry lands last. Schema-valid, and this app's resolver reads it correctly, but Fluent 2 always writes its untagged entry first, so whether Power BI Desktop treats a trailing untagged entry as the default is unconfirmed. **Requires a Power BI Desktop test.** Deliberately not guessed at.

### 9.6 Note on the schema as an oracle

Validation was performed with ajv against Microsoft's published report-theme schema. Two caveats emerged that anyone repeating this should know:

- The schema **fails its own meta-validation** (duplicate `enum` items in `actionStates-advancedSlicerVisual`), so it must be compiled with `validateSchema: false`.
- **Microsoft's own shipped base themes do not validate against it.** Pristine `themes/base/fluent2.json`, extracted from a Power BI Desktop install, produces **91 errors** — mostly `ThemeDataColor` expressions in `fillColor.solid.color` where the schema permits only hex. (The single error each on `classic2018` / `classic2026` is this repository's own `_note` annotation, not a Microsoft defect.)

Treat the schema as a strong signal, not ground truth: Desktop clearly accepts more than the schema advertises. The sparse-array `null` was still worth fixing because it is a *type* violation, categorically more serious than a permissiveness gap.

### 9.7 Repository hygiene (updates §8)

- **`.claude/`** — `settings.local.json` was found to be covered already by the user's global gitignore. `launch.json` (dev-server config) is committed alongside the handover documentation.
- **Documentation staleness** — resolved. `README.md` and `PROJECT_OVERVIEW.md` have been rewritten to describe 16 visuals, base themes, theme layering, provenance-aware resolution and round-trip preservation. An orientation document was also added for an incoming developer.
