---
id: TASK-001
sprint: SPRINT-001
epic: rich-text-link-ux
status: done
summary: "Added custom link-insert modal scaffold, Quill toolbar override on both body editors, segmented Phone/URL control, open/close lifecycle, and singleton ownerEditor reference. Apply wired as a no-op stub for TASK-002 to replace."
executor_loops: 0
code_review_rounds: 0
visual_mobile: skipped_unable
visual_web: skipped_unable
---

# TASK-001 — Done

## Outcome

The structural foundation for the body-copy link dialog is in place. `#linkModal` lives in the DOM as a sibling to `#htmlModal`, reusing the existing `.modal-overlay` / `.modal` / `.seg-control` / `.field` / `.hint` CSS primitives with two `#linkModal`-scoped overrides (max-width, body flex-direction). Both `bodyAboveQuill` and `bodyBelowQuill` now route their toolbar `'link'` click through `openLinkModal(quill)`, suppressing Quill's stock `.ql-tooltip`. Close affordances (X / Cancel / overlay backdrop / Escape) all work and the Escape handler extension preserves htmlModal's existing behavior.

## Commits

- `b3b20ef` — feat(TASK-001): add custom link-insert modal with Quill toolbar override

## Verification notes

- Per-task visual verification skipped (`visual_mobile`/`visual_web` disabled in config; `shadow-verifier` not installed). All structural acceptance criteria verified by the executor via grep/file inspection on `index.html`.
- Code review CLEAN: no critical / important / minor findings.
- No automated test runner exists in this project; manual smoke-test ACs are for the user to walk through in a browser session.

## Handoff to TASK-002

The Apply button is currently a no-op (`linkApply.addEventListener('click', closeLinkModal)`). TASK-002 will replace this stub with `applyLink()`, add edit-existing-link pre-population in `openLinkModal()`, and fix the latent `richTextToMjText()` bug so manually-inserted `tel:` links don't inherit brand color + `target="_blank"`.
