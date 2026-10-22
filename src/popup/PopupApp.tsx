import * as React from "react"
import {Button} from "@/components/ui/button"
import {buildExport, copyExport, downloadExport} from "@/shared/export"
import {clearComments, loadAllComments, loadComments, urlKey} from "@/shared/storage"
import {browserApi} from "@/shared/browser"

const CLEAR_CONFIRM_MS = 4000

export default function PopupApp() {
  const [tab, setTab] = React.useState<chrome.tabs.Tab | null>(null)
  const [count, setCount] = React.useState<number | null>(null)
  const [total, setTotal] = React.useState<number | null>(null)
  const [armed, setArmed] = React.useState(false)
  const [copyState, setCopyState] = React.useState<"copied" | "failed" | null>(null)
  const [note, setNote] = React.useState<string | null>(null)

  const alive = React.useRef(true)
  const armTimer = React.useRef<number | undefined>(undefined)

  const disarm = React.useCallback(() => {
    window.clearTimeout(armTimer.current)
    setArmed(false)
  }, [])

  const refresh = React.useCallback(async (t: chrome.tabs.Tab | null) => {
    const all = Object.values(await loadAllComments()).flat()
    if (!alive.current) return
    setTotal(all.length)

    const page = t?.url ? await loadComments(urlKey(t.url)) : []
    if (alive.current) setCount(page.length)
  }, [])

  React.useEffect(() => {
    // StrictMode mounts, cleans up and mounts again; the ref has to be reset.
    alive.current = true

    void (async () => {
      const [active] = await browserApi().tabs.query({active: true, currentWindow: true})
      if (!alive.current) return
      setTab(active ?? null)
      await refresh(active ?? null)
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
      await sendToggle(tab.id)
    } catch {
      // No listener means the tab was opened before the extension was installed
      // or reloaded. Injecting on demand is the difference between "reload the
      // page" and "just works".
      try {
        await injectContentScript(tab.id)
        await sendToggle(tab.id)
      } catch {
        setNote(
          isRestricted(tab.url)
            ? "This page does not allow extensions."
            : "Could not attach to this page. Reload it, then try again."
        )
        return
      }
    }

    window.close()
  }

  const copy = async () => {
    disarm()
    const ok = await copyExport(await buildExport())
    if (alive.current) setCopyState(ok ? "copied" : "failed")
  }

  const download = () => {
    disarm()
    void buildExport().then(downloadExport)
  }

  const clearPage = async () => {
    if (!armed) {
      setArmed(true)
      armTimer.current = window.setTimeout(disarm, CLEAR_CONFIRM_MS)
      return
    }
    disarm()
    if (!tab?.url) return
    await clearComments(urlKey(tab.url))
    await refresh(tab)
  }

  const countLabel =
    !tab?.url
      ? "This page is not readable from the popup."
      : count === null
        ? "Loading…"
        : count === 1
          ? "1 comment on this page"
          : `${count} comments on this page`

  return (
    <main className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="text-sm font-semibold">Web UI Commentator</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Click an element, leave a note, export JSON an agent can act on.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">{countLabel}</p>

      <div className="flex flex-col gap-2">
        <Button onClick={toggle} className="w-full">
          Comment mode
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={copy}>
            Copy JSON
          </Button>
          <Button variant="outline" className="flex-1" onClick={download}>
            Download JSON
          </Button>
        </div>

        <Button
          variant={armed ? "destructive" : "outline"}
          className="w-full"
          disabled={!count}
          onClick={clearPage}
          onBlur={disarm}
        >
          {armed ? "Confirm clear" : "Clear this page"}
        </Button>
      </div>

      {copyState ? (
        <p className="text-xs text-muted-foreground">
          {copyState === "copied" ? "Copied." : "Copy failed."}
        </p>
      ) : null}
      {note ? <p className="text-xs text-destructive">{note}</p> : null}

      <p className="text-xs text-muted-foreground">
        {total ?? "…"} across all pages ·{" "}
        <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Alt+C</kbd> toggles
        comment mode
      </p>
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

function sendToggle(tabId: number): Promise<void> {
  return browserApi().tabs.sendMessage(tabId, {type: "toggle-inspect"})
}

async function injectContentScript(tabId: number): Promise<void> {
  const files = (browserApi().runtime.getManifest().content_scripts ?? []).flatMap(
    (entry) => entry.js ?? []
  )
  if (files.length === 0) throw new Error("no content script declared")

  await browserApi().scripting.executeScript({target: {tabId}, files})
}
