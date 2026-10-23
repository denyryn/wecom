import * as React from "react"
import {placeCard, type AnchorBox} from "@/shared/position"
import {cn} from "@/lib/utils"

type AnchoredCardProps = {
  anchor: AnchorBox
  onKeyDown?: (event: React.KeyboardEvent) => void
  children: React.ReactNode
}

type CardPlacement = {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Sizes itself first, then places itself, so a tall card flips above the anchor
 * instead of hanging off the bottom of the viewport.
 */
export function AnchoredCard({anchor, onKeyDown, children}: AnchoredCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<CardPlacement | null>(null)

  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const size = element.getBoundingClientRect()
    const placed = placeCard(
      anchor,
      {width: size.width, height: size.height},
      {width: window.innerWidth, height: window.innerHeight}
    )
    setPosition({...placed, width: size.width, height: size.height})
  }, [anchor.top, anchor.left, anchor.width, anchor.height])

  const side = !position
    ? "none"
    : position.top >= anchor.top + anchor.height
      ? "top"
      : position.top + position.height <= anchor.top
        ? "bottom"
        : "none"

  const caretX = position
    ? Math.min(Math.max(anchor.left + anchor.width / 2 - position.left, 16), position.width - 16)
    : 16

  return (
    <div
      ref={ref}
      onKeyDown={onKeyDown}
      data-side={side}
      className={cn(
        "anchored-card pointer-events-auto fixed w-80",
        position && "is-placed"
      )}
      style={
        {
          top: position?.top ?? anchor.top,
          left: position?.left ?? anchor.left,
          visibility: position ? "visible" : "hidden",
          "--caret-x": `${caretX}px`
        } as React.CSSProperties
      }
    >
      {side !== "none" ? <span aria-hidden="true" className="anchored-card__caret" /> : null}
      {children}
    </div>
  )
}
