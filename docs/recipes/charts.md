# Charts, axes and legends

This example uses a clustered column chart. Other bar, column and line charts
use many of the same setting names, but the visual name at the start will be
different.

## Show and position the legend

```json
"legend": [
  {
    "show": true,
    "position": "Top",
    "fontFamily": "Segoe UI",
    "fontSize": 10,
    "labelColor": {
      "solid": {
        "color": "#505A5F"
      }
    },
    "showTitle": true,
    "titleText": "Channel"
  }
]
```

| Position | JSON value |
| --- | --- |
| Top left | `Top` |
| Top centre | `TopCenter` |
| Top right | `TopRight` |
| Bottom left | `Bottom` |
| Bottom centre | `BottomCenter` |
| Bottom right | `BottomRight` |
| Centre left | `LeftCenter` |
| Centre right | `RightCenter` |

## Format the category axis

On a column chart, the category axis normally runs along the bottom.

```json
"categoryAxis": [
  {
    "show": true,
    "fontFamily": "Segoe UI",
    "fontSize": 9,
    "labelColor": { "solid": { "color": "#505A5F" } },
    "showAxisTitle": true,
    "titleText": "Region",
    "titleFontFamily": "Segoe UI Semibold",
    "titleFontSize": 11,
    "titleColor": { "solid": { "color": "#252423" } }
  }
]
```

## Format the value axis and gridlines

```json
"valueAxis": [
  {
    "show": true,
    "fontFamily": "Segoe UI",
    "fontSize": 9,
    "labelColor": { "solid": { "color": "#505A5F" } },
    "labelDisplayUnits": 1000,
    "labelPrecision": 0,
    "gridlineShow": true,
    "gridlineColor": { "solid": { "color": "#D8DDE0" } },
    "gridlineThickness": 1,
    "gridlineStyle": "solid"
  }
]
```

- `labelDisplayUnits` shortens large numbers, for example showing 25,000 as
  25K. Choose a value from the table below.
- `labelPrecision` is the number of decimal places shown. `0` shows whole
  numbers; `2` shows two decimal places.
- `gridlineStyle` is the line pattern: `solid`, `dashed` or `dotted`.

| Display | Value |
| --- | ---: |
| Automatic | `0` |
| No shortening | `1` |
| Thousands | `1000` |
| Millions | `1000000` |
| Billions | `1000000000` |

## Show data labels

```json
"labels": [
  {
    "show": true,
    "fontFamily": "Segoe UI",
    "fontSize": 9,
    "color": { "solid": { "color": "#252423" } },
    "labelPosition": "OutsideEnd",
    "labelDisplayUnits": 1000,
    "labelPrecision": 0
  }
]
```

`labelPosition` says where each label sits against its column:

| Position | JSON value |
| --- | --- |
| Power BI decides | `Auto` |
| Just above the column | `OutsideEnd` |
| Inside the top of the column | `InsideEnd` |
| In the middle of the column | `InsideCenter` |
| Inside the bottom of the column | `InsideBase` |

## Complete clustered column example

```json
"visualStyles": {
  "clusteredColumnChart": {
    "*": {
      "legend": [
        {
          "show": true,
          "position": "Top",
          "showTitle": true,
          "titleText": "Channel"
        }
      ],
      "categoryAxis": [
        {
          "show": true,
          "labelColor": { "solid": { "color": "#505A5F" } },
          "showAxisTitle": true,
          "titleText": "Region"
        }
      ],
      "valueAxis": [
        {
          "show": true,
          "labelColor": { "solid": { "color": "#505A5F" } },
          "gridlineShow": true,
          "gridlineColor": { "solid": { "color": "#D8DDE0" } }
        }
      ],
      "labels": [
        {
          "show": true,
          "labelPosition": "OutsideEnd"
        }
      ]
    }
  }
}
```

::: tip Bar charts swap the physical axes
For bar charts, categories usually appear on the left and values along the
bottom. The JSON still uses `categoryAxis` and `valueAxis`, which is more
reliable than thinking only in terms of X and Y.
:::
