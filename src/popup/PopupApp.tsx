import * as React from "react"
import {Button} from "@/components/ui/button"

export default function PopupApp() {
  const [note, setNote] = React.useState<string | null>(null)

  const toggle = async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
    if (!tab?.id) return

    try {
      await chrome.tabs.sendMessage(tab.id, {type: "toggle-inspect"})
      window.close()
    } catch {
      setNote("This page does not allow extensions.")
    }
  }

  return (
    <main className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="text-sm font-semibold">Web UI Commentator</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Click an element, then export a locator an agent can act on.
        </p>
      </div>

      <Button onClick={toggle} className="w-full">
        Comment mode
      </Button>

      <p className="text-xs text-muted-foreground">
        Shortcut: <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Alt+Shift+C</kbd>
      </p>

      {note ? <p className="text-xs text-destructive">{note}</p> : null}
    </main>
  )
}
