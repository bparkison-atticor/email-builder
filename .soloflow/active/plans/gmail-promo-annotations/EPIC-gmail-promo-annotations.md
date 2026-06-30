---
epic: gmail-promo-annotations
created: 2026-06-30T00:00:00Z
status: active
originating_ideas: [IDEA-004]
---

# Gmail Promotions Tab Annotation Injection

## Objective

Let a marketer optionally emit a Gmail Promotions-tab `PromotionCard` JSON-LD annotation from the Email Builder, so a campaign can surface a deal image, headline, and click-through directly in Gmail's Promotions grid — produced from the same single-file builder that already generates the SendGrid HTML.

## Scope

- In scope:
  - A new collapsible "Gmail Promo Tab" module card placed second in the form panel (after Preheader), driven by the existing `createModuleToggle` factory (toggle state persisted, field values cleared on load).
  - PromotionCard-only annotation: required `@context`, `@type`, `image` (HTTPS), `url` (HTTPS); optional `headline`, `price` (serialized as a string), `priceCurrency`.
  - Blocking copy-time validation (headline, image URL, destination URL — all required; image + destination must be `https://`) and a non-blocking `#warn` UTM advisory.
  - JSON-LD injection into `buildMjml()` as a second `<mj-raw>` inside `<mj-head>`, gated on the toggle being ON and validation passing; serialization errors humanized to `#warn`.
  - A static ops-prerequisite documentation surface inside the promo card (sender registration emails + Google form URL, image-card outreach address, SPF/DKIM/DMARC, sender reputation, per-sender caching, UTM-in-url note, link to the Promotions Annotation Preview tool).

- Out of scope:
  - Any annotation type other than PromotionCard (no DiscountOffer, no Product).
  - Date fields (`availabilityStarts`/`availabilityEnds`) — these belong to DiscountOffer, not PromotionCard, and are explicitly excluded.
  - Persisting promo field values across reloads (deliberately cleared each load to avoid stale campaign metadata).
  - SendGrid send integration, domain allowlisting automation, or any backend.
  - New CDN dependencies or a build step.

## Success Signal

A marketer toggles "Gmail Promo Tab" on, fills headline + HTTPS image URL + HTTPS destination URL, clicks Copy HTML, and the copied SendGrid-ready HTML contains a valid `<script type="application/ld+json">` PromotionCard block in `<head>`; with the toggle off, the HTML is byte-for-byte the pre-feature output. The ops doc inside the card tells them exactly which Google registration steps must happen before Gmail will render the card.
