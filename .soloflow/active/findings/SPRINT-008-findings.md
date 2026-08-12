---
sprint: SPRINT-008
pending_count: 29
last_updated: "2026-08-12T22:42:56.307Z"
---
# Findings Queue

## FIND-SPRINT-008-1
- **source:** TASK-025 (verifier)
- **type:** improvement
- **severity:** low
- **location:** index.html — every fixture loop in `renderTestHarness()` (grep `for (const fixture of`)
- **status:** open
- **description:** In every harness section, the call to the function under test sits OUTSIDE the per-fixture error handling: the loops read `const actual = fn(fixture.…); const pass = fixture.check(actual);`. Section 11 (TASK-025) wraps `check()` in a try/catch, and sections 1-10 have no try/catch at all — but in neither case is the `fn(...)` call itself guarded. If any function under test ever throws on a fixture input, the exception propagates out of `renderTestHarness()` and the ENTIRE harness silently renders blank or truncated, rather than showing one FAIL row. That is the same failure mode Section 7 ("script-not-truncated regression guard") exists to catch, so the repo already treats "the harness silently stops reporting" as a real risk. This is latent today, not a live bug: TASK-025's config-assertion fixture passes `html: null` into `richTextToMjText`, which only survives because of the `if (!html) return '';` guard at the top of the function (grep `function richTextToMjText`). Anyone who later tightens that guard — or adds a fixture that provokes a throw — blanks the repo's only test surface with no obvious signal.
- **suggested_action:** Move the function-under-test call inside the guarded block, e.g. `let actual, pass; try { actual = fn(...); pass = fixture.check(actual); } catch (e) { actual = 'THREW: ' + e.message; pass = false; }`, so a throwing fixture renders as a single FAIL row with the exception text instead of killing the whole report. Worth doing once across all sections rather than per-task.
- **resolved_by:** 

## FIND-SPRINT-008-2
- **source:** TASK-025 (code-reviewer)
- **type:** improvement
- **severity:** medium
- **location:** index.html — `PassthroughLink` (grep `static sanitize(url)`), consumed by the `link` entry in `allowedFormats`; reaches `PREVIEW_LINK_HANDLER` (grep `const PREVIEW_LINK_HANDLER`)
- **status:** open
- **description:** Pre-existing and outside the TASK-025 diff, noted while reviewing the paste whitelist. `PassthroughLink.sanitize(url) { return url; }` disables Quill's link sanitizer entirely so that `{{variable}}` and `tel:` survive — but it also removes the only scheme filter in the pipeline. Nothing downstream re-checks the scheme: `richTextToMjText` only sets `style`/`target` on anchors, MJML passes hrefs through verbatim, and the preview iframe is deliberately **not** sandboxed and same-origin with the app (ARCHITECTURE.md, grep `deliberately **not** sandboxed`). `PREVIEW_LINK_HANDLER` then calls `window.open(href, '_blank', 'noopener')` on any non-`#` href. So a `javascript:` (or `data:`) href pasted from an untrusted source — or typed into the link dialog — travels from paste to `window.open` with no filtering at any hop. Real-world impact is limited (modern Chrome blocks `javascript:` in `window.open`, and email clients strip such hrefs from the exported HTML), so this is hardening rather than a demonstrated exploit — but the absence of any scheme allowlist is not currently written down anywhere, and the widened `allowedFormats` comment now reads as if the whitelist is the sanitisation boundary.
- **suggested_action:** Replace the blanket passthrough with an allowlist in `PassthroughLink.sanitize`: permit `http:`, `https:`, `mailto:`, `tel:`, in-page `#…`, and strings beginning with `{{`/`{{{`; return `'#'` (or fall through to `QuillLink.sanitize`) for anything else. Verify against the existing link-dialog fixtures and the `{{{unsubscribe}}}` harness rows before changing behaviour.
- **resolved_by:** 

## FIND-SPRINT-008-3
- **source:** TASK-025 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **location:** index.html — harness Section 11 (grep `Section 11: rich-text italics`), the block comment and the `ITALIC_FIXTURES` config-assertion entry
- **status:** open
- **description:** Three small hygiene items in the new harness section, none of which affect what the fixtures actually assert. (1) The section's block comment says "Fixture 4 (byte-parity) ... its `expected` value was captured from the UNMODIFIED richTextToMjText" — there is no `expected` field on any Section 11 fixture; the captured literal lives inside `check: out => out === '…'`. The name is a leftover from the plan's step-1 scaffolding, and it sends a future maintainer grepping for a field that does not exist. (2) The config-assertion fixture carries `html: null` purely so the shared loop has an argument to pass, which calls `richTextToMjText(null, …)` for no reason and renders an empty "Actual output" row — this is the exact null-guard dependence FIND-SPRINT-008-1 cites as the latent hazard. Sections 8-10 already established a no-arg `check()` fixture shape for assertions with no input→output pair. (3) `JSON.stringify(richToolbar[0]).includes('italic')` hard-codes the toolbar group index, so moving `italic` into the second toolbar group would fail the row even though the config is still correct.
- **suggested_action:** Rewrite the comment to say the byte-parity literal lives in fixture 4's `check` comparison; move the config assertion to the Sections 8-10 no-arg `check()` shape (or split it into its own tiny loop) so nothing is passed to `richTextToMjText`; and drop the `[0]` so the assertion reads `JSON.stringify(richToolbar).includes('italic')`.
- **resolved_by:** 

## FIND-SPRINT-008-4
- **source:** TASK-025 (code-reviewer)
- **type:** improvement
- **severity:** low
- **location:** index.html — `renderTestHarness()` (grep `function renderTestHarness`), all eleven `--- Section N` blocks
- **status:** open
- **description:** `renderTestHarness()` now contains eleven near-identical copies of the same ~12-line block: create an `<h3>`, set the same `cssText` string, append it, then loop the fixtures building the same `harness-row` / `harness-row-label` / `harness-field` innerHTML. TASK-025's plan explicitly instructed copying the Section-2 loop verbatim, so the executor did the right thing for this task — but the eleventh copy is the point where the duplication starts to cost more than it documents. The `cssText` literal in particular is copy-pasted eleven times with one deliberate variation (`margin:0 0 4px` in Section 1 vs `margin:12px 0 4px` in 2-11), which is the kind of near-identical-but-not literal that drifts silently. Consolidating also gives FIND-SPRINT-008-1 (guarding the function-under-test call) a single place to land instead of eleven.
- **suggested_action:** Extract a `renderHarnessSection(body, title, fixtures, run)` helper where `run(fixture)` returns `{ actual, pass }` and the helper owns the `<h3>`, the row markup, and the try/catch; migrate the sections to it one at a time, confirming the row count and PASS state per section after each move. Best done as a standalone cleanup task, not folded into a feature diff.
- **resolved_by:** 

## FIND-SPRINT-008-5
- **type:** question
- **source:** TASK-026 (executor)
- **severity:** low
- **status:** open
- **location:** index.html — richTextToMjText anchor pass, grep "Auto-linked phones are intentionally left unstyled"
- **description:** TASK-026-plan.md Step 8 specifies inserting the comment "Auto-linked phones are intentionally left unstyled in body copy (they inherit the clients default link colour)" above the linkColor-gated pass. This is factually imprecise: autoLinkPhones() (grep function autoLinkPhones) already hard-codes style=color:#0000ee;text-decoration:underline; on every anchor it creates, so auto-linked phones are NOT unstyled today — they are blue-styled at creation time, and richTextToMjText simply does not RE-style them absent linkColor. I inserted the comment verbatim per the plan (documented convention, literal code block) since the discrepancy is narrative-only and does not affect any behavior or acceptance criterion (all of which are byte-comparison based and pass). Flagging so a future reader is not misled, and so TASK-027 (which consumes this file for the microcopy UI) does not inherit the same mischaracterization in its own comments/docs.
- **verifier_note:** Confirmed by the verifier. `autoLinkPhones` sets `style="color:#0000ee;text-decoration:underline;"` on every anchor it creates, and the TASK-026 parity fixture "Byte-parity: plaintext phone auto-link" pins that exact literal in its expected value. The same mischaracterisation appears in the plan's acceptance-criterion prose ("the generated `<a href="tel:...">` carries no style attribute"), not only in the code comment, so a doc fix should cover both. The criterion's substance (no new anchor pass runs without `linkColor`) is independently verified and holds.
- **resolved_by:** 

## FIND-SPRINT-008-6
- **source:** TASK-026 (verifier)
- **type:** claude-md
- **severity:** low
- **status:** open
- **location:** .soloflow/active/plans/cta-microcopy/TASK-026-plan.md — acceptance criterion 2 ("Both existing call sites still pass exactly two arguments")
- **description:** The criterion's verification command is `grep -n 'richTextToMjText(' index.html returns exactly 3 lines: the definition, the bodyAbove call, and the bodyBelow call.` That command was already unsatisfiable when the plan was approved: TASK-025 had added a harness fixture loop that calls `richTextToMjText`, and TASK-026's own Implementation Step 12 mandates two more. The grep now returns 7 lines (1 comment, 1 definition, 2 production call sites, 3 harness call sites), so a verifier following the command literally would report NOT_MET on a criterion whose substance is fully satisfied. This is a recurring shape, not a one-off: TASK-027's approved plan contains the same construct (`grep -n 'ctaMicrocopy' index.html shows no occurrence inside runCopyAction`). Because every test in this repo lives in the same file as the production code, any occurrence-count assertion over `index.html` is coupled to the harness and rots the moment a fixture exercises the symbol.
- **suggested_action:** Add a convention (CLAUDE.md or planner guidance) that acceptance-criteria greps over `index.html` must either assert the production call-site lines verbatim (e.g. `grep -n 'richTextToMjText(bodyAboveQuill.root.innerHTML, tpl)'`) or state the expected harness contribution explicitly, since the single-file layout guarantees fixtures add call sites.
- **resolved_by:** 

## FIND-SPRINT-008-7
- **source:** TASK-026 (verifier)
- **type:** improvement
- **severity:** low
- **status:** resolved
- **location:** index.html — harness Section 12 `RICHTEXT_OVERRIDE_FIXTURES` (grep `Style overrides: attribute emission + order`)
- **description:** Two Section 12 override fixtures assert less than they cheaply could. (1) The attribute-order fixture uses `out.includes('<mj-text padding="0 0 18px 0" font-size="13px" color="#6b6b6b">')` because the return value begins with eight spaces of indentation, which makes a literal `startsWith` on the tag alone impossible. The stricter `out.startsWith('        <mj-text padding="0 0 18px 0" font-size="13px" color="#6b6b6b">')` (indentation included) does pass against the current implementation — verified independently during TASK-026 verification — so the tag's position is assertable and simply is not asserted here; it is pinned only indirectly by the seven `===` parity fixtures. (2) The auto-linked-phone `linkColor` fixture checks only `out.includes('color:#6b6b6b')` and does not assert that the creation-time `#0000ee` is gone, unlike its manual-phone sibling which does. Both fixtures pass today; the weakness is latent, not live — but a regression emitting `color:#0000ee` alongside `color:#6b6b6b` on an auto-linked anchor would still show PASS.
- **suggested_action:** Change the attribute-order check to `startsWith` with the eight-space prefix included, and add `&& !out.includes('#0000ee')` to the auto-linked-phone fixture. Both are one-line edits with no behaviour change.
- **resolved_by:** verifier — status-sync: TASK-027. Both edits landed in commit 62591a4 (`test(TASK-026): strengthen two Section 12 override fixtures per FIND-SPRINT-008-7`) but the status was never flipped. Confirmed in the current tree: the attribute-order fixture now reads `out.startsWith('        <mj-text padding="0 0 18px 0" font-size="13px" color="#6b6b6b">')` with the eight-space prefix, and the auto-linked-phone fixture now reads `out.includes('color:#6b6b6b') && !out.includes('#0000ee')`. Both rows PASS in the Section 12 run (19/19).

## FIND-SPRINT-008-8
- **source:** TASK-026 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html — `richTextToMjText`, grep `Brand color + target="_blank" only for non-phone links`
- **description:** The block comment heading the three anchor passes was left as-is while the code beneath it gained `opts.linkColor`, so it is now conditionally false. It asserts that manually-inserted phone links "keep standard-blue and no target" — but the very next lines compute `const phoneLinkColor = linkColor || '#0000ee';`, so with `linkColor` supplied they keep the caller's colour, not standard blue. The "no target" half is still unconditionally true. This is distinct from FIND-SPRINT-008-5, which covers the newly-inserted comment about auto-linked phones being "unstyled"; together the two mean that the block a future reader (and TASK-027) will consult to understand link colouring carries two inaccurate sentences in a twenty-line span, while the code itself is correct.
- **suggested_action:** Rewrite the heading comment to state the default and the override in one breath, e.g. "Brand colour + `target="_blank"` for ordinary links; both phone classes stay standard-blue with no target. `opts.linkColor`, when supplied, overrides the colour for every anchor class." Fix alongside FIND-SPRINT-008-5 so the whole block is corrected in one pass. Comment-only; no behaviour change and no fixture impact.
- **resolved_by:** 

## FIND-SPRINT-008-9
- **source:** TASK-026 (code-reviewer)
- **type:** improvement
- **severity:** low
- **location:** index.html — `hasRichHtml` (grep `function hasRichHtml`) and `richTextToMjText`'s `const cleaned = ` line
- **status:** open
- **description:** TASK-026 extracted `hasRichHtml` as "the single pure emptiness predicate", and it does unify the *predicate* — `hasRichContent` now delegates and `richTextToMjText` early-returns through it. But the *cleaning rule* the predicate is built on is still written out twice: `html.replace(/<p><br><\/p>/g, '').trim()` appears verbatim inside `hasRichHtml` and again in `richTextToMjText`, which needs the cleaned string (not just the boolean) to seed its parse `div`. The regex-literal count in the file is therefore unchanged by the refactor — one copy simply moved from `hasRichContent` to `hasRichHtml`. The divergence risk is concrete: if Quill's empty shapes are ever extended (a `<p>​</p>` case, say) and only `hasRichHtml` is updated, `richTextToMjText` will pass the gate and then parse the un-stripped HTML, emitting a stray empty paragraph into the compiled email with no test failure — the parity fixtures pin today's inputs, not tomorrow's.
- **suggested_action:** Extract the cleaner rather than only the predicate: `function stripQuillEmptyParagraphs(html) { return (html || '').replace(/<p><br><\/p>/g, '').trim(); }`, then `hasRichHtml` becomes `const c = stripQuillEmptyParagraphs(html); return !!(c && c !== '<p></p>');` and `richTextToMjText`'s `cleaned` calls the same helper. Output is byte-identical; re-run the seven Section 12 parity fixtures to confirm.
- **resolved_by:** 

## FIND-SPRINT-008-10
- **source:** TASK-026 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **location:** index.html — harness Section 12, grep `const RICHTEXT_MICROCOPY_TPL`
- **status:** open
- **description:** `RICHTEXT_MICROCOPY_TPL` is declared as `{ ctaBackgroundColor: '#ED1C24' }` — byte-identical to `RICHTEXT_TPL` thirty lines above it — under a four-line comment explaining that the fixture tpl "omits" `ctaMicrocopyFontSize`/`ctaMicrocopyColor`. The reasoning is sound (`richTextToMjText` never reads those keys; the caller passes them as `opts`), and the deviation from the plan's Test Strategy, which specified a tpl carrying all three keys, is the better call. The residue is that a reader now meets two identically-valued constants and has to diff them character-by-character to learn they are the same, and the comment describes an omission relative to a plan they cannot see rather than relative to anything visible in the file.
- **suggested_action:** Delete `RICHTEXT_MICROCOPY_TPL`, point the override loop at `RICHTEXT_TPL`, and keep the explanatory comment (retargeted to say the shared tpl needs no microcopy keys because the function never reads them). Alternatively keep the separate name but give it a distinguishing value so the split earns itself.
- **resolved_by:** 

## FIND-SPRINT-008-11
- **source:** TASK-026 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html — `richTextToMjText`, the third anchor pass (grep `if (linkColor) {`)
- **description:** The three anchor passes use two different override mechanisms for the same concept. Passes one and two precompute a colour with the `linkColor || <default>` idiom and run unconditionally; pass three instead runs only `if (linkColor)`. The gate exists to preserve byte-parity — but it is probably unnecessary, because `autoLinkPhones` already sets exactly `style="color:#0000ee;text-decoration:underline;"` on every anchor it creates, which is the identical string an ungated third pass would write with `linkColor || '#0000ee'`. `setAttribute` updates an existing attribute in place without moving it, so serialisation would be unchanged. Unifying the three passes would delete a branch, collapse three colour concepts to two, and — the real prize — remove the reason the "auto-linked phones are intentionally left unstyled" comment (FIND-SPRINT-008-5) exists at all, since the pass would simply restate the blue that `autoLinkPhones` already applied. Not raised as a review blocker: TASK-026's approved acceptance criteria explicitly pin the opt-in/gated shape ("the new anchor pass is opt-in only"), so changing it is a follow-up decision, not a defect in this task's execution.
- **suggested_action:** Replace the `if (linkColor) { … }` block with an ungated `div.querySelectorAll('a[data-autolinked]').forEach(a => a.setAttribute('style', \`color:${phoneLinkColor};text-decoration:underline;\`));` reusing the existing `phoneLinkColor`. Gate the change on the seven Section 12 parity fixtures staying green — in particular "Byte-parity: plaintext phone auto-link", which pins the attribute order of the generated anchor. If any parity fixture reddens, abandon the simplification and keep the gate.
- **resolved_by:** 

## FIND-SPRINT-008-12
- **source:** TASK-027 (verifier)
- **type:** bug
- **severity:** medium
- **status:** open
- **location:** index.html — `richTextToMjText`'s anchor passes (grep `Brand color + target="_blank" only for non-phone links`) and `applyLink` (grep `function applyLink`)
- **description:** Manually-inserted phone links ship `target="_blank"` in the compiled email, contradicting the stated design intent in three places. The anchor-pass comment says phone links "keep standard-blue and no target"; FIND-SPRINT-008-8 asserts "The 'no target' half is still unconditionally true"; and TASK-027's acceptance criterion 3 verifies "the phone one renders muted in the preview with no `target` attribute in View HTML". All three are false. The cause is that Quill 2's default Link blot creates the anchor already carrying `target="_blank" rel="noopener noreferrer"`, and `richTextToMjText`'s selector `a:not([data-autolinked]):not([data-link-type="phone"])` only declines to *add* target — it never *removes* the one Quill put there. Verified empirically in the body-copy editor on both the pre-TASK-027 tree (bae4a25) and the current tree: identical editor HTML `<a href="tel:5559876543" rel="noopener noreferrer" target="_blank" data-link-type="phone">` and identical compiled output `<a href="tel:5559876543" rel="noopener noreferrer" target="_blank" style="color:#0000ee;text-decoration:underline;">`. Pre-existing and unchanged by TASK-027 — microcopy inherits exactly the body-copy behaviour, which is what its criterion actually requires — so it is not a blocker for this task. Auto-linked phones (`data-autolinked="phone"`) are unaffected: `autoLinkPhones` builds those anchors itself and they carry no target, as the Section 12 parity fixture pins. Real-world impact is that a `tel:` href with `target="_blank"` can open a blank tab instead of raising the dial intent in webmail clients, which is precisely the failure the code comment says it is avoiding.
- **suggested_action:** In `richTextToMjText`'s `a[data-link-type="phone"]` pass, add `a.removeAttribute('target'); a.removeAttribute('rel');` alongside the existing `removeAttribute('data-link-type')`. This changes compiled output for any existing email containing a manual phone link, so it needs its own byte-parity fixture rather than being folded into a feature diff. Fix the two code comments and correct FIND-SPRINT-008-8's "no target" claim in the same pass.
- **resolved_by:** 

## FIND-SPRINT-008-13
- **source:** TASK-027 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html — `buildMjml()` (grep `function buildMjml`), the CTA interpolation line (grep `` `        <mj-button href=` ``)
- **description:** `buildMjml()` establishes a consistent hoisted-block pattern: every conditional fragment is computed into a named const above the return and interpolated as a bare `${name}` — `previewTag`, `bannerHrefAttr`, `bannerBgAttr`, `bannerBlock`. The CTA block is the one exception; it inlines `ctaToggle.isOn() ? \`…\` : ''` with a nested template literal directly in the MJML body. TASK-027 added a second ternary *inside* that nested literal, so one physical line now closes an inner template literal, resolves two ternaries, and runs a third interpolation: `` ${microcopyBlock ? microcopyBlock + '\n' : ''}` : ''}${richTextToMjText(bodyBelowQuill.root.innerHTML, tpl)} ``. Nothing is wrong with the output — the shadow-verifier byte-verified both branches — but this line is where the feature's entire safety story lives (byte-parity when microcopy is empty), and it is now the least readable line in the function while the pattern for making it readable already exists ten lines above it.
- **suggested_action:** Hoist a `const ctaBlock = ctaToggle.isOn() ? \`        <mj-button …>\n          …\n        </mj-button>\n${microcopyBlock ? microcopyBlock + '\n' : ''}\` : '';` alongside `bannerBlock`, then interpolate `${ctaBlock}` in the body. Byte-identical by construction; gate the change on the Section 13 rows plus a View-HTML diff with microcopy empty and populated.
- **resolved_by:** 

## FIND-SPRINT-008-14
- **source:** TASK-027 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html — `buildMicrocopyBlock` / `ctaButtonPadding` (grep `function ctaButtonPadding`) and their three call sites in `buildMjml()`
- **description:** "Is there microcopy?" is derived three times from the same input on every render: once inside `buildMicrocopyBlock` (`if (!hasRichHtml(html)) return ''`), once inside `ctaButtonPadding` (`hasRichHtml(microcopyHtml) ? … : …`), and once again as the truthiness check `microcopyBlock ? microcopyBlock + '\n' : ''` in the template. The three agree today because `richTextToMjText` gates on the same predicate, so there is no live bug — but the button's padding and the emitted block are independently derived from raw HTML rather than from one another, and the whole point of the conditional padding is that the two must never disagree. If `buildMicrocopyBlock` ever gains a second reason to return `''` (a length floor, a brand opt-out key), the button silently tightens to 6px with no caption beneath it. Related: the `18px` in `buildMicrocopyBlock`'s `padding: '0 0 18px 0'` and the `18px` in `ctaButtonPadding`'s no-microcopy return encode a single layout decision ("the 18px bottom gap moves from the button to the caption") as two unrelated literals in two functions.
- **suggested_action:** Make the padding a function of the emitted block rather than the raw HTML — `ctaButtonPadding(microcopyBlock)` keyed on `!!block`, or drop the helper and read `microcopyBlock ? CTA_PADDING_WITH_MICROCOPY : CTA_PADDING_DEFAULT`. Requires rewriting the two Section 13 padding fixtures, which currently pin the html-taking signature (`ctaButtonPadding('<p>x</p>')`), so it is a follow-up rather than an in-place edit. Consider naming the shared `18px` once (`CTA_BLOCK_BOTTOM_GAP`) so both call sites read from it.
- **resolved_by:** 

## FIND-SPRINT-008-15
- **source:** TASK-027 (code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** resolved
- **location:** index.html — harness Section 13 (grep `Section 13: CTA microcopy`)
- **description:** Two of TASK-027's acceptance criteria have no harness coverage, and the patterns to cover them already exist in the same function. (1) Criterion 2 — "toolbar is bold + italics + link only, no list buttons" — is verified only by a devtools one-liner. Section 11 (grep `Toolbar/whitelist config includes italic`) established a no-input config-assertion fixture for exactly this class of check, and `microcopyToolbar` / `microcopyFormats` are module-scope consts the harness can read directly. Nothing reddens today if a future change points `ctaMicrocopyQuill` at the shared `richToolbar`/`allowedFormats`: the typed-bullet fixture keeps passing (`convertTypedBullets` is a separate switch), and the marketer silently gains list buttons whose output renders as a bulleted list inside a 13px muted caption. (2) The criterion's own DOM assertion, `document.querySelectorAll('.rich-editor-wrap.compact .ql-list').length === 0`, is a one-line predicate that would have slotted straight into the existing `MICROCOPY_DOM_GUARDS` array next to the two guards already there. (3) Minor: the styled-emission row checks three separate `includes` where FIND-SPRINT-008-7 had just established the stronger `startsWith('        <mj-text padding="…" font-size="…" color="…">')` form for the identical assertion one section above; the weaker form passes even if `buildMicrocopyBlock` starts forwarding extra opts.
- **suggested_action:** Add a config-assertion row (`!microcopyFormats.includes('list') && !JSON.stringify(microcopyToolbar).includes('list')`) using Section 11's no-input shape, add the `.ql-list` count as a third entry in `MICROCOPY_DOM_GUARDS`, and tighten the styled-emission row to `startsWith` with the eight-space indent included.
- **resolved_by:** test-writer — (1) added the config-assertion row to `MICROCOPY_BLOCK_FIXTURES` exactly as suggested. (2) added `.rich-editor-wrap.compact .ql-list` count === 0 as a third `MICROCOPY_DOM_GUARDS` entry, plus a fourth guard that invokes `ctaMicrocopyQuill.getModule('toolbar').handlers.link()` directly and asserts it routes through `openLinkModal(ctaMicrocopyQuill)` (`ownerEditor === ctaMicrocopyQuill` + modal visible), closing the separately-flagged gap that nothing asserted the "Toolbar override" forEach loop actually includes `ctaMicrocopyQuill` (criterion 3) — verified against a scratch copy that this guard goes red (throws, caught by the harness's own try/catch) when `ctaMicrocopyQuill` is dropped from that loop. (3) the `startsWith` tightening on the styled-emission row was left out of scope — not requested by the task that dispatched this fix; still open if wanted as a follow-up. Harness re-run: 0 FAIL, no page errors, 3 new PASS rows.

## FIND-SPRINT-008-16
- **source:** TASK-027 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html — grep `Toolbar override — must happen after both Quill instances are created`
- **description:** The comment heading the link-handler loop still says "both Quill instances". TASK-027 changed the line directly beneath it from `[bodyAboveQuill, bodyBelowQuill]` to `[bodyAboveQuill, bodyBelowQuill, ctaMicrocopyQuill]`, so the count is now three. Trivial, but it is the third comment in this file made stale by SPRINT-008 (see FIND-SPRINT-008-5 and -8), and the three sit within a few hundred lines of each other in the code a future contributor reads to understand editor wiring.
- **suggested_action:** Change "both Quill instances" to "all three Quill instances" (or "every Quill instance"). Fold into the comment-accuracy pass alongside FIND-SPRINT-008-5 and -8.
- **resolved_by:** 

## FIND-SPRINT-008-17
- **source:** TASK-027 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html — grep `id="bodyAbove"` and `id="bodyBelow"`; contrast with grep `ctaMicrocopyQuill.root.setAttribute('aria-labelledby'`
- **description:** Outside the TASK-027 diff, surfaced by comparison with it. TASK-027 gave the microcopy editor an accessible name by pairing a `<label id="ctaMicrocopyLabel">` with `ctaMicrocopyQuill.root.setAttribute('aria-labelledby', …)` — the correct treatment for a `contenteditable` that cannot take a `for`. The two body editors got no such treatment: `#bodyAbove` and `#bodyBelow` sit in bare `.rich-editor-wrap` divs whose only nearby text is a `.seg-title` span ("Body") with no programmatic association, so a screen reader announces them as unlabelled edit regions. The app is now internally inconsistent: the newest and least important of the three editors is the only one that is named.
- **suggested_action:** Give the two `.seg-head` titles ids (`bodyAboveLabel`, `bodyBelowLabel`) and mirror the `aria-labelledby` call for both body Quill roots immediately after their construction. Consider folding the three into one small `nameEditor(quill, labelId)` helper since the pattern would then have three call sites.
- **resolved_by:** 

## FIND-SPRINT-008-18
- **source:** TASK-027 (code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html — `humanizeTemplateError` (grep `function humanizeTemplateError`), every `return` in the function
- **description:** Pre-existing, but widened by TASK-027. Every branch of `humanizeTemplateError` hard-prefixes its message with the literal `'Body copy: '`, and the function is the sole error surface for Handlebars compile/render failures raised in `applyTestData()`, which compiles the WHOLE rendered document. Handlebars tokens are a first-class feature of several fields — the preheader (`<mj-preview>`), the link dialog's "URL variable" mode, and now microcopy, which routes marketer-typed text into the same compile pass. A malformed `{{#if}}` typed into the microcopy field therefore surfaces as "Body copy: unclosed {{#if}} block — add a matching {{/if}}.", sending the marketer to a field that contains no error. CLAUDE.md's binding convention requires these messages to be "plain-English action-oriented"; the humanisation itself is intact and the suggested fix is correct, but the field attribution is wrong, which is the half of the action the marketer acts on first. Microcopy makes this the third token-bearing surface, at which point the fixed prefix is misleading more often than it is right.
- **suggested_action:** Either drop the field name for a neutral prefix ("Template: …"), or thread the originating field through — e.g. have `applyTestData()` scan the offending source snippet against each editor's text and pass a field label into `humanizeTemplateError(message, field)`, defaulting to "Template" when it cannot attribute. Extend `HUMANIZE_FIXTURES` (grep `const HUMANIZE_FIXTURES`) with a microcopy-attributed case. Needs its own task — every existing fixture's `expected_pattern` is prefix-agnostic, so the fixtures will not catch a partial change.
- **resolved_by:** 

## FIND-SPRINT-008-19
- **source:** TASK-027 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html — `plainTextLength` (grep `function plainTextLength`), its caller `updateMicrocopyCount` (grep `function updateMicrocopyCount`), and the preheader counter (grep `els.preheaderCount.textContent`)
- **description:** Two small placement/naming residues. (1) `plainTextLength` is defined between `richTextToMjText` and `buildCtaHref`, i.e. inside the MJML-emission helper cluster, but it has nothing to do with emission — its only caller is the UI character counter roughly 2,200 lines further down, and no compile-path function references it. A reader auditing the emission pipeline meets a function that is not part of it. (2) The name is generic while the behaviour is Quill-specific: it strips trailing newlines (because `quill.getText()` always appends one) and counts interior newlines as one character each. Anyone reusing it for a plain `<input>` — for instance to unify it with the preheader counter, which is the app's other character counter and is implemented inline as `els.preheaderCount.textContent = els.preheader.value.length` with no named helper and no startup call — would silently get different semantics. The app now has two character counters built two different ways.
- **suggested_action:** Move `plainTextLength` next to `updateMicrocopyCount` (or into a small UI-helpers cluster) and rename it to something that carries the Quill contract, e.g. `quillTextLength` or `visibleTextLength`. If the preheader counter is ever revisited, unify both behind one `wireCharCount(el, countEl, read)` helper. Section 13's four `plainTextLength` fixtures move with the function; the label strings need updating if it is renamed.
- **resolved_by:** 

## FIND-SPRINT-008-20
- **source:** TASK-028 (executor)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** README.md — Workflow numbered list (grep "## Workflow")
- **description:** TASK-028-plan.md acceptance criterion 2 asserts the workflow list currently runs to 12 and will run to 13 after inserting the microcopy step. At execution time the README already had 13 numbered steps (TASK-024 landed a Dark mode toggle step after the plan was drafted), so inserting the microcopy step correctly renumbers the list to 1..14, not 1..13. Same drift pattern as FIND-SPRINT-008-6 (occurrence-count assertions over a file that keeps moving under intervening tasks), just in README.md instead of index.html. Implemented the substantive intent — one new step immediately after the CTA destination step, contiguous 1..14 numbering, no dupes/skips — rather than the literal count in the AC prose.
- **suggested_action:** No action needed on this task; noting for planners writing numbered-list ACs over docs that other in-flight tasks also touch. Consider the same guidance FIND-SPRINT-008-6 suggests: state the expected renumbering as a delta (insert-after-step-N) rather than an absolute final count.
- **resolved_by:** 

## FIND-SPRINT-008-21
- **source:** TASK-028 (verifier)
- **type:** bug
- **severity:** low
- **status:** open
- **location:** index.html — `BULLET_PREFIX` inside `richTextToMjText` (grep `const BULLET_PREFIX`), its preceding comment, and the Section 12 fixture description (grep `Fine print starting with`)
- **description:** `BULLET_PREFIX` contains `–` (EN DASH) but not `—` (EM DASH), so a body-copy paragraph beginning `— text` is never converted to a bullet while `– text` and `- text` both are. The comment directly above the regex says the trailing `\s+` "keeps prose that merely starts with a dash/em-dash (`— when, where...`) from being mistaken for a list" — but `\s+` does not achieve that (the example has a space after the dash and would match if U+2014 were in the class); the exclusion of U+2014 from the character class does. The same conflation appears in the Section 12 fixture description "Fine print starting with * or — is a sentence, not a list". Pre-existing from TASK-026, unchanged by TASK-028, and not a behaviour defect on its own — but it is the source of the em-dash claims TASK-028's docs inherited, and the en-dash/em-dash asymmetry is almost certainly unintentional.
- **suggested_action:** Decide whether U+2014 should join the class (making the two dashes behave alike) or stay out, then correct the comment and the fixture description to name the characters that actually convert (`*`, `-`, `–`, bullet glyphs). Whichever way it lands, the docs corrected under TASK-028 must match.
- **resolved_by:** 

## FIND-SPRINT-008-22
- **source:** TASK-028 (verifier)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** .soloflow/active/plans/cta-microcopy/TASK-028-plan.md — acceptance criterion 8 (CHANGELOG)
- **description:** Second instance of the drift pattern FIND-SPRINT-008-20 and FIND-SPRINT-008-6 already record, in the same plan. AC8 states the new entry must sit "above `## 2026-08-11 — Keller Postman lead outreach wordmark size`" and that this entry "is unmodified and now second". By execution time the topmost entry was `## 2026-08-11 — Dark mode preview simulation (Gmail / Outlook / Apple Mail)` (landed by TASK-024 after the plan was drafted). The substantive requirement — new dated entry at the very top, insertions only, no existing entry edited — is satisfied and independently verifiable via `git diff --numstat` (17 insertions, 0 deletions), so the literal miss is harmless here.
- **suggested_action:** Same guidance as FIND-SPRINT-008-6/20: express doc-ordering ACs as invariants ("the new entry is first; `git diff --numstat` shows 0 deletions") rather than quoting the current neighbouring content, which any concurrent task can invalidate.
- **resolved_by:** 

## FIND-SPRINT-008-23
- **source:** TASK-028 (verifier)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** .soloflow/active/plans/cta-microcopy/TASK-028-plan.md — implementation step 3 and acceptance criterion 3(d)
- **description:** The plan asserted a runtime behaviour it never checked against the implementing code: "a leading `*` or `—` stays literal here, unlike body copy where it becomes a bullet". The em dash in that sentence is U+2014, which is absent from `BULLET_PREFIX`, so the second half is false for that character. Because the claim was baked into both the implementation step and the acceptance criterion, the executor transcribed it verbatim and it shipped into README.md, CODE-PATTERNS.md, and CHANGELOG.md — three new false statements in a task whose entire purpose was correcting false statements. The AC's own verification recipe (a grep for the sentence) could not catch it: grepping for prose you dictated only proves the prose was copied. This is the failure mode to guard against in docs-accuracy tasks — prose ACs must be verifiable against the code, not against themselves.
- **suggested_action:** For plans that put behavioural claims into prose, cite the code construct that decides the behaviour (e.g. "the characters listed must be exactly those in `BULLET_PREFIX` — grep `const BULLET_PREFIX`") and make the AC's verification a comparison against that construct rather than a grep for the sentence. Worth a short line in CLAUDE.md's Conventions alongside the existing humanized-error rule: documentation claims about behaviour name the deciding code construct so a verifier can diff prose against source.
- **resolved_by:** 

## FIND-SPRINT-008-24
- **source:** TASK-028 (verifier)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** .soloflow/active/plans/TASK-032-plan.md — acceptance criteria 1, 2, 3 and (partly) 4
- **description:** TASK-028's commit 9e8fbe9 (the count-free README repair prompted by the code-reviewer) lands work that TASK-032's plan still assumes is outstanding. TASK-032 AC1 (workflow step 1 enumerates no brand names), AC2 (Templates section states no brand count or list and names the `templates` map) and AC3 (the `TEMPLATE CONFIGS` pointer uses the grep-anchor convention and appears on exactly one README line) are all satisfied on the current branch: step 1 reads "the dropdown lists every brand that ships…", README.md:126 reads "Brands are configured in the `templates` map in `index.html` — grep `const templates`. The map's keys are the authoritative brand list…", and `grep -c 'TEMPLATE CONFIGS' README.md` is 1 in anchor form. AC4 is partly advanced too — `name` now has a hit inside the Templates section, leaving `bannerHtml` and `bannerBackgroundColor` as the undocumented keys rather than three. TASK-032's pre-flight notes are correspondingly stale: "README.md:114 is the only match outside `.soloflow/`" for `Three brands` is now zero matches, and its per-file anchor counts / `ANCHOR_FLOORS` baseline must be recomputed at execution time because README gained two anchors. Both files are owned by both tasks, but they run serially, so this is a stale-plan hazard, not a conflict.
- **suggested_action:** When TASK-032 runs, re-derive AC1-AC4 state from the working tree first and record "already satisfied by TASK-028 (9e8fbe9)" rather than re-editing the same sentences; recompute the anchor floors from the live files instead of the plan's plan-time numbers. Same drift family as FIND-SPRINT-008-6, -20 and -22 — a fourth data point that plans quoting current file contents/line numbers go stale whenever another task touches the file first.
- **resolved_by:** 

## FIND-SPRINT-008-25
- **source:** SPRINT-008 (sprint-code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:2797-3161 — harness Sections 11/12/13, the eight new fixture loops
- **description:** Harness row-render loops measurably diverged inside a single sprint — the drift FIND-SPRINT-008-4 predicted has already happened. Extends FIND-SPRINT-008-4 with the cross-task evidence a per-task reviewer could not see; triage the two together, do not resolve independently.
- **suggested_action:** Land FIND-SPRINT-008-4's `renderHarnessSection(body, title, fixtures, run)` helper as a standalone cleanup task BEFORE Section 14 is written, and fold FIND-SPRINT-008-1's guarded function-under-test call into it so the try/catch exists once. Pick one label vocabulary and one escaping rule while migrating (suggest: always escapeHtml, always JSON-stringify inputs/outputs, always render an Expected row when the fixture has one). Confirm section-by-section that row counts and PASS states are unchanged. Separately, record an explicit decision on whether ~1,030 lines of fixtures should keep shipping inside the production single-file app, or move behind a `?harness=1` fetch of a sibling file — the answer changes how much the duplication is worth paying down.







Aggregate shape: 372 of index.html's 519 new lines (72%) landed inside renderTestHarness(), which is now lines 2133-3162 — 1,030 lines, 24% of a 4,342-line single-file app that ships whole to every marketer over HTTP with no build step to strip it. Three tasks added eight more copies of the same ~12-line row-render block, and the copies are no longer near-identical: (a) the Section 12 parity loop and the hasRichHtml loop have no try/catch at all while the Section 11, Section 12-override, Section 13 and DOM-guard loops each carry their own inline `(() => { try { … } catch { return false; } })()`; (b) the input label is 'Input HTML' in three loops, 'Input HTML (JSON)' in two, 'Input text (JSON)' in one; (c) the result label is 'Actual output' in three loops, 'Actual (JSON)' in one, 'Actual' in two; (d) three loops escapeHtml() the actual value while two pass it through String(); (e) two loops emit an 'Expected' row and four do not; (f) Section 11 renders its null-input config row as `fixture.html || '(none — config assertion)'` while Section 13, which copied that fixture shape one task later, renders `escapeHtml(fixture.html)` and shows a blank box. None of this changes a PASS/FAIL result today — the cost is that the harness is now the largest and least uniform region of the file, and the next section will copy whichever variant its author happens to scroll past.

Suspected tasks: TASK-025, TASK-026, TASK-027

## FIND-SPRINT-008-26
- **source:** SPRINT-008 (sprint-code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:3136-3146 — MICROCOPY_DOM_GUARDS, 4th entry ('Toolbar-handler loop wires the link button to ctaMicrocopyQuill…')
- **description:** Opening the test harness now steals keyboard focus into the CTA microcopy editor and leaves it there, behind the overlay. The FIND-SPRINT-008-15 guard proves the wiring by invoking the real production handler: `handler()` → `openLinkModal(ctaMicrocopyQuill)` → `quill.getSelection(true)`, whose `true` argument focuses the editor; the guard then calls `closeLinkModal()`, which ends with `if (ownerEditor) ownerEditor.focus();` — focusing ctaMicrocopyQuill a second time and scrolling it into view. `#testHarness` is a `.modal-overlay` (position:fixed; inset:0; z-index:100) with no focus trap, so after Ctrl+Shift+T the marketer's own microcopy field holds focus underneath it: every subsequent keystroke that is not Escape is typed into the compiled email, fires text-change and schedules a render, and is invisible behind the overlay. This runs on every harness open, since renderTestHarness() rebuilds all rows each time.
- **suggested_action:** Wrap the invocation in a save/restore, following Section 3's precedent: capture `document.activeElement`, `linkDestination.value` and the active link-type button before `handler()`, restore all three after `closeLinkModal()`, and finish with `document.getElementById('testHarnessClose').focus()` so focus stays inside the overlay. If a pending timer is unacceptable, assert the wiring without side effects instead — e.g. temporarily swap `openLinkModal` for a recording stub, or assert `handlers.link.toString()` mentions `openLinkModal`. Re-run the harness and confirm the guard still goes red when ctaMicrocopyQuill is removed from the toolbar-override loop at index.html:1332, which is the property it exists to protect.






The guard also mutates and does not restore three pieces of production UI state — `linkDestination.value` (set to ''), the `linkTypeButtons` active/aria-pressed pair (forced to 'phone'), and a `setTimeout(() => linkDestination.focus(), 50)` that fires 50ms after the modal was hidden. The pending focus() is inert today only because `.modal-overlay` is `display:none` when not `.visible` (index.html:458-468); if that rule ever becomes opacity/visibility-based, focus lands in an invisible text input. Contrast Section 3 (TASK-016), the harness's only other side-effecting row, which explicitly snapshots and restores the localStorage key it touches. Invisible to the per-task reviewers: the guard landed in d645cb0 as a post-review fix for FIND-SPRINT-008-15, after TASK-027's code review had already run.

Suspected tasks: TASK-027

## FIND-SPRINT-008-27
- **source:** SPRINT-008 (sprint-code-reviewer)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** CODE-PATTERNS.md:24 ('strips unsafe tags') vs index.html:1509-1670 — `richTextToMjText`
- **description:** The sprint's own docs task re-affirmed a sanitisation claim the function has never satisfied, on the same line it rewrote. CODE-PATTERNS.md:24 reads 'Converting a Quill editor's inner HTML into a safe `<mj-text>` content block — strips unsafe tags, preserves bold/italics/links/lists, applies the brand's link color.' `richTextToMjText` strips exactly two things: `<p><br></p>` (via `hasRichHtml`'s cleaner) and `.ql-ui` nodes. Everything after that only ADDS attributes — list restructuring, typed-bullet conversion, autoLinkPhones, and setAttribute passes on a/em/i/p/ul/ol/li — and the return value is `div.innerHTML` verbatim. There is no tag allowlist, no attribute scrub, and no `on*` handler filter anywhere in the function or between it and `lastHtml`.
- **suggested_action:** Correct CODE-PATTERNS.md:24 to state where sanitisation actually happens — e.g. 'Assumes its input is already sanitised: the only sanitisation boundary is the Quill `formats` whitelist on the owning editor (`allowedFormats` / `microcopyFormats`). This function normalises styling for email clients; it does not strip tags or attributes. Do not pass HTML from any source that has not been through a Quill instance.' Mirror that sentence as a comment above `function richTextToMjText`. If a non-Quill caller is ever wanted, add an explicit tag/attribute allowlist pass at the top of the function and pin it with a harness fixture feeding `<script>` and `<img onerror>` — do not rely on the current doc wording.





The real sanitisation boundary is Quill's per-instance `formats` whitelist (`allowedFormats` at index.html:1203, `microcopyFormats` at 1222), one hop upstream and in a different construct. That misattribution matters more after this sprint than before it: TASK-025 widened the whitelist, TASK-026 turned the function into a documented three-argument `(html, tpl, opts)` API with a 'Signature' bullet inviting reuse, TASK-027 added the third caller, and TASK-028 edited this exact sentence (commit 20a73ff, 'preserves bold and links' → 'preserves bold/italics/links/lists') while leaving 'strips unsafe tags' intact. The harness already calls it with hand-written HTML that never passed through Quill — the exact pattern a fourth caller (imported template, restored draft, pasted MJML) would follow while trusting the doc. `div.innerHTML = cleaned` fires `onerror`/`onload` on any injected element in the app's own origin at parse time, and the surviving tags land in `lastHtml`, the copied HTML, and a preview iframe ARCHITECTURE.md describes as deliberately not sandboxed and same-origin. No live vulnerability today — every current caller's input is Quill-whitelisted or developer-authored — so this is a contract/hardening fix, distinct from FIND-SPRINT-008-2, which covers link SCHEMES only.

Suspected tasks: TASK-025, TASK-026, TASK-028

## FIND-SPRINT-008-28
- **source:** SPRINT-008 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:3048-3053 and 3066 — Section 13's config-assertion fixture and its render line
- **description:** The `html: null` config-assertion shape that FIND-SPRINT-008-3 asked TASK-025 to abandon was copied into Section 13 one task later, while that finding was still open. The new row (index.html:3049, added by d645cb0 as the FIND-SPRINT-008-15 fix) sets `html: null` purely so the shared loop has an argument, which calls `buildMicrocopyBlock(null, MICROCOPY_TPL)` for no reason — surviving only because `hasRichHtml` opens with `if (!html) return false;`. That is the same null-guard dependence FIND-SPRINT-008-1 flags for `richTextToMjText`, now in a second function, and it is the second live instance of the shape FIND-SPRINT-008-3 wanted retired. The copy is also incomplete: Section 11 renders the null row as `escapeHtml(fixture.html || '(none — config assertion)')` while Section 13's line 3066 is a bare `escapeHtml(fixture.html)`, so the row shows an empty 'Input HTML' box with no explanation of why.
- **suggested_action:** Fix both instances together when FIND-SPRINT-008-3 is triaged: move the two config assertions to the no-arg `check()` shape Sections 8-10 already use (or a tiny dedicated loop) so nothing is passed to `richTextToMjText`/`buildMicrocopyBlock`, which also removes the need for the `|| '(none…)'` fallback in the render line. If the shared-loop shape is kept instead, at least mirror Section 11's fallback string into Section 13 so the row is self-explanatory.




Suspected tasks: TASK-025, TASK-027

## FIND-SPRINT-008-29
- **source:** SPRINT-008 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:1221, 1563, 1569, 2931, 3046 — every in-code statement of the em-dash typed-bullet claim
- **description:** The em-dash claim was corrected in the three docs files but survives at five sites in index.html, so docs and code now contradict each other. TASK-028's fb200b1 rewrote README.md:56, CODE-PATTERNS.md's buildMicrocopyBlock gotcha and the CHANGELOG entry to say a leading asterisk or hyphen stays literal — the accurate wording, since U+2014 is absent from `BULLET_PREFIX`. The code still names an em dash in five places: index.html:1221 (microcopyToolbar comment, added by TASK-027), 1563 (the convertTypedBullets gate comment, TASK-026), 1569 (the BULLET_PREFIX comment, pre-existing), 2931 (Section 12 fixture description, TASK-026) and 3046 (Section 13 fixture description, TASK-027).
- **suggested_action:** Resolve FIND-SPRINT-008-21 first (decide whether U+2014 joins `BULLET_PREFIX`), then sweep all five index.html sites in the same commit so they name exactly the characters in the class and match the already-corrected README/CODE-PATTERNS/CHANGELOG wording. Ripgrep for the literal em dash U+2014 inside index.html comments and fixture descriptions to confirm the sweep is complete — the five line numbers above are the full set as of commit c8e0b9b.



Completes FIND-SPRINT-008-21's site list rather than restating it: that finding names only two of the five (1569 and 2931), because the other three were written by later tasks while it sat open. Triage them as one edit. The cross-task datum for the compounder is that an in-flight finding did not stop two subsequent tasks from copying the same false sentence into three new locations — in-sprint findings are invisible to later executors.

Suspected tasks: TASK-026, TASK-027, TASK-028

## FIND-SPRINT-008-30
- **source:** SPRINT-008 (sprint-code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:998-999 (repeated in all eight brand entries through :1138), `buildMicrocopyBlock` :1679-1681, and Section 13's `MICROCOPY_TPL` :2998
- **description:** Brand defaults for microcopy are implemented twice, and the second mechanism has no test coverage. TASK-026 added `ctaMicrocopyFontSize: DEFAULT_CTA_MICROCOPY_FONT_SIZE` / `ctaMicrocopyColor: DEFAULT_CTA_MICROCOPY_COLOR` to all eight brand entries (16 identical lines), matching the file's existing convention — `unsubscribeHtml: DEFAULT_UNSUBSCRIBE` is spelled out the same way in all eight, and `buildMjml` consumes `${tpl.unsubscribeHtml}` with no fallback. It then ALSO added `|| DEFAULT_…` fallbacks inside `buildMicrocopyBlock`. Either mechanism alone is sufficient: delete the 16 config lines and output is unchanged; delete the fallbacks and output is unchanged. So the codebase now has two competing patterns for the same concept, and microcopy is the only key that uses both.
- **suggested_action:** Pick one mechanism. Preferred: keep the `|| DEFAULT_…` fallbacks in `buildMicrocopyBlock`, delete the two keys from all eight brand entries, and update README.md's Templates list to say the keys are optional per-brand overrides rather than fields every brand ships. Then add one Section 13 fixture with a tpl that omits both keys, asserting the emitted block still carries `font-size="13px"` and `color="#6b6b6b"`, so the fallback path is pinned. If instead the spell-it-in-every-entry convention wins, drop the fallbacks so a missing key fails loudly, and note the convention in CODE-PATTERNS.md so the next brand-scoped key does not fork the pattern a third time.


The testing consequence is concrete: Section 13's `MICROCOPY_TPL` always supplies both keys, so the `||` branch is never exercised by any fixture. A typo in either key name, or deletion of either DEFAULT_ const, leaves every harness row green while silently changing what a brand emits. README.md:134-137 already documents these as 'per-brand override slots' that no brand currently overrides, which is the argument for keeping the fallback and dropping the sixteen no-op lines.

Suspected tasks: TASK-026

## FIND-SPRINT-008-31
- **source:** SPRINT-008 (integration-tester, end-of-sprint)
- **type:** bug
- **severity:** medium
- **status:** open
- **location:** index.html — grep `function hasRichHtml` (fix site); reproduces in all three Quill editors
- **description:** Armed-but-unused format leaks Quill internals into shipped HTML. Click into an empty editor, click Bold/Italic, type nothing: Quill leaves <p><em><span class="ql-cursor">U+FEFF</span></em></p> in root.innerHTML. hasRichHtml only strips <p><br></p> and <p></p>, so the editor reports content and the ql-cursor span plus a zero-width no-break space reach lastHtml — the string Copy HTML hands to SendGrid. Persists after blur; does not self-heal. Proven pre-existing at base c3159f1 (byte-identical artifact in #bodyBelow). New symptom surface via TASK-027: in #ctaMicrocopy the same state flips the CTA button padding to 14px 0 6px 0 and emits a spurious muted mj-text block while #ctaMicrocopyCount reads 0 — UI says empty, output disagrees. Repro artifacts: scratchpad it8/ws8_emptyitalic.js and ws9_classify.js.
- **suggested_action:** Strip <span class="ql-cursor"> nodes and U+FEFF before the emptiness test inside hasRichHtml (single fix covers all three editors and both the emission gate and ctaButtonPadding, since both consume hasRichHtml). Pin with harness fixtures: hasRichHtml armed-cursor shape === false, and buildMicrocopyBlock on the same shape === empty string.
