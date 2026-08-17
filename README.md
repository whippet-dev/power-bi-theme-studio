# Power BI Theme Studio

A local, client-side visual editor for Power BI JSON themes. Import a theme,
see representative visuals update immediately, adjust a small set of shared
theme properties, and export the updated JSON.

## Stack

- React 19 and TypeScript for the editor UI and theme model
- Vite 8 through the lightweight vinext runtime
- Plain CSS for the previews and application shell
- No database, sign-in, or server-side theme processing

This keeps the first milestone small while leaving clear seams for a fuller
Power BI schema resolver, more preview types, and visual-specific controls.

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
`http://localhost:3000`.

To make a production build:

```powershell
npm run build
```

To run the checks:

```powershell
npm run lint
npm test
```

## First milestone

- Import a `.json` Power BI theme in the browser
- Resolve common theme tokens with safe preview fallbacks
- Preview a Card, Bar chart, Table, and Slicer using HTML and CSS
- Select a visual and edit shared colours and typography
- Preserve unedited JSON properties and export the updated theme
- Show a useful error when an uploaded file is not valid JSON

The included `public/fixtures/dwp-starter-theme.json` is a small development
fixture. It is not intended to replace the user's full theme.

## Your theme files

Save real or private themes under `themes/local/`. That folder is ignored by
Git and will not be pushed to GitHub. Put only sanitized, shareable themes in
`themes/examples/`.

## Project shape

```text
app/
  components/
    ThemeStudio.tsx       # import/export and editor state
    VisualPreviews.tsx    # hardcoded representative previews
    PropertyEditor.tsx    # first GUI controls
  lib/
    theme.ts              # parser, resolver, immutable updates
  globals.css             # application and preview styling
  page.tsx                # application route
public/fixtures/
  dwp-starter-theme.json  # development theme
tests/
  rendered-html.test.mjs  # production-render smoke test
```

## Deliberately deferred

The first version does not yet attempt full Power BI `visualStyles` schema
coverage, schema-version validation, undo/redo, direct selection of individual
chart parts, or pixel-perfect Power BI rendering. Those belong in later,
separately testable milestones.
