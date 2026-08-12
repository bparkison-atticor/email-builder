---
sprints: [SPRINT-006, SPRINT-007]
span_label: SPRINT-006-007
created: 2026-08-12T00:00:00Z
counters_start:
  ideas: 7
summary:
  cleanups: 13
  backlog_tasks: 4
  claude_md: 3
  soloflow_improvements: 0
---

# Compound Proposal — SPRINT-006-007

## A. Clean-up items (execute now)

### A1. Mark every offending promo field invalid on a format error, not just the first
- **Summary:** When both the promo image URL and destination URL fail the https check at the same time, only the first is highlighted red — fix it so both are marked immediately, mirroring the existing required-field loop.
- **Source-Sprint:** SPRINT-006
- **Rationale:** `missing[]` already loops and marks every missing required field; `formatErrors` only marks the first offending field, so a marketer who breaks both URLs has to fix one, resubmit, and discover the second. Small inconsistency in an otherwise consistent pattern.
- **Blast radius:** `index.html`, one function (`runCopyAction`), risk: trivial.
- **Source:** FIND-SPRINT-006-1 (TASK-017 verifier, index.html:2516 at time of finding, now index.html:3695-3704)
- **Proposed change:**
  ```diff
      if (promoResult.formatErrors.length) {
        promoFormatError = true;
        promoFormatMessage = promoResult.formatErrors[0];
  -     // Mark the relevant input invalid.
  -     if (promoResult.formatErrors[0].startsWith('promo image URL')) {
  -       markInvalid(els.promoImageUrl);
  -     } else {
  -       markInvalid(els.promoUrl);
  -     }
  +     // Mark every offending field invalid, even though only the first
  +     // message is shown — mirrors the missing[] loop above.
  +     for (const err of promoResult.formatErrors) {
  +       if (err.startsWith('promo image URL')) markInvalid(els.promoImageUrl);
  +       else markInvalid(els.promoUrl);
  +     }
      }
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Verified at `index.html:3691-3704` — the `missing[]` loop directly above marks every offending field while `formatErrors` marks only the first, and harness fixture `'Both URLs http:// — two independent formatErrors entries'` (`index.html:2144-2147`) proves the two-error state is reachable in production.

### A2. Stop render() from clobbering buildPromoJsonLd's humanized error
- **Summary:** The promo JSON-LD serializer's humanized error is currently unreachable because `render()` overwrites it with its own warning join right after — stage it in a module variable and fold it into that same join instead.
- **Source-Sprint:** SPRINT-006
- **Rationale:** `buildPromoJsonLd()`'s catch calls `showWarn(...)` directly, but `render()` calls `showWarn(warnings.join(' · '))` unconditionally right after `buildMjml()` runs (which is where `buildPromoJsonLd` executes) — so the promo error is always overwritten before the marketer sees it. Latent today (inputs are trimmed strings; `JSON.stringify` on plain strings cannot throw) but becomes live the moment a non-string field (e.g. a price object) is wired in. The fix mirrors the existing `darkModeError` staging pattern already used in the same function.
- **Blast radius:** `index.html`, three locations (module-scope declaration, `buildPromoJsonLd`, `render`), risk: low.
- **Source:** FIND-SPRINT-006-2 (TASK-018 code-reviewer, index.html ~1622/~2432 at time of finding, now index.html:1663 / 1703-1716 / 3360)
- **Proposed change:**
  ```diff
   let lastHtml = '';
  +let promoJsonError = ''; // staged by buildPromoJsonLd's catch; folded into render()'s warnings
  ```
  ```diff
   function buildPromoJsonLd() {
  +  promoJsonError = '';
     if (!promoToggle.isOn()) return '';
     const headline = (els.promoHeadline.value || '').trim();
     const imageUrl = (els.promoImageUrl.value || '').trim();
     const url = (els.promoUrl.value || '').trim();
     const { missing, formatErrors } = validatePromoFields({ headline, imageUrl, url });
     if (missing.length || formatErrors.length) return '';
     try {
       return serializePromoCard({ headline, imageUrl, url });
     } catch (e) {
  -    showWarn(humanizePromoError(e.message));
  +    // Staged here instead of calling showWarn directly — render()'s
  +    // unconditional showWarn(warnings.join(' · ')) runs right after
  +    // buildMjml() and would otherwise clobber this message.
  +    promoJsonError = humanizePromoError(e.message);
       return '';
     }
   }
  ```
  ```diff
       if (darkModeError) warnings.push(darkModeError);
  +    if (promoJsonError) warnings.push(promoJsonError);
       if (promoToggle.isOn()) {
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** `render()`'s unconditional `showWarn(warnings.join(' · '))` at `index.html:3367` provably overwrites the catch's `showWarn` at `index.html:1713`, and CODE-PATTERNS.md:75 already documents the module-scope staging convention (`templateError` 1751, `darkModeError` 1760) that this fix brings the promo error into compliance with.

### A3. Strip the unreachable promo price/priceCurrency code path
- **Summary:** Remove `serializePromoCard`'s unused `price`/`priceCurrency` parameters and the four test-harness fixtures that only exercise them, since no UI field feeds them and the only production caller never passes them.
- **Source-Sprint:** SPRINT-006
- **Rationale:** No promo price input exists in the form, and `buildPromoJsonLd()` — the only production caller — invokes `serializePromoCard({ headline, imageUrl, url })` with no price argument. The price branch and 4 of 6 Section-5 harness fixtures test behavior the running app can never reach, and an untested-against-UI branch is exactly the kind of surface that invited the dead-catch trap in A2. The alternative (wire an actual `#promoPrice` input) is a real feature and belongs in a future backlog task, not this clean-up.
- **Blast radius:** `index.html`, two locations (`serializePromoCard` + `PROMO_JSONLD_FIXTURES`), risk: low (removes untested/unreachable surface).
- **Source:** FIND-SPRINT-006-3 (sprint-code-reviewer, index.html:1611 at time of finding, now index.html:1667-1687 and 2208-2259)
- **Proposed change:**
  ```diff
   // Pure: assembles a PromotionCard JSON-LD object, serialises it, escapes '<'
   // as < so a literal <\/script> in any field value cannot close the tag,
   // and returns the full <script type="application/ld+json">…<\/script> block.
  -// price, when provided, is serialised as a STRING per the schema.org spec.
  +// No price/priceCurrency support — no UI input collects a price today;
  +// add it back (serialised as a STRING per the schema.org spec) if/when a
  +// promo price field is actually wired up.
   // Exported-like (module-scope) so the test harness can call it directly.
  -function serializePromoCard({ headline, imageUrl, url, price, priceCurrency }) {
  +function serializePromoCard({ headline, imageUrl, url }) {
     const card = {
       '@context': 'http://schema.org/',
       '@type': 'PromotionCard',
       headline,
       image: imageUrl,
       url,
     };
  -  if (price !== undefined && price !== null && price !== '') {
  -    card.price = String(price);
  -    if (priceCurrency) card.priceCurrency = priceCurrency;
  -  }
     // Escape '<' so no value can inject '<\/script>' and break out of the tag.
     const json = JSON.stringify(card, null, 2).replace(/</g, '\\u003c');
     return `<script type="application/ld+json">\n${json}\n<\/script>`;
   }
  ```
  Also remove the four price-only fixtures from `PROMO_JSONLD_FIXTURES` (index.html:2208-2259): `'price present: typeof parsed.price === "string"'`, `'price absent: no price key in output'`, `'price=0 (falsy but present): serialized as string "0", not dropped'`, and `'priceCurrency present in output when price and priceCurrency provided'`. Keep the two remaining fixtures (`'Valid input...'` and `'Headline containing </script>...'`) unchanged.

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** `price`/`priceCurrency` are not accidental dead code — `.soloflow/archive/done/gmail-promo-annotations/EPIC-gmail-promo-annotations.md:18` scopes them explicitly, and the four fixtures lock the price-as-string silent-failure risk documented at `.soloflow/archive/ideas/IDEA-004-research.md:223`, so deleting them discards research-backed knowledge to remove ~25 lines of a pure function that costs nothing at runtime.
- **Counterfactual:** if the promo module is declared frozen (no future price / properties slot), the harness noise removed would outweigh the knowledge lost.

### A4. De-duplicate the Gmail no-click-tracking / UTM copy
- **Summary:** Remove the ops-docs bullet restating the "Gmail doesn't click-track" note, since the field hint right above it and the render-time advisory already say the same thing.
- **Source-Sprint:** SPRINT-006
- **Rationale:** The same guidance appears three times: the destination-URL field hint (index.html:630, adjacent), the ops-docs `<li>` (index.html:640, statically co-visible with the hint in the same expanded card), and the conditional render-time advisory (index.html:3364, the only one that's actionable/live). Keep the two non-redundant ones.
- **Blast radius:** `index.html`, one `<li>` removed, risk: trivial.
- **Source:** FIND-SPRINT-006-4 (sprint-code-reviewer, index.html:600/613/2466 at time of finding, now index.html:630/640/3364)
- **Proposed change:**
  ```diff
       <li>Annotations are cached per sender; changes may take time to appear.</li>
  -    <li>Gmail does not click-track the card URL — add UTM params in the Destination URL above.</li>
       <li>Test rendering with Google's
  ```

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The `<li>` at `index.html:640` is an explicitly-scoped item of the epic's ops-doc surface ("UTM-in-url note", `EPIC-gmail-promo-annotations.md:18`), and the duplication is cosmetic — a self-contained "Before Gmail will show this card" checklist loses more by having a hole in it than by repeating the adjacent field hint.
- **Counterfactual:** if the ops-doc block is ever restructured into non-checklist prose, the redundancy stops paying for itself.

### A5. Harden and self-retire the test-data localStorage migration shim
- **Summary:** Wrap the one-time test-data key migration in a try/catch so a storage write failure degrades gracefully instead of blanking the whole app, and delete the legacy key once copied so the shim can't resurrect a stale preference later.
- **Source-Sprint:** SPRINT-007
- **Rationale:** The shim's unguarded `localStorage.setItem` runs at module-init time; per FIND-SPRINT-007-1, headless-Chrome fault injection confirmed that if `setItem` throws (quota exceeded, storage-write-blocked profile, an extension stubbing `Storage.prototype.setItem`), the exception aborts the rest of module init — no preview render, no toggles, no copy wiring. Per FIND-SPRINT-007-2, the shim also never deletes the legacy key, so if a user later clears only the new key, the old preference silently resurrects.
- **Blast radius:** `index.html`, one block (the TASK-014 migration shim), risk: low.
- **Source:** FIND-SPRINT-007-1, FIND-SPRINT-007-2 (TASK-014 verifier, index.html:2598-2603 at time of finding, now index.html:3403-3406)
- **Proposed change:**
  ```diff
  -if (localStorage.getItem('emailBuilder.module.testData') === null) {
  -  const legacy = localStorage.getItem('emailBuilder.testDataEnabled');
  -  if (legacy !== null) localStorage.setItem('emailBuilder.module.testData', legacy);
  -}
  +try {
  +  if (localStorage.getItem('emailBuilder.module.testData') === null) {
  +    const legacy = localStorage.getItem('emailBuilder.testDataEnabled');
  +    if (legacy !== null) {
  +      localStorage.setItem('emailBuilder.module.testData', legacy);
  +      localStorage.removeItem('emailBuilder.testDataEnabled');
  +    }
  +  }
  +} catch {
  +  // Storage write blocked (quota exceeded, hardened profile, extension
  +  // stub) — degrade to createModuleToggle's own defaultOn value instead
  +  // of aborting the rest of module init.
  +}
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** `index.html:3405` is the only `localStorage.setItem` on the module-init path (3325 and 3497 both sit inside event handlers), so a throw there aborts the rest of module init on the one-time migration path every pre-existing user takes, and the fix adds a try/catch plus one `removeItem` with no new abstraction.

### A6. Fix the stale "switch" CSS section banner
- **Summary:** Update the CSS comment banner that still names a `.switch` class TASK-014 deleted — it now describes the module-toggle-based header controls.
- **Source-Sprint:** SPRINT-007
- **Rationale:** TASK-014 removed the last `class="switch"` element and its CSS halves, but left the section banner four lines above referencing `switch`. A reader who greps for `.switch` after reading the banner finds nothing.
- **Blast radius:** `index.html`, one comment line, risk: trivial.
- **Source:** FIND-SPRINT-007-4 (TASK-014 code-reviewer, index.html:364 at time of finding, now index.html:375)
- **Proposed change:**
  ```diff
  -  /* ---------- Top bar: divider, switch, toolbar buttons ---------- */
  +  /* ---------- Top bar: divider, module toggle, toolbar buttons ---------- */
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Grep confirms `switch` survives in `index.html` only as the banner at line 375 and unrelated matches (`switch (max)`, `role="switch"`) — no `.switch` CSS rule or `class="switch"` element remains, so the banner points a reader at nothing.

### A7. Keep dark-client picker labels on one line
- **Summary:** Add `white-space: nowrap` to the client-picker buttons so "Apple Mail" stops wrapping onto two lines and growing taller than its siblings at narrower viewports.
- **Source-Sprint:** SPRINT-007
- **Rationale:** Measured with CDP device-metrics emulation: at 1280px and below, `.preview-header-left` wraps and only the "Apple Mail" label breaks, making that button ~56px tall against a uniform 34px for its siblings. Nothing overflows or clips — purely cosmetic — but the uneven heights read as unintended.
- **Blast radius:** `index.html`, one CSS declaration, risk: trivial.
- **Source:** FIND-SPRINT-007-6 (TASK-021 verifier, index.html:2853 at time of finding, now index.html:327-342)
- **Proposed change:**
  ```diff
   .seg-control button {
     flex: 1;
     background: transparent;
     border: none;
     font-size: 12px;
     font-weight: 500;
     padding: 7px 10px;
     border-radius: 4px;
     cursor: pointer;
     color: var(--muted);
     display: inline-flex;
     align-items: center;
     justify-content: center;
     gap: 6px;
     transition: background-color 0.15s, color 0.15s;
  +  white-space: nowrap;
   }
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** `.seg-control button` (`index.html:327-342`) carries no `white-space`, and the other three `.seg-control` groups (`index.html:669`, `722`, `793`) use single-word labels only, so the declaration is inert everywhere except the two-word "Apple Mail" it fixes — blast radius really is the one line claimed.

### A8. Anchor remapInlineColors's regexes to an attribute-name boundary
- **Summary:** Tighten the two color-remap regexes so they only match real `style=`/`bgcolor=` attributes instead of also matching lookalikes like `data-style=` or `xstyle=`, and narrow the comment's overstated guarantee to match.
- **Source-Sprint:** SPRINT-007
- **Rationale:** Neither regex is anchored to an attribute-name boundary. Verified in Node: `<td data-style="color:#333333">`, `<td xstyle="color:#333333">`, and `<td data-bgcolor="#ffffff">` are all incorrectly rewritten by the current patterns. Inert today (mjml-browser emits no such attribute names) but the function's own comment claims a guarantee ("every other attribute... is untouched") that only half holds, which would mislead a future maintainer extending this pass.
- **Blast radius:** `index.html`, one function (`remapInlineColors`) + its header comment, risk: low (verified against all existing harness fixtures, which all have `style=`/`bgcolor=` preceded by whitespace).
- **Source:** FIND-SPRINT-007-11 (TASK-022 code-reviewer, index.html:3070/3073 at time of finding, now index.html:3122-3150)
- **Proposed change:**
  ```diff
   // remapInlineColors(html) — the markup pass. Rewrites `style="..."`
  -// attribute contents and `bgcolor="..."`/`bgcolor='...'` attribute
  -// values; every other attribute (including href) is untouched because
  -// neither regex can match outside those two attribute shapes.
  +// attribute contents and `bgcolor="..."`/`bgcolor='...'` attribute
  +// values. Both regexes require a preceding whitespace/quote character
  +// before the attribute name, so lookalike attribute names (data-style,
  +// xstyle, data-bgcolor) are not matched; href is untouched because
  +// neither regex can cross a `"` boundary.
   ...
   function remapInlineColors(html) {
     // style="..." — DOUBLE-QUOTE ONLY, deliberately. MJML emits
     // font-family:'Helvetica Neue',... inside style attributes; a pattern
     // that also stopped at ' would truncate mid-value and corrupt the
     // markup. [^"]* cannot escape the attribute, the same boundary
     // guarantee safeAttrHtml relies on. Function replacer throughout so a
     // remapped value's `$` sequences are never treated as substitution
     // patterns.
  -  let out = html.replace(/style="([^"]*)"/gi, (match, decl) => 'style="' + remapDeclarations(decl) + '"');
  +  let out = html.replace(/([\s"'])style="([^"]*)"/gi, (match, pre, decl) => pre + 'style="' + remapDeclarations(decl) + '"');
     // bgcolor="..." / bgcolor='...' — both quote styles are safe here
     // since a color value never contains a quote.
  -  out = out.replace(/bgcolor=(["'])([^"']*)\1/gi, (match, quote, value) => 'bgcolor=' + quote + remapBackgroundValue(value, false) + quote);
  +  out = out.replace(/([\s"'])bgcolor=(["'])([^"']*)\2/gi, (match, pre, quote, value) => pre + 'bgcolor=' + quote + remapBackgroundValue(value, false) + quote);
     return out;
   }
  ```

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** No lookalike attribute name can reach this pass — the only `data-*` attribute the pipeline emits into compiled HTML is `data-autolinked` (`index.html:1437`), and every user value is escaped before reaching `buildMjml()` — so the regex rewrite is preemptive hardening of the dark-mode hot path; only the overstated comment at `index.html:3124-3125` is a live defect.
- **Counterfactual:** if `remapInlineColors` is ever pointed at markup the app does not generate (pasted HTML, a third-party template), the attribute-name anchoring becomes load-bearing.

### A9. Interpolate OUTLOOK_DARK_SURFACE instead of restating it as a literal
- **Summary:** Have `outlookDarkTransform`'s canvas rule build from the `OUTLOOK_DARK_SURFACE` constant instead of hardcoding the same hex value a second time.
- **Source-Sprint:** SPRINT-007
- **Rationale:** `OUTLOOK_DARK_SURFACE = '#1b1b1b'` is the value every contrast decision in `remapForegroundValue`/`liftForContrast` is measured against, but `outlookDarkTransform` re-states `'#1b1b1b'` as a bare literal in its injected CSS. They agree today, but if `OUTLOOK_DARK_SURFACE` is ever retuned, the canvas paint would silently drift from the contrast target with no test/type/lint signal. `injectPreviewStyle` already neutralizes `</style` in its `css` argument (TASK-022), so interpolating the constant here is safe.
- **Blast radius:** `index.html`, one line, risk: trivial.
- **Source:** FIND-SPRINT-007-12 (TASK-022 code-reviewer, index.html:3089 vs 2987 at time of finding, now index.html:3161-3167 vs 3062)
- **Proposed change:**
  ```diff
   function outlookDarkTransform(html) {
     const css = [
       '/* EB-DARKSIM outlook — preview only, never present in copied HTML */',
  -    'html { background-color: #1b1b1b !important; }',
  +    'html { background-color: ' + OUTLOOK_DARK_SURFACE + ' !important; }',
     ].join('\n');
     return injectPreviewStyle(remapInlineColors(html), css);
   }
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** `OUTLOOK_DARK_SURFACE = '#1b1b1b'` (`index.html:3062`) is restated as a bare literal 100 lines later at `index.html:3164` with nothing tying them together, and the fix is a single interpolation into a string the helper at `index.html:2811` already sanitizes.

### A10. Remove the dead `'bgcolor'` member from BACKGROUND_COLOR_PROPS
- **Summary:** Drop `'bgcolor'` from the style-declaration property list since it's not a real CSS property and is never reached through that path — the actual `bgcolor` HTML attribute is already handled separately.
- **Source-Sprint:** SPRINT-007
- **Rationale:** `BACKGROUND_COLOR_PROPS` is only consulted by `remapDeclarations`, which only parses `style="..."` contents; `bgcolor:` is not a valid CSS property there. The real `bgcolor` attribute path in `remapInlineColors` calls `remapBackgroundValue` directly and never consults this array. As shipped, the member implies style-attribute `bgcolor:` declarations are a supported input, which they are not.
- **Blast radius:** `index.html`, one array literal, risk: trivial.
- **Source:** FIND-SPRINT-007-13 (TASK-022 code-reviewer, index.html:2989 at time of finding, now index.html:3064)
- **Proposed change:**
  ```diff
  -const BACKGROUND_COLOR_PROPS = ['background-color', 'bgcolor'];
  +// 'bgcolor' is deliberately excluded — it is not a valid style-attribute
  +// property (only a real HTML attribute), which remapInlineColors handles
  +// separately via its own bgcolor= regex.
  +const BACKGROUND_COLOR_PROPS = ['background-color'];
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** `BACKGROUND_COLOR_PROPS` has exactly one consumer (`index.html:3113`, inside `remapDeclarations`, which parses only `style="…"` contents) and no harness fixture feeds a `bgcolor:` declaration — the only `bgcolor` fixture (`index.html:2503-2510`) exercises the separate attribute regex — so the member is provably dead and the blast radius is the one array literal claimed.

### A11. Fix detectAuthorDarkScheme's contract comment to match its own branches
- **Summary:** Correct the function comment that currently claims the CSS-property `color-scheme:` form routes to `'authored'`, when the shipped code actually routes it to `'meta-only'`.
- **Source-Sprint:** SPRINT-007
- **Rationale:** The comment says `'authored'` covers "a real `@media (prefers-color-scheme: dark)` block, or the CSS property form used outside a media query," but the shipped code (`if (/[;{"'\s]color-scheme\s*:/i.test(html)) return 'meta-only';`) routes that exact case to `'meta-only'`. The two states have different downstream contracts — `'meta-only'` applies a finished transform, `'authored'` carries an unimplemented TODO — so a maintainer trusting the comment would expect the wrong code path to run.
- **Blast radius:** `index.html`, comment only, risk: trivial.
- **Source:** FIND-SPRINT-007-17 (TASK-023 code-reviewer, index.html:3193-3198)
- **Proposed change:**
  ```diff
   // detectAuthorDarkScheme(html) — classifies an HTML string into one of
  -// three author-dark-CSS states: 'authored' (a real
  -// @media (prefers-color-scheme: dark) block, or the CSS property form
  -// used outside a media query), 'meta-only' (a bare color-scheme /
  -// supported-color-schemes signal with no actual dark rules behind it),
  -// or 'none' (neither).
  +// three author-dark-CSS states: 'authored' (the string
  +// `prefers-color-scheme` appears anywhere — today only as an
  +// @media (prefers-color-scheme: dark) block), 'meta-only' (a
  +// color-scheme / supported-color-schemes signal in either meta-name or
  +// CSS-property form, with no dark rules behind it), or 'none' (neither).
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** `index.html:3211` returns `'meta-only'` for the CSS-property form while the comment at `index.html:3195` claims that exact case is `'authored'` — two states whose downstream branches (3227 vs 3235's unimplemented TODO) do different things, so the comment actively misroutes a maintainer, and the fix touches only the comment.

### A12. Give appleMailDarkTransform's meta-only branch the EB-DARKSIM marker and canvas rule its sibling has
- **Summary:** Make the Apple Mail meta-only fallback inject the same marker + dark canvas rule that `outlookDarkTransform` pairs with the identical color remap, and state the marker requirement as an explicit invariant above the transform registry.
- **Source-Sprint:** SPRINT-007
- **Rationale:** `appleMailDarkTransform`'s `'meta-only'` branch reuses `remapInlineColors` (a real color mutation) but injects no marker and no canvas rule, unlike `outlookDarkTransform`'s identical reuse. Two problems compound: (1) the Section 8 purity guard detects preview-only leakage into `lastHtml` solely by `EB-DARKSIM` marker absence — a regression here would go undetected; (2) the area outside the body box would stay light while inline colors darken, not matching Apple's documented fallback. Latent today (branch is unreachable while `buildMjml()` emits no `color-scheme` meta, drift-guarded by Section 10 fixture 7), so this is safe to fix now.
- **Blast radius:** `index.html`, one function branch + one new comment, risk: low (branch currently unreachable in production).
- **Source:** FIND-SPRINT-007-18, FIND-SPRINT-007-27 (TASK-023 / sprint-code-reviewer, index.html:3226-3233 and 3249 at time of finding, now index.html:3227-3234 and 3249)
- **Proposed change:**
  ```diff
     if (scheme === 'meta-only') {
       // Apple's documented fallback when color-scheme / supported-color-schemes
       // is present but no dark rules are authored: a partial invert (light
       // backgrounds go dark, dark text goes light). remapInlineColors
       // (TASK-022) already implements exactly that transform, so it is
  -    // reused as-is rather than duplicated.
  -    return remapInlineColors(html);
  +    // reused as-is rather than duplicated. Paired with the same canvas
  +    // rule outlookDarkTransform injects (same contrast target,
  +    // OUTLOOK_DARK_SURFACE) and the EB-DARKSIM marker every mutating
  +    // transform must carry (see DARK_MODE_TRANSFORMS below).
  +    return injectPreviewStyle(remapInlineColors(html),
  +      '/* EB-DARKSIM applemail — preview only, never present in copied HTML */\n' +
  +      'html { background-color: ' + OUTLOOK_DARK_SURFACE + ' !important; }');
     }
  ```
  ```diff
  +// Every transform that mutates its input must inject the EB-DARKSIM
  +// marker (see the Section 8 purity guard, which detects preview-only
  +// leakage into lastHtml solely by marker absence). Identity/no-op
  +// transforms (e.g. appleMailDarkTransform's 'none' branch) are exempt.
   const DARK_MODE_TRANSFORMS = { gmail: gmailDarkTransform, outlook: outlookDarkTransform, applemail: appleMailDarkTransform };
  ```

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The `'authored'` fallback at `index.html:3247` also calls `remapInlineColors` with no marker, so the proposed "every transform that mutates its input must inject the EB-DARKSIM marker" comment would be false for a sibling branch the moment it lands — and the branch being changed is unreachable, pinned by the Section 10 drift guard at `index.html:2643-2648`.
- **Counterfactual:** if the `'authored'` branch is implemented (or given the same marker treatment in the same pass) so the invariant is true for every branch, the consistency argument holds.

### A13. Add dark-mode preview to README's Scope "In:" list
- **Summary:** The README's Scope section lists the app's shipped capabilities but never mentions dark-mode preview even though every other TASK-024 doc update covered it — add one clause next to the viewport toggle.
- **Source-Sprint:** SPRINT-007
- **Rationale:** A reader scanning Scope to learn what the tool does gets an incomplete answer, and the viewport toggle sitting there without its new sibling makes the omission look deliberate. Outside TASK-024's acceptance criteria (which only required the workflow step + dedicated section, both present), so it slipped through untouched.
- **Blast radius:** `README.md`, one line, risk: trivial.
- **Source:** FIND-SPRINT-007-21 (TASK-024 verifier, README.md:143)
- **Proposed change:**
  ```diff
  -**In:** single CTA, two rich-text body sections (bold / lists / links), multiple brand templates, live preview with desktop/mobile viewport toggle, raw HTML inspector modal, one-click copy with validation + invalid-field highlighting, plaintext phone auto-linking, preview-only Handlebars test data (full SendGrid helper dialect — `#if` / `#each` / `#equals` / `#notEquals` / `#greaterThan` / `#lessThan` / `insert` / `formatDate`) with missing-data chips, humanized syntax-error banner, and `localStorage` persistence.
  +**In:** single CTA, two rich-text body sections (bold / lists / links), multiple brand templates, live preview with desktop/mobile viewport toggle, dark-mode preview simulation (Gmail / Outlook / Apple Mail), raw HTML inspector modal, one-click copy with validation + invalid-field highlighting, plaintext phone auto-linking, preview-only Handlebars test data (full SendGrid helper dialect — `#if` / `#each` / `#equals` / `#notEquals` / `#greaterThan` / `#lessThan` / `insert` / `formatDate`) with missing-data chips, humanized syntax-error banner, and `localStorage` persistence.
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** README.md:143's Scope "In:" list omits dark-mode preview even though README.md:33 (workflow step) and README.md:92-100 (dedicated section) both document it, leaving the canonical capability inventory the one place that contradicts the rest of the file.

## B. Backlog tasks (refine into execution-ready plans)

### B1. Strengthen the dark-mode preview test harness's weak fixtures and de-duplicate its predicate-row rendering
- **Summary:** Several dark-mode harness fixtures pass vacuously or leave real branches uncovered, and the harness now has four near-identical copy-pasted predicate-row loops that should be one shared helper before a fifth appears.
- **Source-Sprint:** SPRINT-007
- **Source:** FIND-SPRINT-007-7, FIND-SPRINT-007-9, FIND-SPRINT-007-14, FIND-SPRINT-007-16 (TASK-021/022/023 verifiers and code-reviewers)
- **Problem:** Four distinct, verified test-strength gaps in the harness added across TASK-021/022/023: (1) the Section 8 "preview-only purity guard" (index.html:2435-2436) only exercises the invariant it claims to test if dark mode happens to be ON when the harness is opened — a fresh load always has it OFF, so the fixture would still PASS even if `render()` regressed to leak `EB-DARKSIM` into `lastHtml`. (2) The Section 10 "authored beats meta (substring-ordering trap)" fixture (index.html ~2604-2608) cannot actually detect a swap of `detectAuthorDarkScheme`'s branch order — mutation-tested: reordering the branches leaves all 66 harness rows green. (3) `detectAuthorDarkScheme`'s third branch (the loosest matcher, which fires on ordinary prose like "Ask about our color-scheme: blue and white") has zero fixture coverage (index.html:3211). (4) Sections 7, 8, 9, and 10 each paste the same `{ label, check(), description }` / try-catch / row-template loop (~13 lines each) rather than sharing one helper; a fifth copy is the next thing any new harness section will add.
- **Proposed direction:** In one pass over the test harness inside `renderTestHarness()`: (a) rewrite the Section 8 purity-guard fixture to force `darkModeEnabled = true` / `darkModeClient = 'gmail'`, call `render()` synchronously, capture `lastHtml`, then restore both flags and re-render in a `finally` block, so the fixture actually exercises the condition it claims to test; (b) change the Section 10 ordering-trap fixture's input to `'<meta name="color-scheme" content="light dark"><style>@media (prefers-color-scheme: dark){body{color:#fff}}</style>'` (verified: shipped detector returns `'authored'`; both reordered variants return `'meta-only'`), keeping the current input as a second fixture if the plain case is still wanted; (c) add a Section 10 fixture asserting `detectAuthorDarkScheme('<style>:root{color-scheme:light dark}</style>') === 'meta-only'` to lock the CSS-property branch, then decide deliberately whether to keep that branch as-is, tighten it to a stylesheet/attribute context, or drop it per the plan's own escape hatch ("drop to meta-name matching only"); (d) extract a `renderPredicateFixtures(body, fixtures, failText)` helper and have Sections 7-10 call it instead of each pasting the loop. Leave Sections 5 and 6 alone — they render a different field shape and don't fit the predicate pattern.
- **Scope:** medium

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Independently reproduced by reading `detectAuthorDarkScheme` (`index.html:3205-3212`): the ordering-trap fixture's input has no `name=` and no delimiter before `color-scheme` in `prefers-color-scheme:`, so all three branch orders return `'authored'` and the fixture at `index.html:2604-2608` provably cannot catch the swap it exists to catch — and the Section 8 guard at `index.html:2436` passes vacuously with dark mode off, which is every fresh load.
- **Counterfactual:** if the predicate-loop extraction (part d) is dropped at refinement, the remaining fixture repairs get cheaper still.

### B2. Consolidate the dark-mode switch onto createModuleToggle with a persistence opt-out; formalize the header's append-order contract
- **Summary:** The sprint deleted the last hand-rolled toggle in TASK-014 and then rebuilt an equivalent hand-rolled toggle for dark mode four commits later because the shared factory can't skip localStorage — give the factory an opt-out and collapse both header controls onto one code path, documenting the runtime-append ordering that both rely on.
- **Source-Sprint:** SPRINT-007
- **Source:** FIND-SPRINT-007-23, FIND-SPRINT-007-26 (sprint-code-reviewer)
- **Problem:** TASK-014 deleted `testDataSwitch` / `syncTestDataSwitch()` / `flipTestData()` specifically to migrate the last `class="switch"` element onto `createModuleToggle()`. TASK-021, four commits later, built `darkModeSwitch` (index.html:3422-3454) as a new hand-rolled control with the identical `module-toggle`/`track` markup shape, identical sync/flip/keydown code, because `createModuleToggle` (index.html:3463) unconditionally persists to `emailBuilder.module.<id>` and dark-mode state must not persist. Net switch-widget consolidation across the sprint is zero. Separately, `.preview-header-left`'s static markup (index.html:721-740) ends with a `<span class="divider">` written for the toggle TASK-014 deleted; it still reads correctly only because TASK-014's and TASK-021's runtime `appendChild`/`insertAdjacentHTML` calls happen to land in the right order. Nothing in the HTML documents that the container is runtime-extended and order-dependent — a future static addition would silently land in the wrong visual position.
- **Proposed direction:** Add a 5th parameter to `createModuleToggle(id, label, defaultOn, onChange, persist = true)` that gates the `localStorage.getItem` (index.html:3465) and `localStorage.setItem` (index.html:3497) calls. Rebuild the dark-mode switch as `createModuleToggle('darkMode', 'Dark mode', false, onDarkModeToggle, false)`, moving `syncDarkModeSwitch`'s two extra side effects (`darkClientControl.hidden = !darkModeEnabled` and `previewStage.classList.toggle('dark', ...)`) into the `onChange` callback — this should collapse index.html:3415-3454 down to one factory call plus the client-picker wiring. While there, add a comment at index.html:739 (the static markup's trailing divider) stating the container is runtime-extended and naming the append call sites, and cache the repeated `document.querySelector('.preview-header-left')` lookup into one `const`. If a persistence opt-out is rejected as out of scope, document the "persistence-only" constraint explicitly in the CODE-PATTERNS.md `createModuleToggle` entry instead (see C1) so the next non-persistent toggle doesn't fork a third copy.
- **Scope:** medium

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** `index.html:3422-3454` re-implements the factory's markup, sync, flip and keydown wholesale purely because `createModuleToggle` persists unconditionally (`index.html:3465` / `3497`), and IDEA-003's own value statement is that "all future module toggles … are added by calling the factory, not by copy-pasting event handlers and storage keys" — one defaulted parameter deletes ~30 duplicated lines.

### B3. Resolve the dark-mode disclosure/occlusion cluster (stage chrome invisible at desktop, tooltip-only a11y gap)
- **Summary:** The Apple Mail no-op's entire visual signal — a darkened preview-stage border — is fully hidden behind the iframe at normal desktop widths, and the fallback tooltip explanation is invisible to keyboard and screen-reader users, so both halves of the epic's intended disclosure currently reach nobody in the default view.
- **Source-Sprint:** SPRINT-007
- **Source:** FIND-SPRINT-007-15, FIND-SPRINT-007-19, FIND-SPRINT-007-20 (TASK-023 verifier/code-reviewer, TASK-024 verifier)
- **Problem:** `.preview-stage.dark` (index.html:250) sets `background: #1a1a1a`, but `.preview-iframe` (index.html:234-240) is `width:100%; height:100%` with no stage padding, so the dark background is fully occluded at desktop widths — measured in headless Chromium at 1600x1000: zero `rgb(26,26,26)` pixels anywhere in the stage, and dark-ON/Apple-Mail is pixel-identical to dark-OFF. It only works in the mobile viewport, where the iframe narrows to 375px and exposes the surround (69.3% pixel difference confirmed). This directly undermines the TASK-023 plan's locked scope decision ("the button tooltip plus the darkened stage chrome carry the disclosure instead"), which assumed the chrome was visible. Compounding this, the tooltip half of that same disclosure lives entirely in `title` attributes on the picker buttons (index.html:3428-3430) — `title` is hover-only, not announced by screen readers (accessible-name computation prefers element content over `title`), and not reachable by keyboard. For Gmail/Outlook that's tolerable since the transform itself is visible; for Apple Mail the tooltip *is* the explanation. The CHANGELOG (line 13) and a code comment (index.html:247-249) both already assert the chrome "reads as a deliberate result," which is not true at the default viewport.
- **Proposed direction:** This needs one scope decision, not three piecemeal patches — the TASK-023 plan already named the cheapest escalation: a one-line muted caption near the picker (visible text is announced to screen readers and needs no hover, and would fix the desktop-occlusion signal too since it doesn't depend on the stage chrome being visible). If that's approved, add the caption, and no CSS/comment changes are needed elsewhere. If the caption is rejected and the desktop occlusion is fixed instead (e.g. `.preview-stage.dark .preview-iframe { margin: 16px; width: calc(100% - 32px); height: calc(100% - 32px); }` or equivalent stage padding), the tooltip accessibility gap still needs a minimum fix — an `aria-describedby` pointing at a visually-hidden span with the same sentence. Whichever path is chosen, update the CHANGELOG bullet and the index.html:247-249 code comment so neither overstates desktop-viewport legibility, and re-run the desktop smoke test to confirm dark-ON/Apple-Mail is no longer pixel-identical to dark-OFF.
- **Scope:** medium

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Confirmed from the CSS alone: `.preview-iframe` is `width/height: 100%` with margin applied only under `.preview-stage.mobile` (`index.html:234-245`), so `.preview-stage.dark { background: #1a1a1a }` (`index.html:250`) is fully covered at desktop, and the picker's only explanation lives in hover-only `title` attributes (`index.html:3428-3430`) — both halves of the shipped disclosure reach nobody in the default view.

### B4. Route render()'s raw mjml2html exception through a humanizer, per CLAUDE.md's own convention
- **Summary:** `render()`'s catch block paints a raw `mjml2html` exception (including compiled-HTML line numbers the marketer never sees) straight into the preview pane, violating CLAUDE.md's binding "library errors must be humanized" rule ten lines below code this sprint touched.
- **Source-Sprint:** SPRINT-007
- **Source:** FIND-SPRINT-007-25 (sprint-code-reviewer, index.html:3370)
- **Problem:** CLAUDE.md states: "Library errors must be humanized before display. Never show raw exception messages from Handlebars, MJML, or other CDN libraries to the user... Line numbers that refer to compiled HTML the marketer never sees must be stripped." `render()`'s catch arm does exactly what this forbids: `` els.preview.srcdoc = `<pre>...MJML error:\n${escapeHtml(e.message)}</pre>` `` (index.html:3370) — the raw `mjml2html` message, unhumanized, including compiled-line-number references. It's pre-existing (not introduced this sprint) but is only visible as a convention violation because `applyDarkMode`'s new catch arm sits in the same function and correctly follows the rule (its comment cites CLAUDE.md verbatim: "Do not interpolate e.message"). `escapeHtml` makes the leak inert as markup — this is a convention/UX gap, not an injection bug.
- **Proposed direction:** Add a `humanizeMjmlError(e)` helper modeled on the existing `humanizeTemplateError` pattern (index.html:1852, the canonical example CLAUDE.md points to): pattern-match the common `mjml2html` failure shapes (unclosed tags, invalid attribute values, etc. — inspect what `mjml-browser` actually throws), strip any compiled-HTML line-number references, and return an action-oriented message naming the likely field to check. Call it from the `render()` catch (index.html:3368-3372) instead of interpolating `e.message` directly. If the raw text is still wanted for debugging, surface it in the Ctrl+Shift+T harness rather than the default preview pane.
- **Scope:** small

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Every marketer-supplied value reaching `buildMjml()` is `escapeHtml`'d (`index.html:1596`, `1639`, `1640`) or Quill-serialized, so the catch at `index.html:3370` fires only when the app's own template config is broken — a developer-facing case where the raw message *is* the diagnostic — and a new pattern-matcher for `mjml-browser` exception shapes nobody has observed is disproportionate to that.
- **Counterfactual:** one reproduction of a marketer-triggerable MJML throw, or any unescaped input path into `buildMjml()`, flips this to IMPLEMENT.

## C. CLAUDE.md / CODE-PATTERNS.md improvements (apply now)

### C1. Refresh the stale createModuleToggle entry in CODE-PATTERNS.md
- **Summary:** The createModuleToggle pattern entry still describes the test-data migration as pending work (it shipped in TASK-014) and its line references are ~700 lines out of date — rewrite the Gotcha and refresh the pointers.
- **Source-Sprint:** SPRINT-007
- **Target file:** `CODE-PATTERNS.md`
- **Status:** ready
- **source_item:** C1
- **Action:** replace-entry "### `createModuleToggle`" (CODE-PATTERNS.md lines 55-58)
- **Source:** FIND-SPRINT-007-3 (TASK-014 code-reviewer), FIND-SPRINT-007-23 (sprint-code-reviewer)
- **Reviewer notes:** verified factory at ~3463, CTA caller ~3535, testData caller ~3411, copy shim ~3403-3406; old refs stale by ~1540 lines. Dropped the duplicated persistence sentence, the derivable `title`-attribute note, and the self-evident "remove this note" clause; added a greppable function-name anchor since raw line numbers are what rotted here.
- **Diff:**
  ```diff
   ### `createModuleToggle`

  -- **Location:** `index.html` ~line 1920.
  +- **Location:** `index.html` — `createModuleToggle()` (~line 3463).
   - **Use it for:** Building an enable/disable toggle for an optional module. `createModuleToggle(id, label, defaultOn, onChange)` returns `{ element, isOn }`; caller appends `element` to the DOM. `onChange(state)` fires once on init and on every flip.
  -- **Canonical example:** CTA toggle ~line 1992 (`createModuleToggle('cta', ...)`).
  -- **Gotcha:** state persists under `emailBuilder.module.<id>`. The legacy `testDataEnabled` toggle uses a different key (`emailBuilder.testDataEnabled`) — migrating it onto this factory needs a one-time key migration or the saved preference resets.
  +- **Canonical example:** CTA toggle ~line 3535; test-data toggle ~line 3411 (grep `createModuleToggle('` for all callers).
  +- **Gotcha:** the factory always persists to `emailBuilder.module.<id>` — there is no opt-out. That is why the dark-mode switch (~line 3422), whose state must not persist, is hand-rolled against the same markup/CSS instead of calling this factory; migrate it here if an opt-out ever lands. The test-data toggle carries a one-time copy shim (~line 3403) preserving its pre-TASK-014 `emailBuilder.testDataEnabled` value.
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** CODE-PATTERNS.md:58 still calls the `testDataEnabled` migration pending work though it shipped (`index.html:3403-3411`), and its pointers (~1920 / ~1992) are ~1540 lines off the real factory (`index.html:3463`) and CTA caller (`index.html:3535`) — an agent following this entry lands in unrelated code and hunts for a hand-rolled toggle that no longer exists.
- **Counterfactual:** if B2 lands first, the new Gotcha's "there is no opt-out" sentence needs rewriting in that task rather than here.

### C2. Add a CODE-PATTERNS.md entry for injectPreviewStyle
- **Summary:** `injectPreviewStyle` is now a genuine shared utility with a non-obvious safety property (it neutralizes `</style>` inside its input) but has no CODE-PATTERNS.md entry, so a future preview-only style injector could easily re-introduce the same hazard by hand.
- **Source-Sprint:** SPRINT-007
- **Target file:** `CODE-PATTERNS.md`
- **Status:** ready
- **source_item:** C2
- **Action:** insert-after the C1-rewritten `createModuleToggle` entry (immediately before `### \`.seg-body\` collapse primitive`)
- **Source:** FIND-SPRINT-007-22 (sprint-code-reviewer / TASK-024 verifier)
- **Reviewer notes:** verified helper at ~2802 with `</style` neutralization; canonical-example call site corrected to ~3166 (proposal's 3161 was the function's own `function` line). Not split — the "always route through the helper" rule is implementation-level (fails the every-agent test for CLAUDE.md); the same-origin premise lands in ARCHITECTURE.md via C3. Trimmed the transform enumeration and replacer detail (derivable from the function's own comments).
- **Diff:**
  ```diff
  +### `injectPreviewStyle`
  +
  +- **Location:** `index.html` — `injectPreviewStyle()` (~line 2802).
  +- **Use it for:** Injecting a preview-only `<style>` block into a compiled HTML string (before `</head>`, else after the opening `<body>`, else prepended). Every dark-mode transform routes its generated CSS through this helper.
  +- **Canonical example:** `outlookDarkTransform` ~line 3166.
  +- **Gotcha:** the helper neutralizes a literal `</style` inside `css` so an interpolated value (e.g. a brand color) cannot close the style element early and have its remainder parsed as HTML — the preview iframe is same-origin and already runs an injected `<script>` (see ARCHITECTURE.md). Never hand-concatenate `<style>…</style>` into preview HTML, even for a literal that looks safe today.
  +
   ### `.seg-body` collapse primitive
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** `injectPreviewStyle` (`index.html:2802`) matches the inclusion bar every other Shared Utilities entry meets — multiple callers plus a non-obvious safety property (the `</style` neutralization at `index.html:2811`) — and CODE-PATTERNS.md is a lookup doc rather than per-prompt context, so the attention cost of a six-line entry is bounded.

### C3. Fix ARCHITECTURE.md's stale component list and false "sandboxed iframe" claim
- **Summary:** ARCHITECTURE.md never mentions the new dark-mode transform layer, still describes the compiled HTML as going straight into the preview iframe (it now forks into a pure `lastHtml` and a separately-transformed `srcdoc`), and asserts the preview iframe is "sandboxed" when it verifiably is not and was never meant to be.
- **Source-Sprint:** SPRINT-007
- **Target file:** `ARCHITECTURE.md`
- **Status:** ready
- **source_item:** C3
- **Action:** replace ARCHITECTURE.md line 26 + insert-after the "- **UI controls** — ..." bullet
- **Source:** FIND-SPRINT-007-22, FIND-SPRINT-007-24 (sprint-code-reviewer)
- **Reviewer notes:** verified `<iframe>` at index.html:761 has no `sandbox` attribute (the string `sandbox` appears nowhere in tracked source except ARCHITECTURE.md:26); verified `render()` forks `lastHtml` (3339) vs `srcdoc` (3345). Not split — entirely orientation-doc content; kept as one item per FIND-SPRINT-007-24's request. Tightened all three prose blocks; dropped the redundant `~line 3249` registry pointer.
- **Diff:**
  ```diff
   - **Quill editors** — two `Quill` instances (`bodyAboveQuill`, `bodyBelowQuill`) for rich-text body copy above and below the CTA. Quill's link sanitizer is patched (`PassthroughLink`) to allow `tel:` URLs and Handlebars tokens.
  -- **MJML build pipeline** — `buildMjml()` assembles an MJML string from form state; `render()` calls `mjml2html()` and writes the compiled HTML into a sandboxed `<iframe>`.
  +- **MJML build pipeline** — `buildMjml()` assembles an MJML string from form state; `render()` calls `mjml2html()` and forks the result: `lastHtml` keeps the untransformed HTML (the only source for Copy HTML / View HTML), while the preview `srcdoc` is that same HTML run through `withPreviewLinkHandler(applyDarkMode(applyTestData(...)))`. Export and preview are deliberately different strings from one compile.
  +- **Dark-mode preview simulation** — `applyDarkMode()` dispatches through the `DARK_MODE_TRANSFORMS` registry to `gmailDarkTransform` / `outlookDarkTransform` / `appleMailDarkTransform`; `detectAuthorDarkScheme()` classifies the compiled HTML for the Apple Mail branch. Shared HSL/WCAG primitives (`parseCssColor`, `contrastRatio`, `remapLightness`, `liftForContrast`) back the Outlook and Apple Mail transforms. Preview only — never touches `lastHtml`.
   - **Test data substitution** — `applyTestData()` / `parseTestData()` handle preview-only Handlebars token resolution (`{{dot.path}}` / `{{{triple}}}`) against a user-editable JSON object persisted in `localStorage`.
   - **Copy / output flow** — `runCopyAction()` validates required fields, compiles MJML, and copies to clipboard. `openHtmlModal()` / `closeHtmlModal()` manage the raw HTML inspection modal.
   - **UI controls** — `wireSegControl()` registers groups of `.seg-control button` elements as mutually exclusive toggles. `updateCtaPreview()` mirrors the active CTA button style live in the form panel.
  +
  +The preview `<iframe>` (`index.html` ~line 761) is deliberately **not** sandboxed: it is same-origin with the host page and executes the link-click `<script>` that `withPreviewLinkHandler` injects. Any code writing into its HTML must assume that threat model — see `injectPreviewStyle` in CODE-PATTERNS.md.
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** ARCHITECTURE.md:26's "sandboxed `<iframe>`" is verifiably false — `index.html:761` is `<iframe class="preview-iframe" id="preview" title="Email preview">` with no `sandbox` attribute, and the string appears nowhere in `index.html` — so an agent orienting from this doc would reason about the preview from the wrong threat model.
