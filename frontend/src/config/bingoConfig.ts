import bingoKeywords from "./bingo-keywords.json";

const BOARD_SIZE = 5;
const BOARD_CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const EXCHANGE_KEYWORD_COUNT = 3;

const normalizeKeywords = (keywords: string[]) => {
  return [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))];
};

const buildBoardKeywordPool = (keywords: string[], requiredCount: number) => {
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
  bingoKeywords.keywords,
  BOARD_CELL_COUNT
);

export const bingoConfig = {
  unlockTime: new Date("2025-05-17T15:00:00+09:00").getTime(),
  boardSize: BOARD_SIZE,
  boardCellCount: BOARD_CELL_COUNT,
  exchangeKeywordCount: EXCHANGE_KEYWORD_COUNT,
  bingoMissionCount: 3,
};
