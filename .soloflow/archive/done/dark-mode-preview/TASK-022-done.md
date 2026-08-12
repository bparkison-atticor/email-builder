---
id: TASK-022
sprint: SPRINT-007
epic: dark-mode-preview
status: done
summary: "Outlook.com/OWA contrast-repair dark-mode transform: WCAG/HSL color primitives, selective inline-color remap (light bg darkens, dark bg survives, dark fg lifts with 4.5:1 guard), harness Section 9; also fixed FIND-5 and FIND-8"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-022 — Done Report

## What shipped (commits `2ed723f`, `d931119`, `7bc8bd6`, `dd9a89f`, `1ad2564`)

- WCAG/HSL color primitives with W3C G18 citation: `parseCssColor` (conservative — unrecognized values return null = leave alone), `relLuminance`, `contrastRatio`, `rgbToHsl`/`hslToRgb`, `toHex`, `remapLightness` (Dark Reader-style clamped piecewise remap), `liftForContrast` (monotonic ascent, MAX_ITERATIONS=50 backstop). Color-space split commented: HSL lightness classifies/remaps, WCAG luminance only for the contrast guard.
- `remapDeclarations` + `remapInlineColors`: light backgrounds darken (HSL L ≥ 0.5 → remap), dark backgrounds survive byte-identical (the feature's point — exposes dark brand colors against newly-darkened surroundings); dark foregrounds lift and clear 4.5:1 vs `OUTLOOK_DARK_SURFACE #1b1b1b`; light foregrounds survive. Double-quote-only style regex (apostrophe safety), both-quote bgcolor regex, function replacers throughout.
- `outlookDarkTransform` = `injectPreviewStyle(remapInlineColors(html), /* EB-DARKSIM outlook */ canvas rule)`. Exactly 1 `DARK_TRANSFORM_STUB` remains (appleMailDarkTransform, removed by TASK-023).
- Deferred findings fixed: FIND-SPRINT-007-5 (`darkModeError` now cleared on all `applyDarkMode` paths — fault-injection verified) and FIND-SPRINT-007-8 (`injectPreviewStyle` neutralizes `</style` case-insensitively + Section 8 fixture).
- Harness Section 9 (13 fixtures). Total harness now 59 rows, all passing in real Chromium.

## Notable deviation (verified + documented)

Plan's fixture 9 color `#767676` can never trip the contrast guard: `remapLightness` maps all L<0.5 inputs into [0.70, 0.90], and grayscale crossover vs #1b1b1b is ≈L 0.51 (min post-remap grayscale ratio 8.19). The guard only fires for saturated blues (h≈240–250°, L≈0.45–0.49). Substituted `#0000ee` (pre-lift 4.323 → post-lift 4.812, one iteration). Executor derivation independently reproduced by the verifier from a clean-room reimplementation. Logged + resolved as FIND-SPRINT-007-10; explained inline in the fixture description.

## Pipeline results

- Executor: COMPLETED first pass (no browser available; verified via Node extraction of committed functions).
- Verifier: APPROVED — closed the browser gap: 59/59 harness rows in headless Chromium, all 8 templates survive transform without markup corruption (hrefs/srcs/font stacks byte-identical), kellerPostmanLead manual smoke shows the intended navy-CTA-low-contrast artifact, fault-injection confirms FIND-5 fix, purity/no-persistence/3-`</script>` gates intact.
- Code review: CLEAN — color math re-run independently under Node, matches published WCAG values exactly; edge cases fail conservatively; 3 latent items queued (FIND-11 regex anchor comment overstatement, FIND-12 duplicated #1b1b1b constant, FIND-13 dead 'bgcolor' array member) targeted at TASK-024.
- Test writer: NO_TESTS_NEEDED — all 6 targets covered by shipped fixtures.

## Notes for downstream tasks

- TASK-023: implement `appleMailDarkTransform`; assert zero `DARK_TRANSFORM_STUB` remain.
- TASK-024: natural home for FIND-7 (vacuous purity fixture), FIND-9 (4th copy of predicate loop coming — extract), FIND-11/12/13.
- Verifier note: the TASK-020 human-review-queue testing item's checks (app renders, promo toggle interactive, Section 7 3/3 PASS) were all incidentally confirmed during TASK-022 verification.
