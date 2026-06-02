---
id: TASK-013
sprint: SPRINT-005
epic: module-toggle
status: done
summary: "Guarded CTA field validation in runCopyAction() behind ctaToggle.isOn(): CTA-text and phone/destination checks skipped when toggle OFF; body-copy validation and aggregation/return stay outside the guard"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-013 — Done

## Summary
Final task of the module-toggle epic. `runCopyAction()` now reads `const ctaOn = ctaToggle.isOn()` and wraps the two CTA-specific validation blocks (CTA-text required check + the `getCtaType() === 'phone'` destination/format block) inside `if (ctaOn) { ... }`. Everything non-CTA stays outside the guard:
- `const missing = []`
- body-copy required push
- `let phoneFormatError = false` initialization
- final `missing`/`phoneFormatError` aggregation + return

So with the CTA toggle OFF, an empty CTA no longer blocks Copy HTML, while body-copy validation still runs in both states. The ON path is byte-for-byte equivalent to prior behavior.

## Key correctness points
- State read via the `ctaToggle.isOn()` factory handle (single source of truth, same as `buildMjml()` in TASK-012) — no localStorage/DOM read.
- `ctaToggle` was already module-scope from TASK-012; no promotion needed.
- `phoneFormatError` init outside the guard → the phone-format error branch cannot fire when OFF.
- Stale invalid-styling edge handled: `runCopyAction()` calls `clearAllInvalid()` at the top, so toggling OFF then copying clears any prior invalid CSS and the guard skips re-marking.

## Verification
- shadow-verifier: APPROVED — all 3 criteria MET; ON path confirmed byte-for-byte unchanged (no regression).
- code-reviewer: CLEAN — no findings; surgical guard boundary; no security surface.
- test-writer: NO_TEST_INFRA — project has no test runner.

## Commit
- `d990e0e feat(TASK-013): skip CTA validation in runCopyAction when toggle is OFF`
