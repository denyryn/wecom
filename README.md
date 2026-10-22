# Web UI Commentator

Click any element on a page, comment on it, and export a locator an AI agent can act on
without opening DevTools.

Chrome MV3 extension built with [Extension.js](https://extension.js.org) (Rspack) +
React + Tailwind CSS v4 + shadcn/ui.

- Requirements: **Node ≥ 22.12**, npm.
- Spec: [`.claude/prds/web-ui-commentator.prd.md`](.claude/prds/web-ui-commentator.prd.md)
- Implementation plan: [`docs/PLAN.md`](docs/PLAN.md)

## Develop

```bash
npm install
npm run dev          # builds, watches, and opens a managed browser with the extension loaded
npm run build        # production build -> dist/chromium
```

Load it by hand: `chrome://extensions` → Developer mode → Load unpacked → `dist/chromium`.
`file://` pages need "Allow access to file URLs" enabled for the extension.

Sample page with the awkward DOM cases (duplicate classes, deep nesting, inline SVG,
a form, hostile global CSS):

```bash
npx serve fixtures        # http://localhost:3000/demo.html
```

## Shortcuts

| Action | Key |
| --- | --- |
| Toggle comment mode | `Alt+Shift+C` |
| Leave comment mode | `Esc` |

## Status

M0 (scaffold + stack spike) is **build-verified, runtime-unverified**.

Proven by `npm run build` and inspecting the output:

| Check | Evidence |
| --- | --- |
| Content CSS reaches the shadow root, not the page | `content_scripts[].css` is `[]`; the bundle carries one `data:text/css` payload |
| Tailwind theme + shadcn tokens resolve in a shadow root | inlined CSS contains `:root,:host` and `--background` |
| Popup page gets the same tokens in document scope | `action/index.css` contains both `:root` and `:host` token blocks |
| `@/*` path aliases resolve through Rspack | the build resolves `@/components/ui/*` |
| Types | `npx tsc --noEmit` clean |

Not yet verified in a browser (needs a test browser — Chrome 155+ dropped `--load-extension`,
so it must be Chromium / Chrome for Testing):

1. Overlay renders styled on `fixtures/demo.html` and is unaffected by that page's hostile CSS.
2. In comment mode a click does not navigate a link or submit the form.
3. `Esc` restores normal page behaviour.
4. Re-injecting the content script leaves exactly one host element.

## Notes

- After any `npx shadcn@latest add …`, check that generated components import `cn` from
  `@/lib/utils`. The CLI resolves the `utils` alias to the npm package `cn` in this project;
  the fix is to install `clsx` + `tailwind-merge` and rewrite `from "cn"`.
- `tsconfig.json` must not set `baseUrl` — TypeScript 7 removed it; `paths` alone works.
- Portal-based shadcn primitives (Dialog/Popover/Tooltip/Select/DropdownMenu) must not be used
  inside the content overlay: they portal to `document.body`, outside the shadow root.
  They are fine in the popup.
