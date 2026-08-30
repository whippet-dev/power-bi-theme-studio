import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getBaseTheme } from "../app/lib/baseThemes";
import { resolveChromeStyle } from "../app/lib/chromeProperties";
import { themeLayers } from "../app/lib/properties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";
import { hasInspectorContent, PreviewInspector } from "../app/components/PreviewInspector";

/**
 * The preview composition, as settled in PREVIEW_COMPOSITION_DESIGN.md 1.4:
 * the simulated report page holds the authored visual, Studio's supporting
 * region sits below it, and the thumbnail gallery below that.
 *
 * These pin the three things that were easy to get wrong and invisible in a
 * unit test otherwise: that report chrome left the tiles, that supporting
 * content is contextual rather than permanent, and that the authored visual
 * has a container of its own.
 */

const EMPTY_THEME: PowerBITheme = { name: "No custom overrides", visualStyles: {} };

function chromeFor(custom: PowerBITheme = EMPTY_THEME) {
  const source = themeLayers(custom, getBaseTheme("classic2026"));
  return resolveChromeStyle(source, "clusteredColumnChart", resolveTheme(source.roots));
}

const gallerySource = readFileSync(new URL("../app/components/VisualPreviews.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("the visual header and its hover simulation are gone from every preview tile", () => {
  assert.doesNotMatch(gallerySource, /className="visual-header/);
  assert.doesNotMatch(gallerySource, /showHeaderTooltipPreview|onMouseEnter|onMouseLeave/);
  assert.doesNotMatch(cssSource, /\.visual-header/);
});

test("the report page holds the hero, then supporting content, then the gallery", () => {
  const page = gallerySource.indexOf('className="report-page"');
  const supporting = gallerySource.indexOf("{supporting}");
  const thumbs = gallerySource.indexOf('className="visual-thumbnails"');
  assert.ok(page > 0 && supporting > page, "supporting content follows the report page");
  assert.ok(thumbs > supporting, "the thumbnail gallery follows supporting content");
  // The thumbnails must not be inside the simulated report page.
  const pageClose = gallerySource.indexOf("{showFilterPane &&");
  assert.ok(thumbs > pageClose, "thumbnails are outside .report-surface");
});

test("the authored visual has its own container inside a neutral stage", () => {
  const stage = gallerySource.indexOf('className="visual-stage"');
  const frame = gallerySource.indexOf('className="visual-frame"');
  assert.ok(stage > 0 && frame > stage, "the frame is nested inside the stage");
  assert.match(cssSource, /\.visual-stage \{[^}]*padding: var\(--visual-stage-pad\)/);
});

test("supporting content is contextual: only the open formatting group's specimen", () => {
  const chrome = chromeFor();

  // Nothing open, nothing to support.
  assert.equal(hasInspectorContent("column", chrome, null), false);
  // A group that renders honestly on the hero needs no specimen.
  assert.equal(hasInspectorContent("column", chrome, "chrome:title"), false);
  // The header's own group does.
  assert.equal(hasInspectorContent("column", chrome, "chrome:visualHeader"), true);
  // Interaction states belong to the stateful visuals' own groups only.
  assert.equal(hasInspectorContent("actionButton", chrome, "actionButton:fill"), true);
  assert.equal(hasInspectorContent("column", chrome, "column:fill"), false);
});

test("the inspector renders nothing at all when no specimen is relevant", () => {
  const chrome = chromeFor();
  const markup = renderToStaticMarkup(
    <PreviewInspector
      selected="column"
      label="Clustered column chart"
      chrome={chrome}
      previewInteractionState="default"
      onPreviewInteractionStateChange={() => undefined}
      openGroupId={null}
    />,
  );
  assert.equal(markup, "");
});

test("the header specimen shows the icons the theme enables, and says so", () => {
  const withIcon = updateThemeValue(
    updateThemeValue(EMPTY_THEME, ["visualStyles", "*", "*", "visualHeader", 0, "show"], true),
    ["visualStyles", "*", "*", "visualHeader", 0, "showFocusModeButton"],
    true,
  ) as PowerBITheme;
  const markup = renderToStaticMarkup(
    <PreviewInspector
      selected="column"
      label="Clustered column chart"
      chrome={chromeFor(withIcon)}
      previewInteractionState="default"
      onPreviewInteractionStateChange={() => undefined}
      openGroupId="chrome:visualHeader"
    />,
  );
  assert.match(markup, /header-specimen/);
  assert.match(markup, /Focus mode/);
});

/**
 * The report surface must not scroll horizontally in normal fitted mode.
 *
 * It did once: .report-page reserves the hero's slot by multiplying a width
 * by --hero-max-scale, and when the tile width grew to include the stage
 * padding, that padding got magnified 1.5x too. The reservation plus the
 * filter pane then exceeded anything .report-surface could offer at its own
 * max-width, so the scrollbar appeared at every viewport size rather than
 * only narrow ones.
 *
 * The arithmetic, not the rendering, is what regressed, so this checks the
 * arithmetic. FILTER_PANE_FOOTPRINT is measured rather than declared -- the
 * pane is content-sized -- so if it changes this test should fail and be
 * updated deliberately.
 */
const FILTER_PANE_FOOTPRINT = 320 + 18; // measured width + margin-left

function cssNumber(name: string): number {
  const match = cssSource.match(new RegExp(`${name}:\\s*(\\d+(?:\\.\\d+)?)`));
  assert.ok(match, `${name} is declared`);
  return Number(match![1]);
}

test("the report page and filter pane fit the report surface without scrolling", () => {
  const canvasMax = cssNumber("--canvas-max-width");
  const frame = cssNumber("--authored-frame-width");
  const stagePad = cssNumber("--visual-stage-pad");
  const pagePad = cssNumber("--report-page-padding");
  const maxScale = cssNumber("--hero-max-scale");

  // .report-surface has 18px padding either side inside its max-width.
  const availableInsideSurface = canvasMax - 18 * 2;
  const pageReserved = frame * maxScale + stagePad * 2 + pagePad * 2;

  assert.ok(
    pageReserved + FILTER_PANE_FOOTPRINT <= availableInsideSurface,
    `report page reserves ${pageReserved}px + ${FILTER_PANE_FOOTPRINT}px filter pane ` +
      `= ${pageReserved + FILTER_PANE_FOOTPRINT}px, which must fit ${availableInsideSurface}px`,
  );

  // The authored visual keeps its pre-scale width; the stage is around it.
  assert.equal(frame, 420);
  assert.ok(stagePad >= 20, "the stage keeps room for borders and shadows");
});

test("the hero slot reserves the authored visual at scale, not the stage padding", () => {
  // The stage is fixed breathing room. Scaling it is what caused the
  // overflow, so the reservation must not multiply the tile width.
  const reservation = cssSource.match(/\.report-page \{[\s\S]*?min-width: calc\(([\s\S]*?)\);/);
  assert.ok(reservation, ".report-page declares a min-width reservation");
  assert.match(reservation![1], /--authored-frame-width\) \* var\(--hero-max-scale\)/);
  assert.doesNotMatch(reservation![1], /--hero-tile-width\) \* var\(--hero-max-scale\)/);
});
