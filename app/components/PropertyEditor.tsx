import { propertyThemePath, TABLE_PROPERTIES } from "../lib/tableProperties";
import type { ResolvedTableStyle } from "../lib/tableProperties";
import type { PowerBITheme, ResolvedTheme } from "../lib/theme";
import type { VisualKind } from "./VisualPreviews";

type ThemePath = Array<string | number>;
type PropertyValue = string | number | boolean;

type PropertyEditorProps = {
  theme: PowerBITheme;
  resolved: ResolvedTheme;
  tableStyle: ResolvedTableStyle;
  selected: VisualKind;
  onChange: (path: ThemePath, value: PropertyValue) => void;
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

function BooleanField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="property-row">
      <span className="property-row__copy">
        <span className="property-row__label">{label}</span>
      </span>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
    </label>
  );
}

/**
 * Renders every TABLE_PROPERTIES entry against its resolved value, with the
 * friendly label/description/guidance from the registry and the underlying
 * schema path as supporting technical detail.
 */
function TablePropertySection({
  tableStyle,
  onChange,
}: {
  tableStyle: ResolvedTableStyle;
  onChange: (path: ThemePath, value: PropertyValue) => void;
}) {
  return (
    <section className="property-section">
      <h3>Table</h3>
      {(Object.entries(TABLE_PROPERTIES) as Array<[keyof ResolvedTableStyle, (typeof TABLE_PROPERTIES)[keyof typeof TABLE_PROPERTIES]]>).map(([key, definition]) => {
        const path = propertyThemePath(definition);
        const value = tableStyle[key];

        return (
          <div className="registry-property" key={definition.id}>
            <p className="registry-property__description">{definition.description}</p>
            {definition.valueType === "color" && (
              <ColorField
                label={definition.label}
                value={value as string}
                onChange={(next) => onChange(path, next)}
              />
            )}
            {definition.valueType === "number" && (
              <NumberField
                label={definition.label}
                value={value as number}
                min={definition.min ?? 0}
                max={definition.max ?? 100}
                onChange={(next) => onChange(path, next)}
              />
            )}
            {definition.valueType === "boolean" && (
              <BooleanField
                label={definition.label}
                value={value as boolean}
                onChange={(next) => onChange(path, next)}
              />
            )}
            {definition.guidance && <p className="registry-property__guidance">{definition.guidance}</p>}
            <details className="registry-property__technical">
              <summary>Technical details</summary>
              <code>{`visualStyles.tableEx.* → ${definition.path.join(" → ")}`}</code>
            </details>
          </div>
        );
      })}
    </section>
  );
}

export function PropertyEditor({ theme, resolved, tableStyle, selected, onChange }: PropertyEditorProps) {
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

      {selected === "table" && <TablePropertySection tableStyle={tableStyle} onChange={onChange} />}

      <p className="properties-panel__note">
        {selected === "table"
          ? "Table settings above write directly to visualStyles.tableEx and take priority over Table accent."
          : "This first slice edits shared Power BI theme tokens. Visual-specific schema controls come next."}
      </p>
    </aside>
  );
}
