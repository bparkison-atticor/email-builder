---
sprint: SPRINT-007
pending_count: 19
last_updated: "2026-08-12T01:30:00.000Z"
---
# Findings Queue

## FIND-SPRINT-007-1
- **source:** TASK-014 (verifier)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:2600-2603
- **description:** The TASK-014 migration shim performs an unguarded `localStorage.setItem` at module-init time (top level of the `<script type="module">`), which is a new class of boot-time exposure. Before this task the module body only *read* localStorage at init; the first *write* happened inside the `flipTestData` click handler, so a write failure degraded one interaction rather than the whole app. Now, if `setItem` throws (QuotaExceededError, storage-write-blocked profiles, extensions that stub `Storage.prototype.setItem`), the uncaught exception aborts the rest of the module body: no preview render, no test-data/CTA/promo toggles, no copy wiring, no Ctrl+Shift+T harness — a blank app. Reproduced with headless Chrome by stubbing `Storage.prototype.setItem` to throw only for the `emailBuilder.module.testData` key: the pre-change build boots normally (`previewRendered: true, toggleRendered: true`), the post-change build does not (`previewRendered: false, toggleRendered: false`, `EXCEPTION: QuotaExceededError`). Note the shim's write is on the one-time boot path for *every* pre-existing user (new key null + legacy key present), so the blast radius is the whole installed base even though the throw probability is low. Not a blocker: the trigger requires a storage state this app cannot realistically create (its own payloads are kilobytes), and the fully-blocked-storage case already broke the pre-change build at the init-time `getItem`.
- **suggested_action:** Wrap the shim in `try { ... } catch {}` so a failed migration degrades to the `defaultOn` value instead of bricking init. Consider the same treatment for `createModuleToggle`'s `flip()` write (index.html:2649) — that one only breaks a single interaction today, but the pattern is the same.
- **resolved_by:** 

## FIND-SPRINT-007-2
- **source:** TASK-014 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2598-2603
- **description:** The one-time migration shim never deletes the legacy `emailBuilder.testDataEnabled` key after copying it, so the stale key lingers in every migrated user's localStorage indefinitely and the shim itself has no retirement trigger. It is correctly idempotent (only fires while the new key is null) and new-key-wins precedence was verified, but if a user ever clears only `emailBuilder.module.testData`, the shim silently resurrects a preference the user may have set years earlier. The TASK-014 plan anticipated this ("removable later") without scheduling the removal.
- **suggested_action:** Either `localStorage.removeItem('emailBuilder.testDataEnabled')` immediately after the successful copy (makes the shim self-retiring and single-shot), or schedule shim deletion for a dated cleanup task once the migration window has passed.
- **resolved_by:** 

## FIND-SPRINT-007-3
- **source:** TASK-014 (code-reviewer)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** CODE-PATTERNS.md:53-58
- **description:** The `createModuleToggle` entry in CODE-PATTERNS.md is now stale in two ways after TASK-014. Its **Gotcha** still reads "The legacy `testDataEnabled` toggle uses a different key (`emailBuilder.testDataEnabled`) — migrating it onto this factory needs a one-time key migration or the saved preference resets," which describes the migration as pending work; it has shipped, and a future agent reading this would think there is still a hand-rolled toggle to migrate. Its **Location** and **Canonical example** line refs (`~line 1920`, `~line 1992`) are ~700 lines off from the current file (factory is at index.html:2615, CTA call site at index.html:2687) — pre-existing drift, not caused by this task, but the same entry. The file is in TASK-014's `files_readonly` set so the executor could not update it.
- **suggested_action:** Rewrite the Gotcha to state the migration is complete: state persists under `emailBuilder.module.<id>`; the test-data toggle was migrated from the legacy `emailBuilder.testDataEnabled` key in TASK-014 and a one-time copy shim (index.html:2598-2603) preserves pre-migration preferences. Note that the test-data caller re-applies its own `title` attribute after construction because the factory does not accept one. Refresh the line refs while there, and add the preview-header call site (index.html:2608-2610) as a second canonical example.
- **resolved_by:** 

## FIND-SPRINT-007-4
- **source:** TASK-014 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:364
- **description:** The CSS section banner `/* ---------- Top bar: divider, switch, toolbar buttons ---------- */` names a `switch` class that no longer exists anywhere in the file — TASK-014 removed the `.switch` halves of the comma-paired rules beneath it (index.html:371-407) along with the last `class="switch"` element. A reader who greps for `.switch` after reading this banner finds nothing. Sits four lines above the edited block, so it is adjacent to the diff rather than in it.
- **suggested_action:** Change the banner to `/* ---------- Top bar: divider, module toggle, toolbar buttons ---------- */`.
- **resolved_by:** 

## FIND-SPRINT-007-5
- **source:** TASK-021 (verifier)
- **type:** bug
- **severity:** medium
- **status:** resolved
- **location:** index.html:2686-2696
- **description:** `applyDarkMode` clears `darkModeError` only on the success path (`darkModeError = ''` after a transform returns). Its two early returns — `if (!darkModeEnabled) return html;` and `if (!transform) return html;` — leave a previously-set error string in place, so once a transform throws, the plain-English warning "Dark-mode preview could not be applied — showing the untransformed email." stays pinned in the `#warn` banner after the marketer switches dark mode back OFF, even though the preview is now the ordinary untransformed email and nothing is wrong. Reproduced against a fault-injected copy of `index.html` (scratchpad only, repo untouched) in headless Chrome: with `gmailDarkTransform` patched to throw, flipping dark mode ON shows the warning correctly, and flipping it back OFF leaves `#warn` visible with the same text (`staleWarningPersists: true`). Switching to a client whose transform succeeds does clear it. Not a blocker for TASK-021 and not an executor error — the plan's step 9 prescribes exactly this clear-on-success-only shape, and the path is currently unreachable in production because `gmailDarkTransform` cannot throw on the always-string `result.html` and the other two transforms are identity stubs. It becomes user-reachable as soon as TASK-022 lands a real OWA transform that can throw.
- **suggested_action:** Clear the staged error on every non-transforming return, e.g. set `darkModeError = ''` immediately before `if (!darkModeEnabled) return html;` and before the missing-transform return, so the warning's lifetime matches the condition it describes. Worth folding into TASK-022 since that task introduces the first transform that can realistically throw.
- **resolved_by:** TASK-022

## FIND-SPRINT-007-6
- **source:** TASK-021 (verifier)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:2853
- **description:** The "Apple Mail" picker button label wraps onto two lines once `.preview-header-left` wraps, which happens at viewport widths of roughly 1280px and below. Measured with CDP device-metrics emulation and dark mode ON (worst case, picker visible): at 1440px the header is a single row 75px tall; at 1280px and 1024px it wraps to two rows and the header grows to 117px, with the picker itself ~56px tall because only the "Apple Mail" label breaks. Nothing overflows or clips at 1440/1280/1024/900 (`scrollWidth === clientWidth` at every width) and all controls stay reachable, so this is cosmetic rather than functional, and the plan's Lowest Confidence Area explicitly anticipated a taller wrapped header as the accepted tradeoff. The uneven button heights are the only part that reads as unintended. A trailing `.divider` also dangles at the end of the first wrapped row at 1024px.
- **suggested_action:** Add `white-space: nowrap;` to `.seg-control button` (or just the dark-client buttons) so all three labels stay single-line and the picker keeps a uniform 34px height. If the header still feels tall at 1024px, the plan already names the next lever: abbreviate the picker labels or move the dark-mode group to the right of `.copy-group`.
- **resolved_by:** 

## FIND-SPRINT-007-7
- **source:** TASK-021 (code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:2434-2438
- **description:** The preview-only purity guard (harness Section 8, fixture 8) passes vacuously in the state the harness is normally opened in. It asserts `typeof lastHtml === 'string' && lastHtml.indexOf('EB-DARKSIM') === -1` against whatever `lastHtml` happens to hold at harness-open time. Because dark-mode state is deliberately not persisted, a fresh load always has `darkModeEnabled === false`, and with dark mode off `applyDarkMode` is the identity function — so the fixture would still report PASS even if someone regressed `render()` to `lastHtml = applyDarkMode(result.html)`. The guard only exercises the invariant if the tester manually flips dark mode ON *before* pressing Ctrl+Shift+T. The plan calls this "the highest-value regression lock in the whole epic" and mandates it stay in the harness for the life of the feature, so the gap between its advertised and actual strength matters. The shipped code is correct — `lastHtml = result.html;` (index.html:2762) is genuinely unwrapped and verified by reading — this is purely a test-strength issue. Not an executor error: the plan's Test Strategy specifies this assertion verbatim.
- **suggested_action:** Make the fixture force the condition it claims to test rather than sampling ambient state. Cheapest deterministic form: save `darkModeEnabled` / `darkModeClient`, set them to `true` / `'gmail'`, call `render()` (it is synchronous), capture `lastHtml`, restore both flags in a `finally` and call `render()` again to restore the preview, then assert the captured string has no `EB-DARKSIM`. Natural home is TASK-024 (epic finish), since TASK-022 and TASK-023 both extend the transform chain the guard protects.
- **resolved_by:** 

## FIND-SPRINT-007-8
- **source:** TASK-021 (code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** resolved
- **location:** index.html:2591-2601
- **description:** `injectPreviewStyle(html, css)` concatenates `css` into a `<style type="text/css">…</style>` block without neutralizing a `</style>` sequence inside `css`. Today this is unexploitable and not a vulnerability: the only call site is `gmailDarkTransform` (index.html:2672), whose `css` is a compile-time literal array with no interpolation, and the helper's function-replacer discipline already blocks the adjacent `$&` / `$'` / `` $` `` substitution-pattern hazard. The concern is forward-looking. TASK-022 implements the OWA transform as *selective contrast repair*, which is exactly the shape of transform that wants to interpolate values — brand colors from `TEMPLATE_CONFIGS`, or worse, values that originated in marketer-controlled fields — into the generated CSS. The moment any non-literal string reaches `css`, a `</style>` inside it terminates the style element early and the remainder is parsed as HTML inside the preview iframe, which is same-origin with the app and already hosts an injected `<script>` (`PREVIEW_LINK_HANDLER`, index.html:2565). The guard is one line and is far cheaper to add while the helper still has a single trusted caller than to retrofit after two more transforms depend on it.
- **suggested_action:** In `injectPreviewStyle`, sanitize before concatenating — e.g. `const safeCss = String(css).replace(/<\/style/gi, '<\\/style');` — and build `styleBlock` from `safeCss`. Add a Section 8 fixture asserting `injectPreviewStyle('<html><head></head><body>x</body></html>', '/* EB-DARKSIM */ body { color: red; } </style><img src=x>')` yields output with no second `<style>`-terminating sequence. Best folded into TASK-022 alongside the first transform that may interpolate.
- **resolved_by:** TASK-022

## FIND-SPRINT-007-9
- **source:** TASK-021 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2354-2366, 2441-2453
- **description:** `renderTestHarness()` now contains two byte-for-byte-equivalent predicate-fixture row loops — Section 7's `TRUNCATION_GUARDS` loop and Section 8's `DARK_MODE_FIXTURES` loop. Both use the identical `{ label, check(), description }` shape, the identical `try { … } catch { return false; }` wrapper, and the identical five-line `row.innerHTML` template; the only difference is the FAIL suffix string (`'FAIL — script was truncated or wiring did not run'` vs `'FAIL'`). This is not the executor's invention — the plan directed reuse of the `TRUNCATION_GUARDS` shape and the executor followed it faithfully, which is the right call for consistency. It is worth queuing now rather than later because the duplication is scheduled to compound inside this same epic: TASK-022 and TASK-023 each add another dark-mode harness section, and each will need a third and fourth copy of the same 13 lines. Extraction is cheapest before those land, not after.
- **suggested_action:** Extract a `renderPredicateFixtures(body, fixtures, failText)` helper next to the existing harness code and have Sections 7 and 8 call it, then have TASK-022 and TASK-023 call it for their sections instead of pasting the loop again. Leave Sections 5 and 6 alone — they render genuinely different field sets (Input / Output block, Input / Expected / Actual) and do not fit the predicate shape.
- **resolved_by:** 

## FIND-SPRINT-007-10
- **type:** bug
- **source:** TASK-022 (executor)
- **severity:** low
- **status:** resolved
- **resolved_by:** TASK-022
- **location:** .soloflow/active/plans/dark-mode-preview/TASK-022-plan.md (Test Strategy fixture 9)
- **description:** The plan's chosen fixture for proving the 4.5:1 contrast guard is live (#767676) cannot demonstrate it under the plan's own remapLightness formula. Verified numerically (Node cross-check, and cross-validated against the published fact that #808080 has a 5.32:1 ratio against pure black): for any achromatic (grayscale) input with HSL lightness < 0.5, remapLightness's dark branch (L prime = 0.90 - L*0.40) always lands in the range [0.70, 0.90], and the crossover HSL lightness where a gray's contrast against #1b1b1b drops below 4.5 is only about 0.51 -- always below that floor. So contrastRatio(remapLightness(#767676), '#1b1b1b') is ~8.52, never <4.5, and the guard cannot fire for any gray, not just this one. The guard only fires for saturated hues where WCAG luminance weighting (0.0722 for blue) diverges sharply from HSL lightness -- confirmed by a full hue/lightness sweep finding failing cases only in a narrow blue band (h~=240, l~=0.46-0.49).
- **suggested_action:** Executor substituted #0000ee (the classic browser default :link blue) for the 'guard exercised' Section 9 fixture instead of #767676 -- verified pre-lift contrast 4.323 (fails 4.5), post-lift 4.812 (passes) after exactly one +0.02 lightness iteration. No plan change needed since the fixture list is illustrative once implemented; flagging so a future reader of the plan text isn't misled by the #767676 example.

## FIND-SPRINT-007-11
- **source:** TASK-022 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:3070, index.html:3073
- **description:** Neither regex in `remapInlineColors` is anchored to an attribute-name boundary, so both match more than the two attribute shapes they document. Confirmed by extracting the shipped functions verbatim and running them under Node: `<td data-style="color:#333333">` becomes `data-style="color:#d1d1d1"`, `<td xstyle="color:#333333">` likewise, `<td data-bgcolor="#ffffff">` becomes `#1a1a1a`, and a plain text node reading `style="color:#333333"` is rewritten as well. What makes this worth queuing is not the behavior (inert today) but the function's own comment, which asserts a guarantee half of which does not hold: "every other attribute (including href) is untouched because neither regex can match outside those two attribute shapes." The href half is genuinely true — `[^"]*` cannot cross a quote, which is the boundary property the whole design rests on — but the attribute-name half is not, and a future maintainer extending this pass will reasonably trust the stronger claim. No impact today: mjml-browser emits no attribute names ending in `style`/`bgcolor`, the verifier confirmed all 8 templates survive uncorrupted, and the transform is preview-only so nothing can reach the copied HTML.
- **suggested_action:** Anchor both patterns to a name boundary and narrow the comment to the claim that actually holds. Lookbehind form: `/(?<![-\w])style="([^"]*)"/gi` and `/(?<![-\w])bgcolor=(["'])([^"']*)\1/gi`. If lookbehind support is a concern, capture the preceding character instead (`/([\s"'])style="([^"]*)"/gi`, re-emitting `$1`) — attributes are always whitespace-separated so no overlap hazard. Natural home is TASK-024 (epic finish), alongside the other harness/comment tidying.
- **resolved_by:** 

## FIND-SPRINT-007-12
- **source:** TASK-022 (code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:3089 (vs. index.html:2987)
- **description:** `OUTLOOK_DARK_SURFACE = '#1b1b1b'` (index.html:2987) is the declared simulated surface that every foreground contrast decision in `remapForegroundValue`/`liftForContrast` is measured against, but `outlookDarkTransform` re-states the same value as a bare literal in its injected canvas rule (`'html { background-color: #1b1b1b !important; }'`) rather than interpolating the constant. Two sources of truth for one semantic value. The failure mode if they drift is silent and invisible to every ground-truth check: tuning `OUTLOOK_DARK_SURFACE` while calibrating the contrast guard leaves the preview painting the old canvas color, so the guard certifies 4.5:1 against a surface the marketer is not actually looking at, with no test, type, or lint signal. They agree today, so nothing is currently wrong. Secondary note: this also leaves the comment added to `injectPreviewStyle` in commit d931119 ("TASK-022's outlookDarkTransform is the first transform whose css could plausibly carry interpolated color values") describing something the code does not yet do — interpolating the constant would make the comment true and give the new `</style` neutralization a live caller.
- **suggested_action:** Build the rule as `'html { background-color: ' + OUTLOOK_DARK_SURFACE + ' !important; }'`. Safe as of d931119: `injectPreviewStyle` now neutralizes a literal `</style` in its `css` argument and already uses function replacers throughout, so an interpolated value cannot terminate the style element or be read as a `$`-substitution pattern.
- **resolved_by:** 

## FIND-SPRINT-007-13
- **source:** TASK-022 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2989
- **description:** `const BACKGROUND_COLOR_PROPS = ['background-color', 'bgcolor'];` — the `'bgcolor'` member is unreachable in any meaningful sense. `BACKGROUND_COLOR_PROPS` is consulted only by `remapDeclarations`, which only ever runs on the contents of a `style` attribute, and `bgcolor:` is not a CSS property there; the real `bgcolor` *attribute* path in `remapInlineColors` (index.html:3073) calls `remapBackgroundValue` directly without consulting the list. The only input the member can act on is an invalid `style="bgcolor:#fff"` declaration the browser ignores anyway. Not an executor error — the plan's step 3 names "background-color, background, and bgcolor" as the background property set — but as shipped it implies style-attribute `bgcolor` declarations are a supported input path, which they are not.
- **suggested_action:** Either reduce the array to `['background-color']` (the `background` shorthand is already special-cased above it), or keep the member and add a trailing comment noting it exists only to mirror the attribute name handled separately at index.html:3073.
- **resolved_by:** 

## FIND-SPRINT-007-14
- **source:** TASK-023 (verifier)
- **type:** improvement
- **severity:** high
- **status:** open
- **location:** index.html:2604-2608 (Section 10 fixture 1), index.html:3196-3212 (detector)
- **description:** The "Detector: authored beats meta (substring-ordering trap)" fixture cannot detect a reordering of `detectAuthorDarkScheme`'s branches, so the regression lock its label and description advertise does not exist. Mutation-tested against a scratchpad copy of `index.html` (repo untouched): swapping the `'authored'` check below the `'meta-only'` meta-name check leaves all 66 harness fixtures GREEN, including this one. The reason is that the substring trap the plan describes is already neutralized by the regexes themselves, independently of order — the fixture input `<style>@media (prefers-color-scheme: dark){body{color:#fff}}</style>` contains no `name=`, so `/name=["']?(?:color-scheme|supported-color-schemes)/i` cannot match it, and the character preceding `color-scheme:` inside `prefers-color-scheme:` is `-`, which is not in the `[;{"'\s]` delimiter class, so the CSS-property regex cannot match it either. Verified all three branch permutations return `'authored'` for that input. Consequently the fixture's rendered description — "a detector that checked meta-only first would misclassify this input as meta-only" — is a false statement about the shipped implementation, and the `BRANCH ORDER IS LOAD-BEARING ... Do not reorder` comment at index.html:3196-3204 asserts a dependency the code does not actually have. Not an executor error: the plan (step 2 regexes, Test Strategy fixture 1 and its mandated description text) prescribes both verbatim; the plan's own regex choice is what makes its ordering claim moot. Behavior is correct — the detector returned the expected state for all 18 adversarial inputs probed (quote variants, unquoted attrs, reversed attribute order, case variants, CSS-property forms after `;`/`{`/`"`, a `?color-scheme=` query-string lookalike, and non-string inputs).
- **suggested_action:** Change the fixture input to one where order genuinely decides the answer — `'<meta name="color-scheme" content="light dark"><style>@media (prefers-color-scheme: dark){body{color:#fff}}</style>'`, still asserting `=== 'authored'`. Verified: the shipped authored-first detector returns `'authored'`, and both reordered variants return `'meta-only'`, so the fixture then fails on any reorder. Keep the current input as a second fixture if the plain authored case is still wanted. Then either keep the load-bearing comment (now backed by a real test) or narrow it to say the order is defensive against a future loosening of the meta regex rather than required by today's patterns.
- **resolved_by:** 

## FIND-SPRINT-007-15
- **source:** TASK-023 (verifier)
- **type:** bug
- **severity:** high
- **status:** open
- **location:** index.html:234-250 (`.preview-iframe` / `.preview-stage.dark`)
- **description:** The darkened `.preview-stage` chrome — which the epic designates as the *entire* visual signal for the Apple Mail no-op, and which TASK-023's plan calls "the dark stage chrome from TASK-021 already supplies the signal" — is completely invisible in the default desktop viewport, because `.preview-iframe { width: 100%; height: 100% }` occludes the stage background. Measured in headless Chromium at 1600x1000: stage 1180x941, iframe 1178x941; a full-stage screenshot with dark mode ON and Apple Mail selected contains **zero** pixels of `#1a1a1a` (`rgb(26,26,26)`), and every probed point (far left, mid, right edge, bottom) reads `rgb(244,244,244)` — the same value as those points with dark mode OFF. Gmail and Outlook look dark only because their transforms repaint inside the iframe, not because of the stage rule. Net effect: with the default desktop viewport, turning dark mode ON and selecting Apple Mail changes nothing whatsoever inside the preview stage. The only feedback the marketer gets is the toggle's own ON state, the picker appearing, and the button tooltip. The rule does work in the mobile viewport, where `.preview-stage.mobile .preview-iframe { width: 375px }` leaves the chrome exposed — screenshot comparison there shows a 69.3% pixel difference between dark-OFF and dark-ON/Apple Mail, and the intended "white email inside a dark surround" reads correctly. This directly undermines the scope decision recorded in the TASK-023 plan ("The button tooltip plus the darkened stage chrome carry the disclosure instead"), which was locked on the premise that the chrome is visible; and it sharpens the plan's own Lowest Confidence Area ("whether a marketer reads the Apple Mail no-op as information or as a bug") from a UX bet into a near-certainty in the default view. Not a TASK-023 defect — the CSS is TASK-021's and TASK-023's plan explicitly forbade adding further affordances — but TASK-024 is the last chance to address it before the epic closes.
- **suggested_action:** Give the desktop iframe an inset so the stage rule can show, e.g. `.preview-stage.dark .preview-iframe { margin: 16px; width: calc(100% - 32px); height: calc(100% - 32px); }` (or a stage `padding` when `.dark` is set), so a dark frame surrounds the unchanged white email in both viewport modes. Alternatively reopen the scope decision for the one-line muted caption the plan already names as the cheapest escalation. Whichever is chosen, TASK-024 should re-run the desktop smoke and confirm dark-ON/Apple Mail is no longer pixel-identical to dark-OFF.
- **resolved_by:** 

## FIND-SPRINT-007-16
- **source:** TASK-023 (code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:3211 (detector branch 3), index.html:2602-2650 (Section 10 fixtures)
- **description:** `detectAuthorDarkScheme`'s third branch — `if (/[;{"'\s]color-scheme\s*:/i.test(html)) return 'meta-only';`, the CSS-property form — has zero fixture coverage, and it is simultaneously the loosest of the three matchers. Verified by extracting the shipped detector into Node and re-running all seven Section 10 predicates against a variant with branch 3 deleted: all seven still return true, so nothing in the harness distinguishes the shipped detector from one without that line. Every meta-only fixture uses the `name="..."` form caught by branch 2. Separately, branch 3 is the only matcher with no attribute context requirement, so it fires on ordinary prose: `detectAuthorDarkScheme('<p>Ask about our color-scheme: blue and white</p>')` returns `'meta-only'` (a space satisfies the `[;{"'\s]` delimiter class). Because the transform and the drift guard both scan the whole compiled document including marketer body copy, such a string would flip the Apple Mail option from its documented identity behavior to a silent partial invert, and would make the drift-guard fixture FAIL with a description that sends the reader to `buildMjml()` for a cause that is actually in the marketer's copy. Improbable content, and unreachable from today's compiler output, so nothing is currently wrong — but the branch is both untested and the one path that user content can reach. The plan's Lowest Confidence Area anticipated exactly this ("If it proves fragile, drop to meta-name matching only — that is the state the research actually documents").
- **suggested_action:** Add a Section 10 fixture asserting `detectAuthorDarkScheme('<style>:root{color-scheme:light dark}</style>') === 'meta-only'` (verified: passes as shipped, fails if branch 3 is removed) so the branch has a regression lock. Then decide deliberately whether to keep it: either keep and tighten it to a stylesheet/attribute context, or take the plan's own escape hatch and drop to meta-name matching only, which removes the prose-collision path entirely. Natural home is TASK-024 alongside FIND-SPRINT-007-14, which is the other half of this detector's test-strength story.
- **resolved_by:** 

## FIND-SPRINT-007-17
- **source:** TASK-023 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:3193-3198
- **description:** The contract comment on `detectAuthorDarkScheme` contradicts the code and itself on where the CSS-property form belongs. It defines `'authored'` as "a real `@media (prefers-color-scheme: dark)` block, **or the CSS property form used outside a media query**" and then defines `'meta-only'` as "a bare color-scheme / supported-color-schemes signal" — but the shipped code routes the CSS property form (`<style>:root{color-scheme:light dark}</style>`, index.html:3211) to `'meta-only'`, and there is no CSS property named `prefers-color-scheme` for the phrase to refer to otherwise. This matters more than an ordinary comment nit because the two states have different downstream contracts: `'meta-only'` applies `remapInlineColors` as a finished behavior, while `'authored'` carries the TODO for unwrapping media-query blocks. A maintainer trusting this comment would expect `color-scheme: dark` in a `<style>` block to route through the unimplemented path.
- **suggested_action:** Rewrite the parenthetical so the states partition cleanly: `'authored'` = the string `prefers-color-scheme` appears anywhere (today only as an `@media` feature); `'meta-only'` = a `color-scheme` / `supported-color-schemes` signal in either meta-name or CSS-property form, with no dark rules behind it; `'none'` = neither. Pairs with FIND-SPRINT-007-14's suggested narrowing of the adjacent `BRANCH ORDER IS LOAD-BEARING` comment — both are in the same comment block.
- **resolved_by:** 

## FIND-SPRINT-007-18
- **source:** TASK-023 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:3226-3233 (meta-only branch), vs. index.html:3159-3166 (outlookDarkTransform)
- **description:** `appleMailDarkTransform`'s `'meta-only'` branch reuses `remapInlineColors` without the canvas rule that always accompanies it elsewhere. `outlookDarkTransform` pairs the same remap with `injectPreviewStyle(..., 'html { background-color: #1b1b1b !important; }')` precisely because, in that function's own words, "the injected canvas rule below darkens the area outside the body box, which the inline remap cannot reach." The Apple meta-only branch takes the remap half only, so the simulated fallback would darken the email's own boxes while leaving the area outside the body box at its default light color — not what Apple's partial-invert fallback does. Related: the foreground half of the reused remap lifts text for 4.5:1 against `OUTLOOK_DARK_SURFACE` (#1b1b1b), a surface this branch never paints, so the contrast math is measured against a backdrop that is not on screen in this simulation. Entirely latent — the branch is unreachable while `buildMjml()` emits no `color-scheme` meta (drift-guarded by Section 10 fixture 7), so there is no user-visible defect today. The reuse itself is the right call; only the missing companion is the gap.
- **suggested_action:** Either inject a canvas rule in the meta-only branch (matching the Outlook pairing, with its own `EB-DARKSIM applemail` marker comment), or add one sentence to the branch comment stating that the canvas rule is deliberately omitted and why. Whichever is chosen, note in the comment that the reused contrast target is Outlook's surface constant. Cheap to fold into TASK-024's comment pass; revisit properly if the drift guard ever fires.
- **resolved_by:** 

## FIND-SPRINT-007-19
- **source:** TASK-023 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:3428-3430 (dark-client picker buttons)
- **description:** The dark-client picker's disclosures live entirely in `title` attributes on buttons that already have visible text content. Because accessible-name computation prefers element content over `title`, the tooltip text is not announced by screen readers, and native tooltips are not reachable by keyboard-only users at all — `title` is a hover-only affordance. For Gmail and Outlook that is tolerable, since the transform itself is the visible answer. For Apple Mail the tooltip *is* the feature's explanation ("respects author dark-mode CSS; this email has none, so it renders unchanged"), and the TASK-023 plan locked the scope decision on "the button tooltip plus the darkened stage chrome carry the disclosure." Combined with FIND-SPRINT-007-15 (the stage chrome is occluded at the desktop viewport), both halves of the intended disclosure are unavailable to a keyboard or screen-reader user in the default view: the option appears to do nothing and says nothing about why. The pattern predates this task (all three titles come from TASK-021/022) but TASK-023 is where a tooltip became load-bearing.
- **suggested_action:** Consider treating this together with FIND-SPRINT-007-15 rather than separately — the muted caption the plan names as the cheapest escalation would fix the keyboard/SR gap and the occlusion gap at once, since visible text is announced and needs no hover. If the caption stays out of scope, the minimum is an `aria-describedby` pointing at a visually-hidden span carrying the same sentence, so the disclosure at least reaches assistive tech. Requires reopening the locked scope decision either way, so it is a human-review item rather than a straight TASK-024 fix.
- **resolved_by:** 

## FIND-SPRINT-007-20
- **source:** TASK-024 (verifier)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** CHANGELOG.md:13, index.html:247-250
- **description:** The new CHANGELOG entry's `.preview-stage.dark` bullet states the rule "darkens the chrome around the iframe (`#1a1a1a`) so the Apple Mail no-op still reads as a deliberate result rather than a broken toggle." The second half of that sentence does not hold in the default desktop viewport, which is the view the marketer sees first. Confirmed by reading the shipped CSS rather than re-measuring: `.preview-stage` (index.html:226-233) has no padding and its only child is `.preview-iframe` (index.html:234-240) at `width:100%; height:100%; border:none`, so the stage background is fully occluded and no `#1a1a1a` is ever painted; the chrome becomes visible only under `.preview-stage.mobile .preview-iframe` (index.html:241-246), which narrows the iframe to 375px and adds a 16px vertical margin. This is the same defect already logged at high severity as FIND-SPRINT-007-15 against the CSS; the new finding is that the claim has now been copied out of the code comment (index.html:247-249, which asserts the same intent) into the project's permanent change record, where a future maintainer will read it as shipped behavior. Not an executor error and not a blocker for TASK-024: the plan's step 3 explicitly directed documenting "the darkened `.preview-stage` chrome," the wording faithfully mirrors the existing code comment, and the actual fix lives in `index.html`, which is `files_readonly` for this task — so rewording only the CHANGELOG would leave the code comment making the identical unsupported claim. Secondary, much smaller note in the same area: README.md:94 says the simulation "runs entirely inside the preview iframe," which is exactly true in the desktop viewport but slightly overstated in the mobile viewport, where the stage surround does repaint.
- **suggested_action:** Fix in one coordinated change once `index.html` is writable, alongside FIND-SPRINT-007-15. If the occlusion is fixed (e.g. a `.preview-stage.dark` padding or a dark-mode iframe inset), both the CHANGELOG sentence and the code comment become true and need no edit. If the scope decision instead lands on leaving the desktop view unchanged, narrow both the code comment and the CHANGELOG bullet to state that the darkened chrome is visible in the mobile viewport only, so neither claims a desktop signal that is not there.
- **resolved_by:** 

## FIND-SPRINT-007-21
- **source:** TASK-024 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** README.md:143
- **description:** The README `## Scope` section's **In:** list enumerates the app's shipped capabilities — "live preview with desktop/mobile viewport toggle, raw HTML inspector modal, one-click copy with validation…, preview-only Handlebars test data…, humanized syntax-error banner, and `localStorage` persistence" — and was not extended with the dark-mode preview when TASK-024 documented the feature elsewhere in the same file. A reader scanning Scope to learn what the tool does now gets an incomplete answer, and the viewport toggle sitting in that list without its new sibling makes the omission look deliberate. Outside TASK-024's acceptance criteria, which only required the numbered-workflow step and the dedicated section, both of which are present and correct. The adjacent **Out:** line ("persistence of email content (only the test-data JSON and toggle state persist)") remains accurate, since dark-mode state is deliberately not persisted.
- **suggested_action:** Add "dark-mode preview simulation (Gmail / Outlook / Apple Mail)" to the **In:** list next to the viewport toggle. One-line edit to README.md, no other file affected.
- **resolved_by:** 

## FIND-SPRINT-007-22
- **source:** TASK-024 (code-reviewer)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** ARCHITECTURE.md:22-29 (Major Components / Layers), CODE-PATTERNS.md:13-64 (Shared Utilities)
- **description:** The `dark-mode-preview` epic closes without touching either of the two agent-orientation documents that CLAUDE.md points every future agent at. ARCHITECTURE.md's "Major Components / Layers" list enumerates the script block's logical sections — template configs, Quill editors, the MJML build pipeline, test data substitution, copy/output flow, UI controls — and the epic added a whole new one that is not there: the preview transform layer (`applyDarkMode` dispatching to `gmailDarkTransform` / `outlookDarkTransform` / `appleMailDarkTransform`, plus `detectAuthorDarkScheme` and the WCAG contrast primitives, index.html:2823-3274). The same list's "MJML build pipeline" bullet still describes `render()` as writing "the compiled HTML" into the iframe, which no longer captures the two-branch reality the epic depends on — `lastHtml` pure for export, a transformed string for `srcdoc`. Separately, CODE-PATTERNS.md's Shared Utilities section has no entry for `injectPreviewStyle` (index.html:~2790-2821), even though it is now a genuine shared utility with a non-obvious safety property: it neutralizes a literal `</style>` inside its `css` argument (fixed in commit d931119), and any future preview-only style injector must go through it rather than string-concatenating a `<style>` block. Neither file was in any epic task's `files_owned`, so no executor could have updated them; TASK-024 owned only README.md and CHANGELOG.md. Marketer-facing docs are complete and accurate — this is the maintainer-facing half of the epic's documentation.
- **suggested_action:** Add a "Dark-mode preview simulation" bullet to ARCHITECTURE.md's component list naming the four functions and the preview-only invariant, and amend the MJML build pipeline bullet to distinguish `lastHtml` (export source) from the `srcdoc` transform chain. Add a CODE-PATTERNS.md `injectPreviewStyle` entry documenting the `</style>` neutralization and the "all preview-only CSS goes through this" rule. Natural work for `/sf:compound` or a follow-up docs task; can be batched with FIND-SPRINT-007-2, which is the same class of drift in CODE-PATTERNS.md.
- **resolved_by:** 
