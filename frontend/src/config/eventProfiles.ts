import {
  DEFAULT_BINGO_MISSION_COUNT,
  DEFAULT_BOARD_SIZE,
  DEFAULT_EXCHANGE_KEYWORD_COUNT,
  buildBoardKeywordPool,
} from "./bingoConfig";
import { bingoKeywords } from "./bingoKeywords";

export type BoardSize = 3 | 4 | 5;

export type EventProfile = {
  slug: string;
  title: string;
  subTitle: string;
  startAt: string;
  endAt: string;
  place: string;
  eventTeam: string;
  boardSize: BoardSize;
  exchangeKeywordCount: number;
  bingoMissionCount: number;
  restrictBeforeStart: boolean;
  englishSupportEnabled: boolean;
  keywords: string[];
  keywordTranslations: Record<string, string>;
};

type EventProfileOverrides = Partial<Omit<EventProfile, "slug">>;

const STORAGE_KEY = "event-bingo.event-profiles.v1";

const DEFAULT_EVENT_PROFILE: EventProfile = {
  slug: "bingo-networking",
  title: "빙고 네트워킹",
  subTitle: "Bingo Networking Day",
  startAt: "2026-05-17T15:00:00+09:00",
  endAt: "2026-05-17T18:00:00+09:00",
  place: "서울 컨벤션 센터",
  eventTeam: "행사 운영팀",
  boardSize: DEFAULT_BOARD_SIZE as BoardSize,
  exchangeKeywordCount: DEFAULT_EXCHANGE_KEYWORD_COUNT,
  bingoMissionCount: DEFAULT_BINGO_MISSION_COUNT,
  restrictBeforeStart: true,
  englishSupportEnabled: false,
  keywords: [...bingoKeywords],
  keywordTranslations: {},
};

const hasWindow = () => typeof window !== "undefined";

const slugifyEventValue = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

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

const SUPPORTED_BOARD_SIZES = [3, 4, 5] as const;

const toBoardSize = (value: unknown, fallback: BoardSize): BoardSize => {
  const numericValue = Number(value);
  return SUPPORTED_BOARD_SIZES.includes(numericValue as BoardSize)
    ? (numericValue as BoardSize)
    : fallback;
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
  const normalizedValue = slugifyEventValue(value ?? "");

  return normalizedValue || DEFAULT_EVENT_PROFILE.slug;
};

export const normalizeRequestedEventSlug = (value?: string | null) => {
  const normalizedValue = (value ?? "").trim().toLowerCase();
  return normalizedValue.length > 0 ? normalizedValue : null;
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
    eventTeam: "Event Team",
    keywords: [...DEFAULT_EVENT_PROFILE.keywords],
  };
};

export const resolvePublicEventFallbackProfile = (eventSlug?: string | null): EventProfile => {
  const requestedSlug = normalizeRequestedEventSlug(eventSlug);
  const normalizedSlug =
    requestedSlug === null
      ? DEFAULT_EVENT_PROFILE.slug
      : slugifyEventValue(requestedSlug) || "unknown-event";

  return buildFallbackEventProfile(normalizedSlug);
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
  const legacySource = source as Record<string, unknown>;

  return {
    slug: eventSlug,
    title: trimText(source.title, fallbackProfile.title),
    subTitle: trimText(source.subTitle, fallbackProfile.subTitle),
    startAt: trimText(source.startAt, fallbackProfile.startAt),
    endAt: trimText(legacySource.endAt, fallbackProfile.endAt),
    place: trimText(source.place, fallbackProfile.place),
    eventTeam: trimText(
      legacySource.eventTeam ?? legacySource.host,
      fallbackProfile.eventTeam
    ),
    boardSize,
    exchangeKeywordCount,
    bingoMissionCount,
    restrictBeforeStart:
      typeof legacySource.restrictBeforeStart === "boolean"
        ? legacySource.restrictBeforeStart
        : fallbackProfile.restrictBeforeStart,
    englishSupportEnabled:
      typeof legacySource.englishSupportEnabled === "boolean"
        ? legacySource.englishSupportEnabled
        : fallbackProfile.englishSupportEnabled,
    keywords: buildBoardKeywordPool(sourceKeywords, boardCellCount),
    keywordTranslations:
      typeof legacySource.keywordTranslations === "object" &&
      legacySource.keywordTranslations !== null
        ? (legacySource.keywordTranslations as Record<string, string>)
        : fallbackProfile.keywordTranslations,
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

export const formatEventDateLabel = (startAt: string, locale = "ko-KR") => {
  try {
    return new Intl.DateTimeFormat(locale, {
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
  return `/event/${normalizeEventSlug(eventSlug)}`;
};

export const getEventPrivacyPath = (eventSlug?: string | null) => {
  return `${getEventHomePath(eventSlug)}/privacy`;
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

  const [firstSegment, secondSegment] = segments;
  if (firstSegment === "event") {
    return secondSegment ? normalizeEventSlug(secondSegment) : DEFAULT_EVENT_PROFILE.slug;
  }

  if (firstSegment === "bingo" || firstSegment === "experience" || firstSegment === "admin") {
    return DEFAULT_EVENT_PROFILE.slug;
  }

  return normalizeEventSlug(firstSegment);
};
