---
title: Complete settings catalogue
description: Search the Microsoft Power BI report-theme schema by visual, setting, value type and JSON path.
outline: false
---

<script setup>
import SchemaExplorer from '../components/SchemaExplorer.vue'
</script>

# Complete settings catalogue

Use this catalogue when you know **what you want to change** but not what Power
BI calls it in a theme file. Choose a visual or report area, then search using an
ordinary word such as “title”, “colour”, “axis” or “font”.

<div class="plain-language">
  <strong>What this catalogue tells you</strong>
  <p>It shows the setting's name, where it goes in the file, the kind of value Power BI accepts, any choices or limits, and an example you can copy.</p>
</div>

<SchemaExplorer />

Where Microsoft describes a setting, its wording is shown as written. Where it
does not, the catalogue gives a short explanation of its own, but only when the
meaning is clear. Settings whose purpose is not clear are left unexplained
rather than guessed at.

## How to read the results

- Each result belongs to a **card**: a section of Power BI's Format pane, such
  as `legend` or `categoryAxis`. The setting's own name, such as `show` or
  `fontSize`, appears under its title.
- **Where it goes** shows the steps to follow through the file to reach the
  setting, for example `visualStyles › lineChart › * › legend › show`.
- The `*` step means "the normal style". Type it exactly as shown; it is not a
  placeholder you need to rename.
- **Choice** means you pick from a list. Type the value exactly as shown, with
  the same capital letters. The name beside it is what you may recognise from
  the Format pane.
- **Example JSON** shows the setting in place, with every bracket you need.
  Copying the example is the easiest way to get it right.

Read [Values you can use](/property-values) for a gentler introduction to
on/off values, numbers, text and colours.

## Important limits

This catalogue is built from Microsoft's official list of theme settings, the
same list Power BI Desktop uses to check a theme when you import it. So every
setting here is one Power BI will **accept**. That does **not** mean every setting
will appear or have a visible effect in every report.

A setting may also require:

- a particular field or measure to be added to the visual;
- a feature such as a title, marker or secondary axis to be turned on;
- a particular visual mode, or a state such as when someone hovers over it.

The catalogue does not try to guess those conditions. Copy the example, import
your theme, and check the result on a visual with suitable data.

## Schema version

This edition covers **Power BI Desktop version 2.157** (August 2026). It is
built from Microsoft's file `reportThemeSchema-2.157.json`.

[See Microsoft's original files and earlier versions](https://github.com/microsoft/powerbi-desktop-samples/tree/main/Report%20Theme%20JSON%20Schema)

Later versions of Power BI may add settings that are not listed here yet.
