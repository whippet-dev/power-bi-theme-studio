import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  visualSubtitleBandExtent,
  visualSubtitleStyle,
  visualTitleBandExtent,
  visualTitleStyle,
} from "../app/components/previews/cartesianLayout";

/**
 * Cartesian visual title and subtitle alignment.
 *
 * Both bands are flex rows -- that is how the text is centred vertically
 * inside the exact height reserved for it -- so their text is an anonymous
 * flex item, and `text-align` cannot position a flex item. The resolved
 * alignment reached the element and did nothing: measured in the browser,
 * left, center and right all rendered the title at gapLeft 0 in a 555px band,
 * with `text-align` computing correctly as left/center/right each time.
 *
 * So these check the half that was missing (`justify-content`) alongside the
 * half that was already right, and pin the band geometry that must not move
 * when only alignment changes.
 */

const measure = (text: string, fontSize: number) => ({
  width: text.length * fontSize * 0.5,
  height: fontSize * 1.35,
});

const titleOf = (over: Record<string, unknown> = {}) => ({
  show: true,
  text: "Applications by region",
  fontSize: 12,
  fontFamily: "Segoe UI",
  fontFamilyCss: "Segoe UI",
  alignment: "left",
  ...over,
});

const subtitleOf = (over: Record<string, unknown> = {}) => ({
  show: true,
  text: "Comparison period: current year",
  fontSize: 10,
  fontFamily: "Segoe UI",
  alignment: "left",
  fontColor: "#605E5C",
  bold: false,
  italic: false,
  underline: false,
  ...over,
});

const titleBand = () => visualTitleBandExtent(titleOf() as never, "", 0, measure);
const subtitleBand = () => visualSubtitleBandExtent(subtitleOf() as never, 3, 5, measure);

test("a cartesian title aligns left, centre and right", () => {
  const band = titleBand();
  const cases: Array<[string, string]> = [
    ["left", "flex-start"],
    ["center", "center"],
    ["right", "flex-end"],
  ];
  for (const [alignment, justify] of cases) {
    const style = visualTitleStyle(titleOf({ alignment }) as never, band);
    assert.equal(style.justifyContent, justify, `title "${alignment}" positions its text`);
    // text-align is kept as well: it aligns the lines inside a wrapped title.
    assert.equal(style.textAlign, alignment);
  }
});

test("a cartesian subtitle aligns left, centre and right, independently of the title", () => {
  const band = subtitleBand();
  const cases: Array<[string, string]> = [
    ["left", "flex-start"],
    ["center", "center"],
    ["right", "flex-end"],
  ];
  for (const [alignment, justify] of cases) {
    const style = visualSubtitleStyle(subtitleOf({ alignment }) as never, band, "#ffffff");
    assert.equal(style.justifyContent, justify, `subtitle "${alignment}" positions its text`);
    assert.equal(style.textAlign, alignment);
  }

  // A centred title must not drag the subtitle with it.
  const title = visualTitleStyle(titleOf({ alignment: "center" }) as never, titleBand());
  const subtitle = visualSubtitleStyle(subtitleOf({ alignment: "right" }) as never, band, "#ffffff");
  assert.equal(title.justifyContent, "center");
  assert.equal(subtitle.justifyContent, "flex-end");
});

test("alignment does not disturb the band geometry the plot is laid out around", () => {
  // The bug is purely about where text sits inside a band whose size was
  // already reserved. If alignment changed any of these, the plot would move.
  const band = titleBand();
  const sub = subtitleBand();
  const geometryOf = (style: Record<string, unknown>) => ({
    height: style.height,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    whiteSpace: style.whiteSpace,
    overflow: style.overflow,
    textOverflow: style.textOverflow,
    fontSize: style.fontSize,
  });

  const titleLeft = geometryOf(visualTitleStyle(titleOf({ alignment: "left" }) as never, band));
  for (const alignment of ["center", "right"]) {
    assert.deepEqual(
      geometryOf(visualTitleStyle(titleOf({ alignment }) as never, band)),
      titleLeft,
      `title geometry is identical for "${alignment}"`,
    );
  }

  const subLeft = geometryOf(visualSubtitleStyle(subtitleOf({ alignment: "left" }) as never, sub, "#fff"));
  for (const alignment of ["center", "right"]) {
    assert.deepEqual(
      geometryOf(visualSubtitleStyle(subtitleOf({ alignment }) as never, sub, "#fff")),
      subLeft,
      `subtitle geometry is identical for "${alignment}"`,
    );
  }
});

test("title-only and subtitle-only keep their own alignment and spacing", () => {
  // Title with no subtitle: the title still owns its band and its gap below.
  const title = visualTitleStyle(titleOf({ alignment: "right" }) as never, titleBand());
  assert.equal(title.justifyContent, "flex-end");
  assert.equal(title.height, titleBand().textHeight);

  // Subtitle with no title: spaceAbove/spaceBelow are still its own.
  const band = subtitleBand();
  const subtitle = visualSubtitleStyle(subtitleOf({ alignment: "center" }) as never, band, undefined);
  assert.equal(subtitle.justifyContent, "center");
  assert.equal(subtitle.height, band.textHeight);
  assert.equal(subtitle.marginTop, band.spaceAbove || undefined);
  assert.equal(subtitle.marginBottom, band.spaceBelow || undefined);
});

test("an unset alignment stays unset rather than being forced left", () => {
  // Absent means "inherit whatever the stylesheet does", not "left".
  const style = visualTitleStyle(titleOf({ alignment: undefined }) as never, titleBand());
  assert.equal(style.justifyContent, undefined);
  assert.equal(style.textAlign, undefined);
});

test("the bands are flex rows, which is why justify-content is the fix", () => {
  // If these stop being flex, text-align alone would suffice and this
  // becomes redundant rather than silently wrong -- worth pinning.
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.chart-preview__visual-title \{[^}]*display: flex/);
  assert.match(css, /\.chart-preview__visual-subtitle \{[^}]*display: flex/);
});
