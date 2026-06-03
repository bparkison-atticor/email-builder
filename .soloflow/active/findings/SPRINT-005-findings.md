---
sprint: SPRINT-005
pending_count: 0
last_updated: 2026-06-03T19:20:00-04:00
---

# Findings Queue

## FIND-SPRINT-005-1
- **source:** TASK-015 (verifier)
- **type:** anti-pattern
- **severity:** medium
- **status:** resolved
- **location:** index.html:1893 (safeAttrHtml)
- **description:** `safeAttrHtml` runs against the raw `testData` object, but `buildTestDataContext` later seeds extra keys onto the Handlebars context (notably `unsubscribe: '#unsubscribe-preview'` at index.html:1660) that are NOT present in `testData`. Because the seed happens after `safeAttrHtml`, any attribute token whose value is provided only by the seeded context (not raw test data) is wrongly treated as "missing" and neutralised. Compounding this, the inner `{{…}}` regex matches the inside of triple-brace `{{{token}}}` tokens, leaving stray outer braces. Together these turn `href="{{{unsubscribe}}}"` (used in every template footer) into `href="{#}"` in the preview. The preview substitution layer (`applyTestData`) and the context-construction layer (`buildTestDataContext`) disagree about what "resolves," because they consult two different views of the data. A single source of truth for "will this token resolve" (or running safeAttrHtml against the seeded root, with triple-brace awareness) would prevent this whole class of mismatch.
- **suggested_action:** Resolve attribute tokens against the same seeded root used by `buildTestDataContext` (or expose a shared `willResolve(path)` predicate), and make the token regex triple-brace-aware so `{{{x}}}` is matched as a single token rather than `{` + `{{x}}` + `}`.
- **resolved_by:** verifier — status-sync: TASK-015 (commit 03e9ccc: applyTestData now passes seeded root with `unsubscribe`; safeAttrHtml gained a dedicated triple-brace pass plus negative lookbehind/lookahead on the double-brace regex — both halves of this finding are fixed and SAFE_ATTR_FIXTURES now cover them)
