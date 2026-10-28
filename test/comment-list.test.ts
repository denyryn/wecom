import {describe, expect, it} from "vitest"
import {createElement} from "react"
import {renderToStaticMarkup} from "react-dom/server"
import {CommentList} from "@/content/components/CommentList"
import type {Comment, Locator} from "@/shared/schema"

function comment(id: string, body: string): Comment {
  const target = {selector: `#${id}`, text: "", tag: "button"} as Locator

  return {
    id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "open",
    body,
    page: {
      url: "https://example.com/",
      urlKey: "https://example.com",
      title: "Example",
      viewport: {width: 1000, height: 800, dpr: 1}
    },
    target
  }
}

function render(comments: Comment[], side: "left" | "right" = "right") {
  return renderToStaticMarkup(
    createElement(CommentList, {
      comments,
      side,
      activeId: null,
      onFlip: () => {},
      onClose: () => {},
      onSelect: () => {},
      onDelete: () => {}
    })
  )
}

describe("CommentList", () => {
  it("lists every comment with its own copy and delete actions", () => {
    const html = render([comment("a", "make this primary"), comment("b", "drop this")])

    expect(html).toContain("make this primary")
    expect(html).toContain("drop this")
    expect(html).toContain('aria-label="Copy comment 1"')
    expect(html).toContain('aria-label="Delete comment 2"')
    expect(html).toContain('data-side="right"')
  })

  it("still lists comments whose element no longer resolves", () => {
    expect(render([comment("gone", "orphan")])).toContain("orphan")
  })

  it("shows an empty state", () => {
    expect(render([])).toContain("No comments on this page yet.")
  })
})
