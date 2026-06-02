---
id: TASK-011
sprint: SPRINT-005
epic: module-toggle
status: done
summary: "Added .module-toggle CSS class (shares .switch declarations) and createModuleToggle(id,label,defaultOn,onChange) factory with localStorage persistence, role=switch a11y, click/keyboard handlers; infrastructure only, no seg wiring"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-011 — Done

## Summary
Established the reusable module-toggle pattern (IDEA-003 foundation):
- `.module-toggle` appended to all 7 `.switch` CSS rule blocks — both controls share identical declarations while `.module-toggle` stays a distinct, grep-findable selector (visual parity by construction).
- `createModuleToggle(id, label, defaultOn, onChange)` factory: namespaced localStorage key `emailBuilder.module.${id}`, restore logic `stored === null ? defaultOn : (stored !== 'false')`, DOM build (`<span class="module-toggle" role="switch" tabindex="0">` + `.track` + label via `createTextNode`), internal `sync()`/`flip()`, click + keydown (Space/Enter, preventDefault) handlers, init `sync()` + `onChange(state)`, returns `{ element, isOn: () => state }`. Placement-agnostic (no DOM auto-insertion).

No seg/CTA wiring (infrastructure only) — consumed by TASK-012 next.

## Verification
- shadow-verifier: APPROVED — all 5 criteria MET; restore logic traced correct for both defaultOn=true and defaultOn=false.
- code-reviewer: CLEAN — no findings; clean generalization of `flipTestData`/`syncTestDataSwitch` with no `testDataEnabled`/`scheduleRender` entanglement; label is XSS-safe (createTextNode); `isOn` is a live getter.
- test-writer: NO_TEST_INFRA — project has no test runner.

## Commit
- `3f8d2fc feat(TASK-011): add .module-toggle CSS class and createModuleToggle() factory`

## Contract note for TASK-012
Returns `{ element, isOn: () => state }`. Per the plan's Lowest Confidence Area, TASK-012 is the source of truth for any contract widening (e.g. a programmatic `setOn`).
