---
id: TASK-012
sprint: SPRINT-005
epic: module-toggle
status: done
summary: "Wired the CTA section to createModuleToggle ('cta', default ON): right-aligned toggle in seg-head, animated max-height collapse of CTA fields when OFF, conditional <mj-button> in buildMjml(), persistence under emailBuilder.module.cta"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-012 — Done

## Summary
First consumer of the `createModuleToggle` factory (TASK-011):
- Wrapped the four CTA field groups in `<div class="seg-body" id="ctaBody">`; `.seg-head` left outside so it stays visible when collapsed.
- Added `.seg-body`/`.seg-body.collapsed` animated max-height collapse CSS (a reusable collapse primitive for future modules) + `.seg-cta .seg-head .module-toggle { margin-left:auto }` for right-alignment.
- Registered `ctaBody` in `els`; added `function onCtaToggle(isOn)` (toggles `.collapsed`, calls `scheduleRender()`).
- Module-scope `const ctaToggle = createModuleToggle('cta', 'Call to action', true, onCtaToggle)`, appended to `.seg-cta .seg-head`.
- Gated the `<mj-button>` block in `buildMjml()` on `ctaToggle.isOn()` (single source of truth; no localStorage/DOM read in the render path).

## Key correctness points
- **No TDZ:** the factory's init `onChange` → `scheduleRender()` defers via `setTimeout`, so the first `ctaToggle.isOn()` read in `buildMjml()` happens after the `const` binds. Verified by both verifier and reviewer.
- **No throw when OFF + empty fields:** `updateCtaPreview()`/`buildCtaHref()` guard `.value` with `|| ''`.
- **Restore on load:** init `onChange` applies `.collapsed` synchronously during construction, so a restored OFF state collapses with no expand-flash.
- **MJML stays balanced** when the button is omitted (bodyAbove/bodyBelow `richTextToMjText` intact).

## Verification
- shadow-verifier: APPROVED — all 5 criteria MET; TDZ ordering risk proven safe.
- code-reviewer: CLEAN — no findings; clean single-call factory consumption; `.seg-body` is a reasonable reusable collapse primitive for TASK-013.
- test-writer: NO_TEST_INFRA — project has no test runner.

## Commit
- `a799752 feat(TASK-012): wire CTA module toggle with collapse and conditional mj-button`

## Note (lowest-confidence area)
`.seg-body` max-height ceiling is 1000px — ample for the current four CTA fields; revisit only if the CTA body ever exceeds it.
