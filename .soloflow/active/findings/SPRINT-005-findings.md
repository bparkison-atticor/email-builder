---
sprint: SPRINT-005
pending_count: 4
last_updated: "2026-06-02T18:24:20.569Z"
---
# Findings Queue

SPRINT-005 started with missing infra: docker; tests deferred.

## FIND-SPRINT-005-1
- **source:** TASK-009 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:522-553
- **description:** The `#testHarness`-scoped override block is 31-32 lines (522 comment through 553 closing brace), marginally over criterion 5's "<=30 lines" target. The block matches the plan author's own suggested shape (plan lines 79-110) verbatim, is fully id-scoped, and is a strict reduction from the deleted ~100-line block, so the substantive intent (compact, scoped, pass/fail differentiation) is met. The overage is a soft-guideline miss, not a defect.
- **suggested_action:** Optionally collapse two single-property rules onto fewer lines (e.g. combine `.harness-field` and `.harness-field strong`) to land at <=30 if the threshold is treated as hard. Not required for correctness.
- **resolved_by:** 

## FIND-SPRINT-005-2
- **source:** SPRINT-005 (sprint-code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:1897-1915,1917-1971
- **description:** Toggle logic now duplicated across two implementations. TASK-011 added createModuleToggle() (factory: localStorage flip + sync + onChange + space/enter keydown, role=switch, .track), but the pre-existing testDataSwitch (flipTestData/syncTestDataSwitch, lines 1897-1915) is a hand-rolled clone of the exact same widget. TASK-011 even merged .switch and .module-toggle into a single CSS ruleset (diff lines 353-399), and the factory comment says \"Mirror testDataEnabled init\" — confirming they are the same control. Two parallel copies of the same toggle is the canonical cross-task duplication: the factory now has a real consumer (CTA) but the older consumer was never migrated.
- **suggested_action:** Migrate testDataSwitch onto createModuleToggle(). The existing #testDataSwitch is static markup with a custom title attr and lives inside an existing .seg-head; either (a) have the factory accept an existing element / extra attrs, or (b) keep static markup but route flip/sync through a shared helper. Reconcile the localStorage key shape too (testDataEnabled uses emailBuilder.testDataEnabled; factory uses emailBuilder.module.<id>) so a migration does not silently reset users persisted preference.
- **resolved_by:** 



Suspected tasks: TASK-011, TASK-012

## FIND-SPRINT-005-3
- **source:** SPRINT-005 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:1268-1284,1289-1311
- **description:** phoneDigits keepPlus option is dead at birth / contract strain. TASK-003 introduced phoneDigits(value, {keepPlus=true}) and documents that keepPlus:false has no consumer (\"none currently — isValidPhone does its own length check and is intentionally not routed through here\"). All three current call sites (applyLink prefill via buildLinkHref, autoLinkPhones, buildCtaHref via buildLinkHref) use the default keepPlus:true. So the option branch (/\D/g) is currently unreachable, and the one place that strips digits-only (isValidPhone) deliberately bypasses the helper. The abstraction is slightly larger than its consumers need.
- **suggested_action:** Either drop the keepPlus parameter until a real digits-only consumer exists (YAGNI), or route isValidPhone normalization through phoneDigits(v,{keepPlus:false}) so the option earns its place and phone normalization has a single source of truth. Defer unless a future task touches phone validation.
- **resolved_by:** 


Suspected tasks: TASK-003

## FIND-SPRINT-005-4
- **source:** SPRINT-005 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:2172-2180
- **description:** Escape-key handling for the test harness changed priority across the harness refactor. TASK-009 moved the #testHarness Escape check from first-evaluated (it used to early-return before the link/html modals) to a trailing else branch below linkModal and htmlModal. Functionally the harness still closes on Escape when no other modal is open, which matches the shared modal idiom; but if a marketer somehow has the harness plus a link/html modal stacked, Escape now dismisses the inner modal first and leaves the harness open — a behavior change, not a regression. Calling it out only because the reorder is invisible in any single task diff.

Suspected tasks: TASK-009
- **suggested_action:** No action needed if stacked-modal state is unreachable (harness is a dev-only Ctrl+Shift+T overlay). If it can stack, decide intended Escape order explicitly. Low priority.
- **resolved_by:** 
