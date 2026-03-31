const trimEnvUrl = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/$/, "");
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

export const getApiBaseUrl = () => {
  const envUrl = trimEnvUrl(import.meta.env.VITE_API_URL);
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined" && LOCAL_HOSTS.has(window.location.hostname)) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:8000`;
  }

  if (import.meta.env.DEV) {
    return "http://localhost:8000";
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:8000";
};
