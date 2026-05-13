---
id: TASK-004
idea: IDEA-001
status: approved
created: 2026-05-13T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - .soloflow/active/ideas/IDEA-001.md
  - Claude Design Handoff - UI ENH-001/reference_current_index.html
acceptance_criteria:
  - criterion: "A `<script src=\"https://cdn.jsdelivr.net/npm/handlebars@4.7.8/dist/handlebars.min.js\"></script>` tag appears in the `<head>` block of index.html, after the existing Quill CDN tag (line ~8) and before the `<script type=\"module\">` block."
    verification: "grep -n 'cdn.jsdelivr.net/npm/handlebars@4.7.8' index.html returns exactly one match, and its line number is greater than the Quill script line (8) and less than the line of `<script type=\"module\">`."
  - criterion: "applyTestData() in index.html no longer references HANDLEBARS_TOKEN or resolveTokenPath; instead it compiles the HTML with Handlebars and invokes the template function with a context object."
    verification: "grep -n 'Handlebars.compile' index.html returns at least one match inside the applyTestData function body. Visually confirm applyTestData calls `Handlebars.compile(html)(context)` (or an equivalent two-step compile + invoke) on its hot path."
  - criterion: "The `testDataEnabled` / `testDataValid` early-return guard remains the first statement of applyTestData() and is byte-identical to the pre-change version (`if (!testDataEnabled || !testDataValid) return html;`)."
    verification: "grep -n 'if (!testDataEnabled || !testDataValid) return html;' index.html returns exactly one match, and the matched line is the first executable statement inside applyTestData (the line immediately following the `function applyTestData(html) {` declaration)."
  - criterion: "The context object passed to the compiled template includes `unsubscribe: '#unsubscribe-preview'` as a pre-seeded value before the template function is invoked."
    verification: "Inspect applyTestData: the context literal built before the `Handlebars.compile(html)(context)` call spreads `testData` and includes the property `unsubscribe: '#unsubscribe-preview'`. Manual smoke: with test data enabled and no `unsubscribe` key in the test JSON, the preview iframe resolves `{{{unsubscribe}}}` to the literal text `#unsubscribe-preview`."
  - criterion: "Plain dot-path tokens render identically to the pre-change pipeline. With the default SAMPLE_TEST_DATA enabled, `{{Client.FirstName}}` and `{{{Client.FirstName}}}` both resolve to `James` in the preview iframe."
    verification: "Manual smoke: serve via `python -m http.server 8080 --bind 127.0.0.1`, open the app, ensure test data switch is on with SAMPLE_TEST_DATA loaded, paste `{{Client.FirstName}} / {{{Client.FirstName}}}` into a text block, view preview source — both tokens render as `James`."
  - criterion: "The `HANDLEBARS_TOKEN` constant and `resolveTokenPath` function are absent from index.html after the change."
    verification: "Run `grep -nE 'HANDLEBARS_TOKEN|resolveTokenPath' index.html` — output must be empty (zero matches). The design-handoff snapshot at `Claude Design Handoff - UI ENH-001/reference_current_index.html` is intentionally a frozen reference and is excluded from this check."
depends_on: []
estimated_complexity: low
epic: sendgrid-handlebars-preview
test_strategy:
  needed: false
  justification: "This project has no test infrastructure (CLAUDE.md: 'no test command detected'; zero *.test.* / *.spec.* files in the repo). The IDEA explicitly defines manual smoke verification through the preview iframe as the validation path. Adding a test harness is out of scope for a low-complexity in-place swap; functional verification is encoded as manual-smoke acceptance criteria above."
---

# Load Handlebars.js from CDN and replace the regex pipeline in applyTestData

## Objective

Swap the hand-rolled regex-based token substitution in `applyTestData()` for a real Handlebars compile-and-render pipeline. This unblocks every subsequent slice of IDEA-001 (block helper shims, parse-error surface, missing-data chips) because regex cannot parse recursive same-name block helpers like nested `{{#equals}}…{{/equals}}`. Loading Handlebars 4.7.8 as a global UMD script (mirroring the existing Quill CDN pattern at index.html:8) makes it unconditionally available before the `<script type="module">` block runs, with no import race. Plain dot-path token behavior (`{{Client.FirstName}}`, `{{{Client.FirstName}}}`) and the `testDataEnabled` / `testDataValid` guard are preserved exactly; the unsubscribe special-case migrates by pre-seeding `unsubscribe: '#unsubscribe-preview'` into the rendering context rather than via a custom helper.

## Implementation Steps

1. **Completeness gate (run first).** From the repo root run `grep -nE 'HANDLEBARS_TOKEN|resolveTokenPath' index.html` to confirm the current pre-change state (you should see the same 5 lines this plan was authored against: 1295, 1297, 1303, 1309, 1313). Re-run this exact command at the end of step 6 — output MUST then be empty before reporting COMPLETED.

2. **Add the Handlebars CDN tag.** Open `index.html`. After line 8 (the existing `<script src="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js"></script>` tag) and before the HTML comment block at line 9, insert exactly one new line:

   ```html
   <script src="https://cdn.jsdelivr.net/npm/handlebars@4.7.8/dist/handlebars.min.js"></script>
   ```

   This makes `window.Handlebars` available synchronously before the module block at the bottom of the file runs. No `import` statement is needed inside the module block — Handlebars is a UMD global.

3. **Delete the `HANDLEBARS_TOKEN` regex constant and the `resolveTokenPath` function.** In the `<script type="module">` block, remove lines 1292–1299 (inclusive): the three-line comment block at 1292–1294 explaining the regex, the `HANDLEBARS_TOKEN` declaration at 1295, the blank line at 1296, the `function resolveTokenPath(obj, path) { ... }` declaration at 1297–1299. The `let testDataEnabled = ...;` at line 1290 stays. The `function applyTestData(html) {` at line 1301 stays.

4. **Rewrite the body of `applyTestData`.** Replace the function body (lines 1302–1316 inclusive — everything between `function applyTestData(html) {` and the closing `}` at 1317) with:

   ```javascript
   function applyTestData(html) {
     if (!testDataEnabled || !testDataValid) return html;
     const context = { ...testData, unsubscribe: '#unsubscribe-preview' };
     return Handlebars.compile(html)(context);
   }
   ```

   Notes on intent:
   - The guard `if (!testDataEnabled || !testDataValid) return html;` MUST be byte-identical to the current line 1302 and MUST remain the first executable statement.
   - Spreading `testData` first and then setting `unsubscribe` ensures that if a user explicitly puts an `unsubscribe` key in their test JSON, the preview-only sentinel still wins (matching the prior behavior at lines 1309–1311, which short-circuited when the path was undefined — preview always replaced regardless of test data). If you want the test-JSON value to win when present, instead use `{ unsubscribe: '#unsubscribe-preview', ...testData }`; per IDEA-001 line 100 and the skeleton's wording ("preserve the unsubscribe special-case"), preview-sentinel-wins is the correct choice — keep `unsubscribe` last.
   - The `escapeHtml(value)` call from the old double-brace path is intentionally dropped: Handlebars natively HTML-escapes `{{token}}` and leaves `{{{token}}}` raw, which is the documented SendGrid behavior (IDEA-001 assumption #5).
   - No try/catch is added in this task. The parse-error surface is TASK-006's responsibility; for now, any Handlebars compile error will propagate to `render()`'s outer catch at index.html:1399, which clears the preview — acceptable for the duration of this single task because TASK-006 is gated on TASK-004 and TASK-005.

5. **Verify the `setTestDataHint` function and other adjacent code (lines 1319+) are untouched.** No other code in the file should be modified by this task — including `render()` at line 1378, `lastHtml = result.html` at line 1382 (which preserves the Copy-HTML invariant: raw tokens stay in `lastHtml`), and the `els.preview.srcdoc = applyTestData(result.html)` call at line 1384.

6. **Re-run the completeness gate from step 1.** `grep -nE 'HANDLEBARS_TOKEN|resolveTokenPath' index.html` MUST now return zero matches. Also run `grep -n 'Handlebars.compile' index.html` and confirm at least one match inside applyTestData. Also run `grep -n 'cdn.jsdelivr.net/npm/handlebars@4.7.8' index.html` and confirm exactly one match.

7. **Manual smoke test.** Start the local server (`python -m http.server 8080 --bind 127.0.0.1`), open `http://127.0.0.1:8080/`, ensure the test-data switch is on with the default sample JSON, and confirm in the preview iframe that:
   - `{{Client.FirstName}}` renders as `James` (HTML-escaped path).
   - `{{{Client.FirstName}}}` renders as `James` (raw path — visually identical because the value is plain text).
   - `{{{unsubscribe}}}` renders as `#unsubscribe-preview`.
   - The MJML compilation banner is not showing a fresh error.

## Acceptance Criteria

The six criteria in the frontmatter are the authoritative pass/fail definition. Three are static (grep-based, run against the working tree), two are static-plus-visual (inspect the function body), one is manual-smoke (the preview iframe renders three specific tokens to specific values). All six must pass before this task is marked COMPLETED.

## Test Strategy

No automated tests. Justification in the frontmatter: this project has no test harness, no test command, and no `.test.*` / `.spec.*` files. Adding test infrastructure as part of this low-complexity in-place swap is out of scope; manual smoke through the preview iframe (AC #5) is the validation path encoded in the brief.

## Hardest Decision

The unsubscribe pre-seed ordering. The pre-change behavior at index.html:1309–1311 always replaced `{{{unsubscribe}}}` with `#unsubscribe-preview` whenever the test data lacked that key — but it did NOT short-circuit when the test JSON explicitly provided one. The skeleton phrasing "preserve the unsubscribe special-case without a custom helper" and IDEA-001 line 100 both describe the override as preview-only, which argues for the sentinel always winning. Implementing this as `{ ...testData, unsubscribe: '#unsubscribe-preview' }` makes the sentinel unconditional; the alternative `{ unsubscribe: '#unsubscribe-preview', ...testData }` would let a user-supplied value win. The former matches the brief's intent ("preview-only") and the test JSON has no realistic reason to set this key; chosen.

## Rejected Alternatives

- **Import Handlebars from `esm.sh` inside the `<script type="module">` block (matching the MJML import at line 711).** Rejected because Q1's answer explicitly chose `<script src>` jsDelivr global on three grounds: brief named jsDelivr, Quill already uses this pattern at line 8, and synchronous-before-module-block eliminates an import race. Would change my mind only if Handlebars' UMD global stopped working in a future major version — not a concern at 4.7.8.
- **Register a custom Handlebars helper for `unsubscribe` instead of pre-seeding the context.** Rejected because the skeleton explicitly requires "without a custom helper" and IDEA-001 assumption #2 confirms pre-seeding is sufficient. Helpers cost compile time and an extra registration step in the module bootstrap for zero behavioral gain.
- **Add a try/catch in this task to avoid temporarily routing Handlebars errors through `render()`'s outer catch.** Rejected because Slice 3 (TASK-006) owns the parse-error surface end-to-end (`setTestDataHint('Template error: ...', 'error')` + fallback to un-rendered HTML). Splitting the try/catch across two tasks duplicates the contract. Would change my mind if TASK-006 were significantly delayed; it is not — it depends on TASK-004 and TASK-005 and will land in the same sprint.
- **Keep `HANDLEBARS_TOKEN` / `resolveTokenPath` as dead code "just in case."** Rejected — AC #6 forbids it, and dead code in a single-file app accumulates fast. The git history is the rollback path.

## Lowest Confidence Area

The implicit assumption that Handlebars.compile() on a full MJML-rendered HTML document (post-MJML compile, often tens of KB with inline styles and tracking pixels) will not hit edge-case parser errors from incidental brace patterns in CSS or URLs. The current regex deliberately matches only `[\w.]` inside `{{ }}`, so it never false-positives on, e.g., `{{ font-size: ... }}`-shaped CSS comments or anything else. Handlebars is more permissive — any literal `{{` followed by what it considers a valid expression will compile. In practice MJML emits well-formed HTML and CSS without literal `{{` sequences, but if a template config disclosure HTML or banner image URL contained a literal `{{`, this swap could regress. Mitigation: TASK-006 adds the try/catch and inline error surface, which will catch any such breakage immediately. If TASK-006 slips, consider escaping `{{` outside of `{{Path.To.Value}}` shapes in a pre-pass — but defer that complication unless smoke testing surfaces it.
