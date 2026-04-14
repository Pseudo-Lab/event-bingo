export type AuthSession = {
  userId: string;
  userName: string;
  loginId: string;
  userEmail?: string;
};

const AUTH_STORAGE_KEYS = {
  userId: "myID",
  userName: "myUserName",
  loginId: "myLoginId",
  userEmail: "myUserEmail",
} as const;

const LEGACY_STORAGE_KEYS = {
  userEmail: "myEmail",
  loginKey: "myLoginKey",
} as const;

const hasWindow = () => typeof window !== "undefined";

export const normalizeAuthEmail = (value?: string | null) => {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.includes("@") ? trimmedValue : "";
};

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
  const userEmail =
    normalizeAuthEmail(storage.getItem(AUTH_STORAGE_KEYS.userEmail)) ||
    normalizeAuthEmail(storage.getItem(LEGACY_STORAGE_KEYS.userEmail)) ||
    normalizeAuthEmail(loginId);

  const nextSession: AuthSession = {
    userId,
    userName: storage.getItem(AUTH_STORAGE_KEYS.userName) ?? "",
    loginId,
  };

  if (userEmail) {
    nextSession.userEmail = userEmail;
  }

  return nextSession;
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

  const userEmail = normalizeAuthEmail(session.userEmail) || normalizeAuthEmail(session.loginId);

  window.sessionStorage.setItem(AUTH_STORAGE_KEYS.userId, session.userId);
  window.sessionStorage.setItem(AUTH_STORAGE_KEYS.userName, session.userName);
  window.sessionStorage.setItem(AUTH_STORAGE_KEYS.loginId, session.loginId);
  if (userEmail) {
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.userEmail, userEmail);
  } else {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.userEmail);
  }
  window.sessionStorage.removeItem(LEGACY_STORAGE_KEYS.userEmail);
  window.sessionStorage.removeItem(LEGACY_STORAGE_KEYS.loginKey);
};

export const getAuthSession = (): AuthSession | null => {
  if (!hasWindow()) {
    return null;
  }

  return readAuthSessionFromStorage(window.sessionStorage);
};

export const clearAuthSession = () => {
  if (!hasWindow()) {
    return;
  }

  removeAuthSessionFromStorage(window.sessionStorage);
  removeAuthSessionFromStorage(window.localStorage);
};
