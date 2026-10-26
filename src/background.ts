import {browserApi} from "@/shared/browser"
import {attachAndSend} from "@/shared/messaging"

/** One root, one submenu: the page's own context menu stays uncluttered. */
const ROOT_ID = "wecom"
const ROOT_TITLE = "Wecom utility"

/**
 * Item ids double as content-script message types, so the click handler needs
 * no mapping and the two lists cannot drift.
 */
const ITEMS = [
  {id: "comment-element", title: "Comment on this element"},
  {id: "toggle-inspect", title: "Toggle comment mode"},
  {id: "copy-json", title: "Copy JSON"},
  {id: "ditch-page", title: "Ditch all on this page"},
  {id: "ditch-site", title: "Ditch all on this site"}
] as const

browserApi().runtime.onInstalled.addListener(async () => {
  // removeAll first: update/reload reruns onInstalled and a duplicate id hits
  // "Cannot create item with same id". Awaited because Firefox is promise-only.
  await browserApi().contextMenus.removeAll()
  await browserApi().contextMenus.create({
    id: ROOT_ID,
    title: ROOT_TITLE,
    contexts: ["all"]
  })

  // A child may only be created after its parent exists.
  for (const item of ITEMS) {
    await browserApi().contextMenus.create({
      id: item.id,
      parentId: ROOT_ID,
      title: item.title,
      contexts: ["all"]
    })
  }
})

browserApi().contextMenus.onClicked.addListener((info, tab) => {
  const item = ITEMS.find((entry) => entry.id === info.menuItemId)
  if (!item || !tab?.id) return

  // Same silent policy as the keyboard command: restricted pages just do
  // nothing (no listener, no surfacing).
  attachAndSend(tab.id, {type: item.id}).catch(() => {})
})
