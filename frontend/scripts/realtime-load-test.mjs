import { chmod, readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { setTimeout as sleepTimer } from "node:timers/promises";

import { createClient } from "@supabase/supabase-js";
import {
  loadTestFailed,
  percentile,
  summarizeDeliveries,
} from "./realtime-load-metrics.mjs";

const requiredEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const positiveIntegerEnv = (name, fallback) => {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) return fallback;
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

const sleep = (durationMs, signal) =>
  sleepTimer(durationMs, undefined, { signal });

const parseUsers = async (path) => {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(value) || value.length < 4) {
    throw new Error(
      "LOAD_TEST_USERS_FILE must contain at least four synthetic users",
    );
  }

  return value.map((user, index) => {
    const fields = ["email", "password", "bingo_login_id", "bingo_password"];
    for (const field of fields) {
      if (typeof user?.[field] !== "string" || !user[field].trim()) {
        throw new Error(`Synthetic user ${index + 1} is missing ${field}`);
      }
    }
    return user;
  });
};

const requestJson = async ({
  apiUrl,
  path,
  token,
  method = "GET",
  body,
  metrics,
  signal,
}) => {
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(path, apiUrl), {
      method,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status >= 500) metrics.http5xx += 1;

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        `API request failed with status ${response.status}`,
      );
      error.status = response.status;
      throw error;
    }
    return payload;
  } finally {
    metrics.httpDurationsMs.push(performance.now() - startedAt);
    metrics.httpRequests += 1;
  }
};

const waitForSubscription = (
  channel,
  metrics,
  intentionalClose,
  onStatus = () => {},
) =>
  new Promise((resolve, reject) => {
    const startedAt = performance.now();
    let hasSubscribed = false;
    const timeout = setTimeout(
      () => reject(new Error("Realtime subscription timed out")),
      15_000,
    );
    channel.subscribe((status) => {
      onStatus(status);
      metrics.channelStatuses[status] =
        (metrics.channelStatuses[status] ?? 0) + 1;
      if (status === "SUBSCRIBED") {
        if (hasSubscribed) metrics.reconnectCount += 1;
        hasSubscribed = true;
        clearTimeout(timeout);
        metrics.channelJoinDurationsMs.push(performance.now() - startedAt);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error(`Realtime subscription failed: ${status}`));
      } else if (status === "CLOSED" && !intentionalClose()) {
        metrics.unexpectedClosed += 1;
        clearTimeout(timeout);
        reject(new Error("Realtime subscription closed unexpectedly"));
      }
    });
  });

const main = async () => {
  const supabaseUrl = requiredEnv("LOAD_TEST_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("LOAD_TEST_SUPABASE_ANON_KEY");
  const apiUrl = requiredEnv("LOAD_TEST_API_URL");
  const eventSlug = requiredEnv("LOAD_TEST_EVENT_SLUG");
  const usersPath = requiredEnv("LOAD_TEST_USERS_FILE");
  const durationMs = positiveIntegerEnv("LOAD_TEST_DURATION_MS", 600_000);
  const loginRate = positiveIntegerEnv("LOAD_TEST_LOGIN_RATE_PER_SECOND", 5);
  const exchangeIntervalMs = positiveIntegerEnv(
    "LOAD_TEST_EXCHANGE_INTERVAL_MS",
    30_000,
  );
  const settleMs = positiveIntegerEnv("LOAD_TEST_SETTLE_MS", 5_000);
  const expectedUserCount = positiveIntegerEnv("LOAD_TEST_USER_COUNT", 200);
  const resultFile = process.env.LOAD_TEST_RESULT_FILE?.trim();
  const syntheticUsers = await parseUsers(usersPath);

  if (syntheticUsers.length !== expectedUserCount) {
    throw new Error(
      `Expected ${expectedUserCount} synthetic users but received ${syntheticUsers.length}`,
    );
  }

  const metrics = {
    auth429: 0,
    channelJoinDurationsMs: [],
    channelStatuses: {},
    createdInteractions: 0,
    http5xx: 0,
    httpDurationsMs: [],
    httpRequests: 0,
    interactionErrors: 0,
    missingFinalState: 0,
    missingReconciledState: 0,
    reconnectCount: 0,
    unauthorizedDeliveries: 0,
    unexpectedClosed: 0,
    syncErrors: 0,
  };
  const clients = [];
  const extraChannels = [];
  const createdInteractions = new Map();
  const deliveries = new Map();
  const consumedPairs = new Set();
  let stopping = false;
  let interrupted = false;
  let pollTimer;
  const abortController = new AbortController();
  const intentionalClosures = new Set();

  const cleanup = async () => {
    stopping = true;
    clearInterval(pollTimer);
    abortController.abort();
    await Promise.allSettled(
      clients.map(({ client }) => client.auth.stopAutoRefresh()),
    );
    await Promise.allSettled([
      ...clients.flatMap(({ client, channels }) =>
        channels.map((channel) => client.removeChannel(channel)),
      ),
      ...extraChannels.map(({ client, channel }) =>
        client.removeChannel(channel),
      ),
    ]);
  };
  const interrupt = () => {
    interrupted = true;
    process.exitCode = 1;
    void cleanup();
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);

  try {
    console.log(
      `Starting controlled Realtime test with ${syntheticUsers.length} synthetic users.`,
    );
    for (const syntheticUser of syntheticUsers) {
      if (stopping) throw new Error("Load test interrupted");
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.signInWithPassword({
        email: syntheticUser.email,
        password: syntheticUser.password,
      });
      if (error || !data.session) {
        if (error?.status === 429) metrics.auth429 += 1;
        throw new Error(
          `Synthetic Supabase login failed with status ${error?.status ?? "unknown"}`,
        );
      }

      const bingoUser = await requestJson({
        apiUrl,
        path: "/api/auth/bingo/login",
        token: data.session.access_token,
        method: "POST",
        body: {
          login_id: syntheticUser.bingo_login_id,
          password: syntheticUser.bingo_password,
          event_slug: eventSlug,
        },
        metrics,
      });
      if (!bingoUser.ok || typeof bingoUser.user_id !== "number") {
        throw new Error("Synthetic Bingo bridge login failed");
      }
      clients.push({
        accessToken: data.session.access_token,
        supabaseUserId: data.session.user.id,
        bingoUserId: bingoUser.user_id,
        channels: [],
        client,
        connected: false,
        lastSync: Date.now(),
        observedInteractionIds: new Set(),
      });
      await sleep(Math.ceil(1_000 / loginRate));
    }
    if (
      new Set(clients.map((entry) => entry.supabaseUserId)).size !==
        expectedUserCount ||
      new Set(clients.map((entry) => entry.bingoUserId)).size !==
        expectedUserCount
    ) {
      throw new Error(
        "Load test requires distinct synthetic auth and Bingo users",
      );
    }

    const recordDelivery = (clientIndex, payload) => {
      const row = payload?.new;
      if (!row || typeof row.interaction_id !== "number") return;
      const deliveryKey = `${clientIndex}:${row.interaction_id}`;
      const committedAt = Date.parse(payload.commit_timestamp);
      const previous = deliveries.get(deliveryKey);
      deliveries.set(deliveryKey, {
        count: (previous?.count ?? 0) + 1,
        durationMs:
          previous?.durationMs ??
          (Number.isFinite(committedAt)
            ? Math.max(0, Date.now() - committedAt)
            : null),
      });
      const entry = clients[clientIndex];
      if (
        row.send_user_id !== entry.bingoUserId &&
        row.receive_user_id !== entry.bingoUserId
      ) {
        metrics.unauthorizedDeliveries += 1;
      }
      void reconcile(entry);
    };

    const reconcile = (entry) => {
      if (stopping) return Promise.resolve();
      entry.pendingSync = true;
      if (entry.syncPromise) return entry.syncPromise;
      entry.syncPromise = (async () => {
        while (entry.pendingSync && !stopping) {
          entry.pendingSync = false;
          entry.lastSync = Date.now();
          const options = {
            apiUrl,
            token: entry.accessToken,
            metrics,
            signal: abortController.signal,
          };
          const [board, history] = await Promise.all([
            requestJson({
              ...options,
              path: `/api/bingo/boards/${entry.bingoUserId}?event_slug=${encodeURIComponent(eventSlug)}`,
            }),
            requestJson({
              ...options,
              path: `/api/bingo/interactions/${entry.bingoUserId}/all?event_slug=${encodeURIComponent(eventSlug)}`,
            }),
          ]);
          if (!board.ok || !history.ok)
            throw new Error("State reconciliation failed");
          entry.selectedWords = Object.values(board.board_data ?? {})
            .filter((cell) => cell.selected === 1 || cell.selected === true)
            .map((cell) => cell.value);
          for (const row of history.interactions)
            entry.observedInteractionIds.add(row.interaction_id);
        }
      })()
        .catch(() => {
          if (!stopping) metrics.syncErrors += 1;
        })
        .finally(() => {
          entry.syncPromise = null;
        });
      return entry.syncPromise;
    };

    await Promise.all(
      clients.map(async (entry, index) => {
        // Match the controlled login ramp instead of creating a 200-channel
        // join spike that measures quota throttling rather than steady load.
        await sleep(Math.floor((index * 1_000) / loginRate));
        const channel = entry.client
          .channel(`load-test-main-${index}-${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "bingo_interaction",
              filter: `send_user_id=eq.${entry.bingoUserId}`,
            },
            (payload) => recordDelivery(index, payload),
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "bingo_interaction",
              filter: `receive_user_id=eq.${entry.bingoUserId}`,
            },
            (payload) => recordDelivery(index, payload),
          );
        entry.channels.push(channel);
        await waitForSubscription(
          channel,
          metrics,
          () => stopping,
          (status) => {
            entry.connected = status === "SUBSCRIBED";
            entry.lastSync = Date.now();
            if (entry.connected) void reconcile(entry);
          },
        );
      }),
    );
    await Promise.all(clients.map(reconcile));
    if (clients.some((entry) => !entry.selectedWords?.length))
      throw new Error("Synthetic participants need boards with selected words");
    pollTimer = setInterval(() => {
      for (const entry of clients) {
        if (Date.now() - entry.lastSync >= (entry.connected ? 60_000 : 11_000))
          void reconcile(entry);
      }
    }, 1_000);

    const createInteraction = async (senderIndex, receiverIndex) => {
      const sender = clients[senderIndex];
      const receiver = clients[receiverIndex];
      const pairKey = `${sender.bingoUserId}:${receiver.bingoUserId}`;
      if (consumedPairs.has(pairKey)) return false;
      consumedPairs.add(pairKey);

      try {
        const result = await requestJson({
          apiUrl,
          path: "/api/bingo/interactions",
          token: sender.accessToken,
          method: "POST",
          body: {
            word_id_list: JSON.stringify(sender.selectedWords),
            send_user_id: sender.bingoUserId,
            receive_user_id: receiver.bingoUserId,
            event_slug: eventSlug,
          },
          metrics,
          signal: abortController.signal,
        });
        if (!result.ok || typeof result.interaction_id !== "number") {
          metrics.interactionErrors += 1;
          return false;
        }
        createdInteractions.set(result.interaction_id, {
          receiverIndex,
          senderIndex,
        });
        metrics.createdInteractions += 1;
        return true;
      } catch (error) {
        if (error?.status === 429) metrics.auth429 += 1;
        metrics.interactionErrors += 1;
        return false;
      }
    };

    const probeClient = clients[0];
    const probeReceiver = clients[1];
    const probeChannel = probeClient.client
      .channel(`load-test-negative-authenticated-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bingo_interaction",
          filter: `receive_user_id=eq.${probeReceiver.bingoUserId}`,
        },
        (payload) => {
          const row = payload?.new;
          if (
            row &&
            row.send_user_id !== probeClient.bingoUserId &&
            row.receive_user_id !== probeClient.bingoUserId
          ) {
            metrics.unauthorizedDeliveries += 1;
          }
        },
      );
    probeClient.channels.push(probeChannel);

    const anonymousClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anonymousChannel = anonymousClient
      .channel(`load-test-negative-anonymous-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bingo_interaction",
          filter: `receive_user_id=eq.${probeReceiver.bingoUserId}`,
        },
        () => {
          metrics.unauthorizedDeliveries += 1;
        },
      );
    extraChannels.push({ channel: anonymousChannel, client: anonymousClient });
    await Promise.all([
      waitForSubscription(
        probeChannel,
        metrics,
        () => stopping || intentionalClosures.has(probeChannel),
      ),
      waitForSubscription(
        anonymousChannel,
        metrics,
        () => stopping || intentionalClosures.has(anonymousChannel),
      ),
    ]);
    await createInteraction(2, 1);
    await sleep(settleMs);
    intentionalClosures.add(probeChannel);
    intentionalClosures.add(anonymousChannel);
    await Promise.all([
      probeClient.client.removeChannel(probeChannel),
      anonymousClient.removeChannel(anonymousChannel),
    ]);
    probeClient.channels = probeClient.channels.filter(
      (channel) => channel !== probeChannel,
    );
    extraChannels.splice(0, extraChannels.length);

    if (metrics.unauthorizedDeliveries > 0) {
      throw new Error(
        "RLS negative test failed before the sustained load phase",
      );
    }

    console.log(
      `Negative authorization checks passed. Running load for ${durationMs}ms.`,
    );
    const loadStartedAt = Date.now();
    const deadline = loadStartedAt + durationMs;
    await Promise.all(
      clients.map(async (_entry, senderIndex) => {
        let round = 0;
        await sleep(
          Math.min(
            (senderIndex * exchangeIntervalMs) / clients.length,
            durationMs,
          ),
          abortController.signal,
        );
        while (!stopping && Date.now() < deadline) {
          const receiverIndex =
            (senderIndex + (round % (clients.length - 1)) + 1) % clients.length;
          await createInteraction(senderIndex, receiverIndex);
          round += 1;
          await sleep(
            Math.max(0, Math.min(exchangeIntervalMs, deadline - Date.now())),
            abortController.signal,
          );
        }
      }),
    );
    await sleep(settleMs);

    clearInterval(pollTimer);
    await Promise.allSettled(clients.map((entry) => entry.syncPromise));

    const finalHistories = await Promise.all(
      clients.map((entry) =>
        requestJson({
          apiUrl,
          path: `/api/bingo/interactions/${entry.bingoUserId}/all?event_slug=${encodeURIComponent(eventSlug)}`,
          token: entry.accessToken,
          metrics,
        }),
      ),
    );
    const historyIds = finalHistories.map(
      (history) =>
        new Set(
          (history.interactions ?? []).map((item) => item.interaction_id),
        ),
    );
    for (const [interactionId, participants] of createdInteractions) {
      if (
        !historyIds[participants.senderIndex].has(interactionId) ||
        !historyIds[participants.receiverIndex].has(interactionId)
      ) {
        metrics.missingFinalState += 1;
      }
      if (
        !clients[participants.senderIndex].observedInteractionIds.has(
          interactionId,
        ) ||
        !clients[participants.receiverIndex].observedInteractionIds.has(
          interactionId,
        )
      ) {
        metrics.missingReconciledState += 1;
      }
    }

    const summary = {
      ...summarizeDeliveries(createdInteractions, deliveries),
      completedDuration:
        !interrupted && Date.now() - loadStartedAt >= durationMs,
      unexpectedClosed: metrics.unexpectedClosed,
      syncErrors: metrics.syncErrors,
      auth429: metrics.auth429,
      channelErrors:
        (metrics.channelStatuses.CHANNEL_ERROR ?? 0) +
        (metrics.channelStatuses.TIMED_OUT ?? 0),
      channelJoinP95Ms: percentile(metrics.channelJoinDurationsMs, 0.95),
      createdInteractions: metrics.createdInteractions,
      http5xx: metrics.http5xx,
      http5xxRatio:
        metrics.httpRequests === 0 ? 0 : metrics.http5xx / metrics.httpRequests,
      httpP95Ms: percentile(metrics.httpDurationsMs, 0.95),
      interactionErrors: metrics.interactionErrors,
      missingFinalState: metrics.missingFinalState,
      missingReconciledState: metrics.missingReconciledState,
      reconnectCount: metrics.reconnectCount,
      unauthorizedDeliveries: metrics.unauthorizedDeliveries,
      userCount: clients.length,
    };

    if (resultFile) {
      await writeFile(resultFile, `${JSON.stringify(summary, null, 2)}\n`, {
        mode: 0o600,
      });
      await chmod(resultFile, 0o600);
    }
    console.log(JSON.stringify(summary, null, 2));

    const failed = loadTestFailed(summary);
    if (failed) process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    await cleanup();
  }
};

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Realtime load test failed",
  );
  process.exitCode = 1;
});
