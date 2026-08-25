import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_ACTIONS,
  ActionError,
  NotImplementedError,
  requireImplemented,
  SUPPORTED_BASE_THEMES,
  checkVariantTheme,
  expandMatrix,
  selectLabVisual,
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

const LAB = {
  visualType: "cartesian",
  categories: ["London", "North West", "Scotland", "Wales"],
  seriesCount: 3,
  // The auto-generated visual title, which names every measure. Unlike the
  // legend it survives the small sizes where Power BI sheds furniture.
  sentinel: "Sum of Online, Sum of Phone and Sum of Post by Category",
};

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

test("a missing sentinel fails CLOSED", () => {
  // Everything else about this visual looks like the lab. Without the
  // sentinel the controller must refuse rather than assume.
  const noSentinel = { ...LAB, sentinel: undefined };
  const result = identifyLabEnvironment(noSentinel);
  assert.equal(result.ok, false);
  assert.match(result.reasons.join(" "), /no lab sentinel/);

  assert.equal(identifyLabEnvironment({ ...LAB, sentinel: "" }).ok, false);
});

test("the same categories with different measures is rejected", () => {
  // The false positive the sentinel exists to catch: another cartesian
  // visual plotting the same four regions against three other measures.
  const impostor = { ...LAB, sentinel: "Sum of Revenue, Sum of Cost and Sum of Margin by Category" };
  const result = identifyLabEnvironment(impostor);
  assert.equal(result.ok, false);
  assert.match(result.reasons.join(" "), /does not plot Online, Phone, Post/);
});

test("a partially rendered lab still carries its sentinel", () => {
  // At 372x128 Power BI drops the legend and half the categories. The
  // sentinel must survive that, or the lab stops recognising itself
  // exactly where the interesting measurements are.
  assert.equal(identifyLabEnvironment({ ...LAB, categories: ["London"] }).ok, true);
});

// ---------------------------------------------------------------------------
// Choosing the right visual among several
// ---------------------------------------------------------------------------

const OTHER_CARTESIAN = {
  visualType: "cartesian",
  categories: ["London", "North West", "Scotland", "Wales"],
  seriesCount: 3,
  sentinel: "Sum of Revenue, Sum of Cost and Sum of Margin by Category",
};

test("the lab visual is picked out from among other cartesian visuals", () => {
  const result = selectLabVisual([OTHER_CARTESIAN, LAB]);
  assert.equal(result.ok, true);
  assert.equal(result.index, 1, "identity must not depend on DOM order");
  assert.equal(result.visual?.sentinel, LAB.sentinel);
});

test("identity does not depend on size or ordering", () => {
  // The lab resizes its own visual, so anything derived from geometry would
  // move during the very experiments it is meant to guard.
  const small = { ...LAB, width: 372, height: 128, categories: ["London"] };
  const large = { ...OTHER_CARTESIAN, width: 900, height: 900 };
  assert.equal(selectLabVisual([small, large]).ok, true);
  assert.equal(selectLabVisual([large, small]).visual?.sentinel, LAB.sentinel);
});

test("an ambiguous page is an error, not a guess", () => {
  const result = selectLabVisual([LAB, { ...LAB }]);
  assert.equal(result.ok, false);
  assert.match(String(result.reasons?.join(" ")), /refusing to guess/);
});

test("no match explains why, per candidate", () => {
  const result = selectLabVisual([OTHER_CARTESIAN]);
  assert.equal(result.ok, false);
  assert.match(String(result.reasons?.join(" ")), /does not plot/);
  assert.equal(selectLabVisual([]).ok, false);
});

// ---------------------------------------------------------------------------
// Base theme
// ---------------------------------------------------------------------------

test("only the themes this build exposes are accepted", () => {
  // Read from the live control, not assumed: an arbitrary label would be
  // typed into a dropdown that silently does nothing.
  assert.deepEqual([...SUPPORTED_BASE_THEMES], ["Fluent 2", "Classic 2026", "Classic 2018"]);
  for (const theme of SUPPORTED_BASE_THEMES) {
    assert.equal(validateAction({ type: "setBaseTheme", theme }), true);
  }
});

test("arbitrary or near-miss theme names are rejected", () => {
  for (const bad of ["Fluent", "classic 2026", "Classic2026", "", null, 42, "'; DROP"]) {
    assert.throws(() => validateAction({ type: "setBaseTheme", theme: bad }), ActionError, String(bad));
  }
});

test("a variant is failed when the verified theme is not the requested one", () => {
  assert.deepEqual(checkVariantTheme("Classic 2026", "Classic 2026"), { ok: true });

  const mismatch = checkVariantTheme("Fluent 2", "Classic 2026");
  assert.equal(mismatch.ok, false);
  assert.match(String(mismatch.reason), /requested Fluent 2 but the control reports Classic 2026/);

  assert.equal(checkVariantTheme("Fluent 2", null).ok, false, "unreadable is not a pass");
});

test("restoration puts the theme back, and last", () => {
  const initial = { width: 600, height: 600, gap: 10, baseTheme: "Classic 2026" };
  const plan = planRestoration(initial, { width: 372, height: 128, gap: 40, baseTheme: "Fluent 2" });

  assert.deepEqual(plan.map((a) => a.type), ["setVisualSize", "setSeriesGap", "setBaseTheme"]);
  assert.equal(plan.at(-1)?.theme, "Classic 2026");
  for (const action of plan) assert.equal(validateAction(action), true);
});

test("theme restoration is verified by name, exactly", () => {
  const initial = { baseTheme: "Classic 2026" };
  assert.equal(verifyRestoration(initial, { baseTheme: "Classic 2026" }).restored, true);

  const failed = verifyRestoration(initial, { baseTheme: "Classic 2018" });
  assert.equal(failed.restored, false);
  assert.match(failed.problems[0], /baseTheme: expected Classic 2026, found Classic 2018/);
});

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

test("a theme x size matrix expands with themes as the outer loop", () => {
  const variants = expandMatrix({
    themes: ["Classic 2026", "Fluent 2"],
    sizes: [{ width: 600, height: 600 }, { width: 372, height: 128 }],
    baseline: { gap: 10 },
  });

  assert.equal(variants.length, 4);
  // Switching a theme re-resolves every default and re-renders from
  // scratch; a resize only re-lays out. So themes change least often.
  assert.deepEqual(variants.map((v) => v.theme), [
    "Classic 2026", "Classic 2026", "Fluent 2", "Fluent 2",
  ]);
  assert.equal(variants[0].gap, 10, "baseline reaches every variant");
  assert.equal(variants[0].name, "Classic 2026 600x600");
});

test("a matrix cannot smuggle in an unsupported theme", () => {
  assert.throws(
    () => expandMatrix({ themes: ["Classic 2026", "Nonsense"], sizes: [{ width: 600, height: 600 }] }),
    ActionError,
  );
  assert.throws(() => expandMatrix({ themes: [], sizes: [{ width: 1, height: 1 }] }), /needs both/);
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

// ---------------------------------------------------------------------------
// The identity boundary has to hold for the whole session, not just open()
// ---------------------------------------------------------------------------

test("a sentinel that disappears mid-session stops being the lab", () => {
  // The runtime locator mirrors this rule: exactly one match, or nothing.
  // Falling back to the first cartesian visual would mutate something
  // nobody identified, which is the one thing the controller must not do.
  const gone = { ...LAB, sentinel: "" };
  assert.equal(identifyLabEnvironment(gone).ok, false);
  assert.equal(selectLabVisual([gone]).ok, false);
  assert.equal(selectLabVisual([gone, OTHER_CARTESIAN]).ok, false,
    "and must not fall back to the other cartesian visual");
});

test("a second matching visual appearing mid-session is a refusal", () => {
  const result = selectLabVisual([LAB, { ...LAB, width: 400 }]);
  assert.equal(result.ok, false);
  assert.equal(result.visual, undefined, "no visual may be returned when ambiguous");
});

test("no matching visual leaves nothing to operate on", () => {
  const result = selectLabVisual([OTHER_CARTESIAN, { ...OTHER_CARTESIAN }]);
  assert.equal(result.ok, false);
  assert.equal(result.visual, undefined);
});

// ---------------------------------------------------------------------------
// Declared is not the same as working
// ---------------------------------------------------------------------------

test("every allowlisted action declares whether it is implemented", () => {
  // Being on the allowlist means reviewed and permitted, not working. An
  // action that validates cleanly and then does nothing is worse than one
  // that refuses: a suite would file measurements as though it had applied.
  for (const [name, spec] of Object.entries(ALLOWED_ACTIONS)) {
    assert.equal(typeof spec.implemented, "boolean", `${name} must declare implemented`);
  }
});

test("an unimplemented action refuses loudly rather than silently passing", () => {
  const declaredOnly = Object.entries(ALLOWED_ACTIONS).filter(([, s]) => s.implemented === false);
  for (const [name] of declaredOnly) {
    assert.throws(() => requireImplemented(name), NotImplementedError, name);
  }
  // Implemented ones pass through.
  for (const [name, spec] of Object.entries(ALLOWED_ACTIONS)) {
    if (spec.implemented) assert.equal(requireImplemented(name), true, name);
  }
});

// ---------------------------------------------------------------------------
// Editing the report theme's primary text size
// ---------------------------------------------------------------------------

test("setThemeTextSize is allowlisted and implemented", () => {
  assert.ok(ALLOWED_ACTIONS.setThemeTextSize, "on the allowlist");
  assert.equal(ALLOWED_ACTIONS.setThemeTextSize.mutates, true);
  assert.equal(requireImplemented("setThemeTextSize"), true);
});

test("a theme text size outside Power BI's own range is refused", () => {
  // The control caps at 45 and will not take a value below 8. This edits the
  // whole report's typography, so a typo is worth catching before it lands.
  for (const size of [0, 7, 46, 200, Number.NaN, "20"]) {
    assert.throws(
      () => validateAction({ type: "setThemeTextSize", size }),
      ActionError,
      `size ${String(size)} should be refused`,
    );
  }
  assert.equal(validateAction({ type: "setThemeTextSize", size: 20 }), true);
  assert.throws(() => validateAction({ type: "setThemeTextSize" }), /needs size/);
});

test("restoring a theme text size happens AFTER the base theme, not before", () => {
  // Switching base themes re-resolves the text classes, so a size put back
  // first would be discarded by the switch that follows it.
  const plan = planRestoration(
    { width: 600, height: 600, baseTheme: "Classic 2026", themeTextSize: 10 },
    { baseTheme: "Fluent 2", themeTextSize: 20 },
  );
  assert.deepEqual(plan, [
    { type: "setBaseTheme", theme: "Classic 2026" },
    { type: "setThemeTextSize", size: 10 },
  ]);
});

test("a text size nobody changed is never restored", () => {
  assert.deepEqual(planRestoration({ themeTextSize: 10 }, {}), []);
  assert.deepEqual(planRestoration({ themeTextSize: 10 }, { themeTextSize: 10 }), []);
});

test("an unrestored theme text size is reported as a problem", () => {
  const result = verifyRestoration(
    { width: 600, height: 600, themeTextSize: 10 },
    { width: 600, height: 600, themeTextSize: 20 },
  );
  assert.equal(result.restored, false);
  assert.match(result.problems.join(" "), /themeTextSize: expected 10, found 20/);
});
