import {afterEach, describe, expect, it, vi} from "vitest"
import {createInspector} from "@/content/inspect"

type PointDocument = Document & {elementFromPoint: (x: number, y: number) => Element | null}

const originalElementFromPoint = (document as PointDocument).elementFromPoint
const nodes: HTMLElement[] = []
const stops: (() => void)[] = []

function mount() {
  const host = document.createElement("div")
  const button = document.createElement("button")
  // jsdom has no layout, so the inspector's on-screen check needs a box.
  button.getBoundingClientRect = () => ({width: 10, height: 10}) as DOMRect
  document.body.append(host, button)
  nodes.push(host, button)
  return {host, button}
}

function pointerDown(button: Element) {
  const event = new PointerEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    clientX: 10,
    clientY: 10
  })
  button.dispatchEvent(event)
  return event
}

function click(button: Element) {
  const event = new MouseEvent("click", {bubbles: true, cancelable: true})
  button.dispatchEvent(event)
  return event
}

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  for (const node of nodes.splice(0)) node.remove()
  ;(document as PointDocument).elementFromPoint = originalElementFromPoint
})

describe("createInspector", () => {
  it("picks on click while swallowing the rest of the click sequence", () => {
    const {host, button} = mount()
    ;(document as PointDocument).elementFromPoint = () => button

    const onPick = vi.fn()
    const inspector = createInspector({
      host,
      onHover: vi.fn(),
      onPick,
      onCancel: vi.fn()
    })
    stops.push(inspector.stop)
    inspector.start()

    const pageHandler = vi.fn()
    button.addEventListener("click", pageHandler)

    const down = pointerDown(button)
    expect(onPick).not.toHaveBeenCalled()

    const picked = click(button)
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick.mock.calls[0][0].element).toBe(button)
    expect(pageHandler).not.toHaveBeenCalled()
    expect(down.defaultPrevented).toBe(true)
    expect(picked.defaultPrevented).toBe(true)
  })

  it("does not swallow clicks aimed at the overlay host", () => {
    const {host, button} = mount()
    ;(document as PointDocument).elementFromPoint = () => button

    const onPick = vi.fn()
    const inspector = createInspector({
      host,
      onHover: vi.fn(),
      onPick,
      onCancel: vi.fn()
    })
    stops.push(inspector.stop)
    inspector.start()

    const ownHandler = vi.fn()
    host.addEventListener("click", ownHandler)

    const picked = click(host)
    expect(ownHandler).toHaveBeenCalledTimes(1)
    expect(picked.defaultPrevented).toBe(false)
    expect(onPick).not.toHaveBeenCalled()
  })
})
