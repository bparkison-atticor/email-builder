---
id: TASK-039
idea: SPRINT-008-proposal
status: approved
created: 2026-08-19T15:00:00Z
files_owned:
  - index.html
  - CODE-PATTERNS.md
  - CHANGELOG.md
files_readonly:
  - .soloflow/active/findings/SPRINT-008-findings.md
acceptance_criteria:
  - criterion: "One shared cleaner backs both consumers of the Quill-emptiness contract"
    verification: "grep `function stripQuillEmptyParagraphs` in index.html returns exactly one definition, and it is called by both hasRichHtml (grep `function hasRichHtml`) and richTextToMjText's parse-input step (grep `div.innerHTML = cleaned`). Neither function still contains its own inline `html.replace(/<p><br><\\/p>/g, '').trim()`."
  - criterion: "An armed-but-unused cursor reports the editor as empty"
    verification: "New harness fixtures: hasRichHtml('<p><em><span class=\"ql-cursor\">\\uFEFF</span></em></p>') === false, and the same for a <strong> wrapper, a bare <span class=\"ql-cursor\"> with no inline wrapper, and a nested <em><strong> pair. All rows PASS."
  - criterion: "The same shape emits nothing from the microcopy block"
    verification: "A new MICROCOPY_BLOCK_FIXTURES row asserts buildMicrocopyBlock returns '' for the armed-cursor shape. Row reads PASS."
  - criterion: "ctaButtonPadding no longer flips on an armed cursor"
    verification: "A new CTA_BUTTON_PADDING_FIXTURES row asserts ctaButtonPadding('<p><em><span class=\"ql-cursor\">\\uFEFF</span></em></p>') === '14px 0 18px 0' (the no-microcopy value). Row reads PASS."
  - criterion: "U+FEFF cannot reach compiled output when the editor does have real content"
    verification: "A new RICHTEXT_PARITY_FIXTURES row feeds '<p><em><span class=\"ql-cursor\">\\uFEFF</span></em>hello</p>' and asserts the full emitted string contains neither 'ql-cursor' nor U+FEFF. Expected literal captured from the browser."
  - criterion: "Byte parity holds for every pre-existing case"
    verification: "All seven original RICHTEXT_PARITY_FIXTURES rows and all five original HAS_RICH_HTML_FIXTURES rows pass unedited. In particular hasRichHtml('<p></p>') and hasRichHtml('<p><br></p>') still return false and hasRichHtml('<p>x</p>') still returns true."
  - criterion: "Reproduced manually end to end"
    verification: "Serve the app. Click into the empty CTA microcopy editor, click Bold, type nothing, click elsewhere. #ctaMicrocopyCount reads 0 AND the compiled output (Copy HTML) contains no muted mj-text block after the CTA button and the button's padding is '14px 0 18px 0'. Before this task the same steps emit a spurious block and flip the padding to '14px 0 6px 0'."
  - criterion: "Docs record the shared cleaner"
    verification: "CODE-PATTERNS.md documents stripQuillEmptyParagraphs as the single Quill-artifact cleaner with a grep anchor that resolves, naming both call sites. CHANGELOG.md has an entry. Documentation anchor drift guard passes."
depends_on: [TASK-038]
estimated_complexity: medium
epic: richtext-output-fidelity
test_strategy:
  needed: true
  justification: "A single-function change with a wide blast radius: three editors, two consumers of the predicate, and the byte-parity contract for all body copy. Every consumer needs its own fixture, and the existing parity fixtures are the regression gate."
  targets:
    - behavior: "hasRichHtml returns false for every armed-cursor shape (bare, single wrapper, nested wrappers) and still returns true for real content"
      test_file: "index.html"
      type: unit
    - behavior: "buildMicrocopyBlock emits '' and ctaButtonPadding returns the no-microcopy value for the armed-cursor shape"
      test_file: "index.html"
      type: unit
    - behavior: "richTextToMjText strips the cursor span and U+FEFF when real content is present, and emits byte-identical output for all pre-existing inputs"
      test_file: "index.html"
      type: unit
---

# Strip Quill's armed-but-unused cursor artifact before the emptiness test

## Objective

Click into an empty editor, click Bold or Italic, type nothing: Quill leaves `<p><em><span class="ql-cursor">\uFEFF</span></em></p>` in `root.innerHTML`. `hasRichHtml` only recognises `<p><br></p>` and `<p></p>` as empty, so the editor reports content, and the cursor span plus its zero-width no-break space reach `lastHtml` — the exact string Copy HTML hands to SendGrid. It persists after blur and does not self-heal. `ql-cursor` appears nowhere in `index.html` today; only `.ql-ui` is removed. The CTA microcopy editor makes it user-visible: `ctaButtonPadding` flips to the with-caption value and a spurious muted `mj-text` block is emitted while `#ctaMicrocopyCount` reads 0 — the UI says empty and the output disagrees. This task introduces the shared cleaner both consumers were always supposed to have and teaches it about the cursor artifact.

## Implementation Steps

1. **Check for an existing helper first.** `grep -n 'stripQuillEmptyParagraphs' index.html`. As of this plan's writing it did **not** exist at probe time, but a concurrent compound clean-up pass introduces it (both `hasRichHtml` and `richTextToMjText` delegating to one shared cleaner). If it exists, extend it in place and keep the name; if not, create it with that name so the two efforts converge rather than producing two cleaners.

2. **Write (or extend) the shared cleaner** as a module-scope pure function immediately above `hasRichHtml`:
   - `String(html ?? '')` coercion.
   - Remove cursor spans: `.replace(/<span class="ql-cursor">[\s\S]*?<\/span>/g, '')`. Non-greedy, and `[\s\S]` rather than `.` so a newline inside the span cannot defeat it.
   - Remove any stray zero-width no-break space: `.replace(/\uFEFF/g, '')`.
   - **Collapse inline wrappers left empty by that removal**, iterating to fixpoint: `do { prev = out; out = out.replace(/<(em|strong|s|u|a|span)(\s[^>]*)?><\/\1>/g, ''); } while (out !== prev);`. This step is what makes the fix actually work — without it, `<p><em><span class="ql-cursor">\uFEFF</span></em></p>` becomes `<p><em></em></p>`, which is neither `<p><br></p>` nor `<p></p>`, so `hasRichHtml` would still return `true`. The loop handles the nested `<em><strong>` case Quill produces when both formats are armed.
   - Remove `<p><br></p>` and `.trim()`, exactly as both call sites do today.
   - **Do not** remove `<p></p>`: today's `richTextToMjText` keeps it, and dropping it would change emitted output for input like `<p>a</p><p></p><p>b</p>` — out of scope for this fix. `hasRichHtml` keeps its own `!== '<p></p>'` comparison.

   Write a header comment naming the artifact, why it exists (an armed-but-unused format), both consumers, and the fixpoint loop's purpose. The name under-describes what the function does; say so in the comment.

3. **Route `hasRichHtml` through it**: `const cleaned = stripQuillEmptyParagraphs(html); return !!(cleaned && cleaned !== '<p></p>');`. Keep the `if (!html) return false;` guard.

4. **Route `richTextToMjText` through it**: replace its inline `const cleaned = html.replace(...).trim();` with `const cleaned = stripQuillEmptyParagraphs(html);`. Update the adjacent comment, which currently only mentions empty paragraphs. Leave the `.ql-ui` removal alone — it operates on the parsed DOM and covers a different artifact. (If the concurrent clean-up pass already landed, both routings exist — this step reduces to updating the comment and confirming the helper carries the new artifact handling.)

5. **Add fixtures for every consumer.** Four `HAS_RICH_HTML_FIXTURES` rows (bare cursor span; `<em>` wrapper; `<strong>` wrapper; nested `<em><strong>`), one `MICROCOPY_BLOCK_FIXTURES` row (emits `''`), one `CTA_BUTTON_PADDING_FIXTURES` row (returns the no-microcopy value), and one `RICHTEXT_PARITY_FIXTURES` row for the real-content case. Use `\uFEFF` escapes in the fixture strings rather than pasting an invisible character into the source — an invisible literal in a fixture is unreviewable and a future editor will delete it by accident. Capture the parity row's expected literal from the browser.

6. **Verify byte parity.** All seven original parity rows and all five original `hasRichHtml` rows must pass unedited. The fixpoint loop is the risk: it strips `<a href="x"></a>` if an anchor is genuinely empty. No existing fixture produces one, and the `formats` whitelist means an empty anchor carries no visible content anyway, but confirm the `bold + link` and auto-link parity rows specifically.

7. **Reproduce and confirm manually.** Follow the exact repro from the finding: click into the empty microcopy editor, click Bold, type nothing, click away. Confirm the char count reads 0, Copy HTML emits no muted block after the CTA button, and the button padding is the no-microcopy value. Repeat in one body editor to confirm the emission gate holds there too.

8. **Document.** Add a CODE-PATTERNS.md Shared Utilities entry for `stripQuillEmptyParagraphs` with a resolving grep anchor, naming both call sites and stating the contract (removes cursor artifacts, U+FEFF, emptied inline wrappers, and double-Enter paragraphs; deliberately does not remove `<p></p>`). Add a CHANGELOG entry describing the user-visible symptom that goes away.

## Acceptance Criteria

- **One cleaner, both consumers.** PASS = single definition, called by both, no inline duplicate remaining.
- **Emptiness correct for all armed shapes.** PASS = four `hasRichHtml` rows false, including nested wrappers.
- **Microcopy gate.** PASS = `buildMicrocopyBlock` returns `''` for the armed shape.
- **Padding stable.** PASS = `ctaButtonPadding` returns the no-microcopy value for the armed shape.
- **No artifact in real output.** PASS = parity row for content-plus-cursor contains neither `ql-cursor` nor U+FEFF.
- **Byte parity.** PASS = twelve pre-existing rows green and unedited.
- **Manual repro fixed.** PASS = char count 0, no emitted block, no padding flip.
- **Docs.** PASS = CODE-PATTERNS entry with resolving anchor; CHANGELOG entry; anchor guard green.

## Test Strategy

All fixtures live in `index.html`, spread deliberately across four existing arrays rather than concentrated in a new section — one per consumer, because the bug's severity comes from the blast radius, not from the predicate itself.

Target 1 (`HAS_RICH_HTML_FIXTURES`) needs all four wrapper shapes. The single-wrapper case is what the finding reports, but Quill produces the nested `<em><strong>` form when both formats are armed, and that is the case the fixpoint loop exists for — a one-pass implementation would pass the `<em>`-only fixture and fail the nested one, so testing only the reported shape would ship a half fix.

Target 2 covers the two predicate consumers separately. They share `hasRichHtml`, so a single fixture would technically cover both, but `ctaButtonPadding` is the one with the visible symptom and it is a different function; pinning it directly means a future refactor that gives it its own emptiness logic gets caught.

Target 3 is the regression gate and the more important half. The twelve pre-existing byte-parity and `hasRichHtml` rows must pass **unedited** — this task modifies the cleaning step for all body copy, so any temptation to adjust an expected literal is a signal the fix overreached. The new content-plus-cursor parity row covers the case the finding's proposed fix would have missed had it touched only `hasRichHtml`: real content alongside an armed cursor, where the emptiness gate passes and the artifact ships anyway.

No mocking or fixture files — every function under test is pure and module-scope.

## Hardest Decision

Whether to keep a string-based cleaner or switch `hasRichHtml` to a DOM-and-text-content predicate. Parsing into a div and testing `textContent.trim().length > 0` would handle every artifact shape — present and future — in three lines, with no fixpoint loop and no regex fragility. I rejected it because `hasRichHtml` is the emission gate for the byte-parity contract that CODE-PATTERNS names as a protected property, and a text-content predicate changes the predicate's *meaning*, not just its artifact handling: it would return `false` for any content whose visible text is empty but whose markup is not. Today the `formats` whitelist makes that set empty, so the two definitions agree — but they would diverge the moment a non-text format is whitelisted, and the divergence would appear as silently dropped output rather than a failing fixture. The regex cleaner is uglier and has a fixpoint loop I would rather not write, and it keeps the change to "remove known artifacts" instead of "redefine emptiness".

The secondary decision was keeping the name `stripQuillEmptyParagraphs` even though it now removes cursor spans and inline wrappers too. A precise name (`stripQuillArtifacts`) would be better in isolation; converging with the name the concurrent pass introduced is worth more than the precision, and the header comment carries the real contract.

## Rejected Alternatives

- **DOM/textContent predicate.** Rejected above. Would change my mind if a non-text format were ever whitelisted, at which point the artifact-list approach becomes unmaintainable and the predicate should be redefined deliberately, with the parity fixtures re-captured.
- **Fix only `hasRichHtml`,** as the finding proposed. Rejected: it fixes the gate but leaves U+FEFF shipping whenever the editor has real content alongside an armed cursor — the exact case the new parity fixture covers.
- **Strip `ql-cursor` in `richTextToMjText`'s DOM pass next to `.ql-ui`.** Rejected as the sole fix for the mirror-image reason: it cleans output but leaves the emptiness gate wrong, so the spurious block and padding flip remain. The shared cleaner is what covers both; the `.ql-ui` removal stays where it is.
- **Have Quill not create the artifact** (clearing armed formats on blur). Rejected: fights the editor's own selection model, affects typing behavior, and would need its own manual test matrix across three editors.

## Lowest Confidence Area

The exact markup Quill 2 leaves behind, and therefore whether the four fixture shapes are the complete set. The finding reports `<p><em><span class="ql-cursor">\uFEFF</span></em></p>` from a real reproduction, and the nested and bare variants are inferred, not observed. The cursor span could also carry attributes (`<span class="ql-cursor" style="…">`) in some version, which the current regex — which matches the exact `class="ql-cursor"` attribute string — would miss. If step 7's manual repro shows a shape the fixtures do not cover, widen the regex to `<span[^>]*class="[^"]*\bql-cursor\b[^"]*"[^>]*>` and add the observed shape as a fixture rather than assuming the four are exhaustive.
