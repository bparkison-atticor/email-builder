---
id: TASK-017
sprint: SPRINT-006
epic: gmail-promo-annotations
status: done
summary: "Add promo field validation gated on promoToggle.isOn(): blocking required + https checks via validatePromoFields() in runCopyAction (required-before-format ordering), a non-blocking UTM advisory in render(), and clear-invalid-on-input listeners."
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-017 — Promo Field Validation (blocking + non-blocking)

## Outcome
Gated copy-time validation on `promoToggle.isOn()`. Implemented commit `3b18f3f`; test-writer added 3 fixture cases in `4dc74b9`. Branch `soloflow/run-20260630-103037-SPRINT-006`.

## Changes (index.html)
- Pure helpers `isHttpsUrl()` and `validatePromoFields({headline,imageUrl,url}) → {missing[], formatErrors[]}` near `isValidPhone`.
- `runCopyAction()`: promo block guarded by `promoToggle.isOn()` — required fields accumulate into the shared `missing[]` with `markInvalid()`; https format errors set `promoFormatError` and early-return via the `phoneFormatError` pattern; required-before-format ordering preserved (empty takes precedence over format via `else if`).
- `render()`: non-blocking UTM advisory pushed into `warnings[]` → `showWarn` when promo on and destination URL is a non-empty https URL lacking `utm_`.
- Three `input` listeners on promo inputs clearing `.invalid` + `invalidEls.delete`, mirroring the cta pattern.
- Test harness: "Section 4 / validatePromoFields" — 5 executor fixtures + 3 added by test-writer (empty destination URL, whitespace-only headline, both-URLs-non-https).

## Verification
- Verifier verdict: APPROVED — all 5 ACs met with source evidence; required-before-format ordering confirmed (`if (missing.length)` returns before `if (promoFormatError)`); toggle-off fully bypasses validation; empty-takes-precedence confirmed; UTM advisory lives in render() (live), not runCopyAction; validatePromoFields is pure.
- Code review: CLEAN — faithful reuse of markInvalid/invalidEls, phoneFormatError early-return, cta input-listener, showWarn aggregation, and harness fixture patterns. No injection surface (anchored https check; harness output escaped via escapeHtml). Library-error humanization convention not applicable (no library calls on these paths).
- Tests: TESTS_WRITTEN — 8 total pure-function fixture cases lock validatePromoFields. No CLI runner exists (in-browser harness only); fixtures validated structurally against the established pattern.

## Known non-blocking finding
- FIND-SPRINT-006-1 (low): when both image and destination URLs are simultaneously non-https, only the first format error is surfaced / its field marked invalid until corrected. Does not violate AC#2 ("a format error", singular). Queued for /sf:compound.
