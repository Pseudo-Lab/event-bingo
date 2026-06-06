import { describe, expect, it } from "vitest";

import { sortBingoRows, sortKeywordRows } from "./adminDetailSortUtils";

describe("adminDetailSortUtils", () => {
  it("keeps keyword ranks ascending when count ties under descending count sort", () => {
    const rows = [
      { rank: 1, keyword: "제휴", count: 2 },
      { rank: 2, keyword: "시장조사", count: 1 },
      { rank: 3, keyword: "유저리서치", count: 1 },
      { rank: 4, keyword: "고객인터뷰", count: 1 },
      { rank: 5, keyword: "브랜딩", count: 1 },
    ];

    expect(
      sortKeywordRows(rows, { key: "count", direction: "desc" }).map(
        (row) => row.rank,
      ),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows completed bingo lines first when sorting by line descending", () => {
    const rows = [
      { lineLabel: "0줄", count: 3, rate: 100, isComplete: false },
      { lineLabel: "1줄", count: 0, rate: 0, isComplete: false },
      { lineLabel: "2줄", count: 0, rate: 0, isComplete: false },
      { lineLabel: "3줄", count: 0, rate: 0, isComplete: true },
    ];

    expect(
      sortBingoRows(rows, { key: "line", direction: "desc" }).map(
        (row) => row.lineLabel,
      ),
    ).toEqual(["3줄", "2줄", "1줄", "0줄"]);
  });
});
