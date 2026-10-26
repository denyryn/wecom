import * as React from "react"
import {Check, Copy, Download, MessageSquarePlus, Trash2} from "lucide-react"
import {Button} from "@/components/ui/button"
import {buildExport, copyExport, downloadExport} from "@/shared/export"
import {EXPORT_DETAILS, type ExportDetail} from "@/shared/schema"
import {clearComments, clearSite, isOnSite, loadAllComments, loadExportDetail, saveExportDetail, siteKey, urlKey} from "@/shared/storage"
import {attachAndSend} from "@/shared/messaging"
import {browserApi} from "@/shared/browser"
import appIcon from "@/images/icon-16.png"

const CLEAR_CONFIRM_MS = 4000
const CLEAR_IDLE_CLASS = "w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
type ClearScope = "page" | "site"

export default function PopupApp() {
  const [tab, setTab] = React.useState<chrome.tabs.Tab | null>(null)
  const [count, setCount] = React.useState<number | null>(null)
  const [siteCount, setSiteCount] = React.useState<number | null>(null)
  const [total, setTotal] = React.useState<number | null>(null)
  const [arm, setArm] = React.useState<ClearScope | null>(null)
  const [copyState, setCopyState] = React.useState<"copied" | "failed" | null>(null)
  const [detail, setDetail] = React.useState<ExportDetail>("medium")
  const [note, setNote] = React.useState<string | null>(null)

  const alive = React.useRef(true)
  const armTimer = React.useRef<number | undefined>(undefined)

  const disarm = React.useCallback(() => {
    window.clearTimeout(armTimer.current)
    setArm(null)
  }, [])

  const refresh = React.useCallback(async (t: chrome.tabs.Tab | null) => {
    const pages = await loadAllComments()
    if (!alive.current) return
    setTotal(Object.values(pages).flat().length)

    if (!t?.url) {
      setCount(0)
      setSiteCount(0)
      return
    }

    setCount((pages[urlKey(t.url)] ?? []).length)
    const origin = siteKey(t.url)
    setSiteCount(
      Object.entries(pages)
        .filter(([key]) => isOnSite(key, origin))
        .reduce((sum, [, comments]) => sum + comments.length, 0)
    )
  }, [])

  React.useEffect(() => {
    // StrictMode mounts, cleans up and mounts again; the ref has to be reset.
    alive.current = true

    void (async () => {
      const [tabs, savedDetail] = await Promise.all([
        browserApi().tabs.query({active: true, currentWindow: true}),
        loadExportDetail()
      ])
      if (!alive.current) return

      const active = tabs[0] ?? null
      setTab(active)
      setDetail(savedDetail)
      await refresh(active)
    })()
    return () => {
      alive.current = false
    }
  }, [refresh])

  React.useEffect(() => {
    if (!copyState) return
    const id = window.setTimeout(() => setCopyState(null), 2000)
    return () => window.clearTimeout(id)
  }, [copyState])

  const toggle = async () => {
    disarm()
    if (!tab?.id) {
      setNote("This page does not allow extensions.")
      return
    }

    try {
      await attachAndSend(tab.id, {type: "toggle-inspect"})
    } catch {
      setNote(
        isRestricted(tab.url)
          ? "This page does not allow extensions."
          : "Could not attach to this page. Reload it, then try again."
      )
      return
    }

    window.close()
  }

  const copy = async () => {
    disarm()
    const ok = await copyExport(await buildExport(detail))
    if (alive.current) setCopyState(ok ? "copied" : "failed")
  }

  const download = () => {
    disarm()
    void buildExport(detail).then(downloadExport)
  }

  const clear = async (scope: ClearScope) => {
    if (arm !== scope) {
      setArm(scope)
      window.clearTimeout(armTimer.current)
      armTimer.current = window.setTimeout(disarm, CLEAR_CONFIRM_MS)
      return
    }
    disarm()
    if (!tab?.url) return
    if (scope === "page") await clearComments(urlKey(tab.url))
    else await clearSite(siteKey(tab.url))
    await refresh(tab)
  }

  return (
    <main className="flex flex-col gap-3 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-1.5 text-[14px] font-semibold leading-tight tracking-[-0.01em]">
          <img src={appIcon} alt="" className="size-4 shrink-0" />
          Wecom
        </h1>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Click an element, leave a note, export JSON an agent can act on.
        </p>
      </header>

      <section
        aria-label="Comments on this page"
        className="border-y border-border py-3"
      >
        {!tab?.url ? (
          <p className="flex min-h-9 items-center text-[11px] leading-snug text-muted-foreground">
            This page is not readable from the popup.
          </p>
        ) : count === null ? (
          <p className="flex min-h-9 items-center text-[11px] text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex min-h-9 items-baseline gap-2">
            <span className="text-[30px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
              {count}
            </span>
            <span className="text-[12px] leading-snug text-muted-foreground">
              {count === 1 ? "comment on this page" : "comments on this page"}
            </span>
          </div>
        )}
      </section>

      <Button onClick={toggle} className="w-full">
        <MessageSquarePlus />
        Comment mode
      </Button>

      {note ? (
        <p role="alert" className="text-[11px] leading-snug text-destructive">
          {note}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <span id="export-detail" className="text-[11px] text-muted-foreground">
          Export detail
        </span>
        <div
          role="group"
          aria-labelledby="export-detail"
          className="grid grid-cols-3 gap-0.5 rounded-md border border-border bg-muted p-0.5"
        >
          {EXPORT_DETAILS.map((value) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              aria-pressed={detail === value}
              className="h-8 rounded-sm border border-transparent px-0 text-[12px] font-normal capitalize focus-visible:ring-offset-0 aria-pressed:border-border aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground"
              onClick={() => {
                setDetail(value)
                saveExportDetail(value).catch(() => {})
              }}
            >
              {value}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={copy}>
          {copyState === "copied" ? <Check /> : <Copy />}
          Copy JSON
        </Button>
        <Button variant="outline" onClick={download}>
          <Download />
          Download JSON
        </Button>
      </div>

      <p
        role="status"
        className={
          copyState === "failed"
            ? "min-h-[1lh] text-[11px] text-destructive"
            : "min-h-[1lh] text-[11px] text-muted-foreground"
        }
      >
        {copyState === "copied" ? "Copied." : copyState === "failed" ? "Copy failed." : ""}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={arm === "page" ? "destructive" : "ghost"}
          className={arm === "page" ? "w-full" : CLEAR_IDLE_CLASS}
          disabled={!count}
          onClick={() => clear("page")}
          onBlur={disarm}
        >
          <Trash2 />
          {arm === "page" ? "Confirm page" : "Clear page"}
        </Button>
        <Button
          variant={arm === "site" ? "destructive" : "ghost"}
          className={arm === "site" ? "w-full" : CLEAR_IDLE_CLASS}
          disabled={!siteCount}
          onClick={() => clear("site")}
          onBlur={disarm}
        >
          <Trash2 />
          {arm === "site" ? "Confirm site" : "Clear site"}
        </Button>
      </div>

      <footer className="flex flex-col gap-1 border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground">
          {total === 1 ? "1 comment" : `${total ?? "…"} comments`} across all pages
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <kbd className="kbd">Ctrl+\</kbd>
          <span>toggles comment mode</span>
        </p>
      </footer>
    </main>
  )
}

const RESTRICTED_URL = /^(chrome|edge|about|devtools|view-source|chrome-extension|moz-extension):/i

function isRestricted(url?: string): boolean {
  return (
    !url ||
    RESTRICTED_URL.test(url) ||
    url.startsWith("https://chromewebstore.google.com")
  )
}
