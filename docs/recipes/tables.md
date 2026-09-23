# Tables and matrices

Tables and matrices use different JSON names, but both let you format headers,
values, totals and grid lines.

- Table: `tableEx`
- Matrix: `pivotTable`

## Style table column headers

```json
"columnHeaders": [
  {
    "fontFamily": "Segoe UI Semibold",
    "fontSize": 10,
    "fontColor": {
      "solid": {
        "color": "#FFFFFF"
      }
    },
    "backColor": {
      "solid": {
        "color": "#005EA5"
      }
    },
    "alignment": "Left",
    "wordWrap": true
  }
]
```

::: tip Capital letters matter
Table header alignment uses capitalised choices: `Auto`, `Left`, `Center` or
`Right`. Visual titles use lower-case ones (`left`, `center`, `right`). Power BI
checks the exact spelling, so copy the value from the example for the setting
you are changing.
:::

## Style the values

```json
"values": [
  {
    "fontFamily": "Segoe UI",
    "fontSize": 10,
    "fontColorPrimary": {
      "solid": {
        "color": "#252423"
      }
    },
    "backColorPrimary": {
      "solid": {
        "color": "#FFFFFF"
      }
    },
    "fontColorSecondary": {
      "solid": {
        "color": "#252423"
      }
    },
    "backColorSecondary": {
      "solid": {
        "color": "#F3F2F1"
      }
    },
    "wordWrap": false
  }
]
```

Power BI alternates between the two sets of colours, row by row. The
**primary** colours are used for the first, third and fifth rows, and the
**secondary** colours for the rows in between. Give both the same background if
you do not want a striped table.

## Put the table example together

```json
"visualStyles": {
  "tableEx": {
    "*": {
      "columnHeaders": [
        {
          "fontFamily": "Segoe UI Semibold",
          "fontSize": 10,
          "fontColor": { "solid": { "color": "#FFFFFF" } },
          "backColor": { "solid": { "color": "#005EA5" } },
          "alignment": "Left",
          "wordWrap": true
        }
      ],
      "values": [
        {
          "fontFamily": "Segoe UI",
          "fontSize": 10,
          "fontColorPrimary": { "solid": { "color": "#252423" } },
          "backColorPrimary": { "solid": { "color": "#FFFFFF" } },
          "fontColorSecondary": { "solid": { "color": "#252423" } },
          "backColorSecondary": { "solid": { "color": "#F3F2F1" } }
        }
      ]
    }
  }
}
```

## Matrix-specific areas

A matrix adds row headers, subtotals and hierarchy controls. Common sections
include:

- `columnHeaders`
- `rowHeaders`
- `values`
- `subTotals`
- `total`
- `grid`

Do not copy a table section into a matrix without checking that the matrix
supports the same property names.
