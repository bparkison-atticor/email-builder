---
sprints: [SPRINT-003]
span_label: SPRINT-003
created: 2026-05-13T00:00:00.000Z
counters_start:
  ideas: 0
summary:
  cleanups: 2
  backlog_tasks: 1
  claude_md: 0
  soloflow_improvements: 0
---

# Compound Proposal — SPRINT-003

## A. Clean-up items (execute now)

### A1. Append `#and, #or` to the registered-helpers list in CODE-PATTERNS.md
- **Summary:** The `applyTestData` entry in CODE-PATTERNS.md still lists only 6 helpers and omits the `#and` / `#or` block helpers shipped in TASK-007, causing documentation drift.
- **Source-Sprint:** SPRINT-003
- **Rationale:** The banner comment inside `index.html` (~line 717) is now the authoritative list; CODE-PATTERNS.md is one task behind. Any future agent reading CODE-PATTERNS.md will incorrectly believe `#and` / `#or` are unregistered and may attempt to re-register or skip them. The fix is a one-token append to a single line.
- **Blast radius:** `CODE-PATTERNS.md` line ~37 only. Risk: trivial.
- **Source:** FIND-SPRINT-003-1 — surfaced by TASK-007 code-reviewer; executor could not fix it because CODE-PATTERNS.md was in `files_readonly` for that task.
- **Proposed change:**
  ```diff
  --- a/CODE-PATTERNS.md
  +++ b/CODE-PATTERNS.md
  @@ line 37 @@
  -  helpers (`#equals`, `#notEquals`, `#greaterThan`, `#lessThan`, `insert`, `formatDate`), and native Handlebars block helpers.
  +  helpers (`#equals`, `#notEquals`, `#greaterThan`, `#lessThan`, `insert`, `formatDate`, `#and`, `#or`), and native Handlebars block helpers.
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Grep confirms `Handlebars.registerHelper('and', ...)` at index.html:887 and `registerHelper('or', ...)` at line 897, while CODE-PATTERNS.md:37 omits both — one-token append fixes verified documentation drift at near-zero blast radius.

### A2. Add two missing fixture entries to `HUMANIZE_FIXTURES` to cover the empty-message and generic `^Parse error` branches
- **Summary:** `HUMANIZE_FIXTURES` in `index.html` covers only 5 of 7 branches in `humanizeTemplateError`, leaving the empty-message guard and the generic `^Parse error` fallback unexercised by the test harness.
- **Source-Sprint:** SPRINT-003
- **Rationale:** The harness was built to prevent silent dead-code in `humanizeTemplateError`. Without these two fixtures the Ctrl+Shift+T panel shows all green while two production branches at lines 1624 and 1645 go unexercised — exactly the failure mode the harness exists to catch. The existing last fixture (`label: 'fallback / render-time error'`) passes a `TypeError` string that hits neither the empty-message guard (line 1624) nor the `^Parse error` pattern (line 1645), so both branches have no coverage. Adding two entries is a bounded, safe edit to a dev-only const array.
- **Blast radius:** `index.html` const `HUMANIZE_FIXTURES` (~line 1655), two new array entries inserted before the closing `];`. Risk: trivial — dev-only harness, no production code path affected.
- **Source:** FIND-SPRINT-003-3 — surfaced by SPRINT-003 sprint-code-reviewer; TASK-008 code-reviewer noted the gap was within plan's allowed fixture range but did not log a finding; sprint-code-reviewer did.
- **Proposed change:**

  Insert two new fixture objects inside `HUMANIZE_FIXTURES` between the existing `'unclosed mustache'` entry and the existing `'fallback / render-time error'` entry (i.e., after line 1675, before line 1676):

  ```diff
  --- a/index.html
  +++ b/index.html
  @@ ~line 1675 @@
     {
       label: 'unclosed mustache',
       input: "Expecting 'CLOSE', got 'EOF'",
       expected_pattern: "unclosed {{ tag",
     },
  +  {
  +    label: 'empty message (guard)',
  +    input: "",
  +    expected_pattern: "template syntax error.",
  +  },
  +  {
  +    label: 'generic parse error (no token)',
  +    input: "Parse error on line 1: invalid token",
  +    expected_pattern: "check your {{…}} tags",
  +  },
     {
       label: 'fallback / render-time error',
       input: "TypeError: Cannot read properties of undefined",
       expected_pattern: "Body copy: TypeError",
     },
  ```

  The `""` input exercises the `if (!message)` guard at line 1624; the `"Parse error on line 1: invalid token"` input exercises the `^Parse error/i` branch at line 1645 because it contains neither `CLOSE_BLOCK` nor `CLOSE_RAW_BLOCK` nor `doesn't match` — so all earlier branches are skipped.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Verified at index.html:1624 (`if (!message) return …`) and :1645 (`^Parse error/i`) that both branches exist and are not hit by any of the 5 current fixtures (the TypeError fixture falls through to the line 1649 fallback, not 1645), so the harness's stated purpose — preventing silent dead-code — currently lies about coverage; two const-array entries fix it with zero production risk.

---

## B. Backlog tasks (refine into execution-ready plans)

### B1. Refactor `#testHarness` to reuse the established modal idiom instead of its parallel overlay implementation
- **Summary:** The test harness panel uses a wholly separate CSS/HTML/JS modal idiom (~100 new lines) rather than the existing `.modal-overlay` / `.modal` / `.visible` pattern shared by `#htmlModal` and `#linkModal`, creating pattern drift in the single-file codebase.
- **Source-Sprint:** SPRINT-003
- **Source:** FIND-SPRINT-003-2 — surfaced by SPRINT-003 sprint-code-reviewer.
- **Problem:** TASK-008 introduced `.test-harness`, `.test-harness-inner`, `.test-harness-header`, `.test-harness-body`, `.harness-row.pass/.fail`, `.harness-badge`, `.harness-field` CSS (~100 lines, `index.html` ~lines 517–617), a `[hidden]`-attribute toggle, and a hand-rolled Escape branch — duplicating the modal shell, header chrome, overflow scrolling, and outside-click/Escape close behavior already provided by the established modal pattern. In a single-file codebase with no build step or component system, every independent parallel idiom increases the maintenance surface proportionally. The two existing modals (`#htmlModal` / `#linkModal`) share `openHtmlModal` / `closeHtmlModal` functions (~line 2021) and a single Escape chain; the harness sits outside that chain via an early `return` at ~line 2045.
- **Proposed direction:** Replace the `#testHarness` `[hidden]`-attribute toggle and `.test-harness*` CSS block with the established pattern: mark `#testHarness` with `class="modal-overlay"`, add an inner `class="modal"` wrapper, use a `class="modal-close"` button, and toggle visibility via `.visible` on the overlay (the same mechanism used by `openHtmlModal` / `closeHtmlModal` at ~line 2021). Delete the ~100-line `.test-harness*` CSS block (~lines 517–617) and replace with any needed modifier class (e.g. `.modal--dev` on the inner `.modal` div for visual differentiation, keeping it to a handful of lines). Merge the harness Escape handling into the existing modal Escape chain at ~line 2041 — the early `return` at ~line 2045 can be replaced with a `.visible`-based condition check, preserving existing `linkModal` / `htmlModal` Escape ordering. The `renderTestHarness()` call and `HUMANIZE_FIXTURES` logic are unaffected; only the shell markup, CSS, and open/close wiring change.
- **Scope:** medium — involves coordinated changes across CSS (~lines 517–617), HTML (`#testHarness` markup), and the keydown handler (~lines 2033–2055). Low semantic risk but requires careful cross-reference of the existing modal open/close functions to avoid breaking the two production modals.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Grep confirms the parallel idiom is real — `.modal-overlay` lives at index.html:421/760/777 with `openHtmlModal`/`closeHtmlModal` at :2016 and a unified Escape chain at :2045, while the harness sits outside via the early `return` at :2043 and ships ~100 lines of duplicate `.test-harness*` CSS (517-617); refactoring before the idiom is copied a third time is the proportional moment, and B1 is a backlog refinement (not immediate execution) so the refiner can rescope if cost grows.
- **Counterfactual:** If the harness needed materially different chrome (e.g., side-by-side dev panels) that `.modal` can't express with one modifier class, the parallel idiom would be justified and this would flip to DONT_IMPLEMENT.

---

## C. CLAUDE.md / CODE-PATTERNS.md improvements (apply now)

_No items._

---

## Reconciled Findings (informational)

_No stale-open findings were claimed resolved by a done report._
