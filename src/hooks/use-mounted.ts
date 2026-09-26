import { useSyncExternalStore } from "react";

// Same useSyncExternalStore pattern as use-mobile.ts's useIsMobile: the
// correct primitive for "is this the real client render yet," not an
// effect+setState pair, and it never touches anything server-unsafe in
// getServerSnapshot.
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

/** True only once mounted on the client — for values that necessarily
 * differ between server and client render (theme from localStorage,
 * pointer-based effects, `Date.now()`), so the first client render can
 * match the server's before "upgrading" a tick later. */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
