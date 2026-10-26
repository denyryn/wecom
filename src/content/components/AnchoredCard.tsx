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
  const focused = React.useRef(false)

  const measure = React.useCallback(() => {
    const element = ref.current
    if (!element) return

    const size = element.getBoundingClientRect()
    const view = window.visualViewport
    const placed = placeCard(
      anchor,
      {width: size.width, height: size.height},
      {
        width: view?.width ?? window.innerWidth,
        height: view?.height ?? window.innerHeight
      }
    )
    setPosition({...placed, width: size.width, height: size.height})
  }, [anchor.top, anchor.left, anchor.width, anchor.height])

  React.useLayoutEffect(() => {
    measure()
  }, [measure])

  // Re-place when the window, the visual viewport or the card's own size
  // changes (typing grows the textarea, a resize can shrink the card).
  // `focused` keeps these re-measures from stealing focus mid-typing.
  React.useEffect(() => {
    const view = window.visualViewport
    const reposition = () => measure()
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(reposition)

    window.addEventListener("resize", reposition)
    view?.addEventListener("resize", reposition)
    view?.addEventListener("scroll", reposition)
    if (observer && ref.current) observer.observe(ref.current)

    return () => {
      window.removeEventListener("resize", reposition)
      view?.removeEventListener("resize", reposition)
      view?.removeEventListener("scroll", reposition)
      observer?.disconnect()
    }
  }, [measure])

  // Runs in the layout phase after the commit that applies `visibility: visible`.
  // A child's own `autoFocus` commits before placement and cannot focus into a
  // hidden card, so the first [data-autofocus] descendant is focused here instead.
  // Guarded: scroll re-measures update `position` and must not steal focus.
  React.useLayoutEffect(() => {
    if (!position || focused.current) return
    focused.current = true
    ref.current
      ?.querySelector<HTMLElement>("[data-autofocus]")
      ?.focus({preventScroll: true})
  }, [position])

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
        "anchored-card pointer-events-auto fixed w-[22rem]",
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
