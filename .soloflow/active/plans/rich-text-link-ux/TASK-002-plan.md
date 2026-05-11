---
id: TASK-002
idea: IDEA-001
status: approved
created: 2026-05-11T00:00:00Z
files_owned:
  - index.html
files_readonly: []
acceptance_criteria:
  - criterion: "Selecting text in a body editor, clicking the toolbar link button, choosing Phone, entering '555-123-4567', and clicking Apply produces a span in the editor wrapped by <a href='tel:5551234567' data-link-type='phone'> over the previously selected range."
    verification: "Manual smoke: select text → open modal → Phone → enter '555-123-4567' → Apply. In DevTools, inspect the editor DOM; confirm <a href=\"tel:5551234567\" data-link-type=\"phone\"> wraps the original selection text."
  - criterion: "Selecting text, choosing URL, entering 'https://example.com' and clicking Apply produces <a href='https://example.com'> over the selection; entering 'eligibilityLink' (no protocol) produces <a href='{{eligibilityLink}}'>."
    verification: "Manual smoke: repeat the above twice — once with 'https://example.com' (verify literal href), once with 'eligibilityLink' (verify href becomes '{{eligibilityLink}}'). Auto-detect rule: input starts with 'http://' or 'https://' → use as-is; otherwise wrap as {{value}}."
  - criterion: "Opening the dialog with the cursor inside an existing tel: link pre-populates: Phone segment active, input shows the digits with non-digit chars stripped (e.g. tel:5551234567 → '5551234567')."
    verification: "Manual smoke: insert a phone link, then click anywhere inside its rendered text, then click the toolbar link button. Confirm Phone is active and input shows the digits."
  - criterion: "Opening the dialog with the cursor inside an existing {{variable}} link pre-populates: URL segment active, input shows the variable name without braces (e.g. {{eligibilityLink}} → 'eligibilityLink')."
    verification: "Manual smoke: insert a {{variable}} link, click inside it, open dialog. Confirm URL active and input shows 'eligibilityLink'."
  - criterion: "Opening the dialog with the cursor inside an existing https://… link pre-populates: URL segment active, input shows the full URL as-is."
    verification: "Manual smoke: insert https://example.com link, click inside, open dialog. Confirm URL active and input shows 'https://example.com'."
  - criterion: "Applying with an existing link selection replaces the existing href on the same range rather than creating a nested link."
    verification: "Manual smoke: insert a phone link, place cursor inside, open dialog → switch to URL → enter 'https://example.com' → Apply. Inspect DOM: the original <a> now has href='https://example.com' (or has been replaced by a new <a> with that href), and there is no nested <a><a>...</a></a>."
  - criterion: "Applying with an empty input does not insert a link (early return); Apply with whitespace-only input is treated as empty."
    verification: "Manual smoke: open modal with text selected → leave input empty → Apply. Confirm no link is created and modal closes."
  - criterion: "Manually inserted tel: links (data-link-type='phone') receive standard-blue style (color:#0000ee) and no target='_blank' in the final MJML/HTML output, matching auto-linked phone behavior."
    verification: "Manual smoke: insert a phone link → click Copy HTML → in the modal, grep the output for the phone <a>; confirm style='color:#0000ee;text-decoration:underline;' and the tag has neither target=\"_blank\" nor the brand color."
  - criterion: "Manually inserted URL/variable links continue to receive brand color and target='_blank' in the final output."
    verification: "Manual smoke: insert a {{eligibilityLink}} link → Copy HTML → confirm output <a> has style with brand ctaBackgroundColor and target=\"_blank\"."
  - criterion: "Auto-linked phone numbers in body copy (PHONE_REGEX path at lines 852-892) continue to receive the existing data-autolinked='phone' tag and standard-blue treatment with no regression."
    verification: "Manual smoke: type '555-111-2222' as plain text in body editor → Copy HTML → confirm output still has <a data-autolinked=\"phone\" href=\"tel:+15551112222\" style=\"color:#0000ee...\"> (no brand color, no target=_blank)."
depends_on: [TASK-001]
estimated_complexity: medium
epic: rich-text-link-ux
test_strategy:
  needed: false
  justification: "Project has no automated test framework or runner; CLAUDE.md states verification is browser-based manual smoke testing. The acceptance criteria above enumerate the manual smoke matrix."
---

# Link-insert apply logic, edit-existing-link, and latent-bug fix

## Objective

Implement the working behavior of the link dialog: write hrefs to the Quill editor via `formatText` (phone strips non-digits to `tel:<digits>`; URL auto-detects `https?://` vs Handlebars variable), pre-populate dialog state when the cursor or selection sits inside an existing link, and fix the latent bug in `richTextToMjText()` so manually-inserted phone links receive the same standard-blue / no-target-blank treatment as auto-linked phones.

## Implementation Steps

1. In `openLinkModal(quill)` (added in TASK-001), capture the current selection before opening:
   ```js
   ownerRange = quill.getSelection(true);  // {index, length} — true forces focus first
   ```
   If `ownerRange` is null (editor not focused), default to `{index: quill.getLength() - 1, length: 0}` so Apply has a valid insertion point.
2. After capturing the range, inspect existing link state to pre-populate the dialog. Use `quill.getFormat(ownerRange.index, Math.max(ownerRange.length, 1))` — this returns a format object whose `link` property (if present) is the current href. Pre-populate logic:
   - If `format.link` starts with `tel:` → segment = Phone; input = `format.link.slice(4).replace(/\D/g, '')`.
   - Else if `format.link` matches `/^\{\{(.+)\}\}$/` → segment = URL; input = the captured group (variable name without braces).
   - Else if `format.link` is a non-empty string → segment = URL; input = `format.link` verbatim.
   - Else → segment = Phone (default), input empty.
   - Apply the segment choice by toggling the seg-control buttons' `.active` class and `aria-pressed` attributes (same pattern as `wireSegControl` body, lines 822-831), then call `updateLinkFields()`.
3. Also detect "cursor inside a link with zero selection". If `ownerRange.length === 0` and a `link` format is present at `ownerRange.index`, expand `ownerRange` to cover the full link span before storing it. Implementation: walk `quill.getFormat(i, 1).link` outward from `ownerRange.index` (decrement until link disappears or i===0; then increment from original index until link disappears or end) to compute `[start, end]`. Assign `ownerRange = {index: start, length: end - start}`. This is what makes the Apply step replace the existing link rather than creating a nested one.
4. Implement `applyLink()` to replace the stub wired in TASK-001 step 10:
   ```js
   function applyLink() {
     const value = (linkDestination.value || '').trim();
     if (!value || !ownerEditor || !ownerRange) { closeLinkModal(); return; }
     const type = getLinkType();
     let href;
     if (type === 'phone') {
       const digits = value.replace(/\D/g, '');
       if (!digits) { closeLinkModal(); return; }
       href = `tel:${digits}`;
     } else {
       href = /^https?:\/\//i.test(value) ? value : `{{${value}}}`;
     }
     // If selection length is 0 (cursor only, no existing link found in step 3),
     // insert the value itself as visible text and link it.
     if (ownerRange.length === 0) {
       ownerEditor.insertText(ownerRange.index, value, 'link', href, 'user');
     } else {
       ownerEditor.formatText(ownerRange.index, ownerRange.length, 'link', href, 'user');
     }
     // Tag phone links so richTextToMjText() can distinguish them. Quill's link
     // format renders the <a> on next DOM flush; we tag it via a microtask read.
     if (type === 'phone') {
       queueMicrotask(() => {
         ownerEditor.root.querySelectorAll(`a[href="${href}"]:not([data-link-type])`).forEach(a => {
           a.setAttribute('data-link-type', 'phone');
         });
       });
     }
     closeLinkModal();
     scheduleRender();
   }
   linkApply.addEventListener('click', applyLink);
   ```
   Note: replace the `linkApply.addEventListener('click', closeLinkModal)` stub from TASK-001 step 10 with this new binding (remove the old listener or change it directly — there should be exactly one click listener on `linkApply` after this step).
5. Fix the latent bug in `richTextToMjText()` at lines 939-944. The current selector `a:not([data-autolinked])` will catch manually-inserted phone links and apply brand color + target=_blank. Change the link-styling block to differentiate:
   ```js
   // Brand color + target="_blank" only for non-phone links. Both auto-linked
   // phones (data-autolinked="phone") and manually-inserted phone links from
   // the link dialog (data-link-type="phone") keep standard-blue and no target.
   div.querySelectorAll('a:not([data-autolinked]):not([data-link-type="phone"])').forEach(a => {
     a.setAttribute('style', `color:${tpl.ctaBackgroundColor};text-decoration:underline;`);
     a.setAttribute('target', '_blank');
   });
   div.querySelectorAll('a[data-link-type="phone"]').forEach(a => {
     a.setAttribute('style', 'color:#0000ee;text-decoration:underline;');
     // Strip the marker before emit; SendGrid doesn't care, but it keeps output clean.
     a.removeAttribute('data-link-type');
   });
   ```
6. Verify the `PassthroughLink` class (line 765-769) is still in place — it must remain because `{{variable}}` and `tel:` hrefs would otherwise be stripped by Quill's default sanitizer.
7. Re-run the full smoke matrix in the acceptance criteria, including the auto-link regression check (criterion 10).

## Acceptance Criteria

Restated in frontmatter. The matrix covers: phone insertion, URL insertion (both raw URL and variable shapes), edit-existing-link for all three href shapes, replace-not-nest semantics, empty-input no-op, latent bug fix for phone-link styling in output, URL-link styling unchanged, and auto-link regression.

## Test Strategy

Not applicable. Project has no automated test runner. Smoke matrix above is the verification.

## Hardest Decision

How to tag manually-inserted phone links so `richTextToMjText()` can exclude them from brand-color/target=_blank styling. Considered three approaches:

1. **Mutate the `<a>` in a microtask after Quill's link format applies.** Chosen. Quill 2's format API doesn't accept arbitrary attributes on the format value, so the only way to add `data-link-type="phone"` is to read the DOM after the format flushes. The `:not([href])` check in the querySelector is robust because we know the exact href we just wrote.
2. **Use a custom Quill blot extending PassthroughLink to carry the type.** Rejected for this iteration. Would be cleaner long-term but adds significant scope (a new blot class, register/unregister, Delta interop) for one boolean tag. Revisit if more link metadata is needed.
3. **Encode the type in the href itself (e.g. `tel-phone:...`).** Rejected — would break the actual mailto/dial intent in clients.

## Rejected Alternatives

- **Track type in a parallel Map<aElement, 'phone'|'url'> instead of a DOM attribute.** Rejected because `richTextToMjText` works on an HTML string round-tripped through `innerHTML` (line 902-903) — the Map references would be lost across that serialization boundary. A DOM attribute survives `innerHTML` → parse cleanly.
- **Use Quill's `getContents()` Delta to detect link type instead of DOM walks for prepopulate (step 3).** Rejected for complexity; `quill.getFormat()` already returns the attributes at a position cheaply and reads naturally.
- **Validate URL syntax in the dialog (reject invalid URLs).** Rejected — PassthroughLink intentionally accepts anything (line 763-764). The hint copy ("Enter https://… or {{variable}}") is the only guidance per the IDEA's canonical decisions. Could revisit if marketers report frequent typos.

## Lowest Confidence Area

Step 3's "expand zero-length selection to full link span" walk. Quill 2's `getFormat(index, 1)` semantics at link boundaries (e.g. index === link.start vs index === link.end) can return different results depending on cursor side. If the smoke test "click inside an existing link and open dialog" produces a dialog with the wrong segment or empty input, the boundary walk needs adjustment — likely to use `quill.getLeaf(index)` instead, which returns the leaf blot and its offset and is unambiguous about which leaf the cursor sits in. The fallback is well-defined; flag this in smoke testing.
