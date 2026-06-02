---
id: TASK-011
idea: IDEA-003
status: approved
created: 2026-06-02T00:00:00Z
files_owned:
  - index.html
files_readonly: []
acceptance_criteria:
  - criterion: "A `.module-toggle` CSS rule set exists that visually matches the `.switch` control (pill track + sliding knob, accent color when on, focus-visible outline)."
    verification: "grep -n '.module-toggle' index.html returns the new selector block; in browser, a rendered .module-toggle element is visually indistinguishable from #testDataSwitch in both off and on states."
  - criterion: "A `createModuleToggle(id, label, defaultOn, onChange)` factory function is defined and returns/manages a toggle element with role=switch and aria-checked reflecting state."
    verification: "grep -n 'function createModuleToggle' index.html returns the definition; calling it in the browser console with a test container produces a clickable/keyboard-operable switch whose aria-checked flips."
  - criterion: "The factory persists state to localStorage under key `emailBuilder.module.<id>` and restores it on init, falling back to `defaultOn` when no stored value exists."
    verification: "In browser console, create a toggle with id 'cta', flip it off, reload via re-running init logic / inspect localStorage — `emailBuilder.module.cta` === 'false'; clearing the key and re-initializing yields the defaultOn state."
  - criterion: "The factory invokes the supplied `onChange(isOn)` callback on every flip (click and keyboard) and once during initial restore."
    verification: "In browser console, pass an onChange spy; confirm it fires on click, on Space/Enter keydown, and once on initialization with the restored boolean."
  - criterion: "No seg section markup is wired to a toggle in this task (infrastructure only)."
    verification: "grep -n 'createModuleToggle(' index.html shows the factory defined but not yet invoked for the CTA seg (no call inside CTA wiring); the CTA section renders unchanged."
depends_on: []
estimated_complexity: medium
epic: module-toggle
test_strategy:
  needed: false
  justification: "Single-file vanilla browser app with no test runner, package manager, or test command (CLAUDE.md: 'no test command detected'). Adding a test harness is out of scope for this idea. Verification is the manual browser checks in acceptance_criteria."
---

# Module toggle CSS + JS infrastructure

## Objective

Establish the reusable module-toggle pattern once: a `.module-toggle` CSS class that mirrors the existing `.switch` control, and a `createModuleToggle(id, label, defaultOn, onChange)` JS factory that renders the toggle element, persists/restores its state under a namespaced localStorage key, and invokes a caller-supplied callback on every flip. No seg section is wired in this task — this is the shared foundation that Slice 2 (wire CTA) and Slice 3 (validation guard) build on.

## Implementation Steps

1. Add a `.module-toggle` CSS block immediately after the existing `.switch` rules (`index.html` lines 353-389). Reuse the identical visual structure: `display:inline-flex; align-items:center; gap:8px`, a `.track` child (28x16 pill with `::after` knob), `.on .track { background: var(--accent) }`, `.on .track::after { transform: translateX(12px) }`, and a `:focus-visible` outline. The simplest implementation is to make the selector list `.switch, .module-toggle` share the existing declarations so the two controls stay in visual lockstep — but `.module-toggle` MUST remain a distinct selector that grep can find (do not alias it away). Size/typography should match `.switch` (12px, muted text, on-state text color).
2. Define `function createModuleToggle(id, label, defaultOn, onChange)` in the script, placed near the other toggle logic (after the `flipTestData`/`syncTestDataSwitch` block, around `index.html` line 1963). The factory must:
   a. Derive the storage key as `` `emailBuilder.module.${id}` `` (per binding decision; CTA will pass id `'cta'` to yield `emailBuilder.module.cta`).
   b. Read initial state: `localStorage.getItem(key) !== 'false'` when `defaultOn` is true (mirror the `testDataEnabled` init pattern at line 1623); when `defaultOn` is false, treat a missing key as off. Compute so that a missing key falls back to `defaultOn` and an explicit `'false'`/`'true'` overrides it.
   c. Build the DOM element: a `<span class="module-toggle" role="switch" tabindex="0">` containing `<span class="track"></span>` and the `label` text, mirroring the `#testDataSwitch` markup at lines 735-738. Set `aria-checked` from the restored state.
   d. Define an internal `sync()` that toggles the `on` class and sets `aria-checked` (mirror `syncTestDataSwitch`, lines 1946-1949), and an internal `flip()` that inverts state, writes `localStorage.setItem(key, String(state))`, calls `sync()`, then calls `onChange(state)` (mirror `flipTestData`, lines 1950-1955).
   e. Attach `click` and `keydown` (Space/Enter, with `preventDefault`) listeners that call `flip()` (mirror lines 1956-1962).
   f. Call `sync()` once and invoke `onChange(state)` once at the end so the caller can apply the restored state on load.
   g. Return an object exposing at minimum the created `element` (so the caller can insert it into a seg-head) and the current `isOn` state — e.g. `return { element, isOn: () => state };`. Do NOT auto-insert the element into the DOM; the consuming task decides placement.
3. Do not invoke `createModuleToggle` for the CTA (or any) seg in this task. Leave the factory defined and unused.

## Acceptance Criteria

- `.module-toggle` selector exists and renders identically to `.switch` (pass: grep finds it AND visual parity in browser).
- `createModuleToggle` is defined with the exact 4-parameter signature `(id, label, defaultOn, onChange)`.
- State persists under `emailBuilder.module.<id>` and restores on init with `defaultOn` fallback.
- `onChange(isOn)` fires on click, on Space/Enter, and once on init.
- No CTA wiring present (infrastructure only).

## Test Strategy

No automated tests — see test_strategy.justification. Verify manually in the browser console by instantiating `createModuleToggle('probe', 'Probe', true, console.log)`, appending `.element` to the body, and exercising click/keyboard/reload.

## Hardest Decision

Whether the factory should manage the element's DOM insertion or hand it back to the caller. Chosen: return the element and let the caller place it (CTA inserts into `.seg-head` per the binding right-aligned decision). This keeps the factory placement-agnostic, which is the whole point of the "universal pattern" intent — future modules (banner, footer) have different head structures and must control their own insertion point.

## Rejected Alternatives

(1) Extending the existing `flipTestData` code path to be generic. Rejected because `testDataEnabled` is a module-scope variable feeding `scheduleRender()` directly; generalizing it would entangle preview-substitution logic with module visibility. A standalone factory keeps concerns separate. (2) A class instead of a closure factory. Rejected for consistency with the file's existing function-based vanilla style (no classes elsewhere). Would reconsider if more than ~3 modules needed shared mutable methods beyond on/off.

## Lowest Confidence Area

The exact return-object shape (`{ element, isOn }` vs. returning just the element). TASK-012 consumes it; if TASK-012 finds it needs additional handles (e.g. a programmatic `setOn`), the contract may widen. The factory is intentionally minimal here; TASK-012's needs are the source of truth for any expansion.
