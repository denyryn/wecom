export type LocatorRect = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Redundant identity signals. No single one survives a re-render on its own:
 * `selector` is the fast path, `domPath` always resolves, `text` and `ancestors`
 * let a resolver re-anchor when the structure changed.
 */
export type Locator = {
  selector: string
  selectorUnique: boolean
  tag: string
  id: string | null
  classes: string[]
  text: string
  ancestors: string[]
  domPath: string
  domIndex: number[]
  attrs: Record<string, string>
  role: string | null
  /** Document coordinates, CSS px. */
  rect: LocatorRect
  visible: boolean
}

export type PageRef = {
  url: string
  urlKey: string
  title: string
  viewport: {width: number; height: number; dpr: number}
}

export type Comment = {
  id: string
  createdAt: string
  updatedAt: string
  status: "open" | "resolved"
  body: string
  page: PageRef
  target: Locator
}

export const EXPORT_DETAILS = ["light", "medium", "heavy"] as const
export type ExportDetail = (typeof EXPORT_DETAILS)[number]

export const LIST_SIDES = ["left", "right"] as const
export type ListSide = (typeof LIST_SIDES)[number]

export const SCHEMA_VERSION = 2

export function newCommentId(): string {
  // randomUUID needs a secure context; http:// staging hosts do not qualify.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
