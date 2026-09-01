/**
 * Filter card states, and where filter pane/card edits are written.
 *
 * Two corrections, both proven defects rather than suspicions.
 *
 * The resolver has always read `filterCard`'s `$id: "Available"` and
 * `$id: "Applied"` entries independently. The editor offered one set of
 * controls writing an *untagged* entry — which by design satisfies either
 * state — so editing one value silently flattened a theme that
 * distinguished them. Writes are now state-tagged; reads are untouched.
 *
 * Separately, both modern bases and Microsoft's own generator keep filter
 * pane and filter card styling in `visualStyles["*"]["*"]`. Theme Studio
 * read that correctly but wrote to `visualStyles.page["*"]`, so editing an
 * imported theme left the original in place and added a second copy that
 * won on precedence. The shared bucket is now the canonical write owner.
 *
 * Both a colour and a numeric property are exercised throughout, so neither
 * fix can pass by being accidentally type-specific.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { getBaseTheme } from "../app/lib/baseThemes";
import {
  FILTER_CARD_STATES,
  GLOBAL_OPTIONS_PROPERTIES as G,
  filterCardStateEntryIndex,
  filterCardWriteBucket,
  propertyThemePath,
  resolveGlobalOptionsStyle,
  type FilterCardState,
} from "../app/lib/globalOptionsProperties";
import { forState, themeLayers } from "../app/lib/properties";
import type { PropertyDefinition, PropertyValueType } from "../app/lib/properties";
import { resolveTheme, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

/** What the editor resolves and shows for both states at once. */
const read = (theme: PowerBITheme) => {
  const g = resolveGlobalOptionsStyle(themeLayers(theme, getBaseTheme("classic2026")), resolveTheme(theme));
  return { available: g.pageFilterCards, applied: g.pageFilterCardsApplied, pane: g.pageFilterPane };
};

/**
 * Exactly the sequence PropertyEditor performs for one filter-card edit:
 * pick the write bucket, find (or append) the state's entry, write the
 * value, then stamp the `$id` a newly-created entry needs.
 */
const editCard = (
  theme: PowerBITheme,
  state: FilterCardState,
  definition: PropertyDefinition<PropertyValueType>,
  value: string | number | boolean,
): PowerBITheme => {
  const bucket = filterCardWriteBucket(theme);
  const index = filterCardStateEntryIndex(theme, state, bucket, true);
  const written = updateThemeValue(theme, propertyThemePath(forState(definition, index), theme), value);
  return updateThemeValue(written, ["visualStyles", bucket, "*", "filterCard", index, "$id"], state);
};

const BOTH_STATES: PowerBITheme = {
  name: "both",
  visualStyles: {
    "*": {
      "*": {
        filterCard: [
          { $id: "Available", backgroundColor: { solid: { color: "#00FF00" } }, textSize: 9 },
          { $id: "Applied", backgroundColor: { solid: { color: "#0000FF" } }, textSize: 14 },
        ],
      },
    },
  },
};

// ---------------------------------------------------------------------------
// 1. The two states are independent on import
// ---------------------------------------------------------------------------

test("distinct Available and Applied values import independently", () => {
  const { available, applied } = read(BOTH_STATES);
  assert.equal(available.backgroundColor, "#00FF00");
  assert.equal(available.textSize, 9);
  assert.equal(applied.backgroundColor, "#0000FF");
  assert.equal(applied.textSize, 14);
});

test("array order does not matter", () => {
  // Applied listed first. Resolution matches by $id per layer, never by
  // index, so a theme is free to write them either way round.
  const reversed: PowerBITheme = {
    name: "reversed",
    visualStyles: {
      "*": { "*": { filterCard: [{ $id: "Applied", textSize: 14 }, { $id: "Available", textSize: 9 }] } },
    },
  };
  const { available, applied } = read(reversed);
  assert.equal(available.textSize, 9);
  assert.equal(applied.textSize, 14);

  // And editing still lands on the right entry rather than index 0.
  const edited = editCard(reversed, "Applied", G.pageFilterCards.textSize, 30);
  assert.equal(read(edited).applied.textSize, 30);
  assert.equal(read(edited).available.textSize, 9, "the other state is untouched");
});

// ---------------------------------------------------------------------------
// 2. Editing one state leaves the other alone — the defect itself
// ---------------------------------------------------------------------------

test("editing Available writes only the Available entry, numerically", () => {
  const edited = editCard(BOTH_STATES, "Available", G.pageFilterCards.textSize, 11);
  const { available, applied } = read(edited);
  assert.equal(available.textSize, 11, "the edit landed");
  assert.equal(applied.textSize, 14, "Applied survives — this used to collapse to 11");
  assert.equal(applied.backgroundColor, "#0000FF", "and nothing else of Applied moved");
});

test("editing Applied writes only the Applied entry, as a colour", () => {
  const edited = editCard(BOTH_STATES, "Applied", G.pageFilterCards.backgroundColor, "#ABCDEF");
  const { available, applied } = read(edited);
  assert.equal(applied.backgroundColor, "#ABCDEF");
  assert.equal(available.backgroundColor, "#00FF00", "Available survives");
  assert.equal(available.textSize, 9);
});

test("both edits compose, and the file keeps exactly two tagged entries", () => {
  let t = editCard(BOTH_STATES, "Available", G.pageFilterCards.textSize, 11);
  t = editCard(t, "Applied", G.pageFilterCards.backgroundColor, "#ABCDEF");

  const entries = (t.visualStyles as never as Record<string, Record<string, Record<string, unknown[]>>>)["*"]["*"]
    .filterCard;
  assert.equal(entries.length, 2, "no extra untagged entry was appended");
  assert.deepEqual(entries.map((e) => (e as { $id: string }).$id), ["Available", "Applied"]);

  const { available, applied } = read(t);
  assert.equal(available.textSize, 11);
  assert.equal(available.backgroundColor, "#00FF00");
  assert.equal(applied.textSize, 14);
  assert.equal(applied.backgroundColor, "#ABCDEF");
});

// ---------------------------------------------------------------------------
// 3. Legacy untagged entries
// ---------------------------------------------------------------------------

const LEGACY: PowerBITheme = {
  name: "legacy",
  visualStyles: { "*": { "*": { filterCard: [{ textSize: 7, backgroundColor: { solid: { color: "#111111" } } }] } } },
};

test("an imported untagged filterCard entry still resolves for both states", () => {
  // Unchanged behaviour, and deliberately so: themes written before the
  // states existed must keep working. Only writes became state-specific.
  const { available, applied } = read(LEGACY);
  assert.equal(available.textSize, 7);
  assert.equal(applied.textSize, 7);
  assert.equal(available.backgroundColor, "#111111");
  assert.equal(applied.backgroundColor, "#111111");
});

test("editing one state of a legacy theme is deterministic and spares the other", () => {
  // The untagged entry is NOT patched — that would move both states at
  // once, which is the defect. A tagged entry is appended instead, and the
  // legacy entry goes on serving the state that was not edited.
  const edited = editCard(LEGACY, "Available", G.pageFilterCards.textSize, 20);
  const { available, applied } = read(edited);
  assert.equal(available.textSize, 20, "the edited state moved");
  assert.equal(applied.textSize, 7, "the other state still reads the legacy entry");

  const entries = (edited.visualStyles as never as Record<string, Record<string, Record<string, unknown[]>>>)["*"]["*"]
    .filterCard;
  assert.equal(entries.length, 2, "appended rather than overwritten");
  assert.equal((entries[0] as { $id?: string }).$id, undefined, "the legacy entry keeps no $id");
  assert.equal((entries[1] as { $id: string }).$id, "Available");
});

test("a state with no entry of its own never reads another state's entry", () => {
  // Caught in the browser, not by the earlier tests: with only an Applied
  // entry stored, the Available row was reading index 0 -- the Applied
  // entry -- and displaying its value under the Available label. The read
  // index now points past the end of the array, so the row falls back to
  // the correctly resolved value for its own state.
  const appliedOnly: PowerBITheme = {
    name: "applied-only",
    visualStyles: { "*": { "*": { filterCard: [{ $id: "Applied", textSize: 22 }] } } },
  };
  assert.equal(filterCardStateEntryIndex(appliedOnly, "Available", "*"), 1, "past the end, not index 0");
  assert.equal(filterCardStateEntryIndex(appliedOnly, "Applied", "*"), 0);

  const { available, applied } = read(appliedOnly);
  assert.equal(applied.textSize, 22);
  assert.notEqual(available.textSize, 22, "Available does not inherit the Applied entry");
  assert.equal(available.textSize, 10, "it resolves its own fallback instead");
});

test("the read index falls back to an untagged entry, but the write index never does", () => {
  // The asymmetry stated directly. Reading must show what actually
  // resolves; writing must not reuse an entry that serves both states.
  assert.equal(filterCardStateEntryIndex(LEGACY, "Applied", "*"), 0, "reads the untagged entry");
  assert.equal(filterCardStateEntryIndex(LEGACY, "Applied", "*", true), 1, "writes a new one");

  // With a tagged entry present, read and write agree.
  assert.equal(filterCardStateEntryIndex(BOTH_STATES, "Applied", "*"), 1);
  assert.equal(filterCardStateEntryIndex(BOTH_STATES, "Applied", "*", true), 1);
});

// ---------------------------------------------------------------------------
// 4. The write bucket
// ---------------------------------------------------------------------------

test("a shared-bucket filter pane value imports, and edits stay in the shared bucket", () => {
  const shared: PowerBITheme = {
    name: "shared-pane",
    visualStyles: { "*": { "*": { outspacePane: [{ width: 240, borderColor: { solid: { color: "#123456" } } }] } } },
  };
  assert.equal(read(shared).pane.width, 240, "imports correctly");
  assert.equal(read(shared).pane.borderColor, "#123456");

  const edited = updateThemeValue(shared, propertyThemePath(G.pageFilterPane.width, shared), 300);
  assert.equal(read(edited).pane.width, 300);

  const vs = edited.visualStyles as never as Record<string, Record<string, Record<string, unknown[]>>>;
  assert.equal(vs["*"]["*"].outspacePane.length, 1, "updated in place");
  assert.equal(vs.page, undefined, "no page['*'].outspacePane duplicate was created");
});

test("a fresh theme writes filter pane and filter card styling to the shared bucket", () => {
  const fresh: PowerBITheme = { name: "fresh", visualStyles: {} };
  assert.deepEqual(propertyThemePath(G.pageFilterPane.width, fresh), ["visualStyles", "*", "*", "outspacePane", 0, "width"]);
  assert.deepEqual(propertyThemePath(G.pageFilterCards.textSize, fresh), ["visualStyles", "*", "*", "filterCard", 0, "textSize"]);
  assert.equal(filterCardWriteBucket(fresh), "*");

  // A colour picks up the solid/color suffix in the shared bucket too.
  assert.deepEqual(propertyThemePath(G.pageFilterCards.backgroundColor, fresh), [
    "visualStyles", "*", "*", "filterCard", 0, "backgroundColor", "solid", "color",
  ]);
});

test("a shared-bucket filter card edit creates no page duplicate", () => {
  const t = editCard(BOTH_STATES, "Applied", G.pageFilterCards.textSize, 21);
  const vs = t.visualStyles as never as Record<string, unknown>;
  assert.equal(vs.page, undefined, "no page['*'].filterCard duplicate");
  assert.equal(read(t).applied.textSize, 21);
});

test("only filter pane and filter card move; every other global group keeps its owner", () => {
  // The correction is deliberately narrow. `reportFilterPaneState` also
  // targets `outspacePane`, but from the report bucket with a disjoint
  // field set, so it must not be swept along.
  const fresh: PowerBITheme = { name: "fresh", visualStyles: {} };
  const owner = (definition: Parameters<typeof propertyThemePath>[0]) => propertyThemePath(definition, fresh)[1];

  assert.equal(owner(G.reportFilterPaneState.visible), "report");
  assert.equal(owner(G.reportPageAlignment.verticalAlignment), "report");
  assert.equal(owner(G.pageBackground.color), "page", "page background ownership is a measurement question, untouched");
  assert.equal(owner(G.pageWallpaper.color), "page");
  assert.equal(owner(G.pageAlignment.verticalAlignment), "page");
  assert.equal(owner(G.pageSize.pageSizeWidth), "page");
  assert.equal(owner(G.pageInformation.pageInformationType), "page");
  assert.equal(owner(G.pageRefresh.show), "page");
  assert.equal(owner(G.personalizeVisual.show), "page");

  assert.equal(owner(G.pageFilterPane.width), "*");
  assert.equal(owner(G.pageFilterCards.textSize), "*");
});

// ---------------------------------------------------------------------------
// 5. Themes Theme Studio itself exported before this change
// ---------------------------------------------------------------------------

test("a page-bucket filter pane value still resolves, and is edited where it already lives", () => {
  // Every theme Theme Studio exported before this change looks like this.
  // Redirecting its edits to the shared bucket would be shadowed by the
  // page copy on the next read, so the edit would appear to do nothing.
  const pageOwned: PowerBITheme = {
    name: "page-owned",
    visualStyles: { page: { "*": { outspacePane: [{ width: 200 }] } } },
  };
  assert.equal(read(pageOwned).pane.width, 200, "still resolves");
  assert.deepEqual(propertyThemePath(G.pageFilterPane.width, pageOwned), [
    "visualStyles", "page", "*", "outspacePane", 0, "width",
  ]);

  const edited = updateThemeValue(pageOwned, propertyThemePath(G.pageFilterPane.width, pageOwned), 260);
  assert.equal(read(edited).pane.width, 260, "the edit is visible");
  const vs = edited.visualStyles as never as Record<string, unknown>;
  assert.equal(vs["*"], undefined, "and no shared-bucket copy appeared");
});

test("a page-bucket filter card is edited in the page bucket, states and all", () => {
  const pageOwned: PowerBITheme = {
    name: "page-cards",
    visualStyles: { page: { "*": { filterCard: [{ $id: "Available", textSize: 9 }] } } },
  };
  assert.equal(filterCardWriteBucket(pageOwned), "page");

  const edited = editCard(pageOwned, "Applied", G.pageFilterCards.textSize, 18);
  const vs = edited.visualStyles as never as Record<string, Record<string, Record<string, unknown[]>>>;
  assert.equal(vs["*"], undefined, "no shared duplicate");
  assert.equal(vs.page["*"].filterCard.length, 2, "the Applied entry joined the page bucket");
  assert.equal(read(edited).applied.textSize, 18);
  assert.equal(read(edited).available.textSize, 9);
});

test("nothing is migrated or deleted behind the user's back", () => {
  // A theme carrying BOTH buckets keeps both. Cleanup would need its own
  // evidence about which one Power BI honours, which is a measurement
  // question this change deliberately does not answer.
  const both: PowerBITheme = {
    name: "both-buckets",
    visualStyles: {
      "*": { "*": { outspacePane: [{ width: 100 }] } },
      page: { "*": { outspacePane: [{ width: 200 }] } },
    },
  };
  const edited = updateThemeValue(both, propertyThemePath(G.pageFilterPane.width, both), 250);
  const vs = edited.visualStyles as never as Record<string, Record<string, Record<string, unknown[]>>>;
  assert.equal((vs.page["*"].outspacePane[0] as { width: number }).width, 250, "the winning copy was edited");
  assert.equal((vs["*"]["*"].outspacePane[0] as { width: number }).width, 100, "the shadowed copy is left alone");
  assert.equal(read(edited).pane.width, 250);
});

// ---------------------------------------------------------------------------
// 6. The state vocabulary itself
// ---------------------------------------------------------------------------

test("the filter card states are exactly the two the schema tags, spelled as the schema spells them", () => {
  // Capitalised, and only two. Not interaction states: no hover, press,
  // selected or disabled, which would write `$id`s Power BI never reads.
  assert.deepEqual([...FILTER_CARD_STATES], ["Available", "Applied"]);
});

test("resolving does not mutate the theme", () => {
  const before = JSON.stringify(BOTH_STATES);
  read(BOTH_STATES);
  filterCardWriteBucket(BOTH_STATES);
  filterCardStateEntryIndex(BOTH_STATES, "Applied", "*", true);
  assert.equal(JSON.stringify(BOTH_STATES), before);
});
