<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { withBase } from "vitepress";

type Choice = { value: unknown; label: string };
type SchemaProperty = {
  id: string;
  title: string;
  description: string;
  descriptionSource: "microsoft" | "theme-studio" | "guide" | "unavailable";
  path: string;
  type: string;
  choices?: Choice[];
  constraints?: string[];
  requiredFields?: string[];
  example?: unknown;
};
type Card = {
  id: string;
  title: string;
  description?: string;
  source: "common" | "visual" | "global";
  properties: SchemaProperty[];
};
type Scope = { id: string; title: string; cards: Card[] };
type Catalogue = {
  metadata: {
    schema: string;
    powerBiDesktopVersion: string;
    release: string;
    explorationVersion: string;
    source: string;
  };
  totals: { visualTypes: number; propertyOccurrences: number };
  topLevel: SchemaProperty[];
  topLevelCards: Card[];
  commonCards: Card[];
  globalScopes: Scope[];
  visuals: Scope[];
};

const catalogue = ref<Catalogue>();
const loadingError = ref("");
const selectedScope = ref("visual:clusteredColumnChart");
const query = ref("");
const valueType = ref("all");
const showCommon = ref(true);
const copiedPath = ref("");

onMounted(async () => {
  try {
    const response = await fetch(withBase("/schema/report-theme-2.157.catalogue.json"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalogue.value = await response.json();
  } catch (error) {
    loadingError.value = error instanceof Error ? error.message : String(error);
  }
});

const selectedVisual = computed(() => {
  if (!selectedScope.value.startsWith("visual:")) return undefined;
  return catalogue.value?.visuals.find(
    (visual) => visual.id === selectedScope.value.slice("visual:".length),
  );
});

const selectedGlobal = computed(() => {
  if (!selectedScope.value.startsWith("global:")) return undefined;
  return catalogue.value?.globalScopes.find(
    (scope) => scope.id === selectedScope.value.slice("global:".length),
  );
});

const availableCards = computed<Card[]>(() => {
  if (!catalogue.value) return [];
  if (selectedScope.value === "top-level") {
    return catalogue.value.topLevelCards;
  }
  if (selectedGlobal.value) return selectedGlobal.value.cards;
  if (!selectedVisual.value) return [];

  const common = showCommon.value
    ? catalogue.value.commonCards.map((card) => ({
        ...card,
        properties: card.properties.map((property) => ({
          ...property,
          path: property.path.replace("<visual name>", selectedVisual.value!.id),
        })),
      }))
    : [];
  const merged = new Map<string, Card>();
  for (const card of [...common, ...selectedVisual.value.cards]) {
    const existing = merged.get(card.id);
    if (!existing) {
      merged.set(card.id, card);
      continue;
    }
    const properties = new Map(existing.properties.map((property) => [property.id, property]));
    for (const property of card.properties) properties.set(property.id, property);
    merged.set(card.id, {
      ...existing,
      ...card,
      properties: [...properties.values()],
    });
  }
  return [...merged.values()];
});

const availableTypes = computed(() => {
  const types = new Set(availableCards.value.flatMap((card) => card.properties.map((property) => property.type)));
  return [...types].sort((left, right) => left.localeCompare(right));
});

const filteredCards = computed(() => {
  const words = query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return availableCards.value
    .map((card) => ({
      ...card,
      properties: card.properties.filter((property) => {
        if (valueType.value !== "all" && property.type !== valueType.value) return false;
        if (!words.length) return true;
        const haystack = [
          card.title,
          card.id,
          property.title,
          property.id,
          property.description,
          property.path,
          property.type,
          ...(property.choices?.flatMap((choice) => [choice.label, String(choice.value)]) ?? []),
        ].join(" ").toLocaleLowerCase();
        return words.every((word) => haystack.includes(word));
      }),
    }))
    .filter((card) => card.properties.length);
});

const resultCount = computed(() =>
  filteredCards.value.reduce((total, card) => total + card.properties.length, 0),
);

const scopeTitle = computed(() => {
  if (selectedScope.value === "top-level") return "Whole theme";
  return selectedVisual.value?.title ?? selectedGlobal.value?.title ?? "Settings";
});

function displayValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function exampleJson(card: Card, property: SchemaProperty) {
  if (property.example === undefined) return "";
  if (selectedScope.value === "top-level") {
    const nested = property.path.split(".").reduceRight<unknown>(
      (value, part) => ({ [part]: value }),
      property.example,
    );
    return JSON.stringify(nested, null, 2);
  }

  const scope = selectedVisual.value?.id ?? selectedGlobal.value?.id;
  if (!scope) return "";
  return JSON.stringify({
    visualStyles: {
      [scope]: {
        "*": {
          [card.id]: [{ [property.id]: property.example }],
        },
      },
    },
  }, null, 2);
}

async function copyExample(card: Card, property: SchemaProperty) {
  const example = exampleJson(card, property);
  if (!example) return;
  await navigator.clipboard.writeText(example);
  copiedPath.value = property.path;
  window.setTimeout(() => {
    if (copiedPath.value === property.path) copiedPath.value = "";
  }, 1600);
}
</script>

<template>
  <div class="schema-explorer">
    <p v-if="loadingError" class="schema-explorer__error" role="alert">
      The settings catalogue could not be loaded: {{ loadingError }}
    </p>
    <p v-else-if="!catalogue" class="schema-explorer__loading" aria-live="polite">
      Loading the settings catalogue…
    </p>

    <template v-else>
      <div class="schema-explorer__summary">
        <strong>{{ catalogue.metadata.schema }}</strong>
        <span>{{ catalogue.metadata.release }}</span>
        <span>{{ catalogue.totals.visualTypes }} visual types</span>
        <a :href="catalogue.metadata.source" target="_blank" rel="noreferrer">View Microsoft source ↗</a>
      </div>

      <div class="schema-explorer__controls">
        <label>
          <span>Where are you changing a setting?</span>
          <select v-model="selectedScope">
            <option value="top-level">Whole theme</option>
            <optgroup label="Report and page">
              <option
                v-for="scope in catalogue.globalScopes"
                :key="scope.id"
                :value="`global:${scope.id}`"
              >
                {{ scope.title }}
              </option>
            </optgroup>
            <optgroup label="Visual types">
              <option
                v-for="visual in catalogue.visuals"
                :key="visual.id"
                :value="`visual:${visual.id}`"
              >
                {{ visual.title }}
              </option>
            </optgroup>
          </select>
        </label>

        <label>
          <span>Search settings</span>
          <input
            v-model="query"
            type="search"
            placeholder="Try title, colour, axis or font…"
            autocomplete="off"
          />
        </label>

        <label>
          <span>Value type</span>
          <select v-model="valueType">
            <option value="all">All value types</option>
            <option v-for="type in availableTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>

        <label v-if="selectedVisual" class="schema-explorer__check">
          <input v-model="showCommon" type="checkbox" />
          <span>Include settings shared by all visuals</span>
        </label>
      </div>

      <div class="schema-explorer__result-heading" aria-live="polite">
        <div>
          <strong>{{ scopeTitle }}</strong>
          <span>{{ resultCount.toLocaleString() }} matching settings</span>
        </div>
        <button
          v-if="query || valueType !== 'all'"
          type="button"
          @click="query = ''; valueType = 'all'"
        >
          Clear filters
        </button>
      </div>

      <p v-if="!filteredCards.length" class="schema-explorer__empty">
        No settings match those filters. Try a shorter word or choose another value type.
      </p>

      <details
        v-for="card in filteredCards"
        :key="`${selectedScope}:${card.source}:${card.id}`"
        class="schema-card"
        :open="Boolean(query)"
      >
        <summary>
          <span>
            <strong>{{ card.title }}</strong>
            <code>{{ card.id }}</code>
          </span>
          <span class="schema-card__count">{{ card.properties.length }}</span>
        </summary>
        <p v-if="card.description" class="schema-card__description">{{ card.description }}</p>

        <article v-for="property in card.properties" :key="property.path" class="schema-property">
          <header>
            <div>
              <h3>{{ property.title }}</h3>
              <code>{{ property.id }}</code>
            </div>
            <span class="schema-property__type">{{ property.type }}</span>
          </header>
          <p>
            {{ property.description }}
            <span v-if="property.descriptionSource === 'theme-studio'" class="schema-property__description-source">
              Theme Studio guidance
            </span>
            <span v-if="property.descriptionSource === 'guide'" class="schema-property__description-source">
              Plain-English guide
            </span>
          </p>
          <dl>
            <div>
              <dt>JSON path</dt>
              <dd><code>{{ property.path }}</code></dd>
            </div>
            <div v-if="property.constraints?.length">
              <dt>Limits</dt>
              <dd>{{ property.constraints.join('; ') }}</dd>
            </div>
            <div v-if="property.requiredFields?.length">
              <dt>Required parts</dt>
              <dd>{{ property.requiredFields.join(', ') }}</dd>
            </div>
          </dl>
          <div v-if="property.choices?.length" class="schema-property__choices">
            <strong>Accepted values</strong>
            <span v-for="choice in property.choices" :key="displayValue(choice.value)">
              <code>{{ displayValue(choice.value) }}</code>
              <small v-if="choice.label !== displayValue(choice.value)">{{ choice.label }}</small>
            </span>
          </div>
          <details v-if="property.example !== undefined" class="schema-property__example">
            <summary>Example JSON</summary>
            <pre><code>{{ exampleJson(card, property) }}</code></pre>
            <button type="button" @click="copyExample(card, property)">
              {{ copiedPath === property.path ? 'Copied' : 'Copy example' }}
            </button>
          </details>
        </article>
      </details>
    </template>
  </div>
</template>
