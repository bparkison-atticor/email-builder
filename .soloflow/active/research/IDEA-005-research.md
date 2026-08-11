# Research Report: Dark Mode Preview Simulation (Gmail / Outlook / Apple Mail)

```
---
id: IDEA-005-research
idea: IDEA-005
created: 2026-08-11T00:00:00Z
---
```

Note on method: no context7 probe was performed (no bash-capable tool was available in this session's toolset), so all research used WebSearch/WebFetch per the fallback path. This is a documentation-and-prior-art research task, not a library-API task, so context7 would have added little regardless — the two candidate JS color libraries below were checked via their own docs/CDN pages, not context7.

## Library Comparison

### Slices 1–3 combined: In-browser transform technique (the deferred question)

This isn't a single-library choice — it's a technique choice, and the evidence points to different techniques being appropriate per client, not one universal answer.

| Technique | Precedent | Effort | Pros | Cons |
|---|---|---|---|---|
| **CSS `filter: invert(100%) hue-rotate(180deg)`** applied to `<body>`, with the same filter re-applied (double-inverted) to `img/video/svg` to cancel the effect on media | This is the *actual documented mechanism Gmail iOS itself uses* — Gmail iOS "applies a CSS filter that inverts the entire email... then reverse-inverts certain elements so photographs look normal" ([Latenode summary](https://community.latenode.com/t/email-design-issues-fixing-color-inversion-in-gmails-dark-mode/8331)). Generic web dark-mode recipe with a full working example incl. Firefox/fullscreen-video caveats: [Aral Balkan](https://ar.al/2021/08/24/implementing-dark-mode-in-a-handful-of-lines-of-css-with-css-filters/). Parcel's own "Emulation" mode does "a forced full-color inversion" as a distinct mode from its media-query preview ([parcel.io/guides/dark-mode](https://parcel.io/guides/dark-mode)). | Low — a handful of CSS lines injected into the srcdoc | Cheap, one rule set, browser-native, directly mirrors a real client's real technique for the "full invert" case (Gmail iOS, Outlook Windows desktop) | All-or-nothing per element; can't selectively skip "already dark" sections the way partial-invert clients do; needs manual per-image/video counter-filter list; Firefox needs an explicit `html{background}` fix |
| **DOM/inline-style color remapping** — walk computed styles, convert each color to HSL, invert/clamp lightness (Dark Reader's approach: for L<0.5 scale toward 0–0.4, for L≥0.5 scale from 0.4 up to a "pole" lightness, hue/saturation preserved) ([DeepWiki: Dark Reader color modification](https://deepwiki.com/darkreader/darkreader/3.3-color-modification)) | This is how browser-extension dark-mode tools (Dark Reader) work, and it's structurally close to what Outlook.com/OWA and Gmail Android actually appear to do — "closer to contrast repair than a global invert," with community reverse-engineering pointing to a **4.5:1 contrast threshold and CIELAB-lightness remap before inline colour rewriting** ([MailMode Outlook guide](https://mailmode.app/learn/outlook-dark-mode-guide)) | Medium — needs a walk of the iframe DOM/computed styles, plus a lightness/contrast function | Can selectively leave already-dark elements alone, can implement a literal WCAG contrast-ratio check (formula below) to decide what to touch — matches "partial invert" behavior far better than a blanket filter | More code to write and to keep correct; no published exact algorithm to match against — any thresholds chosen (e.g. 4.5:1) are approximations of an approximation |
| **Pass-through / conditional no-op** for CSS-respecting behavior | Confirmed empirically: Apple Mail **does not** auto-invert when no `color-scheme`/`supported-color-schemes` meta and no `prefers-color-scheme` CSS is present — "Apple Mail does not automatically invert or adjust email colors... without Dark Mode meta tags, white backgrounds will stay white" ([search synthesis, multiple sources incl. Litmus, Campaign Monitor, uplers.com]). Notably, if the meta tag *is* present but no dark CSS is authored, Apple Mail **does** fall back to a partial invert (light bg → dark, dark text → light) — a documented middle state. | Trivial — grep the compiled HTML for `prefers-color-scheme`/`color-scheme` (already done per the idea) and short-circuit | Zero risk of misrepresenting Apple Mail; directly matches real behavior given today's compiler output has no dark CSS | Only correct as long as the compiler never emits dark-mode CSS; must be revisited if slice work ever adds `prefers-color-scheme` support to compiled output |

**Recommendation:** No single technique serves all three clients faithfully — this is itself the most important finding. Prior art (Parcel's product) independently arrived at the same split: a media-query-respecting preview mode plus a separate forced-invert "emulation" mode ([parcel.io/guides/dark-mode](https://parcel.io/guides/dark-mode)). A defensible hybrid, evidence-grounded per client:
- **Gmail:** CSS filter double-invert (matches Gmail iOS's own real mechanism, and is the cheapest to build).
- **Outlook:** DOM/inline color remap with a lightness-inversion or contrast-threshold heuristic (matches the "contrast repair," not blanket-invert, behavior reverse-engineered for Outlook.com/OWA).
- **Apple Mail:** conditional pass-through (render unchanged, since no dark CSS exists in the compiled output today; optionally simulate the "meta present but no dark styles → partial invert" fallback state if the refiner wants to show that edge case).

This is a technique recommendation grounded in evidence, not an implementation decision — the refiner should weigh build effort against fidelity given the stated bar ("spot likely problems," not pixel parity).

### DOM-remap sub-choice: hand-rolled vs. color library (relevant only if Outlook slice uses DOM remap)

| Library | Version/Size | Last Updated | Adoption | Pros | Cons |
|---|---|---|---|---|---|
| **Hand-rolled JS** (WCAG relative-luminance + HSL invert, ~15–30 lines) | N/A | N/A | N/A | Zero dependency, no CDN fetch, trivial to humanize/debug for this narrow use case; formulas are public and simple (WCAG relative luminance: `L = 0.2126·R + 0.7152·G + 0.0722·B` with sRGB gamma correction; contrast ratio `(L1+0.05)/(L2+0.05)` — [W3C WCAG 2.0 G18](https://www.w3.org/TR/WCAG20-TECHS/G18.html)) | You own correctness/edge cases (named colors, `rgba()`, gradients) yourself |
| **chroma-js** | ~2.4.2 | actively maintained, release in past 12 mo (per Snyk) | ~18.4M weekly npm downloads, ~1.9k GitHub stars | Mature, wide format support, CDN-hosted ([jsDelivr](https://cdn.jsdelivr.net/npm/chroma-js/), [unpkg](https://unpkg.com/browse/chroma-js@2.4.2)), no known vulnerabilities (Snyk) | Full bundle heavier than needed for one HSL-invert function; brings a large surface area for a narrow need |
| **culori** | actively maintained, release in past 12 mo (per Snyk) | ~1.3M weekly npm downloads, ~1.2k GitHub stars | Modern (OKLCH-capable), tree-shakeable, CDN-hosted ([jsDelivr](https://www.jsdelivr.com/package/npm/culori), global `culori` build on unpkg), no known vulnerabilities (Snyk) | Smaller community than chroma-js; OKLCH sophistication is unnecessary for this feature's fidelity bar |

**Recommendation:** given the project's single-file/no-build constraint and the narrow scope (lightness inversion + a contrast check, not a color-science tool), a hand-rolled ~20-line function is the proportionate choice; chroma-js/culori are viable CDN-loadable fallbacks if the refiner wants ready-made color-space conversions, but no clear winner is needed — either satisfies the CDN constraint with no known security issues.

## Best Practices

- **"Levels of dark mode" taxonomy** — useful framing for the refiner: clients split into "Forced Dark Mode" (client overrides colors regardless of author intent) vs. "Optional Dark Mode" (client respects `prefers-color-scheme`/`color-scheme` if authored) ([dev.to/ovidem](https://dev.to/ovidem/levels-of-email-dark-mode-fgh)). Gmail and Outlook fall in the "forced" bucket for most surfaces; Apple Mail is "optional."
- **Background and text invert independently** — a client preserving a background color does not imply it preserves the paired text color, and vice versa; simulations that couple the two risk misrepresenting real contrast failures ([MailMode Gmail guide](https://www.mailmode.app/learn/gmail-dark-mode-email-rendering-guide)).
- **Images are not guaranteed safe** — transparent PNG logos can lose contrast/definition under dark-mode transforms in real clients; some sources report Gmail Android specifically inverting small images (under ~100px) ([crafting.email](https://crafting.email/dark-mode-email-logo-fix/), [actionrocket.co](https://www.actionrocket.co/blog/dark-mode-images-common-issues-amp-how-to-avoid-them)). Relevant primarily to the deferred "automated risk flags" idea, noted briefly per scope instructions.
- **"Testing in Gmail web proves nothing"** — Gmail's desktop webmail leaves the email body untouched and only darkens surrounding chrome; only Gmail iOS/Android apps and Gmail mobile web actually transform the body ([dev.to/mailpeek](https://dev.to/mailpeek/dark-mode-is-still-breaking-your-html-emails-here-is-the-logic-to-fix-it-g5c)). This matters for framing what "the Gmail simulation" in a single picker option is actually approximating — it should represent the app (iOS/Android), not Gmail web, since Gmail web does nothing.
- **CSS filter double-invert has known edge cases**: Firefox doesn't apply `invert()` to the root background (needs an explicit dark `html{background}` fallback); fullscreen video escapes the body filter and needs a `:fullscreen{filter:none}` override ([ar.al](https://ar.al/2021/08/24/implementing-dark-mode-in-a-handful-of-lines-of-css-with-css-filters/)). Directly relevant if the Gmail slice uses this technique inside the preview iframe.
- **Segmented-control UI general guidance**: segmented controls work best when all options are visible at once with large tap targets and immediate (non-navigating) results ([eleken.co](https://www.eleken.co/blog-posts/segmented-control-ui)) — generic UX guidance, not dark-mode-specific prior art (see Validated Assumptions below).

## API Documentation

No external service APIs are involved in this feature — the transforms are purely client-side CSS/DOM operations on the preview iframe's srcdoc; there is no network call, auth, or rate limit surface to document. The one external reference surface worth treating as "documentation" is caniemail.com's community-maintained support-matrix data (not an API, but the closest thing to authoritative published behavior data):
- **Source:** [caniemail.com — @media (prefers-color-scheme)](https://www.caniemail.com/features/css-at-media-prefers-color-scheme/), primary data at [github.com/hteumeuleu/caniemail](https://raw.githubusercontent.com/hteumeuleu/caniemail/main/_features/css-at-media-prefers-color-scheme.md)
- **Key data pulled directly from the primary source file (more reliable than secondary blog summaries, which disagreed with each other during this research — see Risks):**
  - Gmail: `prefers-color-scheme` **not supported on any platform** (desktop webmail, iOS, Android, mobile webmail) as of the data checked — Gmail is transformed via `@media ( _filtered_a )`, i.e., the query is stripped/neutralized, not honored.
  - Apple Mail: supported macOS 12.4+ / iOS 13.0+; **not** supported macOS 10.3 / iOS 12.2 (matches the "Mail 12 needs meta tag, Mail 13+ needs CSS property" version split noted in [hteumeuleu/email-bugs#104](https://github.com/hteumeuleu/email-bugs/issues/104)).
  - Outlook: supported on macOS (2019+), Outlook.com (2019-07+), iOS (2020+); **not** supported on Windows classic (2003–2019) or Android (until 2023-03).
  - Outlook.com/OWA adds `data-ogsc`/`data-ogsb`/`data-ogac`/`data-ogab` attributes storing original colors when it dark-mode-rewrites an element — a distinctive, documented fingerprint of its approach ([hteumeuleu.com](https://www.hteumeuleu.com/2021/emails-react-outlook-com-dark-mode/)).

## Prior Art

- **Source:** [Parcel — Guide to dark mode](https://parcel.io/guides/dark-mode)
  **Approach:** Offers two distinct preview modes: a media-query-respecting preview (System/Light/Dark) and a separate "Emulation" mode that forces full color inversion regardless of authored CSS.
  **Relevance:** Directly validates the hybrid-technique recommendation above — a real commercial tool already splits "respect author CSS" from "force an invert" rather than using one universal transform.

- **Source:** [Dark Reader color-modification internals](https://deepwiki.com/darkreader/darkreader/3.3-color-modification)
  **Approach:** Converts RGB→HSL, inverts/clamps lightness (not a blanket invert), preserves hue/saturation, has special-case handling for problematic hues (yellow).
  **Relevance:** The closest available real-world reference implementation for a "DOM color-remap" technique, useful as a concrete algorithm sketch if the Outlook slice goes the remap route instead of a filter.

- **Source:** [Rémi Parmentier (hteumeuleu) — Fixing Gmail's dark mode issues with CSS blend modes](https://www.hteumeuleu.com/2021/fixing-gmail-dark-mode-css-blend-modes/)
  **Approach:** Documents Gmail's observed inversion pattern (white text→black, black bg→white, colored backgrounds lightened) and a `mix-blend-mode: difference`/`screen` counter-technique authors use to defeat it.
  **Relevance:** One of the few sources with concrete before/after color examples for Gmail's transform; useful as a sanity-check reference for whatever Gmail simulation is built, though it describes *defeating* the effect rather than *replicating* it.

- **Source:** [hteumeuleu/email-bugs](https://github.com/hteumeuleu/email-bugs) (issue #104 specifically) and [matthieuSolente/email-darkmode](https://github.com/matthieuSolente/email-darkmode)
  **Approach:** Community-maintained catalogs of specific, versioned email-client dark-mode bugs/behaviors (not simulators, but structured bug reports with reproductions).
  **Relevance:** Good ongoing reference for the refiner/implementer to sanity-check specific edge cases, and a candidate to re-check periodically since client behavior drifts (see Risks).

- **Source:** [Litmus / Email on Acid dark-mode preview products](https://www.litmus.com/blog/new-in-litmus-extended-dark-mode-testing)
  **Approach:** These commercial tools generate dark-mode previews from **real/live client screenshots**, not an in-browser simulation — Email on Acid explicitly advertises "90+ live (not emulated) email clients and devices."
  **Relevance:** Important scoping signal: the two market leaders in this exact space deliberately avoid in-browser simulation and use real render farms instead. That's out of reach for a single-file, no-backend app, but it confirms the idea's own framing ("directionally-accurate approximation," not pixel-exact parity) is the realistic ceiling for an in-browser approach, and that even professional tools don't claim to have solved the "exact formula" problem — they sidestepped it with real devices.

## Answered Questions

- **Q:** What in-browser technique should implement each client's transform? (CSS filter approximation vs DOM color-remapping with a published rule table vs hybrid)
  **A:** No published rule table exists for any of the three clients (see next answer), so a pure "DOM remap against a published rule table" is not possible as literally stated. The evidence supports a **hybrid**: CSS filter double-invert for Gmail (mirrors Gmail iOS's actual known mechanism), DOM/inline lightness-remap or contrast-threshold heuristic for Outlook (mirrors Outlook.com's reverse-engineered contrast-repair behavior), and a conditional pass-through for Apple Mail (mirrors its confirmed "no dark CSS present → renders unchanged" behavior). This mirrors what Parcel's commercial tool already does architecturally.
  **Source:** [parcel.io/guides/dark-mode](https://parcel.io/guides/dark-mode), [ar.al CSS filter technique](https://ar.al/2021/08/24/implementing-dark-mode-in-a-handful-of-lines-of-css-with-css-filters/), [MailMode Outlook guide](https://mailmode.app/learn/outlook-dark-mode-guide), [DeepWiki Dark Reader](https://deepwiki.com/darkreader/darkreader/3.3-color-modification)

- **Q:** What are the actual published transform rules per client?
  **A:** None are officially published by Google, Microsoft, or Apple. All available "rules" are community reverse-engineering: Gmail's algorithm is explicitly stated as "not published" by multiple independent sources; Outlook's is undocumented, with only circumstantial evidence (a claimed 4.5:1 contrast threshold, CIELAB-lightness remap, and the `data-ogsc`/`data-ogsb` attribute fingerprint) from developer inspection, not a Microsoft spec; Apple Mail's behavior is the best-documented of the three because it's rule-based on explicit author opt-in (`color-scheme`/`supported-color-schemes` meta + `prefers-color-scheme`) rather than a proprietary heuristic.
  **Source:** [MailMode Gmail guide](https://www.mailmode.app/learn/gmail-dark-mode-email-rendering-guide) ("The algorithm is not published"), [MailMode Outlook guide](https://mailmode.app/learn/outlook-dark-mode-guide), [hteumeuleu.com](https://www.hteumeuleu.com/2021/fixing-gmail-dark-mode-css-blend-modes/) ("It's never been clear to me how Gmail actually proceeds to do these color changes")

## Validated Assumptions

- **Assumption:** (medium) Gmail = partial invert, Outlook = full color-swap.
  **Evidence:** Contradicted in the direction that matters most for a single "Gmail" and single "Outlook" picker option. Gmail's behavior splits by platform: Gmail **web** = no transform of the body at all; Gmail **Android** = partial invert; Gmail **iOS** = full invert ([dev.to/ovidem](https://dev.to/ovidem/levels-of-email-dark-mode-fgh), [MailMode](https://www.mailmode.app/learn/gmail-dark-mode-email-rendering-guide)). Outlook's behavior also splits by platform: Outlook **Windows desktop** (Word/MSO engine) = full invert; Outlook.com/OWA = partial/contrast-repair; Outlook Mac and mobile = mixed, more standards-friendly in places ([MailMode Outlook guide](https://mailmode.app/learn/outlook-dark-mode-guide)). So "Gmail=partial, Outlook=full" is true for *some* surfaces of each brand but false for others (Gmail iOS is full-invert; Outlook.com is partial/contrast-repair) — the assumption as a blanket per-brand statement doesn't hold up against the platform-level evidence.
  **Updated confidence:** low — this needs an explicit refiner/human decision about *which platform surface* each single picker option is meant to represent (e.g., "Gmail" picker = Gmail iOS/Android app behavior, not Gmail web; "Outlook" picker = which of Windows desktop vs OWA is the more commonly hit case for this audience).

- **Assumption:** (high, sanity-check only) Gmail/Outlook algorithms are proprietary/undocumented; simulation is necessarily approximate.
  **Evidence:** Strongly confirmed by multiple independent sources explicitly stating the algorithms are not published, plus the market-leading testing tools (Litmus, Email on Acid) sidestepping the problem entirely by using real device/client screenshots rather than simulating.
  **Updated confidence:** high (confirmed).

- **Assumption:** (medium) A 3-option segmented picker + toggle fits the existing preview header — any prior art on how other tools present client dark-mode pickers is a bonus.
  **Evidence:** No prior art was found of a tool presenting exactly a 3-button Gmail/Outlook/Apple-Mail segmented picker for dark-mode simulation. Litmus/Email on Acid present dark-mode results as part of a much larger client/device grid (dozens of real clients), not a compact 3-way picker. Parcel's UI (per its guide text) is a mode selector (System/Light/Dark) plus a separate Emulation toggle — closer in spirit but not a client-brand picker. General segmented-control UX guidance exists but is generic, not dark-mode-specific.
  **Updated confidence:** remains medium/low — the UI pattern itself is not contradicted by anything found, but there's no direct precedent validating it either; this is effectively still an unvalidated design choice for the refiner.

## Risks

- **Reverse-engineered heuristics disagree with each other across sources.** During this research, different secondary sources gave conflicting claims about the same client (e.g., one AI-summarized source claimed Gmail fully supports `prefers-color-scheme` "from 2020 onward," while the primary caniemail.com data file states Gmail supports it on **no** platform). The primary/canonical source (caniemail's own data file) was used to resolve the conflict, but this signals that any rule table baked into the simulation should be sourced from primary/canonical references (caniemail.com, hteumeuleu's email-bugs repo) rather than secondary blog summaries, and re-verified before implementation.
- **Client behavior drifts over time and isn't versioned by the vendors.** caniemail's own data shows support changing across specific dated ranges (e.g., Outlook Android didn't support `prefers-color-scheme` until 2023-03). Whatever heuristic/threshold values the refiner encodes will age; there's no vendor changelog to watch, only community trackers (email-bugs repo) — worth a light "review this periodically" note wherever the transform functions land.
- **No pixel-exact validation is possible in principle**, since even the professional tools (Litmus, Email on Acid) rely on live device screenshots rather than a formula — this bounds the feature's fidelity ceiling regardless of implementation quality, consistent with the idea's own stated bar.
- **Apple Mail's fallback partial-invert state (meta tag present, no dark CSS)** is a real, documented edge case distinct from "no meta tag at all → unchanged." If the compiled output ever gains a bare `color-scheme` meta tag without full dark styling (e.g., as a future enhancement), Apple Mail's real behavior would shift from "unchanged" to "partial invert" — worth flagging to the refiner so slice 3's "renders unchanged" design doesn't get silently invalidated by an unrelated future change to the compiler.
- No license or security-advisory concerns found for the two candidate color libraries (chroma-js, culori) — both MIT-style, both CDN-hosted, no known vulnerabilities per Snyk at time of research. Not a blocker either way given a hand-rolled function is likely sufficient.
