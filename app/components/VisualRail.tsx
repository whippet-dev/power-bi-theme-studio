import type { VisualKind } from "./VisualPreviews";

type RailEntry = { id: VisualKind; label: string; monogram: string };

const RAIL_VISUALS: RailEntry[] = [
  { id: "card", label: "Card", monogram: "C" },
  { id: "bar", label: "Bar chart", monogram: "B" },
  { id: "column", label: "Column chart", monogram: "Co" },
  { id: "stackedBar", label: "Stacked bar chart", monogram: "SB" },
  { id: "stackedColumn", label: "Stacked column chart", monogram: "SC" },
  { id: "line", label: "Line chart", monogram: "L" },
  { id: "table", label: "Table", monogram: "T" },
  { id: "matrix", label: "Matrix", monogram: "M" },
  { id: "pie", label: "Pie chart", monogram: "P" },
  { id: "slicer", label: "Slicer", monogram: "S" },
  { id: "shape", label: "Shape", monogram: "Sh" },
  { id: "actionButton", label: "Action button", monogram: "AB" },
  { id: "bookmarkNavigator", label: "Bookmark navigator", monogram: "BN" },
  { id: "pageNavigator", label: "Page navigator", monogram: "PN" },
  { id: "textbox", label: "Textbox", monogram: "Tx" },
  { id: "image", label: "Image", monogram: "Im" },
];

type VisualRailProps = {
  visibility: Record<VisualKind, boolean>;
  selected: VisualKind;
  onSelect: (id: VisualKind) => void;
  onToggleVisible: (id: VisualKind) => void;
};

/**
 * Left-hand rail: pick which visuals are on the canvas at all (the check
 * toggle), and which of those is shown large right now (clicking the row).
 * At least one visual must stay on the canvas — ThemeStudio's toggle
 * handler enforces that, this component just reflects whatever state it's
 * given.
 */
export function VisualRail({ visibility, selected, onSelect, onToggleVisible }: VisualRailProps) {
  return (
    <nav className="visual-rail" aria-label="Visuals on canvas">
      {RAIL_VISUALS.map((entry) => {
        const isVisible = visibility[entry.id];
        const isSelected = isVisible && selected === entry.id;
        return (
          <div className={`visual-rail__item${isSelected ? " is-selected" : ""}${isVisible ? "" : " is-hidden"}`} key={entry.id}>
            <button
              type="button"
              className="visual-rail__focus"
              onClick={() => onSelect(entry.id)}
              disabled={!isVisible}
              aria-pressed={isSelected}
              aria-label={`Show ${entry.label} large`}
            >
              <span className="visual-rail__monogram" aria-hidden="true">{entry.monogram}</span>
              <span className="visual-rail__name">{entry.label}</span>
            </button>
            <button
              type="button"
              className="visual-rail__toggle"
              onClick={() => onToggleVisible(entry.id)}
              aria-pressed={isVisible}
              aria-label={isVisible ? `Remove ${entry.label} from the canvas` : `Add ${entry.label} to the canvas`}
              title={isVisible ? "On canvas" : "Hidden"}
            >
              {isVisible && "✓"}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
