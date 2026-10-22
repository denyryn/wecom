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
