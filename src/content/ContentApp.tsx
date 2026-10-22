import * as React from "react"
import {Badge} from "@/components/ui/badge"
import {buildLocator, resolveLocator} from "@/shared/locator"
import type {AnchorBox} from "@/shared/position"
import {newCommentId, type Comment, type Locator} from "@/shared/schema"
import {loadComments, saveComments, urlKey} from "@/shared/storage"
import {Composer} from "./components/Composer"
import {PinLayer, type Pin} from "./components/PinLayer"
import {ReadCard} from "./components/ReadCard"
import {createInspector, describeElement, type HoverTarget} from "./inspect"

type Mode = "idle" | "inspect"

type Draft = {
  locator: Locator
  anchor: AnchorBox
  label: string
}

type ContentAppProps = {
  host: HTMLElement
}

export default function ContentApp({host}: ContentAppProps) {
  const [pageKey] = React.useState(() => urlKey())
  const [mode, setMode] = React.useState<Mode>("idle")
  const [hover, setHover] = React.useState<HoverTarget | null>(null)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [comments, setComments] = React.useState<Comment[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true
    loadComments(pageKey)
      .then((stored) => alive && setComments(stored))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [pageKey])

  React.useEffect(() => {
    const onMessage = (message: unknown) => {
      const type = (message as {type?: string} | null)?.type
      if (type !== "toggle-inspect") return
      setMode((current) => (current === "inspect" ? "idle" : "inspect"))
    }

    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [])

  React.useEffect(() => {
    if (mode !== "inspect") {
      setHover(null)
      return
    }

    const inspector = createInspector({
      host,
      onHover: setHover,
      onPick: ({element, rect}) => {
        setDraft({
          locator: buildLocator(element),
          anchor: {top: rect.top, left: rect.left, width: rect.width, height: rect.height},
          label: describeElement(element)
        })
        setMode("idle")
      },
      onCancel: () => setMode("idle")
    })

    inspector.start()
    return () => inspector.stop()
  }, [mode, host])

  useScrollTick(comments.length > 0)

  const pins: Pin[] = []
  for (const [index, comment] of comments.entries()) {
    const element = resolveLocator(comment.target)
    if (!element) continue

    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue

    pins.push({comment, index: index + 1, rect})
  }

  const active = pins.find((pin) => pin.comment.id === activeId)
  const activeAnchor: AnchorBox | null = active
    ? {
        top: active.rect.top,
        left: active.rect.left,
        width: active.rect.width,
        height: active.rect.height
      }
    : null

  const commit = (next: Comment[]) => {
    setComments(next)
    // The overlay must keep working when storage is full or unavailable.
    saveComments(pageKey, next).catch(() => {})
  }

  const createComment = (body: string) => {
    if (!draft) return

    const now = new Date().toISOString()
    const comment: Comment = {
      id: newCommentId(),
      createdAt: now,
      updatedAt: now,
      status: "open",
      body,
      page: {
        url: location.href,
        urlKey: pageKey,
        title: document.title,
        viewport: {width: window.innerWidth, height: window.innerHeight, dpr: devicePixelRatio}
      },
      target: draft.locator
    }

    commit([...comments, comment])
    setDraft(null)
  }

  const updateBody = (id: string, body: string) => {
    commit(
      comments.map((comment) =>
        comment.id === id ? {...comment, body, updatedAt: new Date().toISOString()} : comment
      )
    )
  }

  const deleteComment = (id: string) => {
    commit(comments.filter((comment) => comment.id !== id))
    setActiveId(null)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483647]">
      {hover ? <Highlight target={hover} /> : null}
      <PinLayer pins={pins} activeId={activeId} onSelect={setActiveId} />

      {mode === "inspect" ? <ModeHint count={comments.length} /> : null}

      {draft ? (
        <Composer
          anchor={draft.anchor}
          label={draft.label}
          onSubmit={createComment}
          onCancel={() => setDraft(null)}
        />
      ) : null}

      {active && activeAnchor ? (
        <ReadCard
          comment={active.comment}
          anchor={activeAnchor}
          onSave={(body) => updateBody(active.comment.id, body)}
          onDelete={() => deleteComment(active.comment.id)}
          onClose={() => setActiveId(null)}
        />
      ) : null}
    </div>
  )
}

/** Re-render while the page scrolls so pins stay glued to their elements. */
function useScrollTick(active: boolean) {
  const [, setTick] = React.useState(0)

  React.useEffect(() => {
    if (!active) return

    let frame = 0
    const bump = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        setTick((tick) => tick + 1)
      })
    }

    document.addEventListener("scroll", bump, true)
    window.addEventListener("resize", bump)

    return () => {
      document.removeEventListener("scroll", bump, true)
      window.removeEventListener("resize", bump)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [active])
}

function Highlight({target}: {target: HoverTarget}) {
  const {rect} = target
  const label = describeElement(target.element)
  const above = rect.top > 28
  const top = above ? rect.top - 24 : rect.top + rect.height + 4
  const left = Math.max(4, Math.min(rect.left, window.innerWidth - 260))

  return (
    <>
      <div
        className="absolute rounded-sm outline-2 outline-offset-0 outline-primary/80"
        style={{top: rect.top, left: rect.left, width: rect.width, height: rect.height}}
      />
      <Badge className="absolute max-w-[240px] truncate font-mono text-[11px] shadow-sm" style={{top, left}}>
        {label}
      </Badge>
    </>
  )
}

function ModeHint({count}: {count: number}) {
  return (
    <div className="absolute left-1/2 top-3 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs text-foreground shadow-md backdrop-blur">
        <span className="size-1.5 rounded-full bg-primary" />
        <span>Comment mode — click an element</span>
        {count > 0 ? <span className="text-muted-foreground">{count} on this page</span> : null}
        <kbd className="rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">Esc</kbd>
      </div>
    </div>
  )
}
