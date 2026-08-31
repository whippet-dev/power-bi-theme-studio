import assert from "node:assert/strict";
import test from "node:test";
import { resolveActionButtonStyle } from "../app/lib/actionButtonProperties";
import { resolveBookmarkNavigatorStyle } from "../app/lib/bookmarkNavigatorProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolvePageNavigatorStyle } from "../app/lib/pageNavigatorProperties";
import { themeLayers } from "../app/lib/properties";
import { resolveShapeStyle } from "../app/lib/shapeProperties";
import { resolveTheme, type PowerBITheme } from "../app/lib/theme";

/**
 * Capability defaults belong to the visual, not to the shared schema.
 *
 * Shape, Action Button, Page Navigator and Bookmark Navigator share
 * `resolveShapeFamilyCore`, and used to share its fallback literals too. They
 * do not share effective defaults: measured natively under the current
 * default base theme, a Rectangle shows fill and border and hides its text,
 * an Action Button hides its fill and draws a 3px border, and a navigator
 * shows bold text neither of the others shows.
 *
 * None of these values appears in any bundled base theme -- the trace found
 * `shape`, `actionButton`, `bookmarkNavigator` and `pageNavigator` carry only
 * `background`/`visualHeader` under Classic 2026 and nothing at all under
 * Classic 2018 -- so they are capability defaults by definition.
 */

const EMPTY: PowerBITheme = { name: "No overrides", visualStyles: {} };
const RESOLVED = resolveTheme(EMPTY);
const layers = (custom: PowerBITheme = EMPTY, baseId: "classic2026" | "fluent2" = "classic2026") =>
  themeLayers(custom, getBaseTheme(baseId));

// ---------------------------------------------------------------------------
// 1. Each visual gets its OWN defaults
// ---------------------------------------------------------------------------

test("the four visuals do not share one set of capability defaults", () => {
  const shape = resolveShapeStyle(layers(), RESOLVED);
  const button = resolveActionButtonStyle(layers(), RESOLVED, "default");
  const page = resolvePageNavigatorStyle(layers(), RESOLVED, "default");
  const bookmark = resolveBookmarkNavigatorStyle(layers(), RESOLVED, "default");

  // Fill: on for a shape and a navigator, OFF for a button.
  assert.equal(shape.fill.show, true);
  assert.equal(button.fill.show, false);
  assert.equal(page.fill.show, true);
  assert.equal(bookmark.fill.show, true);

  // Text: off for a shape and a button, ON and bold for both navigators.
  assert.equal(shape.text.show, false);
  assert.equal(button.text.show, false);
  assert.equal(page.text.show, true);
  assert.equal(page.text.bold, true);
  assert.equal(bookmark.text.show, true);
  assert.equal(bookmark.text.bold, true);

  // Border weight: 1px everywhere except the button's 3px.
  assert.equal(shape.outline.weight, 1);
  assert.equal(button.outline.weight, 3);
  assert.equal(page.outline.weight, 1);
  assert.equal(bookmark.outline.weight, 1);

  // Border itself is on for all four -- it used to default to off for all.
  for (const [name, style] of [["shape", shape], ["button", button], ["page", page], ["bookmark", bookmark]] as const) {
    assert.equal(style.outline.show, true, `${name} draws its border by default`);
    assert.equal(style.shadow.show, false, `${name} has no shadow by default`);
    assert.equal(style.glow.show, false, `${name} has no glow by default`);
  }
});

test("latent text styling survives text being off", () => {
  // Off, but styled: Segoe UI 10 is what appears the moment a user switches
  // text on, so it is a real default rather than a placeholder.
  const shape = resolveShapeStyle(layers(), RESOLVED);
  assert.equal(shape.text.show, false);
  assert.equal(shape.text.fontSize, 10);
  assert.equal(shape.text.topMargin, 0);
  assert.equal(shape.text.rightMargin, 0);

  const button = resolveActionButtonStyle(layers(), RESOLVED, "default");
  assert.equal(button.text.show, false);
  assert.equal(button.text.fontSize, 10);
});

test("Bookmark Navigator does not borrow the Page Navigator's measured alignment", () => {
  // Alignment was measured for the Page Navigator and not for the Bookmark
  // Navigator, so only one of them declares it. A gap must read as "not
  // established", never as a value copied from a sibling.
  assert.equal(resolvePageNavigatorStyle(layers(), RESOLVED, "default").text.horizontalAlignment, "left");
  assert.equal(resolveBookmarkNavigatorStyle(layers(), RESOLVED, "default").text.horizontalAlignment, "center");
});

// ---------------------------------------------------------------------------
// 2. Per-state resolution
// ---------------------------------------------------------------------------

test("every state of a stateful visual gets the visual's capability defaults", () => {
  for (const state of ["default", "hover", "selected", "disabled"] as const) {
    const button = resolveActionButtonStyle(layers(), RESOLVED, state);
    assert.equal(button.fill.show, false, `button fill is off in "${state}"`);
    assert.equal(button.outline.weight, 3, `button border is 3px in "${state}"`);
    assert.equal(button.text.show, false, `button text is off in "${state}"`);
  }
  for (const state of ["default", "hover", "selected"] as const) {
    assert.equal(resolvePageNavigatorStyle(layers(), RESOLVED, state).text.bold, true);
    assert.equal(resolveBookmarkNavigatorStyle(layers(), RESOLVED, state).text.bold, true);
  }
});

// ---------------------------------------------------------------------------
// 3. Precedence: theme values still win
// ---------------------------------------------------------------------------

test("an explicit custom-theme value beats the capability default", () => {
  const custom: PowerBITheme = {
    name: "override",
    visualStyles: { actionButton: { "*": { fill: [{ $id: "default", show: true }] } } },
  };
  assert.equal(resolveActionButtonStyle(layers(custom), RESOLVED, "default").fill.show, true);
  // and only for the state it names
  assert.equal(resolveActionButtonStyle(layers(custom), RESOLVED, "hover").fill.show, false);
});

test("an explicit base-theme value beats the capability default", () => {
  // Fluent 2 supplies real per-state entries for these visuals; Classic 2026
  // supplies none. Selecting Fluent 2 must therefore change the result, and
  // its values must win over the capability defaults.
  const fluent = resolveActionButtonStyle(layers(EMPTY, "fluent2"), RESOLVED, "default");
  const classic = resolveActionButtonStyle(layers(EMPTY, "classic2026"), RESOLVED, "default");

  // Fluent 2 states both of these explicitly on its $id-tagged default entry,
  // and both beat the capability default.
  assert.equal(fluent.text.fontSize, 10.5, "Fluent 2's font size, not the capability 10");
  assert.equal(classic.text.fontSize, 10, "Classic 2026 says nothing, so the capability default stands");
  assert.equal(fluent.outline.weight, 1, "Fluent 2's border weight, not the capability 3");
  assert.equal(classic.outline.weight, 3);

  // NOT asserted: fill.show. Fluent 2 carries `{ show: true }` on an UNTAGGED
  // entry while also carrying a separate $id:"default" entry, and the resolver
  // reads one entry per layer -- so the untagged group-wide value does not
  // merge into the tagged state. That is pre-existing resolver behaviour,
  // unchanged here and reported as a limitation rather than worked around.
});

test("a custom value still beats an explicit base-theme value", () => {
  const custom: PowerBITheme = {
    name: "override",
    visualStyles: { actionButton: { "*": { fill: [{ show: false }] } } },
  };
  assert.equal(resolveActionButtonStyle(layers(custom, "fluent2"), RESOLVED, "default").fill.show, false);
});

// ---------------------------------------------------------------------------
// 4. The already-proven non-core defaults
// ---------------------------------------------------------------------------

test("navigator and icon defaults match what was measured", () => {
  const page = resolvePageNavigatorStyle(layers(), RESOLVED, "default");
  assert.equal(page.pages.showHiddenPages, true, "hidden pages are shown");
  assert.equal(page.pages.showTooltipPages, false, "tooltip pages are not");
  assert.equal(page.layout.cellPadding, 5);
  assert.equal(page.layout.orientation, 2, "Horizontal");
  assert.equal(page.accentBar.show, false);

  const bookmark = resolveBookmarkNavigatorStyle(layers(), RESOLVED, "default");
  assert.equal(bookmark.layout.cellPadding, 5);
  assert.equal(bookmark.layout.orientation, 2, "Horizontal");
  assert.equal(bookmark.accentBar.show, false);
  assert.equal(bookmark.bookmarks.allowDeselectionBookmark, false);

  const icon = resolveActionButtonStyle(layers(), RESOLVED, "default").icon;
  assert.equal(icon.show, true);
  assert.equal(icon.shapeType, "blank");
  assert.equal(icon.placement, "custom");
  assert.equal(icon.lineWeight, 3);
  assert.equal(icon.lineTransparency, 0);
  assert.equal(icon.horizontalAlignment, "center");
  assert.equal(icon.verticalAlignment, "middle");
  for (const margin of [icon.topMargin, icon.bottomMargin, icon.leftMargin, icon.rightMargin]) {
    assert.equal(margin, 4, "icon padding is 4px all round");
  }
});

test("a showHiddenPages override still wins now that the default is true", () => {
  // The default flipped to true, so an override proving precedence has to be
  // false -- otherwise the assertion would pass either way.
  const custom: PowerBITheme = {
    name: "override",
    visualStyles: { pageNavigator: { "*": { pages: [{ showHiddenPages: false }] } } },
  };
  assert.equal(resolvePageNavigatorStyle(layers(custom), RESOLVED, "default").pages.showHiddenPages, false);
});

// ---------------------------------------------------------------------------
// 5. Shape stays non-stateful
// ---------------------------------------------------------------------------

test("Shape has no interaction states to resolve", () => {
  // resolveShapeStyle takes no state argument at all, and its groups are not
  // in STATEFUL_GROUPS, so there is nothing for a state to vary.
  const shape = resolveShapeStyle(layers(), RESOLVED);
  assert.equal(shape.fill.show, true);
  assert.equal(resolveShapeStyle.length, 2, "signature stays (theme, base) -- no state parameter");
});
