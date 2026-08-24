# Power BI Desktop lab controller

Runs measurement sweeps against Power BI Desktop **unattended**. Development
tooling; Theme Studio does not depend on any of it at runtime.

The point: start an experiment, walk away, come back to measurements — instead
of a human resizing a visual twelve times and reporting back after each one.

---

## The safety boundary

Two tools, deliberately separated:

| | |
|---|---|
| `probe.mjs` | **read-only**, and stays that way |
| `lab-controller.mjs` | **mutating**, with the restraints below |
| `labActions.mjs` | pure logic — allowlist, stability, restoration, breakpoints |
| `experimentRunner.mjs` | declarative experiment matrices |

The controller is attached to an application holding someone's unsaved report,
so the restraints are structural rather than advisory:

- **Allowlisted semantic actions only.** `setVisualSize`, `setSeriesGap`,
  `readState`. There is no "click at x,y", no "evaluate this", no selector
  argument — a caller cannot express an action nobody reviewed.
- **It refuses to mutate anything it cannot positively identify** as the
  synthetic lab visual: the four fixture categories and three series. An
  unrecognised report is a hard stop, not a warning.
- **Power BI's own UI**, never internal renderer state. Every change goes
  through the Format pane, so Power BI applies its own validation and the
  result is a state a user could have produced by hand.
- **Never saves, never deletes, never edits data, never leaves loopback.**
- **Restores what it changed**, and verifies the restoration.

If restoration fails it says so loudly and exits non-zero rather than leaving
the visual in an unknown state.

---

## Running

Power BI must already be running with the debug port — see `README.md`.

```bash
node experimentRunner.mjs --list
node experimentRunner.mjs --experiment classic-size-sweep --out ./output/sweep
```

Output is gitignored. It contains Power BI's own rendering.

---

## How the Format pane is driven

Discovered live, not assumed:

```
click the visual              → aria class gains "selected"
click "Format visual"         → tab aria-selected becomes "true"
click "General"               → sub-tab
click "Properties"            → accordion aria-expanded becomes "true"
                              → two unlabelled text inputs appear
```

The pane controls carry `aria-label`s and `aria-expanded`, which is far more
stable to key off than class names, and gives a verifiable state after each
step.

### The size fields are resolved, not assumed

The two Size inputs have no accessible name, and **Power BI orders them Height
then Width** — the opposite of the obvious guess. Assuming the order would
have transposed every measurement in a sweep without any error appearing.

So the controller works it out: it sets one field to a known value, sees which
dimension of the visual moved, and puts it back. One extra round trip, once,
and it survives Power BI reordering the pane in a future release.

### Setting a value

`Input.insertText` after a triple-click, then Enter — real input events.
Assigning `.value` does nothing useful: the inputs are Angular-bound and
ignore a value set behind their back.

### Verification is mandatory

"The click happened" is not success. After every size change the controller
re-reads the visual's actual rendered dimensions and throws if Power BI did
not accept them.

---

## Render stability

Polling, not fixed sleeps. After a mutation the controller samples the
visual's geometry every 250ms and requires three consecutive observations
agreeing within half a pixel before measuring. A sleep long enough to be safe
on a slow machine is wasted on every step of a twelve-variant sweep, and a
sleep tuned to a fast one is a race.

Timeouts are reported as an outcome, not thrown — a variant that never settles
is recorded as such and the sweep continues.

---

## Adding an experiment

Data, not code. In `experimentRunner.mjs`:

```js
"my-sweep": {
  name: "my-sweep",
  description: "what this is for",
  baseline: { gap: 10 },
  variants: [{ width: 600, height: 600 }, { width: 372, height: 128 }],
}
```

The baseline merges into every variant, so each recorded result carries the
full state it was measured under.

---

## What remains manual

- **Theme switching.** Not automated — see `POWER_BI_CARTESIAN_DIFFERENTIAL.md`.
  Report themes change responsive layout behaviour, so a sweep must state its
  theme; the controller records a palette fingerprint with every measurement
  so a result can never be filed under the wrong theme.
- **Authoring the report.** One-off, and out of proportion to automate.
- **Report zoom.** Not needed so far; every measurement is taken at 100%.
