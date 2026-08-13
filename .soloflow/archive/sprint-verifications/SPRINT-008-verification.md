---
sprint: SPRINT-008
visual_mobile: not_applicable
visual_web:    not_applicable
regressions_count: 0
flows_tested: 0
flows_deferred: 0
---

# SPRINT-008 sprint verification (epic: cta-microcopy)

- Base SHA: `c3159f19f170df4ea2fcb797f6d574fd361ceb2b`
- Run branch: `soloflow/run-20260812-135829-SPRINT-008` (21 commits, TASK-025..TASK-028)
- Tasks: TASK-025 (italic), TASK-026 (`richTextToMjText` opts), TASK-027 (microcopy editor + emission), TASK-028 (docs)
- Verdict: **PASS** — zero cross-task regressions.

Note: the visual_* fields are `not_applicable` (SoloFlow-Lite has no visual pass).

## Integration Tests

### 1. Full harness on sprint head
Ran the entire in-app harness (`renderTestHarness()`, Ctrl+Shift+T) against the working tree
via headless Chrome, counting leaf elements whose trimmed text is exactly `PASS`/`FAIL`.

| Metric | Result |
|---|---|
| PASS badges | **211** |
| FAIL badges | **0** |
| Uncaught page errors | **0** |
| Console errors | **0** |

The single "stray FAIL" hit is the `<script type="module">` source text itself (the literal
string `FAIL` inside harness code), not a rendered badge.

### 2. Cross-task interaction probes

**2a. Italic (025) through opts renderer (026) into microcopy emission (027) — PASS**
Italic typed inside microcopy comes out both muted and italic; the muted styling does not
clobber the italic span. Compiled evidence (all 3 brands tested):

```
...font-size:13px;...color:#6b6b6b;"><p style="margin:0;">No obligation —
<em style="font-style:italic;">completely free</em>. See
<a href="https://example.com/terms" ... style="color:#6b6b6b;text-decoration:underline;">terms</a>
or call <a href="tel:5559876543" style="color:#6b6b6b;..." data-autolinked="phone">555-987-6543</a>.</p>
```

**2b. Typed bullets — PASS**
In a single document: body copy still converts a typed-bullet run to a real list
(`<ul>` emitted, "Fast response times" present), while microcopy keeps the literal glyph —
`<p style="margin:0;">* Terms and conditions apply.</p>` with no `<ul>` anywhere in the
microcopy block. The `convertTypedBullets` default (true) and the microcopy override (false)
therefore coexist correctly in one render.

**2c. Dark-mode preview transforms over a microcopy-bearing document — PASS**
This was the highest-risk seam (dark-mode code predates microcopy). All three clients
process a microcopy document with no exception and no `darkModeError`:

| Client | Transform ran | darkModeError | Microcopy intact | Italic survives | Muted color |
|---|---|---|---|---|---|
| gmail | yes (13297 → 13575 chars) | none | yes | yes | `#6b6b6b` (whole-email inversion, colors untouched by design) |
| outlook | yes (13297 → 13444 chars) | none | yes | yes | recolored `#6b6b6b` → `#bbbbbb` (contrast repair) |
| applemail | no-op (byte-identical to plain) | none | yes | yes | `#6b6b6b` |

The Outlook pass recolors the microcopy *and* its links together, so the "links stay muted
rather than brand-accent" property holds after the transform. The Apple Mail no-op matches
its own documented behaviour ("respects author dark-mode CSS; this email has none, so it
renders unchanged") — pre-existing and intentional, not a regression.

**2d. Conditional button padding flip + desync — PASS**
- microcopy empty → `padding:14px 0 18px 0`
- microcopy populated → `padding:14px 0 6px 0`
- microcopy populated then cleared back to empty → `padding:14px 0 18px 0`, and the whole
  compiled document is **byte-identical** to the original empty-microcopy output.

No desync is structurally possible: `buildMicrocopyBlock` and `ctaButtonPadding` are both fed
the same `microcopyHtml` value at `index.html:1717-1719` and both gate on the shared
`hasRichHtml` predicate.

### 3. Whole-document byte-parity vs base (no new features used)
Differential run: base `index.html` served on :8201, sprint head on :8202, driven through an
identical scripted document using only pre-sprint features (plain text, bold via Ctrl+B, a
typed-bullet run, an autolinked phone, CTA text/destination, preheader; no italics, microcopy
left empty). Compiled output read from the raw-HTML modal.

| Brand | Identical | Length |
|---|---|---|
| postmanLaw | **yes** | 13813 |
| parrishDevaughn | **yes** | 13842 |
| kechesLead | **yes** | 13282 |

Page errors: 0 at base, 0 at head. TASK-026's byte-parity-defaults claim and TASK-027's
emission-into-the-same-path change are both confirmed non-disruptive at whole-document level.

### 4. End-to-end with the new features on
Document: italic body text + autolinked body phone + populated microcopy containing an
italic phrase, a URL link, and a phone number. Compiled through `mjml2html`
(`validationLevel: 'soft'`) on 3 brands — postmanLaw, parrishDevaughn, wettermarkKeith.
All identical results:

| Check | Result |
|---|---|
| Warning banner text | empty (no MJML warning, no dark-mode error, no template error) |
| Microcopy present | yes |
| Microcopy after the button in document order | yes |
| Muted size / color (`13px` / `#6b6b6b`) | yes / yes |
| Italic preserved inside microcopy | yes |
| Microcopy link muted (not brand accent) | yes |
| Microcopy phone autolinked `tel:5559876543` | yes |
| Phone digits not mangled (`555-987-6543`) | yes |
| Body italic emitted | yes |
| Body phone autolinked | yes |
| Button padding tightened to 6px | yes |

### 5. Docs/code integration spot-check — PASS
Sampled TASK-028's prose against sprint-head code:
- `richTextToMjText(html, tpl, opts = {})` at `index.html:1509` matches the documented signature.
- CODE-PATTERNS' byte-parity claim holds structurally: both body call sites
  (`index.html:1764`, `index.html:1768`) pass only `(html, tpl)`.
- `buildMicrocopyBlock` passes exactly the documented values (`padding: '0 0 18px 0'`,
  `blockMargin: 8`, `convertTypedBullets: false`, `linkColor` = the muted color).
- README's 18px→6px claim matches `ctaButtonPadding` (`index.html:1694-1696`).
- ARCHITECTURE's "three Quill instances" claim is accurate.
- All 8 brand entries carry `ctaMicrocopyFontSize` + `ctaMicrocopyColor`; README's "every brand
  currently resolves to the shared default" is literally true (all reference the `DEFAULT_*`
  constants).

## Regressions requiring attention

**None.** No cross-task regression found. Byte-parity vs base holds, the full harness is green,
and every cross-task seam probed behaves as documented.

### Non-blocking observations (not regressions, no follow-up task required)

1. **Stale verification tooling in the scratchpad, not a product defect.** The pre-existing
   helper `scratchpad/vb4.js` checks dark mode using `data-dm="apple"` (the real value is
   `applemail`) and never clicks `#darkModeSwitch`. Since `applyDarkMode` returns early when
   `darkModeEnabled` is false (`index.html:3761`), that script's dark-mode assertions could
   never have exercised a transform. Any per-task confidence in dark-mode/microcopy
   compatibility drawn from `vb4.js` was vacuous. It is genuinely fine — re-verified here with
   the switch enabled and transform-ran proof (workstream 2c) — but the scratchpad script
   should not be reused as-is.
2. **`font-size:13px` appears in output even when microcopy is empty.** This is pre-existing
   brand banner markup (base `index.html:982`, `<p style="font-size:13px;...">Ease, Speed,
   Results</p>`), not microcopy leakage — proven by the byte-parity result in workstream 3.
