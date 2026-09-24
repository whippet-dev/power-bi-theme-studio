# Slicers

Slicers have separate settings for the header, the list of items, selection
behaviour, search box, date controls and slider.

::: warning The slicer style cannot be set by a theme
The setting that chooses a slicer's style (`data` → `mode`, for a vertical
list, tiles, a dropdown, Between, Relative Date and so on) is accepted in a
theme file without an error, but Power BI does not apply it: slicers keep their
usual style. Choose the style on each slicer in the Format pane instead. The
formatting on this page, such as fonts, colours and selection behaviour, does
work from a theme.
:::

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

The names in the file do not match the labels in Power BI's Format pane, so
here is how they line up:

| Format pane option | JSON name | What it does |
| --- | --- | --- |
| Show "Select all" option | `selectAllCheckboxEnabled` | Adds a **Select all** item to the list. |
| Multi-select with CTRL | `singleSelect` | People hold Ctrl (or Command on a Mac) to pick more than one item. |
| Single select | `strictSingleSelect` | Only one item can be picked at a time. If nothing is picked, Power BI picks the first item. |

::: tip Easy to mix up
Despite its name, `singleSelect` is the **Multi-select with CTRL** option. For a
slicer that allows only one choice, use `strictSingleSelect`.
:::

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

The eraser in the standard slicer header does not have a theme setting of its
own. In current versions of Power BI Desktop it takes its colour from the
shared root colour `foregroundNeutralSecondary`:

```json
"foregroundNeutralSecondary": "#605E5C"
```

Changing this root colour also changes many other secondary elements, such as
chart axis labels, legend text, data labels, subtitles and some outlines. Avoid
changing it just to recolour the eraser without checking the rest of the
report.

The visual-header icons that appear above a visual when you hover over it are
different. You can colour those directly with `visualHeader` → `foreground`.

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
