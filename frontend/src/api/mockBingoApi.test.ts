import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mockResetState, mockSearchBingoParticipants } from "./mockBingoApi";

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
});
