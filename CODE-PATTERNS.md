# Code Patterns

Reusable conventions and shared utilities in this codebase. Each entry points
to a canonical example — read those for the actual implementation.

## File / Directory Conventions

- **Naming:** single-file app — all code lives in `index.html`. No module files or directories in production.
- **Test colocation:** _no test runner in use_
- **Barrels:** _n/a — no module system_
- **Formatting:** _no formatter config detected_

## Shared Utilities

### `wireSegControl`

- **Location:** `index.html` ~line 821
- **Use it for:** Registering a group of `.seg-control button` elements as a mutually exclusive toggle that fires a callback on change. Used for CTA type (Phone / URL variable) and viewport (Desktop / Mobile).
- **Canonical example:** CTA type wiring ~line 830; viewport wiring ~line 835.

### `richTextToMjText`

- **Location:** `index.html` ~line 894
- **Use it for:** Converting a Quill editor's inner HTML into a safe `<mj-text>` content block — strips unsafe tags, preserves bold and links, applies the brand's link color.
- **Canonical example:** called inside `buildMjml()` for both body-above and body-below editors.

### `autoLinkPhones`

- **Location:** `index.html` ~line 852
- **Use it for:** Walking a DOM subtree and wrapping plain-text US phone numbers in `<a href="tel:...">` anchors.
- **Canonical example:** called inside `richTextToMjText()` before serializing body copy.
- **Gotcha:** `PHONE_REGEX` has the `/g` flag; always reset `lastIndex = 0` before each `.test()` call — the regex is stateful and will silently skip matches otherwise.

### `applyTestData`

- **Location:** `index.html` ~line 1094
- **Use it for:** Preview-only Handlebars substitution — resolves `{{dot.path}}` and `{{{triple}}}` tokens against the parsed test-data JSON object. Never applied to the copied / exported HTML.
- **Canonical example:** called inside `render()` after `mjml2html()`.

## Recurring Patterns

- **Single-file constraint.** All features are implemented inside `index.html` as inline CSS and vanilla JS. Do not introduce a build step, npm dependencies, React, or separate module files. CDN imports via `esm.sh` are acceptable for new libraries.
- **CDN-first dependencies.** New libraries must be loaded via `<script src="...">` or `import ... from 'https://esm.sh/...'` — no `npm install`.
- **Template config schema.** Each brand is one object in `TEMPLATE_CONFIGS` (~line 664). Adding a brand means copying an existing entry and updating its keys; the render pipeline reads these at runtime.
- **MJML as the output format.** All email layout is expressed as MJML, compiled to HTML via `mjml-browser` in the browser. Do not write raw `<table>` email HTML by hand.
- **Validation before copy.** Any new required field should participate in the validation pass inside `runCopyAction()` — call `markInvalid()` on missing values and return early before copying.

`/sf:compound` will append patterns extracted from completed sprints to
this file over time.
