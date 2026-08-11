---
epic: cta-microcopy
created: 2026-08-11T00:00:00Z
status: active
originating_ideas: [IDEA-006]
---

# Optional CTA Microcopy

## Objective

A marketer can add one or two supporting sentences directly beneath the CTA button — a reassurance line, a fine-print caveat, a "no obligation" note — without leaving the Call-to-action card and without fighting body-copy styling. The sentence renders as small, muted text owned by the brand template, so a brand can later restyle it in one place. The field is part of the CTA module: empty renders nothing, and switching the CTA off hides and omits it along with the button.

## Scope

- **In scope:**
  - Italics support added to the shared rich-text toolbar, so it exists in the body editors as well as the new microcopy field.
  - A third Quill instance inside `#ctaBody` with a bold / italics / link toolbar (no lists) and a live, non-blocking character-count hint.
  - `richTextToMjText()` parameterized with a style-options argument so one renderer serves both body copy and microcopy; the two existing call sites keep producing byte-identical output.
  - Two per-brand config keys (`ctaMicrocopyFontSize`, `ctaMicrocopyColor`) on all 8 brand entries, backed by shared `DEFAULT_CTA_MICROCOPY_*` constants.
  - Muted link colouring inside microcopy (overriding the brand-accent link pass, and covering auto-linked phones).
  - Suppression of the typed-bullet converter inside microcopy so `* Restrictions apply.` stays a sentence.
  - Harness fixtures for every new pure function plus a byte-parity gate on the existing body-copy output.
  - Marketer- and maintainer-facing docs: `README.md`, `CHANGELOG.md`, `ARCHITECTURE.md`, `CODE-PATTERNS.md`.

- **Out of scope:**
  - Persisting microcopy content across reloads (no copy field persists today).
  - A hard character limit, or any `runCopyAction()` validation — the field is optional by definition.
  - Per-brand overrides of microcopy padding, line-height, or alignment; only size and colour are brand-owned.
  - Lists inside microcopy, and microcopy for anything other than the single primary CTA.
  - Invalid-field highlighting for the new editor.

## Success Signal

A marketer types "No cost, no obligation — talk to a lawyer today." under the CTA on a `parrishDevaughn` email, sees it render in the preview as 13px `#6b6b6b` immediately below the red button with any link inside it staying grey rather than turning red, switches the CTA module off and watches both button and sentence disappear from the preview and the copied HTML, switches it back on, clears the field, and gets HTML byte-identical to what the builder produced before this epic existed.