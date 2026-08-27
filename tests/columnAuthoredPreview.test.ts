import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COLUMN_CHART_BOX,
  authoredChromeExtent,
  authoredInnerBox,
  legendBandExtent,
  visualTitleBandExtent,
} from "../app/components/previews/cartesianLayout";

const clusteredSource = readFileSync(
  new URL("../app/components/previews/ColumnChartPreview.tsx", import.meta.url),
  "utf8",
);
const stackedSource = readFileSync(
  new URL("../app/components/previews/StackedColumnChartPreview.tsx", import.meta.url),
  "utf8",
);
const gallerySource = readFileSync(new URL("../app/components/VisualPreviews.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const measure = (text: string, fontSize: number) => ({
  width: text.length * fontSize * 0.5,
  height: fontSize * 1.35,
});

const title = {
  show: true,
  text: "Applications by region",
  fontSize: 12,
  fontFamily: "Segoe UI",
  fontFamilyCss: "Segoe UI",
};

const legend = {
  show: true,
  position: "Top",
  fontSize: 9,
  fontFamily: "Segoe UI",
  showTitle: false,
  titleText: "",
};

test("both Column renderers opt into the fixed authored visual boundary", () => {
  for (const [name, source] of [
    ["Clustered Column", clusteredSource],
    ["Stacked Column", stackedSource],
  ] as const) {
    assert.match(source, /className=\{`chart-preview chart-preview--authored/,
      `${name} must use authored mode`);
    assert.match(source, /width: COLUMN_CHART_BOX\.width, height: COLUMN_CHART_BOX\.height/,
      `${name} root must receive both real authored dimensions`);
    assert.match(source, /<PresentationScale width=\{COLUMN_CHART_BOX\.width\}>/,
      `${name} must scale only after authored layout`);
  }
});

test("the Column authored root neutralises both legacy vertical margins", () => {
  assert.match(
    cssSource,
    /\.chart-preview--authored \.chart-preview__body,\s*\.chart-preview--authored \.bar-preview__plot,\s*\.chart-preview--authored \.column-preview__plot,\s*\.chart-preview--authored \.line-preview__plot\s*\{\s*margin-top: 0;/,
  );
});

test("title and legend consume the shared 450 x 300 authored budget", () => {
  assert.deepEqual(COLUMN_CHART_BOX, { x: 0, y: 0, width: 450, height: 300 });
  const titleBand = visualTitleBandExtent(title as never, "", 0, measure);
  const legendBand = legendBandExtent(legend as never, ["Online", "Phone", "Post"], measure);
  const chrome = authoredChromeExtent([titleBand, legendBand]);
  const inner = authoredInnerBox(COLUMN_CHART_BOX, chrome);

  assert.ok(titleBand.height > 0 && legendBand.height > 0);
  assert.equal(inner.width, 450);
  assert.equal(titleBand.height + legendBand.height + inner.height, 300,
    "chrome plus chart must remain exactly the authored height");
});

test("hiding Column title and legend returns their space to the chart", () => {
  const shownTitle = visualTitleBandExtent(title as never, "", 0, measure);
  const shownLegend = legendBandExtent(legend as never, ["Online", "Phone", "Post"], measure);
  const shownInner = authoredInnerBox(COLUMN_CHART_BOX, authoredChromeExtent([shownTitle, shownLegend]));

  const hiddenTitle = visualTitleBandExtent({ ...title, show: false } as never, "", 0, measure);
  const hiddenLegend = legendBandExtent({ ...legend, show: false } as never, ["Online", "Phone", "Post"], measure);
  const hiddenInner = authoredInnerBox(COLUMN_CHART_BOX, authoredChromeExtent([hiddenTitle, hiddenLegend]));

  assert.equal(hiddenInner.height, 300);
  assert.ok(
    Math.abs(hiddenInner.height - shownInner.height - (shownTitle.height + shownLegend.height)) < 1e-9,
    "all title and legend height returns to the chart",
  );
});

test("Clustered and Stacked Column share one box and one internal title owner", () => {
  for (const source of [clusteredSource, stackedSource]) {
    assert.equal((source.match(/COLUMN_CHART_BOX/g) ?? []).length > 1, true);
    assert.equal((source.match(/className="chart-preview__visual-title"/g) ?? []).length, 1,
      "each renderer owns exactly one visual-title element");
  }

  assert.match(gallerySource, /id: "column"[^\n]+titleInsideVisual: true/);
  assert.match(gallerySource, /id: "stackedColumn"[^\n]+titleInsideVisual: true/);
  assert.match(gallerySource, /chrome\.title\.show && !titleInsideVisual/,
    "the tile must suppress its legacy outer title when the visual owns it");
});

test("the old 372 x 128 Column constraint cannot re-enter authored layout", () => {
  for (const source of [clusteredSource, stackedSource]) {
    assert.doesNotMatch(source, /372|128/);
  }
  assert.doesNotMatch(cssSource, /\.column-preview__plot\s*\{[\s\S]*?height\s*:\s*128px/);
});
