import * as React from "react"
import {Badge} from "@/components/ui/badge"
import {createInspector, describeElement, type HoverTarget} from "./inspect"

type Mode = "idle" | "inspect"

type ContentAppProps = {
  host: HTMLElement
}

export default function ContentApp({host}: ContentAppProps) {
  const [mode, setMode] = React.useState<Mode>("idle")
  const [hover, setHover] = React.useState<HoverTarget | null>(null)

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
      // Comment creation lands in M1; M0 only proves the pipeline.
      onPick: () => setMode("idle"),
      onCancel: () => setMode("idle")
    })

    inspector.start()
    return () => inspector.stop()
  }, [mode, host])

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483647]">
      {hover ? <Highlight target={hover} /> : null}
      {mode === "inspect" ? <ModeHint /> : null}
    </div>
  )
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
      <Badge
        className="absolute max-w-[240px] truncate font-mono text-[11px] shadow-sm"
        style={{top, left}}
      >
        {label}
      </Badge>
    </>
  )
}

function ModeHint() {
  return (
    <div className="absolute left-1/2 top-3 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs text-foreground shadow-md backdrop-blur">
        <span className="size-1.5 rounded-full bg-primary" />
        <span>Comment mode — click an element</span>
        <kbd className="rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
          Esc
        </kbd>
      </div>
    </div>
  )
}
