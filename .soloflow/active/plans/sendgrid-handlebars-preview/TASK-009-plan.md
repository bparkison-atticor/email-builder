---
id: TASK-009
idea: SPRINT-003-compound
status: approved
created: 2026-05-13T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - .soloflow/archive/done/sendgrid-handlebars-preview/TASK-008-done.md
  - .soloflow/archive/sprint-code-reviews/SPRINT-003-code-review.md
  - CODE-PATTERNS.md
acceptance_criteria:
  - criterion: "The `#testHarness` element uses `class=\"modal-overlay\"` on the outer div and `class=\"modal\"` on the inner wrapper (matches `#htmlModal` / `#linkModal` markup at index.html ~line 760 and ~line 777)."
    verification: "grep -n 'id=\"testHarness\"' index.html shows the line with `class=\"modal-overlay\"` (no `class=\"test-harness\"`, no `hidden` attribute). The next sibling line contains `class=\"modal\"`. Visual: open the app, press Ctrl+Shift+T, confirm the harness renders as a centered modal."
  - criterion: "The harness header uses `class=\"modal-header\"` with `<h2>` (not `<h3>`) and the close button uses `class=\"modal-close\"` with `aria-label=\"Close\"` and `title=\"Close (Esc)\"`, matching the `#htmlModal` / `#linkModal` pattern."
    verification: "grep -n 'id=\"testHarnessClose\"' index.html shows a button line that contains both `class=\"modal-close\"` and `aria-label=\"Close\"`. The harness section contains exactly one `<h2>` (not `<h3>`)."
  - criterion: "Harness visibility is toggled via the `.visible` class on the overlay (same mechanism as `openHtmlModal` / `closeHtmlModal`). No `hidden` attribute or `setAttribute('hidden', ...)` / `removeAttribute('hidden')` / `hasAttribute('hidden')` calls remain anywhere targeting `#testHarness`."
    verification: "grep -n 'testHarness' index.html shows zero occurrences of `hidden` (attribute or method) on lines referencing the harness. grep -nE \"hasAttribute\\\\('hidden'\\\\)|setAttribute\\\\('hidden'|removeAttribute\\\\('hidden'\" index.html returns 0 matches."
  - criterion: "The entire `.test-harness*` CSS block (originally ~lines 517-617) is deleted. No selectors with `.test-harness`, `.test-harness-inner`, `.test-harness-header`, `.test-harness-body`, `.harness-row`, `.harness-row-label`, `.harness-badge`, or `.harness-field` remain in the stylesheet."
    verification: "grep -nE '\\\\.test-harness|\\\\.harness-row|\\\\.harness-badge|\\\\.harness-field' index.html returns 0 matches."
  - criterion: "A small `#testHarness`-scoped override block exists (analogous to the `#linkModal .modal` override at ~line 507) sufficient to render the fixture rows with pass/fail visual differentiation. The override applies pass/fail backgrounds and border colors using attribute or class selectors on row elements inside `#testHarness`."
    verification: "grep -nE '#testHarness' index.html shows at least one CSS selector block under the `<style>` section. Manual test: trigger Ctrl+Shift+T; PASS rows display green-tinted background, FAIL rows display yellow-tinted background, badges remain visible. The override block is <=30 lines."
  - criterion: "Escape key handling for the harness is merged into the existing Escape chain at ~line 2055. The early `return` previously at ~line 2053 is removed; harness Escape uses the same `classList.contains('visible')` check pattern as `linkModal` and `htmlModal`."
    verification: "grep -n \"e.key === 'Escape'\" index.html shows a single handler block. Inside that block, the harness check uses `.classList.contains('visible')` and `.classList.remove('visible')` (not `hasAttribute('hidden')` / `setAttribute('hidden')`). Manual test: with link modal open, pressing Esc closes link modal first (preserves prior ordering); with only harness open, Esc closes harness."
  - criterion: "The Ctrl+Shift+T toggle at ~lines 2044-2053 uses `.classList.toggle('visible')` (or equivalent add/remove via the `.visible` class). `renderTestHarness()` is still called before showing the harness."
    verification: "Read lines ~2043-2055 of index.html; confirm the toggle branch uses `classList` operations on the overlay, calls `renderTestHarness()` before adding `.visible`, and contains no `hidden` attribute manipulation."
  - criterion: "Clicking the backdrop (outside the inner `.modal`) closes the harness, matching the `htmlModal` backdrop-dismiss behavior at ~line 2040."
    verification: "grep -n 'testHarness.addEventListener' index.html shows a click handler that closes via `.classList.remove('visible')` when `e.target === testHarness`. Manual test: open harness, click backdrop, harness closes."
  - criterion: "The `renderTestHarness()` function body (at ~line 1693) and the `HUMANIZE_FIXTURES` array are unchanged in behavior — fixture rows still render with PASS/FAIL labels and the same Input / Expected / Actual fields. Row markup may use renamed classes if the CSS rename required it, but the rendered information is identical."
    verification: "Manual test: press Ctrl+Shift+T, verify every fixture from HUMANIZE_FIXTURES renders one row, each row shows label + PASS-or-FAIL badge + Input + Expected pattern + Actual output. Compare against pre-change screenshot count of rows — count is identical."
  - criterion: "Both existing production modals (`#htmlModal` and `#linkModal`) continue to function: open via their existing triggers, close via X button, close via Esc, close via backdrop click."
    verification: "Manual test: click View HTML button — modal opens; press Esc — closes. Open link modal via toolbar — opens; press Esc — closes. Click outside htmlModal — closes."
depends_on: []
estimated_complexity: medium
epic: sendgrid-handlebars-preview
test_strategy:
  needed: false
  justification: "No automated test suite exists in this repo (per CLAUDE.md: 'no test command detected'). The `renderTestHarness()` fixture runner is itself the manual verification harness for `humanizeTemplateError`; this refactor preserves it byte-for-byte in behavior. Verification is performed via the manual acceptance criteria above (open harness via Ctrl+Shift+T, confirm row count + PASS/FAIL parity + Esc/backdrop dismiss for all three modals)."
---

# Refactor `#testHarness` to reuse the established modal idiom

## Objective

Eliminate the parallel modal idiom introduced in TASK-008. Replace the bespoke `.test-harness*` CSS block (~100 lines) and `[hidden]`-attribute toggling with the established `.modal-overlay` / `.modal` / `.modal-close` / `.visible` pattern already used by `#htmlModal` and `#linkModal`. Merge the harness Escape branch into the existing Escape chain. Preserve `renderTestHarness()` and `HUMANIZE_FIXTURES` behavior unchanged — only the shell markup, CSS, and open/close wiring change. This removes duplicated layout/overflow/dismiss code and makes the harness a stylistic citizen of the same modal system.

## Implementation Steps

1. **Replace harness HTML markup** (index.html ~lines 815-824). Current markup:
   ```html
   <div id="testHarness" class="test-harness" hidden>
     <div class="test-harness-inner">
       <div class="test-harness-header">
         <h3>humanizeTemplateError — fixture run</h3>
         <button type="button" id="testHarnessClose">Close</button>
       </div>
       <div class="test-harness-body" id="testHarnessBody"></div>
     </div>
   </div>
   ```
   Replace with:
   ```html
   <div class="modal-overlay" id="testHarness" role="dialog" aria-modal="true" aria-labelledby="testHarnessTitle">
     <div class="modal">
       <div class="modal-header">
         <h2 id="testHarnessTitle">humanizeTemplateError — fixture run</h2>
         <button class="modal-close" id="testHarnessClose" aria-label="Close" title="Close (Esc)">×</button>
       </div>
       <div class="modal-body" id="testHarnessBody"></div>
     </div>
   </div>
   ```
   Keep the HTML comment "Developer test harness (hidden; Ctrl+Shift+T to open)" above the block.

2. **Delete the `.test-harness*` CSS block** at index.html ~lines 517-619 (the comment `/* Developer test harness overlay */` through the closing `}` of `.harness-field pre`). This removes all of: `.test-harness`, `.test-harness[hidden]`, `.test-harness-inner`, `.test-harness-header`, `.test-harness-header h3`, `.test-harness-header button`, `.test-harness-header button:hover`, `.test-harness-body`, `.harness-row`, `.harness-row.pass`, `.harness-row.fail`, `.harness-row-label`, `.harness-badge`, `.harness-row.pass .harness-badge`, `.harness-row.fail .harness-badge`, `.harness-field`, `.harness-field strong`, `.harness-field pre`.

3. **Add a minimal `#testHarness`-scoped CSS override block** in the location where the deleted block lived (around ~line 517, after `#linkModal .modal-body` at ~line 512). The override must cover only what differs from the base modal pattern: the row stack inside `.modal-body`, and the pass/fail row backgrounds/borders/badges. Aim for under 30 lines. Suggested shape (use as guidance; final selectors may use scoped class names retained on row elements such as `.harness-row` if cleaner — but if so, retain those minimal classes in `renderTestHarness()` and document under the scoped block):
   ```css
   /* Developer test harness — overrides on the shared modal shell */
   #testHarness .modal-body {
     flex-direction: column;
     gap: 12px;
     overflow-y: auto;
   }
   #testHarness .harness-row {
     border-radius: var(--radius);
     border: 1px solid var(--border);
     padding: 10px 14px;
     font-size: 12px;
     font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
   }
   #testHarness .harness-row.pass { background: #f0fdf4; border-color: #86efac; }
   #testHarness .harness-row.fail { background: #fefce8; border-color: #fde047; }
   #testHarness .harness-row-label {
     font-weight: 700; font-family: var(--font); font-size: 13px;
     margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;
   }
   #testHarness .harness-badge {
     font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
     text-transform: uppercase; letter-spacing: 0.05em;
   }
   #testHarness .harness-row.pass .harness-badge { background: #dcfce7; color: #166534; }
   #testHarness .harness-row.fail .harness-badge { background: #fef08a; color: #713f12; }
   #testHarness .harness-field { margin-top: 4px; color: var(--muted); }
   #testHarness .harness-field strong { color: var(--text); }
   #testHarness .harness-field pre {
     margin: 2px 0 0 0; white-space: pre-wrap; word-break: break-all;
     background: rgba(0,0,0,0.03); padding: 4px 6px; border-radius: 4px;
     font-size: 11px; color: var(--text);
   }
   ```
   Rationale: scoping all row/field/badge styles under `#testHarness` keeps the base `.modal` pattern uncontaminated while preserving the dev-tool visual differentiation. `renderTestHarness()` keeps emitting `harness-row`, `harness-row-label`, `harness-badge`, `harness-field` classes unchanged.

4. **Replace the Ctrl+Shift+T toggle handler** at index.html ~lines 2044-2053. Replace this block:
   ```js
   const panel = document.getElementById('testHarness');
   if (panel.hasAttribute('hidden')) {
     renderTestHarness();
     panel.removeAttribute('hidden');
   } else {
     panel.setAttribute('hidden', '');
   }
   return;
   ```
   with:
   ```js
   const panel = document.getElementById('testHarness');
   if (panel.classList.contains('visible')) {
     panel.classList.remove('visible');
   } else {
     renderTestHarness();
     panel.classList.add('visible');
   }
   return;
   ```

5. **Merge harness Escape handling into the existing Escape chain** at index.html ~lines 2055-2060. Replace:
   ```js
   if (e.key === 'Escape') {
     const harness = document.getElementById('testHarness');
     if (!harness.hasAttribute('hidden')) { harness.setAttribute('hidden', ''); return; }
     if (linkModal.classList.contains('visible')) { closeLinkModal(); }
     else if (htmlModal.classList.contains('visible')) { closeHtmlModal(); }
   }
   ```
   with (preserve linkModal-before-htmlModal ordering; place harness check at the end since opening it is dev-only and the existing two modals shouldn't change their Esc precedence):
   ```js
   if (e.key === 'Escape') {
     if (linkModal.classList.contains('visible')) { closeLinkModal(); }
     else if (htmlModal.classList.contains('visible')) { closeHtmlModal(); }
     else {
       const harness = document.getElementById('testHarness');
       if (harness.classList.contains('visible')) { harness.classList.remove('visible'); }
     }
   }
   ```
   Note: the original code gave harness Esc priority over the production modals (via early return), but that ordering was an artifact of the parallel idiom, not an intentional UX choice — the harness is a developer-only overlay and cannot be open simultaneously with link/html modals in normal use. Keeping harness last preserves "Esc closes the topmost user-facing modal first" which matches user expectation for the production modals. If this is undesirable, the harness check can be moved to the top with an early return — but the linkModal-then-htmlModal ordering between the two production modals MUST be preserved.

6. **Replace the harness close-button handler** at index.html ~lines 2062-2064. Replace:
   ```js
   document.getElementById('testHarnessClose').addEventListener('click', () => {
     document.getElementById('testHarness').setAttribute('hidden', '');
   });
   ```
   with:
   ```js
   document.getElementById('testHarnessClose').addEventListener('click', () => {
     document.getElementById('testHarness').classList.remove('visible');
   });
   ```

7. **Add backdrop-click dismiss for the harness**, matching the `htmlModal` pattern at ~line 2040. Add immediately after the `testHarnessClose` click handler:
   ```js
   const testHarnessEl = document.getElementById('testHarness');
   testHarnessEl.addEventListener('click', (e) => {
     if (e.target === testHarnessEl) testHarnessEl.classList.remove('visible');
   });
   ```
   Rationale: the established modal idiom includes backdrop-click dismiss; adopting the idiom means adopting this affordance. It is a strict superset of prior behavior — the previous harness had no backdrop dismiss.

8. **Completeness sweep**. Run these greps and confirm:
   - `grep -nE "\.test-harness|\.harness-row|\.harness-badge|\.harness-field" index.html` returns 0 matches (no leftover CSS selectors).
   - `grep -nE "testHarness.*hidden|hidden.*testHarness" index.html` returns 0 matches.
   - `grep -nE "hasAttribute\('hidden'\)|removeAttribute\('hidden'\)|setAttribute\('hidden'" index.html` returns 0 matches (nothing else in the file uses `hidden`-attribute toggling for modals; this is a strict cleanup gate).
   - `grep -c "renderTestHarness" index.html` returns 2 (one definition at ~line 1693, one call site in the Ctrl+Shift+T branch).

9. **Manual verification pass**. Start the local server (`python -m http.server 8080 --bind 127.0.0.1`), open `http://127.0.0.1:8080/`:
   - Press `Ctrl+Shift+T` — harness opens as a centered modal with the same row count and PASS/FAIL coloring as before.
   - Press `Esc` — harness closes.
   - Press `Ctrl+Shift+T` again — harness opens.
   - Click the dimmed backdrop — harness closes.
   - Click `View HTML` — html modal opens; press `Esc` — closes.
   - Open the link modal via the body editor's link toolbar button — opens; press `Esc` — closes.
   - With link modal open, press `Esc` — link modal closes (not the harness).

## Hardest Decision

**How to preserve the harness's pass/fail visual differentiation while deleting the parallel CSS shell.** Three options were considered:

1. **Inline styles on row elements** generated in `renderTestHarness()`. Rejected — moves styling into JS string concatenation, hurts readability, and `escapeHtml`-adjacent code already has CSP-style risk via `innerHTML`. Adding more inline styles widens that surface.
2. **A single modifier class on the inner `.modal`** (e.g. `.modal--dev`) per the work-item's suggestion. Rejected — `.modal--dev` cannot cleanly express row-level pass/fail color states without ALSO retaining row-level classes; the modifier would just be a CSS-only namespace, not a real differentiator. It conflates "this is a dev modal" with "this row passed/failed."
3. **Selected: `#testHarness`-scoped overrides on the existing harness row classes.** The `renderTestHarness()` function continues to emit `harness-row`, `harness-row.pass`, `harness-row.fail`, `harness-badge`, `harness-field` classes verbatim. A compact (~25 line) `#testHarness .harness-row { ... }` override block lives in CSS where the deleted block used to be. This (a) keeps `renderTestHarness()` untouched, (b) prevents `.harness-row` from leaking outside the harness modal because it's id-scoped, (c) matches the existing `#linkModal .modal { ... }` override precedent at ~line 507, and (d) is a strict reduction in CSS surface area (~100 → ~25 lines).

The work-item's suggested `.modal--dev` is rejected for the reasons in option (2); the spirit of the suggestion — "share the shell, not the row styling" — is fully met by id-scoping.

## Rejected Alternatives

- **Keep `[hidden]`-attribute toggling, only swap the CSS shell.** Rejected — the work item explicitly calls out the `[hidden]`-attribute toggle as duplication. Half-refactors are worse than the original: future developers would see one modal using `.visible` and one using `[hidden]` and not know which is canonical. What would change my mind: a finding that `.visible`-class toggling has a concrete drawback for dev-only overlays (e.g., screen-reader behavior) — none surfaced in the SPRINT-003 review.
- **Move harness Esc to the top of the chain with an early return** (preserving original priority). Discussed in Step 5. What would change my mind: explicit user feedback that they expect Esc to close the harness even when link/html modals are also open — but those modals cannot realistically be open simultaneously with the harness in normal use, so this is theoretical.
- **Delete `renderTestHarness()` markup classes (`harness-row`, etc.) and re-emit with semantic class names** like `modal-test-row`. Rejected — broader scope than the work item authorizes (`renderTestHarness()` function and HUMANIZE_FIXTURES data are explicitly out of scope per the proposal). The id-scoped override fully isolates the legacy names without renaming them.

## Lowest Confidence Area

**Esc-chain ordering for the harness.** The original code prioritized harness Esc via early return (lines 2056-2057); my plan moves harness to the end of the chain because the original ordering was an artifact of the parallel idiom rather than a deliberate UX decision. If a reviewer disagrees, swapping ordering is a 3-line change. The risk is low because the harness is dev-only (Ctrl+Shift+T-gated) and cannot be opened simultaneously with the production modals via normal UI affordances — so in practice the ordering question never resolves at runtime. Documented in Step 5 so the executor and reviewer can re-evaluate quickly.
