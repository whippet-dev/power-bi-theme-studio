import { VisualIcon } from "./VisualIcon";
import { VISUAL_CATALOG, type VisualKind } from "./visualCatalog";

type VisualRailProps = {
  selected: VisualKind;
  onSelect: (id: VisualKind) => void;
};

/** A single-selection picker: every supported visual always remains available. */
export function VisualRail({ selected, onSelect }: VisualRailProps) {
  return (
    <nav className="visual-rail" aria-label="Visual previews">
      {VISUAL_CATALOG.map((entry) => {
        const isSelected = selected === entry.id;
        return (
          <button
            type="button"
            className={`visual-rail__item${isSelected ? " is-selected" : ""}`}
            key={entry.id}
            onClick={() => onSelect(entry.id)}
            aria-pressed={isSelected}
          >
            <VisualIcon kind={entry.id} />
            <span className="visual-rail__name">{entry.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
