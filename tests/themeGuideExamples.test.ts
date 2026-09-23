import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const exampleDirectory = join(process.cwd(), "docs", "public", "examples");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

test("every downloadable guide example is valid theme-shaped JSON", () => {
  const files = readdirSync(exampleDirectory).filter((file) => file.endsWith(".json"));
  assert.ok(files.length >= 3, "the guide should ship several useful starter themes");

  for (const file of files) {
    const parsed: unknown = JSON.parse(readFileSync(join(exampleDirectory, file), "utf8"));
    assert.ok(isRecord(parsed), `${file} should contain a JSON object`);
    assert.equal(typeof parsed.name, "string", `${file} should have a readable theme name`);

    if (parsed.visualStyles === undefined) continue;
    assert.ok(isRecord(parsed.visualStyles), `${file} visualStyles should be an object`);

    for (const [visualName, selectors] of Object.entries(parsed.visualStyles)) {
      assert.ok(isRecord(selectors), `${file}: ${visualName} should contain selectors`);
      for (const [selector, groups] of Object.entries(selectors)) {
        assert.ok(isRecord(groups), `${file}: ${visualName}.${selector} should contain formatting sections`);
        for (const [groupName, entries] of Object.entries(groups)) {
          assert.ok(Array.isArray(entries), `${file}: ${visualName}.${selector}.${groupName} should be a list`);
          assert.ok(entries.length > 0 && entries.every(isRecord), `${file}: ${groupName} should contain an object`);
        }
      }
    }
  }
});
