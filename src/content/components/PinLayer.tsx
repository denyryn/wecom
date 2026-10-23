import * as React from "react"
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
          data-active={activeId === pin.comment.id}
          onClick={() => onSelect(pin.comment.id)}
          className="pin pointer-events-auto -translate-x-1/2 -translate-y-1/2"
          style={{top: pin.rect.top, left: pin.rect.left}}
        >
          {pin.index}
        </button>
      ))}
    </>
  )
}
