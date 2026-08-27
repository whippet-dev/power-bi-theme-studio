import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  LINE_CHART_BOX,
  authoredChromeExtent,
  authoredInnerBox,
  legendBandExtent,
  visualTitleBandExtent,
} from "../app/components/previews/cartesianLayout";

const lineSource = readFileSync(new URL("../app/components/previews/LineChartPreview.tsx", import.meta.url), "utf8");
const gallerySource = readFileSync(new URL("../app/components/VisualPreviews.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const measure = (text: string, fontSize: number) => ({ width: text.length * fontSize * 0.5, height: fontSize * 1.35 });
const title = { show: true, text: "Applications over time", fontSize: 12, fontFamily: "Segoe UI" };
const legend = { show: true, position: "Top", fontSize: 9, fontFamily: "Segoe UI", showTitle: false, titleText: "" };

test("Line uses the measured 450 x 300 authored visual box", () => {
  assert.deepEqual(LINE_CHART_BOX, { x: 0, y: 0, width: 450, height: 300 });
  assert.doesNotMatch(lineSource, /372|150/);
});

test("normal Line renders in a fixed authored boundary and scales only afterwards", () => {
  assert.match(lineSource, /<PresentationScale width=\{LINE_CHART_BOX\.width\}>/);
  assert.match(lineSource, /chart-preview chart-preview--authored/);
  assert.match(lineSource, /width: LINE_CHART_BOX\.width, height: LINE_CHART_BOX\.height/);
  assert.match(lineSource, /box: authoredInner/);
  assert.match(lineSource, /width: authoredInner\.width, height: authoredInner\.height/);
  assert.match(cssSource, /\.chart-preview--authored\s*\{[\s\S]*?overflow: hidden;/);
});

test("Line title and legend spend the 450 x 300 authored budget", () => {
  const titleBand = visualTitleBandExtent(title as never, "", 0, measure);
  const legendBand = legendBandExtent(legend as never, ["Online", "Phone", "Post"], measure);
  const inner = authoredInnerBox(LINE_CHART_BOX, authoredChromeExtent([titleBand, legendBand]));
  assert.ok(titleBand.height > 0 && legendBand.height > 0);
  assert.equal(inner.width, 450);
  assert.equal(titleBand.height + legendBand.height + inner.height, 300);
  assert.ok(inner.height < 300);
});

test("hiding Line title and legend returns all their authored space", () => {
  const shownTitle = visualTitleBandExtent(title as never, "", 0, measure);
  const shownLegend = legendBandExtent(legend as never, ["Online", "Phone", "Post"], measure);
  const shown = authoredInnerBox(LINE_CHART_BOX, authoredChromeExtent([shownTitle, shownLegend]));
  const hiddenTitle = visualTitleBandExtent({ ...title, show: false } as never, "", 0, measure);
  const hiddenLegend = legendBandExtent({ ...legend, show: false } as never, ["Online", "Phone", "Post"], measure);
  const hidden = authoredInnerBox(LINE_CHART_BOX, authoredChromeExtent([hiddenTitle, hiddenLegend]));
  assert.equal(hidden.height, 300);
  assert.equal(hidden.height - shown.height, shownTitle.height + shownLegend.height);
});

test("normal Line has one internal title owner and small multiples do not repeat it", () => {
  assert.equal((lineSource.match(/className="chart-preview__visual-title"/g) ?? []).length, 1);
  assert.match(gallerySource, /const lineContent = <LineChartPreview[\s\S]*?titleChrome=\{chromeStyles\.line\.title\}[\s\S]*?titleFallback="Applications over time"/);
  assert.match(gallerySource, /id: "line",[\s\S]*?titleInsideVisual: !lineUsesSmallMultiples/);
  assert.match(gallerySource, /const lineSmallMultipleContent = <LineChartPreview lineChartStyle=\{lineChartStyle\} palette=\{palette\} \/>;/);
  assert.match(gallerySource, /content=\{lineSmallMultipleContent\}/);
  assert.match(gallerySource, /chrome\.title\.show && !titleInsideVisual/);
});

test("authored Line neutralises its old plot margin", () => {
  assert.match(
    cssSource,
    /\.chart-preview--authored \.chart-preview__body,[\s\S]*?\.chart-preview--authored \.line-preview__plot\s*\{\s*margin-top: 0;/,
  );
  assert.match(lineSource, /right: secondaryGutter/,
    "the canonical plot must pay for the secondary gutter");
});
