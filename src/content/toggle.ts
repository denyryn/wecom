type Handler = () => void

type Signal = {
  emit: () => void
  on: (handler: Handler) => () => void
}

/**
 * A signal that survives the pre-mount window: when emitted before any
 * subscriber exists in React, the delivery is queued and replayed to the
 * first subscriber.
 */
function createSignal(): Signal {
  const handlers = new Set<Handler>()
  let pending = false

  return {
    emit() {
      if (handlers.size === 0) {
        pending = true
        return
      }

      handlers.forEach((handler) => handler())
    },
    on(handler) {
      handlers.add(handler)
      if (pending) {
        pending = false
        handler()
      }

      return () => {
        handlers.delete(handler)
      }
    }
  }
}

const toggleInspectSignal = createSignal()
const commentElementSignal = createSignal()

export function emitToggleInspect(): void {
  toggleInspectSignal.emit()
}

export function onToggleInspect(handler: Handler): () => void {
  return toggleInspectSignal.on(handler)
}

export function emitCommentElement(): void {
  commentElementSignal.emit()
}

export function onCommentElement(handler: Handler): () => void {
  return commentElementSignal.on(handler)
}
