---
id: TASK-001
idea: IDEA-001
status: approved
created: 2026-05-11T00:00:00Z
files_owned:
  - index.html
files_readonly: []
acceptance_criteria:
  - criterion: "A new modal with id='linkModal' exists in the DOM, sibling to #htmlModal, using the same .modal-overlay / .modal / .modal-header / .modal-body / .modal-footer class structure."
    verification: "grep -n 'id=\"linkModal\"' index.html returns exactly one match inside a div with class='modal-overlay'."
  - criterion: "The link modal contains a segmented control with two buttons (data-link-type='phone' and data-link-type='url'), a single text input with id='linkDestination', a label with id='linkDestinationLabel', a hint with id='linkDestinationHint', a Cancel button with id='linkCancel', and an Apply button with id='linkApply'."
    verification: "grep -n inside index.html shows all of: data-link-type=\"phone\", data-link-type=\"url\", id=\"linkDestination\", id=\"linkDestinationLabel\", id=\"linkDestinationHint\", id=\"linkCancel\", id=\"linkApply\"."
  - criterion: "The 'link' toolbar handler for both bodyAboveQuill and bodyBelowQuill is overridden via quill.getModule('toolbar').addHandler('link', fn) so clicking the toolbar link button opens #linkModal and the stock .ql-tooltip never appears."
    verification: "Manual smoke: load page, click the link icon in either body editor's toolbar; verify #linkModal becomes .visible and no .ql-tooltip element is visible in the DOM."
  - criterion: "The modal closes when the user clicks #linkCancel, clicks the overlay backdrop, presses Escape, or calls closeLinkModal(); the same Escape handler does not conflict with the existing htmlModal Escape handler (whichever modal is .visible closes)."
    verification: "Manual smoke: open link modal → press Escape → confirm it closes and bodyAboveQuill regains focus. Open html modal → press Escape → confirm only it closes."
  - criterion: "Clicking the Phone or URL segment button updates label text to 'Phone number' / 'URL or {{variable}}', placeholder to '555-123-4567' / 'https://example.com or {{eligibilityLink}}', and hint text to a tel-stripping note / a 'URL or {{variable}}' note, mirroring updateCtaFields() behavior."
    verification: "Manual smoke: open link modal, toggle Phone↔URL; verify label/placeholder/hint each switch. Compare side-by-side with the CTA seg-control to confirm UX parity."
  - criterion: "A module-scoped variable named ownerEditor is set to the Quill instance (bodyAboveQuill or bodyBelowQuill) whose toolbar opened the modal, and is referenced by openLinkModal(quill)."
    verification: "grep -n 'ownerEditor' index.html returns at least one let/declaration site and at least one assignment inside the toolbar handler."
  - criterion: "Existing CTA seg-control behavior, existing #htmlModal behavior, and Quill bold/list formatting are unchanged."
    verification: "Manual smoke: toggle CTA Phone/Variable (fade animation still plays); open/close View HTML modal; apply Bold and bullet list inside an editor — all unchanged."
depends_on: []
estimated_complexity: medium
epic: rich-text-link-ux
test_strategy:
  needed: false
  justification: "Project has no automated test framework or runner; CLAUDE.md states verification is browser-based manual smoke testing. New behavior is UI-driven and verified via the manual acceptance steps above."
---

# Custom link-insert dialog scaffold + Quill toolbar override

## Objective

Build the structural foundation for the new body-copy link dialog: DOM markup, CSS, toolbar handler override on both Quill editors, segmented Phone/URL control, open/close lifecycle, and a singleton `ownerEditor` reference. This task delivers the dialog *shell* — clicking Apply is wired but performs no link write yet (a no-op stub that closes the modal). TASK-002 will fill in the link insertion logic and edit-existing-link prepopulation.

## Implementation Steps

1. Add the modal DOM block immediately after the existing `<div class="modal-overlay" id="htmlModal">…</div>` block (around index.html:658). Structure:
   - `<div class="modal-overlay" id="linkModal" role="dialog" aria-modal="true" aria-labelledby="linkModalTitle">` wrapping a `<div class="modal">` with header (`<h2 id="linkModalTitle">Insert link</h2>` + `.modal-close` button id='linkModalClose'), body (a `.field` containing a `.seg-control` with two `data-link-type` buttons styled after lines 543-557, plus a second `.field` containing label/input/hint with ids `linkDestinationLabel` / `linkDestination` / `linkDestinationHint`), and footer (Cancel + Apply buttons; Apply uses `.btn-primary`).
   - The Phone button is initially `.active` with `aria-pressed="true"`; URL button starts inactive.
2. Add CSS overrides for the link modal in the `<style>` block near the existing modal CSS (around lines 419-503). The link modal needs a smaller `max-width` (~440px) and `height: auto` rather than `80vh`, with `.modal-body` allowing the seg-control + field to stack vertically. Re-use existing `.seg-control`, `.field`, `.hint` classes — do not duplicate them.
3. In the script module, immediately after the `bodyBelowQuill` definition (line 789), declare module-scoped state:
   ```js
   let ownerEditor = null;
   let ownerRange = null;        // populated in TASK-002; reserve the name now
   const linkModal = document.getElementById('linkModal');
   const linkDestination = document.getElementById('linkDestination');
   const linkDestinationLabel = document.getElementById('linkDestinationLabel');
   const linkDestinationHint = document.getElementById('linkDestinationHint');
   const linkTypeButtons = linkModal.querySelectorAll('.seg-control button[data-link-type]');
   ```
4. Add `getLinkType()` (mirrors `getCtaType()` at line 792-795 using `[data-link-type]`) and `updateLinkFields()` (mirrors `updateCtaFields()` at lines 798-820 but without the fade — fading inside a modal that just appeared reads as broken). Hint copy: phone → "Any format — non-digits stripped for tel: link."; url → "Enter https://… or {{variable}}.".
5. Wire the segmented control via the existing `wireSegControl(linkTypeButtons, () => updateLinkFields())` utility (line 821-832).
6. Implement `openLinkModal(quill)`:
   - Set `ownerEditor = quill`.
   - Reset segment to Phone, clear the input, call `updateLinkFields()`.
   - Add `.visible` class to `linkModal`.
   - Focus `linkDestination` after a `setTimeout(…, 50)` (matches the htmlModal focus pattern at line 1408).
7. Implement `closeLinkModal()`:
   - Remove `.visible` from `linkModal`.
   - If `ownerEditor`, call `ownerEditor.focus()` to return cursor to the editor.
   - Set `ownerEditor = null` and `ownerRange = null`.
8. Register the toolbar override on both editors. After both `new Quill(...)` calls, add:
   ```js
   [bodyAboveQuill, bodyBelowQuill].forEach(q => {
     q.getModule('toolbar').addHandler('link', () => openLinkModal(q));
   });
   ```
9. Wire close affordances: `linkModalClose` click, `linkCancel` click, overlay backdrop click (event.target === linkModal), and Escape key. The existing Escape handler at lines 1418-1420 only closes `htmlModal` — extend (do not replace) it so Escape closes whichever modal is `.visible`. Order the check so only one modal closes per keypress.
10. Wire Apply as a stub for now: `linkApply.addEventListener('click', closeLinkModal)`. TASK-002 will replace this with `applyLink()`.
11. Verify the stock Quill tooltip is suppressed by clicking the toolbar link button — Quill's default handler is replaced when `addHandler('link', …)` is registered, so no `.ql-tooltip` should appear. If `.ql-tooltip` still appears in the DOM after click, the override failed — recheck that `addHandler` is called after Quill instantiation, not before.

## Acceptance Criteria

Each AC restated in the frontmatter pass/fail. Manual smoke covers: toolbar click opens dialog; segment toggle updates fields; Cancel/Escape/backdrop/X all close; CTA seg + htmlModal + bold/list still work.

## Test Strategy

Not applicable. Project has no automated test runner (`CLAUDE.md` § Stack & Tooling: "Test: _no test command detected_"). Verification is manual browser smoke per the acceptance criteria.

## Hardest Decision

Whether to reuse the existing `.modal-overlay` / `.modal` CSS classes verbatim or fork a smaller dialog style. Chosen: reuse, with one CSS rule overriding `max-width` and `height` for `#linkModal`. Rationale: the htmlModal pattern is already a known-working modal lifecycle (visible toggle, backdrop click, Escape, focus restore). Forking would double the surface area without UX benefit. The size override is one rule.

## Rejected Alternatives

- **Anchor an inline panel to the selection (Quill-tooltip-style).** Rejected because the user's canonical decision in IDEA-001 explicitly chose a toolbar-triggered modal. Would change only if marketers report the modal feels disruptive in user testing.
- **Build two separate dialogs (one per editor).** Rejected per the user's "singleton with ownerEditor" decision. Two dialogs would duplicate DOM and double the wiring. Would change only if state isolation between editors became a problem (none anticipated).
- **Replace the stock toolbar button icon.** Rejected — Quill's snow theme link icon is fine and changing it requires shadowing Quill internals. Would change if marketers report icon ambiguity.

## Lowest Confidence Area

The interaction between `addHandler('link', fn)` and Quill 2's stock tooltip module. In some Quill 2 builds the snow theme still creates `.ql-tooltip` lazily; suppressing it is normally automatic when a handler is registered, but if the executor finds the tooltip flashing briefly before the modal opens, they may need to add CSS `.ql-tooltip { display: none !important; }` scoped to the rich-editor-wrap. Flag this in the smoke test.
