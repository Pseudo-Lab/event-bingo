import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "./authSession";
import { clearLegacyLocalLoginStorage } from "./legacyAuthStorage";

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

describe("authSession", () => {
  beforeEach(() => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage,
        sessionStorage,
      },
    });
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("stores and reads the current auth session from sessionStorage", () => {
    setAuthSession({
      userId: "11",
      userName: "테스터",
      loginId: "ABCD12",
    });

    expect(getAuthSession()).toEqual({
      userId: "11",
      userName: "테스터",
      loginId: "ABCD12",
    });
  });

  it("does not restore legacy auth data from localStorage anymore", () => {
    window.localStorage.setItem("myID", "22");
    window.localStorage.setItem("myUserName", "레거시");
    window.localStorage.setItem("myLoginId", "OLD001");

    expect(getAuthSession()).toBeNull();
  });

  it("clears both session and legacy storage keys on logout", () => {
    setAuthSession({
      userId: "33",
      userName: "현재 세션",
      loginId: "NOW333",
    });
    window.localStorage.setItem("myID", "99");
    window.localStorage.setItem("myEmail", "legacy@example.com");

    clearAuthSession();

    expect(window.sessionStorage.getItem("myID")).toBeNull();
    expect(window.sessionStorage.getItem("myLoginId")).toBeNull();
    expect(window.localStorage.getItem("myID")).toBeNull();
    expect(window.localStorage.getItem("myEmail")).toBeNull();
  });

  it("removes legacy local login keys explicitly", () => {
    window.localStorage.setItem("myID", "44");
    window.localStorage.setItem("myUserName", "레거시 사용자");
    window.localStorage.setItem("myLoginId", "OLD444");
    window.localStorage.setItem("myEmail", "old@example.com");
    window.localStorage.setItem("myLoginKey", "legacy-key");
    window.localStorage.setItem("bingo.recentAccounts.v1", "[]");
    window.localStorage.setItem("event-bingo.admin-session.v1", "{}");

    clearLegacyLocalLoginStorage();

    expect(window.localStorage.getItem("myID")).toBeNull();
    expect(window.localStorage.getItem("myUserName")).toBeNull();
    expect(window.localStorage.getItem("myLoginId")).toBeNull();
    expect(window.localStorage.getItem("myEmail")).toBeNull();
    expect(window.localStorage.getItem("myLoginKey")).toBeNull();
    expect(window.localStorage.getItem("bingo.recentAccounts.v1")).toBeNull();
    expect(window.localStorage.getItem("event-bingo.admin-session.v1")).toBeNull();
  });
});
