---
epic: dark-mode-preview
created: 2026-08-11T00:00:00Z
status: complete
originating_ideas: [IDEA-005]
---

# Dark Mode Preview Simulation

## Objective

A marketer can flip the Email Builder preview into a simulated dark-mode client — Gmail, Outlook, or Apple Mail — and spot the problems dark mode will cause (vanishing logos, low-contrast text, harshly inverted brand colors, brand bands that survive un-inverted against darkened surroundings) before the email is pasted into SendGrid and sent. Each option simulates one named platform surface, and the SendGrid-ready HTML is untouched by any of it.

## Scope

- **In scope:**
  - A non-persisted dark-mode switch and an always-enabled three-option client picker in `.preview-header-left`, alongside the existing viewport switcher and test-data switch.
  - A single `applyDarkMode()` step in the existing srcdoc transform chain, between `applyTestData()` and `withPreviewLinkHandler()`, leaving `lastHtml` untouched.
  - Gmail — mobile app (iOS): CSS double-invert filter with a media counter-filter, matching the client's own documented mechanism.
  - Outlook — Outlook.com / OWA: selective inline-color contrast repair (light backgrounds darken, dark backgrounds survive, dark text is lifted and checked against a 4.5:1 threshold).
  - Apple Mail — macOS 12.4+ / iOS 13+: conditional pass-through, with the documented `color-scheme`-meta-only partial-invert fallback and a drift guard that fails loudly if the compiler ever starts emitting dark-mode CSS.
  - Harness sections 8-10 in `index.html` covering every transform, the preview-only purity invariant, and the drift guard.
  - Marketer-facing documentation in `README.md` and `CHANGELOG.md`, including which platform surface each option represents.

- **Out of scope:**
  - Automated dark-mode risk flags in the `#warn` banner (IDEA-005 slice 4, deferred to a separate idea).
  - Persisting the toggle or client selection across reloads.
  - A "simulated" badge or any status affordance beyond the picker control and its tooltips.
  - Emitting dark-mode CSS (`prefers-color-scheme`, `color-scheme` meta) into the compiled output — that is a compiler change, not a preview change, and would invalidate the Apple Mail pass-through.
  - Pixel-exact parity with any real client. The vendors publish no algorithms; the market-leading tools use real-device screenshots rather than simulation, which bounds the in-browser ceiling to "directionally accurate."

## Success Signal

A marketer previewing a dark-brand template (e.g. `kellerPostmanLead`, navy `#00183e` banner and CTA) sees three visibly distinct, individually informative results — full inversion under Gmail, a surviving navy band against a darkened content area under Outlook, and an unchanged white email inside darkened client chrome under Apple Mail — clicks **View HTML**, and finds output byte-identical to what the light preview produces. The email that ships is unchanged; the marketer's understanding of how it will land is not.
