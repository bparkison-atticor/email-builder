---
id: TASK-018
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
  - criterion: "When promoToggle.isOn() AND the promo fields validate (headline + https image + https url present), buildMjml() emits a second <mj-raw> inside <mj-head> containing a <script type=\"application/ld+json\"> PromotionCard, placed AFTER the existing meta mj-raw and BEFORE <mj-style>."
    verification: "In-browser: toggle promo on, fill valid fields, Copy HTML / open the raw-HTML modal — the <head> contains exactly one <script type=\"application/ld+json\"> with \"@type\":\"PromotionCard\". Source-order: the new mj-raw sits between the meta mj-raw (~line 1503-1506) and <mj-style> (~line 1507)."
  - criterion: "The JSON-LD object contains @context 'http://schema.org/', @type 'PromotionCard', headline, image (the https image URL), url (the https destination URL); price (when present) is serialized as a JSON string, not a number."
    verification: "Inspect the emitted JSON-LD: JSON.parse succeeds; obj['@context']==='http://schema.org/'; obj['@type']==='PromotionCard'; typeof obj.price === 'string' when a price is provided. (Price is optional and only appears if a price field exists/has a value.)"
  - criterion: "When the toggle is OFF, buildMjml() emits NO JSON-LD mj-raw and the compiled output is byte-for-byte identical to the pre-feature output."
    verification: "In-browser: toggle off, Copy HTML — grep the copied HTML for 'application/ld+json' returns nothing. Diff against a known pre-feature output for the same template/body: identical."
  - criterion: "When the toggle is on but validation fails (e.g. missing headline), no JSON-LD is emitted (the toggle-on path also guards on validity), so the live preview never shows a partial/invalid PromotionCard."
    verification: "In-browser: toggle on, clear headline — the rendered preview's <head> contains no application/ld+json script."
  - criterion: "JSON serialization errors are routed through a named humanizer (humanizeTemplateError pattern) to the #warn banner, never shown as a raw exception."
    verification: "Forcing a serialization failure surfaces a plain-English #warn message via a named function (e.g. humanizePromoError); no raw 'TypeError'/'circular' text reaches the user. grep -n 'humanizePromoError' index.html returns a defined function."
  - criterion: "The PromotionCard JSON is HTML-safe inside <script> (no unescaped </script> sequence can break out)."
    verification: "Enter a headline containing the literal '</script>' — the emitted script block does not terminate early (the serializer escapes '<' or '/' so the </script> sequence cannot close the tag). JSON.parse of the block still succeeds."
depends_on: [TASK-016, TASK-017]
estimated_complexity: high
epic: gmail-promo-annotations
test_strategy:
  needed: true
  justification: "Serialization is the load-bearing output of the feature and has multiple correctness constraints (price-as-string, schema fields, </script> escaping, omit-when-off). A pure builder function is straightforward to fixture-test in the developer harness, and the humanizer follows the existing humanizeTemplateError test pattern."
  targets:
    - behavior: "buildPromoJsonLd({headline,imageUrl,url,price,priceCurrency}) returns a parseable script block with @context/@type/PromotionCard, price as a string, and a </script>-safe payload; returns '' for invalid/empty input."
      test_file: "index.html"
      type: unit
    - behavior: "humanizePromoError(message) returns a plain-English string for known serialization failure shapes and a safe fallback otherwise (mirrors HUMANIZE_FIXTURES coverage)."
      test_file: "index.html"
      type: unit
---

# PromotionCard JSON-LD Injection into buildMjml()

## Objective

Emit a PromotionCard JSON-LD `<script>` as a second `<mj-raw>` inside `<mj-head>` when the promo module is on and its fields validate. Serialize PromotionCard fields (`@context`, `@type`, `image`, `url`, optional `headline`, `price` as string, `priceCurrency`), place the block after the existing meta `mj-raw` and before `<mj-style>`, and omit it entirely when the toggle is off. Route any serialization failure through a named humanizer to `#warn`.

## Implementation Steps

1. **Add a pure builder** near `buildMjml` (~line 1476):
   ```js
   // Build the PromotionCard JSON-LD <script> for the Gmail Promotions tab.
   // Returns '' when promo is disabled or fields are invalid (caller need not
   // re-check). Reuses validatePromoFields() from TASK-017 so the build path
   // and the copy-validation path agree on what "valid" means.
   function buildPromoJsonLd() {
     if (!promoToggle.isOn()) return '';
     const headline = (els.promoHeadline.value || '').trim();
     const imageUrl = (els.promoImageUrl.value || '').trim();
     const url = (els.promoUrl.value || '').trim();
     const { missing, formatErrors } = validatePromoFields({ headline, imageUrl, url });
     if (missing.length || formatErrors.length) return '';
     const card = {
       '@context': 'http://schema.org/',
       '@type': 'PromotionCard',
       headline,
       image: imageUrl,
       url,
     };
     // price/priceCurrency are out-of-form for now (no price input in TASK-016);
     // if a price value is ever wired in, serialize price as a STRING:
     // card.price = String(priceValue); card.priceCurrency = currency;
     try {
       const json = JSON.stringify(card);
       // Escape '<' so a '</script>' inside any value cannot close the tag.
       const safe = json.replace(/</g, '\\u003c');
       return `<script type="application/ld+json">${safe}</script>`;
     } catch (e) {
       showWarn(humanizePromoError(e.message));
       return '';
     }
   }
   ```
   Note: TASK-016's form has headline/image/url only — `price` is optional and absent from the form, so it is omitted from the card object unless/until a price field is added. If you add price handling, it MUST be `String(...)` (Risk 5).

2. **Inject into the `mj-head`.** In the template literal returned by `buildMjml()` (~line 1501-1522), insert the builder output between the meta `mj-raw` (ends ~line 1506) and `<mj-style>` (~line 1507). Compute `const promoJsonLd = buildPromoJsonLd();` near the top of `buildMjml` and inline it as a new `<mj-raw>`:
   ```
   </mj-raw>
   ${promoJsonLd ? `<mj-raw>\n      ${promoJsonLd}\n    </mj-raw>\n    ` : ''}<mj-style>
   ```
   When `promoJsonLd === ''`, emit nothing (no empty `mj-raw`), guaranteeing byte-identical output when off.

3. **Add `humanizePromoError`** following the `humanizeTemplateError` pattern (~line 1683): a named function that pattern-matches known serialization failure shapes (e.g. `/circular/i` → 'Promo card: a field value could not be serialized — remove special objects from the promo fields.') and returns a safe fallback (`'Promo card: could not build the annotation — check the promo fields.'`) for unknown messages. Per CLAUDE.md, never surface the raw exception.

4. **Add test-harness fixtures** (see Test Strategy) for both `buildPromoJsonLd` and `humanizePromoError`.

## Acceptance Criteria

- Toggle on + valid fields ⇒ exactly one `application/ld+json` PromotionCard script in `<head>`, positioned after the meta `mj-raw` and before `mj-style`.
- JSON-LD has `@context` `http://schema.org/`, `@type` `PromotionCard`, `headline`, `image`, `url`; `price` (if ever present) is a string.
- Toggle off ⇒ no JSON-LD; output byte-identical to pre-feature.
- Toggle on + invalid ⇒ no JSON-LD emitted.
- Serialization errors humanized to `#warn`; no raw exceptions.
- A `</script>` inside a field value cannot break out of the script tag.

## Test Strategy

Add two harness sections in `renderTestHarness()`:
- **`PROMO_JSONLD_FIXTURES`** for `buildPromoJsonLd`-style checks. Because the real function reads live DOM + toggle, refactor the JSON assembly into a pure inner `serializePromoCard({headline,imageUrl,url,price})` that `buildPromoJsonLd` calls, and fixture-test that pure function: valid input ⇒ block whose extracted JSON `JSON.parse`s with the right `@type`/`@context`; headline containing `</script>` ⇒ block does not terminate early and still parses; price present ⇒ `typeof parsed.price === 'string'`.
- **`PROMO_HUMANIZE_FIXTURES`** for `humanizePromoError`, mirroring `HUMANIZE_FIXTURES`: a known shape (e.g. `'Converting circular structure to JSON'`) ⇒ expected substring; empty/unknown ⇒ safe fallback substring.
Render PASS/FAIL rows in the existing style.

## Hardest Decision

Guaranteeing byte-identical output when the toggle is off. Emitting an empty `<mj-raw></mj-raw>` would alter the compiled HTML and break the "off = unchanged" guarantee. The chosen approach makes `buildPromoJsonLd()` return `''` and conditionally emits the entire `<mj-raw>` wrapper only when non-empty, so the off-path template literal is identical to the pre-feature one.

## Rejected Alternatives

- **Inject the JSON-LD post-compile by string-splicing into `result.html`**: rejected — fragile, bypasses MJML's verbatim `mj-raw` passthrough (confirmed safe by the research, no `minify`), and risks malformed `<head>`.
- **Serialize `price` as a number**: rejected per Risk 5 — schema.org PromotionCard price is Text; Gmail expects a string.
- **Escape via `JSON.stringify` alone (no `<` replacement)**: rejected — `JSON.stringify` does not escape `<`, so a literal `</script>` in a value would close the tag. The `\\u003c` replacement is required and keeps the payload valid JSON.

## Lowest Confidence Area

MJML `mj-raw` whitespace/indentation handling: the research confirms `mj-raw` content is preserved verbatim (no `minify`), so the script should pass through intact, but verify in-browser via the raw-HTML modal that the emitted `<head>` contains a well-formed, parseable `application/ld+json` block and that MJML did not re-indent or HTML-escape the `<` sequence in a way that breaks `JSON.parse`.
