---
id: IDEA-006
type: FEATURE
status: answered
created: 2026-08-11T00:00:00Z
slices:
  - title: "Optional CTA microcopy: rich-text field, toggle-linked visibility, brand-scoped muted rendering"
    description: "Add a new rich-text field beneath the Button text/Destination fields inside the CTA module (`#ctaBody`, index.html line 658). The field is optional — empty content renders nothing. When populated, `buildMjml()` emits a smaller, muted `<mj-text>` block directly after the `<mj-button>` (index.html lines 1639-1641), reading its font-size/color from the active brand's entry in the `templates` config (index.html lines 968-1114), currently a shared default value for all brands. Because the field lives physically inside `#ctaBody`, the existing `ctaToggle`/`onCtaToggle` collapse behavior (index.html lines 2696-2703) already hides it in the authoring UI when the CTA module is switched off, and its MJML emission is gated behind the same `ctaToggle.isOn()` check used for the button itself."
    value_statement: "Lets a marketer add a short supporting sentence under the CTA button (e.g. a reassurance line or fine-print caveat) without leaving the CTA module or fighting body-copy styling — this is the entire ask, and it is not divisible into smaller independently-useful pieces: a field with no compiled output has no marketer value, and rendering logic with no input field has nothing to render."
open_questions:
  - question: "Should the microcopy rich-text toolbar match the current body-copy toolbar exactly (bold, link, ordered/bullet list — index.html lines 1161-1165), or a reduced subset given the field is meant to hold only 'a simple sentence or two'?"
    context: "The clarification brief says microcopy should reuse 'the existing rich-text editing used for body copy (bold, italics, links)' — but the actual body-copy Quill instances (`bodyAboveQuill`/`bodyBelowQuill`, index.html lines 1167-1179) only expose bold, link, and list formatting today (`allowedFormats = ['bold', 'link', 'list']`, line 1165). Italics does not currently exist anywhere in the app's rich-text editors. Also, list formatting under a one-sentence microcopy field reads oddly in practice."
    candidates:
      - "Reuse the exact same toolbar/format whitelist as body copy today (bold, link, ordered/bullet list) — no italics, since italics isn't implemented anywhere yet"
      - "Add italics support as a new capability, to both microcopy and the existing body-copy editors, since the brief explicitly names it"
      - "Reduced toolbar for microcopy only — bold and link, no list — matching the 'simple sentence or two' framing"
    answer: "bold, italics and link. add italics to other rich text fields — microcopy toolbar is bold + italics + link (no lists), and italics support must also be added to the existing body-copy editors."
  - question: "What concrete font-size and color values define the 'muted, smaller' microcopy style, and where should the shared default live in the `templates` config?"
    context: "The clarification settled that style values should hang off the brand template config, shared for now, overridable later — but gave no numeric spec. Existing 'muted, smaller than body' precedents in compiled output are the unsubscribe link (12px, `#6b6b6b`, `DEFAULT_UNSUBSCRIBE` constant at line 966) and the disclosure block (11px, `#6b6b6b`, per-brand `disclosureHtml`, lines 978-1113). Body copy defaults to 16px/`#333333` via `mj-attributes` (line 1626)."
    candidates:
      - "Match the unsubscribe link's existing muted style exactly: 12px, `#6b6b6b`"
      - "Match the disclosure block's style: 11px, `#6b6b6b`"
      - "A new intermediate value (e.g. 13-14px, `#6b6b6b`-family) distinct from both existing footer styles"
    answer: "13–14px muted — a new intermediate value (`#6b6b6b`-family), distinct from both existing footer styles."
  - question: "Should links typed inside the microcopy field (if the link toolbar button is retained) render in the brand accent color, or stay muted like the surrounding text?"
    context: "`richTextToMjText` (index.html lines 1449-1573) currently colors all non-phone links in body copy with `tpl.ctaBackgroundColor` (line 1544) — the brand accent. Applying that unmodified to microcopy would put a brand-colored link inside otherwise-muted text, which may look inconsistent with the 'muted style' framing. This wasn't discussed in the clarification transcript."
    candidates:
      - "Links inside microcopy stay muted (same color as the surrounding text), overriding the body-copy link-coloring pass"
      - "Links inside microcopy keep the brand accent color, consistent with every other link in the email body"
    answer: "Muted links — links inside microcopy stay the same muted color as the surrounding text, overriding the body-copy link-coloring pass."
  - question: "Should the microcopy field carry a length guardrail (character counter and/or soft max), given the intent is explicitly 'a simple sentence or two'?"
    context: "The `preheader` field (index.html line 602) enforces `maxlength=\"150\"` with a live character counter (`#preheaderCount`); body-copy fields have no such limit. Microcopy sits between these two precedents — short by design, but rich-text (which doesn't pair naturally with a simple `maxlength` attribute the way a plain `<input>` does)."
    candidates:
      - "Add a character-count hint (no hard limit), similar in spirit to the preheader counter"
      - "No length guardrail at all — trust marketers to keep it short, consistent with body-copy fields"
    answer: "Char-count hint — live character-count hint with no hard limit, similar in spirit to the preheader's counter."
open_questions_note: "All four questions answered by the user at the Step 3 review checkpoint on 2026-08-11."
assumptions:
  - assumption: "Microcopy will be implemented as a third Quill rich-text editor instance embedded inside `#ctaBody`, mirroring `bodyAboveQuill`/`bodyBelowQuill` (index.html lines 1167-1179), rather than a plain `<textarea>` or a lighter custom control."
    confidence: medium
    validation: "Implementation decision for the task-refiner — confirm before deciding whether the toolbar-handler loop (lines 1280-1282) and invalid-highlighting scaffolding need a third counterpart."
  - assumption: "Microcopy content will not be persisted to localStorage across page reloads, consistent with body-copy and CTA text/destination fields."
    confidence: high
    validation: "Confirmed via review of index.html's localStorage.setItem call sites — only the module-toggle key (`emailBuilder.module.<id>`, line 2664) and the test-data key persist; no form-content field currently persists, matching ARCHITECTURE.md's stated Data Model."
  - assumption: "New brand-config keys for the microcopy style (e.g. a `ctaMicrocopy*` family) will be added to every entry in the `templates` object (index.html lines 968-1114, 9 brand entries) even though all currently resolve to one shared value, following the same 'shared default constant + per-brand override slot' pattern already established by `DEFAULT_UNSUBSCRIBE` (line 966) and `unsubscribeHtml`."
    confidence: high
    validation: "Directly stated by the user in the clarification transcript ('attach it to the branding template... for now it'll be the same muted style'); no further validation needed beyond the task-refiner following the existing pattern."
  - assumption: "Placing the new field's markup inside `#ctaBody` and gating its `buildMjml()` emission behind the existing `ctaToggle.isOn()` check (already used for `<mj-button>` at line 1639) is sufficient to satisfy 'toggling CTA off hides both' — no changes to `createModuleToggle` (lines 2630-2681) or `onCtaToggle` (lines 2696-2703) are required."
    confidence: high
    validation: "Confirmed by reading `onCtaToggle`, which toggles `.collapsed` on the whole `#ctaBody` container, and `buildMjml()`, which already conditionally emits the CTA block based on `ctaToggle.isOn()`."
  - assumption: "No new validation rule is needed in `runCopyAction()` (index.html lines 2817-2886) since microcopy is explicitly optional — an empty field is a valid, common state, unlike CTA text/destination which are required when the CTA module is on."
    confidence: high
    validation: "Directly stated in the clarification transcript ('An empty microcopy field renders nothing under the button')."
research_recommendation: not_needed
research_rationale: "This is an internal-pattern-reuse feature — rich text (Quill), module-toggle collapse behavior, and per-brand template config are all existing, well-understood patterns in this single-file codebase; no external library or API knowledge is required to resolve the open questions."
---

# IDEA-006: Optional CTA Microcopy

## Raw Input

"optional additional text to add beneath all primary CTAs. microcopy smaller where you a simple sentence or two can be placed"

## Clarification Transcript

- Q: What should the microcopy field support content-wise?
  A: Rich text (like body) — reuse the existing rich-text editing used for body copy (bold, italics, links).
- Q: When the CTA module is toggled off, what happens to the microcopy?
  A: Hidden with the CTA — microcopy is part of the CTA module; toggling the CTA off hides both. An empty microcopy field renders nothing under the button.
- Q: How should the microcopy be styled in the compiled email?
  A: "attach it to the branding template. but for now it'll be the same muted style" — i.e. the style values should hang off the brand template config so brands can override later, but initially all brands share the same muted, smaller style.

## Grounding

All application code lives in the single-file app `index.html`.

**CTA module markup** — the target insertion point is `#ctaBody` (index.html lines 658-689), which currently holds Button text (`#ctaText`), a Destination-type segmented control (phone/URL variable), the Destination input, and a live preview chip (`.cta-preview` / `#ctaPreviewBtn`). This is the same container the module-toggle already collapses.

**Module toggle mechanics** — `createModuleToggle(id, label, defaultOn, onChange)` (lines 2630-2681) is the reusable on/off factory (originating from IDEA-003 / the `module-toggle` epic, see `.soloflow/archive/done/module-toggle/EPIC-module-toggle.md`). The CTA instance is wired at lines 2696-2703: `onCtaToggle(isOn)` toggles `.collapsed` on `#ctaBody`, and `buildMjml()` (line 1639) already gates `<mj-button>` emission behind `ctaToggle.isOn()`. Because the CSS rule `.seg-body.collapsed { max-height: 0; }` (line 134) hides the whole container, any new field placed inside `#ctaBody` is automatically hidden with the rest of the CTA fields when the module is off — no new toggle plumbing is needed.

**Rich-text body-copy pattern** — two Quill 2 instances exist today: `bodyAboveQuill` and `bodyBelowQuill` (lines 1167-1179), sharing `richToolbar = [['bold','link'],[{list:'ordered'},{list:'bullet'}]]` and `allowedFormats = ['bold','link','list']` (lines 1161-1165). Notably, **italics is not currently supported** by either editor or anywhere else in the app (confirmed by grep — the only match for "italic" is a code comment listing formats that get *stripped* on paste). This directly contradicts the clarification brief's parenthetical "(bold, italics, links)" and is surfaced as an open question rather than assumed away.

A shared toolbar-handler loop (lines 1280-1282) wires the link-insert modal to both existing editors; a third microcopy editor would need to join this loop (or an equivalent) to get the same link-insert UX.

**Compiled-output rendering pattern** — `richTextToMjText(html, tpl)` (lines 1449-1573) is the pure function that turns a Quill instance's `innerHTML` into a styled `<mj-text>` block: it normalizes Quill's list quirks, auto-links plaintext phone numbers, colors non-phone links using `tpl.ctaBackgroundColor` (line 1544), applies consistent paragraph/list margins, and wraps the result in `<mj-text padding="0 0 14px 0">…</mj-text>` (line 1572). It is called twice in `buildMjml()` — once for body-above (line 1638) and once for body-below (line 1642) — with no per-call style override, since both currently want the same look. Microcopy needs a *different* look (smaller, muted) and probably a different link-color treatment, which this function doesn't currently parameterize.

**Brand template config** — the `templates` object (lines 968-1114) holds 9 brand entries, each with fields like `ctaBackgroundColor`, `ctaTextColor`, `unsubscribeHtml`, `disclosureHtml`. The `DEFAULT_UNSUBSCRIBE` constant (line 966) plus per-brand `unsubscribeHtml: DEFAULT_UNSUBSCRIBE` is the established pattern for "one shared default value, individually overridable per brand" — the same shape the clarification calls for with microcopy styling. README.md (lines 99-114) documents this schema for anyone adding a new brand.

**Existing 'muted, smaller' precedents in compiled output** — the unsubscribe link renders at 12px, color `#6b6b6b` (`DEFAULT_UNSUBSCRIBE`, line 966; also literally used at line 1544's counterpart color var `--muted: #6b6b6b` in the *authoring UI* CSS, line 39); the disclosure block renders at 11px, same muted color family, per brand (lines 978 onward). Body copy defaults to 16px, `#333333` via `<mj-attributes><mj-text .../></mj-attributes>` (line 1626). No brand currently has a bespoke "microcopy" style — this feature introduces the first one.

**Validation** — `runCopyAction()` (lines 2817-2886) enforces required fields (body-above copy, CTA text, phone format when CTA is on, promo fields when promo module is on) but has no precedent for optional-field validation, matching this feature's optional nature.

**No persistence beyond toggle state** — per ARCHITECTURE.md's Data Model section and confirmed by grep, the only `localStorage` keys in use are the module-toggle state key and the test-data JSON key; no copy field (body, CTA text, destination) persists across reloads.

## Slices

See frontmatter. This idea produces one vertical slice — the feature is small and atomic by nature of the settled clarification (rich-text reuse, toggle-linked visibility, and shared-default brand-scoped styling were all resolved before extraction), and splitting it further would either produce a piece with no independent marketer value (an input field with nothing to show, or rendering logic with nothing to render) or would contradict an already-settled clarification answer (e.g. shipping a plain-text-only version first would contradict the explicit "rich text like body" answer).

## Open Questions

All four answered by the user at the review checkpoint (2026-08-11):

1. Toolbar/format parity (and the italics discrepancy)?
   **Answer:** bold, italics and link. add italics to other rich text fields — microcopy toolbar is bold + italics + link (no lists), and italics support must also be added to the existing body-copy editors (`bodyAboveQuill`/`bodyBelowQuill`).
2. Concrete muted style values?
   **Answer:** 13–14px muted — a new intermediate value (`#6b6b6b`-family), distinct from both the unsubscribe (12px) and disclosure (11px) footer styles.
3. Link color inside microcopy?
   **Answer:** Muted links — links stay the same muted color as the surrounding microcopy text, overriding the body-copy link-coloring pass.
4. Length guardrail?
   **Answer:** Char-count hint — live character-count hint with no hard limit, similar in spirit to the preheader's counter.

## Assumptions

See frontmatter for all five assumptions with confidence levels and validation methods. The two most load-bearing: high-confidence assumption that no new module-toggle plumbing is needed (directly confirmed by reading `onCtaToggle`/`buildMjml()`), and the medium-confidence assumption that microcopy needs a genuinely new third Quill instance rather than reusing existing infrastructure as-is.
