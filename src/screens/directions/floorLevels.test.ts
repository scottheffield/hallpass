import { afterEach, describe, expect, it, vi } from "vitest";

describe("loadFloorLevels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("retries after a failed fetch instead of caching an empty list", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            building: "Salt Palace",
            level: "Level 1",
            image: "/floor/salt-palace-level-1.webp",
            alt: "Level 1",
          },
        ],
      });
    vi.stubGlobal("fetch", fetchMock);

    const { loadFloorLevels } = await import("./floorLevels");

    await expect(loadFloorLevels()).resolves.toEqual([]);
    await expect(loadFloorLevels()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
