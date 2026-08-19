---
id: TASK-036
idea: SPRINT-008-proposal
status: approved
created: 2026-08-19T15:00:00Z
files_owned:
  - index.html
  - README.md
  - ARCHITECTURE.md
  - CODE-PATTERNS.md
  - CHANGELOG.md
files_readonly:
  - .soloflow/active/findings/SPRINT-008-findings.md
acceptance_criteria:
  - criterion: "PassthroughLink.sanitize enforces an explicit scheme allowlist"
    verification: "grep `static sanitize(url)` in index.html shows a body that resolves a scheme from a whitespace-and-control-stripped, lowercased copy of the input and returns '#' for any scheme not in the allowlist. grep `LINK_SCHEME_ALLOWLIST` returns the const with exactly http:, https:, mailto:, tel:, sms:."
  - criterion: "A javascript: href cannot survive the sanitizer, including obfuscated forms"
    verification: "New harness fixtures assert PassthroughLink.sanitize returns '#' for each of: 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\\tscript:alert(1)', 'java\\nscript:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)'. All rows PASS."
  - criterion: "Every href shape the app itself produces still passes through unchanged"
    verification: "New harness fixtures assert sanitize returns the input verbatim for: 'https://example.com/x', 'http://example.com/x', 'tel:5551234567', 'mailto:a@b.test', '{{eligibilityLink}}', '{{{unsubscribe}}}', '#unsubscribe-preview', and a bare 'www.example.com'. All rows PASS. These are exactly the shapes buildLinkHref (grep `function buildLinkHref`) and DEFAULT_UNSUBSCRIBE (grep `const DEFAULT_UNSUBSCRIBE`) emit."
  - criterion: "The link dialog still round-trips a URL variable and a phone number end to end"
    verification: "In the browser: select text in a body editor, open the link dialog, choose URL variable, enter `eligibilityLink`, apply. The anchor href is `{{eligibilityLink}}` and reopening the dialog on that text prefills `eligibilityLink` with the URL segment active. Repeat for a phone number and confirm `tel:` + phone segment prefill."
  - criterion: "All pre-existing harness sections still pass"
    verification: "Open Ctrl+Shift+T over http:// — every section green, including the richTextToMjText parity fixtures and the {{{unsubscribe}}} rows in the safeAttrHtml section."
  - criterion: "Docs no longer claim the sanitizer accepts any URL"
    verification: "README.md's link-button bullet no longer says the sanitizer accepts **any** URL; it names the allowlist and cites the deciding construct. ARCHITECTURE.md's PassthroughLink sentence says allowlist, not passthrough. CODE-PATTERNS.md's richTextToMjText sanitization contract names the scheme allowlist as a second boundary alongside the formats whitelist. CHANGELOG.md has an entry. The Documentation anchor drift guard still passes."
depends_on: [TASK-035]
estimated_complexity: medium
epic: richtext-output-fidelity
test_strategy:
  needed: true
  justification: "This replaces a security-relevant identity function with branching logic that has both an allow path and a deny path, and both paths have shapes the app depends on. Every branch needs a pinned fixture, including the obfuscated-scheme cases a naive regex would miss."
  targets:
    - behavior: "Disallowed and obfuscated schemes (javascript:, data:, vbscript:, tab/newline/case/whitespace variants) return '#'"
      test_file: "index.html"
      type: unit
    - behavior: "Allowed schemes, Handlebars token hrefs, in-page anchors, and scheme-less values pass through verbatim"
      test_file: "index.html"
      type: unit
---

# Replace PassthroughLink.sanitize's blanket passthrough with an explicit scheme allowlist

## Objective

`PassthroughLink.sanitize(url) { return url; }` disables Quill's link sanitizer completely. Nothing downstream re-checks the scheme, and the preview's injected click handler calls `window.open(href, '_blank', 'noopener')` on any non-`#` href (grep `PREVIEW_LINK_HANDLER`) inside a deliberately unsandboxed, same-origin iframe. A `javascript:` or `data:` href typed or pasted into the link dialog therefore travels from input to `window.open` unfiltered. This is hardening against a real gap, not a demonstrated exploit — but the override was written to allow `tel:` and `{{variable}}`, and it took away the scheme check as collateral. This task restores the check with an explicit allowlist that does not depend on the CDN library's internals.

## Implementation Steps

1. **Add the allowlist const** immediately above `class PassthroughLink` (grep `const QuillLink = Quill.import('formats/link');`): `const LINK_SCHEME_ALLOWLIST = ['http:', 'https:', 'mailto:', 'tel:', 'sms:'];`. Include `sms:` — it is in Quill 2's own protocol whitelist and is a plausible marketer link; omitting it would be a silent regression relative to the library default this code replaces.

2. **Rewrite `sanitize`** (grep `static sanitize(url)`) to:
   - coerce and keep the original: `const raw = String(url ?? '');`
   - build a probe that defeats the parser-normalisation bypasses: `const probe = raw.replace(/[\u0000-\u0020]/g, '').toLowerCase();` — browsers strip ASCII whitespace and control characters *inside* a scheme when they parse a URL, so `java\tscript:alert(1)` and `java\nscript:alert(1)` are live `javascript:` URLs that a naive `startsWith('javascript:')` check misses. Stripping them from the probe (never from the return value) closes that class.
   - return `raw` unchanged for the two app-specific shapes, checked on the probe: `if (probe.startsWith('{{')) return raw;` (Handlebars tokens — `buildLinkHref` wraps every non-`http(s)` destination as `{{value}}`, and `DEFAULT_UNSUBSCRIBE` uses `{{{unsubscribe}}}`) and `if (probe.startsWith('#')) return raw;` (in-page anchors, including the seeded `#unsubscribe-preview`).
   - resolve the scheme: `const scheme = (probe.match(/^[a-z][a-z0-9+.\-]*:/) || [''])[0];`
   - `if (!scheme) return raw;` — a value with no scheme (`www.example.com`, a relative path) cannot be `javascript:`, and preserving it keeps today's behavior for pasted bare hosts.
   - `return LINK_SCHEME_ALLOWLIST.includes(scheme) ? raw : '#';`

   Return `'#'` rather than delegating to `super.sanitize`: Quill 2's rejection value is `about:blank`, which `PREVIEW_LINK_HANDLER` would happily `window.open`, whereas `#` is the value that handler already swallows as an in-page anchor. Returning `'#'` also keeps the deny behavior independent of a CDN library we do not pin to an exact version (grep `quill@2` — the tag floats).

3. **Rewrite the class comment.** It currently says the default sanitizer is overridden "so `{{variable}}`, `tel:`, and other non-URL patterns are accepted without being stripped or mangled" — the "other non-URL patterns" half is what this task deletes. State the allowlist, name `LINK_SCHEME_ALLOWLIST` as the deciding construct per the Behavioral-claims convention in CODE-PATTERNS.md, and note why the probe strips control characters.

4. **Add a harness section** using the helpers from TASK-035: `harnessSection(body, 'PassthroughLink.sanitize — link scheme allowlist')` followed by `renderHarnessRows` over a `LINK_SANITIZE_FIXTURES` array of `{ label, input, expected, description }`, with `run: f => ({ actual: PassthroughLink.sanitize(f.input), pass: PassthroughLink.sanitize(f.input) === f.expected })` and `opts: { json: true }` so tab and newline variants are visible in the row. Place it after the `safeAttrHtml` section, which is the neighbouring token-handling section. Cover the deny cases and allow cases enumerated in the acceptance criteria. (If TASK-035 has not landed, write the loop in the existing per-section style and TASK-035 will migrate it.)

5. **Verify the round trip in a browser.** Harness fixtures test the function; they do not prove Quill still stores what the dialog applies. Do the two end-to-end checks in acceptance criterion 4 — a URL-variable link and a phone link, applied and then reopened for prefill. `applyLink` (grep `const href = buildLinkHref(type, value);`) routes through Quill's format API, which calls `sanitize`, so a mistake here silently rewrites marketer links to `#`.

6. **Correct the four docs.** README.md's link-button bullet ("accepts **any** URL … the default Quill link sanitizer is overridden to allow these") becomes an allowlist statement citing `LINK_SCHEME_ALLOWLIST`. ARCHITECTURE.md's sentence "Quill's link sanitizer is patched (`PassthroughLink`) to allow `tel:` URLs and Handlebars tokens" becomes a scheme-allowlist statement. CODE-PATTERNS.md's `richTextToMjText` **Sanitization contract** currently says "The only boundary is the owning editor's Quill `formats` whitelist" — add the scheme allowlist as a second boundary, and keep the existing warning that neither is a substitute for sanitizing untrusted HTML. Add a CHANGELOG.md entry under the current unreleased heading. Do not remove any existing grep anchor from these files: README, ARCHITECTURE, and CLAUDE all sit exactly at their `ANCHOR_FLOORS` minimum.

## Acceptance Criteria

- **Allowlist present.** PASS = `LINK_SCHEME_ALLOWLIST` holds exactly the five schemes; `sanitize` resolves the scheme from a control-stripped lowercased probe and returns `'#'` on a miss.
- **Deny path.** PASS = all seven deny fixtures (plain, mixed-case, tab-split, newline-split, leading-space `javascript:`, `data:`, `vbscript:`) return `'#'` and read PASS.
- **Allow path.** PASS = all eight allow fixtures return the input verbatim and read PASS. Any one of them returning `'#'` is a shipped regression in marketer-visible behavior, not a test failure to be adjusted away.
- **End-to-end round trip.** PASS = `{{eligibilityLink}}` and `tel:` links apply, persist in the anchor, and prefill correctly on reopen.
- **No collateral.** PASS = every pre-existing harness section green, including the `{{{unsubscribe}}}` rows.
- **Docs true.** PASS = no doc claims the sanitizer accepts any URL; anchor-drift guard green.

## Test Strategy

One new harness section, `LINK_SANITIZE_FIXTURES`, in `index.html`. `PassthroughLink` is a module-scope class, so the harness can call `PassthroughLink.sanitize` directly — no DOM setup, no Quill instance, no mocking.

Target 1 (deny) needs the obfuscated variants, not just `'javascript:alert(1)'`: the tab and newline cases are the ones that distinguish a correct implementation from a plausible-looking wrong one, and they are why step 2 builds a separate probe string. Use real control characters in the fixture inputs (`'java\tscript:alert(1)'`) and rely on `opts: { json: true }` to render them visibly.

Target 2 (allow) is the regression half and matters more than the deny half for daily use: it pins every href shape the app itself constructs — both `buildLinkHref` outputs, the `DEFAULT_UNSUBSCRIBE` triple-stache, the seeded preview anchor, and a scheme-less bare host. Derive these from `buildLinkHref` and `DEFAULT_UNSUBSCRIBE` rather than from imagination, so the fixture list stays tied to the producers.

Step 5's browser round trip is not optional and cannot be replaced by a fixture: it is the only check that Quill's format pipeline still accepts what the dialog produces.

## Hardest Decision

Whether to implement an explicit allowlist or simply delegate to `super.sanitize` after excepting `{{` and `#`. Delegation is three lines and inherits Quill's own maintained whitelist. I chose the explicit allowlist for three reasons: the CDN reference is the floating tag `quill@2`, so `super`'s behavior can change under us without a commit in this repo; Quill's rejection value is `about:blank`, which the preview's click handler would treat as a real destination and open, whereas `'#'` is already swallowed; and an explicit const is directly assertable from the harness and citable from the docs, which the Behavioral-claims convention now requires.

The subtler decision was returning `raw` for scheme-less values instead of rejecting them. Rejecting would be stricter, but it would break a pasted `www.example.com` — today's behavior — and a value with no scheme cannot be `javascript:`, so the strictness buys nothing.

## Rejected Alternatives

- **Delegate to `QuillLink.sanitize`.** Rejected above. Would change my mind if the CDN reference were pinned to an exact version and `SANITIZED_URL` were verified to be inert against `PREVIEW_LINK_HANDLER`.
- **Blocklist `javascript:`/`data:`/`vbscript:`.** Rejected: blocklists fail open on the scheme nobody thought of (`filesystem:`, `blob:`, future additions), and the whole point is that nothing downstream re-checks.
- **Sanitize at the `window.open` boundary in `PREVIEW_LINK_HANDLER` instead.** Rejected as the primary fix: it would protect the preview but leave the bad href in the anchor, in `lastHtml`, and in the HTML the marketer pastes into SendGrid. Worth adding later as defence in depth; explicitly out of scope here.
- **Reject scheme-less values.** Rejected: breaks pasted bare hosts for no security gain.

## Lowest Confidence Area

Whether `sanitize` is the only place Quill can accept a link value in version 2 — specifically whether the clipboard/paste path for an `<a href>` routes through `formats/link`'s `sanitize` or through a matcher that bypasses it. My allow/deny fixtures call `sanitize` directly and so cannot distinguish those. The browser round trip in step 5 covers the dialog path; if paste turns out to bypass `sanitize`, a pasted `javascript:` anchor would still reach the preview, and the follow-up is to sanitize in the clipboard matcher too. Flagging rather than expanding scope, since the dialog is the path the finding names and paste already strips to the `formats` whitelist (which does keep `link`).
