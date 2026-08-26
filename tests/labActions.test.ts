import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_ACTIONS,
  ActionError,
  NotImplementedError,
  requireImplemented,
  SUPPORTED_BASE_THEMES,
  SUPPORTED_LABEL_FONTS,
  cartesianAxisBandBounds,
  checkVariantTheme,
  classifyCartesianRenderer,
  classifyLineRenderer,
  expandMatrix,
  selectLabVisual,
  detectBreakpoints,
  expandExperiment,
  FIXTURE_CATEGORY_SETS,
  fixtureVariantOf,
  identifyLabEnvironment,
  isStable,
  planRestoration,
  settleOutcome,
  summariseBreakpoints,
  validateAction,
  verifyRestoration,
} from "../tools/pbi-render-probe/labActions.mjs";
import { LabController } from "../tools/pbi-render-probe/lab-controller.mjs";

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
  renderer: "barOrColumn",
  orientation: "horizontal",
  markType: "bar",
  grouping: "clustered",
  categoryAxisSide: "left",
  valueAxisSide: "bottom",
  categories: ["London", "North West", "Scotland", "Wales"],
  seriesCount: 3,
  seriesNames: ["Sum of Online", "Sum of Phone", "Sum of Post"],
  legendVisible: true,
  marksRendered: 12,
  categoriesRendered: 4,
  // The auto-generated visual title, which names every measure. Unlike the
  // legend it survives the small sizes where Power BI sheds furniture.
  sentinel: "Sum of Online, Sum of Phone and Sum of Post by Category",
};

const COLUMN_LAB = {
  ...LAB,
  orientation: "vertical",
  markType: "column",
  categoryAxisSide: "bottom",
  valueAxisSide: "left",
};

const STACKED_COLUMN_LAB = {
  ...COLUMN_LAB,
  grouping: "stacked",
};

const LINE_LAB = {
  ...COLUMN_LAB,
  renderer: "line",
  markType: "line",
  grouping: null,
  marksRendered: 12,
  categoriesRendered: 4,
  barMarkCount: 0,
  columnMarkCount: 0,
  lineVisualCount: 1,
  lineSvgCount: 1,
  lineAxisGroupCount: 1,
  linePathCount: 3,
  paintedLinePathCount: 3,
  lineVertexCounts: [4, 4, 4],
  interactivityLineCount: 3,
};

type FakeLabSession = {
  open: () => Promise<void>;
  close: () => void;
  read: (name: string) => Promise<unknown>;
};

function controllerForIdentity({
  expectedRenderer,
  expectedGrouping,
  labVisuals,
  labState,
}: {
  expectedRenderer?: string;
  expectedGrouping?: string;
  labVisuals: unknown;
  labState: unknown;
}) {
  const controller = new LabController({ expectedRenderer, expectedGrouping, verbose: false });
  const session: FakeLabSession = {
    async open() {},
    close() {},
    async read(name) {
      if (name === "labVisuals") return labVisuals;
      if (name === "labState") return labState;
      throw new Error(`unexpected lab read: ${name}`);
    },
  };
  // The concrete CDP session is intentionally private implementation detail.
  // Replace it only in this pure controller-boundary test.
  Object.defineProperty(controller, "session", { value: session, writable: true });
  // Base-theme reading navigates the live UI. Its value is immaterial to the
  // grouping boundary, so keep this controller test pure and fixed-payload.
  controller.readBaseTheme = async () => "Classic 2026";
  return { controller, session };
}

test("a semantic Base-theme preflight is retained after the shell menu disappears", async () => {
  const controller = new LabController({ expectedGrouping: "stacked", requireVerifiedBaseTheme: true, verbose: false });
  let visible = true;
  Object.defineProperty(controller, "session", { value: {
    async open() {}, close() {},
    async read(name: string) {
      if (name === "baseThemeValue") return visible ? { value: "Classic 2026" } : null;
      if (name === "labVisuals") return [STACKED_COLUMN_LAB];
      if (name === "labState") return STACKED_COLUMN_LAB;
      throw new Error(`unexpected lab read: ${name}`);
    },
  }, writable: true });
  assert.equal(await controller.verifyBaseThemePrecondition(), "Classic 2026");
  visible = false;
  const state = await controller.open();
  assert.equal(state.baseTheme, "Classic 2026");
});

test("unavailable or unsupported Base-theme preflight refuses", async () => {
  for (const value of [null, "Custom", "Classic 2027"]) {
    const controller = new LabController({ verbose: false });
    Object.defineProperty(controller, "session", { value: { async open() {}, close() {}, async read() { return value === null ? null : { value }; } }, writable: true });
    await assert.rejects(() => controller.verifyBaseThemePrecondition(), /unavailable or unsupported/);
  }
});

test("size restoration retains a valid semantic Base-theme preflight", async () => {
  const controller = new LabController({ requireVerifiedBaseTheme: true, verbose: false });
  controller.verifiedBaseTheme = "Classic 2026";
  controller.initialState = { width: 600, height: 600, baseTheme: "Classic 2026" };
  controller.mutated = { width: 450, height: 250 };
  let restoredSize = false;
  controller.setVisualSize = async (width, height) => {
    restoredSize = true;
    return { width, height, settled: true, observations: 0 };
  };
  controller.readBaseTheme = async () => { throw new Error("Base-theme UI must not be reopened during size-only restore"); };
  Object.defineProperty(controller, "session", { value: { async read(name: string) {
    if (name === "labState") return { width: 600, height: 600 };
    throw new Error(`unexpected lab read: ${name}`);
  } }, writable: true });
  const result = await controller.restore();
  assert.equal(restoredSize, true);
  assert.deepEqual(result, { restored: true, problems: [] });
});

test("a theme mutation invalidates the preflight before a required size action", async () => {
  const controller = new LabController({ requireVerifiedBaseTheme: true, verbose: false });
  controller.verifiedBaseTheme = "Classic 2026";
  Object.defineProperty(controller, "session", { value: { async read() { return []; } }, writable: true });
  await assert.rejects(() => controller.setBaseTheme("Classic 2018"));
  assert.equal(controller.verifiedBaseTheme, null);
  assert.throws(() => controller.requireVerifiedThemeForSize(), /missing or was invalidated/);
});

test("a successfully verified theme mutation refreshes the Base-theme proof", async () => {
  const controller = new LabController({ requireVerifiedBaseTheme: true, verbose: false });
  controller.verifiedBaseTheme = "Classic 2026";
  controller.requireLabVisual = async () => {};
  controller.openThemeControls = async () => ({ value: "Classic 2026", expanded: "false", x: 1, y: 1 });
  controller.settle = async () => ({ settled: true, observations: 3 });
  controller.selectVisual = async () => true;
  Object.defineProperty(controller, "session", { value: {
    async click() {},
    async read(name: string) {
      if (name === "baseThemeOptions") return [{ label: "Classic 2018", x: 2, y: 2 }];
      if (name === "baseThemeValue") return { value: "Classic 2018" };
      throw new Error(`unexpected lab read: ${name}`);
    },
  }, writable: true });

  const result = await controller.setBaseTheme("Classic 2018");
  assert.equal(result.theme, "Classic 2018");
  assert.equal(controller.verifiedBaseTheme, "Classic 2018");
  assert.doesNotThrow(() => controller.requireVerifiedThemeForSize());
});

test("a semantic no-op Base-theme request refreshes the proof", async () => {
  const controller = new LabController({ requireVerifiedBaseTheme: true, verbose: false });
  controller.verifiedBaseTheme = "Classic 2018";
  controller.requireLabVisual = async () => {};
  controller.openThemeControls = async () => ({ value: "Classic 2026", expanded: "false", x: 1, y: 1 });
  controller.selectVisual = async () => true;

  const result = await controller.setBaseTheme("Classic 2026");
  assert.deepEqual(result, { theme: "Classic 2026", changed: false, settled: true });
  assert.equal(controller.verifiedBaseTheme, "Classic 2026");
  assert.doesNotThrow(() => controller.requireVerifiedThemeForSize());
});

test("an unverified theme mutation leaves the Base-theme proof invalid", async () => {
  const controller = new LabController({ requireVerifiedBaseTheme: true, verbose: false });
  controller.verifiedBaseTheme = "Classic 2026";
  controller.requireLabVisual = async () => {};
  controller.openThemeControls = async () => ({ value: "Classic 2026", expanded: "false", x: 1, y: 1 });
  controller.settle = async () => ({ settled: true, observations: 3 });
  controller.selectVisual = async () => true;
  Object.defineProperty(controller, "session", { value: {
    async click() {},
    async read(name: string) {
      if (name === "baseThemeOptions") return [{ label: "Classic 2018", x: 2, y: 2 }];
      if (name === "baseThemeValue") return { value: "Classic 2026" };
      throw new Error(`unexpected lab read: ${name}`);
    },
  }, writable: true });

  await assert.rejects(() => controller.setBaseTheme("Classic 2018"), /did not change/);
  assert.equal(controller.verifiedBaseTheme, null);
  assert.throws(() => controller.requireVerifiedThemeForSize(), /missing or was invalidated/);
});

test("the cartesian renderer classifier positively distinguishes clustered Bar and Column", () => {
  assert.deepEqual(
    classifyCartesianRenderer({
      barMarkCount: 12,
      columnMarkCount: 0,
      seriesCount: 3,
      categoryPositionCount: 12,
    }),
    {
      orientation: "horizontal",
      markType: "bar",
      grouping: "clustered",
      categoryAxisSide: "left",
      valueAxisSide: "bottom",
      marksRendered: 12,
      categoriesRendered: 4,
    },
  );
  assert.deepEqual(
    classifyCartesianRenderer({
      barMarkCount: 0,
      columnMarkCount: 12,
      seriesCount: 3,
      categoryPositionCount: 12,
    }),
    {
      orientation: "vertical",
      markType: "column",
      grouping: "clustered",
      categoryAxisSide: "bottom",
      valueAxisSide: "left",
      marksRendered: 12,
      categoriesRendered: 4,
    },
  );
});

test("cartesian renderer classification fails closed on absent, mixed or incoherent marks", () => {
  for (const input of [
    { barMarkCount: 0, columnMarkCount: 0, seriesCount: 3, categoryPositionCount: 0 },
    { barMarkCount: 12, columnMarkCount: 12, seriesCount: 3, categoryPositionCount: 12 },
    { barMarkCount: 0, columnMarkCount: 11, seriesCount: 3, categoryPositionCount: 11 },
    { barMarkCount: 0, columnMarkCount: 12, seriesCount: 0, categoryPositionCount: 12 },
    { barMarkCount: 0, columnMarkCount: 12, seriesCount: 3, categoryPositionCount: 7 },
  ]) {
    assert.equal(classifyCartesianRenderer(input), null);
  }
});

test("the native Line classifier requires the observed hierarchy and three four-vertex paths", () => {
  assert.deepEqual(
    classifyLineRenderer({
      barMarkCount: 0,
      columnMarkCount: 0,
      lineVisualCount: 1,
      lineSvgCount: 1,
      lineAxisGroupCount: 1,
      linePathCount: 3,
      paintedLinePathCount: 3,
      lineVertexCounts: [4, 4, 4],
    }),
    {
      renderer: "line",
      orientation: "vertical",
      markType: "line",
      grouping: null,
      categoryAxisSide: "bottom",
      valueAxisSide: "left",
      marksRendered: 12,
      categoriesRendered: 4,
      seriesCount: 3,
      linePathCount: 3,
      lineVerticesPerPath: 4,
    },
  );
});

test("the Line classifier refuses absent, mixed, wrong-series, or wrong-vertex evidence", () => {
  const observed = {
    barMarkCount: 0, columnMarkCount: 0, lineVisualCount: 1, lineSvgCount: 1,
    lineAxisGroupCount: 1, linePathCount: 3, paintedLinePathCount: 3, lineVertexCounts: [4, 4, 4],
  };
  for (const invalid of [
    { ...observed, lineVisualCount: 0 },
    { ...observed, barMarkCount: 1 },
    { ...observed, columnMarkCount: 1 },
    { ...observed, paintedLinePathCount: 2 },
    { ...observed, linePathCount: 2, lineVertexCounts: [4, 4] },
    { ...observed, lineVertexCounts: [4, 3, 4] },
  ]) {
    assert.equal(classifyLineRenderer(invalid), null);
  }
});

test("physical axis bands preserve the established Bar mapping and reverse for Column", () => {
  const chart = { x: 8, y: 60, width: 580, height: 526, right: 588, bottom: 586 };
  const plot = { x: 92, y: 68, width: 480, height: 444, right: 572, bottom: 512 };
  const left = { x: 8, y: 68, width: 84, height: 444, right: 92, bottom: 512 };
  const bottom = { x: 92, y: 512, width: 480, height: 74, right: 572, bottom: 586 };

  assert.deepEqual(cartesianAxisBandBounds(LAB, chart, plot), {
    category: left,
    value: bottom,
  });
  assert.deepEqual(cartesianAxisBandBounds(COLUMN_LAB, chart, plot), {
    category: bottom,
    value: left,
  });
  assert.deepEqual(cartesianAxisBandBounds(LINE_LAB, chart, plot), {
    category: bottom,
    value: left,
  });
});

test("the synthetic lab environment is recognised", () => {
  assert.deepEqual(identifyLabEnvironment(LAB), { ok: true, reasons: [] });
});

test("the synthetic Clustered Column environment is recognised with physical axes preserved", () => {
  assert.deepEqual(identifyLabEnvironment(COLUMN_LAB), { ok: true, reasons: [] });
});

test("the synthetic Line environment is recognised only with an explicit Line expectation", () => {
  assert.equal(identifyLabEnvironment(LINE_LAB).ok, false);
  assert.deepEqual(identifyLabEnvironment(LINE_LAB, { renderer: "line" }), { ok: true, reasons: [] });
});

test("LabController defaults to the established clustered identity", async () => {
  const { controller } = controllerForIdentity({
    labVisuals: [LAB],
    labState: LAB,
  });
  const state = await controller.open();
  assert.equal(state.grouping, "clustered");
  await assert.doesNotReject(controller.requireLabVisual());
});

test("LabController accepts explicit clustered or stacked fixture expectations", async () => {
  const { controller: clustered } = controllerForIdentity({
    expectedGrouping: "clustered",
    labVisuals: [COLUMN_LAB],
    labState: COLUMN_LAB,
  });
  const { controller: stacked } = controllerForIdentity({
    expectedGrouping: "stacked",
    labVisuals: [STACKED_COLUMN_LAB],
    labState: STACKED_COLUMN_LAB,
  });

  await assert.doesNotReject(clustered.open());
  await assert.doesNotReject(stacked.open());
});

test("LabController accepts an explicit Line expectation and carries it into pre-mutation revalidation", async () => {
  const { controller, session } = controllerForIdentity({
    expectedRenderer: "line",
    labVisuals: [LINE_LAB],
    labState: LINE_LAB,
  });
  await assert.doesNotReject(controller.open());
  await assert.doesNotReject(controller.requireLabVisual());

  session.read = async (name) => {
    if (name === "labVisuals") return [{ ...LINE_LAB, lineVertexCounts: [4, 3, 4] }];
    throw new Error(`unexpected lab read: ${name}`);
  };
  await assert.rejects(controller.requireLabVisual(), /painted four-vertex series/);
});

test("LabController rejects unsupported or mismatched fixture groupings", async () => {
  for (const expectedGrouping of ["auto", "either", "bar", "", null]) {
    assert.throws(
      () => new LabController({ expectedGrouping: expectedGrouping as never }),
      /expectedGrouping must be one of/,
    );
  }

  const { controller: stackedRequestForClustered } = controllerForIdentity({
    expectedGrouping: "stacked",
    labVisuals: [COLUMN_LAB],
    labState: COLUMN_LAB,
  });
  const { controller: clusteredRequestForStacked } = controllerForIdentity({
    expectedGrouping: "clustered",
    labVisuals: [STACKED_COLUMN_LAB],
    labState: STACKED_COLUMN_LAB,
  });
  await assert.rejects(stackedRequestForClustered.open(), /grouping "clustered" is not stacked/);
  await assert.rejects(clusteredRequestForStacked.open(), /grouping "stacked" is not clustered/);
});

test("LabController rejects unsupported renderer expectations and Bar/Column fixtures requested as Line", async () => {
  for (const expectedRenderer of ["auto", "either", "column", "", null]) {
    assert.throws(
      () => new LabController({ expectedRenderer: expectedRenderer as never }),
      /expectedRenderer must be one of/,
    );
  }
  const { controller } = controllerForIdentity({
    expectedRenderer: "line",
    labVisuals: [COLUMN_LAB],
    labState: COLUMN_LAB,
  });
  await assert.rejects(controller.open(), /renderer "barOrColumn" is not line/);
});

test("LabController carries expected grouping into pre-mutation revalidation", async () => {
  const { controller, session } = controllerForIdentity({
    expectedGrouping: "stacked",
    labVisuals: [STACKED_COLUMN_LAB],
    labState: STACKED_COLUMN_LAB,
  });
  await controller.open();

  // This is the read that every mutating controller method makes immediately
  // before it drives a Desktop control. A visual changing to clustered after
  // open must be a refusal, not a fallback to the default expectation.
  session.read = async (name) => {
    if (name === "labVisuals") return [COLUMN_LAB];
    throw new Error(`unexpected lab read: ${name}`);
  };
  await assert.rejects(controller.requireLabVisual(), /grouping "clustered" is not stacked/);
});

test("orientation is required and cannot disagree with marks or physical axes", () => {
  for (const state of [
    { ...COLUMN_LAB, orientation: null },
    { ...COLUMN_LAB, markType: "bar" },
    { ...COLUMN_LAB, categoryAxisSide: "left" },
    { ...COLUMN_LAB, valueAxisSide: "bottom" },
    { ...COLUMN_LAB, grouping: "stacked" },
    { ...COLUMN_LAB, marksRendered: 11 },
  ]) {
    assert.equal(identifyLabEnvironment(state).ok, false);
  }
});

test("a visible legend must name every synthetic series", () => {
  assert.equal(
    identifyLabEnvironment({ ...COLUMN_LAB, seriesNames: ["Sum of Online", "Sum of Phone", "Sum of Revenue"] }).ok,
    false,
  );
  assert.equal(
    identifyLabEnvironment({ ...COLUMN_LAB, legendVisible: false, seriesNames: [] }).ok,
    true,
    "legend shedding is allowed because the sentinel remains mandatory",
  );
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
  assert.match(foreign.reasons.join(" "), /not a known fixture variant/);
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
  ...LAB,
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

// ---------------------------------------------------------------------------
// "Space between categories" — the other Layout slider
// ---------------------------------------------------------------------------

test("setCategorySpacing is allowlisted and implemented", () => {
  assert.ok(ALLOWED_ACTIONS.setCategorySpacing, "on the allowlist");
  assert.equal(ALLOWED_ACTIONS.setCategorySpacing.mutates, true);
  assert.equal(requireImplemented("setCategorySpacing"), true);
});

test("category spacing is validated against the range Power BI's control reports", () => {
  // 0..75, read from the slider itself. The same range as the series gap,
  // which sits 28px above it and is a different level of the layout.
  for (const spacing of [-1, 76, 100, Number.NaN, "20", undefined]) {
    assert.throws(
      () => validateAction({ type: "setCategorySpacing", spacing }),
      ActionError,
      `spacing ${String(spacing)} should be refused`,
    );
  }
  for (const spacing of [0, 20, 75]) {
    assert.equal(validateAction({ type: "setCategorySpacing", spacing }), true);
  }
});

test("category spacing and series gap restore independently", () => {
  // Conflating them would silently file one level of the layout under the
  // other, which is the whole reason they are separate actions.
  const plan = planRestoration(
    { width: 600, height: 600, gap: 10, categorySpacing: 20 },
    { gap: 40, categorySpacing: 75 },
  );
  assert.deepEqual(plan, [
    { type: "setSeriesGap", gap: 10 },
    { type: "setCategorySpacing", spacing: 20 },
  ]);
});

test("a category spacing left where it was found is never restored", () => {
  assert.deepEqual(planRestoration({ categorySpacing: 20 }, { categorySpacing: 20 }), []);
  assert.deepEqual(planRestoration({ categorySpacing: 20 }, {}), []);
});

test("an unrestored category spacing is reported as a problem", () => {
  const result = verifyRestoration({ categorySpacing: 20 }, { categorySpacing: 75 });
  assert.equal(result.restored, false);
  assert.match(result.problems.join(" "), /categorySpacing: expected 20, found 75/);
});

// ---------------------------------------------------------------------------
// The category-axis title toggle, declared but not driveable
// ---------------------------------------------------------------------------

test("setCategoryAxisTitleVisible is allowlisted and implemented", () => {
  // Driveable once the toggle's OWNER was found rather than its position: a
  // formatting-card owns a named heading, a formatting-group inside it owns
  // its own, and that group's header holds exactly one toggle.
  assert.ok(ALLOWED_ACTIONS.setCategoryAxisTitleVisible, "on the allowlist");
  assert.equal(ALLOWED_ACTIONS.setCategoryAxisTitleVisible.mutates, true);
  assert.equal(requireImplemented("setCategoryAxisTitleVisible"), true);
  assert.equal(validateAction({ type: "setCategoryAxisTitleVisible", visible: true }), true);
  assert.equal(validateAction({ type: "setCategoryAxisTitleVisible", visible: false }), true);
  for (const visible of ["yes", 1, 0, null, undefined]) {
    assert.throws(() => validateAction({ type: "setCategoryAxisTitleVisible", visible }), ActionError);
  }
});

test("a title visibility left alone is never restored", () => {
  assert.deepEqual(planRestoration({ categoryAxisTitleVisible: true }, {}), []);
  assert.deepEqual(
    planRestoration({ categoryAxisTitleVisible: true }, { categoryAxisTitleVisible: true }),
    [],
  );
  assert.deepEqual(
    planRestoration({ categoryAxisTitleVisible: true }, { categoryAxisTitleVisible: false }),
    [{ type: "setCategoryAxisTitleVisible", visible: true }],
  );
});

test("an unrestored title visibility is reported as a problem", () => {
  const result = verifyRestoration({ categoryAxisTitleVisible: true }, { categoryAxisTitleVisible: false });
  assert.equal(result.restored, false);
  assert.match(result.problems.join(" "), /categoryAxisTitleVisible: expected true, found false/);
});

// ---------------------------------------------------------------------------
// The theme label font family: allowlisted, not yet driveable
// ---------------------------------------------------------------------------

test("font families are allowlisted, not free text", () => {
  // The point of this action is to move measured text width while holding
  // font size fixed. That needs a handful of built-ins with different
  // metrics, not a font API.
  assert.ok(SUPPORTED_LABEL_FONTS.includes("Segoe UI"));
  assert.ok(SUPPORTED_LABEL_FONTS.includes("Courier New"));
  for (const family of ["Comic Sans", "'; DROP TABLE", "", 12, null]) {
    assert.throws(() => validateAction({ type: "setThemeLabelFontFamily", family }), ActionError);
  }
  assert.equal(validateAction({ type: "setThemeLabelFontFamily", family: "Arial" }), true);
});

test("setThemeLabelFontFamily refuses until the selection actually takes", () => {
  // The dropdown opens and reports all 26 families; clicking an option leaves
  // the control on its old value, while the size control beside it applies
  // live. Allowlisted means reviewed, not working.
  assert.equal(ALLOWED_ACTIONS.setThemeLabelFontFamily.implemented, false);
  assert.throws(() => requireImplemented("setThemeLabelFontFamily"), NotImplementedError);
});

test("a font family left alone is never restored", () => {
  assert.deepEqual(planRestoration({ themeLabelFontFamily: "Segoe UI" }, {}), []);
  assert.deepEqual(
    planRestoration({ themeLabelFontFamily: "Segoe UI" }, { themeLabelFontFamily: "Arial" }),
    [{ type: "setThemeLabelFontFamily", family: "Segoe UI" }],
  );
  const result = verifyRestoration({ themeLabelFontFamily: "Segoe UI" }, { themeLabelFontFamily: "Arial" });
  assert.equal(result.restored, false);
  assert.match(result.problems.join(" "), /themeLabelFontFamily: expected Segoe UI, found Arial/);
});

// ---------------------------------------------------------------------------
// Known fixture variants
// ---------------------------------------------------------------------------

test("each known fixture variant identifies, and nothing else does", () => {
  // The gutter experiment needs the widest label's width varied by hand,
  // because Power BI's font controls could not be driven to do it. Identity
  // has to recognise the edited fixture without degrading into "any four
  // categories".
  const base = {
    ...LAB,
  };
  for (const [name, categories] of Object.entries(FIXTURE_CATEGORY_SETS)) {
    const result = identifyLabEnvironment({ ...base, categories: [...categories] });
    assert.equal(result.ok, true, `${name}: ${result.reasons.join("; ")}`);
    assert.equal(fixtureVariantOf([...categories]), name);
  }
});

test("a category set that is not a known variant is refused", () => {
  const base = {
    ...LAB,
  };
  for (const categories of [
    ["Paris", "Berlin", "Madrid", "Rome"],
    ["London", "North West", "Scotland", "Cardiff"],
    // A mixture of two variants must not pass either.
    ["London", "NW", "Loughborough", "Wales"],
    [],
  ]) {
    const result = identifyLabEnvironment({ ...base, categories });
    assert.equal(result.ok, false, `${categories.join(",") || "(empty)"} should be refused`);
  }
  assert.equal(fixtureVariantOf(["Paris"]), null);
  assert.equal(fixtureVariantOf([]), null);
});

test("a shed subset of one variant still identifies", () => {
  // Power BI drops categories when space is tight; that must not read as a
  // different fixture.
  const result = identifyLabEnvironment({
    ...LAB,
    categories: ["London", "Loughborough"],
  });
  assert.equal(result.ok, true, result.reasons.join("; "));
});

test("an explicit expectation still overrides the variant list", () => {
  const result = identifyLabEnvironment(
    {
      ...LAB,
      categories: ["London", "NW", "Scotland", "Wales"],
    },
    { categories: ["London", "North West", "Scotland", "Wales"] },
  );
  assert.equal(result.ok, false, "a caller asking for BASELINE must not get SHORT");
});
