---
sprints: [SPRINT-002]
span_label: SPRINT-002
created: 2026-05-13T00:00:00.000Z
counters_start:
  ideas: 2
summary:
  cleanups: 0
  backlog_tasks: 2
  claude_md: 3
  soloflow_improvements: 0
---

# Compound Proposal — SPRINT-002

## A. Clean-up items (execute now)

_No items._

The three smoke-test bugs (commits a16e93d, 17a0344, 4f23975) are already on main. There are no stale TODOs, dead imports, or vestigial files surfaced by this sprint's reports.

---

## B. Backlog tasks (refine into execution-ready plans)

### B1. Extend `#and` / `#or` block helper shims deferred from TASK-005

- **Summary:** TASK-005 explicitly deferred the `#and` / `#or` SendGrid Handlebars helpers per IDEA-001 Q3 — they are unimplemented and templates that use them will silently fall through.
- **Source-Sprint:** SPRINT-002
- **Source:** TASK-005 done report (`TASK-005-done.md`) — "Native `#if`/`#each`/`#unless`/`{{{raw}}}` not re-registered. `#and`/`#or` deferred per IDEA-001 Q3."
- **Problem:** SendGrid templates frequently combine conditions with `{{#and}}` / `{{#or}}` block helpers. Without these shims, a template using `{{#and var1 var2}}` silently resolves to the `blockHelperMissing` path (which calls `options.inverse(this)` per TASK-006), making conditional sections disappear in the preview with no diagnostic. The marketer gets no error, no chip, and no hint that the logic was skipped. The gap is structural — it was a deliberate deferral, not an oversight.
- **Proposed direction:** Register `#and` and `#or` as Handlebars block helpers at the same registration site as the other shims (`index.html` ~line 714). Both should accept a variadic list of arguments (matching SendGrid's documented behavior: all args truthy → `options.fn(this)`, otherwise `options.inverse(this)` for `#and`; any arg truthy → `options.fn(this)` for `#or`). Each arg should be run through `isMissingChip()` — treat a chip as falsy so that missing-data paths cause the else-branch, not the then-branch (consistent with how `equals`/`greaterThan` already handle chips, per TASK-006). Add a note in the `applyTestData` / `buildTestDataContext` comment block documenting the complete list of supported helpers.
- **Scope:** small

---

### B2. Add a `humanizeTemplateError` test harness / smoke-test fixture

- **Summary:** `humanizeTemplateError` pattern-matches raw Handlebars error strings using regex heuristics — this logic is fragile and currently has no test coverage, relying entirely on manual smoke testing to catch regressions.
- **Source-Sprint:** SPRINT-002
- **Source:** Post-sprint user smoke test (commit 4f23975) — required a `humanizeTemplateError` function not planned in the original task spec; TASK-004, TASK-005, TASK-006 all note "No test infra. Skipped."
- **Problem:** `humanizeTemplateError` (`index.html` ~line 1476) uses sequential `if` / `else if` pattern-matching on Handlebars error message strings (e.g., `"Expecting 'CLOSE_BLOCK'"`, `"Parse error"`, `"Expecting 'CLOSE'"`) to produce user-facing plain-English messages. Handlebars' error message format is not a public contract — a CDN pin bump from `@4.7.8` to a future `@4.x.x` could silently change the error strings, causing the humanizer to fall through to its generic fallback for errors that should have been recognized. Because the project has no test runner, even a manual browser test is unlikely to exercise all branches. The risk is proportional to the number of regex arms — currently the function has at least 4 distinguishable branches (unclosed block, mismatched block tags, unbalanced mustache, generic). Designing a lightweight in-browser fixture page (or a `<details>` developer panel hidden in `index.html`) that lets a developer trigger each error shape on demand would catch this class of regression without introducing a build step.
- **Proposed direction:** Create a small developer fixture (either a standalone `test-harness.html` co-located with `index.html`, or a hidden `#devPanel` inside `index.html` toggled by a keyboard shortcut) that imports `humanizeTemplateError` and runs a table of `{ input, expected }` pairs, reporting pass/fail inline. The fixture does not need a test runner — a plain `console.assert` loop or a rendered diff table is sufficient for this project's no-build-step constraint. Pairs to cover: (1) `"Parse error on line N: Expecting 'CLOSE_BLOCK', got 'EOF'"`, (2) a mismatched open/close block tag message, (3) an unbalanced `{{` message, (4) a message that matches none of the above (generic fallback). This makes future Handlebars CDN pin bumps safe to do with confidence.
- **Scope:** small

---

## C. CLAUDE.md / CODE-PATTERNS.md improvements (apply now)

### C1. Document the `has` + `getOwnPropertyDescriptor` Proxy trap requirement for Handlebars 4.7+ compatibility

- **Summary:** Any future Proxy-based context wrapper for Handlebars must include `has` and `getOwnPropertyDescriptor` traps — the `get` trap alone is insufficient because Handlebars 4.7's `lookupProperty` uses `hasOwnProperty` to guard access, which bypasses `get`.
- **Source-Sprint:** SPRINT-002
- **Target file:** `CODE-PATTERNS.md`
- **Rationale:** TASK-006's plan flagged the Proxy / Handlebars internal-probe interaction as the "Lowest Confidence Area." The code reviewer passed the implementation as written — it matched the plan. But the plan's Proxy only had a `get` trap. During user smoke testing, every nested missing-data chip was silently stripped because `hasOwnProperty` (called inside Handlebars' `lookupProperty`) does not go through the `get` trap. The fix (commit a16e93d) required adding `has(target, prop)` and `getOwnPropertyDescriptor(target, prop)` traps so that Proxy targets appear to "own" any non-internal key. This is a non-obvious Handlebars internals interaction that will bite any future agent adding a second Proxy-backed context or extending `buildTestDataContext`.
- **Proposed change:**
  ```diff
  ## Shared Utilities
  
  +### `buildTestDataContext`
  +
  +- **Location:** `index.html` ~line 1404
  +- **Use it for:** Wrapping a parsed test-data object in a Proxy so that any key
  +  lookup that resolves to `undefined` emits a visible yellow chip in the preview
  +  rather than silently rendering as an empty string. Used exclusively by
  +  `applyTestData()` — never applied to the copied / exported HTML.
  +- **Canonical example:** see `buildTestDataContext` and `applyTestData` (~line 1504).
  +- **Critical Handlebars 4.7+ trap requirement:** the Proxy MUST include both
  +  `has(target, prop)` and `getOwnPropertyDescriptor(target, prop)` traps in
  +  addition to the `get` trap. Handlebars' `lookupProperty` (proto-access.js)
  +  calls `Object.prototype.hasOwnProperty.call(obj, key)` to guard against
  +  prototype-pollution. `hasOwnProperty` does NOT go through the `get` trap —
  +  without `has` and `getOwnPropertyDescriptor`, every chip emitted from a
  +  nested path is silently stripped back to `undefined` before reaching rendered
  +  output. Fix landed in commit a16e93d. Any extension of `buildTestDataContext`
  +  must preserve all three traps.
  +- **Internal-key allowlist:** `INTERNAL_KEYS` (a `Set`) + Symbol passthrough +
  +  `__`-prefix guard prevent chip leakage into Handlebars' own property probes.
  +  Extend `INTERNAL_KEYS` if new template patterns cause stray chips in
  +  non-preview output.
  ```

---

### C2. Document the `#warn` banner as the correct location for all template/compile errors visible above the preview

- **Summary:** Template-compilation errors must surface in the `#warn` banner above the preview iframe, not in `#testDataHint` — `#testDataHint` is reserved for JSON parse feedback only.
- **Source-Sprint:** SPRINT-002
- **Target file:** `CODE-PATTERNS.md`
- **Rationale:** TASK-006's original implementation (commit 707e797) placed Handlebars compile/render errors at `#testDataHint` — the small hint line below the JSON textarea — because that is where test-data JSON errors go. The reasoning was that template errors come from test data. They do not: template syntax errors come from the body copy editors (Quill), which are in a completely different part of the UI. A marketer would never look at the JSON hint after typing body copy. Fix: commit 17a0344 introduced the `templateError` module-scoped variable, which `render()` reads and folds into the `#warn` banner alongside MJML warnings. The wiring is non-obvious enough that the original executor and code-reviewer both missed it.
- **Proposed change:**
  ```diff
  ## Recurring Patterns
  
  +- **Error surface routing.** There are two distinct error displays:
  +  - `#testDataHint` (`.hint` element below the JSON textarea, ~line 599) — JSON
  +    parse errors only, set via `setTestDataHint()`. Do NOT use for Handlebars
  +    compile or render errors.
  +  - `#warn` (`.warn` banner above the preview iframe, ~line 648) — template
  +    compile errors, MJML warnings, and placeholder image notices. Set via
  +    `showWarn()`. Template errors are staged in the module-scope `templateError`
  +    variable (set inside `applyTestData()`) and folded in by `render()` at the
  +    `warnings.unshift(templateError)` call (~line 1607). Any new error that
  +    requires marketer attention during preview must go through `#warn`.
  ```

---

### C3. Add a rule requiring `humanizeTemplateError`-style wrapping for any user-visible error message that originates from a library's internal exception

- **Summary:** Raw library error messages (e.g., Handlebars' "Expecting 'CLOSE_BLOCK', got 'EOF' on line 334") must never be shown to marketers — always wrap in a `humanizeTemplateError`-style function that maps compiler internals to plain-English actions.
- **Source-Sprint:** SPRINT-002
- **Target file:** `CLAUDE.md`
- **Rationale:** When TASK-006 wired up Handlebars error display, it surfaced `e.message` directly via `setTestDataHint('Template error: ' + e.message, 'error')`. Marketers using the tool never see the compiled HTML, don't know what "line 334" refers to, and have no frame of reference for tokens like `CLOSE_BLOCK` or `EOF`. The fix (commit 4f23975) introduced `humanizeTemplateError()`, which pattern-matches known error shapes and emits messages like "Body copy: unclosed block — add {{/blockName}} to close it." This is a recurring risk: any future feature that catches an exception from Handlebars, MJML, or another CDN library must apply the same humanization step before rendering the message in the UI.
- **Proposed change:**
  ```diff
  ## Conventions
  
  +- **Library errors must be humanized before display.** Never show raw exception
  +  messages from Handlebars, MJML, or other CDN libraries to the user. Use a
  +  named function (following the `humanizeTemplateError` pattern at `index.html`
  +  ~line 1476) that pattern-matches known error shapes and returns plain-English
  +  action-oriented messages. Line numbers that refer to compiled HTML the marketer
  +  never sees must be stripped. Compiler tokens (`CLOSE_BLOCK`, `EOF`, `ID`) must
  +  be translated to concrete instructions.
  ```

---

## Reconciled Findings (informational)

The SPRINT-002 findings file (`SPRINT-002-findings.md`) was empty at compound time (`pending_count: 0`). No open findings required reconciliation against done reports.

---

## Suppressed — SoloFlow Defects

The following candidate C-items were suppressed because they describe SoloFlow agent behavior rather than project-local conventions:

- **Formal verifier cannot catch browser-rendering bugs** — The root of all three post-sprint bugs is that the shadow-verifier was config-disabled and AC items requiring `"test in browser"` were left as manual smoke checks. All three failures required real browser rendering to observe. This is a SoloFlow verification-gap issue (the verifier agent's capabilities and the "visual verification config-disabled" stub-APPROVED path), not a rule that belongs in this project's CLAUDE.md. Consider opening an issue or running `/sf:compound --tester` against this sprint in a SoloFlow-tester setup to surface it as a maintainer recommendation.

- **Code-reviewer passing code that matches-the-plan-but-the-plan-was-wrong** — The code reviewer correctly verified that TASK-006's implementation matched its plan spec. The defect was in the plan's Q4 answer (error location) and in the plan's Proxy design (missing traps), not in the executor's code. A code-reviewer that can only check code-against-plan cannot catch plan-level errors. This is a SoloFlow agent-design concern (plan validation vs. code validation), not a project convention.
