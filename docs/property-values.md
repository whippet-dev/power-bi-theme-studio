# Values you can use

Theme settings use a small number of value types. Once you recognise them,
reading a theme becomes much easier.

## On or off

Use `true` for on and `false` for off. Do not put quotation marks around them.

```json
"show": true,
"bold": false
```

## Numbers

Numbers are also written without quotation marks.

```json
"fontSize": 12,
"transparency": 20,
"outlineWeight": 1
```

For transparency, `0` normally means fully visible and `100` means invisible.

## Text

Text uses double quotation marks.

```json
"text": "Sales by region",
"fontFamily": "Segoe UI"
```

If the text itself needs a quotation mark, place a backslash before it:

```json
"text": "Sales for \"Priority\" customers"
```

## Choices

Some settings accept one of a fixed set of words or numbers:

```json
"position": "TopCenter",
"alignment": "center",
"labelDisplayUnits": 1000
```

The spelling and capital letters must match a value Power BI recognises, and
the rules are not the same everywhere. A visual title uses `"left"`, for
example, but a table header uses `"Left"`. Copy the value from an example in
this guide, or look the setting up in the
[complete settings catalogue](/reference/settings-catalogue), which lists every
accepted choice.

## Root colours

Colours at the top of a theme are plain hex colour values:

```json
"background": "#FFFFFF",
"foreground": "#252423",
"tableAccent": "#005EA5"
```

Use six characters after the `#`, as in the examples. Each character is a
number from 0 to 9 or a letter from A to F. Most design tools and colour pickers
can give you a colour in this form.

To make something see-through, use its separate `transparency` setting rather
than trying to build transparency into the colour code.

## Colours inside visual formatting

Visual formatting normally wraps the colour like this:

```json
"fontColor": {
  "solid": {
    "color": "#252423"
  }
}
```

This longer shape is required. A plain value such as the following will often
be rejected or ignored:

```json
"fontColor": "#252423"
```

## Lists

Lists use square brackets. Palette colours are a list:

```json
"dataColors": ["#005EA5", "#28A197", "#F47738"]
```

Formatting sections are also lists, usually with one item:

```json
"title": [
  {
    "show": true,
    "fontSize": 14
  }
]
```

## Empty and missing are different

Leaving a setting out tells Power BI that your theme has no instruction for
that setting. Adding an empty value is still an instruction and may have a
different result.

Prefer to remove a property you do not want to control rather than adding an
empty string, zero or `false` as a placeholder.

## Comments are not allowed

Standard JSON does not allow explanatory comments:

```json
{
  // This comment makes the file invalid
  "name": "My theme"
}
```

Keep notes in a separate document, or use clear formatting and sensible theme
names.
