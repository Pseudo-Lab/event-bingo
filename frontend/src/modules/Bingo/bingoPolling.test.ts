import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getStablePollJitter,
  startVisibilityAwarePolling,
} from "./bingoPolling";

const createVisibilityDocument = () => {
  let visibilityState: DocumentVisibilityState = "visible";
  const listeners = new Set<EventListenerOrEventListenerObject>();

  return {
    document: {
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener);
      },
      get visibilityState() {
        return visibilityState;
      },
    } as Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">,
    setVisibility(nextState: DocumentVisibilityState) {
      visibilityState = nextState;
      listeners.forEach((listener) => {
        if (typeof listener === "function") {
          listener(new Event("visibilitychange"));
        } else {
          listener.handleEvent(new Event("visibilitychange"));
        }
      });
    },
    listenerCount: () => listeners.size,
  };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("bingo polling", () => {
  it("uses stable bounded jitter per client", () => {
    expect(getStablePollJitter("event:42")).toBe(getStablePollJitter("event:42"));
    expect(getStablePollJitter("event:42")).toBeGreaterThanOrEqual(0);
    expect(getStablePollJitter("event:42")).toBeLessThanOrEqual(2_000);
  });

  it("polls after the base interval and client jitter", async () => {
    vi.useFakeTimers();
    const visibility = createVisibilityDocument();
    const poll = vi.fn().mockResolvedValue(true);
    const stop = startVisibilityAwarePolling({
      document: visibility.document,
      jitterMs: 500,
      intervalMs: 10_000,
      poll,
    });

    await vi.advanceTimersByTimeAsync(10_499);
    expect(poll).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(1);
    stop();
  });

  it("pauses while hidden and refreshes immediately when visible", async () => {
    vi.useFakeTimers();
    const visibility = createVisibilityDocument();
    const poll = vi.fn().mockResolvedValue(true);
    const stop = startVisibilityAwarePolling({
      document: visibility.document,
      jitterMs: 0,
      intervalMs: 10_000,
      poll,
    });

    visibility.setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(30_000);
    expect(poll).not.toHaveBeenCalled();
    visibility.setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(1);
    stop();
  });

  it("backs off after failures and resets after success", async () => {
    vi.useFakeTimers();
    const visibility = createVisibilityDocument();
    const poll = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const stop = startVisibilityAwarePolling({
      document: visibility.document,
      jitterMs: 0,
      intervalMs: 1_000,
      maxBackoffMs: 8_000,
      poll,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(poll).toHaveBeenCalledTimes(3);
    stop();
  });

  it("cleans up its timer and visibility listener", async () => {
    vi.useFakeTimers();
    const visibility = createVisibilityDocument();
    const poll = vi.fn().mockResolvedValue(true);
    const stop = startVisibilityAwarePolling({
      document: visibility.document,
      jitterMs: 0,
      intervalMs: 1_000,
      poll,
    });

    expect(visibility.listenerCount()).toBe(1);
    stop();
    expect(visibility.listenerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(poll).not.toHaveBeenCalled();
  });
});
