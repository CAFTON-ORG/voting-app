import * as React from "react"

const MOBILE_BREAKPOINT = 768

// useSyncExternalStore instead of the generated effect+setState pattern:
// this is the correct primitive for subscribing to external browser state
// (a media query) and avoids the "setState synchronously in an effect"
// lint error the original shadcn-generated version tripped, without
// losing SSR-safety (getServerSnapshot never touches `window`).
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
