---
id: TASK-019
idea: IDEA-004
status: approved
created: 2026-06-30T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CLAUDE.md
  - CODE-PATTERNS.md
acceptance_criteria:
  - criterion: "A static ops-prerequisite documentation block exists inside the .seg-promo card's seg-body, below the three input fields."
    verification: "grep -n 'seg-promo' index.html and inspect: a static block (e.g. <div class=\"promo-ops\">) sits inside #promoBody after the promoUrl field. In-browser: expanding the promo card shows the ops text."
  - criterion: "The block lists sender registration (schema.whitelisting+sample@gmail.com and the Google registration form), image-card outreach (p-Promo-Outreach@google.com), SPF/DKIM/DMARC, sender reputation, per-sender caching, the UTM-in-url note, and a link to the Promotions Annotation Preview tool."
    verification: "grep -n 'schema.whitelisting+sample@gmail.com' index.html, grep -n 'p-Promo-Outreach@google.com' index.html, grep -n 'developers.google.com/workspace/gmail/promotab/preview' index.html each return at least one match. Visually: SPF/DKIM/DMARC, sender reputation, caching, and UTM notes are present."
  - criterion: "The block is purely static — no JavaScript, no validation, no localStorage interaction."
    verification: "The block is plain HTML inside the card markup; no new event listeners, no els entries, no localStorage calls are added for it. grep confirms no JS references the ops block by id for behavior."
  - criterion: "Compiled MJML/HTML output is unaffected by this block."
    verification: "buildMjml() is not modified in this task; the ops block lives only in the form panel DOM, not in the email output. Copy HTML output is unchanged versus before this task for the same inputs."
depends_on: [TASK-016]
estimated_complexity: low
epic: gmail-promo-annotations
test_strategy:
  needed: false
  justification: "Static, non-interactive HTML content with no logic, no state, and no output-path effect. There is no behavior to assert beyond presence of strings, which the acceptance-criteria grep checks already cover; adding a harness fixture would test nothing meaningful."
---

# Ops Prerequisite Documentation Surface

## Objective

Add a static, informational block inside the promo card explaining the out-of-app prerequisites Gmail requires before it will render a PromotionCard: sender/domain registration (mandatory for image cards), authentication, reputation, caching behavior, the UTM-in-url caveat, and a link to Google's Promotions Annotation Preview tool. This surface is essential because image-based cards do not render without Google allowlisting (Risk 1).

## Implementation Steps

1. **Insert a static block** inside `#promoBody` (created in TASK-016), after the destination-URL field and after the spot reserved for it in TASK-016's markup. Use plain HTML, e.g.:
   ```html
   <div class="promo-ops hint">
     <strong>Before Gmail will show this card:</strong>
     <ul>
       <li>Register your sending domain: email a sample to <code>schema.whitelisting+sample@gmail.com</code> and submit the Google registration form.</li>
       <li>For image cards (required for image rendering), also request allowlisting via <code>p-Promo-Outreach@google.com</code>.</li>
       <li>SPF, DKIM, and DMARC must all pass for the sending domain.</li>
       <li>Maintain good sender reputation — low spam complaint rates.</li>
       <li>Annotations are cached per sender; changes may take time to appear.</li>
       <li>Gmail does not click-track the card URL — add UTM params in the Destination URL above.</li>
       <li>Test rendering with Google's
         <a href="https://developers.google.com/workspace/gmail/promotab/preview" target="_blank" rel="noopener noreferrer">Promotions Annotation Preview</a> tool.</li>
     </ul>
   </div>
   ```
   Use exact strings `schema.whitelisting+sample@gmail.com`, `p-Promo-Outreach@google.com`, and the preview URL so the acceptance greps pass.

2. **Add minimal CSS** if needed near the `.hint` rules (~line 116) for `.promo-ops ul { margin: 6px 0 0; padding-left: 18px; }` and `.promo-ops li { margin-bottom: 4px; }`. Reuse the existing `.hint` color/size — do not introduce a new color system.

3. **No JS.** Do not register the block in `els`, do not add listeners, do not touch `localStorage`, do not modify `buildMjml()`.

## Acceptance Criteria

- A static ops block exists inside the promo card's `seg-body` below the inputs.
- It lists registration email + Google form, image-card outreach address, SPF/DKIM/DMARC, sender reputation, per-sender caching, the UTM-in-url note, and a link to the preview tool.
- It is purely static (no JS/validation/localStorage).
- Compiled output is unaffected.

## Test Strategy

None — static informational HTML with no logic or state. The presence-of-strings acceptance greps are sufficient verification.

## Hardest Decision

Whether the registration content belongs inside the card or in a separate help affordance. Per the locked design decision (Slice 4), it lives inside the promo seg card so the marketer sees the prerequisites in the same place they configure the annotation, reinforcing that the in-app output is necessary-but-not-sufficient without Google-side registration.

## Rejected Alternatives

- **A modal or tooltip for the ops doc**: rejected — adds JS and hides the most important caveat (mandatory allowlisting) behind an interaction; an always-visible (within the expanded card) static block better matches the "this won't render until you register" reality.
- **Linking out to README instead of inlining**: rejected — the single-file app has no hosted docs surface; inlining keeps the prerequisites with the feature.

## Lowest Confidence Area

Exact current Google registration addresses/form URL longevity — these are external and may change over time. They are taken verbatim from the research report; if Google deprecates `schema.whitelisting+sample@gmail.com` or the preview URL, this static block is the single place to update.
