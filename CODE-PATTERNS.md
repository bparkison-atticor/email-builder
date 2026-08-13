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

- **Location:** `index.html` — grep `function wireSegControl`.
- **Use it for:** Registering a group of `.seg-control button` elements as a mutually exclusive toggle that fires a callback on change. Used for CTA type, link type, viewport, and the dark-mode client picker.
- **Canonical example:** grep `wireSegControl(` for all call sites — CTA type (`ctaTypeButtons`) and viewport (`viewportButtons`) are the simplest two.

### `richTextToMjText`

- **Location:** `index.html` — grep `function richTextToMjText`.
- **Use it for:** Converting a Quill editor's inner HTML into a safe `<mj-text>` content block — strips unsafe tags, preserves bold/italics/links/lists, applies the brand's link color.
- **Signature:** `richTextToMjText(html, tpl, opts = {})`. `opts` has seven fields, all optional: `fontSize` (mj-text font-size attribute; `null` inherits the 16px `mj-attributes` default), `color` (mj-text color attribute; `null` inherits `#333333`), `linkColor` (when set, overrides both the brand-accent link pass and the phone-link pass for every anchor, auto-linked phones included), `padding` (mj-text padding attribute, default `'0 0 14px 0'`), `blockMargin` (p/ul/ol bottom margin in px, default `14`), `convertTypedBullets` (default `true` — converts a leading `*`/`-`/`–`/bullet-glyph paragraph into a real `<ul><li>`; pass `false` to keep such text literal), and `align` (mj-text align attribute; `null` inherits MJML's left default — only emitted when non-null, and always appended last so it never disturbs the existing `padding`/`font-size`/`color` attribute order).
- **Byte-parity guarantee:** omitting `opts` reproduces body-copy output byte-for-byte — the two body call sites (`bodyAboveQuill`, `bodyBelowQuill`) both pass only `(html, tpl)`. The harness section "richTextToMjText — default parity + style overrides" is the gate protecting that property; any change to the defaults above must keep those parity fixtures green.
- **Canonical example:** called inside `buildMjml()` for both body-above and body-below editors (no `opts`), and inside `buildMicrocopyBlock` for the CTA microcopy field (styled `opts`).

### `buildMicrocopyBlock`

- **Location:** `index.html` — grep `function buildMicrocopyBlock`.
- **Use it for:** The canonical override caller for `richTextToMjText` — builds the CTA microcopy `<mj-text>` block. Pure: returns `''` for an empty editor (via the shared `hasRichHtml` predicate), otherwise calls `richTextToMjText` with `fontSize`/`color` from the active brand's `ctaMicrocopyFontSize`/`ctaMicrocopyColor` (falling back to `DEFAULT_CTA_MICROCOPY_FONT_SIZE` / `DEFAULT_CTA_MICROCOPY_COLOR`), `linkColor` set to that same muted color so links don't take the brand accent, a larger `padding` (`0 0 18px 0`, absorbing the gap the button gave up), a tighter `blockMargin` (`8`), `convertTypedBullets: false`, and `align: 'center'` (a fixed value, not a per-brand key — matches the CTA `mj-button` above it, which centers via MJML's own default).
- **Canonical example:** called once inside `buildMjml()`; the emitted block is interpolated immediately after the CTA `mj-button`'s closing tag, inside the same `ctaToggle.isOn()` branch.
- **Gotcha:** it passes `convertTypedBullets: false` so a fine-print sentence starting with `*` or `-` is emitted literally instead of being converted into a one-item bulleted list — the opposite default from the two body-copy call sites.

### `autoLinkPhones`

- **Location:** `index.html` — grep `function autoLinkPhones`.
- **Use it for:** Walking a DOM subtree and wrapping plain-text US phone numbers in `<a href="tel:...">` anchors.
- **Canonical example:** called inside `richTextToMjText()` before serializing body copy.
- **Gotcha:** `PHONE_REGEX` has the `/g` flag; always reset `lastIndex = 0` before each `.test()` call — the regex is stateful and will silently skip matches otherwise.

### `applyTestData`

- **Location:** `index.html` — grep `function applyTestData`.
- **Use it for:** Preview-only Handlebars substitution — compiles the rendered HTML with `Handlebars.compile()` and invokes the template against a Proxy-wrapped context built by `buildTestDataContext()`. Resolves `{{dot.path}}` / `{{{triple}}}` tokens, registered helpers (`#equals`, `#notEquals`, `#greaterThan`, `#lessThan`, `insert`, `formatDate`, `#and`, `#or`), and native Handlebars block helpers. Never applied to the copied / exported HTML.
- **Canonical example:** called inside `render()` after `mjml2html()`; result is the iframe `srcdoc`.

### `buildTestDataContext`

- **Location:** `index.html` — grep `function buildTestDataContext`.
- **Use it for:** Wrapping a parsed test-data object in a Proxy so that any key lookup that resolves to `undefined` emits a visible yellow chip in the preview rather than silently rendering as an empty string. Used exclusively by `applyTestData()` — never applied to the copied / exported HTML.
- **Critical Handlebars 4.7+ trap requirement:** the Proxy MUST include `has(target, prop)` and `getOwnPropertyDescriptor(target, prop)` traps in addition to the `get` trap. Handlebars' `lookupProperty` (`proto-access.js`) calls `Object.prototype.hasOwnProperty.call(obj, key)` to guard against prototype-pollution. `hasOwnProperty` does NOT go through the `get` trap — without `has` and `getOwnPropertyDescriptor`, every chip emitted from a nested path is silently stripped back to `undefined` before reaching rendered output. Fix landed in commit a16e93d. Any extension of `buildTestDataContext` must preserve all three traps.
- **Internal-key allowlist:** `INTERNAL_KEYS` (a `Set`) + Symbol passthrough + `__`-prefix guard prevent chip leakage into Handlebars' own property probes. Extend `INTERNAL_KEYS` if new template patterns cause stray chips in non-preview output.

### `humanizeTemplateError`

- **Location:** `index.html` — grep `function humanizeTemplateError`.
- **Use it for:** Translating raw Handlebars compile/render exception messages into plain-English user-facing strings. Pattern-matches known error shapes (unclosed block, mismatched tags, unbalanced mustache) and emits "Body copy: …" messages with concrete fix suggestions.
- **Canonical example:** called from both catch arms inside `applyTestData()` before assigning `templateError`.

### `createModuleToggle`

- **Location:** `index.html` — `createModuleToggle()` (grep `function createModuleToggle`).
- **Use it for:** Building an enable/disable toggle for an optional module. `createModuleToggle(id, label, defaultOn, onChange, persist = true)` returns `{ element, isOn }`; caller appends `element` to the DOM. `onChange(state)` fires once on init and on every flip.
- **Canonical example:** grep `createModuleToggle('` for all callers — CTA, Promo, Test data (persisting) and Dark mode (non-persisting).
- **Gotcha — persistence:** state persists under `emailBuilder.module.<id>` unless the 5th argument `persist` is `false`, which makes the toggle session-only: it neither reads nor writes `localStorage` and always starts at `defaultOn`. The Dark mode toggle is the canonical non-persisting caller. Do NOT hand-roll a `module-toggle` element to avoid persistence — that is what produced two forked switch implementations across SPRINT-007.
- **Gotcha — onChange fires during construction:** the callback runs once *inside* the factory, before the caller can insert `element` into the DOM. Anything the callback touches must already exist. The dark-mode caller handles this by inserting its client picker first, then `insertBefore`-ing the toggle ahead of it.
- **Note:** the Test data toggle carries a one-time copy shim preserving its pre-TASK-014 `emailBuilder.testDataEnabled` value.

### `injectPreviewStyle`

- **Location:** `index.html` — grep `function injectPreviewStyle`.
- **Use it for:** Injecting a preview-only `<style>` block into a compiled HTML string (before `</head>`, else after the opening `<body>`, else prepended). Every dark-mode transform routes its generated CSS through this helper.
- **Canonical example:** `outlookDarkTransform` (grep `function outlookDarkTransform`).
- **Gotcha:** the helper neutralizes a literal `</style` inside `css` so an interpolated value (e.g. a brand color) cannot close the style element early and have its remainder parsed as HTML — the preview iframe is same-origin and already runs an injected `<script>` (see ARCHITECTURE.md). Never hand-concatenate `<style>…</style>` into preview HTML, even for a literal that looks safe today.

### `.seg-body` collapse primitive

- **Location:** `index.html` CSS — grep `.seg-body` for the rule pair (`.seg-body` / `.seg-body.collapsed`); first used by `#ctaBody` (grep `id="ctaBody"`).
- **Use it for:** Animated max-height collapse of a module's field group when its toggle is OFF. Wrap collapsible fields in `<div class="seg-body" id="{module}Body">`; keep the `.seg-head` (which holds the toggle) outside the wrapper so the header stays visible. Toggle the `.collapsed` class from the module's `onChange`.
- **Gotcha:** the expanded ceiling is `max-height: 1000px` — revisit only if a module body exceeds it.

## Recurring Patterns

- **Single-file constraint.** All features are implemented inside `index.html` as inline CSS and vanilla JS. Do not introduce a build step, npm dependencies, React, or separate module files. CDN imports via `esm.sh` are acceptable for new libraries.
- **CDN-first dependencies.** New libraries must be loaded via `<script src="...">` or `import ... from 'https://esm.sh/...'` — no `npm install`.
- **Template config schema.** Each brand is one object in the `templates` map (grep `const templates`). Adding a brand means copying an existing entry and updating its keys; the render pipeline reads these at runtime.
- **MJML as the output format.** All email layout is expressed as MJML, compiled to HTML via `mjml-browser` in the browser. Do not write raw `<table>` email HTML by hand.
- **Validation before copy.** Any new required field should participate in the validation pass inside `runCopyAction()` — call `markInvalid()` on missing values and return early before copying.
- **Error surface routing.** Two distinct error displays — pick the right one or marketers won't see the error:
  - `#testDataHint` (`.hint` element below the JSON textarea — grep `id="testDataHint"`) — JSON parse errors only, set via `setTestDataHint()`. Do NOT use for Handlebars compile or render errors.
  - `#warn` (`.warn` banner above the preview iframe — grep `id="warn"`) — template compile errors, MJML warnings, and placeholder image notices. Set via `showWarn()`. Template errors are staged in the module-scope `templateError` variable (set inside `applyTestData()`) and folded in by `render()` at the `warnings.unshift(templateError)` call. Any new error that requires marketer attention during preview must go through `#warn`.

## Documentation Conventions

- **Doc anchors, not line numbers.** CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and README.md point at code with a greppable needle in the form grep `function wireSegControl` — a function name, an element id, or a unique call expression. Line-number pointers rot silently and were all removed in commit 043ee5d after drifting 400–1500 lines. Anchors still break when an identifier is renamed, so the Ctrl+Shift+T harness's *Documentation anchor drift guard* section extracts every anchor from these four files at runtime and fails if one no longer resolves in `index.html`. When you rename an anchored identifier, update the doc in the same commit.

`/sf:compound` will append patterns extracted from completed sprints to
this file over time.
