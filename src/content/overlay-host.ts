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
  "wheel",
  // Dialog focus traps pull focus back when they see it leave the dialog.
  // Our card's focus events must stay inside the overlay.
  "focusin",
  "focusout"
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

  const focused = host.shadowRoot?.activeElement as HTMLElement | null
  try {
    // showPopover() on an already-open popover is a no-op, so a re-promote has
    // to close it first for the new top-layer order to take effect.
    if (host.matches(":popover-open")) element.hidePopover?.()
    element.showPopover()
    focused?.focus({preventScroll: true})
  } catch {
    // Engines without a usable top layer keep the fixed, max z-index fallback.
  }
}

let dockedDialog: HTMLDialogElement | null = null

/**
 * A modal dialog makes everything outside it inert — including a top-layer
 * popover — so our textarea cannot take focus while it is open. Dock the host
 * in the dialog and re-promote it there: it is then inside the one subtree the
 * browser keeps interactive, while the popover layer keeps it above the page.
 */
export function syncHostLayer(host: HTMLElement): void {
  const dialog = Array.from(document.querySelectorAll("dialog")).find(isModal) ?? null
  const parent: HTMLElement = dialog ?? document.body

  if (host.parentElement !== parent) parent.appendChild(host)

  // Libraries mark other page nodes inert/aria-hidden while a dialog is open.
  host.inert = false
  host.removeAttribute("aria-hidden")

  if (dockedDialog !== dialog || !host.isConnected) {
    promoteHost(host)
    dockedDialog = dialog
  }
}

function isModal(dialog: HTMLDialogElement): boolean {
  try {
    return dialog.matches(":modal")
  } catch {
    return false
  }
}

/** Re-dock when the page opens, closes or replaces a modal dialog. */
export function watchHostLayer(host: HTMLElement): () => void {
  const observer = new MutationObserver(() => syncHostLayer(host))
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["open", "inert", "aria-hidden"]
  })
  syncHostLayer(host)

  return () => observer.disconnect()
}
