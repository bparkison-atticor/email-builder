---
id: TASK-027
sprint: SPRINT-008
epic: cta-microcopy
status: done
summary: "Added the CTA microcopy Quill editor (bold/italic/link, no lists) inside #ctaBody with live char count, and emission as a muted mj-text under the button with conditional button padding — byte-identical output when microcopy is empty"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-027 Done Report

## What shipped

- `#ctaMicrocopy` Quill editor as the last child of `#ctaBody` (after the `.cta-preview` chip), with `microcopyToolbar = [['bold', 'italic', 'link']]`, matching formats whitelist (no lists), `.rich-editor-wrap.compact` CSS variant (64px min-height), `aria-labelledby` accessible name, and a live character-count hint (`plainTextLength`) with no enforced limit.
- Emission in `buildMjml()`: `buildMicrocopyBlock(html, tpl)` renders a muted `mj-text` (brand `ctaMicrocopyFontSize`/`ctaMicrocopyColor`, muted links via `linkColor`, `blockMargin 8`, typed-bullet converter off) immediately after `</mj-button>`, inside the existing `ctaToggle.isOn()` ternary. `ctaButtonPadding()` tightens the button's bottom padding from `14px 0 18px 0` to `14px 0 6px 0` only when microcopy is present.
- Toolbar-handler loop extended to `[bodyAboveQuill, bodyBelowQuill, ctaMicrocopyQuill]` — link modal works identically in all three editors.
- Harness Section 13 "CTA microcopy — emission gating and muted styling": 16 rows from the plan + 3 added by the test-writer (toolbar/formats config assertion, no-`.ql-list` DOM guard, link-handler wiring guard) closing FIND-SPRINT-008-15.
- Untouched per plan: `createModuleToggle`, `onCtaToggle`, `runCopyAction`, `hasRichContent`, `markInvalid`, invalid-clearing listeners, all localStorage call sites (byte-identical bodies confirmed by verifier).

## Commits

- `0cea314` feat(TASK-027): add CTA microcopy editor and muted mj-text emission
- `c71a671` test(TASK-027): add harness Section 13 for CTA microcopy fixtures
- `d645cb0` test(TASK-027): close Section 13 config/handler-wiring gap per FIND-SPRINT-008-15

## Verification

- Verifier: APPROVED. Independent empty-microcopy byte-parity on a fresh input set (13,298 chars identical pre/post); toggle-off round trip (output loses button+microcopy, typed text preserved); collapsed-init check passed with real selection capture (no onCtaToggle fix needed); all 8 brands emit the block; dark-mode Outlook contrast repair lifts #6b6b6b→#bbbbbb algorithmically. Status-synced FIND-SPRINT-008-7 to resolved.
- Code review: CLEAN (0 critical / 0 important / 7 minor — FIND-SPRINT-008-13..19 filed). Security: microcopy's format whitelist strictly narrower than body editors; no new sink.
- Test-writer: TESTS_WRITTEN (d645cb0) — closed FIND-SPRINT-008-15; wiring guard proven to detect a deliberately broken handler loop.
- Orchestrator harness run post-test-writer: 211 PASS badges / 0 FAIL / 0 page errors.

## Findings

New: FIND-SPRINT-008-12 (medium, pre-existing — manual tel: links carry target="_blank" from Quill's Link blot; TASK-028 docs must not claim otherwise), FIND-SPRINT-008-13..19 (minor). Resolved this task: FIND-SPRINT-008-7 (status sync), FIND-SPRINT-008-15 (d645cb0).

## Scope

Only `index.html` modified (+220/−3 across three commits).
