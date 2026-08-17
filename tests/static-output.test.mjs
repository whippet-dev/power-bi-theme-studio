import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build produces a static Power BI Theme Studio entry point", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Power BI Theme Studio<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/i);
  assert.match(html, /<script type="module"[^>]+src="\/assets\//i);
  assert.doesNotMatch(html, /vinext|next|react-server-dom/i);
});
