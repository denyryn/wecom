# Web UI Commentator

Click any element on a page, comment on it, and export a locator an AI agent can act on
without opening DevTools.

Chrome MV3 extension built with [Extension.js](https://extension.js.org) (Rspack) +
React + Tailwind CSS v4 + shadcn/ui.

- Requirements: **Node ≥ 22.12**, npm.
- Spec: [`.claude/prds/web-ui-commentator.prd.md`](.claude/prds/web-ui-commentator.prd.md)
- Implementation plan: [`docs/PLAN.md`](docs/PLAN.md)
- Export contract: [`docs/schema.md`](docs/schema.md)

## What works

- `Alt+C` (or the toolbar popup) arms comment mode on any page.
- Click an element: the page's own click/submit is swallowed and a composer opens anchored to it.
- Save writes the comment to `chrome.storage.local` under the page's URL bucket, and a numbered
  pin appears on the element. Pins follow scroll and resize.
- Click a pin to read the comment, edit the body, or delete it (two-click confirm).
- Popup: comments on the active page, total across pages, comment-mode toggle, copy JSON,
  download JSON, clear this page.

Not built yet: stale-element reporting, iframe records, focus trap for the card, zoom handling,
and the Playwright end-to-end spec. A comment whose element has disappeared simply has no pin;
it is still present in the export.

## Develop

```bash
npm install
npm run dev          # builds, watches, and opens a managed browser with the extension loaded
npm run build        # production build -> dist/chromium
npm run build:chrome # same, for Chrome, plus a store-ready zip in dist/
```

Load it by hand: `chrome://extensions` → Developer mode → Load unpacked → `dist/chromium`.
Chrome 150+ refuses `--load-extension` on the command line, so the manual path (or
`npm run dev`, which uses a managed Chrome for Testing) is the only one.

`file://` pages need "Allow access to file URLs" enabled for the extension.

Sample page with the awkward DOM cases (duplicate classes, deep nesting, inline SVG,
a form, hostile global CSS):

```bash
npx serve fixtures        # http://localhost:3000/demo.html
```

## Shortcuts

| Action | Key |
| --- | --- |
| Toggle comment mode | `Alt+C` |
| Leave comment mode / close card | `Esc` |
| Save a comment | `⌘/Ctrl+Enter` |

## Verification

```bash
npx tsc --noEmit     # clean
npm test             # 13 tests: card placement, locator build/resolve, urlKey
npm run build        # ~452 KB extension in dist/chromium
```

Build-level proofs, checked against `dist/chromium`:

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
- shadcn's generated components use the React 19 `ref`-as-prop style. React 18 drops refs on
  function components, so use `autoFocus` / plain props instead of `ref` on `Textarea`, `Input`
  and friends — or convert them to `forwardRef` first.
