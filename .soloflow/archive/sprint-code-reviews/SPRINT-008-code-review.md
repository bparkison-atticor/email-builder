---
sprint: SPRINT-008
findings_count:
  critical: 0
  important: 3
  minor: 3
---

# Sprint Code Review: SPRINT-008

## Scope
- Base: c3159f19f170df4ea2fcb797f6d574fd361ceb2b
- Tasks reviewed: [TASK-025, TASK-026, TASK-027, TASK-028]
- Files changed: 5 production/doc files (index.html +519/-21, README.md, CHANGELOG.md, ARCHITECTURE.md, CODE-PATTERNS.md) plus 9 .soloflow/ state files
- Cross-task hotspots: [index.html (12 commits, all four tasks), README.md (3 commits), CODE-PATTERNS.md (2 commits), CHANGELOG.md (2 commits), ARCHITECTURE.md (2 commits)]

## Findings queued
6 findings appended to `.soloflow/active/findings/SPRINT-008-findings.md` for the next `/sf:compound` run. Severity breakdown: critical=0, important=3, minor=3. File now holds 30 entries, pending_count 28.

### Important
- FIND-SPRINT-008-25 — Harness row-render loops measurably diverged inside a single sprint; extends FIND-SPRINT-008-4 with cross-task evidence (72% of the sprint's index.html growth landed in `renderTestHarness`, now 24% of the file).
- FIND-SPRINT-008-26 — The FIND-SPRINT-008-15 DOM guard invokes the real link handler and leaves keyboard focus inside the CTA microcopy editor behind the harness overlay, restoring none of the UI state it mutates.
- FIND-SPRINT-008-27 — `CODE-PATTERNS.md`'s "strips unsafe tags" claim for `richTextToMjText` is false and was re-affirmed by the sprint's own docs task; the real sanitisation boundary is Quill's per-instance `formats` whitelist.

### Minor
- FIND-SPRINT-008-28 — The `html: null` config-assertion shape FIND-SPRINT-008-3 asked TASK-025 to retire was copied into Section 13 one task later, minus Section 11's `'(none — config assertion)'` fallback.
- FIND-SPRINT-008-29 — The em-dash typed-bullet claim survives at five index.html sites while the three docs files were corrected; completes FIND-SPRINT-008-21's site list.
- FIND-SPRINT-008-30 — Microcopy brand defaults are implemented twice (eight config entries plus `|| DEFAULT_…` fallbacks); the fallback branch has no harness coverage.

## Notes
- Convention check: scoped `CLAUDE.md` files — only the root `CLAUDE.md` applies (no directory-scoped files). Its one binding convention (humanized library errors) is intact; the microcopy field widens the mis-attributed "Body copy:" prefix, already recorded as FIND-SPRINT-008-18. No collective drift from a documented pattern.
- Cross-cutting state sweep (store-action analogue): every enumeration of Quill instances was updated for the third editor — `[bodyAboveQuill, bodyBelowQuill, ctaMicrocopyQuill]` toolbar-override loop, `text-change` wiring, `buildMjml` emission. `clearPromoFields` and the invalid-field highlighting correctly do not touch microcopy (optional field). The one unrestored state mutation found is FIND-SPRINT-008-26.
- Aggregate security posture: no new external surface — no new routes, webhooks, CDN dependencies, secrets, or PII paths. The third editor inherits the same `formats` whitelist mechanism as the two body editors (`microcopyFormats` correctly omits `list`) and the same globally-registered `PassthroughLink`, so the open link-scheme gap (FIND-SPRINT-008-2) now has three input sources rather than two; recorded there, not duplicated. The only new security-relevant item is the documented-vs-actual sanitisation boundary (FIND-SPRINT-008-27).
