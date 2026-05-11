---
sprints: [SPRINT-001]
span_label: SPRINT-001
created: 2026-05-11T00:00:00.000Z
counters_start:
  ideas: 1
summary:
  cleanups: 1
  backlog_tasks: 3
  claude_md: 1
  soloflow_improvements: 0
---

# Compound Proposal — SPRINT-001

## Reconciled Findings (informational)

FIND-SPRINT-001-1 — marked `status: resolved` in the findings file (resolved by commit `b937740`); no done report contains a `**Findings resolved:**` line for it. Status in the findings file is accurate; no stale-open drift to correct.

---

## A. Clean-up items (execute now)

### A1. Replace templated CSS attribute-selector in phone-tagging with a JS equality check
- **Summary:** The phone-tagging querySelector interpolates the `href` value into a CSS attribute selector string — swap it for a JS `.getAttribute()` equality check to remove the fragile implicit dependency on the phone-only guard.
- **Source-Sprint:** SPRINT-001
- **Rationale:** The current code at `index.html:975` constructs `a[href="${href}"]` from user-derived input. Today only digits reach the selector (the `if (type === phone)` guard ensures this), so there is no exploitable injection. But the guard is the sole barrier: any future maintainer who extends the `data-link-type` marker to URL or variable types would silently introduce a CSS attribute-selector injection if the value contains a double-quote character. The fix is a one-line JS change with no behavioral difference.
- **Blast radius:** One code site (`index.html` ~line 975), no other consumers. Risk: trivial.
- **Source:** FIND-SPRINT-001-4 (sprint-code-reviewer, SPRINT-001); also noted in TASK-002 done report's security audit ("currently safe" qualifier confirms the status).
- **Proposed change:**

  Current code (inside the `if (type === 'phone')` block in `applyLink`):
  ```js
  // Before — templated selector, fragile
  ownerEditor.root.querySelectorAll(`a[href="${href}"]:not([data-link-type])`).forEach(a => {
    a.setAttribute('data-link-type', 'phone');
  });
  ```

  Replace with:
  ```js
  // After — JS equality check, no injection surface
  ownerEditor.root.querySelectorAll('a:not([data-link-type])').forEach(a => {
    if (a.getAttribute('href') === href) {
      a.setAttribute('data-link-type', 'phone');
    }
  });
  ```

  The two forms are semantically equivalent when `href` is a `tel:digits` string; the second form is safe regardless of what `href` contains.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Verified at `index.html:980` — the templated `a[href="${href}"]` selector exists exactly as described and is fenced only by the `if (type === 'phone')` guard at line 962; the swap is a localized 3-line change in a single function with no other consumers and removes a latent injection trap before any URL-branch extension lands.
- **Counterfactual:** If the phone-only guard were enforced by a stricter validator (e.g. an assertion that `href.startsWith('tel:')` near the selector), the latent risk would be redundant and this would slide to DONT_IMPLEMENT on proportionality.

---

## B. Backlog tasks (refine into execution-ready plans)

### B1. Fix `buildCtaHref` wrapping raw URLs as broken `{{https://...}}` Handlebars tokens
- **Summary:** The CTA destination field wraps any non-phone value unconditionally in `{{...}}`, so pasting a real URL like `https://example.com` produces a broken Handlebars token in the output — the link-modal behavior (added in SPRINT-001) is correct; the pre-existing CTA path is the bug.
- **Source-Sprint:** SPRINT-001
- **Source:** FIND-SPRINT-001-3 (sprint-code-reviewer); TASK-002 done report (introduced the correct `https?://` guard in `applyLink` at line 962, which revealed the divergence).
- **Problem:** `buildCtaHref` at `index.html:1176` returns `` `{{${value}}}` `` for every non-phone, non-empty value — including raw URLs. `applyLink` at line 962 correctly gates wrapping on `/^https?:\/\//i.test(value)`. A marketer who copies a URL from their browser and pastes it into the CTA destination field gets `href="{{https://example.com}}"` in the compiled HTML — a broken token that renders as a literal string in SendGrid. The link-modal behavior is the intended contract; `buildCtaHref` predates SPRINT-001 and was not updated when the correct logic was established.
- **Proposed direction:** Extract a shared helper `buildLinkHref(type, value)` that encodes the canonical rule: if `type === 'phone'`, strip non-digits (keeping `+`) and prefix `tel:`; if `type === 'url'`, return the value verbatim when it matches `/^https?:\/\//i`, otherwise wrap as `` `{{${value}}}` `` (Handlebars variable). Replace the URL-branch body of `buildCtaHref` (~line 1176) and the href-construction block in `applyLink` (~line 962) with calls to `buildLinkHref`. Place the helper near `autoLinkPhones` in the utilities section of the script. This task subsumes the phone-digit consolidation described in B2 — coordinate or merge.
- **Scope:** small

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Verified at `index.html:1181` — `buildCtaHref` unconditionally returns `` `{{${value}}}` `` for the non-phone branch, while `applyLink` at line 967 gates on `/^https?:\/\//i`; a marketer pasting `https://example.com` into the CTA destination today produces a literal broken `href="{{https://example.com}}"` in SendGrid output, which directly contradicts the product purpose (compile MJML to SendGrid-ready HTML).
- **Counterfactual:** If CTA destinations were already documented as Handlebars-variables-only with raw-URL entry blocked at the UI level, this would slide to DONT_IMPLEMENT — but no such guard exists in the input field at line 700 area or the validator.

### B2. Consolidate six phone-digit-stripping call sites into a single `phoneDigits()` helper
- **Summary:** Six call sites in `index.html` strip non-digit characters from phone numbers using two inconsistent regexes — `/\D/g` (drops the international `+`) and `/[^\d+]/g` (preserves it) — causing the new link modal to silently drop the `+` prefix for E.164 numbers while the CTA field preserves it.
- **Source-Sprint:** SPRINT-001
- **Source:** FIND-SPRINT-001-2 (sprint-code-reviewer); TASK-001 done report (pre-populate path at line 907 uses `/\D/g`); TASK-002 done report (apply path at line 958 uses `/\D/g`).
- **Problem:** The sprint added two new `/\D/g` copies (lines 907 and 958) while pre-existing code at lines 1073 and 1173 uses `/[^\d+]/g`. A user entering `+1-555-123-4567` in the link modal gets `href="tel:15551234567"` (dropped `+`); the same input in the CTA destination field gets `href="tel:+15551234567"` (preserved `+`). The `/[^\d+]/g` form is correct for E.164. `isValidPhone()` at line 1468 uses `/\D/g` for length-check purposes only and is not part of the href construction — it should stay as-is or be separately evaluated.
- **Proposed direction:** Extract `function phoneDigits(value, { keepPlus = true } = {})` that applies `/[^\d+]/g` by default (preserving `+`) and `/\D/g` when `keepPlus: false`. Route all six `tel:` href construction sites through it, defaulting `keepPlus: true` to match existing CTA behavior and fix the regression in the link modal. Leave `isValidPhone`'s length-check regex untouched. Note: if B1 is executed first, B1's `buildLinkHref` should incorporate the `phoneDigits` logic — these two tasks can be merged into a single execution.
- **Scope:** small

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Verified the inconsistency directly — `index.html:907` and `:963` use `/\D/g` (drops `+`), while `:1078` and `:1178` use `/[^\d+]/g` (preserves `+`); the user-facing E.164 regression (link modal silently strips the `+` from `+1-555-...`) is concrete harm and the fix naturally merges into B1's `buildLinkHref` so the marginal change-cost beyond B1 is near-zero.
- **Counterfactual:** If B1 is dropped, this task's proportionality drops as well — a standalone helper just to swap two regex literals is borderline; recommend executing as part of B1 rather than separately.

### B3. Reconcile near-duplicate `updateLinkFields` / `updateCtaFields` functions and align URL-field copy
- **Summary:** Two near-identical functions drive the same phone/URL label-swap pattern in different panels with different copy strings — extract a shared `setPhoneOrUrlFieldLabels()` utility and unify the vocabulary so marketers see the same text in both surfaces.
- **Source-Sprint:** SPRINT-001
- **Source:** FIND-SPRINT-001-5 (sprint-code-reviewer); TASK-001 done report (introduced `updateLinkFields` at lines 856–867).
- **Problem:** `updateLinkFields` (lines 856–867, added in SPRINT-001) and `updateCtaFields` (lines 992–1014, pre-existing) have the same shape and manage the same UI concept but differ in two ways: (1) `updateLinkFields` swaps labels instantly; `updateCtaFields` cross-fades over 120ms. (2) The URL field copy diverges — the link modal says "URL or {{variable}}" / "Enter https://… or {{variable}}."; the CTA panel says "Variable name" / "Wrapped as {{variable}} in output (Handlebars)." — same concept, different vocabulary. The hint string "Any format — non-digits stripped for tel: link." also appears in three places (lines 861, 998, and the `linkDestinationHint` HTML at line 700).
- **Proposed direction:** Extract `function setPhoneOrUrlFieldLabels({ labelEl, placeholderEl, hintEl, type, withFade = false })` driven by shared string constants. Replace both `updateLinkFields` and `updateCtaFields` with calls to it. Decide on canonical copy for the URL field (the link-modal wording — "URL or {{variable}}" — is more explicit and should win) and apply it to the CTA panel as well. This is low priority and should be scheduled after B1/B2 since B1's `buildLinkHref` extraction naturally co-locates the string constants.

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The two functions diverge in real behavior — `updateLinkFields` (`index.html:856-867`) does an instant swap while `updateCtaFields` (`:997-1019`) does a 120ms cross-fade with a same-text skip-guard — so a unifying helper would either need a `withFade` branch (re-introducing the divergence inside the helper) or one surface would change UX; combined with a single-sprint, low-severity copy inconsistency that no finding or stuck report has cited as user harm, this fails the proportionality and frequency bars for a refactor across two functioning surfaces.
- **Counterfactual:** If a marketer-reported confusion between the two surfaces' vocabulary surfaces in a future sprint, or if a third panel acquires the same pattern, the frequency bar clears and this becomes IMPLEMENT.
- **Scope:** small

---

## C. CLAUDE.md / CODE-PATTERNS.md improvements

_All proposed C-items were dropped by the claude-md-reviewer as premature — they reference helpers that do not yet exist in `index.html` (proposed but unexecuted in B1/B2). They will re-surface in a future compound pass once the helpers actually exist._

### C1. Add CLAUDE.md rule: all `tel:` href construction must route through the shared `phoneDigits` helper [dropped — stale]
- **Source-Sprint:** SPRINT-001
- **source_item:** C1
- **Reason:** The `phoneDigits()` helper does not exist in `index.html` — it is proposed in Bucket B (B1/B2), which is unapproved and unexecuted. Documenting a rule that references a non-existent utility would mislead future agents. Re-surface once B1 (or merged B1+B2) lands and the final helper name and shape are fixed.

### C2. Add `phoneDigits` and `buildLinkHref` entries to CODE-PATTERNS.md Shared Utilities [dropped — stale]
- **Source-Sprint:** SPRINT-001
- **source_item:** C2
- **Reason:** Both `phoneDigits()` and `buildLinkHref()` are proposed-but-not-implemented (B1/B2). A CODE-PATTERNS.md entry with `Location: index.html — near autoLinkPhones` would be factually wrong today. B1 also says it may subsume B2 into a single helper, so the final count and naming are unsettled. Defer until the helpers exist.

---

## Suppressed — SoloFlow Defects

_No items suppressed under this heading. No C-candidates were reclassified as SoloFlow-internal defects._
