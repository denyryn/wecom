import {afterEach, describe, expect, it, vi} from "vitest"
import {isolateHostEvents, promoteHost} from "@/content/overlay-host"

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
