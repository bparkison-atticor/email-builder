---
id: TASK-029
sprint: SPRINT-009
epic: dark-mode-preview-hardening
status: done
summary: "Repaired the vacuous Section 8 purity guard and the undetectable Section 10 ordering trap, tightened detectAuthorDarkScheme's CSS-property branch to a keyword allowlist, and extracted the shared renderPredicateFixtures row renderer for harness Sections 7-10."
executor_loops: 0
code_review_rounds: 1
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-029 — Strengthen the dark-mode harness fixtures and extract a shared predicate-row renderer

## What shipped

- **Shared row renderer** (`renderPredicateFixtures(body, fixtures, failText)`): the four duplicated ~13-line row loops in harness Sections 7-10 collapsed into one helper; exactly 5 occurrences (1 declaration + 4 call sites). Section 7's distinct failText ("FAIL — script was truncated or wiring did not run") is passed as an argument, not flattened.
- **Section 8 purity guard repaired**: now forces `darkModeEnabled = true` / `darkModeClient = 'gmail'`, calls the synchronous `render()`, asserts BOTH that `els.preview.srcdoc` carries `EB-DARKSIM` and that `lastHtml` does not, restoring both flags and re-rendering in a `finally`. The pre-task version passed vacuously on every fresh load (FIND-SPRINT-007-7).
- **Section 10 ordering trap repaired**: new combined input `<meta name="color-scheme" content="light dark"><style>@media (prefers-color-scheme: dark){…}</style>` that actually goes red when `detectAuthorDarkScheme`'s branches are reordered; the plain-`@media` fixture is retained separately.
- **`detectAuthorDarkScheme` third branch tightened** to `/[;{"'\s]color-scheme\s*:\s*(?:only\s+)?(?:light|dark|normal)\b/i`, killing the live prose false positive ("color-scheme: blue and white" in marketer body copy no longer flips Apple Mail out of identity pass-through). Two new fixtures lock both directions. Contract comment updated.
- Section 10 grew from 7 to 10 fixtures; whole harness green (112/112 rows PASS on fresh load, verified headless).

## Quality loop

- Verifier: APPROVED first pass. Independently re-ran the harness headless (112 rows, 0 FAIL) and built four mutants — each killed exactly the intended fixture and no others.
- Code review: 1 IMPROVEMENTS_NEEDED round — the helper's contract comment claimed coverage of "every predicate-shaped section below" while Section 13's identical-shaped `MICROCOPY_DOM_GUARDS` loop remains unmigrated, and named the wrong exclusion sections. Fixed in `b6122fb` (comment-only); re-review CLEAN, re-verification APPROVED.
- Test-writer: NO_TESTS_NEEDED — the deliverable was itself test work; all test_strategy targets exist as permanent fixtures.

## Commits

`38247bb`, `c7f6759`, `31e2516`, `9653cc7`, `b6122fb` — all confined to `index.html`.

## Findings queued

- FIND-SPRINT-009-1 (cleanup, low): Section 10 header comment still says "Fixture 7" for the drift guard, now fixture 10.
- FIND-SPRINT-009-2 (improvement, low): Section 13's `MICROCOPY_DOM_GUARDS` loop is a fifth copy of the predicate row renderer; migrate in TASK-030/031 and update the pinned grep count.
- FIND-SPRINT-009-3 (claude-md, medium): plan used whole-file absolute grep counts that were stale at execution time; prefer scoped/relative gates.
- FIND-SPRINT-009-4 (improvement, low): Section 8 purity guard collapses two invariants under one FAIL badge; surface which half failed when the section is next touched.

## Notes

- Maestro-dependent checks were not applicable to this task; all verification was reachable via headless Chromium + the in-page harness.
- Production behavior delta is nil today: `buildMjml()` emits no `color-scheme`, and the regex tightening only ever moves inputs from `meta-only` to `none` (identity pass-through), which is the intended repair.
