---
id: TASK-021
idea: IDEA-005
status: approved
created: 2026-08-11T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CODE-PATTERNS.md
  - .soloflow/active/ideas/IDEA-005.md
  - .soloflow/active/research/IDEA-005-research.md
acceptance_criteria:
  - criterion: "A dark-mode switch and a three-option client picker (Gmail / Outlook / Apple Mail) exist in .preview-header-left, inserted at runtime after the factory-built Test data toggle (TASK-014 removes the static #testDataSwitch, so these controls are runtime-inserted too)."
    verification: "grep -n 'darkModeSwitch' index.html returns the runtime-inserted markup string (role=\"switch\", class module-toggle) plus its wiring; grep -n 'data-dm=' index.html returns exactly 3 buttons with values gmail, outlook, applemail. All three buttons are present and enabled — none carries a `disabled` attribute (grep -n 'data-dm' index.html shows no `disabled`). Manual: the Dark mode switch renders in the preview header immediately after the Test data toggle."
  - criterion: "The picker is hidden while dark mode is OFF and visible while ON, and the hiding actually works despite .seg-control's display:inline-flex."
    verification: "grep -n 'seg-control\\[hidden\\]' index.html returns a CSS rule setting display:none. Manual: serve index.html, confirm the picker is absent until the Dark mode switch is flipped on, then present."
  - criterion: "Dark-mode state is NOT persisted."
    verification: "grep -n 'localStorage' index.html — no matching line references darkMode, darkModeEnabled, or darkModeClient. Manual: enable dark mode, reload the page, confirm it is OFF and the client resets to Gmail."
  - criterion: "The transform is preview-only: lastHtml (Copy HTML / View HTML) is byte-identical whether dark mode is on or off."
    verification: "grep -n 'lastHtml = result.html' index.html shows the assignment unchanged and NOT wrapped in applyDarkMode. Harness Section 8 fixture 'purity guard' asserts lastHtml.indexOf('EB-DARKSIM') === -1 while darkModeEnabled is true. Manual: enable Gmail dark mode, click View HTML, confirm no filter/invert CSS in the modal text."
  - criterion: "The Gmail transform injects a double-invert filter stylesheet carrying the EB-DARKSIM marker."
    verification: "Harness Section 8 fixtures: gmailDarkTransform('<html><head></head><body>x</body></html>') output contains 'EB-DARKSIM', contains 'filter: invert(100%) hue-rotate(180deg)' applied to body, contains an 'img, video, svg' counter-filter rule, contains 'html { background-color: #0b0b0b', and the injected <style> appears before '</head>'. All fixtures show PASS."
  - criterion: "Fallback insertion works when the compiled HTML has no </head>."
    verification: "Harness Section 8 fixture: gmailDarkTransform('<body>x</body>') output still contains 'EB-DARKSIM' and the style block appears after the opening <body> tag. Fixture shows PASS."
  - criterion: "A transform exception degrades gracefully to the untransformed preview and reports through the existing #warn banner, not a raw exception string."
    verification: "grep -n 'darkModeError' index.html shows (a) a module-scope declaration, (b) a catch arm in applyDarkMode assigning a plain-English sentence with no e.message interpolation, (c) a push into render()'s warnings array. grep the catch arm for 'e.message' — zero matches."
  - criterion: "The module script is still not truncated: index.html contains exactly 3 literal </script> occurrences."
    verification: "grep -n '</script>' index.html returns exactly 3 lines — the two CDN <script src> tags in <head> and the single real closing tag of the inline module script. Any 4th match is a regression of TASK-020."
  - criterion: "Existing harness sections 1-7 still pass and the app still boots."
    verification: "Serve index.html, press Ctrl+Shift+T, confirm every row in sections 1-7 shows PASS and the preview renders the default template."
depends_on: [TASK-014]
estimated_complexity: medium
epic: dark-mode-preview
test_strategy:
  needed: true
  justification: "The transform functions are pure string-in/string-out, exactly the shape the existing in-file harness already tests (SAFE_ATTR_FIXTURES). The purity guard (lastHtml untouched) is the single highest-value regression lock in the whole feature and is only assertable in a test."
  targets:
    - behavior: "gmailDarkTransform injects the marker + body double-invert + img counter-filter inside <head>"
      test_file: "index.html"
      type: unit
    - behavior: "gmailDarkTransform falls back to post-<body> insertion when no </head> exists"
      test_file: "index.html"
      type: unit
    - behavior: "applyDarkMode returns its input by identity when darkModeEnabled is false"
      test_file: "index.html"
      type: unit
    - behavior: "lastHtml never contains the EB-DARKSIM marker regardless of toggle state (preview-only purity)"
      test_file: "index.html"
      type: unit
---

# Dark-mode preview shell + Gmail (mobile app) full-invert simulation

## Objective

Add the dark-mode control surface to the preview header — a non-persisted on/off switch plus an always-enabled three-option client picker — wire a single `applyDarkMode()` step into the existing srcdoc transform chain, and implement the first of the three client transforms: a Gmail simulation using the CSS double-invert filter that Gmail's iOS app itself uses. This task also establishes the shared scaffolding (marker token, style-injection helper, error routing, harness section) that TASK-022 and TASK-023 build on.

## Platform-surface decision (binding for the whole epic)

The research contradicted the idea's per-brand framing: each brand's dark-mode behavior splits by platform. Each picker option therefore represents **one named surface**, disclosed in the button's `title` tooltip:

| Picker option | Simulated surface | Why this surface |
|---|---|---|
| **Gmail** | Gmail mobile app, iOS | Gmail *web* leaves the email body untouched and only darkens client chrome — simulating it would be a literal no-op and teaches the marketer nothing. Gmail iOS's full inversion is both the documented mechanism (a CSS filter invert with selective reverse-inversion of media) and the worst case within the Gmail family, which is what a risk-spotting preview should show. |
| **Outlook** | Outlook.com / OWA (web) | Outlook Windows desktop is a full invert, which would render the Outlook option nearly identical to Gmail's and make the picker uninformative. OWA's selective contrast-repair surfaces a *different* failure class (dark brand colors surviving un-inverted next to newly-darkened surroundings). Implemented in TASK-022. |
| **Apple Mail** | Apple Mail macOS 12.4+ / iOS 13+ | The only one of the three that is opt-in rather than forced; its honest behavior against today's compiler output is "renders unchanged." Implemented in TASK-023. |

Encode this table as a comment block immediately above the transform functions, together with a note that these behaviors are community-reverse-engineered, unversioned by the vendors, and should be re-checked against caniemail.com / hteumeuleu's email-bugs repo periodically.

## Implementation Steps

1. **Baseline gate.** Run `grep -n '</script>' index.html` and record the result: it must return exactly 3 lines (the two CDN `<script src>` tags and the module script's real closing tag). This is the TASK-020 regression baseline; step 11 re-runs it.
2. **CSS.** In the `<style>` block, immediately after the `.preview-stage.mobile .preview-iframe` rule (~line 244), add:
   - `.preview-stage.dark { background: #1a1a1a; }` — darkens the chrome *around* the iframe. This is the client chrome, not the email; it is what makes a no-op client transform (Apple Mail, TASK-023) legibly different from "the toggle is broken."
   - `.seg-control[hidden] { display: none; }` — **required**. The author rule `.seg-control { display: inline-flex; }` beats the UA stylesheet's `[hidden] { display: none }`, so without this rule the `hidden` attribute silently does nothing.
   - Add `flex-wrap: wrap; row-gap: 8px;` to the existing `.preview-header-left` rule (~line 219) so the extra controls wrap instead of overflowing at narrow window widths.
3. **Markup (runtime-inserted — TASK-014 prerequisite).** TASK-014 removes the static `#testDataSwitch` span and appends the factory-built Test data toggle to `.preview-header-left` at runtime, so static markup added here would render *before* that toggle. Instead, define the dark-mode controls as an HTML string and insert it with `document.querySelector('.preview-header-left').insertAdjacentHTML('beforeend', …)` immediately after TASK-014's `appendChild(testDataToggle.element)` line (see step 11): a `<span class="divider" aria-hidden="true"></span>`, then:
   - `<span class="module-toggle" role="switch" aria-checked="false" tabindex="0" id="darkModeSwitch" title="Simulate a dark-mode email client in the preview (preview only)"><span class="track"></span>Dark mode</span>` — mirrors the factory-built element's structure exactly (same `module-toggle` class and `track` child, so it shares the factory's CSS at ~lines 371-414), but hand-rolled and with no `on` class (defaults OFF). Use `module-toggle`, NOT the legacy `switch` class: TASK-014's optional step-6 cleanup may retire the `.switch` halves of the paired selectors, and `module-toggle` is the canonical post-TASK-014 class either way.
   - `<div class="seg-control" role="group" aria-label="Dark mode client" id="darkClientControl" style="width:auto" hidden>` containing three text-only `<button type="button" data-dm="…">` elements: `gmail` (with `class="active" aria-pressed="true"`), `outlook`, `applemail` (both `aria-pressed="false"`). Labels: `Gmail`, `Outlook`, `Apple Mail`. No icons — the header is already wide; text-only keeps it compact.
   - Give each button a `title` naming its simulated surface, verbatim from the table above (e.g. `title="Gmail mobile app (iOS) — inverts the entire email, then re-inverts images"`). These tooltips are the disclosure mechanism; per the locked scope decision, do NOT add a separate "simulated" badge or status caption element.
4. **State.** Immediately after the `let templateError = '';` declaration (line 1751), add:
   ```js
   // Dark-mode preview state. Deliberately NOT persisted to localStorage —
   // this is a review-time lens like the desktop/mobile viewport switcher,
   // not a content decision like testDataEnabled. Locked by IDEA-005.
   let darkModeEnabled = false;
   let darkModeClient = 'gmail';
   // Set by applyDarkMode when a transform throws; folded into #warn by render().
   // Same staging pattern as templateError.
   let darkModeError = '';
   ```
5. **Style-injection helper.** After `withPreviewLinkHandler` (ends line 2487) and before `setTestDataHint` (line 2489), add `injectPreviewStyle(html, css)`:
   - Build `'<style type="text/css">' + css + '</style>'`.
   - If `html` contains `</head>`, insert the block immediately before it; else if a `<body …>` opening tag matches, insert immediately after it; else prepend to `html`.
   - Use a **function replacer** for every `.replace()` call here, not a string replacement, so that any `$&` / `$'` / `$\`` sequence inside `css` is never interpreted as a substitution pattern.
6. **Marker.** Every injected stylesheet in this epic must begin with the CSS comment `/* EB-DARKSIM */`. This single token makes preview-only purity greppable and is the basis of the harness purity fixture.
7. **Gmail transform.** Add `gmailDarkTransform(html)` returning `injectPreviewStyle(html, css)` where `css` is:
   ```
   /* EB-DARKSIM gmail — preview only, never present in copied HTML */
   html { background-color: #0b0b0b !important; }
   body { filter: invert(100%) hue-rotate(180deg) !important; }
   img, video, svg { filter: invert(100%) hue-rotate(180deg) !important; }
   ```
   Comment the three non-obvious parts: (a) `hue-rotate(180deg)` after `invert` restores hue so blues stay blue instead of turning orange; (b) the `html` background is set explicitly because when `<html>` has no background the body's background propagates to the canvas and escapes the body filter — Firefox in particular then paints a white canvas; `#0b0b0b` is the inverted equivalent of MJML's default `#f4f4f4` body background, so the seam is invisible; (c) re-applying the identical filter to media cancels the parent inversion, which is exactly what Gmail iOS does. Add a note that CSS `background-image` values cannot be counter-filtered by this technique and that Gmail *Android* is reported to invert small images (<100px) — a divergence deliberately not simulated.
8. **Registry + stubs.** Define, after the transforms:
   ```js
   function outlookDarkTransform(html) { /* DARK_TRANSFORM_STUB — implemented in TASK-022 */ return html; }
   function appleMailDarkTransform(html) { /* DARK_TRANSFORM_STUB — implemented in TASK-023 */ return html; }
   const DARK_MODE_TRANSFORMS = { gmail: gmailDarkTransform, outlook: outlookDarkTransform, applemail: appleMailDarkTransform };
   ```
   The literal token `DARK_TRANSFORM_STUB` is a release gate: TASK-023 asserts zero occurrences remain. Do not reword it.
9. **`applyDarkMode(html)`.** Returns `html` unchanged when `!darkModeEnabled`. Otherwise looks up `DARK_MODE_TRANSFORMS[darkModeClient]`; if absent, returns `html`. Wraps the call in try/catch: on success set `darkModeError = ''` and return the result; on throw set `darkModeError = 'Dark-mode preview could not be applied — showing the untransformed email.'` and return the original `html`. **Do not interpolate the exception message** — per the CLAUDE.md convention, nothing raw reaches the marketer, and this string is already action-neutral and complete.
10. **Wire into render().** Change line 2554 to `els.preview.srcdoc = withPreviewLinkHandler(applyDarkMode(applyTestData(result.html)));`. Leave `lastHtml = result.html;` (line 2552) untouched. Order rationale (comment it): dark mode runs *after* `applyTestData` so the marketer sees the dark-mode result of the actual substituted copy, and *before* `withPreviewLinkHandler` so the injected click-handler `<script>` is never a target of any transform. In the warnings block, after `if (templateError) warnings.unshift(templateError);` (line 2568), add `if (darkModeError) warnings.push(darkModeError);`.
11. **Wire the controls.** Immediately after the `document.querySelector('.preview-header-left').appendChild(testDataToggle.element);` line that TASK-014 introduces (replacing the old hand-rolled wiring at ~lines 2607-2625) — this is after `const previewStage` is declared at ~line 2600, so it is in scope. First run the `insertAdjacentHTML` call from step 3, then:
    ```js
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const darkClientControl = document.getElementById('darkClientControl');
    function syncDarkModeSwitch() {
      darkModeSwitch.classList.toggle('on', darkModeEnabled);
      darkModeSwitch.setAttribute('aria-checked', String(darkModeEnabled));
      darkClientControl.hidden = !darkModeEnabled;
      previewStage.classList.toggle('dark', darkModeEnabled);
    }
    function flipDarkMode() { darkModeEnabled = !darkModeEnabled; syncDarkModeSwitch(); scheduleRender(); }
    ```
    Bind `click` and `keydown` (Space/Enter, with `preventDefault`) to `flipDarkMode`, mirroring the flip/sync shape inside `createModuleToggle` (~line 2630) — but with **no** `localStorage.setItem` call. Call `syncDarkModeSwitch()` once at the end. Wire the picker with the existing helper, scoping the query to the new container so it cannot collide with the viewport buttons: `wireSegControl(darkClientControl.querySelectorAll('button[data-dm]'), (btn) => { darkModeClient = btn.dataset.dm; scheduleRender(); });`
12. **Harness Section 8.** In `renderTestHarness()`, after the Section 7 block (ends line 2357, before the function's closing brace at 2358), add a Section 8 `<h3>` titled `Dark-mode preview transforms — Gmail` following the existing heading `cssText` pattern, plus a `DARK_MODE_FIXTURES` array using the `{ label, check(), description }` shape of `TRUNCATION_GUARDS` (these fixtures need no shared input string, so the predicate-only shape fits better than `SAFE_ATTR_FIXTURES`). Fixtures listed under Test Strategy below.
13. **Final gate.** Re-run `grep -n '</script>' index.html`. It must still return exactly 3 lines. If a comment or fixture string you added contains a literal `</script>`, write it as `<\/script>` — this is the exact bug class that broke the page in TASK-020.

## Acceptance Criteria

- **Controls present and never disabled.** The switch and all three picker buttons exist in `.preview-header-left`; no button carries `disabled`. PASS = the greps in the frontmatter match; FAIL = a missing button or a `disabled` attribute.
- **Picker visibility actually toggles.** `.seg-control[hidden] { display: none; }` exists and the picker appears only with dark mode on. FAIL = picker visible while the switch is off (the specificity bug).
- **No persistence.** No `localStorage` line references dark mode; a reload returns the switch to OFF and the client to Gmail. FAIL = any persisted key.
- **Preview-only purity.** `lastHtml = result.html;` is unwrapped, and the harness purity fixture asserting `lastHtml` never contains `EB-DARKSIM` shows PASS. FAIL = the marker appears in View HTML output.
- **Gmail stylesheet correctness.** All Gmail fixtures PASS: marker present, body double-invert present, media counter-filter present, `html` background present, block inserted before `</head>`, and the no-`</head>` fallback inserts after `<body>`.
- **Graceful degradation.** `applyDarkMode`'s catch arm sets a plain-English `darkModeError` with no `e.message` interpolation, and `render()` pushes it into `warnings`. FAIL = a raw exception string can reach `#warn`.
- **No script truncation.** `grep -n '</script>' index.html` returns exactly 3 lines.
- **No regressions.** Harness sections 1-7 all PASS and the default template renders.

## Test Strategy

Add harness **Section 8 — "Dark-mode preview transforms — Gmail"** to `renderTestHarness()` in `index.html`, using the predicate-fixture shape (`{ label, check(), description }`) already used by `TRUNCATION_GUARDS`, and the same row-rendering loop. Each `check()` is wrapped in the existing `try { … } catch { return false; }` idiom so a thrown error renders as FAIL rather than blanking the harness.

Fixtures:

1. **`applyDarkMode` is identity when off** — set `darkModeEnabled = false` locally by asserting on the function's early-return path: `applyDarkMode('<body>x</body>') === '<body>x</body>'` (the harness runs with dark mode off by default; if a run happens with it on, save/restore the flag around the assertion).
2. **Marker present** — `gmailDarkTransform('<html><head></head><body>x</body></html>').includes('EB-DARKSIM')`.
3. **Body double-invert** — output includes `filter: invert(100%) hue-rotate(180deg)` and the rule is scoped to `body`.
4. **Media counter-filter** — output includes an `img, video, svg` selector carrying the same filter declaration.
5. **Root background** — output includes `html { background-color: #0b0b0b`.
6. **Head insertion** — `out.indexOf('EB-DARKSIM') < out.indexOf('</head>')`.
7. **No-`</head>` fallback** — `gmailDarkTransform('<body>x</body>')` includes `EB-DARKSIM` and the marker's index is greater than the index of `<body>`.
8. **Preview-only purity guard** — `typeof lastHtml === 'string' && lastHtml.indexOf('EB-DARKSIM') === -1`. Description: "lastHtml (Copy HTML / View HTML source) must never carry a preview-only dark-mode stylesheet." This is the criterion that protects the feature's core invariant and must remain in the harness for the life of the feature.

No mocking or fixtures beyond literal HTML strings are needed — every function under test is pure.

## Hardest Decision

Which platform surface the "Gmail" option represents. The research broke the idea's per-brand assumption: Gmail web does nothing to the body, Android partially inverts, iOS fully inverts. Picking *web* would ship a picker option that is a visible no-op; picking *Android* means simulating a partial-invert heuristic that nobody has published and that would be indistinguishable from a guess. iOS wins because its mechanism is the one thing about Gmail's dark mode that is actually documented — a CSS filter inversion with selective re-inversion of media — so the simulation and the real client share an implementation technique rather than the simulation approximating an unknown one. It is also the harshest transform in the Gmail family, which matches the stated bar ("spot likely problems," not average-case fidelity). The cost is that a marketer whose audience is mostly Gmail-Android sees a somewhat more pessimistic preview than reality; the `title` tooltip discloses the surface so this is an informed, not a hidden, tradeoff.

A second decision worth naming: darkening `.preview-stage` (the chrome *around* the iframe) rather than adding a status caption. The locked scope decision forbids an extra affordance, but a marketer flipping to Apple Mail in TASK-023 will see literally zero change inside the iframe. Dark stage chrome resolves that without a new UI element, and it happens to be *more* faithful — darkened chrome around an untransformed email body is exactly what Gmail web and Apple Mail (no dark CSS) actually look like.

## Rejected Alternatives

- **Manipulating `iframe.contentDocument` after load instead of transforming the srcdoc string.** Rejected: it introduces a load-race with every re-render, has no precedent in this file, and — decisively — is untestable in the existing in-file harness. Keeping every transform a pure `string → string` function makes the whole epic testable with the fixture machinery that already exists. Would change if a future transform genuinely required `getComputedStyle` resolution against a cascaded stylesheet (see TASK-022's rejected alternatives).
- **Reusing `createModuleToggle` for the switch.** Rejected: it hard-codes `localStorage` persistence under `emailBuilder.module.<id>`, and persistence was explicitly declined. Hand-rolling against the factory's own flip/sync shape (minus the `setItem` call) is ~12 lines and carries no unwanted behavior; the element reuses the factory's `module-toggle` class and track structure so styling stays unified and TASK-014's optional `.switch` CSS cleanup remains safe.
- **Disabling picker options until their transforms land.** Rejected: the locked scope decision says the picker never has disabled options. The `DARK_TRANSFORM_STUB` marker plus TASK-023's zero-match release gate covers the interim without a UI compromise.
- **Persisting only the selected client (not the on/off state).** Rejected outright — persistence of any kind was declined at the idea checkpoint.

## Lowest Confidence Area

Header layout at narrow window widths. `.preview-header-left` will now hold a ~200px viewport control, a divider, a ~90px switch, a divider, a ~95px switch, and (when on) a ~190px three-button picker, against a `.copy-group` of ~230px on the right. `flex-wrap: wrap` prevents overflow, but a wrapped second row will make the preview header noticeably taller on small laptop screens. The chosen mitigations — hiding the picker while dark mode is off, and text-only buttons — should cover typical widths, but if it still crowds, the next lever is dropping the picker button labels to abbreviated forms or moving the whole dark-mode group to the right of `.copy-group`. Verify visually at 1280px and 1024px before accepting.
