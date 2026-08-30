"use client";

import { useMemo, useRef, useState } from "react";
import {
  cloneNewTheme,
  deleteThemeValue,
  parseThemeJson,
  resolveTheme,
  themeFileName,
  updateThemeValue,
  type JsonValue,
  type PowerBITheme,
} from "../lib/theme";
import { BASE_THEMES, DEFAULT_BASE_THEME_ID, getBaseTheme, type BaseThemeId } from "../lib/baseThemes";
import { resolveBarChartStyle } from "../lib/barChartProperties";
import { resolveCardStyle } from "../lib/cardProperties";
import { resolveChromeStyle, type ResolvedChromeStyle } from "../lib/chromeProperties";
import { resolveActionButtonStyle } from "../lib/actionButtonProperties";
import { resolveBookmarkNavigatorStyle } from "../lib/bookmarkNavigatorProperties";
import { resolveGlobalOptionsStyle } from "../lib/globalOptionsProperties";
import { resolveColumnChartStyle } from "../lib/columnChartProperties";
import { resolveImageStyle } from "../lib/imageProperties";
import { resolveLineChartStyle } from "../lib/lineChartProperties";
import { resolveMatrixStyle } from "../lib/matrixProperties";
import { resolvePageNavigatorStyle } from "../lib/pageNavigatorProperties";
import { resolvePieChartStyle } from "../lib/pieChartProperties";
import { themeLayers, type InteractionState, type VisualSchemaKey } from "../lib/properties";
import { resolveShapeStyle } from "../lib/shapeProperties";
import { resolveSlicerStyle } from "../lib/slicerProperties";
import { resolveStackedBarChartStyle } from "../lib/stackedBarChartProperties";
import { resolveStackedColumnChartStyle } from "../lib/stackedColumnChartProperties";
import { resolveTableStyle } from "../lib/tableProperties";
import { resolveTextboxStyle } from "../lib/textboxProperties";
import { resolveTextClasses, resolveThemeColors } from "../lib/themeGlobalsProperties";
import { PaletteLegend } from "./GlobalPreviews";
import { PropertyEditor } from "./PropertyEditor";
import { VisualGallery } from "./VisualPreviews";
import { PreviewInspector } from "./PreviewInspector";
import { VisualRail } from "./VisualRail";
import { ALL_VISUALS, DEFAULT_HERO_VISUAL, VISUAL_LABEL, type VisualKind } from "./visualCatalog";

// Maps this app's UI visual identifiers to the schema's real visual-type
// keys, so chrome (title/subtitle/background/border) resolves per visual.
const VISUAL_SCHEMA_KEY: Record<VisualKind, VisualSchemaKey> = {
  card: "card",
  bar: "clusteredBarChart",
  column: "clusteredColumnChart",
  stackedBar: "barChart",
  stackedColumn: "columnChart",
  line: "lineChart",
  table: "tableEx",
  matrix: "pivotTable",
  pie: "pieChart",
  slicer: "slicer",
  shape: "shape",
  actionButton: "actionButton",
  bookmarkNavigator: "bookmarkNavigator",
  pageNavigator: "pageNavigator",
  textbox: "textbox",
  image: "image",
};

const AUTHORED_HERO_DIMENSIONS: Partial<Record<VisualKind, string>> = {
  bar: "450 × 250",
  stackedBar: "450 × 250",
  column: "450 × 300",
  stackedColumn: "450 × 300",
  line: "450 × 300",
};

export function ThemeStudio() {
  const [theme, setTheme] = useState<PowerBITheme>(() => cloneNewTheme());
  const [selectedVisual, setSelectedVisual] = useState<VisualKind>(DEFAULT_HERO_VISUAL);
  const [fileLabel, setFileLabel] = useState("New theme");
  const [message, setMessage] = useState<string | null>(null);
  // Both start visible; these are display-only preview toggles, not
  // theme state, so hiding them costs nothing to try and nothing is lost.
  const [showFilterPane, setShowFilterPane] = useState(true);
  const [showPaletteLegend, setShowPaletteLegend] = useState(true);
  const [oneToOneHero, setOneToOneHero] = useState(false);
  // Which real Power BI base theme underlies every default this app shows
  // when the working theme itself is silent on a value — see baseThemes.ts.
  // Defaults to Classic 2026 (Power BI's own current default for new
  // reports), independently of the user-authored working theme.
  const [baseThemeId, setBaseThemeId] = useState<BaseThemeId>(DEFAULT_BASE_THEME_ID);
  const fileInput = useRef<HTMLInputElement>(null);
  // Resolution reads the user's theme and the base theme as separate
  // layers, so it can report *which* layer supplied each value — see
  // resolvePropertyEntry. Merging them first would both lose that and get
  // the precedence wrong, since Power BI ranks every custom match above
  // every base match. `theme` itself — edited, exported, and used for
  // "is this overridden?" checks — stays exactly what the user wrote.
  const themeSource = useMemo(() => themeLayers(theme, getBaseTheme(baseThemeId)), [theme, baseThemeId]);
  // Root-level tokens, dataColors and textClasses genuinely do merge
  // custom-over-base; that combined view is what `roots` carries.
  const effectiveTheme = themeSource.roots;
  const resolved = useMemo(() => resolveTheme(effectiveTheme), [effectiveTheme]);
  const tableStyle = useMemo(() => resolveTableStyle(themeSource, resolved), [themeSource, resolved]);
  const barChartStyle = useMemo(() => resolveBarChartStyle(themeSource, resolved), [themeSource, resolved]);
  const columnChartStyle = useMemo(() => resolveColumnChartStyle(themeSource, resolved), [themeSource, resolved]);
  const stackedBarChartStyle = useMemo(() => resolveStackedBarChartStyle(themeSource, resolved), [themeSource, resolved]);
  const stackedColumnChartStyle = useMemo(
    () => resolveStackedColumnChartStyle(themeSource, resolved),
    [themeSource, resolved],
  );
  const lineChartStyle = useMemo(() => resolveLineChartStyle(themeSource, resolved), [themeSource, resolved]);
  const cardStyle = useMemo(() => resolveCardStyle(themeSource, resolved), [themeSource, resolved]);
  const slicerStyle = useMemo(() => resolveSlicerStyle(themeSource, resolved), [themeSource, resolved]);
  const matrixStyle = useMemo(() => resolveMatrixStyle(themeSource, resolved), [themeSource, resolved]);
  const pieChartStyle = useMemo(() => resolvePieChartStyle(themeSource, resolved), [themeSource, resolved]);
  const shapeStyle = useMemo(() => resolveShapeStyle(themeSource, resolved), [themeSource, resolved]);
  const actionButtonStyle = useMemo(() => resolveActionButtonStyle(themeSource, resolved), [themeSource, resolved]);
  const bookmarkNavigatorStyle = useMemo(
    () => resolveBookmarkNavigatorStyle(themeSource, resolved),
    [themeSource, resolved],
  );
  const pageNavigatorStyle = useMemo(() => resolvePageNavigatorStyle(themeSource, resolved), [themeSource, resolved]);

  // Action button, Bookmark navigator, and Page navigator style differently
  // per interaction state ($id: default/hover/selected/disabled — see
  // STATEFUL_GROUPS in properties.ts). The property panel already lets each
  // state be edited blind; this lets the hero preview actually show what
  // each one looks like, re-resolving from the raw theme at the chosen
  // state rather than always rendering "default".
  //
  // Resolution lives here rather than in the renderer so VisualGallery
  // receives values that are already resolved and never touches theme JSON
  // itself. The `selectedVisual === …` guard is what keeps thumbnails on
  // the default state: a visual is only ever the hero *or* a thumbnail, so
  // guarding on selection means only the hero picks up the chosen state.
  // The unguarded styles above still go to the property panel unchanged.
  // Which interaction state the hero RENDERS. Distinct from PropertyEditor's
  // own `interactionState`, which selects the `$id` entry being edited — see
  // the note there. Kept separate on purpose.
  const [previewInteractionState, setPreviewInteractionState] = useState<InteractionState>("default");
  // Mirrors which formatting group the property panel has open, so the
  // supporting region can show only the specimen that group needs. The
  // panel still owns the state; this is a read-only copy for the preview.
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const heroActionButtonStyle = useMemo(
    () =>
      selectedVisual === "actionButton"
        ? resolveActionButtonStyle(themeSource, resolved, previewInteractionState)
        : actionButtonStyle,
    [selectedVisual, themeSource, resolved, previewInteractionState, actionButtonStyle],
  );
  const heroBookmarkNavigatorStyle = useMemo(
    () =>
      selectedVisual === "bookmarkNavigator"
        ? resolveBookmarkNavigatorStyle(themeSource, resolved, previewInteractionState)
        : bookmarkNavigatorStyle,
    [selectedVisual, themeSource, resolved, previewInteractionState, bookmarkNavigatorStyle],
  );
  const heroPageNavigatorStyle = useMemo(
    () =>
      selectedVisual === "pageNavigator"
        ? resolvePageNavigatorStyle(themeSource, resolved, previewInteractionState)
        : pageNavigatorStyle,
    [selectedVisual, themeSource, resolved, previewInteractionState, pageNavigatorStyle],
  );

  const textboxStyle = useMemo(() => resolveTextboxStyle(themeSource, resolved), [themeSource, resolved]);
  const imageStyle = useMemo(() => resolveImageStyle(themeSource, resolved), [themeSource, resolved]);
  const chromeStyles = useMemo<Record<VisualKind, ResolvedChromeStyle>>(
    () => ({
      card: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.card, resolved),
      bar: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.bar, resolved),
      column: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.column, resolved),
      stackedBar: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.stackedBar, resolved),
      stackedColumn: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.stackedColumn, resolved),
      line: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.line, resolved),
      table: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.table, resolved),
      matrix: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.matrix, resolved),
      pie: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.pie, resolved),
      slicer: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.slicer, resolved),
      shape: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.shape, resolved),
      actionButton: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.actionButton, resolved),
      bookmarkNavigator: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.bookmarkNavigator, resolved),
      pageNavigator: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.pageNavigator, resolved),
      textbox: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.textbox, resolved),
      image: resolveChromeStyle(themeSource, VISUAL_SCHEMA_KEY.image, resolved),
    }),
    [themeSource, resolved],
  );
  // The shared default only (no visual-specific override blended in) — what
  // the "Theme" tab shows and edits, distinct from a single visual's fully
  // resolved chrome.
  const sharedChromeStyle = useMemo(() => resolveChromeStyle(themeSource, "*", resolved), [themeSource, resolved]);
  const globalOptionsStyle = useMemo(() => resolveGlobalOptionsStyle(themeSource, resolved), [themeSource, resolved]);
  const themeColors = useMemo(() => resolveThemeColors(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const textClasses = useMemo(() => resolveTextClasses(effectiveTheme, resolved), [effectiveTheme, resolved]);

  const handleImport = async (file: File | undefined) => {
    if (!file) return;

    try {
      const imported = parseThemeJson(await file.text());
      setTheme(imported);
      setFileLabel(file.name);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The theme could not be loaded.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleChange = (path: Array<string | number>, value: string | number | boolean) => {
    setTheme((current) => updateThemeValue(current, path, value as JsonValue));
    setMessage(null);
  };

  const handleReset = (path: Array<string | number>) => {
    setTheme((current) => deleteThemeValue(current, path));
    setMessage(null);
  };

  const handleExport = () => {
    const blob = new Blob([`${JSON.stringify(theme, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = themeFileName(resolved.name);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetTheme = () => {
    setTheme(cloneNewTheme());
    setFileLabel("New theme");
    setMessage(null);
  };

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="brand">
          {/* A stack of theme swatches — this project's own mark. Deliberately
              shares no geometry with any Power BI or Microsoft icon. */}
          <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect x="2" y="2" width="16" height="16" rx="4" fill="#6B4DAB" />
            <rect x="8" y="8" width="16" height="16" rx="4" fill="#9B7FE0" />
            <rect x="14" y="14" width="16" height="16" rx="4" fill="#DED1FA" />
          </svg>
          <span title="Theme Studio is an unofficial community project. It is not affiliated with, endorsed by, or supported by Microsoft.">
            <strong>Theme Studio</strong>
            <small>for Power BI</small>
          </span>
        </div>

        <div className="topbar__actions">
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept=".json,application/json"
            onChange={(event) => handleImport(event.target.files?.[0])}
          />
          <button
            className="button button--secondary"
            type="button"
            onClick={() => fileInput.current?.click()}
          >
            <span aria-hidden="true">↑</span> Import theme
          </button>
          <button className="button button--primary" type="button" onClick={handleExport}>
            Export JSON <span aria-hidden="true">↓</span>
          </button>
        </div>
      </header>

      <div className="project-bar">
        <div className="project-bar__title">
          <span className="status-dot" />
          <span>{resolved.name}</span>
          <span className="project-bar__file">{fileLabel}</span>
        </div>
        <label className="base-theme-picker">
          <span>Base theme</span>
          <select
            value={baseThemeId}
            onChange={(event) => setBaseThemeId(event.target.value as BaseThemeId)}
            title="Every default this preview falls back to, when your theme doesn't set a value itself, comes from whichever Power BI base theme is selected here."
          >
            {BASE_THEMES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <button className="text-button" type="button" onClick={resetTheme}>Reset theme</button>
      </div>

      {message && (
        <div className="error-banner" role="alert">
          <strong>Theme not loaded.</strong> {message}
        </div>
      )}

      <div className="studio-layout">
        <VisualRail
          selected={selectedVisual}
          onSelect={setSelectedVisual}
        />

        <section className="canvas-panel" aria-labelledby="gallery-title">
          <div className="canvas-panel__intro">
            <div>
              <span className="eyebrow">Live canvas</span>
              <h1 id="gallery-title">Visual gallery</h1>
              <p>Pick visuals on the left, then tune their settings on the right. The selected visual previews large.</p>
            </div>
            <div className="canvas-panel__toggles">
              <label className="canvas-toggle">
                <input type="checkbox" checked={showFilterPane} onChange={(event) => setShowFilterPane(event.target.checked)} />
                Filter pane
              </label>
              <label className="canvas-toggle">
                <input type="checkbox" checked={showPaletteLegend} onChange={(event) => setShowPaletteLegend(event.target.checked)} />
                Colour reference
              </label>
              <label className="canvas-toggle">
                <input type="checkbox" checked={oneToOneHero} onChange={(event) => setOneToOneHero(event.target.checked)} />
                1:1 preview{oneToOneHero && AUTHORED_HERO_DIMENSIONS[selectedVisual] ? ` (${AUTHORED_HERO_DIMENSIONS[selectedVisual]})` : ""}
              </label>
              <span className="preview-badge">
                <span /> {ALL_VISUALS.length} previews
              </span>
            </div>
          </div>

          {/* The canvas composition now lives in VisualGallery, which owns the
              order: simulated report page (hero only), then Studio supporting
              content, then the thumbnail gallery. The inspector is passed in
              as a slot so it can sit between the two without VisualGallery
              needing to know what supporting content is. Keyed by the
              selection so its local view state resets with the visual. */}
          <VisualGallery
            theme={resolved}
            tableStyle={tableStyle}
            barChartStyle={barChartStyle}
            columnChartStyle={columnChartStyle}
            stackedBarChartStyle={stackedBarChartStyle}
            stackedColumnChartStyle={stackedColumnChartStyle}
            lineChartStyle={lineChartStyle}
            cardStyle={cardStyle}
            slicerStyle={slicerStyle}
            matrixStyle={matrixStyle}
            pieChartStyle={pieChartStyle}
            shapeStyle={shapeStyle}
            actionButtonStyle={heroActionButtonStyle}
            bookmarkNavigatorStyle={heroBookmarkNavigatorStyle}
            pageNavigatorStyle={heroPageNavigatorStyle}
            textboxStyle={textboxStyle}
            imageStyle={imageStyle}
            chromeStyles={chromeStyles}
            selected={selectedVisual}
            oneToOneHero={oneToOneHero}
            onSelect={setSelectedVisual}
            globalOptionsStyle={globalOptionsStyle}
            showFilterPane={showFilterPane}
            supporting={
              <PreviewInspector
                key={selectedVisual}
                selected={selectedVisual}
                label={VISUAL_LABEL[selectedVisual]}
                chrome={chromeStyles[selectedVisual]}
                previewInteractionState={previewInteractionState}
                onPreviewInteractionStateChange={setPreviewInteractionState}
                openGroupId={openGroupId}
              />
            }
          />

          {showPaletteLegend && <PaletteLegend theme={resolved} colors={themeColors} textClasses={textClasses} />}
        </section>

        <PropertyEditor
          onOpenGroupChange={setOpenGroupId}
          theme={theme}
          resolved={resolved}
          tableStyle={tableStyle}
          barChartStyle={barChartStyle}
          columnChartStyle={columnChartStyle}
          stackedBarChartStyle={stackedBarChartStyle}
          stackedColumnChartStyle={stackedColumnChartStyle}
          lineChartStyle={lineChartStyle}
          cardStyle={cardStyle}
          slicerStyle={slicerStyle}
          matrixStyle={matrixStyle}
          pieChartStyle={pieChartStyle}
          shapeStyle={shapeStyle}
          actionButtonStyle={actionButtonStyle}
          bookmarkNavigatorStyle={bookmarkNavigatorStyle}
          pageNavigatorStyle={pageNavigatorStyle}
          textboxStyle={textboxStyle}
          imageStyle={imageStyle}
          chromeStyle={chromeStyles[selectedVisual]}
          sharedChromeStyle={sharedChromeStyle}
          globalOptionsStyle={globalOptionsStyle}
          activeVisualSchemaKey={VISUAL_SCHEMA_KEY[selectedVisual]}
          selected={selectedVisual}
          onChange={handleChange}
          onReset={handleReset}
        />
      </div>

      <footer className="build-footer">
        <span>
          An unofficial community project by Whippet Dev. Not affiliated with Microsoft.
        </span>
        <span>build {__COMMIT_HASH__}</span>
      </footer>
    </main>
  );
}
