import { bingoConfig, boardKeywordPool } from "../config/bingoConfig.ts";

type MockBoardCell = {
  value: string;
  status: number;
  selected: number;
};

type MockBoardData = Record<string, MockBoardCell>;

type MockUser = {
  user_id: number;
  user_email: string;
  user_name: string;
  privacy_agreed: boolean;
  rating?: number | null;
  review?: string | null;
};

type MockInteraction = {
  send_user_id: number;
  receive_user_id: number;
  created_at: string;
  word_id_list: string;
};

type MockState = {
  nextUserId: number;
  users: Record<string, MockUser>;
  accessCodeToUserId: Record<string, string>;
  boards: Record<string, MockBoardData>;
  interactions: MockInteraction[];
};

type LoginResponse = MockUser & {
  ok: boolean;
  message: string;
};

export type MockTesterUser = {
  userId: string;
  userEmail: string;
  userName: string;
  accessCode: string;
  hasBoard: boolean;
};

const STORAGE_KEY = "bingo.mockApiState.v1";
const MODE_KEY = "bingo.mockApiMode";
const SHARED_TEST_WORD_POOL = boardKeywordPool;
const DEFAULT_TEST_USERS = [
  { accessCode: "mint01", userName: "테스트 민트" },
  { accessCode: "lime02", userName: "테스트 라임" },
  { accessCode: "wave03", userName: "테스트 웨이브" },
  { accessCode: "leaf04", userName: "테스트 리프" },
  { accessCode: "glow05", userName: "테스트 글로우" },
  { accessCode: "coral06", userName: "테스트 코랄" },
  { accessCode: "stone07", userName: "테스트 스톤" },
  { accessCode: "solar08", userName: "테스트 솔라" },
  { accessCode: "berry09", userName: "테스트 베리" },
  { accessCode: "cloud10", userName: "테스트 클라우드" },
] as const;

const createDefaultState = (): MockState => ({
  nextUserId: 1,
  users: {},
  accessCodeToUserId: {},
  boards: {},
  interactions: [],
});

const readState = (): MockState => {
  const rawState = localStorage.getItem(STORAGE_KEY);

  if (!rawState) {
    return createDefaultState();
  }

  try {
    const parsedState = JSON.parse(rawState) as Partial<MockState>;

    return {
      nextUserId: parsedState.nextUserId ?? 1,
      users: parsedState.users ?? {},
      accessCodeToUserId: parsedState.accessCodeToUserId ?? {},
      boards: parsedState.boards ?? {},
      interactions: parsedState.interactions ?? [],
    };
  } catch (error) {
    console.warn("Failed to parse local mock API state. Resetting it.", error);
    return createDefaultState();
  }
};

const writeState = (state: MockState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const markMockMode = () => {
  sessionStorage.setItem(MODE_KEY, "true");
};

export const mockIsModeEnabled = () => {
  const sessionMode = sessionStorage.getItem(MODE_KEY);
  if (sessionMode) {
    return sessionMode === "true";
  }

  const legacyMode = localStorage.getItem(MODE_KEY);
  if (legacyMode) {
    sessionStorage.setItem(MODE_KEY, legacyMode);
    localStorage.removeItem(MODE_KEY);
  }

  return legacyMode === "true";
};

export const mockClearMode = () => {
  sessionStorage.removeItem(MODE_KEY);
  localStorage.removeItem(MODE_KEY);
};

export const mockResetState = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(MODE_KEY);
  localStorage.removeItem(MODE_KEY);
};

const sortInteractionsDesc = (interactions: MockInteraction[]) =>
  [...interactions].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

const rotateWords = (words: string[], offset: number) => {
  if (words.length === 0) {
    return words;
  }

  const normalizedOffset = offset % words.length;
  return [...words.slice(normalizedOffset), ...words.slice(0, normalizedOffset)];
};

const buildSeedKeywords = (userIndex: number) => {
  return Array.from({ length: bingoConfig.exchangeKeywordCount }, (_, index) => {
    const keywordIndex = (userIndex * 4 + index * 7) % SHARED_TEST_WORD_POOL.length;
    return SHARED_TEST_WORD_POOL[keywordIndex];
  });
};

const buildSeedBoard = (userIndex: number): MockBoardData => {
  const boardWords = rotateWords(SHARED_TEST_WORD_POOL, userIndex * 3);
  const selectedKeywords = new Set(buildSeedKeywords(userIndex));
  return Array.from({ length: bingoConfig.boardCellCount }).reduce<MockBoardData>(
    (board, _, index) => {
      const value = boardWords[index % boardWords.length];

      board[String(index)] = {
        value,
        selected: selectedKeywords.has(value) ? 1 : 0,
        status: 0,
      };
      return board;
    },
    {}
  );
};

const getAccessCodeForUserId = (state: MockState, userId: string) => {
  return (
    Object.entries(state.accessCodeToUserId).find(([, mappedUserId]) => mappedUserId === userId)?.[0] ??
    state.users[userId]?.user_email ??
    ""
  );
};

const toTesterUsers = (state: MockState): MockTesterUser[] => {
  return Object.values(state.users)
    .sort((left, right) => left.user_id - right.user_id)
    .map((user) => ({
      userId: String(user.user_id),
      userEmail: user.user_email,
      userName: user.user_name,
      accessCode: getAccessCodeForUserId(state, String(user.user_id)),
      hasBoard: Boolean(state.boards[String(user.user_id)]),
    }));
};

const ensureDefaultTestUsers = (state: MockState) => {
  DEFAULT_TEST_USERS.forEach((tester, index) => {
    const existingUserId = state.accessCodeToUserId[tester.accessCode];
    const userId = existingUserId ?? String(state.nextUserId);

    if (!existingUserId) {
      state.users[userId] = {
        user_id: state.nextUserId,
        user_email: tester.accessCode,
        user_name: tester.userName,
        privacy_agreed: true,
      };
      state.accessCodeToUserId[tester.accessCode] = userId;
      state.nextUserId += 1;
    }

    if (!state.boards[userId]) {
      state.boards[userId] = buildSeedBoard(index);
    }
  });
};

const hasDirectionalInteraction = (
  interactions: MockInteraction[],
  sendUserId: number,
  receiveUserId: number
) => {
  return interactions.some((interaction) => {
    return interaction.send_user_id === sendUserId &&
      interaction.receive_user_id === receiveUserId;
  });
};

export const mockSingUpUser = async (userEmail: string): Promise<LoginResponse> => {
  return mockNewSingUpUser(userEmail, userEmail);
};

export const mockNewSingUpUser = async (
  userEmail: string,
  userName: string
): Promise<LoginResponse> => {
  markMockMode();

  const state = readState();
  const existingUserId = state.accessCodeToUserId[userEmail];

  if (existingUserId) {
    const existingUser = state.users[existingUserId];
    return {
      ...existingUser,
      ok: true,
      message: "로컬 모드로 로그인되었습니다.",
    };
  }

  const userId = state.nextUserId;
  const newUser: MockUser = {
    user_id: userId,
    user_email: userEmail,
    user_name: userName,
    privacy_agreed: true,
  };

  state.users[String(userId)] = newUser;
  state.accessCodeToUserId[userEmail] = String(userId);
  state.nextUserId += 1;
  writeState(state);

  return {
    ...newUser,
    ok: true,
    message: "로컬 모드로 로그인되었습니다.",
  };
};

export const mockGetOrCreateTesterUsers = async (): Promise<MockTesterUser[]> => {
  const state = readState();
  ensureDefaultTestUsers(state);
  writeState(state);

  return toTesterUsers(state);
};

export const mockGetUserByName = async (username: string) => {
  const state = readState();
  const user = Object.values(state.users).find(
    (currentUser) => currentUser.user_name === username
  );

  if (!user) {
    return {
      ok: false,
      message: `${username} 가 존재하지 않습니다.`,
    };
  }

  return {
    ...user,
    ok: true,
    message: "로컬 유저 조회에 성공했습니다.",
  };
};

export const mockCreateBingoBoard = async (
  userId: string,
  boardData: MockBoardData
) => {
  markMockMode();

  const state = readState();
  state.boards[userId] = boardData;
  writeState(state);

  return true;
};

export const mockGetBingoBoard = async (userId: string) => {
  const state = readState();
  const boardData = state.boards[userId];

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

export const mockGetUserInteractionCount = async (userId: string) => {
  const numericUserId = Number(userId);
  const state = readState();
  const counterpartUserIds = new Set<number>();

  state.interactions.forEach((interaction) => {
    if (interaction.send_user_id === numericUserId) {
      counterpartUserIds.add(interaction.receive_user_id);
    }

    if (interaction.receive_user_id === numericUserId) {
      counterpartUserIds.add(interaction.send_user_id);
    }
  });

  return counterpartUserIds.size;
};

export const mockGetSelectedWords = async (userId: string) => {
  const board = await mockGetBingoBoard(userId);
  return board
    .filter((cell) => cell.selected === 1)
    .map((cell) => cell.value);
};

export const mockUpdateBingoBoard = async (
  sendUserId: string,
  receiveUserId: string
) => {
  markMockMode();

  const state = readState();
  const numericSenderId = Number(sendUserId);
  const numericReceiverId = Number(receiveUserId);
  const senderBoard = state.boards[sendUserId];
  const receiverBoard = state.boards[receiveUserId];

  if (!senderBoard || !receiverBoard) {
    return false;
  }

  if (hasDirectionalInteraction(state.interactions, numericSenderId, numericReceiverId)) {
    return false;
  }

  const senderKeywords = new Set(
    Object.values(senderBoard)
      .filter((cell) => cell.selected === 1)
      .map((cell) => cell.value)
  );

  Object.entries(receiverBoard).forEach(([cellId, cell]) => {
    if (senderKeywords.has(cell.value)) {
      receiverBoard[cellId] = {
        ...cell,
        status: 1,
      };
    }
  });

  state.boards[receiveUserId] = receiverBoard;
  writeState(state);

  return true;
};

export const mockSubmitReview = async (
  userId: string,
  rating: number,
  review: string
) => {
  markMockMode();

  const state = readState();
  const user = state.users[userId];

  if (!user) {
    return false;
  }

  state.users[userId] = {
    ...user,
    rating,
    review,
  };
  writeState(state);

  return true;
};

export const mockCreateUserBingoInteraction = async (
  wordId: string,
  sendUserId: number,
  receiveUserId: number
) => {
  markMockMode();

  const state = readState();
  if (hasDirectionalInteraction(state.interactions, sendUserId, receiveUserId)) {
    return false;
  }

  state.interactions.push({
    send_user_id: sendUserId,
    receive_user_id: receiveUserId,
    created_at: new Date().toISOString(),
    word_id_list: wordId,
  });
  writeState(state);

  return true;
};

export const mockGetUserLatestInteraction = async (
  userId: string,
  limit = 0
) => {
  const numericUserId = Number(userId);
  const state = readState();
  const receivedInteractions = sortInteractionsDesc(
    state.interactions.filter(
      (interaction) => interaction.receive_user_id === numericUserId
    )
  );

  return limit > 0 ? receivedInteractions.slice(0, limit) : receivedInteractions;
};

export const mockGetUserAllInteraction = async (userId: string) => {
  const numericUserId = Number(userId);
  const state = readState();

  return {
    interactions: sortInteractionsDesc(
      state.interactions.filter(
        (interaction) =>
          interaction.send_user_id === numericUserId ||
          interaction.receive_user_id === numericUserId
      )
    ),
  };
};

export const mockGetUserName = async (userId: string) => {
  const state = readState();
  return state.users[userId]?.user_name ?? "";
};

export const mockUpdateBingoFromQR = async (userId: string, targetId: string) => {
  return mockUpdateBingoBoard(userId, targetId);
};
