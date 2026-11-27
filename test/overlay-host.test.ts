import {afterEach, describe, expect, it, vi} from "vitest"
import {isolateHostEvents, promoteHost, syncHostLayer, watchHostLayer} from "@/content/overlay-host"

const hosts: HTMLElement[] = []

function mountHost(): {host: HTMLElement; button: HTMLButtonElement} {
  const host = document.createElement("div")
  const button = document.createElement("button")
  host.appendChild(button)
  document.body.appendChild(host)
  hosts.push(host)

  return {host, button}
}

describe("isolateHostEvents", () => {
  afterEach(() => {
    for (const host of hosts.splice(0)) host.remove()
  })

  it("stops overlay clicks before the page sees them", () => {
    const {host, button} = mountHost()
    const pageClick = vi.fn()
    const ownClick = vi.fn()
    document.addEventListener("click", pageClick)
    button.addEventListener("click", ownClick)

    const stop = isolateHostEvents(host)
    button.click()

    expect(ownClick).toHaveBeenCalledTimes(1)
    expect(pageClick).not.toHaveBeenCalled()

    stop()
    button.click()

    expect(pageClick).toHaveBeenCalledTimes(1)
    document.removeEventListener("click", pageClick)
  })

  it("isolates the other pointer events a page may listen to", () => {
    const {host} = mountHost()
    const pageDown = vi.fn()
    document.addEventListener("pointerdown", pageDown)

    const stop = isolateHostEvents(host)
    host.dispatchEvent(new Event("pointerdown", {bubbles: true, composed: true}))
    expect(pageDown).not.toHaveBeenCalled()

    stop()
    host.dispatchEvent(new Event("pointerdown", {bubbles: true, composed: true}))
    expect(pageDown).toHaveBeenCalledTimes(1)
    document.removeEventListener("pointerdown", pageDown)
  })

  it("keeps focus events away from a page dialog focus trap", () => {
    const {host, button} = mountHost()
    const pageFocusIn = vi.fn()
    document.addEventListener("focusin", pageFocusIn)

    const stop = isolateHostEvents(host)
    button.dispatchEvent(new Event("focusin", {bubbles: true, composed: true}))
    expect(pageFocusIn).not.toHaveBeenCalled()

    stop()
    button.dispatchEvent(new Event("focusin", {bubbles: true, composed: true}))
    expect(pageFocusIn).toHaveBeenCalledTimes(1)
    document.removeEventListener("focusin", pageFocusIn)
  })
})

describe("promoteHost", () => {
  afterEach(() => {
    for (const host of hosts.splice(0)) host.remove()
  })

  it("falls back quietly when the engine has no popover API", () => {
    const {host} = mountHost()
    expect(() => promoteHost(host)).not.toThrow()
  })
})

describe("syncHostLayer", () => {
  afterEach(() => {
    for (const dialog of Array.from(document.querySelectorAll("dialog"))) dialog.remove()
    for (const host of hosts.splice(0)) host.remove()
  })

  function modal(): HTMLDialogElement {
    const dialog = document.createElement("dialog")
    vi.spyOn(dialog, "matches").mockImplementation(
      (selector) => selector === ":modal" || HTMLDialogElement.prototype.matches.call(dialog, selector)
    )
    document.body.appendChild(dialog)
    return dialog
  }

  it("docks into a modal dialog and undoes page hiding", () => {
    const {host} = mountHost()
    const dialog = modal()
    host.inert = true
    host.setAttribute("aria-hidden", "true")

    syncHostLayer(host)

    expect(host.parentElement).toBe(dialog)
    expect(host.inert).toBe(false)
    expect(host.hasAttribute("aria-hidden")).toBe(false)

    vi.spyOn(dialog, "matches").mockImplementation(
      (selector) => selector !== ":modal" && HTMLDialogElement.prototype.matches.call(dialog, selector)
    )
    syncHostLayer(host)
    expect(host.parentElement).toBe(document.body)
  })

  it("reattaches a host removed by a page re-render", () => {
    const {host} = mountHost()
    host.remove()

    syncHostLayer(host)
    expect(host.parentElement).toBe(document.body)
  })

  it("docks when a dialog opens while the overlay is live", async () => {
    const {host} = mountHost()
    const stop = watchHostLayer(host)
    const dialog = modal()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(host.parentElement).toBe(dialog)

    stop()
  })
})
