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
 *
 * A filter card's *field name* ("Category", "Region", ...) isn't styled by
 * `filterCard.foregroundColor` — that's the value text below it ("is
 * (All)"). Real Power BI tints the field name with the report's first data
 * colour instead, confirmed against a real screenshot and the user's own
 * private theme (dataColors[0] is a dark navy blue, exactly what the field
 * name renders as; filterCard.foregroundColor there is a plain near-black,
 * which is what the value text actually shows).
 */
export function FilterPanePreview({ globalOptions, theme }: { globalOptions: ResolvedGlobalOptionsStyle; theme: ResolvedTheme }) {
  const pane = globalOptions.pageFilterPane;
  // "Available" (no selection, e.g. "is (All)") vs "Applied" (a selection
  // is active) are genuinely different states in the real schema — see
  // filterCardEntryIndex in globalOptionsProperties.ts.
  const availableCard = globalOptions.pageFilterCards;
  const appliedCard = globalOptions.pageFilterCardsApplied;
  const state = globalOptions.reportFilterPaneState;
  const fieldNameColor = theme.palette[0] ?? availableCard.foregroundColor;

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

  const cardStyleFor = (card: ResolvedGlobalOptionsStyle["pageFilterCards"]): CSSProperties => ({
    backgroundColor: hexWithAlpha(card.backgroundColor, card.transparency),
    border: card.border ? `1px solid ${card.borderColor}` : "1px solid transparent",
    color: card.foregroundColor,
    fontFamily: card.fontFamily || undefined,
    fontSize: card.textSize,
  });

  const filterCard = (name: string, card: ResolvedGlobalOptionsStyle["pageFilterCards"], body: ReactNode, key: string) => (
    <span className="filter-card" style={cardStyleFor(card)} key={key}>
      <span className="filter-card__header">
        <span className="filter-card__name" style={{ color: fieldNameColor }}>
          {name}
        </span>
        <span className="filter-card__header-icons" aria-hidden="true">
          <span title="Clear filter">⟲</span>
          <span title="Filter type">▾</span>
        </span>
      </span>
      {body}
    </span>
  );

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
      <span className="filter-pane__title-row">
        <span className="filter-pane__title" style={{ fontSize: pane.titleSize }}>
          <span aria-hidden="true">▽</span> Filters
        </span>
        <span className="filter-pane__title-icons" aria-hidden="true">
          <span title="Show applied filters only">◎</span>
          <span title="Collapse filter pane">≫</span>
        </span>
      </span>

      <span
        className="filter-pane__search"
        style={{
          backgroundColor: pane.inputBoxColor,
          fontSize: pane.searchTextSize,
          border: `1px solid ${hexWithAlpha(pane.foregroundColor, 55)}`,
        }}
      >
        <span aria-hidden="true" className="filter-pane__search-icon">
          ⚲
        </span>
        <span className="filter-pane__search-placeholder">Search</span>
      </span>

      <span className="filter-pane__header" style={{ fontSize: pane.headerSize }}>
        <span>Filters on this page</span>
        <span aria-hidden="true" title="More options">
          ⋯
        </span>
      </span>

      {/* No selection made ("is (All)") — the "Available" filter-card state. */}
      {filterCard(
        "Region",
        availableCard,
        <span className="filter-card__value" style={{ backgroundColor: availableCard.inputBoxColor }}>
          is (All)
        </span>,
        "region",
      )}

      {/* A selection is active — the "Applied" filter-card state, styled
          distinctly from Region above (confirmed against a real Power BI
          screenshot: an applied filter's card reads as a visibly
          different, slightly tinted surface). Real Power BI's own "Apply
          filter" control lives inside the card that needs it, not as one
          page-level button below every card — it only appears for filter
          types that don't auto-apply on each click (e.g. this one, once a
          checkbox is ticked), which this preview approximates by always
          showing it here rather than modelling every filter type's exact
          apply-trigger rules. */}
      {filterCard(
        "Status",
        appliedCard,
        <>
          <span className="filter-card__options">
            {["Approved", "In review"].map((label, index) => (
              <span className="filter-card__option" key={label}>
                <span
                  className="filter-card__check"
                  style={
                    index === 0
                      ? { backgroundColor: pane.checkboxAndApplyColor, borderColor: pane.checkboxAndApplyColor }
                      : { borderColor: appliedCard.foregroundColor }
                  }
                  aria-hidden="true"
                >
                  {index === 0 ? "✓" : ""}
                </span>
                {label}
              </span>
            ))}
          </span>
          <span className="filter-card__apply" style={{ color: pane.checkboxAndApplyColor }}>
            Apply filter
          </span>
        </>,
        "status",
      )}

      <span className="filter-pane__header" style={{ fontSize: pane.headerSize }}>
        <span>Filters on all pages</span>
        <span aria-hidden="true" title="More options">
          ⋯
        </span>
      </span>
      <span className="filter-pane__placeholder">Add data fields here</span>
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
