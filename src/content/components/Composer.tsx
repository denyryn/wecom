import * as React from "react"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/textarea"
import type {AnchorBox} from "@/shared/position"
import {AnchoredCard} from "./AnchoredCard"

type ComposerProps = {
  anchor: AnchorBox
  label: string
  onSubmit: (body: string) => void
  onCancel: () => void
}

export function Composer({anchor, label, onSubmit, onCancel}: ComposerProps) {
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
      <div className="border-b px-3 py-2">
        <span className="block truncate font-mono text-[11px] text-muted-foreground">{label}</span>
      </div>

      <div className="p-3">
        <Textarea
          autoFocus
          value={value}
          rows={3}
          placeholder="What should change here?"
          onChange={(event) => setValue(event.target.value)}
          className="resize-none text-[13px]"
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">⌘/Ctrl+Enter</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={!value.trim()}>
              Comment
            </Button>
          </div>
        </div>
      </div>
    </AnchoredCard>
  )
}
