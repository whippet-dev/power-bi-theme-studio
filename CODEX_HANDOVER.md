# Handover — Power BI Theme Studio

**Written:** 2026-08-18 · **at commit:** `fe481de` · **state:** build clean, lint clean, 206 tests passing.

For a developer taking this repository over. It assumes no prior context. Read
this first, then `PROJECT_OVERVIEW.md` for detail, then `ARCHITECTURE_REVIEW.md`
if you want the independent critique (§1–§8 are the original findings; §9 tracks
what has since been fixed).

---

## 1. What this product is

A **local, browser-only editor for Power BI JSON theme files**. No backend, no
database, no sign-in, no telemetry. You import a `.json` theme, edit real
formatting properties, and export the file.

The value proposition is not "a colour picker for Power BI". It is that a real
theme file has thousands of properties across dozens of visual types, Power BI
Desktop gives you no way to author them except by hand, and hand-editing a
5,000-line JSON file is miserable and error-prone. This tool exposes those
properties with their real schema paths, shows you roughly what they do, and —
critically — **gives your file back to you intact**.

### The UX model

Three columns:

- **Left rail** — which of the 16 visuals sit on the canvas, and which one
  previews large ("hero"). Visuals are toggled, not created; there is no report
  layout concept.
- **Centre canvas** — the previews. One hero at full size, the rest as
  thumbnails. Plus filter-pane and colour-reference previews for theme-level
  settings that no individual visual expresses.
- **Right panel** — master-detail property editing. Pick a group that mirrors
  Power BI's format pane ("Y axis", "Data labels"), then edit its properties in
  a detail view, clustered under sub-headings when a group is large.

Two things worth understanding about the UX intent:

- **Property rows are deliberately compact**, with descriptions behind an info
  toggle rather than always visible. A group can have 80 properties; permanent
  description text makes it unusable. Keep this for any new controls.
- **The previews are honest approximations, not emulation.** Their job is to
  make a change visible so you can judge it. Do not invest in pixel fidelity at
  the expense of theme-model correctness — that trade has already been made
  deliberately.

---

## 2. Architecture in one pass

```
Imported JSON ──► parseThemeJson ──► raw PowerBITheme (source of truth, verbatim)
                                          │
themes/base/*.json ──┐                    │
                     ├──► themeLayers(custom, base) ──► ThemeSource
                     │         { custom, base, roots }
                     │                    │
                     │                    ▼
                     │        resolvePropertyEntry ──► { value, source, isSet }
                     │                    │
                     │                    ▼
                     │           Resolved*Style per visual ──► previews
                     │
Property editor ──► updateThemeValue / deleteThemeValue ──► raw theme ──► export
```

**Key idea:** there are two directions and they are asymmetric.

- **Reads** go through resolution, which understands layers, wildcards,
  provenance and `$id` states.
- **Writes** go straight to a literal JSON path in the user's own theme. They do
  not go through resolution and must not.

This asymmetry is intentional and is what makes round-tripping exact.

### The files that matter

| File | Why you care |
| --- | --- |
| `app/lib/properties.ts` | The resolution engine. Everything below depends on it being right. |
| `app/lib/theme.ts` | Parsing, immutable path writes, `mergeThemeOverBase`. |
| `app/lib/baseThemes.ts` | The three bundled base themes. |
| `app/lib/*Properties.ts` | Declarative registries — metadata, not code paths. |
| `app/components/ThemeStudio.tsx` | All the wiring. Adding a visual means editing this. |
| `app/components/VisualPreviews.tsx` | The 16 previews. Large. |
| `app/components/PropertyEditor.tsx` | Generic over registry metadata. |

### Registries are metadata

```ts
labelColor: colorProp("clusteredBarChart", ["categoryAxis", 0, "labelColor"], { … })
```

`PropertyEditor` renders whatever the registry declares. Adding properties does
not mean adding UI code. ~2,538 definitions exist across 16 visuals plus shared
chrome, report/page options and theme globals, all pinned to Microsoft's
published `reportThemeSchema-2.156.json`.

---

## 3. The recent resolver work, and why it was needed

Between commits `201a1a4` and `fe481de` the resolution engine was substantially
corrected. This was not refactoring for its own sake — the preview was showing
colours and states **that no theme actually specified**, silently.

Seven defects, each proved by a test that failed before the fix:

1. **The wildcard bucket was ignored for most properties.** Resolution read only
   `visualStyles[visual]["*"]`, never `visualStyles["*"]["*"]`. Shared styling
   every chart inherits — including Fluent 2's own axis styling — was dropped.

2. **Colour values were resolved literally.** Only
   `{ solid: { color: "#RRGGBB" } }` was understood. Theme tokens
   (`"foregroundNeutralSecondary"`) and `ThemeDataColor` expressions fell through
   to hardcoded defaults, rendering a *plausible but wrong* colour with no sign
   anything had failed — `#242424` where Fluent 2 asks for `#616161`.

3. **The base theme could outrank the user's theme.** Power BI considers every
   custom-theme match before any base-theme match, so a custom wildcard beats a
   base visual-specific value. The old code had this inverted.

4. **`$id` state entries were matched by array position.** An index computed from
   the merged view was applied to both layers. Nothing requires two themes to
   declare the same states, in the same order, or at all — so this read one
   state's properties as another's.

5. **`resolveChromeEntry` silently dropped `stateId`,** making filter-card
   *Applied* read *Available*'s value. Found while fixing (4).

6. **Resolution collapsed "unset" and "set to the default value."** A bare value
   cannot distinguish an explicit `false`/`0`/`""` from a property nobody set.
   This had forced the renderer to read raw theme JSON directly, and had caused
   features to render as if enabled when nothing enabled them.

7. **The write path emitted sparse arrays.** Writing a non-default state first
   left a hole serialising as `"fill": [null, {"$id": "selected", …}]` —
   schema-invalid, since array items must be objects.

**Why it matters to you:** these were all invisible from reading the source. The
code looked reasonable. They were found by resolving real properties against
real base themes and comparing to what Power BI actually specifies. If you
change resolution, do the same — synthetic fixtures will not catch this class of
bug.

---

## 4. Invariants — do not break these

These are load-bearing. Each has already been violated once and caused a real
defect.

**1. The user's theme is stored verbatim and never normalised.**
No internal model that re-serialises on export. No "clean up on import". No
reordering of keys. If someone imports a file with vendor-specific root keys,
unknown visual types and style-preset buckets this app cannot read, all of it
must come back out unchanged. This is the product's core promise.

**2. The base theme never enters the export.**
It is a resolution input only. `mergeThemeOverBase`'s output is a projection,
never a document. Test: `layerPrecedence.test.ts` asserts the merge does not
mutate the custom theme.

**3. `visualStyles` precedence is resolved from layers, never from a merge.**
Merging discards which layer a value came from, and cross-layer precedence is
*defined* by that distinction. `layerPrecedence.test.ts` deliberately pins that
resolving a merged theme gets the case **wrong**, so nobody reinstates that path
believing it equivalent.

**4. Reads match states by `$id` per layer; writes use array indices.**
`forStateId` for reading, `forState` + `stateEntryIndex` for writing. Do not use
a read-side index across layers, and do not route writes through resolution. The
doc comments on both spell this out — read them before touching either.

**5. Custom-layer scope for "did the user configure this?"**
`isGroupSetBy(…, "custom")` — not `"any"`. A base theme ships styling for
features like small multiples so they look right *if used*; that is not a signal
anything enabled them.

**6. Renderers do not read raw theme JSON.**
Everything arrives pre-resolved via `Resolved*Style` props. The one place that
violated this (`hasSmallMultiplesOverride`) has been deleted. If you find
yourself needing raw JSON in a component, you need provenance instead.

**7. Tests are discovered by glob.**
Do not go back to listing files in `package.json`. One test file previously went
un-run for its entire existence.

---

## 5. Unresolved questions

Neither is a bug. Both need external evidence this codebase cannot produce.

**`ThemeDataColor` `ColorId` indexing.** Implemented as a 0-based index into
`dataColors` — the literal reading of the field name. But Microsoft's Fluent 2
documentation says buttons use "your first theme data color", while Fluent 2's
own JSON gives every button `ColorId: 2`. That reconciles only if `ColorId` is
offset (e.g. 0 and 1 being background/foreground). Pie/donut borders and slicer
label/fill pairings also favour the offset reading. Both are defensible.
**Settle it by rendering a Fluent 2 action button in Power BI Desktop and
comparing.** Isolated in `resolveColorValue`, so it is a one-line change.

**Untagged default entries appearing after tagged ones.** If a user sets `hover`
before `default`, the untagged default entry lands last in the array. This is
schema-valid and this app's resolver reads it correctly, but Fluent 2 always
writes its untagged entry *first*, so whether Power BI Desktop treats a trailing
untagged entry as the default is unconfirmed. **The repository owner is
performing this Desktop test.** If it turns out to matter, the fix is to write an
explicit `$id: "default"` when creating a default entry into an array that
already holds tagged ones. Deliberately not guessed at.

### A caveat on the schema

Validation used ajv against Microsoft's published report-theme schema. Two things
to know before you rely on it:

- The schema **fails its own meta-validation** (duplicate `enum` items in
  `actionStates-advancedSlicerVisual`) and must be compiled with
  `validateSchema: false`.
- **Microsoft's own base themes do not validate against it.** Pristine
  `fluent2.json`, taken from a Desktop install, produces 91 errors — mostly
  `ThemeDataColor` expressions where the schema permits only hex.

Treat the schema as a strong signal, not ground truth. Desktop accepts more than
it advertises.

---

## 6. Known architectural weaknesses

Ordered by how much they will cost you.

**No declarative property → rendered-element mapping.** *This is the central
gap.* Nothing asserts that a property with an obvious visual effect is actually
bound to something in a preview. "Wired up" is currently demonstrated by a value
being read somewhere in the JSX — not by the correct element visibly changing. A
declarative map plus a coverage test would convert this from a matter of
diligence into a matter of test coverage. See `ARCHITECTURE_REVIEW.md` §3.4/§5D.

**Per-visual duplication and observable drift.** The four cartesian registries
total ~4,200 lines and are ~72% identical after normalising the visual key.
Drift has already happened — `labelContainerMaxWidth` and
`preferredCategoryWidth` still have different defaults between sibling charts,
with nothing enforcing agreement. Adding one visual touches five files:
`ThemeStudio.tsx` (17 resolver + 16 chrome calls), `VisualGallery` (16 style
props), `PropertyEditor.tsx` (73 `ID_PREFIX` dispatch branches), the registry,
and the test.

**Two parallel view models.** Resolvers take
`(source: ThemeSource, base: ResolvedTheme)`. `ResolvedTheme` exists mainly to
supply fallbacks to the per-visual styles, and keeps attracting visual-specific
fields (`categoryLabelColor` is a *Card* concern living in a global type). The
boundary is not principled. Note the *resolution paths* have been unified —
`resolveChromeValue` now delegates to `resolvePropertyEntry` — so this is the
view-model half only.

**Style presets are entirely unimplemented.** A theme's named preset buckets
(`visualStyles[type][preset]`) round-trip untouched but are never read, and Power
BI's precedence chain has a preset step this app skips. Implementing this means
a read path *and* a preset picker.

**`forState` assumes a fixed path shape.** `path[1] = index` assumes
`["group", index, "prop"]`. True for every current registry, silently wrong for
anything deeper. `resolvePropertyEntry` makes the same assumption. Worth an
assertion at minimum.

---

## 7. Renderer-quality concerns

Honest assessment. Some renderers are genuinely good; some are thin.

| Renderer | State |
| --- | --- |
| Shape family | **Good** — 22 real `clip-path` geometries, parameter-driven, well tested |
| Line chart | **Good** — real Catmull-Rom / step interpolation, real area paths |
| Bar / column | **Sound** — axis inset logic correct, gridline alignment verified |
| Table / Matrix | **Reasonable** grid model |
| Stacked charts | **Weak** — `stackedSegmentShare = 62` is a fixed split, not genuinely stacked |
| Pie | **Weak** — `conic-gradient`, no real slice geometry; donut not modelled |
| Card | **Legacy only** — the modern `cardVisual` is unmodelled |

**12 visuals present in the real base themes have no preview at all** — most
notably `cardVisual` (the modern Card, superseding the legacy one that *is*
modelled), `donutChart`, `areaChart`, `scatterChart`, `kpi`, `multiRowCard`,
`gauge`, `treemap`, `funnel` and the `hundredPercentStacked*` family. Their theme
buckets round-trip correctly; they simply cannot be previewed.

Two traps waiting for you:

- **Hardcoded sample data is scattered through the JSX** — `dataMax={82_000}`,
  `linePointValues`, `pieSliceValues` — rather than declared per visual.
  Axis-versus-data consistency is maintained by comment and vigilance. There is a
  load-bearing comment in `VisualPreviews.tsx` explaining why the bar max must
  equal the axis max.
- **The SVG/CSS boundary is ad hoc.** The line chart uses
  `viewBox="0 0 100 100"` with `preserveAspectRatio="none"` inside a non-square
  container (~555×180), so **any geometry drawn in that viewBox distorts**. This
  already caused a stretched-marker bug and forced markers out into
  absolutely-positioned HTML. The constraint is load-bearing and undeclared.

---

## 8. Remaining priorities

From `ARCHITECTURE_REVIEW.md` §6, with P0 and the provenance half of P1 now
complete.

**Next up (rest of P1):**
1. Declarative preview-target map + a coverage test asserting every property is
   either bound to a preview element or explicitly listed as non-previewable.
2. Style-preset selection — read path plus a preset picker.

**Then (P2 — breadth and fidelity):**
3. `cardVisual`, `donutChart`, `areaChart`, `kpi`, `multiRowCard`.
4. A real stacked-series model; per-visual sample-data declarations.
5. Collapse the cartesian registries onto a shared factory; fix the default
   drift.

**Then (P3 — ergonomics):**
6. Data-driven visual registration (one entry, not five files).
7. Applied/Available filter-card editing in the property panel.
8. `switchAxisPosition` — needs the axis layout restructure first.

My recommendation: **do (1) before (3)**. Adding visuals without the mapping
layer adds more surface area to the exact problem the mapping layer exists to
solve.

---

## 9. Do not rewrite these

| Keep | Why |
| --- | --- |
| **The `PropertyDefinition` metadata model** | Correct, generic, and the reason `PropertyEditor` scales to thousands of properties without UI code |
| **Path-addressed writes + verbatim theme state** | The guarantor of round-trip fidelity. Do **not** introduce a normalised internal model that re-serialises on export |
| **Layered resolution + provenance** | Newly built, heavily tested, and correcting genuine defects. Do not collapse it back to a merge |
| **`themes/base/*.json` and their provenance notes** | Hard-won — extracted from a real Desktop install, not reconstructed. Reference data |
| **`shapeGeometry.ts`, `lineGeometry.ts`** | Pure, well tested, genuinely good |
| **`mergeThemeOverBase`** | Correct for root-level reads. Keep it *out* of `visualStyles` precedence |
| **`shapeFamilyProperties.ts` composition pattern** | The model to copy when consolidating registries, not to replace |
| **Test-per-registry convention** | Working well; extend rather than restructure |

---

## 10. Practicalities

```bash
npm install
npm run dev
```

Dev server at `http://localhost:5173`. `.claude/launch.json` configures this for
Claude Code's browser preview; ignore it if you use different tooling.

```bash
npm test
```

Builds (which type-checks) then runs 206 tests. `npm run lint` for ESLint.

Node.js 22.13+. Windows-first, but nothing is platform-specific. Deploys as a
static `dist/` to Cloudflare Pages.

**Theme files:** `themes/local/` is gitignored — real or private themes go there.
`themes/examples/` is for sanitized, shareable ones. `themes/base/` is reference
data; treat as read-only.

**Git history is a useful record.** Commit messages on this project explain *why*
a change was needed and what evidence supported it, not just what changed.
`fe481de` in particular documents the resolver reasoning in full.
