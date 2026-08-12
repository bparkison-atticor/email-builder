---
sprint: SPRINT-007
visual_mobile: not_applicable
visual_web:    not_applicable
regressions_count: 0
flows_tested: 0
flows_deferred: 0
---

# Sprint Verification — SPRINT-007

Verdict: **PASS**. No cross-task regressions found. Two independent automated
passes (harness + UI-driven E2E) plus a manual cross-task seam review of the
combined diff 553b6d2b..HEAD.

## Integration Tests

### Pass 1 — full in-browser harness (real browser, not a fallback)

Playwright/Chromium 151 against `python -m http.server 8080 --bind 127.0.0.1`,
real Ctrl+Shift+T keypress, CDN libs (Handlebars 4.7.8, mjml-browser 4.15.3)
confirmed loaded before the run.

**66/66 fixtures pass across all 10 sections.**

| # | Section | Fixtures | Result |
|---|---|---|---|
| 1 | humanizeTemplateError | 7 | 7/7 PASS |
| 2 | safeAttrHtml — href/attr token pre-processing | 9 | 9/9 PASS |
| 3 | clearPromoFields | 1 | 1/1 PASS |
| 4 | validatePromoFields | 8 | 8/8 PASS |
| 5 | serializePromoCard | 6 | 6/6 PASS |
| 6 | humanizePromoError | 3 | 3/3 PASS |
| 7 | Script-not-truncated guard (TASK-020) | 3 | 3/3 PASS |
| 8 | Dark-mode — Gmail (TASK-021) | 9 | 9/9 PASS |
| 9 | Dark-mode — Outlook OWA contrast repair (TASK-022) | 13 | 13/13 PASS |
| 10 | Dark-mode — Apple Mail + drift guard (TASK-023) | 7 | 7/7 PASS |

Console: zero errors, zero warnings, zero pageerrors, zero unhandled
rejections. One benign requestfailed on an external SendGrid CDN banner image
(cdn.mcauto-images-production.sendgrid.net/.../1875x469.png, net::ERR_ABORTED)
— a hardcoded production asset in template sample data, unrelated to sprint
code, asserted on by no fixture, present at base SHA too.

### Pass 2 — UI-driven E2E (the gap Pass 1 did not cover)

Pass 1 calls transform functions directly. Pass 2 drove the real UI — clicks,
reloads, clipboard, localStorage — because that is where the cross-task seams
actually live. Zero console events in every scenario.

**A. Copied-HTML byte identity — PASS.** Stubbed `navigator.clipboard.writeText`
in page context and clicked the real Copy HTML button (after filling required
fields; the default page state fails copy validation by design). Captured 5
dark states (off / on+Gmail / on+Outlook / on+AppleMail / toggled-on-then-off)
x 2 test-data states = 10 payloads. All 5 byte-identical within test-data-OFF
(12,912 chars each), all 5 byte-identical within test-data-ON, and OFF-baseline
== ON-baseline. Each clipboard string equals its View HTML modal string.
Artifact grep across all 10 captures: EB-DARKSIM, prefers-color-scheme,
color-scheme, data-eb-dark all absent.

**B. Toggle coexistence / DOM order — PASS.** Observed `.preview-header-left`
order: viewport seg-control -> divider -> Test data toggle (factory-built,
TASK-014) -> divider -> `#darkModeSwitch` -> `#darkClientControl`. Exactly one
of each (testDataToggleCount: 1, darkModeSwitchCount: 1) — no orphan
pre-TASK-014 markup. Client picker is `hidden` (not `disabled`) when dark mode
is off. An 11-step interleaved click sequence produced no console events and no
stuck state.

**C. Persistence — PASS.** Dark mode does not persist (ON+Outlook -> reload ->
OFF, localStorage dump `{}`, zero /darkmode/i keys). Test-data persists under
the new key (`emailBuilder.module.testData === 'true'` across reload).
Migration verified both directions via addInitScript seeding: legacy 'true' and
'false' each populate the new key correctly and render the right toggle state.

**D. All 8 templates — PASS.** postmanLaw, nationalDisabilityCenter,
kellerPostman, kellerPostmanLead, wettermarkKeith, nationalJusticeCenter,
parrishDevaughn, kechesLead. Each: renders, no console error, Copy HTML
validates and succeeds, then re-checked with dark mode ON + Outlook. No MJML
error banner, no non-empty `#copyError`, global console bucket `[]`.

**E. darkModeError clearing (TASK-022) — NOT BLACK-BOX VERIFIABLE.** See
Coverage gaps below. Not a failure.

## Cross-task seam review (manual, on the combined diff)

- **TASK-014 x TASK-021 mount order** — deterministic, not incidental.
  index.html:3413 appends the factory toggle, then :3422
  `insertAdjacentHTML('beforeend', ...)` adds the dark controls. TASK-021
  carries an explicit comment explaining it is runtime-inserted *because*
  TASK-014 appends at runtime; static markup would render first. Correct
  reasoning.
- **No collision with the other factory toggles.** ctaToggle (:3536) and
  promoToggle (:3545) mount to `.seg-cta .seg-head` / `.seg-promo .seg-head`,
  not `.preview-header-left`. previewStage is declared :3392, before its use at
  :3440. No TDZ hazard.
- **Migration is idempotent — the leftover legacy key is harmless.** The E2E
  found `emailBuilder.testDataEnabled` is never removed. This is safe only
  because the migration is guarded on the *new* key being absent
  (index.html:3402: `if (localStorage.getItem('emailBuilder.module.testData')
  === null)`). Had it been guarded on the legacy key's presence instead, every
  reload would clobber the user's current preference back to the legacy value.
  Explicitly checked; the guard is on the correct side.
- **Key namespace is clean.** `emailBuilder.testData` (:1723, the test-data JSON
  body) is a distinct key from `emailBuilder.module.testData` (the toggle).
  Near-miss names, no actual collision. No `emailBuilder.darkMode*` key exists
  anywhere.
- **TASK-023 -> TASK-022 reuse is correct.** appleMailDarkTransform's
  'meta-only' branch calls `remapInlineColors(html)` (TASK-022's primitive)
  rather than duplicating it; the unreachable 'authored' branch routes to the
  same fallback so it cannot throw. detectAuthorDarkScheme's branch order is
  load-bearing (prefers-color-scheme contains color-scheme as a substring) and
  is correctly ordered with a comment saying so.
- **Static invariants** — `</script>` count exactly 3 (also 3 at base SHA);
  DARK_TRANSFORM_STUB count 0; `.switch` CSS rules 0 (7 blocks at base, cleanly
  removed by TASK-014).
- **Srcdoc chain matches the CHANGELOG claim verbatim** (index.html:3345):
  `withPreviewLinkHandler(applyDarkMode(applyTestData(result.html)))`, with
  `lastHtml = result.html` assigned *before* it. The documented ordering
  rationale (after substitution, before the link-handler script) is accurate.
- **TASK-024 doc claims hold.** Non-persistence, byte-identical copy output,
  Apple Mail "renders unchanged", Sections 8-10, and the renumbered README
  steps 10-13 all match observed behavior. No contradiction found.

## Regressions

**None.** No failure of any kind was observed in either pass, so there was
nothing to classify as regression vs pre-existing. Nothing appended to the
human-review queue.

## Notes for the compounder (not regressions)

1. **FIND-SPRINT-007-5 is already closed.** The darkModeError stale-warning bug
   raised during TASK-021 verification was fixed in-sprint by TASK-022
   (2ed723f); the findings file already carries `status: resolved` /
   `resolved_by: TASK-022`. It should not be actioned again as open work.
2. **Coverage gap — applyDarkMode's error state machine has no fixture.**
   darkModeError appears at index.html:1760, 3261, 3263, 3266, 3271, 3360 and
   no harness fixture asserts any of it. Sections 8-10 test the pure
   transforms, not the error lifecycle. The E2E could not provoke it either:
   the app is a single module script, so top-level bindings
   (DARK_MODE_TRANSFORMS, darkModeEnabled, lastHtml) are module-private and
   unreachable from page.evaluate() — external fault injection is structurally
   impossible without editing index.html. TASK-022's fix is therefore verified
   by source inspection only (both early returns do set darkModeError to the
   empty string, and the code is trivially correct). Integrated behavior is
   *better* than what was originally reported, not worse, so this is logged as
   a testability observation rather than a regression.
