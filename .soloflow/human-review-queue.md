---
pending_count: 1
buckets:
  decisions: 0
  actions: 0
  testing: 1
  deferred_visual: 0
items: []
---
# Human Review Queue

## Decisions

_No items._

## Actions

_No items._

## Testing

- task: TASK-018
  type: action_required
  bucket: testing
  plan_ref: .soloflow/active/plans/gmail-promo-annotations/TASK-018-plan.md
  action: "In the running app (the Ctrl+Shift+T harness covers serializePromoCard in isolation, but NOT the live mjml2html compile). Toggle the Gmail Promo Tab on, fill a valid headline + https image URL + https destination URL, Copy HTML / open the raw-HTML modal, and confirm the <head> contains exactly one <script type=application/ld+json> PromotionCard block that JSON.parse succeeds on — i.e. MJML passed the mj-raw content through verbatim without re-indenting or HTML-escaping the u003c sequence."
  blocked_checks:
    - "AC#1 end-to-end: JSON-LD mj-raw survives mjml2html compile intact and parseable in compiled <head>"
  level: goal_backward
  severity: medium

## Deferred Visual

_No items._
