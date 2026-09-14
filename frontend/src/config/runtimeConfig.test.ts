import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchRuntimeConfig,
  parseRuntimeConfig,
  watchRuntimeConfig,
} from "./runtimeConfig";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("runtime config", () => {
  it("fails closed when the payload is absent or malformed", () => {
    expect(parseRuntimeConfig(undefined).bingoRealtimeEnabled).toBe(false);
    expect(
      parseRuntimeConfig({ bingoRealtimeEnabled: "true" }).bingoRealtimeEnabled,
    ).toBe(false);
  });

  it("enables realtime only for an explicit boolean true", () => {
    expect(
      parseRuntimeConfig({ bingoRealtimeEnabled: true }).bingoRealtimeEnabled,
    ).toBe(true);
  });

  it("requests uncached runtime config and fails closed on an error", async () => {
    const successfulFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ bingoRealtimeEnabled: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchRuntimeConfig(successfulFetch)).resolves.toEqual({
      bingoRealtimeEnabled: true,
    });
    expect(successfulFetch).toHaveBeenCalledWith(
      "/runtime/runtime-config.json",
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );

    await expect(
      fetchRuntimeConfig(vi.fn().mockRejectedValue(new Error("offline"))),
    ).resolves.toEqual({
      bingoRealtimeEnabled: false,
    });
  });

  it("refreshes the runtime switch and removes timers and listeners on cleanup", async () => {
    let intervalCallback: (() => void) | undefined;
    const clearInterval = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      clearInterval,
      setInterval: vi.fn((callback: () => void) => {
        intervalCallback = callback;
        return 17;
      }),
    });
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener,
      visibilityState: "visible",
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ bingoRealtimeEnabled: true }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ bingoRealtimeEnabled: false }), {
          status: 200,
        }),
      );
    const onChange = vi.fn();

    const stop = watchRuntimeConfig({
      fetcher,
      intervalMs: 100,
      onChange,
    });
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ bingoRealtimeEnabled: true }),
    );

    intervalCallback?.();
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        bingoRealtimeEnabled: false,
      }),
    );
    stop();

    expect(clearInterval).toHaveBeenCalledWith(17);
    expect(removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });

  it("ignores a stale response that finishes after a newer refresh", async () => {
    let intervalCallback: (() => void) | undefined;
    let resolveFirst: ((response: Response) => void) | undefined;
    vi.stubGlobal("window", {
      clearInterval: vi.fn(),
      setInterval: vi.fn((callback: () => void) => {
        intervalCallback = callback;
        return 18;
      }),
    });
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: "visible",
    });
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ bingoRealtimeEnabled: false }), {
          status: 200,
        }),
      );
    const onChange = vi.fn();

    const stop = watchRuntimeConfig({ fetcher, intervalMs: 100, onChange });
    intervalCallback?.();
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        bingoRealtimeEnabled: false,
      }),
    );

    resolveFirst?.(
      new Response(JSON.stringify({ bingoRealtimeEnabled: true }), {
        status: 200,
      }),
    );
    await firstResponse;
    await Promise.resolve();

    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });
});
