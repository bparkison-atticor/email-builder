---
id: TASK-033
status: done
summary: "Center CTA microcopy under the CTA button via a new opt-in align option on richTextToMjText"
executor_loops: 1
code_review_rounds: 0   # bugfix path skips per-task code review, same as /quick
visual_mobile: not_applicable   # retained for schema compatibility; Lite has no visual verification
visual_web: not_applicable      # retained for schema compatibility; Lite has no visual verification
investigation_confidence: high
---

# TASK-033 — Bugfix: CTA microcopy centered under the CTA button

## What happened

Bug report: "the microcopy should actually be centered underneath the button."

Investigation (high confidence): `buildMicrocopyBlock` passed no alignment to `richTextToMjText`, which had no `align` slot in its opts contract and assembled only `padding`/`font-size`/`color` attributes. The microcopy `<mj-text>` therefore inherited MJML's `left` default while the `mj-button` above it defaulted to `center`. Original omission, not a regression.

Fix: `richTextToMjText` gained a seventh opt `align` (default `null`, emitted last and only when non-null, escaped with `escapeHtml`); `buildMicrocopyBlock` passes `align: 'center'`. No brand-config key added; head `<mj-attributes>` untouched; body-copy output byte-identical pre/post fix.

## Verification

Shadow-verifier verdict: APPROVED. Full in-app harness at commit 341b5e1 in headless Chrome: 148 rows, 0 failures, 0 console errors. Reproduction walked in a real browser — caption cell now `align="center"` / `text-align:center`; inverse mutation reverts it. New fixtures mutation-tested and confirmed sensitive. Full-document byte parity confirmed (12,416 bytes identical without microcopy; exactly two caption-cell lines differ with it).

Test-writer verdict: NO_TESTS_NEEDED — executor's fixtures ("Centered emission" in MICROCOPY_BLOCK_FIXTURES; align-omission and attribute-order guards in RICHTEXT_OVERRIDE_FIXTURES) already lock the bug in.

## Commits

- 463ac79 — fix(TASK-033): center CTA microcopy under the centered CTA button
- bbe567f — test(TASK-033): assert microcopy centers and align stays opt-in only
- 341b5e1 — docs(TASK-033): document the new align opt and centered microcopy caption

## Findings logged during verification

- FIND-SPRINT-009-21 (improvement, low) — microcopy compose field renders flush-left while its output centers; only editor misrepresenting its compiled alignment.
- FIND-SPRINT-009-22 (claude-md, medium) — findings addressed to "whichever task next owns file X" never reach the planner; routing gap in the findings queue.
