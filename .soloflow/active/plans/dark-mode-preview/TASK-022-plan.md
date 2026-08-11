---
id: TASK-022
idea: IDEA-005
status: approved
created: 2026-08-11T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CODE-PATTERNS.md
  - .soloflow/active/research/IDEA-005-research.md
acceptance_criteria:
  - criterion: "outlookDarkTransform is implemented and its DARK_TRANSFORM_STUB placeholder is gone."
    verification: "grep -n 'DARK_TRANSFORM_STUB' index.html returns exactly 1 match (appleMailDarkTransform's, removed later by TASK-023) and it is NOT on outlookDarkTransform."
  - criterion: "Light backgrounds are darkened; already-dark backgrounds are left byte-identical."
    verification: "Harness Section 9 fixtures: outlookDarkTransform('<td bgcolor=\"#ffffff\" style=\"background-color:#f4f4f4\">') output contains neither #ffffff nor #f4f4f4 and both replacements have HSL lightness <= 0.32; outlookDarkTransform('<td style=\"background-color:#00183e\">') output still contains #00183e verbatim. Both PASS."
  - criterion: "Dark foreground colors are lightened; already-light foreground colors are left byte-identical."
    verification: "Harness Section 9 fixtures: input style=\"color:#333333\" produces a replacement whose contrastRatio against #1b1b1b is >= 4.5; input style=\"color:#ffffff\" still contains #ffffff verbatim. Both PASS."
  - criterion: "The 4.5:1 contrast guard measurably lifts a color that fails after remapping."
    verification: "Harness Section 9 fixture: liftForContrast on the remap of #767676 yields contrastRatio(result, '#1b1b1b') >= 4.5, and the fixture also asserts the pre-lift value was measured (guard is exercised, not dead code). PASS."
  - criterion: "The WCAG color primitives produce the canonical published values."
    verification: "Harness Section 9 fixtures: relLuminance('#ffffff') rounds to 1, relLuminance('#000000') rounds to 0, contrastRatio('#ffffff','#000000') rounds to 21.0 (W3C WCAG 2.0 G18 reference values). All PASS."
  - criterion: "Unparseable or non-color values are passed through untouched."
    verification: "Harness Section 9 fixtures: values 'transparent', 'inherit', and a background shorthand containing a url() are all present verbatim in the output. PASS."
  - criterion: "Style attributes containing apostrophes (MJML font-family stacks) survive the rewrite intact."
    verification: "Harness Section 9 fixture: input style=\"font-family:'Helvetica Neue',Helvetica,sans-serif;color:#333333\" produces output where the full font-family declaration including both apostrophes is present verbatim and only the color changed. PASS."
  - criterion: "The transform never crosses an attribute or tag boundary."
    verification: "Harness Section 9 fixture: input '<a href=\"https://x.test/?c=%23ffffff\" style=\"color:#333333\">t</a>' leaves the href byte-identical while changing only the style color. PASS."
  - criterion: "Preview-only purity still holds and the app still boots."
    verification: "Harness Section 8 purity fixture (lastHtml has no EB-DARKSIM) still PASSes, sections 1-7 still PASS, and grep -n '</script>' index.html still returns exactly 3 lines."
depends_on: [TASK-021]
estimated_complexity: high
epic: dark-mode-preview
test_strategy:
  needed: true
  justification: "This task is almost entirely color math and regex-over-markup — the two highest-risk categories in the epic, and both perfectly deterministic. Every rule (light-bg darkens, dark-bg survives, dark-fg lifts, light-fg survives, contrast guard fires, non-colors pass through, attribute boundaries respected) is a discrete testable assertion, and the WCAG primitives have published reference values to check against."
  targets:
    - behavior: "relLuminance and contrastRatio match the W3C G18 reference values (white=1, black=0, ratio=21)"
      test_file: "index.html"
      type: unit
    - behavior: "Background rule: light backgrounds darken, already-dark backgrounds are untouched, in both style and bgcolor positions"
      test_file: "index.html"
      type: unit
    - behavior: "Foreground rule: dark text lightens and clears 4.5:1 against #1b1b1b, light text is untouched"
      test_file: "index.html"
      type: unit
    - behavior: "liftForContrast raises a mid-gray that fails the threshold after remapping"
      test_file: "index.html"
      type: unit
    - behavior: "Non-color values (transparent, inherit, background shorthand with url) pass through unchanged"
      test_file: "index.html"
      type: unit
    - behavior: "Regex safety: apostrophes inside style values and adjacent href attributes are never corrupted"
      test_file: "index.html"
      type: unit
---

# Outlook.com / OWA contrast-repair dark-mode simulation

## Objective

Implement the Outlook picker option as a selective inline-color remap rather than a blanket inversion, mirroring the contrast-repair behavior reverse-engineered for Outlook.com / OWA. Light backgrounds are pushed dark, already-dark backgrounds survive untouched, dark text is lifted and contrast-checked against the simulated dark surface, and light text is left alone. The distinctive artifact this produces — a dark brand color (banner band, CTA button) surviving un-inverted against a newly-darkened content area — is the specific failure class this option exists to expose, and the one Gmail's full invert cannot show.

## Approach

A pure `string → string` transform over inline `style` declarations and `bgcolor` attributes, plus one injected stylesheet for the root canvas. No DOM walk, no `getComputedStyle`, no injected script. MJML emits essentially all of its color as inline styles and `bgcolor` attributes, so a string pass reaches the same surface a DOM walk would, while staying testable in the existing harness and free of iframe load-timing.

**Color-space split (state this in a comment; it is the easiest thing for a maintainer to get wrong):** classification and remapping use **HSL lightness**; the 4.5:1 contrast guard uses **WCAG relative luminance**. They are different quantities and must not be conflated.

## Implementation Steps

1. **Baseline gate.** Run `grep -n '</script>' index.html` and confirm exactly 3 matches. Re-run at step 8.
2. **Color primitives.** Immediately above `outlookDarkTransform` (in the transform block established by TASK-021, after `injectPreviewStyle`), add these self-contained functions with a header comment citing W3C WCAG 2.0 G18 as the source for the luminance and contrast formulas:
   - `parseCssColor(str) → {r,g,b} | null`. Accepts `#rgb`, `#rrggbb`, `rgb(r,g,b)`, `rgba(r,g,b,a)` (alpha ignored). Accepts a small named-color map covering what this app and MJML actually emit: `white`, `black`, `red`, `blue`, `green`, `gray`, `grey`, `silver`. Returns `null` — meaning "leave this value alone" — for `transparent`, `inherit`, `initial`, `currentcolor`, `none`, and anything it cannot parse. Conservative by construction: an unrecognized value is never rewritten.
   - `relLuminance({r,g,b}) → number`. Per-channel `c = c8/255; lin = c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4)`, then `0.2126*R + 0.7152*G + 0.0722*B`.
   - `contrastRatio(a, b) → number`. `(max(La,Lb) + 0.05) / (min(La,Lb) + 0.05)`.
   - `rgbToHsl` / `hslToRgb` — standard conversions, `h` in `[0,360)`, `s` and `l` in `[0,1]`.
   - `toHex({r,g,b}) → '#rrggbb'` lowercase, each channel clamped to 0-255 and rounded.
   - `remapLightness({r,g,b}) → {r,g,b}`. Preserves hue and saturation; remaps HSL lightness piecewise (Dark Reader's approach — a clamped remap, not an inversion):
     - `L >= 0.5` → `L' = 0.10 + (1 - L) * 0.40`  (white 1.0 → 0.10; mid 0.5 → 0.30)
     - `L < 0.5`  → `L' = 0.90 - L * 0.40`        (black 0.0 → 0.90; 0.49 → 0.70)
   - `liftForContrast(rgb, bgHex, min)` — while `contrastRatio(rgb, bgHex) < min` and HSL lightness `< 0.97`, raise lightness by `0.02` and recompute. Returns the input unchanged if it already passes. Hard-cap the loop iteration count as a defensive guard against a non-terminating edge case.
3. **Declaration rewriter.** Add `remapDeclarations(decl)` operating on the contents of one `style` attribute:
   - Split on `;`, and for each `prop:value` pair trim and lowercase the property name.
   - **Background properties** — `background-color`, `background`, and `bgcolor`: parse the value; if it does not parse, or (for the `background` shorthand) the value is anything other than a single color token, leave the declaration verbatim. If HSL lightness `>= 0.5`, replace with `toHex(remapLightness(rgb))`; if `< 0.5`, leave verbatim (already-dark surfaces survive — this is the whole point of the option).
   - **Foreground properties** — `color`, `border-color`, `border-top-color`, `border-right-color`, `border-bottom-color`, `border-left-color`: if HSL lightness `< 0.5`, replace with `toHex(liftForContrast(remapLightness(rgb), OUTLOOK_DARK_SURFACE, 4.5))`; if `>= 0.5`, leave verbatim.
   - Every other property is passed through untouched.
   - Reassemble preserving the original separators so a value the rewriter declined is byte-identical in the output.
   - Define `const OUTLOOK_DARK_SURFACE = '#1b1b1b';` alongside, with a comment that 4.5:1 is the threshold community reverse-engineering attributes to OWA and that it is an approximation of an unpublished algorithm.
4. **Markup pass.** Add `remapInlineColors(html)`:
   - `html.replace(/style="([^"]*)"/gi, replacerFn)` — **double-quote only, deliberately**. MJML emits `font-family:'Helvetica Neue',…` inside style attributes; a pattern that also stopped at `'` would truncate mid-value and corrupt the markup. `[^"]*` cannot escape the attribute, which is the same boundary guarantee `safeAttrHtml` relies on.
   - `html.replace(/bgcolor=(["'])([^"']*)\1/gi, replacerFn)` — both quote styles are safe here since a color value never contains a quote. Apply the **background** rule.
   - Use function replacers throughout so `$` sequences in remapped values are never treated as substitution patterns.
   - Comment that color literals inside MSO conditional comments (`<!--[if mso]> … <![endif]-->`) will also be rewritten; this is inert, because the browser treats them as comments and never renders them.
   - Comment that colors declared in the compiled `<style>` block are **not** covered; today that block contains only `color: inherit` for Apple data-detector links, so coverage is complete in practice. Note this is the one place a future `mj-style` addition could silently escape the remap.
5. **`outlookDarkTransform(html)`.** Replace the stub body with `injectPreviewStyle(remapInlineColors(html), css)` where `css` is:
   ```
   /* EB-DARKSIM outlook — preview only, never present in copied HTML */
   html { background-color: #1b1b1b !important; }
   ```
   The injected rule darkens the canvas outside the body box, which the inline remap cannot reach. The `EB-DARKSIM` marker keeps this option covered by the Section 8 purity fixture. Delete the `DARK_TRANSFORM_STUB` comment.
6. **Surface-behavior comment.** Above the function, record: the option simulates Outlook.com / OWA (web), chosen over Outlook Windows desktop because the desktop client's full invert would duplicate the Gmail option and make the picker uninformative; OWA's real fingerprint is that it writes `data-ogsc` / `data-ogsb` attributes storing the original colors, deliberately not reproduced here (see Rejected Alternatives); the thresholds are approximations of an unpublished algorithm and should be re-checked periodically against caniemail.com and hteumeuleu/email-bugs.
7. **Harness Section 9.** Add a section titled `Dark-mode preview transforms — Outlook (OWA contrast repair)` after Section 8, following the same heading and row-rendering pattern. Fixtures listed under Test Strategy.
8. **Final gate.** Re-run `grep -n '</script>' index.html`; exactly 3 matches. Any literal `</script>` you introduced in a comment or fixture string must be written `<\/script>`.
9. **Manual smoke.** Serve the file, select the `kellerPostmanLead` template (navy `#00183e` banner and CTA), enable dark mode, pick Outlook. Confirm the navy banner band survives while the white content section goes dark, and that the navy CTA button is now visibly low-contrast against the darkened section — that is the intended, informative result, not a bug.

## Acceptance Criteria

- **Stub removed.** `grep -n 'DARK_TRANSFORM_STUB' index.html` returns exactly 1 match, on `appleMailDarkTransform` only.
- **Background rule.** Light backgrounds (`#ffffff`, `#f4f4f4`, in both `style` and `bgcolor` position) are replaced by colors with HSL lightness `<= 0.32`; `#00183e` survives byte-identical. PASS/FAIL per the Section 9 fixtures.
- **Foreground rule.** `#333333` is replaced by a color clearing 4.5:1 against `#1b1b1b`; `#ffffff` survives byte-identical.
- **Contrast guard fires.** The `#767676` fixture demonstrates the lift raising a value that failed the threshold post-remap. FAIL = the guard is never exercised (dead code).
- **WCAG primitives.** `relLuminance('#ffffff') ≈ 1`, `relLuminance('#000000') ≈ 0`, `contrastRatio('#ffffff','#000000') ≈ 21.0`.
- **Pass-through safety.** `transparent`, `inherit`, and a `background` shorthand containing `url()` appear verbatim in output.
- **Regex safety.** A `font-family:'Helvetica Neue',…` declaration and an adjacent `href` containing `%23ffffff` are both byte-identical in the output.
- **No regressions.** Section 8 purity fixture PASSes, sections 1-7 PASS, `</script>` count is 3.

## Test Strategy

Add harness **Section 9 — "Dark-mode preview transforms — Outlook (OWA contrast repair)"** to `renderTestHarness()` in `index.html`, reusing the predicate-fixture shape and row renderer introduced in Section 8. All inputs are literal HTML strings; no mocking or fixture files.

Fixtures:

1. **`relLuminance` white** — `Math.round(relLuminance(parseCssColor('#ffffff'))) === 1`.
2. **`relLuminance` black** — `relLuminance(parseCssColor('#000000')) === 0`.
3. **`contrastRatio` extremes** — `Math.round(contrastRatio(parseCssColor('#ffffff'), parseCssColor('#000000')) * 10) / 10 === 21`.
4. **Light background darkens (inline style)** — `outlookDarkTransform('<td style="background-color:#ffffff">x</td>')` output does not contain `#ffffff`, and the replacement's HSL lightness is `<= 0.32`.
5. **Light background darkens (`bgcolor` attribute)** — same assertion against `<td bgcolor="#F4F4F4">`, confirming case-insensitive matching.
6. **Dark background survives** — `outlookDarkTransform('<td style="background-color:#00183e">x</td>')` still contains `#00183e`.
7. **Dark text lifts and clears threshold** — from `style="color:#333333"`, the replacement satisfies `contrastRatio(replacement, '#1b1b1b') >= 4.5`.
8. **Light text survives** — from `style="color:#ffffff"`, output still contains `#ffffff`.
9. **Contrast guard exercised** — for `#767676`: assert `contrastRatio(remapLightness(#767676), '#1b1b1b') < 4.5` **and** `contrastRatio(liftForContrast(remapLightness(#767676), '#1b1b1b', 4.5), '#1b1b1b') >= 4.5`. This proves the guard is live, not dead.
10. **Non-colors pass through** — `style="background-color:transparent;color:inherit"` is byte-identical in the output.
11. **Background shorthand with `url()` passes through** — `style="background:#ffffff url(https://x.test/a.png) no-repeat"` is byte-identical.
12. **Apostrophe safety** — `style="font-family:'Helvetica Neue',Helvetica,sans-serif;color:#333333"` output contains the full font-family declaration verbatim and differs only in the color value.
13. **Attribute-boundary safety** — `<a href="https://x.test/?c=%23ffffff" style="color:#333333">t</a>` output contains the href byte-identical.

## Hardest Decision

Choosing a **string-level inline-color rewrite** over a **DOM walk with `getComputedStyle`**, which is what the research's reference implementation (Dark Reader) actually does. The DOM walk is strictly more correct — it resolves the cascade, so colors from `<style>` blocks and inherited values are all visible, and it can pair each text color with the background it actually sits on, which is what a real contrast repair requires. The string pass cannot do that pairing; it approximates it by measuring every foreground color against a single assumed surface (`#1b1b1b`).

The string pass wins on three grounds specific to this codebase. First, MJML puts virtually all color inline, so the coverage gap is close to zero today (the compiled `<style>` block currently holds one `color: inherit` rule). Second, a DOM walk would have to run inside the iframe, which means injecting a `<script>` into the srcdoc — reintroducing exactly the `</script>` truncation hazard that took the app down in TASK-020, and requiring the color functions to be closure-free so they can be stringified across the boundary. Third, and decisively: a string function is testable in the harness that already exists, and a DOM walk is not. Given the stated fidelity bar ("spot likely problems," not pixel parity), buying testability and safety with a single-surface contrast approximation is the right trade.

This would flip if `buildMjml()` ever moved substantial color into `<mj-style>`, or if a future slice needed per-element background pairing to avoid false-negative contrast reports.

## Rejected Alternatives

- **DOM walk with `getComputedStyle` inside the iframe.** See above. Would change if compiled color migrates into `<style>` blocks or if per-element foreground/background pairing becomes necessary.
- **chroma-js or culori from CDN.** Both are MIT, CDN-hosted, and clean per the research's Snyk check, but the total color-math need here is roughly 60 lines of published formulas. Adding a runtime CDN fetch and a whole color-science surface for one HSL remap and one contrast ratio is disproportionate, and the single-file/no-build constraint makes every added CDN dependency a boot-time risk. Would change if a future slice needed OKLCH or perceptual color-difference work.
- **A blanket `filter: invert()` for Outlook too.** Rejected as the option's reason for existing: if both Gmail and Outlook fully invert, the picker gives the marketer two nearly identical views and no new information. The selective remap is what surfaces the dark-brand-color-on-dark-surface failure.
- **Reproducing OWA's `data-ogsc` / `data-ogsb` attribute fingerprint.** It is the most distinctive documented signature of OWA's approach, but writing it requires tag-level parsing (attaching attributes to the enclosing element rather than rewriting a value in place), and it is invisible to the marketer — a forensic detail, not a preview signal. Rejected as cost with no user-facing benefit. Would change if the epic ever grew a "why did this change?" inspection mode.
- **Using WCAG relative luminance for the light/dark classification instead of HSL lightness.** Rejected for coherence: the remap operates in HSL, so classifying in a different space would create colors that are classified "light" but remapped as if dark near the boundary. HSL for classification and remap, WCAG luminance only for the contrast guard.

## Lowest Confidence Area

The single-surface contrast assumption. Every foreground color is checked against `#1b1b1b`, but a piece of text sitting on the navy `#00183e` banner (which is deliberately left untouched) is actually on a different background, so the guard may lift text that did not need lifting or, worse, declare "repaired" a pairing that is still poor in reality. In practice the affected surface is small — brand bands carry white text, which the foreground rule leaves alone entirely — but a template with dark-on-dark-brand text would be mis-simulated. The `#767676` and `#00183e` fixtures pin the behavior; the visual check in step 9 against `kellerPostmanLead` is the real test. If this proves misleading, the escalation path is pairing colors within a single `style` attribute (where MJML often co-locates a background and its text color) before falling back to the global surface.
