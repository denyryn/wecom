/**
 * The keyboard command is owned by the background worker: `chrome.commands`
 * is not available in a content script, so the toggle is relayed to the tab.
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-inspect") return

  const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
  if (!tab?.id) return

  // Throws on pages without a content script (chrome://, the Web Store).
  chrome.tabs.sendMessage(tab.id, {type: "toggle-inspect"}).catch(() => {})
})
