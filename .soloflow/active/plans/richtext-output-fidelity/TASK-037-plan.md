---
id: TASK-037
idea: SPRINT-008-proposal
status: approved
created: 2026-08-19T15:00:00Z
files_owned:
  - index.html
  - README.md
  - CODE-PATTERNS.md
  - CHANGELOG.md
files_readonly:
  - .soloflow/active/findings/SPRINT-008-findings.md
acceptance_criteria:
  - criterion: "The phone anchor pass strips target and rel alongside the marker attribute"
    verification: "In richTextToMjText's `a[data-link-type=\"phone\"]` pass (grep `data-link-type=\"phone\"`), removeAttribute is called for 'target' and 'rel' as well as 'data-link-type'."
  - criterion: "A Quill-stamped manual phone link emits no target or rel"
    verification: "A new byte-parity fixture feeds richTextToMjText the exact anchor Quill 2 produces — `<p><a href=\"tel:5551234567\" target=\"_blank\" rel=\"noopener noreferrer\" data-link-type=\"phone\">call</a></p>` — and asserts the full emitted string. Capture the expected literal from the fixture row's own Actual field in the browser, not from this plan. Row reads PASS."
  - criterion: "grep proves no target survives on a phone anchor in compiled output"
    verification: "In the browser: insert a manual phone link into body copy via the link dialog, click Copy HTML, paste into a scratch file, and confirm zero matches for `target` on any `href=\"tel:` anchor. Before this task the same steps produce `<a href=\"tel:...\" rel=\"noopener noreferrer\" target=\"_blank\">`."
  - criterion: "Auto-linked phones and non-phone links are unaffected"
    verification: "RICHTEXT_PARITY_FIXTURES still pass byte-for-byte — specifically the 'plaintext phone auto-link' row (which asserts no target) and the 'bold + link' row (which asserts target=\"_blank\" on a URL link) are both unchanged and green."
  - criterion: "The stale three-anchor-passes comment is now true and cites its deciding constructs"
    verification: "The comment above the anchor passes (grep `Brand color + target=\"_blank\" only for non-phone links`) still claims phone links keep no target — which this task makes true — and names the two querySelectorAll selectors that decide it."
  - criterion: "Docs match the new anchor contract"
    verification: "README.md's 'Links in output are automatically styled … and set to target=\"_blank\"' bullet names the phone exception. CODE-PATTERNS.md's richTextToMjText entry states the phone-anchor attribute contract, citing the selector. CHANGELOG.md records the output change. Documentation anchor drift guard still passes."
  - criterion: "All harness sections pass"
    verification: "Ctrl+Shift+T over http:// — every row PASS."
depends_on: [TASK-036]
estimated_complexity: low
epic: richtext-output-fidelity
test_strategy:
  needed: true
  justification: "This changes compiled output for every existing email containing a manual phone link, so it needs a byte-parity fixture of its own, plus confirmation that the two neighbouring anchor passes did not shift."
  targets:
    - behavior: "A manual phone anchor carrying Quill's target/rel emits with neither attribute, styled phone-blue"
      test_file: "index.html"
      type: unit
    - behavior: "Auto-linked phone and non-phone URL anchors keep their existing byte-for-byte output"
      test_file: "index.html"
      type: unit
---

# Strip target/rel from manually-inserted phone links to match the documented design intent

## Objective

Quill 2's Link blot stamps `target="_blank" rel="noopener noreferrer"` onto every anchor it creates. The phone pass in `richTextToMjText` removes only `data-link-type`, so compiled output ships `<a href="tel:..." rel="noopener noreferrer" target="_blank" …>` for manually-inserted phone links — verified empirically on two trees. A `tel:` href with `target="_blank"` can open a blank tab instead of raising the dial intent in webmail clients, which is exactly the failure the adjacent code comment claims is avoided, and exactly what README's own output-notes section says the CTA button avoids by using `target="_self"`. This task makes the behavior match the comment, then corrects the comment's citation — the sub-edit that was rejected from the docs-only bucket precisely because the behavior did not yet justify it.

## Implementation Steps

1. **Add the two removals.** In the `div.querySelectorAll('a[data-link-type="phone"]')` pass inside `richTextToMjText` (grep `data-link-type="phone"`), add `a.removeAttribute('target');` and `a.removeAttribute('rel');` next to the existing `a.removeAttribute('data-link-type');`. Keep the `setAttribute('style', …)` call ordered as it is — attribute serialization order follows DOM insertion order, and moving the style assignment would change the emitted byte string for reasons unrelated to this fix.

2. **Extend the comment above the three anchor passes** (grep `Brand color + target="_blank" only for non-phone links`). It already asserts that both auto-linked and manually-inserted phone links "keep standard-blue and no target" — true for auto-linked phones today, false for manual ones until step 1 lands. Leave the claim, and add the citation the Behavioral-claims convention requires: name the `a:not([data-autolinked]):not([data-link-type="phone"])` selector as the pass that *adds* `target="_blank"`, and the `a[data-link-type="phone"]` pass as the one that removes Quill's. Add one clause recording *why* the removal is needed at all — Quill's Link blot stamps target/rel at creation time, so this pass is undoing the editor, not choosing a policy.

3. **Add the byte-parity fixture.** In `RICHTEXT_PARITY_FIXTURES`, add an entry whose `html` is the exact anchor Quill produces: `<p><a href="tel:5551234567" target="_blank" rel="noopener noreferrer" data-link-type="phone">call</a></p>`. My predicted output is `        <mj-text padding="0 0 14px 0">\n          <p style="margin:0;"><a href="tel:5551234567" style="color:#0000ee;text-decoration:underline;">call</a></p>\n        </mj-text>` — **do not paste that literal on faith.** Add the fixture with a deliberately wrong `expected`, open the harness, read the row's `Actual (JSON)` field, and use that string. Attribute order after three removals and one `setAttribute` is exactly the kind of detail worth reading rather than predicting.

4. **Confirm the neighbours did not move.** The two adjacent parity fixtures are the assertions that this change stayed inside its lane: the `plaintext phone auto-link` row pins that auto-linked phones carry no target (they never did — `autoLinkPhones` does not set one), and the `bold + link` row pins `target="_blank"` on a non-phone URL link. Both must remain green and unedited. Also confirm the two muted-phone rows in the CTA microcopy section still pass — their inputs carry no `target`, so the new removals are no-ops there.

5. **Verify in the browser and in copied output.** Insert a manual phone link through the link dialog, click Copy HTML, paste into a scratch file, and grep for `target` near `href="tel:`. Zero matches. This is the check that matters to the marketer; the fixture only proves the function.

6. **Correct the docs.** README.md's bullet "Links in output are automatically styled with the template's CTA brand color and set to `target=\"_blank\"`" is now incomplete — add the phone exception and cite the deciding pass. CODE-PATTERNS.md's `richTextToMjText` entry should state the anchor attribute contract explicitly (non-phone anchors gain brand color and `target="_blank"`; both phone classes get phone-blue and no `target`/`rel`), since "which attributes an anchor carries" is one of the three examples the Behavioral-claims convention names. Add a CHANGELOG.md entry that says plainly that this changes compiled output for existing emails containing manual phone links. Note that CHANGELOG's existing output-notes line already claims `target="_blank"` on web links "but not `tel:`" — that claim becomes true with this task and needs no edit.

## Acceptance Criteria

- **Removals present.** PASS = `target` and `rel` removed in the phone pass.
- **Parity fixture.** PASS = new fixture asserts the full emitted string for a Quill-stamped phone anchor and reads PASS, with the expected literal captured from the browser.
- **Copied output clean.** PASS = zero `target` attributes on `href="tel:` anchors in copied HTML after inserting a manual phone link. FAIL = any occurrence.
- **Neighbours unchanged.** PASS = auto-link and URL-link parity rows green and unedited; microcopy muted-phone rows green.
- **Comment true and cited.** PASS = the no-target claim holds and both selectors are named.
- **Docs true.** PASS = README bullet carries the exception; CODE-PATTERNS states the contract; CHANGELOG records the output change; anchor guard green.

## Test Strategy

One new fixture in `RICHTEXT_PARITY_FIXTURES` in `index.html`, plus two unchanged neighbours acting as the blast-radius check.

Target 1 must use the *Quill-stamped* input, not a hand-written `<a href="tel:…" data-link-type="phone">`. Every existing phone fixture in the file omits `target`/`rel`, which is precisely why none of them caught this bug for two sprints — a fixture whose input lacks the attribute under test cannot observe its removal. The new fixture's input is copied from what the editor actually produces.

Target 2 requires no new code: the `plaintext phone auto-link` and `bold + link` parity rows already pin the two behaviors that must not move, and byte-parity comparison means any drift shows as a diff rather than a soft pass. Leave both untouched — editing them to accommodate a change would defeat their purpose.

Step 5's copied-output grep is the acceptance check for the user-visible symptom and is deliberately outside the harness, since the harness only ever sees `richTextToMjText`'s return value, never the MJML-compiled anchor the marketer pastes.

## Hardest Decision

Whether to strip `rel` as well as `target`. `rel="noopener noreferrer"` is harmless on a `tel:` anchor — it has no target to open — so the minimal fix is `target` alone. I strip both because the attributes are one artifact of one editor decision, and leaving `rel` behind means the emitted anchor carries a security hint that describes a navigation that can no longer happen, which is exactly the sort of half-true output detail that later gets read as intentional. Stripping both also makes the emitted phone anchor byte-identical in shape to what a hand-authored template would contain, which keeps the parity fixture readable.

## Rejected Alternatives

- **Fix it at the blot level** — subclass the Link blot so it never stamps `target`/`rel` on `tel:` hrefs. Rejected: it would change what is stored in the editor's own DOM and therefore in any persisted draft, and `richTextToMjText` already owns emit-time anchor normalisation for three other attributes. Would change my mind if a second consumer of the editor HTML appeared that needed the clean anchor before emit.
- **Set `target="_self"` instead of removing target,** mirroring the CTA button's documented approach. Rejected: for the button, `_self` is a deliberate override of MJML's default; for an inline anchor the absence of `target` already means same-frame, so `_self` would be noise in every emitted phone link.
- **Leave `rel`.** Rejected above.

## Lowest Confidence Area

The exact expected literal for the new parity fixture, which is why step 3 instructs capturing it from the browser rather than trusting the prediction in this plan. Secondarily: whether any *existing* saved marketer email will visibly change. The removal only affects anchors carrying `data-link-type="phone"`, which only the link dialog produces, so the blast radius is manual phone links only — but this project has no draft persistence for body copy, so "existing emails" means whatever a marketer currently has open, not stored data. If draft persistence is added later, this becomes a migration question.
