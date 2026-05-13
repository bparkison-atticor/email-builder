---
sprint: SPRINT-003
pending_count: 1
last_updated: 2026-05-13T14:21:08.000Z
---

# Findings Queue

## FIND-SPRINT-003-1
- **source:** TASK-007 (code-reviewer)
- **type:** claude-md
- **severity:** low
- **status:** open
- **location:** CODE-PATTERNS.md:37
- **description:** The `applyTestData` entry's "Registered helpers" list reads `#equals, #notEquals, #greaterThan, #lessThan, insert, formatDate` and does not mention the newly registered `#and` / `#or` variadic block helpers shipped in TASK-007. The banner comment inside `index.html` (~line 717) is now the authoritative list; CODE-PATTERNS.md has drifted one task behind.
- **suggested_action:** Append `, #and, #or` to the registered-helpers list in CODE-PATTERNS.md line ~37 so future readers don't think these helpers are unregistered. CODE-PATTERNS.md was in `files_readonly` for TASK-007, which is why the executor could not fix it in-task.
- **resolved_by:**
