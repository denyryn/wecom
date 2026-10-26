import * as React from "react"
import {Send, X} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/textarea"
import type {AnchorBox} from "@/shared/position"
import type {Locator} from "@/shared/schema"
import {AnchoredCard} from "./AnchoredCard"
import {ElementFacts, ElementHeader} from "./ElementFacts"

type ComposerProps = {
  anchor: AnchorBox
  locator: Locator
  onSubmit: (body: string) => void
  onCancel: () => void
}

export function Composer({anchor, locator, onSubmit, onCancel}: ComposerProps) {
  const [value, setValue] = React.useState("")

  const submit = () => {
    const body = value.trim()
    if (body) onSubmit(body)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
      return
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <AnchoredCard anchor={anchor} onKeyDown={onKeyDown}>
      <ElementHeader locator={locator} />

      <div className="card-body">
        <ElementFacts locator={locator} />

        <Textarea
          data-autofocus
          aria-label="Comment"
          value={value}
          rows={3}
          placeholder="What should change here…"
          onChange={(event) => setValue(event.target.value)}
          className="card-input min-h-20 resize-none leading-relaxed"
        />

        <div className="card-foot">
          <kbd className="kbd">⌘/Ctrl+Enter</kbd>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Discard comment"
              title="Discard"
              onClick={onCancel}
            >
              <X />
            </Button>
            <Button
              size="icon-sm"
              aria-label="Add comment"
              title="Add comment"
              onClick={submit}
              disabled={!value.trim()}
            >
              <Send />
            </Button>
          </div>
        </div>
      </div>
    </AnchoredCard>
  )
}
