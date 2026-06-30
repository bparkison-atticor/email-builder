---
id: IDEA-004-research
idea: IDEA-004
created: 2026-06-30T00:00:00Z
---

# Research Report: Gmail Promotions Tab Annotation Injection

## Library Comparison

### Slice 1 & 2: Promo form panel + validation

No external libraries needed. The existing `createModuleToggle` factory, `markInvalid`/`showCopyError` pattern, native `<input type="date">`, and `JSON.stringify` cover all UI and serialization needs. No CDN import required.

### Slice 3: JSON-LD injection into mj-head

No external libraries needed. `JSON.stringify` produces the JSON-LD body. The injection uses the existing `buildMjml()` string-concatenation pattern — no additional npm packages or schema.org helpers required.

### Slice 4: Ops documentation surface

No external libraries needed. Static HTML only.

---

## Best Practices

### Schema.org PromotionCard Serialization

- Use `"@context": "http://schema.org/"` (trailing slash variant — Google's own reference examples use this form). Some sources use `"https://schema.org"` (no trailing slash) — the Google reference page itself shows both; the trailing-slash `http://` form is what Google's promotab reference page documents.
- `price` is typed as `Text` in Google's reference, not a number — serialize it as a string, e.g., `"129"`, not `129`. Source: [Google Email Promotions Reference](https://developers.google.com/workspace/gmail/promotab/reference)
- Keep headline to 1–2 lines (~60–80 characters). Longer text may be truncated in the inbox preview card.
- Do not include `availabilityStarts` / `availabilityEnds` on PromotionCard itself — those date fields belong to `DiscountOffer`, not `PromotionCard`. PromotionCard has no date fields in the Google spec; date expiry logic lives in `DiscountOffer`. Source: [Google Email Promotions Reference](https://developers.google.com/workspace/gmail/promotab/reference)
- All image URLs must be HTTPS. Source: [Gmail Promo Tab Best Practices / marketingagent.blog](https://marketingagent.blog/2025/10/14/gmail-deal-cards-2026-the-complete-action-ready-playbook-for-turning-the-promotions-tab-into-a-high-intent-conversion-surface/)

### MJML mj-raw Injection

- Place `<mj-raw>` inside `<mj-head>`. Per MJML official docs: "If placed inside `<mj-head>`, its content will be added at the end of the HTML `<head>` tag." Source: [MJML Documentation](https://documentation.mjml.io/)
- `mj-raw` does not parse or escape its content — it passes through verbatim. The MJML engine does not HTML-encode or reformat the script body.
- **Critical minify gotcha**: If `mjml2html` is called with `{ minify: true }`, the HTML minifier will try to process the `<script>` block content and can break JSON-LD containing `<` or `>` characters. Mitigation: wrap the content in `<!-- htmlmin:ignore -->` comments, or avoid `minify: true` for email output (standard for email builders). The EmailBuilder app does not appear to use the minify option (no evidence of it in the existing codebase), so this is likely a non-issue, but worth confirming at implementation time. Source: [MJML Documentation](https://documentation.mjml.io/), [MJML GitHub Issue #1638](https://github.com/mjmlio/mjml/issues/1638)
- There are no version-specific escaping behaviors documented for MJML 4.x. The mjml-python port had a bug where HTML entities were unescaped, but the canonical JS `mjml` package does not have this reported issue. Source: [mjml-python commit](https://github.com/FelixSchwarz/mjml-python/commit/8d410b7a500703080bb14ed7e3d2663fe16767e6)

### SendGrid Code Editor

- The Code Editor "doesn't add excess code or modify your code" per Twilio docs. Source: [SendGrid Editor Docs](https://www.twilio.com/docs/sendgrid/ui/sending-email/editor)
- No official documentation or community evidence confirms SendGrid strips `<script type="application/ld+json">` from the `<head>` when using the Code Editor path.
- A known historical issue: SendGrid's SMTP pipeline enforces Quoted-Printable encoding, which caused problems with Gmail Email Markup for some users in 2018–2019 (GitHub issue #579, sendgrid-php). This is a Content-Transfer-Encoding concern for SMTP sends, not a Code Editor concern — the EmailBuilder app pastes HTML into SendGrid's Code Editor, which takes a different pipeline. Source: [sendgrid-php issue #579](https://github.com/sendgrid/sendgrid-php/issues/579)
- **Unconfirmed risk**: No definitive public evidence either confirming or denying that SendGrid's mail-send API path sanitizes `<script>` tags. The Code Editor UI path is paste-in HTML; the API path uses the `content[].value` field. Neither is documented as stripping scripts. Community experience from email tool vendors (Klaviyo, Braze) does not flag SendGrid as a stripper — they flag drag-and-drop editors generically. Source: [marketingagent.blog](https://marketingagent.blog/2025/10/14/gmail-deal-cards-2026-the-complete-action-ready-playbook-for-turning-the-promotions-tab-into-a-high-intent-conversion-surface/)

### Gmail Annotation Rendering

- Gmail uses internal quality filters and frequency limits beyond just valid JSON-LD — correct markup is necessary but not sufficient. Source: [Google Promotab Overview](https://developers.google.com/workspace/gmail/promotab/overview)
- Since 2024, Gmail added automatic annotation extraction from email body content using AI. This means a sender may get annotations rendered without explicit JSON-LD, but it also means Gmail may override manually-coded markup with its own extraction. Source: search result summary from multiple ESP knowledge bases.
- Deal Annotations (text-only, no image) do not require allowlist registration. PromotionCard with an image does require allowlisting per multiple sources. Source: [EmailOctopus KB](https://help.emailoctopus.com/article/423-gmail-annotations-in-the-promotions-tab)

---

## API Documentation

**Service:** Google Gmail Promotions Tab Annotations
**Auth:** Sender allowlist (not API key auth — allowlisting is done via email/form registration)
**Key endpoints/resources:**
- Overview and quickstart: `https://developers.google.com/workspace/gmail/promotab/overview`
- Full field reference: `https://developers.google.com/workspace/gmail/promotab/reference`
- Preview tool: `https://developers.google.com/workspace/gmail/promotab/preview` (interactive code editor on the page itself — not a separate URL; the page contains an embedded live editor)
- Troubleshooting: `https://developers.google.com/workspace/gmail/promotab/troubleshooting`
- Sender registration form: `https://docs.google.com/a/google.com/forms/d/e/1FAIpQLSfT5F1VJXtBjGw2mLxY2aX557ctPTsCrJpURiKJjYeVrugHBQ/viewform`
- Registration sample email address: `schema.whitelisting+sample@gmail.com`
- Outreach contact: `p-Promo-Outreach@google.com`

**Rate limits:** N/A — no API calls; all logic is client-side JSON-LD in email head.

**PromotionCard field reference:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `@context` | string | Yes | `"http://schema.org/"` |
| `@type` | string | Yes | `"PromotionCard"` |
| `image` | URL | Yes | HTTPS, PNG or JPEG, 256×256 min, see aspect ratios |
| `url` | URL | Yes | HTTPS destination URL |
| `headline` | Text | No | 1–2 line description |
| `price` | Text | No | Numeric price as string |
| `priceCurrency` | Text | No | ISO 4217 3-letter code (e.g., `"USD"`) |
| `discountValue` | Text | No | Amount subtracted from price |
| `position` | Text | No | Carousel ordering |

Source: [Google Email Promotions Reference](https://developers.google.com/workspace/gmail/promotab/reference)

**Image requirements:**
- Format: PNG or JPEG only (no GIF, no WebP)
- HTTPS required
- Minimum dimensions: 256×256 px
- Maximum dimensions: 4096×4096 px
- Supported aspect ratios: 4:5, 1:1, or 1.91:1 (Gmail center-crops automatically)
- For single-image preview: 1.91:1 recommended
- Carousel: all cards must use the same aspect ratio; each card needs a unique URL
- No text overlays recommended

Source: [Google Email Promotions Reference](https://developers.google.com/workspace/gmail/promotab/reference), [Braze Gmail Promotions docs](https://www.braze.com/docs/user_guide/channels/email/html_editor/gmail_promotions_tab), [Email on Acid blog](https://www.emailonacid.com/blog/article/email-development/how-to-display-images-and-offer-information-in-the-gmail-promotions-tab-free-tool/)

**Minimal valid PromotionCard JSON-LD example:**

```json
{
  "@context": "http://schema.org/",
  "@type": "PromotionCard",
  "image": "https://example.com/promo-image.jpg",
  "url": "https://example.com/promo"
}
```

Full example with optional fields:

```json
{
  "@context": "http://schema.org/",
  "@type": "PromotionCard",
  "image": "https://cdn.brand.com/promo/hero.jpg",
  "url": "https://www.brand.com/campaign",
  "headline": "Winter Sale — Up to 40% Off",
  "price": "129",
  "priceCurrency": "USD"
}
```

Source: [Google Email Promotions Reference](https://developers.google.com/workspace/gmail/promotab/reference), [marketingagent.blog](https://marketingagent.blog/2025/10/14/gmail-deal-cards-2026-the-complete-action-ready-playbook-for-turning-the-promotions-tab-into-a-high-intent-conversion-surface/)

**Service:** SendGrid Domain Authentication
**Auth:** DNS CNAME records delegated to SendGrid
**Key setup:**
- SendGrid Domain Authentication configures SPF (via `include:sendgrid.net`), DKIM (two selectors: s1, s2), and DMARC records via DNS CNAMEs
- "Automated Security" mode creates a sending subdomain (e.g., `em123.yourdomain.com`) and handles record maintenance
- Manual mode available for custom DNS setups
- DNS propagation: up to 48 hours
- Docs: `https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication`

Source: [SendGrid Domain Authentication Docs](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication)

---

## Prior Art

**Source:** [MJML GitHub Issue #1638 — "Allow scripts in header of mail - Google Email Markup"](https://github.com/mjmlio/mjml/issues/1638)
**Approach:** User needed to inject `<script type="application/ld+json">` for Google Email Markup (EmailMessage schema/actions) into the MJML head. The issue was opened in 2019 and referenced the `mj-raw` inside `mj-head` pattern.
**Relevance:** Confirms the pattern predates IDEA-004 and was recognized as the right approach by the MJML community. The issue closed, suggesting `mj-head` + `mj-raw` was an accepted resolution. However, the full discussion thread was not accessible during research.

**Source:** [Freshinbox — "All You Need to Know About Gmail's Promotion Card Image Previews"](https://freshinbox.com/blog/gmails-promotion-card-and-promotion-card-and-promotion-tab-changes/)
**Approach:** Pre-2020 documentation of the PromotionCard type when Google first introduced it. Notes that there is no whitelist or registration for PromotionCard per se, and that anyone can send the markup. Recommended image: 538×138 px with 3.9 aspect ratio.
**Relevance:** The "no whitelist" claim conflicts with more recent sources (2023–2025) from EmailOctopus, Braze, and marketingagent.blog, all of which say image-based annotations require domain registration. The Freshinbox post appears to be outdated on the registration question. Current consensus is that image-based PromotionCard annotation rendering requires domain allowlisting.

**Source:** [sendgrid-php GitHub Issue #579 — "Support: Email actions Markup for Gmail and Google Inbox"](https://github.com/sendgrid/sendgrid-php/issues/579)
**Approach:** Developer reported Gmail Email Markup not working when sent via SendGrid REST API. Suspected cause: SendGrid enforcing Quoted-Printable encoding, which may interfere with markup parsing.
**Relevance:** This is the SendGrid-specific risk case. The issue is from 2018 and was filed against the SMTP/API path, not the Code Editor paste path. The EmailBuilder app uses the Code Editor paste path (paste-in HTML), which skips the API encoding concern. The QP encoding issue is specific to `Content-Transfer-Encoding` settings in the API payload, not to HTML content sanitization.

**Source:** [Braze — Gmail Promotions Tab](https://www.braze.com/docs/user_guide/channels/email/html_editor/gmail_promotions_tab)
**Approach:** Braze documents ESP-specific behavior: their platform cannot insert link tracking on links in the email header/annotation section, so promo card clicks bypass ESP analytics. UTM parameters must be embedded in the `url` field directly.
**Relevance:** Directly applicable to EmailBuilder — the `url` field in the PromotionCard JSON-LD will need UTM parameters baked in, since SendGrid click-tracking wraps links in the email body but likely cannot wrap the annotation `url` value in the JSON-LD head. The marketer should be warned (or the UI should offer a hint) that annotation URLs are not click-tracked through SendGrid unless UTM parameters are added manually.

---

## Answered Questions

**Q:** Which annotation type(s) should ship first?
**A:** Already answered in the idea (PromotionCard only). Research confirms PromotionCard is the simpler type — only `image` and `url` are required, no discount fields. DiscountOffer requires `description`, `discountCode`, or `endDate` (at least one), plus date formatting complexity with `availabilityStarts`/`availabilityEnds`. PromotionCard has no date fields, eliminating the past-date expiry risk for the first implementation.
**Source:** [Google Email Promotions Reference](https://developers.google.com/workspace/gmail/promotab/reference)

**Q:** Does MJML's mj-raw inside mj-head pass the script block verbatim into the compiled HTML `<head>` without modification?
**A:** Yes. Official MJML docs state: "If placed inside `<mj-head>`, its content will be added at the end of the HTML `<head>` tag." The content is not parsed, HTML-encoded, or reformatted by the MJML engine. One edge case exists: if `minify: true` is passed to `mjml2html`, the HTML minifier may process `<script>` block content and break JSON containing `<` or `>`. Standard email use does not enable minify, and the EmailBuilder app shows no evidence of using it.
**Source:** [MJML Documentation](https://documentation.mjml.io/), [mjml-raw npm](https://www.npmjs.com/package/mjml-raw)

**Q:** Does SendGrid's Code Editor and send pipeline preserve `<head>` JSON-LD verbatim?
**A:** Strongly implied yes for the Code Editor path. SendGrid's own docs state the Code Editor "doesn't add excess code or modify your code." No documented evidence of SendGrid stripping `<script type="application/ld+json">` from head content. The known Quoted-Printable encoding issue applies to the SMTP API path, not the Code Editor. No external community source (ESP vendor docs, GitHub issues) identifies SendGrid Code Editor as a head-content stripper.
**Source:** [SendGrid Editor Docs](https://www.twilio.com/docs/sendgrid/ui/sending-email/editor), [sendgrid-php issue #579](https://github.com/sendgrid/sendgrid-php/issues/579)

**Q:** What is the authoritative Gmail sender registration URL?
**A:** Two-step process:
1. Send a sample production email containing the markup to `schema.whitelisting+sample@gmail.com`
2. Complete the registration form at: `https://docs.google.com/a/google.com/forms/d/e/1FAIpQLSfT5F1VJXtBjGw2mLxY2aX557ctPTsCrJpURiKJjYeVrugHBQ/viewform`

For image-based annotation questions specifically, contact `p-Promo-Outreach@google.com` with sending domain(s), landing page URLs, Privacy Policy link, and sample emails.
**Source:** [Gmail Email Markup — Registering with Google](https://developers.google.com/workspace/gmail/markup/registering-with-google), [EmailOctopus KB](https://help.emailoctopus.com/article/423-gmail-annotations-in-the-promotions-tab)

**Q:** What is the Gmail Promotions Annotation Preview tool URL?
**A:** The tool is an embedded live code editor on the page `https://developers.google.com/workspace/gmail/promotab/preview`. It is not a separate web app — it lives inline on that documentation page. It validates image quality, syntax, aspect ratios/sizes, formats, and URLs.
**Source:** [Gmail Promotab Preview](https://developers.google.com/workspace/gmail/promotab/preview)

---

## Validated Assumptions

**Assumption:** MJML's mj-raw inside mj-head passes the script block verbatim into the compiled HTML `<head>` without modification.
**Evidence:** Confirmed by official MJML documentation: "If placed inside `<mj-head>`, its content will be added at the end of the `<head>` tag." Content is not parsed by the MJML engine. The existing EmailBuilder codebase already uses this exact pattern for meta tags.
**Updated confidence:** high
**Source:** [MJML Documentation](https://documentation.mjml.io/)

**Assumption:** Gmail's Promotions tab will accept JSON-LD injected via this method when the sender is properly registered and SPF/DKIM/DMARC passes — the prior SFMC failure was caused by head mangling, not by the JSON-LD content or sender configuration.
**Evidence:** Partially supported. MJML mj-raw preserves the script verbatim (head mangling is avoided). Gmail's acceptance requires: (a) valid JSON-LD per spec, (b) HTTPS image, (c) non-past end date — PromotionCard has no end date, so (c) is not applicable, (d) domain allowlisting for image-based annotations, (e) SPF+DKIM passing, (f) DMARC recommended. The SFMC failure was almost certainly head mangling. However, the annotation will still silently do nothing until domain allowlisting is completed with Google.
**Updated confidence:** medium-high — the mechanism is sound; rendering in Gmail is gated on sender registration and reputation which cannot be validated from the codebase.
**Source:** [Google Promotab Overview](https://developers.google.com/workspace/gmail/promotab/overview), [Gmail Email Markup Registration](https://developers.google.com/workspace/gmail/markup/registering-with-google)

**Assumption:** The .seg-body max-height: 1000px ceiling can accommodate the promo field group.
**Evidence:** PromotionCard-only scope (no discount code, no discount value field, no type picker) reduces the field count to: headline, image URL, URL. That is 3 fields plus the ops prerequisites block. Well under 1000px.
**Updated confidence:** high

---

## Risks

**Risk 1 — PromotionCard image registration is mandatory for rendering (not just recommended)**
Multiple sources (EmailOctopus, Braze, Validity, marketingagent.blog) confirm that image-based annotations — which is what PromotionCard is — require domain allowlisting via `p-Promo-Outreach@google.com` and/or the Google form. Google's own troubleshooting page confirms "a variety of factors affect whether email annotations are shown, including quality filters and frequency limits." There is no guarantee of display even after allowlisting. The ops prerequisite documentation surface (Slice 4) is therefore not optional — it is the primary blocker for the feature to work at all.

**Risk 2 — Gmail's AI auto-extraction may override hand-coded JSON-LD (2024+)**
Since 2024, Gmail can auto-generate promo card annotations from email body content without JSON-LD. This creates two risks: (a) manually-coded annotations may be superseded by Gmail's own extraction if they conflict, and (b) a marketer may incorrectly conclude the annotation feature is working when Gmail is actually generating its own annotation, not rendering the JSON-LD. No mitigation available — this is Google-side behavior.
**Source:** Multiple ESP knowledge bases and Stripo.email 2025 article.

**Risk 3 — SendGrid Quoted-Printable encoding (SMTP API path only)**
The GitHub issue sendgrid-php/issues/579 from 2018 documents that SendGrid's SMTP pipeline enforces Quoted-Printable encoding, which at the time interfered with Gmail Email Markup parsing. The EmailBuilder app uses the Code Editor paste path, not the SMTP API path, so this risk does not apply to the current workflow. However, if the app is ever extended to send via SendGrid's API directly, this would need to be revisited. The workaround is to set `Content-Transfer-Encoding` to `7bit` in the API payload.
**Source:** [sendgrid-php issue #579](https://github.com/sendgrid/sendgrid-php/issues/579)

**Risk 4 — PromotionCard `url` field will not be click-tracked by SendGrid**
Braze's docs note (and this generalizes to all ESPs) that ESP link-tracking wrappers cannot be applied to URLs embedded in the JSON-LD head section. This means annotation card clicks will not appear in SendGrid click stats unless UTM parameters are added to the `url` value manually. The form UI should surface a hint that the promo URL field should include UTM parameters for analytics tracking.
**Source:** [Braze Gmail Promotions Tab docs](https://www.braze.com/docs/user_guide/channels/email/html_editor/gmail_promotions_tab)

**Risk 5 — `price` field type is Text, not Number**
Google's reference page types `price` as `Text` on PromotionCard, not as a numeric type. Serializing it as a JavaScript number (e.g., `129`) rather than a string (`"129"`) may cause Gmail to reject or ignore the annotation. The serialization code should coerce price to a string before JSON-stringifying. This is a minor but silent failure risk.
**Source:** [Google Email Promotions Reference](https://developers.google.com/workspace/gmail/promotab/reference)

**Risk 6 — PromotionCard has no date fields; past-date validation logic needs scoping**
The idea's validation spec includes "end date required and must not be in the past" as a blocking copy-path validation. PromotionCard in Google's spec has no `availabilityEnds` field — date fields belong to `DiscountOffer` only. For a PromotionCard-only first implementation, the end-date field and its validation are unnecessary and should be omitted from Slice 1 and Slice 2. Including them creates a field that serializes to non-standard JSON-LD that Gmail will ignore (or that might cause parse errors). This is a direct implication of the PromotionCard-only scope decision that the refiner should flag explicitly in the task plan.
**Source:** [Google Email Promotions Reference](https://developers.google.com/workspace/gmail/promotab/reference)

---

## Sources

- [Annotate emails in the Promotions tab — Google for Developers](https://developers.google.com/workspace/gmail/promotab/overview)
- [Email Promotions Reference — Google for Developers](https://developers.google.com/workspace/gmail/promotab/reference)
- [Preview your annotations — Google for Developers](https://developers.google.com/workspace/gmail/promotab/preview)
- [Troubleshooting — Google for Developers](https://developers.google.com/workspace/gmail/promotab/troubleshooting)
- [Gmail Email Markup Overview — Google for Developers](https://developers.google.com/workspace/gmail/markup/overview)
- [Registering with Google — Gmail Email Markup](https://developers.google.com/workspace/gmail/markup/registering-with-google)
- [MJML Documentation — documentation.mjml.io](https://documentation.mjml.io/)
- [mjml-raw package — npm](https://www.npmjs.com/package/mjml-raw)
- [MJML GitHub Issue #1638 — Allow scripts in header of mail](https://github.com/mjmlio/mjml/issues/1638)
- [MJML GitHub Issue #1682 — mj-raw rendering bug](https://github.com/mjmlio/mjml/issues/1682)
- [SendGrid Code Editor Docs — Twilio](https://www.twilio.com/docs/sendgrid/ui/sending-email/code-editor)
- [Choose an email editor — SendGrid Docs](https://www.twilio.com/docs/sendgrid/ui/sending-email/editor)
- [SendGrid Domain Authentication — Twilio](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication)
- [sendgrid-php Issue #579 — Email actions Markup](https://github.com/sendgrid/sendgrid-php/issues/579)
- [Gmail Annotations in the Promotions tab — EmailOctopus](https://help.emailoctopus.com/article/423-gmail-annotations-in-the-promotions-tab)
- [Gmail Promotions Tab — Braze Docs](https://www.braze.com/docs/user_guide/channels/email/html_editor/gmail_promotions_tab)
- [Gmail Deal Cards 2026 — marketingagent.blog](https://marketingagent.blog/2025/10/14/gmail-deal-cards-2026-the-complete-action-ready-playbook-for-turning-the-promotions-tab-into-a-high-intent-conversion-surface/)
- [Gmail Promotions Tab Annotations — Iterable Support](https://support.iterable.com/hc/en-us/articles/360020617011-Gmail-Promotions-Tab-Annotations)
- [Gmail Annotations in 2025 — Validity](https://www.validity.com/blog/gmail-annotations-in-2025-what-they-are-how-they-work-and-what-comes-next/)
- [Gmail Promotions Tab Annotation (2025) — Stripo.email](https://stripo.email/blog/gmails-promotions-tab-annotation-outdated-relic-or-untapped-opportunity/)
- [How to Display Images in Gmail Promotions Tab — Email on Acid](https://www.emailonacid.com/blog/article/email-development/how-to-display-images-and-offer-information-in-the-gmail-promotions-tab-free-tool/)
- [Gmail Promo Card and Promotion Tab Changes — Freshinbox](https://freshinbox.com/blog/gmails-promotion-card-and-promotion-tab-changes/)
- [Gmail Promotions Tab Annotations — suped.com](https://www.suped.com/learn/email-deliverability/gmail-promotional-tab-annotations-json-ld-javascript-compatibility-and-registration-requirements)
