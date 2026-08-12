---
sprint: SPRINT-008
pending_count: 18
last_updated: "2026-08-12T23:55:00.000Z"
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
