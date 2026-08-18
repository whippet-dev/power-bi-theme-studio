/**
 * Tints or shades a `#RRGGBB` colour, as Power BI's `ThemeDataColor`
 * expressions do via their `Percent` field.
 *
 * A negative `amount` shades toward black, a positive one tints toward
 * white, and the magnitude is the fraction of the way there — so -0.5 on
 * #808080 lands halfway to black (#404040) and +0.5 halfway to white
 * (#C0C0C0). See resolveColorValue in properties.ts for the caveat about
 * which direction Power BI actually intends; the maths here is the
 * conventional reading and is isolated so it can be flipped in one place.
 *
 * Anything that isn't a plain 6-digit hex is returned untouched rather
 * than mangled — an 8-digit #RRGGBBAA keeps its alpha, and a value that
 * somehow isn't a colour at all passes through.
 */
export function tintOrShade(hex: string, amount: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex) || !Number.isFinite(amount) || amount === 0) return hex;

  const factor = Math.max(-1, Math.min(1, amount));
  const adjust = (offset: number): string => {
    const value = parseInt(hex.slice(offset, offset + 2), 16);
    const moved =
      factor < 0
        ? value * (1 + factor) // toward black
        : value + (255 - value) * factor; // toward white
    return Math.round(moved).toString(16).padStart(2, "0");
  };

  return `#${adjust(1)}${adjust(3)}${adjust(5)}`.toUpperCase();
}

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
