---
id: TASK-038
idea: SPRINT-008-proposal
status: approved
created: 2026-08-19T15:00:00Z
files_owned:
  - index.html
files_readonly:
  - README.md
  - CODE-PATTERNS.md
  - CHANGELOG.md
  - .soloflow/active/findings/SPRINT-008-findings.md
acceptance_criteria:
  - criterion: "BULLET_PREFIX is unchanged and still greppable"
    verification: "grep `const BULLET_PREFIX` in index.html resolves and the character class is byte-identical to before this task: it contains U+2013 (en dash) and does not contain U+2014 (em dash). The Documentation anchor drift guard depends on this anchor (CODE-PATTERNS.md cites grep `const BULLET_PREFIX`) and must stay green."
  - criterion: "No in-code comment or fixture description claims an em dash becomes a bullet"
    verification: "Run `grep -n '—' index.html` and inspect every hit. Each remaining occurrence is either ordinary sentence punctuation or an explicit statement that U+2014 does NOT convert. The four bullet-claim sites are the ones at grep `stays a sentence`, grep `is a sentence, not a list.`, grep `starts with a dash/em-dash`, and the fixture description at grep `Fine print starting with`."
  - criterion: "The BULLET_PREFIX comment's reasoning is corrected, not just its character list"
    verification: "The comment no longer attributes the em-dash exclusion to the trailing `\\s+`. It states that the deciding construct is the character class — `\\s+` is required for a match, so it cannot exclude anything; U+2014 simply is not a class member, while U+2013 is."
  - criterion: "The asymmetry is pinned by fixtures instead of being accidental"
    verification: "Two new RICHTEXT_PARITY_FIXTURES rows: `<p>– Restrictions apply.</p>` (en dash) converts to a <ul><li>, and `<p>— when, where, and how</p>` (em dash) stays a <p>. Both PASS. Expected literals captured from the browser, not from this plan."
  - criterion: "In-code wording matches the already-corrected docs"
    verification: "The surviving comments enumerate exactly the characters BULLET_PREFIX contains and agree with README.md's `*`/`-` bullet note, CODE-PATTERNS.md's convertTypedBullets description (which already names `*`/`-`/`–`), and CHANGELOG.md. No edit to those three files is needed or made."
  - criterion: "Only index.html changed"
    verification: "`git diff --name-only` lists index.html and nothing else."
  - criterion: "All harness sections pass"
    verification: "Ctrl+Shift+T over http:// — every row PASS, with the existing typed-bullet fixtures (the asterisk-bullet parity row and the microcopy fine-print row) unchanged and green."
depends_on: [TASK-037]
estimated_complexity: low
epic: richtext-output-fidelity
test_strategy:
  needed: true
  justification: "The decision is to keep current behavior, which means the deliverable is documentation accuracy plus fixtures that make the en/em asymmetry deliberate. Without the fixtures the next reader has no way to tell the asymmetry from an oversight — which is how this finding arose in the first place."
  targets:
    - behavior: "A leading en dash converts to a bullet; a leading em dash does not"
      test_file: "index.html"
      type: unit
---

# Resolve the en-dash/em-dash bullet-conversion asymmetry (decision: keep U+2014 excluded, pin it, correct the comments)

## Objective

`BULLET_PREFIX` contains U+2013 (en dash) but not U+2014 (em dash), so `– text` converts to a bullet while `— text` never does. The docs were corrected last sprint to say only `*` and `-` convert, but four in-code comments and fixture descriptions still claim an em dash converts, so code and shipped docs actively contradict each other. This task makes the decision explicit — U+2014 stays out — sweeps the false in-code claims, corrects the BULLET_PREFIX comment's incorrect reasoning about why, and adds two fixtures so the asymmetry is a pinned choice rather than an accident waiting to be "fixed" by a future reader.

## The decision, and why

**U+2014 does not join `BULLET_PREFIX`.** An em dash followed by whitespace is a legitimate prose opener — an aside, a dialogue dash, an attribution line ("— when, where, and how") — and the class requires exactly that trailing whitespace to match. Adding U+2014 would silently convert such sentences into one-item bulleted lists in every existing email whose body copy opens a paragraph that way, with no migration and no marketer-visible warning beyond the preview. The en dash's presence is comparatively defensible: Word's autoformat emits it as a list marker, which is the paste path this class exists to catch. Three shipped docs were just corrected to enumerate `*`/`-` (README) and `*`/`-`/`–` (CODE-PATTERNS); adding U+2014 would mean re-editing all of them a second time in three sprints. The asymmetry is mildly surprising but harmless — a marketer who wanted a bullet has a toolbar button — whereas the false-positive is silent and changes output.

## Implementation Steps

1. **Run the sweep grep first and record it.** `grep -n '—' index.html`. This is the completeness gate for the whole task; re-run it as the last step before reporting COMPLETED. The literal U+2014 appears in comments, fixture descriptions, and ordinary prose punctuation, so every hit must be classified, not blanket-edited. As of this plan's writing the classification is: four bullet-claim sites (fixed in steps 2-5), one fixture description where the em dashes are punctuation inside an unrelated sentence about `microcopyToolbar`/`microcopyFormats` (grep `microcopyToolbar/microcopyFormats are ctaMicrocopyQuill's own consts` — leave it alone), one brand template body containing `&mdash;` HTML entities in marketing copy (leave it alone), and assorted punctuation dashes in unrelated comments. Verify this classification against the live grep output rather than assuming it still holds — `index.html` has been moving.

2. **Fix the microcopy toolbar comment** (grep `stays a sentence`). It reads "the compiled output suppresses the typed-bullet converter so fine-print starting with '*' or '—' stays a sentence." Replace the character list with the characters that actually convert, and cite the deciding construct: the point of `convertTypedBullets: false` is that *no* leading glyph in `BULLET_PREFIX` converts here, so name the constant rather than re-listing a subset.

3. **Fix the convertTypedBullets gate comment** (grep `is a sentence, not a list.`). Same treatment: name `BULLET_PREFIX` as the deciding construct instead of naming two characters, one of which is wrong.

4. **Fix the BULLET_PREFIX comment's reasoning** (grep `starts with a dash/em-dash`). This is the substantive correction, not just a character swap. The comment currently says "Trailing `\s+` keeps prose that merely starts with a dash/em-dash ('— when, where...') from being mistaken for a list." That is backwards: `\s+` is a *required* part of the match, so it cannot exclude anything — `— when` has the trailing space and would match if U+2014 were in the class. Rewrite to say: the character class is what decides membership; U+2013 is a member (Word emits it as a list marker on paste) and U+2014 deliberately is not, because an em dash plus space is common prose. State that the trailing `\s+` exists to require a separator so `*bold*` or `-5 degrees` is not treated as a marker — its real job.

5. **Fix the fixture description** (grep `Fine print starting with`). It reads "Fine print starting with * or — is a sentence, not a list". Replace with characters that are actually in the class, e.g. `*` or `-`, keeping the description's point (that `convertTypedBullets: false` suppresses conversion) intact.

6. **Add the two pinning fixtures** to `RICHTEXT_PARITY_FIXTURES`: an en-dash paragraph `<p>– Restrictions apply.</p>` that must convert to `<ul><li>`, and an em-dash paragraph `<p>— when, where, and how</p>` that must stay a `<p>`. Byte-parity comparison, expected literals captured from each row's own `Actual (JSON)` field in the browser. Give each a `label` that names the asymmetry as intentional, so a future reader who "fixes" the class sees a red row explaining the choice rather than an unexplained failure. Reference this task in the labels the way existing fixtures reference theirs.

7. **Re-run the step-1 grep** and confirm every remaining U+2014 in `index.html` is punctuation or an explicit non-conversion statement. Then confirm `git diff --name-only` lists only `index.html`.

## Acceptance Criteria

- **Class untouched.** PASS = `BULLET_PREFIX` byte-identical, still containing U+2013 and not U+2014; anchor guard green. FAIL = any change to the class, including a reordering.
- **No false claims.** PASS = every U+2014 hit in `index.html` is punctuation or an explicit non-conversion statement.
- **Reasoning corrected.** PASS = the comment attributes the exclusion to class membership, not to `\s+`, and explains what `\s+` actually does.
- **Asymmetry pinned.** PASS = both new fixtures green, en dash converting and em dash not.
- **Docs consistent, unedited.** PASS = surviving comments agree with README/CODE-PATTERNS/CHANGELOG; `git diff --name-only` shows only `index.html`.
- **Harness green.** PASS = all rows PASS, existing typed-bullet fixtures unchanged.

## Test Strategy

Two new `RICHTEXT_PARITY_FIXTURES` rows in `index.html` — one per side of the asymmetry. Byte-parity rather than `includes`, because the interesting failure is "the paragraph became a list" and that is a whole-output shape change.

These fixtures are the actual deliverable of a task that changes no behavior. The finding exists because the asymmetry was invisible: nothing in the file said which dashes convert, so three separate authors wrote three different guesses into comments. A corrected comment can drift again; a red fixture cannot be ignored. The en-dash row also protects a behavior nothing currently pins — if someone removed U+2013 from the class as "cleanup", no existing fixture would notice.

The existing asterisk-bullet parity row and the microcopy fine-print row must stay unedited and green: together they cover the two `convertTypedBullets` settings, and this task must not perturb either.

## Hardest Decision

Whether to exclude U+2014 or add it. Both are one-character changes with opposite failure modes: exclusion leaves a surprising asymmetry a marketer may trip over once; inclusion silently converts prose to lists in emails that already exist. I weighted asymmetry-as-confusion below silent-output-change, and gave weight to the fact that three docs were corrected two sprints ago to the exclusion story — flipping the behavior now would invalidate freshly-corrected documentation and the CHANGELOG entry describing it. The tie-breaker is that exclusion is the status quo, and a status-quo choice that gets pinned by a fixture and an accurate comment is strictly better than today's unpinned accident, whereas inclusion is a behavior change that would want its own migration note.

This is the one item in this batch where a reasonable reviewer could pick the other branch. If the user wants em dash to convert, the change is adding `\u2014` to the class plus updating README/CODE-PATTERNS/CHANGELOG and inverting the second new fixture — roughly an hour, and the fixtures added here make the flip safe.

## Rejected Alternatives

- **Add U+2014 to `BULLET_PREFIX`.** Rejected above. Would change my mind if the user reports marketers actually typing `— item` expecting bullets, or if paste-from-Word turns out to emit U+2014 as a list marker (it emits U+F0B7 and U+2013 in the cases this class was built for).
- **Remove U+2013 too, so neither dash converts,** matching README's `*`/`-` wording literally. Rejected: that *is* a behavior change, it breaks the Word-paste case the class was extended for, and CODE-PATTERNS already documents `–` as converting.
- **Comment sweep with no fixtures.** Rejected: this finding is the second occurrence of the same class — a prose-only claim drifting from the regex. CODE-PATTERNS' own Behavioral-claims rule exists because of it.
- **Delete the dash characters and document only glyph bullets.** Rejected as a larger behavior change with no requester.

## Lowest Confidence Area

Step 1's classification of U+2014 hits. `index.html` shifted ~21 lines during the probe run for this plan, and the em dash is used liberally as ordinary punctuation throughout the file's comments, so the live grep output — not the four sites named here — is authoritative. An executor who blanket-replaces em dashes will damage unrelated prose; one who only edits the four named sites may miss a fifth added since. Re-running the grep at the end (step 7) is what closes that gap.
