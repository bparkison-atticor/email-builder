---
id: TASK-010
idea: IDEA-002
status: approved
created: 2026-05-14T00:00:00Z
files_owned:
  - index.html
files_readonly:
  - CODE-PATTERNS.md
  - ARCHITECTURE.md
acceptance_criteria:
  - criterion: "Paragraphs whose visible text begins with `•`, `-`, `–`, or `*` followed by a space (`/^[•\\-–*]\\s+/`) are converted to `<li>` elements inside a `<ul>`. Paragraphs not matching the prefix are left as `<p>` elements unchanged."
    verification: "Build an email body containing one plain paragraph, three consecutive bullet lines (using `•`, `-`, `–` as prefixes on separate lines), and one more plain paragraph. Click 'Copy HTML' and read clipboard (or open the View HTML modal). Confirmed in `index.html`-rendered output: the three bullet lines appear as one `<ul>` with three `<li>` children; the surrounding plain paragraphs are `<p>` tags; the literal bullet character is absent from each `<li>` text node."
  - criterion: "Non-consecutive bullet-prefixed paragraphs each produce their own independent `<ul>` block, not a single merged list."
    verification: "Build a body with two bullet lines, then a plain paragraph, then two more bullet lines. View HTML: exactly two `<ul>` elements, each with two `<li>` children, separated by a `<p>`. No single `<ul>` spans all four bullet items."
  - criterion: "The existing `ul/ol` styling rule at index.html ~line 1395 (`margin:0 0 14px 0;padding-left:24px;`) and the `li` rule at ~line 1398 (`margin:0 0 6px 0;`) fire on the converted elements — bullets render indented relative to surrounding body copy in the preview iframe."
    verification: "Trigger live preview after entering bullet-prefixed paragraphs. In the preview iframe, list items are visually indented relative to adjacent body copy paragraphs. View HTML output: each generated `<ul>` carries `style=\"margin:0 0 14px 0;padding-left:24px;\"` and each `<li>` carries `style=\"margin:0 0 6px 0;\"`. No new CSS rule is added — the change relies entirely on the existing ul/li forEach passes."
  - criterion: "The literal bullet prefix is stripped only from the first leading text node of each converted paragraph, preserving any inline markup (e.g. `<strong>`, `<a>`, links) that Quill emitted inside the paragraph."
    verification: "Build a bullet line whose content is `• <strong>Manage</strong> forms and deadlines` (bold the word 'Manage' via the toolbar after typing the bullet character). View HTML: the `<li>` contains `<strong>Manage</strong> forms and deadlines` (no leading `• `, no corruption of the `<strong>` tag, no double-stripping)."
  - criterion: "Quill-toolbar-generated bullet/ordered lists (which already produce `<ul>/<ol>/<li>` via the Quill list conversion block at ~lines 1342–1370) are unaffected. They are not re-wrapped, and their `<li>` text nodes do not have any characters stripped."
    verification: "Use the Quill bullet-list toolbar button to create a three-item list whose first item is `Manage forms and deadlines` (no leading bullet character — Quill renders the marker). View HTML: one `<ul>` with three `<li>` items, each containing the typed text verbatim. Confirm no `<ul>` is nested inside another `<ul>` and the first character of any `<li>` text is not stripped."
  - criterion: "Bullet-prefixed paragraphs that contain manually-inserted phone links (auto-linked or `data-link-type=\"phone\"`) preserve their `<a>` styling after conversion. The `autoLinkPhones` and link-styling passes at ~lines 1374–1387 continue to operate correctly on the converted `<li>` elements."
    verification: "Build a bullet line: `• Call us at 844-767-8626 for help`. View HTML: the `<li>` contains `<a href=\"tel:8447678626\" ...>844-767-8626</a>` with the standard-blue phone styling — same output as if the phone number had appeared in a plain paragraph."
  - criterion: "Both call sites of `richTextToMjText` (body-above ~line 1471 and body-below ~line 1475) produce correctly converted output."
    verification: "Place bullet-prefixed paragraphs in the body-above editor (above the CTA) and separately in the body-below editor (below the CTA). View HTML: both blocks contain `<ul><li>...</li></ul>` markup, each section's bullets correctly grouped."
  - criterion: "No regressions in non-bullet body copy: bold/italic/underline inline styles, plain paragraphs, Handlebars merge fields (`{{Client.FirstName}}`), manually-inserted variable links, and the last-block margin-zeroing logic at ~lines 1402–1406 all continue to behave as before."
    verification: "Build a mixed body: a plain paragraph with bold + italic + a `{{Client.FirstName}}` token, then three bullet lines, then a final plain paragraph. View HTML: the plain paragraphs render with `margin:0 0 14px 0;` (or `margin:0;` if last), the bold/italic tags are present, `{{Client.FirstName}}` is intact, and the bullets are converted. If the last block is a `<ul>`, its outer style contains `margin:0;` (last-block normalization still fires for UL — already handled by the existing zero-margin pass)."
  - criterion: "The HUMANIZE_FIXTURES test harness (Ctrl+Shift+T) still passes all existing fixtures unchanged — the bullet conversion logic does not affect any humanizeTemplateError code path."
    verification: "Press `Ctrl+Shift+T` in the running app. Every fixture row shows the PASS badge. Row count is unchanged from before the edit."
depends_on: []
estimated_complexity: low
test_strategy:
  needed: false
  justification: "No automated test suite exists in this repo (CLAUDE.md: 'no test command detected'). The change is a localized DOM manipulation addition inside a single function (`richTextToMjText` in `index.html`). Correctness is verified by the manual acceptance criteria above, which cover both the happy path (bullets convert, indent applied) and the regression surface (Quill-button lists, phone links, mixed inline markup, both call sites, HUMANIZE_FIXTURES harness)."
---

# Convert bullet-prefixed paragraphs to semantic `<ul><li>` blocks in `richTextToMjText`

## Objective

Inside `richTextToMjText` at `index.html:1331`, detect `<p>` elements whose visible text begins with one of `•`, `-`, `–`, or `*` (followed by whitespace), group consecutive matches into runs, and replace each run with a single `<ul>` containing `<li>` children. Strip the literal bullet prefix from the first text node of each `<li>` so the `<ul>`'s native marker isn't doubled. The existing `ul/ol` styling pass at `index.html:1395` (`margin:0 0 14px 0;padding-left:24px;`) and the `li` pass at `index.html:1398` then apply automatically — no new CSS or indent values are introduced.

This resolves the reported visual defect (typed-bullet paragraphs sitting flush at the column edge) by routing them through the same styling path that already handles Quill-toolbar lists.

## Implementation Steps

1. **Add a bullet-detection + run-grouping block** to `richTextToMjText` immediately after the Quill list conversion at `index.html:1370` and before `autoLinkPhones(div)` at `index.html:1374`. The new block operates on the same `div` that the Quill conversion already restructured.

2. **Define the prefix regex** at the top of the new block:
   ```js
   const BULLET_PREFIX = /^[•\-–*]\s+/;
   ```
   Uses Unicode escapes (`•` = `•`, `–` = `–`) for clarity and to avoid editor encoding ambiguity. The required trailing `\s+` is the false-positive guard: `-30 days` (no space) is NOT matched, `- 30 days` IS matched (per user's "broad" answer, this is accepted).

3. **Match helper**: a paragraph is bullet-prefixed iff it is a `<p>` element whose `textContent.trimStart()` matches `BULLET_PREFIX`. Use `textContent` (not `innerHTML`) for the test so that leading inline elements like `<strong>` don't false-match.

4. **Run-grouping algorithm**. Snapshot the direct children of `div`:
   ```js
   const children = Array.from(div.children);
   let runStart = -1;
   const runs = [];
   children.forEach((node, i) => {
     const isBullet = node.tagName === 'P' && BULLET_PREFIX.test(node.textContent.trimStart());
     if (isBullet && runStart === -1) runStart = i;
     if (!isBullet && runStart !== -1) {
       runs.push({ start: runStart, end: i });
       runStart = -1;
     }
   });
   if (runStart !== -1) runs.push({ start: runStart, end: children.length });
   ```
   Each `run` is a half-open interval `[start, end)` of consecutive bullet `<p>` indices in `children`.

5. **Replace each run** (iterate `runs` in reverse so earlier indices stay valid). For each run:
   - Create `const ul = document.createElement('ul');`
   - For each `p = children[i]` where `start <= i < end`: strip the leading bullet prefix from `p`'s first text node, then move all `p`'s children into a new `<li>`, then `ul.appendChild(li)`.
   - Insert `ul` into `div` before `children[start]`, then remove the source `<p>` elements in the run.

6. **Bullet-prefix stripping** (helper, used in step 5). Walk the paragraph's child nodes to find the first text node (skipping empty text nodes if any). Replace the leading `BULLET_PREFIX` match in that text node's `nodeValue` with the empty string. This is `nodeValue`-level replacement — it does NOT touch any element siblings, so inline markup like `<strong>` or `<a>` that appears after the bullet text is preserved verbatim. If no text node exists before the first element (unlikely but possible — e.g. `<p>•<strong>Foo</strong></p>` where the `•` is the leading content), fall back to also stripping a leading bullet from the paragraph's `innerHTML` via a single `replace(BULLET_PREFIX, '')` on the leading whitespace+text run.

7. **Concrete inner structure** for the run replacement. Reference the existing Quill list conversion at `index.html:1348–1370` as prior art for DOM restructuring inside this function. Suggested shape (illustrative — finalize during implementation):
   ```js
   // Bullet-prefixed paragraphs (typed •, -, – or *) become real <ul><li> so they
   // hit the same styling path as Quill-toolbar lists.
   const BULLET_PREFIX = /^[•\-–*]\s+/;
   const children = Array.from(div.children);
   const runs = [];
   let runStart = -1;
   children.forEach((node, i) => {
     const isBullet = node.tagName === 'P' && BULLET_PREFIX.test(node.textContent.trimStart());
     if (isBullet && runStart === -1) runStart = i;
     if (!isBullet && runStart !== -1) { runs.push([runStart, i]); runStart = -1; }
   });
   if (runStart !== -1) runs.push([runStart, children.length]);

   for (let r = runs.length - 1; r >= 0; r--) {
     const [start, end] = runs[r];
     const ul = document.createElement('ul');
     for (let i = start; i < end; i++) {
       const p = children[i];
       // Strip leading bullet from the first leading text node.
       for (const n of p.childNodes) {
         if (n.nodeType === Node.TEXT_NODE && BULLET_PREFIX.test(n.nodeValue.trimStart())) {
           n.nodeValue = n.nodeValue.replace(/^\s*/, '').replace(BULLET_PREFIX, '');
           break;
         }
         if (n.nodeType !== Node.TEXT_NODE) {
           // Leading element, no leading text — fall back to innerHTML strip.
           p.innerHTML = p.innerHTML.replace(BULLET_PREFIX, '');
           break;
         }
       }
       const li = document.createElement('li');
       while (p.firstChild) li.appendChild(p.firstChild);
       ul.appendChild(li);
     }
     div.insertBefore(ul, children[start]);
     for (let i = start; i < end; i++) children[i].remove();
   }
   ```

8. **Ordering rationale**. Place this block AFTER the Quill list conversion (`index.html:1370`) so that toolbar lists are already proper `<ul>/<ol>` and won't be touched by the new code (they're `<ul>`/`<ol>`, not `<p>`). Place BEFORE `autoLinkPhones(div)` (`index.html:1374`) so that phone numbers inside bullet items still get auto-linked after conversion — `autoLinkPhones` operates on the whole `div`, including the newly created `<li>` content. Place BEFORE the paragraph margin pass (`index.html:1389–1392`) so that the converted paragraphs are no longer `<p>` elements when that pass runs (avoids any stale references). The existing `ul/ol` and `li` styling passes at `index.html:1394–1400` fire AFTER this block and apply to the new elements.

9. **Verification pass** (manual). Start the dev server (`python -m http.server 8080 --bind 127.0.0.1`) and run each scenario in the acceptance criteria above against the actual app:
   - Plain + bullet + plain → one `<ul>` with the expected `<li>` items.
   - Bullet + plain + bullet → two `<ul>` blocks.
   - Bullet with inline `<strong>` → `<li>` preserves bold markup.
   - Quill-toolbar-created list → unchanged.
   - Bullet line containing a phone number → `<a href="tel:...">` styled correctly.
   - Both body editors (above and below CTA).
   - Press `Ctrl+Shift+T` → HUMANIZE_FIXTURES harness all PASS.

## Hardest Decision

**Where to insert the new logic relative to `autoLinkPhones` and the paragraph margin pass.** Three placements were considered:

1. Before Quill list conversion (line 1342) — rejected. The Quill conversion already established the DOM-restructuring convention; running ahead of it means handling Quill's `<ol data-list="bullet">` quirk as a special case, defeating the point of routing typed bullets through the existing `<ul>/<ol>` styling path.

2. After the paragraph margin pass (line 1392) — rejected. The margin pass sets `style="margin:0 0 14px 0;"` on each `<p>`. Converting `<p>` to `<li>` after that point means the `<li>` would inherit the wrong margin attribute, and a separate cleanup pass would be needed. Putting the conversion before the `<p>` style pass means converted paragraphs don't exist as `<p>` when the pass runs, so the `<li>` pass at line 1398 sets the correct `<li>` margin from a clean slate.

3. **Selected: between line 1370 (end of Quill conversion) and line 1374 (`autoLinkPhones`).** This placement (a) lets Quill-toolbar lists pass through unchanged (they're no longer `<p>`), (b) feeds the new `<li>` elements into `autoLinkPhones` so phones in bullets are auto-linked, (c) ensures the `<p>` margin pass at line 1389 never sees the converted paragraphs, and (d) ensures the `ul/ol`/`li` styling passes at line 1395/1398 apply to the new lists. It matches the prior-art Quill conversion pattern and keeps the function's existing top-to-bottom flow.

## Rejected Alternatives

- **Approach B from the idea (add `padding-left` to bullet-prefixed `<p>` only, no conversion).** Rejected by user choice in IDEA-002's open-question answer. What would change my mind: a finding that converting paragraphs to lists corrupts an existing feature — none surfaced in the codebase search.
- **Adding a new CSS rule scoped to "bullet paragraphs" (e.g. `p.has-bullet { padding-left:24px }`).** Rejected — adds a parallel styling path for what is functionally a list. The existing `ul/ol` path at `index.html:1395` is the single source of truth for list indentation; routing everything through it eliminates the possibility of the two values drifting apart.
- **Detecting bullet prefixes inside the Quill input layer (before the rich text is serialized to HTML).** Rejected — the post-processor is the single chokepoint per CLAUDE.md/CODE-PATTERNS.md guidance; intervening earlier would mean the conversion only fires for one of the two editors unless duplicated. The post-processor handles both.
- **Narrow prefix set (only `•`).** Rejected by user choice (broad: `•`, `-`, `–`, `*`).
- **Tightening the prefix to require a space-guard (`• `, `- `, etc.) only.** Already covered by `/^[•\-–*]\s+/` — the `\s+` is the space-guard the user effectively chose by saying "broad" (which means accepting some false positives, mitigated by the trailing whitespace requirement). Without the `\s+`, a paragraph starting with `-30 days` would convert, which the user implied was acceptable but is awkward. The `\s+` is a defensible middle ground.

## Lowest Confidence Area

**Bullet-prefix stripping when the first child of the paragraph is an element rather than a text node.** Example: `<p>•<strong>Manage</strong> forms</p>`. The fallback at step 6 handles this by running `innerHTML.replace(BULLET_PREFIX, '')` on the paragraph, which works because the bullet character is at the start of `innerHTML`. But if Quill ever wraps the bullet itself in an inline element (e.g. `<p><span>•</span> text</p>`) the regex won't match `innerHTML` directly. This is a theoretical edge — typed bullets enter the editor as plain text and are not auto-wrapped — but if a reviewer hits a case where the bullet character appears inside an inline element, the fix is to walk the paragraph's first descendant text node (depth-first, leftmost) and strip the prefix from there. Three additional lines, no architectural change.
