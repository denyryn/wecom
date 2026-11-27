# Redesign plan — dark instrument

**Status:** implemented 2026-11-27 · all milestones R0–R5 shipped · [`DESIGN.md`](../DESIGN.md) describes the shipped v1 system.
**Rule for every milestone:** strings, ARIA labels, handlers, props and the export schema do not change. Only layout, styling and explicitly approved new feature UI change.

## 0. Decisions (from grill-me)

| Axis | Decision | Consequence |
| --- | --- | --- |
| Direction | **Dark instrument** — near-black surfaces, one signal colour, precision-tool feel | Flip the canvas from warm paper to cool dark; keep surfaces opaque so the overlay reads over any host page. |
| Type | **Mono-forward** — IBM Plex Mono for UI and data | Bundle a local face (no CDN, still offline). Selectors, facts, labels and buttons all mono; hierarchy from size/weight/colour, not a second family. |
| Island | **All six edges** — top/bottom × left/centre/right | One placement setting, six values, top-centre stays the default. |
| Placement control | **On the island itself** | A small position button on the island opens an inline picker. The popup gains no new control. |
| Scope | **Overlay + popup**, one shared token system | Both `src/content/styles.css` and `src/popup/styles.css` get the v1 tokens; relayout both, preserve all content. |

The signal colour stays the existing highlighter amber, retuned for the dark canvas. It keeps the product's one idea — *a comment is a mark* — and avoids the generic "near-black + acid green" look. It appears only on the hover outline, active pin ring, mode-on swipe, focus ring and text selection.

## 1. Invariants — do not regress

1. Every string and ARIA label inventoried in `DESIGN.md` survives byte-for-byte; the only new text is the island position picker's own labels.
2. `export.ts` / `schema.ts` export contract stays at `schemaVersion: 2`. No storage key is rewritten or deleted; new settings use new keys.
3. Shadow-root contract: no `content_scripts[].css`, tokens under `:root, :host`, no portal-based shadcn primitives in `src/content/**`, base typography on the mount container (`scripts.tsx:56-58`).
4. Offline: no remote font, image or script. Popup stays 320 px. Firefox build keeps working through `browserApi()`.
5. Accessibility: every interactive element keeps an instant `:focus-visible`, a non-colour cue for state (`aria-pressed`, text, icon), and a `prefers-reduced-motion: reduce` fallback.
6. Hallmark floor: all colours/faces via tokens, no `transition: all`, no animating `width`/`height`/`top`/`left`, `overflow-x: clip` on popup `html`/`body`, `minmax(0,1fr)` for any image grid, no invented metrics/testimonials/logos.

## 2. Target system (v1)

### Palette — replace values in `src/styles/tokens.css`, keep token names

| Token | v1 value (oklch) | Role |
| --- | --- | --- |
| `--background` | `0.17 0.014 260` | near-black canvas |
| `--foreground` | `0.94 0.008 260` | primary text |
| `--card`, `--popover` | `0.21 0.014 260` | raised, opaque surfaces |
| `--card-foreground`, `--popover-foreground` | `0.94 0.008 260` | text on raised surfaces |
| `--primary` | `0.30 0.014 260` | filled buttons, pins |
| `--primary-foreground` | `0.96 0.008 260` | text on filled buttons |
| `--secondary` | `0.27 0.014 260` | quiet fills |
| `--muted` | `0.25 0.012 260` | segmented track |
| `--muted-foreground` | `0.68 0.012 260` | labels, captions |
| `--accent` | `0.32 0.014 260` | selected/active fills |
| `--border` | `0.36 0.014 260` | hairlines |
| `--input` | `0.44 0.014 260` | input border |
| `--ring` | `0.86 0.15 88` | focus ring = the signal |
| `--destructive` | `0.65 0.19 25` | readable red on dark |
| `--marker` | `0.86 0.15 88` | the one signal |
| `--marker-ink` | `0.17 0.02 80` | text on the signal |
| `--paper-2`, `--paper-3` | `0.24`, `0.28` (hue 260) | hover/active fills — names kept, values retuned |
| `--ink-2` | `0.38 0.014 260` | primary-button hover |
| `--shadow-raised` | `0 8px 16px -8px oklch(0 0 0 / 0.6)` | hairline does the work on dark |

Keep hue 260 across neutrals and hue ~88 for the single signal. No second accent, no gradient.

### Type — mono-forward, offline

1. Add one locally bundled face: IBM Plex Mono, latin subset, 400/500/600 (or the variable woff2 if it is smaller) under `src/fonts/`.
2. Declare `@font-face` once in `tokens.css`; point `--font-ui` and `--font-code` at it. One family in two roles; size/weight/colour create hierarchy. No literal `font-family` outside the token block.
3. **Critical:** the overlay CSS is injected into the shadow root as a `data:text/css` URL (`scripts.tsx:84-95`). A relative `url(...woff2)` inside that CSS will not resolve. Prove one of: (a) the bundler inlines the woff2 as a base64 `data:` URL in the emitted CSS (preferred, no manifest change), or (b) inject a second `@font-face` with `chrome.runtime.getURL(...)` plus `web_accessible_resources` in `src/manifest.json`. This is milestone R1's gate — no visual work before it passes.
4. Body copy stays mono at 14 px / 1.6 in the cards. If a real screenshot proves it too narrow, the one allowed exception is a companion IBM Plex Sans for comment bodies only — record the decision here, do not add a third family.

### Padding and spacing contract ("proper padding")

Use only the existing 4 px scale — no new spacing values.

| Place | v0 | v1 |
| --- | --- | --- |
| `.card-head` | `4px 12px`, min-height 40 | `8px 16px`, min-height 44 |
| `.card-body` | `12px` | `16px` |
| `.card-foot` | `margin-top: 12px` | `12px 16px 16px` inside the card |
| `.element-facts` | label col 3.5rem, pad-bottom 12 | label col 4rem, pad-bottom 16, gap 4 |
| `.mode-hint` / island | `4px 8px`, gap 8 | `8px 12px`, gap 8 |
| `.comment-list__head` | `4px 12px` | `8px 16px` |
| `.comment-list__items`, `.comment-item` | `4px`, `4px` | `8px`, `8px` |
| Popup `main` | `p-4` (16), gap 12 | `p-5` (20), gap 12 between groups, 8 within |
| Icon buttons | 24 px (`icon-xs`) on the island | 32 px (`icon-sm`) on the island |

One column gap below the island; one radius per nesting level; no centred heading groups added. Pins keep the 24 px mark inside a 32 px hit area.

## 3. Milestones

Each milestone is one reviewable diff, built on the last. "Proof" is the command that must pass before the next one starts.

### R0 — Freeze the baseline · **done with this plan**

- **Touch:** `DESIGN.md` (new).
- **Work:** capture current tokens, surfaces, content inventory and house rules as v0.
- **Done when:** `DESIGN.md` names `src/styles/tokens.css` as source of truth and lists every string the redesign must preserve.
- **Proof:** document review against `tokens.css`, `ContentApp.tsx`, `PopupApp.tsx`.

### R1 — Token system v1 + offline font foundation · *highest risk, first*

- **Touch:** `src/styles/tokens.css`, `src/fonts/*`, `src/content/styles.css`, `src/popup/styles.css`, `src/content/scripts.tsx:56-58`, possibly `src/manifest.json`.
- **Work:** retune the palette table above; add the bundled face and prove it loads in both the shadow root and the popup; swap `--font-ui`/`--font-code`; replace hardcoded `text-[13px]` with a token-driven size; update the Hallmark stamp lines to the new direction.
- **Done when:** a captured overlay and popup render in the dark palette with the bundled mono face, with the browser's network panel showing zero font requests.
- **Proof:** `npx tsc --noEmit`, `npm test`, `npm run build:chrome`, then inspect the emitted CSS for the inlined font and `grep -R "https://fonts" dist/chrome` returning nothing.

### R2 — Overlay relayout

- **Touch:** `src/content/styles.css`, `Composer.tsx`, `ReadCard.tsx`, `ElementFacts.tsx`, `CommentList.tsx`, `ContentApp.tsx` (highlight/island markup only), `src/components/ui/button.tsx` (shared sizes/hover if needed).
- **Work:** apply the padding contract; give cards opaque surfaces and hairline borders so they read over any page; align fact labels on one edge; raise island icon targets to 32 px; keep marker only on outline, pin, mode swipe, focus and selection. No string, prop, handler or ARIA changes.
- **Done when:** create → pin → read → edit → delete still works on `fixtures/demo.html`, every control has a visible focus ring, and reduced-motion removes all animations.
- **Proof:** `npm test`, `npm run build:chrome`, manual fixture pass with keyboard only.

### R3 — Island placement feature

- **Touch:** `src/shared/schema.ts`, `src/shared/storage.ts`, `src/content/ContentApp.tsx`, `src/content/components/*` (island markup), `src/content/styles.css`, `test/island-position.test.ts` (new).
- **Work:**
  - `ISLAND_POSITIONS = ["top-center","top-left","top-right","bottom-center","bottom-left","bottom-right"] as const` + type, mirroring `LIST_SIDES` (`schema.ts:55-56`). Default stays `top-center` for existing users.
  - `ISLAND_KEY = "islandPosition"`, `loadIslandPosition()` with the same stale-value fallback rule as `loadExportDetail`/`loadListSide` (`storage.ts:68-93`), `saveIslandPosition()`.
  - Replace the hard-coded `inset-x-3 top-3 flex justify-center` wrapper (`ContentApp.tsx:403`) with a wrapper driven by `data-v` (top/bottom) and `data-h` (start/centre/end) attributes; CSS handles all six positions, no new positioning math.
  - Add an inline 3×2 picker to `ModeHint`, opened by one labelled button on the island. Six labelled choices, `aria-pressed`, no portal primitives. Escape closes the picker before any other island state. Selection persists via `saveIslandPosition`.
  - Add a small unit test for the storage fallback and persistence (the only non-trivial new logic).
- **Done when:** all six positions render correctly at 1280×800 and 390×844, the choice survives a reload, and the picker is reachable and operable by keyboard.
- **Proof:** `npm test` (includes the new test), `npx tsc --noEmit`, `npm run build:chrome` + `npm run build:firefox`.

### R4 — Popup relayout

- **Touch:** `src/popup/PopupApp.tsx`, `src/popup/styles.css`.
- **Work:** apply `p-5`, the group/inner gaps and the v1 surfaces to the header, count section, primary button, export-detail segmented control, copy/download pair, clear pair and footer. Mono face through tokens. No string, handler or ARIA change; no position control in the popup.
- **Done when:** the 320px popup shows every existing string without truncation or overflow, focus rings are visible, and copy/download/clear still behave identically.
- **Proof:** `npm test`, `npm run build:chrome`, manual popup check.

### R5 — Verification and handoff

- **Touch:** `DESIGN.md` (promote to v1), `README.md` (island placement + offline font note), `.hallmark/log.json` if used.
- **Work:** Hallmark sweep (`sloplint --render` on the rendered surfaces if supported; otherwise the Floor checklist in §1) and the frontend-design self-critique; fix every FAIL; verify both browser builds; update the docs.
- **Done when:** `npx tsc --noEmit`, `npm test`, `npm run build:chrome`, `npm run build:firefox` all pass; DESIGN.md matches the shipped tokens; no remote asset in `dist/`.
- **Proof:** commands above plus a fixture-page visual pass with network disabled.

## 4. Verification budget

One batched inspection, one fix batch, at most one confirming round per milestone. Final checks run once after all writer work is reconciled. Runtime checks use `fixtures/demo.html` served with `npx serve fixtures` and a loaded unpacked build (Chrome 150+ needs `npm run dev` or Chrome for Testing, not `--load-extension`).

## 5. Risks

| Risk | Mitigation |
| --- | --- |
| Bundled font URL breaks inside the `data:` CSS injected into the shadow root | R1 spike with two fallback paths; no visual work until proven |
| All-mono body copy too narrow for longer comments | 14 px / 1.6, measure with a real screenshot; one companion sans is the only allowed exception |
| Dark surface over a dark host page loses contrast | Opaque panel background + `--border` hairline on every card, island and list |
| Firefox asset loading / `web_accessible_resources` differs | Build and load-test Firefox in R3 and R5 |
| New picker collides with the card's Escape handling and the inspector's capture-phase handler | Escape chain ordered picker → card edit → card close → list, with a unit test where testable |
| Existing users' island jumps after upgrade | Default `top-center` when the storage key is absent or invalid |

## 6. Outcome

| Milestone | State | Evidence |
| --- | --- | --- |
| R0 DESIGN.md baseline | shipped | `DESIGN.md` v0 captured, then promoted to v1 |
| R1 tokens + font | shipped | three latin woff2 files inlined into both stylesheets; no `fonts.googleapis`/`fonts.gstatic` in `dist/`; `tsc` clean, 62 tests |
| R2 overlay relayout | shipped | 16px card bodies, 8/16px heads, 32px island targets; keyboard and reduced-motion paths kept |
| R3 island placement | shipped | six positions, on-island picker, `islandPosition` setting; 65 tests pass; measured boxes at 12px from each viewport edge |
| R4 popup relayout | shipped | `p-5`, 16px section padding; all popup strings unchanged; rendered 320px popup checked in a browser |
| R5 verification | shipped | Chrome + Firefox builds pass; `npx tsc --noEmit` clean; 65 tests pass; overlay and popup rendered in the dark instrument skin |

Known limit: the all-mono face is narrow for very long comment bodies. It is set at 14 px / 1.6; a companion sans is the only approved escape hatch if a real review session proves it tiring.
