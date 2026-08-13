---
sprint: SPRINT-009
pending_count: 20
last_updated: "2026-08-13T20:15:00.000Z"
---
# Findings Queue

SPRINT-009 started with missing infra: maestro; tests deferred.

## FIND-SPRINT-009-1
- **source:** TASK-029 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2731-2735
- **description:** Section 10's header comment still reads "Fixture 7 (the drift guard) is the highest-value regression lock in this section". TASK-029 inserted three new fixtures ahead of it (the ordering trap, the CSS-keyword fixture and the prose fixture), so the drift guard is now fixture 10, not 7. The comment is the only in-file pointer telling a future maintainer which row must never be deleted, so a wrong index actively misdirects. Section 8's equivalent comment ("Fixture 8") is still accurate — only Section 10 drifted.
- **suggested_action:** Change "Fixture 7" to "Fixture 10" in the Section 10 header comment, or refer to the row by its label ("the drift-guard fixture") so it survives future insertions.
- **resolved_by:** 

## FIND-SPRINT-009-2
- **source:** TASK-029 (verifier)
- **type:** improvement
- **severity:** low
- **status:** resolved
- **location:** index.html:3162-3174
- **description:** Section 13's `for (const guard of MICROCOPY_DOM_GUARDS)` loop renders the exact predicate row shape that the new `renderPredicateFixtures(body, fixtures, failText)` helper now owns — same `{ label, check(), description }` fixture fields, same try/catch, byte-identical row markup, differing only in its failText ('FAIL — guard returned false'). It is a fifth copy of the loop the extraction was created to eliminate. It was correctly left alone by TASK-029 because acceptance criterion 7 pins `grep renderPredicateFixtures` at exactly 5 lines, but the duplication the extraction targeted is not fully retired. (The other loops in Sections 11-13 render an input/expected/actual field shape and genuinely do not fit the helper.)
- **suggested_action:** In TASK-030 or TASK-031, replace the Section 13 loop with `renderPredicateFixtures(body, MICROCOPY_DOM_GUARDS, 'FAIL — guard returned false')` and update the grep-count expectation in whichever plan owns it.
- **resolved_by:** TASK-031

## FIND-SPRINT-009-3
- **source:** TASK-029 (verifier)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** .soloflow/active/plans/dark-mode-preview-hardening/TASK-029-plan.md:71-76
- **description:** The plan's completeness gate specified absolute grep counts as pass/fail criteria (`harness-row-label` 11→8, row loops 9→5). Both baselines were already wrong at execution time — the real counts were 19→16 and 17→14, because sibling tasks in earlier sprints added harness Sections 11-13 after the plan was authored. The executor and the orchestrator both had to hand-wave the numbers, and verification had to be told to judge intent rather than the literal criterion. The plan's Context section has the same staleness ("Section 11 and 12 land in TASK-030 and TASK-031" — Sections 11, 12 and 13 already exist). Absolute counts over a fast-moving shared file are a self-invalidating criterion.
- **suggested_action:** Prefer scoped/relative gates in plans over whole-file absolute counts — e.g. "exactly 5 `renderPredicateFixtures` occurrences" (which held) and "zero `for (const … of` loops between the Section 7 and Section 11 headers" — rather than `grep -c` totals across a file other tasks are concurrently growing. Worth a line in CLAUDE.md or the planner guidance.
- **resolved_by:** 

## FIND-SPRINT-009-4
- **source:** TASK-029 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:2576-2601
- **description:** Section 8's rewritten preview-purity guard asserts two independent invariants under one label: `previewIsTransformed && exportIsPure`. Asserting both is deliberate and correct — checking export purity alone is what let the pre-TASK-029 fixture pass vacuously (FIND-SPRINT-007-7) — but the two halves fail for opposite reasons. `previewIsTransformed` going false means the dark transform stopped running at all; `exportIsPure` going false means the transform leaked into Copy HTML output. The row renders one undifferentiated FAIL badge either way, and this harness is the repo's only test surface, so the badge is the entire failure signal. The plan's own Lowest Confidence Area anticipated this ("a developer would have to know to look at the ordinary preview to see the real cause").
- **suggested_action:** When a future task next touches Section 8, have `check()` record which half failed (e.g. stash a reason string on the fixture object) and surface it in the Result field via the `failText` path, rather than splitting into two fixtures — a split would double the forced `render()` calls and add two more MJML compiles to harness open. Do not weaken the combined assertion.
- **resolved_by:** 

## FIND-SPRINT-009-5
- **source:** TASK-030 (verifier)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** .soloflow/active/plans/dark-mode-preview-hardening/TASK-030-plan.md:24-25
- **description:** Second recurrence of the anti-pattern FIND-SPRINT-009-3 already flagged, and this time the plan contradicts itself outright. Acceptance criterion 6's verification is `grep -c "querySelector('.preview-header-left')" index.html returns 1`, but the same plan's step 6 supplies the new harness fixture verbatim with `const kids = Array.from(document.querySelector('.preview-header-left').children);` inside it — so satisfying steps 3 and 6 as written necessarily produces a count of 2. The criterion's substantive property ("evaluated exactly once and cached in a const reused by every header-append call site") is objectively true at runtime; only the grep proxy is unsatisfiable. Verification had to judge intent over the literal check for the second task running in this sprint.
- **suggested_action:** Planner guidance: when an acceptance criterion's verification is a `grep -c` over a whole file, cross-check it against the code the plan's own implementation steps introduce. Prefer a scoped proxy — e.g. "no `document.querySelector('.preview-header-left')` occurs between the `previewHeaderLeft` declaration and the end of the dark-mode block" — or state the property and let the verifier pick the probe. Pairs with FIND-SPRINT-009-3; two instances in one sprint makes this worth a line in CLAUDE.md or the planner prompt.
- **resolved_by:** 

## FIND-SPRINT-009-6
- **source:** TASK-030 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** resolved
- **location:** index.html:2820-2828
- **description:** Harness section numbers are no longer monotonic in source order: the file now reads Sections 7, 8, 9, 10, **14**, 11, 12, 13. TASK-030's plan said "Section 11", but 11-13 (rich-text italics, richtext parity, CTA microcopy) already existed from earlier sprints, and renumbering them would have desynced CHANGELOG.md's "Test harness Sections 11-13" entry — a file outside TASK-030's `files_owned`. The executor picked the next free number, kept the plan's mandated placement after Section 10, and documented the choice in an eight-line comment, which is the right call given the constraints. The residual wart is that the rendered harness has no visible numbers, so this section is the *eleventh* heading a user sees while the source calls it 14 — someone told "the eleventh section failed" would grep `Section 11` and land on rich-text italics.
- **suggested_action:** TASK-031 owns CHANGELOG.md for this epic and could resolve it cheaply: either renumber the new section to 11 and shift the old 11-13 to 12-14 (updating the CHANGELOG line in the same commit), or drop numeric section labels entirely in favour of the heading text the harness actually renders. The latter is more durable — section numbers over a file multiple tasks grow concurrently will collide again.
- **resolved_by:** TASK-031

## FIND-SPRINT-009-7
- **source:** TASK-030 (verifier)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:4087,4119
- **description:** `createModuleToggle`'s `localStorage.getItem` / `setItem` calls are still unguarded, so a browser that throws on storage access (blocked site data, hardened profile, extension stub) throws out of the first factory call at index.html:4037 and aborts the rest of module init — no toggles, no render wiring, dead app. The migration shim immediately above it (index.html:4020-4032) was already hardened with try/catch for exactly this reason, so the file is now inconsistent about a hazard it has already acknowledged once. TASK-030's plan explicitly deferred this ("Wrapping the factory's `localStorage.getItem` in try/catch … Worth its own backlog item") to keep the acceptance criteria clean, which was correct — this is the backlog item. Note the new `persist = false` path narrows the blast radius slightly: the dark-mode caller no longer touches storage at all.
- **suggested_action:** Wrap the read in a try/catch that falls back to `null` (yielding `defaultOn`) and the write in a try/catch that silently no-ops, mirroring the comment style of the existing shim at index.html:4028-4031. Add a harness fixture that stubs `localStorage.getItem` to throw and asserts the factory still returns a usable toggle.
- **resolved_by:** 

## FIND-SPRINT-009-8
- **source:** TASK-030 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2873-2884
- **description:** Two small hygiene issues in the new "Preview header append order" fixture. (1) The label enumerates six children including both `<span class="divider">` elements, but the predicate only checks the viewport control, the Test data toggle, `#darkModeSwitch`, `#darkClientControl` and a `module-toggle` count of 2 — neither divider is asserted, so deleting the static trailing divider (the exact element the new HTML comment hangs its contract on) leaves this row green. (2) `at(el => !!el.querySelector && !!el.querySelector('button[data-vp]'))` guards against a missing `querySelector` method on a value that came from `Array.from(container.children)` and is therefore always an Element; the three sibling predicates on the next lines use `el.classList` / `el.id` with no such guard, so the file is internally inconsistent about a condition that cannot be false. Neither affects what the fixture currently catches (the load-bearing control ordering is asserted correctly), which is why this is queued rather than raised against the task.
- **suggested_action:** When a future task next touches this fixture: drop the `!!el.querySelector &&` half of the viewport predicate, and either add a divider assertion (e.g. `kids.filter(el => el.classList.contains('divider')).length === 2`) or trim the label to name only what is checked.
- **resolved_by:**

## FIND-SPRINT-009-9
- **source:** TASK-031 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2482
- **description:** The `renderPredicateFixtures` header comment still opens with "Shared row renderer for the predicate-shaped harness sections (7-10)." That scope was accurate when TASK-029 extracted the helper, but Section 11 (TASK-030), Section 12 (TASK-031) and Section 15 (migrated by TASK-031 in this task) now call it too — seven call sites plus the definition. The rest of the comment was correctly updated by TASK-031 to retire the FIND-SPRINT-009-2 deferral note, so only the opening range is stale. A maintainer reading the first line would conclude the helper is dark-mode-transform-specific and hand-roll an eighth copy of the loop for a new section, which is exactly the duplication the extraction retired.
- **suggested_action:** Replace "(7-10)" with a non-enumerating phrase — e.g. "for harness sections whose fixtures are `{ label, check(), description }`" — so the comment does not need editing every time a section is added. Avoid a new explicit range; the two prior ranges in this file both went stale within one sprint.
- **resolved_by:**

## FIND-SPRINT-009-10
- **source:** TASK-031 (verifier)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** .soloflow/active/plans/dark-mode-preview-hardening/TASK-031-plan.md:75-79
- **description:** Third instance in this sprint of the grep-proxy anti-pattern already logged as FIND-SPRINT-009-3 and FIND-SPRINT-009-5, and the second time a plan contradicts itself. TASK-031's step 1 defines a completeness gate — `grep -rn "reads as a deliberate result\|deliberate result" --include="*.html" --include="*.md" .` must return "zero matches outside `.soloflow/`" — but the same plan's step 9 supplies the replacement CHANGELOG text verbatim, and that text contains the phrase: `claimed it made the Apple Mail no-op "read as a deliberate result" have been corrected`. Writing step 9 as specified necessarily leaves one match at CHANGELOG.md:9, so step 1's gate is unsatisfiable by construction. The frontmatter acceptance criteria happen to be narrower and are literally satisfied (criterion 8 greps only `index.html`, criterion 9 greps the full phrase "reads as a deliberate result", which the new text does not contain because it quotes the claim in the past tense), so this cost nothing this time — but it only worked by accident of tense. Three occurrences in one sprint, all from different planning passes.
- **suggested_action:** Add a planner rule: any grep-based completeness gate must be run mentally against the plan's own prescribed replacement text before the plan is issued, and a gate whose target string is deliberately quoted in the correction should scope itself (e.g. exclude the file that carries the correction, or match on the surrounding sentence rather than the fragment). Pairs with FIND-SPRINT-009-3 and -5; three instances makes this a CLAUDE.md / planner-prompt line rather than a per-plan note.
- **resolved_by:**

## FIND-SPRINT-009-11
- **source:** TASK-031 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** CHANGELOG.md:3-9,23
- **description:** The harness renumbering note added to the CTA-microcopy entry ends "(Renumbered from 11-13 by the dark-mode preview hardening epic — see the 2026-08-12 dark-mode caption entry above — to keep harness section numbers monotonic in source order.)" The factual claim is correct and verified, but the cross-reference is dangling: the 2026-08-12 dark-mode caption entry it points to says nothing about harness sections or renumbering — it documents only the caption and the corrected chrome-legibility claim. A reader following the pointer finds no explanation. Related: that new entry is also the first CHANGELOG section in this file's history to add a harness section (Section 12, four fixtures after the 7e1f1a8 code-review fix) without documenting it, while every neighbouring entry has a "Test harness Sections N-M" bullet.
- **suggested_action:** In whichever task next owns CHANGELOG.md, add a "Test harness Section 12" bullet to the 2026-08-12 dark-mode caption entry naming the four caption fixtures and stating the 11-13 to 13-15 renumbering — that both documents the new section and makes the existing cross-reference resolve.
- **resolved_by:** 

## FIND-SPRINT-009-12
- **source:** TASK-031 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2502
- **description:** `renderPredicateFixtures` escapes `fixture.label` and `fixture.description` through `escapeHtml` before concatenating them into `row.innerHTML`, but interpolates the `failText` parameter raw: `'<code>' + (pass ? 'PASS' : failText) + '</code>'`. The helper predates this task (TASK-029), and until now every caller used the `'FAIL'` default, so the asymmetry was inert. TASK-031's migration of MICROCOPY_DOM_GUARDS made `failText` a live argument for the first time. Today's value is a hardcoded developer literal, so there is no untrusted data path and this is hygiene rather than a vulnerability — but the whole point of the parameter is per-section failure prose, and FIND-SPRINT-009-4 already proposes threading a computed reason string through this exact path for Section 8. A computed reason built from fixture state could contain `<` and silently inject markup into the harness DOM.
- **suggested_action:** Wrap the parameter at the interpolation site — `(pass ? 'PASS' : escapeHtml(failText))` — before any task acts on FIND-SPRINT-009-4 and starts passing computed strings.
- **resolved_by:** 

## FIND-SPRINT-009-13
- **source:** TASK-031 (code-reviewer)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:2163,2185,2208,2251,2326,2442,2512,2542,2650,2764,2845,2939,2989,3046,3180
- **description:** Every harness section opens with the same four-line block — `document.createElement('h3')`, an identical 5-property `style.cssText` literal, `textContent`, `body.appendChild` — now repeated fifteen times, byte-identical apart from the heading text and the variable name. TASK-031 added the twelfth copy (h12) and touched five of the others while renumbering, so the pattern is actively growing. This is the header-shaped twin of the row-loop duplication TASK-029 retired with `renderPredicateFixtures` and TASK-031 finished off via FIND-SPRINT-009-2; the styling literal is the drift surface, since a single restyle now means fifteen edits. Not raised against TASK-031: adding one more instance of an established fifteen-site pattern was the correct scoped choice, and the extraction spans sections owned by five earlier tasks.
- **suggested_action:** Extract `harnessSection(body, title)` next to `renderPredicateFixtures` (returning nothing; it only appends), and replace all fifteen `const hN = ...` blocks with a single call. This also removes the `hN` variable names, which are the thing that had to be renumbered by hand in this task and would not need renaming again.
- **resolved_by:** 

## FIND-SPRINT-009-14
- **source:** TASK-031 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2984-2999
- **description:** Two residues on Section 12's new live-picker-click fixture, which correctly resolves the review's Important finding (mutation-verified: deleting `syncDarkNote()` from the `wireSegControl` callback flips exactly this row red). (1) Its `description` locates the guarded call site as "the wireSegControl callback (index.html ~4183)", but the same commit that wrote that string shifted the call to 4203 — the reference was stale on arrival, and it is the third line-number-style drift this sprint after FIND-SPRINT-009-1 and -9. (2) The fixture asserts on a single click of the Apple Mail button, so its mutation sensitivity is conditional on `darkModeClient` not already being `'applemail'` when the harness opens: if a marketer selects Apple Mail and then presses Ctrl+Shift+T, the click is a no-change, the caption already reads the Apple Mail sentence from the switch-on sync, and the row goes green with the wiring deleted. On a fresh load the default client is `'gmail'`, which is the state the acceptance criteria specify, so the guard works as intended today.
- **suggested_action:** (1) Replace "~4183" with a symbolic pointer — "the `wireSegControl` callback at the end of the dark-mode block" — since the surrounding sentence already names `wireSegControl` and the number adds nothing but a decay surface. (2) Make the assertion unconditional by clicking two different clients in sequence and asserting the caption text after each (e.g. Apple Mail then Outlook): whatever the entry client, at least one click is a genuine change, so a removed call site always goes red. The existing `savedBtn.click()` restore in the `finally` already covers both.
- **resolved_by:** 

## FIND-SPRINT-009-15
- **source:** TASK-032 (verifier)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:3428-3436
- **description:** The templates-schema fixture tests each live brand key against the *whole* fetched README (`sources['README.md'].includes(k)`) rather than against the README `## Templates` section it is supposed to police. Any key whose name happens to appear as an ordinary English word anywhere else in README passes without ever being documented in the schema bullet list. This is reachable, not theoretical: README already contains the substrings `padding`, `image`, `label`, `html`, `data` and `check` outside the Templates section, so adding e.g. `padding` or `linkColor`-adjacent theming keys to a brand entry — exactly the most plausible future edit to that map — would leave the row green with the key undocumented. Verified with a headless run: the fixture correctly reddens for a genuinely novel key (`zzTestKey` mutation names it in the label), so the guard is not vacuous today; the hole is specific to keys that collide with unrelated README prose. The whole-file match is what the plan's step 8 sketch prescribed, so this is not a TASK-032 defect — it is the residual weakness that survived the plan.
- **suggested_action:** Slice the fetched README to the `## Templates` section before matching (from the `## Templates` heading to the next `^## ` heading) and test `section.includes('`' + k + '`')` so a key must appear as inline code inside the schema list, not as prose anywhere in the file. Both halves are one line each and preserve the existing "no hardcoded key list" property.
- **resolved_by:** 

## FIND-SPRINT-009-16
- **source:** TASK-032 (verifier)
- **type:** improvement
- **severity:** low
- **status:** open
- **location:** index.html:3383-3402
- **description:** The anchor-drift section's `try`/`catch` wraps only the fetch stage. Everything after it — needle extraction, floor rows, the `Object.values(templates)` schema derivation and the final `renderPredicateFixtures(anchorSection, fixtures)` — runs outside any handler inside a fire-and-forget async IIFE. A throw there produces an unhandled promise rejection and leaves the section rendered as a bare heading with an empty container and zero rows, which reads as "nothing to check" rather than as a failure. That is the same silent-vacuity failure mode the per-file `ANCHOR_FLOORS` rows were added to close, reintroduced one level up: the floors defend against a doc losing its anchors, but nothing defends against the row-building code itself dying. Confirmed the fetch-failure half is solid — a 404 path and a `file://` open each render exactly one explanatory row with no uncaught exception and all 15 other sections intact.
- **suggested_action:** Extend the `try` to cover the whole IIFE body, or add a second `catch` around the post-fetch block that renders one failing row naming the thrown error. Alternatively have the fetch-failure `catch` be the only exit and assert non-emptiness — e.g. a first row asserting `fixtures.length >= ANCHOR_DOCS.length + 1` — so an empty section can never look green.
- **resolved_by:** 

## FIND-SPRINT-009-17
- **source:** TASK-032 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:3418-3424
- **description:** When one doc carries the same anchor twice, the per-needle row label repeats the filename: the shipped harness renders `CODE-PATTERNS.md + CODE-PATTERNS.md -> function wireSegControl`, because CODE-PATTERNS.md anchors `function wireSegControl` in both its seg-control entry and the new Documentation Conventions entry, and `seen.get(needle).push(doc)` appends per occurrence rather than per file. Purely cosmetic — the row is a correct PASS and the needle is deduplicated correctly (19 unique needles, 19 rows, 19 unique labels confirmed in a headless run) — but a reader scanning the section sees what looks like a rendering bug. The plan's step 7 sketch has the same behaviour, so this is inherited, not introduced.
- **suggested_action:** Guard the push with `if (!seen.get(needle).includes(doc))`, or build `seen` as `needle -> Set<doc>` and spread it at label time.
- **resolved_by:** 

## FIND-SPRINT-009-18
- **source:** TASK-032 (verifier)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** .soloflow/active/sprint.json
- **description:** TASK-032's verification ran against a working tree that a second task was concurrently writing to. `sprint.json` declares `execution_mode: "serial"` yet listed both `TASK-032: in_progress` and `TASK-033: in_progress` at the same time, and TASK-033's executor wrote `index.html`, `README.md`, `CODE-PATTERNS.md` and `CHANGELOG.md` into the shared checkout mid-verification (file mtimes 12:00:31–12:01:13, while the harness runs were still in flight). Verification only stayed sound by accident of timing: the fixture sandbox had been copied at 11:55 and every headless run finished at 11:59:08, and the sandbox was afterwards proven byte-identical to `HEAD` (modulo CRLF) for all five scanned files. Had the runs been sixty seconds later, the harness would have been asserting against TASK-033's uncommitted `align` work and the verdict would have been about code that was never in TASK-032's commits. This is especially sharp for this repo because every task owns `index.html`, so any overlap is a direct collision, and because the shipped guard fetches the *served* files rather than reading a snapshot — its results are a function of whatever is on disk at that instant.
- **suggested_action:** Either (a) have the verifier operate on a detached checkout of the task's terminal commit (`git worktree add` at the task SHA) rather than the live working tree, which also removes the CRLF-vs-`git show` comparison trap, or (b) make the orchestrator hold a task in `verifying` and refuse to start the next task's executor until the verdict lands when `execution_mode` is `serial`. Worth a line in CLAUDE.md / the orchestrator prompt: in a single-file repo, "serial" has to mean serial through verification, not just through execution.
- **resolved_by:** 

## FIND-SPRINT-009-19
- **source:** TASK-032 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:3368-3369 (grep `const ANCHOR_DOCS`, at 343e542)
- **description:** The anchor-drift section declares two parallel constants that must be hand-kept in sync: `ANCHOR_DOCS` (the list of scanned files) and `ANCHOR_FLOORS` (per-file minimum anchor counts, keyed by the same filenames). `ANCHOR_DOCS` is exactly `Object.keys(ANCHOR_FLOORS)` today. The two drift directions fail asymmetrically: adding a file to `ANCHOR_DOCS` only makes `ANCHOR_FLOORS[doc]` `undefined`, so `found.length >= undefined` is false and the row reddens with the label "carries at least undefined doc anchors" — loud but confusing; adding a file to `ANCHOR_FLOORS` only leaves the doc **silently unscanned**, with no row and no failure. That silent direction is the same vacuous-green class the floors themselves exist to close. The shape came from the plan's step 5 sketch, so it is inherited rather than introduced, and both constants are correct as shipped (floors match the observed counts exactly: README 2, CODE-PATTERNS 18, ARCHITECTURE 2, CLAUDE 1).
- **suggested_action:** Delete `ANCHOR_DOCS` and derive it — `const ANCHOR_DOCS = Object.keys(ANCHOR_FLOORS);` — so a scanned doc cannot exist without a floor and vice versa. One line, no behaviour change today.
- **resolved_by:** 

## FIND-SPRINT-009-20
- **source:** TASK-032 (code-reviewer)
- **type:** cleanup
- **severity:** medium
- **status:** open
- **location:** index.html:992-1003 (grep `TEMPLATE CONFIGS`, the banner comment above `const templates`)
- **description:** The `TEMPLATE CONFIGS` banner comment directly above the `templates` map is a second, competing copy of the brand-entry schema list, and it is stale in exactly the way TASK-032 just repaired in README. It documents 8 keys (`bannerImageUrl`, `bannerHref`, `ctaBackgroundColor`, `ctaTextColor`, `unsubscribeHtml`, `disclosureHtml`, `ctaMicrocopyFontSize`, `ctaMicrocopyColor`) and omits 5 live ones (`name`, `bannerAlt`, `bannerWidth`, `bannerHtml`, `bannerBackgroundColor`) — including two of the three keys this task added to README. This matters more than an ordinary stale comment because README's Templates section now points the reader *at this block* ("Scroll to the `TEMPLATE CONFIGS` block ... to edit them"), so a developer following the documented path lands on the stale list rather than the freshly-reconciled one, and because the new schema fixture polices only the README copy — nothing guards this one, so it will keep drifting. Out of diff: TASK-032 did not touch this region and no acceptance criterion covered it, so this is queued rather than raised against the task.
- **suggested_action:** Either (a) reduce the banner comment to a pointer — "Brand entry schema is documented in README.md's Templates section; every key on any entry must appear there (enforced by the harness's Documentation anchor drift guard)" — which removes the second copy entirely and is the lower-maintenance option, or (b) bring the comment back in sync and extend the schema fixture to assert the same key set against the fetched `index.html` banner-comment block so both copies are guarded. Prefer (a).
- **resolved_by:**

## FIND-SPRINT-009-21
- **source:** TASK-033 (verifier)
- **type:** improvement
- **severity:** low
- **location:** index.html:1250-1255 (the `ctaMicrocopyQuill` construction; no CSS rule targets `#ctaMicrocopy .ql-editor`)
- **status:** open
- **description:** TASK-033 centers the microcopy in the *output* but nothing centers it in the *compose panel*, so the CTA microcopy field is now the only editor in the app whose on-screen alignment disagrees with what it compiles to. Verified in a headless run against 341b5e1: typing "No cost, no obligation." leaves the Quill editor rendering flush-left (no `text-align` rule exists for `#ctaMicrocopy .ql-editor`, and Quill's default is inherited left) while the compiled cell is `align="center"` / `text-align:center`. The marketer is not blind to this — the preview iframe shows the true centered result — but the field they are typing into now lies about its own output, which is the kind of small divergence that generates "why does it move when I copy it out" support questions. Body copy has no such gap (left in both). Out of diff in the sense that the plan deliberately scoped the change to `richTextToMjText`/`buildMicrocopyBlock` and never mentioned editor chrome, so this is queued rather than raised against the task.
- **suggested_action:** Add a single CSS rule — `#ctaMicrocopy .ql-editor { text-align: center; }` — so the compose field previews its own alignment, and add a DOM guard to `MICROCOPY_DOM_GUARDS` asserting the computed `text-align` of `#ctaMicrocopy .ql-editor` matches the `align` value `buildMicrocopyBlock` passes, so the two cannot drift apart if the output alignment is ever changed or made brand-configurable.
- **resolved_by:**

## FIND-SPRINT-009-22
- **source:** TASK-033 (verifier)
- **type:** claude-md
- **severity:** medium
- **location:** .soloflow/active/plans/TASK-033-plan.md (step 9) vs .soloflow/active/findings/SPRINT-009-findings.md (FIND-SPRINT-009-11)
- **status:** open
- **description:** Findings whose `suggested_action` is addressed to "whichever task next owns file X" are not reaching the planner, so they silently expire. Concrete instance: FIND-SPRINT-009-11 says "In whichever task next owns CHANGELOG.md, add a 'Test harness Section 12' bullet to the 2026-08-12 dark-mode caption entry naming the four caption fixtures and stating the 11-13 to 13-15 renumbering." TASK-033 was that task — it owns CHANGELOG.md in `files_owned` and edited it — but the plan's step 9 reads only "Add a CHANGELOG.md entry," never referencing the queue, so the executor correctly implemented the plan and the finding stayed open with its dangling cross-reference intact. This is not a TASK-033 defect: executors work from plans, not from the findings queue. It is a routing gap, and it will keep recurring because file-scoped suggested_actions are a natural thing for verifiers and code-reviewers to write. Cost compounds: the deferred cleanup gets re-flagged every sprint while the file keeps being edited past it. TASK-033's own CHANGELOG entry also documents its two new fixtures inline in the Fixed paragraph rather than with the "Test harness Sections N" bullet every neighbouring entry uses, which is the same convention FIND-11 was pointing at.
- **suggested_action:** Have the planner grep the active findings file for `status: open` entries whose `location` or `suggested_action` names any file in the new task's `files_owned`, and either fold them into the plan's steps or state in the plan why they are being skipped. A one-line addition to the planner prompt plus a note in CLAUDE.md's conventions section ("a plan that owns a file should account for the open findings against that file") would close it.
- **resolved_by:** 
