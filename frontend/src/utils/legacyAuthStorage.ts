const LEGACY_LOCAL_STORAGE_KEYS = [
  "myID",
  "myUserName",
  "myLoginId",
  "myEmail",
  "myLoginKey",
  "bingo.recentAccounts.v1",
  "event-bingo.admin-session.v1",
] as const;

const hasWindow = () => typeof window !== "undefined";

export const clearLegacyLocalLoginStorage = () => {
  if (!hasWindow()) {
    return;
  }

  LEGACY_LOCAL_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
  });
};
