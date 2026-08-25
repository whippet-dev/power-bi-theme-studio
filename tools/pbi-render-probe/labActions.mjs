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
  setVisualSize: { params: ["width", "height"], mutates: true, implemented: true },
  setBaseTheme: { params: ["theme"], mutates: true, implemented: true },
  setSeriesGap: { params: ["gap"], mutates: true, implemented: true },
  setThemeTextSize: { params: ["size"], mutates: true, implemented: true },
  readState: { params: [], mutates: false, implemented: true },
});

/**
 * Declared but not yet driveable through the live UI.
 *
 * Being on the allowlist means "reviewed and permitted", not "working".
 * An action that validates cleanly and then does nothing is worse than one
 * that refuses, because a suite would record measurements as though the
 * setting had changed.
 */
export class NotImplementedError extends Error {}

export function requireImplemented(type) {
  const spec = ALLOWED_ACTIONS[type];
  if (spec && spec.implemented === false) {
    throw new NotImplementedError(`NOT_IMPLEMENTED: "${type}" is allowlisted but has no live implementation yet`);
  }
  return true;
}

/**
 * The Base theme options this Desktop build actually exposes, read from the
 * live control rather than assumed. A caller may only name one of these:
 * an arbitrary label would be typed into a dropdown that silently does
 * nothing, and the run would then be filed under the wrong theme.
 */
export const SUPPORTED_BASE_THEMES = Object.freeze(["Fluent 2", "Classic 2026", "Classic 2018"]);

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
  if (action.type === "setBaseTheme") {
    if (typeof action.theme !== "string" || !SUPPORTED_BASE_THEMES.includes(action.theme)) {
      throw new ActionError(
        `base theme ${JSON.stringify(action.theme)} is not one this build exposes ` +
          `(${SUPPORTED_BASE_THEMES.join(", ")})`,
      );
    }
  }
  if (action.type === "setSeriesGap") {
    if (!Number.isFinite(action.gap) || action.gap < 0 || action.gap > 75) {
      throw new ActionError("gap must be between 0 and 75");
    }
  }
  if (action.type === "setThemeTextSize") {
    // The report theme's primary text class. Power BI's own control caps
    // at 45, and a value below 8 is not something the pane will accept.
    if (!Number.isFinite(action.size) || action.size < 8 || action.size > 45) {
      throw new ActionError("theme text size must be between 8 and 45");
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
    series: ["Online", "Phone", "Post"],
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

  // The sentinel. Categories and a series count are not enough on their own:
  // another cartesian visual could plot the same four regions with three
  // different measures. The auto-generated visual title names every measure
  // and the category field, and unlike the legend it survives the small
  // sizes where Power BI sheds furniture -- so it is the one signal present
  // in every state this lab measures.
  if (typeof state.sentinel !== "string" || !state.sentinel) {
    // Fail CLOSED: an absent sentinel is a refusal, never a pass.
    reasons.push("no lab sentinel could be read from the visual");
  } else {
    const missing = want.series.filter((name) => !state.sentinel.includes(name));
    if (missing.length) {
      reasons.push(`the visual does not plot ${missing.join(", ")} -- this is not the lab fixture`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Picks the intended reference visual out of however many are on the page.
 *
 * Deliberately NOT "the smallest cartesian visual": the lab resizes its own
 * visual, so any identity derived from geometry, DOM order or screen
 * position would move during the very experiments it is meant to guard.
 * Identity is the sentinel and the fixture data, both of which the
 * experiments leave alone.
 *
 * Ambiguity is an error rather than a guess: two matching visuals means the
 * page is not what the lab thinks it is.
 */
export function selectLabVisual(candidates, expected = {}) {
  const list = Array.isArray(candidates) ? candidates : [];
  const matches = list.filter((c) => identifyLabEnvironment(c, expected).ok);
  if (matches.length === 1) return { ok: true, visual: matches[0], index: list.indexOf(matches[0]) };
  if (matches.length === 0) {
    const why = list.length
      ? list.map((c, i) => `  [${i}] ${identifyLabEnvironment(c, expected).reasons.join("; ")}`).join("\n")
      : "  no cartesian visuals found on the page";
    return { ok: false, reasons: [`no visual matched the lab fixture:\n${why}`] };
  }
  return {
    ok: false,
    reasons: [`${matches.length} visuals matched the lab fixture -- refusing to guess which is the reference`],
  };
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

/**
 * Expands a theme x size matrix.
 *
 * Themes are the outer loop because switching one is the expensive
 * operation: a size change re-lays out, a theme change re-resolves every
 * default and re-renders from scratch.
 */
export function expandMatrix(spec) {
  if (!spec?.themes?.length || !spec?.sizes?.length) {
    throw new ActionError("a matrix needs both themes and sizes");
  }
  for (const theme of spec.themes) validateAction({ type: "setBaseTheme", theme });
  const variants = [];
  for (const theme of spec.themes) {
    for (const size of spec.sizes) {
      variants.push({
        index: variants.length,
        name: `${theme} ${size.width}x${size.height}`,
        theme,
        ...spec.baseline,
        ...size,
      });
    }
  }
  return variants;
}

/**
 * A measurement may only be filed under a theme that was verified, never
 * one that was merely requested. Silently mislabelling a result is how the
 * whole Fluent-versus-Classic confusion happened in the first place.
 */
export function checkVariantTheme(requested, verified) {
  if (!verified) return { ok: false, reason: "the base theme could not be read back" };
  if (requested !== verified) {
    return { ok: false, reason: `requested ${requested} but the control reports ${verified}` };
  }
  return { ok: true };
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
  // Theme last: it triggers the largest re-render, so putting it back after
  // the cheaper settings avoids paying for that settle more than once.
  if (mutated?.baseTheme !== undefined && initial.baseTheme !== mutated.baseTheme) {
    plan.push({ type: "setBaseTheme", theme: initial.baseTheme });
  }
  // After the base theme, not before: switching base themes re-resolves the
  // text classes, so a text size restored first would be thrown away by the
  // switch that follows it.
  if (mutated?.themeTextSize !== undefined && initial.themeTextSize !== mutated.themeTextSize) {
    plan.push({ type: "setThemeTextSize", size: initial.themeTextSize });
  }
  for (const action of plan) validateAction(action);
  return plan;
}

/** Did restoration actually work? Compared, never assumed. */
export function verifyRestoration(initial, current, tolerance = 0.5) {
  const problems = [];
  for (const key of ["width", "height", "gap", "themeTextSize"]) {
    if (initial?.[key] === undefined || current?.[key] === undefined) continue;
    if (Math.abs(initial[key] - current[key]) > tolerance) {
      problems.push(`${key}: expected ${initial[key]}, found ${current[key]}`);
    }
  }
  // Compared exactly: a theme is a name, and "close enough" is meaningless.
  if (initial?.baseTheme !== undefined && current?.baseTheme !== undefined) {
    if (initial.baseTheme !== current.baseTheme) {
      problems.push(`baseTheme: expected ${initial.baseTheme}, found ${current.baseTheme}`);
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
