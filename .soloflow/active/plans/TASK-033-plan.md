---
id: TASK-033
idea: inline
status: approved
created: 2026-08-13T15:58:00Z
files_owned:
  - index.html
  - CODE-PATTERNS.md
  - README.md
  - CHANGELOG.md
files_readonly: []
acceptance_criteria:
  - criterion: "Reproduction steps no longer trigger the bug"
    verification: "buildMicrocopyBlock output for a non-empty editor contains align=\"center\" on the emitted <mj-text> tag, so the caption centers under the centered mj-button. Confirm via the Section 15 harness (MICROCOPY_BLOCK_FIXTURES) actual-output row or by extracting the pure functions into node."
  - criterion: "Regression test exists and passes"
    verification: "A fixture in MICROCOPY_BLOCK_FIXTURES in index.html asserts the emitted block contains align=\"center\", and a fixture in RICHTEXT_OVERRIDE_FIXTURES asserts that omitting the align opt emits no align attribute at all. All harness fixture sections pass."
  - criterion: "Body-copy byte parity preserved"
    verification: "RICHTEXT_PARITY_FIXTURES still pass unchanged; body-copy call sites (bodyAboveQuill, bodyBelowQuill) emit byte-identical output with no align attribute."
  - criterion: "Docs stay accurate and anchor guard stays green"
    verification: "CODE-PATTERNS.md richTextToMjText opts count/enumeration and buildMicrocopyBlock opts list updated; README.md microcopy behavior list mentions centered alignment; CHANGELOG.md entry added; the Documentation anchor drift guard harness section still passes."
depends_on: []
estimated_complexity: low
---

# Bugfix: CTA microcopy renders flush-left instead of centered under the CTA button

## Bug Summary

CTA microcopy renders flush-left in the compiled email (and therefore in the preview iframe), while the CTA button directly above it is horizontally centered in the same mj-column. The caption was designed to read as attached to the button — TASK-028 even tightens the button's bottom padding from 18px to 6px specifically so the sentence hugs the button — but the horizontal alignment was never set, so a short caption sits at the left edge of the white content card under a centered button and reads as detached body copy rather than a button caption.

## Root Cause

`buildMicrocopyBlock` (grep `function buildMicrocopyBlock` in index.html) passes `fontSize`, `color`, `linkColor`, `padding`, `blockMargin`, and `convertTypedBullets` to `richTextToMjText`, but there is no alignment option to pass. `richTextToMjText` (grep `function richTextToMjText`) destructures exactly six opts and assembles the tag from exactly three attributes — `padding`, `font-size`, `color` — so it can never emit an `align` attribute at all. The head's `<mj-attributes>` block sets `<mj-text font-size="16px" line-height="1.5" color="#333333" />` with no `align`, so the microcopy block inherits MJML's mj-text default of `align="left"`. Meanwhile the `mj-button` in `buildMjml` sets no `align`, and MJML's mj-button default is `align="center"` — which is why the button is centered and the caption is not. Every other deliberately centered block in the template sets `align="center"` explicitly; the microcopy block is the only "attached to a centered element" block that does not. This is an original omission (git log -S shows no commit ever emitted alignment for this block), not a regression.

## Reproduction

1. Serve the app (`python -m http.server 8080 --bind 127.0.0.1`) and open index.html.
2. Leave the Call to action module on, set any CTA text, and type a short sentence such as `No cost, no obligation.` into the Microcopy field.
3. Look at the preview iframe: the button is centered in the white card; the caption starts at the card's left padding edge.

Verified by reading: `buildMicrocopyBlock('<p>No obligation.</p>', tpl)` produces `        <mj-text padding="0 0 18px 0" font-size="13px" color="#6b6b6b">…` with no align attribute — confirmable in the built-in harness (Section 15, "Actual output" row) without changing any state.

## Implementation Steps

1. In `richTextToMjText` (index.html, grep `function richTextToMjText`), add a seventh opt — `align` — defaulting to `null`, documented in the same inline-comment style as the neighboring opts ("null = inherit MJML's left default").
2. In the attribute assembly at the end of `richTextToMjText`, append `align="…"` to the `attrs` array ONLY when `align` is non-null, escaped with `escapeHtml` like the others. Keep the existing `padding`, `font-size`, `color` order and put `align` LAST so the existing startsWith override fixture still matches through `color="#6b6b6b"`. Do NOT default `align` to `'left'` and always emit it — that breaks byte parity for both body-copy call sites.
3. In `buildMicrocopyBlock` (grep `function buildMicrocopyBlock`), pass `align: 'center'`. This is a fixed value, not a brand-config key: per-brand alignment overrides are explicitly out of scope for the cta-microcopy epic — do NOT add a `ctaMicrocopyAlign` template key or touch the eight brand entries.
4. Do NOT add `align` to the head's `<mj-attributes>` mj-text rule — that would center body copy, the unsubscribe block, and the disclosure block too.
5. Add a fixture to `MICROCOPY_BLOCK_FIXTURES` (index.html, Section 15) asserting the emitted block contains `align="center"`.
6. Add a fixture to `RICHTEXT_OVERRIDE_FIXTURES` asserting that omitting `align` emits no align attribute at all (the parity guard's positive counterpart).
7. Update CODE-PATTERNS.md: the "six fields" opts count and enumeration in the `richTextToMjText` entry, and the `buildMicrocopyBlock` opts list.
8. Update README.md: the marketer-facing microcopy behavior list to mention the caption is centered under the button.
9. Add a CHANGELOG.md entry.
10. Commit atomically with a fix(TASK-033) message (plus separate test/docs commits if following repo convention of typed commits).

Invariants to preserve: `buildMicrocopyBlock`'s empty-editor gate returns `''` unchanged; the muted `linkColor` pass and `convertTypedBullets: false` are untouched; `ctaButtonPadding` is unrelated and must not change; body-copy output stays byte-identical; the Section 16 documentation anchor drift guard (anchors like `function buildMicrocopyBlock`) stays intact.

## Acceptance Criteria

1. **Reproduction steps no longer trigger the bug** — PASS if the emitted microcopy `<mj-text>` tag carries `align="center"` (harness Section 15 actual-output row or node extraction shows it), so the caption centers under the button in preview and copied HTML. FAIL if the tag still lacks an align attribute.
2. **Regression test exists and passes** — PASS if MICROCOPY_BLOCK_FIXTURES contains a fixture asserting `align="center"` in the emitted block AND RICHTEXT_OVERRIDE_FIXTURES contains a fixture asserting omission when unset, and both pass. FAIL if either fixture is missing or failing.
3. **Body-copy byte parity preserved** — PASS if RICHTEXT_PARITY_FIXTURES pass unchanged and no align attribute appears in body-copy output. FAIL on any parity fixture failure.
4. **Docs stay accurate and anchor guard stays green** — PASS if CODE-PATTERNS.md opts documentation, README.md microcopy list, and CHANGELOG.md are updated and the doc-anchor drift guard passes. FAIL if any doc still claims six opts or the guard fails.
