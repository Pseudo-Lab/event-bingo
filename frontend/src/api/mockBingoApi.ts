import {
  getActiveEventSlugFromLocation,
  getDefaultEventSlug,
  resolveEventProfile,
} from "../config/eventProfiles";
import { getCompletedLines } from "../modules/Bingo/bingoGameUtils.ts";

type MockBoardCell = {
  value: string;
  status: number;
  selected: number;
};

type MockBoardData = Record<string, MockBoardCell>;

type MockBoard = {
  boardData: MockBoardData;
  displayName?: string;
};

type MockUser = {
  user_id: number;
  user_name: string;
  login_id: string;
  password: string;
};

type MockInteraction = {
  interaction_id: number;
  send_user_id: number;
  receive_user_id: number;
  created_at: string;
  word_id_list: string;
};

type MockState = {
  nextUserId: number;
  nextInteractionId: number;
  nextLoginOrdinal: number;
  users: Record<string, MockUser>;
  loginIdToUserId: Record<string, string>;
  boards: Record<string, MockBoard>;
  interactions: MockInteraction[];
};

type MockStateStore = Record<string, MockState>;

export type MockTesterUser = {
  userId: string;
  userName: string;
  accessCode: string;
  hasBoard: boolean;
};

type MockUserResponse = {
  ok: boolean;
  message: string;
  user_id?: number | null;
  login_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
};

type MockInteractionResponse = {
  ok: boolean;
  message: string;
  interaction_id?: number | null;
  word_id_list?: string | null;
  send_user_id?: number | null;
  receive_user_id?: number | null;
  send_user_name?: string | null;
  receive_user_name?: string | null;
  created_at?: string | null;
  updated_words?: string[] | null;
  bingo_count?: number | null;
};

type MockInteractionListResponse = {
  ok: boolean;
  message: string;
  interactions: MockInteractionResponse[];
};

const STORAGE_KEY = "bingo.mockApiState.v3";
const MODE_KEY = "bingo.mockApiMode";
const DEFAULT_PASSWORD = "TEST";
const TEST_LOGIN_PREFIX = "TEST";
const MOCK_EMAIL_DOMAIN = "mock.event-bingo.local";
const DEFAULT_TEST_USERS = [
  { accessCode: "MINT01", userName: "테스트 민트" },
  { accessCode: "LIME02", userName: "테스트 라임" },
  { accessCode: "WAVE03", userName: "테스트 웨이브" },
  { accessCode: "LEAF04", userName: "테스트 리프" },
  { accessCode: "GLOW05", userName: "테스트 글로우" },
  { accessCode: "CORAL06", userName: "테스트 코랄" },
  { accessCode: "STONE07", userName: "테스트 스톤" },
  { accessCode: "SOLAR08", userName: "테스트 솔라" },
  { accessCode: "BERRY09", userName: "테스트 베리" },
  { accessCode: "CLOUD10", userName: "테스트 클라우드" },
] as const;

const createDefaultState = (): MockState => ({
  nextUserId: 1,
  nextInteractionId: 1,
  nextLoginOrdinal: 1,
  users: {},
  loginIdToUserId: {},
  boards: {},
  interactions: [],
});

const createDefaultStateStore = (): MockStateStore => ({});

const getActiveEventSlug = () => {
  if (typeof window === "undefined") {
    return getDefaultEventSlug();
  }

  return getActiveEventSlugFromLocation(window.location.pathname);
};

const getRuntimeConfig = () => {
  const eventProfile = resolveEventProfile(getActiveEventSlug());
  return {
    boardSize: eventProfile.boardSize,
    boardCellCount: eventProfile.boardSize * eventProfile.boardSize,
    exchangeKeywordCount: eventProfile.exchangeKeywordCount,
    boardKeywordPool: eventProfile.keywords,
  };
};

const normalizeDisplayName = (value?: string | null) => {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue || undefined;
};

const isMockBoard = (value: unknown): value is MockBoard => {
  return typeof value === "object" &&
    value !== null &&
    "boardData" in value;
};

const hydrateBoards = (
  parsedBoards?: Record<string, MockBoard | MockBoardData>
): Record<string, MockBoard> => {
  if (!parsedBoards) {
    return {};
  }

  return Object.entries(parsedBoards).reduce<Record<string, MockBoard>>(
    (boards, [userId, board]) => {
      if (isMockBoard(board)) {
        boards[userId] = {
          boardData: board.boardData ?? {},
          displayName: normalizeDisplayName(board.displayName),
        };
        return boards;
      }

      boards[userId] = {
        boardData: board,
      };
      return boards;
    },
    {}
  );
};

const hydrateState = (parsedState?: Partial<MockState>): MockState => {
  return {
    nextUserId: parsedState?.nextUserId ?? 1,
    nextInteractionId: parsedState?.nextInteractionId ?? 1,
    nextLoginOrdinal: parsedState?.nextLoginOrdinal ?? 1,
    users: parsedState?.users ?? {},
    loginIdToUserId: parsedState?.loginIdToUserId ?? {},
    boards: hydrateBoards(parsedState?.boards as Record<string, MockBoard | MockBoardData> | undefined),
    interactions: parsedState?.interactions ?? [],
  };
};

const readStateStore = (): MockStateStore => {
  if (typeof window === "undefined") {
    return createDefaultStateStore();
  }

  const rawState = window.localStorage.getItem(STORAGE_KEY);
  if (!rawState) {
    return createDefaultStateStore();
  }

  try {
    const parsedState = JSON.parse(rawState) as Record<string, Partial<MockState>>;
    if (typeof parsedState !== "object" || parsedState === null) {
      return createDefaultStateStore();
    }

    return Object.entries(parsedState).reduce<MockStateStore>((stateStore, [eventSlug, state]) => {
      stateStore[eventSlug] = hydrateState(state);
      return stateStore;
    }, {});
  } catch (error) {
    console.warn("Failed to parse local mock API state. Resetting it.", error);
    return createDefaultStateStore();
  }
};

const readState = (): MockState => {
  const activeEventSlug = getActiveEventSlug();
  const stateStore = readStateStore();
  return stateStore[activeEventSlug] ?? createDefaultState();
};

const writeState = (state: MockState) => {
  if (typeof window === "undefined") {
    return;
  }

  const activeEventSlug = getActiveEventSlug();
  const stateStore = readStateStore();
  stateStore[activeEventSlug] = state;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateStore));
};

const normalizeLoginId = (value: string) => {
  return value.trim().toUpperCase().replace(/\s/g, "");
};

const markMockMode = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(MODE_KEY, "true");
};

const rotateWords = (words: string[], offset: number) => {
  if (words.length === 0) {
    return words;
  }

  const normalizedOffset = ((offset % words.length) + words.length) % words.length;
  return [...words.slice(normalizedOffset), ...words.slice(0, normalizedOffset)];
};

const buildSeedKeywords = (userIndex: number) => {
  const runtimeConfig = getRuntimeConfig();

  return Array.from({ length: runtimeConfig.exchangeKeywordCount }, (_, index) => {
    const keywordIndex = (userIndex * 4 + index * 7) % runtimeConfig.boardKeywordPool.length;
    return runtimeConfig.boardKeywordPool[keywordIndex];
  });
};

const buildSeedBoard = (userIndex: number): MockBoardData => {
  const runtimeConfig = getRuntimeConfig();
  const boardWords = rotateWords(runtimeConfig.boardKeywordPool, userIndex * 3);
  const selectedKeywords = new Set(buildSeedKeywords(userIndex));

  return Array.from({ length: runtimeConfig.boardCellCount }).reduce<MockBoardData>(
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

const toBoardItems = (boardData?: MockBoardData | null) => {
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

const getMockBoard = (state: MockState, userId: string) => {
  return state.boards[userId];
};

const getMockDisplayName = (state: MockState, userId: string) => {
  return normalizeDisplayName(getMockBoard(state, userId)?.displayName) ??
    normalizeDisplayName(state.users[userId]?.user_name) ??
    null;
};

const getUniqueKeywords = (keywords: string[]) => [
  ...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean)),
];

const parseInteractionKeywords = (payload: string) => {
  const normalizedPayload = payload.trim();
  if (!normalizedPayload) {
    return [];
  }

  if (normalizedPayload.startsWith("[")) {
    try {
      const parsedPayload = JSON.parse(normalizedPayload) as unknown;
      if (Array.isArray(parsedPayload)) {
        return getUniqueKeywords(
          parsedPayload.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0
          )
        );
      }
    } catch (error) {
      console.warn("Failed to parse interaction payload in mock mode.", error);
    }
  }

  return [normalizedPayload];
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

const createMockUserResponse = (
  user: MockUser,
  message: string
): MockUserResponse => ({
  ok: true,
  message,
  user_id: user.user_id,
  login_id: user.login_id,
  user_email: `tester-${user.user_id}@${MOCK_EMAIL_DOMAIN}`,
  user_name: user.user_name,
});

const createInteractionResponse = (
  interaction: MockInteraction,
  state: MockState
): MockInteractionResponse => {
  return {
    ok: true,
    message: "ok",
    interaction_id: interaction.interaction_id,
    word_id_list: interaction.word_id_list,
    send_user_id: interaction.send_user_id,
    receive_user_id: interaction.receive_user_id,
    send_user_name: getMockDisplayName(state, String(interaction.send_user_id)),
    receive_user_name: getMockDisplayName(state, String(interaction.receive_user_id)),
    created_at: interaction.created_at,
  };
};

const toTesterUsers = (state: MockState): MockTesterUser[] => {
  return Object.values(state.users)
    .sort((left, right) => left.user_id - right.user_id)
    .filter((user) =>
      DEFAULT_TEST_USERS.some((tester) => tester.accessCode === user.login_id)
    )
    .map((user) => ({
      userId: String(user.user_id),
      userName: user.user_name,
      accessCode: user.login_id,
      hasBoard: Boolean(state.boards[String(user.user_id)]),
    }));
};

const ensureUserBoard = (state: MockState, userId: string, seedIndex?: number) => {
  if (state.boards[userId]) {
    return;
  }

  const numericUserId = Number(userId);
  const resolvedSeedIndex = seedIndex ?? Math.max(0, numericUserId - 1);
  state.boards[userId] = {
    boardData: buildSeedBoard(resolvedSeedIndex),
    displayName: normalizeDisplayName(state.users[userId]?.user_name),
  };
};

const ensureDefaultTestUsers = (state: MockState) => {
  DEFAULT_TEST_USERS.forEach((tester, index) => {
    const normalizedCode = normalizeLoginId(tester.accessCode);
    const existingUserId = state.loginIdToUserId[normalizedCode];
    const userId = existingUserId ?? String(state.nextUserId);

    if (!existingUserId) {
      state.users[userId] = {
        user_id: state.nextUserId,
        user_name: tester.userName,
        login_id: normalizedCode,
        password: DEFAULT_PASSWORD,
      };
      state.loginIdToUserId[normalizedCode] = userId;
      state.nextUserId += 1;
    }

    ensureUserBoard(state, userId, index);
  });
};

const generateLoginId = (state: MockState) => {
  let candidate = "";

  do {
    candidate = `${TEST_LOGIN_PREFIX}${String(state.nextLoginOrdinal).padStart(2, "0")}`;
    state.nextLoginOrdinal += 1;
  } while (state.loginIdToUserId[candidate]);

  return candidate;
};

const getCompletedLineCount = (boardData: MockBoardData) => {
  return getCompletedLines(toBoardItems(boardData), getRuntimeConfig().boardSize).length;
};

export const mockIsModeEnabled = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(MODE_KEY) === "true";
};

export const mockClearMode = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(MODE_KEY);
};

export const mockResetState = () => {
  if (typeof window === "undefined") {
    return;
  }

  const activeEventSlug = getActiveEventSlug();
  const stateStore = readStateStore();
  delete stateStore[activeEventSlug];

  if (Object.keys(stateStore).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateStore));
  }

  window.sessionStorage.removeItem(MODE_KEY);
};

export const mockGetOrCreateTesterUsers = async (): Promise<MockTesterUser[]> => {
  const state = readState();
  ensureDefaultTestUsers(state);
  writeState(state);
  return toTesterUsers(state);
};

export const mockSearchBingoParticipants = async (query: string, excludeUserId?: string | number) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const excludedUserId = excludeUserId == null ? "" : String(excludeUserId);

  const state = readState();
  ensureDefaultTestUsers(state);
  writeState(state);

  return Object.values(state.users)
    .filter((user) => Boolean(getMockBoard(state, String(user.user_id))))
    .filter((user) => String(user.user_id) !== excludedUserId)
    .filter((user) => {
      const mockEmail = `tester-${user.user_id}@${MOCK_EMAIL_DOMAIN}`;
      const displayName = getMockDisplayName(state, String(user.user_id)) ?? "";
      return [displayName, user.user_name, mockEmail].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((left, right) => left.user_id - right.user_id)
    .slice(0, 10)
    .map((user) => ({
      user_id: user.user_id,
      display_name: getMockDisplayName(state, String(user.user_id)) ?? user.user_name,
    }));
};

export const mockLoginWithTester = async (
  accessCode: string,
  userName: string
): Promise<MockUserResponse> => {
  markMockMode();

  const state = readState();
  ensureDefaultTestUsers(state);

  const normalizedCode = normalizeLoginId(accessCode);
  const existingUserId = state.loginIdToUserId[normalizedCode];

  if (existingUserId) {
    writeState(state);
    return createMockUserResponse(
      state.users[existingUserId],
      "테스트 계정으로 로그인되었습니다."
    );
  }

  const userId = String(state.nextUserId);
  const createdUser: MockUser = {
    user_id: state.nextUserId,
    user_name: userName.trim() || normalizedCode,
    login_id: normalizedCode,
    password: DEFAULT_PASSWORD,
  };

  state.users[userId] = createdUser;
  state.loginIdToUserId[normalizedCode] = userId;
  state.nextUserId += 1;
  ensureUserBoard(state, userId);
  writeState(state);

  return createMockUserResponse(createdUser, "테스트 계정으로 로그인되었습니다.");
};

export const mockRegisterBingoUser = async (
  userName: string,
  password: string
): Promise<MockUserResponse> => {
  const state = readState();
  ensureDefaultTestUsers(state);

  const userId = String(state.nextUserId);
  const loginId = generateLoginId(state);
  const newUser: MockUser = {
    user_id: state.nextUserId,
    user_name: userName.trim(),
    login_id: loginId,
    password,
  };

  state.users[userId] = newUser;
  state.loginIdToUserId[loginId] = userId;
  state.nextUserId += 1;
  writeState(state);

  return createMockUserResponse(newUser, "테스트 계정이 생성되었습니다.");
};

export const mockLoginBingoUser = async (
  loginId: string,
  password: string
): Promise<MockUserResponse> => {
  const state = readState();
  ensureDefaultTestUsers(state);

  const normalizedLoginId = normalizeLoginId(loginId);
  const userId = state.loginIdToUserId[normalizedLoginId];

  if (!userId) {
    return {
      ok: false,
      message: "로그인 코드를 찾을 수 없습니다.",
    };
  }

  const user = state.users[userId];
  if (user.password !== password) {
    return {
      ok: false,
      message: "비밀번호를 확인해 주세요.",
    };
  }

  writeState(state);
  return createMockUserResponse(user, "테스트 계정으로 로그인되었습니다.");
};

export const mockCreateBingoBoard = async (
  userId: string,
  boardData: MockBoardData,
  displayName?: string
) => {
  const state = readState();
  state.boards[userId] = {
    boardData,
    displayName: normalizeDisplayName(displayName) ??
      getMockBoard(state, userId)?.displayName,
  };
  writeState(state);
  return true;
};

export const mockGetBingoBoard = async (userId: string, eventSlug?: string) => {
  void eventSlug;
  const state = readState();
  const board = getMockBoard(state, userId);
  return {
    board: toBoardItems(board?.boardData),
    displayName: normalizeDisplayName(board?.displayName),
  };
};

export const mockUpdateBingoDisplayName = async (userId: string, displayName: string) => {
  const state = readState();
  const board = getMockBoard(state, userId);

  if (!board) {
    return {
      ok: false,
      message: "보드를 찾을 수 없습니다.",
    };
  }

  board.displayName = normalizeDisplayName(displayName);
  writeState(state);

  return {
    ok: true,
    message: "이름이 변경되었습니다.",
    display_name: board.displayName,
  };
};

export const mockCreateUserBingoInteraction = async (
  wordIdList: string,
  sendUserId: number,
  receiveUserId: number,
  eventSlug?: string
): Promise<MockInteractionResponse> => {
  void eventSlug;
  const state = readState();
  const sender = state.users[String(sendUserId)];
  const receiver = state.users[String(receiveUserId)];

  if (!sender || !receiver) {
    return {
      ok: false,
      message: "존재하지 않는 참가자입니다.",
    };
  }

  const receiverBoard = state.boards[String(receiveUserId)];
  if (!receiverBoard) {
    return {
      ok: false,
      message: "상대방 보드를 찾을 수 없습니다.",
    };
  }

  if (hasDirectionalInteraction(state.interactions, sendUserId, receiveUserId)) {
    return {
      ok: false,
      message: "이미 같은 참가자에게 키워드를 보냈어요.",
    };
  }

  const senderKeywords = new Set(parseInteractionKeywords(wordIdList));
  const updatedWords: string[] = [];

  Object.entries(receiverBoard.boardData).forEach(([cellId, cell]) => {
    if (cell.status === 0 && senderKeywords.has(cell.value)) {
      receiverBoard.boardData[cellId] = {
        ...cell,
        status: 1,
      };
      updatedWords.push(cell.value);
    }
  });

  const createdAt = new Date().toISOString();
  const interaction: MockInteraction = {
    interaction_id: state.nextInteractionId,
    send_user_id: sendUserId,
    receive_user_id: receiveUserId,
    created_at: createdAt,
    word_id_list: wordIdList,
  };

  state.interactions.push(interaction);
  state.nextInteractionId += 1;
  state.boards[String(receiveUserId)] = receiverBoard;
  writeState(state);

  return {
    ...createInteractionResponse(interaction, state),
    message: "키워드를 전송했습니다.",
    updated_words: getUniqueKeywords(updatedWords),
    bingo_count: getCompletedLineCount(receiverBoard.boardData),
  };
};

export const mockGetUserAllInteraction = async (
  userId: string,
  _eventSlug?: string,
  afterInteractionId?: number
): Promise<MockInteractionListResponse> => {
  const numericUserId = Number(userId);
  const state = readState();
  const interactions = state.interactions
    .filter((interaction) => {
      if (
        interaction.send_user_id !== numericUserId &&
        interaction.receive_user_id !== numericUserId
      ) {
        return false;
      }

      if (typeof afterInteractionId === "number") {
        return interaction.interaction_id > afterInteractionId;
      }

      return true;
    })
    .sort((left, right) => {
      const timeDiff =
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }

      return right.interaction_id - left.interaction_id;
    })
    .map((interaction) => createInteractionResponse(interaction, state));

  return {
    ok: true,
    message: "ok",
    interactions,
  };
};
