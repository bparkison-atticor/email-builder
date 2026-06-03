---
id: TASK-015
idea: inline
status: approved
created: 2026-06-03T14:58:41-04:00
files_owned:
  - index.html
files_readonly: []
acceptance_criteria:
  - criterion: "Reproduction steps no longer trigger the bug"
    verification: "With CTA destination type = 'URL variable' and a variable name not present in test data (e.g. eligibilityLink), the CTA button still renders in the #preview iframe instead of disappearing."
  - criterion: "Copy HTML / raw output remains token-pure and unaffected"
    verification: "lastHtml still contains the literal {{variable}} token in the button href; the Copy HTML output renders the button correctly (user-confirmed this already works and must not regress)."
  - criterion: "Body-text missing-value chips still render"
    verification: "A missing {{Path}} token in body/content position still shows the yellow [Path — not set] chip in the preview."
  - criterion: "Resolved variables and phone mode still render correctly"
    verification: "A URL-variable that DOES resolve in test data (e.g. Request.UniqueUrl) renders a working button; phone mode (tel:) continues to render."
  - criterion: "Regression test exists and passes"
    verification: "Test in the dev harness (index.html ~line 1738 / Ctrl+Shift+T) asserts a {{missingVar}} token inside an href attribute does not break the anchor and the button still renders."
depends_on: []
estimated_complexity: medium
---

# Bugfix: CTA disappears in preview when URL-variable field is set to an unresolved variable

## Bug Summary

In the Email Builder app (`index.html`), when the CTA destination type is set to "URL variable" and the user types a variable name (e.g. `eligibilityLink`), the CTA button disappears from the live iframe render preview. The button is present in MJML and in the compiled/Copy HTML; it is destroyed only in the preview render pass, because the preview applies a Handlebars test-data substitution that injects an HTML "missing value" chip into the button's `href` attribute, producing malformed anchor markup the browser cannot render as a button.

## Root Cause

The CTA's variable href and the preview's "missing test-data" chip collide inside an HTML attribute:

1. `buildCtaHref()` (`index.html:1454-1459`) → `buildLinkHref('url', value)` (`index.html:1273-1279`) returns `` `{{${v}}}` `` for a non-URL value, so typing `eligibilityLink` yields href `{{eligibilityLink}}`.
2. `buildMjml()` (`index.html:1517`) emits `<mj-button href="${escapeHtml(ctaHref)}" ...>`. `escapeHtml` (`index.html:1252-1259`) leaves `{`/`}` intact, so the compiled HTML contains literal `href="{{eligibilityLink}}"`.
3. `render()` (`index.html:1846`) sets the preview via `applyTestData(result.html)`, which runs `Handlebars.compile(html)` over the entire compiled HTML including the `href` attribute (`applyTestData`, `index.html:1758-1779`).
4. The Handlebars context is the Proxy from `buildTestDataContext()` (`index.html:1596-1662`). Default `SAMPLE_TEST_DATA` (`index.html:1549-1567`) has no top-level `eligibilityLink`, so the Proxy `get` trap returns a `makeChip(...)` `Handlebars.SafeString` (`index.html:1603-1608, 1628-1631`).
5. Because the chip is a `SafeString`, Handlebars inserts it without HTML-escaping. The chip is `<span style="background:#fef08a;...">[eligibilityLink — not set]</span>`. Substituted into `href="{{eligibilityLink}}"`, the chip's own `"` characters (in `style="..."`) prematurely close the `href` attribute and the `<span>` fragments the `<a>` opening tag. The browser parses broken anchor markup and the button does not render.

Only "URL variable" mode is affected: phone mode emits `tel:<digits>` with no `{{}}` token, so Handlebars passes it through untouched. The chip mechanism is correct for body-text contexts (yellow chip is intended there); the fault is that the same chip is unsafe inside an HTML attribute value.

## Reproduction

1. Open `index.html` (via `Email Builder.bat` or `python -m http.server 8080 --bind 127.0.0.1`).
2. In the CTA segment, set the destination type to "URL variable" (`data-cta-type="variable"`, `index.html:608`).
3. Type a variable name that is not a top-level key in the test-data panel — e.g. `eligibilityLink`.
4. Observe the CTA button vanish from the main `#preview` iframe.

Confirming corollary: typing a variable that DOES resolve in test data (e.g. `Request.UniqueUrl`) should render a working button — useful as a positive control.

## Implementation Steps

Fix at the chip/substitution layer so the fix covers all attributes (href, src, etc.), not just the CTA. Keep the preview-only scope — do NOT change `lastHtml` / Copy HTML output (user confirmed Copy HTML already renders the button correctly).

1. In `applyTestData` (`index.html:1758-1779`) and/or `buildTestDataContext`/`makeChip` (`index.html:1596-1662`), make the missing-key substitution context-aware so that `{{...}}` tokens sitting inside an HTML **attribute value** resolve to a plain, quote-free placeholder (e.g. `#` or an `about:blank`-style benign value) instead of the yellow `<span>` chip, while `{{...}}` tokens in **element-content** position keep the existing yellow `[Path — not set]` chip.
   - A practical approach: after compiling, detect `{{...}}` tokens whose position is inside an attribute value and route those through a non-HTML placeholder path; leave content-position tokens on the existing chip path. Alternatively, make the chip string itself attribute-safe (no embedded `"`, `<`, `>`), but the preferred outcome is that a missing href does not show a broken/garish chip inside the button URL.
2. Ensure the chip emitted for missing keys can never break surrounding markup regardless of position (no characters that terminate an attribute).
3. Preserve invariants:
   - (a) body-text missing-value chips still render as the yellow `[Path — not set]` indicator (behavior at `index.html:1578-1595`);
   - (b) `lastHtml` remains token-pure for Copy HTML (`index.html:1845-1846`) — only preview output changes;
   - (c) phone-mode and resolved-variable CTAs continue to render correctly;
   - (d) library errors stay humanized per the `humanizeTemplateError` convention.
4. Add a regression test in the dev harness (`index.html:1738` / Ctrl+Shift+T) asserting that a `{{missingVar}}` token inside an `href` attribute does not break the anchor and the button still renders, plus a positive control that a resolved variable renders a working href.

## Acceptance Criteria

- **Reproduction no longer triggers the bug:** URL-variable mode with an unresolved variable name keeps the CTA button visible in the `#preview` iframe.
- **Copy HTML unaffected:** `lastHtml` keeps the literal `{{variable}}` token; Copy HTML output renders the button correctly (no regression).
- **Body-text chips preserved:** missing `{{Path}}` in content position still shows the yellow `[Path — not set]` chip.
- **Resolved variables + phone mode still work:** a resolvable variable produces a working button href; phone-mode `tel:` still renders.
- **Regression test exists and passes:** dev-harness test covers the missing-var-in-href case and a positive control.
