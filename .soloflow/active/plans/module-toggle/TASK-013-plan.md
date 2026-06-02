---
id: TASK-013
idea: IDEA-003
status: approved
created: 2026-06-02T00:00:00Z
files_owned:
  - index.html
files_readonly: []
acceptance_criteria:
  - criterion: "When the CTA toggle is OFF, `runCopyAction()` skips all CTA field validation (button text required, destination required, phone format check)."
    verification: "Flip CTA toggle OFF, clear/empty CTA text and destination, click Copy HTML — copy succeeds (button flashes copied) with no 'Add CTA text'/'Add phone number'/'Check phone number format' error."
  - criterion: "When the CTA toggle is ON, CTA validation behaves exactly as before (no regression)."
    verification: "Flip CTA toggle ON, empty CTA text, click Copy HTML — the existing 'Add CTA text' (and/or phone) validation error still appears and copy is blocked."
  - criterion: "Body-copy validation (body copy required) still runs regardless of CTA toggle state."
    verification: "With CTA toggle OFF and CTA fields empty but body copy also empty, Copy HTML still reports the missing 'body copy' error."
depends_on: [TASK-012]
estimated_complexity: low
epic: module-toggle
test_strategy:
  needed: false
  justification: "Single-file vanilla browser app with no test runner or test command (CLAUDE.md). The guard is verified via the manual browser checks in acceptance_criteria."
---

# Guard CTA validation when toggle is OFF

## Objective

Prevent validation errors on empty CTA fields when the CTA toggle is OFF. Update `runCopyAction()` so the CTA field checks (button text required, destination required, phone format) are skipped when the CTA toggle is off, while body-copy validation and all other behavior remain unchanged.

## Implementation Steps

1. In `runCopyAction()` (`index.html` lines 2046-2097), read the CTA toggle state from the same module-scope handle TASK-012 established (e.g. `const ctaOn = ctaToggle.isOn();`). Use the existing factory handle — do not read localStorage or DOM directly.
2. Wrap the CTA validation in that condition. Guard the CTA-text check (lines 2053-2056) and the entire phone/destination block (lines 2058-2068) so they only run when `ctaOn` is true. The body-copy check (lines 2049-2052) and the `missing`/`phoneFormatError` aggregation/return logic (lines 2070-2077) stay outside the guard. Concretely: keep `const missing = []` and the body-copy push as-is; wrap the `if (!els.ctaText.value.trim())` push and the `if (getCtaType() === 'phone') { ... }` block inside `if (ctaOn) { ... }`.
3. Confirm `phoneFormatError` defaults to `false` so that when CTA is OFF the phone-format branch (lines 2074-2076) is never tripped (it already initializes to `false` at line 2058 — keep that initialization outside or before the guard).
4. Verify no other code path enforces CTA fields. (Confirmed during refinement: `runCopyAction` lines 2053-2068 is the only CTA-field enforcement; `buildCtaHref` returns `#` on empty and `updateCtaPreview` reads values defensively — neither throws.) Re-confirm after edit by toggling OFF with empty fields and copying.

## Acceptance Criteria

- CTA OFF → CTA validation skipped, copy succeeds with empty CTA fields.
- CTA ON → existing CTA validation unchanged (no regression).
- Body-copy validation always runs regardless of toggle state.

## Test Strategy

No automated tests — see test_strategy.justification. Manually verify the three acceptance scenarios (OFF skips, ON regresses correctly, body-copy always enforced) via the Copy HTML button.

## Hardest Decision

Where to place the guard boundary so body-copy validation is never accidentally swept into it. Chosen: wrap only the two CTA-specific blocks (text + phone/destination), leaving the `missing` array, body-copy push, and the final aggregation/return untouched. This keeps the guard surgical and makes the ON path byte-for-byte equivalent to current behavior.

## Rejected Alternatives

Early-returning or short-circuiting the whole validation function when CTA is off. Rejected — that would also skip the body-copy requirement, allowing an empty-body email to be copied. The targeted wrap preserves every non-CTA check. Would only reconsider if validation grew enough unrelated CTA-coupled logic to warrant a dedicated `validateCta()` helper.

## Lowest Confidence Area

Reliance on the `ctaToggle.isOn()` handle being in scope at `runCopyAction()`. This depends on TASK-012 having captured the factory return value at module scope (not a local inside an init block). If TASK-012 scoped it locally, this task must promote it to module scope first — that is the single integration point to verify before editing the validation.
