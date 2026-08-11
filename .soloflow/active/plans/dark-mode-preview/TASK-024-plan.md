---
id: TASK-024
idea: IDEA-005
status: approved
created: 2026-08-11T00:00:00Z
files_owned:
  - README.md
  - CHANGELOG.md
files_readonly:
  - index.html
  - .soloflow/active/ideas/IDEA-005.md
  - .soloflow/active/research/IDEA-005-research.md
acceptance_criteria:
  - criterion: "README's numbered workflow includes the dark-mode preview step alongside the existing viewport step."
    verification: "grep -n -i 'dark mode' README.md returns a numbered workflow line adjacent to the existing 'Toggle viewport between Desktop and Mobile' step (currently line 32)."
  - criterion: "README has a dedicated dark-mode section that names the simulated platform surface for each of the three picker options."
    verification: "grep -n -i 'dark' README.md shows a section heading; its body names 'Gmail mobile app' / 'iOS', 'Outlook.com' or 'OWA', and 'Apple Mail'. All three surfaces are stated explicitly — a reader must be able to learn that the Gmail option is not Gmail web."
  - criterion: "README states the two properties a marketer could otherwise get wrong: the preview is an approximation, and the copied HTML is unaffected."
    verification: "grep -n -i 'approxim\\|not pixel\\|copied HTML' README.md returns statements covering both, in the dark-mode section."
  - criterion: "README states that dark-mode state does not persist across reloads, contrasting with the Test data toggle which does."
    verification: "grep -n -i 'persist' README.md returns a dark-mode line stating the toggle and client selection reset on reload; the existing Test data persistence sentence (currently line 52) is unchanged."
  - criterion: "CHANGELOG has a new dated entry describing the feature under an Added heading, matching the file's existing format."
    verification: "The topmost entry in CHANGELOG.md is a '## {date} — …' heading naming the dark-mode preview, followed by an '### Added' section. Existing entries below are unmodified (git diff shows only insertions at the top of the file)."
  - criterion: "No source files were modified by this task."
    verification: "git diff --name-only for this task lists only README.md and CHANGELOG.md."
depends_on: [TASK-021, TASK-022, TASK-023]
estimated_complexity: low
epic: dark-mode-preview
test_strategy:
  needed: false
  justification: "Documentation-only task touching no executable code. The acceptance criteria are greps over the two prose files, which is the appropriate verification for prose; adding harness fixtures for README text would be noise."
---

# Document the dark-mode preview in README and CHANGELOG

## Objective

Close the epic by documenting the dark-mode preview for the marketer who will use it. The README already documents every other preview control — the viewport switcher in the numbered workflow, the Test data panel in its own section — and this feature has one property that is genuinely non-obvious and cannot be inferred from the UI: each picker option simulates a *specific platform surface*, and the Gmail option is deliberately not Gmail web. Undocumented, that decision is invisible and the preview can be misread.

## Implementation Steps

1. **README — numbered workflow.** Immediately after the existing viewport step (currently line 32, *"Toggle viewport between **Desktop** and **Mobile** in the preview header to spot-check responsive layout"*), add a parallel step for the dark-mode switch and client picker. Keep it one line and in the same voice as its neighbors.
2. **README — dedicated section.** Add a `### Dark mode preview` section near the `### Test data panel` section (currently ~line 47), covering, in this order:
   - What it is: a simulation of how three email clients transform the email in dark mode, run entirely in the preview iframe.
   - The surface table — one bullet per option, each naming the exact surface and what the marketer will see:
     - **Gmail** — the Gmail *mobile app* (iOS). Inverts the whole email, then re-inverts images so photos still look right. Gmail on the desktop web leaves the email body alone entirely, which is why the option simulates the app.
     - **Outlook** — Outlook.com / OWA on the web. Repairs contrast selectively instead of inverting everything: light backgrounds go dark, colors that are *already* dark are left alone. Watch for a dark brand color (a navy banner, a dark CTA button) surviving against a newly-darkened background — that is the classic Outlook dark-mode failure.
     - **Apple Mail** — macOS 12.4+ / iOS 13+. Only goes dark if the email itself carries dark-mode CSS. This builder does not emit any, so the email renders **unchanged** while the surrounding app is dark. If that white slab is the problem, the fix is authoring dark-mode CSS, not changing brand colors.
   - The two guardrails: the transforms are **approximations** of undocumented, vendor-changeable behavior — good enough to spot vanishing logos, low-contrast text, and harshly inverted brand colors, not a pixel-exact rendering; and the transform is **preview-only** — the HTML from Copy HTML and View HTML is byte-identical whether dark mode is on or off.
   - Persistence: the switch and the selected client **reset on reload**, unlike the Test data toggle and JSON which persist. State this explicitly so the difference reads as deliberate rather than as a bug.
   - Do not restate implementation details (filter CSS, HSL remap, contrast thresholds) — README is the marketer's document. Those already live in code comments.
3. **CHANGELOG.** Add a new dated entry at the top of the file, above the current topmost entry (`## 2026-08-11 — Keller Postman lead outreach wordmark size`), following the established `## {date} — {title}` + `### Added` structure and the file's level of detail. Cover: the header control (switch + three-option picker, not persisted); the `applyDarkMode` step in the srcdoc chain and the explicit invariant that `lastHtml` is untouched; the three transforms and their chosen surfaces with a one-line rationale each; the darkened `.preview-stage` chrome; and the new harness sections 8-10 including the author-dark-CSS drift guard. Do not edit any existing entry.
4. **Verify.** Run the greps listed in the acceptance criteria, and confirm `git diff --name-only` shows only `README.md` and `CHANGELOG.md`.

## Acceptance Criteria

- Numbered workflow includes a dark-mode step next to the viewport step.
- A dedicated README section names all three simulated surfaces explicitly, including that the Gmail option is the mobile app rather than Gmail web.
- The approximation caveat and the copied-HTML-unaffected guarantee both appear.
- The non-persistence of dark-mode state is stated and contrasted with Test data's persistence.
- CHANGELOG's topmost entry is a new dated `### Added` block for this feature; entries below are untouched.
- Only `README.md` and `CHANGELOG.md` are modified.

## Test Strategy

None. This task changes prose only and executes no code. Verification is the grep set in the acceptance criteria plus a `git diff --name-only` check confirming no source file was touched.

## Hardest Decision

Whether the platform-surface disclosure belongs in the README at all, given the picker buttons already carry `title` tooltips. Tooltips are discoverable only on hover, are invisible on touch devices, and cannot hold the "why" — that Gmail web does nothing, so simulating it would be useless. A marketer who sees three brand names in a picker will reasonably assume "Gmail" means whatever Gmail they personally use. The README section is where that assumption gets corrected, and it is the same place the Test data panel's non-obvious semantics are already explained. The tooltip and the README carry the same disclosure at different depths, which is the correct redundancy.

## Rejected Alternatives

- **Folding these edits into TASK-023.** Rejected: it would put marketer-facing prose in the same review as the epic's subtlest logic (the detector ordering trap and the drift guard), and it would make TASK-023 the only task in the epic owning three files. Splitting keeps `README.md`/`CHANGELOG.md` ownership exclusive to this task — the only non-overlapping file ownership available in a single-file app.
- **Deferring the CHANGELOG entry to sprint close.** Rejected: prior entries in this file are feature-scoped and written at feature depth (see the `UI ENH-001` entry), not sprint-scoped summaries. Writing it while the implementation details are fresh produces a better entry.
- **Documenting the transform algorithms in README.** Rejected: README is the marketer's workflow document. The color math, thresholds, and their sourcing belong in the code comments TASK-021 through TASK-023 place directly above the functions, where a maintainer will actually find them.

## Lowest Confidence Area

The right length for the dark-mode README section. The surface-by-surface explanation is the whole value, and it is also the part most likely to bloat into a dark-mode essay that nobody reads. Target roughly the length of the existing `### Test data panel` section — one framing sentence, three bullets, and a short caveat list. If it runs materially longer than that section, cut the rationale sentences and keep the observable behavior.
