import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { sortProperties } from "../docs/components/setting-order.mjs";

const catalogue = JSON.parse(
  await readFile(
    new URL("../docs/public/schema/report-theme-2.157.catalogue.json", import.meta.url),
    "utf8",
  ),
);

test("schema catalogue covers every Microsoft visual definition", () => {
  assert.equal(catalogue.metadata.schema, "reportThemeSchema-2.157.json");
  assert.equal(catalogue.metadata.explorationVersion, "5.76");
  assert.ok(catalogue.metadata.themeStudioDescriptions > 2_000);
  assert.equal(catalogue.visuals.length, 48);
  assert.ok(catalogue.totals.propertyOccurrences > 7_000);

  const expected = [
    "clusteredBarChart",
    "clusteredColumnChart",
    "lineChart",
    "slicer",
    "tableEx",
    "pivotTable",
    "cardVisual",
  ];
  for (const id of expected) {
    assert.ok(catalogue.visuals.some((visual) => visual.id === id), `missing ${id}`);
  }
});

test("catalogue retains setting paths, choices, limits and descriptions", () => {
  const line = catalogue.visuals.find((visual) => visual.id === "lineChart");
  const lineStyles = line.cards.find((card) => card.id === "lineStyles");
  const markerShape = lineStyles.properties.find((property) => property.id === "markerShape");

  assert.equal(markerShape.path, "visualStyles.lineChart.*.lineStyles.0.markerShape");
  assert.equal(markerShape.type, "Choice");
  assert.ok(markerShape.choices.some((choice) => choice.value === "circle"));

  const title = catalogue.commonCards.find((card) => card.id === "title");
  const textSize = title.properties.find((property) => property.id === "fontSize");
  assert.equal(textSize.type, "Number (8–60)");
  assert.deepEqual(textSize.constraints, ["Between 8 and 60"]);
  assert.match(textSize.description, /size/i);
});

test("catalogue includes top-level, report and page settings", () => {
  assert.ok(catalogue.topLevel.some((property) => property.id === "dataColors"));
  assert.ok(catalogue.topLevel.some((property) => property.id === "tableAccent"));
  const titleClass = catalogue.topLevelCards.find((card) => card.id === "textClasses.title");
  assert.equal(
    titleClass.properties.find((property) => property.id === "fontFace").path,
    "textClasses.title.fontFace",
  );

  const report = catalogue.globalScopes.find((scope) => scope.id === "report");
  const page = catalogue.globalScopes.find((scope) => scope.id === "page");
  assert.ok(report.cards.some((card) => card.id === "outspacePane"));
  assert.ok(page.cards.some((card) => card.id === "background"));
  assert.ok(page.cards.some((card) => card.id === "filterCard"));
});

test("missing Microsoft descriptions reuse Theme Studio guidance before generated explanations", () => {
  const commonTitle = catalogue.commonCards.find((card) => card.id === "title");
  const show = commonTitle.properties.find((property) => property.id === "show");
  const fontSize = commonTitle.properties.find((property) => property.id === "fontSize");

  assert.equal(show.description, "Shows or hides the title.");
  assert.match(fontSize.description, /size/i);

  const line = catalogue.visuals.find((visual) => visual.id === "lineChart");
  const categoryAxis = line.cards.find((card) => card.id === "categoryAxis");
  const concatenate = categoryAxis.properties.find((property) => property.id === "concatenateLabels");
  assert.match(concatenate.description, /hierarchy/i);

  const lineStyles = line.cards.find((card) => card.id === "lineStyles");
  const markerSize = lineStyles.properties.find((property) => property.id === "markerSize");
  assert.match(markerSize.description, /marker/i);

  const annotation = line.cards.find((card) => card.id === "annotationTemplate");
  const callout = annotation.properties.find((property) => property.id === "callout");
  assert.equal(callout.descriptionSource, "unavailable");
});

test("colour limits are written for people, not as a regular expression", () => {
  const serialised = JSON.stringify(catalogue);
  assert.ok(!serialised.includes("[0-9a-fA-F]"), "no raw colour pattern should reach readers");

  const mapPushpin = catalogue.topLevel.find((property) => property.id === "mapPushpin");
  assert.deepEqual(mapPushpin.constraints, [
    "Colour code: # followed by 6 characters, such as #1A73E8. Shorter codes (#FFF) and 8-character codes with transparency (#1A73E8CC) also work.",
  ]);
});

test("catalogue wording is written for people rather than mirroring schema names", () => {
  const all = [];
  const walk = (cards) => cards.forEach((card) => card.properties.forEach((property) => all.push({ card, property })));
  walk(catalogue.topLevelCards);
  walk(catalogue.commonCards);
  catalogue.globalScopes.forEach((scope) => walk(scope.cards));
  catalogue.visuals.forEach((visual) => walk(visual.cards));

  const descriptions = all.map(({ property }) => property.description);
  // Card titles that are not nouns, abbreviations, and mechanical editor text.
  for (const garbled of [/\bthe general\b/, /\btheme basics\b/, /\bsec\b/, /\bthe the\b/, /^Whether the .+ is turned on\.$/]) {
    assert.ok(!descriptions.some((text) => garbled.test(text)), `no description should match ${garbled}`);
  }

  // Labels a first-time reader would not understand.
  const types = new Set(all.map(({ property }) => property.type));
  for (const jargon of ["Object", "One of several value formats", "Structured value", "Fill (colour, gradient or pattern)"]) {
    assert.ok(!types.has(jargon), `no type should be labelled "${jargon}"`);
  }
  assert.ok(!all.some(({ property }) => (property.constraints ?? []).some((limit) => /^(minimum|maximum) /.test(limit))));

  const general = catalogue.commonCards.find((card) => card.id === "general");
  assert.match(general.properties.find((property) => property.id === "height").description, /^The height of the visual, in pixels\./);
});

test("title and subtitle settings are described as theme defaults, not as one visual's name", () => {
  const card = (id) => catalogue.commonCards.find((candidate) => candidate.id === id);
  const described = (cardId, propertyId) => card(cardId).properties.find((property) => property.id === propertyId).description;

  assert.match(described("title", "text"), /^The default title for this type of visual\./);
  assert.match(described("subTitle", "text"), /^The default subtitle for this type of visual\./);
  // Microsoft's own entries for the subtitle repeat the title's wording.
  for (const setting of ["alignment", "fontColor", "fontSize"]) {
    assert.match(described("subTitle", setting), /subtitle/i);
  }
});

test("mechanical editor wording is replaced where it reads as nonsense", () => {
  const descriptions = [];
  const walk = (cards) => cards.forEach((card) => card.properties.forEach((property) => descriptions.push(property.description)));
  walk(catalogue.topLevelCards);
  walk(catalogue.commonCards);
  catalogue.globalScopes.forEach((scope) => walk(scope.cards));
  catalogue.visuals.forEach((visual) => walk(visual.cards));

  // "Sets the corner bottom left's bottom left corner." and its relatives.
  for (const nonsense of [
    "Sets the corner bottom left's bottom left corner.",
    "Sets the column count's columns.",
    "Sets the inner radius ratio's inner radius.",
    "Sets the data labels's text size.",
  ]) {
    assert.ok(!descriptions.includes(nonsense), nonsense);
  }
  assert.ok(!descriptions.some((text) => /^Whether the .+ is turned on\.$/.test(text)));
  assert.ok(!descriptions.some((text) => /^Whether the [^']+s is shown\.$/.test(text)), "no plural subject with 'is'");
  assert.ok(!descriptions.some((text) => /, of the width\.$/.test(text)));
  assert.ok(!descriptions.some((text) => /\bthe by (default|state)\b/.test(text)));
  // Shortened names and Format pane prompts are not read out as names.
  assert.ok(!descriptions.some((text) => /\b(max|min|param|xaxis|yaxis)\b/.test(text)));
  assert.ok(!descriptions.some((text) => /\b(enter a URL|show these markers|add background)\b/i.test(text)));
});

test("theme colours and entry identifiers are described", () => {
  const colours = catalogue.topLevelCards.find((card) => card.title === "Theme colours");
  for (const id of ["background", "foreground", "tableAccent"]) {
    const description = colours.properties.find((property) => property.id === id).description;
    assert.match(description, /colour/, id);
    assert.doesNotMatch(description, /used by the theme/, id);
  }

  const ids = catalogue.visuals.flatMap((visual) =>
    visual.cards.flatMap((card) => card.properties.filter((property) => property.id === "$id")),
  );
  assert.ok(ids.length);
  assert.ok(ids.every((property) => property.descriptionSource !== "unavailable"));
});

test("settings that point at one bookmark, page or wording are described as theme defaults", () => {
  const card = (id) => catalogue.commonCards.find((candidate) => candidate.id === id);
  const described = (cardId, propertyId) => card(cardId).properties.find((property) => property.id === propertyId).description;

  for (const [cardId, propertyId] of [
    ["visualLink", "bookmark"],
    ["visualLink", "navigationSection"],
    ["visualLink", "drillthroughSection"],
    ["visualLink", "tooltip"],
    ["visualTooltip", "section"],
    ["visualHeaderTooltip", "section"],
    ["visualHeaderTooltip", "text"],
  ]) {
    assert.match(described(cardId, propertyId), /usually set on individual visuals instead\.$/, `${cardId}.${propertyId}`);
  }
});

const visual = (id) => catalogue.visuals.find((candidate) => candidate.id === id);
const cardOf = (visualId, cardId) => visual(visualId).cards.find((card) => card.id === cardId);
const setting = (visualId, cardId, propertyId) =>
  cardOf(visualId, cardId).properties.find((property) => property.id === propertyId);

test("every example is accepted by Microsoft's theme schema", async () => {
  const Ajv = createRequire(import.meta.url)("ajv");
  const schema = JSON.parse(
    await readFile(new URL("../tools/theme-schema/reportThemeSchema-2.157.json", import.meta.url), "utf8"),
  );
  delete schema.$schema;
  // Microsoft's file repeats a few enum values, which the strict checker rejects.
  const validate = new Ajv({ validateSchema: false, logger: false }).compile(schema);
  const nest = (path, value) => path.split(".").reduceRight((inner, part) => ({ [part]: inner }), value);
  const invalid = [];
  const check = (theme, label) => {
    if (!validate({ name: "Check", ...theme })) invalid.push(label);
  };

  for (const property of catalogue.topLevel) {
    if (property.example !== undefined) check(nest(property.path, property.example), property.path);
  }
  const checkCards = (scope, cards) => {
    for (const card of cards) {
      for (const property of card.properties) {
        if (property.example === undefined) continue;
        check({ visualStyles: { [scope]: { "*": { [card.id]: [{ [property.id]: property.example }] } } } }, `${scope}.${card.id}.${property.id}`);
      }
    }
  };
  checkCards("clusteredColumnChart", catalogue.commonCards);
  catalogue.globalScopes.forEach((scope) => checkCards(scope.id, scope.cards));
  catalogue.visuals.forEach((entry) => checkCards(entry.id, entry.cards));

  assert.deepEqual(invalid, []);
  // The checker itself catches a bad value.
  assert.equal(validate({ name: "Check", visualStyles: { lineChart: { "*": { title: [{ fontSize: 200 }] } } } }), false);
});

test("examples suit the setting rather than repeating a placeholder", () => {
  assert.ok(!JSON.stringify(catalogue).includes("Example text"));
  const title = catalogue.commonCards.find((card) => card.id === "title");
  assert.equal(title.properties.find((property) => property.id === "text").example, "Sales by region");
  assert.deepEqual(setting("lineChart", "categoryAxis", "gridlineColor").example, { solid: { color: "#E1DFDD" } });
  assert.equal(setting("lineChart", "categoryAxis", "gridlineDashArray").example, "4 2");
  const colours = catalogue.topLevelCards.find((card) => card.id === "themeColours");
  assert.equal(colours.properties.find((property) => property.id === "bad").example, "#D64554");
});

test("descriptions name the part of the visual they change", () => {
  // The category axis is the X axis on a column chart and the Y axis on a bar chart.
  assert.match(setting("clusteredColumnChart", "categoryAxis", "show").description, /the X axis/);
  assert.match(setting("clusteredBarChart", "categoryAxis", "show").description, /the Y axis/);
  assert.equal(setting("lineChart", "valueAxis", "gridlineColor").description, "The colour of the gridlines of the Y axis.");
  assert.equal(setting("lineChart", "labels", "titleColor").description, "The colour of the title line of the data labels.");
  assert.match(setting("pieChart", "dataPoint", "fill").description, /slices/);
  assert.match(setting("clusteredBarChart", "dataPoint", "fill").description, /bars/);
  // Microsoft's text here was copied from the legend.
  assert.doesNotMatch(setting("lineChart", "y1AxisReferenceLine", "shadeColorMatchStroke").description, /legend/);
});

test("settings normally chosen per visual are flagged", () => {
  const common = (cardId, propertyId) =>
    catalogue.commonCards.find((card) => card.id === cardId).properties.find((property) => property.id === propertyId);
  for (const property of [
    common("title", "text"),
    common("general", "x"),
    common("general", "altText"),
    common("visualLink", "bookmark"),
    setting("lineChart", "valueAxis", "titleText"),
    setting("lineChart", "valueAxis", "start"),
    setting("lineChart", "y1AxisReferenceLine", "value"),
  ]) {
    assert.equal(property.perVisual, true, property.path);
    assert.match(property.description, /individual visuals|best left out/, property.path);
  }
  assert.equal(common("title", "fontSize").perVisual, undefined);
});

test("cards and settings are in Format pane order", () => {
  const ids = (visualId) => visual(visualId).cards.map((card) => card.id);
  // Axes sit together, X before Y.
  const column = ids("clusteredColumnChart");
  assert.equal(column.indexOf("valueAxis"), column.indexOf("categoryAxis") + 1);
  const bar = ids("clusteredBarChart");
  assert.equal(bar.indexOf("categoryAxis"), bar.indexOf("valueAxis") + 1);
  assert.ok(column.indexOf("legend") < column.indexOf("categoryAxis"));
  assert.ok(column.indexOf("labels") < column.indexOf("trend"));

  // Inside a card: the switch first, then each part's settings together.
  const axis = cardOf("lineChart", "valueAxis").properties.map((property) => property.id);
  assert.equal(axis[0], "show");
  const gridline = axis.filter((id) => id.startsWith("gridline")).map((id) => axis.indexOf(id));
  assert.equal(Math.max(...gridline) - Math.min(...gridline), gridline.length - 1);
  assert.equal(axis.indexOf("titleColor") - axis.indexOf("titleFontSize"), 1);
  assert.equal(axis.at(-1) === "$id" || !axis.includes("$id"), true);
});

test("the explorer's ordering keeps a part's settings together after merging", () => {
  const sorted = sortProperties(
    ["gridlineColor", "fontSize", "titleText", "show", "gridlineShow", "titleColor", "labelColor", "$id"].map((id) => ({ id })),
  ).map((property) => property.id);
  assert.deepEqual(sorted, ["show", "fontSize", "labelColor", "titleText", "titleColor", "gridlineShow", "gridlineColor", "$id"]);
});
