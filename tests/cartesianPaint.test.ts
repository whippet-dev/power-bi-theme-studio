import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Two paint artefacts that were ours, not Power BI's.
 *
 * Neither is a layout question — nothing here moves a gridline, changes its
 * thickness, colour, transparency or dash pattern, or touches tick geometry.
 * They are both cases of CSS painting something the renderer never asked for,
 * and the guard is written against the stylesheet because that is where the
 * defect lived: a component test renders markup without applying a sheet, so
 * it cannot see either of them.
 */

const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");

/** The declarations inside one top-level rule, by exact selector. */
function ruleBody(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `expected a \`${selector}\` rule in app/globals.css`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  assert.notEqual(close, -1, `unterminated \`${selector}\` rule`);
  return css.slice(open + 1, close);
}

/** Declarations only — comments explain the rule but are not part of it. */
function declarations(selector: string): string {
  return ruleBody(selector).replace(/\/\*[\s\S]*?\*\//g, "");
}

test("a gridline cannot paint an edge it does not own", () => {
  const decl = declarations(".chart-gridline");

  // A vertical gridline draws with its left border and a horizontal one with
  // its top, and each renderer sets that edge's width, style and colour
  // inline. Declaring a style for BOTH edges here is what produced the black
  // triangular wedges: the unowned edge was styled but never given a width or
  // a colour, so it fell back to `medium` in currentColor and mitred
  // diagonally against the owned edge across the zero-width box.
  assert.doesNotMatch(decl, /border-left-style\s*:/, "the shared rule must not style the left edge");
  assert.doesNotMatch(decl, /border-top-style\s*:/, "the shared rule must not style the top edge");

  // Not merely unstyled — unable to paint. Zero width is what makes an
  // unowned edge structurally incapable of showing up, whatever a browser's
  // defaults happen to be.
  assert.match(decl, /border\s*:\s*0\b/, "every edge must start at zero width");

  // And nothing may reintroduce a width the renderer did not ask for.
  const widths = decl.match(/border(?:-(?:left|top|right|bottom))?-width\s*:[^;]*/g) ?? [];
  assert.deepEqual(widths, [], "widths belong to the renderer, not to the shared rule");
});

test("cartesian marks are square, in every bar and column family", () => {
  // Power BI draws a cartesian bar or column as a plain SVG rect with no
  // rx/ry, and no resolved property in the bar, column, stacked-bar or
  // stacked-column registries controls a corner radius — so any rounding here
  // is decoration with nothing behind it. One class per orientation covers
  // all four families: the stacked variants reuse the clustered ones.
  for (const selector of [".bar-item__fill", ".column-item__fill"]) {
    assert.doesNotMatch(
      declarations(selector),
      /border-radius\s*:/,
      `${selector} must not round the mark`,
    );
  }
});
