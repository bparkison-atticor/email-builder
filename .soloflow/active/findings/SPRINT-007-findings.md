---
sprint: SPRINT-007
pending_count: 4
last_updated: 2026-08-11
---

# Findings Queue

## FIND-SPRINT-007-1
- **source:** TASK-014 (verifier)
- **type:** improvement
- **severity:** medium
- **status:** open
- **location:** index.html:2600-2603
- **description:** The TASK-014 migration shim performs an unguarded `localStorage.setItem` at module-init time (top level of the `<script type="module">`), which is a new class of boot-time exposure. Before this task the module body only *read* localStorage at init; the first *write* happened inside the `flipTestData` click handler, so a write failure degraded one interaction rather than the whole app. Now, if `setItem` throws (QuotaExceededError, storage-write-blocked profiles, extensions that stub `Storage.prototype.setItem`), the uncaught exception aborts the rest of the module body: no preview render, no test-data/CTA/promo toggles, no copy wiring, no Ctrl+Shift+T harness — a blank app. Reproduced with headless Chrome by stubbing `Storage.prototype.setItem` to throw only for the `emailBuilder.module.testData` key: the pre-change build boots normally (`previewRendered: true, toggleRendered: true`), the post-change build does not (`previewRendered: false, toggleRendered: false`, `EXCEPTION: QuotaExceededError`). Note the shim's write is on the one-time boot path for *every* pre-existing user (new key null + legacy key present), so the blast radius is the whole installed base even though the throw probability is low. Not a blocker: the trigger requires a storage state this app cannot realistically create (its own payloads are kilobytes), and the fully-blocked-storage case already broke the pre-change build at the init-time `getItem`.
- **suggested_action:** Wrap the shim in `try { ... } catch {}` so a failed migration degrades to the `defaultOn` value instead of bricking init. Consider the same treatment for `createModuleToggle`'s `flip()` write (index.html:2649) — that one only breaks a single interaction today, but the pattern is the same.
- **resolved_by:**

## FIND-SPRINT-007-2
- **source:** TASK-014 (verifier)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:2598-2603
- **description:** The one-time migration shim never deletes the legacy `emailBuilder.testDataEnabled` key after copying it, so the stale key lingers in every migrated user's localStorage indefinitely and the shim itself has no retirement trigger. It is correctly idempotent (only fires while the new key is null) and new-key-wins precedence was verified, but if a user ever clears only `emailBuilder.module.testData`, the shim silently resurrects a preference the user may have set years earlier. The TASK-014 plan anticipated this ("removable later") without scheduling the removal.
- **suggested_action:** Either `localStorage.removeItem('emailBuilder.testDataEnabled')` immediately after the successful copy (makes the shim self-retiring and single-shot), or schedule shim deletion for a dated cleanup task once the migration window has passed.
- **resolved_by:**

## FIND-SPRINT-007-3
- **source:** TASK-014 (code-reviewer)
- **type:** claude-md
- **severity:** medium
- **status:** open
- **location:** CODE-PATTERNS.md:53-58
- **description:** The `createModuleToggle` entry in CODE-PATTERNS.md is now stale in two ways after TASK-014. Its **Gotcha** still reads "The legacy `testDataEnabled` toggle uses a different key (`emailBuilder.testDataEnabled`) — migrating it onto this factory needs a one-time key migration or the saved preference resets," which describes the migration as pending work; it has shipped, and a future agent reading this would think there is still a hand-rolled toggle to migrate. Its **Location** and **Canonical example** line refs (`~line 1920`, `~line 1992`) are ~700 lines off from the current file (factory is at index.html:2615, CTA call site at index.html:2687) — pre-existing drift, not caused by this task, but the same entry. The file is in TASK-014's `files_readonly` set so the executor could not update it.
- **suggested_action:** Rewrite the Gotcha to state the migration is complete: state persists under `emailBuilder.module.<id>`; the test-data toggle was migrated from the legacy `emailBuilder.testDataEnabled` key in TASK-014 and a one-time copy shim (index.html:2598-2603) preserves pre-migration preferences. Note that the test-data caller re-applies its own `title` attribute after construction because the factory does not accept one. Refresh the line refs while there, and add the preview-header call site (index.html:2608-2610) as a second canonical example.
- **resolved_by:**

## FIND-SPRINT-007-4
- **source:** TASK-014 (code-reviewer)
- **type:** cleanup
- **severity:** low
- **status:** open
- **location:** index.html:364
- **description:** The CSS section banner `/* ---------- Top bar: divider, switch, toolbar buttons ---------- */` names a `switch` class that no longer exists anywhere in the file — TASK-014 removed the `.switch` halves of the comma-paired rules beneath it (index.html:371-407) along with the last `class="switch"` element. A reader who greps for `.switch` after reading this banner finds nothing. Sits four lines above the edited block, so it is adjacent to the diff rather than in it.
- **suggested_action:** Change the banner to `/* ---------- Top bar: divider, module toggle, toolbar buttons ---------- */`.
- **resolved_by:**
