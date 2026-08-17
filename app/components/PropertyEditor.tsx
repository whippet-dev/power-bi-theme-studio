import { propertyThemePath, TABLE_PROPERTIES } from "../lib/tableProperties";
import type { ResolvedTableStyle } from "../lib/tableProperties";
import type { PropertyDefinition, PropertyValueType } from "../lib/properties";
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

const TABLE_GROUP_LABELS: Record<keyof typeof TABLE_PROPERTIES, string> = {
  columnHeaders: "Column headers",
  values: "Values",
  total: "Total",
  grid: "Grid",
  columnFormatting: "Field formatting",
  sparklines: "Sparklines",
};

function ColorControl({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <span className="color-control">
      <span className="color-control__swatch" style={{ backgroundColor: value }} />
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        aria-label={label}
      />
    </span>
  );
}

function NumberControl({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <span className="number-control">
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <output>{value}</output>
    </span>
  );
}

function BooleanControl({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} aria-label={label} />;
}

function TextControl({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <input
      className="text-control"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
    />
  );
}

function SelectControl({
  value,
  options,
  onChange,
  label,
}: {
  value: string | number;
  options: readonly { value: string | number; label: string }[];
  onChange: (value: string | number) => void;
  label: string;
}) {
  return (
    <select
      className="select-control"
      value={String(value)}
      aria-label={label}
      onChange={(event) => {
        const match = options.find((option) => String(option.value) === event.target.value);
        onChange(match ? match.value : event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={String(option.value)} value={String(option.value)}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * One property row: a compact label + control line, with a collapsed info
 * toggle holding the plain-English description, practical guidance, and the
 * underlying schema path. Collapsed by default so a group of many
 * properties stays scannable.
 */
function PropertyRow({
  definition,
  value,
  onChange,
}: {
  definition: PropertyDefinition;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
}) {
  return (
    <div className="registry-property">
      <div className="property-row">
        <span className="property-row__copy">
          <span className="property-row__label">{definition.label}</span>
        </span>
        <span className="property-row__control">
          {definition.valueType === "color" && (
            <ColorControl label={definition.label} value={value as string} onChange={(next) => onChange(next)} />
          )}
          {definition.valueType === "number" && (
            <NumberControl
              value={value as number}
              min={definition.min ?? 0}
              max={definition.max ?? 100}
              onChange={(next) => onChange(next)}
            />
          )}
          {definition.valueType === "boolean" && (
            <BooleanControl label={definition.label} value={value as boolean} onChange={(next) => onChange(next)} />
          )}
          {definition.valueType === "text" && (
            <TextControl label={definition.label} value={value as string} onChange={(next) => onChange(next)} />
          )}
          {definition.valueType === "enum" && definition.options && (
            <SelectControl
              label={definition.label}
              value={value as string | number}
              options={definition.options}
              onChange={(next) => onChange(next)}
            />
          )}
        </span>
      </div>
      <details className="info-toggle">
        <summary aria-label={`About ${definition.label}`}>ⓘ</summary>
        <div className="info-toggle__panel">
          <p>{definition.description}</p>
          {definition.guidance && <p className="info-toggle__guidance">{definition.guidance}</p>}
          <code>{`visualStyles.tableEx.* → ${definition.path.join(" → ")}`}</code>
        </div>
      </details>
    </div>
  );
}

function TableGroupSection({
  groupKey,
  tableStyle,
  onChange,
  defaultOpen,
}: {
  groupKey: keyof typeof TABLE_PROPERTIES;
  tableStyle: ResolvedTableStyle;
  onChange: (path: ThemePath, value: PropertyValue) => void;
  defaultOpen: boolean;
}) {
  const group = TABLE_PROPERTIES[groupKey];
  const groupValues = tableStyle[groupKey] as Record<string, PropertyValue>;

  return (
    <details className="property-group" open={defaultOpen}>
      <summary>
        {TABLE_GROUP_LABELS[groupKey]}
        <span className="property-group__count">{Object.keys(group).length}</span>
      </summary>
      <div className="property-group__body">
        {Object.entries(group).map(([key, definition]) => (
          <PropertyRow
            key={definition.id}
            definition={definition as PropertyDefinition<PropertyValueType>}
            value={groupValues[key]}
            onChange={(next) => onChange(propertyThemePath(definition), next)}
          />
        ))}
      </div>
    </details>
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
        <div className="property-row">
          <span className="property-row__copy">
            <span className="property-row__label">Canvas</span>
          </span>
          <ColorControl label="Canvas" value={resolved.background} onChange={(value) => onChange(["background"], value)} />
        </div>
        <div className="property-row">
          <span className="property-row__copy">
            <span className="property-row__label">Text</span>
          </span>
          <ColorControl label="Text" value={resolved.foreground} onChange={(value) => onChange(["foreground"], value)} />
        </div>
        <div className="property-row">
          <span className="property-row__copy">
            <span className="property-row__label">Table accent</span>
          </span>
          <ColorControl
            label="Table accent"
            value={resolved.tableAccent}
            onChange={(value) => onChange(["tableAccent"], value)}
          />
        </div>
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
          <div className="property-row">
            <span className="property-row__copy">
              <span className="property-row__label">Callout size</span>
            </span>
            <NumberControl
              value={resolved.calloutSize}
              min={18}
              max={48}
              onChange={(value) => onChange(["textClasses", "callout", "fontSize"], value)}
            />
          </div>
        ) : (
          <div className="property-row">
            <span className="property-row__copy">
              <span className="property-row__label">Title size</span>
            </span>
            <NumberControl
              value={resolved.titleSize}
              min={9}
              max={24}
              onChange={(value) => onChange(["textClasses", "title", "fontSize"], value)}
            />
          </div>
        )}
      </section>

      {selected === "table" && (
        <section className="property-section property-section--table">
          <h3>Table</h3>
          <TableGroupSection groupKey="columnHeaders" tableStyle={tableStyle} onChange={onChange} defaultOpen />
          <TableGroupSection groupKey="values" tableStyle={tableStyle} onChange={onChange} defaultOpen={false} />
          <TableGroupSection groupKey="total" tableStyle={tableStyle} onChange={onChange} defaultOpen={false} />
          <TableGroupSection groupKey="grid" tableStyle={tableStyle} onChange={onChange} defaultOpen={false} />
          <TableGroupSection groupKey="columnFormatting" tableStyle={tableStyle} onChange={onChange} defaultOpen={false} />
          <TableGroupSection groupKey="sparklines" tableStyle={tableStyle} onChange={onChange} defaultOpen={false} />
        </section>
      )}

      <p className="properties-panel__note">
        {selected === "table"
          ? "Table settings above write directly to visualStyles.tableEx and take priority over Table accent."
          : "This first slice edits shared Power BI theme tokens. Visual-specific schema controls come next."}
      </p>
    </aside>
  );
}
