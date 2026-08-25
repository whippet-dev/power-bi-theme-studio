import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TOLERANCE,
  diffElement,
  diffSnapshots,
  elementKey,
  formatDiff,
  indexElements,
} from "../tools/pbi-render-probe/snapshotDiff.mjs";

/**
 * The before/after diff used to study Power BI's formatting semantics.
 *
 * Its job is to stay quiet. A report canvas is full of Desktop chrome, and the
 * workflow — capture, have a human change one setting, capture again — only
 * tells us anything if the output is short enough to read. So the tests here
 * are mostly about what the diff must NOT report.
 */

const rect = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
const bar = (cls: string, x: number, y: number, w: number, h: number, extra = {}) => ({
  tag: "rect",
  cls,
  rect: rect(x, y, w, h),
  fill: "rgb(17, 141, 255)",
  ...extra,
});

const snapshot = (elements: unknown[], context = {}) => ({
  context: { zoom: 1, devicePixelRatio: 1, viewportWidth: 1920, viewportHeight: 1031, ...context },
  elements,
});

test("identical snapshots produce an empty diff", () => {
  const elements = [bar("bar", 0, 41.2, 433.32, 14.32), bar("bar", 0, 57.1, 226.08, 14.32)];
  const diff = diffSnapshots(snapshot(elements), snapshot(structuredClone(elements)));

  assert.equal(diff.empty, true);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.modified, []);
  assert.equal(diff.unchanged, 2);
  assert.match(formatDiff(diff), /no semantic change/);
});

test("sub-tolerance jitter is not a change", () => {
  // Two captures seconds apart can differ in the last decimal for reasons
  // that are not the property under study. Reporting those would bury the
  // one change we asked a human to make.
  const before = snapshot([bar("bar", 0, 41.209302, 433.32, 14.321120)]);
  const after = snapshot([bar("bar", 0, 41.209501, 433.3202, 14.321119)]);

  assert.equal(diffSnapshots(before, after).empty, true);
});

test("a real geometry change is reported with its delta", () => {
  const before = snapshot([bar("bar", 0, 41.209, 433.32, 14.321)]);
  const after = snapshot([bar("bar", 0, 44.5, 433.32, 11.03)]);
  const diff = diffSnapshots(before, after);

  assert.equal(diff.added.length, 0);
  assert.equal(diff.removed.length, 0);
  assert.equal(diff.modified.length, 1);

  const fields = Object.fromEntries(diff.modified[0].changes.map((c) => [c.field, c]));
  assert.ok(fields["rect.y"], "y moved and should be reported");
  assert.ok(fields["rect.h"], "height changed and should be reported");
  assert.ok(!fields["rect.w"], "width did not change and must not be reported");
  assert.equal(fields["rect.y"].delta, 3.291);
  assert.equal(fields["rect.h"].delta, -3.291);
});

test("a style change is reported without touching geometry", () => {
  const before = snapshot([bar("bar", 0, 41.2, 433.32, 14.32)]);
  const after = snapshot([bar("bar", 0, 41.2, 433.32, 14.32, { fill: "rgb(230, 108, 55)" })]);
  const diff = diffSnapshots(before, after);

  assert.equal(diff.modified.length, 1);
  assert.deepEqual(
    diff.modified[0].changes.map((c) => c.field),
    ["fill"],
  );
});

test("text and font changes are reported", () => {
  const before = snapshot([{ tag: "text", cls: "label", rect: rect(0, 0, 70, 19), text: "North West", fontSize: "14px" }]);
  const after = snapshot([{ tag: "text", cls: "label", rect: rect(0, 0, 70, 19), text: "North West", fontSize: "18px" }]);
  const diff = diffSnapshots(before, after);

  assert.equal(diff.modified.length, 1);
  assert.deepEqual(diff.modified[0].changes[0], {
    field: "fontSize",
    before: "14px",
    after: "18px",
    delta: null,
  });
});

test("added and removed elements are separated, not reported as edits", () => {
  // A formatting change that creates or destroys elements shifts every
  // ordinal after it. Saying so plainly beats inventing a rename.
  const before = snapshot([bar("bar", 0, 41.2, 433.32, 14.32)]);
  const after = snapshot([bar("bar", 0, 41.2, 433.32, 14.32), bar("bar", 0, 57.1, 226.08, 14.32)]);
  const diff = diffSnapshots(before, after);

  assert.equal(diff.added.length, 1);
  assert.equal(diff.removed.length, 0);
  assert.equal(diff.modified.length, 0);
  assert.equal(diff.added[0].key, "rect.bar#1");
});

test("context changes are surfaced because they invalidate the geometry", () => {
  // If the zoom moved between captures, every pixel below is incomparable.
  // The diff has to say so even when it finds no element change.
  const elements = [bar("bar", 0, 41.2, 433.32, 14.32)];
  const before = snapshot(elements, { zoom: 1 });
  const after = snapshot(structuredClone(elements), { zoom: 0.685417 });
  const diff = diffSnapshots(before, after);

  assert.equal(diff.empty, false, "a zoom change must not read as no change");
  assert.deepEqual(diff.context, [{ field: "zoom", before: 1, after: 0.685417 }]);
  assert.match(formatDiff(diff), /not comparable/);
});

test("structural keys are ordinal within tag and class, not positional", () => {
  // Identity must not come from geometry: the diff exists to watch geometry
  // move, so an id that moved with it would match nothing.
  const index = indexElements([
    bar("bar", 0, 41.2, 433.32, 14.32),
    bar("bar", 0, 57.1, 226.08, 14.32),
    { tag: "text", cls: "label", rect: rect(0, 0, 70, 19) },
  ]);

  assert.deepEqual([...index.keys()], ["rect.bar#0", "rect.bar#1", "text.label#0"]);
  assert.equal(elementKey({ tag: "rect", cls: "bar setFocusRing" }, 3), "rect.bar.setFocusRing#3");
});

test("moving a bar keeps its key, so it reads as a change not a replacement", () => {
  const before = snapshot([bar("bar", 0, 41.2, 433.32, 14.32)]);
  const after = snapshot([bar("bar", 0, 200, 433.32, 14.32)]);
  const diff = diffSnapshots(before, after);

  assert.equal(diff.added.length, 0);
  assert.equal(diff.removed.length, 0);
  assert.equal(diff.modified[0].key, "rect.bar#0");
});

test("tolerance is configurable and defaults to half a pixel", () => {
  assert.equal(DEFAULT_TOLERANCE, 0.5);
  const before = snapshot([bar("bar", 0, 10, 100, 20)]);
  const after = snapshot([bar("bar", 0, 10.4, 100, 20)]);

  assert.equal(diffSnapshots(before, after).empty, true, "0.4 is under the default tolerance");
  assert.equal(diffSnapshots(before, after, { tolerance: 0.1 }).empty, false, "and over a tighter one");
});

test("diffElement compares one pair directly", () => {
  const changes = diffElement(
    { rect: rect(0, 0, 10, 10), fill: "red" },
    { rect: rect(0, 0, 10, 14), fill: "blue" },
  );
  assert.deepEqual(
    changes.map((c) => c.field),
    ["rect.h", "fill"],
  );
});
