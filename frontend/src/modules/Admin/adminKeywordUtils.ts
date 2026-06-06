import { buildBoardKeywordPool, normalizeKeywords } from "../../config/bingoConfig";

export type AdminKeywordBoardSize = 3 | 4 | 5 | "3" | "4" | "5";
export type EventKeywordPresetId = "business" | "community" | "tech" | "maker";

export type EventKeywordPresetDefinition = {
  id: EventKeywordPresetId;
  label: string;
  description: string;
  keywords: string[];
};

export const DEFAULT_EVENT_BOARD_SIZE = "4" as const;
export const DEFAULT_EVENT_BINGO_MISSION_COUNT = "3";

const SUPPORTED_BOARD_SIZES = [3, 4, 5] as const;
const DEFAULT_NUMERIC_BOARD_SIZE = Number(DEFAULT_EVENT_BOARD_SIZE) as 4;

const toBoardSize = (boardSize: AdminKeywordBoardSize) => {
  const numericBoardSize = Number(boardSize);
  return SUPPORTED_BOARD_SIZES.includes(numericBoardSize as 3 | 4 | 5)
    ? (numericBoardSize as 3 | 4 | 5)
    : DEFAULT_NUMERIC_BOARD_SIZE;
};

export const BOARD_SIZE_RECOMMENDATIONS: Array<{
  boardSize: "3" | "4" | "5";
  attendeeRange: string;
  keywordCount: number;
  description: string;
}> = [
  {
    boardSize: "3",
    attendeeRange: "30명 이하",
    keywordCount: 9,
    description: "소규모 행사에서 빠르게 완성되는 가벼운 보드입니다.",
  },
  {
    boardSize: "4",
    attendeeRange: "31-100명",
    keywordCount: 16,
    description: "대부분의 네트워킹 행사에 맞는 기본 권장 보드입니다.",
  },
  {
    boardSize: "5",
    attendeeRange: "101명 이상",
    keywordCount: 25,
    description: "참가자가 많고 키워드 풀이 충분할 때 적합합니다.",
  },
];

export const getRecommendedBoardSize = (expectedAttendeeCount?: number | null) => {
  if (!expectedAttendeeCount || expectedAttendeeCount < 1) {
    return DEFAULT_EVENT_BOARD_SIZE;
  }

  if (expectedAttendeeCount <= 30) {
    return "3";
  }

  if (expectedAttendeeCount <= 100) {
    return "4";
  }

  return "5";
};

const EVENT_KEYWORD_PRESETS: EventKeywordPresetDefinition[] = [
  {
    id: "business",
    label: "비즈니스",
    description: "사업, 마케팅, 기획 중심 행사에 맞는 키워드입니다.",
    keywords: [
      "사업개발",
      "영업",
      "마케팅",
      "브랜딩",
      "세일즈",
      "서비스기획",
      "그로스",
      "제휴",
      "시장조사",
      "고객인터뷰",
      "커머스",
      "전환율",
      "유저리서치",
      "콘텐츠전략",
      "광고운영",
      "데이터기반",
      "리드관리",
      "피칭경험",
      "창업관심",
      "B2B",
      "B2C",
      "문제정의",
      "실행력",
      "후속미팅",
      "협업제안",
    ],
  },
  {
    id: "community",
    label: "커뮤니티",
    description: "가볍게 대화하고 연결되는 네트워킹 행사에 어울립니다.",
    keywords: [
      "첫참여",
      "재참여",
      "운영진",
      "커뮤니티",
      "밋업러버",
      "대화편함",
      "소개왕",
      "연결고리",
      "사진교환",
      "후속대화",
      "명함교환",
      "질문잘함",
      "공통점발견",
      "근처주민",
      "커피한잔",
      "스터디관심",
      "행사단골",
      "친구동반",
      "오픈마인드",
      "이야기맛집",
      "취향공유",
      "추천왕",
      "함께성장",
      "새로운인연",
      "응원메시지",
    ],
  },
  {
    id: "tech",
    label: "테크",
    description: "개발, 데이터, AI 중심 기술 행사에 맞는 키워드입니다.",
    keywords: [
      "프론트엔드",
      "백엔드",
      "풀스택",
      "React",
      "TypeScript",
      "Python",
      "SQL",
      "AI",
      "LLM",
      "데이터분석",
      "인프라",
      "DevOps",
      "API설계",
      "테스트코드",
      "오픈소스",
      "자동화",
      "사이드프로젝트",
      "앱개발",
      "웹서비스",
      "클라우드",
      "문제해결",
      "배포경험",
      "기술공유",
      "해커톤",
      "디버깅",
    ],
  },
  {
    id: "maker",
    label: "메이커",
    description: "창작, 실험, 개인 프로젝트 분위기의 행사에 어울립니다.",
    keywords: [
      "메이커",
      "1인빌더",
      "사이드프로젝트",
      "프로토타입",
      "실험정신",
      "MVP",
      "노코드",
      "디자인",
      "콘텐츠제작",
      "브랜딩",
      "피드백환영",
      "아이디어메모",
      "런칭경험",
      "포트폴리오",
      "사용자관찰",
      "문제발견",
      "빠른실행",
      "개인프로젝트",
      "협업모집",
      "취미개발",
      "창작루틴",
      "도구탐험",
      "작게시작",
      "완성집착",
      "실전공유",
    ],
  },
];

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

export const getEventKeywordPresetDefinitions = () => {
  return EVENT_KEYWORD_PRESETS;
};

export const buildEventKeywordPresetKeywords = (
  presetId: EventKeywordPresetId,
  boardSize: AdminKeywordBoardSize
) => {
  const preset = EVENT_KEYWORD_PRESETS.find((item) => item.id === presetId);
  if (!preset) {
    return buildBoardKeywordPool([], getKeywordGoalCount(boardSize));
  }

  return buildBoardKeywordPool(preset.keywords, getKeywordGoalCount(boardSize));
};
