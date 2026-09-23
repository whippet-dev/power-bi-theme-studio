# The shape of a theme file

A Power BI theme is one JSON file. The file can be very small or contain
thousands of settings. You only need to include the things you want your theme
to control.

## The main parts

```text
Theme
├── name                    the theme's name
├── dataColors              the chart colour palette
├── background              main light background colour
├── foreground              main dark text and element colour
├── tableAccent             accent colour for tables and matrices
├── other shared colours    secondary text, borders and highlights
├── textClasses             reusable text styles
└── visualStyles            formatting for visuals
```

Only `name` is required. Everything else is optional, and anything you leave
out keeps Power BI's normal look.

## Theme name

```json
{
  "name": "Quarterly reporting theme"
}
```

Choose a name that helps people identify the theme in Power BI. The name does
not have to match the filename.

## Chart palette

`dataColors` is the sequence Power BI uses for chart series and categories.

```json
{
  "name": "Quarterly reporting theme",
  "dataColors": [
    "#005EA5",
    "#28A197",
    "#F47738",
    "#912B88"
  ]
}
```

Power BI starts with the first colour and moves through the list as more
series are added.

## Shared colours

Shared colours influence many parts of a report. They are useful for setting
the overall light or dark character of a theme.

```json
{
  "name": "Quarterly reporting theme",
  "background": "#FFFFFF",
  "foreground": "#252423",
  "foregroundNeutralSecondary": "#605E5C",
  "backgroundLight": "#F3F2F1",
  "tableAccent": "#005EA5"
}
```

Because these colours are shared, changing one can affect several visual
elements. Use a visual-specific setting when you only want to change one type
of visual.

## Reusable text styles

`textClasses` lets you set broad text styles in one place.

```json
{
  "name": "Quarterly reporting theme",
  "textClasses": {
    "title": {
      "fontFace": "Segoe UI Semibold",
      "fontSize": 14,
      "color": "#252423"
    },
    "label": {
      "fontFace": "Segoe UI",
      "fontSize": 10,
      "color": "#605E5C"
    }
  }
}
```

Text classes are broad suggestions used by many visuals, but not by all text.
On bar, column and line charts, for example, the axis labels keep a fixed size
whatever you set for `label`. If you need a precise result for a particular
element, set that element in `visualStyles` instead.

## Visual formatting

`visualStyles` contains settings for visual titles, axes, legends, labels,
slicers, tables and more.

```json
{
  "name": "Quarterly reporting theme",
  "visualStyles": {
    "clusteredColumnChart": {
      "*": {
        "legend": [
          {
            "show": true,
            "position": "Top"
          }
        ]
      }
    }
  }
}
```

Read this as:

> For every clustered column chart, show its legend at the top.

The next page explains each layer of this section.

## A fuller example

```json
{
  "name": "Quarterly reporting theme",
  "dataColors": ["#005EA5", "#28A197", "#F47738", "#912B88"],
  "background": "#FFFFFF",
  "foreground": "#252423",
  "foregroundNeutralSecondary": "#605E5C",
  "backgroundLight": "#F3F2F1",
  "tableAccent": "#005EA5",
  "textClasses": {
    "title": {
      "fontFace": "Segoe UI Semibold",
      "fontSize": 14,
      "color": "#252423"
    }
  },
  "visualStyles": {
    "*": {
      "*": {
        "title": [
          {
            "show": true,
            "fontFamily": "Segoe UI Semibold",
            "fontSize": 14
          }
        ]
      }
    },
    "clusteredColumnChart": {
      "*": {
        "legend": [
          {
            "show": true,
            "position": "Top"
          }
        ]
      }
    }
  }
}
```

You do not need to write a large theme all at once. Start with the palette and
one or two shared settings, then add visual formatting as it is needed.
