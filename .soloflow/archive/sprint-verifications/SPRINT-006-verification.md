---
sprint: SPRINT-006
visual_mobile: not_applicable
visual_web:    not_applicable
regressions_count: 0
flows_tested: 0
flows_deferred: 1
---

# Sprint Verification — SPRINT-006 (gmail-promo-annotations / IDEA-004)

Base SHA: 1fc16940c5b40857706737860a4d2fa565bc768a
HEAD:     5279ff549820fa1d19b0533f0a3c1621468475b8
Combined diff: `git diff 1fc1694 HEAD -- index.html` (+459 / -1).

Single-file browser app; no headless test runner. Verification = node-exercised
pure functions extracted/eval'd from the real `index.html` source + static
cross-task analysis of the combined diff. Visual verification N/A (Lite).

## Integration Tests

### Pure-function suite (node, eval'd from index.html HEAD source)
24/24 assertions PASS across the four pure helpers run together:
- `isHttpsUrl` — https/HTTPS-case/http/leading-trim/non-string (5/5)
- `validatePromoFields` — valid, empty-headline, http-image→formatError-not-missing,
  all-empty, empty-field-not-https-flagged (5/5)
- `serializePromoCard` — no-price omits key, price=0 serialised as string "0",
  priceCurrency included, price="" omitted, numeric→string, and the
  security-critical injection test: a `</script><script>…` headline yields
  ZERO raw `<` (code 60) in the JSON body — every `<` escaped to the 6-char
  `<` sequence, so no value can close the tag (6/6)
- `humanizePromoError` — circular→serialise msg, generic, empty, never leaks raw
  exception text (4/4)
- Gating coherence — `buildPromoJsonLd` off-path simulation returns '' for
  toggle-off, http-invalid, and missing-field inputs; non-empty `<script` block
  only when valid (4/4)

### Combined module script parse-check
`vm.Script` compile of the single `<script type="module">` block (CDN imports
stripped) → PARSE OK, no syntax errors across the 4 commits.

### Six cross-task integration concerns

1. End-to-end gating coherence — PASS. Copy path (runCopyAction ~L2744) and
   JSON-LD build path (buildPromoJsonLd ~L1642) both gate on `promoToggle.isOn()`
   and both call the identical `validatePromoFields({headline,imageUrl,url})`,
   treating `missing.length || formatErrors.length` as the block/suppress
   condition. What blocks copy is exactly what suppresses JSON-LD. No divergence.

2. Byte-identical when OFF (cumulative) — PASS. The entire sprint touches the
   buildMjml output template in exactly ONE line: `<mj-style>` →
   `${promoJsonLd ? `<mj-raw>…</mj-raw>\n    ` : ''}<mj-style>`. With the toggle
   off `buildPromoJsonLd()` returns '' (L1643), so the ternary collapses to ''
   and the line is the literal `    <mj-style>` — proven byte-identical to base
   via node string comparison. No other unconditional change to the output
   string. `humanizeTemplateError`/`buildMjml` otherwise untouched.

3. No regression to existing validation / harness — PASS. Whole sprint = 1
   deleted line (the mj-style relocation above). Existing CTA/phone/preheader/
   meta validation in runCopyAction unchanged. Harness Sections 1 & 2
   (humanizeTemplateError L1936, safeAttrHtml L1958) unchanged; Sections 3-6
   (L1981-2218) are appended-only.

4. els registration / module-scope promoToggle / init ordering — PASS. New
   `els` entries (promoHeadline/promoImageUrl/promoUrl/promoBody) follow the
   existing pattern. `promoToggle` declared at L2608 (mirrors ctaToggle L2599).
   Top-level executable calls `clearPromoFields()` (L2885) and `render()`
   (L2886) run after all declarations; render→buildMjml→buildPromoJsonLd reads
   promoToggle which is already defined. No TDZ / undefined ref at load.

5. humanizeTemplateError + render try/catch — PASS. humanizeTemplateError not
   referenced by any diff hunk (untouched). render() additions (UTM advisory
   L2466-2471) are inside the existing try, appended to the `warnings[]` array,
   gated on promoToggle.isOn(); non-blocking. humanizePromoError is additive.

6. Pure functions under node — PASS (see suite above).

## Regressions requiring attention

None. No cross-task regressions detected.

## Deferred (carried forward, NOT re-verified here)

- MJML mj-raw JSON-LD passthrough round-trip: requires an in-browser check that
  the conditional second `<mj-raw>` survives mjml2html compilation into the
  SendGrid output `<head>` intact. Cannot be exercised headlessly. Deferred.

## Known non-blocking findings (noted, not re-litigated)

- FIND-SPRINT-006-1: only the first promo format error surfaces (formatErrors[0]).
- FIND-SPRINT-006-2: humanizePromoError's showWarn (inside buildMjml) is
  clobbered by render's later `showWarn(warnings.join(' · '))` (L2472).
