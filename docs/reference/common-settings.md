# Frequently used settings

These are useful starting points rather than a list of every property Power BI
supports.

Each entry shows the section and the setting inside it. For example,
`title` → `fontSize` means the `fontSize` setting inside the `title` section:

```json
"title": [
  {
    "fontSize": 14
  }
]
```

## Shared visual settings

Place these under `visualStyles` → `"*"` → `"*"` to affect every supported
visual, or under a specific visual name for an exception.

| What you want to change | Where it goes | Value |
| --- | --- | --- |
| Show the title | `title` → `show` | `true` or `false` |
| Title wording | `title` → `text` | Text |
| Title colour | `title` → `fontColor` | Colour |
| Title font | `title` → `fontFamily` | Text |
| Title size | `title` → `fontSize` | Number |
| Show the subtitle | `subTitle` → `show` | `true` or `false` |
| Visual background | `background` → `color` | Colour |
| Background transparency | `background` → `transparency` | 0–100 |
| Show the border | `border` → `show` | `true` or `false` |
| Border colour | `border` → `color` | Colour |
| Border width | `border` → `width` | Number |
| Rounded corners | `border` → `radius` | Number |

A shared `background` is also used for the report pages, not just the visuals.
See [A shared background also colours your pages](../visual-styles#apply-a-setting-to-every-visual).

## Chart settings

These names are commonly used by bar, column and line charts. Check the visual
before assuming every chart supports every setting.

| What you want to change | Where it goes |
| --- | --- |
| Show the legend | `legend` → `show` |
| Legend position | `legend` → `position` |
| Legend text colour | `legend` → `labelColor` |
| Show category axis | `categoryAxis` → `show` |
| Category label colour | `categoryAxis` → `labelColor` |
| Category label size | `categoryAxis` → `fontSize` |
| Show category title | `categoryAxis` → `showAxisTitle` |
| Show value axis | `valueAxis` → `show` |
| Value label colour | `valueAxis` → `labelColor` |
| Show gridlines | `valueAxis` → `gridlineShow` |
| Gridline colour | `valueAxis` → `gridlineColor` |
| Show data labels | `labels` → `show` |
| Data-label colour | `labels` → `color` |
| Data-label position | `labels` → `labelPosition` |

## Slicer settings

| What you want to change | Where it goes |
| --- | --- |
| Show slicer header | `header` → `show` |
| Header text colour | `header` → `fontColor` |
| Header background | `header` → `background` |
| Item text colour | `items` → `fontColor` |
| Item background | `items` → `background` |
| Item text size | `items` → `textSize` |
| Show Select all | `selection` → `selectAllCheckboxEnabled` |
| Selection-marker colour | `selectionIcon` → `color` |
| Slider colour | `slider` → `color` |

## Table settings

| What you want to change | Where it goes |
| --- | --- |
| Header text colour | `columnHeaders` → `fontColor` |
| Header background | `columnHeaders` → `backColor` |
| Header text size | `columnHeaders` → `fontSize` |
| Header alignment | `columnHeaders` → `alignment` |
| Value text colour | `values` → `fontColorPrimary` |
| Value background | `values` → `backColorPrimary` |
| Alternate row background | `values` → `backColorSecondary` |
| Wrap value text | `values` → `wordWrap` |

## Remember the colour wrapper

A setting described as **Colour** normally needs this shape:

```json
"fontColor": {
  "solid": {
    "color": "#252423"
  }
}
```
