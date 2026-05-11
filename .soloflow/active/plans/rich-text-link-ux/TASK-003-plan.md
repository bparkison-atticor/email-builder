---
id: TASK-003
idea: SPRINT-001-compounder
status: approved
created: 2026-05-11T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - .soloflow/active/plans/rich-text-link-ux/EPIC-rich-text-link-ux.md
  - CHANGELOG.md
acceptance_criteria:
  - criterion: "A `phoneDigits(value, { keepPlus = true } = {})` helper exists in index.html in the utilities region near `autoLinkPhones` (between roughly lines 1040–1180), applying `/[^\\d+]/g` by default and `/\\D/g` when `keepPlus: false`."
    verification: "grep -n 'function phoneDigits' index.html returns exactly one match; reading the function body confirms the `keepPlus` parameter defaults to true, the default branch uses `/[^\\d+]/g`, and the `keepPlus: false` branch uses `/\\D/g`."
  - criterion: "A `buildLinkHref(type, value)` helper exists in index.html adjacent to `phoneDigits`, returning `tel:${phoneDigits(value)}` for `type === 'phone'`, the verbatim value when `type === 'url'` and the value matches `/^https?:\\/\\//i`, and `` `{{${value}}}` `` for any other url-type value."
    verification: "grep -n 'function buildLinkHref' index.html returns exactly one match; reading the function confirms it calls `phoneDigits(value)` for the phone branch, uses the regex `/^https?:\\/\\//i` for url passthrough detection, and wraps as `{{${value}}}` otherwise."
  - criterion: "The four href-construction call sites previously at index.html lines 907, 963, 1080, and 1180 no longer contain inline regex literals (`/\\D/g` or `/[^\\d+]/g`) and instead call `phoneDigits` (directly or transitively via `buildLinkHref`)."
    verification: "grep -n \"replace(/[\\\\^]*\\\\\\\\d[^)]*/g\" index.html returns ONLY the match inside `isValidPhone` (around line 1475); no other lines show inline non-digit stripping regexes used for href construction."
  - criterion: "`applyLink()` constructs its phone href via `buildLinkHref('phone', value)` (or equivalent direct `phoneDigits` + template literal) and its url href via `buildLinkHref('url', value)`, removing the inline `/^https?:\\/\\//i` ternary at the original line 967."
    verification: "Reading the `applyLink` function shows the entire `if (type === 'phone')` / `else` href-construction block is replaced by a single `href = buildLinkHref(type, value)` call (or equivalent), and the empty-digits early return is preserved (either inside `buildLinkHref` or in `applyLink` after the call)."
  - criterion: "`buildCtaHref()` returns `buildLinkHref(type, value)` for the non-empty branch, so a raw URL like `https://example.com` pasted into the CTA destination produces `href=\"https://example.com\"` and a bare variable like `OFFER_URL` produces `href=\"{{OFFER_URL}}\"`."
    verification: "Reading the `buildCtaHref` function shows it returns `buildLinkHref(type, value)` after the empty-value guard; manual smoke test: paste `https://example.com` into the CTA destination, switch CTA type to URL, click Copy HTML, and confirm the output contains `href=\"https://example.com\"` (not `href=\"{{https://example.com}}\"`)."
  - criterion: "`isValidPhone()` (around line 1473) remains untouched — its `/\\D/g` length-check regex is preserved as-is."
    verification: "git diff index.html shows zero changes to the `isValidPhone` function body."
  - criterion: "Manual end-to-end check: entering `+1-555-123-4567` in the link modal (Phone) and in the CTA destination field (Phone) both yield `href=\"tel:+15551234567\"` in the compiled MJML output — the `+` is preserved in both paths."
    verification: "Run `python -m http.server 8080 --bind 127.0.0.1`, open the app, type `+1-555-123-4567` into the body link modal Phone field, apply, click Copy HTML, and confirm the body link's href is `tel:+15551234567`. Repeat for the CTA destination field with CTA type Phone; confirm the CTA href is `tel:+15551234567`."
  - criterion: "Edit-existing-link pre-populate (line 907 region) still strips a leading `tel:` correctly: opening a link with href `tel:+15551234567` pre-fills the modal Phone input with `+15551234567` (the `+` is now preserved, an intentional behavior change from the previous `/\\D/g`)."
    verification: "Manual: insert a phone link with `+1-555-123-4567`, place the cursor inside it, click the toolbar link button, and confirm the modal's Phone input shows `+15551234567`."
depends_on: [TASK-002]
estimated_complexity: low
epic: rich-text-link-ux
test_strategy:
  needed: false
  justification: "Project has no test runner per CLAUDE.md ('Test: no test command detected'). Behavior is verified manually via the acceptance criteria's end-to-end smoke checks in a local browser session."
---

# Extract `phoneDigits` and `buildLinkHref` helpers; fix `buildCtaHref` raw-URL bug

## Objective

Eliminate two correctness gaps in `index.html`'s link construction: (1) `buildCtaHref` at line 1175 unconditionally wraps every non-phone, non-empty value as `{{value}}`, so a marketer pasting `https://example.com` into the CTA destination ships a broken `href="{{https://example.com}}"` Handlebars token; (2) six call sites strip phone-number non-digit characters with two inconsistent regexes (`/\D/g` drops the international `+`, `/[^\d+]/g` preserves it), so identical input produces divergent `tel:` hrefs between the link modal and the CTA field. Both problems collapse into a single fix: introduce a shared `phoneDigits()` helper that codifies the `+`-preserving rule, and a `buildLinkHref(type, value)` helper that codifies the canonical url-passthrough-or-handlebars-wrap rule established by TASK-002's `applyLink`. Route all four href-construction call sites through these helpers. `isValidPhone()` at line 1470 is explicitly preserved — its `/\D/g` is for length validation, not href construction.

## Implementation Steps

1. **Insert helpers near the utilities region.** In `index.html`, immediately before `autoLinkPhones` (around line 1040 — locate by `grep -n 'function autoLinkPhones' index.html`), add two new functions:

   ```js
   // Canonical phone-digit normalizer for href construction.
   // Preserves a leading "+" (E.164) by default. Pass { keepPlus: false }
   // when the consumer needs digits only (none currently — isValidPhone
   // does its own length check and is intentionally not routed through here).
   function phoneDigits(value, { keepPlus = true } = {}) {
     return String(value || '').replace(keepPlus ? /[^\d+]/g : /\D/g, '');
   }

   // Canonical href builder shared by the rich-text link modal and the CTA field.
   // - phone: strip to digits (+ preserved) and prefix tel:
   // - url:   passthrough when it already looks like http(s)://, otherwise
   //          wrap as a Handlebars merge variable.
   function buildLinkHref(type, value) {
     const v = String(value || '').trim();
     if (type === 'phone') {
       return `tel:${phoneDigits(v)}`;
     }
     return /^https?:\/\//i.test(v) ? v : `{{${v}}}`;
   }
   ```

2. **Update `openLinkModal` pre-populate (line ~907).** Replace `prefilledValue = href.slice(4).replace(/\D/g, '');` with `prefilledValue = phoneDigits(href.slice(4));`. This is a deliberate behavior change: a previously-saved link with `tel:+15551234567` now pre-fills as `+15551234567` instead of `15551234567`, which round-trips correctly through `applyLink` after the change below.

3. **Update `applyLink` (lines ~960–968).** Replace the entire `if (type === 'phone') { … } else { … }` href-construction block with:

   ```js
   const href = buildLinkHref(type, value);
   if (type === 'phone' && href === 'tel:') { closeLinkModal(); return; }
   ```

   The second line preserves the existing empty-digits early-return behavior (previously gated on `if (!digits) { closeLinkModal(); return; }`). Use `let`/`const` consistent with the surrounding code — the existing `let href;` declaration becomes a single `const href = …` line.

4. **Update `autoLinkPhones` (line ~1080).** Replace `const digits = m[0].replace(/[^\d+]/g, '');` with `const digits = phoneDigits(m[0]);`. The href construction `tel:${digits}` is left as-is (using `phoneDigits` here directly rather than `buildLinkHref` keeps the existing `<a>` element construction intact — we only consolidate the digit-stripping regex).

5. **Update `buildCtaHref` (lines ~1175–1184) — this is the bug fix.** Replace the function body after the empty-value guard with a single call to `buildLinkHref`:

   ```js
   function buildCtaHref() {
     const type = getCtaType();
     const value = (els.ctaDestination.value || '').trim();
     if (!value) return '#';
     return buildLinkHref(type, value);
   }
   ```

   This is the load-bearing change: previously the url branch unconditionally returned `` `{{${value}}}` ``, producing `href="{{https://example.com}}"` for raw URLs. `buildLinkHref` now applies the same `https?://` passthrough that `applyLink` has used since TASK-002.

6. **Leave `isValidPhone` (line ~1470) untouched.** Per the work-item spec, its `/\D/g` is for the 7–15-digit length check, not href construction. Verify by `grep -n 'function isValidPhone' index.html` and confirming its body is identical pre- and post-change.

7. **Manual smoke test.** Run `python -m http.server 8080 --bind 127.0.0.1`, open `http://127.0.0.1:8080/`, and walk through:
   - Body link modal → Phone → `+1-555-123-4567` → confirm output `tel:+15551234567`.
   - Body link modal → URL → `https://example.com` → confirm output `https://example.com`.
   - Body link modal → URL → `OFFER_URL` → confirm output `{{OFFER_URL}}`.
   - CTA destination → Phone → `+1-555-123-4567` → confirm output `tel:+15551234567` (was `tel:+15551234567` before too — this path was already correct).
   - **CTA destination → URL → `https://example.com` → confirm output `https://example.com`** (was the broken `{{https://example.com}}` before — this is the bug fix).
   - CTA destination → URL → `OFFER_URL` → confirm output `{{OFFER_URL}}` (regression check — the Handlebars wrap path must still work).
   - Edit-existing-link round-trip: insert phone link `+1-555-123-4567`, place cursor inside, click toolbar link button, confirm modal pre-fills `+15551234567` (note the new `+`).

8. **Completeness gate before reporting COMPLETED.** Re-run `grep -n "replace(/\\\\D/g\\|replace(/\\[\\^\\\\d+\\]/g" index.html` and confirm the only remaining match is inside `isValidPhone`. Re-run `grep -n "{{${" index.html` and confirm the only `{{${value}}}` wrap lives inside `buildLinkHref` (no leftover inline wraps in `buildCtaHref` or `applyLink`).

## Acceptance Criteria

Restated from frontmatter: helpers exist and are correctly placed, all four href-construction call sites route through them, `buildCtaHref` correctly passes through raw URLs (the headline bug fix), the `+` is preserved consistently across link-modal and CTA paths, `isValidPhone` is untouched, and edit-existing-link pre-populate round-trips through the new `+`-preserving normalizer.

## Test Strategy

No automated tests — the project has no test runner per CLAUDE.md. Manual verification is encoded into Implementation Step 7's smoke checklist, which exercises every acceptance criterion through the running app.

## Hardest Decision

**Merging B1 and B2 into one task, and placing `phoneDigits` outside `buildLinkHref` rather than inlining the digit-strip inside it.**

Merging: the compounder and skeptic both flagged that splitting these would create an ordering hazard — if B2 ships first, B1 has to wait; if B1 ships first, it would duplicate the regex inside `buildLinkHref` and then B2 would have to re-extract it. Single task, single diff, zero coordination cost. The two helpers also live within ~10 lines of each other in the file, so they share review surface anyway.

Helper layering: `phoneDigits` is exposed at the same level as `buildLinkHref` (rather than as a private closure) because `autoLinkPhones` needs digit-stripping but does NOT need `buildLinkHref`'s url-handling — it constructs a full `<a>` element with extra attributes. Keeping `phoneDigits` independently callable lets `autoLinkPhones` consume just the regex consolidation without forcing a refactor of its DOM construction.

## Rejected Alternatives

- **Two separate tasks (B1 first, then B2).** Rejected: introduces a transient state where `buildLinkHref` contains an inline `/[^\d+]/g` that B2 has to immediately re-extract — wasted churn, and the merged-task diff is small enough that the cohesion benefit outweighs any tracking benefit of two TASK IDs. Would reconsider only if there were a non-trivial reason to ship B1 to production before B2 — there isn't.
- **Route `isValidPhone` through `phoneDigits({ keepPlus: false })`.** Rejected per the work-item spec — `isValidPhone` is a length validator and is intentionally out of scope. Touching it risks an unrelated regression in form validation.
- **Make `buildLinkHref` also handle the empty-input guard internally** (returning `''` or `null` for empty values). Rejected because `applyLink` and `buildCtaHref` have *different* empty-input policies (`applyLink` closes the modal, `buildCtaHref` returns `'#'`), so empty handling stays at the call sites. Would reconsider if a third call site emerged with yet another empty policy — at that point, an `EmptyValueError` enum or similar might be warranted.
- **Inline the bug fix into `buildCtaHref` without extracting `buildLinkHref`.** Rejected: would leave the canonical url-passthrough logic duplicated between `applyLink` and `buildCtaHref`, exactly the divergence pattern that produced this bug in the first place.

## Lowest Confidence Area

The `openLinkModal` pre-populate behavior change at step 2 — switching from `/\D/g` to `phoneDigits` means a saved `tel:+15551234567` link now pre-fills as `+15551234567` rather than `15551234567`. This is the *correct* behavior (round-trips losslessly through the new `applyLink`), but it's a user-visible change in what the input field displays when editing an existing link. If marketers have muscle memory expecting the modal to show digits-only, this could read as a minor surprise. Mitigation: the change is internally consistent (input shape matches output shape), and the link modal is brand-new in TASK-002 so muscle memory is minimal. If this turns out to be objectionable, the fix is a one-line tweak: `prefilledValue = phoneDigits(href.slice(4), { keepPlus: false });` — but I'm proceeding with `+` preservation as the default because it matches the rest of the consolidation.
