---
id: TASK-027
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
  - criterion: "A microcopy rich-text field is the last child of `#ctaBody`, so the existing CTA-toggle collapse hides it with no change to `createModuleToggle` or `onCtaToggle`."
    verification: "grep -n 'id=\"ctaMicrocopy\"' index.html shows the div inside the `<div class=\"seg-body\" id=\"ctaBody\">` block, after the `.cta-preview` chip and before `</div>`. Harness fixture: els.ctaBody.contains(document.getElementById('ctaMicrocopy')) === true. grep -n 'function createModuleToggle\\|function onCtaToggle' index.html — both bodies are byte-identical to before (git diff shows no hunk inside either)."
  - criterion: "Its toolbar is bold + italics + link only — no list buttons — and lists are off its paste whitelist."
    verification: "grep -n 'microcopyToolbar = \\|microcopyFormats = ' index.html shows `[['bold', 'italic', 'link']]` and `['bold', 'italic', 'link']`. Devtools: document.querySelectorAll('#ctaMicrocopy').length === 1 and the wrap's toolbar has no `.ql-list` button — document.querySelectorAll('.rich-editor-wrap.compact .ql-list').length === 0."
  - criterion: "The link-insert modal works in the microcopy editor exactly as in the body editors."
    verification: "grep -n 'bodyAboveQuill, bodyBelowQuill' index.html shows the toolbar-handler loop now reads `[bodyAboveQuill, bodyBelowQuill, ctaMicrocopyQuill]`. Manual: select a word in the microcopy field, click the link button, insert a phone destination and a URL destination in turn — both apply, and the phone one renders muted in the preview with no `target` attribute in View HTML."
  - criterion: "An empty microcopy field emits nothing and leaves the compiled HTML byte-identical to pre-task output."
    verification: "Harness fixtures: buildMicrocopyBlock('', tpl) === '', buildMicrocopyBlock('<p><br></p>', tpl) === '', buildMicrocopyBlock('<p></p>', tpl) === ''. Manual: before the task, with body copy + CTA filled in, save View HTML output to a scratch file; after the task with microcopy left empty and identical other input, diff — zero differences, including the mj-button's `padding=\"14px 0 18px 0\"`."
  - criterion: "A populated microcopy field emits one muted `mj-text` block immediately after the `mj-button`, reading size and colour from the active brand entry."
    verification: "Harness fixture: buildMicrocopyBlock('<p>No obligation.</p>', { ctaBackgroundColor: '#ED1C24', ctaMicrocopyFontSize: '13px', ctaMicrocopyColor: '#6b6b6b' }) output contains `font-size=\"13px\"`, `color=\"#6b6b6b\"`, and `padding=\"0 0 18px 0\"`. Manual: View HTML shows the microcopy text in the document immediately after the CTA button's table and before any below-CTA body copy."
  - criterion: "The button's bottom padding tightens ONLY when microcopy is present, so the caption sits close to the button without changing output for CTA-only emails."
    verification: "Harness fixtures on the pure helper: ctaButtonPadding('') === '14px 0 18px 0' and ctaButtonPadding('<p>x</p>') === '14px 0 6px 0'. Manual: View HTML with microcopy empty contains `padding:14px 0 18px 0` region unchanged from the pre-task capture; with microcopy filled, the button block's bottom padding is 6px."
  - criterion: "Links inside microcopy are muted, not brand-accent, and auto-linked phones are muted too."
    verification: "Harness fixtures with tpl.ctaBackgroundColor = '#ED1C24': buildMicrocopyBlock('<p><a href=\"https://x.test\">terms</a></p>', tpl) contains `color:#6b6b6b` and does NOT contain `#ED1C24`; buildMicrocopyBlock('<p>Call 555-123-4567.</p>', tpl) generated anchor contains `color:#6b6b6b`. Both PASS."
  - criterion: "An asterisk- or dash-prefixed microcopy sentence stays a sentence — the typed-bullet converter is off for microcopy."
    verification: "Harness fixture: buildMicrocopyBlock('<p>* Restrictions apply.</p>', tpl) output contains no `<ul` and contains the literal `* Restrictions apply.`. Row shows PASS."
  - criterion: "Switching the CTA module off hides the microcopy field AND omits its block from the compiled HTML, without clearing what the marketer typed."
    verification: "Manual: type microcopy, confirm it renders in the preview, click the Call-to-action toggle OFF — the field collapses with the rest of `#ctaBody`, the preview loses both button and microcopy, and View HTML contains neither. Toggle ON — the typed text is still there and reappears in the preview."
  - criterion: "A live character-count hint updates as the marketer types and imposes no limit."
    verification: "Harness fixtures on the pure helper: plainTextLength('abc\\n') === 3, plainTextLength('\\n') === 0, plainTextLength('a\\nb\\n') === 3. Manual: type into the field and watch `#ctaMicrocopyCount` update; paste 400 characters — the count reads past 140, the text is accepted, no error appears, and Copy HTML still succeeds."
  - criterion: "The CTA card's collapse animation still works — `#ctaBody` content height stays under the `.seg-body` max-height ceiling."
    verification: "Harness fixture: els.ctaBody.scrollHeight < 1000 (the `.seg-body { max-height: 1000px }` ceiling at index.html:133). Manual: toggle the CTA module off and on — the collapse/expand animates smoothly with no clipped field."
  - criterion: "Microcopy content does not persist across reloads, and no new localStorage key is written."
    verification: "Manual: type microcopy, reload, field is empty. grep -n 'localStorage.setItem' index.html returns only the pre-existing call sites (the module-toggle factory and the test-data key) — no microcopy key."
  - criterion: "No new validation: Copy HTML succeeds with microcopy empty and the field never gets an invalid outline."
    verification: "grep -n 'ctaMicrocopy' index.html shows no occurrence inside runCopyAction, markInvalid, or the invalid-clearing listener block. Manual: with valid body copy and CTA but empty microcopy, Copy HTML copies successfully."
  - criterion: "No regressions: all pre-existing harness sections pass and the module script is not truncated."
    verification: "Ctrl+Shift+T — every row in every pre-existing section shows PASS, including TASK-026's parity fixtures. grep -c -F '</script>' index.html returns 3."
depends_on: [TASK-025, TASK-026]
estimated_complexity: medium
epic: cta-microcopy
test_strategy:
  needed: true
  justification: "Three new pure functions (buildMicrocopyBlock, ctaButtonPadding, plainTextLength) plus two cheap DOM invariants (microcopy lives inside #ctaBody; #ctaBody fits under the collapse ceiling) are all harness-testable, and they cover every non-obvious behaviour: the empty-emits-nothing gate, the conditional button padding, muted links, and the suppressed typed-bullet converter. Toggle-off behaviour depends on live module state and stays manual."
  targets:
    - behavior: "buildMicrocopyBlock returns '' for all three empty shapes and a muted mj-text otherwise; muted URL/phone/auto-linked anchors; typed-bullet suppression; ctaButtonPadding switch; plainTextLength; #ctaMicrocopy inside #ctaBody; #ctaBody.scrollHeight < 1000"
      test_file: "index.html"
      type: unit
---

# Add the microcopy editor to the CTA module and emit it under the button

## Objective

Wire the marketer-facing half of the feature: a third Quill instance at the bottom of `#ctaBody` with a bold / italics / link toolbar, a live character-count hint, and a compact editor height; plus the emission path in `buildMjml()` that renders it as a muted `mj-text` immediately after the `mj-button`, gated behind the same `ctaToggle.isOn()` check the button already uses (`index.html:1639`). Because the field lives physically inside `#ctaBody`, `onCtaToggle`'s existing `.collapsed` class does the hiding for free — no toggle-factory change. TASK-026 supplied the parameterized renderer and the brand config keys; this task consumes them.

**Sequencing note (2026-08-11):** line numbers assume TASK-025 and TASK-026 have landed. Locate anchors by content.

## Implementation Steps

1. **Markup.** Insert as the final child of `#ctaBody`, immediately after the `.cta-preview` block (currently `index.html:686-688`) and before the closing `</div>` at 689:
   ```html
        <div class="field">
          <label id="ctaMicrocopyLabel">Microcopy <span class="seg-tag">optional</span></label>
          <div class="rich-editor-wrap compact">
            <div id="ctaMicrocopy"></div>
          </div>
          <div class="hint"><span id="ctaMicrocopyCount">0</span> chars · aim for under 140 — two short sentences. Renders as small, muted text directly under the button.</div>
        </div>
   ```
   It goes **after** the preview chip on purpose: the chip previews the button, and this ordering mirrors the rendered email (button, then microcopy). The `<label>` has no `for` because Quill's editable region is a `contenteditable` div, not a form control — step 3 attaches the accessible name via `aria-labelledby`.
2. **CSS.** After the `.rich-editor-wrap .ql-editor.ql-blank::before` rule (`index.html:167-172`), add:
   ```css
   /* Compact variant — microcopy is one or two sentences, not body copy. */
   .rich-editor-wrap.compact .ql-editor { min-height: 64px; }
   ```
   Do not alter the base `.rich-editor-wrap` rules; both body editors read them.
3. **Quill instance.** Immediately after `bodyBelowQuill` (`index.html:1174-1179`) — it must exist before the toolbar-handler loop at `index.html:1280`:
   ```js
   // Microcopy toolbar deliberately omits lists: this is one or two sentences
   // under the button, and the compiled output suppresses the typed-bullet
   // converter so fine-print starting with '*' or '—' stays a sentence.
   const microcopyToolbar = [['bold', 'italic', 'link']];
   const microcopyFormats = ['bold', 'italic', 'link'];

   const ctaMicrocopyQuill = new Quill('#ctaMicrocopy', {
     modules: { toolbar: [...microcopyToolbar] },
     formats: [...microcopyFormats],
     theme: 'snow',
     placeholder: 'Optional. One or two supporting sentences.'
   });
   ctaMicrocopyQuill.root.setAttribute('aria-labelledby', 'ctaMicrocopyLabel');
   ```
4. **Toolbar-handler loop.** At `index.html:1280`, change `[bodyAboveQuill, bodyBelowQuill]` to `[bodyAboveQuill, bodyBelowQuill, ctaMicrocopyQuill]`. Nothing else in the link-modal code needs changing — `openLinkModal(quill)` and `applyLink()` are already editor-agnostic and operate on the captured `ownerEditor`.
5. **`els` entry.** Add `ctaMicrocopyCount: document.getElementById('ctaMicrocopyCount'),` to the `els` object (`index.html:1128-1146`).
6. **Three pure helpers**, placed immediately after `richTextToMjText` and before `buildCtaHref` (currently `index.html:1575`):
   ```js
   // Pure. Length of the visible microcopy text, ignoring Quill's trailing
   // newline(s). Interior newlines (paragraph breaks) count as one char each.
   function plainTextLength(text) {
     return String(text || '').replace(/\n+$/, '').length;
   }

   // Pure. '' for an empty editor; otherwise a muted, smaller mj-text block
   // styled from the active brand's microcopy keys. Links are muted rather than
   // brand-accent, and the typed-bullet converter is off (see microcopyToolbar).
   function buildMicrocopyBlock(html, tpl) {
     if (!hasRichHtml(html)) return '';
     const color = tpl.ctaMicrocopyColor || DEFAULT_CTA_MICROCOPY_COLOR;
     return richTextToMjText(html, tpl, {
       fontSize: tpl.ctaMicrocopyFontSize || DEFAULT_CTA_MICROCOPY_FONT_SIZE,
       color,
       linkColor: color,
       padding: '0 0 18px 0',
       blockMargin: 8,
       convertTypedBullets: false,
     });
   }

   // Pure. The mj-button's padding depends on whether microcopy follows it:
   // with a caption below, the button's own 18px bottom gap would read as a
   // detached sentence, so it tightens to 6px. With no microcopy the value is
   // byte-identical to what shipped before microcopy existed.
   function ctaButtonPadding(microcopyHtml) {
     return hasRichHtml(microcopyHtml) ? '14px 0 6px 0' : '14px 0 18px 0';
   }
   ```
7. **Emission in `buildMjml()`.** After the `ctaRelAttr` assignment (`index.html:1593`), add:
   ```js
   const microcopyHtml = ctaToggle.isOn() ? ctaMicrocopyQuill.root.innerHTML : '';
   const microcopyBlock = buildMicrocopyBlock(microcopyHtml, tpl);
   const ctaPadding = ctaButtonPadding(microcopyHtml);
   ```
   Then in the template literal, change the button's `padding="14px 0 18px 0"` (`index.html:1639`) to `padding="${ctaPadding}"`, and insert the microcopy immediately after the `</mj-button>` line, inside the same `ctaToggle.isOn()` ternary:
   ```
           </mj-button>
   ${microcopyBlock ? microcopyBlock + '\n' : ''}` : ''}${richTextToMjText(bodyBelowQuill.root.innerHTML, tpl)}
   ```
   `richTextToMjText` returns a string already carrying its 8-space indent and no trailing newline, hence the explicit `'\n'`. When microcopy is empty the interpolation contributes nothing and the emitted MJML is byte-identical to today's.
8. **Re-render and count wiring.** After `bodyBelowQuill.on('text-change', scheduleRender);` (`index.html:2596`):
   ```js
   function updateMicrocopyCount() {
     els.ctaMicrocopyCount.textContent = plainTextLength(ctaMicrocopyQuill.getText());
   }
   ctaMicrocopyQuill.on('text-change', () => {
     updateMicrocopyCount();
     scheduleRender();
   });
   ```
   Add `updateMicrocopyCount();` to the startup block alongside `updateCtaPreview();` (`index.html:2985-2989`).
9. **Deliberately do NOT touch:** `createModuleToggle`, `onCtaToggle`, `runCopyAction`, `hasRichContent`, `markInvalid`, the invalid-clearing listener block (`index.html:2766-2789`), or any `localStorage` call site. Microcopy is optional and non-persisted; adding it to any of those would contradict the idea's confirmed assumptions.
10. **Harness section.** Section number = `grep -n -- '--- Section' index.html` highest + 1. `<h3>` title: `CTA microcopy — emission gating and muted styling`. Fixtures under Test Strategy; use the predicate shape (`{ label, check(), description }`) from `TRUNCATION_GUARDS` for the two DOM invariants and the Section-2 shape for the string fixtures.
11. **Verify.** Every grep and manual scenario in the acceptance criteria, including the before/after View HTML diff with microcopy left empty, and the CTA-toggle-off round trip.

## Acceptance Criteria

See frontmatter. Two are load-bearing: (a) with microcopy empty, the compiled HTML must be byte-identical to pre-task output — that is what makes this feature safe to ship to marketers mid-campaign; (b) toggling the CTA off must remove the microcopy from both the UI and the output while preserving what was typed.

## Test Strategy

One harness section, `CTA microcopy — emission gating and muted styling`:

- **Emptiness gate:** `buildMicrocopyBlock('', tpl)`, `('<p><br></p>', tpl)`, `('<p></p>', tpl)` all `=== ''`.
- **Styled emission:** `buildMicrocopyBlock('<p>No obligation.</p>', tpl)` contains `font-size="13px"`, `color="#6b6b6b"`, `padding="0 0 18px 0"`.
- **Muted URL link:** contains `color:#6b6b6b`, does not contain `#ED1C24`.
- **Muted manual phone link** (`data-link-type="phone"`): contains `color:#6b6b6b`, does not contain `#0000ee`.
- **Muted auto-linked phone:** `'<p>Call 555-123-4567.</p>'` → generated anchor contains `color:#6b6b6b`.
- **Typed-bullet suppression:** `'<p>* Restrictions apply.</p>'` → no `<ul`, literal `*` retained.
- **Button padding switch:** `ctaButtonPadding('') === '14px 0 18px 0'`; `ctaButtonPadding('<p>x</p>') === '14px 0 6px 0'`.
- **Char count:** `plainTextLength('abc\n') === 3`, `plainTextLength('\n') === 0`, `plainTextLength('a\nb\n') === 3`, `plainTextLength('') === 0`.
- **DOM invariants** (predicate shape): `els.ctaBody.contains(document.getElementById('ctaMicrocopy'))`; `els.ctaBody.scrollHeight < 1000`.

`tpl` for the string fixtures is the literal `{ ctaBackgroundColor: '#ED1C24', ctaMicrocopyFontSize: '13px', ctaMicrocopyColor: '#6b6b6b' }`. No mocking, no fixture files.

## Hardest Decision

Whether to make the `mj-button`'s bottom padding conditional. Leaving it at `14px 0 18px 0` is the zero-risk choice — but it puts an 18px gap between the button and its own caption, which reads as a detached sentence rather than microcopy attached to the CTA, and no amount of `mj-text` padding can close a gap that belongs to the element above (email has no negative margins). Making it conditional (`6px` when microcopy is present) buys the correct visual relationship while keeping output byte-identical for every email that has no microcopy — which is every email that exists today. The conditionality is the cost: two possible outputs for the same button. That cost is contained by extracting `ctaButtonPadding()` as a named pure function with both branches fixture-asserted, so the divergence is documented and tested rather than buried in a template literal.

## Rejected Alternatives

- **Place the field above the `.cta-preview` chip.** Rejected: the chip previews the button, so the authoring order would no longer mirror the rendered order (button → microcopy). Would reconsider if the chip were ever extended to preview the microcopy too, at which point microcopy should move above it.
- **Emit microcopy inside the `mj-button`'s section as a second `mj-column`.** Rejected: MJML would put it side-by-side on desktop. A sibling `mj-text` in the same column is the only shape that stacks correctly across clients.
- **Keep the typed-bullet converter on for microcopy.** Rejected: `* Restrictions apply.` and `— Terms apply` are the canonical fine-print shapes and both match `BULLET_PREFIX` (`index.html:1501`), so microcopy would silently render as a bulleted list while its own toolbar forbids lists. This is the single most likely real-world failure the feature could have shipped with.
- **Persist microcopy to localStorage.** Rejected: no copy field persists today; doing it for one field would be a surprising asymmetry. Explicitly out of scope per the idea.
- **Add a hard `maxlength`-equivalent.** Rejected: the answered open question specifies a hint with no limit, and Quill has no native maxlength — enforcing one means intercepting `text-change` and truncating, which fights the user mid-sentence.

## Lowest Confidence Area

Constructing a Quill instance inside a container that may be collapsed at page load. If the CTA module toggle was left OFF, `#ctaBody` carries `max-height: 0; overflow: hidden` when `new Quill('#ctaMicrocopy')` runs. The element is still laid out (not `display: none`), so Quill 2 should initialise cleanly — but selection and scroll behaviour in zero-height containers is the kind of thing editors get wrong. Explicit check for the executor: set `localStorage.setItem('emailBuilder.module.cta','false')`, reload, toggle the CTA module ON, then confirm the microcopy editor accepts focus, the placeholder shows, the bold/italic/link buttons all apply, and the link modal's selection capture (`quill.getSelection(true)`) returns a real range rather than falling through to the `getLength() - 1` fallback. If it misbehaves, the fix is to call `ctaMicrocopyQuill.update()` (or re-focus) from `onCtaToggle` when the module is switched on — do not restructure the markup, since placement inside `#ctaBody` is what makes the collapse work for free.
