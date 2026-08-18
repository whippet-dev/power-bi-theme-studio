import classic2026Json from "../../themes/base/classic2026.json";
import classic2018Json from "../../themes/base/classic2018.json";
import fluent2Json from "../../themes/base/fluent2.json";
import type { PowerBITheme } from "./theme";

/**
 * The base theme layer Power BI itself applies before any custom theme —
 * see themes/base/*.json for exactly how each was sourced (verbatim
 * exports or a reconstructed delta chain, both confirmed against the
 * installed Power BI Desktop app's own files, not inferred). A user's
 * theme still layers on top via mergeThemeOverBase; this is only the
 * fallback underneath it.
 *
 * To add a newly-released base theme: drop its JSON in themes/base/,
 * add one entry below, and move DEFAULT_BASE_THEME_ID to it if it's now
 * the current default for new reports (Microsoft states this explicitly —
 * see themes/base/classic2026.json's _note). Nothing else needs to
 * change; every resolver already reads through whichever base theme is
 * selected.
 */
export type BaseThemeId = "classic2026" | "classic2018" | "fluent2";

export type BaseThemeDescriptor = {
  id: BaseThemeId;
  label: string;
  description: string;
  theme: PowerBITheme;
};

export const BASE_THEMES: BaseThemeDescriptor[] = [
  {
    id: "classic2026",
    label: "Classic 2026",
    description: "Current default base theme for new Power BI reports.",
    theme: classic2026Json as unknown as PowerBITheme,
  },
  {
    id: "classic2018",
    label: "Classic 2018",
    description: "Legacy base theme — used by reports created before 2026.",
    theme: classic2018Json as unknown as PowerBITheme,
  },
  {
    id: "fluent2",
    label: "Fluent 2 (Preview)",
    description: "Opt-in preview theme aligned with Microsoft's Fluent 2 design system.",
    theme: fluent2Json as unknown as PowerBITheme,
  },
];

/** Update this when a newer base theme becomes Power BI's actual default — see the module comment above. */
export const DEFAULT_BASE_THEME_ID: BaseThemeId = "classic2026";

export function getBaseTheme(id: BaseThemeId): PowerBITheme {
  return BASE_THEMES.find((entry) => entry.id === id)?.theme ?? BASE_THEMES[0].theme;
}
