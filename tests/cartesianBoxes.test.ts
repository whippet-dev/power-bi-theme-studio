import assert from "node:assert/strict";
import test from "node:test";
import {
  BAR_CHART_BOX,
  COLUMN_CHART_BOX,
  LINE_CHART_BOX,
  computePreviewCartesianLayout,
  minimumPlotHeight,
} from "../app/components/previews/cartesianLayout";
import { resolveBarChartStyle } from "../app/lib/barChartProperties";
import { getBaseTheme } from "../app/lib/baseThemes";
import { DEFAULT_TICK_COUNT } from "../app/lib/chartLayout";
import { resolveColumnChartStyle } from "../app/lib/columnChartProperties";
import { themeFontSizeToCssPx } from "../app/lib/fontUnits";
import { resolveLineChartStyle } from "../app/lib/lineChartProperties";
import {
  STACKED_DATA_MAX,
  LINE_DATA_MAX,
  barCategories,
  lineCategoryLabels,
} from "../app/lib/previewSampleData";
import { themeLayers } from "../app/lib/properties";
import { resolveStackedBarChartStyle } from "../app/lib/stackedBarChartProperties";
import { resolveStackedColumnChartStyle } from "../app/lib/stackedColumnChartProperties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

/**
 * The natural cartesian boxes are fixed constants, so nothing at runtime
 * keeps them honest. These tests do.
 *
 * The rule: a fixed box must leave every division of its plot at least one
 * line of the label sitting in it. On a bar chart a division is a category
 * row; on a column or line chart it is a tick interval. Both come out of the
 * same plot height, so one floor covers all five charts — but they read
 * different axes, which `verticalDivisionAxis` below spells out.
 *
 * This exists because the bar box rotted silently. 84 was chosen to reproduce
 * a pre-engine plot size against undersized fallback typography. Text-class
 * inheritance then corrected the source of that typography and the proven
 * point-to-pixel conversion raised what the gutters spend, until the
 * remainder fell to 10.5 units a row for labels needing 18. Both changes were
 * correct and both passed their own tests. The compression only ever showed
 * up in the leftovers, which is precisely what a floor assertion watches.
 */

const EMPTY: PowerBITheme = { name: "none", visualStyles: {} };

/** Every base a user can pick in one click; all of them must stay legible. */
const BASES = ["classic2026", "fluent2"] as const;

type AxisLike = { fontSize: number; innerPadding?: number };

const CARTESIAN = [
  {
    name: "Clustered Bar",
    visual: "clusteredBarChart",
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    resolve: resolveBarChartStyle,
  },
  {
    name: "Stacked Bar",
    // "barChart" is Power BI's internal name for the STACKED bar chart.
    visual: "barChart",
    box: BAR_CHART_BOX,
    orientation: "horizontal",
    resolve: resolveStackedBarChartStyle,
  },
  {
    name: "Clustered Column",
    visual: "clusteredColumnChart",
    box: COLUMN_CHART_BOX,
    orientation: "vertical",
    resolve: resolveColumnChartStyle,
  },
  {
    name: "Stacked Column",
    // Likewise "columnChart" is the STACKED column chart.
    visual: "columnChart",
    box: COLUMN_CHART_BOX,
    orientation: "vertical",
    resolve: resolveStackedColumnChartStyle,
  },
  {
    name: "Line",
    visual: "lineChart",
    box: LINE_CHART_BOX,
    orientation: "vertical",
    resolve: resolveLineChartStyle,
  },
] as const;

type Entry = (typeof CARTESIAN)[number];

/**
 * Which axis's labels are stacked down the plot's HEIGHT — the quantity the
 * floor is about. It follows from the orientation, not from the axis's name:
 *
 * - A **bar** chart lays its categories down the plot, one row each, and runs
 *   its value scale along the width. The labels dividing its height are the
 *   CATEGORY axis's.
 * - A **column** or **line** chart runs its categories along the width and
 *   its value scale up the height, so the labels stacked down that height are
 *   the VALUE axis's tick labels.
 *
 * Easy to lose, because the shipped bases size the two axes almost
 * identically — 10pt and 9pt on Classic 2026, both 10.5pt on Fluent 2 — so
 * reading the wrong one moves a floor by under two units and nothing fails.
 * "The floor reads the axis that divides the height" below sets them 30pt
 * against 6pt so that confusing them cannot hide.
 */
const verticalDivisionAxis = (entry: Entry): "categoryAxis" | "valueAxis" =>
  entry.orientation === "horizontal" ? "categoryAxis" : "valueAxis";

/** How many of those labels share the height. Same split, same reason. */
const divisionsOf = (entry: Entry, categories: readonly string[]) =>
  entry.orientation === "horizontal" ? categories.length : DEFAULT_TICK_COUNT;

/**
 * Lays a chart out exactly as its preview component does. The title fallbacks
 * and data maxima are copied from the components deliberately: a floor
 * measured against inputs the app never uses would prove nothing about the
 * app, and the axis titles are worth ~21 units of gutter on their own.
 */
const layoutOf = (entry: Entry, baseId: (typeof BASES)[number], custom: PowerBITheme = EMPTY) => {
  const isLine = entry.name === "Line";
  const src = themeLayers(custom, getBaseTheme(baseId));
  const style = entry.resolve(src, resolveTheme(src.roots)) as never as {
    categoryAxis: AxisLike;
    valueAxis: AxisLike;
  };
  const categories = isLine ? lineCategoryLabels : barCategories;
  const layout = computePreviewCartesianLayout({
    box: entry.box,
    orientation: entry.orientation,
    categoryAxis: style.categoryAxis as never,
    valueAxis: style.valueAxis as never,
    categories,
    dataMax: isLine ? LINE_DATA_MAX : STACKED_DATA_MAX,
    innerPadding: isLine ? 0 : (style.categoryAxis.innerPadding ?? 0),
    valueAxisTitleFallback: "Applications",
    categoryAxisTitleFallback: isLine ? "Month" : "Region",
  });
  return {
    layout,
    categories,
    /**
     * One line of the label that divides this chart's plot height, in the CSS
     * pixels the browser draws. Points would understate it by a quarter
     * (`PxPtRatio` is 4/3) and pass a box that visibly fails.
     */
    verticalDivisionLabelCssPx: themeFontSizeToCssPx(style[verticalDivisionAxis(entry)].fontSize),
  };
};

for (const entry of CARTESIAN) {
  for (const baseId of BASES) {
    test(`${entry.name} on ${baseId}: every plot division fits its own label`, () => {
      const { layout, categories, verticalDivisionLabelCssPx } = layoutOf(entry, baseId);
      const divisions = divisionsOf(entry, categories);
      const floor = minimumPlotHeight(divisions, verticalDivisionLabelCssPx);

      assert.ok(
        layout.plot.height >= floor,
        `${entry.name}/${baseId}: plot ${layout.plot.height.toFixed(2)} < floor ` +
          `${floor.toFixed(2)} — ${divisions} divisions of ` +
          `${(layout.plot.height / divisions).toFixed(2)} for a ` +
          `${(floor / divisions).toFixed(2)} line of ${verticalDivisionAxis(entry)} ` +
          `text. The box is ${entry.box.height}; raise it, or reduce what the ` +
          "gutters spend.",
      );
    });
  }
}

test("the floor reads the axis that divides the height", () => {
  // Guards the axis choice, which the shipped bases cannot: their two axis
  // sizes are within a point of each other, so misreading one for the other
  // moves every floor above by under two units and nothing fails. 30pt
  // against 6pt makes the mistake a factor of five.
  //
  // The expected axis is written out per chart rather than taken from
  // `verticalDivisionAxis`. Deriving the fixture from the function under
  // test would move both sides together, and the test would keep passing
  // however that function was broken.
  const DIVIDES_THE_HEIGHT = {
    "Clustered Bar": "categoryAxis",
    "Stacked Bar": "categoryAxis",
    "Clustered Column": "valueAxis",
    "Stacked Column": "valueAxis",
    Line: "valueAxis",
  } as const;

  const LARGE = 30;
  const SMALL = 6;

  for (const entry of CARTESIAN) {
    const vertical = DIVIDES_THE_HEIGHT[entry.name];
    const alongTheWidth = vertical === "categoryAxis" ? "valueAxis" : "categoryAxis";

    let custom = updateThemeValue(
      EMPTY,
      ["visualStyles", entry.visual, "*", vertical, 0, "fontSize"],
      LARGE,
    );
    custom = updateThemeValue(
      custom,
      ["visualStyles", entry.visual, "*", alongTheWidth, 0, "fontSize"],
      SMALL,
    );

    const { verticalDivisionLabelCssPx } = layoutOf(entry, "classic2026", custom);

    assert.equal(
      verticalDivisionLabelCssPx,
      themeFontSizeToCssPx(LARGE),
      `${entry.name} is ${entry.orientation}, so ${vertical} labels divide its ` +
        `plot height — the floor must measure those, not ${alongTheWidth}`,
    );
    assert.notEqual(
      verticalDivisionLabelCssPx,
      themeFontSizeToCssPx(SMALL),
      `${entry.name}: the floor read ${alongTheWidth}, which runs along the width`,
    );

    // And the helper agrees with the table, so the two cannot drift apart
    // without this failing.
    assert.equal(verticalDivisionAxis(entry), vertical, `${entry.name}: axis choice`);
  }
});

test("the floor catches the box this replaced", () => {
  // The anti-vacuity check, and the regression. 84 is what the bar charts
  // used until the gutters grew under it; if the floor cannot see that, it is
  // not measuring anything and the next silent compression gets through too.
  // Both bases, because one passing base would hide the other.
  const SHORT = { ...BAR_CHART_BOX, height: 84 };

  for (const entry of CARTESIAN.filter((c) => c.orientation === "horizontal")) {
    for (const baseId of BASES) {
      const { layout, categories, verticalDivisionLabelCssPx } = layoutOf(entry, baseId);
      const floor = minimumPlotHeight(categories.length, verticalDivisionLabelCssPx);
      const short = layoutOf({ ...entry, box: SHORT }, baseId);

      assert.ok(
        short.layout.plot.height < floor,
        `${entry.name}/${baseId}: 84 should fail the floor, got ` +
          `${short.layout.plot.height.toFixed(2)} against ${floor.toFixed(2)}`,
      );
      // And the box in use must clear it, or both halves of this assertion
      // could be true of a floor set absurdly high.
      assert.ok(layout.plot.height >= floor);
    }
  }
});

test("a bar chart divides its plot by rows, a column chart by ticks", () => {
  // The sample data hides this: four categories and four tick intervals make
  // the two divisors the same number, so nothing above can tell them apart.
  // Twelve categories separate them — and show why a fixed box eventually has
  // to scroll rather than stretch, which is what Power BI does.
  const twelve = Array.from({ length: 12 }, (_, i) => `Region ${i + 1}`);

  const bar = layoutOf(CARTESIAN[0], "classic2026");
  const column = layoutOf(CARTESIAN[2], "classic2026");

  // Each orientation gets its own floor, from its own axis. Sharing one line
  // height between them is the mistake this test used to make.
  const barLine = minimumPlotHeight(1, bar.verticalDivisionLabelCssPx);
  const columnLine = minimumPlotHeight(1, column.verticalDivisionLabelCssPx);

  assert.equal(divisionsOf(CARTESIAN[0], twelve), twelve.length);
  assert.equal(divisionsOf(CARTESIAN[2], twelve), DEFAULT_TICK_COUNT);

  // The bar chart's rows are its categories, so enough of them stop fitting:
  // a fixed box scrolls, it does not grow. Derived from the box rather than
  // hardcoded, because the authored size is now 450x250 and twelve rows do
  // fit in it - the point was never the number twelve.
  assert.ok(bar.layout.plot.height / 4 >= barLine);
  const tooMany = Math.ceil(bar.layout.plot.height / barLine) + 1;
  assert.ok(
    bar.layout.plot.height / tooMany < barLine,
    `${tooMany} rows should no longer fit — a fixed box scrolls, it does not grow`,
  );

  // The column chart's vertical divisions are tick intervals, which twelve
  // categories do not touch: they crowd the width instead.
  assert.ok(column.layout.plot.height / DEFAULT_TICK_COUNT >= columnLine);
});

test("a bigger font costs plot, it does not move the box", () => {
  // The fixed-box model, asserted directly. Power BI hands a visual a
  // viewport carved out of its authored rectangle: formatting subtracts from
  // the plot and never grows the container back. A theme that doubles every
  // font must therefore shrink the plot and leave the box alone.
  // Set through visualStyles rather than the text classes. Axis typography
  // is the only formatting that moves a gutter, and its size is now a native
  // constant that no text class reaches — so a class-only theme would leave
  // the layout identical and this test would prove nothing.
  const HUGE: PowerBITheme = {
    name: "huge",
    textClasses: {
      callout: { fontFace: "Segoe UI", fontSize: 80, color: "#111111" },
      header: { fontFace: "Segoe UI", fontSize: 40, color: "#111111" },
      title: { fontFace: "Segoe UI", fontSize: 24, color: "#111111" },
      label: { fontFace: "Segoe UI", fontSize: 20, color: "#111111" },
    },
    visualStyles: {
      "*": {
        "*": {
          categoryAxis: [{ fontSize: 40, titleFontSize: 40 }],
          valueAxis: [{ fontSize: 40, titleFontSize: 40 }],
        },
      },
    },
  };

  for (const entry of CARTESIAN) {
    const small = layoutOf(entry, "classic2026");
    const large = layoutOf(entry, "classic2026", HUGE);

    assert.deepEqual(large.layout.outer, small.layout.outer, `${entry.name}: the box moved`);
    assert.ok(
      large.layout.plot.height < small.layout.plot.height,
      `${entry.name}: a much larger font must visibly cost plot height, got ` +
        `${large.layout.plot.height} against ${small.layout.plot.height}`,
    );
  }
});

test("category count does not resize the box either", () => {
  // Power BI thins the bars and eventually scrolls; it does not grow the
  // visual. Same reason as the font case, and the place a "natural size"
  // model is most tempting to make dynamic.
  const src = themeLayers(EMPTY, getBaseTheme("classic2026"));
  const style = resolveBarChartStyle(src, resolveTheme(src.roots));
  const lay = (categories: readonly string[]) =>
    computePreviewCartesianLayout({
      box: BAR_CHART_BOX,
      orientation: "horizontal",
      categoryAxis: style.categoryAxis,
      valueAxis: style.valueAxis,
      categories,
      dataMax: STACKED_DATA_MAX,
      innerPadding: style.categoryAxis.innerPadding,
      valueAxisTitleFallback: "Applications",
      categoryAxisTitleFallback: "Region",
    });

  const four = lay(barCategories);
  const twelve = lay(Array.from({ length: 12 }, (_, i) => `Region ${i + 1}`));

  assert.deepEqual(twelve.outer, four.outer);
  assert.equal(twelve.plot.height, four.plot.height);
  assert.ok(
    twelve.scale.category(0, 12).size < four.scale.category(0, 4).size,
    "twelve categories must share the same plot, so each band gets thinner",
  );
});
