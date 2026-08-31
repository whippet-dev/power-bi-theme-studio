import assert from "node:assert/strict";
import test from "node:test";
import fluent2 from "../themes/base/fluent2.json" with { type: "json" };
import { resolveActionButtonStyle } from "../app/lib/actionButtonProperties";
import { resolveGlobalOptionsStyle } from "../app/lib/globalOptionsProperties";
import { themeLayers } from "../app/lib/properties";
import { resolveTheme, type JsonValue, type PowerBITheme } from "../app/lib/theme";

/**
 * Correctness of `$id`-keyed array entries across theme layers.
 *
 * Power BI stores per-state styling as several entries in one array, each
 * tagged with an `$id` ("default"/"hover"/"selected"/"disabled", or
 * "Applied"/"Available" for filter cards). Nothing in the format requires
 * two themes to declare the same states, in the same order, or at all —
 * so an entry's array *position* carries no cross-theme meaning.
 *
 * Resolution must therefore locate a state by its `$id` **within each
 * layer independently**. Sharing one index across layers silently mixes
 * states together: it can resolve "selected" using another state's
 * properties, which is both wrong and invisible.
 *
 * Writes are a separate matter and stay index-based against the user's own
 * raw theme — that is what keeps round-tripping byte-exact.
 */

const BASE_FLUENT_2 = fluent2 as unknown as PowerBITheme;
const RESOLVED = resolveTheme({ dataColors: ["#005EA5"], background: "#FFFFFF", foreground: "#0B0C0C" });

const buttonFill = (entries: Array<Record<string, JsonValue>>): PowerBITheme => ({
  visualStyles: { actionButton: { "*": { fill: entries } } },
});
const colorOf = (hex: string) => ({ solid: { color: hex } });

test("custom declares only `selected`; base declares default/hover/selected", () => {
  // The orderings differ in length, so any shared-index scheme misaligns.
  const base = buttonFill([
    { $id: "default", fillColor: colorOf("#B0B0B0") },
    { $id: "hover", fillColor: colorOf("#C0C0C0") },
    { $id: "selected", fillColor: colorOf("#D0D0D0") },
  ]);
  const custom = buttonFill([{ $id: "selected", fillColor: colorOf("#FF00FF") }]);
  const source = themeLayers(custom, base);

  assert.equal(
    resolveActionButtonStyle(source, RESOLVED, "selected").fill.fillColor,
    "#FF00FF",
    "selected comes from the custom entry",
  );
  assert.equal(
    resolveActionButtonStyle(source, RESOLVED, "default").fill.fillColor,
    "#B0B0B0",
    "default must come from the BASE default entry, not the custom selected entry that happens to sit at index 0",
  );
  assert.equal(resolveActionButtonStyle(source, RESOLVED, "hover").fill.fillColor, "#C0C0C0");
});

test("custom lists the same states in a different order from base", () => {
  const base = buttonFill([
    { $id: "default", fillColor: colorOf("#B0B0B0") },
    { $id: "hover", fillColor: colorOf("#C0C0C0") },
    { $id: "selected", fillColor: colorOf("#D0D0D0") },
  ]);
  // Reversed.
  const custom = buttonFill([
    { $id: "selected", fillColor: colorOf("#333333") },
    { $id: "hover", fillColor: colorOf("#222222") },
    { $id: "default", fillColor: colorOf("#111111") },
  ]);
  const source = themeLayers(custom, base);

  assert.equal(resolveActionButtonStyle(source, RESOLVED, "default").fill.fillColor, "#111111");
  assert.equal(resolveActionButtonStyle(source, RESOLVED, "hover").fill.fillColor, "#222222");
  assert.equal(resolveActionButtonStyle(source, RESOLVED, "selected").fill.fillColor, "#333333");
});

test("custom introduces exactly one interaction state and leaves the rest to the base", () => {
  const base = buttonFill([
    { $id: "default", fillColor: colorOf("#B0B0B0") },
    { $id: "hover", fillColor: colorOf("#C0C0C0") },
  ]);
  const custom = buttonFill([{ $id: "hover", fillColor: colorOf("#00FF00") }]);
  const source = themeLayers(custom, base);

  assert.equal(resolveActionButtonStyle(source, RESOLVED, "hover").fill.fillColor, "#00FF00");
  assert.equal(resolveActionButtonStyle(source, RESOLVED, "default").fill.fillColor, "#B0B0B0");
});

test("a state present in base but absent from custom resolves from base", () => {
  const base = buttonFill([
    { $id: "default", fillColor: colorOf("#B0B0B0") },
    { $id: "disabled", fillColor: colorOf("#E0E0E0") },
  ]);
  const custom = buttonFill([{ $id: "default", fillColor: colorOf("#111111") }]);
  const source = themeLayers(custom, base);

  assert.equal(resolveActionButtonStyle(source, RESOLVED, "disabled").fill.fillColor, "#E0E0E0");
  assert.equal(resolveActionButtonStyle(source, RESOLVED, "default").fill.fillColor, "#111111");
});

test("resolving one state never inherits a sibling property from a different $id", () => {
  // `show` is set only on base's *default* entry. Asking for "selected"
  // must not pick it up — that is the precise cross-contamination this
  // whole test file exists to prevent.
  // The Action Button's capability default for fill.show is false, so the
  // base entry sets TRUE here: the two must differ, or this test could not
  // tell a correct fallback apart from a leak across $ids.
  const base = buttonFill([
    { $id: "default", fillColor: colorOf("#B0B0B0"), show: true },
    { $id: "selected", fillColor: colorOf("#D0D0D0") },
  ]);
  const custom = buttonFill([{ $id: "selected", fillColor: colorOf("#FF00FF") }]);
  const source = themeLayers(custom, base);

  const selected = resolveActionButtonStyle(source, RESOLVED, "selected");
  assert.equal(selected.fill.fillColor, "#FF00FF");
  assert.equal(
    selected.fill.show,
    false,
    "must fall back to the Action Button's capability default, NOT base default's show:true",
  );

  assert.equal(resolveActionButtonStyle(source, RESOLVED, "default").fill.show, true, "default keeps its own show");
});

test("an untagged entry carries group-wide settings and stands in for any state", () => {
  // Fluent 2 itself writes an untagged entry alongside the tagged ones
  // (actionButton.fill[0] is `{ show: true }`), so this shape is real.
  const base = buttonFill([
    { show: false },
    { $id: "default", fillColor: colorOf("#B0B0B0") },
  ]);
  const source = themeLayers({ visualStyles: {} }, base);

  assert.equal(resolveActionButtonStyle(source, RESOLVED, "hover").fill.show, false, "untagged applies to hover too");
  assert.equal(resolveActionButtonStyle(source, RESOLVED, "default").fill.fillColor, "#B0B0B0");
});

test("REAL FIXTURE: Fluent 2's own action button states resolve to their own colours", () => {
  // Fluent 2 fill = [{show}, {$id:default}, {$id:hover}, {$id:selected}, {$id:disabled}]
  // with ThemeDataColor expressions at differing Percent shades.
  const source = themeLayers({ visualStyles: {} }, BASE_FLUENT_2);

  const shades = (["default", "hover", "selected"] as const).map(
    (state) => resolveActionButtonStyle(source, RESOLVED, state).fill.fillColor,
  );

  assert.equal(new Set(shades).size, 3, `each state must resolve its own shade, got ${shades.join(", ")}`);
});

test("REAL FIXTURE: a custom theme overriding only Fluent 2's hover leaves the other states on base", () => {
  const custom = buttonFill([{ $id: "hover", fillColor: colorOf("#00FFAA") }]);
  const source = themeLayers(custom, BASE_FLUENT_2);
  const baseOnly = themeLayers({ visualStyles: {} }, BASE_FLUENT_2);

  assert.equal(resolveActionButtonStyle(source, RESOLVED, "hover").fill.fillColor, "#00FFAA");
  for (const state of ["default", "selected", "disabled"] as const) {
    assert.equal(
      resolveActionButtonStyle(source, RESOLVED, state).fill.fillColor,
      resolveActionButtonStyle(baseOnly, RESOLVED, state).fill.fillColor,
      `${state} must be untouched by an unrelated hover override`,
    );
  }
});

// --- filterCard uses the same mechanism with a different $id vocabulary ---

const filterCards = (entries: Array<Record<string, JsonValue>>): PowerBITheme => ({
  visualStyles: { page: { "*": { filterCard: entries } } },
});

test("filterCard Applied/Available resolve by $id when base and custom order them differently", () => {
  const base = filterCards([
    { $id: "Applied", backgroundColor: colorOf("#AAAAAA") },
    { $id: "Available", backgroundColor: colorOf("#BBBBBB") },
  ]);
  // Reversed relative to base.
  const custom = filterCards([
    { $id: "Available", backgroundColor: colorOf("#FFFFFF") },
    { $id: "Applied", backgroundColor: colorOf("#111111") },
  ]);

  const global = resolveGlobalOptionsStyle(themeLayers(custom, base), RESOLVED);
  assert.equal(global.pageFilterCards.backgroundColor, "#FFFFFF", "Available");
  assert.equal(global.pageFilterCardsApplied.backgroundColor, "#111111", "Applied");
});

test("filterCard: custom supplies only Applied; Available still comes from base", () => {
  const base = filterCards([
    { $id: "Applied", backgroundColor: colorOf("#AAAAAA") },
    { $id: "Available", backgroundColor: colorOf("#BBBBBB") },
  ]);
  const custom = filterCards([{ $id: "Applied", backgroundColor: colorOf("#111111") }]);

  const global = resolveGlobalOptionsStyle(themeLayers(custom, base), RESOLVED);
  assert.equal(global.pageFilterCardsApplied.backgroundColor, "#111111");
  assert.equal(global.pageFilterCards.backgroundColor, "#BBBBBB", "Available must not read custom's Applied entry");
});

test("filterCard: a single untagged entry still applies to both states", () => {
  const custom = filterCards([{ backgroundColor: colorOf("#EEEEEE") }]);
  const global = resolveGlobalOptionsStyle(themeLayers(custom, undefined), RESOLVED);

  assert.equal(global.pageFilterCards.backgroundColor, "#EEEEEE");
  assert.equal(global.pageFilterCardsApplied.backgroundColor, "#EEEEEE");
});

// --- Non-stateful groups that a real base theme still tags with `$id` ---

/**
 * `shape` is not an interaction-state group — a button's geometry does not
 * change on hover — so it is deliberately absent from STATEFUL_GROUPS and
 * resolves to "the group's own entry" for every state.
 *
 * But Fluent 2 still writes it as `shape: [{ $id: "default", ... }]`, for
 * actionButton, bookmarkNavigator and pageNavigator alike. Reading index 0
 * literally therefore happens to be correct only because the default entry
 * is listed first. Nothing in the format guarantees that, and it is the
 * same positional assumption the $id work removed elsewhere.
 *
 * The rule these pin: an entry is located by what it *is*, never by where
 * it sits — whether or not the group varies by state.
 */

const buttonShape = (entries: Array<Record<string, JsonValue>>): PowerBITheme => ({
  visualStyles: { actionButton: { "*": { shape: entries } } },
});
const roundEdgeOf = (custom: PowerBITheme, base?: PowerBITheme, state: "default" | "hover" = "default") =>
  resolveActionButtonStyle(themeLayers(custom, base), RESOLVED, state).shape.roundEdge;

test("REAL FIXTURE: Fluent 2 tags actionButton.shape with $id despite it not being a state group", () => {
  const shape = (BASE_FLUENT_2.visualStyles as never as Record<string, Record<string, Record<string, Array<Record<string, unknown>>>>>)
    .actionButton["*"].shape;
  assert.equal(shape[0].$id, "default", "fixture guard: the tag this test exists because of");
  assert.equal(
    resolveActionButtonStyle(themeLayers({ visualStyles: {} }, BASE_FLUENT_2), RESOLVED, "default").shape.roundEdge,
    shape[0].roundEdge,
    "the shipped value must reach the resolved style",
  );
});

test("a tagged `default` shape entry resolves wherever it sits in the array", () => {
  const atZero = buttonShape([{ $id: "default", roundEdge: 11 }]);
  const atOne = buttonShape([{ $id: "hover", roundEdge: 99 }, { $id: "default", roundEdge: 11 }]);

  assert.equal(roundEdgeOf({ visualStyles: {} }, atZero), 11, "baseline: default entry first");
  assert.equal(
    roundEdgeOf({ visualStyles: {} }, atOne),
    11,
    "reordering the array must not change the answer — index 0 is another state's entry",
  );
});

test("an untagged shape entry stands in for the group even when it is not first", () => {
  const untaggedFirst = buttonShape([{ roundEdge: 22 }]);
  const untaggedSecond = buttonShape([{ $id: "hover", roundEdge: 99 }, { roundEdge: 22 }]);

  assert.equal(roundEdgeOf({ visualStyles: {} }, untaggedFirst), 22);
  assert.equal(roundEdgeOf({ visualStyles: {} }, untaggedSecond), 22, "untagged entry is found by being untagged, not by position");
});

test("a custom shape layer is matched by $id, not by index, against a differently-ordered base", () => {
  const base = buttonShape([{ $id: "default", roundEdge: 77 }]);
  const custom = buttonShape([{ $id: "hover", roundEdge: 99 }, { $id: "default", roundEdge: 11 }]);

  assert.equal(roundEdgeOf(custom, base), 11, "custom's own default entry wins, wherever it sits");
});

test("a custom layer declaring only `default` resolves without a base", () => {
  assert.equal(roundEdgeOf(buttonShape([{ $id: "default", roundEdge: 11 }]), undefined), 11);
});

test("shape stays constant across interaction states — it is not a state group", () => {
  // The whole point of shape being outside STATEFUL_GROUPS: asking for
  // "hover" must still yield the group's own entry, not fall through to a
  // coded default because no `$id: "hover"` exists.
  const base = buttonShape([{ $id: "default", roundEdge: 11 }]);
  assert.equal(roundEdgeOf({ visualStyles: {} }, base, "default"), 11);
  assert.equal(roundEdgeOf({ visualStyles: {} }, base, "hover"), 11, "geometry does not change on hover");
});
