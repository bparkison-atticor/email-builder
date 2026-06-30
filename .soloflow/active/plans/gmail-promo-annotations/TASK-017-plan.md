---
id: TASK-017
idea: IDEA-004
status: approved
created: 2026-06-30T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CLAUDE.md
  - CODE-PATTERNS.md
acceptance_criteria:
  - criterion: "When promoToggle.isOn() is true, runCopyAction() blocks copy if promo headline, promo image URL, or destination URL is empty, accumulating each into the missing[] list and calling markInvalid on the offending input."
    verification: "In-browser: toggle promo on, leave headline empty, click Copy HTML — copy is blocked, copyError shows a message containing 'promo headline', and #promoHeadline gets the .invalid class. Repeat for empty image URL and empty destination URL."
  - criterion: "When promoToggle.isOn() is true, runCopyAction() blocks copy if the image URL or destination URL does not start with 'https://', surfacing a format error and marking the field invalid."
    verification: "In-browser: toggle promo on, fill headline, set image URL to 'http://x/p.png' — copy blocked with an https format message and #promoImageUrl marked invalid. Same for a non-https destination URL."
  - criterion: "When promoToggle.isOn() is false, none of the promo fields are validated and copy proceeds exactly as before this task."
    verification: "In-browser: toggle promo off, leave all promo fields empty, click Copy HTML with valid body — copy succeeds; no promo-related error appears."
  - criterion: "A non-blocking #warn advisory recommends embedding UTM params in the destination URL when promo is on and the destination URL lacks a utm_ parameter."
    verification: "In-browser: toggle promo on with a valid https destination URL containing no 'utm_' substring — the #warn banner includes a UTM advisory. With utm_source present, the advisory does not appear."
  - criterion: "Promo fields clear their .invalid state on input, matching the ctaText/ctaDestination pattern."
    verification: "In-browser: trigger a promo validation error, then type in the field — the red invalid styling clears immediately. grep -n shows input listeners removing .invalid for promoHeadline/promoImageUrl/promoUrl."
depends_on: [TASK-016]
estimated_complexity: medium
epic: gmail-promo-annotations
test_strategy:
  needed: true
  justification: "The validation predicates (required + https-prefix checks, gated on toggle state) are pure functions that are cheap to fixture-test and high-value to lock, since they directly gate the blocking copy path. Tested via a new section in the developer test harness."
  targets:
    - behavior: "validatePromoFields({headline,imageUrl,url}) returns the correct missing[] / format-error set for: all valid; each field empty; non-https image; non-https url."
      test_file: "index.html"
      type: unit
---

# Promo Field Validation (blocking + non-blocking)

## Objective

Gate copy-time validation on `promoToggle.isOn()`. When the promo module is on, require a headline, an `https://` image URL, and an `https://` destination URL via the existing blocking `markInvalid`/`showCopyError` path in `runCopyAction()`. Add a non-blocking `#warn` advisory to embed UTM params in the destination URL (Gmail does not click-track it). No date validation — PromotionCard has no dates.

## Implementation Steps

1. **Add a pure validation helper** near `isValidPhone` (~line 2229):
   ```js
   function isHttpsUrl(value) {
     return typeof value === 'string' && /^https:\/\//i.test(value.trim());
   }
   // Returns { missing: string[], formatErrors: string[] } — pure, testable.
   function validatePromoFields({ headline, imageUrl, url }) {
     const missing = [];
     const formatErrors = [];
     if (!headline || !headline.trim()) missing.push('promo headline');
     if (!imageUrl || !imageUrl.trim()) missing.push('promo image URL');
     else if (!isHttpsUrl(imageUrl)) formatErrors.push('promo image URL must start with https://');
     if (!url || !url.trim()) missing.push('promo destination URL');
     else if (!isHttpsUrl(url)) formatErrors.push('promo destination URL must start with https://');
     return { missing, formatErrors };
   }
   ```

2. **Integrate into `runCopyAction()`** (~line 2290), after the CTA block and before the `if (missing.length)` check (~line 2318). Read values from `els.promoHeadline/promoImageUrl/promoUrl`. When `promoToggle.isOn()`:
   - Push each `validatePromoFields(...).missing` entry into the existing `missing[]` array, and `markInvalid()` the corresponding input (map `'promo headline'`→`els.promoHeadline`, etc.).
   - For each `formatErrors` entry, `markInvalid()` the relevant input and set a local `promoFormatError` flag + capture the first format message. Surface it via `showCopyError(...)` using the same early-return pattern as `phoneFormatError` (~line 2322). Keep the existing `missing.length` check first so required-field messages take precedence.

3. **Add the non-blocking UTM advisory.** This is a `#warn` surface, so it belongs in `render()`'s warning aggregation (~line 2079-2092), NOT in `runCopyAction` (which only runs on copy). When `promoToggle.isOn()` and `els.promoUrl.value` is a non-empty https URL that does not contain `'utm_'`, push `'Promo card URL has no UTM params — Gmail does not click-track it, so add utm_source/utm_medium for attribution.'` into the `warnings[]` array before `showWarn(warnings.join(' · '))`.

4. **Clear invalid-on-input.** Near the ctaText/ctaDestination input listeners (~line 2251-2258), add `input` listeners on `els.promoHeadline`, `els.promoImageUrl`, `els.promoUrl` that remove `.invalid` and `invalidEls.delete(el)`.

5. **Add test-harness fixtures** (see Test Strategy).

## Acceptance Criteria

- Promo fields are validated (blocking) only when the toggle is on: headline required, image URL required + https, destination URL required + https.
- Toggle off ⇒ promo fields never block copy.
- Non-blocking `#warn` UTM advisory appears when the destination URL lacks `utm_`.
- Promo fields clear `.invalid` on input.

## Test Strategy

Add a `PROMO_VALIDATION_FIXTURES` section to `renderTestHarness()` exercising `validatePromoFields`:
- All-valid (https image + https url + headline) ⇒ `missing` empty, `formatErrors` empty.
- Empty headline ⇒ `missing` includes `'promo headline'`.
- `http://` image ⇒ `formatErrors` includes the https image message; `missing` does not include image URL.
- `http://` url ⇒ `formatErrors` includes the https url message.
- Empty image URL ⇒ `missing` includes `'promo image URL'` and `formatErrors` has no image entry (empty takes precedence).
Render PASS/FAIL rows in the same style as the existing harness sections.

## Hardest Decision

Where the UTM advisory lives. It is non-blocking, so putting it in `runCopyAction` (copy-time only) would mean the marketer sees it only on copy, inconsistent with how other `#warn` hints surface live during editing. Routing it through `render()`'s `warnings[]` aggregation makes it appear as soon as the URL is entered, matching the existing banner-warning UX, and keeps `runCopyAction` strictly about blocking validation.

## Rejected Alternatives

- **Validate via HTML5 `type="url"` / `pattern` attributes**: rejected — it would not gate on the toggle, would not integrate with the `missing[]` accumulation + shake feedback, and `type=url` accepts `http://`.
- **Block copy on missing UTM params**: rejected — UTM is advisory per the research (Risk 4); making it blocking would frustrate legitimate URLs that intentionally omit UTM.

## Lowest Confidence Area

Message-ordering interaction with the existing CTA validation: confirm that when both a CTA field and a promo field are missing, the combined `Add X and Y` message reads sensibly and that the `phoneFormatError`/`promoFormatError` early returns don't mask a still-pending required-field message. The required-field `missing.length` check must run before any format-error return.
