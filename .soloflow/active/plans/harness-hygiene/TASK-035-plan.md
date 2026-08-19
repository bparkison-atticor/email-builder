---
id: TASK-035
idea: SPRINT-008-proposal
status: approved
created: 2026-08-19T15:00:00Z
files_owned:
  - index.html
  - CODE-PATTERNS.md
files_readonly:
  - .soloflow/active/findings/SPRINT-008-findings.md
acceptance_criteria:
  - criterion: "Two shared renderers exist and are the only place harness row markup is built"
    verification: "grep `function harnessSection` and grep `function renderHarnessRows` in index.html each return exactly one definition. grep -c `harness-row-label` in index.html returns 3 (one per renderer: harnessSection is header-only, so the three are renderHarnessRows, renderPredicateFixtures, and Section 3's bespoke single-row block)."
  - criterion: "Every h3 header block is built by the shared header helper"
    verification: "grep -c `text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)` in index.html returns 1 (inside harnessSection). grep -c `document.createElement('h3')` returns 1."
  - criterion: "Section titles are unchanged"
    verification: "Every string previously assigned to an h3 textContent still appears verbatim as a harnessSection() title argument. Specifically grep `richTextToMjText — default parity + style overrides` still resolves — CODE-PATTERNS.md cites that section by title, and the Documentation anchor drift guard fails on a broken doc reference."
  - criterion: "Row count and PASS state per section are identical to the pre-refactor run"
    verification: "Before any edit, open the harness over http:// and record the row count and PASS/FAIL state of every section into a scratch file. After each section migration, reopen and compare. Final state: identical row counts per section, and every row PASS."
  - criterion: "A throwing fixture renders as a single FAIL row instead of blanking the harness"
    verification: "Temporarily add a fixture whose function-under-test call throws (e.g. an ITALIC_FIXTURES entry with `html: {}` so richTextToMjText's parse path throws). Reopen the harness: that one row reads FAIL and shows the exception text, and every other section still renders. Remove the fixture."
  - criterion: "Section 13's two hygiene defects are fixed"
    verification: "grep `Section 13: rich-text italics` context: the header comment no longer claims fixture 4's parity literal lives in an `expected` value (it lives in the fixture's `check` comparison). The 'Toolbar/whitelist config includes italic' fixture no longer carries `html: null` and is rendered by renderPredicateFixtures. Its check reads `JSON.stringify(richToolbar).includes('italic')` with no `[0]` index."
  - criterion: "The unexplained blank input box is gone"
    verification: "grep `(none — config assertion)` in index.html returns 0 matches, and no harness row renders an empty Input field. Both former null-input config fixtures (Section 13's italic-config row and Section 15's microcopy-config row) are rendered by renderPredicateFixtures, which emits no Input row at all."
  - criterion: "The microcopy styled-emission row is tightened to startsWith"
    verification: "The 'Styled emission' fixture in MICROCOPY_BLOCK_FIXTURES uses `out.startsWith(...)` against the full eight-space-indented opening tag including all four attributes in emission order, not three separate `includes()` calls. Row reads PASS."
  - criterion: "CODE-PATTERNS.md points future harness authors at the helpers"
    verification: "CODE-PATTERNS.md gains a Shared Utilities entry for the harness renderers with a grep anchor that resolves in index.html. The Documentation anchor drift guard section still passes (ANCHOR_FLOORS['CODE-PATTERNS.md'] is a floor of 18; adding anchors only raises the count)."
depends_on: [TASK-034]
estimated_complexity: high
epic: harness-hygiene
test_strategy:
  needed: true
  justification: "This task's deliverable IS test infrastructure. Its correctness gate is that no assertion changed meaning — verified by per-section row-count and PASS-state parity, plus a deliberate throwing-fixture probe for the new try/catch."
  targets:
    - behavior: "A fixture whose function-under-test throws renders one FAIL row carrying the exception text, and does not abort the remaining sections"
      test_file: "index.html"
      type: integration
    - behavior: "Section 13 and Section 15 config assertions run with no argument passed to the function under test"
      test_file: "index.html"
      type: unit
---

# Consolidate the harness's per-section row and header rendering into two shared helpers

## Objective

`renderTestHarness()` is ~1,300 lines of a ~4,700-line file, and 12 near-identical `for (const fixture of …)` row-render loops plus 16 hand-copied `<h3>` header blocks have measurably diverged: none of the loops guard the *function-under-test* call (only some guard `check()`), so a single throwing fixture blanks the entire harness; three different input labels are in use ("Input HTML" / "Input HTML (JSON)" / "Input text (JSON)"); three different result labels ("Actual output" / "Actual (JSON)" / "Actual"); some rows escape with `escapeHtml` and some with bare `String`; some render an Expected row and some do not; and a `null`-input config fixture renders self-explanatorily in Section 13 but as an unexplained blank box in Section 15. This task extracts one header helper and one row helper, migrates every loop onto them, and folds in the accumulated hygiene defects that the divergence was hiding. No assertion changes meaning.

## Implementation Steps

1. **Record the baseline.** Serve over http://, open Ctrl+Shift+T, and write every section's title, row count, and per-row PASS/FAIL state into a scratch file. This is the migration gate for every step below — do not proceed without it. (Sections are: humanizeTemplateError; safeAttrHtml; clearPromoFields; validatePromoFields; serializePromoCard; promo humanize; script-not-truncated; the four dark-mode/module-toggle predicate sections; dark note; rich-text italics; richTextToMjText parity + overrides + hasRichHtml; CTA microcopy; Documentation anchor drift guard.)

2. **Co-locate the renderers.** Immediately after `body.innerHTML = '';` inside `renderTestHarness`, define the two new helpers and *move* the existing `renderPredicateFixtures` up to sit beside them, so all three renderers are in one place instead of one being buried after Section 6. Function declarations hoist within the enclosing function scope, so the move is behavior-neutral. Update `renderPredicateFixtures`'s header comment: it currently claims the Section 1-6 and 13-15 loops "deliberately do not fit here" — after this task the accurate statement is that predicate-shaped fixtures use `renderPredicateFixtures` and input/expected/actual-shaped fixtures use `renderHarnessRows`.

3. **Add `harnessSection(body, title)`.** Creates the `<h3>`, sets `style.cssText` once, sets `textContent = title`, appends to `body`. Use `margin:0 0 4px` when `body.children.length === 0` and `margin:12px 0 4px` otherwise — that reproduces today's first-header-vs-rest difference without a flag argument. Replace all 16 header blocks with `harnessSection(body, '<the exact existing title>')`. **Do not reword any title**: CODE-PATTERNS.md cites the section "richTextToMjText — default parity + style overrides" by name, and Section 16's anchor guard fails on a doc that points at nothing.

4. **Add `renderHarnessRows(body, fixtures, run, opts = {})`.** `run(fixture)` returns `{ actual, pass, fields }` where `fields` is an optional array of `[label, value]` pairs. The helper owns:
   - **One try/catch around the `run(fixture)` call itself** — not just around `check()`. On throw: `pass = false`, `actual = String((e && e.message) || e)`, and an extra field `['Threw', 'yes']`. This is the fix for the blank-harness failure mode.
   - **One escaping rule.** `fmt(v)` returns `escapeHtml(v)` for strings and `escapeHtml(JSON.stringify(v))` for everything else. `opts.json === true` forces `JSON.stringify` for all values in that section — use it only for the byte-parity sections (`RICHTEXT_PARITY_FIXTURES`, `HAS_RICH_HTML_FIXTURES`, `CTA_BUTTON_PADDING_FIXTURES`, `PLAIN_TEXT_LENGTH_FIXTURES`) where seeing exact whitespace and `\n` is the point. Never `String(v)` bare.
   - **One label vocabulary.** `Input:` (omitted entirely when the fixture carries no `input`/`html`/`text` key); `Expected:` when the fixture has `expected`; `Expected pattern:` when it has `expected_pattern`; `Check:` when it has `description`; then any `fields` pairs; then `Actual:` always; then `Result:` always, rendering `pass ? 'PASS' : failText` with `failText` from `opts.failText` defaulting to `'FAIL'`.
   - Row class `'harness-row ' + (pass ? 'pass' : 'fail')` and the existing `harness-row-label` / `harness-badge` markup, unchanged.

5. **Migrate one section per step, reopening the harness after each and comparing against the step-1 baseline.** The 12 loops, by fixture array: `HUMANIZE_FIXTURES`, `SAFE_ATTR_FIXTURES`, `PROMO_VALIDATION_FIXTURES`, `PROMO_JSONLD_FIXTURES`, `PROMO_HUMANIZE_FIXTURES`, `ITALIC_FIXTURES`, `RICHTEXT_PARITY_FIXTURES`, `RICHTEXT_OVERRIDE_FIXTURES`, `HAS_RICH_HTML_FIXTURES`, `MICROCOPY_BLOCK_FIXTURES`, `CTA_BUTTON_PADDING_FIXTURES`, `PLAIN_TEXT_LENGTH_FIXTURES`. Two need `fields`: `PROMO_VALIDATION_FIXTURES` returns `fields: [['missing', result.missing], ['formatErrors', result.formatErrors]]`, and `RICHTEXT_OVERRIDE_FIXTURES` returns `fields: [['opts', fixture.opts]]`. Row counts must not change; field counts may.

6. **Leave Section 3 bespoke.** `clearPromoFields`'s block has no fixture array, seeds DOM inputs, snapshots and restores a localStorage key, and asserts two named booleans. Forcing it through `renderHarnessRows` would mean inventing a one-element fixture array to hold a procedure. Convert its header to `harnessSection(body, …)` and leave the row build alone. Add a one-line comment saying why it is the one hand-rolled row.

7. **Fold in Section 13's hygiene defects (FIND-SPRINT-008-3).** The header comment currently reads "Fixture 4 (byte-parity) is the load-bearing row here: its `expected` value was captured from the UNMODIFIED richTextToMjText" — but that fixture has no `expected` field; the literal lives in its `check: out => out === '…'` comparison. Correct the comment to say so. Then move the 'Toolbar/whitelist config includes italic' fixture out of `ITALIC_FIXTURES` into a `renderPredicateFixtures(body, [ … ])` call placed immediately after the italic rows, converting it to the no-arg `check()` shape so nothing is passed to `richTextToMjText`, and drop the `[0]` so it reads `JSON.stringify(richToolbar).includes('italic')` — the assertion should cover the whole toolbar, not just its first group.

8. **Fold in the incomplete null-row copy (FIND-SPRINT-008-28).** Do the same move for Section 15's microcopy-config fixture (grep `microcopyToolbar/microcopyFormats are ctaMicrocopyQuill's own consts`): out of `MICROCOPY_BLOCK_FIXTURES`, into a `renderPredicateFixtures` call, no-arg `check()`. Both moves together make the `fixture.html || '(none — config assertion)'` fallback dead — delete it. `renderHarnessRows` then never renders an empty Input box, because it omits the Input row when no input key is present.

9. **Fold in the deferred `startsWith` tightening (FIND-SPRINT-008-15).** The 'Styled emission' fixture in `MICROCOPY_BLOCK_FIXTURES` currently asserts three separate `out.includes(…)` calls, which cannot catch a wrong attribute *order* or a wrong indent. Replace with a single `out.startsWith(…)` against the full opening tag. `richTextToMjText` assembles attributes in the order padding, font-size, color, align, and prefixes eight spaces, so with `MICROCOPY_TPL` the expected prefix is `        <mj-text padding="0 0 18px 0" font-size="13px" color="#6b6b6b" align="center">`. **Do not trust that literal — read the row's own `Actual:` field in the browser and copy the real prefix.** Update the fixture `description` to say the row now pins attribute order and indent, not just presence.

10. **Add the CODE-PATTERNS.md entry.** Under `## Shared Utilities`, add a `### Harness section renderers` entry: location anchored as grep `function renderHarnessRows`; when to use `harnessSection` + `renderHarnessRows` (input/expected/actual fixtures) vs `renderPredicateFixtures` (no-arg `check()` fixtures); the `{ actual, pass, fields }` contract; the `opts.json` escape hatch and why the byte-parity sections use it; and the rule that new harness sections must not hand-roll row markup. Per the Behavioral-claims convention already in that file, cite the deciding constructs by name.

11. **Final gate.** Reopen the harness over http://. Every section's row count matches the step-1 baseline and every row reads PASS, including the Documentation anchor drift guard (which must now also resolve the new CODE-PATTERNS anchor).

## Acceptance Criteria

Restated from the frontmatter, with pass/fail:
- **Two helpers, one markup site.** PASS = single definitions of `harnessSection` and `renderHarnessRows`; exactly three `harness-row-label` occurrences (the two loop renderers plus Section 3's documented bespoke row); exactly one `document.createElement('h3')`.
- **Titles preserved.** PASS = grep `richTextToMjText — default parity + style overrides` still resolves and the anchor guard section is green. FAIL = any title reworded.
- **Assertion-neutral migration.** PASS = per-section row counts identical to the step-1 baseline and every row PASS. FAIL = any count change, or any row that flips state without a fold-in step explaining it (steps 7-9 change *display* and *which helper renders*, never which assertion runs — except step 9, which deliberately tightens one check and must still read PASS).
- **Throw containment.** PASS = a deliberately throwing fixture yields one FAIL row with exception text and every other section still renders.
- **Section 13 hygiene.** PASS = corrected comment; config fixture on the no-arg shape; `richToolbar` asserted without `[0]`.
- **No blank input box.** PASS = zero matches for `(none — config assertion)` and no empty Input field anywhere.
- **`startsWith` tightening.** PASS = single `startsWith` against the full four-attribute opening tag, row green.
- **Doc entry.** PASS = CODE-PATTERNS.md entry present with a resolving grep anchor; anchor guard green.

## Test Strategy

The harness is the test surface being refactored, so the strategy is parity plus one new negative probe, both in `index.html`.

- **Parity (primary gate).** Step 1's recorded baseline versus a reopen after each of the 12 migrations. This is the only thing standing between a mechanical refactor and a silently weakened assertion, so it is per-section, not just at the end.
- **Throw containment (new behavior, target 1).** Temporarily add a fixture that makes the function under test throw — e.g. an `ITALIC_FIXTURES` entry with `html: {}`, since `richTextToMjText` calls `hasRichHtml` then string methods on it. Confirm one FAIL row with the exception text and that Sections 14-16 still render below it. Remove the fixture before finishing; the permanent guarantee is the try/catch, not the probe.
- **No-arg config assertions (target 2).** After steps 7-8, confirm the two migrated config rows still read PASS and that neither passes an argument, by temporarily breaking each one (drop `'italic'` from `allowedFormats`; point `microcopyFormats` at `allowedFormats`) and confirming each reddens independently.

No mocking or fixture files are required — every assertion runs against live module state in the same document.

## Hardest Decision

Whether `renderHarnessRows` should accept a `fields` escape hatch at all. A helper that owns *only* Input/Expected/Check/Actual/Result is simpler and enforces uniformity absolutely — but `PROMO_VALIDATION_FIXTURES` renders `missing` and `formatErrors` as separate rows, and `RICHTEXT_OVERRIDE_FIXTURES` renders `opts`, and folding those into the generic `Actual` field would destroy diagnostic information that exists precisely because those assertions are hard to debug from a boolean. I allowed `fields` because the divergence this task fixes is *inconsistent labels for the same concept*, not *sections having different amounts to show*. The uniformity that matters is that Input is always called Input and always escaped the same way; a section adding a domain-specific field after that is additive, not divergent.

The related call was keeping two Expected labels (`Expected:` for exact match, `Expected pattern:` for substring). One label would be more uniform but would lie about `HUMANIZE_FIXTURES`, where the assertion genuinely is a substring test. Deriving the label deterministically from which key the fixture uses is a rule, not drift.

## Rejected Alternatives

- **One helper doing headers and rows** (`renderHarnessSection(body, title, fixtures, run)`, as FIND-SPRINT-008-4 proposed). Rejected because Section 14 renders three fixture arrays under one header and Section 15 renders four, so a combined helper would either emit spurious headers or need a null-title convention. Splitting into `harnessSection` + `renderHarnessRows` also lets the 8 existing `renderPredicateFixtures` sections adopt the header helper without touching their rows. Would change my mind if a future harness settled on exactly one array per section.
- **Migrating Section 3 too.** Rejected in step 6: it is a procedure, not a fixture table. Would change my mind if a second seed-mutate-restore section appeared, at which point the shared shape is a `run`-with-setup contract worth designing deliberately.
- **Normalising byte-parity sections to raw string display.** Rejected via `opts.json`: those sections exist to catch a changed space or newline, and `<code>` collapses whitespace.
- **Splitting this into two tasks (header half, row half).** Rejected per the skeptic's recommendation — the header blocks sit inside the same 16 regions the row loops do, so two passes means reading the same 1,300 lines twice and a merge-hostile intermediate state.

## Lowest Confidence Area

Step 5's per-section migration holding row counts exactly while steps 7-8 *remove* one fixture from each of two arrays. `ITALIC_FIXTURES` drops from 5 rows to 4 in the italic block, and `MICROCOPY_BLOCK_FIXTURES` loses one row — but each gains a row back from the `renderPredicateFixtures` call placed immediately after. The section-level total is unchanged; the *array*-level count is not. An executor comparing array lengths rather than rendered rows per section heading will think it broke something. The baseline in step 1 must be recorded per section heading, not per fixture array.

Second: I have not counted `SAFE_ATTR_FIXTURES`, `PROMO_JSONLD_FIXTURES`, or `PROMO_HUMANIZE_FIXTURES`, so step 1's baseline — not any number in this plan — is authoritative for them.
