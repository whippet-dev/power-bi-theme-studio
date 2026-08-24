/**
 * The fixed sample data every cartesian preview plots.
 *
 * One typed fixture rather than parallel arrays, because the previews need
 * the same figures to mean the same thing: a clustered chart and a stacked
 * chart drawing unrelated numbers cannot show a user what the difference
 * between them *is*. Everything derived — totals, maxima, palette slots — is
 * computed here rather than restated as a constant that a comment promises to
 * keep in step.
 *
 * Nothing is theme-derived. The labels are synthetic.
 */

/** One series: a stable key, a display label, one value per category. */
export type PreviewSeries = {
  /** Identity. Stable across charts, so a series keeps its colour. */
  key: string;
  /** Legend text. Short, because the preview tiles are small. */
  label: string;
  /** Exactly one value per category, in category order. */
  values: readonly number[];
};

export type CartesianFixture = {
  categories: readonly string[];
  series: readonly PreviewSeries[];
};

/**
 * The bar and column fixture, shared by all four rectangular charts.
 *
 * Three series, because two can be read as a single bar with a lighter end
 * and only the third makes clustering unmistakable. Four categories, kept
 * from the previous fixture deliberately: task 7 fixed the natural boxes, and
 * adding categories would spend the vertical room a bar chart's rows need
 * without demonstrating anything about series.
 *
 * The values are chosen so the category totals are 82, 66, 51 and 38 — the
 * figures this app plotted as single values before there were series. So the
 * stacked charts still reach the same totals, and the value axis they label
 * has not moved.
 *
 * Every column decreases across the series and every row decreases across the
 * categories, with no ties anywhere. A renderer that reversed the series
 * order, or paired a series with the wrong category, produces different
 * numbers rather than a coincidentally identical picture.
 */
export const cartesianFixture: CartesianFixture = {
  categories: ["London", "North West", "Scotland", "Wales"],
  series: [
    { key: "online", label: "Online", values: [46, 38, 29, 22] },
    { key: "phone", label: "Phone", values: [24, 19, 14, 11] },
    { key: "post", label: "Post", values: [12, 9, 8, 5] },
  ],
};

/**
 * The line fixture. Five months, and its own series because a line chart
 * showing the same four regions over time would be claiming a relationship
 * the bar fixture does not have.
 *
 * `Online` keeps the values this chart drew as its only series. The other two
 * are shaped to cross it rather than shadow it — `Phone` rises while `Online`
 * dips at Mar — and to end well apart (48, 52, 21), so series labels anchored
 * at the right-hand end are separable without a collision solver.
 */
export const lineFixture: CartesianFixture = {
  categories: ["Jan", "Feb", "Mar", "Apr", "May"],
  series: [
    { key: "online", label: "Online", values: [42, 58, 30, 68, 48] },
    { key: "phone", label: "Phone", values: [28, 34, 41, 39, 52] },
    { key: "post", label: "Post", values: [15, 22, 18, 26, 21] },
  ],
};

/** Values are authored in thousands; the axes label the real figure. */
export const VALUE_SCALE = 1_000;

/** Every category's series values, in series order. */
export const categoryValues = (fixture: CartesianFixture, index: number): number[] =>
  fixture.series.map((series) => series.values[index] ?? 0);

/** One total per category, in category order. */
export const categoryTotals = (fixture: CartesianFixture): number[] =>
  fixture.categories.map((_, index) =>
    categoryValues(fixture, index).reduce((sum, value) => sum + value, 0),
  );

/**
 * The maximum a **clustered** chart has to reach: the largest single value,
 * because each series is drawn from the baseline independently.
 */
export const clusteredMax = (fixture: CartesianFixture): number =>
  Math.max(...fixture.series.flatMap((series) => series.values));

/**
 * The maximum a **stacked** chart has to reach: the largest category total,
 * because the series accumulate. Distinct from `clusteredMax` by definition,
 * and the reason one shared `BAR_DATA_MAX` could not survive real series.
 */
export const stackedMax = (fixture: CartesianFixture): number =>
  Math.max(...categoryTotals(fixture));

/** 46,000 — the largest single series value. */
export const CLUSTERED_DATA_MAX = clusteredMax(cartesianFixture) * VALUE_SCALE;

/** 82,000 — the largest category total, and the figure the axis used before. */
export const STACKED_DATA_MAX = stackedMax(cartesianFixture) * VALUE_SCALE;

/**
 * The line chart's value-axis maximum. Kept at 70,000 rather than derived:
 * it is a pre-existing convention of this preview, above the fixture's 68,
 * and whether Power BI would round an automatic maximum to it has not been
 * established. Changing it belongs with that question, not here.
 */
export const LINE_DATA_MAX = 70_000;

/** Category labels, for the axis. */
export const barCategories: readonly string[] = cartesianFixture.categories;

/** The line chart's category labels, one per plotted point. */
export const lineCategoryLabels: readonly string[] = lineFixture.categories;

/**
 * Which palette entry a series takes.
 *
 * Index order, so the same series is the same colour in all five charts and a
 * legend swatch means the same thing wherever it appears. The first series
 * keeps index 0, which is what a visual's own resolved `dataPoint.fill`
 * already refers to, so single-series behaviour is unchanged.
 */
export const seriesPaletteIndex = (seriesIndex: number): number => seriesIndex;

/**
 * The colour for one series: its own palette entry, falling back to the first
 * so a short palette repeats rather than rendering nothing.
 */
export const seriesColor = (
  palette: readonly string[],
  seriesIndex: number,
  primary?: string,
): string => {
  // Series 0 defers to the visual's resolved main colour when it has one, so
  // `dataPoint.fill` keeps meaning what it meant before there were series.
  if (seriesIndex === 0 && primary) return primary;
  return palette[seriesPaletteIndex(seriesIndex)] ?? palette[0] ?? "#118DFF";
};
