/**
 * Pure logic for the Power BI lab controller.
 *
 * Everything here is a function of its arguments: no CDP, no DOM, no I/O. The
 * controller drives a live application that holds someone's report, so the
 * parts that decide *whether* to mutate, *when* a render has settled, and
 * *how* to put things back are exactly the parts that need to be testable
 * without a running Power BI.
 */

// ---------------------------------------------------------------------------
// Action allowlist
// ---------------------------------------------------------------------------

/**
 * The complete set of semantic operations the controller may perform.
 *
 * An allowlist rather than a blocklist, and semantic rather than mechanical:
 * there is deliberately no "click at x,y" or "evaluate this script" entry,
 * because the safety of this tool rests on the caller being unable to express
 * an action nobody reviewed.
 */
export const ALLOWED_ACTIONS = Object.freeze({
  setVisualSize: { params: ["width", "height"], mutates: true },
  setSeriesGap: { params: ["gap"], mutates: true },
  readState: { params: [], mutates: false },
});

export class ActionError extends Error {}

const isPositiveInt = (v) => Number.isInteger(v) && v > 0;

/**
 * Validates one action, throwing rather than returning a flag so a bad action
 * cannot be ignored by a caller that forgot to check.
 */
export function validateAction(action) {
  if (!action || typeof action !== "object") throw new ActionError("action must be an object");
  const spec = ALLOWED_ACTIONS[action.type];
  if (!spec) {
    throw new ActionError(
      `action "${action.type}" is not allowlisted (allowed: ${Object.keys(ALLOWED_ACTIONS).join(", ")})`,
    );
  }
  for (const param of spec.params) {
    if (!(param in action)) throw new ActionError(`action "${action.type}" needs ${param}`);
  }

  if (action.type === "setVisualSize") {
    for (const dim of ["width", "height"]) {
      if (!isPositiveInt(action[dim])) throw new ActionError(`${dim} must be a positive integer`);
      // Power BI rejects absurd sizes and a typo here would resize someone's
      // visual to something they cannot find again.
      if (action[dim] < 40 || action[dim] > 4000) {
        throw new ActionError(`${dim} ${action[dim]} is outside the safe range 40..4000`);
      }
    }
  }
  if (action.type === "setSeriesGap") {
    if (!Number.isFinite(action.gap) || action.gap < 0 || action.gap > 75) {
      throw new ActionError("gap must be between 0 and 75");
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Environment identification
// ---------------------------------------------------------------------------

/**
 * Whether the live state is the synthetic lab report we are allowed to touch.
 *
 * The controller refuses to mutate anything it cannot positively identify.
 * That is the difference between a lab tool and a robot loose in someone's
 * production report, so the check is deliberately conjunctive: every
 * expectation must hold, and an absent field fails rather than passes.
 */
export function identifyLabEnvironment(state, expected = {}) {
  const reasons = [];
  const want = {
    categories: ["London", "North West", "Scotland", "Wales"],
    seriesCount: 3,
    visualType: "cartesian",
    ...expected,
  };

  if (!state || typeof state !== "object") {
    return { ok: false, reasons: ["no state captured"] };
  }
  if (state.visualType !== want.visualType) {
    reasons.push(`visual type ${JSON.stringify(state.visualType)} is not ${want.visualType}`);
  }
  if (!Array.isArray(state.categories)) reasons.push("no categories read from the visual");
  else {
    // Power BI may render a subset when space is tight, so the check is that
    // every rendered category belongs to the fixture — not that all of the
    // fixture is on screen.
    const unexpected = state.categories.filter((c) => !want.categories.includes(c));
    if (unexpected.length) reasons.push(`unexpected categories: ${unexpected.join(", ")}`);
    if (state.categories.length === 0) reasons.push("no categories rendered");
  }
  if (state.seriesCount !== want.seriesCount) {
    reasons.push(`series count ${state.seriesCount} is not ${want.seriesCount}`);
  }
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// Render stability
// ---------------------------------------------------------------------------

/**
 * Whether a run of observations has settled.
 *
 * Polling for stability rather than sleeping a fixed time: Power BI re-lays
 * out asynchronously, and a sleep long enough to be safe on a slow machine is
 * wasted on every iteration of a sweep. Requires `required` consecutive
 * observations that agree within `tolerance`.
 */
export function isStable(observations, { required = 3, tolerance = 0.5 } = {}) {
  if (!Array.isArray(observations) || observations.length < required) return false;
  const recent = observations.slice(-required);
  const keys = Object.keys(recent[0] ?? {});
  if (!keys.length) return false;
  return recent.every((obs) =>
    keys.every((key) => {
      const a = recent[0][key];
      const b = obs[key];
      if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= tolerance;
      return a === b;
    }),
  );
}

/** A settle loop's outcome, so a timeout is a result rather than an exception. */
export function settleOutcome(observations, options = {}) {
  if (isStable(observations, options)) {
    return { settled: true, observations: observations.length };
  }
  return {
    settled: false,
    observations: observations.length,
    reason: `geometry never held still for ${options.required ?? 3} observations`,
  };
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

/**
 * Expands a declarative experiment into concrete variants.
 *
 * Baseline values are merged into every variant so a run records the full
 * state it was measured under, rather than leaving the reader to remember
 * what the baseline was.
 */
export function expandExperiment(spec) {
  if (!spec || typeof spec !== "object") throw new ActionError("experiment must be an object");
  if (!spec.name) throw new ActionError("experiment needs a name");
  if (!Array.isArray(spec.variants) || spec.variants.length === 0) {
    throw new ActionError("experiment needs at least one variant");
  }
  const baseline = spec.baseline ?? {};
  return spec.variants.map((variant, index) => ({
    index,
    name: variant.name ?? `${spec.name}-${index}`,
    ...baseline,
    ...variant,
  }));
}

/** The actions needed to put every mutated setting back. */
export function planRestoration(initial, mutated) {
  const plan = [];
  if (!initial) return plan;
  // Keyed on which fields the run actually touched, so a setting nobody
  // changed is never 'restored' to a value it already had.
  const sizeTouched = mutated?.width !== undefined || mutated?.height !== undefined;
  if (sizeTouched && (initial.width !== mutated.width || initial.height !== mutated.height)) {
    plan.push({ type: "setVisualSize", width: initial.width, height: initial.height });
  }
  if (mutated?.gap !== undefined && initial.gap !== mutated.gap) {
    plan.push({ type: "setSeriesGap", gap: initial.gap });
  }
  for (const action of plan) validateAction(action);
  return plan;
}

/** Did restoration actually work? Compared, never assumed. */
export function verifyRestoration(initial, current, tolerance = 0.5) {
  const problems = [];
  for (const key of ["width", "height", "gap"]) {
    if (initial?.[key] === undefined || current?.[key] === undefined) continue;
    if (Math.abs(initial[key] - current[key]) > tolerance) {
      problems.push(`${key}: expected ${initial[key]}, found ${current[key]}`);
    }
  }
  return { restored: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Breakpoint detection
// ---------------------------------------------------------------------------

/** Fields whose change across a size sweep is a responsive behaviour. */
const BREAKPOINT_FIELDS = [
  "legendVisible",
  "legendFontPx",
  "valueLabelCount",
  "categoryLabelCount",
  "categoriesRendered",
  "barsRendered",
  "categoryAxisTitleVisible",
  "valueAxisTitleVisible",
  "axisTitleFontPx",
  "categoryLabelFontPx",
  "valueLabelFontPx",
  "tickCount",
  "axisMaximum",
];

/**
 * Finds where a swept measurement changed.
 *
 * Reports the pair of states either side of each transition rather than a
 * single threshold: the sweep samples discrete sizes, so the true breakpoint
 * lies somewhere between two of them and claiming a precise value would be
 * inventing precision the experiment does not have.
 */
export function detectBreakpoints(results, fields = BREAKPOINT_FIELDS) {
  const ordered = [...(results ?? [])].filter((r) => r && r.measurement);
  const transitions = [];
  for (let i = 1; i < ordered.length; i++) {
    const before = ordered[i - 1];
    const after = ordered[i];
    for (const field of fields) {
      const a = before.measurement[field];
      const b = after.measurement[field];
      if (a === undefined && b === undefined) continue;
      if (a !== b) {
        transitions.push({
          field,
          from: { size: before.size, value: a },
          to: { size: after.size, value: b },
        });
      }
    }
  }
  return transitions;
}

/** A compact human summary of a sweep. */
export function summariseBreakpoints(transitions) {
  if (!transitions.length) return "no responsive transitions detected";
  const byField = new Map();
  for (const t of transitions) {
    const list = byField.get(t.field) ?? [];
    list.push(t);
    byField.set(t.field, list);
  }
  const lines = [];
  for (const [field, list] of byField) {
    lines.push(`${field}:`);
    for (const t of list) {
      lines.push(
        `    ${t.from.size} → ${t.to.size}   ${JSON.stringify(t.from.value)} → ${JSON.stringify(t.to.value)}`,
      );
    }
  }
  return lines.join("\n");
}
