import type { CSSProperties, ReactNode } from "react";
import type { ResolvedTheme } from "../lib/theme";

export type VisualKind = "card" | "bar" | "table" | "slicer";

type VisualGalleryProps = {
  theme: ResolvedTheme;
  selected: VisualKind;
  onSelect: (visual: VisualKind) => void;
};

type PreviewShellProps = {
  id: VisualKind;
  label: string;
  selected: boolean;
  theme: ResolvedTheme;
  onSelect: (visual: VisualKind) => void;
  children: ReactNode;
};

function PreviewShell({
  id,
  label,
  selected,
  theme,
  onSelect,
  children,
}: PreviewShellProps) {
  const style = {
    "--preview-bg": theme.background,
    "--preview-fg": theme.foreground,
    "--preview-muted": theme.muted,
    "--preview-font": theme.fontFamily,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`visual-tile${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      aria-label={`Edit ${label} properties`}
    >
      <span className="visual-tile__label">
        <span>{label}</span>
        <span className="visual-tile__action">{selected ? "Editing" : "Select"}</span>
      </span>
      <span className="visual-frame" style={style}>
        {children}
      </span>
    </button>
  );
}

export function VisualGallery({ theme, selected, onSelect }: VisualGalleryProps) {
  const palette = theme.palette;

  return (
    <div className="visual-grid">
      <PreviewShell
        id="card"
        label="Card"
        selected={selected === "card"}
        theme={theme}
        onSelect={onSelect}
      >
        <span className="card-preview">
          <span className="preview-title" style={{ fontSize: theme.titleSize }}>
            Total support awarded
          </span>
          <span className="card-preview__value" style={{ fontSize: theme.calloutSize }}>
            £8.4m
          </span>
          <span className="card-preview__trend" style={{ color: palette[1] ?? palette[0] }}>
            <span aria-hidden="true">↗</span> 7.2% vs last quarter
          </span>
          <span className="card-preview__spark" aria-hidden="true">
            {[34, 48, 41, 61, 55, 76, 84].map((height, index) => (
              <span
                key={height + index}
                style={{ height: `${height}%`, backgroundColor: palette[0] }}
              />
            ))}
          </span>
        </span>
      </PreviewShell>

      <PreviewShell
        id="bar"
        label="Bar chart"
        selected={selected === "bar"}
        theme={theme}
        onSelect={onSelect}
      >
        <span className="chart-preview">
          <span className="preview-title" style={{ fontSize: theme.titleSize }}>
            Applications by region
          </span>
          <span className="chart-preview__plot">
            {[
              ["London", 82],
              ["North West", 66],
              ["Scotland", 51],
              ["Wales", 38],
            ].map(([label, value], index) => (
              <span className="bar-row" key={label}>
                <span className="bar-row__label">{label}</span>
                <span className="bar-row__track">
                  <span
                    className="bar-row__fill"
                    style={{
                      width: `${value}%`,
                      backgroundColor: palette[index % palette.length],
                    }}
                  />
                </span>
                <span className="bar-row__value">{value}k</span>
              </span>
            ))}
          </span>
        </span>
      </PreviewShell>

      <PreviewShell
        id="table"
        label="Table"
        selected={selected === "table"}
        theme={theme}
        onSelect={onSelect}
      >
        <span className="table-preview">
          <span className="preview-title" style={{ fontSize: theme.titleSize }}>
            Regional performance
          </span>
          <span
            className="table-preview__row table-preview__head"
            style={{ color: theme.tableAccent }}
          >
            <span>Region</span><span>Approved</span><span>Value</span>
          </span>
          {[
            ["London", "82%", "£2.8m"],
            ["North West", "76%", "£2.1m"],
            ["Scotland", "71%", "£1.9m"],
          ].map((row) => (
            <span className="table-preview__row" key={row[0]}>
              {row.map((cell) => <span key={cell}>{cell}</span>)}
            </span>
          ))}
        </span>
      </PreviewShell>

      <PreviewShell
        id="slicer"
        label="Slicer"
        selected={selected === "slicer"}
        theme={theme}
        onSelect={onSelect}
      >
        <span className="slicer-preview">
          <span className="preview-title" style={{ fontSize: theme.titleSize }}>
            Application status
          </span>
          <span className="slicer-preview__search">Search</span>
          {["All statuses", "Approved", "In review", "Declined"].map((label, index) => (
            <span className="slicer-preview__option" key={label}>
              <span
                className={`slicer-preview__check${index < 2 ? " is-checked" : ""}`}
                style={index < 2 ? { backgroundColor: palette[0], borderColor: palette[0] } : undefined}
                aria-hidden="true"
              >
                {index < 2 ? "✓" : ""}
              </span>
              {label}
              {index === 0 && <span className="slicer-preview__count">4</span>}
            </span>
          ))}
        </span>
      </PreviewShell>
    </div>
  );
}
