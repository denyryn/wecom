# Web UI Commentator

**Click an element on your screen, leave a note, and export a locator your AI agent can verify
before it edits anything.**

Instead of writing "the blue button on the right in the third card" in chat and hoping the agent
guesses right, click the button. The extension records a CSS selector, the tag, the text, the
geometry, and a DOM path, then exports them as JSON your coding agent can act on.

```
You click "Pay now"  →  comment: "make this the only filled button"
                     →  JSON export  →  agent reads button#pay-now, <button>, rect, text, url
                     →  agent edits the right component on the first try
```

- Runs on any `http(s)` page, plus `file://` after you grant access: dev servers, staging,
  production, static HTML.
- Chrome, Edge, Firefox (Manifest V3).
- Comments live in the browser's local storage. No account, no server, no telemetry.

---

## Install

There is no store listing yet, so you build the extension locally. Node ≥ 22.12 is required for
the build; after that the extension itself needs nothing.

```bash
git clone <this-repo-url> web-ui-commentator
cd web-ui-commentator
npm install
npm run build:chrome        # or npm run build:firefox
```

Load the result:

**Chrome / Edge**

1. Go to `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → pick `dist/chrome`.
4. Open any web page. Pin the extension so the toolbar icon is visible.

**Firefox**

1. Go to `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on** → pick `dist/firefox/manifest.json`.

Temporary add-ons disappear when Firefox restarts. Load it again after each restart; a permanent
install needs a build signed by AMO, and the submission steps are still unwritten (see
[`STORE.md`](STORE.md)).

If you are hacking on the extension, `npm run dev` builds, watches, and opens a managed Chrome
with the extension already loaded. Reloading on save is automatic.

---

## Use it

1. Press <kbd>Ctrl</kbd>+<kbd>\\</kbd> on the page you are reviewing. Comment mode turns on, and
   the element under the pointer gets an outline plus its name.
2. Click the thing you want changed. A card opens, anchored to that element.
3. Type what you want. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> saves. A numbered pin appears.
4. Click the toolbar icon, pick an export detail (it is remembered), then **Copy JSON**.
5. Paste the JSON into your agent along with the prompt below.

Click a pin any time to reread, edit, or delete that comment.

While there is at least one comment, or while comment mode is on, a bar sits at the top of the
page with the mode state, the count for this page, the comment list, **Copy JSON**, and
**Ditch all**, which clears the page after a second click.

The list button opens a panel on either screen edge. Click a row to open its pin, copy that one
comment as JSON, or delete it. Comments whose element is gone from the page still appear in the
list and in the export, just without a pin.

### When clicking cleanly is hard

- **Right-click** anything → **Wecom utility** → **Comment on this element**. The card opens on
  the element under the cursor, which helps with links, tiny icons, and elements the page keeps
  re-rendering.
- **Toolbar icon → Comment mode** does the same thing as the hotkey.
- The same submenu carries **Toggle comment mode**, **Copy JSON** (the same all-pages document
  the popup copies, at the saved detail level), **Ditch all on this page**, and **Ditch all on
  this site**. Both ditch items ask once in a native confirm before deleting.

`Wecom utility` is the extension's internal short name. It is what you will see in the menu, the
popup header, and the Firefox add-on id (`wecom@rianto.site`).

### Keys

| Action | Shortcut |
| --- | --- |
| Turn comment mode on / off | <kbd>Ctrl</kbd>+<kbd>\\</kbd> |
| Comment on an element | right-click → *Wecom utility* → *Comment on this element* |
| Save the comment | <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (or <kbd>⌘</kbd>+<kbd>Enter</kbd>) |
| Exit comment mode / close the card | <kbd>Esc</kbd> |

### The popup

Click the extension icon to see:

- How many comments are on the page in front of you. The footer shows the total across all
  pages.
- **Comment mode**, for when you would rather click than type.
- **Export detail**: `light` / `medium` / `heavy` (see below). Remembered between popups, and the
  in-page bar's copy button uses the same level.
- **Copy JSON** / **Download JSON**: every comment on every page, in one document.
- **Clear page** / **Clear site**. Both need a second click inside four seconds (**Confirm
  page** / **Confirm site**), and the site button clears every page on the current origin.

### Where comments live

Comments are keyed by `origin + pathname`, with trailing slashes trimmed, so `?utm_source=…` and
`#section` do not split a review and `/checkout` and `/checkout/` share notes. Reloading keeps
your pins. Comments survive browser restarts and stay inside one browser profile; they are not
synced between machines and not shared with anyone.

---

## Handing the export to an agent

Copy the JSON, then send a message like this, with the JSON pasted below it or attached as a
file:

```
Here are my UI review comments from Web UI Commentator.

<PASTE JSON HERE>

For each comment:
1. Read `detail` first, then `comments`.
2. Resolve `target.selector` in the codebase (or the DOM). If it doesn't match, and this is a
   `heavy` export, fall back to `target.domPath`.
3. Verify the resolved element matches `target.tag`, and that `target.text` appears in it. If it
   does not match, say the element is gone. Do not guess at a similar one.
4. Make the change the `body` asks for.
5. Keep a todo list: one entry per comment ID, mark each done as you go.

Report anything you could not resolve instead of silently skipping it.
```

The step that matters is 3. It makes the agent prove it found the right element before touching
code, instead of confidently rewriting the wrong button.

`schemaVersion` is `2`. The field-by-field contract, including how to re-anchor an element after
a refactor, is in [`docs/schema.md`](docs/schema.md). Point your agent at that file if it needs
the details.

---

## Export detail: which one do I want?

Bigger is not better. Pick for the job.

| Level | Use it when | Rough size (40 comments) | Each element is identified by |
| --- | --- | --- | --- |
| `light` | An LLM needs to *understand* the feedback. Cheapest, fastest. | ~2.5k tokens | selector + text |
| `medium` | **Default.** Normal page, the agent reads the live DOM or the code is stable. | ~7.6k tokens | selector, tag, text, attributes, geometry |
| `heavy` | The page is heavily refactored, or the agent has to survive a rebuild. | ~9.5k tokens | everything, plus a DOM path that always resolves |

`heavy` carries `domPath`, `domIndex`, and `ancestors`, so an agent still has a way back to the
element even after a build tool renames every class and the selector stops matching. If you are
reviewing a page that changes between builds, spend the extra tokens.

Output is minified JSON on purpose. Tokens are money.

---

## Common problems

**Nothing happens when I press <kbd>Ctrl</kbd>+<kbd>\\</kbd>**
Not every page allows extensions. Browser internals (`chrome://…`, `about:…`, extension pages)
and the Chrome Web Store refuse content scripts; that is a browser rule. Something opened late
(a modal, an SPA route change) may need a page reload before the extension attaches.

**The card opens on the wrong element**
Some sites rebuild the DOM constantly, so a very fast click can land a frame behind. Delete the
pin and use right-click → *Wecom utility* → *Comment on this element*, which targets after the
page settles.

**My comments are gone after a reload**
Check the URL path. Comments are bucketed by `origin + pathname`, so `/app` and `/app/index.html`
are different buckets. Pins only show on the page they were made on; the export always contains
everything.

**`file://` pages don't work**
Enable **Allow access to file URLs** on the extension's details page (`chrome://extensions` →
the extension → Details).

**Firefox: the extension vanished after I restarted**
Temporary add-ons are temporary. Reload from `about:debugging`. Permanent installs need an
AMO-signed build; [`STORE.md`](STORE.md) lists what is still missing for that.

**The page's own styles look broken while comment mode is on**
The overlay lives in a shadow root with scoped styles, so it should not leak. If you see it
anyway, open an issue with the URL, or with a small fixture page that reproduces it.

---

## Contributing

### Scripts

```bash
npm run dev            # watch + managed browser with the extension loaded
npm start              # same, without the initial build
npm run build          # production build -> dist/chromium
npm run build:chrome   # Chrome build + store zip in dist/
npm run build:firefox  # Firefox gecko build + zip in dist/
npm run build:edge     # Edge build
npm test               # vitest, 51 tests
npx tsc --noEmit       # type check
```

Stack: [Extension.js](https://extension.js.org) (Rspack) · React 18 · Tailwind CSS v4 ·
shadcn/ui. Node ≥ 22.12.

### Test against a deliberately awkward page

`fixtures/demo.html` carries the DOM cases that break annotators: duplicate classes, deep
nesting, inline SVG, forms, and hostile global CSS.

```bash
npx serve fixtures      # http://localhost:3000/demo.html
```

### Where things are

```
src/
  content/        overlay injected into pages: comment mode, pins, cards, comment list
  popup/          toolbar popup: counts, export, clear
  shared/         locator building/resolution, storage, export projection, schema
  components/ui/  shadcn primitives
  styles/         Tailwind tokens shared by content + popup
fixtures/demo.html  hostile test page
test/               vitest unit tests
docs/schema.md      the export contract — the actual product
docs/PLAN.md        implementation plan / build history
```

### Build recipe

This is the build that produces the store artifact. Everything in the repo is human-written
source: TypeScript, TSX, CSS, HTML, JSON. Nothing under `src/` is generated, transpiled in place,
or vendored. `dist/` and `node_modules/` are output and are excluded from the source archive.

| | |
| --- | --- |
| Operating system | Ubuntu 24.04 x64 (what CI uses). macOS 14+ and Windows 11 also work. |
| Node.js | 22.x, **≥ 22.12.0**, the minimum `extension@4.1.34` accepts. `nvm use` reads `.nvmrc` (22). |
| npm | **11.19.0** (pinned in `packageManager`). npm 10+ works; no other global tool is needed. |

```bash
nvm install 22 && nvm use 22                    # or fnm / the nodejs.org installer
corepack enable && corepack prepare npm@11.19.0 --activate   # optional: pin npm exactly

npm ci                       # exact tree from package-lock.json
npm run build:chrome         # -> dist/chrome/ and the store zip
```

The build prints the artifact paths when it finishes:

```
⏵⏵⏵ Extension built for production in dist/chrome (489.3 KB).
⏵⏵⏵ Packaged dist/web-ui-commentator-<version>-chrome.zip (170.4 KB).
```

`dist/web-ui-commentator-<version>-chrome.zip` is the upload; `dist/chrome/` is the same build
unpacked for **Load unpacked**. Firefox: `npm run build:firefox` → `dist/firefox/` and
`dist/web-ui-commentator-<version>-firefox.zip`.

`./build.sh` (or `./build.sh firefox`) does the whole sequence: checks that Node is 22 or newer,
checks that `package.json` and `src/manifest.json` carry the same version, runs `npm ci`, invokes
the matching build script, and prints the artifact path.

Notes for store review:

- The build is offline after `npm ci`. Nothing is fetched at build time beyond the npm registry.
- The packaged extension fetches no remote code and evaluates no strings at runtime. React,
  Radix, Tailwind output, and the content-script bundle are all compiled into the package.
- Third-party libraries are used as published npm packages; the bundler emits their licenses in
  `.LICENSE.txt` files next to each generated file.
- No source maps are in the zip.
- `src/manifest.json` carries its own `version`, independent of `package.json`. Bump both in the
  same commit. Extension.js only raises the Firefox `strict_min_version` (to 140, which
  `data_collection_permissions` requires) and only when it is still lower.

### Releasing

Pushing a `v*` tag builds Chrome and Firefox, then attaches both zips to a GitHub release. Every
push and PR keeps them as the `extension-zips` workflow artifact.

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Chrome 150+ refuses `--load-extension` on the command line, so a manual *Load unpacked* (or
`npm run dev`, which uses a managed Chrome for Testing) is the only path.

### Verification status

`npx tsc --noEmit` is clean and `npm test` passes 51 tests: card placement, locator
build/resolve, `urlKey`, storage watch, export projection, comment list, right-click targeting,
hotkey matching, and context-menu copy and clear. `npm run build` produces roughly 540 KB in
`dist/chromium`.

Build-level proofs, checked against `dist/chrome` and `dist/firefox`:

| Check | Evidence |
| --- | --- |
| Content CSS reaches the shadow root, not the page | `content_scripts[].css` is `[]`; the bundle carries one `data:text/css` payload |
| Tailwind theme + shadcn tokens resolve in a shadow root | inlined CSS contains `:root,:host` and `--background` |
| Popup page gets the same tokens in document scope | `action/index.css` contains both `:root` and `:host` token blocks |
| `@/*` path aliases resolve through Rspack | the build resolves `@/components/ui/*` |
| Content script is self-contained | `content-0.js` has no reference to `shared/framework.js` |

Needs a real browser session, so still unverified: how the overlay looks under the fixture page's
hostile CSS, that a click really is cancelled, and that reloading leaves exactly one host.

Known gaps: stale-element reporting in the UI, iframe records, a focus trap for the card, zoom
handling, and a Playwright end-to-end spec. A comment whose element has disappeared simply has no
pin; it is still in the export.

### Gotchas before you touch the code

- **`Ctrl+\` cannot be a manifest command.** `commands.suggested_key` accepts only letters,
  digits, Comma, Period, and a few named keys, so the shortcut is handled in the content script
  (`src/content/hotkey.ts`), where comment mode actually runs.
- **`browser.*` vs `chrome.*` on Firefox.** Extension.js deliberately skips the webextension
  polyfill on gecko builds, so `chrome.*` is callback-only there and `await` on it returns
  `undefined`. Always go through `browserApi()` in `src/shared/browser.ts`, which prefers
  `globalThis.browser`.
- **No portal-based shadcn primitives in the overlay.** Dialog, Popover, Tooltip, Select, and
  DropdownMenu portal to `document.body`, outside the shadow root. They are avoided in the popup
  too, for consistency.
- **React 18 with shadcn's `ref`-as-prop components.** shadcn generates React 19 components;
  React 18 drops `ref` on function components. Use `autoFocus` and plain props on `Textarea`,
  `Input`, and friends, or convert them to `forwardRef` first.
- **`@/lib/utils` imports after `npx shadcn@latest add`.** The CLI resolves the `utils` alias to
  the npm package `cn`. Install `clsx` and `tailwind-merge`, then rewrite `from "cn"`.
- **No `baseUrl` in `tsconfig.json`.** TypeScript 7 removed it; `paths` alone works.
- **Icons are not vector.** `favicon/favicon.svg` is a 942×942 canvas wrapping one embedded
  raster, so every size is a downsample. The two-row "We / Com" lockup only survives from 48px
  up; 16 and 32 use the "W" mark. Padding is trimmed per size. Re-measure with
  `magick favicon/favicon.svg -trim -format '%wx%h+%X+%Y\n' info:` before re-rendering, because
  the crop offsets are hardcoded.

### Reference

- Export contract: [`docs/schema.md`](docs/schema.md)
- Implementation plan: [`docs/PLAN.md`](docs/PLAN.md)
- Product spec: [`.claude/prds/web-ui-commentator.prd.md`](.claude/prds/web-ui-commentator.prd.md)
- Store metadata: [`STORE.md`](STORE.md), still the scaffold template. The listing name, summary,
  category, screenshots, permission justifications, and reviewer steps are unwritten.
