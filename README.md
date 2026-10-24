# Web UI Commentator

**Point at things on your screen. Leave a note. Hand your AI agent a machine-readable map
of exactly which element you meant.**

Stop writing "the blue button on the right in the third card" in chat and hoping the agent
guesses right. Click the button instead. The extension records what it is — a CSS selector, the
tag, its text, its geometry — and exports it as JSON your coding agent can act on directly.

No screenshots to annotate. No DevTools. No hunting for a selector by hand.

```
You click "Pay now"  →  comment: "make this the only filled button"
                     →  JSON export  →  agent knows: button#pay-now, <script>, rect, text, url
                     →  agent edits the right component on the first try
```

- Works anywhere: local dev servers, staging, production, static HTML, `file://` pages.
- Chrome, Edge, Firefox (Manifest V3).
- Everything stays on your machine in the browser's local storage. No account, no server, no
  telemetry.

---

## Quick start

### Install from the repo (about two minutes)

> Node ≥ 22.12 required — only for building.

```bash
git clone <this-repo-url> web-ui-commentator
cd web-ui-commentator
npm install
npm run build:chrome        # or npm run build:firefox
```

Then load it in the browser:

**Chrome / Edge**

1. Go to `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → pick `dist/chrome`.
4. Open any web page. Pin the extension so the toolbar icon is visible.

**Firefox**

1. Go to `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on** → pick `dist/firefox/manifest.json`.

Temporary add-ons disappear when Firefox restarts — that's normal, just load it again.

### Or let the dev server do it

```bash
npm run dev                 # builds, watches, and opens a managed Chrome with the extension loaded
```

Use this while hacking on the extension itself; reloading on save is automatic.

---

## Using it

### The 30-second version

1. Press <kbd>Ctrl</kbd>+<kbd>\\</kbd> on the page you're reviewing. Comment mode turns on —
   the page dims and elements highlight as you hover.
2. **Click the thing you want changed.** A small card opens, anchored to that element.
3. Type what you want. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> saves. A numbered pin appears.
4. Click the toolbar icon → pick an export detail (remembered) → **Copy JSON**.
5. Paste it to your agent along with the prompt below.

Click a pin any time to reread, edit, or delete that comment.

### Painless alternatives to the hotkey

- **Right-click** anything → **Wecom utility** → **Comment on this element**. The card opens
  straight on it. Great for elements that are hard to click cleanly (links, tiny icons).
- **Toolbar icon → Comment mode** does the same thing as the hotkey.
- The same submenu carries the whole page workflow: **Toggle comment mode**, **Copy JSON**
  (every page, same document as the popup), and **Ditch all on this page** (asks once in a
  native confirm before deleting).

### Keys

| Action | Shortcut |
| --- | --- |
| Turn comment mode on / off | <kbd>Ctrl</kbd>+<kbd>\\</kbd> |
| Comment on an element | right-click → *Wecom utility* → *Comment on this element* |
| Save the comment | <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (or <kbd>⌘</kbd>+<kbd>Enter</kbd>) |
| Exit comment mode / close the card | <kbd>Esc</kbd> |

### The popup

Click the extension icon to see:

- How many comments are on the page you're looking at, and how many you have overall.
- **Comment mode** toggle, for when you'd rather click than type.
- **Export detail** — `light` / `medium` / `heavy` (see below). Remembered between popups, and
  the copy button on the in-page bar uses the same level.
- **Copy JSON** / **Download JSON** — everything, every page, one document.
- **Clear this page** — removes this page's comments (asks you to click twice — no accidents).

### Where your comments live

Comments are keyed by `origin + pathname`, so `?utm_source=…` and `#section` don't split your
review into pieces, and `/checkout?step=2` shares notes with `/checkout`. Reloading the page
keeps your pins. Comments survive browser restarts and are per browser profile — they are
**not** synced between machines and not shared with anyone.

---

## Pasting it into your agent

Copy the JSON, then send something like this. Paste the JSON in the same message (or as a file):

```
Here are my UI review comments from Web UI Commentator.

<PASTE JSON HERE>

For each comment:
1. Read `detail` first, then `comments`.
2. Resolve `target.selector` in the codebase (or the DOM). If it doesn't match,
   and this is a `heavy` export, fall back to `target.domPath`.
3. Verify the resolved element matches `target.tag`, and that `target.text` appears
   in it. If it does not match, say the element is gone — do not guess at a similar one.
4. Make the change the `body` asks for.
5. Keep a todo list: one entry per comment ID, mark each done as you go.

Report anything you could not resolve instead of silently skipping it.
```

That prompt is the whole trick: it forces the agent to **verify** it found the right element
before touching code, instead of confidently rewriting the wrong button.

> **Note:** `schemaVersion` is `2`. The full contract, field by field — including how to
> re-anchor an element after a refactor — is in [`docs/schema.md`](docs/schema.md). Point your
> agent at that file if it needs the details.

---

## Export detail: which one do I want?

The popup gives you three levels. Bigger is not better — pick for the job.

| Level | Use it when | Rough size (40 comments) | Each element is identified by |
| --- | --- | --- | --- |
| `light` | Handing to an LLM to *understand* the feedback. Cheapest, fastest. | ~2.5k tokens | selector + text |
| `medium` | **Default.** Normal page, agent reads live DOM or the code is stable. | ~7.6k tokens | selector, tag, text, attributes, geometry |
| `heavy` | The page is heavily refactored, or you want the agent to survive a rebuild. | ~9.5k tokens | everything, plus a DOM path that always resolves |

The interesting bit is `heavy`: it carries `domPath`, `domIndex` and `ancestors`, so even if
your build tool renames every class and the selector stops matching, the agent still has a way
to walk back to the element. If you're reviewing a page that changes between builds, spend the
extra tokens.

Output is minified JSON on purpose — tokens are money.

---

## Common problems

**Nothing happens when I press <kbd>Ctrl</kbd>+<kbd>\\</kbd>**
Not every page allows extensions. Browser internals (`chrome://…`, `about:…`, extension pages)
and the Chrome Web Store refuse content scripts — that's a browser rule, not a bug. Something
open late (a modal, an SPA route change) may need a page reload before the extension attaches.

**The card opens on the wrong element**
Some sites rebuild the DOM constantly, so very fast clicks can land a frame behind. Click the
pin and delete, then use right-click → *Wecom utility* → *Comment on this element* instead, which
targets after the page settles.

**My comments are gone after a reload**
Check the URL path. Comments are bucketed by `origin + pathname`, so `/app` and `/app/index.html`
are different buckets. Pins only show for the page they were made on; the export always
contains everything.

**`file://` pages don't work**
Enable **Allow access to file URLs** on the extension's details page (`chrome://extensions` →
the extension → Details).

**Firefox: the extension vanished after I restarted**
Temporary add-ons are temporary. Reload from `about:debugging`. Permanent installs come from a
signed build (see *Releasing* below).

**The page's own styles look broken while comment mode is on**
The overlay lives in a shadow root with scoped styles, so it shouldn't leak — but if you see it,
open an issue with the URL (or a small fixture page that reproduces it).

---

## For contributors

### Scripts

```bash
npm run dev            # watch + managed browser with the extension loaded
npm start              # same, without the initial build
npm run build          # production build -> dist/chromium
npm run build:chrome   # Chrome build + store zip in dist/
npm run build:firefox  # Firefox gecko build + zip in dist/
npm run build:edge     # Edge build
npm test               # vitest, 33 tests
npx tsc --noEmit       # type check
```

Stack: [Extension.js](https://extension.js.org) (Rspack) · React 18 · Tailwind CSS v4 ·
shadcn/ui. Needs Node ≥ 22.12.

### Testing against a deliberately awkward page

`fixtures/demo.html` has the DOM cases that break annotators: duplicate classes, deep nesting,
inline SVG, forms, and hostile global CSS.

```bash
npx serve fixtures      # http://localhost:3000/demo.html
```

### Where things are

```
src/
  content/        overlay injected into pages: comment mode, pins, cards
  popup/          toolbar popup: counts, export, clear
  shared/         locator building/resolution, storage, export projection, schema
  components/ui/  shadcn primitives
  styles/         Tailwind tokens shared by content + popup
fixtures/demo.html  hostile test page
test/               vitest unit tests
docs/schema.md      the export contract — the actual product
docs/PLAN.md        implementation plan / build history
```

### Releasing

Pushing a `v*` tag builds Chrome and Firefox, then attaches both zips to a GitHub release.
Every push and PR keeps them as the `extension-zips` workflow artifact.

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Chrome 150+ refuses `--load-extension` on the command line, so a manual *Load unpacked* (or
`npm run dev`, which uses a managed Chrome for Testing) is the only path.

### Known gaps

Not built yet: stale-element reporting in the UI, iframe records, a focus trap for the card,
zoom handling, and a Playwright end-to-end spec. A comment whose element has disappeared simply
has no pin; it is still present in the export.

### Verification status

`npx tsc --noEmit` is clean and `npm test` passes 33 tests (card placement, locator
build/resolve, `urlKey`, storage watch, export projection, right-click targeting, hotkey
matching, context-menu copy and clear). `npm run build` produces ~540 KB in `dist/chromium`.

Build-level proofs, checked against `dist/chrome` and `dist/firefox`:

| Check | Evidence |
| --- | --- |
| Content CSS reaches the shadow root, not the page | `content_scripts[].css` is `[]`; the bundle carries one `data:text/css` payload |
| Tailwind theme + shadcn tokens resolve in a shadow root | inlined CSS contains `:root,:host` and `--background` |
| Popup page gets the same tokens in document scope | `action/index.css` contains both `:root` and `:host` token blocks |
| `@/*` path aliases resolve through Rspack | the build resolves `@/components/ui/*` |
| Content script is self-contained | `content-0.js` has no reference to `shared/framework.js` |

Still unverified because it needs a real browser session: how the overlay looks under the fixture
page's hostile CSS, that a click really is cancelled, and that reloading leaves one host.

### Gotchas worth knowing before you touch the code

- **`Ctrl+\` can't be a manifest command.** `commands.suggested_key` only accepts letters, digits,
  Comma, Period and a few named keys — so the shortcut is handled in the content script
  (`src/content/hotkey.ts`), where comment mode actually runs.
- **`browser.*` vs `chrome.*` on Firefox.** Extension.js deliberately skips the webextension
  polyfill on gecko builds, so `chrome.*` is callback-only there and `await` on it returns
  `undefined`. Always go through `browserApi()` in `src/shared/browser.ts`, which prefers
  `globalThis.browser`.
- **No portal-based shadcn primitives in the overlay.** Dialog / Popover / Tooltip / Select /
  DropdownMenu portal to `document.body`, outside the shadow root. They're avoided in the popup
  too, for consistency.
- **React 18 + shadcn's `ref`-as-prop style.** shadcn generates React 19 components; React 18
  drops `ref` on function components. Use `autoFocus` / plain props on `Textarea`, `Input` and
  friends, or convert them to `forwardRef` first.
- **`@/lib/utils` imports after `npx shadcn@latest add`.** The CLI resolves the `utils` alias to
  the npm package `cn`. Install `clsx` + `tailwind-merge` and rewrite `from "cn"`.
- **No `baseUrl` in `tsconfig.json`.** TypeScript 7 removed it; `paths` alone works.
- **Icons are not vector.** `favicon/favicon.svg` is a 942×942 canvas wrapping one embedded
  raster, so every size is a downsample. The two-row "We / Com" lockup only survives from 48px
  up; 16 and 32 use the "W" mark. Padding is trimmed per size — re-measure with
  `magick favicon/favicon.svg -trim -format '%wx%h+%X+%Y\n' info:` before re-rendering, because
  the crop offsets are hardcoded.

### Reference

- Export contract: [`docs/schema.md`](docs/schema.md)
- Implementation plan: [`docs/PLAN.md`](docs/PLAN.md)
- Product spec: [`.claude/prds/web-ui-commentator.prd.md`](.claude/prds/web-ui-commentator.prd.md)
- Store submission notes: [`STORE.md`](STORE.md)
