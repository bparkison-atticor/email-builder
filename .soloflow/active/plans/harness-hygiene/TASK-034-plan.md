---
id: TASK-034
idea: SPRINT-008-proposal
status: approved
created: 2026-08-19T15:00:00Z
files_owned:
  - index.html
files_readonly:
  - .soloflow/active/findings/SPRINT-008-findings.md
  - CODE-PATTERNS.md
acceptance_criteria:
  - criterion: "Opening the harness leaves keyboard focus inside the harness overlay, not in the hidden CTA microcopy editor"
    verification: "Serve the app, click into the page body, press Ctrl+Shift+T, then run `document.activeElement.id` in the console — it returns `testHarnessClose`. Then press any letter key (e.g. `a`) and confirm the compiled email in the preview iframe is unchanged and #ctaMicrocopyCount still reads 0."
  - criterion: "The guard restores every piece of state it mutates"
    verification: "Before opening the harness, type `9995551234` into the link dialog's destination field and select the URL link type (open the dialog from a body editor, do not apply, press Escape). Open the harness with Ctrl+Shift+T. Then reopen the link dialog from a body editor: `linkDestination.value` and the active `[data-link-type]` button are the same values you left, not '' and 'phone'."
  - criterion: "No pending focus timer survives a closed link modal"
    verification: "grep `linkFocusTimer` in index.html returns a declaration, an assignment inside openLinkModal, and a clearTimeout inside closeLinkModal. In the browser: open the link dialog and press Escape within 50ms; focus does not jump into #linkDestination afterwards."
  - criterion: "The guard still fails when the property it protects is broken"
    verification: "Temporarily edit the toolbar-override loop (grep `Toolbar override`) to `[bodyAboveQuill, bodyBelowQuill].forEach(...)`, reopen the harness, and confirm the 4th MICROCOPY_DOM_GUARDS row reads FAIL. Revert the edit and confirm it reads PASS again."
  - criterion: "All harness sections still pass"
    verification: "Open Ctrl+Shift+T over http:// and confirm every row in every section reads PASS (the Documentation anchor drift guard requires the http:// server, not file://)."
depends_on: []
estimated_complexity: low
epic: harness-hygiene
test_strategy:
  needed: true
  justification: "The change is itself a fix to a test fixture plus a small production change to modal lifecycle. The production half (linkFocusTimer) needs its own assertion; the fixture half is verified by the guard continuing to red/green correctly."
  targets:
    - behavior: "closeLinkModal cancels the pending destination-focus timer"
      test_file: "index.html"
      type: unit
    - behavior: "The microcopy toolbar-link guard leaves activeElement, linkDestination.value, and the active link-type button unchanged"
      test_file: "index.html"
      type: integration
---

# Stop the test harness from stealing keyboard focus into the CTA microcopy editor

## Objective

Opening the developer harness (Ctrl+Shift+T) currently ends with keyboard focus inside the hidden CTA microcopy Quill editor, so any keystroke that is not Escape types into the compiled email while the marketer is looking at a full-screen overlay. The cause is the 4th `MICROCOPY_DOM_GUARDS` entry, which proves toolbar wiring by invoking the real production link handler; that path focuses the editor twice (`quill.getSelection(true)` on the way in, `ownerEditor.focus()` on the way out) and also leaves three pieces of dialog state mutated and one `setTimeout` pending. This task makes the guard restore what it touches and hands focus to the harness close button, and fixes the underlying production leak where closing the link modal does not cancel its pending focus timer. It runs first in this sprint because every subsequent task in the chain verifies its work by opening this harness repeatedly in a browser.

## Implementation Steps

1. **Production fix — cancel the pending focus timer.** Next to the link-dialog module state (grep `let ownerRange = null;`), add `let linkFocusTimer = null;`. In `openLinkModal` (grep `function openLinkModal`), change the trailing `setTimeout(() => { linkDestination.focus(); }, 50);` to assign its id: `linkFocusTimer = setTimeout(() => { linkDestination.focus(); }, 50);`. In `closeLinkModal` (grep `function closeLinkModal`), add `clearTimeout(linkFocusTimer); linkFocusTimer = null;` as the first two statements, before the `classList.remove('visible')` line. Add a one-line comment citing the deciding construct: closing the dialog inside 50ms otherwise yanks focus into a `display:none` input.

2. **Guard fix — snapshot before invoking the handler.** In the 4th `MICROCOPY_DOM_GUARDS` entry (grep `Toolbar-handler loop wires the link button`), rewrite `check()` to capture state before `handler()`:
   - `const priorFocus = document.activeElement;`
   - `const priorDestination = linkDestination.value;`
   - `const priorLinkType = (Array.from(linkTypeButtons).find(b => b.classList.contains('active')) || {}).dataset?.linkType || null;` — note `linkTypeButtons` is a `NodeList` from `querySelectorAll`, so it has no `.find`; the `Array.from` wrapper is required.

3. **Guard fix — restore after `closeLinkModal()`.** After the existing `closeLinkModal()` call and before `return wired;`:
   - restore `linkDestination.value = priorDestination;`
   - restore the segment buttons with the same active/`aria-pressed` pair `openLinkModal` sets: iterate `linkTypeButtons`, `b.classList.toggle('active', b.dataset.linkType === priorLinkType)` and `b.setAttribute('aria-pressed', String(b.dataset.linkType === priorLinkType))`. If `priorLinkType` was `null`, this correctly leaves every button inactive.
   - call `updateLinkFields()` so the label/hint text matches the restored segment choice.
   - blur the editor `closeLinkModal()` just focused and move focus into the overlay: `document.getElementById('testHarnessClose').focus();`.

   Wrap the whole body in `try { … } finally { … }` so a throw mid-guard still restores state. Note the harness renders *before* `#testHarness` gains `.visible` (grep `renderTestHarness();` inside the keydown handler), so the close button is inside a `display:none` subtree at the moment `check()` runs and `focus()` on it is a no-op. Therefore the focus hand-off must ALSO happen after the panel becomes visible: in the Ctrl+Shift+T handler, move the `renderTestHarness()` call to before `panel.classList.add('visible')` (it already is) and add `document.getElementById('testHarnessClose').focus();` immediately after `panel.classList.add('visible')`. Keep the in-guard `focus()` too — it is harmless and makes the guard self-contained if it is ever run with the panel already open.

4. **Update the guard's `description`** to state that it invokes the real production handler and therefore snapshots and restores `activeElement`, `linkDestination.value`, and the active link-type button — following the same save/restore discipline Section 3 uses for its localStorage key (grep `const priorValue = localStorage.getItem(LS_KEY);`).

5. **Verify the guard still reddens.** Temporarily drop `ctaMicrocopyQuill` from the toolbar-override loop (grep `Toolbar override`), reopen the harness, confirm the row reads FAIL, then revert. This is the property the guard exists to protect; a save/restore refactor that accidentally makes it vacuous is the failure mode to rule out.

6. **Manual browser validation.** Focus/DOM timing cannot be validated from harness PASS/FAIL alone. Serve over http://, open the harness, and check `document.activeElement.id === 'testHarnessClose'`, then type a letter and confirm nothing changed in the preview or the microcopy char count.

## Acceptance Criteria

- Focus after Ctrl+Shift+T is `#testHarnessClose`; a stray keystroke cannot reach the microcopy editor. PASS = `document.activeElement.id` is `testHarnessClose` and the preview is byte-unchanged after pressing a letter.
- `linkDestination.value` and the active link-type button survive a harness open unchanged. PASS = the values observed after a harness open equal those set before it.
- `closeLinkModal` cancels the pending 50ms focus timer. PASS = `clearTimeout(linkFocusTimer)` present in `closeLinkModal`, and no focus jump after an Escape inside 50ms.
- The guard still fails when `ctaMicrocopyQuill` is removed from the toolbar-override loop. PASS = FAIL row observed during the temporary edit, PASS row after revert.
- Every harness row in every section reads PASS over http://.

## Test Strategy

The harness is this project's only test surface, so both targets live in `index.html`. Add no new section. Target 1 (`linkFocusTimer`) is asserted structurally by the anchor-style grep in the acceptance criteria plus the manual Escape-inside-50ms check; a fixture cannot observe a cancelled timer without a 50ms wait, which the synchronous harness cannot express — this is deliberately manual. Target 2 is the reworked `MICROCOPY_DOM_GUARDS` entry itself: its own restore behavior is verified by the before/after comparison in criterion 2, and its continued sensitivity by the temporary-breakage check in step 5. No mocking or fixtures beyond the existing guard entry.

## Hardest Decision

Whether to keep invoking the real production handler at all. The alternative — asserting wiring without side effects, by swapping `openLinkModal` for a recording stub or by string-matching `handlers.link.toString()` — removes the focus problem outright. I kept the real handler because the guard's entire value is that it exercises the same function Quill calls on a real click; a stub proves the loop assigned *something*, and `toString()` matching is the vacuous-pass trap that Section 16's own header comment warns about (grep `DO NOT write any anchor needle as a literal`). Save/restore keeps the strong assertion and pays for it with ~10 lines of discipline that Section 3 already establishes as the in-file precedent.

The secondary decision was fixing `linkFocusTimer` in production rather than working around the pending timer inside the guard. The timer is a real (if minor) production defect — Escape within 50ms of opening the dialog yanks focus into a hidden input — and fixing it there removes the guard's residue as a side effect instead of leaving it inert-by-luck on `display:none`.

## Rejected Alternatives

- **Recording stub for `openLinkModal`.** Rejected: weakens the assertion from "the production path routes microcopy through the modal" to "the loop assigned a function". Would change my mind if the save/restore proved flaky across browsers, or if a future change made `openLinkModal` do something genuinely destructive (writing localStorage, mutating the Quill document).
- **Focus trap on `#testHarness`.** Rejected as out of scope: it would fix the symptom for this overlay generally, but it is a larger accessibility change to a dev-only surface and leaves the unrestored `linkDestination`/segment-button mutations in place. Worth revisiting if the harness ever gains interactive controls.
- **Deleting the 4th guard.** Rejected: FIND-SPRINT-008-15 added it for a reason, and the wiring it protects has already been wrong once.

## Lowest Confidence Area

Step 3's focus hand-off ordering. `focus()` on an element inside a `display:none` subtree silently does nothing, and the harness renders before the panel becomes visible, so the in-guard `focus()` alone cannot work — hence the second call after `classList.add('visible')`. If some browser instead leaves `document.activeElement` on `<body>` rather than restoring `priorFocus`, criterion 1 still passes (focus is not in the editor) but `priorFocus` restoration becomes a no-op. I chose to prioritise "focus lands in the overlay" over "focus returns exactly where it was", because the overlay is modal and returning focus underneath it would be wrong anyway.
