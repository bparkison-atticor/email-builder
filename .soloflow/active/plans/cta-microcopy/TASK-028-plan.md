---
id: TASK-028
idea: IDEA-006
status: approved
created: 2026-08-11T00:00:00Z
files_owned:
  - README.md
  - CHANGELOG.md
  - ARCHITECTURE.md
  - CODE-PATTERNS.md
files_readonly:
  - index.html
  - .soloflow/active/ideas/IDEA-006.md
acceptance_criteria:
  - criterion: "Every README statement that italics is unsupported or stripped is corrected."
    verification: "grep -n -i 'italic' README.md: line 26's editor summary lists italics among the supported formats; line 45's paste-sanitisation bullet no longer names italic as stripped and its whitelist reads `bold`, `italic`, `link`, `list`; line 130's Scope 'In:' clause lists italics. No remaining sentence claims italics is stripped or unsupported."
  - criterion: "The numbered workflow includes an optional microcopy step positioned with the CTA steps, and the list renumbers cleanly."
    verification: "grep -n -i 'microcopy' README.md returns a numbered step immediately after the CTA destination step (currently step 6). The list runs 1..13 with no duplicate or skipped number."
  - criterion: "README has a dedicated microcopy section covering the five things a marketer cannot infer from the UI."
    verification: "The section states, each explicitly: (a) the field is part of the CTA module — switching the CTA off hides it and removes it from the output, and what was typed is preserved; (b) the toolbar is bold / italics / link with no lists, deliberately; (c) links inside microcopy stay muted grey instead of taking the brand colour, unlike body-copy links; (d) a leading `*` or `—` stays literal here, unlike body copy where it becomes a bullet; (e) the character hint is guidance with no hard limit, and the content does not survive a reload."
  - criterion: "The Templates schema section documents both new brand keys and their shared defaults."
    verification: "grep -n 'ctaMicrocopy' README.md returns two bullets in the Templates list — `ctaMicrocopyFontSize` and `ctaMicrocopyColor` — naming DEFAULT_CTA_MICROCOPY_FONT_SIZE / DEFAULT_CTA_MICROCOPY_COLOR and their values (13px, #6b6b6b), in the same style as the existing `unsubscribeHtml` bullet."
  - criterion: "The Output format section records the microcopy block's rendered properties."
    verification: "grep -n -i 'microcopy' README.md returns a bullet under '## Output format' stating 13px #6b6b6b, that it renders directly under the CTA button, that links inside it stay muted, and that the button's bottom padding tightens when microcopy is present."
  - criterion: "ARCHITECTURE.md no longer says there are two Quill instances."
    verification: "grep -n -i 'two Quill\\|both body copy fields' ARCHITECTURE.md returns 0 matches. grep -n 'ctaMicrocopyQuill' ARCHITECTURE.md returns matches at the three updated locations (currently lines 25, 35, 43), each now describing three instances."
  - criterion: "CODE-PATTERNS.md's `richTextToMjText` entry documents the third `opts` argument, and `buildMicrocopyBlock` is documented as the canonical override caller."
    verification: "grep -n 'opts\\|buildMicrocopyBlock' CODE-PATTERNS.md returns: an updated `richTextToMjText` entry naming all six option fields (fontSize, color, linkColor, padding, blockMargin, convertTypedBullets) and stating that omitting opts reproduces body-copy output byte-for-byte; and a `buildMicrocopyBlock` entry under Shared Utilities."
  - criterion: "CHANGELOG has a new dated top entry describing the feature in this file's established format."
    verification: "The topmost entry is a `## {date} — …` heading naming CTA microcopy, followed by `### Added` and `### Changed` sections. The previous topmost entry (`## 2026-08-11 — Keller Postman lead outreach wordmark size`) is unmodified and now second. git diff shows only insertions at the top of the file."
  - criterion: "No source file was modified by this task."
    verification: "git diff --name-only for this task lists exactly README.md, CHANGELOG.md, ARCHITECTURE.md, CODE-PATTERNS.md — index.html is absent."
  - criterion: "The frozen design-handoff snapshot is untouched."
    verification: "git diff --name-only shows no path under `Claude Design Handoff - UI ENH-001/`, even though `reference_current_index.html:597-612` contains the old richToolbar/allowedFormats literals."
depends_on: [TASK-025, TASK-026, TASK-027]
estimated_complexity: low
epic: cta-microcopy
test_strategy:
  needed: false
  justification: "Prose only; no executable code changes. Verification is the grep set in the acceptance criteria plus a git diff --name-only check. Adding harness fixtures for documentation text would be noise, matching the precedent set by TASK-024."
---

# Document CTA microcopy and italics across README, CHANGELOG, ARCHITECTURE, and CODE-PATTERNS

## Objective

Close the epic by correcting every prose statement this epic falsified and documenting the parts a marketer cannot infer. Three README passages currently assert that italics is stripped on paste (`README.md:26`, `:45`, `:130`); three ARCHITECTURE.md passages assert there are two Quill instances (`:25`, `:35`, `:43`); CODE-PATTERNS.md's `richTextToMjText` entry describes a two-argument function. Beyond the corrections, microcopy has four behaviours that differ from the body editors and are invisible in the UI: no lists, muted links instead of brand-accent links, no typed-bullet conversion, and membership in the CTA module. Undocumented, each of those reads as a bug the first time a marketer hits it.

## Implementation Steps

1. **README — italics corrections.** Line 26: change the body-editor summary to list **bold**, *italics*, bullet/numbered lists, and hyperlinks. Line 45: rewrite the paste-sanitisation bullet so the whitelist reads `` `bold`, `italic`, `link`, `list` `` and italic is no longer listed among the stripped formats (colours, headers, images, base64 data URLs remain). Line 130 (Scope "In:"): change `(bold / lists / links)` to `(bold / italics / lists / links)` and add optional CTA microcopy to the same clause.
2. **README — workflow step.** Insert a new step immediately after the current step 6 (CTA destination), before the current step 7 (optional body below CTA): *"Optional: add CTA microcopy — a short supporting sentence rendered as small, muted text directly under the button."* Renumber the remainder of the list (it currently runs to 12; it will run to 13).
3. **README — dedicated section.** Add `### CTA microcopy` immediately after the `### Body copy editor notes` section (currently ending line 45), covering, in this order:
   - What it is: an optional sentence or two under the CTA button — a reassurance line or a fine-print caveat. Empty renders nothing at all.
   - It belongs to the CTA module. Switching the **Call to action** toggle off hides the field and removes the microcopy from the output along with the button; what was typed comes back when the toggle goes back on.
   - Toolbar is bold, italics, and link — no lists, on purpose. This is one or two sentences.
   - Links inside microcopy stay the same muted grey as the surrounding text, unlike body-copy links which take the brand colour. Auto-linked phone numbers are muted here too.
   - A leading `*` or `—` stays literal in microcopy. In body copy it becomes a bullet — that conversion is deliberately off here so `* Restrictions apply.` renders as fine print rather than a one-item list.
   - The character hint is guidance only; there is no limit, and nothing is blocked or truncated.
   - Content does not survive a reload, same as every other copy field.
   - Keep it roughly the length of the `### Test data panel` section. Do not restate style values here — they belong in the Templates and Output format sections.
4. **README — Templates schema.** In the bullet list at lines 103-110, after `ctaTextColor`, add: `ctaMicrocopyFontSize` — size of the optional microcopy under the CTA button; every brand ships `DEFAULT_CTA_MICROCOPY_FONT_SIZE` (`13px`); and `ctaMicrocopyColor` — its colour; every brand ships `DEFAULT_CTA_MICROCOPY_COLOR` (`#6b6b6b`). Note that the two keys exist as per-brand override slots even though all brands currently resolve to the shared default. **Optional adjacent fix:** the section opener ("Three brands are configured…", line 101) and workflow step 1 ("Postman Law / NDC / Wettermark Keith", line 24) are already stale — eight brands ship. Correcting them is optional; if you do, note it in the done report.
5. **README — Output format.** Add a bullet under `## Output format` (lines 118-126): CTA microcopy renders as a 13px `#6b6b6b` block directly beneath the button, with links inside it muted rather than brand-coloured, and the button's bottom padding tightening from 18px to 6px when microcopy is present so the caption reads as attached to the button.
6. **ARCHITECTURE.md.** Line 25: three `Quill` instances — `bodyAboveQuill`, `bodyBelowQuill`, `ctaMicrocopyQuill` (the last inside the CTA module, bold/italics/link only). Line 35: "rich text editor for both body copy fields" → "for the two body copy fields and the CTA microcopy field". Line 43: "Two Quill editor instances (body above / below CTA)" → "Three Quill editor instances (body above / below CTA, CTA microcopy)". Do not renumber or restructure anything else; line 24's "Three brands ship" staleness is out of scope for this task.
7. **CODE-PATTERNS.md.** Update the `richTextToMjText` entry (lines 21-25): signature is now `richTextToMjText(html, tpl, opts = {})`; name all six option fields (`fontSize`, `color`, `linkColor`, `padding`, `blockMargin`, `convertTypedBullets`); state that omitting `opts` reproduces body-copy output byte-for-byte and that the harness section `richTextToMjText — default parity + style overrides` is the gate protecting that property. Add a `buildMicrocopyBlock` entry under Shared Utilities: pure, returns `''` for an empty editor, otherwise a muted `mj-text` styled from the active brand's `ctaMicrocopy*` keys, with a gotcha noting that it passes `convertTypedBullets: false` so fine-print asterisks are not converted to bullets. Leave existing `~line NNN` references alone — they are already stale throughout the file and refreshing them is a separate concern.
8. **CHANGELOG.** Add a new dated entry at the very top, above `## 2026-08-11 — Keller Postman lead outreach wordmark size`, following the established `## {date} — {title}` + `### Added` / `### Changed` structure and the file's level of detail. Cover: the microcopy field and its markup position inside `#ctaBody`; italics added to `richToolbar`/`allowedFormats` and the `em`/`i` inline-style normalisation; the `opts` parameter on `richTextToMjText` and the explicit byte-parity guarantee for the two body call sites; the `ctaMicrocopyFontSize`/`ctaMicrocopyColor` keys on all eight brands plus the shared defaults; muted links including auto-linked phones; the suppressed typed-bullet converter and why; the conditional `mj-button` padding; and the three new harness sections. Do not edit any existing entry.
9. **Verify.** Run every grep in the acceptance criteria, then `git diff --name-only` and confirm exactly four files and nothing under `Claude Design Handoff - UI ENH-001/`.

## Acceptance Criteria

See frontmatter. The load-bearing ones are the italics corrections (README currently tells marketers the opposite of what the app now does) and the microcopy section's four difference-from-body-copy disclosures — those are the behaviours a marketer would otherwise file as bugs.

## Test Strategy

None. Prose only, no executable code. Verification is the acceptance-criteria grep set plus `git diff --name-only`.

## Hardest Decision

Whether the typed-bullet asymmetry (a leading `*` becomes a bullet in body copy but stays literal in microcopy) belongs in the marketer's README at all, given it reads as an implementation detail. It stays in, because it is the one behaviour where the two rich-text fields visibly disagree about identical input — and the fine-print use case (`* Restrictions apply.`) is exactly where a marketer will hit it. Discovering it by accident would look like one of the two fields is broken. One sentence framed as "here it stays literal, in body copy it becomes a bullet" costs nothing and pre-empts a support question.

## Rejected Alternatives

- **Fold these edits into TASK-025 and TASK-027 as they happen.** Rejected: it would put marketer prose in the same review as the parity-critical renderer refactor, and it would force three tasks to share ownership of four prose files. Consolidating here keeps README/CHANGELOG/ARCHITECTURE/CODE-PATTERNS ownership exclusive to one task — the only non-overlapping file ownership available in a single-file app.
- **Updating the frozen design-handoff snapshot's stale literals.** Rejected: `ARCHITECTURE.md:18` marks that directory reference-only, not production code. It is a snapshot of a pre-redesign state and editing it would destroy its value as a reference.
- **Refreshing all the stale `~line NNN` pointers in CODE-PATTERNS.md.** Rejected: they are wrong by hundreds of lines across every entry (`richTextToMjText` says ~894, it is at 1449). Fixing them properly is a separate maintenance pass, and fixing only the entries this epic touched would leave an inconsistent file that looks accurate where it is not.

## Lowest Confidence Area

The length and placement of the `### CTA microcopy` section. Five disclosures is a lot for an optional field, and the section could easily grow past the `### Test data panel` section it should be modelled on. If it runs materially longer, cut the rationale clauses and keep only the observable behaviour — the toggle relationship, the muted links, and the literal asterisk are the three that a marketer will actually trip over; the toolbar composition and non-persistence can each collapse to half a sentence.
