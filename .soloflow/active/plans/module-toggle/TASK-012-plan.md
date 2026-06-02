---
id: TASK-012
idea: IDEA-003
status: approved
created: 2026-06-02T00:00:00Z
files_owned:
  - index.html
files_readonly: []
acceptance_criteria:
  - criterion: "A module toggle labeled 'Call to action' is instantiated on the `div.seg.seg-cta` section via a single `createModuleToggle('cta', ...)` call, defaulting ON."
    verification: "grep -n \"createModuleToggle('cta'\" index.html returns the call with label 'Call to action' and defaultOn true; in browser the CTA seg-head shows a working toggle."
  - criterion: "The toggle element is right-aligned within `.seg-head` via `margin-left:auto`."
    verification: "In browser DevTools, the toggle element inside .seg-cta .seg-head has computed margin-left: auto and sits flush right of the title."
  - criterion: "When the toggle is OFF, the CTA fields (button-text field, destination-type segmented control, destination label/input/hint, cta-preview chip) collapse via an animated CSS max-height transition; the seg-head stays visible."
    verification: "In browser, flip the toggle off — the four field groups animate closed (height transitions, not instant) while the seg-head with title and toggle remain visible; flip on re-expands them."
  - criterion: "When the toggle is OFF, `buildMjml()` omits the `<mj-button>` block from the output."
    verification: "Flip toggle off, click View HTML — the raw HTML/MJML contains no mj-button-derived <a> button; flip on and the button reappears."
  - criterion: "Toggle state persists across reload under localStorage key `emailBuilder.module.cta`."
    verification: "Flip off, confirm localStorage 'emailBuilder.module.cta' === 'false', reload page — CTA toggle is OFF and fields stay collapsed on load with no flash of expanded content."
depends_on: [TASK-011]
estimated_complexity: medium
epic: module-toggle
test_strategy:
  needed: false
  justification: "Single-file vanilla browser app with no test runner or test command (CLAUDE.md). Behavior is verified via the manual browser checks in acceptance_criteria."
---

# Wire the CTA toggle

## Objective

Make the Call-to-action section the first consumer of the `createModuleToggle` factory from TASK-011. Instantiate the toggle on `div.seg.seg-cta` (label "Call to action", default ON), right-align it in the seg-head, collapse the CTA fields with an animated max-height transition when OFF, and conditionally omit the `<mj-button>` block from `buildMjml()` when OFF. State persists under `emailBuilder.module.cta`.

## Implementation Steps

1. Wrap the collapsible CTA fields so a single container can animate. In the CTA section markup (`index.html` lines 659-688), wrap the four field groups — button-text field (659-662), destination-type field (663-680), destination label/input/hint field (681-685), and the cta-preview chip (686-688) — in a single wrapper element, e.g. `<div class="seg-body" id="ctaBody"> ... </div>`. Leave the `.seg-head` (656-658) OUTSIDE the wrapper so it stays visible. Do not alter the inner field markup.
2. Add CSS for the collapse animation near the CTA-related styles (after line 121). Define a collapsible-body rule: default open state `max-height` large enough to never clip the CTA fields (e.g. `max-height: 1000px`) with `overflow: hidden` and `transition: max-height 0.2s ease` (the binding decision is an animated CSS max-height transition, matching the existing 0.12s/0.15s transition idiom in the file). Define a `.collapsed` (or equivalent) class that sets `max-height: 0`. Use a class name distinct enough to grep; reusing `.seg-body` + `.seg-body.collapsed` is acceptable.
3. Register the new collapse-wrapper element. Add `ctaBody: document.getElementById('ctaBody')` to the `els` registry (`index.html` lines 1074-1087) so the toggle callback can reach it. (If you prefer a local `const`, that is acceptable, but prefer `els` for consistency.)
4. Instantiate the toggle. After the factory definition and the `updateCtaPreview` wiring (around `index.html` line 1976), add a single call: `createModuleToggle('cta', 'Call to action', true, onCtaToggle)`. Insert the returned `.element` into the CTA `.seg-head` (after the `.seg-title` span at line 657) so it renders right-aligned.
5. Apply `margin-left:auto` to the toggle inside the CTA head. Either add the rule via the toggle element directly (e.g. a modifier class on the inserted element) or target `.seg-cta .seg-head .module-toggle { margin-left: auto; }` in CSS — mirror the existing `.seg-desc { margin-left:auto }` approach at lines 280-284. (Note: `.seg-cta .seg-head` currently has no `.seg-desc`, so the toggle is the right-most element.)
6. Implement `function onCtaToggle(isOn)`: toggle the `.collapsed` class on `els.ctaBody` (collapsed when `!isOn`), then call `scheduleRender()` so the preview/MJML reflect the new state. This callback runs once on init (per the factory contract from TASK-011), correctly setting the collapsed state on load with no expanded flash.
7. Make `<mj-button>` conditional in `buildMjml()`. At `index.html` lines 1569-1571, wrap the mj-button template literal so it is emitted only when the CTA toggle is ON. Read the current state from the factory's returned handle (e.g. a module-scope `ctaToggle = createModuleToggle(...)` then `ctaToggle.isOn()`), and interpolate either the mj-button block or an empty string. Keep `ctaText`/`ctaHref`/`ctaTarget` computation as-is (harmless when unused). Confirm `richTextToMjText` for bodyAbove (1568) and bodyBelow (1572) still surround the now-optional button correctly.
8. Manually verify (resolves the MEDIUM-confidence assumption from the idea): with the toggle OFF and CTA fields empty, confirm `updateCtaPreview()` (1968) and `buildCtaHref()` (1502) do not throw — both read `els.ctaText.value`/`els.ctaDestination.value` defensively and return safe defaults, so no guard is needed there. Note the result.

## Acceptance Criteria

- Single `createModuleToggle('cta', 'Call to action', true, ...)` call wires the toggle (no copy-pasted handlers).
- Toggle is right-aligned in `.seg-head` via `margin-left:auto`.
- OFF collapses the four CTA field groups via animated max-height; seg-head stays visible; ON re-expands.
- OFF omits `<mj-button>` from `buildMjml()` output; ON includes it.
- State persists under `emailBuilder.module.cta` and restores correctly on reload.

## Test Strategy

No automated tests — see test_strategy.justification. Manually exercise: toggle off/on (animation + field visibility), View HTML in both states (mj-button presence), reload after toggling off (persistence + no expand flash), and confirm no console errors when copying with empty CTA fields while OFF.

## Hardest Decision

How `buildMjml()` reads the toggle state. Chosen: a module-scope handle from the factory (`ctaToggle.isOn()`) rather than reading localStorage or DOM `aria-checked` inside `buildMjml()`. localStorage reads in the hot render path are wasteful and DOM-reads couple the builder to markup; the factory handle is the single source of truth and keeps `buildMjml()` reading a clean boolean. This requires capturing the factory return value at module scope, which is why TASK-011 returns `{ element, isOn }`.

## Rejected Alternatives

(1) `display:none` instead of animated max-height for collapse. Rejected — binding decision mandates the animated transition, and display:none cannot animate. (2) Removing/disabling the CTA `els.ctaText` etc. when OFF. Rejected — leaving fields intact (just collapsed) preserves their values so flipping back ON restores the marketer's input; it also keeps `updateCtaPreview`/`buildCtaHref` working without special-casing. Would reconsider collapse mechanism only if a CTA field's intrinsic height ever exceeds the max-height ceiling (then switch to a measured-height approach).

## Lowest Confidence Area

The max-height ceiling value for the collapse animation. A fixed `1000px` is simple but if the CTA body ever grows taller than the ceiling it would clip; and the open→close transition timing can feel slightly off when the real content height is far below the ceiling (the transition eases against the ceiling, not the true height). For the current four fixed-size fields this is fine, but it is the most likely spot to need tuning.
