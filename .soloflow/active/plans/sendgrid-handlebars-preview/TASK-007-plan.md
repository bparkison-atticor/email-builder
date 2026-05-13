---
id: TASK-007
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
  - criterion: "Handlebars.registerHelper('and', ...) and Handlebars.registerHelper('or', ...) are present in the shim block in index.html"
    verification: "grep -nE \"registerHelper\\('(and|or)'\" index.html returns exactly 2 lines, both located between lines 714 and 802 (the SendGrid helper shim block)."
  - criterion: "Both #and and #or are variadic — accept any number of positional args and pull options off arguments[arguments.length-1] rather than a fixed parameter position"
    verification: "Manual code read: both helpers' function bodies reference arguments[arguments.length - 1] (or an equivalent variadic capture) to obtain options; neither uses a fixed (a, b, options) signature."
  - criterion: "Both helpers treat a missing-data chip (Handlebars.SafeString sentinel from isMissingChip) as falsy"
    verification: "Manual code read: each helper's truthiness predicate calls isMissingChip(arg) and returns falsy for chip inputs. Smoke test: template `{{#and Client.Name Client.Missing}}YES{{else}}NO{{/and}}` with test data `{\"Client\":{\"Name\":\"Bob\"}}` renders NO."
  - criterion: "Both helpers treat empty string '' and the literal string 'false' as falsy, matching Handlebars #if string semantics"
    verification: "Smoke test in browser: template `{{#and Flag}}T{{else}}F{{/and}}` renders F when test data is `{\"Flag\":\"false\"}` and also F when test data is `{\"Flag\":\"\"}`; renders T when test data is `{\"Flag\":\"x\"}`."
  - criterion: "{{#and}} renders the fn branch only when ALL non-options arguments are truthy; {{#or}} renders the fn branch when ANY non-options argument is truthy; both render the inverse branch otherwise"
    verification: "Browser smoke: template `{{#and A B C}}ALL{{else}}NOT{{/and}}` with `{\"A\":1,\"B\":1,\"C\":1}` renders ALL; same template with `{\"A\":1,\"B\":0,\"C\":1}` renders NOT. Template `{{#or A B C}}ANY{{else}}NONE{{/or}}` with `{\"A\":0,\"B\":0,\"C\":0}` renders NONE; with `{\"A\":0,\"B\":1,\"C\":0}` renders ANY."
  - criterion: "The comment banner at the top of the shim block (~line 714) no longer lists #and/#or as deferred and explicitly notes chip-aware truthiness for the new helpers"
    verification: "grep -n \"Deferred (IDEA-001 Q3): #and, #or\" index.html returns 0 matches. grep -n \"chip-aware\" index.html returns at least 1 match inside the banner comment block (lines 714-732)."
  - criterion: "All existing behaviors of the six pre-existing helpers remain unchanged (no regressions)"
    verification: "Browser smoke: a Postman Law template body containing nested {{#equals Client.CaseType \"PI\"}}…{{else}}…{{/equals}} still renders the correct branch given matching test data."
depends_on: []
estimated_complexity: low
epic: sendgrid-handlebars-preview
test_strategy:
  needed: false
  justification: "Project has no test runner (per CLAUDE.md) and the executor must remain build-step-free. Verification is via manual browser smoke per the AC verification steps. TASK-008 in this same refinement adds an in-browser fixture harness that this work can borrow for ad-hoc verification but does not depend on."
---

# Extend `#and` / `#or` block helper shims

## Objective

Register variadic `{{#and}}` and `{{#or}}` block helpers alongside the existing six SendGrid helper shims at index.html ~line 714, so SendGrid templates that use these forms route to the correct branch in preview instead of silently falling through to `blockHelperMissing` and rendering the else branch. The two helpers must be chip-aware (missing-data chips count as falsy) and must follow Handlebars `#if` string semantics for `""` and `"false"`.

## Implementation Steps

1. Open `index.html` and locate the helper shim block. Read lines 714 through 802 to confirm the current shape of the banner comment, `isMissingChip`, the four block helpers (`equals`, `notEquals`, `greaterThan`, `lessThan`), and the `blockHelperMissing` fallback.

2. Edit the banner comment at lines 714-724:
   - Update the "Registered helpers" line (currently line 717) to append `, #and, #or` to the existing list (`equals, notEquals, greaterThan, lessThan, insert, formatDate`).
   - Remove line 718 (`// Deferred (IDEA-001 Q3): #and, #or — semantics unverified against SendGrid engine.`).
   - Add a new comment line within the banner explaining: "`#and` / `#or` are variadic and use chip-aware truthiness — missing-data chips, `""`, and `"false"` all count as falsy (matches Handlebars `#if` string semantics)."

3. Add a small helper just below `isMissingChip` (after line 731) or inline within each new helper — pick whichever keeps the block readable. The predicate must return `true` for "truthy enough to render the fn branch":
   ```js
   function isTruthy(val) {
     if (isMissingChip(val)) return false;
     if (val === '' || val === 'false') return false;
     return Boolean(val);
   }
   ```
   The standalone-function form is preferred for readability since the same predicate is used twice.

4. Register `#and` immediately after the four existing block helpers (insert after line 756, before the `insert` inline helper at line 761):
   ```js
   // Block helper: variadic logical AND. Renders fn(this) only when every
   // positional arg is truthy (chip-aware; '' and 'false' count as falsy,
   // matching Handlebars #if string semantics).
   Handlebars.registerHelper('and', function () {
     const options = arguments[arguments.length - 1];
     for (let i = 0; i < arguments.length - 1; i++) {
       if (!isTruthy(arguments[i])) return options.inverse(this);
     }
     return options.fn(this);
   });
   ```

5. Register `#or` directly below `#and`:
   ```js
   // Block helper: variadic logical OR. Renders fn(this) when any positional
   // arg is truthy (chip-aware; '' and 'false' count as falsy).
   Handlebars.registerHelper('or', function () {
     const options = arguments[arguments.length - 1];
     for (let i = 0; i < arguments.length - 1; i++) {
       if (isTruthy(arguments[i])) return options.fn(this);
     }
     return options.inverse(this);
   });
   ```

6. Save. Start the local server (`python -m http.server 8080 --bind 127.0.0.1`) and open `http://127.0.0.1:8080/`. Walk through the smoke verifications listed under each acceptance criterion using the body-copy field and the test-data JSON textarea. Confirm chip behavior with `{{#and Client.Name Client.Missing}}…{{else}}…{{/and}}` and string-falsy behavior with `{"Flag":"false"}` and `{"Flag":""}`.

7. Re-run the grep gates as a completeness check before declaring done:
   - `grep -nE "registerHelper\('(and|or)'" index.html` — expect 2 matches inside the shim block.
   - `grep -n "Deferred (IDEA-001 Q3): #and, #or" index.html` — expect 0 matches.
   - `grep -n "chip-aware" index.html` — expect at least 1 match in the banner comment region.

## Hardest Decision

Whether to extract `isTruthy` as a shared module-scope helper or inline the three falsy checks inside each new registration. Chose to extract because (a) the predicate is non-trivial (three distinct cases) and duplicating it makes drift likely the next time someone tweaks SendGrid-compat rules, (b) the existing code style already extracts `isMissingChip` as a named function for exactly this reuse pattern, and (c) the cost is one named function at module scope, which is consistent with the file's existing density.

## Rejected Alternatives

- **Single combined `#andOr` factory.** Considered building both helpers from one closure-returning factory to share the loop body. Rejected because the helpers' loop bodies differ by one short-circuit condition; the factory adds indirection without meaningfully reducing the code.
- **Strict `===` truthiness only.** Considered using raw `Boolean(val)` without the `""`/`"false"` carve-outs. Rejected because the brief explicitly specifies Handlebars `#if` string semantics, and SendGrid templates frequently pass string-valued flags from the merge data.
- **Register helpers only when needed (lazy).** Rejected because the existing shim block registers all helpers at module-eval time and lazy registration would create an ordering hazard.

## Lowest Confidence Area

Whether SendGrid's actual engine treats `"false"` (lowercase string) as falsy the same way it treats `false` (boolean) or `""` (empty string). The brief mandates this behavior, and it matches Handlebars `#if` semantics, but the original IDEA-001 Q3 explicitly flagged uncertainty about SendGrid `#and`/`#or` semantics. If a real SendGrid render contradicts this for a specific case, the fix is local to `isTruthy`.
