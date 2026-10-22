# Export schema

The JSON produced by **Copy JSON** / **Download JSON** in the popup is the product. This
document is the contract for anyone consuming it — most importantly AI agents acting on UI
review comments.

`schemaVersion` is **1**.

## `schemaVersion` policy

- Incremented on any **breaking** change (field removed, type changed, semantics redefined).
- Additive changes (new optional fields) do **not** bump the version.
- Consumers **must reject documents with an unknown major** rather than guess at the shape —
  silently misreading a locator points an agent at the wrong element, which is worse than failing.

## Structure

`ExportDoc` → `comments: Comment[]` → each `Comment` has `page: PageRef` and `target: Locator`.

### `ExportDoc`

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | `number` | Contract version, `1` today |
| `exportedAt` | `string` | ISO 8601 UTC timestamp of the export |
| `extensionVersion` | `string` | Extension version (`manifest.json`) that produced it |
| `comments` | `Comment[]` | Every comment on every page, sorted by `createdAt` ascending |

### `Comment`

| Field | Type | Meaning |
|---|---|---|
| `id` | `string` | UUID, stable across edits |
| `createdAt` | `string` | ISO 8601 UTC, creation time |
| `updatedAt` | `string` | ISO 8601 UTC, last edit; equals `createdAt` until edited |
| `status` | `"open" \| "resolved"` | Review state |
| `body` | `string` | The comment text |
| `page` | `PageRef` | Where the comment was made |
| `target` | `Locator` | What it was made on |

### `PageRef`

| Field | Type | Meaning |
|---|---|---|
| `url` | `string` | Exact URL at capture time (query and hash included) |
| `urlKey` | `string` | Storage bucket: `origin + pathname`, query and hash dropped |
| `title` | `string` | `document.title` at capture time |
| `viewport` | `{ width, height, dpr }` | Viewport in CSS px, plus device pixel ratio |

`page.url` is exact while `page.urlKey` is the bucket. Two capture URLs that differ only in
query/hash collapse to one bucket — a query-routed view (`/checkout?step=2`) shares a bucket
with `/checkout`. This is a known, deliberate collapse: tracking params and hash navigation
should not split a review.

### `Locator`

| Field | Type | Meaning |
|---|---|---|
| `selector` | `string` | Best CSS selector for the element |
| `selectorUnique` | `boolean` | `false` when the generator had to fall back to a positional path |
| `tag` | `string` | Lowercase tag name |
| `id` | `string \| null` | `id` attribute, if any |
| `classes` | `string[]` | Class attribute split; **always an array** |
| `text` | `string` | Trimmed `textContent`, ≤ 80 chars |
| `ancestors` | `string[]` | Up to 4 ancestors as `tag.class*,tag`, outermost first |
| `domPath` | `string` | Absolute `tag:nth-of-type(n)` path from `<html>` — brittle, but always resolvable |
| `domIndex` | `number[]` | Child indices for the same walk; shape-comparable across similar pages |
| `attrs` | `Record<string, string>` | **Allowlist** of captured attributes, not the raw map |
| `role` | `string \| null` | `role` attribute, if any |
| `rect` | `LocatorRect` | Bounding box |
| `visible` | `boolean` | Non-zero box and `display !== none` at capture |

`classes` is an array because class-attribute order is unstable (`"btn primary"` vs
`"primary btn"` are the same element); compare as a set.

`attrs` is an allowlist (`role`, `aria-*`, `name`, `type`, `placeholder`, `href`,
`data-testid`, useful `data-*`), not the raw attribute map — inline styles and build-generated
hashes are noise and would make exports noisy and non-deterministic.

`dpr` in `page.viewport` exists because agent screenshots are in **device pixels** while
`target.rect` is in CSS px: multiply CSS px by `dpr` to compare against a screenshot.

### `LocatorRect`

| Field | Type | Meaning |
|---|---|---|
| `x` | `number` | Document-coordinate left edge |
| `y` | `number` | Document-coordinate top edge |
| `width` | `number` | CSS px |
| `height` | `number` | CSS px |

`rect` is in **document coordinates** (what `getBoundingClientRect()` would give with current
viewport scroll added), so it is scroll-independent: it does not change as the user scrolls.

## Example

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
        "visible": true
      }
    }
  ]
}
```

## How an agent should use it

1. Resolve `target.selector` in the live DOM first — the fast path.
2. If it does not match (or matches an unexpected element), fall back to `target.domPath`.
3. Verify the resolved node's tag matches `target.tag`. If it does not, treat resolution as
   failed.
4. Sanity-check against `target.text` and `target.rect` (text should appear in the element or
   its subtree at roughly that position) — this catches drift a selector alone cannot.
5. If nothing resolves: the element is **no longer present** (page changed since capture).
   Report that honestly ("element not found — page may have changed"); never guess at a
   similar element and never comment on the wrong node.
