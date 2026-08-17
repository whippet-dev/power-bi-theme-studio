"use client";

import { useMemo, useRef, useState } from "react";
import {
  cloneStarterTheme,
  parseThemeJson,
  resolveTheme,
  themeFileName,
  updateThemeValue,
  type JsonValue,
  type PowerBITheme,
} from "../lib/theme";
import { resolveTableStyle } from "../lib/tableProperties";
import { PropertyEditor } from "./PropertyEditor";
import { VisualGallery, type VisualKind } from "./VisualPreviews";

export function ThemeStudio() {
  const [theme, setTheme] = useState<PowerBITheme>(() => cloneStarterTheme());
  const [selectedVisual, setSelectedVisual] = useState<VisualKind>("bar");
  const [fileLabel, setFileLabel] = useState("Starter theme");
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const resolved = useMemo(() => resolveTheme(theme), [theme]);
  const tableStyle = useMemo(() => resolveTableStyle(theme, resolved), [theme, resolved]);

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
        <section className="canvas-panel" aria-labelledby="gallery-title">
          <div className="canvas-panel__intro">
            <div>
              <span className="eyebrow">Live canvas</span>
              <h1 id="gallery-title">Visual gallery</h1>
              <p>Choose a visual, then tune the shared theme settings. Every preview updates immediately.</p>
            </div>
            <span className="preview-badge"><span /> 4 previews</span>
          </div>

          <VisualGallery
            theme={resolved}
            tableStyle={tableStyle}
            selected={selectedVisual}
            onSelect={setSelectedVisual}
          />
        </section>

        <PropertyEditor
          theme={theme}
          resolved={resolved}
          tableStyle={tableStyle}
          selected={selectedVisual}
          onChange={handleChange}
        />
      </div>
    </main>
  );
}
