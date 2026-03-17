import {
  mockCreateBingoBoard,
  mockCreateUserBingoInteraction,
  mockGetBingoBoard,
  mockGetSelectedWords,
  mockGetUserAllInteraction,
  mockGetUserByName,
  mockGetUserInteractionCount,
  mockGetUserLatestInteraction,
  mockGetUserName,
  mockNewSingUpUser,
  mockSingUpUser,
  mockSubmitReview,
  mockUpdateBingoBoard,
  mockUpdateBingoFromQR,
} from "./mockBingoApi";

const API_URL = import.meta.env.VITE_API_URL?.trim();

const hasApiUrl = Boolean(API_URL);

const createApiUrl = (path: string, params?: Record<string, string>) => {
  if (!API_URL) {
    return path;
  }

  const url = new URL(path, API_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
};

export const singUpUser = async (userEmail: string) => {
  if (!hasApiUrl) {
    return mockSingUpUser(userEmail);
  }

  try {
    const response = await fetch(
      createApiUrl("/api/auth/bingo/sign-up", { email: userEmail }),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Falling back to local mock sign-up.", error);
    return mockSingUpUser(userEmail);
  }
};

export const newSingUpUser = async (userEmail: string, userName: string) => {
  if (!hasApiUrl) {
    return mockNewSingUpUser(userEmail, userName);
  }

  try {
    const response = await fetch(
      createApiUrl("/api/auth/bingo/new-sign-up", {
        email: userEmail,
        username: userName,
      }),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Falling back to local mock login.", error);
    return mockNewSingUpUser(userEmail, userName);
  }
};

// Deprecated
export const getUser = async (username: string) => {
  if (!hasApiUrl) {
    return mockGetUserByName(username);
  }

  try {
    const response = await fetch(
      createApiUrl("/api/auth/bingo/get-user", { username })
    );
    if (response.ok === false) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Falling back to local mock user lookup.", error);
    return mockGetUserByName(username);
  }
};

export const createBingoBoard = async (
  userId: string,
  boardData: {
    [key: string]: { value: string; status: number; selected: number };
  }
) => {
  if (!hasApiUrl) {
    return mockCreateBingoBoard(userId, boardData);
  }

  try {
    const response = await fetch(`${API_URL}/api/bingo/boards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ board_data: boardData, user_id: parseInt(userId) }),
    });
    return response.ok;
  } catch (error) {
    console.warn("Falling back to local mock board creation.", error);
    return mockCreateBingoBoard(userId, boardData);
  }
};

export const getBingoBoard = async (userId: string) => {
  if (!hasApiUrl) {
    return mockGetBingoBoard(userId);
  }

  try {
    const response = await fetch(`${API_URL}/api/bingo/boards/${userId}`);
    if (response.ok === false) {
      return [];
    }
    const data = await response.json();
    if (data.ok === false) {
      return [];
    }

    const boardData = data["board_data"];
    const items = Object.keys(boardData).map((key) => ({
      ...boardData[key],
      id: Number(key),
    }));
    return items;
  } catch (error) {
    console.warn("Falling back to local mock board fetch.", error);
    return mockGetBingoBoard(userId);
  }
};

export const getUserInteractionCount = async (userId: string) => {
  if (!hasApiUrl) {
    return mockGetUserInteractionCount(userId);
  }

  try {
    const response = await fetch(`${API_URL}/api/bingo/boards/${userId}`);
    if (response.ok === false) {
      return 0;
    }
    const data = await response.json();
    if (data.ok === false) {
      return 0;
    }

    const user_interaction_count = data["user_interaction_count"];
    return user_interaction_count;
  } catch (error) {
    console.warn("Falling back to local mock interaction count.", error);
    return mockGetUserInteractionCount(userId);
  }
};

export const getSelectedWords = async (userId: string) => {
  if (!hasApiUrl) {
    return mockGetSelectedWords(userId);
  }

  try {
    const response = await fetch(
      `${API_URL}/api/bingo/boards/selected_words/${userId}`
    );
    if (response.ok === false) {
      return [];
    }
    const data = await response.json();
    const userSelectedWords = data["selected_words"];
    return userSelectedWords;
  } catch (error) {
    console.warn("Falling back to local mock selected words.", error);
    return mockGetSelectedWords(userId);
  }
};

export const updateBingoBoard = async (
  send_user_id: string,
  receive_user_id: string
) => {
  if (!hasApiUrl) {
    return mockUpdateBingoBoard(send_user_id, receive_user_id);
  }

  try {
    const response = await fetch(
      `${API_URL}/api/bingo/boards/bingo_status/${send_user_id}/${receive_user_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.ok;
  } catch (error) {
    console.warn("Falling back to local mock board update.", error);
    return mockUpdateBingoBoard(send_user_id, receive_user_id);
  }
};

export const submitReview = async (userId: string, rating: number, review: string) => {
  if (!hasApiUrl) {
    return mockSubmitReview(userId, rating, review);
  }

  try {
    const response = await fetch(`${API_URL}/api/reviews/${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, review }),
      }
    );
    return response.ok;
  } catch (error) {
    console.warn("Falling back to local mock review submit.", error);
    return mockSubmitReview(userId, rating, review);
  }
};

export const createUserBingoInteraction = async (
  word_id_list: string,
  send_user_id: number,
  receive_user_id: number
) => {
  if (!hasApiUrl) {
    return mockCreateUserBingoInteraction(
      word_id_list,
      send_user_id,
      receive_user_id
    );
  }

  try {
    const response = await fetch(`${API_URL}/api/bingo/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word_id_list, send_user_id, receive_user_id }),
    });
    return response.ok;
  } catch (error) {
    console.warn("Falling back to local mock interaction create.", error);
    return mockCreateUserBingoInteraction(
      word_id_list,
      send_user_id,
      receive_user_id
    );
  }
};

export const getUserLatestInteraction = async (userId: string, limit: number = 0) => {
  if (!hasApiUrl) {
    return mockGetUserLatestInteraction(userId, limit);
  }

  try {
    const response = await fetch(`${API_URL}/api/bingo/interactions/${userId}?limit=${limit}`);

    if (response.ok === false) {
      return "";
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Falling back to local mock latest interaction fetch.", error);
    return mockGetUserLatestInteraction(userId, limit);
  }
};

export const getUserAllInteraction = async (userId: string) => {
  if (!hasApiUrl) {
    return mockGetUserAllInteraction(userId);
  }

  try {
    const response = await fetch(`${API_URL}/api/bingo/interactions/${userId}/all`);

    if (response.ok === false) {
      return "";
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Falling back to local mock interaction history.", error);
    return mockGetUserAllInteraction(userId);
  }
};

export const getUserName = async (userId: string) => {
  if (!hasApiUrl) {
    return mockGetUserName(userId);
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/bingo/get-user/${userId}`);
    if (response.ok === false) {
      return "";
    }
    const data = await response.json();
    const userName = data["user_name"];
    return userName;
  } catch (error) {
    console.warn("Falling back to local mock username lookup.", error);
    return mockGetUserName(userId);
  }
};

export const updateBingoFromQR = async (userId: string, targetId: string) => {
  if (!hasApiUrl) {
    return mockUpdateBingoFromQR(userId, targetId);
  }

  try {
    const response = await fetch(
      `${API_URL}/api/bingo/boards/update/${userId}/${targetId}`,
      {
        method: "PATCH",
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Falling back to local mock QR board update.", error);
    return mockUpdateBingoFromQR(userId, targetId);
  }
};
