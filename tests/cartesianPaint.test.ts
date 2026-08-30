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

test("a gridline layer paints strokes and nothing else", () => {
  // This replaces a rule about CSS border edges. Gridlines used to be spans
  // drawn with one border each, and the hazard was the edge a gridline did
  // NOT own: styled but given no width or colour, it fell back to `medium`
  // in currentColor and mitred diagonally against the owned edge, putting a
  // black triangular wedge at every gridline end.
  //
  // Strokes make that structurally impossible -- an SVG line has no edges to
  // leave unowned -- so what is worth pinning now is that the layer stays a
  // pure paint surface: no borders or backgrounds of its own, and no
  // geometry that could move the plot.
  const decl = declarations(".chart-gridline-layer");

  assert.doesNotMatch(decl, /border(?!-)/, "the layer must not paint a border of its own");
  assert.doesNotMatch(decl, /background/, "the layer must not paint a fill");

  // It fills the plot exactly, so it cannot introduce geometry.
  assert.match(decl, /position\s*:\s*absolute/);
  assert.match(decl, /inset\s*:\s*0/);

  // Gridlines were inert spans; the layer must not start intercepting input.
  assert.match(decl, /pointer-events\s*:\s*none/, "the layer must stay non-interactive");

  // A stroke sitting exactly on the plot edge must not be sliced in half by
  // its own container -- this is a paint layer, not a clipping one.
  assert.match(decl, /overflow\s*:\s*visible/, "the layer must not clip its strokes");
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
