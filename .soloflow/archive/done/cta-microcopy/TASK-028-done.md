---
id: TASK-028
sprint: SPRINT-008
epic: cta-microcopy
status: done
summary: "Propagated the cta-microcopy epic into README, CHANGELOG, ARCHITECTURE, and CODE-PATTERNS — corrected italics-stripped and two-Quill claims, documented the microcopy field's five UI-invisible behaviours, the opts parameter, and both brand keys"
executor_loops: 1
code_review_rounds: 1
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-028 Done Report

## What shipped

- README.md: three italics-stripped claims corrected; optional microcopy workflow step inserted (list renumbered 1..14 — the plan's 1..13 was stale, TASK-024 had added a step; FIND-SPRINT-008-20); `### CTA microcopy` section with the five disclosures; `ctaMicrocopyFontSize`/`ctaMicrocopyColor` Templates bullets; Output-format bullet (13px #6b6b6b under the button, muted links, 18px→6px padding). Templates opener and workflow step 1 rewritten count-free ("the `templates` map's keys are the authoritative brand list") after code review flagged the initial eight-brand enumeration as a rot vector contradicting ARCHITECTURE.md and defusing TASK-032's AC2.
- ARCHITECTURE.md: "two Quill instances" corrected in all three locations, naming `ctaMicrocopyQuill`.
- CODE-PATTERNS.md: `richTextToMjText` entry updated (opts signature, six fields, byte-parity guarantee naming the Section 12 gate); `buildMicrocopyBlock` entry added under Shared Utilities.
- CHANGELOG.md: new top entry `## 2026-08-12 — CTA microcopy + rich-text italics` (insertion-only; prior entry byte-unmodified).
- Accuracy constraints honored: no doc claims auto-linked phones are "unstyled" (FIND-SPRINT-008-5) or asserts target-attribute behaviour on phone links (FIND-SPRINT-008-12); em-dash bullet-conversion falsehood caught by the verifier and fixed (BULLET_PREFIX has en dash, not em dash).

## Commits

- `6946e1d` docs(TASK-028): correct README italics claims and document CTA microcopy
- `cac5516` docs(TASK-028): correct ARCHITECTURE.md's two-Quill-instance claim
- `20a73ff` docs(TASK-028): document richTextToMjText's opts param and buildMicrocopyBlock
- `901677d` docs(TASK-028): add CHANGELOG entry closing the cta-microcopy epic
- `1c360be` docs(TASK-028): name ctaMicrocopyQuill literally in the two remaining ARCHITECTURE.md spots
- `fb200b1` docs(TASK-028): fix five prose inaccuracies flagged by shadow-verifier
- `9e8fbe9` docs(TASK-028): drop hard-coded brand count/list from README, add minor polish

## Pipeline history

- Verifier round 1: NEEDS_CHANGES — em-dash claim false in 3 files (BULLET_PREFIX contains U+2013 not U+2014), "tighter padding" inverted, emission-order claim inverted. Fixed in fb200b1.
- Verifier round 2: APPROVED (codepoint-level re-checks).
- Code review round 1: IMPROVEMENTS_NEEDED — hard-coded brand count/list reinstalled a proven rot vector in two README locations. Fixed in 9e8fbe9.
- Verifier round 3: APPROVED — new prose verified at the dropdown-population site; FIND-SPRINT-008-24 filed (TASK-032 plan now partially pre-satisfied — stale-plan hazard for next sprint).
- Code review round 2: CLEAN (0/0/0).
- Test-writer: NO_TESTS_NEEDED — plan test_strategy.needed: false (prose only; harness fixtures for documentation would be noise, TASK-024 precedent). No test-writer spawn was warranted.

## Findings

New this task: FIND-SPRINT-008-20 (plan AC step-count drift), -21 (BULLET_PREFIX en/em-dash asymmetry in index.html), -22 (plan AC named wrong prior CHANGELOG entry), -23 (plan AC carried the em-dash error), -24 (TASK-032 plan staleness after 9e8fbe9).

## Scope

Exactly the four owned files (README.md +29/−12, CHANGELOG.md +17/−0, CODE-PATTERNS.md +11/−2, ARCHITECTURE.md +3/−3). index.html byte-identical; design-handoff folder untouched.
