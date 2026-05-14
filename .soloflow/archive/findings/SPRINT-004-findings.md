---
sprint: SPRINT-004
pending_count: 1
last_updated: "2026-05-14T14:59:55.944Z"
---
# Findings Queue

## FIND-SPRINT-004-1
- **source:** SPRINT-004 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:1395-1405
- **description:** Inner for...of over p.childNodes always breaks on the first iteration — the loop shape misleadingly implies multi-iteration. Both branches (text-node strip and element-node innerHTML fallback) unconditionally break after handling the first child. The loop is effectively const n = p.firstChild; if (n) { ... } but reads as if it might iterate further.

Suspected tasks: TASK-010
- **suggested_action:** Replace the for...of loop with a direct first-child check using p.firstChild and an if/else-if on nodeType. Same behavior, clearer intent — readers will not waste cycles wondering why the body always breaks.
- **resolved_by:** 
