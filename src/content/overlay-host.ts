/**
 * Events raised by our own overlay must never reach the page's handlers:
 * clicking a pin or a card button has to stay a comment action, not also
 * activate a document-level click handler (close a dialog, follow a link).
 *
 * The listener sits on the shadow host in the bubble phase, so React inside
 * the shadow root has already handled the event, and the page above the host
 * never sees it. Keyboard events are deliberately left alone: Escape is
 * consumed by the app's document-level handler.
 */
const PAGE_EVENTS = [
  "pointerdown",
  "pointerup",
  "pointermove",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "auxclick",
  "contextmenu",
  "wheel"
] as const

export function isolateHostEvents(host: HTMLElement): () => void {
  const stop = (event: Event) => event.stopPropagation()

  for (const type of PAGE_EVENTS) host.addEventListener(type, stop)

  return () => {
    for (const type of PAGE_EVENTS) host.removeEventListener(type, stop)
  }
}

type PopoverHost = HTMLElement & {
  showPopover?: () => void
  hidePopover?: () => void
}

/**
 * A page modal can live in the browser top layer (native <dialog>, Popover
 * API), where no z-index reaches it. Opening the host as a manual popover puts
 * every overlay surface in that same layer; re-opening moves it back to the top
 * after the page has opened a modal of its own.
 */
export function promoteHost(host: HTMLElement): void {
  const element = host as PopoverHost
  if (typeof element.showPopover !== "function") return

  try {
    // showPopover() on an already-open popover is a no-op, so a re-promote has
    // to close it first for the new top-layer order to take effect.
    if (host.matches(":popover-open")) element.hidePopover?.()
    element.showPopover()
  } catch {
    // Engines without a usable top layer keep the fixed, max z-index fallback.
  }
}
