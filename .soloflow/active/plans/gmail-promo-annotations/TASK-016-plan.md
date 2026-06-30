---
id: TASK-016
idea: IDEA-004
status: approved
created: 2026-06-30T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CLAUDE.md
  - CODE-PATTERNS.md
  - ARCHITECTURE.md
acceptance_criteria:
  - criterion: "A new .seg.seg-promo card exists in the form panel positioned immediately after the .seg-meta (Preheader) card and before the 'Body above CTA' .seg."
    verification: "Inspect index.html source order: the seg-promo block appears between the closing </div> of .seg-meta (~line 578) and the opening of the first body .seg (~line 580). Load the page in a browser; the 'Gmail Promo Tab' card renders as the second card."
  - criterion: "The card uses createModuleToggle('promo','Gmail Promo Tab',false,onPromoToggle) and the toggle element is appended into the card's .seg-head."
    verification: "grep -n \"createModuleToggle('promo'\" index.html returns exactly one match; the toggle defaults OFF (third arg false). In-browser: the card's seg-body starts collapsed."
  - criterion: "The seg-body collapses/expands with the toggle via the existing .seg-body / .seg-body.collapsed mechanism."
    verification: "In-browser: toggling 'Gmail Promo Tab' on/off animates the field group open/closed. onPromoToggle calls element.classList.toggle('collapsed', !isOn) on the promo seg-body, mirroring onCtaToggle (~line 2216)."
  - criterion: "The card contains three inputs: promo headline (id=promoHeadline), promo image URL (id=promoImageUrl), and destination URL (id=promoUrl), each with a label and an https hint where applicable."
    verification: "grep -n 'id=\"promoHeadline\"' index.html, grep -n 'id=\"promoImageUrl\"' index.html, grep -n 'id=\"promoUrl\"' index.html each return exactly one match. No date inputs exist (grep -n 'promoStart\\|promoEnd\\|availabilityStarts\\|availabilityEnds' index.html returns 0 matches)."
  - criterion: "Toggle STATE persists across reload but field VALUES are cleared on every load."
    verification: "In-browser: enter values, toggle on, reload — toggle stays on (localStorage emailBuilder.module.promo === 'true') but the three inputs are empty. An explicit clear runs on load that empties promoHeadline/promoImageUrl/promoUrl values."
  - criterion: "This slice produces NO change to compiled MJML/HTML output."
    verification: "buildMjml() (~line 1476) is unmodified in this task. With the promo toggle in any state, the Copy HTML output is identical to pre-task output for a given template + body."
depends_on: []
estimated_complexity: medium
epic: gmail-promo-annotations
test_strategy:
  needed: true
  justification: "The load-time field-clear-but-persist-toggle behavior is custom logic that deviates from the persist-everything convention and is easy to regress. It is verified via the existing developer test harness (Ctrl+Shift+T) with a new fixture section, consistent with HUMANIZE_FIXTURES / SAFE_ATTR_FIXTURES."
  targets:
    - behavior: "clearPromoFields() empties promoHeadline, promoImageUrl, and promoUrl inputs without touching the emailBuilder.module.promo localStorage key."
      test_file: "index.html"
      type: unit
---

# Promo Annotation Form Panel (PromotionCard-only)

## Objective

Add the "Gmail Promo Tab" module card to the form panel as the second card (after Preheader), wired to the existing `createModuleToggle` factory with a collapsible body and three PromotionCard-relevant inputs (headline, image URL, destination URL). Persist only the toggle state; clear field values on every load. This slice introduces the UI surface only — it must not alter compiled output.

## Implementation Steps

1. **Add markup.** In the HTML, immediately after the `.seg.seg-meta` card's closing `</div>` (~line 578) and before the first Body `.seg` (~line 580), insert a new card:
   ```html
   <div class="seg seg-promo">
     <div class="seg-head">
       <span class="seg-title">Gmail Promo Tab</span>
       <span class="seg-tag">optional</span>
       <!-- promo toggle appended here by JS -->
     </div>
     <div class="seg-body collapsed" id="promoBody">
       <div class="field">
         <label for="promoHeadline">Headline</label>
         <input type="text" id="promoHeadline" placeholder="e.g. 30% off your first order" />
       </div>
       <div class="field">
         <label for="promoImageUrl">Promo image URL</label>
         <input type="text" id="promoImageUrl" placeholder="https://…/promo.png" />
         <div class="hint">Must be a public <strong>https://</strong> PNG or JPEG, at least 256×256.</div>
       </div>
       <div class="field">
         <label for="promoUrl">Destination URL</label>
         <input type="text" id="promoUrl" placeholder="https://…" />
         <div class="hint">Where the promo card click goes. Add UTM params here — Gmail does not click-track this URL.</div>
       </div>
       <!-- TASK-019 inserts the static ops-doc block here -->
     </div>
   </div>
   ```
   Do NOT add any date inputs — PromotionCard has no date fields.

2. **Add CSS** near the other `.seg.seg-*` rules (~line 257). Add `.seg.seg-promo { background: #f7f8fb; border-color: #e0e3ea; }` (or similar neutral tint distinct from CTA/test). Also add `.seg-promo .seg-head .module-toggle { margin-left: auto; }` mirroring the `.seg-cta` rule at line 124 so the toggle right-aligns. Reuse the existing `.seg-body` / `.seg-body.collapsed` and `.field`/`.hint` styles — no new collapse mechanism.

3. **Register element handles** in the `els` object (~line 1026): add `promoHeadline`, `promoImageUrl`, `promoUrl`, and `promoBody` via `document.getElementById(...)`.

4. **Wire the toggle.** Near the CTA toggle (~line 2213-2220), add:
   ```js
   function onPromoToggle(isOn) {
     els.promoBody.classList.toggle('collapsed', !isOn);
     scheduleRender();
   }
   const promoToggle = createModuleToggle('promo', 'Gmail Promo Tab', false, onPromoToggle);
   document.querySelector('.seg-promo .seg-head').appendChild(promoToggle.element);
   ```
   Declare `promoToggle` at module scope (same scope as `ctaToggle`) so TASK-017 and TASK-018 can call `promoToggle.isOn()`.

5. **Clear field values on load.** Add a `clearPromoFields()` function that sets `els.promoHeadline.value = ''`, `els.promoImageUrl.value = ''`, `els.promoUrl.value = ''`. Call it once during init (after the `els` object and the inputs exist, before/after the toggle is wired — order relative to the toggle does not matter since the toggle only reads localStorage, not the inputs). It must NOT touch `localStorage`.

6. **Add a test-harness fixture section** (see Test Strategy) so the clear-but-persist behavior is exercised by Ctrl+Shift+T.

## Acceptance Criteria

- New `.seg-promo` card is the second card (after Preheader, before Body-above), uses `createModuleToggle('promo','Gmail Promo Tab',false,onPromoToggle)`, and collapses via `.seg-body.collapsed`.
- Inputs `promoHeadline`, `promoImageUrl`, `promoUrl` exist; no date inputs exist.
- Toggle state persists across reload; field values are cleared on every load.
- `buildMjml()` is untouched and compiled output is unchanged in this slice.

## Test Strategy

Add a third fixture section to `renderTestHarness()` (~line 1833), following the `HUMANIZE_FIXTURES` / `SAFE_ATTR_FIXTURES` pattern. Add a `PROMO_FORM_FIXTURES`-style check that:
- Seeds the three promo inputs with non-empty values and sets `localStorage.setItem('emailBuilder.module.promo','true')`.
- Calls `clearPromoFields()`.
- Asserts all three input `.value` are `''` AND `localStorage.getItem('emailBuilder.module.promo')` is still `'true'`.
Render a PASS/FAIL row exactly like the existing sections. Because the harness manipulates real DOM/localStorage, restore the localStorage key to its prior value after the assertion to avoid side effects on the live session.

## Hardest Decision

Where to clear field values without fighting the `createModuleToggle` persistence contract. The factory persists only its own `emailBuilder.module.<id>` key and never reads the inputs, so clearing the three inputs on load is fully orthogonal to the toggle — no need to fork or extend the factory. The chosen approach (`clearPromoFields()` called on init) keeps the deliberate "clear values, keep toggle" deviation localized and obvious.

## Rejected Alternatives

- **Persist field values like every other field** (the convention): rejected per the locked design decision — stale campaign metadata is worse than re-entry, since promo annotations are per-campaign.
- **A bespoke collapse implementation for the promo body**: rejected; the existing `.seg-body`/`.collapsed` max-height transition is already reused by CTA and costs nothing to reuse here.

## Lowest Confidence Area

Exact init ordering: `clearPromoFields()` must run after the inputs exist in the DOM and after `els` is populated. If the script wires the toggle (which calls `onChange` immediately, triggering `scheduleRender`) before the inputs are registered, `scheduleRender` is harmless here (no output change this slice), but verify the call order so `els.promoHeadline` etc. are defined before `clearPromoFields()` dereferences them.
