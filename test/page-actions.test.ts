import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {copyAllJson, ditchPage, ditchSite} from "@/content/page-actions"
import {urlKey} from "@/shared/storage"
import type {Comment} from "@/shared/schema"

const pageKey = urlKey()

function comment(id: string): Comment {
  return {
    id,
    createdAt: "2026-10-24T10:00:00.000Z",
    updatedAt: "2026-10-24T10:00:00.000Z",
    status: "open",
    body: `body ${id}`,
    page: {url: `${pageKey}/x`, urlKey: pageKey, title: "t", viewport: {width: 1, height: 1, dpr: 1}},
    target: {selector: "#x", text: "x"}
  } as unknown as Comment
}

type Data = Record<string, unknown>

function stubChrome(data: Data) {
  vi.stubGlobal("chrome", {
    runtime: {getManifest: () => ({version: "9.9.9"})},
    storage: {
      local: {
        get: async (key: string) => ({[key]: data[key]}),
        set: async (items: Data) => Object.assign(data, items)
      }
    }
  })
}

function stubClipboard(writeText: (text: string) => Promise<void> = async () => {}) {
  const spy = vi.fn(writeText)
  vi.stubGlobal("navigator", {clipboard: {writeText: spy}})
  return spy
}

describe("copyAllJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("copies every page at the saved detail level", async () => {
    const data: Data = {
      pages: {[pageKey]: [comment("a")], "http://other/": [comment("b")]},
      exportDetail: "light"
    }
    stubChrome(data)
    const writeText = stubClipboard()

    expect(await copyAllJson()).toBe(true)

    const doc = JSON.parse(writeText.mock.calls[0][0])
    expect(doc.detail).toBe("light")
    expect(doc.extensionVersion).toBe("9.9.9")
    expect(doc.comments.map((entry: Comment) => entry.id)).toEqual(["a", "b"])
    expect(doc.comments[0]).not.toHaveProperty("target")
  })

  it("reports a failed clipboard write", async () => {
    stubChrome({pages: {}})
    stubClipboard(async () => Promise.reject(new Error("denied")))

    expect(await copyAllJson()).toBe(false)
  })
})

describe("ditchSite", () => {
  const other = "http://other.test/pricing"

  beforeEach(() =>
    stubChrome({
      pages: {
        [pageKey]: [comment("a")],
        [`${pageKey}/checkout`]: [comment("b")],
        [other]: [comment("c")]
      }
    })
  )

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("clears every page on the site only after confirmation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)

    expect(await ditchSite()).toBe(true)
    expect(confirm).toHaveBeenCalledWith("Ditch 2 comments on this site? This cannot be undone.")

    const stored = await chrome.storage.local.get("pages")
    expect(Object.keys(stored.pages)).toEqual([other])
  })

  it("keeps the comments when the confirmation is dismissed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)

    expect(await ditchSite()).toBe(false)
    const stored = await chrome.storage.local.get("pages")
    expect(Object.keys(stored.pages)).toHaveLength(3)
  })

  it("does not ask when the site has no comments", async () => {
    stubChrome({pages: {[other]: [comment("c")]}})
    const confirm = vi.spyOn(window, "confirm")

    expect(await ditchSite()).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })
})

describe("ditchPage", () => {
  beforeEach(() => stubChrome({pages: {[pageKey]: [comment("a"), comment("b")]}}))

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("clears this page only after confirmation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)

    expect(await ditchPage()).toBe(true)
    expect(confirm).toHaveBeenCalledWith("Ditch 2 comments on this page? This cannot be undone.")

    const stored = await chrome.storage.local.get("pages")
    expect(stored.pages).toEqual({})
  })

  it("keeps the comments when the confirmation is dismissed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)

    expect(await ditchPage()).toBe(false)
    const stored = await chrome.storage.local.get("pages")
    expect(stored.pages[pageKey]).toHaveLength(2)
  })

  it("does not ask when the page has no comments", async () => {
    stubChrome({pages: {}})
    const confirm = vi.spyOn(window, "confirm")

    expect(await ditchPage()).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })
})
