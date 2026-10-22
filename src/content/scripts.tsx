import ReactDOM from "react-dom/client"
import ContentApp from "./ContentApp"
import {emitToggleInspect} from "./toggle"
import {browserApi} from "@/shared/browser"

/**
 * Extension.js content_script entrypoint. The framework calls this on injection
 * and calls the returned cleanup on HMR/teardown. Do not invoke it yourself.
 */
export default function initial() {
  // A tab that was open when the extension reloaded keeps a dead host, and the
  // popup re-injects this script into exactly that tab.
  for (const stale of Array.from(document.querySelectorAll("[data-extension-root]"))) {
    stale.remove()
  }

  const host = document.createElement("div")
  host.setAttribute("data-extension-root", "true")
  // The shadow root shields descendants, not the host itself: page rules like
  // `div { opacity: .8 }` still hit the host without this.
  host.style.cssText = "all: initial !important"
  document.body.appendChild(host)

  const shadowRoot = host.attachShadow({mode: "open"})
  const styleElement = document.createElement("style")
  shadowRoot.appendChild(styleElement)

  fetchCSS().then((css) => (styleElement.textContent = css))

  // `all: initial` also drops inherited typography, and custom properties
  // survive it — which is why the design tokens keep working but the font has
  // to be set here rather than on :host.
  const container = document.createElement("div")
  container.className = "font-sans text-[13px] leading-normal text-foreground"
  shadowRoot.appendChild(container)

  const mountingPoint = ReactDOM.createRoot(container)
  mountingPoint.render(<ContentApp host={host} />)

  const onMessage = (message: unknown) => {
    if ((message as {type?: string} | null)?.type === "toggle-inspect") emitToggleInspect()
  }
  browserApi().runtime.onMessage.addListener(onMessage)

  return () => {
    browserApi().runtime.onMessage.removeListener(onMessage)
    mountingPoint.unmount()
    host.remove()
  }
}

async function fetchCSS() {
  // Extension.js inlines this import as a `data:` URL; a shadow root ignores
  // stylesheets that live outside it, so the text is fetched and inserted.
  const cssUrl = new URL("./styles.css", import.meta.url)
  const response = await fetch(cssUrl)
  const text = await response.text()

  return response.ok ? text : Promise.reject(text)
}
