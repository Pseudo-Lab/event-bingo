export type AuthSession = {
  userId: string;
  userName: string;
  loginId: string;
};

const AUTH_STORAGE_KEYS = {
  userId: "myID",
  userName: "myUserName",
  loginId: "myLoginId",
} as const;

const LEGACY_STORAGE_KEYS = {
  userEmail: "myEmail",
  loginKey: "myLoginKey",
} as const;

const hasWindow = () => typeof window !== "undefined";

const readAuthSessionFromStorage = (storage: Storage | null): AuthSession | null => {
  if (!storage) {
    return null;
  }

  const userId = storage.getItem(AUTH_STORAGE_KEYS.userId);
  if (!userId) {
    return null;
  }

  const loginId =
    storage.getItem(AUTH_STORAGE_KEYS.loginId) ??
    storage.getItem(LEGACY_STORAGE_KEYS.loginKey) ??
    storage.getItem(LEGACY_STORAGE_KEYS.userEmail) ??
    "";

  return {
    userId,
    userName: storage.getItem(AUTH_STORAGE_KEYS.userName) ?? "",
    loginId,
  };
};

const removeAuthSessionFromStorage = (storage: Storage | null) => {
  if (!storage) {
    return;
  }

  Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
    storage.removeItem(key);
  });

  Object.values(LEGACY_STORAGE_KEYS).forEach((key) => {
    storage.removeItem(key);
  });
};

export const setAuthSession = (session: AuthSession) => {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.setItem(AUTH_STORAGE_KEYS.userId, session.userId);
  window.sessionStorage.setItem(AUTH_STORAGE_KEYS.userName, session.userName);
  window.sessionStorage.setItem(AUTH_STORAGE_KEYS.loginId, session.loginId);
  window.sessionStorage.removeItem(LEGACY_STORAGE_KEYS.userEmail);
  window.sessionStorage.removeItem(LEGACY_STORAGE_KEYS.loginKey);
};

export const getAuthSession = (): AuthSession | null => {
  if (!hasWindow()) {
    return null;
  }

  const sessionAuth = readAuthSessionFromStorage(window.sessionStorage);
  if (sessionAuth) {
    return sessionAuth;
  }

  const legacyAuth = readAuthSessionFromStorage(window.localStorage);
  if (!legacyAuth) {
    return null;
  }

  setAuthSession(legacyAuth);
  removeAuthSessionFromStorage(window.localStorage);
  return legacyAuth;
};

export const clearAuthSession = () => {
  if (!hasWindow()) {
    return;
  }

  removeAuthSessionFromStorage(window.sessionStorage);
  removeAuthSessionFromStorage(window.localStorage);
};
