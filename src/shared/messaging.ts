import {browserApi} from "@/shared/browser"

/**
 * The message send plus attach-retry path shared by the popup toggle and the
 * context-menu action.
 */
export function sendToTab(tabId: number, message: unknown): Promise<void> {
  return browserApi().tabs.sendMessage(tabId, message)
}

/**
 * Sends to the tab, or — when no content script listens there — injects the
 * manifest's declared content scripts and retries once. Throws on final
 * failure so callers can distinguish restricted pages from attach failures.
 */
export async function attachAndSend(tabId: number, message: unknown): Promise<void> {
  try {
    await sendToTab(tabId, message)
  } catch {
    // No listener means the tab was opened before the extension was installed
    // or reloaded. Injecting on demand is the difference between "reload the
    // page" and "just works".
    const files = (browserApi().runtime.getManifest().content_scripts ?? []).flatMap(
      (entry) => entry.js ?? []
    )
    if (files.length === 0) throw new Error("no content script declared")

    await browserApi().scripting.executeScript({target: {tabId}, files})
    await sendToTab(tabId, message)
  }
}
