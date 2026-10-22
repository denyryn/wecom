import {browserApi} from "@/shared/browser"
/**
 * The keyboard command is owned by the background worker: `commands.onCommand`
 * is not available in a content script, so the toggle is relayed to the tab.
 */
browserApi().commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-inspect") return

  const [tab] = await browserApi().tabs.query({active: true, currentWindow: true})
  if (!tab?.id) return

  // Throws on pages without a content script (chrome://, the Web Store).
  browserApi().tabs.sendMessage(tab.id, {type: "toggle-inspect"}).catch(() => {})
})
