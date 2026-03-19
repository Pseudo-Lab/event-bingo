import {
  DEFAULT_BINGO_MISSION_COUNT,
  DEFAULT_BOARD_SIZE,
  DEFAULT_EXCHANGE_KEYWORD_COUNT,
  buildBoardKeywordPool,
} from "./bingoConfig";
import { bingoKeywords } from "./bingoKeywords";

export type BoardSize = 3 | 5;

export type EventProfile = {
  slug: string;
  title: string;
  subTitle: string;
  startAt: string;
  place: string;
  host: string;
  boardSize: BoardSize;
  exchangeKeywordCount: number;
  bingoMissionCount: number;
  keywords: string[];
};

type EventProfileOverrides = Partial<Omit<EventProfile, "slug">>;

const STORAGE_KEY = "event-bingo.event-profiles.v1";

const DEFAULT_EVENT_PROFILE: EventProfile = {
  slug: "bingo-networking",
  title: "빙고 네트워킹",
  subTitle: "가짜연구소 2026\nBingo Networking Day",
  startAt: "2026-05-17T15:00:00+09:00",
  place: "서울 컨벤션 센터",
  host: "PseudoLab",
  boardSize: DEFAULT_BOARD_SIZE as BoardSize,
  exchangeKeywordCount: DEFAULT_EXCHANGE_KEYWORD_COUNT,
  bingoMissionCount: DEFAULT_BINGO_MISSION_COUNT,
  keywords: [...bingoKeywords],
};

const hasWindow = () => typeof window !== "undefined";

const trimText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallback;
};

const toPositiveInteger = (value: unknown, fallback: number) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.round(numericValue);
};

const toBoardSize = (value: unknown, fallback: BoardSize): BoardSize => {
  return Number(value) === 3 ? 3 : fallback === 3 ? 3 : 5;
};

const readOverrides = (): Record<string, EventProfileOverrides> => {
  if (!hasWindow()) {
    return {};
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    return typeof parsedValue === "object" && parsedValue !== null
      ? (parsedValue as Record<string, EventProfileOverrides>)
      : {};
  } catch (error) {
    console.warn("Failed to parse event profile overrides. Resetting local data.", error);
    window.localStorage.removeItem(STORAGE_KEY);
    return {};
  }
};

const writeOverrides = (overrides: Record<string, EventProfileOverrides>) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
};

export const getDefaultEventSlug = () => DEFAULT_EVENT_PROFILE.slug;

export const normalizeEventSlug = (value?: string | null) => {
  const normalizedValue = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedValue || DEFAULT_EVENT_PROFILE.slug;
};

export const humanizeEventSlug = (value?: string | null) => {
  return normalizeEventSlug(value)
    .split("-")
    .filter(Boolean)
    .map((segment) => {
      if (/^\d+$/.test(segment)) {
        return segment;
      }

      return `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`;
    })
    .join(" ");
};

const buildFallbackEventProfile = (eventSlug: string): EventProfile => {
  const eventLabel = humanizeEventSlug(eventSlug);

  return {
    ...DEFAULT_EVENT_PROFILE,
    slug: eventSlug,
    subTitle: `${eventLabel}\nNetworking Event`,
    place: "행사 장소",
    host: "Event Team",
    keywords: [...DEFAULT_EVENT_PROFILE.keywords],
  };
};

const sanitizeEventProfile = (eventSlug: string, source: EventProfileOverrides): EventProfile => {
  const fallbackProfile =
    eventSlug === DEFAULT_EVENT_PROFILE.slug
      ? DEFAULT_EVENT_PROFILE
      : buildFallbackEventProfile(eventSlug);

  const boardSize = toBoardSize(source.boardSize, fallbackProfile.boardSize);
  const boardCellCount = boardSize * boardSize;
  const exchangeKeywordCount = Math.min(
    boardCellCount,
    toPositiveInteger(source.exchangeKeywordCount, fallbackProfile.exchangeKeywordCount)
  );
  const bingoMissionCount = Math.min(
    boardSize,
    toPositiveInteger(source.bingoMissionCount, fallbackProfile.bingoMissionCount)
  );
  const sourceKeywords = Array.isArray(source.keywords)
    ? source.keywords.filter((keyword): keyword is string => typeof keyword === "string")
    : fallbackProfile.keywords;

  return {
    slug: eventSlug,
    title: trimText(source.title, fallbackProfile.title),
    subTitle: trimText(source.subTitle, fallbackProfile.subTitle),
    startAt: trimText(source.startAt, fallbackProfile.startAt),
    place: trimText(source.place, fallbackProfile.place),
    host: trimText(source.host, fallbackProfile.host),
    boardSize,
    exchangeKeywordCount,
    bingoMissionCount,
    keywords: buildBoardKeywordPool(sourceKeywords, boardCellCount),
  };
};

export const resolveEventProfile = (eventSlug?: string | null): EventProfile => {
  const normalizedSlug = normalizeEventSlug(eventSlug);
  const overrides = readOverrides()[normalizedSlug] ?? {};
  return sanitizeEventProfile(normalizedSlug, overrides);
};

export const updateEventProfileSettings = (
  eventSlug: string,
  updates: EventProfileOverrides
) => {
  const normalizedSlug = normalizeEventSlug(eventSlug);
  const overrides = readOverrides();

  overrides[normalizedSlug] = {
    ...(overrides[normalizedSlug] ?? {}),
    ...updates,
  };

  writeOverrides(overrides);
  return resolveEventProfile(normalizedSlug);
};

export const renameEventProfileSettings = (
  previousSlug: string,
  nextSlug: string,
  updates: EventProfileOverrides
) => {
  const normalizedPreviousSlug = normalizeEventSlug(previousSlug);
  const normalizedNextSlug = normalizeEventSlug(nextSlug);
  const overrides = readOverrides();
  const previousOverrides = overrides[normalizedPreviousSlug] ?? {};

  overrides[normalizedNextSlug] = {
    ...previousOverrides,
    ...updates,
  };

  if (normalizedPreviousSlug !== normalizedNextSlug) {
    delete overrides[normalizedPreviousSlug];
  }

  writeOverrides(overrides);
  return resolveEventProfile(normalizedNextSlug);
};

export const formatEventDateLabel = (startAt: string) => {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(startAt));
  } catch {
    return startAt;
  }
};

export const getEventHomePath = (eventSlug?: string | null) => {
  return `/${normalizeEventSlug(eventSlug)}`;
};

export const getEventBingoPath = (eventSlug?: string | null) => {
  return `${getEventHomePath(eventSlug)}/bingo`;
};

export const getAdminPath = (
  eventSlugOrSection?:
    | string
    | "dashboard"
    | "members"
    | "applications"
    | "event-settings"
    | "policies"
    | null,
  section?: "dashboard" | "members" | "applications" | "event-settings" | "policies"
) => {
  const resolvedSection =
    section ??
    (eventSlugOrSection === "dashboard" ||
    eventSlugOrSection === "members" ||
    eventSlugOrSection === "applications" ||
    eventSlugOrSection === "event-settings" ||
    eventSlugOrSection === "policies"
      ? eventSlugOrSection
      : undefined);
  const basePath = "/admin";

  if (!resolvedSection) {
    return basePath;
  }

  if (resolvedSection === "event-settings") {
    return `${basePath}/events`;
  }

  return `${basePath}/${resolvedSection}`;
};

export const withSearch = (pathname: string, search: string) => {
  if (!search) {
    return pathname;
  }

  return `${pathname}${search.startsWith("?") ? search : `?${search}`}`;
};

export const getActiveEventSlugFromLocation = (pathname?: string | null) => {
  if (!pathname) {
    return DEFAULT_EVENT_PROFILE.slug;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return DEFAULT_EVENT_PROFILE.slug;
  }

  const [firstSegment] = segments;
  if (firstSegment === "bingo" || firstSegment === "experience" || firstSegment === "admin") {
    return DEFAULT_EVENT_PROFILE.slug;
  }

  return normalizeEventSlug(firstSegment);
};
