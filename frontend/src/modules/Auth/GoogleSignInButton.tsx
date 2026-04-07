import { useEffect, useRef, useState } from "react";

import { cn } from "../../lib/utils";
import {
  createGoogleNoncePair,
  getGoogleClientId,
  getGoogleIdentityApi,
  loadGoogleIdentityScript,
  type GoogleButtonText,
} from "../../lib/googleIdentity";

type GoogleSignInButtonProps = {
  className?: string;
  context?: "signin" | "signup" | "use";
  disabled?: boolean;
  onError?: (message: string) => void;
  onSuccess: (payload: { credential: string; nonce: string }) => Promise<void> | void;
  text?: GoogleButtonText;
};

const GoogleSignInButton = ({
  className,
  context = "signin",
  disabled = false,
  onError,
  onSuccess,
  text = "signin_with",
}: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const containerElement = containerRef.current;

    if (!containerElement) {
      return;
    }

    let cancelled = false;

    const renderButton = async () => {
      try {
        await loadGoogleIdentityScript("ko");

        if (cancelled) {
          return;
        }

        const googleIdentityApi = getGoogleIdentityApi();
        if (!googleIdentityApi) {
          throw new Error("Google 로그인 버튼을 준비하지 못했습니다.");
        }

        const { rawNonce, hashedNonce } = await createGoogleNoncePair();
        const containerWidth = Math.max(containerElement.offsetWidth || 0, 280);

        googleIdentityApi.initialize({
          callback: async ({ credential }) => {
            if (disabled) {
              return;
            }

            if (!credential) {
              onError?.("Google 인증 정보를 받지 못했습니다.");
              return;
            }

            try {
              setIsSubmitting(true);
              await onSuccess({
                credential,
                nonce: rawNonce,
              });
            } catch (error) {
              onError?.(
                error instanceof Error ? error.message : "Google 로그인 처리 중 오류가 발생했습니다."
              );
            } finally {
              if (!cancelled) {
                setIsSubmitting(false);
              }
            }
          },
          cancel_on_tap_outside: true,
          client_id: getGoogleClientId(),
          context,
          nonce: hashedNonce,
          ux_mode: "popup",
        });

        containerElement.innerHTML = "";
        googleIdentityApi.renderButton(containerElement, {
          locale: "ko",
          logo_alignment: "left",
          shape: "pill",
          size: "large",
          text,
          theme: "outline",
          type: "standard",
          width: containerWidth,
        });
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : "Google 로그인 버튼을 불러오지 못했습니다."
        );
      }
    };

    void renderButton();

    return () => {
      cancelled = true;
      containerElement.innerHTML = "";
    };
  }, [context, disabled, onError, onSuccess, text]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className={cn("relative", disabled && "opacity-60")}>
        <div
          ref={containerRef}
          className={cn(
            "min-h-[44px]",
            (disabled || isSubmitting) && "pointer-events-none opacity-70"
          )}
          aria-disabled={disabled}
        />
        {disabled ? (
          <div
            className="absolute inset-0 z-10 cursor-not-allowed rounded-[999px]"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {isSubmitting ? (
        <p className="text-center text-sm font-medium text-slate-500">
          Google 계정을 확인하는 중입니다.
        </p>
      ) : null}
    </div>
  );
};

export default GoogleSignInButton;
