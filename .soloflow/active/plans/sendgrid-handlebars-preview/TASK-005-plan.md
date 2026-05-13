---
id: TASK-005
idea: IDEA-001
status: approved
created: 2026-05-13T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - .soloflow/active/ideas/IDEA-001.md
acceptance_criteria:
  - criterion: "Exactly six Handlebars helpers — `equals`, `notEquals`, `greaterThan`, `lessThan`, `insert`, `formatDate` — are registered via `Handlebars.registerHelper(...)` calls grouped in a single cohesive block in the `<script type=\"module\">` section, after the MJML import and before `applyTestData()` is first invoked by `render()`."
    verification: "Open `index.html`; visually confirm a contiguous registration block. Run `grep -n \"Handlebars.registerHelper\" index.html` and confirm exactly 6 matches naming the six helper IDs above. Run `grep -n \"registerHelper.*'and'\\|registerHelper.*'or'\" index.html` and confirm 0 matches (deferred helpers absent)."
  - criterion: "`{{#equals \"foo\" \"foo\"}}A{{else}}B{{/equals}}` renders `A`; `{{#equals \"foo\" \"bar\"}}A{{else}}B{{/equals}}` renders `B`; `{{#equals \"1\" 1}}A{{else}}B{{/equals}}` renders `A` (type-coercing `==`)."
    verification: "Manual smoke: temporarily paste each of the three template fragments into the body copy field with test-data ON and observe the preview iframe shows `A`, `B`, `A` respectively. Revert before commit."
  - criterion: "`{{#notEquals a b}}...{{else}}...{{/notEquals}}` is the logical inverse of `{{#equals}}` for identical inputs."
    verification: "Manual smoke: paste `{{#notEquals \"foo\" \"foo\"}}A{{else}}B{{/notEquals}}` → expect `B`; paste `{{#notEquals \"foo\" \"bar\"}}A{{else}}B{{/notEquals}}` → expect `A`."
  - criterion: "`{{#greaterThan 10 5}}A{{else}}B{{/greaterThan}}` renders `A`; `{{#greaterThan 3 5}}A{{else}}B{{/greaterThan}}` renders `B`. `{{#lessThan 3 5}}A{{else}}B{{/lessThan}}` renders `A`; `{{#lessThan 10 5}}A{{else}}B{{/lessThan}}` renders `B`."
    verification: "Manual smoke: paste each fragment in turn into the body copy field and observe the preview iframe rendering."
  - criterion: "`{{insert Client.FirstName 'default=Customer'}}` returns the value of `Client.FirstName` from test data when present (`James` for the default sample); returns the literal `Customer` when the referenced path is absent or null. The literal `default=` prefix is stripped before fallback substitution."
    verification: "Manual smoke 1: with the default sample test data loaded, paste `Hello {{insert Client.FirstName 'default=Customer'}}` → preview shows `Hello James`. Manual smoke 2: edit test data to remove `FirstName` → preview shows `Hello Customer`. Manual smoke 3: paste `{{insert MissingPath 'default=Fallback'}}` → preview shows `Fallback` (and not `default=Fallback`)."
  - criterion: "`{{formatDate \"2026-05-13\" 'MM/DD/YYYY'}}` renders a string formatted per the supplied pattern (e.g. `05/13/2026`) for a parseable ISO date input. Non-parseable input returns the raw input string unchanged."
    verification: "Manual smoke: paste `{{formatDate \"2026-05-13\" 'MM/DD/YYYY'}}` → preview shows `05/13/2026`. Paste `{{formatDate \"not-a-date\" 'MM/DD/YYYY'}}` → preview shows `not-a-date` (graceful fallback, no thrown error)."
  - criterion: "End-to-end nested helper smoke from the brief: pasting `{{#equals Client.CaseType \"Social Security Disability Insurance\"}}A{{else}}B{{/equals}}` into the body copy with test data including `Client.CaseType: \"Social Security Disability Insurance\"` shows `A`; changing the test-data value shows `B`."
    verification: "Manual smoke described in the criterion executed in the running app at `http://127.0.0.1:8080`."
  - criterion: "No regression in plain dot-path token rendering: with the default sample test data, the existing `{{Client.FirstName}}` and `{{{unsubscribe}}}` tokens in the disclosure/unsubscribe blocks still render correctly (i.e., TASK-004's behavior is preserved)."
    verification: "Manual smoke: load the app with default sample test data and the Postman Law template; preview disclosure block shows `James Harper`-style substitutions; unsubscribe link href is `#unsubscribe-preview`."
depends_on: [TASK-004]
estimated_complexity: medium
epic: sendgrid-handlebars-preview
test_strategy:
  needed: false
  justification: "Repo has no test harness, no test runner, and no existing test files (CLAUDE.md: 'no test command detected'). Verification is the documented manual smoke-test path executed against the running local server, encoded in the acceptance_criteria above. Introducing a unit-test scaffold for six small pure helpers is out of scope for this slice; if a future task adds a harness, helper-level unit tests are the natural first target."
---

# Register SendGrid block helper shims (equals, notEquals, greaterThan, lessThan, insert, formatDate)

## Objective

Register the six confirmed SendGrid Handlebars helper shims on the global `Handlebars` reference exactly once at module initialization, so that templates pasted into the body copy field (and brand templates that reference these helpers in unsubscribe/disclosure HTML) render their correct branches in the preview iframe. After this task, marketers can paste real SendGrid conditional copy — including nested `{{#equals}}` blocks and `{{insert ... 'default=…'}}` fallbacks — and trust that the preview matches what SendGrid will produce at send time. `{{#and}}` and `{{#or}}` are explicitly deferred per IDEA-001 Q3.

## Implementation Steps

1. Open `index.html` and locate the `<script type="module">` block (starts at line 711). TASK-004 will have already added the Handlebars CDN `<script src>` in the `<head>` (following the Quill pattern at line 8) and rewritten `applyTestData()` (current location lines 1301–1317) to call `Handlebars.compile(html)(context)`. This task ADDs a new helper-registration block; it does not modify `applyTestData()` itself.

2. Choose the insertion site: immediately AFTER the `import mjml2html from 'https://esm.sh/mjml-browser@4.15.3';` statement at line 711, and BEFORE the `const templates = { ... }` declaration (currently starts at line 725). This places registration at module-evaluation time, which runs once and completes before any DOMContentLoaded handler, any `render()` invocation, and any `applyTestData()` call. `window.Handlebars` is guaranteed to be defined here because the CDN `<script src>` is synchronous and lives in the `<head>` above the module block.

3. Insert a single cohesive registration block. Use `window.Handlebars` (or a local `const Handlebars = window.Handlebars;` alias at the top of the block — pick one and use it consistently). Add a leading comment banner that documents: (a) the helpers registered, (b) the deferred set (`#and`/`#or`), and (c) the rationale ("Native Handlebars provides `#if`, `#each`, `#unless`, `{{{raw}}}` — do not re-register"). The block must define exactly the six helpers below.

4. **`equals` (block helper).** Register as:
   ```
   Handlebars.registerHelper('equals', function (a, b, options) {
     // Type-coercing == per SendGrid semantics (e.g. "1" == 1 → true).
     return (a == b) ? options.fn(this) : options.inverse(this);
   });
   ```
   `options.inverse(this)` is how Handlebars exposes the `{{else}}` branch — invoking it is what makes `{{else}}` work.

5. **`notEquals` (block helper).** Logical inverse of `equals`:
   ```
   Handlebars.registerHelper('notEquals', function (a, b, options) {
     return (a != b) ? options.fn(this) : options.inverse(this);
   });
   ```

6. **`greaterThan` (block helper).** Numeric comparison; coerce both sides with `Number(...)` so string-valued JSON paths like `"42"` work:
   ```
   Handlebars.registerHelper('greaterThan', function (a, b, options) {
     return (Number(a) > Number(b)) ? options.fn(this) : options.inverse(this);
   });
   ```

7. **`lessThan` (block helper).** Symmetric to `greaterThan`:
   ```
   Handlebars.registerHelper('lessThan', function (a, b, options) {
     return (Number(a) < Number(b)) ? options.fn(this) : options.inverse(this);
   });
   ```

8. **`insert` (inline helper).** Resolve the first positional arg from context; if it's `undefined`, `null`, or empty string, parse the second positional arg with the regex `/^default=(.*)$/` and return the captured fallback. If the second arg is missing or doesn't match the regex, fall back to empty string:
   ```
   Handlebars.registerHelper('insert', function (value, defaultArg) {
     if (value !== undefined && value !== null && value !== '') return value;
     if (typeof defaultArg === 'string') {
       const m = defaultArg.match(/^default=(.*)$/);
       if (m) return m[1];
     }
     return '';
   });
   ```
   Note: Handlebars passes the helper-options hash as the LAST argument when no positional default is supplied, so `defaultArg` may be the options object. The `typeof defaultArg === 'string'` guard makes the regex parse safe — if `defaultArg` is the options object (no second positional arg provided), we skip the match and return empty string.

9. **`formatDate` (inline helper).** Parse the first arg with `new Date(...)`; if invalid (`isNaN(date.getTime())`), return the raw input unchanged. Otherwise apply a small format-string replacer that supports the documented tokens `MM`, `DD`, `YYYY` at minimum (also `HH`, `mm`, `ss` for time-of-day):
   ```
   Handlebars.registerHelper('formatDate', function (value, format) {
     if (typeof format !== 'string') return value;
     const d = new Date(value);
     if (isNaN(d.getTime())) return value;
     const pad = (n) => String(n).padStart(2, '0');
     return format
       .replace(/YYYY/g, d.getFullYear())
       .replace(/MM/g, pad(d.getMonth() + 1))
       .replace(/DD/g, pad(d.getDate()))
       .replace(/HH/g, pad(d.getHours()))
       .replace(/mm/g, pad(d.getMinutes()))
       .replace(/ss/g, pad(d.getSeconds()));
   });
   ```

10. **Completeness gate before commit.** Run `grep -n "Handlebars.registerHelper" index.html` — expect exactly 6 matches, one per helper name above, contiguous within the registration block. Run `grep -nE "registerHelper\\(['\\\"](and|or)['\\\"]" index.html` — expect 0 matches (deferred helpers must not appear).

11. **Manual smoke (run before reporting COMPLETED).** Start the local server (`python -m http.server 8080 --bind 127.0.0.1`) and open the app. With the default sample test data and test-data ON:
    - Paste each of the AC fragments in turn into the body copy field and confirm the rendered preview matches the expected outputs.
    - Paste the nested-helper end-to-end fragment from the brief and confirm both branches.
    - Confirm plain `{{Client.FirstName}}` substitution still renders in the disclosure block and `{{{unsubscribe}}}` still becomes `#unsubscribe-preview` (TASK-004 invariants preserved).

## Acceptance Criteria

See frontmatter. Each criterion is paired with a verification method that is either a `grep` over `index.html` or a paste-into-running-app smoke test. The criteria collectively cover: registration shape (count, names, deferred set absence), each helper's truthy-and-else paths, type coercion for `equals`, `default=` parsing for `insert`, ISO-to-format-string rendering for `formatDate`, the end-to-end nested-helper case from the brief, and a no-regression check against TASK-004's plain-dot-path rendering.

## Test Strategy

Not applicable. The repo has no test harness or test runner. Verification is via the documented manual smoke-test sequence executed against the running local server (encoded in the acceptance criteria). Standing up a JS test scaffold to unit-test six pure helpers is out of scope for this slice and would expand the change footprint well beyond what the IDEA proposes.

## Hardest Decision

**Where to register the helpers.** Three candidate sites: (a) immediately after the `import mjml2html` statement at line 711 (module-evaluation time, runs once before any user interaction); (b) inside the existing DOMContentLoaded / initialization flow that wires up `els.*` and calls `loadTestData()`; (c) lazily inside `applyTestData()` itself, gated by a "registered yet?" boolean.

Chose (a). It runs unconditionally before any `render()` or `applyTestData()` call (so the contract "registered before first compile" is structural rather than enforced by ordering inside a function), it's discoverable at the top of the module where other module-level constants like `templates` and `DEFAULT_UNSUBSCRIBE` live, and `window.Handlebars` is guaranteed defined because the CDN `<script src>` in `<head>` is synchronous-before-module-block (same proven pattern as Quill at line 8). (b) couples helper registration to DOM readiness, which is unrelated. (c) adds a hot-path branch on every render for zero benefit and risks the boolean guard being out-of-sync if a future refactor adds a second compile site.

## Rejected Alternatives

- **Implement `{{#and}}` and `{{#or}}` opportunistically since they're trivial.** Rejected per IDEA-001 Q3: the brief explicitly flagged them as unverified against SendGrid's actual engine. Shipping a shim whose semantics may not match SendGrid's would defeat the whole purpose of this work (preview fidelity). Would reconsider if a marketer hits a real template needing them AND we verify the SendGrid behavior side-by-side.
- **Use a real date library (e.g. `date-fns` or `dayjs`) for `formatDate`.** Rejected because it would add a second runtime CDN dependency and an `import` for one helper. The token-replace approach handles `MM/DD/YYYY` and the common time tokens, which covers documented SendGrid `formatDate` usage. Would reconsider if marketers paste templates using format tokens we haven't implemented (e.g. locale-specific month names).
- **Pre-process the template to rewrite `'default=Foo'` into a native Handlebars hash arg `default='Foo'`.** Rejected per IDEA-001 Q2. A pre-pass over the template string risks interfering with other helpers and adds a layer that has to be reasoned about every time a future helper is added.
- **Implement `insert` as a block helper instead of an inline helper.** Rejected: SendGrid documents `insert` as inline (`{{insert ...}}`), not block (`{{#insert}}...{{/insert}}`). Matching their shape is the point of this work.

## Lowest Confidence Area

The exact shape of SendGrid's `formatDate` token vocabulary. The implementation supports `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss` — the conventional set — but SendGrid's docs are not exhaustive about which tokens they accept. A marketer pasting a template that uses an exotic token (`MMM` for short month name, or a locale-sensitive format) will see the literal token render unchanged. This is graceful degradation, not a crash, and is the natural extension point if and when it surfaces. Mitigation: if/when a real template breaks, extend the replacer; do not pre-emptively wire in a date library.

A secondary, narrower risk: the `insert` helper's last-arg-is-options-hash protection assumes Handlebars passes the options object as the trailing arg when no positional default is supplied. This is documented behavior, but worth eyeballing during manual smoke by pasting `{{insert MissingPath}}` (no second arg) and confirming the preview shows empty string rather than throwing or rendering `[object Object]`.
