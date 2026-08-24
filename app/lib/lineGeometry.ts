/**
 * Line charts in Power BI aren't always straight segments between points:
 * `lineStyles.interpolation*` switches between linear, smoothed (a curve),
 * and stepped, and `lineChartType` decides whether the series is a plain
 * line, an area, or a stacked area. Previously the preview always drew
 * straight segments with an optional area fill, so none of that showed.
 */

export type Point = { x: number; y: number };

/** Builds an SVG path for a series, honouring the interpolation setting. */
export function linePath(points: Point[], interpolation: { smooth: boolean; step: boolean; stepAlignment?: string | number }): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;

  if (interpolation.step) {
    // "Step" holds the previous value until the next category, producing a
    // staircase. Alignment decides whether the step happens at the start,
    // middle, or end of the interval.
    let previous = first;
    for (const point of rest) {
      const alignment = String(interpolation.stepAlignment ?? "").toLowerCase();
      if (alignment === "center" || alignment === "middle") {
        const mid = (previous.x + point.x) / 2;
        d += ` L ${mid} ${previous.y} L ${mid} ${point.y} L ${point.x} ${point.y}`;
      } else if (alignment === "start" || alignment === "before") {
        d += ` L ${previous.x} ${point.y} L ${point.x} ${point.y}`;
      } else {
        d += ` L ${point.x} ${previous.y} L ${point.x} ${point.y}`;
      }
      previous = point;
    }
    return d;
  }

  if (interpolation.smooth) {
    // Catmull-Rom converted to cubic béziers — a smooth curve through
    // every point, which is what Power BI's "smooth line" produces.
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  for (const point of rest) d += ` L ${point.x} ${point.y}`;
  return d;
}

/**
 * Closes a line path into a filled area down to the baseline.
 *
 * `baseline` is required: it used to default to 100, which only made sense
 * inside the old normalised 0..100 SVG space. The caller now passes the
 * plot coordinate of the axis's zero, so this module stays purely about
 * path shape and knows nothing about where the data lives.
 */
export function areaPath(points: Point[], linePathD: string, baseline: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePathD} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

/**
 * Marker shapes Power BI offers. Returned as a plain size/rotation
 * description (not SVG path data) so the preview can render each as a
 * CSS shape positioned as an HTML overlay rather than inside the SVG. The
 * SVG still maps the plot's natural box onto a rendered box of a different
 * aspect, so a shape drawn in it would still stretch; markers stay HTML for
 * that reason — see chartMarker in previews/chartPrimitives.tsx.
 */
export type MarkerShape = { kind: "circle"; r: number } | { kind: "polygon"; size: number } | { kind: "rect"; size: number; rotate: number };

export function markerShape(shape: string, size: number): MarkerShape {
  const r = Math.max(1, size) / 2;
  switch (String(shape).toLowerCase()) {
    case "square":
      return { kind: "rect", size: r * 2, rotate: 0 };
    case "diamond":
      return { kind: "rect", size: r * 1.7, rotate: 45 };
    case "triangle":
      return { kind: "polygon", size: r * 2 };
    case "x":
    case "cross":
      // No native CSS x glyph — a rotated square reads as a distinct
      // shape, which is what matters for judging marker styling here.
      return { kind: "rect", size: r * 1.5, rotate: 45 };
    case "circle":
    default:
      return { kind: "circle", r };
  }
}

/**
 * One series' points as percentages of the plot, for the HTML overlays that
 * sit on top of the SVG (markers, labels, leaders).
 *
 * Takes the scales as functions rather than a `ChartLayout` so it stays pure
 * and stays honest: every series is handed the SAME two closures, so a series
 * cannot end up on its own scale. That is the property worth protecting here
 * — the line chart has one ChartLayout, one category scale and one value
 * scale, and only the values differ.
 *
 * Callers derive marker positions from this rather than repeating the
 * conversion, so a marker cannot drift from the path it belongs to.
 */
export function seriesPointPercents(
  values: readonly number[],
  categoryCentrePercent: (index: number) => number,
  valueFraction: (value: number) => number,
): Array<{ left: number; top: number }> {
  return values.map((value, index) => ({
    left: categoryCentrePercent(index),
    // Percentages run down from the plot's top edge; the value fraction runs
    // up from its floor, so one of them has to be inverted exactly once.
    top: (1 - valueFraction(value)) * 100,
  }));
}
