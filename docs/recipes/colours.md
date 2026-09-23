# Colours and fonts

Colours and fonts are the best place to start because a small number of
settings can give the whole report a consistent identity.

## Set the chart palette

```json
{
  "name": "Organisation theme",
  "dataColors": [
    "#005EA5",
    "#28A197",
    "#F47738",
    "#912B88",
    "#FFDD00",
    "#85994B"
  ]
}
```

Put the most important and accessible colours first. They will appear most
often in charts with only a few series.

## Set the overall light and dark colours

```json
{
  "name": "Organisation theme",
  "background": "#FFFFFF",
  "foreground": "#252423",
  "foregroundNeutralSecondary": "#505A5F",
  "backgroundLight": "#F3F2F1",
  "tableAccent": "#005EA5"
}
```

These are shared colours. One value can influence many parts of a report, so
test several kinds of visual after changing them.

| Setting | Common use |
| --- | --- |
| `background` | Main light surfaces |
| `foreground` | Main text and dark elements |
| `foregroundNeutralSecondary` | Secondary labels, axes and outlines |
| `backgroundLight` | Gridlines and lighter surfaces |
| `tableAccent` | Table and selection accents |

## Set basic text styles

```json
"textClasses": {
  "title": {
    "fontFace": "Segoe UI Semibold",
    "fontSize": 14,
    "color": "#252423"
  },
  "header": {
    "fontFace": "Segoe UI Semibold",
    "fontSize": 12,
    "color": "#252423"
  },
  "label": {
    "fontFace": "Segoe UI",
    "fontSize": 10,
    "color": "#505A5F"
  }
}
```

Power BI visuals do not all use text classes in exactly the same way. Treat
them as a broad foundation, then use `visualStyles` where an exact visual
element matters.

## Use a consistent visual title

```json
"visualStyles": {
  "*": {
    "*": {
      "title": [
        {
          "show": true,
          "fontFamily": "Segoe UI Semibold",
          "fontSize": 14,
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
          "alignment": "left"
        }
      ]
    }
  }
}
```

## Check colour contrast

Do not rely on colour alone to explain meaning. Make sure text, icons and thin
lines remain easy to see against their backgrounds. Test the report at normal
size rather than only while zoomed in.

Be particularly careful when changing shared colours: the same colour can be
used by an axis label, a slicer item and a button outline.
