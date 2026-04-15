import { useEffect, useMemo, useState } from "react";

import { getPublicEventProfile, isNotFoundApiError } from "../api/public_event_api";
import {
  resolveEventProfile,
  resolvePublicEventFallbackProfile,
  type EventProfile,
} from "../config/eventProfiles";

export type EventProfileLoadState = "loading" | "ready" | "not_found" | "error";

export const useEventProfile = (eventSlug?: string | null) => {
  const fallbackProfile = useMemo(() => {
    if (eventSlug) {
      return resolvePublicEventFallbackProfile(eventSlug);
    }

    return resolveEventProfile(eventSlug);
  }, [eventSlug]);
  const [eventProfile, setEventProfile] = useState<EventProfile>(fallbackProfile);
  const [loadState, setLoadState] = useState<EventProfileLoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setEventProfile(fallbackProfile);
    setLoadState("loading");
    setErrorMessage(null);
  }, [fallbackProfile]);

  useEffect(() => {
    let cancelled = false;

    const loadEventProfile = async () => {
      try {
        const publicEventProfile = await getPublicEventProfile(eventSlug);
        if (!cancelled) {
          setEventProfile(publicEventProfile);
          setLoadState("ready");
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setEventProfile(fallbackProfile);
          if (isNotFoundApiError(error)) {
            setLoadState("not_found");
            setErrorMessage(
              error instanceof Error ? error.message : "행사 정보를 찾을 수 없습니다."
            );
            return;
          }

          setLoadState("ready");
          setErrorMessage(
            error instanceof Error ? error.message : "행사 정보를 불러오지 못했습니다."
          );
        }
      }
    };

    void loadEventProfile();

    return () => {
      cancelled = true;
    };
  }, [eventSlug, fallbackProfile]);

  return {
    eventProfile,
    loadState,
    errorMessage,
    isResolved: loadState !== "loading",
    isAvailable: loadState === "ready",
    isNotFound: loadState === "not_found",
  };
};
