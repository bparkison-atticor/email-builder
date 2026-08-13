---
id: TASK-032
sprint: SPRINT-009
epic: null
status: done
summary: "Added the documentation anchor drift guard harness section (fetches the four markdown docs + index.html, extracts every grep-anchor at runtime, asserts each resolves) and reconciled README's template schema list with the live templates map."
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-032 — Guard documentation anchors against drift; sweep README's stale brand claims

## What shipped

- **Harness Section 16 "Documentation anchor drift guard"**: an async IIFE fetches README.md, CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and index.html over same-origin HTTP (`cache: 'no-store'`), extracts every `grep \`needle\`` anchor at runtime with a fresh regex per iteration, and renders: 4 per-file `ANCHOR_FLOORS` rows (README 2, CODE-PATTERNS 18, ARCHITECTURE 2, CLAUDE 1 — re-derived at execution, not the plan's stale estimates), one row per unique needle (19) asserting it resolves in index.html's fetched source, and a templates-schema fixture derived from `Object.values(templates)` with undocumented keys named in the label. Fetch failures render a single explanatory row (custom failText instructing to serve over http://) without throwing or aborting the harness; the section container is captured synchronously so late fetches cannot leak rows into a re-rendered harness.
- **No needle is hardcoded in index.html** — the self-match trap is guarded by runtime extraction plus a block comment; the code reviewer mechanically confirmed 0 needle literals in the new block and that all 19 needles resolve to real source (declarations, markup, CSS rules, call sites).
- **README schema list reconciled**: added `name`, `bannerHtml`, `bannerBackgroundColor`; all 13 live template keys now documented. (The brand-enumeration sweep itself had already landed via TASK-028 in a prior sprint — verified, not redone.)
- **CODE-PATTERNS.md** gained a Documentation Conventions section documenting the anchor form, the no-line-numbers rule, and the enforcing harness section, using the live anchor `function wireSegControl` as its example (the entry is itself scanned by the guard it documents).

## Quality loop

- Verifier: APPROVED first pass — independently re-ran all four mutation tests (anchor rename, CLAUDE.md anchor strip, zzTestKey, nonexistent doc path); each flips exactly the intended row. Verified the 404 and file:// failure paths (single row, zero uncaught exceptions) and the 5×-rapid-reopen re-render race (no duplicate rows).
- Code review: CLEAN first pass — confirmed floors exact, no self-matching needles, no new exposure through the unescaped failText path (literal constant, dynamic error text routed through the escaped description). Two minor items queued (FIND-SPRINT-009-19 parallel ANCHOR_DOCS/ANCHOR_FLOORS constants; -20 stale TEMPLATE CONFIGS banner-comment schema copy).
- Test-writer: NO_TESTS_NEEDED — the deliverable is itself a permanent self-executing test surface; all behavior-bearing criteria covered by shipped fixtures.

## Commits

`b81da7b` (README.md), `55a8eca` (CODE-PATTERNS.md), `343e542` (index.html) — one owned file per commit; ARCHITECTURE.md and CLAUDE.md untouched (no orphaned anchors found).

## Findings queued

FIND-SPRINT-009-15 (schema fixture matches whole README rather than the Templates section), -16 (post-fetch throw lands outside the try → empty section), -17 (duplicate doc name in a label when one doc anchors the same needle twice), -18 (process: serial execution overlapped with a concurrent session's TASK-033 — verification stayed sound via sandbox timing, flagged for orchestrator guidance), -19, -20 (code-reviewer minors above).

## Notes

- Harness at this task's HEAD: 145 rows / 0 FAIL across 16 sections (TASK-033's subsequent fixtures grew it further).
- A concurrent session executed TASK-033 (CTA microcopy centering) in the same working tree near the end of this task's verification; this task's verdicts were proven against its own committed code via a byte-identical sandbox. TASK-033 settled independently in its own session.
