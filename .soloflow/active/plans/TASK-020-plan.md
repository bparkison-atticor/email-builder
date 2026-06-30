---
id: TASK-020
idea: inline
status: approved
created: 2026-06-30T00:00:00Z
files_owned:
  - index.html
files_readonly: []
acceptance_criteria:
  - criterion: "Reproduction steps no longer trigger the bug — the page boots, a template renders in the preview, and the Gmail Promo Tab toggle appears and is interactive."
    verification: "Serve index.html and load it; the preview pane renders the default template and the .seg-promo card shows an interactive toggle. Ground-truth proxy (no browser headlessly): grep the inline module script body (lines ~810–end) for the literal string '</script>' — it must appear EXACTLY ZERO times before the real closing tag; the only parser-recognizable </script> is the script's actual close. Equivalently: no literal '</script>' (without a backslash before the slash) exists between the opening <script type=\"module\"> and its closing tag."
  - criterion: "The </script>-injection behavior the harness tests is preserved."
    verification: "serializePromoCard's output escaping (the \\u003c replacement and its <\\/script> return) is unchanged. The Section 5 harness fixture still seeds a field value whose RUNTIME string contains '</script>' (written as the escaped source form '<\\/script>') and still asserts serializePromoCard neutralizes it — the test semantics are identical because '<\\/script>' and '</script>' are the same runtime string."
  - criterion: "Regression test exists and passes."
    verification: "A check confirms the inline module script contains no parser-breaking literal </script>; see Implementation Steps step 4."
depends_on: []
estimated_complexity: low
---

# Bugfix: Literal </script> strings in the inline module script truncate the page at load

## Bug Summary

After merging SPRINT-006 (gmail-promo-annotations, IDEA-004), `index.html` renders no template in the preview and the Gmail Promo Tab toggle is non-interactive. Both symptoms share one cause: the single inline `<script type="module">` is silently truncated by the HTML parser partway through, so most of the application JS — including the toggle wiring and the initial `render()` call — never executes.

## Root Cause

The HTML tokenizer ends a `<script>` element at the first literal `</script>` substring in its text content, ignoring JS comment/string context. SPRINT-006 introduced seven new literal `</script>` substrings inside the module body (open ~line 810, intended close ~line 2887): comments at lines **1607, 1623, 1639** and harness-fixture strings/comments at **2120, 2121, 2123, 2124, 2136**. The earliest (line 1607) closes the script there; everything from 1607 to the real close is reparsed as stray markup, so `serializePromoCard`, `buildPromoJsonLd`, the test harness, `render()`, the promo toggle wiring (`createModuleToggle('promo', …)` + `appendChild`), `clearPromoFields()`, and the final `render()` call never run.

`serializePromoCard`'s *output* escaping (the `<` replacement and its `<\/script>` return at ~line 1624) is correct and must NOT be changed — it is the surrounding comments and the harness fixture string literals that were written with a raw `</script>` and break the page.

Confidence: high.

## Reproduction

1. On `main` (HEAD 3216fdb), serve the directory: `python -m http.server 8080 --bind 127.0.0.1`, open `http://127.0.0.1:8080/`.
2. Observe: preview pane is blank (no template renders) and the Gmail Promo Tab toggle does not appear/respond.
3. DevTools → Elements shows content from line ~1607 onward rendered as page DOM rather than inside the script; Console shows no JS error (the script simply ended early).

## Implementation Steps

1. In `index.html`, locate every literal `</script>` occurring INSIDE the inline `<script type="module">` body (between the opening tag ~line 810 and the real closing tag ~line 2887). Per the investigation these are at lines 1607, 1623, 1639, 2120, 2121, 2123, 2124, 2136 — but do NOT trust line numbers; grep the file to find every occurrence and confirm which fall inside the module body.
2. Replace each in-body literal `</script>` with `<\/script>` (insert a backslash before the slash). In `//` comments the backslash is inert text; in string literals `'<\/script>'` is the byte-identical runtime string `</script>`, so behavior is preserved. This includes the injection-test fixture value (e.g. a headline like `'Sale </script><b>injected</b>'` → `'Sale <\/script><b>injected</b>'`) and any check-substring compared against it — update both sides consistently so the assertion still holds.
3. Do NOT modify `serializePromoCard`'s output-escaping logic (the `<` replacement and its already-correct `<\/script>` return). The real closing `</script>` tag at the end of the block must remain a literal `</script>` (it is correct — it is the actual close).
4. Add a regression guard: a new fixture section in `renderTestHarness()` (following the existing Section pattern) that reads its own page source via `document.querySelector('script[type="module"]').textContent` (or `document.documentElement.outerHTML`) and asserts the running script's text contains no parser-breaking literal `</script>`. Because a parser-breaking `</script>` would truncate the script and prevent the harness from running at all, the very fact that the harness executes is itself partial evidence; the explicit fixture makes the guard visible and locks it. (If reading own-source proves impractical in the harness, instead assert that `render()` ran and `promoToggle` is defined and `document.querySelector('.seg-promo .seg-head .module-toggle')` is non-null — i.e. the post-truncation code executed.)
5. After editing, grep the module body to confirm ZERO remaining parser-recognizable literal `</script>` before the real closing tag.

## Acceptance Criteria

- Page boots: a template renders and the promo toggle is interactive (no early script truncation).
- No literal `</script>` (without the `\/` break) remains inside the module script body; the only parser-recognizable close is the real closing tag.
- `serializePromoCard` output escaping unchanged; the `</script>`-injection harness test still asserts neutralization with identical runtime semantics.
- A regression guard locks the "script not truncated" property.
