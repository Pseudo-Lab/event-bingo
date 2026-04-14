import { buildBoardKeywordPool, normalizeKeywords } from "../../config/bingoConfig";

export type AdminKeywordBoardSize = 3 | 5 | "3" | "5";
export type EventKeywordRecommendationInput = {
  name: string;
  location: string;
  eventTeam: string;
  date?: string;
  boardSize: AdminKeywordBoardSize;
  variationSeed?: number;
};

const toBoardSize = (boardSize: AdminKeywordBoardSize) => {
  return Number(boardSize) === 3 ? 3 : 5;
};

const GENERIC_EVENT_WORDS = [
  "bingo networking day",
  "networking day",
  "networking",
  "event",
  "bingo",
  "day",
  "행사",
  "네트워킹",
  "데이",
];

const GENERIC_KEYWORD_POOL = [
  "첫만남",
  "재참여",
  "자기소개",
  "관심사 공유",
  "사이드프로젝트",
  "협업 아이디어",
  "서비스 추천",
  "도구 추천",
  "발표 관심",
  "요즘 몰입",
  "팀플 경험",
  "1인 메이커",
  "올해 목표",
  "질문 잘함",
  "사진 교환",
  "후속 대화",
  "공통점 발견",
  "콘텐츠 추천",
  "배움 기록",
  "실험 정신",
  "커뮤니티 러버",
  "커피 취향",
  "책 이야기",
  "연결 고리",
  "대화 맛집",
  "실행력",
  "다음 약속",
  "명함 교환",
];

const THEME_KEYWORD_GROUPS: Array<{ patterns: string[]; keywords: string[] }> = [
  {
    patterns: ["ai", "인공지능", "llm", "머신러닝", "생성형"],
    keywords: [
      "AI 관심",
      "LLM 실험",
      "AI 도구",
    ],
  },
  {
    patterns: ["data", "데이터", "analytics", "분석", "sql"],
    keywords: [
      "데이터 분석",
      "SQL",
      "시각화",
    ],
  },
  {
    patterns: ["research", "연구", "논문", "실험"],
    keywords: [
      "리서치",
      "논문 탐색",
      "가설 검증",
    ],
  },
  {
    patterns: ["design", "디자인", "ux", "ui", "product", "프로덕트"],
    keywords: [
      "UX 감각",
      "문제 정의",
      "서비스 설계",
    ],
  },
  {
    patterns: ["frontend", "프론트", "react", "웹"],
    keywords: [
      "프론트엔드",
      "인터랙션",
      "웹 서비스",
    ],
  },
  {
    patterns: ["backend", "서버", "api", "infra", "devops", "cloud", "k8s"],
    keywords: [
      "백엔드",
      "배포 자동화",
      "인프라 운영",
    ],
  },
  {
    patterns: ["community", "커뮤니티", "meetup", "밋업", "network"],
    keywords: [
      "커뮤니티",
      "대화 편함",
      "사람 연결",
    ],
  },
];

const trimLabel = (value: string, maxLength = 16) => {
  const trimmedValue = value.trim().replace(/\s+/g, " ");
  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, maxLength).trim()}…`;
};

const normalizeContextText = (value: string) => {
  return value
    .trim()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\s+/g, " ");
};

const buildEventLabel = (value: string) => {
  let nextValue = normalizeContextText(value);

  for (const word of GENERIC_EVENT_WORDS) {
    nextValue = nextValue.replace(new RegExp(word, "gi"), " ");
  }

  nextValue = nextValue.replace(/\s+/g, " ").trim();
  return trimLabel(nextValue || normalizeContextText(value), 18);
};

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const sortWithSeed = (items: string[], seed: number) => {
  return [...items].sort((left, right) => {
    const leftHash = hashText(`${seed}:${left}`);
    const rightHash = hashText(`${seed}:${right}`);
    return leftHash - rightHash || left.localeCompare(right, "ko-KR");
  });
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

export const buildRecommendedEventKeywords = ({
  name,
  location,
  eventTeam,
  date,
  boardSize,
  variationSeed = 0,
}: EventKeywordRecommendationInput) => {
  const goalCount = getKeywordGoalCount(boardSize);
  const eventLabel = buildEventLabel(name);
  const locationLabel = trimLabel(normalizeContextText(location), 16);
  const teamLabel = trimLabel(normalizeContextText(eventTeam), 16);
  const monthLabel = date ? `${date.slice(5, 7).replace(/^0/, "")}월` : "";
  const themeContext = `${name} ${location} ${eventTeam}`.toLowerCase();
  const contextualKeywords: string[] = [];

  if (eventLabel) {
    contextualKeywords.push(
      `${eventLabel} 관심`,
      `${eventLabel} 첫참여`,
      `${eventLabel} 아이디어`,
      `${eventLabel} 후속대화`
    );
  }

  if (locationLabel) {
    contextualKeywords.push(
      `${locationLabel} 로컬`,
      `${locationLabel} 방문`,
      `${locationLabel} 추천`
    );
  }

  if (teamLabel) {
    contextualKeywords.push(
      `${teamLabel} 관심`,
      `${teamLabel} 팬`,
      `${teamLabel} 재참여`
    );
  }

  if (monthLabel) {
    contextualKeywords.push(
      `${monthLabel} 목표`,
      `${monthLabel} 도전`
    );
  }

  const themedKeywords = THEME_KEYWORD_GROUPS.flatMap((group) =>
    group.patterns.some((pattern) => themeContext.includes(pattern))
      ? group.keywords
      : []
  );

  const recommendationSeed = hashText(
    `${name}|${location}|${eventTeam}|${date ?? ""}|${variationSeed}|${goalCount}`
  );
  const recommendedKeywords = normalizeKeywords([
    ...sortWithSeed(contextualKeywords, recommendationSeed),
    ...sortWithSeed(themedKeywords, recommendationSeed + 101),
    ...sortWithSeed(GENERIC_KEYWORD_POOL, recommendationSeed + 202),
  ]);

  return buildBoardKeywordPool(recommendedKeywords, goalCount);
};
