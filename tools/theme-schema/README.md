# Power BI report-theme schema snapshot

`reportThemeSchema-2.157.json` is Microsoft's authoritative Power BI Desktop
report-theme schema for Desktop 2.157.x.x (August 2026, exploration version
5.76). It is retained here so the public guide can be built and tested without
network access.

Source:
[microsoft/powerbi-desktop-samples](https://github.com/microsoft/powerbi-desktop-samples/tree/main/Report%20Theme%20JSON%20Schema)

Run `npm run docs:schema` after replacing the schema snapshot. The generator
creates the smaller, guide-oriented catalogue in `docs/public/schema/`; do not
edit that generated file by hand.

The schema tells us which JSON structures and values Power BI accepts. It does
not guarantee that every setting is visible for every combination of fields,
visual state and enabled features.
