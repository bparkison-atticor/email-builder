# Changelog

## 2026-08-18 — New tenant: Lerner and Rowe

### Added
- **Lerner and Rowe brand template** (`lernerRowe`). The SendGrid-hosted logo (536x193, normalized from `http://` to `https://` to avoid mixed-content blocking) ships with no baked-in whitespace, so the banner uses the `bannerHtml` pattern (like Keches lead outreach) — a padded div wrapping the centered logo at 322px (~1.66x source density) on the default white banner background. CTA in the sampled logo yellow `#FFF200` with black button text (white would fail contrast on yellow), shared microcopy/unsubscribe defaults, and the standard retained-client disclosure block with the firm's Phoenix address (2701 E Camelback Rd, Suite 140, Phoenix, AZ 85016). No new brand-config keys.

## 2026-08-13 — CTA microcopy centers under the button

### Fixed
- **CTA microcopy rendered flush-left instead of centered under the CTA button (TASK-033).** `buildMicrocopyBlock` never passed an alignment option to `richTextToMjText`, and neither the function's six original opts nor the head's `<mj-attributes>` mj-text rule set one, so the caption fell back to MJML's left default while the `mj-button` above it centered via MJML's own default — a short caption read as detached body copy instead of a button caption. `richTextToMjText` gained a seventh opt, `align` (default `null`, only emitted when non-null, always appended last so existing attribute-order fixtures are unaffected), and `buildMicrocopyBlock` now passes `align: 'center'`. Body-copy call sites (`bodyAboveQuill`, `bodyBelowQuill`) pass no `opts` and stay byte-identical. New fixtures in `MICROCOPY_BLOCK_FIXTURES` and `RICHTEXT_OVERRIDE_FIXTURES` cover the emission and the omission case respectively.

## 2026-08-13 — Module toggle factory gains a persistence opt-out; documentation anchor drift guard

### Changed
- **`createModuleToggle(id, label, defaultOn, onChange, persist = true)`** gained a 5th parameter; `persist: false` makes a toggle session-only (no localStorage read or write). The hand-rolled dark-mode switch was retired in favor of a factory call using this opt-out. CTA, Promo, and Test data callers are unaffected.

### Added
- **Test harness Section 16 "Documentation anchor drift guard."** Fetches README.md, CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and index.html at runtime, extracts every grep-anchor, and asserts each resolves in index.html; also asserts README's Templates schema list names every live template key.
- README's Templates schema list reconciled with the live `templates` map (added `name`, `bannerHtml`, `bannerBackgroundColor`).

## 2026-08-12 — Dark mode preview: visible client caption

### Added
- **Dark-mode disclosure caption.** A muted one-line strip (`#darkNote`) directly above the preview names the client being simulated and what it does, sourced from `DARK_MODE_CLIENT_NOTES`. Shown only while Dark mode is on; updates on every client change. It replaces hover-only `title` attributes as the primary explanation — visible text is announced to screen readers and needs no mouse, which matters most for **Apple Mail**, where the correct behavior is "renders unchanged" and the explanation was the only thing distinguishing that from a broken toggle. The picker's `title` attributes now read from the same map, so hover detail and caption cannot drift.
- **Test harness Section 12** ("Dark-mode disclosure caption") — 4 fixtures covering per-client caption text, hidden-when-off, and live-click coverage of both mutation paths (the `#darkModeSwitch` toggle and the `#darkClientControl` picker), so a dropped `syncDarkNote()` call on either path fails loudly.

### Fixed
- **Overstated dark-mode chrome legibility.** The `.preview-stage.dark` surround is fully occluded at desktop widths (the iframe is `width: 100%` with no stage padding); it is only visible in the mobile viewport. The changelog bullet and the code comment that both claimed it made the Apple Mail no-op "read as a deliberate result" have been corrected, and the caption now carries that job at every viewport.

## 2026-08-12 — CTA microcopy + rich-text italics

Closes the `cta-microcopy` epic (IDEA-006, TASK-025 through TASK-028). CTA microcopy is a new optional field; the italics support and the `richTextToMjText` refactor it depends on are additive and byte-parity-gated for every existing call site.

### Added
- **Italics support in the shared rich-text toolbar.** `richToolbar`/`allowedFormats` (used by `bodyAboveQuill` and `bodyBelowQuill`) now include `italic`. `richTextToMjText` normalizes `<em>`/`<i>` with an explicit inline `font-style:italic;` so the formatting survives clients that ignore unrecognized inline tags — deliberately not mirrored onto `<strong>`, which already renders correctly with no inline style.
- **CTA microcopy field.** A third Quill instance, `ctaMicrocopyQuill`, lives inside `#ctaBody` (`#ctaMicrocopy`) — an optional one-or-two-sentence caption rendered directly beneath the CTA button. Its toolbar/formats (`microcopyToolbar`/`microcopyFormats`) are bold, italics, and link only — no lists. Because the field lives inside the CTA module, switching the **Call to action** toggle off hides it and omits the microcopy from output along with the button, without clearing what was typed.
- **`richTextToMjText(html, tpl, opts = {})`.** Added a third `opts` argument with six fields (`fontSize`, `color`, `linkColor`, `padding`, `blockMargin`, `convertTypedBullets`) so callers can style the emitted `<mj-text>` and override link coloring without touching the function body. Omitting `opts` reproduces the pre-existing body-copy output byte-for-byte — both body call sites (`bodyAboveQuill`, `bodyBelowQuill`) pass no `opts` and are pinned by a new harness parity section.
- **`buildMicrocopyBlock(html, tpl)`.** Pure helper that returns `''` for an empty microcopy editor, otherwise calls `richTextToMjText` with the brand's `ctaMicrocopyFontSize`/`ctaMicrocopyColor`, `linkColor` set to that same muted color (so links inside microcopy — including auto-linked phone numbers — stay muted instead of taking the brand accent), and `convertTypedBullets: false` (so a fine-print line starting with `*` or `-` stays literal instead of becoming a one-item bulleted list).
- **`ctaMicrocopyFontSize` / `ctaMicrocopyColor` brand keys.** Added to all eight brand configs, each resolving to the new shared defaults `DEFAULT_CTA_MICROCOPY_FONT_SIZE` (`'13px'`) and `DEFAULT_CTA_MICROCOPY_COLOR` (`'#6b6b6b'`) — per-brand override slots, not yet overridden by any brand.
- **Conditional `mj-button` padding.** `ctaButtonPadding(microcopyHtml)` tightens the button's bottom padding from `18px` to `6px` whenever microcopy is present, so the caption reads as attached to the button instead of floating below it; with no microcopy the padding is byte-identical to what shipped before this epic.
- **Live character count with no limit.** `plainTextLength` backs a `#ctaMicrocopyCount` hint under the field — guidance only, nothing is blocked or truncated.
- **Test harness Sections 13–15.** Section 13 covers the italics normalization and the widened toolbar/format config. Section 14 covers `richTextToMjText`'s default-parity guarantee (seven byte-comparison fixtures) plus the new `opts` style overrides. Section 15 covers CTA microcopy emission gating, the muted-link/no-typed-bullets behavior, the conditional button padding, and DOM guards confirming the toolbar carries no list buttons and that the link button routes through the shared link modal. (Renumbered from 11–13 by the dark-mode preview hardening epic — see the 2026-08-12 dark-mode caption entry above — to keep harness section numbers monotonic in source order.)

### Changed
- **Paste sanitization whitelist** now includes `italic` alongside `bold`, `link`, and `list` — pasted italic formatting survives instead of being stripped to plain text.

## 2026-08-11 — Dark mode preview simulation (Gmail / Outlook / Apple Mail)

Closes the `dark-mode-preview` epic (IDEA-005, TASK-021 through TASK-024). Preview-only — no change to `buildMjml()` output or the HTML produced by Copy HTML / View HTML.

### Added
- **Dark mode switch + client picker.** New `module-toggle` in the preview header (next to the Test data toggle) flips a preview-only dark-mode flag; a three-option `.seg-control` (Gmail / Outlook / Apple Mail) picks which client's behavior to simulate, shown only while the switch is on. Neither the switch nor the picker selection persists across reloads — deliberate, unlike the Test data toggle's `localStorage` persistence. (The switch was later rebuilt on the `createModuleToggle` factory with a persistence opt-out — see the 2026-08-13 "Module toggle factory gains a persistence opt-out" entry above.)
- **`applyDarkMode(html)`** runs after `applyTestData` and before `withPreviewLinkHandler` in the `srcdoc` chain (`withPreviewLinkHandler(applyDarkMode(applyTestData(result.html)))`) — after substitution so the simulation composes with live test data, before the link handler so the injected click-handler `<script>` is never a transform target. `lastHtml` — the source for **Copy HTML** and **View HTML** — is assigned directly from the compiler output before this step and is never passed through it, so the copied/exported HTML stays byte-identical regardless of dark-mode state.
- **`gmailDarkTransform`** simulates the Gmail iOS app: a CSS `invert(100%) hue-rotate(180deg)` filter on `<body>`, re-applied to `img`/`video`/`svg`, which cancels the body inversion so photos render correctly, plus an explicit inverted `<html>` background to close a canvas seam some browsers otherwise leave white. Chosen over Gmail web, which leaves the email body untouched entirely — simulating it would teach the marketer nothing.
- **`outlookDarkTransform`** simulates Outlook.com / OWA's selective contrast repair: inline background and text colors are remapped (light backgrounds darken, already-dark colors are left alone, dark text is lifted and contrast-checked against a simulated `#1b1b1b` surface). Chosen over Outlook desktop's full invert, which would look near-identical to the Gmail option and make the picker uninformative.
- **`appleMailDarkTransform`** simulates Apple Mail (macOS 12.4+ / iOS 13+), the only opt-in surface of the three. It classifies the compiled HTML via `detectAuthorDarkScheme` ('authored' / 'meta-only' / 'none') and, since this builder's compiler emits no `prefers-color-scheme` / `color-scheme` CSS today, renders the email **unchanged** — the faithful simulation of "nothing to opt into."
- **`.preview-stage.dark`** darkens the chrome around the iframe (`#1a1a1a`). Visible only in the mobile viewport — at desktop widths the iframe is 100% wide and covers it entirely.
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
