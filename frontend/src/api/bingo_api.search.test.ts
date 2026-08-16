import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/apiBase", () => ({
  getApiBaseUrl: () => "http://api.test",
}));

vi.mock("../lib/supabaseClient", () => ({
  maybeGetSupabaseClient: () => null,
}));

import { searchBingoParticipants } from "./bingo_api";

describe("searchBingoParticipants", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not request queries shorter than two characters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(searchBingoParticipants("김", "sample-event")).resolves.toEqual([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("passes the abort signal and caches a successful identical search", async () => {
    const abortController = new AbortController();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          message: "ok",
          participants: [{ user_id: 9, display_name: "김승규" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const first = await searchBingoParticipants(
      "김승규",
      "cache-event",
      "7",
      abortController.signal
    );
    const second = await searchBingoParticipants("김승규", "cache-event", "7");

    expect(first).toEqual([{ user_id: 9, display_name: "김승규" }]);
    expect(second).toEqual(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBe(abortController.signal);
  });
});
