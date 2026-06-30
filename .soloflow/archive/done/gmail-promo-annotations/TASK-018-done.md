---
id: TASK-018
sprint: SPRINT-006
epic: gmail-promo-annotations
status: done
summary: "Inject PromotionCard JSON-LD into buildMjml() mj-head: pure serializePromoCard() with </script> escaping (\\u003c) and price-as-string, gated buildPromoJsonLd() reusing validatePromoFields, humanizePromoError() per CLAUDE.md, byte-identical output when toggle off."
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-018 — PromotionCard JSON-LD Injection into buildMjml()

## Outcome
Emits a PromotionCard JSON-LD `<script>` as a second `<mj-raw>` in `<mj-head>` when the promo module is on and fields validate. Implemented commit `a607872`; test-writer added 2 fixtures in `4699728`. Branch `soloflow/run-20260630-103037-SPRINT-006`.

## Changes (index.html)
- Pure `serializePromoCard({headline,imageUrl,url,price?,priceCurrency?})`: assembles `@context 'http://schema.org/'` / `@type 'PromotionCard'` / headline / image / url, serializes price as a String when present, escapes `<` → `<` so a literal `</script>` in a value cannot break out, returns the `<script type="application/ld+json">` block.
- `buildPromoJsonLd()`: gates on `promoToggle.isOn()` + `validatePromoFields()` (returns '' on missing/format errors), try/catches serialization and routes failures through `humanizePromoError()` to `showWarn`.
- `humanizePromoError()`: named humanizer per CLAUDE.md — matches `/circular/i`, safe plain-English fallback, never echoes raw exception text.
- `buildMjml()`: conditionally injects the second `<mj-raw>` between the meta `mj-raw` and `<mj-style>`; emits nothing when empty so toggle-off output is byte-identical.
- Test harness: Section 5 (`serializePromoCard`, 6 fixtures incl. </script> breakout, price-as-string, price=0, priceCurrency) and Section 6 (`humanizePromoError`, 3 fixtures).

## Verification
- Verifier verdict: APPROVED_WITH_DEFERRED. Node-based checks (functions extracted verbatim) proved: byte-identical-when-off (off-branch region `===` parent commit), `</script>` breakout safety (exactly one literal `</script>` survives an injected payload; JSON.parse succeeds), price-as-string incl. price=0 → '0', and humanizer never leaks raw text. AC#1 source-confirmed (injection between meta mj-raw and mj-style).
- Code review: CLEAN — XSS-safe escaping independently corroborated; humanizer satisfies the binding CLAUDE.md convention; faithful reuse of validatePromoFields, escapeHtml, humanizeTemplateError pattern, and the harness fixture pattern.
- Tests: TESTS_WRITTEN — pure serializePromoCard/humanizePromoError fully fixtured (8 + 3 cases). No CLI runner; in-browser harness only.

## Deferred / known findings (queued, non-blocking)
- DEFERRED (testing, medium): in the running app, toggle promo on with valid fields, Copy HTML / open the raw-HTML modal, and confirm the compiled `<head>` contains exactly one parseable `application/ld+json` PromotionCard — i.e. MJML passed the `mj-raw` through verbatim without re-indenting or HTML-escaping `<`. Cannot be tested headlessly (MJML is CDN-only). In `.soloflow/human-review-queue.md`.
- FIND-SPRINT-006-2 (minor): `buildPromoJsonLd`'s `catch` → `showWarn` is later clobbered by `render()`'s unconditional `showWarn(warnings.join(' · '))`, so the humanized promo error is unreachable at the live call site. Latent only (serializePromoCard receives trimmed strings; JSON.stringify of plain strings cannot throw today). Fix touches `render()` (outside this diff). Queued for /sf:compound.
