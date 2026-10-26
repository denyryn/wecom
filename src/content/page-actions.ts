import {buildExport, copyExport} from "@/shared/export"
import {clearComments, clearSite, isOnSite, loadAllComments, loadComments, loadExportDetail, siteKey, urlKey} from "@/shared/storage"

/** The same all-pages document the popup copies, at the saved detail level. */
export async function copyAllJson(): Promise<boolean> {
  return copyExport(await buildExport(await loadExportDetail()))
}

function confirmDitch(count: number, scope: "this page" | "this site"): boolean {
  const noun = count === 1 ? "comment" : "comments"
  return window.confirm(`Ditch ${count} ${noun} on ${scope}? This cannot be undone.`)
}

/**
 * The context menu cannot ask twice, so the page asks once. Storage listeners
 * repaint the pins, so nothing else has to be told the comments are gone.
 */
export async function ditchPage(): Promise<boolean> {
  const pageKey = urlKey()
  const comments = await loadComments(pageKey)
  if (comments.length === 0) return false
  if (!confirmDitch(comments.length, "this page")) return false

  await clearComments(pageKey)
  return true
}

export async function ditchSite(): Promise<boolean> {
  const origin = siteKey()
  const count = Object.entries(await loadAllComments())
    .filter(([key]) => isOnSite(key, origin))
    .reduce((sum, [, comments]) => sum + comments.length, 0)
  if (count === 0) return false
  if (!confirmDitch(count, "this site")) return false

  await clearSite(origin)
  return true
}
