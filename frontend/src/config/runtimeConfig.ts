export type EventBingoRuntimeConfig = {
  bingoRealtimeEnabled: boolean;
};

const DEFAULT_RUNTIME_CONFIG: EventBingoRuntimeConfig = {
  bingoRealtimeEnabled: false,
};

export const RUNTIME_CONFIG_REFRESH_INTERVAL_MS = 15_000;

const parseBoolean = (value: unknown) => value === true;

export const parseRuntimeConfig = (value: unknown): EventBingoRuntimeConfig => {
  if (!value || typeof value !== "object") {
    return DEFAULT_RUNTIME_CONFIG;
  }

  const candidate = value as Record<string, unknown>;
  return {
    bingoRealtimeEnabled: parseBoolean(candidate.bingoRealtimeEnabled),
  };
};

export const fetchRuntimeConfig = async (
  fetcher: typeof fetch = fetch,
): Promise<EventBingoRuntimeConfig> => {
  try {
    const response = await fetcher("/runtime/runtime-config.json", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return DEFAULT_RUNTIME_CONFIG;
    }

    return parseRuntimeConfig(await response.json());
  } catch {
    return DEFAULT_RUNTIME_CONFIG;
  }
};

export const watchRuntimeConfig = ({
  onChange,
  fetcher = fetch,
  intervalMs = RUNTIME_CONFIG_REFRESH_INTERVAL_MS,
}: {
  onChange: (config: EventBingoRuntimeConfig) => void;
  fetcher?: typeof fetch;
  intervalMs?: number;
}) => {
  let stopped = false;
  let latestRequestId = 0;

  const refresh = async () => {
    const requestId = ++latestRequestId;
    const config = await fetchRuntimeConfig(fetcher);
    if (!stopped && requestId === latestRequestId) {
      onChange(config);
    }
  };

  void refresh();
  const intervalId = window.setInterval(() => void refresh(), intervalMs);
  const refreshWhenVisible = () => {
    if (document.visibilityState === "visible") {
      void refresh();
    }
  };
  document.addEventListener("visibilitychange", refreshWhenVisible);

  return () => {
    stopped = true;
    latestRequestId += 1;
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  };
};
