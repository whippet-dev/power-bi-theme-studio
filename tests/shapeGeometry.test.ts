import assert from "node:assert/strict";
import test from "node:test";
import { shapeGeometry, shapeUsesClipPath } from "../app/lib/shapeGeometry";
import { resolveShapeStyle, SHAPE_PROPERTIES } from "../app/lib/shapeProperties";
import { resolveTheme, type PowerBITheme } from "../app/lib/theme";

const STARTER_THEME: PowerBITheme = {
  name: "Sample theme",
  dataColors: ["#005EA5", "#28A197", "#FFDD00", "#D4351C", "#912B88"],
  background: "#FFFFFF",
  foreground: "#0B0C0C",
  tableAccent: "#005EA5",
  visualStyles: {},
};

/** The shape parameters an unstyled theme actually resolves to. */
const resolvedShapeParams = () => resolveShapeStyle(STARTER_THEME, resolveTheme(STARTER_THEME)).shape;

// The full list of shapes the schema offers, taken from the registry's own
// enum rather than restated here, so a schema update can't leave this
// behind.
const TILE_SHAPES = (SHAPE_PROPERTIES.shape.tileShape.options ?? []).map((option) => String(option.value));

test("every tileShape the schema offers produces real geometry, not a default rectangle", () => {
  assert.ok(TILE_SHAPES.length >= 20, `expected the full shape list, got ${TILE_SHAPES.length}`);

  for (const shape of TILE_SHAPES) {
    const geometry = shapeGeometry(shape, {});
    const hasGeometry = "clipPath" in geometry || "borderRadius" in geometry;
    assert.ok(hasGeometry, `${shape} produced no geometry`);
  }
});

test("distinct shapes render distinctly — no two produce identical geometry by accident", () => {
  // Rectangles/pills legitimately share the border-radius approach, so
  // compare only the clip-path shapes, which is where the real geometry is.
  const clipped = TILE_SHAPES.filter((s) => shapeUsesClipPath(s));
  const seen = new Map<string, string>();

  for (const shape of clipped) {
    const path = String(shapeGeometry(shape, {}).clipPath);
    const previous = seen.get(path);
    // tabCutTopCorners and its ByPixel variant are the same outline with a
    // different unit, so they're allowed to match.
    const allowedPair = previous && [previous, shape].every((s) => s.startsWith("tabCutTopCorners"));
    assert.ok(!previous || allowedPair, `${shape} has the same outline as ${previous}`);
    seen.set(path, shape);
  }

  assert.ok(clipped.length >= 12, `expected most shapes to be clip-path based, got ${clipped.length}`);
});

test("shape parameters actually change the outline they tune", () => {
  const narrow = shapeGeometry("arrow", { arrowStemWidth: 20, arrowheadSize: 30 }).clipPath;
  const wide = shapeGeometry("arrow", { arrowStemWidth: 70, arrowheadSize: 30 }).clipPath;
  assert.notEqual(narrow, wide, "arrow stem width must change the arrow outline");

  const shallow = shapeGeometry("hexagon", { hexagonSlant: 5 }).clipPath;
  const deep = shapeGeometry("hexagon", { hexagonSlant: 45 }).clipPath;
  assert.notEqual(shallow, deep, "hexagon slant must change the hexagon outline");

  const leftTail = shapeGeometry("speechbubbleRectangle", { speechBubbleTailPosition: "bottomLeft" }).clipPath;
  const rightTail = shapeGeometry("speechbubbleRectangle", { speechBubbleTailPosition: "bottomRight" }).clipPath;
  assert.notEqual(leftTail, rightTail, "speech bubble tail position must move the tail");
});

test("out-of-range parameters are clamped rather than producing a broken outline", () => {
  // A slant beyond half the width would invert the shape; percentages
  // outside 0-100 would push points off the tile entirely.
  const path = String(shapeGeometry("trapezoid", { trapezoidSlant: 500 }).clipPath);
  const numbers = [...path.matchAll(/(-?\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));
  assert.ok(numbers.length > 0);
  for (const value of numbers) {
    assert.ok(value >= 0 && value <= 100, `clip-path coordinate ${value}% is outside the tile`);
  }
});

test("each shape's default parameters actually produce that shape, not a rectangle", () => {
  // Regression guard: the resolver used to fall back to 0 for every
  // numeric shape parameter, so a hexagon (slant 0) and an octagon (snip
  // 0) both rendered as plain rectangles despite being selected.
  const rectangleLike = String(shapeGeometry("hexagon", { hexagonSlant: 0 }).clipPath);

  const hexagon = String(shapeGeometry("hexagon", resolvedShapeParams()).clipPath);
  const octagon = String(shapeGeometry("octagon", resolvedShapeParams()).clipPath);
  const triangle = String(shapeGeometry("triangleIsoc", resolvedShapeParams()).clipPath);

  assert.notEqual(hexagon, rectangleLike, "a hexagon must not default to rectangle geometry");
  assert.ok(!octagon.includes("polygon(0% 0%, 100% 0%, 100% 0%"), "an octagon must have snipped corners by default");
  assert.ok(triangle.startsWith("polygon(50.0%"), `an isosceles triangle's tip should default to centre, got ${triangle}`);
});

test("rectangle-family shapes use border-radius so their outline still draws", () => {
  // clip-path cuts off a CSS border, so shapes that can be expressed as a
  // radius must not use it — otherwise turning the outline on does nothing.
  for (const shape of ["rectangle", "rectangleRounded", "rectangleRoundedByPixel", "pill", "oval"]) {
    assert.equal(shapeUsesClipPath(shape), false, `${shape} should not be clip-path based`);
  }
});
