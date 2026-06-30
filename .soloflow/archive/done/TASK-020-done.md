---
id: TASK-020
status: done
summary: "Escape 7 in-body literal </script> strings (comments + harness fixtures from SPRINT-006) as <\\/script> so the HTML parser no longer truncates the inline module script; add Section 7 regression guard. Fixes blank preview + dead promo toggle."
executor_loops: 1
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
investigation_confidence: high
---

# Bugfix TASK-020 — Literal </script> truncated the inline module script

## Root cause
The HTML tokenizer ends a `<script>` at the first literal `</script>` in its text content, ignoring JS comment/string context. SPRINT-006 introduced 7 raw `</script>` substrings inside the single inline `<script type="module">` (comments describing serializePromoCard's escaping, and the XSS-injection harness fixtures testing it). The earliest closed the script early, so `render()`, the promo toggle wiring, and `clearPromoFields()` never executed → blank preview + non-interactive Gmail Promo Tab.

The irony: serializePromoCard's *output* escaping (`<` → `<`, `<\/script>` return) was always correct; it was the prose describing it and the fixtures exercising it that were written with raw `</script>`. node-based verification during SPRINT-006 never caught this because node never parses the file as HTML.

## Fix (commit f614e6f)
- Replaced every in-body literal `</script>` with `<\/script>` — a byte-identical runtime string, parser-safe (the `\/` stops the tokenizer matching the end tag; in `//` comments the backslash is inert).
- Left untouched: the two CDN `<script src>` tags in `<head>`, the single real module-closing `</script>`, and serializePromoCard's output-escaping logic.
- Added Section 7 regression guard in renderTestHarness(): asserts the startup `render()` ran (`lastHtml` non-empty), `promoToggle` is defined, and `.seg-promo .seg-head .module-toggle` is in the DOM — a complete tripwire for any future truncation in the harmful zones.

## Verification
- Verifier: APPROVED_WITH_DEFERRED. Independent node scan: exactly 3 raw `</script>` in the file (lines 8, 9 CDN + 2929 real close); module body (811–2928) has ZERO; body syntax-checks clean as ESM. serializePromoCard byte-unchanged; extracted under node, a field value containing a real `</script>` still yields output with no raw closing tag and round-trips. Section 7 guards confirmed present.
- Test-writer: NO_TESTS_NEEDED — Section 7 sufficient; an own-source `</script>`-absence check would be self-defeating (truncation removes the string from textContent → false PASS).
- DEFERRED (low, testing, in human-review-queue): browser walkthrough — load the page, confirm the template renders, the toggle is interactive, and Section 7 shows PASS. Cannot run headlessly; the grep-based ground-truth is decisive.

## Follow-up worth considering
Add the `<\/script>` convention for in-script literal closing tags to CODE-PATTERNS.md so this class of bug doesn't recur, and consider that node-only verification cannot catch HTML-parse-layer faults in this single-file app — an actual page-load smoke check would have caught it.
