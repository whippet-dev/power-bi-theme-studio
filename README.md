# Power BI Theme Studio

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

- Import a `.json` Power BI theme in the browser, or start from the bundled
  sample theme
- Five visuals — Card, Clustered bar chart, Line chart, Table, Slicer — each
  with a real, schema-accurate property registry (912 properties combined),
  pinned to Microsoft's published `reportThemeSchema-2.156.json`
  (`microsoft/powerbi-desktop-samples`)
- A left-hand rail to choose which visuals are on the canvas and which one
  previews large
- A master-detail property panel: pick a format-pane-style group (e.g. "Y
  axis", "Data labels"), then edit its properties in a detail view, clustered
  under sub-headings where a group is large enough to need them
- Shared "chrome" (title, subtitle, background, border) that every visual
  inherits from a theme-wide default, with a per-visual override that takes
  precedence — matching Power BI's own `visualStyles["*"]["*"]` /
  `visualStyles[type]["*"]` resolution
- Per-property "reset to theme default", with a dot marking any property the
  theme explicitly sets
- Preserve every unedited JSON property — including visual types this tool
  has no UI for — on export
- A clear error when an uploaded file is not valid JSON

The included `public/fixtures/starter-theme.json` is a small development
fixture, not a replacement for a full theme.

Not every one of the 912 properties is reflected in the small mock previews —
they all resolve, save, and export correctly regardless, but the previews
prioritize the properties with an obvious visual effect (colors, fonts,
show/hide) over deep or niche formatting options. See `PROJECT_OVERVIEW.md`
for the fuller architecture notes from this project's original handover.

## Your theme files

Save real or private themes under `themes/local/`. That folder is ignored by
Git and will not be pushed to GitHub. Put only sanitized, shareable themes in
`themes/examples/`.

## Project shape

```text
app/
  components/
    ThemeStudio.tsx        # import/export, editor state, visual visibility
    VisualRail.tsx          # left-hand visual picker
    VisualPreviews.tsx      # representative Card/Bar/Line/Table/Slicer previews
    PropertyEditor.tsx      # master-detail property panel
  lib/
    theme.ts                # parser, resolver, immutable updates, reset-to-default
    properties.ts            # shared property-definition engine + factories
    tableProperties.ts       # Table registry (73 properties)
    barChartProperties.ts    # Bar chart registry (291 properties)
    lineChartProperties.ts   # Line chart registry (430 properties)
    cardProperties.ts        # Card registry (19 properties)
    slicerProperties.ts      # Slicer registry (99 properties)
    chromeProperties.ts      # shared title/subtitle/background/border registry
  globals.css                # application and preview styling
  main.tsx                   # browser entry point
public/fixtures/
  starter-theme.json         # development theme
tests/
  static-output.test.mjs     # static build smoke test
  theme.test.ts               # parse/resolve/update-path tests
  properties.test.ts          # shared engine tests
  *Properties.test.ts          # one resolver test file per visual registry
```

## Deliberately deferred

- Full coverage of every Power BI visual type — five are supported; the rest
  of the ~45 visual-type buckets a real theme can contain round-trip
  untouched but have no dedicated UI.
- A handful of schema fields per visual that are complex nested objects,
  genuinely polymorphic types, or per-instance state (current filter
  selection, computed analytics results) rather than a stylistic default —
  each registry file documents its specific exclusions and why.
- Full preview fidelity — the mock previews prioritize properties with an
  obvious visual effect over deep/niche formatting options.
- Undo/redo, saved editing sessions, and collaboration.
- Pixel-perfect Power BI rendering.

## Deployment

`npm run build` produces a static `dist/` folder, including `index.html`, that
can be deployed directly to Cloudflare Pages.
