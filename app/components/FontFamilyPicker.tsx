import { useId, useState } from "react";
import { filterFontFamilyOptions } from "../lib/propertyEditorPresentation";

type FontFamilyPickerProps = {
  value: string;
  label: string;
  onChange: (value: string) => void;
};

/**
 * A deliberately small combobox for literal Power BI font-family values.
 * It never translates a value: suggestions are friendly literals, while an
 * imported custom or raw stack remains the exact value the theme provided.
 */
export function FontFamilyPicker({ value, label, onChange }: FontFamilyPickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [preservedValue, setPreservedValue] = useState(value);
  const [hasEditedQuery, setHasEditedQuery] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Opening is a browse action: start with every friendly choice and keep an
  // imported literal local to this picker. Filtering only begins after the
  // user types, so a current DIN value never hides choices such as Arial.
  const options = filterFontFamilyOptions(hasEditedQuery ? query : "", preservedValue);
  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;

  const openList = () => {
    setQuery(value);
    setPreservedValue(value);
    setHasEditedQuery(false);
    setOpen(true);
    setActiveIndex(filterFontFamilyOptions("", value).indexOf(value));
  };

  const select = (font: string) => {
    onChange(font);
    setQuery(font);
    setOpen(false);
    setHasEditedQuery(false);
    setActiveIndex(-1);
  };

  return (
    <span className="font-picker">
      <input
        className="text-control font-picker__input"
        type="text"
        role="combobox"
        value={open ? query : value}
        aria-label={label}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={activeOption ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        onFocus={openList}
        onBlur={() => {
          setOpen(false);
          // The text field commits custom literals like the editor's other
          // text controls. Once it loses focus, treat that literal as the
          // current value for the next time the suggestion list is opened.
          setQuery(query);
          setPreservedValue(query);
          setHasEditedQuery(false);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setPreservedValue(next);
          setOpen(true);
          setHasEditedQuery(true);
          setActiveIndex(-1);
          // Match every other text property: a custom literal is written as
          // typed. Selecting a suggestion below writes its exact literal.
          onChange(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) setOpen(true);
            setActiveIndex((index) => Math.min(options.length - 1, index + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) setOpen(true);
            setActiveIndex((index) => Math.max(0, index <= 0 ? 0 : index - 1));
          } else if (event.key === "Enter" && open && activeOption) {
            event.preventDefault();
            select(activeOption);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery(value);
            setHasEditedQuery(false);
            setActiveIndex(-1);
          }
        }}
      />
      {open && (
        <span className="font-picker__menu" id={listId} role="listbox" aria-label={`${label} suggestions`}>
          {options.length ? (
            options.map((font, index) => (
              <button
                type="button"
                className={`font-picker__option${index === activeIndex ? " is-active" : ""}`}
                id={`${listId}-${index}`}
                key={font}
                role="option"
                aria-selected={font === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(font)}
              >
                {font}
              </button>
            ))
          ) : (
            <span className="font-picker__empty">No matching fonts. Press Tab to keep this custom value.</span>
          )}
        </span>
      )}
    </span>
  );
}
