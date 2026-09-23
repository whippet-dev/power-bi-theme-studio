# Slicers

Slicers have separate settings for the header, the list of items, selection
behaviour, search box, date controls and slider.

## Format the slicer header

```json
"header": [
  {
    "show": true,
    "fontFamily": "Segoe UI Semibold",
    "textSize": 10,
    "fontColor": {
      "solid": {
        "color": "#252423"
      }
    },
    "background": {
      "solid": {
        "color": "#FFFFFF"
      }
    }
  }
]
```

## Format the list items

```json
"items": [
  {
    "fontFamily": "Segoe UI",
    "textSize": 10,
    "fontColor": {
      "solid": {
        "color": "#252423"
      }
    },
    "background": {
      "solid": {
        "color": "#FFFFFF"
      }
    },
    "padding": 4
  }
]
```

## Choose how selection works

```json
"selection": [
  {
    "selectAllCheckboxEnabled": true,
    "singleSelect": false,
    "strictSingleSelect": false
  }
]
```

- `selectAllCheckboxEnabled` adds a **Select all** item.
- `singleSelect` controls whether Ctrl or Command is needed for multiple selections.
- `strictSingleSelect` limits the slicer to one selected item.

## Change the checkbox or radio-button colour

```json
"selectionIcon": [
  {
    "color": {
      "solid": {
        "color": "#005EA5"
      }
    }
  }
]
```

This controls selection markers. It does not control the eraser used to clear
the slicer.

## A note about the clear-selection eraser

The eraser in the standard slicer header does not have its own theme property.
Its stroke follows the shared root colour `foregroundNeutralSecondary`:

```json
"foregroundNeutralSecondary": "#605E5C"
```

Changing this root colour also changes several other secondary elements,
including axis and legend labels, slicer item text and some outlines. Avoid
changing it solely to fix one eraser icon without checking the rest of the
report.

The general visual-header icons above a selected visual are different. Their
colour is `visualHeader.foreground`.

## Complete slicer example

```json
"visualStyles": {
  "slicer": {
    "*": {
      "header": [
        {
          "show": true,
          "fontFamily": "Segoe UI Semibold",
          "textSize": 10,
          "fontColor": { "solid": { "color": "#252423" } },
          "background": { "solid": { "color": "#FFFFFF" } }
        }
      ],
      "items": [
        {
          "fontFamily": "Segoe UI",
          "textSize": 10,
          "fontColor": { "solid": { "color": "#252423" } },
          "background": { "solid": { "color": "#FFFFFF" } },
          "padding": 4
        }
      ],
      "selectionIcon": [
        {
          "color": { "solid": { "color": "#005EA5" } }
        }
      ]
    }
  }
}
```
