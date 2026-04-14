import { describe, expect, it } from "vitest";

import {
  buildAutoFilledKeywordList,
  buildRecommendedEventKeywords,
  clampKeywordList,
  describeKeywordAutofill,
  getKeywordGoalCount,
} from "./adminKeywordUtils";

describe("adminKeywordUtils", () => {
  it("resolves the required keyword count from board size", () => {
    expect(getKeywordGoalCount("3")).toBe(9);
    expect(getKeywordGoalCount(5)).toBe(25);
  });

  it("normalizes, deduplicates, and auto-fills missing keywords", () => {
    expect(clampKeywordList([" AI ", "ML", "AI"], "3")).toEqual(["AI", "ML"]);
    expect(buildAutoFilledKeywordList(["AI", "ML"], "3")).toEqual([
      "AI",
      "ML",
      "키워드 3",
      "키워드 4",
      "키워드 5",
      "키워드 6",
      "키워드 7",
      "키워드 8",
      "키워드 9",
    ]);
  });

  it("describes the missing keyword count and generated placeholders", () => {
    expect(describeKeywordAutofill(["브랜딩", "스폰서"], "3")).toEqual({
      goalCount: 9,
      currentCount: 2,
      missingCount: 7,
      generatedKeywords: [
        "키워드 3",
        "키워드 4",
        "키워드 5",
        "키워드 6",
        "키워드 7",
        "키워드 8",
        "키워드 9",
      ],
      filledKeywords: [
        "브랜딩",
        "스폰서",
        "키워드 3",
        "키워드 4",
        "키워드 5",
        "키워드 6",
        "키워드 7",
        "키워드 8",
        "키워드 9",
      ],
    });
  });

  it("builds full-length event keyword recommendations from event context", () => {
    const recommendations = buildRecommendedEventKeywords({
      name: "가짜연구소 2026 Bingo Networking Day",
      location: "강남역",
      eventTeam: "PseudoLab",
      date: "2026-04-14",
      boardSize: "5",
    });

    expect(recommendations).toHaveLength(25);
    expect(recommendations).toContain("강남역 로컬");
    expect(recommendations.some((keyword) => keyword.includes("PseudoLab"))).toBe(true);
    expect(recommendations.some((keyword) => keyword.includes("4월"))).toBe(true);
    expect(recommendations.some((keyword) => keyword.includes("가짜연구소"))).toBe(true);
    expect(recommendations.every((keyword) => keyword.length <= 14)).toBe(true);
  });

  it("changes recommendation order when the variation seed changes", () => {
    const firstBatch = buildRecommendedEventKeywords({
      name: "AI 데이터 밋업",
      location: "성수",
      eventTeam: "PseudoLab",
      date: "2026-04-14",
      boardSize: "3",
      variationSeed: 0,
    });
    const secondBatch = buildRecommendedEventKeywords({
      name: "AI 데이터 밋업",
      location: "성수",
      eventTeam: "PseudoLab",
      date: "2026-04-14",
      boardSize: "3",
      variationSeed: 1,
    });

    expect(firstBatch).toHaveLength(9);
    expect(secondBatch).toHaveLength(9);
    expect(firstBatch).not.toEqual(secondBatch);
  });
});
