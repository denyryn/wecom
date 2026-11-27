import {afterEach, describe, expect, it, vi} from "vitest"
import installInputGuard from "@/content/input-guard"

const cleanups: Array<() => void> = []
const hosts: HTMLElement[] = []

function mount(): HTMLTextAreaElement {
  const host = document.createElement("div")
  host.setAttribute("data-extension-root", "true")
  document.body.appendChild(host)
  hosts.push(host)

  const textarea = document.createElement("textarea")
  host.attachShadow({mode: "open"}).appendChild(textarea)
  return textarea
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  for (const host of hosts.splice(0)) host.remove()
})

describe("installInputGuard", () => {
  it("hides our focus from a page focus trap registered later", () => {
    const textarea = mount()
    cleanups.push(installInputGuard())

    const pageTrap = vi.fn()
    window.addEventListener("focusin", pageTrap, true)
    textarea.dispatchEvent(new FocusEvent("focusin", {bubbles: true, composed: true}))

    expect(pageTrap).not.toHaveBeenCalled()
    window.removeEventListener("focusin", pageTrap, true)
  })

  it("hides our focus from a modal that enforces focus on capture-phase focus", () => {
    const textarea = mount()
    cleanups.push(installInputGuard())

    const pageTrap = vi.fn()
    window.addEventListener("focus", pageTrap, true)
    textarea.dispatchEvent(new FocusEvent("focus", {bubbles: false, composed: true}))

    expect(pageTrap).not.toHaveBeenCalled()
    window.removeEventListener("focus", pageTrap, true)
  })

  it("neutralizes keypress and beforeinput cancellation from the page", () => {
    const textarea = mount()
    cleanups.push(installInputGuard())

    const pageHandler = vi.fn((event: Event) => event.preventDefault())
    document.addEventListener("keypress", pageHandler, true)
    document.addEventListener("beforeinput", pageHandler, true)

    for (const type of ["keypress", "beforeinput"]) {
      const event = new Event(type, {bubbles: true, composed: true, cancelable: true})
      textarea.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }

    document.removeEventListener("keypress", pageHandler, true)
    document.removeEventListener("beforeinput", pageHandler, true)
  })

  it("leaves page-originated focus events alone", () => {
    mount()
    cleanups.push(installInputGuard())

    const pageFocus = vi.fn()
    window.addEventListener("focusin", pageFocus, true)
    document.body.dispatchEvent(new FocusEvent("focusin", {bubbles: true, composed: true}))

    expect(pageFocus).toHaveBeenCalledTimes(1)
    window.removeEventListener("focusin", pageFocus, true)
  })
})
