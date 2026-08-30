# Theme Studio for Power BI

> **An unofficial community project.** Theme Studio is not affiliated with,
> endorsed by, or supported by Microsoft. "Power BI" is a trademark of
> Microsoft Corporation and is used here only to describe the theme file
> format this tool reads and writes.

A local, client-side editor for Power BI JSON theme files. Import a theme, see
representative visuals update immediately, edit real per-visual formatting
properties (not just a handful of shared tokens), and export the updated JSON
with everything else preserved untouched.

## Stack

- React 19 and TypeScript for the editor UI and theme model
- Vite 8 for a standard static single-page application build
- Plain CSS for the previews and application shell
- No database, sign-in, or server-side theme processing

## What you need on Windows

- Node.js 22.13 or newer (the current Node.js LTS release is suitable)
- npm, which is included with Node.js
- Git is useful but not required just to run the app

Check Node and npm from PowerShell:

```powershell
node --version
npm --version
```

## Run locally

From this project folder in PowerShell:

```powershell
npm install
npm run dev
```

Open the local address printed in the terminal, normally
`http://localhost:5173`.

To make a production build:

```powershell
npm run build
```

To run the checks:

```powershell
npm run lint
npm test
```

## What it does

- Import a `.json` Power BI theme in the browser, or start with a clean New
  theme that inherits from the selected Power BI base theme
- **16 visuals** — Card, Clustered bar, Clustered column, Stacked bar, Stacked
  column, Line, Table, Matrix, Pie, Slicer, Shape, Action button, Bookmark
  navigator, Page navigator, Textbox and Image — each with a real,
  schema-accurate property registry, pinned to Microsoft's published
  `reportThemeSchema-2.156.json` (`microsoft/powerbi-desktop-samples`).
  Roughly **2,538 property definitions** across the visual registries, shared
  chrome, report/page options and theme globals.
- **Base themes.** Pick which Power BI base theme supplies the defaults your
  theme sits on top of — Classic 2018 (`CY18SU07`), Classic 2026 (`CY26SU07`)
  or Fluent 2 (`Fluent2-CY26SU07`), all extracted from a real Power BI Desktop
  installation and stored in `themes/base/`. Anything your theme does not set
  is inherited from the selected base rather than from this tool's guesses.
- A left-hand rail to choose which visuals are on the canvas and which one
  previews large
- A master-detail property panel: pick a format-pane-style group (e.g. "Y
  axis", "Data labels"), then edit its properties in a detail view, clustered
  under sub-headings where a group is large enough to need them
- Per-interaction-state editing (`default` / `hover` / `selected` / `disabled`)
  for buttons and navigators, plus `Applied` / `Available` filter cards
- Report- and page-level global options, theme-wide semantic colours, and the
  14 `textClasses` typography classes
- Shared "chrome" (title, subtitle, background, border, and 11 further groups)
  that every visual inherits, with per-visual overrides taking precedence
- Per-property "reset to theme default", with a dot marking any property the
  theme explicitly sets
- Preserve every unedited JSON property — including visual types this tool
  has no UI for — on export
- A clear error when an uploaded file is not valid JSON

The included `public/fixtures/new-theme.json` is a minimal development
fixture, not a replacement for a full theme.

Not every property is reflected in the small mock previews — they all resolve,
save, and export correctly regardless, but the previews prioritise the
properties with an obvious visual effect (colours, fonts, show/hide) over deep
or niche formatting options. See `PROJECT_OVERVIEW.md` for architecture notes
and `CODEX_HANDOVER.md` if you are picking this repository up.

## How resolution works

Understanding this is the difference between a small change landing correctly
and landing silently wrong. It is covered properly in `PROJECT_OVERVIEW.md`;
the short version:

- **Your theme and the base theme are separate layers, never merged for
  `visualStyles`.** Power BI considers *every* custom-theme match before *any*
  base-theme match, so a custom wildcard value outranks a base visual-specific
  one. Merging first would destroy the layer distinction that ordering depends
  on.
- **Resolution reports provenance,** not just a value:
  `{ value, source, isSet }`. `isSet` is what distinguishes an explicit
  `false`/`0`/`""` from a property nobody set.
- **Per-state entries are matched by `$id`, per layer** — never by array
  position. Two themes need not declare the same states, in the same order,
  or at all.
- **Your theme is stored exactly as you wrote it** and is never normalised or
  reconstructed. Export writes back what you imported, plus your edits.

## Your theme files

Save real or private themes under `themes/local/`. That folder is ignored by
Git and will not be pushed to GitHub. Put only sanitized, shareable themes in
`themes/examples/`. Base themes live in `themes/base/` and are reference data —
treat them as read-only.

## Project shape

```text
app/
  components/
    ThemeStudio.tsx           # import/export, editor state, base-theme selection
    VisualRail.tsx             # left-hand visual picker
    VisualPreviews.tsx         # the 16 visual previews
    GlobalPreviews.tsx         # filter pane and colour-reference previews
    PropertyEditor.tsx         # master-detail property panel
    ChartParts.tsx             # shared axis/legend/label chart primitives
  lib/
    theme.ts                   # parser, resolver, immutable updates, merge
    properties.ts              # resolution engine: layers, provenance, $id
    baseThemes.ts              # the three bundled Power BI base themes
    <visual>Properties.ts      # one registry per visual
    chromeProperties.ts        # shared cross-visual groups
    globalOptionsProperties.ts # report/page-level options
    themeGlobalsProperties.ts  # semantic colours + textClasses
    colorUtils.ts              # transparency + ThemeDataColor tint/shade
    shapeGeometry.ts           # 22 shape paths
    lineGeometry.ts            # line/area/marker paths
  globals.css                  # application and preview styling
  main.tsx                     # browser entry point
themes/base/                   # Classic 2018/2026 + Fluent 2, from PBI Desktop
public/fixtures/
  new-theme.json               # minimal development theme
tests/                         # 206 tests; discovered by glob
```

## Deliberately deferred

- Style presets. A theme's named preset buckets (`visualStyles[type][preset]`)
  round-trip untouched but are not read or selectable.
- Full coverage of every Power BI visual type — 16 are supported; the rest of
  the ~45 visual-type buckets a real theme can contain round-trip untouched
  but have no dedicated UI.
- A handful of schema fields per visual that are complex nested objects,
  genuinely polymorphic types, or per-instance state (current filter
  selection, computed analytics results) rather than a stylistic default —
  each registry file documents its specific exclusions and why.
- Full preview fidelity — the mock previews prioritise properties with an
  obvious visual effect over deep/niche formatting options.
- Undo/redo, saved editing sessions, and collaboration.
- Pixel-perfect Power BI rendering.

## Deployment

`npm run build` produces a static `dist/` folder, including `index.html`, that
can be deployed directly to Cloudflare Pages.
