/**
 * Chrome MV3 returns promises from `chrome.*`; Firefox exposes the same
 * promise-based API as `browser.*` and its `chrome` alias is callback-only.
 * Resolved per call so tests can stub the global after import.
 */
type BrowserApi = typeof chrome

export function browserApi(): BrowserApi {
  const scope = globalThis as unknown as {browser?: BrowserApi; chrome?: BrowserApi}
  const api = scope.browser ?? scope.chrome
  if (!api) throw new Error("no browser extension API in this context")

  return api
}
