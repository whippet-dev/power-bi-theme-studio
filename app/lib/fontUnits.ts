/**
 * Power BI font sizes are points; CSS wants pixels.
 *
 * A theme writes `"fontSize": 10.5` and Power BI renders 14 CSS pixels. Until
 * now Theme Studio passed the number straight through, so every preview drew
 * text at three-quarters of its real size — a defect
 * `BASE_THEME_DIFFERENTIAL_AUDIT.md` flagged but did not settle.
 *
 * **Proven from the runtime, not from documentation.** Power BI Desktop's own
 * bundle carries the conversion with its names intact, in
 * `bin/WebView2Resources/minerva/scripts/desktop.min.js` (module 290100):
 *
 * ```js
 * class PixelConverter {
 *   static PxPtRatio = 4 / 3;
 *   static fromPointToPixel(e) { return PixelConverter.PxPtRatio * e; }
 *   static toPoint(e)          { return e / PixelConverter.PxPtRatio; }
 *   static fromPoint(e)        { return PixelConverter.toString(PixelConverter.fromPointToPixel(e)); }
 * }
 * ```
 *
 * and two independent paths feed a theme number into it:
 *
 * - **text classes** (module 480549) — `theme.textClasses[name].fontSize` is
 *   read and passed to `FontSize.createFromPt(+fontSize)`, which stores
 *   `{ pt, px: fromPointToPixel(pt) }`;
 * - **visualStyles properties** (module 4393285) — a font-size property is
 *   `sizeInPixels ? FontSize.createFromPx(v) : FontSize.createFromPt(v)`. The
 *   pixel flag appears once in the whole bundle, so points is the rule.
 *
 * CSS strings are then built with `PixelConverter.fromPoint(pt)`, i.e.
 * `` `${pt * 4 / 3}px` ``.
 *
 * 4/3 is also exactly the CSS ratio (1pt = 1/72in, 1px = 1/96in, 96/72 = 4/3),
 * and the base themes corroborate it: Fluent 2 stores `label.fontSize` as
 * **10.5**, which is 14px on the nose — a round pixel value in a system
 * designed in pixels. Classic 2026's `callout` 24 is 32px, its `title` 12 is
 * 16px.
 *
 * **This is a rendering-boundary conversion only.** Resolved style objects,
 * the property editor and exported JSON all keep the raw point value: a user
 * who types 10 still sees 10 and still exports 10. Nothing writes 13.333 into
 * a theme.
 */

/** Power BI's `PixelConverter.PxPtRatio`. */
export const PX_PER_PT = 4 / 3;

/**
 * A theme font size (points) as CSS pixels.
 *
 * Fractions are preserved rather than rounded: Power BI does not round here
 * either, and rounding would reintroduce exactly the sub-pixel disagreement
 * between measurement and rendering this boundary exists to prevent.
 *
 * A non-finite or non-positive size is passed through untouched. Those come
 * from a theme that set something the schema disallows (its own bound is
 * 8..60), and inventing a size for them would hide the problem rather than
 * show it.
 */
export function themeFontSizeToCssPx(size: number): number {
  return Number.isFinite(size) && size > 0 ? size * PX_PER_PT : size;
}
