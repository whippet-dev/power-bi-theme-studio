import assert from "node:assert/strict";
import test from "node:test";
import { areaPath, linePath, markerShape, type Point } from "../app/lib/lineGeometry";

const POINTS: Point[] = [
  { x: 0, y: 58 },
  { x: 25, y: 42 },
  { x: 50, y: 70 },
  { x: 75, y: 32 },
  { x: 100, y: 52 },
];

test("linear interpolation draws straight segments through every point", () => {
  const d = linePath(POINTS, { smooth: false, step: false });
  assert.ok(d.startsWith("M 0 58"), d);
  // One line command per point after the first, and no curves.
  assert.equal((d.match(/ L /g) ?? []).length, POINTS.length - 1);
  assert.ok(!d.includes("C "), "linear interpolation must not emit béziers");
});

test("smooth interpolation emits curves rather than straight segments", () => {
  const smooth = linePath(POINTS, { smooth: true, step: false });
  assert.ok(smooth.includes("C "), "smooth interpolation must emit béziers");
  assert.notEqual(smooth, linePath(POINTS, { smooth: false, step: false }));
});

test("step interpolation produces a staircase, and its alignment moves where the step happens", () => {
  const after = linePath(POINTS, { smooth: false, step: true, stepAlignment: "after" });
  const center = linePath(POINTS, { smooth: false, step: true, stepAlignment: "center" });
  const before = linePath(POINTS, { smooth: false, step: true, stepAlignment: "start" });

  // A staircase needs more segments than a plain line.
  assert.ok((after.match(/ L /g) ?? []).length > POINTS.length - 1);
  assert.notEqual(after, center, "step alignment must change the path");
  assert.notEqual(after, before, "step alignment must change the path");
  assert.ok(!after.includes("C "), "stepped lines are not curved");
});

test("step wins over smooth when both are set, since a stepped line can't also be curved", () => {
  const both = linePath(POINTS, { smooth: true, step: true });
  assert.ok(!both.includes("C "));
});

test("areaPath closes the line down to the baseline so it can be filled", () => {
  const d = linePath(POINTS, { smooth: false, step: false });
  const area = areaPath(POINTS, d);
  assert.ok(area.startsWith(d), "the area must follow the same line");
  assert.ok(area.endsWith("Z"), "the area must be a closed path");
  assert.ok(area.includes("L 100 100"), "the area must drop to the baseline");
});

test("an empty series produces no path rather than malformed SVG", () => {
  assert.equal(linePath([], { smooth: false, step: false }), "");
  assert.equal(areaPath([], ""), "");
});

test("each marker shape renders distinctly rather than always a circle", () => {
  const shapes = ["circle", "square", "diamond", "triangle"].map((s) => markerShape(s, 8));
  const encoded = shapes.map((s) => JSON.stringify(s));
  assert.equal(new Set(encoded).size, shapes.length, `marker shapes must differ: ${encoded.join(" ")}`);
  assert.equal(markerShape("circle", 8).kind, "circle");
  assert.equal(markerShape("triangle", 8).kind, "polygon");
  // A diamond is a rotated square — same kind, different rotation.
  const square = markerShape("square", 8);
  const diamond = markerShape("diamond", 8);
  assert.ok(square.kind === "rect" && diamond.kind === "rect");
  assert.notEqual(square.rotate, diamond.rotate);
});

test("an unknown marker shape falls back to a circle instead of rendering nothing", () => {
  assert.equal(markerShape("something-unrecognised", 8).kind, "circle");
});
