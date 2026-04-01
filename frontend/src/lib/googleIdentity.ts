type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleAccountsIdConfiguration = {
  callback: (response: GoogleCredentialResponse) => void;
  cancel_on_tap_outside?: boolean;
  client_id: string;
  context?: "signin" | "signup" | "use";
  nonce?: string;
  ux_mode?: "popup" | "redirect";
};

export type GoogleButtonText = "signin_with" | "signup_with" | "continue_with";

type GoogleRenderButtonOptions = {
  locale?: string;
  logo_alignment?: "left" | "center";
  shape?: "rectangular" | "pill";
  size?: "large" | "medium" | "small";
  text?: GoogleButtonText;
  theme?: "outline" | "filled_black" | "filled_blue";
  type?: "standard" | "icon";
  width?: number;
};

type GoogleAccountsIdApi = {
  initialize: (configuration: GoogleAccountsIdConfiguration) => void;
  renderButton: (element: HTMLElement, options: GoogleRenderButtonOptions) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsIdApi;
      };
    };
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = "event-bingo-google-identity";
let googleIdentityScriptPromise: Promise<void> | null = null;

const hasWindow = () => typeof window !== "undefined";

const getEnvValue = (value: string | undefined) => value?.trim() ?? "";

export const getGoogleClientId = () => getEnvValue(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export const isGoogleIdentityConfigured = () => getGoogleClientId().length > 0;

export const loadGoogleIdentityScript = (locale = "ko") => {
  if (!hasWindow()) {
    return Promise.reject(new Error("브라우저 환경에서만 Google 로그인을 사용할 수 있습니다."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      GOOGLE_IDENTITY_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Google 로그인 스크립트를 불러오지 못했습니다.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://accounts.google.com/gsi/client?hl=${encodeURIComponent(locale)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google 로그인 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
};

export const getGoogleIdentityApi = () => window.google?.accounts?.id ?? null;

export const createGoogleNoncePair = async () => {
  if (!hasWindow() || !window.crypto?.getRandomValues || !window.crypto?.subtle) {
    throw new Error("이 브라우저는 Google 로그인 보안 기능을 지원하지 않습니다.");
  }

  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);

  const rawNonce = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const encodedNonce = new TextEncoder().encode(rawNonce);
  const digest = await window.crypto.subtle.digest("SHA-256", encodedNonce);
  const hashedNonce = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return {
    rawNonce,
    hashedNonce,
  };
};
