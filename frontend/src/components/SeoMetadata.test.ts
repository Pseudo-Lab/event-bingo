import { describe, expect, it } from "vitest";

import { getSeoMetaForPath, isIndexedSeoPath } from "./SeoMetadata";

describe("SeoMetadata", () => {
  it("returns indexed metadata for fixed public pages", () => {
    expect(getSeoMetaForPath("/").title).toBe("Bingo Networking | DevFactory");
    expect(getSeoMetaForPath("/experience")).toMatchObject({
      title: "Bingo Networking 서비스 소개 | DevFactory",
    });
    expect(getSeoMetaForPath("/demo/play").description).toContain("데모");
    expect(isIndexedSeoPath("/privacy")).toBe(true);
  });

  it("returns event-specific metadata for public event entry pages", () => {
    expect(getSeoMetaForPath("/event/ai-networking-day")).toMatchObject({
      title: "Ai Networking Day | Bingo Networking",
    });
    expect(isIndexedSeoPath("/event/ai-networking-day")).toBe(true);
  });

  it("marks participant and event privacy routes as noindex", () => {
    expect(getSeoMetaForPath("/event/ai-networking-day/bingo")).toMatchObject({
      title: "Ai Networking Day 빙고 참여 | Bingo Networking",
      robots: "noindex, follow",
    });
    expect(getSeoMetaForPath("/event/ai-networking-day/privacy")).toMatchObject({
      title: "Ai Networking Day 개인정보 처리 안내 | Bingo Networking",
      robots: "noindex, follow",
    });
    expect(isIndexedSeoPath("/event/ai-networking-day/bingo")).toBe(false);
  });

  it("keeps unknown routes out of the index", () => {
    expect(getSeoMetaForPath("/admin")).toMatchObject({
      title: "Bingo Networking | DevFactory",
      robots: "noindex, nofollow",
    });
    expect(isIndexedSeoPath("/admin")).toBe(false);
  });
});
