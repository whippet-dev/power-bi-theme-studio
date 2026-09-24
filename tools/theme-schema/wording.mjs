/**
 * Plain-language wording for the settings catalogue, written for the card and
 * visual each setting sits in.
 *
 * Two layers, both taking priority over Microsoft's and the editor's text:
 *
 * - CURATED: sentences written by hand for the settings people meet most --
 *   axes, legend, data labels, constant lines, lines and markers. Keyed by
 *   "card.setting"; "{card}" becomes the card as it reads in that visual ("the
 *   X axis", or "the Y axis" on a bar chart) and "{marks}" the things the
 *   visual draws ("bars", "slices").
 * - partDescription(): one pattern for the settings every card repeats -- font,
 *   size, bold, colour, transparency, dash style, number format -- naming the
 *   part of the card it styles: "The colour of the gridlines of the Y axis."
 *
 * Microsoft's own text is written for the Format pane ("Select the units
 * (millions, billions, etc.)"), is sometimes copied from the wrong setting
 * ("Select color for data labels." on the title line's colour), and reads
 * differently from one visual to the next. Using one pattern keeps the same
 * setting described the same way everywhere.
 */

/** What each visual draws, for "{marks}". */
const MARKS = {
  barChart: "bars",
  clusteredBarChart: "bars",
  hundredPercentStackedBarChart: "bars",
  columnChart: "columns",
  clusteredColumnChart: "columns",
  hundredPercentStackedColumnChart: "columns",
  waterfallChart: "columns",
  lineChart: "lines",
  areaChart: "areas",
  stackedAreaChart: "areas",
  hundredPercentStackedAreaChart: "areas",
  lineClusteredColumnComboChart: "columns and lines",
  lineStackedColumnComboChart: "columns and lines",
  ribbonChart: "ribbons and columns",
  pieChart: "slices",
  donutChart: "slices",
  funnel: "bars",
  treemap: "rectangles",
  scatterChart: "points",
  map: "bubbles",
  azureMap: "bubbles",
  filledMap: "shaded areas",
  shapeMap: "shapes",
};

export function marksFor(visualId) {
  return MARKS[visualId] ?? "data points";
}

/** Cards whose title does not read well in a sentence. */
export const CARD_PHRASES = {
  dataPoint: (visualId) => `the ${marksFor(visualId)}`,
  smallMultiplesLayout: () => "the small multiples grid",
  subheader: () => "the small multiple titles",
  lineStyles: () => "the lines",
  defaultColors: () => "the shapes",
  // One card name, four different things.
  layout: (visualId) =>
    ({
      cardVisual: "the cards",
      advancedSlicerVisual: "the slicer buttons",
      listSlicer: "the slicer buttons",
      bookmarkNavigator: "the buttons",
      pageNavigator: "the buttons",
      treemap: "the treemap",
    })[visualId] ?? "the chart",
};

const AXIS = ["categoryAxis", "valueAxis"];
const LINES = ["referenceLine", "xAxisReferenceLine", "y1AxisReferenceLine"];
const PER_VISUAL = "This is usually set on individual visuals rather than in a theme.";

function forCards(cards, entries) {
  return Object.fromEntries(cards.flatMap((card) => Object.entries(entries).map(([setting, text]) => [`${card}.${setting}`, text])));
}

export const CURATED = {
  // Axes. "{card}" is "the X axis" or "the Y axis" depending on the chart.
  "categoryAxis.show":
    "Shows or hides {card}, where the categories on this chart are listed, such as months or product names.",
  "valueAxis.show": "Shows or hides {card}, which shows the scale the values are measured against.",
  "categoryAxis.axisType":
    "Whether {card} treats its categories as separate items (Categorical) or as a continuous scale (Continuous), which suits dates and numbers.",
  ...forCards(AXIS, {
    axisStyle: "What the title of {card} shows: the field name, the display units, or both.",
    showAxisTitle: "Shows or hides the title of {card}.",
    titleText: `The title shown on {card}. Power BI uses the field name when this is left out. ${PER_VISUAL}`,
    start: `Where {card} starts. Leave it out to let Power BI fit the axis to the data. ${PER_VISUAL}`,
    end: `Where {card} ends. Leave it out to let Power BI fit the axis to the data. ${PER_VISUAL}`,
    invertAxis: "Reverses the direction of {card}, so it runs from the opposite end.",
    logAxisScale: "Uses a logarithmic scale on {card}, which helps when values range from very small to very large.",
    switchAxisPosition: "Moves {card} to the opposite side of the chart.",
    roundRange: "Rounds the start and end of {card} to tidy numbers.",
    maxMarginFactor: "The largest share of the visual, as a percentage, that {card} and its labels can take up.",
    gridlineShow: "Shows or hides the gridlines that run across the chart from {card}.",
    concatenateLabels:
      "Shows the levels of a date or category hierarchy joined in one label (such as \"2024 Qtr 1\") instead of as separate rows of labels.",
    sharedAxis: "When the chart is split into small multiples, whether they all share the same scale on {card}.",
  }),
  "categoryAxis.preferredCategoryWidth":
    "The narrowest each category can get, in pixels, before the chart starts to scroll.",
  "categoryAxis.innerPadding": "The gap between categories, as a percentage of each category's width.",
  "categoryAxis.outerPadding": "The space at each end of {card}, as a percentage of a category's width.",
  ...forCards(["valueAxis", "y2Axis"], {
    secShow: "Shows or hides the secondary Y axis, a second scale for values measured in different units.",
    secAxisStyle: "What the title of the secondary Y axis shows: the field name, the display units, or both.",
    secShowAxisTitle: "Shows or hides the title of the secondary Y axis.",
    secTitleText: `The title shown on the secondary Y axis. Power BI uses the field name when this is left out. ${PER_VISUAL}`,
    secStart: `Where the secondary Y axis starts. Leave it out to let Power BI fit the axis to the data. ${PER_VISUAL}`,
    secEnd: `Where the secondary Y axis ends. Leave it out to let Power BI fit the axis to the data. ${PER_VISUAL}`,
    secLogAxisScale:
      "Uses a logarithmic scale on the secondary Y axis, which helps when values range from very small to very large.",
    secRoundRange: "Rounds the start and end of the secondary Y axis to tidy numbers.",
  }),
  "y2Axis.show": "Shows or hides the secondary Y axis, a second scale for values measured in different units.",
  "valueAxis.alignZeros": "Lines up zero on the Y axis and the secondary Y axis.",

  // Legend.
  "legend.show": "Shows or hides the legend, which names the colour used for each series.",
  "legend.position": "Where the legend sits around the chart, such as at the top, bottom, left or right.",
  "legend.showTitle": "Shows or hides the legend title, which names the field the legend lists.",
  "legend.titleText": `The legend title. Power BI uses the field name when this is left out. ${PER_VISUAL}`,
  "legend.legendMarkerRendering": "The shape of the marker next to each entry in the legend.",

  // Data colours.
  "dataPoint.fill":
    "The colour of the {marks}. Setting it gives every series the same colour; leave it out to use the theme's data colours in order.",
  "dataPoint.defaultColor": "The main colour of the {marks}.",
  "dataPoint.borderOutlineOnly":
    "Draws the border around the outside of each stack only, leaving out the borders between its segments.",

  // Data labels.
  "labels.show": "Shows or hides data labels: the values written on or next to each data point.",
  "labels.labelPosition": "Where the data labels sit relative to each data point, such as inside the end or outside.",
  "labels.labelContentLayout": "Whether the title, value and detail of each data label sit on one line or on separate lines.",
  "labels.enableTitleDataLabel": "Adds a title line to each data label, such as the series name.",
  "labels.titleContentType": "What the title line of each data label shows, such as the series name.",
  "labels.enableValueDataLabel": "Shows or hides the value line of each data label.",
  "labels.enableDetailDataLabel": "Adds a detail line to each data label, such as the percentage of the total.",
  "labels.detailContentType": "What the detail line of each data label shows, such as the percentage of the total.",
  "labels.enableBackground": "Shows or hides a background behind the data labels.",
  "labels.wordWrap": "Lets long data labels wrap onto more than one line.",
  "labels.leaderLines": "Shows or hides lines joining each data label to its data point.",
  "labels.labelStyle":
    "What each label shows, such as the category name, the value, the percentage of the total, or a combination.",

  // Series labels, total labels, small multiples.
  "seriesLabels.show": "Shows or hides series labels, which write each series name at the end of its line.",
  "seriesLabels.seriesPosition": "Whether the series labels sit at the left or right end of the lines.",
  "seriesLabels.seriesMatchColor": "Colours each series label to match its line.",
  "seriesLabels.backgroundMatchColor": "Colours the background of each series label to match its line.",
  "seriesLabels.enableBackground": "Shows or hides a background behind the series labels.",
  "totals.show": "Shows or hides a label with the total at the end of each stack.",
  "totals.enableBackground": "Shows or hides a background behind the total labels.",
  "smallMultiplesLayout.layoutType":
    "Whether Power BI arranges the small multiples for you, or uses the number of rows and columns set here.",
  "subheader.show": "Shows or hides the title above each small multiple.",

  // Lines and markers on line and area charts.
  "lineStyles.strokeWidth": "The thickness of the lines, in pixels.",
  "lineStyles.lineStyle": "Whether the lines are solid, dashed or dotted.",
  "lineStyles.lineChartType": "How each line is drawn between points: straight, smooth, or in steps.",
  "lineStyles.showMarker": "Shows or hides a marker on each data point along the lines.",
  "lineStyles.markerShape": "The shape of the markers on the lines, such as a circle, square or triangle.",
  "lineStyles.markerSize": "The size of the markers on the lines, in pixels.",
  "lineStyles.markerColor": "The colour of the markers on the lines.",
  "lineStyles.areaShow": "Shades the area under each line.",
  "lineStyles.areaColor": "The colour of the shaded area under the lines.",
  "lineStyles.areaMatchStrokeColor": "Uses each line's colour for the shaded area under it.",
  "lineStyles.strokeShow": "Shows or hides the lines themselves, so a chart can show only its markers or shaded areas.",
  "lineStyles.strokeColor": "The colour of the lines.",
  "lineStyles.strokeLineJoin": "The shape of the corners where one part of a line meets the next.",

  // Zoom sliders.
  "zoom.show": "Shows or hides zoom sliders, which let report readers zoom in on part of the chart.",
  "zoom.showOnCategoryAxis": "Adds a zoom slider along the category axis.",
  "zoom.showOnValueAxis": "Adds a zoom slider along the value axis.",
  "zoom.showOnValueSecAxis": "Adds a zoom slider along the secondary value axis.",
  "zoom.showLabels": "Shows the start and end of the zoomed range on the slider.",
  "zoom.showTooltip": "Shows a tooltip with the zoomed range while the slider is being dragged.",
  "zoom.categoryMin": `Where the zoomed range on the category axis starts. ${PER_VISUAL}`,
  "zoom.categoryMax": `Where the zoomed range on the category axis ends. ${PER_VISUAL}`,
  "zoom.valueMin": `Where the zoomed range on the value axis starts. ${PER_VISUAL}`,
  "zoom.valueMax": `Where the zoomed range on the value axis ends. ${PER_VISUAL}`,
  "zoom.valueSecMin": `Where the zoomed range on the secondary value axis starts. ${PER_VISUAL}`,
  "zoom.valueSecMax": `Where the zoomed range on the secondary value axis ends. ${PER_VISUAL}`,

  // Constant lines.
  ...forCards(LINES, {
    show: "Shows or hides {card}, a straight line drawn at a fixed value, such as a target.",
    value: `The value where {card} is drawn. ${PER_VISUAL}`,
    displayName: `The name of {card}, shown in its label and tooltip. ${PER_VISUAL}`,
    style: "Whether {card} is solid, dashed or dotted.",
    width: "The thickness of {card}, in pixels.",
    position: "Whether {card} is drawn in front of or behind the chart's data.",
    dataLabelShow: "Shows or hides a label on {card}.",
    dataLabelText: "What the label on {card} shows: its name, its value, or both.",
    dataLabelHorizontalPosition: "Whether the label sits at the left or right end of {card}.",
    dataLabelVerticalPosition: "Whether the label sits above or below {card}.",
    shadeShow: "Shades the area on one side of {card}.",
    shadeRegion: "Which side of {card} is shaded: before it, after it, or both.",
    shadeColorMatchStroke: "Uses the colour of {card} for the shaded area.",
  }),

  // Trend lines and error bars.
  "trend.show": "Shows or hides a trend line: a straight line showing the overall direction of the data.",
  "trend.style": "Whether the trend line is solid, dashed or dotted.",
  "trend.width": "The thickness of the trend line, in pixels.",
  "trend.combineSeries": "Whether each series gets its own trend line or they are combined into one.",
  "trend.displayName": "The name of the trend line, shown in its tooltip.",
  "error.enabled": "Turns error bars on or off. Error bars show a range around each value, such as upper and lower bounds.",
  "error.barShow": "Shows or hides the error bars themselves.",
  "error.barMatchSeriesColor": "Colours the error bars to match their series.",
  "error.labelMatchSeriesColor": "Colours the error bar labels to match their series.",
  "error.shadeMatchSeriesColor": "Colours the shaded error area to match its series.",
  "error.labelBackground": "Shows or hides a background behind the error bar labels.",
  "error.labelShow": "Shows or hides labels on the error bars.",
  "error.tooltipShow": "Shows the error range in the tooltip.",
  "error.markerShow": "Shows or hides a marker at the ends of each error bar.",
  "error.shadeShow": "Shades the error range around the line instead of drawing bars.",

  "error.labelFormat":
    "How the error bar labels show the range: as the upper and lower values, as the difference from the value, as a percentage of it, or as the full range.",
  "error.tooltipFormat":
    "How the tooltip shows the error range: as the upper and lower values, as the difference from the value, as a percentage of it, or as the full range.",
  "error.shadeBandStyle": "Whether the error range around the line is drawn as a shaded band, as boundary lines, or both.",
  "error.markerShape": "The shape of the markers at the ends of each error bar.",
  "error.markerSize": "The size of the markers at the ends of each error bar, in pixels.",
  "labels.labelOrientation": "Whether the data labels are written horizontally or vertically.",
  "labels.labelDensity": "How many data labels are shown along each line, from 0 (fewest) to 100 (every point).",
  "labels.position": "Whether the labels sit inside or outside the {marks}.",
  "labels.background": "Whether the labels have a background behind them: on, off, or chosen automatically.",
  "seriesLabels.leaderLines": "Shows or hides lines joining each series label to its line.",
  "markers.rotation": "How far the markers are turned, in degrees.",
  "general.layout":
    "How the row headers are laid out: Compact puts every level in one indented column; Outline and Tabular give each level its own column.",
  "general.orientation": "Whether the slicer's items are listed vertically or horizontally.",
  "layout.style": "Whether the items are laid out as a table or as tiles.",
  "smallMultiplesLayout.style": "Whether the small multiples are laid out as a table or as tiles.",
  "legend.showGradientLegend": "Shows a colour-scale legend when the colours come from a gradient rather than from series.",

  ...forCards(["image", "cardImage", "icon"], {
    altText: `Alternative text that describes {card} for people using screen readers. ${PER_VISUAL}`,
    imageFile: `The image file shown, stored in the report. ${PER_VISUAL}`,
    sourceFile: `The image file shown, stored in the report. ${PER_VISUAL}`,
    imageUrl: `The web address of the image, when the image comes from a URL. ${PER_VISUAL}`,
    url: `The web address of the image, when the image comes from a URL. ${PER_VISUAL}`,
    sourceField: `The field whose values are image URLs, when the image comes from your data. ${PER_VISUAL}`,
  }),
  "image.image": `The image shown. ${PER_VISUAL}`,
  "general.x": "How far the visual sits from the left edge of the page, in pixels.",
  "general.y": "How far the visual sits from the top edge of the page, in pixels.",
  "general.width": "The width of the visual, in pixels.",
  "general.height": "The height of the visual, in pixels.",
  "general.formatString":
    'The number format for the values the visual shows, such as "#,0" for whole numbers or "0.0%" for percentages.',
  "accessibility.altTextColumns": `The column whose values describe each row for people using screen readers. ${PER_VISUAL}`,
  "accessibility.rowWithReferenceText": `The column screen readers use to name each row. ${PER_VISUAL}`,
  "bookmarks.bookmarkGroup": `The bookmark group whose bookmarks the navigator shows as buttons. ${PER_VISUAL}`,
  "goals.goalText": "The word shown before the goal value, such as \"Goal\" or \"Target\".",
  "cardImage.image": `The image shown. ${PER_VISUAL}`,
  "icon.icon": `The icon shown. ${PER_VISUAL}`,
  "icon.iconUrl": `The web address of the icon, when the icon comes from a URL. ${PER_VISUAL}`,

  // Plot area and the general card.
  "plotArea.image": "An image drawn behind the chart's data, inside the axes.",
  "general.isInvertedSelectionMode": `Whether everything starts selected, so choosing an item leaves it out rather than adding it. Power BI turns this on when someone uses Select all. ${PER_VISUAL}`,
  "background.wrapContent": "Shrinks the background to fit the content instead of filling the whole visual.",
};

/** The parts a setting name can style, as they read in a sentence. */
const PARTS = {
  title: (card, cardId) => (cardId === "labels" ? `the title line of ${card}` : `the title of ${card}`),
  detail: (card) => `the detail line of ${card}`,
  value: (card, cardId) => (cardId === "labels" ? `the value line of ${card}` : undefined),
  gridline: (card) => `the gridlines of ${card}`,
  gridLine: (card) => `the gridlines of ${card}`,
  sec: () => "the labels on the secondary Y axis",
  secTitle: () => "the title of the secondary Y axis",
  secLabel: () => "the labels on the secondary Y axis",
  leaderLine: (card) => `the leader lines of ${card}`,
  shade: (card) => `the shaded area of ${card}`,
  background: (card) => `the background behind ${card}`,
  border: (card) => `the border of ${card}`,
  marker: (card) => `the markers on ${card}`,
  dataLabel: (card) => `the label on ${card}`,
  label: (card, cardId) => (AXIS.includes(cardId) || cardId === "y2Axis" ? `the labels on ${card}` : undefined),
  line: (card, cardId) => (LINE_CARDS.has(cardId) ? card : `the lines in ${card}`),
  fill: (card, cardId) => (["dataPoint", "ribbonBands"].includes(cardId) ? card : undefined),
  bar: (card, cardId) => (cardId === "error" ? card : undefined),
  barBorder: (card) => `the border of ${card}`,
  labelBackground: (card) => `the background behind the labels on ${card}`,
  image: (card, cardId) => (/image/.test(cardId.toLocaleLowerCase()) ? card : `the image in ${card}`),
  stroke: (card, cardId) => (cardId === "lineStyles" || /outline$/.test(card) ? card : `the outline of ${card}`),
};

/** Parts that are lines, for line style and thickness. */
const LINE_PARTS = new Set(["gridline", "gridLine", "leaderLine", "border", "barBorder", "bar", "line", "stroke"]);

const LINE_CARDS = new Set([...LINES, "trend", "forecast", "ratioLine"]);
const TEXT_CARD = /\b(text|labels?|title|titles|subtitle|header|headers|value|values|legend|tooltip)$/;

/** The card's own text, for font settings with no part named: "the labels on the X axis". */
function textOf(card, cardId) {
  if (cardId === "legend") return "the legend text";
  if (cardId === "error") return "the error bar labels";
  if (TEXT_CARD.test(card) || /text class$/.test(card)) return card;
  if (AXIS.includes(cardId) || cardId === "y2Axis") return `the labels on ${card}`;
  return `the text in ${card}`;
}

function isPluralHead(phrase) {
  const head = phrase.split(/ (?:of|on|in|behind|under) /)[0].split(" ").at(-1);
  return /[^s]s$/.test(head) && !/(ss|us|is)$/.test(head);
}

const ASPECTS = [
  ["fontFamily", /(FontFamily|fontFamily|^fontFace)$/, "font"],
  ["fontSize", /(FontSize|TextSize|fontSize|textSize)$/, "font"],
  ["bold", /(Bold|^bold)$/, "font"],
  ["italic", /(Italic|^italic)$/, "font"],
  ["underline", /(Underline|^underline)$/, "font"],
  ["colour", /(Color|^color)$/, "colour"],
  ["transparency", /(Transparency|^transparency)$/, "self"],
  ["dashArray", /(DashArray|^dashArray)$/, "self"],
  ["dashCap", /(DashCap|^dashCap)$/, "self"],
  ["autoScale", /(AutoScale|^autoScale)$/, "self"],
  ["displayUnits", /(DisplayUnits|^displayUnits)$/, "number"],
  ["precision", /(Precision|DecimalPoints)$/, "number"],
  ["formatString", /(CustomFormatString|FormatString|^customFormatString|^formatString)$/, "number"],
  ["lineStyle", /(Style|Pattern)$/, "line"],
  ["thickness", /(Thickness|Width|Weight|Size)$/, "line"],
];

/**
 * A sentence for a setting that styles one part of a card, or undefined when
 * the setting is not one of the common patterns or its part is not known.
 */
export function partDescription(propertyName, card, cardId, type) {
  const aspect = ASPECTS.find(([, pattern]) => pattern.test(propertyName));
  if (!aspect) return undefined;
  const [name, pattern, kind] = aspect;
  if (name === "colour" && !/^Colou?r/.test(type)) return undefined;
  if ((name === "transparency" || name === "precision") && !/number/i.test(type)) return undefined;

  // "titleFontColor" -> "title"; "titleLabelPrecision" -> "title"; but
  // "dataLabelColor" stays "dataLabel", a part in its own right.
  const raw = propertyName.replace(pattern, "").replace(/Font$/, "");
  const prefix = PARTS[raw] || !/Label$/.test(raw) ? raw : raw.replace(/Label$/, "");
  if (kind === "line") {
    if (!LINE_PARTS.has(prefix)) return undefined;
    if (name === "lineStyle" && type !== "Choice") return undefined;
    if (name === "thickness" && !/number/i.test(type)) return undefined;
  }
  let subject;
  // "seriesFontFamily" on the Series labels card names nothing but the card.
  const echoed = prefix && card.toLocaleLowerCase().includes(prefix.replace(/([A-Z])/g, " $1").toLocaleLowerCase());
  if (!prefix || echoed || ["font", "label", "text"].includes(prefix)) {
    // "labelColor", "fontSize", "labelDisplayUnits": the card's own text or numbers.
    subject = kind === "font" || /^(font|label)/.test(propertyName) ? textOf(card, cardId) : card;
    if (kind === "number") subject = textOf(card, cardId);
    if (LINE_CARDS.has(cardId) && kind !== "number") subject = card;
  } else if (PARTS[prefix]) {
    subject = PARTS[prefix](card, cardId);
  }
  if (!subject) return undefined;

  const be = isPluralHead(subject) ? "are" : "is";
  switch (name) {
    case "fontFamily":
      return `The font used for ${subject}.`;
    case "fontSize":
      return `The text size of ${subject}, in points.`;
    case "bold":
      return `Whether ${subject} ${be} bold.`;
    case "italic":
      return `Whether ${subject} ${be} italic.`;
    case "underline":
      return `Whether ${subject} ${be} underlined.`;
    case "colour":
      return `The colour of ${subject}.`;
    case "transparency":
      return `How see-through ${subject} ${be}, from 0 (solid) to 100 (invisible).`;
    case "dashArray":
      return `The dash pattern for ${subject}, used when the line style is custom: the length in pixels of each dash and gap, such as "4 2".`;
    case "dashCap":
      return `The shape of the ends of each dash in ${subject}.`;
    case "autoScale":
      return `Whether the spacing of the dashes and dots in ${subject} adjusts to the line's thickness.`;
    case "displayUnits":
      return `The units used to shorten numbers in ${subject}, such as thousands or millions.`;
    case "precision":
      return `How many decimal places the numbers in ${subject} show.`;
    case "formatString":
      return `The number format for ${subject}, such as "#,0" for whole numbers or "0.0%" for percentages.`;
    case "lineStyle":
      return `Whether ${subject} ${be} solid, dashed or dotted.`;
    case "thickness":
      return `The thickness of ${subject}, in pixels.`;
    default:
      return undefined;
  }
}

/** Fills in "{card}", "{Card}" and "{marks}". */
export function fillTemplate(text, card, visualId) {
  return text
    .replaceAll("{card}", card)
    .replaceAll("{Card}", card.charAt(0).toLocaleUpperCase() + card.slice(1))
    .replaceAll("{marks}", marksFor(visualId));
}
