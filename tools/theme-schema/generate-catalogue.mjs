import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const schemaFile = path.join(directory, "reportThemeSchema-2.157.json");
const outputFile = path.resolve(directory, "../../docs/public/schema/report-theme-2.157.catalogue.json");
const schema = JSON.parse(await readFile(schemaFile, "utf8"));

const schemaSource =
  "https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.157.json";

const specialNames = {
  actionButton: "Button",
  advancedSlicerVisual: "Advanced slicer",
  aiNarratives: "Smart narrative",
  areaChart: "Area chart",
  azureMap: "Azure Maps",
  barChart: "Stacked bar chart",
  bookmarkNavigator: "Bookmark navigator",
  card: "Card (legacy)",
  cardVisual: "Card",
  clusteredBarChart: "Clustered bar chart",
  clusteredColumnChart: "Clustered column chart",
  columnChart: "Stacked column chart",
  decompositionTreeVisual: "Decomposition tree",
  donutChart: "Donut chart",
  filledMap: "Filled map",
  hundredPercentStackedAreaChart: "100% stacked area chart",
  hundredPercentStackedBarChart: "100% stacked bar chart",
  hundredPercentStackedColumnChart: "100% stacked column chart",
  kpi: "KPI",
  keyDriversVisual: "Key influencers",
  lineChart: "Line chart",
  lineClusteredColumnComboChart: "Line and clustered column chart",
  lineStackedColumnComboChart: "Line and stacked column chart",
  listSlicer: "List slicer",
  multiRowCard: "Multi-row card",
  pageNavigator: "Page navigator",
  pivotTable: "Matrix",
  pieChart: "Pie chart",
  pythonVisual: "Python visual",
  qnaVisual: "Q&A",
  rdlVisual: "Paginated report visual",
  ribbonChart: "Ribbon chart",
  scriptVisual: "R visual",
  shapeMap: "Shape map",
  stackedAreaChart: "Stacked area chart",
  tableEx: "Table",
  textSlicer: "Text slicer",
  textbox: "Text box",
  waterfallChart: "Waterfall chart",
};

function friendlyName(value) {
  if (specialNames[value]) return specialNames[value];
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function resolveReference(node) {
  if (!node?.$ref?.startsWith("#/definitions/")) return node ?? {};
  const name = node.$ref.slice("#/definitions/".length);
  return { ...schema.definitions[name], ...node, $refName: name };
}

function collectChoices(node, seen = new Set()) {
  const resolved = resolveReference(node);
  if (resolved.$refName) {
    if (seen.has(resolved.$refName)) return [];
    seen.add(resolved.$refName);
  }

  const choices = [];
  if (resolved.const !== undefined) {
    choices.push({ value: resolved.const, label: resolved.title ?? String(resolved.const) });
  }
  for (const value of resolved.enum ?? []) {
    choices.push({ value, label: String(value) });
  }
  for (const option of [...(resolved.oneOf ?? []), ...(resolved.anyOf ?? [])]) {
    choices.push(...collectChoices(option, new Set(seen)));
  }

  return choices.filter(
    (choice, index, all) =>
      all.findIndex((candidate) => JSON.stringify(candidate.value) === JSON.stringify(choice.value)) === index,
  );
}

function typeName(node) {
  const resolved = resolveReference(node);
  const knownReferences = {
    color: "Colour",
    colorOrThemeColor: "Colour or theme colour name",
    fill: "Fill (colour, gradient or pattern)",
    fontSize: "Number (8–60)",
    icon: "Icon object",
    image: "Image object",
    paragraphs: "Rich-text paragraphs",
    themeDataColor: "Theme data-colour reference",
    themeIcon: "Theme icon",
  };
  if (knownReferences[resolved.$refName]) return knownReferences[resolved.$refName];

  const choices = collectChoices(node);
  if (choices.length) return "Choice";
  if (Array.isArray(resolved.type)) return resolved.type.map(humanType).join(" or ");
  if (resolved.type === "array") return `List of ${typeName(resolved.items)}`;
  if (resolved.type) return humanType(resolved.type);
  if (resolved.oneOf || resolved.anyOf) return "One of several value formats";
  return "Structured value";
}

function humanType(type) {
  return {
    boolean: "True / false",
    integer: "Whole number",
    null: "Empty value",
    number: "Number",
    object: "Object",
    string: "Text",
  }[type] ?? type;
}

function constraints(node) {
  const resolved = resolveReference(node);
  const values = [];
  if (resolved.minimum !== undefined) values.push(`minimum ${resolved.minimum}`);
  if (resolved.maximum !== undefined) values.push(`maximum ${resolved.maximum}`);
  if (resolved.exclusiveMinimum !== undefined) values.push(`greater than ${resolved.exclusiveMinimum}`);
  if (resolved.exclusiveMaximum !== undefined) values.push(`less than ${resolved.exclusiveMaximum}`);
  if (resolved.minLength !== undefined) values.push(`minimum length ${resolved.minLength}`);
  if (resolved.maxLength !== undefined) values.push(`maximum length ${resolved.maxLength}`);
  if (resolved.pattern) values.push(`pattern ${resolved.pattern}`);
  return values;
}

function exampleValue(node, propertyName) {
  const resolved = resolveReference(node);
  const choices = collectChoices(node);
  if (choices.length) return choices[0].value;
  if (resolved.$refName === "color" || resolved.$refName === "colorOrThemeColor") return "#005EA5";
  if (resolved.$refName === "fill") return { solid: { color: "#005EA5" } };
  if (resolved.$refName === "fontSize") return 12;
  if (resolved.$refName === "themeDataColor") {
    return { expr: { ThemeDataColor: { ColorId: 0, Percent: 0 } } };
  }
  if (resolved.$refName === "image") return { name: "Example image", url: "data:image/png;base64,…", scaling: "Normal" };
  if (resolved.$refName === "icon" || resolved.$refName === "themeIcon") return undefined;
  if (resolved.type === "boolean") return true;
  if (resolved.type === "integer") return resolved.minimum ?? 1;
  if (resolved.type === "number") {
    if (/transparency/i.test(propertyName)) return 0;
    return resolved.minimum ?? 1;
  }
  if (resolved.type === "string") {
    if (/fontFamily/i.test(propertyName)) return "Segoe UI";
    if (/color/i.test(propertyName)) return "#005EA5";
    return "Example text";
  }
  return undefined;
}

function propertyRecord(propertyName, propertySchema, pathParts) {
  const resolved = resolveReference(propertySchema);
  const choices = collectChoices(propertySchema);
  const example = exampleValue(propertySchema, propertyName);
  return {
    id: propertyName,
    title: propertySchema.title ?? resolved.title ?? friendlyName(propertyName),
    description: propertySchema.description ?? resolved.description ?? "No plain-language description is provided in the Microsoft schema.",
    path: pathParts.join("."),
    type: typeName(propertySchema),
    ...(choices.length ? { choices } : {}),
    ...(constraints(propertySchema).length ? { constraints: constraints(propertySchema) } : {}),
    ...(resolved.required?.length ? { requiredFields: resolved.required } : {}),
    ...(example !== undefined ? { example } : {}),
  };
}

function cardRecord(cardName, cardSchema, scopePath, source) {
  const properties = cardSchema?.items?.properties ?? {};
  return {
    id: cardName,
    title: cardSchema.title ?? friendlyName(cardName),
    description: cardSchema.description,
    source,
    properties: Object.entries(properties).map(([propertyName, propertySchema]) =>
      propertyRecord(propertyName, propertySchema, [...scopePath, cardName, "0", propertyName]),
    ),
  };
}

function cardsFromProperties(properties, scopePath, source) {
  return Object.entries(properties ?? {})
    .filter(([cardName, cardSchema]) => cardName !== "*" && cardSchema?.items?.properties)
    .map(([cardName, cardSchema]) => cardRecord(cardName, cardSchema, scopePath, source));
}

function innerStyleProperties(scopeSchema) {
  return Object.assign(
    {},
    ...(scopeSchema?.properties?.["*"]?.allOf ?? []).map((part) => part.properties ?? {}),
  );
}

function visualDefinitionFor(key, visualSchema) {
  const reference = visualSchema?.properties?.["*"]?.$ref;
  if (!reference?.startsWith("#/definitions/visual-")) return undefined;
  return schema.definitions[reference.slice("#/definitions/".length)];
}

const visualStyleProperties = schema.properties.visualStyles.properties;
const commonCards = cardsFromProperties(
  schema.definitions.commonCards.properties,
  ["visualStyles", "<visual name>", "*"],
  "common",
);

const visuals = Object.entries(visualStyleProperties)
  .map(([key, visualSchema]) => {
    const definition = visualDefinitionFor(key, visualSchema);
    if (!definition) return undefined;
    const specificProperties = Object.assign(
      {},
      ...(definition.allOf ?? []).map((part) => part.properties ?? {}),
    );
    return {
      id: key,
      title: friendlyName(key),
      cards: cardsFromProperties(specificProperties, ["visualStyles", key, "*"], "visual"),
    };
  })
  .filter(Boolean)
  .sort((left, right) => left.title.localeCompare(right.title));

const globalScopes = ["report", "page", "filter", "group"].map((key) => ({
  id: key,
  title: {
    report: "Report defaults",
    page: "Page and canvas",
    filter: "Filter behaviour",
    group: "Visual groups",
  }[key],
  cards: cardsFromProperties(innerStyleProperties(visualStyleProperties[key]), ["visualStyles", key, "*"], "global"),
}));

const topLevelNames = Object.keys(schema.properties).filter(
  (propertyName) => !["visualStyles", "textClasses"].includes(propertyName),
);
const themeBasics = ["$schema", "name", "baseTheme"];
const paletteAndIcons = ["dataColors", "icons"];
const themeColours = topLevelNames.filter(
  (propertyName) => !themeBasics.includes(propertyName) && !paletteAndIcons.includes(propertyName),
);
const textClassDefinition = resolveReference({ $ref: "#/definitions/textClass" });
const topLevelCards = [
  {
    id: "themeBasics",
    title: "Theme basics",
    source: "global",
    properties: themeBasics.map((propertyName) =>
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName]),
    ),
  },
  {
    id: "paletteAndIcons",
    title: "Data palette and icons",
    source: "global",
    properties: paletteAndIcons.map((propertyName) =>
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName]),
    ),
  },
  {
    id: "themeColours",
    title: "Theme colours",
    source: "global",
    properties: themeColours.map((propertyName) =>
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName]),
    ),
  },
  ...Object.keys(schema.properties.textClasses.properties).map((className) => ({
    id: `textClasses.${className}`,
    title: `Text class: ${friendlyName(className)}`,
    source: "global",
    properties: Object.entries(textClassDefinition.properties).map(([propertyName, propertySchema]) =>
      propertyRecord(propertyName, propertySchema, ["textClasses", className, propertyName]),
    ),
  })),
];

const topLevel = topLevelCards.flatMap((card) => card.properties);

const propertyOccurrences =
  topLevel.length +
  commonCards.reduce((total, card) => total + card.properties.length, 0) +
  globalScopes.flatMap((scope) => scope.cards).reduce((total, card) => total + card.properties.length, 0) +
  visuals.flatMap((visual) => visual.cards).reduce((total, card) => total + card.properties.length, 0);

const catalogue = {
  metadata: {
    schema: "reportThemeSchema-2.157.json",
    powerBiDesktopVersion: "2.157.x.x",
    release: "August 2026",
    explorationVersion: schema.description,
    source: schemaSource,
    jsonSchemaVersion: "Draft 7",
  },
  totals: {
    visualTypes: visuals.length,
    commonCards: commonCards.length,
    globalScopes: globalScopes.length,
    propertyOccurrences,
  },
  topLevel,
  topLevelCards,
  commonCards,
  globalScopes,
  visuals,
};

await writeFile(outputFile, `${JSON.stringify(catalogue)}\n`);
console.log(
  `Wrote ${path.relative(process.cwd(), outputFile)}: ${visuals.length} visuals, ${propertyOccurrences} property occurrences.`,
);
