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
    "alignment": "left",
    "wordWrap": true
  }
]
```

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

Primary and secondary colours are used for alternating rows when banded rows
are enabled.

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
          "alignment": "left",
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
