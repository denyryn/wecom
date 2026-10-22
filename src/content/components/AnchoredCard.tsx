import * as React from "react"
import {placeCard, type AnchorBox} from "@/shared/position"

type AnchoredCardProps = {
  anchor: AnchorBox
  onKeyDown?: (event: React.KeyboardEvent) => void
  children: React.ReactNode
}

/**
 * Sizes itself first, then places itself, so a tall card flips above the anchor
 * instead of hanging off the bottom of the viewport.
 */
export function AnchoredCard({anchor, onKeyDown, children}: AnchoredCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<{top: number; left: number} | null>(null)

  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const size = element.getBoundingClientRect()
    setPosition(
      placeCard(
        anchor,
        {width: size.width, height: size.height},
        {width: window.innerWidth, height: window.innerHeight}
      )
    )
  }, [anchor.top, anchor.left, anchor.width, anchor.height])

  return (
    <div
      ref={ref}
      onKeyDown={onKeyDown}
      className="pointer-events-auto fixed w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
      style={{
        top: position?.top ?? anchor.top,
        left: position?.left ?? anchor.left,
        visibility: position ? "visible" : "hidden"
      }}
    >
      {children}
    </div>
  )
}
