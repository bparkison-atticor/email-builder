---
sprint: SPRINT-006
pending_count: 2
last_updated: 2026-06-30T15:10:00.000Z
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

## FIND-SPRINT-006-2
- **source:** TASK-018 (code-reviewer)
- **type:** bug
- **severity:** low
- **status:** open
- **location:** index.html (buildPromoJsonLd ~1622 showWarn call; render ~2432 showWarn overwrite)
- **description:** buildPromoJsonLd()'s catch branch calls showWarn(humanizePromoError(e.message)) to surface a serialization failure, but buildPromoJsonLd is invoked from buildMjml() at the top of render() (line 2406), and render() unconditionally calls showWarn(warnings.join(' · ')) at line 2432 afterward — clobbering any warning the promo path set. The humanized promo error can therefore never reach the user via this code path. In practice the branch is currently unreachable: serializePromoCard only ever receives trimmed strings (headline/imageUrl/url), and JSON.stringify of a plain string-valued object cannot throw, so humanizePromoError + the catch are effectively dead code at the live call site. The latent trap surfaces the moment a non-string field (e.g. a wired-up price object) can reach JSON.stringify. CLAUDE.md's humanization convention is still satisfied (a named humanizer exists and never leaks raw exception text).
- **suggested_action:** Either have buildPromoJsonLd push its humanized message into render()'s warnings[] aggregation instead of calling showWarn directly (so it survives the line 2432 join), or document that the catch is a defensive guard for future non-string fields. Prefer the former if/when price input is wired.
- **resolved_by:**
