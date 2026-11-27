# DESIGN.md — design system (v1, dark instrument)

**Status:** shipped 2026-11-27 · source of truth [`src/styles/tokens.css`](src/styles/tokens.css).
**Imported by:** `src/content/styles.css` (shadow-root overlay) and `src/popup/styles.css` (320 px toolbar popup).
**History:** v0 was warm paper and ink; the redesign is recorded in [`docs/REDESIGN.md`](docs/REDESIGN.md).

## Direction

Dark instrument: near-black surfaces, one signal colour, precision-tool feel. The one idea is unchanged — **a comment is a mark**. The highlighter amber appears only on the hover outline, active pin ring, mode-on swipe, focus ring and text selection. No second accent, no gradient, no decoration.

One locally bundled face, IBM Plex Mono, carries both UI and data. Hierarchy comes from size, weight and colour, not another family. The face is inlined into the CSS by Rspack (`extension.config.js` `configResolved` hook) so the shadow-root stylesheet, which is itself injected as a `data:` URL, can load it with no network request. License: `src/fonts/LICENSE.txt` (SIL OFL 1.1).

Genre: modern-minimal (app screen). Posture: precise. Stamp in both stylesheets: Hallmark v2.0.0, checked 2026-11-27, floor 0 FAIL.

## Surfaces

| Surface | Where | Rule |
| --- | --- | --- |
| Overlay | `src/content/styles.css`, injected into a shadow root | `:root` matches nothing there; tokens live under `:root, :host`. No rule reaches the host page. All panels are opaque so they read over any host. |
| Popup | `src/popup/styles.css`, normal document, `body { width: 320px }` | `html, body { overflow-x: clip }`. Same tokens in document scope. |

`all: initial !important` on the shadow host drops inherited typography, so the base face and size are set on the mount container (`src/content/scripts.tsx:56-58`), not on `:host`.

## Palette

Cool neutrals, hue 260; the single signal is hue 88. Values are `oklch(L C H)`.

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `0.17 0.014 260` | canvas |
| `--foreground` | `0.94 0.008 260` | primary text |
| `--card`, `--popover` | `0.21 0.014 260` | raised, opaque surfaces |
| `--card-foreground`, `--popover-foreground` | `0.94 0.008 260` | text on raised surfaces |
| `--primary` | `0.3 0.014 260` | filled buttons, pins |
| `--primary-foreground` | `0.96 0.008 260` | text on filled buttons |
| `--secondary` | `0.27 0.014 260` | quiet fills |
| `--muted` | `0.25 0.012 260` | segmented track |
| `--muted-foreground` | `0.68 0.012 260` | labels, captions |
| `--accent` | `0.32 0.014 260` | selected / active fills |
| `--border` | `0.36 0.014 260` | hairlines |
| `--input` | `0.44 0.014 260` | input border |
| `--ring` | `0.86 0.15 88` | focus ring = the signal |
| `--destructive` | `0.65 0.19 25` | readable red on dark |
| `--marker` | `0.86 0.15 88` | the one highlighter signal |
| `--marker-ink` | `0.17 0.02 80` | text on the signal |
| `--paper-2`, `--paper-3` | `0.24`, `0.28` (hue 260) | hover / active fills |
| `--ink-2` | `0.38 0.014 260` | primary-button hover |
| `--shadow-raised` | `0 8px 16px -8px oklch(0 0 0 / 0.6)` | hairline does the work |

## Type

`--font-ui` and `--font-code` both resolve to `"Plex Mono Local"` with a monospace fallback chain. Font files: `src/fonts/plex-mono-latin-{400,500,600}.woff2`, latin subset only.

App scale, ratio 1.125: `--text-2xs` 10 · `--text-xs` 11 · `--text-sm` 12 · `--text-base` 14 · `--text-md` 15 · `--text-lg` 16 · `--text-xl` 20 · `--text-2xl` 28 px. Body copy uses `--text-base` at 1.6 line height; captions and keycaps use `--text-2xs`.

## Spacing and padding

4 px scale only: `--space-3xs` 2 · `--space-2xs` 4 · `--space-xs` 8 · `--space-sm` 12 · `--space-md` 16 · `--space-lg` 24 · `--space-xl` 40 px.

| Place | Padding |
| --- | --- |
| `.card-head`, `.comment-list__head` | `8px 16px`, min-height 44px |
| `.card-body` | `16px 16px 0` |
| `.card-foot` | `12px` above, `16px` below |
| `.element-facts` | label column 4rem, `16px` below, 4px gap |
| `.mode-hint` (island) | `8px 12px`, 8px gap |
| `.comment-list__items`, `.comment-item` | `8px` |
| Popup `main` | `p-5` (20px), 12px between groups, 8px within |

One column gap below the island; one radius per nesting level.

## Radius and motion

Radius ladder: `--radius-mark` 4 · `--radius-inner` 6 · `--radius-control` 8 · `--radius-panel` 10 · `--radius-card` 12 px; `--radius-pin` 999 px (pins are the one circle).

Motion: `--dur-micro` 120 ms, `--dur-short` 160 ms, `--ease-out` `cubic-bezier(0.2,0,0,1)`. `transform`/`opacity` only; every animated surface has a `prefers-reduced-motion: reduce` fallback. No `transition: all`; no animating `width`, `height`, `top` or `left`.

## Island placement

The floating mode bar ("island") can sit at any of six edges: `top|bottom` × `left|center|right`, default `top-center`. The setting lives in `chrome.storage.local` under `islandPosition` and is changed by the **Move island** button on the island itself — the popup has no position control. `data-v`/`data-h` attributes on the `.island` wrapper drive the CSS; there is no positioning math in React.

## Content that must survive a redesign

Layout may change; these strings and ARIA labels may not. Inventory (verbatim source):

- **Anchored card / composer** — `Composer.tsx`: `What should change here…`, `⌘/Ctrl+Enter`, `Discard comment` / `Discard`, `Add comment`. `ElementFacts.tsx`: `Role`, `Size`, `Font`, `Text`, `Classes`, `Attributes`, `Not unique`, `+N`.
- **Read card** — `ReadCard.tsx`: `Close comment`, `Discard edit`, `Save comment`, `Delete comment` / `Confirm delete`, `Edit comment`, `Confirm`.
- **Comment list** — `CommentList.tsx`: `Comments`, `No comments on this page yet.`, `Move list left/right`, `Close comment list`, `Copy comment` / `Copied` / `Copy failed`, `Delete comment N`.
- **Island (mode bar)** — `ContentApp.tsx`: `Comment mode`, `N on this page`, `Show/Hide comment list`, `Copy JSON` / `Copied` / `Copy failed`, `Ditch all` / `Confirm ditch all`, `Esc`, `Click again to ditch all comments`. New feature labels: `Move island`, and the six position names.
- **Toolbar popup** — `PopupApp.tsx`: `Wecom`, `Click an element, leave a note, export JSON an agent can act on.`, `This page is not readable from the popup.`, `Loading…`, `N comment(s) on this page`, `Comment mode`, `Export detail`, `light/medium/heavy`, `Copy JSON`, `Download JSON`, `Copied.`, `Copy failed.`, `Clear page` / `Confirm page`, `Clear site` / `Confirm site`, `N comment(s) across all pages`, `Ctrl+\`, `toggles comment mode`, and all restriction/error notices.

## House rules (do not regress)

1. No `content_scripts[].css` entry in the manifest — overlay CSS only via the shadow root.
2. Tailwind ≥ 4.0.1 so `@theme` emits `:root, :host`.
3. Token blocks target `:root, :host` so utilities resolve inside the shadow root.
4. No portal-based shadcn primitives in `src/content/**` (the island picker is inline, not a Radix popover). Dialog, Popover, Tooltip, Select, DropdownMenu, Sheet, Command, Sonner.
5. All colours and faces come from tokens; no literal colour or `font-family` outside the token block. No remote assets.
6. Every interactive element has an instant `:focus-visible`, a non-colour cue for state, and a reduced-motion fallback.
7. Content strings, ARIA labels and the export schema are never changed by a styling pass.
