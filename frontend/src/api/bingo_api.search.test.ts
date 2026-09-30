import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/apiBase", () => ({
  getApiBaseUrl: () => "http://api.test",
}));

vi.mock("../lib/supabaseClient", () => ({
  maybeGetSupabaseClient: () => null,
}));

import { getBingoState, searchBingoParticipants } from "./bingo_api";

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

describe("getBingoState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads board and complete interaction history in one request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          message: "ok",
          board: {
            ok: true,
            message: "ok",
            display_name: "참가자",
            board_data: {
              "0": { value: "AI", status: 1, selected: 1 },
            },
          },
          interactions: [
            {
              ok: true,
              message: "ok",
              interaction_id: 3,
              word_id_list: '["AI"]',
              send_user_id: 1,
              receive_user_id: 2,
              created_at: "2026-09-18T10:00:00Z",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const state = await getBingoState("2", "sample-event");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "http://api.test/api/bingo/boards/state/2?event_slug=sample-event"
    );
    expect(state.board).toEqual([
      { id: 0, value: "AI", status: 1, selected: 1 },
    ]);
    expect(state.displayName).toBe("참가자");
    expect(state.interactions).toHaveLength(1);
    expect(state.interactions[0]?.interaction_id).toBe(3);
  });

  it("uses legacy reads only when an old backend returns 404", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        message: "ok",
        display_name: "참가자",
        board_data: { "0": { value: "AI", status: 1, selected: 1 } },
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        message: "ok",
        interactions: [],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const state = await getBingoState("2", "sample-event");

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(state.board).toHaveLength(1);
    expect(state.interactions).toEqual([]);
  });

  it("does not amplify server failures with legacy reads", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("Server error", { status: 500 }));

    await expect(getBingoState("2", "sample-event")).rejects.toThrow(
      "API request failed (500)"
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
