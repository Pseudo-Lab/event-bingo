const TEST_MODE_STORAGE_KEY = "bingo.testMode";
const TEST_MODE_QUERY_KEY = "testMode";
const ENABLED_QUERY_VALUES = new Set(["1", "true", "yes", "on"]);
const DISABLED_QUERY_VALUES = new Set(["0", "false", "no", "off"]);

const hasWindow = () => typeof window !== "undefined";

const isEnvTestModeEnabled = () => {
  const rawValue = import.meta.env.VITE_TEST_MODE?.toString().trim().toLowerCase();
  return rawValue != null && ENABLED_QUERY_VALUES.has(rawValue);
};

const parseBooleanQueryValue = (value: string | null) => {
  if (value == null) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (ENABLED_QUERY_VALUES.has(normalizedValue)) {
    return true;
  }

  if (DISABLED_QUERY_VALUES.has(normalizedValue)) {
    return false;
  }

  return null;
};

export const setTestModeEnabled = (enabled: boolean) => {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.setItem(TEST_MODE_STORAGE_KEY, enabled ? "true" : "false");
};

export const syncTestModeFromUrl = (search?: string) => {
  if (isEnvTestModeEnabled()) {
    return true;
  }

  if (!hasWindow()) {
    return false;
  }

  const queryValue = parseBooleanQueryValue(
    new URLSearchParams(search ?? window.location.search).get(TEST_MODE_QUERY_KEY)
  );

  if (queryValue != null) {
    setTestModeEnabled(queryValue);
    return queryValue;
  }

  return window.sessionStorage.getItem(TEST_MODE_STORAGE_KEY) === "true";
};

export const isTestModeEnabled = () => {
  return syncTestModeFromUrl();
};
