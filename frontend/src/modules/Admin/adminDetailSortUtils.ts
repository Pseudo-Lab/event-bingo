import type {
  AdminEventBingoRow,
  AdminEventKeywordRow,
} from "./adminTypes";

export type SortDirection = "asc" | "desc";

export type SortState<Key extends string> = {
  key: Key;
  direction: SortDirection;
};

export type BingoSortKey = "line" | "count" | "rate";
export type KeywordSortKey = "keyword" | "count";

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "ko-KR", { numeric: true, sensitivity: "base" });

const applySortDirection = (result: number, direction: SortDirection) =>
  direction === "asc" ? result : -result;

const getBingoLineSortValue = (lineLabel: string) => {
  const matchedNumber = lineLabel.match(/\d+/);
  return matchedNumber ? Number(matchedNumber[0]) : Number.MAX_SAFE_INTEGER;
};

const compareBingoLine = (
  left: AdminEventBingoRow,
  right: AdminEventBingoRow,
) =>
  getBingoLineSortValue(left.lineLabel) -
    getBingoLineSortValue(right.lineLabel) ||
  compareText(left.lineLabel, right.lineLabel);

export const sortBingoRows = (
  rows: AdminEventBingoRow[],
  sortState: SortState<BingoSortKey>,
) => {
  return [...rows].sort((left, right) => {
    if (sortState.key === "line") {
      return applySortDirection(compareBingoLine(left, right), sortState.direction);
    }

    if (sortState.key === "count") {
      const countResult = left.count - right.count;
      if (countResult !== 0) {
        return applySortDirection(countResult, sortState.direction);
      }
    }

    if (sortState.key === "rate") {
      const rateResult = left.rate - right.rate;
      if (rateResult !== 0) {
        return applySortDirection(rateResult, sortState.direction);
      }
    }

    return applySortDirection(compareBingoLine(left, right), "desc");
  });
};

export const sortKeywordRows = (
  rows: AdminEventKeywordRow[],
  sortState: SortState<KeywordSortKey>,
) => {
  return [...rows].sort((left, right) => {
    if (sortState.key === "keyword") {
      return applySortDirection(
        compareText(left.keyword, right.keyword),
        sortState.direction,
      );
    }

    const countResult = left.count - right.count;
    if (countResult !== 0) {
      return applySortDirection(countResult, sortState.direction);
    }

    return left.rank - right.rank;
  });
};
