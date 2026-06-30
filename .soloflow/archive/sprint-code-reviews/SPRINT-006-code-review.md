---
sprint: SPRINT-006
findings_count:
  critical: 0
  important: 0
  minor: 2
---

# Sprint Code Review: SPRINT-006

## Scope
- Base: 1fc16940c5b40857706737860a4d2fa565bc768a
- Tasks reviewed: [TASK-016, TASK-017, TASK-018, TASK-019]
- Files changed: 1 source file (index.html)
- Cross-task hotspots: [index.html] — all four tasks edit the single-file app; the gmail-promo feature is one logical PR

## Findings queued
2 new findings appended to `.soloflow/active/findings/SPRINT-006-findings.md` for the next `/sf:compound` run. Severity breakdown: critical=0, important=0, minor=2.

### Minor
- FIND-SPRINT-006-3 — Forward-looking dead code: serializePromoCard price/priceCurrency branch + ~4 harness fixtures test an app-unreachable path (no UI supplies price; only caller passes headline/imageUrl/url).
- FIND-SPRINT-006-4 — UTM / no-click-tracking guidance triplicated across three slices (promoUrl field hint, ops-docs <li>, render-time advisory).

## Notes (no finding)
- JSON-LD injection escaping is sound: serializePromoCard escapes `<` to `<`, which correctly blocks `</script>` breakout inside an `application/ld+json` script block (JSON.stringify already escapes `"`/`\`/control chars). Security surface for the combined change is clean.
- Toggle reuse is coherent: promo toggle uses createModuleToggle (matches CTA, satisfies the IDEA-003 reusable-factory direction). isHttpsUrl is shared between validatePromoFields and the render advisory — no duplication.
- CLAUDE.md humanization convention satisfied: humanizePromoError is a named humanizer that never leaks raw exception text (its reachability is already tracked in FIND-SPRINT-006-2).
- Preview-only Handlebars over the JSON-LD block follows the existing app-wide token model (copied output is not Handlebars-processed); not a new cross-task issue.
