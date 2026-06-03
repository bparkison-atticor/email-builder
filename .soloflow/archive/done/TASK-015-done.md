---
id: TASK-015
status: done
summary: "CTA no longer disappears in preview when URL-variable href is unresolved; safeAttrHtml neutralizes missing {{tokens}} inside HTML attributes (preview-only)"
executor_loops: 2
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
investigation_confidence: high
---

# TASK-015 — Done

## Fix
When the CTA destination type is "URL variable" and the user enters a variable not present in test data, the preview's Handlebars substitution injected a SafeString missing-value chip (`<span style="...">[x — not set]</span>`) into the button's `href` attribute. The chip's embedded double-quotes shattered the `<a>` tag, so the button vanished from the `#preview` iframe.

Added two preview-only helpers in `index.html`:
- `resolveTokenPath(path, data)` — walks a dot-separated path, returns the leaf value or `undefined`.
- `safeAttrHtml(html, data)` — rewrites unresolved `{{token}}` / `{{{token}}}` found inside HTML attribute values to a benign `#`, leaving resolved tokens and content-position tokens untouched.

`applyTestData` now seeds `{ unsubscribe: '#unsubscribe-preview' }` (matching `buildTestDataContext`) and runs `safeAttrHtml` before compiling the preview. `lastHtml` / Copy HTML output stays token-pure — the export is unchanged.

## Verification
- shadow-verifier: APPROVED (round 2). Ran all 9 `SAFE_ATTR_FIXTURES` in Node: 9/9 PASS.
- Round 1 NEEDS_CHANGES caught a real regression (footer `{{{unsubscribe}}}` → `{#}`) from a seeded-data mismatch + triple-brace handling; fixed in commit 03e9ccc.
- Body-text chips, resolved variables, and phone mode confirmed unaffected.

## Regression coverage
9 fixtures in `SAFE_ATTR_FIXTURES` (dev harness, Ctrl+Shift+T). Fixture 2 is the exact reproduction (`{{eligibilityLink}}` → `href="#"`, no `<` in attribute). Fixture 1 asserts full anchor preservation via string equality. test-writer: NO_TESTS_NEEDED (coverage adequate).

## Commits
- 6033d82 — fix(TASK-015): prevent CTA button disappearing when URL-variable is unresolved
- 03e9ccc — fix(TASK-015): handle triple-brace + seeded tokens in safeAttrHtml

## Findings
- FIND-SPRINT-005-1 (seeded-root mismatch + triple-brace corruption) — resolved by 03e9ccc.
