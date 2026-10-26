import * as React from "react"
import {Check, Pencil, Trash2, X} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/textarea"
import type {AnchorBox} from "@/shared/position"
import type {Comment} from "@/shared/schema"
import {AnchoredCard} from "./AnchoredCard"
import {ElementFacts, ElementHeader} from "./ElementFacts"

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
      else if (confirming) setConfirming(false)
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
      <ElementHeader locator={comment.target}>
        <Button
          size="icon-sm"
          variant="ghost"
          className="ml-auto"
          aria-label="Close comment"
          title="Close"
          onClick={onClose}
        >
          <X />
        </Button>
      </ElementHeader>

      <div className="card-body">
        <ElementFacts locator={comment.target} />

        {editing ? (
          <Textarea
            autoFocus
            aria-label="Comment"
            value={value}
            rows={3}
            onChange={(event) => setValue(event.target.value)}
            className="card-input min-h-20 resize-none leading-relaxed"
          />
        ) : (
          <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed">
            {comment.body}
          </p>
        )}

        <div className="card-foot">
          <span className="text-[11px] text-muted-foreground">
            {formatTime(comment.createdAt)}
          </span>

          {editing ? (
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Discard edit"
                title="Discard"
                onClick={() => setEditing(false)}
              >
                <X />
              </Button>
              <Button
                size="icon-sm"
                aria-label="Save comment"
                title="Save"
                onClick={save}
                disabled={!value.trim()}
              >
                <Check />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                size={confirming ? "sm" : "icon-sm"}
                variant={confirming ? "destructive" : "ghost"}
                aria-label={confirming ? "Confirm delete comment" : "Delete comment"}
                title={confirming ? "Confirm delete" : "Delete"}
                className={confirming ? undefined : "text-destructive hover:bg-destructive/10 hover:text-destructive"}
                onClick={() => (confirming ? onDelete() : setConfirming(true))}
              >
                <Trash2 />
                {confirming ? "Confirm" : null}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Edit comment"
                title="Edit"
                onClick={() => setEditing(true)}
              >
                <Pencil />
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
