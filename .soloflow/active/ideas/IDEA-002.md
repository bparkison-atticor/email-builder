---
id: IDEA-002
type: FEATURE
status: answered
created: 2026-05-14T00:00:00Z
epics: []
slices:
  - title: "Detect and indent bullet-prefixed paragraphs"
    description: "In the richTextToMjText post-processor, detect <p> elements whose text begins with a bullet-like character (•, -, –, *) and apply a left-indent style so they read as visually distinct from surrounding body copy."
    value_statement: "Directly fixes the user-reported visual defect — bullet lines currently sit flush with body text, making lists indistinguishable from normal paragraphs in rendered emails."
  - title: "Convert bullet-prefixed paragraph runs into semantic <ul><li> blocks (optional upgrade)"
    description: "Rather than only adding indent CSS, detect consecutive runs of bullet-prefixed <p> elements and replace each run with a <ul><li>...</li></ul> structure, so the existing ul/ol styling rules apply and the output is semantically correct HTML."
    value_statement: "Produces cleaner, more accessible HTML in the final SendGrid output and means one code path handles both Quill-button lists and typed-bullet lists consistently."
  - title: "Tune existing <ul>/<ol> indent value"
    description: "Review and optionally increase the padding-left on the existing ul/ol rule (currently 24px at index.html:1396) if the semantic-list path is chosen, ensuring the indent looks correct across Gmail, Outlook, and Apple Mail."
    value_statement: "The existing 24px indent was set without email-client validation and may itself feel under-indented; tuning it as a paired change avoids having two inconsistent indent values in the codebase."
open_questions:
  - question: "Should bullet-prefixed paragraphs be converted into real <ul><li> elements (Approach A), or should the paragraphs be left as-is with only a padding-left added (Approach B)?"
    context: "Approach A produces semantic HTML and reuses the existing ul/ol styling path, but it restructures the user's content — stripping the literal bullet character and wrapping in list tags. Approach B is surgical, preserves the user's typography exactly, and is lower risk. The right choice affects how much code changes and whether the bullet character is preserved in output."
    candidates:
      - "A — Convert runs of bullet-prefixed <p> elements into <ul><li> blocks (semantic, reuses existing list styling)"
      - "B — Leave paragraphs as <p> but add padding-left to bullet-prefixed ones only (minimal change, preserves literal • character)"
      - "A+C — Convert to <ul><li> AND re-tune the existing 24px ul/ol indent in the same change"
    answer: "A — Convert to <ul><li>"
  - question: "Which bullet-like prefix characters should trigger detection?"
    context: "The user's sample uses the Unicode bullet '•'. But users may also type hyphens (-), en-dashes (–), or asterisks (*) as informal bullets. A broader match reduces surprises but risks false positives on non-list paragraphs (e.g., a paragraph that opens with '- 30 days after...')."
    candidates:
      - "Narrow: • only (matches the known user pattern, near-zero false positives)"
      - "Broad: •, -, –, * (covers common informal bullet styles, small false-positive risk)"
      - "Narrow + space guard: •·char, -·space, –·space, *·space (requires the character to be followed by a space, reducing false positives on hyphens)"
    answer: "Broad: •, -, –, *"
  - question: "What indent value (padding-left) should be applied to bullet-prefixed paragraphs or converted list items?"
    context: "The existing ul/ol rule uses 24px. The mj-section already has 24px horizontal padding. The user wants bullets indented *further* than body text, not at the same level — so the indent is relative to the column edge, not the page edge. Needs to look correct in Gmail (CSS-friendly) and Outlook (table-based, inline styles only)."
    candidates:
      - "24px (matches existing ul/ol value — consistent if Approach A is chosen)"
      - "20px (slightly lighter indent, common in email templates)"
      - "32px (more pronounced indent, clearly separates bullets from body text)"
    answer: "24px (match existing)"
assumptions:
  - assumption: "The post-processor function richTextToMjText (index.html ~line 1331) is the single correct place to add this detection — all body copy for both editors flows through it before reaching the MJML output."
    confidence: high
    validation: "Confirmed by CODE-PATTERNS.md entry for richTextToMjText and by the two call sites at index.html:1471 and 1475."
  - assumption: "The bullet-prefixed paragraphs appear in the post-processor's DOM (after div.innerHTML = cleaned) and can be queried via querySelectorAll('p') before the final margin pass."
    confidence: high
    validation: "The post-processor already walks all <p> elements at line 1390–1392 for margin normalization; the same DOM is available for bullet detection earlier in the function."
  - assumption: "Outlook and Gmail both respect inline padding-left on <p> or <li> elements, which is how the existing list indent works."
    confidence: medium
    validation: "The existing ul/ol padding-left:24px rule at line 1396 implies this was previously judged acceptable. Validate by testing compiled output in Outlook desktop (which can strip some padding) and Gmail web."
  - assumption: "Users who type literal bullet characters (• etc.) will not also use Quill's bullet-list toolbar button for the same content — the two patterns don't need to coexist in one paragraph."
    confidence: high
    validation: "Quill's toolbar-button bullets produce <li> elements, not <p> elements; they are already handled by the existing ul/ol path. No overlap is possible at the DOM level."
  - assumption: "The literal bullet character (e.g., •) should be stripped from the text content if Approach A (convert to <ul><li>) is chosen, since the <ul> list-style will render its own marker."
    confidence: high
    validation: "Standard HTML behavior — keeping • inside <li> would produce double bullets in most email clients."
  - assumption: "No other part of the codebase (template configs, MJML wrappers, copy-to-clipboard path) needs to change for this fix — it is entirely self-contained inside richTextToMjText."
    confidence: high
    validation: "richTextToMjText returns a complete <mj-text> block; the MJML pipeline and copy path consume that string without inspecting its internal paragraph structure."
research_recommendation: not_needed
research_rationale: "The fix is entirely within an existing post-processing DOM manipulation function; the approach, affected code path, and relevant email-client constraints are all fully grounded in the codebase."
---

# IDEA-002: Indent Bullet-Prefixed Paragraphs in Rendered Email Output

## Raw Input

"let's adjust the padding on bullet points. right now they're flush with the left-side. I think it's worth having them indented slightly"

(User also pasted rendered email HTML showing the actual paragraphs in output.)

## Grounding

The post-processor function `richTextToMjText` lives at `c:\Users\brand\Documents\Claude Apps\EmailBuilder\index.html:1331`. All body copy from both Quill editors flows through this single function before being wrapped in `<mj-text>`.

The existing list-styling block (lines 1394–1400) correctly indents semantic `<ul>/<ol>` elements:

```js
div.querySelectorAll('ul, ol').forEach(list => {
  list.setAttribute('style', 'margin:0 0 14px 0;padding-left:24px;');
});
div.querySelectorAll('li').forEach(li => {
  li.setAttribute('style', 'margin:0 0 6px 0;');
});
```

However, the user's rendered output shows that their bullets are not semantic lists — they are plain `<p>` elements with a literal "• " character prepended. Because they are `<p>` tags, the `ul/ol` rule never fires and they receive the standard paragraph margin only (`margin:0 0 14px 0;`), sitting flush at the column edge.

The paragraph normalization pass at lines 1389–1392 is also relevant: it walks all `<p>` elements and sets their margin. Any bullet-detection logic must either run before this pass (to reclassify elements before the margin is set) or account for the margin already being applied.

The Quill-button list path (lines 1342–1370) converts Quill's `<ol data-list="bullet">` quirk into proper `<ul>/<li>` elements — this is a prior art pattern for DOM restructuring inside the same function, and Approach A would follow the same pattern.

Function call sites: `index.html:1471` and `index.html:1475` (body-above and body-below editors inside `buildMjml()`).

## Slices

### Slice 1: Detect and indent bullet-prefixed paragraphs

Inside `richTextToMjText`, after the Quill list conversion block (line 1370) and before the paragraph margin pass (line 1390), add a detection step that identifies `<p>` elements whose trimmed text content starts with a bullet-like prefix. Apply a `padding-left` inline style to those elements (Approach B), or convert consecutive runs into `<ul><li>` structures (Approach A). The exact approach is an open question for the planner.

This slice directly resolves the reported visual defect. The change is fully self-contained inside one function in one file.

### Slice 2: Convert bullet-prefixed paragraph runs into semantic `<ul><li>` blocks (optional, Approach A only)

If the planner selects Approach A, this slice handles the structural replacement: group consecutive bullet-prefixed `<p>` elements into runs, create a `<ul>`, strip the literal bullet character from each text node, and insert `<li>` children. The existing `ul/ol` styling rule at line 1396 then applies automatically.

This slice is only relevant if Approach A is chosen. It can be implemented as part of Slice 1 or as a follow-on depending on complexity.

### Slice 3: Re-tune `<ul>/<ol>` indent value (optional, paired with Approach A)

The existing `padding-left:24px` on `ul/ol` at line 1396 was set without explicit email-client validation. If Approach A is chosen and semantic lists are the unified output path, the indent value should be reviewed and adjusted if needed so it renders correctly across Gmail, Outlook desktop, and Apple Mail. This is a one-line change but benefits from being tested deliberately rather than assumed correct.

This slice is independent of Slices 1/2 and can be deferred.

## Open Questions

**1. Approach A (semantic conversion) vs Approach B (paragraph indent only)?**

Approach A produces cleaner HTML and reuses the existing `ul/ol` code path, but it restructures the user's content — removing the literal `•` character and wrapping in list tags. If a user later opens the same email draft and the HTML has been restructured, their original typed bullets are gone. Approach B is surgical: add `padding-left` to bullet-prefixed `<p>` tags without touching their text. Lower risk, lower reward. The planner should decide based on how much structural mutation is acceptable in the post-processor.

**Answer:** A — Convert to `<ul><li>`.

**2. Which prefix characters should trigger detection?**

The known user case is `•`. Expanding to `-`, `–`, and `*` catches more informal list styles but introduces false-positive risk on paragraphs that open with a hyphen or asterisk for non-list reasons (e.g., `- 30 days after closing`). A space-guard (`• `, `- `, `* `) reduces that risk. The detection set affects both correctness and surprise for future users.

**Answer:** Broad — `•`, `-`, `–`, `*`.

**3. What indent value?**

The existing `ul/ol` indent is 24px. Outlook desktop is the most restrictive email client for CSS padding — inline `padding-left` on list elements or block elements is generally respected, but the value should be validated. The planner should specify the target value rather than defaulting to 24px without consideration.

**Answer:** 24px (match existing).

## Assumptions

All assumptions are documented in the frontmatter above with confidence levels and validation methods.
