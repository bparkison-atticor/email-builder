---
id: IDEA-003
type: FEATURE
status: answered
created: 2026-06-02T00:00:00Z
epics: [module-toggle]
slices:
  - title: "Module toggle CSS + JS infrastructure"
    description: "Define a reusable `.module-toggle` CSS class (matching the visual and ARIA pattern of the existing `.switch` control) and a `createModuleToggle(id, label, defaultOn, onChange)` JS factory function (or equivalent convention) that any seg section can instantiate. The factory handles: rendering the toggle element, persisting state to localStorage under a namespaced key, restoring state on load, and invoking a caller-supplied callback on flip. No seg section is wired up yet in this slice."
    value_statement: "Establishes the shared pattern once so all future module toggles — body-below, banner, footer — are added by calling the factory, not by copy-pasting event handlers and storage keys. Delivers a tested, documented primitive rather than a one-off."
  - title: "Wire the CTA toggle"
    description: "Instantiate the module toggle on the `div.seg.seg-cta` section using the infrastructure from Slice 1. Toggle label: 'Call to action'. Default: ON (preserves current behavior). When OFF: (a) collapse the CTA fields (button text, destination type, destination input, cta-preview chip) via CSS with a smooth transition; (b) omit the `<mj-button>` block from the MJML output in `buildMjml()`. When ON: fields are visible and the button is emitted as today. State persists across sessions via localStorage."
    value_statement: "Delivers the immediate user need — emails that do not need a CTA can omit it without staring at disabled-but-visible fields. This is the only slice wired to a real module and can ship independently of any future toggle additions."
  - title: "Guard CTA validation when toggle is OFF"
    description: "Update `runCopyAction()` to skip CTA field validation (button text required, destination required, phone format check) when the CTA toggle is OFF. Currently `runCopyAction()` at ~line 2053 unconditionally checks `els.ctaText.value` and `els.ctaDestination.value`; these checks must be gated on toggle state."
    value_statement: "Without this guard, a marketer who turns off the CTA toggle will still get validation errors on empty CTA fields when they try to copy HTML — breaking the no-CTA workflow entirely."
open_questions:
  - question: "Where should the module toggle control be rendered inside the seg-cta card — in the seg-head row (right-aligned, next to the 'Call to action' title) or as a standalone row above the fields?"
    context: "The seg-head already uses flexbox with gap and could accommodate a right-aligned toggle via `margin-left: auto` on the switch element (same pattern as `.seg-desc`). Alternatively a dedicated toggle row between seg-head and the first field is more visible but adds vertical height. The choice affects how the toggle HTML is injected by the factory and sets the visual convention for future module toggles."
    candidates:
      - "In the seg-head row, right-aligned (matches .seg-desc pattern, compact, sets a clean convention)"
      - "Dedicated toggle row between seg-head and fields (more prominent, easier to spot, slightly taller card)"
    answer: "Right-aligned in seg-head (margin-left:auto, matches the .seg-desc convention)."
  - question: "Should collapsing the CTA fields animate (CSS max-height or height transition) or simply toggle display:none instantly?"
    context: "The existing ctaDestinationLabel fade uses opacity transition (~line 118–121). A smooth collapse would feel consistent with that pattern, but max-height transitions can be tricky without knowing content height. An instant hide (display:none or visibility:hidden) is simpler and avoids transition jank."
    candidates:
      - "Animated collapse via CSS max-height transition (consistent with existing fade pattern, more polished)"
      - "Instant hide via display:none toggle (simpler, zero jank risk, acceptable for a settings-like control)"
    answer: "Animated collapse via CSS max-height transition."
  - question: "What localStorage key should the CTA toggle use, and should the module toggle factory derive all keys from a shared prefix?"
    context: "Existing keys follow the pattern `emailBuilder.<feature>` (e.g., `emailBuilder.testData`, `emailBuilder.testDataEnabled`). A consistent prefix for module toggles prevents key collisions if future modules are added. The factory could auto-derive the key from the module ID passed in."
    candidates:
      - "emailBuilder.module.<id> (e.g., emailBuilder.module.cta) — namespaced under a 'module' sub-prefix"
      - "emailBuilder.<id>Enabled (e.g., emailBuilder.ctaEnabled) — flat, consistent with existing testDataEnabled key"
    answer: "emailBuilder.module.<id> (factory derives the key from the module id; CTA uses emailBuilder.module.cta)."
assumptions:
  - assumption: "The existing `.switch` CSS block (lines 353–389 in index.html) can be reused as-is for the module toggle's visual appearance — no new toggle component styling is needed, only the factory wiring."
    confidence: high
    validation: "The .switch block is self-contained, not scoped to the preview header, and the testDataSwitch uses it successfully outside of any header context. Confirmed by reading lines 353–389 and 735."
  - assumption: "The CTA fields that should collapse when the toggle is OFF are: the button-text field, the destination type segmented control, the destination input field (with its label and hint), and the cta-preview chip. All are direct children or grandchildren of div.seg.seg-cta."
    confidence: high
    validation: "Confirmed by reading the seg-cta HTML at lines 655–689 in index.html. The seg-head row itself (containing the toggle) should remain visible."
  - assumption: "buildMjml() at ~line 1513 can be modified to conditionally omit the mj-button block by checking a module-level boolean (e.g., ctaEnabled) that the toggle callback sets. No other render path needs to change."
    confidence: high
    validation: "The mj-button is emitted at lines 1569–1571 inside the buildMjml() template literal. It is a standalone interpolated block with no branching today. A simple ternary or early-return guard is sufficient."
  - assumption: "The runCopyAction() validation block at ~lines 2053–2067 is the only place that enforces CTA field requirements. No other code path (e.g., scheduleRender, updateCtaPreview) will error or behave incorrectly when ctaText and ctaDestination are empty while the toggle is OFF."
    confidence: medium
    validation: "updateCtaPreview() at line 1968 reads ctaText but only updates the preview chip's text — it will display 'Click Here' (its fallback) and that chip will be hidden anyway. buildCtaHref() returns '#' when ctaDestination is empty, which is harmless when the button is omitted. Review both functions explicitly before implementation."
  - assumption: "The module toggle factory does not need to support server-side rendering, SSR hydration, or any framework lifecycle — this is a plain JS pattern in a no-build single-file app."
    confidence: high
    validation: "Confirmed by ARCHITECTURE.md and CODE-PATTERNS.md. The single-file constraint means vanilla JS only."
  - assumption: "Default state of ON for the CTA toggle is correct — it preserves current behavior for all existing users and avoids a surprise blank email on first load."
    confidence: high
    validation: "Confirmed by the Synthesis brief ('Default state should preserve current behavior — CTA ON by default')."
research_recommendation: not_needed
research_rationale: "The idea is entirely within the existing single-file vanilla JS pattern — the toggle UI component, localStorage persistence, MJML conditional emission, and validation guard all have direct prior-art in the codebase to follow."
---

# IDEA-003: Reusable Module Toggle — CTA Block First

## Raw Input

"a toggle that will become a module toggle to enable or disable pieces of the email builder. e.g. not all emails need a CTA button"

## Grounding

All code lives in `C:\Users\brand\Documents\Claude Apps\EmailBuilder\index.html`.

**Existing toggle component — `.switch` pattern**

Lines 353–389 define the `.switch` CSS class: a pill-shaped track with a sliding knob, toggled by adding/removing the `.on` class. It uses `role="switch"` and `aria-checked`. The only current instance is `#testDataSwitch` (line 735, preview header). The JS pattern for it is at lines 1945–1963: `classList.toggle('on', bool)`, `setAttribute('aria-checked', ...)`, `localStorage.setItem(...)`, click + keydown listeners.

**CTA section structure**

`div.seg.seg-cta` (line 655) contains:
- `div.seg-head` — title row (line 656–658)
- `div.field` — button text input `#ctaText` (lines 659–662)
- `div.field` — destination type segmented control (lines 663–679)
- `div.field` — destination label `#ctaDestinationLabel`, input `#ctaDestination`, hint `#ctaDestinationHint` (lines 681–685)
- `div.cta-preview` — live preview chip `#ctaPreviewBtn` (lines 686–688)

The seg-head currently has no right-side element; `.seg-desc` uses `margin-left: auto` on the last child of `.seg-head` flex row (lines 280–284) to push optional labels right — the same mechanism could seat a toggle.

**MJML build pipeline**

`buildMjml()` at line 1513 assembles the MJML string. The CTA button is emitted at lines 1569–1571:
```
<mj-button href="${escapeHtml(ctaHref)}" target="${ctaTarget}"${ctaRelAttr} background-color="${tpl.ctaBackgroundColor}" color="${tpl.ctaTextColor}" padding="14px 0 18px 0">
  ${escapeHtml(ctaText)}
</mj-button>
```
This is currently unconditional. A guard on a `ctaEnabled` boolean is the required change.

**Validation path**

`runCopyAction()` at ~line 2046 enforces CTA fields unconditionally at lines 2053–2067 — checking `els.ctaText.value.trim()` and `els.ctaDestination.value`. These must be gated when the toggle is OFF.

**localStorage key pattern**

Existing keys: `emailBuilder.testData`, `emailBuilder.testDataEnabled`. The new toggle key will follow this namespace.

**`els` registry**

The `els` object at lines 1074–1087 collects DOM element references. New toggle elements and the CTA fields-wrapper (if used) should be registered here for consistency.

**`seg-head` flex layout**

`.seg-head` is a flex row (`display: flex; align-items: center; gap: 8px; margin-bottom: 14px` — lines 257–262). A toggle element with `margin-left: auto` would right-align in the header row with no layout changes needed.

## Slices

### Slice 1: Module toggle CSS + JS infrastructure

Create the reusable primitive that all future module toggles will use. This means:

- A CSS class (or extend `.switch`) that can appear inside `.seg-head` without inheriting preview-header-only styles. The existing `.switch` styles are not scoped to the header, so they should work as-is — the implementation should confirm this and add any overrides needed for the in-card context.
- A JS factory function `createModuleToggle({ id, label, defaultOn, storageKey, onChange })` that: creates and returns a `.switch` element, reads the initial state from `localStorage` (defaulting to `defaultOn` if absent), calls `onChange(enabled)` synchronously on init (so the initial DOM state is set), and registers click + keydown listeners that flip state, persist to localStorage, and call `onChange`.
- The factory should be defined near the other UI utilities in the script block, before any toggle is instantiated.

No seg section is wired in this slice. The factory can be validated by a brief inline smoke-test or by the next slice.

### Slice 2: Wire the CTA toggle

Instantiate the module toggle on the CTA card using the Slice 1 factory:

- Call `createModuleToggle({ id: 'ctaToggle', label: 'Call to action', defaultOn: true, storageKey: 'emailBuilder.module.cta', onChange: setCTAEnabled })`.
- Inject the returned element into `.seg-head` of `div.seg.seg-cta` (right-aligned via `margin-left: auto`).
- `setCTAEnabled(enabled)` callback: shows/hides (collapses) the CTA fields below the seg-head row, and sets a module-level `let ctaEnabled = true` boolean.
- Modify `buildMjml()` at lines 1569–1571 to wrap the `<mj-button>` block in a conditional: `${ctaEnabled ? `<mj-button ...>` : ''}`.
- `scheduleRender()` must be called inside `setCTAEnabled` so the preview updates immediately when the toggle flips.

### Slice 3: Guard CTA validation when toggle is OFF

Update `runCopyAction()` at ~line 2053 to skip CTA field checks when `ctaEnabled === false`:

- Wrap the `ctaText` empty-check, the `ctaDestination` checks, and the phone-format check in `if (ctaEnabled) { ... }`.
- Ensure `clearAllInvalid()` already clears any previously set CTA invalid states (it should — confirm it clears all fields, not just the ones currently in `invalidEls`).
- No other changes to the copy or preview pipeline are needed: `buildCtaHref()` returning `'#'` and `updateCtaPreview()` showing "Click Here" on a hidden chip are both harmless when the toggle is OFF.

## Open Questions

**1. Toggle placement in the seg-head row**

The seg-head is a flex row. A right-aligned switch (`margin-left: auto`) would sit flush with the card edge and matches the `.seg-desc` convention already used on the body-below card. A dedicated row between the header and the first field is more visually prominent. This choice sets the visual convention for all future module toggles — changing it later would require updating multiple cards.

**Answer:** Right-aligned in seg-head (`margin-left: auto`, matches the `.seg-desc` convention).

**2. Collapse animation vs. instant hide**

The existing ctaDestinationLabel fade (lines 118–121) uses `opacity` transition. A `max-height` collapse on the CTA fields would feel consistent but requires a fixed or large enough `max-height` value to avoid clipping. An instant `display: none` flip is safe and reliable. The choice is primarily aesthetic — both are functionally correct.

**Answer:** Animated collapse via CSS `max-height` transition.

**3. localStorage key naming**

Two viable patterns: `emailBuilder.module.cta` (introduces a `module.` sub-namespace, scales cleanly when body-below/banner/footer toggles are added) vs. `emailBuilder.ctaEnabled` (flat, consistent with `testDataEnabled`). The factory should derive the key from an argument; the question is which pattern to standardize on for the argument value passed in.

**Answer:** `emailBuilder.module.<id>` — the factory derives the key from the module id; the CTA uses `emailBuilder.module.cta`.

## Assumptions

All assumptions are documented in the frontmatter above with confidence levels and validation methods.
