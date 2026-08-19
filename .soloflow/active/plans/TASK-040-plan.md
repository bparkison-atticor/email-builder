---
id: TASK-040
idea: SPRINT-008-proposal
status: approved
created: 2026-08-19T15:00:00Z
files_owned:
  - index.html
  - README.md
  - CODE-PATTERNS.md
  - CHANGELOG.md
files_readonly:
  - .soloflow/active/findings/SPRINT-008-findings.md
acceptance_criteria:
  - criterion: "humanizeTemplateError takes a field argument and no longer hard-codes a prefix"
    verification: "grep `function humanizeTemplateError` in index.html shows the signature `humanizeTemplateError(message, field = 'Template')`. grep -c `'Body copy: ` inside that function returns 0 — all eight return statements interpolate the field argument."
  - criterion: "Both applyTestData catch arms pass an attributed field"
    verification: "grep `humanizeTemplateError(` returns two call sites inside applyTestData, each passing the result of attributeTemplateError(e.message) as the second argument."
  - criterion: "Attribution covers every field that routes Handlebars tokens into the compile pass"
    verification: "grep `TEMPLATE_ERROR_SOURCES` shows entries for the preheader, both body editors, the CTA microcopy editor, and the CTA destination. A new harness config-assertion row asserts the array's length and that its labels include 'CTA microcopy' — so a future field added to the compile pass without an attribution entry reddens."
  - criterion: "An unattributable error gets the neutral prefix, not a wrong field name"
    verification: "A new HUMANIZE_FIXTURES row calls humanizeTemplateError with no field argument and asserts the message starts with 'Template: '. Row reads PASS."
  - criterion: "The existing prefix-pinning fixture still passes"
    verification: "The fixture whose expected_pattern is 'Body copy: TypeError' now carries field: 'Body copy' and the Section 1 run passes fixture.field through. Row reads PASS with the same expected_pattern — this pins that threading works, rather than deleting the assertion."
  - criterion: "A microcopy-attributed error names the microcopy field"
    verification: "A new HUMANIZE_FIXTURES row passes field: 'CTA microcopy' with an unclosed-block message and asserts the output contains 'CTA microcopy: unclosed {{#if}} block'. Row reads PASS."
  - criterion: "Verified end to end in the browser"
    verification: "Serve the app, enable Test data, type `{{#if foo}}` into the CTA microcopy field and nothing closing it. The #warn banner above the preview reads 'CTA microcopy: unclosed {{#if}} block — add a matching {{/if}}.' Repeat in the preheader and confirm 'Preheader: …'. Repeat with a token split across a bold run and confirm the neutral 'Template: …' rather than a wrong field."
  - criterion: "Docs match the new message shape"
    verification: "CODE-PATTERNS.md's humanizeTemplateError entry no longer says it emits \"Body copy: …\" messages; it describes the field-prefixed shape and names attributeTemplateError. README.md's syntax-error paragraph, which quotes a 'Body copy: unclosed {{#equals}} block' example, is updated to the attributed shape. CHANGELOG.md has an entry. Documentation anchor drift guard passes."
depends_on: [TASK-039]
estimated_complexity: medium
epic: null
test_strategy:
  needed: true
  justification: "The sole error-humanization surface for five fields gains a new parameter and a new attribution function with a heuristic match. Both the threading and the fallback need pinning, and one existing fixture's assertion depends on the prefix."
  targets:
    - behavior: "All eight return branches interpolate the field argument; the default is the neutral 'Template'"
      test_file: "index.html"
      type: unit
    - behavior: "TEMPLATE_ERROR_SOURCES covers every field routed into the compile pass"
      test_file: "index.html"
      type: unit
---

# Attribute humanized template errors to their originating field

## Objective

All eight returns in `humanizeTemplateError` hard-code the prefix `"Body copy: "`, but Handlebars tokens are first-class in the preheader (`<mj-preview>`), the link dialog's URL-variable mode, and now CTA microcopy — all routed into the same `applyTestData()` compile pass, which sees only the fully-compiled document and has no idea which field a token came from. A malformed `{{#if}}` typed into microcopy surfaces as "Body copy: unclosed {{#if}} block…", sending the marketer to a field with no error in it. CLAUDE.md's binding convention requires plain-English, action-oriented messages; a message that names the wrong field is worse than one that names none, and with five token-bearing fields the attribution is now wrong more often than right. This task threads the originating field through, with a neutral fallback whenever attribution is uncertain.

## Implementation Steps

1. **Add the field parameter.** Change the signature to `humanizeTemplateError(message, field = 'Template')` and replace the literal `'Body copy: '` in all eight returns with an interpolation of `field`. The eight are: the empty-message guard, the two `CLOSE_BLOCK` branches (named and unnamed), the tag-mismatch branch, `CLOSE_RAW_BLOCK`, the generic `CLOSE`, the `Parse error` branch, and the render-time fallback. Update the function's header comment to state that the caller owns attribution and that `'Template'` is the deliberate neutral default.

2. **Add the source table** immediately above the function: `TEMPLATE_ERROR_SOURCES`, an array of `{ label, text() }` entries ordered most-specific first — `Preheader` (`els.preheader.value`), `CTA microcopy` (`ctaMicrocopyQuill`), `CTA destination` (`els.ctaDestination.value`), `Body copy (above CTA)` (`bodyAboveQuill`), `Body copy (below CTA)` (`bodyBelowQuill`). Order matters: the body editors are the largest fields and the most likely to contain an incidental substring match, so they are checked last. For the Quill entries, `text()` should return both `root.innerHTML` and `getText()` concatenated with a separator, so a token containing a quote or ampersand — HTML-escaped inside `innerHTML` — can still match against the plain-text form.

3. **Add the attribution function** `attributeTemplateError(message)` beside the table:
   - Extract the offending token from the Handlebars message. Parse errors embed the source line (`…{{#equals foo "bar"}}`), so `message.match(/\{\{[#\/]?[\w.\s"'-]*/)` captures a usable needle; trim it.
   - If no token is found, return `'Template'`.
   - Walk `TEMPLATE_ERROR_SOURCES` in order; return the first `label` whose `text()` contains the needle. Wrap each `text()` call in try/catch — this runs inside a render path and a throwing getter must not escalate a syntax error into a broken preview.
   - Return `'Template'` when nothing matches.

   Document the design contract in a comment: attribution is best-effort and biased toward the neutral prefix. Handlebars gives no field provenance, so a needle that is HTML-escaped, split across a `<strong>` run, or present in two fields at once falls through to `'Template'` — a message that declines to guess, which is the correct failure mode.

4. **Wire both call sites.** In `applyTestData`, change both catch arms to `humanizeTemplateError(e.message, attributeTemplateError(e.message))`. Leave everything else in the function alone — `templateError` staging and the `warnings.unshift(templateError)` fold-in in `render()` are unchanged.

5. **Fix the existing prefix-pinning fixture.** One `HUMANIZE_FIXTURES` entry has `expected_pattern: "Body copy: TypeError"`. With the new default that row would read `"Template: TypeError"` and go red. Add `field: 'Body copy'` to that fixture and thread `fixture.field` through the Section 1 runner (after TASK-035, that is the `run` callback: `f => ({ actual: humanizeTemplateError(f.input, f.field), … })` — `undefined` correctly triggers the default). Keep the `expected_pattern` as-is: the row then pins that threading works, which is strictly more than it pinned before.

6. **Add three fixtures.** A default-prefix row (no `field`, expects `'Template: '`); a microcopy-attributed row (`field: 'CTA microcopy'`, unclosed-block message, expects `'CTA microcopy: unclosed {{#if}} block'`); and a config-assertion row via `renderPredicateFixtures` asserting `TEMPLATE_ERROR_SOURCES.length === 5` and that its labels include `'CTA microcopy'` and `'Preheader'`. The config row is the one that catches the recurrence of this exact bug — a sixth token-bearing field added without an attribution entry.

7. **Verify in the browser.** Fixtures exercise `humanizeTemplateError` directly and cannot prove `attributeTemplateError` picks the right field from live editor state. Do all three checks in acceptance criterion 7: a broken block in microcopy, one in the preheader, and one deliberately split across a bold run to confirm the neutral fallback rather than a wrong name.

8. **Correct the docs.** CODE-PATTERNS.md's `humanizeTemplateError` entry says it "emits \"Body copy: …\" messages" — rewrite for the field-prefixed shape, naming `attributeTemplateError` and `TEMPLATE_ERROR_SOURCES` as the deciding constructs. README.md's syntax-error paragraph quotes a `Body copy: unclosed {{#equals}} block` example — update it and mention that the prefix names the field the token was found in, or `Template:` when it cannot be determined. Add a CHANGELOG entry. Do not disturb the CLAUDE.md anchor grep `function humanizeTemplateError`, which still resolves.

## Acceptance Criteria

- **Signature and interpolation.** PASS = `(message, field = 'Template')` and zero hard-coded `'Body copy: '` inside the function.
- **Both call sites attributed.** PASS = two `applyTestData` arms pass `attributeTemplateError(e.message)`.
- **Coverage pinned.** PASS = five source entries; config row green and reddens if an entry is removed.
- **Neutral default.** PASS = no-field fixture yields `'Template: '`.
- **Existing fixture preserved.** PASS = the `Body copy: TypeError` row green via explicit `field`, assertion unchanged.
- **Microcopy attribution.** PASS = microcopy fixture green.
- **Browser end to end.** PASS = correct field named for microcopy and preheader; neutral prefix for the split-token case.
- **Docs.** PASS = CODE-PATTERNS and README updated; CHANGELOG entry; anchor guard green.

## Test Strategy

Fixtures in `index.html`, in `HUMANIZE_FIXTURES` plus one `renderPredicateFixtures` config row.

Target 1 splits into three rows because the parameter has three distinct behaviors: explicit field (the repurposed existing row), omitted field (new default row), and a second explicit field on a different branch (the microcopy row, which also proves the interpolation reaches the `CLOSE_BLOCK` branch and not just the render-time fallback). Note that the existing `Body copy: TypeError` row is *modified, not replaced* — the briefing's claim that every existing `expected_pattern` is prefix-agnostic is wrong, and that row is the one that would have gone red silently.

Target 2's config row is deliberately a coverage assertion rather than a behavior test. `attributeTemplateError` cannot be fixture-tested without seeding five live editors and restoring them afterwards — the same save/restore hazard TASK-034 just cleaned up in the microcopy guard — so I test the *table* declaratively and the *matching* manually in step 7. Asserting the length pins the property that actually regresses: a new token-bearing field silently missing from attribution.

No mocking. `humanizeTemplateError` is pure; `TEMPLATE_ERROR_SOURCES` is inspected as data, never invoked, by the config row.

## Hardest Decision

Whether to thread the field through at all, or take the cheap correct answer and use a neutral `"Template: "` prefix everywhere. The neutral prefix is two lines, cannot ever be wrong, and needs no heuristic. I chose threading because the prefix's whole job is to route the marketer to a field, and this app has five token-bearing inputs on one long scrolling page — "Template: unclosed {{#if}} block" is accurate and unhelpful, which is the failure mode CLAUDE.md's humanization convention exists to prevent. The compromise that makes threading safe is that attribution is *biased toward giving up*: every uncertain case — escaped entities, a token split by formatting, a token present in two fields — returns `'Template'` rather than guessing. That preserves the neutral option as the floor while recovering the useful case, which is the common one (a marketer types a broken token into one field and nowhere else).

The needle-extraction regex is the load-bearing weak point, and I would rather it under-match than over-match. It is scoped to `{{`-prefixed runs with a conservative character class for exactly that reason.

## Rejected Alternatives

- **Neutral `"Template: "` prefix only.** Rejected above. Would change my mind if step 7 shows attribution landing on the wrong field in any realistic case — a wrong name is worse than no name, and the fallback-only version stays available as a two-line retreat.
- **Thread the field from the producing code path** rather than reverse-matching from the error. Architecturally correct, and rejected as a much larger change: `buildMjml` assembles one string from every field, and threading provenance would mean carrying source offsets through MJML compilation. Would change my mind if the app ever needed per-field error underlining.
- **Attribute by re-compiling each field's content separately** to see which one throws. More accurate than substring matching and rejected on cost and side effects: five extra Handlebars compiles on every failing render, and a field that is only invalid *in combination* (an `{{#if}}` opened in body-above and closed in body-below) would be misattributed as two separate errors.
- **Deleting the `Body copy: TypeError` fixture** instead of adding `field` to it. Rejected: it is the only row pinning the prefix at all, and repurposing it to pin the threading costs one property.

## Lowest Confidence Area

Whether the needle extracted from a Handlebars message ever matches Quill's `innerHTML` in practice. Handlebars parse errors quote the compiled source line, which by then has been through MJML compilation and HTML escaping, so the quoted `{{#equals foo "bar"}}` may differ from what sits in the editor — quotes escaped to `&quot;`, or the token interrupted by a `<strong>` tag the marketer applied mid-token. Every such case falls through to `'Template'`, so the failure is safe but the feature may attribute less often than it appears to on paper. Step 7's three-part browser check is the real measurement; if attribution misses on the plain microcopy case, the fix is to add `getText()`-only matching with whitespace normalised before widening the needle regex.
