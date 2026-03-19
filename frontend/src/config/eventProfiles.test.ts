import { describe, expect, it } from "vitest";
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
  it("normalizes event slugs for routing", () => {
    expect(normalizeEventSlug("Spring Networking 2026")).toBe("spring-networking-2026");
    expect(getEventHomePath("Spring Networking 2026")).toBe("/spring-networking-2026");
    expect(getEventBingoPath("Spring Networking 2026")).toBe(
      "/spring-networking-2026/bingo"
    );
    expect(getAdminPath("Spring Networking 2026", "members")).toBe("/admin/members");
  });

  it("extracts the active event slug from legacy and event routes", () => {
    expect(getActiveEventSlugFromLocation("/")).toBe("bingo-networking");
    expect(getActiveEventSlugFromLocation("/bingo")).toBe("bingo-networking");
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
});
