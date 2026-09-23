---
layout: home

hero:
  name: "Create Power BI themes with confidence"
  text: "A clear, practical guide to theme JSON"
  tagline: Start with a small working theme, copy useful recipes, and understand what each part changes—without needing to become a developer.
  actions:
    - theme: brand
      text: Create your first theme
      link: /start-here
    - theme: alt
      text: Browse all settings
      link: /reference/settings-catalogue
    - theme: alt
      text: See common recipes
      link: /recipes/colours
    - theme: alt
      text: Download a starter theme
      link: ./examples/minimal-theme.json

features:
  - title: Begin with something that works
    details: Download a small valid theme, change a few values and import it into Power BI Desktop.
  - title: Find settings quickly
    details: Learn the names Power BI uses for visuals and the most useful formatting options for each one.
  - title: Copy practical examples
    details: Use complete examples for colours, titles, charts, slicers, tables and matrices.
  - title: Understand the file
    details: See how the different parts fit together in plain English, with every layer explained.
---

## Who this guide is for

This guide is for anyone who wants to create or maintain a Power BI theme file.
You do not need to know how to code. If you can edit text carefully and follow
an example, you can build a useful theme.

It focuses on two questions:

1. **Where does this setting go in the file?**
2. **What will it change in a report?**

It does not try to document Power BI's hidden internal defaults. The aim is to
help you write clear, valid theme files of your own.

Need to look up a particular option? The
[complete settings catalogue](/reference/settings-catalogue) covers every
report, page and visual setting Power BI accepts in a theme, including where it
goes in the file, what kind of value it takes, and any choices or limits.

::: tip Prefer a visual editor?
[Theme Studio for Power BI](https://github.com/whippet-dev/power-bi-theme-studio)
can open, preview and edit theme JSON while preserving settings it does not
recognise.
:::
