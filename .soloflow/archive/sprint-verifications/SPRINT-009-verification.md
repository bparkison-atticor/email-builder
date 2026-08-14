---
sprint: SPRINT-009
visual_mobile: not_applicable
visual_web:    not_applicable
regressions_count: 0
flows_tested: 0
flows_deferred: 0
---

# Sprint Verification — SPRINT-009

**Verdict:** PASS — no cross-task regressions found.
**Scope:** combined diff of TASK-029, TASK-030, TASK-031, TASK-032, TASK-033 (out-of-band, same run branch) against base_sha `7149a42d62a77585eca3d28408f7e0177e691545`.

## Integration Tests

**Status:** ALL_PASS — 148 harness rows, 148 passed, 0 failed.

### Environment / tooling
- Served the repo with `python -m http.server 8080 --bind 127.0.0.1` (PID 10420, confirmed via `netstat -ano`, killed by exact PID only; no system-wide kill).
- Headless driver: **Playwright 1.62.1** (chromium, headless), found already cached at `C:\Users\brand\AppData\Local\ms-playwright\chromium-1234` — fully offline, no network install.
- Harness opened by dispatching a real `Control+Shift+T` keypress, not by calling harness functions directly.
- **Maestro:** N/A — no `.maestro/`, `maestro/`, or `test/maestro/` directory exists; this is a browser-only single-file app. Nothing was BLOCKED.
- No source or test files modified; `git status --short` empty at end of run.

### Per-section harness results

| # | Section | Rows | Fail |
|---|---|---|---|
| 1 | humanizeTemplateError | 7 | 0 |
| 2 | safeAttrHtml — href/attr token pre-processing | 9 | 0 |
| 3 | clearPromoFields — clear values, persist toggle state | 1 | 0 |
| 4 | validatePromoFields — blocking promo validation | 8 | 0 |
| 5 | serializePromoCard — JSON-LD block generation | 6 | 0 |
| 6 | humanizePromoError — JSON-LD serialisation error humanization | 3 | 0 |
| 7 | Script-not-truncated guard — TASK-020 regression | 3 | 0 |
| 8 | Dark-mode preview transforms — Gmail | 9 | 0 |
| 9 | Dark-mode preview transforms — Outlook (OWA contrast repair) | 13 | 0 |
| 10 | Dark-mode preview transforms — Apple Mail + author-CSS drift guard | 10 | 0 |
| 11 | Module toggle factory — persistence opt-out (TASK-030) | 5 | 0 |
| 12 | Dark-mode disclosure caption (TASK-031) | 4 | 0 |
| 13 | rich-text italics — em/i normalisation | 5 | 0 |
| 14 | richTextToMjText — default parity + style overrides | 21 | 0 |
| 15 | CTA microcopy — emission gating and muted styling | 20 | 0 |
| 16 | Documentation anchor drift guard (TASK-032) | 24 | 0 |

Section numbering verified monotonic 1–16, no gaps or duplicates — checked both statically in `index.html` source and dynamically against the live DOM `<h3>` headers.

### Failing rows
None.

### Required check groups

**1. Whole harness green at HEAD — PASS.** 148/148 rows, 16/16 sections present, no gaps. (Brief estimated ~147+; actual 148.)

**2. Cross-task seams — PASS.**
- `renderPredicateFixtures` (TASK-029) is the shared row renderer for sections 7, 8, 9, 10, 11, 12, 15, 16 — spanning work owned by TASK-020/021/022/023/030/031/027-033. All call sites render correctly; 0 failures across all of them.
- TASK-030's factory-built `#darkModeSwitch` feeding TASK-031's `syncDarkNote`: verified in-harness (Section 11 live-switch row and Section 12 live-picker row both PASS) **and** via a real headless click sequence — `#darkNote` went `hidden:true` -> `hidden:false` with the Gmail caption on toggle-on, swapped text correctly across Apple Mail / Outlook / Gmail picker clicks, and returned to `hidden:true` on toggle-off.
- TASK-031's renumbering did not disturb TASK-032's Section 16 placement or TASK-033's Section 15 fixture references — confirmed monotonic 1–16.
- `ANCHOR_FLOORS` (TASK-032) vs live doc anchor counts at HEAD: **exact match** — README.md 2/2, CODE-PATTERNS.md 18/18, ARCHITECTURE.md 2/2, CLAUDE.md 1/1. Confirmed not stale despite TASK-033's later doc edits: `git show 341b5e1 -- CODE-PATTERNS.md` only edited prose *inside* two existing anchor bullets (`richTextToMjText`, `buildMicrocopyBlock`) and added/removed zero grep anchors.
- TASK-033's `align` opt vs TASK-028's byte-parity fixtures (Section 14, 21/21 pass): confirmed independently outside the harness — compiled body-copy output for real headless-typed text shows MJML's own default `align="left"` / `text-align:left` (not an emitted override) with unchanged `padding:0 0 14px 0` / `font-size:16px` / `color:#333333`. Byte parity holds with `align=null`.

**3. End-to-end marketer flow at HEAD — PASS.** Driven with real Playwright input against the actual UI, not harness calls.
- Compiled successfully: selected `postmanLaw`, typed body copy, CTA text, and a phone number into the real Quill/input DOM. `#warn` stayed hidden/empty; `lastHtml` began `<!doctype html>`, ~13.3KB.
- Dark mode + client picker: `#darkNote` hidden<->visible transitions and correct per-client caption swap on real clicks.
- **Copy HTML purity:** preview iframe `srcdoc` carries `EB-DARKSIM` while dark mode is on (expected — preview-only), but `lastHtml`, the View HTML modal, and the real clipboard content from clicking `#copyBtn` never carry it. Byte-identical at 13346 chars.
- **CTA microcopy centering:** marker sentence typed into the microcopy Quill editor compiles to `<div style="...text-align:center;color:#6b6b6b;">` inside `<td align="center" style="...padding:0 0 18px 0...">`.
- **Persistence:** dedicated reload test — dark mode ON then reload without toggling off: `emailBuilder.module.darkMode` never written (before or after reload) and the switch reset to OFF. CTA toggle OFF then reload: `emailBuilder.module.cta="false"` persisted, toggle stayed OFF. Promo toggle ON persisted across reload.

**4. Console hygiene — PASS.** Zero console messages and zero `pageerror` / unhandled-rejection events across page load, harness open (including Section 16's async doc fetches), and the full e2e interaction sequence.

**5. localStorage hygiene — PASS.** Before/after harness snapshots both `{}` — no residue from the self-restoring fixtures in Sections 3, 8, 11. E2E snapshots showed only keys written by real user actions (`emailBuilder.module.promo`); final cleanup pass confirmed `{}`.

### Investigated and dismissed
A 345-byte length delta between the View-HTML-modal read and `navigator.clipboard.readText()` of the same `lastHtml` was chased down with a dedicated repro script: the delta exactly equals the newline count in the string, i.e. Windows clipboard newline normalization (LF -> CRLF). Not an application bug. `lastHtml` proved byte-stable across every dark-mode and client-picker toggle when read through a single consistent channel.

## Regressions

**None.** No cross-task regressions introduced by SPRINT-009, and no pre-existing failures to classify — there were no failing rows at all.

### Non-blocking watch-items for the sprint log

- **`ANCHOR_FLOORS['CODE-PATTERNS.md'] = 18` has zero headroom** (live count is exactly 18). Responsible task: TASK-032. Not a failure today, but the guard is `>=`-based, so (a) the next doc edit that trims even one anchor flips Section 16 red, and (b) anchor *additions* are never caught until a below-floor edit lands. Worth a follow-up task to add buffer semantics or an exact-count assertion with an intentional-update workflow. Filed as an observation, not a regression.
