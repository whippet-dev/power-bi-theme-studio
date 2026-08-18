# Action Button — Preview Coverage Pilot

**Date:** 2026-08-18 · **at commit:** `a6433c0` · **READ-ONLY analysis. No code, mapping files, tests or renderer changes were produced.**

Third stress-test of `PREVIEW_TARGET_DESIGN.md` (rev2.1), chosen to exercise the **stateful** family. Companion to the cartesian (bar chart) and structural (Table) pilots.

Traced from `VisualPreviews.tsx` `shapeTile()` (308–385), `actionButtonContent` (2688–2712), `shapeShadowOffset()` (388–405), `actionButtonGlyph()` (289–306), `shapeGeometry.ts`, and `resolveShapeFamilyCore()` in `shapeFamilyProperties.ts`. State identity is read via `$id` per the resolver architecture established in `fe481de` — **no reasoning from array positions**.

---

## 1. Headline numbers

| Measure | Count | Denominator | % |
|---|---:|---|---:|
| Properties in registry | **68** | — | — |
| — represented (≥1 target) | **67** | 68 | 98.5% |
| — declared non-previewable | **0** | 68 | 0% |
| — **gap** | **1** | 68 | 1.5% |
| — unclassified | **0** | 68 | 0% |
| Represented / *previewable* | 67 | 68 | **98.5%** |
| **Gap / *previewable*** | 1 | 68 | **1.5%** |
| Property→target relationships | **68** | — | — |
| — exact | 61 | 68 | 89.7% |
| — approximate | 7 | 68 | 10.3% |
| — indicative | 0 | 68 | 0% |
| **Misleading relationships** | **4** | 68 | 5.9% |
| Targets carrying `modelFidelity` | **0** | 7 | 0% |
| Misleading targets | **0** | 7 | 0% |

**This is by far the best-covered visual of the three** — 98.5% represented against 58% (bar chart) and 57% (Table). It is also the only one where *every* fidelity problem is at the relationship level and no element is itself a poor model.

### Per-group breakdown

| Group | Props | Stateful | Repr. | Gap | Rel. | Exact | Approx | Misleading |
|---|---:|:---:|---:|---:|---:|---:|---:|---:|
| fill | 3 | ✔ | 3 | 0 | 3 | 3 | 0 | 0 |
| outline | 4 | ✔ | 4 | 0 | 4 | 3 | 1 | 0 |
| shadow | 7 | ✔ | 7 | 0 | 7 | 6 | 1 | 0 |
| glow | 4 | ✔ | 4 | 0 | 4 | 0 | 4 | **4** |
| text | 14 | ✔ | 14 | 0 | 14 | 14 | 0 | 0 |
| icon | 13 | ✔ | 13 | 0 | 14 | 13 | 1 | 0 |
| rotation | 3 | ✗ | 3 | 0 | 3 | 3 | 0 | 0 |
| shape | 20 | ✗ | 19 | 1 | 19 | 19 | 0 | 0 |
| **Total** | **68** | — | **67** | **1** | **68** | **61** | **7** | **4** |

---

## 2. Targets

Seven targets, six of them `stateful: true`. None needs a `layoutSlot`.

| Target | Element | Stateful | `modelFidelity` |
|---|---|:---:|---|
| `button.fill` | `.shape-tile` background | ✔ | — |
| `button.outline` | border, or inset ring for clipped shapes | ✔ | — |
| `button.shadow` | `boxShadow` / `drop-shadow` filter | ✔ | — |
| `button.glow` | `boxShadow` (second entry) | ✔ | — |
| `button.text` | `.shape-tile__text` | ✔ | — |
| `button.icon` | `.shape-tile__icon` | ✔ | — |
| `button.shape` | `clip-path` / `border-radius` geometry | ✗ | — |

---

## 3. Interaction states — the core of this pilot

### 3.1 How states actually flow

Three independent mechanisms, correctly separated:

1. **Registry** declares which groups are stateful: `STATEFUL_GROUPS.actionButton = ["fill", "glow", "outline", "shadow", "text", "icon"]`. `rotation` and `shape` are not.
2. **Resolution** (`resolveShapeFamilyCore`) applies `forStateId(definition, state)` **only** to stateful groups; for others `at()` is a no-op. `forStateId` matches by `$id` *within each layer independently* — the `fe481de` architecture.
3. **Rendering** calls `shapeTile()` once with a style object already resolved at one state. The hero re-resolves on `previewInteractionState`; thumbnails always render `default`.

The mapping layer needs to know only (2)'s *vocabulary*, never its mechanism. A binding says `states: ["default","hover","selected","disabled"]`; it never mentions `$id`, index, or layer.

### 3.2 What the real base theme declares — evidence for the hard case

Fluent 2's `visualStyles.actionButton["*"]`, read by `$id`:

| Group | `$id`s present | Keys per state |
|---|---|---|
| `fill` | *(untagged)*, default, hover, selected, disabled | untagged: `show`; each state: `fillColor`, `transparency` |
| `outline` | *(untagged)*, default, hover, selected | untagged: `show`; each state: `lineColor`, `weight` — **no `disabled`** |
| `text` | default, selected, disabled | default: 8 keys; selected: 3; disabled: only `fontColor` — **no `hover`** |
| `icon` | default, disabled | default: 5 keys; disabled: only `lineColor` — **no `hover`, no `selected`** |
| `shape` | default | `roundEdge` |
| `glow`, `shadow` | *(absent entirely)* | — |

This is the ragged, real-world shape the design has to survive: **four states, six stateful groups, and only `fill` declares all four.** Entry counts differ per group (5, 4, 3, 2), orderings differ, and one group is tagged in the theme but not treated as stateful by the registry.

### 3.3 Properties present in the registry but missing from a rendered state

This is the case the brief asked about specifically. Take `actionButton.outline.lineColor` in the **disabled** state:

1. `forStateId` looks for `$id === "disabled"` in the custom layer → absent.
2. Falls back to that layer's **untagged** entry — which carries only `show`, so `lineColor` is undefined there.
3. Moves to the base layer and repeats. Fluent 2 also has no `disabled` outline entry.
4. Resolves to the coded fallback.

**The mapping model expresses this correctly and needs no new concept.** The binding is:

```ts
{
  property: "actionButton.outline.lineColor",
  affects: [{ target: "button.outline", representation: "exact" }],
  states: ["default", "hover", "selected", "disabled"],
}
```

`states` declares *which states this property can drive* — a statement about the registry and the renderer, both of which support all four. Whether a *particular theme* populates a state is a resolution outcome, not a mapping fact. Encoding "Fluent 2 omits disabled outline" in the mapping would be a category error: the mapping describes the tool's capability, not one theme's content.

**The consequence for testing** is real and worth stating: a tier-4 behavioural test for `outline.lineColor` in `disabled` must construct a theme that *sets* that state. Testing against Fluent 2 alone would show no change and produce a false failure.

### 3.4 One property across multiple states

Naturally expressed. A single binding with `states: ALL_STATES` covers all four; there is no per-state duplication, because the property id is state-agnostic by construction. Rendered instances disambiguate via `data-preview-state`:

```html
<span data-preview-target="button.fill" data-preview-state="hover">
```

### 3.5 State-specific rendering

The renderer renders **exactly one state at a time**. That is a UI decision (the hero's `StateSelector`), not a limitation of the model, but it dictates test shape: tier 3 and tier 4 must iterate the four states explicitly rather than asserting over one render. Thumbnails render only `default`, so state-aware assertions must target the hero.

### 3.6 A resolver observation outside this pilot's scope

Fluent 2 tags `actionButton.shape` with `$id: "default"`, but `shape` is **not** in `STATEFUL_GROUPS`. Resolution therefore reads `["shape", 0, "roundEdge"]` positionally, and index 0 happens to be the `default` entry — correct by coincidence. A theme writing `[{$id:"hover",…},{$id:"default",…}]` would resolve `hover`'s value for every state.

This is a **resolution** concern, not a mapping one, and it is the exact class of positional-read defect `fe481de` eliminated for the six declared stateful groups. Recorded here because the pilot surfaced it; no change made.

---

## 4. Per-group trace

### 4.1 `fill` (3) — exact across all four states

`show` gates the fill; `fillColor` and `transparency` compose through `hexWithAlpha`. Note that Fluent 2 puts `show` on the **untagged** entry, which `forStateId` correctly treats as standing in for any state.

### 4.2 `outline` (4) — one cosmetic approximation

`show`, `lineColor`, `transparency` exact. **`weight` is approximate / cosmetic:** for clipped shapes the outline is drawn as `boxShadow: inset 0 0 0 Npx`, because `clip-path` cuts off a real CSS border. The ring renders at the right thickness but, unlike a border, does not change the element's box size.

### 4.3 `shadow` (7) — one cosmetic approximation

All seven are read, including `shadowPositionPreset` and `angle` through `shapeShadowOffset()`, which uses the named preset when present and falls back to trigonometry on `angle`. That is a genuinely faithful model.

**`shadowBlur` is approximate / cosmetic:** for clipped shapes the shadow becomes `filter: drop-shadow(offset color)` — with **no blur radius passed** — so blur silently does nothing on most shapes.

### 4.4 `glow` (4) — all four misleading

```tsx
...(shadows && !clipped ? { boxShadow: shadows } : {}),
...(shadows && clipped ? { filter: `drop-shadow(${shadowOffset} ${shadowColor})` } : {}),
```

`shadows` is the joined shadow-plus-glow string. When the shape is clipped, that string is **discarded** and only the *shadow* is re-expressed as a filter. **The glow is dropped entirely for every clip-path shape** — which is most of the 22 `tileShape` values; only rectangle, rounded-rectangle and oval use `border-radius` and keep it.

All four glow properties are therefore `approximate` with severity **misleading**: a user enabling a glow on a hexagon sees nothing, concludes glow does not work, and may remove it from a theme where Power BI would have rendered it. A false negative that changes what they ship is the "could someone ship a wrong theme?" test failing.

This is a *relationship* defect, not a target one, by the §3.5 rule: with `tileShape` set to a rectangle the glow renders correctly, so the defect does not survive with every property set correctly.

### 4.5 `text` (14) — all exact

Every property is read: `show`, `text`, all six typography fields, both alignments, all four margins. `horizontalAlignment` routes through `mapTextAlign()` with a `?? "center"` default; `verticalAlignment` maps to `justifyContent`. `rotation.textAngle` rotates the text independently of the shape, matching Power BI.

### 4.6 `icon` (13) — one cosmetic approximation, and a two-target case

Twelve exact. `shapeType` resolves through `actionButtonGlyph()`, whose map covers **all 13** registry options — verified against `ICON_SHAPE_OPTIONS`, with no unmapped value falling through to the empty-string default.

**`lineWeight` is approximate / cosmetic:** Power BI's continuous icon stroke weight is collapsed to a two-step `fontWeight: lineWeight >= 3 ? 700 : 400`, because the glyphs are text rather than line art.

**`placement` affects two targets** — it sets `flexDirection` on the tile, which moves the icon *and* reflows the text:

```ts
{
  property: "actionButton.icon.placement",
  affects: [
    { target: "button.icon", representation: "exact" },
    { target: "button.text", representation: "exact" },
  ],
  states: ALL_STATES,
}
```

### 4.7 `rotation` (3) — all exact, and correctly not stateful

`angle` and `shapeAngle` compose into the tile's `transform`; `textAngle` rotates the text separately.

### 4.8 `shape` (20) — 19 exact, 1 gap, all conditional

`shapeGeometry()` reads 18 of the 19 shape parameters plus `tileShape`. **Gap (1): `tabCutCornerSnipSizeBottom`** — its siblings `…SnipSizeTop` and `…SnipSizeTopRight` are both read, and `tabRoundCornerBottom` is read, so this is an omission rather than a decision.

**Every shape parameter is conditional on `tileShape`.** `arrowStemWidth` does nothing unless `tileShape` is an arrow variant; `hexagonSlant` does nothing unless it is a hexagon. The relationships are exact *when their precondition holds*. This has a direct consequence for testing — see §5.1.

---

## 5. New concepts the pilot requires

### 5.1 Relationship preconditions — **the one genuinely new requirement**

A tier-4 behavioural test renders twice with themes differing only in one property and asserts the target changes. For 18 of the 20 shape parameters that assertion **fails against a default theme** — not because the binding is wrong, but because `tileShape` is not set to the shape that parameter belongs to.

The same shape appears elsewhere once you look: `labels.*` needs `labels.show`, `error.*` needs `error.enabled`, `zoom.*` needs `zoom.show`. The bar-chart pilot did not surface it because I was not reasoning about test construction; the shape parameters make it unavoidable, since 18 of them are mutually exclusive.

```ts
type TargetRelationship<V> = {
  target: PreviewTargetId<V>;
  representation: Representation;
  severity?: Severity;
  note?: string;
  /**
   * Property values that must hold for this relationship to be observable.
   * Not a fidelity statement — a precondition for testing and for the
   * editor to explain "this does nothing until you also set X".
   */
  requires?: ReadonlyArray<{ property: PropertyId<V>; equals: JsonValue | ReadonlyArray<JsonValue> }>;
};
```

```ts
{
  property: "actionButton.shape.arrowStemWidth",
  affects: [{
    target: "button.shape",
    representation: "exact",
    requires: [{ property: "actionButton.shape.tileShape",
                 equals: ["leftArrow", "rightArrow", "upArrow", "downArrow"] }],
  }],
}
```

Two benefits beyond testing. It lets the coverage report distinguish "this does nothing" from "this does nothing *yet*", and it gives the property editor a basis for greying out or annotating a control that cannot currently take effect — an affordance the panel has no way to express today.

**Recommendation: adopt.** It is optional, additive, and without it tier 4 produces false failures on at least 18 bar-chart-equivalent and 18 button properties.

### 5.2 What was *not* required

No new classification outcome, no new severity, no new non-previewable reason, no new target concept. `stateful` targets and `states` on bindings handled every interaction-state case, including the ragged real-theme coverage in §3.2, with no per-state duplication.

### 5.3 Relationship-level `indicative` is zero again

**Third consecutive pilot with zero.** Bar chart 0 (after rev2.1), Table 0, Action Button 0 — while five targets across the three need it. The evidence now strongly supports the §5.3 hypothesis from the Table pilot: **`Representation` should be narrowed to `exact | approximate`, and `indicative` should exist only on `modelFidelity`.**

*"Presence is shown, magnitude is not modelled"* is a statement about an element, never about one property's effect on it. Keeping `indicative` at relationship level offers a tempting wrong answer to authors who have not internalised the §3.5 rule.

---

## 6. Suggested first renderer fixes

1. **Glow on clipped shapes** (4 misleading relationships) — the only misleading defect. Compose glow into the `drop-shadow` filter chain alongside the shadow.
2. **`shadowBlur` in the clipped path** — `drop-shadow` accepts a blur radius; it is simply not passed.
3. **`tabCutCornerSnipSizeBottom`** — the single gap; its three siblings are already handled.
4. `outline.weight` box-size and `icon.lineWeight` granularity — cosmetic, low value.

Items 1–3 would take this visual to **100% represented with zero misleading relationships**.

---

## 7. Scope statement

Analysis only. No mapping files, renderer changes, tests or UI changes were produced. Totals cross-check: 67 represented + 0 non-previewable + 1 gap = 68 properties; 68 relationships from 67 represented properties, the extra coming from `icon.placement` affecting two targets.
