---
id: TASK-021
sprint: SPRINT-007
epic: dark-mode-preview
status: done
summary: "Dark-mode preview shell (non-persisted switch + Gmail/Outlook/Apple Mail picker) plus the Gmail iOS double-invert transform, with EB-DARKSIM purity marker and harness Section 8"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-021 — Done Report

## What shipped (commit `472be1c`)

- Dark mode switch + three-option client picker (Gmail / Outlook / Apple Mail, never disabled) runtime-inserted into `.preview-header-left` after the factory-built Test data toggle. Hand-rolled flip/sync mirroring the factory shape but with NO localStorage persistence (locked by IDEA-005).
- Pure transform chain step: `els.preview.srcdoc = withPreviewLinkHandler(applyDarkMode(applyTestData(result.html)))`; `lastHtml = result.html;` untouched — copied HTML byte-identical regardless of toggle state (SHA-256-verified across 4 states).
- `injectPreviewStyle(html, css)` helper (function-replacer `.replace()` only), `gmailDarkTransform` (EB-DARKSIM marker, body double-invert + media counter-filter + `html` background `#0b0b0b`), `outlookDarkTransform`/`appleMailDarkTransform` stubs carrying the literal `DARK_TRANSFORM_STUB` release-gate token, `DARK_MODE_TRANSFORMS` registry, `applyDarkMode` with plain-English degradation via `darkModeError` → `#warn` (no `e.message` interpolation).
- CSS: `.preview-stage.dark` chrome, `.seg-control[hidden] { display:none }` (specificity fix), flex-wrap on `.preview-header-left`.
- Harness Section 8: `DARK_MODE_FIXTURES`, 8 predicate fixtures covering all 4 mandated test targets including the lastHtml purity guard. 45/45 rows pass.
- Platform-surface decision table encoded as a comment (Gmail = iOS app full invert; Outlook = OWA selective repair, TASK-022; Apple Mail = opt-in no-op, TASK-023).

## Pipeline results

- Executor: COMPLETED first pass.
- Verifier: APPROVED — all 9 acceptance criteria met; independent CDP verification including fault injection (patched transform throw → exact plain-English banner, no raw exception text anywhere in the DOM); layout verified at 1440/1280/1024/900px; `</script>` count exactly 3 (TASK-020 gate intact).
- Code review: CLEAN — 0 critical / 0 important / 3 minor (all queued as findings, deferred to sibling tasks by design).
- Test writer: NO_TESTS_NEEDED — all 4 mandated targets already covered by Section 8 fixtures.

## Findings queued this task (non-blocking)

- FIND-SPRINT-007-5 (medium, bug): stale `darkModeError` survives toggling dark mode off (unreachable today; fix suggested in TASK-022).
- FIND-SPRINT-007-6 (low): "Apple Mail" label wraps below ~1280px; `white-space: nowrap` suggested.
- FIND-SPRINT-007-7 (minor): purity-guard fixture passes vacuously while dark mode is off; strengthen in TASK-024.
- FIND-SPRINT-007-8 (minor): `injectPreviewStyle` doesn't neutralize `</style>` in css; guard suggested in TASK-022.
- FIND-SPRINT-007-9 (minor): harness Sections 7/8 are duplicate predicate-row loops; extract before TASK-022/023 add more.

## Notes for downstream tasks

- TASK-022: implement `outlookDarkTransform` (replace stub, keep token out); natural home for FIND-5 (`darkModeError` clearing) and FIND-8 (`</style>` guard).
- TASK-023: implement `appleMailDarkTransform`; asserts zero `DARK_TRANSFORM_STUB` occurrences remain.
- TASK-024: strengthen purity fixture (FIND-7).
