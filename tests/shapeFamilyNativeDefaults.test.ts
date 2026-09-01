/**
 * Shape-family native defaults and state vocabulary.
 *
 * Shape, Action Button, Page Navigator and Bookmark Navigator share
 * `resolveShapeFamilyCore`. They do NOT share effective defaults, and the
 * ways they diverge are the point of these tests: Shape's latent text is a
 * capability constant while the other three follow the label class; Shape's
 * shadow is a hard black while theirs is `foreground`; no two of the four
 * offer the same interaction states.
 *
 * The fixture fingerprints every token, so a colour assertion identifies its
 * source rather than matching a plausible grey.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_BUTTON_PROPERTIES, resolveActionButtonStyle } from "../app/lib/actionButtonProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolveBookmarkNavigatorStyle } from "../app/lib/bookmarkNavigatorProperties";
import { resolveChromeStyle } from "../app/lib/chromeProperties";
import { PROPERTIES_WITHOUT_NATIVE_DEFAULT } from "../app/lib/nativeTokens";
import { resolvePageNavigatorStyle } from "../app/lib/pageNavigatorProperties";
import {
  ALL_INTERACTION_STATES,
  interactionStatesFor,
  nearestInteractionState,
  resolvePropertyEntry,
  supportsInteractionState,
  themeLayers,
  type InteractionState,
} from "../app/lib/properties";
import { resolveShapeStyle } from "../app/lib/shapeProperties";
import { resolveTheme, type PowerBITheme } from "../app/lib/theme";

const FINGERPRINT: PowerBITheme = {
  name: "fingerprint",
  dataColors: ["#00E660"],
  foreground: "#E60000",
  background: "#00E643",
  foregroundNeutralSecondary: "#8600E6",
  foregroundNeutralTertiary: "#00BFE6",
  backgroundLight: "#E6C900",
  backgroundNeutral: "#E6007C",
  tableAccent: "#39E600",
  disabledText: "#123456",
  textClasses: {
    callout: { fontFace: "Comic Sans MS", fontSize: 23, color: "#0B8E27" },
    header: { fontFace: "Georgia", fontSize: 17, color: "#0B3C8E" },
    title: { fontFace: "Impact", fontSize: 30, color: "#8E0B16" },
    label: { fontFace: "Courier New", fontSize: 20, color: "#628E0B" },
  },
  visualStyles: {},
};

const src = (theme: PowerBITheme = FINGERPRINT) => themeLayers(theme, getBaseTheme("classic2026"));
const rt = (theme: PowerBITheme = FINGERPRINT) => resolveTheme(theme);
const shape = (theme?: PowerBITheme) => resolveShapeStyle(src(theme), rt(theme));
const button = (state: InteractionState, theme?: PowerBITheme) =>
  resolveActionButtonStyle(src(theme), rt(theme), state);
const pageNav = (state: InteractionState, theme?: PowerBITheme) =>
  resolvePageNavigatorStyle(src(theme), rt(theme), state);
const bookmarkNav = (state: InteractionState, theme?: PowerBITheme) =>
  resolveBookmarkNavigatorStyle(src(theme), rt(theme), state);

// ---------------------------------------------------------------------------
// 1. State vocabularies
// ---------------------------------------------------------------------------

test("each visual offers exactly the states it was measured to have", () => {
  assert.deepEqual(interactionStatesFor("shape"), [], "Shape has no state selector at all");
  assert.deepEqual(interactionStatesFor("actionButton"), ["default", "hover", "press", "disabled"]);
  assert.deepEqual(interactionStatesFor("pageNavigator"), ["default", "hover", "press", "selected"]);
  assert.deepEqual(interactionStatesFor("bookmarkNavigator"), ["default", "hover", "press", "selected"]);
});

test("no visual is offered a state it does not have", () => {
  // The specific mistakes the old global list made possible.
  assert.equal(supportsInteractionState("actionButton", "selected"), false);
  assert.equal(supportsInteractionState("pageNavigator", "disabled"), false);
  assert.equal(supportsInteractionState("bookmarkNavigator", "disabled"), false);
  assert.equal(supportsInteractionState("shape", "hover"), false);
  assert.equal(supportsInteractionState("shape", "default"), false);
});

test("all three interactive visuals support `press`, which the old list omitted", () => {
  for (const visual of ["actionButton", "pageNavigator", "bookmarkNavigator"] as const) {
    assert.ok(supportsInteractionState(visual, "press"), `${visual} supports press`);
  }
  // `press` is the internal id. Power BI labels it "Pressed" but writes
  // `$id: "press"`, so there is one state here and not two.
  assert.ok(ALL_INTERACTION_STATES.includes("press"));
  assert.equal(ALL_INTERACTION_STATES.includes("pressed" as InteractionState), false);
});

test("an unsupported state falls back to default rather than reading a missing $id", () => {
  // The editor and preview hold one selected state across a visual switch.
  assert.equal(nearestInteractionState("actionButton", "selected"), "default");
  assert.equal(nearestInteractionState("pageNavigator", "disabled"), "default");
  assert.equal(nearestInteractionState("actionButton", "press"), "press");
  assert.equal(nearestInteractionState("shape", "hover"), "default");
});

// ---------------------------------------------------------------------------
// 2. Navigator per-state colours
// ---------------------------------------------------------------------------

const NAVIGATOR_STATE_COLORS = [
  ["default", "#00E643", "#E60000"],
  ["hover", "#E6C900", "#E60000"],
  ["press", "#E6007C", "#E60000"],
  ["selected", "#E60000", "#00E643"],
] as const;

for (const [name, resolve] of [
  ["Page Navigator", pageNav],
  ["Bookmark Navigator", bookmarkNav],
] as const) {
  test(`${name} moves its fill through the measured tokens, inverting when selected`, () => {
    for (const [state, fill, text] of NAVIGATOR_STATE_COLORS) {
      const style = resolve(state);
      assert.equal(style.fill.fillColor, fill, `${state} fill`);
      assert.equal(style.text.fontColor, text, `${state} text`);
    }
  });

  test(`${name} holds everything except fill and text across its states`, () => {
    for (const [state] of NAVIGATOR_STATE_COLORS) {
      const style = resolve(state);
      assert.equal(style.outline.lineColor, "#E60000", `${state}: outline is foreground`);
      assert.equal(style.outline.weight, 1, `${state}`);
      assert.equal(style.shadow.color, "#E60000", `${state}: shadow is foreground`);
      assert.equal(style.glow.color, "#00E660", `${state}: glow is dataColors[0]`);
      assert.equal(style.accentBar.color, "#E60000", `${state}: accent bar is foreground`);
      assert.equal(style.accentBar.width, 2, `${state}`);
    }
  });
}

test("the selected state is a straight foreground/background inversion", () => {
  const def = pageNav("default");
  const sel = pageNav("selected");
  assert.equal(sel.fill.fillColor, def.text.fontColor, "selected fill == default text");
  assert.equal(sel.text.fontColor, def.fill.fillColor, "selected text == default fill");
});

test("the two navigators agree in every state, having been measured separately", () => {
  for (const [state] of NAVIGATOR_STATE_COLORS) {
    const p = pageNav(state);
    const b = bookmarkNav(state);
    assert.equal(p.fill.fillColor, b.fill.fillColor, `${state} fill`);
    assert.equal(p.text.fontColor, b.text.fontColor, `${state} text`);
    assert.equal(p.text.horizontalAlignment, b.text.horizontalAlignment, `${state} alignment`);
    assert.equal(p.text.bold, b.text.bold, `${state} bold`);
  }
});

// ---------------------------------------------------------------------------
// 3. Button disabled
// ---------------------------------------------------------------------------

test("the button's default, hover and press states are identical", () => {
  const def = JSON.stringify(button("default"));
  assert.equal(JSON.stringify(button("hover")), def);
  assert.equal(JSON.stringify(button("press")), def);
});

test("the disabled button dims to neutrals over an opaque plate", () => {
  const d = button("disabled");
  assert.equal(d.text.fontColor, "#00BFE6", "foregroundNeutralTertiary");
  assert.equal(d.icon.lineColor, "#00BFE6", "foregroundNeutralTertiary");
  assert.equal(d.fill.fillColor, "#E6007C", "backgroundNeutral");
  assert.equal(d.outline.lineColor, "#E6007C", "backgroundNeutral");
  // The fill goes opaque so the plate actually shows.
  assert.equal(d.fill.transparency, 0);
  assert.equal(button("default").fill.transparency, 50);
});

test("the disabled button does NOT use the disabledText token", () => {
  // The obvious guess, and wrong. Fluent 2 uses `disabledText` for a
  // navigator's press state, so the token is real — it just is not what
  // Power BI reaches for here. Moving it alone must change nothing.
  const moved: PowerBITheme = { ...FINGERPRINT, disabledText: "#FF00FF" };
  assert.equal(button("disabled", moved).text.fontColor, "#00BFE6");
  assert.equal(button("disabled", moved).icon.lineColor, "#00BFE6");
  assert.notEqual(button("disabled").text.fontColor, "#123456");
});

// ---------------------------------------------------------------------------
// 4. Shape is the family's outlier
// ---------------------------------------------------------------------------

test("Shape fills from the palette and borders with a shade of it", () => {
  const s = shape();
  assert.equal(s.fill.fillColor, "#00E660", "dataColors[0]");
  assert.equal(s.outline.lineColor, "#00AD48", "dataColors[0] at -25%");
});

test("Shape's latent text is a capability constant, unlike the other three", () => {
  const s = shape();
  assert.equal(s.text.fontFamily, "Segoe UI");
  assert.equal(s.text.fontSize, 10, "held while the label class says 20");
  assert.equal(s.text.fontColor, "#00E643", "background");

  for (const style of [button("default"), pageNav("default"), bookmarkNav("default")]) {
    assert.equal(style.text.fontFamily, "Courier New", "the label class family");
    assert.equal(style.text.fontSize, 20, "label x 1");
  }
});

test("Shape's shadow is a hard black; the other three use foreground", () => {
  assert.equal(shape().shadow.color, "#000000");
  for (const style of [button("default"), pageNav("default"), bookmarkNav("default")]) {
    assert.equal(style.shadow.color, "#E60000", "foreground");
  }
});

test("shadow and glow geometry is the same measured set on all four", () => {
  for (const style of [shape(), button("default"), pageNav("default"), bookmarkNav("default")]) {
    assert.equal(style.shadow.transparency, 70);
    assert.equal(style.shadow.shadowBlur, 20);
    assert.equal(style.glow.color, "#00E660", "dataColors[0]");
    assert.equal(style.glow.transparency, 0);
    assert.equal(style.glow.shadowBlur, 40);
    assert.equal(style.shape.roundEdge, 0);
  }
});

// ---------------------------------------------------------------------------
// 5. The retired literals
// ---------------------------------------------------------------------------

test("no shape-family colour comes from Theme Studio's own fallback palette", () => {
  // #005EA5 is this app's FALLBACK_PALETTE[0]. A visual previewing in it was
  // showing a colour from no loaded Power BI theme at all.
  for (const style of [shape(), button("default"), pageNav("default"), bookmarkNav("default")]) {
    assert.notEqual(style.fill.fillColor, "#005EA5");
    assert.notEqual(style.outline.lineColor, "#005EA5");
  }
});

test("no shape-family border still resolves the old #E3E3E3", () => {
  for (const style of [shape(), button("default"), pageNav("default"), bookmarkNav("default")]) {
    assert.notEqual(style.outline.lineColor, "#E3E3E3");
  }
});

test("neither navigator's accent bar comes from tableAccent any more", () => {
  for (const style of [pageNav("default"), bookmarkNav("default")]) {
    assert.notEqual(style.accentBar.color, "#39E600", "not tableAccent");
    assert.equal(style.accentBar.color, "#E60000", "foreground");
    assert.equal(style.accentBar.width, 2);
  }
});

test("PR #12's two disproven values are corrected", () => {
  // Both were recorded there as measured capability defaults.
  for (const style of [pageNav("default"), bookmarkNav("default")]) {
    assert.equal(style.text.bold, false, "bold was recorded true");
    assert.equal(style.text.horizontalAlignment, "center", "page nav was recorded left");
  }
});

// ---------------------------------------------------------------------------
// 5b. Properties with no native default
// ---------------------------------------------------------------------------

test("the button's icon size has no native default, though the preview draws one", () => {
  // Power BI's Icon size reads Auto, not a number, in every state. The
  // preview still needs a concrete size, so 20 is resolved — but nothing set
  // it, and the difference lives in provenance rather than in the value.
  const entry = resolvePropertyEntry(src(), ACTION_BUTTON_PROPERTIES.icon.iconSize, 20);
  assert.equal(entry.source, "fallback", "no theme layer supplies it");
  assert.equal(entry.isSet, false, "so it must not read as configured");
  assert.equal(button("default").icon.iconSize, 20, "the preview still gets a size");

  assert.ok(
    PROPERTIES_WITHOUT_NATIVE_DEFAULT.some((row) => row.property === "actionButton.icon.iconSize"),
    "recorded with its evidence",
  );
});

test("an explicit icon size reads as set and wins", () => {
  // Completes the distinction; otherwise `isSet` would prove nothing.
  const custom: PowerBITheme = {
    ...FINGERPRINT,
    visualStyles: { actionButton: { "*": { icon: [{ $id: "default", iconSize: 44 }] } } },
  };
  const entry = resolvePropertyEntry(src(custom), ACTION_BUTTON_PROPERTIES.icon.iconSize, 20);
  assert.equal(entry.isSet, true);
  assert.equal(button("default", custom).icon.iconSize, 44);
});

test("rectangleRoundedCurve is left unmeasured rather than assumed to match roundEdge", () => {
  // Only `roundEdge` was read in the sweep. The two express the same rounding
  // under different keys, which is exactly why assuming they agree would be
  // inference dressed as measurement.
  for (const style of [shape(), button("default"), pageNav("default"), bookmarkNav("default")]) {
    assert.equal(style.shape.roundEdge, 0, "measured");
    assert.equal(style.shape.rectangleRoundedCurve, 10, "still the generic fallback");
  }
});

// ---------------------------------------------------------------------------
// 6. Titles
// ---------------------------------------------------------------------------

test("all four default their title off, and an explicit value still turns it on", () => {
  const s = src();
  for (const visual of ["shape", "actionButton", "pageNavigator", "bookmarkNavigator"] as const) {
    assert.equal(resolveChromeStyle(s, visual, rt()).title.show, false, `${visual} title off`);
  }
  // A visual outside this pass keeps the previous default.
  assert.equal(resolveChromeStyle(s, "clusteredColumnChart", rt()).title.show, true);

  const custom: PowerBITheme = {
    ...FINGERPRINT,
    visualStyles: { shape: { "*": { title: [{ show: true }] } } },
  };
  assert.equal(resolveChromeStyle(src(custom), "shape", rt(custom)).title.show, true);
});

// ---------------------------------------------------------------------------
// 7. Precedence
// ---------------------------------------------------------------------------

test("an explicit visualStyles value beats every native default, per state", () => {
  const custom: PowerBITheme = {
    ...FINGERPRINT,
    visualStyles: {
      pageNavigator: {
        "*": {
          fill: [
            { $id: "default", fillColor: { solid: { color: "#111111" } } },
            { $id: "selected", fillColor: { solid: { color: "#222222" } } },
          ],
          text: [{ $id: "default", fontSize: 41, bold: true }],
          accentBar: [{ $id: "default", color: { solid: { color: "#333333" } } }],
        },
      },
      shape: { "*": { outline: [{ lineColor: { solid: { color: "#444444" } } }] } },
    },
  };
  assert.equal(pageNav("default", custom).fill.fillColor, "#111111", "over the background token");
  assert.equal(pageNav("selected", custom).fill.fillColor, "#222222", "over the inversion");
  assert.equal(pageNav("default", custom).text.fontSize, 41, "over label x 1");
  assert.equal(pageNav("default", custom).text.bold, true, "over the corrected false");
  assert.equal(pageNav("default", custom).accentBar.color, "#333333", "over foreground");
  assert.equal(shape(custom).outline.lineColor, "#444444", "over the palette shade");
  // Its untouched neighbour still resolves natively.
  assert.equal(pageNav("hover", custom).fill.fillColor, "#E6C900", "backgroundLight");
});

test("resolving the shape family does not mutate the theme", () => {
  const before = JSON.stringify(FINGERPRINT);
  shape();
  for (const s of ["default", "hover", "press", "disabled"] as const) button(s);
  for (const s of ["default", "hover", "press", "selected"] as const) pageNav(s);
  assert.equal(JSON.stringify(FINGERPRINT), before);
});
