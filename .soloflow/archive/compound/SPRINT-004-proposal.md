---
sprints: [SPRINT-004]
span_label: SPRINT-004
created: 2026-05-14T00:00:00.000Z
counters_start:
  ideas: 3
summary:
  cleanups: 1
  backlog_tasks: 0
  claude_md: 0
  soloflow_improvements: 0
---

# Compound Proposal — SPRINT-004

## A. Clean-up items (execute now)

### A1. Replace always-break `for...of` loop with a direct `p.firstChild` check
- **Summary:** The `for...of` loop at `index.html:1395–1405` in `richTextToMjText` always breaks on its first iteration — replacing it with a plain `if / else if` on `p.firstChild` communicates the intent without misleading readers.
- **Source-Sprint:** SPRINT-004
- **Rationale:** Both branches in the current loop (`TEXT_NODE` strip and element-node `innerHTML` fallback) contain an unconditional `break`, so the loop body executes at most once. Future readers spending time tracing whether a second iteration is possible is pure waste. The `if / else if` shape makes "examine the first child only" unambiguous.
- **Blast radius:** `index.html` lines 1395–1405 only. Zero behavioral change — identical observable output. Risk: **trivial**.
- **Source:** FIND-SPRINT-004-1 (sprint-code-reviewer, SPRINT-004); confirmed against `index.html:1395–1405`.
- **Proposed change:**
  ```diff
  -        // Strip the leading bullet character from the first leading text node.
  -        for (const n of p.childNodes) {
  -          if (n.nodeType === Node.TEXT_NODE) {
  -            if (BULLET_PREFIX.test(n.nodeValue.trimStart())) {
  -              n.nodeValue = n.nodeValue.replace(/^\s*/, '').replace(BULLET_PREFIX, '');
  -            }
  -            break;
  -          }
  -          // Leading element node with no prior text — fall back to innerHTML strip.
  -          p.innerHTML = p.innerHTML.replace(BULLET_PREFIX, '');
  -          break;
  -        }
  +        // Strip the leading bullet character from the first child of the paragraph.
  +        const firstChild = p.firstChild;
  +        if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
  +          if (BULLET_PREFIX.test(firstChild.nodeValue.trimStart())) {
  +            firstChild.nodeValue = firstChild.nodeValue.replace(/^\s*/, '').replace(BULLET_PREFIX, '');
  +          }
  +        } else if (firstChild) {
  +          // Leading element node with no prior text — fall back to innerHTML strip.
  +          p.innerHTML = p.innerHTML.replace(BULLET_PREFIX, '');
  +        }
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** `index.html:1395-1405` confirms both branches of the `for...of` body unconditionally `break`, so the rewrite to `if / else if` on `p.firstChild` is behavior-preserving within an isolated 11-line block with zero external callers.

## B. Backlog tasks (refine into execution-ready plans)

_No items._

## C. CLAUDE.md / CODE-PATTERNS.md improvements (apply now)

_No items._
