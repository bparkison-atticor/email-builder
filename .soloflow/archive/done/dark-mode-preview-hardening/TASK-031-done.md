---
id: TASK-031
sprint: SPRINT-009
epic: dark-mode-preview-hardening
status: done
summary: "Added a visible, screen-reader-announced dark-mode disclosure caption (#darkNote) sourced from a single DARK_MODE_CLIENT_NOTES map that also feeds the picker titles, and corrected the code comment and CHANGELOG claims that overstated the stage chrome's desktop legibility."
executor_loops: 0
code_review_rounds: 1
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-031 — Replace the dark-mode disclosure with a visible caption; correct the chrome-legibility claims

## What shipped

- **`#darkNote` caption** (`role="status"`, `hidden` by default) between the `#warn` banner and `#previewStage`; `.dark-note` CSS deliberately declares no `display` so the `hidden` attribute stays honoured. Shown only while dark mode is on; names the client being simulated and what it does — the disclosure now works without hover, keyboard-only, and is announced to screen readers. Matters most for Apple Mail, where "renders unchanged" was previously indistinguishable from a broken toggle.
- **`DARK_MODE_CLIENT_NOTES` map** is the single source for both the caption text and the picker button `title` attributes (hardcoded titles removed from the markup string; assigned in JS). A harness fixture couples its keys to `DARK_MODE_TRANSFORMS`.
- **`syncDarkNote()`** wired into both `onDarkModeToggle()` and the picker's `wireSegControl` callback; declared before the factory call per the construction-order constraint.
- **Corrected overstated claims**: `.preview-stage.dark` comment now documents the chrome as a secondary mobile-only signal (measured fully occluded at desktop) with `#darkNote` as primary; CHANGELOG bullet corrected and a new dated section documents the caption. "deliberate result" grep clean outside `.soloflow/`.
- **New harness Section 12** ("Dark-mode disclosure caption"), 4 fixtures after the review round.
- **Two routed findings resolved**: FIND-SPRINT-009-6 — harness sections renumbered into monotonic source order (module toggle 14→11, caption 12, pre-existing 13–15; CHANGELOG reference updated); FIND-SPRINT-009-2 — `MICROCOPY_DOM_GUARDS` loop migrated onto `renderPredicateFixtures` with its distinct failText preserved.

## Quality loop

- Verifier: APPROVED first pass (real-browser checks: caption behavior at 1600×1000, keyboard-only traversal with zero pointer events, export purity — the caption never leaks into copied HTML, screenshots differ between dark-OFF and dark-ON/Apple-Mail).
- Code review: 1 IMPROVEMENTS_NEEDED round — the new fixtures couldn't detect a dropped `syncDarkNote()` call site (fixture called the sync itself). Fixed in `7e1f1a8`: Section 11's live-click fixture now asserts `darkNote.hidden` as a fourth side effect, and a new live picker-click fixture covers the `wireSegControl` call site. Mutation coverage of both call sites independently confirmed by executor, verifier, reviewer, AND test-writer — each deletion kills exactly one distinct fixture. Re-review CLEAN, re-verification APPROVED (including harness idempotence entering from dark-ON/non-default-client states).
- Test-writer: NO_TESTS_NEEDED — all test_strategy targets covered and mutation-verified.

## Commits

`db9e6c3`, `241a854`, `8ed19c3`, `bb360ce`, `0bf9b49`, `7e1f1a8` — index.html, CHANGELOG.md, findings-file status updates.

## Findings

- Resolved: FIND-SPRINT-009-2, FIND-SPRINT-009-6.
- Queued this task: FIND-SPRINT-009-9 (helper comment scope stale), -10 (third grep-proxy anti-pattern instance in plans), -11 (CHANGELOG renumbering cross-reference nits), -12 (failText interpolated unescaped — inert today), -13 (fifteen-fold h3+cssText header duplication), -14 (fixture 4 single-click form + stale line ref).

## Notes

- Harness now 121 rows / 0 FAIL across 15 monotonically-numbered sections.
- Known deliberate tradeoffs (documented in plan): role="status" may not announce on the first unhide on some AT combos (the switch's aria-checked change still announces); caption sentences are unreviewed copy isolated in one map for easy editing.
