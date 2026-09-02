/**
 * Filter pane and filter card native defaults, from the Desktop measurement
 * pass across all three shipped base themes.
 *
 * The method matters for reading these tests. A fingerprint theme moved every
 * root token and all four text classes to unique values, and was loaded over
 * Classic 2018, Classic 2026 and Fluent 2 in turn. A value that held against
 * that is recorded as a fixed capability fallback; a value that tracked the
 * fingerprint is wired to the token it tracked. So "not derived" here is an
 * observation, not an absence of evidence -- the derivations were offered and
 * rejected.
 *
 * Classic 2018 carries the weight throughout: it ships no `outspacePane` and
 * no `filterCard` entry at all, so it is the only base under which these
 * fallbacks are what a user actually gets.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolveGlobalOptionsStyle } from "../app/lib/globalOptionsProperties";
import { themeLayers } from "../app/lib/properties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

type BaseId = "classic2018" | "classic2026" | "fluent2";
const ALL_BASES: readonly BaseId[] = ["classic2018", "classic2026", "fluent2"];

const EMPTY: PowerBITheme = { name: "empty", visualStyles: {} };

/** The measured fingerprint: every root token and text class moved. */
const FINGERPRINT: PowerBITheme = {
  name: "fingerprint",
  dataColors: ["#00E660", "#A300E6", "#E5E600"],
  foreground: "#E60000",
  background: "#00E643",
  tableAccent: "#39E600",
  foregroundNeutralSecondary: "#8600E6",
  foregroundNeutralTertiary: "#00BFE6",
  backgroundLight: "#E6C900",
  backgroundNeutral: "#E6007C",
  textClasses: {
    label: { fontFace: "Courier New", fontSize: 20, color: "#628E0B" },
    header: { fontFace: "Georgia", fontSize: 26, color: "#0B3C8E" },
    title: { fontFace: "Impact", fontSize: 30, color: "#8E0B16" },
    callout: { fontFace: "Comic Sans MS", fontSize: 40, color: "#0B8E27" },
  },
  visualStyles: {},
};

const read = (theme: PowerBITheme = EMPTY, baseId: BaseId = "classic2018") => {
  const src = themeLayers(theme, getBaseTheme(baseId));
  return resolveGlobalOptionsStyle(src, resolveTheme(src.roots));
};
const pane = (theme?: PowerBITheme, baseId?: BaseId) => read(theme, baseId).pageFilterPane;
const available = (theme?: PowerBITheme, baseId?: BaseId) => read(theme, baseId).pageFilterCards;
const applied = (theme?: PowerBITheme, baseId?: BaseId) => read(theme, baseId).pageFilterCardsApplied;

/** Writes into the shared bucket, which is where the measured themes put these. */
const setShared = (theme: PowerBITheme, group: string, prop: string, value: unknown, index = 0) =>
  updateThemeValue(theme, ["visualStyles", "*", "*", group, index, ...(typeof value === "string" && value.startsWith("#") ? [prop, "solid", "color"] : [prop])], value as never);

// ---------------------------------------------------------------------------
// Filter pane -- the base-silent fallbacks
// ---------------------------------------------------------------------------

test("with no base entry at all, the filter pane falls to its measured capability values", () => {
  // Classic 2018 ships no outspacePane, so every one of these is what a user
  // actually sees under that base.
  const p = pane(EMPTY, "classic2018");
  assert.equal(p.border, true, "was false");
  assert.equal(p.borderColor, "#C8C8C8", "was #E3E3E3");
  assert.equal(p.headerSize, 9, "was 12");
  assert.equal(p.width, 200, "was 320");
  assert.equal(p.checkboxAndApplyColor, "#117865", "was tableAccent");
  assert.equal(p.fontFamily, "Segoe UI", "was a text class");
});

test("the fixed filter-pane values do not move under the fingerprint, on any base", () => {
  // The whole basis for calling them fixed. `tableAccent` became #39E600 and
  // dataColors[0] #00E660; the text classes became Courier New / Impact /
  // Georgia / Comic Sans MS at 20 / 30 / 26 / 40. Desktop moved none of these.
  for (const baseId of ALL_BASES) {
    const p = pane(FINGERPRINT, baseId);
    assert.equal(p.fontFamily, "Segoe UI", `fontFamily under ${baseId}`);
    assert.equal(p.headerSize, 9, `headerSize under ${baseId}`);
    assert.equal(p.width, 200, `width under ${baseId}`);
    assert.equal(p.checkboxAndApplyColor, "#117865", `checkboxAndApplyColor under ${baseId}`);
    assert.equal(p.searchTextSize, 10, `searchTextSize under ${baseId}`);
    assert.equal(p.titleSize, 12, `titleSize under ${baseId}`);
  }
});

test("an explicit base value still beats the capability fallback", () => {
  // Classic 2026 states borderColor #B3B0AD. The measured #C8C8C8 is the
  // fallback for a silent chain, not a value to impose over a base.
  assert.equal(pane(EMPTY, "classic2026").borderColor, "#B3B0AD");
  assert.equal(pane(EMPTY, "classic2018").borderColor, "#C8C8C8");
});

test("an explicit custom value beats both", () => {
  const custom = setShared(EMPTY, "outspacePane", "borderColor", "#ABCDEF");
  assert.equal(pane(custom, "classic2026").borderColor, "#ABCDEF");
  assert.equal(pane(custom, "classic2018").borderColor, "#ABCDEF");

  const wide = setShared(EMPTY, "outspacePane", "width", 640);
  assert.equal(pane(wide, "classic2018").width, 640);
});

test("the filter pane's derived channels still derive", () => {
  // Not everything is fixed: these two tracked the fingerprint and stay wired
  // to their tokens.
  assert.equal(pane(FINGERPRINT, "classic2018").foregroundColor, "#E60000", "root foreground");
  assert.equal(pane(FINGERPRINT, "classic2018").backgroundColor, "#00E643", "root background, base silent");
});

// ---------------------------------------------------------------------------
// The input box rule
// ---------------------------------------------------------------------------

test("the input box takes the pane background only when a layer states it", () => {
  // A. Nothing states it -- Classic 2018. The pane background still resolves
  // (to the root token), and the input box pointedly does not follow it.
  const a = pane(FINGERPRINT, "classic2018");
  assert.equal(a.backgroundColor, "#00E643", "background resolves through the token");
  assert.equal(a.inputBoxColor, "#FFFFFF", "input box ignores it");

  // B. A base states it -- Classic 2026's literal white.
  const b = pane(FINGERPRINT, "classic2026");
  assert.equal(b.backgroundColor, "#ffffff");
  assert.equal(b.inputBoxColor, "#ffffff", "inherited from the stated background");

  // C. A custom theme states it, over a silent base.
  const custom = setShared(FINGERPRINT, "outspacePane", "backgroundColor", "#E600AC");
  const c = pane(custom, "classic2018");
  assert.equal(c.backgroundColor, "#E600AC");
  assert.equal(c.inputBoxColor, "#E600AC", "inherited");

  // D. An explicit inputBoxColor still wins over the inheritance.
  const both = setShared(custom, "outspacePane", "inputBoxColor", "#123456");
  assert.equal(pane(both, "classic2018").inputBoxColor, "#123456");
  assert.equal(pane(both, "classic2018").backgroundColor, "#E600AC", "and the background is unchanged");
});

test("the input box rule is not a read of the root background token", () => {
  // The distinction the Classic 2018 run established. `background` is
  // #00E643 in both cases below; only the stated-ness differs.
  assert.equal(pane(FINGERPRINT, "classic2018").inputBoxColor, "#FFFFFF");
  const stated = setShared(FINGERPRINT, "outspacePane", "backgroundColor", "#E600AC");
  assert.equal(pane(stated, "classic2018").inputBoxColor, "#E600AC");
});

// ---------------------------------------------------------------------------
// Filter cards
// ---------------------------------------------------------------------------

test("with no base entry at all, filter cards fall to their measured capability values", () => {
  const a = available(EMPTY, "classic2018");
  assert.equal(a.border, true, "was false");
  assert.equal(a.borderColor, "#C8C8C8", "was #E3E3E3");
  assert.equal(a.textSize, 9, "was 10");
  assert.equal(a.fontFamily, "Segoe UI", "was a text class");
  assert.equal(a.inputBoxColor, "#FFFFFF", "was root background");
});

test("the fixed filter-card values do not move under the fingerprint, on any base", () => {
  for (const baseId of ALL_BASES) {
    for (const [label, card] of [["available", available(FINGERPRINT, baseId)], ["applied", applied(FINGERPRINT, baseId)]] as const) {
      assert.equal(card.fontFamily, "Segoe UI", `${label} fontFamily under ${baseId}`);
      assert.equal(card.textSize, 9, `${label} textSize under ${baseId}`);
      assert.equal(card.borderColor, "#C8C8C8", `${label} borderColor under ${baseId}`);
      assert.equal(card.border, true, `${label} border under ${baseId}`);
    }
  }
});

test("a card's input box does not follow any background, unlike the pane's", () => {
  // Measured asymmetry: the card background was the fingerprint's green on
  // all three bases while the input box stayed white.
  for (const baseId of ALL_BASES) {
    const a = available(FINGERPRINT, baseId);
    assert.equal(a.backgroundColor, "#00E643", `card background under ${baseId}`);
    assert.equal(a.inputBoxColor, "#FFFFFF", `card input box under ${baseId}`);
  }
});

// ---------------------------------------------------------------------------
// The two card backgrounds, and their separate tokens
// ---------------------------------------------------------------------------

test("Available follows background and Applied follows backgroundLight", () => {
  for (const baseId of ALL_BASES) {
    assert.equal(available(FINGERPRINT, baseId).backgroundColor, "#00E643", `Available under ${baseId}`);
    assert.equal(applied(FINGERPRINT, baseId).backgroundColor, "#E6C900", `Applied under ${baseId}`);
  }
});

test("moving backgroundLight moves Applied and nothing else", () => {
  // The specific defect. The old literal #F3F2F1 was correct only because
  // that is Classic 2026's own backgroundLight -- a coincidence that broke
  // the moment a theme set the token.
  const moved: PowerBITheme = { ...FINGERPRINT, backgroundLight: "#ABCDEF" };
  assert.equal(applied(moved, "classic2018").backgroundColor, "#ABCDEF");
  assert.equal(available(moved, "classic2018").backgroundColor, "#00E643", "Available is untouched");
  assert.notEqual(applied(moved, "classic2018").backgroundColor, "#F3F2F1", "no longer a literal");
});

test("the Applied literal is gone, but Classic 2026 still resolves the same value", () => {
  // The coincidence itself: under the base whose backgroundLight IS #F3F2F1,
  // the corrected mechanism must land on exactly the old value.
  assert.equal(applied(EMPTY, "classic2026").backgroundColor, "#F3F2F1");
});

test("foregroundColor follows the foreground token where no state property states it", () => {
  assert.equal(available(FINGERPRINT, "classic2018").foregroundColor, "#E60000");
  assert.equal(applied(FINGERPRINT, "classic2018").foregroundColor, "#E60000");
  // Classic 2026 states it on both $ids, and that still wins.
  assert.equal(available(EMPTY, "classic2026").foregroundColor, "#252423");
});

// ---------------------------------------------------------------------------
// Regressions the corrections must not cause
// ---------------------------------------------------------------------------

test("the two card states stay independent through the new fallbacks", () => {
  const custom = updateThemeValue(
    updateThemeValue(EMPTY, ["visualStyles", "*", "*", "filterCard", 0, "$id"], "Applied"),
    ["visualStyles", "*", "*", "filterCard", 0, "textSize"],
    41,
  );
  assert.equal(applied(custom, "classic2018").textSize, 41);
  assert.equal(available(custom, "classic2018").textSize, 9, "Available keeps the capability value");
});

test("page still beats shared for both groups", () => {
  const both: PowerBITheme = {
    name: "both",
    visualStyles: {
      "*": { "*": { outspacePane: [{ width: 111 }] } },
      page: { "*": { outspacePane: [{ width: 222 }] } },
    },
  };
  assert.equal(pane(both, "classic2018").width, 222);
});

test("a shared-only value is still read", () => {
  const shared = setShared(EMPTY, "outspacePane", "width", 333);
  assert.equal(pane(shared, "classic2018").width, 333);
});

test("page background keeps its shared-bucket fallback, which Desktop confirmed valid", () => {
  const sharedBg: PowerBITheme = {
    name: "shared-bg",
    visualStyles: { "*": { "*": { background: [{ color: { solid: { color: "#E60000" } }, transparency: 0 }] } } },
  };
  const g = read(sharedBg, "classic2018");
  assert.equal(g.pageBackground.color, "#E60000");
  assert.equal(g.pageBackground.transparency, 0);
});

test("resolving does not mutate the theme", () => {
  const before = JSON.stringify(FINGERPRINT);
  for (const baseId of ALL_BASES) read(FINGERPRINT, baseId);
  assert.equal(JSON.stringify(FINGERPRINT), before);
});
