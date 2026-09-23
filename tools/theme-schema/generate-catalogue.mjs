import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const directory = path.dirname(fileURLToPath(import.meta.url));
const schemaFile = path.join(directory, "reportThemeSchema-2.157.json");
const outputFile = path.resolve(directory, "../../docs/public/schema/report-theme-2.157.catalogue.json");
const schema = JSON.parse(await readFile(schemaFile, "utf8"));

const schemaSource =
  "https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.157.json";

const themeStudioDescriptions = new Map();
const themeStudioWildcardDescriptions = new Map();

function literal(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) {
    const values = node.elements.map(literal);
    return values.some((value) => value === undefined) ? undefined : values;
  }
  return undefined;
}

function collectThemeStudioDescriptions(sourceText, filename) {
  const source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visualFactories = new Set(["boolProp", "colorProp", "enumProp", "numberProp", "textProp"]);
  const rootFactories = new Set(["colorRoot", "numberRoot", "textRoot"]);

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const factory = node.expression.text;
      if (visualFactories.has(factory)) {
        const visual = literal(node.arguments[0]);
        const description = literal(node.arguments[3]);
        const propertyPath = literal(node.arguments[4]);
        if (typeof visual === "string" && typeof description === "string" && Array.isArray(propertyPath)) {
          const suffix = propertyPath.join(".");
          if (visual === "*") themeStudioWildcardDescriptions.set(suffix, description);
          else themeStudioDescriptions.set(`visualStyles.${visual}.*.${suffix}`, description);
        }
      } else if (rootFactories.has(factory)) {
        const description = literal(node.arguments[2]);
        const propertyPath = literal(node.arguments[3]);
        if (typeof description === "string" && Array.isArray(propertyPath)) {
          themeStudioDescriptions.set(propertyPath.join("."), description);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const libraryDirectory = path.resolve(directory, "../../app/lib");
for (const entry of await readdir(libraryDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith("Properties.ts")) continue;
  const filename = path.join(libraryDirectory, entry.name);
  collectThemeStudioDescriptions(await readFile(filename, "utf8"), filename);
}

function themeStudioDescription(pathParts) {
  const path = pathParts.join(".");
  const exact = themeStudioDescriptions.get(path);
  if (exact) return exact;
  if (pathParts[0] !== "visualStyles" || pathParts.length < 5) return undefined;
  return themeStudioWildcardDescriptions.get(pathParts.slice(3).join("."));
}

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

/**
 * Validation patterns the schema uses, restated for people rather than
 * parsers. A raw regular expression means nothing to most readers, so a
 * pattern listed here is shown as its sentence instead.
 */
const READABLE_PATTERNS = new Map([
  [
    "^#[0-9a-fA-F]{8}$|^#(?:[0-9a-fA-F]{3}){1,2}$",
    "Colour code: # followed by 6 characters, such as #1A73E8. Shorter codes (#FFF) and 8-character codes with transparency (#1A73E8CC) also work.",
  ],
]);

function constraints(node) {
  const resolved = resolveReference(node);
  const values = [];
  if (resolved.minimum !== undefined) values.push(`minimum ${resolved.minimum}`);
  if (resolved.maximum !== undefined) values.push(`maximum ${resolved.maximum}`);
  if (resolved.exclusiveMinimum !== undefined) values.push(`greater than ${resolved.exclusiveMinimum}`);
  if (resolved.exclusiveMaximum !== undefined) values.push(`less than ${resolved.exclusiveMaximum}`);
  if (resolved.minLength !== undefined) values.push(`minimum length ${resolved.minLength}`);
  if (resolved.maxLength !== undefined) values.push(`maximum length ${resolved.maxLength}`);
  if (resolved.pattern) values.push(READABLE_PATTERNS.get(resolved.pattern) ?? `pattern ${resolved.pattern}`);
  return values;
}

function words(value) {
  return value
    .replace(/^\$+/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function guideDescription(propertyName, propertySchema, cardTitle) {
  const resolved = resolveReference(propertySchema);
  const title = propertySchema.title ?? resolved.title ?? friendlyName(propertyName);
  const setting = words(title);
  const card = cardTitle.toLocaleLowerCase();
  const type = typeName(propertySchema);

  const exact = {
    "$id": "Identifies the state or item that this formatting entry applies to.",
    baseTheme: "Names the built-in Power BI theme that this custom theme builds on.",
    dataColors: "Sets the ordered colour palette used for data series and categories.",
    formatString: "Sets the format string used to display numbers, dates or other values.",
    fontFace: `Sets the font family used by the ${card}.`,
    fontWeight: `Sets the font weight used by the ${card}.`,
    image: `Sets the image used by the ${card}.`,
    name: "Sets the name Power BI displays for the imported theme.",
  };
  if (exact[propertyName]) return exact[propertyName];

  if (propertyName === "show") return `Shows or hides the ${card}.`;
  if (propertyName === "enabled" || propertyName === "enable") {
    return `Turns the ${card} on or off.`;
  }
  if (/^(bold|italic|underline)$/.test(propertyName)) {
    return `Turns ${setting} styling on or off for the ${card} text.`;
  }
  if (/fontFamily$/i.test(propertyName)) {
    const target = words(propertyName.replace(/fontFamily$/i, ""));
    return `Sets the font family used${target ? ` for the ${target}` : ""} in the ${card}.`;
  }
  if (/(fontSize|textSize)$/i.test(propertyName)) {
    const target = words(propertyName.replace(/(fontSize|textSize)$/i, ""));
    return `Sets the text size${target ? ` for the ${target}` : ""} in the ${card}.`;
  }
  if (/(Color|Colour)$/i.test(propertyName) || ["color", "fill"].includes(propertyName)) {
    const target = words(propertyName.replace(/(Color|Colour)$/i, ""));
    return `Sets the ${target ? `${target} ` : ""}colour used by the ${card}.`;
  }
  if (/transparency$/i.test(propertyName)) {
    const target = words(propertyName.replace(/transparency$/i, ""));
    return `Controls how see-through ${target ? `the ${target}` : `the ${card}`} is; lower values are more solid.`;
  }
  if (/^(show|enable)[A-Z]/.test(propertyName) || /Show$/.test(propertyName)) {
    const target = words(
      propertyName
        .replace(/^(show|enable)/, "")
        .replace(/Show$/, ""),
    );
    return `Shows or hides the ${target || setting} in the ${card}.`;
  }
  if (/^(is|has)[A-Z]/.test(propertyName) && type === "True / false") {
    return `Controls whether ${setting} applies to the ${card}.`;
  }
  if (/(alignment|position|placement|location)$/i.test(propertyName)) {
    return `Controls the ${setting} of the ${card}.`;
  }
  if (/(padding|spacing|margin|distance|offset|radius|angle|rotation)$/i.test(propertyName)) {
    return `Sets the ${setting} used by the ${card}.`;
  }
  if (/(width|height|size|thickness|length)$/i.test(propertyName)) {
    return `Sets the ${setting} of the ${card}.`;
  }
  if (/(precision|decimalPoints)$/i.test(propertyName)) {
    return `Sets how many decimal places the ${card} displays.`;
  }
  if (/displayUnits$/i.test(propertyName)) {
    return `Chooses the units used to shorten values in the ${card}, such as thousands or millions.`;
  }
  if (/^(start|end|minimum|maximum|min|max)$/i.test(propertyName)) {
    return `Sets the ${setting} value used by the ${card}.`;
  }
  if (type === "Choice") return `Chooses the ${setting} used by the ${card}.`;
  if (type === "True / false") return `Turns ${setting} on or off for the ${card}.`;
  if (type === "Text" || type === "Number" || type === "Whole number" || type === "Number (8–60)") {
    return `Sets the ${setting} used by the ${card}.`;
  }
  if (type.startsWith("Fill") || type.startsWith("Colour")) {
    return `Sets the ${setting} used by the ${card}.`;
  }
  return undefined;
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

function propertyRecord(propertyName, propertySchema, pathParts, cardTitle = "theme") {
  const resolved = resolveReference(propertySchema);
  const choices = collectChoices(propertySchema);
  const example = exampleValue(propertySchema, propertyName);
  const microsoftDescription = propertySchema.description ?? resolved.description;
  const studioDescription = microsoftDescription ? undefined : themeStudioDescription(pathParts);
  const generatedDescription = microsoftDescription || studioDescription
    ? undefined
    : guideDescription(propertyName, propertySchema, cardTitle);
  return {
    id: propertyName,
    title: propertySchema.title ?? resolved.title ?? friendlyName(propertyName),
    description: microsoftDescription ?? studioDescription ?? generatedDescription ?? "No plain-language explanation is available yet.",
    descriptionSource: microsoftDescription
      ? "microsoft"
      : studioDescription
        ? "theme-studio"
        : generatedDescription
          ? "guide"
          : "unavailable",
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
  const title = cardSchema.title ?? friendlyName(cardName);
  return {
    id: cardName,
    title,
    description: cardSchema.description,
    source,
    properties: Object.entries(properties).map(([propertyName, propertySchema]) =>
      propertyRecord(propertyName, propertySchema, [...scopePath, cardName, "0", propertyName], title),
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
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName], "theme basics"),
    ),
  },
  {
    id: "paletteAndIcons",
    title: "Data palette and icons",
    source: "global",
    properties: paletteAndIcons.map((propertyName) =>
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName], "data palette and icons"),
    ),
  },
  {
    id: "themeColours",
    title: "Theme colours",
    source: "global",
    properties: themeColours.map((propertyName) =>
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName], "theme colours"),
    ),
  },
  ...Object.keys(schema.properties.textClasses.properties).map((className) => ({
    id: `textClasses.${className}`,
    title: `Text class: ${friendlyName(className)}`,
    source: "global",
    properties: Object.entries(textClassDefinition.properties).map(([propertyName, propertySchema]) => {
      const title = `text class ${friendlyName(className).toLocaleLowerCase()}`;
      return propertyRecord(propertyName, propertySchema, ["textClasses", className, propertyName], title);
    }),
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
    themeStudioDescriptions: themeStudioDescriptions.size + themeStudioWildcardDescriptions.size,
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
