---
id: TASK-014
idea: IDEA-003
status: approved
created: 2026-06-02T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CODE-PATTERNS.md
  - ARCHITECTURE.md
  - .soloflow/archive/done/module-toggle/EPIC-module-toggle.md
acceptance_criteria:
  - criterion: "The static `#testDataSwitch` markup at index.html:672-675 (`<span class=\"switch on\" ... id=\"testDataSwitch\" title=\"...\">`) is removed and replaced at runtime by a `createModuleToggle()`-produced element inserted into `.preview-header-left` after the `.divider` at index.html:671. There is no longer a hand-rolled switch element in the HTML source for test data."
    verification: "grep -n 'id=\"testDataSwitch\"' index.html returns 0 matches. grep -n 'class=\"switch' index.html returns 0 matches (the only `.switch`-class element in the document was #testDataSwitch). In the running app, the 'Test data' toggle still appears in the preview header toolbar, after the viewport segmented control and divider, in the same visual position as before."
  - criterion: "LOAD-BEARING: A user who previously turned test data OFF (legacy localStorage key `emailBuilder.testDataEnabled` === 'false') still sees test data OFF after the migration, even though the factory reads the new key `emailBuilder.module.testData`. A one-time migration copies the legacy value into the new key when the new key is absent."
    verification: "Manual: (a) In devtools console run `localStorage.setItem('emailBuilder.testDataEnabled','false'); localStorage.removeItem('emailBuilder.module.testData');` then reload. The Test data toggle renders OFF (aria-checked=\"false\", no `.on` class) and the preview shows raw `{{tokens}}`. (b) Run `localStorage.setItem('emailBuilder.testDataEnabled','true'); localStorage.removeItem('emailBuilder.module.testData');` then reload — toggle renders ON. (c) With NO key for either, reload — toggle defaults ON (matches prior `!== 'false'` default at index.html:1571)."
  - criterion: "The module-scoped `testDataEnabled` variable read by `applyTestData` at index.html:1759 stays in sync with the toggle. Flipping the toggle changes the preview substitution and re-renders, identical to the prior `flipTestData` behavior."
    verification: "Manual: With valid test data entered, click the Test data toggle OFF. The live preview iframe immediately shows raw `{{Client.FirstName}}` tokens (a `scheduleRender()` fired). Click it ON — preview shows substituted values (e.g. 'James'). Repeat via keyboard: focus the toggle, press Space, confirm the same flip + re-render. Press Enter, confirm flip + re-render."
  - criterion: "The new toggle persists its state across reloads under the factory key `emailBuilder.module.testData`."
    verification: "Manual: Flip Test data OFF, reload. localStorage `emailBuilder.module.testData` === 'false' and the toggle is OFF on load. Flip ON, reload — value 'true', toggle ON."
  - criterion: "The dead `flipTestData`, `syncTestDataSwitch` functions and the manual `testDataSwitch` click/keydown listeners (index.html:1893-1911) are removed. No orphaned references remain."
    verification: "grep -n 'flipTestData\\|syncTestDataSwitch' index.html returns 0 matches. grep -n 'getElementById(.testDataSwitch.)' index.html returns 0 matches. App loads with no console errors (devtools Console is clean on initial render)."
  - criterion: "The HUMANIZE_FIXTURES test harness (Ctrl+Shift+T) still passes all fixtures unchanged."
    verification: "Press Ctrl+Shift+T in the running app. Every fixture row shows the PASS badge; row count is unchanged from before the edit."
depends_on: []
estimated_complexity: low
epic: null
test_strategy:
  needed: false
  justification: "No automated test suite exists in this repo (CLAUDE.md: 'no test command detected'). The change is a localized refactor inside a single file (index.html) that swaps a hand-rolled widget for an existing, already-shipped factory. Correctness is verified by the manual acceptance criteria above, which explicitly cover the load-bearing localStorage-key migration (the one regression-prone surface), keyboard+click parity, render-sync, persistence, and dead-code removal."
---

# Migrate `#testDataSwitch` onto `createModuleToggle()` to eliminate the parallel toggle implementation

## Objective

`index.html` currently contains two near-identical toggle implementations. `createModuleToggle()` (index.html:1916-1967, shipped in TASK-011) is a reusable factory handling `role="switch"` a11y, click + Space/Enter keyboard handling, and `emailBuilder.module.<id>` localStorage persistence. The older test-data switch (static markup at index.html:672-675 plus the hand-rolled `flipTestData`/`syncTestDataSwitch` handlers at index.html:1893-1911) is a copy of the same widget. TASK-011's code-reviewer flagged the factory as a "clean generalization" of this older pattern. This task migrates the test-data switch onto the factory and deletes the duplicate, so future a11y/persistence fixes apply in one place. The load-bearing risk is the localStorage key change (`emailBuilder.testDataEnabled` -> `emailBuilder.module.testData`), which must not silently reset existing users' saved preference.

## Approach (chosen): factory-built element + one-time key migration

Replace the static `#testDataSwitch` span with a `createModuleToggle('testData', 'Test data', <default>, onTestDataToggle)` call, inserting the produced element into `.preview-header-left` exactly where the static span was (after the `.divider`). Keep `testDataEnabled` as the module-scoped variable `applyTestData` reads; the `onChange` callback assigns `testDataEnabled = isOn` and calls `scheduleRender()`. Preserve the user's saved preference with a one-time migration: before constructing the toggle, if the new key is absent and the legacy key is present, copy the legacy value to the new key. This leaves `createModuleToggle()` completely unmodified.

## Implementation Steps

1. **Remove the static markup.** Delete the `<span class="switch on" ... id="testDataSwitch" ...>...</span>` block at index.html:672-675. Leave the `<span class="divider" aria-hidden="true"></span>` at index.html:671 in place — the factory element will be appended after it.

2. **Add the one-time key migration shim.** Immediately before where the toggle is constructed (see step 4), add:
   ```js
   // One-time migration: preserve the pre-TASK-014 saved preference.
   // Old key: emailBuilder.testDataEnabled ; new factory key: emailBuilder.module.testData
   if (localStorage.getItem('emailBuilder.module.testData') === null) {
     const legacy = localStorage.getItem('emailBuilder.testDataEnabled');
     if (legacy !== null) localStorage.setItem('emailBuilder.module.testData', legacy);
   }
   ```
   This must run BEFORE `createModuleToggle('testData', ...)` so the factory's `localStorage.getItem(key)` (index.html:1918) reads the migrated value. The factory's null-handling (index.html:1922-1926) then yields: missing both keys -> `defaultOn`; legacy 'false' -> OFF; legacy 'true' -> ON.

3. **Replace the handlers with an onChange callback.** Delete `syncTestDataSwitch` (index.html:1894-1897), `flipTestData` (index.html:1898-1903), and the two `testDataSwitch.addEventListener` calls plus the trailing `syncTestDataSwitch();` (index.html:1904-1911) and the `const testDataSwitch = document.getElementById('testDataSwitch');` line (index.html:1893). Replace them with:
   ```js
   function onTestDataToggle(isOn) {
     testDataEnabled = isOn;
     scheduleRender();
   }
   const testDataToggle = createModuleToggle('testData', 'Test data', true, onTestDataToggle);
   testDataToggle.element.title = 'Substitute {{tokens}} in preview';
   document.querySelector('.preview-header-left').appendChild(testDataToggle.element);
   ```
   Notes:
   - `defaultOn` is `true` to match the prior default at index.html:1571 (`!== 'false'` => default ON).
   - The factory does NOT set a `title` attribute, so re-apply the original tooltip on `.element` after construction (preserves hover affordance).
   - The factory calls `onChange(state)` synchronously during construction (index.html:1964), so `testDataEnabled` is assigned the resolved state at creation time and the first render reflects it.
   - This call site mirrors the existing CTA toggle pattern at index.html:1988-1989.

4. **Simplify the module-scoped declaration.** At index.html:1571, the line `let testDataEnabled = localStorage.getItem('emailBuilder.testDataEnabled') !== 'false';` may remain as a safe pre-construction default (the factory's synchronous `onChange` overwrites it). To avoid two sources of truth, change it to `let testDataEnabled = true;` — the authoritative value now comes from `onTestDataToggle` fired during `createModuleToggle` construction. Do NOT delete the variable; `applyTestData` (index.html:1759) reads it. Verify the construction at step 3 runs after line 1571 in execution order (it does — 1571 is top-level, the toggle is constructed lower in the module body).

5. **Confirm no other readers of the legacy key.** Run `grep -n "emailBuilder.testDataEnabled" index.html`. After the edit the only remaining occurrence must be inside the migration shim (step 2). `TEST_DATA_STORAGE_KEY` at index.html:1548 is `emailBuilder.testData` (the test-data JSON payload, a different key) — do NOT touch it.

6. **Verify `.switch` CSS disposition.** After removing the only `.switch` element, the paired CSS selectors at index.html:356, 366, 372, 382, 394, 396, 398 still carry `.module-toggle` and remain live. Removing the now-unused `.switch` halves of those selector lists is OPTIONAL cleanup; if done, edit only the `.switch` portion of each comma-paired rule and leave `.module-toggle` intact. Do not remove a whole rule. Skipping this is acceptable — flag the dead selectors in the done report either way.

7. **Manual verification pass.** Start the dev server (`python -m http.server 8080 --bind 127.0.0.1`), open the app, and run every scenario in the Acceptance Criteria above — especially the three localStorage migration sub-cases.

## Acceptance Criteria

See frontmatter. The load-bearing criterion is the second: a previously-OFF user must remain OFF after migration. The grep-based criteria (1 and 5) are objective completeness gates for dead-code removal; the rest are manual behavioral checks (no test runner exists).

## Test Strategy

`needed: false`. No automated test suite exists (CLAUDE.md). This is a single-file refactor swapping a duplicate widget for the shipped factory; the manual acceptance criteria cover the one regression-prone surface (localStorage key migration) plus keyboard/click/render/persistence parity and dead-code removal.

## Hardest Decision

Preserving the user's saved test-data preference across the localStorage key change. The factory hard-codes its key as `emailBuilder.module.${id}` and cannot be told to use a custom key without modifying it — and modifying the factory would re-introduce special-casing into the very thing this task is consolidating. The one-time migration shim (copy legacy value into the new key when the new key is absent) keeps the factory untouched, is idempotent (only fires while the new key is null), and degrades cleanly to the correct `defaultOn` when neither key exists. Chosen over modifying the factory to accept a key override because the shim is local, removable later, and does not widen the factory's API for a single caller's legacy concern.

## Rejected Alternatives

- **Add a `keyOverride` parameter to `createModuleToggle()`.** Rejected: widens the factory API for one caller's backward-compat need; the migration concern is transitional and does not belong in the long-lived factory signature. Would reconsider if a second caller also needed legacy-key adoption.
- **Make the factory adopt the existing static `#testDataSwitch` element** instead of creating a new one. Rejected: the factory's contract creates and returns its own element (`document.createElement('span')`, index.html:1932); teaching it to adopt arbitrary pre-existing DOM is a larger change than the migration warrants and diverges from how the CTA toggle (the only other caller) uses it. Would reconsider if multiple static toggles needed in-place upgrading.
- **Keep static markup and route flip/sync through a helper extracted from the factory** (the work item's option 2b). Rejected: leaves a partial duplicate (static markup + shared logic) rather than fully consolidating, and produces a third code shape. The factory already returns the right `{ element, isOn }` API; using it wholesale is cleaner.

## Lowest Confidence Area

Execution-order assumption in step 4: that the top-level `let testDataEnabled` at index.html:1571 is assigned its authoritative value by `onTestDataToggle` firing synchronously inside `createModuleToggle` (constructed lower in the same module body). If the toggle construction were ever moved above line 1571, or if `applyTestData` could run between line 1571 and the toggle construction, the variable could briefly hold the wrong default. Current code has no render before the toggle is built, so this holds — but the executor should confirm no `scheduleRender`/`applyTestData` call fires between index.html:1571 and the new construction site. The optional `.switch` CSS cleanup (step 6) is also a judgment call left to the executor.
