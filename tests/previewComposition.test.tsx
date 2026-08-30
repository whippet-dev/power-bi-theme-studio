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
