import {afterEach, describe, expect, it, vi} from "vitest"
import {ISLAND_POSITIONS} from "@/shared/schema"
import {loadIslandPosition, saveIslandPosition} from "@/shared/storage"

describe("island position preference", () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubChrome(initial: Record<string, unknown> = {}) {
    const data = {...initial}
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: async (key: string) => ({[key]: data[key]}),
          set: async (items: Record<string, unknown>) => Object.assign(data, items)
        }
      }
    })
    return data
  }

  it("covers all six edges", () => {
    expect(ISLAND_POSITIONS).toEqual([
      "top-center",
      "top-left",
      "top-right",
      "bottom-center",
      "bottom-left",
      "bottom-right"
    ])
  })

  it("falls back to top-centre when nothing is stored", async () => {
    stubChrome()
    expect(await loadIslandPosition()).toBe("top-center")
  })

  it("round-trips a saved position and rejects junk", async () => {
    const data = stubChrome()
    await saveIslandPosition("bottom-left")
    expect(data.islandPosition).toBe("bottom-left")
    expect(await loadIslandPosition()).toBe("bottom-left")

    data.islandPosition = "middle"
    expect(await loadIslandPosition()).toBe("top-center")
  })
})
