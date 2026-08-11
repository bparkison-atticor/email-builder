---
sprint: SPRINT-007
pending_count: 7
last_updated: "2026-08-11T22:02:28.063Z"
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
