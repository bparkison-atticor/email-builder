---
sprint: SPRINT-003
pending_count: 3
last_updated: "2026-05-13T18:39:10.436Z"
---
# Findings Queue

## FIND-SPRINT-003-1
- **source:** TASK-007 (code-reviewer)
- **type:** claude-md
- **severity:** low
- **status:** open
- **location:** CODE-PATTERNS.md:37
- **description:** The `applyTestData` entry's "Registered helpers" list reads `#equals, #notEquals, #greaterThan, #lessThan, insert, formatDate` and does not mention the newly registered `#and` / `#or` variadic block helpers shipped in TASK-007. The banner comment inside `index.html` (~line 717) is now the authoritative list; CODE-PATTERNS.md has drifted one task behind.
- **suggested_action:** Append `, #and, #or` to the registered-helpers list in CODE-PATTERNS.md line ~37 so future readers don't think these helpers are unregistered. CODE-PATTERNS.md was in `files_readonly` for TASK-007, which is why the executor could not fix it in-task.
- **resolved_by:** 

## FIND-SPRINT-003-2
- **source:** SPRINT-003 (sprint-code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:815-825,517-617,2034-2054
- **description:** Test-harness overlay introduces a parallel modal idiom rather than reusing the existing `.modal-overlay` / `.modal` / `.modal-close` / `.visible` pattern used by `#htmlModal` (~line 760) and `#linkModal` (~line 777). TASK-008 added `.test-harness`, `.test-harness-inner`, `.test-harness-header`, and `.test-harness-body` CSS classes (~100 new lines under `index.html` ~lines 517-617) plus a `[hidden]`-attribute toggle and a hand-rolled close button — duplicating the modal shell, header chrome, overflow scrolling, and outside-click/Escape close behavior already implemented for the other two modals. In a strictly single-file codebase this kind of pattern drift compounds quickly.
- **suggested_action:** Refactor `#testHarness` to use the established `class="modal-overlay"` + `class="modal"` + `class="modal-close"` markup and the `.visible` class toggle (see `#htmlModal` ~line 760 and `openHtmlModal`/`closeHtmlModal` ~line 2021). Delete the `.test-harness*` CSS block (~lines 517-617) and the keydown branch that twiddles the `hidden` attribute. The Escape handler at ~line 2045 can then collapse into the existing modal Escape chain. If the dev-only harness needs visual differentiation, add a single modifier class on top of `.modal` (e.g. `.modal--dev`) rather than a whole parallel idiom.
- **resolved_by:** 


Suspected tasks: TASK-008

## FIND-SPRINT-003-3
- **source:** SPRINT-003 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:1655-1681,1623-1650
- **description:** `HUMANIZE_FIXTURES` (TASK-008) covers 5 of the 7 branches in `humanizeTemplateError` (TASK-007 sprint-prior). Missing fixtures: (1) the `^Parse error/i` fallback branch at ~line 1645 (which only fires when no other pattern matched — the existing `unclosed block (named)` fixture short-circuits before reaching it); (2) the empty-message branch at ~line 1624 (`if (!message) return Body copy: template syntax error.`). Without these, the harness gives green PASS lights while two production code paths remain unexercised — exactly the failure mode the harness was built to prevent.

Suspected tasks: TASK-008
- **suggested_action:** Add two more entries to `HUMANIZE_FIXTURES` (~line 1655): one with `input: ""`, `expected_pattern: "template syntax error."` to cover the empty-message branch; and one with a `Parse error` input that does NOT contain `CLOSE_BLOCK`/`CLOSE_RAW_BLOCK`/`CLOSE` (e.g. `"Parse error on line 1: invalid token"`), `expected_pattern: "check your {{…}} tags"` to cover the generic parse-error branch.
- **resolved_by:** 
