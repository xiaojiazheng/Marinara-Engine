// ──────────────────────────────────────────────
// Keep-Alive: Prevent Chrome/Edge tab sleeping
// ──────────────────────────────────────────────
// Chrome and Edge aggressively throttle/freeze background tabs
// ("Sleeping Tabs" / Tab Discarding). This kills timers, stales
// React Query data, and makes the app feel laggy when returning.
//
// Mechanisms:
// 1. Web Locks API — holding a lock signals the browser that the
//    tab has important work; Chrome won't discard it.
// 2. Periodic BroadcastChannel ping — lightweight activity that
//    prevents the "idle" heuristic from triggering.
// ──────────────────────────────────────────────

const IPV4_LOOPBACK_HOSTNAME_RE = /^127(?:\.(?:0|[1-9]\d?|1\d{2}|2[0-4]\d|25[0-5])){3}$/u;

let started = false;

export function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    IPV4_LOOPBACK_HOSTNAME_RE.test(normalized) ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

export function startKeepAlive() {
  if (started) return;
  started = true;

  // Mobile browsers need to suspend idle pages to protect battery and thermal
  // headroom, so the keep-alive only runs for pointer-fine (desktop) users.
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
    return;
  }
  // ── Web Lock (primary defense) ──
  // navigator.locks.request() holds a lock for as long as the returned
  // promise is pending. We never resolve it → lock held forever → tab
  // won't be discarded while the page is open.
  if (navigator.locks) {
    navigator.locks.request("marinara-engine-keep-alive", () => new Promise(() => {}));
  }

  // ── Periodic activity (fallback for older Edge) ──
  // A tiny BroadcastChannel message every 20s counts as "tab activity"
  // and resets the idle timer that triggers tab sleeping.
  try {
    const channel = new BroadcastChannel("marinara-heartbeat");
    setInterval(() => {
      channel.postMessage(0);
    }, 20_000);
  } catch {
    // BroadcastChannel not available — that's fine
  }
}
