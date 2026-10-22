# Web UI Commentator — Implementation Plan

A Chrome MV3 extension that lets a user click any element on any page, attach a comment
to it, and export the review as a JSON document an AI agent can act on without DevTools.

**Stack:** [Extension.js](https://extension.js.org) 4.x (Rspack, manifest-driven) + React 19 +
Tailwind CSS v4 + shadcn/ui. Node **≥ 22.12** is required by the toolchain.

## 1. Goal

```
user clicks button  ->  comment "make this secondary"
                     ->  { selector: "main > button#pay-now",
                           classes: ["btn","btn-primary"],
                           text: "Pay now",
                           url: "http://localhost:3000/checkout" }
```

The JSON is the product. The UI exists only to produce it comfortably.

## 2. Non-goals (v1)

| Skipped | Why |
|---|---|
| Screenshots / thumbnails | Blows storage quota; the locator is what agents need |
| Threads / replies | One body + edit says what you want |
| Cloud sync, accounts, sharing | Export file is the sharing mechanism |
| Firefox / Safari | Extension.js supports them, but the shadow-DOM + portal surface doubles. Chrome only until the UX is proven |
| Commenting inside cross-origin iframes | Recorded in export, not interactive (§10) |
| Dark mode | shadcn's `.dark` variant needs the host element to carry the class; not worth the plumbing yet |
| Live preview of fixes | Different product |

## 3. Stack decisions

| Area | Decision | Why |
|---|---|---|
| Framework | Extension.js 4.1.x, `--template=content-react`, react + react-dom + TS + Tailwind v4 | Owns manifest compilation, dev server, HMR, multi-browser builds. Hand-rolling MV3 + a bundler is more config than product |
| Bundler | Rspack via Extension.js `config`/`configResolved` — never touch it directly | Vite plugins (`@tailwindcss/vite`) do **not** apply; Tailwind goes through PostCSS |
| Manifest | `src/manifest.json` (never `public/`, which fails the build) | Framework compiles entrypoints from manifest paths |
| Config | `extension.config.js` (`.js`/`.mjs`/`.cjs` only, `.ts` is never loaded) | Browser profiles, dev port, build targets |
| UI | React 18 + shadcn/ui + Tailwind v4 | Fast, consistent, and officially supported by Extension.js. React 18 is what the official template pins; upgrading is not worth the spike risk |
| Content UI mount | Shadow root (`data-extension-root`, `all: initial !important`) | Page CSS cannot reach in, our CSS cannot leak out |
| Content CSS | Imported into the entry, fetched as a `data:` URL into a `<style>` **inside the shadow root** | Manifest `content_scripts[].css` injects unscoped into the page document — Tailwind preflight there would destroy the host page |
| Popup | Normal extension page (`src/popup/index.html`) + shadcn | No shadow root, so all portal-based primitives are free |
| Storage | `chrome.storage.local`, one key per normalized URL | No backend, survives restart |
| Export | `<a download>` from the popup + clipboard | Zero permissions |
| Tests | Vitest + jsdom for pure logic, Playwright for E2E | Logic (locator, positioning, urlKey) is where the bugs live |

## 4. Hard rules

These are the things that break silently. Enforce in review; two of them in ESLint.

1. **No content-script CSS in `manifest.json`.** Not one `content_scripts[].css` entry.
   It goes into the page document unscoped. All content styling is imported and injected
   into the shadow root.
2. **Tailwind ≥ 4.0.1.** From 4.0.1 the `@theme` layer emits `:root, :host`, which is what
   makes utilities resolve inside a shadow root. On 4.0.0 every `var(--color-*)` is undefined there.
3. **shadcn token blocks must target the host.** `shadcn init` writes `:root { --background: … }`
   and `.dark { … }`. Inside a shadow root `:root` matches nothing. Edit to `:root, :host { … }`.
4. **No portal-based shadcn primitive inside the content tree.** Dialog, AlertDialog, Popover,
   Tooltip, DropdownMenu, Select, Sheet, Command, Sonner all portal to `document.body` and
   would render outside the shadow root — styled by the page and unstyled by us.
   Use them in the popup only. Content tree is limited to
   Button, Card, Textarea, Input, Label, Badge, Separator, ScrollArea, Tabs.
   Enforce with `no-restricted-imports` scoped to `src/content/**`.
5. **Content entry contract.** `src/content/scripts.tsx` default-exports a **synchronous**
   function returning a cleanup. Cleanup order: `root.unmount()` then `host.remove()`.
   Extension.js re-runs this function on every save; a missing cleanup stacks overlays.
6. **`all: initial !important` on the host also kills inheritance.** Theme variables survive
   (`all` does not touch custom properties), but `font-family`, `font-size`, `color` do not.
   Set base typography on our own inner root element (`<div class="font-sans text-[13px] …">`),
   not on `:host`.
7. **`@source` globs are explicit** in `globals.css`, e.g. `@source "../**/*.{ts,tsx}"`.
   Tailwind v4 auto-detection from the CSS file's directory is not worth trusting for
   shadcn components that live in a sibling folder.

## 5. Project layout

```
extension.config.js
components.json                 # shadcn: aliases @/components, @/lib/utils
postcss.config.js               # { "@tailwindcss/postcss": {} }
tsconfig.json                   # paths: { "@/*": ["./src/*"] }  (jsconfig.json is ignored)
package.json                    # Node >= 22.12
src/
  manifest.json
  background.ts                 # commands, badge, install defaults
  styles/globals.css            # @import "tailwindcss"; @source …; :root, :host tokens
  components/ui/*               # shadcn generated
  lib/utils.ts                  # cn()
  shared/
    schema.ts                   # Comment, Export, schemaVersion
    locator.ts                  # buildLocator / resolveLocator  ← pure, unit-tested
    position.ts                 # clamp/flip card placement       ← pure, unit-tested
    storage.ts                  # urlKey(), CRUD, buildExport()
  content/
    scripts.tsx                 # entry: host + shadow root + CSS + React mount + cleanup
    ContentApp.tsx              # overlay React tree, mode state
    inspect.ts                  # plain DOM: hit-test, capture-phase event blocking (no React)
    anchors.ts                  # comment → element, rAF rect sync
    components/                 # HighlightBox, PinLayer, CommentCard, Composer, ReadPanel
  popup/
    index.html
    scripts.tsx
    PopupApp.tsx
  images/
test/locator.test.ts
test/position.test.ts
test/e2e/comment.spec.ts
fixtures/demo.html              # nasty DOM: nested classes, SVG, dupes, re-renders
docs/schema.md
docs/PLAN.md
```

`src/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Web UI Commentator",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.ts" },
  "action": { "default_popup": "popup/index.html" },
  "commands": {
    "toggle-inspect": {
      "suggested_key": { "default": "Alt+Shift+C" },
      "description": "Toggle element comment mode"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "all_frames": false,
      "run_at": "document_idle",
      "js": ["content/scripts.tsx"]
    }
  ]
}
```

Note the two unrelated `commands` keys: the one above is the **manifest** (`chrome.commands`);
`extension.config.js → commands` configures the **CLI** (`dev`, `build`). Do not mix them.

```js
// extension.config.js
export default {
  browser: { chrome: { persistProfile: true } },
  commands: {
    dev:   { browser: "chrome", port: 8080 },
    build: { browser: "chrome", zip: true },
  },
};
```

## 6. Content script bootstrap

The exact shape, with the two things the docs are specific about (host contract, CSS-as-data-URL):

```tsx
// src/content/scripts.tsx
import "./styles.css";          // makes the pipeline inline it as a data: URL
import { createRoot } from "react-dom/client";
import { ContentApp } from "./ContentApp";

export default function initial() {
  const host = document.createElement("div");
  host.setAttribute("data-extension-root", "true");
  host.style.cssText = "all: initial !important";
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });

  const mountPoint = document.createElement("div");
  mountPoint.className = "font-sans text-[13px] leading-normal text-foreground";
  shadowRoot.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  let disposed = false;

  (async () => {
    const style = document.createElement("style");
    const url = new URL("./styles.css", import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`css fetch failed: ${res.status}`);
    style.textContent = await res.text();
    if (disposed) return;
    shadowRoot.prepend(style);
    root.render(<ContentApp shadowRoot={shadowRoot} />);
  })();

  return () => {
    disposed = true;
    root.unmount();
    host.remove();
  };
}
```

If `fetchCSS` turns out not to work against the inlined asset, the documented fallback is
Extension.js's own hydration: it inserts `<style data-extjs-bundle-css="true">` as the first
child when no stylesheet of ours is present. Prove which one works in M0 and delete the other.

## 7. Architecture

```
┌──────────────────────────── page ────────────────────────────┐
│ content script (shadow root)                                  │
│   inspect.ts   hover/hit-test, capture-phase click blocking    │
│   ContentApp   highlight, pins, card — React + shadcn          │
│   anchors.ts   comment → element, rAF reposition on scroll      │
└───────────────────────────────────────────────────────────────┘
        ▲ messages                      ▲ chrome.storage.local
┌───────┴────────┐            ┌─────────┴──────────┐
│ background.ts  │            │ popup (React)      │
│ commands,      │            │ count, toggle,     │
│ badge count    │            │ copy/download/clear│
└────────────────┘            └────────────────────┘
```

Why `inspect.ts` is not React: click interception must be registered in the capture phase on
`document` the moment the mode is armed, and must be able to `preventDefault()` before React
sees anything. It publishes `{ element }` to React through a callback; React never owns the
event listeners that matter.

## 8. The locator (the hard part)

Element identity must survive a reload, an HMR update, a route change, and a re-render.
One CSS selector is not enough. Capture redundant, independent signals:

| Signal | Purpose |
|---|---|
| `selector` | Primary lookup; unique CSS path |
| `selectorUnique` | `false` when the generator fell back to a positional path |
| `ancestors` | Last 4 ancestors as `tag.class` — lets an agent re-anchor by context |
| `domPath` | `tag:nth-of-type()` from `<html>` — absolute, brittle, always resolvable |
| `domIndex` | Numeric child indices — shape-comparable across similar pages |
| `tag`, `id`, `classes` | Human/agent-readable identity |
| `attrs` | Allowlist: `role`, `aria-*`, `name`, `type`, `placeholder`, `href`, `data-testid`, `data-*` |
| `text` | Trimmed `textContent`, ≤ 80 chars |
| `rect` | Document coords (`viewportRect + scroll`), CSS px |
| `visible` | Non-zero box and `display !== none` at capture |

Generation: unique `#id` → walk up with `tag.class:nth-of-type(n)` until unique → absolute
`domPath` fallback. Validate every candidate inside `try/catch` (invalid escapes, SVG
camelCase attributes). Resolution order when repainting pins: `selector` → `domPath` → `text`
within `ancestors`. Export carries `resolvedBy` so an agent knows how much to trust it.

All of it is pure functions over a `Document` in `src/shared/locator.ts` — no dependency on
Extension.js, React, or the extension APIs, which is why it is unit-testable in jsdom.

## 9. UX

**Idle** — nothing intercepts the page; existing pins are visible.

**Inspect mode** (`Alt+Shift+C`, toolbar button, or popup button)
- `pointermove` → `elementFromPoint` → 2px outline + label with `tag#id.class` and role.
- Capture-phase `pointerdown`, `mousedown`, `click`, `submit`: `preventDefault()` +
  `stopPropagation()` while armed. A click must never navigate, submit, or focus an input.
- Keyboard: `Tab`/`Shift+Tab` walk candidates, `Enter` selects, `↑` selects the parent, `Esc` exits.
  Candidates = elements with a non-zero box, excluding `html`/`body`/`script`/`style`/our host.
- `Esc` exits without creating anything.

**Composer** — shadcn `Card` + `Textarea` + `Button`, `position: fixed` inside the shadow root,
clamped to the viewport and flipped above when it would overflow (`position.ts`, unit-tested).
Manual placement, not Radix Popover: one less portal problem, ~30 lines of pure math.
`Tab`-trapped, autofocused, `Cmd/Ctrl+Enter` saves, `Esc` cancels. An `aria-live` region
announces the target's locator so screen-reader users know what they are commenting on.

**Pins** — 22 px numbered dot at the element's top-left, `pointer-events: auto` on the dot only.
Commented elements get a 1px dashed outline. Missing/invisible element → dashed, 50% opacity,
tooltip "element not found on this page".

**Read popover** — body at 15px/1.6, `max-width: 340px`, `createdAt`, Edit / Delete inline
(`Confirm` is a two-click button, not an AlertDialog). One card open at a time.

**Popup** — comment count for the active page, inspect toggle, "Copy JSON", "Download JSON",
"Clear this page". Reads `chrome.storage.local` directly; no content-script round trip.
This is a normal extension page, so shadcn `Dialog`/`Tooltip`/`Tooltip` are fine here.

## 10. Export contract

`schemaVersion` is bumped on any breaking change; consumers must reject unknown majors.

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-10-22T12:00:00.000Z",
  "extensionVersion": "0.1.0",
  "comments": [
    {
      "id": "1d4f0a9e-3c1b-4f2a-9a55-7b0c2e8f1a33",
      "createdAt": "2026-10-22T11:58:02.114Z",
      "updatedAt": "2026-10-22T11:59:40.002Z",
      "status": "open",
      "body": "This is the primary action — make it the only filled button.",
      "page": {
        "url": "http://localhost:3000/checkout?step=2",
        "urlKey": "http://localhost:3000/checkout",
        "title": "Checkout",
        "viewport": { "width": 1440, "height": 900, "dpr": 2 }
      },
      "target": {
        "selector": "main.checkout > form > button.btn.btn-primary:nth-of-type(2)",
        "selectorUnique": true,
        "resolvedBy": "selector",
        "tag": "button",
        "id": "pay-now",
        "classes": ["btn", "btn-primary"],
        "text": "Pay now",
        "ancestors": ["body", "div#root", "main.checkout", "form#payment"],
        "domPath": "html > body > div#root > main.checkout > form#payment > button:nth-of-type(2)",
        "domIndex": [1, 0, 0, 0, 1],
        "attrs": { "type": "submit", "data-testid": "pay-now", "aria-label": "Pay now" },
        "role": "button",
        "rect": { "x": 1024, "y": 610, "width": 180, "height": 44 },
        "visible": true,
        "inShadowRoot": false,
        "frame": null
      }
    }
  ]
}
```

Rules: `rect` is document coordinates in CSS px (scroll-independent); `dpr` is included because
agent screenshots are device pixels; `classes` is an array (attribute order is unstable);
`attrs` is an allowlist, not the raw attribute map (inline styles and generated hashes are noise);
`page.url` is exact while `urlKey` is the storage bucket (`origin + pathname`, query and hash
dropped) — documented as a known collapse.

## 11. Milestones

Each is one reviewable diff. `fixtures/demo.html` exists from M0.

**M0 — scaffold + stack spike (highest risk, do first)**
`npx extension@latest create . --template=content-react`, add Tailwind v4 + `shadcn init`,
shadow-root mount per §6, inspect-mode toggle via command and popup, hover highlight through a
shadcn `Card`/`Badge`.
*Proves the three unverified integrations at once:* (a) Tailwind utilities and shadcn tokens
actually resolve inside the shadow root — a colored `Button` proves `:root, :host` and the token
rewrite from rule 3; (b) `@/*` path aliases resolve through Rspack; (c) the imported CSS reaches
the shadow root as a `<style>` and the host page's own Tailwind does not leak in.
*Done when:* highlight renders styled on `fixtures/demo.html` **and** on a page that itself uses
Tailwind, a click in inspect mode does not navigate a link, `Esc` restores normal behaviour, and
saving the file re-injects exactly one host (no stacking).

**M0 outcome (built)** — scaffolded from `content-react` and adjusted:
React 18 (template default), shared `src/styles/tokens.css` imported by both entries,
options page and template marketing assets removed, lockfile tracked.
Two toolchain traps found and fixed: TypeScript 7 removed `baseUrl` (use `paths` only),
and the shadcn CLI resolves the `utils` alias to the npm package `cn` — install
`clsx` + `tailwind-merge` and rewrite the generated imports to `@/lib/utils`.

Build-level proofs pass (see README table): no page-injected CSS, one `data:text/css` payload,
`:root,:host` tokens present, `@/` aliases resolve, `tsc --noEmit` clean.
Runtime proofs are **open** because Chrome 155 dropped `--load-extension` and the Playwright
Chromium download was deferred. Gate M1 on them — they are the M0 acceptance criteria above.

**M1 — comments in memory**
`position.ts`, composer, save, pins, read popover, edit, delete, single-card rule, keyboard walk.
*Done when:* create → pin → read → edit → delete works without a reload.

**M2 — persistence and URL scoping**
`storage.ts`, `urlKey`, hydrate on load, SPA URL-change polling (500 ms `location.href` compare),
popup count + clear.
*Done when:* comments survive reload; another path shows a different set; popup count matches.

**M3 — export contract**
`buildExport()`, copy/download, `docs/schema.md`, Vitest for `locator` (unique id, duplicate
classes, SVG child, deep nesting, multiline text) and `position` (all four flip cases).
*Done when:* exported JSON matches the documented shape and round-trips through `resolveLocator`
for every comment on the fixture page.

**M4 — robustness and accessibility**
Stale/invisible pins, `resolvedBy`, iframe records (`elementFromPoint` returning an `<iframe>`
records `frame`; interaction still off), focus trap, `aria-live`, `prefers-reduced-motion`,
zoom sanity at 50%/150%.
*Done when:* removing a commented element leaves an honest "not found" pin, and the whole flow
completes keyboard-only.

**M5 — E2E and handoff**
Playwright spec that loads `dist` unpacked against `fixtures/demo.html` (select → comment →
reload → assert pin → export). Note: branded Chrome 150+ dropped `--load-extension`, so point
Playwright at Chromium / Chrome for Testing, same as `extension dev` does.
README with install steps, the `file://` "allow access" note, and an example agent prompt.
*Done when:* the spec passes and a fresh clone builds and loads from the README alone.

### Status

| Milestone | State |
|---|---|
| M0 scaffold + stack spike | built; build-verified, runtime-unverified |
| M1 comments in memory | built (composer, pins, read/edit/delete, viewport clamping) |
| M2 persistence + URL scoping | built, except SPA URL-change polling |
| M3 export contract | built (`docs/schema.md`, copy/download, unit tests for locator + placement) |
| M4 robustness + a11y | not started |
| M5 E2E + handoff | not started; README exists, Playwright spec does not |

Runtime acceptance for everything above is still unverified: Chrome 155 dropped
`--load-extension`, so it needs Chromium / Chrome for Testing, or `npm run dev`.

## 12. Risks and gotchas

| Risk | Mitigation |
|---|---|
| Tailwind theme vars undefined in shadow root | Requires ≥ 4.0.1 (`:root, :host`). Verified by M0 acceptance |
| shadcn `:root` token block invisible in shadow root | Rewrite to `:root, :host` (rule 3); M0 acceptance covers it |
| Radix portals escape the shadow root | Banned in content (rule 4), ESLint-enforced; popup unaffected |
| Host page's own Tailwind/global CSS bleeding in | Shadow root + `all: initial !important`; M0 tests a Tailwind host page |
| Content CSS accidentally leaking out | No `content_scripts[].css` ever (rule 1) |
| Host stacking on every save | Cleanup contract (rule 5); M0 acceptance counts hosts |
| `<all_urls>` misses `chrome://`, Web Store, `about:` | Documented; silent there |
| `file://` needs a manual toggle | README |
| Capture-phase blocking cannot beat handlers registered before `document_idle` | Accepted; `document` capture is first for nearly all real apps |
| Isolated world cannot observe page `history.pushState` | Poll `location.href` instead of patching |
| `position: fixed` breaks if `body` has a transform/filter | Known limit; overlay lands wrong only on transformed-body sites. Ship, note in README |
| Locators drift after re-render | Redundant signals + `resolvedBy` + explicit stale state; never silently point at the wrong element |
| Node < 22.12 | Fails at install; document in README |
| Chrome 150+ ignores `--load-extension` (affects E2E and manual load) | Use Chromium / Chrome for Testing |
| `manifest.json` or `_locales` change forces a full dev reload; entrypoint changes need a dev-server restart | Expected; note in README |
| 10 MB `storage.local` | ~1 KB per comment, no images |

## 13. Open questions

1. `urlKey`: ignore tracking params (`utm_*`, `fbclid`) specifically, or keep dropping all query?
2. Is a `status: open | resolved` toggle useful, or is delete enough?
3. Any need for a second export format (markdown checklist, Linear/GitHub payload)?
4. Hosted CI: does the repo need to build for Firefox too, or is Chrome-only acceptable long-term?
