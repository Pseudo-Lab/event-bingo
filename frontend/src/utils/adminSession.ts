import type { AdminSession } from "../modules/Admin/adminTypes";

const STORAGE_KEY = "event-bingo.admin-session.v1";

const hasWindow = () => typeof window !== "undefined";

export const getAdminSession = (): AdminSession | null => {
  if (!hasWindow()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<AdminSession>;
    if (
      typeof parsedValue.id !== "number" ||
      typeof parsedValue.email !== "string" ||
      typeof parsedValue.name !== "string" ||
      typeof parsedValue.role !== "string" ||
      typeof parsedValue.accessToken !== "string"
    ) {
      return null;
    }

    return {
      id: parsedValue.id,
      email: parsedValue.email,
      name: parsedValue.name,
      role: parsedValue.role,
      accessToken: parsedValue.accessToken,
    };
  } catch (error) {
    console.warn("Failed to parse admin session.", error);
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const setAdminSession = (session: AdminSession) => {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const clearAdminSession = () => {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
};

export const hasAdminSession = () => getAdminSession() !== null;
