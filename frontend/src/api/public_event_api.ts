import type { EventProfile } from "../config/eventProfiles";
import {
  normalizeRequestedEventSlug,
  resolveEventProfile,
} from "../config/eventProfiles";
import { buildBoardKeywordPool } from "../config/bingoConfig";
import { getApiBaseUrl } from "../lib/apiBase";

type ApiResponseBase = {
  ok: boolean;
  message: string;
};

export type PublicLandingEvent = {
  id: number;
  slug: string;
  name: string;
  startAt: string;
  boardSize: 3 | 4 | 5;
  bingoMissionCount: number;
  status: "scheduled" | "in_progress" | "ended";
};

export type EventManagerApplicationInput = {
  name: string;
  email: string;
  organization?: string;
  eventName: string;
  eventPurpose: string;
  expectedEventDate?: string;
  expectedAttendeeCount?: number;
  notes?: string;
};

type PublicEventPayload = {
  id: number;
  slug: string;
  name: string;
  location: string;
  event_team: string;
  start_at: string;
  end_at: string;
  board_size: 3 | 4 | 5;
  bingo_mission_count: number;
  restrict_before_start?: boolean | null;
  english_support_enabled?: boolean | null;
  keywords: string[];
  keyword_translations?: Record<string, string> | null;
};

type PublicEventResponse = ApiResponseBase & {
  event?: PublicEventPayload | null;
};

type PublicPolicyTemplateResponse = ApiResponseBase & {
  template?: {
    content: string;
    updated_at: string;
  } | null;
};

export type PublicPolicyTemplate = {
  content: string;
  updatedAt: string;
};

type PublicEventPrivacyNoticeResponse = ApiResponseBase & {
  template?: {
    event_slug: string;
    event_name: string;
    event_team: string;
    contact_email: string;
    content: string;
    updated_at: string;
  } | null;
};

export type PublicEventPrivacyNotice = {
  eventSlug: string;
  eventName: string;
  eventTeam: string;
  contactEmail: string;
  content: string;
  updatedAt: string;
};

type PublicEventListPayload = ApiResponseBase & {
  events?: Array<{
    id: number;
    slug: string;
    name: string;
    start_at: string;
    board_size: 3 | 4 | 5;
    bingo_mission_count: number;
    status: "scheduled" | "in_progress" | "ended";
  }> | null;
};

type EventManagerApplicationResponse = ApiResponseBase & {
  request?: {
    id: number;
    status: "pending" | "approved" | "rejected";
    created_at: string;
  } | null;
};

const API_URL = getApiBaseUrl();

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const isApiRequestError = (error: unknown): error is ApiRequestError => {
  return error instanceof ApiRequestError;
};

export const isNotFoundApiError = (error: unknown) => {
  return isApiRequestError(error) && error.status === 404;
};

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

const toApiRequestError = async (response: Response) => {
  return new ApiRequestError(await readErrorMessage(response), response.status);
};

const requestJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(createApiUrl(path));
  if (!response.ok) {
    throw await toApiRequestError(response);
  }

  return response.json() as Promise<T>;
};

const requestJsonWithInit = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(createApiUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw await toApiRequestError(response);
  }

  return response.json() as Promise<T>;
};

const mergeEventProfile = (
  fallbackProfile: EventProfile,
  payload: PublicEventPayload
): EventProfile => {
  const boardSize = [3, 4, 5].includes(payload.board_size) ? payload.board_size : 5;
  const boardCellCount = boardSize * boardSize;

  return {
    ...fallbackProfile,
    slug: payload.slug,
    subTitle: payload.name,
    startAt: payload.start_at,
    endAt: payload.end_at,
    place: payload.location || fallbackProfile.place,
    eventTeam: payload.event_team || fallbackProfile.eventTeam,
    boardSize,
    bingoMissionCount: payload.bingo_mission_count,
    restrictBeforeStart: payload.restrict_before_start ?? true,
    englishSupportEnabled: payload.english_support_enabled ?? false,
    keywords: buildBoardKeywordPool(payload.keywords ?? fallbackProfile.keywords, boardCellCount),
    keywordTranslations: payload.keyword_translations ?? {},
  };
};

export const getPublicEventProfile = async (eventSlug?: string | null): Promise<EventProfile> => {
  const normalizedSlug = normalizeRequestedEventSlug(eventSlug);
  if (!normalizedSlug) {
    throw new ApiRequestError("이벤트를 찾을 수 없습니다.", 404);
  }

  const fallbackProfile = resolveEventProfile(normalizedSlug);
  const payload = await requestJson<PublicEventResponse>(
    `/api/events/${encodeURIComponent(normalizedSlug)}`
  );

  if (!payload.event) {
    throw new Error("공개 이벤트 설정을 받지 못했습니다.");
  }

  return mergeEventProfile(fallbackProfile, payload.event);
};

export const getPublicEventCatalog = async (): Promise<PublicLandingEvent[]> => {
  const payload = await requestJson<PublicEventListPayload>("/api/events");

  return (payload.events ?? []).map((eventItem) => ({
    id: eventItem.id,
    slug: eventItem.slug,
    name: eventItem.name,
    startAt: eventItem.start_at,
    boardSize: eventItem.board_size,
    bingoMissionCount: eventItem.bingo_mission_count,
    status: eventItem.status,
  }));
};

export const getPublicPolicyTemplateRecord = async (): Promise<PublicPolicyTemplate> => {
  const payload = await requestJsonWithInit<PublicPolicyTemplateResponse>(
    "/api/events/privacy-template",
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!payload.template?.content) {
    throw new Error("개인정보 처리 안내 템플릿을 받지 못했습니다.");
  }

  return {
    content: payload.template.content,
    updatedAt: payload.template.updated_at,
  };
};

export const getPublicPlatformPolicyTemplateRecord = getPublicPolicyTemplateRecord;

export const getPublicPolicyTemplate = async (): Promise<string> => {
  const template = await getPublicPolicyTemplateRecord();
  return template.content;
};

export const getPublicConsentTemplate = getPublicPolicyTemplate;

export const getPublicEventPrivacyNoticeRecord = async (
  eventSlug: string
): Promise<PublicEventPrivacyNotice> => {
  const payload = await requestJsonWithInit<PublicEventPrivacyNoticeResponse>(
    `/api/events/${encodeURIComponent(eventSlug)}/privacy-notice-template`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!payload.template?.content) {
    throw new Error("행사 참가자 개인정보 처리 안내를 받지 못했습니다.");
  }

  return {
    eventSlug: payload.template.event_slug,
    eventName: payload.template.event_name,
    eventTeam: payload.template.event_team,
    contactEmail: payload.template.contact_email,
    content: payload.template.content,
    updatedAt: payload.template.updated_at,
  };
};

export const submitEventManagerApplication = async (
  input: EventManagerApplicationInput
) => {
  return requestJsonWithInit<EventManagerApplicationResponse>("/api/events/manager-requests", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      organization: input.organization?.trim() || undefined,
      event_name: input.eventName.trim(),
      event_purpose: input.eventPurpose.trim(),
      expected_event_date: input.expectedEventDate || undefined,
      expected_attendee_count: input.expectedAttendeeCount || undefined,
      notes: input.notes?.trim() || undefined,
    }),
  });
};
