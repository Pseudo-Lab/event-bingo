import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getActiveEventSlugFromLocation,
  getAdminPath,
  getEventBingoPath,
  getEventHomePath,
  humanizeEventSlug,
  normalizeEventSlug,
  resolveEventProfile,
} from "./eventProfiles";

describe("eventProfiles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes event slugs for routing", () => {
    expect(normalizeEventSlug("Spring Networking 2026")).toBe("spring-networking-2026");
    expect(getEventHomePath("Spring Networking 2026")).toBe("/event/spring-networking-2026");
    expect(getEventBingoPath("Spring Networking 2026")).toBe(
      "/event/spring-networking-2026/bingo"
    );
    expect(getAdminPath("Spring Networking 2026", "members")).toBe("/admin/members");
    expect(getAdminPath("applications")).toBe("/admin/applications");
  });

  it("extracts the active event slug from legacy and event routes", () => {
    expect(getActiveEventSlugFromLocation("/")).toBe("bingo-networking");
    expect(getActiveEventSlugFromLocation("/bingo")).toBe("bingo-networking");
    expect(getActiveEventSlugFromLocation("/experience")).toBe("bingo-networking");
    expect(getActiveEventSlugFromLocation("/event/spring-networking-2026")).toBe(
      "spring-networking-2026"
    );
    expect(getActiveEventSlugFromLocation("/spring-networking-2026")).toBe(
      "spring-networking-2026"
    );
    expect(getActiveEventSlugFromLocation("/admin/members")).toBe("bingo-networking");
  });

  it("builds a fallback profile for unknown event slugs", () => {
    const profile = resolveEventProfile("global-connect-2027");

    expect(humanizeEventSlug(profile.slug)).toBe("Global Connect 2027");
    expect(profile.subTitle).toContain("Global Connect 2027");
    expect(profile.boardSize).toBe(5);
    expect(profile.keywords).toHaveLength(25);
  });
  it("accepts 4x4 event profile overrides", () => {
    const storage = new Map<string, string>();
    storage.set(
      "event-bingo.event-profiles.v1",
      JSON.stringify({
        "four-by-four-demo": {
          boardSize: 4,
          bingoMissionCount: 4,
          keywords: ["AI", "디자인"],
        },
      }),
    );
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });

    const profile = resolveEventProfile("four-by-four-demo");

    expect(profile.boardSize).toBe(4);
    expect(profile.bingoMissionCount).toBe(4);
    expect(profile.keywords).toHaveLength(16);
  });
});
