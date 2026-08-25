import assert from "node:assert/strict";
import test from "node:test";
import {
  BAR_CHART_BOX,
  COLUMN_CHART_BOX,
  LINE_CHART_BOX,
  computePreviewCartesianLayout,
} from "../app/components/previews/cartesianLayout";
import type { CartesianLayoutInput } from "../app/components/previews/cartesianLayout";
import { authoredInnerBox, legendBandExtent } from "../app/components/previews/cartesianLayout";

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

test("the vertical cartesian families are untouched by this pilot", () => {
  assert.deepEqual(COLUMN_CHART_BOX, { x: 0, y: 0, width: 372, height: 128 });
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
