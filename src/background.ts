import {browserApi} from "@/shared/browser"
import {attachAndSend} from "@/shared/messaging"

const MENU_ID = "comment-element"

browserApi().runtime.onInstalled.addListener(async () => {
  // removeAll first: update/reload reruns onInstalled and a duplicate id hits
  // "Cannot create item with same id". Awaited because Firefox is promise-only.
  await browserApi().contextMenus.removeAll()
  browserApi().contextMenus.create({
    id: MENU_ID,
    title: "Comment on this element",
    contexts: ["all"]
  })
})

browserApi().contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return

  // Same silent policy as the keyboard command: restricted pages just do
  // nothing (no listener, no surfacing).
  attachAndSend(tab.id, {type: "comment-element"}).catch(() => {})
})
