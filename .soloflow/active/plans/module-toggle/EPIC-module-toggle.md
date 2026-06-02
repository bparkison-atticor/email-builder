---
epic: module-toggle
created: 2026-06-02T00:00:00Z
status: active
originating_ideas: [IDEA-003]
---

# Module Toggle Pattern

## Objective

Introduce a reusable, universal module-toggle control so any email-builder seg section can be turned on/off by a single factory call — collapsing its fields, persisting state to localStorage, and conditionally omitting its block from the MJML output. The first consumer is the Call-to-action section.

## Scope

- In scope: a shared `.module-toggle` CSS control (reusing the existing `.switch` visual + ARIA pattern), a `createModuleToggle(...)` JS factory (render + persist + restore + callback), wiring the factory to the CTA section, conditional `<mj-button>` emission, and a validation guard so CTA fields are not enforced when the toggle is OFF.
- Out of scope: wiring any module other than CTA (body-below, banner, footer attach later via the same factory — no work in this epic). Changing the CTA field markup itself. Any backend/SendGrid behavior.

## Success Signal

A marketer can switch off "Call to action," watch the CTA fields collapse, copy HTML with no `<mj-button>` and no validation errors, reload the page, and find the toggle still OFF — and a future developer can add a second module toggle with one `createModuleToggle(...)` call and no copy-pasted handlers.
