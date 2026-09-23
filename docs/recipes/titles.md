# Titles and visual backgrounds

Titles, backgrounds and borders are shared formatting sections. You can apply
them to every visual, then add exceptions for particular visual types.

## Style every visual title

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
          "alignment": "left",
          "titleWrap": true
        }
      ]
    }
  }
}
```

Leave out `text` if each visual should keep its own title. Setting `text` in a
shared rule would give every visual the same wording.

## Add a subtitle

```json
"subTitle": [
  {
    "show": true,
    "text": "Updated monthly",
    "fontFamily": "Segoe UI",
    "fontSize": 10,
    "fontColor": {
      "solid": {
        "color": "#505A5F"
      }
    },
    "alignment": "left",
    "titleWrap": true
  }
]
```

Use a shared subtitle only when the wording is genuinely suitable for every
visual. Otherwise place it under a specific visual name.

## Give visuals a white background

```json
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
```

`0` transparency is solid. `100` is fully transparent.

::: warning Check your pages too
When this background is placed under `"*"` → `"*"`, Power BI uses it for the
report pages as well as the visuals. See
[A shared background also colours your pages](../visual-styles#apply-a-setting-to-every-visual)
for how to keep pages separate.
:::

## Add a subtle border

```json
"border": [
  {
    "show": true,
    "color": {
      "solid": {
        "color": "#D8DDE0"
      }
    },
    "width": 1,
    "radius": 4
  }
]
```

## Complete shared example

```json
"visualStyles": {
  "*": {
    "*": {
      "title": [
        {
          "show": true,
          "fontFamily": "Segoe UI Semibold",
          "fontSize": 14,
          "fontColor": { "solid": { "color": "#252423" } },
          "alignment": "left",
          "titleWrap": true
        }
      ],
      "background": [
        {
          "show": true,
          "color": { "solid": { "color": "#FFFFFF" } },
          "transparency": 0
        }
      ],
      "border": [
        {
          "show": true,
          "color": { "solid": { "color": "#D8DDE0" } },
          "width": 1,
          "radius": 4
        }
      ]
    }
  }
}
```
