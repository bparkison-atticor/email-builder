---
id: TASK-042
title: Scope the anchor-drift guard's needle search to production code only
idea: SPRINT-009-proposal
source_finding: FIND-SPRINT-009-24 (SPRINT-009 sprint-code-reviewer)
status: ready
created: 2026-08-21T00:00:00Z
epic: harness-hygiene
depends_on: [TASK-035]
files_owned:
  - index.html
  - CODE-PATTERNS.md
files_readonly:
  - README.md
  - ARCHITECTURE.md
  - CLAUDE.md
  - .soloflow/active/findings/SPRINT-009-findings.md
  - .soloflow/active/plans/harness-hygiene/TASK-035-plan.md
acceptance_criteria:
  - criterion: "Needle rows match against production source only — the harness body and HTML comments are excluded"
    verification: "In Section 16's IIFE, the per-needle fixture's check reads `prodSrc.includes(needle)`, not `src.includes(needle)`, where prodSrc is src minus the renderTestHarness body minus HTML comments. grep -c 'src.includes(needle)' in index.html returns 0."
  - criterion: "The region split is self-checked and cannot silently degrade to whole-file matching"
    verification: "A fixture row labelled with the excluded region's character count reads PASS. Temporarily break the bounds (change the start anchor string to a typo), reopen the harness, and confirm that row reads FAIL and its description says the rows below fell back to whole-file matching. Revert."
  - criterion: "Two sentinel rows prove the exclusion and the comment strip are actually running"
    verification: "One row asserts `src.includes('__harnessProbeA') && !prodSrc.includes('__harnessProbeA')` (a literal that exists only inside MODULE_TOGGLE_FIXTURES). A second asserts `src.includes('RUNTIME-EXTENDED CONTAINER') && !prodSrc.includes('RUNTIME-EXTENDED CONTAINER')` (a phrase that occurs exactly once, inside the preview-header HTML comment at the .preview-header-left container). Both read PASS."
  - criterion: "The createModuleToggle call-site floor is pinned at 4 production occurrences"
    verification: "A fixture row reports the count of `createModuleToggle('` in prodSrc and asserts it is >= 4 (CTA, Promo, Test data, Dark mode). It reads PASS with a reported count of exactly 4. Temporarily comment out the promo toggle's construction, reopen, confirm the row reads FAIL, revert."
  - criterion: "Every doc anchor from the four ANCHOR_DOCS still resolves, with zero regressions"
    verification: "Run step 1's enumeration command. Every needle extracted from README.md, CODE-PATTERNS.md, ARCHITECTURE.md and CLAUDE.md has at least one occurrence in index.html outside the renderTestHarness body and outside HTML comments. In the browser: every per-needle row in the Documentation anchor drift guard reads PASS."
  - criterion: "No doc anchor points at code that lives only inside the harness body"
    verification: "For each needle, `grep -n -F '<needle>' index.html` returns at least one line number outside the harness bounds. If TASK-035 left an anchor pointing at renderHarnessRows or harnessSection, CODE-PATTERNS.md's harness-renderer entry has been re-anchored to grep `function renderTestHarness` and names the internal helpers in prose instead."
  - criterion: "The guard's header comment matches the guard's actual behaviour"
    verification: "grep `DO NOT write any anchor needle as a literal` in index.html returns 0 matches. The replacement comment states that needles are matched against production source only, that literals inside this function are inert, and that the surviving rule is about production comments and strings outside the function."
  - criterion: "CODE-PATTERNS.md's doc-anchor convention describes the scoped behaviour"
    verification: "The 'Doc anchors, not line numbers' bullet under ## Documentation Conventions states that the guard matches against production source only and that anchors must therefore point at production code, not harness internals."
estimated_complexity: medium
test_strategy:
  needed: true
  justification: "This task changes a test guard's own matching semantics, so its correctness is not observable from the guard going green — a broken region split also goes green. The regression surface is the split itself, which needs positive sentinels and a deliberate-breakage probe."
  targets:
    - behavior: "The harness body is excluded from needle matching (harness-only literal is absent from prodSrc but present in src)"
      test_file: "index.html"
      type: integration
    - behavior: "HTML comments are excluded from needle matching (comment-only phrase is absent from prodSrc but present in src)"
      test_file: "index.html"
      type: integration
    - behavior: "A failed region split reports itself as FAIL rather than silently reverting to whole-file matching"
      test_file: "index.html"
      type: integration
    - behavior: "The createModuleToggle production call-site count is pinned, so deleting a real call site reddens a row"
      test_file: "index.html"
      type: integration
---

# Scope the anchor-drift guard's needle search to production code only

## Objective

Section 16's anchor-drift guard asserts `src.includes(needle)` against the entire fetched `index.html`, including `renderTestHarness`'s own ~1,300-line body and every HTML comment. A needle therefore stays green as long as it survives *anywhere* in the file — including in a fixture string or a stale comment — even after every real call site is deleted. Two live instances: `createModuleToggle('` has 8 occurrences of which only 4 are production (one is the HTML comment on the runtime-extended preview header, three are `__harnessProbeA/B/C` calls inside `MODULE_TOGGLE_FIXTURES`), and `.seg-body` has 4 of which 2 are harness fixture strings. The guard's own header comment warns "DO NOT write any anchor needle as a literal anywhere in this file" precisely to avoid this vacuous-pass class (FIND-SPRINT-007-7), but these violations predate the guard and nothing enforces the rule. This task slices the harness body and HTML comments out of the matched source, self-checks the slice so a failed boundary cannot silently degrade to today's behaviour, and replaces the blanket prohibition with the narrower rule that actually still applies.

## Implementation Steps

1. **Completeness gate — enumerate every anchor and locate it. Re-run this before reporting COMPLETED.**

   ```bash
   # a. Extract the needle set the guard will build at runtime.
   grep -ho 'grep `[^`]*`' README.md CODE-PATTERNS.md ARCHITECTURE.md CLAUDE.md \
     | sed 's/^grep `//; s/`$//' | sort -u

   # b. Derive today's harness bounds (they shift after TASK-035).
   grep -n 'function renderTestHarness(' index.html
   awk -v s=<that line number> 'NR>s && /^}/ {print NR; exit}' index.html

   # c. For every needle from (a), locate all occurrences.
   grep -n -F '<needle>' index.html
   ```

   Classify each occurrence as production (line outside the bounds from b, and not inside an HTML comment), harness (inside the bounds), or comment. **Every needle must have at least one production occurrence.** Any needle with zero is a real doc-drift or a doc anchor pointing at harness internals — resolve it per step 7 before touching the guard, not after.

   Pre-flight result at plan time (pre-TASK-035, harness bounds 2167-3495): all 22 unique needles resolve in production. `createModuleToggle('` → 4 production (the CTA, Promo, Test data, Dark mode call sites), 1 comment, 3 harness. `.seg-body` → 2 production (the CSS rule pair), 2 harness. `TEMPLATE CONFIGS` → 1 production (the JS section banner) plus 1 inside the top-of-file HTML comment. The remaining 19 are single-site and unambiguous. **TASK-035 adds at least one new CODE-PATTERNS.md anchor (`function renderHarnessRows`) whose only occurrence is inside the harness body** — that is what (a) is for, and step 7 handles it.

2. **Build the production-only source.** Inside Section 16's async IIFE, immediately after `const src = sources['index.html'];`, add the region split:

   ```js
   // Needles are matched against PRODUCTION source only (FIND-SPRINT-009-24).
   // The harness's own body and every HTML comment are sliced out first, so a
   // needle that survives only as a fixture string or in a stale comment can
   // no longer keep a deleted call site green.
   //
   // The exclusion starts at the END of the declaration line, so
   // `function renderTestHarness(` itself stays anchorable from the docs.
   // renderTestHarness is a top-level declaration and nothing inside it starts
   // a line at column 0, so the first line-initial '}' after it is its closing
   // brace. Do NOT use /^\}$/m — index.html is CRLF, so '$' never matches
   // before the '\r'.
   const hDecl = src.indexOf('function renderTestHarness(');
   const hStart = hDecl === -1 ? -1 : src.indexOf('\n', hDecl);
   const hEndRel = hDecl === -1 ? -1 : src.indexOf('\n}', hDecl);
   const hEnd = hEndRel === -1 ? -1 : hEndRel + 2;
   const boundsOk = hDecl > 0 && hStart > hDecl && hEnd > hStart && (hEnd - hStart) > 20000;
   const harnessSrc = boundsOk ? src.slice(hStart, hEnd) : '';
   const outsideHarness = boundsOk ? src.slice(0, hStart) + src.slice(hEnd) : src;
   const prodSrc = outsideHarness.replace(/<!--[\s\S]*?-->/g, '');
   const countIn = (hay, ndl) => hay.split(ndl).length - 1;
   ```

   The `20000` floor is a sanity gate, not a measurement: the harness is ~80,000 characters today and TASK-035's consolidation will not take it below 20,000. It exists so that a boundary that collapses to a few hundred characters reads FAIL instead of quietly matching almost the whole file. The comment strip is non-greedy and every `<!--` in this file has a matching `-->`, so it cannot run away.

3. **Add the bounds self-check as the first fixture.** Push it into `fixtures` before the per-doc floor rows:

   ```js
   fixtures.push({
     label: 'Region split: harness body located and excluded (' + (hEnd - hStart) + ' chars)',
     check: () => boundsOk,
     description: 'Every needle row below matches production source only. A FAIL means the split failed and prodSrc fell back to the whole file — the rows below are then back to the FIND-SPRINT-009-24 behaviour and cannot be trusted. Fix the bounds (the start anchor is the renderTestHarness declaration, the end is the first line-initial closing brace after it) rather than lowering the size floor.',
   });
   ```

   This row is the reason the fallback `outsideHarness = src` is safe: the degradation is loud, not silent.

4. **Add the two sentinel fixtures.** These are the regression tests for the split itself — a split that is a no-op still leaves every needle row green, so the guard cannot verify itself without them.

   ```js
   fixtures.push({
     label: 'Region split really excludes the harness body (harness-only sentinel)',
     check: () => src.includes('__harnessProbeA') && !prodSrc.includes('__harnessProbeA'),
     description: '__harnessProbeA exists only inside the MODULE_TOGGLE_FIXTURES persistence probes. It must be present in the raw fetched source and absent from prodSrc. A FAIL means the exclusion is a no-op, or the probe was renamed — in that case pick another harness-only literal, do not delete the row.',
   });
   fixtures.push({
     label: 'Region split really strips HTML comments (comment-only sentinel)',
     check: () => src.includes('RUNTIME-EXTENDED CONTAINER') && !prodSrc.includes('RUNTIME-EXTENDED CONTAINER'),
     description: 'That phrase occurs exactly once, inside the HTML comment on the .preview-header-left runtime-extended container. It must survive in the raw source and be gone from prodSrc. A FAIL means the comment-strip regex is not running, or the comment was reworded.',
   });
   ```

5. **Rewrite the per-needle check.** Change the `for (const [needle, docs] of seen)` loop's fixture to match `prodSrc` and to report why a failure happened:

   ```js
   for (const [needle, docs] of seen) {
     const inProd = prodSrc.includes(needle);
     const nHarness = countIn(harnessSrc, needle);
     const nComment = countIn(outsideHarness, needle) === 0 && countIn(src, needle) > nHarness;
     fixtures.push({
       label: docs.join(' + ') + ' -> ' + needle
         + (inProd ? '' : ' (harness: ' + nHarness + (nComment ? ', comment-only elsewhere' : '') + ')'),
       check: () => inProd,
       description: 'The doc anchor must occur at least once in index.html OUTSIDE the test harness body and outside HTML comments. A FAIL means the identifier was renamed or deleted from production code and the doc now points at nothing — fix the doc, or restore the identifier, in the same commit. Occurrences inside this harness function or inside an HTML comment deliberately do not count. If you need to document harness internals, anchor the entry point (grep `function renderTestHarness`) and name the internal helpers in prose without a grep anchor.',
     });
   }
   ```

   Keep the per-doc `ANCHOR_FLOORS` rows and the README template-schema row exactly as they are — both read the fetched markdown, not `src`, and neither is affected by the split.

6. **Add the production call-site floor.** Immediately after the per-needle loop:

   ```js
   // A per-needle row only proves >= 1 production occurrence, which
   // FIND-SPRINT-009-24 showed can be satisfied by fixture code. This table
   // pins the real count for anchors whose docs make a stronger claim.
   // Writing these needles as literals here is safe: this function's body is
   // excluded from prodSrc by construction.
   const PROD_NEEDLE_FLOORS = { "createModuleToggle('": 4 };
   for (const [needle, floor] of Object.entries(PROD_NEEDLE_FLOORS)) {
     const n = countIn(prodSrc, needle);
     fixtures.push({
       label: 'Production call-site floor: ' + needle + ' occurs ' + n + ' times (floor ' + floor + ')',
       check: () => seen.has(needle) && n >= floor,
       description: "CODE-PATTERNS.md names four callers of this factory — CTA, Promo, Test data and Dark mode. If you deliberately remove a module toggle, lower the floor in the same commit. This row also FAILs if the needle is no longer an extracted doc anchor at all, which means the floor table has outlived its entry and should be pruned.",
     });
   }
   ```

7. **Resolve any harness-internal anchor found in step 1.** TASK-035 defines `harnessSection` and `renderHarnessRows` inside `renderTestHarness` and documents at least one of them in CODE-PATTERNS.md with a grep anchor. Under the new semantics such an anchor cannot resolve, and the correct fix is the doc, not an exception mechanism: in CODE-PATTERNS.md's harness-renderer entry, change the Location anchor to grep `function renderTestHarness` and name `harnessSection` / `renderHarnessRows` / `renderPredicateFixtures` in prose (backticked as code, but *not* in the `grep \`…\`` form the guard extracts). Everything else in that entry — the `{ actual, pass, fields }` contract, the `opts.json` escape hatch, the no-hand-rolled-markup rule — stays verbatim. This preserves TASK-035's acceptance criterion ("a grep anchor that resolves in index.html") because the declaration line is deliberately kept inside `prodSrc` by step 2. Do the same for any other anchor step 1 flags.

8. **Replace the guard's header comment.** Delete the five-line "DO NOT write any anchor needle as a literal anywhere in this file" block above `ANCHOR_FLOORS` and put in its place: needles are matched against production source only, so a needle written as a literal inside this function is inert and cannot self-satisfy its own row — which is what the old blanket rule was protecting against (FIND-SPRINT-007-7); the rule that survives is never write a needle literal in a production comment or string *outside* this function, because those are still counted; needles themselves are still captured from the fetched markdown and never hard-coded. Landing this in the same commit as step 6 is mandatory — step 6 writes a needle literal that the old comment forbids, and leaving both would make the file contradict itself.

9. **Update the doc-anchor convention.** In CODE-PATTERNS.md under `## Documentation Conventions`, extend the "Doc anchors, not line numbers" bullet: the guard matches against production source only — `renderTestHarness`'s body and HTML comments are excluded — so an anchor must point at production code; an anchor whose only home is a harness fixture or a comment now FAILs by design. Keep the existing caveat about anchors that resolve while the surrounding prose has drifted; it is still the sharper risk.

10. **Deliberate-breakage probe.** Three temporary edits, reverted each time: (a) typo the start anchor string in step 2 → the bounds row reads FAIL and every needle row still renders; (b) comment out `const promoToggle = createModuleToggle('promo', …)` → the call-site floor row reads FAIL with a reported count of 3; (c) rename a production identifier that a doc anchors — e.g. `function autoLinkPhones` → `function autoLinkPhones_x` — and confirm that needle's row reads FAIL. Probe (c) is the guard's whole purpose and the property most at risk from a scoping change.

11. **Final gate.** Re-run step 1's enumeration. Serve over http://, open Ctrl+Shift+T, and confirm every row in every section reads PASS — the bounds row, both sentinels, the call-site floor, all per-doc floor rows, all per-needle rows, and the README schema row.

## Acceptance Criteria

- **Production-only matching.** PASS = the per-needle check reads `prodSrc.includes(needle)` and zero occurrences of `src.includes(needle)` remain. FAIL = any needle row still matching the whole file.
- **Loud degradation.** PASS = the bounds row reports the excluded region's size and reads FAIL when the anchor is broken. FAIL = a broken boundary that leaves every row green.
- **Split proven, not assumed.** PASS = both sentinel rows green. FAIL = either missing, which would make a no-op split indistinguishable from a working one.
- **Call-site floor.** PASS = `createModuleToggle('` reported at 4 in prodSrc, row green, and red at 3 when a toggle is removed.
- **Zero anchor regressions.** PASS = every needle from the four docs has a production occurrence and every per-needle row is green. FAIL = any needle resolving only inside the harness or a comment.
- **No exception registry.** PASS = harness-internal anchors are fixed in the doc (step 7), not allowlisted in code. An allowlist keyed on the needle string would be spelled inside the harness body and would self-satisfy the very check it bypasses.
- **Comment matches behaviour.** PASS = the old blanket prohibition is gone and the replacement describes the actual, narrower rule. FAIL = both present, or the literal in step 6 landing while the prohibition still stands.
- **Convention documented.** PASS = the CODE-PATTERNS.md Documentation Conventions bullet describes production-only matching.

## Verification

```bash
# Anchors still resolve in production, and nothing regressed.
grep -ho 'grep `[^`]*`' README.md CODE-PATTERNS.md ARCHITECTURE.md CLAUDE.md \
  | sed 's/^grep `//; s/`$//' | sort -u
grep -n 'function renderTestHarness(' index.html
# then, per needle:
grep -n -F '<needle>' index.html      # >= 1 line outside the harness bounds

# The old prohibition is gone and the new matching is in place.
grep -c 'DO NOT write any anchor needle as a literal' index.html   # 0
grep -c 'src.includes(needle)' index.html                          # 0
grep -c 'prodSrc.includes(needle)' index.html                      # 1

# Sentinel literals are where the fixtures assume.
grep -c -F '__harnessProbeA' index.html               # 2, both inside the harness
grep -c -F 'RUNTIME-EXTENDED CONTAINER' index.html    # 1, inside the HTML comment
```

Then serve over http:// and open Ctrl+Shift+T: every row PASS, plus the three deliberate-breakage probes from step 10 reddening the expected row and only that row.

## Test Strategy

The deliverable is a test guard, so the strategy is about proving the guard did not become vacuous in a different way. Four targets, all fixtures inside Section 16 in `index.html`:

- **Bounds self-check** (step 3). The one row that makes the whole-file fallback acceptable. Verified by probe 10(a).
- **Harness-exclusion sentinel** (step 4). `__harnessProbeA` occurs exactly twice, both inside `MODULE_TOGGLE_FIXTURES` — a literal that is definitionally harness-only, so no new code is needed to create it. This is the row that would catch a split that silently does nothing.
- **Comment-strip sentinel** (step 4). `RUNTIME-EXTENDED CONTAINER` occurs exactly once, inside the preview-header HTML comment. Same property, for the comment half.
- **Call-site floor** (step 6). Converts the FIND's own example into a permanent assertion: the four real `createModuleToggle('` call sites are pinned, so deleting one reddens a row instead of being absorbed by the fixture occurrences.

No mocking or fixture files — every assertion runs against the already-fetched document source. Note that `renderPredicateFixtures` wraps `check()` in try/catch, so a throwing predicate here renders as a single FAIL row; the section additionally has its own row-building try/catch that emits a "Build the anchor-drift fixtures" failure row, so a throw in step 2's split code surfaces as a visible FAIL rather than a heading-only section.

## Hardest Decision

Whether to allow doc anchors to point at harness internals, and if so how. TASK-035 documents `renderHarnessRows` in CODE-PATTERNS.md with a grep anchor, and that function is defined inside `renderTestHarness` — so the moment the harness body stops counting, that row goes red. The obvious fix is an exception registry (`HARNESS_INTERNAL_ANCHORS`, needles allowed to resolve inside the harness). I designed it, then rejected it: the registry entry has to spell the needle as a literal *inside the harness body*, so the "does it occur in the harness?" check would be satisfied by the registry entry itself. That is the FIND-SPRINT-007-7 vacuous-pass trap reintroduced one layer up, and every workaround (occurrence floors that count the registry entry, string-splicing the needle so the literal never appears) is worse than the problem.

So the policy is: **doc anchors must point at production code.** Harness internals are documented in prose and anchored via the harness entry point, which step 2 deliberately keeps inside `prodSrc` by starting the exclusion at the end of the declaration line rather than at its start. This costs one small edit to a CODE-PATTERNS.md entry TASK-035 just wrote (hence the dependency), and it buys a guard with no bypass mechanism at all.

The secondary decision was the harness end boundary. Brace counting is unusable — the harness body is full of braces inside strings, regexes and comments. A regex on line-initial `}` is only safe if nothing inside the function starts a line at column 0, which I verified: the nearest line-initial `}` before 3495 is at 2044, well above the declaration at 2167. Combined with the size-floor self-check, a future edit that violates that assumption reads FAIL rather than mis-slicing. The CRLF detail is what makes this subtle: `/^\}$/m` looks correct and never matches, because `$` will not match before the `\r`.

## Rejected Alternatives

- **The lighter landing: rename the harness probes and add an "at least N outside the harness" fixture.** Rejected because renaming the probe ids does not help — the needle is `createModuleToggle('`, which the harness matches by *calling the factory*, not by the id it passes. Making it work would mean calling through a local alias (`const mk = createModuleToggle; mk('__harnessProbeA', …)`) so the literal never appears, and doing the same trick for `.seg-body`'s two prose strings, and then relying on every future fixture author remembering the rule with nothing enforcing it. The region split makes those literals harmless by construction instead. The one good idea in that proposal — a floor on production call sites — is kept as step 6.
- **An exception registry for harness-internal anchors.** Rejected in Hardest Decision: the registry entry self-satisfies its own check. Would change my mind if the registry could be keyed on something other than the needle string, or if the harness were extracted to a file the guard could exclude by URL instead of by offset.
- **Excluding only HTML comments, not the harness body.** Rejected: it fixes one of the two named instances and leaves the three `MODULE_TOGGLE_FIXTURES` probe calls propping up `createModuleToggle('` and the two fixture strings propping up `.seg-body`.
- **Restricting matches to a positive production region instead of subtracting the harness.** Rejected: there is no single production region — needles resolve in the CSS block (`.seg-body`), the static markup (`id="warn"`, `id="preview"`), and the module script both above and below the harness. Subtraction is the only tractable shape.
- **Moving `renderTestHarness` out of `index.html`.** Rejected: violates the single-file constraint in CODE-PATTERNS.md's Recurring Patterns and would be a far larger change than the defect warrants. It is, however, the change that would make this whole class of problem disappear, and worth revisiting if the harness keeps growing.

## Lowest-Confidence Area

Step 7's interaction with TASK-035's actual output. I am planning against TASK-035's *plan*, not its result: its step 10 says the CODE-PATTERNS.md entry is "anchored as grep `function renderHarnessRows`", but its executor may add a second anchor for `harnessSection`, may name the functions differently, or may place the definitions somewhere other than inside `renderTestHarness`. Step 1's enumeration is the authoritative input and must be run against the file as it actually is — do not trust the needle inventory quoted in this plan for anything TASK-035 touched. If TASK-035 instead defined the helpers at module scope outside the harness, step 7 is a no-op and this plan gets simpler.

Second: the harness end boundary rests on "nothing inside `renderTestHarness` starts a line at column 0", which is true today and which TASK-035's consolidation has no reason to change — but it is a formatting convention, not a language guarantee. The bounds row's size floor catches a boundary that collapses; it does not catch a boundary that lands slightly *early* (say, 200 characters short of the closing brace), which would leave a sliver of harness code inside `prodSrc`. If that class of error worries you, tighten the bounds row to also assert that `harnessSrc` ends with the closing brace and contains the last section's heading text.
