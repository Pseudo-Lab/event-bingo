import { describe, expect, it } from "vitest";

import {
  buildAutoFilledKeywordList,
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
});
