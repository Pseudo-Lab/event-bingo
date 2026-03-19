import type { EventProfile } from "../config/eventProfiles";
import { normalizeEventSlug, resolveEventProfile } from "../config/eventProfiles";
import { buildBoardKeywordPool } from "../config/bingoConfig";

type ApiResponseBase = {
  ok: boolean;
  message: string;
};

type PublicEventPayload = {
  id: number;
  slug: string;
  name: string;
  start_at: string;
  board_size: 3 | 5;
  bingo_mission_count: number;
  keywords: string[];
  publish_state: "draft" | "published" | "archived";
};

type PublicEventResponse = ApiResponseBase & {
  event?: PublicEventPayload | null;
};

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ?? "";

const createApiUrl = (path: string) => {
  const baseUrl =
    API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost");
  return new URL(path, baseUrl).toString();
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { detail?: string; message?: string };
    if (typeof payload.detail === "string" && payload.detail.length > 0) {
      return payload.detail;
    }
    if (typeof payload.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  } catch {
    // ignore
  }

  return `API request failed (${response.status})`;
};

const requestJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(createApiUrl(path));
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
};

const mergeEventProfile = (
  fallbackProfile: EventProfile,
  payload: PublicEventPayload
): EventProfile => {
  const boardSize = payload.board_size === 3 ? 3 : 5;
  const boardCellCount = boardSize * boardSize;

  return {
    ...fallbackProfile,
    slug: payload.slug,
    subTitle: payload.name,
    startAt: payload.start_at,
    boardSize,
    bingoMissionCount: payload.bingo_mission_count,
    keywords: buildBoardKeywordPool(payload.keywords ?? fallbackProfile.keywords, boardCellCount),
  };
};

export const getPublicEventProfile = async (eventSlug?: string | null): Promise<EventProfile> => {
  const normalizedSlug = normalizeEventSlug(eventSlug);
  const fallbackProfile = resolveEventProfile(normalizedSlug);
  const payload = await requestJson<PublicEventResponse>(`/api/events/${normalizedSlug}`);

  if (!payload.event) {
    throw new Error("공개 이벤트 설정을 받지 못했습니다.");
  }

  return mergeEventProfile(fallbackProfile, payload.event);
};
