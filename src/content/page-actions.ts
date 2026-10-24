import {buildExport, copyExport} from "@/shared/export"
import {clearComments, loadComments, loadExportDetail, urlKey} from "@/shared/storage"

/** The same all-pages document the popup copies, at the saved detail level. */
export async function copyAllJson(): Promise<boolean> {
  return copyExport(await buildExport(await loadExportDetail()))
}

/**
 * The context menu cannot ask twice, so the page asks once. Storage listeners
 * repaint the pins, so nothing else has to be told the comments are gone.
 */
export async function ditchPage(): Promise<boolean> {
  const pageKey = urlKey()
  const comments = await loadComments(pageKey)
  if (comments.length === 0) return false

  const noun = comments.length === 1 ? "comment" : "comments"
  const confirmed = window.confirm(
    `Ditch ${comments.length} ${noun} on this page? This cannot be undone.`
  )
  if (!confirmed) return false

  await clearComments(pageKey)
  return true
}
