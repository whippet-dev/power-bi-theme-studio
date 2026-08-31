import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { mapAlignItems, mapJustifyContent, mapTextAlign } from "../app/components/ChartParts";

/**
 * The flex text-alignment trap, and a guard against the next one.
 *
 * `text-align` cannot position an anonymous flex item -- the text inside a
 * `display: flex` box whose only child is a text node. This has now been the
 * cause of five separate "alignment does nothing" defects: the visual title,
 * the subtitle, the horizontal legend, the shape/button text, and the matrix
 * cells. Every time, the theme value resolved correctly and the renderer
 * emitted it into a property that could not act on it.
 *
 * Measured before the fix, on the shape tile: horizontal left/center/right
 * left the text at x=250.3 in all three, while vertical top/middle/bottom
 * moved it 0 -> 250.3 -> 500.7 and never changed y -- the two axes were
 * crossed. On a matrix header cell, text-align right and center produced the
 * identical position (gapLeft 12) while justify-content moved it.
 */

// ---------------------------------------------------------------------------
// The mapping itself
// ---------------------------------------------------------------------------

test("horizontal alignment maps to the main axis of a row flex box", () => {
  assert.equal(mapJustifyContent("left"), "flex-start");
  assert.equal(mapJustifyContent("center"), "center");
  assert.equal(mapJustifyContent("right"), "flex-end");
  assert.equal(mapJustifyContent("Right"), "flex-end", "case is not significant");
  // "Auto" leaves the container's own default alone, exactly as mapTextAlign does.
  assert.equal(mapJustifyContent("auto"), undefined);
  assert.equal(mapTextAlign("auto"), undefined);
});

test("vertical alignment maps to the cross axis, and never to the main one", () => {
  assert.equal(mapAlignItems("top"), "flex-start");
  assert.equal(mapAlignItems("middle"), "center");
  assert.equal(mapAlignItems("bottom"), "flex-end");
  assert.equal(mapAlignItems("auto"), undefined);

  // The defect was vertical values reaching justify-content. They must not
  // be recognised there at all, or the crossing could quietly come back.
  for (const vertical of ["top", "middle", "bottom"]) {
    assert.equal(mapJustifyContent(vertical), undefined, `"${vertical}" is not a horizontal value`);
  }
  for (const horizontal of ["left", "right"]) {
    assert.equal(mapAlignItems(horizontal), undefined, `"${horizontal}" is not a vertical value`);
  }
});

test("the two axes are independent, so a corner placement is expressible", () => {
  // right + top was one of the reported combinations.
  assert.equal(mapJustifyContent("right"), "flex-end");
  assert.equal(mapAlignItems("top"), "flex-start");
  // and they never collide on the same CSS property
  assert.notEqual(mapJustifyContent("right"), mapAlignItems("top"));
});

// ---------------------------------------------------------------------------
// The guard
// ---------------------------------------------------------------------------

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");

/** Classes whose rule sets `display: flex`. */
function flexClasses(): Set<string> {
  const found = new Set<string>();
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const body = match[2].replace(/\/\*[\s\S]*?\*\//g, "");
    if (!/display\s*:\s*(inline-)?flex/.test(body)) continue;
    for (const cls of match[1].matchAll(/\.([A-Za-z0-9_-]+)/g)) found.add(cls[1]);
  }
  return found;
}

function componentFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return componentFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

test("a flex box that sets text-align must also set justify-content", () => {
  // Deliberately limited to flex. A GRID container is not affected: its
  // children are real boxes, so text-align inherits into them and works --
  // which is why the Table's row alignment is correct and must be left alone.
  const flex = flexClasses();
  const offenders: string[] = [];

  for (const file of componentFiles(join(ROOT, "app", "components"))) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (!line.includes("textAlign:")) return;
      let cls: string | undefined;
      for (let back = index; back >= Math.max(0, index - 24); back -= 1) {
        const match = lines[back].match(/className=[{"`]*["`]([^"`{]+)/);
        if (match) {
          cls = match[1].split(/\s+/)[0];
          break;
        }
      }
      if (!cls || !flex.has(cls)) return;
      const window = lines.slice(Math.max(0, index - 14), index + 14).join("\n");
      if (!window.includes("justifyContent")) {
        offenders.push(`${file.split(/[\\/]/).pop()}:${index + 1} .${cls}`);
      }
    });
  }

  assert.deepEqual(
    offenders,
    [],
    "these flex boxes set text-align with no justify-content, so their alignment cannot take effect:\n" +
      offenders.join("\n"),
  );
});

test("the shape text box is given room for its vertical alignment", () => {
  // align-items has nothing to act on in a box one line tall. The rule must
  // claim the tile's height in both layouts -- flex: 1 when an icon stacks
  // above or below the text, align-self: stretch when it sits beside it.
  const rule = css.match(/\.shape-tile__text \{([^}]*)\}/);
  assert.ok(rule, ".shape-tile__text must exist");
  const body = rule![1].replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(body, /flex:\s*1/, "the text box must claim free space along the main axis");
  assert.match(body, /align-self:\s*stretch/, "and the full cross size");
  // And it must not hard-code the alignment the visual owns.
  assert.doesNotMatch(body, /align-items\s*:/, "align-items is the visual's, applied inline");
});
