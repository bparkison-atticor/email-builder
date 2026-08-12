# Email Builder

Local MJML wrapper for assembling SendGrid-ready HTML emails from approved copy. Brand-templated, single CTA, copy-paste workflow.

## How to run

**Simplest:** double-click `Email Builder.bat`. It starts a local server (Python if available, falls back to `npx serve`) and opens your default browser automatically. Leave the terminal window open while you're using it; close the window to stop the server.

**Manual alternative:** open a terminal in this folder and run one of:

```
python -m http.server 8080 --bind 127.0.0.1
```
```
npx serve . -l tcp://127.0.0.1:8080
```

Then open `http://127.0.0.1:8080/` in a browser.

The server binds to `127.0.0.1` (localhost only) so nothing on your Wi-Fi can reach it. Double-clicking `index.html` directly may work in some browsers, but the ES module imports are more reliable through a real HTTP server.

## Workflow

1. Pick template — the dropdown lists every brand that ships; see [Templates](#templates) below for what each entry holds
2. Write the preheader — the preview text that shows up next to the subject in the inbox (under 90 chars recommended)
3. Paste body copy above CTA — rich text editor supports **bold**, *italics*, bullet/numbered lists, and hyperlinks
4. Enter CTA button text — the dashed CTA preview chip below mirrors the brand's button color in real time
5. Pick CTA type — `Phone` (becomes `tel:` link) or `URL variable` (wrapped as `{{variable}}` Handlebars tag)
6. Enter destination (phone number in any format, or variable name without braces)
7. Optional: add CTA microcopy — a short supporting sentence rendered as small, muted text directly under the button
8. Optional: body copy below CTA (also rich text)
9. Optional: edit the **Test data** JSON to substitute `{{tokens}}` in the live preview (does not affect copied HTML)
10. Toggle viewport between **Desktop** and **Mobile** in the preview header to spot-check responsive layout
11. Toggle **Dark mode** and pick a client (Gmail, Outlook, or Apple Mail) in the preview header to preview how each renders the email in dark mode
12. Hit **Copy HTML** (or open **View HTML** to inspect / copy from the raw HTML modal)
13. Paste into SendGrid → Design → Code Editor
14. **Don't forget:** set the subject line directly in SendGrid (it's not in the HTML)

### Body copy editor notes

- Hit Enter once for a new paragraph, twice for an empty line between paragraphs
- Bullet/numbered list buttons work like any editor — click to toggle the list format
- Link button accepts **any** URL including `https://...`, `tel:+1...`, and SendGrid merge fields like `{{eligibilityLink}}` (the default Quill link sanitizer is overridden to allow these)
- Links in output are automatically styled with the template's CTA brand color and set to `target="_blank"`
- Plaintext US phone numbers (`555-123-4567`, `(555) 123 4567`, `+1 555.123.4567`) are auto-linked as `tel:` in the rendered output. Separators between the 3-3-4 groups are required so we don't auto-link order IDs or other long digit runs
- Merge fields in plain text (e.g. `Dear {{Client.FirstName}},`) just work — type them directly
- Paste is sanitized: colors, headers, images, base64 data URLs, and any other formatting outside the toolbar's whitelist (`bold`, `italic`, `link`, `list`) get stripped to plain text on the way in

### CTA microcopy

An optional sentence or two rendered under the CTA button — a reassurance line ("No fees unless we win.") or a fine-print caveat. Leave it empty and nothing renders at all.

- **It's part of the CTA module.** Switching the **Call to action** toggle off hides the field and drops the microcopy from the output along with the button; what you typed comes back when the toggle goes back on.
- **Toolbar is bold, italics, and link — no lists, on purpose.** This field is fine print, not a list.
- **Links inside microcopy stay muted gray**, not the brand accent color body-copy links use. Auto-linked phone numbers are muted here too.
- **A leading `*` or `-` stays literal.** In body copy that pattern becomes a bullet; here it's deliberately left alone so `* Restrictions apply.` reads as fine print, not a one-item list.
- The character count under the field targets 140 as guidance only — there's no limit, and nothing is blocked or truncated.
- Content doesn't survive a reload, same as every other copy field.

### Test data panel

The yellow **Test data** card holds a JSON object used for preview-only Handlebars substitution. It mirrors SendGrid's "test data" panel — `{{Path.To.Value}}` and `{{{Path.To.Value}}}` tokens in the rendered HTML resolve against this object so you can see real names/links instead of raw tokens. Powered by Handlebars 4.7 with shims for SendGrid's documented helper set, so the preview matches what SendGrid will produce at send time.

- Substitution **only affects the live preview**. The HTML produced by **Copy HTML** and **View HTML** keeps the raw `{{tokens}}` intact.
- The **Test data** toggle in the preview header (next to the viewport toggle) flips substitution on/off without losing the JSON. Toggle state and the JSON itself persist across reloads via `localStorage`.
- `{{{unsubscribe}}}` resolves to a harmless `#unsubscribe-preview` href when no value is provided, so the unsubscribe link is clickable in preview without needing to define it.
- Tokens with no matching path render as a yellow `[Path.Name — not set]` chip in the preview, so missing data is unmistakable instead of silently blank.
- Invalid JSON disables substitution and shows the parse error under the textarea; the field outline turns red.

#### Supported Handlebars helpers

Block conditionals (all support `{{else}}`):

- `{{#if value}} … {{else}} … {{/if}}`
- `{{#unless value}} … {{/unless}}`
- `{{#equals a b}} … {{/equals}}` — type-coercing (`"1" == 1` is true)
- `{{#notEquals a b}} … {{/notEquals}}`
- `{{#greaterThan a b}} … {{/greaterThan}}` / `{{#lessThan a b}} … {{/lessThan}}` — numeric, coerces string-valued paths
- `{{#each items}} … {{this}} … {{/each}}`

Inline helpers:

- `{{insert Path.Name 'default=Customer'}}` — resolves the path; falls back to the literal after `default=` when the path is missing/null
- `{{formatDate value 'MM/DD/YYYY'}}` — supports `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss` tokens; returns the raw input unchanged when the date is invalid

Conditional copy with nested branches (the Postman Law-style "case type" pattern) works:

```handlebars
{{#equals Client.CaseType "Social Security Disability Insurance"}}
  navigating a disability claim
{{else}}{{#equals Client.CaseType "Veterans Disability Claims"}}
  pursuing a VA disability claim
{{else}}
  dealing with an injury
{{/equals}}{{/equals}}
```

Missing paths inside a block-helper comparand are treated as falsy and route to the else branch — so `{{#equals Client.MissingField "X"}}…{{else}}…{{/equals}}` renders the else branch without throwing.

#### Template syntax errors

If the body copy has a syntax issue (unclosed `{{#…}}` block, mismatched tags, unbalanced `{{`), the preview shows a yellow warning banner directly above the iframe with a plain-English message (e.g. `Body copy: unclosed {{#equals}} block — add a matching {{/equals}}.`). The preview still renders the underlying email structure so you can keep editing; the banner clears as soon as the syntax is valid again.

### Dark mode preview

The **Dark mode** switch in the preview header simulates how three email clients transform the email when the recipient's device is set to dark mode — the simulation runs entirely inside the preview iframe.

- **Gmail** — the Gmail mobile app (iOS), not Gmail on the web (which leaves the email body alone). Inverts the whole email, then re-inverts images so photos still look right.
- **Outlook** — Outlook.com / OWA on the web. Repairs contrast selectively instead of inverting everything: light backgrounds go dark, colors that are already dark are left alone. Watch for a dark brand color (a navy banner, a dark CTA button) surviving against the newly-darkened background — that's the classic Outlook dark-mode failure.
- **Apple Mail** — macOS 12.4+ / iOS 13+. Only goes dark if the email carries its own dark-mode CSS; this builder emits none, so the email renders **unchanged**. If that white slab against the dark app chrome is the problem, the fix is authoring dark-mode CSS, not changing brand colors.

The transforms are **approximations** of undocumented, vendor-changeable behavior — good enough to catch vanishing logos, low-contrast text, and harshly inverted brand colors, not pixel-exact rendering. They're also preview-only: the copied HTML (from **Copy HTML** or **View HTML**) is byte-identical whether dark mode is on or off.

The switch and the selected client **reset on reload**, unlike the Test data toggle and JSON, which persist.

### Validation and invalid-field highlighting

**Copy HTML** runs a quick validation pass before copying. If body copy, CTA text, or (for `Phone` CTAs) a valid phone number is missing, the offending fields get a red outline, the button shakes, and a short error message appears next to it. Editing any flagged field clears its red outline immediately.

### Raw HTML modal

**View HTML** opens a modal showing the compiled HTML in a read-only textarea, with size / char count / line count in the footer. The modal's **Copy HTML** button runs the same validation as the main one. `Esc` or click-outside closes it.

## Templates

Brands are configured in the `templates` map in `index.html` — grep `const templates`. The map's keys are the authoritative brand list; each entry's `name` is the label shown in the template dropdown. Scroll to the `TEMPLATE CONFIGS` block (grep `TEMPLATE CONFIGS`) in the `<script>` to edit them. Each brand has:

- `bannerImageUrl` — publicly hosted banner image
- `bannerAlt` — alt text (should match brand name for accessibility)
- `bannerWidth` — rendered banner width (e.g. `"600px"`)
- `bannerHref` — optional; wraps banner in a clickable link
- `ctaBackgroundColor` — brand hex for the CTA button fill (also used to style links in body copy)
- `ctaTextColor` — usually `#ffffff`
- `ctaMicrocopyFontSize` — size of the optional microcopy under the CTA button; every brand ships the shared default `DEFAULT_CTA_MICROCOPY_FONT_SIZE` (`13px`)
- `ctaMicrocopyColor` — color of the optional microcopy under the CTA button; every brand ships the shared default `DEFAULT_CTA_MICROCOPY_COLOR` (`#6b6b6b`)
- `unsubscribeHtml` — standalone unsubscribe link block. Most brands can use `DEFAULT_UNSUBSCRIBE`. Override if you need different verbiage.
- `disclosureHtml` — legal/compliance copy: address, dynamic fields (e.g. `{{Case.CaseType}}`, `{{Client.Email}}`), entity name, anti-spam language.

`ctaMicrocopyFontSize` and `ctaMicrocopyColor` exist as per-brand override slots even though every brand currently resolves to the shared default — override either on a brand entry the same way you'd override `unsubscribeHtml`.

Footer renders as two separate blocks (matches SendGrid's template pattern): a 12px unsubscribe link sits alone, followed by the smaller 11px disclosure. Both on an `#f1f1f1` background to visually separate from the white content card.

To add a new brand: copy one of the existing entries, give it a new key, edit the values.

## Output format

- Compiled HTML is fully inlined (MJML handles this)
- Mobile-responsive via MJML defaults
- Font stack: `Arial, Helvetica, sans-serif` (email-safe)
- User-entered URL variables wrap as `{{variable}}` (Handlebars double-braces)
- Unsubscribe link uses `{{{unsubscribe}}}` (Handlebars triple-braces — matches SendGrid's own default template for Marketing Campaigns, prevents HTML-escaping of the URL)
- `tel:` CTA buttons render with `target="_self"` (iOS Mail silently fails the dial intent on `_blank`); URL CTAs use `_blank`
- CTA button: 16px font, 4px border-radius (modern mobile tap target)
- Footer: 11–12px `#6b6b6b` on `#f1f1f1` background (passes WCAG AA contrast)
- `format-detection` and `x-apple-disable-message-reformatting` meta tags are emitted to suppress iOS auto-detection and Apple's auto-reformatting
- CTA microcopy (when present) renders as a 13px `#6b6b6b` block directly beneath the CTA button, with any links inside it muted rather than brand-colored, and the button's own bottom padding tightens from 18px to 6px so the caption reads as attached to the button

## Scope

**In:** single CTA with optional supporting microcopy, two rich-text body sections (bold / italics / lists / links), multiple brand templates, live preview with desktop/mobile viewport toggle, dark-mode preview simulation (Gmail / Outlook / Apple Mail), raw HTML inspector modal, one-click copy with validation + invalid-field highlighting, plaintext phone auto-linking, preview-only Handlebars test data (full SendGrid helper dialect — `#if` / `#each` / `#equals` / `#notEquals` / `#greaterThan` / `#lessThan` / `insert` / `formatDate`) with missing-data chips, humanized syntax-error banner, and `localStorage` persistence.

**Out:** multiple CTAs, image uploads, A/B variants, subject line injection, persistence of email content (only the test-data JSON and toggle state persist).

## Files

- `Email Builder.bat` — double-click launcher (Windows)
- `index.html` — the app. Templates and all logic inline.
- `README.md` — this file.
