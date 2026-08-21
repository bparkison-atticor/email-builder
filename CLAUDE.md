# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repo.

## Project Overview

Email Builder is a single-file browser app (`index.html`) that compiles MJML templates into SendGrid-ready HTML. Marketers pick a brand template, write copy, configure a CTA, and copy the finished HTML to paste into SendGrid's Code Editor. The entire app — HTML, CSS, and JavaScript — lives in one file with no build step and no installed dependencies.

## Stack & Tooling

- **Language(s):** JavaScript (ES modules, browser), HTML, CSS
- **Package manager:** _none_ — all dependencies loaded from CDN at runtime
- **Test:** _no test command detected_
- **Type-check:** _n/a_
- **Lint:** _n/a_
- **Dev / build:** `python -m http.server 8080 --bind 127.0.0.1` or `npx serve . -l tcp://127.0.0.1:8080`

## Layout

- `index.html` — the entire application (HTML structure + inline CSS + `<script type="module">`)
- `Email Builder.bat` — Windows launcher: starts the local HTTP server and opens the browser
- `README.md` — user-facing workflow documentation
- `CHANGELOG.md` — change history
- `Claude Design Handoff - UI ENH-001/` — mid-fidelity React/JSX design references (not production code)

## Reference

- **Architecture & system design** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Code patterns & conventions** → [CODE-PATTERNS.md](CODE-PATTERNS.md)

## Conventions

- **Library errors must be humanized before display.** Never show raw exception messages from Handlebars, MJML, or other CDN libraries to the user. Use a named function (following the `humanizeTemplateError` pattern in `index.html` — grep `function humanizeTemplateError`) that pattern-matches known error shapes and returns plain-English action-oriented messages. Line numbers that refer to compiled HTML the marketer never sees must be stripped. Compiler tokens (`CLOSE_BLOCK`, `EOF`, `ID`) must be translated to concrete instructions.

- **Behavior changes ship with their docs, in the same commit.** If a change alters a shared helper's signature, adds or removes a UI control, or changes what reads/writes `localStorage`, it must also add a dated CHANGELOG.md entry and correct the affected ARCHITECTURE.md bullet (*Major Components / Layers* or *Data Model*). The Ctrl+Shift+T anchor-drift guard will not catch stale prose — see "Documentation Conventions" in [CODE-PATTERNS.md](CODE-PATTERNS.md).

_`/sf:compound` will append sprint-derived learnings to this section over
time. Keep entries terse — detailed implementation patterns belong in
`CODE-PATTERNS.md`, not here._
