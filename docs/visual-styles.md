# Format individual visuals

Most detailed theme work happens inside `visualStyles`. The structure looks
complicated at first, but it follows the same pattern throughout the file.

## The four layers

```json
"visualStyles": {
  "clusteredColumnChart": {
    "*": {
      "legend": [
        {
          "show": true
        }
      ]
    }
  }
}
```

<div class="path-breakdown">

1. **`clusteredColumnChart`** — the kind of visual to format.
2. **`*`** — apply the settings to every visual of that kind, using its normal
   style.
3. **`legend`** — the part of the visual to format.
4. **`[ { ... } ]`** — the settings for that part.

</div>

In plain English:

> On every clustered column chart, show the legend.

## Apply a setting to every visual

Use `"*"` as the visual name when a setting should apply broadly:

```json
"visualStyles": {
  "*": {
    "*": {
      "background": [
        {
          "show": true,
          "color": {
            "solid": {
              "color": "#FFFFFF"
            }
          },
          "transparency": 0
        }
      ]
    }
  }
}
```

This is useful for the parts every visual shares. The JSON name for each is
shown in brackets:

- Visual title (`title`)
- Subtitle (`subTitle`)
- Background (`background`)
- Border (`border`)
- Shadow (`dropShadow`)
- Padding (`padding`)
- Visual header icons (`visualHeader`)
- Tooltips (`visualTooltip`)

::: warning A shared background also colours your pages
Power BI uses a `background` placed under `"*"` → `"*"` for the report pages
too, not just for the visuals on them. Choose a coloured background here and
the page behind your visuals will change to match. This shows in Power BI as
the page's **Canvas background** setting.

If you want pages to keep their own look, give them a background of their own.
Power BI uses this one for pages instead. This example keeps the page
see-through, so the wallpaper behind it shows:

```json
"visualStyles": {
  "page": {
    "*": {
      "background": [
        {
          "transparency": 100
        }
      ]
    }
  }
}
```

In a full theme, `"page"` sits alongside `"*"` inside `visualStyles`.
:::

## Add a visual-specific change

You can combine broad settings with settings for one visual type:

```json
"visualStyles": {
  "*": {
    "*": {
      "title": [
        {
          "show": true,
          "fontSize": 14
        }
      ]
    }
  },
  "clusteredColumnChart": {
    "*": {
      "title": [
        {
          "fontSize": 16
        }
      ],
      "legend": [
        {
          "show": true,
          "position": "Top"
        }
      ]
    }
  }
}
```

All visuals get a 14-point title. Clustered column charts get a 16-point title
and a legend at the top.

## Why the square brackets are there

Power BI stores each formatting section as a list, even when the list contains
only one item:

```json
"legend": [
  {
    "show": true
  }
]
```

Do not remove the square brackets. This is one of the most common causes of a
theme being rejected.

## Put several sections together

```json
"clusteredColumnChart": {
  "*": {
    "legend": [
      {
        "show": true,
        "position": "Top"
      }
    ],
    "categoryAxis": [
      {
        "show": true,
        "labelColor": {
          "solid": {
            "color": "#505A5F"
          }
        }
      }
    ],
    "valueAxis": [
      {
        "show": true,
        "gridlineShow": true,
        "gridlineColor": {
          "solid": {
            "color": "#D8DDE0"
          }
        }
      }
    ],
    "labels": [
      {
        "show": false
      }
    ]
  }
}
```

Each section is separated by a comma and sits at the same level.

## Visual names are not always obvious

The name shown in Power BI is not always the name used in JSON. For example:

| Power BI visual | JSON name |
| --- | --- |
| Clustered column chart | `clusteredColumnChart` |
| Stacked column chart | `columnChart` |
| Clustered bar chart | `clusteredBarChart` |
| Stacked bar chart | `barChart` |
| Matrix | `pivotTable` |
| Table | `tableEx` |

See [Visual names used in JSON](./reference/visual-names) for the longer list.

## A safe way to work

1. Start with a theme that imports successfully.
2. Add one formatting section.
3. Import the theme and check the result.
4. Save a copy before adding the next section.

This makes it much easier to identify the setting that caused a problem.
