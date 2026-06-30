---
sprint: SPRINT-006
pending_count: 1
last_updated: 2026-06-30T14:39:39.684Z
---

# Findings Queue

## FIND-SPRINT-006-1
- **source:** TASK-017 (verifier)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:2516
- **description:** When both promo image URL and destination URL are non-empty but use http:// (two simultaneous format errors), runCopyAction surfaces only formatErrors[0] (image) and marks only that field invalid; the destination URL stays unmarked until the image is corrected, requiring a second copy attempt to reveal it. Required-field aggregation (missing[]) does not have this limitation since it loops all entries. This is a minor UX sequencing nuance and does not violate any acceptance criterion (AC#2 specifies surfacing "a format error" singular).
- **suggested_action:** Optionally mark all offending fields invalid even though only the first message is shown, mirroring the missing[] loop, so the user sees both red fields at once.
- **resolved_by:**
