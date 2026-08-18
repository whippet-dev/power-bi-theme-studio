"use client";

import { useMemo, useRef, useState } from "react";
import {
  cloneStarterTheme,
  deleteThemeValue,
  mergeThemeOverBase,
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
import { hexWithAlpha } from "../lib/colorUtils";
import { resolveGlobalOptionsStyle } from "../lib/globalOptionsProperties";
import { resolveColumnChartStyle } from "../lib/columnChartProperties";
import { resolveImageStyle } from "../lib/imageProperties";
import { resolveLineChartStyle } from "../lib/lineChartProperties";
import { resolveMatrixStyle } from "../lib/matrixProperties";
import { resolvePageNavigatorStyle } from "../lib/pageNavigatorProperties";
import { resolvePieChartStyle } from "../lib/pieChartProperties";
import type { VisualSchemaKey } from "../lib/properties";
import { resolveShapeStyle } from "../lib/shapeProperties";
import { resolveSlicerStyle } from "../lib/slicerProperties";
import { resolveStackedBarChartStyle } from "../lib/stackedBarChartProperties";
import { resolveStackedColumnChartStyle } from "../lib/stackedColumnChartProperties";
import { resolveTableStyle } from "../lib/tableProperties";
import { resolveTextboxStyle } from "../lib/textboxProperties";
import { resolveTextClasses, resolveThemeColors } from "../lib/themeGlobalsProperties";
import { FilterPanePreview, PaletteLegend } from "./GlobalPreviews";
import { PropertyEditor } from "./PropertyEditor";
import { VisualGallery, type VisualKind } from "./VisualPreviews";
import { VisualRail } from "./VisualRail";

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

const ALL_VISUALS: VisualKind[] = [
  "card",
  "bar",
  "column",
  "stackedBar",
  "stackedColumn",
  "line",
  "table",
  "matrix",
  "pie",
  "slicer",
  "shape",
  "actionButton",
  "bookmarkNavigator",
  "pageNavigator",
  "textbox",
  "image",
];

/** The visual the studio opens on, and the only one on the canvas to start. */
const INITIAL_VISUAL: VisualKind = "bar";

export function ThemeStudio() {
  const [theme, setTheme] = useState<PowerBITheme>(() => cloneStarterTheme());
  const [selectedVisual, setSelectedVisual] = useState<VisualKind>(INITIAL_VISUAL);
  // Only the selected visual starts on the canvas. With all sixteen shown
  // the page opens as a wall of thumbnails, which buries the one being
  // edited and makes the effect of a change hard to see; the rail is
  // there to add more when they're wanted.
  const [visibility, setVisibility] = useState<Record<VisualKind, boolean>>(() => {
    const none = Object.fromEntries(ALL_VISUALS.map((visual) => [visual, false])) as Record<VisualKind, boolean>;
    return { ...none, [INITIAL_VISUAL]: true };
  });
  const [fileLabel, setFileLabel] = useState("Starter theme");
  const [message, setMessage] = useState<string | null>(null);
  // Both start visible; these are display-only preview toggles, not
  // theme state, so hiding them costs nothing to try and nothing is lost.
  const [showFilterPane, setShowFilterPane] = useState(true);
  const [showPaletteLegend, setShowPaletteLegend] = useState(true);
  // Which real Power BI base theme underlies every default this app shows
  // when the working theme itself is silent on a value — see baseThemes.ts.
  // Defaults to Classic 2026 (Power BI's own current default for new
  // reports), independent of what the *starter theme* (this app's own
  // from-scratch example) happens to set.
  const [baseThemeId, setBaseThemeId] = useState<BaseThemeId>(DEFAULT_BASE_THEME_ID);
  const fileInput = useRef<HTMLInputElement>(null);
  // Every resolver below reads from this, not the raw `theme` -- it's the
  // working theme layered on top of the selected base theme, so a value
  // the user never set still resolves to genuine Power BI base-theme data
  // instead of straight to this app's own hardcoded fallback. `theme`
  // itself (edited, exported, and used for "is this overridden?" checks)
  // stays exactly what the user wrote, never merged.
  const effectiveTheme = useMemo(() => mergeThemeOverBase(getBaseTheme(baseThemeId), theme), [theme, baseThemeId]);
  const resolved = useMemo(() => resolveTheme(effectiveTheme), [effectiveTheme]);
  const tableStyle = useMemo(() => resolveTableStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const barChartStyle = useMemo(() => resolveBarChartStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const columnChartStyle = useMemo(() => resolveColumnChartStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const stackedBarChartStyle = useMemo(() => resolveStackedBarChartStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const stackedColumnChartStyle = useMemo(
    () => resolveStackedColumnChartStyle(effectiveTheme, resolved),
    [effectiveTheme, resolved],
  );
  const lineChartStyle = useMemo(() => resolveLineChartStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const cardStyle = useMemo(() => resolveCardStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const slicerStyle = useMemo(() => resolveSlicerStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const matrixStyle = useMemo(() => resolveMatrixStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const pieChartStyle = useMemo(() => resolvePieChartStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const shapeStyle = useMemo(() => resolveShapeStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const actionButtonStyle = useMemo(() => resolveActionButtonStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const bookmarkNavigatorStyle = useMemo(
    () => resolveBookmarkNavigatorStyle(effectiveTheme, resolved),
    [effectiveTheme, resolved],
  );
  const pageNavigatorStyle = useMemo(() => resolvePageNavigatorStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const textboxStyle = useMemo(() => resolveTextboxStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const imageStyle = useMemo(() => resolveImageStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
  const chromeStyles = useMemo<Record<VisualKind, ResolvedChromeStyle>>(
    () => ({
      card: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.card, resolved),
      bar: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.bar, resolved),
      column: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.column, resolved),
      stackedBar: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.stackedBar, resolved),
      stackedColumn: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.stackedColumn, resolved),
      line: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.line, resolved),
      table: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.table, resolved),
      matrix: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.matrix, resolved),
      pie: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.pie, resolved),
      slicer: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.slicer, resolved),
      shape: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.shape, resolved),
      actionButton: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.actionButton, resolved),
      bookmarkNavigator: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.bookmarkNavigator, resolved),
      pageNavigator: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.pageNavigator, resolved),
      textbox: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.textbox, resolved),
      image: resolveChromeStyle(effectiveTheme, VISUAL_SCHEMA_KEY.image, resolved),
    }),
    [effectiveTheme, resolved],
  );
  // The shared default only (no visual-specific override blended in) — what
  // the "Theme" tab shows and edits, distinct from a single visual's fully
  // resolved chrome.
  const sharedChromeStyle = useMemo(() => resolveChromeStyle(effectiveTheme, "*", resolved), [effectiveTheme, resolved]);
  const globalOptionsStyle = useMemo(() => resolveGlobalOptionsStyle(effectiveTheme, resolved), [effectiveTheme, resolved]);
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

  const visibleVisuals = ALL_VISUALS.filter((kind) => visibility[kind]);

  const handleToggleVisible = (kind: VisualKind) => {
    setVisibility((current) => {
      const makingVisible = !current[kind];
      const visibleCount = ALL_VISUALS.filter((k) => current[k]).length;
      if (!makingVisible && visibleCount <= 1) return current; // at least one visual must stay on the canvas

      const next = { ...current, [kind]: makingVisible };
      if (makingVisible) {
        setSelectedVisual(kind);
      } else if (selectedVisual === kind) {
        const fallback = ALL_VISUALS.find((k) => k !== kind && next[k]);
        if (fallback) setSelectedVisual(fallback);
      }
      return next;
    });
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
    setTheme(cloneStarterTheme());
    setFileLabel("Starter theme");
    setMessage(null);
  };

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <span /><span /><span />
          </span>
          <span>
            <strong>Power BI</strong>
            <small>Theme Studio</small>
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
        <button className="text-button" type="button" onClick={resetTheme}>Reset starter</button>
      </div>

      {message && (
        <div className="error-banner" role="alert">
          <strong>Theme not loaded.</strong> {message}
        </div>
      )}

      <div className="studio-layout">
        <VisualRail
          visibility={visibility}
          selected={selectedVisual}
          onSelect={setSelectedVisual}
          onToggleVisible={handleToggleVisible}
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
              <span className="preview-badge">
                <span /> {visibleVisuals.length} on canvas
              </span>
            </div>
          </div>

          {/* The report surface: wallpaper (the area around the page),
              then the page itself, then the filter pane docked to its
              right — so page/report-level settings have somewhere to
              actually show up rather than only existing in the JSON. */}
          <div
            className="report-surface"
            style={{
              backgroundColor: hexWithAlpha(globalOptionsStyle.pageWallpaper.color, globalOptionsStyle.pageWallpaper.transparency),
            }}
          >
            <div
              className="report-page"
              style={{
                backgroundColor: hexWithAlpha(
                  globalOptionsStyle.pageBackground.color,
                  globalOptionsStyle.pageBackground.transparency,
                ),
                justifyContent: globalOptionsStyle.pageAlignment.verticalAlignment === "Middle" ? "center" : "flex-start",
              }}
            >
              <VisualGallery
                theme={resolved}
                rawTheme={theme}
                effectiveTheme={effectiveTheme}
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
                chromeStyles={chromeStyles}
                visibleVisuals={visibleVisuals}
                selected={selectedVisual}
                onSelect={setSelectedVisual}
              />
            </div>
            {showFilterPane && <FilterPanePreview globalOptions={globalOptionsStyle} theme={resolved} />}
          </div>

          {showPaletteLegend && <PaletteLegend theme={resolved} colors={themeColors} textClasses={textClasses} />}
        </section>

        <PropertyEditor
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
        <span>build {__COMMIT_HASH__}</span>
      </footer>
    </main>
  );
}
