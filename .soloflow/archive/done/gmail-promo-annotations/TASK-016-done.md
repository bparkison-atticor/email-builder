---
id: TASK-016
sprint: SPRINT-006
epic: gmail-promo-annotations
status: done
summary: "Add Gmail Promo Tab form card: createModuleToggle('promo') with collapsible body, three inputs (headline/image URL/destination URL), and clearPromoFields() that clears values on load while preserving toggle state; UI-only, no compiled-output change."
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-016 — Promo Annotation Form Panel (PromotionCard-only)

## Outcome
Added the "Gmail Promo Tab" module card as the second form-panel card (after Preheader, before the first body seg). Implemented commit `0ce94b0` on branch `soloflow/run-20260630-103037-SPRINT-006`.

## Changes (index.html, +92 / -0)
- CSS: `.seg.seg-promo` neutral tint + `.seg-promo .seg-head .module-toggle { margin-left: auto; }`.
- HTML: `.seg-promo` card with `#promoBody` (collapsed), inputs `#promoHeadline`, `#promoImageUrl`, `#promoUrl`, each labeled with https hints where applicable; no date inputs.
- JS: `onPromoToggle()`, module-scope `promoToggle = createModuleToggle('promo','Gmail Promo Tab',false,onPromoToggle)` appended into `.seg-promo .seg-head`; `clearPromoFields()` clears the three input values on init (never touches localStorage).
- Test harness: new "Section 3 / clearPromoFields" fixture in `renderTestHarness()` seeding inputs + localStorage, asserting clear-but-persist, then restoring.

## Verification
- Verifier verdict: APPROVED — all 6 acceptance criteria met; `buildMjml()` byte-identical between `1fc1694` and `0ce94b0`; `clearPromoFields()` contains zero localStorage references; toggle defaults OFF; card in correct DOM position.
- Code review: CLEAN — faithful reuse of the createModuleToggle factory, `.seg-body/.collapsed` mechanism, `els` handle pattern, and renderTestHarness fixture pattern. No security surface. One non-blocking note: duplicated `margin-left:auto` CSS rule shared with `.seg-cta` (premature to consolidate at two consumers).
- Tests: NO_TESTS_NEEDED — the executor's harness fixture fully covers the one automatable behavior (clear-but-persist); remaining criteria are structural/visual or source-level no-op properties.

## Forward hooks
`promoToggle` is module-scope and exposes `isOn()` for TASK-017/018/019. Markup contains a reserved comment slot for TASK-019's ops-doc block.
