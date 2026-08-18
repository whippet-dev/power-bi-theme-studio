import type { CSSProperties, ReactNode } from "react";
import { hexWithAlpha } from "../lib/colorUtils";
import type { ResolvedGlobalOptionsStyle } from "../lib/globalOptionsProperties";
import type { ResolvedTheme } from "../lib/theme";
import {
  TEXT_CLASS_DESCRIPTIONS,
  TEXT_CLASS_KEYS,
  TEXT_CLASS_LABELS,
  type ResolvedTextClasses,
  type ResolvedThemeColors,
  type TextClassKey,
} from "../lib/themeGlobalsProperties";

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
export function PaletteLegend({
  theme,
  colors,
  textClasses,
}: {
  theme: ResolvedTheme;
  colors: ResolvedThemeColors;
  textClasses: ResolvedTextClasses;
}) {
  const conditional: SwatchDemo[] = [
    { color: colors.good, label: "Good", impact: "positive KPI indicators" },
    { color: colors.neutral, label: "Neutral", impact: "neutral KPI indicators" },
    { color: colors.bad, label: "Bad", impact: "negative KPI indicators" },
  ];

  // Microsoft's own structural-colour docs pair each token with a Fluent
  // "also called" name and a full list of what it formats — full text
  // lives on THEME_COLOR_PROPERTIES' descriptions (shown via the property
  // panel's ⓘ toggle); these are short, representative samples of that
  // same list, not the whole thing.
  const structural: Array<{ color: string; label: string; impact: string; sample: ReactNode }> = [
    {
      color: colors.firstLevelElements,
      label: "First-level elements",
      impact: "Trend lines, card data labels, table values",
      sample: <span style={{ color: colors.firstLevelElements, fontWeight: 650 }}>82K</span>,
    },
    {
      color: colors.secondLevelElements,
      label: "Second-level elements",
      impact: "Axis & legend labels, table headers",
      sample: <span style={{ color: colors.secondLevelElements, fontSize: 10 }}>Region</span>,
    },
    {
      color: colors.thirdLevelElements,
      label: "Third-level elements",
      impact: "Gridlines, shape fill, grid colour",
      sample: <span className="palette-legend__gridline-demo" style={{ borderColor: colors.thirdLevelElements }} />,
    },
    {
      color: colors.fourthLevelElements,
      label: "Fourth-level elements",
      impact: "Card & legend category labels (dimmed)",
      sample: <span style={{ color: colors.fourthLevelElements, fontSize: 10 }}>Applications</span>,
    },
    {
      color: theme.background,
      label: "Background",
      impact: "Button fill, tooltip background",
      sample: <span className="palette-legend__stroke-demo" style={{ backgroundColor: theme.background, borderColor: colors.thirdLevelElements }} />,
    },
    {
      color: colors.secondaryBackground,
      label: "Secondary background",
      impact: "Grid outline, disabled fill",
      sample: <span className="palette-legend__stroke-demo" style={{ backgroundColor: colors.secondaryBackground }} />,
    },
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

      <div className="palette-legend__group palette-legend__group--wide">
        <h3>Structural colours</h3>
        <p>
          Power BI&rsquo;s Fluent text/UI hierarchy — hover a swatch for the full list of what it styles (source:{" "}
          <a href="https://learn.microsoft.com/en-us/power-bi/create-reports/report-themes-create-custom" target="_blank" rel="noreferrer">
            Microsoft&rsquo;s theme docs
          </a>
          ).
        </p>
        <div className="palette-legend__structural">
          {structural.map((entry) => (
            <span className="palette-legend__structural-item" key={entry.label} title={entry.impact}>
              <span className="palette-legend__chip-dot" style={{ backgroundColor: entry.color }} />
              <span className="palette-legend__structural-sample">{entry.sample}</span>
              <small>{entry.label}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="palette-legend__group palette-legend__group--wide">
        <h3>Text classes</h3>
        <p>
          The 14 typography defaults Power BI applies across every visual — 4 you set directly (title, header, label, callout), the
          rest inherit from those unless overridden. Hover a row for what it styles.
        </p>
        <div className="palette-legend__text-classes">
          {TEXT_CLASS_KEYS.map((key) => (
            <TextClassSample key={key} textKey={key} textClasses={textClasses} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** One row of the text-class reference: the class's own resolved styling, applied to its own name. */
function TextClassSample({ textKey, textClasses }: { textKey: TextClassKey; textClasses: ResolvedTextClasses }) {
  const fontSize = Math.min(20, Number(textClasses[`${textKey}FontSize`]) || 12);
  return (
    <span className="palette-legend__text-class" title={TEXT_CLASS_DESCRIPTIONS[textKey]}>
      <span
        className="palette-legend__text-class-sample"
        style={{
          color: String(textClasses[`${textKey}Color`]),
          fontFamily: String(textClasses[`${textKey}FontFace`]) || undefined,
          fontSize,
          fontWeight: textClasses[`${textKey}FontWeight`] === "bold" ? 700 : 400,
        }}
      >
        Aa
      </span>
      <small>{TEXT_CLASS_LABELS[textKey]}</small>
    </span>
  );
}
