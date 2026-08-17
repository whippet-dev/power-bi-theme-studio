import type { CSSProperties } from "react";
import { hexWithAlpha } from "../lib/colorUtils";
import type { ResolvedGlobalOptionsStyle } from "../lib/globalOptionsProperties";
import type { ResolvedTheme } from "../lib/theme";
import type { ResolvedThemeColors } from "../lib/themeGlobalsProperties";

/**
 * The report-level filter pane, styled from `visualStyles.page["*"]`'s
 * outspacePane (the pane itself) and filterCard (each filter inside it)
 * groups. Without this, those 20 properties were editable but had nothing
 * on screen to affect — same reasoning as every other preview here: a
 * setting you can't see is a setting you can't judge.
 *
 * `visualStyles.report["*"].outspacePane` controls whether the pane starts
 * visible/expanded, so this reflects that state rather than always drawing
 * an open pane.
 */
export function FilterPanePreview({ globalOptions }: { globalOptions: ResolvedGlobalOptionsStyle }) {
  const pane = globalOptions.pageFilterPane;
  const card = globalOptions.pageFilterCards;
  const state = globalOptions.reportFilterPaneState;

  if (!state.visible) {
    return (
      <aside className="filter-pane filter-pane--hidden" aria-label="Filter pane (hidden)">
        <span className="filter-pane__hidden-note">Filter pane hidden</span>
      </aside>
    );
  }

  if (!state.expanded) {
    return (
      <aside
        className="filter-pane filter-pane--collapsed"
        aria-label="Filter pane (collapsed)"
        style={{
          backgroundColor: hexWithAlpha(pane.backgroundColor, pane.transparency),
          borderLeft: pane.border ? `1px solid ${pane.borderColor}` : undefined,
          color: pane.foregroundColor,
          fontFamily: pane.fontFamily || undefined,
        }}
      >
        <span className="filter-pane__collapsed-label">Filters</span>
      </aside>
    );
  }

  const cardStyle: CSSProperties = {
    backgroundColor: hexWithAlpha(card.backgroundColor, card.transparency),
    border: card.border ? `1px solid ${card.borderColor}` : "1px solid transparent",
    color: card.foregroundColor,
    fontFamily: card.fontFamily || undefined,
    fontSize: card.textSize,
  };

  return (
    <aside
      className="filter-pane"
      aria-label="Filter pane"
      style={{
        width: pane.width,
        backgroundColor: hexWithAlpha(pane.backgroundColor, pane.transparency),
        borderLeft: pane.border ? `1px solid ${pane.borderColor}` : undefined,
        color: pane.foregroundColor,
        fontFamily: pane.fontFamily || undefined,
      }}
    >
      <span className="filter-pane__title" style={{ fontSize: pane.titleSize }}>
        Filters
      </span>

      <span className="filter-pane__search" style={{ backgroundColor: pane.inputBoxColor, fontSize: pane.searchTextSize }}>
        Search
      </span>

      <span className="filter-pane__header" style={{ fontSize: pane.headerSize }}>
        Filters on this page
      </span>

      <span className="filter-card" style={cardStyle}>
        <span className="filter-card__name">Region</span>
        <span className="filter-card__value" style={{ backgroundColor: card.inputBoxColor }}>
          is (All)
        </span>
      </span>

      <span className="filter-card" style={cardStyle}>
        <span className="filter-card__name">Status</span>
        <span className="filter-card__options">
          {["Approved", "In review"].map((label, index) => (
            <span className="filter-card__option" key={label}>
              <span
                className="filter-card__check"
                style={
                  index === 0
                    ? { backgroundColor: pane.checkboxAndApplyColor, borderColor: pane.checkboxAndApplyColor }
                    : { borderColor: card.foregroundColor }
                }
                aria-hidden="true"
              >
                {index === 0 ? "✓" : ""}
              </span>
              {label}
            </span>
          ))}
        </span>
      </span>

      <span className="filter-pane__apply" style={{ backgroundColor: pane.checkboxAndApplyColor }}>
        Apply
      </span>
    </aside>
  );
}

type SwatchDemo = { color: string; label: string; impact: string };

/**
 * A reference strip showing what each theme-level colour token actually
 * drives. These tokens live at the theme root (dataColors, good/neutral/bad,
 * minimum/center/maximum, hyperlink, ...) and are used by Power BI across
 * many visuals and states — so unlike a per-visual property there's no one
 * preview tile that shows them. Rather than plain swatches, each is drawn
 * as a miniature of the thing it controls (a colour scale as a gradient, a
 * KPI chip, link text) so the effect is legible, not just the value.
 */
export function PaletteLegend({ theme, colors }: { theme: ResolvedTheme; colors: ResolvedThemeColors }) {
  const conditional: SwatchDemo[] = [
    { color: colors.good, label: "Good", impact: "positive KPI indicators" },
    { color: colors.neutral, label: "Neutral", impact: "neutral KPI indicators" },
    { color: colors.bad, label: "Bad", impact: "negative KPI indicators" },
  ];

  return (
    <section className="palette-legend" aria-label="What theme colours affect">
      <div className="palette-legend__group">
        <h3>Data palette</h3>
        <p>Assigned in order to each series, category, or slice across every visual.</p>
        <div className="palette-legend__series">
          {theme.palette.slice(0, 8).map((color, index) => (
            <span className="palette-legend__series-item" key={`${color}-${index}`}>
              <span className="palette-legend__series-bar" style={{ backgroundColor: color, height: 34 - index * 3 }} />
              <small>{index + 1}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="palette-legend__group">
        <h3>Conditional formatting</h3>
        <p>Status colours for KPIs and rule-based formatting.</p>
        <div className="palette-legend__chips">
          {conditional.map((entry) => (
            <span className="palette-legend__chip" key={entry.label} title={entry.impact}>
              <span className="palette-legend__chip-dot" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </span>
          ))}
        </div>
      </div>

      <div className="palette-legend__group">
        <h3>Colour scale</h3>
        <p>Gradient ends and midpoint for scale-based conditional formatting.</p>
        <div
          className="palette-legend__scale"
          style={{ background: `linear-gradient(to right, ${colors.minimum}, ${colors.center}, ${colors.maximum})` }}
        />
        <div className="palette-legend__scale-labels">
          <small>Min</small>
          <small>Centre</small>
          <small>Max</small>
        </div>
        <span className="palette-legend__null">
          <span className="palette-legend__chip-dot" style={{ backgroundColor: colors.nullValue }} />
          Null / blank
        </span>
      </div>

      <div className="palette-legend__group">
        <h3>Text &amp; links</h3>
        <p>Applied to link, disabled, and shape elements report-wide.</p>
        <div className="palette-legend__text-demos">
          <span style={{ color: colors.hyperlink, textDecoration: "underline" }}>Hyperlink</span>
          <span style={{ color: colors.visitedHyperlink, textDecoration: "underline" }}>Visited link</span>
          <span style={{ color: colors.disabledText }}>Disabled text</span>
          <span className="palette-legend__stroke-demo" style={{ borderColor: colors.shapeStroke }}>
            Shape stroke
          </span>
        </div>
      </div>
    </section>
  );
}
