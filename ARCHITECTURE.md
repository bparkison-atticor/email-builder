# Architecture

## Purpose

Email Builder is a local, single-file browser tool that lets marketers assemble brand-templated SendGrid emails from copy and a CTA, outputting inlined HTML ready to paste into SendGrid's Code Editor. There is no backend, no API, and no deployment — the app runs entirely in the browser against a local HTTP server.

## Entry Points

- **`index.html`** — the sole entry point. Served at `http://127.0.0.1:8080/`. Contains all HTML structure, inline CSS, and a `<script type="module">` block with all application logic.
- **`Email Builder.bat`** — Windows launcher. Double-click to start `python -m http.server` (or `npx serve` as fallback) and open the browser automatically.

## Top-Level Layout

- **`index.html`** — single-file app: HTML markup, `<style>` block, `<script type="module">`. All logic lives here.
- **`Email Builder.bat`** — server launcher for Windows users.
- **`README.md`** — end-user workflow docs; also documents the template config schema.
- **`CHANGELOG.md`** — change log with detailed diffs per entry.
- **`Claude Design Handoff - UI ENH-001/`** — mid-fidelity React/JSX prototypes used as design references for the panel/top-bar redesign; reference only, not production code.

## Major Components / Layers

All logic lives in `index.html`. Logical sections within the `<script type="module">` block:

- **Template configs** (the `templates` map — grep `const templates`) — per-brand assets: banner image URL, CTA colors, unsubscribe HTML, disclosure HTML. One top-level key per brand; the map's keys are the authoritative brand list.
- **Quill editors** — three `Quill` instances: `bodyAboveQuill` and `bodyBelowQuill` for rich-text body copy above and below the CTA, plus `ctaMicrocopyQuill` for the CTA module's optional supporting sentence (bold/italics/link only — no lists). Quill's link sanitizer is patched (`PassthroughLink`) to allow `tel:` URLs and Handlebars tokens.
- **MJML build pipeline** — `buildMjml()` assembles an MJML string from form state; `render()` calls `mjml2html()` and forks the result: `lastHtml` keeps the untransformed HTML (the only source for Copy HTML / View HTML), while the preview `srcdoc` is that same HTML run through `withPreviewLinkHandler(applyDarkMode(applyTestData(...)))`. Export and preview are deliberately different strings from one compile.
- **Dark-mode preview simulation** — `applyDarkMode()` dispatches through the `DARK_MODE_TRANSFORMS` registry to `gmailDarkTransform` / `outlookDarkTransform` / `appleMailDarkTransform`; `detectAuthorDarkScheme()` classifies the compiled HTML for the Apple Mail branch. Shared HSL/WCAG primitives (`parseCssColor`, `contrastRatio`, `remapLightness`, `liftForContrast`) back the Outlook and Apple Mail transforms. Preview only — never touches `lastHtml`. The `#darkNote` caption, sourced from a single map (grep `const DARK_MODE_CLIENT_NOTES`), is the primary disclosure that a simulation is running — visible text announced to screen readers via `role="status"`, not just a hover title.
- **Test data substitution** — `applyTestData()` / `parseTestData()` handle preview-only Handlebars token resolution (`{{dot.path}}` / `{{{triple}}}`) against a user-editable JSON object persisted in `localStorage`.
- **Copy / output flow** — `runCopyAction()` validates required fields, compiles MJML, and copies to clipboard. `openHtmlModal()` / `closeHtmlModal()` manage the raw HTML inspection modal.
- **UI controls** — `wireSegControl()` registers groups of `.seg-control button` elements as mutually exclusive toggles. `updateCtaPreview()` mirrors the active CTA button style live in the form panel. `createModuleToggle()` (grep `function createModuleToggle`) is the shared factory behind all four module toggles (CTA, Promo, Test data, Dark mode) and takes a `persist` flag so a toggle can opt out of `localStorage`.

The preview `<iframe>` (`index.html` — grep `id="preview"`) is deliberately **not** sandboxed: it is same-origin with the host page and executes the link-click `<script>` that `withPreviewLinkHandler` injects. Any code writing into its HTML must assume that threat model — see `injectPreviewStyle` in CODE-PATTERNS.md.

## Frameworks & External Dependencies

All loaded from CDN at runtime — no lockfile, no install step:

- **Quill 2** (jsDelivr CDN) — rich text editor for `bodyAboveQuill`/`bodyBelowQuill` and the CTA microcopy field (`ctaMicrocopyQuill`).
- **mjml-browser 4.15.3** (esm.sh CDN) — MJML-to-HTML compilation in the browser.

## Data Model

No persistent data layer. State is held in:

- DOM form values (template select, preheader, CTA text / type / destination)
- Three Quill editor instances: `bodyAboveQuill` / `bodyBelowQuill` (body above / below CTA) and `ctaMicrocopyQuill` (CTA microcopy)
- `localStorage` (test data JSON and persisting toggle state — a toggle built with `persist: false`, e.g. Dark mode, neither reads nor writes it)

## Build & Run

```
# Start local server (pick one):
python -m http.server 8080 --bind 127.0.0.1
npx serve . -l tcp://127.0.0.1:8080

# Then open:
http://127.0.0.1:8080/
```

No build step required. Double-click `Email Builder.bat` on Windows for a one-click launch.

## Decisions & Trade-offs

_Add architectural decisions here as they're made. ADRs (one file per decision
under `docs/decisions/`) are encouraged for non-trivial trade-offs._
