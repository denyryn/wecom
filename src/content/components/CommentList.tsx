import * as React from "react"
import {Check, Copy, PanelLeft, PanelRight, TriangleAlert, X} from "lucide-react"
import {Button} from "@/components/ui/button"
import {buildExportFrom, copyExport} from "@/shared/export"
import type {Comment, ListSide} from "@/shared/schema"
import {loadExportDetail} from "@/shared/storage"

type CommentListProps = {
  comments: Comment[]
  side: ListSide
  activeId: string | null
  onFlip: () => void
  onClose: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

const COPY_FEEDBACK_MS = 2000

/** Floating index of this page's comments, pinned to either screen edge. */
export function CommentList({
  comments,
  side,
  activeId,
  onFlip,
  onClose,
  onSelect,
  onDelete
}: CommentListProps) {
  return (
    <aside className="comment-list" data-side={side} aria-label="Comments">
      <div className="comment-list__head">
        <span className="comment-list__title">Comments</span>
        <span className="comment-list__count">{comments.length}</span>

        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto rounded-sm text-muted-foreground"
          title={side === "right" ? "Move list left" : "Move list right"}
          aria-label={side === "right" ? "Move list to the left" : "Move list to the right"}
          onClick={onFlip}
        >
          {side === "right" ? <PanelLeft /> : <PanelRight />}
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-sm text-muted-foreground"
          title="Close"
          aria-label="Close comment list"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      {comments.length === 0 ? (
        <p className="comment-list__empty">No comments on this page yet.</p>
      ) : (
        <ul className="comment-list__items">
          {comments.map((comment, index) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              index={index + 1}
              active={comment.id === activeId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}

type CommentRowProps = {
  comment: Comment
  index: number
  active: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function CommentRow({comment, index, active, onSelect, onDelete}: CommentRowProps) {
  const [copyState, setCopyState] = React.useState<"copied" | "failed" | null>(null)
  const copyTimer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const copy = async () => {
    const ok = await copyExport(buildExportFrom([comment], await loadExportDetail()))
    setCopyState(ok ? "copied" : "failed")
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopyState(null), COPY_FEEDBACK_MS)
  }

  const copyLabel =
    copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy comment"

  return (
    <li className="comment-item" data-active={active}>
      <button
        type="button"
        className="comment-item__main"
        title={comment.body}
        onClick={() => onSelect(comment.id)}
      >
        <span className="comment-item__index">{index}</span>
        <span className="comment-item__text">
          <span className="comment-item__body">{comment.body}</span>
          <span className="comment-item__selector">{comment.target.selector}</span>
        </span>
      </button>

      <span className="comment-item__actions">
        <Button
          variant="ghost"
          size="icon-xs"
          className={
            copyState === "failed"
              ? "rounded-sm text-destructive"
              : "rounded-sm text-muted-foreground"
          }
          title={copyLabel}
          aria-label={`${copyLabel} ${index}`}
          onClick={copy}
        >
          {copyState === "copied" ? <Check /> : copyState === "failed" ? <TriangleAlert /> : <Copy />}
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
          aria-label={`Delete comment ${index}`}
          onClick={() => onDelete(comment.id)}
        >
          <X />
        </Button>
      </span>

      <span role="status" className="sr-only">
        {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : ""}
      </span>
    </li>
  )
}
