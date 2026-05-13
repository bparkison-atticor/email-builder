---
id: TASK-006
idea: IDEA-001
status: approved
created: 2026-05-13T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - .soloflow/active/ideas/IDEA-001.md
acceptance_criteria:
  - criterion: "A try/catch wraps the `Handlebars.compile(html)` call; a separate try/catch (or a single combined try/catch) wraps the subsequent `template(context)` call. On either error, `setTestDataHint('Template error: ' + e.message, 'error')` is invoked and `applyTestData()` returns the original `html` string."
    verification: "Read `applyTestData()` in index.html; confirm both `Handlebars.compile(...)` and `template(context)` are inside try/catch; confirm the catch body calls `setTestDataHint('Template error: ' + ...)` and `return html`."
  - criterion: "A Handlebars syntax error in the template does NOT trigger `render()`'s outer catch block (preview still renders structural HTML)."
    verification: "Manual smoke: temporarily insert `{{#unclosed}}` into a template body via the body editor; observe that `#preview` iframe still shows the email structure (not the red `MJML error:` <pre>) and `#testDataHint` shows `Template error: ...`."
  - criterion: "A referenced path absent from the test JSON renders the chip HTML `<span style=\"background:#fef08a;padding:0 2px;border-radius:2px;font-family:monospace;font-size:0.9em\">[Path.Name — not set]</span>` at the token position instead of an empty string or raw token."
    verification: "Manual smoke: remove `Client.FirstName` from the test JSON; reload preview; inspect iframe DOM and confirm a `<span>` with `background:#fef08a` and text `[Client.FirstName — not set]` appears at the token site."
  - criterion: "Chip HTML is emitted via `new Handlebars.SafeString(...)` so that `{{Path.Name}}` (double-brace) does not double-escape the chip's `<span>` markup."
    verification: "Read the missing-data handling code in index.html; confirm `new Handlebars.SafeString(...)` wraps the chip string. Smoke: a chip rendered from `{{Client.FirstName}}` (double-brace) produces a real DOM `<span>` element, not literal `&lt;span&gt;...` text."
  - criterion: "Pre-seeded `unsubscribe` key is excluded from chip injection — `{{{unsubscribe}}}` resolves to `#unsubscribe-preview` without emitting a `[unsubscribe — not set]` chip."
    verification: "Manual smoke: render a template containing `{{{unsubscribe}}}` with the default test JSON; inspect the iframe and confirm the rendered href/text is `#unsubscribe-preview` and no yellow chip appears at that position."
  - criterion: "`{{#equals missingPath \"X\"}}A{{else}}B{{/equals}}` where `missingPath` is absent from the test JSON renders the `B` (else) branch — i.e., the missing comparand is treated as falsy by the `equals` shim."
    verification: "Manual smoke: paste a template containing `{{#equals Client.Nonexistent \"X\"}}A{{else}}B{{/equals}}` into the body editor; remove (or never include) `Client.Nonexistent` from the test JSON; confirm the rendered preview contains `B`, not `A`."
  - criterion: "When `applyTestData()` returns the original unmodified `html` (the error fallback), `els.preview.srcdoc` is still assigned that fallback HTML and `lastHtml` (line 1382) remains the raw mjml2html output."
    verification: "Read the catch body in `applyTestData()`; confirm `return html` (the input parameter). Read `render()` (lines 1378-1404) and confirm `lastHtml = result.html` precedes `applyTestData(result.html)`, unchanged from current."
depends_on: [TASK-004, TASK-005]
estimated_complexity: medium
epic: sendgrid-handlebars-preview
test_strategy:
  needed: false
  justification: "No test command is configured in this repo (CLAUDE.md: 'no test command detected'). All other tasks in this codebase verify via manual smoke through the preview iframe; introducing a test harness for a single helper would be out of scope. Acceptance criteria specify concrete manual smoke procedures (deliberate `{{#unclosed}}`, remove `Client.FirstName`, missing-comparand `{{#equals}}`) that the executor must run before reporting COMPLETED."
---

# Parse-error surface and missing-data fallback chips

## Objective

Make the Handlebars-based preview pipeline (introduced by TASK-004 + TASK-005) robust to both author errors and incomplete test data. Template syntax errors must surface inline at `#testDataHint` and not destroy the preview; references to JSON paths that are absent must render as visible yellow `[Path.Name — not set]` chips, including a falsy treatment inside block-helper comparands so `{{#equals}}` etc. fall through to the `else` branch when the comparand is missing.

## Implementation Steps

1. **Read the current post-TASK-005 state of `applyTestData()`** in `index.html`. TASK-004 will have replaced the regex body with a `Handlebars.compile(html)(context)` call; TASK-005 will have added a `Handlebars.registerHelper(...)` block for `equals`, `notEquals`, `greaterThan`, `lessThan`, `insert`, `formatDate`. Anchor on the current line numbers in this file (~1290–1322 for `applyTestData()` / `setTestDataHint()`, ~1378–1404 for `render()`) but adapt to the post-TASK-005 layout.

2. **Wrap the compile and render calls in try/catch.** Replace the body that TASK-004 produced (after the `testDataEnabled` / `testDataValid` guard, which stays unchanged) with a structure equivalent to:
   ```js
   if (!testDataEnabled || !testDataValid) return html;
   let template;
   try {
     template = Handlebars.compile(html);
   } catch (e) {
     setTestDataHint('Template error: ' + e.message, 'error');
     return html;
   }
   const context = buildTestDataContext(testData); // see step 3
   try {
     return template(context);
   } catch (e) {
     setTestDataHint('Template error: ' + e.message, 'error');
     return html;
   }
   ```
   Both catch arms MUST call `setTestDataHint('Template error: ' + e.message, 'error')` and `return html` (the original, untransformed input). Do NOT rethrow — `render()`'s outer catch at ~line 1399 is reserved for MJML compile failures and must not be triggered by Handlebars errors.

3. **Build the chip-injecting context via a Proxy.** Add a helper function `buildTestDataContext(data)` (place it adjacent to `applyTestData()`, immediately above it). It returns a Proxy that wraps `data` so that:
   - Path lookups (`Client`, `Client.FirstName`, etc.) that resolve to a non-`undefined`/non-`null` primitive or sub-object return the real value.
   - Sub-object lookups return a wrapped Proxy recursively (so `Client.FirstName` traverses through `Client`'s proxy).
   - The reserved key `unsubscribe` is pre-seeded onto the root context with value `'#unsubscribe-preview'` BEFORE the Proxy is constructed, and the Proxy's `get` trap returns the pre-seeded value as-is (no chip) when `prop === 'unsubscribe'` at the root. This preserves the assumption-validated unsubscribe special-case.
   - A `get` for any other missing key returns a `Handlebars.SafeString` whose HTML is exactly: `<span style="background:#fef08a;padding:0 2px;border-radius:2px;font-family:monospace;font-size:0.9em">[<fullPath> — not set]</span>` where `<fullPath>` is the dot-joined path from the root (e.g., `Client.FirstName`). To produce the full path, each Proxy carries a `prefix` string; the root has `prefix = ''`, and recursive Proxies pass `prefix + key + '.'`.
   - Handlebars internal lookups (`__proto__`, `constructor`, `then`, `toString`, `valueOf`, `Symbol.*`, and any non-string property keys) MUST bypass chip injection — return `undefined` (or the real value if present) so Handlebars' own machinery doesn't render chips for its template-context probes. Implement this as a small allowlist of internal sentinel names returning `undefined`.

4. **Register `helperMissing` and `blockHelperMissing` hooks.** Inside the same helper-registration block that TASK-005 introduced (adjacent to the `equals` etc. registrations), add:
   ```js
   Handlebars.registerHelper('helperMissing', function(/* ...args, options */) {
     const args = Array.prototype.slice.call(arguments, 0, -1);
     const options = arguments[arguments.length - 1];
     // A bare reference like {{Missing.Path}} routes through helperMissing when
     // the path is fully absent (no segment exists). The Proxy in step 3 covers
     // the common case where the parent object exists; this hook covers the
     // root-level miss. Return a SafeString chip using options.name (the path).
     return new Handlebars.SafeString(
       '<span style="background:#fef08a;padding:0 2px;border-radius:2px;font-family:monospace;font-size:0.9em">[' +
       options.name + ' — not set]</span>'
     );
   });
   Handlebars.registerHelper('blockHelperMissing', function(context, options) {
     // Block invocation against an unresolved helper name — render else (inverse).
     return options.inverse ? options.inverse(this) : '';
   });
   ```
   Note: `helperMissing` here is the fallback for top-level path misses; the Proxy in step 3 handles nested misses. Together they cover both shapes. Verify by running the step 7 smoke list.

5. **Ensure block-helper comparands treat missing paths as falsy.** This requires no new code in TASK-006 itself IF TASK-005's `equals`/`notEquals`/`greaterThan`/`lessThan` shims compare with `==` and tolerate `undefined`. When the Proxy returns a `SafeString` chip for a missing path, the comparand would be truthy (a non-empty object). To prevent this, the Proxy's `get` trap MUST detect calls from Handlebars helper argument resolution paths and return `undefined` instead of a chip in those contexts — OR more simply: ALSO return a falsy value usable by `==` comparison. The cleanest approach: emit the chip ONLY at template-output (mustache) sites by making the missing-key return value a `SafeString` whose `.toString()` is the chip HTML AND which also coerces falsy in `==`. Since `SafeString` instances are objects (truthy), this fails. Use this strategy instead:
   - Return a plain JavaScript `undefined` from the Proxy for missing keys.
   - The chip rendering then falls to `helperMissing` for `{{Missing}}` (root) and to a custom output handler for nested misses like `{{Client.Missing}}`.
   - For nested misses: have the Proxy's `get` return a NEW Proxy that, when stringified by Handlebars (via `toString` / template output coercion), returns the chip HTML; but when accessed by `equals` etc. as a positional helper arg, the arg is the Proxy object — and `equals(proxy, "X")` compares object-to-string with `==` → `false`. The `equals` shim from TASK-005 already evaluates `a == b`; a Proxy object `==` a string literal is `false`, so the else branch fires automatically. Verify this by smoke step 7.iv.

   If smoke step 7.iv fails (i.e., `equals` returns truthy because the Proxy coerces non-falsy), patch the TASK-005 helper shims via an additional check at the top of each block helper: `if (a && typeof a === 'object' && a.__isMissingPath) { return options.inverse(this); }` — and tag the missing-path Proxy with `__isMissingPath: true`. Document this fallback as the Lowest Confidence Area below.

6. **Mustache output of the missing-path Proxy must render the chip.** Add a `toString` trap (or a real `toString` property on the returned proxy via a `get` that returns a function when `prop === 'toString'`) that returns the chip HTML for the captured `prefix + key`. Then wrap that string with `Handlebars.SafeString` at the output site. The simplest workable shape:
   - The missing-path return value is a Proxy whose `get(target, prop)` returns:
     - If `prop === 'toString'`: a function returning the chip HTML.
     - If `prop === Symbol.toPrimitive`: a function returning the chip HTML when hint is `'string'` or `'default'`.
     - If `prop === '__isMissingPath'`: `true`.
     - For any other string key: another missing-path Proxy with `prefix + key + '.'`.
   - To prevent double-escaping of the `<span>` on `{{double-brace}}` output, intercept at template-render time: register a custom string-output coercion or — simpler — register `helperMissing` and also lean on the fact that Handlebars calls `.toString()` on its output. Since Handlebars HTML-escapes the `.toString()` result by default for `{{x}}`, the chip would be escaped. Therefore: the Proxy's `valueOf` / `toString` is NOT sufficient. Use a different strategy: return a `SafeString` directly from the missing leaf. Per acceptance criterion 4, the chip MUST use `SafeString` to avoid double-escaping.

   **Final strategy (consolidating steps 3–6):** Have the Proxy's `get` trap return a `SafeString` chip ONLY when the next access would be a string-output (which we cannot know in advance). Pragmatic resolution:
   - Make the Proxy return a `SafeString` chip directly for leaf misses (when there is no further chained `get` likely).
   - In `equals`/`notEquals`/`greaterThan`/`lessThan` shims (modify TASK-005's helpers in this task), unwrap `SafeString` arguments: if `arg instanceof Handlebars.SafeString` AND the string content starts with `<span style="background:#fef08a`, treat the value as missing → return `options.inverse(this)`.
   - This makes the four block helpers chip-aware while keeping the Proxy simple. ADD the helper modifications to step 4's registration block.

7. **Smoke test the assembled behavior.** Run a local server (`python -m http.server 8080 --bind 127.0.0.1`), open the app, and verify each acceptance criterion:
   - i. Insert `{{#unclosed}}` into the body editor; confirm `#testDataHint` shows `Template error: ...` and the preview still renders structural email (logo, header, footer visible) — does NOT show the red `MJML error:` `<pre>`.
   - ii. Remove `Client.FirstName` from the test JSON; confirm a yellow `[Client.FirstName — not set]` chip renders at the token position in the preview iframe. Inspect the iframe DOM to confirm the chip is a real `<span>` element with `background:#fef08a`, not literal escaped text.
   - iii. Confirm `{{{unsubscribe}}}` still resolves to `#unsubscribe-preview` (no chip) with the default test JSON.
   - iv. Paste `{{#equals Client.Nonexistent "X"}}A{{else}}B{{/equals}}` into the body editor; confirm preview renders `B`.
   - v. Confirm `lastHtml` (used by Copy HTML) still contains raw tokens by clicking Copy HTML and pasting elsewhere; chips must NOT appear in the copied HTML.

## Acceptance Criteria

Restated from frontmatter:

1. Both `Handlebars.compile()` and `template(context)` are inside try/catch; on error `setTestDataHint('Template error: ' + e.message, 'error')` runs and the function returns the original `html`.
2. `render()`'s outer catch is NOT entered for Handlebars errors (preview structure still visible).
3. Missing JSON paths render as `[Path.Name — not set]` yellow chips.
4. Chips are emitted via `new Handlebars.SafeString(...)` so they aren't double-escaped on `{{double-brace}}`.
5. Pre-seeded `unsubscribe` is excluded from chip injection.
6. `{{#equals missingPath "X"}}A{{else}}B{{/equals}}` with missing path renders `B`.
7. Error fallback path returns the original input HTML; `lastHtml` invariant preserved.

## Test Strategy

`needed: false`. No test runner configured in this repo (CLAUDE.md). Verification is by the seven manual smoke steps enumerated in step 7 of Implementation Steps, each corresponding 1:1 to an acceptance criterion.

## Hardest Decision

How to make a missing-path value behave **two different ways** depending on call site:
- As a string at a `{{x}}` output site → render as a SafeString chip.
- As an argument to a block helper like `{{#equals missingPath "X"}}` → behave as falsy so the else branch fires.

Three approaches were considered (Proxy with `toString`, `helperMissing` hook, dual-mode SafeString sentinel). Chosen: return `SafeString` chips from the Proxy AND make the four block-helper shims (TASK-005's `equals`/`notEquals`/`greaterThan`/`lessThan`) recognize the chip sentinel (`SafeString` whose content starts with `<span style="background:#fef08a`) and route to `options.inverse(this)`. This is the only path I see that:
- Avoids double-escape on double-brace output (criterion 4).
- Makes the comparand falsy in block helpers (criterion 6).
- Doesn't require Handlebars to expose call-site context inside its `get` machinery (it doesn't).

The chosen approach couples TASK-006 lightly to TASK-005's helper bodies (this task will need to amend them). That coupling is acknowledged in step 6's "Final strategy" and is the reason this task is sequenced after TASK-005.

## Rejected Alternatives

- **Pure `helperMissing` hook, no Proxy.** Rejected: `helperMissing` only fires for top-level path misses; nested misses like `{{Client.Nonexistent}}` resolve `Client` to a real object first, then try `.Nonexistent` on it — that path returns plain `undefined`, which Handlebars renders as empty string, not a chip. Would fail criterion 3 for nested paths.
- **Proxy that returns a chip-bearing object with `toString` + `valueOf`.** Rejected: Handlebars HTML-escapes `.toString()` output for `{{x}}` (criterion 4 would fail — the `<span>` would render as literal text). Would change my mind if Handlebars exposed a per-value "skip-escape" sentinel other than `SafeString`; it does not.
- **Pre-process the template to detect missing references at compile time.** Rejected: requires statically parsing the template, duplicating Handlebars' own parser. Brittle for nested block helpers. The brief explicitly chose Handlebars to avoid this category of work.

Would change my mind on the chosen approach if: smoke step 7.iv fails (i.e., the block-helper sentinel detection in modified TASK-005 shims doesn't fire because the chip's `SafeString` content doesn't survive Handlebars argument resolution intact). In that case, fall back to tagging missing values with a non-enumerable `__isMissingPath` marker via a Proxy wrapping the SafeString — and check for that marker in the helper shims.

## Lowest Confidence Area

The interaction between the Proxy's `get` trap and Handlebars' argument-resolution machinery during block-helper invocation. Specifically: when Handlebars resolves `{{#equals Client.Nonexistent "X"}}`, the sequence is `context.get('Client')` → returns the (existing) `Client` Proxy → `.get('Nonexistent')` → returns the missing-path `SafeString` chip → passed as first arg to the `equals` helper. The helper shim must detect this is a "missing" sentinel without false-positiving on a legitimate `SafeString` value that an author might insert (e.g., via `{{{rawHtml}}}` flowing through `equals`). The matching is by HTML prefix (`<span style="background:#fef08a`), which is sufficient but inelegant. A cleaner mechanism would be tagging the SafeString instance with `__isMissingPath = true` via a Proxy wrapper. If the prefix match proves fragile in real-world templates, switch to the tagged-Proxy approach.

Additionally, Handlebars' internal property probes (`__proto__`, `constructor`, `then`, `Symbol.toPrimitive`, etc.) hitting the Proxy `get` trap must NOT produce chips. The internal-key allowlist in step 3 is the right shape but the exact set of probes Handlebars 4.7.8 performs is empirically determined — if a chip leaks through for a non-existent legitimate key path (e.g., the engine probes `helperMissing` on the context), add that name to the allowlist.
