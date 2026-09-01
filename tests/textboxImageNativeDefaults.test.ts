/**
 * Text Box and Image native defaults, against the fingerprint-sweep evidence.
 *
 * These two visuals were swept in one session against the same Desktop base
 * (Classic 2026), which is what makes them useful together: they disagree in
 * exactly the way the layering model predicts. A Text Box's padding reads 5
 * on every edge and its background reads On; an Image's padding reads 0 and
 * its background reads Off. The difference is not in the visuals -- it is
 * that Classic 2026's `image` entry sets both properties and its `textbox`
 * entry sets neither. Same session, same base, opposite results, each
 * matching whether that visual's base entry speaks.
 *
 * The Image was measured with no source set, across all four of its
 * interaction states, which are byte-identical.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolveChromeStyle } from "../app/lib/chromeProperties";
import { resolveImageStyle } from "../app/lib/imageProperties";
import { themeLayers } from "../app/lib/properties";
import { CHROME_PROPERTIES } from "../app/lib/chromeProperties";
import { resolveTextboxStyle } from "../app/lib/textboxProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

/** `label` is the only class either visual reads, so it is the one that moves. */
const fixture = (labelSize: number): PowerBITheme => ({
  name: `textbox-image-${labelSize}`,
  dataColors: ["#00E660"],
  foreground: "#E60000",
  background: "#00E643",
  textClasses: {
    label: { fontFace: "Courier New", fontSize: labelSize, color: "#628E0B" },
    title: { fontFace: "Impact", fontSize: 19, color: "#8E0B16" },
  },
  visualStyles: {},
});

const BASE = fixture(13);
const BIG_LABEL = fixture(20);

/**
 * All three supported bases. Classic 2018 matters most here: it has no
 * `textbox` or `image` entry at all, so it is the base under which capability
 * fallbacks are what a user actually gets.
 */
type BaseId = "classic2026" | "classic2018" | "fluent2";
const ALL_BASES: readonly BaseId[] = ["classic2026", "classic2018", "fluent2"];
const src = (theme: PowerBITheme = BASE, baseId: BaseId = "classic2026") =>
  themeLayers(theme, getBaseTheme(baseId));
const textbox = (theme: PowerBITheme = BASE, baseId: BaseId = "classic2026") =>
  resolveTextboxStyle(src(theme, baseId));
const image = (theme: PowerBITheme = BASE, baseId: BaseId = "classic2026") =>
  resolveImageStyle(src(theme, baseId), resolveTheme(theme));
const chrome = (visual: "textbox" | "image", theme: PowerBITheme = BASE, baseId: BaseId = "classic2026") =>
  resolveChromeStyle(src(theme, baseId), visual, resolveTheme(theme));

// ---------------------------------------------------------------------------
// Text Box
// ---------------------------------------------------------------------------

test("a text box's text is the label class in full", () => {
  const t = textbox();
  assert.equal(t.text.fontFamily, "Courier New", "label family");
  assert.equal(t.text.fontSize, 13, "label x 1");
  assert.equal(t.text.color, "#628E0B", "the label class colour");
  // The two literals it used to fall to.
  assert.notEqual(t.text.color, "#E60000", "not the `foreground` token");
  assert.notEqual(t.text.fontSize, 12, "not a hard-coded 12");
});

test("the text box size follows the label class across two theme points", () => {
  // One point cannot separate "derived" from "coincidentally equal"; two can.
  assert.equal(textbox(BASE).text.fontSize, 13);
  assert.equal(textbox(BIG_LABEL).text.fontSize, 20);
});

test("a text box's keepLayerOrder round-trips through the shared chrome property", () => {
  // The sweep VERIFIED an existing property; it did not find a missing one.
  // `general[0].keepLayerOrder` was already modelled once, on the shared
  // chrome registry, and the chrome groups are already offered against the
  // active visual's own schema key -- so a Text Box could always read, edit
  // and export it. What the sweep adds is confirmation that the path is real
  // rather than a Format-pane artefact.
  assert.deepEqual(CHROME_PROPERTIES.general.keepLayerOrder.path, ["general", 0, "keepLayerOrder"]);

  // Measured On, but that On comes from the base theme -- Classic 2026's
  // `textbox` entry sets it true. Text Box's OWN capability fallback was
  // never independently observed, so nothing here asserts one; the shared
  // resolver's pre-existing `false` stands untouched.
  assert.equal(chrome("textbox").general.keepLayerOrder, true, "supplied by the Classic 2026 base");

  const off = updateThemeValue(BASE, ["visualStyles", "textbox", "*", "general", 0, "keepLayerOrder"], false);
  assert.equal(chrome("textbox", off).general.keepLayerOrder, false, "an explicit override wins");
});

test("a text box hides its visual title by default", () => {
  assert.equal(chrome("textbox").title.show, false);
});

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

test("an image starts on Upload image, not Enter URL", () => {
  assert.equal(image().image.sourceType, "image");
  assert.notEqual(image().image.sourceType, "imageUrl");
});

test("the image border colour is the foreground token, not a hard-coded grey", () => {
  assert.equal(image().image.strokeColor, "#E60000", "the fixture's `foreground`");
  assert.notEqual(image().image.strokeColor, "#E3E3E3");

  // Derived, so it moves with the token rather than staying put.
  const other: PowerBITheme = { ...BASE, foreground: "#ABCDEF" };
  assert.equal(image(other).image.strokeColor, "#ABCDEF");
});

test("an image hides its visual title by default", () => {
  assert.equal(chrome("image").title.show, false);
});

// ---------------------------------------------------------------------------
// The layering proof: custom > base theme > capability
// ---------------------------------------------------------------------------

test("a capability default shows through only where the base theme is silent", () => {
  // The whole point of the pair. Under the base the sweep actually used,
  // Classic 2026: `textbox` carries no padding, so the capability 5 arrives;
  // `image` carries padding 0, so the base value arrives. If capability
  // defaults were applied over the base -- or if the two visuals shared one
  // fallback -- these two lines could not both hold.
  const tb = chrome("textbox").padding;
  const im = chrome("image").padding;
  assert.deepEqual([tb.top, tb.right, tb.bottom, tb.left], [5, 5, 5, 5], "capability, base silent");
  assert.deepEqual([im.top, im.right, im.bottom, im.left], [0, 0, 0, 0], "base theme, capability unobserved");
});

test("Classic 2018 sets nothing for either visual, so both fall to capability", () => {
  // The base with no `textbox` or `image` entry at all. The text box's
  // padding capability of 5 shows through, as it does under Classic 2026.
  // The image's padding falls to the shared 0 -- which is the pre-existing
  // fallback, NOT a measurement: its capability padding stays unobserved
  // because every base that was measured supplied a value for it.
  const tb = chrome("textbox", BASE, "classic2018").padding;
  assert.deepEqual([tb.top, tb.right, tb.bottom, tb.left], [5, 5, 5, 5], "capability");
  assert.equal(chrome("image", BASE, "classic2018").padding.top, 0, "shared fallback, not evidence");
});

test("a different base theme overrides the same capability default", () => {
  // Fluent 2 *does* set the text box's padding to 0. Same visual, same
  // capability default of 5, different answer -- so 5 is genuinely a bottom
  // layer rather than a literal baked into the text box.
  const fluent = chrome("textbox", BASE, "fluent2").padding;
  assert.deepEqual([fluent.top, fluent.right, fluent.bottom, fluent.left], [0, 0, 0, 0]);
});

test("a custom theme value beats both the base theme and the capability default", () => {
  const custom = updateThemeValue(BASE, ["visualStyles", "textbox", "*", "padding", 0, "top"], 17);
  assert.equal(chrome("textbox", custom).padding.top, 17, "over the capability 5");
  assert.equal(chrome("textbox", custom, "fluent2").padding.top, 17, "over Fluent 2's explicit 0");
});

test("the image's capability padding is deliberately not recorded", () => {
  // Both bundled base themes set it, so the Image's own capability padding
  // was never observed. Recording a 0 that only ever came from a base theme
  // would be an inference presented as a measurement.
  assert.equal(chrome("image").padding.top, 0);
  assert.equal(chrome("image", BASE, "fluent2").padding.top, 0);
});

test("a text box's background is On from the capability wherever the base is silent", () => {
  // Direct evidence, not inference: Classic 2026 sets nothing for the text
  // box's background and Desktop showed it On. Classic 2018 has no `textbox`
  // entry at all, so under that base the capability value is simply what the
  // user gets -- which is why the shared `!isCanvasObject` fallback was a
  // real defect rather than a latent one.
  assert.equal(chrome("textbox", BASE, "classic2018").background.show, true, "capability, base silent");
  assert.equal(chrome("textbox", BASE, "classic2026").background.show, true, "still the measured value");
});

test("a base theme that sets the text box background still beats the capability", () => {
  // Fluent 2's `textbox` entry carries background.show false.
  assert.equal(chrome("textbox", BASE, "fluent2").background.show, false);
});

test("an explicit custom background beats both the base theme and the capability", () => {
  const on = updateThemeValue(BASE, ["visualStyles", "textbox", "*", "background", 0, "show"], true);
  const off = updateThemeValue(BASE, ["visualStyles", "textbox", "*", "background", 0, "show"], false);
  assert.equal(chrome("textbox", on, "fluent2").background.show, true, "over Fluent 2's false");
  assert.equal(chrome("textbox", off, "classic2018").background.show, false, "over the capability true");
});

test("the image background is untouched, and no capability claim is made for it", () => {
  // Both measured bases supply the Image's Off themselves, so its own
  // capability background has never been observed. Under Classic 2018, which
  // supplies nothing, the pre-existing `!isCanvasObject` fallback still
  // answers -- deliberately unchanged rather than "corrected" on evidence
  // that does not exist.
  for (const baseId of ALL_BASES) {
    assert.equal(chrome("image", BASE, baseId).background.show, false, `image background under ${baseId}`);
  }
});

test("the image's other defaults hold under all three bases", () => {
  for (const baseId of ALL_BASES) {
    assert.equal(image(BASE, baseId).image.sourceType, "image", `sourceType under ${baseId}`);
    assert.equal(image(BASE, baseId).image.strokeColor, "#E60000", `strokeColor under ${baseId}`);
    assert.equal(chrome("image", BASE, baseId).title.show, false, `title under ${baseId}`);
  }
});

test("a text box's text and title hold under all three bases", () => {
  for (const baseId of ALL_BASES) {
    assert.equal(textbox(BASE, baseId).text.fontSize, 13, `label x 1 under ${baseId}`);
    assert.equal(textbox(BASE, baseId).text.color, "#628E0B", `label colour under ${baseId}`);
    assert.equal(chrome("textbox", BASE, baseId).title.show, false, `title under ${baseId}`);
  }
});

test("resolving neither visual mutates the theme", () => {
  const before = JSON.stringify(BASE);
  textbox();
  image();
  chrome("textbox");
  chrome("image");
  assert.equal(JSON.stringify(BASE), before);
});
