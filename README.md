# Web UI Commentator

Click any element on a page, comment on it, and export a locator an AI agent can act on
without opening DevTools.

Chrome / Firefox MV3 extension built with [Extension.js](https://extension.js.org) (Rspack) +
React + Tailwind CSS v4 + shadcn/ui.

- Requirements: **Node ≥ 22.12**, npm.
- Spec: [`.claude/prds/web-ui-commentator.prd.md`](.claude/prds/web-ui-commentator.prd.md)
- Implementation plan: [`docs/PLAN.md`](docs/PLAN.md)
- Export contract: [`docs/schema.md`](docs/schema.md)

## What works

- `Ctrl+\` (or the toolbar popup) arms comment mode on any page.
- Right-click → "Comment on this element": the composer opens directly on that element
  (falls back to arming comment mode when the target can't be used).
- Click an element: the page's own click/submit is swallowed and a composer opens anchored to it.
- Save writes the comment to `chrome.storage.local` under the page's URL bucket, and a numbered
  pin appears on the element. Pins follow scroll and resize.
- Click a pin to read the comment, edit the body, or delete it (two-click confirm).
- Popup: comments on the active page, total across pages, comment-mode toggle, copy JSON,
  download JSON, clear this page.
- Export detail: `light` (`id`/`url`/`selector`/`text`/`body` only), `medium` (default), `heavy`
  (adds `domPath`/`ancestors`/`domIndex`, so a locator survives a refactor). On a 40-comment
  export that is ~2.5k / ~7.6k / ~9.5k tokens. Output is minified; `schemaVersion` is 2.

Not built yet: stale-element reporting, iframe records, focus trap for the card, zoom handling,
and the Playwright end-to-end spec. A comment whose element has disappeared simply has no pin;
it is still present in the export.

## Develop

```bash
npm install
npm run dev          # builds, watches, and opens a managed browser with the extension loaded
npm run build         # production build -> dist/chromium
npm run build:chrome  # Chrome + store-ready zip in dist/
npm run build:firefox # Firefox gecko build + zip in dist/
```

Load it by hand: `chrome://extensions` → Developer mode → Load unpacked → `dist/chrome`.
Chrome 150+ refuses `--load-extension` on the command line, so the manual path (or
`npm run dev`, which uses a managed Chrome for Testing) is the only one.

Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `dist/firefox/manifest.json`.
Temporary add-ons vanish on restart, which is fine for staging work.

`file://` pages need "Allow access to file URLs" enabled for the extension.

Sample page with the awkward DOM cases (duplicate classes, deep nesting, inline SVG,
a form, hostile global CSS):

```bash
npx serve fixtures        # http://localhost:3000/demo.html
```

## Shortcuts

| Action | Key |
| --- | --- |
| Toggle comment mode | `Ctrl+\` |
| Comment on an element | right-click → "Comment on this element" |
| Leave comment mode / close card | `Esc` |
| Save a comment | `⌘/Ctrl+Enter` |

## Verification

```bash
npx tsc --noEmit     # clean
npm test             # 21 tests: card placement, locator build/resolve, urlKey, storage watch,
                     #            export detail projection
npm run build        # ~453 KB extension in dist/chromium
```

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

## Notes

- After any `npx shadcn@latest add …`, check that generated components import `cn` from
  `@/lib/utils`. The CLI resolves the `utils` alias to the npm package `cn` in this project;
  the fix is to install `clsx` + `tailwind-merge` and rewrite `from "cn"`.
- `tsconfig.json` must not set `baseUrl` — TypeScript 7 removed it; `paths` alone works.
- Portal-based shadcn primitives (Dialog/Popover/Tooltip/Select/DropdownMenu) must not be used
  inside the content overlay: they portal to `document.body`, outside the shadow root.
  They are avoided in the popup too, for consistency.
- Extension icons come from `favicon/favicon.svg`. That file is *not* vector: it is a 942×942
  canvas wrapping one embedded raster, so every size is a downsample. The two-row "We / Com"
  lockup only survives from 48px up; 16 and 32 use the "W" mark alone. Padding is trimmed per
  size — re-measure with `magick favicon/favicon.svg -trim -format '%wx%h+%X+%Y\n' info:`
  before re-rendering, because the crop offsets are hardcoded.
- shadcn's generated components use the React 19 `ref`-as-prop style. React 18 drops refs on
  function components, so use `autoFocus` / plain props instead of `ref` on `Textarea`, `Input`
  and friends — or convert them to `forwardRef` first.
- Extension.js deliberately skips the webextension polyfill on gecko builds, so `chrome.*` only
  works in Chrome — Firefox's `chrome` alias is callback-only and `await` on it returns
  `undefined`. All runtime API access goes through `browserApi()` in `src/shared/browser.ts`,
  which prefers `globalThis.browser` and falls back to `globalThis.chrome`.
