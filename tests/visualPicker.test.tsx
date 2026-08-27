import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isStatefulPreviewVisual } from "../app/components/PreviewInspector";
import { VisualRail } from "../app/components/VisualRail";
import {
  ALL_VISUALS,
  DEFAULT_HERO_VISUAL,
  splitHeroVisuals,
  VISUAL_CATALOG,
  VISUAL_LABEL,
  type VisualKind,
} from "../app/components/visualCatalog";

const EXPECTED_LABELS: Record<VisualKind, string> = {
  card: "Card",
  bar: "Clustered bar chart",
  column: "Clustered column chart",
  stackedBar: "Stacked bar chart",
  stackedColumn: "Stacked column chart",
  line: "Line chart",
  table: "Table",
  matrix: "Matrix",
  pie: "Pie chart",
  slicer: "Slicer",
  shape: "Shape",
  actionButton: "Button",
  bookmarkNavigator: "Bookmark navigator",
  pageNavigator: "Page navigator",
  textbox: "Text box",
  image: "Image",
};

test("the picker exposes every supported visual with canonical Power BI-facing names", () => {
  assert.equal(VISUAL_CATALOG.length, 16);
  assert.deepEqual(ALL_VISUALS, VISUAL_CATALOG.map(({ id }) => id));
  assert.deepEqual(VISUAL_LABEL, EXPECTED_LABELS);
  assert.equal(VISUAL_LABEL.bar, "Clustered bar chart");
  assert.equal(VISUAL_LABEL.column, "Clustered column chart");
});

test("Clustered column is the default Hero and all other visuals remain thumbnails", () => {
  const source = VISUAL_CATALOG.map((entry) => ({ ...entry }));
  const before = structuredClone(source);
  const { hero, thumbnails } = splitHeroVisuals(source, DEFAULT_HERO_VISUAL);

  assert.equal(DEFAULT_HERO_VISUAL, "column");
  assert.equal(hero?.id, "column");
  assert.equal(thumbnails.length, 15);
  assert.ok(thumbnails.some(({ id }) => id === "bar"));
  assert.deepEqual(source, before, "display ordering must not mutate the catalogue");
});

test("selecting another visual promotes it and returns the old Hero to thumbnails", () => {
  const first = splitHeroVisuals(VISUAL_CATALOG, "column");
  const next = splitHeroVisuals(VISUAL_CATALOG, "line");

  assert.equal(first.hero?.id, "column");
  assert.equal(next.hero?.id, "line");
  assert.ok(next.thumbnails.some(({ id }) => id === "column"));
  assert.equal(next.thumbnails.length, 15);
});

test("the rail has one accessible selection button per visual and no membership controls", () => {
  const markup = renderToStaticMarkup(<VisualRail selected="column" onSelect={() => undefined} />);

  assert.match(markup, /aria-label="Visual previews"/);
  assert.equal((markup.match(/<button/g) ?? []).length, VISUAL_CATALOG.length);
  assert.equal((markup.match(/data-visual-icon=/g) ?? []).length, VISUAL_CATALOG.length);
  assert.equal((markup.match(/aria-hidden="true"/g) ?? []).length, VISUAL_CATALOG.length);
  assert.equal((markup.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.doesNotMatch(markup, /checkbox|disabled|Add .*canvas|Remove .*canvas|On canvas|title="Hidden"/i);
  for (const label of Object.values(EXPECTED_LABELS)) assert.match(markup, new RegExp(`>${label}<`));
});

test("gallery and editor consume the canonical label source and no visibility filter remains", () => {
  const gallery = readFileSync(new URL("../app/components/VisualPreviews.tsx", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../app/components/PropertyEditor.tsx", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../app/components/ThemeStudio.tsx", import.meta.url), "utf8");

  assert.match(gallery, /VISUAL_LABEL/);
  assert.match(editor, /VISUAL_LABEL\[selected\]/);
  assert.match(gallery, /splitHeroVisuals\(descriptors, selected\)/);
  assert.doesNotMatch(`${gallery}\n${studio}`, /visibleVisuals|onToggleVisible|handleToggleVisible|visibility=/);
  assert.doesNotMatch(`${gallery}\n${editor}\n${studio}`, /Bar chart"|Column chart"|Textbox"/);
});

test("Hero-only interaction-state support remains attached to buttons and navigators", () => {
  assert.equal(isStatefulPreviewVisual("actionButton"), true);
  assert.equal(isStatefulPreviewVisual("bookmarkNavigator"), true);
  assert.equal(isStatefulPreviewVisual("pageNavigator"), true);
  assert.equal(isStatefulPreviewVisual("column"), false);
});
