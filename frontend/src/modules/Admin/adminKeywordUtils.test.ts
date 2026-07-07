import { describe, expect, it } from "vitest";

import {
  BOARD_SIZE_RECOMMENDATIONS,
  buildAutoFilledKeywordList,
  buildEventKeywordPresetKeywords,
  clampKeywordList,
  DEFAULT_EVENT_BOARD_SIZE,
  describeEnglishKeywordCoverage,
  describeKeywordAutofill,
  getEventKeywordPresetDefinitions,
  getKeywordGoalCount,
  getRecommendedBoardSize,
} from "./adminKeywordUtils";

describe("adminKeywordUtils", () => {
  it("uses 4x4 as the default board size for new events", () => {
    expect(DEFAULT_EVENT_BOARD_SIZE).toBe("4");
    expect(getKeywordGoalCount(DEFAULT_EVENT_BOARD_SIZE)).toBe(16);
  });

  it("resolves the required keyword count from board size", () => {
    expect(getKeywordGoalCount("3")).toBe(9);
    expect(getKeywordGoalCount("4")).toBe(16);
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

  it("describes missing English keyword labels", () => {
    expect(
      describeEnglishKeywordCoverage(
        {
          AI: "AI",
          네트워킹: "",
        },
        ["AI", "네트워킹", "커뮤니티"]
      )
    ).toEqual({
      totalCount: 3,
      missingCount: 2,
      missingKeywords: ["네트워킹", "커뮤니티"],
    });
  });

  it("exposes the built-in preset categories", () => {
    expect(getEventKeywordPresetDefinitions()).toEqual([
      expect.objectContaining({ id: "business", label: "비즈니스" }),
      expect.objectContaining({ id: "community", label: "커뮤니티" }),
      expect.objectContaining({ id: "tech", label: "테크" }),
      expect.objectContaining({ id: "maker", label: "메이커" }),
    ]);
  });

  it("recommends board sizes by expected attendee count", () => {
    expect(getRecommendedBoardSize()).toBe("4");
    expect(getRecommendedBoardSize(0)).toBe("4");
    expect(getRecommendedBoardSize(30)).toBe("3");
    expect(getRecommendedBoardSize(31)).toBe("4");
    expect(getRecommendedBoardSize(100)).toBe("4");
    expect(getRecommendedBoardSize(101)).toBe("5");
    expect(BOARD_SIZE_RECOMMENDATIONS.map((item) => item.keywordCount)).toEqual([
      9,
      16,
      25,
    ]);
  });

  it("builds preset keywords to match the selected board size", () => {
    const techKeywords = buildEventKeywordPresetKeywords("tech", "3");
    const communityKeywords = buildEventKeywordPresetKeywords("community", "5");
    const makerKeywords = buildEventKeywordPresetKeywords("maker", "4");

    expect(techKeywords).toHaveLength(9);
    expect(techKeywords).toEqual([
      "프론트엔드",
      "백엔드",
      "풀스택",
      "React",
      "TypeScript",
      "Python",
      "SQL",
      "AI",
      "LLM",
    ]);
    expect(communityKeywords).toHaveLength(25);
    expect(communityKeywords).toContain("새로운인연");
    expect(makerKeywords).toHaveLength(16);
    expect(makerKeywords).toContain("문제발견");
  });
});
