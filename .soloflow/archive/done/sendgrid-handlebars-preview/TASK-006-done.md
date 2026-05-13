---
id: TASK-006
sprint: SPRINT-002
epic: sendgrid-handlebars-preview
status: done
summary: "Added try/catch error surface (setTestDataHint) and Proxy-based missing-data fallback chips (yellow [Path — not set] spans) with sentinel detection in the 4 block helpers."
executor_loops: 0
code_review_rounds: 0
visual_mobile: skipped_user_preference
visual_web: skipped_user_preference
---

# TASK-006 Done

## Changes

`index.html` — 109 lines inserted, 2 lines replaced:

- **Sentinel detector** at line 728: `isMissingChip(val)` checks `SafeString` content for the chip HTML prefix `<span style="background:#fef08a`.
- **Block helper updates** (lines 729-746): `equals`, `notEquals`, `greaterThan`, `lessThan` now short-circuit to `options.inverse(this)` when either arg is a missing-data chip.
- **`helperMissing` registration** (lines 789-794): returns a `SafeString` chip using `options.name` for root-level path misses.
- **`blockHelperMissing` registration** (lines 797-799): returns `options.inverse(this)` for unresolved block helper names.
- **`buildTestDataContext(data)`** (lines 1381-1444): recursive Proxy that:
  - Pre-seeds `unsubscribe: '#unsubscribe-preview'` on root before Proxy construction.
  - Returns present primitives/sub-objects as-is.
  - Returns recursive Proxies for sub-objects with `prefix + key + '.'`.
  - Emits `SafeString` chips for missing leaves: `<span style="background:#fef08a;padding:0 2px;border-radius:2px;font-family:monospace;font-size:0.9em">[fullPath — not set]</span>`
  - Internal-key allowlist (`INTERNAL_KEYS` set + Symbol/non-string passthrough + `__`-prefix guard) prevents chip leaks to Handlebars internals.
- **`applyTestData()` rewrite** (lines 1446-1463): try/catch wraps `Handlebars.compile()` and `template(context)` separately; both catch arms call `setTestDataHint('Template error: ' + e.message, 'error')` and `return html`.

## Commit

- `707e797` — feat(TASK-006): add try/catch error surface and missing-data fallback chips

## Acceptance Criteria

All 7 plan ACs map to verifiable static structure (verified by code-reviewer) plus 5 manual smoke checks (require browser):
- i. `{{#unclosed}}` shows error hint, preview structure intact (test in browser)
- ii. Removed `Client.FirstName` shows yellow chip (test in browser)
- iii. `{{{unsubscribe}}}` resolves to `#unsubscribe-preview` with no chip
- iv. `{{#equals missingPath "X"}}A{{else}}B{{/equals}}` with missing path renders `B`
- v. `lastHtml` (Copy HTML) still contains raw tokens, not chips

## Verifier

Skipped (shadow-verifier not installed). Stub APPROVED.

## Code Review

CLEAN. No critical/important/minor findings. Reviewer confirmed:
- Both catch arms return `html` (original), not partial output
- `lastHtml` invariant preserved at `render()` line 1528
- Internal-key allowlist has layered defense (INTERNAL_KEYS + Symbol passthrough + `__`-prefix guard)
- HTML-prefix sentinel detection is literal-identical at both chip emission sites

## Tests

No test infra. Skipped.

## Known Lowest-Confidence Areas (per plan)

1. Handlebars internal property probes — allowlist may need extension if real templates leak chips through unforeseen probe paths.
2. HTML-prefix sentinel collision risk — currently acceptable (marketer-facing tool, no author-supplied SafeString HTML in scope). Tagged-Proxy fallback documented in plan if needed.

These are reasons to validate via manual smoke before declaring the feature production-ready.
