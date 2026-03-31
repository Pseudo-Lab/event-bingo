import { buildBoardKeywordPool, normalizeKeywords } from "../../config/bingoConfig";

export type AdminKeywordBoardSize = 3 | 5 | "3" | "5";

const toBoardSize = (boardSize: AdminKeywordBoardSize) => {
  return Number(boardSize) === 3 ? 3 : 5;
};

export const getKeywordGoalCount = (boardSize: AdminKeywordBoardSize) => {
  const resolvedBoardSize = toBoardSize(boardSize);
  return resolvedBoardSize * resolvedBoardSize;
};

export const clampKeywordList = (
  keywords: string[],
  boardSize: AdminKeywordBoardSize
) => {
  return normalizeKeywords(keywords).slice(0, getKeywordGoalCount(boardSize));
};

export const buildAutoFilledKeywordList = (
  keywords: string[],
  boardSize: AdminKeywordBoardSize
) => {
  const normalizedKeywords = clampKeywordList(keywords, boardSize);
  return buildBoardKeywordPool(normalizedKeywords, getKeywordGoalCount(boardSize));
};

export const describeKeywordAutofill = (
  keywords: string[],
  boardSize: AdminKeywordBoardSize
) => {
  const normalizedKeywords = clampKeywordList(keywords, boardSize);
  const filledKeywords = buildBoardKeywordPool(
    normalizedKeywords,
    getKeywordGoalCount(boardSize)
  );

  return {
    goalCount: getKeywordGoalCount(boardSize),
    currentCount: normalizedKeywords.length,
    missingCount: filledKeywords.length - normalizedKeywords.length,
    generatedKeywords: filledKeywords.slice(normalizedKeywords.length),
    filledKeywords,
  };
};
