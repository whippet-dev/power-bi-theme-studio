import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build produces a static Theme Studio entry point", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Theme Studio for Power BI<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/i);
  assert.match(html, /<script type="module"[^>]+src="\/assets\//i);
  assert.doesNotMatch(html, /vinext|next|react-server-dom/i);
});

test("the default build publishes the theme guide under /guide/", async () => {
  const html = await readFile(new URL("../dist/guide/index.html", import.meta.url), "utf8");
  const settingsCatalogue = await readFile(
    new URL("../dist/guide/reference/settings-catalogue.html", import.meta.url),
    "utf8",
  );
  const schemaCatalogue = JSON.parse(
    await readFile(
      new URL("../dist/guide/schema/report-theme-2.157.catalogue.json", import.meta.url),
      "utf8",
    ),
  );
  const example = JSON.parse(
    await readFile(new URL("../dist/guide/examples/minimal-theme.json", import.meta.url), "utf8"),
  );

  assert.match(html, /<title>Power BI theme JSON guide<\/title>/i);
  assert.match(html, /(?:href|src)="\/guide\//i);
  assert.match(
    html,
    /href="\/guide\/reference\/settings-catalogue(?:\.html)?"[^>]*>Browse all settings<\/a>/i,
  );
  assert.equal(example.name, "Starter theme");
  assert.match(settingsCatalogue, /Complete settings catalogue/i);
  assert.equal(schemaCatalogue.metadata.explorationVersion, "5.76");
  assert.equal(schemaCatalogue.visuals.length, 48);
});
