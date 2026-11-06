# AGENTS.md

Instructions for everyone working on Keep Tabs — human contributors and AI
coding assistants alike. Read this file before making any change.
If something here conflicts with a request, stop and ask.

## 1. Project overview

Keep Tabs is a free, open-source extension for Chromium-based browsers
(Google Chrome first, then Edge, Brave and other Chromium browsers).

- **Save:** the user clicks the extension icon and saves the current window
  (all its tabs) to a file whose name and location they choose — the Desktop
  by default.
- **Restore:** double-clicking that file opens the browser, the extension
  recognizes it and recreates the window exactly as it was, then closes the
  file's own tab.
- The file is a self-contained HTML page. Without the extension it still
  shows the list of saved links.
- No account, no server, no tracking. Tabs never leave the user's computer.

Scope per version lives in `docs/roadmap/`. Do not implement features that are
not in the current roadmap without discussing them first.

## 2. Language

Everything in this repository is written in **English**: code, identifiers,
comments, documentation, commit messages, branch names, issues and pull
requests.

The only exception is translated user-facing strings in `src/_locales/<lang>/`.

## 3. Tech stack and principles

- **Manifest V3** browser extension.
- **Vanilla JavaScript** (ES modules), HTML and CSS. **No build step:** the
  content of `src/` is exactly what is loaded in the browser and published.
- **No runtime dependencies.** Development dependencies (tests, type checking,
  linting) are allowed only when justified, and must be discussed first.
- **Types via JSDoc**, checked with `tsc --noEmit` (`checkJs`).
- **Unit tests with Vitest**, focused on the pure logic in `src/lib/`.
- **Minimal permissions.** Every permission in `manifest.json` must be
  justified in `docs/technical/permissions.md`.
- **No network requests.** No analytics, no remote code, no external fonts or
  CDNs. Everything ships inside the extension.

## 4. Repository structure

```
keeptabs/
├── .github/            CI workflows, issue and pull request templates
├── docs/               Project documentation (the source of truth)
│   ├── roadmap/        Scope of each version (v1.md, v2.md, …)
│   ├── features/       How each feature currently behaves
│   ├── technical/      File format, permissions, i18n, architecture
│   └── store/          Store listing texts and screenshots
├── src/                The extension itself (load this folder unpacked)
│   ├── manifest.json
│   ├── _locales/       en/ and fr/ messages.json
│   ├── background/     Service worker: restore orchestration
│   ├── popup/          Save form
│   ├── content/        Detects an opened session file
│   ├── lib/            Pure logic: capture, serialization, file names…
│   ├── templates/      Template of the generated session file
│   └── icons/
├── tests/              Unit tests and fake-data fixtures
├── scripts/            Maintenance scripts (e.g. packaging for the store)
├── AGENTS.md           This file
├── CLAUDE.md           Points Claude Code to this file
├── README.md
└── LICENSE             GNU GPL v3.0
```

Folders are created when their first file is needed, not in advance.

## 5. Coding conventions

- **Files and folders:** `kebab-case` (`session-file.js`).
- **Variables and functions:** `camelCase`. **Constants:** `UPPER_SNAKE_CASE`.
- **Indentation:** tabs, displayed 4 columns wide, in code (JS, HTML, CSS,
  JSON). Spaces only where the format requires them: Markdown and YAML (see
  `.editorconfig`). UTF-8 and LF line endings everywhere.
- **Separation of concerns:** `src/lib/` contains pure functions with no
  `chrome.*` calls, so they can be unit-tested. Browser APIs are only used in
  `background/`, `popup/` and `content/`.
- Prefer `async`/`await` over callbacks and promise chains.
- Small functions with one responsibility. Readable code over clever code.
- **Never fail silently.** Every error is either handled, shown to the user
  with a clear message, or logged with context.
- Comments explain *why*, not *what*. Every exported function has a JSDoc
  block with its types.

## 6. Internationalization (i18n)

- Supported languages: **English** (default locale) and **French**.
- **No hard-coded user-facing text.** Every string shown to the user goes
  through `chrome.i18n` and `src/_locales/<lang>/messages.json`.
- Every key exists in **every** locale. Adding a key in one language without
  the others is not allowed.
- Key names are `camelCase` and descriptive (`saveButtonLabel`).
- `chrome.i18n` has no plural support: use two keys suffixed `_one` and
  `_other` (`tabCount_one`, `tabCount_other`).
- The generated session file is written in the language active when it was
  saved.

## 7. Security and privacy

These rules are not negotiable.

- **Never commit real session files**, real URLs from your browsing, or any
  personal data. Tests and examples only use fake URLs (`example.com`,
  `example.org`). Keep manual test sessions in `/local/` (git-ignored).
- **Never commit secrets** (store API keys, `.pem` keys, tokens). Secrets for
  automation go into GitHub Actions secrets.
- **Tab data is untrusted.** Page titles and URLs are written into the session
  file: always escape them. Never use `innerHTML` with tab data.
- **Session files are untrusted input.** On restore, validate the file's
  structure and only open URLs whose scheme is on an explicit allowlist.
  `javascript:` URLs are always rejected.
- Never add code that sends data anywhere.

## 8. Git workflow

### Atomic commits

Every commit has **one single purpose** and can be described in one sentence.

- A feature or fix comes **together with** its tests and its documentation
  update, in the same commit.
- Never mix unrelated changes: a refactoring, a feature, a formatting pass and
  a dependency update are four separate commits.
- Every commit leaves the repository in a working state (tests pass).
- If the message needs "and" to describe two different things, split the
  commit.

### Commit messages: Conventional Commits

Format: `type(scope): subject`

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- **Scopes:** `popup`, `background`, `content`, `lib`, `i18n`, `manifest`,
  `docs`, `ci`, `deps`, `repo`. The scope may be omitted when the change is
  global.
- **Subject:** imperative mood ("add", not "added"), lowercase, no final
  period, 72 characters maximum.
- **Body** (optional, after a blank line): explains *why* the change is made,
  not *how*.
- **Breaking change:** add `!` after the scope and a `BREAKING CHANGE:` footer.

Examples:

```
feat(popup): add file name field with date-based placeholder
fix(background): keep tab group colors when restoring a window
docs(roadmap): define v1 scope
test(lib): cover file name sanitization
```

### Branches and pull requests

- `main` is protected and always stable. No direct commits, no force-push.
- Work on a short-lived branch named after the commit type:
  `feat/save-form`, `fix/group-colors`, `docs/v1-roadmap`.
- Every change goes through a pull request. The pull request description says
  what changes, why, and how it was tested.
- History stays linear (rebase, no merge commits). Atomic commits are kept as
  they are; they are not squashed together.

### Versioning

[Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`, stored in
`src/manifest.json`. Every release gets a Git tag (`v1.0.0`) and a
`CHANGELOG.md` entry.

## 9. Documentation

- `docs/` is the source of truth for how Keep Tabs works.
- When behavior changes, the matching page in `docs/` is updated **in the same
  commit**.
- `docs/roadmap/` describes what each version includes and excludes.
  `docs/features/` describes the current behavior of each feature, with the
  version it appeared in.

## 10. Development setup

Requirements: Node.js 22 or later. Development tools are installed with npm;
none of them ship with the extension.

```
npm install        # install the development tools (once)
npm test           # unit tests (Vitest)
npm run typecheck  # JSDoc type check (tsc --noEmit)
npm run check      # both, as the CI runs them on every pull request
```

Run `npm run check` before every commit.

To load the extension during development:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `src/` folder.
4. Optional: in the extension's **Details**, turn **Allow access to file URLs**
   on or off. Unpacked extensions get it on by default, but store installs
   do not: test both, it is only needed to reopen tabs showing local files.

## 11. Rules for AI coding assistants

- Read this file and the relevant `docs/` pages before changing anything.
- Stay within the request. Do not refactor, rename or "improve" unrelated code.
- Ask before adding a dependency, a permission or a new file format field.
- Never commit, push or open a pull request unless explicitly asked.
- Follow the atomic commit and Conventional Commits rules above.
- When a specification is unclear or contradicts this file, ask instead of
  guessing.
