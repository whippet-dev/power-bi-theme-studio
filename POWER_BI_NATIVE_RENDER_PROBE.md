# Power BI Desktop native render probe

*Development-tooling investigation. No Theme Studio rendering was changed.*

**The question:** can actual Power BI Desktop rendered output become a
repeatable, programmatically inspectable oracle for Theme Studio?

**Yes.** DOM, geometry, computed styles and painted pixels are all reachable,
and the first comparison has already confirmed one Theme Studio model exactly,
upgraded a task 8 inference to proven, and found four real divergences.

---

## 1. Environment

| | |
|---|---|
| Power BI Desktop | **2.157.879.0 (26.08)**, MSI install at `…\Microsoft Power BI Desktop\bin\PBIDesktop.exe` |
| Store/Appx package | none |
| WebView2 Runtime | **151.0.4129.101** (Evergreen) |
| CDP browser string | `Edg/151.0.4129.101`, protocol **1.3**, V8 15.1.23.9 |
| Power BI running beforehand | **no** — the debug launch risked no unsaved work |

The `msedgewebview2.exe` processes already running belonged to Copilot,
Outlook, Search and Widgets. That mattered: had Power BI been running,
launching it again would have activated the existing process, which never
inherited the environment variable, and the experiment would have failed for a
reason unrelated to whether the mechanism works.

---

## 2. Enabling remote debugging — `PROVEN-EXPERIMENT`

Power BI Desktop honours `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`.

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9222"
Start-Process "C:\Program Files\Microsoft Power BI Desktop\bin\PBIDesktop.exe"
```

The flag reached the child browser process — the diagnostic that separates
"Power BI filtered the variable" from "the variable arrived but the endpoint is
unreachable":

```
pid=36764  type=(browser)  parent=PBIDesktop.exe(69912)   <- owns the socket
pid=71520  type=renderer   parent=msedgewebview2.exe(36764)
… 5 further renderers, all carrying the flag
```

Bound to **`127.0.0.1` only**. No registry policy was needed, so none was
written and **nothing persistent exists to undo**.

---

## 3. CDP targets

**20 targets: 6 pages, 14 workers**, one page per Desktop surface:

| target | what it is |
|---|---|
| `reportView.html` | **the report canvas — the oracle** |
| `modelView.html` / `dataExploreView.html` | model diagram, data grid |
| `daxQueryView.html` / `tmdlView.html` | DAX and TMDL editors |
| `desktopDialogHost.html` | dialogs |

Identified by URL, not title: every page's title is its own URL and
`reportView`'s `document.title` is empty. A `FloatingDialog/…` page appears
whenever a modal is open, which is a useful signal in itself — an open dialog
collapses the report pane and ruins measurements.

---

## 4. The native visual — `PROVEN-EXPERIMENT`

Reference: one Clustered Bar, four categories × three series, authored at
**600 × 600**, default formatting, report zoom **100%**, `devicePixelRatio` 1.

Class names were discovered live rather than assumed — and they turn out to
match the ones task 8 recovered from the bundle:

```
div.visualContainer                600 x 600   authored size
 └ div.vcBody                      600 x 600   carries the report-zoom transform
    └ div.visualWrapper.report     600 x 600
       └ div.visual.customPadding  566 x 508   the viewport handed to the visual
          └ svg.cartesianChart     566 x 478   drawing surface (legend takes 30)
             └ svg.svgScrollable
                └ svg.mainGraphicsContext  471 x 443   THE PLOT
```

`600 → 566 × 508` is task 7's `getVisualViewport` finding observed directly:
the container's authored size minus chrome, never re-derived from content.

**Rendering technology: SVG.** `rect.bar` elements inside
`svg.mainGraphicsContext`, no canvas anywhere in the visual.

### Coordinate systems

At 100% zoom and DPR 1 their **scales** coincide, which is why the reference
was measured there: one unit means the same distance in all three. Their
**origins** still differ — `getBBox()` is relative to the element's own user
space, `getBoundingClientRect()` to the viewport, device pixels to the
captured surface — so a length may be compared directly while a position may
not. They are recorded separately for that reason, and because the scales
stop agreeing as soon as zoom or DPR moves:

| | |
|---|---|
| SVG user units | `getBBox()` and the `x`/`y`/`width`/`height` attributes |
| CSS px | `getBoundingClientRect()`, after every ancestor transform |
| device px | CSS px × `devicePixelRatio` |
| report zoom | `transform: matrix(s,0,0,s,0,0)` on `div.vcBody` |

At Fit-to-page the same visual measured 411 × 411 with the zoom reading
`matrix(0.685417, …)`. The transform sits on `vcBody`, which is **below**
`visualContainer` — so walking up from the container misses it entirely. That
was found by measuring, not assuming.

---

## 5. Native geometry

Plot: **471 × 443**, at page (237, 307) — i.e. inset 104 from the visual's left
and 83 from its top.

All twelve bars share `height = 14.321120689655174`, identical to fifteen
decimal places and **unrounded**, confirming task 8's `PROVEN-RUNTIME` reading
of the shape renderer in live output.

| series | y (SVG units) | widths across the four categories |
|---|---|---|
| Online | 41.2093, 144.2326, 247.2558, 350.2791 | 433.32, 357.96, 273.18, 207.24 |
| Phone | 57.1217, 160.1449, 263.1682, 366.1914 | 226.08, 178.98, 131.88, 103.62 |
| Post | 73.0340, 176.0573, 279.0805, 382.1038 | 113.04, 84.78, 75.36, 47.10 |

Derived:

| | measured |
|---|---|
| series step within a category | **15.912356** |
| bar height (bandwidth) | **14.321121** |
| ⇒ `paddingInner` | **0.100000** exactly → `clusteredGapSize` **10** |
| category step | **103.023256** |
| cluster span | **46.145833** |
| cluster ÷ category step | 0.447917 → implied category `innerPadding` ≈ **55.2%** (`INFERENCE` — assumes d3 band semantics with unknown outer padding) |
| value scale | **9.42 px per unit**, exactly linear (every one of the twelve widths is its value × 9.42) |
| axis maximum | **50** — `471 ÷ 9.42`, not the data maximum of 46 |

### Text — `PROVEN-EXPERIMENT`

Axis labels are SVG `<text>`, all identical:

```
font-family : "Segoe UI", wf_segoe-ui_normal, helvetica, arial, sans-serif
font-size   : 14px          (= 10.5pt at 4/3)
font-weight : 400
fill        : rgb(97, 97, 97)
bbox height : 19
```

Measured label widths at 14px: `London` 47.163, `North West` 70.837,
`Scotland` 53.547, `Wales` 37.365. Value-axis ticks render **0, 20, 40** —
three labels, not five.

---

## 6. Painted pixels — the task 8 question, answered

`BASE_THEME_DIFFERENTIAL_AUDIT.md` §17 concluded that Power BI paints
unrounded SVG rects and therefore should not quantise thickness, but had to
grade the consequence **UNVERIFIED** because *"no painted pixel of either
product was read"*. It has now been read.

Sampling a column through the bars in a full-page capture (zoom 1, DPR 1, so
PNG coordinates are page coordinates):

```
London/Online  top 348.209  bottom 362.530   13 full rows + 2 blended   TOTAL INK 14.318
   347=0  348=0.79  349…361=1  362=0.528  363=0

N.West/Online  top 451.233  bottom 465.554   13 full rows + 2 blended   TOTAL INK 14.318
   450=0  451=0.764  452…464=1  465=0.554  466=0
```

**Power BI antialiases fractional edges.** The sampled equal-height bars
retained equal total painted coverage across different sub-pixel phases —
`.209` and `.233` both paint **14.318** against a geometric height of
**14.3211**, agreement to 0.02% — which is consistent with fractional SVG
antialiasing rather than per-mark integer snapping.

That is the property §17 predicted but could not observe. Antialiasing
spends a mark's exact fractional height as ink, whereas pixel-snapping
quantises it to an integer that varies with phase.

**Scope of the claim.** Two phases were sampled, not the phase space. This
shows that these marks did not quantise at these phases; it does not
establish that no phase anywhere produces a different coverage. A phase
sweep would be needed for that, and none was run.

Grade upgrade:

- §17's **STRONGLY-SUPPORTED** claim that SVG avoids the snapping mechanism is
  now **PROVEN-EXPERIMENT for Power BI**.
- The Theme Studio half — that Blink pixel-snaps its HTML box marks — remains
  **modelled**. The same technique can now test it, against our own app.

*Caveat:* only the two `Online` bars are clean measurements. The interior bars
(`Phone`, `Post`) sit close beneath another bar, so the background sample used
to estimate coverage is contaminated and their totals (14.9, 15.8) overstate.
The conclusion rests on the two bars with clear background above and below.

---

## 7. First comparison with Theme Studio — diagnostic only

No renderer change follows from any of this. Recording only.

### Confirmed

| | Power BI | Theme Studio | |
|---|---|---|---|
| clustered band step | 15.912356 | 15.912356 | **delta 0** |
| bar height | 14.321121 | 14.321121 | **delta 1.78e-15** |
| font stack | `"Segoe UI", wf_segoe-ui_normal, …` | identical under Fluent 2 | task 6 confirmed |
| 10.5pt → px | 14px | 14px | task 5's 4/3 confirmed |
| mark primitive | unrounded SVG rect | — | task 8 confirmed |

Feeding `clusteredSeriesBands` Power BI's own slot and gap reproduces its
rendered band geometry to floating-point identity. Task 9's band model was
derived purely from bundle archaeology; it now matches live output exactly.

### Divergences

| | Power BI | Theme Studio | note |
|---|---|---|---|
| **axis maximum** | **50** (rounded up from 46) | 46 (data maximum) | task 9 §8 said not to invent rounded maxima "unless separately proven". It is now proven |
| **tick labels** | 3 — 0, 20, 40 | 5 — `DEFAULT_TICK_COUNT` 4 | |
| **text width** | `North West` = 70.837 @14px | `estimateText` = 77.0 | **+7.5%** over |
| **text height** | bbox 19 | `fontSize × 1.35` = 18.9 | close |
| **category innerPadding** | ≈55.2% (inferred) | fallback 10 (Classic) / 50 (Fluent) | |
| **effective `clusteredGapSize`** | **10** | fallback 10 | two different layers — see below. Theme Studio's fallback matches observed output |

### `clusteredGapSize`: two layers, both findings stand

Task 9 read `po = { clusteredGapSize: 0, … }` out of the cartesian bundle:
the **low-level renderer/layout default**, used when the property is absent
from the data view. That reading was correct and is not superseded.

This probe measured a **newly authored Clustered Bar with default
formatting** and found an effective gap of **10%** (`paddingInner` exactly
0.100000). That is also correct.

Both are true because they are different layers: Power BI's low-level
renderer/layout default is 0, but the default *formatting state* of a newly
authored Clustered Bar resolves to an effective `clusteredGapSize` of 10.
Theme Studio's effective fallback of 10 therefore matches observed Desktop
output.

The distinction matters beyond this property: a renderer default and an
effective visual-formatting default are not necessarily the same layer, so
a bundle-read default cannot be assumed to be what a user's chart actually
renders with.

Candidate causes only — text measurement, axis "nice number" rules, Power BI
padding constants, and the authored-size difference all plausibly contribute.
Nothing here is a licence to edit CSS.

**Not compared:** absolute plot/gutter pixels. Power BI's visual is 600×600 and
Theme Studio's box is a 372-wide nominal rectangle; comparing those directly
would manufacture differences that are only authored-size differences.

---

## 8. Operational hazards

Found the hard way, all recoverable:

- **A minimised window produces no frames.** Captures time out and layout
  collapses to a stub size. Restore the window before measuring.
- **An open modal collapses the report pane.** Watch for a `FloatingDialog`
  target; the report view shrank to 167×192 with Enter Data's load dialog open.
- **A timed-out clipped capture can leave the WebView wedged** at the clip's
  dimensions. `window.innerWidth` reported 600 long after the capture failed,
  and neither `Emulation.clearDeviceMetricsOverride` nor restore/maximise fixed
  it. What did: `Emulation.setDeviceMetricsOverride` to the real size, then
  clear. Prefer full-page capture and crop offline.
- **`Page.enable` is required before `Page.captureScreenshot`**, or WebView2
  accepts the call and never replies.
- **Capture is flaky** — two timeouts then success is normal. Retry.
- `Page.captureScreenshot`'s `clip` is in **page** coordinates while
  `getBoundingClientRect` is **viewport**-relative; they differ once scrolled.

---

## 9. Security

The debug port is a full DevTools interface to the running application.

- Loopback only; never expose it further.
- Never enable it against a report containing real data.
- Nothing persistent was written: no registry policy, no machine environment
  variable, no modification to the installation.
- Cleanup: close Power BI and the shell that set the variable, then confirm
  `Get-NetTCPConnection -LocalPort 9222 -State Listen` returns nothing.

---

## 10. Boundary

Behavioural inspection of a running application, not code extraction. No
Microsoft bundle, font, binary or DOM dump is committed. The probe's `output/`
is gitignored precisely because what it produces is Power BI's own rendering.

---

## 11. Where this goes next

1. Run the same pixel experiment against **Theme Studio's own** previews, to
   settle the modelled half of §17 with the same rigour.
2. Investigate the **axis maximum** rule — the clearest, most consequential
   divergence found, and one that changes every cartesian preview's scale.
3. Calibrate `estimateText` against measured Power BI text widths.
4. Record the `clusteredGapSize` layer distinction in task 9's own notes,
   without removing the bundle finding: both layers are real.
