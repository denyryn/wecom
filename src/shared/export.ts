import type {Comment, ExportDetail, Locator} from "./schema"
import {SCHEMA_VERSION} from "./schema"
import {loadAllComments} from "./storage"
import {browserApi} from "@/shared/browser"

export type LightComment = {id: string; url: string; selector: string; text: string; body: string}
export type MediumTarget = Omit<Locator, "domPath" | "domIndex" | "ancestors">
export type MediumComment = Omit<Comment, "target"> & {target: MediumTarget}
export type ExportComment = LightComment | MediumComment | Comment
export type ExportDoc = {
  schemaVersion: number
  detail: ExportDetail
  exportedAt: string
  extensionVersion: string
  comments: ExportComment[]
}

export function projectComment(comment: Comment, detail: ExportDetail): ExportComment {
  if (detail === "light") {
    return {
      id: comment.id,
      url: comment.page.url,
      selector: comment.target.selector,
      text: comment.target.text,
      body: comment.body,
    }
  }

  if (detail === "medium") {
    const {domPath: _domPath, domIndex: _domIndex, ancestors: _ancestors, ...target} = comment.target
    return {...comment, target}
  }

  return comment
}

export function serializeExport(doc: ExportDoc): string {
  return JSON.stringify(doc)
}

export async function buildExport(detail: ExportDetail = "medium"): Promise<ExportDoc> {
  const pages = await loadAllComments()
  const comments = Object.values(pages)
    .flat()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return {
    schemaVersion: SCHEMA_VERSION,
    detail,
    exportedAt: new Date().toISOString(),
    extensionVersion: browserApi().runtime.getManifest().version,
    comments: comments.map((comment) => projectComment(comment, detail)),
  }
}

export function downloadExport(doc: ExportDoc): void {
  const url = URL.createObjectURL(new Blob([serializeExport(doc)], {type: "application/json"}))
  const a = document.createElement("a")
  a.href = url
  a.download = `wui-comments-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyExport(doc: ExportDoc): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(serializeExport(doc))
    return true
  } catch {
    return false
  }
}
