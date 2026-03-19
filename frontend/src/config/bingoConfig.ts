import { bingoKeywords } from "./bingoKeywords";

export const DEFAULT_BOARD_SIZE = 5;
export const DEFAULT_BOARD_CELL_COUNT = DEFAULT_BOARD_SIZE * DEFAULT_BOARD_SIZE;
export const DEFAULT_EXCHANGE_KEYWORD_COUNT = 3;
export const DEFAULT_BINGO_MISSION_COUNT = 3;

export const normalizeKeywords = (keywords: string[]) => {
  return [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))];
};

export const buildBoardKeywordPool = (keywords: string[], requiredCount: number) => {
  const normalizedKeywords = normalizeKeywords(keywords);

  if (normalizedKeywords.length >= requiredCount) {
    return normalizedKeywords.slice(0, requiredCount);
  }

  const generatedKeywords = Array.from(
    { length: requiredCount - normalizedKeywords.length },
    (_, index) => `키워드 ${normalizedKeywords.length + index + 1}`
  );

  return [...normalizedKeywords, ...generatedKeywords];
};

export const boardKeywordPool = buildBoardKeywordPool(
  [...bingoKeywords],
  DEFAULT_BOARD_CELL_COUNT
);

export const bingoConfig = {
  unlockTime: new Date("2025-05-17T15:00:00+09:00").getTime(),
  boardSize: DEFAULT_BOARD_SIZE,
  boardCellCount: DEFAULT_BOARD_CELL_COUNT,
  exchangeKeywordCount: DEFAULT_EXCHANGE_KEYWORD_COUNT,
  bingoMissionCount: DEFAULT_BINGO_MISSION_COUNT,
} as const;
