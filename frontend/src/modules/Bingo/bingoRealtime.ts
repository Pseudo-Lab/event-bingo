import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type BingoRealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "degraded";

type RealtimeSyncReason = "change" | "subscribed";

type BingoRealtimeMetric =
  | { name: "channel_status"; status: string }
  | { name: "channel_join_duration"; valueMs: number }
  | { name: "event_delivery_duration"; valueMs: number }
  | { name: "reconnect_count"; value: number }
  | { name: "sync_error" };

type BingoRealtimeOptions = {
  client: SupabaseClient;
  eventSlug: string;
  userId: string;
  onStatusChange: (status: BingoRealtimeConnectionStatus) => void;
  onSyncRequested: (reason: RealtimeSyncReason) => void | Promise<void>;
  onMetric?: (metric: BingoRealtimeMetric) => void;
};

const reportMetric = (metric: BingoRealtimeMetric) => {
  console.info("Bingo Realtime metric", metric);
};

const getDeliveryDurationMs = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const commitTimestamp = (payload as { commit_timestamp?: unknown })
    .commit_timestamp;
  if (typeof commitTimestamp !== "string") {
    return undefined;
  }
  const committedAt = Date.parse(commitTimestamp);
  if (!Number.isFinite(committedAt)) {
    return undefined;
  }
  return Math.max(0, Date.now() - committedAt);
};

export const startBingoRealtimeSync = ({
  client,
  eventSlug,
  userId,
  onStatusChange,
  onSyncRequested,
  onMetric = reportMetric,
}: BingoRealtimeOptions) => {
  let stopped = false;
  let hasSubscribed = false;
  let reconnectCount = 0;
  const startedAt = performance.now();
  const requestSync = (reason: RealtimeSyncReason) => {
    if (!stopped) {
      void Promise.resolve(onSyncRequested(reason)).catch(() => {
        onMetric({ name: "sync_error" });
      });
    }
  };

  const handleChange = (payload: unknown) => {
    const deliveryDuration = getDeliveryDurationMs(payload);
    if (deliveryDuration !== undefined) {
      onMetric({ name: "event_delivery_duration", valueMs: deliveryDuration });
    }
    requestSync("change");
  };

  onStatusChange("connecting");
  onMetric({ name: "channel_status", status: "CONNECTING" });
  const channel: RealtimeChannel = client
    .channel(`bingo-interactions:${eventSlug}:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bingo_interaction",
        filter: `send_user_id=eq.${userId}`,
      },
      handleChange,
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bingo_interaction",
        filter: `receive_user_id=eq.${userId}`,
      },
      handleChange,
    )
    .subscribe((status) => {
      if (stopped) {
        return;
      }

      if (status === "SUBSCRIBED") {
        onStatusChange("connected");
        onMetric({ name: "channel_status", status });
        if (hasSubscribed) {
          reconnectCount += 1;
          onMetric({ name: "reconnect_count", value: reconnectCount });
        } else {
          hasSubscribed = true;
          onMetric({
            name: "channel_join_duration",
            valueMs: Math.max(0, Math.round(performance.now() - startedAt)),
          });
        }
        requestSync("subscribed");
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        onStatusChange("degraded");
        onMetric({ name: "channel_status", status });
        console.warn("Bingo Realtime channel is unavailable.", { status });
      }
    });

  return () => {
    stopped = true;
    void client.removeChannel(channel);
  };
};
