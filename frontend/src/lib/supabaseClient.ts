import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_STORAGE_KEY = "event-bingo.supabase.auth.v1";
const memoryStorage = new Map<string, string>();

const hasWindow = () => typeof window !== "undefined";

const sessionStorageAdapter = {
  getItem(key: string) {
    if (!hasWindow()) {
      return memoryStorage.get(key) ?? null;
    }

    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    if (!hasWindow()) {
      memoryStorage.set(key, value);
      return;
    }

    try {
      window.sessionStorage.setItem(key, value);
      return;
    } catch {
      memoryStorage.set(key, value);
    }
  },
  removeItem(key: string) {
    if (!hasWindow()) {
      memoryStorage.delete(key);
      return;
    }

    try {
      window.sessionStorage.removeItem(key);
    } finally {
      memoryStorage.delete(key);
    }
  },
};

const getEnvValue = (value: string | undefined) => value?.trim() ?? "";

export const getSupabaseUrl = () => getEnvValue(import.meta.env.VITE_SUPABASE_URL);
export const getSupabaseAnonKey = () => getEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
export const isSupabaseConfigured = () =>
  getSupabaseUrl().length > 0 && getSupabaseAnonKey().length > 0;

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: sessionStorageAdapter,
        storageKey: SUPABASE_STORAGE_KEY,
      },
    });
  }

  return supabaseClient;
};

export const maybeGetSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return getSupabaseClient();
};
