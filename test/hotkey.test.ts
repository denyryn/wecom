import {afterEach, describe, expect, it, vi} from "vitest"
import {trackToggleHotkey} from "@/content/hotkey"
import {onToggleInspect} from "@/content/toggle"

let stop: (() => void) | null = null

afterEach(() => {
  stop?.()
  stop = null
})

function key(init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {bubbles: true, cancelable: true, ...init})
  document.dispatchEvent(event)
  return event
}

describe("trackToggleHotkey", () => {
  it("toggles comment mode on Ctrl+backslash", () => {
    const spy = vi.fn()
    const off = onToggleInspect(spy)
    stop = trackToggleHotkey()

    const event = key({key: "\\", code: "Backslash", ctrlKey: true})

    expect(spy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    off()
  })

  it("ignores other combinations", () => {
    const spy = vi.fn()
    const off = onToggleInspect(spy)
    stop = trackToggleHotkey()

    key({key: "c", code: "KeyC", altKey: true})
    key({key: "\\", code: "Backslash", ctrlKey: true, shiftKey: true})
    key({key: "\\", code: "Backslash"})

    expect(spy).not.toHaveBeenCalled()
    off()
  })
})
