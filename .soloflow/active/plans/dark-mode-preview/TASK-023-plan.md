---
id: TASK-023
idea: IDEA-005
status: approved
created: 2026-08-11T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CODE-PATTERNS.md
  - .soloflow/active/research/IDEA-005-research.md
acceptance_criteria:
  - criterion: "No DARK_TRANSFORM_STUB placeholders remain anywhere — the release gate for 'all three simulations ship together'."
    verification: "grep -n 'DARK_TRANSFORM_STUB' index.html returns 0 matches."
  - criterion: "detectAuthorDarkScheme classifies all three states correctly, and checks for the authored state before the meta state."
    verification: "Harness Section 10 fixtures: an HTML string containing '@media (prefers-color-scheme: dark)' returns 'authored' (NOT 'meta-only', proving the substring-ordering trap is handled); a string containing only '<meta name=\"color-scheme\" content=\"light dark\">' returns 'meta-only'; a string with neither returns 'none'. A string containing 'supported-color-schemes' also returns 'meta-only'. All PASS."
  - criterion: "With no author dark CSS present, the Apple Mail transform returns its input by identity — the email is genuinely unmodified."
    verification: "Harness Section 10 fixture: for an input string with no dark-mode CSS, appleMailDarkTransform(input) === input (strict equality, not substring). PASS."
  - criterion: "The meta-only fallback state applies the partial invert rather than passing through."
    verification: "Harness Section 10 fixture: appleMailDarkTransform('<html><head><meta name=\"color-scheme\" content=\"light dark\"></head><body><td style=\"background-color:#ffffff\">x</td></body></html>') output no longer contains #ffffff. PASS."
  - criterion: "A drift guard fails loudly if the compiler ever starts emitting dark-mode CSS, invalidating the pass-through premise."
    verification: "Harness Section 10 fixture asserts detectAuthorDarkScheme(lastHtml) === 'none' against the live compiled output, with a description naming what to do if it fails. It currently PASSes (confirmed: grep -n 'prefers-color-scheme\\|color-scheme' index.html returns 0 matches in the application source today)."
  - criterion: "The Apple Mail button's title tooltip discloses the simulated surface and the unchanged-render behavior."
    verification: "grep -n 'data-dm=\"applemail\"' index.html shows a title attribute naming Apple Mail macOS 12.4+ / iOS 13+ and stating that the email renders unchanged when no dark-mode CSS is present."
  - criterion: "Preview-only purity, script integrity, and prior harness sections are intact."
    verification: "Section 8 purity fixture PASSes; harness sections 1-9 all PASS; grep -n '</script>' index.html returns exactly 3 lines."
depends_on: [TASK-021, TASK-022]
estimated_complexity: medium
epic: dark-mode-preview
test_strategy:
  needed: true
  justification: "The detector has a genuine substring trap (prefers-color-scheme contains color-scheme, so branch order is load-bearing) and the pass-through's correctness is an exact-identity property that only a test can pin. Most importantly, the entire Apple Mail design rests on a premise about the compiler's output that could be invalidated by an unrelated future change — a drift-guard fixture is the mechanism that makes that failure loud instead of silent."
  targets:
    - behavior: "detectAuthorDarkScheme returns authored / meta-only / none for the three input classes, checking authored first"
      test_file: "index.html"
      type: unit
    - behavior: "appleMailDarkTransform is strictly identity when the detector returns none"
      test_file: "index.html"
      type: unit
    - behavior: "appleMailDarkTransform applies the partial invert when the detector returns meta-only"
      test_file: "index.html"
      type: unit
    - behavior: "Drift guard: the live compiled output (lastHtml) still contains no author dark-mode CSS"
      test_file: "index.html"
      type: unit
---

# Apple Mail CSS-respecting simulation + author-dark-CSS drift guard

## Objective

Implement the Apple Mail picker option as what it honestly is: a client that does not force a dark transform, and therefore renders today's compiled output completely unchanged. Make that no-op *legible* (the dark stage chrome from TASK-021 already supplies the signal), implement the documented middle state where a bare `color-scheme` meta triggers a partial invert, and install a drift guard so the day the compiler starts emitting dark-mode CSS this design fails a test instead of quietly becoming wrong. This is the last `index.html` task in the epic, so it also carries the release gate that no stubbed transform remains.

## What "renders unchanged" means, and why it is the right answer

Apple Mail (macOS 12.4+ / iOS 13+) is the only one of the three simulated surfaces that is opt-in: it honors `prefers-color-scheme` CSS and the `color-scheme` / `supported-color-schemes` meta, and does nothing on its own when neither is present. `buildMjml()`'s `<mj-head>` emits only the format-detection and `x-apple-disable-message-reformatting` metas plus one `mj-style` rule for Apple data-detector links — verified: `grep -n 'prefers-color-scheme\|color-scheme' index.html` returns zero matches in the application source. So the faithful simulation is identity.

That is not a null result for the marketer. Combined with the darkened `.preview-stage` chrome, the Apple Mail option teaches a real and currently-invisible lesson: *"in this client your email keeps its white background while the surrounding app is dark — if that reads as a glaring white slab, the fix is to author dark-mode CSS, not to change your brand colors."* That is a materially different remediation from what the Gmail and Outlook options imply, which is exactly why the option earns its place in the picker.

## Implementation Steps

1. **Baseline gate.** Run `grep -n '</script>' index.html`; confirm exactly 3 matches. Re-run at step 7.
2. **Detector.** Above `appleMailDarkTransform`, add `detectAuthorDarkScheme(html)` returning one of three string states. **Branch order is load-bearing** — `prefers-color-scheme` contains the substring `color-scheme`, so the authored check must come first:
   - Return `'authored'` if `/prefers-color-scheme/i` matches.
   - Otherwise return `'meta-only'` if the HTML contains a `color-scheme` or `supported-color-schemes` meta or CSS property — match `/name=["']?(?:color-scheme|supported-color-schemes)/i` or `/[;{"'\s]color-scheme\s*:/i`.
   - Otherwise return `'none'`.
   Comment the ordering trap explicitly so a future edit does not reorder the branches.
3. **Transform.** Replace the stub body of `appleMailDarkTransform(html)`:
   - `'none'` → `return html;` **unmodified, by identity**. Do not inject a stylesheet, not even the marker — injecting anything would make the "unchanged" claim false and would break the exact-identity fixture. Comment that the absence of a marker here is intentional.
   - `'meta-only'` → `return remapInlineColors(html);` — reuse TASK-022's remap primitive. Apple Mail's documented fallback when the meta is present but no dark styles are authored is a partial invert (light backgrounds go dark, dark text goes light), which is precisely what that function does. Comment the reuse and the source of the behavior.
   - `'authored'` → currently unreachable. Route it to the same `remapInlineColors(html)` and mark it with a clear `// TODO` stating that the correct behavior is to honor the authored rules by unwrapping `@media (prefers-color-scheme: dark)` blocks into unconditional CSS, and that the Section 10 drift guard will fail the moment this branch becomes reachable. Do not implement the unwrapping now — it is speculative code against a compiler that emits nothing to unwrap.
   - Delete the `DARK_TRANSFORM_STUB` comment. This is the last one.
4. **Surface-behavior comment.** Record above the function: the option simulates Apple Mail macOS 12.4+ / iOS 13+ (per caniemail's primary data file); Mail 12 and earlier used a meta-tag-only mechanism and is out of scope; Apple Mail is the "optional dark mode" case in the forced-vs-optional taxonomy while Gmail and Outlook are "forced"; and the whole design depends on the compiler emitting no dark-mode CSS, guarded by the Section 10 fixture.
5. **Tooltip.** Confirm (or set) the `data-dm="applemail"` button's `title` to name the surface and the behavior — e.g. `title="Apple Mail (macOS 12.4+ / iOS 13+) — respects author dark-mode CSS; this email has none, so it renders unchanged"`. Per the locked scope decision this tooltip is the disclosure; do not add a status caption, badge, or `#warn` message for the no-op case.
6. **Harness Section 10.** Add `Dark-mode preview transforms — Apple Mail + author-CSS drift guard` after Section 9, same pattern. Fixtures under Test Strategy. The drift guard's `description` must state the remediation explicitly: *"If this fails, buildMjml() now emits dark-mode CSS and the Apple Mail pass-through is no longer faithful — implement the authored branch of appleMailDarkTransform."*
7. **Release gate.** Run `grep -n 'DARK_TRANSFORM_STUB' index.html` — must return 0 matches, confirming all three picker options are really implemented (the "ship together" scope decision). Then re-run `grep -n '</script>' index.html` — exactly 3 matches; write any literal `</script>` in comments or fixture strings as `<\/script>`.
8. **Manual smoke.** Serve the file, enable dark mode, cycle Gmail → Outlook → Apple Mail. Confirm three visibly distinct results: full inversion, selective darkening with the brand band surviving, and an unchanged white email inside darkened stage chrome. Confirm View HTML output is identical in all three states.

## Acceptance Criteria

- **Release gate.** Zero `DARK_TRANSFORM_STUB` matches in `index.html`.
- **Detector correctness.** `'authored'` for a `prefers-color-scheme` string (not `'meta-only'` — the ordering trap), `'meta-only'` for a bare `color-scheme` or `supported-color-schemes` meta, `'none'` otherwise.
- **Exact identity.** `appleMailDarkTransform(input) === input` under strict equality when the detector returns `'none'`. FAIL = any injected content, including the marker.
- **Meta-only fallback applies.** The partial invert fires and `#ffffff` is gone from the output.
- **Drift guard live and green.** `detectAuthorDarkScheme(lastHtml) === 'none'` PASSes today, and its description names the remediation.
- **Tooltip disclosure.** The Apple Mail button's `title` names the surface and the unchanged-render behavior.
- **No regressions.** Sections 1-9 PASS, Section 8 purity fixture PASSes, `</script>` count is 3.

## Test Strategy

Add harness **Section 10 — "Dark-mode preview transforms — Apple Mail + author-CSS drift guard"** to `renderTestHarness()` in `index.html`, reusing the Section 8/9 predicate-fixture shape and row renderer.

Fixtures:

1. **Detector — authored beats meta** — `detectAuthorDarkScheme('<style>@media (prefers-color-scheme: dark){body{color:#fff}}</style>') === 'authored'`. Description must name the substring trap: `prefers-color-scheme` contains `color-scheme`, so a reordered detector would misclassify this as `meta-only`.
2. **Detector — meta name** — `detectAuthorDarkScheme('<meta name="color-scheme" content="light dark">') === 'meta-only'`.
3. **Detector — legacy meta name** — `detectAuthorDarkScheme('<meta name="supported-color-schemes" content="light dark">') === 'meta-only'`.
4. **Detector — none** — `detectAuthorDarkScheme('<html><head><meta name="format-detection" content="telephone=no"></head><body>x</body></html>') === 'none'`.
5. **Pass-through is exact identity** — for that same no-dark-CSS input, `appleMailDarkTransform(input) === input`. Strict equality, deliberately — a substring check would not catch an injected marker.
6. **Meta-only applies the partial invert** — for `'<html><head><meta name="color-scheme" content="light dark"></head><body><td style="background-color:#ffffff">x</td></body></html>'`, output does not contain `#ffffff`.
7. **Drift guard** — `typeof lastHtml === 'string' && lastHtml.length > 0 && detectAuthorDarkScheme(lastHtml) === 'none'`. Runs against the live compiled output of the currently selected template, so it fails the day `buildMjml()` gains dark-mode CSS. The `lastHtml`-is-populated precondition mirrors the TASK-020 truncation guard's technique.

## Hardest Decision

Whether to build the `'authored'` branch now. The research flags a specific silent-invalidation risk: if the compiler ever gains a bare `color-scheme` meta without dark styling, Apple Mail's real behavior shifts from "unchanged" to "partial invert," and this option would quietly start lying. The tempting fix is to implement full authored-CSS support — unwrapping `@media (prefers-color-scheme: dark)` blocks into unconditional rules — so the simulation is correct under any future compiler output.

Rejected in favor of a **test-shaped guard rather than speculative code**. CSS block unwrapping needs brace-balanced parsing that is unreachable today and therefore unexercised, untested-in-practice, and would rot. The drift-guard fixture achieves the same protection at a fraction of the cost: the premise is asserted against the live compiled output on every harness run, so the moment the premise breaks, a named test fails with instructions attached. Meanwhile the `'meta-only'` branch — the specific scenario the research called out — *is* implemented, and for free, because TASK-022's `remapInlineColors` already does exactly the partial invert Apple's fallback performs.

## Rejected Alternatives

- **Implementing `@media (prefers-color-scheme: dark)` unwrapping now.** See above. Would change the moment the drift guard fails, or if a future idea adds dark-mode CSS to `buildMjml()` — at which point the TODO and the failing fixture point straight at the work.
- **Making the Apple Mail option apply a light "just so something happens" transform.** Rejected as actively harmful: it would teach the marketer to expect a transform that Apple Mail does not perform, producing false confidence in the opposite direction from the feature's purpose.
- **Surfacing an explanatory message through the `#warn` banner when Apple Mail is a no-op.** Rejected on two grounds: `#warn` is styled as a danger surface (red on `#fef2f2`) and is reserved by CODE-PATTERNS for compile errors and MJML warnings, so a routine informational message would mis-signal severity; and the scope decision locked at the idea checkpoint explicitly declined extra affordances. The button tooltip plus the darkened stage chrome carry the disclosure instead. Would change if user feedback shows marketers read the Apple Mail option as broken.
- **Injecting the `EB-DARKSIM` marker in the `'none'` branch for consistency with the other two transforms.** Rejected because it would make `appleMailDarkTransform` non-identity and falsify the strongest available assertion of the "renders unchanged" claim.

## Lowest Confidence Area

Whether a marketer reads the Apple Mail no-op as information or as a bug. The darkened stage chrome plus the tooltip are the entire signal, and the scope decision forbids more. This is the single most likely place the feature draws a "it doesn't do anything" reaction after release. It is a UX bet, not a technical risk — the behavior is definitively correct — and the cheapest escalation if the bet loses is a one-line muted caption next to the picker, which would need the scope decision reopened first.

A smaller uncertainty: the `meta-only` detector regex matching a CSS `color-scheme:` property. The `/[;{"'\s]color-scheme\s*:/i` pattern requires a preceding delimiter to avoid matching inside `prefers-color-scheme:`, but since the `authored` branch already short-circuits that case, the delimiter guard is belt-and-braces. If it proves fragile, drop to meta-name matching only — that is the state the research actually documents.
