import { describe, expect, it } from "vitest";
import { isOfflineStaticPath, isShellNavigation, resolveSwFetchStrategy, type SwRouteRequest } from "./swRouting";

function route(overrides: Partial<SwRouteRequest> & Pick<SwRouteRequest, "pathname">): SwFetchStrategy | null {
  const req: SwRouteRequest = {
    method: "GET",
    mode: "same-origin",
    destination: "",
    acceptHeader: null,
    sameOrigin: true,
    ...overrides,
  };
  return resolveSwFetchStrategy(req);
}

type SwFetchStrategy = NonNullable<ReturnType<typeof resolveSwFetchStrategy>>;

describe("resolveSwFetchStrategy", () => {
  it("ignores non-GET and cross-origin requests", () => {
    expect(route({ pathname: "/", method: "POST" })).toBeNull();
    expect(route({ pathname: "/", sameOrigin: false })).toBeNull();
  });

  it("uses network-first for API routes", () => {
    expect(route({ pathname: "/api/plan/get" })).toBe("network-first");
  });

  it("uses cache-first for hashed build assets", () => {
    expect(route({ pathname: "/assets/index-CERr3TJD.js" })).toBe("cache-first");
  });

  it("uses network-first for navigations and index.html", () => {
    expect(route({ pathname: "/plan", mode: "navigate" })).toBe("network-first");
    expect(route({ pathname: "/today", destination: "document" })).toBe("network-first");
    expect(route({ pathname: "/index.html" })).toBe("network-first");
    expect(route({ pathname: "/", mode: "navigate" })).toBe("network-first");
    expect(route({ pathname: "/case", acceptHeader: "text/html,application/xhtml+xml" })).toBe(
      "network-first",
    );
  });

  it("uses network-first for offline static paths", () => {
    expect(route({ pathname: "/agenda.json" })).toBe("network-first");
    expect(route({ pathname: "/rooms.json" })).toBe("network-first");
    expect(route({ pathname: "/floor/levels.json" })).toBe("network-first");
  });

  it("falls back to network with cache for other same-origin GETs", () => {
    expect(route({ pathname: "/sw.js" })).toBe("network-fallback");
  });
});

describe("isShellNavigation", () => {
  it("does not treat offline static JSON as shell", () => {
    expect(isOfflineStaticPath("/agenda.json")).toBe(true);
    expect(
      isShellNavigation({
        method: "GET",
        mode: "same-origin",
        destination: "",
        acceptHeader: "application/json",
        pathname: "/agenda.json",
        sameOrigin: true,
      }),
    ).toBe(false);
  });
});
