---
id: TASK-026
idea: IDEA-006
status: approved
created: 2026-08-11T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - README.md
  - CODE-PATTERNS.md
  - .soloflow/active/ideas/IDEA-006.md
acceptance_criteria:
  - criterion: "`richTextToMjText(html, tpl)` called with two arguments produces byte-identical output to the pre-change function for every canonical input."
    verification: "Harness section titled 'richTextToMjText — default parity + style overrides' contains 7 parity fixtures whose expected values were captured from the UNMODIFIED function (see Implementation Step 1) and assert strict `===`. All 7 rows show PASS after the signature change."
  - criterion: "Both existing call sites still pass exactly two arguments — no body-copy call accidentally acquired style overrides."
    verification: "grep -n 'richTextToMjText(' index.html returns exactly 3 lines: the definition, the bodyAbove call, and the bodyBelow call. Neither call site contains a comma after `tpl`."
  - criterion: "Style overrides land as attributes on the mj-text tag in a deterministic order: padding, font-size, color."
    verification: "Harness fixture: richTextToMjText('<p>x</p>', tpl, { fontSize: '13px', color: '#6b6b6b', padding: '0 0 18px 0' }) output begins with the exact substring `<mj-text padding=\"0 0 18px 0\" font-size=\"13px\" color=\"#6b6b6b\">`. Row shows PASS."
  - criterion: "`opts.linkColor` colours EVERY anchor — brand-accent links, manually-inserted phone links, and auto-linked phone numbers — overriding the brand-accent pass."
    verification: "Harness fixtures with tpl = { ctaBackgroundColor: '#ED1C24' } and opts.linkColor = '#6b6b6b': (a) '<p><a href=\"https://x.test\">c</a></p>' output contains `color:#6b6b6b` and does NOT contain `#ED1C24`; (b) '<p><a href=\"tel:5551234567\" data-link-type=\"phone\">c</a></p>' output contains `color:#6b6b6b` and does NOT contain `#0000ee`; (c) '<p>Call 555-123-4567.</p>' output's generated anchor contains `color:#6b6b6b`. All PASS."
  - criterion: "With no `linkColor`, auto-linked phone anchors remain unstyled exactly as today — the new anchor pass is opt-in only."
    verification: "Parity fixture: richTextToMjText('<p>Call 555-123-4567.</p>', tpl) === the value captured in Implementation Step 1, in which the generated `<a href=\"tel:...\">` carries no style attribute. Row shows PASS."
  - criterion: "`opts.convertTypedBullets: false` leaves an asterisk- or dash-prefixed paragraph as a paragraph."
    verification: "Harness fixture: richTextToMjText('<p>* Restrictions apply.</p>', tpl, { convertTypedBullets: false }) output contains no `<ul` and contains the literal `* Restrictions apply.`. The paired fixture with the flag omitted still produces `<ul`. Both PASS."
  - criterion: "`opts.blockMargin` controls the paragraph/list bottom margin; the last-block margin-zeroing still applies."
    verification: "Harness fixture: richTextToMjText('<p>one</p><p>two</p>', tpl, { blockMargin: 8 }) output contains `margin:0 0 8px 0;` for the first paragraph and `margin:0;` for the last. Row shows PASS."
  - criterion: "All 8 brand entries in `templates` carry `ctaMicrocopyFontSize` and `ctaMicrocopyColor`, both referencing shared default constants."
    verification: "grep -c 'ctaMicrocopyFontSize:' index.html returns 8. grep -c 'ctaMicrocopyColor:' index.html returns 8. grep -n 'DEFAULT_CTA_MICROCOPY_FONT_SIZE = \\|DEFAULT_CTA_MICROCOPY_COLOR = ' index.html returns 2 lines, both adjacent to DEFAULT_UNSUBSCRIBE (currently line 966), with values '13px' and '#6b6b6b'."
  - criterion: "The TEMPLATE CONFIGS header comment documents the two new keys."
    verification: "grep -n 'ctaMicrocopy' index.html shows entries inside the comment block that currently spans lines 956-965, describing both keys and naming the shared defaults."
  - criterion: "`hasRichHtml(html)` exists as the single pure emptiness predicate; `hasRichContent(quill)` delegates to it and `richTextToMjText` uses it for its early return."
    verification: "grep -n 'function hasRichHtml\\|function hasRichContent' index.html returns both. The body of hasRichContent is a single return statement calling hasRichHtml(quill.root.innerHTML). Harness fixtures: hasRichHtml('') === false, hasRichHtml('<p><br></p>') === false, hasRichHtml('<p></p>') === false, hasRichHtml('  ') === false, hasRichHtml('<p>x</p>') === true. All PASS."
  - criterion: "Live preview and copied HTML for existing content are unchanged."
    verification: "Manual: before the edit, enter body copy containing bold, a link, a bulleted list, and a plaintext phone number, open View HTML, and save the text to a scratch file. After the edit, repeat with identical input and diff — zero differences."
  - criterion: "No regressions: all pre-existing harness sections pass and the module script is not truncated."
    verification: "Ctrl+Shift+T — every row in every pre-existing section shows PASS. grep -c -F '</script>' index.html returns 3."
depends_on: [TASK-025]
estimated_complexity: medium
epic: cta-microcopy
test_strategy:
  needed: true
  justification: "This task changes the signature of the single most load-bearing pure function in the app — every character of body copy in every email flows through it. The byte-parity fixtures are the whole point: they are the only mechanism that proves the refactor is behaviour-preserving for the two existing call sites, and they must be made green against the UNMODIFIED function before the change is made."
  targets:
    - behavior: "Two-arg calls byte-identical to pre-change (7 canonical inputs); fontSize/color/padding attribute emission and order; linkColor covering all three anchor classes; convertTypedBullets:false; blockMargin; hasRichHtml predicate"
      test_file: "index.html"
      type: unit
---

# Parameterize `richTextToMjText` with style options and add the per-brand microcopy style keys

## Objective

Microcopy needs the same 120 lines of list normalisation, typed-bullet handling, phone auto-linking, and margin discipline as body copy, but with a different font size, a muted colour, muted links, tighter block margins, and the typed-bullet converter switched off. `richTextToMjText` (`index.html:1449-1573`) hard-codes every one of those decisions. This task adds an optional third `opts` argument whose defaults reproduce today's behaviour exactly, and adds the two per-brand config keys the microcopy variant will read — following the `DEFAULT_UNSUBSCRIBE` + per-brand-slot pattern at `index.html:966`. It also extracts `hasRichHtml(html)` as the single pure emptiness predicate, currently duplicated between `hasRichContent` (`index.html:2723-2727`) and `richTextToMjText`'s early return. No new UI, no new emission — the next task consumes all of this.

**Sequencing note (2026-08-11):** line numbers assume TASK-025 has landed and that TASK-014 / the dark-mode epic have not. Locate anchors by content.

## Implementation Steps

1. **Capture the parity baseline before touching the function.** Add the new harness section containing only the 7 parity fixtures, each with `expected: ''` so every row FAILs and renders `JSON.stringify(actual)` inside its `<pre>`. Open the app, press Ctrl+Shift+T, copy each displayed value verbatim into its fixture's `expected`, reload, and confirm all 7 PASS against the **unmodified** `richTextToMjText`. The 7 canonical inputs, all with `tpl = { ctaBackgroundColor: '#ED1C24' }`:
   `''` · `'<p><br></p>'` · `'<p>plain</p>'` · `'<p>a <strong>b</strong> <a href="https://x.test">c</a></p>'` · `'<ol><li data-list="bullet">one</li><li data-list="bullet">two</li></ol>'` · `'<p>Call 555-123-4567 now.</p>'` · `'<p>* Restrictions apply.</p>'`
   Do not proceed until all 7 are green. These fixtures are the acceptance gate for the entire task.
2. **Add the shared default constants.** Immediately after `DEFAULT_UNSUBSCRIBE` (`index.html:966`):
   ```js
   // Microcopy style — the optional supporting sentence under the CTA button.
   // Deliberately a third step on the size scale: body 16px, microcopy 13px,
   // unsubscribe 12px, disclosure 11px. #6b6b6b is the app's single muted token
   // and gives 5.3:1 against the white content card (passes WCAG AA).
   const DEFAULT_CTA_MICROCOPY_FONT_SIZE = '13px';
   const DEFAULT_CTA_MICROCOPY_COLOR = '#6b6b6b';
   ```
3. **Add the two keys to all 8 brand entries.** In each of the 8 objects in `templates` (`postmanLaw` 969, `nationalDisabilityCenter` 989, `kellerPostman` 1004, `kellerPostmanLead` 1024, `wettermarkKeith` 1043, `nationalJusticeCenter` 1061, `parrishDevaughn` 1076, `kechesLead` 1096), insert immediately after the `ctaTextColor` line:
   ```js
   ctaMicrocopyFontSize: DEFAULT_CTA_MICROCOPY_FONT_SIZE,
   ctaMicrocopyColor: DEFAULT_CTA_MICROCOPY_COLOR,
   ```
   All 8 resolve to the same value today — that is intentional; the slot exists so a brand can diverge without touching the renderer. There are **8** brand entries, not 9 (verify with `grep -c 'unsubscribeHtml: DEFAULT_UNSUBSCRIBE' index.html` → 8).
4. **Document them in the header comment.** Extend the `TEMPLATE CONFIGS` comment block (`index.html:956-965`) with two lines describing `ctaMicrocopyFontSize` and `ctaMicrocopyColor`, in the same aligned style as the existing entries, naming the shared defaults.
5. **Extract `hasRichHtml`.** Define it directly above `richTextToMjText`:
   ```js
   // Pure: does this Quill innerHTML carry any real content? Quill's "empty"
   // states are '', '<p><br></p>', and '<p></p>'.
   function hasRichHtml(html) {
     if (!html) return false;
     const cleaned = html.replace(/<p><br><\/p>/g, '').trim();
     return !!(cleaned && cleaned !== '<p></p>');
   }
   ```
   Replace `richTextToMjText`'s two early-return lines (`index.html:1450`, `1453`) with `if (!hasRichHtml(html)) return '';` followed by the existing `const cleaned = ...` assignment (keep it — the function needs the value). Replace the body of `hasRichContent` (`index.html:2723-2727`) with `return hasRichHtml(quill.root.innerHTML);`, keeping the function and its name so `runCopyAction()` (`index.html:2820`) is untouched.
6. **Add the `opts` parameter.** Change the signature to `function richTextToMjText(html, tpl, opts = {})` and destructure with defaults at the top of the body:
   ```js
   const {
     fontSize = null,        // mj-text font-size attribute; null = inherit mj-attributes (16px)
     color = null,           // mj-text color attribute; null = inherit (#333333)
     linkColor = null,       // when set, overrides the brand-accent + phone-blue link passes
     padding = '0 0 14px 0', // mj-text padding attribute
     blockMargin = 14,       // p/ul/ol bottom margin in px
     convertTypedBullets = true,
   } = opts;
   ```
7. **Gate the typed-bullet block.** Wrap the block at `index.html:1495-1534` in `if (convertTypedBullets) { … }`. Keep the existing explanatory comment and add one line: microcopy passes `false` because fine-print starting with `*` or `—` is a sentence, not a list.
8. **Rework the three anchor passes** (`index.html:1543-1551`) into:
   ```js
   const urlLinkColor = linkColor || tpl.ctaBackgroundColor;
   const phoneLinkColor = linkColor || '#0000ee';
   div.querySelectorAll('a:not([data-autolinked]):not([data-link-type="phone"])').forEach(a => {
     a.setAttribute('style', `color:${urlLinkColor};text-decoration:underline;`);
     a.setAttribute('target', '_blank');
   });
   div.querySelectorAll('a[data-link-type="phone"]').forEach(a => {
     a.setAttribute('style', `color:${phoneLinkColor};text-decoration:underline;`);
     a.removeAttribute('data-link-type');
   });
   // Auto-linked phones are intentionally left unstyled in body copy (they
   // inherit the client's default link colour). A caller that specifies
   // linkColor wants EVERY anchor muted, including these.
   if (linkColor) {
     div.querySelectorAll('a[data-autolinked]').forEach(a => {
       a.setAttribute('style', `color:${linkColor};text-decoration:underline;`);
     });
   }
   ```
   Note the second pass keeps `text-decoration:underline;` — that matches the current literal at `index.html:1548` exactly; do not reformat it, the parity fixtures compare byte-for-byte.
9. **Thread `blockMargin`.** In the three margin passes (`index.html:1554-1564`), replace the literal `14px` with `${blockMargin}px` for `p` and for `ul, ol`. Leave the `li` margin at `0 0 6px 0` — it is a within-list rhythm, not a block gap. The last-block zeroing (`index.html:1567-1570`) is unchanged.
10. **Assemble the mj-text attributes.** Replace the return at `index.html:1572` with:
    ```js
    const attrs = [
      `padding="${escapeHtml(padding)}"`,
      fontSize ? `font-size="${escapeHtml(fontSize)}"` : '',
      color ? `color="${escapeHtml(color)}"` : '',
    ].filter(Boolean).join(' ');
    return `        <mj-text ${attrs}>\n          ${div.innerHTML}\n        </mj-text>`;
    ```
    With `opts` empty this yields `        <mj-text padding="0 0 14px 0">…` — byte-identical to today. The order (padding, font-size, color) is fixed so fixtures can assert an exact substring.
11. **Leave both call sites two-arg.** `index.html:1638` and `1642` are unchanged. Confirm with the grep in the acceptance criteria.
12. **Extend the harness section** with the override fixtures listed under Test Strategy, alongside the 7 parity fixtures from step 1. Section number = `grep -n -- '--- Section' index.html` highest + 1; `<h3>` title `richTextToMjText — default parity + style overrides`.
13. **Verify.** Every grep in the acceptance criteria, the full harness run, and the manual before/after View HTML diff.

## Acceptance Criteria

See frontmatter. The 7 parity fixtures are the gate — if any of them is red after the refactor, the refactor is wrong, full stop. The `grep -c 'ctaMicrocopyFontSize:' === 8` check is the completeness gate for the config sweep across brand entries.

## Test Strategy

One harness section, `richTextToMjText — default parity + style overrides`, holding:

- **7 parity fixtures** (step 1 inputs, `expected` captured pre-change, strict `===`).
- **Override fixtures**, all against `tpl = { ctaBackgroundColor: '#ED1C24', ctaMicrocopyFontSize: '13px', ctaMicrocopyColor: '#6b6b6b' }`:
  - attribute emission + order → output starts with `<mj-text padding="0 0 18px 0" font-size="13px" color="#6b6b6b">`
  - `linkColor` on a URL link → contains `color:#6b6b6b`, does not contain `#ED1C24`
  - `linkColor` on a manual phone link → contains `color:#6b6b6b`, does not contain `#0000ee`
  - `linkColor` on an auto-linked phone → generated anchor contains `color:#6b6b6b`
  - `convertTypedBullets: false` on `'<p>* Restrictions apply.</p>'` → no `<ul`, literal `*` retained
  - `blockMargin: 8` on two paragraphs → first `margin:0 0 8px 0;`, last `margin:0;`
- **`hasRichHtml` fixtures**: `''`, `'<p><br></p>'`, `'<p></p>'`, `'  '` → false; `'<p>x</p>'` → true.

No mocking; literal strings against module-scope pure functions, matching sections 1-7.

## Hardest Decision

Options object versus a `variant: 'body' | 'microcopy'` string. The variant approach keeps the call sites shorter and puts the whole microcopy style in one place inside the function — but it drags brand-config knowledge (`tpl.ctaMicrocopyColor`) into a function that is otherwise style-agnostic except for `tpl.ctaBackgroundColor`, and it makes the function grow a new branch for every future variant. The options object keeps `richTextToMjText` a mechanism and leaves policy with the caller, which is where the brand config already lives. The cost is a six-field destructure whose defaults must reproduce today's behaviour byte-for-byte — which is precisely why the parity fixtures had to be made green against the unmodified function *first*. Getting that ordering right was the real decision; without it, "byte-identical" is an assertion rather than a test.

## Rejected Alternatives

- **A separate `microcopyToMjText()` function.** Rejected: duplicates ~120 lines of list normalisation, bullet detection, phone auto-linking, and margin handling, all of which microcopy needs. Two copies of the Quill-`<ol>`-quirk workaround is a guaranteed future divergence bug. Would reconsider only if microcopy needed a fundamentally different pipeline, which it does not.
- **A per-brand `ctaMicrocopyStyle` object instead of two flat keys.** Rejected: the config schema is flat scalars (`ctaBackgroundColor`, `ctaTextColor`, `bannerWidth`) and README documents it that way; a nested object would make a partial override (colour only) require spreading or duplicating the whole object. Would reconsider if the microcopy surface grew past three or four properties.
- **Making padding and line-height brand-configurable too.** Rejected: brands care about size and colour; padding is layout, and every extra key is eight more lines across the brand entries plus a README row. They stay module constants inside the caller.
- **Doing the config keys in TASK-027 with the rest of the microcopy work.** Rejected: this task's diff is a signature change to the app's hottest pure function and deserves to be reviewed against nothing but its parity fixtures. Bundling it with new UI would bury it.

## Lowest Confidence Area

Whether all 7 parity fixtures actually come out green on the first attempt after the refactor. The likeliest failure is a whitespace or attribute-order difference I have not anticipated in the mj-text assembly, or the `text-decoration:underline;` literal in the phone-link pass drifting by a character. If a fixture fails, diff the two strings character-by-character rather than adjusting the expected value — the expected value came from the real pre-change function and is authoritative. Second-order: `escapeHtml()` applied to config-supplied `padding`/`fontSize`/`color`. These are developer-authored, never user input, so escaping is defensive only; if it perturbs a value (it should not for `13px`, `#6b6b6b`, or `0 0 18px 0`), the parity fixture on `padding` will catch it immediately.
