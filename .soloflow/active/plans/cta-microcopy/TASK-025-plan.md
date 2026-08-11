---
id: TASK-025
idea: IDEA-006
status: approved
created: 2026-08-11T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - README.md
  - ARCHITECTURE.md
  - CODE-PATTERNS.md
  - .soloflow/active/ideas/IDEA-006.md
acceptance_criteria:
  - criterion: "Both body-copy editors expose an italic toolbar button, and `italic` is on the paste whitelist."
    verification: "grep -n 'richToolbar = ' index.html shows `[['bold', 'italic', 'link'], [{ list: 'ordered' }, { list: 'bullet' }]]`. grep -n 'allowedFormats = ' index.html shows `['bold', 'italic', 'link', 'list']`. In the running app, devtools console: document.querySelectorAll('.rich-editor-wrap .ql-italic').length === 2."
  - criterion: "Italic text survives into the compiled MJML carrying an explicit inline `font-style:italic;`, so no email client's default `em` handling is load-bearing."
    verification: "Harness section titled 'rich-text italics — em/i normalisation' fixture: richTextToMjText('<p>a <em>b</em> c</p>', { ctaBackgroundColor: '#ED1C24' }) output contains the exact substring `<em style=\"font-style:italic;\">b</em>`. Row shows PASS."
  - criterion: "A pasted-through `<i>` element is normalised the same way as `<em>`."
    verification: "Same harness section, fixture: richTextToMjText('<p><i>x</i></p>', tpl) output contains `<i style=\"font-style:italic;\">x</i>`. Row shows PASS."
  - criterion: "Output for content containing no italics is byte-identical to the pre-change function — the new pass touches nothing else."
    verification: "Same harness section, fixture asserting richTextToMjText('<p>plain</p>', tpl) === '        <mj-text padding=\"0 0 14px 0\">\\n          <p style=\"margin:0;\">plain</p>\\n        </mj-text>' (leading indent is 8 spaces, inner indent 10). Row shows PASS. If the observed serialisation differs, capture the value from the CURRENT function before editing it (see Implementation Step 1) and use that as expected — the fixture's purpose is before/after parity, not a guessed literal."
  - criterion: "`<strong>` handling is unchanged — no inline `font-weight` was added while adding the italic pass."
    verification: "grep -n 'font-weight' index.html returns only pre-existing matches (CSS rules and the mj-button mj-attributes line 1627); no occurrence inside richTextToMjText's body."
  - criterion: "The stale source comment claiming italic is stripped on paste no longer says so."
    verification: "grep -n 'italic' index.html: the comment above allowedFormats (currently line 1163, 'anything pasted with other formats (italic, color, headers…)') no longer lists italic among the stripped formats."
  - criterion: "No regressions: every pre-existing harness section still passes and the module script is not truncated."
    verification: "Ctrl+Shift+T in the running app — every row in every pre-existing section shows PASS and the row count for those sections is unchanged. grep -c -F '</script>' index.html returns 3."
  - criterion: "Paste sanitisation now admits italics and still rejects everything else off-whitelist."
    verification: "Manual: copy a line from Word/a web page containing italic text, a colour, and a heading; paste into the Body-above editor. The italics survive as italics; the colour and heading are gone (plain text)."
depends_on: []
estimated_complexity: low
epic: cta-microcopy
test_strategy:
  needed: true
  justification: "richTextToMjText is a pure string-to-string function and the repo's established test surface is the in-app harness (Ctrl+Shift+T), which already tests pure functions with literal fixtures in sections 1-7. The italic pass is exactly that shape, and the byte-parity fixture is the only cheap guard against the new DOM pass perturbing existing output."
  targets:
    - behavior: "em and i elements receive style=\"font-style:italic;\"; non-italic output is byte-identical to pre-change; richToolbar/allowedFormats contain 'italic'"
      test_file: "index.html"
      type: unit
---

# Add italics to the shared rich-text toolbar and normalise it for email

## Objective

Italics does not exist anywhere in this app today: `richToolbar` (`index.html:1161`) offers bold, link, and the two list buttons, and `allowedFormats` (`index.html:1165`) strips italic on paste. IDEA-006's microcopy field is specified as bold + italics + link, and the answered clarification requires italics in the existing body editors too. This task adds the format to the shared config both body editors already read, and normalises `<em>`/`<i>` with an explicit inline `font-style:italic;` on the way into MJML so the rendered result does not depend on any client's default styling of `em`. It is deliberately separate from the microcopy work: it changes both shipped body editors, which is the only regression surface in this epic that a marketer would notice immediately.

**Sequencing note (2026-08-11):** line numbers below are against `index.html` as it stands today, with TASK-014 and the dark-mode epic (TASK-021..024) not yet landed. Locate every anchor by content (the quoted code), not by line number.

## Implementation Steps

1. **Capture the parity baseline first, before any edit.** Add the new harness section (step 5) containing only the parity fixture, with its `expected` left as the empty string so the row FAILs and renders the current output. Have the fixture display `JSON.stringify(actual)` inside the `<pre>` so newlines appear as literal `\n` and the string is copy-pasteable. Open the app, press Ctrl+Shift+T, copy the displayed value verbatim into the fixture's `expected`, reload, and confirm the row is PASS **against the unmodified `richTextToMjText`**. Only then proceed to step 2. This is the only reliable way to get a real before/after byte-parity gate: `richTextToMjText` lives in module scope and cannot be called from the devtools console.
2. **Add the format to the shared toolbar and whitelist.** At `index.html:1161`, change `richToolbar` to `[['bold', 'italic', 'link'], [{ list: 'ordered' }, { list: 'bullet' }]]`. At `index.html:1165`, change `allowedFormats` to `['bold', 'italic', 'link', 'list']`. Both body editors spread these (`index.html:1168-1169`, `1175-1176`), so no per-editor edit is needed. Quill's snow stylesheet is already loaded (`index.html:10`), so the `.ql-italic` button icon ships for free.
3. **Fix the now-false comment.** The comment at `index.html:1162-1164` says pasted italic gets stripped. Rewrite it to state that the whitelist governs paste and that anything outside it (colours, headers, images, tables, base64 data URLs) still degrades to plain text — with italic removed from the stripped list.
4. **Update both placeholders.** `index.html:1171` (`'Enter copy. Bold, lists, and links supported.'`) becomes `'Enter copy. Bold, italics, lists, and links supported.'`. `index.html:1178` (`'Optional.'`) stays as-is — it is deliberately terse.
5. **Normalise `em`/`i` inside `richTextToMjText`.** Insert a single pass immediately **before** the paragraph-margin pass at `index.html:1553-1556` (after the anchor-styling passes, so ordering with links does not matter):
   ```js
   // Italics: email clients almost universally honour <em>, but an explicit
   // inline style removes the dependency on their default stylesheet and
   // survives clients that normalise unrecognised inline tags.
   div.querySelectorAll('em, i').forEach(el => {
     el.setAttribute('style', 'font-style:italic;');
   });
   ```
   Do **not** touch `<strong>` — bold works today with no inline style and changing it would alter existing output for every email that uses bold.
6. **Harness section.** Determine the section number: run `grep -n -- '--- Section' index.html`, take the highest N, use N+1. Add `// --- Section {N+1}: rich-text italics — em/i normalisation (TASK-025) ---` at the end of `renderTestHarness()`, immediately before its closing brace (currently `index.html:2358`), following the Section-2 fixture shape (`{ label, html, check(out), description }`) and its row-rendering loop verbatim. Fixtures are listed under Test Strategy. Title the `<h3>`: `rich-text italics — em/i normalisation`.
7. **Verify.** Run every grep in the acceptance criteria. Press Ctrl+Shift+T and confirm all sections PASS. Do the manual paste check.
8. **Do not touch the prose files.** `grep -rn "'bold', 'link', 'list'\|allowedFormats\|italic" .` also matches `README.md:26`, `README.md:45`, `README.md:130`, `ARCHITECTURE.md:25,35,43`, `CODE-PATTERNS.md:24`, and `Claude Design Handoff - UI ENH-001/reference_current_index.html:597-612`. The README/ARCHITECTURE/CODE-PATTERNS propagation is TASK-028's exclusive ownership (it depends on this task); the design-handoff file is a frozen pre-redesign snapshot explicitly marked "reference only, not production code" (`ARCHITECTURE.md:18`) and must never be edited. Leave all of them alone and say so in the done report.

## Acceptance Criteria

See frontmatter. The load-bearing one is the byte-parity fixture: the new DOM pass must not perturb output for the thousands of characters of non-italic body copy that already flow through this function. The two grep criteria on `richToolbar`/`allowedFormats` are objective completeness gates; the paste behaviour is manual because it depends on clipboard contents.

## Test Strategy

Add one harness section, `rich-text italics — em/i normalisation`, with these fixtures (all call `richTextToMjText(html, { ctaBackgroundColor: '#ED1C24' })`; `#ED1C24` is chosen because it is distinctive enough to spot if it leaks where it should not):

| Input | Check |
|---|---|
| `<p>a <em>b</em> c</p>` | output contains `<em style="font-style:italic;">b</em>` |
| `<p><i>x</i></p>` | output contains `<i style="font-style:italic;">x</i>` |
| `<p><em><strong>x</strong></em></p>` | output contains `font-style:italic;` and still contains `<strong>` with no `style` attribute |
| `<p>plain</p>` | output `===` the value captured in Implementation Step 1 (byte-parity gate) |
| config assertion | `allowedFormats.includes('italic') && JSON.stringify(richToolbar[0]).includes('italic')` |

No mocking, no fixture files — literal strings against module-scope functions, matching sections 1-7.

## Hardest Decision

Whether to emit an inline `font-style:italic;` at all, or to let `<em>` stand alone the way `<strong>` does today. `<em>` is effectively universally supported, so the inline style buys little rendering insurance. It was added for a different reason: it gives the acceptance criteria an objective, greppable hook in the compiled output. Without it, "italics reaches the email" can only be verified by eye in a preview, which is exactly the class of criterion this repo's harness exists to avoid. The cost is three lines and a documented asymmetry with `<strong>` — worth it, and the asymmetry is called out in the code comment so a future maintainer does not "fix" it by styling `strong` too and silently changing every existing email's bold rendering.

## Rejected Alternatives

- **Give microcopy its own toolbar with italics and leave the body editors alone.** Rejected: the answered open question is explicit that italics must be added to `bodyAboveQuill`/`bodyBelowQuill` as well. It would also fork `richToolbar` into two near-identical arrays for no reason.
- **Convert `<em>`/`<i>` into `<span style="font-style:italic">`.** Rejected: throws away the semantic tag for zero rendering benefit and would break the byte-parity story if anyone ever pastes an `<em>` today.
- **Add italics and the microcopy field in one task.** Rejected: this task touches both shipped body editors and the paste sanitiser — the one part of the epic with a real chance of a user-visible regression. It deserves its own review and its own parity gate, independent of the new-feature diff.

## Lowest Confidence Area

The exact expected string in the byte-parity fixture. It is derived by reading the function, not by executing it, so `setAttribute` serialisation details (attribute quoting, whitespace) could differ from my reading. Implementation Step 1 exists precisely to remove this uncertainty — capture the real value from the unmodified function first, and treat any mismatch with my literal as my error, not the code's. Second-order: whether Quill 2's `formats` whitelist accepts `'italic'` as spelled (it does in Quill 2's format registry, same as `'bold'`); if the italic button appears but does nothing, the format name is the first thing to check.
