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
 * in an SVG that is stretched non-uniformly (preserveAspectRatio="none")
 * to fill whatever actual width/height the plot has.
 * `vector-effect="non-scaling-stroke"` keeps a path's *stroke width*
 * constant against that stretch, but it does nothing for a shape's
 * *geometry* — a `<circle r={4}>` drawn inside that same stretched
 * coordinate space still comes out as a squashed ellipse, exactly the
 * "stretched markers" bug this fixes. Rendering markers as plain
 * absolutely-positioned HTML elements sidesteps the whole problem: pixel
 * width/height/border-radius are never touched by any SVG transform.
 *
 * `point` is therefore in PERCENTAGES OF THE PLOT, not plot coordinates.
 * Until T10 the line chart's SVG had its own 0..100 space, which made
 * those two the same number and let the distinction go unnoticed. The SVG
 * now draws in ChartLayout's plot coordinates, so callers must convert —
 * see pointMarkerPoint in LineChartPreview.
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
 * A bar or column's thickness, as a share of the category slot
 * `scale.category` gives it. Power BI's gap is the share of each slot left
 * empty, so a larger gap means a thinner mark; 0 keeps the built-in default
 * rather than a full-width one.
 *
 * BAR_VALUE_AXIS_INSET used to live here too — `{ start: 68 + 8, end: 8 + 28 }`,
 * hand-copied from `.bar-row`'s grid template so gridlines could be inset to
 * the track column. T8 deleted it: the bar chart no longer derives geometry
 * from a CSS grid, so there is no second source of truth left to copy.
 */
export function barThickness(gapSize: number): string {
  const gap = Math.max(0, Math.min(90, gapSize || 20));
  return `${100 - gap}%`;
}
