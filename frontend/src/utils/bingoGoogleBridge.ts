import type { User } from "@supabase/supabase-js";

import { loginBingoUser, registerBingoUser } from "../api/bingo_api";
import { getSupabaseClient, maybeGetSupabaseClient } from "../lib/supabaseClient";
import {
  getAuthSession,
  normalizeAuthEmail,
  setAuthSession,
  type AuthSession,
} from "./authSession";
import { clearLegacyLocalLoginStorage } from "./legacyAuthStorage";

const LOGIN_ID_METADATA_KEY = "event_bingo_login_id";
const BRIDGE_KEY_METADATA_KEY = "event_bingo_bridge_key";
const USER_ID_METADATA_KEY = "event_bingo_user_id";
const USER_NAME_METADATA_KEY = "event_bingo_user_name";

type BingoBridgeMetadata = {
  bridgeKey?: string;
  loginId?: string;
  userId?: string;
  userName?: string;
};

type BingoUserResult = {
  ok: boolean;
  login_id?: string | null;
  message: string;
  user_id?: number | null;
  user_email?: string | null;
  user_name?: string | null;
};

export type BingoGoogleProfile = {
  avatarUrl?: string;
  displayName: string;
  email: string;
};

export type BingoGoogleBridgeResult = {
  authSession: AuthSession;
  googleProfile: BingoGoogleProfile;
  isNewUser: boolean;
};

const pickString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const toBingoGoogleProfile = (user: User): BingoGoogleProfile => {
  const email = pickString(user.email);
  if (!email) {
    throw new Error("Google 계정 이메일을 확인하지 못했습니다.");
  }

  const metadata = user.user_metadata ?? {};
  const displayName =
    pickString(metadata.full_name) ||
    pickString(metadata.name) ||
    pickString(user.identities?.[0]?.identity_data?.full_name) ||
    email.split("@")[0];

  const avatarUrl =
    pickString(metadata.avatar_url) || pickString(user.identities?.[0]?.identity_data?.avatar_url);

  return {
    avatarUrl: avatarUrl || undefined,
    displayName,
    email,
  };
};

const readBingoBridgeMetadata = (user: User): BingoBridgeMetadata => {
  const metadata = user.user_metadata ?? {};

  return {
    bridgeKey: pickString(metadata[BRIDGE_KEY_METADATA_KEY]) || undefined,
    loginId: pickString(metadata[LOGIN_ID_METADATA_KEY]).toUpperCase() || undefined,
    userId: pickString(metadata[USER_ID_METADATA_KEY]) || undefined,
    userName: pickString(metadata[USER_NAME_METADATA_KEY]) || undefined,
  };
};

const createBridgeKey = () => {
  if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
    return `bridge-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }

  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const toAuthSession = (
  result: BingoUserResult,
  fallbackName?: string,
  fallbackEmail?: string
): AuthSession => {
  if (!result.ok || result.user_id == null || !result.login_id) {
    throw new Error(result.message || "빙고 계정 정보를 확인하지 못했습니다.");
  }

  const userEmail =
    normalizeAuthEmail(fallbackEmail) || normalizeAuthEmail(pickString(result.user_email));

  return {
    userId: String(result.user_id),
    userName: pickString(result.user_name) || pickString(fallbackName),
    loginId: result.login_id,
    userEmail: userEmail || undefined,
  };
};

const updateBingoBridgeMetadata = async (
  user: User,
  authSession: AuthSession,
  bridgeKey: string
) => {
  const supabase = getSupabaseClient();
  const nextMetadata = {
    ...(user.user_metadata ?? {}),
    [BRIDGE_KEY_METADATA_KEY]: bridgeKey,
    [LOGIN_ID_METADATA_KEY]: authSession.loginId,
    [USER_ID_METADATA_KEY]: authSession.userId,
    [USER_NAME_METADATA_KEY]: authSession.userName,
  };

  const { error } = await supabase.auth.updateUser({
    data: nextMetadata,
  });

  if (error) {
    console.warn("Failed to persist bingo bridge metadata.", error);
  }
};

export const syncBingoBridgeUserName = async (userName: string) => {
  const trimmedName = pickString(userName);
  const supabase = maybeGetSupabaseClient();
  if (!supabase) {
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const currentUserName = pickString(user.user_metadata?.[USER_NAME_METADATA_KEY]);
  if (currentUserName === trimmedName) {
    return;
  }

  const nextMetadata = {
    ...(user.user_metadata ?? {}),
    [USER_NAME_METADATA_KEY]: trimmedName,
  };

  const { error } = await supabase.auth.updateUser({
    data: nextMetadata,
  });

  if (error) {
    console.warn("Failed to sync bingo bridge user name.", error);
  }
};

export const ensureBingoGoogleBridge = async (
  user: User,
  eventSlug?: string
): Promise<BingoGoogleBridgeResult> => {
  const googleProfile = toBingoGoogleProfile(user);
  const bridgeMetadata = readBingoBridgeMetadata(user);

  if (bridgeMetadata.loginId && bridgeMetadata.bridgeKey) {
    const loginResult = (await loginBingoUser(
      bridgeMetadata.loginId,
      bridgeMetadata.bridgeKey,
      eventSlug,
      googleProfile.email
    )) as BingoUserResult;

    if (loginResult.ok) {
      const currentSession = getAuthSession();
      const authSession = toAuthSession(
        loginResult,
        currentSession?.userName || bridgeMetadata.userName,
        googleProfile.email
      );

      clearLegacyLocalLoginStorage();
      setAuthSession(authSession);

      return {
        authSession,
        googleProfile,
        isNewUser: false,
      };
    }
    // 로그인 실패 (DB 초기화 등) → 아래에서 재등록 진행
  }

  const bridgeKey = createBridgeKey();
  const registerResult = (await registerBingoUser(
    undefined,
    bridgeKey,
    eventSlug,
    googleProfile.email
  )) as BingoUserResult;
  const authSession = toAuthSession(
    registerResult,
    "",
    googleProfile.email
  );

  clearLegacyLocalLoginStorage();
  setAuthSession(authSession);
  await updateBingoBridgeMetadata(user, authSession, bridgeKey);

  return {
    authSession,
    googleProfile,
    isNewUser: true,
  };
};
