---
id: TASK-025
sprint: SPRINT-008
epic: cta-microcopy
status: done
summary: "Added italic to the shared rich-text toolbar and paste whitelist, with em/i normalised to explicit inline font-style:italic; in richTextToMjText and a 5-fixture harness section including a byte-parity gate"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-025 Done Report

## What shipped

- `richToolbar` → `[['bold', 'italic', 'link'], [{ list: 'ordered' }, { list: 'bullet' }]]` and `allowedFormats` → `['bold', 'italic', 'link', 'list']` — both body editors inherit italic from the shared config with no per-editor edits.
- Stale paste-whitelist comment rewritten (italic no longer listed among stripped formats); body-above placeholder now reads "Enter copy. Bold, italics, lists, and links supported."
- New normalisation pass in `richTextToMjText`: `em`/`i` elements receive `style="font-style:italic;"`, inserted after the anchor-styling passes and before the paragraph-margin pass. `<strong>` deliberately untouched (documented asymmetry).
- Harness Section 11 "rich-text italics — em/i normalisation" with 5 fixtures: `<em>` inline style, `<i>` inline style, nested `<strong>` untouched, non-italic byte-parity gate, and a `richToolbar`/`allowedFormats` config assertion.

## Commits

- `6b2008e` feat(TASK-025): add italic to shared rich-text toolbar and paste whitelist
- `27c425b` feat(TASK-025): normalise em/i with explicit inline font-style:italic;
- `b57b10c` test(TASK-025): add harness section for em/i italic normalisation

## Verification

- Verifier: APPROVED. Independent headless-Chrome runs of baseline (66/66, 10 sections) vs HEAD (71/71, 11 sections); 24-input differential corpus proved byte-parity for all 19 non-italic inputs; Word-shaped and web-shaped paste payloads confirmed italic survives while colour/heading/underline/table formatting is stripped; full-compile check confirmed `font-style:italic;` reaches final MJML-compiled HTML; dark-mode transforms (TASK-021..024) process italic content cleanly.
- Code review: CLEAN (0 critical / 0 important / 3 minor hygiene findings on the new section, filed as FIND-SPRINT-008-3/4 for compound triage). Widened paste whitelist assessed as no new security surface. Out-of-diff observation FIND-SPRINT-008-2 (medium): pre-existing `PassthroughLink.sanitize` passthrough removes the scheme filter on links — predates this task, filed for triage.
- Test-writer: NO_TESTS_NEEDED — planned test_strategy fully implemented by harness Section 11; independently re-confirmed 71/71 PASS via Playwright.

## Scope

Only `index.html` modified (+75/−5). README.md, ARCHITECTURE.md, CODE-PATTERNS.md left untouched per plan step 8 — doc propagation is TASK-028's exclusive ownership. The frozen design-handoff snapshot was not edited.
