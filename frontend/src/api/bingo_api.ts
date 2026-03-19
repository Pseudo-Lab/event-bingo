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

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ?? "";
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

const withJsonHeaders = (init: RequestInit = {}) => {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
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
  const response = await fetch(createApiUrl(path, params), withJsonHeaders(init));

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

export const registerBingoUser = async (userName: string, password: string) => {
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
      }),
    }
  );
};

export const loginBingoUser = async (loginId: string, password: string) => {
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
      }),
    }
  );
};

export const createBingoBoard = async (
  userId: string,
  boardData: {
    [key: string]: { value: string; status: number; selected: number };
  }
) => {
  if (shouldUseMockApi()) {
    return mockCreateBingoBoard(userId, boardData);
  }

  const data = await requestJson<BingoBoardResponse>("/api/bingo/boards", {
    method: "POST",
    body: JSON.stringify({ board_data: boardData, user_id: Number(userId) }),
  });

  return data.ok;
};

export const getBingoBoard = async (userId: string) => {
  if (shouldUseMockApi()) {
    return mockGetBingoBoard(userId);
  }

  const data = await requestJson<BingoBoardResponse>(
    `/api/bingo/boards/${userId}`
  );

  if (!data.ok) {
    return [];
  }

  return toBoardItems(data.board_data);
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
