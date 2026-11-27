/**
 * Installed at document_start, before page scripts register their own capture
 * handlers. A modal's focus trap can listen on window in the capture phase and
 * pull focus back before a content script injected at document_idle ever sees
 * the focusin. Getting in first is the only way to keep our card editable.
 */
const GUARDED_KEYS = ["keydown", "keypress", "beforeinput"] as const

function isOurs(event: Event): boolean {
  return event.composedPath().some(
    (node) => (node as Node).nodeType === 1 && (node as Element).hasAttribute?.("data-extension-root")
  )
}

export default function installInputGuard(): () => void {
  // react-bootstrap enforces focus on capture-phase `focus`, not `focusin`.
  // Stop both before the page sees them; leave focusout alone so our own
  // React onBlur handlers still run.
  const onFocusIn = (event: FocusEvent) => {
    if (!isOurs(event)) return
    event.stopPropagation()
    event.stopImmediatePropagation()
  }

  // Modal traps cancel keys that look aimed at the page. At document level our
  // textarea retargets to the shadow host, so that is every key we type.
  const onKey = (event: Event) => {
    if (isOurs(event)) event.preventDefault = () => {}
  }

  for (const type of ["focus", "focusin"] as const) {
    window.addEventListener(type, onFocusIn, true)
  }
  for (const type of GUARDED_KEYS) window.addEventListener(type, onKey, true)

  return () => {
    for (const type of ["focus", "focusin"] as const) {
      window.removeEventListener(type, onFocusIn, true)
    }
    for (const type of GUARDED_KEYS) window.removeEventListener(type, onKey, true)
  }
}
