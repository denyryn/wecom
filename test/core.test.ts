import {beforeEach, describe, expect, it} from "vitest"
import {buildLocator, resolveLocator} from "@/shared/locator"
import {placeCard} from "@/shared/position"
import {urlKey} from "@/shared/storage"

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
