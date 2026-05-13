---
id: TASK-008
idea: IDEA-001
status: approved
created: 2026-05-13T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CODE-PATTERNS.md
  - CLAUDE.md
  - .soloflow/active/plans/sendgrid-handlebars-preview/EPIC-sendgrid-handlebars-preview.md
acceptance_criteria:
  - criterion: "Pressing Ctrl+Shift+T while index.html is open in a browser opens a developer test-harness overlay panel"
    verification: "Browser smoke: load index.html, press Ctrl+Shift+T, confirm a panel with a visible heading like 'humanizeTemplateError — fixture run' appears overlaid on the page."
  - criterion: "The panel runs a fixed table of at least 4 (and no more than 6) fixture rows against humanizeTemplateError, covering each branch of the function (Expecting CLOSE_BLOCK / mismatched-tags / Expecting CLOSE_RAW_BLOCK / Expecting CLOSE / Parse error / fallback)"
    verification: "Manual code read: locate the fixture array inside index.html; confirm 4-6 entries; confirm each of the five branches in humanizeTemplateError (~line 1476-1503) is exercised by at least one fixture row. grep -n 'HUMANIZE_FIXTURES' index.html returns the array literal."
  - criterion: "Each fixture row renders as a labeled row inside the panel showing: the input message, the expected pattern, the actual humanizeTemplateError output, and a PASS/FAIL status"
    verification: "Browser smoke: open the panel, confirm each row visually shows all four columns. At least one row visibly passes (green) and the panel correctly reports the actual string."
  - criterion: "A failing fixture (one whose actual output does not match expected_pattern) is rendered with a visually distinct FAIL state"
    verification: "Temporarily edit one fixture's expected_pattern to a string that cannot match (e.g., 'IMPOSSIBLE_PATTERN_ZZZ'), reload, open the panel — confirm that row renders FAIL with a distinct color/styling. Revert before declaring done."
  - criterion: "The panel is dismissible by either pressing Escape or clicking a Close button inside the panel"
    verification: "Browser smoke: open the panel with Ctrl+Shift+T, press Escape — panel hides. Reopen, click Close button — panel hides."
  - criterion: "Escape inside the harness does not interfere with the existing Escape handlers for linkModal / htmlModal (index.html ~line 1835)"
    verification: "Browser smoke: open the link modal (insert link toolbar button), press Escape — link modal closes as before. Open html modal (View HTML button), press Escape — html modal closes as before. Open harness, press Escape — only harness closes."
  - criterion: "The harness UI is hidden by default — a normal page load (no shortcut pressed) shows no harness elements"
    verification: "Browser smoke: load index.html, confirm no harness panel or toggle button is visible. grep -nE 'display:\\s*none|hidden' index.html on the harness container element confirms it starts hidden."
  - criterion: "expected_pattern is matched as a substring (via String.prototype.includes or equivalent), not as an exact-equality check, so the assertions stay robust to minor wording tweaks in humanizeTemplateError"
    verification: "Manual code read: locate the pass/fail predicate; confirm it uses .includes() or a RegExp.test(), not ==="
depends_on: []
estimated_complexity: low
epic: sendgrid-handlebars-preview
test_strategy:
  needed: false
  justification: "This task IS the test harness — adding a meta-test for the harness defeats its purpose. Verification is via the AC smoke steps. The harness is a developer-only feature gated behind a non-discoverable shortcut; it has no end-user surface."
---

# Add a `humanizeTemplateError` developer test harness

## Objective

Add a hidden, keyboard-toggled fixture harness inside `index.html` that runs a fixed table of input/expected_pattern cases against `humanizeTemplateError` (~line 1476) and visually reports pass/fail per row. This gives the developer a one-keypress sanity check that the regex-pattern-matching inside `humanizeTemplateError` still works after any future Handlebars CDN pin bump (`@4.7.8` → future `@4.x`), without violating the project's build-step-free, no-test-runner constraint.

## Implementation Steps

1. **Pick the placement: inline overlay, not a separate file.** The Hardest Decision section below documents the trade-off.

2. **Add the harness DOM** to `index.html`. Place a new `<div id="testHarness" class="test-harness" hidden>` element just before the closing `</body>` (after the htmlModal block — pick the spot adjacent to the other modals for locality):
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

3. **Add minimal styling** inside the existing `<style>` block. Hidden by default (rely on the native `hidden` attribute), positioned as a centered fixed overlay with a backdrop, scrollable when fixture content overflows. Use the existing color palette (yellow for FAIL, soft green for PASS). Reuse the linkModal / htmlModal pattern as a visual reference; keep it simple.

4. **Define the fixture table** as a module-scope `const` immediately below `humanizeTemplateError`:
   ```js
   const HUMANIZE_FIXTURES = [
     {
       label: 'unclosed block (named)',
       input: "Parse error on line 3: ...\n{{#equals foo \"bar\"}}\n-----^\nExpecting 'CLOSE_BLOCK', got 'EOF'",
       expected_pattern: "unclosed {{#equals}} block",
     },
     {
       label: 'mismatched tags',
       input: "equals doesn't match if",
       expected_pattern: "mismatched template tags",
     },
     {
       label: 'unclosed raw block',
       input: "Expecting 'CLOSE_RAW_BLOCK', got 'EOF'",
       expected_pattern: "unclosed raw block",
     },
     {
       label: 'unclosed mustache',
       input: "Expecting 'CLOSE', got 'EOF'",
       expected_pattern: "unclosed {{ tag",
     },
     {
       label: 'fallback / render-time error',
       input: "TypeError: Cannot read properties of undefined",
       expected_pattern: "Body copy: TypeError",
     },
   ];
   ```
   These inputs hit each `humanizeTemplateError` branch. The `expected_pattern` strings are short substrings — deliberately robust to minor wording tweaks.

5. **Wire the runner.** Add `renderTestHarness()` that iterates `HUMANIZE_FIXTURES`, calls `humanizeTemplateError(fixture.input)`, compares with `actual.includes(fixture.expected_pattern)`, and writes one `<div class="harness-row [pass|fail]">` per fixture into `#testHarnessBody`. Each row shows: label, input (in a `<pre>`), expected pattern, actual output, PASS/FAIL badge.

6. **Wire the keyboard shortcut.** Extend the existing document-level keydown handler at index.html ~line 1835 — do NOT add a second handler:
   ```js
   if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
     e.preventDefault();
     const panel = document.getElementById('testHarness');
     if (panel.hasAttribute('hidden')) {
       renderTestHarness();
       panel.removeAttribute('hidden');
     } else {
       panel.setAttribute('hidden', '');
     }
     return;
   }
   ```
   Extend the existing Escape branch so harness dismiss takes priority over modals (place the harness check first):
   ```js
   if (e.key === 'Escape') {
     const harness = document.getElementById('testHarness');
     if (!harness.hasAttribute('hidden')) { harness.setAttribute('hidden', ''); return; }
     if (linkModal.classList.contains('visible')) { closeLinkModal(); }
     else if (htmlModal.classList.contains('visible')) { closeHtmlModal(); }
   }
   ```

7. **Wire the close button.**
   ```js
   document.getElementById('testHarnessClose').addEventListener('click', () => {
     document.getElementById('testHarness').setAttribute('hidden', '');
   });
   ```

8. **Smoke-walk every AC.** Serve, open in browser. Confirm: no harness on load; Ctrl+Shift+T opens panel with 5 PASS rows; Escape closes; reopen + Close button closes; linkModal/htmlModal Escape unchanged; flip one fixture's expected_pattern to a guaranteed-miss and confirm FAIL styling renders correctly; revert.

## Hardest Decision

**Inline overlay panel vs. separate `test-harness.html`.** Chose the inline overlay for three reasons:

1. **Discoverability is solved by the shortcut, not the file location.** A developer who doesn't know the project doesn't know either alternative; the shortcut is documented in this plan.
2. **`humanizeTemplateError` is module-scope inside `index.html`.** A separate file would either duplicate the function source (drift hazard), iframe-load `index.html` (fragile), or require extracting the function (violates the single-file invariant per CLAUDE.md).
3. **A co-located `test-harness.html` could be opened accidentally** by a marketer browsing the directory. Inline + non-discoverable shortcut is safer.

## Rejected Alternatives

- **Separate `test-harness.html` file** — rejected per the Hardest Decision; the function-extraction problem alone is sufficient.
- **Auto-run harness on every load and log to console** — rejected because console noise clutters the developer's flow and silent console output is even less discoverable than a hidden panel.
- **Use the existing `htmlModal` as the rendering surface** — rejected because the htmlModal has its own copy/close lifecycle and overloading it would couple unrelated behavior.

## Lowest Confidence Area

The Escape-handler ordering at index.html ~line 1835. The new harness check is placed *before* the link/html modal checks. If a developer somehow opens both a modal and the harness simultaneously (unlikely — the harness covers most of the screen) the dismiss order may feel wrong. If it surfaces in smoke, swap the order so the harness check is last.
