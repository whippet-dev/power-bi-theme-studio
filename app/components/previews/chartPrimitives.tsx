import type { CSSProperties, ReactNode } from "react";
import type { MarkerShape, Point } from "../../lib/lineGeometry";

/**
 * Chart primitives shared by the extracted cartesian previews.
 *
 * These were module-level helpers inside VisualPreviews.tsx. They move
 * here so the five preview components can use them without importing from
 * the file that imports *them*, which would be circular. `chartMarker` is
 * also still used by the Matrix sparkline, which stays in VisualPreviews
 * and now imports it from here — that is the only reason this module
 * exists rather than the helpers living in one preview component.
 *
 * Moved verbatim; no behaviour change.
 */

export function svgDashArray(style: "solid" | "dashed" | "dotted"): string | undefined {
  if (style === "dashed") return "6 4";
  if (style === "dotted") return "1.5 3";
  return undefined;
}

/**
 * Chart markers must render as true circles/squares regardless of the
 * plot's aspect ratio — but the line/area path they sit alongside is drawn
 * in an SVG whose 100x100 viewBox is stretched non-uniformly
 * (preserveAspectRatio="none") to fill whatever actual width/height the
 * plot has. `vector-effect="non-scaling-stroke"` keeps a path's *stroke
 * width* constant against that stretch, but it does nothing for a shape's
 * *geometry* — a `<circle r={4}>` drawn inside that same stretched
 * coordinate space still comes out as a squashed ellipse, exactly the
 * "stretched markers" bug this fixes. Rendering markers as plain
 * absolutely-positioned HTML elements sidesteps the whole problem:
 * `point.x`/`point.y` are already percentages of the plot area (see
 * linePointCoords), so percentage position still lines up with the data
 * point, while pixel width/height/border-radius are never touched by any
 * SVG transform at all.
 */
export function chartMarker(
  key: string | number,
  marker: MarkerShape,
  point: Point,
  fill: string,
  stroke: string,
  strokeWidth: number,
  rotation = 0,
): ReactNode {
  const base: CSSProperties = {
    position: "absolute",
    left: `${point.x}%`,
    top: `${point.y}%`,
    backgroundColor: fill,
    border: strokeWidth > 0 && stroke !== "none" ? `${strokeWidth}px solid ${stroke}` : undefined,
    pointerEvents: "none",
  };

  if (marker.kind === "circle") {
    const size = marker.r * 2;
    return (
      <span
        key={key}
        aria-hidden="true"
        style={{ ...base, width: size, height: size, borderRadius: "50%", transform: "translate(-50%, -50%)" }}
      />
    );
  }
  if (marker.kind === "rect") {
    return (
      <span
        key={key}
        aria-hidden="true"
        style={{
          ...base,
          width: marker.size,
          height: marker.size,
          transform: `translate(-50%, -50%) rotate(${marker.rotate + rotation}deg)`,
        }}
      />
    );
  }
  // "polygon" is only ever a triangle — approximated with clip-path inside
  // a square bounding box the same size as the equivalent circle marker.
  return (
    <span
      key={key}
      aria-hidden="true"
      style={{
        ...base,
        width: marker.size,
        height: marker.size,
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    />
  );
}

/**
 * Bar/column thickness from the chart's gap-size setting. Power BI's gap
 * is the share of each category slot left empty, so a larger gap means a
 * thinner bar. 0 keeps the built-in default rather than a full-width bar.
 */
export function barThickness(gapSize: number): string {
  const gap = Math.max(0, Math.min(90, gapSize || 20));
  return `${100 - gap}%`;
}

// A horizontal bar chart's value axis (0%-100%) only spans .bar-row's
// middle track column, not the whole row — the category-label and
// value-label columns sit either side of it. Must match .bar-row's
// `grid-template-columns: 68px minmax(80px, 1fr) 28px; gap: 8px;` in
// globals.css, or gridlines/ticks drift onto the label gutters instead of
// lining up with the bars they measure.
export const BAR_VALUE_AXIS_INSET = { start: 68 + 8, end: 8 + 28 };
