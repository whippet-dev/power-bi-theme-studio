import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

  assert.equal(show.description, "Whether the visual's title is shown.");
  assert.equal(show.descriptionSource, "theme-studio");
  assert.match(fontSize.description, /size/i);
  assert.equal(fontSize.descriptionSource, "microsoft");

  const line = catalogue.visuals.find((visual) => visual.id === "lineChart");
  const categoryAxis = line.cards.find((card) => card.id === "categoryAxis");
  const concatenate = categoryAxis.properties.find((property) => property.id === "concatenateLabels");
  assert.equal(concatenate.descriptionSource, "microsoft");
  assert.match(concatenate.description, /hierarchy/i);

  const lineStyles = line.cards.find((card) => card.id === "lineStyles");
  const markerSize = lineStyles.properties.find((property) => property.id === "markerSize");
  assert.equal(markerSize.descriptionSource, "theme-studio");
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
  assert.equal(general.properties.find((property) => property.id === "height").description, "Sets the height of this visual.");
});
