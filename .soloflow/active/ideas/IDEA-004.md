---
id: IDEA-004
type: FEATURE
status: answered
created: 2026-06-30T00:00:00Z
epics: [gmail-promo-annotations]
slices:
  - title: "Promo annotation form panel (module toggle + fields)"
    description: "Add a new collapsible seg card below the test-data card with a createModuleToggle-powered enable/disable toggle (default OFF). When ON, expose six form fields: annotation type (DiscountOffer / PromotionCard picker), headline/description, discount code, promo image URL, start date, end date. Persist field values to localStorage under emailBuilder.promo.* keys. No MJML injection yet."
    value_statement: "Marketers can discover and fill the promo metadata fields without any output change until the injection slice ships. Delivers the UI contract, localStorage persistence, and the toggle wiring independently."
  - title: "Client-side field validation"
    description: "On copy action (runCopyAction) and on live change, validate promo fields when the toggle is ON: required fields present, end date not in the past, image URL starts with https://, date values are parseable. Surface errors through the existing markInvalid / showCopyError pathway (required field errors) and the #warn banner (non-blocking warnings such as image URL format). Default the end date to 30 days from today when the field is empty to prevent the past-date silent failure."
    value_statement: "Catches the most common annotation silent-failure causes before the marketer ever opens Gmail. Directly addresses the known footguns (past end date, non-HTTPS image) that caused the prior SFMC attempt to fail silently."
  - title: "JSON-LD injection into MJML mj-head via mj-raw"
    description: "When the promo toggle is ON and validation passes, serialize the form values into a schema.org JSON-LD block (DiscountOffer or PromotionCard) and inject it into buildMjml() as a second <mj-raw><script type='application/ld+json'>...</script></mj-raw> element inside <mj-head>, adjacent to the existing meta-tag mj-raw block. The injected block is included in the copied HTML but has no visible effect in the preview iframe."
    value_statement: "This is the core deliverable — the JSON-LD in <head> is what Gmail reads to render the promo card. MJML's mj-raw passthrough is the exact mechanism that avoids the head-mangling problem from SFMC Content Builder."
  - title: "Ops prerequisite documentation surface"
    description: "Add a collapsed informational block (not a form section) inside the promo seg card that surfaces the four operational preconditions as plain-English text: sender must register via Gmail's Email Markup form, SPF/DKIM/DMARC must pass, sender reputation applies, Gmail caches annotations per sender. Link to the Gmail Promotions Annotation Preview tool. This is static copy, not builder logic."
    value_statement: "The annotation will silently do nothing if sender registration is missing. Surfacing the preconditions inside the tool — not buried in a README — prevents the ops team from shipping promos that never render in Gmail."
open_questions:
  - question: "Which annotation type(s) should ship in the first implementation?"
    context: "Schema.org defines multiple Gmail Promotions tab types. DiscountOffer (discount code + dates + discount value) and PromotionCard (image + headline, no code required) cover the most common marketing use cases. Supporting both requires a type picker and conditionally showing/hiding the discount-code and discount-value fields. Supporting only one simplifies the form but may not cover enough real campaigns."
    candidates:
      - "DiscountOffer only — most common use case for law/disability/PI marketing, simpler form, ship faster"
      - "PromotionCard only — image-first, no code required, broader applicability across campaign types"
      - "Both, with a two-option picker that shows/hides relevant fields — adds ~2 conditional fields, worthwhile if campaigns mix types"
    answer: "PromotionCard only"
  - question: "Where in the form panel should the promo seg card appear?"
    context: "The current form panel order is: Template/Preheader → Body above CTA → CTA → Body below CTA → Test data. The promo annotation is metadata that does not affect visible email content, which aligns it with Test data at the bottom. However it could also live immediately after preheader since it is email-level metadata like the preheader itself."
    candidates:
      - "Below Test data (last card) — groups non-visible metadata together, least disruptive to the existing flow"
      - "After Preheader (second card) — groups all email-level metadata (preheader + promo) near the top, closer to where the marketer thinks about subject/inbox presentation"
    answer: "After Preheader (second card)"
  - question: "Should the promo annotation fields be persisted across sessions in localStorage, or intentionally cleared on each load?"
    context: "All other field values (preheader, CTA text, test data) persist in localStorage. Promo metadata (discount code, dates) is campaign-specific and often changes between sends. Persisting it could cause stale codes or past dates to silently carry over; not persisting means refilling fields every time."
    candidates:
      - "Persist all fields to localStorage (consistent with every other field in the app, user can clear manually)"
      - "Persist the toggle state only; clear field values on each load (prevents stale campaign metadata, slight friction for repeated sends)"
      - "Persist fields but surface a warning in the #warn banner when the loaded end date is already in the past"
    answer: "Persist the toggle state only; clear field values on each load"
  - question: "How should the discount value field be structured — a plain text input or a numeric + currency-unit pair?"
    context: "Schema.org DiscountOffer expects a numeric value and optionally a currency. A plain text input (e.g. '20% off') is simpler and flexible but may produce non-compliant JSON-LD that Gmail ignores. A number field plus a unit dropdown (%, $, flat) produces clean structured output but adds UI complexity."
    candidates:
      - "Plain text input — let the marketer type '20% off' or '$50'; serialize as-is into the description field rather than a structured value"
      - "Numeric input + unit picker (%, $) — produces schema.org-compliant structured discount value"
    answer: "N/A — defer to research (resolve the correct schema.org shape first). Note: with PromotionCard-only scope selected, DiscountOffer's discount value is out of first-implementation scope regardless."
assumptions:
  - assumption: "MJML's mj-raw inside mj-head passes the script block verbatim into the compiled HTML <head> without modification, which is the mechanism that avoids the SFMC Content Builder head-mangling problem."
    confidence: high
    validation: "The existing mj-raw block at index.html ~line 1503 already uses this exact pattern for meta tags. Confirm by compiling a test MJML string with a <script type='application/ld+json'> block via mjml2html and inspecting the output head."
  - assumption: "The createModuleToggle factory (index.html ~line 2147) can be used as-is to wire the promo toggle — no changes to the factory are needed."
    confidence: high
    validation: "The factory is generic: createModuleToggle(id, label, defaultOn, onChange). The promo module would call createModuleToggle('promo', 'Gmail Promo Tab', false, onPromoToggle). Confirmed by reading the factory implementation at lines 2147–2198."
  - assumption: "The .seg-body / .seg-body.collapsed CSS collapse primitive (index.html ~line 122) can accommodate the promo field group without exceeding the max-height: 1000px ceiling."
    confidence: medium
    validation: "Six form fields at roughly 80px each = ~480px. Well under 1000px. Confirm after the HTML is drafted — if a date-picker widget or help block adds significant height, revisit."
  - assumption: "Gmail's Promotions tab will accept JSON-LD injected via this method when the sender is properly registered and SPF/DKIM/DMARC passes — the prior SFMC failure was caused by head mangling, not by the JSON-LD content or sender configuration."
    confidence: medium
    validation: "Cannot validate from the codebase alone. Requires testing a compiled output through the Gmail Promotions Annotation Preview tool (developers.google.com/gmail/promotab-annotations-preview) against a registered sender."
  - assumption: "runCopyAction() is the correct place to enforce promo field validation (required fields, date range, image URL) for the copy path, following the existing markInvalid / showCopyError pattern."
    confidence: high
    validation: "Confirmed by reading runCopyAction() at lines 2290–2340. The validation pattern is: check fields, call markInvalid() on failures, accumulate missing[] array, call showCopyError() and return 'validation-failed' early. Promo fields follow the same path."
  - assumption: "The #warn banner is the correct surface for non-blocking promo warnings (e.g. image URL format hint, end date close to expiry) rather than blocking copy validation."
    confidence: high
    validation: "CODE-PATTERNS.md explicitly documents the two-surface split: markInvalid/showCopyError for required-field blocking errors, #warn for template compile errors and non-fatal warnings. Image URL format is non-fatal (the annotation may still render); end date in the past is a blocking error."
  - assumption: "Browser-side date input fields (<input type='date'>) are sufficient for start/end date capture without a custom date-picker library."
    confidence: high
    validation: "The single-file, no-build-step constraint rules out adding a date-picker library. Native date inputs are supported in all modern browsers and produce ISO date strings directly. No CDN import needed."
research_recommendation: recommended
research_rationale: "Validating exact schema.org JSON-LD field names and required vs. optional properties for Gmail's PromotionCard type requires external docs that cannot be confirmed from the codebase alone. Research must additionally confirm (a) how to correctly emit the JSON-LD via MJML's mj-head/mj-raw passthrough and any MJML-specific gotchas, and (b) Twilio SendGrid specifics — whether SendGrid's Code Editor / send pipeline preserves the <head> JSON-LD intact, plus any SendGrid sender-registration or deliverability requirements that interact with Gmail's annotation rendering."
research_scope:
  - "schema.org PromotionCard: exact field names, required vs optional properties, image aspect-ratio/dimension/HTTPS requirements, date format expectations."
  - "MJML: confirmed pattern for injecting <script type='application/ld+json'> into the compiled <head> via mj-head/mj-raw; whether MJML escapes or reformats the script body; any version-specific behavior; community/email-templating best practices for Gmail annotations in MJML."
  - "Twilio SendGrid: whether the SendGrid Code Editor and send pipeline preserve the head JSON-LD verbatim (no stripping/minification surprises); SendGrid sender authentication (SPF/DKIM/DMARC) and any sender-registration interplay with Gmail Promotions tab annotation rendering."
  - "Gmail: the authoritative sender-registration URL (Email Markup / Schema whitelisting) and the Promotions Annotation Preview validation workflow."
---

# IDEA-004: Gmail Promotions Tab Annotation Injection

## Raw Input

"somewhere in memory there's info or an idea about adding gmail promo tab functionality"

*(Canonical detail sourced from persistent project memory: Gmail Promotions tab annotations via schema.org JSON-LD injected through MJML mj-head/mj-raw.)*

## Grounding

All code lives in `index.html`.

**Existing mj-raw injection pattern**

`buildMjml()` at ~line 1476 already uses `<mj-head><mj-raw>` to inject meta tags verbatim into the compiled HTML `<head>` (lines 1503–1506). A second `<mj-raw>` block containing `<script type="application/ld+json">` can be appended in the same position using the same mechanism. This is the exact pattern that avoids SFMC Content Builder's head-mangling problem.

**Module toggle infrastructure (IDEA-003, completed)**

`createModuleToggle(id, label, defaultOn, onChange)` at ~line 2147 is the established factory for optional module toggles. It handles DOM creation, localStorage persistence under `emailBuilder.module.<id>`, init callback, and click/keyboard events. The CTA toggle at line 2219 is the canonical prior-art instance.

**Collapsible seg-body pattern**

`.seg-body` / `.seg-body.collapsed` CSS at line 122 provides an animated `max-height` collapse for module field groups. Currently used by `#ctaBody`. The promo card's field group would use the same pattern.

**Validation pathways**

- `runCopyAction()` at ~line 2290: blocking validation via `markInvalid()` + `showCopyError()`. Required promo fields hook here.
- `showWarn()` at ~line 2065, surfacing to `#warn` banner: non-blocking warnings during preview. Image URL format hints and stale-date notices go here.

**Form panel structure (lines 568–648)**

Current seg card order: seg-meta (Template + Preheader) → Body above CTA → seg-cta (CTA) → Body below CTA → seg-test (Test data). A new promo seg card appends at the bottom or after seg-meta depending on the placement decision.

**localStorage key namespace**

Existing module keys follow `emailBuilder.module.<id>` (confirmed in `createModuleToggle` at line 2148). Promo fields would use `emailBuilder.promo.<fieldname>` keys.

**`humanizeTemplateError` pattern**

At ~line 1476 (CODE-PATTERNS.md). Any JSON serialization error from the promo fields must be translated to a plain-English message before display — not shown raw. This is a project-wide convention.

## Slices

### Slice 1: Promo annotation form panel (module toggle + fields)

Add a new `div.seg` card (e.g. class `seg-promo`) to the form panel HTML. Wire it with `createModuleToggle('promo', 'Gmail Promo Tab', false, onPromoToggle)` — defaulting OFF since this is an opt-in feature, not standard on every email. The `onPromoToggle` callback toggles `.collapsed` on the seg-body and calls `scheduleRender()`.

The seg-body exposes six fields:
- Annotation type: two-option segmented control (DiscountOffer / PromotionCard) using the existing `.seg-control` pattern
- Headline / description: text input
- Discount code: text input (conditionally shown for DiscountOffer only)
- Promo image URL: text input with https:// hint
- Start date: `<input type="date">`
- End date: `<input type="date">` — auto-populated to 30 days from today when the field is first focused or the toggle is turned on and the field is empty

All field values persist in localStorage under `emailBuilder.promo.*` keys and are restored on load. No MJML output change in this slice.

### Slice 2: Client-side field validation

Hook promo validation into `runCopyAction()` and the live preview render path, gated on `promoToggle.isOn()`:

- **Blocking (copy path):** headline required; end date required and must not be in the past; image URL must begin with `https://`; discount code required when type is DiscountOffer. Use `markInvalid()` + `showCopyError()` following the existing pattern.
- **Non-blocking (preview path):** if image URL is present but does not match a known HTTPS pattern, emit a `#warn` notice. If end date is within 48 hours of expiry, emit a `#warn` advisory.
- **Default end date:** when the promo toggle is turned ON and end date is empty, set it to today + 30 days. This prevents the past-date footgun without requiring explicit marketer action.

### Slice 3: JSON-LD injection into MJML mj-head via mj-raw

Extend `buildMjml()` to conditionally inject the promo JSON-LD block. When `promoToggle.isOn()` is true:

Serialize form values into a schema.org-compliant object (DiscountOffer or PromotionCard), JSON-stringify it, and append a second `<mj-raw>` block inside `<mj-head>`:

```
<mj-raw>
  <script type="application/ld+json">
    { "@context": "http://schema.org", ... }
  </script>
</mj-raw>
```

The block is placed after the existing meta-tag `<mj-raw>` and before `<mj-style>`. When the toggle is OFF, the block is omitted entirely — no JSON-LD in the output.

Any serialization error must go through a named humanizer function (following `humanizeTemplateError`) before being surfaced via `#warn`.

### Slice 4: Ops prerequisite documentation surface

Inside the promo seg card, below the fields, add a static collapsible help block (e.g. a `<details>` element or a styled `.hint` block that is always visible when the toggle is ON). Contents:

- Sender registration is required: Gmail's Email Markup form (use the actual registration URL from Google's developer docs)
- SPF, DKIM, and DMARC must pass for annotations to render
- Sender reputation affects rendering — Gmail may suppress annotations from low-volume or low-reputation senders
- Gmail caches annotations per sender; incorrect markup can suppress annotations for several hours after correction
- Link to the Gmail Promotions Annotation Preview tool as the authoritative validation step before sending

This is static HTML in the form panel — no JS, no validation, no localStorage.

## Open Questions

**1. Which annotation type(s) should ship first?**

The schema.org Gmail Promo tab supports DiscountOffer and PromotionCard as the two most common types. Shipping both requires a type picker and ~2 conditionally shown fields (discount code, discount value). Shipping one type is simpler but may not cover enough real campaign variety across the three current brands (Postman Law, National Disability Center, Wettermark Keith), which are PI/disability/personal-injury firms — not discount-code-heavy verticals. PromotionCard (image + headline, no code) may be the higher-fit type for these brands.

**Answer:** PromotionCard only. First implementation ships the image + headline type; no discount-code/discount-value fields. DiscountOffer can be a follow-up idea if a discount-heavy campaign emerges.

**2. Where in the form panel should the promo seg card appear?**

At the bottom (after Test data), the promo card groups with other non-visible-output metadata. After the Preheader card, it groups with other inbox-presentation metadata. The placement sets the mental model for the marketer: "this is like test data" vs. "this is like subject line metadata."

**Answer:** After the Preheader card (second card) — grouped with other email-level/inbox-presentation metadata near the top.

**3. Should promo field values persist across sessions?**

Discount codes and campaign dates are campaign-specific. If a marketer reuses the builder for a new campaign, stale dates or expired codes will silently carry over into copied HTML. The counterargument is that every other field in the app persists — inconsistency is confusing. A middle path (persist but warn when the loaded end date is past) matches the existing validation posture.

**Answer:** Persist the toggle state only; clear the field values on each load. This deviates from the persist-everything convention deliberately, to avoid stale campaign codes/dates silently carrying into a new send. The toggle remembering its on/off state preserves discoverability without the stale-data risk.

**4. Discount value field structure**

Schema.org DiscountOffer has structured `price` and `priceCurrency` properties. A plain-text input is simpler but may produce non-compliant JSON-LD. A numeric + unit picker produces cleaner output. This only applies if DiscountOffer is in scope.

**Answer:** Deferred to research. Moot for the first implementation given the PromotionCard-only scope decision (Q1) — PromotionCard has no discount-value field. Revisit if/when DiscountOffer is added.

## Research Scope (user-requested)

Beyond the schema.org field validation, research must cover the full delivery path so the markup actually survives to Gmail:

- **schema.org PromotionCard** — exact field names, required vs optional properties, image aspect-ratio/dimension/HTTPS requirements, date format expectations.
- **MJML** — check MJML docs and email-templating community guidance for the confirmed pattern of injecting `<script type="application/ld+json">` into the compiled `<head>` via `mj-head`/`mj-raw`; whether MJML escapes/reformats the script body; any version-specific behavior or gotchas.
- **Twilio SendGrid** — confirm the SendGrid Code Editor and send pipeline preserve the head JSON-LD verbatim (no stripping/minification that would void the annotation); SendGrid sender authentication (SPF/DKIM/DMARC) and any sender-registration interplay with Gmail Promotions tab rendering.
- **Gmail** — the authoritative sender-registration URL and the Promotions Annotation Preview validation workflow.

## Assumptions

All assumptions are documented in the frontmatter above with confidence levels and validation methods.
