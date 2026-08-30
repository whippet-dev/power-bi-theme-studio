import { useState, type ReactNode } from "react";
import { hexWithAlpha } from "../lib/colorUtils";
import { themeFontSizeToCssPx } from "../lib/fontUnits";
import type { ResolvedChromeStyle } from "../lib/chromeProperties";
import type { InteractionState } from "../lib/properties";
import { StateSelector } from "./PropertyEditor";
import type { VisualKind } from "./visualCatalog";

/**
 * Theme Studio's own supporting region for the selected visual.
 *
 * `PREVIEW_COMPOSITION_DESIGN.md` §1.4 draws the line this component
 * enforces: `.report-page` holds report-page content, `.filter-pane` is
 * genuine Power BI report chrome and stays inside `.report-surface`, and
 * everything that exists only because this is a *theme editor* lives out
 * here, outside the simulated report entirely.
 *
 * Until now the interaction-state selector and the data-tooltip specimen
 * were siblings of the scaled hero tile — which put a Studio control and a
 * hover-only callout inside the simulated page. That is the drift the
 * design document recorded, and this is the fix.
 *
 * Deliberately not the full composition model. There are no
 * `PreviewSurface` records, no variant/example/transient registry and no
 * per-visual catalogue: this establishes the *place* supporting content
 * belongs and moves the two things that already existed. Guardrail G7's
 * budget starts counting from here.
 */

/**
 * Every icon Power BI's visual header can show, in roughly its own
 * left-to-right order, so toggling any one of them is visible here.
 *
 * This lived inside the preview tile until the header moved out here. In a
 * real report the header appears on hover during consumption -- it is report
 * chrome, not part of the authored visual -- so a static specimen shows the
 * same 21 toggles without implying the hero permanently wears a toolbar.
 */
const HEADER_ICONS: ReadonlyArray<[keyof ResolvedChromeStyle["visualHeader"], string, string]> = [
  ["showVisualWarningButton", "⚠", "Warning"],
  ["showVisualErrorButton", "⊗", "Error"],
  ["showVisualInformationButton", "ℹ", "Information"],
  ["showFilterRestatementButton", "▽", "Filter"],
  ["showDrillRoleSelector", "▾", "Drill on"],
  ["showDrillUpButton", "↑", "Drill up"],
  ["showDrillDownExpandButton", "↓", "Expand to next level"],
  ["showDrillDownLevelButton", "⇊", "Show next level"],
  ["showDrillToggleButton", "⤓", "Drill down"],
  ["showPersonalizeVisualButton", "✎", "Personalize"],
  ["showSeeDataLayoutToggleButton", "▦", "See data"],
  ["showSmartNarrativeButton", "✦", "Smart narrative"],
  ["showCopilotSummaryButton", "✨", "Copilot summary"],
  ["showSetAlertButton", "◔", "Set alert"],
  ["showFollowVisualButton", "★", "Follow"],
  ["showPinButton", "⊙", "Pin"],
  ["showFocusModeButton", "⤢", "Focus mode"],
  ["showCopyVisualImageButton", "⧉", "Copy"],
  ["showCommentButton", "☰", "Comment"],
  ["showTooltipButton", "ⓘ", "Tooltip"],
  ["showOptionsMenu", "⋯", "More options"],
];

/** What the inspector needs — and nothing more. No theme, no style bundle. */
type PreviewInspectorProps = {
  /** The visual the inspector is describing; also its remount key upstream. */
  selected: VisualKind;
  label: string;
  /** Only the selected visual's chrome, for the data-tooltip specimen. */
  chrome: ResolvedChromeStyle;
  /** Owned by ThemeStudio (T5). The selector reports changes back up. */
  previewInteractionState: InteractionState;
  onPreviewInteractionStateChange: (state: InteractionState) => void;
};

/** The three visuals whose styling genuinely varies per interaction state. */
const STATEFUL_VISUALS: ReadonlySet<VisualKind> = new Set<VisualKind>([
  "actionButton",
  "bookmarkNavigator",
  "pageNavigator",
]);

export function isStatefulPreviewVisual(selected: VisualKind): boolean {
  return STATEFUL_VISUALS.has(selected);
}

/**
 * True when the selected visual has anything to inspect. Used by the caller
 * so an empty region is never rendered — the design's guardrail against a
 * component gallery is partly that supporting content has to earn its
 * place, and a permanent empty card would be the first step the other way.
 */
export function hasInspectorContent(selected: VisualKind, chrome: ResolvedChromeStyle): boolean {
  return isStatefulPreviewVisual(selected) || chrome.visualTooltip.show || chrome.visualHeader.show;
}

export function PreviewInspector({
  selected,
  label,
  chrome,
  previewInteractionState,
  onPreviewInteractionStateChange,
}: PreviewInspectorProps): ReactNode {
  // The specimen is revealed on demand rather than always, exactly as the
  // trigger below the hero did before. Local to the inspector because it is
  // Studio view state, not theme state — the T5 invariant is about
  // interaction state and style resolution, which stay in ThemeStudio.
  const [showTooltipPreview, setShowTooltipPreview] = useState(false);

  const isStateful = isStatefulPreviewVisual(selected);
  const tooltip = chrome.visualTooltip;
  const headerTooltip = chrome.visualHeaderTooltip;
  const enabledHeaderIcons = HEADER_ICONS.filter(([key]) => chrome.visualHeader[key]);
  const tooltipIsReportPage = String(tooltip.type) === "Canvas";

  if (!hasInspectorContent(selected, chrome)) return null;

  return (
    <aside className="preview-inspector" aria-label={`${label} preview inspector`}>
      <span className="preview-inspector__eyebrow">Inspector — {label}</span>

      {isStateful && (
        <section className="preview-inspector__group">
          <h3 className="preview-inspector__heading">Interaction state</h3>
          <p className="preview-inspector__note">
            Power BI styles these per state. The hero shows the one selected here; thumbnails stay on default.
          </p>
          <span className="preview-state-selector">
            <StateSelector state={previewInteractionState} onSelect={onPreviewInteractionStateChange} />
          </span>
        </section>
      )}

      {chrome.visualHeader.show && (
        <section className="preview-inspector__group">
          <h3 className="preview-inspector__heading">Visual header</h3>
          <p className="preview-inspector__note">
            Report chrome shown on hover during consumption, not part of the authored visual — so it is shown here rather than on the hero.
          </p>
          <span
            className="header-specimen"
            style={{
              backgroundColor: hexWithAlpha(chrome.visualHeader.background, chrome.visualHeader.transparency),
              border: `1px solid ${chrome.visualHeader.border}`,
              color: chrome.visualHeader.foreground,
            }}
          >
            {enabledHeaderIcons.length > 0 ? (
              enabledHeaderIcons.map(([, glyph, name]) => (
                <span className="header-specimen__icon" key={name} title={name}>
                  {glyph}
                </span>
              ))
            ) : (
              <span className="header-specimen__empty">No header icons enabled</span>
            )}
          </span>
        </section>
      )}

      {chrome.visualHeader.show && chrome.visualHeader.showTooltipButton && (
        <section className="preview-inspector__group">
          <h3 className="preview-inspector__heading">Header tooltip</h3>
          <p className="preview-inspector__note">
            The callout behind the header&rsquo;s {"ⓘ"} icon. Shown as a static example.
          </p>
          <span
            className="preview-header-tooltip preview-header-tooltip--specimen"
            style={{
              backgroundColor: hexWithAlpha(headerTooltip.themedBackground || headerTooltip.background, headerTooltip.transparency),
              color: headerTooltip.themedTitleFontColor || headerTooltip.titleFontColor,
              fontFamily: headerTooltip.fontFamily || undefined,
              fontSize: themeFontSizeToCssPx(headerTooltip.fontSize),
              fontWeight: headerTooltip.bold ? 700 : 400,
              fontStyle: headerTooltip.italic ? "italic" : "normal",
              textDecoration: headerTooltip.underline ? "underline" : "none",
            }}
          >
            {String(headerTooltip.type) === "Canvas"
              ? `Report page tooltip${headerTooltip.section ? `: ${headerTooltip.section}` : ""}`
              : String(headerTooltip.text) || "Header tooltip text"}
          </span>
        </section>
      )}

      {tooltip.show && (
        <section className="preview-inspector__group">
          <h3 className="preview-inspector__heading">Data tooltip</h3>
          <p className="preview-inspector__note">
            Only visible on hover in a real report, so it is shown here as a static example.
          </p>
          <button
            type="button"
            className="tooltip-preview-trigger"
            onClick={() => setShowTooltipPreview((value) => !value)}
            aria-expanded={showTooltipPreview}
          >
            {showTooltipPreview ? "Hide" : "Show"} tooltip preview
          </button>
          {showTooltipPreview && (
            <span
              className="preview-tooltip"
              style={{
                backgroundColor: hexWithAlpha(tooltip.themedBackground || tooltip.background, tooltip.transparency),
                fontFamily: tooltip.fontFamily || undefined,
                fontSize: themeFontSizeToCssPx(tooltip.fontSize),
                fontWeight: tooltip.bold ? 700 : 400,
                fontStyle: tooltip.italic ? "italic" : "normal",
                textDecoration: tooltip.underline ? "underline" : "none",
              }}
            >
              {tooltipIsReportPage ? (
                <span
                  className="preview-tooltip__page"
                  style={{ color: tooltip.themedTitleFontColor || tooltip.titleFontColor }}
                >
                  Report page tooltip{tooltip.section ? `: ${tooltip.section}` : ""}
                </span>
              ) : tooltip.showSentenceFormat && tooltip.sentenceTemplate ? (
                <span style={{ color: tooltip.themedValueFontColor || tooltip.valueFontColor }}>
                  {tooltip.sentenceTemplate}
                </span>
              ) : (
                <>
                  <span className="preview-tooltip__row">
                    <span style={{ color: tooltip.themedTitleFontColor || tooltip.titleFontColor }}>London</span>
                    <span
                      style={{
                        color: tooltip.themedValueFontColor || tooltip.valueFontColor,
                        fontWeight: tooltip.showValuesInBold ? 700 : undefined,
                      }}
                    >
                      2,480
                    </span>
                  </span>
                  {!tooltip.showTooltipFieldsOnly && tooltip.showChartSpecificTooltips && (
                    <span className="preview-tooltip__row">
                      <span style={{ color: tooltip.themedTitleFontColor || tooltip.titleFontColor }}>Share</span>
                      <span
                        style={{
                          color: tooltip.themedValueFontColor || tooltip.valueFontColor,
                          fontWeight: tooltip.showValuesInBold ? 700 : undefined,
                        }}
                      >
                        34%
                      </span>
                    </span>
                  )}
                  {tooltip.showActionsInTooltips && (
                    <span className="preview-tooltip__action" style={{ color: tooltip.actionFontColor }}>
                      ⤓ Drill through
                    </span>
                  )}
                </>
              )}
            </span>
          )}
        </section>
      )}
    </aside>
  );
}
