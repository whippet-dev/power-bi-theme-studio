# Create your first theme

The easiest way to learn is to begin with a small theme that already works.
You can then change one thing at a time and see the result in Power BI.

## 1. Create a JSON file

Copy this into a new text file:

```json
{
  "name": "My first theme",
  "dataColors": [
    "#005EA5",
    "#28A197",
    "#F47738",
    "#912B88",
    "#FFDD00"
  ],
  "background": "#FFFFFF",
  "foreground": "#252423",
  "tableAccent": "#005EA5"
}
```

Save it as `my-first-theme.json`. Make sure the filename ends in `.json`, not
`.txt`.

[Download this starter theme](/examples/minimal-theme.json)

## 2. Import it into Power BI Desktop

In Power BI Desktop:

1. Open the **View** ribbon.
2. Open the **Themes** menu.
3. Choose **Browse for themes**.
4. Select your JSON file.

The chart colours in the report should now use your palette.

## 3. Make one visible change

Change the first colour:

```json
"dataColors": [
  "#D4351C",
  "#28A197",
  "#F47738",
  "#912B88",
  "#FFDD00"
]
```

Save the file and import it again. The first series in most charts should now
use the new red.

## 4. Add a visual setting

The following version also turns visual titles on and gives them a consistent
font and colour:

```json
{
  "name": "My first theme",
  "dataColors": ["#005EA5", "#28A197", "#F47738", "#912B88", "#FFDD00"],
  "background": "#FFFFFF",
  "foreground": "#252423",
  "tableAccent": "#005EA5",
  "visualStyles": {
    "*": {
      "*": {
        "title": [
          {
            "show": true,
            "fontFamily": "Segoe UI",
            "fontSize": 14,
            "fontColor": {
              "solid": {
                "color": "#252423"
              }
            }
          }
        ]
      }
    }
  }
}
```

The first `"*"` means **every type of visual**. The second `"*"` means **the
normal style for that visual**, which is what every visual uses unless you
choose otherwise. Together they mean "all visuals". The `title` section then
describes how their titles should look.

## Five rules that prevent most errors

1. Put double quotes around names and text.
2. Put a comma after an item when another item follows it.
3. Do not put a comma after the final item in a list or section.
4. Use `true` and `false` without quotation marks.
5. Keep every opening `{` or `[` paired with a closing `}` or `]`.

::: warning Import failed?
An error often means there is a missing comma, an extra comma or an unmatched
bracket. Paste the file into Theme Studio or a JSON checker to find the exact
line before changing any formatting settings.
:::

## Where to go next

- [See the main parts of a theme file](./theme-anatomy)
- [Learn how visual formatting is organised](./visual-styles)
- [Copy common colour and font recipes](./recipes/colours)
