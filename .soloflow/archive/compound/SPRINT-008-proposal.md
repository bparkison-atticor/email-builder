---
sprints: [SPRINT-008]
span_label: SPRINT-008
created: 2026-08-18T00:00:00Z
counters_start:
  ideas: 8
summary:
  cleanups: 6
  backlog_tasks: 11
  claude_md: 2
  soloflow_improvements: 0
---

# Compound Proposal — SPRINT-008

Sprint scope: epic `cta-microcopy` (TASK-025..028) — italic support, `richTextToMjText` opts parameterization, the CTA microcopy editor, and doc propagation. 31 findings triaged (29 open, 2 already resolved and verified consistent with their done reports — no reconciliation drift found). Two items were considered for Bucket C and suppressed as SoloFlow planning-process defects rather than project conventions; see the note at the end.

## A. Clean-up items (execute now)

### A1. Extract the duplicated Quill-empty-paragraph cleaning regex into one helper
- **Summary:** `hasRichHtml` and `richTextToMjText` each hard-code the identical `html.replace(/<p><br><\/p>/g, '').trim()` cleaning rule; extracting one shared helper removes the duplication before it silently drifts.
- **Source-Sprint:** SPRINT-008
- **Rationale:** TASK-026 unified the *emptiness predicate* (`hasRichContent` now delegates to `hasRichHtml`) but the *cleaning rule* it's built on is still written out twice. If Quill's empty-paragraph shapes are ever extended and only one copy is updated, `richTextToMjText` would parse un-stripped HTML and emit a stray empty paragraph into the compiled email with no test failure — the parity fixtures pin today's inputs, not tomorrow's.
- **Blast radius:** `index.html` only, two call sites (`hasRichHtml` line 1543-1547, `richTextToMjText`'s `cleaned` at line 1561). Output is byte-identical by construction. Risk: trivial.
- **Source:** FIND-SPRINT-008-9 (TASK-026 code-reviewer).
- **Proposed change:**
  ```diff
+ // Shared Quill empty-paragraph cleaning rule — used by both the emptiness
+ // predicate and richTextToMjText's own parse input. Keep these in one place.
+ function stripQuillEmptyParagraphs(html) {
+   return (html || '').replace(/<p><br><\/p>/g, '').trim();
+ }
+
  function hasRichHtml(html) {
    if (!html) return false;
-   const cleaned = html.replace(/<p><br><\/p>/g, '').trim();
+   const cleaned = stripQuillEmptyParagraphs(html);
    return !!(cleaned && cleaned !== '<p></p>');
  }
  ```
  And inside `richTextToMjText` (around line 1561):
  ```diff
- // Strip empty paragraphs Quill inserts when the user hits Enter twice.
- const cleaned = html.replace(/<p><br><\/p>/g, '').trim();
+ // Strip empty paragraphs Quill inserts when the user hits Enter twice.
+ const cleaned = stripQuillEmptyParagraphs(html);
  ```
  Re-run the Section 12 parity fixtures (7 byte-parity + 5 `hasRichHtml` fixtures) to confirm no change.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** `index.html:1545` and `:1561` do carry the identical `html.replace(/<p><br><\/p>/g, '').trim()` literal, and B11's planned change to that cleaning rule inside `hasRichHtml` would otherwise leave `richTextToMjText`'s own `cleaned` on the old rule — which makes the divergence live rather than hypothetical.
- **Counterfactual:** If B11 is not implemented, this drops to a cosmetic two-line dedupe with no forcing function.

### A2. Correct three stale/inaccurate comments left behind by SPRINT-008
- **Summary:** Three comments in the rich-text/toolbar area assert things that are no longer (or were never) true and should be corrected in one pass.
- **Source-Sprint:** SPRINT-008
- **Rationale:** All three are comment-only, no behavior change, and were independently flagged by different reviewers across the sprint — fixing them together avoids a fourth stale comment accumulating nearby (per FIND-SPRINT-008-16's own observation that this would be "the third comment... made stale by SPRINT-008").
- **Blast radius:** `index.html`, three isolated comment blocks. Risk: trivial.
- **Source:** FIND-SPRINT-008-5 (TASK-026 executor/verifier), FIND-SPRINT-008-8 (TASK-026 code-reviewer), FIND-SPRINT-008-16 (TASK-027 code-reviewer).
- **Proposed change:**

  1. Lines 1664-1667 (`richTextToMjText`, third anchor pass) — `autoLinkPhones` hard-codes `style="color:#0000ee;text-decoration:underline;"` on every anchor it creates, so auto-linked phones are blue-*styled at creation time*, not "unstyled":
  ```diff
- // Auto-linked phones are intentionally left unstyled in body copy (they
- // inherit the client's default link colour). A caller that specifies
- // linkColor wants EVERY anchor muted, including these.
+ // Auto-linked phones already carry an inline style from autoLinkPhones()
+ // (color:#0000ee;text-decoration:underline;) — this pass leaves them as-is
+ // in body copy. A caller that specifies linkColor wants EVERY anchor muted,
+ // including these, so it re-styles them here too.
  if (linkColor) {
  ```

  2. Lines 1650-1652 (heading comment for the three anchor passes) — with `linkColor` supplied, manual phone links keep the *caller's* colour via `phoneLinkColor = linkColor || '#0000ee'`, not "standard-blue" unconditionally; "no target" is the only unconditionally-true half:
  ```diff
- // Brand color + target="_blank" only for non-phone links. Both auto-linked
- // phones (data-autolinked="phone") and manually-inserted phone links from
- // the link dialog (data-link-type="phone") keep standard-blue and no target.
+ // Brand colour + target="_blank" for ordinary links; both phone classes
+ // never get a target. Phone links default to standard blue but opts.linkColor,
+ // when supplied, overrides the colour for every anchor class including these.
  const urlLinkColor = linkColor || tpl.ctaBackgroundColor;
  ```

  3. Line 1371 (toolbar-handler wiring) — TASK-027 added `ctaMicrocopyQuill` as a third array member:
  ```diff
- // Toolbar override — must happen after both Quill instances are created
+ // Toolbar override — must happen after all three Quill instances are created
  [bodyAboveQuill, bodyBelowQuill, ctaMicrocopyQuill].forEach(q => {
  ```

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Sub-edit 2's replacement text asserts "both phone classes never get a target", which is false — Quill 2 is the loaded build (`index.html:11`) and its Link blot stamps `target="_blank" rel="noopener noreferrer"`, while the phone pass at `index.html:1659-1663` removes only `data-link-type` — so applying A2 verbatim writes a fourth false comment into the very block it exists to correct.
- **Counterfactual:** Re-scoping A2 to sub-edits 1 and 3 only, or sequencing it after B4's `removeAttribute('target')` fix, would flip this to IMPLEMENT.

### A3. Hoist the CTA block into a named const in `buildMjml()`, matching the file's own pattern
- **Summary:** The CTA's nested-ternary MJML fragment is the one exception to `buildMjml()`'s otherwise-consistent "hoist each conditional fragment into a named const" pattern, and it's now the least readable line in the function.
- **Source-Sprint:** SPRINT-008
- **Rationale:** `buildMjml()` already hoists `previewTag`, `bannerHrefAttr`, `bannerBgAttr`, and `bannerBlock` as named consts above the return. TASK-027 added a second ternary inside the CTA's inline template literal (line 1809-1812), so the line that resolves two ternaries and one interpolation is now the exact spot where the feature's whole byte-parity safety story lives, and it reads worse than every other conditional block in the same function.
- **Blast radius:** `index.html`, `buildMjml()` only — byte-identical output by construction (pure hoist, no logic change). Risk: trivial, but verify with a View-HTML diff (microcopy empty vs. populated) plus the Section 13 rows before considering it done.
- **Source:** FIND-SPRINT-008-13 (TASK-027 code-reviewer).
- **Proposed change:** hoist a `const ctaBlock = ...` above the `return` (alongside `bannerBlock`) that reproduces exactly what lines 1809-1812 currently interpolate inline, then replace the inline ternary with `${ctaBlock}`:
  ```diff
+ const ctaBlock = ctaToggle.isOn() ? `        <mj-button href="${escapeHtml(ctaHref)}" target="${ctaTarget}"${ctaRelAttr} background-color="${tpl.ctaBackgroundColor}" color="${tpl.ctaTextColor}" padding="${ctaPadding}">
+           ${escapeHtml(ctaText)}
+         </mj-button>
+ ${microcopyBlock ? microcopyBlock + '\n' : ''}` : '';
  ...
  ${richTextToMjText(bodyAboveQuill.root.innerHTML, tpl)}
- ${ctaToggle.isOn() ? `        <mj-button href="${escapeHtml(ctaHref)}" target="${ctaTarget}"${ctaRelAttr} background-color="${tpl.ctaBackgroundColor}" color="${tpl.ctaTextColor}" padding="${ctaPadding}">
-           ${escapeHtml(ctaText)}
-         </mj-button>
- ${microcopyBlock ? microcopyBlock + '\n' : ''}` : ''}${richTextToMjText(bodyBelowQuill.root.innerHTML, tpl)}
+ ${ctaBlock}${richTextToMjText(bodyBelowQuill.root.innerHTML, tpl)}
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Confirmed — `buildMjml()` already hoists `previewTag`, `bannerHrefAttr`, `bannerBgAttr` and `bannerBlock` at `index.html:1765-1776` while the CTA alone stays inline at `:1809-1812`, so this is a pure hoist onto the function's own four-site precedent with no new abstraction and no new file.
- **Counterfactual:** If a View-HTML byte diff shows any change in either branch, abandon — the inline literal's exact newline/indent placement is load-bearing for the parity story.

### A4. Give the two body Quill editors an accessible name, matching the microcopy editor's pattern
- **Summary:** The CTA microcopy editor is the only one of three rich-text editors with a programmatic accessible name; the two body editors are unlabelled `contenteditable` regions to a screen reader.
- **Source-Sprint:** SPRINT-008
- **Rationale:** TASK-027 correctly paired `<label id="ctaMicrocopyLabel">` with `ctaMicrocopyQuill.root.setAttribute('aria-labelledby', 'ctaMicrocopyLabel')` (line 713, line 1271) — the right treatment for a `contenteditable` that can't take a `for`. `#bodyAbove` (line 673) and `#bodyBelow` (line 729) sit in bare `.rich-editor-wrap` divs whose only nearby text is an unassociated `.seg-title` span, so the app is now internally inconsistent between its three editors.
- **Blast radius:** `index.html`, two `id` additions on existing `.seg-title` spans plus two `setAttribute` calls near the existing Quill construction (lines 1245, 1252). No visual or compiled-output change. Risk: trivial.
- **Source:** FIND-SPRINT-008-17 (TASK-027 code-reviewer).
- **Proposed change:**
  ```diff
  <div class="seg-head">
-   <span class="seg-title">Body</span>
+   <span class="seg-title" id="bodyAboveLabel">Body</span>
    <span class="seg-tag">above CTA</span>
  </div>
  ```
  ```diff
  <div class="seg-head">
-   <span class="seg-title">Body</span>
+   <span class="seg-title" id="bodyBelowLabel">Body</span>
    <span class="seg-desc">optional</span>
  </div>
  ```
  And after each Quill construction:
  ```diff
  const bodyAboveQuill = new Quill('#bodyAbove', { ... });
+ bodyAboveQuill.root.setAttribute('aria-labelledby', 'bodyAboveLabel');
  ...
  const bodyBelowQuill = new Quill('#bodyBelow', { ... });
+ bodyBelowQuill.root.setAttribute('aria-labelledby', 'bodyBelowLabel');
  ```
  (Optional, still trivial: fold all three call sites into one `nameEditor(quill, labelId)` helper, per the finding's suggestion.)

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Confirmed — `<label id="ctaMicrocopyLabel">` (`index.html:713`) pairs with `setAttribute('aria-labelledby')` (`:1271`), while the `.seg-title` spans at `:669` and `:724` carry no `id` and `#bodyAbove`/`#bodyBelow` have no `aria-labelledby` anywhere, so the app's two primary content editors really are unlabelled `contenteditable` regions; four lines, zero visual or compiled-output change.
- **Counterfactual:** The item's `bodyBelow` diff omits the existing `<span class="seg-tag">below CTA</span>` at `index.html:725`; the `seg-title` edit target is still unambiguous, and the optional `nameEditor()` helper should be skipped as unneeded abstraction.

### A5. Move `plainTextLength` next to its UI caller and rename it to reflect its Quill-specific contract
- **Summary:** `plainTextLength` lives inside the MJML-emission helper cluster despite having no emission caller, and its generic name hides Quill-specific semantics (strips the trailing newline `getText()` always appends).
- **Source-Sprint:** SPRINT-008
- **Rationale:** It's defined between `richTextToMjText` and `buildCtaHref` (line 1712) but its only caller, `updateMicrocopyCount` (line 4229), is ~2,500 lines further down in the UI-wiring section — a reader auditing the emission pipeline meets a function that isn't part of it. The name would silently mislead a future reuse against a plain `<input>` (the preheader counter, the app's other character counter, is implemented inline with different semantics).
- **Blast radius:** `index.html` — one function moved, one caller updated, four Section 13 harness fixture labels updated if renamed. No behavior change. Risk: low (mechanical, but touches fixture names).
- **Source:** FIND-SPRINT-008-19 (TASK-027 code-reviewer).
- **Proposed change:** move `function plainTextLength(text) { return String(text || '').replace(/\n+$/, '').length; }` (currently lines 1712-1714) down next to `updateMicrocopyCount` (line 4229), and rename to `quillTextLength`. Update the one call site (`plainTextLength(ctaMicrocopyQuill.getText())` → `quillTextLength(...)`) and the four Section 13 fixture description strings that name `plainTextLength`.

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The stated harm is hypothetical — `plainTextLength` (`index.html:1712`) has exactly one production caller (`:4230`) and the preheader counter it might be confused with is an inline `els.preheader.value.length` at `:1227` with no helper to unify against, so this is a private-helper rename plus a ~2,500-line move that churns four harness fixture labels for zero behavioral gain.
- **Counterfactual:** A second caller — e.g. actually unifying the preheader counter behind one `wireCharCount()` helper — would make the Quill-specific contract a live naming hazard and flip this to IMPLEMENT.

### A6. Delete the duplicate harness constant `RICHTEXT_MICROCOPY_TPL`
- **Summary:** `RICHTEXT_MICROCOPY_TPL` is byte-identical to `RICHTEXT_TPL` thirty lines above it in the harness — one constant should be deleted.
- **Source-Sprint:** SPRINT-008
- **Rationale:** Both are `{ ctaBackgroundColor: '#ED1C24' }` (lines 3090 and 3122). The reasoning for a separate name was sound (explaining that the fixture tpl omits microcopy-specific keys `richTextToMjText` never reads), but the residue is that a reader now has to diff two identically-valued constants character-by-character to learn they're the same.
- **Blast radius:** `index.html`, Section 13 harness only — one constant deleted, one call site repointed, comment retargeted. No production code touched. Risk: trivial.
- **Source:** FIND-SPRINT-008-10 (TASK-026 code-reviewer).
- **Proposed change:**
  ```diff
- // (future) caller and passed in as opts.fontSize/opts.color, not by this
- // function directly, so this fixture tpl omits them.
- const RICHTEXT_MICROCOPY_TPL = { ctaBackgroundColor: '#ED1C24' };
+ // richTextToMjText never reads ctaMicrocopyFontSize/ctaMicrocopyColor directly
+ // (they're passed in as opts.fontSize/opts.color by the caller), so the shared
+ // RICHTEXT_TPL needs no microcopy-specific keys — reuse it here too.
  const RICHTEXT_OVERRIDE_FIXTURES = [
  ...
  for (const fixture of RICHTEXT_OVERRIDE_FIXTURES) {
-   const actual = richTextToMjText(fixture.html, RICHTEXT_MICROCOPY_TPL, fixture.opts);
+   const actual = richTextToMjText(fixture.html, RICHTEXT_TPL, fixture.opts);
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Confirmed byte-identical and same-scope — `index.html:3090` and `:3122` are both literally `{ ctaBackgroundColor: '#ED1C24' }` inside `renderTestHarness()`, with a single call site at `:3190`, so the delete-and-repoint is three harness-only lines with no production reach.

## B. Backlog tasks (refine into execution-ready plans)

### B1. Consolidate the test harness's per-section row-rendering into one shared helper
- **Summary:** Three tasks copy-pasted the same ~12-line harness row-render block eleven-plus times, and the copies have already measurably diverged within this single sprint — consolidate into one `renderHarnessSection()` helper before more sections are added.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-1 (TASK-025 verifier), FIND-SPRINT-008-3 (TASK-025 code-reviewer), FIND-SPRINT-008-4 (TASK-025 code-reviewer), FIND-SPRINT-008-25 (sprint-code-reviewer), FIND-SPRINT-008-28 (sprint-code-reviewer), and the deferred follow-up noted in FIND-SPRINT-008-15's `resolved_by` ("the `startsWith` tightening on the styled-emission row was left out of scope... still open if wanted as a follow-up").
- **Problem:** `renderTestHarness()` (index.html:2133-3162, 1,030 lines) now contains many near-identical copies of the same row-render loop. FIND-SPRINT-008-25 (sprint-code-reviewer) measured the drift directly: (a) some loops have no try/catch at all while others wrap the check in an inline `(() => { try {...} catch { return false; } })()` — none guard the function-under-test call itself, which is the exact latent hazard FIND-SPRINT-008-1 flags (a throwing fixture blanks the *entire* harness, not just one row); (b) the input label reads "Input HTML" in three loops, "Input HTML (JSON)" in two, "Input text (JSON)" in one; (c) the result label is "Actual output", "Actual (JSON)", or "Actual" depending on loop; (d) some loops `escapeHtml()` the actual value, others use bare `String()`; (e) some loops render an "Expected" row, others don't; (f) Section 11's null-input config row renders as `fixture.html || '(none — config assertion)'` (self-explanatory) while Section 13's copy of the same shape (added one task later, in commit d645cb0) is a bare `escapeHtml(fixture.html)` that shows an unexplained blank box (FIND-SPRINT-008-28). Separately, FIND-SPRINT-008-3 flags three Section 11 hygiene items worth folding in: a stale comment referencing a non-existent `expected` field, an `html: null` config-assertion fixture that should use the no-arg `check()` shape Sections 8-10 already established, and a hard-coded `richToolbar[0]` array index in a config assertion that should read the whole array.
- **Proposed direction:** Extract `renderHarnessSection(body, title, fixtures, run)` where `run(fixture)` returns `{ actual, pass }` and the helper owns the `<h3>`, the row markup (one label vocabulary, one escaping rule — suggest always `escapeHtml`, always `JSON.stringify` for non-string inputs/outputs, always render an "Expected" row when the fixture has one), and a try/catch that wraps the function-under-test call itself (not just the check), rendering a throwing fixture as a single FAIL row with the exception text (closes FIND-SPRINT-008-1). Migrate the eleven-plus existing sections to it one at a time, confirming row count and PASS state per section after each move (per FIND-SPRINT-008-4's suggested approach). While migrating, fix Section 11's three hygiene items (FIND-SPRINT-008-3) and Section 13's incomplete null-row copy (FIND-SPRINT-008-28) so the null-config-assertion shape either goes away entirely (moved to the no-arg `check()` shape) or is rendered consistently everywhere it remains. Also fold in the leftover FIND-SPRINT-008-15 follow-up: tighten Section 13's styled-emission row from `includes(...)` to the stronger `startsWith` form Section 12 already uses. Land this BEFORE any Section 14 is written (explicit sprint-code-reviewer recommendation) so new sections inherit the helper instead of copying whichever variant their author scrolls past. Consider adding a CODE-PATTERNS.md entry once the helper exists, pointing future harness-section authors at it instead of copy-paste.
- **Scope:** medium — touches ~1,030 lines across eleven-plus sections, but each migration step is independently verifiable (row count + PASS state), and no fixture's assertion logic changes, only its rendering path.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** The drift is measured rather than predicted and has kept growing past the sprint — 13 `for (const fixture of` loops now split across three input labels (`index.html:2219`, `:3111`, `:3358`), three result labels (`:3202`, `:3113`, `:3227`) and `escapeHtml` vs bare `String` (`:3336` vs `:3360`), with no loop guarding the function-under-test call, while the codebase's own `renderPredicateFixtures` (`:2510`) already established exactly this extraction for the predicate-shaped sections.
- **Counterfactual:** The item's gate "land this BEFORE any Section 14 is written" is already moot — Sections 14, 15 and 16 exist — and open SPRINT-009 FIND-13 proposes the header half (`harnessSection(body, title)`, 15 duplicated `cssText` blocks) separately, so the refiner should scope both halves as one task.

### B2. Decide whether the ~1,030-line test harness should keep shipping inside `index.html`
- **Summary:** The developer test harness is now 24% of the production single-file app (1,030 of 4,342 lines) and ships to every marketer over HTTP with no build step to strip it — decide whether that's acceptable or whether it should move behind a `?harness=1` fetch of a sibling file.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-25 (sprint-code-reviewer, aggregate note): "372 of index.html's 519 new lines (72%) landed inside renderTestHarness()... Separately, record an explicit decision on whether ~1,030 lines of fixtures should keep shipping inside the production single-file app, or move behind a `?harness=1` fetch of a sibling file — the answer changes how much the duplication is worth paying down."
- **Problem:** No file-size or load-time problem has been observed yet, but the harness has grown by three more sections and ~700 lines in this sprint alone (TASK-025/026/027 each added a section), and the growth rate is accelerating relative to production code. This is explicitly flagged as a decision, not a defect — the finding notes the answer changes the ROI of B1's consolidation work.
- **Proposed direction:** Two options for the task-refiner to scope against: (1) status quo — keep the harness inline, accept the file-size cost, and let B1's consolidation be the only mitigation; (2) split the harness into a sibling file (e.g. `harness.js`) fetched only when `?harness=1` is present or `Ctrl+Shift+T` fires, keeping `index.html` free of test code entirely. Option 2 is a bigger change — it touches the "no build step" constraint (CLAUDE.md, CODE-PATTERNS.md "Single-file constraint") and needs a decision on whether a *second* file violates that constraint or is exempt as dev-only tooling. Recommend resolving this before or alongside B1, since B1's helper design differs depending on whether it needs to work standalone in a separate file.
- **Scope:** small to decide, medium-to-large to implement if option 2 is chosen.

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The item concedes no file-size or load-time problem has been observed, its option 2 directly contradicts `CODE-PATTERNS.md:86` ("Do not introduce a build step, npm dependencies, React, or separate module files") restated in `CLAUDE.md:7`, and its claimed blocking relationship to B1 is contradicted by `renderPredicateFixtures` (`index.html:2510`) — a nested helper that would relocate wholesale under either option.
- **Counterfactual:** A measured load or paste-time problem traceable to harness size, or a decision to relax the single-file constraint on other grounds, would make this decision worth a task slot.

### B3. Replace `PassthroughLink.sanitize`'s blanket URL passthrough with an explicit scheme allowlist
- **Summary:** The paste-link sanitizer that was widened to let `{{variable}}` and `tel:` survive currently permits any scheme at all, including `javascript:` and `data:`, with no filter anywhere downstream.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-2 (TASK-025 code-reviewer, out-of-diff).
- **Problem:** `PassthroughLink.sanitize(url) { return url; }` (grep `static sanitize(url)`) disables Quill's link sanitizer entirely. Nothing downstream re-checks the scheme: `richTextToMjText` only sets `style`/`target` on anchors, MJML passes hrefs through verbatim, and the preview iframe is deliberately not sandboxed and same-origin with the app (per ARCHITECTURE.md). `PREVIEW_LINK_HANDLER` calls `window.open(href, '_blank', 'noopener')` on any non-`#` href, so a `javascript:`/`data:` href pasted or typed into the link dialog travels from paste to `window.open` unfiltered. Real-world impact is limited today (modern Chrome blocks `javascript:` in `window.open`; email clients strip such hrefs on export) — this is hardening, not a demonstrated exploit — but the absence of any scheme allowlist is undocumented, and the widened `allowedFormats` comment now reads as if the whitelist itself is the sanitisation boundary.
- **Proposed direction:** Replace the passthrough with an allowlist in `PassthroughLink.sanitize`: permit `http:`, `https:`, `mailto:`, `tel:`, in-page `#…`, and strings beginning with `{{`/`{{{`; return `'#'` (or fall through to `QuillLink.sanitize`) for anything else. Verify against the existing link-dialog fixtures and the `{{{unsubscribe}}}` harness rows before changing behavior — a new harness fixture pinning a rejected `javascript:` href would close the gap for good.
- **Scope:** small.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Every hop verifies in present tense — `static sanitize(url) { return url; }` at `index.html:1235`, no scheme check anywhere in `richTextToMjText` (`:1549-1707`, which returns `div.innerHTML` verbatim), and `window.open(href, '_blank', 'noopener')` on any non-`#` href at `:3599` into an iframe ARCHITECTURE.md deliberately leaves unsandboxed — and the fix is a ~6-line allowlist inside an existing two-line class with no new file or abstraction.
- **Counterfactual:** If the preview iframe were sandboxed, the only remaining hop would be export, which email clients already strip, and this would fall below the bar as pure hardening.

### B4. Strip `target`/`rel` from manually-inserted phone links to match the documented design intent
- **Summary:** Manual `tel:` links typed into the link dialog ship `target="_blank"` in the compiled email, contradicting the app's own code comments and TASK-027's acceptance criterion.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-12 (TASK-027 verifier); related to FIND-SPRINT-008-8 (A2 above corrects the comment, this item fixes the underlying behavior).
- **Problem:** Quill 2's default Link blot creates the anchor already carrying `target="_blank" rel="noopener noreferrer"`. `richTextToMjText`'s selector `a:not([data-autolinked]):not([data-link-type="phone"])` only declines to *add* a target — it never *removes* the one Quill put there. Verified empirically on both the pre-TASK-027 tree (bae4a25) and the current tree: identical editor HTML and compiled output `<a href="tel:5559876543" rel="noopener noreferrer" target="_blank" style="color:#0000ee;text-decoration:underline;">`. Pre-existing, not introduced by TASK-027 — microcopy just inherits the same body-copy behavior — but a `tel:` href with `target="_blank"` can open a blank tab instead of raising the dial intent in webmail clients, exactly the failure the code comment claims is avoided. Auto-linked phones are unaffected (built by `autoLinkPhones` with no target).
- **Proposed direction:** In `richTextToMjText`'s `a[data-link-type="phone"]` pass, add `a.removeAttribute('target'); a.removeAttribute('rel');` alongside the existing `removeAttribute('data-link-type')`. This changes compiled output for any existing email containing a manual phone link, so it needs its own byte-parity fixture rather than being folded into a feature diff.
- **Scope:** small.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Verified: Quill 2 is the loaded build (`index.html:11`) and its Link blot stamps `target="_blank" rel="noopener noreferrer"` at creation, while the phone pass at `:1659-1663` removes only `data-link-type` — so manual `tel:` links ship a target that the code comment, FIND-SPRINT-008-8 and TASK-027's own acceptance criterion all claim they don't, and FIND-SPRINT-008-12 captured the compiled output on two separate trees.

### B5. Resolve the en-dash/em-dash bullet-conversion asymmetry
- **Summary:** `BULLET_PREFIX` converts a leading en dash (`–`) into a bullet but not an em dash (`—`), while five in-code comments/fixture descriptions and the now-corrected README/CODE-PATTERNS/CHANGELOG disagree about which is true.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-21 (TASK-028 verifier), FIND-SPRINT-008-29 (sprint-code-reviewer).
- **Problem:** `BULLET_PREFIX` (grep `const BULLET_PREFIX`) contains U+2013 (en dash) but not U+2014 (em dash), so `– text` and `- text` both convert to a bullet while `— text` never does. TASK-028 corrected README.md, CODE-PATTERNS.md, and CHANGELOG.md to say only `*`/`-` convert — but five in-code sites still claim an em dash converts too: index.html:1221 (microcopyToolbar comment, TASK-027), 1563 (convertTypedBullets gate comment, TASK-026), 1569 (BULLET_PREFIX comment's `\s+` reasoning, which is itself wrong — the exclusion is the character class, not the `\s+`), 2931 (Section 12 fixture description, TASK-026), and 3046 (Section 13 fixture description, TASK-027). Code and docs now actively contradict each other.
- **Proposed direction:** First decide whether U+2014 should join `BULLET_PREFIX` (making both dashes behave alike) or stay excluded (current behavior, intentional or not). Whichever way it lands: if the class changes, add a harness fixture pinning the new behavior and re-verify the existing typed-bullet fixtures still pass; if it doesn't change, sweep all five index.html sites (ripgrep for the literal U+2014 in comments/fixture descriptions) so they name exactly the characters in `BULLET_PREFIX` and match the already-corrected doc wording.
- **Scope:** small.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** `BULLET_PREFIX` at `index.html:1611` contains `–` and not `—`, and all five contradicting in-code sites are still live at `:1261`, `:1604`, `:1610`, `:3157` and `:3292` against README/CODE-PATTERNS/CHANGELOG that TASK-028 already corrected — code and shipped docs actively disagree today, not hypothetically.
- **Counterfactual:** This is the incident C1's rule is derived from, so landing C1 while leaving these five sites contradicting the docs would be incoherent.

### B6. Unify the three anchor-styling passes in `richTextToMjText`
- **Summary:** The third anchor pass (auto-linked phones) uses a different override mechanism (`if (linkColor)`) than the first two (unconditional `linkColor || <default>`), for what may be no functional reason.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-11 (TASK-026 code-reviewer).
- **Problem:** Passes one and two precompute a colour with `linkColor || <default>` and run unconditionally; pass three instead runs only inside `if (linkColor)`. The gate likely exists only to preserve byte-parity, since `autoLinkPhones` already sets exactly `style="color:#0000ee;text-decoration:underline;"` on every anchor it creates — the identical string an ungated pass would write with `linkColor || '#0000ee'`. `setAttribute` updates in place without moving the attribute, so serialisation should be unchanged. Not raised as a review blocker in TASK-026 — the approved acceptance criteria explicitly pinned the gated shape — so this is a deliberate follow-up decision, not a defect.
- **Proposed direction:** Replace the `if (linkColor) { ... }` block with an ungated `div.querySelectorAll('a[data-autolinked]').forEach(a => a.setAttribute('style', \`color:${phoneLinkColor};text-decoration:underline;\`));`, reusing the existing `phoneLinkColor`. Gate the change entirely on the seven Section 12 parity fixtures staying green — in particular "Byte-parity: plaintext phone auto-link", which pins the generated anchor's attribute order. If any parity fixture reddens, abandon the simplification and keep the gate. A successful unification also removes the reason the FIND-SPRINT-008-5 comment (A2 above) needs to describe an asymmetry at all.
- **Scope:** small, but conditional on fixture verification — do not merge if any parity fixture reddens.

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The item's own analysis is why it isn't worth a task — `autoLinkPhones` already writes exactly `color:#0000ee;text-decoration:underline;` at `index.html:1528` and `setAttribute` updates in place, so ungating the third pass at `:1667` is a provable no-op inside the file's most byte-parity-critical function, and the item ships with an explicit "abandon if any parity fixture reddens" escape hatch meaning the task may legitimately end in zero change.
- **Counterfactual:** If a second `opts` field ever needs the same three-pass treatment, the mechanism asymmetry becomes a real maintenance fork worth collapsing.

### B7. Derive CTA button padding from the emitted microcopy block, not a third independent re-derivation
- **Summary:** "Is there microcopy?" is computed three separate times from the same raw HTML — once each in `buildMicrocopyBlock`, `ctaButtonPadding`, and the template's own truthiness check — and the button's padding could silently disagree with the caption it's meant to make room for.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-14 (TASK-027 code-reviewer).
- **Problem:** `buildMicrocopyBlock` (`if (!hasRichHtml(html)) return ''`), `ctaButtonPadding` (`hasRichHtml(microcopyHtml) ? ... : ...`), and the template's `microcopyBlock ? microcopyBlock + '\n' : ''` all independently derive the same boolean from raw HTML. They agree today only because both consumers happen to gate on the same predicate. If `buildMicrocopyBlock` ever gains a second reason to return `''` (a length floor, a brand opt-out key), the button silently tightens to `6px` with no caption beneath it. The `18px` bottom-gap value is also encoded twice as unrelated literals — once in `buildMicrocopyBlock`'s padding, once in `ctaButtonPadding`'s no-microcopy return.
- **Proposed direction:** Make padding a function of the emitted block rather than the raw HTML: `ctaButtonPadding(microcopyBlock)` keyed on `!!block`, or drop the helper entirely and read `microcopyBlock ? CTA_PADDING_WITH_MICROCOPY : CTA_PADDING_DEFAULT` directly in `buildMjml()`. Requires rewriting the two Section 13 padding fixtures, which currently pin the html-taking signature `ctaButtonPadding('<p>x</p>')`. Consider naming the shared `18px` once (`CTA_BLOCK_BOTTOM_GAP`) so both call sites read from a single source.
- **Scope:** small-medium (function signature change plus fixture rewrite).

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The item concedes the three derivations (`index.html:1721`, `:1739`, `:1812`) agree today and the divergence requires `buildMicrocopyBlock` gaining a second early-return it does not have, so this trades an emission-path signature change plus two harness fixture rewrites for a condition no current code path can reach.
- **Counterfactual:** A second `return ''` condition in `buildMicrocopyBlock` (a length floor, a brand opt-out key) would make the padding/caption divergence live and flip this to IMPLEMENT.

### B8. Attribute humanized template errors to their originating field
- **Summary:** Every Handlebars error is hard-prefixed `"Body copy: "` regardless of which field (preheader, body, or now microcopy) actually contains the malformed token, sending marketers to the wrong field.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-18 (TASK-027 code-reviewer).
- **Problem:** `humanizeTemplateError` (grep `function humanizeTemplateError`) is the sole error surface for Handlebars compile/render failures raised in `applyTestData()`, which compiles the whole rendered document. Handlebars tokens are a first-class feature of the preheader (`<mj-preview>`), the link dialog's "URL variable" mode, and now microcopy — all of which route into the same compile pass. A malformed `{{#if}}` typed into the microcopy field surfaces as "Body copy: unclosed {{#if}} block..." — sending the marketer to a field with no error. CLAUDE.md's binding convention requires these messages to be "plain-English action-oriented"; the humanization itself is intact, but the field attribution — the half of the message a marketer acts on first — is now wrong more often than right, with microcopy as the third token-bearing surface.
- **Proposed direction:** Either drop the field name for a neutral prefix ("Template: ..."), or thread the originating field through — have `applyTestData()` scan the offending source snippet against each editor's text and pass a field label into `humanizeTemplateError(message, field)`, defaulting to "Template" when it cannot attribute. Extend `HUMANIZE_FIXTURES` (grep `const HUMANIZE_FIXTURES`) with a microcopy-attributed case — every existing fixture's `expected_pattern` is prefix-agnostic today, so the fixtures will not catch a partial/incorrect change on their own.
- **Scope:** medium — touches the sole error-humanization surface used by three fields; needs its own task per the finding's own assessment.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Confirmed — all eight returns in `humanizeTemplateError` (`index.html:2028-2053`) hard-code `'Body copy: '` while the preheader `<mj-preview>`, the link dialog's URL-variable mode and microcopy all route into the same `applyTestData` compile, so the half of the message a marketer acts on first now points at the wrong field more often than the right one, on the one error surface CLAUDE.md binds by convention.
- **Counterfactual:** The item's claim that every `HUMANIZE_FIXTURES` `expected_pattern` is prefix-agnostic is wrong — `index.html:2093` pins `"Body copy: TypeError"` — so a prefix change will redden exactly one existing row the refiner must fold in.

### B9. Pick one mechanism for CTA microcopy brand defaults and add fixture coverage for the untested path
- **Summary:** Brand defaults for microcopy font-size/color are implemented twice — as per-brand config keys AND as `||` fallbacks in `buildMicrocopyBlock` — and no fixture exercises the fallback path, so a typo in either mechanism would go undetected.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-30 (sprint-code-reviewer).
- **Problem:** TASK-026 added `ctaMicrocopyFontSize`/`ctaMicrocopyColor` to all eight brand entries (index.html:998-1138), matching the file's existing `unsubscribeHtml: DEFAULT_UNSUBSCRIBE` convention. It then also added `|| DEFAULT_CTA_MICROCOPY_FONT_SIZE` / `|| DEFAULT_CTA_MICROCOPY_COLOR` fallbacks inside `buildMicrocopyBlock` (index.html:1679-1681). Either mechanism alone is sufficient — deleting either one leaves output unchanged — so microcopy is now the only key using both. Section 13's `MICROCOPY_TPL` (index.html:2998) always supplies both keys, so the `||` branch is never exercised by any fixture: a typo in either key name, or deletion of either `DEFAULT_` const, would leave every harness row green while silently changing what a brand emits. README.md already documents these as "per-brand override slots" that no brand currently overrides — an argument for keeping the fallback and dropping the sixteen now-redundant per-brand lines.
- **Proposed direction:** Preferred per the finding: keep the `||` fallbacks in `buildMicrocopyBlock`, delete the two keys from all eight brand entries, and update README.md's Templates list to describe the keys as optional per-brand overrides rather than fields every brand ships. Add one Section 13 fixture using a tpl that omits both keys, asserting the emitted block still carries `font-size="13px"` and `color="#6b6b6b"`, pinning the fallback path. If the alternative (spell-it-in-every-brand-entry) is preferred instead, drop the fallbacks so a missing key fails loudly, and record the convention in CODE-PATTERNS.md so the next brand-scoped key doesn't fork the pattern a third time.
- **Scope:** small-medium (16-line deletion across 8 brand entries, one doc update, one new fixture).

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Output is byte-identical under either mechanism by the item's own admission, no brand actually overrides either key (`README.md:143`), and the real count is 9 brand entries / 18 lines not 8/16 (`index.html:1023`-`:1182`) — so this spends a doc rewrite plus 18 deletions inside the hot `templates` map to pre-empt a key-name typo that hasn't happened.
- **Counterfactual:** The single Section 13 fixture pinning the `||` fallback path is the only part with present-tense value; a brand genuinely overriding either key, or a third brand-scoped key forking the pattern again, would flip this to IMPLEMENT.

### B10. Fix the test harness stealing keyboard focus into the CTA microcopy editor
- **Summary:** Opening the developer test harness (Ctrl+Shift+T) leaves keyboard focus inside the hidden CTA microcopy editor, so any subsequent keystroke that isn't Escape gets typed into the compiled email behind the overlay.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-26 (sprint-code-reviewer, end-of-sprint).
- **Problem:** The FIND-SPRINT-008-15 wiring guard (index.html:3136-3146) proves the toolbar link-handler wiring by invoking the real production handler: `handler()` → `openLinkModal(ctaMicrocopyQuill)` → `quill.getSelection(true)` (the `true` focuses the editor), then `closeLinkModal()`, which ends with `if (ownerEditor) ownerEditor.focus();` — focusing `ctaMicrocopyQuill` a second time and scrolling it into view. `#testHarness` is a `.modal-overlay` (position:fixed, inset:0, z-index:100) with no focus trap, so after opening the harness the marketer's own microcopy field holds focus underneath it. This runs on every harness open, since `renderTestHarness()` rebuilds all rows each time. The guard also mutates and never restores `linkDestination.value` (set to `''`), the `linkTypeButtons` active/aria-pressed pair (forced to "phone"), and a `setTimeout(() => linkDestination.focus(), 50)` that fires 50ms after the modal is hidden — currently inert only because `.modal-overlay` is `display:none` when not `.visible`. Contrast Section 3 (TASK-016), the harness's only other side-effecting row, which explicitly snapshots and restores the localStorage key it touches. This landed in commit d645cb0 as a post-review fix, after TASK-027's code review had already run, so no per-task reviewer saw it.
- **Proposed direction:** Wrap the invocation in a save/restore following Section 3's precedent: capture `document.activeElement`, `linkDestination.value`, and the active link-type button before `handler()`; restore all three after `closeLinkModal()`; finish with `document.getElementById('testHarnessClose').focus()` so focus stays inside the overlay. If a pending timer is unacceptable, consider asserting the wiring without side effects instead (temporarily swap `openLinkModal` for a recording stub, or assert `handlers.link.toString()` mentions `openLinkModal`). Re-run the harness and confirm the guard still goes red when `ctaMicrocopyQuill` is removed from the toolbar-override loop at index.html:1372, which is the property it exists to protect.
- **Scope:** small, but touches focus/DOM-timing behavior — validate manually in a browser, not just via the harness's own PASS/FAIL.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Every hop verifies: the 4th `MICROCOPY_DOM_GUARDS` entry (`index.html:3384-3392`) calls the real `handler()` → `openLinkModal` → `quill.getSelection(true)` (`:1307`), then `closeLinkModal()`'s `ownerEditor.focus()` (`:1366`), and it leaves `linkDestination.value` plus the `linkTypeButtons` active/aria-pressed pair mutated (`:1353-1358`) with a `setTimeout` focus still pending (`:1361`) — on every harness open, with no focus trap on `#testHarness`.
- **Counterfactual:** Section 3's snapshot/restore of the localStorage key it touches is the in-file precedent, so the fix adds no new pattern or abstraction.

### B11. Strip Quill's armed-but-unused cursor artifact before the emptiness test
- **Summary:** Clicking Bold or Italic in an empty editor and typing nothing leaves a `<span class="ql-cursor">` and a zero-width character in the editor's HTML, which the emptiness check doesn't catch — so "empty" editors can still emit content, and in the CTA microcopy editor this silently changes the button's padding.
- **Source-Sprint:** SPRINT-008
- **Source:** FIND-SPRINT-008-31 (integration-tester, end-of-sprint, severity medium).
- **Problem:** Click into an empty editor, click Bold/Italic, type nothing: Quill leaves `<p><em><span class="ql-cursor">U+FEFF</span></em></p>` in `root.innerHTML`. `hasRichHtml` only strips `<p><br></p>` and `<p></p>`, so the editor reports content, and the `ql-cursor` span plus the zero-width no-break space reach `lastHtml` — the exact string "Copy HTML" hands to SendGrid. The state persists after blur and does not self-heal. Proven pre-existing at base commit c3159f1 (reproduces identically in `#bodyBelow`), but TASK-027 gave it a new, more visible symptom: in `#ctaMicrocopy` the same armed-but-empty state flips `ctaButtonPadding` to `14px 0 6px 0` and emits a spurious muted `mj-text` block, while `#ctaMicrocopyCount` still reads `0` — the UI says empty, the compiled output disagrees. Reproduced with recorded scratchpad artifacts (`it8/ws8_emptyitalic.js`, `ws9_classify.js`).
- **Proposed direction:** Strip `<span class="ql-cursor">` nodes and the U+FEFF character before the emptiness test inside `hasRichHtml` — a single fix covers all three editors and both consumers of the predicate (the emission gate and `ctaButtonPadding`). Pin with harness fixtures: `hasRichHtml` on the armed-cursor HTML shape must return `false`, and `buildMicrocopyBlock` on the same shape must return an empty string.
- **Scope:** small-medium — single-function fix with wide blast radius (all three editors, two consumers); needs its own fixtures to pin the regression, so refine before applying.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Confirmed — `ql-cursor` appears nowhere in `index.html` (only `.ql-ui` is removed, at `:1573`) and `hasRichHtml` (`:1543-1547`) handles only `<p><br></p>`/`<p></p>`, so an armed-but-unused format leaks a Quill internal span plus U+FEFF into `lastHtml` and flips `ctaButtonPadding` (`:1739`) while `#ctaMicrocopyCount` still reads 0 — a reproduced, user-visible divergence between what the UI says and what ships to SendGrid.
- **Counterfactual:** A1's shared cleaner should land first or together, otherwise the fix in `hasRichHtml` leaves `richTextToMjText`'s own `cleaned` (`:1561`) still passing the cursor span through whenever real content is also present.

## C. CLAUDE.md / CODE-PATTERNS.md improvements (apply now)

### C1. Behavioral doc claims must name the deciding code construct
- **Summary:** A behavioral claim in README/ARCHITECTURE/CODE-PATTERNS/CHANGELOG should name the exact function or constant that decides the behavior, so the claim can be checked directly against source instead of trusted at face value.
- **Source-Sprint:** SPRINT-008
- **Status:** ready
- **source_item:** C1
- **Target file:** `CODE-PATTERNS.md` — retargeted from CLAUDE.md by claude-md-reviewer: the directly analogous rule ("Doc anchors, not line numbers") already lives in CODE-PATTERNS.md's `## Documentation Conventions`, and the rule fails the every-agent test for CLAUDE.md (only doc-editing agents need it). CLAUDE.md already points at CODE-PATTERNS.md for conventions.
- **Source:** FIND-SPRINT-008-23 (TASK-028 verifier). Reviewer verified: `BULLET_PREFIX` (index.html:1611) contains en dash but not em dash, so the original false claim was real — but README.md:57, CODE-PATTERNS.md:34, and CHANGELOG.md:29 have all since been corrected, so this survives as a forward-looking rule only (incident narrative stripped from the diff).
- **Action:** insert after the `- **Doc anchors, not line numbers.**` bullet in CODE-PATTERNS.md's `## Documentation Conventions` section.
- **Diff:**
  ```diff
   - **Doc anchors, not line numbers.** CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and README.md point at code with a greppable needle in the form grep `function wireSegControl` — a function name, an element id, or a unique call expression. Line-number pointers rot silently and were all removed in commit 043ee5d after drifting 400–1500 lines. Anchors still break when an identifier is renamed, so the Ctrl+Shift+T harness's *Documentation anchor drift guard* section extracts every anchor from these four files at runtime and fails if one no longer resolves in `index.html`. When you rename an anchored identifier, update the doc in the same commit.
  +
  +- **Behavioral claims must cite the deciding construct.** When a doc states what the app *does* (which characters become a bullet, which formats survive paste, which attributes an anchor carries), name the function or constant that decides it — e.g. "the characters in `BULLET_PREFIX` — grep `const BULLET_PREFIX`" — rather than asserting the behavior in prose alone. A prose-only claim can only be checked against itself; dash and glyph variants (en vs em dash) have drifted between doc and regex before.
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The insertion point exists verbatim at `CODE-PATTERNS.md:97`, the proposed `grep `const BULLET_PREFIX`` anchor resolves at `index.html:1611` so the shipped Section 16 anchor-drift guard will accept it (and `ANCHOR_FLOORS['CODE-PATTERNS.md'] = 18` only rises), and the mistake it guards recurred across four SPRINT-008 tasks and three further SPRINT-009 findings rather than once.
- **Counterfactual:** `CODE-PATTERNS.md:25` and `:34` still state the bullet-character behavior in prose without naming `BULLET_PREFIX`, so the rule's first application is to text the file already carries — mild drift, but not enough to withhold one bullet in a section already carrying 18 anchors.

### C2. Correct `richTextToMjText`'s sanitization claim
- **Summary:** CODE-PATTERNS.md says `richTextToMjText` "strips unsafe tags," but the function performs no tag or attribute sanitization at all — the actual boundary is the Quill `formats` whitelist one hop upstream.
- **Source-Sprint:** SPRINT-008
- **Status:** ready
- **source_item:** C2
- **Target file:** `CODE-PATTERNS.md`
- **Source:** FIND-SPRINT-008-27 (sprint-code-reviewer, severity medium). Reviewer verified fully: the function returns `div.innerHTML` verbatim — no tag allowlist, no attribute scrub, no `on*` filter; the real boundary is `const allowedFormats` (index.html:1243) / `const microcopyFormats` (index.html:1263). The proposal's cited line numbers (1203/1222) were already 40 lines stale — itself an argument for grep anchors.
- **Action:** replace the `**Use it for:**` line under `### richTextToMjText` and insert one new labeled bullet. The originally proposed index.html code comment is **dropped from scope** (production-source edit is a different change class; reviewer recommends filing it as its own backlog item).
- **Diff:**
  ```diff
   - **Location:** `index.html` — grep `function richTextToMjText`.
  -- **Use it for:** Converting a Quill editor's inner HTML into a safe `<mj-text>` content block — strips unsafe tags, preserves bold/italics/links/lists, applies the brand's link color.
  +- **Use it for:** Converting a Quill editor's inner HTML into an email-client-friendly `<mj-text>` content block — normalizes list markup and bold/italics/links, applies the brand's link color.
  +- **Sanitization contract:** it does **not** sanitize — no tag allowlist, no attribute scrub, no `on*` filter; the return value is `div.innerHTML` verbatim. The only boundary is the owning editor's Quill `formats` whitelist (grep `const allowedFormats`, `const microcopyFormats`). Never pass HTML from a source that has not been through such an editor (imported template, restored draft, pasted MJML) without sanitizing first.
   - **Signature:** `richTextToMjText(html, tpl, opts = {})`. ...
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Verified end to end — `CODE-PATTERNS.md:24` still reads "strips unsafe tags" while `richTextToMjText` returns `` `<mj-text …>${div.innerHTML}</mj-text>` `` verbatim at `index.html:1707` with no allowlist and only `data-list`/`data-link-type` removals anywhere in the function, and the replacement's anchors `const allowedFormats` (`:1243`) and `const microcopyFormats` (`:1263`) both resolve for the Section 16 guard.
- **Counterfactual:** The harness itself already feeds the function hand-written non-Quill HTML at `:3102`, `:3190` and `:3303` — exactly the pattern a fourth caller would follow while trusting the current wording.

## Suppressed — SoloFlow Defects

The following candidates were evaluated for Bucket C and judged to be about SoloFlow's own planning workflow rather than a genuine project convention for CLAUDE.md — they are dropped from this proposal rather than added as plugin-specific lore in the project's CLAUDE.md.

- **Acceptance criteria that quote current file line/occurrence counts go stale under same-sprint concurrent tasks** — FIND-SPRINT-008-6 (grep count of `richTextToMjText(` calls was already wrong when TASK-026's plan was approved, because TASK-025's harness fixture had already added a call site), FIND-SPRINT-008-20 (README workflow-step count was stale because TASK-024 had inserted a step after the plan was drafted), FIND-SPRINT-008-22 (CHANGELOG "insert above entry X" was stale because TASK-024 had landed a newer top entry), and FIND-SPRINT-008-24 (TASK-032's not-yet-run plan already assumes work TASK-028 completed). All four describe the same shape: a SoloFlow plan drafted against a file-state snapshot, executed later after other same-sprint tasks touched the same file. The fix belongs in how the task-refiner (planner) writes and the orchestrator sequences plans that reference shared files — not in this project's CLAUDE.md. Consider opening an issue or running `/sf:compound --tester` against this sprint in a SoloFlow-tester setup to surface it as a maintainer recommendation.

## Reconciled Findings (informational)

None. FIND-SPRINT-008-7 and FIND-SPRINT-008-15 are marked `status: resolved` in the findings file, and both resolutions are corroborated by their respective done reports (TASK-026's done report confirms 62591a4 closed FIND-SPRINT-008-7; TASK-027's done report confirms d645cb0 closed FIND-SPRINT-008-15) — no stale-open drift found.
