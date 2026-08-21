---
sprints: [SPRINT-009]
span_label: SPRINT-009
created: 2026-08-21T00:00:00Z
counters_start:
  ideas: 8
summary:
  cleanups: 13
  backlog_tasks: 6
  claude_md: 2
  soloflow_improvements: 0
---

# Compound Proposal — SPRINT-009

SPRINT-009 shipped TASK-029 through TASK-033 (the `dark-mode-preview-hardening` epic plus the documentation-anchor-drift guard and CTA-microcopy centering). All findings below are `status: open` in `.soloflow/active/findings/SPRINT-009-findings.md`; FIND-SPRINT-009-2 and -6 are `status: resolved` (by TASK-031) and were skipped. No stuck reports this sprint. No drift found between findings marked open and any done report's `Findings resolved` claims, so no Reconciled Findings section is needed.

Three findings surfaced genuine process gaps but are SoloFlow planner/orchestrator defects, not project conventions — see **Suppressed — SoloFlow Defects** at the end. Tester mode is off, so no Bucket D.

## A. Clean-up items (execute now)

### A1. Fix the stale "Fixture 7" pointer in Section 10's header comment
- **Summary:** Section 10's comment still calls the drift-guard row "Fixture 7," but TASK-029 shifted it to position 10, so update the comment to name the row instead of counting it.
- **Source-Sprint:** SPRINT-009
- **Rationale:** This comment is the only in-file pointer telling a future maintainer which row must never be deleted; a wrong index actively misdirects rather than merely being stale.
- **Blast radius:** `index.html` only, ~2 lines, trivial risk.
- **Source:** FIND-SPRINT-009-1 (TASK-029 verifier)
- **Proposed change:**
  ```diff
    // --- Section 10: dark-mode preview transforms — Apple Mail + author-CSS drift guard (TASK-023) ---
  - // Same predicate-fixture shape and row renderer as Sections 8/9. Fixture
  - // 7 (the drift guard) is the highest-value regression lock in this
  - // section: it must stay in the harness for the life of the feature —
  + // Same predicate-fixture shape and row renderer as Sections 8/9. The
  + // drift-guard fixture is the highest-value regression lock in this
  + // section: it must stay in the harness for the life of the feature —
    // it is the mechanism that turns a silent premise violation (the
    // compiler starting to emit dark-mode CSS) into a loud, named failure.
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Confirmed at `index.html:2787-2788` — the comment still reads "Fixture 7 (the drift guard)" while the drift guard now sits at position 10, and the proposed fix names the row instead of counting it so it cannot go stale again.

### A2. Generalize `renderPredicateFixtures`' stale "(7-10)" scope comment
- **Summary:** The helper's header comment still says it covers harness sections "(7-10)," but seven call sites across sections 8-16 now use it, so replace the enumerated range with a shape-based description that can't go stale again.
- **Source-Sprint:** SPRINT-009
- **Rationale:** A maintainer reading only the first line would conclude the helper is dark-mode-specific and hand-roll an eighth copy of the loop it exists to prevent. Two prior explicit ranges in this file (this one and FIND-1's) have each gone stale within one sprint.
- **Blast radius:** `index.html`, 1 line, trivial risk.
- **Source:** FIND-SPRINT-009-9 (TASK-031 verifier)
- **Proposed change:**
  ```diff
  - // Shared row renderer for the predicate-shaped harness sections (7-10).
  + // Shared row renderer for harness sections whose fixtures are
  + // `{ label, check(), description }` (predicate-shaped rows).
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** `index.html:2510` still reads "(7-10)" while `renderPredicateFixtures` now has nine call sites spanning Sections 7-16 (2563, 2672, 2784, 2864, 2966, 3030, 3402, 3440, 3484), so the stale range is real — the count in the item's summary ("seven call sites") is low but the substance holds.
- **Counterfactual:** In-flight `TASK-035` step 2 already says it will "update `renderPredicateFixtures`'s header comment," but it names a different sentence in that comment, so the "(7-10)" range is not guaranteed to be swept there.

### A3. Fix hygiene issues in the "Preview header append order" fixture
- **Summary:** The header-order fixture's label claims to check two dividers but the predicate never asserts them, and one predicate carries a dead `!!el.querySelector` guard that can never be false — fix both.
- **Source-Sprint:** SPRINT-009
- **Rationale:** Deleting the static trailing divider — the exact element the new `RUNTIME-EXTENDED CONTAINER` HTML comment hangs its contract on — currently leaves this row green. Neither issue affects what the fixture catches today, but both are one-line fixes while the fixture is fresh.
- **Blast radius:** `index.html`, ~2 lines in the Section 11 `MODULE_TOGGLE_FIXTURES` array, trivial risk.
- **Source:** FIND-SPRINT-009-8 (TASK-030 code-reviewer)
- **Proposed change:**
  ```diff
        check() {
          const kids = Array.from(document.querySelector('.preview-header-left').children);
          const at = (pred) => kids.findIndex(pred);
  -       const vp = at(el => !!el.querySelector && !!el.querySelector('button[data-vp]'));
  +       const vp = at(el => el.querySelector('button[data-vp]'));
          const td = at(el => el.classList.contains('module-toggle') && el.textContent.includes('Test data'));
          const dm = at(el => el.id === 'darkModeSwitch');
          const pk = at(el => el.id === 'darkClientControl');
          const toggles = kids.filter(el => el.classList.contains('module-toggle')).length;
  -       return vp === 0 && vp < td && td < dm && dm < pk && toggles === 2;
  +       const dividers = kids.filter(el => el.classList.contains('divider')).length;
  +       return vp === 0 && vp < td && td < dm && dm < pk && toggles === 2 && dividers === 2;
        },
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Both defects confirmed at `index.html:2918-2929` — the dead `!!el.querySelector &&` guard operates on `Array.from(...children)` output that is always an Element, and the label names two dividers the predicate never checks; the proposed `dividers === 2` assertion matches reality (one static divider at `index.html:773`, one runtime divider at `index.html:4295`).

### A4. Harden the Section 12 live-picker-click fixture
- **Summary:** Replace the stale "index.html ~4183" line-number reference with a symbolic pointer, and make the fixture's mutation sensitivity unconditional by clicking two clients in sequence instead of one.
- **Source-Sprint:** SPRINT-009
- **Rationale:** This is the third line-number-style drift found this sprint (after FIND-1 and FIND-9). Separately, the fixture only kills the mutation (deleting `syncDarkNote()` from `wireSegControl`) when the harness opens with a non-Apple-Mail client already selected; a single click that happens to be a no-op leaves the row green with the wiring deleted.
- **Blast radius:** `index.html`, one fixture (`DARK_NOTE_FIXTURES`, the "Live picker click" entry), trivial-to-low risk — reuses the existing save/click/restore idiom already proven in the sibling fixture above it.
- **Source:** FIND-SPRINT-009-14 (TASK-031 verifier)
- **Proposed change:**
  ```diff
        check() {
          const switchEl = document.getElementById('darkModeSwitch');
          const picker = document.getElementById('darkClientControl');
          const savedOn = switchEl.classList.contains('on');
          const savedBtn = picker.querySelector('button[data-dm].active');
          try {
            if (!savedOn) switchEl.click();
            picker.querySelector('button[data-dm="applemail"]').click();
  -         return darkNote.textContent === DARK_MODE_CLIENT_NOTES.applemail && darkNote.hidden === false;
  +         const onApple = darkNote.textContent === DARK_MODE_CLIENT_NOTES.applemail && darkNote.hidden === false;
  +         picker.querySelector('button[data-dm="outlook"]').click();
  +         const onOutlook = darkNote.textContent === DARK_MODE_CLIENT_NOTES.outlook;
  +         return onApple && onOutlook;
          } finally {
            savedBtn.click();
            if (switchEl.classList.contains('on') !== savedOn) switchEl.click();
          }
        },
  -     description: '... deleting the syncDarkNote() call from the wireSegControl callback (index.html ~4183) would leave it green ... '
  +     description: '... deleting the syncDarkNote() call from the wireSegControl callback (the picker-click branch inside the dark-mode block) would leave it green ... ' // trim the "index.html ~4183" fragment, keep the rest of the sentence
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** The stale pointer is worse than claimed — the guarded `syncDarkNote()` call in the `wireSegControl` callback is now at `index.html:4332`, 149 lines from the "~4183" the description at `index.html:3026` still cites — and the single-click sensitivity gap is real, with `DARK_MODE_CLIENT_NOTES.outlook` available at `index.html:4090` for the second click.

### A5. Escape `failText` before interpolating it into harness row HTML
- **Summary:** `renderPredicateFixtures` escapes the fixture label and description but interpolates its `failText` parameter raw, which is inert today only because every caller currently passes a hardcoded literal.
- **Source-Sprint:** SPRINT-009
- **Rationale:** FIND-SPRINT-009-4 (bucket B1 below) proposes threading a computed reason string through this exact path for Section 8. Closing the escaping gap first means that future change can't introduce an HTML-injection surface into the harness DOM.
- **Blast radius:** `index.html`, 1 line, trivial risk.
- **Source:** FIND-SPRINT-009-12 (TASK-031 code-reviewer)
- **Proposed change:**
  ```diff
        '<div class="harness-field"><strong>Result:</strong> <code>' +
  -       (pass ? 'PASS' : failText) + '</code></div>';
  +       (pass ? 'PASS' : escapeHtml(failText)) + '</code></div>';
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Confirmed asymmetry at `index.html:2526-2530` — `fixture.label` and `fixture.description` both route through `escapeHtml` while `failText` is interpolated raw into `row.innerHTML`; one-line fix, and in-flight `TASK-035` keeps `renderPredicateFixtures` rather than replacing it, so the fix survives.

### A6. Dedupe repeated doc names in anchor-drift row labels
- **Summary:** When one doc anchors the same needle twice, its filename is pushed into the label's doc list once per occurrence instead of once per file, producing a cosmetic double-name label.
- **Source-Sprint:** SPRINT-009
- **Rationale:** Purely cosmetic (the row is a correct PASS, all 19 needles are still deduplicated as needles), but reads as a rendering bug to anyone scanning the section. One-line guard.
- **Blast radius:** `index.html`, 1 line in the Section 16 anchor-drift IIFE, trivial risk.
- **Source:** FIND-SPRINT-009-17 (TASK-032 verifier)
- **Proposed change:**
  ```diff
      for (const needle of found) {
        if (!seen.has(needle)) seen.set(needle, []);
  -     seen.get(needle).push(doc);
  +     if (!seen.get(needle).includes(doc)) seen.get(needle).push(doc);
      }
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Confirmed at `index.html:3461-3463` that `seen.get(needle).push(doc)` appends per occurrence, and `CODE-PATTERNS.md` does carry `grep \`function wireSegControl\`` twice (lines 65 and 98), so the doubled label is real; purely cosmetic but a one-line guard in an isolated block.

### A7. Derive `ANCHOR_DOCS` from `ANCHOR_FLOORS` instead of hand-keeping both in sync
- **Summary:** `ANCHOR_DOCS` and `ANCHOR_FLOORS` are two parallel constants naming the same four files; deriving one from the other removes the "add a file to one but not the other" drift trap.
- **Source-Sprint:** SPRINT-009
- **Rationale:** Today, adding a file to `ANCHOR_FLOORS` without adding it to `ANCHOR_DOCS` leaves that doc silently unscanned with no row and no failure — the same vacuous-green class the floors exist to close. Adding a file to `ANCHOR_DOCS` without `ANCHOR_FLOORS` fails loudly but confusingly (`undefined` in the label). Deriving one from the other closes the silent direction entirely.
- **Blast radius:** `index.html`, 2 lines, trivial risk — no behavior change today (the two constants are already identical key sets). Sequence this before or after A13's `ANCHOR_FLOORS['ARCHITECTURE.md']` bump; either order is safe since A13 only changes a value, not the key set.
- **Source:** FIND-SPRINT-009-19 (TASK-032 code-reviewer)
- **Proposed change:**
  ```diff
  - const ANCHOR_DOCS = ['README.md', 'CODE-PATTERNS.md', 'ARCHITECTURE.md', 'CLAUDE.md'];
    const ANCHOR_FLOORS = { 'README.md': 2, 'CODE-PATTERNS.md': 18, 'ARCHITECTURE.md': 2, 'CLAUDE.md': 1 };
  + const ANCHOR_DOCS = Object.keys(ANCHOR_FLOORS);
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Verified at `index.html:3414-3415` that `ANCHOR_DOCS` is exactly `Object.keys(ANCHOR_FLOORS)` today, and the silent-drift direction is real — `paths` at `index.html:3430` is built from `ANCHOR_DOCS` alone, so a floor added without a doc entry is never fetched and never rowed.

### A8. Make the anchor-drift guard fail loudly if row-building throws
- **Summary:** The guard's `try`/`catch` wraps only the fetch stage; a throw anywhere in the row-building code that follows renders an empty, heading-only section that reads as "nothing to check" instead of as a failure.
- **Source-Sprint:** SPRINT-009
- **Rationale:** This reintroduces, one level up, exactly the silent-vacuity failure mode `ANCHOR_FLOORS` was added to close — the floors defend against a doc losing its anchors, but nothing defends against the row-building code itself dying. The fetch-failure half is already solid (verified: 404 and `file://` paths each render one explanatory row, zero uncaught exceptions).
- **Blast radius:** `index.html`, one `try`/`catch` added around the existing row-building block inside the Section 16 IIFE, low risk (only affects the failure path).
- **Source:** FIND-SPRINT-009-16 (TASK-032 verifier)
- **Proposed change:**
  ```diff
      const src = sources['index.html'];
  -   const fixtures = [];
  -   const seen = new Map();
  -   for (const doc of ANCHOR_DOCS) { /* ...unchanged row-building... */ }
  -   /* ...unchanged undocumented-keys fixture... */
  -   renderPredicateFixtures(anchorSection, fixtures);
  +   try {
  +     const fixtures = [];
  +     const seen = new Map();
  +     for (const doc of ANCHOR_DOCS) { /* ...unchanged row-building... */ }
  +     /* ...unchanged undocumented-keys fixture... */
  +     renderPredicateFixtures(anchorSection, fixtures);
  +   } catch (err) {
  +     renderPredicateFixtures(anchorSection, [{
  +       label: 'Build the anchor-drift fixtures',
  +       check() { return false; },
  +       description: 'Row-building threw before any fixtures rendered (' + String((err && err.message) || err) + '). This is a bug in the guard itself, not a doc drift.',
  +     }], 'FAIL — guard crashed while building rows');
  +   }
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** low
- **Reasoning:** Confirmed the `try` ends at `index.html:3446` and the whole row-building block at `index.html:3448-3484` runs unguarded inside a fire-and-forget async IIFE, so a throw there is a silent unhandled rejection — and this exact block is the target of four other proposed edits (A6, A7, A9, B5), which is what raises this above pure speculation.
- **Counterfactual:** I could not identify any throwing path in the block as it stands today; if the four edits above are dropped, this becomes defensive code for a condition no current code path produces.

### A9. Scope the README schema fixture to the Templates section
- **Summary:** The schema fixture currently checks each live brand key against the whole fetched README rather than just its Templates section, so a key that happens to appear as an ordinary English word elsewhere in the file (README already contains `padding`, `image`, `label`, `html`, `data`, `check`) passes without ever being documented.
- **Source-Sprint:** SPRINT-009
- **Rationale:** Reachable, not theoretical — adding a brand key like `padding` or anything sharing a substring with existing prose is the most plausible future edit to the `templates` map, and it would leave this row green with the key undocumented. Verified the guard is not vacuous today (a genuinely novel key correctly reddens it).
- **Blast radius:** `index.html`, ~3 lines in the Section 16 IIFE, low risk — preserves the existing "no hardcoded key list" property.
- **Source:** FIND-SPRINT-009-15 (TASK-032 verifier)
- **Proposed change:**
  ```diff
      const tplKeys = [...new Set(Object.values(templates).flatMap(t => Object.keys(t)))];
  -   const undocumented = tplKeys.filter(k => !sources['README.md'].includes(k));
  +   const readmeSections = sources['README.md'].split(/^## /m);
  +   const templatesSection = readmeSections.find(s => s.startsWith('Templates')) || '';
  +   const undocumented = tplKeys.filter(k => !templatesSection.includes('`' + k + '`'));
    fixtures.push({
      label: 'README documents every key used by the templates map'
        + (undocumented.length ? ' — undocumented: ' + undocumented.join(', ') : ''),
      check: () => undocumented.length === 0,
      description: 'The schema list under README\'s Templates section must name every key present on any brand entry as inline code. ...',
    });
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** The hole is confirmed at `index.html:3476` (`!sources['README.md'].includes(k)`) and the tightened check is safe — all 13 live brand keys already appear as inline code inside README's `## Templates` section (lines 125-148), so scoping and backtick-matching will not false-redden the row.

### A10. Reduce the stale `TEMPLATE CONFIGS` banner comment to a pointer
- **Summary:** The banner comment above `const templates` is a second, hand-maintained copy of the brand-entry schema that is already stale (documents 8 keys, omits 5 live ones including two TASK-032 just added to README) and nothing guards it — replace it with a pointer to README instead of a second copy.
- **Source-Sprint:** SPRINT-009
- **Rationale:** README's Templates section now tells the reader to "scroll to the `TEMPLATE CONFIGS` block" to edit brand keys, so a developer following the documented path lands on the stale list rather than the freshly-reconciled one. A9's schema fixture polices only the README copy, so this comment will keep drifting if left as prose.
- **Blast radius:** `index.html`, one comment block (~13 lines replaced with ~5), trivial risk — comment-only, no behavior change.
- **Source:** FIND-SPRINT-009-20 (TASK-032 code-reviewer)
- **Proposed change:**
  ```diff
    // ============================================================
    // TEMPLATE CONFIGS — edit brand assets here.
  - //   bannerImageUrl     — publicly hosted image URL (CDN / SendGrid)
  - //   bannerHref         — optional; wraps banner in a clickable link
  - //   ctaBackgroundColor — brand hex, used for CTA button fill
  - //   ctaTextColor       — usually #ffffff
  - //   unsubscribeHtml    — standalone unsubscribe link (rendered as its own block,
  - //                        matches SendGrid's template pattern). Use {{{unsubscribe}}}.
  - //   disclosureHtml     — legal/compliance copy (address, dynamic fields, etc.)
  - //   ctaMicrocopyFontSize — mj-text font-size for the CTA's supporting sentence;
  - //                        shared default DEFAULT_CTA_MICROCOPY_FONT_SIZE ('13px').
  - //   ctaMicrocopyColor  — mj-text color for the CTA's supporting sentence;
  - //                        shared default DEFAULT_CTA_MICROCOPY_COLOR ('#6b6b6b').
  + // Brand entry schema is documented in README.md's "Templates" section;
  + // every key on any entry must appear there (enforced by the harness's
  + // Documentation anchor drift guard, Section 16). Do not duplicate the
  + // key list here — it drifts.
    // ============================================================
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Confirmed stale at `index.html:992-1003` (documents 8 keys, omits `name`, `bannerAlt`, `bannerWidth`, `bannerHtml`, `bannerBackgroundColor`), README's Templates section really does route the reader here via grep `TEMPLATE CONFIGS`, and the proposed diff keeps that anchor line intact so the drift guard's README anchor still resolves.
- **Counterfactual:** The uncommitted `lernerRowe` brand entry in the working tree is a live instance of a developer editing this exact block, which raises rather than lowers the value of the fix.

### A11. Center the CTA microcopy compose field to match its compiled output
- **Summary:** The CTA microcopy Quill editor renders flush-left while its compiled output is always centered, so the compose field visually lies about what it produces — add the missing CSS rule and a regression fixture.
- **Source-Sprint:** SPRINT-009
- **Rationale:** Verified in a headless run: typing into `#ctaMicrocopy` shows flush-left text while `buildMicrocopyBlock` always passes `align: 'center'` to `richTextToMjText`. The marketer isn't blind to this (the preview iframe shows the true result), but it's the kind of divergence that generates "why did it move" support questions. Every other editor in the app agrees with its own output.
- **Blast radius:** `index.html`, one CSS rule near the existing `.rich-editor-wrap .ql-editor` rules, plus one new fixture in `MICROCOPY_DOM_GUARDS`. Low risk, visual-only.
- **Source:** FIND-SPRINT-009-21 (TASK-033 verifier)
- **Proposed change:**
  ```diff
    .rich-editor-wrap.compact .ql-editor { min-height: 64px; }
  + #ctaMicrocopy .ql-editor { text-align: center; }
  ```
  And in `MICROCOPY_DOM_GUARDS`:
  ```diff
  + {
  +   label: 'CTA microcopy compose field previews its own centered alignment',
  +   check() {
  +     return getComputedStyle(document.querySelector('#ctaMicrocopy .ql-editor')).textAlign === 'center';
  +   },
  +   description: 'buildMicrocopyBlock always passes align: \'center\' to richTextToMjText; the compose field must match so the marketer sees what will ship.',
  + },
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Verified `buildMicrocopyBlock` passes `align: 'center'` at `index.html:1738` while no CSS rule targets `#ctaMicrocopy .ql-editor` (only the generic `.rich-editor-wrap .ql-editor` rules at `index.html:162-174`), so the divergence is real and the fix is one CSS line plus one fixture.
- **Counterfactual:** The proposed fixture hardcodes `'center'` rather than deriving it from what `buildMicrocopyBlock` passes, so it will not catch a future change that makes the output alignment brand-configurable — a weaker guard than FIND-21 asked for, but not a reason to skip the CSS rule.

### A12. Repair CHANGELOG.md's harness-section bookkeeping
- **Summary:** Add the missing CHANGELOG entries for TASK-030 and TASK-032, fix the 2026-08-11 entry's now-inaccurate description of the dark-mode switch, and add the "Test harness Section 12" bullet the existing dark-mode-caption entry's own cross-reference already promises.
- **Source-Sprint:** SPRINT-009
- **Rationale:** Two of the sprint's five tasks (TASK-030, TASK-032) left no CHANGELOG trace despite shipping changes at the same level of detail the file documents elsewhere (a public factory signature change; a new 90-line harness section plus a README reconciliation). The 2026-08-11 entry's line "flips a preview-only `darkModeEnabled` flag" describes a control TASK-030 deleted. The 2026-08-12 dark-mode-caption entry's closing cross-reference ("see the 2026-08-12 dark-mode caption entry above") points at itself and finds nothing about harness sections, because that entry never got one.
- **Blast radius:** `CHANGELOG.md` only, one amended sentence + one new bullet + one new dated entry. Trivial risk (documentation only). Look up exact commit dates via `git log --date=short -1 cd3b4ba` (TASK-030) and `git log --date=short -1 343e542` (TASK-032) before dating the new entry.
- **Source:** FIND-SPRINT-009-11 (TASK-031 verifier), FIND-SPRINT-009-25 (SPRINT-009 sprint-code-reviewer)
- **Proposed change:**
  ```diff
  ## 2026-08-11 — Dark mode preview simulation (Gmail / Outlook / Apple Mail)
  ...
  - **Dark mode switch + client picker.** New `module-toggle` in the preview header (next to the Test data toggle) flips a preview-only `darkModeEnabled` flag; ...
  + **Dark mode switch + client picker.** New `module-toggle` in the preview header (next to the Test data toggle) flips a preview-only dark-mode flag; ... (Later rebuilt on the `createModuleToggle` factory with a persistence opt-out — see "{new entry date} — Module toggle factory gains a persistence opt-out" below.)
  ```
  ```diff
  ## 2026-08-12 — Dark mode preview: visible client caption
  ### Added
  - **Dark-mode disclosure caption.** ... (unchanged)
  + **Test harness Section 12** ("Dark-mode disclosure caption") — 4 fixtures covering per-client caption text, hidden-when-off, and live-click coverage of both mutation paths (the `#darkModeSwitch` toggle and the `#darkClientControl` picker), so a dropped `syncDarkNote()` call on either path fails loudly.
  ```
  ```diff
  + ## {date via git log -1 --date=short cd3b4ba / 343e542} — Module toggle factory gains a persistence opt-out; documentation anchor drift guard
  +
  + ### Changed
  + - **`createModuleToggle(id, label, defaultOn, onChange, persist = true)`** gained a 5th parameter; `persist: false` makes a toggle session-only (no localStorage read or write). The hand-rolled dark-mode switch was retired in favor of a factory call using this opt-out. CTA, Promo, and Test data callers are unaffected.
  +
  + ### Added
  + - **Test harness Section 16 "Documentation anchor drift guard."** Fetches README.md, CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and index.html at runtime, extracts every grep-anchor, and asserts each resolves in index.html; also asserts README's Templates schema list names every live template key.
  + - README's Templates schema list reconciled with the live `templates` map (added `name`, `bannerHtml`, `bannerBackgroundColor`).
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The core gap is confirmed — `git log` shows only 0bf9b49 and 341b5e1 touched CHANGELOG.md this sprint, so TASK-030's `persist` signature change (cd3b4ba, 2026-08-13) and TASK-032's Section 16 (343e542, 2026-08-13) have no entry, and the dangling cross-reference at `CHANGELOG.md:33` does point at an entry (line 13) that says nothing about harness sections.
- **Counterfactual:** The "describes a control TASK-030 deleted" claim is overstated — `let darkModeEnabled` is still live at `index.html:1940` and `onDarkModeToggle` still flips it, so the 2026-08-11 sentence is incomplete rather than false; treat that amendment as optional and the missing entry as the load-bearing half.

### A13. Update ARCHITECTURE.md's three stale bullets from the dark-mode epic
- **Summary:** ARCHITECTURE.md's dark-mode, UI controls, and Data Model bullets predate this sprint's caption, factory migration, and persistence opt-out — update all three in one edit and bump the anchor-drift guard's floor for the two new anchors.
- **Source-Sprint:** SPRINT-009
- **Rationale:** ARCHITECTURE.md is the one entry doc CLAUDE.md points at that no task in this sprint reconciled, even though TASK-032 built the very guard meant to keep docs honest. The guard only checks that existing anchors still resolve — it cannot catch prose describing a component that's since changed, which is exactly what happened here (dark-mode bullet omits `#darkNote`/`DARK_MODE_CLIENT_NOTES`, the primary disclosure surface per TASK-031's own code comment; UI controls bullet never mentions `createModuleToggle`, now the factory behind all four toggles; Data Model's `localStorage` line is now conditional on `persist`).
- **Blast radius:** `ARCHITECTURE.md` (3 bullets) + `index.html` (1 constant value). Trivial risk, documentation plus a number change.
- **Source:** FIND-SPRINT-009-26 (SPRINT-009 sprint-code-reviewer)
- **Proposed change:**
  ```diff
  - **Dark-mode preview simulation** — ... Preview only — never touches `lastHtml`.
  + **Dark-mode preview simulation** — ... Preview only — never touches `lastHtml`. The `#darkNote` caption, sourced from a single map (grep `const DARK_MODE_CLIENT_NOTES`), is the primary disclosure that a simulation is running — visible text announced to screen readers via `role="status"`, not just a hover title.
  ```
  ```diff
  - **UI controls** — `wireSegControl()` registers groups of `.seg-control button` elements as mutually exclusive toggles. `updateCtaPreview()` mirrors the active CTA button style live in the form panel.
  + **UI controls** — `wireSegControl()` registers groups of `.seg-control button` elements as mutually exclusive toggles. `updateCtaPreview()` mirrors the active CTA button style live in the form panel. `createModuleToggle()` (grep `function createModuleToggle`) is the shared factory behind all four module toggles (CTA, Promo, Test data, Dark mode) and takes a `persist` flag so a toggle can opt out of `localStorage`.
  ```
  ```diff
  - `localStorage` (test data JSON and toggle state)
  + `localStorage` (test data JSON and persisting toggle state — a toggle built with `persist: false`, e.g. Dark mode, neither reads nor writes it)
  ```
  ```diff
  - const ANCHOR_FLOORS = { 'README.md': 2, 'CODE-PATTERNS.md': 18, 'ARCHITECTURE.md': 2, 'CLAUDE.md': 1 };
  + const ANCHOR_FLOORS = { 'README.md': 2, 'CODE-PATTERNS.md': 18, 'ARCHITECTURE.md': 4, 'CLAUDE.md': 1 };
  ```
  (Floor rises from 2 to 4: the two existing anchors — `const templates`, `id="preview"` — plus the two new ones added above.)

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** All three bullets verified stale (`ARCHITECTURE.md:27` omits `#darkNote`/`DARK_MODE_CLIENT_NOTES`, `:30` never names `createModuleToggle` despite it backing all four toggles at `index.html:4282/4325/4416/4425`, `:47` states `localStorage` toggle state unconditionally), and the floor arithmetic checks out — ARCHITECTURE.md carries exactly 2 anchors today and both new needles resolve in production code (`index.html:4090`, `index.html:4344`).

## B. Backlog tasks (refine into execution-ready plans)

### B1. Surface which half of the Section 8 purity guard failed
- **Summary:** Section 8's purity guard asserts two independent invariants (`previewIsTransformed && exportIsPure`) under one FAIL badge, so a reader can't tell from the harness alone whether the transform stopped running or leaked into export.
- **Source-Sprint:** SPRINT-009
- **Source:** FIND-SPRINT-009-4 (TASK-029 code-reviewer)
- **Problem:** In `DARK_MODE_FIXTURES` (`index.html`, the "Preview-only purity guard" fixture, ~line 2631), `check()` returns a single boolean combining `previewIsTransformed` (did the dark transform run at all) and `exportIsPure` (did it leak into `lastHtml`). These fail for opposite reasons, and this harness is the repo's only test surface, so the undifferentiated badge is the entire failure signal a developer gets. The plan's own Lowest Confidence Area anticipated exactly this: "a developer would have to know to look at the ordinary preview to see the real cause."
- **Proposed direction:** When a task next touches Section 8, have `check()` stash a reason string (e.g., on a closure variable read back by the row, or by changing the fixture shape to return `{ pass, reason }` and updating `renderPredicateFixtures` to consume it) and surface it via the `failText` path added for `MICROCOPY_DOM_GUARDS`. Do not split into two fixtures — that would double the forced `render()` calls this section already makes (see B6). Do not weaken the combined assertion; both halves must still be required to pass.
- **Scope:** small

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The diagnostic gap is already largely closed by the row's own rendered `description` field (`index.html:2530` renders it on every row, and the Section 8 description at `index.html:2656` plus the inline comment at `index.html:2648-2649` name both invariants explicitly), so the fix buys a marginal improvement on a guard that has never failed while changing a fixture contract that in-flight `TASK-035` is concurrently restructuring.
- **Counterfactual:** If this guard actually goes red in a future sprint and the developer misdiagnoses it, the reason-string plumbing becomes worth its cost.

### B2. Harden `createModuleToggle`'s localStorage access
- **Summary:** `createModuleToggle`'s `localStorage.getItem`/`setItem` calls are unguarded, so a browser that throws on storage access (blocked site data, hardened profile) aborts the entire module-init sequence — no toggles, dead app.
- **Source-Sprint:** SPRINT-009
- **Source:** FIND-SPRINT-009-7 (TASK-030 verifier)
- **Problem:** `index.html`'s `createModuleToggle` (grep `function createModuleToggle`) reads storage at `const stored = persist ? localStorage.getItem(key) : null;` and writes at `if (persist) localStorage.setItem(key, String(state));` inside `flip()` — both unguarded. The pre-existing migration shim immediately above the factory was already hardened with try/catch for exactly this hazard, so the file is now inconsistent about a risk it has already acknowledged once. TASK-030's own plan explicitly deferred this as "worth its own backlog item" to keep its acceptance criteria clean. The new `persist = false` path (Dark mode) narrows the blast radius slightly since that caller never touches storage.
- **Proposed direction:** Wrap the read in a try/catch that falls back to `null` (yielding `defaultOn`), and wrap the write in a try/catch that silently no-ops, mirroring the comment style of the existing migration shim a few lines above the factory. Add a harness fixture that stubs `localStorage.getItem` to throw and asserts the factory still returns a usable, clickable toggle.
- **Scope:** small

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** high
- **Reasoning:** Both call sites are confirmed unguarded (`index.html:4346` read, `index.html:4377` write inside `flip()`) while the migration shim 80 lines above at `index.html:4265-4277` already carries a `try`/`catch` whose own comment names the exact hazard ("hardened profile, extension stub — degrade to createModuleToggle's own defaultOn value instead of aborting the rest of module init"), so the file has already acknowledged this risk once and left the factory inconsistent with it.

### B3. Extract a shared `harnessSection(body, title)` helper for the 16 duplicated headers
- **Summary:** Every harness section opens with the same four-line `h3` + inline-style-literal + `textContent` + `appendChild` block, now duplicated 16 times and still growing — extract one helper next to `renderPredicateFixtures`.
- **Source-Sprint:** SPRINT-009
- **Source:** FIND-SPRINT-009-13 (TASK-031 code-reviewer)
- **Problem:** `index.html` contains 16 occurrences of `document.createElement('h3')` followed by an identical 5-property `style.cssText` literal, byte-identical apart from heading text and variable name (`h1` through `h16`). This is the header-shaped twin of the row-loop duplication `renderPredicateFixtures` already retired. The styling literal is the drift surface — a single restyle currently means 16 edits — and the `hN` variable names are exactly what had to be renumbered by hand during TASK-031's section-reordering work (FIND-SPRINT-009-6).
- **Proposed direction:** Add `function harnessSection(body, title) { const h = document.createElement('h3'); h.style.cssText = '...'; h.textContent = title; body.appendChild(h); }` next to `renderPredicateFixtures` (~line 2519), then replace all 16 `const hN = ...; hN.style.cssText = ...; hN.textContent = ...; body.appendChild(hN);` blocks with `harnessSection(body, '...')`. This also removes the `hN` variable names entirely, so section reordering never requires renaming again.
- **Scope:** medium

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** high
- **Reasoning:** Already in flight — `.soloflow/active/plans/harness-hygiene/TASK-035-plan.md` is an approved, `ready` plan whose first two acceptance criteria are verbatim this proposal ("grep `function harnessSection` … returns exactly one definition" and "grep -c `document.createElement('h3')` returns 1"), and its step 2 co-locates the helper next to `renderPredicateFixtures` exactly as proposed.

### B4. Give dark-mode state one owner instead of two
- **Summary:** Dark-mode on/off now has two sources of truth — the `createModuleToggle` factory's internal state (exposed as `darkModeToggle.isOn()`, currently dead code with zero call sites) and a parallel module-global `darkModeEnabled` mirror that eleven harness sites assign directly — pick one and delete the other.
- **Source-Sprint:** SPRINT-009
- **Source:** FIND-SPRINT-009-23 (SPRINT-009 sprint-code-reviewer)
- **Problem:** TASK-030 rebuilt the dark-mode switch on `createModuleToggle` (`index.html`, `const darkModeToggle = createModuleToggle('darkMode', ...)`), so the authoritative state is the factory's closure, but the pre-existing `let darkModeEnabled` (declared near line 1940) was kept and is still what `applyDarkMode` and `syncDarkNote` read; `onDarkModeToggle` (grep `function onDarkModeToggle`) writes both concepts by assigning `darkModeEnabled = isOn` while `darkModeToggle.isOn()` sits unread anywhere. Confirmed via grep: `darkModeToggle.isOn(` has zero call sites in the file. Meanwhile eleven harness fixtures across `DARK_MODE_FIXTURES` and `DARK_NOTE_FIXTURES` assign `darkModeEnabled`/`darkModeClient` directly instead of driving the real toggle, so a sixth side effect added to `onDarkModeToggle` in the future would be invisible to every one of them, and several of those fixtures put the app into states production can never reach (e.g. `darkModeEnabled === true` while `#darkNote` is still hidden). This also splits the codebase's own convention: `ctaToggle`/`promoToggle` are read via `isOn()` directly with no mirror.
- **Proposed direction:** Delete `let darkModeEnabled`; have `applyDarkMode` and `syncDarkNote` read `darkModeToggle.isOn()` instead. Add a `set(bool)` method to `createModuleToggle`'s return object that routes through the same `sync()` + `onChange()` path `flip()` uses, so harness fixtures can force state without bypassing the setter. Rewrite the direct-assignment sites in `DARK_MODE_FIXTURES` (~lines 2580, 2584, 2641-2642, 2651-2652) and `DARK_NOTE_FIXTURES` (~lines 2997-3005) to call the new setter. Pairs with C2 below, which documents the pattern this fix establishes.
- **Scope:** medium

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The proposed direction is broken as written — `createModuleToggle` calls `onChange(state)` during construction at `index.html:4392`, so `onDarkModeToggle` runs while the `const darkModeToggle` binding at `index.html:4325` is still in TDZ, and having `syncDarkNote` read `darkModeToggle.isOn()` would throw a ReferenceError at init; the mirror is load-bearing, not accidental, and the finding's own cheaper alternative (comment the seam plus one `isOn() === darkModeEnabled` invariant fixture) is unpriced here.
- **Counterfactual:** A direction that passes `isOn` into `syncDarkNote` as a parameter, or defers the construction-time sync, would sidestep the TDZ and make the single-owner refactor viable.

### B5. Scope the anchor-drift guard's needle search to production code only
- **Summary:** The Section 16 anchor-drift guard searches the entire fetched `index.html` source for each doc-anchor needle, including the test harness's own body and HTML comments, so a needle that only appears in harness fixture code or a comment can pass even after every real call site is deleted.
- **Source-Sprint:** SPRINT-009
- **Source:** FIND-SPRINT-009-24 (SPRINT-009 sprint-code-reviewer)
- **Problem:** CODE-PATTERNS.md anchors `createModuleToggle('`. That string occurs 8 times in `index.html` today; 4 are not production code — one HTML comment (~line 767) and three harness probe calls in `MODULE_TOGGLE_FIXTURES` (`__harnessProbeA/B/C`, ~lines 2885/2898/2910). Deleting all four real call sites (in `onDarkModeToggle`'s construction, CTA, Promo, and Test-data wiring) would leave the anchor-drift row green. The guard's own header comment explicitly warns "DO NOT write any anchor needle as a literal anywhere in this file" and names the exact vacuous-pass trap (FIND-SPRINT-007-7) this violates — but the violation predates the guard (TASK-030's probes landed before TASK-032's guard existed), so neither per-task reviewer could see it. A second, older instance predates the sprint: `.seg-body` occurs 4 times, 2 of which are harness fixture strings, so the CSS rule backing `.seg-body` could be deleted with that row still green.
- **Proposed direction:** In the Section 16 IIFE (`index.html`, async function starting `const paths = ANCHOR_DOCS.concat(['index.html'])`), slice `src` at the `function renderTestHarness(` offset (and again at its closing brace) and run `includes(needle)` only against the region outside the harness body, then strip HTML comments (`<!-- ... -->`) from what remains before matching. If precisely bounding the harness function is too fragile with a regex, a lighter alternative is to rename the harness's own probe ids to a spelling no real needle can match (e.g. `__harnessProbeA` → something that can never collide with a doc anchor by construction) and add a fixture asserting `createModuleToggle('` occurs at least N times outside the harness body.
- **Scope:** small-medium — the risk is in correctly bounding "the harness body" without false-negatives; needs care and its own regression fixture before landing.

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Both vacuous-pass instances verified — `createModuleToggle('` occurs 8 times in `index.html` with only 4 in production (comment at `:767`, probes at `:2885`, `:2898`, `:2910`), and `.seg-body` occurs 4 times with 2 being harness fixture strings at `:3379`/`:3381` — so the guard added specifically to close the FIND-SPRINT-007-7 trap is already defeated on two of its own needles, which is a correctness defect in the guard rather than a nicety.
- **Counterfactual:** If bounding the harness body proves fragile in the plan, the item's own lighter fallback (rename the probe ids plus an occurrence-count fixture) is a valid smaller landing.

### B6. Reduce the test harness's live side effects on the running app
- **Summary:** Three tasks each added "just one" live-DOM fixture this sprint, and the aggregate now makes opening the harness (Ctrl+Shift+T) visibly flip the preview into dark mode and back, plus re-fetch the app's own source files on every open — cheap individually, but a new class of side effect a dev tool didn't have before.
- **Source-Sprint:** SPRINT-009
- **Source:** FIND-SPRINT-009-27 (SPRINT-009 sprint-code-reviewer)
- **Problem:** Section 8's purity guard (`DARK_MODE_FIXTURES`) forces `darkModeEnabled`/`darkModeClient` and calls the synchronous `render()` twice (body + `finally`) — two full `mjml2html` compiles. Section 11's live-click fixture (`MODULE_TOGGLE_FIXTURES`) clicks the real `#darkModeSwitch` twice. Section 12's live-picker fixture (`DARK_NOTE_FIXTURES`) clicks the real Apple Mail picker button plus a restore click (and, per A4 above, will click a second client too). Section 16 fetches README.md, CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md, and index.html with `cache: 'no-store'` on every harness open. Every fixture restores state correctly (no breakage), but the preview iframe visibly flickers into and out of dark mode while the harness renders — a side effect a purely string-in/string-out test surface never had before this sprint. No single per-task reviewer could weigh this because each saw one addition against a baseline that still looked cheap.
- **Proposed direction:** Two independent, cheap mitigations, both local to `renderTestHarness()`: (1) hide the visible churn by setting `#previewStage`'s visibility to hidden for the duration of the Section 11/12 live-DOM fixtures and restoring it in the same `finally` blocks that already restore toggle state; (2) skip Section 8's second `render()` call when the saved state didn't actually change (`if (savedEnabled !== true || savedClient !== 'gmail') render();`), and give Section 16's fetch a module-level cache keyed by path so repeated harness opens in one session don't re-download index.html's own source every time.
- **Scope:** small-medium

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The finding itself grades this "cost and surprise, not breakage" (every fixture verified restoring correctly), and one of the three proposed mitigations actively degrades the feature it touches — the `cache: 'no-store'` at `index.html:3434` is what lets an edited doc be re-checked by reopening the harness, so a session cache keyed by path would make the anchor-drift guard report stale results in exactly the edit-doc-then-recheck loop it exists for.
- **Counterfactual:** If the flicker is reported as actually confusing during use, mitigation (1) alone — visibility hiding in the existing `finally` blocks — would clear the bar; the render-gating and fetch-cache halves would not.

## C. CLAUDE.md / CODE-PATTERNS.md improvements (apply now)

_Pre-reviewed by claude-md-reviewer: original C1 was split into a CLAUDE.md rule (C1) and a CODE-PATTERNS.md caveat (C2); original C2 became C3 with rewritten prose. All three ready, none rejected._

### C1. Require CHANGELOG.md and ARCHITECTURE.md updates alongside behavior changes
- **Summary:** Add a CLAUDE.md convention stating that any change to a shared helper's signature, a UI control, or persistence behavior must update CHANGELOG.md and the relevant ARCHITECTURE.md bullet in the same commit — this sprint shipped two substantive changes with neither.
- **Source-Sprint:** SPRINT-009
- **Status:** ready
- **source_item:** C1
- **Target file:** `CLAUDE.md`
- **Action:** insert-after the **Library errors must be humanized before display** bullet in `## Conventions`
- **Rationale:** FIND-SPRINT-009-25 found that 2 of SPRINT-009's 5 tasks (TASK-030's `createModuleToggle` signature change and dark-mode migration; TASK-032's new harness Section 16 and README reconciliation) left no CHANGELOG.md trace, and an existing entry (2026-08-11) went stale describing a control that TASK-030 later deleted. FIND-SPRINT-009-26 found ARCHITECTURE.md's dark-mode, UI-controls, and Data-Model bullets all went stale across the same three tasks, invisible to the anchor-drift guard which checks only that anchors resolve.
- **Diff:**
  ```diff
   - **Library errors must be humanized before display.** Never show raw exception messages from Handlebars, MJML, or other CDN libraries to the user. Use a named function (following the `humanizeTemplateError` pattern in `index.html` — grep `function humanizeTemplateError`) that pattern-matches known error shapes and returns plain-English action-oriented messages. Line numbers that refer to compiled HTML the marketer never sees must be stripped. Compiler tokens (`CLOSE_BLOCK`, `EOF`, `ID`) must be translated to concrete instructions.
  +
  +- **Behavior changes ship with their docs, in the same commit.** If a change alters a shared helper's signature, adds or removes a UI control, or changes what reads/writes `localStorage`, it must also add a dated CHANGELOG.md entry and correct the affected ARCHITECTURE.md bullet (*Major Components / Layers* or *Data Model*). The Ctrl+Shift+T anchor-drift guard will not catch stale prose — see "Documentation Conventions" in [CODE-PATTERNS.md](CODE-PATTERNS.md).
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Four separate findings in this sprint (FIND-11, -22, -25, -26) hit the same gap and the harm is concrete rather than cosmetic — a documented public factory signature change (cd3b4ba) and a 90-line harness section (343e542) both shipped with no CHANGELOG trace while `ARCHITECTURE.md:30` still omits the factory behind all four toggles — and the cost is one bullet in a `## Conventions` section that currently holds exactly one, scoped narrowly enough (signature / UI control / `localStorage`) to be checkable rather than a vague "keep docs updated".
- **Counterfactual:** If the CHANGELOG gap turns out to be an artifact of the SoloFlow routing defect already logged as FIND-SPRINT-009-22 rather than of missing guidance, the rule buys nothing the planner fix wouldn't.

### C2. Anchor-drift guard does not validate surrounding prose (split from original C1)
- **Summary:** Record in CODE-PATTERNS.md that the harness's anchor-drift guard only checks that grep anchors resolve, so an anchored doc bullet can pass green while its description is obsolete.
- **Source-Sprint:** SPRINT-009
- **Status:** ready
- **source_item:** C1
- **Target file:** `CODE-PATTERNS.md`
- **Action:** append to the end of the **Doc anchors, not line numbers** bullet
- **Diff:**
  ```diff
  -- **Doc anchors, not line numbers.** CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and README.md point at code with a greppable needle in the form grep `function wireSegControl` — a function name, an element id, or a unique call expression. Line-number pointers rot silently and were all removed in commit 043ee5d after drifting 400–1500 lines. Anchors still break when an identifier is renamed, so the Ctrl+Shift+T harness's *Documentation anchor drift guard* section extracts every anchor from these four files at runtime and fails if one no longer resolves in `index.html`. When you rename an anchored identifier, update the doc in the same commit.
  +- **Doc anchors, not line numbers.** CODE-PATTERNS.md, ARCHITECTURE.md, CLAUDE.md and README.md point at code with a greppable needle in the form grep `function wireSegControl` — a function name, an element id, or a unique call expression. Line-number pointers rot silently and were all removed in commit 043ee5d after drifting 400–1500 lines. Anchors still break when an identifier is renamed, so the Ctrl+Shift+T harness's *Documentation anchor drift guard* section extracts every anchor from these four files at runtime and fails if one no longer resolves in `index.html`. When you rename an anchored identifier, update the doc in the same commit. The guard checks anchor *resolution* only — a bullet whose anchor still resolves while the prose around it describes deleted or changed behavior passes green (ARCHITECTURE.md's dark-mode, UI-control and Data Model bullets all drifted that way in SPRINT-009), so re-read the sentence around an anchor, not just the anchor.
  ```

### Skeptic Verdict
- **Verdict:** IMPLEMENT
- **Confidence:** medium
- **Reasoning:** The claim is exactly true of the shipped guard — `check: () => src.includes(needle)` at `index.html:3470` is the only assertion, and three `ARCHITECTURE.md` bullets (`:27`, `:30`, `:47`) demonstrably drifted while both of that file's anchors kept resolving — and the fix extends an existing bullet at `CODE-PATTERNS.md:98` by one sentence rather than adding a new rule, so the attention-budget cost is near-zero.

### C3. Document the "one owner per toggle state" pattern for `createModuleToggle`
- **Summary:** Add a CODE-PATTERNS.md gotcha warning against mirroring a module toggle's `isOn()` state into a second module-scope variable, and against wiring a derived side effect to only one of several state-changing controls.
- **Source-Sprint:** SPRINT-009
- **Status:** ready
- **source_item:** C2
- **Target file:** `CODE-PATTERNS.md`
- **Action:** insert-after the **Gotcha — onChange fires during construction** bullet in `### createModuleToggle`
- **Rationale:** FIND-SPRINT-009-23 found the dark-mode migration kept a pre-existing `let darkModeEnabled` mirror doing all the real work while `darkModeToggle.isOn()` has zero call sites — unlike CTA/Promo/Test-data which read `isOn()` directly. TASK-031's code review caught the related missed-call-site bug (`syncDarkNote()` wired to the switch but not the picker). Reviewer note: prose rewritten because the compounder's draft was self-contradictory (implied the mirror was already fixed; `darkModeEnabled` is still live at index.html:1940, so dark mode is labeled the counter-example). Pairs with B4, which fixes the code.
- **Diff:**
  ```diff
   - **Gotcha — onChange fires during construction:** the callback runs once *inside* the factory, before the caller can insert `element` into the DOM. Anything the callback touches must already exist. The dark-mode caller handles this by inserting its client picker first, then `insertBefore`-ing the toggle ahead of it.
  +- **Gotcha — one source of truth per toggle:** read state through `toggle.isOn()` at every call site; never mirror it into a module-scope flag kept in sync from `onChange`. The dark-mode caller is the counter-example to copy from, not follow — `let darkModeEnabled` does all the real work while `darkModeToggle.isOn()` has zero call sites, unlike the CTA and Promo toggles. When a derived side effect depends on the toggle *and* on another control (`syncDarkNote()` depends on both the switch and the client picker), call the sync function from every control that can change the combined state, not just `onChange` — a missed second call site leaves derived UI stale and review has missed it before.
  ```

### Skeptic Verdict
- **Verdict:** DONT_IMPLEMENT
- **Confidence:** medium
- **Reasoning:** Rule drift on both counts — the absolute prohibition ("never mirror it into a module-scope flag") contradicts the gotcha it would sit directly beneath at `CODE-PATTERNS.md:69`, because `onChange` fires during construction at `index.html:4392` and a `syncDarkNote` reading `darkModeToggle.isOn()` would throw a TDZ ReferenceError; and it frames dark mode as the lone counter-example when `testDataEnabled` (`index.html:1930`, written at `:4279`, read at `:3558`) is a second unacknowledged mirror with `testDataToggle.isOn()` equally uncalled, making the split 2-vs-2 rather than 3-vs-1.
- **Counterfactual:** A version that states the rule conditionally — read `isOn()` unless the callback runs during construction, in which case pass state in as a parameter — and names both mirrors would clear the bar.

## Suppressed — SoloFlow Defects

These findings describe defects in SoloFlow's own planner/orchestrator behavior, not this project's code or conventions. Per the compounder's self-defect check, they are excluded from Bucket C to avoid polluting CLAUDE.md with plugin-specific workaround lore. Tester mode was off for this run, so they could not be routed to Bucket D either.

- **Plans use whole-file absolute `grep -c` counts as acceptance-criteria gates against a file other tasks are concurrently growing, and the counts go stale before the task even executes.** Three separate instances in one sprint (FIND-SPRINT-009-3, TASK-029's plan; FIND-SPRINT-009-5, TASK-030's plan, which additionally contradicted its own step 6; FIND-SPRINT-009-10, TASK-031's plan, which contradicted its own step 9 and only avoided cost by accident of verb tense). All three findings explicitly recommend a planner-prompt change ("prefer scoped/relative gates," "cross-check a grep-based completeness gate against the plan's own prescribed replacement text before the plan is issued"). Consider opening an issue or running `/sf:compound --tester` against this sprint in a SoloFlow-tester setup to surface it as a maintainer recommendation.
- **`sprint.json` declared `execution_mode: "serial"` while two tasks (TASK-032, TASK-033) were `in_progress` simultaneously, and TASK-033's executor wrote to the shared working tree while TASK-032's verifier was still running headless checks against it.** (FIND-SPRINT-009-18.) Verification stayed sound only by accident of timing, proven after the fact via a byte-identical sandbox comparison. The finding's own suggested action targets the verifier's checkout strategy and the orchestrator's task-sequencing guarantee, not this project's code. Consider opening an issue or running `/sf:compound --tester` against this sprint in a SoloFlow-tester setup to surface it as a maintainer recommendation.
- **Findings whose `suggested_action` is addressed to "whichever task next owns file X" are not reaching the planner, so they silently expire even when a later task does own that file.** (FIND-SPRINT-009-22.) Concrete instance: FIND-SPRINT-009-11 asked whichever task next owns CHANGELOG.md to add a bullet; TASK-033 owned CHANGELOG.md and edited it, but its plan never referenced the findings queue, so the finding stayed open (addressed in A12 above as a one-time cleanup). The finding's own suggested action is "have the planner grep the active findings file for open entries whose location/suggested_action names a file in the new task's files_owned" — a planner behavior change, not a project convention. Consider opening an issue or running `/sf:compound --tester` against this sprint in a SoloFlow-tester setup to surface it as a maintainer recommendation.
