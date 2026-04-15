import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  mockCreateBingoBoard,
  mockCreateUserBingoInteraction,
  mockGetBingoBoard,
  mockGetOrCreateTesterUsers,
  mockGetUserAllInteraction,
  mockRegisterBingoUser,
  mockResetState,
  mockSearchBingoParticipants,
  mockUpdateBingoDisplayName,
} from "./mockBingoApi";

const createStorage = () => {
  const store = new Map<string, string>();

  return {
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
};

const createBoardData = (selectedKeywords: string[] = []) => {
  return Array.from({ length: 25 }).reduce<Record<string, { value: string; selected: number; status: number }>>(
    (board, _, index) => {
      const value = index === 0 ? "AI" : `키워드 ${index + 1}`;
      board[String(index)] = {
        value,
        selected: selectedKeywords.includes(value) ? 1 : 0,
        status: 0,
      };
      return board;
    },
    {}
  );
};

describe("mockSearchBingoParticipants", () => {
  beforeEach(() => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage,
        sessionStorage,
        location: {
          pathname: "/bingo-networking/bingo",
        },
      },
    });
  });

  afterEach(() => {
    mockResetState();
    delete (globalThis as { window?: unknown }).window;
  });

  it("finds tester users by name and generated mock email", async () => {
    const nameResults = await mockSearchBingoParticipants("라임");
    expect(nameResults.some((user) => user.display_name === "테스트 라임")).toBe(true);

    const emailResults = await mockSearchBingoParticipants("tester-1@mock.event-bingo.local");
    expect(emailResults.some((user) => user.display_name === "테스트 민트")).toBe(true);
  });

  it("does not match tester login codes anymore", async () => {
    const codeResults = await mockSearchBingoParticipants("MINT01");

    expect(codeResults).toEqual([]);
  });

  it("excludes the active user from search results when requested", async () => {
    const testers = await mockGetOrCreateTesterUsers();
    const mintUser = testers.find((tester) => tester.accessCode === "MINT01");

    expect(mintUser).toBeDefined();

    const results = await mockSearchBingoParticipants("민트", mintUser!.userId);

    expect(results).toEqual([]);
  });

  it("does not return users who have not created a bingo board yet", async () => {
    await mockGetOrCreateTesterUsers();
    await mockRegisterBingoUser("무보드 참가자", "TEST");

    const results = await mockSearchBingoParticipants("무보드 참가자");

    expect(results).toEqual([]);
  });

  it("prefers event-specific display names for search, board lookup, and interaction history", async () => {
    const testers = await mockGetOrCreateTesterUsers();
    const mintUser = testers.find((tester) => tester.accessCode === "MINT01");
    const limeUser = testers.find((tester) => tester.accessCode === "LIME02");

    expect(mintUser).toBeDefined();
    expect(limeUser).toBeDefined();

    const senderBoard = createBoardData(["AI"]);
    const receiverBoard = createBoardData();

    await mockCreateBingoBoard(mintUser!.userId, senderBoard, "행사 민트");
    await mockCreateBingoBoard(limeUser!.userId, receiverBoard, "행사 라임");

    const boardResult = await mockGetBingoBoard(mintUser!.userId);
    expect(boardResult.displayName).toBe("행사 민트");

    const nameResults = await mockSearchBingoParticipants("행사 라임");
    expect(nameResults).toEqual([
      {
        user_id: Number(limeUser!.userId),
        display_name: "행사 라임",
      },
    ]);

    const interaction = await mockCreateUserBingoInteraction(
      "[\"AI\"]",
      Number(mintUser!.userId),
      Number(limeUser!.userId)
    );
    expect(interaction.send_user_name).toBe("행사 민트");
    expect(interaction.receive_user_name).toBe("행사 라임");

    const history = await mockGetUserAllInteraction(mintUser!.userId);
    expect(history.interactions[0]).toMatchObject({
      send_user_name: "행사 민트",
      receive_user_name: "행사 라임",
    });
  });

  it("persists display-name updates separately from the base user name", async () => {
    const testers = await mockGetOrCreateTesterUsers();
    const mintUser = testers.find((tester) => tester.accessCode === "MINT01");

    expect(mintUser).toBeDefined();

    const response = await mockUpdateBingoDisplayName(mintUser!.userId, "행사 민트 B");
    expect(response).toMatchObject({
      ok: true,
      display_name: "행사 민트 B",
    });

    const boardResult = await mockGetBingoBoard(mintUser!.userId);
    expect(boardResult.displayName).toBe("행사 민트 B");

    const searchResults = await mockSearchBingoParticipants("행사 민트 B");
    expect(searchResults[0]).toMatchObject({
      user_id: Number(mintUser!.userId),
      display_name: "행사 민트 B",
    });
  });
});
