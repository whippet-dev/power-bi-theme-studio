import assert from "node:assert/strict";
import test from "node:test";
import { canvasTextMeasure, resetCanvasTextMeasure } from "../app/lib/canvasTextMeasure";
import { estimateText } from "../app/lib/chartLayout";
import { BAR_CHART_BOX, computePreviewCartesianLayout } from "../app/components/previews/cartesianLayout";

/**
 * The measurer that lets a gutter be the width of the text it holds.
 *
 * Chrome's own metrics for the strings these previews draw, against the
 * 0.55em estimate, at 12px Segoe UI:
 *
 * | string | measured | estimated | error |
 * |---|---:|---:|---:|
 * | London | 40.359 | 39.600 | −1.9% |
 * | North West | 60.498 | 66.000 | +9.1% |
 * | Scotland | 45.885 | 52.800 | +15.1% |
 * | Applications | 65.197 | 79.200 | +21.5% |
 *
 * The per-string advance runs 0.453em to 0.561em, so the defect is not a
 * scale factor and no single constant removes it. Canvas measurement agreed
 * with the *rendered* width of those same labels in the live preview to
 * 0.02%.
 *
 * None of that is testable under `node --test`, which has no canvas — which
 * is the point of the fallback, and why these tests stub one.
 */

/** A canvas whose text is a fixed 7px per character, so widths are checkable. */
function stubCanvas(perChar = 7, options: { context?: boolean; width?: (t: string) => number } = {}) {
  const calls: string[] = [];
  const ctx = {
    font: "",
    measureText(text: string) {
      calls.push(`${this.font} ${text}`);
      return { width: options.width ? options.width(text) : text.length * perChar };
    },
  };
  (globalThis as { document?: unknown }).document = {
    createElement: () => ({ getContext: () => (options.context === false ? null : ctx) }),
  };
  resetCanvasTextMeasure();
  return { calls };
}

function withoutDocument() {
  delete (globalThis as { document?: unknown }).document;
  resetCanvasTextMeasure();
}

test("with no canvas it is exactly the deterministic estimator", () => {
  withoutDocument();
  for (const text of ["London", "North West", "Applications", ""]) {
    assert.deepEqual(canvasTextMeasure(text, 12, "Segoe UI"), estimateText(text, 12, "Segoe UI"));
  }
});

test("a null 2D context falls back rather than throwing mid-layout", () => {
  stubCanvas(7, { context: false });
  assert.deepEqual(canvasTextMeasure("London", 12, "Segoe UI"), estimateText("London", 12, "Segoe UI"));
  withoutDocument();
});

test("with a canvas it reports the measured width", () => {
  stubCanvas(7);
  const m = canvasTextMeasure("London", 12, "Segoe UI");
  assert.equal(m.width, 42, "6 characters x 7px, not 6 x 12 x 0.55");
  assert.notEqual(m.width, estimateText("London", 12, "Segoe UI").width);
  withoutDocument();
});

test("height stays the heuristic: only width had a defect worth fixing", () => {
  // Chrome reports Segoe UI's font bounding box as 16px at 12px against the
  // heuristic's 16.2 - 1.2%, where width was out by up to 21.5%. The
  // legibility floor derives from this same rule, so it is left alone.
  stubCanvas(7);
  assert.equal(canvasTextMeasure("London", 12, "Segoe UI").height, estimateText("London", 12, "Segoe UI").height);
  withoutDocument();
});

test("the font shorthand carries the size and the family the renderer paints", () => {
  const { calls } = stubCanvas(7);
  canvasTextMeasure("North West", 13.3333, "'Segoe UI', helvetica, sans-serif");
  assert.equal(calls[0], "13.3333px 'Segoe UI', helvetica, sans-serif North West");
  withoutDocument();
});

test("repeated measurements of one string hit the cache", () => {
  const { calls } = stubCanvas(7);
  for (let i = 0; i < 5; i++) canvasTextMeasure("Scotland", 12, "Segoe UI");
  assert.equal(calls.length, 1, "measured once");
  // A different size is a different measurement, not a cache hit.
  canvasTextMeasure("Scotland", 16, "Segoe UI");
  assert.equal(calls.length, 2);
  withoutDocument();
});

test("a context that measures to nothing is treated as unavailable", () => {
  stubCanvas(7, { width: () => 0 });
  assert.equal(canvasTextMeasure("London", 12, "Segoe UI").width, estimateText("London", 12, "Segoe UI").width);
  stubCanvas(7, { width: () => Number.NaN });
  assert.equal(canvasTextMeasure("London", 12, "Segoe UI").width, estimateText("London", 12, "Segoe UI").width);
  withoutDocument();
});

test("an empty string never reaches the canvas", () => {
  const { calls } = stubCanvas(7);
  assert.deepEqual(canvasTextMeasure("", 12, "Segoe UI"), estimateText("", 12, "Segoe UI"));
  assert.equal(calls.length, 0);
  withoutDocument();
});

// ---------------------------------------------------------------------------
// The preview boundary
// ---------------------------------------------------------------------------

const AXIS = {
  show: true,
  fontSize: 9,
  fontFamily: "Segoe UI",
  titleFontSize: 12,
  titleFontFamily: "Segoe UI",
  showTitle: false,
  showAxisTitle: false,
  titleText: "",
};

const layoutWith = () =>
  computePreviewCartesianLayout({
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    categoryAxis: { ...AXIS },
    valueAxis: { ...AXIS },
    categories: ["London", "North West", "Scotland", "Wales"],
    dataMax: 46,
    innerPadding: 20,
  });

test("previews measure with the browser when there is one", () => {
  withoutDocument();
  const estimated = layoutWith();
  // 30px per character dwarfs any estimate, so the category gutter must move
  // if - and only if - the browser measurer is actually reaching the engine.
  stubCanvas(30);
  const measured = layoutWith();
  assert.ok(
    measured.plot.width < estimated.plot.width,
    "a wider measured label leaves less plot",
  );
  withoutDocument();
  assert.deepEqual(layoutWith().plot, estimated.plot, "and back again once the canvas is gone");
});
