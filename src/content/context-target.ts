import {isEligibleTarget} from "./inspect"

let target: Element | null = null

/**
 * The context menu's clicked element is not in the onClicked payload, so a
 * capture-phase listener on the document records the right-clicked element
 * for the composer to pick up. Never calls preventDefault: the page's own
 * context menu is untouched.
 */
export function trackContextTarget(host: HTMLElement): () => void {
  const onContextMenu = (event: MouseEvent) => {
    const element = event.target
    if (!(element instanceof Element)) return
    if (event.composedPath().includes(host)) return
    if (!isEligibleTarget(element, host)) return

    target = element
  }

  document.addEventListener("contextmenu", onContextMenu, true)
  return () => document.removeEventListener("contextmenu", onContextMenu, true)
}

/** Returns the tracked right-click target, if any, and clears it. */
export function takeContextTarget(): Element | null {
  const taken = target
  target = null
  return taken
}
