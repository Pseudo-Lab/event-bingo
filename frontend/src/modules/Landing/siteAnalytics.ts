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

type AnalyticsTrafficType = "public" | "internal_qa";
type ReferrerDomainBucket =
  | "direct"
  | "internal"
  | "luma"
  | "google"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "github"
  | "other_external"
  | "unknown";

type CampaignContext = {
  traffic_type: AnalyticsTrafficType;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

type SessionEntryContext = {
  traffic_type: AnalyticsTrafficType;
  session_entry_route: string;
  session_entry_referrer_type: "direct" | "internal" | "external" | "unknown";
  session_entry_referrer_domain_bucket: ReferrerDomainBucket;
  session_entry_utm_source?: string;
  session_entry_utm_medium?: string;
  session_entry_utm_campaign?: string;
};

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
const ANALYTICS_ENTRY_CONTEXT_KEY = "bingo_site_analytics_entry_context";
const ANALYTICS_VALUE_MAX_LENGTH = 80;
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
  storage?.removeItem(ANALYTICS_ENTRY_CONTEXT_KEY);
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
    const referrerHostname = new URL(referrer).hostname.trim().toLowerCase();
    const normalizedHostname = hostname.trim().toLowerCase();
    return referrerHostname === normalizedHostname ? ("internal" as const) : ("external" as const);
  } catch {
    return "unknown" as const;
  }
};

const normalizeAnalyticsToken = (value: string) => {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, ANALYTICS_VALUE_MAX_LENGTH);

  return normalizedValue || undefined;
};

const hasHostnameSuffix = (hostname: string, suffix: string) =>
  hostname === suffix || hostname.endsWith(`.${suffix}`);

export const getReferrerDomainBucket = (
  referrer: string,
  hostname: string
): ReferrerDomainBucket => {
  const referrerType = getReferrerType(referrer, hostname);
  if (referrerType === "direct" || referrerType === "internal" || referrerType === "unknown") {
    return referrerType;
  }

  try {
    const referrerHostname = new URL(referrer).hostname.trim().toLowerCase();
    if (hasHostnameSuffix(referrerHostname, "lu.ma") || referrerHostname.includes("luma")) {
      return "luma";
    }
    if (referrerHostname.includes("google.")) {
      return "google";
    }
    if (
      hasHostnameSuffix(referrerHostname, "linkedin.com") ||
      hasHostnameSuffix(referrerHostname, "lnkd.in")
    ) {
      return "linkedin";
    }
    if (
      hasHostnameSuffix(referrerHostname, "facebook.com") ||
      hasHostnameSuffix(referrerHostname, "fb.com")
    ) {
      return "facebook";
    }
    if (hasHostnameSuffix(referrerHostname, "instagram.com")) {
      return "instagram";
    }
    if (hasHostnameSuffix(referrerHostname, "github.com")) {
      return "github";
    }
  } catch {
    return "unknown";
  }

  return "other_external";
};

const UTM_FIELD_PROPERTY_MAP = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  content: "utm_content",
  term: "utm_term",
} as const;

export const getCampaignContext = (locationSearch: string): CampaignContext => {
  const searchParams = new URLSearchParams(locationSearch);
  const trafficTypeParam = normalizeAnalyticsToken(searchParams.get("traffic_type") ?? "");
  const qaParam = normalizeAnalyticsToken(searchParams.get("qa") ?? "");
  const trafficType: AnalyticsTrafficType =
    trafficTypeParam === "internal_qa" || qaParam === "1" ? "internal_qa" : "public";
  const campaignContext: CampaignContext = { traffic_type: trafficType };

  Object.entries(UTM_FIELD_PROPERTY_MAP).forEach(([queryKey, propertyKey]) => {
    const normalizedValue = normalizeAnalyticsToken(searchParams.get(`utm_${queryKey}`) ?? "");
    if (normalizedValue) {
      campaignContext[propertyKey] = normalizedValue;
    }
  });

  return campaignContext;
};

const isTrafficType = (value: unknown): value is AnalyticsTrafficType =>
  value === "public" || value === "internal_qa";

const getAnalyticsEntryContext = ({
  route,
  referrerType,
  referrerDomainBucket,
  campaignContext,
}: {
  route: string;
  referrerType: SessionEntryContext["session_entry_referrer_type"];
  referrerDomainBucket: ReferrerDomainBucket;
  campaignContext: CampaignContext;
}): SessionEntryContext => {
  const storage = getSessionStorage();
  const storedContext = storage?.getItem(ANALYTICS_ENTRY_CONTEXT_KEY);
  if (storedContext) {
    try {
      const parsedContext = JSON.parse(storedContext) as SessionEntryContext;
      if (isTrafficType(parsedContext.traffic_type)) {
        const nextContext = {
          ...parsedContext,
          traffic_type:
            campaignContext.traffic_type === "internal_qa"
              ? ("internal_qa" as const)
              : parsedContext.traffic_type,
        };
        if (nextContext.traffic_type !== parsedContext.traffic_type) {
          storage?.setItem(ANALYTICS_ENTRY_CONTEXT_KEY, JSON.stringify(nextContext));
        }
        return nextContext;
      }
    } catch {
      storage?.removeItem(ANALYTICS_ENTRY_CONTEXT_KEY);
    }
  }

  const entryContext: SessionEntryContext = {
    traffic_type: campaignContext.traffic_type,
    session_entry_route: route,
    session_entry_referrer_type: referrerType,
    session_entry_referrer_domain_bucket: referrerDomainBucket,
  };

  if (campaignContext.utm_source) {
    entryContext.session_entry_utm_source = campaignContext.utm_source;
  }
  if (campaignContext.utm_medium) {
    entryContext.session_entry_utm_medium = campaignContext.utm_medium;
  }
  if (campaignContext.utm_campaign) {
    entryContext.session_entry_utm_campaign = campaignContext.utm_campaign;
  }

  storage?.setItem(ANALYTICS_ENTRY_CONTEXT_KEY, JSON.stringify(entryContext));
  return entryContext;
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
  locationSearch = "",
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
  locationSearch?: string;
  viewportWidth: number;
}): SiteAnalyticsPayload => {
  const environment = getAnalyticsEnvironment(locationHostname);
  const viewport = getViewportContext(viewportWidth);
  const referrerType = getReferrerType(referrer, environment.hostname);
  const referrerDomainBucket = getReferrerDomainBucket(referrer, environment.hostname);
  const campaignContext = getCampaignContext(locationSearch);
  const sessionEntryContext = getAnalyticsEntryContext({
    route,
    referrerType,
    referrerDomainBucket,
    campaignContext,
  });
  const analyticsProperties: SiteAnalyticsProperties = {
    ...properties,
    ...campaignContext,
    referrer_domain_bucket: referrerDomainBucket,
    ...sessionEntryContext,
  };

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
    referrer_type: referrerType,
    properties: analyticsProperties,
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
        locationSearch: window.location.search,
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
