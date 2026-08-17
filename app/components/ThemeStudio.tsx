"use client";

import { useMemo, useRef, useState } from "react";
import {
  cloneStarterTheme,
  deleteThemeValue,
  parseThemeJson,
  resolveTheme,
  themeFileName,
  updateThemeValue,
  type JsonValue,
  type PowerBITheme,
} from "../lib/theme";
import { resolveBarChartStyle } from "../lib/barChartProperties";
import { resolveCardStyle } from "../lib/cardProperties";
import { resolveChromeStyle, type ResolvedChromeStyle } from "../lib/chromeProperties";
import type { VisualSchemaKey } from "../lib/properties";
import { resolveSlicerStyle } from "../lib/slicerProperties";
import { resolveTableStyle } from "../lib/tableProperties";
import { PropertyEditor } from "./PropertyEditor";
import { VisualGallery, type VisualKind } from "./VisualPreviews";
import { VisualRail } from "./VisualRail";

// Maps this app's UI visual identifiers to the schema's real visual-type
// keys, so chrome (title/subtitle/background/border) resolves per visual.
const VISUAL_SCHEMA_KEY: Record<VisualKind, VisualSchemaKey> = {
  card: "card",
  bar: "clusteredBarChart",
  table: "tableEx",
  slicer: "slicer",
};

const ALL_VISUALS: VisualKind[] = ["card", "bar", "table", "slicer"];

export function ThemeStudio() {
  const [theme, setTheme] = useState<PowerBITheme>(() => cloneStarterTheme());
  const [selectedVisual, setSelectedVisual] = useState<VisualKind>("bar");
  const [visibility, setVisibility] = useState<Record<VisualKind, boolean>>({
    card: true,
    bar: true,
    table: true,
    slicer: true,
  });
  const [fileLabel, setFileLabel] = useState("Starter theme");
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const resolved = useMemo(() => resolveTheme(theme), [theme]);
  const tableStyle = useMemo(() => resolveTableStyle(theme, resolved), [theme, resolved]);
  const barChartStyle = useMemo(() => resolveBarChartStyle(theme, resolved), [theme, resolved]);
  const cardStyle = useMemo(() => resolveCardStyle(theme, resolved), [theme, resolved]);
  const slicerStyle = useMemo(() => resolveSlicerStyle(theme, resolved), [theme, resolved]);
  const chromeStyles = useMemo<Record<VisualKind, ResolvedChromeStyle>>(
    () => ({
      card: resolveChromeStyle(theme, VISUAL_SCHEMA_KEY.card, resolved),
      bar: resolveChromeStyle(theme, VISUAL_SCHEMA_KEY.bar, resolved),
      table: resolveChromeStyle(theme, VISUAL_SCHEMA_KEY.table, resolved),
      slicer: resolveChromeStyle(theme, VISUAL_SCHEMA_KEY.slicer, resolved),
    }),
    [theme, resolved],
  );
  // The shared default only (no visual-specific override blended in) — what
  // the "Theme" tab shows and edits, distinct from a single visual's fully
  // resolved chrome.
  const sharedChromeStyle = useMemo(() => resolveChromeStyle(theme, "*", resolved), [theme, resolved]);

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
            <span className="preview-badge">
              <span /> {visibleVisuals.length} on canvas
            </span>
          </div>

          <VisualGallery
            theme={resolved}
            tableStyle={tableStyle}
            barChartStyle={barChartStyle}
            cardStyle={cardStyle}
            slicerStyle={slicerStyle}
            chromeStyles={chromeStyles}
            visibleVisuals={visibleVisuals}
            selected={selectedVisual}
            onSelect={setSelectedVisual}
          />
        </section>

        <PropertyEditor
          theme={theme}
          resolved={resolved}
          tableStyle={tableStyle}
          barChartStyle={barChartStyle}
          cardStyle={cardStyle}
          slicerStyle={slicerStyle}
          chromeStyle={chromeStyles[selectedVisual]}
          sharedChromeStyle={sharedChromeStyle}
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
