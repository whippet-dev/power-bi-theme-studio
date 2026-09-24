/**
 * Example values for the settings catalogue.
 *
 * Each example is chosen for the setting it sits on -- a title reads like a
 * title, a gridline is a light grey, a shadow's transparency is high -- so
 * the copied JSON is a sensible starting point rather than a placeholder.
 * Where no honest example exists (internal IDs, field bindings, formats Power
 * BI writes for itself) the example is left out.
 */

/** Colours based on Power BI's default theme. */
const COLOURS = {
  text: "#252423",
  secondaryText: "#605E5C",
  background: "#FFFFFF",
  lightBackground: "#F3F2F1",
  gridline: "#E1DFDD",
  border: "#C8C6C4",
  accent: "#118DFF",
  line: "#E66C37",
  shade: "#DEEFFF",
  good: "#1AAB40",
  bad: "#D64554",
  neutral: "#D9B300",
  shadow: "#000000",
  hyperlink: "#0078D4",
};

/** The theme's own colour slots, each with a value that suits its job. */
const THEME_COLOURS = {
  foreground: "#252423",
  firstLevelElements: "#252423",
  secondLevelElements: "#605E5C",
  thirdLevelElements: "#F3F2F1",
  fourthLevelElements: "#B3B0AD",
  background: "#FFFFFF",
  secondaryBackground: "#C8C6C4",
  tableAccent: "#118DFF",
  good: "#1AAB40",
  neutral: "#D9B300",
  bad: "#D64554",
  maximum: "#118DFF",
  center: "#D9B300",
  minimum: "#DEEFFF",
  null: "#FF7F48",
  accent: "#118DFF",
  foregroundLight: "#605E5C",
  foregroundDark: "#201F1E",
  foregroundNeutralLight: "#A19F9D",
  foregroundNeutralDark: "#323130",
  foregroundNeutralSecondary: "#605E5C",
  foregroundNeutralSecondaryAlt: "#8A8886",
  foregroundNeutralSecondaryAlt2: "#A19F9D",
  foregroundNeutralTertiary: "#B3B0AD",
  foregroundNeutralTertiaryAlt: "#C8C6C4",
  foregroundSelected: "#252423",
  foregroundButton: "#252423",
  backgroundLight: "#F3F2F1",
  backgroundNeutral: "#C8C6C4",
  backgroundDark: "#000000",
  hyperlink: "#0078D4",
  visitedHyperlink: "#5C2E91",
  shapeStroke: "#C8C6C4",
  disabledText: "#A19F9D",
  mapPushpin: "#FF5F5D",
};

/** Power BI's default data palette. */
const DATA_COLOURS = ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#D64550"];

const SAMPLE_IMAGE = "data:image/png;base64,iVBORw0KGgo…";

function colourFor(name, cardId) {
  const lower = name.toLocaleLowerCase();
  const card = cardId.toLocaleLowerCase();
  if (/shadow/.test(lower) || /shadow/.test(card)) return COLOURS.shadow;
  if (/glow/.test(card)) return COLOURS.accent;
  if (/(good|positive|increase|favou?rable)/.test(lower)) return COLOURS.good;
  if (/(bad|negative|decrease)/.test(lower)) return COLOURS.bad;
  if (/(hyperlink|link|url)/.test(lower)) return COLOURS.hyperlink;
  if (/(gridline|divider)/.test(lower) || /(gridline|divider|grid$)/.test(card)) return COLOURS.gridline;
  if (/(border|outline|stroke)/.test(lower) || /(border|outline|stroke)/.test(card)) return COLOURS.border;
  if (/shade/.test(lower)) return COLOURS.shade;
  if (/(font|label|text|title|value|header|icon)/.test(lower)) return COLOURS.text;
  if (/(background|back)/.test(lower) || /(background|plotarea|outspace)/.test(card)) return COLOURS.background;
  if (/line/.test(lower) || /(trend|referenceline|forecast|ratioline)/.test(card)) return COLOURS.line;
  if (/(font|label|text|title|header|value)/.test(card)) return COLOURS.text;
  return COLOURS.accent;
}

function clamp(value, schema, integer) {
  let result = value;
  if (schema.minimum !== undefined) result = Math.max(result, schema.minimum);
  if (schema.maximum !== undefined) result = Math.min(result, schema.maximum);
  if (schema.exclusiveMinimum !== undefined && result <= schema.exclusiveMinimum) result = schema.exclusiveMinimum + 1;
  if (schema.exclusiveMaximum !== undefined && result >= schema.exclusiveMaximum) result = schema.exclusiveMaximum - 1;
  return integer ? Math.round(result) : result;
}

/** Power BI's own sizes for each text class. */
const TEXT_CLASS_SIZES = {
  callout: 45,
  title: 12,
  header: 12,
  label: 10,
  semiboldLabel: 10,
  largeLabel: 12,
  largeLightLabel: 12,
  lightLabel: 10,
  boldLabel: 9,
  smallLabel: 9,
  smallLightLabel: 9,
  smallDataLabel: 9,
  largeTitle: 14,
  dataTitle: 14,
};

/** "textClasses.callout" -> "callout". */
function textClassOf(cardId) {
  return cardId.startsWith("textClasses.") ? cardId.slice("textClasses.".length) : undefined;
}

function fontSizeFor(name, cardId) {
  const textClass = textClassOf(cardId);
  if (textClass && name === "fontSize") return TEXT_CLASS_SIZES[textClass];
  const lower = `${cardId}.${name}`.toLocaleLowerCase();
  if (/callout/.test(lower) || /^(value|referencelabelvalue)\./.test(lower)) return 28;
  if (/subtitle/.test(lower)) return 11;
  if (/title/.test(lower)) return 14;
  if (/header/.test(lower)) return 12;
  return 10;
}

function numberFor(name, cardId) {
  const lower = name.toLocaleLowerCase();
  const card = cardId.toLocaleLowerCase();
  const exact = {
    "general.x": 20,
    "general.y": 20,
    "general.width": 400,
    "general.height": 250,
    "pageSize.pageSizeWidth": 1280,
    "pageSize.pageSizeHeight": 720,
    "outspacePane.width": 280,
    "categoryAxis.innerPadding": 20,
    "categoryAxis.outerPadding": 5,
    "categoryAxis.preferredCategoryWidth": 20,
    "categoryAxis.maxMarginFactor": 25,
    "data.relativeDuration": 3,
    "data.numericStart": 0,
    "data.numericEnd": 100,
    "axis.min": 0,
    "axis.max": 100,
    "axis.target": 80,
    "layout.columnCount": 3,
    "layout.rowCount": 2,
    "layout.maxTiles": 6,
    "smallMultiplesLayout.columnCount": 3,
    "smallMultiplesLayout.rowCount": 2,
    "smallMultiplesLayout.maxSmallMultiples": 6,
    "breakdown.maxBreakdowns": 5,
    "tree.barsPerLevel": 10,
    "slices.innerRadiusRatio": 50,
    "slices.startAngle": 90,
    "mapControls.centerLatitude": 51.5,
    "mapControls.centerLongitude": -0.12,
    "mapControls.zoom": 5,
    "mapControls.zoomLevel": 5,
    "mapControls.minZoom": 1,
    "mapControls.maxZoom": 18,
    "columnHeaders.defaultColumnWidth": 120,
    "columnWidth.value": 120,
    "lineStyles.strokeWidth": 3,
    "lineStyles.markerSize": 5,
    "lineStyles.interpolationSmoothParam": 0.5,
    "forecast.interpolationSmoothParam": 0.5,
    "sparklines.strokeWidth": 2,
    "sparklines.markerSize": 4,
    "accentBar.width": 5,
    "dropdown.accentBarWidth": 5,
    "inputTextBox.accentBarWidth": 5,
    "smallMultiplesAccentBar.width": 5,
  };
  if (exact[`${cardId}.${name}`] !== undefined) return exact[`${cardId}.${name}`];

  if (/transparency$/.test(lower)) {
    if (/(shadow|glow)/.test(card) || /(shadow|glow)/.test(lower)) return 70;
    if (/(shade|band|area)/.test(lower)) return 80;
    if (/gridline/.test(lower)) return 50;
    return 0;
  }
  if (/(outlinestyle)$/.test(lower)) return 15;
  if (/(precision|decimalpoints)$/.test(lower)) return 1;
  if (/^(start|min|minimum|secstart|valuemin|valuesecmin|categorymin|numericstart)$/.test(lower)) return 0;
  if (/^(end|max|maximum|secend|valuemax|valuesecmax|categorymax|numericend)$/.test(lower)) return 100;
  if (/^value$/.test(lower) && /referenceline/.test(card)) return 80;
  if (/minzoom$/.test(lower)) return 1;
  if (/maxzoom$/.test(lower)) return 18;
  if (/angle$/.test(lower)) return /(shadow|glow)/.test(card) ? 45 : 0;
  if (/rotation$/.test(lower)) return 0;
  if (/blur$/.test(lower)) return 10;
  if (/distance$/.test(lower)) return 5;
  if (/spread$/.test(lower)) return 2;
  if (/(radius|curve|corner|roundedge)/.test(lower)) return 8;
  if (/(padding|margin|spacing|gap|space|indentation)/.test(lower)) return 8;
  if (/(markersize|markershapesize)$/.test(lower)) return 5;
  if (/(iconsize|^size)$/.test(lower)) return 16;
  if (/(thickness|weight|borderwidth|strokewidth|borderthickness|bordersize|outlineweight)$/.test(lower)) return 1;
  if (/(linewidth|^width)$/.test(lower) && /(trend|referenceline|ratioline|forecast)/.test(card)) return 2;
  if (/^(width|dividerwidth|gridlinewidth|gridlinewidth)$/.test(lower)) return 1;
  if (/(leaderlinewidth|linewidth|barwidth)$/.test(lower)) return 1;
  if (/count$/.test(lower)) return 3;
  if (card === "padding") return 8;
  if (/^(heading|pitch)$/.test(lower)) return 0;
  if (/(imageheight|fixedheight)$/.test(lower) || (lower === "height" && card !== "general")) return 100;
  if (/fixedwidth$/.test(lower)) return 200;
  if (/(labeldensity|widthpercent)$/.test(lower)) return 50;
  return undefined;
}

/** Power BI's own font for each text class. */
const TEXT_CLASS_FONTS = {
  callout: "DIN",
  title: "DIN",
  header: "Segoe UI Semibold",
  largeTitle: "Segoe UI Light",
  dataTitle: "Segoe UI Semibold",
  boldLabel: "Segoe UI Bold",
  semiboldLabel: "Segoe UI Semibold",
  largeLightLabel: "Segoe UI Light",
  lightLabel: "Segoe UI Light",
  smallLightLabel: "Segoe UI Light",
};

/** Text values chosen for the card and setting they belong to. */
function textFor(name, cardId, visualId) {
  const key = `${cardId}.${name}`;
  const exact = {
    "title.text": "Sales by region",
    "subTitle.text": "Last 12 months",
    "header.text": "Region",
    "legend.titleText": "Product category",
    "categoryAxis.titleText": visualId === "scatterChart" ? "Units sold" : "Month",
    "valueAxis.titleText": visualId === "scatterChart" ? "Revenue" : "Revenue",
    "valueAxis.secTitleText": "Profit margin",
    "y2Axis.secTitleText": "Profit margin",
    "referenceLabelTitle.titleText": "Last year",
    "label.text": "Total sales",
    "value.text": "Total",
    "text.text": "View details",
    "goals.goalText": "Target",
    "total.label": "Total",
    "subTotals.rowSubtotalsLabel": "Subtotal",
    "subTotals.columnSubtotalsLabel": "Subtotal",
    "subTotals.levelSubtotalLabel": "Subtotal",
    "trend.displayName": "Trend",
    "forecast.displayName": "Forecast",
    "ratioLine.displayName": "Ratio line",
    "plotAreaShading.displayName": "Symmetry shading",
    "anomalyDetection.displayName": "Anomaly",
    "referenceLine.displayName": "Target",
    "xAxisReferenceLine.displayName": "Target",
    "y1AxisReferenceLine.displayName": "Target",
    "general.altText": "Chart showing sales by region for the last 12 months",
    "image.altText": "Company logo",
    "cardImage.altText": "Product photo",
    "icon.altText": "Status icon",
    "visualLink.tooltip": "Open the sales detail page",
    "visualLink.enabledTooltip": "Select to see more detail",
    "visualLink.disabledTooltip": "Select a region first",
    "visualLink.tooltipPlaceholderText": "Select a region first",
    "visualLink.bookmark": "Bookmark1",
    "visualLink.navigationSection": "ReportSection2",
    "visualLink.drillthroughSection": "ReportSection3",
    "visualLink.webUrl": "https://www.example.com",
    "visualTooltip.section": "ReportSection4",
    "visualHeaderTooltip.section": "ReportSection4",
    "visualHeaderTooltip.text": "Figures exclude returns",
    "inputText.placeholder": "Search products",
    "inputTextBox.placeholder": "Search products",
    "pendingChangesIcon.tooltipLabel": "Changes not applied",
    "pendingChangesIcon.tooltipText": "Select Apply to update the report",
    "pageInformation.pageInformationName": "Sales overview",
    "pageInformation.pageInformationAltName": "sales, revenue, orders",
    "stylePreset.name": "Minimal",
    "userPrompt.text": "Summarise the main changes in sales this month",
    "themeBasics.name": "Corporate blue",
    "themeBasics.$schema":
      "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.157.json",
    "shape.mapUrl": "https://www.example.com/maps/regions.json",
    "tileLayer.tileLayerUrl": "https://tiles.example.com/{z}/{x}/{y}.png",
    "referenceLayer.referenceLayerUrl": "https://www.example.com/layers/stores.geojson",
    "values.webURL": "https://www.example.com",
  };
  if (exact[key] !== undefined) return exact[key];

  const lower = name.toLocaleLowerCase();
  if (lower === "fontface" && textClassOf(cardId)) return TEXT_CLASS_FONTS[textClassOf(cardId)] ?? "Segoe UI";
  if (/(fontfamily|fontface)$/.test(lower)) return /title|header/.test(`${cardId}.${lower}`.toLocaleLowerCase()) ? "Segoe UI Semibold" : "Segoe UI";
  if (/dasharray$/.test(lower)) return "4 2";
  if (/showblankas$/.test(lower)) return "–";
  if (/formatstring$/.test(lower)) return /percent/.test(lower) ? "0.0%" : "#,0";
  if (/(imageurl|iconurl|sourceurl|backgroundimageurl|^url)$/.test(lower)) return "https://www.example.com/images/logo.png";
  if (/color$/.test(lower)) return colourFor(name, cardId);
  return undefined;
}

function imageFor(cardId, name) {
  const names = {
    background: "Page background",
    outspace: "Wallpaper",
    plotArea: "Chart background",
    centerBackground: "Centre image",
    fill: "Button background",
    icon: "Status icon",
    image: "Company logo",
    cardImage: "Product photo",
  };
  const label = names[cardId] ?? (/background/i.test(`${cardId}${name}`) ? "Background image" : "Company logo");
  return { name: label, url: SAMPLE_IMAGE, scaling: "Normal" };
}

/**
 * @param node the setting's schema
 * @param resolved the schema with any $ref resolved
 * @param choices the accepted values, if the setting is a choice
 * @param context { propertyName, cardId, visualId }
 */
export function exampleValue(resolved, choices, { propertyName, cardId, visualId }) {
  if (cardId === "themeColours" && THEME_COLOURS[propertyName]) return THEME_COLOURS[propertyName];
  if (propertyName === "dataColors") return DATA_COLOURS;
  if (propertyName === "icons" && cardId === "paletteAndIcons") {
    return { logo: { url: "data:image/svg+xml;base64,PHN2Zy…", description: "Company logo" } };
  }
  if (choices.length) return choices[0].value;

  const colour = textClassOf(cardId)
    ? /light/i.test(cardId)
      ? COLOURS.secondaryText
      : COLOURS.text
    : colourFor(propertyName, cardId);
  if (resolved.$refName === "color" || resolved.$refName === "colorOrThemeColor") return colour;
  if (resolved.$refName === "fill") return { solid: { color: colour } };
  if (resolved.$refName === "fontSize") return clamp(fontSizeFor(propertyName, cardId), resolved, false);
  if (resolved.$refName === "themeDataColor") return { expr: { ThemeDataColor: { ColorId: 0, Percent: 0 } } };
  if (resolved.$refName === "image") return imageFor(cardId, propertyName);
  if (resolved.$refName === "icon" || resolved.$refName === "themeIcon") return undefined;
  if (resolved.type === "boolean") return true;
  if (resolved.type === "integer" || resolved.type === "number") {
    const integer = resolved.type === "integer";
    if (/(fontSize|textSize|titleSize|headerSize)$/i.test(propertyName)) {
      return clamp(fontSizeFor(propertyName, cardId), resolved, integer);
    }
    const value = numberFor(propertyName, cardId);
    if (value !== undefined) return clamp(value, resolved, integer);
    if (resolved.minimum !== undefined) return resolved.minimum;
    return undefined;
  }
  if (resolved.type === "string") return textFor(propertyName, cardId, visualId);
  return undefined;
}
