import {afterEach, describe, expect, it, vi} from "vitest"
import {takeContextTarget, trackContextTarget} from "@/content/context-target"

const ZERO_RECT = {x: 0, y: 0, top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0}

function rightClick(element: Element): void {
  element.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, composed: true}))
}

afterEach(() => {
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

describe("trackContextTarget", () => {
  it("stores an eligible right-click target once, then clears", () => {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const stop = trackContextTarget(host)

    const span = document.createElement("span")
    document.body.appendChild(span)
    vi.spyOn(span, "getBoundingClientRect").mockReturnValue(
      {...ZERO_RECT, width: 10, height: 10} as DOMRect
    )

    rightClick(span)
    expect(takeContextTarget()).toBe(span)
    expect(takeContextTarget()).toBeNull()
    stop()
  })

  it("ignores a right-click inside our own host", () => {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const stop = trackContextTarget(host)

    const shadow = host.attachShadow({mode: "open"})
    const inner = document.createElement("span")
    shadow.appendChild(inner)
    vi.spyOn(inner, "getBoundingClientRect").mockReturnValue(
      {...ZERO_RECT, width: 10, height: 10} as DOMRect
    )

    rightClick(inner)
    expect(takeContextTarget()).toBeNull()
    stop()
  })
})
