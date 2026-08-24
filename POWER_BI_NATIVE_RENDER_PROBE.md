# Power BI Desktop native render probe

*Development-tooling investigation. No Theme Studio rendering was changed.*

**The question:** can actual Power BI Desktop rendered output become a
repeatable, programmatically inspectable oracle for Theme Studio?

**The answer: yes.** DOM, geometry, computed styles and painted pixels are all
reachable. The one thing still needing a person is authoring the comparison
report.

---

## 1. Environment

| | |
|---|---|
| Power BI Desktop | **2.157.879.0 (26.08)**, MSI install at `…\Microsoft Power BI Desktop\bin\PBIDesktop.exe` |
| Store/Appx package | none — the MSI build is what is installed |
| WebView2 Runtime | **151.0.4129.101** (Evergreen) |
| CDP browser string | `Edg/151.0.4129.101`, protocol **1.3**, V8 15.1.23.9 |
| Power BI running beforehand | **no** — so the debug launch risked no unsaved work |

The many `msedgewebview2.exe` processes already running belonged to Copilot,
Outlook, Search and Widgets. None was Power BI. That mattered: if Power BI had
been running, launching it again would have activated the existing process,
which never inherited the environment variable, and the experiment would have
failed for a reason unrelated to whether the mechanism works.

---

## 2. Enabling remote debugging — `PROVEN-EXPERIMENT`

Power BI Desktop honours `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`.

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9222"
Start-Process "C:\Program Files\Microsoft Power BI Desktop\bin\PBIDesktop.exe"
```

The flag reached the child browser process, which is the diagnostic that
separates "Power BI filtered the variable" from "the variable arrived but the
endpoint is unreachable":

```
pid=36764  type=(browser)  parent=PBIDesktop.exe(69912)   <- owns the socket
pid=71520  type=renderer   parent=msedgewebview2.exe(36764)
… 5 further renderers, all carrying the flag
```

The port bound **`127.0.0.1` only**, immediately — no polling needed.

No registry policy was required, so the `AdditionalBrowserArguments` policy
route was never attempted and **nothing persistent was written**. The variable
is process-scoped and vanishes with the shell.

---

## 3. CDP targets

`/json/version` and `/json/list` both answered. **20 targets: 6 pages, 14
workers.** The pages are one per Desktop surface:

| target | what it is |
|---|---|
| `reportView.html` | **the report canvas — the oracle** |
| `modelView.html` | model diagram |
| `dataExploreView.html` | data/explore grid |
| `daxQueryView.html` | DAX query editor |
| `tmdlView.html` | TMDL editor |
| `desktopDialogHost.html` | dialogs |

Workers are Monaco language services and layout workers — irrelevant here.

Identified by URL rather than title: every page's title is its own URL, and
`reportView`'s `document.title` is empty.

---

## 4. Is the report DOM inspectable? — `PROVEN-EXPERIMENT`

Yes. Evaluated inside `reportView.html`:

```json
{
  "url": "https://ms-pbi.pbi.microsoft.com/minerva/reportView.html",
  "devicePixelRatio": 1,
  "viewport": { "w": 1704, "h": 824 },
  "ancestorTransforms": []
}
```

Live `location`, `window`, `document`, `getComputedStyle` and
`getBoundingClientRect` are all reachable. A container inventory ran against
the start screen and returned real elements with real bounding boxes, so the
query path works end to end — not just the handshake.

`ancestorTransforms` is empty only because no report was open; the field
exists to capture report zoom, which is an ancestor transform and must be
known before any bounding rect is compared with anything.

---

## 5. Painted pixels — `PROVEN-EXPERIMENT`

`Page.captureScreenshot` works, and this is the finding that matters most.

```
signature : 89504e470d0a1a0a (valid PNG)
dimensions: 1704x824          (exactly the layout viewport)
bit depth : 8   colour type: 2 (RGB)
bytes     : 71484             (reproduced across runs)
```

**`Page.enable` must be sent first.** Without it WebView2 accepts
`Page.captureScreenshot` and simply never replies — it looks like a
permissions failure and is not one. One capture also timed out during Power
BI's startup and succeeded on retry, so window state matters; retry before
concluding anything.

### Why this is the headline

`BASE_THEME_DIFFERENTIAL_AUDIT.md` §17 (task 8) concluded that Power BI paints
marks as unrounded, antialiased SVG rects while Theme Studio's HTML boxes get
pixel-snapped — and had to grade the consequence **UNVERIFIED**, because *"no
painted pixel of either product was read"*. That sentence can now be retired
on the Power BI side. The equal-mark experiment §17 could only model is now
an experiment that can actually be run.

---

## 6. What can be read

The probe's `visuals` script captures, per visual container:

- container bounding box;
- every `svg` with its `viewBox`, `width`, `height`;
- every `rect`, `path`, `line`, `circle`: raw attributes (`x`, `y`, `width`,
  `height`, `d`, `transform`), computed `fill`, `stroke`, `stroke-width`,
  `opacity`, `shape-rendering`, plus **both** `getBBox()` (user units) and
  `getBoundingClientRect()` (CSS px);
- every `text`/`tspan`: content, computed `font-family`, `font-size`,
  `font-weight`, `font-style`, `fill`, `text-anchor`, `dominant-baseline`,
  transform, and both box measurements;
- leaf HTML text nodes with their computed font and colour, because Power BI
  does not necessarily draw axis labels in SVG.

Recording `getBBox` and `getBoundingClientRect` separately is deliberate. They
are different coordinate systems, and collapsing them is how a comparison
against Theme Studio's natural units manufactures a difference that is really
just report zoom.

---

## 7. What is still blocked

Only one thing: **a report to measure.**

Desktop launched to an empty `Untitled` session, so there is no Clustered Bar
yet and consequently:

- no native visual structure captured;
- no native plot box, bar rects or axis text;
- no Power BI vs Theme Studio geometry comparison;
- rendering technology per visual type not yet observed on a real chart.

Authoring the report needs Desktop's UI. Hand-writing a PBIP/PBIR project is
version-sensitive and disproportionate to what is a one-minute manual step, so
it was not attempted — see `tools/pbi-render-probe/README.md` for the exact
setup and the synthetic dataset.

---

## 8. Security

The debug port is a full DevTools interface to the running application.

- Bound to `127.0.0.1` only; never expose it further.
- Never enable it against a report containing real data.
- Nothing persistent was written: no registry policy, no machine environment
  variable, no modification to the Power BI installation.
- Cleanup is closing Power BI and the shell that set the variable. Verify with
  `Get-NetTCPConnection -LocalPort 9222 -State Listen` returning nothing.

---

## 9. Boundary

Behavioural inspection of a running application, not code extraction. No
Microsoft bundle, font, binary or DOM dump is committed here, and the
installation was not modified. The probe's `output/` directory is gitignored
precisely because what it produces is Power BI's own rendering.
