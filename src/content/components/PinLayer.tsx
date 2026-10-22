import * as React from "react"
import {cn} from "@/lib/utils"
import type {Comment} from "@/shared/schema"

export type Pin = {
  comment: Comment
  index: number
  rect: DOMRect
}

type PinLayerProps = {
  pins: Pin[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function PinLayer({pins, activeId, onSelect}: PinLayerProps) {
  return (
    <>
      {pins.map((pin) => (
        <button
          key={pin.comment.id}
          type="button"
          title={pin.comment.body}
          aria-label={`Comment ${pin.index}: ${pin.comment.body}`}
          onClick={() => onSelect(pin.comment.id)}
          className={cn(
            "pointer-events-auto absolute flex size-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-md ring-2 ring-background",
            activeId === pin.comment.id && "ring-ring"
          )}
          style={{top: pin.rect.top, left: pin.rect.left}}
        >
          {pin.index}
        </button>
      ))}
    </>
  )
}
