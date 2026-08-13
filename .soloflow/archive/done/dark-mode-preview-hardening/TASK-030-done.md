---
id: TASK-030
sprint: SPRINT-009
epic: dark-mode-preview-hardening
status: done
summary: "Gave createModuleToggle a persist opt-out and rebuilt the dark-mode switch as an ordinary factory caller, retiring the hand-rolled duplicate; the preview header's runtime-append order is now documented in the markup and locked by a harness fixture."
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-030 — Migrate the dark-mode switch onto createModuleToggle with a persistence opt-out

## What shipped

- **`createModuleToggle(id, label, defaultOn, onChange, persist = true)`**: both localStorage sites gated (`persist ? localStorage.getItem(key) : null`; `if (persist) localStorage.setItem(...)`). Backwards-compatible by construction — CTA, Promo, and Test data callers unchanged and regression-locked by a fixture.
- **Dark-mode switch rebuilt on the factory**: `createModuleToggle('darkMode', 'Dark mode', false, onDarkModeToggle, false)`. Hand-rolled `darkModeSwitch` markup, `syncDarkModeSwitch()`, `flipDarkMode()`, and both event listeners deleted (0 grep matches outside `.soloflow/` history). Construction-order constraint handled per the plan: picker inserted first, toggle `insertBefore`'d ahead of it.
- **`previewHeaderLeft` cached once**; all three header-append call sites use it.
- **RUNTIME-EXTENDED CONTAINER comment** added to the static markup naming all three JS call sites and the static-child failure mode.
- **New harness section** "Module toggle factory — persistence opt-out" (labeled Section 14 in source; physically after Section 10) with 4 fixtures: persist=false writes no key, persist=false ignores a pre-seeded stored value, persist=true default still writes, and the header append-order contract. Test-writer added a 5th fixture clicking the live `#darkModeSwitch` and asserting all three `onDarkModeToggle` side effects move together (mutation-validated).
- **CODE-PATTERNS.md** `createModuleToggle` entry rewritten: 5-param signature, dark mode as canonical non-persisting caller, explicit do-not-hand-roll instruction, onChange-fires-during-construction trap.

## Deviation

The plan called the new harness section "Section 11", but Sections 11-13 already existed from earlier sprints. Numbered "Section 14" in source (heading text matches the plan verbatim; the rendered harness shows no numbers, and it is the 11th visible heading). Source numbering is non-monotonic (10, 14, 11-13) — queued as FIND-SPRINT-009-6 with the fix routed to TASK-031, which owns CHANGELOG.md.

## Quality loop

- Verifier: APPROVED first pass. Real-browser verification: 116/116 harness rows green, header order confirmed by DOM index and pixel positions, non-persistence proven three ways (including a pre-seeded stored value ignored on reload), persisting callers proven across real reloads, Space/Enter keyboard parity confirmed.
- Code review: CLEAN first pass. Security surface checked (no interpolation in the insertAdjacentHTML literal, escapeHtml on fixture text, storage keys from developer constants only). One minor fixture nit queued as FIND-SPRINT-009-8.
- Test-writer: TESTS_WRITTEN — 1 live-click integration fixture for the onDarkModeToggle side-effect path (`d1c53f6`), validated both green-on-clean and red-on-mutation.

## Commits

`117b8aa`, `965b418`, `6de579c`, `3903429`, `cd3b4ba`, `d1c53f6` — index.html and CODE-PATTERNS.md only.

## Findings queued

- FIND-SPRINT-009-5 (claude-md, medium): plan's criterion-6 grep proxy contradicted by the same plan's step-6 fixture — second instance of the absolute-grep-count anti-pattern.
- FIND-SPRINT-009-6 (cleanup, low): non-monotonic harness section numbering in source.
- FIND-SPRINT-009-7 (improvement, medium): pre-existing unguarded localStorage access in the factory can abort module init (plan explicitly deferred; blast radius reduced by this task).
- FIND-SPRINT-009-8 (minor, low): order fixture label overstates coverage; dead `!!el.querySelector` guard.
