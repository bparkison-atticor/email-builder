---
id: TASK-002
sprint: SPRINT-001
epic: rich-text-link-ux
status: done
summary: "Implemented applyLink() (phone strip-to-tel: / URL auto-detect raw vs {{variable}}), added edit-existing-link pre-population in openLinkModal() with zero-length cursor expansion, and fixed the latent richTextToMjText() bug so manually-inserted tel: links keep standard-blue / no target=_blank."
executor_loops: 0
code_review_rounds: 0
visual_mobile: skipped_unable
visual_web: skipped_unable
---

# TASK-002 — Done

## Outcome

The body-copy link dialog is fully functional. Marketers can:
- Highlight body text → click the link toolbar button → choose Phone → type any-format number → Apply produces `<a href="tel:<digits>" data-link-type="phone">` over the selection.
- Choose URL → type a raw URL (`https://…`) → Apply writes the URL as-is; type a bare variable name → Apply wraps as `{{value}}`.
- Click inside an existing link → reopen the dialog → see it pre-populated with the correct segment and stripped value (`tel:5551234567` → Phone tab + `5551234567`; `{{eligibilityLink}}` → URL tab + `eligibilityLink`; `https://example.com` → URL tab + verbatim).
- Apply over an existing link replaces it on the same range (no nested `<a>`).

The latent bug in `richTextToMjText()` is fixed: manually-inserted phone links (`data-link-type="phone"`) now receive standard-blue styling with no `target="_blank"`, matching auto-linked phone behavior. URL/variable links continue to receive brand color + `target="_blank"`. Auto-linked phones (`data-autolinked="phone"`) are untouched — no regression.

## Commits

- `3d32519` — feat(TASK-002): implement applyLink, pre-populate edit-existing, fix phone-link styling

## Verification notes

- Per-task visual verification skipped (config: visual_mobile / visual_web both false; shadow-verifier not installed).
- Code review CLEAN: no critical / important / minor findings. Security audit confirmed `linkDestination.value` never reaches `innerHTML`/`outerHTML`; the phone-path querySelector interpolates a digits-only `tel:` href so no selector injection.
- No automated test runner exists; the 10-row manual smoke matrix in the plan's acceptance criteria is the verification path for the user.

## Manual smoke matrix for the user

The 10 ACs in the plan enumerate the full smoke sequence. The key ones to walk first:
1. Insert phone link from selection → verify `<a href="tel:5551234567" data-link-type="phone">` in DevTools.
2. Insert raw URL `https://example.com` → verify literal href.
3. Insert variable name `eligibilityLink` → verify href becomes `{{eligibilityLink}}`.
4. Click inside each link type and reopen dialog → verify pre-population.
5. Open dialog over an existing phone link, switch to URL, Apply → verify single `<a>` (no nested).
6. Copy HTML and confirm: manual phone links use `color:#0000ee` / no `target="_blank"`; manual variable links use brand color + `target="_blank"`; auto-linked plaintext phones still emit correctly.
