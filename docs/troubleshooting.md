# Fix common problems

## Power BI says the theme is invalid

Check these first:

- A missing comma between two settings
- An extra comma after the last setting
- A missing closing bracket or brace
- Curly “smart quotes” copied from a document instead of straight `"` quotes
- A colour missing its leading `#`
- A visual colour written as plain text instead of a `solid` colour object

Open the file in Theme Studio or a JSON checker. Fix the first error shown,
then check again; one missing comma can cause several later errors.

## The theme imports but nothing changes

Ask the following questions:

1. Is the visual name correct—for example, `tableEx` rather than `table`? For
   cards, check whether the visual is a **Card** (`cardVisual`) or a
   **Card (legacy)** (`card`).
2. Is the formatting section supported by that visual?
3. Does the visual already have manual formatting that overrides the theme?
4. Is the setting visible in the visual's current state?
5. Did you reimport the saved version of the file?

A value set directly on a visual takes priority over the theme. To remove it,
select the visual and use **Reset to default** on that part of the Format pane.
The visual will then pick up your theme.

## One visual type changes but another does not

The setting may be under a specific visual name:

```json
"clusteredColumnChart": {
```

Move genuinely shared formatting—such as a title or background—to the `"*"`
visual section, or repeat the setting under the other visual type.

## My whole page changed colour

You have probably added a `background` under `"*"` → `"*"`. Power BI uses that
for report pages as well as visuals. See
[A shared background also colours your pages](./visual-styles#apply-a-setting-to-every-visual).

## A colour setting is ignored

Inside `visualStyles`, most colours need the full colour object:

```json
"labelColor": {
  "solid": {
    "color": "#505A5F"
  }
}
```

Root colours such as `background` and `foreground` are the main exception and
use a plain colour value.

## Changing one colour affects too many things

You have probably changed a shared root colour such as `foreground` or
`foregroundNeutralSecondary`. These colours are designed to be reused across
the report.

If the change is meant for one element, look for a visual-specific property
such as `legend` → `labelColor`, `categoryAxis` → `labelColor`, or
`items` → `fontColor` on a slicer.

Some built-in elements do not have an individual colour property. In that
case, changing a shared colour can create more problems than it solves.

## The file is becoming difficult to manage

- Keep all the settings for one section together.
- Use consistent indentation, so it is clear what belongs inside what.
- Group visual types in a predictable order.
- Keep a working copy before large changes.
- Remove settings your theme no longer intends to control.
- If several people edit the theme, agree who owns the master copy. A version
  control tool such as Git can help larger teams track changes.

## A setting works differently after Power BI updates

Power BI's theme format develops alongside its visuals. Preview and newly
introduced visuals are most likely to change.

Keep a small test report with representative visuals. Check your theme against
that report before rolling it out with a new Power BI Desktop version.
