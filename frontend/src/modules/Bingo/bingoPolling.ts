export const BINGO_POLL_INTERVAL_MS = 10_000;
export const BINGO_POLL_MAX_BACKOFF_MS = 60_000;
export const BINGO_POLL_MAX_JITTER_MS = 2_000;

export const getStablePollJitter = (clientKey: string, maxJitterMs = BINGO_POLL_MAX_JITTER_MS) => {
  let hash = 0;
  for (let index = 0; index < clientKey.length; index += 1) {
    hash = (hash * 31 + clientKey.charCodeAt(index)) >>> 0;
  }
  return maxJitterMs > 0 ? hash % (maxJitterMs + 1) : 0;
};

type PollingOptions = {
  document: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">;
  jitterMs: number;
  poll: () => Promise<boolean>;
  intervalMs?: number;
  maxBackoffMs?: number;
};

export const startVisibilityAwarePolling = ({
  document,
  jitterMs,
  poll,
  intervalMs = BINGO_POLL_INTERVAL_MS,
  maxBackoffMs = BINGO_POLL_MAX_BACKOFF_MS,
}: PollingOptions) => {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let consecutiveFailures = 0;
  let running = false;

  const clearScheduledPoll = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const schedule = () => {
    clearScheduledPoll();
    if (stopped || document.visibilityState === "hidden") {
      return;
    }

    const backoffMs = Math.min(
      intervalMs * 2 ** consecutiveFailures,
      maxBackoffMs
    );
    timeoutId = setTimeout(run, backoffMs + jitterMs);
  };

  const run = async () => {
    if (stopped || running || document.visibilityState === "hidden") {
      return;
    }

    running = true;
    try {
      const succeeded = await poll();
      consecutiveFailures = succeeded ? 0 : consecutiveFailures + 1;
    } catch {
      consecutiveFailures += 1;
    } finally {
      running = false;
      schedule();
    }
  };

  const handleVisibilityChange = () => {
    clearScheduledPoll();
    if (document.visibilityState === "visible") {
      void run();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  schedule();

  return () => {
    stopped = true;
    clearScheduledPoll();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};
