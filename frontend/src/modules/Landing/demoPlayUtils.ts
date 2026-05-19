import type { BingoCell, CompletedLine } from "../Bingo/bingoGameTypes";
import { getCompletedLines, shuffleArray } from "../Bingo/bingoGameUtils";

export type DemoPlayParticipantId = "host" | "guest";

export type DemoPlayExchangeStep = {
  id: string;
  title: string;
  description: string;
  senderId: DemoPlayParticipantId;
  senderName: string;
  receiverId: DemoPlayParticipantId;
  receiverName: string;
  sentKeywords: string[];
  hostReceivedKeywords: string[];
  effect: "send" | "partial" | "line" | "goal";
};

export type DemoPlayOutcome = {
  board: BingoCell[];
  completedLines: CompletedLine[];
  newCompletedLines: CompletedLine[];
  latestHostReceivedKeywords: string[];
};

export const DEMO_PLAY_BOARD_SIZE = 5;
export const DEMO_PLAY_GOAL_LINES = 3;
export const DEMO_PLAY_MIN_SELECTED_KEYWORDS = 3;
export const DEMO_PLAY_MAX_SELECTED_KEYWORDS = 3;
export const DEMO_PLAY_DEFAULT_SELECTED_KEYWORDS = ["AI", "디자인", "프로덕트"];

export const DEMO_PLAY_KEYWORDS = [
  "AI",
  "디자인",
  "프로덕트",
  "브랜딩",
  "창업",
  "커뮤니티",
  "채용",
  "데이터",
  "교육",
  "운영",
  "마케팅",
  "콘텐츠",
  "기획",
  "협업",
  "네트워킹",
  "UX",
  "리서치",
  "개발",
  "투자",
  "파트너십",
  "브랜드",
  "세일즈",
  "리더십",
  "운영전략",
  "커리어",
] as const;

const BASE_RECEIVED_KEYWORD_INDEXES = [
  [0, 1, 6, 11],
  [2, 3, 4, 7],
  [8, 12, 17, 22],
  [10, 16, 18, 24],
] as const;

const rotateIndexClockwise = (index: number) => {
  const row = Math.floor(index / DEMO_PLAY_BOARD_SIZE);
  const column = index % DEMO_PLAY_BOARD_SIZE;
  return column * DEMO_PLAY_BOARD_SIZE + (DEMO_PLAY_BOARD_SIZE - 1 - row);
};

const mirrorIndexHorizontally = (index: number) => {
  const row = Math.floor(index / DEMO_PLAY_BOARD_SIZE);
  const column = index % DEMO_PLAY_BOARD_SIZE;
  return row * DEMO_PLAY_BOARD_SIZE + (DEMO_PLAY_BOARD_SIZE - 1 - column);
};

const mapIndexGroups = (
  groups: readonly (readonly number[])[],
  mapper: (index: number) => number
) => groups.map((group) => group.map(mapper));

const rotateIndexGroups = (groups: readonly (readonly number[])[], rotationCount: number) =>
  mapIndexGroups(groups, (index) =>
    Array.from({ length: rotationCount }).reduce<number>(
      (currentIndex) => rotateIndexClockwise(currentIndex),
      index
    )
  );

export const DEMO_PLAY_BOARD_VARIANTS = [
  BASE_RECEIVED_KEYWORD_INDEXES,
  rotateIndexGroups(BASE_RECEIVED_KEYWORD_INDEXES, 1),
  rotateIndexGroups(BASE_RECEIVED_KEYWORD_INDEXES, 2),
  rotateIndexGroups(BASE_RECEIVED_KEYWORD_INDEXES, 3),
  mapIndexGroups(BASE_RECEIVED_KEYWORD_INDEXES, mirrorIndexHorizontally),
] as const;

export const getDemoPlayBoardVariantIndex = (rawBoardVariant: string | null) => {
  const parsedVariant = Math.floor(Number(rawBoardVariant));
  if (!Number.isFinite(parsedVariant)) {
    return 0;
  }
  return ((parsedVariant % DEMO_PLAY_BOARD_VARIANTS.length) + DEMO_PLAY_BOARD_VARIANTS.length) %
    DEMO_PLAY_BOARD_VARIANTS.length;
};

const BOARD_INDEXES = Array.from(
  { length: DEMO_PLAY_BOARD_SIZE * DEMO_PLAY_BOARD_SIZE },
  (_, index) => index
);

const getDemoPlayBoardOrder = (boardVariantIndex: number) => {
  const normalizedVariantIndex = getDemoPlayBoardVariantIndex(String(boardVariantIndex));
  if (normalizedVariantIndex === 4) {
    return BOARD_INDEXES.map(mirrorIndexHorizontally);
  }
  return BOARD_INDEXES.map((index) =>
    Array.from({ length: normalizedVariantIndex }).reduce<number>(
      (currentIndex) => rotateIndexClockwise(currentIndex),
      index
    )
  );
};

const lineKey = (line: CompletedLine) => `${line.type}:${line.index}`;

const pickCycledKeywords = (keywords: string[], startIndex: number, count: number) => {
  if (keywords.length === 0) {
    return [];
  }

  return Array.from(
    { length: count },
    (_, index) => keywords[(startIndex + index) % keywords.length]
  );
};

export const createDemoPlayBoard = (
  selectedKeywords: string[],
  options: { shuffleRemaining?: boolean; boardVariantIndex?: number } = {}
) => {
  const uniqueSelectedKeywords = [...new Set(selectedKeywords)];
  const sourceRemainingKeywords = DEMO_PLAY_KEYWORDS.filter(
    (keyword) => !uniqueSelectedKeywords.includes(keyword)
  );
  const remainingKeywords =
    options.shuffleRemaining === false
      ? sourceRemainingKeywords
      : shuffleArray(sourceRemainingKeywords);
  const pool = [...uniqueSelectedKeywords, ...remainingKeywords].slice(
    0,
    DEMO_PLAY_BOARD_SIZE * DEMO_PLAY_BOARD_SIZE
  );
  const boardOrder = getDemoPlayBoardOrder(options.boardVariantIndex ?? 0);
  const orderedPool = boardOrder.map((sourceIndex) => pool[sourceIndex] ?? pool[0]);

  return orderedPool.map<BingoCell>((value, index) => ({
    id: index,
    value,
    selected: 0,
    status: 0,
  }));
};

export const createDemoPlayExchangeSteps = (
  board: BingoCell[],
  selectedKeywords: string[],
  options: { boardVariantIndex?: number } = {}
): DemoPlayExchangeStep[] => {
  const hostKeywords =
    selectedKeywords.length > 0 ? selectedKeywords : DEMO_PLAY_DEFAULT_SELECTED_KEYWORDS;
  const hostSentKeywords = [
    ...hostKeywords,
    ...DEMO_PLAY_KEYWORDS.filter((keyword) => !hostKeywords.includes(keyword)),
  ];
  const receivedKeywordIndexes =
    DEMO_PLAY_BOARD_VARIANTS[
      getDemoPlayBoardVariantIndex(String(options.boardVariantIndex ?? 0))
    ];
  const getReceivedKeywords = (stepIndex: number) =>
    receivedKeywordIndexes[stepIndex].map((index) => board[index].value);

  return [
    {
      id: "host-sends",
      title: "내 키워드 보내기",
      description: "홍길동이 김철수를 검색하고 관심 키워드를 먼저 보냅니다.",
      senderId: "host",
      senderName: "홍길동",
      receiverId: "guest",
      receiverName: "김철수",
      sentKeywords: pickCycledKeywords(hostSentKeywords, 0, 4),
      hostReceivedKeywords: [],
      effect: "send",
    },
    {
      id: "guest-replies",
      title: "상대 키워드 교환 확인",
      description: "김민수와 키워드를 주고받으며 내 빙고판의 일치하는 칸이 채워집니다.",
      senderId: "guest",
      senderName: "김민수",
      receiverId: "host",
      receiverName: "홍길동",
      sentKeywords: getReceivedKeywords(0),
      hostReceivedKeywords: getReceivedKeywords(0),
      effect: "partial",
    },
    {
      id: "one-line",
      title: "1줄 완성",
      description: "김민지가 보낸 키워드가 첫 번째 줄을 완성합니다.",
      senderId: "guest",
      senderName: "김민지",
      receiverId: "host",
      receiverName: "홍길동",
      sentKeywords: getReceivedKeywords(1),
      hostReceivedKeywords: getReceivedKeywords(1),
      effect: "line",
    },
    {
      id: "more-fill",
      title: "추가 키워드 교환 확인",
      description: "이영희가 보낸 키워드가 빙고판을 더 채웁니다.",
      senderId: "guest",
      senderName: "이영희",
      receiverId: "host",
      receiverName: "홍길동",
      sentKeywords: getReceivedKeywords(2),
      hostReceivedKeywords: getReceivedKeywords(2),
      effect: "partial",
    },
    {
      id: "goal",
      title: "목표 달성",
      description: `마지막 교환으로 목표 ${DEMO_PLAY_GOAL_LINES}줄을 달성합니다.`,
      senderId: "guest",
      senderName: "박지훈",
      receiverId: "host",
      receiverName: "홍길동",
      sentKeywords: getReceivedKeywords(3),
      hostReceivedKeywords: getReceivedKeywords(3),
      effect: "goal",
    },
  ];
};

export const applyDemoPlayExchangeStep = (
  board: BingoCell[],
  step: DemoPlayExchangeStep
): DemoPlayOutcome => {
  const previousLines = getCompletedLines(board, DEMO_PLAY_BOARD_SIZE);
  const previousLineKeys = new Set(previousLines.map(lineKey));
  const receivedKeywordSet = new Set(step.hostReceivedKeywords);
  const nextBoard = board.map((cell) =>
    receivedKeywordSet.has(cell.value)
      ? {
          ...cell,
          selected: 1,
          status: 1,
        }
      : cell
  );
  const completedLines = getCompletedLines(nextBoard, DEMO_PLAY_BOARD_SIZE);

  return {
    board: nextBoard,
    completedLines,
    newCompletedLines: completedLines.filter((line) => !previousLineKeys.has(lineKey(line))),
    latestHostReceivedKeywords: step.hostReceivedKeywords,
  };
};
