import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {buildExportFrom, projectComment, serializeExport} from "@/shared/export"
import {buildLocator, resolveLocator} from "@/shared/locator"
import {SCHEMA_VERSION, type Comment} from "@/shared/schema"
import {placeCard} from "@/shared/position"
import {loadExportDetail, saveExportDetail, urlKey, watchComments} from "@/shared/storage"

const viewport = {width: 1000, height: 800}
const card = {width: 320, height: 180}

describe("placeCard", () => {
  it("prefers below the anchor", () => {
    expect(placeCard({top: 100, left: 200, width: 80, height: 30}, card, viewport)).toEqual({
      top: 138,
      left: 200
    })
  })

  it("flips above when there is no room below", () => {
    expect(placeCard({top: 700, left: 100, width: 80, height: 40}, card, viewport)).toEqual({
      top: 512,
      left: 100
    })
  })

  it("clamps to the right edge", () => {
    expect(placeCard({top: 100, left: 900, width: 80, height: 30}, card, viewport).left).toBe(672)
  })

  it("clamps to the left edge", () => {
    expect(placeCard({top: 100, left: 2, width: 80, height: 30}, card, viewport).left).toBe(8)
  })

  it("clamps to the viewport when neither side fits", () => {
    expect(
      placeCard({top: 100, left: 100, width: 80, height: 40}, card, {width: 1000, height: 200})
    ).toEqual({top: 12, left: 100})
  })
})

describe("buildLocator", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("uses a unique id as the fast path", () => {
    document.body.innerHTML = `<button id="pay-now">Pay</button>`
    const locator = buildLocator(document.getElementById("pay-now")!, document)

    expect(locator.selector).toBe("#pay-now")
    expect(locator.selectorUnique).toBe(true)
    expect(locator.tag).toBe("button")
    expect(locator.id).toBe("pay-now")
  })

  it("disambiguates duplicate siblings with nth-of-type", () => {
    document.body.innerHTML = `<ul><li class="item">a</li><li class="item">b</li></ul>`
    const second = document.querySelectorAll("li")[1]
    const locator = buildLocator(second, document)

    expect(locator.selector).toContain(":nth-of-type(2)")
    expect(locator.classes).toEqual(["item"])
  })

  it("always produces a domPath that resolves back to the element", () => {
    document.body.innerHTML = `<main><div><div><span id="buried">x</span></div></div></main>`
    const target = document.getElementById("buried")!
    const locator = buildLocator(target, document)

    expect(document.querySelector(locator.domPath)).toBe(target)
    expect(resolveLocator(locator, document)).toBe(target)
  })

  it("refuses a selector that now points at a different tag", () => {
    document.body.innerHTML = `<main><span id="x">x</span></main>`
    const locator = buildLocator(document.getElementById("x")!, document)

    document.body.innerHTML = `<main><span id="x">x</span></main>`
    const replaced = document.getElementById("x")!
    const div = document.createElement("div")
    div.id = "x"
    replaced.replaceWith(div)

    expect(resolveLocator(locator, document)).toBeNull()
  })

  it("collapses and caps visible text", () => {
    document.body.innerHTML = `<p id="long">  a   b\tc ${"x".repeat(200)} </p>`
    const locator = buildLocator(document.getElementById("long")!, document)

    expect(locator.text.startsWith("a b c xxx")).toBe(true)
    expect(locator.text.length).toBe(80)
  })

  it("keeps an attribute allowlist instead of the raw attribute map", () => {
    document.body.innerHTML = `<button id="b" class="cta" style="color:red" data-testid="cta" aria-label="Go">Go</button>`
    const locator = buildLocator(document.getElementById("b")!, document)

    expect(locator.attrs).toEqual({"data-testid": "cta", "aria-label": "Go"})
    expect(locator.attrs.style).toBeUndefined()
  })
})

describe("urlKey", () => {
  it("drops query and hash and the trailing slash", () => {
    expect(urlKey("http://localhost:3000/checkout/?step=2#pay")).toBe(
      "http://localhost:3000/checkout"
    )
  })

  it("keeps the origin for the root path", () => {
    expect(urlKey("https://example.com")).toBe("https://example.com")
  })
})

const fullComment = {
  id: "1d4f0a9e-3c1b-4f2a-9a55-7b0c2e8f1a33",
  createdAt: "2026-10-22T11:58:02.114Z",
  updatedAt: "2026-10-22T11:59:40.002Z",
  status: "open",
  body: "This is the primary action — make it the only filled button.",
  page: {
    url: "http://localhost:3000/checkout?step=2",
    urlKey: "http://localhost:3000/checkout",
    title: "Checkout",
    viewport: {width: 1440, height: 900, dpr: 2}
  },
  target: {
    selector: "main.checkout > form > button.btn.btn-primary:nth-of-type(2)",
    selectorUnique: false,
    tag: "button",
    id: "pay-now",
    classes: ["btn", "btn-primary"],
    text: "Pay now",
    ancestors: ["body", "div#root", "main.checkout", "form#payment"],
    domPath: "html > body > div#root > main.checkout > form#payment > button:nth-of-type(2)",
    domIndex: [1, 0, 0, 0, 1],
    attrs: {"type": "submit", "data-testid": "pay-now", "aria-label": "Pay now"},
    role: "button",
    rect: {x: 1024, y: 610, width: 180, height: 44},
    visible: true
  }
} as unknown as Comment

describe("projectComment", () => {
  it("light flattens to id/url/selector/text/body with nothing else", () => {
    expect(projectComment(fullComment, "light")).toEqual({
      id: "1d4f0a9e-3c1b-4f2a-9a55-7b0c2e8f1a33",
      url: "http://localhost:3000/checkout?step=2",
      selector: "main.checkout > form > button.btn.btn-primary:nth-of-type(2)",
      text: "Pay now",
      body: "This is the primary action — make it the only filled button."
    })
    expect(projectComment(fullComment, "light")).not.toHaveProperty("target")
    expect(projectComment(fullComment, "light")).not.toHaveProperty("page")
    expect(projectComment(fullComment, "light")).not.toHaveProperty("createdAt")
  })

  it("medium keeps the full record minus domPath/domIndex/ancestors", () => {
    const projected = projectComment(fullComment, "medium")

    expect(projected).toHaveProperty("page")
    expect(projected).toHaveProperty("target.selector")
    expect(projected).toHaveProperty("target.selectorUnique")
    expect(projected).toHaveProperty("target.rect")
    expect(projected).toHaveProperty("target.attrs")
    expect(projected).not.toHaveProperty("target.domPath")
    expect(projected).not.toHaveProperty("target.domIndex")
    expect(projected).not.toHaveProperty("target.ancestors")
  })

  it("heavy returns the complete record unchanged", () => {
    expect(projectComment(fullComment, "heavy")).toEqual(fullComment)
    expect(projectComment(fullComment, "heavy")).toHaveProperty("target.domPath")
    expect(projectComment(fullComment, "heavy")).toHaveProperty("target.domIndex")
    expect(projectComment(fullComment, "heavy")).toHaveProperty("target.ancestors")
  })

  it("does not mutate the input", () => {
    projectComment(fullComment, "medium")
    projectComment(fullComment, "light")

    expect(fullComment.target).toHaveProperty("domPath")
    expect(fullComment.target).toHaveProperty("domIndex")
    expect(fullComment.target).toHaveProperty("ancestors")
  })
})

describe("serializeExport", () => {
  it("is minified: no newlines", () => {
    const output = serializeExport({
      schemaVersion: 2,
      detail: "light",
      exportedAt: "2026-10-22T12:00:00.000Z",
      extensionVersion: "0.1.0",
      comments: [projectComment(fullComment, "light")]
    })

    expect(output).not.toContain("\n")
  })
})

describe("buildExportFrom", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("exports only the given comments at medium detail without mutating them", () => {
    vi.stubGlobal("chrome", {runtime: {getManifest: () => ({version: "9.9.9"})}})
    const second = {...fullComment, id: "second"} as Comment

    const doc = buildExportFrom([fullComment, second])

    expect(doc.schemaVersion).toBe(SCHEMA_VERSION)
    expect(doc.detail).toBe("medium")
    expect(doc.extensionVersion).toBe("9.9.9")
    expect(doc.comments.map((comment) => comment.id)).toEqual([fullComment.id, "second"])
    expect(doc.comments[0]).not.toHaveProperty("target.domPath")
    expect(fullComment.target).toHaveProperty("domPath")
    expect(fullComment.target).toHaveProperty("domIndex")
    expect(fullComment.target).toHaveProperty("ancestors")
  })
})

describe("watchComments", () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubChrome() {
    const listeners: Array<(changes: Record<string, unknown>, area: string) => void> = []
    vi.stubGlobal("chrome", {
      storage: {
        onChanged: {
          addListener: (fn: (changes: Record<string, unknown>, area: string) => void) =>
            listeners.push(fn),
          removeListener: (fn: (changes: Record<string, unknown>, area: string) => void) => {
            const index = listeners.indexOf(fn)
            if (index >= 0) listeners.splice(index, 1)
          }
        }
      }
    })
    return listeners
  }

  it("reports the bucket for this page from a local change", () => {
    const listeners = stubChrome()
    const seen: Comment[][] = []
    watchComments("http://localhost:3000/checkout", (comments) => seen.push(comments))

    const comment = {id: "1"} as unknown as Comment
    listeners[0]({pages: {newValue: {"http://localhost:3000/checkout": [comment]}}}, "local")

    expect(seen).toEqual([[comment]])
  })

  it("reports an empty list when the page bucket is removed", () => {
    const listeners = stubChrome()
    const seen: Comment[][] = []
    watchComments("http://localhost:3000/checkout", (comments) => seen.push(comments))

    listeners[0]({pages: {newValue: {}}}, "local")

    expect(seen).toEqual([[]])
  })

  it("ignores other areas and detaches on unsubscribe", () => {
    const listeners = stubChrome()
    const seen: Comment[][] = []
    const stop = watchComments("http://x/y", (comments) => seen.push(comments))

    listeners[0]({pages: {newValue: {}}}, "sync")
    expect(seen).toHaveLength(0)

    stop()
    expect(listeners).toHaveLength(0)
  })
})

describe("export detail preference", () => {
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

  it("falls back to medium when nothing is stored", async () => {
    stubChrome()
    expect(await loadExportDetail()).toBe("medium")
  })

  it("round-trips a saved level and rejects junk", async () => {
    const data = stubChrome()
    await saveExportDetail("heavy")
    expect(data.exportDetail).toBe("heavy")
    expect(await loadExportDetail()).toBe("heavy")

    data.exportDetail = "extreme"
    expect(await loadExportDetail()).toBe("medium")
  })
})
