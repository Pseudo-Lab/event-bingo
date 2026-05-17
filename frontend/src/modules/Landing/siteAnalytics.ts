import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { getApiBaseUrl } from "../../lib/apiBase";

export type SiteAnalyticsEventName =
  | "homepage_viewed"
  | "homepage_section_viewed"
  | "homepage_cta_clicked"
  | "admin_login_clicked"
  | "application_form_viewed"
  | "application_form_started"
  | "application_validation_failed"
  | "application_submit_clicked"
  | "application_submitted"
  | "demo_keyword_selection_viewed"
  | "demo_keyword_selection_ready"
  | "demo_start_clicked"
  | "demo_game_viewed"
  | "demo_exchange_advanced"
  | "demo_goal_completed"
  | "demo_replay_clicked"
  | "demo_invalid_game_entry_redirected"
  | "site_route_changed"
  | "site_session_checkpoint";

export type SiteAnalyticsPropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[];

export type SiteAnalyticsProperties = Record<string, SiteAnalyticsPropertyValue>;

export type SiteAnalyticsPayload = {
  event_id: string;
  schema_version: 1;
  event_name: SiteAnalyticsEventName;
  event_source: "frontend";
  analytics_session_id: string;
  page_view_id: string;
  occurred_at: string;
  app_version?: string;
  route: string;
  hostname: string;
  environment: "production" | "private_dev" | "local" | "unknown";
  deployment_channel: "bingo" | "bingo-private" | "localhost" | "other";
  is_production_domain: boolean;
  viewport_bucket: "mobile" | "tablet" | "desktop-sm" | "desktop-md" | "desktop-lg";
  device_class: "mobile" | "tablet" | "desktop";
  referrer_type: "direct" | "internal" | "external" | "unknown";
  properties: SiteAnalyticsProperties;
  experiments: [];
};

type SiteAnalyticsContextValue = {
  route: string;
  pageViewId: string;
  track: (
    eventName: SiteAnalyticsEventName,
    properties?: SiteAnalyticsProperties,
    options?: { beacon?: boolean }
  ) => void;
};

const ANALYTICS_ENDPOINT = "/api/analytics/events";
const ANALYTICS_SESSION_KEY = "bingo_site_analytics_session_id";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);
const DEFAULT_CONTEXT: SiteAnalyticsContextValue = {
  route: "",
  pageViewId: "",
  track: () => undefined,
};

const SiteAnalyticsContext = createContext<SiteAnalyticsContextValue>(DEFAULT_CONTEXT);

export const createAnalyticsId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `analytics-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getSessionStorage = () => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export const getAnalyticsSessionId = () => {
  const storage = getSessionStorage();
  const existingSessionId = storage?.getItem(ANALYTICS_SESSION_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId = createAnalyticsId();
  storage?.setItem(ANALYTICS_SESSION_KEY, nextSessionId);
  return nextSessionId;
};

export const getAnalyticsEnvironment = (hostname: string) => {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");

  if (normalizedHostname === "bingo.pseudolab-devfactory.com") {
    return {
      hostname: normalizedHostname,
      environment: "production" as const,
      deployment_channel: "bingo" as const,
      is_production_domain: true,
    };
  }

  if (normalizedHostname === "bingo-private.pseudolab-devfactory.com") {
    return {
      hostname: normalizedHostname,
      environment: "private_dev" as const,
      deployment_channel: "bingo-private" as const,
      is_production_domain: false,
    };
  }

  if (LOCAL_HOSTS.has(normalizedHostname)) {
    return {
      hostname: normalizedHostname,
      environment: "local" as const,
      deployment_channel: "localhost" as const,
      is_production_domain: false,
    };
  }

  return {
    hostname: normalizedHostname,
    environment: "unknown" as const,
    deployment_channel: "other" as const,
    is_production_domain: false,
  };
};

export const getViewportContext = (width: number) => {
  if (width < 640) {
    return { viewport_bucket: "mobile" as const, device_class: "mobile" as const };
  }
  if (width < 1024) {
    return { viewport_bucket: "tablet" as const, device_class: "tablet" as const };
  }
  if (width < 1280) {
    return { viewport_bucket: "desktop-sm" as const, device_class: "desktop" as const };
  }
  if (width < 1600) {
    return { viewport_bucket: "desktop-md" as const, device_class: "desktop" as const };
  }
  return { viewport_bucket: "desktop-lg" as const, device_class: "desktop" as const };
};

export const getReferrerType = (referrer: string, hostname: string) => {
  if (!referrer) {
    return "direct" as const;
  }

  try {
    const referrerHostname = new URL(referrer).hostname;
    return referrerHostname === hostname ? ("internal" as const) : ("external" as const);
  } catch {
    return "unknown" as const;
  }
};

export const createSiteAnalyticsPayload = ({
  eventName,
  properties = {},
  route,
  pageViewId,
  analyticsSessionId,
  now = new Date(),
  locationHostname,
  referrer,
  viewportWidth,
}: {
  eventName: SiteAnalyticsEventName;
  properties?: SiteAnalyticsProperties;
  route: string;
  pageViewId: string;
  analyticsSessionId: string;
  now?: Date;
  locationHostname: string;
  referrer: string;
  viewportWidth: number;
}): SiteAnalyticsPayload => {
  const environment = getAnalyticsEnvironment(locationHostname);
  const viewport = getViewportContext(viewportWidth);

  return {
    event_id: createAnalyticsId(),
    schema_version: 1,
    event_name: eventName,
    event_source: "frontend",
    analytics_session_id: analyticsSessionId,
    page_view_id: pageViewId,
    occurred_at: now.toISOString(),
    app_version: import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_GIT_SHA || undefined,
    route,
    hostname: environment.hostname,
    environment: environment.environment,
    deployment_channel: environment.deployment_channel,
    is_production_domain: environment.is_production_domain,
    viewport_bucket: viewport.viewport_bucket,
    device_class: viewport.device_class,
    referrer_type: getReferrerType(referrer, environment.hostname),
    properties,
    experiments: [],
  };
};

const shouldSendToCollector = (hostname: string) => {
  const { environment } = getAnalyticsEnvironment(hostname);
  return environment === "production" || environment === "private_dev";
};

const getAnalyticsEndpointUrl = () => {
  const baseUrl = getApiBaseUrl();
  return new URL(ANALYTICS_ENDPOINT, baseUrl).toString();
};

const sendAnalyticsPayload = (payload: SiteAnalyticsPayload, beacon = false) => {
  if (import.meta.env.DEV) {
    // Visible in private/local development without sending personal form values.
    console.debug("[site-analytics]", payload.event_name, payload.properties);
  }

  if (typeof window === "undefined" || !shouldSendToCollector(window.location.hostname)) {
    return;
  }

  const body = JSON.stringify(payload);
  if (beacon && "sendBeacon" in navigator) {
    const sent = navigator.sendBeacon(
      getAnalyticsEndpointUrl(),
      new Blob([body], { type: "application/json" })
    );
    if (sent) {
      return;
    }
  }

  void fetch(getAnalyticsEndpointUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: beacon,
  }).catch(() => {
    // Analytics transport must never block product behavior.
  });
};

const getMaxScrollPercent = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return 0;
  }

  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  const scrollableHeight = Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight
  );
  return Math.min(100, Math.round((scrollTop / scrollableHeight) * 100));
};

export const SiteAnalyticsScope = ({
  route,
  pageEventName,
  pageProperties = {},
  children,
}: {
  route: string;
  pageEventName: SiteAnalyticsEventName;
  pageProperties?: SiteAnalyticsProperties;
  children: ReactNode;
}) => {
  const pageViewRef = useRef({ route, pageViewId: createAnalyticsId() });
  if (pageViewRef.current.route !== route) {
    pageViewRef.current = { route, pageViewId: createAnalyticsId() };
  }
  const pageViewId = pageViewRef.current.pageViewId;
  const analyticsSessionId = useMemo(() => getAnalyticsSessionId(), []);
  const startedAtRef = useRef(Date.now());
  const maxScrollPercentRef = useRef(0);
  const lastEventNameRef = useRef<SiteAnalyticsEventName>(pageEventName);

  const track = (
    eventName: SiteAnalyticsEventName,
    properties: SiteAnalyticsProperties = {},
    options: { beacon?: boolean } = {}
  ) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    lastEventNameRef.current = eventName;
    sendAnalyticsPayload(
      createSiteAnalyticsPayload({
        eventName,
        properties,
        route,
        pageViewId,
        analyticsSessionId,
        locationHostname: window.location.hostname,
        referrer: document.referrer,
        viewportWidth: window.innerWidth,
      }),
      options.beacon
    );
  };

  useEffect(() => {
    startedAtRef.current = Date.now();
    maxScrollPercentRef.current = getMaxScrollPercent();
    track(pageEventName, pageProperties);

    const updateScrollDepth = () => {
      maxScrollPercentRef.current = Math.max(maxScrollPercentRef.current, getMaxScrollPercent());
    };
    const sendCheckpoint = () => {
      track(
        "site_session_checkpoint",
        {
          route,
          active_duration_ms: Date.now() - startedAtRef.current,
          max_scroll_percent: maxScrollPercentRef.current,
          last_event_name: lastEventNameRef.current,
          engaged: Date.now() - startedAtRef.current >= 10_000 || maxScrollPercentRef.current >= 25,
        },
        { beacon: true }
      );
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendCheckpoint();
      }
    };

    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    window.addEventListener("pagehide", sendCheckpoint);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("scroll", updateScrollDepth);
      window.removeEventListener("pagehide", sendCheckpoint);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      track(
        "site_route_changed",
        {
          from_route: route,
          to_route: window.location.pathname,
          duration_ms_on_from_route: Date.now() - startedAtRef.current,
          max_scroll_percent_on_from_route: maxScrollPercentRef.current,
          last_event_name: lastEventNameRef.current,
          engaged: Date.now() - startedAtRef.current >= 10_000 || maxScrollPercentRef.current >= 25,
        },
        { beacon: true }
      );
    };
    // pageProperties is intentionally captured on route entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, pageEventName, pageViewId, analyticsSessionId]);

  return createElement(
    SiteAnalyticsContext.Provider,
    { value: { route, pageViewId, track } },
    children
  );
};

export const useSiteAnalytics = () => useContext(SiteAnalyticsContext);

export const useSiteSectionExposure = <T extends HTMLElement>(
  sectionId: string,
  sectionIndex: number
): RefObject<T> => {
  const elementRef = useRef<T | null>(null);
  const { track } = useSiteAnalytics();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasTrackedRef.current || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35 && !hasTrackedRef.current) {
          hasTrackedRef.current = true;
          track("homepage_section_viewed", {
            section_id: sectionId,
            section_index: sectionIndex,
            viewport_percent_visible: Math.round(entry.intersectionRatio * 100),
          });
          observer.disconnect();
        }
      },
      { threshold: [0.35, 0.6] }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [sectionId, sectionIndex, track]);

  return elementRef as RefObject<T>;
};
