/**
 * Power BI stores a colour and its transparency as two separate theme
 * properties (e.g. `background.color` + `background.transparency`), where
 * transparency is a 0-100 percentage — 0 being fully solid. CSS wants a
 * single value, so previews combine the pair into an rgba() string here.
 */
export function hexWithAlpha(hex: string, transparencyPercent: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6 && clean.length !== 3) return hex;

  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;

  const alpha = Math.max(0, Math.min(1, 1 - transparencyPercent / 100));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
