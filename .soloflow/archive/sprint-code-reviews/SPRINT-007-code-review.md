---
sprint: SPRINT-007
findings_count:
  critical: 0
  important: 3
  minor: 2
---

# Sprint Code Review: SPRINT-007

## Scope
- Base: 553b6d2b1301fba1c6c4b29220d46fdd965be97f
- Tasks reviewed: [TASK-014, TASK-021, TASK-022, TASK-023, TASK-024]
- Files changed: 3 source/doc files (index.html +860/-27, README.md, CHANGELOG.md); 10 further paths under `.soloflow/` are state, not reviewed as code
- Cross-task hotspots: [index.html]

`index.html` is the only hotspot and the only true one possible in a single-file
app: 4 of 5 tasks touched it across 8 commits. README.md and CHANGELOG.md were
each touched by TASK-024 alone. Review concentrated on the three seams per-task
review could not see — TASK-014's toggle consolidation against TASK-021's new
control, the `.preview-header-left` container shared by TASK-014 and TASK-021,
and the three dark-mode transforms (TASK-021/022/023) read as one set.

## Findings queued
5 findings appended to `.soloflow/active/findings/SPRINT-007-findings.md` for the
next `/sf:compound` run. Severity breakdown: critical=0, important=3, minor=2.
File now holds 27 findings, 24 open.

### Important
- FIND-SPRINT-007-23 — Sprint re-introduces the hand-rolled switch TASK-014 deleted; net switch consolidation is zero, blocked only by `createModuleToggle`'s unconditional localStorage persistence.
- FIND-SPRINT-007-24 — ARCHITECTURE.md:26 claims the preview iframe is sandboxed; it has no `sandbox` attribute, and this sprint's own `injectPreviewStyle` comment reasons from the opposite (correct) premise.
- FIND-SPRINT-007-25 — CLAUDE.md's binding "humanize library errors" convention is violated by `render()`'s catch (raw `mjml2html` `e.message` into the preview), ten lines from the new `applyDarkMode` catch that cites and honors it.

### Minor
- FIND-SPRINT-007-26 — `.preview-header-left` assembled from three insertion sites across two tasks; header order is implicit in script execution order and undocumented at the markup.
- FIND-SPRINT-007-27 — `EB-DARKSIM` is relied on as a cross-transform invariant by the purity guard but is not a contract; `appleMailDarkTransform`'s meta-only branch mutates without marking.

## Notes
- No Critical findings. Security sweep across the aggregate diff found no new
  external surface (no routes, network calls, or credentials introduced), no
  cross-task validation gap, and no injection path in the new transforms:
  `remapInlineColors` emits only `#` + 6 hex chars via `toHex`, uses function
  replacers throughout, and `[^"]*` cannot cross an attribute boundary.
- Aggregate efficiency was measured, not assumed, and cleared: the composed
  hot path (`render()` -> `applyTestData` -> `applyDarkMode`) adds
  `remapInlineColors` to every debounced keystroke render when Outlook is
  selected, but it runs in 0.86ms on a 48KB compiled document (1.93ms at
  128KB), negligible against `mjml2html` + Handlebars compile. No finding filed.
- FIND-SPRINT-007-9's predicted compounding did land: the harness row-render
  loop is now duplicated 4x (Sections 7/8/9/10) rather than the 2x it was filed
  against, and the section-header `cssText` literal is repeated 10x (3 added
  this sprint, 7 pre-existing). Not re-filed — already queued.
