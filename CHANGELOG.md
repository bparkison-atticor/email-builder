# Changelog

## 2026-08-11 — Dark mode preview simulation (Gmail / Outlook / Apple Mail)

Closes the `dark-mode-preview` epic (IDEA-005, TASK-021 through TASK-024). Preview-only — no change to `buildMjml()` output or the HTML produced by Copy HTML / View HTML.

### Added
- **Dark mode switch + client picker.** New `module-toggle` in the preview header (next to the Test data toggle) flips a preview-only `darkModeEnabled` flag; a three-option `.seg-control` (Gmail / Outlook / Apple Mail) picks which client's behavior to simulate, shown only while the switch is on. Neither the switch nor the picker selection persists across reloads — deliberate, unlike the Test data toggle's `localStorage` persistence.
- **`applyDarkMode(html)`** runs after `applyTestData` and before `withPreviewLinkHandler` in the `srcdoc` chain (`withPreviewLinkHandler(applyDarkMode(applyTestData(result.html)))`) — after substitution so the simulation composes with live test data, before the link handler so the injected click-handler `<script>` is never a transform target. `lastHtml` — the source for **Copy HTML** and **View HTML** — is assigned directly from the compiler output before this step and is never passed through it, so the copied/exported HTML stays byte-identical regardless of dark-mode state.
- **`gmailDarkTransform`** simulates the Gmail iOS app: a CSS `invert(100%) hue-rotate(180deg)` filter on `<body>`, re-applied to `img`/`video`/`svg`, which cancels the body inversion so photos render correctly, plus an explicit inverted `<html>` background to close a canvas seam some browsers otherwise leave white. Chosen over Gmail web, which leaves the email body untouched entirely — simulating it would teach the marketer nothing.
- **`outlookDarkTransform`** simulates Outlook.com / OWA's selective contrast repair: inline background and text colors are remapped (light backgrounds darken, already-dark colors are left alone, dark text is lifted and contrast-checked against a simulated `#1b1b1b` surface). Chosen over Outlook desktop's full invert, which would look near-identical to the Gmail option and make the picker uninformative.
- **`appleMailDarkTransform`** simulates Apple Mail (macOS 12.4+ / iOS 13+), the only opt-in surface of the three. It classifies the compiled HTML via `detectAuthorDarkScheme` ('authored' / 'meta-only' / 'none') and, since this builder's compiler emits no `prefers-color-scheme` / `color-scheme` CSS today, renders the email **unchanged** — the faithful simulation of "nothing to opt into."
- **`.preview-stage.dark`** darkens the chrome around the iframe (`#1a1a1a`) so the Apple Mail no-op still reads as a deliberate result rather than a broken toggle.
- **Test harness Sections 8–10.** New predicate-fixture sections for the Gmail transform (marker injection, filter placement, canvas-seam fix, and a preview-only purity guard asserting `lastHtml` never carries the `EB-DARKSIM` marker regardless of toggle state); the Outlook transform (background/text remap, brand-color preservation, href/background-image safety); and the Apple Mail transform plus `detectAuthorDarkScheme`'s three-way classification, including a drift guard that fails loudly the moment `buildMjml()` starts emitting author dark-mode CSS — the signal to implement the transform's currently-unreachable `'authored'` branch.

## 2026-08-11 — Keller Postman lead outreach wordmark size

### Changed
- **`kellerPostmanLead` banner wordmark** enlarged from 36px to 48px — the text "Keller | Postman" header read too small against the navy band. Padding unchanged.

## 2026-07-21 — New brand: Keches Law Group (lead outreach)

### Added
- **`kechesLead` template config.** "Keches Law Group — Lead Outreach" brand. Banner is the firm's white horizontal logo (SendGrid CDN, 600×149) centered at 300px on a brand-blue `#245280` band via `bannerHtml`/`bannerBackgroundColor`. CTA color `#245280` (per brand guidelines). Lead-outreach disclosure copy ("You are receiving this email because you contacted…") with the firm's Bridgewater, MA address.

## 2026-04-29 — UI ENH-001: Form panel & preview top bar redesign

Implements the [Claude Design Handoff - UI ENH-001](Claude%20Design%20Handoff%20-%20UI%20ENH-001/README.md) spec. Recreates the design inside the existing single-file `index.html` — no React, no build step, no new dependencies. MJML pipeline, Quill editors, copy-HTML flow, raw-HTML modal, validation behavior, and tweak-mode protocol are all unchanged.

### Added
- **Form panel cards.** Wrapped the form into five `.seg` segments: meta (template + preheader, chrome-less) → Body above CTA (white) → Call to action (gray tint `#f7f7f8` / `#e0e0e2`) → Body below CTA (white) → Test data (amber tint `#fffaf0` / `#fde68a`). Type-only hierarchy via `.seg-title` (15px / 600) + small uppercase `.seg-tag` pills (`above CTA`, `below CTA`, `preview only`).
- **Segmented destination control.** Two-button `.seg-control` (Phone / URL variable) with monochrome inline SVG icons replaces the `<input type="radio" name="ctaType">` group. Buttons toggle `.active` + `aria-pressed`.
- **CTA preview chip.** Dashed-border `.cta-preview` block under the destination input renders the button live — text mirrors `#ctaText` (defaults to "Click Here" when empty), background reads the active template's `ctaBackgroundColor` and `ctaTextColor`, updated on `#ctaText` input and `#template` change. Initial paint via `updateCtaPreview()` at startup.
- **Crossfade on destination-type change.** When toggling Phone ↔ URL variable, `#ctaDestinationLabel`, `#ctaDestinationHint`, and the destination `placeholder` swap inside a single 120 ms `opacity` transition (`.fading` class). Skipped when the next text matches the current text so initial render and rapid double-toggles don't flicker.
- **Preview top bar segmented control + toggle switch.** `.seg-control` (Desktop / Mobile, monitor + phone SVGs) + 1×22px `.divider` + `.switch` for test data. Switch wires click and Space/Enter to flip `testDataEnabled`, persist to `localStorage`, sync `aria-checked` + `.on`, and call `scheduleRender()`.
- **`.btn-toolbar` / `.btn-toolbar.primary`** for View HTML and Copy HTML. SVG chevron + clipboard icons added; label wrapped in `<span class="label">` so flash states preserve the icon. `.copied` and `.error` (with shake animation) ported from the old `.btn-primary` rules.

### Changed
- **`getCtaType()`** reads `.seg-control button[data-cta-type].active` instead of `input[name="ctaType"]:checked`.
- **`flashCopyButton(btn, label, cls)`** updates `<span class="label">` if present (preserves the inline SVG); falls back to `textContent` for plain-text buttons (e.g. the modal's `#copyFromModal`). Without this, the first "Copied" / "Copy failed" flash would erase the new icons.
- **Viewport button query** repointed from `.vp-btn[data-vp]` to `.seg-control button[data-vp]`.
- **Test-data toggle** consolidated from two `.vp-btn[data-td]` buttons + `syncTestDataToggle()` into one `#testDataSwitch` element + `syncTestDataSwitch()` + `flipTestData()`.

### Removed
- `<h2>` headings throughout the form panel (`Template`, `Subject`, `Preheader`, `Body — above CTA`, `CTA`, `Body — below CTA`, `Test Data`) — replaced by `.seg-title` text inside cards. The orphan `<h2>Subject</h2>` (no associated input) is dropped entirely.
- Yellow `.note` callouts: the Subject "Reminder" and the Test Data "Preview only" explainer. Their information now lives in the `.seg-tag` pill and a single inline `.hint` line.
- CSS rules: `.radio-group`, `.viewport-toggle`, `.vp-btn` (+ hover/active variants), `.note`, global `h2` / `h2:first-of-type` / `.preview-header h2`. The modal's `<h2 id="htmlModalTitle">` is unaffected — `.modal-header h2` overrides text-transform and letter-spacing locally.
- `testDataButtons` query, `syncTestDataToggle()` function, the per-button event-binding loop, and the initial `syncTestDataToggle()` call.

## 2026-04-29 — Code cleanup pass

### Fixed
- **Phone auto-linker could silently skip matches.** `PHONE_REGEX` has the `/g` flag, which makes `.test()` stateful via `lastIndex`. Inside the `TreeWalker.acceptNode` callback, a successful `.test()` on one text node advanced `lastIndex` past the start of the next node — if that next node was shorter, its phone number was skipped. Now resets `PHONE_REGEX.lastIndex = 0` before each test.

### Removed (dead code)
- `.btn-secondary`, `.btn-secondary:hover`, `.btn-secondary.copied` CSS — no element in the markup ever had the class.
- `.btn-primary.error` and `.btn-primary.error:hover` CSS — the only `.btn-primary` is the modal's Copy button, and the modal flow never sets the `error` class (validation failure closes the modal; copy failure only flashes the label).
- Duplicate `escapeHtml` function — was byte-for-byte identical to `escapeXml`.

### Refactored
- Merged `escapeXml` and `escapeHtml` into a single `escapeHtml` helper. All 6 call sites updated.
- Extracted `wireSegControl(buttons, onChange)` to dedupe the active/aria-pressed wiring shared by the CTA-type and viewport segmented controls.

### Verified (no changes needed)
- MJML output already follows email-client best practices: explicit `margin` resets on paragraphs/lists, last-block margin zeroed to avoid doubling with `mj-text` padding, `target="_blank"` on web links but not `tel:` (iOS Mail breaks the dial intent on `_blank`), Quill's `<ol data-list="bullet">` quirk normalized to semantic `<ul>`/`<ol>`, and Apple format-detection meta + `a[x-apple-data-detectors]` overrides in place to stop iOS auto-linking dates/addresses with its own styles.
