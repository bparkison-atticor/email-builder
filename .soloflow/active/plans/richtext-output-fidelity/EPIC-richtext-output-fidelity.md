---
epic: richtext-output-fidelity
created: 2026-08-19T15:00:00Z
status: active
originating_ideas: [SPRINT-008-proposal]
---

# Rich-text output fidelity

## Objective

Four defects sit between what the Quill editors show a marketer and what `Copy HTML` hands to SendGrid: link hrefs bypass every scheme check, manual phone links ship the `target="_blank"` that breaks the dial intent the code comment claims to avoid, an armed-but-unused Bold click emits a zero-width character and a spurious block while the UI reports the field empty, and the typed-bullet contract is described four different ways in code and a fifth in the docs. This epic makes the compiled output match both the UI and its own documentation.

## Scope

- In scope: an explicit link scheme allowlist in `PassthroughLink.sanitize` with the app's own href shapes pinned; stripping `target`/`rel` from manually-inserted phone anchors; a shared Quill-artifact cleaner behind both `hasRichHtml` and `richTextToMjText` so cursor artifacts affect neither the emptiness gate nor emitted output; deciding and pinning the en-dash/em-dash bullet asymmetry and sweeping the in-code claims that contradict it; keeping README / CODE-PATTERNS / ARCHITECTURE / CHANGELOG true as each behavior changes.
- Out of scope: sanitizing the clipboard/paste matcher; sandboxing the preview iframe or hardening `PREVIEW_LINK_HANDLER`'s `window.open`; changing which characters convert to bullets (the decision is to keep current behavior); redefining `hasRichHtml`'s emptiness contract in terms of visible text; draft persistence.

## Success Signal

Every href the link dialog can produce survives compilation unchanged while `javascript:`, `data:`, and their tab/newline/case-obfuscated forms cannot reach the preview's `window.open`; a compiled `tel:` anchor carries no `target` or `rel`; an editor the UI reports as empty contributes exactly zero bytes to the output; and every in-code statement about which characters become a bullet names `BULLET_PREFIX` and agrees with it.
