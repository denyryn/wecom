import type {Comment} from "./schema"

const PAGES_KEY = "pages"

type Pages = Record<string, Comment[]>

/**
 * Storage bucket for a page. Query and hash are dropped so `?utm_source=…` and
 * `#section` do not split a review; the exact URL is kept on each comment.
 */
export function urlKey(href: string = location.href): string {
  const url = new URL(href)
  const path = url.pathname.replace(/\/+$/, "")

  return `${url.origin}${path}`
}

export async function loadComments(pageKey: string): Promise<Comment[]> {
  const stored = await chrome.storage.local.get(PAGES_KEY)
  const pages = stored[PAGES_KEY] as Pages | undefined

  return pages?.[pageKey] ?? []
}

export async function saveComments(pageKey: string, comments: Comment[]): Promise<void> {
  const stored = await chrome.storage.local.get(PAGES_KEY)
  const pages = (stored[PAGES_KEY] as Pages | undefined) ?? {}

  await chrome.storage.local.set({[PAGES_KEY]: {...pages, [pageKey]: comments}})
}

export async function loadAllComments(): Promise<Pages> {
  const stored = await chrome.storage.local.get(PAGES_KEY)

  return (stored[PAGES_KEY] as Pages | undefined) ?? {}
}

export async function clearComments(pageKey: string): Promise<void> {
  const pages = await loadAllComments()
  delete pages[pageKey]

  await chrome.storage.local.set({[PAGES_KEY]: pages})
}

/**
 * The popup mutates storage in a different component; without this the open tab
 * keeps painting pins from its own stale state (clear-this-page looked broken).
 */
export function watchComments(
  pageKey: string,
  listener: (comments: Comment[]) => void
): () => void {
  const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== "local" || !changes[PAGES_KEY]) return

    const pages = changes[PAGES_KEY].newValue as Pages | undefined
    listener(pages?.[pageKey] ?? [])
  }

  chrome.storage.onChanged.addListener(onChanged)

  return () => chrome.storage.onChanged.removeListener(onChanged)
}
