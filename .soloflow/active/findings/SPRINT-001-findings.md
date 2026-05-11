---
sprint: SPRINT-001
pending_count: 4
last_updated: "2026-05-11T16:29:11.382Z"
---
# Findings Queue

## FIND-SPRINT-001-1
- **source:** SPRINT-001 (sprint-code-reviewer)
- **type:** bug
- **severity:** medium
- **status:** resolved
- **location:** index.html:974-978
- **description:** applyLink phone-tagging microtask null-derefs ownerEditor — closeLinkModal() runs synchronously at line 980 BEFORE the queued microtask fires, setting ownerEditor=null. When the microtask executes, ownerEditor.root.querySelectorAll throws TypeError. Phone links inserted via the new modal therefore never receive the data-link-type="phone" marker, so richTextToMjText() at line 1136 treats them as URL links and applies brand color + target="_blank" — exactly the styling TASK-002 was meant to fix.
- **suggested_action:** Capture the editor reference into a local before the microtask, OR run the tagging synchronously before closeLinkModal(). Preferred: replace queueMicrotask with a synchronous tag right after insertText/formatText — Quill 2 flushes link-format DOM updates synchronously in current versions, and a defensive same-tick re-query inside a try/catch is cheap. Add a regression check: insert a phone link via the modal, then inspect richTextToMjText output for color:#0000ee (not brand color).
- **resolved_by:** b937740 — captured ownerEditor + ownerRange into locals at the top of applyLink() so the microtask closure holds a live reference after closeLinkModal() nulls the module-scoped refs. Same-tick fix on the run branch.





Evidence:
  if (type === phone) {
    queueMicrotask(() => {
      ownerEditor.root.querySelectorAll(`a[href="${href}"]:not([data-link-type])`).forEach(a => {
        a.setAttribute(data-link-type, phone);
      });
    });
  }
  closeLinkModal();   // <-- sets ownerEditor = null synchronously

This is a cross-task interaction: TASK-001 owned closeLinkModal() lifecycle (null-out ownerEditor on close); TASK-002 added the microtask tagging assuming ownerEditor would still be live. Neither per-task reviewer saw both halves.

Suspected tasks: TASK-001, TASK-002

## FIND-SPRINT-001-2
- **source:** SPRINT-001 (sprint-code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:907,958,1073,1173,1468
- **description:** Phone-digit stripping logic now duplicated across SIX call sites with TWO inconsistent regexes. The sprint added two new copies (lines 907 and 958 in the link modal) using /\D/g, while pre-existing copies in buildCtaHref (1173) and autoLinkPhones (1073) use /[^\d+]/g. The difference is meaningful: /[^\d+]/g preserves a leading + for international numbers (E.164); /\D/g strips it.
- **suggested_action:** Extract a single helper, e.g. function phoneDigits(value, { keepPlus = true } = {}) { return value.replace(keepPlus ? /[^\d+]/g : /\D/g, ); }, place it next to autoLinkPhones, and route all tel:-href construction sites through it. Default to keepPlus=true to match the existing CTA behavior — fix the regression where the new link modal strips leading +. Add a short note to CODE-PATTERNS.md under Shared Utilities once consolidated.
- **resolved_by:** 




Result: a user who enters +1-555-123-4567 in the CTA destination gets href="tel:+15551234567", but the same input in the new link-insert modal yields href="tel:15551234567" — silently dropping the international prefix. isValidPhone() at line 1468 uses /\D/g for length checks only (validation), so it is not affected, but it is a third style coexisting in the same file.

Suspected tasks: TASK-001 (pre-populate path uses /\D/g), TASK-002 (apply path uses /\D/g)

Evidence (regex literals shown with single backslash as written in source):
  index.html:907   prefilledValue = href.slice(4).replace(/\D/g, );
  index.html:958   const digits = value.replace(/\D/g, );
  index.html:1073  const digits = m[0].replace(/[^\d+]/g, );
  index.html:1173  const digits = value.replace(/[^\d+]/g, );

## FIND-SPRINT-001-3
- **source:** SPRINT-001 (sprint-code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:962,1176
- **description:** URL/variable href construction diverges between the new link-insert modal and the existing CTA destination — same input, different output. The link modal (TASK-002, line 962) gates wrapping on a protocol check; buildCtaHref (line 1176) wraps any non-empty non-phone value unconditionally.
- **suggested_action:** Extract a single helper, e.g. function buildLinkHref(type, value) { ... } that handles both phone (tel: + digit normalization, see FIND-SPRINT-001-2) and url/variable (https? passthrough, otherwise {{var}}). Replace both buildCtaHref body and applyLink href construction with calls to it. This also kills FIND-SPRINT-001-2 since the phone branch consolidates with it.
- **resolved_by:** 



Evidence:
  index.html:962   href = /^https?:\/\//i.test(value) ? value : `{{${value}}}`;   // TASK-002
  index.html:1176  return `{{${value}}}`;                                          // pre-existing buildCtaHref URL branch

User-facing consequence: in the CTA destination field, entering "https://example.com" produces href="{{https://example.com}}" (which renders as a broken Handlebars token); in the new body link modal, the same input produces href="https://example.com". Two surfaces for the same concept (URL or Handlebars variable) now behave differently. The link-modal behavior is the correct one; buildCtaHref pre-dates the sprint and is the regression vector if a marketer copy-pastes between the two fields.

Suspected tasks: TASK-002 (added the gated branch in applyLink)

## FIND-SPRINT-001-4
- **source:** SPRINT-001 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:975
- **description:** Attribute-selector injection risk in the phone-tagging querySelectorAll — the URL branch is currently fenced off by an outer if (type === phone) guard so href is always tel:<digits>, but the guard is the ONLY thing keeping user-controlled text out of a CSS attribute selector. A future maintainer extending the data-link-type marker to URL or variable types would silently introduce a selector-injection bug if value contains a double quote.
- **suggested_action:** When fixing FIND-SPRINT-001-1, sidestep this entirely by tagging the inserted anchor via the Range/Blot returned from insertText/formatText, or by walking ownerEditor.root.querySelectorAll(a:not([data-link-type])) and matching on a.getAttribute(href) === href in JS. Either approach removes the templated selector and the implicit dependency on the phone-only guard.
- **resolved_by:** 


Evidence:
  if (type === phone) {
    queueMicrotask(() => {
      ownerEditor.root.querySelectorAll(`a[href="${href}"]:not([data-link-type])`)...
    });
  }

Not exploitable today (only digits reach the selector), but the construction is fragile and undocumented.

Suspected tasks: TASK-002

## FIND-SPRINT-001-5
- **source:** SPRINT-001 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:856-867,992-1014
- **description:** Two near-identical field-update functions for the same UI pattern (label/placeholder/hint swap when a phone/URL segment toggles): updateLinkFields (TASK-001, 856-867) and updateCtaFields (pre-existing, 992-1014). Same shape, same content. The new modal opted for an instant swap; the CTA panel does a 120ms cross-fade. Both use the same string "Any format — non-digits stripped for tel: link." in two places (lines 861 and 998 — and again in the linkDestinationHint HTML at line 700).

UI-label inconsistency: link modal calls the URL field "URL or {{variable}}" / "Enter https://… or {{variable}}."; CTA panel calls it "Variable name" / "Wrapped as {{variable}} in output (Handlebars).". Same input concept, different vocabulary.

Suspected tasks: TASK-001
- **suggested_action:** Low priority — both functions work. If the helper extraction in FIND-SPRINT-001-3 happens, consider also extracting a function setPhoneOrUrlFieldLabels({ labelEl, placeholderEl, hintEl, type, withFade = false }) that drives both panels off shared strings. Reconcile the two URL-field copy variants so marketers see the same vocabulary in both surfaces.
- **resolved_by:** 
