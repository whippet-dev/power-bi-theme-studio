import assert from "node:assert/strict";
import test from "node:test";
import {
  formatValue,
  labelIsInside,
  labelVisibleAt,
  legendHorizontalAlignment,
  legendIsAfterPlot,
  legendIsCentered,
  legendIsVertical,
  mapLineStyle,
} from "../app/components/ChartParts";

test("formatValue abbreviates by display unit and honours precision", () => {
  assert.equal(formatValue(82_000, "1000", 0), "82K");
  assert.equal(formatValue(82_000, "1000", 2), "82.00K");
  assert.equal(formatValue(8_400_000, "1000000", 1), "8.4M");
  // "None" must not abbreviate, even for a large number.
  assert.equal(formatValue(82_000, "1", 0), "82,000");
});

test("formatValue picks a sensible unit when none is specified", () => {
  assert.equal(formatValue(500, undefined, 0), "500");
  assert.ok(formatValue(82_000, undefined, 0).endsWith("K"));
});

test("legend position maps to placement, covering all four sides", () => {
  assert.equal(legendIsVertical("Left"), true);
  assert.equal(legendIsVertical("RightCenter"), true);
  assert.equal(legendIsVertical("Top"), false);
  assert.equal(legendIsVertical("BottomCenter"), false);

  // "After the plot" means bottom or right.
  assert.equal(legendIsAfterPlot("Bottom"), true);
  assert.equal(legendIsAfterPlot("Right"), true);
  assert.equal(legendIsAfterPlot("Top"), false);
  assert.equal(legendIsAfterPlot("Left"), false);
});

test("legend alignment preserves every reviewed Power BI position", () => {
  assert.equal(legendHorizontalAlignment("Top"), "flex-start");
  assert.equal(legendHorizontalAlignment("TopCenter"), "center");
  assert.equal(legendHorizontalAlignment("TopRight"), "flex-end");
  assert.equal(legendHorizontalAlignment("Bottom"), "flex-start");
  assert.equal(legendHorizontalAlignment("BottomCenter"), "center");
  assert.equal(legendHorizontalAlignment("BottomRight"), "flex-end");

  assert.equal(legendIsCentered("LeftCenter"), true, "side legends centre vertically only when requested");
  assert.equal(legendIsCentered("RightCenter"), true);
  assert.equal(legendIsCentered("Left"), false, "stacked top-left remains top-aligned");
  assert.equal(legendIsCentered("Right"), false, "stacked top-right remains top-aligned");
});

test("label density thins labels out between none and all", () => {
  // 100 shows every label, 0 shows none.
  assert.ok([0, 1, 2, 3].every((i) => labelVisibleAt(i, 4, 100)));
  assert.ok([0, 1, 2, 3].every((i) => !labelVisibleAt(i, 4, 0)));

  // Something in between shows some but not all.
  const shown = [0, 1, 2, 3].filter((i) => labelVisibleAt(i, 4, 50));
  assert.ok(shown.length > 0 && shown.length < 4, `expected a subset, got ${shown.length}`);
});

test("labelIsInside distinguishes Power BI's inside positions from outside", () => {
  assert.equal(labelIsInside("InsideEnd"), true);
  assert.equal(labelIsInside("InsideCenter"), true);
  assert.equal(labelIsInside("InsideBase"), true);
  assert.equal(labelIsInside("OutsideEnd"), false);
});

test("mapLineStyle collapses the schema's style names onto CSS border styles", () => {
  assert.equal(mapLineStyle("dashed"), "dashed");
  assert.equal(mapLineStyle("dotted"), "dotted");
  assert.equal(mapLineStyle("solid"), "solid");
  // "custom" means a user dash array is in play — dashed is the closest read.
  assert.equal(mapLineStyle("custom"), "dashed");
  assert.equal(mapLineStyle("anything-else"), "solid");
});
