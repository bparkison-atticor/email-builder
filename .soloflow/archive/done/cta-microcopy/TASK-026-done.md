---
id: TASK-026
sprint: SPRINT-008
epic: cta-microcopy
status: done
summary: "Parameterized richTextToMjText with an opts argument (fontSize, color, linkColor, padding, blockMargin, convertTypedBullets) with byte-parity defaults; added per-brand ctaMicrocopyFontSize/ctaMicrocopyColor keys and extracted hasRichHtml"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-026 Done Report

## What shipped

- `richTextToMjText(html, tpl)` → `richTextToMjText(html, tpl, opts = {})` with defaults that reproduce prior behaviour byte-for-byte (`padding '0 0 14px 0'`, `blockMargin 14`, `convertTypedBullets true`, `fontSize`/`color`/`linkColor` null). Typed-bullet conversion gated behind the flag; anchor passes reworked so `linkColor` overrides brand-accent links, manual phone links, and auto-linked phones (opt-in only); `blockMargin` threaded through p/ul/ol margin passes; mj-text attributes assembled in fixed order (padding, font-size, color) with escapeHtml.
- `DEFAULT_CTA_MICROCOPY_FONT_SIZE = '13px'` and `DEFAULT_CTA_MICROCOPY_COLOR = '#6b6b6b'` constants; `ctaMicrocopyFontSize`/`ctaMicrocopyColor` added to all 8 brand entries; TEMPLATE CONFIGS header comment documents both keys.
- `hasRichHtml(html)` extracted as the single pure emptiness predicate; `hasRichContent(quill)` delegates; `richTextToMjText`'s early return uses it.
- Harness Section 12 "richTextToMjText — default parity + style overrides": 7 byte-parity fixtures (captured from the unmodified function via Puppeteer before any functional edit), 7 override fixtures, 5 hasRichHtml fixtures. Test-writer later tightened two override assertions (startsWith with indent; #0000ee absence) per FIND-SPRINT-008-7.
- Both production call sites remain two-arg.

## Commits

- `91b9109` test(TASK-026): capture richTextToMjText parity baseline (7 fixtures)
- `c9249f8` feat(TASK-026): add per-brand CTA microcopy style config keys
- `10dd6c3` refactor(TASK-026): extract hasRichHtml as the shared emptiness predicate
- `5437b56` refactor(TASK-026): add opts param to richTextToMjText
- `5acabd9` test(TASK-026): extend harness Section 12 with style-override and hasRichHtml fixtures
- `62591a4` test(TASK-026): strengthen two Section 12 override fixtures per FIND-SPRINT-008-7

## Verification

- Verifier: APPROVED. Independent 26-input × 2-template (52-case) pre/post differential — 0 differences; 7 parity literals matched the unmodified function's live output (not back-fitted); 8-brand full-document `lastHtml` parity — 8/8 byte-identical; strict startsWith attribute-order assertion confirmed; linkColor covers all three anchor classes with no #0000ee/#ED1C24 leakage. Executor's two documented fixture deviations adjudicated legitimate (frontmatter grep contract binding over Test Strategy prose).
- Code review: CLEAN (0 critical / 0 important / 4 minor — FIND-SPRINT-008-8..11 filed for compound triage). Escaping split judged correct by construction; opts-over-variant design and brand sweep endorsed.
- Test-writer: TESTS_WRITTEN — tightened two Section 12 assertions (commit 62591a4), closing FIND-SPRINT-008-7.
- Orchestrator post-test-writer harness run (headless Chrome, Ctrl+Shift+T path): 0 FAIL badges across all 12 sections, 0 page errors.

## Findings

FIND-SPRINT-008-5 (plan's auto-linked-phone "unstyled" claim is imprecise — autoLinkPhones hard-codes color:#0000ee; verifier confirmed and extended to plan prose so TASK-028's doc pass fixes both), FIND-SPRINT-008-6 (stale AC grep count), FIND-SPRINT-008-7 (resolved by 62591a4), FIND-SPRINT-008-8..11 (minor code-review items).

## Scope

Only `index.html` modified across all six commits. README.md / CODE-PATTERNS.md doc propagation correctly deferred to TASK-028.
