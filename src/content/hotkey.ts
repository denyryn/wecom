import {emitToggleInspect} from "./toggle"

/**
 * Ctrl+\ cannot be a manifest `commands.suggested_key` (the API only accepts
 * letters, digits, Comma, Period and a few named keys), so the shortcut is
 * handled in the content script, where comment mode is actually usable.
 */
export function trackToggleHotkey(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    if (event.code !== "Backslash" && event.key !== "\\") return

    event.preventDefault()
    event.stopPropagation()
    emitToggleInspect()
  }

  document.addEventListener("keydown", onKeyDown, true)
  return () => document.removeEventListener("keydown", onKeyDown, true)
}
