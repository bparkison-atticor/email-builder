---
id: TASK-041
title: Harden production localStorage access behind readStoredValue/writeStoredValue
idea: SPRINT-009-proposal
source_finding: FIND-SPRINT-009-7 (TASK-030 verifier)
status: ready
created: 2026-08-21T00:00:00Z
epic: null
depends_on: []
files_owned:
  - index.html
  - CODE-PATTERNS.md
files_readonly:
  - ARCHITECTURE.md
  - .soloflow/active/findings/SPRINT-009-findings.md
acceptance_criteria:
  - criterion: "Two named storage helpers exist and are the only production path to localStorage reads/writes"
    verification: "grep `function readStoredValue` and grep `function writeStoredValue` in index.html each return exactly one definition. Then run `grep -n 'localStorage\\.' index.html` and confirm every match whose line number falls OUTSIDE the renderTestHarness body is one of: the two helper bodies, or the four lines of the one-time testDataEnabled migration shim. No other production line touches localStorage directly."
  - criterion: "createModuleToggle no longer reads or writes localStorage directly"
    verification: "In the createModuleToggle body (grep `function createModuleToggle`), the `stored` initialiser reads `persist ? readStoredValue(key) : null` and flip()'s persistence line reads `if (persist) writeStoredValue(key, String(state));`. grep -c 'localStorage' within the factory body returns 0."
  - criterion: "A browser that throws on localStorage.getItem still boots the app fully"
    verification: "Open the harness over http:// (Ctrl+Shift+T). The three new STORAGE_HARDENING_FIXTURES rows under the 'Module toggle factory — persistence opt-out' heading all read PASS. These fixtures stub Storage.prototype around a live createModuleToggle call and a live loadTestData() call, which is the only way to observe the degradation without a hostile browser profile."
  - criterion: "The three existing persistence probes (A/B/C) still read PASS and were not routed through the helpers"
    verification: "The MODULE_TOGGLE_FIXTURES entries for __harnessProbeA/B/C still call localStorage.getItem/setItem/removeItem directly (grep `emailBuilder.module.__harnessProbeA` and read the surrounding check bodies). All three rows read PASS. Routing them through the swallowing helpers would make them vacuous."
  - criterion: "Every other harness row still reads PASS"
    verification: "Serve over http://, press Ctrl+Shift+T, and confirm every row in every section reads PASS — including Section 3's clearPromoFields localStorage snapshot row and the Documentation anchor drift guard (which must resolve the new CODE-PATTERNS.md anchor)."
  - criterion: "CODE-PATTERNS.md documents the helpers and corrects the createModuleToggle persistence claim"
    verification: "CODE-PATTERNS.md contains a `### readStoredValue / writeStoredValue` entry under `## Shared Utilities` whose Location line is grep `function readStoredValue`, and the existing `### createModuleToggle` 'Gotcha — persistence' bullet now states that persistence is best-effort. The anchor drift guard section is green (ANCHOR_FLOORS['CODE-PATTERNS.md'] is a floor of 18; adding anchors only raises the count)."
estimated_complexity: medium
test_strategy:
  needed: true
  justification: "The change converts an abort-on-throw path into a degrade-gracefully path. That behavior is invisible in normal browsing and only observable by making storage throw, so it needs its own fixtures — the harness is this project's only test surface."
  targets:
    - behavior: "createModuleToggle yields a usable, clickable toggle at defaultOn when localStorage.getItem throws"
      test_file: "index.html"
      type: integration
    - behavior: "Flipping a persisting toggle when localStorage.setItem throws still updates in-memory state and the DOM, and persists nothing"
      test_file: "index.html"
      type: integration
    - behavior: "loadTestData survives a throwing storage read and falls back to the SAMPLE_TEST_DATA seed"
      test_file: "index.html"
      type: integration
---

# Harden production localStorage access behind readStoredValue/writeStoredValue

## Objective

`createModuleToggle` reads storage at `const stored = persist ? localStorage.getItem(key) : null;` and writes it inside `flip()` at `if (persist) localStorage.setItem(key, String(state));` — both unguarded. In a browser that throws on storage access (blocked site data, hardened profile, extension stub), the first of those reads happens at the `createModuleToggle('testData', …)` call site during module init, which aborts the remaining ~400 lines of the init sequence: no toggles, no render, dead app. The migration shim ten lines above the factory was already hardened with a try/catch for exactly this hazard, so the file currently acknowledges the risk in one place and ignores it in two others. Hardening only the factory would not deliver a booting app either: `loadTestData()` runs at the tail of init with the same unguarded read, and the `els.testData` input listener writes unguarded on every keystroke. This task introduces one named read/write helper pair, routes all four production call sites through it, and adds three harness fixtures that stub `Storage.prototype` to prove the degradation actually works.

## Implementation Steps

1. **Add the helper pair.** Immediately above `function loadTestData()` (grep `function loadTestData`), add two module-scope function declarations:

   ```js
   // Storage access is best-effort. A hardened browser profile, blocked site
   // data, or an extension stub can make any localStorage call throw, and an
   // unguarded throw during module init aborts the rest of the script — no
   // toggles, no render. Every PRODUCTION read/write goes through these two
   // helpers: a failed read is indistinguishable from an absent key, and a
   // failed write is a silent no-op.
   //
   // The Ctrl+Shift+T harness fixtures deliberately call localStorage
   // directly. They assert real persistence behaviour and would be vacuous
   // if routed through a swallowing helper — do not "clean them up".
   function readStoredValue(key) {
     try {
       return localStorage.getItem(key);
     } catch {
       return null;
     }
   }

   function writeStoredValue(key, value) {
     try {
       localStorage.setItem(key, value);
       return true;
     } catch {
       return false;
     }
   }
   ```

   Use `function` declarations, not `const` arrow functions — they hoist to module scope, so ordering against the migration shim at module top level cannot bite. `writeStoredValue`'s boolean return is informational; no current caller reads it.

2. **Convert `createModuleToggle`'s read.** In the factory (grep `function createModuleToggle`), change `const stored = persist ? localStorage.getItem(key) : null;` to `const stored = persist ? readStoredValue(key) : null;`. Do not change the `stored === null ? defaultOn : stored !== 'false'` branch below it — a swallowed read now lands on the same `defaultOn` path a missing key already took, which is the intended degradation.

3. **Convert `createModuleToggle`'s write.** In `flip()`, change `if (persist) localStorage.setItem(key, String(state));` to `if (persist) writeStoredValue(key, String(state));`. Leave `sync()` and `onChange(state)` after it untouched: the point is that a failed write no longer prevents them from running.

4. **Update the factory's header comment.** The block comment above the factory currently states that state "persists under `emailBuilder.module.<id>` in localStorage unless `persist` is false". Append one sentence: persistence is best-effort — when the storage layer throws, the read degrades to `defaultOn` and the write is a silent no-op, and the toggle remains fully functional for the session (grep `function readStoredValue`). Keep the existing `persist: false` guidance verbatim.

5. **Convert `loadTestData`'s read.** Change `const stored = localStorage.getItem(TEST_DATA_STORAGE_KEY);` to `const stored = readStoredValue(TEST_DATA_STORAGE_KEY);`. The existing `stored !== null` branch already falls back to `JSON.stringify(SAMPLE_TEST_DATA, null, 2)`, so a swallowed read seeds the sample JSON — which is the correct behaviour, not an error state.

6. **Convert the test-data input listener's write.** In the `els.testData.addEventListener('input', …)` handler, change `localStorage.setItem(TEST_DATA_STORAGE_KEY, els.testData.value);` to `writeStoredValue(TEST_DATA_STORAGE_KEY, els.testData.value);`. Without this, every keystroke in the JSON textarea throws in a hostile browser and `scheduleRender()` on the line below never runs.

7. **Leave the migration shim's try/catch in place, and say why.** Do NOT convert the one-time `emailBuilder.testDataEnabled` shim to helper calls. Its read-copy-remove sequence must be guarded *as a unit*: with independent swallowing helpers, a failed `writeStoredValue` would be followed by a successful `removeItem`, destroying the legacy value it was trying to preserve. Add one comment line above the shim's `try {` recording that reason and pointing at `readStoredValue` as the canonical mechanism for everything else. Do not add a `removeStoredValue` helper — the shim is its only would-be caller and this is precisely why it should not have one.

8. **Add the harness fixtures.** In `renderTestHarness()`, Section 11 (grep `Module toggle factory — persistence opt-out`), add a new array `STORAGE_HARDENING_FIXTURES` immediately after the existing `MODULE_TOGGLE_FIXTURES` array literal, and a second `renderPredicateFixtures(body, STORAGE_HARDENING_FIXTURES);` call immediately after the existing `renderPredicateFixtures(body, MODULE_TOGGLE_FIXTURES);` call. **Do not add an `<h3>` header and do not reword the existing one** — Section 14 already establishes the precedent of multiple fixture arrays under one heading, and TASK-035 owns every header block in this function. Three fixtures:

   - **Read throws.** Save `Storage.prototype.getItem`, replace it with a thrower, build `createModuleToggle('__harnessProbeD', 'probe', true, () => {})` (persisting — the default), assert the element carries `class="module-toggle"`, `role="switch"`, `aria-checked="true"` and `isOn() === true`, then `element.click()` and assert `isOn() === false` and `aria-checked === "false"`. Restore `Storage.prototype.getItem` and `localStorage.removeItem('emailBuilder.module.__harnessProbeD')` in a `finally`. Note the click's write is *not* stubbed and really persists, which is why the key must be removed.
   - **Write throws.** `localStorage.removeItem` the probe key, save and stub `Storage.prototype.setItem`, build `createModuleToggle('__harnessProbeE', 'probe', false, () => {})`, `element.click()`, restore `setItem` in a `finally`, then assert `isOn() === true`, `element.classList.contains('on')`, `aria-checked === "true"`, and `localStorage.getItem(key) === null` (nothing was persisted). Remove the key in a second `finally`.
   - **loadTestData survives.** Capture `els.testData.value`, stub `Storage.prototype.getItem` to throw, call `loadTestData()`, assert `els.testData.value === JSON.stringify(SAMPLE_TEST_DATA, null, 2)` and `testDataValid === true`. In the `finally`: restore `getItem`, restore the captured value, and call `parseTestData()` — that re-restores the `testData` object, `testDataValid`, and the `#testDataHint` text, following Section 3's snapshot-and-restore precedent.

   Stub via `Storage.prototype`, never `localStorage.getItem = …`. `localStorage` is a `Storage` instance with a named-property setter, so assigning an own property routes through that setter and writes a storage *item* called `getItem` instead of shadowing the method — which both fails to produce the intended throw and pollutes storage. `Storage.prototype` is an ordinary object; assigning to it is reliable and affects the `localStorage` instance.

   Each fixture's `description` must name the deciding construct (`readStoredValue` / `writeStoredValue`) per CODE-PATTERNS.md's behavioral-claims convention.

9. **Document the helpers.** In CODE-PATTERNS.md, add `### readStoredValue / writeStoredValue` under `## Shared Utilities`, positioned between `### createModuleToggle` and `### injectPreviewStyle`. Include: Location (grep `function readStoredValue`); Use it for (every production localStorage read/write); Canonical example (grep `readStoredValue(` for the call sites — the module toggle factory and `loadTestData`); **Gotcha — a swallowed read is indistinguishable from an absent key**, so callers must have a sensible default-on-null path; **Gotcha — the migration shim deliberately keeps its own unit-scoped try/catch** because splitting it into helper calls would remove the legacy key even when the copy failed; **Gotcha — harness fixtures bypass the helpers on purpose** and must keep doing so.

10. **Correct the persistence gotcha.** In CODE-PATTERNS.md's `### createModuleToggle` entry, extend the "Gotcha — persistence" bullet: persistence is best-effort; a storage layer that throws degrades the toggle to `defaultOn` and stops persisting silently rather than aborting module init (grep `function readStoredValue`). Do not touch the `persist: false` half of that bullet — it is still exactly true.

11. **Final gate.** Serve over http://, open Ctrl+Shift+T, confirm every row in every section reads PASS, including the three new ones and the Documentation anchor drift guard. Then flip the CTA and Promo toggles, reload, and confirm the states survived — proving the helper conversion did not break the happy path.

## Acceptance Criteria

- **One mechanism, one place.** PASS = single definitions of `readStoredValue` and `writeStoredValue`; every non-harness `localStorage.` match in `index.html` is inside one of those two bodies or inside the migration shim's try block. FAIL = any other production line calling `localStorage` directly.
- **Factory hardened.** PASS = the factory body contains zero `localStorage` references and reads/writes via the helpers. FAIL = either call site unconverted.
- **Init path hardened.** PASS = `loadTestData`'s read and the test-data input listener's write both go through the helpers. FAIL = either left raw, because either one alone still kills init or every keystroke.
- **Degradation proven.** PASS = the three new fixture rows read PASS. FAIL = any of them red, or the harness blanking (which would mean a stub escaped its `finally`).
- **Existing probes still meaningful.** PASS = `__harnessProbeA/B/C` still call `localStorage` directly and still read PASS. FAIL = any of them routed through the helpers (silently vacuous) or reddened.
- **Docs corrected.** PASS = the new CODE-PATTERNS.md entry with a resolving grep anchor, the amended persistence gotcha, and a green anchor drift guard.
- **Happy path intact.** PASS = toggle states survive a reload.

## Verification

Run in order:

1. `grep -n 'localStorage\.' index.html` — inspect every match. Matches with line numbers inside the `renderTestHarness` body (derive its bounds with `grep -n 'function renderTestHarness(' index.html`) are expected and must remain raw. Every match outside it must be inside `readStoredValue`, `writeStoredValue`, or the migration shim.
2. `grep -n 'function readStoredValue\|function writeStoredValue\|readStoredValue(\|writeStoredValue(' index.html` — expect two definitions and four call sites (factory read, factory write, `loadTestData`, input listener).
3. `python -m http.server 8080 --bind 127.0.0.1`, open the app, press Ctrl+Shift+T. Every row in every section PASS.
4. Toggle CTA off, reload — CTA stays off. Toggle Dark mode on, reload — Dark mode returns off (it is `persist: false`; existing probes A/B cover this, this is the eyeball confirmation).
5. Type into the test-data JSON textarea, reload — the edit survived.

## Test Strategy

All three targets are harness fixtures in `index.html`, appended to Section 11 as `STORAGE_HARDENING_FIXTURES` and rendered by a second `renderPredicateFixtures` call under the existing heading. No new section header, so the diff does not collide with TASK-035's header extraction.

The only mocking is a synchronous save-stub-restore of `Storage.prototype.getItem` / `Storage.prototype.setItem` around a single factory or `loadTestData` call, always restored in a `finally`. `renderPredicateFixtures` already wraps `check()` in try/catch, so even a fixture that throws mid-stub renders as one FAIL row rather than blanking the harness — but the `finally` is still mandatory, because a leaked prototype stub would break every row after it and the rest of the app.

Fixture 3 mutates live app state (`els.testData.value`, `testData`, `testDataValid`, `#testDataHint`) and restores it by reassigning the captured value and re-running `parseTestData()`. This follows Section 3's existing seed-and-restore discipline; the restore must be in the `finally`, not after the `return`.

## Hardest Decision

Whether to convert the migration shim to the new helpers. Unifying on one mechanism is the obvious reading of the finding — the file is "inconsistent about a risk it has already acknowledged once" — but converting it is a data-loss bug. The shim reads the legacy key, writes it to the new key, then removes the legacy key; with independent swallowing helpers, a write that silently fails is still followed by a successful remove, and the user's pre-TASK-014 preference is gone. The shim genuinely needs its whole sequence guarded as one unit. So the inconsistency is resolved by making the difference *explicit and justified in a comment* rather than by unifying the mechanism, and no `removeStoredValue` helper is added — its only would-be caller is exactly the one that must not use it.

The secondary decision was scope. The finding names only the factory, but `loadTestData()` sits on the same init path with the same unguarded read, so a factory-only fix would have shipped a plan whose stated benefit ("no toggles, dead app" is fixed) was false — init would abort ~350 lines later instead. Two extra conversions buys the claim.

## Rejected Alternatives

- **Inline try/catch at each of the four call sites.** Rejected: four hand-copied guards is the exact divergence pattern this repo has burned on twice (the 12 harness row loops, the forked toggle implementations). A named pair gives one anchor for CODE-PATTERNS.md and one place for a future `sessionStorage` fallback. Would change my mind if there were only ever one call site.
- **A single `storage` object with `get`/`set` methods.** Rejected: the file has no other object-namespaced utilities, and two function declarations hoist while a `const storage = {…}` would have to be positioned above the migration shim's top-level execution. Marginal difference; consistency with the file won.
- **Feature-detecting storage once at startup into a boolean.** Rejected: a probe write that succeeds at startup does not guarantee later writes succeed (quota fills, permission revoked mid-session), and the probe itself needs a try/catch anyway. Per-call guards are cheaper than they look. Would change my mind if a profiler showed the try/catch on the keystroke path mattered — it will not.
- **Stubbing `localStorage.getItem` directly in the fixtures.** Rejected on spec grounds: `Storage` has a named-property setter, so the assignment writes a storage item rather than shadowing the method. `Storage.prototype` is the correct seam.
- **Renaming Section 11's heading to mention storage hardening.** Rejected: TASK-035 owns all 16 header blocks in `renderTestHarness` and converts them to a `harnessSection(body, title)` call. Editing a header here creates a merge-hostile overlap for zero behavioural gain; the fixture labels carry the meaning instead.

## Lowest-Confidence Area

Fixture 3's restore fidelity. `loadTestData()` reaches further into live state than the other two fixtures — it sets `els.testData.value`, then `parseTestData()` sets `testData`, `testDataValid`, and the `#testDataHint` text and class. Reassigning the captured value and re-running `parseTestData()` should reproduce all four exactly, because `parseTestData` is a pure function of the textarea's value. If the hint element shows a stale "JSON parsed" state after opening the harness, that restore is incomplete and the fixture needs an explicit hint snapshot too. If it proves fragile at all, drop fixture 3 and keep the production hardening in steps 5-6 — the hardening is the deliverable; the fixture is the proof, and an unreliable proof is worse than a manual note.

Second: the fixtures assume the two `Storage.prototype` methods are writable data properties on all target browsers. They are per spec and in Chrome/Edge/Firefox. If an assignment silently fails under some hardened configuration, the fixture reads PASS for the wrong reason (nothing threw because nothing was stubbed). A cheap defence, if you want it: assert inside the fixture that a direct `localStorage.getItem('x')` call throws while the stub is installed, before exercising the factory.
