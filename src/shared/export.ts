import type {Comment} from "./schema"
import {SCHEMA_VERSION} from "./schema"
import {loadAllComments} from "./storage"

export type ExportDoc = {
  schemaVersion: number
  exportedAt: string
  extensionVersion: string
  comments: Comment[]
}

export async function buildExport(): Promise<ExportDoc> {
  const pages = await loadAllComments()
  const comments = Object.values(pages)
    .flat()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    comments,
  }
}

export function downloadExport(doc: ExportDoc): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], {type: "application/json"}))
  const a = document.createElement("a")
  a.href = url
  a.download = `wui-comments-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyExport(doc: ExportDoc): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(doc, null, 2))
    return true
  } catch {
    return false
  }
}
