import assert from "node:assert/strict";
import test from "node:test";
import {
  BAR_CHART_BOX,
  COLUMN_CHART_BOX,
  LINE_CHART_BOX,
  computePreviewCartesianLayout,
} from "../app/components/previews/cartesianLayout";
import type { CartesianLayoutInput } from "../app/components/previews/cartesianLayout";
import {
  authoredChromeExtent,
  authoredInnerBox,
  legendBandExtent,
  visualTitleBandExtent,
  visualTitleStyle,
} from "../app/components/previews/cartesianLayout";
import { legendExtent } from "../app/lib/chartLayout";
import { headingAria } from "../app/lib/headingAria";
import { themeFontSizeToCssPx } from "../app/lib/fontUnits";

/**
 * Authored size versus presentation size.
 *
 * The visual is laid out at the size a Power BI author would have given it,
 * and only the finished result is scaled to fit Theme Studio's UI. These
 * tests pin the first half — that layout is a function of the authored box
 * and of nothing else. The second half is a DOM property and is verified in
 * the browser: the same authored geometry is measured at presentation scales
 * of 1.2333 and 0.3778.
 */

const measure = (text: string, fontSize: number) => ({
  width: text.length * fontSize * 0.5,
  height: fontSize * 1.35,
});

const axis = {
  show: true,
  fontSize: 9,
  fontFamily: "Segoe UI",
  fontFamilyCss: "Segoe UI",
  showAxisTitle: true,
  titleText: "Category",
  titleFontSize: 12,
  titleFontFamily: "DIN",
  titleFontFamilyCss: "DIN",
};

const inputFor = (over: Partial<CartesianLayoutInput> = {}): CartesianLayoutInput => ({
  box: BAR_CHART_BOX,
  orientation: "horizontal",
  categoryAxis: { ...axis },
  valueAxis: { ...axis, titleText: "Applications" },
  categories: ["London", "North West", "Scotland", "Wales"],
  dataMax: 50,
  innerPadding: 20,
  measureText: (text: string, fontSize: number) => ({
    width: text.length * fontSize * 0.5,
    height: fontSize * 1.35,
  }),
  ...over,
});

test("the bar chart's authored size is 450 x 250", () => {
  // 372 x 128 asked this renderer to keep furniture Power BI itself sheds at
  // that size: native Classic 2026 draws six bars, two categories, no legend
  // and no value labels there, and everything at 450 x 250.
  assert.deepEqual(BAR_CHART_BOX, { x: 0, y: 0, width: 450, height: 250 });
});

test("clustered and stacked bar author at the same size", () => {
  // They share the horizontal category path, so a difference between them
  // would be an accident rather than a decision. Both import this one box.
  const clustered = computePreviewCartesianLayout(inputFor());
  const stacked = computePreviewCartesianLayout(inputFor());
  assert.deepEqual(clustered.plot, stacked.plot);
  assert.deepEqual(clustered.categoryAxis, stacked.categoryAxis);
});

test("the legend band comes out of the authored visual before the chart is laid out", () => {
  // The boundary error this fixes: 450 x 250 was applied to the inner chart
  // box while the legend was drawn outside it, so the finished visual
  // measured 450 x 317 and was being compared with a native 450 x 250.
  const legend = { show: true, position: "Top", fontSize: 9, fontFamily: "Segoe UI", showTitle: false, titleText: "" };
  const band = legendBandExtent(legend as never, ["Online", "Phone", "Post"], measure);
  assert.ok(band.height > 0, "a top legend costs height");
  assert.equal(band.width, 0, "and no width");

  const inner = authoredInnerBox(BAR_CHART_BOX, band);
  assert.equal(inner.width, BAR_CHART_BOX.width);
  assert.equal(inner.height, BAR_CHART_BOX.height - band.height);

  // Complete visual = legend band + inner chart box, exactly.
  assert.equal(band.height + inner.height, BAR_CHART_BOX.height);
});

test("a hidden legend costs nothing, and a side legend costs width not height", () => {
  const hidden = { show: false, position: "Top", fontSize: 9, fontFamily: "Segoe UI", showTitle: false, titleText: "" };
  assert.deepEqual(legendBandExtent(hidden as never, ["Online"], measure), { width: 0, height: 0 });
  const side = { show: true, position: "Right", fontSize: 9, fontFamily: "Segoe UI", showTitle: false, titleText: "" };
  const band = legendBandExtent(side as never, ["Online", "Phone", "Post"], measure);
  assert.ok(band.width > 0 && band.height === 0, "a side legend takes width");
  assert.equal(authoredInnerBox(BAR_CHART_BOX, band).height, BAR_CHART_BOX.height, "and leaves the height alone");
});

test("the layout is computed against the inner box, and accounts for all of it", () => {
  const layout = computePreviewCartesianLayout(inputFor());
  const gutter = layout.categoryAxis?.width ?? 0;
  const valueGutter = layout.valueAxis?.height ?? 0;
  assert.ok(gutter > 0 && layout.plot.width > 0);
  // Width: category gutter plus plot accounts for the authored width.
  assert.ok(
    Math.abs(gutter + layout.plot.width - BAR_CHART_BOX.width) < 0.001,
    `gutter ${gutter} + plot ${layout.plot.width} should be ${BAR_CHART_BOX.width}`,
  );
  // Height: the value axis runs along the bottom of a horizontal chart.
  assert.ok(
    Math.abs(valueGutter + layout.plot.height - BAR_CHART_BOX.height) < 0.001,
    `value gutter ${valueGutter} + plot ${layout.plot.height} should be ${BAR_CHART_BOX.height}`,
  );
});

test("nothing about the display size can reach the layout", () => {
  // There is no display-size input to pass, which is the structural half of
  // the guarantee: presentation scale is applied to the rendered result by
  // PresentationScale, and cannot travel back the other way.
  const first = computePreviewCartesianLayout(inputFor());
  const second = computePreviewCartesianLayout(inputFor());
  assert.deepEqual(first.plot, second.plot);
  assert.deepEqual(first.categoryAxis, second.categoryAxis);
  assert.deepEqual(first.valueAxis, second.valueAxis);
  assert.equal(first.scale.category(1, 4).start, second.scale.category(1, 4).start);
  assert.equal(first.scale.categoryWidth(4), second.scale.categoryWidth(4));
});

test("a bigger authored box gives its extra space to the plot, not to the gutter", () => {
  // The gutter is text-driven, so growing the visual must not grow it — that
  // is exactly why authoring larger fixes the cramped composition instead of
  // making it worse.
  const small = computePreviewCartesianLayout(inputFor({ box: { x: 0, y: 0, width: 372, height: 128 } }));
  const authored = computePreviewCartesianLayout(inputFor());
  assert.equal(authored.categoryAxis!.width, small.categoryAxis!.width, "same labels, same gutter");
  assert.ok(authored.plot.width > small.plot.width, "the extra width is the plot's");
  assert.ok(authored.plot.height > small.plot.height, "and so is the extra height");
  // Which is the point of the pilot, as a proportion.
  const before = small.categoryAxis!.width / 372;
  const after = authored.categoryAxis!.width / 450;
  assert.ok(after < before, `gutter share should fall: ${before} -> ${after}`);
});

test("the Column family shares the proven 450 x 300 authored box", () => {
  assert.deepEqual(COLUMN_CHART_BOX, { x: 0, y: 0, width: 450, height: 300 });
  assert.deepEqual(LINE_CHART_BOX, { x: 0, y: 0, width: 372, height: 150 });
});

test("the category scale still derives from ChartLayout at the authored size", () => {
  const layout = computePreviewCartesianLayout(inputFor());
  const step = layout.scale.category(1, 4).start - layout.scale.category(0, 4).start;
  const extent = layout.plot.height;
  // The rules from the earlier tasks, unchanged: outer padding 0.4 a step
  // each end, and categoryWidth from a thickness with no inner padding.
  assert.ok(Math.abs(extent / step - (4 - 0.2 + 0.8)) < 1e-9, "plot / step");
  assert.ok(Math.abs(layout.scale.category(0, 4).start - layout.plot.y - 0.4 * step) < 1e-9, "leading inset");
  const thickness = extent / (4 + 0.8);
  assert.ok(Math.abs(layout.scale.categoryWidth(4) - thickness * 0.8) < 1e-9, "categoryWidth");
});

test("the renderer's legend band IS the engine's legend arithmetic", () => {
  // Not "they agree today" — the adapter delegates, so there is no second
  // implementation to drift. All it adds is the point-to-pixel conversion.
  const legend = {
    show: true,
    position: "Top",
    fontSize: 9,
    fontFamily: "Segoe UI",
    showTitle: true,
    titleText: "Series",
  };
  const viaRenderer = legendBandExtent(legend as never, ["Online", "Phone", "Post"], measure);
  const viaEngine = legendExtent(
    { ...legend, fontSize: themeFontSizeToCssPx(legend.fontSize) } as never,
    ["Online", "Phone", "Post"],
    measure,
  );
  assert.equal(viaRenderer.width, viaEngine.width);
  assert.equal(viaRenderer.height, viaEngine.height);

  // And the engine reserves that same band off the correct edge.
  assert.equal(viaEngine.vertical, false, "a Top legend is horizontal");
  assert.equal(viaEngine.afterPlot, false, "and sits before the plot");
});

// ---------------------------------------------------------------------------
// The Power BI visual title, inside the authored boundary
// ---------------------------------------------------------------------------

const titleOf = (over: Record<string, unknown> = {}) => ({
  show: true,
  text: "Applications by region",
  fontSize: 12,
  fontFamily: "Segoe UI",
  ...over,
});

test("a shown visual title takes a band out of the authored budget", () => {
  // Native Classic 2026 at 450 x 250 spends 35px on its title band for a 16px
  // title. This is the same money coming out of the same pocket.
  const band = visualTitleBandExtent(titleOf() as never, "fallback", 0, measure);
  assert.ok(band.height > 0, "a title costs height");
  assert.equal(band.width, 0, "and no width");

  const inner = authoredInnerBox(BAR_CHART_BOX, band);
  assert.equal(inner.height, BAR_CHART_BOX.height - band.height);
  assert.equal(band.height + inner.height, BAR_CHART_BOX.height, "the visual is still 250 tall");
});

test("a hidden title costs exactly zero", () => {
  assert.deepEqual(
    visualTitleBandExtent(titleOf({ show: false }) as never, "fallback", 0, measure),
    { width: 0, height: 0, textHeight: 0, spaceBelow: 0 },
  );
  const inner = authoredInnerBox(BAR_CHART_BOX, { width: 0, height: 0 });
  assert.equal(inner.height, BAR_CHART_BOX.height, "and the chart gets the whole budget");
});

test("an empty title falls back to the visual's default name, and still costs a band", () => {
  const explicit = visualTitleBandExtent(titleOf({ text: "" }) as never, "Applications by region", 0, measure);
  const named = visualTitleBandExtent(titleOf() as never, "ignored", 0, measure);
  assert.equal(explicit.height, named.height, "same text, same band");
});

test("a bigger title font takes a bigger band, and the chart pays for it", () => {
  const small = visualTitleBandExtent(titleOf({ fontSize: 9 }) as never, "", 0, measure);
  const large = visualTitleBandExtent(titleOf({ fontSize: 20 }) as never, "", 0, measure);
  assert.ok(large.height > small.height, "the band follows the font");
  assert.ok(
    authoredInnerBox(BAR_CHART_BOX, large).height < authoredInnerBox(BAR_CHART_BOX, small).height,
    "and the inner budget shrinks by the difference",
  );
  // Text length must not matter to the height, only the font does.
  const longer = visualTitleBandExtent(
    titleOf({ fontSize: 20, text: "A considerably longer visual title than the other one" }) as never,
    "",
    0,
    measure,
  );
  assert.equal(longer.height, large.height);
});

test("title and legend bands compose into one chrome extent", () => {
  const title = visualTitleBandExtent(titleOf() as never, "", 0, measure);
  const legend = legendBandExtent(
    { show: true, position: "Top", fontSize: 9, fontFamily: "Segoe UI", showTitle: false, titleText: "" } as never,
    ["Online", "Phone", "Post"],
    measure,
  );
  const both = authoredChromeExtent([title, legend]);
  assert.equal(both.height, title.height + legend.height);
  assert.equal(both.width, 0);
  assert.equal(
    authoredInnerBox(BAR_CHART_BOX, both).height,
    BAR_CHART_BOX.height - title.height - legend.height,
    "the chart is laid out in what is left after BOTH bands",
  );
});

test("the rendered title band IS the reserved band", () => {
  // Not two numbers that agree — the style helper is handed the band that was
  // subtracted, so a rendered title cannot be a different height from the
  // space made for it.
  const band = visualTitleBandExtent(titleOf() as never, "", 0, measure);
  const style = visualTitleStyle(titleOf() as never, band);
  assert.equal(style.height, band.height);
});

// ---------------------------------------------------------------------------
// Title behaviour that must survive the move out of the tile
// ---------------------------------------------------------------------------

test("space below the title is paid for out of the authored budget", () => {
  // It is space the visual cannot draw in, so it comes from the same 250.
  const without = visualTitleBandExtent(titleOf() as never, "", 0, measure);
  const withGap = visualTitleBandExtent(titleOf() as never, "", 12, measure);
  assert.equal(withGap.height, without.height + 12, "the band grows by the gap");
  assert.equal(withGap.textHeight, without.textHeight, "the title itself is unchanged");
  assert.equal(withGap.spaceBelow, 12);
  assert.equal(
    authoredInnerBox(BAR_CHART_BOX, withGap).height,
    authoredInnerBox(BAR_CHART_BOX, without).height - 12,
    "and the chart loses exactly that",
  );
});

test("the rendered title and its gap are the two halves that were reserved", () => {
  const band = visualTitleBandExtent(titleOf() as never, "", 12, measure);
  const style = visualTitleStyle(titleOf() as never, band);
  assert.equal(style.height, band.textHeight, "the element is the text band");
  assert.equal(style.marginBottom, band.spaceBelow, "the margin is the gap");
  assert.equal(
    Number(style.height) + Number(style.marginBottom),
    band.height,
    "together they are exactly what came out of the budget",
  );
});

test("titleWrap is preserved, and cannot spill outside its band", () => {
  const wrapped = visualTitleStyle(titleOf({ titleWrap: true }) as never, { textHeight: 36, spaceBelow: 0 });
  assert.equal(wrapped.whiteSpace, "normal");
  assert.equal(wrapped.textOverflow, "clip");
  const clipped = visualTitleStyle(titleOf({ titleWrap: false }) as never, { textHeight: 36, spaceBelow: 0 });
  assert.equal(clipped.whiteSpace, "nowrap");
  assert.equal(clipped.textOverflow, "ellipsis");
  // Known limitation, deliberate: the band is reserved for one line either
  // way, so overflow must contain a wrapped title rather than let it push
  // into the plot.
  assert.equal(wrapped.overflow, "hidden");
  assert.equal(clipped.overflow, "hidden");
});

test("the heading level travels with the title", () => {
  // Accessibility semantics belong to the title, not to where it is painted.
  assert.deepEqual(headingAria("Heading3"), { role: "heading", "aria-level": 3 });
  assert.deepEqual(headingAria("Heading6"), { role: "heading", "aria-level": 6 });
  assert.deepEqual(headingAria("Off"), {});
  assert.deepEqual(headingAria(""), {});
});

test("every styling field the tile honoured is still honoured", () => {
  const style = visualTitleStyle(
    titleOf({
      fontColor: "#112233",
      background: "#eeeeee",
      alignment: "center",
      bold: true,
      italic: true,
      underline: true,
    }) as never,
    { textHeight: 36, spaceBelow: 0 },
  );
  assert.equal(style.color, "#112233");
  assert.equal(style.backgroundColor, "#eeeeee");
  assert.equal(style.textAlign, "center");
  assert.equal(style.fontWeight, 700);
  assert.equal(style.fontStyle, "italic");
  assert.equal(style.textDecoration, "underline");
  assert.equal(style.fontFamily, "Segoe UI");
});
