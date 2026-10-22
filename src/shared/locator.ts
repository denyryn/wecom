import type {Locator, LocatorRect} from "./schema"

const ATTRIBUTE_PREFIXES = ["aria-", "data-"]
const ATTRIBUTE_NAMES = new Set(["role", "name", "type", "placeholder", "href", "alt", "title"])

/** `tag#id.class` chain from the element up to `<html>`, used for `domPath`. */
export function buildSelector(element: Element, doc: Document = document): string {
  const viaId = idSelector(element, doc)
  if (viaId) return viaId

  const parts: string[] = []
  let current: Element | null = element
  let sawParent = false

  while (current && current !== doc.documentElement) {
    sawParent = true
    parts.unshift(segment(current, doc))
    current = current.parentElement
  }

  return sawParent ? parts.join(" > ") : element.tagName.toLowerCase()
}

/** Same shape, but always anchored at `<html>` so it resolves without uniqueness. */
export function buildDomPath(element: Element, doc: Document = document): string {
  const parts: string[] = []
  let current: Element | null = element

  while (current && current !== doc.documentElement) {
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${indexOfType(current)})`)
    current = current.parentElement
  }

  return ["html", ...parts].join(" > ")
}

export function resolveLocator(
  target: Pick<Locator, "selector" | "domPath" | "tag">,
  doc: Document = document
): Element | null {
  for (const candidate of [target.selector, target.domPath]) {
    if (!candidate) continue

    let element: Element | null = null
    try {
      element = doc.querySelector(candidate)
    } catch {
      // Invalid selector for this DOM (SVG, escaped characters, stale vendor prefix).
      continue
    }

    // A selector that now points at a different kind of element is drift, not a match.
    if (element && element.tagName.toLowerCase() === target.tag) return element
  }

  return null
}

export function buildLocator(element: Element, doc: Document = document): Locator {
  const selector = buildSelector(element, doc)
  const rect = element.getBoundingClientRect()
  const view = doc.defaultView
  const style = view?.getComputedStyle(element)

  return {
    selector,
    selectorUnique: isUnique(selector, doc),
    tag: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: Array.from(element.classList),
    text: collapse(element.textContent ?? "").slice(0, 80),
    ancestors: ancestors(element, doc),
    domPath: buildDomPath(element, doc),
    domIndex: childIndices(element),
    attrs: pickAttributes(element),
    role: element.getAttribute("role"),
    rect: toDocumentRect(rect, view?.scrollX ?? 0, view?.scrollY ?? 0),
    visible:
      rect.width > 0 &&
      rect.height > 0 &&
      style?.display !== "none" &&
      style?.visibility !== "hidden"
  }
}

function idSelector(element: Element, doc: Document): string | null {
  if (!element.id) return null

  const selector = `#${cssEscape(element.id)}`
  try {
    return doc.querySelectorAll(selector).length === 1 ? selector : null
  } catch {
    return null
  }
}

function segment(element: Element, doc: Document): string {
  const tag = element.tagName.toLowerCase()
  const id = idSelector(element, doc)
  if (id) return `${tag}${id}`

  const parent = element.parentElement
  if (!parent) return tag

  const siblings = Array.from(parent.children).filter(
    (child) => child.tagName === element.tagName
  )

  return siblings.length > 1 ? `${tag}:nth-of-type(${indexOfType(element)})` : tag
}

function indexOfType(element: Element): number {
  const parent = element.parentElement
  if (!parent) return 1

  return Array.from(parent.children)
    .filter((child) => child.tagName === element.tagName)
    .indexOf(element) + 1
}

function isUnique(selector: string, doc: Document): boolean {
  try {
    return doc.querySelectorAll(selector).length === 1
  } catch {
    return false
  }
}

function ancestors(element: Element, doc: Document): string[] {
  const chain: string[] = []
  let current = element.parentElement

  while (current && current !== doc.documentElement && chain.length < 4) {
    const id = current.id ? `#${current.id}` : ""
    const cls = current.classList[0] ? `.${current.classList[0]}` : ""
    chain.unshift(`${current.tagName.toLowerCase()}${id}${cls}`)
    current = current.parentElement
  }

  return chain
}

function childIndices(element: Element): number[] {
  const indices: number[] = []
  let current: Element | null = element

  while (current && current.parentElement) {
    indices.unshift(Array.from(current.parentElement.children).indexOf(current))
    current = current.parentElement
  }

  return indices
}

function pickAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {}

  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase()
    const allowed =
      ATTRIBUTE_NAMES.has(name) || ATTRIBUTE_PREFIXES.some((prefix) => name.startsWith(prefix))
    if (allowed && attr.value) attrs[name] = attr.value.slice(0, 200)
  }

  return attrs
}

function toDocumentRect(rect: DOMRect, scrollX: number, scrollY: number): LocatorRect {
  return {
    x: rect.left + scrollX,
    y: rect.top + scrollY,
    width: rect.width,
    height: rect.height
  }
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function cssEscape(value: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(value)
    : value.replace(/([^\w-])/g, "\\$1")
}
