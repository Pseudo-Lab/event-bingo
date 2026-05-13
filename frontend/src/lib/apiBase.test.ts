import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "./apiBase";

const setWindowLocation = (url: string) => {
  const location = new URL(url);

  vi.stubGlobal("window", {
    location: {
      hostname: location.hostname,
      origin: location.origin,
      protocol: location.protocol,
    },
  });
};

describe("getApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the browser origin during dev so custom dev hosts can share the same proxy", () => {
    setWindowLocation("https://dev.example.com/admin");
    vi.stubEnv("VITE_API_URL", "http://localhost:8000");

    expect(getApiBaseUrl()).toBe("https://dev.example.com");
  });

  it("keeps explicit non-local API URLs", () => {
    setWindowLocation("https://dev.example.com/admin");
    vi.stubEnv("VITE_API_URL", "https://api.example.com");

    expect(getApiBaseUrl()).toBe("https://api.example.com");
  });
});
