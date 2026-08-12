---
id: TASK-030
idea: SPRINT-006-007-compound
source_item: B2
status: ready
created: 2026-08-12T00:00:00Z
files_owned:
  - index.html
  - CODE-PATTERNS.md
files_readonly:
  - ARCHITECTURE.md
  - .soloflow/active/compound/SPRINT-006-007-proposal.md
acceptance_criteria:
  - criterion: "createModuleToggle takes a 5th parameter `persist = true`. When persist is false the factory neither reads nor writes localStorage: the getItem call is gated and the setItem call inside flip() is gated."
    verification: "Read `function createModuleToggle` in index.html — the signature ends `, persist = true)`, the stored-value read is `persist ? localStorage.getItem(key) : null`, and flip()'s write is wrapped in `if (persist)`. grep -n 'localStorage' inside the factory returns exactly those two guarded call sites."
  - criterion: "The dark-mode switch is built by createModuleToggle('darkMode', 'Dark mode', false, onDarkModeToggle, false) — there is no hand-rolled dark-mode switch markup, sync function, flip function, or keydown handler left in the file."
    verification: "grep -n 'syncDarkModeSwitch\\|flipDarkMode' index.html returns 0 matches. grep -n \"createModuleToggle('darkMode'\" index.html returns exactly 1 match. grep -n 'id=\"darkModeSwitch\"' index.html returns 0 matches (the id is now assigned in JS via .element.id)."
  - criterion: "onDarkModeToggle(isOn) carries all three side effects the deleted syncDarkModeSwitch had: darkModeEnabled = isOn, darkClientControl.hidden = !isOn, previewStage.classList.toggle('dark', isOn) — plus scheduleRender()."
    verification: "Read `function onDarkModeToggle` in index.html; all four statements present."
  - criterion: "Dark-mode state still does not survive a reload."
    verification: "Manual: flip Dark mode ON, reload the page. The switch is OFF, the client picker is hidden, and `localStorage.getItem('emailBuilder.module.darkMode')` returns null in the console."
  - criterion: "The Test data toggle still persists across reloads under emailBuilder.module.testData (the persist default is unchanged for existing callers)."
    verification: "Manual: flip Test data OFF, reload — still OFF and localStorage `emailBuilder.module.testData` === 'false'. Flip ON, reload — 'true' and ON. Same for the CTA and Promo toggles under emailBuilder.module.cta / .promo."
  - criterion: "`document.querySelector('.preview-header-left')` is evaluated exactly once and cached in a const reused by every header-append call site."
    verification: "grep -c \"querySelector('.preview-header-left')\" index.html returns 1."
  - criterion: "A comment on the static `<span class=\"divider\">` at the end of `.preview-header-left` in the HTML markup states that the container is runtime-extended and names the JS call sites that append to it."
    verification: "Read the markup around `<div class=\"preview-header-left\">` in index.html; an HTML comment after the closing viewport `.seg-control` explains that the Test data toggle, the dark-mode divider, the Dark mode toggle and the client picker are all appended at runtime, and that a new *static* child would render before all of them."
  - criterion: "The preview header renders in this left-to-right order: viewport seg-control, static divider, Test data toggle, runtime divider, Dark mode toggle, dark client picker — with exactly two .module-toggle elements in the container."
    verification: "New harness Section 11 fixture 'Preview header append order' asserts this from the live DOM and shows PASS. Visually confirm in the browser at a maximized window."
  - criterion: "A new harness Section 11 ('Module toggle factory — persistence opt-out') contains at least four fixtures covering: persist=false writes no key on flip; persist=false ignores a pre-existing stored value; persist=true still writes on flip; and the preview header append order. All show PASS."
    verification: "Open Ctrl+Shift+T, find Section 11, confirm >= 4 rows and zero FAIL badges. The three persistence fixtures must use a throwaway id (e.g. '__harnessProbe') and must localStorage.removeItem their probe key before returning."
  - criterion: "Every pre-existing harness row still shows PASS — in particular Section 8's purity guard (TASK-029) and Section 7's promo-toggle DOM guard."
    verification: "Open Ctrl+Shift+T on a fresh load and confirm zero FAIL badges anywhere in the harness."
  - criterion: "CODE-PATTERNS.md's `### createModuleToggle` entry documents the 5-parameter signature, the persist opt-out with the dark-mode toggle as canonical non-persisting caller, an explicit 'do not hand-roll to avoid persistence' instruction, and the onChange-fires-during-construction trap."
    verification: "grep -n 'persist' CODE-PATTERNS.md returns matches inside the createModuleToggle entry. The entry must NOT contain the phrase 'there is no opt-out' or describe the dark-mode switch as hand-rolled."
depends_on: [TASK-029]
estimated_complexity: medium
epic: dark-mode-preview-hardening
test_strategy:
  needed: true
  justification: "This changes a factory with three production callers and one localStorage write path. The persistence opt-out is exactly the kind of boolean-gated behavior that regresses silently — nothing in a single-file app with no type checker would catch `if (persist)` being dropped. The append-order contract is likewise only enforceable as an executable assertion; a comment alone is what failed last time."
  targets:
    - behavior: "createModuleToggle with persist=false writes no localStorage key when flipped"
      test_file: "index.html"
      type: unit
    - behavior: "createModuleToggle with persist=false ignores a pre-existing stored value and starts at defaultOn"
      test_file: "index.html"
      type: unit
    - behavior: "createModuleToggle with persist=true (default) still writes its key on flip"
      test_file: "index.html"
      type: unit
    - behavior: "The preview header's left group renders its six children in the documented runtime-append order"
      test_file: "index.html"
      type: integration
---

# Migrate the dark-mode switch onto createModuleToggle with a persistence opt-out

## Context

TASK-014 deleted `testDataSwitch` / `syncTestDataSwitch()` / `flipTestData()` for the express purpose of retiring the last hand-rolled `class="switch"` control onto `createModuleToggle()`. Four commits later TASK-021 built `darkModeSwitch` (`index.html:3441-3477`) as a *new* hand-rolled control with the same `module-toggle`/`track` markup, the same sync/flip/keydown code, and the same CSS — because `createModuleToggle` (`index.html:3482`) reads `localStorage` at `3484` and writes it at `3516` unconditionally, and dark-mode state must not persist (locked at the IDEA-005 checkpoint). Net switch-widget consolidation across the sprint: zero.

This runs directly against a recorded project direction: the module-toggle factory is a deliberate universal-class decision (IDEA-003) — *all* future module toggles are added by calling the factory, not by copy-pasting event handlers and storage keys. One defaulted parameter restores that.

Separately, `.preview-header-left`'s static markup (`index.html:722-741`) ends with `<span class="divider" aria-hidden="true"></span>` — a divider originally written to separate the viewport control from the static `#testDataSwitch` that TASK-014 deleted. It still reads correctly only because TASK-014's `appendChild` (`index.html:3432`) and TASK-021's `insertAdjacentHTML` (`3441`) happen to fire in the right order. Nothing in the HTML says the container is runtime-extended, so a future *static* addition would silently render before all four runtime children.

## Objective

Give `createModuleToggle` a persistence opt-out, rebuild the dark-mode switch as an ordinary factory caller, and convert the header's accidental append-order into a documented and harness-asserted contract.

## Implementation Steps

1. **Completeness gate (run first, and re-run before reporting COMPLETED).** The identifiers being deleted are string literals that could have leaked into scripts or docs:
   ```
   grep -rn "syncDarkModeSwitch\|flipDarkMode" --include="*.html" --include="*.md" --include="*.js" --include="*.bat" .
   grep -rn "darkModeSwitch" --include="*.html" --include="*.md" --include="*.js" --include="*.bat" .
   ```
   Pre-flight result: `syncDarkModeSwitch`/`flipDarkMode` match only `index.html:3455,3461,3463,3466,3470,3473`; `darkModeSwitch` additionally matches `.soloflow/` sprint records and `CHANGELOG`-adjacent history. **`.soloflow/**` is an immutable historical record — do not rewrite it.** After the migration, the first grep must return 0 matches outside `.soloflow/`, and `darkModeSwitch` must survive in `index.html` only as the JS-assigned element id.

2. **Add the `persist` parameter to the factory** (`index.html:3479-3533`):
   ```js
   // ---------- Reusable module toggle factory ----------
   // Returns { element, isOn } — caller is responsible for DOM insertion.
   // State persists under `emailBuilder.module.<id>` in localStorage unless
   // `persist` is false, in which case the toggle is session-only: it neither
   // reads nor writes storage and always starts at `defaultOn`. The dark-mode
   // toggle is the canonical non-persisting caller (IDEA-005 locked its state
   // as non-persistent) — do NOT hand-roll a module-toggle element to dodge
   // persistence, pass persist: false.
   function createModuleToggle(id, label, defaultOn, onChange, persist = true) {
     const key = `emailBuilder.module.${id}`;
     const stored = persist ? localStorage.getItem(key) : null;
     ...
     function flip() {
       state = !state;
       if (persist) localStorage.setItem(key, String(state));
       sync();
       onChange(state);
     }
   ```
   Everything else in the factory is unchanged. Note the existing `if (stored === null) state = defaultOn;` branch already produces the right result for the non-persisting case with no further edit.

3. **Cache the header container.** Immediately above the test-data toggle block (`index.html:3407`), add:
   ```js
   // Preview header, left group. `.preview-header-left`'s static markup ends
   // at the viewport .seg-control plus one <span class="divider">; every
   // control after that divider is appended here at runtime, in source order:
   //   1. Test data toggle          (appendChild, below)
   //   2. dark-mode divider + client picker (insertAdjacentHTML, below)
   //   3. Dark mode toggle          (insertBefore the picker, below)
   const previewHeaderLeft = document.querySelector('.preview-header-left');
   ```
   Replace both `document.querySelector('.preview-header-left')` call sites (`3432`, `3441`) with `previewHeaderLeft`.

4. **Rebuild the dark-mode controls.** Replace `index.html:3434-3477` in its entirety with:
   ```js
   // Dark-mode preview controls (IDEA-005 / TASK-021, migrated onto the shared
   // factory in TASK-030). Runtime-inserted, same as the Test data toggle above.
   //
   // The client picker is inserted BEFORE the toggle is created, and the toggle
   // element is then insertBefore'd ahead of it. That ordering is load-bearing:
   // createModuleToggle fires onChange once during construction, and
   // onDarkModeToggle reads darkClientControl — so the picker must already
   // exist in the DOM when the factory runs.
   previewHeaderLeft.insertAdjacentHTML('beforeend',
     '<span class="divider" aria-hidden="true"></span>' +
     '<div class="seg-control" role="group" aria-label="Dark mode client" id="darkClientControl" style="width:auto" hidden>' +
       '<button type="button" class="active" data-dm="gmail" aria-pressed="true" title="Gmail mobile app (iOS) — inverts the entire email, then re-inverts images">Gmail</button>' +
       '<button type="button" data-dm="outlook" aria-pressed="false" title="Outlook.com / OWA (web) — selectively repairs contrast instead of inverting">Outlook</button>' +
       '<button type="button" data-dm="applemail" aria-pressed="false" title="Apple Mail (macOS 12.4+ / iOS 13+) — respects author dark-mode CSS; this email has none, so it renders unchanged">Apple Mail</button>' +
     '</div>'
   );
   const darkClientControl = document.getElementById('darkClientControl');

   function onDarkModeToggle(isOn) {
     darkModeEnabled = isOn;
     darkClientControl.hidden = !isOn;
     previewStage.classList.toggle('dark', isOn);
     scheduleRender();
   }
   // persist = false — dark mode is a review-time convenience, not a content
   // decision; IDEA-005 locked it as non-persisting. See CODE-PATTERNS.md.
   const darkModeToggle = createModuleToggle('darkMode', 'Dark mode', false, onDarkModeToggle, false);
   darkModeToggle.element.id = 'darkModeSwitch';
   darkModeToggle.element.title = 'Simulate a dark-mode email client in the preview (preview only)';
   previewHeaderLeft.insertBefore(darkModeToggle.element, darkClientControl);

   wireSegControl(darkClientControl.querySelectorAll('button[data-dm]'), (btn) => {
     darkModeClient = btn.dataset.dm;
     scheduleRender();
   });
   ```
   Deleted by this step: `const darkModeSwitch`, `syncDarkModeSwitch()`, `flipDarkMode()`, both `addEventListener` calls, and the bare `syncDarkModeSwitch()` init call. The factory supplies click and Space/Enter handling and the `aria-checked`/`.on` sync.

   `previewStage` (`index.html:3402`) and `scheduleRender` (a hoisted function declaration at `3386`) are both in scope here — `previewStage` is declared above this block, and `scheduleRender` is hoisted.

5. **Document the append-order contract in the HTML.** Immediately after the viewport `</div>` and before the static `<span class="divider" aria-hidden="true"></span>` (currently `index.html:739-740`), add:
   ```html
        <!-- RUNTIME-EXTENDED CONTAINER. Everything after this divider is
             appended by JS, in this order: the Test data toggle
             (createModuleToggle('testData', ...) → previewHeaderLeft.appendChild),
             then the dark-mode divider + #darkClientControl
             (previewHeaderLeft.insertAdjacentHTML), then the Dark mode toggle
             (previewHeaderLeft.insertBefore, ahead of the picker). A new
             *static* child added here would render BEFORE all of them — add
             new header controls at those JS call sites instead. -->
   ```

6. **Add harness Section 11.** After Section 10's `renderPredicateFixtures(body, APPLEMAIL_DARK_FIXTURES);` call (added by TASK-029), append a new section using the same helper:
   ```js
   // --- Section 11: module toggle factory — persistence opt-out + header order (TASK-030) ---
   const h11 = document.createElement('h3');
   h11.style.cssText = 'margin:12px 0 4px;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)';
   h11.textContent = 'Module toggle factory — persistence opt-out';
   body.appendChild(h11);

   const MODULE_TOGGLE_FIXTURES = [
     {
       label: 'persist=false: flipping writes no localStorage key',
       check() {
         const k = 'emailBuilder.module.__harnessProbeA';
         localStorage.removeItem(k);
         try {
           const t = createModuleToggle('__harnessProbeA', 'probe', false, () => {}, false);
           t.element.click();
           return t.isOn() === true && localStorage.getItem(k) === null;
         } finally { localStorage.removeItem(k); }
       },
       description: 'A non-persisting toggle must still flip its in-memory state but must never touch emailBuilder.module.<id>. This is the invariant that let the dark-mode switch stop being hand-rolled.',
     },
     {
       label: 'persist=false: a pre-existing stored value is ignored',
       check() {
         const k = 'emailBuilder.module.__harnessProbeB';
         localStorage.setItem(k, 'false');
         try {
           const t = createModuleToggle('__harnessProbeB', 'probe', true, () => {}, false);
           return t.isOn() === true;
         } finally { localStorage.removeItem(k); }
       },
       description: 'With persist=false the factory must not read storage either — defaultOn wins over a stale saved value.',
     },
     {
       label: 'persist defaults to true: flipping still writes its key',
       check() {
         const k = 'emailBuilder.module.__harnessProbeC';
         localStorage.removeItem(k);
         try {
           const t = createModuleToggle('__harnessProbeC', 'probe', false, () => {});
           t.element.click();
           return localStorage.getItem(k) === 'true';
         } finally { localStorage.removeItem(k); }
       },
       description: 'The opt-out must be opt-IN: omitting the 5th argument preserves the persisting behavior every existing caller (cta, promo, testData) relies on.',
     },
     {
       label: 'Preview header append order: viewport, divider, Test data, divider, Dark mode, client picker',
       check() {
         const kids = Array.from(document.querySelector('.preview-header-left').children);
         const at = (pred) => kids.findIndex(pred);
         const vp = at(el => !!el.querySelector && !!el.querySelector('button[data-vp]'));
         const td = at(el => el.classList.contains('module-toggle') && el.textContent.includes('Test data'));
         const dm = at(el => el.id === 'darkModeSwitch');
         const pk = at(el => el.id === 'darkClientControl');
         const toggles = kids.filter(el => el.classList.contains('module-toggle')).length;
         return vp === 0 && vp < td && td < dm && dm < pk && toggles === 2;
       },
       description: 'The container is runtime-extended and order-dependent (see the HTML comment on its static trailing divider). This fixture is the executable form of that contract — a static child added to the markup would land at index 0 and fail it.',
     },
   ];

   renderPredicateFixtures(body, MODULE_TOGGLE_FIXTURES);
   ```
   These fixtures create throwaway toggle elements that are never inserted into the DOM (the factory returns `element` without appending), so they leave no visible residue.

7. **Rewrite the `CODE-PATTERNS.md` entry.** Replace the whole `### \`createModuleToggle\`` entry with:
   ```markdown
   ### `createModuleToggle`

   - **Location:** `index.html` — `createModuleToggle()` (grep `function createModuleToggle`).
   - **Use it for:** Building an enable/disable toggle for an optional module. `createModuleToggle(id, label, defaultOn, onChange, persist = true)` returns `{ element, isOn }`; caller appends `element` to the DOM. `onChange(state)` fires once on init and on every flip.
   - **Canonical example:** grep `createModuleToggle('` for all callers — CTA, Promo, Test data (persisting) and Dark mode (non-persisting).
   - **Gotcha — persistence:** state persists under `emailBuilder.module.<id>` unless the 5th argument `persist` is `false`, which makes the toggle session-only: it neither reads nor writes `localStorage` and always starts at `defaultOn`. The Dark mode toggle is the canonical non-persisting caller. Do NOT hand-roll a `module-toggle` element to avoid persistence — that is what produced two forked switch implementations across SPRINT-007.
   - **Gotcha — onChange fires during construction:** the callback runs once *inside* the factory, before the caller can insert `element` into the DOM. Anything the callback touches must already exist. The dark-mode caller handles this by inserting its client picker first, then `insertBefore`-ing the toggle ahead of it.
   - **Note:** the Test data toggle carries a one-time copy shim preserving its pre-TASK-014 `emailBuilder.testDataEnabled` value.
   ```
   **The current on-disk text of this entry may be either of two versions** — the pre-compound text ("state persists under `emailBuilder.module.<id>`. The legacy `testDataEnabled` toggle uses a different key…") or the compound C1 rewrite ("the factory always persists … there is no opt-out … that is why the dark-mode switch … is hand-rolled"). Replace whichever is present; both are wrong after this task. Do not leave either sentence behind.

8. **Verify manually.** Serve and load. Confirm: header order is unchanged visually; clicking and Space/Enter on Dark mode both work; the picker appears only while dark mode is on; the stage chrome still darkens; reload clears dark mode; Test data / CTA / Promo all still persist. Then Ctrl+Shift+T and confirm zero FAIL badges across all eleven sections.

## Acceptance Criteria

As listed in the frontmatter. The two that most easily regress silently and must be checked by hand rather than assumed: (a) dark mode does **not** persist across reload while Test data **does**, and (b) Section 8's purity guard from TASK-029 is still green — this task rewires how `darkModeEnabled` is written, and that fixture drives the variable directly.

## Test Strategy

Four new harness fixtures in `index.html` Section 11, all using the `renderPredicateFixtures` helper TASK-029 introduces:

- **persist=false writes nothing** (unit) — throwaway id `__harnessProbeA`, flip via `element.click()`, assert `localStorage.getItem` is `null` and `isOn()` flipped. Cleanup with `removeItem` in a `finally`.
- **persist=false ignores stored state** (unit) — seed `__harnessProbeB` with `'false'`, construct with `defaultOn: true`, assert `isOn() === true`.
- **persist defaults to true** (unit) — `__harnessProbeC`, omit the 5th argument, flip, assert the key reads `'true'`. This is the regression lock protecting the three existing persisting callers.
- **Header append order** (integration) — reads the live `.preview-header-left` children and asserts index positions plus a `module-toggle` count of exactly 2.

No mocking or fixture files. The probe toggles use real `localStorage` under an `emailBuilder.module.__harnessProbe*` namespace and clean up in `finally`, so a thrown predicate cannot leave a stray key behind.

## Out of Scope

- The picker button `title` attributes and the dark-mode disclosure story generally — TASK-031 owns those and will re-source the titles from a shared notes map. Copy the three `title` strings across verbatim in step 4; do not edit them here.
- `.preview-stage.dark` and its comment — TASK-031.
- `CHANGELOG.md` — TASK-031 owns the changelog for this epic.
- `ARCHITECTURE.md` — the compound run's C3 item covers it.
- Wrapping the factory's `localStorage.getItem` in try/catch. A hardened-profile read throw would abort module init the same way the migration shim's write did before A5 fixed it, but that is a pre-existing hazard on a different call site and folding it in here would blur the acceptance criteria. Worth its own backlog item.

## Hardest Decision

The construction-order problem. `createModuleToggle` calls `onChange(state)` at the end of its body (before returning), so `onDarkModeToggle` runs while `darkModeToggle` is still `undefined` and before the caller can place `element` in the DOM. Since `onDarkModeToggle` must set `darkClientControl.hidden`, the picker has to exist first — but the picker must render *after* the toggle visually.

Three ways out: (a) insert the picker first and `insertBefore` the toggle ahead of it; (b) make `onDarkModeToggle` defensive (`if (darkClientControl) …`) and call a sync function again after wiring; (c) change the factory to defer the init `onChange` to a microtask.

**Chose (a).** It is three lines, needs no change to the factory's contract, and fails loudly (a `ReferenceError` at load) rather than silently if someone later reorders it. (b) makes the callback lie about its own invariants and reintroduces the two-code-paths problem this task exists to remove. (c) would change init timing for the CTA, Promo and Test data toggles — all three currently rely on `onChange` having already run synchronously by the time module init reaches the next statement — which is a far larger blast radius than the problem justifies. The tradeoff is that (a) makes the construction order load-bearing, which is why it gets both a comment and a harness fixture.

## Rejected Alternatives

- **Keep the switch hand-rolled and only document the constraint** (the compound proposal's own fallback). Rejected: that is exactly what the pre-compound `CODE-PATTERNS.md` entry already did, and it did not stop TASK-021 from forking a second implementation — the entry was ~1540 lines stale by then. Documentation was tried and failed; the parameter is the fix. Would change my mind: if `persist` turned out to require restructuring the factory rather than gating two calls.
- **A separate `createEphemeralToggle` factory.** Rejected: two factories sharing 95% of their body is the same duplication in a new shape, and it gives the next non-persisting toggle a second thing to choose between.
- **An options-object signature (`createModuleToggle({ id, label, defaultOn, onChange, persist })`).** Cleaner long-term and it is what IDEA-003's original sketch proposed, but it forces edits to all three existing call sites for no behavioral gain, and this is a single-file app with no type checker to catch a missed one. A defaulted 5th positional parameter is backwards-compatible by construction. Would change my mind: a 6th parameter — at that point convert all callers in one deliberate pass.
- **Dropping the `darkModeSwitch` element id.** Nothing in `index.html` reads it once the factory hands back the element reference, so it is technically dead. Kept because it is the greppable anchor the SPRINT-007 verification and the new Section 11 fixture both key off, and it costs one line.

## Lowest Confidence Area

`CODE-PATTERNS.md`'s starting state. As of refinement, the on-disk entry is still the pre-compound version (lines 53-58) — but the compound run's C1 item is queued to rewrite it with a sentence ("the factory always persists — there is no opt-out") that this task makes false. Step 7 is written to replace either version, but if C1 lands *between* this plan and execution, the executor will see text that does not match the pre-compound description and may hesitate. The acceptance criterion is written on the end state, not the diff, precisely for that reason: match the final text, not the removal.

Second: the append-order fixture asserts `vp === 0`, which assumes the viewport `.seg-control` stays the first static child. If a future task adds any static element ahead of it, the fixture goes red for a benign reason. That is the intended tradeoff — a false alarm here is much cheaper than the silent misplacement it prevents.
