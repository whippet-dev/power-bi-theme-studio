import { useState, type ReactNode } from "react";
import { BAR_CHART_PROPERTIES, propertyThemePath as barChartPropertyThemePath } from "../lib/barChartProperties";
import type { ResolvedBarChartStyle } from "../lib/barChartProperties";
import { CARD_PROPERTIES, propertyThemePath as cardPropertyThemePath } from "../lib/cardProperties";
import type { ResolvedCardStyle } from "../lib/cardProperties";
import { CHROME_PROPERTIES, chromeThemePath, type ResolvedChromeStyle } from "../lib/chromeProperties";
import { COLUMN_CHART_PROPERTIES, propertyThemePath as columnChartPropertyThemePath } from "../lib/columnChartProperties";
import type { ResolvedColumnChartStyle } from "../lib/columnChartProperties";
import { GLOBAL_OPTIONS_PROPERTIES, propertyThemePath as globalOptionsPropertyThemePath } from "../lib/globalOptionsProperties";
import type { ResolvedGlobalOptionsStyle } from "../lib/globalOptionsProperties";
import { LINE_CHART_PROPERTIES, propertyThemePath as lineChartPropertyThemePath } from "../lib/lineChartProperties";
import {
  resolveTextClasses,
  resolveThemeColors,
  TEXT_CLASS_PROPERTIES,
  THEME_COLOR_PROPERTIES,
  themeGlobalThemePath,
} from "../lib/themeGlobalsProperties";
import type { ResolvedLineChartStyle } from "../lib/lineChartProperties";
import { MATRIX_PROPERTIES, propertyThemePath as matrixPropertyThemePath } from "../lib/matrixProperties";
import type { ResolvedMatrixStyle } from "../lib/matrixProperties";
import { PIE_CHART_PROPERTIES, propertyThemePath as pieChartPropertyThemePath } from "../lib/pieChartProperties";
import type { ResolvedPieChartStyle } from "../lib/pieChartProperties";
import type { PropertyDefinition, PropertyValueType, VisualSchemaKey } from "../lib/properties";
import { propertyThemePath as slicerPropertyThemePath, SLICER_PROPERTIES } from "../lib/slicerProperties";
import type { ResolvedSlicerStyle } from "../lib/slicerProperties";
import { propertyThemePath as stackedBarChartPropertyThemePath, STACKED_BAR_CHART_PROPERTIES } from "../lib/stackedBarChartProperties";
import type { ResolvedStackedBarChartStyle } from "../lib/stackedBarChartProperties";
import { propertyThemePath as stackedColumnChartPropertyThemePath, STACKED_COLUMN_CHART_PROPERTIES } from "../lib/stackedColumnChartProperties";
import type { ResolvedStackedColumnChartStyle } from "../lib/stackedColumnChartProperties";
import { propertyThemePath as tablePropertyThemePath, TABLE_PROPERTIES } from "../lib/tableProperties";
import type { ResolvedTableStyle } from "../lib/tableProperties";
import { hasThemeValueAtPath, type PowerBITheme, type ResolvedTheme } from "../lib/theme";
import type { VisualKind } from "./VisualPreviews";

type ThemePath = Array<string | number>;
type PropertyValue = string | number | boolean;
type Tab = "theme" | "visual" | "global";

type PropertyEditorProps = {
  theme: PowerBITheme;
  resolved: ResolvedTheme;
  tableStyle: ResolvedTableStyle;
  barChartStyle: ResolvedBarChartStyle;
  columnChartStyle: ResolvedColumnChartStyle;
  stackedBarChartStyle: ResolvedStackedBarChartStyle;
  stackedColumnChartStyle: ResolvedStackedColumnChartStyle;
  lineChartStyle: ResolvedLineChartStyle;
  cardStyle: ResolvedCardStyle;
  slicerStyle: ResolvedSlicerStyle;
  matrixStyle: ResolvedMatrixStyle;
  pieChartStyle: ResolvedPieChartStyle;
  chromeStyle: ResolvedChromeStyle;
  sharedChromeStyle: ResolvedChromeStyle;
  globalOptionsStyle: ResolvedGlobalOptionsStyle;
  activeVisualSchemaKey: VisualSchemaKey;
  selected: VisualKind;
  onChange: (path: ThemePath, value: PropertyValue) => void;
  onReset: (path: ThemePath) => void;
};

const visualNames: Record<VisualKind, string> = {
  card: "Card",
  bar: "Clustered bar chart",
  column: "Clustered column chart",
  stackedBar: "Stacked bar chart",
  stackedColumn: "Stacked column chart",
  line: "Line chart",
  table: "Table",
  matrix: "Matrix",
  pie: "Pie chart",
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

const MATRIX_GROUP_LABELS: Record<keyof typeof MATRIX_PROPERTIES, string> = {
  columnHeaders: "Column headers",
  rowHeaders: "Row headers",
  values: "Values",
  columnTotal: "Column grand total",
  rowTotal: "Row grand total",
  total: "Grand total",
  subTotals: "Subtotals",
  blankRows: "Blank rows",
  grid: "Grid",
  columnFormatting: "Field formatting",
  sparklines: "Sparklines",
  accessibility: "Accessibility",
  general: "General",
};

const PIE_CHART_GROUP_LABELS: Record<keyof typeof PIE_CHART_PROPERTIES, string> = {
  dataPoint: "Data colors",
  slices: "Shapes",
  legend: "Legend",
  labels: "Detail labels",
  general: "General",
};

// Power BI's own format-pane card names for each group, so the panel reads
// the same way Power BI Desktop does.
const BAR_CHART_GROUP_LABELS: Record<keyof typeof BAR_CHART_PROPERTIES, string> = {
  dataPoint: "Data colors",
  categoryAxis: "Y axis",
  valueAxis: "X axis",
  legend: "Legend",
  labels: "Data labels",
  plotArea: "Plot area",
  error: "Error bars",
  trend: "Trend line",
  referenceLine: "Constant line",
  xAxisReferenceLine: "X-Axis constant line",
  y1AxisReferenceLine: "Y-Axis constant line",
  zoom: "Zoom slider",
  smallMultiplesLayout: "Small multiples grid",
  subheader: "Small multiple title",
  layout: "Layout",
};

// Column chart's schema is byte-identical to Bar chart's, but it's a
// vertical layout — category renders on the X axis and value on the Y axis,
// the opposite of Bar chart's horizontal layout, matching Power BI's own UI.
const COLUMN_CHART_GROUP_LABELS: Record<keyof typeof COLUMN_CHART_PROPERTIES, string> = {
  dataPoint: "Data colors",
  categoryAxis: "X axis",
  valueAxis: "Y axis",
  legend: "Legend",
  labels: "Data labels",
  plotArea: "Plot area",
  error: "Error bars",
  trend: "Trend line",
  referenceLine: "Constant line",
  xAxisReferenceLine: "X-Axis constant line",
  y1AxisReferenceLine: "Y-Axis constant line",
  zoom: "Zoom slider",
  smallMultiplesLayout: "Small multiples grid",
  subheader: "Small multiple title",
  layout: "Layout",
};

// Stacked bar/column charts share Clustered bar/column's shared groups but
// add ribbonBands/totals/layout and drop referenceLine entirely (verified
// against the schema, not assumed) — see stackedBarChartProperties.ts.
const STACKED_BAR_CHART_GROUP_LABELS: Record<keyof typeof STACKED_BAR_CHART_PROPERTIES, string> = {
  dataPoint: "Data colors",
  categoryAxis: "Y axis",
  valueAxis: "X axis",
  legend: "Legend",
  labels: "Data labels",
  plotArea: "Plot area",
  error: "Error bars",
  trend: "Trend line",
  ribbonBands: "Ribbons",
  totals: "Total labels",
  xAxisReferenceLine: "X-Axis constant line",
  y1AxisReferenceLine: "Y-Axis constant line",
  zoom: "Zoom slider",
  smallMultiplesLayout: "Small multiples grid",
  subheader: "Small multiple title",
  layout: "Layout",
};

const STACKED_COLUMN_CHART_GROUP_LABELS: Record<keyof typeof STACKED_COLUMN_CHART_PROPERTIES, string> = {
  dataPoint: "Data colors",
  categoryAxis: "X axis",
  valueAxis: "Y axis",
  legend: "Legend",
  labels: "Data labels",
  plotArea: "Plot area",
  error: "Error bars",
  trend: "Trend line",
  ribbonBands: "Ribbons",
  totals: "Total labels",
  xAxisReferenceLine: "X-Axis constant line",
  y1AxisReferenceLine: "Y-Axis constant line",
  zoom: "Zoom slider",
  smallMultiplesLayout: "Small multiples grid",
  subheader: "Small multiple title",
  layout: "Layout",
};

const CHROME_GROUP_LABELS: Record<keyof typeof CHROME_PROPERTIES, string> = {
  title: "Title",
  subTitle: "Subtitle",
  background: "Background",
  border: "Border",
  divider: "Divider",
  dropShadow: "Shadow",
  general: "General",
  lockAspect: "Lock aspect",
  padding: "Padding",
  spacing: "Spacing",
  stylePreset: "Style preset",
  visualHeader: "Visual header",
  visualHeaderTooltip: "Visual header tooltip",
  visualLink: "Action",
  visualTooltip: "Tooltip",
};

const GLOBAL_OPTIONS_GROUP_LABELS: Record<keyof typeof GLOBAL_OPTIONS_PROPERTIES, string> = {
  reportFilterPaneState: "Filter pane (report default)",
  reportPageAlignment: "Page alignment (report default)",
  pageBackground: "Page background",
  pageAlignment: "Page alignment",
  pageFilterCards: "Filter cards",
  pageWallpaper: "Wallpaper",
  pageFilterPane: "Filter pane",
  pageInformation: "Page information",
  pageRefresh: "Page refresh",
  pageSize: "Canvas settings",
  personalizeVisual: "Personalize visual",
};

const CARD_GROUP_LABELS: Record<keyof typeof CARD_PROPERTIES, string> = {
  categoryLabels: "Category label",
  labels: "Data label",
  general: "General",
  wordWrap: "Word wrap",
};

const LINE_CHART_GROUP_LABELS: Record<keyof typeof LINE_CHART_PROPERTIES, string> = {
  dataPoint: "Data colors",
  lineStyles: "Shapes",
  markers: "Markers",
  categoryAxis: "X axis",
  valueAxis: "Y axis",
  y2Axis: "Secondary Y axis",
  legend: "Legend",
  labels: "Data labels",
  seriesLabels: "Series labels",
  plotArea: "Plot area",
  error: "Error bars",
  trend: "Trend line",
  forecast: "Forecast",
  anomalyDetection: "Find anomalies",
  referenceLine: "Constant line",
  xAxisReferenceLine: "X-Axis constant line",
  y1AxisReferenceLine: "Y-Axis constant line",
  zoom: "Zoom slider",
  smallMultiplesLayout: "Small multiples grid",
  subheader: "Small multiple title",
  general: "General",
};

const SLICER_GROUP_LABELS: Record<keyof typeof SLICER_PROPERTIES, string> = {
  header: "Slicer header",
  items: "Values",
  general: "General",
  selection: "Selection controls",
  searchBox: "Search box",
  date: "Date inputs",
  dateRange: "Date range",
  dateRangeText: "Date range text",
  calendarButton: "Calendar button",
  numericInputStyle: "Numeric inputs",
  slider: "Slider",
  relativeText: "Summary text",
  pendingChangesIcon: "Pending changes icon",
  selectionIcon: "Selection icon",
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
 *
 * `pathPrefix` is passed by the caller rather than read from
 * `definition.visual`, because chrome properties (title/background/...) are
 * defined once but write to different visuals depending on which tab is
 * active — the technical path shown must reflect where this row actually
 * writes, not the registry entry's placeholder visual.
 *
 * `hasOverride` distinguishes an explicit value the theme actually sets
 * from one this row is merely showing as a resolved fallback — only the
 * former gets a dot marker and a reset control, so clearing it lets
 * resolution fall through to the shared/theme default again instead of
 * requiring the value to be hand-matched back.
 */
function PropertyRow({
  definition,
  pathPrefix,
  value,
  hasOverride,
  onChange,
  onReset,
}: {
  definition: PropertyDefinition;
  pathPrefix: string;
  value: PropertyValue;
  hasOverride: boolean;
  onChange: (value: PropertyValue) => void;
  onReset: () => void;
}) {
  return (
    <div className="registry-property">
      <div className="property-row">
        <span className="property-row__copy">
          <span className="property-row__label" title={definition.label}>
            {hasOverride && <span className="property-row__override-dot" title="This value is set explicitly" />}
            {definition.label}
          </span>
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
        {hasOverride && (
          <button
            type="button"
            className="reset-toggle"
            onClick={onReset}
            aria-label={`Reset ${definition.label} to the theme default`}
            title="Reset to theme default"
          >
            ↺
          </button>
        )}
        <details className="info-toggle">
          <summary aria-label={`About ${definition.label}`}>ⓘ</summary>
          <div className="info-toggle__panel">
            <p>{definition.description}</p>
            {definition.guidance && <p className="info-toggle__guidance">{definition.guidance}</p>}
            <code>{`${pathPrefix} → ${definition.path.join(" → ")}`}</code>
          </div>
        </details>
      </div>
    </div>
  );
}

/**
 * Renders one registry group's properties as rows, clustering any that
 * carry a `section` tag (e.g. "Gridline", "Title") under their own
 * sub-heading. Properties without a section render first, unclustered,
 * alongside the group's master show/enabled toggle.
 */
function RegistryGroupBody({
  theme,
  group,
  groupValues,
  pathPrefix,
  getThemePath,
  onChange,
  onReset,
}: {
  theme: PowerBITheme;
  group: Record<string, PropertyDefinition<PropertyValueType>>;
  groupValues: Record<string, PropertyValue>;
  pathPrefix: string;
  getThemePath: (definition: PropertyDefinition) => ThemePath;
  onChange: (path: ThemePath, value: PropertyValue) => void;
  onReset: (path: ThemePath) => void;
}) {
  const entries = Object.entries(group);
  const general = entries.filter(([, definition]) => !definition.section);
  const sectionNames: string[] = [];
  for (const [, definition] of entries) {
    if (definition.section && !sectionNames.includes(definition.section)) sectionNames.push(definition.section);
  }

  const renderRow = ([key, definition]: [string, PropertyDefinition<PropertyValueType>]) => {
    const path = getThemePath(definition);
    return (
      <PropertyRow
        key={definition.id}
        definition={definition}
        pathPrefix={pathPrefix}
        value={groupValues[key]}
        hasOverride={hasThemeValueAtPath(theme, path)}
        onChange={(next) => onChange(path, next)}
        onReset={() => onReset(path)}
      />
    );
  };

  return (
    <div className="property-group__body">
      {general.map(renderRow)}
      {sectionNames.map((sectionName) => (
        <div className="property-subsection" key={sectionName}>
          <div className="property-subsection__title">{sectionName}</div>
          {entries.filter(([, definition]) => definition.section === sectionName).map(renderRow)}
        </div>
      ))}
    </div>
  );
}

type GroupMeta = { id: string; title: string; count: number };

/**
 * The group-picker list: one row per format-pane-style card (e.g. "Column
 * headers", "Y axis"). Selecting a row navigates into its detail view
 * rather than expanding in place, so the panel stays scannable regardless
 * of how many properties a group holds.
 */
function GroupList({ groups, onOpen }: { groups: GroupMeta[]; onOpen: (id: string) => void }) {
  return (
    <div className="property-group-list">
      {groups.map((group) => (
        <button
          key={group.id}
          type="button"
          className="property-group-list__item"
          onClick={() => onOpen(group.id)}
        >
          <span>{group.title}</span>
          <span className="property-group-list__meta">
            <span className="property-group__count">{group.count}</span>
            <span className="property-group-list__chevron" aria-hidden="true">›</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** The detail view for one group: a back control plus its property rows. */
function GroupDetail({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="property-detail">
      <div className="property-detail__header">
        <button type="button" className="property-detail__back" onClick={onBack}>
          <span aria-hidden="true">‹</span> Back
        </button>
        <span className="property-detail__title">{title}</span>
      </div>
      {children}
    </div>
  );
}

const THEME_IDENTITY_ID = "identity";
const SHARED_COLOURS_ID = "sharedColours";
const DATA_PALETTE_ID = "dataPalette";
const TYPOGRAPHY_ID = "typography";
const CHROME_ID_PREFIX = "chrome:";
const TABLE_ID_PREFIX = "table:";
const BAR_CHART_ID_PREFIX = "bar:";
const COLUMN_CHART_ID_PREFIX = "column:";
const STACKED_BAR_CHART_ID_PREFIX = "stackedBar:";
const STACKED_COLUMN_CHART_ID_PREFIX = "stackedColumn:";
const LINE_CHART_ID_PREFIX = "line:";
const CARD_ID_PREFIX = "card:";
const SLICER_ID_PREFIX = "slicer:";
const MATRIX_ID_PREFIX = "matrix:";
const PIE_CHART_ID_PREFIX = "pie:";
const GLOBAL_OPTIONS_ID_PREFIX = "global:";
const SEMANTIC_COLORS_ID = "semanticColors";
const TEXT_CLASSES_ID = "textClasses";

export function PropertyEditor({
  theme,
  resolved,
  tableStyle,
  barChartStyle,
  columnChartStyle,
  stackedBarChartStyle,
  stackedColumnChartStyle,
  lineChartStyle,
  cardStyle,
  slicerStyle,
  matrixStyle,
  pieChartStyle,
  chromeStyle,
  sharedChromeStyle,
  globalOptionsStyle,
  activeVisualSchemaKey,
  selected,
  onChange,
  onReset,
}: PropertyEditorProps) {
  const [tab, setTab] = useState<Tab>("visual");
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  // A group open in one tab/visual rarely makes sense after switching to
  // another, so return to the list view whenever the context changes.
  // (Adjusting state during render, per React's guidance, rather than in a
  // useEffect that would cause an extra committed render.)
  const [trackedContext, setTrackedContext] = useState({ tab, selected });
  if (trackedContext.tab !== tab || trackedContext.selected !== selected) {
    setTrackedContext({ tab, selected });
    setOpenGroupId(null);
  }

  const chromeGroupKeys = Object.keys(CHROME_PROPERTIES) as Array<keyof typeof CHROME_PROPERTIES>;

  const themeGroups: GroupMeta[] = [
    { id: THEME_IDENTITY_ID, title: "Theme identity", count: 1 },
    { id: SHARED_COLOURS_ID, title: "Shared colours", count: 3 },
    { id: DATA_PALETTE_ID, title: "Data palette", count: Math.min(resolved.palette.length, 5) },
    { id: SEMANTIC_COLORS_ID, title: "Semantic colours", count: Object.keys(THEME_COLOR_PROPERTIES).length },
    { id: TEXT_CLASSES_ID, title: "Text classes", count: Object.keys(TEXT_CLASS_PROPERTIES).length },
    ...chromeGroupKeys.map((key) => ({
      id: `${CHROME_ID_PREFIX}${key}`,
      title: CHROME_GROUP_LABELS[key],
      count: Object.keys(CHROME_PROPERTIES[key]).length,
    })),
  ];

  const visualGroups: GroupMeta[] = [
    ...chromeGroupKeys.map((key) => ({
      id: `${CHROME_ID_PREFIX}${key}`,
      title: CHROME_GROUP_LABELS[key],
      count: Object.keys(CHROME_PROPERTIES[key]).length,
    })),
    ...(selected === "card" ? [{ id: TYPOGRAPHY_ID, title: "Typography", count: 1 }] : []),
    ...(selected === "card"
      ? (Object.keys(CARD_PROPERTIES) as Array<keyof typeof CARD_PROPERTIES>).map((key) => ({
          id: `${CARD_ID_PREFIX}${key}`,
          title: CARD_GROUP_LABELS[key],
          count: Object.keys(CARD_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "table"
      ? (Object.keys(TABLE_PROPERTIES) as Array<keyof typeof TABLE_PROPERTIES>).map((key) => ({
          id: `${TABLE_ID_PREFIX}${key}`,
          title: TABLE_GROUP_LABELS[key],
          count: Object.keys(TABLE_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "matrix"
      ? (Object.keys(MATRIX_PROPERTIES) as Array<keyof typeof MATRIX_PROPERTIES>).map((key) => ({
          id: `${MATRIX_ID_PREFIX}${key}`,
          title: MATRIX_GROUP_LABELS[key],
          count: Object.keys(MATRIX_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "pie"
      ? (Object.keys(PIE_CHART_PROPERTIES) as Array<keyof typeof PIE_CHART_PROPERTIES>).map((key) => ({
          id: `${PIE_CHART_ID_PREFIX}${key}`,
          title: PIE_CHART_GROUP_LABELS[key],
          count: Object.keys(PIE_CHART_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "bar"
      ? (Object.keys(BAR_CHART_PROPERTIES) as Array<keyof typeof BAR_CHART_PROPERTIES>).map((key) => ({
          id: `${BAR_CHART_ID_PREFIX}${key}`,
          title: BAR_CHART_GROUP_LABELS[key],
          count: Object.keys(BAR_CHART_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "column"
      ? (Object.keys(COLUMN_CHART_PROPERTIES) as Array<keyof typeof COLUMN_CHART_PROPERTIES>).map((key) => ({
          id: `${COLUMN_CHART_ID_PREFIX}${key}`,
          title: COLUMN_CHART_GROUP_LABELS[key],
          count: Object.keys(COLUMN_CHART_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "stackedBar"
      ? (Object.keys(STACKED_BAR_CHART_PROPERTIES) as Array<keyof typeof STACKED_BAR_CHART_PROPERTIES>).map((key) => ({
          id: `${STACKED_BAR_CHART_ID_PREFIX}${key}`,
          title: STACKED_BAR_CHART_GROUP_LABELS[key],
          count: Object.keys(STACKED_BAR_CHART_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "stackedColumn"
      ? (Object.keys(STACKED_COLUMN_CHART_PROPERTIES) as Array<keyof typeof STACKED_COLUMN_CHART_PROPERTIES>).map((key) => ({
          id: `${STACKED_COLUMN_CHART_ID_PREFIX}${key}`,
          title: STACKED_COLUMN_CHART_GROUP_LABELS[key],
          count: Object.keys(STACKED_COLUMN_CHART_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "line"
      ? (Object.keys(LINE_CHART_PROPERTIES) as Array<keyof typeof LINE_CHART_PROPERTIES>).map((key) => ({
          id: `${LINE_CHART_ID_PREFIX}${key}`,
          title: LINE_CHART_GROUP_LABELS[key],
          count: Object.keys(LINE_CHART_PROPERTIES[key]).length,
        }))
      : []),
    ...(selected === "slicer"
      ? (Object.keys(SLICER_PROPERTIES) as Array<keyof typeof SLICER_PROPERTIES>).map((key) => ({
          id: `${SLICER_ID_PREFIX}${key}`,
          title: SLICER_GROUP_LABELS[key],
          count: Object.keys(SLICER_PROPERTIES[key]).length,
        }))
      : []),
  ];

  const globalOptionsGroupKeys = Object.keys(GLOBAL_OPTIONS_PROPERTIES) as Array<keyof typeof GLOBAL_OPTIONS_PROPERTIES>;
  const globalGroups: GroupMeta[] = globalOptionsGroupKeys.map((key) => ({
    id: `${GLOBAL_OPTIONS_ID_PREFIX}${key}`,
    title: GLOBAL_OPTIONS_GROUP_LABELS[key],
    count: Object.keys(GLOBAL_OPTIONS_PROPERTIES[key]).length,
  }));

  const activeGroups = tab === "theme" ? themeGroups : tab === "global" ? globalGroups : visualGroups;
  const openGroup = openGroupId ? activeGroups.find((group) => group.id === openGroupId) : undefined;

  function renderGroupContent(id: string): ReactNode {
    if (id === THEME_IDENTITY_ID) {
      return (
        <div className="property-group__body">
          <label className="text-property">
            <span>Name</span>
            <input
              type="text"
              value={typeof theme.name === "string" ? theme.name : resolved.name}
              onChange={(event) => onChange(["name"], event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (id === SHARED_COLOURS_ID) {
      return (
        <div className="property-group__body">
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
        </div>
      );
    }

    if (id === DATA_PALETTE_ID) {
      return (
        <div className="property-group__body">
          <div className="palette-editor">
            {resolved.palette.slice(0, 5).map((color, index) => (
              <label className="palette-editor__item" key={`${color}-${index}`}>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => onChange(["dataColors", index], event.target.value.toUpperCase())}
                  aria-label={`Data colour ${index + 1}`}
                />
                <span style={{ backgroundColor: color }} />
                <small>{index + 1}</small>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (id === TYPOGRAPHY_ID) {
      return (
        <div className="property-group__body">
          <div className="property-row">
            <span className="property-row__copy">
              <span className="property-row__label">Callout size (global default)</span>
            </span>
            <span className="property-row__control">
              <NumberControl
                value={resolved.calloutSize}
                min={18}
                max={48}
                onChange={(value) => onChange(["textClasses", "callout", "fontSize"], value)}
              />
            </span>
          </div>
        </div>
      );
    }

    if (id.startsWith(CHROME_ID_PREFIX)) {
      const key = id.slice(CHROME_ID_PREFIX.length) as keyof typeof CHROME_PROPERTIES;
      const sharedTab = tab === "theme";
      return (
        <RegistryGroupBody
          theme={theme}
          group={CHROME_PROPERTIES[key]}
          groupValues={sharedTab ? sharedChromeStyle[key] : chromeStyle[key]}
          pathPrefix={sharedTab ? "visualStyles.*.*" : `visualStyles.${activeVisualSchemaKey}.*`}
          getThemePath={(definition) => chromeThemePath(sharedTab ? "*" : activeVisualSchemaKey, definition)}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id === SEMANTIC_COLORS_ID) {
      return (
        <RegistryGroupBody
          theme={theme}
          group={THEME_COLOR_PROPERTIES}
          groupValues={resolveThemeColors(theme, resolved)}
          pathPrefix="theme"
          getThemePath={themeGlobalThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id === TEXT_CLASSES_ID) {
      return (
        <RegistryGroupBody
          theme={theme}
          group={TEXT_CLASS_PROPERTIES}
          groupValues={resolveTextClasses(theme, resolved)}
          pathPrefix="theme.textClasses"
          getThemePath={themeGlobalThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(GLOBAL_OPTIONS_ID_PREFIX)) {
      const key = id.slice(GLOBAL_OPTIONS_ID_PREFIX.length) as keyof typeof GLOBAL_OPTIONS_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={GLOBAL_OPTIONS_PROPERTIES[key]}
          groupValues={globalOptionsStyle[key]}
          pathPrefix={key.startsWith("report") ? "visualStyles.report.*" : "visualStyles.page.*"}
          getThemePath={globalOptionsPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(TABLE_ID_PREFIX)) {
      const key = id.slice(TABLE_ID_PREFIX.length) as keyof typeof TABLE_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={TABLE_PROPERTIES[key]}
          groupValues={tableStyle[key]}
          pathPrefix="visualStyles.tableEx.*"
          getThemePath={tablePropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(MATRIX_ID_PREFIX)) {
      const key = id.slice(MATRIX_ID_PREFIX.length) as keyof typeof MATRIX_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={MATRIX_PROPERTIES[key]}
          groupValues={matrixStyle[key]}
          pathPrefix="visualStyles.pivotTable.*"
          getThemePath={matrixPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(PIE_CHART_ID_PREFIX)) {
      const key = id.slice(PIE_CHART_ID_PREFIX.length) as keyof typeof PIE_CHART_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={PIE_CHART_PROPERTIES[key]}
          groupValues={pieChartStyle[key]}
          pathPrefix="visualStyles.pieChart.*"
          getThemePath={pieChartPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(BAR_CHART_ID_PREFIX)) {
      const key = id.slice(BAR_CHART_ID_PREFIX.length) as keyof typeof BAR_CHART_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={BAR_CHART_PROPERTIES[key]}
          groupValues={barChartStyle[key]}
          pathPrefix="visualStyles.clusteredBarChart.*"
          getThemePath={barChartPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(COLUMN_CHART_ID_PREFIX)) {
      const key = id.slice(COLUMN_CHART_ID_PREFIX.length) as keyof typeof COLUMN_CHART_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={COLUMN_CHART_PROPERTIES[key]}
          groupValues={columnChartStyle[key]}
          pathPrefix="visualStyles.clusteredColumnChart.*"
          getThemePath={columnChartPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(STACKED_BAR_CHART_ID_PREFIX)) {
      const key = id.slice(STACKED_BAR_CHART_ID_PREFIX.length) as keyof typeof STACKED_BAR_CHART_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={STACKED_BAR_CHART_PROPERTIES[key]}
          groupValues={stackedBarChartStyle[key]}
          pathPrefix="visualStyles.barChart.*"
          getThemePath={stackedBarChartPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(STACKED_COLUMN_CHART_ID_PREFIX)) {
      const key = id.slice(STACKED_COLUMN_CHART_ID_PREFIX.length) as keyof typeof STACKED_COLUMN_CHART_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={STACKED_COLUMN_CHART_PROPERTIES[key]}
          groupValues={stackedColumnChartStyle[key]}
          pathPrefix="visualStyles.columnChart.*"
          getThemePath={stackedColumnChartPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(LINE_CHART_ID_PREFIX)) {
      const key = id.slice(LINE_CHART_ID_PREFIX.length) as keyof typeof LINE_CHART_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={LINE_CHART_PROPERTIES[key]}
          groupValues={lineChartStyle[key]}
          pathPrefix="visualStyles.lineChart.*"
          getThemePath={lineChartPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(CARD_ID_PREFIX)) {
      const key = id.slice(CARD_ID_PREFIX.length) as keyof typeof CARD_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={CARD_PROPERTIES[key]}
          groupValues={cardStyle[key]}
          pathPrefix="visualStyles.card.*"
          getThemePath={cardPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    if (id.startsWith(SLICER_ID_PREFIX)) {
      const key = id.slice(SLICER_ID_PREFIX.length) as keyof typeof SLICER_PROPERTIES;
      return (
        <RegistryGroupBody
          theme={theme}
          group={SLICER_PROPERTIES[key]}
          groupValues={slicerStyle[key]}
          pathPrefix="visualStyles.slicer.*"
          getThemePath={slicerPropertyThemePath}
          onChange={onChange}
          onReset={onReset}
        />
      );
    }

    return null;
  }

  return (
    <aside className="properties-panel" aria-label="Theme property editor">
      <div className="properties-panel__header">
        <div>
          <span className="eyebrow">Properties</span>
          <h2>{visualNames[selected]}</h2>
        </div>
        <span className="selection-dot" title="Selected visual" />
      </div>

      <div className="properties-panel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "visual"}
          className={`properties-panel__tab${tab === "visual" ? " is-active" : ""}`}
          onClick={() => setTab("visual")}
        >
          {visualNames[selected]}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "theme"}
          className={`properties-panel__tab${tab === "theme" ? " is-active" : ""}`}
          onClick={() => setTab("theme")}
        >
          Theme
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "global"}
          className={`properties-panel__tab${tab === "global" ? " is-active" : ""}`}
          onClick={() => setTab("global")}
        >
          Global options
        </button>
      </div>

      <div className="properties-panel__scroll">
        {openGroup ? (
          <GroupDetail title={openGroup.title} onBack={() => setOpenGroupId(null)}>
            {renderGroupContent(openGroup.id)}
          </GroupDetail>
        ) : (
          <GroupList groups={activeGroups} onOpen={setOpenGroupId} />
        )}
      </div>
    </aside>
  );
}
