---
id: IDEA-005
type: FEATURE
status: answered
created: 2026-08-11T00:00:00Z
epics: [dark-mode-preview]
slices:
  - title: "Dark-mode control shell + Gmail partial-invert simulation"
    description: "Add a dark-mode toggle and a Gmail/Outlook/Apple Mail client picker to `.preview-header-left` (index.html ~line 717), alongside the existing viewport switcher and `#testDataSwitch`. Wire a new transform hook into the `render()` pipeline (index.html ~line 2548, srcdoc assignment ~line 2554) that runs after `applyTestData()` and before `withPreviewLinkHandler()`. Ship the first working transform: an in-browser approximation of Gmail's partial color inversion, applied only to the iframe srcdoc."
    value_statement: "Delivers the first end-to-end simulation a marketer can actually use — flip dark mode on, see Gmail's specific transform applied to the current template, and spot obvious problems (e.g. a banner logo going illegible) without touching the copied HTML."
  - title: "Outlook full-invert simulation"
    description: "Add Outlook as a second option in the client picker, implementing Outlook.com/OWA's more aggressive full color-swap/inversion behavior as a distinct transform function from Gmail's partial-invert."
    value_statement: "Outlook's transform is reported by the user as the harshest of the three (full color-swap) — this is the slice most likely to surface brand-color clashes and is independently useful even before Apple Mail ships."
  - title: "Apple Mail CSS-respecting simulation"
    description: "Add Apple Mail as a third picker option. Unlike Gmail/Outlook, Apple Mail's Mail app respects author-supplied `prefers-color-scheme` CSS / `<meta name=\"color-scheme\">` rather than algorithmically recoloring everything. Since `buildMjml()` (index.html ~lines 1609-1629) currently emits neither, this slice must define what the simulation shows in that common case (e.g., an explicit 'no dark-mode CSS detected — Apple Mail will render this unchanged' indicator) as well as what it shows if such CSS is later added."
    value_statement: "Completes the three-client picker and teaches the marketer the one client where the fix is 'add dark-mode CSS' rather than 'change your brand colors' — a materially different, and currently invisible, class of problem."
  - title: "Automated dark-mode risk flags in the #warn banner"
    description: "Layer heuristic detection on top of the visual simulation: flag likely vanishing-logo risk (banner image against a background color that the active client's transform would push toward), low-contrast text/background pairs post-transform, and harsh-inverted brand colors (CTA button color, banner background). Surface via the existing `showWarn()` / `#warn` banner pattern (index.html ~line 2542), following the same `warnings.push(...)` convention already used for placeholder banners and promo UTM hints (~lines 2559-2574)."
    value_statement: "Directly targets the user's stated success criteria ('marketer spots likely dark-mode problems before sending') with an explicit, readable call-out rather than requiring the marketer to visually notice a subtle transform artifact themselves."
open_questions:
  - question: "In what order should the three client simulations ship, and should all three land in one release or incrementally?"
    context: "Each client transform is independently useful, but they share the control-shell plumbing (slice 1). Shipping Gmail alone first validates the pipeline fastest; shipping all three together avoids a picker with disabled/greyed-out options."
    candidates:
      - "Gmail first (most-recognized dark-mode behavior), then Outlook, then Apple Mail — matches slice order above"
      - "All three transforms built together in one pass before any release, so the picker never has partial/disabled options"
      - "Apple Mail first — cheapest to implement if the answer to the fidelity question below is 'leave colors unchanged when no dark CSS is present'"
    answer: "All three transforms built together in one pass before any release, so the picker never has partial/disabled options."
  - question: "What in-browser technique should implement each client's 'directionally accurate' color transform?"
    context: "Options range from a blunt CSS filter (e.g. `filter: invert(1) hue-rotate(180deg)` scoped inside the iframe, cheap but crude and hard to tune per-element) to a DOM-walking approach that reads computed styles and remaps colors per a hardcoded table derived from published Gmail/Outlook reverse-engineering research (more faithful, more implementation work, needs the research phase to supply the actual color-mapping rules). This is an implementation decision for the task-refiner/research phase, not decided here, but it materially changes slice-1 effort."
    candidates:
      - "CSS filter approximation (invert/hue-rotate) applied to the iframe body, with an exclusion rule for images"
      - "DOM color-remapping: walk computed styles inside the iframe and rewrite text/background colors per a hardcoded rule table sourced from published research"
      - "Hybrid: CSS filter for a fast first pass (Gmail/Outlook), DOM-based `prefers-color-scheme` media-query injection for Apple Mail"
    answer: "Defer to research/refiner — leave the technique decision to the research phase and the task-refiner, which own this call."
  - question: "Should the dark-mode toggle state and selected client persist across sessions?"
    context: "Every other preview control in this header has an explicit persistence decision: `testDataEnabled` persists to `emailBuilder.testDataEnabled`, module toggles persist via `createModuleToggle`'s `emailBuilder.module.<id>` key. The viewport switcher (desktop/mobile) does not appear to persist. Dark-mode preview is a review-time convenience, not a content decision, so the right default is unclear."
    candidates:
      - "Persist both toggle-on state and selected client, consistent with the module-toggle convention"
      - "Persist selected client only; dark-mode toggle always defaults OFF on load"
      - "Persist nothing — mirrors the (apparently non-persisted) viewport switcher"
    answer: "Persist nothing — mirrors the non-persisted desktop/mobile viewport switcher."
  - question: "Should the simulation include an explicit on-screen label (e.g. a 'Simulated: Outlook dark mode' badge on the preview stage) to prevent the marketer from mistaking the transformed preview for the actual copied output?"
    context: "The synthesis is explicit that the copied SendGrid HTML is unchanged, but nothing in the current preview UI distinguishes 'this is a simulation' from the normal preview state. Given the existing warn-banner precedent already flags preview-only behavior (test-data substitution note at index.html ~line 710: 'Copied HTML is unaffected'), an equivalent affordance seems consistent with house style."
    candidates:
      - "Persistent badge/label on `.preview-stage` while dark mode is active, naming the simulated client"
      - "One-time hint text near the picker (similar to the test-data `.hint` at ~line 710), no persistent badge"
      - "No extra affordance — the picker control itself is considered sufficient signal"
    answer: "No extra affordance — the picker control itself is sufficient signal."
  - question: "Should slice 4 (automated risk flags) ship as part of this idea's initial scope, or as a fast-follow once the three visual simulations are validated?"
    context: "The visual transform alone may already satisfy 'marketer can spot problems' for obvious cases (a logo visibly disappearing). The automated heuristics (contrast math, vanishing-logo detection against transparent/near-white PNGs) add real implementation complexity — e.g. determining whether a banner PNG has a transparent background isn't inspectable from the `bannerImageUrl` string alone (index.html templates config ~line 968 onward) without fetching and analyzing the actual image."
    candidates:
      - "Include automated flags in this idea's scope (all 4 slices)"
      - "Ship only the 3 visual-simulation slices now; automated flags become a separate follow-up idea once real usage shows which problems are hard to spot visually"
    answer: "Ship only the 3 visual-simulation slices now; automated flags (slice 4) become a separate follow-up idea once real usage shows which problems are hard to spot visually."
assumptions:
  - assumption: "Gmail applies a 'partial' color inversion, Outlook applies a 'full' color-swap/inversion, and Apple Mail respects author-supplied `prefers-color-scheme`/`color-scheme` CSS rather than forcing a transform — these are the three canonical strategies referenced in the clarification transcript."
    confidence: medium
    validation: "Cross-check against published reverse-engineering research (Litmus, Email on Acid, Can I Email) during the research phase before finalizing the exact per-client transform rules."
  - assumption: "The exact color-mapping/inversion algorithms Gmail and Outlook use are proprietary, undocumented, and only knowable through third-party reverse-engineering — meaning any in-browser simulation is necessarily an approximation, not a byte-exact reproduction."
    confidence: high
    validation: "Stated directly by the user in the clarification transcript; corroborated by the general industry consensus that Gmail/Outlook dark-mode CSS behavior is unofficial and has changed over time without public changelogs."
  - assumption: "No dark-mode-specific CSS (`prefers-color-scheme`, `<meta name=\"color-scheme\">`, or a `supported-color-schemes` meta tag) currently exists anywhere in `buildMjml()`'s output (index.html ~lines 1608-1629) — confirmed via grep, zero matches for `prefers-color-scheme`/`color-scheme`/`dark` in index.html."
    confidence: high
    validation: "Direct grep of index.html; re-verify if buildMjml() changes before this feature is implemented."
  - assumption: "The dark-mode transform can be implemented as a new wrapper function slotted into the existing srcdoc-composition chain (`withPreviewLinkHandler(applyTestData(result.html))` at index.html ~line 2554) without needing to alter `buildMjml()`, `applyTestData()`, or the separate `lastHtml` value used by Copy HTML / the raw-HTML modal."
    confidence: high
    validation: "Confirmed by reading render() (index.html ~lines 2548-2581): `lastHtml` is assigned directly from `result.html` before any preview-only transform is applied, and Copy HTML / View HTML read from `lastHtml`, not from the iframe — so a new preview-only transform function is structurally isolated the same way `applyTestData` already is."
  - assumption: "Banner images (`tpl.bannerImageUrl` in the `templates` config, index.html ~line 968 onward) are the primary 'vanishing logo' risk surface, since they are typically brand-mark PNGs that may have transparent backgrounds."
    confidence: low
    validation: "Cannot be verified from code — the actual image files are hosted externally on SendGrid's CDN and their transparency/color composition isn't inspectable from the URL string alone. Would need to fetch and inspect actual images, or accept marketer-reported false negatives/positives."
  - assumption: "The client picker and dark-mode toggle fit within the existing `.preview-header-left` flex container (index.html ~lines 178-185, 219-223) without needing a second header row, similar to how the viewport switcher and test-data switch currently coexist with a `.divider` between them (~line 735)."
    confidence: medium
    validation: "Visual/layout check once the control markup is drafted — a 3-option client picker plus a toggle adds meaningfully more horizontal width than the existing two controls; may require a responsive fallback (e.g. dropdown instead of segmented buttons) at narrower viewport widths."
research_recommendation: recommended
research_rationale: "The core open questions (exact Gmail/Outlook color-transform rules, Apple Mail's actual default behavior absent dark-mode CSS) depend on external, undocumented, reverse-engineered knowledge (Litmus/Email on Acid research) that cannot be derived from this codebase and directly determines slice-1 implementation feasibility and effort."
---

# IDEA-005: Dark Mode Preview Simulation (Gmail / Outlook / Apple Mail)

## Raw Input

"dark mode toggle that uses the main email client's means of dark mode flip tactics and presents what the render would look like with that method"

## Clarification Transcript

- Q: Which client's dark-mode behavior should the preview toggle simulate?
  A: Client picker (multiple) — dropdown/segmented control to switch between simulated clients.
- Q: Which clients at launch?
  A: Gmail + Outlook + Apple Mail — the three distinct strategies (partial invert, full invert, CSS-respecting).
- Q: What fidelity bar counts as success, given Gmail/Outlook algorithms are proprietary?
  A: Directionally accurate — good-faith reproduction based on published reverse-engineering (Litmus/Email on Acid); goal is spotting likely problems (vanishing logos, low-contrast text, harsh inverted brand colors), not pixel-exact parity.

## Grounding

All application code lives in `index.html` (single-file app, no build step, CDN-only dependencies per CLAUDE.md).

**Preview header and iframe**
- `.preview-header` (CSS ~line 178, markup ~line 716) currently hosts a viewport segmented control (`data-vp="desktop"/"mobile"`, wired via `wireSegControl` at ~line 1356 and instantiated ~line 2601) and the test-data switch (`#testDataSwitch`, ~line 736, wired ~lines 2607-2625).
- The preview surface itself is `<iframe class="preview-iframe" id="preview">` (~line 761) inside `#previewStage` (`.preview-stage`, CSS ~line 224).

**Render pipeline — where a dark-mode transform would hook in**
- `render()` (~line 2548) compiles MJML via `mjml2html()`, stores the pure output in `lastHtml` (used by Copy HTML / the raw-HTML modal), and assigns `els.preview.srcdoc = withPreviewLinkHandler(applyTestData(result.html))` (~line 2554). A new dark-mode transform function would slot into this same chain, preview-only, matching the existing separation between `lastHtml` (unmodified, copied) and `srcdoc` (preview-only transforms layered on).
- `applyTestData()` (~line 2429) and `PREVIEW_LINK_HANDLER`/`withPreviewLinkHandler()` (~lines 2469-2487) are the two existing precedents for "transform the srcdoc only, never the copied HTML" — the exact shape a dark-mode transform function should follow.

**No existing dark-mode CSS in compiled output**
- `buildMjml()`'s `<mj-head>` block (~lines 1608-1629) currently injects only `format-detection` and `x-apple-disable-message-reformatting` meta tags plus a fixed `<mj-style>` block for Apple's data-detector links. Grepping the whole file for `prefers-color-scheme`, `color-scheme`, and `dark` returns no matches — there is no dark-mode-aware CSS anywhere in the current output. This directly affects the Apple Mail slice, since Apple Mail's "CSS-respecting" behavior has nothing to respect today.

**Brand color / image surface relevant to risk detection**
- `templates` config (~line 968 onward) defines per-brand `bannerImageUrl` (externally hosted PNG logos), `ctaBackgroundColor`/`ctaTextColor`, and occasional `bannerBackgroundColor`/`bannerHtml` (e.g. `kellerPostmanLead`, ~line 1024, uses a dark navy `#00183e` background with white text — a case worth checking against inversion behavior). `mj-body` defaults to `background-color="#f4f4f4"` and body text defaults to `color="#333333"` (mj-attributes, ~line 1626).

**Existing UI conventions to reuse**
- `wireSegControl(buttons, onChange)` (~line 1356) — canonical mutually-exclusive segmented-control wiring, used for CTA type and viewport; the natural fit for a 3-option client picker.
- `createModuleToggle(id, label, defaultOn, onChange)` (~line 2630) — canonical on/off toggle factory with localStorage persistence (`emailBuilder.module.<id>`), used for the CTA and Promo modules (~lines 2702, 2711). A candidate pattern for the dark-mode on/off toggle itself, separate from the client-selection picker.
- `showWarn()` / `#warn` banner (~line 2542, populated ~lines 2556-2575) — the existing precedent for surfacing non-blocking, actionable warnings during preview (placeholder banner image, missing UTM params). Directly reusable for slice 4's automated risk flags.

## Slices

See frontmatter for the four proposed slices: (1) control shell + Gmail partial-invert, (2) Outlook full-invert, (3) Apple Mail CSS-respecting, (4) automated risk flags via `#warn`. Slices 1-3 are ordered by the user's own framing (Gmail, Outlook, Apple Mail) but that order is itself an open question below.

## Open Questions

All five questions were answered at the idea-review checkpoint (2026-08-11):

1. **Ship order / release granularity?**
   **Answer:** All three transforms built together in one pass before any release, so the picker never has partial/disabled options.
2. **In-browser transform technique (CSS filter vs DOM remapping vs hybrid)?**
   **Answer:** Defer to research/refiner — leave the technique decision to the research phase and the task-refiner, which own this call.
3. **Persist toggle state / selected client across sessions?**
   **Answer:** Persist nothing — mirrors the non-persisted desktop/mobile viewport switcher.
4. **Explicit "simulated" badge on the preview stage?**
   **Answer:** No extra affordance — the picker control itself is sufficient signal.
5. **Slice 4 (automated risk flags) in initial scope?**
   **Answer:** Ship only the 3 visual-simulation slices now; automated flags become a separate follow-up idea once real usage shows which problems are hard to spot visually.

## Assumptions

See frontmatter for all six assumptions with confidence levels and validation methods. Two are load-bearing for scoping: the low-confidence assumption that banner images are the primary vanishing-logo risk (unverifiable without fetching external images), and the medium-confidence assumption about which strategy each client actually uses (needs research-phase confirmation against Litmus/Email on Acid sources before slice 1 implementation begins).
