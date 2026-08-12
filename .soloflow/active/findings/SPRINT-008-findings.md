---
sprint: SPRINT-008
pending_count: 4
last_updated: 2026-08-12T18:45:00-04:00
---

# Findings Queue

## FIND-SPRINT-008-1
- **source:** TASK-025 (verifier)
- **type:** improvement
- **severity:** low
- **location:** index.html — every fixture loop in `renderTestHarness()` (grep `for (const fixture of`)
- **status:** open
- **description:** In every harness section, the call to the function under test sits OUTSIDE the per-fixture error handling: the loops read `const actual = fn(fixture.…); const pass = fixture.check(actual);`. Section 11 (TASK-025) wraps `check()` in a try/catch, and sections 1-10 have no try/catch at all — but in neither case is the `fn(...)` call itself guarded. If any function under test ever throws on a fixture input, the exception propagates out of `renderTestHarness()` and the ENTIRE harness silently renders blank or truncated, rather than showing one FAIL row. That is the same failure mode Section 7 ("script-not-truncated regression guard") exists to catch, so the repo already treats "the harness silently stops reporting" as a real risk. This is latent today, not a live bug: TASK-025's config-assertion fixture passes `html: null` into `richTextToMjText`, which only survives because of the `if (!html) return '';` guard at the top of the function (grep `function richTextToMjText`). Anyone who later tightens that guard — or adds a fixture that provokes a throw — blanks the repo's only test surface with no obvious signal.
- **suggested_action:** Move the function-under-test call inside the guarded block, e.g. `let actual, pass; try { actual = fn(...); pass = fixture.check(actual); } catch (e) { actual = 'THREW: ' + e.message; pass = false; }`, so a throwing fixture renders as a single FAIL row with the exception text instead of killing the whole report. Worth doing once across all sections rather than per-task.
- **resolved_by:**

## FIND-SPRINT-008-2
- **source:** TASK-025 (code-reviewer)
- **type:** improvement
- **severity:** medium
- **location:** index.html — `PassthroughLink` (grep `static sanitize(url)`), consumed by the `link` entry in `allowedFormats`; reaches `PREVIEW_LINK_HANDLER` (grep `const PREVIEW_LINK_HANDLER`)
- **status:** open
- **description:** Pre-existing and outside the TASK-025 diff, noted while reviewing the paste whitelist. `PassthroughLink.sanitize(url) { return url; }` disables Quill's link sanitizer entirely so that `{{variable}}` and `tel:` survive — but it also removes the only scheme filter in the pipeline. Nothing downstream re-checks the scheme: `richTextToMjText` only sets `style`/`target` on anchors, MJML passes hrefs through verbatim, and the preview iframe is deliberately **not** sandboxed and same-origin with the app (ARCHITECTURE.md, grep `deliberately **not** sandboxed`). `PREVIEW_LINK_HANDLER` then calls `window.open(href, '_blank', 'noopener')` on any non-`#` href. So a `javascript:` (or `data:`) href pasted from an untrusted source — or typed into the link dialog — travels from paste to `window.open` with no filtering at any hop. Real-world impact is limited (modern Chrome blocks `javascript:` in `window.open`, and email clients strip such hrefs from the exported HTML), so this is hardening rather than a demonstrated exploit — but the absence of any scheme allowlist is not currently written down anywhere, and the widened `allowedFormats` comment now reads as if the whitelist is the sanitisation boundary.
- **suggested_action:** Replace the blanket passthrough with an allowlist in `PassthroughLink.sanitize`: permit `http:`, `https:`, `mailto:`, `tel:`, in-page `#…`, and strings beginning with `{{`/`{{{`; return `'#'` (or fall through to `QuillLink.sanitize`) for anything else. Verify against the existing link-dialog fixtures and the `{{{unsubscribe}}}` harness rows before changing behaviour.
- **resolved_by:**

## FIND-SPRINT-008-3
- **source:** TASK-025 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **location:** index.html — harness Section 11 (grep `Section 11: rich-text italics`), the block comment and the `ITALIC_FIXTURES` config-assertion entry
- **status:** open
- **description:** Three small hygiene items in the new harness section, none of which affect what the fixtures actually assert. (1) The section's block comment says "Fixture 4 (byte-parity) ... its `expected` value was captured from the UNMODIFIED richTextToMjText" — there is no `expected` field on any Section 11 fixture; the captured literal lives inside `check: out => out === '…'`. The name is a leftover from the plan's step-1 scaffolding, and it sends a future maintainer grepping for a field that does not exist. (2) The config-assertion fixture carries `html: null` purely so the shared loop has an argument to pass, which calls `richTextToMjText(null, …)` for no reason and renders an empty "Actual output" row — this is the exact null-guard dependence FIND-SPRINT-008-1 cites as the latent hazard. Sections 8-10 already established a no-arg `check()` fixture shape for assertions with no input→output pair. (3) `JSON.stringify(richToolbar[0]).includes('italic')` hard-codes the toolbar group index, so moving `italic` into the second toolbar group would fail the row even though the config is still correct.
- **suggested_action:** Rewrite the comment to say the byte-parity literal lives in fixture 4's `check` comparison; move the config assertion to the Sections 8-10 no-arg `check()` shape (or split it into its own tiny loop) so nothing is passed to `richTextToMjText`; and drop the `[0]` so the assertion reads `JSON.stringify(richToolbar).includes('italic')`.
- **resolved_by:**

## FIND-SPRINT-008-4
- **source:** TASK-025 (code-reviewer)
- **type:** improvement
- **severity:** low
- **location:** index.html — `renderTestHarness()` (grep `function renderTestHarness`), all eleven `--- Section N` blocks
- **status:** open
- **description:** `renderTestHarness()` now contains eleven near-identical copies of the same ~12-line block: create an `<h3>`, set the same `cssText` string, append it, then loop the fixtures building the same `harness-row` / `harness-row-label` / `harness-field` innerHTML. TASK-025's plan explicitly instructed copying the Section-2 loop verbatim, so the executor did the right thing for this task — but the eleventh copy is the point where the duplication starts to cost more than it documents. The `cssText` literal in particular is copy-pasted eleven times with one deliberate variation (`margin:0 0 4px` in Section 1 vs `margin:12px 0 4px` in 2-11), which is the kind of near-identical-but-not literal that drifts silently. Consolidating also gives FIND-SPRINT-008-1 (guarding the function-under-test call) a single place to land instead of eleven.
- **suggested_action:** Extract a `renderHarnessSection(body, title, fixtures, run)` helper where `run(fixture)` returns `{ actual, pass }` and the helper owns the `<h3>`, the row markup, and the try/catch; migrate the sections to it one at a time, confirming the row count and PASS state per section after each move. Best done as a standalone cleanup task, not folded into a feature diff.
- **resolved_by:**
