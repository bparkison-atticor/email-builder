---
epic: harness-hygiene
created: 2026-08-19T15:00:00Z
status: active
originating_ideas: [SPRINT-008-proposal]
---

# Developer test harness hygiene

## Objective

The Ctrl+Shift+T harness is this project's only test surface, and it has accumulated defects that undermine that role: one throwing fixture blanks the entire run, 12 hand-copied row loops have drifted into three label vocabularies and inconsistent escaping, and opening the harness leaves keyboard focus inside a hidden editor so stray keystrokes type into the compiled email. This epic makes the harness trustworthy and cheap to extend.

## Scope

- In scope: a shared header renderer and a shared row renderer owning label vocabulary, escaping, and try/catch around the function under test; migrating all existing sections onto them; the folded-in hygiene defects those loops were hiding (stale parity comment, `html: null` config fixtures, hard-coded `richToolbar[0]`, unexplained blank input box, `includes` → `startsWith` on the styled-emission row); eliminating the harness's focus theft and unrestored DOM mutation; a CODE-PATTERNS entry so future section authors find the helpers.
- Out of scope: changing what any assertion means; adding new coverage for production behavior (that belongs to the tasks that change behavior); a focus trap for the overlay; migrating the one bespoke seed-mutate-restore section.

## Success Signal

Opening the harness is side-effect-free — focus lands on the close button, no dialog state is left mutated, no timer is left pending — and adding a new fixture section means writing a fixture array and one `run` callback, with row markup, escaping, labels, and throw containment inherited. A fixture that throws costs one red row, not the whole run.
