import assert from "node:assert/strict";
import test from "node:test";
import classic2026 from "../themes/base/classic2026.json" with { type: "json" };
import fluent2 from "../themes/base/fluent2.json" with { type: "json" };
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { resolvePieChartStyle } from "../app/lib/pieChartProperties";
import { readVisualStyleValue, resolveColorValue } from "../app/lib/properties";
import { mergeThemeOverBase, readThemeValueAtPath, resolveTheme, type PowerBITheme } from "../app/lib/theme";

/**
 * Regression tests for the two P0 colour-resolution bugs found in the
 * 2026-08-18 architecture review (see ARCHITECTURE_REVIEW.md §3.2).
 *
 * Both bugs failed *silently*: readVisualStyleValue tested every colour
 * against a hex regex, so a theme token name ("foregroundNeutralSecondary")
 * or a ThemeDataColor expression returned `undefined` and resolution fell
 * through to a coded default — a plausible-looking but wrong colour, with
 * no error anywhere.
 *
 * These use the real shipped base themes as fixtures rather than
 * hand-written stubs, because the whole point is that Power BI's own
 * output uses these forms and this app was dropping them.
 */

const BASE_CLASSIC_2026 = classic2026 as unknown as PowerBITheme;
const BASE_FLUENT_2 = fluent2 as unknown as PowerBITheme;
const EMPTY_USER_THEME: PowerBITheme = { name: "User theme", visualStyles: {} };

// --- resolveColorValue, in isolation --------------------------------------

test("resolveColorValue passes literal hex through, in both 6- and 8-digit forms", () => {
  const theme: PowerBITheme = {};
  assert.equal(resolveColorValue({ solid: { color: "#1A2B3C" } }, theme), "#1A2B3C");
  // 8-digit #RRGGBBAA: Power BI writes this when a colour carries its own
  // alpha rather than using a separate `transparency` field.
  assert.equal(resolveColorValue({ solid: { color: "#1A2B3C80" } }, theme), "#1A2B3C80");
});

test("resolveColorValue looks a bare token name up against the theme's own root colours", () => {
  // Confirmed against Power BI Desktop's own code, which calls
  // getThemeColor(theme, "foregroundNeutralSecondary") for exactly this.
  const theme: PowerBITheme = { foregroundNeutralSecondary: "#616161", background: "#FFFFFF" };
  assert.equal(resolveColorValue({ solid: { color: "foregroundNeutralSecondary" } }, theme), "#616161");
  assert.equal(resolveColorValue({ solid: { color: "background" } }, theme), "#FFFFFF");
});

test("resolveColorValue returns undefined for a token the theme doesn't define, rather than inventing one", () => {
  const theme: PowerBITheme = { background: "#FFFFFF" };
  assert.equal(resolveColorValue({ solid: { color: "noSuchToken" } }, theme), undefined);
});

test("resolveColorValue resolves a ThemeDataColor expression against dataColors", () => {
  const theme: PowerBITheme = { dataColors: ["#118DFF", "#12239E", "#E66C37"] };
  const expr = (ColorId: number, Percent: number) => ({ solid: { color: { expr: { ThemeDataColor: { ColorId, Percent } } } } });

  assert.equal(resolveColorValue(expr(0, 0), theme), "#118DFF");
  assert.equal(resolveColorValue(expr(2, 0), theme), "#E66C37");
  // Out of range must not throw or silently return colour 0.
  assert.equal(resolveColorValue(expr(99, 0), theme), undefined);
});

test("ThemeDataColor Percent shades toward black when negative and tints toward white when positive", () => {
  const theme: PowerBITheme = { dataColors: ["#808080"] };
  const expr = (Percent: number) => ({ solid: { color: { expr: { ThemeDataColor: { ColorId: 0, Percent } } } } });

  assert.equal(resolveColorValue(expr(0), theme), "#808080", "Percent 0 is the unmodified colour");

  const darker = resolveColorValue(expr(-0.5), theme)!;
  const lighter = resolveColorValue(expr(0.5), theme)!;
  const channel = (hex: string) => parseInt(hex.slice(1, 3), 16);

  assert.ok(channel(darker) < 0x80, `negative Percent must darken, got ${darker}`);
  assert.ok(channel(lighter) > 0x80, `positive Percent must lighten, got ${lighter}`);
  // Half way to black from #808080 is #404040; half way to white is #C0C0C0.
  assert.equal(darker, "#404040");
  assert.equal(lighter, "#C0C0C0");
});

test("resolveColorValue leaves malformed or unrecognised colour shapes as undefined", () => {
  const theme: PowerBITheme = { dataColors: ["#118DFF"] };
  assert.equal(resolveColorValue(undefined, theme), undefined);
  assert.equal(resolveColorValue({ solid: {} }, theme), undefined);
  assert.equal(resolveColorValue({ notSolid: { color: "#FFFFFF" } }, theme), undefined);
  assert.equal(resolveColorValue({ solid: { color: { expr: { SomethingElse: {} } } } }, theme), undefined);
});

// --- end-to-end, through the real base themes -----------------------------

test("BUG FIX: a token reference in Fluent 2's shared bucket resolves to the token's colour, not the coded default", () => {
  // Fluent 2 sets visualStyles["*"]["*"].categoryAxis[0].labelColor to the
  // *token* "foregroundNeutralSecondary" (#616161). Before the fix this
  // resolved to #242424 (the theme's plain `foreground`) because the hex
  // regex rejected the token name and resolution fell through.
  const effective = mergeThemeOverBase(BASE_FLUENT_2, EMPTY_USER_THEME);

  assert.equal(
    readVisualStyleValue(effective, { visual: "*", path: ["categoryAxis", 0, "labelColor"], valueType: "color" }),
    "#616161",
    "the raw read must resolve the token",
  );

  const bar = resolveBarChartStyle(effective, resolveTheme(effective));
  assert.equal(bar.categoryAxis.labelColor, "#616161");
  assert.notEqual(bar.categoryAxis.labelColor, "#242424", "must not fall back to plain foreground");
});

test("BUG FIX: a ThemeDataColor expression in Fluent 2 resolves to the data colour, not the coded default", () => {
  // Fluent 2 sets pieChart dataPoint.borderColor to
  // {expr:{ThemeDataColor:{ColorId:0,Percent:0}}}. Before the fix this
  // resolved to the coded #E3E3E3 fallback.
  const effective = mergeThemeOverBase(BASE_FLUENT_2, EMPTY_USER_THEME);
  const pie = resolvePieChartStyle(effective, resolveTheme(effective));

  assert.equal(pie.dataPoint.borderColor, "#118DFF", "ColorId 0 is dataColors[0]");
  assert.notEqual(pie.dataPoint.borderColor, "#E3E3E3", "must not fall back to the coded default");
});

test("a user's own dataColors override feeds ThemeDataColor, so the expression tracks the edited palette", () => {
  // Confirms the expression is resolved against the *effective* theme, not
  // the base theme it happened to be written in.
  const userTheme: PowerBITheme = { ...EMPTY_USER_THEME, dataColors: ["#AA0000", "#00AA00"] };
  const effective = mergeThemeOverBase(BASE_FLUENT_2, userTheme);
  const pie = resolvePieChartStyle(effective, resolveTheme(effective));

  assert.equal(pie.dataPoint.borderColor, "#AA0000");
});

test("Classic 2026's token references resolve too, confirming this is not Fluent-2-specific", () => {
  // Classic 2026's token references all sit under `cardVisual`, which this
  // app deliberately doesn't model yet — so this asserts through
  // resolveColorValue against the real raw value rather than widening
  // VisualSchemaKey just to reach it from a test.
  const effective = mergeThemeOverBase(BASE_CLASSIC_2026, EMPTY_USER_THEME);
  const raw = readThemeValueAtPath(effective, ["visualStyles", "cardVisual", "*", "label", 0, "fontColor"]);

  assert.deepEqual(raw, { solid: { color: "foregroundNeutralSecondary" } }, "fixture still uses a token here");
  assert.equal(resolveColorValue(raw, effective), "#605E5C");
});
