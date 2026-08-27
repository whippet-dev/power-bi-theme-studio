import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FontFamilyControl, PropertyRow, RegistryGroupBody } from "../app/components/PropertyEditor";
import {
  fontFamilyOptions,
  inactivePropertyGroup,
  isFontFamilyProperty,
  isMasterActivationProperty,
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

test("font-family detection covers visual fontFamily and global fontFace paths only", () => {
  const family = definition("family", "Font family", "text", "fontFamily");
  const face = definition("face", "Font family", "text", "fontFace");
  const titleFamily = definition("title-family", "Title font family", "text", "titleFontFamily");
  const label = definition("label", "Label", "text", "label");
  assert.equal(isFontFamilyProperty(family), true);
  assert.equal(isFontFamilyProperty(face), true);
  assert.equal(isFontFamilyProperty(titleFamily), true);
  assert.equal(isFontFamilyProperty(label), false);
});

test("font options offer shipped fonts and retain an arbitrary imported literal exactly", () => {
  const custom = "Mortimer Sans Variable, sans-serif";
  assert.ok(fontFamilyOptions("Segoe UI").includes("DIN"));
  assert.ok(fontFamilyOptions("Segoe UI").includes("'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif"));
  assert.equal(fontFamilyOptions(custom)[0], custom);

  const markup = renderToStaticMarkup(<FontFamilyControl value={custom} label="Font family" onChange={() => undefined} />);
  assert.match(markup, /class="text-control font-family-control"/);
  assert.match(markup, /list="[^"]+"/);
  assert.ok(markup.includes(custom));
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
