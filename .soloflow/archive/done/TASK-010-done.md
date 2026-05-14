---
id: TASK-010
sprint: SPRINT-004
epic: null
status: done
summary: "Convert bullet-prefixed paragraphs (•, -, –, *) into semantic <ul><li> blocks in richTextToMjText so they pick up the existing 24px list indent."
executor_loops: 0
code_review_rounds: 0
visual_mobile: skipped_user_preference
visual_web: skipped_user_preference
---

# TASK-010 — Convert bullet-prefixed paragraphs to `<ul><li>` in `richTextToMjText`

## What changed

Inserted a 43-line block at `index.html:1372–1413` inside `richTextToMjText`, between the Quill list conversion (ends line 1370) and `autoLinkPhones(div)` (line 1417). The block:

- Defines `BULLET_PREFIX = /^[•\-–*]\s+/` — broad prefix set with mandatory whitespace guard.
- Snapshots `div.children`, walks them to identify consecutive `<p>` elements whose `textContent.trimStart()` matches the prefix, grouped as half-open `[start, end)` runs.
- Iterates runs in reverse and, for each run, builds a `<ul>` with one `<li>` per source `<p>`, stripping the bullet prefix from the first leading text node (or the paragraph's `innerHTML` if the first child is an element).
- Inserts each new `<ul>` before the run's first source node, then removes the source `<p>` elements.

No new CSS was added — the existing `ul/ol` styling pass at `index.html:1442` (`margin:0 0 14px 0;padding-left:24px;`) and the `li` pass at `index.html:1446` (`margin:0 0 6px 0;`) apply automatically to the new elements.

## Verification

- **Verifier verdict:** APPROVED. Traced all 9 acceptance criteria from the plan against the implemented code; logical traces for two-run separation, inline `<strong>` preservation, Quill-toolbar-list non-interference, phone autolink inside bullets, both call sites, last-block margin zeroing on trailing `<ul>`, and HUMANIZE_FIXTURES isolation all passed.
- **Code review verdict:** CLEAN. No critical/important/minor findings. Reuse vs. the Quill list conversion block was considered and rejected (different parent, different group predicate, different output shape — abstraction cost exceeds savings for two call sites).
- **Tests:** NO_TEST_INFRA — repo has no test runner, no `package.json`, no test files.
- **Visual:** skipped_user_preference (project's `verification.visual_web` and `visual_mobile` are both `false`).

## Decisions captured

- Approach A (semantic conversion) over Approach B (padding-only). User choice in IDEA-002.
- Broad prefix set (`•`, `-`, `–`, `*`) with `\s+` whitespace guard. User choice; the whitespace guard mitigates the false-positive risk the user accepted.
- 24px indent — reuses existing `ul/ol` styling pass; no new CSS rule introduced.
- Insertion ordering: after Quill list conversion (preserves toolbar lists), before `autoLinkPhones` (phones in bullets get autolinked), before `<p>` margin pass (converted `<p>` no longer exists as `<p>`), before `<ul>`/`<li>` styling passes (applied to new elements), before last-block margin zeroing (handles trailing `<ul>` correctly via existing `['P','UL','OL']` check).
