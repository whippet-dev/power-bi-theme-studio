# Probe themes

These are diagnostic theme files, not themes anyone would ship. Each one
answers a specific question about how Power BI actually behaves, so the
studio's previews and resolver defaults can be checked against the real
thing instead of inferred.

Every default in `app/lib/*Properties.ts` is currently **inferred**: the
published theme schema contains zero JSON-Schema `default` keys (verified),
and Microsoft doesn't publish the base themes named in its `baseTheme`
enum. Several inferred defaults have already turned out to disagree with
Power BI — value-axis gridlines, matrix subtotals, data label density —
each found only by noticing a preview looked wrong.

## How to use these

1. Open Power BI Desktop, create a report with the visuals named below.
2. **View → Themes → Browse for themes**, load one probe file.
3. Screenshot the visuals.
4. Send the screenshots back, ideally saying which probe each one is.

`00-baseline.json` is the important one to do first — it's the control.

## The probes

| File | Question it answers |
| --- | --- |
| `00-baseline.json` | What does an **unstyled** visual look like? Sets only a name and palette, so everything else falls back to Power BI's own defaults. Screenshots of this are the ground truth for every default we've guessed. |
| `01-axis-gridlines.json` | Are value-axis gridlines on by default, and what colour/width? We default them **on** — inferred, not sourced. Also pins axis start/end to check tick behaviour. |
| `02-data-labels.json` | Does enabling data labels show them at the default density? Does enabling the *title* part keep the value, or replace it? We assume density 100 and value-on. |
| `03-matrix-hierarchy.json` | Are stepped layout, expand/collapse buttons, and row/column subtotals on by default? We now assume all four are. |
| `04-line-styling.json` | Is the line's stroke drawn by default, and in the data colour? Also switches interpolation between linear/smooth/step to confirm each renders. |
| `05-filter-pane-buckets.json` | **Bucket test.** Sets the filter pane background via `visualStyles["*"]["*"]` and the font via `visualStyles.page["*"]` at the same time. Confirms Power BI honours both and that the page bucket wins where they overlap. |
| `06-shapes.json` | Do the shape-tuning parameters (hexagon slant, arrow stem, octagon snip, triangle tip) do what we think? Add a Shape visual and switch its type to compare. |

## Reading the results

Where a probe uses a deliberately garish colour (magenta, lime), that's so
the setting is unmistakable in a screenshot — if you can't see it, the
property either doesn't apply there or we've mapped it to the wrong thing.
