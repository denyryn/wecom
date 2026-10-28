import * as React from "react"
import {Check, Copy, List, Trash2, TriangleAlert} from "lucide-react"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {buildExportFrom, copyExport} from "@/shared/export"
import {buildLocator, resolveLocator} from "@/shared/locator"
import type {AnchorBox} from "@/shared/position"
import {newCommentId, type Comment, type ListSide, type Locator} from "@/shared/schema"
import {
  loadComments,
  loadExportDetail,
  loadListSide,
  saveComments,
  saveListSide,
  urlKey,
  watchComments
} from "@/shared/storage"
import {Composer} from "./components/Composer"
import {CommentList} from "./components/CommentList"
import {PinLayer, type Pin} from "./components/PinLayer"
import {ReadCard} from "./components/ReadCard"
import {createInspector, describeElement, type HoverTarget} from "./inspect"
import {takeContextTarget} from "./context-target"
import {onCommentElement, onToggleInspect} from "./toggle"

type Mode = "idle" | "inspect"

type Draft = {
  locator: Locator
  anchor: AnchorBox
}

type ContentAppProps = {
  host: HTMLElement
}

/** Same draft the inspector's pick path builds, reused by right-click targeting. */
function toDraft(element: Element): Draft {
  const rect = element.getBoundingClientRect()
  return {
    locator: buildLocator(element),
    anchor: {top: rect.top, left: rect.left, width: rect.width, height: rect.height}
  }
}

export default function ContentApp({host}: ContentAppProps) {
  const [pageKey] = React.useState(() => urlKey())
  const [mode, setMode] = React.useState<Mode>("idle")
  const [hover, setHover] = React.useState<HoverTarget | null>(null)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [comments, setComments] = React.useState<Comment[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [listOpen, setListOpen] = React.useState(false)
  const [listSide, setListSide] = React.useState<ListSide>("right")

  React.useEffect(() => {
    let alive = true

    loadListSide()
      .then((side) => alive && setListSide(side))
      .catch(() => {})

    loadComments(pageKey)
      .then((stored) => alive && setComments(stored))
      .catch(() => {})

    const stop = watchComments(pageKey, (next) => {
      if (alive) setComments(next)
    })

    return () => {
      alive = false
      stop()
    }
  }, [pageKey])

  React.useEffect(() => {
    // Registered from the content entry, not from here, so a toggle that
    // arrives before React mounts is still delivered.
    return onToggleInspect(() => {
      setMode((current) => (current === "inspect" ? "idle" : "inspect"))
    })
  }, [])

  React.useEffect(() => {
    // Right-click → "Comment on this element". With a tracked target the
    // composer opens directly; otherwise fall back to arming comment mode.
    return onCommentElement(() => {
      const element = takeContextTarget()
      if (element?.isConnected) {
        setDraft(toDraft(element))
        setMode("idle")
      } else {
        setMode((current) => (current === "inspect" ? "idle" : "inspect"))
      }
    })
  }, [])

  React.useEffect(() => {
    if (!draft && !activeId && !listOpen) return

    // Bubble phase, so an open card's own Escape handling (and the inspector's
    // capture-phase handler) gets the first say.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      if (draft) setDraft(null)
      else if (activeId) setActiveId(null)
      else setListOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [draft, activeId, listOpen])

  React.useEffect(() => {
    if (mode !== "inspect") {
      setHover(null)
      return
    }

    const inspector = createInspector({
      host,
      onHover: setHover,
      onPick: ({element}) => {
        setDraft(toDraft(element))
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

  const ditchAll = () => {
    commit([])
    setActiveId(null)
    setDraft(null)
  }

  const showBar = comments.length > 0 || mode === "inspect" || listOpen
  const [barMounted, setBarMounted] = React.useState(showBar)
  const [barLeaving, setBarLeaving] = React.useState(false)

  React.useEffect(() => {
    if (showBar) {
      setBarMounted(true)
      setBarLeaving(false)
      return
    }
    if (!barMounted) return

    // Keep the bar mounted for the exit animation, then unmount.
    setBarLeaving(true)
    const timer = window.setTimeout(() => {
      setBarMounted(false)
      setBarLeaving(false)
    }, BAR_EXIT_MS)

    return () => window.clearTimeout(timer)
  }, [showBar, barMounted])

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483647]">
      {hover ? <Highlight target={hover} /> : null}
      <PinLayer pins={pins} activeId={activeId} onSelect={setActiveId} />

      {barMounted ? (
        <ModeHint
          count={comments.length}
          on={mode === "inspect"}
          leaving={barLeaving}
          listOpen={listOpen}
          onToggleList={() => setListOpen((open) => !open)}
          onCopy={async () => copyExport(buildExportFrom(comments, await loadExportDetail()))}
          onDitch={ditchAll}
        />
      ) : null}

      {listOpen ? (
        <CommentList
          comments={comments}
          side={listSide}
          activeId={activeId}
          onFlip={() => {
            const next = listSide === "right" ? "left" : "right"
            setListSide(next)
            // The chosen edge is a user setting, like the export detail.
            saveListSide(next).catch(() => {})
          }}
          onClose={() => setListOpen(false)}
          onSelect={(id) => {
            // A comment whose element is gone has no anchor for the read card;
            // the list still lets you copy or delete it.
            if (pins.some((pin) => pin.comment.id === id)) setActiveId(id)
          }}
          onDelete={deleteComment}
        />
      ) : null}

      {draft ? (
        <Composer
          anchor={draft.anchor}
          locator={draft.locator}
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
        className="absolute outline-2 outline-offset-1 outline-marker"
        style={{top: rect.top, left: rect.left, width: rect.width, height: rect.height}}
      />
      <Badge
        className="absolute max-w-[240px] truncate rounded-xs px-1.5 py-0.5 font-mono text-[11px] font-normal"
        style={{top, left}}
      >
        {label}
      </Badge>
    </>
  )
}

const DITCH_CONFIRM_MS = 4000
const COPY_FEEDBACK_MS = 2000
const BAR_EXIT_MS = 120 // matches --dur-micro

type ModeHintProps = {
  count: number
  on: boolean
  leaving: boolean
  listOpen: boolean
  onToggleList: () => void
  onCopy: () => Promise<boolean>
  onDitch: () => void
}

function ModeHint({count, on, leaving, listOpen, onToggleList, onCopy, onDitch}: ModeHintProps) {
  const [copyState, setCopyState] = React.useState<"copied" | "failed" | null>(null)
  const [armed, setArmed] = React.useState(false)
  const alive = React.useRef(true)
  const copyTimer = React.useRef<number | undefined>(undefined)
  const armTimer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      window.clearTimeout(copyTimer.current)
      window.clearTimeout(armTimer.current)
    }
  }, [])

  const disarm = () => {
    window.clearTimeout(armTimer.current)
    setArmed(false)
  }

  const copy = async () => {
    disarm()
    const ok = await onCopy()
    if (!alive.current) return

    setCopyState(ok ? "copied" : "failed")
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => {
      if (alive.current) setCopyState(null)
    }, COPY_FEEDBACK_MS)
  }

  const ditch = () => {
    if (!armed) {
      setArmed(true)
      armTimer.current = window.setTimeout(disarm, DITCH_CONFIRM_MS)
      return
    }

    disarm()
    onDitch()
  }

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
      <div className="mode-hint" data-leaving={leaving ? "true" : "false"}>
        <span className="mode-hint__lead">
          <span className="mode-hint__label" data-on={on}>
            Comment mode
          </span>
          <span className="sr-only">{on ? "on" : "off"}</span>
        </span>

        <span className="mode-hint__count" aria-label={`${count} on this page`}>
          {count}
        </span>

        <Button
          variant="ghost"
          size="icon-xs"
          className={
            listOpen
              ? "rounded-sm bg-accent text-accent-foreground"
              : "rounded-sm text-muted-foreground"
          }
          data-tooltip={listOpen ? "Hide comment list" : "Show comment list"}
          aria-label={listOpen ? "Hide comment list" : "Show comment list"}
          aria-pressed={listOpen}
          onClick={onToggleList}
        >
          <List />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          className={
            copyState === "failed"
              ? "rounded-sm text-destructive"
              : "rounded-sm text-muted-foreground"
          }
          data-tooltip={
            copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy JSON"
          }
          aria-label={
            copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy JSON"
          }
          disabled={count === 0}
          onClick={copy}
        >
          {copyState === "copied" ? (
            <Check />
          ) : copyState === "failed" ? (
            <TriangleAlert />
          ) : (
            <Copy />
          )}
        </Button>

        <Button
          variant={armed ? "destructive" : "ghost"}
          size="icon-xs"
          className={
            armed
              ? "rounded-sm"
              : "rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
          }
          data-tooltip={armed ? "Confirm ditch all" : "Ditch all"}
          aria-label={armed ? "Confirm ditch all" : "Ditch all comments"}
          onClick={ditch}
          onBlur={disarm}
          disabled={count === 0}
        >
          <Trash2 />
        </Button>

        {on ? <kbd className="kbd">Esc</kbd> : null}

        <span role="status" className="sr-only">
          {armed
            ? "Click again to ditch all comments"
            : copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Copy failed"
                : ""}
        </span>
      </div>
    </div>
  )
}
