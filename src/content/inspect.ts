export type HoverTarget = {
  element: Element
  rect: DOMRect
}

type InspectorOptions = {
  /** Our shadow host — clicks and hits on it must pass through to our own UI. */
  host: HTMLElement
  onHover: (target: HoverTarget | null) => void
  onPick: (target: HoverTarget) => void
  onCancel: () => void
}

export type Inspector = {
  start: () => void
  stop: () => void
}

/**
 * Plain DOM, deliberately not React. Click interception has to be armed in the
 * capture phase on `document` and be able to cancel the event before the page
 * (or React) sees it, so it cannot live inside a component lifecycle.
 */
export function createInspector(options: InspectorOptions): Inspector {
  const {host, onHover, onPick, onCancel} = options

  let active = false
  let current: Element | null = null
  let frame = 0

  const isOurs = (event: Event) => event.composedPath().includes(host)

  const eligible = (element: Element | null): element is Element => {
    if (!element) return false
    if (element === document.documentElement || element === document.body) return false
    if (element === host || host.contains(element)) return false

    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }

  const report = (element: Element | null) => {
    if (!eligible(element)) return
    current = element
    onHover({element, rect: element.getBoundingClientRect()})
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!active || frame) return
    const {clientX, clientY} = event

    frame = requestAnimationFrame(() => {
      frame = 0
      report(document.elementFromPoint(clientX, clientY))
    })
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!active || event.button !== 0 || isOurs(event)) return

    const target = document.elementFromPoint(event.clientX, event.clientY)
    suppress(event)

    if (eligible(target)) onPick({element: target, rect: target.getBoundingClientRect()})
  }

  // A click can still be synthesised (Enter/Space on a focused control, a page
  // handler calling click()), so it is blocked independently of pointerdown.
  const onBlockedEvent = (event: Event) => {
    if (!active || isOurs(event)) return
    suppress(event)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!active || event.key !== "Escape") return
    suppress(event)
    onCancel()
  }

  // Pin the highlight to the element while the page scrolls or reflows.
  const onReflow = () => {
    if (!active || !current) return
    if (!current.isConnected) {
      current = null
      onHover(null)
      return
    }
    onHover({element: current, rect: current.getBoundingClientRect()})
  }

  const start = () => {
    if (active) return
    active = true

    document.addEventListener("pointermove", onPointerMove, true)
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("mousedown", onBlockedEvent, true)
    document.addEventListener("click", onBlockedEvent, true)
    document.addEventListener("submit", onBlockedEvent, true)
    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("scroll", onReflow, true)
    window.addEventListener("resize", onReflow)
  }

  const stop = () => {
    if (!active) return
    active = false

    document.removeEventListener("pointermove", onPointerMove, true)
    document.removeEventListener("pointerdown", onPointerDown, true)
    document.removeEventListener("mousedown", onBlockedEvent, true)
    document.removeEventListener("click", onBlockedEvent, true)
    document.removeEventListener("submit", onBlockedEvent, true)
    document.removeEventListener("keydown", onKeyDown, true)
    document.removeEventListener("scroll", onReflow, true)
    window.removeEventListener("resize", onReflow)

    if (frame) cancelAnimationFrame(frame)
    frame = 0
    current = null
  }

  return {start, stop}
}

function suppress(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

/** Compact `tag#id.class` label, trimmed to fit a chip. */
export function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ""
  const classes = Array.from(element.classList)
    .slice(0, 2)
    .map((name) => `.${name}`)
    .join("")

  return `${tag}${id}${classes}`.slice(0, 48)
}
