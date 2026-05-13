const trimEnvUrl = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/$/, "");
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

const getHostname = (value: string) => {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
};

export const getApiBaseUrl = () => {
  const envUrl = trimEnvUrl(import.meta.env.VITE_API_URL);

  if (typeof window !== "undefined") {
    if (
      import.meta.env.DEV &&
      envUrl &&
      !LOCAL_HOSTS.has(window.location.hostname) &&
      LOCAL_HOSTS.has(getHostname(envUrl))
    ) {
      return window.location.origin;
    }

    if (envUrl) {
      return envUrl;
    }

    if (import.meta.env.DEV) {
      return window.location.origin;
    }

    if (LOCAL_HOSTS.has(window.location.hostname)) {
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      return `${protocol}//${window.location.hostname}:8000`;
    }

    return window.location.origin;
  }

  if (envUrl) {
    return envUrl;
  }

  return "http://localhost:8000";
};
