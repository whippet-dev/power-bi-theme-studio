# Visual names used in JSON

Power BI's on-screen visual name and its JSON name are sometimes different.
Use the JSON name as the first key inside `visualStyles`.

## Common visuals

| Name shown to users | Name used in theme JSON |
| --- | --- |
| Clustered bar chart | `clusteredBarChart` |
| Clustered column chart | `clusteredColumnChart` |
| Stacked bar chart | `barChart` |
| Stacked column chart | `columnChart` |
| Line chart | `lineChart` |
| Pie chart | `pieChart` |
| Card | `card` |
| Table | `tableEx` |
| Matrix | `pivotTable` |
| Slicer | `slicer` |
| Shape | `shape` |
| Button | `actionButton` |
| Bookmark navigator | `bookmarkNavigator` |
| Page navigator | `pageNavigator` |
| Text box | `textbox` |
| Image | `image` |

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

For a visual not listed here:

1. Create a blank report containing that visual.
2. Change one obvious formatting setting.
3. Export the current theme from Power BI Desktop.
4. Search the exported file for the value you changed.

Microsoft's published report-theme schema also lists the accepted visual
names, but it is written as a technical reference rather than a user guide.

::: warning Names can change as visuals change
New and preview visuals can use different names from the older built-in
visuals. Test the result in the version of Power BI Desktop your organisation
uses.
:::
