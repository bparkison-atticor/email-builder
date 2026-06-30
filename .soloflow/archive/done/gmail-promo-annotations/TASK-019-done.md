---
id: TASK-019
sprint: SPRINT-006
epic: gmail-promo-annotations
status: done
summary: "Add a static ops-prerequisite docs block inside the promo card (#promoBody): sender registration, image-card outreach, SPF/DKIM/DMARC, reputation, caching, UTM note, and a link to Google's Promotions Annotation Preview tool. Purely static, no JS, no output change."
executor_loops: 0
code_review_rounds: 0
visual_mobile: not_applicable
visual_web: not_applicable
---

# TASK-019 — Ops Prerequisite Documentation Surface

## Outcome
Inserted a static `.promo-ops hint` block at TASK-016's reserved comment slot inside `#promoBody`, after the destination-URL field. Implemented commit `f879f2c`. Branch `soloflow/run-20260630-103037-SPRINT-006`.

## Changes (index.html)
- Markup: `.promo-ops hint` div with a `<strong>` heading and `<ul>` listing registration (`schema.whitelisting+sample@gmail.com` + Google form), image-card outreach (`p-Promo-Outreach@google.com`), SPF/DKIM/DMARC, sender reputation, per-sender caching, the UTM-in-url note, and a hardened external link (`target="_blank" rel="noopener noreferrer"`) to `developers.google.com/workspace/gmail/promotab/preview`.
- CSS: two scoped rules (`.promo-ops ul`, `.promo-ops li`) co-located with the `.hint` style, reusing existing hint color/size.
- No JS, no `els` entries, no listeners, no localStorage, `buildMjml()` untouched.

## Verification
- Verifier verdict: APPROVED — all 4 ACs met; required strings present; block in correct DOM position inside #promoBody; diff confined to markup + CSS (no JS API references); `buildMjml` absent from diff; external link hardened.
- Code review: CLEAN — markup+CSS only, reuses `.hint`/`<strong>`/`<code>` conventions, no injection surface, link correctly hardened.
- Tests: NO_TESTS_NEEDED — plan declares `test_strategy.needed: false`; static informational HTML with no logic/state. Presence-of-strings acceptance greps suffice.
