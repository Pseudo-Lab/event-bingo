import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  loginBingoUser,
  registerBingoUser,
  setAuthSession,
  getAuthSession,
  clearLegacyLocalLoginStorage,
  updateUser,
  getUser,
} = vi.hoisted(() => ({
  loginBingoUser: vi.fn(),
  registerBingoUser: vi.fn(),
  setAuthSession: vi.fn(),
  getAuthSession: vi.fn(),
  clearLegacyLocalLoginStorage: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("../api/bingo_api", () => ({
  loginBingoUser,
  registerBingoUser,
}));

vi.mock("./authSession", () => ({
  getAuthSession,
  normalizeAuthEmail: (value?: string | null) => {
    const trimmedValue = value?.trim() ?? "";
    return trimmedValue.includes("@") ? trimmedValue : "";
  },
  setAuthSession,
}));

vi.mock("./legacyAuthStorage", () => ({
  clearLegacyLocalLoginStorage,
}));

vi.mock("../lib/supabaseClient", () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser,
      updateUser,
    },
  }),
  maybeGetSupabaseClient: () => ({
    auth: {
      getUser,
      updateUser,
    },
  }),
}));

import { ensureBingoGoogleBridge, syncBingoBridgeUserName } from "./bingoGoogleBridge";

const createGoogleUser = (overrides?: {
  email?: string;
  userMetadata?: Record<string, unknown>;
}) => ({
  email: overrides?.email ?? "tester@example.com",
  user_metadata: overrides?.userMetadata ?? {},
  identities: [
    {
      identity_data: {
        full_name: "구글 닉네임",
      },
    },
  ],
});

describe("bingoGoogleBridge", () => {
  beforeEach(() => {
    loginBingoUser.mockReset();
    registerBingoUser.mockReset();
    setAuthSession.mockReset();
    getAuthSession.mockReset();
    clearLegacyLocalLoginStorage.mockReset();
    updateUser.mockReset();
    getUser.mockReset();

    getAuthSession.mockReturnValue(null);
    updateUser.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {},
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not fall back to the Google profile name after bridge re-registration", async () => {
    loginBingoUser.mockResolvedValue({
      ok: false,
      message: "존재하지 않는 로그인 코드입니다.",
    });
    registerBingoUser.mockResolvedValue({
      ok: true,
      message: "빙고 계정이 생성되었습니다.",
      user_id: 11,
      login_id: "ABCD12",
      user_email: "tester@example.com",
      user_name: null,
    });

    const result = await ensureBingoGoogleBridge(
      createGoogleUser({
        userMetadata: {
          event_bingo_login_id: "OLD001",
          event_bingo_bridge_key: "bridge-key",
          event_bingo_user_name: "이전 빙고 이름",
        },
      }) as never,
      "sample-event"
    );

    expect(registerBingoUser).toHaveBeenCalledWith(
      undefined,
      expect.any(String),
      "sample-event",
      "tester@example.com"
    );
    expect(result.isNewUser).toBe(true);
    expect(result.authSession.userName).toBe("");
    expect(setAuthSession).toHaveBeenCalledWith({
      userId: "11",
      userName: "",
      loginId: "ABCD12",
      userEmail: "tester@example.com",
    });
    expect(updateUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event_bingo_user_name: "",
      }),
    });
  });

  it("syncs the chosen bingo name back to Supabase bridge metadata", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            event_bingo_user_name: "",
            event_bingo_login_id: "ABCD12",
          },
        },
      },
    });

    await syncBingoBridgeUserName("행사 이름");

    expect(updateUser).toHaveBeenCalledWith({
      data: {
        event_bingo_user_name: "행사 이름",
        event_bingo_login_id: "ABCD12",
      },
    });
  });

  it("skips the auth metadata update when the bingo name is unchanged", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            event_bingo_user_name: "행사 이름",
          },
        },
      },
    });

    await syncBingoBridgeUserName("행사 이름");

    expect(updateUser).not.toHaveBeenCalled();
  });

  it("initializes the bridge only once for concurrent calls from the same user", async () => {
    registerBingoUser.mockResolvedValue({
      ok: true,
      message: "빙고 계정이 생성되었습니다.",
      user_id: 11,
      login_id: "ABCD12",
      user_email: "tester@example.com",
      user_name: null,
    });
    const user = createGoogleUser() as never;

    const [first, second] = await Promise.all([
      ensureBingoGoogleBridge(user, "sample-event"),
      ensureBingoGoogleBridge(user, "sample-event"),
    ]);

    expect(registerBingoUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it("retries auth metadata updates with bounded backoff after 429", async () => {
    vi.useFakeTimers();
    registerBingoUser.mockResolvedValue({
      ok: true,
      message: "빙고 계정이 생성되었습니다.",
      user_id: 11,
      login_id: "ABCD12",
      user_email: "tester@example.com",
      user_name: null,
    });
    updateUser
      .mockResolvedValueOnce({ error: { status: 429 } })
      .mockResolvedValueOnce({ error: { status: 429 } })
      .mockResolvedValueOnce({ error: null });

    const initialization = ensureBingoGoogleBridge(
      createGoogleUser() as never,
      "rate-limited-event"
    );
    await vi.advanceTimersByTimeAsync(249);
    expect(updateUser).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(updateUser).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(500);
    await initialization;
    expect(updateUser).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
