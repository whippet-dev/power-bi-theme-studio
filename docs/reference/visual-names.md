# Visual names used in JSON

Power BI's on-screen visual name and its JSON name are sometimes different.
Use the JSON name as the first key inside `visualStyles`.

## Common visuals

### Charts

| Name shown to users | Name used in theme JSON |
| --- | --- |
| Clustered bar chart | `clusteredBarChart` |
| Clustered column chart | `clusteredColumnChart` |
| Stacked bar chart | `barChart` |
| Stacked column chart | `columnChart` |
| 100% stacked bar chart | `hundredPercentStackedBarChart` |
| 100% stacked column chart | `hundredPercentStackedColumnChart` |
| Line chart | `lineChart` |
| Area chart | `areaChart` |
| Stacked area chart | `stackedAreaChart` |
| Line and clustered column chart | `lineClusteredColumnComboChart` |
| Line and stacked column chart | `lineStackedColumnComboChart` |
| Ribbon chart | `ribbonChart` |
| Waterfall chart | `waterfallChart` |
| Scatter chart | `scatterChart` |
| Pie chart | `pieChart` |
| Donut chart | `donutChart` |
| Funnel | `funnel` |
| Treemap | `treemap` |
| Gauge | `gauge` |

### Cards, tables and slicers

| Name shown to users | Name used in theme JSON |
| --- | --- |
| Card | `cardVisual` |
| Card (legacy) | `card` |
| Multi-row card | `multiRowCard` |
| KPI | `kpi` |
| Table | `tableEx` |
| Matrix | `pivotTable` |
| Slicer | `slicer` |

### Buttons, shapes and other objects

| Name shown to users | Name used in theme JSON |
| --- | --- |
| Shape | `shape` |
| Button | `actionButton` |
| Bookmark navigator | `bookmarkNavigator` |
| Page navigator | `pageNavigator` |
| Text box | `textbox` |
| Image | `image` |

::: tip Two different card visuals
Power BI has two card visuals: the current **Card** (`cardVisual`) and the
older **Card (legacy)** (`card`). Settings written for one do not affect the
other. If a card ignores your theme, check which one you are using.
:::

## Example

```json
"visualStyles": {
  "lineChart": {
    "*": {
      "legend": [
        {
          "show": true
        }
      ]
    }
  },
  "tableEx": {
    "*": {
      "columnHeaders": [
        {
          "bold": true
        }
      ]
    }
  }
}
```

## How to find an unfamiliar visual name

For a visual not listed here, open the
[complete settings catalogue](./settings-catalogue) and choose the visual by its
everyday name. The JSON name appears at the start of every setting path the
catalogue shows, straight after `visualStyles`.

::: warning Formatting a visual does not change the theme
If you format a visual directly in Power BI and then export the current theme,
your change will not be in the exported file. Formatting applied to one visual
is saved in the report, not in the theme. That is why exporting is not a
reliable way to discover a visual's JSON name.
:::

::: warning Names can change as visuals change
New and preview visuals can use different names from the older built-in
visuals. Test the result in the version of Power BI Desktop your organisation
uses.
:::
