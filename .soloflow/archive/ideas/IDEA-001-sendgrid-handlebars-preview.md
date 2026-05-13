---
id: IDEA-001
type: FEATURE
status: answered
created: 2026-05-13T00:00:00Z
epics:
  - sendgrid-handlebars-preview
slices:
  - title: "Load Handlebars.js from CDN and wire into applyTestData"
    description: "Add Handlebars 4.7.8 as a CDN <script> tag (cdn.jsdelivr.net), import it into the module scope, and replace the current regex-based applyTestData() body with a Handlebars.compile() + template(testData) call. Plain dot-path tokens ({{Client.FirstName}}, {{{Client.FirstName}}}) must continue to resolve identically."
    value_statement: "Unlocks all subsequent slices by giving the pipeline a real stack-based parser. Without this, nested same-name block helpers like {{#equals}}…{{#equals}}…{{/equals}}{{/equals}} cannot be parsed at all — regex cannot handle recursive nesting."
  - title: "Register SendGrid block helper shims"
    description: "Register {{#equals}}, {{#notEquals}}, {{#greaterThan}}, {{#lessThan}}, {{insert}}, and {{formatDate}} as Handlebars helpers before any template is compiled. Each shim implements the behavior documented in the SendGrid Handlebars reference, including type-coercing equality and the 'default=' syntax for {{insert}}."
    value_statement: "The six helpers cover the vast majority of real SendGrid conditional copy used in practice. Marketers can paste live template copy directly into the textarea and see the correct rendered branch in the preview."
  - title: "Parse-error surface in the preview header"
    description: "Wrap the Handlebars compile and render calls in a try/catch. On error, display a single inline message via setTestDataHint('Template error: <message>', 'error'). Fall back to rendering the un-processed HTML so the marketer still sees structure. Never throw to the top-level render() catch, which would clear the preview entirely."
    value_statement: "Unbalanced blocks and typos in helper names are silent failures today (raw tokens render). Surfacing the error immediately lets the marketer fix the template rather than ship broken conditional copy."
  - title: "Missing-data fallback chips"
    description: "When a referenced path is absent from the test JSON, substitute a visually distinct chip — e.g. <span style='background:#fef08a;padding:0 3px;border-radius:2px;font-family:monospace'>[Client.CaseType — not set]</span> — instead of the empty string or raw token. For block helper comparands, treat a missing path as falsy (triggering the else branch) and append a chip to the rendered output indicating which path was unresolved."
    value_statement: "Empty-string substitution masks missing data silently. Yellow chips make it unmistakable that a field needs to be added to the test JSON, preventing marketers from approving a preview that hides real gaps."
open_questions:
  - question: "Should Handlebars.js be loaded as a <script src> tag (global) or as an ES module import via esm.sh?"
    context: "MJML is imported via 'import mjml2html from https://esm.sh/mjml-browser@4.15.3' inside the <script type=module> block. Handlebars 4.7.8 ships a UMD build that works both as a global and via esm.sh. The <script src> approach avoids a second esm.sh dependency and loads synchronously before the module block runs; esm.sh is more consistent with the MJML pattern."
    candidates:
      - "<script src='https://cdn.jsdelivr.net/npm/handlebars@4.7.8/dist/handlebars.min.js'> — global Handlebars available before the module block; reference as window.Handlebars."
      - "import Handlebars from 'https://esm.sh/handlebars@4.7.8' inside the <script type=module> block — consistent with MJML import pattern."
    answer: "<script src> jsDelivr global. Brief explicitly named jsDelivr as the CDN; Quill already uses this exact pattern at index.html:8, and synchronous-before-module-block makes Handlebars unconditionally available without an import race."
  - question: "How should the {{insert name 'default=Customer'}} helper parse the 'default=' argument syntax?"
    context: "SendGrid's insert helper uses a bare string argument like 'default=Customer' (not a Handlebars hash). Handlebars passes it as a plain string, so the helper implementation needs to parse 'default=' out of the string literal."
    candidates:
      - "Parse the second positional arg string with /^default=(.*)$/ inside the helper body — simple and self-contained."
      - "Pre-process the template string before compiling to rewrite {{insert name 'default=Foo'}} into {{insert name default='Foo'}} so Handlebars receives it as a proper hash arg."
    answer: "Parse inside the helper body with /^default=(.*)$/. Self-contained and avoids a template pre-processing pass that could interfere with other helpers."
  - question: "Should {{#and}} and {{#or}} logical block helpers be included in this slice or deferred?"
    context: "SendGrid's docs mention these helpers but their support is described as less certain than the core set. The brief marks them as 'lower priority — verify whether SendGrid actually supports these.' Shipping untested behavior creates correctness risk."
    candidates:
      - "Include {{#and}} and {{#or}} in this slice — straightforward to implement alongside the others."
      - "Defer to a follow-on slice after the core six helpers ship and are validated against real templates."
    answer: "Defer. The brief itself flagged them as lower-priority and unverified against SendGrid's actual engine. Ship the six confirmed helpers first; revisit if marketers hit a template that needs and/or."
  - question: "Where should the template-error message appear — the existing #warn banner or a new element?"
    context: "The #warn banner at index.html:647 is already used for MJML compilation warnings. Template errors are a different class of error (preview-only, tied to the test data). The #testDataHint element already has .error class styling and is positioned immediately below the test data textarea."
    candidates:
      - "Reuse the existing #warn banner via showWarn() — zero new DOM, consistent with MJML warnings."
      - "Display the error in the existing #testDataHint element — positioned right next to the test data textarea where the issue originates."
      - "Add a new dedicated #templateError element in the preview header, visually distinct from the MJML #warn banner."
    answer: "Use #testDataHint via setTestDataHint(msg, 'error'). The error is caused by content in the test data textarea, so proximity matters; existing .error styling is reusable; zero new DOM."
assumptions:
  - assumption: "Handlebars 4.7.8 is API-compatible with SendGrid's server-side Handlebars rendering for the helpers in scope (equals, notEquals, greaterThan, lessThan, insert, formatDate)."
    confidence: high
    validation: "The brief's scope was derived from the SendGrid Handlebars docs at twilio.com/docs/sendgrid/for-developers/sending-email/using-handlebars. The shims implement the documented behavior, so parity is by construction. Validate by running the sample copy from the brief against the new pipeline."
  - assumption: "Replacing the regex body of applyTestData() with Handlebars.compile() will not break the existing unsubscribe special-case (path 'unsubscribe' → '#unsubscribe-preview') because that logic can be moved into a pre-seeded value in the compiled context object."
    confidence: high
    validation: "Inspect index.html:1309-1311. The special case is a one-line guard inside the regex replace. Pre-seed {unsubscribe: '#unsubscribe-preview'} into the context before rendering — Handlebars will resolve {{{unsubscribe}}} naturally without a custom helper."
  - assumption: "The testDataEnabled / testDataValid guard in applyTestData() (index.html:1302) can be preserved as-is — the Handlebars.compile + render call is simply the new hot path when both are true."
    confidence: high
    validation: "The guard is a two-condition early return before any substitution logic. The new Handlebars call replaces only what happens after the guard, leaving the toggle and validity semantics unchanged."
  - assumption: "lastHtml (index.html:1260, written at line 1382) is assigned the raw mjml2html output before applyTestData() is called, so the invariant that copied HTML retains raw tokens is already architecturally enforced and does not need additional protection."
    confidence: high
    validation: "Confirmed by index.html:1382-1384: lastHtml = result.html is assigned first; applyTestData() is only called on the srcdoc assignment. No change needed."
  - assumption: "Handlebars' default HTML-escaping behavior on double-brace tokens matches SendGrid's — double-brace escapes HTML entities, triple-brace renders raw HTML — and the current escapeHtml() call in the regex path can be removed in favor of Handlebars' native escaping."
    confidence: high
    validation: "This is documented Handlebars behavior: {{expr}} HTML-escapes, {{{expr}}} does not. Matches the intent of the current isTriple branch in applyTestData()."
  - assumption: "Missing-data chips can be injected as HTML strings in the Handlebars context values without being double-escaped, because Handlebars will HTML-escape them on double-brace output. The chip helper must use the Handlebars.SafeString wrapper to output raw HTML."
    confidence: medium
    validation: "Standard Handlebars pattern: return new Handlebars.SafeString('<span ...>chip</span>') from a helper to bypass escaping. Validate by rendering a chip token in a test compile call."
research_recommendation: not_needed
research_rationale: "The SendGrid helper list was already pulled from official docs and captured in the brief; Handlebars 4.x API is stable and well-documented; all remaining questions are answerable from the existing codebase patterns and a quick read of the Handlebars registration API."
---

# SendGrid Handlebars Preview Pipeline

## Raw Input

> SendGrid handlebars support in the test-data preview pipeline.
>
> **Problem:** The current test-data substitution at index.html:1267-1313 is a hand-rolled dot-path resolver. It only handles `{{Client.FirstName}}` / `{{{Client.FirstName}}}` style tokens. When marketers paste real SendGrid copy with block helpers — e.g. nested `{{#equals Client.CaseType "Social Security Disability Insurance"}}A{{else}}{{#equals Client.CaseType "Veterans Disability Claims"}}B{{else}}C{{/equals}}{{/equals}}` — the preview renders the literal `{{#equals}}` text instead of resolving the conditional. Marketers can't trust what they see and may ship the wrong copy to SendGrid.
>
> **Goal:** Make the preview pipeline a faithful renderer of SendGrid's handlebars dialect, so what marketers see in the iframe is what their recipients will see after SendGrid processes the template.
>
> *(full brief as provided)*

## Grounding

All code lives in `index.html`.

**Current substitution system (lines 1262-1317)**

The `applyTestData()` function at line 1301 is the entire substitution pipeline. It applies a single regex `HANDLEBARS_TOKEN` (line 1295: `/\{\{(\{)?\s*([\w.]+)\s*(\})?\}\}/g`) against the compiled HTML string. The regex pattern deliberately excludes block helpers by matching only `[\w.]` — any token containing `#`, `/`, spaces, or quotes (i.e., all block helpers) falls through unmatched and renders as literal text. `resolveTokenPath()` at line 1297 does dot-path traversal.

**Guard conditions (lines 1290, 1302)**

`testDataEnabled` (line 1290, persisted to `localStorage.emailBuilder.testDataEnabled`) and `testDataValid` are both checked before any substitution. These gates must be preserved unchanged.

**Invariant (lines 1260, 1382-1384)**

`lastHtml` is assigned at line 1382 (`lastHtml = result.html`) before `applyTestData()` is called at line 1384 (`els.preview.srcdoc = applyTestData(result.html)`). The architecture already enforces the invariant that copied HTML keeps raw tokens.

**Special-case: unsubscribe token (lines 1309-1311)**

A named guard replaces `{{{unsubscribe}}}` with `'#unsubscribe-preview'` when the path is absent from the test data. This must survive the migration to Handlebars — implemented by pre-seeding the context.

**Error surface (lines 1319-1322, 1373-1376)**

`setTestDataHint()` at line 1319 writes to `#testDataHint` with `.error` / `.success` class support — chosen target for template errors (proximity to test data textarea). `showWarn()` writes to `#warn` (used for MJML compilation warnings, not template errors).

**Existing CDN load pattern**

- Quill: `<script src="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js">` (line 8) — global, synchronous, before module block. **Handlebars will follow this pattern.**
- MJML: `import mjml2html from 'https://esm.sh/mjml-browser@4.15.3'` (line 711) — ES module import inside `<script type="module">`. Not chosen for Handlebars.

**Test data UI (lines 597, 624, 1267-1370)**

Textarea `#testData` (line 597), switch `#testDataSwitch` (line 624), hint `#testDataHint` (line 598). `parseTestData()` (line 1335) validates JSON and sets `testData` / `testDataValid`. `loadTestData()` (line 1325) seeds from `localStorage` or `SAMPLE_TEST_DATA` (line 1268).

## Slices

### Slice 1 — Load Handlebars.js and replace the regex pipeline

Add `<script src="https://cdn.jsdelivr.net/npm/handlebars@4.7.8/dist/handlebars.min.js"></script>` to the `<head>` (following the Quill CDN pattern at line 8). In the `<script type="module">` block, replace the body of `applyTestData()` with a `Handlebars.compile(html)(context)` call. The `HANDLEBARS_TOKEN` regex and `resolveTokenPath()` function are removed. The `testDataEnabled` / `testDataValid` early-return guard is preserved exactly. The unsubscribe special-case is handled by pre-seeding `{unsubscribe: '#unsubscribe-preview'}` into the context object before rendering.

Plain dot-path tokens must continue to work identically: Handlebars natively resolves `{{Client.FirstName}}` via dot-path lookup, and `{{{raw}}}` is native triple-brace.

### Slice 2 — Register SendGrid block helper shims

Before any `Handlebars.compile()` call, register the following helpers once at module initialization:

- `{{#equals a b}}` / `{{#notEquals a b}}` — block helpers using type-coercing `==`; support `{{else}}`.
- `{{#greaterThan a b}}` / `{{#lessThan a b}}` — numeric comparison block helpers; support `{{else}}`.
- `{{insert name 'default=Foo'}}` — inline helper; resolves `name` from the context, falls back to the string after `default=` if undefined/null. Parses second arg with `/^default=(.*)$/`.
- `{{formatDate value 'MM/DD/YYYY'}}` — inline helper; formats a date value using the supplied format string.

`{{#and}}` and `{{#or}}` are deferred (per Q3 answer). `{{#if}}`, `{{#each}}`, `{{#unless}}`, `{{{raw}}}` are native Handlebars — no registration.

### Slice 3 — Parse-error surface

Wrap the `Handlebars.compile(html)` call and the subsequent `template(context)` call in separate try/catch blocks. On either error: call `setTestDataHint('Template error: ' + e.message, 'error')` to surface inline in the existing hint element adjacent to the test data textarea, and return the un-modified `html` string as fallback so the preview still shows structure. Do not propagate to `render()`'s outer catch.

### Slice 4 — Missing-data fallback chips

Extend the Handlebars context preparation: wrap `testData` so any path lookup that returns `undefined` or `null` returns a `Handlebars.SafeString` chip HTML string: `<span style="background:#fef08a;padding:0 2px;border-radius:2px;font-family:monospace;font-size:0.9em">[Path.Name — not set]</span>`. For block helper comparands (e.g., missing `Client.CaseType` in `{{#equals Client.CaseType "X"}}`), treat the missing value as `undefined` → falsy → else branch — and emit a chip in the else output to indicate which comparand was unresolved.

## Open Questions

**Q1 — CDN load mechanism**

Candidates:
- `<script src>` jsDelivr global (same pattern as Quill at line 8)
- `esm.sh` module import (same pattern as MJML)

**Answer:** `<script src>` jsDelivr global. Brief explicitly named jsDelivr; Quill already uses this exact pattern at [index.html:8](index.html#L8); synchronous-before-module-block makes Handlebars unconditionally available without an import race.

**Q2 — `'default=Foo'` arg parsing**

Candidates:
- Parse inside helper body with `/^default=(.*)$/`
- Pre-process template string to rewrite into native hash args

**Answer:** Parse inside the helper body with `/^default=(.*)$/`. Self-contained and avoids a template pre-processing pass that could interfere with other helpers.

**Q3 — `{{#and}}` / `{{#or}}` scope**

Candidates:
- Include in Slice 2
- Defer to follow-on idea

**Answer:** Defer. The brief itself flagged them as lower-priority and unverified against SendGrid's actual engine. Ship the six confirmed helpers first; revisit if marketers hit a template that needs and/or.

**Q4 — Error display location**

Candidates:
- `setTestDataHint(…, 'error')` — proximity to test data textarea
- `showWarn()` — existing `#warn` banner
- New `#templateError` element

**Answer:** `setTestDataHint(msg, 'error')`. The error is caused by content in the test data textarea, so proximity matters; existing `.error` styling is reusable; zero new DOM.

## Assumptions

| Assumption | Confidence | Validation |
|---|---|---|
| Handlebars 4.7.8 resolves `{{Client.FirstName}}` via dot-path identically to current `resolveTokenPath()` | high | Native Handlebars feature; validate by running existing sample test data through the new pipeline |
| `lastHtml` invariant (tokens intact for Copy HTML) is architecturally enforced and requires no code change | high | Confirmed by reading index.html:1382-1384 |
| `testDataEnabled` / `testDataValid` guard (line 1302) can be preserved as the only change to guard logic | high | Confirmed by reading index.html:1301-1317 |
| Unsubscribe special-case migrates by pre-seeding `{unsubscribe: '#unsubscribe-preview'}` into context | high | The guard is a simple path check; pre-seeding achieves identical behavior without custom helper |
| Handlebars `SafeString` can be used to inject chip HTML without double-escaping on `{{double-brace}}` output | medium | Standard Handlebars pattern; validate with a minimal test render |
| The `helperMissing` hook (or data Proxy) is sufficient to intercept missing path lookups inside block helper comparands | medium | Needs targeted test: compile `{{#equals missingPath "X"}}` with a context lacking `missingPath` and verify `helperMissing` fires |
