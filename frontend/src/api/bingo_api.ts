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

type UserSelectedWordsResponse = ApiResponseBase & {
  selected_words?: string[] | null;
};

type UpdateBingoStatusResponse = ApiResponseBase & {
  send_user_id?: number | null;
  receive_user_id?: number | null;
  updated_words?: string[] | null;
  bingo_count?: number | null;
};

type ReviewResponse = ApiResponseBase & {
  user_id?: number | null;
  rating?: number | null;
  review?: string | null;
};

export type BingoInteractionRecord = {
  interaction_id?: number;
  word_id_list: string;
  send_user_id: number;
  receive_user_id: number;
  created_at: string;
};

type BingoInteractionResponse = ApiResponseBase & {
  interaction_id?: number | null;
  word_id_list?: string | null;
  send_user_id?: number | null;
  receive_user_id?: number | null;
  created_at?: string | null;
};

type UpdateBingoFromQrResponse = ApiResponseBase & {
  user_id?: number | null;
  booth_id?: number | null;
  updated_words?: string[] | null;
  bingo_count?: number | null;
};

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ?? "";

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

const toInteractionRecords = (interactions: BingoInteractionResponse[]) => {
  return interactions.flatMap((interaction): BingoInteractionRecord[] => {
    if (
      typeof interaction.word_id_list !== "string" ||
      typeof interaction.send_user_id !== "number" ||
      typeof interaction.receive_user_id !== "number" ||
      typeof interaction.created_at !== "string"
    ) {
      return [];
    }

    return [
      {
        interaction_id: interaction.interaction_id ?? undefined,
        word_id_list: interaction.word_id_list,
        send_user_id: interaction.send_user_id,
        receive_user_id: interaction.receive_user_id,
        created_at: interaction.created_at,
      },
    ];
  });
};

export const registerBingoUser = async (userName: string, password: string) => {
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

export const getUser = async (username: string) => {
  const data = await requestJson<BingoUserResponse>(
    "/api/auth/bingo/get-user-by-name",
    { method: "GET" },
    { username }
  );

  return data.ok ? data : null;
};

export const createBingoBoard = async (
  userId: string,
  boardData: {
    [key: string]: { value: string; status: number; selected: number };
  }
) => {
  const data = await requestJson<BingoBoardResponse>("/api/bingo/boards", {
    method: "POST",
    body: JSON.stringify({ board_data: boardData, user_id: Number(userId) }),
  });

  return data.ok;
};

export const getBingoBoard = async (userId: string) => {
  const data = await requestJson<BingoBoardResponse>(
    `/api/bingo/boards/${userId}`
  );

  if (!data.ok) {
    return [];
  }

  return toBoardItems(data.board_data);
};

export const getSelectedWords = async (userId: string) => {
  const data = await requestJson<UserSelectedWordsResponse>(
    `/api/bingo/boards/selected_words/${userId}`
  );

  if (!data.ok) {
    return [];
  }

  return data.selected_words ?? [];
};

export const updateBingoBoard = async (
  send_user_id: string,
  receive_user_id: string
) => {
  const data = await requestJson<UpdateBingoStatusResponse>(
    `/api/bingo/boards/bingo_status/${send_user_id}/${receive_user_id}`,
    { method: "PUT" }
  );

  return data.ok;
};

export const submitReview = async (
  userId: string,
  rating: number,
  review: string
) => {
  const data = await requestJson<ReviewResponse>(`/api/reviews/${userId}`, {
    method: "POST",
    body: JSON.stringify({ rating, review }),
  });

  return data.ok;
};

export const createUserBingoInteraction = async (
  word_id_list: string,
  send_user_id: number,
  receive_user_id: number
) => {
  const data = await requestJson<ApiResponseBase>("/api/bingo/interactions", {
    method: "POST",
    body: JSON.stringify({ word_id_list, send_user_id, receive_user_id }),
  });

  return data.ok;
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

export const getUserAllInteraction = async (userId: string) => {
  const data = await requestJson<
    ApiResponseBase & { interactions?: BingoInteractionResponse[] | null }
  >(
    `/api/bingo/interactions/${userId}/all`
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

export const getUserName = async (userId: string) => {
  const data = await requestJson<BingoUserResponse>(
    `/api/auth/bingo/get-user/${userId}`
  );

  if (!data.ok) {
    return "";
  }

  return data.user_name ?? "";
};

export const updateBingoFromQR = async (userId: string, targetId: string) => {
  return requestJson<UpdateBingoFromQrResponse>(
    `/api/bingo/boards/update/${userId}/${targetId}`,
    { method: "PATCH" }
  );
};
