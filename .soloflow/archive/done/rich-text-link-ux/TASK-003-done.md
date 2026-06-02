---
id: TASK-003
sprint: SPRINT-005
epic: rich-text-link-ux
status: done
summary: "Extracted phoneDigits/buildLinkHref helpers and fixed buildCtaHref raw-URL bug (no longer wraps https:// URLs as Handlebars tokens)"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-003 — Done

## Summary
Introduced two shared helpers in `index.html` to eliminate divergent link-href construction:
- `phoneDigits(value, { keepPlus = true } = {})` — canonical phone-digit normalizer, preserves leading `+` (E.164) by default.
- `buildLinkHref(type, value)` — canonical href builder: `tel:` for phone, `https?://` passthrough or `{{...}}` Handlebars wrap for url.

Routed all four href-construction call sites (`openLinkModal` pre-populate, `applyLink`, `autoLinkPhones`, `buildCtaHref`) through these helpers. `isValidPhone` left untouched.

## Headline bug fix
`buildCtaHref` previously wrapped every non-phone value as `{{value}}`, shipping a broken `href="{{https://example.com}}"` for raw URLs pasted into the CTA destination. It now returns `buildLinkHref(type, value)`, so `https://example.com` produces `href="https://example.com"` and a bare `OFFER_URL` still produces `href="{{OFFER_URL}}"`.

## Verification
- shadow-verifier: APPROVED — all 8 acceptance criteria MET (static + code-flow tracing; no automated harness in this single-file app).
- code-reviewer: CLEAN — no findings; confirmed no new XSS surface (url passthrough gated on `^https?://`, excludes `javascript:`/`data:`).
- test-writer: NO_TEST_INFRA — project has no test runner (single-file browser app).

## Commit
- `fc3b5bb feat(TASK-003): extract phoneDigits/buildLinkHref helpers; fix buildCtaHref raw-URL bug`

## Behavior change note
Edit-existing-link pre-populate now shows `+15551234567` instead of `15551234567` (intentional `+` preservation; round-trips losslessly).
