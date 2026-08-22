# Preview Composition — Design

**Date:** 2026-08-22 · **Status:** design only, **no code written** · **For:** independent review

Companion to, and deliberately smaller than, `PREVIEW_TARGET_DESIGN.md`. That document answers *which properties affect which element, and how faithfully*. `RENDERER_AUDIT.md` §3.1 answers *where an element goes*. This one answers a third question neither of them asks:

> **How many rendered things is one visual's preview allowed to be?**

Today the answer is baked in at one: `VisualGallery` builds a single `content` node per visual, `PreviewShell` wraps it, and everything a visual needs to show must fit inside that one node. The product decision recorded in the brief is that the answer is *one primary, plus a small number of justified extras*. This document gives that a vocabulary before the renderer work starts, because the assumption is cheap to remove now and expensive to remove after `ChartLayout` and the mapping layer are built on top of it.

**Scope.** It defines a conceptual model, its integration point with the mapping design, one new DOM coordinate, a rule for when targets are shared and when they are not, an incremental component path, a classification of the 16 visuals, and guardrails. It does not implement anything, does not redesign the studio's UX, does not re-audit the renderer or the property registries, and does not touch theme resolution, import/export, or the registry architecture.

---

## 0. The decision in one paragraph

A visual's preview is a **composition**: exactly one **primary surface** — a full, honest instance of the visual sitting on the simulated report page — plus zero or more **supporting surfaces** that live *outside* the page and each carry a declared reason for existing. Supporting surfaces come in three kinds: **variants** (the same visual under a mutually exclusive state the primary cannot also be in), **examples** (deliberate fragments — a magnified line style, an enumerated placement set), and **transient examples** (static depictions of things that only exist mid-interaction, such as tooltips). The preview-target mapping layer needs **one** addition to accommodate this — a surface coordinate alongside the existing state coordinate — and **no change at all** to `PreviewBinding`. The report-page metaphor survives because supporting surfaces are structurally forbidden from appearing on the page.

---

## 1. The conceptual model

### 1.1 Composition, surface, instance

Three words, used precisely throughout:

| Term | Definition |
|---|---|
| **Composition** | Everything Theme Studio draws to answer "what does my theme do to this visual?" One per visual. |
| **Surface** | One independently laid-out rendered region within a composition. Has a kind, a reason, and a set of targets it may emit. |
| **Instance** | One rendered occurrence of one target, on one surface, in one state. What a `data-preview-*` stamp identifies. |

A composition has exactly one surface of kind `primary` and any number of supporting surfaces. The primary is the load-bearing one: it is what appears on the report page, it is what the thumbnail renders, and it is the population every coverage figure is quoted against (§2.5).

### 1.2 The four kinds, and a decidable rule for choosing

The brief proposes *main visual / variant / supporting example / transient-state example*. That set is right. What it needs to be usable is a rule that decides between them without argument, in the way §3.5 of the target design gave `modelFidelity` a deciding rule.

Two questions, asked in order:

> **Q1. Is this a complete, honest instance of the visual — something a real report page could contain?**
> **Q2. Does it exist on a page at rest, or only while a user is interacting with it?**

| | Complete instance | Deliberate fragment |
|---|---|---|
| **At rest** | `primary` (the one on the page) · `variant` (the others) | `example` |
| **Interaction only** | `transient` | `transient` |

```ts
type SurfaceKind =
  /** The instance that sits on the simulated report page. Exactly one. */
  | "primary"
  /**
   * A complete second instance of the same visual, differing from the
   * primary only in a state assignment the primary cannot simultaneously
   * hold. An Action Button in `hover`. A Slicer in `dropdown` mode.
   */
  | "variant"
  /**
   * A deliberate fragment. Makes no claim to be a whole visual, and must
   * not be read as one. A magnified dash-pattern strip; a set of marker
   * shapes; four label placements side by side.
   */
  | "example"
  /**
   * A static depiction of something Power BI only draws mid-interaction.
   * Theme Studio shows what it looks like; it does not reproduce the
   * interaction that triggers it.
   */
  | "transient";
```

Every surface except the primary carries a **reason**, drawn from a closed list — the same device that keeps `NonPreviewableReason` honest, and for the same purpose: it forces a judgement at declaration time and makes the set reviewable in a diff.

```ts
type SurfaceReason =
  /** States/modes that cannot both be true of one rendered instance. */
  | "mutually-exclusive"
  /** Exists only while the user is hovering, selecting, or drilling. */
  | "interaction-only"
  /** An enum the primary can only show one member of at a time. */
  | "enumerated-options"
  /** Real, but too small at page scale for a human to judge. */
  | "detail-magnification";
```

Four reasons, and the discipline is that a proposed surface which fits none of them does not get built. In particular there is no reason meaning "the primary is missing this" — that is a `gap` and belongs in the renderer backlog, not on a new surface (guardrail G4).

### 1.3 Two things that are *not* surfaces

Both are easy to swallow into this model by accident, and both belong elsewhere.

**A thumbnail is not a surface.** It is the primary surface rendered with a different `outer` rect. Size belongs to `ChartLayout` (§7); the composition model must not acquire an opinion about it, or the two designs will start negotiating.

**A preview-only view toggle is not necessarily a surface.** The slicer's list/dropdown switch and its open/closed dropdown (`VisualPreviews.tsx:906–910`) swap what the *primary* renders. That is legitimate and should stay available, but a toggle answers "what does mode X look like?" one mode at a time and can never answer "do my four states read as a coherent set?". The rule:

> Prefer side-by-side variant surfaces when the alternatives are few (2–4) and the interesting question is whether they cohere. Prefer a toggle on the primary when the alternatives are many, or when only one can plausibly be on a page at once.

Action button states: four, and coherence is exactly the question — **variants**. Slicer modes: four-plus, and a page holds one — **toggle**.

### 1.4 Where surfaces live on screen

This is the structural half of the guardrails in §8, stated once here because the rest of the model depends on it.

```
.report-surface            the simulated Power BI report
  .report-page             ← ONLY primary surfaces live here
    hero primary
    thumbnail primaries
  .filter-pane             ← genuine report chrome: inside the report,
                             outside the page
.preview-inspector         ← NEW region, sibling of .report-surface —
  variant surfaces           Theme Studio only, not part of the
  example surfaces           simulated report at all
  transient surfaces
```

Three distinct ownerships, and the boundaries matter more than the nesting:

- **`.report-page` holds actual report-page visual content** — the hero primary and the thumbnail primaries. Nothing else.
- **`.filter-pane` is genuine Power BI report chrome.** It belongs inside the simulated `.report-surface`, because a real report has one — but *not* inside `.report-page`, because it is not page content. Its current placement is already correct.
- **`.preview-inspector` is Theme Studio's own explanatory UI**, a sibling of `.report-surface` and no part of the simulated report. Supporting surfaces render here, visually distinct from report chrome — no wallpaper, no page background, explicitly labelled — so that nothing on screen implies "this is what your report looks like" when it is not.

**This is not the current state, and the drift has already begun.** `VisualGallery` renders inside `.report-page` (`ThemeStudio.tsx:353`), and `PreviewShell`'s hero branch appends the tooltip callout and the interaction-state selector as siblings of the scaled tile (`VisualPreviews.tsx:856–872`). Both therefore sit **inside the simulated page today**. Two ad-hoc supporting surfaces already exist; they are simply in the wrong place and have no name. That is the evidence that the need is real, and the reason to name it now rather than after it has happened four more times.

---

## 2. Integration with the preview-target mapping design

The governing principle: **composition composes with the mapping layer; it does not compete with it, and it does not modify it.** Concretely, `PreviewBinding`, `TargetRelationship`, `Representation`, `Severity`, `Gap`, `NonPreviewable` and the seven non-previewable reasons are **unchanged**. Everything below is additive.

### 2.1 The one change: the instance is a triple, not a pair

The mapping design identifies a rendered instance by `(target, state)`:

```html
<span data-preview-target="button.fill" data-preview-state="hover">
```

With more than one surface per visual, that is ambiguous — `button.fill` now renders four times. The instance becomes a triple:

```html
<span data-preview-surface="variant.hover"
      data-preview-target="button.fill"
      data-preview-state="hover">
```

Surface is to *rendering* what state is to *resolution*: an orthogonal coordinate that disambiguates instances of the same target. The symmetry is deliberate and worth preserving, because every mechanism the mapping design already built for `state` — stamping, tier-3 iteration, highlight lookup — extends to `surface` unchanged in shape.

### 2.2 Why bindings do *not* gain a `surfaces` field

`PreviewBinding.states` exists because whether a property is state-varying is a fact about the *property* (`STATEFUL_GROUPS`, `forStateId`). Which surface draws a target is a fact about the *renderer*. Putting `surfaces` on the binding would make 153 bar-chart bindings restate a decision that belongs in one place, and would go stale the moment a surface is added.

So surfaces are declared **once per visual**, and each declares the targets it may emit:

```ts
type SurfaceId<V extends VisualSchemaKey = VisualSchemaKey> =
  string & { readonly __visual: V };

type PreviewSurface<V extends VisualSchemaKey = VisualSchemaKey> = {
  id: SurfaceId<V>;
  kind: SurfaceKind;
  label: string;                       // shown above the surface, and in the report
  /** Required for every kind except "primary". */
  reason?: SurfaceReason;
  /** Targets this surface may emit. See §2.3 for who shares and who owns. */
  emits: ReadonlyArray<PreviewTargetId<V>>;
  /**
   * For kind "variant": the interaction state this instance is resolved
   * at. Reuses the mapping layer's vocabulary; never an $id or an index.
   */
  state?: InteractionState;
  /**
   * Property values that must hold for this surface to appear at all.
   * Same shape as TargetRelationship.requires, and adopted for the same
   * reason: without it, a tier-3 emission test reports false failures on
   * a tooltip surface that is off by default.
   */
  requires?: ReadonlyArray<{ property: PropertyId<V>; equals: JsonValue | ReadonlyArray<JsonValue> }>;
};

type PreviewComposition<V extends VisualSchemaKey = VisualSchemaKey> = {
  primary: PreviewSurface<V>;                    // kind: "primary"
  supporting: ReadonlyArray<PreviewSurface<V>>;
};
```

and `PreviewMap<V>` gains exactly one field:

```ts
type PreviewMap<V extends VisualSchemaKey> = {
  visual: V;
  composition: PreviewComposition<V>;   // ← the only addition
  targets: Record<string, PreviewTarget<V>>;
  bindings: ReadonlyArray<PreviewBinding<V>>;
  nonPreviewable: ReadonlyArray<NonPreviewable<V>>;
  gaps: ReadonlyArray<Gap<V>>;
};
```

A visual with a single-surface preview declares a composition of one line and is otherwise untouched. That matters: the Table, Matrix, Card, Textbox and Image (§5) should cost nothing to express under this model.

### 2.3 The sharing rule — variants share targets, examples own them

This is the subtle part, and getting it wrong would quietly corrupt the coverage report.

Consider `plot.referenceLine`. On the primary it is pinned at `left: 65%` against a box that is not even the gridlines' box, and carries `modelFidelity: approximate / misleading` (bar pilot §3.5). On a magnified dash-pattern strip, the same *style* properties would render perfectly — because a strip makes no claim about position at all. If both instances carried the target `plot.referenceLine`, the strip's exactness would sit in the same bucket as the plot's lie.

> **Rule.** A surface reuses the primary's target when it makes the **same claims** about the element. When it makes **different** claims, it declares a **different target**.

Which cleaves neatly by kind:

| Kind | Targets | Why |
|---|---|---|
| `primary` | owns the catalogue | — |
| `variant` | **shares** the primary's targets | Same visual, same claims, different state. This is precisely what `stateful: true` and `states: [...]` already express — no new machinery. |
| `example` | **declares its own** | A dash specimen is a different thing a user can point at than a constant line on a plot. |
| `transient` | **declares its own** | A tooltip is not a bar-chart element. (And, being chrome, its targets belong in the shared `chrome.preview.ts` proposed in the target design's open question 2 — one catalogue reused by all 16 visuals, not sixteen copies.) |

The rule pays for itself twice: it keeps `modelFidelity` exactly where the three pilots proved it belongs — on the element — and it makes it structurally impossible for a specimen strip to launder a broken primary's coverage number (G8).

### 2.4 Two new integrity checks, one new build failure

The mapping design's tiers extend without redesign:

- **Tier 2 (compile time), extended.** `SurfaceId` is branded like `PreviewTargetId`, and `emits` is typed, so a surface referencing a non-existent target does not compile.
- **New static check — `unplacedTargets`.** A target that appears in no surface's `emits` is declared but can never render. This is the exact analogue of `unclassified` in §3.4 and should be a **build failure** for the same reason: it is the state of nobody having looked.
- **New static check — target-claim collision.** An `example` or `transient` surface emitting a target the primary also emits violates §2.3. Cheap set intersection; fail the build with the rule's name in the message.
- **Tier 3 (emission), scoped per surface.** Assert `surface.emits ⊆ querySelectorAll('[data-preview-surface="' + id + '"] [data-preview-target]')`. Without the surface scope this tier reports false failures the moment a tooltip target is absent from the plot — the same false-failure class that forced `requires` in the Action Button pilot.
- **Tier 4 (behavioural), unchanged in shape.** It already iterates states; it iterates surfaces the same way. Snapshot becomes `snapshot(render(theme), surface, target, state)`.

### 2.5 Coverage report — two additions, one consumption rule

```ts
type CoverageReport = {
  // …properties, relationships, targetFidelity, unboundTargets as before…

  surfaces: {
    /** Count by kind. `primary` is always 1. */
    byKind: Record<SurfaceKind, number>;
    /** Why each supporting surface exists — reviewable in aggregate. */
    byReason: Record<SurfaceReason, number>;
  };

  /** THE new build failure: declared, but no surface can emit it. */
  unplacedTargets: string[];
};
```

And a **fourth rule** for consumers, alongside §7.1's existing three:

> 4. **Quote coverage against the primary.** Supporting surfaces may raise a visual's *usefulness* without changing what its primary honestly renders. A figure that pools them describes neither. If a supporting surface materially improves a number, that is a signal the primary is under-built.

---

## 3. Do preview *targets* need a semantic distinction?

**No — and adding one would be a mistake.** The distinction the brief describes is real, but it is a property of the **surface**, not of the target.

A target is defined in `PREVIEW_TARGET_DESIGN.md` §3.1 as *"a name for a thing a user can point at"* — a semantic element of a visual. `button.fill` is the button's fill whether it is drawn on the page, in a `hover` variant, or nowhere at all today. Tagging the target `main-visual` or `variant` would make the catalogue describe *where the renderer chose to draw it*, which is exactly the layer-2/layer-3 leak the three-layer table in §2 of that document exists to prevent. It would also break the moment a target renders in two places — which is the entire premise here.

The distinction lands in three places instead, each already introduced above:

1. **`PreviewSurface.kind`** — the semantic distinction itself, on the thing that has it.
2. **`data-preview-surface`** — so a rendered instance is unambiguous (§2.1).
3. **Target identity via the §2.3 sharing rule** — where a supporting surface genuinely makes different claims, it gets a *different target*, which is a stronger and more useful statement than a tag on a shared one. `referenceLine.styleSpecimen` and `plot.referenceLine` can then hold independent `modelFidelity` verdicts, which a tag never could.

The existing `conditional` and `stateful` flags on `PreviewTarget` stay exactly as they are. `stateful` in particular already carries the only target-level fact composition needs: that this element renders once per state.

---

## 4. React architecture, without building a framework

The failure mode to avoid is obvious: a `SurfaceProvider`, a layout negotiator, a specimen DSL, and six weeks before anything renders. The path below is four steps, each independently shippable, each mostly moving code that already exists.

### 4.1 Start from what is already there

Two ad-hoc supporting surfaces exist today and both are informative:

- `PreviewShell` takes an `extraControls?: ReactNode` prop (`VisualPreviews.tsx:115`), used by exactly one caller, to inject the interaction-state selector next to the hero.
- The hero branch renders `tooltipNode` as a sibling of the scaled tile, behind a `showTooltipPreview` toggle, with a source comment explaining that it *cannot* go inside the tile because the tile is fixed-size and `overflow:hidden` would clip it (`VisualPreviews.tsx:844–872`).

That comment is this design's argument, discovered empirically and early: **a fixed-size primary physically cannot host everything, and the workaround is already a second surface — just an unnamed one, in the wrong region, owned by the wrong component.** The work is to generalise those two, not to invent a mechanism.

Also worth noting: `PreviewShell` currently owns `showTooltipPreview` and `showHeaderTooltipPreview` state (`:515–516`), meaning chrome owns supporting-surface visibility. That is the specific coupling to break in step 2.

### 4.2 Four steps

**Step 1 — a descriptor shape, no new components.** `VisualGallery`'s `descriptors` array already carries `{ id, label, defaultTitle, chrome, content }`. Widen `content` to accept either a node (coerced to a one-surface composition) or `{ primary, supporting }`. Fifteen visuals change by zero characters. Nothing renders differently yet.

**Step 2 — one region component.** `<PreviewInspector surfaces={…} />`, rendered by the canvas as a sibling of `.report-surface`, next to where `PaletteLegend` already lives. Move the tooltip callout and the state selector into it as the first two declared surfaces, and delete `extraControls` and the two `useState`s from `PreviewShell`. This is a refactor with a visible behaviour change (things move out of the page) and no new capability — the right size for a single reviewable commit.

**Step 3 — bind the surface into the stamper.** `TargetStamper` gains a surface, but *not* at every call site. Create it per surface:

```ts
type TargetStamper<V> = (id: PreviewTargetId<V>, state?: InteractionState) => {
  "data-preview-surface": string;
  "data-preview-target": string;
  "data-preview-state"?: string;
};

const stamp = makeStamper<"clusteredBarChart">("primary");
// every existing call site is unchanged:
<Gridlines {...stamp("valueAxis.gridlines")} rect={layout.plot} scale={layout.scale.value} />
```

Surface is ambient within a surface, so binding it at construction keeps the renderer's ergonomics identical to the mapping design's §8.1 sketch and adds no parameter to any element.

**Step 4 — the first genuine supporting surfaces**, one visual at a time, in the order §5 recommends. Action button variants first: four states side by side, which is a pure win, needs no `ChartLayout`, and exercises the whole model end to end on a visual that is already 98.5% represented.

### 4.3 Explicitly not building now

Named so they can be refused later without re-arguing: a surface registry with cross-surface layout negotiation; a declarative specimen/example DSL; per-surface theme overrides; surface-level animation or transitions; user-authored surfaces; persisting surface visibility; responsive re-composition. Every one of these is a plausible future and none is needed to render four buttons in a row.

### 4.4 One precondition, worth stating

`VisualGallery` is a single ~2,000-line function body that computes all sixteen visuals' content on every render regardless of what is visible (`VisualPreviews.tsx:876–2933`). Multiplying that by N surfaces is not viable. The fix — one component per visual, taking `(style, layout, stamp)` and returning one instance — is exactly the shape the mapping design's §8.1 renderer signature already assumes, and it is a **precondition for composition rather than part of it.** It should be sequenced before step 4, and it is worth doing on its own merits regardless of whether composition is ever built.

---

## 5. The 16 visuals, classified

Lightweight by intent: which visuals are likely to earn supporting surfaces, which should stay single-surface, and why. Ratings are *likely*, not committed; each becomes a real decision when that visual is mapped.

| Visual | Primary | Likely supporting | Why |
|---|---|---|---|
| **Action button** | button | **3 variants** (hover, selected, disabled) | Canonical case. §6.2. |
| **Bookmark navigator** | button grid | **2 variants** (hover, disabled) | Primary honestly shows `default` + `selected` together — a real navigator does. Only the two genuinely absent states need surfaces. |
| **Page navigator** | button grid | **2 variants** (hover, disabled) | As above. |
| **Slicer** | list, with a mode toggle | **1 variant** (selected/hover item) at most | Modes stay a toggle (§1.3): four-plus alternatives, one per page. |
| **Clustered bar** | bars + axes + legend | **1–2 examples** | §6.1. Most of the 57 constant-line gaps are renderer work on the primary, not surfaces. |
| **Clustered column** | columns + axes + legend | **1–2 examples**, sharing bar's components | Same features, same reasoning. Share the *component*; declare the *surface* per visual (the property ids differ). |
| **Line chart** | line + markers + axes | **1 example** (marker shapes), **1 variant** (step vs curve) | Interpolation modes are mutually exclusive; marker shape is an enum the primary shows one of. Highest legitimate surface count in the app — and the one most at risk of becoming a gallery. |
| **Stacked bar** | bars | **none yet** | G5: the "stack" is a fixed 62% split ignoring data (audit §4.2). Surfaces on a fictional primary multiply the fiction. Fix stacking first. |
| **Stacked column** | columns | **none yet** | As above. |
| **Pie** | slices | **none yet** | G5: no slice geometry exists (audit §4.8), so label-placement examples would have nothing honest to anchor to. Earn it with geometry first. |
| **Table** | grid | **none** | §6.4. Its 28 gaps are sample-data and renderer problems; the answer is a richer sample table, not more surfaces. |
| **Matrix** | grid + hierarchy | **0–1 variant** | Only if stepped-vs-tabular layout gets registered — genuinely mutually exclusive. Otherwise as Table. |
| **Card** (legacy) | callout | **none** | Small property set, all simultaneously visible. |
| **Shape** | one shape | **none** (see note) | 22 geometries are mutually exclusive, which *sounds* like a variant case — but showing them all is shape *selection*, not theme fidelity, and would be the first step toward a component gallery. Recommend against. |
| **Textbox** | text | **none** | Three properties. |
| **Image** | image | **none** | Fit modes are mutually exclusive but low-value; defer. |
| **All 16** (chrome) | — | **1 transient** (tooltip) + hover states | Shared, declared once in `chrome.preview.ts`. §6.3. |

Two patterns fall out. **Stateful visuals earn variants; cartesian charts earn examples; structural visuals earn nothing** — and that is a good sign, because it means the model is tracking a real distinction rather than being applied uniformly for its own sake. And **six of sixteen visuals should get no supporting surfaces at all**, with three more blocked behind primary-fidelity work. If a later design proposes surfaces for more than about half the visuals, something has gone wrong.

---

## 6. Worked examples

### 6.1 Clustered bar chart — reference lines

The temptation is to answer the bar pilot's **57 constant-line gap properties (51% of all its gaps)** with a reference-line gallery. That would be the wrong lesson.

Power BI draws multiple constant lines on one plot, each with its own label and shaded region. So does an honest primary. The overwhelming majority of those 57 properties — `value`, `position`, `displayName`, the 7 `dataLabel*`, the 5 `shade*`, and the whole of `xAxisReferenceLine` and `y1AxisReferenceLine` — are **renderer work on the primary**, gated on `ChartLayout.scale.value` so the line lands where the axis says. The pilot's own conclusion stands: one renderer feature moves this visual from 58% to ~79%, and no surface is involved.

What genuinely does not fit on the primary is narrow:

| Candidate | Reason | Verdict |
|---|---|---|
| Dash pattern / dash cap at 1–2px, at page scale | `detail-magnification` | **Yes** — a short strip, one row per style, magnified. A user cannot otherwise tell `dashArray` apart from `style: dotted`. |
| `position` (behind / in front of the data marks) | `mutually-exclusive` | **Borderline.** Two mini-plots, one each. Only worth it once the primary draws the shaded region — otherwise there is nothing to occlude. Defer. |
| Three separate line families at once | — | **No.** A plot can hold all three honestly. That is a renderer job. |
| Data-label placement enum | `enumerated-options` | **No, not initially.** The primary can show one placement, and the enum has few members. Revisit only if users report confusion. |

So: **one example surface, `referenceLine.styleSpecimen`, magnified**, owning its own targets per §2.3 — because a specimen strip makes no positional claim and must not inherit the plot line's `misleading` verdict. Everything else stays on the primary and stays a `gap` until the renderer catches up.

This is the discipline the model exists to enforce. *"This property does not render"* is a gap. *"This property renders but cannot be judged at this size"* is a surface. Only the second is a composition problem.

### 6.2 Action button — interaction states

The strongest case in the app, and it comes straight out of the Action Button pilot's §3.2 table.

Today the hero shows **one** state, chosen with a `StateSelector`. Fluent 2 declares `fill` for all four states, `outline` for three (no `disabled`), `text` for three (no `hover`), and `icon` for two (no `hover`, no `selected`) — everything else falling back through untagged entries to coded defaults. A theme author's real question is *"do my four states read as a coherent set, and where am I silently inheriting a fallback?"* A selector can never answer it: by the time you click `hover`, `default` is gone.

**Proposal:** three variant surfaces — `variant.hover`, `variant.selected`, `variant.disabled` — rendered side by side beside the primary, in the inspector region.

```ts
composition: {
  primary: {
    id: "primary", kind: "primary", label: "Button",
    emits: ["button.fill", "button.outline", "button.text",
            "button.icon", "button.glow", "button.shadow"],
    state: "default",
  },
  supporting: (["hover", "selected", "disabled"] as const).map((state) => ({
    id: `variant.${state}`, kind: "variant", reason: "mutually-exclusive",
    label: `${state} state`,
    state,
    emits: ["button.fill", "button.outline", "button.text",
            "button.icon", "button.glow", "button.shadow"],
  })),
}
```

Note what is absent. No new target. No new binding. No per-state target duplication. The existing `stateful: true` targets and `states: ALL_STATES` bindings cover all four instances, exactly as §2.3 predicts for variants, and the resolver already supports it — `resolveActionButtonStyle(themeSource, theme, state)` is called once per state today for the selector; it would simply be called four times instead of once (`VisualPreviews.tsx:922–929`).

Two consequences worth flagging. Tier 3 and tier 4 stop needing to drive a UI control to reach a state, because all four are in the DOM simultaneously — a direct simplification of the pilot's §3.5 warning that "state-aware assertions must target the hero". And the ragged-coverage problem becomes *visible* rather than merely documented: a `disabled` button whose outline is identical to `default` is instantly legible as a fallback when the two are adjacent.

The three navigators follow the same pattern with fewer surfaces (§5), because their primary already contains more than one button and can honestly show `default` and `selected` together.

### 6.3 Tooltips and other transient elements

Tooltips are chrome — 35 properties on `visualTooltip`, shared identically across all 16 visuals — so they are declared once, in the shared chrome catalogue, and spread into every visual's composition. That reuses the answer the target design already leans toward in its open question 2.

Today the tooltip is behind a *"Show tooltip preview"* toggle, off by default, rendered inside the page. Three changes:

1. **Move it to the inspector region.** A tooltip is not page content; a report at rest does not have one hanging under a chart.
2. **Render it persistently** rather than behind a toggle. Thirty-five properties hidden behind a button the user must know to press is a coverage problem disguised as tidiness — and once the surface is out of the page, there is no clutter argument left for hiding it.
3. **Declare it `kind: "transient"`, `reason: "interaction-only"`**, with its own targets (`tooltip.container`, `tooltip.title`, `tooltip.value`, `tooltip.action`), and `requires: [{ property: "…visualTooltip.show", equals: true }]` so tier 3 does not report a false failure when it is off.

The same treatment fits the header tooltip (currently a hover on a header icon, `VisualPreviews.tsx:738–741`), and later hover/selected data-point states and drill-through affordances. In each case the product rule from the brief applies exactly: **Theme Studio must show what these look like; it need not reproduce the interaction that triggers them.** Making them static, persistent and out-of-page is what discharges that.

One caution, which is guardrail G7 in miniature: transient surfaces are the easiest kind to over-produce, because every visual has hover states for every element. The budget applies to them first.

### 6.4 Table — the case for staying single-surface

The Table should remain **one surface, and this design should make that comfortable rather than exceptional.**

All seven of its targets — column headers, body cells, totals row, banding, both gridline directions, outline — are simultaneously visible in a single grid. There is no mutually exclusive state (no hover styling in the registry), nothing needs magnification, and there is no enum the primary can only show one member of. All four `SurfaceReason` values fail to apply, which is precisely the intended outcome for a visual like this.

Its 28 gaps are instructive because none of them is a composition problem:

| Gap cluster | Real cause | Right answer |
|---|---|---|
| `columnFormatting` (8), `outline*` triples (10), `grid.outlineStyle` | unimplemented renderer | Renderer work on the primary — the pilot puts it at 57% → 77% |
| `sparklines` (7), `urlIcon`, `webURL`, `showBlankAs`, image sizing | fixed 3-column sample with no URL, blank, image or per-row series | **A richer sample table** — one URL column, one blank cell, one sparkline column |
| `columnWidth` (all) | genuine layout-engine concern | Already correctly `non-previewable` |

The middle row generalises, and is worth stating as a rule since it will come up for Matrix, Pie and the stacked charts too:

> **A data-shape gap is answered by better sample data on the primary, not by a new surface.** A surface built to display something the sample lacks is a diorama, not a preview.

Matrix follows Table, with one possible exception: if stepped-vs-tabular layout is ever registered, those are genuinely mutually exclusive and would justify a single variant. Card, Textbox and Image are single-surface for the simpler reason that their whole property set is visible at once.

---

## 7. Implications for `ChartLayout`

`ChartLayout` (`RENDERER_AUDIT.md` §3.1) is unaffected in its shape. Four implications, all of which strengthen constraints the audit already proposed.

**1. It must be pure and re-entrant, called N times per render.** The audit's rule 5 says one engine for hero and thumbnail, differing only by the `outer` rect. Composition generalises that to *one engine for every surface* — a hero primary, a thumbnail primary, three variants and two examples might mean six calls for one visual in one frame. Nothing global, no module constants (the whole point of deleting `BAR_VALUE_AXIS_INSET`), no DOM measurement, no memo keyed on visual identity alone.

**2. Example surfaces need no new API — and that is a validation of the design.** A magnified dash strip is a chart with no title, no legend, no axes and no category gutter. Under the audit's rule 1 (*"gutters are subtracted, never assumed… only when `show` is true"*), that is already expressible: pass a small `outer` rect and a style with everything hidden, and `layout.plot` fills it. If a specimen surface ever *does* require a new `ChartLayout` entry point, that is a signal the specimen is trying to be a whole visual and should be re-examined against §1.2.

**3. Specimens must still use `layout.scale`.** A reference-line specimen that positions its line with a CSS percentage would reintroduce the exact defect it exists to illustrate — `left: 65%` against the wrong box (bar pilot §3.5). Small surfaces are where hardcoded geometry creeps back, because it looks harmless at a few pixels tall. The rule holds everywhere: **`scale.value` is the only path from data to pixels**, including on a specimen strip.

**4. `layoutSlot` resolves against a surface, not a visual.** `PreviewTarget.layoutSlot` names a slot in *the* layout; with N surfaces there are N layouts. No type changes — the surface supplies the instance, so the highlight lookup becomes `layoutFor(surface)[target.layoutSlot]` instead of `layout[target.layoutSlot]`. Worth writing down because it is the one place a reader would reasonably assume a single global layout, and because the mapping design's §8.2 highlight path depends on it.

**And one thing `ChartLayout` must not acquire:** any notion of surfaces. It takes a rect and returns geometry. Surfaces live above it and decide what rect to pass. Keeping that boundary is what lets the two designs continue to be developed independently, as their authors intended.

---

## 8. Guardrails — keeping the canvas a report page

The risk is concrete and named in the brief: the centre canvas degrades from *a simulated report page* into *a component gallery*, at which point the studio stops answering "what will my report look like?" — which is the only question it exists to answer. Nine rules, in rough order of how load-bearing they are.

**G1 — The page holds primary surfaces and nothing else.** `.report-page` contains the hero primary and the thumbnail primaries. The filter pane stays where it is — inside `.report-surface`, beside the page, because it is genuine report chrome rather than page content. Every supporting surface renders in `.preview-inspector`, a sibling of `.report-surface` and outside the simulated report entirely. This is structural, enforceable in one place, and non-negotiable; everything else here is secondary to it. *(Currently violated by the tooltip callout and state selector — §1.4.)*

**G2 — The primary's bounds are invariant to supporting surfaces.** `RENDERER_AUDIT.md` §6 measured that toggling the filter pane leaves the hero's bounds untouched, and argued the hero's job is to be a stable comparison surface. Composition multiplies the ways that could break. Assert it: showing, hiding or adding a supporting surface must not change the primary's `outer` rect by one pixel.

**G3 — Supporting surfaces exist only for the selected visual.** Thumbnails render the primary, always, and never anything else. Fifteen thumbnails each sprouting variants is the gallery failure in its purest form.

**G4 — Primary precedence.** If a property can be honestly represented on the primary, it must be. A supporting surface requires a `SurfaceReason` from the closed list of four, and there is deliberately no reason meaning *"the primary does not render this yet"* — that is a `gap`. Surfaces must never become the cheap way to close coverage.

**G5 — Surfaces are earned by a truthful primary.** No supporting surfaces for a feature whose primary element carries a `misleading` `modelFidelity`. Stacked charts (fixed 62% split), pie (no slice geometry) and the trend line (fixed −6° diagonal) fix the primary first. Building specimens around a fiction multiplies the fiction and makes it look more authoritative.

**G6 — Data-shape gaps are answered by sample data, not surfaces** (§6.4).

**G7 — A budget, and it is small.** At most **four** supporting surfaces visible at once for any visual. §5 predicts a maximum of three in practice, and six of sixteen visuals at zero. Exceeding the budget is a design smell, not a limit to raise: it means the primary is under-built, or the feature wants a different affordance entirely.

**G8 — Specimens never launder coverage.** Different claims mean different targets (§2.3); coverage is reported per surface kind and quoted against the primary (§2.5). A visual must not be able to improve its number by adding surfaces.

**G9 — Supporting surfaces must look like specimens.** Different background, no page wallpaper, an explicit label, and a visual break from the page. A user glancing at the screen must never mistake the inspector region for report content. This is what makes the honesty of the whole model legible rather than merely documented.

---

## 9. Open questions for review

1. **Inspector placement.** Below the report surface (simplest, matches `PaletteLegend`), or a right-hand column between the canvas and the property panel? Below is the safe default; a three-column layout at 1280px is already tight, and the hero is clipped there today (audit §5.1).
2. **Do variants re-resolve, or re-render?** Action button variants need `resolveActionButtonStyle` called per state — four resolutions per frame instead of one. Cheap for a button; worth measuring before the pattern spreads to a chart family.
3. **Should `SurfaceReason` be required on `variant` surfaces?** Every variant is `mutually-exclusive` by definition, so the field may be noise there and only genuinely informative on `example` and `transient`. Leaning: require it everywhere anyway, for uniformity, and because a variant that *isn't* mutually exclusive is a bug worth being unable to express.
4. **Cross-visual surface reuse.** Bar and column want the same reference-line specimen; the four shape-family visuals want the same state variants. Shared *component*, per-visual *declaration* is the obvious answer — but it means four near-identical composition blocks. Acceptable duplication, or worth a small helper?
5. **Does the hero's fixed `scale(1.5)` survive this?** Supporting surfaces at a different scale beside a 1.5×-scaled hero will read as inconsistent type sizes. This may make audit recommendation 5 (fit-to-container instead of a fixed scale) a *precondition* for step 4 rather than an independent improvement.
6. **Is `unplacedTargets` a build failure from day one?** It would fail immediately for any visual mapped before its composition is declared. Suggest: warn during migration, fail once a visual has both a map and a composition.

---

## 10. What this design deliberately does not do

- It does **not** change theme resolution, import/export, or the registry architecture.
- It does **not** modify `PreviewBinding`, `TargetRelationship`, `Representation`, `Severity`, `Gap` or `NonPreviewable`. `PreviewMap` gains one field; `PreviewTarget` gains none.
- It does **not** implement `ChartLayout`, and adds no requirement to it beyond purity, which it already needed.
- It does **not** redesign the studio's UX. The rail, the canvas, the report-page metaphor, the property panel and the hero comparison surface are unchanged; one new region appears beneath the report surface.
- It does **not** propose an example per formatting value. §5 predicts zero supporting surfaces for six of sixteen visuals and at most three for any of them, and §6.1 spends most of its length arguing *against* the largest specimen opportunity in the app.
- It does **not** re-audit the renderer or the property registries. Every figure quoted here comes from `RENDERER_AUDIT.md` or the three pilots.
- It does **not** claim any of the classifications in §5 are settled. They are predictions, to be decided per visual when it is mapped.

**Scope statement.** Design only. No code, tests, mapping files or UI changes were produced.
