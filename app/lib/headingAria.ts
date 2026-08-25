/**
 * The accessibility semantics a Power BI title carries.
 *
 * Lives here rather than beside one renderer because the same title can be
 * drawn by the tile or by the visual itself, and the heading level is a
 * property of the title rather than of where it happens to be painted —
 * moving the DOM must not silently drop `role="heading"`.
 */
export function headingAria(heading: string | number): { role?: string; "aria-level"?: number } {
  const match = /^Heading([2-6])$/.exec(String(heading));
  if (!match) return {};
  return { role: "heading", "aria-level": Number(match[1]) };
}
