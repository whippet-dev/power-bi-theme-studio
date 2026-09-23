---
title: Complete settings catalogue
description: Search the Microsoft Power BI report-theme schema by visual, setting, value type and JSON path.
outline: false
---

<script setup>
import SchemaExplorer from '../components/SchemaExplorer.vue'
</script>

# Complete settings catalogue

Use this catalogue when you know **what you want to format** but not what Power
BI calls it in theme JSON. Choose a visual or report area, then search using an
ordinary word such as “title”, “colour”, “axis” or “font”.

<div class="plain-language">
  <strong>What this catalogue tells you</strong>
  <p>It shows the setting name, where it belongs, the kind of value Power BI accepts, any listed choices or limits, and example JSON you can copy.</p>
</div>

<SchemaExplorer />

Descriptions supplied by Microsoft are shown as written. Where Microsoft has
not supplied one, the catalogue first reuses the wording already reviewed for
the Theme Studio editor, marked **Theme Studio guidance**. For settings the
editor does not yet model, it adds a conservative explanation marked
**Plain-English guide** only when the meaning is clear from the setting name,
card and value type. Ambiguous or data-dependent settings are left unexplained
rather than guessed.

## How to read the results

- **Card** is the section of Power BI's Format pane, such as `legend` or
  `categoryAxis`.
- **Property** is one setting inside that card, such as `show` or `fontSize`.
- `*` means “use this as the normal default”. It is not a placeholder you need
  to rename.
- `[0]` is shown as `0` in paths because each card contains a list. In a JSON
  file you write the square brackets exactly as shown in the examples.
- **Choice** means Power BI accepts one of the listed stored values. The friendly
  label beside it is what you may recognise from the Format pane.

Read [Values you can use](/property-values) for a gentler introduction to
booleans, numbers, colours and fill objects.

## Important limits

This reference is generated from Microsoft's authoritative report-theme JSON
schema. The schema says which structures Power BI Desktop accepts when it
imports a theme. It does **not** mean every setting will appear or have a visible
effect in every report.

A setting may also require:

- a particular field or measure to be added to the visual;
- a feature such as a title, marker or secondary axis to be turned on;
- a particular visual mode or interaction state;
- a more specific selector than the simple default shown in an example.

The catalogue deliberately does not guess about those conditions. Start with
the generated example, import the theme, and check the result with a suitable
visual and data setup.

## Schema version

This edition uses Microsoft's `reportThemeSchema-2.157.json` for Power BI
Desktop 2.157.x.x (August 2026, exploration version 5.76). Microsoft describes
these files as the schemas Power BI Desktop itself uses to validate imported
custom themes.

[View the authoritative Microsoft schema and version history](https://github.com/microsoft/powerbi-desktop-samples/tree/main/Report%20Theme%20JSON%20Schema)

Later Power BI releases may add settings. The version is shown prominently so
you can tell exactly what this catalogue covers.
