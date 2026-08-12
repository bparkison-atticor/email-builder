---
id: TASK-029
idea: SPRINT-006-007-compound
source_item: B1
status: ready
created: 2026-08-12T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CODE-PATTERNS.md
  - .soloflow/active/compound/SPRINT-006-007-proposal.md
acceptance_criteria:
  - criterion: "The Section 8 'Preview-only purity guard' fixture forces darkModeEnabled = true and darkModeClient = 'gmail', calls render() synchronously, and asserts BOTH that els.preview.srcdoc carries EB-DARKSIM and that lastHtml does not — restoring both flags and re-rendering in a finally block."
    verification: "grep -n \"Preview-only purity guard\" index.html, read the surrounding check(); it must contain `darkModeEnabled = true`, `render()`, `els.preview.srcdoc`, and a `finally` that restores the two saved values and calls render() again. Mutation test: temporarily change render() to `els.preview.srcdoc = ...; lastHtml = els.preview.srcdoc;` — the fixture must show FAIL. Revert."
  - criterion: "The Section 10 branch-ordering-trap fixture uses the input '<meta name=\"color-scheme\" content=\"light dark\"><style>@media (prefers-color-scheme: dark){body{color:#fff}}</style>' and asserts === 'authored'."
    verification: "grep -n 'substring-ordering trap' index.html and read the check(); its argument must be that exact combined string. Mutation test: move the `prefers-color-scheme` branch below the `name=` branch in detectAuthorDarkScheme — this fixture must show FAIL. Revert."
  - criterion: "The original plain '@media (prefers-color-scheme: dark)' input is retained as its own separate Section 10 fixture asserting === 'authored'."
    verification: "grep -n \"detectAuthorDarkScheme('<style>@media\" index.html returns a fixture whose check asserts === 'authored'."
  - criterion: "detectAuthorDarkScheme's third branch requires a recognized color-scheme keyword value: the regex is /[;{\"'\\s]color-scheme\\s*:\\s*(?:only\\s+)?(?:light|dark|normal)\\b/i"
    verification: "grep -n 'color-scheme.s\\*:' index.html shows the tightened pattern in detectAuthorDarkScheme; the old /[;{\"'\\s]color-scheme\\s*:/i form is gone."
  - criterion: "Two new Section 10 fixtures lock the tightened branch: detectAuthorDarkScheme('<style>:root{color-scheme:light dark}</style>') === 'meta-only' and detectAuthorDarkScheme('<p>Ask about our color-scheme: blue and white.</p>') === 'none'."
    verification: "grep -n ':root{color-scheme:light dark}' index.html and grep -n 'blue and white' index.html each return exactly one fixture; both show PASS in the harness."
  - criterion: "The detectAuthorDarkScheme contract comment describes the tightened CSS-property branch (recognized keyword values only) rather than any color-scheme: occurrence."
    verification: "Read the comment block immediately above `function detectAuthorDarkScheme`; the 'meta-only' clause must name the keyword restriction (light / dark / normal / only <kw>)."
  - criterion: "A single renderPredicateFixtures(body, fixtures, failText) helper exists and Sections 7, 8, 9 and 10 each call it instead of pasting their own row loop. No `for (const guard of` / `for (const fixture of` row loop remains in Sections 7-10."
    verification: "grep -n 'renderPredicateFixtures' index.html returns exactly 5 lines (1 function declaration + 4 call sites). grep -c 'harness-row-label' index.html returns 8 (was 11 before this task: 1 CSS selector + 10 JS sites, of which 4 collapse into 1)."
  - criterion: "Section 7's rows still read 'FAIL — script was truncated or wiring did not run' on failure while Sections 8/9/10 read 'FAIL', proving the failText parameter is honoured rather than flattened."
    verification: "grep -n 'script was truncated or wiring did not run' index.html returns exactly one line, and it is the third argument of Section 7's renderPredicateFixtures call — not a hardcoded literal inside the helper."
  - criterion: "Section 10 contains exactly 10 fixtures and every row in the whole harness shows PASS on a fresh page load."
    verification: "Serve the app, open Ctrl+Shift+T on a fresh load (dark mode OFF), count the rows under 'Dark-mode preview transforms — Apple Mail + author-CSS drift guard' (10) and confirm zero rows carry the FAIL badge across all sections."
  - criterion: "Opening the harness leaves the app in the state it was in beforehand: the preview iframe, the #warn banner, the Dark mode switch, and previewStage's .dark class are all unchanged after the harness renders."
    verification: "Manual: with dark mode OFF, open Ctrl+Shift+T, close it — preview is the ordinary light email, #warn is unchanged, switch is still OFF. Repeat with dark mode ON + Outlook selected — after closing, the preview is still the Outlook-transformed dark render and the picker still shows Outlook."
depends_on: []
estimated_complexity: medium
epic: dark-mode-preview-hardening
test_strategy:
  needed: true
  justification: "This task IS test work — the deliverable is the harness itself. The verification burden is therefore mutation testing: each repaired fixture must be shown to fail when the invariant it guards is broken."
  targets:
    - behavior: "Section 8 purity guard fails when render() leaks the preview transform into lastHtml"
      test_file: "index.html"
      type: unit
    - behavior: "Section 10 ordering trap fails when detectAuthorDarkScheme's branches are reordered"
      test_file: "index.html"
      type: unit
    - behavior: "CSS-property color-scheme branch classifies keyword values as meta-only and prose as none"
      test_file: "index.html"
      type: unit
---

# Strengthen the dark-mode harness fixtures and extract a shared predicate-row renderer

## Context

The dark-mode preview epic added three harness sections (8, 9, 10) across TASK-021/022/023. Four verified defects came out of the sprint's verifier and code-reviewer passes:

1. **The Section 8 purity guard is vacuous.** `index.html:2440-2443` asserts `lastHtml.indexOf('EB-DARKSIM') === -1`. A fresh page load always has `darkModeEnabled === false`, so `applyDarkMode` is the identity function and no transform has run at all — the fixture would still PASS if `render()` regressed to assign the transformed string to `lastHtml`. It only tests anything on the rare occasion the developer happens to have dark mode ON when they press Ctrl+Shift+T.

2. **The Section 10 ordering trap cannot detect the swap it exists to detect.** Its input is `'<style>@media (prefers-color-scheme: dark){body{color:#fff}}</style>'` (`index.html:2610-2615`). Reordering the branches was mutation-tested and left all 66 rows green. The reason is mechanical: in `prefers-color-scheme:`, the character preceding `color-scheme` is `-`, which is not in the `[;{"'\s]` prefix class, and the string contains no `name=`. So branches 2 and 3 both miss, and the `prefers-color-scheme` branch wins *whatever position it occupies*.

3. **`detectAuthorDarkScheme`'s third branch has zero coverage and a live false positive.** `/[;{"'\s]color-scheme\s*:/i` (`index.html:3220`) fires on ordinary prose — "Ask about our color-scheme: blue and white" in body copy is not HTML-escapable (it contains no special characters), survives verbatim into the compiled HTML, and would flip Apple Mail out of its identity pass-through into a full `remapInlineColors` partial invert. That breaks the one client whose entire design promise is "renders unchanged."

4. **Four copies of the same row-rendering loop.** Sections 7 (`index.html:2360-2372`), 8 (`2459-2471`), 9 (`2583-2595`) and 10 (`2658-2670`) each paste ~13 identical lines. Section 11 and 12 land in TASK-030 and TASK-031 — this is the moment to extract before the copy count reaches six.

## Objective

Make the four dark-mode harness sections actually enforce the invariants they name, close `detectAuthorDarkScheme`'s prose false positive, and collapse the four duplicated row-rendering loops into one helper that TASK-030 and TASK-031 will build on.

## Implementation Steps

1. **Completeness gate (run first, and re-run before reporting COMPLETED).** Establish the baseline counts this task's acceptance criteria are measured against:
   ```
   grep -c "harness-row-label" index.html          # expect 11 before, 8 after
   grep -n "renderPredicateFixtures" index.html     # expect 0 before, 5 after
   grep -n "for (const \(guard\|fixture\) of" index.html   # expect 9 before, 5 after
   ```
   These are the only files that can match — the whole app is `index.html`.

2. **Extract the shared row renderer.** Immediately before Section 7's `const h7 = ...` (currently `index.html:2337`), add:
   ```js
   // renderPredicateFixtures(body, fixtures, failText) — the shared row
   // renderer for every predicate-shaped harness section. A fixture is
   // { label, check(), description }; check() is called inside a try/catch
   // so a throwing predicate renders as FAIL rather than aborting the whole
   // harness. Sections 5 and 6 deliberately do NOT use this — they render a
   // different field shape (input/expected/actual) and are left alone.
   function renderPredicateFixtures(body, fixtures, failText = 'FAIL') {
     for (const fixture of fixtures) {
       const pass = (() => { try { return fixture.check(); } catch { return false; } })();
       const row = document.createElement('div');
       row.className = 'harness-row ' + (pass ? 'pass' : 'fail');
       row.innerHTML =
         '<div class="harness-row-label">' +
           '<span>' + escapeHtml(fixture.label) + '</span>' +
           '<span class="harness-badge">' + (pass ? 'PASS' : 'FAIL') + '</span>' +
         '</div>' +
         '<div class="harness-field"><strong>Description:</strong> <code>' + escapeHtml(fixture.description) + '</code></div>' +
         '<div class="harness-field"><strong>Result:</strong> <code>' + (pass ? 'PASS' : failText) + '</code></div>';
       body.appendChild(row);
     }
   }
   ```
   Declare it inside `renderTestHarness()` (a nested function declaration is fine and keeps it beside its only callers), or at module scope directly above `renderTestHarness` — pick one and be consistent.

3. **Replace the four loops with calls.** Delete `index.html:2360-2372`, `2459-2471`, `2583-2595`, `2658-2670` and substitute:
   ```js
   renderPredicateFixtures(body, TRUNCATION_GUARDS, 'FAIL — script was truncated or wiring did not run');
   renderPredicateFixtures(body, DARK_MODE_FIXTURES);
   renderPredicateFixtures(body, OUTLOOK_DARK_FIXTURES);
   renderPredicateFixtures(body, APPLEMAIL_DARK_FIXTURES);
   ```
   Note the fixture arrays are `const`-declared *before* each loop today; keep that structure, only the loop is replaced. Sections 1-6 are untouched.

4. **Rewrite the Section 8 purity guard.** Replace the `check()` at `index.html:2441-2442` with:
   ```js
   {
     label: 'Preview-only purity guard: lastHtml never carries EB-DARKSIM (dark mode forced ON)',
     check() {
       const savedEnabled = darkModeEnabled;
       const savedClient = darkModeClient;
       try {
         // Force the condition the invariant is about. A fresh load has dark
         // mode OFF, which makes applyDarkMode the identity function — the
         // pre-TASK-029 version of this fixture passed vacuously on every
         // ordinary harness run (FIND-SPRINT-007-7).
         darkModeEnabled = true;
         darkModeClient = 'gmail';
         render();
         const previewIsTransformed = String(els.preview.srcdoc).indexOf('EB-DARKSIM') !== -1;
         const exportIsPure = typeof lastHtml === 'string' && lastHtml.length > 0
           && lastHtml.indexOf('EB-DARKSIM') === -1;
         // Both halves are required: exportIsPure alone would still pass if
         // the transform silently stopped running.
         return previewIsTransformed && exportIsPure;
       } finally {
         darkModeEnabled = savedEnabled;
         darkModeClient = savedClient;
         render();
       }
     },
     description: 'With dark mode forced ON and Gmail selected, the preview srcdoc must carry the EB-DARKSIM marker while lastHtml (Copy HTML / View HTML source) must not. The finally block restores the real toggle state and re-renders.',
   }
   ```
   `render()` is a hoisted module-scope function declaration (`index.html:3344`) and is synchronous, so calling it from the harness is safe. It writes `lastHtml`, `els.preview.srcdoc` and the `#warn` banner; the `finally` re-render restores all three. It does not touch `previewStage.classList` or the switch element, so no UI state needs restoring.

5. **Tighten `detectAuthorDarkScheme`'s third branch.** At `index.html:3220`, replace the branch and its comment with:
   ```js
   // Requires a recognized color-scheme keyword value. Without it, ordinary
   // marketer prose ("Ask about our color-scheme: blue and white") — which
   // contains no HTML-special characters and so survives escapeHtml verbatim
   // into the compiled HTML — would flip Apple Mail out of its identity
   // pass-through into a full partial invert (FIND-SPRINT-007-14). The
   // [;{"'\s] prefix additionally keeps this from matching inside the
   // substring "prefers-color-scheme:", belt-and-braces given the authored
   // check above already short-circuits that case.
   if (/[;{"'\s]color-scheme\s*:\s*(?:only\s+)?(?:light|dark|normal)\b/i.test(html)) return 'meta-only';
   ```
   Do NOT touch branch 1 (`/prefers-color-scheme/i`) or branch 2 (`/name=["']?(?:color-scheme|supported-color-schemes)/i`), and do not change their order — the `BRANCH ORDER IS LOAD-BEARING` comment above stays.

6. **Update the contract comment.** In the block at `index.html:3202-3207`, change the `'meta-only'` clause to read: *"a color-scheme / supported-color-schemes signal — either as a meta name, or as a CSS `color-scheme:` property whose value is a recognized keyword (`light` / `dark` / `normal`, optionally prefixed `only`) — with no dark rules behind it"*.

7. **Rewrite Section 10's fixture list.** `APPLEMAIL_DARK_FIXTURES` goes from 7 to 10 entries, in this order:
   1. `'Detector: authored — plain @media block'` — the current input `'<style>@media (prefers-color-scheme: dark){body{color:#fff}}</style>'`, asserting `=== 'authored'`. Description: locks the primary authored-detection path; note in the description that this input alone cannot detect a branch reorder, which is what fixture 2 is for.
   2. `'Detector: authored beats meta (substring-ordering trap)'` — input `'<meta name="color-scheme" content="light dark"><style>@media (prefers-color-scheme: dark){body{color:#fff}}</style>'`, asserting `=== 'authored'`. Description: both a meta-name signal and a real authored block are present; only the shipped branch order returns `'authored'` — either reordering returns `'meta-only'`.
   3-5. The three existing detector fixtures (`color-scheme` meta, `supported-color-schemes` meta, `none`), unchanged.
   6. **NEW** `'Detector: CSS color-scheme property with a keyword value is meta-only'` — `detectAuthorDarkScheme('<style>:root{color-scheme:light dark}</style>') === 'meta-only'`.
   7. **NEW** `'Detector: prose "color-scheme:" with a non-keyword value is none'` — `detectAuthorDarkScheme('<p>Ask about our color-scheme: blue and white.</p>') === 'none'`. Description must name the reason: marketer body copy reaches this function through the compiled HTML, and a false positive here silently breaks Apple Mail's identity pass-through.
   8-10. The three existing behavior fixtures (strict-identity pass-through, meta-only partial invert, drift guard), unchanged.

8. **Verify.** Serve with `python -m http.server 8080 --bind 127.0.0.1`, load the app, press Ctrl+Shift+T on a fresh load. Confirm zero FAIL badges and 10 rows in Section 10. Then run the two mutation tests named in the acceptance criteria (leak `lastHtml`; reorder the detector branches), confirming the intended fixture goes red each time, and revert both.

## Acceptance Criteria

Each criterion in the frontmatter is pass/fail as written. The two mutation tests are the load-bearing ones: a fixture that does not go red when its invariant is broken has not been repaired, it has only been reworded. If either mutation leaves the harness fully green, the task is not complete regardless of what the other criteria say.

## Test Strategy

The harness *is* the test surface for this codebase — there is no runner, and `CODE-PATTERNS.md` records "no test runner in use". So the strategy is mutation-driven:

- **Purity guard** (`index.html`, Section 8, unit): break `render()` so `lastHtml = els.preview.srcdoc` after the transform chain; the guard must FAIL. Also break it the other way — make `applyDarkMode` return its input unconditionally; the guard must FAIL on the `previewIsTransformed` half. Revert both.
- **Ordering trap** (`index.html`, Section 10, unit): swap the `prefers-color-scheme` branch below the `name=` branch in `detectAuthorDarkScheme`; fixture 2 must FAIL while fixture 1 stays green (documenting exactly why fixture 1 was insufficient on its own). Revert.
- **Tightened CSS-property branch** (`index.html`, Section 10, unit): revert the regex to the loose `/[;{"'\s]color-scheme\s*:/i`; the prose fixture (7) must FAIL while the keyword fixture (6) stays green. Revert.

No mocking or fixtures files are needed — every function under test is pure string-in/string-out except the purity guard, which drives the real `render()` and restores state in a `finally`.

## Out of Scope

- `appleMailDarkTransform`'s `'authored'` branch. Still unreachable; the Section 10 drift guard remains the trigger for implementing it.
- Tightening branch 1 (`/prefers-color-scheme/i`) against prose. It has the same theoretical false positive as branch 3 did, but "prefers-color-scheme" is not a phrase that appears in marketing copy, and constraining it to an `@media` context would change the semantics of the ordering trap this task is repairing. Noted in Lowest Confidence Area.
- Sections 5 and 6. They render an input/expected/actual field shape and do not fit the predicate pattern — leave them exactly as they are.
- `CHANGELOG.md`. TASK-031 owns the changelog for this epic; this task's changes are harness internals.

## Hardest Decision

Whether to keep, tighten, or drop `detectAuthorDarkScheme`'s third branch — the compound proposal explicitly deferred this to refinement. **Decision: tighten to a keyword-value allowlist.**

Dropping it (the TASK-023 plan's own escape hatch, "drop to meta-name matching only") is tempting because the branch is unreachable in production today — `buildMjml()` emits no `color-scheme` at all. But `<style>:root{color-scheme:light dark}</style>` is a genuine, common email-authoring pattern and is exactly the signal Apple Mail itself reads; deleting the branch would mean that when this app *does* start emitting it (a plausible future task), Apple Mail would silently classify it as `'none'` and pass through unchanged — a wrong simulation that nothing would catch.

Keeping it as-is is worse than either alternative, because the false positive is reachable *now*, through marketer body copy, on the one client whose whole promise is "renders unchanged." The keyword allowlist is one regex, costs nothing at runtime, keeps the real detection, kills the prose case, and both directions are lockable with a two-fixture pair. That combination is why it wins.

## Rejected Alternatives

- **Drop the branch entirely.** Rejected above. Would change my mind: an explicit decision that this builder will never emit `color-scheme` CSS (i.e. the Apple Mail transform is frozen as a permanent no-op), at which point the branch is pure speculation and the simplest thing is deletion.
- **Require a `<style>` or attribute context instead of a keyword value.** Would need either brace-balanced CSS parsing or a `<style>[\s\S]*?color-scheme` pattern that a single `<style>` block elsewhere in the document defeats. More machinery, more failure modes, and it still would not reject `<style>.x{}</style> ... color-scheme: blue` prose. The keyword allowlist is strictly cheaper for the same outcome.
- **Skip the `renderPredicateFixtures` extraction** (the compound skeptic's own counterfactual: "if part d is dropped, the remaining fixture repairs get cheaper still"). Rejected because TASK-030 and TASK-031 in this same epic each add a new predicate section — dropping the extraction now means shipping copies five and six within the epic. Would change my mind: if TASK-030 and TASK-031 were cancelled.
- **Make the purity guard assert only `lastHtml` purity, not the preview's transformation.** Rejected: that version silently degrades to a vacuous pass again the moment `applyDarkMode` stops running for any reason. Asserting both halves is what makes the fixture self-validating.

## Lowest Confidence Area

The Section 8 fixture's forced `render()`. It is synchronous and its `finally` restores `darkModeEnabled`, `darkModeClient`, `lastHtml`, the preview `srcdoc` and the `#warn` banner — but it does so by calling `render()` a second time, which means the app briefly compiles MJML twice while the harness is opening. If `mjml2html` ever throws during the forced render, `render()`'s own catch sets `lastHtml = ''` and the fixture reports FAIL via its `length > 0` check; that is loud and correct, but a developer would have to know to look at the ordinary preview to see the real cause. Watch for the harness feeling sluggish to open on large templates.

Secondarily: branch 1 (`/prefers-color-scheme/i`) keeps its prose false positive. I judged the phrase implausible in marketing copy, but that is a judgement, not a measurement.
