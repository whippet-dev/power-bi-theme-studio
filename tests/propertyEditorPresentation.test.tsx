import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FontFamilyControl, PropertyRow, RegistryGroupBody } from "../app/components/PropertyEditor";
import {
  fontFamilyOptions,
  inactivePropertyGroup,
  isFontFamilyProperty,
  isMasterActivationProperty,
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
