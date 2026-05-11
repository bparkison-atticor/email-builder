---
id: IDEA-001
type: FEATURE
status: answered
created: 2026-05-11T00:00:00Z
epics:
  - rich-text-link-ux
slices:
  - title: "Custom link-insert dialog for body copy"
    description: "Replace the stock Quill snow-theme link tooltip with a custom modal or inline panel that presents a phone/URL segmented control, a destination input, and contextual label/hint text — mirroring the CTA field UX."
    value_statement: "Eliminates the expert-only workaround of typing raw tel: or {{variable}} strings by hand; marketers get the same guided experience they already have in the CTA section."
  - title: "Phone link path in custom dialog"
    description: "When 'Phone' is selected in the dialog, strip non-digits from the input value and write the href as tel:<digits> on the selected Quill text span, consistent with buildCtaHref() phone logic."
    value_statement: "Ensures phone links in body copy are formatted identically to CTA phone links, preventing malformed tel: hrefs."
  - title: "URL / Handlebars link path in custom dialog"
    description: "When 'URL / Variable' is selected, write the href as either a raw URL (https://…) or a Handlebars token ({{variable}}) depending on what the marketer enters. PassthroughLink already accepts both; the dialog needs to guide input and validate or hint appropriately."
    value_statement: "Lets marketers insert merge-field links like {{eligibilityLink}} without knowing the tel:/Handlebars syntax, and also supports raw URL hyperlinks which the CTA field does not currently expose."
  - title: "Edit-existing-link behavior"
    description: "When the cursor is placed inside or a range is selected that contains an existing link, pre-populate the dialog with the current href (detect tel: prefix → switch to Phone mode; detect {{ → switch to Variable mode; otherwise treat as raw URL) so the marketer can modify rather than re-create."
    value_statement: "Without this, correcting a link requires deleting and re-inserting it, which is a poor editing experience."
open_questions:
  - question: "Should the 'URL / Variable' tab accept raw URLs (https://…) in addition to Handlebars tokens, or should it be Handlebars-only like the CTA field?"
    context: "The raw input says '(twilio handlebar merge field or otherwise)', implying raw URLs are in scope. The CTA 'URL variable' tab today only accepts a bare variable name and wraps it in {{}}. Body copy links have no such constraint — PassthroughLink already passes through both forms. The decision affects input validation, placeholder copy, and how richTextToMjText handles target=_blank for tel: vs web URLs."
    candidates:
      - "Accept both: detect https?:// prefix and write as-is; otherwise wrap in {{}}. Show a single input with a hint like 'URL or {{variable}}'."
      - "Accept both: add a third tab option ('Raw URL') alongside Phone and Variable so the intent is always explicit."
      - "Handlebars-only, matching the CTA field. Marketers who need a raw URL type it as a full href in the variable field (PassthroughLink passes it through)."
      - "Handlebars-only for now as a minimum slice; raw URL support added in a follow-on slice after this ships."
    answer: "Both (single input, auto-detect): detect https?:// prefix → write as-is; otherwise wrap as {{value}}. Single input with a hint like 'URL or {{variable}}'."
  - question: "Where does the type toggle and destination input live — inline augmentation of the Quill tooltip, a floating custom modal, or a toolbar-triggered panel below/above the editor?"
    context: "Quill's snow theme renders a .ql-tooltip element in the editor container that the 'link' toolbar button activates. Options range from CSS/JS patching of that existing tooltip to replacing it entirely with a custom DOM element. The choice has direct implications for implementation complexity, accessibility (focus trapping, keyboard nav), and visual consistency with the CTA seg-control pattern."
    candidates:
      - "Patch the existing .ql-tooltip: inject a seg-control and swap the single input's label/placeholder via JS, keeping Quill's existing show/hide lifecycle."
      - "Suppress the stock tooltip entirely (override the toolbar link handler) and show a custom floating panel anchored to the selection — full control over markup and styling."
      - "Add a custom 'Insert Link' toolbar button that opens a small modal dialog (not anchored to the selection) — simpler focus management, matches the seg-control visual language already in the form."
      - "Render a persistent 'link options' panel below the toolbar that becomes active when a link is selected or the link button is clicked — no floating/popover positioning needed."
    answer: "Toolbar-triggered modal: override the 'link' toolbar handler to suppress the stock .ql-tooltip and open a small custom modal dialog (not anchored to the selection). Simpler focus management and visually consistent with the form's seg-control language."
  - question: "When editing an existing link, should the dialog read back the href and pre-populate the correct tab and value, and if so how should it handle ambiguous hrefs?"
    context: "A tel: href maps cleanly to Phone tab. A {{token}} maps to Variable tab. An https:// URL maps to raw URL (if that option exists). An ambiguous or malformed value needs a fallback. This question only applies if slice 4 (edit-existing-link) is in scope."
    candidates:
      - "Detect prefix: tel: → Phone, {{ → Variable, anything else → URL/Variable input as-is. Show a warning hint if the value looks malformed."
      - "Always open in 'last used mode' with the raw href in the input; let the marketer switch tabs manually."
      - "Only pre-populate if the href matches a known pattern; show the input blank with a tooltip showing the current href for reference."
    answer: "Prefix detection: tel: → Phone tab (strip prefix into input); {{ → Variable tab (strip braces); anything else → URL input as-is. Show a warning hint if the value looks malformed."
  - question: "Should the link dialog be shared/singleton across both Quill instances (bodyAboveQuill and bodyBelowQuill) or duplicated per editor?"
    context: "There are two independent Quill editors. A singleton dialog that tracks which editor 'owns' the pending link operation is simpler to maintain but requires careful state management. Duplicated dialogs per editor are simpler to reason about but add DOM weight."
    candidates:
      - "Singleton dialog with an ownerEditor variable tracking which Quill instance triggered it."
      - "One dialog element per editor, shown/hidden independently — straightforward but doubles the DOM nodes."
    answer: "Deferred to planner. Default recommendation: singleton dialog with an ownerEditor variable set on open — fewer DOM nodes and easier to keep visually consistent. Routine implementation detail; planner may override."
assumptions:
  - assumption: "PassthroughLink's sanitize no-op is sufficient to persist raw URLs and Handlebars tokens written by the new dialog — no additional Quill format changes are needed."
    confidence: high
    validation: "Confirmed by reading index.html line 766–768: PassthroughLink.sanitize returns the url unchanged, so any string survives the format application."
  - assumption: "richTextToMjText already handles tel: links correctly (no target=_blank, no brand color) and will handle raw-URL links correctly (target=_blank, brand color) without modification."
    confidence: high
    validation: "Confirmed by index.html lines 939–944: the selector a:not([data-autolinked]) adds brand color and target=_blank; autoLinked phone anchors carry data-autolinked='phone' and are excluded. Manually inserted tel: links from the new dialog will NOT carry data-autolinked, so they would incorrectly receive target=_blank and brand color — this is a latent bug that the implementation will need to address."
  - assumption: "The wireSegControl() utility is reusable as-is for the link dialog's phone/URL toggle without modification."
    confidence: medium
    validation: "Review wireSegControl (index.html lines 821–832) to confirm it accepts any NodeList of buttons and a callback — it does, but it operates on a pre-queried NodeList, so the dialog will need to call it after the dialog DOM is created or use an equivalent inline handler."
  - assumption: "Quill's snow theme exposes enough hooks (toolbar handler override, selection-change event) to intercept the link button click and suppress the default .ql-tooltip without forking the Quill source."
    confidence: medium
    validation: "Check Quill docs / source for modules.toolbar handler registration; the pattern is quill.getModule('toolbar').addHandler('link', fn). Needs a quick Quill 2 API verification."
  - assumption: "The two Quill editors are the only rich-text surfaces in the app — no third editor will be added that would also need this dialog."
    confidence: high
    validation: "Grep for 'new Quill' in index.html confirms exactly two instances (lines 777 and 784)."
  - assumption: "No backend or CDN changes are needed — the dialog is pure DOM/JS added to index.html."
    confidence: high
    validation: "Per CLAUDE.md, the entire app is one file with no build step; all dependencies are CDN-loaded at runtime."
research_recommendation: not_needed
research_rationale: "All open questions are answerable from the existing codebase patterns and Quill's well-documented toolbar handler API; no external ecosystem unknowns block implementation."
---

# Rich-Text Hyperlink Insert Dialog (Body Copy)

## Raw Input

> let's get some functionality on the rich text hyperlink option for the body copy. we want to allow for two scenarios that mirror the CTA field. We want to be able to highlight any text and insert either a phone number or a URL (twilio handlebar merge field or otherwise)

## Grounding

Relevant file: `C:\Users\brand\Documents\Claude Apps\EmailBuilder\index.html`

**PassthroughLink (lines 765–769)** — subclasses Quill's built-in `formats/link`, overrides `sanitize()` to return the URL unchanged. This is what allows `{{variable}}` and `tel:` strings to survive Quill's default link sanitizer. Any href the new dialog writes will pass through without stripping.

**richToolbar and editor instantiation (lines 771–789)** — `richToolbar` is defined as `[['bold', 'link'], [{list:'ordered'}, {list:'bullet'}]]`. Both `bodyAboveQuill` and `bodyBelowQuill` spread this array into their `modules.toolbar` config. The `'link'` entry is what renders the chain-link icon and activates Quill's default `.ql-tooltip` on click.

**CTA segmented control (lines 543–557)** — two `<button>` elements with `data-cta-type="phone"` and `data-cta-type="variable"` inside a `.seg-control` div. This is the visual and behavioral pattern the user wants to mirror.

**updateCtaFields() (lines 798–820)** — swaps label, placeholder, and hint text with a 120ms fade when the active CTA type changes. Establishes the pattern for dynamic field updates that the link dialog should follow.

**wireSegControl() (lines 821–832)** — generic utility: given a `NodeList` of buttons and an `onChange` callback, wires click handlers that toggle `.active` / `aria-pressed` across the group. Reusable for the link dialog's toggle.

**buildCtaHref() (lines 968–977)** — phone branch: `tel:${value.replace(/[^\d+]/g, '')}`. Variable branch: `{{${value}}}`. The new dialog's href-building logic should mirror this exactly for its respective tabs.

**richTextToMjText() link handling (lines 939–944)** — applies brand color and `target="_blank"` to all `<a>` elements that do not carry `data-autolinked="phone"`. Manually inserted `tel:` links from the new dialog will currently receive `target="_blank"` and brand color incorrectly, because they lack the `data-autolinked` attribute that `autoLinkPhones()` sets. The implementation will need a strategy (e.g., `data-link-type="phone"` attribute written by the dialog, checked in `richTextToMjText`).

**autoLinkPhones() (lines 852–892)** — automatically converts plaintext phone patterns in body copy to `tel:` anchors with `data-autolinked="phone"`. Manually-dialed phone links via the new dialog should coexist without being double-processed.

## Slices

### Slice 1 — Custom link-insert dialog

Replace the stock Quill snow-theme `.ql-tooltip` for the `'link'` toolbar button with a custom dialog (modal, floating panel, or toolbar-adjacent panel — see Open Questions). The dialog contains a phone/URL segmented control using the same `.seg-control` pattern as the CTA field, a single destination input whose label, placeholder, and hint swap on type change (mirroring `updateCtaFields()`), a confirm/insert action, and a cancel/close action. The `'link'` toolbar button handler is overridden via `quill.getModule('toolbar').addHandler('link', fn)` to suppress the default tooltip and show the custom dialog instead. The dialog must be wired to both `bodyAboveQuill` and `bodyBelowQuill`, tracking which editor owns the pending operation (see Open Question 4).

### Slice 2 — Phone link path

When the Phone tab is active and the marketer confirms, strip non-digits from the input (same logic as `buildCtaHref()` phone branch: `value.replace(/[^\d+]/g, '')`) and apply `tel:<digits>` as the Quill link format on the selected range. Write a `data-link-type="phone"` attribute (or equivalent) on the resulting `<a>` tag so `richTextToMjText()` can exclude these from the `target="_blank"` / brand-color rule. Validate that the stripped result is non-empty before allowing confirmation.

### Slice 3 — URL / Handlebars link path

When the URL / Variable tab is active, accept the input and write the href either as a raw URL (if it starts with `https://` or `http://`) or wrap it as `{{value}}` for bare variable names — or, if the user typed something that already starts with `{{`, use it as-is. The hint text should explain the two accepted forms. `PassthroughLink` already passes both through without modification. The implementation must decide whether to expose this duality in a single input or with an additional tab (see Open Question 1).

### Slice 4 — Edit-existing-link pre-population

When the cursor is placed inside an existing linked span (or a selection containing a single link is made) and the link button is clicked, pre-populate the dialog: detect `tel:` prefix → activate Phone tab and strip the prefix into the input; detect `^{{` → activate Variable tab and strip the braces; anything else → activate URL tab and place the raw value in the input. This prevents the marketer from needing to delete and re-create a link to correct it.

## Open Questions

**Q1 — URL field: raw URL + Handlebars vs Handlebars-only**

The raw input says "(twilio handlebar merge field or otherwise)," which implies raw `https://` URLs should be accepted in the URL tab. The current CTA field accepts only a bare variable name (wrapping it in `{{}}`). Should the URL tab in the link dialog accept both, and if so, should it auto-detect the form or require the marketer to signal intent explicitly?

Candidates:
- Accept both: detect `https?://` prefix → write as-is; otherwise wrap in `{{}}`. Single input, hint reads "URL or {{variable}}."
- Accept both via a third "Raw URL" tab alongside Phone and Variable.
- Handlebars-only to match the CTA field; raw URLs are out of scope for this idea.
- Handlebars-only for the initial slice; raw URL support added in a follow-on.

**Answer:** Both, single input with auto-detect. Detect `https?://` prefix → write the href as-is; otherwise wrap the input as `{{value}}`. Hint reads "URL or `{{variable}}`."

**Q2 — Dialog placement and trigger mechanism**

Quill's default link flow uses a `.ql-tooltip` element anchored inside the editor container. Options range from patching that element to suppressing it entirely and showing a custom panel.

Candidates:
- Patch the existing `.ql-tooltip`: inject a seg-control, swap label/placeholder via JS, preserve Quill's show/hide lifecycle.
- Suppress the stock tooltip entirely via a toolbar handler override; show a custom floating panel anchored to the selection.
- Custom toolbar handler opens a small modal dialog (not anchored to the selection); simpler focus management, visually consistent with the form.
- Persistent "link options" panel below the toolbar that activates on link-button click or link-selection; no floating/popover positioning complexity.

**Answer:** Toolbar-triggered modal. Override the `'link'` toolbar handler via `quill.getModule('toolbar').addHandler('link', fn)` to suppress the stock `.ql-tooltip` and open a small custom modal (not anchored to the selection). Simpler focus management and visually consistent with the form's existing seg-control language.

**Q3 — Edit-existing-link: pre-population and ambiguous hrefs**

When a link already exists and the marketer triggers the dialog, how should the current href be read back into the form?

Candidates:
- Prefix detection: `tel:` → Phone tab; `{{` → Variable tab; anything else → URL input as-is. Show a warning hint for malformed values.
- Open in "last used mode" with the raw href in the input; marketer switches tabs manually.
- Only pre-populate on clean pattern match; otherwise open blank with the current href shown as a read-only reference.

**Answer:** Prefix detection. `tel:` → Phone tab with the digits stripped into the input; `{{` → Variable tab with the braces stripped; anything else → URL/Variable input as-is. Show a warning hint when the value looks malformed.

**Q4 — Singleton vs. per-editor dialog**

There are two Quill instances (`bodyAboveQuill`, `bodyBelowQuill`). The dialog needs to know which editor to write the link into on confirmation.

Candidates:
- Singleton dialog with an `ownerEditor` variable set when the dialog opens; simpler DOM, requires careful state management.
- One dialog element per editor in the DOM, toggled independently; doubles DOM nodes but eliminates shared-state concerns.

**Answer:** Deferred to the planner as a routine implementation detail. Default recommendation: singleton dialog with an `ownerEditor` variable set on open — fewer DOM nodes and easier to keep visually consistent.

## Assumptions

| Assumption | Confidence | Validation |
|---|---|---|
| `PassthroughLink.sanitize` no-op is sufficient — no additional Quill format registration needed | high | Confirmed: index.html line 767 returns url unchanged |
| `richTextToMjText` will incorrectly apply `target="_blank"` and brand color to manually-inserted tel: links (latent bug) | high | Confirmed: lines 941–944 select `a:not([data-autolinked])` — manual tel: links lack `data-autolinked` |
| `wireSegControl()` is reusable for the dialog's toggle with no modification | medium | Review lines 821–832; the function accepts any NodeList, but it must be called after dialog DOM exists |
| Quill 2 allows toolbar handler override via `quill.getModule('toolbar').addHandler('link', fn)` | medium | Needs quick Quill 2 API verification (standard pattern, but confirm against the CDN version in use) |
| Exactly two Quill instances exist in the app — no future third editor at time of implementation | high | Confirmed: grep for `new Quill` yields only lines 777 and 784 |
| No backend or build-step changes required — pure DOM/JS addition to index.html | high | Confirmed by CLAUDE.md project overview |

## Out of Scope

- Changing the CTA field's link behavior — it already works as designed.
- Adding link support to any field other than the two body copy Quill editors.
- Auto-linking phone numbers in body copy (already handled by `autoLinkPhones()`).
- A "remove link" action — Quill's existing toolbar already handles this via the active-link tooltip.
- SendGrid API integration or any backend work.
