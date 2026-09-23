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
    // The schema also allows gradients and patterns here, but every example
    // and almost every real theme uses a plain colour, which is what readers
    // are looking for.
    fill: "Colour",
    fontSize: "Number (8–60)",
    icon: "Icon",
    image: "Image",
    paragraphs: "Formatted text",
    themeDataColor: "Palette colour",
    themeIcon: "Theme icon",
  };
  if (knownReferences[resolved.$refName]) return knownReferences[resolved.$refName];

  const choices = collectChoices(node);
  if (choices.length) return "Choice";
  if (Array.isArray(resolved.type)) return typeUnion(resolved.type);
  if (resolved.type === "array") return `List of ${pluralType(typeName(resolved.items))}`;
  if (resolved.type) return humanType(resolved.type);
  return ADVANCED_TYPE;
}

/** Structured values -- rules, callouts, data bars -- that no short label explains. */
const ADVANCED_TYPE = "Advanced setting";

function humanType(type) {
  return {
    boolean: "True / false",
    integer: "Whole number",
    null: "Empty value",
    number: "Number",
    object: ADVANCED_TYPE,
    string: "Text",
  }[type] ?? type;
}

/** "Text, a number or true/false" rather than "Text or Number or Whole number or True / false". */
function typeUnion(types) {
  const phrases = [];
  for (const type of types) {
    const phrase = { boolean: "true/false", integer: "a number", number: "a number", string: "text", null: "empty" }[type] ?? type;
    if (!phrases.includes(phrase)) phrases.push(phrase);
  }
  const sentence = phrases.length > 1 ? `${phrases.slice(0, -1).join(", ")} or ${phrases.at(-1)}` : phrases[0];
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function pluralType(label) {
  return label === "Colour" ? "colours" : label.toLocaleLowerCase();
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
  const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, minLength, maxLength } = resolved;
  if (minimum !== undefined && maximum !== undefined) values.push(`Between ${minimum} and ${maximum}`);
  else if (minimum !== undefined) values.push(`At least ${minimum}`);
  else if (maximum !== undefined) values.push(`No more than ${maximum}`);
  if (exclusiveMinimum !== undefined) values.push(`More than ${exclusiveMinimum}`);
  if (exclusiveMaximum !== undefined) values.push(`Less than ${exclusiveMaximum}`);
  if (minLength !== undefined) values.push(`At least ${minLength} ${minLength === 1 ? "character" : "characters"}`);
  if (maxLength !== undefined) values.push(`No more than ${maxLength} characters`);
  if (resolved.pattern) values.push(READABLE_PATTERNS.get(resolved.pattern) ?? `pattern ${resolved.pattern}`);
  return values;
}

/** Abbreviations in schema names, spelled out for readers. */
const EXPANSIONS = { sec: "secondary", url: "URL", pos: "position", bg: "background", img: "image" };

/** Keeps short technical names readable once everything else is lower case. */
function tidyWords(text) {
  return text
    .replace(/\b3 d\b/g, "3D")
    .replace(/\b([xy])\b/g, (letter) => letter.toUpperCase())
    .replace(/\b(sec|url|pos|bg|img)\b/g, (word) => EXPANSIONS[word])
    .replace(/\bcolor(s?)\b/g, "colour$1")
    .replace(/\bkpi\b/g, "KPI")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value) {
  return tidyWords(
    value
      .replace(/^\$+/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim()
      .toLocaleLowerCase(),
  );
}

/**
 * How a card is named inside a sentence. The card title works as a noun for
 * most cards ("the legend", "the X axis"), but not for all of them: "the
 * general" and "the theme basics" read as nonsense.
 */
function cardPhrase(cardTitle) {
  const lower = cardTitle.toLocaleLowerCase();
  if (lower === "general") return "this visual";
  if (["theme", "theme basics", "theme colours", "data palette and icons"].includes(lower)) return "the theme";
  const textClass = /^text class:? (.+)$/i.exec(cardTitle);
  if (textClass) return `the ${tidyWords(textClass[1].toLocaleLowerCase())} text class`;
  return `the ${tidyWords(lower)}`;
}

/** Setting names that say nothing on their own: "the type", "the style". */
const VAGUE_SETTINGS = new Set([
  "type", "style", "value", "mode", "kind", "option", "options", "data", "level", "index", "source", "target",
]);

/**
 * Internal plumbing that a sentence built from its name would only garble.
 * These are left undescribed rather than guessed at.
 */
const OPAQUE_WORDS = /\b(selector|null|expr|expression|template|guid|json|annotation)\b/;

/**
 * A setting that already names its card ("fill colour" on the Fill card)
 * does not need the card repeated at the end of the sentence.
 */
function dropEchoedCard(sentence, card, setting) {
  const noun = card.replace(/^(the|this) /, "").replace(/ text class$/, "");
  if (!noun || !setting.includes(noun)) return sentence;
  const escaped = card.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sentence.replace(new RegExp(` (?:used by|for|of|in|to|applies to) ${escaped}\\.$`), ".");
}

function guideDescription(propertyName, propertySchema, cardTitle) {
  const sentence = draftDescription(propertyName, propertySchema, cardTitle);
  if (!sentence) return undefined;
  const resolved = resolveReference(propertySchema);
  const title = propertySchema.title ?? resolved.title ?? friendlyName(propertyName);
  return dropEchoedCard(sentence, cardPhrase(cardTitle), words(title));
}

function draftDescription(propertyName, propertySchema, cardTitle) {
  const resolved = resolveReference(propertySchema);
  const title = propertySchema.title ?? resolved.title ?? friendlyName(propertyName);
  const setting = words(title).replace(/^(is|has) /, "");
  const card = cardPhrase(cardTitle);
  const type = typeName(propertySchema);
  // Words the card already says ("secondary" on the Secondary Y axis card)
  // are dropped from the setting's own name so the sentence does not repeat
  // itself: "the font family used in the secondary Y axis".
  const cardWords = new Set(card.split(" "));
  const own = (text) => text.split(" ").filter((word) => word && !cardWords.has(word)).join(" ");

  if (OPAQUE_WORDS.test(words(propertyName)) || OPAQUE_WORDS.test(setting)) return undefined;

  const exact = {
    "$id": "Identifies the state or item that this formatting entry applies to.",
    $schema: "Points to the file that describes the theme format. Most themes can leave this out.",
    baseTheme: "Names the built-in Power BI theme that this custom theme builds on.",
    dataColors: "Sets the ordered colour palette used for data series and categories.",
    formatString: "Sets the format string used to display numbers, dates or other values.",
    fontFace: `Sets the font family used by ${card}.`,
    fontWeight: `Sets the font weight used by ${card}.`,
    image: `Sets the image used by ${card}.`,
    name: "Sets the name Power BI displays for the imported theme.",
  };
  if (exact[propertyName]) return exact[propertyName];

  if (propertyName === "show") return `Shows or hides ${card}.`;
  if (propertyName === "enabled" || propertyName === "enable") {
    return `Turns ${card} on or off.`;
  }
  if (/^(bold|italic|underline)$/.test(propertyName)) {
    return card === "the text"
      ? `Turns ${setting} styling on or off for the text.`
      : `Turns ${setting} styling on or off for the text in ${card}.`;
  }
  if (/fontFamily$/i.test(propertyName)) {
    const target = own(words(propertyName.replace(/fontFamily$/i, "")));
    return `Sets the font family used${target ? ` for the ${target}` : ""} in ${card}.`;
  }
  if (/(fontSize|textSize)$/i.test(propertyName)) {
    const target = own(words(propertyName.replace(/(fontSize|textSize)$/i, "")));
    return `Sets the text size${target ? ` for the ${target}` : ""} in ${card}.`;
  }
  if (/(Color|Colour)$/i.test(propertyName) || ["color", "fill"].includes(propertyName)) {
    const target = own(words(propertyName.replace(/(Color|Colour)$/i, "")));
    return `Sets the ${target ? `${target} ` : ""}colour used by ${card}.`;
  }
  if (/transparency$/i.test(propertyName)) {
    const target = own(words(propertyName.replace(/transparency$/i, "")));
    return `Controls how see-through ${target ? `the ${target}` : `${card}`} is; lower values are more solid.`;
  }
  if (/^(show|enable)[A-Z]/.test(propertyName) || /Show$/.test(propertyName)) {
    const target = words(
      propertyName
        .replace(/^(show|enable)/, "")
        .replace(/Show$/, ""),
    );
    // "showOnCategoryAxis" on the zoom slider: where the card appears, not a
    // thing inside it.
    const where = /^on (.+)$/.exec(own(target));
    if (where) return `Shows or hides ${card} on the ${where[1]}.`;
    return `Shows or hides the ${own(target) || setting} in ${card}.`;
  }
  if (/^(is|has)[A-Z]/.test(propertyName) && type === "True / false") {
    return `Controls whether ${setting} applies to ${card}.`;
  }
  if (/(alignment|position|placement|location)$/i.test(propertyName)) {
    return `Controls the ${setting} of ${card}.`;
  }
  if (/(padding|spacing|margin|distance|offset|radius|angle|rotation)$/i.test(propertyName)) {
    return `Sets the ${setting} used by ${card}.`;
  }
  if (/(width|height|size|thickness|length)$/i.test(propertyName)) {
    return `Sets the ${setting} of ${card}.`;
  }
  if (/(precision|decimalPoints)$/i.test(propertyName)) {
    return `Sets how many decimal places ${card} displays.`;
  }
  if (/displayUnits$/i.test(propertyName)) {
    return `Chooses the units used to shorten values in ${card}, such as thousands or millions.`;
  }
  if (/^(start|end|minimum|maximum|min|max)$/i.test(propertyName)) {
    return `Sets the ${setting} value used by ${card}.`;
  }
  if (VAGUE_SETTINGS.has(setting)) {
    return type === "Choice" ? `Chooses the ${setting} of ${card}. The accepted values are listed below.` : undefined;
  }
  if (type === "Choice") return `Chooses the ${setting} used by ${card}.`;
  if (type === "True / false") return `Turns ${setting} on or off for ${card}.`;
  if (type === "Text" || type === "Number" || type === "Whole number" || type === "Number (8–60)") {
    return `Sets the ${setting} used by ${card}.`;
  }
  if (type.startsWith("Fill") || type.startsWith("Colour")) {
    return `Sets the ${setting} used by ${card}.`;
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

/**
 * Editor descriptions that were produced from the setting's name rather than
 * written: "Whether the enabled is turned on.", "Sets the title's title text
 * size." They are accurate but read as machine text.
 */
function isWeakStudioDescription(text) {
  return /^Whether the .+ is turned on\.$/.test(text) || /\b(\w+)'s \1\b/i.test(text) || /\bsec\b/.test(text);
}

function propertyRecord(propertyName, propertySchema, pathParts, cardTitle = "theme") {
  const resolved = resolveReference(propertySchema);
  const choices = collectChoices(propertySchema);
  const example = exampleValue(propertySchema, propertyName);
  const microsoftDescription = propertySchema.description ?? resolved.description;
  const borrowed = microsoftDescription ? undefined : themeStudioDescription(pathParts);
  const fallback = microsoftDescription ? undefined : guideDescription(propertyName, propertySchema, cardTitle);
  // Theme Studio's editor wording is preferred, except where it was itself
  // generated mechanically and reads worse than the guide's own sentence.
  const studioDescription = borrowed && !(isWeakStudioDescription(borrowed) && fallback) ? borrowed : undefined;
  const generatedDescription = microsoftDescription || studioDescription ? undefined : fallback;
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
