export type AnchorBox = {
  top: number
  left: number
  width: number
  height: number
}

export type CardSize = {
  width: number
  height: number
}

export type Viewport = {
  width: number
  height: number
}

const GAP = 8

/**
 * Prefer below-left of the anchor, flip above when there is no room, then clamp
 * into the viewport. Pure so the four flip cases are testable without a browser.
 */
export function placeCard(
  anchor: AnchorBox,
  card: CardSize,
  viewport: Viewport
): {top: number; left: number} {
  const below = anchor.top + anchor.height + GAP
  const above = anchor.top - card.height - GAP
  const clampedBelow = viewport.height - card.height - GAP

  const top =
    below + card.height + GAP <= viewport.height
      ? below
      : above >= GAP
        ? above
        : Math.max(GAP, clampedBelow)

  // The anchor can itself be off-screen (resize, reflow, scrolled away). Never
  // let a card that fits the viewport hang past an edge: fully visible wins.
  const clampedTop = Math.max(GAP, Math.min(top, clampedBelow))
  const rightmost = viewport.width - card.width - GAP
  const left = Math.max(GAP, Math.min(anchor.left, rightmost))

  return {top: clampedTop, left}
}
