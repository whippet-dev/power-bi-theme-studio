/**
 * The order cards and settings appear in the settings catalogue.
 *
 * Microsoft's schema lists everything alphabetically, which scatters related
 * settings: an axis's gridline colour sits between its font family and its
 * label colour. This puts cards roughly in Format pane order (what the visual
 * shows, then its axes, labels, analytics lines and finally the General tab)
 * and, inside a card, puts the on/off switch first and keeps each part's
 * settings together (all the title's, then all the gridline's).
 *
 * Shared by the catalogue generator and the settings explorer, which re-sorts
 * after merging the cards every visual shares into a visual's own cards.
 */

const CARD_ORDER = [
  // Style and what the visual is made of.
  "stylePreset",
  "data",
  "slicerSettings",
  "header",
  "layout",
  "grid",
  "columnHeaders",
  "rowHeaders",
  "values",
  "value",
  "items",
  "selection",
  "selectionIcon",
  "searchBox",
  "dropdown",
  "date",
  "dateRange",
  "dateRangeText",
  "relativeText",
  "numericInputStyle",
  "slider",
  "calendarButton",
  "inputTextBox",
  "inputText",
  "filterOperator",
  "applyButton",
  "pendingChangesIcon",
  "subTotals",
  "total",
  "columnTotal",
  "rowTotal",
  "blankRows",
  "columnFormatting",
  "columnWidth",
  "sparklines",
  "expansionIcon",
  "legend",
  // Axes, kept together.
  "categoryAxis",
  "valueAxis",
  "y2Axis",
  "axis",
  "trendline",
  "zoom",
  // Everything else a visual draws goes here (see BODY below).
  "dataPoint",
  "lineStyles",
  "markers",
  "bubbles",
  "slices",
  "ribbonBands",
  // Labels.
  "labels",
  "dataLabels",
  "seriesLabels",
  "categoryLabels",
  "totals",
  "percentBarLabel",
  "calloutValue",
  "target",
  "plotArea",
  "smallMultiplesLayout",
  "subheader",
  // Analytics lines.
  "referenceLine",
  "xAxisReferenceLine",
  "y1AxisReferenceLine",
  "trend",
  "error",
  "forecast",
  "anomalyDetection",
  // The Format pane's General tab, shared by every visual.
  "general",
  "title",
  "subTitle",
  "divider",
  "spacing",
  "padding",
  "background",
  "border",
  "dropShadow",
  "lockAspect",
  "visualHeader",
  "visualHeaderTooltip",
  "visualTooltip",
  "visualLink",
  // Behind-the-scenes cards.
  "filters",
  "annotationTemplate",
  "hiddenProperties",
];

/** Cards not listed sit with the other parts the visual draws. */
const BODY = CARD_ORDER.indexOf("dataPoint") - 0.5;
const AXES = new Set(["categoryAxis", "valueAxis", "y2Axis"]);

function cardRank(card) {
  // The axes share one place, then axisRank puts them in reading order.
  const index = CARD_ORDER.indexOf(AXES.has(card.id) ? "categoryAxis" : card.id);
  return index === -1 ? BODY : index;
}

/** Axis cards in reading order: X axis, then Y axis, then secondary Y axis. */
function axisRank(card) {
  if (!AXES.has(card.id)) return 0;
  const title = card.title.toLocaleLowerCase();
  if (title.startsWith("x")) return 0;
  if (title.startsWith("y")) return 1;
  return 2;
}

export function sortCards(cards) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort(
      (left, right) =>
        cardRank(left.card) - cardRank(right.card) ||
        axisRank(left.card) - axisRank(right.card) ||
        left.index - right.index,
    )
    .map(({ card }) => card);
}

/**
 * Suffixes that name what a setting does to its part, in the order they
 * appear: "titleShow", "titleText", "titleFontFamily", ... "titleTransparency".
 */
const ASPECTS = [
  [/^(Show|Enabled?|Visible)$/, 0],
  [/^(Text|Label|ContentType|Type|Style|Mode|Shape|Heading)$/, 1],
  [/^(FontFamily|FontFace)$/, 2],
  [/^(FontSize|TextSize|Size)$/, 3],
  [/^Bold$/, 4],
  [/^Italic$/, 5],
  [/^Underline$/, 6],
  [/^(FontColor|Color|Colour)$/, 7],
  [/^Transparency$/, 8],
  [/^(Alignment|HorizontalAlignment|VerticalAlignment|Position|Orientation|Placement)$/, 9],
  [/^(Wrap|WordWrap)$/, 10],
  [/^(Width|Height|Thickness|Weight)$/, 11],
  [/^(DashArray|DashCap)$/, 12],
  [/^(Padding|Spacing|Margin)$/, 13],
  [/^(DisplayUnits|LabelDisplayUnits|Precision|LabelPrecision|DecimalPoints|FormatString|CustomFormatString|ShowBlankAs)$/, 14],
];
const OTHER = 50;
/** Parts that are the card's own text rather than a separate part of it. */
const MAIN_SUBJECTS = new Set(["", "font", "label", "text", "axis"]);

function lowerFirst(text) {
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}

/** "titleFontFamily" -> { subject: "title", aspect: 2 }. */
function describe(name) {
  if (name.startsWith("$")) return { subject: "", aspect: 1000 };
  if (/^(show|enabled?|visible)$/i.test(name)) return { subject: "", aspect: 0 };
  // "x", "y": where the visual sits.
  if (name === "x" || name === "y" || name === "z") return { subject: "", aspect: 9 };
  // An axis range reads start, then end.
  if (/^(start|end)$/.test(name)) return { subject: "", aspect: name === "start" ? 20 : 21 };
  if (/^sec(Start|End)$/.test(name)) return { subject: "sec", aspect: name === "secStart" ? 20 : 21 };
  const aspectOnly = ASPECTS.find(([pattern]) => pattern.test(name.charAt(0).toLocaleUpperCase() + name.slice(1)));
  if (aspectOnly) return { subject: "", aspect: aspectOnly[1] };

  // "showAxisTitle", "enableBackground": the switch for a part.
  const switched = /^(show|enable)([A-Z].*)$/.exec(name);
  if (switched && !/BlankAs$/.test(name)) return { subject: normalise(switched[2]), aspect: 0 };

  for (const [pattern, aspect] of ASPECTS) {
    const source = pattern.source.slice(2, -2); // the alternatives inside ^( )$
    const match = new RegExp(`^(.+?)(${source})$`).exec(name);
    if (match && /[a-z0-9]$/.test(match[1])) return { subject: normalise(match[1]), aspect };
  }
  return { subject: undefined, aspect: OTHER };
}

/** "AxisTitle" and "title" are the same part; "secTitle" stays separate. */
function normalise(subject) {
  return lowerFirst(subject).replace(/^axis(?=[A-Z])/, "").replace(/^([A-Z])/, (letter) => letter.toLocaleLowerCase())
    .replace(/^[A-Z]/, (letter) => letter.toLocaleLowerCase());
}

function subjectRank(subject) {
  if (MAIN_SUBJECTS.has(subject)) return 0;
  if (subject === "title") return 1;
  if (/^sec/.test(subject)) return 3;
  return 2;
}

/**
 * Settings sorted so the card's own switch comes first, then its own text and
 * look, then each part (title, gridline, detail labels ...) grouped together.
 */
export function sortProperties(properties) {
  const described = properties.map((property, index) => ({ property, index, ...describe(property.id) }));

  // A part with only one setting is not worth its own group.
  const counts = new Map();
  for (const entry of described) {
    if (entry.subject !== undefined) counts.set(entry.subject, (counts.get(entry.subject) ?? 0) + 1);
  }
  const groups = [...counts.keys()].filter((subject) => counts.get(subject) > 1 && !MAIN_SUBJECTS.has(subject));
  for (const entry of described) {
    if (entry.subject === undefined) {
      // "gridlineAutoScale" belongs with the other gridline settings.
      entry.subject = groups.find((subject) => entry.property.id.startsWith(subject)) ?? "";
    } else if (!groups.includes(entry.subject)) {
      entry.subject = "";
    }
    // The switch for a part that has no other settings sits with the card's switches.
    if (entry.subject === "" && entry.aspect === 0) entry.aspect = entry.property.id === "show" ? -1 : 0;
  }

  return described
    .sort(
      (left, right) =>
        // "$id" (which state or item an entry is for) always comes last.
        Number(left.aspect === 1000) - Number(right.aspect === 1000) ||
        subjectRank(left.subject) - subjectRank(right.subject) ||
        left.subject.localeCompare(right.subject) ||
        left.aspect - right.aspect ||
        left.property.id.localeCompare(right.property.id),
    )
    .map(({ property }) => property);
}
