import type { PowerBITheme, ResolvedTheme } from "../lib/theme";
import type { VisualKind } from "./VisualPreviews";

type ThemePath = Array<string | number>;

type PropertyEditorProps = {
  theme: PowerBITheme;
  resolved: ResolvedTheme;
  selected: VisualKind;
  onChange: (path: ThemePath, value: string | number) => void;
};

const visualNames: Record<VisualKind, string> = {
  card: "Card",
  bar: "Bar chart",
  table: "Table",
  slicer: "Slicer",
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="property-row">
      <span className="property-row__copy">
        <span className="property-row__label">{label}</span>
        <span className="property-row__value">{value.toUpperCase()}</span>
      </span>
      <span className="color-control">
        <span className="color-control__swatch" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={label}
        />
      </span>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="number-property">
      <span>{label}</span>
      <span className="number-property__control">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <output>{value}px</output>
      </span>
    </label>
  );
}

export function PropertyEditor({ theme, resolved, selected, onChange }: PropertyEditorProps) {
  return (
    <aside className="properties-panel" aria-label="Theme property editor">
      <div className="properties-panel__header">
        <div>
          <span className="eyebrow">Properties</span>
          <h2>{visualNames[selected]}</h2>
        </div>
        <span className="selection-dot" title="Selected visual" />
      </div>

      <section className="property-section">
        <h3>Theme identity</h3>
        <label className="text-property">
          <span>Name</span>
          <input
            type="text"
            value={typeof theme.name === "string" ? theme.name : resolved.name}
            onChange={(event) => onChange(["name"], event.target.value)}
          />
        </label>
      </section>

      <section className="property-section">
        <h3>Shared colours</h3>
        <ColorField
          label="Canvas"
          value={resolved.background}
          onChange={(value) => onChange(["background"], value)}
        />
        <ColorField
          label="Text"
          value={resolved.foreground}
          onChange={(value) => onChange(["foreground"], value)}
        />
        <ColorField
          label="Table accent"
          value={resolved.tableAccent}
          onChange={(value) => onChange(["tableAccent"], value)}
        />
      </section>

      <section className="property-section">
        <h3>Data palette</h3>
        <div className="palette-editor">
          {resolved.palette.slice(0, 5).map((color, index) => (
            <label className="palette-editor__item" key={`${color}-${index}`}>
              <input
                type="color"
                value={color}
                onChange={(event) =>
                  onChange(["dataColors", index], event.target.value.toUpperCase())
                }
                aria-label={`Data colour ${index + 1}`}
              />
              <span style={{ backgroundColor: color }} />
              <small>{index + 1}</small>
            </label>
          ))}
        </div>
      </section>

      <section className="property-section">
        <h3>Typography</h3>
        {selected === "card" ? (
          <NumberField
            label="Callout size"
            value={resolved.calloutSize}
            min={18}
            max={48}
            onChange={(value) => onChange(["textClasses", "callout", "fontSize"], value)}
          />
        ) : (
          <NumberField
            label="Title size"
            value={resolved.titleSize}
            min={9}
            max={24}
            onChange={(value) => onChange(["textClasses", "title", "fontSize"], value)}
          />
        )}
      </section>

      <p className="properties-panel__note">
        This first slice edits shared Power BI theme tokens. Visual-specific schema controls come next.
      </p>
    </aside>
  );
}
