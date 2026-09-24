import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { sortCards, sortProperties } from "../../docs/components/setting-order.mjs";
import { exampleValue } from "./examples.mjs";
import { CARD_PHRASES, CURATED, fillTemplate, partDescription } from "./wording.mjs";

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
const EXPANSIONS = {
  sec: "secondary",
  url: "URL",
  pos: "position",
  bg: "background",
  img: "image",
  back: "background",
  max: "maximum",
  min: "minimum",
  param: "parameter",
};

/** Keeps short technical names readable once everything else is lower case. */
function tidyWords(text) {
  return text
    .replace(/\b3 d\b/g, "3D")
    .replace(/\b([xy])axis\b/g, "$1 axis")
    .replace(/\b([xy])\b/g, (letter) => letter.toUpperCase())
    .replace(/\b(sec|url|pos|bg|img|back|max|min|param)\b/g, (word) => EXPANSIONS[word])
    .replace(/\bcolor(s?)\b/g, "colour$1")
    .replace(/\bkpi\b/g, "KPI")
    .replace(/\b3d\b/g, "3D")
    .replace(/\bbehavior\b/g, "behaviour")
    .replace(/\bcenter\b/g, "centre")
    .replace(/\bdash cap\b/g, "shape of the dash ends")
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
  if (lower === "visualization") return "the visual";
  if (lower === "find anomalies") return "anomaly detection";
  if (lower === "slicer settings") return "the slicer";
  if (lower === "card") return "each card";
  // Cards named after a topic rather than a thing: "the data" and "the
  // behavior" are not objects a setting can belong to, but their settings are.
  if (SETTINGS_CARDS.has(lower)) return `the ${tidyWords(lower)} settings`;
  if (["theme", "theme basics", "theme colours", "data palette and icons"].includes(lower)) return "the theme";
  const textClass = /^text class:? (.+)$/i.exec(cardTitle);
  if (textClass) return `the ${tidyWords(textClass[1].toLocaleLowerCase())} text class`;
  return `the ${tidyWords(lower)}`;
}

const SETTINGS_CARDS = new Set([
  "accessibility",
  "analysis",
  "behavior",
  "data",
  "export",
  "filters",
  "hidden properties",
  "layout",
  "overflow",
  "padding",
  "parameter mapping",
  "report info",
  "script",
  "spacing",
  "summary refresh",
]);

/** Setting names that start with a verb: "hide inner borders", "require single select". */
const ACTION_WORDS =
  /^(hide|show|use|allow|keep|match|require|include|scale|hug|display|lock|limit|preserve|reverse|invert|ignore|override|remember|snap|sort|stack|split|switch|concatenate|fit|wrap|repeat|expand|collapse|highlight|merge|drill)\b/;

/** "the column headers", "the bubbles" -- but not "the gridlines' glass" or "the class". */
function isPlural(phrase) {
  const last = phrase.split(" ").at(-1);
  return /[^s]s$/.test(last) && !/(ss|us|is)$/.test(last);
}

/** Setting names that say nothing on their own: "the type", "the style". */
const VAGUE_SETTINGS = new Set([
  "type", "style", "value", "mode", "kind", "option", "options", "data", "level", "index", "source", "target", "field",
]);

/**
 * Internal plumbing that a sentence built from its name would only garble.
 * These are left undescribed rather than guessed at.
 */
const OPAQUE_WORDS = /\b(selector|null|expr|expression|template|guid|json|annotation|utterance|ids?|node)\b/;

/**
 * A setting that already names its card ("fill colour" on the Fill card)
 * does not need the card repeated at the end of the sentence.
 */
function dropEchoedCard(sentence, card, setting) {
  const noun = card.replace(/^(the|this) /, "").replace(/ text class$/, "");
  if (!noun || !setting.includes(noun)) return sentence;
  const escaped = card.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const shortened = sentence.replace(new RegExp(` (?:used by|for|of|in|to|applies to) ${escaped}\\.$`), ".");
  // Only drop the card if the sentence still says what it belongs to:
  // "Sets the fill colour." yes, bare "Sets the colour." no.
  return shortened.includes(noun) ? shortened : sentence;
}

function guideDescription(propertyName, propertySchema, cardTitle, card = cardPhrase(cardTitle)) {
  const sentence = draftDescription(propertyName, propertySchema, cardTitle, card);
  if (!sentence) return undefined;
  const resolved = resolveReference(propertySchema);
  const title = propertySchema.title ?? resolved.title ?? friendlyName(propertyName);
  return dropEchoedCard(sentence, card, words(title));
}

function draftDescription(propertyName, propertySchema, cardTitle, card = cardPhrase(cardTitle)) {
  const resolved = resolveReference(propertySchema);
  const title = propertySchema.title ?? resolved.title ?? friendlyName(propertyName);
  const type = typeName(propertySchema);
  // Words the card already says ("secondary" on the Secondary Y axis card)
  // are dropped from the setting's own name so the sentence does not repeat
  // itself: "the font family used in the secondary Y axis".
  // Singular forms too, so "gridline" matches the Gridlines card.
  const cardWords = new Set(card.split(" ").flatMap((word) => (/[^s]s$/.test(word) ? [word, word.slice(0, -1)] : [word])));
  const own = (text) => {
    // Only words at the ends are trimmed: "lastDateFontColor" on the Date
    // card keeps "last date font", where removing the middle "date" would
    // leave "last font".
    const parts = text.split(" ").filter(Boolean);
    while (parts.length && cardWords.has(parts[0])) parts.shift();
    const leading = [...parts];
    while (parts.length && cardWords.has(parts.at(-1))) parts.pop();
    // "showDynamicLabels" on Data labels: "dynamic" alone says nothing.
    const kept = (parts.length === 1 && leading.length > 1 ? leading : parts).join(" ");
    // "secFontSize" on a Y axis card: "secondary" alone means the secondary axis.
    return kept === "secondary" ? "secondary axis" : kept;
  };
  // A one-word display name ("Width") loses what the setting is the width
  // of; the setting's own name ("borderWidth") keeps it.
  const named = words(title).replace(/^(is|has) /, "");
  const fuller = own(words(propertyName).replace(/^(is|has) /, ""));
  // Titles written as Format pane prompts ("Enter a URL", "Show these
  // markers") are not names; the setting's own name is.
  const prompt = /^(enter|show these|set as|choose|select|upload|add) /.test(named);
  const setting = prompt || (!named.includes(" ") && fuller.includes(" ")) ? fuller : named;

  // Top-level theme colours with no description of their own.
  const themeRoot = {
    foreground:
      'The main text colour. Power BI uses it for labels, table and matrix values, card values and many other pieces of text. Same as "firstLevelElements".',
    background:
      "The main background colour, used for things such as label backgrounds inside data points, slicer drop-down lists, button fills and the filter pane.",
    tableAccent: "The accent colour for tables and matrices, used for the grid outline.",
    icons: "Custom icons, each with a name and an image, that conditional formatting in the report can use.",
  };
  if (card === "the theme" && themeRoot[propertyName]) return themeRoot[propertyName];

  const exact = {
    "$id": "Identifies the state or item that this formatting entry applies to.",
    interpolationSmoothParam: "Sets how tightly a smoothed line bends between points (its tension).",
    maxTiles: "Sets the largest number of cards shown at once.",
    setAsBackGround: "Controls whether the image is used as the background.",
    useFloatingToolbar: "Controls whether the toolbar floats over the report.",
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

  if (OPAQUE_WORDS.test(words(propertyName)) || OPAQUE_WORDS.test(setting)) return undefined;
  // "visualType1", "visualType2": numbered internals with no readable meaning.
  if (/\d$/.test(setting)) return undefined;

  if (propertyName === "show") return `Shows or hides ${card}.`;
  if (propertyName === "enabled" || propertyName === "enable") {
    return `Turns ${card} on or off.`;
  }
  const styling = /(bold|italic|underline)$/i.exec(propertyName);
  if (styling) {
    // "targetValueBold" names the text it styles; plain "bold" styles the card's own text.
    const target = own(words(propertyName.slice(0, -styling[1].length)));
    const style = styling[1].toLocaleLowerCase();
    if (target) return `Turns ${style} styling on or off for the ${target} in ${card}.`;
    return card === "the text"
      ? `Turns ${style} styling on or off for the text.`
      : `Turns ${style} styling on or off for the text in ${card}.`;
  }
  if (/fontFamily$/i.test(propertyName)) {
    const target = own(words(propertyName.replace(/fontFamily$/i, "")));
    return `Sets the font family used${target ? ` for the ${target}` : ""} in ${card}.`;
  }
  if (/(fontSize|textSize)$/i.test(propertyName)) {
    const target = own(words(propertyName.replace(/(fontSize|textSize)$/i, "")));
    return `Sets the text size${target ? ` for the ${target}` : ""} in ${card}.`;
  }
  const onOff = type === "True / false";
  // "detailShowBlankAs": text, despite its name.
  if (/showBlankAs$/i.test(propertyName)) {
    const target = own(words(propertyName.replace(/showBlankAs$/i, "")));
    return `The text shown instead of a blank value${target ? ` in the ${target}` : ""} in ${card}, such as "(Blank)" or "–".`;
  }
  if (/.FormatString$/.test(propertyName)) {
    const target = own(words(propertyName.replace(/FormatString$/, "")));
    return `The number format for the ${target || "value"} in ${card}, such as "#,0" for whole numbers or "0.0%" for percentages.`;
  }
  if (onOff && /^export[A-Z]/.test(propertyName)) {
    // The schema's own title keeps the product names intact: "Microsoft Excel (.xlsx)".
    return `Lets people export to ${title}.`;
  }
  if (!onOff && (/(Color|Colour)$/i.test(propertyName) || ["color", "fill"].includes(propertyName))) {
    const target = own(words(propertyName.replace(/(Color|Colour)$/i, "")));
    return `Sets the ${target ? `${target} ` : ""}colour used by ${card}.`;
  }
  if (!onOff && /transparency$/i.test(propertyName)) {
    const target = own(words(propertyName.replace(/transparency$/i, "")));
    const subject = target ? `the ${target}` : card;
    return `Controls how see-through ${subject} ${isPlural(subject) ? "are" : "is"}; lower values are more solid.`;
  }
  if (onOff && (/^(show|enable)[A-Z]/.test(propertyName) || /Show$/.test(propertyName))) {
    const target = words(
      propertyName
        .replace(/^(show|enable)/, "")
        .replace(/Show$/, ""),
    );
    // "showOnCategoryAxis" on the zoom slider: where the card appears, not a
    // thing inside it.
    const where = /^on (.+)$/.exec(own(target));
    if (where) return `Shows or hides ${card} on the ${where[1]}.`;
    // "showByDefault", "showIconByState": when it shows, not what shows.
    if (/^by /.test(own(target))) return `Shows or hides ${card} ${own(target)}.`;
    // "backgroundShow" on the Background card names nothing but the card.
    if (!own(target)) return `Shows or hides ${card}.`;
    // "showAll": all of what is not clear from the name.
    if (own(target) === "all") return undefined;
    return `Shows or hides the ${own(target)} in ${card}.`;
  }
  // "isCalloutValuesAdvanced": whether that part gets its own advanced formatting.
  const advanced = /^is(.+)Advanced$/i.exec(propertyName);
  if (advanced && type === "True / false") {
    const part = own(words(advanced[1]));
    return `Turns advanced formatting on or off for the ${part || "settings"} in ${card}.`;
  }
  if (/^(is|has)[A-Z]/.test(propertyName) && type === "True / false") {
    // "isAnomalyHighlighted": whether the anomaly is highlighted.
    const state = /^(.+) (highlighted|enabled|visible|shown|selected|expanded|hidden)$/.exec(setting);
    if (state) return `Controls whether the ${state[1]} is ${state[2]}.`;
    return `Controls whether ${setting} applies to ${card}.`;
  }
  if (!onOff && /(alignment|position|placement|location)$/i.test(propertyName)) {
    return `Controls the ${setting} of ${card}.`;
  }
  if (!onOff && /(padding|spacing|margin|distance|offset|radius|angle|rotation)$/i.test(propertyName)) {
    return `Sets the ${setting} used by ${card}.`;
  }
  if (!onOff && /(width|height|size|thickness|length)$/i.test(propertyName)) {
    return `Sets the ${setting} of ${card}.`;
  }
  if (/[a-z]Count$/.test(propertyName)) {
    // "columnCount" -> "the number of columns", not "the columns".
    const noun = own(words(propertyName.replace(/Count$/, "")));
    if (noun) return `Sets the number of ${noun.endsWith("s") ? noun : `${noun}s`} used by ${card}.`;
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
  if (type === "True / false") {
    // A setting named as an action ("hide inner borders") does not fit
    // "Turns ... on or off"; say what switching it on does instead.
    const appliesTo = /^apply to (.+)$/.exec(setting);
    if (appliesTo) {
      return /formatting/.test(card)
        ? `Controls whether this formatting also applies to the ${appliesTo[1]}.`
        : `Controls whether the formatting of ${card} also applies to the ${appliesTo[1]}.`;
    }
    if (ACTION_WORDS.test(setting)) return `Controls whether to ${setting} in ${card}.`;
    // "addBackground": "Turns the background on or off", not "Turns add background".
    const added = /^add (.+)$/.exec(setting);
    if (added) return `Turns the ${added[1]} on or off for ${card}.`;
    // "selfFilterEnabled": "enabled" is what "on" already means.
    return `Turns ${setting.replace(/ enabled$/, "")} on or off for ${card}.`;
  }
  if (type === "Text" || type === "Number" || type === "Whole number" || type === "Number (8–60)") {
    return `Sets the ${setting} used by ${card}.`;
  }
  if (type.startsWith("Fill") || type.startsWith("Colour") || type === "Image") {
    return `Sets the ${setting} used by ${card}.`;
  }
  return undefined;
}

/**
 * Editor descriptions that were produced from the setting's name rather than
 * written: "Whether the enabled is turned on.", "Sets the title's title text
 * size." They are accurate but read as machine text.
 */
/**
 * Collapses stray spaces and line breaks -- Microsoft's text carries some --
 * and ends every description with a full stop, without changing its words.
 */
function tidySentence(text) {
  const tidy = text.replace(/\s+/g, " ").trim();
  return /[.!?)"”]$/.test(tidy) ? tidy : `${tidy}.`;
}

function isRepetitivePossessive(text) {
  const match = /^Sets the ([^.']+)'s ([^.']+)\.$/.exec(text);
  if (!match) return false;
  if (/s$/.test(match[1])) return true;
  const stem = (word) => word.toLocaleLowerCase().replace(/s$/, "");
  const before = new Set(match[1].split(" ").map(stem));
  return match[2].split(" ").some((word) => word.length > 2 && before.has(stem(word)));
}

function isWeakStudioDescription(text) {
  return (
    // "Whether the enabled is turned on." / "Whether the detail labels is shown."
    /^Whether the .+ is turned on\.$/.test(text) ||
    /^Whether the [^']+s is shown\.$/.test(text) ||
    // The editor's "Sets the <setting>'s <label>." template. It reads fine as
    // "Sets the marker's size." but turns to nonsense when both halves repeat
    // the same words ("Sets the corner bottom left's bottom left corner.") or
    // the setting is plural ("Sets the data labels's text size.").
    isRepetitivePossessive(text) ||
    /, of the [^.]*\bwidth\.$/.test(text) ||
    // "Whether the column headers's text is bold."
    /[a-z]s's\b/.test(text) ||
    // "The custom text used for the title show blank as."
    /^The custom text used for the /.test(text) ||
    // "Sets the text's series font size."
    /^Sets the text's /.test(text) ||
    /\b(sec|param|max|min)\b/.test(text) ||
    // "Sets the orientation.", "Whether the shade is shown.", "The colour of
    // the line.": true, but they do not say which part of which visual. The
    // guide's own sentence names the card.
    /^Sets the [^.]{1,40}\.$/.test(text) ||
    /^Whether the [\w' ]+ (is|are) shown\.$/.test(text) ||
    /^The colour of the [\w ]+\.$/.test(text)
  );
}

/**
 * Replacements for Microsoft descriptions that mislead in a theme.
 *
 * Microsoft writes for someone formatting one visual in Power BI, so the title
 * text is "The name of the visual". In a theme it is a default that every
 * visual of that type picks up -- which is usually not what people want. The
 * subtitle entries simply repeat the title's wording by mistake.
 *
 * Keyed by "card.setting".
 */
const THEME_WORDING = {
  "title.text":
    "The default title for this type of visual. Every visual of this type shows this wording unless it has its own title, so it is usually best left out.",
  "subTitle.text":
    "The default subtitle for this type of visual. Every visual of this type shows this wording unless it has its own subtitle, so only set it if the wording suits them all.",
  "subTitle.alignment": "Where the subtitle sits: left, centre or right.",
  "header.text":
    "The default header text for slicers. Every slicer shows this wording instead of the name of its own field, so it is usually best left out.",

  // Settings that point one visual at a particular bookmark, page or piece of
  // wording. In a theme every visual of the type would share it.
  "visualLink.type":
    "What happens when someone selects the visual, such as going back, opening a bookmark or moving to another page. This is usually set on individual visuals rather than in a theme.",
  "visualLink.bookmark":
    "The bookmark a visual opens when it is selected. In a theme, every visual of this type would open the same bookmark, so this is usually set on individual visuals instead.",
  "visualLink.navigationSection":
    "The page a visual takes people to when it is selected. In a theme, every visual of this type would go to the same page, so this is usually set on individual visuals instead.",
  "visualLink.drillthroughSection":
    "The drill-through page a visual opens when it is selected. In a theme, every visual of this type would open the same page, so this is usually set on individual visuals instead.",
  "visualLink.tooltip":
    "The wording shown when someone hovers over a visual that has an action. In a theme, every visual of this type would show the same wording, so this is usually set on individual visuals instead.",
  "visualTooltip.type":
    "Whether the tooltip is Power BI's standard tooltip or a report page you have designed as a tooltip.",
  "visualTooltip.section":
    "The report page used as the tooltip. In a theme, every visual of this type would use the same page, so this is usually set on individual visuals instead.",
  "visualHeaderTooltip.section":
    "The report page shown by the tooltip icon in the visual header. In a theme, every visual of this type would use the same page, so this is usually set on individual visuals instead.",
  "visualHeaderTooltip.text":
    "The wording shown by the tooltip icon in the visual header when no tooltip page is chosen. In a theme, every visual of this type would show the same wording, so this is usually set on individual visuals instead.",

  // The slicer's Data card: its style, then the selection a range slicer
  // starts with. The style is a sensible theme default; a starting selection
  // rarely is.
  "data.mode":
    "The slicer's style: a list, tiles, a dropdown, a single value, or a range such as Between, Before, After or Relative Date. Every slicer that has not been given its own style uses this one.",
  "data.numericStart":
    "The lowest number already selected when a slicer shows a range of numbers. In a theme, every such slicer would start with the same range, so this is usually set on individual slicers instead.",
  "data.numericEnd":
    "The highest number already selected when a slicer shows a range of numbers. In a theme, every such slicer would start with the same range, so this is usually set on individual slicers instead.",
  "data.startDate":
    "The first date already selected when a slicer shows a range of dates. In a theme, every such slicer would start with the same dates, so this is usually set on individual slicers instead.",
  "data.endDate":
    "The last date already selected when a slicer shows a range of dates. In a theme, every such slicer would start with the same dates, so this is usually set on individual slicers instead.",
  "data.relativeRange":
    "Whether a Relative Date slicer looks back (Last), ahead (Next) or at the current period (This).",
  "data.relativeDuration":
    "How many periods a Relative Date slicer covers, such as the 3 in \"last 3 months\".",
  "data.relativePeriod":
    "The unit a Relative Date slicer counts in, such as days, weeks, months or years.",
  "data.relativeTimePeriod":
    "The unit a Relative Time slicer counts in: minutes or hours.",
  "data.isInvertedSelectionMode":
    "Whether everything starts selected, so choosing an item leaves it out rather than adding it. Power BI turns this on when someone uses Select all.",

  "pageInformation.pageInformationName":
    "The page's name, shown on its tab. In a theme, every page would get the same name, so this is usually set on individual pages instead.",
  "pageInformation.pageInformationAltName":
    "Other names for the page, separated by commas, that Q&A recognises when people ask questions. These are usually set on individual pages rather than in a theme.",

  "dataPoint.showAllDataPoints":
    "Lists every data point in the Format pane's Data colors card, so each one can be given its own colour.",
  "sparklines.markers":
    "Which points on each sparkline get a marker, such as the highest, lowest, first or last, stored as a single number. This is easiest to pick in Power BI's Format pane and copy from there.",
  // The editor's text here was copied from the category label card.
  "wordWrap.show": "Controls whether long text wraps onto more lines instead of being cut off.",
};

/**
 * Editor descriptions rewritten word for word, where the original is correct
 * but written for a developer.
 */
const STUDIO_REWRITES = {
  "Which sides of the border are visible, encoded as a bitmask (0 = none, 15 = all sides).":
    "Which sides of the border are shown, as a number from 0 (no sides) to 15 (all four). The numbers in between pick particular sides, so this is easiest to choose in Power BI's Format pane and copy from there.",
};

/**
 * Microsoft descriptions copied from another setting, or too thin to help:
 * "Match the legend icon color ..." on a constant line's shading, "Select
 * color for data labels." on the colour of the labels' title line.
 */
function isWeakMicrosoft(text, propertyName) {
  if (/^Match the legend icon color/.test(text)) return propertyName !== "matchLineColor";
  if (/^Select color for data labels\.?$/.test(text)) return propertyName !== "color";
  // "Background color transparency." is also used for images and icons.
  if (/^Background color transparency\.?$/.test(text)) return !/background/i.test(propertyName);
  return /^(Border|Total toggle)\.?$/.test(text);
}

/**
 * Settings that belong to one visual (or page) in a report rather than to
 * every visual of a type: its position, its wording, the page or bookmark it
 * points at, a fixed axis range, a field it is bound to. A theme can set them,
 * but every visual of the type would then share the same value.
 *
 * Keyed by card, then setting; `true` covers the whole card.
 */
const PER_VISUAL = {
  general: ["x", "y", "z", "width", "height", "altText", "formatString", "imageUrl", "visualType1", "visualType2"],
  title: ["text"],
  subTitle: ["text"],
  header: ["text"],
  visualLink: true,
  visualTooltip: ["section", "type"],
  visualHeaderTooltip: ["section", "text"],
  data: ["numericStart", "numericEnd", "startDate", "endDate", "isInvertedSelectionMode"],
  dateRange: ["anchorDate"],
  pageInformation: true,
  legend: ["titleText"],
  categoryAxis: ["titleText", "start", "end"],
  valueAxis: ["titleText", "start", "end", "secTitleText", "secStart", "secEnd"],
  y2Axis: ["secTitleText", "secStart", "secEnd"],
  zoom: ["categoryMin", "categoryMax", "valueMin", "valueMax", "valueSecMin", "valueSecMax"],
  referenceLine: ["value", "displayName"],
  xAxisReferenceLine: ["value", "displayName"],
  y1AxisReferenceLine: ["value", "displayName"],
  axis: ["min", "max", "target"],
  mapControls: ["centerLatitude", "centerLongitude", "zoom", "zoomLevel", "heading", "pitch"],
  image: ["altText", "sourceUrl", "sourceFile", "sourceField", "imageUrl", "url", "image", "imageFile", "imageData"],
  cardImage: ["altText", "image", "imageUrl", "imageData"],
  icon: ["altText", "iconUrl", "icon"],
  shape: ["mapUrl"],
  referenceLayer: ["referenceLayerUrl"],
  tileLayer: ["tileLayerUrl", "northBounds", "southBounds", "eastBounds", "westBounds"],
  text: ["text"],
  bookmarks: ["bookmarkGroup", "selectedBookmark", "deselectionBookmark"],
  keyDrivers: ["targetValue", "numericTargetSelectedKind"],
  scorecard: ["scorecardId", "goalIds", "scorecardReference"],
  reportInfo: true,
  script: true,
  parameterMapping: true,
  hiddenProperties: true,
  userPrompt: true,
  columnWidth: true,
  columnFormatting: true,
  accessibility: ["altTextColumns", "rowWithReferenceText"],
  labels: ["dynamicLabelTitle", "dynamicLabelValue", "dynamicLabelDetail"],
  calloutValue: ["dynamicLabelValue"],
  dataPoint: ["fillRule"],
  referenceLabel: ["value"],
  referenceLabelDetail: ["detailValue"],
  values: ["expr"],
  anomalyDetection: ["BatchStart", "BatchEnd", "CategoryValue", "ExpectedHigh", "ExpectedLow", "ExpectedValue", "Value"],
  currentFrameIndex: true,
  personalizeVisual: ["perspectiveRef"],
};

function perVisualNote(cardId, propertyName, visualId) {
  const rule = PER_VISUAL[cardId];
  if (!rule || (rule !== true && !rule.includes(propertyName))) return undefined;
  if (visualId === "page") return "This is usually set on individual pages rather than in a theme.";
  return "This is usually set on individual visuals rather than in a theme.";
}

function propertyRecord(propertyName, propertySchema, pathParts, cardTitle = "theme", cardId = pathParts.at(-3)) {
  const resolved = resolveReference(propertySchema);
  const choices = collectChoices(propertySchema);
  const visualId = pathParts[0] === "visualStyles" ? pathParts[1] : undefined;
  const example = exampleValue(resolved, choices, { propertyName, cardId, visualId });
  const perVisual = perVisualNote(cardId, propertyName, visualId);
  const card = CARD_PHRASES[cardId]?.(visualId) ?? cardPhrase(cardTitle);
  const curated = CURATED[`${cardId}.${propertyName}`];
  const themeWording =
    THEME_WORDING[`${pathParts.at(-3)}.${propertyName}`] ??
    (curated ? fillTemplate(curated, card, visualId) : partDescription(propertyName, card, cardId, typeName(propertySchema)));
  const rawMicrosoft = themeWording ? undefined : propertySchema.description ?? resolved.description;
  const microsoftDescription = rawMicrosoft && !isWeakMicrosoft(rawMicrosoft, propertyName) ? rawMicrosoft : undefined;
  const original = microsoftDescription || themeWording ? undefined : themeStudioDescription(pathParts);
  const borrowed = original && (STUDIO_REWRITES[original] ?? original.replace(/\bdash cap\b/g, "shape of the dash ends"));
  const fallback = microsoftDescription
    ? undefined
    : themeWording ?? guideDescription(propertyName, propertySchema, cardTitle, card);
  // Theme Studio's editor wording is preferred, except where it was itself
  // generated mechanically and reads worse than the guide's own sentence.
  // Wording flagged as mechanical is dropped even with nothing to replace it:
  // no explanation reads better than "Whether the show all is turned on."
  const studioDescription = borrowed && !isWeakStudioDescription(borrowed) ? borrowed : undefined;
  const generatedDescription = microsoftDescription || studioDescription ? undefined : fallback;
  const description = tidySentence(
    microsoftDescription ?? studioDescription ?? generatedDescription ?? "No plain-language explanation is available yet.",
  );
  return {
    id: propertyName,
    title: propertySchema.title ?? resolved.title ?? friendlyName(propertyName),
    description:
      perVisual && !/\bindividual (visuals|slicers|pages)\b|best left out/.test(description)
        ? `${description} ${perVisual}`
        : description,
    ...(perVisual ? { perVisual: true } : {}),
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
    properties: sortProperties(
      Object.entries(properties).map(([propertyName, propertySchema]) =>
        propertyRecord(propertyName, propertySchema, [...scopePath, cardName, "0", propertyName], title),
      ),
    ),
  };
}

function cardsFromProperties(properties, scopePath, source) {
  return sortCards(
    Object.entries(properties ?? {})
      .filter(([cardName, cardSchema]) => cardName !== "*" && cardSchema?.items?.properties)
      .map(([cardName, cardSchema]) => cardRecord(cardName, cardSchema, scopePath, source)),
  );
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
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName], "theme basics", "themeBasics"),
    ),
  },
  {
    id: "paletteAndIcons",
    title: "Data palette and icons",
    source: "global",
    properties: paletteAndIcons.map((propertyName) =>
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName], "data palette and icons", "paletteAndIcons"),
    ),
  },
  {
    id: "themeColours",
    title: "Theme colours",
    source: "global",
    properties: themeColours.map((propertyName) =>
      propertyRecord(propertyName, schema.properties[propertyName], [propertyName], "theme colours", "themeColours"),
    ),
  },
  ...Object.keys(schema.properties.textClasses.properties).map((className) => ({
    id: `textClasses.${className}`,
    title: `Text class: ${friendlyName(className)}`,
    source: "global",
    properties: Object.entries(textClassDefinition.properties).map(([propertyName, propertySchema]) => {
      const title = `text class ${friendlyName(className).toLocaleLowerCase()}`;
      return propertyRecord(propertyName, propertySchema, ["textClasses", className, propertyName], title, `textClasses.${className}`);
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
