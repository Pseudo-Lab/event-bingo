import { useEffect, useMemo, useState } from "react";

import { getPublicEventProfile } from "../api/public_event_api";
import {
  resolveEventProfile,
  resolvePublicEventFallbackProfile,
  type EventProfile,
} from "../config/eventProfiles";

export const useEventProfile = (eventSlug?: string | null) => {
  const fallbackProfile = useMemo(() => {
    if (eventSlug) {
      return resolvePublicEventFallbackProfile(eventSlug);
    }

    return resolveEventProfile(eventSlug);
  }, [eventSlug]);
  const [eventProfile, setEventProfile] = useState<EventProfile>(fallbackProfile);

  useEffect(() => {
    setEventProfile(fallbackProfile);
  }, [fallbackProfile]);

  useEffect(() => {
    let cancelled = false;

    const loadEventProfile = async () => {
      try {
        const publicEventProfile = await getPublicEventProfile(eventSlug);
        if (!cancelled) {
          setEventProfile(publicEventProfile);
        }
      } catch {
        if (!cancelled) {
          setEventProfile(fallbackProfile);
        }
      }
    };

    void loadEventProfile();

    return () => {
      cancelled = true;
    };
  }, [eventSlug, fallbackProfile]);

  return eventProfile;
};
