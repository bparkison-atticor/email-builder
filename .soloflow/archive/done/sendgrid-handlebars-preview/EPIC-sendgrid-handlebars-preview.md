---
epic: sendgrid-handlebars-preview
created: 2026-05-13T00:00:00Z
status: complete
originating_ideas: [IDEA-001]
---

# SendGrid Handlebars Preview Pipeline

## Objective

Replace the regex-based test-data substitution in EmailBuilder with a full Handlebars.js rendering pipeline that faithfully resolves SendGrid's Handlebars dialect — including block helpers, inline helpers, parse-error surfacing, and missing-data visibility chips — so marketers can trust the preview iframe before sending.

## Scope

- In scope:
  - Handlebars.js CDN load (jsDelivr, version 4.7.8) and applyTestData() pipeline replacement
  - Six confirmed SendGrid helper shims: `equals`, `notEquals`, `greaterThan`, `lessThan`, `insert`, `formatDate`
  - Parse-error display via `setTestDataHint()` on `#testDataHint`
  - Missing-data fallback chips using `Handlebars.SafeString` and `helperMissing` / Proxy-based context wrapping
- Out of scope:
  - `{{#and}}` / `{{#or}}` helpers (deferred per IDEA-001 Q3 answer — unverified against SendGrid's actual engine)
  - CTA field Handlebars processing
  - Backend / SendGrid API integration
  - Test-send feature

## Success Signal

A marketer can paste a SendGrid template containing nested `{{#equals}}…{{else}}…{{/equals}}` blocks (e.g., the Postman Law sample with three `Client.CaseType` branches) into the body copy field, populate the test-data JSON for any branch, and see the preview iframe render the correct branch text — not the raw `{{#equals}}` markup. Marketers also see (a) inline `Template error: …` messages adjacent to the test data textarea when their template is malformed, and (b) yellow `[Path.Name — not set]` chips wherever a referenced JSON path is absent, so missing data is never silently empty.
