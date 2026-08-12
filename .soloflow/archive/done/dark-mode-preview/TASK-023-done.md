---
id: TASK-023
sprint: SPRINT-007
epic: dark-mode-preview
status: done
summary: "Apple Mail CSS-respecting dark-mode simulation (strict identity pass-through + meta-only partial-invert fallback + author-CSS drift guard); last DARK_TRANSFORM_STUB removed — all three picker options ship"
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-023 — Done Report

## What shipped (commits `4b1556f`, `941bbec`)

- `detectAuthorDarkScheme(html)` → `'authored'` / `'meta-only'` / `'none'`, with `prefers-color-scheme` checked first (substring-ordering trap commented).
- `appleMailDarkTransform`: `'none'` → strict identity (no marker injection, intentional and commented); `'meta-only'` → `remapInlineColors(html)` (reuses TASK-022's partial invert — Apple's documented fallback); `'authored'` → same + TODO (unreachable today, drift-guarded).
- Release gate met: zero `DARK_TRANSFORM_STUB` matches — all three dark-mode picker options genuinely implemented ("ship together" scope decision honored).
- Apple Mail button tooltip discloses surface + behavior: "Apple Mail (macOS 12.4+ / iOS 13+) — respects author dark-mode CSS; this email has none, so it renders unchanged".
- Harness Section 10 (7 fixtures incl. the drift guard asserting `detectAuthorDarkScheme(lastHtml) === 'none'` with remediation text). Total harness: 66 rows, all passing.

## Pipeline results

- Executor: COMPLETED first pass.
- Verifier: APPROVED — mutation-tested (identity mutation, meta-only mutation, and two independent buildMjml dark-CSS mutations each fail exactly the right fixture); Apple Mail srcdoc byte-identical (SHA-256 match) to dark-off srcdoc; View HTML identical across all four states; detector survived 18 adversarial inputs; drift guard green across all 8 templates + promo card.
- Code review: CLEAN — 0 critical / 0 important; 4 latent/documentation findings queued (FIND-16..19).
- Test writer: NO_TESTS_NEEDED — all 4 targets covered by shipped fixtures.

## Findings queued this task (all routed to TASK-024 / human review)

- FIND-SPRINT-007-14 (high): ordering-trap fixture is order-insensitive — stronger fixture input specified in the finding.
- FIND-SPRINT-007-15 (high, bug): darkened stage chrome (the Apple Mail no-op's entire visual signal) is fully occluded by the 100%-width iframe at desktop viewport; visible only in mobile viewport. Locked scope decision premised on chrome being visible — human-review candidate.
- FIND-SPRINT-007-16 (medium): detector's CSS-property branch has zero fixture coverage and matches ordinary prose ("color-scheme: blue and white" → meta-only).
- FIND-SPRINT-007-17 (low): detector contract comment misassigns the CSS-property-outside-media-query case.
- FIND-SPRINT-007-18 (low): meta-only branch lacks the canvas rule its sibling pairs with remapInlineColors (latent, unreachable).
- FIND-SPRINT-007-19 (low): tooltip-only disclosure is invisible to screen readers/keyboard; with FIND-15, both disclosure halves unavailable at desktop default.

## Notes for TASK-024 (epic finish)

- Treat FIND-14/16/17 as one unit (same ~15 lines of detector + fixtures).
- FIND-15 + FIND-19 stem from the same locked scope decision; the plan's named escalation (one-line muted caption) would resolve both but needs the scope decision reopened — surface to human review.
- FIND-9's predicate-loop duplication now has 4 copies (Sections 7/8/9/10).
