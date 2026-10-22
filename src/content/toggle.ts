type ToggleHandler = () => void

const handlers = new Set<ToggleHandler>()
let pending = false

/**
 * The chrome message listener lives at module scope in the content entry, so it
 * exists before React has mounted anything. A toggle that arrives during that
 * window is queued instead of being dropped.
 */
export function emitToggleInspect(): void {
  if (handlers.size === 0) {
    pending = true
    return
  }

  handlers.forEach((handler) => handler())
}

export function onToggleInspect(handler: ToggleHandler): () => void {
  handlers.add(handler)
  if (pending) {
    pending = false
    handler()
  }

  return () => {
    handlers.delete(handler)
  }
}
