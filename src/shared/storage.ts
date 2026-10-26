import type {Comment, ExportDetail} from "./schema"
import {EXPORT_DETAILS} from "./schema"
import {browserApi} from "@/shared/browser"

const PAGES_KEY = "pages"
const DETAIL_KEY = "exportDetail"

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

/** Storage bucket for a site: every page on this origin. */
export function siteKey(href: string = location.href): string {
  return new URL(href).origin
}

/** Prefix match on origin + "/" so `example.com` never swallows `example.com.au`. */
export function isOnSite(pageKey: string, origin: string): boolean {
  return pageKey === origin || pageKey.startsWith(`${origin}/`)
}

export async function loadComments(pageKey: string): Promise<Comment[]> {
  const stored = await browserApi().storage.local.get(PAGES_KEY)
  const pages = stored[PAGES_KEY] as Pages | undefined

  return pages?.[pageKey] ?? []
}

export async function saveComments(pageKey: string, comments: Comment[]): Promise<void> {
  const stored = await browserApi().storage.local.get(PAGES_KEY)
  const pages = (stored[PAGES_KEY] as Pages | undefined) ?? {}

  await browserApi().storage.local.set({[PAGES_KEY]: {...pages, [pageKey]: comments}})
}

export async function loadAllComments(): Promise<Pages> {
  const stored = await browserApi().storage.local.get(PAGES_KEY)

  return (stored[PAGES_KEY] as Pages | undefined) ?? {}
}

export async function clearComments(pageKey: string): Promise<void> {
  const pages = await loadAllComments()
  delete pages[pageKey]

  await browserApi().storage.local.set({[PAGES_KEY]: pages})
}

export async function clearSite(origin: string): Promise<void> {
  const pages = await loadAllComments()
  for (const key of Object.keys(pages)) {
    if (isOnSite(key, origin)) delete pages[key]
  }

  await browserApi().storage.local.set({[PAGES_KEY]: pages})
}

/**
 * Export detail is a user setting; a stale or hand-edited value must not break
 * the export, so unknown values fall back to the default.
 */
export async function loadExportDetail(): Promise<ExportDetail> {
  const stored = await browserApi().storage.local.get(DETAIL_KEY)
  const value = stored[DETAIL_KEY]

  return EXPORT_DETAILS.includes(value as ExportDetail) ? (value as ExportDetail) : "medium"
}

export async function saveExportDetail(detail: ExportDetail): Promise<void> {
  await browserApi().storage.local.set({[DETAIL_KEY]: detail})
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

  browserApi().storage.onChanged.addListener(onChanged)

  return () => browserApi().storage.onChanged.removeListener(onChanged)
}
