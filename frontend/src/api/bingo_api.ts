const API_URL: string = import.meta.env.VITE_API_URL;

export const singUpUser = async (username: string, password: string) => {
  const response = await fetch(
    `${API_URL}/api/auth/bingo/sign-up?username=${username}&password=${password}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const data = await response.json();
  return data;
};

export const getUser = async (username: string) => {
  const response = await fetch(
    `${API_URL}/api/auth/bingo/get-user?username=${username}`
  );
  if (response.ok === false) {
    return null;
  }
  const data = await response.json();
  return data;
};

export const createBingoBoard = async (
  userId: string,
  boardData: {
    [key: string]: { value: string; status: number; selected: number };
  }
) => {
  const response = await fetch(`${API_URL}/api/bingo/boards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ board_data: boardData, user_id: parseInt(userId) }),
  });
  return response.ok;
};

export const getBingoBoard = async (userId: string) => {
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
    id: key,
  }));
  return items;
};

export const getSelectedWords = async (userId: string) => {
  const response = await fetch(
    `${API_URL}/api/bingo/boards/selected_words/${userId}`
  );
  if (response.ok === false) {
    return [];
  }
  const data = await response.json();
  const userSelectedWords = data["selected_words"];
  return userSelectedWords;
};

export const updateBingoBoard = async (
  send_user_id: string,
  receive_user_id: string
) => {
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
};

export const createUserBingoInteraction = async (
  word_id_list: string,
  send_user_id: number,
  receive_user_id: number
) => {
  const response = await fetch(`${API_URL}/api/bingo/interactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ word_id_list, send_user_id, receive_user_id }),
  });
  return response.ok;
};

export const getUserLatestInteraction = async (userId: string) => {
  const response = await fetch(`${API_URL}/api/bingo/interactions/${userId}`);

  if (response.ok === false) {
    return "";
  }
  const data = await response.json();
  return data;
};

export const getUserName = async (userId: string) => {
  const response = await fetch(`${API_URL}/api/auth/bingo/get-user/${userId}`);
  if (response.ok === false) {
    return [];
  }
  const data = await response.json();
  const userName = data["username"];
  return userName;
};

export const updateBingoFromQR = async (userId: string, targetId: string) => {
  const response = await fetch(
    `${API_URL}/api/bingo/boards/update/${userId}/${targetId}`,
    {
      method: "PATCH",
    }
  );
  const data = await response.json();
  return data;
};
