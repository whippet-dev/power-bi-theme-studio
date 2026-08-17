import assert from "node:assert/strict";
import test from "node:test";
import { axisTicks, formatValue, labelIsInside, labelVisibleAt, legendIsAfterPlot, legendIsVertical, mapLineStyle } from "../app/components/ChartParts";

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

test("axisTicks spans 0..dataMax unless the axis pins a range", () => {
  const base = {
    show: true,
    gridlineShow: false,
    gridlineColor: "#000",
    gridlineThickness: 1,
    gridlineStyle: "solid",
  } as Parameters<typeof axisTicks>[0];

  const auto = axisTicks(base, 100, 4);
  assert.deepEqual(auto, [0, 25, 50, 75, 100]);

  // Start/end arrive as strings from the schema and must still be honoured.
  const pinned = axisTicks({ ...base, start: "20", end: "60" }, 100, 4);
  assert.deepEqual(pinned, [20, 30, 40, 50, 60]);

  // A blank or nonsensical range falls back rather than producing NaN.
  const blank = axisTicks({ ...base, start: "", end: "" }, 80, 4);
  assert.deepEqual(blank, [0, 20, 40, 60, 80]);
  const inverted = axisTicks({ ...base, start: "50", end: "10" }, 90, 2);
  assert.ok(inverted.every((t) => Number.isFinite(t)));
});

test("an inverted axis reverses its ticks", () => {
  const base = {
    show: true,
    invertAxis: true,
    gridlineShow: false,
    gridlineColor: "#000",
    gridlineThickness: 1,
    gridlineStyle: "solid",
  } as Parameters<typeof axisTicks>[0];
  assert.deepEqual(axisTicks(base, 100, 4), [100, 75, 50, 25, 0]);
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
