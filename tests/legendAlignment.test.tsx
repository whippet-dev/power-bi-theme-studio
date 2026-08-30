import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartLegend, type LegendStyle } from "../app/components/ChartParts";

/**
 * Horizontal legend alignment.
 *
 * TopCenter, TopRight, BottomCenter and BottomRight all rendered flush left,
 * indistinguishable from the default. The alignment logic was right the whole
 * time -- `legendHorizontalAlignment` is covered in chartParts.test.ts and was
 * always returning "center"/"flex-end". The box was wrong: the authored band
 * is a flex row, so the legend sat at the default `flex: 0 1 auto` and
 * shrink-wrapped to its content. justify-content had no free space to
 * distribute. Measured in the browser: a 555px band holding a 258.7px legend,
 * with the entries in the identical position for Top and TopCenter.
 *
 * So these cover both halves: that the component asks for the right
 * alignment, and that the stylesheet gives it a box wide enough to apply it.
 */

const LEGEND: LegendStyle = {
  show: true,
  position: "Top",
  showTitle: true,
  titleText: "Series",
  labelColor: "#333333",
  fontFamily: "Segoe UI",
  fontSize: 9,
  bold: false,
  italic: false,
  underline: false,
};

const ITEMS = [
  { label: "Online", color: "#118DFF" },
  { label: "Phone", color: "#12239E" },
];

function markupFor(position: string): string {
  return renderToStaticMarkup(<ChartLegend legend={{ ...LEGEND, position }} items={ITEMS} />);
}

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("horizontal legends ask for the alignment their position implies", () => {
  // The four that were broken.
  assert.match(markupFor("TopCenter"), /justify-content:center/);
  assert.match(markupFor("TopRight"), /justify-content:flex-end/);
  assert.match(markupFor("BottomCenter"), /justify-content:center/);
  assert.match(markupFor("BottomRight"), /justify-content:flex-end/);

  // The one that always worked, and must keep working.
  assert.match(markupFor("Top"), /justify-content:flex-start/);
  assert.match(markupFor("Bottom"), /justify-content:flex-start/);
});

test("side legends keep their own geometry and take no inline alignment", () => {
  for (const position of ["Left", "RightCenter"]) {
    const markup = markupFor(position);
    assert.match(markup, /chart-legend--vertical/, `${position} stays a vertical legend`);
    assert.doesNotMatch(
      markup,
      /justify-content/,
      `${position} must not gain an inline alignment -- legendExtent owns its band`,
    );
  }
});

test("the stylesheet lets a horizontal legend fill its band, and excludes side legends", () => {
  const rule = css.match(
    /\.chart-preview__legend-band > \.chart-legend:not\(\.chart-legend--vertical\) \{([^}]*)\}/,
  );
  assert.ok(rule, "the legend must be allowed to grow inside its band");
  assert.match(rule![1], /flex-grow:\s*1/, "without this the legend shrink-wraps and alignment is inert");
  // Excluding vertical legends is load-bearing, not decorative: a side
  // legend's band width comes from legendExtent and must stay its own.
  assert.match(
    css,
    /\.chart-preview__legend-band > \.chart-legend:not\(\.chart-legend--vertical\)/,
    "side legends must be excluded from the growth rule",
  );
});

test("the band is a flex row for authored horizontal legends, which is why the rule is needed", () => {
  // If this stops being true the growth rule above becomes dead code rather
  // than silently wrong, so it is worth pinning the assumption it rests on.
  assert.match(
    css,
    /\.chart-preview--authored:not\(\.chart-preview--legend-side\):not\(\.chart-preview--legend-after\) \.chart-preview__legend-band \{\s*display: flex/,
  );
});
