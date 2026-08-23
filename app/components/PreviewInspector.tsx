import { useState, type ReactNode } from "react";
import { hexWithAlpha } from "../lib/colorUtils";
import type { ResolvedChromeStyle } from "../lib/chromeProperties";
import type { InteractionState } from "../lib/properties";
import { StateSelector } from "./PropertyEditor";
import type { VisualKind } from "./VisualPreviews";

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

/**
 * True when the selected visual has anything to inspect. Used by the caller
 * so an empty region is never rendered — the design's guardrail against a
 * component gallery is partly that supporting content has to earn its
 * place, and a permanent empty card would be the first step the other way.
 */
export function hasInspectorContent(selected: VisualKind, chrome: ResolvedChromeStyle): boolean {
  return STATEFUL_VISUALS.has(selected) || chrome.visualTooltip.show;
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

  const isStateful = STATEFUL_VISUALS.has(selected);
  const tooltip = chrome.visualTooltip;
  const tooltipIsReportPage = String(tooltip.type) === "Canvas";

  if (!isStateful && !tooltip.show) return null;

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
                fontSize: tooltip.fontSize,
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
