# Handoff: Email Builder — Form Panel & Preview Top Bar Redesign

## Overview
This handoff covers two scoped UI/UX improvements to the existing **Email Builder** tool (a single-file HTML app that compiles MJML + Quill into SendGrid-ready HTML):

1. **Form panel hierarchy** — the left-hand input panel. The current panel uses uppercase muted `<h2>` labels that all read at the same visual weight, so the four functional segments (Body Above CTA / CTA / Body Below CTA / Test Data) blur together. The new design boxes each segment as a card, applies a soft gray tint to the CTA section to signal it's the action, applies a soft amber tint to the Test Data section to signal "preview only," and replaces the destination-type radio buttons with a segmented control.

2. **Preview top bar** — the bar above the preview iframe that holds viewport and test-data controls. The current bar uses two identical-looking pill toggles next to redundant `<h2>` labels ("Preview", "Test Data"). The new design uses a single segmented control for viewport (Desktop / Mobile, with icons) and a labeled toggle switch for test data, separated by a thin divider.

The rest of the application (MJML build pipeline, Quill editors, copy-HTML flow, raw HTML modal, validation behavior, tweak-mode protocol, etc.) is **unchanged**.

## About the Design Files
The HTML files in this bundle are **design references** — mid-fidelity React/JSX prototypes built to demonstrate intended look and structure, not production code to copy line-for-line. The implementer should **recreate these designs inside the existing `index.html` Email Builder file** (the original is included as `reference_current_index.html` for diffing), using its current vanilla-JS / inline-`<style>` patterns. Do not introduce React, a build step, or new dependencies — the project ships as a single HTML file and that constraint should be preserved.

## Fidelity
**Mid-fidelity.** Color, type, spacing, and component structure are final. Specific pixel values (paddings, sizes, hex codes) below are authoritative. Icons in the prototypes are inline SVG and can be reused as-is.

---

## Change 1 — Form Panel Hierarchy

### What changes
The left form panel currently renders a flat list of fields under uppercase muted `<h2>` headings. Restructure into card-style segments:

| Segment | Treatment |
|---|---|
| Template + Preheader (meta) | No card — transparent background, minimal chrome at top of panel |
| Body — above CTA | White card, neutral border |
| Call to action | **Tinted card**: `background: #f7f7f8`, `border-color: #e0e0e2` |
| Body — below CTA | White card, neutral border |
| Test data | **Amber-tinted card**: `background: #fffaf0`, `border-color: #fde68a` |

Each card uses **type-only hierarchy** — no numbered badges, no left-side colored rails. Section title is a 15px / 600 weight label. Optional inline tags (small uppercase pill) sit next to the title for context like `above CTA`, `below CTA`, `preview only`. Reference: `variants.jsx` → `VariantB3`.

### Card spec
```css
.seg {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 10px;
}
.seg.seg-cta  { background: #f7f7f8; border-color: #e0e0e2; }   /* CTA tint */
.seg.seg-test { background: #fffaf0; border-color: #fde68a; }   /* Test data amber */
.seg.seg-meta { background: transparent; border: none; padding: 0; margin-bottom: 18px; }
```

**CSS source-order note:** the `.seg-cta` / `.seg-test` / `.seg-meta` rules use `.seg.seg-cta` (two classes) so they win against the base `.seg` rule. Don't drop one of the classes; same-specificity rules in the wrong order will silently revert to the base white background.

### Section header spec
```css
.seg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.seg-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #1a1a1a;
}
.seg-tag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #6b6b6b;
  background: #f3f4f6;
  padding: 2px 7px;
  border-radius: 3px;
}
.seg-test .seg-tag { background: #fef3c7; color: #b45309; }
.seg-desc {
  font-size: 12px;
  color: #6b6b6b;
  margin-left: auto;
  font-weight: 500;
}
```

### Section markup pattern
```html
<!-- Body above CTA -->
<div class="seg">
  <div class="seg-head">
    <span class="seg-title">Body</span>
    <span class="seg-tag">above CTA</span>
  </div>
  <!-- existing Quill mount #bodyAbove -->
</div>

<!-- CTA -->
<div class="seg seg-cta">
  <div class="seg-head">
    <span class="seg-title">Call to action</span>
  </div>
  <!-- button text input, segmented destination control, destination input, hint, CTA preview -->
</div>

<!-- Body below CTA -->
<div class="seg">
  <div class="seg-head">
    <span class="seg-title">Body</span>
    <span class="seg-tag">below CTA</span>
    <span class="seg-desc">optional</span>
  </div>
  <!-- existing Quill mount #bodyBelow -->
</div>

<!-- Test data -->
<div class="seg seg-test">
  <div class="seg-head">
    <span class="seg-title">Test data</span>
    <span class="seg-tag">preview only</span>
  </div>
  <!-- hint text, then the JSON textarea -->
</div>

<!-- Meta (template + preheader) -->
<div class="seg seg-meta">
  <label class="field-label">Template</label>
  <select id="template"></select>
  <label class="field-label" style="margin-top: 4px">Preheader</label>
  <input type="text" id="preheader" maxlength="150" />
  <div class="hint"><!-- existing preheader hint --></div>
</div>
```

The existing yellow `.note` blocks for "Subject lines aren't part of the HTML" and the test-data "Preview only" explainer can be **removed** — that information is now carried by the section tag (`preview only`) and a single short hint line under the JSON textarea. The Subject reminder note can be dropped entirely; if you want to keep it, render it as a small `.hint` line under the Preheader field rather than a yellow callout.

**Also drop the orphan `<h2>Subject</h2>` heading** above that note. In the current `index.html` it's just a heading + note pair with no associated input — once the note goes, the heading is dead text and should go with it. The Test Data section's `<h2>Test Data <span>— preview only</span></h2>` heading and its `.note` callout (lines 439–442 in `reference_current_index.html`) are likewise both replaced by the new card's `seg-title` + `seg-tag` + a single `.hint` line.

### Replace the destination radio with a segmented control
The current `<div class="radio-group">` containing `<input type="radio" name="ctaType">` becomes a 2-button segmented control with **monochrome** icons (do not colorize):

```css
.seg-control {
  display: inline-flex;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  width: 100%;
}
.seg-control button {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 500;
  padding: 7px 10px;
  border-radius: 4px;
  cursor: pointer;
  color: #6b6b6b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.seg-control button .ico { width: 13px; height: 13px; color: currentColor; opacity: 0.85; }
.seg-control button.active {
  background: #fff;
  color: #1a1a1a;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}
```

Markup:
```html
<div class="seg-control" role="tablist" aria-label="Destination type">
  <button type="button" class="active" data-cta-type="phone" aria-pressed="true">
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>
    </svg>
    Phone
  </button>
  <button type="button" data-cta-type="variable" aria-pressed="false">
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
    URL variable
  </button>
</div>
```

**Behavior:** clicking a button toggles `.active` and the matching `aria-pressed`. Replace the existing `getCtaType()` function (which reads `document.querySelector('input[name="ctaType"]:checked').value`) to read `document.querySelector('.seg-control button.active').dataset.ctaType`. The `updateCtaFields()` flow that swaps the destination label/placeholder/hint and triggers `scheduleRender()` stays the same — only the read path changes.

### CTA preview block
Below the destination input, add a dashed-border preview that shows the rendered button styled like the email output:

```css
.cta-preview {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px dashed #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta-preview .btn {
  background: #000;        /* matches template ctaBackgroundColor at runtime */
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  padding: 10px 22px;
  border-radius: 4px;
}
```

The preview pill text comes from the `#ctaText` input live (default "Click Here" if empty). Background color should read the active template's `ctaBackgroundColor` (and update on template switch / CTA-text input). This replaces no existing element — it's net new. Reference: `variants.jsx` → `VariantB3` markup and the `.cta-preview` rule applied via `.variant-b3 .seg-cta .cta-preview`.

---

## Change 2 — Preview Top Bar

### What changes
Strip the redundant `<h2>Preview</h2>` and `<h2>Test Data</h2>` labels and replace the two identical pill toggles with **one segmented control + one toggle switch**. Reference: `Preview Top Bar.html` → `T1`.

### Layout
```
[ Desktop | Mobile ]   |   ◯ Test data           [ View HTML ] [ Copy HTML ]
└──────── seg ────────┘ │ └────── switch ──────┘
                  divider
```

- Left group: viewport segmented control + thin vertical divider (1px × 22px, `#e5e5e5`) + test-data toggle switch with inline label.
- Right group: View HTML / Copy HTML buttons (unchanged behavior, restyled below).
- Single row, `padding: 12px 20px`, white background, bottom border `1px solid #e5e5e5`.

### Viewport segmented control
Same `.seg-control` / `.seg-control button` / `.seg-control button.active` pattern from the destination control above (reuse the styles — they're identical). Each button has a leading icon:

> **Note:** the design reference [Preview Top Bar.html](Preview Top Bar.html) uses `.seg` / `.on` for the same control. Use the form-panel names (`.seg-control` / `.active`) here so both controls share one rule. Don't introduce a separate `.seg`/`.on` set.

- Desktop: `rect 2 3 / 20×14 r=2`, `line 8 21 → 16 21`, `line 12 17 → 12 21` (monitor)
- Mobile: `rect 5 2 / 14×20 r=2`, `line 12 18 → 12 18` (phone)

Toggling updates `previewStage.classList.toggle('mobile', vp === 'mobile')` (existing logic).

### Test-data toggle switch
```css
.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b6b6b;
  cursor: pointer;
  user-select: none;
}
.switch .track {
  width: 28px;
  height: 16px;
  background: #d4d4d8;
  border-radius: 999px;
  position: relative;
  transition: background 0.15s;
}
.switch .track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.15s;
}
.switch.on .track { background: #2563eb; }
.switch.on .track::after { transform: translateX(12px); }
.switch.on { color: #1a1a1a; }
```

Markup:
```html
<span class="switch on" role="switch" aria-checked="true" tabindex="0" id="testDataSwitch">
  <span class="track"></span>
  Test data
</span>
```

Click + Space/Enter both toggle. Wire to the existing `testDataEnabled` boolean: on toggle, flip the value, persist via `localStorage.setItem('emailBuilder.testDataEnabled', String(testDataEnabled))`, update `aria-checked` and the `.on` class, then call `scheduleRender()`. The two-button `data-td="on"` / `data-td="off"` `<button>`s and the `syncTestDataToggle()` function are removed.

### Buttons (right side)
The existing `View HTML` and `Copy HTML` buttons keep their behavior. Restyle to match the new toolbar (icons added, slightly different padding):

```css
.btn-toolbar {
  font-family: var(--font);
  font-size: 13px;
  font-weight: 500;
  padding: 7px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-toolbar:hover { background: #f5f5f5; }
.btn-toolbar.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
.btn-toolbar.primary:hover { background: #1d4ed8; }
```

Add inline SVG icons:
- View HTML — `<>` chevrons (`polyline 16 18 → 22 12 → 16 6`, `polyline 8 6 → 2 12 → 8 18`)
- Copy HTML — overlapping rectangles (`rect 9 9 / 13×13 r=2`, `path M5 15H4 a2 2 0 0 1-2-2V4 a2 2 0 0 1 2-2h9 a2 2 0 0 1 2 2v1`)

Existing `.btn-primary.copied` / `.btn-primary.error` states (background change + shake animation on validation failure) **must be preserved** — port them onto `.btn-toolbar.primary`.

---

## Design Tokens (consolidated)

```
Colors
  --text         #1a1a1a   primary text
  --muted        #6b6b6b   secondary text, hints
  --muted-2      #9b9b9b   tertiary (placeholders)
  --border       #e5e5e5   default border
  --border-strong #d4d4d4  emphasis border
  --accent       #2563eb   primary action / focus ring
  --accent-hover #1d4ed8
  --bg           #fafafa   page background
  --panel-bg     #ffffff   panel/card background

  CTA card tint:    bg #f7f7f8  border #e0e0e2
  Test data tint:   bg #fffaf0  border #fde68a   tag-bg #fef3c7  tag-text #b45309
  Segmented control track: #f3f4f6
  Toggle switch off:    #d4d4d8 (track) / #fff (knob)
  Toggle switch on:     #2563eb (track) / #fff (knob)

Typography
  Section title       15px / 600 / -0.01em / #1a1a1a
  Field label         13px / 500 / #1a1a1a
  Body input          13px / 400
  Hint                12px / 400 / #6b6b6b
  Section tag (pill)  10px / 600 / 0.5px tracking / uppercase / #6b6b6b on #f3f4f6
  Toolbar button      13px / 500
  Segmented button    12px / 500

Radii
  Card                8px
  Input / button      6px
  Segmented inner     4px
  Pill / switch       999px

Spacing
  Card padding        16px (CTA / Body / Test) · 14px (smaller variants)
  Card gap            10px between cards
  Field gap           12px
  Toolbar padding     12px 20px
  Toolbar gap         8px (within group), 14px (between groups via divider)
```

## Files in this bundle

| File | Role |
|---|---|
| `Panel Hierarchy.html` | Design canvas — final form panel (artboard "B3 · Type-only hierarchy") + earlier explorations for context |
| `variants.jsx` | All panel variants. Final = `VariantB3`. |
| `app.jsx` | Mounts the canvas; wiring only |
| `Preview Top Bar.html` | Top-bar canvas — final = artboard "T1 · Segmented + toggle switch" |
| `design-canvas.jsx` | Canvas component (presentation layer; not part of the design itself) |
| `reference_current_index.html` | The current Email Builder file, unmodified — diff against this |

## Existing markup reference

Class names and IDs the new design replaces or builds on. Line numbers are from `reference_current_index.html`.

### Form panel — what's there now
| Element | Where | Fate |
|---|---|---|
| `<h2>` headings (`Template`, `Subject`, `Preheader`, `Body — above CTA`, `CTA`, `Body — below CTA`, `Test Data`) | lines 391, 396, 401, 407, 414, 432, 439 | **Removed.** Replaced by `.seg-title` text inside cards. The `Subject` heading has no input — drop it entirely. The `Template` and `Preheader` headings collapse into the chrome-less `.seg-meta` block. |
| `.note` (yellow callout) — Subject reminder | 397–399 | **Removed.** |
| `.note` (yellow callout) — Test Data "Preview only" | 440–442 | **Removed.** Info now lives in the `preview only` `.seg-tag` + the existing `#testDataHint`. |
| `<div class="field">` wrappers | throughout | **Kept.** Existing `.field { margin-bottom: 12px }` rule still applies inside cards. |
| Bare `<label>` (no class) | 416, 420, 427 | **Kept.** The existing `label { font-size:13px; font-weight:500 }` rule already matches the spec for "Field label". The `.field-label` class shown in the new markup examples is *aspirational* — bare `<label>` is fine, no new CSS rule needed for it. |
| `<div class="radio-group">` + 2× `<input type="radio" name="ctaType">` | 421–424 | **Removed.** Plus its `<label>Destination type</label>` (line 420). Replaced by the `.seg-control`. The `.radio-group` CSS rules (lines 158–170) become dead — remove them. |
| `#ctaText`, `#ctaDestination`, `#ctaDestinationLabel`, `#ctaDestinationHint` | 417, 428, 427, 429 | **Kept.** IDs and JS wiring are unchanged. |
| `#bodyAbove`, `#bodyBelow` Quill mounts inside `.rich-editor-wrap` | 410, 435 | **Kept.** Just sit inside the new card markup. |
| `#testData` `<textarea class="mono-textarea">` + `#testDataHint` | 444–445 | **Kept.** Preserve `class="mono-textarea"` and the `#testDataHint` element — JS at `setTestDataHint()` (line 925) still updates it. |

### Preview top bar — what's there now
| Element | Where | Fate |
|---|---|---|
| `.preview-header` flex row | 176–183, 450 | **Kept** as the outer container. Padding (`12px 20px`) and bottom border already match the new spec. |
| `.preview-header-left` | 227–231, 451 | **Kept** as the left group; can rename to `.left` or leave as-is. |
| `<h2>Preview</h2>`, `<h2>Test Data</h2>` | 452, 457 | **Removed.** |
| `.viewport-toggle` divs (×2 — one for viewport, one for test data) + `.vp-btn` children with `data-vp` / `data-td` | 232–251, 453–461 | **Removed.** Replaced by one `.seg-control` (viewport, with `data-vp`) and one `.switch` (test data, no buttons). The `.viewport-toggle` and `.vp-btn` CSS rules become dead — remove them. |
| `.copy-group` wrapping `.copy-error` + buttons | 212–216, 463–467 | **Kept.** The right-side group continues to hold the validation error ribbon plus View HTML / Copy HTML. |
| `#copyError` (`.copy-error`) | 217–226, 464 | **Kept.** The `showCopyError()` flow still targets this and still adds `.error` to the Copy button — wire that class to the new `.btn-toolbar.primary`. |
| `<button class="btn-secondary" id="viewHtmlBtn">`, `<button class="btn-primary" id="copyBtn">` | 465–466 | **IDs kept, classes change.** Swap to `.btn-toolbar` and `.btn-toolbar primary`. The existing `.btn-primary` / `.btn-secondary` rules (195–206) stay alive because the modal's `#copyFromModal` (line 488) and `#htmlModalClose` still use them — don't delete those rules. |

### JS that needs updating
| Function / line | Change |
|---|---|
| `getCtaType()` (624) | Read from `document.querySelector('.seg-control button.active').dataset.ctaType` instead of the radio. |
| `updateCtaFields()` listeners (641–643) | Bind to `.seg-control button` clicks (toggle `.active` + `aria-pressed`) instead of `input[name="ctaType"]` change events. |
| `viewportButtons` query (1028) | Repoint at the new viewport segmented control buttons (e.g. `.seg-control button[data-vp]`). |
| `testDataButtons` + `syncTestDataToggle()` (1038–1053) | **Delete the function, the query, the event-binding loop, and the initial call.** Replace with a single click + key handler on the new `#testDataSwitch` element that flips `testDataEnabled`, persists to `localStorage`, toggles `.on` + `aria-checked`, and calls `scheduleRender()`. |
| `flashCopyButton()` (1176) | No code change, but verify `'Copy HTML'` reset still matches the button's textContent (the SVG icon is now inline; resetting `.textContent` to `'Copy HTML'` will *wipe the icon* — update this to restore label-only text or use a separate label `<span>` inside the button). |

> **Heads-up — icon wipe in `flashCopyButton`:** the current implementation does `btn.textContent = label` and later `btn.textContent = original`. Once the button gains an inline `<svg>` icon, that pattern erases the SVG. Either wrap the label in a `<span class="label">` and update only that span, or rebuild the icon on reset.

## Implementation notes

- The original `index.html` uses CSS custom properties on `:root`; keep that. The new tokens above can be added as additional vars or used inline. Don't introduce a CSS preprocessor.
- All existing JavaScript stays — the only behavioral changes are: (a) `getCtaType()` reads from the segmented control, (b) the test-data show/hide buttons are replaced by a single switch element with the same persistence + render trigger, (c) a small CTA preview chip is added that re-renders on `#ctaText` input and `#template` change.
- The Quill rich-text editor mounts (`#bodyAbove`, `#bodyBelow`) and the `.rich-editor-wrap` focus/invalid styling all stay. They sit inside the new card markup unchanged.
- Validation behavior (`markInvalid`, `runCopyAction`, the shake animation, the `.copy-error` ribbon, the 4-second auto-clear) is unchanged.
- Tweak-mode protocol, raw-HTML modal, MJML build, test-data Handlebars substitution: all unchanged.

## Out of scope
Anything not explicitly listed above — including the email template registry, the preview iframe rendering, the MJML pipeline, mobile responsiveness of the builder UI itself, dark mode, and the SendGrid integration — is explicitly **not** part of this handoff.
