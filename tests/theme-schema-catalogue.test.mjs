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
  assert.deepEqual(textSize.constraints, ["minimum 8", "maximum 60"]);
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
