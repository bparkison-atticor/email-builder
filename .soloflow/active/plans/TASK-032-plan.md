---
id: TASK-032
idea: SPRINT-006-007-compound
source_item: out-of-band (claude-md-reviewer)
status: ready
created: 2026-08-12T00:00:00Z
files_owned:
  - index.html
  - README.md
  - CODE-PATTERNS.md
  - ARCHITECTURE.md
  - CLAUDE.md
files_readonly:
  - CHANGELOG.md
  - .soloflow/active/plans/dark-mode-preview-hardening/TASK-029-plan.md
  - .soloflow/active/plans/cta-microcopy/TASK-028-plan.md
  - .soloflow/archive/compound/SPRINT-006-007-proposal.md
acceptance_criteria:
  - criterion: "README workflow step 1 no longer enumerates brand names; it points the reader at the template dropdown / the `templates` map instead."
    verification: "grep -n 'Postman Law / NDC' README.md returns 0 matches. Read the new step 1 — it names no individual brand, or names at most one prefixed by 'e.g.'."
  - criterion: "README's Templates section no longer states a brand count or a brand list, and names the `templates` map in index.html as the authoritative source."
    verification: "grep -rn 'Three brands' --include='*.md' . returns 0 matches outside .soloflow/ (pre-flight at plan time: README.md:114 is the only match outside .soloflow/). grep -n 'templates` map' README.md returns the new sentence."
  - criterion: "README's pointer to the TEMPLATE CONFIGS block uses the repo's grep-anchor convention, so it is covered by the new guard."
    verification: "grep -n 'TEMPLATE CONFIGS' README.md returns exactly one line, and it is written in the anchor form (the literal word grep followed by a backtick-delimited needle). grep -n 'TEMPLATE CONFIGS' index.html still returns its two banner-comment lines (index.html:29 and index.html:958 at plan time)."
  - criterion: "Every key present on at least one entry of the live `templates` map is documented in README's Templates bullet list."
    verification: "Derive the key set at execution time: read every entry of `const templates` in index.html and collect its keys. At plan time that set is: name, bannerImageUrl, bannerAlt, bannerWidth, bannerHref, bannerHtml, bannerBackgroundColor, ctaBackgroundColor, ctaTextColor, unsubscribeHtml, disclosureHtml — of which name, bannerHtml, and bannerBackgroundColor are absent from README today. For each key in the live set, grep -n '<key>' README.md returns at least one hit inside the Templates section. The new harness fixture named in the criterion below asserts the same property at runtime."
  - criterion: "A new harness section fetches README.md, CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and index.html over same-origin HTTP, extracts every grep-anchor needle from the four docs with a regex, and renders one PASS/FAIL row per unique needle asserting that the needle occurs at least once in index.html's fetched source."
    verification: "Serve the app, press Ctrl+Shift+T, scroll to the new section. There is one row per unique needle (19 at plan time: 18 occurrences in CODE-PATTERNS.md, 2 in ARCHITECTURE.md, 1 in CLAUDE.md, of which `const templates` and `function humanizeTemplateError` are each shared by two docs; plus 1 new README anchor = 20 unique after this task). Each row's label names the source doc(s) and the needle. Zero FAIL badges."
  - criterion: "No anchor needle is hardcoded as a literal anywhere in index.html — every needle is captured from the fetched markdown at runtime."
    verification: "Read the whole new harness block. No line inside it contains any of the needles the four docs use, and no line contains a backtick-delimited grep anchor. Mutation test: rename `function autoLinkPhones` to `function autoLinkPhoneNumbers` in index.html (and its call site). Exactly one row — the CODE-PATTERNS.md row for that needle — must go red. Revert. If the row stays green, the needle is being self-matched by the harness's own text and the guard is vacuous."
  - criterion: "The section defends against a vacuously-green guard with a per-file anchor floor: one row per scanned doc asserting its extracted anchor count is >= a constant recorded in index.html."
    verification: "Read the ANCHOR_FLOORS object in index.html. Each value equals that file's anchor count observed at execution time (`grep -o` the anchor form per file). Mutation test: delete every anchor from CLAUDE.md; that file's floor row must go red while all per-needle rows for the other docs stay green. Revert."
  - criterion: "A fetch failure (file:// origin, missing file, non-2xx) renders a single visible failing row explaining the cause, and does not throw, does not abort renderTestHarness(), and does not prevent any other section from rendering."
    verification: "Temporarily change one fetched path to a nonexistent file and reopen the harness: exactly one row appears in the new section, its Result text names the fetch failure and instructs the reader to serve over http://, and every other section still renders its full row set. Revert. Then open index.html directly from disk via file:// — same single row, no uncaught exception in the console."
  - criterion: "The section's rows are appended into a container element created synchronously during renderTestHarness(), so late-resolving fetches cannot append rows into a re-rendered harness."
    verification: "Read the code: the h3 and a container div are appended to `body` synchronously; the awaited continuation appends only into that captured container, never into `body`. Behavioural check: open the harness, press Ctrl+Shift+T twice more in rapid succession, then count rows in the new section — the count equals the fixture count exactly, with no duplicates and no rows appended below a later section."
  - criterion: "A fixture asserts that every key of the live `templates` map appears in the fetched README.md text, with the undocumented keys named in the row label when it fails."
    verification: "Read the fixture: it derives keys from `Object.values(templates)` (no hardcoded key list) and tests them against the fetched README string. Mutation test: add a throwaway key `zzTestKey: 'x'` to one brand entry; the row must go red and its label must name zzTestKey. Revert."
  - criterion: "CODE-PATTERNS.md documents the doc-anchor convention itself and names the harness section that enforces it, using a real live anchor as its example."
    verification: "Read the new CODE-PATTERNS.md entry. It states the anchor form, states that line-number pointers are not to be used, names the harness section, and its illustrative example is an anchor that resolves in index.html — not a placeholder such as a made-up function name. Confirm by reopening the harness: the example produces its own PASS row rather than a FAIL."
  - criterion: "ARCHITECTURE.md and CLAUDE.md are unmodified unless the new guard found an orphaned anchor in them."
    verification: "git diff --name-only lists index.html, README.md, CODE-PATTERNS.md and nothing else — unless the done report names the specific orphaned needle that forced an edit to ARCHITECTURE.md or CLAUDE.md."
  - criterion: "Every pre-existing harness row still shows PASS on a fresh load."
    verification: "Ctrl+Shift+T on a fresh page load with dark mode OFF: zero FAIL badges across every section, including TASK-029's Section 8 purity guard, TASK-030's Section 11 and TASK-031's Section 12."
depends_on: [TASK-031, TASK-028]
estimated_complexity: medium
epic: null
test_strategy:
  needed: true
  justification: "The deliverable is itself a test — a harness section. Its correctness is therefore only demonstrable by mutation: a guard that does not go red when the rot it guards against is introduced has not been built, only described. Three of this codebase's shipped guards have already failed exactly that way (FIND-SPRINT-007-7)."
  targets:
    - behavior: "Renaming an anchored identifier in index.html turns exactly the affected doc-anchor row red"
      test_file: "index.html"
      type: unit
    - behavior: "Stripping the anchors out of a scanned doc turns that file's floor row red rather than leaving the section vacuously green"
      test_file: "index.html"
      type: unit
    - behavior: "Adding an undocumented key to a templates entry turns the README schema row red and names the key"
      test_file: "index.html"
      type: unit
    - behavior: "An unreachable doc path renders one explanatory failing row instead of throwing and aborting the harness"
      test_file: "index.html"
      type: unit
---

# Guard documentation anchors against drift, and sweep README's stale brand claims

## Context

Commit `043ee5d` replaced every line-number pointer in CODE-PATTERNS.md, ARCHITECTURE.md and CLAUDE.md with greppable anchors — the literal form `grep` followed by a backtick-delimited needle (a function name, an element id, or a unique call expression). 19 unique needles exist across those three files today, and all 19 resolve in `index.html`. That commit also fixed two identifier rots: the docs named a `TEMPLATE_CONFIGS` object that never existed (the real map is `const templates`, index.html:969), and ARCHITECTURE.md claimed three brands ship when the map holds eight.

Two gaps remain.

**README.md was never swept.** `README.md:24` ("Pick template (Postman Law / NDC / Wettermark Keith)") and `README.md:114` ("Three brands are configured in `index.html`: Postman Law, National Disability Center, and Wettermark Keith") both enumerate a list that is five brands stale — the map holds `postmanLaw`, `nationalDisabilityCenter`, `kellerPostman`, `kellerPostmanLead`, `wettermarkKeith`, `nationalJusticeCenter`, `parrishDevaughn`, `kechesLead`. README:114's pointer to the `TEMPLATE CONFIGS` block is *not* rot — that banner comment exists verbatim at index.html:29 and index.html:958. The schema bullet list under README:114 is also stale in a quieter way: it omits `name`, `bannerHtml` and `bannerBackgroundColor`, all three of which are live keys (`bannerHtml` + `bannerBackgroundColor` drive the wordmark brands at index.html:1027, :1064, :1099, and are read by `buildMjml()` at index.html:1602-1606).

**Nothing prevents the next rot.** Anchors survive line drift but still break on an identifier rename — precisely what `TEMPLATE_CONFIGS` → `templates` did, sitting wrong in two docs across several sprints. Enumerated facts rot when the data grows. The rot was only ever caught because a reviewer happened to sweep during a compound run. This task converts that accident into a same-day harness failure.

## Objective

Rewrite README's two brand enumerations into non-rotting phrasing, bring its template-schema list back in sync with the live `templates` map, and add a harness section that fetches the four markdown docs plus `index.html`, extracts every grep anchor at runtime, and asserts each one still resolves — so that an identifier rename which orphans a doc anchor turns the harness red immediately instead of two sprints later.

## Dependency and section-number preconditions

`depends_on: [TASK-031, TASK-028]` — the terminal task of each pending epic. Both edges are load-bearing, and neither costs parallelism (every task in this repo owns `index.html`, so nothing here runs concurrently anyway):

- **TASK-031** (via TASK-030 → TASK-029) gives us `renderPredicateFixtures(body, fixtures, failText)`. Without it this section pastes a sixth copy of the row loop that TASK-029 exists to delete. TASK-031 also occupies Section 12.
- **TASK-028** is the cta-microcopy epic's documentation task. It owns `README.md`, `CODE-PATTERNS.md` and `ARCHITECTURE.md`, adds `ctaMicrocopyFontSize` / `ctaMicrocopyColor` to all eight brand entries, and adds three harness sections. Landing this guard *before* it would turn the harness red between TASK-027 (adds the keys) and TASK-028 (documents them), breaking intermediate tasks' "every row still PASSes" criteria through no fault of their own.

Before writing any code:

1. `grep -n 'renderPredicateFixtures' index.html` — must return the declaration plus its existing call sites. **If it returns 0 matches, TASK-029's extraction did not land: stop and report BLOCKED.** Do not hand-roll a replacement row loop.
2. `grep -n '// --- Section ' index.html` — read off the highest existing section number and use the next one. This plan writes `Section 13` in its sketches because that is the number after TASK-031's Section 12, but TASK-028's epic adds three sections of its own; **use whatever number is actually free and keep the new section last in `renderTestHarness()`.**
3. `grep -n 'Three brands' README.md` — TASK-028 step 4 lists correcting this line as *optional*. If it already returns 0 matches, verify the replacement text against the live map and move on to the schema list, which TASK-028 does not fully cover.

## Implementation Steps

1. **Completeness gate — run first, and re-run before reporting COMPLETED.** These are the counts every criterion below is measured against:
   ```
   grep -rn "Three brands" --include="*.md" .          # expect README.md only (outside .soloflow/) before; 0 outside .soloflow/ after
   grep -n "Postman Law / NDC" README.md               # expect 1 before, 0 after
   grep -n "TEMPLATE CONFIGS" README.md index.html     # expect README 1 + index.html 2, before and after
   grep -o "grep \`[^\`]*\`" CODE-PATTERNS.md ARCHITECTURE.md CLAUDE.md README.md   # per-file anchor counts -> ANCHOR_FLOORS
   ```
   `.soloflow/**` is an immutable historical record — matches there are expected and must not be edited. The last command's per-file counts are the values you write into `ANCHOR_FLOORS`; at plan time they are CODE-PATTERNS.md 18, ARCHITECTURE.md 2, CLAUDE.md 1, README.md 0 (1 after step 3).

2. **README workflow step 1** (`README.md:24`). Replace the parenthetical brand list. New text: *"Pick a brand template from the dropdown — the list is built from the `templates` map in `index.html`."* No brand names. Do not renumber anything else in the list.

3. **README Templates section opener** (`README.md:114`). Replace the first sentence with a non-rotting pointer plus the anchor form, e.g.:

   > Brand templates live in the `templates` map in `index.html` — that map is the authoritative list, and the template dropdown is built from it. To edit or add a brand, grep `TEMPLATE CONFIGS` for the banner comment above the map. Each brand entry has:

   The anchor must be written in the same form the three dev docs use (the literal word `grep` followed by the needle in backticks) — that is what makes README a scanned doc for the new guard, and why `ANCHOR_FLOORS['README.md']` is 1 rather than 0. Keep the existing "To add a new brand: copy one of the existing entries…" line at the end of the section.

4. **README schema bullet list.** Reconcile the bullets against the live map. Add the three missing keys, and mark which are optional:
   - `name` — the label shown in the template dropdown.
   - `bannerHtml` — inline HTML banner (a text wordmark or a hand-sized `<img>`), used *instead of* `bannerImageUrl` / `bannerAlt` / `bannerWidth`. `buildMjml()` prefers it when present.
   - `bannerBackgroundColor` — background behind the banner block; pairs with `bannerHtml`.

   Keep the existing eight bullets. Do not delete `ctaMicrocopyFontSize` / `ctaMicrocopyColor` if TASK-028 has already added them. The end state is the invariant asserted by the harness fixture in step 8: **every key on any brand entry appears in this list.**

5. **Add the harness section shell.** At the end of `renderTestHarness()`, after the last existing section's `renderPredicateFixtures(...)` call and before the closing brace (currently `index.html:2671`, which will have moved):

   ```js
   // --- Section 13: documentation anchor drift guard (TASK-032) ---
   // The dev docs point at code with greppable anchors instead of line
   // numbers. This section fetches the docs, extracts every needle at
   // runtime, and asserts each one still resolves in index.html.
   //
   // DO NOT write any anchor needle as a literal anywhere in this file.
   // The guard asserts "needle occurs in index.html's source" — a needle
   // quoted here would match itself and pass forever regardless of the
   // real code. That is the FIND-SPRINT-007-7 vacuous-pass trap, and it
   // is why every needle below is captured from the fetched markdown.
   const ANCHOR_DOCS = ['README.md', 'CODE-PATTERNS.md', 'ARCHITECTURE.md', 'CLAUDE.md'];
   const ANCHOR_FLOORS = { 'README.md': 1, 'CODE-PATTERNS.md': 18, 'ARCHITECTURE.md': 2, 'CLAUDE.md': 1 };

   const h13 = document.createElement('h3');
   h13.style.cssText = 'margin:12px 0 4px;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)';
   h13.textContent = 'Documentation anchor drift guard';
   body.appendChild(h13);
   // Container captured synchronously. The awaited continuation appends
   // only into this element, never into `body` — so if the harness is
   // re-rendered while a fetch is in flight, the late rows land in a
   // detached node and are simply never seen, instead of appending
   // themselves to the bottom of a fresh run.
   const anchorSection = document.createElement('div');
   body.appendChild(anchorSection);
   ```
   Update `ANCHOR_FLOORS` to the counts you observed in step 1 — do not ship the plan-time numbers unverified.

6. **Fetch the sources.** Immediately after the shell, an async IIFE. `renderTestHarness()` stays synchronous; nothing awaits this.

   ```js
   (async () => {
     const paths = ANCHOR_DOCS.concat(['index.html']);
     let sources;
     try {
       const texts = await Promise.all(paths.map(async (p) => {
         const res = await fetch(p, { cache: 'no-store' });
         if (!res.ok) throw new Error(p + ' -> HTTP ' + res.status);
         return res.text();
       }));
       sources = Object.fromEntries(paths.map((p, i) => [p, texts[i]]));
     } catch (err) {
       renderPredicateFixtures(anchorSection, [{
         label: 'Read the doc sources over HTTP',
         check() { return false; },
         description: 'Could not read the docs (' + String((err && err.message) || err) + '). This section needs the app served over http:// — see README "How to run". It cannot run from a page opened directly off disk.',
       }], 'SKIPPED — serve over http:// and reopen the harness (Ctrl+Shift+T)');
       return;
     }
     // ... steps 7-8 build `fixtures` here ...
     renderPredicateFixtures(anchorSection, fixtures);
   })();
   ```
   `cache: 'no-store'` matters: a cached `index.html` older than the running page would make this guard assert against source the user is not looking at. The `catch` must swallow everything — a rejected fetch inside a fire-and-forget IIFE otherwise surfaces as an unhandled rejection and the section renders nothing at all.

7. **Extract needles and build the anchor + floor fixtures.**

   ```js
   const src = sources['index.html'];
   const fixtures = [];
   const seen = new Map(); // needle -> [docs that carry it]

   for (const doc of ANCHOR_DOCS) {
     // Fresh regex per iteration — a /g regex hoisted out of the loop is
     // stateful (see the PHONE_REGEX gotcha in CODE-PATTERNS.md).
     const found = [...sources[doc].matchAll(/grep\s+`([^`\n]+)`/g)].map(m => m[1]);
     fixtures.push({
       label: doc + ': carries at least ' + ANCHOR_FLOORS[doc] + ' doc anchors (found ' + found.length + ')',
       check: () => found.length >= ANCHOR_FLOORS[doc],
       description: 'Floor check. Without it, a doc rewrite that silently drops the anchor convention would leave this whole section vacuously green — every per-needle row below would simply stop existing. If you removed an anchor deliberately, lower this file\'s value in ANCHOR_FLOORS in the same commit.',
     });
     for (const needle of found) {
       if (!seen.has(needle)) seen.set(needle, []);
       seen.get(needle).push(doc);
     }
   }

   for (const [needle, docs] of seen) {
     fixtures.push({
       label: docs.join(' + ') + ' -> ' + needle,
       check: () => src.includes(needle),
       description: 'The doc anchor must occur at least once in index.html. A FAIL means the identifier was renamed or deleted and the doc now points at nothing — fix the doc (or restore the identifier) in the same commit.',
     });
   }
   ```
   `renderPredicateFixtures` already runs `escapeHtml` over `label` and `description`, so needles containing `"`, `<` or `'` render safely.

8. **Add the templates-schema fixture** to the same array, before the `renderPredicateFixtures` call:

   ```js
   const tplKeys = [...new Set(Object.values(templates).flatMap(t => Object.keys(t)))];
   const undocumented = tplKeys.filter(k => !sources['README.md'].includes(k));
   fixtures.push({
     label: 'README documents every key used by the templates map'
       + (undocumented.length ? ' — undocumented: ' + undocumented.join(', ') : ''),
     check: () => undocumented.length === 0,
     description: 'The schema list under README\'s Templates section must name every key present on any brand entry. Adding a key to a brand without documenting it turns this row red. Keys are read from the live `templates` object, so this cannot go stale.',
   });
   ```
   `templates` is module-scope (`index.html:969`) and in scope here. No key list is hardcoded, so the fixture tracks the map automatically.

9. **Document the convention in CODE-PATTERNS.md.** Add a short entry under *Recurring Patterns* (or a new `## Documentation Conventions` heading, your choice — keep it above the `/sf:compound` footer):

   > **Doc anchors, not line numbers.** CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and README.md point at code with a greppable needle in the form grep `function wireSegControl` — a function name, an element id, or a unique call expression. Line-number pointers rot silently and were all removed in commit 043ee5d after drifting 400–1500 lines. Anchors still break when an identifier is renamed, so the Ctrl+Shift+T harness's *Documentation anchor drift guard* section extracts every anchor from these four files at runtime and fails if one no longer resolves in `index.html`. When you rename an anchored identifier, update the doc in the same commit.

   **The example must be a live anchor** (`function wireSegControl` resolves at index.html:1357). A placeholder such as `function myFunction` would be extracted by the guard and immediately fail — the doc-about-the-convention is itself scanned by the convention's guard. Note also that this entry raises CODE-PATTERNS.md's anchor count by one; set `ANCHOR_FLOORS['CODE-PATTERNS.md']` to the post-edit count.

10. **Verify and mutation-test.** Serve with `python -m http.server 8080 --bind 127.0.0.1`, load the app, press Ctrl+Shift+T on a fresh load. Confirm zero FAIL badges across every section and one row per unique needle in the new section. Then run each mutation named in the acceptance criteria — rename `function autoLinkPhones`; strip CLAUDE.md's anchors; add a `zzTestKey` to a brand entry; point one fetched path at a nonexistent file — confirming the intended row (and only that row) goes red each time, and reverting after each. Finally re-run the step 1 greps.

## Acceptance Criteria

Each frontmatter criterion is pass/fail as written. The mutation tests in criteria 6, 7 and 10 are the load-bearing ones: this task's entire product is a guard, and a guard that stays green when the rot it names is introduced has not been built. If the anchor-rename mutation leaves the section fully green, the needle is being self-matched inside `index.html` — fix that before reporting COMPLETED, regardless of what the other criteria say.

## Test Strategy

The harness is the only test surface in this repo (`CODE-PATTERNS.md`: *no test runner in use*), and here it is also the deliverable. Every target is therefore a mutation, run manually against a served page:

- **Anchor rename** (`index.html`, unit) — rename `function autoLinkPhones` and its call site inside `richTextToMjText()`. Exactly one row goes red, and its label names CODE-PATTERNS.md and the orphaned needle. Revert.
- **Convention drop** (`index.html`, unit) — delete the single anchor from CLAUDE.md. That file's floor row goes red; no per-needle row for the other three docs is affected. This is the check that stops a doc rewrite from producing a green section with nothing in it. Revert.
- **Undocumented brand key** (`index.html`, unit) — add `zzTestKey: 'x'` to `postmanLaw`. The schema row goes red and names `zzTestKey`. Revert.
- **Unreachable doc** (`index.html`, unit) — point one entry of `ANCHOR_DOCS` at a nonexistent filename. Exactly one explanatory row renders, no exception reaches the console, and every other harness section still renders in full. Revert.

No mocking or fixture files: the inputs are the repo's own files, fetched live. That is the point — a guard against doc rot that reads a snapshot of the docs would rot alongside them.

## Out of Scope

- **`.soloflow/**`.** Archives, plans and findings are an immutable historical record. They contain anchor-shaped text (`SPRINT-006-007-proposal.md:476`, `TASK-030-plan.md:240-242`) and stale brand claims (`IDEA-004.md:177`); none of it is swept, and `ANCHOR_DOCS` deliberately lists four explicit filenames rather than globbing markdown.
- **`CHANGELOG.md`.** Owned by both TASK-028 and TASK-031, and this task's changes are a doc sweep plus a dev-only harness section — neither is a marketer-visible release note. If a future reader disagrees, add it in the next compound run's doc pass.
- **Anchors that point at files other than `index.html`.** Every anchor today resolves in `index.html`, which is the whole app. If a doc ever anchors into `Email Builder.bat` or a future file, this guard reports it as orphaned; generalising the target set is a change to make when that actually happens, not now.
- **A machine-checked "no brand enumeration" rule for README.** Step 2 and 3 remove the two enumerations; nothing stops a future editor writing a new one. Detecting "prose that lists brands" is not a check with a clean predicate, and a false-positive-prone guard is worse than none. The templates-key fixture covers the schema half, which is the half that has a crisp invariant.
- **Section renumbering or restructuring of existing harness sections.** Append only.
- **The three docs' prose.** ARCHITECTURE.md and CLAUDE.md are in `files_owned` solely so the executor can repair an anchor the new guard reports as orphaned. Any other edit to them is out of scope and must be reported.

## Hardest Decision

Whether to depend on the two epic-terminal tasks (TASK-031 and TASK-028) or ship independently. **Decision: depend on both.**

The TASK-031 edge is the easy half — TASK-029's `renderPredicateFixtures` is exactly the helper this section wants, and running first would mean pasting the sixth copy of a loop that TASK-029 exists to delete, then leaving TASK-029 to de-duplicate a section it never saw. It also settles the section number.

The TASK-028 edge is the interesting one, and it is about *guard timing rather than code*. The templates-schema fixture asserts that README documents every live brand key. The cta-microcopy epic adds `ctaMicrocopyFontSize` / `ctaMicrocopyColor` to all eight brand entries in TASK-025-027 and documents them in TASK-028. Landing this guard first means the harness is legitimately red for the duration of three tasks that each carry an "every harness row still shows PASS" criterion — the guard would be correct and the tasks would be blocked by it. Ordering after TASK-028 costs nothing real (every task in this single-file repo serialises on `index.html` anyway) and avoids manufacturing a false blocker for an unrelated epic.

The cost is that this task now sits behind seven others and cannot start until both epics land. I accepted that because a doc-drift guard has no urgency gradient — it protects against rot measured in sprints — and because a guard that goes red on correct in-flight work is the fastest way to teach a developer to ignore the harness.

## Rejected Alternatives

- **Depend on nothing and inline the row loop.** Cheapest to write, and the compound proposal's own fallback. Rejected for the reasons above. Would change my mind: TASK-029 being cancelled, at which point inlining is the only option and the loop should be copied verbatim from Section 10.
- **A real SKIP visual state** (a third row class alongside `pass` / `fail`). Cleaner semantically for the fetch-failure case, but it requires new CSS and a signature change to `renderPredicateFixtures` — a helper TASK-029 has just extracted and TASK-030/031 both build on. Passing a custom `failText` gets 90% of the value for zero structural risk: the badge reads FAIL, the Result line reads `SKIPPED — serve over http://`. Would change my mind: a second section needing SKIP semantics, which would make the CSS pay for itself.
- **Reading `document.documentElement.outerHTML` instead of fetching `index.html`.** Avoids one fetch and works from `file://`. Rejected because it is a serialisation of the parsed DOM, not the source — attribute quoting is normalised, HTML comments survive but the pre-parse byte sequence does not, and anchors like an element id would be matched against a string the developer cannot grep. Since the markdown docs must be fetched regardless, and a `file://` origin blocks *those* fetches anyway, the DOM fallback would buy nothing: the section cannot run off disk either way.
- **Making `renderTestHarness()` async and awaiting the fetches before rendering anything.** Simpler control flow, but it delays every existing section behind network I/O and turns a hung request into an empty harness. The synchronous-container-capture pattern keeps Sections 1-12 instant and confines all latency to the one section that needs it.
- **A global anchor floor instead of per-file floors.** One constant, less bookkeeping. Rejected: a global floor is satisfiable by adding anchors to a different file, so the exact failure it exists to catch — one doc getting rewritten and losing the convention — can be masked. Per-file floors cost three extra rows and close that hole.
- **Re-pinning README to "eight brands".** The straightforward fix, and it is wrong on exactly the axis this task is about: it rots on the next brand add, which is the single most likely future edit to that map. Pointing at the map costs the reader one lookup and cannot go stale.
- **Regenerating README's brand list at build time.** There is no build step, and CODE-PATTERNS.md forbids introducing one.

## Lowest Confidence Area

**The `ANCHOR_FLOORS` constants are a maintenance tax with a failure mode pointing the wrong way.** Deliberately removing an anchor — deleting a stale CODE-PATTERNS entry, say — turns the harness red until someone edits a number in `index.html`. That is intended friction, and the fixture description says so, but the first developer to hit it will experience it as the guard being wrong rather than as a prompt. If it produces more noise than signal over two or three sprints, the honest fix is to drop the floors to `>= 1` per file, keeping only the "this doc lost the convention entirely" detection and giving up the "this doc lost *some* anchors" detection.

Secondary, and more likely to bite first: **the floors are being set against docs that two pending tasks will rewrite.** TASK-030 rewrites CODE-PATTERNS.md's `createModuleToggle` entry and TASK-028 rewrites its `richTextToMjText` entry — either could add or drop an anchor. That is precisely why step 1 makes the executor recount rather than trusting this plan's numbers, but it does mean the plan-time count of 18 for CODE-PATTERNS.md should be treated as an estimate, not a fact.

Third: **the self-match trap is guarded by a mutation test and a comment, not by the code.** Nothing structurally prevents a future editor from writing an anchor needle into a comment in `index.html` and quietly making one row vacuous. Stripping the section's own line range out of `src` before matching was considered and rejected as more fragile than the thing it protects (it needs the section's own boundaries, which move). The comment at the top of the block is the whole defence.
