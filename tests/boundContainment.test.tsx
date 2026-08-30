import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CartesianDataLabel, type DataLabelStyle } from "../app/components/ChartParts";
import { fractionIsOnPlot } from "../app/lib/constantLine";

/**
 * Containment for the two things the mark fix did not cover.
 *
 * Reference lines and data labels are both positioned from the unclamped
 * `valueFraction`, which is correct for asking where a value WOULD be and
 * wrong for deciding what to paint. Both reproduced in the browser on the
 * Clustered Column hero with Start=30000, plot height 209.7px: the
 * reference line rendered at `bottom: -145%`, 302.8px below the plot, and
 * ten of twelve labels sat outside it, the furthest 217.7px below.
 *
 * The percentages used below are the ones that produced those failures.
 */

const LABELS: DataLabelStyle = {
  show: true,
  color: "#333333",
  fontFamily: "Segoe UI",
  fontSize: 9,
  bold: false,
  italic: false,
  underline: false,
  transparency: 0,
  labelDisplayUnits: "1000",
  labelPrecision: 0,
  labelPosition: "Auto",
  labelContentLayout: "stacked",
  labelContainerMaxWidth: 100,
  enableBackground: false,
  backgroundColor: "#ffffff",
  backgroundTransparency: 0,
  enableTitleDataLabel: false,
  enableValueDataLabel: true,
  enableDetailDataLabel: false,
} as DataLabelStyle;

const label = (over: Partial<Record<"startPercent" | "endPercent", number>> & { position?: string } = {}) =>
  renderToStaticMarkup(
    <CartesianDataLabel
      labels={{ ...LABELS, labelPosition: over.position ?? "Auto" }}
      category="London"
      value={46_000}
      orientation="vertical"
      startPercent={over.startPercent ?? 0}
      endPercent={over.endPercent ?? 60}
      crossPercent={25}
    />,
  );

// ---------------------------------------------------------------------------
// Reference lines
// ---------------------------------------------------------------------------

test("an on-plot reference line is still drawn, including on the edges", () => {
  assert.equal(fractionIsOnPlot(0), true, "a line on the axis is ordinary, not a boundary case");
  assert.equal(fractionIsOnPlot(1), true, "a line at the very top is on the plot");
  assert.equal(fractionIsOnPlot(0.5), true);
});

test("a reference line outside the displayed range is not drawn", () => {
  // The measured failure: bottom -145%.
  assert.equal(fractionIsOnPlot(-1.45), false);
  assert.equal(fractionIsOnPlot(-0.0001), false);
  assert.equal(fractionIsOnPlot(1.0001), false);
  assert.equal(fractionIsOnPlot(Number.NaN), false, "a non-numeric value has no position");
});

// ---------------------------------------------------------------------------
// Data labels
// ---------------------------------------------------------------------------

test("auto-range labels are unchanged: same anchor, still rendered", () => {
  const markup = label({ startPercent: 0, endPercent: 60 });
  assert.match(markup, /chart-data-label-anchor/);
  assert.match(markup, /bottom:60%/, "an end-anchored label still sits at the mark's end");
});

test("a label for a mark entirely outside the range is not rendered", () => {
  // Start above the value: the whole span sits below the plot, and the mark
  // itself now has zero extent, so there is nothing for a label to belong to.
  assert.equal(label({ startPercent: -80, endPercent: -30 }), "");
  // End below the value: the whole span sits above the plot.
  assert.equal(label({ startPercent: 140, endPercent: 260 }), "");
});

test("a label for a partially clipped mark follows the visible end", () => {
  // A column crossing an explicit Start: baseline off the plot, top visible.
  const clippedBelow = label({ startPercent: -145, endPercent: 40 });
  assert.match(clippedBelow, /chart-data-label-anchor/, "the label is kept");
  assert.match(clippedBelow, /bottom:40%/, "and still marks the value, which is on the plot");

  // A column crossing an explicit End: baseline visible, top off the plot.
  const clippedAbove = label({ startPercent: 0, endPercent: 320 });
  assert.match(clippedAbove, /chart-data-label-anchor/);
  assert.match(clippedAbove, /bottom:100%/, "the anchor stops at the plot edge, not at 320%");
});

test("a mark touching the range boundary keeps its label", () => {
  // Exactly on the edge is in range, not out of it.
  assert.notEqual(label({ startPercent: 100, endPercent: 140 }), "");
  assert.notEqual(label({ startPercent: -40, endPercent: 0 }), "");
});

test("InsideEnd and OutsideEnd are untouched where the mark is visible", () => {
  // The clamp is identity in auto range, so placement is decided from
  // exactly the values it was decided from before.
  for (const position of ["InsideEnd", "OutsideEnd", "InsideCenter", "InsideBase"]) {
    const markup = label({ startPercent: 0, endPercent: 60, position });
    assert.match(markup, /chart-data-label-anchor/, `${position} still renders`);
    assert.match(markup, /data-label-placement=/, `${position} still reports a placement`);
  }
  // The two end placements differ from each other, so the distinction survives.
  assert.notEqual(
    label({ startPercent: 0, endPercent: 60, position: "InsideEnd" }),
    label({ startPercent: 0, endPercent: 60, position: "OutsideEnd" }),
  );
});

test("a zero-length mark inside the range still gets its label", () => {
  // Guards the rule against over-reach: a value equal to its baseline has a
  // zero-extent span but is genuinely on the plot, so it must not be
  // mistaken for a clipped-out mark.
  assert.notEqual(label({ startPercent: 0, endPercent: 0 }), "");
});
