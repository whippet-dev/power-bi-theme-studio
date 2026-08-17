import type { CSSProperties } from "react";

/**
 * Power BI's shape visuals pick an outline from `shape.tileShape` and then
 * tune it with shape-specific parameters (a chevron's angle, a hexagon's
 * slant, a speech bubble's tail). Previously every shape rendered as a
 * rounded rectangle, so 21 of the 22 shape types — and every parameter
 * that tunes them — were indistinguishable.
 *
 * These build a CSS `clip-path` polygon in percentage coordinates, which
 * scales with the tile and needs no SVG plumbing. Rectangles and pills are
 * excluded deliberately: they're better served by `border-radius`, which
 * (unlike clip-path) keeps the CSS border visible.
 */

type ShapeParams = Record<string, string | number>;

const num = (params: ShapeParams, key: string, fallback: number): number => {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

/** Clamps a tuning parameter into a range that still produces a sane outline. */
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const pt = (x: number, y: number) => `${x.toFixed(1)}% ${y.toFixed(1)}%`;

function polygon(points: Array<[number, number]>): string {
  return `polygon(${points.map(([x, y]) => pt(x, y)).join(", ")})`;
}

/**
 * Returns the CSS needed to draw `tileShape`. Shapes that CSS can express
 * with a radius return `borderRadius` (so the border still renders);
 * everything else returns a `clipPath`.
 */
export function shapeGeometry(tileShape: string, params: ShapeParams): CSSProperties {
  switch (tileShape) {
    case "rectangle":
      return { borderRadius: 0 };

    case "rectangleRounded":
      // A percentage of the shorter side.
      return { borderRadius: `${clamp(num(params, "rectangleRoundedCurve", 10), 0, 50)}%` };

    case "rectangleRoundedByPixel":
      return { borderRadius: clamp(num(params, "roundEdge", 10), 0, 200) };

    case "pill":
      return { borderRadius: 999 };

    case "oval":
      return { borderRadius: "50%" };

    case "line": {
      // A horizontal rule sitting in the middle of the tile.
      const half = clamp(num(params, "roundEdge", 4), 1, 40) / 2;
      return { clipPath: polygon([[0, 50 - half], [100, 50 - half], [100, 50 + half], [0, 50 + half]]) };
    }

    case "triangleIsoc": {
      // Tip slides horizontally; 50 is a symmetric isosceles triangle.
      const tip = clamp(num(params, "isocelesTriangleTipPosition", 50), 0, 100);
      return { clipPath: polygon([[tip, 0], [100, 100], [0, 100]]) };
    }

    case "triangleRight":
      return { clipPath: polygon([[0, 0], [100, 100], [0, 100]]) };

    case "trapezoid": {
      const slant = clamp(num(params, "trapezoidSlant", 20), 0, 45);
      return { clipPath: polygon([[slant, 0], [100 - slant, 0], [100, 100], [0, 100]]) };
    }

    case "parallelogram": {
      const slant = clamp(num(params, "parallelogramSlant", 20), 0, 45);
      return { clipPath: polygon([[slant, 0], [100, 0], [100 - slant, 100], [0, 100]]) };
    }

    case "hexagon": {
      const slant = clamp(num(params, "hexagonSlant", 25), 0, 50);
      return {
        clipPath: polygon([[slant, 0], [100 - slant, 0], [100, 50], [100 - slant, 100], [slant, 100], [0, 50]]),
      };
    }

    case "pentagon": {
      const slant = clamp(num(params, "hexagonSlant", 25), 0, 50);
      return { clipPath: polygon([[50, 0], [100, 38], [100 - slant, 100], [slant, 100], [0, 38]]) };
    }

    case "octagon": {
      const snip = clamp(num(params, "octagonSnipSize", 25), 0, 50);
      return {
        clipPath: polygon([
          [snip, 0],
          [100 - snip, 0],
          [100, snip],
          [100, 100 - snip],
          [100 - snip, 100],
          [snip, 100],
          [0, 100 - snip],
          [0, snip],
        ]),
      };
    }

    case "arrow": {
      // A block arrow pointing right: stem thickness and head length are
      // both tunable.
      const stem = clamp(num(params, "arrowStemWidth", 40), 5, 90);
      const head = clamp(num(params, "arrowheadSize", 40), 5, 90);
      const top = 50 - stem / 2;
      const bottom = 50 + stem / 2;
      const neck = 100 - head;
      return {
        clipPath: polygon([
          [0, top],
          [neck, top],
          [neck, 0],
          [100, 50],
          [neck, 100],
          [neck, bottom],
          [0, bottom],
        ]),
      };
    }

    case "arrowChevron": {
      const angle = clamp(num(params, "chevronAngle", 25), 0, 45);
      return {
        clipPath: polygon([
          [0, 0],
          [100 - angle, 0],
          [100, 50],
          [100 - angle, 100],
          [0, 100],
          [angle, 50],
        ]),
      };
    }

    case "arrowPentagon": {
      const angle = clamp(num(params, "chevronAngle", 25), 0, 45);
      return { clipPath: polygon([[0, 0], [100 - angle, 0], [100, 50], [100 - angle, 100], [0, 100]]) };
    }

    case "heart":
      // Two lobes and a point — approximated with a polygon rather than
      // curves, since clip-path polygons can't arc.
      return {
        clipPath: polygon([
          [50, 100],
          [8, 55],
          [0, 30],
          [12, 8],
          [32, 6],
          [50, 24],
          [68, 6],
          [88, 8],
          [100, 30],
          [92, 55],
        ]),
      };

    case "speechbubbleRectangle": {
      const bodyHeight = clamp(num(params, "speechBubbleHeight", 75), 40, 92);
      const tailWidth = clamp(num(params, "speechBubbleTailAngle", 12), 4, 30);
      const position = String(params.speechBubbleTailPosition ?? "bottomLeft");
      // Tail anchored on whichever edge the position names.
      const tails: Record<string, Array<[number, number]>> = {
        bottomLeft: [[18, bodyHeight], [14, 100], [30, bodyHeight]],
        bottomRight: [[70, bodyHeight], [86, 100], [82, bodyHeight]],
        topLeft: [[18, 100 - bodyHeight], [14, 0], [30, 100 - bodyHeight]],
        topRight: [[70, 100 - bodyHeight], [86, 0], [82, 100 - bodyHeight]],
      };
      const tail = tails[position] ?? tails.bottomLeft;
      const onTop = position.startsWith("top");
      const bodyTop = onTop ? 100 - bodyHeight : 0;
      const bodyBottom = onTop ? 100 : bodyHeight;
      void tailWidth;
      return {
        clipPath: polygon(
          onTop
            ? [[0, bodyTop], ...tail, [100, bodyTop], [100, bodyBottom], [0, bodyBottom]]
            : [[0, bodyTop], [100, bodyTop], [100, bodyBottom], ...[...tail].reverse(), [0, bodyBottom]],
        ),
      };
    }

    case "tabCutCorner": {
      const snip = clamp(num(params, "tabCutCornerSnipSizeTopRight", 25), 0, 60);
      return { clipPath: polygon([[0, 0], [100 - snip, 0], [100, snip], [100, 100], [0, 100]]) };
    }

    case "tabCutTopCorners":
    case "tabCutTopCornersByPixel": {
      const snip = clamp(num(params, "tabCutCornerSnipSizeTop", 20), 0, 45);
      return { clipPath: polygon([[snip, 0], [100 - snip, 0], [100, snip], [100, 100], [0, 100], [0, snip]]) };
    }

    case "tabRoundCorner": {
      const round = clamp(num(params, "tabRoundCornerTopRight", 25), 0, 60);
      return { borderRadius: `0 ${round}% 0 0` };
    }

    case "tabRoundTopCorners": {
      const round = clamp(num(params, "tabRoundCornerTop", 25), 0, 60);
      const bottom = clamp(num(params, "tabRoundCornerBottom", 0), 0, 60);
      return { borderRadius: `${round}% ${round}% ${bottom}% ${bottom}%` };
    }

    default:
      return { borderRadius: 4 };
  }
}

/** True when the shape is drawn by clipping, which hides any CSS border. */
export function shapeUsesClipPath(tileShape: string): boolean {
  return "clipPath" in shapeGeometry(tileShape, {});
}
