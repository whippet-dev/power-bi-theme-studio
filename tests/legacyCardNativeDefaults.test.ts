/**
 * Legacy Card native defaults, against the fingerprint-sweep evidence.
 *
 * The legacy `card` is not the newer `cardVisual`. They share a name and
 * almost nothing else — `cardVisual`'s big value takes only its *size* from
 * the `callout` class, with a capability-constant family and a `foreground`
 * colour, where the legacy Card takes all three channels from `callout`.
 * Nothing here should be reused for that visual.
 *
 * Three theme fixtures, because two of the rules need two points each and
 * the two classes have to move independently to separate them.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { CARD_PROPERTIES, resolveCardStyle } from "../app/lib/cardProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { PROPERTIES_WITHOUT_NATIVE_DEFAULT } from "../app/lib/nativeTokens";
import { resolvePropertyEntry, themeLayers } from "../app/lib/properties";
import { updateThemeValue, type PowerBITheme } from "../app/lib/theme";

/**
 * `label` and `callout` are varied independently so a size that tracks one
 * cannot be confused with a size that tracks the other, and every family and
 * colour is unique to exactly one class.
 */
const fixture = (labelSize: number, calloutSize: number): PowerBITheme => ({
  name: `card-${labelSize}-${calloutSize}`,
  dataColors: ["#00E660"],
  foreground: "#E60000",
  background: "#00E643",
  foregroundNeutralSecondary: "#8600E6",
  textClasses: {
    callout: { fontFace: "Comic Sans MS", fontSize: calloutSize, color: "#0B8E27" },
    header: { fontFace: "Georgia", fontSize: 17, color: "#0B3C8E" },
    title: { fontFace: "Impact", fontSize: 19, color: "#8E0B16" },
    label: { fontFace: "Courier New", fontSize: labelSize, color: "#628E0B" },
  },
  visualStyles: {},
});

/** The three states actually measured in Desktop. */
const BASE = fixture(13, 23);
const BIG_LABEL = fixture(20, 23);
const BIG_CALLOUT = fixture(13, 40);

const src = (theme: PowerBITheme) => themeLayers(theme, getBaseTheme("classic2026"));
const card = (theme: PowerBITheme) => {
  const s = src(theme);
  return resolveCardStyle(s);
};

// ---------------------------------------------------------------------------
// The big value: the `callout` class in full
// ---------------------------------------------------------------------------

test("the card value takes its family, size and colour from the callout class", () => {
  const c = card(BASE);
  assert.equal(c.labels.fontFamily, "Comic Sans MS", "callout family, not an empty string");
  assert.equal(c.labels.fontSize, 23);
  assert.equal(c.labels.color, "#0B8E27", "the callout class's own colour");
  assert.notEqual(c.labels.fontFamily, "", "the literal it used to fall to");
});

test("the card value size follows callout, and only callout", () => {
  // Two independent moves. Raising `callout` moves it; raising `label`
  // (which also moves `title` in the measured fixture) does not. Either
  // check alone would be satisfied by a constant or by the wrong class.
  assert.equal(card(BASE).labels.fontSize, 23, "callout 23");
  assert.equal(card(BIG_CALLOUT).labels.fontSize, 40, "callout 40");
  assert.equal(card(BIG_LABEL).labels.fontSize, 23, "unmoved when label goes 13 -> 20");
});

test("the card value family and colour are stable across both moves", () => {
  for (const theme of [BASE, BIG_LABEL, BIG_CALLOUT]) {
    const c = card(theme);
    assert.equal(c.labels.fontFamily, "Comic Sans MS");
    assert.equal(c.labels.color, "#0B8E27");
  }
});

// ---------------------------------------------------------------------------
// The category label: largeLightLabel in full
// ---------------------------------------------------------------------------

test("the category label resolves largeLightLabel: label family, label x 1.2, neutral colour", () => {
  const c = card(BASE);
  assert.equal(c.categoryLabels.fontFamily, "Courier New", "label family");
  assert.equal(c.categoryLabels.fontSize, 15.6, "13 x 1.2");
  assert.equal(c.categoryLabels.color, "#8600E6", "foregroundNeutralSecondary");
  // The three literals it used to fall to.
  assert.notEqual(c.categoryLabels.fontFamily, "");
  assert.notEqual(c.categoryLabels.fontSize, 6);
  assert.notEqual(c.categoryLabels.color, "#605E5C");
});

test("the category label size follows label, and only label", () => {
  assert.equal(card(BASE).categoryLabels.fontSize, 15.6, "label 13 x 1.2");
  assert.equal(card(BIG_LABEL).categoryLabels.fontSize, 24, "label 20 x 1.2");
  assert.equal(card(BIG_CALLOUT).categoryLabels.fontSize, 15.6, "unmoved when callout goes 23 -> 40");
});

test("the neutral colour is derived, not read from a declaration", () => {
  // The specific defect. `largeLightLabel` is a secondary class the fixture
  // never declares, so reading its raw colour found nothing and fell to a
  // hard-coded grey. The derivation has to run for the token to arrive.
  const custom: PowerBITheme = { ...BASE, foregroundNeutralSecondary: "#ABCDEF" };
  assert.equal(card(custom).categoryLabels.color, "#ABCDEF", "follows the token");
  assert.equal(card(BASE).categoryLabels.color, "#8600E6");
});

test("the two card text surfaces resolve independently", () => {
  // They share a visual but no channel: different family, different size
  // rule, different colour source. A single role could not express both.
  const c = card(BIG_CALLOUT);
  assert.notEqual(c.labels.fontFamily, c.categoryLabels.fontFamily);
  assert.notEqual(c.labels.fontSize, c.categoryLabels.fontSize);
  assert.notEqual(c.labels.color, c.categoryLabels.color);
});

// ---------------------------------------------------------------------------
// Other measured defaults
// ---------------------------------------------------------------------------

test("source spacing on the value is on natively", () => {
  assert.equal(card(BASE).labels.preserveWhitespace, true);
});

test("value decimal places has no native default", () => {
  // The pane reads "Auto", not a number. The preview still needs a precision
  // to format with, so it resolves to something — but nothing set it, and
  // that difference lives in provenance rather than in the value.
  const entry = resolvePropertyEntry(src(BASE), CARD_PROPERTIES.labels.labelPrecision, 0);
  assert.equal(entry.source, "fallback");
  assert.equal(entry.isSet, false);
  assert.ok(
    PROPERTIES_WITHOUT_NATIVE_DEFAULT.some((row) => row.property === "card.labels.labelPrecision"),
    "recorded with its evidence",
  );

  // And an explicit value still reads as configured.
  const set = updateThemeValue(BASE, ["visualStyles", "card", "*", "labels", 0, "labelPrecision"], 3);
  const setEntry = resolvePropertyEntry(src(set), CARD_PROPERTIES.labels.labelPrecision, 0);
  assert.equal(setEntry.isSet, true);
  assert.equal(setEntry.value, 3);
});

test("wordWrap keeps its own theme object, and an explicit value wins", () => {
  // Settled by writing this exact path in Desktop and watching the pane's
  // Text wrap control flip to Off. The pane groups the control under the
  // labels card for display, but the theme object really is `wordWrap` —
  // which is why the pane's own ids cannot be trusted as theme paths.
  assert.deepEqual(CARD_PROPERTIES.wordWrap.show.path, ["wordWrap", 0, "show"]);
  assert.equal(card(BASE).wordWrap.show, true, "on natively");

  const off = updateThemeValue(BASE, ["visualStyles", "card", "*", "wordWrap", 0, "show"], false);
  assert.equal(card(off).wordWrap.show, false);
});

test("the category label has no source-spacing property", () => {
  // A fully expanded native Category label card offers only font, size,
  // B/I/U and colour. Modelling a property Power BI does not have would
  // export a value nothing reads.
  assert.equal("preserveWhitespace" in CARD_PROPERTIES.categoryLabels, false);
  assert.equal("preserveWhitespace" in (card(BASE).categoryLabels as object), false);
  // The value surface does have one, so this is a real asymmetry rather than
  // the property having been dropped everywhere.
  assert.ok("preserveWhitespace" in CARD_PROPERTIES.labels);
});

// ---------------------------------------------------------------------------
// Precedence
// ---------------------------------------------------------------------------

test("explicit visualStyles values beat every text-class fallback", () => {
  const custom: PowerBITheme = {
    ...BASE,
    visualStyles: {
      card: {
        "*": {
          labels: [{ fontSize: 71, fontFamily: "Arial" }],
          categoryLabels: [{ fontSize: 37, color: { solid: { color: "#ABCDEF" } } }],
        },
      },
    },
  };
  const c = card(custom);
  assert.equal(c.labels.fontSize, 71, "over the callout class");
  assert.equal(c.labels.fontFamily, "Arial");
  assert.equal(c.categoryLabels.fontSize, 37, "over label x 1.2");
  assert.equal(c.categoryLabels.color, "#ABCDEF", "over the neutral token");
  // Its untouched neighbour still derives.
  assert.equal(c.categoryLabels.fontFamily, "Courier New");
});

test("resolving the card does not mutate the theme", () => {
  const before = JSON.stringify(BASE);
  card(BASE);
  assert.equal(JSON.stringify(BASE), before);
});
