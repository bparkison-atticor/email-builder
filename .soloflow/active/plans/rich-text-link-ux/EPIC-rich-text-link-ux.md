---
epic: rich-text-link-ux
created: 2026-05-11T00:00:00Z
status: active
originating_ideas: [IDEA-001]
---

# Rich-text link UX

## Objective

Replace the stock Quill snow-theme link tooltip in EmailBuilder's two body-copy editors with a guided, brand-consistent insert/edit dialog. Marketers gain the same Phone-or-Variable segmented experience the CTA field already provides, plus first-class support for raw URLs and Handlebars merge fields without typing `tel:` / `{{…}}` syntax by hand.

## Scope

- In scope:
  - A custom toolbar-triggered modal that overrides Quill's default `'link'` handler on both `bodyAboveQuill` and `bodyBelowQuill`.
  - Phone path: input → digits stripped → `tel:<digits>` href; manually-inserted phone links must render with standard-blue color and no `target="_blank"` in the final email HTML (parity with auto-linked phones).
  - URL path: auto-detect `https?://` → raw URL href; otherwise wrap as `{{variable}}` Handlebars token.
  - Edit-existing-link: open dialog with cursor in (or selection over) an existing link to pre-populate segment and input value from the current href.
  - Singleton dialog with an `ownerEditor` reference so a single DOM modal serves both editors.
  - Latent-bug fix in `richTextToMjText()` so the manually-inserted phone-link case doesn't incorrectly receive brand color + target=_blank.

- Out of scope:
  - Changing the CTA field's link behavior.
  - Adding link support to any field other than the two body Quill editors.
  - Auto-linking phone numbers in body copy (already handled by `autoLinkPhones`).
  - A separate "remove link" action (Quill's native tooltip handles unlink and we are not removing that ability — the user can still right-click or use Backspace).
  - SendGrid API integration or any backend work.
  - Custom Quill blots beyond the existing `PassthroughLink` sanitizer override.

## Success Signal

A marketer composing an email can: (a) select body text, click the link toolbar button, choose Phone or URL, type the destination once in whatever shape feels natural (digits with separators, full URL, or bare variable name), and ship a link that renders correctly in SendGrid; (b) reopen the same link to edit it without having to delete and re-insert; (c) never see a raw `tel:` or `{{…}}` instruction in the UI. The latent styling bug in `richTextToMjText()` is gone — manually-inserted phone links match auto-linked phones in the final output.
