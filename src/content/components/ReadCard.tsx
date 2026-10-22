import * as React from "react"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/textarea"
import type {AnchorBox} from "@/shared/position"
import type {Comment} from "@/shared/schema"
import {AnchoredCard} from "./AnchoredCard"

type ReadCardProps = {
  comment: Comment
  anchor: AnchorBox
  onSave: (body: string) => void
  onDelete: () => void
  onClose: () => void
}

export function ReadCard({comment, anchor, onSave, onDelete, onClose}: ReadCardProps) {
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(comment.body)
  const [confirming, setConfirming] = React.useState(false)

  React.useEffect(() => {
    if (!confirming) return
    const timer = window.setTimeout(() => setConfirming(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirming])

  const save = () => {
    const body = value.trim()
    if (!body) return
    onSave(body)
    setEditing(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      if (editing) setEditing(false)
      else onClose()
      return
    }

    if (editing && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      save()
    }
  }

  return (
    <AnchoredCard anchor={anchor} onKeyDown={onKeyDown}>
      <div className="border-b px-3 py-2">
        <span className="block truncate font-mono text-[11px] text-muted-foreground">
          {comment.target.selector}
        </span>
      </div>

      <div className="p-3">
        {editing ? (
          <Textarea
            autoFocus
            value={value}
            rows={3}
            onChange={(event) => setValue(event.target.value)}
            className="resize-none text-[13px]"
          />
        ) : (
          <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed">
            {comment.body}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {formatTime(comment.createdAt)}
          </span>

          {editing ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={!value.trim()}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => (confirming ? onDelete() : setConfirming(true))}
              >
                {confirming ? "Confirm delete" : "Delete"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>
    </AnchoredCard>
  )
}

function formatTime(iso: string): string {
  const date = new Date(iso)

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
}
