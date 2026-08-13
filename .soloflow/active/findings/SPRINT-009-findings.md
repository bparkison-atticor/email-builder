---
sprint: SPRINT-009
pending_count: 4
last_updated: 2026-08-13T10:15:00Z
---

# Findings Queue
SPRINT-009 started with missing infra: maestro; tests deferred.

## FIND-SPRINT-009-1
- **source:** TASK-029 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2731-2735
- **description:** Section 10's header comment still reads "Fixture 7 (the drift guard) is the highest-value regression lock in this section". TASK-029 inserted three new fixtures ahead of it (the ordering trap, the CSS-keyword fixture and the prose fixture), so the drift guard is now fixture 10, not 7. The comment is the only in-file pointer telling a future maintainer which row must never be deleted, so a wrong index actively misdirects. Section 8's equivalent comment ("Fixture 8") is still accurate — only Section 10 drifted.
- **suggested_action:** Change "Fixture 7" to "Fixture 10" in the Section 10 header comment, or refer to the row by its label ("the drift-guard fixture") so it survives future insertions.
- **resolved_by:**

## FIND-SPRINT-009-2
- **source:** TASK-029 (verifier)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:3162-3174
- **description:** Section 13's `for (const guard of MICROCOPY_DOM_GUARDS)` loop renders the exact predicate row shape that the new `renderPredicateFixtures(body, fixtures, failText)` helper now owns — same `{ label, check(), description }` fixture fields, same try/catch, byte-identical row markup, differing only in its failText ('FAIL — guard returned false'). It is a fifth copy of the loop the extraction was created to eliminate. It was correctly left alone by TASK-029 because acceptance criterion 7 pins `grep renderPredicateFixtures` at exactly 5 lines, but the duplication the extraction targeted is not fully retired. (The other loops in Sections 11-13 render an input/expected/actual field shape and genuinely do not fit the helper.)
- **suggested_action:** In TASK-030 or TASK-031, replace the Section 13 loop with `renderPredicateFixtures(body, MICROCOPY_DOM_GUARDS, 'FAIL — guard returned false')` and update the grep-count expectation in whichever plan owns it.
- **resolved_by:**

## FIND-SPRINT-009-3
- **source:** TASK-029 (verifier)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** .soloflow/active/plans/dark-mode-preview-hardening/TASK-029-plan.md:71-76
- **description:** The plan's completeness gate specified absolute grep counts as pass/fail criteria (`harness-row-label` 11→8, row loops 9→5). Both baselines were already wrong at execution time — the real counts were 19→16 and 17→14, because sibling tasks in earlier sprints added harness Sections 11-13 after the plan was authored. The executor and the orchestrator both had to hand-wave the numbers, and verification had to be told to judge intent rather than the literal criterion. The plan's Context section has the same staleness ("Section 11 and 12 land in TASK-030 and TASK-031" — Sections 11, 12 and 13 already exist). Absolute counts over a fast-moving shared file are a self-invalidating criterion.
- **suggested_action:** Prefer scoped/relative gates in plans over whole-file absolute counts — e.g. "exactly 5 `renderPredicateFixtures` occurrences" (which held) and "zero `for (const … of` loops between the Section 7 and Section 11 headers" — rather than `grep -c` totals across a file other tasks are concurrently growing. Worth a line in CLAUDE.md or the planner guidance.
- **resolved_by:**

## FIND-SPRINT-009-4
- **source:** TASK-029 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:2576-2601
- **description:** Section 8's rewritten preview-purity guard asserts two independent invariants under one label: `previewIsTransformed && exportIsPure`. Asserting both is deliberate and correct — checking export purity alone is what let the pre-TASK-029 fixture pass vacuously (FIND-SPRINT-007-7) — but the two halves fail for opposite reasons. `previewIsTransformed` going false means the dark transform stopped running at all; `exportIsPure` going false means the transform leaked into Copy HTML output. The row renders one undifferentiated FAIL badge either way, and this harness is the repo's only test surface, so the badge is the entire failure signal. The plan's own Lowest Confidence Area anticipated this ("a developer would have to know to look at the ordinary preview to see the real cause").
- **suggested_action:** When a future task next touches Section 8, have `check()` record which half failed (e.g. stash a reason string on the fixture object) and surface it in the Result field via the `failText` path, rather than splitting into two fixtures — a split would double the forced `render()` calls and add two more MJML compiles to harness open. Do not weaken the combined assertion.
- **resolved_by:**
