import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_ACTIONS,
  ActionError,
  detectBreakpoints,
  expandExperiment,
  identifyLabEnvironment,
  isStable,
  planRestoration,
  settleOutcome,
  summariseBreakpoints,
  validateAction,
  verifyRestoration,
} from "../tools/pbi-render-probe/labActions.mjs";

/**
 * The lab controller drives a live Power BI holding someone's report, so the
 * parts that decide whether to mutate, when a render has settled and how to
 * put things back are the parts worth testing hardest. All of it is pure, so
 * none of these tests need Power BI running.
 */

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

test("only allowlisted actions are accepted", () => {
  assert.equal(validateAction({ type: "setVisualSize", width: 600, height: 400 }), true);
  assert.equal(validateAction({ type: "setSeriesGap", gap: 40 }), true);
  assert.equal(validateAction({ type: "readState" }), true);

  for (const bad of ["click", "evaluate", "deleteVisual", "save", "setTheme"]) {
    assert.throws(() => validateAction({ type: bad }), ActionError, `${bad} must be rejected`);
  }
});

test("there is no escape hatch in the allowlist", () => {
  // The safety model rests on a caller being unable to express an unreviewed
  // action. A generic "run this" entry would defeat the whole thing.
  const names = Object.keys(ALLOWED_ACTIONS);
  for (const forbidden of ["evaluate", "eval", "script", "click", "selector", "raw"]) {
    assert.ok(
      !names.some((n) => n.toLowerCase().includes(forbidden)),
      `allowlist must not contain anything like "${forbidden}"`,
    );
  }
});

test("missing and malformed parameters are rejected", () => {
  assert.throws(() => validateAction({ type: "setVisualSize", width: 600 }), /needs height/);
  assert.throws(() => validateAction({ type: "setVisualSize", width: 600.5, height: 400 }), /positive integer/);
  assert.throws(() => validateAction({ type: "setVisualSize", width: -10, height: 400 }), /positive integer/);
  assert.throws(() => validateAction(null), ActionError);
  assert.throws(() => validateAction({ type: "setSeriesGap", gap: 200 }), /between 0 and 75/);
});

test("visual sizes outside a safe range are rejected", () => {
  // A typo here resizes someone's visual to something they cannot find again.
  assert.throws(() => validateAction({ type: "setVisualSize", width: 5, height: 400 }), /safe range/);
  assert.throws(() => validateAction({ type: "setVisualSize", width: 600, height: 99999 }), /safe range/);
  assert.equal(validateAction({ type: "setVisualSize", width: 40, height: 4000 }), true);
});

// ---------------------------------------------------------------------------
// Environment identification
// ---------------------------------------------------------------------------

const LAB = { visualType: "cartesian", categories: ["London", "North West", "Scotland", "Wales"], seriesCount: 3 };

test("the synthetic lab environment is recognised", () => {
  assert.deepEqual(identifyLabEnvironment(LAB), { ok: true, reasons: [] });
});

test("a partially rendered lab visual is still the lab", () => {
  // Power BI drops categories when space is tight, which is the behaviour we
  // are there to measure. It must not read as "this is not our report".
  const partial = { ...LAB, categories: ["London", "North West"] };
  assert.equal(identifyLabEnvironment(partial).ok, true);
});

test("anything unrecognised refuses to be mutated", () => {
  assert.equal(identifyLabEnvironment(null).ok, false);
  assert.equal(identifyLabEnvironment({}).ok, false);
  assert.equal(identifyLabEnvironment({ ...LAB, seriesCount: 5 }).ok, false);
  assert.equal(identifyLabEnvironment({ ...LAB, visualType: "table" }).ok, false);

  const foreign = identifyLabEnvironment({ ...LAB, categories: ["Revenue", "Cost"] });
  assert.equal(foreign.ok, false);
  assert.match(foreign.reasons.join(" "), /unexpected categories/);
});

test("an empty render is not treated as a match", () => {
  const blank = identifyLabEnvironment({ ...LAB, categories: [] });
  assert.equal(blank.ok, false);
  assert.match(blank.reasons.join(" "), /no categories rendered/);
});

// ---------------------------------------------------------------------------
// Stability
// ---------------------------------------------------------------------------

test("stability needs consecutive agreeing observations", () => {
  const settled = [{ w: 600, h: 400 }, { w: 600, h: 400 }, { w: 600, h: 400 }];
  assert.equal(isStable(settled), true);

  const moving = [{ w: 600, h: 500 }, { w: 600, h: 450 }, { w: 600, h: 400 }];
  assert.equal(isStable(moving), false);

  // Settled only at the end: the last three agree, the earlier ones do not.
  const settling = [{ w: 600, h: 500 }, { w: 600, h: 400 }, { w: 600, h: 400 }, { w: 600, h: 400 }];
  assert.equal(isStable(settling), true);
});

test("stability tolerates sub-pixel jitter but not real movement", () => {
  const jitter = [{ w: 600.1 }, { w: 600.3 }, { w: 600.0 }];
  assert.equal(isStable(jitter), true);
  assert.equal(isStable(jitter, { tolerance: 0.05 }), false);
});

test("too few observations is not stable", () => {
  assert.equal(isStable([{ w: 600 }, { w: 600 }]), false);
  assert.equal(isStable([]), false);
  assert.equal(isStable([{}, {}, {}]), false, "empty observations prove nothing");
});

test("a timeout is reported as an outcome, not thrown", () => {
  const good = settleOutcome([{ w: 1 }, { w: 1 }, { w: 1 }]);
  assert.equal(good.settled, true);

  const bad = settleOutcome([{ w: 1 }, { w: 2 }, { w: 3 }]);
  assert.equal(bad.settled, false);
  assert.match(String(bad.reason), /never held still/);
});

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

test("an experiment expands with its baseline merged into every variant", () => {
  const variants = expandExperiment({
    name: "classic-size-sweep",
    baseline: { theme: "classic2026", gap: 10 },
    variants: [{ width: 600, height: 600 }, { width: 372, height: 128 }],
  });

  assert.equal(variants.length, 2);
  assert.deepEqual(variants[0], {
    index: 0, name: "classic-size-sweep-0", theme: "classic2026", gap: 10, width: 600, height: 600,
  });
  assert.equal(variants[1].theme, "classic2026", "baseline must reach every variant");
});

test("a variant may override its baseline", () => {
  const [variant] = expandExperiment({
    name: "x", baseline: { gap: 10 }, variants: [{ gap: 40, width: 600, height: 600 }],
  });
  assert.equal(variant.gap, 40);
});

test("malformed experiments are rejected", () => {
  assert.throws(() => expandExperiment({ variants: [{}] }), /needs a name/);
  assert.throws(() => expandExperiment({ name: "x", variants: [] }), /at least one variant/);
  assert.throws(() => expandExperiment(null), ActionError);
});

// ---------------------------------------------------------------------------
// Restoration
// ---------------------------------------------------------------------------

test("restoration plans only what actually changed", () => {
  const initial = { width: 600, height: 600, gap: 10 };

  assert.deepEqual(planRestoration(initial, { width: 372, height: 128 }), [
    { type: "setVisualSize", width: 600, height: 600 },
  ]);

  assert.deepEqual(planRestoration(initial, { gap: 40 }), [
    { type: "setSeriesGap", gap: 10 },
  ]);

  assert.deepEqual(planRestoration(initial, { width: 600, height: 600 }), [],
    "nothing moved, so nothing to restore");

  assert.deepEqual(planRestoration(initial, {}), [],
    "a run that touched nothing restores nothing");
});

test("every restoration action is itself allowlisted", () => {
  // Restoration runs on the failure path, which is exactly where an
  // unvalidated action would do the most damage.
  const plan = planRestoration({ width: 600, height: 600 }, { width: 100, height: 100 });
  for (const action of plan) assert.equal(validateAction(action), true);
});

test("restoration is verified, not assumed", () => {
  const initial = { width: 600, height: 600, gap: 10 };
  assert.deepEqual(verifyRestoration(initial, { width: 600, height: 600, gap: 10 }), {
    restored: true, problems: [],
  });

  const failed = verifyRestoration(initial, { width: 372, height: 600, gap: 10 });
  assert.equal(failed.restored, false);
  assert.match(failed.problems[0], /width: expected 600, found 372/);
});

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

const sweep = [
  { size: "600x600", measurement: { legendVisible: true, legendFontPx: 13.3333, valueLabelCount: 3, categoriesRendered: 4 } },
  { size: "600x206", measurement: { legendVisible: true, legendFontPx: 12, valueLabelCount: 3, categoriesRendered: 4 } },
  { size: "372x128", measurement: { legendVisible: false, legendFontPx: null, valueLabelCount: 0, categoriesRendered: 2 } },
];

test("breakpoints report the pair of states either side of a transition", () => {
  const transitions = detectBreakpoints(sweep);
  const fields = transitions.map((t) => t.field);

  assert.ok(fields.includes("legendVisible"));
  assert.ok(fields.includes("legendFontPx"));
  assert.ok(fields.includes("categoriesRendered"));

  const legend = transitions.find((t) => t.field === "legendVisible");
  assert.ok(legend, "the legend transition must be found");
  // The sweep samples discrete sizes, so the honest answer is the bracket,
  // not a precise threshold.
  assert.deepEqual(legend?.from, { size: "600x206", value: true });
  assert.deepEqual(legend?.to, { size: "372x128", value: false });
});

test("an unchanging sweep reports no transitions", () => {
  const flat = [
    { size: "a", measurement: { legendVisible: true, categoriesRendered: 4 } },
    { size: "b", measurement: { legendVisible: true, categoriesRendered: 4 } },
  ];
  assert.deepEqual(detectBreakpoints(flat), []);
  assert.match(summariseBreakpoints([]), /no responsive transitions/);
});

test("results without measurements are skipped rather than crashing", () => {
  const withFailure = [sweep[0], { size: "600x500", error: "never settled" }, sweep[1]];
  assert.doesNotThrow(() => detectBreakpoints(withFailure));
  const t = detectBreakpoints(withFailure);
  assert.ok(t.some((x) => x.field === "legendFontPx"), "the surviving pair is still compared");
});

test("the summary groups transitions by field", () => {
  const text = summariseBreakpoints(detectBreakpoints(sweep));
  assert.match(text, /legendVisible:/);
  assert.match(text, /600x206 → 372x128/);
});
