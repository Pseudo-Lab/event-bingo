import { humanizeEventSlug } from "../config/eventProfiles";

export const SITE_ORIGIN = "https://bingo.pseudolab-devfactory.com";
export const SITE_NAME = "Bingo Networking";

export type SeoMeta = {
  title: string;
  description: string;
  robots?: string;
};

const DEFAULT_META: SeoMeta = {
  title: "Bingo Networking | DevFactory",
  description:
    "Bingo Networking은 행사 참가자가 키워드를 교환하며 자연스럽게 연결되는 DevFactory 이벤트 빙고 서비스입니다.",
  robots: "index, follow",
};

const PAGE_META: Record<string, SeoMeta> = {
  "/": DEFAULT_META,
  "/experience": {
    title: "Bingo Networking 서비스 소개 | DevFactory",
    description:
      "행사 참가자 연결, 키워드 교환, 빙고 보드, 운영 리포트까지 이어지는 Bingo Networking 서비스 흐름을 소개합니다.",
  },
  "/bingo": {
    title: "Bingo Networking 서비스 소개 | DevFactory",
    description:
      "행사 참가자 연결, 키워드 교환, 빙고 보드, 운영 리포트까지 이어지는 Bingo Networking 서비스 흐름을 소개합니다.",
  },
  "/demo/play": {
    title: "Bingo Networking 데모 | DevFactory",
    description:
      "키워드 선택, 참가자 검색, 빙고 보드 완성 흐름을 직접 체험해 보는 Bingo Networking 데모입니다.",
  },
  "/demo/play/game": {
    title: "Bingo Networking 데모 게임 | DevFactory",
    description:
      "선택한 키워드로 참가자 검색과 빙고 완성 흐름을 확인하는 Bingo Networking 데모 게임 화면입니다.",
    robots: "noindex, follow",
  },
  "/privacy": {
    title: "Bingo Networking 개인정보처리방침 | DevFactory",
    description:
      "DevFactory 서비스 운영팀이 Bingo Networking 운영을 위해 처리하는 개인정보 기준을 안내합니다.",
  },
  "/terms": {
    title: "Bingo Networking 이용약관 | DevFactory",
    description:
      "Bingo Networking 서비스 이용 기준과 사용자 책임 범위를 안내합니다.",
  },
};

export const normalizeSeoPathname = (pathname: string) =>
  pathname.replace(/\/$/, "") || "/";

const parsePublicEventPath = (pathname: string) => {
  const match = pathname.match(/^\/event\/([^/]+)(?:\/(privacy|bingo))?$/);
  if (!match) {
    return null;
  }

  const [, eventSlug, section] = match;
  return {
    eventSlug: decodeURIComponent(eventSlug),
    section,
  };
};

export const getSeoMetaForPath = (pathname: string): SeoMeta => {
  const normalizedPathname = normalizeSeoPathname(pathname);
  const fixedMeta = PAGE_META[normalizedPathname];
  if (fixedMeta) {
    return fixedMeta;
  }

  const eventPath = parsePublicEventPath(normalizedPathname);
  if (eventPath) {
    const eventName = humanizeEventSlug(eventPath.eventSlug);

    if (eventPath.section === "privacy") {
      return {
        title: `${eventName} 개인정보 처리 안내 | Bingo Networking`,
        description:
          "행사 참가자가 확인해야 하는 개인정보 처리 안내와 운영팀 문의 정보를 제공합니다.",
        robots: "noindex, follow",
      };
    }

    if (eventPath.section === "bingo") {
      return {
        title: `${eventName} 빙고 참여 | Bingo Networking`,
        description:
          "행사 참가자가 키워드를 교환하고 빙고 보드를 완성하는 Bingo Networking 참여 화면입니다.",
        robots: "noindex, follow",
      };
    }

    return {
      title: `${eventName} | Bingo Networking`,
      description:
        "행사 참가자가 키워드 교환과 빙고 보드로 자연스럽게 대화하고 연결되는 공개 행사 페이지입니다.",
    };
  }

  return {
    ...DEFAULT_META,
    robots: "noindex, nofollow",
  };
};

export const isIndexedSeoPath = (pathname: string) => {
  const normalizedPathname = normalizeSeoPathname(pathname);
  const meta = getSeoMetaForPath(normalizedPathname);

  return !meta.robots?.includes("noindex");
};
