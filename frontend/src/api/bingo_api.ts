import {
  mockClearMode,
  mockCreateBingoBoard,
  mockCreateUserBingoInteraction,
  mockGetBingoBoard,
  mockGetOrCreateTesterUsers,
  mockGetUserAllInteraction,
  mockIsModeEnabled,
  mockLoginBingoUser,
  mockLoginWithTester,
  mockRegisterBingoUser,
  mockResetState,
} from "./mockBingoApi";
import type { MockTesterUser } from "./mockBingoApi";
import { getApiBaseUrl } from "../lib/apiBase";
import { maybeGetSupabaseClient } from "../lib/supabaseClient";

type ApiResponseBase = {
  ok: boolean;
  message: string;
};

type BingoUserResponse = ApiResponseBase & {
  user_id?: number | null;
  login_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  privacy_agreed?: boolean | null;
};

type BingoBoardCell = {
  value: string;
  status: number;
  selected: number;
  interaction_id?: number;
};

type BingoBoardResponse = ApiResponseBase & {
  user_id?: number | null;
  display_name?: string | null;
  board_data?: Record<string, BingoBoardCell> | null;
  bingo_count?: number | null;
  user_interaction_count?: number | null;
};

export type BingoInteractionRecord = {
  interaction_id?: number;
  word_id_list: string;
  send_user_id: number;
  receive_user_id: number;
  send_user_name?: string;
  receive_user_name?: string;
  created_at: string;
};

type BingoInteractionResponse = ApiResponseBase & {
  interaction_id?: number | null;
  word_id_list?: string | null;
  send_user_id?: number | null;
  receive_user_id?: number | null;
  updated_words?: string[] | null;
  bingo_count?: number | null;
  send_user_name?: string | null;
  receive_user_name?: string | null;
  created_at?: string | null;
};

type BingoExchangeResult = {
  ok: true;
  message: string;
  interaction: BingoInteractionRecord;
  updatedWords: string[];
  bingoCount?: number;
};

type BingoExchangeFailure = {
  ok: false;
  message: string;
};

const API_URL = getApiBaseUrl();
const hasApiUrl = API_URL.length > 0;
const shouldUseMockApi = () => !hasApiUrl || mockIsModeEnabled();

const createApiUrl = (
  path: string,
  params?: Record<string, string | number>
) => {
  const baseUrl =
    API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const getSupabaseAccessToken = async (): Promise<string | null> => {
  const client = maybeGetSupabaseClient();
  if (!client) return null;

  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
};

const withJsonHeaders = async (init: RequestInit = {}) => {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Authorization")) {
    const token = await getSupabaseAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return {
    ...init,
    headers,
  };
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as {
      detail?: string;
      message?: string;
    };

    if (typeof payload.detail === "string" && payload.detail.length > 0) {
      return payload.detail;
    }

    if (typeof payload.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  } catch {
    // Ignore JSON parsing failures and use the fallback message below.
  }

  return `API request failed (${response.status})`;
};

const requestJson = async <T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string | number>
): Promise<T> => {
  const response = await fetch(createApiUrl(path, params), await withJsonHeaders(init));

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
};

const toBoardItems = (boardData?: Record<string, BingoBoardCell> | null) => {
  if (!boardData) {
    return [];
  }

  return Object.keys(boardData)
    .sort((left, right) => Number(left) - Number(right))
    .map((key) => ({
      ...boardData[key],
      id: Number(key),
    }));
};

const toInteractionRecord = (
  interaction: BingoInteractionResponse
): BingoInteractionRecord | null => {
  if (
    typeof interaction.word_id_list !== "string" ||
    typeof interaction.send_user_id !== "number" ||
    typeof interaction.receive_user_id !== "number" ||
    typeof interaction.created_at !== "string"
  ) {
    return null;
  }

  return {
    interaction_id: interaction.interaction_id ?? undefined,
    word_id_list: interaction.word_id_list,
    send_user_id: interaction.send_user_id,
    receive_user_id: interaction.receive_user_id,
    send_user_name: interaction.send_user_name ?? undefined,
    receive_user_name: interaction.receive_user_name ?? undefined,
    created_at: interaction.created_at,
  };
};

const toInteractionRecords = (interactions: BingoInteractionResponse[]) => {
  return interactions.flatMap((interaction): BingoInteractionRecord[] => {
    const parsedInteraction = toInteractionRecord(interaction);
    return parsedInteraction ? [parsedInteraction] : [];
  });
};

export type { MockTesterUser };

export const getLocalMockTesterUsers = async (): Promise<MockTesterUser[]> => {
  return mockGetOrCreateTesterUsers();
};

export const loginWithLocalMockTester = async (accessCode: string, userName: string) => {
  return mockLoginWithTester(accessCode, userName);
};

export const clearLocalMockMode = () => {
  mockClearMode();
};

export const resetLocalMockTesterData = () => {
  mockResetState();
};

export const registerBingoUser = async (
  userName: string,
  password: string,
  eventSlug?: string
) => {
  if (shouldUseMockApi()) {
    return mockRegisterBingoUser(userName, password);
  }

  return requestJson<BingoUserResponse>(
    "/api/auth/bingo/register",
    {
      method: "POST",
      body: JSON.stringify({
        username: userName,
        password,
        event_slug: eventSlug,
      }),
    }
  );
};

export const loginBingoUser = async (
  loginId: string,
  password: string,
  eventSlug?: string
) => {
  if (shouldUseMockApi()) {
    return mockLoginBingoUser(loginId, password);
  }

  return requestJson<BingoUserResponse>(
    "/api/auth/bingo/login",
    {
      method: "POST",
      body: JSON.stringify({
        login_id: loginId,
        password,
        event_slug: eventSlug,
      }),
    }
  );
};

export const createBingoBoard = async (
  userId: string,
  boardData: {
    [key: string]: { value: string; status: number; selected: number };
  },
  eventSlug?: string,
  displayName?: string
) => {
  if (shouldUseMockApi()) {
    const ok = await mockCreateBingoBoard(userId, boardData);
    return { ok, displayName };
  }

  const data = await requestJson<BingoBoardResponse>("/api/bingo/boards", {
    method: "POST",
    body: JSON.stringify({
      board_data: boardData,
      user_id: Number(userId),
      event_slug: eventSlug,
      display_name: displayName,
    }),
  });

  return { ok: data.ok, displayName: data.display_name ?? displayName };
};

export const getBingoBoard = async (userId: string) => {
  if (shouldUseMockApi()) {
    return { board: await mockGetBingoBoard(userId), displayName: undefined };
  }

  const data = await requestJson<BingoBoardResponse>(
    `/api/bingo/boards/${userId}`
  );

  if (!data.ok) {
    return { board: [], displayName: undefined };
  }

  return { board: toBoardItems(data.board_data), displayName: data.display_name ?? undefined };
};

export const createUserBingoInteraction = async (
  word_id_list: string,
  send_user_id: number,
  receive_user_id: number
) => {
  const data = shouldUseMockApi()
    ? await mockCreateUserBingoInteraction(
        word_id_list,
        send_user_id,
        receive_user_id
      )
    : await requestJson<BingoInteractionResponse>("/api/bingo/interactions", {
        method: "POST",
        body: JSON.stringify({ word_id_list, send_user_id, receive_user_id }),
      });

  if (!data.ok) {
    return {
      ok: false,
      message: data.message,
    } satisfies BingoExchangeFailure;
  }

  const interaction = toInteractionRecord(data);
  if (!interaction) {
    return {
      ok: false,
      message: "키워드 기록 응답을 해석하지 못했습니다.",
    } satisfies BingoExchangeFailure;
  }

  return {
    ok: true,
    message: data.message,
    interaction,
    updatedWords: data.updated_words ?? [],
    bingoCount:
      typeof data.bingo_count === "number" ? data.bingo_count : undefined,
  } satisfies BingoExchangeResult;
};

export const getUserLatestInteraction = async (
  userId: string,
  limit: number = 0
) => {
  const data = await requestJson<BingoInteractionResponse[] | ApiResponseBase>(
    `/api/bingo/interactions/${userId}`,
    { method: "GET" },
    { limit }
  );

  return Array.isArray(data) ? toInteractionRecords(data) : [];
};

export const getUserAllInteraction = async (
  userId: string,
  afterInteractionId?: number
) => {
  const data = shouldUseMockApi()
    ? await mockGetUserAllInteraction(userId, afterInteractionId)
    : await requestJson<
        ApiResponseBase & { interactions?: BingoInteractionResponse[] | null }
      >(
        `/api/bingo/interactions/${userId}/all`,
        { method: "GET" },
        typeof afterInteractionId === "number"
          ? { after_interaction_id: afterInteractionId }
          : undefined
      );

  if (!data.ok) {
    return {
      ...data,
      interactions: [],
    };
  }

  return {
    ...data,
    interactions: toInteractionRecords(data.interactions ?? []),
  };
};

export type BingoParticipantItem = {
  user_id: number;
  display_name: string;
};

export const searchBingoParticipants = async (query: string, eventSlug: string) => {
  if (shouldUseMockApi()) {
    return [];
  }

  const data = await requestJson<
    ApiResponseBase & { participants?: BingoParticipantItem[] }
  >("/api/auth/bingo/search", { method: "GET" }, { q: query, event_slug: eventSlug });

  return data.participants ?? [];
};

export const updateBingoDisplayName = async (userId: string, eventSlug: string, displayName: string) => {
  if (shouldUseMockApi()) {
    return { ok: true, message: "", display_name: displayName };
  }

  return requestJson<ApiResponseBase & { display_name?: string }>(
    "/api/auth/bingo/display-name",
    {
      method: "PUT",
      body: JSON.stringify({
        user_id: Number(userId),
        event_slug: eventSlug,
        display_name: displayName,
      }),
    }
  );
};
