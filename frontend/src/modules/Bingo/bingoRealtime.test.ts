import { describe, expect, it, vi } from "vitest";

import { startBingoRealtimeSync } from "./bingoRealtime";

const createRealtimeClient = () => {
  const handlers: Array<{
    config: { filter: string };
    callback: (payload?: unknown) => void;
  }> = [];
  let subscribeCallback: ((status: string) => void) | undefined;

  type ChannelStub = {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };
  const channel = {} as ChannelStub;
  channel.on = vi.fn((_type, config, callback) => {
    handlers.push({ config, callback });
    return channel;
  });
  channel.subscribe = vi.fn((callback) => {
    subscribeCallback = callback;
    return channel;
  });
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  };

  return {
    channel,
    client,
    handlers,
    emitStatus: (status: string) => subscribeCallback?.(status),
  };
};

describe("bingo realtime sync", () => {
  it("subscribes to sent and received inserts for the server-confirmed user id", () => {
    const realtime = createRealtimeClient();
    const onStatusChange = vi.fn();
    const onSyncRequested = vi.fn();
    const onMetric = vi.fn();

    startBingoRealtimeSync({
      client: realtime.client as never,
      eventSlug: "sample-event",
      userId: "42",
      onStatusChange,
      onSyncRequested,
      onMetric,
    });

    expect(realtime.client.channel).toHaveBeenCalledWith(
      "bingo-interactions:sample-event:42",
    );
    expect(realtime.handlers.map(({ config }) => config.filter)).toEqual([
      "send_user_id=eq.42",
      "receive_user_id=eq.42",
    ]);
    expect(onStatusChange).toHaveBeenCalledWith("connecting");
    expect(onMetric).toHaveBeenCalledWith({
      name: "channel_status",
      status: "CONNECTING",
    });
  });

  it("reconciles after subscribe and every matching database change", () => {
    const realtime = createRealtimeClient();
    const onStatusChange = vi.fn();
    const onSyncRequested = vi.fn();
    const onMetric = vi.fn();

    startBingoRealtimeSync({
      client: realtime.client as never,
      eventSlug: "sample-event",
      userId: "42",
      onStatusChange,
      onSyncRequested,
      onMetric,
    });
    realtime.emitStatus("SUBSCRIBED");
    realtime.handlers[1]?.callback();

    expect(onStatusChange).toHaveBeenLastCalledWith("connected");
    expect(onSyncRequested).toHaveBeenNthCalledWith(1, "subscribed");
    expect(onSyncRequested).toHaveBeenNthCalledWith(2, "change");
    expect(onMetric).toHaveBeenCalledWith(
      expect.objectContaining({ name: "channel_join_duration" }),
    );
  });

  it("marks failed channels degraded and removes the channel during cleanup", () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const realtime = createRealtimeClient();
    const onStatusChange = vi.fn();
    const onMetric = vi.fn();
    const stop = startBingoRealtimeSync({
      client: realtime.client as never,
      eventSlug: "sample-event",
      userId: "42",
      onStatusChange,
      onSyncRequested: vi.fn(),
      onMetric,
    });

    realtime.emitStatus("TIMED_OUT");
    expect(onStatusChange).toHaveBeenLastCalledWith("degraded");
    expect(onMetric).toHaveBeenCalledWith({
      name: "channel_status",
      status: "TIMED_OUT",
    });
    stop();
    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channel,
    );
    expect(warning).toHaveBeenCalledWith(
      "Bingo Realtime channel is unavailable.",
      {
        status: "TIMED_OUT",
      },
    );
    warning.mockRestore();
  });

  it("reports reconnects and commit-to-client delivery duration without identifiers", () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T00:00:01.250Z"));
    const realtime = createRealtimeClient();
    const onMetric = vi.fn();

    startBingoRealtimeSync({
      client: realtime.client as never,
      eventSlug: "sample-event",
      userId: "42",
      onStatusChange: vi.fn(),
      onSyncRequested: vi.fn(),
      onMetric,
    });
    realtime.emitStatus("SUBSCRIBED");
    realtime.emitStatus("CHANNEL_ERROR");
    realtime.emitStatus("SUBSCRIBED");
    realtime.handlers[0]?.callback({
      commit_timestamp: "2026-08-18T00:00:01.000Z",
      new: { interaction_id: 99 },
    });

    expect(onMetric).toHaveBeenCalledWith({
      name: "reconnect_count",
      value: 1,
    });
    expect(onMetric).toHaveBeenCalledWith({
      name: "event_delivery_duration",
      valueMs: 250,
    });
    expect(JSON.stringify(onMetric.mock.calls)).not.toContain("interaction_id");
    vi.useRealTimers();
    warning.mockRestore();
  });
});
