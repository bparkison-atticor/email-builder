---
sprint: SPRINT-009
pending_count: 8
last_updated: 2026-08-13T14:44:26Z
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

## FIND-SPRINT-009-5
- **source:** TASK-030 (verifier)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** .soloflow/active/plans/dark-mode-preview-hardening/TASK-030-plan.md:24-25
- **description:** Second recurrence of the anti-pattern FIND-SPRINT-009-3 already flagged, and this time the plan contradicts itself outright. Acceptance criterion 6's verification is `grep -c "querySelector('.preview-header-left')" index.html returns 1`, but the same plan's step 6 supplies the new harness fixture verbatim with `const kids = Array.from(document.querySelector('.preview-header-left').children);` inside it — so satisfying steps 3 and 6 as written necessarily produces a count of 2. The criterion's substantive property ("evaluated exactly once and cached in a const reused by every header-append call site") is objectively true at runtime; only the grep proxy is unsatisfiable. Verification had to judge intent over the literal check for the second task running in this sprint.
- **suggested_action:** Planner guidance: when an acceptance criterion's verification is a `grep -c` over a whole file, cross-check it against the code the plan's own implementation steps introduce. Prefer a scoped proxy — e.g. "no `document.querySelector('.preview-header-left')` occurs between the `previewHeaderLeft` declaration and the end of the dark-mode block" — or state the property and let the verifier pick the probe. Pairs with FIND-SPRINT-009-3; two instances in one sprint makes this worth a line in CLAUDE.md or the planner prompt.
- **resolved_by:**

## FIND-SPRINT-009-6
- **source:** TASK-030 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2820-2828
- **description:** Harness section numbers are no longer monotonic in source order: the file now reads Sections 7, 8, 9, 10, **14**, 11, 12, 13. TASK-030's plan said "Section 11", but 11-13 (rich-text italics, richtext parity, CTA microcopy) already existed from earlier sprints, and renumbering them would have desynced CHANGELOG.md's "Test harness Sections 11-13" entry — a file outside TASK-030's `files_owned`. The executor picked the next free number, kept the plan's mandated placement after Section 10, and documented the choice in an eight-line comment, which is the right call given the constraints. The residual wart is that the rendered harness has no visible numbers, so this section is the *eleventh* heading a user sees while the source calls it 14 — someone told "the eleventh section failed" would grep `Section 11` and land on rich-text italics.
- **suggested_action:** TASK-031 owns CHANGELOG.md for this epic and could resolve it cheaply: either renumber the new section to 11 and shift the old 11-13 to 12-14 (updating the CHANGELOG line in the same commit), or drop numeric section labels entirely in favour of the heading text the harness actually renders. The latter is more durable — section numbers over a file multiple tasks grow concurrently will collide again.
- **resolved_by:**

## FIND-SPRINT-009-7
- **source:** TASK-030 (verifier)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:4087,4119
- **description:** `createModuleToggle`'s `localStorage.getItem` / `setItem` calls are still unguarded, so a browser that throws on storage access (blocked site data, hardened profile, extension stub) throws out of the first factory call at index.html:4037 and aborts the rest of module init — no toggles, no render wiring, dead app. The migration shim immediately above it (index.html:4020-4032) was already hardened with try/catch for exactly this reason, so the file is now inconsistent about a hazard it has already acknowledged once. TASK-030's plan explicitly deferred this ("Wrapping the factory's `localStorage.getItem` in try/catch … Worth its own backlog item") to keep the acceptance criteria clean, which was correct — this is the backlog item. Note the new `persist = false` path narrows the blast radius slightly: the dark-mode caller no longer touches storage at all.
- **suggested_action:** Wrap the read in a try/catch that falls back to `null` (yielding `defaultOn`) and the write in a try/catch that silently no-ops, mirroring the comment style of the existing shim at index.html:4028-4031. Add a harness fixture that stubs `localStorage.getItem` to throw and asserts the factory still returns a usable toggle.
- **resolved_by:**

## FIND-SPRINT-009-8
- **source:** TASK-030 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2873-2884
- **description:** Two small hygiene issues in the new "Preview header append order" fixture. (1) The label enumerates six children including both `<span class="divider">` elements, but the predicate only checks the viewport control, the Test data toggle, `#darkModeSwitch`, `#darkClientControl` and a `module-toggle` count of 2 — neither divider is asserted, so deleting the static trailing divider (the exact element the new HTML comment hangs its contract on) leaves this row green. (2) `at(el => !!el.querySelector && !!el.querySelector('button[data-vp]'))` guards against a missing `querySelector` method on a value that came from `Array.from(container.children)` and is therefore always an Element; the three sibling predicates on the next lines use `el.classList` / `el.id` with no such guard, so the file is internally inconsistent about a condition that cannot be false. Neither affects what the fixture currently catches (the load-bearing control ordering is asserted correctly), which is why this is queued rather than raised against the task.
- **suggested_action:** When a future task next touches this fixture: drop the `!!el.querySelector &&` half of the viewport predicate, and either add a divider assertion (e.g. `kids.filter(el => el.classList.contains('divider')).length === 2`) or trim the label to name only what is checked.
- **resolved_by:**
