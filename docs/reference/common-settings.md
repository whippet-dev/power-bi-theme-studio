# Frequently used settings

These are useful starting points rather than a list of every property Power BI
supports.

The paths below use dots to make them easy to read. For example,
`title[0].fontSize` means the `fontSize` property inside the first item in the
`title` list.

## Shared visual settings

Place these under `visualStyles` → `"*"` → `"*"` to affect every supported
visual, or under a specific visual name for an exception.

| What you want to change | Setting path | Value |
| --- | --- | --- |
| Show the title | `title[0].show` | `true` or `false` |
| Title wording | `title[0].text` | Text |
| Title colour | `title[0].fontColor` | Colour |
| Title font | `title[0].fontFamily` | Text |
| Title size | `title[0].fontSize` | Number |
| Show the subtitle | `subTitle[0].show` | `true` or `false` |
| Visual background | `background[0].color` | Colour |
| Background transparency | `background[0].transparency` | 0–100 |
| Show the border | `border[0].show` | `true` or `false` |
| Border colour | `border[0].color` | Colour |
| Border width | `border[0].width` | Number |
| Rounded corners | `border[0].radius` | Number |

## Chart settings

These names are commonly used by bar, column and line charts. Check the visual
before assuming every chart supports every setting.

| What you want to change | Setting path |
| --- | --- |
| Show the legend | `legend[0].show` |
| Legend position | `legend[0].position` |
| Legend text colour | `legend[0].labelColor` |
| Show category axis | `categoryAxis[0].show` |
| Category label colour | `categoryAxis[0].labelColor` |
| Category label size | `categoryAxis[0].fontSize` |
| Show category title | `categoryAxis[0].showAxisTitle` |
| Show value axis | `valueAxis[0].show` |
| Value label colour | `valueAxis[0].labelColor` |
| Show gridlines | `valueAxis[0].gridlineShow` |
| Gridline colour | `valueAxis[0].gridlineColor` |
| Show data labels | `labels[0].show` |
| Data-label colour | `labels[0].color` |
| Data-label position | `labels[0].labelPosition` |

## Slicer settings

| What you want to change | Setting path |
| --- | --- |
| Show slicer header | `header[0].show` |
| Header text colour | `header[0].fontColor` |
| Header background | `header[0].background` |
| Item text colour | `items[0].fontColor` |
| Item background | `items[0].background` |
| Item text size | `items[0].textSize` |
| Show Select all | `selection[0].selectAllCheckboxEnabled` |
| Selection-marker colour | `selectionIcon[0].color` |
| Slider colour | `slider[0].color` |

## Table settings

| What you want to change | Setting path |
| --- | --- |
| Header text colour | `columnHeaders[0].fontColor` |
| Header background | `columnHeaders[0].backColor` |
| Header text size | `columnHeaders[0].fontSize` |
| Header alignment | `columnHeaders[0].alignment` |
| Value text colour | `values[0].fontColorPrimary` |
| Value background | `values[0].backColorPrimary` |
| Alternate row background | `values[0].backColorSecondary` |
| Wrap value text | `values[0].wordWrap` |

## Remember the colour wrapper

A setting described as **Colour** normally needs this shape:

```json
"fontColor": {
  "solid": {
    "color": "#252423"
  }
}
```
