---
sprint: SPRINT-005
pending_count: 1
last_updated: 2026-06-02T00:00:00Z
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
