---
id: IDEA-007
type: FEATURE
status: answered
created: 2026-08-18T00:00:00Z
epics: [blank-template-preview]
slices:
  - title: "Lorem ipsum placeholder in the primary body copy area (above-CTA)"
    description: "When the entire template is untouched (no marketer content field has been edited since load), the preview iframe substitutes a generic lorem ipsum paragraph into the 'Body — above CTA' slot (`bodyAboveQuill`, index.html ~line 673, feeding `richTextToMjText` at buildMjml() ~line 1808) instead of emitting nothing. The `#bodyAbove` input stays empty, and `lastHtml` (Copy HTML / View HTML source, declared line 1833) is built from the true empty content — the substitution is preview-only, following the same purity pattern already used by `applyTestData`/`applyDarkMode`. The instant any marketer content field is edited anywhere in the form, the placeholder disappears from the preview for good (until reload)."
    value_statement: "A marketer picking a blank template today sees a mostly-empty preview (just banner, footer/disclosure, and an optional CTA button) with no sense of how the template's primary copy area will actually look — this slice makes the dominant content zone of the layout visible immediately, before any typing, which is most of the stated value on its own."
  - title: "Extend placeholder coverage to the optional below-CTA body field"
    description: "Apply the same untouched-state substitution to the 'Body — below CTA' editor (`bodyBelowQuill`, index.html ~lines 722-731, tagged 'optional' in the UI, feeding `richTextToMjText` at buildMjml() ~line 1812), reusing the detection/clearing mechanism built in slice 1."
    value_statement: "Completes the full-layout preview for templates that use the below-CTA area, so a marketer evaluating a template that relies on trailing copy (e.g. a P.S. paragraph or secondary explanation) isn't misled by an empty gap where content will eventually go."
open_questions:
  - question: "Does CTA microcopy (`ctaMicrocopyQuill`, the optional rich-text field under 'Call to action', index.html ~lines 712-718) count as a 'body text field' that should also get lorem ipsum, or is it excluded along with the rest of the CTA module's current empty-state behavior?"
    context: "The clarification's exclusion list names 'CTA button, preheader, and promo fields' but doesn't explicitly mention microcopy. Microcopy is textually a rich-text field like `bodyAboveQuill`/`bodyBelowQuill` (same Quill setup, `allowedFormats` at index.html line 1243), but it physically lives inside the CTA segment (`#ctaBody`) and is optional/off by default in most sends — ambiguous which side of the CTA-vs-body-copy line it falls on."
    candidates:
      - "Excluded — microcopy stays empty (current behavior) since it's part of the CTA module"
      - "Included — microcopy also shows placeholder text since it's rich text like body copy"
    answer: "Excluded — microcopy stays empty (current behavior) since it's part of the CTA module"
  - question: "Should the optional 'Body — below CTA' editor show lorem ipsum at all, or should placeholder text be limited to the primary 'Body — above CTA' editor?"
    context: "The below-CTA field is explicitly labeled 'optional' in the UI (index.html ~line 726) and many real sends never use it. Filling it with lorem ipsum could imply to a marketer that content belongs there when the template is actually designed to work without it."
    candidates:
      - "Show placeholder in both body editors (above and below CTA) for full-layout visibility"
      - "Show placeholder only in the primary above-CTA editor; leave below-CTA genuinely empty since it's optional"
    answer: "Show placeholder in both body editors (above and below CTA) for full-layout visibility"
  - question: "Precisely which interactions count as 'touching' the template for the all-or-nothing clear, beyond typing into a body field?"
    context: "The transcript says placeholders disappear 'the moment the marketer types anything anywhere,' but the app has several non-content controls that also trigger `scheduleRender()` today (dark-mode toggle, viewport switch, test-data toggle — see index.html ~lines 4271-4326) alongside genuine content fields (`template`, `preheader`, `ctaText`, `ctaDestination` at ~lines 4220-4223, plus the three Quill editors). It's unclear whether switching the brand template dropdown, or flipping a preview-only toggle, should also clear the placeholders even though no copy was actually typed."
    candidates:
      - "Only edits to marketer content fields (preheader, CTA text/destination, promo fields, the two body editors) clear placeholders; preview-only toggles and template selection never do"
      - "Any interaction with the form at all — including switching templates or preview toggles — immediately clears placeholders"
      - "Switching the template dropdown clears placeholders (new brand context), but preview-only toggles (dark mode, viewport, test-data) do not"
    answer: "Typing things into either body copy field (free-form answer — narrower than all candidates: only edits to the two body editors clear placeholders; other content fields, template selection, and preview-only toggles do not)"
  - question: "What should the lorem ipsum copy itself consist of — one generic boilerplate paragraph, or something structured to look more like real body copy (e.g. a short lead-in line plus a paragraph)?"
    context: "The goal is layout/visual-fidelity preview, so the placeholder's length and structure affect how representative the preview looks (e.g. a single short sentence vs. a full paragraph will render very differently against the template's actual spacing/line-height)."
    candidates:
      - "A single generic multi-sentence lorem ipsum paragraph per field"
      - "A short bolded lead-in phrase followed by a lorem ipsum paragraph, mimicking a realistic headline-plus-body structure"
    answer: "Single paragraph — a single generic multi-sentence lorem ipsum paragraph per field"
assumptions:
  - assumption: "'Untouched template' can be defined purely in terms of the current page session — no body copy, CTA text/destination, preheader, or promo field value is persisted to localStorage across reloads today (confirmed by grep: only module-toggle keys `emailBuilder.module.<id>` and the test-data JSON key persist; `clearPromoFields()` at index.html ~lines 4421-4427 explicitly resets promo field values on every load). So 'blank template' effectively means 'freshly loaded page, nothing edited yet.'"
    confidence: high
    validation: "Directly confirmed via grep of every `localStorage` call site in index.html."
  - assumption: "The substitution cannot be implemented as a post-processing transform on the compiled HTML string (the pattern used by `applyTestData` at ~line 3550 and `applyDarkMode` at ~line 4089), because an empty rich-text field produces no MJML/HTML node at all — `richTextToMjText` (index.html ~lines 1549-1550) calls `hasRichHtml()` (~lines 1543-1547) and returns an empty string for empty input, so there is nothing in the compiled output for a regex/DOM pass to target. The substitution must happen upstream, at or before the `buildMjml()` call (~lines 1808, 1812), by feeding placeholder HTML into `richTextToMjText` for the preview build only."
    confidence: high
    validation: "Confirmed by reading `richTextToMjText`'s emptiness gate and `buildMjml()`'s two call sites directly."
  - assumption: "Because `buildMjml()` today produces a single MJML source consumed both for `lastHtml` (Copy HTML / View HTML modal) and for the preview srcdoc (`render()`, index.html ~lines 4173-4183), keeping the copied HTML pure while showing placeholders only in the preview will require either a second `buildMjml()`/`mjml2html()` pass with placeholder content substituted, or a parameter threaded through `buildMjml()`/`richTextToMjText` that only the preview render path sets — a deeper hook point than the existing srcdoc-only transform chain (`withPreviewLinkHandler(applyDarkMode(applyTestData(result.html)))`, ~line 4183) that dark mode and test-data substitution use today."
    confidence: medium
    validation: "Implementation decision for the task-refiner; grounded in the architecture read above but the exact mechanism (dual compile vs. threaded flag) is not decided here."
  - assumption: "Only the two body rich-text editors (`bodyAboveQuill`, `bodyBelowQuill`) are in scope as 'body text fields' per the brief's 'headline and body paragraphs' framing — the app has no separate 'headline' input distinct from body copy; 'headline' in the transcript is describing content within these same editors, not a yet-to-exist field."
    confidence: medium
    validation: "Confirmed via grep/search that no headline-specific field exists anywhere in index.html outside the unrelated `promoHeadline` (Gmail Promo Tab) input; flagged as open question above regarding CTA microcopy's boundary, not this point."
  - assumption: "The CTA button's 'current empty-state behavior' referenced in the brief is: an empty `ctaText` input already falls back to the literal string 'Click Here' at MJML-build time (`buildMjml()`, index.html line 1753: `(els.ctaText.value || '').trim() || 'Click Here'`) — i.e. the CTA already never renders visibly blank, so 'keep current behavior' means 'do not add lorem-ipsum-style placeholder logic here,' not 'leave the button visibly empty.'"
    confidence: high
    validation: "Directly confirmed by reading `buildMjml()`'s CTA text fallback line."
research_recommendation: not_needed
research_rationale: "This is a scoping/UX-boundary problem solvable entirely from the existing codebase (Quill rich-text fields, the buildMjml()/render() pipeline, and the established preview-purity pattern) — no external library or ecosystem knowledge is needed to resolve the open questions."
---

# IDEA-007: Lorem Ipsum Placeholder in Blank-Template Preview

## Raw Input

"having the blank template render lorem ipsum before any actual text is inserted into the text fields"

## Clarification Transcript

- Q: Where should the lorem ipsum live when a text field is empty?
  A: Preview-only substitution — input fields stay empty; the preview iframe renders lorem ipsum for any empty text slot so the template's layout is visible. Copied HTML is unaffected.
- Q: When should a field's lorem ipsum disappear from the preview?
  A: All-or-nothing — lorem ipsum only appears when the entire template is untouched. The moment the marketer types anything anywhere, every placeholder disappears.
- Q: Which slots should show placeholder content in the blank-template preview?
  A: Body text fields only — just the copy/text areas (headline, body paragraphs). CTA button, preheader, and promo fields keep their current empty-state behavior.

## Synthesis

In the EmailBuilder single-file app (index.html), when the marketer has a completely untouched (blank) template, the live preview iframe should render lorem ipsum placeholder copy in the body text slots (headline and body copy areas) so the template's layout and design are visible before any real copy exists. This is strictly a preview-only substitution: the actual input fields stay empty, and the copied/exported HTML must never contain the placeholder text (consistent with the app's existing preview-purity pattern, e.g. lastHtml never carrying preview-only transforms). The placeholder behavior is all-or-nothing: as soon as the marketer types anything into any field, all lorem ipsum disappears from the preview. Only body text fields participate — the CTA button, preheader, and promo fields keep their current empty-state behavior.

## Grounding

All application code lives in the single-file app `index.html` (no build step, per CLAUDE.md).

**Body copy fields (in scope).** Two Quill 2 rich-text editors: `bodyAboveQuill` mounted on `#bodyAbove` (UI segment "Body — above CTA", index.html lines 667-675) and `bodyBelowQuill` mounted on `#bodyBelow` (UI segment "Body — below CTA", tagged "optional" at line 726, markup lines 722-731). Both instantiated ~lines 1245-1256 with `allowedFormats = ['bold','italic','link','list']` (line 1243). There is no separate "headline" input anywhere in the app — the brief's "headline and body paragraphs" phrasing describes content typed inside these same two editors, not a distinct field (confirmed by search: the only "headline" input in the codebase is the unrelated `promoHeadline` field for the Gmail Promo Tab).

**Emptiness gate — why substitution can't be a post-processing transform.** `hasRichHtml(html)` (lines 1543-1547) treats an editor as empty if its innerHTML is blank or just `<p></p>`. `richTextToMjText(html, tpl, opts)` (line 1549 onward) checks this first and returns `''` for empty input — meaning an empty body field emits **no MJML node at all**. This is architecturally different from the app's existing preview-only transforms (`applyTestData`, line 3550; `applyDarkMode`, line 4089), which all operate as regex/DOM passes on the *already-compiled* HTML string and therefore need *something* in the DOM to target. Lorem ipsum injection has nothing to target post-compile — it must happen upstream, by feeding placeholder HTML into `richTextToMjText` at its two call sites inside `buildMjml()` (lines 1808 and 1812), before `mjml2html()` runs.

**Single MJML source feeds both lastHtml and the preview.** `buildMjml()` (lines 1749-1831) returns one MJML string. `render()` (lines 4173-4212) compiles it once via `mjml2html()`, assigns the raw result straight to `lastHtml` (line 1833 declares it; line 1897's comment: "lastHtml (used by Copy HTML and the raw HTML modal) keeps tokens intact"), and only *then* layers preview-only transforms onto a separate `srcdoc` value: `els.preview.srcdoc = withPreviewLinkHandler(applyDarkMode(applyTestData(result.html)))` (line 4183). Because both `lastHtml` and the preview currently originate from the *same* `buildMjml()`/`mjml2html()` call, keeping `lastHtml` pure while placeholder-filling the preview will require either a second compile pass with substituted content, or a flag threaded through `buildMjml()`/`richTextToMjText` — a different shape than the existing "transform after compile" precedent.

**Existing preview-purity convention.** The codebase already treats "preview shows something extra, copied HTML never does" as an established pattern: `applyTestData` (Handlebars token substitution, preview-only per its own comment at line 1896), and the dark-mode transform chain (`EB-DARKSIM` marker comments at lines 3687/3980 explicitly say "preview only, never present in copied HTML"; a dedicated fixture at line 2623 asserts `lastHtml` never carries the `EB-DARKSIM` marker while the preview srcdoc does). Any lorem-ipsum implementation should satisfy an equivalent purity guarantee.

**Fields explicitly excluded per the clarification, with their current empty-state behavior:**
- CTA button text (`#ctaText`, lines 683-684): already falls back to the literal string `'Click Here'` when empty, at `buildMjml()` line 1753 (`(els.ctaText.value || '').trim() || 'Click Here'`). It is never rendered visibly blank today.
- Preheader (`#preheader`, lines 624-627): when empty, `buildMjml()` simply omits the `<mj-preview>` tag (line 1764-1767) — no fallback text.
- Promo fields (`#promoHeadline`/`#promoImageUrl`/`#promoUrl`, lines 630-665): module is off by default (`createModuleToggle('promo', ..., false, ...)`), and `buildPromoJsonLd()` (line 1874) returns `''` when the module is off or fields are missing — no JSON-LD block is emitted at all.
- CTA microcopy (`ctaMicrocopyQuill`, optional rich-text field under the CTA segment, lines 712-718): also empty-gated via the same `hasRichHtml`-style check (`buildMicrocopyBlock`) — sits in an ambiguous zone since it's rich text like body copy but physically part of the CTA module (see Open Questions).

**Render trigger surface (relevant to the "types anything anywhere" all-or-nothing rule).** `scheduleRender()` (lines 4214-4218, 150ms debounce) is wired to: the `template`, `preheader`, `ctaText`, `ctaDestination` inputs via a shared `input`/`change` listener loop (lines 4220-4224); `bodyAboveQuill`/`bodyBelowQuill`'s `text-change` events (lines 4226-4227); and `ctaMicrocopyQuill`'s `text-change` event (lines 4232-4235). Separately, the test-data toggle, dark-mode toggle, and viewport switch also call `scheduleRender()` on change (lines ~4271-4326) even though they are preview-only controls, not content edits — notably, the three promo text inputs (`promoHeadline`/`promoImageUrl`/`promoUrl`) currently only have `input` listeners that clear invalid styling (lines 4479-4489) with no visible `scheduleRender()` wiring found by search, an existing quirk unrelated to this idea but relevant to scoping "which fields count as touching the template."

**No cross-reload persistence of content.** Confirmed via grep of every `localStorage` call site: only module-toggle state (`emailBuilder.module.<id>`) and the test-data JSON textarea persist. Body copy, CTA text/destination, preheader, and promo field values are never saved — `clearPromoFields()` (lines 4421-4427) explicitly resets promo values "on every load." This means "untouched" is a same-session concept only; there's no need to reconcile placeholder logic with restored draft content.

## Slices

1. **Primary body-area placeholder (above-CTA).** Implements the core mechanism: detect the all-untouched state, substitute lorem ipsum into `bodyAboveQuill`'s contribution to the preview-only MJML build, keep `lastHtml` pure, and clear all placeholders the instant any in-scope content field changes. Delivers the majority of the stated value (layout visibility) on its own, since the above-CTA area is the dominant content zone in every template.
2. **Below-CTA placeholder extension.** Reuses slice 1's detection/clearing mechanism and applies it to the optional `bodyBelowQuill` field, completing full-layout visibility for templates that use trailing/secondary copy.

## Open Questions

1. Does CTA microcopy (`ctaMicrocopyQuill`) count as a 'body text field' that should also get lorem ipsum, or is it excluded along with the rest of the CTA module's current empty-state behavior?
   **Answer:** Excluded — microcopy stays empty (current behavior) since it's part of the CTA module.

2. Should the optional 'Body — below CTA' editor show lorem ipsum at all, or should placeholder text be limited to the primary 'Body — above CTA' editor?
   **Answer:** Show placeholder in both body editors (above and below CTA) for full-layout visibility.

3. Precisely which interactions count as 'touching' the template for the all-or-nothing clear, beyond typing into a body field?
   **Answer:** "typing things into either body copy field" (free-form — narrower than all offered candidates: only edits to the two body editors clear placeholders; other content fields, template selection, and preview-only toggles do not).

4. What should the lorem ipsum copy itself consist of — one generic boilerplate paragraph, or something structured to look more like real body copy?
   **Answer:** Single paragraph — a single generic multi-sentence lorem ipsum paragraph per field.

## Assumptions

See frontmatter for all five assumptions with confidence levels and validation methods. The two most load-bearing: the high-confidence architectural finding that substitution must happen upstream of MJML compilation (not as a post-compile transform like existing preview-only features), and the medium-confidence assumption about how to keep `lastHtml` pure given `buildMjml()` currently produces one shared MJML source for both the copy-output and preview paths.
