---
sprints: [SPRINT-005]
span_label: SPRINT-005
created: 2026-06-02T19:00:00.000Z
counters_start:
  ideas: 1
summary:
  cleanups: 2
  backlog_tasks: 2
  claude_md: 2
  soloflow_improvements: 0
---

# Compound Proposal — SPRINT-005

## A. Clean-up items (execute now)

### A1. Collapse two single-property harness rules to meet the <=30-line guideline
- **Summary:** Merge two adjacent single-property `.harness-field` rules in the `#testHarness` override block so the block lands at <=30 lines.
- **Source-Sprint:** SPRINT-005
- **Rationale:** FIND-SPRINT-005-1 flags the block at 31-32 lines against a soft <=30 target documented in the task plan. The overage is purely cosmetic but the guideline exists to keep override blocks scannable. The fix is a one-line merge of two adjacent rules and carries zero behavioral risk.
- **Blast radius:** `index.html` lines 522-553; estimated risk: trivial — CSS-only, no JS touched, no layout change.
- **Source:** FIND-SPRINT-005-1 (verifier, TASK-009 done report)
- **Proposed change:**
  ```diff
  - .harness-field { font-size: 0.85rem; }
  - .harness-field strong { font-weight: 600; }
  + .harness-field { font-size: 0.85rem; }
  + .harness-field strong { font-weight: 600; }
  # Concretely: combine onto two declarations inside one rule, or
  # place both on a single selector line, e.g.:
  - #testHarness .harness-field { font-size: 0.85rem; }
  - #testHarness .harness-field strong { font-weight: 600; }
  + #testHarness .harness-field { font-size: 0.85rem; }
  + #testHarness .harness-field strong { font-weight: 600; }
  # The exact line to collapse is whichever two adjacent single-property rules
  # can be joined without grouping unrelated selectors. Verify final count <=30.
  ```
  Concrete instruction: open `index.html`, find the `/* #testHarness overrides */` comment block around line 522, identify any two adjacent single-declaration rules that share a root selector, and combine their declarations inside one rule block. Total line count of the block (comment through closing brace) should reach <=30.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Confirmed at `index.html:532-563` — the `#testHarness` block is 32 lines and lines 557-558 are two adjacent single-property `.harness-field` rules trivially mergeable; CSS-only, isolated, near-zero blast radius clears Bucket A's low bar.
- **Counterfactual:** Would flip to DONT_IMPLEMENT if the merge forced grouping unrelated selectors (it does not — both share the `#testHarness .harness-field` root).

### A2. Add an inline comment documenting the intended Escape-key handler order
- **Summary:** Add a short comment next to the harness Escape branch noting that the trailing position is intentional and stacked-modal state is unreachable for this dev-only overlay.
- **Source-Sprint:** SPRINT-005
- **Rationale:** FIND-SPRINT-005-4 notes that TASK-009 silently moved the `#testHarness` Escape check from first-evaluated to a trailing `else` branch. The behavior is correct as long as modals do not stack, but the reorder is invisible in any single task diff. A two-line comment prevents a future executor from "restoring" the old order as an apparent bug fix, and documents the architectural decision that harness-stacking-with-a-modal is unreachable.
- **Blast radius:** `index.html` ~line 2172-2180; estimated risk: trivial — comment only, no logic change.
- **Source:** FIND-SPRINT-005-4 (sprint-code-reviewer, TASK-009 done report)
- **Proposed change:**
  ```diff
  # At index.html ~line 2172, inside the keydown 'Escape' handler, before or at
  # the else branch that closes the test harness:

  + // #testHarness is a dev-only overlay (Ctrl+Shift+T); it cannot be open
  + // simultaneously with linkModal or htmlModal, so trailing else position is safe.
    } else if (testHarnessVisible()) {
      closeTestHarness();
    }
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** low
- **Reasoning:** Confirmed at `index.html:2173-2180` — the harness Escape check is now a trailing `else` below linkModal/htmlModal, and the harness is a dev-only Ctrl+Shift+T overlay (line 2162), so a two-line comment is a near-zero-cost guard against a future executor "restoring" the order; Bucket A leans IMPLEMENT.
- **Counterfactual:** Would flip if the harness could co-exist with another modal (it cannot today — opening either does not suppress the other's visible class, but no UI path stacks them).

---

## B. Backlog tasks (refine into execution-ready plans)

### B1. Migrate testDataSwitch onto createModuleToggle() to eliminate the parallel toggle implementation
- **Summary:** Replace the hand-rolled `testDataSwitch` flip/sync logic with a call to `createModuleToggle()` so the codebase has a single toggle implementation.
- **Source-Sprint:** SPRINT-005
- **Source:** FIND-SPRINT-005-2 (sprint-code-reviewer); TASK-011 done report (code-reviewer noted `createModuleToggle` is a "clean generalization of `flipTestData`/`syncTestDataSwitch`")
- **Problem:** Two parallel toggle implementations now exist in `index.html`. `createModuleToggle()` (added by TASK-011, ~line 1917-1971) handles localStorage persistence, `role=switch` a11y, click, and Space/Enter keyboard handling as a factory. The older `testDataSwitch` (lines 1897-1915) is a hand-rolled copy of the same widget, wired to `flipTestData`/`syncTestDataSwitch`. TASK-011's code-reviewer explicitly flagged this as a "clean generalization" of the older pattern, and the factory comment says "Mirror testDataEnabled init" — confirming they are the same control. Leaving two implementations means future a11y or persistence fixes must be applied in two places.
- **Proposed direction:** Migrate `#testDataSwitch` to use `createModuleToggle()`. Key constraints that the task plan must address: (1) the factory's default localStorage key shape is `emailBuilder.module.<id>`; `testDataEnabled` uses `emailBuilder.testDataEnabled` — the migration must either preserve the old key (to avoid resetting users' saved preference) or perform a one-time migration read; (2) `#testDataSwitch` is static markup inside an existing `.seg-head` — the factory can either accept an existing element or, simpler, keep static markup and route `flip`/`sync` through a shared helper extracted from the factory; (3) the `onChange` callback must still call `flipTestData()` / trigger `scheduleRender()` as the old handlers did. After migration, `flipTestData`, `syncTestDataSwitch`, and the `testDataSwitch` click/keydown listeners can be deleted. The factory's `{ element, isOn }` API is already the right shape for this.
- **Scope:** small

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Both implementations exist exactly as claimed — `createModuleToggle()` at `index.html:1920-1971` and the hand-rolled `testDataSwitch`/`flipTestData`/`syncTestDataSwitch` at lines 1897-1915 are functionally identical widgets, and TASK-011's done report calls the factory a "clean generalization of flipTestData/syncTestDataSwitch", so the duplication is real and the localStorage-key migration caveat is correctly flagged.
- **Counterfactual:** None — this is the explicit IDEA-003 direction; the only open question is migration mechanics, which the proposed direction already enumerates.

### B2. Resolve the phoneDigits keepPlus dead-code branch (YAGNI cleanup or route isValidPhone through it)
- **Summary:** Either drop the unused `keepPlus:false` branch from `phoneDigits()` or route `isValidPhone` through it so every phone-normalization path has a single source of truth.
- **Source-Sprint:** SPRINT-005
- **Source:** FIND-SPRINT-005-3 (sprint-code-reviewer, TASK-003); TASK-003 done report
- **Problem:** `phoneDigits(value, { keepPlus = true } = {})` was introduced by TASK-003 (~lines 1268-1284) with a `keepPlus:false` branch (`value.replace(/\D/g, '')`) that has zero current consumers. All three call sites (via `buildLinkHref`, `autoLinkPhones`, `buildCtaHref`) use the default `keepPlus:true`. The one place that strips non-digits — `isValidPhone` (lines 1289-1311) — deliberately bypasses the helper and does its own normalization. This means the abstraction is slightly larger than it needs to be, and phone normalization has two separate code paths.
- **Proposed direction:** Two options: (a) YAGNI — remove the `keepPlus` parameter entirely and hardcode `keepPlus:true` behavior; update the three call sites (no functional change since they all use the default); (b) route `isValidPhone`'s normalization through `phoneDigits(v, { keepPlus: false })` so the branch earns its place and phone normalization has a single source of truth. Option (b) is slightly more cohesive but requires verifying `isValidPhone`'s length-check logic still works with the helper's output. Defer this task until another task touches `isValidPhone` or phone validation — do not prioritize independently unless the duplication causes a real bug.
- **Scope:** small

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Evidence is accurate — the `keepPlus:false` branch at `index.html:1270` has zero consumers and `isValidPhone` (line 2007) bypasses the helper with its own `replace(/\D/g,'')` — but severity is nil (dead branch is inert, no bug), the proposal itself says "defer until another task touches isValidPhone," and standing it up as its own backlog item adds tracking cost for a cosmetic YAGNI; Bucket B low-RoI.
- **Counterfactual:** Would flip to IMPLEMENT if a second digits-only consumer appeared, making the single-source-of-truth route (option b) load-bearing rather than speculative.

---

## C. CLAUDE.md / CODE-PATTERNS.md improvements (apply now)

### C1. Document createModuleToggle() factory and the seg-body collapse primitive in CODE-PATTERNS.md
- **Summary:** Add a CODE-PATTERNS.md entry for `createModuleToggle()` and the `.seg-body`/`.seg-body.collapsed` collapse primitive so future tasks can reuse them without re-reading the implementation.
- **Source-Sprint:** SPRINT-005
- **Target file:** `CODE-PATTERNS.md`
- **Action:** insert-after "Canonical example: called from both catch arms inside `applyTestData()` before assigning `templateError`." (end of `## Shared Utilities`)
- **Status:** ready
- **source_item:** C1
- **Diff:**
  ```diff
  + ### `createModuleToggle`
  +
  + - **Location:** `index.html` ~line 1920.
  + - **Use it for:** Building an enable/disable toggle for an optional module. `createModuleToggle(id, label, defaultOn, onChange)` returns `{ element, isOn }`; caller appends `element` to the DOM. `onChange(state)` fires once on init and on every flip.
  + - **Canonical example:** CTA toggle ~line 1992 (`createModuleToggle('cta', ...)`).
  + - **Gotcha:** state persists under `emailBuilder.module.<id>`. The legacy `testDataEnabled` toggle uses a different key (`emailBuilder.testDataEnabled`) — migrating it onto this factory needs a one-time key migration or the saved preference resets.
  +
  + ### `.seg-body` collapse primitive
  +
  + - **Location:** CSS ~line 122 (`.seg-body` / `.seg-body.collapsed`); first used by `#ctaBody` ~line 598.
  + - **Use it for:** Animated max-height collapse of a module's field group when its toggle is OFF. Wrap collapsible fields in `<div class="seg-body" id="{module}Body">`; keep the `.seg-head` (which holds the toggle) outside the wrapper so the header stays visible. Toggle the `.collapsed` class from the module's `onChange`.
  + - **Gotcha:** the expanded ceiling is `max-height: 1000px` — revisit only if a module body exceeds it.
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** All citations verified — `createModuleToggle` at `index.html:1920`, CTA consumer at line 1992, `.seg-body`/`.seg-body.collapsed` at lines 122-123, `#ctaBody` at line 598 — these are genuinely reusable primitives (the module-toggle factory is the explicit IDEA-003 roadmap pattern with more consumers coming), the insert-after anchor matches the end of CODE-PATTERNS.md's Shared Utilities (line 51), and no existing entry duplicates them.
- **Counterfactual:** None — high future-reuse and zero duplication; documenting now saves every future module-toggle task from re-reading the factory.

### C2. Add a CLAUDE.md rule: gate module-specific validation in runCopyAction() behind the module's isOn() check
- **Summary:** Add a CLAUDE.md convention requiring that validation blocks for optional modules are guarded by their toggle's `isOn()` call, keeping non-module validation outside the guard.
- **Source-Sprint:** SPRINT-005
- **Target file:** `CLAUDE.md`
- **Action:** append (to `## Conventions`, after the humanize-errors entry)
- **Status:** ready
- **source_item:** C2
- **Diff:**
  ```diff
  + - **Optional-module validation must be gated behind `isOn()`.** In `runCopyAction()`, read the toggle once (`const ctaOn = ctaToggle.isOn()`) and wrap only that module's required-field/format checks in `if (...)`. Shared validation (the `missing = []` init, body-copy check, final aggregation) stays outside the guard so it runs in both states. See the CTA precedent at `index.html` ~line 2071.
  ```

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The cited precedent is real (`const ctaOn = ctaToggle.isOn()` at `index.html:2071` gating the CTA block, shared `missing=[]` outside at line 2065), but it is a single occurrence from this one sprint with exactly one optional module — codifying a one-off as a durable CLAUDE.md rule fails the "how many future agents repeat this mistake" bar, and CODE-PATTERNS.md line 59 already directs new required fields into `runCopyAction()` validation; Bucket C low-confidence leans withhold.
- **Counterfactual:** Would flip to IMPLEMENT once a second optional module ships and the gating pattern is at risk of being applied inconsistently across modules.

---

## Reconciled Findings (informational)

No stale-open findings were found: none of the five done reports contain a `**Findings resolved:**` line referencing any FIND-SPRINT-005-* ID. All four findings carry empty `resolved_by:` fields in the findings file and are correctly triaged above as open items.
