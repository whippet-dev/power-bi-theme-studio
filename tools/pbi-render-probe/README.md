# Power BI native render probe

Reads geometry, computed styles and painted pixels out of **Power BI Desktop's
own renderer**, so Theme Studio's previews can be compared against the thing
they imitate.

Development tooling. Not part of the app, not shipped, not run by the app.

---

## Why

Every renderer-fidelity task so far has ended with the same caveat: the
comparison was against Power BI's *code*, read out of its bundle, and never
against Power BI's *output*. Task 8 could establish that Power BI paints marks
as unrounded SVG rects, but not what those rects look like on screen — so its
central conclusion had to be graded UNVERIFIED.

This closes that gap. Power BI Desktop hosts its report canvas in WebView2,
WebView2 accepts Chromium browser arguments, and Chromium exposes the DevTools
Protocol. The report DOM is a normal DOM.

---

## Read-only, on purpose

This attaches to an application that may be holding someone's unsaved work.

The probe **only reads**. It cannot click, type, change formatting, or save.
It cannot even be handed JavaScript: `Runtime.evaluate` is used, but the
expression always comes from the fixed `SCRIPTS` table in `probe.mjs`, never
from an argument. If you need a new measurement, add a named script and read
what it does — don't add a `--eval` flag.

It also never launches or configures Power BI. Enabling the debug port is a
deliberate manual step, below.

---

## Enabling the port

Power BI Desktop honours `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` and passes it
to the WebView2 browser process it starts. Set it in the shell that launches
Power BI — it must exist *before* Power BI creates its WebView2 environment,
so setting it afterwards does nothing.

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9222"
Start-Process "C:\Program Files\Microsoft Power BI Desktop\bin\PBIDesktop.exe"
```

`$env:` is process-scoped: it disappears with that shell and changes nothing
machine-wide. No registry policy is needed — the environment variable route
works, so don't reach for `AdditionalBrowserArguments` policy.

**Close Power BI first.** If an instance is already running, launching again
usually just activates it, and the existing process never inherited the
variable — you get no port and a confusing negative result.

Check it took:

```powershell
Get-NetTCPConnection -LocalPort 9222 -State Listen
```

It should be bound to `127.0.0.1` only.

---

## Using it

```bash
node probe.mjs --list
node probe.mjs --target reportView --env
node probe.mjs --target reportView --inventory --out ./output
node probe.mjs --target reportView --screenshot --out ./output
```

`--target` matches a substring of a page target's URL or title. The report
canvas is `reportView.html`; the other pages are the model, DAX, TMDL, data
and dialog hosts.

Output goes to `output/`, which is gitignored. **Do not commit anything it
produces**: it is Power BI's own DOM and rendering.

---

## Coordinate systems

Keep these apart. The probe records them separately and so should you:

| | what it is |
|---|---|
| SVG user units | `getBBox()`, and the `x`/`y`/`width`/`height` attributes |
| CSS pixels | `getBoundingClientRect()`, after every ancestor transform |
| device pixels | CSS pixels × `devicePixelRatio` |
| report zoom | an ancestor transform, reported by `--env` |

A bounding rect is not in the visual's own units until you know the zoom.
Comparing one against a Theme Studio natural-unit number without normalising
is how you manufacture a difference that isn't there.

---

## Security and cleanup

The debug port is a full DevTools interface to that WebView. It is bound to
loopback, but treat it as an open door to the running application.

- Never enable it against a real report containing real data.
- Never expose the port beyond `127.0.0.1`.
- Don't leave it enabled once you've finished measuring.

To clean up:

```powershell
Stop-Process -Name PBIDesktop          # or just close the window normally
Get-NetTCPConnection -LocalPort 9222 -State Listen   # expect: nothing
```

Close the shell that set the variable, or clear it with
`Remove-Item Env:\WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`. Nothing persistent
is written anywhere, so there is nothing else to undo.

---

## Reference fixture

`reference-data.csv` is the synthetic dataset to build the comparison report
from — the same numbers as Theme Studio's cartesian fixture, so the two are
comparable without normalising values:

```
Category,Online,Phone,Post
London,46,24,12
North West,38,19,9
Scotland,29,14,8
Wales,22,11,5
```

Building the report needs Desktop's UI (Home → Enter data, paste, then a
Clustered bar chart with Category on the axis and the three measures as
values). That is deliberately not automated: authoring PBIP/PBIR by hand is
version-sensitive and out of proportion to a one-minute manual step.
