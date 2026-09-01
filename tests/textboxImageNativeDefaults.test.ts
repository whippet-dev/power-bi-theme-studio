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
import { TEXTBOX_PROPERTIES, resolveTextboxStyle } from "../app/lib/textboxProperties";
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

type BaseId = "classic2026" | "fluent2";
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

test("keepLayerOrder is modelled at its measured theme path", () => {
  // Boolean, under the `general` object, shown as "Keep layer order" in the
  // Text Box's Advanced options. It reads On natively, but that On comes from
  // the base theme rather than from the capability: Classic 2026's `textbox`
  // entry sets it true, and a Bookmark Navigator -- whose base entry is
  // silent -- measures Off, which is what fixes the capability default at
  // false. So this asserts the resolved value under a real base, not a bare
  // fallback.
  assert.deepEqual(TEXTBOX_PROPERTIES.general.keepLayerOrder.path, ["general", 0, "keepLayerOrder"]);
  assert.equal(TEXTBOX_PROPERTIES.general.keepLayerOrder.valueType, "boolean");
  assert.equal(textbox().general.keepLayerOrder, true);

  const off = updateThemeValue(BASE, ["visualStyles", "textbox", "*", "general", 0, "keepLayerOrder"], false);
  assert.equal(textbox(off).general.keepLayerOrder, false);
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

test("resolving neither visual mutates the theme", () => {
  const before = JSON.stringify(BASE);
  textbox();
  image();
  chrome("textbox");
  chrome("image");
  assert.equal(JSON.stringify(BASE), before);
});
