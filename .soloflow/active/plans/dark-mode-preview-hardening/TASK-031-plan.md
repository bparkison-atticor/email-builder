---
id: TASK-031
idea: SPRINT-006-007-compound
source_item: B3
status: ready
created: 2026-08-12T00:00:00Z
files_owned:
  - index.html
  - CHANGELOG.md
files_readonly:
  - README.md
  - CODE-PATTERNS.md
  - .soloflow/active/compound/SPRINT-006-007-proposal.md
acceptance_criteria:
  - criterion: "A `#darkNote` element sits between the #warn banner and #previewStage in the static markup, carries role=\"status\", and starts with the `hidden` attribute."
    verification: "grep -n 'id=\"darkNote\"' index.html returns exactly one line, inside .preview-panel, after the `<div class=\"warn\" id=\"warn\">` line and before the `<div class=\"preview-stage\"` line, with role=\"status\" and hidden."
  - criterion: "The `.dark-note` CSS rule declares no `display` property, so the `hidden` attribute is honoured by the UA stylesheet."
    verification: "Read the `.dark-note` rule in index.html — it must contain font-size, color, padding, background and border-bottom but NO `display:` declaration. (This is the trap `.seg-control[hidden] { display: none }` at ~line 255 exists to work around for a rule that does set display.)"
  - criterion: "A DARK_MODE_CLIENT_NOTES map holds one plain-English sentence per client key, and it is the single source for BOTH the caption text and the three picker buttons' title attributes — the titles are assigned in JS from the map, not hardcoded in the insertAdjacentHTML string."
    verification: "grep -n 'DARK_MODE_CLIENT_NOTES' index.html returns the const declaration plus at least three use sites. grep -n 'title=\"Gmail mobile app' index.html returns 0 matches (the literal titles are gone from the markup string)."
  - criterion: "DARK_MODE_CLIENT_NOTES has an entry for every key in DARK_MODE_TRANSFORMS."
    verification: "New harness Section 12 fixture 'Every registered dark-mode client has a caption' asserts Object.keys(DARK_MODE_TRANSFORMS).every(k => typeof DARK_MODE_CLIENT_NOTES[k] === 'string' && DARK_MODE_CLIENT_NOTES[k].length > 0) and shows PASS."
  - criterion: "syncDarkNote() sets darkNote.hidden = !darkModeEnabled and darkNote.textContent = DARK_MODE_CLIENT_NOTES[darkModeClient], and is called from both onDarkModeToggle() and the dark client picker's wireSegControl callback."
    verification: "Read `function syncDarkNote` and confirm both statements; grep -n 'syncDarkNote()' index.html returns the declaration plus exactly two call sites in the wiring (plus any harness use)."
  - criterion: "At a maximized desktop window with Dark mode ON and Apple Mail selected, the preview panel is visibly different from Dark mode OFF, and the difference is readable text rather than chrome."
    verification: "Load the app at >=1600px wide. Flip Dark mode ON, click Apple Mail. The caption strip above the preview reads the Apple Mail sentence. In the console: `darkNote.hidden === false && darkNote.textContent.includes('Apple Mail')` is true. Flip Dark mode OFF: `darkNote.hidden === true`. Screenshot the preview panel in both states and confirm they are not pixel-identical."
  - criterion: "The explanation of each client is reachable without a mouse: it is visible text in the DOM, not only a title attribute."
    verification: "Tab to the Dark mode switch, press Space, then Tab to the client picker and activate Apple Mail using only the keyboard — the caption text updates and is on screen the whole time, with no hover anywhere in the sequence."
  - criterion: "The `.preview-stage.dark` code comment no longer claims the chrome makes the no-op read as a deliberate result; it states the chrome is a secondary signal visible only in the mobile viewport, and names #darkNote as the primary disclosure."
    verification: "Read the comment immediately above `.preview-stage.dark` in index.html. grep -n 'deliberate result' index.html returns 0 matches."
  - criterion: "CHANGELOG.md's existing `.preview-stage.dark` bullet no longer overstates desktop legibility, and a new dated section documents the caption."
    verification: "grep -rn 'reads as a deliberate result' --include='*.md' . returns 0 matches outside .soloflow/. CHANGELOG.md's top section is dated 2026-08-12, names the dark-mode caption under Added, and lists the corrected .preview-stage.dark description under Changed or Fixed."
  - criterion: "Every harness row still shows PASS, including the new Section 12 and TASK-030's Section 11."
    verification: "Open Ctrl+Shift+T on a fresh load and confirm zero FAIL badges across all twelve sections."
depends_on: [TASK-030]
estimated_complexity: medium
epic: dark-mode-preview-hardening
test_strategy:
  needed: true
  justification: "The caption's correctness is a data-completeness property (a client with a transform but no note ships a blank strip) and a state-sync property (caption must track both the toggle and the picker). Both are silently breakable by adding a fourth client or by wiring only one of the two call sites — exactly what a predicate fixture catches and manual QA does not."
  targets:
    - behavior: "Every key in DARK_MODE_TRANSFORMS has a non-empty DARK_MODE_CLIENT_NOTES entry"
      test_file: "index.html"
      type: unit
    - behavior: "Picker button title attributes are sourced from DARK_MODE_CLIENT_NOTES rather than hardcoded"
      test_file: "index.html"
      type: integration
    - behavior: "syncDarkNote shows/hides the caption with the toggle and swaps text with the client selection"
      test_file: "index.html"
      type: integration
---

# Replace the dark-mode disclosure with a visible caption; correct the chrome-legibility claims

## Context

The dark-mode preview's disclosure story has two halves and **neither reaches a marketer in the default view.**

**Half one — the stage chrome is fully occluded at desktop.** `.preview-stage.dark` (`index.html:250`) sets `background: #1a1a1a`, but `.preview-iframe` (`234-240`) is `width: 100%; height: 100%` and the stage has no padding. Margin is applied only under `.preview-stage.mobile` (`241-245`). Measured in headless Chromium at 1600x1000: **zero `rgb(26,26,26)` pixels anywhere in the stage**, and dark-ON/Apple-Mail is pixel-identical to dark-OFF. The chrome only appears in the mobile viewport, where the iframe narrows to 375px (69.3% pixel difference confirmed). This invalidates TASK-023's locked scope decision — "the button tooltip plus the darkened stage chrome carry the disclosure instead" — which assumed the chrome was visible.

**Half two — the tooltip is hover-only.** The picker's entire explanation lives in `title` attributes on the three buttons. `title` is not part of the accessible-name computation when an element has text content, so screen readers announce "Apple Mail, button" and nothing else; it is unreachable by keyboard; and it requires a hover the marketer has no reason to attempt. For Gmail and Outlook that is tolerable because the transform itself is plainly visible. **For Apple Mail the tooltip *is* the entire explanation** — without it, a correct no-op is indistinguishable from a broken toggle.

Two artifacts already assert the false claim: `CHANGELOG.md:13` ("so the Apple Mail no-op still reads as a deliberate result rather than a broken toggle") and the code comment at `index.html:247-249`.

The codebase has **no** `.sr-only` / visually-hidden utility class (verified by grep), so an `aria-describedby`-plus-hidden-span approach would require inventing one.

## Objective

Give the dark-mode preview one disclosure that works for everybody — a visible, screen-reader-announced caption directly above the preview stating which client is being simulated and what it does — and correct the two artifacts that currently overstate the stage chrome's desktop legibility.

**Scope decision made at refinement:** the caption path, not the occlusion-fix path. This is the escalation the TASK-023 plan itself named as cheapest. It is a small, user-visible UI addition; the fully-specified alternative is in Rejected Alternatives if it is rejected on review.

## Implementation Steps

1. **Completeness gate (run first, and re-run before reporting COMPLETED).** The overstatement is a string literal that must not survive anywhere writable:
   ```
   grep -rn "reads as a deliberate result\|deliberate result" --include="*.html" --include="*.md" .
   ```
   Pre-flight result: `CHANGELOG.md:13` plus `.soloflow/active/compound/SPRINT-006-007-proposal.md:433` and `.soloflow/active/findings/SPRINT-007-findings.md:204`. **`.soloflow/**` is an immutable historical record — do not rewrite it.** After this task the grep must return zero matches outside `.soloflow/`.

2. **Add the caption element to the static markup.** Between `<div class="warn" id="warn"></div>` (currently `index.html:760`) and `<div class="preview-stage" id="previewStage">` (`761`):
   ```html
       <div class="dark-note" id="darkNote" role="status" hidden></div>
   ```
   This lives in `.preview-panel`, **not** `.preview-header-left`, so it does not interact with the runtime-append-order contract TASK-030 documents. `role="status"` carries an implicit `aria-live="polite"` so switching clients while dark mode is on is announced.

3. **Add the CSS**, immediately after the `.warn.visible` rule (currently `index.html:271`):
   ```css
     /* Primary dark-mode disclosure. Do NOT add a `display` declaration here:
        visibility is driven by the `hidden` attribute, and an author
        `display` rule beats the UA stylesheet's `[hidden] { display: none }`
        — the same trap `.seg-control[hidden]` above exists to work around. */
     .dark-note {
       font-size: 12px;
       color: var(--muted);
       padding: 8px 20px;
       background: #f9fafb;
       border-bottom: 1px solid var(--border);
     }
   ```
   `* { box-sizing: border-box; }` at `index.html:47` already applies, so the padding does not widen the panel.

4. **Add the notes map and sync function.** Immediately after the `DARK_MODE_TRANSFORMS` registry (currently `index.html:3258`):
   ```js
   // DARK_MODE_CLIENT_NOTES — the single source of truth for what the
   // preview is currently simulating. Feeds BOTH the visible #darkNote
   // caption and the picker buttons' title attributes, so the two can never
   // drift. Visible text is what makes this reach keyboard and screen-reader
   // users: a title attribute is hover-only and loses the accessible-name
   // computation to the button's own text content (FIND-SPRINT-007-19/20).
   // Keys must stay in sync with DARK_MODE_TRANSFORMS — harness Section 12
   // asserts that.
   const DARK_MODE_CLIENT_NOTES = {
     gmail: 'Simulating Gmail (iOS app): the whole email is inverted, then images are re-inverted so photos stay right.',
     outlook: 'Simulating Outlook.com / OWA: light backgrounds are darkened and low-contrast text is lifted; colors that are already dark are left alone.',
     applemail: 'Simulating Apple Mail: it only goes dark when the email carries its own dark-mode CSS. This email carries none, so the preview is intentionally unchanged.',
   };
   ```
   Then, beside the dark-mode control wiring (after `const darkClientControl = ...`, which TASK-030 places at the top of that block):
   ```js
   const darkNote = document.getElementById('darkNote');
   function syncDarkNote() {
     darkNote.hidden = !darkModeEnabled;
     darkNote.textContent = DARK_MODE_CLIENT_NOTES[darkModeClient] || '';
   }
   ```

5. **Re-source the picker button titles from the map.** In the `insertAdjacentHTML` string TASK-030 leaves at the top of the dark-mode block, delete all three `title="…"` attributes from the button markup. Immediately after `const darkClientControl = document.getElementById('darkClientControl');`, add:
   ```js
   // Titles and the caption both read DARK_MODE_CLIENT_NOTES — one source,
   // no drift. The titles are supplementary hover detail only; the caption
   // is the disclosure that actually has to work.
   for (const btn of darkClientControl.querySelectorAll('button[data-dm]')) {
     btn.title = DARK_MODE_CLIENT_NOTES[btn.dataset.dm] || '';
   }
   ```

6. **Wire the sync into both state changes.** Add `syncDarkNote();` as the last statement of `onDarkModeToggle()` (before or after `scheduleRender()`, order does not matter), and add it to the dark client picker's `wireSegControl` callback:
   ```js
   wireSegControl(darkClientControl.querySelectorAll('button[data-dm]'), (btn) => {
     darkModeClient = btn.dataset.dm;
     syncDarkNote();
     scheduleRender();
   });
   ```
   Because `onDarkModeToggle` fires once during `createModuleToggle` construction, `syncDarkNote` runs at init and correctly leaves the caption hidden. **`darkNote` and `syncDarkNote` must therefore be declared before the `createModuleToggle('darkMode', …)` call** — same construction-order constraint TASK-030 documents for `darkClientControl`.

7. **Correct the `.preview-stage.dark` comment** (`index.html:247-249`):
   ```css
     /* SECONDARY signal only. At desktop widths .preview-iframe is
        width:100%/height:100% with no stage padding, so this surround is
        fully occluded — measured at 1600x1000: zero #1a1a1a pixels visible.
        It only shows in the mobile viewport, where the iframe narrows to
        375px. The PRIMARY disclosure that a simulation is running is the
        visible #darkNote caption above the stage (DARK_MODE_CLIENT_NOTES),
        which is also what carries the Apple Mail no-op explanation. */
     .preview-stage.dark { background: #1a1a1a; }
   ```
   Keep the rule itself — it costs nothing and is a real signal in the mobile viewport.

8. **Add harness Section 12.** After Section 11's `renderPredicateFixtures(body, MODULE_TOGGLE_FIXTURES);` call (added by TASK-030):
   ```js
   // --- Section 12: dark-mode disclosure caption (TASK-031) ---
   const h12 = document.createElement('h3');
   h12.style.cssText = 'margin:12px 0 4px;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)';
   h12.textContent = 'Dark-mode disclosure caption';
   body.appendChild(h12);

   const DARK_NOTE_FIXTURES = [
     {
       label: 'Every registered dark-mode client has a caption',
       check() {
         return Object.keys(DARK_MODE_TRANSFORMS).every(k =>
           typeof DARK_MODE_CLIENT_NOTES[k] === 'string' && DARK_MODE_CLIENT_NOTES[k].length > 0);
       },
       description: 'Adding a fourth client to DARK_MODE_TRANSFORMS without a caption would ship a blank disclosure strip for it. This fixture is the coupling between the two maps.',
     },
     {
       label: 'Picker button titles are sourced from DARK_MODE_CLIENT_NOTES',
       check() {
         const btns = Array.from(darkClientControl.querySelectorAll('button[data-dm]'));
         return btns.length === 3 && btns.every(b => b.title === DARK_MODE_CLIENT_NOTES[b.dataset.dm]);
       },
       description: 'One source of truth for the hover detail and the visible caption — a hardcoded title in the markup string would drift from the caption silently.',
     },
     {
       label: 'Caption tracks the toggle and the client selection',
       check() {
         const savedEnabled = darkModeEnabled;
         const savedClient = darkModeClient;
         try {
           darkModeEnabled = true; darkModeClient = 'applemail'; syncDarkNote();
           const onApple = darkNote.hidden === false && darkNote.textContent === DARK_MODE_CLIENT_NOTES.applemail;
           darkModeClient = 'outlook'; syncDarkNote();
           const onOutlook = darkNote.textContent === DARK_MODE_CLIENT_NOTES.outlook;
           darkModeEnabled = false; syncDarkNote();
           const off = darkNote.hidden === true;
           return onApple && onOutlook && off;
         } finally {
           darkModeEnabled = savedEnabled; darkModeClient = savedClient; syncDarkNote();
         }
       },
       description: 'The caption must be hidden when dark mode is off and must swap text on every client change — wiring only one of the two call sites leaves it stale.',
     },
   ];

   renderPredicateFixtures(body, DARK_NOTE_FIXTURES);
   ```

9. **Update `CHANGELOG.md`.** Correct the existing bullet at line 13 in place:
   ```
   - **`.preview-stage.dark`** darkens the chrome around the iframe (`#1a1a1a`). Visible only in the mobile viewport — at desktop widths the iframe is 100% wide and covers it entirely.
   ```
   Then add a new dated section at the top of the file (above the `## 2026-08-11 — Dark mode preview simulation` section):
   ```markdown
   ## 2026-08-12 — Dark mode preview: visible client caption

   ### Added
   - **Dark-mode disclosure caption.** A muted one-line strip (`#darkNote`) directly above the preview names the client being simulated and what it does, sourced from `DARK_MODE_CLIENT_NOTES`. Shown only while Dark mode is on; updates on every client change. It replaces hover-only `title` attributes as the primary explanation — visible text is announced to screen readers and needs no mouse, which matters most for **Apple Mail**, where the correct behavior is "renders unchanged" and the explanation was the only thing distinguishing that from a broken toggle. The picker's `title` attributes now read from the same map, so hover detail and caption cannot drift.

   ### Fixed
   - **Overstated dark-mode chrome legibility.** The `.preview-stage.dark` surround is fully occluded at desktop widths (the iframe is `width: 100%` with no stage padding); it is only visible in the mobile viewport. The changelog bullet and the code comment that both claimed it made the Apple Mail no-op "read as a deliberate result" have been corrected, and the caption now carries that job at every viewport.
   ```

10. **Verify.** Serve, load at >=1600px wide. Flip Dark mode ON: the caption appears with the Gmail sentence. Click Outlook, then Apple Mail: the text changes each time. On Apple Mail the preview is unchanged (correct) but the caption says why. Screenshot the preview panel with dark OFF and with dark ON/Apple Mail — they must differ. Repeat the whole sequence keyboard-only. Then Ctrl+Shift+T and confirm zero FAIL badges across twelve sections.

## Acceptance Criteria

As listed in the frontmatter. The criterion that defines success is the desktop one: at a maximized window with Apple Mail selected, dark-ON must be visibly and textually distinguishable from dark-OFF **without hovering anything**. Everything else supports that.

## Test Strategy

Three new harness fixtures in `index.html` Section 12, using TASK-029's `renderPredicateFixtures` helper:

- **Caption completeness** (unit) — couples `DARK_MODE_CLIENT_NOTES` to `DARK_MODE_TRANSFORMS` so a fourth client cannot ship with a blank strip.
- **Title sourcing** (integration) — reads the live picker buttons and asserts each `title` is identical to its map entry, catching a reintroduced hardcoded title.
- **Caption state sync** (integration) — drives `darkModeEnabled` / `darkModeClient` directly through three states (Apple Mail on, Outlook on, off), asserting hidden-ness and text each time, restoring in a `finally`. This catches the most likely wiring error: hooking `syncDarkNote` into `onDarkModeToggle` but forgetting the picker callback, which leaves the caption showing the wrong client's sentence.

No mocking or fixture files. The state fixture mutates module-scope flags and restores them, following the pattern TASK-029 establishes for the Section 8 purity guard. Note it deliberately does **not** call `render()` — the caption is independent of the render pipeline.

## Out of Scope

- **Fixing the desktop occlusion** (stage padding or iframe margins). Deliberately rejected — see below. `.preview-stage.dark` stays as-is; only its comment changes.
- **An `aria-describedby` + visually-hidden span.** Unnecessary once the explanation is visible text, and the codebase has no `.sr-only` utility to hang it on.
- **`README.md`.** Its dark-mode section (lines 92-100) already explains all three clients in more detail than the caption does; adding a mention of the caption would be redundant with prose the marketer is already reading.
- **`ARCHITECTURE.md`** — the compound run's C3 item covers it.
- **A fourth dark-mode client, or any change to what the three transforms produce.**

## Hardest Decision

Choosing the caption over fixing the occlusion. The compound proposal framed this as a scope decision needing one answer rather than three patches, and both paths are defensible.

Fixing the occlusion is the more literal repair: `.preview-stage.dark:not(.mobile) .preview-iframe { margin: 16px; width: calc(100% - 32px); height: calc(100% - 32px); }` would make the chrome do what the comment always claimed. But it is more fragile than it looks — `.preview-stage.dark .preview-iframe` and `.preview-stage.mobile .preview-iframe` have identical specificity, so source order silently decides which wins when both classes are on (hence the `:not(.mobile)`), and `height: calc(100% - 32px)` plus a 16px margin inside an `overflow: auto` flex container introduces a scrollbar at exactly the moment the layout is otherwise stable. It also costs the marketer 32px of preview area whenever dark mode is on.

And crucially, **it fixes the weaker half.** Even with visible chrome, the Apple Mail case still communicates only "something is different," never "this is correct and here is why" — and it does nothing at all for the keyboard/screen-reader gap, which would still need its own `aria-describedby` fix. The caption fixes both halves at once with one element, one CSS rule and one map; it does not depend on the stage chrome being visible; and it is the escalation TASK-023's own plan pre-named as the cheapest path. Given that, spending layout risk on the secondary signal is the wrong purchase.

The cost is honesty about the leftover: `.preview-stage.dark` remains a rule that does nothing at desktop. Step 7 makes the comment say so plainly rather than deleting the rule, because it is a genuine (if minor) mobile-viewport signal and removing it would be a second, unrelated change.

## Rejected Alternatives

- **Fix the occlusion instead of adding the caption.** Rejected above. Would change my mind: if review rejects adding visible UI to the preview panel. The full replacement path is then — (a) `.preview-stage.dark:not(.mobile) .preview-iframe { margin: 16px; width: calc(100% - 32px); height: calc(100% - 32px); }` placed *after* the `.preview-stage.mobile` rule, (b) a new `.sr-only` utility class plus a visually-hidden `<span id="darkClientDesc">` and `aria-describedby` on all three picker buttons, and (c) the same CHANGELOG/comment corrections, reworded to say the chrome is now visible at both viewports.
- **Do both** (caption *and* stage padding). Rejected as scope creep: with the caption present, the chrome's stated job is fully subsumed, so the padding would be paying layout risk and 32px of preview area for a redundant signal.
- **Put the caption in `.preview-header-left` next to the picker** (the compound proposal's literal suggestion). Rejected on layout: that container is `display: flex; flex-wrap: wrap` and already wraps at 1280px — a full sentence there would force a second header row and shove the toolbar buttons around. Above the stage it is a natural full-width strip, matches the adjacent `#warn` banner's shape, and sits in the same screenshot region as the thing it describes, which also makes the dark-ON/dark-OFF comparison unambiguous.
- **Keep the `title` attributes as the only mechanism and just add `aria-label`.** Rejected: `aria-label` would *replace* the button's accessible name ("Apple Mail") with a whole sentence, making the picker unusable to navigate by name, and it still leaves sighted mouse-free users with nothing.

## Lowest Confidence Area

Live-region announcement on the *first* unhide. `role="status"` is reliable when the element is already in the accessibility tree and its contents change — so switching clients while dark mode is on will announce. But `hidden` removes the element from the tree, so turning dark mode ON may not announce the caption on some AT/browser combinations; the user would encounter the text on their next traversal instead. The `role="switch"` toggle's own `aria-checked` change does announce, so the state change is never silent — only the explanation might be delayed. Making it fully reliable would mean keeping the strip permanently in the tree with empty text, which shows an empty padded bar. Not worth it; flagged so a future accessibility pass knows the tradeoff was deliberate.

Second: the caption sentences are my wording, not reviewed copy. They are the user-facing text a marketer reads every time they use the feature — expect them to be edited. They are isolated in one map for exactly that reason.
