import { onSnapshot } from "firebase/firestore";
import type { Query, DocumentReference } from "firebase/firestore";

/**
 * Single-registration Firestore listener registry.
 *
 * Problem this solves: unsubscribing and re-subscribing the *same* query target
 * in quick succession (React StrictMode double-mount, route changes, re-auth)
 * races the Firestore SDK's internal target teardown and throws
 * "Target ID already exists" — a fatal INTERNAL ASSERTION that wedges the whole
 * client (autosave silently stops until reload).
 *
 * Guarantees:
 *  - At most ONE live onSnapshot per `key` regardless of how many callers
 *    subscribe (they share the stream and each gets the latest snapshot).
 *  - Teardown is deferred briefly, so an unmount immediately followed by a
 *    remount with the same key REUSES the live listener instead of churning the
 *    target — eliminating the race at its source.
 */

type SnapCb = (snap: any) => void;
type ErrCb = (err: any) => void;

interface Entry {
  unsub: () => void;
  listeners: Set<SnapCb>;
  errListeners: Set<ErrCb>;
  last?: any;
  teardownTimer?: ReturnType<typeof setTimeout>;
}

const registry = new Map<string, Entry>();

// Keep a torn-down listener's target alive for this long so a same-key remount
// reuses it. Longer than any realistic unmount→remount gap, short enough to
// release the listener when the user really navigates away.
const TEARDOWN_DELAY_MS = 1000;

/**
 * Subscribe to a query/doc under a stable `key` (e.g. `notes:{uid}`).
 * Returns an unsubscribe function for THIS caller only.
 */
export function subscribeSnapshot(
  key: string,
  target: Query | DocumentReference,
  onNext: SnapCb,
  onError?: ErrCb,
  options?: { includeMetadataChanges?: boolean }
): () => void {
  let entry = registry.get(key);

  if (entry) {
    // Reuse the existing live stream — no new target is created.
    if (entry.teardownTimer) {
      clearTimeout(entry.teardownTimer);
      entry.teardownTimer = undefined;
    }
    entry.listeners.add(onNext);
    if (onError) entry.errListeners.add(onError);
    // Deliver the latest snapshot to the new subscriber immediately.
    if (entry.last !== undefined) {
      try { onNext(entry.last); } catch (e) { console.error(e); }
    }
    return () => removeListener(key, onNext, onError);
  }

  const created: Entry = {
    unsub: () => {},
    listeners: new Set([onNext]),
    errListeners: new Set(onError ? [onError] : []),
  };
  registry.set(key, created);

  created.unsub = onSnapshot(
    target as any,
    options || {},
    (snap: any) => {
      created.last = snap;
      created.listeners.forEach((cb) => {
        try { cb(snap); } catch (e) { console.error(e); }
      });
    },
    (err: any) => {
      created.errListeners.forEach((cb) => {
        try { cb(err); } catch (e) { console.error(e); }
      });
      handleFatalFirestoreError(err);
    }
  );

  return () => removeListener(key, onNext, onError);
}

function removeListener(key: string, onNext: SnapCb, onError?: ErrCb) {
  const entry = registry.get(key);
  if (!entry) return;
  entry.listeners.delete(onNext);
  if (onError) entry.errListeners.delete(onError);

  if (entry.listeners.size === 0 && !entry.teardownTimer) {
    entry.teardownTimer = setTimeout(() => {
      const e = registry.get(key);
      if (e && e.listeners.size === 0) {
        try { e.unsub(); } catch (err) { console.error(err); }
        registry.delete(key);
      }
    }, TEARDOWN_DELAY_MS);
  }
}

/**
 * Detect the fatal Firestore internal assertion that wedges the client and
 * recover automatically with a single controlled reload — replacing the manual
 * F5 the user previously needed. Surfaces a save-error state first so the UI can
 * warn before the reload.
 */
let recovering = false;
let onFatalCallback: (() => void) | null = null;
const LAST_RELOAD_KEY = "tidenote:lastFatalReload";
// Never auto-reload more than once per this window. The assertion often recurs
// immediately after reload (multi-tab target churn on stream restart), so an
// unguarded reload turns into an infinite refresh loop.
const RELOAD_COOLDOWN_MS = 60000;

export function setFatalRecoveryHandler(cb: () => void) {
  onFatalCallback = cb;
}

export function handleFatalFirestoreError(err: any) {
  const msg = `${err?.message ?? err ?? ""}`;
  const isFatal =
    msg.includes("Target ID already exists") ||
    msg.includes("INTERNAL ASSERTION");
  if (!isFatal || recovering) return;

  recovering = true;

  // In dev, React StrictMode double-mounts and focus-driven stream restarts make
  // this fire spuriously; reloading would loop. Just log and let the SDK recover.
  if (import.meta.env.DEV) {
    console.warn("[firestore] fatal listener error (dev — not reloading):", msg);
    recovering = false;
    return;
  }

  let lastReload = 0;
  try { lastReload = Number(sessionStorage.getItem(LAST_RELOAD_KEY) || 0); } catch { /* ignore */ }
  if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) {
    // We already reloaded very recently and it recurred — stop, don't loop.
    console.error("[firestore] fatal error recurred after reload; not reloading again:", msg);
    return;
  }

  console.error("[firestore] fatal listener error — recovering via reload:", msg);
  try { onFatalCallback?.(); } catch (e) { console.error(e); }
  try { sessionStorage.setItem(LAST_RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }

  // Give the UI a beat to paint the "not saved" indicator before reloading.
  setTimeout(() => {
    try { window.location.reload(); } catch (e) { console.error(e); }
  }, 1500);
}

// Also catch the assertion when it surfaces as an uncaught error/rejection
// rather than through an onSnapshot error callback.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (ev) => {
    handleFatalFirestoreError(ev?.reason);
  });
  window.addEventListener("error", (ev) => {
    handleFatalFirestoreError(ev?.error || ev?.message);
  });
}
