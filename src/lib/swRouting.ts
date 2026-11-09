/** Keep public/sw.js in sync with this module. */

export type SwFetchStrategy = "network-first" | "cache-first" | "network-fallback";

export interface SwRouteRequest {
  method: string;
  mode: string;
  destination: string;
  acceptHeader: string | null;
  pathname: string;
  sameOrigin: boolean;
}

export function isShellNavigation(req: SwRouteRequest): boolean {
  if (req.mode === "navigate") return true;
  if (req.destination === "document") return true;
  if (req.pathname === "/" || req.pathname === "/index.html") return true;
  return req.method === "GET" && (req.acceptHeader?.includes("text/html") ?? false);
}

export function isOfflineStaticPath(pathname: string): boolean {
  return (
    pathname === "/agenda.json" ||
    pathname === "/rooms.json" ||
    pathname.startsWith("/floor/")
  );
}

/**
 * Chooses how the service worker should handle a same-origin GET.
 * Returns null when the worker should not intercept.
 */
export function resolveSwFetchStrategy(req: SwRouteRequest): SwFetchStrategy | null {
  if (req.method !== "GET") return null;
  if (!req.sameOrigin) return null;

  if (req.pathname.startsWith("/api/")) return "network-first";
  if (req.pathname.startsWith("/assets/")) return "cache-first";
  if (isShellNavigation(req)) return "network-first";
  if (isOfflineStaticPath(req.pathname)) return "network-first";
  return "network-fallback";
}
