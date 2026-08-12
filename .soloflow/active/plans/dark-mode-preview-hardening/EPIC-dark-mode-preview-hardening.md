---
epic: dark-mode-preview-hardening
created: 2026-08-12T00:00:00Z
status: active
originating_ideas: [SPRINT-006-007-compound]
---

# Dark Mode Preview — Post-Ship Hardening

## Objective

Close the three structural debts the `dark-mode-preview` epic (IDEA-005 / TASK-021–024) left behind: harness fixtures that pass vacuously and therefore guard nothing, a hand-rolled switch widget that re-forked the shared `createModuleToggle` factory the same sprint deleted its predecessor, and a disclosure story whose two halves (darkened stage chrome, hover-only tooltips) both reach nobody at the default desktop viewport. When this epic is done, the dark-mode preview's guarantees are actually enforced by the harness, its switch is one code path with the rest of the app, and a marketer — sighted or not, mouse or keyboard — can read what the preview is simulating.

## Scope

- **In scope:**
  - Rewriting the Section 8 preview-only purity guard so it forces dark mode ON and actually exercises the `lastHtml`-stays-pure invariant.
  - Replacing the Section 10 branch-ordering fixture with an input that provably fails when `detectAuthorDarkScheme`'s branches are reordered.
  - Tightening `detectAuthorDarkScheme`'s loosest branch to a recognized `color-scheme` keyword value, plus fixtures locking both the true positive and the prose false positive.
  - Extracting a single `renderPredicateFixtures()` helper for harness Sections 7–10 (and every later predicate section).
  - A `persist` opt-out parameter on `createModuleToggle`, and migrating the dark-mode switch onto the factory.
  - Turning the preview header's runtime-append-order contract from an accident into a documented, harness-asserted invariant.
  - A visible, screen-reader-announced caption above the preview stage that states which client is being simulated and what it does — replacing hover-only `title` attributes as the primary disclosure.
  - Correcting `CHANGELOG.md` and the `.preview-stage.dark` code comment so neither overstates desktop-viewport legibility.
  - `CODE-PATTERNS.md`'s `createModuleToggle` entry.

- **Out of scope:**
  - Implementing `appleMailDarkTransform`'s `'authored'` branch (still unreachable; the Section 10 drift guard remains the trigger).
  - Adding stage padding / iframe margins to make `.preview-stage.dark` visible at desktop — deliberately rejected in favour of the caption (see TASK-031's Rejected Alternatives).
  - Persisting dark-mode state across reloads (locked OFF at the IDEA-005 checkpoint).
  - Any new dark-mode client, or changes to what the three shipped transforms produce.
  - `ARCHITECTURE.md` (handled by the compound run's C3 item).
  - `README.md` — its dark-mode section already explains all three clients in more detail than the new caption.

## Success Signal

A marketer on a maximized desktop window flips **Dark mode** on and picks **Apple Mail**: the preview does not change (correct — this builder emits no dark-mode CSS), and a muted line directly above the preview says so in plain English. A keyboard-only or screen-reader user gets the same sentence without hovering anything. A developer presses Ctrl+Shift+T and sees every row PASS — and if they then swap two branches in `detectAuthorDarkScheme`, or make `render()` leak `EB-DARKSIM` into `lastHtml`, or delete the `persist` opt-out and hand-roll a fourth toggle, the harness turns red instead of staying green.
