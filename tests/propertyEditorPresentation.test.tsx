import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FontFamilyControl, PropertyRow, RegistryGroupBody } from "../app/components/PropertyEditor";
import {
  fontFamilyOptions,
  expansionScrollDelta,
  filterFontFamilyOptions,
  inactivePropertyGroup,
  isFontFamilyProperty,
  isMasterActivationProperty,
  KNOWN_FONT_FAMILIES,
  orderGlobalGroups,
  orderThemeGroups,
  orderVisualGroups,
  propertySections,
  type EditorGroupMeta,
} from "../app/lib/propertyEditorPresentation";
import type { PropertyDefinition, PropertyValueType } from "../app/lib/properties";
import { deleteThemeValue, readThemeValueAtPath, updateThemeValue, type PowerBITheme } from "../app/lib/theme";

function definition(
  id: string,
  label: string,
  valueType: PropertyValueType,
  propertyName: string,
  section?: string,
): PropertyDefinition<PropertyValueType> {
  return {
    id,
    visual: "lineChart",
    valueType,
    label,
    description: label,
    section,
    path: ["example", 0, propertyName],
  };
}

test("master activation controls sort first without moving subordinate booleans", () => {
  const color = definition("color", "Colour", "color", "color");
  const gradient = definition("gradient", "Show gradient legend", "boolean", "showGradientLegend");
  const show = definition("show", "Show", "boolean", "show");
  const width = definition("width", "Width", "number", "width", "Gridline");
  const gridline = definition("gridline", "Show", "boolean", "gridlineShow", "Gridline");
  const group = { color, gradient, show, width, gridline };
  const before = Object.entries(group);

  assert.equal(isMasterActivationProperty(show), true);
  assert.equal(isMasterActivationProperty(gridline), true);
  assert.equal(isMasterActivationProperty(gradient), false);
  assert.deepEqual(propertySections(group)[0].entries.map(([key]) => key), ["show", "color", "gradient"]);
  assert.deepEqual(propertySections(group)[1].entries.map(([key]) => key), ["gridline", "width"]);
  assert.deepEqual(Object.entries(group), before);
  assert.equal(group.color, color);
});

test("ordinary properties stay stable while named sections follow human-facing categories", () => {
  const group = {
    fill: definition("fill", "Fill", "color", "fill", "Appearance"),
    second: definition("second", "Second", "number", "second", "Content"),
    first: definition("first", "First", "text", "first", "Content"),
    position: definition("position", "Position", "enum", "position", "Layout"),
  };

  const sections = propertySections(group);
  assert.deepEqual(sections.map((section) => section.name), ["Content", "Layout", "Appearance"]);
  assert.deepEqual(sections[0].entries.map(([key]) => key), ["second", "first"]);
});

test("cartesian group ordering prioritises Title and Subtitle, then core controls, visual settings, and specialist features", () => {
  const groups: EditorGroupMeta[] = [
    { id: "chrome:title", title: "Title", count: 1 },
    { id: "chrome:subTitle", title: "Subtitle", count: 1 },
    { id: "chrome:background", title: "Background", count: 1 },
    { id: "bar:categoryAxis", title: "Y axis", count: 1 },
    { id: "bar:error", title: "Error bars", count: 1 },
    { id: "bar:dataPoint", title: "Data colors", count: 1 },
    { id: "bar:legend", title: "Legend", count: 1 },
    { id: "bar:valueAxis", title: "X axis", count: 1 },
  ];
  const source = structuredClone(groups);
  const ordered = orderVisualGroups("bar", groups);

  assert.deepEqual(ordered.map(({ title }) => title), [
    "Title",
    "Subtitle",
    "Data colors",
    "Legend",
    "X axis",
    "Y axis",
    "Background",
    "Error bars",
  ]);
  assert.deepEqual(ordered.map(({ section }) => section), [
    "Core formatting",
    "Core formatting",
    "Core formatting",
    "Core formatting",
    "Core formatting",
    "Core formatting",
    "Visual settings",
    "Analytics & advanced",
  ]);
  assert.equal(ordered.some(({ section }) => section === "Visual container"), false);
  assert.deepEqual(groups, source);
});

test("non-cartesian core ordering adapts to Card and Table without mutating either source list", () => {
  const card: EditorGroupMeta[] = [
    { id: "chrome:background", title: "Background", count: 1 },
    { id: "card:categoryLabels", title: "Category label", count: 1 },
    { id: "chrome:subTitle", title: "Subtitle", count: 1 },
    { id: "card:labels", title: "Data label", count: 1 },
    { id: "typography", title: "Typography", count: 1 },
    { id: "chrome:title", title: "Title", count: 1 },
  ];
  const table: EditorGroupMeta[] = [
    { id: "table:grid", title: "Grid", count: 1 },
    { id: "chrome:title", title: "Title", count: 1 },
    { id: "table:values", title: "Values", count: 1 },
    { id: "chrome:subTitle", title: "Subtitle", count: 1 },
    { id: "table:columnHeaders", title: "Column headers", count: 1 },
  ];
  const cardSource = structuredClone(card);
  const tableSource = structuredClone(table);

  assert.deepEqual(orderVisualGroups("card", card).map(({ title }) => title), [
    "Title",
    "Subtitle",
    "Typography",
    "Data label",
    "Category label",
    "Background",
  ]);
  assert.deepEqual(orderVisualGroups("table", table).map(({ title }) => title), [
    "Title",
    "Subtitle",
    "Column headers",
    "Values",
    "Grid",
  ]);
  assert.deepEqual(card, cardSource);
  assert.deepEqual(table, tableSource);
});

test("Theme groups follow basics, colours, typography, and default visual settings", () => {
  const groups: EditorGroupMeta[] = [
    { id: "chrome:background", title: "Background", count: 3 },
    { id: "semanticColors", title: "Semantic colours", count: 20 },
    { id: "identity", title: "Theme identity", count: 1 },
    { id: "chrome:subTitle", title: "Subtitle", count: 11 },
    { id: "dataPalette", title: "Data palette", count: 5 },
    { id: "textClasses", title: "Text classes", count: 42 },
    { id: "sharedColours", title: "Shared colours", count: 3 },
    { id: "chrome:title", title: "Title", count: 12 },
  ];
  const source = structuredClone(groups);
  const ordered = orderThemeGroups(groups);

  assert.deepEqual(ordered.map(({ title }) => title), [
    "Theme identity",
    "Shared colours",
    "Data palette",
    "Semantic colours",
    "Text classes",
    "Title",
    "Subtitle",
    "Background",
  ]);
  assert.deepEqual(ordered.map(({ section }) => section), [
    "Theme basics",
    "Colours",
    "Colours",
    "Colours",
    "Typography",
    "Default visual settings",
    "Default visual settings",
    "Default visual settings",
  ]);
  assert.deepEqual(groups, source);
});

test("Theme default Title and Subtitle are explicitly prioritised within default visual settings", () => {
  const groups: EditorGroupMeta[] = [
    { id: "identity", title: "Theme identity", count: 1 },
    { id: "textClasses", title: "Text classes", count: 1 },
    { id: "chrome:background", title: "Background", count: 1 },
    { id: "chrome:subTitle", title: "Subtitle", count: 1 },
    { id: "chrome:title", title: "Title", count: 1 },
  ];
  assert.deepEqual(orderThemeGroups(groups).map(({ title }) => title), [
    "Theme identity",
    "Text classes",
    "Title",
    "Subtitle",
    "Background",
  ]);
});

test("Global groups follow report defaults, page and canvas, filters, then features", () => {
  const groups: EditorGroupMeta[] = [
    { id: "global:pageFilterCards", title: "Filter cards", count: 8 },
    { id: "global:pageBackground", title: "Page background", count: 2 },
    { id: "global:personalizeVisual", title: "Personalize visual", count: 2 },
    { id: "global:reportPageAlignment", title: "Page alignment (report default)", count: 1 },
    { id: "global:pageFilterPane", title: "Filter pane", count: 12 },
    { id: "global:pageInformation", title: "Page information", count: 2 },
    { id: "global:pageRefresh", title: "Page refresh", count: 3 },
    { id: "global:pageAlignment", title: "Page alignment", count: 1 },
    { id: "global:pageWallpaper", title: "Wallpaper", count: 2 },
    { id: "global:reportFilterPaneState", title: "Filter pane (report default)", count: 2 },
    { id: "global:pageSize", title: "Canvas settings", count: 3 },
  ];
  const source = structuredClone(groups);
  const ordered = orderGlobalGroups(groups);

  assert.deepEqual(ordered.map(({ title }) => title), [
    "Filter pane (report default)",
    "Page alignment (report default)",
    "Canvas settings",
    "Page background",
    "Wallpaper",
    "Page alignment",
    "Page information",
    "Filter pane",
    "Filter cards",
    "Page refresh",
    "Personalize visual",
  ]);
  assert.deepEqual(ordered.map(({ section }) => section), [
    "Report defaults",
    "Report defaults",
    "Page & canvas",
    "Page & canvas",
    "Page & canvas",
    "Page & canvas",
    "Page & canvas",
    "Filters",
    "Filters",
    "Features & behaviour",
    "Features & behaviour",
  ]);
  assert.deepEqual(groups, source);
});

test("font-family detection covers every shared font-family naming shape", () => {
  const family = definition("family", "Font family", "text", "fontFamily");
  const face = definition("face", "Font family", "text", "fontFace");
  const titleFamily = definition("title-family", "Title font family", "text", "titleFontFamily");
  const secondaryFamily = definition("secondary-family", "Secondary font family", "text", "secFontFamily");
  const seriesFamily = definition("series-family", "Series font family", "text", "seriesFontFamily");
  const label = definition("label", "Label", "text", "label");
  assert.equal(isFontFamilyProperty(family), true);
  assert.equal(isFontFamilyProperty(face), true);
  assert.equal(isFontFamilyProperty(titleFamily), true);
  assert.equal(isFontFamilyProperty(secondaryFamily), true);
  assert.equal(isFontFamilyProperty(seriesFamily), true);
  assert.equal(isFontFamilyProperty(label), false);
});

test("font options are friendly, deduplicated, and retain an arbitrary imported literal exactly", () => {
  const custom = "Mortimer Sans Variable, sans-serif";
  assert.ok(fontFamilyOptions("Segoe UI").includes("DIN"));
  assert.ok(KNOWN_FONT_FAMILIES.includes("Arial"));
  assert.ok(KNOWN_FONT_FAMILIES.includes("DIN Light"));
  assert.equal(KNOWN_FONT_FAMILIES.some((font) => /\bwf_|helvetica|,/.test(font)), false);
  assert.equal(new Set(KNOWN_FONT_FAMILIES).size, KNOWN_FONT_FAMILIES.length);
  assert.equal(fontFamilyOptions(custom)[0], custom);
  assert.equal(fontFamilyOptions("Segoe UI").includes(custom), false);

  const markup = renderToStaticMarkup(<FontFamilyControl value={custom} label="Font family" onChange={() => undefined} />);
  assert.match(markup, /class="text-control font-picker__input"/);
  assert.match(markup, /role="combobox"/);
  assert.doesNotMatch(markup, /datalist|list="/);
  assert.ok(markup.includes(custom));
});

test("font search is case-insensitive, prefix-first, and never promotes raw stacks for another property", () => {
  const raw = "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif";
  const seg = filterFontFamilyOptions("seg", "Arial");

  assert.deepEqual(seg.slice(0, 5), ["Segoe UI", "Segoe UI Bold", "Segoe UI Light", "Segoe UI Semibold", "Segoe UI Semilight"]);
  assert.equal(seg.includes(raw), false);
  assert.equal(filterFontFamilyOptions("DIn", "Arial").includes("DIN"), true);
  assert.equal(fontFamilyOptions(raw)[0], raw, "an imported stack stays visible at the property that owns it");
  assert.equal(filterFontFamilyOptions("wf_", raw)[0], raw, "the current raw literal can still be found and preserved");
});

test("opening a font picker browses every friendly choice while retaining the current literal", () => {
  const openedWithDin = filterFontFamilyOptions("", "DIN");
  const raw = "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif";

  assert.ok(openedWithDin.includes("Arial"));
  assert.equal(openedWithDin[openedWithDin.indexOf("DIN")], "DIN");
  assert.equal(filterFontFamilyOptions("", raw)[0], raw);
  assert.deepEqual(KNOWN_FONT_FAMILIES, [...KNOWN_FONT_FAMILIES].sort((left, right) => left.localeCompare(right)));
});

test("expanded groups request only the settings-pane scroll needed to reveal their header", () => {
  assert.equal(expansionScrollDelta({ top: 100, bottom: 500 }, { top: 124, bottom: 180 }), 0);
  assert.equal(expansionScrollDelta({ top: 100, bottom: 500 }, { top: 560, bottom: 600 }), 448);
  assert.equal(expansionScrollDelta({ top: 100, bottom: 500 }, { top: 70, bottom: 110 }), -42);
});

test("opening a font picker is presentation-only; literal writes and reset paths stay unchanged", () => {
  const familyDefinition = definition("family", "Font family", "text", "fontFamily");
  const path = ["visualStyles", "lineChart", "*", "legend", 0, "fontFamily"] as Array<string | number>;
  const imported = "Some Corporate Font";
  const before = updateThemeValue({ name: "Test" } as PowerBITheme, path, imported);
  const markup = renderToStaticMarkup(
    <PropertyRow
      definition={familyDefinition}
      pathPrefix="visualStyles.lineChart.*"
      value={imported}
      hasOverride
      onChange={() => undefined}
      onReset={() => undefined}
    />,
  );

  assert.equal(readThemeValueAtPath(before, path), imported);
  assert.match(markup, /role="combobox"/);
  assert.match(markup, /Reset Font family to the theme default/);
  const reset = deleteThemeValue(before, path);
  assert.equal(readThemeValueAtPath(reset, path), undefined);
});

test("inactive group presentation leaves dependent controls enabled and editable", () => {
  const show = definition("show", "Show", "boolean", "show");
  const family = definition("family", "Font family", "text", "fontFamily");
  const group = { family, show };
  assert.equal(inactivePropertyGroup(group, { family: "Arial", show: false }), true);
  const gridline = definition("gridline", "Show", "boolean", "gridlineShow", "Gridline");
  assert.equal(inactivePropertyGroup({ family, gridline }, { family: "Arial", gridline: false }), false);

  const markup = renderToStaticMarkup(
    <PropertyRow
      definition={family}
      pathPrefix="visualStyles.lineChart.*"
      value="Arial"
      hasOverride
      inactive
      onChange={() => undefined}
      onReset={() => undefined}
    />,
  );
  assert.match(markup, /registry-property--inactive/);
  assert.doesNotMatch(markup, /disabled/);

  const groupMarkup = renderToStaticMarkup(
    <RegistryGroupBody
      theme={{ name: "Test" } as PowerBITheme}
      group={group}
      groupValues={{ family: "Arial", show: false }}
      pathPrefix="visualStyles.lineChart.*"
      getThemePath={(item) => ["visualStyles", "lineChart", "*", ...item.path]}
      onChange={() => undefined}
      onReset={() => undefined}
    />,
  );
  assert.match(groupMarkup, /property-group__body--inactive/);
  assert.match(groupMarkup, /property-group__inactive-badge">Off/);
  assert.match(groupMarkup, /Not currently shown\. Formatting applies when enabled\./);
  assert.doesNotMatch(groupMarkup, /disabled/);
});

test("visibility changes and reset preserve separately configured formatting values and literal paths", () => {
  const showPath = ["visualStyles", "lineChart", "*", "legend", 0, "show"] as Array<string | number>;
  const fontPath = ["visualStyles", "lineChart", "*", "legend", 0, "fontFamily"] as Array<string | number>;
  const custom = "Client Custom Sans";
  let theme = updateThemeValue({ name: "Test" } as PowerBITheme, fontPath, "Arial");
  assert.equal(readThemeValueAtPath(theme, fontPath), "Arial");
  theme = updateThemeValue(theme, fontPath, custom);

  theme = updateThemeValue(theme, showPath, false);
  assert.equal(readThemeValueAtPath(theme, fontPath), custom);
  theme = updateThemeValue(theme, showPath, true);
  assert.equal(readThemeValueAtPath(theme, fontPath), custom);
  theme = deleteThemeValue(theme, showPath);
  assert.equal(readThemeValueAtPath(theme, showPath), undefined);
  assert.equal(readThemeValueAtPath(theme, fontPath), custom);
});
