---
sprint: SPRINT-006
pending_count: 4
last_updated: "2026-06-30T15:23:22.973Z"
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

## FIND-SPRINT-006-3
- **source:** SPRINT-006 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:1611
- **description:** Forward-looking dead code spanning the JSON-LD serializer and its harness. serializePromoCard accepts price/priceCurrency and branches on them (index.html:1619-1622), and Section 5 of the test harness ships 4 fixtures exercising price/price=0/priceCurrency/absent-price (index.html ~2140-2190). No UI input collects price, and the only production caller, buildPromoJsonLd(), invokes serializePromoCard({ headline, imageUrl, url }) with no price argument (index.html:1645). The entire price code path and ~4 of 6 Section-5 fixtures test behavior the running app cannot reach. Viewed across TASK-018 as one feature slice, this is anticipatory surface for a price field that was never built.
- **suggested_action:** Either wire a promo price input (a #promoPrice field feeding buildPromoJsonLd, with matching validation) so the price path becomes live, or strip the price/priceCurrency parameter and its 4 harness fixtures until that field is actually planned. Keeping untested-against-UI branches invites the non-string serialization trap already noted in FIND-SPRINT-006-2.
- **resolved_by:** 


Suspected tasks: TASK-018

## FIND-SPRINT-006-4
- **source:** SPRINT-006 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:600
- **description:** The same UTM / no-click-tracking guidance is surfaced three times across three slices of the feature, only visible as redundant when the slices are viewed together. (1) promoUrl field hint: "Add UTM params here - Gmail does not click-track this URL" (TASK-016, index.html ~600). (2) ops-docs <li>: "Gmail does not click-track the card URL - add UTM params in the Destination URL above" (TASK-019, index.html ~613). (3) render-time advisory warning pushed when the URL lacks utm_ (TASK-017, index.html ~2466). All three say the same thing; the field hint and the docs li are statically co-visible in the same expanded card.

Suspected tasks: TASK-016, TASK-017, TASK-019
- **suggested_action:** Drop the duplicated static copy in one place - keep the render-time advisory (it is conditional and actionable) plus one static mention, and remove the redundant line from either the field hint or the ops-docs list so the card does not state the same rule twice within one screen.
- **resolved_by:** 
