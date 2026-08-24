/**
 * Semantic diff of two probe snapshots.
 *
 * The point is to study Power BI's formatting semantics without automating
 * its UI: capture, let a human change exactly one setting, capture again, and
 * ask what actually moved. That only works if the diff is quiet — a report
 * canvas is full of unrelated Desktop chrome, and a diff that lists a thousand
 * changes answers nothing.
 *
 * Pure functions, no I/O, so the matching and tolerance rules can be tested
 * without a running Power BI.
 */

/** Geometry equal to within a pixel-ish tolerance is not a change. */
export const DEFAULT_TOLERANCE = 0.5;

/**
 * A stable identity for an element across two captures.
 *
 * Power BI exposes no stable ids on chart shapes, so identity is structural:
 * tag, class, and position among same-shaped siblings. Deliberately NOT
 * geometry — the whole point is to detect geometry changing, so an id that
 * moved with it would match nothing.
 *
 * The limit is real and worth stating: if a formatting change reorders or
 * re-creates elements, ordinal keys shift and the diff reports removals plus
 * additions rather than modifications. That is honest, if noisy, and is why
 * the diff separates those categories instead of guessing at a rename.
 */
export function elementKey(element, ordinal) {
  const tag = element.tag ?? "?";
  const cls = (element.cls ?? "").trim().split(/\s+/).slice(0, 2).join(".");
  return `${tag}${cls ? "." + cls : ""}#${ordinal}`;
}

/** Indexes a snapshot's elements by structural key. */
export function indexElements(elements) {
  const counters = new Map();
  const index = new Map();
  for (const element of elements ?? []) {
    const base = `${element.tag ?? "?"}|${element.cls ?? ""}`;
    const ordinal = counters.get(base) ?? 0;
    counters.set(base, ordinal + 1);
    index.set(elementKey(element, ordinal), element);
  }
  return index;
}

const NUMERIC_FIELDS = ["x", "y", "w", "h"];
const STYLE_FIELDS = [
  "fill",
  "stroke",
  "strokeWidth",
  "opacity",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "color",
  "transform",
  "text",
];

const changedNumber = (before, after, tolerance) =>
  typeof before === "number" && typeof after === "number"
    ? Math.abs(after - before) > tolerance
    : before !== after;

/**
 * Compares two elements, returning only fields that actually moved.
 *
 * Floating-point geometry is compared with a tolerance because a capture two
 * seconds later can differ in the last decimal for reasons that are not the
 * formatting change under study.
 */
export function diffElement(before, after, tolerance = DEFAULT_TOLERANCE) {
  const changes = [];
  for (const field of NUMERIC_FIELDS) {
    const a = before?.rect?.[field];
    const b = after?.rect?.[field];
    if (a === undefined && b === undefined) continue;
    if (changedNumber(a, b, tolerance)) {
      changes.push({ field: `rect.${field}`, before: a, after: b, delta: typeof a === "number" && typeof b === "number" ? +(b - a).toFixed(4) : null });
    }
  }
  for (const field of STYLE_FIELDS) {
    const a = before?.[field];
    const b = after?.[field];
    if (a === undefined && b === undefined) continue;
    if (a !== b) changes.push({ field, before: a, after: b, delta: null });
  }
  return changes;
}

/**
 * The whole diff: what appeared, what vanished, and what moved.
 *
 * Elements present in both with no change above tolerance are omitted
 * entirely, which is what makes the output readable after a one-property
 * change.
 */
export function diffSnapshots(before, after, options = {}) {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const beforeIndex = indexElements(before?.elements);
  const afterIndex = indexElements(after?.elements);

  const added = [];
  const removed = [];
  const modified = [];

  for (const [key, element] of afterIndex) {
    if (!beforeIndex.has(key)) added.push({ key, element });
  }
  for (const [key, element] of beforeIndex) {
    if (!afterIndex.has(key)) removed.push({ key, element });
    else {
      const changes = diffElement(element, afterIndex.get(key), tolerance);
      if (changes.length) modified.push({ key, changes });
    }
  }

  // Context that is worth reporting even when no element changed, because a
  // zoom or DPR difference invalidates every geometric comparison below it.
  const context = [];
  for (const field of ["zoom", "devicePixelRatio", "viewportWidth", "viewportHeight"]) {
    const a = before?.context?.[field];
    const b = after?.context?.[field];
    if (a !== undefined && b !== undefined && changedNumber(a, b, 1e-9)) {
      context.push({ field, before: a, after: b });
    }
  }

  return {
    tolerance,
    unchanged: beforeIndex.size - removed.length - modified.length,
    added,
    removed,
    modified,
    context,
    empty: added.length === 0 && removed.length === 0 && modified.length === 0 && context.length === 0,
  };
}

/** A short human summary; the JSON is the record, this is for the terminal. */
export function formatDiff(diff) {
  const lines = [];
  for (const entry of diff.context) {
    lines.push(`context  ${entry.field}: ${entry.before} -> ${entry.after}   (geometry below is not comparable)`);
  }
  for (const entry of diff.removed) lines.push(`removed  ${entry.key}`);
  for (const entry of diff.added) lines.push(`added    ${entry.key}`);
  for (const entry of diff.modified) {
    lines.push(`changed  ${entry.key}`);
    for (const change of entry.changes) {
      const delta = change.delta === null ? "" : `   (${change.delta > 0 ? "+" : ""}${change.delta})`;
      lines.push(`           ${change.field}: ${JSON.stringify(change.before)} -> ${JSON.stringify(change.after)}${delta}`);
    }
  }
  if (!lines.length) lines.push("no semantic change");
  lines.push("");
  lines.push(`unchanged ${diff.unchanged}   added ${diff.added.length}   removed ${diff.removed.length}   changed ${diff.modified.length}`);
  return lines.join("\n");
}
